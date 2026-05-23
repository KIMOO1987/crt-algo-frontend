import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with Service Role Key to bypass RLS safely on the server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Ensure this is in your .env
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Insert the new row for the user
    const { data, error } = await supabaseAdmin
      .from('binance_auth')
      .insert([
        { 
          user_id: userId, 
          daily_risk_wallet: 1000, 
          risk_percentage: 1.0,
          is_active: true,
          status: 'IDLE'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
