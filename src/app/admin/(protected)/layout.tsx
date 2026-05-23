"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AdminSidebar from '@/components/AdminSidebar';
import AdminMobileNav from '@/components/AdminMobileNav';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/admin/login';
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (data?.role === 'admin' || data?.role === 'moderator') {
        setRole(data.role);
      } else {
        window.location.href = '/dashboard'; // Boot non-admins back to user area
      }
      setLoading(false);
    }
    getRole();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="flex flex-col items-center justify-center space-y-6 glass-panel p-12 rounded-[2rem] preserve-3d">
        <Loader2 className="animate-spin mx-auto text-blue-500" size={48} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Verifying Clearance...</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen relative overflow-x-hidden">
      <AdminSidebar userRole={role || 'user'} />
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        <main id="main-scroll-container" className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
          <div className="h-full w-full px-4 md:px-0 flex flex-col">
            <div className="h-20 shrink-0 lg:hidden w-full"></div> {/* Spacer for mobile MENU button */}
            {children}
          </div>
        </main>
      </div>
      <AdminMobileNav userRole={role || 'user'} />
    </div>
  );
}
