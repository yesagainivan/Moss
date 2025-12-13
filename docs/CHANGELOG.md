# Changelog: December 2025

## 2025-12-12 - Font Scaling & Wikilink Refactor

### ✨ New Features

#### Global Font Scaling System
- Added separate UI and Editor font size controls
  - **UI Font Size**: 12-18px (controls sidebars, panels, menus)
  - **Editor Font Size**: 14-24px (controls note content)
- Implemented CSS custom properties for reactive font updates
- Added `useFontScale` hook for dynamic CSS variable management

#### Wikilink Architecture Refactor
- Converted wikilinks from atom nodes to inline decorations
- Follows the same proven pattern as tags
- -67% code reduction (~150 lines → ~50 lines)
- Comprehensive test suite (19 tests, all passing)

### 🐛 Bug Fixes

#### Editor Text Disappearing (CRITICAL)
- **Issue**: Changing font size caused editor text to disappear until switching notes
- **Root Cause**: Font size in `useEditor` dependency array caused editor re-mount
- **Fix**: Removed from dependencies, added dynamic font update via `useEffect`

#### Cursor Positioning Issues
- **Issue**: Clicking in editor didn't position cursor correctly; cursor jumped unexpectedly
- **Root Causes**:
  1. Padding on ProseMirror element created click dead zones
  2. Wikilinks as atom nodes had inconsistent browser behavior
- **Fixes**:
  1. Moved padding from ProseMirror to wrapper div
  2. Refactored wikilinks to use inline decorations
- **Result**: Natural cursor positioning matching VS Code/Word/Obsidian

### 🔧 Technical Improvements

#### Settings Store
- Added `uiFontSize` and `editorFontSize` settings
- Implemented automatic migration from legacy `fontSize` setting
- Backward compatible with existing user settings

#### Editor Component
- Removed editor re-mounting on font size changes
- Added dynamic style updates for smooth transitions
- Improved click handling for wikilink decorations

#### Markdown Parsing  
- Updated wikilink renderer to preserve plain text instead of HTML
- Enables decoration-based styling while maintaining editability

### 📝 Documentation
- Added `docs/FontScaling.md` - Complete font scaling system documentation
- Added `docs/WikilinkArchitecture.md` - Wikilink implementation guide
- Created comprehensive test suite for wikilinks

### 🧪 Testing
- Added `src/__tests__/wikilink.test.ts` - Markdown parsing tests (10 tests)
- Added `src/__tests__/wikilink-highlight.test.ts` - Decoration regex tests (9 tests)
- All tests passing (19/19)

### 📦 Files Changed

**New Files**:
- `src/hooks/useFontScale.ts`
- `src/components/editor/extensions/WikilinkHighlight.ts`
- `src/__tests__/wikilink.test.ts`
- `src/__tests__/wikilink-highlight.test.ts`
- `docs/FontScaling.md`
- `docs/WikilinkArchitecture.md`

**Modified Files**:
- `src/store/useSettingsStore.ts`
- `src/components/editor/Editor.tsx`
- `src/components/settings/SettingsModal.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/lib/markdown.ts`

**Deprecated** (kept for reference):
- `src/components/editor/extensions/Wikilink.ts` - Replaced by WikilinkHighlight

### 🎯 User-Facing Changes

- Two separate font size sliders in Settings → Editor
- Smooth font size transitions without text disappearing
- Natural cursor positioning throughout the editor
- Wikilinks directly editable (change `[[old]]` → `[[new]]` by typing)
- Better overall editing experience matching modern editors

### ⚡ Performance

- Reduced wikilink extension code by 67%
- Eliminated unnecessary editor re-mounts
- Faster font size updates via CSS custom properties
- Simpler decoration-based rendering

### 🔄 Migration

- **Automatic**: Existing `fontSize` setting migrates to `editorFontSize`
- **No breaking changes**: Markdown format unchanged
- **No user action required**: Works immediately on upgrade

---

## Testing Instructions

1. **Font Scaling**:
   - Settings → Editor → Adjust both font sliders
   - Text should update smoothly without disappearing
   
2. **Wikilinks**:
   - Type `[[test link]]` - should highlight immediately
   - Click wikilinks - should navigate correctly
   - Edit wikilink text directly - should work naturally
   
3. **Cursor Positioning**:
   - Click anywhere in editor - cursor at nearest character
   - Click around wikilinks - natural positioning
   - No unexpected jumping or dead zones

Run tests: `npm test -- wikilink`
