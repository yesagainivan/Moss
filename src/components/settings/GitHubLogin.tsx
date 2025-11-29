import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useState, useEffect } from 'react';
import { Github, LogOut, Loader2, XCircle, Settings } from 'lucide-react';
import { GitHubRepoSelector } from './GitHubRepoSelector';
import { GitHubSyncStatus } from './GitHubSyncStatus';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAppStore } from '../../store/useStore';
import { useGitHubStore } from '../../store/useGitHubStore';

interface DeviceCodeResponse {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
}

interface GitHubLoginProps {
    clientId: string;
}

export function GitHubLogin({ clientId }: GitHubLoginProps) {
    const { vaultPath } = useAppStore();
    const { githubSync, updateGitHubSync } = useSettingsStore();
    const { user, isLoggedIn, checkLoginStatus, logout: storeLogout } = useGitHubStore();

    const [isLoading, setIsLoading] = useState(false);
    const [deviceCode, setDeviceCode] = useState<DeviceCodeResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showRepoSelector, setShowRepoSelector] = useState(false);

    // Check if already logged in on mount
    useEffect(() => {
        checkLoginStatus();
    }, []);

    const startLogin = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Step 1: Request device code
            const response = await invoke<DeviceCodeResponse>('github_start_device_flow', {
                clientId,
            });

            setDeviceCode(response);

            // Open browser to verification URL using Tauri's opener
            await openUrl(response.verification_uri);

            // Step 2: Start polling for token
            pollForToken(response.device_code, response.interval);
        } catch (err) {
            setError(err as string);
            setIsLoading(false);
        }
    };

    const pollForToken = async (deviceCode: string, interval: number) => {
        const maxAttempts = 60; // 5 minutes at 5-second intervals
        let attempts = 0;

        const poll = async () => {
            if (attempts >= maxAttempts) {
                setError('Login timed out. Please try again.');
                setIsLoading(false);
                setDeviceCode(null);
                return;
            }

            try {
                const token = await invoke<string | null>('github_poll_token', {
                    clientId,
                    deviceCode,
                });

                if (token) {
                    // Success! Save token
                    await invoke('github_save_token', { token });

                    // Refresh user info via store
                    await checkLoginStatus();

                    setIsLoading(false);
                    setDeviceCode(null);
                } else {
                    // Still pending, poll again
                    attempts++;
                    setTimeout(poll, interval * 1000);
                }
            } catch (err) {
                setError(err as string);
                setIsLoading(false);
                setDeviceCode(null);
            }
        };

        poll();
    };

    const handleRepoConfigured = () => {
        setShowRepoSelector(false);
    };

    const handleChangeRepo = () => {
        setShowRepoSelector(true);
    };

    const handleLogout = async () => {
        await storeLogout();
        // Clear repo configuration on logout
        updateGitHubSync({
            repoUrl: null,
            repoOwner: null,
            repoName: null,
            lastSyncTimestamp: null,
        });
    };

    if (isLoggedIn && user) {
        return (
            <div className="space-y-4">
                {/* User Info Header */}
                <div className="flex items-center justify-between p-4 bg-[var(--sidebar-bg)] rounded-lg border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                        <img
                            src={user.avatar_url}
                            alt={user.login}
                            className="w-10 h-10 rounded-full"
                        />
                        <div>
                            <div className="font-medium text-[var(--text-primary)]">
                                {user.name || user.login}
                            </div>
                            <div className="text-sm text-[var(--text-secondary)]">
                                @{user.login}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>

                {/* Repository Selector or Sync Status */}
                {showRepoSelector || !githubSync.repoOwner ? (
                    vaultPath && (
                        <GitHubRepoSelector
                            vaultPath={vaultPath}
                            onConfigured={handleRepoConfigured}
                        />
                    )
                ) : (
                    <>
                        <GitHubSyncStatus
                            repoOwner={githubSync.repoOwner}
                            repoName={githubSync.repoName!}
                        />
                        <button
                            onClick={handleChangeRepo}
                            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
                        >
                            <Settings size={16} />
                            Change Repository
                        </button>
                    </>
                )}
            </div>
        );
    }

    if (deviceCode) {
        return (
            <div className="p-4 bg-[var(--sidebar-bg)] rounded-lg border border-[var(--border-color)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-color)]" />
                    <div className="text-center">
                        <div className="text-lg font-medium text-[var(--text-primary)] mb-2">
                            Waiting for authorization...
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] mb-4">
                            Enter this code on GitHub:
                        </div>
                        <div className="px-4 py-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                            <code className="text-2xl font-mono font-bold text-[var(--accent-color)]">
                                {deviceCode.user_code}
                            </code>
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-2">
                            Browser should have opened automatically
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <button
                onClick={startLogin}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#24292e] text-white rounded-lg hover:bg-[#1b1f23] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    <>
                        <Github size={20} />
                        Login with GitHub
                    </>
                )}
            </button>

            {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-500">{error}</div>
                </div>
            )}
        </div>
    );
}
