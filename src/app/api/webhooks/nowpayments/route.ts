import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const receivedSig = req.headers.get('x-nowpayments-sig');
    if (!receivedSig) {
      console.warn('[NOWPayments IPN] Missing x-nowpayments-sig signature header');
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
    }

    const rawBody = await req.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('[NOWPayments IPN] Failed to parse request body as JSON');
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // 1. Signature Verification
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!ipnSecret) {
      console.error('[NOWPayments IPN] NOWPAYMENTS_IPN_SECRET is not configured');
      return NextResponse.json({ error: 'Gateway configuration missing' }, { status: 500 });
    }

    // Sort body keys alphabetically and stringify
    const sortedString = JSON.stringify(body, Object.keys(body).sort());

    const hmac = crypto.createHmac('sha512', ipnSecret);
    hmac.update(sortedString);
    const calculatedSig = hmac.digest('hex');

    if (calculatedSig !== receivedSig) {
      console.warn('[NOWPayments IPN] Signature mismatch', {
        received: receivedSig,
        calculated: calculatedSig
      });
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 401 });
    }

    const { payment_status, order_id } = body;
    console.log(`[NOWPayments IPN] Verified signature. Status: ${payment_status}, Order ID: ${order_id}`);

    // We only process if status is finished or partially_paid
    if (payment_status !== 'finished' && payment_status !== 'partially_paid') {
      console.log(`[NOWPayments IPN] Status "${payment_status}" ignored. No upgrade action required.`);
      return NextResponse.json({ message: `Status ${payment_status} ignored` }, { status: 200 });
    }

    if (!order_id) {
      console.error('[NOWPayments IPN] Missing order_id metadata');
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Parse order_id: userId:planId:timestamp
    const parts = order_id.split(':');
    if (parts.length < 2) {
      console.error('[NOWPayments IPN] Invalid order_id format:', order_id);
      return NextResponse.json({ error: 'Invalid order_id format' }, { status: 400 });
    }

    const userId = parts[0];
    const planId = parts[1];

    // 2. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Fetch Plan Details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error(`[NOWPayments IPN] Plan not found for ID: ${planId}`, planError);
      return NextResponse.json({ error: 'Selected plan not found' }, { status: 404 });
    }

    // 4. Fetch User Profile to extend expiration date if renewing same tier
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('expiry_date, tier')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error(`[NOWPayments IPN] Profile not found for ID: ${userId}`, profileError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // 5. Determine tier & planType
    let tier = 1;
    let planType = 'alpha';

    const planIdLower = plan.id.toLowerCase();
    const planNameLower = plan.name.toLowerCase();

    if (planIdLower.includes('ultimate') || planNameLower.includes('ultimate') || planIdLower.includes('trial') || planNameLower.includes('trial')) {
      tier = 3;
      planType = 'ultimate';
    } else if (planIdLower.includes('pro') || planNameLower.includes('pro')) {
      tier = 2;
      planType = 'pro';
    } else if (planIdLower.includes('starter') || planNameLower.includes('starter') || planIdLower.includes('alpha') || planNameLower.includes('alpha')) {
      tier = 1;
      planType = 'alpha';
    } else {
      // Fallback matching by price
      if (plan.price >= 200) {
        tier = 3;
        planType = 'ultimate';
      } else if (plan.price >= 100) {
        tier = 2;
        planType = 'pro';
      } else {
        tier = 1;
        planType = 'alpha';
      }
    }

    // 6. Calculate subscription duration
    const durationDays = plan.duration || 30;
    let expiryDate = new Date();

    // If profile is active and of the same tier, extend the expiry date
    if (profile.expiry_date && profile.tier === tier) {
      const currentExpiry = new Date(profile.expiry_date);
      if (currentExpiry > expiryDate) {
        expiryDate = currentExpiry;
      }
    }
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    // 7. Update User Profile in database
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: plan.name.toLowerCase(),
        subscription_type: plan.name.toLowerCase(),
        plan_type: planType,
        is_pro: true,
        tier: tier,
        expiry_date: expiryDate.toISOString(),
        last_payment_date: new Date().toISOString(),
        last_payment_method: 'CRYPTO'
      })
      .eq('id', userId);

    if (updateError) {
      console.error(`[NOWPayments IPN] Failed to update user profile for ${userId}:`, updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[NOWPayments IPN] User ${userId} successfully upgraded to ${plan.name} (Tier ${tier}) until ${expiryDate.toISOString()}`);
    return NextResponse.json({ status: 'success', message: 'User upgraded successfully' });
  } catch (error: any) {
    console.error('[NOWPayments IPN] Critical Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
