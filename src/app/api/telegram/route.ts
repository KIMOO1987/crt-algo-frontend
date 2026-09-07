import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId } = body;
    
    if (!action || !userId) {
      return NextResponse.json({ status: 'error', message: 'action and userId are required' }, { status: 400 });
    }
    
    const validActions = ['token', 'unlink', 'send-test'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });
    }
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const targetUrl = `${backendUrl}/api/telegram/${action}`;
    
    console.log(`[API PROXY] Proxying Telegram action [${action}] to backend: ${targetUrl}`);
    
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ status: 'error', message: `Backend error: ${errText}` }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Telegram Proxy Route Error:', error);
    return NextResponse.json({ status: 'error', message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
