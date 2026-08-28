'use client';

import { useEffect, useMemo, useState } from 'react';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { CheckCircle, Database, Lock, Pencil, Plus, Save, Server, Settings, ShieldCheck, Trash2, Users } from 'lucide-react';
import { BACKEND_URL } from '@/lib/backend';
import { buildAuthHeaders, getCurrentUser, hasPermission, isSuperAdmin } from '@/lib/accessControl';
import { DEFAULT_PORTAL_ROLES } from '@/lib/portalRoles';

type PortalPermission = 'dashboard' | 'agents' | 'documents' | 'reports' | 'services' | 'directions' | 'functions' | 'settings';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: PortalPermission[];
}

interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  password?: string;
  roleId: string;
  directionId?: string;
  directionNom?: string;
  divisionId?: string;
  divisionNom?: string;
  serviceId?: string;
  serviceNom?: string;
  permissions: PortalPermission[];
  status: string;
  passwordResetRequired?: boolean;
}

interface AdminState {
  roles: Role[];
  users: UserAccount[];
}

const portalModules: Array<{ key: PortalPermission; label: string }> = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'agents', label: 'Agents' },
  { key: 'documents', label: 'Documents' },
  { key: 'reports', label: 'Rapports' },
  { key: 'services', label: 'Services' },
  { key: 'directions', label: 'Divisions' },
  { key: 'functions', label: 'Fonctions' },
  { key: 'settings', label: 'Paramètres' },
];

export default function SettingsPage() {
  const [backendUrl, setBackendUrl] = useState(BACKEND_URL);
  const [saved, setSaved] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [directions, setDirections] = useState<Array<{ id: string; nom: string }>>([]);
  const [divisions, setDivisions] = useState<Array<{ id: string; nom: string }>>([]);
  const [services, setServices] = useState<Array<{ id: string; nom: string; divisionId?: string | null; divisionNom?: string | null }>>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', roleId: 'role-admin', directionId: '', divisionId: '', serviceId: '', permissions: [] as PortalPermission[], passwordResetRequired: false });
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as PortalPermission[] });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null | undefined>(undefined);

  const roleOptions = currentUser && !isSuperAdmin(currentUser) ? roles.filter((role) => role.id !== 'role-super-admin') : roles;
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);

  const visibleUsers = useMemo(() => {
    if (currentUser?.directionId) {
      return users.filter((user) => user.directionId === currentUser.directionId);
    }
    return users;
  }, [users, currentUser]);

  const visibleDivisions = useMemo(() => {
    if (!newUser.directionId) return divisions;
    return divisions;
  }, [divisions, newUser.directionId]);

  const visibleServices = useMemo(() => {
    if (!newUser.divisionId) return services;
    return services.filter((service) => service.divisionId === newUser.divisionId);
  }, [services, newUser.divisionId]);

  function isUserInScope(user: UserAccount) {
    return !currentUser?.directionId || user.directionId === currentUser.directionId;
  }

  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [directionsRes, divisionsRes, servicesRes] = await Promise.all([
          fetch('/api/directions'),
          fetch('/api/divisions'),
          fetch('/api/services'),
        ]);

        if (directionsRes.ok) {
          const directionData = await directionsRes.json();
          if (Array.isArray(directionData)) {
            setDirections(directionData.map((dir: any) => ({ id: dir.id, nom: dir.nom })));
          }
        }

        if (divisionsRes.ok) {
          const divisionData = await divisionsRes.json();
          if (Array.isArray(divisionData)) {
            setDivisions(divisionData.map((division: any) => ({ id: division.id, nom: division.nom })));
          }
        }

        if (servicesRes.ok) {
          const serviceData = await servicesRes.json();
          if (Array.isArray(serviceData)) {
            setServices(serviceData.map((service: any) => ({
              id: service.id,
              nom: service.nom,
              divisionId: service.divisionId ?? service.directionId ?? null,
              divisionNom: service.divisionNom ?? service.directionNom ?? null,
            })));
          }
        }
      } catch (error) {
        console.error('Erreur chargement des référentiels', error);
      }
    }

    loadReferenceData();
  }, []);

  useEffect(() => {
    let mounted = true;

    getCurrentUser().then((user) => {
      if (mounted) {
        setCurrentUser(user);
        if (user?.directionId && !newUser.directionId) {
          setNewUser((prev) => ({ ...prev, directionId: user.directionId || '' }));
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminState() {
      let nextState: AdminState = { roles: DEFAULT_PORTAL_ROLES, users: [] };

      try {
        const response = await fetch('/api/admin/state', {
          headers: buildAuthHeaders(),
        });
        if (response.ok) {
          const data = (await response.json()) as Partial<AdminState>;
          nextState = {
            roles: Array.isArray(data.roles) && data.roles.length > 0 ? (data.roles as Role[]) : DEFAULT_PORTAL_ROLES,
            users: Array.isArray(data.users) ? (data.users as UserAccount[]) : [],
          };
        }
      } catch (error) {
        console.error('Erreur de chargement de l’état admin', error);
      }

      if (!cancelled) {
        setRoles(nextState.roles);
        setUsers(nextState.users);
        setIsLoadingState(false);
      }
    }

    loadAdminState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    getCurrentUser().then((user) => {
      if (mounted) {
        setCurrentUser(user);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave() {
    setIsSaving(true);
    setSaved(false);
    setFeedback(null);

    const usersToSave = currentUser?.directionId
      ? users.map((user) => ({ ...user, directionId: user.directionId || currentUser.directionId }))
      : users;

    const state: AdminState = { roles, users: usersToSave };

    try {
      const response = await fetch('/api/admin/state', {
        method: 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        throw new Error('Impossible d’enregistrer la configuration dans la base de données.');
      }

      setFeedback('Configuration enregistrée avec succès dans PostgreSQL.');
    } catch (error) {
      console.error('Erreur de sauvegarde admin state', error);
      setFeedback('Erreur lors de l’enregistrement. Vérifiez la connexion à PostgreSQL.');
    } finally {
      setSaved(true);
      setIsSaving(false);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  function togglePermission(list: PortalPermission[], permission: PortalPermission, setter: (next: PortalPermission[]) => void) {
    if (list.includes(permission)) {
      setter(list.filter((item) => item !== permission));
    } else {
      setter([...list, permission]);
    }
  }

  function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRole.name.trim()) return;

    if (editingRoleId) {
      setRoles((prev) => prev.map((role) => (role.id === editingRoleId ? { ...role, name: newRole.name.trim(), description: newRole.description.trim(), permissions: newRole.permissions } : role)));
      setEditingRoleId(null);
      setFeedback(`Rôle mis à jour : ${newRole.name.trim()}`);
    } else {
      const role: Role = {
        id: `role-${Date.now()}`,
        name: newRole.name.trim(),
        description: newRole.description.trim(),
        permissions: newRole.permissions,
      };

      setRoles((prev) => [...prev, role]);
      setFeedback(`Rôle créé : ${role.name}`);
    }

    setNewRole({ name: '', description: '', permissions: [] });
  }

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.fullName.trim() || !newUser.email.trim() || !newUser.roleId) return;

    const selectedRole = roles.find((role) => role.id === newUser.roleId);
    const assignedDirectionId = currentUser?.directionId || newUser.directionId || undefined;
    const assignedDirectionNom = assignedDirectionId ? directions.find((dir) => dir.id === assignedDirectionId)?.nom : undefined;
    const assignedDivisionId = newUser.divisionId || undefined;
    const assignedDivisionNom = assignedDivisionId ? divisions.find((division) => division.id === assignedDivisionId)?.nom : undefined;
    const assignedServiceId = newUser.serviceId || undefined;
    const assignedServiceNom = assignedServiceId ? services.find((service) => service.id === assignedServiceId)?.nom : undefined;

    if (editingUserId) {
      setUsers((prev) => prev.map((user) =>
        user.id === editingUserId
          ? {
              ...user,
              fullName: newUser.fullName.trim(),
              email: newUser.email.trim(),
              roleId: newUser.roleId,
              directionId: assignedDirectionId,
              directionNom: assignedDirectionNom ?? user.directionNom,
              divisionId: assignedDivisionId,
              divisionNom: assignedDivisionNom ?? user.divisionNom,
              serviceId: assignedServiceId,
              serviceNom: assignedServiceNom ?? user.serviceNom,
              permissions: newUser.permissions.length > 0 ? newUser.permissions : selectedRole?.permissions ?? user.permissions,
              password: newUser.password?.trim() ? newUser.password.trim() : undefined,
              passwordResetRequired: newUser.password?.trim() ? false : user.passwordResetRequired,
            }
          : user
      ));
      setEditingUserId(null);
      setFeedback(`Utilisateur mis à jour : ${newUser.fullName.trim()}`);
    } else {
      const user: UserAccount = {
        id: `user-${Date.now()}`,
        fullName: newUser.fullName.trim(),
        email: newUser.email.trim(),
        password: newUser.password?.trim() || 'changeme',
        roleId: newUser.roleId,
        directionId: assignedDirectionId,
        directionNom: assignedDirectionId ? directions.find((dir) => dir.id === assignedDirectionId)?.nom : undefined,
        divisionId: assignedDivisionId,
        divisionNom: assignedDivisionNom,
        serviceId: assignedServiceId,
        serviceNom: assignedServiceNom,
        permissions: newUser.permissions.length > 0 ? newUser.permissions : selectedRole?.permissions ?? [],
        status: 'Actif',
        passwordResetRequired: !newUser.password?.trim(),
      };

      setUsers((prev) => [...prev, user]);
      setFeedback(`Utilisateur créé : ${user.fullName}`);
    }

    setNewUser({
      fullName: '',
      email: '',
      password: '',
      roleId: selectedRole?.id ?? DEFAULT_PORTAL_ROLES[0]?.id ?? '',
      directionId: currentUser?.directionId ?? '',
      divisionId: '',
      serviceId: '',
      permissions: [],
      passwordResetRequired: false,
    });
  }

  function startEditingUser(user: UserAccount) {
    if (!isUserInScope(user)) {
      setFeedback('Vous ne pouvez modifier que les utilisateurs de votre direction.');
      return;
    }

    setEditingUserId(user.id);
    setNewUser({
      fullName: user.fullName,
      email: user.email,
      password: '',
      roleId: user.roleId,
      directionId: user.directionId || '',
      divisionId: user.divisionId || '',
      serviceId: user.serviceId || '',
      permissions: user.permissions,
      passwordResetRequired: user.passwordResetRequired ?? false,
    });
    setActiveTab('users');
  }

  function startEditingRole(role: Role) {
    setEditingRoleId(role.id);
    setNewRole({ name: role.name, description: role.description, permissions: role.permissions });
    setActiveTab('roles');
  }

  function toggleUserStatus(user: UserAccount) {
    if (!isUserInScope(user)) {
      setFeedback('Vous ne pouvez gérer que les utilisateurs de votre direction.');
      return;
    }
    setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, status: item.status === 'Actif' ? 'Inactif' : 'Actif' } : item)));
    setFeedback(`Statut mis à jour pour ${user.fullName}`);
  }

  function deleteUser(userId: string) {
    const user = users.find((item) => item.id === userId);
    if (user && !isUserInScope(user)) {
      setFeedback('Vous ne pouvez supprimer que les utilisateurs de votre direction.');
      return;
    }
    setUsers((prev) => prev.filter((user) => user.id !== userId));
    setFeedback('Utilisateur supprimé.');
  }

  function deleteRole(roleId: string) {
    setRoles((prev) => prev.filter((role) => role.id !== roleId));
    setFeedback('Rôle supprimé.');
  }

  if (currentUser === undefined) {
    return (
      <div className="office-layout">
        <OfficeHeader />
        <div className="office-body">
          <OfficeSidebar />
          <main className="office-content">
            <div className="direction-container">
              <div className="direction-header">
                <div>
                  <h1>Chargement...</h1>
                  <p>Vérification des permissions en cours.</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!hasPermission(currentUser, 'settings')) {
    return (
      <div className="office-layout">
        <OfficeHeader />
        <div className="office-body">
          <OfficeSidebar />
          <main className="office-content">
            <div className="direction-container">
              <div className="direction-header">
                <div>
                  <h1>Accès refusé</h1>
                  <p>Vous n’avez pas les permissions nécessaires pour consulter cette page.</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="office-layout">
      <OfficeHeader />

      <div className="office-body">
        <OfficeSidebar />

        <main className="office-content">
          <div className="direction-container">
            <div className="direction-header">
              <div>
                <h1>Paramètres Kna+ SGA</h1>
                <p>Configuration du serveur backend, de la base de données, des utilisateurs, rôles et permissions du portail</p>
                {currentUser && !currentUser.directionId && (
                  <div style={{ marginTop: '10px', padding: '12px 16px', borderRadius: '14px', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', fontWeight: 700 }}>
                    Super-admin : accès complet à la gestion des utilisateurs, des rôles et des permissions.
                  </div>
                )}
              </div>

              <div className="system-pill">
                <span className="dot"></span>
                Serveur Opérationnel
              </div>
            </div>

            <div style={{ display: 'grid', gap: '24px', maxWidth: '1200px' }}>
              <div
                style={{
                  background: 'white',
                  borderRadius: '18px',
                  padding: '30px',
                  border: '1px solid #e8edf5',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e8edf5', paddingBottom: '16px', marginBottom: '24px' }}>
                  <Server size={22} className="text-blue-600" />
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                    Connexion Backend &amp; API
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: '#334155' }}>
                      URL du serveur Backend (BACKEND_URL)
                    </label>
                    <input
                      type="text"
                      value={backendUrl}
                      onChange={(e) => setBackendUrl(e.target.value)}
                      style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 14px', fontSize: '14px', outline: 'none' }}
                    />
                    <small style={{ color: '#64748b', display: 'block', marginTop: '6px' }}>
                      Standard local ou distant : <code>/api</code> (intégré) ou <code>http://localhost:8080/api</code>
                    </small>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#16a34a', fontWeight: 700 }}>
                      <Database size={18} /> Base de Données SGA
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                      Stockage actif : Système unifié avec synchronisation automatique pour les Directions, Fonctions, Districts, Villes, Communes et Agents.
                    </p>
                  </div>

                  {saved && (
                    <div className="alert success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={18} /> {feedback ?? 'Paramètres enregistrés avec succès.'}
                    </div>
                  )}

                  <div>
                    <button className="add-btn" onClick={handleSave} disabled={isSaving}>
                      <Save size={18} /> {isSaving ? 'Enregistrement...' : 'Enregistrer la configuration'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '18px', padding: '30px', border: '1px solid #e8edf5', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e8edf5', paddingBottom: '16px', marginBottom: '24px' }}>
                  <ShieldCheck size={22} className="text-blue-600" />
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                    Gestion des utilisateurs et accès au portail
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'users', label: 'Utilisateurs', icon: Users },
                    { key: 'roles', label: 'Rôles', icon: Lock },
                    { key: 'permissions', label: 'Permissions', icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveTab(item.key as 'users' | 'roles' | 'permissions')}
                        style={{
                          border: activeTab === item.key ? '1px solid #2563eb' : '1px solid #dbe4f0',
                          background: activeTab === item.key ? '#eff6ff' : 'white',
                          color: activeTab === item.key ? '#1d4ed8' : '#475569',
                          borderRadius: '999px',
                          padding: '8px 14px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon size={16} /> {item.label}
                      </button>
                    );
                  })}
                </div>

                {activeTab === 'users' && (
                  <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Créer un utilisateur</h3>
                      <input placeholder="Nom complet" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} style={inputStyle} />
                      <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} style={inputStyle} />
                      <input type="password" placeholder="Mot de passe" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} style={inputStyle} />
                      {editingUserId ? (
                        <div style={{ color: '#475569', fontSize: '12px', marginTop: '4px' }}>
                          Laissez vide pour conserver le mot de passe existant.
                        </div>
                      ) : (
                        <div style={{ color: '#475569', fontSize: '12px', marginTop: '4px' }}>
                          Saisissez un mot de passe pour le nouvel utilisateur.
                        </div>
                      )}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', color: '#334155', fontSize: '13px' }}>
                        <input
                          type="checkbox"
                          checked={newUser.passwordResetRequired}
                          onChange={(e) => setNewUser({ ...newUser, passwordResetRequired: e.target.checked })}
                          style={{ width: '16px', height: '16px' }}
                        />
                        Forcer la réinitialisation du mot de passe à la prochaine connexion
                      </label>
                      <select value={newUser.roleId} onChange={(e) => setNewUser({ ...newUser, roleId: e.target.value })} style={inputStyle}>
                        {roleOptions.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                      <select
                        value={newUser.directionId}
                        onChange={(e) => setNewUser({ ...newUser, directionId: e.target.value, divisionId: '', serviceId: '' })}
                        style={inputStyle}
                        disabled={Boolean(currentUser?.directionId)}
                      >
                        {currentUser?.directionId ? (
                          <option value={currentUser.directionId}>{directions.find((direction) => direction.id === currentUser.directionId)?.nom || currentUser.directionId}</option>
                        ) : (
                          <>
                            <option value="">Aucune direction (accès global)</option>
                            {directions.map((direction) => (
                              <option key={direction.id} value={direction.id}>{direction.nom}</option>
                            ))}
                          </>
                        )}
                      </select>
                      <select
                        value={newUser.divisionId}
                        onChange={(e) => setNewUser({ ...newUser, divisionId: e.target.value, serviceId: '' })}
                        style={inputStyle}
                      >
                        <option value="">Aucune division</option>
                        {visibleDivisions.map((division) => (
                          <option key={division.id} value={division.id}>{division.nom}</option>
                        ))}
                      </select>
                      <select
                        value={newUser.serviceId}
                        onChange={(e) => setNewUser({ ...newUser, serviceId: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">Aucun bureau</option>
                        {visibleServices.map((service) => (
                          <option key={service.id} value={service.id}>{service.nom}</option>
                        ))}
                      </select>
                      {currentUser?.directionId && (
                        <div style={{ color: '#475569', fontSize: '13px', marginTop: '4px' }}>
                          Votre compte est rattaché à la direction « {directions.find((dir) => dir.id === currentUser.directionId)?.nom || currentUser.directionId} ». Les nouveaux utilisateurs seront automatiquement assignés à cette direction.
                        </div>
                      )}
                      <button type="submit" className="add-btn" style={{ justifyContent: 'center' }}>
                        <Plus size={16} /> {editingUserId ? 'Enregistrer les modifications' : 'Ajouter l\'utilisateur'}
                      </button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Utilisateurs existants</h3>
                      {visibleUsers.map((user) => {
                        const role = roles.find((item) => item.id === user.roleId);
                        return (
                          <div key={user.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong>{user.fullName}</strong>
                              <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>{user.status}</span>
                            </div>
                            <div style={{ marginTop: '6px', color: '#64748b', fontSize: '13px' }}>{user.email}</div>
                            <div style={{ marginTop: '6px', color: '#2563eb', fontSize: '13px', fontWeight: 700 }}>{role?.name ?? 'Rôle non défini'}</div>
                            <div style={{ marginTop: '4px', color: '#475569', fontSize: '13px' }}>
                              Direction : {directions.find((dir) => dir.id === user.directionId)?.nom || user.directionNom || 'Global'}
                            </div>
                            <div style={{ marginTop: '4px', color: '#475569', fontSize: '13px' }}>
                              Division : {divisions.find((division) => division.id === user.divisionId)?.nom || user.divisionNom || 'Aucune'}
                            </div>
                            <div style={{ marginTop: '4px', color: '#475569', fontSize: '13px' }}>
                              Bureau : {services.find((service) => service.id === user.serviceId)?.nom || user.serviceNom || 'Aucun'}
                            </div>
                            <div style={{ marginTop: '4px', color: '#334155', fontSize: '13px' }}>
                              Permissions : {user.permissions.length > 0 ? user.permissions.join(', ') : role?.permissions.join(', ') || 'Aucune'}
                            </div>
                            {user.passwordResetRequired && (
                              <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontSize: '12px', fontWeight: 700, background: '#fee2e2', borderRadius: '999px', padding: '4px 10px' }}>
                                Réinitialisation requise
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                              <button type="button" onClick={() => startEditingUser(user)} style={{ border: 'none', background: '#eff6ff', color: '#2563eb', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Pencil size={14} /> Modifier
                              </button>
                              <button type="button" onClick={() => setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, passwordResetRequired: true } : item))} style={{ border: 'none', background: '#f0f9ff', color: '#0c4a6e', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                                Forcer réinitialisation
                              </button>
                              <button type="button" onClick={() => toggleUserStatus(user)} style={{ border: 'none', background: '#fef3c7', color: '#92400e', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                                {user.status === 'Actif' ? 'Désactiver' : 'Activer'}
                              </button>
                              <button type="button" onClick={() => deleteUser(user.id)} style={{ border: 'none', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Trash2 size={14} /> Supprimer
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'roles' && (
                  <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    <form onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Créer un rôle</h3>
                      <input placeholder="Nom du rôle" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} style={inputStyle} />
                      <input placeholder="Description" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} style={inputStyle} />
                      <button type="submit" className="add-btn" style={{ justifyContent: 'center' }}>
                        <Plus size={16} /> {editingRoleId ? 'Enregistrer les modifications' : 'Ajouter le rôle'}
                      </button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Rôles disponibles</h3>
                      {roles.map((role) => (
                        <div key={role.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#f8fafc' }}>
                          <strong>{role.name}</strong>
                          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{role.description}</div>
                          <div style={{ marginTop: '8px', color: '#2563eb', fontSize: '12px', fontWeight: 700 }}>
                            Permissions : {role.permissions.length > 0 ? role.permissions.join(', ') : 'Aucune'}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => startEditingRole(role)} style={{ border: 'none', background: '#eff6ff', color: '#2563eb', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Pencil size={14} /> Modifier
                            </button>
                            <button type="button" onClick={() => deleteRole(role.id)} style={{ border: 'none', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'permissions' && (
                  <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Permissions du portail</h3>
                      {portalModules.map((module) => (
                        <label key={module.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', background: '#f8fafc' }}>
                          <span>{module.label}</span>
                          <input type="checkbox" checked={newRole.permissions.includes(module.key)} onChange={() => togglePermission(newRole.permissions, module.key, (value) => setNewRole({ ...newRole, permissions: value }))} />
                        </label>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Résumé des accès</h3>
                      {roles.map((role) => (
                        <div key={role.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#f8fafc' }}>
                          <strong>{role.name}</strong>
                          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{role.permissions.length > 0 ? role.permissions.join(' • ') : 'Aucun accès'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {feedback && (
                  <div style={{ marginTop: '18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 12px', color: '#166534', fontWeight: 600 }}>
                    {feedback}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  padding: '0 14px',
  fontSize: '14px',
  outline: 'none',
};
