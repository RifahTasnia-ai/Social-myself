'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
} from 'lucide-react';
import type {
  Character,
  FeedComment,
  FeedFilterCategory,
  FeedItem,
  KeywordItem,
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
}: FeedColumnProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Per-post inline reply state
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyCharIds, setReplyCharIds] = useState<Record<string, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});

  // Per-comment nested reply state
  const [activeReplyCommentKey, setActiveReplyCommentKey] = useState<string | null>(
    null
  );
  const [nestedReplyTexts, setNestedReplyTexts] = useState<Record<string, string>>({});
  const [nestedReplyCharIds, setNestedReplyCharIds] = useState<Record<string, string>>({});
  const [nestedReplyErrors, setNestedReplyErrors] = useState<Record<string, string>>({});

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

  function handleReplySubmit(e: React.FormEvent, feedItemId: string) {
    e.preventDefault();
    const text = replyTexts[feedItemId] ?? '';
    const charId = replyCharIds[feedItemId] || activeSpeaker.id;
    const res = onAddComment({ feedItemId, characterId: charId, text });
    if (!res.ok) {
      setReplyErrors((prev) => ({ ...prev, [feedItemId]: res.error }));
      return;
    }
    setReplyTexts((prev) => ({ ...prev, [feedItemId]: '' }));
    setReplyErrors((prev) => {
      const next = { ...prev };
      delete next[feedItemId];
      return next;
    });
  }

  function handleNestedReplySubmit(
    e: React.FormEvent,
    feedItemId: string,
    parentCommentId: string
  ) {
    e.preventDefault();
    const key = `${feedItemId}:${parentCommentId}`;
    const text = nestedReplyTexts[key] ?? '';
    const charId = nestedReplyCharIds[key] || activeSpeaker.id;
    const res = onAddComment({
      feedItemId,
      characterId: charId,
      text,
      parentCommentId,
    });
    if (!res.ok) {
      setNestedReplyErrors((prev) => ({ ...prev, [key]: res.error }));
      return;
    }
    setNestedReplyTexts((prev) => ({ ...prev, [key]: '' }));
    setNestedReplyErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setActiveReplyCommentKey(null);
  }

  function findCharacter(id: string, fallbackName: string): Character | null {
    return (
      characters.find((c) => c.id === id) ||
      characters.find((c) => c.name.toLowerCase() === fallbackName.toLowerCase()) ||
      null
    );
  }

  return (
    <section
      aria-label="Main feed"
      className="flex flex-col rounded-2xl border border-[#DCD6CA] bg-white p-4 sm:p-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[#ECE8DF]">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#1A1D24]">
            Feed
          </h1>
          <p className="text-xs text-[#616775]">
            All updates, keyword edits, and verification dialogues in one stream
          </p>
        </div>
        <span className="font-mono text-xs text-[#616775] tabular-nums">
          {feedItems.length} of {totalFeedCount} entries
        </span>
      </div>

      {/* Composer */}
      <form
        onSubmit={handlePostSubmit}
        className="mt-4 rounded-xl border border-[#E4DFD4] bg-[#FBF9F5] p-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-medium text-[#575D6B]">
            Speaking as
          </span>

          <div
            role="radiogroup"
            aria-label="Select feed character"
            className="flex flex-wrap items-center gap-1.5"
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
                  className={`inline-flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1 text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 ${
                    selected
                      ? 'border-[#1A1D24] bg-[#1A1D24] text-white shadow-xs'
                      : 'border-[#DCD6CA] bg-white text-[#3A404D] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <CharacterAvatar character={char} size="xs" />
                  <span>{char.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <MentionTextarea
          id="feed-composer-input"
          ariaLabel="Write a feed update with @keyword mentions"
          value={composerText}
          onChange={(val) => {
            onChangeComposerText(val);
            if (postError) setPostError(null);
          }}
          keywords={keywords}
          rows={3}
          placeholder="Write details using @keyword (type @ to autocomplete)..."
          onSubmitShortcut={() => handlePostSubmit()}
        />

        {attachedImages.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {attachedImages.map((src, idx) => (
              <div
                key={idx}
                className="relative h-16 w-20 overflow-hidden rounded-lg border border-[#DCD6CA] bg-[#EFECE4]"
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
                    setAttachedImages((prev) => prev.filter((_, i) => i !== idx))
                  }
                  aria-label={`Remove image ${idx + 1}`}
                  className="absolute right-1 top-1 rounded-full bg-[#1A1D24]/80 p-0.5 text-white hover:bg-[#1A1D24]"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-[3px] border border-[#D5CFC2] bg-white px-3 py-1.5 text-xs font-medium text-[#3A404D] transition-colors hover:bg-[#F3EFE6] disabled:opacity-50 whitespace-nowrap"
            >
              <ImagePlus className="h-3.5 w-3.5 text-[#2D4B73]" aria-hidden="true" />
              <span>{isProcessingImages ? 'Adding...' : 'Add Image'}</span>
            </button>
            <span className="hidden sm:inline text-[11px] text-[#7D8390]">
              Type @ to link a keyword
            </span>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-[3px] bg-[#2D4B73] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#223B5C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4B73] whitespace-nowrap shrink-0"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Post to Feed</span>
          </button>
        </div>

        {postError && (
          <p role="alert" className="mt-2 text-xs font-medium text-[#B91C1C]">
            {postError}
          </p>
        )}
      </form>

      {/* Filter & Search Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
        <div
          role="tablist"
          aria-label="Filter feed entries"
          className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F4F0E8] p-1"
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
                    ? 'bg-white text-[#1A1D24] shadow-xs'
                    : 'text-[#616775] hover:text-[#1A1D24]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7D8390]"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search feed"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="Search feed or character..."
            className="w-full rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] py-1.5 pl-8 pr-3 text-xs text-[#1A1D24] placeholder:text-[#8A909E] focus:border-[#2D4B73] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {activeKeywordFilter && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-[#BDD4E8] bg-[#EDF4FA] px-3 py-2 text-xs">
          <span className="text-[#1A1D24]">
            Showing updates mentioning{' '}
            <strong className="font-mono text-[#2D4B73]">
              @{activeKeywordFilter}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => onSelectKeywordFilter(null)}
            className="inline-flex items-center gap-1 font-medium text-[#2D4B73] hover:underline whitespace-nowrap"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear filter</span>
          </button>
        </div>
      )}

      {/* Feed Stream */}
      <div
        data-testid="feed-stream"
        className="mt-4 flex flex-col gap-3.5"
      >
        <AnimatePresence initial={false}>
          {feedItems.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-dashed border-[#D5CFC2] bg-[#FBF9F5] p-8 text-center"
            >
              <p className="text-sm font-medium text-[#1A1D24]">
                No matching entries in your feed
              </p>
              <p className="mt-1 text-xs text-[#616775]">
                Clear active filters or post a new update mentioning a @keyword above.
              </p>
              {(activeKeywordFilter || searchQuery || filterCategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectKeywordFilter(null);
                    onChangeSearchQuery('');
                    onChangeFilterCategory('all');
                  }}
                  className="mt-3 rounded-[3px] border border-[#DCD6CA] bg-white px-3 py-1.5 text-xs font-medium text-[#1A1D24] hover:bg-[#F4F0E8]"
                >
                  Reset Filters
                </button>
              )}
            </motion.div>
          ) : (
            feedItems.map((item) => {
              const speaker = findCharacter(item.characterId, item.characterName);
              const selectedReplyCharId =
                replyCharIds[item.id] || activeSpeaker?.id || characters[0]?.id;

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

              const cardSurface =
                item.type === 'pending_verify'
                  ? 'border-[#DFC086] bg-[#FDF9F0]'
                  : item.type === 'success_verify'
                  ? 'border-[#A8CEB9] bg-[#F4FAF6]'
                  : item.type === 'keyword_edited' || item.type === 'keyword_added'
                  ? 'border-[#D9D1C3] bg-[#FAF7F1]'
                  : item.type === 'order'
                  ? 'border-[#C5D2E3] bg-[#F6F9FC]'
                  : 'border-[#E4DFD4] bg-white';

              return (
                <motion.article
                  key={item.id}
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className={`rounded-xl border p-4 transition-colors ${cardSurface}`}
                >
                  {/* Entry Header with Room & Delete Controls */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CharacterAvatar
                        character={speaker}
                        nameFallback={item.characterName}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold text-[#1A1D24]">
                            {item.characterName}
                          </span>
                          <span aria-hidden="true" className="text-[#9CA3AF]">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#575D6B] whitespace-nowrap">
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
                            <span>{typeDescriptor}</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[#7D8390]">
                          <span className="font-mono tabular-nums">
                            {formatRelativeOrTime(item.createdAt)}
                          </span>
                          {item.orderMeta && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono font-medium text-[#2D4B73]">
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
                        className="inline-flex items-center gap-1 rounded-[3px] border border-[#D5CFC2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#2D4B73] transition-colors hover:bg-[#EDF4FA] hover:border-[#2D4B73]/40 whitespace-nowrap shrink-0"
                      >
                        <Archive className="h-3 w-3" aria-hidden="true" />
                        <span>Room</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteFeedItem(item.id)}
                        aria-label={`Delete ${item.characterName}'s update`}
                        title="Delete entry"
                        className="inline-flex items-center gap-1 rounded-[3px] border border-[#E5D7D5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#9F3A26] transition-colors hover:bg-[#FDF4F3] hover:border-[#C84B31]/50 whitespace-nowrap shrink-0"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Entry Body */}
                  <div className="mt-3 text-sm leading-relaxed text-[#1A1D24]">
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
                    <div className="mt-3 overflow-hidden rounded-lg border border-[#DCD6CA] bg-white text-xs">
                      {item.type === 'keyword_edited' ? (
                        <div className="grid grid-cols-1 divide-y divide-[#ECE8DF] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                          <div className="bg-[#FDF4F3] p-3">
                            <div className="font-mono text-[11px] font-semibold text-[#9F3A26]">
                              Before
                            </div>
                            {item.diff.beforeKeyword && (
                              <div className="mt-1 font-mono text-xs font-medium text-[#7A2E1E]">
                                @{item.diff.beforeKeyword}
                              </div>
                            )}
                            {item.diff.beforeSummary && (
                              <p className="mt-1 text-xs text-[#575D6B] line-through decoration-[#C84B31]/50">
                                {item.diff.beforeSummary}
                              </p>
                            )}
                          </div>
                          <div className="bg-[#F2F8F4] p-3">
                            <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-[#22543D]">
                              <ArrowRight className="h-3 w-3" aria-hidden="true" />
                              <span>After</span>
                            </div>
                            {item.diff.afterKeyword && (
                              <div className="mt-1 font-mono text-xs font-semibold text-[#1E523A]">
                                @{item.diff.afterKeyword}
                              </div>
                            )}
                            {item.diff.afterSummary && (
                              <p className="mt-1 text-xs text-[#1A1D24]">
                                {item.diff.afterSummary}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#F4FAF6] p-3">
                          <div className="font-mono text-[11px] font-semibold text-[#22543D]">
                            Created Keyword
                          </div>
                          {item.diff.afterKeyword && (
                            <div className="mt-1 font-mono text-xs font-semibold text-[#1E523A]">
                              @{item.diff.afterKeyword}
                            </div>
                          )}
                          {item.diff.afterSummary && (
                            <p className="mt-1 text-xs text-[#3A404D]">
                              {item.diff.afterSummary}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attached Images */}
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
                          className="group relative overflow-hidden rounded-lg border border-[#DCD6CA] bg-[#EFECE4] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4B73]"
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

                  {/* Comments Thread + Individual Comment Reply & Delete + Inline Reply */}
                  <div className="mt-3.5 border-t border-[#1A1D24]/8 pt-3">
                    {item.comments.length > 0 && (() => {
                      const commentIds = new Set(item.comments.map((c) => c.id));
                      const topLevelComments = item.comments.filter(
                        (c) => !c.parentId || !commentIds.has(c.parentId)
                      );
                      const repliesByParent = new Map<string, FeedComment[]>();
                      for (const c of item.comments) {
                        if (c.parentId && commentIds.has(c.parentId)) {
                          const list = repliesByParent.get(c.parentId) ?? [];
                          list.push(c);
                          repliesByParent.set(c.parentId, list);
                        }
                      }

                      const renderCommentNode = (
                        cmt: FeedComment,
                        depth: number
                      ): React.ReactNode => {
                        const cmtChar = findCharacter(
                          cmt.characterId,
                          cmt.characterName
                        );
                        const replyKey = `${item.id}:${cmt.id}`;
                        const isReplyingHere = activeReplyCommentKey === replyKey;
                        const childReplies = repliesByParent.get(cmt.id) ?? [];
                        const selectedNestedCharId =
                          nestedReplyCharIds[replyKey] ||
                          activeSpeaker?.id ||
                          characters[0]?.id;

                        return (
                          <div key={cmt.id} className="space-y-2">
                            <div
                              className={`rounded-lg px-3 py-2 ${
                                depth > 0
                                  ? 'border border-[#E4DFD4] bg-[#FAF8F4]'
                                  : 'bg-[#F6F3EC]/85'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                  <CharacterAvatar
                                    character={cmtChar}
                                    nameFallback={cmt.characterName}
                                    size="xs"
                                    className="mt-0.5"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 text-xs">
                                      <span className="font-semibold text-[#1A1D24]">
                                        {cmt.characterName}
                                      </span>
                                      <span className="font-mono text-[11px] text-[#7D8390] tabular-nums">
                                        {formatRelativeOrTime(cmt.createdAt)}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 text-xs leading-relaxed text-[#3A404D]">
                                      <RichMentionText
                                        text={cmt.text}
                                        activeFilter={activeKeywordFilter}
                                        onKeywordClick={(kw) =>
                                          onSelectKeywordFilter(kw)
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onDeleteFeedComment({
                                        feedItemId: item.id,
                                        commentId: cmt.id,
                                      })
                                    }
                                    aria-label={`Delete comment by ${cmt.characterName}`}
                                    title="Delete comment"
                                    className="inline-flex items-center gap-1 rounded-[3px] border border-transparent px-1.5 py-0.5 text-[11px] font-medium text-[#7D8390] transition-colors hover:border-[#E5D7D5] hover:bg-white hover:text-[#9F3A26] whitespace-nowrap"
                                  >
                                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                                    <span>Delete</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveReplyCommentKey((prev) =>
                                        prev === replyKey ? null : replyKey
                                      );
                                      setNestedReplyErrors((prev) => {
                                        const next = { ...prev };
                                        delete next[replyKey];
                                        return next;
                                      });
                                    }}
                                    aria-label={`Reply to comment by ${cmt.characterName}`}
                                    aria-expanded={isReplyingHere}
                                    className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                                      isReplyingHere
                                        ? 'border-[#2D4B73] bg-[#2D4B73] text-white'
                                        : 'border-[#DCD6CA] bg-white text-[#2D4B73] hover:bg-[#EDF4FA]'
                                    }`}
                                  >
                                    <CornerDownRight
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    <span>Reply</span>
                                  </button>
                                </div>
                              </div>

                              {isReplyingHere && (
                                <form
                                  onSubmit={(e) =>
                                    handleNestedReplySubmit(e, item.id, cmt.id)
                                  }
                                  className="mt-2.5 border-t border-[#E4DFD4] pt-2 space-y-1.5"
                                >
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <label
                                      htmlFor={`nested-char-${cmt.id}`}
                                      className="sr-only"
                                    >
                                      Reply character
                                    </label>
                                    <select
                                      id={`nested-char-${cmt.id}`}
                                      value={selectedNestedCharId}
                                      onChange={(e) =>
                                        setNestedReplyCharIds((prev) => ({
                                          ...prev,
                                          [replyKey]: e.target.value,
                                        }))
                                      }
                                      className="rounded-[3px] border border-[#DCD6CA] bg-white px-2 py-1 text-[11px] font-medium text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                                    >
                                      {characters.map((char) => (
                                        <option key={char.id} value={char.id}>
                                          {char.name}
                                        </option>
                                      ))}
                                    </select>

                                    <input
                                      type="text"
                                      autoFocus
                                      aria-label={`Write reply to ${cmt.characterName}`}
                                      value={nestedReplyTexts[replyKey] ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setNestedReplyTexts((prev) => ({
                                          ...prev,
                                          [replyKey]: val,
                                        }));
                                        if (nestedReplyErrors[replyKey]) {
                                          setNestedReplyErrors((prev) => {
                                            const next = { ...prev };
                                            delete next[replyKey];
                                            return next;
                                          });
                                        }
                                      }}
                                      placeholder={`Reply to ${cmt.characterName}...`}
                                      className="min-w-[140px] flex-1 rounded-[3px] border border-[#DCD6CA] bg-white px-2.5 py-1 text-xs text-[#1A1D24] placeholder:text-[#8A909E] focus:border-[#2D4B73] focus:outline-none"
                                    />

                                    <button
                                      type="submit"
                                      className="rounded-[3px] bg-[#2D4B73] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#223B5C] whitespace-nowrap shrink-0"
                                    >
                                      Send
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveReplyCommentKey(null)}
                                      className="rounded-[3px] border border-[#D5CFC2] bg-white px-2 py-1 text-[11px] font-medium text-[#575D6B] hover:bg-[#F3EFE6] whitespace-nowrap shrink-0"
                                    >
                                      Cancel
                                    </button>
                                  </div>

                                  {nestedReplyErrors[replyKey] && (
                                    <p
                                      role="alert"
                                      className="text-[11px] text-[#B91C1C]"
                                    >
                                      {nestedReplyErrors[replyKey]}
                                    </p>
                                  )}
                                </form>
                              )}
                            </div>

                            {childReplies.length > 0 && (
                              <div className="ml-4 sm:ml-6 space-y-2 border-l border-[#D5CFC2] pl-3">
                                {childReplies.map((child) =>
                                  renderCommentNode(child, Math.min(depth + 1, 2))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      };

                      return (
                        <div className="mb-3 space-y-2.5">
                          {topLevelComments.map((cmt) => renderCommentNode(cmt, 0))}
                        </div>
                      );
                    })()}

                    <form
                      onSubmit={(e) => handleReplySubmit(e, item.id)}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <label htmlFor={`reply-char-${item.id}`} className="sr-only">
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
                        className="rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-2.5 py-1.5 text-xs font-medium text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                      >
                        {characters.map((char) => (
                          <option key={char.id} value={char.id}>
                            {char.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        aria-label={`Comment on ${item.characterName}'s update`}
                        value={replyTexts[item.id] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReplyTexts((prev) => ({ ...prev, [item.id]: val }));
                          if (replyErrors[item.id]) {
                            setReplyErrors((prev) => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                          }
                        }}
                        placeholder="Reply as selected character..."
                        className="min-w-[160px] flex-1 rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-3 py-1.5 text-xs text-[#1A1D24] placeholder:text-[#8A909E] focus:border-[#2D4B73] focus:bg-white focus:outline-none"
                      />

                      <button
                        type="submit"
                        aria-label="Send comment"
                        className="inline-flex items-center gap-1 rounded-[3px] border border-[#D5CFC2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1A1D24] transition-colors hover:bg-[#F3EFE6] whitespace-nowrap shrink-0"
                      >
                        <MessageSquare className="h-3 w-3 text-[#2D4B73]" aria-hidden="true" />
                        <span>Reply</span>
                      </button>
                    </form>

                    {replyErrors[item.id] && (
                      <p role="alert" className="mt-1 text-[11px] text-[#B91C1C]">
                        {replyErrors[item.id]}
                      </p>
                    )}
                  </div>
                </motion.article>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
