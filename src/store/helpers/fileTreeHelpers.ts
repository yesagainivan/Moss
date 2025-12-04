import { FileNode } from '../../types';

export const sortFileNodes = (nodes: FileNode[]): FileNode[] => {
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

export const insertNode = (nodes: FileNode[], newNode: FileNode, _parentPath?: string): FileNode[] => {
    // Flat list insertion: just add and sort
    // We ignore parentPath because the path is already in newNode.path
    return sortFileNodes([...nodes, newNode]);
};

export const removeNode = (nodes: FileNode[], path: string): FileNode[] => {
    return nodes.filter(node => node.path !== path && !node.path?.startsWith(path + '/'));
};

export const updateNode = (nodes: FileNode[], path: string, updates: Partial<FileNode>): FileNode[] => {
    return nodes.map(node => {
        if (node.path === path) {
            return { ...node, ...updates };
        }
        return node;
    });
};
