'use client';

import React, { useRef, useState } from 'react';
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
  onSubmitShortcut?: () => void;
}

export default function MentionTextarea({
  id,
  value,
  onChange,
  keywords,
  placeholder,
  rows = 3,
  className = '',
  ariaLabel,
  onSubmitShortcut,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

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
        textareaRef.current.focus();
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
        setMentionQuery(null);
        return;
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && onSubmitShortcut) {
      e.preventDefault();
      onSubmitShortcut();
    }
  }

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        id={id}
        aria-label={ariaLabel}
        rows={rows}
        value={value}
        placeholder={placeholder}
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
        className={`w-full resize-none rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-3.5 py-2.5 text-sm leading-relaxed text-[#1A1D24] placeholder:text-[#7D8390] focus:border-[#2D4B73] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4B73]/20 transition-colors ${className}`}
      />

      {showSuggestions && (
        <div
          role="listbox"
          aria-label="Keyword suggestions"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-[#DCD6CA] bg-white p-1.5 shadow-lg"
        >
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-medium text-[#6B7180]">
            <span>Select keyword mention</span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setMentionQuery(null);
              }}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#575D6B] hover:bg-[#F3EFE6] hover:text-[#1A1D24]"
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
              className={`flex w-full items-start justify-between gap-3 rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                idx === selectedIndex
                  ? 'bg-[#2D4B73]/10 text-[#1A1D24]'
                  : 'text-[#3A404D] hover:bg-[#F6F3EC]'
              }`}
            >
              <span className="font-mono font-medium text-[#2D4B73] shrink-0">
                @{kw.keyword}
              </span>
              <span className="truncate text-[#6B7180]">{kw.summary}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
