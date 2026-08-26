import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerUser } from '@/lib/serverAuth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser(req);
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const url = req.nextUrl;
    const conversationType = url.searchParams.get('type') ?? 'dm'; // 'dm' or 'group'
    const conversationId = url.searchParams.get('id') ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '50');

    const where: any = {};
    if (conversationType === 'group') {
      where.isGroup = true;
      where.groupId = conversationId;
    } else {
      // dm: messages where (senderId = me and recipientId = conversationId) OR (senderId = conversationId and recipientId = me)
      where.OR = [
        { senderId: user.id, recipientId: conversationId },
        { senderId: conversationId, recipientId: user.id },
      ];
    }

    const total = await prisma.chatMessage.count({ where });
    const messages = await prisma.chatMessage.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * pageSize, take: pageSize });

    return NextResponse.json({ ok: true, items: messages, total, page, pageSize });
  } catch (e) {
    console.error('chat/messages GET error', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser(req);
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { content, isGroup, groupId, recipientId, attachmentUrl, attachmentName, attachmentSize, attachmentType } = body;

    // validate input
    const dev = process.env.NODE_ENV !== 'production';
    if (dev) console.debug('chat/messages POST body', body);

    const sendingToGroup = Boolean(isGroup);
    if (sendingToGroup) {
      if (!groupId) {
        return NextResponse.json({ ok: false, error: 'Missing groupId for group message' }, { status: 400 });
      }
    } else {
      if (!recipientId) {
        return NextResponse.json({ ok: false, error: 'Missing recipientId for direct message' }, { status: 400 });
      }
    }

    if (!content && !attachmentUrl) {
      return NextResponse.json({ ok: false, error: 'Message vide: fournissez du texte ou une pièce jointe' }, { status: 400 });
    }

    const attachmentSizeInt = attachmentSize != null ? Number(attachmentSize) : null;

    const message = await prisma.chatMessage.create({
      data: {
        senderId: user.id,
        senderName: user.fullName,
        content: content ?? null,
        isGroup: sendingToGroup,
        groupId: groupId ?? null,
        recipientId: recipientId ?? null,
        attachmentUrl: attachmentUrl ?? null,
        attachmentName: attachmentName ?? null,
        attachmentSize: attachmentSizeInt ?? null,
        attachmentType: attachmentType ?? null,
      },
    });

    try {
      // notify socket server so connected clients receive the new message in real time
      await fetch(process.env.SOCKET_SERVER_URL || 'http://localhost:4001/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'chat:message',
          data: message,
          room: message.isGroup ? `group:${message.groupId}` : (`dm:${message.recipientId ?? message.senderId}`),
        }),
      });
    } catch (e) {
      console.warn('Socket emit failed', e);
    }

    return NextResponse.json({ ok: true, item: message });
  } catch (e: any) {
    console.error('chat/messages POST error', e);
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({ ok: false, error: isDev ? (e?.message ?? 'Server error') : 'Server error', detail: isDev ? e?.stack : undefined }, { status: 500 });
  }
}
