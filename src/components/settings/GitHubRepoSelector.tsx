import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';
import { Search, Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

interface Repository {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    clone_url: string;
    description: string | null;
    owner: {
        login: string;
    };
}

interface GitHubRepoSelectorProps {
    vaultPath: string;
    onConfigured: () => void;
}

export function GitHubRepoSelector({ vaultPath, onConfigured }: GitHubRepoSelectorProps) {
    const { updateGitHubSync } = useSettingsStore();
    const [repos, setRepos] = useState<Repository[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newRepoName, setNewRepoName] = useState('');
    const [newRepoDescription, setNewRepoDescription] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

    useEffect(() => {
        loadRepositories();
    }, []);

    const loadRepositories = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const repoList = await invoke<Repository[]>('github_list_repositories');
            setRepos(repoList);
        } catch (err) {
            setError(err as string);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRepository = async () => {
        if (!newRepoName.trim()) return;

        setIsCreating(true);
        setError(null);
        try {
            const repo = await invoke<Repository>('github_create_repository', {
                name: newRepoName.trim(),
                description: newRepoDescription.trim() || null,
            });

            // Add to list and select it
            setRepos([repo, ...repos]);
            setSelectedRepo(repo);
            setShowCreateForm(false);
            setNewRepoName('');
            setNewRepoDescription('');
        } catch (err) {
            setError(err as string);
        } finally {
            setIsCreating(false);
        }
    };

    const handleConfigureRepository = async () => {
        if (!selectedRepo) return;

        setIsConfiguring(true);
        setError(null);
        try {
            // Configure Git remote
            await invoke('git_configure_remote', {
                vaultPath,
                remoteUrl: selectedRepo.clone_url,
            });

            // Save repo configuration to settings
            updateGitHubSync({
                repoUrl: selectedRepo.clone_url,
                repoOwner: selectedRepo.owner.login,
                repoName: selectedRepo.name,
            });

            onConfigured();
        } catch (err) {
            setError(err as string);
        } finally {
            setIsConfiguring(false);
        }
    };

    const filteredRepos = repos.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-color)]" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                    Select Repository
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Choose an existing repository or create a new private repo for your vault.
                </p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search repositories..."
                    className="w-full pl-10 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] placeholder:text-[var(--text-border)]"
                />
            </div>

            {/* Create New Repository Button */}
            {!showCreateForm && (
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 w-full px-3 py-2 bg-[var(--accent-color)]/10 text-[var(--accent-color)] hover:bg-[var(--accent-color)]/20 rounded-md text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    Create New Repository
                </button>
            )}

            {/* Create Form */}
            {showCreateForm && (
                <div className="p-4 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg space-y-3">
                    <h5 className="text-sm font-medium text-[var(--text-primary)]">Create New Repository</h5>

                    <input
                        type="text"
                        value={newRepoName}
                        onChange={(e) => setNewRepoName(e.target.value)}
                        placeholder="Repository name (e.g., my-vault)"
                        className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                    />

                    <input
                        type="text"
                        value={newRepoDescription}
                        onChange={(e) => setNewRepoDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                    />

                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateRepository}
                            disabled={!newRepoName.trim() || isCreating}
                            className="flex-1 px-3 py-2 bg-[var(--accent-color)] text-white hover:opacity-90 rounded-md text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create'
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setShowCreateForm(false);
                                setNewRepoName('');
                                setNewRepoDescription('');
                            }}
                            disabled={isCreating}
                            className="px-3 py-2 bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] rounded-md text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Repository List */}
            <div className="max-h-64 overflow-y-auto space-y-2 border border-[var(--border-color)] rounded-lg p-2">
                {filteredRepos.map((repo) => (
                    <button
                        key={repo.id}
                        onClick={() => setSelectedRepo(repo)}
                        className={`w-full text-left p-3 rounded-md transition-colors ${selectedRepo?.id === repo.id
                            ? 'bg-[var(--accent-color)]/10 border-2 border-[var(--accent-color)]'
                            : 'bg-[var(--sidebar-bg)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)]'
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                                    {repo.name}
                                </div>
                                <div className="text-xs text-[var(--text-tertiary)] truncate">
                                    {repo.full_name}
                                </div>
                                {repo.description && (
                                    <div className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">
                                        {repo.description}
                                    </div>
                                )}
                            </div>
                            {repo.private && (
                                <span className="ml-2 px-2 py-0.5 bg-[var(--accent-color)]/20 text-[var(--accent-color)] text-xs rounded">
                                    Private
                                </span>
                            )}
                        </div>
                    </button>
                ))}

                {filteredRepos.length === 0 && (
                    <div className="text-center py-8 text-sm text-[var(--text-secondary)]">
                        {searchQuery ? 'No repositories match your search.' : 'No repositories found.'}
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-500">{error}</div>
                </div>
            )}

            {/* Configure Button */}
            <button
                onClick={handleConfigureRepository}
                disabled={!selectedRepo || isConfiguring}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent-color)] text-foreground hover:opacity-90 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isConfiguring ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Configuring...
                    </>
                ) : (
                    <>
                        <CheckCircle className="w-5 h-5" />
                        Configure Repository
                    </>
                )}
            </button>
        </div>
    );
}
