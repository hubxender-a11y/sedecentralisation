import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/dataStore';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const index = dbStore.directions.findIndex((d) => d.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Division non trouvée' }, { status: 404 });
    }

    dbStore.directions[index] = {
      ...dbStore.directions[index],
      ...body,
    };

    return NextResponse.json(dbStore.directions[index]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur mise à jour';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  dbStore.directions = dbStore.directions.filter((d) => d.id !== id);
  return NextResponse.json({ success: true });
}
