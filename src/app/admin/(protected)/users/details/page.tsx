import { Suspense } from 'react';
import UserDetailClient from './UserDetailClient';
import { Loader2 } from 'lucide-react';

export default function UserDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-zinc-500" />
      </div>
    }>
      <UserDetailClient />
    </Suspense>
  );
}
