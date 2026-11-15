import { NextRequest, NextResponse } from 'next/server';
import { listSnapshots, migrateBrowserWorkspace } from '@/lib/server-db';
import type { WorkspaceState } from '@/lib/workspace-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      browserState?: Partial<WorkspaceState>;
    };
    const { state, meta, migrated } = await migrateBrowserWorkspace(
      body?.browserState
    );
    const snapshots = await listSnapshots();
    return NextResponse.json({ ok: true, state, meta, migrated, snapshots });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Failed to migrate workspace';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
