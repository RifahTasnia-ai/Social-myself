import fs from 'node:fs';
import path from 'node:path';
import { MongoClient, type Db } from 'mongodb';
import {
  createId,
  createInitialWorkspaceState,
  normalizeWorkspaceState,
  type WorkspaceState,
} from './workspace-store';
import {
  computeWorkspaceCounts,
  isWorkspaceCustomModified,
  mergeWorkspaceStatesForMigration,
  parseAndValidateBackupPayload,
  type BackupSnapshotSummary,
  type DatabaseStatusMeta,
} from './backup-utils';

const DEFAULT_FALLBACK_ATLAS_URI =
  'mongodb+srv://egosadik707_db_user:C6L1LEhKgi22DAsE@cluster0.wvpjckw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

function getConfiguredMongoUri(): string {
  const envUri = process.env.MONGODB_URI?.trim();
  if (
    envUri &&
    envUri !== 'MY_MONGODB_URI' &&
    !envUri.includes('username:password@cluster0.example')
  ) {
    return envUri;
  }
  return DEFAULT_FALLBACK_ATLAS_URI;
}

function getConfiguredDbName(): string {
  return process.env.MONGODB_DB_NAME?.trim() || 'kotonoha_studio';
}

function extractClusterHost(uri: string): string {
  const match = uri.match(/@([^/?]+)/);
  return match ? match[1] : 'cluster0.wvpjckw.mongodb.net';
}

const DATA_DIR = path.join(process.cwd(), 'data');
const MIRROR_FILE = path.join(DATA_DIR, 'kotonoha-mirror.json');
const SNAPSHOTS_FILE = path.join(DATA_DIR, 'kotonoha-snapshots.json');

interface StoredWorkspaceDoc {
  _id: string;
  state: WorkspaceState;
  updatedAt: string;
  customModified: boolean;
}

interface StoredSnapshotDoc extends BackupSnapshotSummary {
  state: WorkspaceState;
}

declare global {
  var _kotonohaMongoClient: MongoClient | null | undefined;
  var _kotonohaMongoLastError: string | null | undefined;
  var _kotonohaMongoLastFailAt: number | undefined;
}

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Ignore directory creation errors on read-only environments
  }
}

function readLocalMirror(): StoredWorkspaceDoc | null {
  try {
    if (!fs.existsSync(MIRROR_FILE)) return null;
    const raw = fs.readFileSync(MIRROR_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoredWorkspaceDoc>;
    if (!parsed || !parsed.state) return null;
    const state = normalizeWorkspaceState(parsed.state);
    return {
      _id: 'default',
      state,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      customModified:
        typeof parsed.customModified === 'boolean'
          ? parsed.customModified
          : isWorkspaceCustomModified(state),
    };
  } catch {
    return null;
  }
}

function writeLocalMirror(doc: StoredWorkspaceDoc): void {
  try {
    ensureDataDir();
    fs.writeFileSync(MIRROR_FILE, JSON.stringify(doc, null, 2), 'utf8');
  } catch {
    // Ignore write errors on read-only filesystems
  }
}

function readLocalSnapshots(): StoredSnapshotDoc[] {
  try {
    if (!fs.existsSync(SNAPSHOTS_FILE)) return [];
    const raw = fs.readFileSync(SNAPSHOTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredSnapshotDoc[]) : [];
  } catch {
    return [];
  }
}

function writeLocalSnapshots(snapshots: StoredSnapshotDoc[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(
      SNAPSHOTS_FILE,
      JSON.stringify(snapshots.slice(0, 15), null, 2),
      'utf8'
    );
  } catch {
    // Ignore write errors
  }
}

function formatMongoErrorHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/bad auth|Authentication failed/i.test(msg)) {
    return 'MongoDB Atlas auth pending: click "Create Database User" in Atlas or verify password in .env.local.';
  }
  if (
    /Server selection timed out|IP|whitelist|ECONNREFUSED|ENOTFOUND|SSL|tlsv1/i.test(
      msg
    )
  ) {
    return 'Using Local Disk DB (to connect from cloud preview, add 0.0.0.0/0 in MongoDB Atlas -> Network Access; your PC IP 27.147.226.103 is already whitelisted for localhost).';
  }
  return `Local Disk DB active (${msg.slice(0, 90)})`;
}

async function getMongoDatabase(
  forceReconnect = false
): Promise<{ db: Db; latencyMs: number } | { db: null; errorHint: string }> {
  const now = Date.now();
  if (
    !forceReconnect &&
    globalThis._kotonohaMongoLastFailAt &&
    now - globalThis._kotonohaMongoLastFailAt < 15000 &&
    globalThis._kotonohaMongoLastError
  ) {
    return { db: null, errorHint: globalThis._kotonohaMongoLastError };
  }

  const uri = getConfiguredMongoUri();
  const dbName = getConfiguredDbName();
  const start = Date.now();

  try {
    if (forceReconnect && globalThis._kotonohaMongoClient) {
      try {
        await globalThis._kotonohaMongoClient.close();
      } catch {
        // Ignore close errors
      }
      globalThis._kotonohaMongoClient = null;
    }

    if (!globalThis._kotonohaMongoClient) {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 3200,
        connectTimeoutMS: 3200,
        socketTimeoutMS: 5000,
        maxPoolSize: 5,
      });
      await client.connect();
      globalThis._kotonohaMongoClient = client;
    }

    const db = globalThis._kotonohaMongoClient.db(dbName);
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - start;

    globalThis._kotonohaMongoLastError = null;
    globalThis._kotonohaMongoLastFailAt = undefined;

    return { db, latencyMs };
  } catch (err) {
    const hint = formatMongoErrorHint(err);
    globalThis._kotonohaMongoLastError = hint;
    globalThis._kotonohaMongoLastFailAt = Date.now();
    globalThis._kotonohaMongoClient = null;
    return { db: null, errorHint: hint };
  }
}

export async function loadServerWorkspace(
  forceReconnect = false
): Promise<{ state: WorkspaceState; meta: DatabaseStatusMeta }> {
  const uri = getConfiguredMongoUri();
  const dbName = getConfiguredDbName();
  const clusterHost = extractClusterHost(uri);

  const localDoc = readLocalMirror();
  const conn = await getMongoDatabase(forceReconnect);

  if (conn.db) {
    try {
      const col = conn.db.collection<StoredWorkspaceDoc>('workspaces');
      const remoteDoc = await col.findOne({ _id: 'default' });

      // If remote exists and local mirror has newer custom edits, push local to remote
      if (remoteDoc && localDoc) {
        const remoteTime = new Date(remoteDoc.updatedAt).getTime();
        const localTime = new Date(localDoc.updatedAt).getTime();
        if (localDoc.customModified && localTime > remoteTime + 1000) {
          await col.replaceOne({ _id: 'default' }, localDoc, { upsert: true });
          return {
            state: localDoc.state,
            meta: {
              engine: 'mongodb_atlas',
              connected: true,
              databaseName: dbName,
              clusterHost,
              latencyMs: conn.latencyMs,
              updatedAt: localDoc.updatedAt,
              counts: computeWorkspaceCounts(localDoc.state),
              isFreshDefault: !localDoc.customModified,
            },
          };
        }
      }

      if (remoteDoc && remoteDoc.state) {
        const normalized = normalizeWorkspaceState(remoteDoc.state);
        const syncedDoc: StoredWorkspaceDoc = {
          _id: 'default',
          state: normalized,
          updatedAt: remoteDoc.updatedAt || new Date().toISOString(),
          customModified:
            typeof remoteDoc.customModified === 'boolean'
              ? remoteDoc.customModified
              : isWorkspaceCustomModified(normalized),
        };
        writeLocalMirror(syncedDoc);

        return {
          state: normalized,
          meta: {
            engine: 'mongodb_atlas',
            connected: true,
            databaseName: dbName,
            clusterHost,
            latencyMs: conn.latencyMs,
            updatedAt: syncedDoc.updatedAt,
            counts: computeWorkspaceCounts(normalized),
            isFreshDefault: !syncedDoc.customModified,
          },
        };
      }

      // Remote collection is empty — seed with localDoc (if exists) or initial workspace
      const initialDoc: StoredWorkspaceDoc = localDoc ?? {
        _id: 'default',
        state: createInitialWorkspaceState(),
        updatedAt: new Date().toISOString(),
        customModified: false,
      };

      await col.replaceOne({ _id: 'default' }, initialDoc, { upsert: true });
      writeLocalMirror(initialDoc);

      return {
        state: initialDoc.state,
        meta: {
          engine: 'mongodb_atlas',
          connected: true,
          databaseName: dbName,
          clusterHost,
          latencyMs: conn.latencyMs,
          updatedAt: initialDoc.updatedAt,
          counts: computeWorkspaceCounts(initialDoc.state),
          isFreshDefault: !initialDoc.customModified,
        },
      };
    } catch (err) {
      const hint = formatMongoErrorHint(err);
      globalThis._kotonohaMongoLastError = hint;
    }
  }

  // Fallback to local disk mirror
  const fallbackDoc: StoredWorkspaceDoc = localDoc ?? {
    _id: 'default',
    state: createInitialWorkspaceState(),
    updatedAt: new Date().toISOString(),
    customModified: false,
  };

  if (!localDoc) {
    writeLocalMirror(fallbackDoc);
  }

  return {
    state: fallbackDoc.state,
    meta: {
      engine: 'local_disk_fallback',
      connected: false,
      databaseName: dbName,
      clusterHost,
      latencyMs: null,
      updatedAt: fallbackDoc.updatedAt,
      errorHint:
        conn.db === null
          ? conn.errorHint
          : globalThis._kotonohaMongoLastError ?? undefined,
      counts: computeWorkspaceCounts(fallbackDoc.state),
      isFreshDefault: !fallbackDoc.customModified,
    },
  };
}

export async function saveServerWorkspace(
  rawState: Partial<WorkspaceState>,
  forceCustomModified?: boolean
): Promise<{ state: WorkspaceState; meta: DatabaseStatusMeta }> {
  const uri = getConfiguredMongoUri();
  const dbName = getConfiguredDbName();
  const clusterHost = extractClusterHost(uri);

  const normalized = normalizeWorkspaceState(rawState);
  const now = new Date().toISOString();
  const customModified =
    typeof forceCustomModified === 'boolean'
      ? forceCustomModified
      : isWorkspaceCustomModified(normalized);

  const doc: StoredWorkspaceDoc = {
    _id: 'default',
    state: normalized,
    updatedAt: now,
    customModified,
  };

  // Always write to local disk mirror immediately for zero-data-loss guarantee
  writeLocalMirror(doc);

  const conn = await getMongoDatabase(false);
  if (conn.db) {
    try {
      const col = conn.db.collection<StoredWorkspaceDoc>('workspaces');
      await col.replaceOne({ _id: 'default' }, doc, { upsert: true });
      return {
        state: normalized,
        meta: {
          engine: 'mongodb_atlas',
          connected: true,
          databaseName: dbName,
          clusterHost,
          latencyMs: conn.latencyMs,
          updatedAt: now,
          counts: computeWorkspaceCounts(normalized),
          isFreshDefault: !customModified,
        },
      };
    } catch (err) {
      const hint = formatMongoErrorHint(err);
      globalThis._kotonohaMongoLastError = hint;
    }
  }

  return {
    state: normalized,
    meta: {
      engine: 'local_disk_fallback',
      connected: false,
      databaseName: dbName,
      clusterHost,
      latencyMs: null,
      updatedAt: now,
      errorHint:
        conn.db === null
          ? conn.errorHint
          : globalThis._kotonohaMongoLastError ?? undefined,
      counts: computeWorkspaceCounts(normalized),
      isFreshDefault: !customModified,
    },
  };
}

export async function migrateBrowserWorkspace(
  browserRaw: Partial<WorkspaceState> | null | undefined
): Promise<{ state: WorkspaceState; meta: DatabaseStatusMeta; migrated: boolean }> {
  const current = await loadServerWorkspace(false);
  if (!browserRaw) {
    return { ...current, migrated: false };
  }

  const browserNormalized = normalizeWorkspaceState(browserRaw);
  if (!isWorkspaceCustomModified(browserNormalized)) {
    return { ...current, migrated: false };
  }

  const merged = mergeWorkspaceStatesForMigration(
    current.state,
    browserNormalized
  );
  const saved = await saveServerWorkspace(merged, true);
  return { ...saved, migrated: true };
}

export async function listSnapshots(): Promise<BackupSnapshotSummary[]> {
  const local = readLocalSnapshots();
  const conn = await getMongoDatabase(false);

  if (conn.db) {
    try {
      const col = conn.db.collection<StoredSnapshotDoc>('snapshots');
      const docs = await col
        .find({}, { projection: { state: 0 } })
        .sort({ createdAt: -1 })
        .limit(15)
        .toArray();

      if (docs.length > 0) {
        return docs.map((d) => ({
          id: d.id,
          label: d.label,
          createdAt: d.createdAt,
          counts: d.counts,
        }));
      }
    } catch {
      // Fallback to local snapshots
    }
  }

  return local.map((d) => ({
    id: d.id,
    label: d.label,
    createdAt: d.createdAt,
    counts: d.counts,
  }));
}

export async function createSnapshot(
  label?: string
): Promise<{ snapshot: BackupSnapshotSummary; snapshots: BackupSnapshotSummary[] }> {
  const current = await loadServerWorkspace(false);
  const counts = computeWorkspaceCounts(current.state);
  const now = new Date().toISOString();

  const snapDoc: StoredSnapshotDoc = {
    id: createId('snap'),
    label: label?.trim() || `Checkpoint · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    createdAt: now,
    counts,
    state: current.state,
  };

  const existingLocal = readLocalSnapshots();
  writeLocalSnapshots([snapDoc, ...existingLocal].slice(0, 15));

  const conn = await getMongoDatabase(false);
  if (conn.db) {
    try {
      const col = conn.db.collection<StoredSnapshotDoc>('snapshots');
      await col.insertOne(snapDoc);
    } catch {
      // Ignore remote snapshot insert error; local snapshot is saved
    }
  }

  const snapshots = await listSnapshots();
  return {
    snapshot: {
      id: snapDoc.id,
      label: snapDoc.label,
      createdAt: snapDoc.createdAt,
      counts: snapDoc.counts,
    },
    snapshots,
  };
}

export async function restoreSnapshot(
  snapshotId: string
): Promise<
  | { ok: true; state: WorkspaceState; meta: DatabaseStatusMeta; snapshots: BackupSnapshotSummary[] }
  | { ok: false; error: string }
> {
  let targetDoc: StoredSnapshotDoc | null = null;

  const conn = await getMongoDatabase(false);
  if (conn.db) {
    try {
      const col = conn.db.collection<StoredSnapshotDoc>('snapshots');
      targetDoc = await col.findOne({ id: snapshotId });
    } catch {
      // Fallback to local
    }
  }

  if (!targetDoc) {
    const local = readLocalSnapshots();
    targetDoc = local.find((s) => s.id === snapshotId) ?? null;
  }

  if (!targetDoc || !targetDoc.state) {
    return { ok: false, error: 'Snapshot not found.' };
  }

  // Create automatic safety checkpoint before restoring
  await createSnapshot('Auto-saved before restore');

  const saved = await saveServerWorkspace(targetDoc.state, true);
  const snapshots = await listSnapshots();
  return { ok: true, ...saved, snapshots };
}

export async function importBackupJson(
  payload: unknown
): Promise<
  | { ok: true; state: WorkspaceState; meta: DatabaseStatusMeta; snapshots: BackupSnapshotSummary[] }
  | { ok: false; error: string }
> {
  const parsed = parseAndValidateBackupPayload(payload);
  if (!parsed.ok) {
    return parsed;
  }

  // Save a recovery checkpoint before overwriting with imported backup
  await createSnapshot('Auto-saved before JSON import');

  const saved = await saveServerWorkspace(parsed.state, true);
  const snapshots = await listSnapshots();
  return { ok: true, ...saved, snapshots };
}
