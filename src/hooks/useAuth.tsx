"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AuthContextType {
  user: any;
  tier: number;
  role: string;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [tier, setTier] = useState<number>(0);
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('tier, role')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (profile) {
        setTier(profile.tier ?? 0);
        setRole(profile.role ?? 'user');
      }
    } catch (error) {
      setTier(0);
      setRole('user');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Safety net: if Supabase never responds, unblock the UI after 4 seconds
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    // onAuthStateChange is the single source of truth.
    // It fires INITIAL_SESSION on page load — no need for a separate getSession() call.
    // This eliminates the race condition and the hang on token refresh after inactivity.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        clearTimeout(timeout); // Auth responded — cancel the safety timer

        if (session?.user) {
          setUser(session.user);
          setLoading(false); // Unblock UI immediately — don't wait for profile
          fetchProfile(session.user.id); // Fetch profile in background
        } else {
          setUser(null);
          setTier(0);
          setRole('user');
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, tier, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
