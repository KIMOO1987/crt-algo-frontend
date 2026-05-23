"use client"; // This marks the boundary

import { AuthProvider } from '@/hooks/useAuth';
import { KimooProvider } from '@/context/KimooContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <KimooProvider>
        {children}
      </KimooProvider>
    </AuthProvider>
  );
}
