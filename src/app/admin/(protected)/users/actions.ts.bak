'use server'

import { createClient } from '@supabase/supabase-js'

/**
 * HELPER: Initialize the Admin Client
 * We do this inside a helper to ensure it's only called on the server 
 * and has access to the private SERVICE_ROLE_KEY.
 */
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing Supabase Admin Environment Variables.");
  }

  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * ACTION: Create a new user in Supabase Auth
 */
export async function createAdminUser(userData: any) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Create the Auth Record
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirms so admin doesn't wait for user to click a link
      user_metadata: { 
        full_name: userData.full_name,
        is_admin_created: true 
      }
    });

    if (error) {
      console.error("Supabase Admin Auth Error:", error.message);
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (err: any) {
    console.error("Critical Action Failure:", err.message);
    return { user: null, error: "Internal Server Error. Check Vercel Logs." };
  }
}

/**
 * ACTION: Remove a user from both Auth and Profiles
 */
export async function removeUserAction(userId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Delete from profiles table first 
    // (This ensures no orphan data if your FK doesn't cascade)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error("Profile Delete Error:", profileError.message);
    }

    // 2. Delete from Supabase Authentication
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      return { success: false, error: authError.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Delete Action Failure:", err.message);
    return { success: false, error: "Failed to delete user." };
  }
}
