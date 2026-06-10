"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      router.replace(`/?auth=login&error=${error}`);
    } else {
      router.replace('/?auth=login');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-orange-500/5 blur-[120px] pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-black tracking-tighter uppercase drop-shadow-md">
          CRT-ALGO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">CONSOLE</span>
        </h1>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
          <Loader2 className="animate-spin text-orange-500" size={14} />
          <span className="text-[9px] font-black text-orange-550 uppercase tracking-[0.2em]">Redirecting to Portal...</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans">
        <div className="absolute top-0 left-0 w-full h-full bg-orange-500/5 blur-[120px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-black tracking-tighter uppercase drop-shadow-md">
            CRT-ALGO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">CONSOLE</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Loader2 className="animate-spin text-orange-500" size={14} />
            <span className="text-[9px] font-black text-orange-550 uppercase tracking-[0.2em]">Redirecting...</span>
          </div>
        </div>
      </div>
    }>
      <LoginRedirect />
    </Suspense>
  );
}
