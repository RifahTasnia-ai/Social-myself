'use client';

import React, { useRef, useState } from 'react';
import {
  ImagePlus,
  Send,
  Search,
  X,
  MessageSquare,
  ArrowRight,
  Clock,
  CheckCircle2,
  ClipboardList,
  GitCommitHorizontal,
  Archive,
  Trash2,
  CornerDownRight,
  PanelLeftOpen,
  PanelRightOpen,
  RotateCcw,
} from 'lucide-react';
import {
  buildFlatCommentThreads,
  type Character,
  type FeedComment,
  type FeedFilterCategory,
  type FeedItem,
  type KeywordItem,
} from '@/lib/workspace-store';
import { compressImageFile, formatRelativeOrTime } from '@/lib/image-utils';
import CharacterAvatar from './CharacterAvatar';
import MentionTextarea from './MentionTextarea';
import RichMentionText from './RichMentionText';

interface FeedColumnProps {
  feedItems: FeedItem[];
  totalFeedCount: number;
  keywords: KeywordItem[];
  characters: Character[];
  feedCharacters: Character[];
  activeFeedCharacterId: string;
  onChangeActiveFeedCharacter: (characterId: string) => void;
  composerText: string;
  onChangeComposerText: (text: string) => void;
  onCreatePost: (input: {
    characterId: string;
    content: string;
    images: string[];
  }) => { ok: true } | { ok: false; error: string };
  onAddComment: (input: {
    feedItemId: string;
    characterId: string;
    text: string;
    images?: string[];
    parentCommentId?: string;
  }) => { ok: true } | { ok: false; error: string };
  onMoveFeedToRoom: (feedItemId: string) => void;
  onDeleteFeedItem: (feedItemId: string) => void;
  onDeleteFeedComment: (input: { feedItemId: string; commentId: string }) => void;
  activeKeywordFilter: string | null;
  onSelectKeywordFilter: (keyword: string | null) => void;
  filterCategory: FeedFilterCategory;
  onChangeFilterCategory: (cat: FeedFilterCategory) => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  onOpenLightbox: (imgUrl: string) => void;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  onToggleLeftCollapse?: () => void;
  onToggleRightCollapse?: () => void;
  pendingVerifyCount?: number;
  successVerifyCount?: number;
  onResetWorkspace?: () => void;
}

const FILTER_TABS: { value: FeedFilterCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'post', label: 'Posts' },
  { value: 'verify', label: 'Verify' },
  { value: 'changes', label: 'Changes' },
  { value: 'order', label: 'Orders' },
];

export default function FeedColumn({
  feedItems,
  totalFeedCount,
  keywords,
  characters,
  feedCharacters,
  activeFeedCharacterId,
  onChangeActiveFeedCharacter,
  composerText,
  onChangeComposerText,
  onCreatePost,
  onAddComment,
  onMoveFeedToRoom,
  onDeleteFeedItem,
  onDeleteFeedComment,
  activeKeywordFilter,
  onSelectKeywordFilter,
  filterCategory,
  onChangeFilterCategory,
  searchQuery,
  onChangeSearchQuery,
  onOpenLightbox,
  leftCollapsed = false,
  rightCollapsed = false,
  onToggleLeftCollapse,
  onToggleRightCollapse,
  pendingVerifyCount = 0,
  successVerifyCount = 0,
  onResetWorkspace,
}: FeedColumnProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const commentFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const commentTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Unified per-post comment & reply state (1 persistent composer per post — zero mount/unmount scroll jump!)
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyCharIds, setReplyCharIds] = useState<Record<string, string>>({});
  const [replyImages, setReplyImages] = useState<Record<string, string[]>>({});
  const [replyProcessingImg, setReplyProcessingImg] = useState<Record<string, boolean>>({});
  const [replyTargets, setReplyTargets] = useState<Record<string, FeedComment | null>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});

  const activeSpeaker =
    feedCharacters.find((c) => c.id === activeFeedCharacterId) ||
    feedCharacters[0] ||
    characters[0];

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setIsProcessingImages(true);
    setPostError(null);
    try {
      const encoded = await Promise.all(
        files.slice(0, 4).map((file) => compressImageFile(file))
      );
      setAttachedImages((prev) => [...prev, ...encoded].slice(0, 4));
    } catch {
      setPostError('Could not process one of the selected images.');
    } finally {
      setIsProcessingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleCommentFileSelect(
    feedItemId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setReplyProcessingImg((prev) => ({ ...prev, [feedItemId]: true }));
    setReplyErrors((prev) => {
      const next = { ...prev };
      delete next[feedItemId];
      return next;
    });

    try {
      const encoded = await Promise.all(
        files.slice(0, 4).map((file) => compressImageFile(file))
      );
      setReplyImages((prev) => ({
        ...prev,
        [feedItemId]: [...(prev[feedItemId] ?? []), ...encoded].slice(0, 4),
      }));
    } catch {
      setReplyErrors((prev) => ({
        ...prev,
        [feedItemId]: 'Could not process the selected image.',
      }));
    } finally {
      setReplyProcessingImg((prev) => ({ ...prev, [feedItemId]: false }));
      const inputEl = commentFileInputRefs.current[feedItemId];
      if (inputEl) {
        inputEl.value = '';
      }
    }
  }

  function handlePostSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const res = onCreatePost({
      characterId: activeSpeaker.id,
      content: composerText,
      images: attachedImages,
    });
    if (!res.ok) {
      setPostError(res.error);
      return;
    }
    onChangeComposerText('');
    setAttachedImages([]);
    setPostError(null);
  }

  function activateReplyToComment(feedItemId: string, targetComment: FeedComment) {
    setReplyTargets((prev) => {
      const current = prev[feedItemId];
      if (current?.id === targetComment.id) {
        return { ...prev, [feedItemId]: null };
      }
      return { ...prev, [feedItemId]: targetComment };
    });

    setReplyErrors((prev) => {
      const next = { ...prev };
      delete next[feedItemId];
      return next;
    });

    requestAnimationFrame(() => {
      const el = commentTextareaRefs.current[feedItemId];
      if (!el) return;
      el.focus({ preventScroll: true });
      const rect = el.getBoundingClientRect();
      const inView =
        rect.top >= 70 && rect.bottom <= window.innerHeight - 24;
      if (!inView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  function submitUnifiedCommentOrReply(feedItemId: string) {
    const text = replyTexts[feedItemId] ?? '';
    const images = replyImages[feedItemId] ?? [];
    const charId = replyCharIds[feedItemId] || activeSpeaker.id;
    const targetComment = replyTargets[feedItemId] ?? null;

    const res = onAddComment({
      feedItemId,
      characterId: charId,
      text,
      images,
      ...(targetComment ? { parentCommentId: targetComment.id } : {}),
    });

    if (!res.ok) {
      setReplyErrors((prev) => ({ ...prev, [feedItemId]: res.error }));
      return;
    }

    setReplyTexts((prev) => ({ ...prev, [feedItemId]: '' }));
    setReplyImages((prev) => ({ ...prev, [feedItemId]: [] }));
    setReplyTargets((prev) => ({ ...prev, [feedItemId]: null }));
    setReplyErrors((prev) => {
      const next = { ...prev };
      delete next[feedItemId];
      return next;
    });
  }

  function findCharacter(id: string, fallbackName: string): Character | null {
    return (
      characters.find((c) => c.id === id) ||
      characters.find((c) => c.name.toLowerCase() === fallbackName.toLowerCase()) ||
      null
    );
  }

  function renderCommentImages(images: string[] | undefined, authorName: string) {
    if (!images || images.length === 0) return null;
    return (
      <div
        className={`mt-2 grid gap-1.5 ${
          images.length === 1 ? 'max-w-[260px] grid-cols-1' : 'max-w-[340px] grid-cols-2'
        }`}
      >
        {images.map((imgUrl, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onOpenLightbox(imgUrl)}
            aria-label={`View comment image ${idx + 1} by ${authorName}`}
            className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt={`Comment attachment ${idx + 1} by ${authorName}`}
              referrerPolicy="no-referrer"
              className="max-h-44 w-full object-cover transition-transform duration-150 group-hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Main feed" className="flex flex-col gap-3.5">
      {/* Card 1: Stream Header + Filter & Search Toolbar */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {leftCollapsed && onToggleLeftCollapse && (
              <button
                type="button"
                onClick={onToggleLeftCollapse}
                aria-label="Expand Keywords panel"
                title="Show Keywords panel"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <PanelLeftOpen className="h-3.5 w-3.5 text-[#1E3A5F]" aria-hidden="true" />
                <span>Keywords ({keywords.length})</span>
              </button>
            )}

            <div className="flex items-baseline gap-2">
              <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">
                Feed
              </h1>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {feedItems.length} of {totalFeedCount} entries
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-slate-500">
              Live updates, diffs &amp; verification threads
            </span>

            {rightCollapsed && onToggleRightCollapse && (
              <button
                type="button"
                onClick={onToggleRightCollapse}
                aria-label="Expand Verification panels"
                title="Show Verification panels"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <span>
                  Verify ({pendingVerifyCount + successVerifyCount})
                </span>
                <PanelRightOpen className="h-3.5 w-3.5 text-[#1E3A5F]" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Row */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
          <div
            role="tablist"
            aria-label="Filter feed entries"
            className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            {FILTER_TABS.map((tab) => {
              const active = filterCategory === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onChangeFilterCategory(tab.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search feed"
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder="Search feed or character..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {activeKeywordFilter && (
          <div className="mt-2.5 flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-1.5 text-xs">
            <span className="text-slate-800">
              Filtering by{' '}
              <strong className="font-mono font-semibold text-[#1E3A5F]">
                @{activeKeywordFilter}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onSelectKeywordFilter(null)}
              className="inline-flex items-center gap-1 font-medium text-[#1E3A5F] hover:underline whitespace-nowrap"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Card 2: Avatar-Led Single-Surface Social Composer */}
      <form
        onSubmit={handlePostSubmit}
        className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-colors focus-within:border-[#1E3A5F]/60"
      >
        <div className="flex items-start gap-3">
          <CharacterAvatar
            character={activeSpeaker}
            size="md"
            className="mt-0.5 shrink-0"
          />

          <div className="min-w-0 flex-1">
            {/* Character Switcher Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div
                role="radiogroup"
                aria-label="Select feed character"
                className="flex flex-wrap items-center gap-1"
              >
                {feedCharacters.map((char) => {
                  const selected = char.id === activeSpeaker?.id;
                  return (
                    <button
                      key={char.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChangeActiveFeedCharacter(char.id)}
                      className={`inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        selected
                          ? 'border-[#0F172A] bg-[#0F172A] text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <CharacterAvatar character={char} size="2xs" />
                      <span>{char.name}</span>
                    </button>
                  );
                })}
              </div>

              <span className="text-[11px] text-slate-400">
                {activeSpeaker?.roleLabel || 'Feed Voice'}
              </span>
            </div>

            {/* Borderless Writing Surface */}
            <div className="mt-2">
              <MentionTextarea
                id="feed-composer-input"
                ariaLabel="Write a feed update with @keyword mentions"
                value={composerText}
                onChange={(val) => {
                  onChangeComposerText(val);
                  if (postError) setPostError(null);
                }}
                keywords={keywords}
                rows={2}
                variant="borderless"
                placeholder="Write an update using @keyword (Enter to post, Shift+Enter for new line)..."
                onSubmitShortcut={() => handlePostSubmit()}
              />
            </div>

            {attachedImages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachedImages.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative h-16 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Attachment preview ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAttachedImages((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      aria-label={`Remove image ${idx + 1}`}
                      className="absolute right-1 top-1 rounded-full bg-slate-900/80 p-0.5 text-white hover:bg-slate-900"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Composer Action Bar */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="feed-image-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImages}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                >
                  <ImagePlus className="h-3.5 w-3.5 text-[#1E3A5F]" aria-hidden="true" />
                  <span>{isProcessingImages ? 'Adding...' : 'Add Image'}</span>
                </button>
                <span className="hidden sm:inline text-[11px] text-slate-400">
                  Type <strong className="font-mono text-[#1E3A5F]">@</strong> for keywords · <strong className="font-mono">Enter</strong> to post
                </span>
              </div>

              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] whitespace-nowrap shrink-0"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Post to Feed</span>
              </button>
            </div>

            {postError && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-600">
                {postError}
              </p>
            )}
          </div>
        </div>
      </form>

      {/* Feed Stream — Standalone Post Cards (Zero layout thrashing) */}
      <div data-testid="feed-stream" className="flex flex-col gap-3.5">
        {feedItems.length === 0 ? (
          <div className="rounded-xl border border-slate-200/90 bg-white p-8 text-center shadow-2xs">
            <p className="text-sm font-semibold text-slate-900">
              {totalFeedCount === 0
                ? 'Your feed stream is currently empty'
                : 'No matching entries in your feed'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {totalFeedCount === 0
                ? 'Write a new update above or restore the starter studio entries.'
                : 'Clear active filters or post a new update mentioning a @keyword above.'}
            </p>
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
              {(activeKeywordFilter || searchQuery || filterCategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectKeywordFilter(null);
                    onChangeSearchQuery('');
                    onChangeFilterCategory('all');
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset Filters
                </button>
              )}
              {totalFeedCount === 0 && onResetWorkspace && (
                <button
                  type="button"
                  onClick={onResetWorkspace}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 text-xs font-semibold text-white hover:bg-[#1E293B]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Restore Starter Workspace</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          feedItems.map((item) => {
            const speaker = findCharacter(item.characterId, item.characterName);
            const selectedReplyCharId =
              replyCharIds[item.id] || activeSpeaker?.id || characters[0]?.id;
            const selectedReplyChar =
              characters.find((c) => c.id === selectedReplyCharId) ||
              activeSpeaker ||
              characters[0];

            const currentReplyTarget = replyTargets[item.id] ?? null;
            const currentReplyImages = replyImages[item.id] ?? [];
            const isUploadingCommentImg = Boolean(replyProcessingImg[item.id]);

            const typeDescriptor =
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
                : speaker?.roleLabel || 'Feed Update';

            const threadGroups = buildFlatCommentThreads(item.comments);

            return (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs"
              >
                {/* Entry Header with Room & Delete Controls */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <CharacterAvatar
                      character={speaker}
                      nameFallback={item.characterName}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[14.5px] font-semibold text-slate-900">
                          {item.characterName}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 whitespace-nowrap">
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
                          <span>{typeDescriptor}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 text-[11.5px] text-slate-400">
                        <span className="font-mono tabular-nums">
                          {formatRelativeOrTime(item.createdAt)}
                        </span>
                        {item.orderMeta && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-medium text-[#1E3A5F]">
                              Priority: {item.orderMeta.priority}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMoveFeedToRoom(item.id)}
                      aria-label={`Move ${item.characterName}'s update to Room`}
                      title="Send to Room archive"
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[11.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
                    >
                      <Archive className="h-3 w-3" aria-hidden="true" />
                      <span>Room</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteFeedItem(item.id)}
                      aria-label={`Delete ${item.characterName}'s update`}
                      title="Delete entry"
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[11.5px] font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Entry Body — 15px / 1.6 line-height social reading standard */}
                <div className="mt-3 text-[15px] leading-[1.6] text-slate-900">
                  <RichMentionText
                    text={item.content}
                    activeFilter={activeKeywordFilter}
                    onKeywordClick={(kw) =>
                      onSelectKeywordFilter(
                        activeKeywordFilter?.toLowerCase() === kw.toLowerCase()
                          ? null
                          : kw
                      )
                    }
                  />
                </div>

                {/* Before -> After Diff Block for Keyword Additions & Edits */}
                {item.diff && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60 text-xs">
                    {item.type === 'keyword_edited' ? (
                      <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                        <div className="bg-red-50/50 p-3">
                          <div className="font-mono text-[11px] font-semibold text-red-800">
                            Before
                          </div>
                          {item.diff.beforeKeyword && (
                            <div className="mt-1 font-mono text-xs font-medium text-red-900">
                              @{item.diff.beforeKeyword}
                            </div>
                          )}
                          {item.diff.beforeSummary && (
                            <p className="mt-1 text-xs text-slate-600 line-through decoration-red-400">
                              {item.diff.beforeSummary}
                            </p>
                          )}
                        </div>
                        <div className="bg-emerald-50/50 p-3">
                          <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-800">
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                            <span>After</span>
                          </div>
                          {item.diff.afterKeyword && (
                            <div className="mt-1 font-mono text-xs font-semibold text-emerald-900">
                              @{item.diff.afterKeyword}
                            </div>
                          )}
                          {item.diff.afterSummary && (
                            <p className="mt-1 text-xs text-slate-900">
                              {item.diff.afterSummary}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/40 p-3">
                        <div className="font-mono text-[11px] font-semibold text-emerald-800">
                          Created Keyword
                        </div>
                        {item.diff.afterKeyword && (
                          <div className="mt-1 font-mono text-xs font-semibold text-emerald-900">
                            @{item.diff.afterKeyword}
                          </div>
                        )}
                        {item.diff.afterSummary && (
                          <p className="mt-1 text-xs text-slate-700">
                            {item.diff.afterSummary}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Attached Post Images */}
                {item.images.length > 0 && (
                  <div
                    className={`mt-3 grid gap-2 ${
                      item.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                    }`}
                  >
                    {item.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onOpenLightbox(imgUrl)}
                        aria-label={`View attached image ${idx + 1} full size`}
                        className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={`Feed attachment ${idx + 1} by ${item.characterName}`}
                          referrerPolicy="no-referrer"
                          className="max-h-72 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Comments Thread (1-Level Flat Threading) + Single Anchored Social Reply Bar */}
                <div className="mt-4 border-t border-slate-100 pt-3.5">
                  {threadGroups.length > 0 && (
                    <div
                      data-testid={`comments-thread-${item.id}`}
                      className="mb-3 space-y-2.5"
                    >
                      {threadGroups.map(({ root, replies }) => {
                        const rootChar = findCharacter(
                          root.characterId,
                          root.characterName
                        );
                        const isReplyingToRoot =
                          currentReplyTarget?.id === root.id;

                        return (
                          <div key={root.id} className="space-y-2">
                            {/* Level 0: Root Comment */}
                            <div className="flex items-start gap-2.5">
                              <CharacterAvatar
                                character={rootChar}
                                nameFallback={root.characterName}
                                size="sm"
                                className="mt-0.5 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div
                                  className={`rounded-xl border px-3.5 py-2 transition-colors ${
                                    isReplyingToRoot
                                      ? 'border-[#1E3A5F]/40 bg-sky-50/40'
                                      : 'border-slate-200/80 bg-slate-50/80'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] font-semibold text-slate-900">
                                      {root.characterName}
                                    </span>
                                  </div>
                                  {root.text && (
                                    <div className="mt-0.5 text-[13.5px] leading-[1.45] text-slate-800">
                                      <RichMentionText
                                        text={root.text}
                                        activeFilter={activeKeywordFilter}
                                        onKeywordClick={(kw) =>
                                          onSelectKeywordFilter(kw)
                                        }
                                      />
                                    </div>
                                  )}
                                  {renderCommentImages(
                                    root.images,
                                    root.characterName
                                  )}
                                </div>

                                {/* Under-Bubble Action Strip */}
                                <div className="mt-1 flex flex-wrap items-center gap-3 px-1.5 text-[11.5px] font-medium text-slate-500">
                                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                                    {formatRelativeOrTime(root.createdAt)}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      activateReplyToComment(item.id, root)
                                    }
                                    aria-label={`Reply to comment by ${root.characterName}`}
                                    aria-pressed={isReplyingToRoot}
                                    className={`inline-flex items-center gap-1 transition-colors ${
                                      isReplyingToRoot
                                        ? 'font-semibold text-[#1E3A5F]'
                                        : 'text-slate-500 hover:text-[#1E3A5F]'
                                    }`}
                                  >
                                    <CornerDownRight
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    <span>Reply</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      onDeleteFeedComment({
                                        feedItemId: item.id,
                                        commentId: root.id,
                                      })
                                    }
                                    aria-label={`Delete comment by ${root.characterName}`}
                                    className="inline-flex items-center gap-1 text-slate-400 transition-colors hover:text-red-600"
                                  >
                                    <Trash2
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Level 1 ONLY: All Replies Flattened into a Single 36px Indent (ml-9) with @ParentName */}
                            {replies.length > 0 && (
                              <div
                                data-testid={`flat-replies-${root.id}`}
                                className="ml-9 space-y-2 border-l-2 border-slate-200 pl-3"
                              >
                                {replies.map(({ comment: reply, replyToName }) => {
                                  const replyChar = findCharacter(
                                    reply.characterId,
                                    reply.characterName
                                  );
                                  const isReplyingToThis =
                                    currentReplyTarget?.id === reply.id;

                                  return (
                                    <div
                                      key={reply.id}
                                      className="flex items-start gap-2"
                                    >
                                      <CharacterAvatar
                                        character={replyChar}
                                        nameFallback={reply.characterName}
                                        size="xs"
                                        className="mt-0.5 shrink-0"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div
                                          className={`rounded-xl border px-3 py-2 transition-colors ${
                                            isReplyingToThis
                                              ? 'border-[#1E3A5F]/40 bg-sky-50/40'
                                              : 'border-slate-200/70 bg-slate-50/60'
                                          }`}
                                        >
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-[12.5px] font-semibold text-slate-900">
                                              {reply.characterName}
                                            </span>
                                            <span
                                              data-testid={`reply-mention-${reply.id}`}
                                              className="inline-flex items-center rounded bg-[#1E3A5F]/10 px-1.5 py-0.2 font-mono text-[11px] font-medium text-[#1E3A5F]"
                                            >
                                              @{replyToName}
                                            </span>
                                          </div>
                                          {reply.text && (
                                            <div className="mt-0.5 text-[13.5px] leading-[1.45] text-slate-800">
                                              <RichMentionText
                                                text={reply.text}
                                                activeFilter={
                                                  activeKeywordFilter
                                                }
                                                onKeywordClick={(kw) =>
                                                  onSelectKeywordFilter(kw)
                                                }
                                              />
                                            </div>
                                          )}
                                          {renderCommentImages(
                                            reply.images,
                                            reply.characterName
                                          )}
                                        </div>

                                        {/* Under-Bubble Action Strip for Reply */}
                                        <div className="mt-1 flex flex-wrap items-center gap-3 px-1 text-[11.5px] font-medium text-slate-500">
                                          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                                            {formatRelativeOrTime(
                                              reply.createdAt
                                            )}
                                          </span>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              activateReplyToComment(
                                                item.id,
                                                reply
                                              )
                                            }
                                            aria-label={`Reply to comment by ${reply.characterName}`}
                                            aria-pressed={isReplyingToThis}
                                            className={`inline-flex items-center gap-1 transition-colors ${
                                              isReplyingToThis
                                                ? 'font-semibold text-[#1E3A5F]'
                                                : 'text-slate-500 hover:text-[#1E3A5F]'
                                            }`}
                                          >
                                            <CornerDownRight
                                              className="h-3 w-3"
                                              aria-hidden="true"
                                            />
                                            <span>Reply</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              onDeleteFeedComment({
                                                feedItemId: item.id,
                                                commentId: reply.id,
                                              })
                                            }
                                            aria-label={`Delete comment by ${reply.characterName}`}
                                            className="inline-flex items-center gap-1 text-slate-400 transition-colors hover:text-red-600"
                                          >
                                            <Trash2
                                              className="h-3 w-3"
                                              aria-hidden="true"
                                            />
                                            <span>Delete</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Single Anchored Comment & Reply Composer Bar (Supports Text + Image Upload, Zero Scroll Jump!) */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 transition-colors focus-within:border-[#1E3A5F] focus-within:bg-white">
                    {/* Active Reply Target Context Banner (When replying to a specific comment) */}
                    {currentReplyTarget && (
                      <div
                        data-testid={`replying-banner-${item.id}`}
                        className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-100/80 px-3 py-1.5 text-xs rounded-t-xl"
                      >
                        <div className="flex items-center gap-1.5 text-slate-700 min-w-0">
                          <CornerDownRight
                            className="h-3.5 w-3.5 text-[#1E3A5F] shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            Replying to{' '}
                            <strong className="font-mono font-semibold text-[#1E3A5F]">
                              @{currentReplyTarget.characterName}
                            </strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setReplyTargets((prev) => ({
                              ...prev,
                              [item.id]: null,
                            }))
                          }
                          aria-label="Cancel reply target"
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}

                    {/* Attached Comment/Reply Image Previews */}
                    {currentReplyImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-3 pt-2.5">
                        {currentReplyImages.map((src, idx) => (
                          <div
                            key={idx}
                            className="relative h-14 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`Reply attachment preview ${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setReplyImages((prev) => ({
                                  ...prev,
                                  [item.id]: (prev[item.id] ?? []).filter(
                                    (_, i) => i !== idx
                                  ),
                                }))
                              }
                              aria-label={`Remove reply image ${idx + 1}`}
                              className="absolute right-1 top-1 rounded-full bg-slate-900/80 p-0.5 text-white hover:bg-slate-900"
                            >
                              <X className="h-2.5 w-2.5" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <form
                      id={`post-reply-form-${item.id}`}
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitUnifiedCommentOrReply(item.id);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5"
                    >
                      {/* Embedded Avatar + Character Switcher Pill */}
                      <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 shrink-0">
                        <CharacterAvatar
                          character={selectedReplyChar}
                          nameFallback={selectedReplyChar?.name || 'K'}
                          size="2xs"
                        />
                        <label
                          htmlFor={`reply-char-${item.id}`}
                          className="sr-only"
                        >
                          Reply character
                        </label>
                        <select
                          id={`reply-char-${item.id}`}
                          value={selectedReplyCharId}
                          onChange={(e) =>
                            setReplyCharIds((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="bg-transparent text-[12px] font-semibold text-slate-900 focus:outline-none cursor-pointer pr-0.5"
                        >
                          {characters.map((char) => (
                            <option key={char.id} value={char.id}>
                              {char.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Locked 32px Single-Line MentionTextarea (Expands only on multi-line text) */}
                      <div className="min-w-0 flex-1">
                        <MentionTextarea
                          externalRef={(el) => {
                            commentTextareaRefs.current[item.id] = el;
                          }}
                          ariaLabel={
                            currentReplyTarget
                              ? `Write reply to ${currentReplyTarget.characterName}`
                              : `Comment on ${item.characterName}'s update`
                          }
                          value={replyTexts[item.id] ?? ''}
                          onChange={(val) => {
                            setReplyTexts((prev) => ({
                              ...prev,
                              [item.id]: val,
                            }));
                            if (replyErrors[item.id]) {
                              setReplyErrors((prev) => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }
                          }}
                          keywords={keywords}
                          rows={1}
                          autoExpand={true}
                          variant="compact"
                          placeholder={
                            currentReplyTarget
                              ? `Reply to @${currentReplyTarget.characterName} (Enter to send)...`
                              : 'Write a comment (Enter to send)...'
                          }
                          onSubmitShortcut={() =>
                            submitUnifiedCommentOrReply(item.id)
                          }
                          onCancel={
                            currentReplyTarget
                              ? () =>
                                  setReplyTargets((prev) => ({
                                    ...prev,
                                    [item.id]: null,
                                  }))
                              : undefined
                          }
                        />
                      </div>

                      {/* Image Attachment Button for Comment / Reply + Submit Button */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          ref={(el) => {
                            commentFileInputRefs.current[item.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleCommentFileSelect(item.id, e)}
                          className="hidden"
                          id={`comment-image-upload-${item.id}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            commentFileInputRefs.current[item.id]?.click()
                          }
                          disabled={isUploadingCommentImg}
                          aria-label={`Attach image to reply on ${item.characterName}'s update`}
                          title="Attach image to comment or reply"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#1E3A5F] disabled:opacity-50"
                        >
                          <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        <button
                          type="submit"
                          aria-label={currentReplyTarget ? 'Send reply' : 'Reply'}
                          className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#0F172A] px-3 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#1E293B] whitespace-nowrap"
                        >
                          <MessageSquare className="h-3 w-3" aria-hidden="true" />
                          <span>{currentReplyTarget ? 'Send' : 'Reply'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {replyErrors[item.id] && (
                    <p
                      role="alert"
                      className="mt-1 px-1 text-[11px] font-medium text-red-600"
                    >
                      {replyErrors[item.id]}
                    </p>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
