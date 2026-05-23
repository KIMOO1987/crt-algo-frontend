export async function createCryptoPayment(userId: string, amount: number, planName: string) {
  const res = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: amount,
      price_currency: 'usd',
      order_id: userId,
      order_description: planName,
      ipn_callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/nowpayments`,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?status=cancelled`,
    }),
  });

  return await res.json();
}

export async function startTrial(userId: string) {
  const res = await fetch('/api/start-trial', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  return await res.json();
}