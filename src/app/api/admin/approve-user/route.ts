import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { userId, requestedPlan } = await req.json();

    const planToAssign = requestedPlan?.toLowerCase() || 'pro';
    const tierMap: Record<string, number> = { 'alpha': 1, 'pro': 2, 'ultimate': 3, 'trial': 3 };
    const tierLevel = tierMap[planToAssign] || 2;

    // Fetch the duration from the plans table
    const { data: planData } = await supabaseAdmin
      .from('plans')
      .select('duration')
      .eq('id', planToAssign)
      .single();

    const durationDays = planData?.duration || 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: planToAssign,
        tier: tierLevel,
        expiry_date: expiryDate.toISOString(),
        pending_crypto_hash: null,
        pending_plan_id: null,
        last_payment_date: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
