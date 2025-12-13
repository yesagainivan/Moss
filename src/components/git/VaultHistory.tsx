import { useState, useEffect } from 'react';
import { useGitStore } from '../../store/useGitStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { CommitInfo } from '../../types';
import { RotateCcw, Clock, AlertCircle, ChevronDown, ChevronRight, FilePlus, FileEdit, FileX } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface VaultHistoryProps {
    requestConfirmation: (message: string) => Promise<boolean>;
    setGitMessage: (message: { type: 'success' | 'error'; text: string } | null) => void;
}

interface FileChange {
    path: string;
    status: string;
    additions: number;
    deletions: number;
}

export const VaultHistory = ({ requestConfirmation, setGitMessage }: VaultHistoryProps) => {
    const [vaultHistory, setVaultHistory] = useState<CommitInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
    const [commitChanges, setCommitChanges] = useState<Map<string, FileChange[]>>(new Map());
    const [loadingChanges, setLoadingChanges] = useState<string | null>(null);

    const loadVaultHistory = async () => {
        setIsLoading(true);
        try {
            const history = await useGitStore.getState().getVaultHistory();
            setVaultHistory(history);
        } catch (error) {
            console.error('Failed to load vault history:', error);
            setGitMessage({ type: 'error', text: 'Failed to load vault history' });
        } finally {
            setIsLoading(false);
        }
    };

    const loadCommitChanges = async (commitOid: string) => {
        if (commitChanges.has(commitOid)) {
            // Already loaded, just toggle
            setExpandedCommit(expandedCommit === commitOid ? null : commitOid);
            return;
        }

        setLoadingChanges(commitOid);
        try {
            const { currentVaultPath: vaultPath } = useSettingsStore.getState();
            if (!vaultPath) return;

            const changes = await invoke<FileChange[]>('git_get_commit_changes', {
                vaultPath,
                commitOid,
            });

            setCommitChanges(new Map(commitChanges.set(commitOid, changes)));
            setExpandedCommit(commitOid);
        } catch (error) {
            console.error('Failed to load commit changes:', error);
        } finally {
            setLoadingChanges(null);
        }
    };

    useEffect(() => {
        loadVaultHistory();
    }, []);

    const handleRestore = async (commit: CommitInfo) => {
        // Check for uncommitted changes first
        const { currentVaultPath: vaultPath } = useSettingsStore.getState();

        if (!vaultPath) {
            setGitMessage({ type: 'error', text: 'No vault is open' });
            return;
        }

        try {
            const hasChanges = await invoke<boolean>('check_uncommitted_changes', { vaultPath });

            if (hasChanges) {
                // Ask user to create a snapshot first
                const shouldCommit = await requestConfirmation(
                    `You have uncommitted changes.\n\nWould you like to create a snapshot before restoring?\n\n` +
                    `• OK = Create snapshot first (recommended)\n` +
                    `• Cancel = Go back`
                );

                if (!shouldCommit) {
                    // User cancelled
                    return;
                }

                // Create a snapshot of current state
                try {
                    await useGitStore.getState().snapshotVault();
                    setGitMessage({ type: 'success', text: 'Snapshot created. Now restoring...' });
                    // Wait a moment for the message to be visible
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    setGitMessage({ type: 'error', text: `Failed to create snapshot: ${error}` });
                    return;
                }
            }

            // Now confirm the restore
            const confirmed = await requestConfirmation(
                `Restore your vault to "${commit.message}" (${new Date(commit.timestamp * 1000).toLocaleString()})?\n\nWarning:\n• Files not in that snapshot will be removed\n• All history is preserved (you can restore to a newer state later)`
            );

            if (!confirmed) return;

            setIsRestoring(true);
            await useGitStore.getState().restoreVault(commit.oid);
            setGitMessage({ type: 'success', text: `Vault restored to: ${commit.message}` });
            // Reload history to show the new "Restored to..." commit
            await loadVaultHistory();
        } catch (error) {
            console.error('Failed to restore vault:', error);
            setGitMessage({ type: 'error', text: `Failed to restore vault: ${error}` });
        } finally {
            setIsRestoring(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Clock className="w-5 h-5 animate-spin mr-2" />
                Loading history...
            </div>
        );
    }

    if (vaultHistory.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>No vault history found.</p>
                <p className="text-xs mt-2">Create a snapshot to start tracking your vault's history.</p>
            </div>
        );
    }

    return (
        <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-2">Vault History</h4>
            <p className="text-xs text-muted-foreground mb-3">
                Restore your entire vault to a previous state. All history is preserved.
            </p>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {vaultHistory.map((commit, index) => {
                    const isExpanded = expandedCommit === commit.oid;
                    const changes = commitChanges.get(commit.oid);
                    const isLoadingThis = loadingChanges === commit.oid;

                    return (
                        <div key={commit.oid} className="bg-secondary/30 rounded-md overflow-hidden">
                            <div className="flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <button
                                        onClick={() => loadCommitChanges(commit.oid)}
                                        className="shrink-0 p-1 hover:bg-secondary rounded transition-colors"
                                        title="Show changed files"
                                    >
                                        {isLoadingThis ? (
                                            <Clock className="w-4 h-4 animate-spin text-muted-foreground" />
                                        ) : isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {commit.message}
                                            </p>
                                            {index === 0 && (
                                                <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(commit.timestamp * 1000).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                by {commit.author}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {index > 0 && (
                                    <button
                                        onClick={() => handleRestore(commit)}
                                        disabled={isRestoring}
                                        className="ml-3 px-3 py-1.5 bg-accent hover:bg-accent/80 text-background rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        {isRestoring ? 'Restoring...' : 'Restore'}
                                    </button>
                                )}
                            </div>

                            {/* File Changes */}
                            {isExpanded && changes && changes.length > 0 && (
                                <div className="px-3 pb-3 pt-0 border-t border-border/50 mt-2">
                                    <div className="bg-background/50 rounded-md p-2 space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                            {changes.length} file{changes.length !== 1 ? 's' : ''} changed
                                        </p>
                                        {changes.map((change, idx) => {
                                            const StatusIcon =
                                                change.status === 'added' ? FilePlus :
                                                    change.status === 'deleted' ? FileX :
                                                        FileEdit;

                                            const statusColor =
                                                change.status === 'added' ? 'text-success' :
                                                    change.status === 'deleted' ? 'text-destructive' :
                                                        'text-info';

                                            return (
                                                <div key={idx} className="flex items-center gap-2 text-xs">
                                                    <StatusIcon className={`w-3 h-3 shrink-0 ${statusColor}`} />
                                                    <span className="text-foreground truncate flex-1">{change.path}</span>
                                                    {(change.additions > 0 || change.deletions > 0) && (
                                                        <span className="text-muted-foreground shrink-0">
                                                            {change.additions > 0 && <span className="text-success">+{change.additions}</span>}
                                                            {change.additions > 0 && change.deletions > 0 && ' '}
                                                            {change.deletions > 0 && <span className="text-destructive">-{change.deletions}</span>}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {isExpanded && changes && changes.length === 0 && (
                                <div className="px-3 pb-3 pt-0">
                                    <p className="text-xs text-muted-foreground text-center py-2">
                                        No file changes in this commit
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-500">
                    Restoring creates a new commit with the old state. Your history is never lost.
                </p>
            </div>
        </div>
    );
};
