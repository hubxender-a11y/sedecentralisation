import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, isPasswordHash, migratePlaintextPasswords } from '@/lib/password';
import { getServerUser } from '@/lib/serverAuth';
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
  directionNom?: string;
  divisionId?: string;
  divisionNom?: string;
  serviceId?: string;
  serviceNom?: string;
  permissions: PortalPermission[];
  status: 'Actif' | 'Inactif';
  passwordResetRequired?: boolean;
}

interface AdminState {
  roles: AdminRole[];
  users: AdminUser[];
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
  {
    id: 'user-moisekana',
    fullName: 'Moisekana',
    email: 'moisekana@kna.local',
    password: 'changeme',
    roleId: 'role-admin',
    permissions: ['dashboard', 'agents', 'documents', 'reports', 'services', 'directions', 'functions', 'settings'],
    status: 'Actif',
    passwordResetRequired: true,
  },
];

function parsePermissions(raw: string | null): PortalPermission[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PortalPermission[]) : [];
  } catch {
    return [];
  }
}

function serializePermissions(permissions: PortalPermission[]): string {
  return JSON.stringify(permissions);
}

function parsePasswordResetRequired(raw: any) {
  if (raw === true || raw === 1 || raw === '1' || raw === 'true') return true;
  return false;
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
  const usersCount = await prisma.portalUser.count();
  if (usersCount > 0) return;

  for (const user of defaultUsers) {
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

const COMM_DIRECTION_ID = 'dir-communication';
const COMM_DIRECTION_NAME = 'Direction de la Communication';

async function ensureCommunicationDirection() {
  try {
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
  } catch (err) {
    console.error('ensureCommunicationDirection failed', err);
  }
}

async function seedIfEmpty() {
  await ensureCommunicationDirection();
  const rolesFound = await prisma.portalRole.count();
  const usersFound = await prisma.portalUser.count();
  await ensureDefaultRoles();
  await ensureDefaultUsers();
}

async function ensureOnlyRequiredUsers() {
  const allowedIds = new Set(defaultUsers.map((user) => user.id));
  const existingUsers = await prisma.portalUser.findMany({ select: { id: true } });
  for (const user of existingUsers) {
    if (allowedIds.has(String(user.id))) continue;
    await prisma.portalUser.delete({ where: { id: String(user.id) } });
  }

  for (const user of defaultUsers) {
    const existing = await prisma.portalUser.findUnique({ where: { id: user.id } });
    const storedPassword = existing?.password ?? hashPassword(user.password ?? 'changeme');
    const passwordResetRequired = existing ? parsePasswordResetRequired(existing.password_reset_required) : true;

    if (!existing) {
      await prisma.portalUser.create({
        data: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          password: storedPassword,
          roleId: user.roleId,
          directionId: null,
          permissions: serializePermissions(user.permissions),
          status: user.status,
          password_reset_required: passwordResetRequired,
        },
      });
      continue;
    }

    await prisma.portalUser.update({
      where: { id: user.id },
      data: {
        fullName: user.fullName,
        email: user.email,
        password: storedPassword,
        roleId: user.roleId,
        directionId: null,
        permissions: serializePermissions(user.permissions),
        status: user.status,
        password_reset_required: passwordResetRequired,
      },
    });
  }
}

async function getState(): Promise<AdminState> {
  await migratePlaintextPasswords();
  await seedIfEmpty();

  const rolesResult = await prisma.portalRole.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, description: true, permissions: true },
  });

  const usersResult = await prisma.$queryRaw<{
      id: string;
      fullName: string;
      email: string;
      roleId: string;
      directionId: string | null;
      directionNom: string | null;
      divisionId: string | null;
      divisionNom: string | null;
      serviceId: string | null;
      serviceNom: string | null;
      permissions: string;
      status: string;
      passwordResetRequired: string | number | boolean | null;
    }[]>`
      SELECT
        pu.id,
        pu.full_name as fullName,
        pu.email,
        pu.role_id as roleId,
        pu.direction_id as directionId,
        d.nom as directionNom,
        pu.division_id as divisionId,
        pu.division_nom as divisionNom,
        pu.service_id as serviceId,
        pu.service_nom as serviceNom,
        pu.permissions,
        pu.status,
        pu.password_reset_required as passwordResetRequired
      FROM portal_users pu
      LEFT JOIN directions d ON pu.direction_id = d.id
      ORDER BY pu.created_at ASC
    `;

  return {
    roles: rolesResult.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description || '',
      permissions: parsePermissions(role.permissions),
    })),
    users: usersResult.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId,
      directionId: user.directionId ?? undefined,
      directionNom: user.directionNom ?? undefined,
      divisionId: user.divisionId ?? undefined,
      divisionNom: user.divisionNom ?? undefined,
      serviceId: user.serviceId ?? undefined,
      serviceNom: user.serviceNom ?? undefined,
      permissions: parsePermissions(user.permissions),
      status: user.status === 'Inactif' ? 'Inactif' : 'Actif',
      passwordResetRequired: parsePasswordResetRequired(user.passwordResetRequired),
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const serverUser = await getServerUser(request);
    if (!serverUser) {
      return NextResponse.json({ ok: false, message: 'Utilisateur non autorisé.' }, { status: 401 });
    }

    const state = await getState();

    if (serverUser.directionId) {
      return NextResponse.json({
        roles: state.roles,
        users: state.users.filter((user) => user.directionId === serverUser.directionId),
      });
    }

    return NextResponse.json(state);
  } catch (error) {
    console.error('Admin state fetch failed', error);
    return NextResponse.json({ roles: DEFAULT_PORTAL_ROLES, users: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const serverUser = await getServerUser(request);
    if (!serverUser) {
      return NextResponse.json({ ok: false, message: 'Utilisateur non autorisé.' }, { status: 401 });
    }
    if (!['role-super-admin', 'role-admin'].includes(serverUser.roleId)) {
      return NextResponse.json({ ok: false, message: 'Droits administrateur requis.' }, { status: 403 });
    }

    const payload = await request.json();
    const state = payload as AdminState;

    const existingUsers = await prisma.portalUser.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        directionId: true,
        divisionId: true,
        divisionNom: true,
        serviceId: true,
        serviceNom: true,
        permissions: true,
        status: true,
        password: true,
        password_reset_required: true,
      },
    });
    const existingPasswordMap = new Map<string, { password: string; resetRequired: boolean }>(
      existingUsers.map((user) => [
        String(user.id),
        {
          password: String(user.password || ''),
          resetRequired: parsePasswordResetRequired(user.password_reset_required),
        },
      ]),
    );

    const scopedSaveDirectionId = serverUser?.directionId;
    const incomingUsers = Array.isArray(state.users) ? state.users : [];

    const [allDirections, allDivisions, allServices] = await Promise.all([
      prisma.direction.findMany({ select: { id: true, nom: true } }),
      prisma.division.findMany({ select: { id: true, nom: true, directionId: true, directionNom: true } }),
      prisma.service.findMany({ select: { id: true, nom: true, directionId: true, directionNom: true, divisionId: true, divisionNom: true } }),
    ]);

    const directionMap = new Map(allDirections.map((direction) => [String(direction.id), direction]));
    const divisionMap = new Map(allDivisions.map((division) => [String(division.id), division]));
    const serviceMap = new Map(allServices.map((service) => [String(service.id), service]));

    const normalizeUserHierarchy = (user: AdminUser): AdminUser => {
      const nextUser: AdminUser = { ...user };

      if (nextUser.roleId === 'role-super-admin') {
        nextUser.directionId = undefined;
        nextUser.directionNom = undefined;
        nextUser.divisionId = undefined;
        nextUser.divisionNom = undefined;
        nextUser.serviceId = undefined;
        nextUser.serviceNom = undefined;
        return nextUser;
      }

      if (nextUser.directionId && !directionMap.has(String(nextUser.directionId))) {
        throw new Error(`La direction '${nextUser.directionId}' est introuvable.`);
      }

      if (nextUser.divisionId && !divisionMap.has(String(nextUser.divisionId))) {
        throw new Error(`La division '${nextUser.divisionId}' est introuvable.`);
      }

      if (nextUser.serviceId && !serviceMap.has(String(nextUser.serviceId))) {
        throw new Error(`Le bureau/service '${nextUser.serviceId}' est introuvable.`);
      }

      const division = nextUser.divisionId ? divisionMap.get(String(nextUser.divisionId)) : undefined;
      const service = nextUser.serviceId ? serviceMap.get(String(nextUser.serviceId)) : undefined;

      if (nextUser.directionId && division && division.directionId && division.directionId !== nextUser.directionId) {
        throw new Error(`La division '${division.nom}' n'appartient pas à la direction sélectionnée.`);
      }

      if (nextUser.directionId && service && service.directionId && service.directionId !== nextUser.directionId) {
        throw new Error(`Le bureau/service '${service.nom}' n'appartient pas à la direction sélectionnée.`);
      }

      if (nextUser.divisionId && service && service.divisionId && service.divisionId !== nextUser.divisionId) {
        throw new Error(`Le bureau/service '${service.nom}' n'appartient pas à la division sélectionnée.`);
      }

      if (!nextUser.directionId && division?.directionId) {
        nextUser.directionId = division.directionId;
      }

      if (!nextUser.directionId && service?.directionId) {
        nextUser.directionId = service.directionId;
      }

      if (!nextUser.divisionId && service?.divisionId) {
        nextUser.divisionId = service.divisionId;
      }

      if (!nextUser.directionNom && division?.directionNom) {
        nextUser.directionNom = division.directionNom;
      }

      if (!nextUser.directionNom && service?.directionNom) {
        nextUser.directionNom = service.directionNom;
      }

      if (!nextUser.divisionNom && division?.nom) {
        nextUser.divisionNom = division.nom;
      }

      if (!nextUser.serviceNom && service?.nom) {
        nextUser.serviceNom = service.nom;
      }

      if (nextUser.roleId === 'role-chef-direction' && !nextUser.directionId) {
        throw new Error("Le rôle 'Chef de direction' exige une direction valide.");
      }

      if (nextUser.roleId === 'role-chef-division' && !nextUser.divisionId) {
        throw new Error("Le rôle 'Chef de division' exige une division valide.");
      }

      if (nextUser.roleId === 'role-chef-bureau' && !nextUser.serviceId) {
        throw new Error("Le rôle 'Chef de bureau' exige un bureau/service valide.");
      }

      return nextUser;
    };

    if (scopedSaveDirectionId && incomingUsers.some((user) => user.directionId && user.directionId !== scopedSaveDirectionId)) {
      return NextResponse.json({ ok: false, message: 'Vous ne pouvez pas modifier des utilisateurs hors de votre direction.' }, { status: 403 });
    }

    if (serverUser.roleId !== 'role-super-admin' && incomingUsers.some((user) => user.roleId === 'role-super-admin')) {
      return NextResponse.json({ ok: false, message: 'Vous ne pouvez pas attribuer le rôle super-admin.' }, { status: 403 });
    }

    let usersToPersist: AdminUser[];
    try {
      usersToPersist = incomingUsers.map((user) => normalizeUserHierarchy({
        ...user,
        directionId: user.roleId === 'role-super-admin' ? undefined : scopedSaveDirectionId || user.directionId,
      }));
    } catch (error) {
      return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Données utilisateur incohérentes.' }, { status: 400 });
    }

    if (scopedSaveDirectionId) {
      const preservedUsers = existingUsers
        .filter((user) => String(user.directionId) !== scopedSaveDirectionId)
        .map((user) => ({
          id: String(user.id),
          fullName: user.fullName,
          email: user.email,
          roleId: user.roleId,
          directionId: user.directionId ?? undefined,
          divisionId: user.divisionId ?? undefined,
          divisionNom: user.divisionNom ?? undefined,
          serviceId: user.serviceId ?? undefined,
          serviceNom: user.serviceNom ?? undefined,
          permissions: parsePermissions(user.permissions),
          status: user.status === 'Inactif' ? 'Inactif' : 'Actif',
          passwordResetRequired: parsePasswordResetRequired(user.password_reset_required),
        })) as AdminUser[];

      usersToPersist = [...preservedUsers, ...usersToPersist];
    }

    const incomingUserIds = new Set(usersToPersist.map((user) => String(user.id)));
    const rolesToPersist = Array.isArray(state.roles) && state.roles.length > 0 ? state.roles : DEFAULT_PORTAL_ROLES;

    await prisma.$transaction(async (transaction) => {
      for (const role of rolesToPersist) {
        await transaction.portalRole.upsert({
          where: { id: role.id },
          create: {
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: serializePermissions(role.permissions),
          },
          update: {
            name: role.name,
            description: role.description,
            permissions: serializePermissions(role.permissions),
          },
        });
      }

      await transaction.portalUser.updateMany({
        where: {
          ...(scopedSaveDirectionId ? { directionId: scopedSaveDirectionId } : {}),
          id: { notIn: Array.from(incomingUserIds) },
        },
        data: { status: 'Inactif' },
      });

      for (const user of usersToPersist) {
      const hasPlainPassword = Boolean(user.password?.trim());
      const passwordValue = user.password?.trim();
      let storedPassword: string;
      let resetRequired: boolean;

      if (hasPlainPassword) {
        storedPassword = isPasswordHash(passwordValue!) ? passwordValue! : hashPassword(passwordValue!);
        resetRequired = passwordValue === 'changeme' ? true : Boolean(user.passwordResetRequired);
      } else if (existingPasswordMap.has(user.id)) {
        const existing = existingPasswordMap.get(user.id)!;
        storedPassword = existing.password;
        resetRequired = existing.resetRequired;
      } else {
        storedPassword = hashPassword('changeme');
        resetRequired = true;
      }

        await transaction.portalUser.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            password: storedPassword,
            roleId: user.roleId,
            directionId: user.directionId ?? null,
            divisionId: user.divisionId ?? null,
            divisionNom: user.divisionNom ?? null,
            serviceId: user.serviceId ?? null,
            serviceNom: user.serviceNom ?? null,
            permissions: serializePermissions(user.permissions),
            status: user.status,
            password_reset_required: resetRequired,
          },
          update: {
            fullName: user.fullName,
            email: user.email,
            password: storedPassword,
            roleId: user.roleId,
            directionId: user.directionId ?? null,
            divisionId: user.divisionId ?? null,
            divisionNom: user.divisionNom ?? null,
            serviceId: user.serviceId ?? null,
            serviceNom: user.serviceNom ?? null,
            permissions: serializePermissions(user.permissions),
            status: user.status,
            password_reset_required: resetRequired,
          },
        });
      }
    }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin state save failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
