import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (process.env.NEXT_EXPORT === 'true') {
    return NextResponse.json({ error: 'Endpoint disabled' }, { status: 403 });
  }

  try {
    // 1. Initialize Supabase Server Client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // 2. Validate authenticated session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Extract and validate request body
    const body = await req.json().catch(() => ({}));
    const { planId } = body;
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // 4. Fetch the selected plan from Supabase
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error(`Plan not found: ${planId}`, planError);
      return NextResponse.json({ error: 'Selected plan not found' }, { status: 404 });
    }

    if (Number(plan.price) <= 0) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    // 5. Check configuration
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      console.error('NOWPAYMENTS_API_KEY environment variable is not defined.');
      return NextResponse.json({ error: 'Gateway configuration missing' }, { status: 500 });
    }

    // 6. Generate order_id metadata
    const orderId = `${user.id}:${plan.id}:${Date.now()}`;

    // 7. Request a checkout invoice from NOWPayments
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://crtalgo.online';
    const nowpaymentsPayload = {
      price_amount: Number(plan.price),
      price_currency: 'usd',
      order_id: orderId,
      order_description: `Subscription Upgrade: ${plan.name}`,
      ipn_callback_url: `${appUrl}/api/webhooks/nowpayments`,
      success_url: `${appUrl}/dashboard/payments?status=success`,
      cancel_url: `${appUrl}/dashboard/payments?status=cancelled`,
    };

    console.log(`Requesting NOWPayments invoice for user ${user.id}, plan ${plan.id}...`);

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nowpaymentsPayload),
    });

    const responseData = await response.json();
    if (!response.ok || !responseData.invoice_url) {
      console.error('NOWPayments API Invoice Failure:', responseData);
      return NextResponse.json(
        { error: responseData.message || 'Failed to create payment invoice session' },
        { status: response.status }
      );
    }

    return NextResponse.json({ invoice_url: responseData.invoice_url });
  } catch (error: any) {
    console.error('Create Invoice Endpoint Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
