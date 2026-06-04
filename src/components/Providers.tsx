"use client"; // This marks the boundary

import { AuthProvider } from '@/hooks/useAuth';
import { CrtAlgoProvider } from '@/context/CrtAlgoContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CrtAlgoProvider>
        {children}
      </CrtAlgoProvider>
    </AuthProvider>
  );
}
