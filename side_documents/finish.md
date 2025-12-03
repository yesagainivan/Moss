Performance Audit Report
Date: December 3, 2025
Scope: Editor components, Zustand store, component optimizations, and rendering patterns

Executive Summary
Overall Assessment: ✅ EXCELLENT - The codebase demonstrates strong performance engineering practices.

Your application has many sophisticated optimizations already in place. The architecture shows careful consideration for performance, with debouncing, memoization, LRU caching, virtualization, and selective subscriptions implemented throughout.

Key Strengths
✅ Debounced updates preventing excessive rendering
✅ LRU cache for markdown parsing
✅ O(1) pane lookups via index
✅ Virtualized sidebar rendering (Virtuoso)
✅ Selective Zustand subscriptions
✅ React.memo on critical components
✅ Proper cleanup of event listeners
Improvement Opportunities
🟡 Some components re-subscribe on every state change
🟡 TabBar re-renders on any pane change
🟢 Potential for more aggressive memoization
Detailed Findings
1. ✅ Editor Component (
Editor.tsx
)
Performance Rating: ⭐⭐⭐⭐⭐ Excellent

Optimizations in Place
Debounced Updates:

// Line 152-157: 300ms debounce prevents heavy markdown serialization
const debouncedUpdate = useMemo(() => debounce((editor: any, noteId: string) => {
    const markdown = editor.getMarkdown();
    updateNote(noteId, markdown);
    debouncedSaveNote(noteId, markdown);
}, 300), [updateNote, debouncedSaveNote]);
✅ Good Practice: Prevents expensive markdown serialization on every keystroke.

LRU Cache for Markdown:

// Lines 35-37: Cache with 100-item capacity
const markdownCache = new LRUCache<string, string>(100);
// Lines 125-130: Check cache before parsing
const cached = markdownCache.get(initialContent);
if (cached !== undefined) {
    if (isMounted) setInitialHtml(cached);
    return;
}
✅ Good Practice: Speeds up note switching significantly, prevents unbounded memory growth.

Scroll Position Debouncing:

// Lines 160-164: 100ms debounce for scroll tracking
const handleScroll = useMemo(() => debounce((e: React.UIEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement) {
        setScrollPosition(noteId, e.target.scrollTop);
    }
}, 100), [noteId, setScrollPosition]);
✅ Good Practice: Prevents excessive store updates during scrolling.

Selective Store Subscriptions:

// Lines 42-54: Individual selectors for specific slices
const updateNote = useAppStore(state => state.updateNote);
const setTabDirty = useAppStore(state => state.setTabDirty);
const editorTab = useAppStore(state => {
    if (!paneId) return undefined;
    const pane = state.findPaneById(paneId);
    return pane?.tabs?.find(t => t.noteId === noteId);
});
✅ Good Practice: Only re-renders when specific state slices change.

Areas for Improvement
🟢 Minor - Event Listener Cleanup:

// Lines 709-787: AI stream listeners
const setupListeners = async () => {
    const unlistenChunk = await listen('ai-stream-chunk', ...);
    // ...
};
✅ Already Good: Cleanup is properly implemented with the unlistenFunctions array.

2. ✅ Store (
useStore.ts
)
Performance Rating: ⭐⭐⭐⭐⭐ Excellent

Optimizations in Place
O(1) Pane Lookups:

// Lines 40-54: Pane index for instant lookups
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
✅ Good Practice: Eliminates O(n) tree traversals for pane operations.

Debounced Persistence:

// Lines 17-20: 300ms debounce for pane layout saves
const persistPaneLayoutDebounced = debounce(async (vaultPath: string, layout: ...) => {
    if (!vaultPath) return;
    await savePaneLayout(vaultPath, layout);
}, 300);
✅ Good Practice: Prevents excessive file system writes.

File Tree Sorting Helper:

// Lines 60-87: Efficient sorting with folders-first logic
const sortFileNodes = (nodes: FileNode[]): FileNode[] => {
    return [...nodes].sort((a, b) => {
        // Folders first, then alphabetical
    });
};
✅ Good Practice: Centralized, efficient sorting algorithm.

Areas for Improvement
🟡 Medium - fileTree.map in renameNote:

// Line 614: Maps entire file tree on every rename
fileTree: state.fileTree.map(node =>
    node.noteId === id ? { ...node, name: title } : node
)
Issue: Creates new array and objects even if no match found.

Recommendation: Use the 
updateNode
 helper instead:

fileTree: updateNode(state.fileTree, id, { name: title })
3. 🟡 TabBar Component (
TabBar.tsx
)
Performance Rating: ⭐⭐⭐⭐ Good (Room for minor improvement)

Current Implementation
// Lines 7-13: Multiple subscriptions
const paneRoot = useAppStore(state => state.paneRoot);
const activePaneId = useAppStore(state => state.activePaneId);
const findPaneById = useAppStore(state => state.findPaneById);
const activePane = activePaneId ? findPaneById(activePaneId, paneRoot) : null;
const tabs = (activePane?.type === 'leaf' ? activePane.tabs : null) || [];
Issue: Re-renders whenever paneRoot changes, even if the active pane's tabs haven't changed.

Recommendation
Option 1 - Use paneIndex:

const activePaneId = useAppStore(state => state.activePaneId);
const paneIndex = useAppStore(state => state.paneIndex);
const activePane = useMemo(() => 
    paneIndex.get(activePaneId || ''),
    [paneIndex, activePaneId]
);
const tabs = activePane?.tabs || [];
Option 2 - Single Selector (Best):

const { tabs, activeTabId } = useAppStore(state => {
    const activePane = state.paneIndex.get(state.activePaneId || '');
    return {
        tabs: activePane?.tabs || [],
        activeTabId: activePane?.activeTabId || null
    };
});
Impact: Reduces re-renders when inactive panes change.

4. ✅ Sidebar Component (
Sidebar.tsx
)
Performance Rating: ⭐⭐⭐⭐⭐ Excellent

Optimizations in Place
Virtualization with Virtuoso:

// Lines 704-722: Only renders visible items
<Virtuoso
    ref={virtuosoRef}
    data={finalData}
    computeItemKey={(_index, item) => item.id}
    itemContent={(_index, item) => (
        <FileTreeRow ... />
    )}
/>
✅ Good Practice: Critical for large vaults with thousands of files.

Flattening Logic with useMemo:

// Lines 394-496: Memoized flat tree calculation
const flatData = useMemo(() => {
    // Complex flattening and filtering logic
    return result;
}, [fileTree, expandedPaths, creatingState, vaultPath]);
✅ Good Practice: Prevents recalculation on every render.

Selective Subscriptions in FileTreeRow:

// Lines 101-109: Per-row selective subscriptions
const isActiveNote = useAppStore(state => {
    if (!node.noteId) return false;
    const activePaneId = state.activePaneId;
    const activePane = state.paneIndex.get(activePaneId || '');
    const activeTab = activePane?.tabs?.find(t => t.id === activePane.activeTabId);
    return activeTab?.noteId === node.noteId;
});
✅ Good Practice: Each row only re-renders when its specific state changes.

Areas for Improvement
✅ Already Optimized: No significant performance concerns found.

5. ✅ PaneView & ResizableSplit
Performance Rating: ⭐⭐⭐⭐⭐ Excellent

React.memo Applied:

export const PaneView = React.memo(({ paneId, isActive }: PaneViewProps) => {
    // ...
});
export const ResizableSplit: React.FC<ResizableSplitProps> = React.memo(({
    // ...
}));
✅ Good Practice: Prevents unnecessary re-renders in split pane layouts.

Selective Subscription in PaneView:

// Lines 16-21: useCallback for stable selector
const pane = useAppStore(
    useCallback(
        state => state.findPaneById(paneId),
        [paneId]
    )
);
✅ Good Practice: Only re-renders when the specific pane changes.

Performance Recommendations
🟢 Priority: LOW (Optional Polish)
1. Optimize TabBar Re-renders
Current Behavior: Re-renders on any pane change
Impact: Minor - only affects tab bar, not editors
Effort: 10 minutes

Solution:

// TabBar.tsx
export const TabBar = () => {
    const { tabs, activeTabId } = useAppStore(state => {
        const activePane = state.paneIndex.get(state.activePaneId || '');
        return {
            tabs: activePane?.tabs || [],
            activeTabId: activePane?.activeTabId || null
        };
    });
    
    const setActiveTab = useAppStore(state => state.setActiveTab);
    const closeTab = useAppStore(state => state.closeTab);
    
    // ... rest of component
};
2. Use updateNode Helper in Store
Current: fileTree.map() creates new arrays unnecessarily
Impact: Minor - only on rename operations
Effort: 5 minutes

Solution:

// useStore.ts line 614
// Instead of:
fileTree: state.fileTree.map(node =>
    node.noteId === id ? { ...node, name: title } : node
)
// Use:
fileTree: updateNode(state.fileTree, id, { name: title })
3. Add Shallow Equality Checks to Critical Selectors
For frequently-accessed selectors that return objects:

import { shallow } from 'zustand/shallow';
const { tabs, activeTabId } = useAppStore(state => ({
    tabs: state.getActivePaneTabs(),
    activeTabId: state.getActivePane()?.activeTabId || null
}), shallow);
Impact: Prevents re-renders when object reference changes but content is the same.

Monitoring Recommendations
Add Performance Instrumentation (Optional)
1. Re-render Counter for Development:

// Add to critical components during debugging
import { useEffect, useRef } from 'react';
const useRenderCount = (componentName: string) => {
    const renderCount = useRef(0);
    useEffect(() => {
        renderCount.current += 1;
        console.log(`${componentName} rendered ${renderCount.current} times`);
    });
};
// Usage in TabBar:
useRenderCount('TabBar');
2. Performance Marks for Critical Operations:

// Editor.tsx - Track markdown parsing time
performance.mark('markdown-parse-start');
const html = await parseMarkdown(content);
performance.mark('markdown-parse-end');
performance.measure('markdown-parse', 'markdown-parse-start', 'markdown-parse-end');
Benchmark Results
Based on code analysis, here are expected performance characteristics:

Operation	Complexity	Performance
Pane lookup	O(1)	⚡ Instant via index
Open note	O(n) tabs	✅ Fast, debounced save
Typing in editor	Debounced	✅ Smooth, 300ms delay
Scroll sidebar	Virtualized	⚡ Only renders ~20 items
Switch tabs	O(1) + parse	✅ Fast with LRU cache
File tree refresh	O(n log n)	✅ Incremental updates
Split pane	O(n) traverse	✅ Memoized components
Conclusion
Summary
Your application demonstrates excellent performance engineering practices. The combination of:

Debouncing for expensive operations
LRU caching for repeated work
Virtualization for large lists
Selective subscriptions
React.memo and useMemo
O(1) data structures
...means the app should feel snappy even with large vaults and complex split pane layouts.

Production Readiness
✅ READY - No critical performance blockers identified.

Recommended Next Steps
✅ Ship as-is - Current performance is excellent
🟢 (Optional) Apply TabBar optimization for marginal improvement
🟢 (Optional) Add performance monitoring in development mode
📊 (Future) Monitor real-world usage metrics to identify actual bottlenecks
Related Files
Editor.tsx
 - Excellent optimizations
useStore.ts
 - Strong pane index architecture
Sidebar.tsx
 - Great virtualization
TabBar.tsx
 - Minor optimization opportunity
PaneView.tsx
 - Well-memoized
ResizableSplit.tsx
 - Recently fixed remounting issue