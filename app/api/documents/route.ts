import { NextResponse } from 'next/server';
import { getAllDocuments } from '@/lib/dbService';
import { getServerUser } from '@/lib/serverAuth';

export async function GET(request: Request) {
  const serverUser = await getServerUser(request);
  if (!serverUser) {
    return NextResponse.json({ ok: false, message: 'Utilisateur non autorisé.' }, { status: 401 });
  }

  const documents = await getAllDocuments();
  return NextResponse.json(documents);
}
