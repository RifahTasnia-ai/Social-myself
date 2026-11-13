'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
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
import { loadWorkspaceFromStorage, saveWorkspaceToStorage } from '@/lib/storage';
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

  // Hydrate persisted state cleanly on client
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setState(loadWorkspaceFromStorage());
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveWorkspaceToStorage(state);
  }, [state, hydrated]);

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
  }

  return (
    <div id="top" className="min-h-screen flex flex-col">
      <TopNavBar
        activeModal={activeModal}
        archivedCount={archivedCount}
        onOpenModal={(kind) => setActiveModal(kind)}
      />

      {/* Mobile Column Switcher (< lg) */}
      <div className="border-b border-[#DCD6CA] bg-[#FAF8F4] px-4 py-2 lg:hidden">
        <div
          role="tablist"
          aria-label="Workspace panels"
          className="grid grid-cols-3 gap-1 rounded-lg bg-[#EDE9DF] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'keywords'}
            onClick={() => setMobileTab('keywords')}
            className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
              mobileTab === 'keywords'
                ? 'bg-white text-[#1A1D24] shadow-xs'
                : 'text-[#575D6B]'
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
                ? 'bg-white text-[#1A1D24] shadow-xs'
                : 'text-[#575D6B]'
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
                ? 'bg-white text-[#1A1D24] shadow-xs'
                : 'text-[#575D6B]'
            }`}
          >
            Verify ({state.verifications.length})
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio Workspace */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[290px_minmax(0,1fr)_320px] xl:grid-cols-[310px_minmax(0,1fr)_340px] items-start">
          {/* Box 1 (Left): Keywords */}
          <div className={`${mobileTab === 'keywords' ? 'block' : 'hidden lg:block'} lg:sticky lg:top-[84px]`}>
            <KeywordSidebar
              keywords={state.keywords}
              activeKeywordFilter={activeKeywordFilter}
              cardPrefs={state.keywordCardPrefs}
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
            />
          </div>

          {/* Box 3 & 4 (Right): Pending Verify & Success Verify */}
          <div className={`${mobileTab === 'verify' ? 'block' : 'hidden lg:block'} lg:sticky lg:top-[84px]`}>
            <VerificationColumn
              verifications={state.verifications}
              keywords={state.keywords}
              characters={state.characters}
              pendingCharacterId={state.pendingCharacterId}
              successCharacterId={state.successCharacterId}
              activeKeywordFilter={activeKeywordFilter}
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
        </div>
      </main>

      {/* Quiet Editorial Project Footer */}
      <footer className="border-t border-[#E2DDD3] bg-[#FBF9F5]/80 py-3.5 px-4 sm:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 text-xs text-[#575D6B]">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <BookOpen className="h-4 w-4 text-[#2D4B73]" aria-hidden="true" />
            <span className="font-semibold text-[#1A1D24]">
              Sylhet Polytechnic Institute
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Project No.: 07</span>
            <span aria-hidden="true">·</span>
            <span>Project Leader: Maruf Islam</span>
          </div>
          <span className="text-[11px] text-[#7D8390]">
            Personal Dialogue &amp; Keyword Studio
          </span>
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
      />
    </div>
  );
}
