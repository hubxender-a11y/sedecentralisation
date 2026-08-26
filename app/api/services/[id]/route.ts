import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/dataStore';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = dbStore.services.find((s) => s.id === id);
  if (!service) {
    return NextResponse.json({ error: 'Bureau introuvable' }, { status: 404 });
  }
  return NextResponse.json(service);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const index = dbStore.services.findIndex((s) => s.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Bureau introuvable' }, { status: 404 });
    }

    const directionId = typeof body.directionId === 'string'
      ? body.directionId
      : typeof body.divisionId === 'string'
      ? body.divisionId
      : undefined;

    const direction = directionId
      ? dbStore.directions.find((d) => d.id === directionId)
      : null;

    const updated = {
      ...dbStore.services[index],
      ...body,
      directionId: directionId ?? dbStore.services[index].directionId,
      directionNom: direction ? direction.nom : dbStore.services[index].directionNom,
    };

    dbStore.services[index] = updated;
    dbStore.services = [...dbStore.services];

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur modification du bureau';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  dbStore.services = dbStore.services.filter((s) => s.id !== id);
  return NextResponse.json({ success: true });
}
