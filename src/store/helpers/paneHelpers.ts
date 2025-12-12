import { PaneNode } from '../../types';

/**
 * Rebuilds the pane index from the tree for O(1) lookups.
 * Call this whenever the pane tree structure changes.
 */
export const updatePaneIndex = (root: PaneNode): Map<string, PaneNode> => {
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

/**
 * Deep clones a pane tree using structuredClone.
 * Replaces the legacy JSON.parse(JSON.stringify()) pattern.
 */
export const clonePaneTree = (node: PaneNode): PaneNode => {
    return structuredClone(node);
};

/**
 * Updates all tabs in the pane tree when a note is moved or renamed.
 * Recursively traverses the tree and updates noteId and history in all tabs.
 * Returns the new root and a boolean indicating if any changes were made.
 */
export const updatePaneTabsForPathChange = (
    paneRoot: PaneNode,
    oldPath: string,
    newPath: string
): { newRoot: PaneNode; changed: boolean } => {
    const newRoot = clonePaneTree(paneRoot);
    let changed = false;

    const traverse = (node: PaneNode) => {
        if (node.type === 'leaf' && node.tabs) {
            const newTabs = node.tabs.map(t => ({
                ...t,
                noteId: t.noteId === oldPath ? newPath : t.noteId,
                history: t.history ? t.history.map(h => h === oldPath ? newPath : h) : [t.noteId === oldPath ? newPath : t.noteId]
            }));

            // Check if tabs actually changed to avoid unnecessary updates
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
    return { newRoot, changed };
};

/**
 * Validates that the pane index is consistent with the pane tree.
 * Checks for:
 * 1. Completeness: All tree nodes are in the index
 * 2. Correctness: All index nodes are in the tree
 * 3. Integrity: No phantom nodes
 */
export const validatePaneIndex = (root: PaneNode, index: Map<string, PaneNode>): boolean => {
    const treeIds = new Set<string>();

    // 1. Collect all IDs from the tree
    const traverse = (node: PaneNode) => {
        treeIds.add(node.id);
        if (node.children) {
            node.children.forEach(traverse);
        }
    };
    traverse(root);

    // 2. Check index has all tree nodes
    for (const id of treeIds) {
        if (!index.has(id)) {
            console.error(`[PaneValidation] Node ${id} from tree is missing in index`);
            return false;
        }
    }

    // 3. Check index doesn't have extra nodes
    for (const id of index.keys()) {
        if (!treeIds.has(id)) {
            console.error(`[PaneValidation] Index has phantom node ${id} which is not in tree`);
            return false;
        }
    }

    return true;
};
