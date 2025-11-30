
const sortTree = (nodes) => {
    const sorted = [...nodes].sort((a, b) => {
        if (a.type === b.type) {
            return a.name.localeCompare(b.name);
        }
        return a.type === 'folder' ? -1 : 1;
    });

    return sorted.map(node => {
        if (node.children) {
            return { ...node, children: sortTree(node.children) };
        }
        return node;
    });
};

const insertNode = (nodes, newNode, parentPath) => {
    if (!parentPath) {
        return sortTree([...nodes, newNode]);
    }

    let hasChanges = false;
    const newNodes = nodes.map(node => {
        if (node.path === parentPath && node.type === 'folder') {
            hasChanges = true;
            const children = node.children ? [...node.children, newNode] : [newNode];
            return { ...node, children: sortTree(children) };
        }
        if (node.children) {
            const newChildren = insertNode(node.children, newNode, parentPath);
            if (newChildren !== node.children) {
                hasChanges = true;
                return { ...node, children: newChildren };
            }
        }
        return node;
    });

    return hasChanges ? newNodes : nodes;
};

// Test Case 1: Add to root
const tree1 = [{ path: '/A', type: 'folder', name: 'A' }];
const newFile1 = { path: '/B.md', type: 'file', name: 'B.md' };
const res1 = insertNode(tree1, newFile1, undefined);
console.log('Test 1 (Root):', JSON.stringify(res1, null, 2));

// Test Case 2: Add to folder
const tree2 = [{ path: '/A', type: 'folder', name: 'A', children: [] }];
const newFile2 = { path: '/A/B.md', type: 'file', name: 'B.md' };
const res2 = insertNode(tree2, newFile2, '/A');
console.log('Test 2 (Folder):', JSON.stringify(res2, null, 2));

// Test Case 3: Add to folder with undefined children
const tree3 = [{ path: '/A', type: 'folder', name: 'A' }]; // children undefined
const newFile3 = { path: '/A/B.md', type: 'file', name: 'B.md' };
const res3 = insertNode(tree3, newFile3, '/A');
console.log('Test 3 (Undefined Children):', JSON.stringify(res3, null, 2));

// Test Case 4: Add to subfolder
const tree4 = [{
    path: '/A', type: 'folder', name: 'A',
    children: [{ path: '/A/B', type: 'folder', name: 'B' }]
}];
const newFile4 = { path: '/A/B/C.md', type: 'file', name: 'C.md' };
const res4 = insertNode(tree4, newFile4, '/A/B');
console.log('Test 4 (Subfolder):', JSON.stringify(res4, null, 2));

// Test Case 5: Add to subfolder where parent has undefined children
const tree5 = [{
    path: '/A', type: 'folder', name: 'A',
    children: [{ path: '/A/B', type: 'folder', name: 'B' }] // B has undefined children
}];
const newFile5 = { path: '/A/B/C.md', type: 'file', name: 'C.md' };
const res5 = insertNode(tree5, newFile5, '/A/B');
console.log('Test 5 (Subfolder Undefined Children):', JSON.stringify(res5, null, 2));
