import { NextRequest, NextResponse } from 'next/server';
import { getAgentById } from '@/lib/dbService';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';
import { downloadAgentDocument } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser(request);
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const storagePath = request.nextUrl.searchParams.get('path')?.trim() || '';
    const agentId = storagePath.split('/')[0] || '';
    if (!agentId || storagePath.includes('..') || !storagePath.startsWith(`${agentId}/`)) {
      return NextResponse.json({ error: 'Chemin de document invalide' }, { status: 400 });
    }

    const agent = await getAgentById(agentId);
    if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    if (!canManageAgent(user, agent)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const file = await downloadAgentDocument(storagePath);
    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline',
        'X-Storage-Bucket': 'agent-documents',
      },
    });
  } catch (error) {
    console.error('GET /api/documents/download failed:', error);
    return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
  }
}