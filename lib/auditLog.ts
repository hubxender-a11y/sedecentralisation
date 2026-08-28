import prisma from '@/lib/prisma';

type AuditLogInput = {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  result?: 'SUCCESS' | 'FAILURE';
};

function serializeValue(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

export function getRequestIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || null;
}

export async function writeAuditLog(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValue: serializeValue(input.oldValue),
        newValue: serializeValue(input.newValue),
        ipAddress: input.ipAddress ?? null,
        result: input.result ?? 'SUCCESS',
      },
    });
  } catch (error) {
    console.error('Audit log write failed', error);
  }
}