'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/accessControl';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === '/login';
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAuth() {
      const currentUser = await getCurrentUser();
      if (cancelled) return;

      if (!currentUser && !isLoginRoute) {
        router.replace('/login');
      } else if (currentUser && isLoginRoute) {
        router.replace('/');
      }

      setChecked(true);
    }

    verifyAuth();

    return () => {
      cancelled = true;
    };
  }, [pathname, isLoginRoute, router]);

  if (!checked) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fff7f7', color: '#7f1d1d', fontWeight: 700 }}>
        Chargement du portail...
      </div>
    );
  }

  return <>{children}</>;
}
