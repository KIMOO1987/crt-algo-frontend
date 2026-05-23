"use client"; // CRITICAL: This must be at the very top

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Ensure this path is correct
import { Loader2 } from 'lucide-react';

export default function PasswordRecoveryListener() {
  const router = useRouter();

  useEffect(() => {
    // Set up the listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      
      // This event triggers when a user clicks the reset link in their email
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/update-password');
      }

      // Optional: If they are already signed in via the recovery flow
      if (event === 'SIGNED_IN' && !session) {
         // Logic for session-less sign-ins if needed
      }
    });

    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="flex flex-col items-center gap-4 glass-panel p-12 rounded-[2rem] preserve-3d">
        <Loader2 className="text-orange-500 animate-spin" size={32} />
        <p className="opacity-70 text-[10px] font-black uppercase tracking-[0.3em]">
          Verifying Recovery Token...
        </p>
      </div>
    </div>
  );
}