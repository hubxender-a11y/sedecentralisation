import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { downloadChatAttachment } from '@/lib/supabaseAdmin';
import { getServerUser } from '@/lib/serverAuth';
import { canAccessChatMessage } from '@/lib/chatAuthorization';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storagePath = request.nextUrl.searchParams.get('path')?.trim() || '';
    if (!storagePath || storagePath.includes('..')) {
      return NextResponse.json({ error: 'Chemin de pièce jointe invalide' }, { status: 400 });
    }

    const message = await prisma.chatMessage.findFirst({ where: { attachmentUrl: { contains: storagePath } } });
    if (!message) return NextResponse.json({ error: 'Pièce jointe introuvable' }, { status: 404 });

    if (!await canAccessChatMessage(user, message)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const file = await downloadChatAttachment(storagePath);
    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': message.attachmentType || 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    console.error('GET /api/chat/download failed:', error);
    return NextResponse.json({ error: 'Pièce jointe introuvable' }, { status: 404 });
  }
}
