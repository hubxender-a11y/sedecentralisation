import prisma from '@/lib/prisma';
import { hashPassword, migratePlaintextPasswords } from '@/lib/password';
import { DEFAULT_PORTAL_ROLES } from '@/lib/portalRoles';

export type PortalPermission = 'dashboard' | 'agents' | 'documents' | 'reports' | 'services' | 'directions' | 'functions' | 'settings';

interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: PortalPermission[];
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  password?: string;
  roleId: string;
  directionId?: string;
  permissions: PortalPermission[];
  status: 'Actif' | 'Inactif';
  passwordResetRequired?: boolean;
}

const defaultUsers: AdminUser[] = [
  {
    id: 'user-admin',
    fullName: 'Admin Kna+',
    email: 'admin@kna.local',
    password: 'admin123',
    roleId: 'role-super-admin',
    permissions: ['dashboard', 'agents', 'documents', 'reports', 'services', 'directions', 'functions', 'settings'],
    status: 'Actif',
    passwordResetRequired: true,
  },
];

const COMM_DIRECTION_ID = 'dir-communication';
const COMM_DIRECTION_NAME = 'Direction de la Communication';

async function ensureTables() {
  // Tables are created by Prisma during deployment (`prisma db push`).
}

function serializePermissions(permissions: PortalPermission[]) {
  return JSON.stringify(permissions);
}

async function ensureDefaultRoles() {
  const existingRoles = await prisma.portalRole.findMany({ select: { id: true } });
  const existingRoleIds = new Set(existingRoles.map((row) => row.id));

  for (const role of DEFAULT_PORTAL_ROLES) {
    if (!existingRoleIds.has(role.id)) {
      await prisma.portalRole.create({
        data: {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: serializePermissions(role.permissions),
        },
      });
    }
  }
}

async function ensureDefaultUsers() {
  const existingUsers = await prisma.portalUser.findMany({ select: { id: true, email: true } });
  const existingEmails = new Set(existingUsers.map((user) => String(user.email).toLowerCase()));
  const existingUserIds = new Set(existingUsers.map((user) => String(user.id)));

  for (const user of defaultUsers) {
    if (!existingUserIds.has(user.id) && !existingEmails.has(user.email.toLowerCase())) {
      await prisma.portalUser.create({
        data: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          password: hashPassword(user.password ?? 'changeme'),
          roleId: user.roleId,
          directionId: null,
          permissions: serializePermissions(user.permissions),
          status: user.status,
          password_reset_required: true,
        },
      });
    }
  }
}

async function ensureCommunicationDirection() {
  const existing = await prisma.direction.findFirst({ where: { nom: COMM_DIRECTION_NAME } });
  if (!existing) {
    await prisma.direction.create({
      data: {
        id: COMM_DIRECTION_ID,
        nom: COMM_DIRECTION_NAME,
        description: 'Direction de la Communication',
        statut: 'ACTIF',
      },
    });
  }
}

async function ensureAdminsPerDirection() {
  const existing = await prisma.portalUser.findMany({ select: { email: true } });
  const existingEmails = new Set(existing.map((r) => String(r.email).toLowerCase()));

  const directions = await prisma.direction.findMany({ select: { id: true, nom: true } });
  for (const dir of directions || []) {
    const dirId = String(dir.id);
    const email = `admin+${dirId}@kna.local`;
    if (!existingEmails.has(email.toLowerCase())) {
      const fullName = `Admin ${dir.nom ?? dirId}`;
      await prisma.portalUser.create({
        data: {
          id: `user-admin-${dirId}`,
          fullName,
          email,
          password: hashPassword('changeme'),
          roleId: 'role-admin',
          directionId: dirId,
          permissions: serializePermissions(['dashboard', 'agents', 'documents', 'reports', 'services', 'directions', 'functions', 'settings']),
          status: 'Actif',
          password_reset_required: true,
        },
      });
    }
  }
}

async function seedIfEmpty() {
  await ensureCommunicationDirection();
  await ensureDefaultRoles();
  await ensureDefaultUsers();
  await ensureAdminsPerDirection();
}

export async function seedAdminState() {
  await ensureTables();
  await migratePlaintextPasswords();
  await seedIfEmpty();
}
