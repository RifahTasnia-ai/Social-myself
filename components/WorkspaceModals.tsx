'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Trash2,
  RotateCcw,
  Upload,
  Pencil,
} from 'lucide-react';
import type {
  Character,
  CharacterChannel,
  KeywordItem,
  KeywordTone,
  OrderMeta,
} from '@/lib/workspace-store';
import { compressImageFile } from '@/lib/image-utils';
import type {
  BackupSnapshotSummary,
  DatabaseStatusMeta,
} from '@/lib/backup-utils';
import type { ModalKind } from './TopNavBar';
import CharacterAvatar from './CharacterAvatar';
import DatabaseBackupSection from './DatabaseBackupSection';

interface WorkspaceModalsProps {
  activeModal: ModalKind;
  editingKeyword: KeywordItem | null;
  lightboxImage: string | null;
  keywords: KeywordItem[];
  characters: Character[];
  pendingCharacterId: string;
  successCharacterId: string;
  onClose: () => void;
  onCloseEditKeyword: () => void;
  onCloseLightbox: () => void;
  onAddKeyword: (input: {
    keyword: string;
    summary: string;
    tone: KeywordTone;
  }) => { ok: true } | { ok: false; error: string };
  onSaveEditKeyword: (input: {
    id: string;
    keyword: string;
    summary: string;
    tone: KeywordTone;
  }) => { ok: true } | { ok: false; error: string };
  onAddOrder: (input: {
    keyword: string;
    details: string;
    priority: OrderMeta['priority'];
    characterId: string;
  }) => { ok: true } | { ok: false; error: string };
  onAddVerify: (input: {
    status: 'pending' | 'success';
    keyword: string;
    comment: string;
    characterId: string;
  }) => { ok: true } | { ok: false; error: string };
  onAddCharacter: (input: {
    name: string;
    roleLabel: string;
    channel: CharacterChannel;
    color: string;
    customAvatar?: string;
  }) => { ok: true } | { ok: false; error: string };
  onUpdateCharacter: (input: {
    id: string;
    name: string;
    roleLabel: string;
    channel: CharacterChannel;
    color: string;
    customAvatar?: string;
  }) => { ok: true } | { ok: false; error: string };
  onRemoveCharacter: (id: string) => { ok: true } | { ok: false; error: string };
  onSetChannelDefault: (
    channel: 'pending' | 'success',
    characterId: string
  ) => void;
  onResetWorkspace: () => void;
  dbMeta?: DatabaseStatusMeta | null;
  snapshots?: BackupSnapshotSummary[];
  onReconnectDb?: () => Promise<void>;
  onCreateSnapshot?: (
    label?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onRestoreSnapshot?: (
    snapshotId: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onImportBackupJson?: (
    payload: unknown
  ) => Promise<{ ok: boolean; error?: string }>;
}

const TONE_OPTIONS: { value: KeywordTone; label: string; swatch: string }[] = [
  { value: 'sky', label: 'Sora Sky', swatch: 'bg-[#7DA9D1]' },
  { value: 'sage', label: 'Wakaba Sage', swatch: 'bg-[#7BB38C]' },
  { value: 'lavender', label: 'Fuji Lavender', swatch: 'bg-[#9E8EC7]' },
  { value: 'teal', label: 'Asagi Teal', swatch: 'bg-[#68B0B5]' },
  { value: 'sand', label: 'Kinari Sand', swatch: 'bg-[#CFA56B]' },
];

const PIGMENT_SWATCHES = [
  '#2D4B73',
  '#C84B31',
  '#2F6B4F',
  '#5B4B8A',
  '#B7791F',
  '#1F6B72',
  '#4A5568',
];

export default function WorkspaceModals({
  activeModal,
  editingKeyword,
  lightboxImage,
  keywords,
  characters,
  pendingCharacterId,
  successCharacterId,
  onClose,
  onCloseEditKeyword,
  onCloseLightbox,
  onAddKeyword,
  onSaveEditKeyword,
  onAddOrder,
  onAddVerify,
  onAddCharacter,
  onUpdateCharacter,
  onRemoveCharacter,
  onSetChannelDefault,
  onResetWorkspace,
  dbMeta = null,
  snapshots = [],
  onReconnectDb,
  onCreateSnapshot,
  onRestoreSnapshot,
  onImportBackupJson,
}: WorkspaceModalsProps) {
  const isOpen = Boolean(activeModal || editingKeyword || lightboxImage);

  // New Keyword state
  const [kwHandle, setKwHandle] = useState('');
  const [kwSummary, setKwSummary] = useState('');
  const [kwTone, setKwTone] = useState<KeywordTone>('sky');

  // Edit Keyword state
  const [editHandle, setEditHandle] = useState(editingKeyword?.keyword ?? '');
  const [editSummary, setEditSummary] = useState(editingKeyword?.summary ?? '');
  const [editTone, setEditTone] = useState<KeywordTone>(editingKeyword?.tone ?? 'sky');

  // Order state
  const [orderKw, setOrderKw] = useState(keywords[0]?.keyword ?? '');
  const [orderPriority, setOrderPriority] = useState<OrderMeta['priority']>('Normal');
  const [orderDetails, setOrderDetails] = useState('');
  const [orderCharId, setOrderCharId] = useState(characters[0]?.id ?? '');

  // Verify state (shared for pending_verify and success_verify)
  const [verifyKw, setVerifyKw] = useState(keywords[0]?.keyword ?? '');
  const [verifyComment, setVerifyComment] = useState('');
  const [verifyCharId, setVerifyCharId] = useState(
    activeModal === 'pending_verify'
      ? pendingCharacterId || characters[0]?.id || ''
      : successCharacterId || characters[0]?.id || ''
  );

  // Settings Add Character state
  const [charName, setCharName] = useState('');
  const [charRole, setCharRole] = useState('');
  const [charChannel, setCharChannel] = useState<CharacterChannel>('feed');
  const [charColor, setCharColor] = useState('#2D4B73');
  const [charAvatar, setCharAvatar] = useState<string | undefined>(undefined);

  // Settings Edit Character state
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editCharName, setEditCharName] = useState('');
  const [editCharRole, setEditCharRole] = useState('');
  const [editCharChannel, setEditCharChannel] = useState<CharacterChannel>('feed');
  const [editCharColor, setEditCharColor] = useState('#2D4B73');
  const [editCharAvatar, setEditCharAvatar] = useState<string | undefined>(undefined);

  const [confirmReset, setConfirmReset] = useState(false);

  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (lightboxImage) onCloseLightbox();
        else if (editingKeyword) onCloseEditKeyword();
        else onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, lightboxImage, editingKeyword, onClose, onCloseEditKeyword, onCloseLightbox]);

  function handleDismiss() {
    if (lightboxImage) onCloseLightbox();
    else if (editingKeyword) onCloseEditKeyword();
    else onClose();
  }

  async function handleCharAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const encoded = await compressImageFile(file, 320, 0.85);
      setCharAvatar(encoded);
    } catch {
      setModalError('Could not load custom avatar image.');
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={handleDismiss}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D24]/45 p-4 backdrop-blur-[2px]"
        >
          {lightboxImage ? (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Image preview"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-[#1A1D24] p-2 shadow-2xl"
            >
              <button
                type="button"
                onClick={onCloseLightbox}
                aria-label="Close image preview"
                className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-[#1A1D24] shadow-md hover:bg-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage}
                alt="Full size attachment"
                referrerPolicy="no-referrer"
                className="max-h-[84vh] w-auto rounded-xl object-contain"
              />
            </motion.div>
          ) : (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="workspace-modal-title"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className={`washi-scroll w-full overflow-y-auto rounded-2xl border border-[#DCD6CA] bg-[#FBF9F5] p-5 sm:p-6 shadow-2xl max-h-[90vh] ${
                activeModal === 'settings' ? 'max-w-2xl' : 'max-w-lg'
              }`}
            >
              {/* NEW KEYWORD MODAL */}
              {activeModal === 'new_keyword' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const res = onAddKeyword({
                      keyword: kwHandle,
                      summary: kwSummary,
                      tone: kwTone,
                    });
                    if (!res.ok) {
                      setModalError(res.error);
                      return;
                    }
                    onClose();
                  }}
                  className="space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2
                        id="workspace-modal-title"
                        className="font-display text-2xl font-semibold text-[#1A1D24]"
                      >
                        New Keyword
                      </h2>
                      <p className="mt-0.5 text-xs text-[#616775]">
                        Adds to your Keywords list and records the creation in Feed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close modal"
                      className="rounded-lg p-1.5 text-[#575D6B] hover:bg-[#ECE8DF]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor="modal-kw-handle"
                      className="block text-xs font-semibold text-[#3A404D] mb-1.5"
                    >
                      Keyword Handle
                    </label>
                    <input
                      id="modal-kw-handle"
                      type="text"
                      autoFocus
                      value={kwHandle}
                      onChange={(e) => {
                        setKwHandle(e.target.value);
                        if (modalError) setModalError(null);
                      }}
                      placeholder="e.g. power-supply"
                      className="w-full rounded-xl border border-[#DCD6CA] bg-white px-3.5 py-2.5 font-mono text-sm text-[#1A1D24] placeholder:text-[#8A909E] focus:border-[#C84B31] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="modal-kw-summary"
                      className="block text-xs font-semibold text-[#3A404D] mb-1.5"
                    >
                      Short Summary
                    </label>
                    <textarea
                      id="modal-kw-summary"
                      rows={3}
                      value={kwSummary}
                      onChange={(e) => {
                        setKwSummary(e.target.value);
                        if (modalError) setModalError(null);
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter' &&
                          !e.shiftKey &&
                          !e.nativeEvent.isComposing
                        ) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder="Write a crisp summary of what this keyword tracks (Enter to create)..."
                      className="w-full resize-none rounded-xl border border-[#DCD6CA] bg-white px-3.5 py-2.5 text-sm text-[#1A1D24] placeholder:text-[#8A909E] focus:border-[#C84B31] focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-[#3A404D] mb-2">
                      Paper Tint
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {TONE_OPTIONS.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setKwTone(t.value)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            kwTone === t.value
                              ? 'border-[#1A1D24] bg-white text-[#1A1D24] shadow-xs'
                              : 'border-[#DCD6CA] bg-[#F4F0E8] text-[#575D6B] hover:bg-white'
                          }`}
                        >
                          <span className={`h-3 w-3 rounded-full ${t.swatch}`} />
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {modalError && (
                    <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                      {modalError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-[#DCD6CA] bg-white px-4 py-2 text-xs font-semibold text-[#3A404D] hover:bg-[#F4F0E8]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-md bg-[#2D4B73] px-4 py-2 text-xs font-semibold text-white hover:bg-[#223B5C]"
                    >
                      Create Keyword
                    </button>
                  </div>
                </form>
              )}

              {/* EDIT KEYWORD MODAL */}
              {editingKeyword && !activeModal && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const res = onSaveEditKeyword({
                      id: editingKeyword.id,
                      keyword: editHandle,
                      summary: editSummary,
                      tone: editTone,
                    });
                    if (!res.ok) {
                      setModalError(res.error);
                      return;
                    }
                    onCloseEditKeyword();
                  }}
                  className="space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2
                        id="workspace-modal-title"
                        className="font-display text-2xl font-semibold text-[#1A1D24]"
                      >
                        Edit Keyword
                      </h2>
                      <p className="mt-0.5 text-xs text-[#616775]">
                        Saving changes posts a Before &rarr; After diff card into your Feed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onCloseEditKeyword}
                      aria-label="Close modal"
                      className="rounded-lg p-1.5 text-[#575D6B] hover:bg-[#ECE8DF]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-kw-handle"
                      className="block text-xs font-semibold text-[#3A404D] mb-1.5"
                    >
                      Keyword Handle
                    </label>
                    <input
                      id="edit-kw-handle"
                      type="text"
                      autoFocus
                      value={editHandle}
                      onChange={(e) => {
                        setEditHandle(e.target.value);
                        if (modalError) setModalError(null);
                      }}
                      className="w-full rounded-xl border border-[#DCD6CA] bg-white px-3.5 py-2.5 font-mono text-sm text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-kw-summary"
                      className="block text-xs font-semibold text-[#3A404D] mb-1.5"
                    >
                      Short Summary
                    </label>
                    <textarea
                      id="edit-kw-summary"
                      rows={3}
                      value={editSummary}
                      onChange={(e) => {
                        setEditSummary(e.target.value);
                        if (modalError) setModalError(null);
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter' &&
                          !e.shiftKey &&
                          !e.nativeEvent.isComposing
                        ) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                      className="w-full resize-none rounded-xl border border-[#DCD6CA] bg-white px-3.5 py-2.5 text-sm text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-[#3A404D] mb-2">
                      Paper Tint
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {TONE_OPTIONS.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setEditTone(t.value)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            editTone === t.value
                              ? 'border-[#1A1D24] bg-white text-[#1A1D24] shadow-xs'
                              : 'border-[#DCD6CA] bg-[#F4F0E8] text-[#575D6B] hover:bg-white'
                          }`}
                        >
                          <span className={`h-3 w-3 rounded-full ${t.swatch}`} />
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {modalError && (
                    <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                      {modalError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onCloseEditKeyword}
                      className="rounded-lg border border-[#DCD6CA] bg-white px-4 py-2 text-xs font-semibold text-[#3A404D] hover:bg-[#F4F0E8]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[#2D4B73] px-4 py-2 text-xs font-semibold text-white hover:bg-[#223B5C]"
                    >
                      Save &amp; Log Diff
                    </button>
                  </div>
                </form>
              )}

              {/* ORDER MODAL */}
              {activeModal === 'order' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const res = onAddOrder({
                      keyword: orderKw,
                      details: orderDetails,
                      priority: orderPriority,
                      characterId: orderCharId,
                    });
                    if (!res.ok) {
                      setModalError(res.error);
                      return;
                    }
                    onClose();
                  }}
                  className="space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2
                        id="workspace-modal-title"
                        className="font-display text-2xl font-semibold text-[#1A1D24]"
                      >
                        Create Work Order
                      </h2>
                      <p className="mt-0.5 text-xs text-[#616775]">
                        Logs a structured work order card directly into your central Feed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close modal"
                      className="rounded-lg p-1.5 text-[#575D6B] hover:bg-[#ECE8DF]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="order-kw"
                        className="block text-xs font-semibold text-[#3A404D] mb-1.5"
                      >
                        Linked Keyword
                      </label>
                      <select
                        id="order-kw"
                        value={orderKw}
                        onChange={(e) => setOrderKw(e.target.value)}
                        className="w-full rounded-xl border border-[#DCD6CA] bg-white px-3 py-2.5 font-mono text-xs text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                      >
                        {keywords.map((k) => (
                          <option key={k.id} value={k.keyword}>
                            @{k.keyword}
                          </option>
                        ))}
                        <option value="">General (no keyword)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="order-priority"
                        className="block text-xs font-semibold text-[#3A404D] mb-1.5"
                      >
                        Priority
                      </label>
                      <select
                        id="order-priority"
                        value={orderPriority}
                        onChange={(e) =>
                          setOrderPriority(e.target.value as OrderMeta['priority'])
                        }
                        className="w-full rounded-xl border border-[#DCD6CA] bg-white px-3 py-2.5 text-xs font-medium text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="order-char"
                      className="block text-xs font-semibold text-[#3A404D] mb-1.5"
                    >
                      Issued By
                    </label>
                    <select
                      id="order-char"
                      value={orderCharId}
                      onChange={(e) => setOrderCharId(e.target.value)}
                      className="w-full rounded-xl border border-[#DCD6CA] bg-white px-3 py-2.5 text-xs font-medium text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                    >
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.roleLabel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="order-details"
                      className="block text-xs font-semibold text-[#3A404D] mb-1.5"
                    >
                      Order Instructions
                    </label>
                    <textarea
                      id="order-details"
                      rows={3}
                      autoFocus
                      value={orderDetails}
                      onChange={(e) => {
                        setOrderDetails(e.target.value);
                        if (modalError) setModalError(null);
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter' &&
                          !e.shiftKey &&
                          !e.nativeEvent.isComposing
                        ) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder="Specify parts, steps, or target milestone (Enter to submit)..."
                      className="w-full resize-none rounded-xl border border-[#DCD6CA] bg-white px-3.5 py-2.5 text-sm text-[#1A1D24] placeholder:text-[#8A909E] focus:border-[#2D4B73] focus:outline-none"
                    />
                  </div>

                  {modalError && (
                    <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                      {modalError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg border border-[#DCD6CA] bg-white px-4 py-2 text-xs font-semibold text-[#3A404D] hover:bg-[#F4F0E8]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[#2D4B73] px-4 py-2 text-xs font-semibold text-white hover:bg-[#223B5C]"
                    >
                      Submit Order
                    </button>
                  </div>
                </form>
              )}

              {/* PENDING VERIFY & SUCCESS VERIFY MODALS */}
              {(activeModal === 'pending_verify' ||
                activeModal === 'success_verify') && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const status =
                      activeModal === 'pending_verify' ? 'pending' : 'success';
                    const res = onAddVerify({
                      status,
                      keyword: verifyKw,
                      comment: verifyComment,
                      characterId: verifyCharId,
                    });
                    if (!res.ok) {
                      setModalError(res.error);
                      return;
                    }
                    onClose();
                  }}
                  className="space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2
                        id="workspace-modal-title"
                        className="font-display text-2xl font-semibold text-[#1A1D24]"
                      >
                        {activeModal === 'pending_verify'
                          ? 'Pending Verify'
                          : 'Success Verify'}
                      </h2>
                      <p className="mt-0.5 text-xs text-[#616775]">
                        Adds to the right-side verification panel and rises directly into your main Feed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close modal"
                      className="rounded-lg p-1.5 text-[#575D6B] hover:bg-[#ECE8DF]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="verify-kw"
                        className="block text-xs font-semibold text-[#3A404D] mb-1.5"
                      >
                        Keyword Handle
                      </label>
                      <select
                        id="verify-kw"
                        value={verifyKw}
                        onChange={(e) => setVerifyKw(e.target.value)}
                        className="w-full rounded-xl border border-[#DCD6CA] bg-white px-3 py-2.5 font-mono text-xs text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                      >
                        {keywords.map((k) => (
                          <option key={k.id} value={k.keyword}>
                            @{k.keyword}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="verify-char"
                        className="block text-xs font-semibold text-[#3A404D] mb-1.5"
                      >
                        Character Voice
                      </label>
                      <select
                        id="verify-char"
                        value={verifyCharId}
                        onChange={(e) => setVerifyCharId(e.target.value)}
                        className="w-full rounded-xl border border-[#DCD6CA] bg-white px-3 py-2.5 text-xs font-medium text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                      >
                        {characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="verify-comment"
                      className="block text-xs font-semibold text-[#3A404D] mb-1.5"
                    >
                      Verification Comment
                    </label>
                    <textarea
                      id="verify-comment"
                      rows={3}
                      autoFocus
                      value={verifyComment}
                      onChange={(e) => {
                        setVerifyComment(e.target.value);
                        if (modalError) setModalError(null);
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter' &&
                          !e.shiftKey &&
                          !e.nativeEvent.isComposing
                        ) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder={
                        activeModal === 'pending_verify'
                          ? 'Describe what is waiting for verification (Enter to submit)...'
                          : 'Confirm what passed verification (Enter to submit)...'
                      }
                      className="w-full resize-none rounded-xl border border-[#DCD6CA] bg-white px-3.5 py-2.5 text-sm text-[#1A1D24] placeholder:text-[#8A909E] focus:border-[#2D4B73] focus:outline-none"
                    />
                  </div>

                  {modalError && (
                    <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                      {modalError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-[3px] border border-[#DCD6CA] bg-white px-4 py-2 text-xs font-semibold text-[#3A404D] hover:bg-[#F4F0E8]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-[3px] bg-[#2D4B73] px-4 py-2 text-xs font-semibold text-white hover:bg-[#223B5C]"
                    >
                      {activeModal === 'pending_verify'
                        ? 'Post Pending Verify'
                        : 'Post Success Verify'}
                    </button>
                  </div>
                </form>
              )}

              {/* SETTINGS MODAL */}
              {activeModal === 'settings' && (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4 border-b border-[#E7E2D8] pb-3">
                    <div>
                      <h2
                        id="workspace-modal-title"
                        className="font-display text-2xl font-semibold text-[#1A1D24]"
                      >
                        Database, Backups &amp; Studio Settings
                      </h2>
                      <p className="mt-0.5 text-xs text-[#616775]">
                        Manage MongoDB Atlas sync, export/restore JSON backups, and configure feed &amp; verification characters.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close settings"
                      className="rounded-lg p-1.5 text-[#575D6B] hover:bg-[#ECE8DF]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  {onReconnectDb &&
                    onCreateSnapshot &&
                    onRestoreSnapshot &&
                    onImportBackupJson && (
                      <DatabaseBackupSection
                        dbMeta={dbMeta}
                        snapshots={snapshots}
                        onReconnectDb={onReconnectDb}
                        onCreateSnapshot={onCreateSnapshot}
                        onRestoreSnapshot={onRestoreSnapshot}
                        onImportBackupJson={onImportBackupJson}
                      />
                    )}

                  {/* Default Verifier Selectors */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl border border-[#E4DFD4] bg-white p-3.5">
                    <div>
                      <label
                        htmlFor="default-pending-char"
                        className="block text-xs font-semibold text-[#7A4D0B] mb-1"
                      >
                        Pending Verify Default Character
                      </label>
                      <select
                        id="default-pending-char"
                        value={pendingCharacterId}
                        onChange={(e) =>
                          onSetChannelDefault('pending', e.target.value)
                        }
                        className="w-full rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-2.5 py-2 text-xs font-medium text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                      >
                        {characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="default-success-char"
                        className="block text-xs font-semibold text-[#1E523A] mb-1"
                      >
                        Success Verify Default Character
                      </label>
                      <select
                        id="default-success-char"
                        value={successCharacterId}
                        onChange={(e) =>
                          onSetChannelDefault('success', e.target.value)
                        }
                        className="w-full rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-2.5 py-2 text-xs font-medium text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                      >
                        {characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Current Characters Roster */}
                  <div>
                    <h3 className="text-xs font-semibold text-[#3A404D] mb-2">
                      Active Characters ({characters.length})
                    </h3>
                    <div
                      data-testid="settings-character-list"
                      className="space-y-2"
                    >
                      {characters.map((char) => {
                        const isEditingThis = editingCharId === char.id;
                        return (
                          <div
                            key={char.id}
                            className="rounded-xl border border-[#E4DFD4] bg-white px-3 py-2.5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <CharacterAvatar character={char} size="sm" />
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-[#1A1D24] truncate">
                                    {char.name}
                                  </div>
                                  <div className="text-[11px] text-[#616775]">
                                    {char.roleLabel} ·{' '}
                                    {char.channel === 'feed'
                                      ? 'Feed'
                                      : char.channel === 'pending'
                                      ? 'Pending Verify'
                                      : char.channel === 'success'
                                      ? 'Success Verify'
                                      : 'All Channels'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditingThis) {
                                      setEditingCharId(null);
                                      setModalError(null);
                                    } else {
                                      setEditingCharId(char.id);
                                      setEditCharName(char.name);
                                      setEditCharRole(char.roleLabel);
                                      setEditCharChannel(char.channel);
                                      setEditCharColor(char.color);
                                      setEditCharAvatar(char.customAvatar);
                                      setModalError(null);
                                    }
                                  }}
                                  aria-label={`Edit character ${char.name}`}
                                  className={`inline-flex items-center gap-1 rounded-[3px] border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                                    isEditingThis
                                      ? 'border-[#2D4B73] bg-[#2D4B73] text-white'
                                      : 'border-[#D5CFC2] bg-[#FAF8F4] text-[#2D4B73] hover:bg-[#EDF4FA]'
                                  }`}
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>{isEditingThis ? 'Close' : 'Edit'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const res = onRemoveCharacter(char.id);
                                    if (!res.ok) setModalError(res.error);
                                    else if (isEditingThis) setEditingCharId(null);
                                  }}
                                  aria-label={`Remove character ${char.name}`}
                                  className="inline-flex items-center gap-1 rounded-[3px] border border-[#E5D7D5] bg-[#FDF6F5] px-2.5 py-1.5 text-xs font-medium text-[#9F3A26] hover:bg-[#FAE9E6] whitespace-nowrap shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>

                            {isEditingThis && (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const res = onUpdateCharacter({
                                    id: char.id,
                                    name: editCharName,
                                    roleLabel: editCharRole,
                                    channel: editCharChannel,
                                    color: editCharColor,
                                    customAvatar: editCharAvatar,
                                  });
                                  if (!res.ok) {
                                    setModalError(res.error);
                                    return;
                                  }
                                  setEditingCharId(null);
                                  setModalError(null);
                                }}
                                className="mt-3 space-y-2.5 border-t border-[#ECE8DF] pt-3"
                              >
                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                  <div>
                                    <label
                                      htmlFor={`edit-char-name-${char.id}`}
                                      className="block text-[11px] font-medium text-[#575D6B] mb-1"
                                    >
                                      Character Name
                                    </label>
                                    <input
                                      id={`edit-char-name-${char.id}`}
                                      type="text"
                                      value={editCharName}
                                      onChange={(e) => {
                                        setEditCharName(e.target.value);
                                        if (modalError) setModalError(null);
                                      }}
                                      className="w-full rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-2.5 py-1.5 text-xs text-[#1A1D24] focus:border-[#2D4B73] focus:bg-white focus:outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label
                                      htmlFor={`edit-char-role-${char.id}`}
                                      className="block text-[11px] font-medium text-[#575D6B] mb-1"
                                    >
                                      Role Note
                                    </label>
                                    <input
                                      id={`edit-char-role-${char.id}`}
                                      type="text"
                                      value={editCharRole}
                                      onChange={(e) => setEditCharRole(e.target.value)}
                                      className="w-full rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-2.5 py-1.5 text-xs text-[#1A1D24] focus:border-[#2D4B73] focus:bg-white focus:outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label
                                      htmlFor={`edit-char-channel-${char.id}`}
                                      className="block text-[11px] font-medium text-[#575D6B] mb-1"
                                    >
                                      Channel
                                    </label>
                                    <select
                                      id={`edit-char-channel-${char.id}`}
                                      value={editCharChannel}
                                      onChange={(e) =>
                                        setEditCharChannel(
                                          e.target.value as CharacterChannel
                                        )
                                      }
                                      className="w-full rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-2 py-1.5 text-xs text-[#1A1D24] focus:border-[#2D4B73] focus:outline-none"
                                    >
                                      <option value="feed">Feed</option>
                                      <option value="pending">Pending Verify</option>
                                      <option value="success">Success Verify</option>
                                      <option value="all">All Channels</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-[#575D6B]">
                                      Color:
                                    </span>
                                    {PIGMENT_SWATCHES.map((swatch) => (
                                      <button
                                        key={swatch}
                                        type="button"
                                        aria-label={`Select edit color ${swatch}`}
                                        onClick={() => setEditCharColor(swatch)}
                                        style={{ backgroundColor: swatch }}
                                        className={`h-4 w-4 rounded-full transition-transform ${
                                          editCharColor === swatch
                                            ? 'ring-2 ring-[#1A1D24] ring-offset-1 scale-110'
                                            : 'opacity-75 hover:opacity-100'
                                        }`}
                                      />
                                    ))}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-[3px] border border-[#DCD6CA] bg-[#FAF8F4] px-2 py-1 text-[11px] font-medium text-[#3A404D] hover:bg-[#F3EFE6]">
                                      <Upload className="h-3 w-3" aria-hidden="true" />
                                      <span>Avatar</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          try {
                                            const enc = await compressImageFile(
                                              file,
                                              320,
                                              0.85
                                            );
                                            setEditCharAvatar(enc);
                                          } catch {
                                            setModalError(
                                              'Could not load custom avatar image.'
                                            );
                                          }
                                        }}
                                        className="hidden"
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() => setEditingCharId(null)}
                                      className="rounded-[3px] border border-[#DCD6CA] bg-white px-2.5 py-1 text-[11px] font-medium text-[#575D6B] hover:bg-[#F4F0E8]"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="rounded-[3px] bg-[#2D4B73] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#223B5C]"
                                    >
                                      Save Character
                                    </button>
                                  </div>
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add New Character Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const res = onAddCharacter({
                        name: charName,
                        roleLabel: charRole,
                        channel: charChannel,
                        color: charColor,
                        customAvatar: charAvatar,
                      });
                      if (!res.ok) {
                        setModalError(res.error);
                        return;
                      }
                      setCharName('');
                      setCharRole('');
                      setCharAvatar(undefined);
                      setModalError(null);
                    }}
                    className="rounded-xl border border-[#DCD6CA] bg-white p-4 space-y-3"
                  >
                    <h3 className="text-xs font-semibold text-[#1A1D24]">
                      Add New Character
                    </h3>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label
                          htmlFor="new-char-name"
                          className="block text-[11px] font-medium text-[#575D6B] mb-1"
                        >
                          Name
                        </label>
                        <input
                          id="new-char-name"
                          type="text"
                          value={charName}
                          onChange={(e) => {
                            setCharName(e.target.value);
                            if (modalError) setModalError(null);
                          }}
                          placeholder="e.g. Itachi"
                          className="w-full rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-3 py-2 text-xs text-[#1A1D24] focus:border-[#2D4B73] focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="new-char-role"
                          className="block text-[11px] font-medium text-[#575D6B] mb-1"
                        >
                          Role Note
                        </label>
                        <input
                          id="new-char-role"
                          type="text"
                          value={charRole}
                          onChange={(e) => setCharRole(e.target.value)}
                          placeholder="e.g. Reviewer"
                          className="w-full rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-3 py-2 text-xs text-[#1A1D24] focus:border-[#2D4B73] focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="new-char-channel"
                          className="block text-[11px] font-medium text-[#575D6B] mb-1"
                        >
                          Channel
                        </label>
                        <select
                          id="new-char-channel"
                          value={charChannel}
                          onChange={(e) =>
                            setCharChannel(e.target.value as CharacterChannel)
                          }
                          className="w-full rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-2.5 py-2 text-xs text-[#1A1D24] focus:border-[#2D4B73] focus:bg-white focus:outline-none"
                        >
                          <option value="feed">Feed</option>
                          <option value="pending">Pending Verify</option>
                          <option value="success">Success Verify</option>
                          <option value="all">All Channels</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#575D6B]">Color:</span>
                        {PIGMENT_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            aria-label={`Select color ${swatch}`}
                            onClick={() => setCharColor(swatch)}
                            style={{ backgroundColor: swatch }}
                            className={`h-5 w-5 rounded-full transition-transform ${
                              charColor === swatch
                                ? 'ring-2 ring-[#1A1D24] ring-offset-1 scale-110'
                                : 'opacity-75 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#DCD6CA] bg-[#FAF8F4] px-2.5 py-1.5 text-xs font-medium text-[#3A404D] hover:bg-[#F3EFE6]">
                          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{charAvatar ? 'Avatar Ready' : 'Avatar'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCharAvatarUpload}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#2D4B73] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#223B5C] whitespace-nowrap"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Add Character</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  {modalError && (
                    <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                      {modalError}
                    </p>
                  )}

                  {/* Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E2D8] pt-3">
                    {!confirmReset ? (
                      <button
                        type="button"
                        onClick={() => setConfirmReset(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD6CA] bg-white px-3 py-1.5 text-xs font-medium text-[#575D6B] hover:text-[#B91C1C]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Reset Studio Data</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#B91C1C] font-medium">
                          Restore initial workspace?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onResetWorkspace();
                            setConfirmReset(false);
                            onClose();
                          }}
                          className="rounded-lg bg-[#B91C1C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#991B1B]"
                        >
                          Confirm Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmReset(false)}
                          className="rounded-lg border border-[#DCD6CA] bg-white px-2.5 py-1.5 text-xs text-[#3A404D]"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg bg-[#1A1D24] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2D323E]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
