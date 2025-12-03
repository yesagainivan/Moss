# Split Pane Implementation - Issues Analysis

**Date:** December 2, 2025  
**Status:** Post-Phase 3.1 Implementation

## Executive Summary

The split pane implementation has made significant progress through Phase 3.1, with major performance optimizations completed. However, there are still **critical architectural issues** that need to be addressed before the feature can be considered production-ready.

### Priority Classification
- 🔴 **Critical** - Must fix now (production blockers)
- 🟡 **High** - Should fix soon (technical debt, potential bugs)
- 🟢 **Medium** - Nice to have (polish, DX improvements)

---

## 🔴 CRITICAL ISSUES

### 1. Double Tracking of Tabs (Dual State Management)

**Severity:** Critical  
**Impact:** Data inconsistency, memory overhead, potential state corruption  
**Status:** Known issue from previous analysis, NOT YET RESOLVED

#### Problem
Tabs are currently stored in **TWO separate locations**:
1. **Global state**: `tabs: Tab[]` and `activeTabId: string | null` in AppState
2. **Pane-specific state**: `tabs: Tab[]` in each leaf `PaneNode`

#### Evidence in Code

```typescript:src/store/useStore.ts
// Lines 869-877: openNote creates tab in BOTH places
addTabToPane(targetPane.id, newTabObj);

// Update global state for backward compatibility
set((state) => {
    const newTabs = [...state.tabs, newTabObj];
    persistTabsDebounced(newTabs, newTabObj.id);
    return {
        tabs: newTabs,  // ❌ Global tabs
        activeTabId: newTabObj.id
    };
});
```

```typescript:src/store/useStore.ts
// Lines 1039-1071: setTabDirty updates BOTH places
set((state) => {
    const newTabs = state.tabs.map(t =>
        t.id === tabId ? { ...t, isDirty, isPreview: isDirty ? false : t.isPreview } : t
    );
    persistTabsDebounced(newTabs, state.activeTabId);
    return { tabs: newTabs, dirtyNoteIds: newDirtyIds };
});

// CRITICAL: Also update the tab in the specific pane
const pane = state.findPaneByTabId(tabId);
if (pane) {
    state.updateTabInPane(pane.id, tabId, {
        isDirty,
        isPreview: isDirty ? false : undefined
    });
}
```

#### Consequences
- **Memory overhead**: Every tab stored twice
- **Sync complexity**: Every operation must update both states
- **Bug risk**: High chance of state divergence
- **Performance**: Redundant operations on every tab change
- **Code smell**: Comments like "for backward compatibility" indicate technical debt

#### Affected Operations
All of these operations maintain dual state:
- `openNote` (line 804-909)
- `closeTab` (line 973-995)
- `setActiveTab` (line 1017-1037)
- `setTabDirty` (line 1039-1072)
- `navigateBack` (line 911-934)
- `navigateForward` (line 936-959)

#### Recommendation
**Complete Phase 3.2 migration IMMEDIATELY**. This is the highest priority issue blocking production readiness.

**Migration Steps:**
1. Audit all components using global `tabs` state
2. Migrate to pane-based tab access via `getActivePane().tabs`
3. Remove global `tabs` and `activeTabId` from AppState
4. Remove all "backward compatibility" code blocks
5. Delete `persistTabsDebounced` (replaced by pane persistence)

**Estimated Effort:** 4-6 hours  
**Risk:** Medium (requires careful component updates)

---

### 2. Source Mode Fixed Width Issue

**Severity:** Critical  
**Impact:** Poor user experience, breaks editor usability in source mode  
**Status:** NEW - Discovered during analysis

#### Problem
When toggling to source mode (Cmd+T), the textarea has a fixed width constraint that doesn't match the preview mode behavior.

#### Root Cause

```tsx:src/components/editor/Editor.tsx
// Lines 925-941: Container div has maxWidth constraint
<div
    ref={containerRef}
    onScroll={handleScroll}
    className="h-full overflow-y-auto bg-background select-text"
    style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
        cursor: 'text',
        ...(settings.enableMaxWidth && {
            maxWidth: `${settings.maxWidth}px`,  // ❌ Applied to container
            margin: '0 auto',
        }),
    }}
>
```

```tsx:src/components/editor/Editor.tsx
// Lines 942-950: Textarea inherits container constraints
{isSourceMode ? (
    <textarea
        ref={textareaRef}
        value={sourceContent}
        onChange={handleSourceChange}
        onKeyDown={handleSourceKeyDown}
        className="w-full h-full p-8 pb-32 bg-transparent resize-none focus:outline-none font-mono"
        spellCheck={settings.spellCheck}
    />
```

The `maxWidth` style is applied to the container div, which then constrains the textarea. The textarea has `className="w-full"` which means it should fill the container, but the container itself is constrained.

#### Expected Behavior
- Source mode should respect the same width settings as preview mode
- If `enableMaxWidth` is true, both modes should have the same max width
- If `enableMaxWidth` is false, both modes should fill available space

#### Current Behavior
- Preview mode: Works correctly (EditorContent respects prose max-width)
- Source mode: Constrained by container maxWidth, feels "stuck"

#### Recommendation

**Option A: Apply maxWidth only to EditorContent (Recommended)**
```tsx
<div
    ref={containerRef}
    onScroll={handleScroll}
    className="h-full overflow-y-auto bg-background select-text"
    style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
        cursor: 'text',
    }}
>
    {isSourceMode ? (
        <textarea
            ref={textareaRef}
            value={sourceContent}
            onChange={handleSourceChange}
            onKeyDown={handleSourceKeyDown}
            className="w-full h-full p-8 pb-32 bg-transparent resize-none focus:outline-none font-mono"
            style={{
                ...(settings.enableMaxWidth && {
                    maxWidth: `${settings.maxWidth}px`,
                    margin: '0 auto',
                }),
            }}
            spellCheck={settings.spellCheck}
        />
    ) : (
        <EditorContent
            editor={editor}
            className="h-full"
            style={{
                ...(settings.enableMaxWidth && {
                    maxWidth: `${settings.maxWidth}px`,
                    margin: '0 auto',
                }),
            }}
            spellCheck={settings.spellCheck}
            onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't') {
                    e.preventDefault();
                    toggleSourceMode();
                }
            }}
        />
    )}
</div>
```

**Estimated Effort:** 15 minutes  
**Risk:** Low (isolated styling change)

---

## 🟡 HIGH PRIORITY ISSUES

### 3. Incomplete localStorage Persistence for Split Panes

**Severity:** High  
**Impact:** User loses pane layout and tab organization on reload  
**Status:** Partially implemented

#### Problem
While `paneRoot` is persisted via `persistPaneRootDebounced`, the current implementation may not correctly restore split pane layouts with all their tabs.

#### Current Implementation
```typescript:src/store/useStore.ts
// Lines 330-365: Pane restoration logic
if (savedPaneRootJson) {
    try {
        paneRoot = JSON.parse(savedPaneRootJson);
        if (savedActivePaneId) {
            activePaneId = savedActivePaneId;
        }

        // Migration: If pane root is a leaf and doesn't have tabs...
        if (paneRoot.type === 'leaf' && (!paneRoot.tabs || paneRoot.tabs.length === 0) && restoredTabs.length > 0) {
            paneRoot = {
                ...paneRoot,
                tabs: restoredTabs,
                activeTabId: savedActiveTabId || (restoredTabs.length > 0 ? restoredTabs[0].id : null)
            };
        }
    }
}
```

#### Issues
1. **Migration logic only handles single leaf pane**: If user has split panes saved, the migration doesn't distribute tabs correctly
2. **Global tabs still used for persistence**: `savedTabsJson` and `savedActiveTabId` conflict with pane-based persistence
3. **No validation**: Doesn't check if restored pane structure is valid

#### Recommendation
1. **Short-term**: Add validation and logging to restoration
2. **Long-term**: Complete dual state removal (Issue #1) to eliminate confusion

**Estimated Effort:** 2-3 hours  
**Risk:** Medium (affects user experience on app restart)

---

### 4. Missing Pane Index Initialization Check

**Severity:** High  
**Impact:** Potential crashes or incorrect behavior during startup  
**Status:** NEW

#### Problem
The pane index is initialized as an empty Map in the initial state, but not all code paths properly rebuild it.

```typescript:src/store/useStore.ts
// Lines 267-272: Initial state has partial index
paneIndex: new Map([['root', {
    id: 'root',
    type: 'leaf',
    tabs: [],
    activeTabId: null
}]]),
```

#### Issue
If the index gets out of sync with the tree (e.g., during error recovery), operations will fail silently.

#### Recommendation
Add a validation helper:
```typescript
const validatePaneIndex = (root: PaneNode, index: Map<string, PaneNode>): boolean => {
    const treeIds = new Set<string>();
    const traverse = (node: PaneNode) => {
        treeIds.add(node.id);
        if (node.type === 'split' && node.children) {
            traverse(node.children[0]);
            traverse(node.children[1]);
        }
    };
    traverse(root);
    
    // Check index has all tree nodes
    for (const id of treeIds) {
        if (!index.has(id)) return false;
    }
    
    // Check index doesn't have extra nodes
    for (const id of index.keys()) {
        if (!treeIds.has(id)) return false;
    }
    
    return true;
};
```

Use during development and in error recovery paths.

**Estimated Effort:** 1 hour  
**Risk:** Low (defensive programming)

---

## 🟢 MEDIUM PRIORITY ISSUES

### 5. TabBar Only Shows Active Pane Tabs

**Severity:** Medium  
**Impact:** Confusing UX in split view - users can't see tabs from inactive panes  
**Status:** By design, but worth reconsidering

#### Current Behavior
```typescript:src/components/tabs/TabBar.tsx
// Lines 11-13: Only shows active pane's tabs
const activePane = activePaneId ? findPaneById(activePaneId, paneRoot) : null;
const tabs = (activePane?.type === 'leaf' ? activePane.tabs : null) || [];
const activeTabId = activePane?.type === 'leaf' ? activePane.activeTabId : null;
```

When you have 2 split panes:
- Pane A (active): Shows tabs [Note1, Note2]
- Pane B (inactive): Tabs [Note3, Note4] are hidden

This is technically correct for a pane-based system, but users might expect to see ALL tabs.

#### Recommendation
**Phase 1 (Current):** Keep as-is, document in UI  
**Phase 2 (Future):** Consider showing both panes' tabs with visual separation:
```
| Pane 1: Note1* | Note2 | Pane 2: Note3* |
```

---

### 6. No Visual Indicator for Active Pane

**Severity:** Medium  
**Impact:** Hard to tell which pane is active when typing  
**Status:** Partially addressed

#### Current Implementation
```typescript:src/components/layout/PaneView.tsx
// Lines 43-46: Border on active pane
<div
    className={`flex-1 flex flex-col h-full overflow-hidden relative ${isActive ? 'border border-accent' : ''}`}
    onClick={handleClick}
>
```

A border is shown, but it might not be prominent enough.

#### Recommendation
Consider more prominent visual indicators:
- Subtle background tint
- Animated glow effect
- Title bar color change

**Estimated Effort:** 1 hour  
**Risk:** Very low (pure styling)

---

### 7. No Keyboard Shortcuts for Pane Management

**Severity:** Medium  
**Impact:** Poor power user experience  
**Status:** Partially implemented

#### Current State
From `useGlobalShortcuts.ts`:
- ✅ Cmd+1, Cmd+2: Focus pane 1 or 2
- ❌ No shortcut to split current pane
- ❌ No shortcut to close current pane (Cmd+W closes tab, not pane)

#### Recommendation
Add shortcuts:
- `Cmd+Shift+\`: Split vertically
- `Cmd+Shift+-`: Split horizontally
- `Cmd+Shift+W`: Close current pane

**Estimated Effort:** 30 minutes  
**Risk:** Low

---

## Performance Characteristics (Post-Phase 3.1)

### ✅ OPTIMIZED
- Pane lookups: O(n) → O(1) via index
- Component re-renders: Minimized with React.memo and useCallback
- localStorage writes: Debounced (300ms)
- PaneView: Only re-renders when its data changes

### ⚠️ STILL SLOW
- Tab operations: O(n) per pane due to dual state updates
- `saveNote`: O(n) across all panes to update dirty flags
- Tab persistence: Still uses global tabs array

### 🎯 TARGET AFTER FIXES
All operations should be O(1) or O(n) where n = number of tabs in active pane (not total panes)

---

## Testing Recommendations

### Critical Path Testing
1. **Dual State Sync**
   - Open note in pane A
   - Split to pane B
   - Edit note in pane A
   - Check if dirty state syncs correctly to both global and pane state
   - Close tab from pane B
   - Verify tab is removed from both states

2. **Source Mode Width**
   - Enable max width in settings (e.g., 800px)
   - Open note in preview mode
   - Toggle to source mode (Cmd+T)
   - Verify width is consistent

3. **Pane Persistence**
   - Create 2-3 split panes with different tabs
   - Close app
   - Reopen app
   - Verify all panes and tabs restored correctly

### Performance Testing
```javascript
// In browser console during rapid typing
performance.mark('edit-start');
// Type 50 characters rapidly
performance.mark('edit-end');
performance.measure('edit', 'edit-start', 'edit-end');
console.log(performance.getEntriesByName('edit'));
```

Should be < 16ms per keystroke for 60fps.

---

## Migration Path Forward

### Immediate Actions (This Week)
1. ✅ Fix source mode width issue (#2) - 15 min
2. ⚠️ **START Phase 3.2: Dual state removal (#1)** - 4-6 hours
3. ✅ Add pane index validation (#4) - 1 hour

### Short Term (Next Sprint)
4. ⚠️ Fix localStorage persistence (#3) - 2-3 hours
5. ✅ Add visual indicators (#6) - 1 hour
6. ✅ Add keyboard shortcuts (#7) - 30 min

### Long Term (Future)
7. 🔄 Consider multi-pane tab bar (#5) - Design + implementation
8. 🧪 Add comprehensive test suite
9. 📊 Add performance monitoring/telemetry

---

## Conclusion

The split pane implementation has made **excellent progress** through Phase 3.1, with major performance optimizations in place. However, the **dual state management issue (#1)** is a **production blocker** that must be resolved before this feature can ship.

**Recommended Next Steps:**
1. Fix source mode width (quick win)
2. Complete Phase 3.2 to eliminate dual state
3. Validate persistence and recovery paths
4. User testing with split panes

**Estimated Time to Production-Ready:** 8-12 hours of focused work

---

## References
- Previous analysis: `side_documents/SPLIT_PANE_prev.md`
- Phase 3.1 completion: Lines 574-710 in SPLIT_PANE_prev.md
- Dual state issue: Lines 149-175 in SPLIT_PANE_prev.md
