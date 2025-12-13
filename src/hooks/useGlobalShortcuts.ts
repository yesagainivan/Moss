import { useEffect } from 'react';
import { useAppStore } from '../store/useStore';
import { usePaneStore } from '../store/usePaneStore';
import { useGitStore } from '../store/useGitStore';

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

    // Cmd+Opt+B (Backlinks)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === 'KeyB') {
                e.preventDefault();
                const state = useAppStore.getState();
                state.setBacklinksPanelOpen(!state.isBacklinksPanelOpen);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Cmd+Opt+O (Outline)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === 'KeyO') {
                e.preventDefault();
                const state = useAppStore.getState();
                state.setOutlinePanelOpen(!state.isOutlinePanelOpen);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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
                    useGitStore.getState().snapshotVault();
                    return;
                } else if (e.shiftKey) {
                    // Cmd+Shift+S: Snapshot Active Note
                    e.preventDefault();
                    const paneState = usePaneStore.getState();
                    const activePane = paneState.getActivePane();
                    const activeTab = activePane?.tabs?.find(t => t.id === activePane.activeTabId);
                    if (activeTab && activeTab.noteId) {
                        useGitStore.getState().snapshotNote(activeTab.noteId, state.forceSaveNote, state.setSaveState);
                    }
                    return;
                }
                // Plain Cmd+S: Let it bubble to the editor, don't prevent or handle here
            }

            if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
                e.preventDefault();
                const paneState = usePaneStore.getState();
                const activePane = paneState.getActivePane();

                if (activePane && activePane.activeTabId) {
                    // Close the active tab
                    paneState.closeTab(activePane.activeTabId);

                    // After closing the tab, check if the pane is now empty
                    // If it is AND we have a split view, close the pane too
                    const updatedPane = paneState.findPaneById(activePane.id);
                    if (updatedPane &&
                        updatedPane.type === 'leaf' &&
                        (!updatedPane.tabs || updatedPane.tabs.length === 0) &&
                        paneState.paneRoot.type === 'split') {
                        // Pane is empty and we have multiple panes - close it
                        paneState.closePane(activePane.id);
                    }
                }
            }

            // Split View Shortcuts
            // Cmd+\ : Split Vertical
            if ((e.metaKey || e.ctrlKey) && e.key === '\\' && !e.shiftKey) {
                e.preventDefault();
                const paneState = usePaneStore.getState();
                if (paneState.activePaneId) {
                    paneState.splitPane(paneState.activePaneId, 'vertical');
                }
            }

            // Cmd+Shift+\ : Split Horizontal
            if ((e.metaKey || e.ctrlKey) && e.key === '|' || ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '\\')) {
                e.preventDefault();
                const paneState = usePaneStore.getState();
                if (paneState.activePaneId) {
                    paneState.splitPane(paneState.activePaneId, 'horizontal');
                }
            }

            // Pane Focus Switching (Cmd+1, Cmd+2)
            if ((e.metaKey || e.ctrlKey) && (e.key === '1' || e.key === '2')) {
                e.preventDefault();
                const paneState = usePaneStore.getState();
                const leafPanes = paneState.getAllLeafPanes();

                if (e.key === '1' && leafPanes.length > 0) {
                    paneState.setActivePane(leafPanes[0].id);
                } else if (e.key === '2' && leafPanes.length > 1) {
                    paneState.setActivePane(leafPanes[1].id);
                }
            }

            // Cmd+H (History)
            if ((e.metaKey || e.ctrlKey) && e.code === 'KeyH') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-history-modal'));
            }

            // Cmd+Shift+F (Search)
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyF') {
                e.preventDefault();
                const state = useAppStore.getState();
                state.setSearchModalOpen(true);
            }

            // Cmd+Shift+D (Open Today's Daily Note)
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyD') {
                e.preventDefault();
                const state = useAppStore.getState();
                state.openDailyNote();
            }

            // Cmd+, (Settings)
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-settings-modal'));
            }

            // Cmd+/ or Cmd+? (Shortcuts Help)
            if ((e.metaKey || e.ctrlKey) && (e.key === '/' || e.key === '?')) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-shortcuts-modal'));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // No dependencies needed as we use getState()
};
