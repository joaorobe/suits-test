import { NextResponse } from 'next/server';
import { api, readBody } from '../../../lib/api';
import { reserve } from '../../../lib/rentals';

export const POST = api('admin', async request => NextResponse.json(await reserve(await readBody(request)), { status: 201 }));
