"use client";

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import DashboardClient from './DashboardClient';

export default function SfpDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, tier, role, plan_type, subscription_type, is_pro, expiry_date, full_name, country, email, account_size, risk_value, reward_value')
        .eq('id', session.user.id)
        .single();

      let activeProfile = profileData;

      if (!activeProfile || error) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            email: session.user.email,
            tier: 0,
            role: 'user',
            plan_type: null,
            full_name: 'TRADER',
            account_size: 100000,
            risk_value: 1.0,
            reward_value: 2.0
          })
          .select('id, tier, role, plan_type, subscription_type, is_pro, expiry_date, full_name, country, email, account_size, risk_value, reward_value')
          .single();

        activeProfile = newProfile;
      }

      setProfile(activeProfile);
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <DashboardClient
      tier={profile?.tier ?? 0}
      expiryDate={profile?.expiry_date}
      userProfile={profile}
    />
  );
}
