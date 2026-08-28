import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Utilisateur non autorisé.' }, { status: 401 });
    }
    if (user.roleId !== 'role-super-admin') {
      return NextResponse.json({ ok: false, message: 'Droits super-administrateur requis.' }, { status: 403 });
    }

    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('pageSize') || 25)));
    const action = request.nextUrl.searchParams.get('action')?.trim() || undefined;
    const userId = request.nextUrl.searchParams.get('userId')?.trim() || undefined;

    const where = {
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('Audit log fetch failed', error);
    return NextResponse.json({ ok: false, message: 'Journal d audit indisponible.' }, { status: 500 });
  }
}