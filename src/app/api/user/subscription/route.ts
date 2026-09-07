import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NEXT_EXPORT === 'true') {
    return NextResponse.json({ message: 'Disabled' });
  }
  try {
    // 1. Await the cookie store (Requirement for Next.js 15)
    let cookieStore;
    try {
        cookieStore = await cookies();
    } catch (e) {
        // Static export fallback
        return NextResponse.json({ error: 'Static export' });
    }

    // 2. Initialize the Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // 3. Get the user (Always use getUser for security on the server)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 4. Fetch subscription data from your database
    const { data: subscription, error: dbError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (dbError) throw dbError

    return NextResponse.json(subscription)

  } catch (error: any) {
    console.error('Subscription API Error:', error.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}