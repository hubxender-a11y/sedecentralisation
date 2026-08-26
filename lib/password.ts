import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import prisma from './prisma';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  if (!/^[0-9a-f]+$/.test(salt) || !/^[0-9a-f]+$/.test(key)) return false;

  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
}

export function isPasswordHash(value: string) {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  return /^[0-9a-f]{32}$/.test(salt) && /^[0-9a-f]{128}$/.test(key);
}

export async function migratePlaintextPasswords() {
  const users = await prisma.portalUser.findMany({ select: { id: true, password: true } });
  for (const user of users || []) {
    const currentPassword = String(user.password || '');
    if (!isPasswordHash(currentPassword)) {
      const hashed = hashPassword(currentPassword);
      await prisma.portalUser.update({
        where: { id: user.id },
        data: { password: hashed },
      });
    }
  }
}
