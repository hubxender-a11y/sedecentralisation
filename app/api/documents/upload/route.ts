import { NextRequest, NextResponse } from 'next/server';
import { DocumentRecord } from '@/lib/dataStore';
import { createDocumentRecord, getAgentById } from '@/lib/dbService';
import { normalizeFileName } from '@/lib/documentStorage';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';
import { ensureAgentDocumentsBucket, uploadAgentDocument } from '@/lib/supabaseAdmin';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export async function POST(req: NextRequest) {
  try {
    const serverUser = await getServerUser(req);
    if (!serverUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const agentId = formData.get('agentId') as string | null;

    if (!file || !agentId) {
      return NextResponse.json(
        { error: 'Fichier et agentId requis' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE) {
      return NextResponse.json({ error: 'Le fichier doit avoir une taille comprise entre 1 octet et 20 MB.' }, { status: 400 });
    }

    const contentType = file.type || 'application/octet-stream';
    if (!ALLOWED_DOCUMENT_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Type de document non autorisé.' }, { status: 400 });
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    }
    if (!canManageAgent(serverUser, agent)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const agentFullName = `${agent.nom} ${agent.postNom || ''} ${agent.prenom}`.trim();
    const safeName = normalizeFileName(file.name);
    const filename = `${Date.now()}-${safeName}`;
    const arrayBuffer = await file.arrayBuffer();
    const storagePath = `${agentId}/${filename}`;
    await ensureAgentDocumentsBucket();
    await uploadAgentDocument(storagePath, arrayBuffer, contentType);
    const url = `/api/documents/download?path=${encodeURIComponent(storagePath)}`;

    const newDoc: DocumentRecord = {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      agentId,
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: contentType,
      url,
      uploadedAt: new Date().toISOString(),
    };

    const savedDoc = await createDocumentRecord({
      id: newDoc.id,
      agentId: newDoc.agentId,
      name: newDoc.name,
      size: newDoc.size,
      type: newDoc.type,
      url: newDoc.url,
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'UPLOAD_DOCUMENT',
      entityType: 'DocumentRecord',
      entityId: savedDoc.id,
      newValue: { agentId, name: file.name, type: contentType, size: file.size },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(savedDoc, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur téléversement document';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
