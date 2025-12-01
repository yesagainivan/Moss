import { create } from 'zustand';

export interface EditorSettings {
    fontSize: number;        // 12-20px
    lineHeight: number;      // 1.4-2.0
    autoSaveDelay: number;   // milliseconds (0 = instant, 1000 = 1s, etc.)
    spellCheck: boolean;
    showDiffPanel: boolean;  // Show diff panel for AI changes (false = stream directly)
    theme: 'light' | 'dark' | 'system';
    graphPosition: 'center' | 'sidebar';
    graphShowParticles: boolean;
    graphShowLabels: boolean;
    enableMaxWidth: boolean; // Limit editor width for readability
    maxWidth: number;        // 600-1200px
    grainLevel: number;      // 0-100 (grain texture intensity)
    grainTexture: 'subtle' | 'dense' | 'noise'; // Texture type
}

export interface GitHubSyncSettings {
    repoUrl: string | null;
    repoOwner: string | null;
    repoName: string | null;
    lastSyncTimestamp: number | null;
}

interface SettingsState {
    settings: EditorSettings;
    githubSync: GitHubSyncSettings;
    currentVaultPath: string | null;
    updateSettings: (settings: Partial<EditorSettings>) => void;
    updateGitHubSync: (sync: Partial<GitHubSyncSettings>) => void;
    setVaultPath: (path: string | null) => void;
}

const DEFAULT_SETTINGS: EditorSettings = {
    fontSize: 16,
    lineHeight: 1.6,
    autoSaveDelay: 1000,
    spellCheck: true,
    showDiffPanel: true,
    theme: 'system',
    graphPosition: 'center',
    graphShowParticles: true,
    graphShowLabels: true,
    enableMaxWidth: true,
    maxWidth: 800,
    grainLevel: 50,
    grainTexture: 'subtle',
};

const DEFAULT_GITHUB_SYNC: GitHubSyncSettings = {
    repoUrl: null,
    repoOwner: null,
    repoName: null,
    lastSyncTimestamp: null,
};

const loadSettings = (): EditorSettings => {
    try {
        const saved = localStorage.getItem('moss-settings');
        if (saved) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Failed to load settings', e);
    }
    return DEFAULT_SETTINGS;
};

const loadGitHubSync = (vaultPath: string | null): GitHubSyncSettings => {
    if (!vaultPath) return DEFAULT_GITHUB_SYNC;
    try {
        const key = `moss-github-sync-${vaultPath}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            return { ...DEFAULT_GITHUB_SYNC, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Failed to load GitHub sync settings', e);
    }
    return DEFAULT_GITHUB_SYNC;
};

const saveSettings = (settings: EditorSettings) => {
    try {
        localStorage.setItem('moss-settings', JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save settings', e);
    }
};

const saveGitHubSync = (sync: GitHubSyncSettings, vaultPath: string | null) => {
    if (!vaultPath) return;
    try {
        const key = `moss-github-sync-${vaultPath}`;
        localStorage.setItem(key, JSON.stringify(sync));
    } catch (e) {
        console.error('Failed to save GitHub sync settings', e);
    }
};

export const useSettingsStore = create<SettingsState>((set) => ({
    settings: loadSettings(),
    githubSync: DEFAULT_GITHUB_SYNC, // Initial state, will be updated when vault path is set
    currentVaultPath: null,

    updateSettings: (newSettings) =>
        set((state) => {
            const updated = { ...state.settings, ...newSettings };
            saveSettings(updated);
            return { settings: updated };
        }),

    updateGitHubSync: (newSync) =>
        set((state) => {
            const updated = { ...state.githubSync, ...newSync };
            saveGitHubSync(updated, state.currentVaultPath);
            return { githubSync: updated };
        }),

    setVaultPath: (path) =>
        set(() => {
            const syncSettings = loadGitHubSync(path);
            return {
                currentVaultPath: path,
                githubSync: syncSettings
            };
        }),
}));
