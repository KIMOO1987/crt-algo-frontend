import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const exchange = searchParams.get('exchange');

    if (!userId || !exchange) {
      return NextResponse.json({ status: 'error', message: 'userId and exchange are required' }, { status: 400 });
    }

    // Connect to the FastAPI backend URL (defaults to http://localhost:8080 in dev)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const targetUrl = `${backendUrl}/api/balance?user_id=${encodeURIComponent(userId)}&exchange=${encodeURIComponent(exchange)}`;

    console.log(`[API PROXY] Fetching live balance from backend: ${targetUrl}`);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      next: { revalidate: 0 } // Disable caching
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ status: 'error', message: `Backend error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Balance Proxy Route Error:', error);
    return NextResponse.json({ status: 'error', message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
