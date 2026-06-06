import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('whop-signature') || req.headers.get('x-whop-signature');
    
    // Validate signature if webhook secret is configured in environment
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = hmac.update(rawBody).digest('hex');
      if (digest !== signature) {
        console.warn('[Whop Webhook] Signature verification failed');
        return NextResponse.json({ error: 'Signature mismatch' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.action || payload.type;
    const data = payload.data;

    // Handle purchase events
    if (eventType === 'payment.succeeded' || eventType === 'membership.activated' || eventType === 'membership.created') {
      const email = data.email || data.user?.email;
      const amount = data.amount || data.price || 20;
      
      // Scan custom fields/metadata for TradingView username
      let tradingviewUsername = 'AWAITING_USER_INPUT';
      const customFields = data.custom_fields || data.metadata || {};
      for (const key of Object.keys(customFields)) {
        if (key.toLowerCase().includes('tradingview') || key.toLowerCase().includes('username')) {
          tradingviewUsername = customFields[key] || 'AWAITING_USER_INPUT';
          break;
        }
      }

      if (email) {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Resolve user profile in database
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();

        if (profileError || !profile) {
          console.warn(`[Whop Webhook] No profile registered in dashboard for email: ${email}`);
          // We return 200 so Whop doesn't keep retrying, but log the warning
          return NextResponse.json({ 
            message: 'Webhook received, but no matching dashboard user found. User must register.' 
          }, { status: 200 });
        }

        // 2. Determine duration months based on payment amount
        let durationMonths = 1;
        if (amount >= 200) durationMonths = 12;
        else if (amount >= 100) durationMonths = 6;

        // 3. Upsert approved whitelist invite (if username is available)
        const status = tradingviewUsername === 'AWAITING_USER_INPUT' ? 'pending' : 'approved';

        const { error: upsertError } = await supabaseAdmin
          .from('tradingview_invites')
          .upsert({
            user_id: profile.id,
            tradingview_username: tradingviewUsername,
            indicator_id: 'crt_algo_ultimate',
            indicator_name: 'CRT-Algo (+Ultimate)',
            status: status,
            payment_method: 'WHOP',
            payment_amount: amount,
            duration_months: durationMonths,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,indicator_id'
          });

        if (upsertError) {
          console.error(`[Whop Webhook] DB Upsert error for ${email}:`, upsertError.message);
          return NextResponse.json({ error: upsertError.message }, { status: 500 });
        }

        console.log(`[Whop Webhook] Automatically provisioned TV Indicator request for ${email}. TV Username: ${tradingviewUsername}, Status: ${status}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Whop Webhook] Critical Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
