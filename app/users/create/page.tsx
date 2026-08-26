'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { getCurrentUser, hasPermission, buildAuthHeaders, isSuperAdmin, type AdminUser } from '@/lib/accessControl';
import { Plus, ShieldCheck } from 'lucide-react';

type Direction = {
  id: string;
  nom: string;
};

type ServiceOption = {
  id: string;
  nom: string;
  directionId?: string;
  divisionId?: string;
  divisionNom?: string;
};

type DivisionOption = {
  id: string;
  nom: string;
  directionId?: string;
  directionNom?: string;
};

type Role = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
};

export default function UsersCreatePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('role-admin');
  const [directionId, setDirectionId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;

    async function init() {
      const user = await getCurrentUser();
      if (!mounted) return;
      setCurrentUser(user);
      if (!hasPermission(user, 'settings')) {
        router.replace('/');
        return;
      }
      setIsAuthorized(true);
    }

    init();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [resDirections, resDivisions, resServices] = await Promise.all([
          fetch('/api/directions'),
          fetch('/api/divisions'),
          fetch('/api/services'),
        ]);

            const directionsData = await resDirections.json();
        const divisionsData = await resDivisions.json();
        const servicesData = await resServices.json();

        if (Array.isArray(directionsData)) setDirections(directionsData);
        if (Array.isArray(divisionsData)) setDivisions(divisionsData);
        if (Array.isArray(servicesData)) setServices(servicesData);
      } catch (err) {
        console.error(err);
      }
    }

    loadMeta();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic validation
    if (!fullName.trim() || !email.trim() || !roleId.trim()) {
      setError('Nom, email et rôle sont requis.');
      return;
    }

    // Role-dependent validation to ensure hierarchical completeness
    if (roleId === 'role-chef-direction' && !(directionId || currentUser?.directionId)) {
      setError("Le rôle 'Chef de direction' nécessite une direction.");
      return;
    }
    if (roleId === 'role-chef-division' && !(divisionId)) {
      setError("Le rôle 'Chef de division' nécessite de sélectionner une division.");
      return;
    }
    if (roleId === 'role-chef-bureau' && !(serviceId)) {
      setError("Le rôle 'Chef de bureau' nécessite de sélectionner un bureau/service.");
      return;
    }

    try {
      const stateResponse = await fetch('/api/admin/state', { headers: buildAuthHeaders() });
      if (!stateResponse.ok) {
        throw new Error('Impossible de charger l’état existant.');
      }

      const currentState = await stateResponse.json();
      const existingUsers = Array.isArray(currentState.users) ? currentState.users : [];
      const existingRoles = Array.isArray(currentState.roles) ? currentState.roles : [];

      // resolve assigned IDs preferring the currentUser's scope when appropriate
      const assignedDirectionId = currentUser?.directionId || directionId || undefined;
      const assignedDivisionId = divisionId || undefined;
      const assignedServiceId = serviceId || undefined;

      const assignedDirectionNom = directions.find((dir) => dir.id === assignedDirectionId)?.nom || undefined;
      const assignedDivisionNom = divisions.find((div) => div.id === assignedDivisionId)?.nom || divisions.find((div) => div.id === assignedDivisionId)?.nom || assignedDirectionNom;
      const assignedServiceNom = services.find((srv) => srv.id === assignedServiceId)?.nom || undefined;

      const newUser = {
        id: `user-${Date.now()}`,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || 'changeme',
        roleId,
        directionId: assignedDirectionId,
        directionNom: assignedDirectionNom,
        divisionId: assignedDivisionId,
        divisionNom: assignedDivisionNom,
        serviceId: assignedServiceId,
        serviceNom: assignedServiceNom,
        permissions: [],
        status: 'Actif',
        passwordResetRequired: !password.trim(),
      };

      const response = await fetch('/api/admin/state', {
        method: 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({
          roles: existingRoles,
          users: [...existingUsers, newUser],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error('Erreur de création utilisateur: ' + body);
      }

      setSuccess('Utilisateur créé avec succès.');
      setFullName('');
      setEmail('');
      setPassword('');
      setDirectionId('');
      setDivisionId('');
      setServiceId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur interne');
    }
  }

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
                <h1>Créer un utilisateur</h1>
                <p>Créez un compte utilisateur pour accéder à l’application.</p>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 16, color: '#1e40af', fontWeight: 700 }}>
                <ShieldCheck size={18} />
                Accès application
              </div>
            </div>

            <div style={{ maxWidth: 680, background: 'white', borderRadius: 18, border: '1px solid #e8edf5', boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)', padding: 28 }}>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ fontWeight: 700 }}>Nom complet</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nom complet" style={{ height: 46, borderRadius: 12, border: '1px solid #cbd5e1', padding: '0 14px' }} />
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ fontWeight: 700 }}>Email</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@kna.local" style={{ height: 46, borderRadius: 12, border: '1px solid #cbd5e1', padding: '0 14px' }} />
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ fontWeight: 700 }}>Mot de passe</label>
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mot de passe (laisser vide pour changeme)" style={{ height: 46, borderRadius: 12, border: '1px solid #cbd5e1', padding: '0 14px' }} />
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ fontWeight: 700 }}>Direction</label>
                  {currentUser?.directionId ? (
                    <input value={currentUser.directionNom || ''} disabled style={{ height: 46, borderRadius: 12, border: '1px solid #cbd5e1', padding: '0 14px', background: '#f8fafc' }} />
                  ) : (
                    <select value={directionId} onChange={(e) => {
                      setDirectionId(e.target.value);
                      setDivisionId('');
                      setServiceId('');
                    }} style={{ height: 46, borderRadius: 12, border: '1px solid #cbd5e1', padding: '0 14px' }}>
                      <option value="">Sélectionner une direction</option>
                      {directions.map((direction) => (
                        <option key={direction.id} value={direction.id}>{direction.nom}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ fontWeight: 700 }}>Division</label>
                  <select value={divisionId} onChange={(e) => {
                    setDivisionId(e.target.value);
                    setServiceId('');
                  }} style={{ height: 46, borderRadius: 12, border: '1px solid #cbd5e1', padding: '0 14px' }}>
                    <option value="">Sélectionner une division</option>
                    {divisions
                      .filter((division) => {
                        // show divisions that belong to the selected direction or to the current user's direction when scoped
                        if (currentUser?.directionId) {
                          return division.directionId === currentUser.directionId || division.directionId === currentUser.directionId;
                        }
                        if (directionId) {
                          return division.directionId === directionId;
                        }
                        return true;
                      })
                      .map((division) => (
                        <option key={division.id} value={division.id}>{division.nom}</option>
                      ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ fontWeight: 700 }}>Bureau</label>
                  <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} style={{ height: 46, borderRadius: 12, border: '1px solid #cbd5e1', padding: '0 14px' }}>
                    <option value="">Sélectionner un bureau</option>
                    {services
                      .filter((service) => {
                        // prefer service.divisionId when division is selected
                        if (divisionId) return service.divisionId === divisionId || service.id === divisionId;

                        // if user is scoped to a direction, show services under that direction
                        if (currentUser?.directionId) return service.directionId === currentUser.directionId || service.divisionId === currentUser.divisionId;

                        // otherwise, if direction selected, show services under that direction
                        if (directionId) return service.directionId === directionId || service.divisionId === directionId;

                        // global
                        return true;
                      })
                      .map((service) => (
                        <option key={service.id} value={service.id}>{service.nom}</option>
                      ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ fontWeight: 700 }}>Rôle</label>
                  <select value={roleId} onChange={(e) => setRoleId(e.target.value)} style={{ height: 46, borderRadius: 12, border: '1px solid #cbd5e1', padding: '0 14px' }}>
                    {isSuperAdmin(currentUser) ? <option value="role-super-admin">Super administrateur</option> : null}
                    <option value="role-secretariat-general">Secrétaire générale</option>
                    <option value="role-chef-direction">Chef de direction</option>
                    <option value="role-chef-division">Chef de division</option>
                    <option value="role-chef-bureau">Chef de bureau</option>
                    <option value="role-rh">RH</option>
                    <option value="role-viewer">Lecteur</option>
                  </select>
                </div>

                {error && <div style={{ color: '#b91c1c', fontWeight: 700 }}>{error}</div>}
                {success && <div style={{ color: '#166534', fontWeight: 700 }}>{success}</div>}

                <button type="submit" className="add-btn" style={{ justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={16} /> Créer l&apos;utilisateur
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
