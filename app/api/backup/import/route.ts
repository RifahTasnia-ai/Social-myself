import { NextRequest, NextResponse } from 'next/server';
import { importBackupJson } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await importBackupJson(body);
    if (!res.ok) {
      return NextResponse.json(res, { status: 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Failed to import backup JSON';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
