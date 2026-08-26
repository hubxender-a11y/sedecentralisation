'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DivisionManager from '@/components/DivisionManager';
import { canAccessPath, getCurrentUser } from '@/lib/accessControl';
import './directions.css';

export default function DirectionsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verifyPermission() {
      const user = await getCurrentUser();
      if (cancelled) return;

      if (!canAccessPath('/directions', user)) {
        router.replace('/');
        return;
      }

      setIsAuthorized(true);
    }

    verifyPermission();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (isAuthorized === null) {
    return null;
  }

  return <DivisionManager />;
}
