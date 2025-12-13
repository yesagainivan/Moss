import { create } from 'zustand';
import { CommitInfo } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { logger } from '../lib/logger';
import { useSettingsStore } from './useSettingsStore';
import { showToast } from '../contexts/ToastContext';


interface GitState {
    gitEnabled: boolean;
    hasUncommittedChanges: boolean;
    vaultStatus: 'idle' | 'snapshotting' | 'success' | 'error';
    vaultStatusMessage: string | null;

    // Actions
    setGitEnabled: (enabled: boolean) => void;
    checkGitStatus: () => Promise<void>;
    undoLastMosaicChange: (requestConfirmation: (msg: string) => Promise<boolean>) => Promise<void>;
    snapshotNote: (noteId: string, forceSave: (id: string) => Promise<void>, setSaveState: (id: string, state: any) => void) => Promise<void>;
    snapshotVault: () => Promise<void>;
    getNoteHistory: (notePath: string) => Promise<CommitInfo[]>;
    getNoteContentAtCommit: (notePath: string, commitOid: string) => Promise<string>;
    getVaultHistory: () => Promise<CommitInfo[]>;
    restoreVault: (commitOid: string) => Promise<void>;
}

export const useGitStore = create<GitState>((set, get) => ({
    gitEnabled: false,
    hasUncommittedChanges: false,
    vaultStatus: 'idle',
    vaultStatusMessage: null,

    setGitEnabled: (enabled: boolean) => set({ gitEnabled: enabled }),

    checkGitStatus: async () => {
        const vaultPath = useSettingsStore.getState().currentVaultPath;
        if (vaultPath) {
            try {
                const isGit = await invoke<boolean>('check_git_status', { vaultPath });
                set({ gitEnabled: isGit });
            } catch (e) {
                console.error('Failed to check git status:', e);
                set({ gitEnabled: false });
            }
        }
    },

    undoLastMosaicChange: async (requestConfirmation) => {
        const vaultPath = useSettingsStore.getState().currentVaultPath;
        if (!vaultPath) return;

        const confirmed = await requestConfirmation(
            'Undo the last change made by Mosaic? This will create a revert commit.'
        );
        if (!confirmed) return;

        try {
            await invoke<string>('undo_last_mosaic_change', { vaultPath });
            await get().checkGitStatus(); // Refresh status
            showToast('Undid last change', 'success');
        } catch (error) {
            console.error('Failed to undo last change:', error);
            showToast('Failed to undo last change', 'error');
            throw error;
        }
    },

    snapshotNote: async (noteId: string, forceSave, setSaveState) => {
        const { gitEnabled } = get();
        const vaultPath = useSettingsStore.getState().currentVaultPath;

        if (!vaultPath || !gitEnabled) return;

        try {
            // 1. Force save first to ensure disk is up to date
            await forceSave(noteId);

            // Set state to saving (using the callback provided)
            setSaveState(noteId, { status: 'saving', lastSaved: Date.now(), error: null });

            // 2. Commit
            const timestamp = new Date().toLocaleString();
            const message = `Manual snapshot: ${timestamp}`;

            await invoke('commit_note', {
                vaultPath,
                filePath: noteId,
                message
            });

            // 3. Refresh status
            await get().checkGitStatus();

            // Set state to snapshot
            setSaveState(noteId, { status: 'snapshot', lastSaved: Date.now(), error: null });

            // Reset back to saved after a delay
            setTimeout(() => {
                setSaveState(noteId, { status: 'saved', lastSaved: Date.now(), error: null });
            }, 3000);

            logger.success('Snapshot saved:', message);
            showToast('Snapshot saved', 'success');
        } catch (error) {
            console.error('Failed to snapshot note:', error);
            throw error;
        }
    },

    snapshotVault: async () => {
        const { gitEnabled } = get();
        const vaultPath = useSettingsStore.getState().currentVaultPath;

        if (!vaultPath || !gitEnabled) return;

        try {
            set({ vaultStatus: 'snapshotting', vaultStatusMessage: 'Snapshotting vault...' });

            const timestamp = new Date().toLocaleString();
            const message = `Vault snapshot: ${timestamp}`;

            await invoke('commit_vault', {
                vaultPath,
                message
            });

            // Refresh status
            await get().checkGitStatus();

            set({ vaultStatus: 'success', vaultStatusMessage: 'Vault snapshot saved' });
            console.log('Vault snapshot saved:', message);

            // Reset after delay
            setTimeout(() => {
                set({ vaultStatus: 'idle', vaultStatusMessage: null });
            }, 3000);

            logger.success('Vault snapshot saved:', message);
            showToast('Vault snapshot saved', 'success');
        } catch (error) {
            logger.error('Failed to snapshot vault:', error);
            set({ vaultStatus: 'error', vaultStatusMessage: 'Failed to snapshot vault' });
            showToast('Failed to snapshot vault', 'error');

            // Reset error after delay
            setTimeout(() => {
                set({ vaultStatus: 'idle', vaultStatusMessage: null });
            }, 5000);

            throw error;
        }
    },

    getNoteHistory: async (notePath: string) => {
        const vaultPath = useSettingsStore.getState().currentVaultPath;
        if (!vaultPath) return [];

        try {
            return await invoke<CommitInfo[]>('get_git_history', {
                vaultPath,
                limit: 20,
                mosaicOnly: false,
                filePath: notePath
            });
        } catch (error) {
            console.error('Failed to get note history:', error);
            return [];
        }
    },

    getNoteContentAtCommit: async (notePath: string, commitOid: string) => {
        const vaultPath = useSettingsStore.getState().currentVaultPath;
        if (!vaultPath) return '';

        try {
            return await invoke<string>('get_file_content_at_commit', {
                vaultPath,
                commitOid,
                filePath: notePath
            });
        } catch (error) {
            // Check if this is an expected "file not found" error
            console.error('Failed to get note content at commit:', error);
            return '';
        }
    },

    getVaultHistory: async () => {
        const vaultPath = useSettingsStore.getState().currentVaultPath;
        if (!vaultPath) return [];

        try {
            return await invoke<CommitInfo[]>('get_git_history', {
                vaultPath,
                limit: 50,
                mosaicOnly: false,
                filePath: null // No file filter = full vault history
            });
        } catch (error) {
            console.error('Failed to get vault history:', error);
            return [];
        }
    },

    restoreVault: async (commitOid: string) => {
        const vaultPath = useSettingsStore.getState().currentVaultPath;
        if (!vaultPath) return;

        try {
            await invoke('restore_vault', {
                vaultPath,
                commitOid
            });

            // We'll need to trigger a reload in the main store
            // This is a side effect that the caller should handle or we need a way to signal it
            window.location.reload(); // Simple brute force reload for now to ensure state sync
        } catch (error) {
            console.error('Failed to restore vault:', error);
            throw error;
        }
    }
}));
