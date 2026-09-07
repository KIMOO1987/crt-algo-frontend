'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// Verify the caller is an admin before doing anything
async function verifyAdmin() {
  const cookieStore = await cookies()
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
          } catch {}
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
    throw new Error('Forbidden')
  }

  return supabase
}

export async function approveUserAction(userId: string, requestedPlan: string) {
  await verifyAdmin()

  // Use service role for the actual update
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const planToAssign = requestedPlan?.toLowerCase() || 'pro'
  const tierMap: Record<string, number> = { 'alpha': 1, 'pro': 2, 'ultimate': 3 }
  const tierLevel = tierMap[planToAssign] || 2

  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + 30)

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: planToAssign,
      tier: tierLevel,
      expiry_date: expiryDate.toISOString(),
      pending_crypto_hash: null,
      pending_plan_id: null,
      last_payment_date: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function kickHashAction(userId: string) {
  await verifyAdmin()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ pending_crypto_hash: null, pending_plan_id: null })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  return { success: true }
}
