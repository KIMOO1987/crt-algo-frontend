import { supabase } from '@/lib/supabaseClient';

export async function clientLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function clientRequestPasswordReset(email: string) {
  const origin = window.location.origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery`,
  });
  
  if (error) throw error;
}

export async function clientSubmitManualResetRequest(email: string, fullName: string) {
  // 1. Get user id
  const { data: userData } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  // 2. Insert request
  const { error } = await supabase
    .from('password_reset_requests')
    .insert({
      email,
      full_name: fullName || 'Unknown Trader',
      user_id: userData?.id || null,
      status: 'pending'
    });

  if (error) throw error;
}
