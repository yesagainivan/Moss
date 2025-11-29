import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from './useStore';

export interface GitHubUser {
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
    html_url: string;
}

export interface SyncStatus {
    ahead: number;
    behind: number;
    up_to_date: boolean;
}

export interface ConflictInfo {
    path: string;
    ancestor?: string;
    ours: string;
    theirs: string;
}

export interface ConflictResolution {
    has_conflicts: boolean;
    conflicts: ConflictInfo[];
    sync_status: SyncStatus;
}


interface GitHubState {
    user: GitHubUser | null;
    isLoggedIn: boolean;
    isLoading: boolean;

    // Sync State
    syncStatus: SyncStatus | null;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    syncError: string | null;

    // Conflict State
    conflicts: ConflictInfo[] | null;
    isResolvingConflicts: boolean;

    // Actions
    setUser: (user: GitHubUser | null) => void;
    setIsLoggedIn: (isLoggedIn: boolean) => void;
    checkLoginStatus: () => Promise<void>;
    logout: () => Promise<void>;

    // Sync Actions
    checkSyncStatus: (vaultPath: string) => Promise<void>;
    sync: (vaultPath: string) => Promise<void>;
    resolveConflict: (vaultPath: string, filePath: string, resolution: 'ours' | 'theirs' | 'manual', customContent?: string) => Promise<void>;
    completeMerge: (vaultPath: string) => Promise<void>;
    clearConflicts: () => Promise<void>;
}

export const useGitHubStore = create<GitHubState>((set, get) => ({
    user: null,
    isLoggedIn: false,
    isLoading: true,

    syncStatus: null,
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,

    conflicts: null,
    isResolvingConflicts: false,

    setUser: (user) => set({ user }),
    setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),

    checkLoginStatus: async () => {
        set({ isLoading: true });
        try {
            const isValid = await invoke<boolean>('github_verify_token');
            if (isValid) {
                const userData = await invoke<GitHubUser>('github_get_user');
                set({ user: userData, isLoggedIn: true });
            } else {
                set({ user: null, isLoggedIn: false });
            }
        } catch (err) {
            set({ user: null, isLoggedIn: false });
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        try {
            await invoke('github_delete_token');
            set({ user: null, isLoggedIn: false, syncStatus: null });
        } catch (err) {
            console.error('Failed to logout', err);
        }
    },

    checkSyncStatus: async (vaultPath: string) => {
        try {
            // First fetch to update remote refs
            await invoke('git_fetch_remote', { vaultPath });

            // Then check status against updated refs
            const status = await invoke<SyncStatus>('git_get_sync_status', { vaultPath });
            set({ syncStatus: status, syncError: null });
        } catch (err) {
            // Silently fail - status check errors are expected sometimes (e.g. no remote)
            console.debug('Sync status check:', err);
        }
    },

    sync: async (vaultPath: string) => {
        if (get().isSyncing) return;

        set({ isSyncing: true, syncError: null });

        try {
            const result = await invoke<ConflictResolution>('git_sync_vault', { vaultPath });

            // Check if there are conflicts
            if (result.has_conflicts) {
                set({
                    conflicts: result.conflicts,
                    syncStatus: result.sync_status,
                    syncError: null
                });
                // Don't reload vault or set lastSyncTime yet - conflicts need resolution
                return;
            }

            // No conflicts - sync succeeded
            set({
                syncStatus: result.sync_status,
                lastSyncTime: new Date(),
                syncError: null,
                conflicts: null
            });

            // Reload the vault state to reflect synced changes
            const store = useAppStore.getState();

            // Refresh file tree
            await store.refreshFileTree();

            // Reload content for all open notes from disk
            const { tabs, notes } = store;
            // We need to dynamically import this to avoid circular dependencies if possible, 
            // or just assume it's available. The original code imported it.
            // Since we are in a store, we can't easily use dynamic imports that depend on component context,
            // but `loadNoteContent` is a pure helper function usually.
            // Let's try to import it at the top level if it's a simple lib function.
            // Checking original file: import { loadNoteContent } from '../../lib/fs';
            // We'll use dynamic import to be safe as in the original code.
            const { loadNoteContent } = await import('../lib/fs');

            for (const tab of tabs) {
                const noteId = tab.noteId;
                if (noteId.includes('/') && notes[noteId]) {
                    try {
                        const content = await loadNoteContent(noteId);
                        // Update note content in store
                        store.notes[noteId] = {
                            ...notes[noteId],
                            content,
                            updatedAt: Date.now()
                        };
                    } catch (err) {
                        console.error(`Failed to reload note ${noteId}:`, err);
                    }
                }
            }

            // Trigger re-render by updating the store
            useAppStore.setState({ notes: { ...store.notes } });

        } catch (err) {
            set({ syncError: err as string });
        } finally {
            set({ isSyncing: false });
        }
    },

    resolveConflict: async (vaultPath: string, filePath: string, resolution: 'ours' | 'theirs' | 'manual', customContent?: string) => {
        set({ isResolvingConflicts: true });
        try {
            await invoke('git_resolve_conflict', {
                vaultPath,
                filePath,
                resolutionType: resolution,
                customContent
            });
            // We don't remove the conflict from state here anymore.
            // The modal tracks resolved status locally, and we wait for completeMerge
            // to clear the conflicts state.
        } catch (error) {
            set({ syncError: `Failed to resolve conflict: ${error}` });
            throw error;
        } finally {
            set({ isResolvingConflicts: false });
        }
    },

    completeMerge: async (vaultPath: string) => {
        set({ isSyncing: true, syncError: null });

        try {
            const result = await invoke<SyncStatus>('git_complete_merge', { vaultPath });

            set({
                syncStatus: result,
                lastSyncTime: new Date(),
                syncError: null,
                conflicts: null
            });

            // Reload the vault state
            const store = useAppStore.getState();
            await store.refreshFileTree();

            // Reload open notes
            const { tabs, notes } = store;
            const { loadNoteContent } = await import('../lib/fs');

            for (const tab of tabs) {
                const noteId = tab.noteId;
                if (noteId.includes('/') && notes[noteId]) {
                    try {
                        const content = await loadNoteContent(noteId);
                        store.notes[noteId] = {
                            ...notes[noteId],
                            content,
                            updatedAt: Date.now()
                        };
                    } catch (err) {
                        console.error(`Failed to reload note ${noteId}:`, err);
                    }
                }
            }

            useAppStore.setState({ notes: { ...store.notes } });
        } catch (err) {
            set({ syncError: err as string });
        } finally {
            set({ isSyncing: false });
        }
    },

    clearConflicts: async () => {
        const vaultPath = useAppStore.getState().vaultPath;
        if (vaultPath) {
            try {
                // Abort the merge on the backend to clean up git state
                await invoke('git_abort_merge', { vaultPath });
            } catch (err) {
                console.error('Failed to abort merge:', err);
            }
        }
        set({ conflicts: null, syncError: null });
    }
}));
