import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const botToken = url.searchParams.get('botId');

    if (!botToken) {
      return NextResponse.json({ error: 'Missing botId parameter' }, { status: 400 });
    }

    // Initialize Supabase Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const cleanToken = botToken.trim();

    // 1. Verify Bot ID and get User ID
    const { data: userProfile, error: userError } = await supabase
      .from('bot_signals')
      .select('user_id')
      .eq('bot_token', cleanToken)
      .maybeSingle();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'TOKEN_NOT_FOUND' }, { status: 401 });
    }

    // 2. Insert Log securely into cbot_logs
    const body = await req.json();
    if (body.message) {
      await supabase.from('cbot_logs').insert({ 
        user_id: userProfile.user_id, 
        bot_token: cleanToken,
        message: body.message,
        log_type: body.log_type || 'INFO',
        symbol: body.symbol || null
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
