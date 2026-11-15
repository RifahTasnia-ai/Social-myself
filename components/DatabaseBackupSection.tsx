'use client';

import React, { useRef, useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  HardDrive,
  History,
  RotateCcw,
  Plus,
} from 'lucide-react';
import type {
  BackupSnapshotSummary,
  DatabaseStatusMeta,
} from '@/lib/backup-utils';
import { formatRelativeOrTime } from '@/lib/image-utils';

interface DatabaseBackupSectionProps {
  dbMeta: DatabaseStatusMeta | null;
  snapshots: BackupSnapshotSummary[];
  onReconnectDb: () => Promise<void>;
  onCreateSnapshot: (label?: string) => Promise<{ ok: boolean; error?: string }>;
  onRestoreSnapshot: (
    snapshotId: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onImportBackupJson: (
    payload: unknown
  ) => Promise<{ ok: boolean; error?: string }>;
}

export default function DatabaseBackupSection({
  dbMeta,
  snapshots,
  onReconnectDb,
  onCreateSnapshot,
  onRestoreSnapshot,
  onImportBackupJson,
}: DatabaseBackupSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingSnap, setIsCreatingSnap] = useState(false);
  const [restoringSnapId, setRestoringSnapId] = useState<string | null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const isAtlasConnected = Boolean(
    dbMeta?.connected && dbMeta?.engine === 'mongodb_atlas'
  );

  async function handleReconnect() {
    setIsSyncing(true);
    setFeedback(null);
    try {
      await onReconnectDb();
      setFeedback({
        type: 'success',
        message: 'Database status refreshed and workspace synchronized.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Could not refresh database status.',
      });
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleCreateCheckpoint(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingSnap(true);
    setFeedback(null);
    try {
      const res = await onCreateSnapshot(snapshotLabel);
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: res.error || 'Could not save checkpoint.',
        });
      } else {
        setSnapshotLabel('');
        setFeedback({
          type: 'success',
          message: 'Recovery checkpoint saved to database.',
        });
      }
    } finally {
      setIsCreatingSnap(false);
    }
  }

  async function handleRestoreCheckpoint(id: string, label: string) {
    setRestoringSnapId(id);
    setFeedback(null);
    try {
      const res = await onRestoreSnapshot(id);
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: res.error || 'Could not restore checkpoint.',
        });
      } else {
        setFeedback({
          type: 'success',
          message: `Restored workspace to "${label}".`,
        });
      }
    } finally {
      setRestoringSnapId(null);
    }
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await onImportBackupJson(parsed);
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: res.error || 'Invalid backup file.',
        });
      } else {
        setFeedback({
          type: 'success',
          message: `Backup "${file.name}" restored and saved to database.`,
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Could not parse JSON backup file.',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div
      data-testid="database-backup-section"
      className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5"
    >
      {/* Top Status Row */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-start gap-2.5">
          <div
            className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${
              isAtlasConnected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {isAtlasConnected ? (
              <Database className="h-4 w-4" aria-hidden="true" />
            ) : (
              <HardDrive className="h-4 w-4" aria-hidden="true" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-semibold text-slate-900">
                Database &amp; Backups
              </h3>
              <span
                data-testid="db-status-badge"
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10.5px] font-semibold tabular-nums ${
                  isAtlasConnected
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {isAtlasConnected ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    <span>
                      MongoDB Atlas Connected
                      {dbMeta?.latencyMs ? ` (${dbMeta.latencyMs}ms)` : ''}
                    </span>
                  </>
                ) : (
                  <span>Local Disk Mirror Active</span>
                )}
              </span>
            </div>

            <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
              Cluster: {dbMeta?.clusterHost || 'cluster0.wvpjckw.mongodb.net'} · DB:{' '}
              {dbMeta?.databaseName || 'kotonoha_studio'}
            </p>

            {!isAtlasConnected && dbMeta?.errorHint && (
              <p className="mt-1 text-[11px] leading-snug text-amber-800 bg-amber-50/80 border border-amber-200/70 rounded-md px-2 py-1">
                {dbMeta.errorHint}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleReconnect}
          disabled={isSyncing}
          aria-label="Test and sync database connection"
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw
            className={`h-3 w-3 text-[#1E3A5F] ${
              isSyncing ? 'animate-spin' : ''
            }`}
            aria-hidden="true"
          />
          <span>{isSyncing ? 'Syncing...' : 'Test / Sync DB'}</span>
        </button>
      </div>

      {/* Stored Item Counts */}
      {dbMeta?.counts && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {[
            { label: 'Keywords', val: dbMeta.counts.keywords },
            { label: 'Feed Posts', val: dbMeta.counts.feed },
            { label: 'Comments', val: dbMeta.counts.comments },
            { label: 'Verifications', val: dbMeta.counts.verifications },
            { label: 'Images', val: dbMeta.counts.images },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 text-center"
            >
              <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                {stat.val}
              </div>
              <div className="text-[10.5px] text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Export & Import JSON Backup Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/backup/export"
            download
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#1E293B] whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Download JSON Backup</span>
          </a>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileImport}
            className="hidden"
            id="import-backup-json-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5 text-[#1E3A5F]" aria-hidden="true" />
            <span>Restore JSON Backup</span>
          </button>
        </div>

        {dbMeta?.updatedAt && (
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            Saved {formatRelativeOrTime(dbMeta.updatedAt)}
          </span>
        )}
      </div>

      {/* Recovery Checkpoints (Snapshots) */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-[#1E3A5F]" aria-hidden="true" />
            <span className="text-xs font-semibold text-slate-800">
              Recovery Checkpoints ({snapshots.length})
            </span>
          </div>

          <form
            onSubmit={handleCreateCheckpoint}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              aria-label="Checkpoint label"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              placeholder="Optional checkpoint note..."
              className="h-7 w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11.5px] text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={isCreatingSnap}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 whitespace-nowrap"
            >
              <Plus className="h-3 w-3 text-[#1E3A5F]" aria-hidden="true" />
              <span>{isCreatingSnap ? 'Saving...' : 'Save Checkpoint'}</span>
            </button>
          </form>
        </div>

        {snapshots.length > 0 && (
          <div className="washi-scroll max-h-32 space-y-1.5 overflow-y-auto pr-0.5">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-medium text-slate-800 truncate">
                    {snap.label}
                  </span>
                  <span className="ml-2 font-mono text-[10.5px] text-slate-400 tabular-nums">
                    {formatRelativeOrTime(snap.createdAt)} · {snap.counts.feed} posts ·{' '}
                    {snap.counts.keywords} kw
                  </span>
                </div>
                <button
                  type="button"
                  disabled={restoringSnapId === snap.id}
                  onClick={() => handleRestoreCheckpoint(snap.id, snap.label)}
                  aria-label={`Restore checkpoint ${snap.label}`}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#1E3A5F] hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
                  <span>
                    {restoringSnapId === snap.id ? 'Restoring...' : 'Restore'}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {feedback && (
        <p
          role="status"
          className={`text-xs font-medium ${
            feedback.type === 'success' ? 'text-emerald-700' : 'text-red-600'
          }`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
