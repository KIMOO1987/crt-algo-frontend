import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ status: 'error', message: 'User ID is required' }, { status: 400 });
    }

    // 1. Check if user already used a trial to prevent abuse
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('trial_used, subscription_status')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ status: 'error', message: 'User profile not found' }, { status: 404 });
    }

    if (profile.trial_used) {
      return NextResponse.json({ status: 'error', message: 'Trial already used' }, { status: 400 });
    }

    // 2. Fetch the dynamic trial configuration from plans table
    const { data: trialPlan } = await supabaseAdmin
      .from('plans')
      .select('*')
      .or('id.eq.trial,price.eq.0')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Default to 15 days if plan not found, but use dynamic duration if it exists
    const durationDays = trialPlan?.duration || 15;
    const planName = trialPlan?.name || 'trial';
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    // 3. Activate the trial
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: planName.toLowerCase(),
        subscription_type: planName.toLowerCase(),
        plan_type: 'ultimate', // Trials give ultimate access
        tier: 3,
        expiry_date: expiryDate.toISOString(),
        trial_used: true,
        last_payment_date: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ status: 'error', message: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'success', message: 'Trial activated successfully', duration: durationDays });
  } catch (error: any) {
    console.error('Trial Activation Error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}
