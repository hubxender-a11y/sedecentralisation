import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser(req);
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, id } = body; // type: 'dm' | 'group', id: conversation id
    if (!type || !id) return NextResponse.json({ ok: false, error: 'Missing parameters' }, { status: 400 });

    let where: any = {};
    if (type === 'group') {
      where = { isGroup: true, groupId: String(id) };
    } else {
      // dm: mark messages where recipientId = user.id and senderId = other
      where = { recipientId: user.id, senderId: String(id) };
    }

    // find messages that are not yet read by this user
    const toUpdate = await prisma.chatMessage.findMany({ where: { AND: [where, { OR: [{ readBy: null }, { readBy: { not: { contains: user.id } } }] }] } });

    let updated = 0;
    for (const m of toUpdate) {
      let readBy: string[] = [];
      try {
        if (m.readBy) {
          const parsed = JSON.parse(m.readBy as any);
          if (Array.isArray(parsed)) readBy = parsed.map(String);
        }
      } catch {}

      if (!readBy.includes(user.id)) {
        readBy.push(user.id);
        await prisma.chatMessage.update({ where: { id: m.id }, data: { readBy: JSON.stringify(readBy) } });
        updated++;
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    console.error('chat/messages/mark-read error', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
