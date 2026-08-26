import { NextResponse } from 'next/server';
import { getAllDocuments } from '@/lib/dbService';

export async function GET() {
  const documents = await getAllDocuments();
  return NextResponse.json(documents);
}
