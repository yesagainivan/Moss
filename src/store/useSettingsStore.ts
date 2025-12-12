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
    hasSeenWelcome?: boolean; // Whether the user has seen the welcome note
}

export interface GitHubSyncSettings {
    repoUrl: string | null;
    repoOwner: string | null;
    repoName: string | null;
    lastSyncTimestamp: number | null;
}

export interface DailyNotesSettings {
    enabled: boolean;
    folder: string;
    template: string | null;
    dateFormat: string;
}

interface SettingsState {
    settings: EditorSettings;
    githubSync: GitHubSyncSettings;
    dailyNotes: DailyNotesSettings;
    currentVaultPath: string | null;
    updateSettings: (settings: Partial<EditorSettings>) => void;
    updateGitHubSync: (sync: Partial<GitHubSyncSettings>) => void;
    updateDailyNotesSettings: (settings: Partial<DailyNotesSettings>) => void;
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
    hasSeenWelcome: false,
};

const DEFAULT_GITHUB_SYNC: GitHubSyncSettings = {
    repoUrl: null,
    repoOwner: null,
    repoName: null,
    lastSyncTimestamp: null,
};

const DEFAULT_DAILY_NOTES: DailyNotesSettings = {
    enabled: true,
    folder: 'Daily Notes',
    template: null,
    dateFormat: 'YYYY-MM-DD',
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

const loadDailyNotes = (): DailyNotesSettings => {
    try {
        const saved = localStorage.getItem('moss-daily-notes');
        if (saved) {
            return { ...DEFAULT_DAILY_NOTES, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Failed to load daily notes settings', e);
    }
    return DEFAULT_DAILY_NOTES;
};

const saveDailyNotes = (settings: DailyNotesSettings) => {
    try {
        localStorage.setItem('moss-daily-notes', JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save daily notes settings', e);
    }
};

export const useSettingsStore = create<SettingsState>((set) => ({
    settings: loadSettings(),
    githubSync: DEFAULT_GITHUB_SYNC,
    dailyNotes: loadDailyNotes(),
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

    updateDailyNotesSettings: (newSettings) =>
        set((state) => {
            const updated = { ...state.dailyNotes, ...newSettings };
            saveDailyNotes(updated);
            return { dailyNotes: updated };
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
