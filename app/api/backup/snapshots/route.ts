import { NextRequest, NextResponse } from 'next/server';
import {
  createSnapshot,
  listSnapshots,
  restoreSnapshot,
} from '@/lib/server-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshots = await listSnapshots();
    return NextResponse.json({ ok: true, snapshots });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Failed to list snapshots';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: 'create' | 'restore';
      label?: string;
      snapshotId?: string;
    };

    if (body.action === 'restore') {
      if (!body.snapshotId) {
        return NextResponse.json(
          { ok: false, error: 'Snapshot ID is required.' },
          { status: 400 }
        );
      }
      const res = await restoreSnapshot(body.snapshotId);
      if (!res.ok) {
        return NextResponse.json(res, { status: 404 });
      }
      return NextResponse.json(res);
    }

    const { snapshot, snapshots } = await createSnapshot(body.label);
    return NextResponse.json({ ok: true, snapshot, snapshots });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Snapshot operation failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
