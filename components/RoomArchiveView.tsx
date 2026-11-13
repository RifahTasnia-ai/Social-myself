'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  RotateCcw,
  Trash2,
  Search,
  ArrowLeft,
  Clock,
  CheckCircle2,
  ClipboardList,
  GitCommitHorizontal,
  BookOpen,
} from 'lucide-react';
import {
  createInitialWorkspaceState,
  deleteArchivedFeedItem,
  deleteArchivedVerifyItem,
  restoreFeedItemFromRoom,
  restoreVerifyItemFromRoom,
  type ArchivedFeedItem,
  type ArchivedVerifyItem,
  type Character,
  type WorkspaceState,
} from '@/lib/workspace-store';
import { loadWorkspaceFromStorage, saveWorkspaceToStorage } from '@/lib/storage';
import { formatRelativeOrTime } from '@/lib/image-utils';
import TopNavBar from './TopNavBar';
import CharacterAvatar from './CharacterAvatar';
import RichMentionText from './RichMentionText';

type RoomFilterTab = 'all' | 'feed' | 'verify';

export default function RoomArchiveView() {
  const [state, setState] = useState<WorkspaceState>(() =>
    createInitialWorkspaceState()
  );
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<RoomFilterTab>('all');
  const [query, setQuery] = useState('');

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

  function findCharacter(id: string, fallbackName: string): Character | null {
    return (
      state.characters.find((c) => c.id === id) ||
      state.characters.find(
        (c) => c.name.toLowerCase() === fallbackName.toLowerCase()
      ) ||
      null
    );
  }

  const filteredFeed = useMemo(() => {
    if (tab === 'verify') return [];
    const q = query.trim().toLowerCase();
    return state.archivedFeed.filter((item) => {
      if (!q) return true;
      const hay = [
        item.content,
        item.characterName,
        item.keywordMentions.join(' '),
        item.comments.map((c) => `${c.characterName} ${c.text}`).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [state.archivedFeed, tab, query]);

  const filteredVerifies = useMemo(() => {
    if (tab === 'feed') return [];
    const q = query.trim().toLowerCase();
    return state.archivedVerifications.filter((item) => {
      if (!q) return true;
      const hay = `${item.keyword} ${item.comment} ${item.characterName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [state.archivedVerifications, tab, query]);

  const totalArchived =
    state.archivedFeed.length + state.archivedVerifications.length;

  function handleRestoreFeed(id: string) {
    const res = restoreFeedItemFromRoom(state, id);
    if (res.ok) setState(res.state);
  }

  function handleDeleteArchivedFeed(id: string) {
    const res = deleteArchivedFeedItem(state, id);
    if (res.ok) setState(res.state);
  }

  function handleRestoreVerify(id: string) {
    const res = restoreVerifyItemFromRoom(state, id);
    if (res.ok) setState(res.state);
  }

  function handleDeleteArchivedVerify(id: string) {
    const res = deleteArchivedVerifyItem(state, id);
    if (res.ok) setState(res.state);
  }

  return (
    <div id="top" className="min-h-screen flex flex-col">
      <TopNavBar isRoomPage archivedCount={totalArchived} />

      <main className="mx-auto w-full max-w-[1140px] flex-1 px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-[#DCD6CA] bg-white p-5 sm:p-6">
          {/* Room Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECE8DF] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-[#2D4B73]" aria-hidden="true" />
                <h1 className="font-display text-3xl font-semibold tracking-tight text-[#1A1D24]">
                  Room Archive
                </h1>
              </div>
              <p className="mt-1 text-xs text-[#616775]">
                Stored history from Feed and Verification panels. Restore any entry back to the active Studio whenever needed.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-[3px] border border-[#223B5C] bg-[#2D4B73] px-4 py-2 text-xs font-semibold text-white hover:bg-[#223B5C] whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Studio</span>
            </Link>
          </div>

          {/* Filter Tabs + Search */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Filter Room archive"
              className="flex items-center gap-1 rounded-lg bg-[#F4F0E8] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'all'}
                onClick={() => setTab('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  tab === 'all'
                    ? 'bg-white text-[#1A1D24] shadow-xs'
                    : 'text-[#616775] hover:text-[#1A1D24]'
                }`}
              >
                All ({totalArchived})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'feed'}
                onClick={() => setTab('feed')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  tab === 'feed'
                    ? 'bg-white text-[#1A1D24] shadow-xs'
                    : 'text-[#616775] hover:text-[#1A1D24]'
                }`}
              >
                Feed History ({state.archivedFeed.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'verify'}
                onClick={() => setTab('verify')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  tab === 'verify'
                    ? 'bg-white text-[#1A1D24] shadow-xs'
                    : 'text-[#616775] hover:text-[#1A1D24]'
                }`}
              >
                Verifications ({state.archivedVerifications.length})
              </button>
            </div>

            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7D8390]"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search Room archive"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search archived @keyword or text..."
                className="w-full rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] py-1.5 pl-8 pr-3 text-xs text-[#1A1D24] placeholder:text-[#8A909E] focus:border-[#2D4B73] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Empty State */}
          {filteredFeed.length === 0 && filteredVerifies.length === 0 ? (
            <div
              data-testid="room-empty-state"
              className="mt-6 rounded-xl border border-dashed border-[#D5CFC2] bg-[#FBF9F5] p-10 text-center"
            >
              <Archive
                className="mx-auto h-8 w-8 text-[#9CA3AF]"
                aria-hidden="true"
              />
              <h2 className="mt-3 font-display text-xl font-semibold text-[#1A1D24]">
                {totalArchived === 0
                  ? 'Your Room archive is quiet'
                  : 'No archived entries match your search'}
              </h2>
              <p className="mt-1 text-xs text-[#616775] max-w-md mx-auto">
                {totalArchived === 0
                  ? 'Click "Room" on any Feed post or Verification card in the Studio when a task is finished to store it here as history.'
                  : 'Try clearing the search input or switching tabs above.'}
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-1.5 rounded-[3px] bg-[#2D4B73] px-4 py-2 text-xs font-semibold text-white hover:bg-[#223B5C]"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Return to Studio</span>
              </Link>
            </div>
          ) : (
            <div data-testid="room-archive-list" className="mt-5 space-y-4">
              {/* Archived Feed Entries */}
              {filteredFeed.map((item: ArchivedFeedItem) => {
                const speaker = findCharacter(item.characterId, item.characterName);
                const typeLabel =
                  item.type === 'pending_verify'
                    ? 'Pending Verify'
                    : item.type === 'success_verify'
                    ? 'Success Verify'
                    : item.type === 'keyword_added'
                    ? 'New Keyword'
                    : item.type === 'keyword_edited'
                    ? 'Keyword Edited'
                    : item.type === 'order'
                    ? `Order ${item.orderMeta?.code ?? ''}`
                    : 'Feed Post';

                return (
                  <article
                    key={`arch-feed-${item.id}`}
                    className="rounded-xl border border-[#DCD6CA] bg-[#FBF9F5] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CharacterAvatar
                          character={speaker}
                          nameFallback={item.characterName}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <span className="text-sm font-semibold text-[#1A1D24]">
                              {item.characterName}
                            </span>
                            <span aria-hidden="true" className="text-[#9CA3AF]">
                              ·
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#575D6B]">
                              {item.type === 'pending_verify' && (
                                <Clock className="h-3 w-3 text-[#B7791F]" aria-hidden="true" />
                              )}
                              {item.type === 'success_verify' && (
                                <CheckCircle2 className="h-3 w-3 text-[#2F6B4F]" aria-hidden="true" />
                              )}
                              {item.type === 'order' && (
                                <ClipboardList className="h-3 w-3 text-[#2D4B73]" aria-hidden="true" />
                              )}
                              {(item.type === 'keyword_added' ||
                                item.type === 'keyword_edited') && (
                                <GitCommitHorizontal className="h-3.5 w-3.5 text-[#C84B31]" aria-hidden="true" />
                              )}
                              <span>{typeLabel}</span>
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-[#7D8390] tabular-nums">
                            Archived {formatRelativeOrTime(item.archivedAt)} · Created{' '}
                            {formatRelativeOrTime(item.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestoreFeed(item.id)}
                          aria-label={`Restore ${item.characterName}'s post to Feed`}
                          className="inline-flex items-center gap-1 rounded-[3px] border border-[#223B5C] bg-[#2D4B73] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#223B5C] whitespace-nowrap"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArchivedFeed(item.id)}
                          aria-label={`Delete ${item.characterName}'s archived post permanently`}
                          className="inline-flex items-center gap-1 rounded-[3px] border border-[#E5D7D5] bg-white px-3 py-1.5 text-xs font-medium text-[#9F3A26] hover:bg-[#FDF4F3] whitespace-nowrap"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-sm leading-relaxed text-[#1A1D24]">
                      <RichMentionText text={item.content} />
                    </div>

                    {item.comments.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-[#E4DFD4] pt-2.5">
                        {item.comments.map((cmt) => {
                          const parentCmt = cmt.parentId
                            ? item.comments.find((p) => p.id === cmt.parentId)
                            : null;
                          return (
                            <div
                              key={cmt.id}
                              className={`rounded-lg bg-white px-3 py-2 text-xs text-[#3A404D] ${
                                parentCmt ? 'ml-5 border-l-2 border-[#D5CFC2]' : ''
                              }`}
                            >
                              <span className="font-semibold text-[#1A1D24]">
                                {cmt.characterName}
                              </span>
                              {parentCmt && (
                                <span className="mx-1 text-[11px] text-[#7D8390]">
                                  replied to {parentCmt.characterName}
                                </span>
                              )}
                              <span>: {cmt.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}

              {/* Archived Verification Entries */}
              {filteredVerifies.map((item: ArchivedVerifyItem) => {
                const actor = findCharacter(item.characterId, item.characterName);
                const isPending = item.status === 'pending';
                return (
                  <article
                    key={`arch-ver-${item.id}`}
                    className={`rounded-xl border p-4 ${
                      isPending
                        ? 'border-[#DFC086] bg-[#FCF7EC]'
                        : 'border-[#A8CEB9] bg-[#F2F9F4]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CharacterAvatar
                          character={actor}
                          nameFallback={item.characterName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <span className="text-sm font-semibold text-[#1A1D24]">
                              {item.characterName}
                            </span>
                            <span aria-hidden="true" className="text-[#9CA3AF]">
                              ·
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#575D6B]">
                              {isPending ? (
                                <Clock className="h-3 w-3 text-[#B7791F]" aria-hidden="true" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-[#2F6B4F]" aria-hidden="true" />
                              )}
                              <span>
                                {isPending ? 'Pending Verify' : 'Success Verify'}
                              </span>
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-[#7D8390] tabular-nums">
                            Archived {formatRelativeOrTime(item.archivedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestoreVerify(item.id)}
                          aria-label={`Restore @${item.keyword} verification`}
                          className="inline-flex items-center gap-1 rounded-[3px] border border-[#223B5C] bg-[#2D4B73] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#223B5C] whitespace-nowrap"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArchivedVerify(item.id)}
                          aria-label={`Delete archived @${item.keyword} verification`}
                          className="inline-flex items-center gap-1 rounded-[3px] border border-[#E5D7D5] bg-white px-3 py-1.5 text-xs font-medium text-[#9F3A26] hover:bg-[#FDF4F3] whitespace-nowrap"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 text-sm leading-relaxed text-[#1A1D24]">
                      <span className="mr-1.5 font-mono text-xs font-semibold text-[#2D4B73]">
                        @{item.keyword}
                      </span>
                      <span>{item.comment}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

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
            Room History Archive
          </span>
        </div>
      </footer>
    </div>
  );
}
