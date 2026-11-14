'use client';

import React, { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  SlidersHorizontal,
  PanelLeftClose,
  Maximize2,
} from 'lucide-react';
import type {
  KeywordCardBorder,
  KeywordCardPadding,
  KeywordCardPrefs,
  KeywordCardSizePreset,
  KeywordCardSpacing,
  KeywordItem,
  KeywordTone,
} from '@/lib/workspace-store';

interface KeywordSidebarProps {
  keywords: KeywordItem[];
  activeKeywordFilter: string | null;
  cardPrefs: KeywordCardPrefs;
  onToggleCollapse?: () => void;
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
  { bg: string; hairline: string; framed: string; dashed: string; dot: string }
> = {
  sky: {
    bg: 'hatch-sky',
    hairline: 'border border-sky-200/80',
    framed: 'border-2 border-sky-300',
    dashed: 'border border-dashed border-sky-300',
    dot: 'bg-sky-500',
  },
  sage: {
    bg: 'hatch-sage',
    hairline: 'border border-emerald-200/80',
    framed: 'border-2 border-emerald-300',
    dashed: 'border border-dashed border-emerald-300',
    dot: 'bg-emerald-500',
  },
  lavender: {
    bg: 'hatch-lavender',
    hairline: 'border border-violet-200/80',
    framed: 'border-2 border-violet-300',
    dashed: 'border border-dashed border-violet-300',
    dot: 'bg-violet-500',
  },
  teal: {
    bg: 'hatch-teal',
    hairline: 'border border-teal-200/80',
    framed: 'border-2 border-teal-300',
    dashed: 'border border-dashed border-teal-300',
    dot: 'bg-teal-500',
  },
  sand: {
    bg: 'hatch-sand',
    hairline: 'border border-amber-200/80',
    framed: 'border-2 border-amber-300',
    dashed: 'border border-dashed border-amber-300',
    dot: 'bg-amber-500',
  },
};

const SPACING_CLASSES: Record<KeywordCardSpacing, string> = {
  compact: 'gap-2',
  balanced: 'gap-3',
  airy: 'gap-4',
};

const PADDING_CLASSES: Record<KeywordCardPadding, string> = {
  tight: 'px-3 py-2.5',
  standard: 'p-3.5',
  generous: 'p-4',
};

const SIZE_PRESET_CLASSES: Record<KeywordCardSizePreset, string> = {
  compact: 'min-h-[50px]',
  default: 'min-h-[58px]',
  large: 'min-h-[84px]',
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
  onToggleCollapse,
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

  const currentSizePreset: KeywordCardSizePreset =
    cardPrefs.sizePreset ?? 'default';
  const isResizable = Boolean(cardPrefs.resizable);

  function submitQuickKeyword() {
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

  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitQuickKeyword();
  }

  return (
    <aside
      aria-label="Keywords directory"
      className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs"
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
              Keywords
            </h2>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
              {keywords.length}
            </span>
          </div>
          <p className="mt-0.5 text-[11.5px] text-slate-500">
            Click any @handle to filter feed
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setCustomizeOpen((prev) => !prev)}
            aria-expanded={customizeOpen}
            aria-label="Customize keyword cards"
            title="Customize card size, margins, and borders"
            className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11.5px] font-medium transition-colors whitespace-nowrap shrink-0 ${
              customizeOpen
                ? 'border-[#0F172A] bg-[#0F172A] text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
            <span>Size</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setComposerOpen((prev) => !prev);
              setError(null);
            }}
            aria-expanded={composerOpen}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] whitespace-nowrap shrink-0"
          >
            {composerOpen ? (
              <>
                <X className="h-3 w-3" aria-hidden="true" />
                <span>Close</span>
              </>
            ) : (
              <>
                <Plus className="h-3 w-3 text-[#1E3A5F]" aria-hidden="true" />
                <span>Add</span>
              </>
            )}
          </button>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Minimize Keywords panel"
              title="Hide Keywords panel to focus on Feed"
              className="hidden lg:inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] shrink-0"
            >
              <PanelLeftClose className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Header Quick Customize Panel for Box Size, Margins, Padding, and Border Style */}
      {customizeOpen && (
        <div
          data-testid="keyword-customize-panel"
          className="mt-3 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">
              Card Size, Margin &amp; Border
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdateCardPrefs({
                  spacing: 'compact',
                  padding: 'tight',
                  borderStyle: 'hairline',
                  sizePreset: 'default',
                  resizable: false,
                })
              }
              className="text-[11px] font-medium text-[#1E3A5F] hover:underline"
            >
              Reset Default
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-600">
                Box Height Preset
              </span>
              <button
                type="button"
                onClick={() => onUpdateCardPrefs({ resizable: !isResizable })}
                aria-pressed={isResizable}
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium transition-colors ${
                  isResizable
                    ? 'bg-[#1E3A5F]/12 text-[#1E3A5F]'
                    : 'text-slate-500 hover:bg-slate-200/60'
                }`}
              >
                <Maximize2 className="h-2.5 w-2.5" aria-hidden="true" />
                <span>{isResizable ? 'Drag-Resize On' : 'Drag-Resize'}</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200/70 p-1">
              {(['compact', 'default', 'large'] as KeywordCardSizePreset[]).map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onUpdateCardPrefs({ sizePreset: preset })}
                    className={`rounded-md py-1 text-[11px] font-medium capitalize transition-colors ${
                      currentSizePreset === preset
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {preset}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-slate-600 mb-1">
              Card Margin (Gap)
            </span>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200/70 p-1">
              {(['compact', 'balanced', 'airy'] as KeywordCardSpacing[]).map(
                (val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onUpdateCardPrefs({ spacing: val })}
                    className={`rounded-md py-1 text-[11px] font-medium capitalize transition-colors ${
                      cardPrefs.spacing === val
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {val}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-slate-600 mb-1">
              Inner Padding
            </span>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200/70 p-1">
              {(['tight', 'standard', 'generous'] as KeywordCardPadding[]).map(
                (val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onUpdateCardPrefs({ padding: val })}
                    className={`rounded-md py-1 text-[11px] font-medium capitalize transition-colors ${
                      cardPrefs.padding === val
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {val}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-slate-600 mb-1">
              Border Style
            </span>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/70 p-1">
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
                  className={`rounded-md py-1 text-[11px] font-medium transition-colors ${
                    cardPrefs.borderStyle === opt.value
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
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
          className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
        >
          <div>
            <label
              htmlFor="quick-kw-handle"
              className="block text-[11px] font-medium text-slate-600 mb-1"
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
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="quick-kw-summary"
              className="block text-[11px] font-medium text-slate-600 mb-1"
            >
              Short summary (Enter to add)
            </label>
            <textarea
              id="quick-kw-summary"
              rows={2}
              value={summaryInput}
              onChange={(e) => {
                setSummaryInput(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  submitQuickKeyword();
                }
              }}
              placeholder="Brief work note..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div
              className="flex items-center gap-1.5"
              role="radiogroup"
              aria-label="Card tint"
            >
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={toneInput === opt.value}
                  aria-label={opt.label}
                  onClick={() => setToneInput(opt.value)}
                  className={`h-4 w-4 rounded-full ${opt.dot} transition-transform ${
                    toneInput === opt.value
                      ? 'ring-2 ring-slate-900 ring-offset-1 scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>

            <button
              type="submit"
              className="rounded-lg bg-[#0F172A] px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#1E293B] whitespace-nowrap shrink-0"
            >
              Add Keyword
            </button>
          </div>

          {error && (
            <p role="alert" className="text-[11px] font-medium text-red-600">
              {error}
            </p>
          )}
        </form>
      )}

      {/* Keyword Cards */}
      <div
        data-testid="keyword-list"
        data-spacing={cardPrefs.spacing}
        data-border={cardPrefs.borderStyle}
        data-size-preset={currentSizePreset}
        className={`washi-scroll mt-3 flex flex-col ${SPACING_CLASSES[cardPrefs.spacing]} lg:max-h-[calc(100vh-195px)] lg:overflow-y-auto lg:pr-0.5`}
      >
        {keywords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center">
            <p className="text-sm font-medium text-slate-900">No keywords yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Add a keyword handle and summary to start mentioning it in your feed.
            </p>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="mt-3 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E293B]"
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
                  SIZE_PRESET_CLASSES[currentSizePreset]
                } ${
                  isResizable ? 'resize-y overflow-y-auto' : ''
                } ${
                  isFiltered
                    ? 'ring-2 ring-[#1E3A5F] shadow-2xs'
                    : 'hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
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
                        ? 'text-[#1E3A5F] underline underline-offset-4'
                        : 'text-slate-900 hover:text-[#1E3A5F]'
                    }`}
                  >
                    @{item.keyword}
                  </button>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditKeyword(item)}
                      aria-label={`Edit @${item.keyword}`}
                      title="Edit keyword & log diff to feed"
                      className="rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]"
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteKeyword(item.id)}
                      aria-label={`Delete @${item.keyword}`}
                      title="Delete keyword"
                      className="rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p
                  className={`mt-1 text-[12.5px] leading-[1.45] text-slate-600 ${
                    currentSizePreset === 'compact' && !isResizable
                      ? 'line-clamp-1'
                      : ''
                  }`}
                >
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
