'use client';

import React from 'react';
import Link from 'next/link';
import {
  Plus,
  ClipboardList,
  Clock,
  CheckCircle2,
  Settings,
  Archive,
  ArrowLeft,
} from 'lucide-react';

export type ModalKind =
  | 'new_keyword'
  | 'order'
  | 'pending_verify'
  | 'success_verify'
  | 'settings'
  | null;

interface TopNavBarProps {
  onOpenModal?: (kind: Exclude<ModalKind, null>) => void;
  activeModal?: ModalKind;
  archivedCount?: number;
  isRoomPage?: boolean;
}

export default function TopNavBar({
  onOpenModal,
  activeModal = null,
  archivedCount = 0,
  isRoomPage = false,
}: TopNavBarProps) {
  const actionBtnBase =
    'inline-flex items-center gap-1.5 rounded-[3px] border border-[#223B5C] bg-[#2D4B73] px-3.5 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#223B5C] active:bg-[#1B304B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4B73] focus-visible:ring-offset-1 whitespace-nowrap shrink-0';

  return (
    <header className="lg:sticky lg:top-0 z-30 border-b border-[#DCD6CA] bg-[#FBF9F5]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2.5 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        {/* Top Row on Mobile / Left + Right Zones on Desktop */}
        <div className="flex items-center justify-between gap-4 lg:contents">
          {/* Zone 1: Single-element Brand Wordmark */}
          <Link
            href="/"
            className="font-display text-2xl font-semibold tracking-tight text-[#1A1D24] whitespace-nowrap shrink-0 lg:order-1"
          >
            Kotonoha
          </Link>

          {/* Zone 3: Room Archive Link + Settings */}
          <div className="flex items-center gap-2 shrink-0 lg:order-3">
            {isRoomPage ? (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-[3px] border border-[#223B5C] bg-[#2D4B73] px-3.5 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#223B5C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4B73] whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Studio</span>
              </Link>
            ) : (
              <Link
                href="/room"
                aria-label={`Open Room archive (${archivedCount} archived)`}
                className="inline-flex items-center gap-1.5 rounded-[3px] border border-[#D5CFC2] bg-white px-3.5 py-2 text-xs font-semibold text-[#1A1D24] transition-colors duration-150 hover:bg-[#F4F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4B73] whitespace-nowrap shrink-0"
              >
                <Archive className="h-3.5 w-3.5 text-[#2D4B73]" aria-hidden="true" />
                <span>Room</span>
                {archivedCount > 0 && (
                  <span className="font-mono text-[11px] text-[#2D4B73] tabular-nums">
                    ({archivedCount})
                  </span>
                )}
              </Link>
            )}

            {onOpenModal && (
              <button
                type="button"
                onClick={() => onOpenModal('settings')}
                aria-label="Open character and workspace settings"
                className="inline-flex items-center gap-2 rounded-[3px] border border-[#D5CFC2] bg-white px-3.5 py-2 text-xs font-semibold text-[#1A1D24] transition-colors duration-150 hover:bg-[#F4F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4B73] whitespace-nowrap shrink-0"
              >
                <Settings className="h-3.5 w-3.5 text-[#575D6B]" aria-hidden="true" />
                <span>Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* Zone 2: Unified Deep Indigo Rectangular Action Buttons */}
        {!isRoomPage && onOpenModal ? (
          <nav
            aria-label="Workspace actions"
            className="washi-scroll flex items-center gap-2 overflow-x-auto py-0.5 lg:order-2"
          >
            <button
              type="button"
              onClick={() => onOpenModal('new_keyword')}
              aria-pressed={activeModal === 'new_keyword'}
              className={actionBtnBase}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>New Keyword</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('order')}
              aria-pressed={activeModal === 'order'}
              className={actionBtnBase}
            >
              <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Order</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('pending_verify')}
              aria-pressed={activeModal === 'pending_verify'}
              className={actionBtnBase}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pending Verify</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('success_verify')}
              aria-pressed={activeModal === 'success_verify'}
              className={actionBtnBase}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Success Verify</span>
            </button>
          </nav>
        ) : (
          <div className="hidden lg:flex lg:order-2 items-center text-xs text-[#616775]">
            <span>Room Archive · Completed Threads &amp; Verification History</span>
          </div>
        )}
      </div>
    </header>
  );
}
