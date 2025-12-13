import { create } from 'zustand';
import { Theme } from '../types/theme';
import { BaseDirectory, readTextFile, readDir, mkdir, exists } from '@tauri-apps/plugin-fs';
import { load } from 'js-yaml';

interface ThemeState {
    themes: Theme[];
    activeThemeId: string | null; // null means default built-in theme
    isLoading: boolean;
    error: string | null;

    loadThemes: () => Promise<void>;
    setActiveTheme: (themeName: string | null) => void;
    applyTheme: (isDark: boolean) => void;
    updateGrainLevel: (level: number) => void;
    updateGrainTexture: (texture: string) => void;
}

const THEMES_DIR = 'themes';

// Default theme - Aligns with CSS variables in index.css
// This theme acts as a fallback and documents the expected color structure
const DEFAULT_THEME: Theme = {
    version: '1.0',
    name: 'Default',
    description: 'The default Moss theme (Linen/Earth palette)',
    colors: {
        // Light mode colors (match :root in index.css)
        primary: '#6b7f6c', // --color-moss (main brand color)
        secondary: '#e8e2d2', // Slightly darker linen
        accent: '#4a3b30', // --color-earth (supplementary)
        background: '#f5efe1', // --color-linen
        background_subtle: '#f5efe1',
        surface: '#e8e2d2',
        surface_highlight: '#e8e2d2',
        foreground: '#4a3b30', // --color-earth
        subtle_foreground: '#8c7b70', // Lighter earth
        outline: '#dcd6c8', // Darker linen
        outline_subtle: '#dcd6c8',
    },
    utility: {
        alert: { background: '#a87c7c', foreground: '#f5efe1', border: '#a87c7c', subtle_background: 'rgba(168, 124, 124, 0.1)' },
        success: { background: '#6b7f6c', foreground: '#f5efe1', border: '#6b7f6c', subtle_background: 'rgba(107, 127, 108, 0.1)' },
        warning: { background: '#e0ba62', foreground: '#4a3b30', border: '#e0ba62', subtle_background: 'rgba(224, 186, 98, 0.1)' },
        info: { background: '#3b82f6', foreground: '#dbeafe', border: '#3b82f6', subtle_background: 'rgba(59, 130, 246, 0.1)' },
    },
    dark: {
        background: '#1c1a19', // Much darker, desaturated earth
        background_subtle: '#141211',
        surface: '#262322',
        surface_highlight: '#332f2d',
        foreground: '#e8e4dc', // Desaturated linen
        subtle_foreground: '#a89b90',
        outline: '#332f2d',
        outline_subtle: '#262322',
        // accent: '#e8e4dc',
        accent: '#a1854bff',
        secondary: '#262322',
        primary: '#8a9b8b', // Lighter moss for dark mode
    }
};

// Muted Coffee theme - Custom dark theme example
const MUTED_COFFEE_THEME: Theme = {
    version: '1.0',
    name: 'Muted Coffee',
    description: 'Warm, cozy coffee tones for a relaxed focus',
    colors: {
        // Light mode colors
        primary: '#d4a373', // Caramel
        secondary: '#e8e2d2', // Light linen
        accent: '#4a3b30', // Dark coffee
        background: '#f5efe1', // Light cream
        background_subtle: '#f0e9dd',
        surface: '#e8e2d2',
        surface_highlight: '#dcd6c8',
        foreground: '#4a3b30', // Dark coffee
        subtle_foreground: '#8c7b70', // Muted coffee
        outline: '#dcd6c8',
        outline_subtle: '#e8e2d2',
    },
    utility: {
        alert: { background: '#ef4444', foreground: '#fee2e2', border: '#ef4444', subtle_background: 'rgba(239, 68, 68, 0.1)' },
        success: { background: '#10b981', foreground: '#d1fae5', border: '#10b981', subtle_background: 'rgba(16, 185, 129, 0.1)' },
        warning: { background: '#f59e0b', foreground: '#fef3c7', border: '#f59e0b', subtle_background: 'rgba(245, 158, 11, 0.1)' },
        info: { background: '#3b82f6', foreground: '#dbeafe', border: '#3b82f6', subtle_background: 'rgba(59, 130, 246, 0.1)' },
    },
    dark: {
        // Dark mode colors (previously defined in 'colors' and 'dark' properties)
        primary: '#d4a373', // Caramel
        secondary: '#b27651ff',
        accent: '#c18e6fff', // Coffee brown
        background: '#201b18',
        background_subtle: '#181412',
        surface: '#2a2420',
        surface_highlight: '#453a33',
        foreground: '#e6dccf',
        subtle_foreground: '#a89f91',
        outline: '#453a33',
        outline_subtle: '#2a2420',
    }
};

export const useThemeStore = create<ThemeState>((set, get) => ({
    themes: [],
    activeThemeId: localStorage.getItem('moss-active-theme'),
    isLoading: false,
    error: null,

    loadThemes: async () => {
        set({ isLoading: true, error: null });
        try {
            // Ensure themes directory exists
            const hasDir = await exists(THEMES_DIR, { baseDir: BaseDirectory.AppLocalData });
            if (!hasDir) {
                await mkdir(THEMES_DIR, { baseDir: BaseDirectory.AppLocalData, recursive: true });
            }

            const entries = await readDir(THEMES_DIR, { baseDir: BaseDirectory.AppLocalData });
            const themes: Theme[] = [];

            for (const entry of entries) {
                if (entry.isFile && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
                    try {
                        const content = await readTextFile(`${THEMES_DIR}/${entry.name}`, { baseDir: BaseDirectory.AppLocalData });
                        const theme = load(content) as Theme;
                        // Basic validation
                        if (theme.name && theme.colors) {
                            themes.push(theme);
                        }
                    } catch (e) {
                        console.error(`Failed to load theme ${entry.name}:`, e);
                    }
                }
            }

            // Add hardcoded themes for testing
            themes.push(MUTED_COFFEE_THEME);

            set({ themes, isLoading: false });

            // Apply the active theme after loading themes to ensure persistence works
            const isDark = document.documentElement.classList.contains('dark');
            get().applyTheme(isDark);
        } catch (e) {
            console.error('Failed to load themes:', e);
            set({ error: 'Failed to load themes', isLoading: false });
        }
    },

    setActiveTheme: (themeName) => {
        if (themeName) {
            localStorage.setItem('moss-active-theme', themeName);
        } else {
            localStorage.removeItem('moss-active-theme');
        }
        set({ activeThemeId: themeName });

        // Immediately apply
        const isDark = document.documentElement.classList.contains('dark');
        get().applyTheme(isDark);
    },

    applyTheme: (isDark) => {
        const { themes, activeThemeId } = get();
        const activeTheme = themes.find(t => t.name === activeThemeId) || DEFAULT_THEME;

        const root = document.documentElement;
        const colors = isDark && activeTheme.dark ? { ...activeTheme.colors, ...activeTheme.dark } : activeTheme.colors;

        // Apply CSS variables
        const setVar = (name: string, value: string) => {
            if (value) root.style.setProperty(name, value);
        };

        // Core colors
        setVar('--background', colors.background);
        setVar('--foreground', colors.foreground);
        setVar('--card', colors.surface);
        setVar('--card-foreground', colors.foreground);
        setVar('--popover', colors.surface);
        setVar('--popover-foreground', colors.foreground);
        setVar('--primary', colors.primary);
        setVar('--primary-foreground', isDark ? colors.background : colors.surface); // Approximation
        setVar('--secondary', colors.secondary);
        setVar('--secondary-foreground', colors.foreground);
        setVar('--muted', colors.secondary); // Often similar
        setVar('--muted-foreground', colors.subtle_foreground);
        setVar('--accent', colors.accent);
        setVar('--accent-foreground', colors.surface);
        setVar('--destructive', activeTheme.utility.alert.background);
        setVar('--destructive-foreground', activeTheme.utility.alert.foreground);
        setVar('--border', colors.outline);
        setVar('--input', colors.outline);
        setVar('--ring', colors.accent);

        // Utility Colors
        setVar('--success', activeTheme.utility.success.background);
        setVar('--success-foreground', activeTheme.utility.success.foreground);
        setVar('--warning', activeTheme.utility.warning.background);
        setVar('--warning-foreground', activeTheme.utility.warning.foreground);
        setVar('--info', activeTheme.utility.info.background);
        setVar('--info-foreground', activeTheme.utility.info.foreground);

        // v2.0 Subtle Colors
        setVar('--background-subtle', colors.background_subtle || colors.background);
        setVar('--surface-highlight', colors.surface_highlight || colors.surface);
        setVar('--border-subtle', colors.outline_subtle || colors.outline);

        // Custom CSS
        const styleId = 'moss-custom-theme-css';
        let styleEl = document.getElementById(styleId) as HTMLStyleElement;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        if (activeTheme.branding?.custom_css) {
            styleEl.textContent = activeTheme.branding.custom_css;
        } else {
            styleEl.textContent = '';
        }
    },

    updateGrainLevel: (level: number) => {
        // Convert 0-100 to opacity values
        // Light mode: 0.03 to 0.12 (subtle to moderate)
        // Dark mode: 0.05 to 0.18 (slightly more visible for better depth)
        const isDark = document.documentElement.classList.contains('dark');
        const minOpacity = isDark ? 0.05 : 0.03;
        const maxOpacity = isDark ? 0.18 : 0.12;
        const opacity = level === 0 ? 0 : minOpacity + (level / 100) * (maxOpacity - minOpacity);

        if (level === 0) {
            document.documentElement.style.setProperty('--grain-opacity', '0');
        } else {
            document.documentElement.style.setProperty('--grain-opacity', opacity.toFixed(3));
        }
    },

    updateGrainTexture: (texture: string) => {
        let url = "url('/grain.png')";
        if (texture === 'dense') {
            url = "url('/grain_dense.png')";
        } else if (texture === 'noise') {
            url = "url('/svg_noise.svg')";
        }
        document.documentElement.style.setProperty('--grain-texture', url);
    }
}));
