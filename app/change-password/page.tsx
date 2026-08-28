'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { buildAuthHeaders } from '@/lib/accessControl';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (newPassword !== confirmation) {
      setMessage('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setMessage(data.message || 'Impossible de modifier le mot de passe.');
        return;
      }
      router.replace('/');
    } catch {
      setMessage('Erreur réseau. Réessayez.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ padding: '24px', maxWidth: '480px', textAlign: 'center', background: '#fff', borderRadius: '16px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)' }}>
        <h1 style={{ margin: '0 0 16px', fontSize: '24px', color: '#111827' }}>Modifier le mot de passe</h1>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px', textAlign: 'left' }}>
          <label>Mot de passe actuel<input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
          <label>Nouveau mot de passe<input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label>Confirmer le nouveau mot de passe<input required minLength={8} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          {message && <p role="alert" style={{ margin: 0, color: '#b91c1c' }}>{message}</p>}
          <button type="submit" disabled={saving} style={{ height: '46px', border: 'none', borderRadius: '12px', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}
