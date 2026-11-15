export type KeywordTone = 'sky' | 'sage' | 'lavender' | 'teal' | 'sand';

export type CharacterChannel = 'feed' | 'pending' | 'success' | 'all';

export interface Character {
  id: string;
  name: string;
  roleLabel: string;
  channel: CharacterChannel;
  color: string;
  avatarKey?: 'ajanokoji' | 'aizen' | 'sasuke' | 'maruf' | 'sadik';
  customAvatar?: string;
}

export interface KeywordItem {
  id: string;
  keyword: string;
  summary: string;
  tone: KeywordTone;
  createdAt: string;
  updatedAt: string;
}

export type FeedEntryType =
  | 'post'
  | 'keyword_added'
  | 'keyword_edited'
  | 'order'
  | 'pending_verify'
  | 'success_verify';

export interface FeedComment {
  id: string;
  characterId: string;
  characterName: string;
  text: string;
  images?: string[];
  createdAt: string;
  parentId?: string;
}

export interface FeedDiff {
  field: 'keyword' | 'summary' | 'both';
  beforeKeyword?: string;
  afterKeyword?: string;
  beforeSummary?: string;
  afterSummary?: string;
}

export interface OrderMeta {
  code: string;
  priority: 'Normal' | 'High' | 'Urgent';
}

export interface FeedItem {
  id: string;
  type: FeedEntryType;
  characterId: string;
  characterName: string;
  content: string;
  keywordMentions: string[];
  images: string[];
  diff?: FeedDiff;
  orderMeta?: OrderMeta;
  comments: FeedComment[];
  createdAt: string;
}

export interface VerifyItem {
  id: string;
  status: 'pending' | 'success';
  keyword: string;
  comment: string;
  characterId: string;
  characterName: string;
  feedItemId: string;
  createdAt: string;
}

export type KeywordCardSpacing = 'compact' | 'balanced' | 'airy';
export type KeywordCardPadding = 'tight' | 'standard' | 'generous';
export type KeywordCardBorder = 'hairline' | 'framed' | 'dashed' | 'borderless';
export type KeywordCardSizePreset = 'compact' | 'default' | 'large';

export interface KeywordCardPrefs {
  spacing: KeywordCardSpacing;
  padding: KeywordCardPadding;
  borderStyle: KeywordCardBorder;
  sizePreset?: KeywordCardSizePreset;
  resizable?: boolean;
}

export const CURRENT_UI_PREFS_VERSION = 2;

export const DEFAULT_KEYWORD_CARD_PREFS: KeywordCardPrefs = {
  spacing: 'compact',
  padding: 'tight',
  borderStyle: 'hairline',
  sizePreset: 'default',
  resizable: false,
};

export interface FlattenedReplyItem {
  comment: FeedComment;
  replyToName: string;
  replyToCommentId: string;
}

export interface CommentThreadGroup {
  root: FeedComment;
  replies: FlattenedReplyItem[];
}

export function buildFlatCommentThreads(
  comments: FeedComment[]
): CommentThreadGroup[] {
  const byId = new Map<string, FeedComment>();
  for (const c of comments) {
    byId.set(c.id, c);
  }

  const groups: CommentThreadGroup[] = [];
  const groupByRootId = new Map<string, CommentThreadGroup>();

  const findRootComment = (cmt: FeedComment): FeedComment => {
    let curr = cmt;
    const seen = new Set<string>([curr.id]);
    while (curr.parentId && byId.has(curr.parentId)) {
      if (seen.has(curr.parentId)) break;
      seen.add(curr.parentId);
      curr = byId.get(curr.parentId)!;
    }
    return curr;
  };

  for (const c of comments) {
    if (!c.parentId || !byId.has(c.parentId)) {
      const group: CommentThreadGroup = { root: c, replies: [] };
      groups.push(group);
      groupByRootId.set(c.id, group);
    }
  }

  for (const c of comments) {
    if (c.parentId && byId.has(c.parentId)) {
      const immediateParent = byId.get(c.parentId)!;
      const root = findRootComment(c);
      let group = groupByRootId.get(root.id);
      if (!group) {
        group = { root, replies: [] };
        groups.push(group);
        groupByRootId.set(root.id, group);
      }
      group.replies.push({
        comment: c,
        replyToName: immediateParent.characterName,
        replyToCommentId: immediateParent.id,
      });
    }
  }

  return groups;
}

export interface ArchivedFeedItem extends FeedItem {
  archivedAt: string;
}

export interface ArchivedVerifyItem extends VerifyItem {
  archivedAt: string;
}

export interface WorkspaceState {
  keywords: KeywordItem[];
  feed: FeedItem[];
  verifications: VerifyItem[];
  archivedFeed: ArchivedFeedItem[];
  archivedVerifications: ArchivedVerifyItem[];
  characters: Character[];
  activeFeedCharacterId: string;
  pendingCharacterId: string;
  successCharacterId: string;
  keywordCardPrefs: KeywordCardPrefs;
  uiPrefsVersion?: number;
}

export type ActionResult<T = WorkspaceState> =
  | { ok: true; state: T }
  | { ok: false; error: string };

const TONES: KeywordTone[] = ['sky', 'sage', 'lavender', 'teal', 'sand'];

export function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function normalizeKeywordHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_-]+)/g);
  if (!matches) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    const clean = m.slice(1);
    const lower = clean.toLowerCase();
    if (clean && !seen.has(lower)) {
      seen.add(lower);
      result.push(clean);
    }
  }
  return result;
}

export function createInitialWorkspaceState(): WorkspaceState {
  const characters: Character[] = [
    {
      id: 'char_ajanokoji',
      name: 'Ajanokoji',
      roleLabel: 'Tactical Analyst',
      channel: 'feed',
      color: '#2D4B73',
      avatarKey: 'ajanokoji',
    },
    {
      id: 'char_aizen',
      name: 'Aizen',
      roleLabel: 'Systems Strategist',
      channel: 'feed',
      color: '#5B4B8A',
      avatarKey: 'aizen',
    },
    {
      id: 'char_sasuke',
      name: 'Sasuke',
      roleLabel: 'Field Observer',
      channel: 'feed',
      color: '#1F3A52',
      avatarKey: 'sasuke',
    },
    {
      id: 'char_maruf',
      name: 'Maruf',
      roleLabel: 'Pending Verifier',
      channel: 'pending',
      color: '#B7791F',
      avatarKey: 'maruf',
    },
    {
      id: 'char_sadik',
      name: 'Sadik',
      roleLabel: 'Success Verifier',
      channel: 'success',
      color: '#2F6B4F',
      avatarKey: 'sadik',
    },
  ];

  const baseTime = new Date('2026-11-12T09:10:00.000Z').getTime();
  const isoAt = (minutesAgo: number) => new Date(baseTime - minutesAgo * 60_000).toISOString();

  const keywords: KeywordItem[] = [
    {
      id: 'kw_1',
      keyword: 'sensor-node',
      summary: 'ESP32 telemetry packet framing and sleep wake interval tuning.',
      tone: 'sky',
      createdAt: isoAt(180),
      updatedAt: isoAt(90),
    },
    {
      id: 'kw_2',
      keyword: 'auth-bridge',
      summary: 'Session token verification and local workspace snapshot persistence.',
      tone: 'sage',
      createdAt: isoAt(150),
      updatedAt: isoAt(150),
    },
    {
      id: 'kw_3',
      keyword: 'circuit-v2',
      summary: 'Voltage divider calibration for 5V logic level shifting.',
      tone: 'lavender',
      createdAt: isoAt(120),
      updatedAt: isoAt(120),
    },
    {
      id: 'kw_4',
      keyword: 'field-ui',
      summary: 'Washi daylight contrast tokens and keyboard mention palette.',
      tone: 'teal',
      createdAt: isoAt(95),
      updatedAt: isoAt(95),
    },
    {
      id: 'kw_5',
      keyword: 'deploy-log',
      summary: 'Sylhet Lab Project 07 hardware checklist before field trial.',
      tone: 'sand',
      createdAt: isoAt(70),
      updatedAt: isoAt(70),
    },
  ];

  const feed: FeedItem[] = [
    {
      id: 'feed_seed_5',
      type: 'post',
      characterId: 'char_ajanokoji',
      characterName: 'Ajanokoji',
      content:
        'Reviewed @sensor-node wake cycle timings. Reducing the deep-sleep handshake window by 40ms keeps battery draw predictable across cold mornings.',
      keywordMentions: ['sensor-node'],
      images: [],
      comments: [
        {
          id: 'cmt_seed_1',
          characterId: 'char_aizen',
          characterName: 'Aizen',
          text: 'Make sure @sensor-node still buffers one retry frame if the gateway drops the ACK.',
          createdAt: isoAt(14),
        },
        {
          id: 'cmt_seed_2',
          characterId: 'char_sasuke',
          characterName: 'Sasuke',
          text: 'Tested on bench unit #2 — packet loss stayed at zero over 200 cycles.',
          createdAt: isoAt(9),
          parentId: 'cmt_seed_1',
        },
      ],
      createdAt: isoAt(18),
    },
    {
      id: 'feed_seed_4',
      type: 'success_verify',
      characterId: 'char_sadik',
      characterName: 'Sadik',
      content:
        '@auth-bridge Verified token expiry boundary and reload persistence. Ready for Project 07 sign-off.',
      keywordMentions: ['auth-bridge'],
      images: [],
      comments: [],
      createdAt: isoAt(32),
    },
    {
      id: 'feed_seed_3',
      type: 'pending_verify',
      characterId: 'char_maruf',
      characterName: 'Maruf',
      content:
        '@circuit-v2 Awaiting final thermal check on the 5V regulator under continuous load.',
      keywordMentions: ['circuit-v2'],
      images: [],
      comments: [],
      createdAt: isoAt(48),
    },
    {
      id: 'feed_seed_2',
      type: 'keyword_edited',
      characterId: 'char_maruf',
      characterName: 'Maruf',
      content: 'Refined @sensor-node summary to include sleep wake interval tuning.',
      keywordMentions: ['sensor-node'],
      images: [],
      diff: {
        field: 'summary',
        beforeKeyword: 'sensor-node',
        afterKeyword: 'sensor-node',
        beforeSummary: 'ESP32 telemetry packet framing draft.',
        afterSummary: 'ESP32 telemetry packet framing and sleep wake interval tuning.',
      },
      comments: [],
      createdAt: isoAt(90),
    },
    {
      id: 'feed_seed_1',
      type: 'order',
      characterId: 'char_aizen',
      characterName: 'Aizen',
      content:
        'Work order queued for @deploy-log: prepare enclosure labels and solder two backup headers.',
      keywordMentions: ['deploy-log'],
      images: [],
      orderMeta: {
        code: 'ORD-0701',
        priority: 'High',
      },
      comments: [],
      createdAt: isoAt(110),
    },
  ];

  const verifications: VerifyItem[] = [
    {
      id: 'ver_seed_1',
      status: 'pending',
      keyword: 'circuit-v2',
      comment: 'Awaiting final thermal check on the 5V regulator under continuous load.',
      characterId: 'char_maruf',
      characterName: 'Maruf',
      feedItemId: 'feed_seed_3',
      createdAt: isoAt(48),
    },
    {
      id: 'ver_seed_2',
      status: 'success',
      keyword: 'auth-bridge',
      comment: 'Verified token expiry boundary and reload persistence. Ready for Project 07 sign-off.',
      characterId: 'char_sadik',
      characterName: 'Sadik',
      feedItemId: 'feed_seed_4',
      createdAt: isoAt(32),
    },
  ];

  return {
    keywords,
    feed,
    verifications,
    archivedFeed: [],
    archivedVerifications: [],
    characters,
    activeFeedCharacterId: 'char_ajanokoji',
    pendingCharacterId: 'char_maruf',
    successCharacterId: 'char_sadik',
    keywordCardPrefs: { ...DEFAULT_KEYWORD_CARD_PREFS },
    uiPrefsVersion: CURRENT_UI_PREFS_VERSION,
  };
}

export function normalizeWorkspaceState(
  raw: Partial<WorkspaceState> | null | undefined
): WorkspaceState {
  const fallback = createInitialWorkspaceState();
  if (!raw || !Array.isArray(raw.keywords) || !Array.isArray(raw.feed) || !Array.isArray(raw.characters)) {
    return fallback;
  }

  const rawPrefs = raw.keywordCardPrefs;
  const isLegacyUnmodifiedDefault =
    (!raw.uiPrefsVersion || raw.uiPrefsVersion < CURRENT_UI_PREFS_VERSION) &&
    (!rawPrefs ||
      (rawPrefs.spacing === 'balanced' &&
        rawPrefs.padding === 'standard' &&
        rawPrefs.borderStyle === 'hairline'));

  const resolvedPrefs: KeywordCardPrefs = isLegacyUnmodifiedDefault
    ? { ...DEFAULT_KEYWORD_CARD_PREFS }
    : {
        ...DEFAULT_KEYWORD_CARD_PREFS,
        ...(rawPrefs ?? {}),
      };

  return {
    ...fallback,
    ...raw,
    archivedFeed: Array.isArray(raw.archivedFeed) ? raw.archivedFeed : [],
    archivedVerifications: Array.isArray(raw.archivedVerifications)
      ? raw.archivedVerifications
      : [],
    verifications: Array.isArray(raw.verifications) ? raw.verifications : [],
    keywordCardPrefs: resolvedPrefs,
    uiPrefsVersion: CURRENT_UI_PREFS_VERSION,
  };
}

export function getFeedCharacters(state: WorkspaceState): Character[] {
  const matched = state.characters.filter(
    (c) => c.channel === 'feed' || c.channel === 'all'
  );
  return matched.length > 0 ? matched : state.characters;
}

export function getVerifyCharacters(
  state: WorkspaceState,
  status: 'pending' | 'success'
): Character[] {
  const matched = state.characters.filter(
    (c) => c.channel === status || c.channel === 'all'
  );
  return matched.length > 0 ? matched : state.characters;
}

export function resolveCharacter(
  state: WorkspaceState,
  characterId?: string,
  fallbackId?: string
): Character {
  return (
    state.characters.find((c) => c.id === characterId) ||
    state.characters.find((c) => c.id === fallbackId) ||
    state.characters[0]
  );
}

export function addKeyword(
  state: WorkspaceState,
  input: { keyword: string; summary: string; tone?: KeywordTone; characterId?: string }
): ActionResult {
  const handle = normalizeKeywordHandle(input.keyword);
  const summary = input.summary.trim();

  if (!handle) {
    return { ok: false, error: 'Please enter a valid keyword handle.' };
  }
  if (!summary) {
    return { ok: false, error: 'Please add a short summary for this keyword.' };
  }
  if (state.keywords.some((k) => k.keyword.toLowerCase() === handle.toLowerCase())) {
    return { ok: false, error: `@${handle} already exists in your keywords.` };
  }

  const now = new Date().toISOString();
  const tone = input.tone ?? TONES[state.keywords.length % TONES.length];
  const newKeyword: KeywordItem = {
    id: createId('kw'),
    keyword: handle,
    summary,
    tone,
    createdAt: now,
    updatedAt: now,
  };

  const actor = resolveCharacter(
    state,
    input.characterId,
    state.pendingCharacterId || state.activeFeedCharacterId
  );

  const feedEntry: FeedItem = {
    id: createId('feed'),
    type: 'keyword_added',
    characterId: actor.id,
    characterName: actor.name,
    content: `Added new keyword @${handle} with initial summary.`,
    keywordMentions: [handle],
    images: [],
    diff: {
      field: 'both',
      afterKeyword: handle,
      afterSummary: summary,
    },
    comments: [],
    createdAt: now,
  };

  return {
    ok: true,
    state: {
      ...state,
      keywords: [newKeyword, ...state.keywords],
      feed: [feedEntry, ...state.feed],
    },
  };
}

export function editKeyword(
  state: WorkspaceState,
  input: {
    id: string;
    keyword: string;
    summary: string;
    tone?: KeywordTone;
    characterId?: string;
  }
): ActionResult {
  const existing = state.keywords.find((k) => k.id === input.id);
  if (!existing) {
    return { ok: false, error: 'Keyword could not be found.' };
  }

  const handle = normalizeKeywordHandle(input.keyword);
  const summary = input.summary.trim();
  const tone = input.tone ?? existing.tone;

  if (!handle) {
    return { ok: false, error: 'Keyword handle cannot be empty.' };
  }
  if (!summary) {
    return { ok: false, error: 'Summary cannot be empty.' };
  }

  const duplicate = state.keywords.find(
    (k) => k.id !== input.id && k.keyword.toLowerCase() === handle.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, error: `@${handle} is already used by another keyword.` };
  }

  const keywordChanged = existing.keyword !== handle;
  const summaryChanged = existing.summary !== summary;
  const toneChanged = existing.tone !== tone;

  const now = new Date().toISOString();
  const updatedKeywords = state.keywords.map((k) =>
    k.id === input.id
      ? { ...k, keyword: handle, summary, tone, updatedAt: now }
      : k
  );

  if (!keywordChanged && !summaryChanged && !toneChanged) {
    return { ok: true, state };
  }

  if (!keywordChanged && !summaryChanged && toneChanged) {
    return {
      ok: true,
      state: {
        ...state,
        keywords: updatedKeywords,
      },
    };
  }

  const field: FeedDiff['field'] =
    keywordChanged && summaryChanged
      ? 'both'
      : keywordChanged
      ? 'keyword'
      : 'summary';

  const actor = resolveCharacter(
    state,
    input.characterId,
    state.pendingCharacterId || state.activeFeedCharacterId
  );

  const feedEntry: FeedItem = {
    id: createId('feed'),
    type: 'keyword_edited',
    characterId: actor.id,
    characterName: actor.name,
    content: keywordChanged
      ? `Renamed @${existing.keyword} to @${handle} and updated details.`
      : `Edited summary for @${handle}.`,
    keywordMentions: Array.from(new Set([handle, existing.keyword])),
    images: [],
    diff: {
      field,
      beforeKeyword: existing.keyword,
      afterKeyword: handle,
      beforeSummary: existing.summary,
      afterSummary: summary,
    },
    comments: [],
    createdAt: now,
  };

  return {
    ok: true,
    state: {
      ...state,
      keywords: updatedKeywords,
      feed: [feedEntry, ...state.feed],
    },
  };
}

export function deleteKeyword(state: WorkspaceState, id: string): ActionResult {
  const existing = state.keywords.find((k) => k.id === id);
  if (!existing) {
    return { ok: false, error: 'Keyword not found.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      keywords: state.keywords.filter((k) => k.id !== id),
    },
  };
}

export function addFeedPost(
  state: WorkspaceState,
  input: { characterId?: string; content: string; images?: string[] }
): ActionResult {
  const content = input.content.trim();
  const images = (input.images ?? []).filter(Boolean);

  if (!content && images.length === 0) {
    return { ok: false, error: 'Write a thought with @keyword or attach an image.' };
  }

  const actor = resolveCharacter(state, input.characterId, state.activeFeedCharacterId);
  const mentions = extractMentions(content);

  const feedItem: FeedItem = {
    id: createId('feed'),
    type: 'post',
    characterId: actor.id,
    characterName: actor.name,
    content,
    keywordMentions: mentions,
    images,
    comments: [],
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    state: {
      ...state,
      feed: [feedItem, ...state.feed],
    },
  };
}

export function addFeedComment(
  state: WorkspaceState,
  input: {
    feedItemId: string;
    characterId?: string;
    text: string;
    images?: string[];
    parentCommentId?: string;
  }
): ActionResult {
  const text = input.text.trim();
  const images = (input.images ?? []).filter(Boolean);
  if (!text && images.length === 0) {
    return { ok: false, error: 'Write a comment or attach an image.' };
  }

  const target = state.feed.find((f) => f.id === input.feedItemId);
  if (!target) {
    return { ok: false, error: 'Feed post not found.' };
  }

  if (
    input.parentCommentId &&
    !target.comments.some((c) => c.id === input.parentCommentId)
  ) {
    return { ok: false, error: 'Parent comment not found.' };
  }

  const actor = resolveCharacter(state, input.characterId, state.activeFeedCharacterId);
  const comment: FeedComment = {
    id: createId('cmt'),
    characterId: actor.id,
    characterName: actor.name,
    text,
    ...(images.length > 0 ? { images } : {}),
    createdAt: new Date().toISOString(),
    ...(input.parentCommentId ? { parentId: input.parentCommentId } : {}),
  };

  return {
    ok: true,
    state: {
      ...state,
      feed: state.feed.map((f) =>
        f.id === input.feedItemId ? { ...f, comments: [...f.comments, comment] } : f
      ),
    },
  };
}

export function addOrderEntry(
  state: WorkspaceState,
  input: {
    keyword: string;
    details: string;
    priority?: OrderMeta['priority'];
    characterId?: string;
  }
): ActionResult {
  const details = input.details.trim();
  const handle = normalizeKeywordHandle(input.keyword);
  if (!details) {
    return { ok: false, error: 'Please describe the order details.' };
  }

  const actor = resolveCharacter(state, input.characterId, state.activeFeedCharacterId);
  const orderNumber =
    701 + state.feed.filter((f) => f.type === 'order').length;
  const code = `ORD-0${orderNumber}`;

  const mentions = Array.from(
    new Set([...(handle ? [handle] : []), ...extractMentions(details)])
  );

  const formattedContent =
    handle && !details.toLowerCase().includes(`@${handle.toLowerCase()}`)
      ? `@${handle} ${details}`
      : details;

  const feedItem: FeedItem = {
    id: createId('feed'),
    type: 'order',
    characterId: actor.id,
    characterName: actor.name,
    content: formattedContent,
    keywordMentions: mentions,
    images: [],
    orderMeta: {
      code,
      priority: input.priority ?? 'Normal',
    },
    comments: [],
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    state: {
      ...state,
      feed: [feedItem, ...state.feed],
    },
  };
}

export function addVerifyEntry(
  state: WorkspaceState,
  input: {
    status: 'pending' | 'success';
    keyword: string;
    comment: string;
    characterId?: string;
  }
): ActionResult {
  const rawComment = input.comment.trim();
  const explicitHandle = normalizeKeywordHandle(input.keyword);
  const mentionsFromComment = extractMentions(rawComment);
  const resolvedKeyword = explicitHandle || mentionsFromComment[0] || '';

  if (!resolvedKeyword) {
    return {
      ok: false,
      error: 'Include a keyword or @keyword mention to link this verification.',
    };
  }
  if (!rawComment) {
    return {
      ok: false,
      error: 'Please write a verification comment.',
    };
  }

  const defaultCharId =
    input.status === 'pending' ? state.pendingCharacterId : state.successCharacterId;
  const actor = resolveCharacter(state, input.characterId, defaultCharId);

  const now = new Date().toISOString();
  const feedId = createId('feed');

  const contentForFeed = rawComment
    .toLowerCase()
    .includes(`@${resolvedKeyword.toLowerCase()}`)
    ? rawComment
    : `@${resolvedKeyword} ${rawComment}`;

  const allMentions = Array.from(
    new Set([resolvedKeyword, ...mentionsFromComment])
  );

  const feedItem: FeedItem = {
    id: feedId,
    type: input.status === 'pending' ? 'pending_verify' : 'success_verify',
    characterId: actor.id,
    characterName: actor.name,
    content: contentForFeed,
    keywordMentions: allMentions,
    images: [],
    comments: [],
    createdAt: now,
  };

  const verifyItem: VerifyItem = {
    id: createId('ver'),
    status: input.status,
    keyword: resolvedKeyword,
    comment: rawComment,
    characterId: actor.id,
    characterName: actor.name,
    feedItemId: feedId,
    createdAt: now,
  };

  return {
    ok: true,
    state: {
      ...state,
      verifications: [verifyItem, ...state.verifications],
      feed: [feedItem, ...state.feed],
    },
  };
}

export function promotePendingToSuccess(
  state: WorkspaceState,
  verifyId: string,
  customNote?: string
): ActionResult {
  const existing = state.verifications.find(
    (v) => v.id === verifyId && v.status === 'pending'
  );
  if (!existing) {
    return { ok: false, error: 'Pending verification item not found.' };
  }

  const actor = resolveCharacter(state, state.successCharacterId);
  const now = new Date().toISOString();
  const feedId = createId('feed');
  const note = (customNote ?? '').trim() || `Verified and approved: ${existing.comment}`;
  const contentForFeed = note
    .toLowerCase()
    .includes(`@${existing.keyword.toLowerCase()}`)
    ? note
    : `@${existing.keyword} ${note}`;

  const feedItem: FeedItem = {
    id: feedId,
    type: 'success_verify',
    characterId: actor.id,
    characterName: actor.name,
    content: contentForFeed,
    keywordMentions: [existing.keyword],
    images: [],
    comments: [],
    createdAt: now,
  };

  const updatedVerifications = state.verifications.map((v) =>
    v.id === verifyId
      ? {
          ...v,
          status: 'success' as const,
          comment: note,
          characterId: actor.id,
          characterName: actor.name,
          feedItemId: feedId,
          createdAt: now,
        }
      : v
  );

  return {
    ok: true,
    state: {
      ...state,
      verifications: updatedVerifications,
      feed: [feedItem, ...state.feed],
    },
  };
}

export function addCharacter(
  state: WorkspaceState,
  input: {
    name: string;
    roleLabel?: string;
    channel: CharacterChannel;
    color?: string;
    customAvatar?: string;
  }
): ActionResult {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: 'Character name cannot be empty.' };
  }
  if (state.characters.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: `Character "${name}" already exists.` };
  }

  const newChar: Character = {
    id: createId('char'),
    name,
    roleLabel: (input.roleLabel ?? '').trim() || 'Voice',
    channel: input.channel,
    color: input.color || '#2D4B73',
    customAvatar: input.customAvatar,
  };

  return {
    ok: true,
    state: {
      ...state,
      characters: [...state.characters, newChar],
    },
  };
}

export function removeCharacter(
  state: WorkspaceState,
  characterId: string
): ActionResult {
  if (state.characters.length <= 1) {
    return {
      ok: false,
      error: 'At least one character must remain in the studio.',
    };
  }

  const remaining = state.characters.filter((c) => c.id !== characterId);
  if (remaining.length === state.characters.length) {
    return { ok: false, error: 'Character not found.' };
  }

  const fallbackFeed =
    remaining.find((c) => c.channel === 'feed' || c.channel === 'all')?.id ||
    remaining[0].id;
  const fallbackPending =
    remaining.find((c) => c.channel === 'pending' || c.channel === 'all')?.id ||
    remaining[0].id;
  const fallbackSuccess =
    remaining.find((c) => c.channel === 'success' || c.channel === 'all')?.id ||
    remaining[0].id;

  return {
    ok: true,
    state: {
      ...state,
      characters: remaining,
      activeFeedCharacterId:
        state.activeFeedCharacterId === characterId
          ? fallbackFeed
          : state.activeFeedCharacterId,
      pendingCharacterId:
        state.pendingCharacterId === characterId
          ? fallbackPending
          : state.pendingCharacterId,
      successCharacterId:
        state.successCharacterId === characterId
          ? fallbackSuccess
          : state.successCharacterId,
    },
  };
}

export function setChannelDefaultCharacter(
  state: WorkspaceState,
  channel: 'feed' | 'pending' | 'success',
  characterId: string
): ActionResult {
  if (!state.characters.some((c) => c.id === characterId)) {
    return { ok: false, error: 'Selected character does not exist.' };
  }
  if (channel === 'feed') {
    return { ok: true, state: { ...state, activeFeedCharacterId: characterId } };
  }
  if (channel === 'pending') {
    return { ok: true, state: { ...state, pendingCharacterId: characterId } };
  }
  return { ok: true, state: { ...state, successCharacterId: characterId } };
}

export type FeedFilterCategory =
  | 'all'
  | 'post'
  | 'verify'
  | 'changes'
  | 'order';

export function filterFeedItems(
  items: FeedItem[],
  opts: {
    query?: string;
    keywordFilter?: string | null;
    category?: FeedFilterCategory;
  }
): FeedItem[] {
  const q = (opts.query ?? '').trim().toLowerCase();
  const kw = opts.keywordFilter?.trim().toLowerCase() || null;
  const cat = opts.category ?? 'all';

  return items.filter((item) => {
    if (cat === 'post' && item.type !== 'post') return false;
    if (
      cat === 'verify' &&
      item.type !== 'pending_verify' &&
      item.type !== 'success_verify'
    ) {
      return false;
    }
    if (
      cat === 'changes' &&
      item.type !== 'keyword_added' &&
      item.type !== 'keyword_edited'
    ) {
      return false;
    }
    if (cat === 'order' && item.type !== 'order') return false;

    if (kw) {
      const hasMention = item.keywordMentions.some((m) => m.toLowerCase() === kw);
      const inDiff =
        item.diff?.beforeKeyword?.toLowerCase() === kw ||
        item.diff?.afterKeyword?.toLowerCase() === kw;
      if (!hasMention && !inDiff) return false;
    }

    if (q) {
      const haystack = [
        item.content,
        item.characterName,
        item.keywordMentions.join(' '),
        item.diff?.beforeSummary ?? '',
        item.diff?.afterSummary ?? '',
        item.comments.map((c) => `${c.characterName} ${c.text}`).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

export function deleteFeedItem(
  state: WorkspaceState,
  feedItemId: string
): ActionResult {
  const exists = state.feed.some((f) => f.id === feedItemId);
  if (!exists) {
    return { ok: false, error: 'Feed item not found.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      feed: state.feed.filter((f) => f.id !== feedItemId),
    },
  };
}

export function deleteFeedComment(
  state: WorkspaceState,
  input: { feedItemId: string; commentId: string }
): ActionResult {
  const target = state.feed.find((f) => f.id === input.feedItemId);
  if (!target) {
    return { ok: false, error: 'Feed item not found.' };
  }
  const hasComment = target.comments.some((c) => c.id === input.commentId);
  if (!hasComment) {
    return { ok: false, error: 'Comment not found.' };
  }

  const toDelete = new Set<string>([input.commentId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of target.comments) {
      if (c.parentId && toDelete.has(c.parentId) && !toDelete.has(c.id)) {
        toDelete.add(c.id);
        changed = true;
      }
    }
  }

  return {
    ok: true,
    state: {
      ...state,
      feed: state.feed.map((f) =>
        f.id === input.feedItemId
          ? {
              ...f,
              comments: f.comments.filter((c) => !toDelete.has(c.id)),
            }
          : f
      ),
    },
  };
}

export function deleteVerifyItem(
  state: WorkspaceState,
  verifyId: string
): ActionResult {
  const exists = state.verifications.some((v) => v.id === verifyId);
  if (!exists) {
    return { ok: false, error: 'Verification entry not found.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      verifications: state.verifications.filter((v) => v.id !== verifyId),
    },
  };
}

export function moveFeedItemToRoom(
  state: WorkspaceState,
  feedItemId: string
): ActionResult {
  const target = state.feed.find((f) => f.id === feedItemId);
  if (!target) {
    return { ok: false, error: 'Feed item not found.' };
  }
  const archived: ArchivedFeedItem = {
    ...target,
    archivedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    state: {
      ...state,
      feed: state.feed.filter((f) => f.id !== feedItemId),
      archivedFeed: [archived, ...state.archivedFeed],
    },
  };
}

export function restoreFeedItemFromRoom(
  state: WorkspaceState,
  feedItemId: string
): ActionResult {
  const target = state.archivedFeed.find((f) => f.id === feedItemId);
  if (!target) {
    return { ok: false, error: 'Archived feed item not found.' };
  }
  const { archivedAt: _archivedAt, ...restored } = target;
  void _archivedAt;
  return {
    ok: true,
    state: {
      ...state,
      archivedFeed: state.archivedFeed.filter((f) => f.id !== feedItemId),
      feed: [restored, ...state.feed],
    },
  };
}

export function deleteArchivedFeedItem(
  state: WorkspaceState,
  feedItemId: string
): ActionResult {
  const exists = state.archivedFeed.some((f) => f.id === feedItemId);
  if (!exists) {
    return { ok: false, error: 'Archived feed item not found.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      archivedFeed: state.archivedFeed.filter((f) => f.id !== feedItemId),
    },
  };
}

export function moveVerifyItemToRoom(
  state: WorkspaceState,
  verifyId: string
): ActionResult {
  const target = state.verifications.find((v) => v.id === verifyId);
  if (!target) {
    return { ok: false, error: 'Verification item not found.' };
  }
  const archived: ArchivedVerifyItem = {
    ...target,
    archivedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    state: {
      ...state,
      verifications: state.verifications.filter((v) => v.id !== verifyId),
      archivedVerifications: [archived, ...state.archivedVerifications],
    },
  };
}

export function restoreVerifyItemFromRoom(
  state: WorkspaceState,
  verifyId: string
): ActionResult {
  const target = state.archivedVerifications.find((v) => v.id === verifyId);
  if (!target) {
    return { ok: false, error: 'Archived verification item not found.' };
  }
  const { archivedAt: _archivedAt, ...restored } = target;
  void _archivedAt;
  return {
    ok: true,
    state: {
      ...state,
      archivedVerifications: state.archivedVerifications.filter(
        (v) => v.id !== verifyId
      ),
      verifications: [restored, ...state.verifications],
    },
  };
}

export function deleteArchivedVerifyItem(
  state: WorkspaceState,
  verifyId: string
): ActionResult {
  const exists = state.archivedVerifications.some((v) => v.id === verifyId);
  if (!exists) {
    return { ok: false, error: 'Archived verification item not found.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      archivedVerifications: state.archivedVerifications.filter(
        (v) => v.id !== verifyId
      ),
    },
  };
}

export function updateCharacter(
  state: WorkspaceState,
  input: {
    id: string;
    name: string;
    roleLabel?: string;
    channel: CharacterChannel;
    color?: string;
    customAvatar?: string;
  }
): ActionResult {
  const existing = state.characters.find((c) => c.id === input.id);
  if (!existing) {
    return { ok: false, error: 'Character not found.' };
  }

  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: 'Character name cannot be empty.' };
  }
  const duplicate = state.characters.find(
    (c) => c.id !== input.id && c.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, error: `Character "${name}" already exists.` };
  }

  const nextRole = (input.roleLabel ?? '').trim() || 'Voice';
  const nextColor = input.color || existing.color;
  const nextCustomAvatar =
    input.customAvatar !== undefined ? input.customAvatar : existing.customAvatar;

  const updatedCharacters = state.characters.map((c) =>
    c.id === input.id
      ? {
          ...c,
          name,
          roleLabel: nextRole,
          channel: input.channel,
          color: nextColor,
          customAvatar: nextCustomAvatar,
        }
      : c
  );

  const syncFeedList = <T extends FeedItem>(list: T[]): T[] =>
    list.map((item) => ({
      ...item,
      characterName: item.characterId === input.id ? name : item.characterName,
      comments: item.comments.map((cmt) =>
        cmt.characterId === input.id ? { ...cmt, characterName: name } : cmt
      ),
    }));

  const syncVerifyList = <T extends VerifyItem>(list: T[]): T[] =>
    list.map((v) =>
      v.characterId === input.id ? { ...v, characterName: name } : v
    );

  return {
    ok: true,
    state: {
      ...state,
      characters: updatedCharacters,
      feed: syncFeedList(state.feed),
      archivedFeed: syncFeedList(state.archivedFeed),
      verifications: syncVerifyList(state.verifications),
      archivedVerifications: syncVerifyList(state.archivedVerifications),
    },
  };
}

export function updateKeywordCardPrefs(
  state: WorkspaceState,
  patch: Partial<KeywordCardPrefs>
): ActionResult {
  return {
    ok: true,
    state: {
      ...state,
      keywordCardPrefs: {
        ...state.keywordCardPrefs,
        ...patch,
      },
    },
  };
}

