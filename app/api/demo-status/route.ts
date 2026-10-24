import { NextResponse } from 'next/server';

export function GET() {
  if (process.env.NODE_ENV !== 'development' || process.env.SUITS_DEMO !== '1') {
    return NextResponse.json({ message: 'Não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ demo: true, instance: process.env.SUITS_DEMO_INSTANCE }, { headers: { 'Cache-Control': 'no-store' } });
}
