import prisma from './prisma';

export interface ServerPortalUser {
  id: string;
  fullName: string;
  email?: string;
  directionId?: string;
  directionNom?: string;
  divisionId?: string;
  divisionNom?: string;
  serviceId?: string;
  serviceNom?: string;
  roleId: string;
  permissions: string[];
  status: string;
}

function parsePermissions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function sanitizeFullName(value: unknown, fallback?: unknown): string {
  const raw = String(value ?? fallback ?? '').trim();
  const cleaned = raw.replace(/undefined/gi, '').replace(/\s+/g, ' ').trim();
  if (cleaned) return cleaned;
  const fallbackValue = String(fallback ?? 'Utilisateur').trim();
  return fallbackValue || 'Utilisateur';
}

export async function getServerUser(req: Request): Promise<ServerPortalUser | null> {
  // Prefer explicit header (used by client buildAuthHeaders), but also accept a cookie
  // named 'kana-current-user-id' for browser cookie-based hydration during dev/testing.
  let userId = req.headers.get('x-current-user-id') || undefined;

  if (!userId) {
    try {
      const cookieHeader = req.headers.get('cookie') ?? '';
      const match = cookieHeader.match(/(?:^|; )kana-current-user-id=([^;]+)/);
      if (match) userId = decodeURIComponent(match[1]);
    } catch (e) {
      // ignore cookie parse errors
    }
  }

  if (!userId) return null;

  const user = await prisma.portalUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      directionId: true,
      directionNom: true,
      divisionId: true,
      divisionNom: true,
      serviceId: true,
      serviceNom: true,
      roleId: true,
      permissions: true,
      status: true,
    },
  });

  if (!user || String(user.status) !== 'Actif') {
    return null;
  }

  return {
    id: String(user.id),
    fullName: sanitizeFullName(user.fullName, user.email),
    email: typeof (user as any).email === 'string' ? String((user as any).email) : undefined,
    directionId: user.directionId ?? undefined,
    directionNom: user.directionNom ?? undefined,
    divisionId: user.divisionId ?? undefined,
    divisionNom: user.divisionNom ?? undefined,
    serviceId: user.serviceId ?? undefined,
    serviceNom: user.serviceNom ?? undefined,
    roleId: String(user.roleId ?? ''),
    permissions: parsePermissions(user.permissions),
    status: String(user.status),
  };
}

export function isDirectionScopedUser(user: ServerPortalUser | null | undefined) {
  return Boolean(user?.directionId);
}

export function canManageAgent(
  user: ServerPortalUser | null | undefined,
  agent?: { directionId?: string; directionNom?: string; serviceId?: string; service?: string; serviceNom?: string }
) {
  if (!user) return false;
  if (['role-super-admin', 'role-admin'].includes(String(user.roleId))) return true;
  if (!user.directionId) return true;

  if (agent?.directionId && agent.directionId !== user.directionId) {
    if (!agent.directionNom || !user.directionNom || agent.directionNom !== user.directionNom) {
      return false;
    }
  }

  if (String(user.roleId) === 'role-chef-bureau') {
    if (!user.serviceId) return true;

    return Boolean(
      (agent?.serviceId && agent.serviceId === user.serviceId) ||
      (agent?.service && user.serviceNom && agent.service === user.serviceNom)
    );
  }

  return true;
}
