"use client";

import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Providers } from '@/components/Providers'; 
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState(0);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tier, role')
        .eq('id', session.user.id)
        .single();

      const role = profile?.role || 'user';
      const isStaff = role === 'admin' || role === 'moderator';
      const tier = isStaff ? 3 : (profile?.tier ?? 0);

      setUserRole(role);
      setUserTier(tier);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <Providers>
      <div className="flex min-h-screen relative overflow-hidden">
        <Sidebar tier={userTier} role={userRole} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <MobileNav tier={userTier} role={userRole} />

          <main id="main-scroll-container" className="flex-1 overflow-y-auto w-full custom-scrollbar relative">
            <div className="h-full w-full px-4 md:px-0 flex flex-col">
              <div className="h-20 shrink-0 lg:hidden w-full"></div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </Providers>
  );
}
