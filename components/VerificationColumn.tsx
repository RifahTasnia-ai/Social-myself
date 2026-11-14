'use client';

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Send,
  Archive,
  Trash2,
  PanelRightClose,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Character, KeywordItem, VerifyItem } from '@/lib/workspace-store';
import { formatRelativeOrTime } from '@/lib/image-utils';
import CharacterAvatar from './CharacterAvatar';
import MentionTextarea from './MentionTextarea';
import RichMentionText from './RichMentionText';

interface VerificationColumnProps {
  verifications: VerifyItem[];
  keywords: KeywordItem[];
  characters: Character[];
  pendingCharacterId: string;
  successCharacterId: string;
  activeKeywordFilter: string | null;
  onToggleCollapse?: () => void;
  onSelectKeywordFilter: (keyword: string | null) => void;
  onAddVerifyEntry: (input: {
    status: 'pending' | 'success';
    keyword: string;
    comment: string;
    characterId?: string;
  }) => { ok: true } | { ok: false; error: string };
  onPromotePending: (verifyId: string) => void;
  onMoveVerifyToRoom: (verifyId: string) => void;
  onDeleteVerifyItem: (verifyId: string) => void;
}

export default function VerificationColumn({
  verifications,
  keywords,
  characters,
  pendingCharacterId,
  successCharacterId,
  activeKeywordFilter,
  onToggleCollapse,
  onSelectKeywordFilter,
  onAddVerifyEntry,
  onPromotePending,
  onMoveVerifyToRoom,
  onDeleteVerifyItem,
}: VerificationColumnProps) {
  const [pendingComment, setPendingComment] = useState('');
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingFolded, setPendingFolded] = useState(false);

  const [successComment, setSuccessComment] = useState('');
  const [successError, setSuccessError] = useState<string | null>(null);
  const [successFolded, setSuccessFolded] = useState(false);

  const pendingChar =
    characters.find((c) => c.id === pendingCharacterId) || characters[0];
  const successChar =
    characters.find((c) => c.id === successCharacterId) || characters[0];

  const pendingList = verifications.filter((v) => v.status === 'pending');
  const successList = verifications.filter((v) => v.status === 'success');

  function submitInline(status: 'pending' | 'success') {
    const rawText = status === 'pending' ? pendingComment : successComment;
    const setErr = status === 'pending' ? setPendingError : setSuccessError;
    const clearText =
      status === 'pending'
        ? () => setPendingComment('')
        : () => setSuccessComment('');

    const match = rawText.match(/@([a-zA-Z0-9_-]+)/);
    const keyword = match ? match[1] : '';

    const res = onAddVerifyEntry({
      status,
      keyword,
      comment: rawText,
      characterId:
        status === 'pending' ? pendingCharacterId : successCharacterId,
    });

    if (!res.ok) {
      setErr(res.error);
      return;
    }

    clearText();
    setErr(null);
  }

  return (
    <aside
      aria-label="Verification panels"
      className="flex flex-col gap-4"
    >
      {/* Top Right Box: Pending Verify */}
      <section
        aria-label="Pending Verify"
        className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs"
      >
        <div
          className={`flex items-center justify-between gap-2 ${
            pendingFolded ? '' : 'pb-3 border-b border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 truncate">
              Pending Verify
            </h2>
            <span className="rounded-md bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-800 tabular-nums">
              {pendingList.length}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-1 text-xs text-slate-600 mr-1">
              <CharacterAvatar character={pendingChar} size="2xs" />
              <span className="font-medium text-[11.5px]">
                {pendingChar?.name || 'Maruf'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPendingFolded((prev) => !prev)}
              aria-expanded={!pendingFolded}
              aria-label={
                pendingFolded ? 'Expand Pending Verify' : 'Fold Pending Verify'
              }
              title={
                pendingFolded ? 'Expand Pending Verify' : 'Fold Pending Verify'
              }
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              {pendingFolded ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Minimize Verification panels"
                title="Hide Verification panels to focus on Feed"
                className="hidden lg:inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]"
              >
                <PanelRightClose className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {!pendingFolded && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitInline('pending');
              }}
              className="mt-3 space-y-2"
            >
              <MentionTextarea
                id="inline-pending-verify-input"
                ariaLabel="Add pending verify comment with @keyword"
                value={pendingComment}
                onChange={(val) => {
                  setPendingComment(val);
                  if (pendingError) setPendingError(null);
                }}
                keywords={keywords}
                rows={2}
                placeholder="Type @keyword & pending note (Enter to add)..."
                className="bg-slate-50/70 text-[13px]"
                onSubmitShortcut={() => submitInline('pending')}
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  Syncs to Feed as {pendingChar?.name || 'Maruf'}
                </span>
                <button
                  type="submit"
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#0F172A] px-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E293B] whitespace-nowrap shrink-0"
                >
                  <Send className="h-3 w-3" aria-hidden="true" />
                  <span>Add Pending</span>
                </button>
              </div>

              {pendingError && (
                <p role="alert" className="text-[11px] font-medium text-red-600">
                  {pendingError}
                </p>
              )}
            </form>

            <div
              data-testid="pending-verify-list"
              className="washi-scroll mt-3 flex flex-col gap-2 max-h-60 overflow-y-auto pr-0.5"
            >
              {pendingList.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-3.5 text-center text-xs text-slate-500">
                  No pending verifications right now.
                </p>
              ) : (
                pendingList.map((item) => {
                  const actor =
                    characters.find((c) => c.id === item.characterId) ||
                    pendingChar;
                  return (
                    <article
                      key={item.id}
                      className="rounded-lg border border-slate-200/90 bg-slate-50/50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CharacterAvatar
                            character={actor}
                            nameFallback={item.characterName}
                            size="xs"
                          />
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {item.characterName}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                            {formatRelativeOrTime(item.createdAt)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onPromotePending(item.id)}
                          title="Approve and move to Success Verify"
                          className="inline-flex items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap shrink-0"
                        >
                          <span>Verify</span>
                          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="mt-1.5 text-[13px] leading-[1.45] text-slate-700">
                        <button
                          type="button"
                          onClick={() => onSelectKeywordFilter(item.keyword)}
                          className="mr-1 font-mono font-semibold text-[#1E3A5F] hover:underline"
                        >
                          @{item.keyword}
                        </button>
                        <RichMentionText
                          text={item.comment.replace(
                            new RegExp(`@${item.keyword}\\s*`, 'i'),
                            ''
                          )}
                          activeFilter={activeKeywordFilter}
                          onKeywordClick={onSelectKeywordFilter}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-slate-200/70 pt-1.5">
                        <button
                          type="button"
                          onClick={() => onMoveVerifyToRoom(item.id)}
                          aria-label={`Move pending @${item.keyword} to Room`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
                        >
                          <Archive className="h-3 w-3" aria-hidden="true" />
                          <span>Room</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteVerifyItem(item.id)}
                          aria-label={`Delete pending @${item.keyword}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        )}
      </section>

      {/* Bottom Right Box: Success Verify */}
      <section
        aria-label="Success Verify"
        className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs"
      >
        <div
          className={`flex items-center justify-between gap-2 ${
            successFolded ? '' : 'pb-3 border-b border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2
              className="h-4 w-4 text-emerald-600 shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 truncate">
              Success Verify
            </h2>
            <span className="rounded-md bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-800 tabular-nums">
              {successList.length}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-1 text-xs text-slate-600 mr-1">
              <CharacterAvatar character={successChar} size="2xs" />
              <span className="font-medium text-[11.5px]">
                {successChar?.name || 'Sadik'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSuccessFolded((prev) => !prev)}
              aria-expanded={!successFolded}
              aria-label={
                successFolded ? 'Expand Success Verify' : 'Fold Success Verify'
              }
              title={
                successFolded ? 'Expand Success Verify' : 'Fold Success Verify'
              }
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              {successFolded ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {!successFolded && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitInline('success');
              }}
              className="mt-3 space-y-2"
            >
              <MentionTextarea
                id="inline-success-verify-input"
                ariaLabel="Add success verify comment with @keyword"
                value={successComment}
                onChange={(val) => {
                  setSuccessComment(val);
                  if (successError) setSuccessError(null);
                }}
                keywords={keywords}
                rows={2}
                placeholder="Type @keyword & verified note (Enter to add)..."
                className="bg-slate-50/70 text-[13px]"
                onSubmitShortcut={() => submitInline('success')}
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  Syncs to Feed as {successChar?.name || 'Sadik'}
                </span>
                <button
                  type="submit"
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
                >
                  <Send className="h-3 w-3" aria-hidden="true" />
                  <span>Add Success</span>
                </button>
              </div>

              {successError && (
                <p role="alert" className="text-[11px] font-medium text-red-600">
                  {successError}
                </p>
              )}
            </form>

            <div
              data-testid="success-verify-list"
              className="washi-scroll mt-3 flex flex-col gap-2 max-h-60 overflow-y-auto pr-0.5"
            >
              {successList.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-3.5 text-center text-xs text-slate-500">
                  No completed verifications yet.
                </p>
              ) : (
                successList.map((item) => {
                  const actor =
                    characters.find((c) => c.id === item.characterId) ||
                    successChar;
                  return (
                    <article
                      key={item.id}
                      className="rounded-lg border border-slate-200/90 bg-slate-50/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CharacterAvatar
                            character={actor}
                            nameFallback={item.characterName}
                            size="xs"
                          />
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {item.characterName}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {formatRelativeOrTime(item.createdAt)}
                        </span>
                      </div>

                      <div className="mt-1.5 text-[13px] leading-[1.45] text-slate-700">
                        <button
                          type="button"
                          onClick={() => onSelectKeywordFilter(item.keyword)}
                          className="mr-1 font-mono font-semibold text-[#1E3A5F] hover:underline"
                        >
                          @{item.keyword}
                        </button>
                        <RichMentionText
                          text={item.comment.replace(
                            new RegExp(`@${item.keyword}\\s*`, 'i'),
                            ''
                          )}
                          activeFilter={activeKeywordFilter}
                          onKeywordClick={onSelectKeywordFilter}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-slate-200/70 pt-1.5">
                        <button
                          type="button"
                          onClick={() => onMoveVerifyToRoom(item.id)}
                          aria-label={`Move verified @${item.keyword} to Room`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
                        >
                          <Archive className="h-3 w-3" aria-hidden="true" />
                          <span>Room</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteVerifyItem(item.id)}
                          aria-label={`Delete verified @${item.keyword}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        )}
      </section>
    </aside>
  );
}
