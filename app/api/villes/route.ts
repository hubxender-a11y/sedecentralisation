import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/dataStore';

export async function GET() {
  return NextResponse.json(dbStore.villes);
}
