'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  fetchWorkspaceFromServer,
  loadWorkspaceFromStorage,
  syncWorkspaceToServer,
} from '@/lib/storage';
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
  const skipNextServerSyncRef = useRef(true);
  const [tab, setTab] = useState<RoomFilterTab>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setState(loadWorkspaceFromStorage());
      const remote = await fetchWorkspaceFromServer(false);
      if (!active) return;
      skipNextServerSyncRef.current = true;
      setState(remote.state);
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
    syncWorkspaceToServer(state);
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
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs">
          {/* Room Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-[#1E3A5F]" aria-hidden="true" />
                <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
                  Room Archive
                </h1>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Stored history from Feed and Verification panels. Restore any entry back to the active Studio whenever needed.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1E293B] whitespace-nowrap shrink-0"
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
              className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'all'}
                onClick={() => setTab('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  tab === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Verifications ({state.archivedVerifications.length})
              </button>
            </div>

            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search Room archive"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search archived @keyword or text..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Empty State */}
          {filteredFeed.length === 0 && filteredVerifies.length === 0 ? (
            <div
              data-testid="room-empty-state"
              className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center"
            >
              <Archive
                className="mx-auto h-8 w-8 text-slate-400"
                aria-hidden="true"
              />
              <h2 className="mt-3 font-display text-xl font-semibold text-slate-900">
                {totalArchived === 0
                  ? 'Your Room archive is quiet'
                  : 'No archived entries match your search'}
              </h2>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                {totalArchived === 0
                  ? 'Click "Room" on any Feed post or Verification card in the Studio when a task is finished to store it here as history.'
                  : 'Try clearing the search input or switching tabs above.'}
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E293B]"
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
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
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
                            <span className="text-sm font-semibold text-slate-900">
                              {item.characterName}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                              {item.type === 'pending_verify' && (
                                <Clock className="h-3 w-3 text-amber-600" aria-hidden="true" />
                              )}
                              {item.type === 'success_verify' && (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                              )}
                              {item.type === 'order' && (
                                <ClipboardList className="h-3 w-3 text-[#1E3A5F]" aria-hidden="true" />
                              )}
                              {(item.type === 'keyword_added' ||
                                item.type === 'keyword_edited') && (
                                <GitCommitHorizontal className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                              )}
                              <span>{typeLabel}</span>
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-slate-400 tabular-nums">
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
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E293B] whitespace-nowrap"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArchivedFeed(item.id)}
                          aria-label={`Delete ${item.characterName}'s archived post permanently`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-sm leading-relaxed text-slate-900">
                      <RichMentionText text={item.content} />
                    </div>

                    {item.comments.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-slate-200 pt-2.5">
                        {item.comments.map((cmt) => {
                          const parentCmt = cmt.parentId
                            ? item.comments.find((p) => p.id === cmt.parentId)
                            : null;
                          return (
                            <div
                              key={cmt.id}
                              className={`rounded-lg bg-white px-3 py-2 text-xs text-slate-700 ${
                                parentCmt ? 'ml-5 border-l-2 border-slate-200' : ''
                              }`}
                            >
                              <span className="font-semibold text-slate-900">
                                {cmt.characterName}
                              </span>
                              {parentCmt && (
                                <span className="mx-1 font-mono text-[11px] text-[#1E3A5F]">
                                  @{parentCmt.characterName}
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
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
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
                            <span className="text-sm font-semibold text-slate-900">
                              {item.characterName}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                              {isPending ? (
                                <Clock className="h-3 w-3 text-amber-600" aria-hidden="true" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                              )}
                              <span>
                                {isPending ? 'Pending Verify' : 'Success Verify'}
                              </span>
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-slate-400 tabular-nums">
                            Archived {formatRelativeOrTime(item.archivedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestoreVerify(item.id)}
                          aria-label={`Restore @${item.keyword} verification`}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E293B] whitespace-nowrap"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArchivedVerify(item.id)}
                          aria-label={`Delete archived @${item.keyword} verification`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 text-sm leading-relaxed text-slate-900">
                      <span className="mr-1.5 font-mono text-xs font-semibold text-[#1E3A5F]">
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
          <span className="text-[11px] text-slate-400">
            Room History Archive
          </span>
        </div>
      </footer>
    </div>
  );
}
