import { NextRequest, NextResponse } from 'next/server';
import {
  listSnapshots,
  loadServerWorkspace,
  saveServerWorkspace,
} from '@/lib/server-db';
import type { WorkspaceState } from '@/lib/workspace-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const reconnect = req.nextUrl.searchParams.get('reconnect') === '1';
    const [{ state, meta }, snapshots] = await Promise.all([
      loadServerWorkspace(reconnect),
      listSnapshots(),
    ]);
    return NextResponse.json({ ok: true, state, meta, snapshots });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load workspace';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      state?: Partial<WorkspaceState>;
      customModified?: boolean;
    };
    const payload = body?.state ?? (body as Partial<WorkspaceState>);
    const { state, meta } = await saveServerWorkspace(
      payload,
      body?.customModified
    );
    return NextResponse.json({ ok: true, state, meta });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save workspace';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
