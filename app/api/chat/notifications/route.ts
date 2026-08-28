import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser(req);
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const url = req.nextUrl;
    const since = url.searchParams.get('since');

    const where: any = { recipientId: user.id };
    if (since) {
      where.createdAt = { gt: new Date(since) };
    }

    const items = await prisma.chatMessage.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error('chat/notifications GET error', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
