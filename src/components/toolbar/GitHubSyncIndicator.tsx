import { useEffect, useState } from 'react';
import { Cloud, CloudOff, ArrowUp, ArrowDown, Loader2, AlertCircle, Check } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useGitHubStore } from '../../store/useGitHubStore';
import { useGitStore } from '../../store/useGitStore';

export function GitHubSyncIndicator() {
    const { gitEnabled } = useGitStore();
    const { githubSync, currentVaultPath: vaultPath } = useSettingsStore();
    const {
        isLoggedIn,
        syncStatus,
        isSyncing,
        syncError,
        checkSyncStatus,
        sync
    } = useGitHubStore();

    const [isHovered, setIsHovered] = useState(false);

    // Only show if ALL conditions are met:
    // 1. Git is enabled for the vault
    // 2. User is logged into GitHub
    // 3. Repository is configured
    const shouldShow = gitEnabled && isLoggedIn && !!(githubSync.repoOwner && githubSync.repoName);

    // Poll sync status and handle window focus
    useEffect(() => {
        if (!vaultPath || !shouldShow) {
            return;
        }

        // Check immediately
        checkSyncStatus(vaultPath);

        // Then poll every 2 minutes (120 seconds)
        const interval = setInterval(() => checkSyncStatus(vaultPath), 120000);

        // Also check when window gains focus
        const handleFocus = () => {
            checkSyncStatus(vaultPath);
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [vaultPath, shouldShow, checkSyncStatus]);

    const handleSync = async () => {
        if (!vaultPath || !shouldShow || isSyncing) return;
        await sync(vaultPath);
    };

    // Don't show if not properly configured
    if (!shouldShow) {
        return null;
    }

    // Determine current state
    let icon = <Cloud className="w-4 h-4" />;
    let text = 'Sync';
    let colorClass = 'text-[var(--text-tertiary)]';
    let tooltip = 'Click to sync with GitHub';

    if (syncError) {
        icon = <AlertCircle className="w-4 h-4" />;
        text = 'Error';
        colorClass = 'text-red-500';
        tooltip = syncError;
    } else if (isSyncing) {
        icon = <Loader2 className="w-4 h-4 animate-spin" />;
        text = 'Syncing...';
        colorClass = 'text-[var(--accent-color)]';
        tooltip = 'Syncing with GitHub...';
    } else if (syncStatus) {
        if (syncStatus.up_to_date) {
            icon = <Check className="w-4 h-4" />;
            text = 'Synced';
            colorClass = 'text-success';
            tooltip = 'Up to date with GitHub';
        } else if (syncStatus.ahead > 0 && syncStatus.behind === 0) {
            icon = <ArrowUp className="w-4 h-4" />;
            text = `${syncStatus.ahead} ahead`;
            colorClass = 'text-info';
            tooltip = `${syncStatus.ahead} commit${syncStatus.ahead !== 1 ? 's' : ''} to push`;
        } else if (syncStatus.behind > 0 && syncStatus.ahead === 0) {
            icon = <ArrowDown className="w-4 h-4" />;
            text = `${syncStatus.behind} behind`;
            colorClass = 'text-destructive';
            tooltip = `${syncStatus.behind} commit${syncStatus.behind !== 1 ? 's' : ''} to pull`;
        } else if (syncStatus.ahead > 0 && syncStatus.behind > 0) {
            icon = <CloudOff className="w-4 h-4" />;
            text = 'Diverged';
            colorClass = 'text-warning';
            tooltip = `${syncStatus.ahead} ahead, ${syncStatus.behind} behind - sync to resolve`;
        }
    }

    return (
        <div className="relative">
            <button
                onClick={handleSync}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={isSyncing}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${colorClass} hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed`}
                title={tooltip}
            >
                {icon}
                <span className="text-xs font-medium">{text}</span>
            </button>

            {/* Tooltip */}
            {isHovered && !syncError && (
                <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded shadow-lg text-xs text-[var(--text-secondary)] whitespace-nowrap z-50">
                    {tooltip}
                </div>
            )}
        </div>
    );
}
