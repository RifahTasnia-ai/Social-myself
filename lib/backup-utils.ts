import {
  createInitialWorkspaceState,
  normalizeWorkspaceState,
  type WorkspaceState,
} from './workspace-store';

export interface WorkspaceCounts {
  keywords: number;
  feed: number;
  comments: number;
  verifications: number;
  archived: number;
  images: number;
}

export interface DatabaseStatusMeta {
  engine: 'mongodb_atlas' | 'local_disk_fallback';
  connected: boolean;
  databaseName: string;
  clusterHost: string;
  latencyMs: number | null;
  updatedAt: string;
  errorHint?: string;
  counts: WorkspaceCounts;
  isFreshDefault: boolean;
}

export interface BackupSnapshotSummary {
  id: string;
  label: string;
  createdAt: string;
  counts: WorkspaceCounts;
}

export interface BackupEnvelope {
  app: 'kotonoha-studio';
  schemaVersion: number;
  exportedAt: string;
  counts: WorkspaceCounts;
  state: WorkspaceState;
}

export function computeWorkspaceCounts(state: WorkspaceState): WorkspaceCounts {
  let comments = 0;
  let images = 0;

  for (const item of state.feed) {
    images += item.images?.length ?? 0;
    comments += item.comments?.length ?? 0;
    for (const cmt of item.comments ?? []) {
      images += cmt.images?.length ?? 0;
    }
  }

  for (const item of state.archivedFeed) {
    images += item.images?.length ?? 0;
    comments += item.comments?.length ?? 0;
    for (const cmt of item.comments ?? []) {
      images += cmt.images?.length ?? 0;
    }
  }

  return {
    keywords: state.keywords.length,
    feed: state.feed.length,
    comments,
    verifications: state.verifications.length,
    archived: state.archivedFeed.length + state.archivedVerifications.length,
    images,
  };
}

const SEED_KEYWORD_IDS = new Set([
  'kw_1',
  'kw_2',
  'kw_3',
  'kw_4',
  'kw_5',
]);

const SEED_FEED_IDS = new Set([
  'feed_seed_1',
  'feed_seed_2',
  'feed_seed_3',
  'feed_seed_4',
  'feed_seed_5',
]);

export function isWorkspaceCustomModified(state: WorkspaceState): boolean {
  if (state.archivedFeed.length > 0 || state.archivedVerifications.length > 0) {
    return true;
  }
  if (state.keywords.length !== SEED_KEYWORD_IDS.size) {
    return true;
  }
  if (state.feed.length !== SEED_FEED_IDS.size) {
    return true;
  }
  for (const kw of state.keywords) {
    if (!SEED_KEYWORD_IDS.has(kw.id)) return true;
  }
  for (const post of state.feed) {
    if (!SEED_FEED_IDS.has(post.id)) return true;
    if (post.id === 'feed_seed_5' && post.comments.length !== 2) return true;
    if (post.id !== 'feed_seed_5' && post.comments.length > 0) return true;
  }
  return false;
}

export function createBackupEnvelope(state: WorkspaceState): BackupEnvelope {
  const normalized = normalizeWorkspaceState(state);
  return {
    app: 'kotonoha-studio',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    counts: computeWorkspaceCounts(normalized),
    state: normalized,
  };
}

export function parseAndValidateBackupPayload(
  raw: unknown
): { ok: true; state: WorkspaceState } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid backup file: expected a JSON object.' };
  }

  const obj = raw as Record<string, unknown>;
  const candidate =
    obj.state && typeof obj.state === 'object'
      ? (obj.state as Record<string, unknown>)
      : obj;

  if (
    !Array.isArray(candidate.keywords) ||
    !Array.isArray(candidate.feed) ||
    !Array.isArray(candidate.characters)
  ) {
    return {
      ok: false,
      error:
        'Invalid backup format: missing required keywords, feed, or characters arrays.',
    };
  }

  const normalized = normalizeWorkspaceState(
    candidate as Partial<WorkspaceState>
  );
  return { ok: true, state: normalized };
}

export function mergeWorkspaceStatesForMigration(
  serverState: WorkspaceState,
  browserRaw: Partial<WorkspaceState> | null | undefined
): WorkspaceState {
  if (!browserRaw) return serverState;
  const browserState = normalizeWorkspaceState(browserRaw);

  // If browser is just untouched seed data, keep serverState
  if (!isWorkspaceCustomModified(browserState)) {
    return serverState;
  }

  // If server is untouched seed data and browser has user customizations, adopt browserState directly
  if (!isWorkspaceCustomModified(serverState)) {
    return browserState;
  }

  // Otherwise merge unique custom items from browser into serverState
  const fallback = createInitialWorkspaceState();
  const mergedKeywords = [...serverState.keywords];
  const existingKwHandles = new Set(
    mergedKeywords.map((k) => k.keyword.toLowerCase())
  );
  for (const kw of browserState.keywords) {
    if (!existingKwHandles.has(kw.keyword.toLowerCase())) {
      mergedKeywords.push(kw);
      existingKwHandles.add(kw.keyword.toLowerCase());
    }
  }

  const mergedFeedMap = new Map(serverState.feed.map((f) => [f.id, f]));
  for (const post of browserState.feed) {
    if (!mergedFeedMap.has(post.id)) {
      mergedFeedMap.set(post.id, post);
    } else {
      const existingPost = mergedFeedMap.get(post.id)!;
      const existingCmtIds = new Set(existingPost.comments.map((c) => c.id));
      const newComments = post.comments.filter((c) => !existingCmtIds.has(c.id));
      if (newComments.length > 0) {
        mergedFeedMap.set(post.id, {
          ...existingPost,
          comments: [...existingPost.comments, ...newComments],
        });
      }
    }
  }

  const mergedFeed = Array.from(mergedFeedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const mergedVerifyIds = new Set(serverState.verifications.map((v) => v.id));
  const mergedVerifications = [
    ...serverState.verifications,
    ...browserState.verifications.filter((v) => !mergedVerifyIds.has(v.id)),
  ];

  return {
    ...fallback,
    ...serverState,
    keywords: mergedKeywords,
    feed: mergedFeed,
    verifications: mergedVerifications,
  };
}
