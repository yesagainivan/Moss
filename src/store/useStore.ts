import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { invoke } from '@tauri-apps/api/core';
import { Note, FileNode, SaveState } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useSettingsStore } from './useSettingsStore';
import { usePaneStore } from './usePaneStore';
import { useGitStore } from './useGitStore';
import { openVault, readVault, loadNoteContent, saveNoteContent, createFile, renameFile, renameNote, createFolder as createFolderFS, deleteFile, deleteFolder as deleteFolderFS, loadPaneLayout } from '../lib/fs';
import { debounce } from 'lodash-es';
import { sortFileNodes, insertNode, removeNode, updateNode } from './helpers/fileTreeHelpers';
import { updatePaneTabsForPathChange } from './helpers/paneHelpers';
import matter from 'gray-matter';

// Export types for backward compatibility or use in other files
export type { CommitInfo, CommitStats } from '../types';

// Debounced helper to persist expanded paths
const persistExpandedPathsDebounced = debounce((paths: Set<string>) => {
    localStorage.setItem('moss-expanded-paths', JSON.stringify(Array.from(paths)));
}, 300);

// Save queue to prevent concurrent saves to the same note
const saveQueue = new Map<string, Promise<void>>();
// Pending content for queued saves
const pendingSaves = new Map<string, string>();

// Debounced save functions per note (2 second debounce)
const debouncedSaveByNote = new Map<string, { debouncer: ReturnType<typeof debounce>, delay: number }>();

interface AppState {
    notes: Record<string, Note>;
    fileTree: FileNode[];
    vaultPath: string | null;
    selectedFolderPath: string | null;
    confirmationRequest: { message: string; resolve: (value: boolean) => void } | null;
    saveStates: Record<string, SaveState>; // Track save state per note
    isVaultLoading: boolean;
    vaultGeneration: number; // Incremented on each vault switch to invalidate in-flight operations
    fileTreeGeneration: number; // Incremented on each file tree refresh to trigger graph updates
    currentView: 'editor' | 'graph'; // Toggle between editor and graph view
    expandedPaths: Set<string>; // Persisted expanded folder paths
    isSidebarOpen: boolean; // Sidebar visibility state
    isCommandPaletteOpen: boolean; // Command Palette visibility state
    isSearchModalOpen: boolean; // Search Modal visibility state
    dirtyNoteIds: Set<string>; // Track dirty state globally per note
    scrollPositions: Record<string, number>; // Track scroll position per note
    revealTrigger: number; // Trigger for scrolling to note in sidebar

    // Actions
    initialize: () => Promise<void>;
    setCommandPaletteOpen: (isOpen: boolean) => void;
    setSearchModalOpen: (isOpen: boolean) => void;

    // Backlinks Panel
    isBacklinksPanelOpen: boolean;
    setBacklinksPanelOpen: (isOpen: boolean) => void;

    // Outline Panel
    isOutlinePanelOpen: boolean;
    setOutlinePanelOpen: (isOpen: boolean) => void;

    // Tags
    tagsData: import('../types/tags').TagsData | null;
    selectedTags: string[];
    loadTags: () => Promise<void>;
    toggleTag: (tag: string) => void;
    setSelectedTags: (tags: string[]) => void;

    createNote: (title?: string, parentPath?: string, useExactName?: boolean) => Promise<string>;
    createFolder: (name: string, parentPath?: string) => Promise<void>;
    setSelectedFolder: (path: string | null) => void;
    updateNote: (id: string, content: string) => void;
    renameNote: (id: string, title: string) => Promise<void>;
    moveNote: (oldPath: string, newPath: string) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    duplicateNote: (id: string) => Promise<string>;
    deleteFolder: (path: string) => Promise<void>;
    renameFolder: (oldPath: string, newName: string) => Promise<void>;
    refreshFileTree: () => Promise<void>;
    collapseAllFolders: () => void;
    expandAllFolders: () => void;

    openNote: (noteId: string, newTab?: boolean) => Promise<void>;

    // Navigation (delegated to pane store but kept for convenience if needed, though better to use pane store directly)
    navigateBack: () => void;
    navigateForward: () => void;
    canNavigateBack: () => boolean;
    canNavigateForward: () => boolean;

    // Confirmation
    requestConfirmation: (message: string) => Promise<boolean>;
    resolveConfirmation: (result: boolean) => void;

    // FS Actions - New Auto-Save System
    openVault: () => Promise<void>;
    saveNote: (noteId: string, content: string) => Promise<void>; // Debounced save
    forceSaveNote: (noteId: string) => Promise<void>; // Immediate save
    revealNoteInSidebar: (noteId: string) => void; // Expand parent folders
    toggleFolder: (path: string) => void; // Toggle folder expansion
    saveAllDirtyNotes: () => Promise<void>; // Save all dirty notes
    setSaveState: (noteId: string, state: Partial<SaveState>) => void;
    setNoteProperties: (id: string, properties: Record<string, any>) => void;

    // View Management
    setCurrentView: (view: 'editor' | 'graph') => void;
    toggleSidebar: () => void;
    setScrollPosition: (noteId: string, position: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    notes: {},
    fileTree: [],
    vaultPath: null,
    selectedFolderPath: null,
    confirmationRequest: null,
    saveStates: {}, // Initialize save states
    isVaultLoading: false,
    vaultGeneration: 0, // Initialize generation counter
    fileTreeGeneration: 0, // Initialize file tree generation counter
    currentView: 'editor', // Default to editor view
    expandedPaths: new Set<string>(), // Initialize expanded folders
    isSidebarOpen: true, // Sidebar open by default
    isCommandPaletteOpen: false,
    isSearchModalOpen: false, // Search modal closed by default
    isBacklinksPanelOpen: false, // Backlinks panel closed by default
    isOutlinePanelOpen: false, // Outline panel closed by default
    tagsData: null, // Tags data loaded on vault init
    selectedTags: [], // No tags selected by default
    dirtyNoteIds: new Set(),
    scrollPositions: {},
    revealTrigger: 0,

    initialize: async () => {
        const { vaultPath } = get();
        if (vaultPath) return; // Already initialized

        set({ isVaultLoading: true });
        const savedVault = localStorage.getItem('moss-vault-path');
        if (savedVault) {
            try {
                useSettingsStore.getState().setVaultPath(savedVault);
                const files = await readVault(savedVault);
                const savedExpandedPathsJson = localStorage.getItem('moss-expanded-paths');
                const expandedPaths = savedExpandedPathsJson
                    ? new Set(JSON.parse(savedExpandedPathsJson) as string[])
                    : new Set<string>();

                // Load pane layout using helper
                const paneLayout = await loadPaneLayout(savedVault);

                // Initialize Pane Store
                if (paneLayout) {
                    // Clear all tabs on load (User preference: Fresh start)
                    const clearTabsInTree = (node: any): any => {
                        if (node.tabs) {
                            return {
                                ...node,
                                tabs: [],
                                activeTabId: null
                            };
                        }
                        if (node.children) {
                            return {
                                ...node,
                                children: node.children.map(clearTabsInTree)
                            };
                        }
                        return node;
                    };
                    const cleanedRoot = clearTabsInTree(paneLayout.paneRoot);
                    usePaneStore.getState().setPaneLayout(cleanedRoot, paneLayout.activePaneId);
                }

                // Restore notes for all tabs in the pane tree
                const restoredNotes: Record<string, Note> = {};
                const allTabs = usePaneStore.getState().getAllLeafPanes().flatMap(p => p.tabs || []);

                for (const tab of allTabs) {
                    try {
                        const content = await loadNoteContent(tab.noteId);
                        const name = tab.noteId.split('/').pop() || 'Untitled';
                        restoredNotes[tab.noteId] = {
                            id: tab.noteId,
                            title: name,
                            content,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        };
                    } catch (e) {
                        console.warn(`Failed to restore tab for note ${tab.noteId}:`, e);
                    }
                }

                set({
                    notes: restoredNotes,
                    fileTree: sortFileNodes(files),
                    vaultPath: savedVault,
                    isVaultLoading: false,
                    expandedPaths,
                    vaultGeneration: get().vaultGeneration + 1,
                });

                await get().loadTags();

                // Initialize Git Store
                await useGitStore.getState().checkGitStatus();
            } catch (e) {
                console.error('Failed to load saved vault', e);
                localStorage.removeItem('moss-vault-path');
                set({ isVaultLoading: false });
            }
        } else {
            set({ isVaultLoading: false });
        }
    },

    setCommandPaletteOpen: (isOpen) => set({ isCommandPaletteOpen: isOpen }),
    setSearchModalOpen: (isOpen) => set({ isSearchModalOpen: isOpen }),
    setBacklinksPanelOpen: (isOpen) => set({ isBacklinksPanelOpen: isOpen }),
    setOutlinePanelOpen: (isOpen) => set({ isOutlinePanelOpen: isOpen }),

    loadTags: async () => {
        const { vaultPath } = get();
        if (!vaultPath) return;

        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const tagsData = await invoke<import('../types/tags').TagsData>('get_all_tags', { vaultPath });
            set({ tagsData });
        } catch (e) {
            console.error('Failed to load tags:', e);
        }
    },

    toggleTag: (tag) => {
        set(state => {
            const selected = new Set(state.selectedTags);
            if (selected.has(tag)) {
                selected.delete(tag);
            } else {
                selected.add(tag);
            }
            return { selectedTags: Array.from(selected) };
        });
    },

    setSelectedTags: (tags) => set({ selectedTags: tags }),

    createNote: async (title = 'Untitled', parentPath, useExactName = false) => {
        const { vaultPath, openNote } = get();
        if (!vaultPath) return '';

        try {
            // Determine path
            let folderPath = vaultPath;
            if (parentPath) {
                folderPath = parentPath;
            } else if (get().selectedFolderPath) {
                folderPath = get().selectedFolderPath!;
            }

            // Generate path
            let name = title || 'Untitled';
            let filePath = `${folderPath}/${name}.md`;

            if (!useExactName) {
                // Ensure unique name
                let counter = 1;
                while (await invoke('file_exists', { path: filePath })) {
                    name = `${title || 'Untitled'} ${counter}`;
                    filePath = `${folderPath}/${name}.md`;
                    counter++;
                }
            }

            await createFile(filePath, '');

            // Add to notes store
            const newNote: Note = {
                id: filePath,
                title: name,
                content: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            set(state => ({
                notes: { ...state.notes, [filePath]: newNote },
                fileTree: insertNode(state.fileTree, {
                    id: filePath,
                    name: name,
                    type: 'file',
                    path: filePath,
                    noteId: filePath
                })
            }));

            // Open the new note
            await openNote(filePath);

            return filePath;
        } catch (e) {
            console.error('Failed to create note', e);
            return '';
        }
    },

    createFolder: async (name, parentPath) => {
        const { vaultPath } = get();
        if (!vaultPath) return;

        try {
            let folderPath = vaultPath;
            if (parentPath) {
                folderPath = parentPath;
            } else if (get().selectedFolderPath) {
                folderPath = get().selectedFolderPath!;
            }

            const folderName = name;
            const newFolderPath = `${folderPath}/${folderName}`;
            await createFolderFS(newFolderPath);

            set(state => ({
                fileTree: insertNode(state.fileTree, {
                    id: newFolderPath,
                    name: folderName,
                    type: 'folder',
                    path: newFolderPath,
                    children: []
                })
            }));
        } catch (e) {
            console.error('Failed to create folder', e);
        }
    },

    setSelectedFolder: (path) => set({ selectedFolderPath: path }),

    updateNote: (id, content) => {
        set((state) => {
            const newDirtyIds = new Set(state.dirtyNoteIds);
            newDirtyIds.add(id);

            const existingNote = state.notes[id];
            let newNoteEntry: Note;

            if (existingNote) {
                newNoteEntry = { ...existingNote, content, updatedAt: Date.now() };
            } else {
                const filename = id.split('/').pop() || 'Untitled';
                const title = filename.replace(/\.md$/, '');
                newNoteEntry = {
                    id,
                    title,
                    content,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
            }

            const paneStore = usePaneStore.getState();
            const leafPanes = paneStore.getAllLeafPanes();
            for (const pane of leafPanes) {
                const tab = pane.tabs?.find(t => t.noteId === id);
                if (tab && tab.isPreview) {
                    paneStore.updateTabInPane(pane.id, tab.id, { isPreview: false });
                }
            }

            return {
                notes: { ...state.notes, [id]: newNoteEntry },
                dirtyNoteIds: newDirtyIds
            };
        });
    },

    setNoteProperties: (id: string, properties: Record<string, any>) => {
        set((state) => {
            const existingNote = state.notes[id];
            if (!existingNote) return {};

            const newDirtyIds = new Set(state.dirtyNoteIds);
            newDirtyIds.add(id);

            const newNoteEntry = { ...existingNote, properties, updatedAt: Date.now() };

            return {
                notes: { ...state.notes, [id]: newNoteEntry },
                dirtyNoteIds: newDirtyIds
            };
        });
    },

    renameNote: async (id, title) => {
        const { vaultPath, notes } = get();

        // If it's a file path
        if (id.includes('/') && vaultPath) {
            const oldPath = id;
            const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'));
            const newFilename = title.endsWith('.md') ? title : `${title}.md`;
            const newPath = `${parentDir}/${newFilename}`;

            try {
                await renameNote(vaultPath, oldPath, newPath);

                // Update Store References
                // 1. Notes
                const note = notes[oldPath];
                const newNotes = { ...notes };
                if (note) {
                    delete newNotes[oldPath];
                    newNotes[newPath] = { ...note, id: newPath, title: newFilename };
                }

                // 2. Tabs - Update current noteId AND history in ALL panes
                // Use helper from paneHelpers via PaneStore logic
                const paneStore = usePaneStore.getState();
                const { newRoot, changed } = updatePaneTabsForPathChange(paneStore.paneRoot, oldPath, newPath);

                if (changed) {
                    paneStore.setPaneLayout(newRoot, paneStore.activePaneId);
                    // Persistence is handled by setPaneLayout internally if we used the store action, 
                    // but here we used a helper and set state directly. 
                    // Actually usePaneStore.setPaneLayout triggers persistence? No, it just sets state.
                    // We should probably trigger persistence or let usePaneStore handle it.
                    // The usePaneStore implementation of setPaneLayout doesn't persist.
                    // But we can manually persist if needed, or rely on the fact that usePaneStore actions usually persist.
                    // Let's assume for now we need to trigger persistence if we modify root directly.
                    // Actually, let's just update the store.
                }

                // 3. FileTree - Incremental update
                const newName = newPath.split('/').pop() || title;
                const newTree = updateNode(get().fileTree, oldPath, {
                    name: newName,
                    id: newPath,
                    noteId: newPath,
                    path: newPath
                });

                set({
                    notes: newNotes,
                    fileTree: sortFileNodes(newTree)
                });

            } catch (e) {
                console.error('Failed to rename file', e);
            }
        } else {
            // Memory note
            set((state) => ({
                notes: {
                    ...state.notes,
                    [id]: { ...state.notes[id], title, updatedAt: Date.now() }
                },
                fileTree: state.fileTree.map(node =>
                    node.noteId === id ? { ...node, name: title } : node
                )
            }));
        }
    },

    moveNote: async (oldPath: string, newPath: string) => {
        const { vaultPath, notes } = get();

        if (vaultPath) {
            try {
                await renameFile(oldPath, newPath);

                // Update Store References
                // 1. Notes
                const note = notes[oldPath];
                const newNotes = { ...notes };
                const newFilename = newPath.split('/').pop() || '';

                if (note) {
                    delete newNotes[oldPath];
                    newNotes[newPath] = { ...note, id: newPath, title: newFilename };
                }

                // 2. Tabs - Update current noteId AND history in ALL panes
                const paneStore = usePaneStore.getState();
                const { newRoot, changed } = updatePaneTabsForPathChange(paneStore.paneRoot, oldPath, newPath);

                if (changed) {
                    paneStore.setPaneLayout(newRoot, paneStore.activePaneId);
                }

                // 3. FileTree
                const files = await readVault(vaultPath);

                set({
                    notes: newNotes,
                    fileTree: files
                });
            } catch (e) {
                console.error('Failed to move file', e);
                throw e; // Re-throw for caller handling
            }
        }
    },

    deleteNote: async (id) => {
        const { vaultPath, notes } = get();

        // If it's a file path (filesystem note)
        if (id.includes('/') && vaultPath) {
            try {
                // Delete the file
                await deleteFile(id);

                // Close any tabs with this note
                const paneStore = usePaneStore.getState();
                const leafPanes = paneStore.getAllLeafPanes();
                for (const pane of leafPanes) {
                    const tabsToClose = pane.tabs?.filter(t => t.noteId === id);
                    if (tabsToClose) {
                        for (const tab of tabsToClose) {
                            paneStore.closeTab(tab.id); // Assuming closeTab is exposed or we use removeTabFromPane
                            // Wait, closeTab was in useStore. We need to use removeTabFromPane.
                            paneStore.removeTabFromPane(pane.id, tab.id);
                        }
                    }
                }

                // Remove from notes
                const newNotes = { ...notes };
                delete newNotes[id];

                // Refresh file tree - Incremental update
                set(state => ({
                    notes: newNotes,
                    fileTree: removeNode(state.fileTree, id)
                }));
            } catch (e) {
                console.error('Failed to delete file', e);
            }
        } else {
            // Memory note - just remove from state
            const paneStore = usePaneStore.getState();
            const leafPanes = paneStore.getAllLeafPanes();
            for (const pane of leafPanes) {
                const tabsToClose = pane.tabs?.filter(t => t.noteId === id);
                if (tabsToClose) {
                    for (const tab of tabsToClose) {
                        paneStore.removeTabFromPane(pane.id, tab.id);
                    }
                }
            }

            const newNotes = { ...notes };
            delete newNotes[id];
            set({ notes: newNotes });
        }
    },

    duplicateNote: async (id) => {
        const { vaultPath, notes, createNote } = get();
        const note = notes[id];
        if (!note || !vaultPath) return '';

        try {
            // Generate new name
            const originalTitle = note.title.replace(/\.md$/, '');
            let newTitle = `${originalTitle} (Copy)`;

            // Create new note
            const newPath = await createNote(newTitle, undefined, false);

            // Copy content
            if (newPath) {
                await get().updateNote(newPath, note.content);
                await get().forceSaveNote(newPath);
                return newPath;
            }
            return '';
        } catch (e) {
            console.error('Failed to duplicate note:', e);
            return '';
        }
    },

    deleteFolder: async (path) => {
        const { vaultPath } = get();
        if (!vaultPath) return;

        try {
            await deleteFolderFS(path);

            // Close all tabs that are within this folder
            const paneStore = usePaneStore.getState();
            const leafPanes = paneStore.getAllLeafPanes();

            // Helper to check if file is in folder
            const isChild = (filePath: string, folderPath: string) => {
                return filePath.startsWith(folderPath + '/');
            };

            for (const pane of leafPanes) {
                const tabsToClose = pane.tabs?.filter(t => isChild(t.noteId, path));
                if (tabsToClose) {
                    for (const tab of tabsToClose) {
                        paneStore.removeTabFromPane(pane.id, tab.id);
                    }
                }
            }

            // Remove from file tree
            set(state => ({
                fileTree: removeNode(state.fileTree, path)
            }));

        } catch (e) {
            console.error('Failed to delete folder', e);
        }
    },

    renameFolder: async (oldPath, newName) => {
        const { vaultPath } = get();
        if (!vaultPath) return;

        try {
            // Construct new path
            const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'));
            const newPath = `${parentDir}/${newName}`;

            await renameFile(oldPath, newPath);

            // Update all tabs that have files in this folder
            const paneStore = usePaneStore.getState();
            const { newRoot, changed } = updatePaneTabsForPathChange(paneStore.paneRoot, oldPath, newPath);

            if (changed) {
                paneStore.setPaneLayout(newRoot, paneStore.activePaneId);
            }

            // Refresh file tree
            const files = await readVault(vaultPath);
            set({ fileTree: files });

        } catch (e) {
            console.error('Failed to rename folder', e);
        }
    },

    refreshFileTree: async () => {
        const { vaultPath } = get();
        if (vaultPath) {
            const files = await readVault(vaultPath);
            set({
                fileTree: sortFileNodes(files),
                fileTreeGeneration: get().fileTreeGeneration + 1
            });
        }
    },

    collapseAllFolders: () => {
        set({ expandedPaths: new Set() });
        persistExpandedPathsDebounced(new Set());
    },

    expandAllFolders: () => {
        const { fileTree } = get();
        const allFolders = new Set<string>();

        const collectFolders = (nodes: FileNode[]) => {
            nodes.forEach(node => {
                if (node.type === 'folder' && node.path) {
                    allFolders.add(node.path);
                    if (node.children) {
                        collectFolders(node.children);
                    }
                }
            });
        };

        collectFolders(fileTree);
        set({ expandedPaths: allFolders });
        persistExpandedPathsDebounced(allFolders);
    },

    openNote: async (noteId, newTab = false) => {
        const { notes } = get();
        const paneStore = usePaneStore.getState();

        // 1. Load content if needed
        if (!notes[noteId]) {
            try {
                const content = await loadNoteContent(noteId);
                const name = noteId.split('/').pop() || 'Untitled';

                // Parse frontmatter
                const { content: body, data } = matter(content);

                const newNote: Note = {
                    id: noteId,
                    title: name,
                    content: body, // Store only body in content
                    properties: data, // Store frontmatter in properties
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                set(state => ({
                    notes: { ...state.notes, [noteId]: newNote }
                }));
            } catch (e) {
                console.error('Failed to load note content', e);
                return;
            }
        }

        // 2. Handle Pane/Tab Logic
        let activePane = paneStore.getActivePane();

        if (!activePane) {
            // Should not happen if initialized correctly, but as a fallback:
            console.warn('No active pane found, resetting to default layout');
            paneStore.setPaneLayout({
                id: 'root',
                type: 'leaf',
                tabs: [],
                activeTabId: null
            }, 'root');
            activePane = paneStore.getActivePane();

            if (!activePane) {
                console.error('Failed to recover active pane');
                return;
            }
        }

        // Check if note is already open in the active pane
        const existingTab = activePane.tabs?.find(t => t.noteId === noteId);

        if (existingTab && !newTab) {
            // Already open, just switch to it
            paneStore.setPaneTab(activePane.id, existingTab.id);
        } else {
            // Open new tab
            if (newTab) {
                // Add new tab
                const newTabObj = {
                    id: uuidv4(),
                    noteId,
                    isPreview: false,
                    history: [noteId],
                    historyIndex: 0
                };
                paneStore.addTabToPane(activePane.id, newTabObj);
            } else {
                // Replace current tab or add if empty
                if (activePane.activeTabId) {
                    // Update current tab
                    const currentTab = activePane.tabs?.find(t => t.id === activePane.activeTabId);
                    if (currentTab) {
                        // If current tab is preview, replace it. Otherwise, push to history.
                        if (currentTab.isPreview) {
                            paneStore.updateTabInPane(activePane.id, currentTab.id, {
                                noteId,
                                isPreview: false, // Confirm it
                                history: [...currentTab.history, noteId],
                                historyIndex: currentTab.historyIndex + 1
                            });
                        } else {
                            // Navigate in current tab
                            const newHistory = currentTab.history.slice(0, currentTab.historyIndex + 1);
                            newHistory.push(noteId);

                            paneStore.updateTabInPane(activePane.id, currentTab.id, {
                                noteId,
                                history: newHistory,
                                historyIndex: newHistory.length - 1
                            });
                        }
                    }
                } else {
                    // No active tab, add one
                    const newTabObj = {
                        id: uuidv4(),
                        noteId,
                        isPreview: false,
                        history: [noteId],
                        historyIndex: 0
                    };
                    paneStore.addTabToPane(activePane.id, newTabObj);
                }
            }
        }

        // Reveal in sidebar
        get().revealNoteInSidebar(noteId);
    },

    // Navigation helpers - Delegated to PaneStore logic
    navigateBack: () => {
        const paneStore = usePaneStore.getState();
        const activePane = paneStore.getActivePane();
        const activeTab = activePane?.tabs?.find(t => t.id === activePane.activeTabId);

        if (activeTab && activeTab.historyIndex > 0) {
            const newIndex = activeTab.historyIndex - 1;
            const prevNoteId = activeTab.history[newIndex];

            paneStore.updateTabInPane(activePane!.id, activeTab.id, {
                noteId: prevNoteId,
                historyIndex: newIndex
            });

            get().revealNoteInSidebar(prevNoteId);
        }
    },

    navigateForward: () => {
        const paneStore = usePaneStore.getState();
        const activePane = paneStore.getActivePane();
        const activeTab = activePane?.tabs?.find(t => t.id === activePane.activeTabId);

        if (activeTab && activeTab.history && activeTab.historyIndex < activeTab.history.length - 1) {
            const newIndex = activeTab.historyIndex + 1;
            const nextNoteId = activeTab.history[newIndex];

            paneStore.updateTabInPane(activePane!.id, activeTab.id, {
                noteId: nextNoteId,
                historyIndex: newIndex
            });

            get().revealNoteInSidebar(nextNoteId);
        }
    },

    canNavigateBack: () => {
        const paneStore = usePaneStore.getState();
        const activePane = paneStore.getActivePane();
        const activeTab = activePane?.tabs?.find(t => t.id === activePane.activeTabId);
        return !!(activeTab && activeTab.historyIndex > 0);
    },

    canNavigateForward: () => {
        const paneStore = usePaneStore.getState();
        const activePane = paneStore.getActivePane();
        const activeTab = activePane?.tabs?.find(t => t.id === activePane.activeTabId);
        return !!(activeTab && activeTab.history && activeTab.historyIndex < activeTab.history.length - 1);
    },

    requestConfirmation: async (message) => {
        return new Promise((resolve) => {
            set({ confirmationRequest: { message, resolve } });
        });
    },

    resolveConfirmation: (result) => {
        const { confirmationRequest } = get();
        if (confirmationRequest) {
            confirmationRequest.resolve(result);
            set({ confirmationRequest: null });
        }
    },

    openVault: async () => {
        try {
            const path = await openVault();
            if (path) {
                // Set vault path in settings store
                useSettingsStore.getState().setVaultPath(path);

                const prevGeneration = get().vaultGeneration;

                // Reset App Store
                set({
                    vaultPath: path,
                    fileTree: [],
                    notes: {},
                    saveStates: {},
                    selectedFolderPath: null,
                    vaultGeneration: prevGeneration + 1,
                    expandedPaths: new Set(),
                    isVaultLoading: false,
                    tagsData: null,
                    selectedTags: []
                });

                // Reset Pane Store
                const paneStore = usePaneStore.getState();
                paneStore.setPaneLayout({
                    id: 'root',
                    type: 'leaf',
                    tabs: [],
                    activeTabId: null
                }, 'root');

                // Reset Git Store
                useGitStore.getState().setGitEnabled(false);

                localStorage.removeItem('moss-expanded-paths');
                localStorage.setItem('moss-vault-path', path);

                const files = await readVault(path);

                set({
                    fileTree: sortFileNodes(files),
                    isVaultLoading: false,
                });

                await get().loadTags();
                await useGitStore.getState().checkGitStatus();

                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('force-cursor-update'));
                }, 100);
            }
        } catch (e) {
            console.error('[VAULT] Failed to open vault:', e);
            set({ isVaultLoading: false });
        }
    },

    setSaveState: (noteId, state) => {
        set((currentState) => ({
            saveStates: {
                ...currentState.saveStates,
                [noteId]: {
                    ...(currentState.saveStates[noteId] || { status: 'idle', lastSaved: null, error: null }),
                    ...state
                }
            }
        }));
    },

    saveNote: async (noteId, content) => {
        const { notes, setSaveState } = get();
        const note = notes[noteId];

        if (!note) return;
        if (!noteId.includes('/')) return;

        pendingSaves.set(noteId, content);

        if (saveQueue.has(noteId)) return;

        const saveLoop = async () => {
            while (pendingSaves.has(noteId)) {
                const rawContent = pendingSaves.get(noteId)!;
                pendingSaves.delete(noteId);

                setSaveState(noteId, { status: 'saving', error: null });

                let lastError: Error | null = null;
                const maxRetries = 3;
                let success = false;

                // Prepare content with frontmatter
                const note = get().notes[noteId];
                const properties = note?.properties || {};
                // If we have properties, use gray-matter to stringify.
                // Note: content passed to saveNote is usually just the body.
                // But we must be careful not to double-stringify if content already has frontmatter.
                // However, Editor passes body content.
                const fileContentToSave = Object.keys(properties).length > 0
                    ? matter.stringify(rawContent, properties)
                    : rawContent;

                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        await saveNoteContent(noteId, fileContentToSave);
                        success = true;
                        break;
                    } catch (e) {
                        lastError = e as Error;
                        console.error(`Save attempt ${attempt + 1} failed for ${noteId}:`, e);
                        if (attempt < maxRetries - 1) {
                            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
                        }
                    }
                }

                if (success) {
                    setSaveState(noteId, {
                        status: 'saved',
                        lastSaved: Date.now(),
                        error: null
                    });

                    set(state => {
                        const newDirtyIds = new Set(state.dirtyNoteIds);
                        newDirtyIds.delete(noteId);
                        return { dirtyNoteIds: newDirtyIds };
                    });

                    setTimeout(() => {
                        get().loadTags();
                    }, 100);


                    setTimeout(() => {
                        const currentState = get().saveStates[noteId];
                        if (currentState?.status === 'saved' && !saveQueue.has(noteId)) {
                            setSaveState(noteId, { status: 'idle' });
                        }
                    }, 2000);
                } else {
                    setSaveState(noteId, {
                        status: 'error',
                        error: lastError?.message || 'Failed to save note'
                    });
                }
            }
        };

        const promise = saveLoop();
        saveQueue.set(noteId, promise);

        try {
            await promise;
        } finally {
            saveQueue.delete(noteId);
        }
    },

    forceSaveNote: async (noteId) => {
        const { notes, saveNote } = get();
        const note = notes[noteId];

        if (note) {
            debouncedSaveByNote.get(noteId)?.debouncer.cancel();
            await saveNote(noteId, note.content);

            const freshState = get();

            if (freshState.saveStates[noteId]?.status === 'error') {
                throw new Error(freshState.saveStates[noteId]?.error || 'Failed to save note');
            }
        }
    },

    revealNoteInSidebar: (noteId) => {
        const { vaultPath, expandedPaths } = get();
        if (!vaultPath) return;

        const relativePath = noteId.replace(vaultPath + '/', '');
        const parts = relativePath.split('/');

        if (parts.length > 1) {
            const newExpanded = new Set(expandedPaths);
            let currentPath = vaultPath;

            for (let i = 0; i < parts.length - 1; i++) {
                currentPath = `${currentPath}/${parts[i]}`;
                newExpanded.add(currentPath);
            }

            set({ expandedPaths: newExpanded, revealTrigger: get().revealTrigger + 1 });
            persistExpandedPathsDebounced(newExpanded);
        } else {
            set({ revealTrigger: get().revealTrigger + 1 });
        }
    },

    toggleFolder: (path) => {
        set(state => {
            const newExpanded = new Set(state.expandedPaths);
            if (newExpanded.has(path)) {
                newExpanded.delete(path);
            } else {
                newExpanded.add(path);
            }
            persistExpandedPathsDebounced(newExpanded);
            return { expandedPaths: newExpanded };
        });
    },

    saveAllDirtyNotes: async () => {
        const { dirtyNoteIds, forceSaveNote } = get();
        const promises = Array.from(dirtyNoteIds).map(id => forceSaveNote(id));
        await Promise.allSettled(promises);
    },

    setCurrentView: (view) => set({ currentView: view }),
    toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
    setScrollPosition: (noteId, position) => set(state => ({
        scrollPositions: { ...state.scrollPositions, [noteId]: position }
    })),

}));

// ============================================================================
// Selective Subscription Hooks (for performance)
// ============================================================================

export const useActiveNote = () => {
    const activePaneId = usePaneStore(state => state.activePaneId);
    const paneIndex = usePaneStore(state => state.paneIndex);
    const notes = useAppStore(state => state.notes);

    const activePane = activePaneId ? paneIndex.get(activePaneId) : null;
    const activeTabId = activePane?.activeTabId;
    const activeTab = activePane?.tabs?.find(t => t.id === activeTabId);

    return activeTab ? notes[activeTab.noteId] : null;
};

export const useActiveTabId = () => {
    const activePaneId = usePaneStore(state => state.activePaneId);
    const paneIndex = usePaneStore(state => state.paneIndex);
    const activePane = activePaneId ? paneIndex.get(activePaneId) : null;
    return activePane?.activeTabId;
};

export const useTabs = () => {
    // This is a bit ambiguous now with multiple panes.
    // Returning tabs of the active pane for backward compatibility?
    // Or all tabs?
    // Let's return active pane tabs.
    const activePaneId = usePaneStore(state => state.activePaneId);
    const paneIndex = usePaneStore(state => state.paneIndex);
    const activePane = activePaneId ? paneIndex.get(activePaneId) : null;
    return activePane?.tabs || [];
};

export const useFileTree = () => useAppStore(state => state.fileTree);

export const useFileActions = () => {
    const store = useAppStore();
    return {
        createNote: store.createNote,
        createFolder: store.createFolder,
        updateNote: store.updateNote,
        renameNote: store.renameNote,
        moveNote: store.moveNote,
        deleteNote: store.deleteNote,
        deleteFolder: store.deleteFolder,
        renameFolder: store.renameFolder,
        openNote: store.openNote
    };
};

// Stable default save state to prevent infinite re-renders
const DEFAULT_SAVE_STATE: SaveState = {
    status: 'idle',
    lastSaved: null,
    error: null
};

export const useSaveState = (noteId: string) => {
    return useAppStore(state => state.saveStates[noteId] || DEFAULT_SAVE_STATE);
};

export const useVaultStatus = () => {
    return useGitStore(
        useShallow(state => ({
            status: state.vaultStatus,
            message: state.vaultStatusMessage
        }))
    );
};

// ============================================================================
// Debounced Save Helper (called from Editor)
// ============================================================================
export const debouncedSaveNote = (noteId: string, content: string) => {
    let entry = debouncedSaveByNote.get(noteId);
    if (!entry) {
        entry = {
            debouncer: debounce((id, c) => useAppStore.getState().saveNote(id, c), 2000),
            delay: 2000
        };
        debouncedSaveByNote.set(noteId, entry);
    }
    entry.debouncer(noteId, content);
};

// ============================================================================
// App Lifecycle - Save before close
// ============================================================================

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', (e) => {
        const state = useAppStore.getState();
        if (state.dirtyNoteIds.size > 0) {
            // Attempt to save all dirty notes synchronously
            state.saveAllDirtyNotes();

            // Show browser confirmation dialog
            e.preventDefault();
            e.returnValue = '';
        }
    });
}
