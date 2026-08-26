import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({ ok: false, message: 'Changement de mot de passe désactivé.' }, { status: 404 });
}
