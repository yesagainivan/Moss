import { useEffect } from 'react';
import { useAppStore } from '../store/useStore';

export const useGlobalShortcuts = () => {
    const toggleSidebar = useAppStore(state => state.toggleSidebar);

    // We need to access the current active tab's note ID for saving
    // But we don't want to subscribe to the whole tabs array if possible
    // However, for the shortcut to work correctly with the *current* state, 
    // we need the latest data.
    // Since this hook is used at the top level, it might still cause re-renders if we subscribe to everything.
    // Ideally, we use getState() inside the event handler, but that's not reactive for the dependency array.
    // BUT, since we are using event listeners, we can use useAppStore.getState() inside the handler!
    // This avoids subscriptions entirely for the shortcuts.

    // Cmd+B to toggle sidebar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSidebar]);

    // Cmd+[ and Cmd+] for navigation (back/forward)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const state = useAppStore.getState();

            if ((e.metaKey || e.ctrlKey) && e.key === '[') {
                e.preventDefault();
                state.navigateBack();
            } else if ((e.metaKey || e.ctrlKey) && e.key === ']') {
                e.preventDefault();
                state.navigateForward();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Cmd+S variants (Cmd+Shift+S, Cmd+Alt+S)
    // Note: Plain Cmd+S is handled by the Editor component to ensure proper content sync
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Use e.code 'KeyS' to handle layouts where Option+S produces special chars (e.g. 'ß' on Mac)
            if ((e.metaKey || e.ctrlKey) && e.code === 'KeyS') {
                const state = useAppStore.getState();

                if (e.altKey) {
                    // Cmd+Alt+S: Snapshot Vault
                    e.preventDefault();
                    state.snapshotVault();
                    return;
                } else if (e.shiftKey) {
                    // Cmd+Shift+S: Snapshot Active Note
                    e.preventDefault();
                    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
                    if (activeTab && activeTab.noteId) {
                        state.snapshotNote(activeTab.noteId);
                    }
                    return;
                }
                // Plain Cmd+S: Let it bubble to the editor, don't prevent or handle here
            }

            if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
                e.preventDefault();
                const state = useAppStore.getState();
                if (state.activeTabId) {
                    state.closeTab(state.activeTabId);
                }
            }

            // Cmd+H (History)
            if ((e.metaKey || e.ctrlKey) && e.code === 'KeyH') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-history-modal'));
            }

            // Cmd+, (Settings)
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-settings-modal'));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // No dependencies needed as we use getState()
};
