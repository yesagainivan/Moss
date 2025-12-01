import { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useThemeStore } from '../store/useThemeStore';

export const useTheme = () => {
    const { settings } = useSettingsStore();
    const { loadThemes, applyTheme, activeThemeId, updateGrainLevel, updateGrainTexture } = useThemeStore();

    // Load themes on mount
    useEffect(() => {
        loadThemes();
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;

        const updateTheme = () => {
            const theme = settings.theme;
            root.classList.remove('light', 'dark');

            let isDark = false;

            if (theme === 'system') {
                isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            } else {
                isDark = theme === 'dark';
            }

            if (isDark) {
                root.classList.add('dark');
            } else {
                root.classList.add('light');
            }

            // Apply custom theme variables if active
            applyTheme(isDark);

            // Apply grain level
            updateGrainLevel(settings.grainLevel);
            updateGrainTexture(settings.grainTexture || 'subtle');
        };

        updateTheme();

        if (settings.theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => updateTheme();

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [settings.theme, settings.grainLevel, settings.grainTexture, activeThemeId]); // Re-run when settings or active custom theme changes
};
