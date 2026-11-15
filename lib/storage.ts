import {
  createInitialWorkspaceState,
  normalizeWorkspaceState,
  type WorkspaceState,
} from './workspace-store';
import {
  isWorkspaceCustomModified,
  type BackupSnapshotSummary,
  type DatabaseStatusMeta,
} from './backup-utils';

export const WORKSPACE_STORAGE_KEY = 'kotonoha_studio_workspace_v1';

export function loadWorkspaceFromStorage(): WorkspaceState {
  if (typeof window === 'undefined') {
    return createInitialWorkspaceState();
  }
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return createInitialWorkspaceState();
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    return normalizeWorkspaceState(parsed);
  } catch {
    return createInitialWorkspaceState();
  }
}

export function saveWorkspaceToStorage(state: WorkspaceState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota overflow gracefully (database API handles large images)
  }
}

export async function fetchWorkspaceFromServer(
  reconnect = false
): Promise<{
  state: WorkspaceState;
  meta: DatabaseStatusMeta | null;
  snapshots: BackupSnapshotSummary[];
}> {
  const localState = loadWorkspaceFromStorage();
  try {
    const res = await fetch(
      `/api/workspace${reconnect ? '?reconnect=1' : ''}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      return { state: localState, meta: null, snapshots: [] };
    }
    const data = (await res.json()) as {
      ok: boolean;
      state?: WorkspaceState;
      meta?: DatabaseStatusMeta;
      snapshots?: BackupSnapshotSummary[];
    };
    if (!data.ok || !data.state) {
      return { state: localState, meta: null, snapshots: [] };
    }

    // If the server is still on fresh default seed state and browser localStorage has user edits, auto-migrate!
    if (
      data.meta?.isFreshDefault &&
      isWorkspaceCustomModified(localState)
    ) {
      const migRes = await fetch('/api/workspace/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ browserState: localState }),
      });
      if (migRes.ok) {
        const migData = (await migRes.json()) as {
          ok: boolean;
          state?: WorkspaceState;
          meta?: DatabaseStatusMeta;
          snapshots?: BackupSnapshotSummary[];
        };
        if (migData.ok && migData.state) {
          const normalizedMig = normalizeWorkspaceState(migData.state);
          saveWorkspaceToStorage(normalizedMig);
          return {
            state: normalizedMig,
            meta: migData.meta ?? data.meta ?? null,
            snapshots: migData.snapshots ?? data.snapshots ?? [],
          };
        }
      }
    }

    const normalized = normalizeWorkspaceState(data.state);
    saveWorkspaceToStorage(normalized);
    return {
      state: normalized,
      meta: data.meta ?? null,
      snapshots: data.snapshots ?? [],
    };
  } catch {
    return { state: localState, meta: null, snapshots: [] };
  }
}

export async function syncWorkspaceToServer(
  state: WorkspaceState,
  customModified?: boolean
): Promise<DatabaseStatusMeta | null> {
  saveWorkspaceToStorage(state);
  try {
    const res = await fetch('/api/workspace', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, customModified }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok: boolean;
      meta?: DatabaseStatusMeta;
    };
    return data.meta ?? null;
  } catch {
    return null;
  }
}

export async function createServerSnapshot(label?: string): Promise<{
  ok: boolean;
  snapshots?: BackupSnapshotSummary[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/backup/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', label }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      snapshots?: BackupSnapshotSummary[];
      error?: string;
    };
    return data;
  } catch {
    return { ok: false, error: 'Could not create snapshot.' };
  }
}

export async function restoreServerSnapshot(snapshotId: string): Promise<{
  ok: boolean;
  state?: WorkspaceState;
  meta?: DatabaseStatusMeta;
  snapshots?: BackupSnapshotSummary[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/backup/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', snapshotId }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      state?: WorkspaceState;
      meta?: DatabaseStatusMeta;
      snapshots?: BackupSnapshotSummary[];
      error?: string;
    };
    if (data.ok && data.state) {
      saveWorkspaceToStorage(data.state);
    }
    return data;
  } catch {
    return { ok: false, error: 'Could not restore snapshot.' };
  }
}

export async function importServerBackupJson(payload: unknown): Promise<{
  ok: boolean;
  state?: WorkspaceState;
  meta?: DatabaseStatusMeta;
  snapshots?: BackupSnapshotSummary[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      ok: boolean;
      state?: WorkspaceState;
      meta?: DatabaseStatusMeta;
      snapshots?: BackupSnapshotSummary[];
      error?: string;
    };
    if (data.ok && data.state) {
      saveWorkspaceToStorage(data.state);
    }
    return data;
  } catch {
    return { ok: false, error: 'Could not import backup file.' };
  }
}
