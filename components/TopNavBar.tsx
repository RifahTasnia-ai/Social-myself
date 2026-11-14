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
  const secondaryActionBtn =
    'inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 text-[12.5px] font-medium text-slate-700 shadow-2xs transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] whitespace-nowrap shrink-0';

  return (
    <header className="lg:sticky lg:top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-2.5 sm:px-6 lg:h-14 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8 lg:py-0">
        {/* Top Row on Mobile / Left + Right Zones on Desktop */}
        <div className="flex items-center justify-between gap-4 lg:contents">
          {/* Zone 1: Single-element Brand Wordmark */}
          <Link
            href="/"
            className="font-display text-[22px] font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 lg:order-1"
          >
            Kotonoha
          </Link>

          {/* Zone 3: Room Archive Link + Settings */}
          <div className="flex items-center gap-2 shrink-0 lg:order-3">
            {isRoomPage ? (
              <Link
                href="/"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Studio</span>
              </Link>
            ) : (
              <Link
                href="/room"
                aria-label={`Open Room archive (${archivedCount} archived)`}
                className={secondaryActionBtn}
              >
                <Archive className="h-3.5 w-3.5 text-[#1E3A5F]" aria-hidden="true" />
                <span>Room</span>
                {archivedCount > 0 && (
                  <span className="font-mono text-[11px] font-semibold text-[#1E3A5F] tabular-nums">
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
                className={secondaryActionBtn}
              >
                <Settings className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* Zone 2: Studio Quick Actions (1 Primary CTA + Clean Secondary Action Group) */}
        {!isRoomPage && onOpenModal ? (
          <nav
            aria-label="Workspace actions"
            className="washi-scroll flex items-center gap-2 overflow-x-auto py-0.5 lg:order-2"
          >
            <button
              type="button"
              onClick={() => onOpenModal('new_keyword')}
              aria-pressed={activeModal === 'new_keyword'}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 text-[12.5px] font-semibold text-white shadow-2xs transition-colors duration-150 hover:bg-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>New Keyword</span>
            </button>

            <div className="h-4 w-px bg-slate-200 shrink-0" aria-hidden="true" />

            <button
              type="button"
              onClick={() => onOpenModal('order')}
              aria-pressed={activeModal === 'order'}
              className={secondaryActionBtn}
            >
              <ClipboardList className="h-3.5 w-3.5 text-[#1E3A5F]" aria-hidden="true" />
              <span>Order</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('pending_verify')}
              aria-pressed={activeModal === 'pending_verify'}
              className={secondaryActionBtn}
            >
              <Clock className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              <span>Pending Verify</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('success_verify')}
              aria-pressed={activeModal === 'success_verify'}
              className={secondaryActionBtn}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>Success Verify</span>
            </button>
          </nav>
        ) : (
          <div className="hidden lg:flex lg:order-2 items-center text-xs text-slate-500">
            <span>Room Archive · Completed Threads &amp; Verification History</span>
          </div>
        )}
      </div>
    </header>
  );
}
