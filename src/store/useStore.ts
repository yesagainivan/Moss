import { create } from 'zustand';
import { Note, Tab, FileNode, SaveState, PaneNode } from '../types'
    ;
import { useSettingsStore } from './useSettingsStore';
import { v4 as uuidv4 } from 'uuid';
import { openVault, readVault, loadNoteContent, saveNoteContent, createFile, renameFile, renameNote, createFolder as createFolderFS, deleteFile, deleteFolder as deleteFolderFS, savePaneLayout, loadPaneLayout } from '../lib/fs';
import { debounce } from 'lodash-es';
import { logger } from '../lib/logger';

// Debounced helper to persist expanded paths
const persistExpandedPathsDebounced = debounce((paths: Set<string>) => {
    localStorage.setItem('moss-expanded-paths', JSON.stringify(Array.from(paths)));
}, 300);

// Debounced helper to persist pane layout to vault's .moss directory
// This replaces both persistTabsDebounced and persistPaneRootDebounced
const persistPaneLayoutDebounced = debounce(async (vaultPath: string, layout: { paneRoot: PaneNode; activePaneId: string | null }) => {
    if (!vaultPath) return;
    await savePaneLayout(vaultPath, layout);
}, 300);


// Save queue to prevent concurrent saves to the same note
const saveQueue = new Map<string, Promise<void>>();
// Pending content for queued saves
const pendingSaves = new Map<string, string>();

// Debounced save functions per note (2 second debounce)
// Debounced save functions per note (2 second debounce)
const debouncedSaveByNote = new Map<string, { debouncer: ReturnType<typeof debounce>, delay: number }>();

// ============================================================================
// Pane Index Helper (Phase 3)
// ============================================================================

/**
 * Rebuilds the pane index from the tree for O(1) lookups.
 * Call this whenever the pane tree structure changes.
 */
const updatePaneIndex = (root: PaneNode): Map<string, PaneNode> => {
    const index = new Map<string, PaneNode>();

    const traverse = (node: PaneNode) => {
        index.set(node.id, node);

        if (node.type === 'split' && node.children) {
            traverse(node.children[0]);
            traverse(node.children[1]);
        }
    };

    traverse(root);
    return index;
};

// ============================================================================
// File Tree Helpers (Incremental Updates)
// ============================================================================

const sortFileNodes = (nodes: FileNode[]): FileNode[] => {
    return [...nodes].sort((a, b) => {
        const partsA = (a.path || '').split('/').filter(p => p);
        const partsB = (b.path || '').split('/').filter(p => p);
        const len = Math.min(partsA.length, partsB.length);

        for (let i = 0; i < len; i++) {
            if (partsA[i] !== partsB[i]) {
                // Segments differ.
                // Determine if this segment represents a folder or file.
                // If it's not the last segment, it's a folder.
                // If it IS the last segment, we look at the node type.

                const isFolderA = i < partsA.length - 1 || a.type === 'folder';
                const isFolderB = i < partsB.length - 1 || b.type === 'folder';

                if (isFolderA !== isFolderB) {
                    return isFolderA ? -1 : 1; // Folders first
                }
                return partsA[i].localeCompare(partsB[i]);
            }
        }

        // If we get here, one path is a prefix of the other.
        // Shorter path (parent) comes first.
        return partsA.length - partsB.length;
    });
};

const insertNode = (nodes: FileNode[], newNode: FileNode, _parentPath?: string): FileNode[] => {
    // Flat list insertion: just add and sort
    // We ignore parentPath because the path is already in newNode.path
    return sortFileNodes([...nodes, newNode]);
};

const removeNode = (nodes: FileNode[], path: string): FileNode[] => {
    return nodes.filter(node => node.path !== path && !node.path?.startsWith(path + '/'));
};

const updateNode = (nodes: FileNode[], path: string, updates: Partial<FileNode>): FileNode[] => {
    return nodes.map(node => {
        if (node.path === path) {
            return { ...node, ...updates };
        }
        return node;
    });
};


interface AppState {
    notes: Record<string, Note>;
    // ❌ REMOVED: tabs: Tab[] and activeTabId (now stored per-pane)
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
    dirtyNoteIds: Set<string>; // Track dirty state globally per note
    gitEnabled: boolean; // Whether the vault has Git initialized
    hasUncommittedChanges: boolean; // Whether there are uncommitted changes
    scrollPositions: Record<string, number>; // Track scroll position per note
    revealTrigger: number; // Trigger for scrolling to note in sidebar
    vaultStatus: 'idle' | 'snapshotting' | 'success' | 'error';
    vaultStatusMessage: string | null;

    // Pane system for split view (SINGLE SOURCE OF TRUTH for tabs)
    paneRoot: PaneNode; // Root of the pane tree
    activePaneId: string | null; // Which leaf pane currently has focus
    paneIndex: Map<string, PaneNode>; // O(1) lookup index for panes

    // Actions
    initialize: () => Promise<void>;
    setCommandPaletteOpen: (isOpen: boolean) => void;
    createNote: (title?: string, parentPath?: string, useExactName?: boolean) => Promise<string>;
    createFolder: (name: string, parentPath?: string) => Promise<void>;
    setSelectedFolder: (path: string | null) => void;
    updateNote: (id: string, content: string) => void;
    renameNote: (id: string, title: string) => Promise<void>;
    moveNote: (oldPath: string, newPath: string) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    duplicateNote: (id: string) => Promise<string>;
    deleteFolder: (path: string) => Promise<void>;
    renameFolder: (oldPath: string, newName: string) =>

        Promise<void>;
    refreshFileTree: () => Promise<void>;
    collapseAllFolders: () => void;
    expandAllFolders: () => void;

    openNote: (noteId: string, newTab?: boolean) => Promise<void>;
    closeTab: (tabId: string) => void;
    closeAllTabs: () => void;
    closeOtherTabs: (tabId: string) => void;
    setActiveTab: (tabId: string) => void;
    setTabDirty: (tabId: string, isDirty: boolean) => void;
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

    // View Management
    setCurrentView: (view: 'editor' | 'graph') => void;
    toggleSidebar: () => void;
    setScrollPosition: (noteId: string, position: number) => void;

    // Pane Management
    splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void;
    closePane: (paneId: string) => void;
    setActivePane: (paneId: string) => void;
    setPaneTab: (paneId: string, tabId: string | null) => void;
    findPaneById: (id: string, node?: PaneNode) => PaneNode | null;
    getAllLeafPanes: (node?: PaneNode) => PaneNode[];

    // Pane-aware tab helpers
    getActivePane: () => PaneNode | null;
    getActivePaneTabs: () => Tab[];
    addTabToPane: (paneId: string, tab: Tab) => void;
    removeTabFromPane: (paneId: string, tabId: string) => void;
    updateTabInPane: (paneId: string, tabId: string, updates: Partial<Tab>) => void;
    findPaneByTabId: (tabId: string) => PaneNode | null;

    // Git Version Control
    checkGitStatus: () => Promise<void>;
    undoLastAmbreChange: () => Promise<void>;
    getNoteHistory: (notePath: string) => Promise<CommitInfo[]>;
    getNoteContentAtCommit: (notePath: string, commitOid: string) => Promise<string>;
    snapshotNote: (noteId: string) => Promise<void>;
    getVaultHistory: () => Promise<CommitInfo[]>;
    restoreVault: (commitOid: string) => Promise<void>;
    snapshotVault: () => Promise<void>;
}

export interface CommitStats {
    files_changed: number;
    insertions: number;
    deletions: number;
    file_paths: string[];
}

export interface CommitInfo {
    oid: string;
    message: string;
    author: string;
    timestamp: number;
    is_ambre: boolean;
    stats?: CommitStats;
}


export const useAppStore = create<AppState>((set, get) => ({
    notes: {},
    tabs: [],
    activeTabId: null,
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
    dirtyNoteIds: new Set(),
    gitEnabled: false, // Will be checked on vault load
    hasUncommittedChanges: false,
    scrollPositions: {},
    revealTrigger: 0,
    vaultStatus: 'idle',
    vaultStatusMessage: null,

    // Pane system - start with single pane
    paneRoot: {
        id: 'root',
        type: 'leaf',
        tabs: [],
        activeTabId: null
    },
    activePaneId: 'root',
    paneIndex: new Map([['root', {
        id: 'root',
        type: 'leaf',
        tabs: [],
        activeTabId: null
    }]]),
    initialize: async () => {
        const { vaultPath } = get();
        if (vaultPath) return; // Already initialized

        set({ isVaultLoading: true });
        const savedVault = localStorage.getItem('moss-vault-path');
        if (savedVault) {
            try {
                // Set vault path in settings store to load vault-specific settings
                useSettingsStore.getState().setVaultPath(savedVault);

                const files = await readVault(savedVault);

                // Restore expanded paths
                const savedExpandedPathsJson = localStorage.getItem('moss-expanded-paths');
                const expandedPaths = savedExpandedPathsJson
                    ? new Set(JSON.parse(savedExpandedPathsJson) as string[])
                    : new Set<string>();

                // Restore pane state from vault
                const paneLayout = await loadPaneLayout(savedVault);

                let paneRoot = get().paneRoot;
                let activePaneId = get().activePaneId;
                let restoredNotes: Record<string, Note> = {};

                if (paneLayout) {
                    paneRoot = paneLayout.paneRoot;
                    activePaneId = paneLayout.activePaneId;
                }

                // Collect all tabs to load their content
                const allTabs: Tab[] = [];
                const traverse = (node: PaneNode) => {
                    if (node.type === 'leaf' && node.tabs) {
                        allTabs.push(...node.tabs);
                    }
                    if (node.children) {
                        node.children.forEach(traverse);
                    }
                };
                traverse(paneRoot);

                // Load note content for each tab
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

                // Build pane index from restored tree
                const paneIndex = updatePaneIndex(paneRoot);

                set({
                    notes: restoredNotes,
                    // ❌ REMOVED: tabs: restoredTabs,
                    // ❌ REMOVED: activeTabId: savedActiveTabId,
                    fileTree: files,
                    vaultPath: savedVault,
                    isVaultLoading: false,
                    expandedPaths,
                    paneRoot,
                    activePaneId,
                    paneIndex // Initialize index
                });

                // Check Git status for the restored vault
                await get().checkGitStatus();
            } catch (e) {
                console.error('Failed to load saved vault', e);
                localStorage.removeItem('moss-vault-path');
            } finally {
                set({ isVaultLoading: false });
            }
        } else {
            set({ isVaultLoading: false });
        }
    },

    refreshFileTree: async () => {
        const { vaultPath, isVaultLoading, vaultGeneration } = get();
        // console.log('[REFRESH] refreshFileTree called');
        // Don't refresh if we're currently loading a new vault (prevents race condition)
        if (isVaultLoading) {
            // console.log('[REFRESH] Skipping - vault is loading');
            return;
        }
        if (vaultPath) {
            const currentGeneration = vaultGeneration; // Capture current generation
            try {
                const files = await readVault(vaultPath);

                // Only apply results if vault hasn't changed (check generation)
                const state = get();
                if (state.vaultGeneration !== currentGeneration) {
                    // console.log('[REFRESH] Ignoring stale results');
                    return; // Ignore stale results
                }

                // console.log('[REFRESH] Incrementing fileTreeGeneration from', state.fileTreeGeneration, 'to', state.fileTreeGeneration + 1);
                // Increment fileTreeGeneration to trigger graph and other file-dependent components to refresh
                set({
                    fileTree: sortFileNodes(files),
                    fileTreeGeneration: state.fileTreeGeneration + 1
                });
            } catch (e) {
                // console.error('[REFRESH] Failed to refresh file tree', e);
            }
        }
    },

    createNote: async (title = 'Untitled', parentPath?: string, useExactName = false) => {
        const { vaultPath } = get();

        if (vaultPath) {
            // Create on disk
            const timestamp = Date.now();
            // Use exact name for wikilinks, otherwise add timestamp to avoid collisions
            const filename = useExactName
                ? (title.endsWith('.md') ? title : `${title}.md`)
                : `${title}-${timestamp}.md`;
            // Use parentPath if provided, otherwise use vault root
            const targetDir = parentPath || vaultPath;
            const fullPath = `${targetDir}/${filename}`;

            try {
                await createFile(fullPath, '');

                // Incremental update
                const newNode: FileNode = {
                    id: fullPath,
                    name: filename,
                    type: 'file',
                    noteId: fullPath,
                    path: fullPath
                };

                // If parentPath is the vault root, treat as undefined for insertNode
                const effectiveParentPath = parentPath === vaultPath ? undefined : parentPath;

                set(state => ({
                    fileTree: insertNode(state.fileTree, newNode, effectiveParentPath)
                }));

                return fullPath;
            } catch (e) {
                console.error('Failed to create file', e);
                return '';
            }
        } else {
            // Memory only (fallback)
            const id = uuidv4();
            const newNote: Note = {
                id,
                title,
                content: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            set((state) => ({
                notes: { ...state.notes, [id]: newNote },
                fileTree: [
                    ...state.fileTree,
                    { id: `file-${id}`, name: title, type: 'file', noteId: id }
                ]
            }));

            return id;
        }
    },

    createFolder: async (name: string, parentPath?: string) => {
        const { vaultPath } = get();
        if (vaultPath) {
            const targetDir = parentPath || vaultPath;
            const fullPath = `${targetDir}/${name}`;

            try {
                await createFolderFS(fullPath);

                // Incremental update
                const newNode: FileNode = {
                    id: fullPath,
                    name: name,
                    type: 'folder',
                    path: fullPath,
                    children: []
                };

                // If parentPath is the vault root, treat as undefined for insertNode
                const effectiveParentPath = parentPath === vaultPath ? undefined : parentPath;

                set(state => ({
                    fileTree: insertNode(state.fileTree, newNode, effectiveParentPath)
                }));
            } catch (e) {
                console.error('Failed to create folder', e);
            }
        }
    },

    setSelectedFolder: (path: string | null) => {
        set({ selectedFolderPath: path });
    },

    setCommandPaletteOpen: (isOpen: boolean) => {
        set({ isCommandPaletteOpen: isOpen });
    },

    updateNote: (id, content) => {
        set((state) => {
            const newDirtyIds = new Set(state.dirtyNoteIds);
            newDirtyIds.add(id);

            // Check if note exists
            const existingNote = state.notes[id];
            let newNoteEntry: Note;

            if (existingNote) {
                newNoteEntry = { ...existingNote, content, updatedAt: Date.now() };
            } else {
                // Create new note entry if it doesn't exist (e.g. agent created/updated it)
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

            return {
                notes: {
                    ...state.notes,
                    [id]: newNoteEntry
                },
                dirtyNoteIds: newDirtyIds
            };
        });

        // Update pane tabs to reflect dirty state
        const state = get();
        const leafPanes = state.getAllLeafPanes();
        for (const pane of leafPanes) {
            const tab = pane.tabs?.find(t => t.noteId === id);
            if (tab && (!tab.isDirty || tab.isPreview)) {
                state.updateTabInPane(pane.id, tab.id, { isDirty: true, isPreview: false });
            }
        }
    },

    renameNote: async (id, title) => {
        const { vaultPath, notes } = get();

        // If it's a file path
        if (id.includes('/') && vaultPath) {
            const oldPath = id;
            // Construct new path. Assumes flat vault for now or we need to preserve parent dir
            // Get parent dir from oldPath
            const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'));
            // Ensure title has extension
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
                const { paneRoot, activePaneId } = get();
                const newRoot = JSON.parse(JSON.stringify(paneRoot));
                let changed = false;

                const traverse = (node: PaneNode) => {
                    if (node.type === 'leaf' && node.tabs) {
                        const newTabs = node.tabs.map(t => ({
                            ...t,
                            noteId: t.noteId === oldPath ? newPath : t.noteId,
                            history: t.history ? t.history.map(h => h === oldPath ? newPath : h) : [t.noteId === oldPath ? newPath : t.noteId]
                        }));
                        if (JSON.stringify(newTabs) !== JSON.stringify(node.tabs)) {
                            node.tabs = newTabs;
                            changed = true;
                        }
                    }
                    if (node.children) {
                        node.children.forEach(traverse);
                    }
                };
                traverse(newRoot);

                if (changed) {
                    const newIndex = updatePaneIndex(newRoot);
                    set({ paneRoot: newRoot, paneIndex: newIndex });
                    if (vaultPath) {
                        persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId });
                    }
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
                const { paneRoot, activePaneId } = get();
                const newRoot = JSON.parse(JSON.stringify(paneRoot));
                let changed = false;

                const traverse = (node: PaneNode) => {
                    if (node.type === 'leaf' && node.tabs) {
                        const newTabs = node.tabs.map(t => ({
                            ...t,
                            noteId: t.noteId === oldPath ? newPath : t.noteId,
                            history: t.history ? t.history.map(h => h === oldPath ? newPath : h) : [t.noteId === oldPath ? newPath : t.noteId]
                        }));
                        if (JSON.stringify(newTabs) !== JSON.stringify(node.tabs)) {
                            node.tabs = newTabs;
                            changed = true;
                        }
                    }
                    if (node.children) {
                        node.children.forEach(traverse);
                    }
                };
                traverse(newRoot);

                if (changed) {
                    const newIndex = updatePaneIndex(newRoot);
                    set({ paneRoot: newRoot, paneIndex: newIndex });
                    persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId });
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
        const { vaultPath, notes, tabs } = get();

        // If it's a file path (filesystem note)
        if (id.includes('/') && vaultPath) {
            try {
                // Delete the file
                await deleteFile(id);

                // Close any tabs with this note
                const { getAllLeafPanes } = get();
                const leafPanes = getAllLeafPanes();
                for (const pane of leafPanes) {
                    const tabsToClose = pane.tabs?.filter(t => t.noteId === id);
                    if (tabsToClose) {
                        for (const tab of tabsToClose) {
                            get().closeTab(tab.id);
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
            const { getAllLeafPanes } = get();
            const leafPanes = getAllLeafPanes();
            for (const pane of leafPanes) {
                const tabsToClose = pane.tabs?.filter(t => t.noteId === id);
                if (tabsToClose) {
                    for (const tab of tabsToClose) {
                        get().closeTab(tab.id);
                    }
                }
            }

            const newNotes = { ...notes };
            delete newNotes[id];

            set((state) => ({
                notes: newNotes,
                fileTree: state.fileTree.filter(node => node.noteId !== id)
            }));
        }
    },

    deleteFolder: async (path: string) => {
        const { vaultPath } = get();
        if (vaultPath) {
            try {
                await deleteFolderFS(path);

                // Update tabs in all panes
                const { paneRoot, activePaneId } = get();
                const newRoot = JSON.parse(JSON.stringify(paneRoot));
                let changed = false;

                const traverse = (node: PaneNode) => {
                    if (node.type === 'leaf' && node.tabs) {
                        const newTabs = node.tabs.filter(t => !t.noteId.startsWith(path + '/'));
                        if (JSON.stringify(newTabs) !== JSON.stringify(node.tabs)) {
                            node.tabs = newTabs;
                            changed = true;
                        }
                    }
                    if (node.children) node.children.forEach(traverse);
                };
                traverse(newRoot);

                if (changed) {
                    const newIndex = updatePaneIndex(newRoot);
                    set({ paneRoot: newRoot, paneIndex: newIndex });
                    if (vaultPath) {
                        persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId });
                    }
                }

                // Refresh tree
                const files = await readVault(vaultPath);
                set({ fileTree: files });
            } catch (e) {
                console.error('Failed to delete folder', e);
            }
        }
    },

    renameFolder: async (oldPath: string, newName: string) => {
        const { vaultPath } = get();
        if (vaultPath) {
            try {
                // Get parent directory
                const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'));
                const newPath = `${parentDir}/${newName}`;

                // Use rename function from fs
                await renameFile(oldPath, newPath);

                // Refresh tree to reflect changes
                const files = await readVault(vaultPath);
                set({ fileTree: files });
            } catch (e) {
                console.error('Failed to rename folder', e);
            }
        }
    },

    duplicateNote: async (id: string): Promise<string> => {
        const { vaultPath } = get();

        if (!id.includes('/') || !vaultPath) {
            return ''; // Only works for file-based notes
        }

        try {
            // Load current note content
            const content = await loadNoteContent(id);

            // Get the directory and filename
            const parentDir = id.substring(0, id.lastIndexOf('/'));
            const filename = id.split('/').pop() || 'Untitled.md';
            const nameWithoutExt = filename.replace(/\.md$/, '');

            // Create new filename with timestamp
            const timestamp = Date.now();
            const newFilename = `${nameWithoutExt}-copy-${timestamp}.md`;
            const newPath = `${parentDir}/${newFilename}`;

            // Create the new file
            await createFile(newPath, content);

            // Add to file tree
            const newNode: FileNode = {
                id: newPath,
                name: newFilename,
                type: 'file',
                noteId: newPath,
                path: newPath
            };

            set(state => ({
                fileTree: insertNode(state.fileTree, newNode, parentDir === vaultPath ? undefined : parentDir)
            }));

            // Open the duplicated note
            await get().openNote(newPath);

            return newPath;
        } catch (e) {
            console.error('Failed to duplicate note', e);
            return '';
        }
    },

    openNote: async (noteId, newTab = false) => {
        const { notes, dirtyNoteIds, getAllLeafPanes, getActivePane, addTabToPane, updateTabInPane, setActivePane } = get();

        // 1. Load note content if not already loaded
        if (!notes[noteId] || !notes[noteId].title) {
            if (noteId.includes('/')) {
                try {
                    const content = await loadNoteContent(noteId);
                    const filename = noteId.split('/').pop() || 'Untitled';
                    const name = filename.replace(/\.md$/, '');
                    const newNote: Note = {
                        id: noteId,
                        title: name,
                        content,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    };
                    set((state) => ({
                        notes: { ...state.notes, [noteId]: newNote }
                    }));
                } catch (e) {
                    console.error('Failed to load note', e);
                    return;
                }
            }
        }

        // 2. Find target pane
        let targetPane = getActivePane();

        // If no active pane or not a leaf, find first suitable pane
        if (!targetPane) {
            const leafPanes = getAllLeafPanes();
            if (leafPanes.length === 0) {
                console.error('No leaf panes available!');
                return;
            }

            // Try to find an empty pane (no tabs or no activeTabId)
            targetPane = leafPanes.find(p => !p.tabs || p.tabs.length === 0 || !p.activeTabId) || leafPanes[0];

            // Set this as the active pane
            setActivePane(targetPane.id);
        }

        const paneTabs = targetPane.tabs || [];
        const currentTabId = targetPane.activeTabId;
        const currentTab = paneTabs.find(t => t.id === currentTabId);

        // 3. Determine if we need a new tab
        const shouldCreateNewTab = newTab || !currentTab;

        if (shouldCreateNewTab) {
            // Create new tab in this pane
            const newTabObj: Tab = {
                id: uuidv4(),
                noteId,
                isDirty: dirtyNoteIds.has(noteId),
                isPreview: false,
                history: [noteId],
                historyIndex: 0
            };

            addTabToPane(targetPane.id, newTabObj);
            get().revealNoteInSidebar(noteId);
            return;
        }

        // 4. Navigate within existing tab
        if (currentTab && currentTab.noteId !== noteId) {
            // Truncate forward history and add new note
            const newHistory = currentTab.history ? currentTab.history.slice(0, (currentTab.historyIndex || 0) + 1) : [currentTab.noteId];
            newHistory.push(noteId);

            const tabUpdates: Partial<Tab> = {
                noteId,
                isDirty: dirtyNoteIds.has(noteId),
                history: newHistory,
                historyIndex: newHistory.length - 1
            };

            updateTabInPane(targetPane.id, currentTab.id, tabUpdates);
            get().revealNoteInSidebar(noteId);
        }
    },

    navigateBack: () => {
        const { getActivePane, updateTabInPane, dirtyNoteIds } = get();
        const activePane = getActivePane();
        if (!activePane) return;

        const activeTab = activePane.tabs?.find(t => t.id === activePane.activeTabId);

        if (activeTab && activeTab.history && activeTab.historyIndex > 0) {
            const newIndex = activeTab.historyIndex - 1;
            const newNoteId = activeTab.history[newIndex];

            updateTabInPane(activePane.id, activeTab.id, {
                noteId: newNoteId,
                historyIndex: newIndex,
                isDirty: dirtyNoteIds.has(newNoteId)
            });
        }
    },

    navigateForward: () => {
        const { getActivePane, updateTabInPane, dirtyNoteIds } = get();
        const activePane = getActivePane();
        if (!activePane) return;

        const activeTab = activePane.tabs?.find(t => t.id === activePane.activeTabId);

        if (activeTab && activeTab.history && activeTab.historyIndex < activeTab.history.length - 1) {
            const newIndex = activeTab.historyIndex + 1;
            const newNoteId = activeTab.history[newIndex];

            updateTabInPane(activePane.id, activeTab.id, {
                noteId: newNoteId,
                historyIndex: newIndex,
                isDirty: dirtyNoteIds.has(newNoteId)
            });
        }
    },

    canNavigateBack: () => {
        const { getActivePane } = get();
        const activePane = getActivePane();
        const activeTab = activePane?.tabs?.find(t => t.id === activePane.activeTabId);
        return !!(activeTab && activeTab.history && activeTab.historyIndex > 0);
    },

    canNavigateForward: () => {
        const { getActivePane } = get();
        const activePane = getActivePane();
        const activeTab = activePane?.tabs?.find(t => t.id === activePane.activeTabId);
        return !!(activeTab && activeTab.history && activeTab.historyIndex < activeTab.history.length - 1);
    },

    closeTab: (tabId) => {
        const { findPaneByTabId, removeTabFromPane } = get();
        const pane = findPaneByTabId(tabId);
        if (pane) {
            removeTabFromPane(pane.id, tabId);
        }
    },

    closeAllTabs: () => {
        const { paneRoot, vaultPath, activePaneId } = get();

        // Create deep copy to modify
        const newRoot = JSON.parse(JSON.stringify(paneRoot));

        const traverse = (node: PaneNode) => {
            if (node.type === 'leaf') {
                node.tabs = [];
                node.activeTabId = null;
            }
            if (node.children) {
                node.children.forEach(traverse);
            }
        };
        traverse(newRoot);

        const newIndex = updatePaneIndex(newRoot);

        set({ paneRoot: newRoot, paneIndex: newIndex });

        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId });
        }
    },

    closeOtherTabs: (tabId) => {
        const { findPaneByTabId, updateTabInPane } = get();
        const pane = findPaneByTabId(tabId);

        if (pane && pane.tabs) {
            const tabToKeep = pane.tabs.find(t => t.id === tabId);
            if (tabToKeep) {
                // We can't use updateTabInPane to remove other tabs easily without a new action
                // So we'll manually update the pane tree here
                const { paneRoot, vaultPath, activePaneId } = get();
                const newRoot = JSON.parse(JSON.stringify(paneRoot));

                // Helper to find and update the specific pane in the new tree
                const updatePaneInTree = (node: PaneNode) => {
                    if (node.id === pane.id) {
                        node.tabs = [tabToKeep];
                        node.activeTabId = tabId;
                    } else if (node.children) {
                        node.children.forEach(updatePaneInTree);
                    }
                };
                updatePaneInTree(newRoot);

                const newIndex = updatePaneIndex(newRoot);
                set({ paneRoot: newRoot, paneIndex: newIndex });

                if (vaultPath) {
                    persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId });
                }
            }
        }
    },

    setActiveTab: (tabId) => {
        const { findPaneByTabId, setPaneTab, getActivePane } = get();
        const pane = findPaneByTabId(tabId);
        if (pane) {
            setPaneTab(pane.id, tabId);

            // Reveal note in sidebar
            const tab = pane.tabs?.find(t => t.id === tabId);
            if (tab) {
                get().revealNoteInSidebar(tab.noteId);
            }
        }
    },

    setTabDirty: (tabId, isDirty) => {
        const { findPaneByTabId, updateTabInPane, dirtyNoteIds } = get();
        const pane = findPaneByTabId(tabId);

        if (pane) {
            // Update dirtyNoteIds globally
            const tab = pane.tabs?.find(t => t.id === tabId);
            if (tab) {
                const newDirtyIds = new Set(dirtyNoteIds);
                if (isDirty) {
                    newDirtyIds.add(tab.noteId);
                }
                // Don't remove if false, handled by saveNote
                set({ dirtyNoteIds: newDirtyIds });
            }

            updateTabInPane(pane.id, tabId, {
                isDirty,
                isPreview: isDirty ? false : undefined
            });
        }
    },

    openVault: async () => {
        try {
            const path = await openVault();
            if (path) {
                // Set vault path in settings store to load vault-specific settings
                useSettingsStore.getState().setVaultPath(path);

                const prevGeneration = get().vaultGeneration;

                // Clear state immediately to prevent stale data
                set({
                    isVaultLoading: true,
                    vaultPath: path,
                    fileTree: [],
                    notes: {},
                    // ❌ REMOVED: tabs: [],
                    // ❌ REMOVED: activeTabId: null,
                    paneRoot: { id: 'root', type: 'leaf', tabs: [], activeTabId: null },
                    activePaneId: 'root',
                    paneIndex: new Map([['root', { id: 'root', type: 'leaf', tabs: [], activeTabId: null }]]),
                    saveStates: {}, // Clear save states
                    selectedFolderPath: null, // Clear selected folder
                    vaultGeneration: prevGeneration + 1, // Increment generation to invalidate in-flight operations
                    expandedPaths: new Set(), // Clear expanded paths for new vault
                    vaultStatus: 'idle',
                    vaultStatusMessage: null
                });

                // Clear localStorage to prevent stale tabs from being restored
                // ❌ REMOVED: localStorage.removeItem('moss-tabs');
                // ❌ REMOVED: localStorage.removeItem('moss-active-tab');
                localStorage.removeItem('moss-expanded-paths');
                localStorage.setItem('moss-vault-path', path);

                const files = await readVault(path);

                set({
                    fileTree: sortFileNodes(files),
                    isVaultLoading: false,
                });

                // Check Git status for the newly opened vault
                await get().checkGitStatus();

                // Force cursor update after vault switch
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('force-cursor-update'));
                }, 100);
            } else {
                // Vault selection cancelled
            }
        } catch (e) {
            console.error('[VAULT] Failed to open vault:', e);
            // Ensure we reset loading state even on error
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

    // Core save function with retry logic and queueing
    saveNote: async (noteId, content) => {
        const { notes, setSaveState } = get();
        const note = notes[noteId];

        if (!note) return;

        // Skip if not a file system note
        if (!noteId.includes('/')) {
            return;
        }

        // 1. Update pending content
        pendingSaves.set(noteId, content);

        // 2. If a save is already in progress, just return.
        // The active saver will check pendingSaves when it finishes.
        if (saveQueue.has(noteId)) {
            return;
        }

        // 3. Start the save loop
        const saveLoop = async () => {
            // Keep saving as long as there is pending content
            while (pendingSaves.has(noteId)) {
                // Get the latest content and clear pending
                const contentToSave = pendingSaves.get(noteId)!;
                pendingSaves.delete(noteId);

                setSaveState(noteId, { status: 'saving', error: null });

                let lastError: Error | null = null;
                const maxRetries = 3;
                let success = false;

                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        await saveNoteContent(noteId, contentToSave);
                        success = true;
                        break; // Success!
                    } catch (e) {
                        lastError = e as Error;
                        console.error(`Save attempt ${attempt + 1} failed for ${noteId}:`, e);

                        // Wait before retrying (exponential backoff)
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

                    // Remove from dirty set
                    set(state => {
                        const newDirtyIds = new Set(state.dirtyNoteIds);
                        newDirtyIds.delete(noteId);

                        return {
                            dirtyNoteIds: newDirtyIds
                        };
                    });

                    // CRITICAL: Also update pane-specific tabs to clear dirty flag
                    const state = get();
                    const leafPanes = state.getAllLeafPanes();
                    for (const pane of leafPanes) {
                        const tab = pane.tabs?.find(t => t.noteId === noteId);
                        if (tab) {
                            state.updateTabInPane(pane.id, tab.id, { isDirty: false });
                        }
                    }

                    // Auto-reset to idle after 2 seconds
                    setTimeout(() => {
                        const currentState = get().saveStates[noteId];
                        if (currentState?.status === 'saved' && !saveQueue.has(noteId)) {
                            setSaveState(noteId, { status: 'idle' });
                        }
                    }, 2000);
                } else {
                    // All retries failed
                    setSaveState(noteId, {
                        status: 'error',
                        error: lastError?.message || 'Failed to save note'
                    });
                }
            }
        };

        // Track the active save loop
        const promise = saveLoop();
        saveQueue.set(noteId, promise);

        try {
            await promise;
        } finally {
            saveQueue.delete(noteId);
        }
    },

    // Immediate save (bypasses debounce)
    forceSaveNote: async (noteId) => {
        const { notes, saveNote } = get();
        const note = notes[noteId];

        if (note) {
            // Cancel any pending debounced save
            debouncedSaveByNote.get(noteId)?.debouncer.cancel();
            // Save immediately
            await saveNote(noteId, note.content);

            // Clear dirty flag after successful save
            // Must get fresh state to check if save was successful
            const freshState = get();
            const leafPanes = freshState.getAllLeafPanes();

            for (const pane of leafPanes) {
                const tab = pane.tabs?.find(t => t.noteId === noteId);
                if (tab && freshState.saveStates[noteId]?.status === 'saved') {
                    freshState.setTabDirty(tab.id, false);
                }
            }

            // Check if save failed and throw error for caller to handle
            if (freshState.saveStates[noteId]?.status === 'error') {
                throw new Error(freshState.saveStates[noteId]?.error || 'Failed to save note');
            }
        }
    },

    getVaultHistory: async () => {
        const { vaultPath } = get();
        if (!vaultPath) return [];

        try {
            const { invoke } = await import('@tauri-apps/api/core');
            return await invoke<CommitInfo[]>('get_git_history', {
                vaultPath,
                limit: 50,
                ambreOnly: false,
                filePath: null // No file filter = full vault history
            });
        } catch (error) {
            console.error('Failed to get vault history:', error);
            return [];
        }
    },

    restoreVault: async (commitOid: string) => {
        const { vaultPath } = get();
        if (!vaultPath) return;

        try {
            const { invoke } = await import('@tauri-apps/api/core');

            // Call restore_vault backend
            await invoke('restore_vault', { vaultPath, commitOid });

            // Reload the file tree to reflect changes
            const { invoke: invokeTree } = await import('@tauri-apps/api/core');
            const fileTree = await invokeTree<FileNode[]>('get_file_tree', { vaultPath });
            set({ fileTree, vaultGeneration: get().vaultGeneration + 1 });

            // Close all tabs and reload
            set({
                paneRoot: { id: 'root', type: 'leaf', tabs: [], activeTabId: null },
                activePaneId: 'root',
                paneIndex: new Map([['root', { id: 'root', type: 'leaf', tabs: [], activeTabId: null }]]),
                notes: {}
            });

            // Refresh Git status
            await get().checkGitStatus();

            logger.success('Vault restored to commit:', commitOid);
        } catch (error) {
            console.error('Failed to restore vault:', error);
            throw error;
        }
    },

    // Save all dirty notes
    saveAllDirtyNotes: async () => {
        const { getAllLeafPanes, forceSaveNote } = get();
        const leafPanes = getAllLeafPanes();
        const dirtyNoteIds = new Set<string>();

        leafPanes.forEach(pane => {
            pane.tabs?.forEach(t => {
                if (t.isDirty) {
                    dirtyNoteIds.add(t.noteId);
                }
            });
        });

        // Save all in parallel
        await Promise.all(
            Array.from(dirtyNoteIds).map(noteId => forceSaveNote(noteId))
        );
    },


    requestConfirmation: (message: string) => {
        return new Promise<boolean>((resolve) => {
            set({ confirmationRequest: { message, resolve } });
        });
    },

    resolveConfirmation: (result: boolean) => {
        const { confirmationRequest } = get();
        if (confirmationRequest) {
            confirmationRequest.resolve(result);
            set({ confirmationRequest: null });
        }
    },

    revealNoteInSidebar: (noteId: string) => {
        const { fileTree, notes, vaultPath } = get();
        const note = notes[noteId];

        if (!note) return;

        // Find the file node in the flat tree
        const fileNode = fileTree.find(node => node.type === 'file' && node.noteId === noteId);

        if (!fileNode || !fileNode.path) {
            set({ revealTrigger: Date.now() });
            return;
        }

        // Extract all parent folder paths from the file's path
        // For example: /vault/Folder/Subfolder/file.md
        // Parent paths: ['/vault/Folder', '/vault/Folder/Subfolder']
        const parentPaths: string[] = [];

        if (vaultPath && fileNode.path.startsWith(vaultPath)) {
            // Get the relative path from vault root
            const relativePath = fileNode.path.slice(vaultPath.length);
            const parts = relativePath.split('/').filter(p => p && p !== fileNode.name);

            // Build up each parent folder path
            let currentPath = vaultPath;
            for (const part of parts) {
                currentPath = currentPath.endsWith('/') ? currentPath + part : currentPath + '/' + part;
                parentPaths.push(currentPath);
            }
        }

        if (parentPaths.length > 0) {
            set((state) => {
                const newSet = new Set(state.expandedPaths);
                parentPaths.forEach(path => newSet.add(path));
                persistExpandedPathsDebounced(newSet);
                return {
                    expandedPaths: newSet,
                    revealTrigger: Date.now() // Trigger scroll
                };
            });
        } else {
            // Root level file - just trigger scroll
            set({ revealTrigger: Date.now() });
        }
    },

    toggleFolder: (path: string) => {
        set((state) => {
            const newExpandedPaths = new Set(state.expandedPaths);
            if (newExpandedPaths.has(path)) {
                newExpandedPaths.delete(path);
            } else {
                newExpandedPaths.add(path);
            }
            persistExpandedPathsDebounced(newExpandedPaths);
            return { expandedPaths: newExpandedPaths };
        });
    },

    collapseAllFolders: () => {
        set({ expandedPaths: new Set() });
        localStorage.setItem('moss-expanded-paths', JSON.stringify([]));
    },

    expandAllFolders: () => {
        const { fileTree } = get();
        const allFolderPaths = new Set<string>();

        // Recursively collect all folder paths
        const collectFolders = (nodes: FileNode[]) => {
            nodes.forEach(node => {
                if (node.type === 'folder' && node.path) {
                    allFolderPaths.add(node.path);
                }
                if (node.children) {
                    collectFolders(node.children);
                }
            });
        };

        collectFolders(fileTree);
        persistExpandedPathsDebounced(allFolderPaths);
        set({ expandedPaths: allFolderPaths });
    },

    setCurrentView: (view: 'editor' | 'graph') => {
        set({ currentView: view });
    },

    setScrollPosition: (noteId, position) => {
        set((state) => ({
            scrollPositions: {
                ...state.scrollPositions,
                [noteId]: position
            }
        }));
    },

    // ============================================================================
    // Pane Management - Optimized with O(1) Index (Phase 3)
    // ============================================================================

    /**
     * Find pane by ID using O(1) index lookup.
     * Previously: O(n) recursive tree traversal
     * Now: O(1) direct map lookup
     */
    findPaneById: (id: string): PaneNode | null => {
        return get().paneIndex.get(id) || null;
    },

    /**
     * Get all leaf panes using index.
     * Previously: O(n) recursive traversal
     * Now: O(n) but simpler - iterate index values
     */
    getAllLeafPanes: (): PaneNode[] => {
        const panes = Array.from(get().paneIndex.values());
        return panes.filter(pane => pane.type === 'leaf');
    },

    splitPane: (paneId: string, direction: 'horizontal' | 'vertical'): boolean => {
        const state = get();
        const pane = state.findPaneById(paneId);

        // Validate pane exists
        if (!pane) {
            console.error(`[splitPane] Cannot split: pane ${paneId} not found`);
            return false;
        }

        // Validate pane is a leaf node
        if (pane.type !== 'leaf') {
            console.error(`[splitPane] Cannot split: pane ${paneId} is already a split node`);
            return false;
        }

        const paneRoot = state.paneRoot;

        // Helper function to recursively update the tree
        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === paneId && node.type === 'leaf') {
                // Found the pane to split - convert to split node
                const newPane1: PaneNode = {
                    id: `pane-${uuidv4()}`,
                    type: 'leaf',
                    tabs: node.tabs || [], // Keep existing tabs in first pane
                    activeTabId: node.activeTabId // Keep current tab in first pane
                };
                const newPane2: PaneNode = {
                    id: `pane-${uuidv4()}`,
                    type: 'leaf',
                    tabs: [], // Start empty
                    activeTabId: null // Empty second pane
                };

                return {
                    id: node.id,
                    type: 'split',
                    direction,
                    splitRatio: 0.5,
                    children: [newPane1, newPane2]
                };
            }

            if (node.type === 'split' && node.children) {
                return {
                    ...node,
                    children: [
                        updateTree(node.children[0]),
                        updateTree(node.children[1])
                    ] as [PaneNode, PaneNode]
                };
            }

            return node;
        };

        const newRoot = updateTree(paneRoot);
        const newIndex = updatePaneIndex(newRoot);

        set({
            paneRoot: newRoot,
            paneIndex: newIndex
        });

        // Persist to localStorage (debounced)
        const vaultPath = get().vaultPath;
        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId: get().activePaneId });
        }
        return true;
    },

    closePane: (paneId: string): boolean => {
        const paneRoot = get().paneRoot;

        // Can't close if it's the only pane
        if (paneRoot.type === 'leaf') {
            console.warn('[closePane] Cannot close the last pane');
            return false;
        }

        // Validate pane exists
        const pane = get().findPaneById(paneId);
        if (!pane) {
            console.error(`[closePane] Cannot close: pane ${paneId} not found`);
            return false;
        }

        // Helper to find parent of pane and collapse the split
        const updateTree = (node: PaneNode): { newNode: PaneNode | null, shouldRemove: boolean } => {
            if (node.type === 'split' && node.children) {
                const [left, right] = node.children;

                // Check if one of the direct children is the pane to close
                if (left.id === paneId) {
                    // Remove left child, promote right child
                    return { newNode: right, shouldRemove: false };
                }
                if (right.id === paneId) {
                    // Remove right child, promote left child
                    return { newNode: left, shouldRemove: false };
                }

                // Recursively check children
                const leftResult = updateTree(left);
                const rightResult = updateTree(right);

                if (leftResult.shouldRemove || rightResult.shouldRemove) {
                    return { newNode: null, shouldRemove: true };
                }

                return {
                    newNode: {
                        ...node,
                        children: [
                            leftResult.newNode || left,
                            rightResult.newNode || right
                        ] as [PaneNode, PaneNode]
                    },
                    shouldRemove: false
                };
            }

            return { newNode: node, shouldRemove: false };
        };

        const { newNode } = updateTree(paneRoot);
        if (newNode) {
            const newIndex = updatePaneIndex(newNode);

            set({
                paneRoot: newNode,
                paneIndex: newIndex
            });

            // Update active pane if we closed it
            if (get().activePaneId === paneId) {
                const leafPanes = get().getAllLeafPanes(newNode);
                if (leafPanes.length > 0) {
                    set({ activePaneId: leafPanes[0].id });
                }
            }

            // Persist to localStorage (debounced)
            const vaultPath = get().vaultPath;
            if (vaultPath) {
                persistPaneLayoutDebounced(vaultPath, { paneRoot: newNode, activePaneId: get().activePaneId });
            }
            return true;
        }

        console.error(`[closePane] Failed to close pane ${paneId}`);
        return false;
    },

    setActivePane: (paneId: string) => {
        // Update active pane ID
        set({ activePaneId: paneId });

        const vaultPath = get().vaultPath;
        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: get().paneRoot, activePaneId: paneId });
        }
    },

    setPaneTab: (paneId: string, tabId: string | null) => {
        const paneRoot = get().paneRoot;

        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === paneId && node.type === 'leaf') {
                return { ...node, activeTabId: tabId };
            }

            if (node.type === 'split' && node.children) {
                return {
                    ...node,
                    children: [
                        updateTree(node.children[0]),
                        updateTree(node.children[1])
                    ] as [PaneNode, PaneNode]
                };
            }

            return node;
        };

        const newRoot = updateTree(paneRoot);
        const newIndex = updatePaneIndex(newRoot);

        set({
            paneRoot: newRoot,
            paneIndex: newIndex
        });

        // Persist to localStorage (debounced)
        const vaultPath = get().vaultPath;
        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId: get().activePaneId });
        }
    },

    // Pane-aware tab helpers
    getActivePane: () => {
        const { activePaneId, findPaneById } = get();
        if (!activePaneId) return null;
        const pane = findPaneById(activePaneId);
        return pane && pane.type === 'leaf' ? pane : null;
    },

    getActivePaneTabs: () => {
        const activePane = get().getActivePane();
        return activePane?.tabs || [];
    },

    addTabToPane: (paneId: string, tab: Tab) => {
        const paneRoot = get().paneRoot;

        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === paneId && node.type === 'leaf') {
                const tabs = node.tabs || [];
                return {
                    ...node,
                    tabs: [...tabs, tab],
                    activeTabId: tab.id
                };
            }

            if (node.type === 'split' && node.children) {
                return {
                    ...node,
                    children: [
                        updateTree(node.children[0]),
                        updateTree(node.children[1])
                    ] as [PaneNode, PaneNode]
                };
            }

            return node;
        };

        const newRoot = updateTree(paneRoot);
        const newIndex = updatePaneIndex(newRoot);

        set({
            paneRoot: newRoot,
            paneIndex: newIndex
        });
        const vaultPath = get().vaultPath;
        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId: get().activePaneId });
        }
    },

    removeTabFromPane: (paneId: string, tabId: string) => {
        const paneRoot = get().paneRoot;

        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === paneId && node.type === 'leaf') {
                const tabs = node.tabs || [];
                const newTabs = tabs.filter(t => t.id !== tabId);
                const newActiveTabId = node.activeTabId === tabId
                    ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
                    : node.activeTabId;

                return {
                    ...node,
                    tabs: newTabs,
                    activeTabId: newActiveTabId
                };
            }

            if (node.type === 'split' && node.children) {
                return {
                    ...node,
                    children: [
                        updateTree(node.children[0]),
                        updateTree(node.children[1])
                    ] as [PaneNode, PaneNode]
                };
            }

            return node;
        };

        const newRoot = updateTree(paneRoot);
        const newIndex = updatePaneIndex(newRoot);

        set({
            paneRoot: newRoot,
            paneIndex: newIndex
        });
        const vaultPath = get().vaultPath;
        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId: get().activePaneId });
        }
    },

    updateTabInPane: (paneId: string, tabId: string, updates: Partial<Tab>) => {
        const paneRoot = get().paneRoot;

        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === paneId && node.type === 'leaf') {
                const tabs = node.tabs || [];
                const newTabs = tabs.map(t =>
                    t.id === tabId ? { ...t, ...updates } : t
                );

                return { ...node, tabs: newTabs };
            }

            if (node.type === 'split' && node.children) {
                return {
                    ...node,
                    children: [
                        updateTree(node.children[0]),
                        updateTree(node.children[1])
                    ] as [PaneNode, PaneNode]
                };
            }

            return node;
        };

        const newRoot = updateTree(paneRoot);
        const newIndex = updatePaneIndex(newRoot);

        set({
            paneRoot: newRoot,
            paneIndex: newIndex
        });
        const vaultPath = get().vaultPath;
        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId: get().activePaneId });
        }
    },

    /**
     * Find pane containing a specific tab.
     * Uses index to iterate only leaf panes instead of full tree traversal.
     */
    findPaneByTabId: (tabId: string) => {
        const leafPanes = get().getAllLeafPanes(); // Now O(n) via index, not recursive
        for (const pane of leafPanes) {
            if (pane.tabs?.some(t => t.id === tabId)) {
                return pane;
            }
        }
        return null;
    },

    // Git Version Control Actions
    checkGitStatus: async () => {
        const { vaultPath } = get();
        if (vaultPath) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const isGit = await invoke<boolean>('check_git_status', { vaultPath });
                set({ gitEnabled: isGit });
            } catch (e) {
                console.error('Failed to check git status:', e);
                set({ gitEnabled: false });
            }
        }
    },

    undoLastAmbreChange: async () => {
        const { vaultPath, requestConfirmation } = get();
        if (!vaultPath) return;

        const confirmed = await requestConfirmation(
            'Undo the last change made by Ambre? This will create a revert commit.'
        );
        if (!confirmed) return;

        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke<string>('undo_last_ambre_change', { vaultPath });

            await get().checkGitStatus(); // Refresh status
        } catch (error) {
            console.error('Failed to undo last change:', error);
            throw error;
        }
    },

    snapshotNote: async (noteId: string) => {
        const { vaultPath, gitEnabled, forceSaveNote } = get();
        if (!vaultPath || !gitEnabled) return;

        try {
            // 1. Force save first to ensure disk is up to date
            await forceSaveNote(noteId);

            // Set state to saving (or custom snapshot state if we want distinct icon during save)
            set(state => ({
                saveStates: {
                    ...state.saveStates,
                    [noteId]: { status: 'saving', lastSaved: Date.now(), error: null }
                }
            }));

            // 2. Commit
            const { invoke } = await import('@tauri-apps/api/core');
            const timestamp = new Date().toLocaleString();
            const message = `Manual snapshot: ${timestamp}`;

            await invoke('commit_note', {
                vaultPath,
                filePath: noteId,
                message
            });

            // 3. Refresh status
            await get().checkGitStatus();

            // Set state to snapshot
            set(state => ({
                saveStates: {
                    ...state.saveStates,
                    [noteId]: { status: 'snapshot', lastSaved: Date.now(), error: null }
                }
            }));

            // Reset back to saved after a delay
            setTimeout(() => {
                set(state => ({
                    saveStates: {
                        ...state.saveStates,
                        [noteId]: { status: 'saved', lastSaved: Date.now(), error: null }
                    }
                }));
            }, 3000);

            logger.success('Snapshot saved:', message);
        } catch (error) {
            console.error('Failed to snapshot note:', error);
            throw error;
        }
    },

    snapshotVault: async () => {
        const { vaultPath, gitEnabled } = get();
        if (!vaultPath || !gitEnabled) return;

        try {
            set({ vaultStatus: 'snapshotting', vaultStatusMessage: 'Snapshotting vault...' });

            const { invoke } = await import('@tauri-apps/api/core');
            const timestamp = new Date().toLocaleString();
            const message = `Vault snapshot: ${timestamp}`;

            await invoke('commit_vault', {
                vaultPath,
                message
            });

            // Refresh status
            await get().checkGitStatus();

            set({ vaultStatus: 'success', vaultStatusMessage: 'Vault snapshot saved' });
            console.log('Vault snapshot saved:', message);

            // Reset after delay
            setTimeout(() => {
                set({ vaultStatus: 'idle', vaultStatusMessage: null });
            }, 3000);

            logger.success('Vault snapshot saved:', message);
        } catch (error) {
            logger.error('Failed to snapshot vault:', error);
            set({ vaultStatus: 'error', vaultStatusMessage: 'Failed to snapshot vault' });

            // Reset error after delay
            setTimeout(() => {
                set({ vaultStatus: 'idle', vaultStatusMessage: null });
            }, 5000);

            throw error;
        }
    },

    getNoteHistory: async (notePath: string) => {
        const { vaultPath } = get();
        if (!vaultPath) return [];

        try {
            const { invoke } = await import('@tauri-apps/api/core');
            return await invoke<CommitInfo[]>('get_git_history', {
                vaultPath,
                limit: 20,
                ambreOnly: false,
                filePath: notePath
            });
        } catch (error) {
            console.error('Failed to get note history:', error);
            return [];
        }
    },

    getNoteContentAtCommit: async (notePath: string, commitOid: string) => {
        const { vaultPath } = get();
        if (!vaultPath) return '';

        try {
            const { invoke } = await import('@tauri-apps/api/core');
            return await invoke<string>('get_file_content_at_commit', {
                vaultPath,
                commitOid,
                filePath: notePath
            });
        } catch (error) {
            // Check if this is an expected "file not found" error
            const errorMessage = String(error);
            const isNotFound = errorMessage.includes('does not exist') ||
                errorMessage.includes('NotFound') ||
                errorMessage.includes('class=Tree (14)');

            if (!isNotFound) {
                // Only log unexpected errors
                console.error('Failed to get note content at commit:', error);
            }
            throw error;
        }
    },

    toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
    }
}));

// ============================================================================
// Selective Subscription Hooks (for performance)
// ============================================================================

export const useActiveNote = () => useAppStore(
    state => {
        const activePaneId = state.activePaneId;
        const activePane = state.paneIndex.get(activePaneId || '');
        const activeTab = activePane?.tabs?.find(t => t.id === activePane.activeTabId);
        return activeTab ? state.notes[activeTab.noteId] : null;
    }
);

export const useActiveTabId = () => useAppStore(state => {
    const activePaneId = state.activePaneId;
    const activePane = state.paneIndex.get(activePaneId || '');
    return activePane?.activeTabId || null;
});

export const useTabs = () => useAppStore(state => {
    const activePaneId = state.activePaneId;
    const activePane = state.paneIndex.get(activePaneId || '');
    return activePane?.tabs || [];
});

export const useFileTree = () => useAppStore(state => state.fileTree);

export const useFileActions = () => {
    const openNote = useAppStore(state => state.openNote);
    const deleteNote = useAppStore(state => state.deleteNote);
    const renameNote = useAppStore(state => state.renameNote);
    const moveNote = useAppStore(state => state.moveNote);
    const createNote = useAppStore(state => state.createNote);
    const createFolder = useAppStore(state => state.createFolder);
    const deleteFolder = useAppStore(state => state.deleteFolder);
    const renameFolder = useAppStore(state => state.renameFolder);

    return { openNote, deleteNote, renameNote, moveNote, createNote, createFolder, deleteFolder, renameFolder };
};


// Stable default save state to prevent infinite re-renders
const DEFAULT_SAVE_STATE: SaveState = {
    status: 'idle',
    lastSaved: null,
    error: null
};

export const useSaveState = (noteId: string) => useAppStore(
    state => state.saveStates[noteId] ?? DEFAULT_SAVE_STATE
);

export const useVaultStatus = () => {
    const status = useAppStore(state => state.vaultStatus);
    const message = useAppStore(state => state.vaultStatusMessage);
    return { status, message };
};

// ============================================================================
// Debounced Save Helper (called from Editor)
// ============================================================================

export const debouncedSaveNote = (noteId: string, content: string) => {
    const settings = useSettingsStore.getState().settings;
    const delay = settings.autoSaveDelay;

    // Get existing debouncer entry
    const existing = debouncedSaveByNote.get(noteId);

    // If no debouncer exists, or the delay has changed, create a new one
    if (!existing || existing.delay !== delay) {
        // Cancel existing if it exists
        if (existing) {
            existing.debouncer.cancel();
        }

        const newDebouncer = debounce(async (id: string, cnt: string) => {
            // Get fresh store reference inside debounced function
            const store = useAppStore.getState();
            await store.saveNote(id, cnt);

            // Clear dirty flag after successful save
            // Need to get fresh store state again after save completes
            const freshStore = useAppStore.getState();
            const leafPanes = freshStore.getAllLeafPanes();

            for (const pane of leafPanes) {
                const tab = pane.tabs?.find(t => t.noteId === id);
                if (tab && freshStore.saveStates[id]?.status === 'saved') {
                    freshStore.setTabDirty(tab.id, false);
                }
            }
        }, delay);

        debouncedSaveByNote.set(noteId, { debouncer: newDebouncer, delay });
        newDebouncer(noteId, content);
    } else {
        // Use existing debouncer
        existing.debouncer(noteId, content);
    }
};

// ============================================================================
// App Lifecycle - Save before close
// ============================================================================

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', (e) => {
        const state = useAppStore.getState();
        const leafPanes = state.getAllLeafPanes();
        const hasDirtyNotes = leafPanes.some(pane => pane.tabs?.some(t => t.isDirty));

        if (hasDirtyNotes) {
            // Attempt to save all dirty notes synchronously
            state.saveAllDirtyNotes();

            // Show browser confirmation dialog
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

