import {
  createInitialWorkspaceState,
  normalizeWorkspaceState,
  type WorkspaceState,
} from './workspace-store';

export const WORKSPACE_STORAGE_KEY = 'kotonoha_studio_workspace_v1';

export function loadWorkspaceFromStorage(): WorkspaceState {
  if (typeof window === 'undefined') {
    return createInitialWorkspaceState();
  }
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return createInitialWorkspaceState();
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    return normalizeWorkspaceState(parsed);
  } catch {
    return createInitialWorkspaceState();
  }
}

export function saveWorkspaceToStorage(state: WorkspaceState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota overflow gracefully
  }
}
