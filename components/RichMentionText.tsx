'use client';

import React from 'react';

interface RichMentionTextProps {
  text: string;
  activeFilter?: string | null;
  onKeywordClick?: (keyword: string) => void;
  className?: string;
}

export default function RichMentionText({
  text,
  activeFilter,
  onKeywordClick,
  className = '',
}: RichMentionTextProps) {
  const parts = text.split(/(@[a-zA-Z0-9_-]+)/g);

  return (
    <span className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((part, idx) => {
        if (part.startsWith('@') && part.length > 1) {
          const handle = part.slice(1);
          const isActive =
            activeFilter && activeFilter.toLowerCase() === handle.toLowerCase();

          return (
            <button
              key={`${handle}-${idx}`}
              type="button"
              onClick={() => onKeywordClick?.(handle)}
              title={`Filter feed by @${handle}`}
              className={`inline-flex items-baseline font-mono text-[0.9em] font-medium transition-colors rounded px-1 py-0.5 mx-0.5 ${
                isActive
                  ? 'bg-[#2D4B73] text-white'
                  : 'bg-[#2D4B73]/10 text-[#2D4B73] hover:bg-[#2D4B73]/20'
              }`}
            >
              {part}
            </button>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
}
