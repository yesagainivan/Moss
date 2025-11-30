
const sortFileNodes = (nodes) => {
    return [...nodes].sort((a, b) => {
        const partsA = a.path.split('/').filter(p => p);
        const partsB = b.path.split('/').filter(p => p);
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

const nodes = [
    { path: '/A/file.md', type: 'file', name: 'file.md' },
    { path: '/A', type: 'folder', name: 'A' },
    { path: '/A/Sub', type: 'folder', name: 'Sub' },
    { path: '/A/Sub/file2.md', type: 'file', name: 'file2.md' },
    { path: '/B.md', type: 'file', name: 'B.md' },
    { path: '/C', type: 'folder', name: 'C' }
];

const sorted = sortFileNodes(nodes);
console.log(JSON.stringify(sorted, null, 2));
