import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { DocumentRecord } from '@/lib/dataStore';
import { createDocumentRecord, getAgentById } from '@/lib/dbService';
import { ensureAgentUploadDir, normalizeFileName, getAgentDocumentUrl } from '@/lib/documentStorage';
import { getServerUser } from '@/lib/serverAuth';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const agentId = formData.get('agentId') as string | null;

    if (!file || !agentId) {
      return NextResponse.json(
        { error: 'Fichier et agentId requis' },
        { status: 400 }
      );
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    }

    const agentFullName = `${agent.nom} ${agent.postNom || ''} ${agent.prenom}`.trim();
    // Prefer division/service name over direction for storage organization
    const divisionName = agent.service || agent.serviceId || agent.directionNom || agent.directionId || 'unknown';
    const { directory } = ensureAgentUploadDir(divisionName, agentId, agentFullName);
    const safeName = normalizeFileName(file.name);
    const filename = `${Date.now()}-${safeName}`;
    const destination = path.join(directory, filename);

    const arrayBuffer = await file.arrayBuffer();
    await fs.promises.writeFile(destination, Buffer.from(arrayBuffer));

    const divisionForUrl = agent.service || agent.serviceId || agent.directionNom || agent.directionId || 'unknown';
    const url = getAgentDocumentUrl(divisionForUrl, agentId, filename, agentFullName);

    const newDoc: DocumentRecord = {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      agentId,
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type || 'application/pdf',
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

    return NextResponse.json(savedDoc, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur téléversement document';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
