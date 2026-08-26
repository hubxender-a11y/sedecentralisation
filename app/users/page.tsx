'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { getCurrentUser, buildAuthHeaders, hasPermission, type AdminUser } from '@/lib/accessControl';
import { Search, ShieldCheck, Users as UsersIcon } from 'lucide-react';

interface Direction {
  id: string;
  nom: string;
}

interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  directionId?: string;
  directionNom?: string;
  permissions: string[];
  status: 'Actif' | 'Inactif';
  passwordResetRequired?: boolean;
}

const roleLabels: Record<string, string> = {
  'role-super-admin': 'Super administrateur',
  'role-admin': 'Administrateur',
  'role-rh': 'RH',
  'role-viewer': 'Lecteur',
};

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const user = await getCurrentUser();
      if (!mounted) return;
      setCurrentUser(user);
      if (!hasPermission(user, 'settings')) {
        router.replace('/');
        return;
      }
      setIsAuthorized(true);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const [directionsRes, adminStateRes] = await Promise.all([
          fetch('/api/directions'),
          fetch('/api/admin/state', { headers: buildAuthHeaders() }),
        ]);

        if (!mounted) return;

        const directionsData = directionsRes.ok ? await directionsRes.json() : [];
        const adminState = adminStateRes.ok ? await adminStateRes.json() : { users: [] };

        setDirections(Array.isArray(directionsData) ? directionsData : []);
        setUsers(Array.isArray(adminState.users) ? adminState.users : []);
      } catch (error) {
        console.error('Erreur chargement utilisateurs', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (isAuthorized) {
      loadData();
    }

    return () => {
      mounted = false;
    };
  }, [isAuthorized]);

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        if (selectedDirection !== 'ALL' && user.directionId !== selectedDirection) {
          return false;
        }
        if (!search.trim()) return true;
        const text = search.toLowerCase();
        return (
          user.fullName.toLowerCase().includes(text) ||
          user.email.toLowerCase().includes(text) ||
          (user.directionNom ?? '').toLowerCase().includes(text)
        );
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [users, search, selectedDirection]);

  if (isAuthorized === null) {
    return null;
  }

  return (
    <div className="office-layout">
      <OfficeHeader />
      <div className="office-body">
        <OfficeSidebar />
        <main className="office-content">
          <div className="direction-container">
            <div className="direction-header" style={{ gap: 12 }}>
              <div>
                <h1>Gestion des utilisateurs</h1>
                <p>Accès aux comptes et aux permissions. Vous pouvez filtrer par direction ou rechercher un utilisateur.</p>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 16, color: '#1e40af', fontWeight: 700 }}>
                <ShieldCheck size={18} />
                {currentUser?.directionNom ? `Direction : ${currentUser.directionNom}` : 'Super-admin'}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 24, maxWidth: 1200 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', background: 'white' }}>
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Recherche par nom, email ou direction"
                      style={{ border: 'none', outline: 'none', width: 320 }}
                    />
                  </div>

                  <select value={selectedDirection} onChange={(e) => setSelectedDirection(e.target.value)} style={{ borderRadius: 12, border: '1px solid #d1d5db', padding: '10px 14px', minWidth: 220 }}>
                    <option value="ALL">Toutes les directions</option>
                    {directions.map((dir) => (
                      <option key={dir.id} value={dir.id}>{dir.nom}</option>
                    ))}
                  </select>
                </div>

                <button onClick={() => router.push('/settings')} className="add-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <UsersIcon size={16} /> Paramètres utilisateurs
                </button>
              </div>

              <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8edf5', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '22px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <strong style={{ fontSize: 18 }}>Listes des utilisateurs</strong>
                    <div style={{ marginTop: 6, color: '#64748b', fontSize: 13 }}>{filteredUsers.length} utilisateur(s) affiché(s)</div>
                  </div>
                </div>

                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569' }}>
                        {['Nom', 'Email', 'Rôle', 'Direction', 'Statut', 'Réinitialisation', 'Permissions'].map((heading) => (
                          <th key={heading} style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} style={{ padding: 20, color: '#64748b' }}>Chargement des utilisateurs...</td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: 20, color: '#64748b' }}>Aucun utilisateur trouvé.</td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px', fontWeight: 700 }}>{user.fullName}</td>
                            <td style={{ padding: '14px 16px' }}>{user.email}</td>
                            <td style={{ padding: '14px 16px' }}>{roleLabels[user.roleId] ?? user.roleId}</td>
                            <td style={{ padding: '14px 16px' }}>{user.directionNom || 'Global'}</td>
                            <td style={{ padding: '14px 16px' }}>{user.status}</td>
                            <td style={{ padding: '14px 16px' }}>{user.passwordResetRequired ? 'Oui' : 'Non'}</td>
                            <td style={{ padding: '14px 16px', color: '#334155' }}>{user.permissions.join(', ') || 'Aucune'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
