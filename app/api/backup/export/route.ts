import { NextResponse } from 'next/server';
import { loadServerWorkspace } from '@/lib/server-db';
import { createBackupEnvelope } from '@/lib/backup-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { state } = await loadServerWorkspace(false);
    const envelope = createBackupEnvelope(state);
    const dateSlug = new Date().toISOString().slice(0, 10);
    const filename = `kotonoha-backup-${dateSlug}.json`;

    return new NextResponse(JSON.stringify(envelope, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Failed to export workspace backup';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
