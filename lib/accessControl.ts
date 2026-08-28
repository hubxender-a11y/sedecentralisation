export type PortalPermission = 'dashboard' | 'agents' | 'documents' | 'reports' | 'services' | 'directions' | 'functions' | 'settings';
export type PortalRoleId = 'role-super-admin' | 'role-secretariat-general' | 'role-chef-direction' | 'role-chef-division' | 'role-chef-bureau' | 'role-rh' | 'role-viewer';

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: PortalPermission[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  password?: string;
  roleId: string;
  roleType?: PortalRoleId;
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

export interface AdminState {
  roles: AdminRole[];
  users: AdminUser[];
}

const CURRENT_USER_KEY = 'kana-current-user-id';

export async function readStoredAdminState(): Promise<AdminState> {
  if (typeof window === 'undefined') {
    return { roles: [], users: [] };
  }

  try {
    const response = await fetch('/api/admin/state', {
      headers: buildAuthHeaders(),
    });
    if (!response.ok) {
      return { roles: [], users: [] };
    }

    const data = (await response.json()) as Partial<AdminState>;
    return {
      roles: Array.isArray(data.roles) ? (data.roles as AdminRole[]) : [],
      users: Array.isArray(data.users) ? (data.users as AdminUser[]) : [],
    };
  } catch {
    return { roles: [], users: [] };
  }
}

export async function getCurrentUser(): Promise<AdminUser | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const savedId = window.localStorage.getItem(CURRENT_USER_KEY);
  if (!savedId) {
    return null;
  }

  try {
    const response = await fetch('/api/auth/me', {
      headers: buildAuthHeaders(),
    });
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.ok || !data.user) {
      return null;
    }

    const fullName = normalizeFullName(data.user.fullName, data.user.email);

    return {
      id: String(data.user.id),
      fullName,
      email: String(data.user.email),
      roleId: String(data.user.roleId),
      roleType: String(data.user.roleId) as PortalRoleId,
      directionId: data.user.directionId ?? undefined,
      directionNom: data.user.directionNom ?? undefined,
      divisionId: data.user.divisionId ?? undefined,
      divisionNom: data.user.divisionNom ?? undefined,
      serviceId: data.user.serviceId ?? undefined,
      serviceNom: data.user.serviceNom ?? undefined,
      permissions: Array.isArray(data.user.permissions) ? (data.user.permissions as PortalPermission[]) : [],
      status: String(data.user.status),
      passwordResetRequired: Boolean(data.user.passwordResetRequired),
    };
  } catch {
    return null;
  }
}

export function setCurrentUserId(userId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CURRENT_USER_KEY, userId);
}

export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CURRENT_USER_KEY);
}

export function buildAuthHeaders(contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const userId = getCurrentUserId();
  if (userId) {
    headers['x-current-user-id'] = userId;
  } else if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEV_USER_ID) {
    // Dev convenience: when no user is set in localStorage, allow a developer-provided
    // default user id via NEXT_PUBLIC_DEV_USER_ID for local testing only.
    // Set NEXT_PUBLIC_DEV_USER_ID in your .env.local to a valid portalUser.id (status='Actif').
    headers['x-current-user-id'] = String(process.env.NEXT_PUBLIC_DEV_USER_ID);
  }
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  return headers;
}

export function clearCurrentUser() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CURRENT_USER_KEY);
}

export async function hydrateCurrentUserFromServer(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    // Try to get user info from /api/auth/me using cookie-based session if available
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) return false;
    const data = await res.json();
    if (data?.ok && data.user && data.user.id) {
      setCurrentUserId(String(data.user.id));
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function resolveRoleType(user: AdminUser | null | undefined): PortalRoleId | null {
  if (!user) return null;
  if (user.roleType) return user.roleType;
  if (user.roleId === 'role-super-admin') return 'role-super-admin';
  if (user.roleId === 'role-secretariat-general') return 'role-secretariat-general';
  if (user.roleId === 'role-chef-direction') return 'role-chef-direction';
  if (user.roleId === 'role-chef-division') return 'role-chef-division';
  if (user.roleId === 'role-chef-bureau') return 'role-chef-bureau';
  if (user.roleId === 'role-rh') return 'role-rh';
  if (user.roleId === 'role-viewer') return 'role-viewer';
  return null;
}

export function hasPermission(user: AdminUser | null | undefined, permission: PortalPermission) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const roleType = resolveRoleType(user);
  if (roleType === 'role-secretariat-general') {
    return ['dashboard', 'agents', 'documents', 'reports', 'services', 'directions', 'functions', 'settings'].includes(permission);
  }
  if (roleType === 'role-chef-direction') {
    return ['dashboard', 'agents', 'documents', 'reports', 'services'].includes(permission);
  }
  if (roleType === 'role-chef-division') {
    return ['dashboard', 'agents', 'documents', 'reports', 'services'].includes(permission);
  }
  if (roleType === 'role-chef-bureau') {
    return ['dashboard', 'agents', 'documents', 'reports'].includes(permission);
  }
  if (roleType === 'role-rh') {
    return ['dashboard', 'agents', 'documents', 'reports', 'services'].includes(permission);
  }
  if (roleType === 'role-viewer') {
    return ['dashboard', 'reports'].includes(permission);
  }

  const permissions = user.permissions ?? [];
  return permissions.includes(permission);
}

export function isUserScopedToDirection(user: AdminUser | null | undefined) {
  return Boolean(user?.directionId);
}

export function isSuperAdmin(user: AdminUser | null | undefined) {
  return Boolean(user && user.roleId === 'role-super-admin');
}

export function isSecretariatGeneral(user: AdminUser | null | undefined) {
  return Boolean(user && resolveRoleType(user) === 'role-secretariat-general');
}

export function isChefDirection(user: AdminUser | null | undefined) {
  return Boolean(user && resolveRoleType(user) === 'role-chef-direction');
}

export function isChefDivision(user: AdminUser | null | undefined) {
  return Boolean(user && resolveRoleType(user) === 'role-chef-division');
}

export function isChefBureau(user: AdminUser | null | undefined) {
  return Boolean(user && resolveRoleType(user) === 'role-chef-bureau');
}

export function canManageAgent(
  user: AdminUser | null | undefined,
  agent?: {
    directionId?: string;
    directionNom?: string;
    divisionId?: string;
    divisionNom?: string;
    serviceId?: string;
    service?: string;
    serviceNom?: string;
  }
) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const roleType = resolveRoleType(user);

  if (!user.directionId) return true;

  if (agent?.directionId && agent.directionId !== user.directionId) {
    if (!agent.directionNom || !user.directionNom || agent.directionNom !== user.directionNom) {
      return false;
    }
  }

  if (roleType === 'role-chef-division') {
    if (!user.divisionId) return true;

    return Boolean(
      (agent?.divisionId && agent.divisionId === user.divisionId) ||
      (agent?.divisionNom && user.divisionNom && agent.divisionNom === user.divisionNom)
    );
  }

  if (roleType === 'role-chef-bureau') {
    if (!user.serviceId) return true;

    return Boolean(
      (agent?.serviceId && agent.serviceId === user.serviceId) ||
      (agent?.service && user.serviceNom && agent.service === user.serviceNom)
    );
  }

  return true;
}

export function filterByUserDirection<T extends { directionId?: string }>(items: T[], user: AdminUser | null | undefined) {
  if (!user?.directionId) return items;
  return items.filter((item) => item.directionId === user.directionId);
}

export function filterAgentsByUserScope<T extends {
  directionId?: string;
  directionNom?: string;
  divisionId?: string;
  divisionNom?: string;
  serviceId?: string;
  service?: string;
  serviceNom?: string;
}>(items: T[], user: AdminUser | null | undefined) {
  if (!user) return items;
  if (user.roleId === 'role-super-admin' || user.roleId === 'role-admin') return items;
  if (!user.directionId) return items;

  return items.filter((item) => canManageAgent(user, item));
}

function normalizeFullName(value: unknown, fallback?: unknown): string {
  const raw = String(value ?? fallback ?? '').trim();
  const cleaned = raw.replace(/undefined/gi, '').replace(/\s+/g, ' ').trim();
  if (cleaned) return cleaned;
  const fallbackValue = String(fallback ?? 'Utilisateur').trim();
  return fallbackValue || 'Utilisateur';
}

export const routePermissions: Record<string, PortalPermission> = {
  '/': 'dashboard',
  '/agents': 'agents',
  '/presence': 'agents',
  '/presence/journal': 'agents',
  '/agents/create': 'agents',
  '/divisions': 'directions',
  '/directions': 'directions',
  '/services': 'services',
  '/grade-stats': 'functions',
  '/fonctions': 'functions',
  '/documents': 'documents',
  '/reports': 'reports',
  '/settings': 'settings',
  '/audit': 'settings',
  '/users': 'settings',
  '/users/create': 'settings',
  '/users/import': 'settings',
  '/agents/import': 'agents',
  '/workflows': 'settings',
};

export function canAccessPath(pathname: string, user: AdminUser | null | undefined) {
  const normalized = pathname === '/' ? '/' : pathname.split('?')[0].split('#')[0];
  const permission = routePermissions[normalized];
  if (!permission) return true;
  if ((normalized === '/directions' || normalized === '/divisions') && !isSuperAdmin(user)) {
    return false;
  }
  return hasPermission(user, permission);
}
