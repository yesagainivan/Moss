import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../store/useStore';

export const useAppInitialization = () => {
    const initialize = useAppStore(state => state.initialize);
    const refreshFileTree = useAppStore(state => state.refreshFileTree);
    const loadTemplates = useAppStore(state => state.loadTemplates);
    const vaultPath = useAppStore(state => state.vaultPath);

    useEffect(() => {
        initialize();
    }, [initialize]);

    // Load templates when vault changes
    useEffect(() => {
        if (vaultPath) {
            loadTemplates();
        }
    }, [vaultPath, loadTemplates]);

    // Welcome Note Logic
    useEffect(() => {
        const checkWelcome = async () => {
            if (!vaultPath) return;

            const { useSettingsStore } = await import('../store/useSettingsStore');
            const { checkExists, createFile } = await import('../lib/fs');
            const settingsStore = useSettingsStore.getState();

            // Check if we've already welcomed the user
            if (settingsStore.settings.hasSeenWelcome) return;

            const welcomePath = `${vaultPath}/Welcome.md`;
            const exists = await checkExists(welcomePath);

            if (!exists) {
                // Create Welcome Note
                const welcomeContent = `# Welcome to Moss 🌿

Moss is your new second brain. It's designed to be simple, fast, and beautiful.

## Quick Start

- **New Note**: \`Cmd+N\`
- **Search**: \`Cmd+Shift+F\`
- **Command Palette**: \`Cmd+P\`
- **Daily Note**: \`Cmd+Shift+D\`

## Features

- **Markdown First**: Write in pure Markdown.
- **Git Sync**: Your notes are yours. Sync to GitHub automatically.
- **Graph View**: See connections between your thoughts.
- **Linked Editing**: Use \`[[WikiLinks]]\` to connect notes.

## Tips

- Drag and drop images directly into the editor.
- Use \`Cmd+Opt+B\` to toggle headings.

Enjoy writing!
`;
                await createFile(welcomePath, welcomeContent);

                // Open it
                const { useAppStore } = await import('../store/useStore');
                await useAppStore.getState().openNote(welcomePath);

                // Mark as seen
                useSettingsStore.getState().updateSettings({ hasSeenWelcome: true });
            } else {
                // If it exists but flag is false (maybe pre-existing user), mark as seen so we don't annoy them later if they delete it
                useSettingsStore.getState().updateSettings({ hasSeenWelcome: true });
            }
        };

        checkWelcome();
    }, [vaultPath]);

    // Refresh file tree on window focus to catch external changes
    const isInitialMount = useRef(true);

    useEffect(() => {
        const handleFocus = () => {
            // Skip the very first focus event which happens on mount/startup
            // This prevents double refresh since initialize() already loads the data
            if (isInitialMount.current) {
                isInitialMount.current = false;
                return;
            }
            refreshFileTree();
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [refreshFileTree]);

    // File Watcher
    useEffect(() => {
        if (!vaultPath) return;

        let unlistenFn: (() => void) | undefined;
        let isMounted = true;
        let debounceTimer: NodeJS.Timeout | null = null;

        const setupWatcher = async () => {
            try {
                // Start watching the vault
                await invoke('watch_vault', { vaultPath });

                // Debounced refresh handler - batches multiple rapid file-changed events
                const debouncedRefresh = () => {
                    if (debounceTimer) clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        // console.log('[WATCHER] Executing debounced refresh');
                        refreshFileTree();
                    }, 500); // 500ms debounce - captures events that arrive with delays
                };

                // Listen for changes
                const unlisten = await listen('file-changed', (_event) => {
                    // console.log('[WATCHER] file-changed event received', event);
                    debouncedRefresh();
                });

                // console.log('[WATCHER] Setup complete for:', vaultPath);

                if (isMounted) {
                    unlistenFn = unlisten;
                } else {
                    unlisten();
                }
            } catch (error) {
                console.error('Failed to setup file watcher:', error);
            }
        };

        setupWatcher();

        return () => {
            console.log('[WATCHER] Cleaning up watcher for:', vaultPath);
            isMounted = false;
            if (debounceTimer) clearTimeout(debounceTimer);
            if (unlistenFn) unlistenFn();
        };
    }, [vaultPath, refreshFileTree]);

    // Safety net: Reset cursor and user-select on window blur to prevent stuck states
    useEffect(() => {
        const handleBlur = () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, []);

    // PRODUCTION FIX: Transparent windows on macOS with WebKit have a known issue
    // where cursor hover states don't update properly. This is a WebKit + macOS bug.
    // Solution: Force DOM reflow and explicitly set cursor styles on text elements.
    const forceCursorUpdate = () => {
        // Reset global cursor styles
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Force a DOM reflow by reading offsetHeight (forces browser to recalculate layout)
        void document.body.offsetHeight;

        // Explicitly set cursor on all text-editable elements
        // This bypasses WebKit's broken hover detection in transparent windows
        const textElements = document.querySelectorAll('.ProseMirror, [contenteditable="true"], textarea, input[type="text"]');
        textElements.forEach((el) => {
            if (el instanceof HTMLElement) {
                el.style.cursor = 'text';
            }
        });

        // Force cursor update on next animation frame to ensure it takes effect
        requestAnimationFrame(() => {
            // Dispatch a low-level mouse event to nudge WebKit's cursor detection
            const rect = document.body.getBoundingClientRect();
            const event = new MouseEvent('mouseover', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: rect.width / 2,
                clientY: rect.height / 2,
            });
            document.body.dispatchEvent(event);
        });
    };

    // Force focus and cursor reset on startup to fix "stuck" state
    useEffect(() => {
        const initWindow = async () => {
            try {
                const { getCurrentWindow } = await import('@tauri-apps/api/window');
                const win = getCurrentWindow();

                // Focus first
                await win.setFocus();

                // Force cursor update
                setTimeout(() => {
                    forceCursorUpdate();
                }, 100);

                // Show window after a slight delay to ensure webview is ready
                // This prevents the "stuck cursor" issue on startup
                setTimeout(async () => {
                    await win.show();
                    await win.setFocus(); // Focus again to be sure
                }, 150);
            } catch (e) {
                console.error('Failed to focus window:', e);
            }
        };
        initWindow();
    }, []);

    // Listen for vault switch and force cursor update
    useEffect(() => {
        const handleCursorUpdate = () => {
            forceCursorUpdate();
        };

        window.addEventListener('force-cursor-update', handleCursorUpdate);
        return () => window.removeEventListener('force-cursor-update', handleCursorUpdate);
    }, []);
    const fileTreeGeneration = useAppStore(state => state.fileTreeGeneration);

    // Check for deleted files after refresh
    useEffect(() => {
        const checkDeletedTabs = async () => {
            if (!vaultPath) return;

            // Get all open tabs
            const { usePaneStore } = await import('../store/usePaneStore');
            const { checkExists } = await import('../lib/fs');
            const { showToast } = await import('../contexts/ToastContext');

            const paneStore = usePaneStore.getState();
            const allTabs = paneStore.getAllLeafPanes().flatMap(p => p.tabs || []);

            for (const tab of allTabs) {
                // Skip if it's not a file path (e.g. internal pages if any)
                if (!tab.noteId.includes('/')) continue;

                const exists = await checkExists(tab.noteId);
                if (!exists) {
                    // File deleted externally
                    console.log(`[WATCHER] File deleted externally: ${tab.noteId}`);

                    // Close the tab
                    // We need to find which pane it belongs to
                    const pane = paneStore.getAllLeafPanes().find(p => p.tabs?.some(t => t.id === tab.id));
                    if (pane) {
                        paneStore.removeTabFromPane(pane.id, tab.id);
                        showToast(`File deleted: ${tab.noteId.split('/').pop()}`, 'warning');
                    }
                }
            }
        };

        if (fileTreeGeneration > 0) { // Skip initial load
            checkDeletedTabs();
        }

    }, [fileTreeGeneration, vaultPath]);
};
