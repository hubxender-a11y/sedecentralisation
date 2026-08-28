'use client';

import { useEffect, useState } from 'react';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { buildAuthHeaders, getCurrentUser, isSuperAdmin, type AdminUser } from '@/lib/accessControl';

type AuditItem = {
  id: string;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  result: string;
  createdAt: string;
};

export default function AuditPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAudit(selectedAction = action) {
    setLoading(true);
    setError('');
    try {
      const query = selectedAction ? `?action=${encodeURIComponent(selectedAction)}` : '';
      const response = await fetch(`/api/audit-logs${query}`, { credentials: 'same-origin', headers: buildAuthHeaders() });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message || 'Journal d audit indisponible.');
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError('Erreur réseau lors du chargement du journal.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      if (currentUser && isSuperAdmin(currentUser)) loadAudit();
      else setLoading(false);
    });
  }, []);

  if (!user || !isSuperAdmin(user)) {
    return <main style={{ padding: 40 }}>Accès réservé au super-administrateur.</main>;
  }

  return (
    <div className="office-layout">
      <OfficeHeader />
      <div className="office-body">
        <OfficeSidebar />
        <main className="office-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: 0 }}>Journal d audit</h1>
              <p style={{ color: '#64748b' }}>Traçabilité des opérations sensibles du portail.</p>
            </div>
            <select value={action} onChange={(event) => { setAction(event.target.value); loadAudit(event.target.value); }} aria-label="Filtrer par action">
              <option value="">Toutes les actions</option>
              <option value="LOGIN">Connexions</option>
              <option value="CHANGE_PASSWORD">Mots de passe</option>
            </select>
          </div>
          {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
          {loading ? <p>Chargement du journal...</p> : (
            <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #fecaca', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th>Action</th><th>Utilisateur</th><th>Résultat</th><th>Adresse IP</th><th>Date</th></tr></thead>
                <tbody>
                  {items.map((item) => <tr key={item.id}>
                    <td>{item.action}</td><td>{item.userId || 'Anonyme'}</td><td>{item.result}</td><td>{item.ipAddress || '-'}</td><td>{new Date(item.createdAt).toLocaleString('fr-FR')}</td>
                  </tr>)}
                  {items.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center' }}>Aucun événement enregistré.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}