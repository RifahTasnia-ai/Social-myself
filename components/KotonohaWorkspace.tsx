'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Database, HardDrive } from 'lucide-react';
import {
  addCharacter,
  addFeedComment,
  addFeedPost,
  addKeyword,
  addOrderEntry,
  addVerifyEntry,
  createInitialWorkspaceState,
  deleteFeedComment,
  deleteFeedItem,
  deleteKeyword,
  deleteVerifyItem,
  editKeyword,
  filterFeedItems,
  getFeedCharacters,
  moveFeedItemToRoom,
  moveVerifyItemToRoom,
  promotePendingToSuccess,
  removeCharacter,
  setChannelDefaultCharacter,
  updateCharacter,
  updateKeywordCardPrefs,
  type CharacterChannel,
  type FeedFilterCategory,
  type KeywordCardPrefs,
  type KeywordItem,
  type KeywordTone,
  type OrderMeta,
  type WorkspaceState,
} from '@/lib/workspace-store';
import type {
  BackupSnapshotSummary,
  DatabaseStatusMeta,
} from '@/lib/backup-utils';
import {
  createServerSnapshot,
  fetchWorkspaceFromServer,
  importServerBackupJson,
  loadWorkspaceFromStorage,
  restoreServerSnapshot,
  syncWorkspaceToServer,
} from '@/lib/storage';
import TopNavBar, { type ModalKind } from './TopNavBar';
import KeywordSidebar from './KeywordSidebar';
import FeedColumn from './FeedColumn';
import VerificationColumn from './VerificationColumn';
import WorkspaceModals from './WorkspaceModals';

type MobileTab = 'keywords' | 'feed' | 'verify';

export default function KotonohaWorkspace() {
  const [state, setState] = useState<WorkspaceState>(() =>
    createInitialWorkspaceState()
  );
  const [hydrated, setHydrated] = useState(false);
  const [dbMeta, setDbMeta] = useState<DatabaseStatusMeta | null>(null);
  const [snapshots, setSnapshots] = useState<BackupSnapshotSummary[]>([]);
  const skipNextServerSyncRef = useRef(true);

  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [editingKeyword, setEditingKeyword] = useState<KeywordItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [composerText, setComposerText] = useState('');
  const [activeKeywordFilter, setActiveKeywordFilter] = useState<string | null>(
    null
  );
  const [filterCategory, setFilterCategory] =
    useState<FeedFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTab, setMobileTab] = useState<MobileTab>('feed');

  // Collapsible side panel states (Left Keywords & Right Verify)
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Hydrate persisted state cleanly on client + sync with MongoDB / Local Disk API
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;

      // Immediate 0ms paint from local cache
      const cached = loadWorkspaceFromStorage();
      setState(cached);

      try {
        const rawLayout = window.localStorage.getItem('kotonoha_studio_layout_v3');
        if (rawLayout) {
          const parsed = JSON.parse(rawLayout) as {
            leftCollapsed?: boolean;
            rightCollapsed?: boolean;
          };
          if (typeof parsed.leftCollapsed === 'boolean') {
            setLeftCollapsed(parsed.leftCollapsed);
          }
          if (typeof parsed.rightCollapsed === 'boolean') {
            setRightCollapsed(parsed.rightCollapsed);
          }
        }
      } catch {
        // Ignore storage read errors
      }

      // Fetch authoritative state & auto-migrate from server API
      const remote = await fetchWorkspaceFromServer(false);
      if (!active) return;
      skipNextServerSyncRef.current = true;
      setState(remote.state);
      if (remote.meta) setDbMeta(remote.meta);
      setSnapshots(remote.snapshots);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextServerSyncRef.current) {
      skipNextServerSyncRef.current = false;
      return;
    }
    let active = true;
    syncWorkspaceToServer(state).then((meta) => {
      if (active && meta) {
        setDbMeta(meta);
      }
    });
    return () => {
      active = false;
    };
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        'kotonoha_studio_layout_v3',
        JSON.stringify({ leftCollapsed, rightCollapsed })
      );
    } catch {
      // Ignore storage write errors
    }
  }, [leftCollapsed, rightCollapsed, hydrated]);

  const feedCharacters = useMemo(() => getFeedCharacters(state), [state]);

  const visibleFeed = useMemo(
    () =>
      filterFeedItems(state.feed, {
        query: searchQuery,
        keywordFilter: activeKeywordFilter,
        category: filterCategory,
      }),
    [state.feed, searchQuery, activeKeywordFilter, filterCategory]
  );

  const archivedCount =
    state.archivedFeed.length + state.archivedVerifications.length;
  const pendingVerifyCount = state.verifications.filter(
    (v) => v.status === 'pending'
  ).length;
  const successVerifyCount = state.verifications.filter(
    (v) => v.status === 'success'
  ).length;

  function applyAction(
    result:
      | { ok: true; state: WorkspaceState }
      | { ok: false; error: string }
  ): { ok: true } | { ok: false; error: string } {
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    setState(result.state);
    return { ok: true };
  }

  function handleQuickAddKeyword(input: {
    keyword: string;
    summary: string;
    tone: KeywordTone;
  }) {
    return applyAction(addKeyword(state, input));
  }

  function handleSaveEditKeyword(input: {
    id: string;
    keyword: string;
    summary: string;
    tone: KeywordTone;
  }) {
    return applyAction(editKeyword(state, input));
  }

  function handleDeleteKeyword(id: string) {
    applyAction(deleteKeyword(state, id));
  }

  function handleUpdateKeywordCardPrefs(patch: Partial<KeywordCardPrefs>) {
    applyAction(updateKeywordCardPrefs(state, patch));
  }

  function handleCreatePost(input: {
    characterId: string;
    content: string;
    images: string[];
  }) {
    return applyAction(addFeedPost(state, input));
  }

  function handleAddComment(input: {
    feedItemId: string;
    characterId: string;
    text: string;
    images?: string[];
    parentCommentId?: string;
  }) {
    return applyAction(addFeedComment(state, input));
  }

  function handleMoveFeedToRoom(feedItemId: string) {
    applyAction(moveFeedItemToRoom(state, feedItemId));
  }

  function handleDeleteFeedItem(feedItemId: string) {
    applyAction(deleteFeedItem(state, feedItemId));
  }

  function handleDeleteFeedComment(input: {
    feedItemId: string;
    commentId: string;
  }) {
    applyAction(deleteFeedComment(state, input));
  }

  function handleAddOrder(input: {
    keyword: string;
    details: string;
    priority: OrderMeta['priority'];
    characterId: string;
  }) {
    return applyAction(addOrderEntry(state, input));
  }

  function handleAddVerify(input: {
    status: 'pending' | 'success';
    keyword: string;
    comment: string;
    characterId?: string;
  }) {
    return applyAction(addVerifyEntry(state, input));
  }

  function handlePromotePending(verifyId: string) {
    applyAction(promotePendingToSuccess(state, verifyId));
  }

  function handleMoveVerifyToRoom(verifyId: string) {
    applyAction(moveVerifyItemToRoom(state, verifyId));
  }

  function handleDeleteVerifyItem(verifyId: string) {
    applyAction(deleteVerifyItem(state, verifyId));
  }

  function handleAddCharacter(input: {
    name: string;
    roleLabel: string;
    channel: CharacterChannel;
    color: string;
    customAvatar?: string;
  }) {
    return applyAction(addCharacter(state, input));
  }

  function handleUpdateCharacter(input: {
    id: string;
    name: string;
    roleLabel: string;
    channel: CharacterChannel;
    color: string;
    customAvatar?: string;
  }) {
    return applyAction(updateCharacter(state, input));
  }

  function handleRemoveCharacter(id: string) {
    return applyAction(removeCharacter(state, id));
  }

  function handleSetChannelDefault(
    channel: 'pending' | 'success',
    characterId: string
  ) {
    applyAction(setChannelDefaultCharacter(state, channel, characterId));
  }

  function handleResetWorkspace() {
    const fresh = createInitialWorkspaceState();
    setState(fresh);
    setActiveKeywordFilter(null);
    setFilterCategory('all');
    setSearchQuery('');
    setLeftCollapsed(false);
    setRightCollapsed(false);
  }

  async function handleReconnectDb() {
    await syncWorkspaceToServer(state);
    const remote = await fetchWorkspaceFromServer(true);
    skipNextServerSyncRef.current = true;
    setState(remote.state);
    if (remote.meta) setDbMeta(remote.meta);
    setSnapshots(remote.snapshots);
  }

  async function handleCreateSnapshot(label?: string) {
    const res = await createServerSnapshot(label);
    if (res.ok && res.snapshots) {
      setSnapshots(res.snapshots);
    }
    return { ok: res.ok, error: res.error };
  }

  async function handleRestoreSnapshot(snapshotId: string) {
    const res = await restoreServerSnapshot(snapshotId);
    if (res.ok && res.state) {
      skipNextServerSyncRef.current = true;
      setState(res.state);
      if (res.meta) setDbMeta(res.meta);
      if (res.snapshots) setSnapshots(res.snapshots);
    }
    return { ok: res.ok, error: res.error };
  }

  async function handleImportBackupJson(payload: unknown) {
    const res = await importServerBackupJson(payload);
    if (res.ok && res.state) {
      skipNextServerSyncRef.current = true;
      setState(res.state);
      if (res.meta) setDbMeta(res.meta);
      if (res.snapshots) setSnapshots(res.snapshots);
    }
    return { ok: res.ok, error: res.error };
  }

  const desktopGridCols =
    leftCollapsed && rightCollapsed
      ? 'lg:grid-cols-1 lg:max-w-[780px] lg:mx-auto'
      : leftCollapsed
      ? 'lg:grid-cols-[minmax(0,1fr)_316px] lg:max-w-[1140px] lg:mx-auto'
      : rightCollapsed
      ? 'lg:grid-cols-[280px_minmax(0,1fr)] lg:max-w-[1100px] lg:mx-auto'
      : 'lg:grid-cols-[272px_minmax(0,1fr)_308px] xl:grid-cols-[284px_minmax(0,1fr)_320px]';

  const isAtlasConnected = Boolean(
    dbMeta?.connected && dbMeta?.engine === 'mongodb_atlas'
  );

  return (
    <div id="top" className="min-h-screen flex flex-col">
      <TopNavBar
        activeModal={activeModal}
        archivedCount={archivedCount}
        onOpenModal={(kind) => setActiveModal(kind)}
      />

      {/* Mobile Column Switcher (< lg) */}
      <div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
        <div
          role="tablist"
          aria-label="Workspace panels"
          className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'keywords'}
            onClick={() => setMobileTab('keywords')}
            className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
              mobileTab === 'keywords'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            Keywords ({state.keywords.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'feed'}
            onClick={() => setMobileTab('feed')}
            className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
              mobileTab === 'feed'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            Feed ({visibleFeed.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'verify'}
            onClick={() => setMobileTab('verify')}
            className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
              mobileTab === 'verify'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            Verify ({state.verifications.length})
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio Workspace */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div
          data-testid="workspace-grid"
          data-left-collapsed={leftCollapsed}
          data-right-collapsed={rightCollapsed}
          className={`grid grid-cols-1 gap-5 ${desktopGridCols} items-start`}
        >
          {/* Box 1 (Left): Keywords */}
          {!leftCollapsed && (
            <div
              className={`${
                mobileTab === 'keywords' ? 'block' : 'hidden lg:block'
              } lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto washi-scroll`}
            >
              <KeywordSidebar
                keywords={state.keywords}
                activeKeywordFilter={activeKeywordFilter}
                cardPrefs={state.keywordCardPrefs}
                onToggleCollapse={() => setLeftCollapsed(true)}
                onUpdateCardPrefs={handleUpdateKeywordCardPrefs}
                onSelectFilter={(kw) => {
                  setActiveKeywordFilter(kw);
                  if (kw) setMobileTab('feed');
                }}
                onQuickAddKeyword={handleQuickAddKeyword}
                onEditKeyword={(item) => setEditingKeyword(item)}
                onDeleteKeyword={handleDeleteKeyword}
              />
            </div>
          )}

          {/* Box 2 (Center Big Box): Feed */}
          <div className={mobileTab === 'feed' ? 'block' : 'hidden lg:block'}>
            <FeedColumn
              feedItems={visibleFeed}
              totalFeedCount={state.feed.length}
              keywords={state.keywords}
              characters={state.characters}
              feedCharacters={feedCharacters}
              activeFeedCharacterId={state.activeFeedCharacterId}
              onChangeActiveFeedCharacter={(id) =>
                applyAction(setChannelDefaultCharacter(state, 'feed', id))
              }
              composerText={composerText}
              onChangeComposerText={setComposerText}
              onCreatePost={handleCreatePost}
              onAddComment={handleAddComment}
              onMoveFeedToRoom={handleMoveFeedToRoom}
              onDeleteFeedItem={handleDeleteFeedItem}
              onDeleteFeedComment={handleDeleteFeedComment}
              activeKeywordFilter={activeKeywordFilter}
              onSelectKeywordFilter={setActiveKeywordFilter}
              filterCategory={filterCategory}
              onChangeFilterCategory={setFilterCategory}
              searchQuery={searchQuery}
              onChangeSearchQuery={setSearchQuery}
              onOpenLightbox={(url) => setLightboxImage(url)}
              leftCollapsed={leftCollapsed}
              rightCollapsed={rightCollapsed}
              onToggleLeftCollapse={() => setLeftCollapsed((prev) => !prev)}
              onToggleRightCollapse={() => setRightCollapsed((prev) => !prev)}
              pendingVerifyCount={pendingVerifyCount}
              successVerifyCount={successVerifyCount}
              onResetWorkspace={handleResetWorkspace}
            />
          </div>

          {/* Box 3 & 4 (Right): Pending Verify & Success Verify */}
          {!rightCollapsed && (
            <div
              className={`${
                mobileTab === 'verify' ? 'block' : 'hidden lg:block'
              } lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto washi-scroll`}
            >
              <VerificationColumn
                verifications={state.verifications}
                keywords={state.keywords}
                characters={state.characters}
                pendingCharacterId={state.pendingCharacterId}
                successCharacterId={state.successCharacterId}
                activeKeywordFilter={activeKeywordFilter}
                onToggleCollapse={() => setRightCollapsed(true)}
                onSelectKeywordFilter={(kw) => {
                  setActiveKeywordFilter(kw);
                  if (kw) setMobileTab('feed');
                }}
                onAddVerifyEntry={handleAddVerify}
                onPromotePending={handlePromotePending}
                onMoveVerifyToRoom={handleMoveVerifyToRoom}
                onDeleteVerifyItem={handleDeleteVerifyItem}
              />
            </div>
          )}
        </div>
      </main>

      {/* Quiet Editorial Project Footer with Database & Backup Shortcut */}
      <footer className="border-t border-slate-200/90 bg-white py-3.5 px-4 sm:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <BookOpen className="h-4 w-4 text-[#1E3A5F]" aria-hidden="true" />
            <span className="font-semibold text-slate-900">
              Sylhet Polytechnic Institute
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Project No.: 07</span>
            <span aria-hidden="true">·</span>
            <span>Project Leader: Maruf Islam</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveModal('settings')}
              title="Open Database & Backups in Settings"
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600 transition-colors hover:text-[#1E3A5F]"
            >
              {isAtlasConnected ? (
                <>
                  <Database className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span>MongoDB Atlas · Backups</span>
                </>
              ) : (
                <>
                  <HardDrive className="h-3.5 w-3.5 text-[#1E3A5F]" aria-hidden="true" />
                  <span>Local Disk DB · Backups</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>

      <WorkspaceModals
        key={`${activeModal ?? 'none'}-${editingKeyword?.id ?? 'none'}`}
        activeModal={activeModal}
        editingKeyword={editingKeyword}
        lightboxImage={lightboxImage}
        keywords={state.keywords}
        characters={state.characters}
        pendingCharacterId={state.pendingCharacterId}
        successCharacterId={state.successCharacterId}
        onClose={() => setActiveModal(null)}
        onCloseEditKeyword={() => setEditingKeyword(null)}
        onCloseLightbox={() => setLightboxImage(null)}
        onAddKeyword={handleQuickAddKeyword}
        onSaveEditKeyword={handleSaveEditKeyword}
        onAddOrder={handleAddOrder}
        onAddVerify={handleAddVerify}
        onAddCharacter={handleAddCharacter}
        onUpdateCharacter={handleUpdateCharacter}
        onRemoveCharacter={handleRemoveCharacter}
        onSetChannelDefault={handleSetChannelDefault}
        onResetWorkspace={handleResetWorkspace}
        dbMeta={dbMeta}
        snapshots={snapshots}
        onReconnectDb={handleReconnectDb}
        onCreateSnapshot={handleCreateSnapshot}
        onRestoreSnapshot={handleRestoreSnapshot}
        onImportBackupJson={handleImportBackupJson}
      />
    </div>
  );
}
