import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useGitHubStore } from '../../store/useGitHubStore';
import { ConflictResolutionModal } from '../git/ConflictResolutionModal';

interface GitHubSyncStatusProps {
    repoOwner: string;
    repoName: string;
}

export function GitHubSyncStatus({ repoOwner, repoName }: GitHubSyncStatusProps) {
    const { currentVaultPath: vaultPath } = useSettingsStore();
    const {
        syncStatus,
        isSyncing,
        lastSyncTime,
        syncError,
        conflicts,
        checkSyncStatus,
        sync,
        resolveConflict,
        completeMerge,
        clearConflicts
    } = useGitHubStore();

    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (vaultPath) {
            checkSyncStatus(vaultPath);
        }
    }, [vaultPath, checkSyncStatus]);

    const handleSync = async () => {
        if (!vaultPath) return;

        setSuccessMessage(null);

        await sync(vaultPath);

        // Check if there were conflicts or an error after sync
        const { conflicts: newConflicts, syncError: currentError } = useGitHubStore.getState();

        if (!currentError && !newConflicts) {
            setSuccessMessage('Vault synced successfully!');
            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    const handleResolveConflict = async (filePath: string, resolution: 'ours' | 'theirs' | 'manual', customContent?: string) => {
        if (!vaultPath) return;
        await resolveConflict(vaultPath, filePath, resolution, customContent);
    };

    const handleCompleteMerge = async () => {
        if (!vaultPath) return;
        await completeMerge(vaultPath);

        // Show success message after completing merge
        const currentError = useGitHubStore.getState().syncError;
        if (!currentError) {
            setSuccessMessage('Merge completed and pushed successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    const handleCancelConflicts = async () => {
        await clearConflicts();
    };

    const formatTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                    Sync Status
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Connected to <span className="font-mono text-[var(--accent-color)]">{repoOwner}/{repoName}</span>
                </p>
            </div>

            {/* Status Card */}
            <div className="p-4 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg space-y-3">
                {/* Up to Date / Ahead / Behind */}
                {syncStatus && (
                    <div className="flex items-center gap-2">
                        {syncStatus.up_to_date ? (
                            <>
                                <CheckCircle className="w-5 h-5 text-success" />
                                <span className="text-sm text-success font-medium">Up to date</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-5 h-5 text-warning" />
                                <span className="text-sm text-warning font-medium">Changes detected</span>
                            </>
                        )}
                    </div>
                )}

                {/* Ahead/Behind Counts */}
                {syncStatus && !syncStatus.up_to_date && (
                    <div className="flex gap-4 text-xs">
                        {syncStatus.ahead > 0 && (
                            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                                <ArrowUp className="w-4 h-4 text-info" />
                                <span>{syncStatus.ahead} commit{syncStatus.ahead !== 1 ? 's' : ''} ahead</span>
                            </div>
                        )}
                        {syncStatus.behind > 0 && (
                            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                                <ArrowDown className="w-4 h-4 text-destructive" />
                                <span>{syncStatus.behind} commit{syncStatus.behind !== 1 ? 's' : ''} behind</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Last Sync Time */}
                {lastSyncTime && (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                        <Clock className="w-4 h-4" />
                        <span>Last synced {formatTimeAgo(lastSyncTime)}</span>
                    </div>
                )}

                {/* Sync Button */}
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent-color)] text-[var(--text-primary)] hover:opacity-90 rounded-md text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSyncing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Syncing...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-4 h-4" />
                            Sync Now
                        </>
                    )}
                </button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-success">{successMessage}</div>
                </div>
            )}

            {/* Error Message */}
            {syncError && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-destructive">{syncError}</div>
                </div>
            )}

            {/* Info */}
            <div className="p-3 bg-[var(--accent-color)]/5 border border-[var(--accent-color)]/20 rounded-lg">
                <p className="text-xs text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">How sync works:</strong> Pulls latest changes from GitHub, then pushes your local commits. Conflicts will be shown for resolution.
                </p>
            </div>

            {/* Conflict Resolution Modal */}
            {conflicts && conflicts.length > 0 && (
                <ConflictResolutionModal
                    conflicts={conflicts}
                    onResolve={handleResolveConflict}
                    onComplete={handleCompleteMerge}
                    onCancel={handleCancelConflicts}
                />
            )}
        </div>
    );
}
