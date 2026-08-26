import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerUser } from '@/lib/serverAuth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser(req);
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    // Determine whether to include all group conversations (super-admin) or only user's direction
    const includeAllGroups = (user.permissions ?? []).includes('super-admin') || String(user.roleId) === 'super-admin';

    const whereAny: any[] = [];
    whereAny.push({ senderId: user.id });
    whereAny.push({ recipientId: user.id });
    if (includeAllGroups) {
      whereAny.push({ isGroup: true });
    } else if (user.directionId) {
      whereAny.push({ isGroup: true, groupId: user.directionId });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { OR: whereAny },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // aggregate into conversations
    const map = new Map<string, any>();

    const dmUserIds = new Set<string>();
    const groupIds = new Set<string>();

    for (const m of messages) {
      const isGroup = Boolean(m.isGroup);
      let key: string;
      let title = '';

      if (isGroup) {
        key = `group:${m.groupId ?? 'unknown'}`;
        title = String(m.groupId ?? 'Groupe');
        if (m.groupId) groupIds.add(String(m.groupId));
      } else {
        const other = m.senderId === user.id ? m.recipientId : m.senderId;
        key = `dm:${other ?? 'unknown'}`;
        title = String(other ?? 'Conversation');
        if (other) dmUserIds.add(String(other));
      }

      const existing = map.get(key);

      // unread logic: if readBy does not include user.id and message is addressed to user (for dm) or group message
      let readBy: string[] = [];
      try {
        if (m.readBy) {
          const parsed = JSON.parse(m.readBy as any);
          if (Array.isArray(parsed)) readBy = parsed.map(String);
        }
      } catch {}

      const isUnread = (() => {
        if (isGroup) {
          // if user hasn't read this message
          return !readBy.includes(user.id);
        }
        // dm: unread only if recipient is the user and not read
        if (m.recipientId === user.id) return !readBy.includes(user.id);
        return false;
      })();

      if (!existing) {
        map.set(key, {
          id: isGroup ? String(m.groupId) : String(key.replace(/^dm:/, '').replace(/^group:/, '')),
          key,
          title,
          isGroup,
          lastMessage: m.content ?? (m.attachmentName ?? null),
          lastSenderName: m.senderName ?? null,
          lastAt: m.createdAt,
          unread: isUnread ? 1 : 0,
        });
      } else {
        // increment unread if this message is unread and newer than stored (we iterate desc so first is newest)
        existing.unread = existing.unread + (isUnread ? 1 : 0);
      }
    }

    // enrich titles: fetch user names and direction names
    const dmIds = Array.from(dmUserIds);
    const grpIds = Array.from(groupIds);

    const usersById: Record<string, string> = {};
    if (dmIds.length > 0) {
      const users = await prisma.portalUser.findMany({ where: { id: { in: dmIds } }, select: { id: true, fullName: true, email: true } });
      for (const u of users) usersById[u.id] = u.fullName ?? u.email ?? u.id;
    }

    const dirsById: Record<string, string> = {};
    if (grpIds.length > 0) {
      const dirs = await prisma.direction.findMany({ where: { id: { in: grpIds } }, select: { id: true, nom: true } });
      for (const d of dirs) dirsById[d.id] = d.nom ?? d.id;
    }

    for (const [key, conv] of map.entries()) {
      if (conv.isGroup) {
        conv.title = dirsById[String(conv.id)] ?? conv.title;
      } else {
        conv.title = usersById[String(conv.id)] ?? conv.title;
      }
    }

    const items = Array.from(map.values()).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error('chat/conversations GET error', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
