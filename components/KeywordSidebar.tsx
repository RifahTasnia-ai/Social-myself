'use client';

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, SlidersHorizontal } from 'lucide-react';
import type {
  KeywordCardBorder,
  KeywordCardPadding,
  KeywordCardPrefs,
  KeywordCardSpacing,
  KeywordItem,
  KeywordTone,
} from '@/lib/workspace-store';

interface KeywordSidebarProps {
  keywords: KeywordItem[];
  activeKeywordFilter: string | null;
  cardPrefs: KeywordCardPrefs;
  onUpdateCardPrefs: (patch: Partial<KeywordCardPrefs>) => void;
  onSelectFilter: (keyword: string | null) => void;
  onQuickAddKeyword: (input: {
    keyword: string;
    summary: string;
    tone: KeywordTone;
  }) => { ok: true } | { ok: false; error: string };
  onEditKeyword: (item: KeywordItem) => void;
  onDeleteKeyword: (id: string) => void;
}

const TONE_SURFACES: Record<
  KeywordTone,
  { bg: string; hairline: string; framed: string; dashed: string }
> = {
  sky: {
    bg: 'hatch-sky',
    hairline: 'border border-[#BDD4E8]',
    framed: 'border-2 border-[#7FA8CE]',
    dashed: 'border border-dashed border-[#8DB3D6]',
  },
  sage: {
    bg: 'hatch-sage',
    hairline: 'border border-[#BBD6C3]',
    framed: 'border-2 border-[#7FB18E]',
    dashed: 'border border-dashed border-[#8DBB9A]',
  },
  lavender: {
    bg: 'hatch-lavender',
    hairline: 'border border-[#CFC6E4]',
    framed: 'border-2 border-[#9B8CC6]',
    dashed: 'border border-dashed border-[#A699CE]',
  },
  teal: {
    bg: 'hatch-teal',
    hairline: 'border border-[#B7DADC]',
    framed: 'border-2 border-[#71ACB0]',
    dashed: 'border border-dashed border-[#82B7BB]',
  },
  sand: {
    bg: 'hatch-sand',
    hairline: 'border border-[#E2CFAF]',
    framed: 'border-2 border-[#C7A167]',
    dashed: 'border border-dashed border-[#CFAF7A]',
  },
};

const SPACING_CLASSES: Record<KeywordCardSpacing, string> = {
  compact: 'gap-2',
  balanced: 'gap-3.5',
  airy: 'gap-5',
};

const PADDING_CLASSES: Record<KeywordCardPadding, string> = {
  tight: 'p-2.5',
  standard: 'p-4',
  generous: 'p-5',
};

const TONE_OPTIONS: { value: KeywordTone; label: string; dot: string }[] = [
  { value: 'sky', label: 'Sora Sky', dot: 'bg-[#7DA9D1]' },
  { value: 'sage', label: 'Wakaba Sage', dot: 'bg-[#7BB38C]' },
  { value: 'lavender', label: 'Fuji Lavender', dot: 'bg-[#9E8EC7]' },
  { value: 'teal', label: 'Asagi Teal', dot: 'bg-[#68B0B5]' },
  { value: 'sand', label: 'Kinari Sand', dot: 'bg-[#CFA56B]' },
];

export default function KeywordSidebar({
  keywords,
  activeKeywordFilter,
  cardPrefs,
  onUpdateCardPrefs,
  onSelectFilter,
  onQuickAddKeyword,
  onEditKeyword,
  onDeleteKeyword,
}: KeywordSidebarProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [handleInput, setHandleInput] = useState('');
  const [summaryInput, setSummaryInput] = useState('');
  const [toneInput, setToneInput] = useState<KeywordTone>('sky');
  const [error, setError] = useState<string | null>(null);

  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = onQuickAddKeyword({
      keyword: handleInput,
      summary: summaryInput,
      tone: toneInput,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setHandleInput('');
    setSummaryInput('');
    setError(null);
    setComposerOpen(false);
  }

  return (
    <aside
      aria-label="Keywords directory"
      className="flex flex-col rounded-2xl border border-[#DCD6CA] bg-[#FBF9F5] p-4"
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E7E2D8]">
        <div>
          <h2 className="font-display text-xl font-semibold text-[#1A1D24]">
            Keywords
          </h2>
          <p className="text-xs text-[#616775] tabular-nums">
            {keywords.length} active mentions
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setCustomizeOpen((prev) => !prev)}
            aria-expanded={customizeOpen}
            aria-label="Customize keyword cards"
            title="Customize card margins and borders"
            className={`inline-flex items-center gap-1 rounded-[3px] border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              customizeOpen
                ? 'border-[#2D4B73] bg-[#2D4B73] text-white'
                : 'border-[#D5CFC2] bg-white text-[#1A1D24] hover:bg-[#F3EFE6]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Customize</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setComposerOpen((prev) => !prev);
              setError(null);
            }}
            aria-expanded={composerOpen}
            className="inline-flex items-center gap-1 rounded-[3px] border border-[#D5CFC2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1A1D24] transition-colors hover:bg-[#F3EFE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4B73] whitespace-nowrap shrink-0"
          >
            {composerOpen ? (
              <>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Close</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 text-[#2D4B73]" aria-hidden="true" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Header Quick Customize Panel for Margins, Padding, and Border Style */}
      {customizeOpen && (
        <div
          data-testid="keyword-customize-panel"
          className="mt-3 space-y-3 rounded-xl border border-[#D5CFC2] bg-white p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1A1D24]">
              Card Margin &amp; Border
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdateCardPrefs({
                  spacing: 'balanced',
                  padding: 'standard',
                  borderStyle: 'hairline',
                })
              }
              className="text-[11px] font-medium text-[#2D4B73] hover:underline"
            >
              Reset Default
            </button>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-[#575D6B] mb-1">
              Card Margin (Gap)
            </span>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-[#F4F0E8] p-1">
              {(['compact', 'balanced', 'airy'] as KeywordCardSpacing[]).map(
                (val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onUpdateCardPrefs({ spacing: val })}
                    className={`rounded-[3px] py-1 text-[11px] font-medium capitalize transition-colors ${
                      cardPrefs.spacing === val
                        ? 'bg-[#2D4B73] text-white'
                        : 'text-[#575D6B] hover:text-[#1A1D24]'
                    }`}
                  >
                    {val}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-[#575D6B] mb-1">
              Inner Padding
            </span>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-[#F4F0E8] p-1">
              {(['tight', 'standard', 'generous'] as KeywordCardPadding[]).map(
                (val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onUpdateCardPrefs({ padding: val })}
                    className={`rounded-[3px] py-1 text-[11px] font-medium capitalize transition-colors ${
                      cardPrefs.padding === val
                        ? 'bg-[#2D4B73] text-white'
                        : 'text-[#575D6B] hover:text-[#1A1D24]'
                    }`}
                  >
                    {val}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-[#575D6B] mb-1">
              Border Style
            </span>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-[#F4F0E8] p-1">
              {(
                [
                  { value: 'hairline', label: 'Hairline' },
                  { value: 'framed', label: 'Framed' },
                  { value: 'dashed', label: 'Dashed' },
                  { value: 'borderless', label: 'Soft Wash' },
                ] as { value: KeywordCardBorder; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdateCardPrefs({ borderStyle: opt.value })}
                  className={`rounded-[3px] py-1 text-[11px] font-medium transition-colors ${
                    cardPrefs.borderStyle === opt.value
                      ? 'bg-[#2D4B73] text-white'
                      : 'text-[#575D6B] hover:text-[#1A1D24]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {composerOpen && (
        <form
          onSubmit={handleQuickSubmit}
          className="mt-3 space-y-2.5 rounded-xl border border-[#DCD6CA] bg-white p-3"
        >
          <div>
            <label
              htmlFor="quick-kw-handle"
              className="block text-[11px] font-medium text-[#575D6B] mb-1"
            >
              Keyword handle
            </label>
            <input
              id="quick-kw-handle"
              type="text"
              value={handleInput}
              onChange={(e) => {
                setHandleInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. motor-control"
              className="w-full rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-2.5 py-1.5 font-mono text-xs text-[#1A1D24] placeholder:text-[#8A909E] focus:border-[#2D4B73] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="quick-kw-summary"
              className="block text-[11px] font-medium text-[#575D6B] mb-1"
            >
              Short summary
            </label>
            <textarea
              id="quick-kw-summary"
              rows={2}
              value={summaryInput}
              onChange={(e) => {
                setSummaryInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Brief raw work note..."
              className="w-full resize-none rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-2.5 py-1.5 text-xs text-[#1A1D24] placeholder:text-[#8A909E] focus:border-[#2D4B73] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Card tint">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={toneInput === opt.value}
                  aria-label={opt.label}
                  onClick={() => setToneInput(opt.value)}
                  className={`h-5 w-5 rounded-full ${opt.dot} transition-transform ${
                    toneInput === opt.value
                      ? 'ring-2 ring-[#1A1D24] ring-offset-1 scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>

            <button
              type="submit"
              className="rounded-[3px] bg-[#2D4B73] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#223B5C] whitespace-nowrap shrink-0"
            >
              Add Keyword
            </button>
          </div>

          {error && (
            <p role="alert" className="text-[11px] font-medium text-[#B91C1C]">
              {error}
            </p>
          )}
        </form>
      )}

      {/* Keyword Cards — streamlined without bottom Mention/Filter bar */}
      <div
        data-testid="keyword-list"
        data-spacing={cardPrefs.spacing}
        data-border={cardPrefs.borderStyle}
        className={`washi-scroll mt-3.5 flex flex-col ${SPACING_CLASSES[cardPrefs.spacing]} lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-0.5`}
      >
        {keywords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D5CFC2] bg-white/60 p-6 text-center">
            <p className="text-sm font-medium text-[#1A1D24]">No keywords yet</p>
            <p className="mt-1 text-xs text-[#616775]">
              Add a keyword handle and summary to start mentioning it in your feed.
            </p>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="mt-3 rounded-[3px] bg-[#2D4B73] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#223B5C]"
            >
              Add First Keyword
            </button>
          </div>
        ) : (
          keywords.map((item) => {
            const isFiltered =
              activeKeywordFilter?.toLowerCase() === item.keyword.toLowerCase();
            const toneConfig = TONE_SURFACES[item.tone];
            const borderClass =
              cardPrefs.borderStyle === 'borderless'
                ? 'border border-transparent'
                : toneConfig[cardPrefs.borderStyle];

            return (
              <article
                key={item.id}
                className={`group rounded-lg transition-all duration-150 ${
                  toneConfig.bg
                } ${borderClass} ${PADDING_CLASSES[cardPrefs.padding]} ${
                  isFiltered
                    ? 'ring-2 ring-[#2D4B73] shadow-sm'
                    : 'hover:border-[#1A1D24]/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onSelectFilter(isFiltered ? null : item.keyword)
                    }
                    title={
                      isFiltered
                        ? 'Clear feed filter'
                        : `Filter feed by @${item.keyword}`
                    }
                    className={`text-left font-mono text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:underline break-all ${
                      isFiltered
                        ? 'text-[#2D4B73] underline underline-offset-4'
                        : 'text-[#1A1D24] hover:text-[#2D4B73]'
                    }`}
                  >
                    @{item.keyword}
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditKeyword(item)}
                      aria-label={`Edit @${item.keyword}`}
                      title="Edit keyword & log diff to feed"
                      className="rounded-md p-1.5 text-[#575D6B] transition-colors hover:bg-white/85 hover:text-[#1A1D24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4B73]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteKeyword(item.id)}
                      aria-label={`Delete @${item.keyword}`}
                      title="Delete keyword"
                      className="rounded-md p-1.5 text-[#575D6B] transition-colors hover:bg-white/85 hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p className="mt-1.5 text-xs leading-relaxed text-[#3A404D]">
                  {item.summary}
                </p>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}
