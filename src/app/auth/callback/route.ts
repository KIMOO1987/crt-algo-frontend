import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (process.env.NEXT_EXPORT === 'true') {
    return NextResponse.json({ message: 'Disabled during export' });
  }
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    let cookieStore;
    try {
        cookieStore = await cookies();
    } catch (e) {
        return NextResponse.json({ error: 'Static export' });
    }
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // FIXED: Only check the URL param — not recovery_sent_at which is
      // always set for any user who has ever requested a reset.
      const isRecoveryFlow = requestUrl.searchParams.get('type') === 'recovery'

      if (isRecoveryFlow) {
        return NextResponse.redirect(`${origin}/update-password`)
      }

      const next = requestUrl.searchParams.get('next') ?? '/dashboard'
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
