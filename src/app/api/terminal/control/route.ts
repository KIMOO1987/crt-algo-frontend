import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (process.env.NEXT_EXPORT === 'true') {
    return NextResponse.json({ message: 'Disabled' });
  }
  try {
    const cookieStore = await cookies();

    // 1. Initialize Supabase Client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch { /* Server Component Safety */ }
          },
        },
      }
    );

    // 2. Parse Incoming Request from Dashboard
    const { action, symbol, volume } = await req.json();

    // 3. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 4. Build the Update Payload
    // This object maps exactly to your Supabase Columns
    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'start':
        updateData.is_active = true;
        updateData.status = 'ACTIVE';
        updateData.current_signal = { action: 'START', time: Date.now() };
        break;

      case 'stop':
        updateData.is_active = false;
        updateData.status = 'PAUSED';
        updateData.current_signal = { action: 'STOP', time: Date.now() };
        break;

      case 'buy':
      case 'sell':
        updateData.is_active = true; // Ensure engine is "on" for manual trades
        updateData.status = 'MANUAL_ENTRY';
        updateData.current_signal = {
          action: action.toLowerCase(),
          symbol: symbol || 'XAUUSD',
          volume: volume || 0.01,
          time: Math.floor(Date.now() / 1000)
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // 5. Update the Database
    // We target the specific user's row in bot_signals
    const { error: dbError } = await supabase
      .from('bot_signals')
      .update(updateData)
      .eq('user_id', user.id);

    if (dbError) {
      // If this fails, the column likely doesn't exist yet
      console.error("Database Update Failed:", dbError.message);
      throw new Error(dbError.message);
    }

    return NextResponse.json({
      success: true,
      message: `KIMOO Engine: ${action.toUpperCase()} command deployed.`
    });

  } catch (err: any) {
    console.error("Terminal Control Error:", err.message);
    return NextResponse.json(
      { error: `Integration Error: ${err.message}` },
      { status: 500 }
    );
  }
}