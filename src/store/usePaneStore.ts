import { create } from 'zustand';
import { PaneNode, Tab } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { savePaneLayout } from '../lib/fs';
import { debounce } from 'lodash-es';
import { updatePaneIndex, clonePaneTree } from './helpers/paneHelpers';
import { useSettingsStore } from './useSettingsStore';

// Debounced helper to persist pane layout to vault's .moss directory
const persistPaneLayoutDebounced = debounce(async (vaultPath: string, layout: { paneRoot: PaneNode; activePaneId: string | null }) => {
    if (!vaultPath) return;
    await savePaneLayout(vaultPath, layout);
}, 300);

interface PaneState {
    // Pane system for split view (SINGLE SOURCE OF TRUTH for tabs)
    paneRoot: PaneNode; // Root of the pane tree
    activePaneId: string | null; // Which leaf pane currently has focus
    paneIndex: Map<string, PaneNode>; // O(1) lookup index for panes

    // Actions
    setPaneLayout: (root: PaneNode, activeId: string | null) => void;

    // Pane Management
    splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => boolean;
    closePane: (paneId: string) => boolean;
    setActivePane: (paneId: string) => void;
    setPaneTab: (paneId: string, tabId: string | null) => void;
    findPaneById: (id: string) => PaneNode | null;
    getAllLeafPanes: () => PaneNode[];

    // Pane-aware tab helpers
    getActivePane: () => PaneNode | null;
    getActivePaneTabs: () => Tab[];
    addTabToPane: (paneId: string, tab: Tab) => void;
    removeTabFromPane: (paneId: string, tabId: string) => void;
    updateTabInPane: (paneId: string, tabId: string, updates: Partial<Tab>) => void;
    findPaneByTabId: (tabId: string) => PaneNode | null;
    closeTab: (tabId: string) => void;
    closeAllTabs: () => void;
    closeOtherTabs: (tabId: string) => void;
}

export const usePaneStore = create<PaneState>((set, get) => ({
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

    setPaneLayout: (root: PaneNode, activeId: string | null) => {
        const index = updatePaneIndex(root);
        set({ paneRoot: root, activePaneId: activeId, paneIndex: index });
    },

    // ============================================================================
    // Pane Management - Optimized with O(1) Index
    // ============================================================================

    // Find pane by ID using O(1) index lookup.
    findPaneById: (id: string): PaneNode | null => {
        return get().paneIndex.get(id) || null;
    },

    // Get all leaf panes using index.
    getAllLeafPanes: (): PaneNode[] => {
        return Array.from(get().paneIndex.values()).filter(node => node.type === 'leaf');
    },

    splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => {
        const { paneRoot } = get();
        const vaultPath = useSettingsStore.getState().currentVaultPath;

        // 1. Find the pane to split
        const targetPane = get().findPaneById(paneId);
        if (!targetPane || targetPane.type !== 'leaf') {
            console.warn('Cannot split non-leaf pane or pane not found');
            return false;
        }

        // 2. Create new structure
        // We need to replace the target pane with a split node containing two children
        // Child 1: The original pane (with new ID?) or preserve ID?
        // Preserving ID is tricky if we want to keep state.
        // Let's make Child 1 inherit the original pane's content.
        // Child 2: A new empty pane (or duplicate?) - Let's make it empty or duplicate current tab?
        // VS Code duplicates the current tab. Let's start with empty or duplicate.
        // Let's duplicate the current tab for continuity.

        const newChild1: PaneNode = {
            ...clonePaneTree(targetPane),
            id: uuidv4(), // New ID for the child
            parentId: paneId // The original pane ID will become the split container
        };

        const newChild2: PaneNode = {
            id: uuidv4(),
            type: 'leaf',
            parentId: paneId,
            tabs: targetPane.tabs ? [...targetPane.tabs] : [], // Duplicate tabs
            activeTabId: targetPane.activeTabId
        };

        // 3. Update the tree
        // We need to find the parent of the target pane and update it, OR if target is root, update root.
        // Actually, we can't easily mutate the tree without traversal if we don't have parent pointers.
        // But we can use a recursive update function.

        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === paneId) {
                // Transform this leaf into a split
                return {
                    id: node.id,
                    type: 'split',
                    direction,
                    children: [newChild1, newChild2],
                    parentId: node.parentId
                };
            }
            if (node.children) {
                return {
                    ...node,
                    children: node.children.map(updateTree)
                };
            }
            return node;
        };

        const newRoot = updateTree(clonePaneTree(paneRoot));
        const newIndex = updatePaneIndex(newRoot);

        set({
            paneRoot: newRoot,
            paneIndex: newIndex,
            activePaneId: newChild1.id // Focus the first child (original content)
        });

        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId: newChild1.id });
        }

        return true;
    },

    closePane: (paneId: string) => {
        const { paneRoot, activePaneId } = get();
        const vaultPath = useSettingsStore.getState().currentVaultPath;

        // Cannot close the last pane if it's the root leaf
        if (paneRoot.type === 'leaf' && paneRoot.id === paneId) {
            return false;
        }

        // Helper to find parent of pane and collapse the split
        const updateTree = (node: PaneNode): { newNode: PaneNode | null, shouldRemove: boolean } => {
            if (node.id === paneId) {
                return { newNode: null, shouldRemove: true };
            }

            if (node.children) {
                const newChildren: PaneNode[] = [];
                let childRemoved = false;

                for (const child of node.children) {
                    const result = updateTree(child);
                    if (result.shouldRemove) {
                        childRemoved = true;
                    } else if (result.newNode) {
                        newChildren.push(result.newNode);
                    } else {
                        newChildren.push(child);
                    }
                }

                if (childRemoved) {
                    // If this was a split with 2 children and 1 is removed,
                    // this node should become the remaining child (collapse the split)
                    if (newChildren.length === 1) {
                        // Return the remaining child, but update its parentId
                        return { newNode: { ...newChildren[0], parentId: node.parentId }, shouldRemove: false };
                    }
                }

                return {
                    newNode: { ...node, children: newChildren },
                    shouldRemove: false
                };
            }

            return { newNode: node, shouldRemove: false };
        };

        const result = updateTree(clonePaneTree(paneRoot));
        const newRoot = result.newNode;

        if (!newRoot) return false; // Should not happen

        // If the active pane was closed, we need to activate another pane
        let newActivePaneId = activePaneId;
        if (activePaneId === paneId) {
            // Find a new active pane (e.g., the first leaf)
            const index = updatePaneIndex(newRoot);
            const leaves = Array.from(index.values()).filter(n => n.type === 'leaf');
            if (leaves.length > 0) {
                newActivePaneId = leaves[0].id;
            }
        }

        const newIndex = updatePaneIndex(newRoot);

        set({
            paneRoot: newRoot,
            paneIndex: newIndex,
            activePaneId: newActivePaneId
        });

        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId: newActivePaneId });
        }

        return true;
    },

    setActivePane: (paneId: string) => {
        set({ activePaneId: paneId });
        const vaultPath = useSettingsStore.getState().currentVaultPath;
        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: get().paneRoot, activePaneId: paneId });
        }
    },

    setPaneTab: (paneId: string, tabId: string | null) => {
        const { paneRoot } = get();
        const vaultPath = useSettingsStore.getState().currentVaultPath;

        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === paneId) {
                return { ...node, activeTabId: tabId };
            }
            if (node.children) {
                return { ...node, children: node.children.map(updateTree) };
            }
            return node;
        };

        const newRoot = updateTree(clonePaneTree(paneRoot));
        const newIndex = updatePaneIndex(newRoot);

        set({
            paneRoot: newRoot,
            paneIndex: newIndex,
            // Also set this pane as active if we're switching tabs in it
            activePaneId: paneId
        });

        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId: paneId });
        }
    },

    // Pane-aware tab helpers
    getActivePane: () => {
        const { activePaneId, paneIndex } = get();
        return activePaneId ? paneIndex.get(activePaneId) || null : null;
    },

    getActivePaneTabs: () => {
        const pane = get().getActivePane();
        return pane?.tabs || [];
    },

    addTabToPane: (paneId: string, tab: Tab) => {
        const { paneRoot } = get();
        const vaultPath = useSettingsStore.getState().currentVaultPath;

        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === paneId) {
                const tabs = node.tabs ? [...node.tabs] : [];
                // Check if tab already exists
                if (!tabs.find(t => t.id === tab.id)) {
                    tabs.push(tab);
                }
                return { ...node, tabs, activeTabId: tab.id };
            }
            if (node.children) {
                return { ...node, children: node.children.map(updateTree) };
            }
            return node;
        };

        const newRoot = updateTree(clonePaneTree(paneRoot));
        const newIndex = updatePaneIndex(newRoot);

        set({
            paneRoot: newRoot,
            paneIndex: newIndex,
            activePaneId: paneId
        });

        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId: paneId });
        }
    },

    removeTabFromPane: (paneId: string, tabId: string) => {
        const { paneRoot, activePaneId } = get();
        const vaultPath = useSettingsStore.getState().currentVaultPath;

        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === paneId && node.tabs) {
                const newTabs = node.tabs.filter(t => t.id !== tabId);
                let newActiveId = node.activeTabId;

                // If we closed the active tab, switch to the previous one
                if (node.activeTabId === tabId) {
                    newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
                }

                return { ...node, tabs: newTabs, activeTabId: newActiveId };
            }
            if (node.children) {
                return { ...node, children: node.children.map(updateTree) };
            }
            return node;
        };

        const newRoot = updateTree(clonePaneTree(paneRoot));
        const newIndex = updatePaneIndex(newRoot);

        set({ paneRoot: newRoot, paneIndex: newIndex });

        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId });
        }
    },

    updateTabInPane: (paneId: string, tabId: string, updates: Partial<Tab>) => {
        const { paneRoot } = get();

        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === paneId && node.tabs) {
                const newTabs = node.tabs.map(t =>
                    t.id === tabId ? { ...t, ...updates } : t
                );
                return { ...node, tabs: newTabs };
            }
            if (node.children) {
                return { ...node, children: node.children.map(updateTree) };
            }
            return node;
        };

        const newRoot = updateTree(clonePaneTree(paneRoot));
        const newIndex = updatePaneIndex(newRoot);

        set({ paneRoot: newRoot, paneIndex: newIndex });
    },

    // Find pane containing a specific tab.
    // Uses index to iterate only leaf panes instead of full tree traversal.
    findPaneByTabId: (tabId: string) => {
        const { getAllLeafPanes } = get();
        const leaves = getAllLeafPanes();
        for (const pane of leaves) {
            if (pane.tabs?.some(t => t.id === tabId)) {
                return pane;
            }
        }
        return null;
    },

    closeTab: (tabId: string) => {
        const pane = get().findPaneByTabId(tabId);
        if (pane) {
            get().removeTabFromPane(pane.id, tabId);
        }
    },

    closeAllTabs: () => {
        const { activePaneId, paneRoot } = get();
        const vaultPath = useSettingsStore.getState().currentVaultPath;
        if (!activePaneId) return;

        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === activePaneId) {
                return { ...node, tabs: [], activeTabId: null };
            }
            if (node.children) {
                return { ...node, children: node.children.map(updateTree) };
            }
            return node;
        };

        const newRoot = updateTree(clonePaneTree(paneRoot));
        const newIndex = updatePaneIndex(newRoot);
        set({ paneRoot: newRoot, paneIndex: newIndex });

        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId });
        }
    },

    closeOtherTabs: (tabId: string) => {
        const { activePaneId, paneRoot } = get();
        const vaultPath = useSettingsStore.getState().currentVaultPath;
        if (!activePaneId) return;

        const updateTree = (node: PaneNode): PaneNode => {
            if (node.id === activePaneId && node.tabs) {
                const tabToKeep = node.tabs.find(t => t.id === tabId);
                if (tabToKeep) {
                    return { ...node, tabs: [tabToKeep], activeTabId: tabId };
                }
            }
            if (node.children) {
                return { ...node, children: node.children.map(updateTree) };
            }
            return node;
        };

        const newRoot = updateTree(clonePaneTree(paneRoot));
        const newIndex = updatePaneIndex(newRoot);
        set({ paneRoot: newRoot, paneIndex: newIndex });

        if (vaultPath) {
            persistPaneLayoutDebounced(vaultPath, { paneRoot: newRoot, activePaneId });
        }
    }
}));
