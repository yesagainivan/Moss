import { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * Hook that syncs font size settings to CSS custom properties.
 * This allows dynamic font size updates across the entire application
 * without component re-mounting.
 * 
 * Usage: Call once at the app root level (in App.tsx)
 */
export const useFontScale = () => {
    const uiFontSize = useSettingsStore(state => state.settings.uiFontSize);
    const editorFontSize = useSettingsStore(state => state.settings.editorFontSize);

    useEffect(() => {
        // Update CSS custom properties on the root element
        const root = document.documentElement;

        root.style.setProperty('--font-size-ui', `${uiFontSize}px`);
        root.style.setProperty('--font-size-editor', `${editorFontSize}px`);

        // Derived semantic sizes (optional for future use)
        root.style.setProperty('--font-size-ui-xs', `${uiFontSize * 0.75}px`);
        root.style.setProperty('--font-size-ui-sm', `${uiFontSize * 0.875}px`);
        root.style.setProperty('--font-size-ui-lg', `${uiFontSize * 1.125}px`);
        root.style.setProperty('--font-size-ui-xl', `${uiFontSize * 1.25}px`);
    }, [uiFontSize, editorFontSize]);
};
