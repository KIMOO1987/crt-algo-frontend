'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const cookieStore = await cookies()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=Invalid credentials')
  }

  redirect('/dashboard')
}

export async function requestPasswordReset(formData: FormData) {
  const cookieStore = await cookies()
  const email = formData.get('email') as string
  const origin = (await headers()).get('origin')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Handled by middleware */ }
        },
      },
    }
  )

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery`,
  })

  if (error) {
    redirect('/forgot-password?error=' + encodeURIComponent(error.message))
  }

  redirect('/forgot-password?success=Instructions sent to email')
}

/**
 * Admin/Moderator manual reset — protected with server-side role check.
 */
export async function adminForceResetPassword(userId: string, newPassword: string) {
  const cookieStore = await cookies()

  // 1. Verify the caller is logged in and is an admin
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) throw new Error('Unauthorized: No session found.')

  const { data: callerProfile } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin' && callerProfile?.role !== 'moderator') {
    throw new Error('Forbidden: Insufficient role.')
  }

  // 2. Use the service role client to reset the target user's password
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) throw error
  return data.user
}

/**
 * User submits a request for manual intervention
 */
export async function submitManualResetRequest(formData: FormData) {
  const cookieStore = await cookies()
  const email = formData.get('email') as string
  const fullName = formData.get('fullName') as string

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: userData } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  const { error } = await supabase
    .from('password_reset_requests')
    .insert({
      email,
      full_name: fullName || 'Unknown Trader',
      user_id: userData?.id || null,
      status: 'pending'
    })

  if (error) redirect('/forgot-password?error=Failed to submit request')

  redirect('/forgot-password?success=Support request sent. A moderator will contact you.')
}
