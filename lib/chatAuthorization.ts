import prisma from '@/lib/prisma';
import type { ServerPortalUser } from '@/lib/serverAuth';

export async function canAccessChatConversation(
  user: ServerPortalUser,
  conversationType: 'dm' | 'group',
  conversationId: string,
) {
  if (!conversationId.trim()) return false;
  if (user.roleId === 'role-super-admin' || user.roleId === 'role-admin') return true;

  if (conversationType === 'dm') {
    const recipient = await prisma.portalUser.findUnique({
      where: { id: conversationId },
      select: { id: true, status: true },
    });
    return Boolean(recipient && recipient.status === 'Actif');
  }

  return Boolean(user.directionId && user.directionId === conversationId);
}

export async function canAccessChatMessage(user: ServerPortalUser, message: {
  senderId: string;
  recipientId: string | null;
  isGroup: boolean;
  groupId: string | null;
}) {
  if (message.isGroup) {
    return await canAccessChatConversation(user, 'group', message.groupId || '');
  }

  return message.senderId === user.id || message.recipientId === user.id;
}
