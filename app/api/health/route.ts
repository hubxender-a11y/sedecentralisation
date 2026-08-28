import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: 'connected' }, { status: 200 });
  } catch (error) {
    console.error('Health check database failed:', error);
    return NextResponse.json({ ok: false, database: 'unavailable' }, { status: 503 });
  }
}
