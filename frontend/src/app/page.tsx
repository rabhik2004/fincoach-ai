'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">F</span>
        </div>
        <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
      </div>
    </div>
  );
}
