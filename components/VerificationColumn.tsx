'use client';

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Send,
  Archive,
  Trash2,
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
  onSelectKeywordFilter,
  onAddVerifyEntry,
  onPromotePending,
  onMoveVerifyToRoom,
  onDeleteVerifyItem,
}: VerificationColumnProps) {
  const [pendingComment, setPendingComment] = useState('');
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [successComment, setSuccessComment] = useState('');
  const [successError, setSuccessError] = useState<string | null>(null);

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
        className="flex flex-col rounded-2xl border border-[#DFC086] bg-[#FCF7EC] p-4"
      >
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#EBDAB9]">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#B7791F]" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-[#1A1D24]">
              Pending Verify
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#7A4D0B]">
            <CharacterAvatar character={pendingChar} size="xs" />
            <span className="font-medium">{pendingChar?.name || 'Maruf'}</span>
          </div>
        </div>

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
            placeholder="Type @keyword & pending note..."
            className="bg-white text-xs"
            onSubmitShortcut={() => submitInline('pending')}
          />

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#7A4D0B]">
              Syncs to Feed as {pendingChar?.name || 'Maruf'}
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-[3px] bg-[#B7791F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#9C6516] whitespace-nowrap shrink-0"
            >
              <Send className="h-3 w-3" aria-hidden="true" />
              <span>Add Pending</span>
            </button>
          </div>

          {pendingError && (
            <p role="alert" className="text-[11px] font-medium text-[#B91C1C]">
              {pendingError}
            </p>
          )}
        </form>

        <div
          data-testid="pending-verify-list"
          className="washi-scroll mt-3 flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-0.5"
        >
          {pendingList.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#DFC086] bg-white/60 px-3 py-4 text-center text-xs text-[#7A4D0B]">
              No pending verifications right now.
            </p>
          ) : (
            pendingList.map((item) => {
              const actor =
                characters.find((c) => c.id === item.characterId) || pendingChar;
              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-[#E8D5AF] bg-white p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CharacterAvatar
                        character={actor}
                        nameFallback={item.characterName}
                        size="xs"
                      />
                      <span className="text-xs font-semibold text-[#1A1D24] truncate">
                        {item.characterName}
                      </span>
                      <span className="font-mono text-[11px] text-[#7D8390] tabular-nums">
                        {formatRelativeOrTime(item.createdAt)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onPromotePending(item.id)}
                      title="Approve and move to Success Verify"
                      className="inline-flex items-center gap-0.5 rounded-[3px] border border-[#9CC5AE] bg-[#EAF4EE] px-2 py-0.5 text-[11px] font-medium text-[#1E523A] hover:bg-[#DCECE2] whitespace-nowrap shrink-0"
                    >
                      <span>Verify</span>
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-1.5 text-xs leading-relaxed text-[#3A404D]">
                    <button
                      type="button"
                      onClick={() => onSelectKeywordFilter(item.keyword)}
                      className="mr-1 font-mono font-semibold text-[#2D4B73] hover:underline"
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

                  <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-[#E8D5AF]/60 pt-2">
                    <button
                      type="button"
                      onClick={() => onMoveVerifyToRoom(item.id)}
                      aria-label={`Move pending @${item.keyword} to Room`}
                      className="inline-flex items-center gap-1 rounded-[3px] border border-[#D5CFC2] bg-[#FAF8F4] px-2 py-0.5 text-[11px] font-medium text-[#2D4B73] hover:bg-[#EDF4FA] whitespace-nowrap"
                    >
                      <Archive className="h-3 w-3" aria-hidden="true" />
                      <span>Room</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteVerifyItem(item.id)}
                      aria-label={`Delete pending @${item.keyword}`}
                      className="inline-flex items-center gap-1 rounded-[3px] border border-[#E5D7D5] bg-[#FDF6F5] px-2 py-0.5 text-[11px] font-medium text-[#9F3A26] hover:bg-[#FAE9E6] whitespace-nowrap"
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
      </section>

      {/* Bottom Right Box: Success Verify */}
      <section
        aria-label="Success Verify"
        className="flex flex-col rounded-2xl border border-[#A8CEB9] bg-[#F2F9F4] p-4"
      >
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#CFE5D8]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#2F6B4F]" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-[#1A1D24]">
              Success Verify
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#1E523A]">
            <CharacterAvatar character={successChar} size="xs" />
            <span className="font-medium">{successChar?.name || 'Sadik'}</span>
          </div>
        </div>

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
            placeholder="Type @keyword & verified note..."
            className="bg-white text-xs"
            onSubmitShortcut={() => submitInline('success')}
          />

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#1E523A]">
              Syncs to Feed as {successChar?.name || 'Sadik'}
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-[3px] bg-[#2F6B4F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#24563F] whitespace-nowrap shrink-0"
            >
              <Send className="h-3 w-3" aria-hidden="true" />
              <span>Add Success</span>
            </button>
          </div>

          {successError && (
            <p role="alert" className="text-[11px] font-medium text-[#B91C1C]">
              {successError}
            </p>
          )}
        </form>

        <div
          data-testid="success-verify-list"
          className="washi-scroll mt-3 flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-0.5"
        >
          {successList.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#A8CEB9] bg-white/60 px-3 py-4 text-center text-xs text-[#1E523A]">
              No completed verifications yet.
            </p>
          ) : (
            successList.map((item) => {
              const actor =
                characters.find((c) => c.id === item.characterId) || successChar;
              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-[#C6DFD0] bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CharacterAvatar
                        character={actor}
                        nameFallback={item.characterName}
                        size="xs"
                      />
                      <span className="text-xs font-semibold text-[#1A1D24] truncate">
                        {item.characterName}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-[#7D8390] tabular-nums">
                      {formatRelativeOrTime(item.createdAt)}
                    </span>
                  </div>

                  <div className="mt-1.5 text-xs leading-relaxed text-[#3A404D]">
                    <button
                      type="button"
                      onClick={() => onSelectKeywordFilter(item.keyword)}
                      className="mr-1 font-mono font-semibold text-[#2D4B73] hover:underline"
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

                  <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-[#C6DFD0]/70 pt-2">
                    <button
                      type="button"
                      onClick={() => onMoveVerifyToRoom(item.id)}
                      aria-label={`Move verified @${item.keyword} to Room`}
                      className="inline-flex items-center gap-1 rounded-[3px] border border-[#D5CFC2] bg-[#FAF8F4] px-2 py-0.5 text-[11px] font-medium text-[#2D4B73] hover:bg-[#EDF4FA] whitespace-nowrap"
                    >
                      <Archive className="h-3 w-3" aria-hidden="true" />
                      <span>Room</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteVerifyItem(item.id)}
                      aria-label={`Delete verified @${item.keyword}`}
                      className="inline-flex items-center gap-1 rounded-[3px] border border-[#E5D7D5] bg-[#FDF6F5] px-2 py-0.5 text-[11px] font-medium text-[#9F3A26] hover:bg-[#FAE9E6] whitespace-nowrap"
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
      </section>
    </aside>
  );
}
