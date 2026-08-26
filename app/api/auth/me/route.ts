import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  try {
    const serverUser = await getServerUser(request);
    if (!serverUser) {
      return NextResponse.json({ ok: false, message: 'Utilisateur non autorisé.' }, { status: 401 });
    }

    return NextResponse.json({ ok: true, user: serverUser });
  } catch (error) {
    console.error('Auth me failed', error);
    return NextResponse.json({ ok: false, message: 'Erreur serveur.' }, { status: 500 });
  }
}
