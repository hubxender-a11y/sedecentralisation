'use client';

import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ padding: '24px', maxWidth: '480px', textAlign: 'center', background: '#fff', borderRadius: '16px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)' }}>
        <h1 style={{ margin: '0 0 16px', fontSize: '24px', color: '#111827' }}>Page désactivée</h1>
        <p style={{ margin: '0 0 24px', color: '#475569' }}>
          Cette page de changement de mot de passe n'est plus utilisée. Retournez à l'accueil ou connectez-vous normalement.
        </p>
        <button
          type="button"
          onClick={() => router.replace('/')}
          style={{ height: '46px', minWidth: '160px', border: 'none', borderRadius: '12px', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
