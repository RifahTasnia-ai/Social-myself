'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { KeywordItem } from '@/lib/workspace-store';

interface MentionTextareaProps {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  keywords: KeywordItem[];
  placeholder?: string;
  rows?: number;
  className?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  autoExpand?: boolean;
  variant?: 'boxed' | 'borderless' | 'compact';
  externalRef?: (el: HTMLTextAreaElement | null) => void;
  onSubmitShortcut?: () => void;
  onCancel?: () => void;
}

export default function MentionTextarea({
  id,
  value,
  onChange,
  keywords,
  placeholder,
  rows = 2,
  className = '',
  ariaLabel,
  autoFocus = false,
  autoExpand = true,
  variant = 'boxed',
  externalRef,
  onSubmitShortcut,
  onCancel,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const baseHeightPx =
    variant === 'compact' ? 32 : rows === 1 ? 34 : 54;
  const maxHeightPx =
    variant === 'compact' ? 108 : 160;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const charThreshold = variant === 'compact' ? 58 : 95;
    const isMultiLine =
      value.includes('\n') || value.length > charThreshold;

    if (!autoExpand || !isMultiLine) {
      el.style.height = `${baseHeightPx}px`;
      return;
    }

    el.style.height = `${baseHeightPx}px`;
    const nextHeight = Math.min(
      Math.max(el.scrollHeight, baseHeightPx),
      maxHeightPx
    );
    el.style.height = `${nextHeight}px`;
  }, [value, autoExpand, variant, baseHeightPx, maxHeightPx]);

  const filteredKeywords =
    mentionQuery === null
      ? []
      : keywords
          .filter((k) =>
            k.keyword.toLowerCase().includes(mentionQuery.toLowerCase())
          )
          .slice(0, 6);

  const isExactUniqueMatch =
    mentionQuery !== null &&
    filteredKeywords.length === 1 &&
    filteredKeywords[0].keyword.toLowerCase() === mentionQuery.toLowerCase();

  const showSuggestions =
    mentionQuery !== null && filteredKeywords.length > 0 && !isExactUniqueMatch;

  function detectMentionAtCaret(text: string, caretPos: number) {
    const textBeforeCaret = text.slice(0, caretPos);
    const match = textBeforeCaret.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);
    if (match) {
      const query = match[1];
      const atIdx = textBeforeCaret.lastIndexOf('@');
      setMentionQuery(query);
      setMentionStart(atIdx);
      setSelectedIndex(0);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  }

  function insertMention(handle: string) {
    const el = textareaRef.current;
    if (!el || mentionStart < 0) return;

    const caretPos = el.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(caretPos);
    const inserted = `@${handle} `;
    const nextValue = `${before}${inserted}${after}`;
    onChange(nextValue);
    setMentionQuery(null);
    setMentionStart(-1);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const nextPos = before.length + inserted.length;
        textareaRef.current.focus({ preventScroll: true });
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredKeywords.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + filteredKeywords.length) % filteredKeywords.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = filteredKeywords[selectedIndex] ?? filteredKeywords[0];
        if (chosen) insertMention(chosen.keyword);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
      return;
    }

    // Universal Enter to submit (Shift+Enter inserts a newline)
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      onSubmitShortcut
    ) {
      e.preventDefault();
      onSubmitShortcut();
    }
  }

  const variantClasses =
    variant === 'borderless'
      ? 'block w-full resize-none border-0 bg-transparent px-0 py-1 text-[15px] leading-[1.5] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none'
      : variant === 'compact'
      ? 'block w-full resize-none border-0 bg-transparent px-1.5 py-[5px] text-[13.5px] leading-[22px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none'
      : 'block w-full resize-none rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-[13px] leading-[1.45] text-[#0F172A] placeholder:text-[#64748B] focus:border-[#1E3A5F] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/15 transition-colors';

  return (
    <div className="relative w-full">
      <textarea
        ref={(node) => {
          textareaRef.current = node;
          externalRef?.(node);
        }}
        id={id}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        rows={rows}
        value={value}
        placeholder={placeholder}
        style={{ height: `${baseHeightPx}px` }}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          detectMentionAtCaret(next, e.target.selectionStart ?? next.length);
        }}
        onClick={(e) => {
          const el = e.currentTarget;
          detectMentionAtCaret(el.value, el.selectionStart ?? el.value.length);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setTimeout(() => setMentionQuery(null), 160);
        }}
        className={`${variantClasses} ${className}`}
      />

      {showSuggestions && (
        <div
          role="listbox"
          aria-label="Keyword suggestions"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-medium text-slate-500">
            <span>Mention @keyword (Enter / Tab)</span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setMentionQuery(null);
              }}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              Esc
            </button>
          </div>
          {filteredKeywords.map((kw, idx) => (
            <button
              key={kw.id}
              type="button"
              role="option"
              aria-selected={idx === selectedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(kw.keyword);
              }}
              className={`flex w-full items-start justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                idx === selectedIndex
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="font-mono font-semibold text-[#1E3A5F] shrink-0">
                @{kw.keyword}
              </span>
              <span className="truncate text-slate-500">{kw.summary}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
