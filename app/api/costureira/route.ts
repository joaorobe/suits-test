import { NextResponse } from 'next/server';
import { api } from '../../../lib/api';
export const GET = api(["admin", "costureira"], async () => NextResponse.json({ message: 'Use /api/tailor-orders.' }, { status: 410 }));
export const PATCH = api(["admin", "costureira"], async () => NextResponse.json({ message: 'Use /api/tailor-orders.' }, { status: 410 }));
