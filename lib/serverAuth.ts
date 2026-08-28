import prisma from './prisma';
import { createHmac, timingSafeEqual } from 'node:crypto';

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

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
  if (!secret) throw new Error('AUTH_SESSION_SECRET is not configured');
  return secret;
}

export function createSessionToken(userId: string) {
  const signature = createHmac('sha256', getSessionSecret()).update(userId).digest('base64url');
  return `${userId}.${signature}`;
}

function verifySessionToken(token: string) {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const userId = token.slice(0, separator);
  const receivedSignature = token.slice(separator + 1);
  const expectedSignature = createHmac('sha256', getSessionSecret()).update(userId).digest('base64url');
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  return userId;
}

export async function getServerUser(req: Request): Promise<ServerPortalUser | null> {
  let userId: string | undefined;
  const cookieHeader = req.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/(?:^|; )kana-current-user-id=([^;]+)/);

  if (match) {
    try {
      userId = verifySessionToken(decodeURIComponent(match[1])) ?? undefined;
    } catch {
      userId = undefined;
    }
  }

  if (!userId && process.env.NODE_ENV !== 'production') {
    userId = req.headers.get('x-current-user-id') || undefined;
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
