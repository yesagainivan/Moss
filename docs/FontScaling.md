# Font Scaling System

## Overview

Moss implements a production-ready global font scaling system with separate controls for UI and editor content, using CSS custom properties for dynamic, reactive updates.

## Features

- **Dual Font Controls**: Separate settings for UI elements and editor content
- **CSS Custom Properties**: Dynamic font size updates without component re-mounting
- **Reactive Updates**: Smooth transitions when changing font sizes
- **Backward Compatible**: Automatic migration from legacy `fontSize` setting

## Settings

### UI Font Size
- **Range**: 12-18px
- **Default**: 14px
- **Controls**: Sidebars, panels, menus, buttons, modals

### Editor Font Size
- **Range**: 14-24px
- **Default**: 16px
- **Controls**: Note content in both rich and source modes

## Architecture

### CSS Custom Properties

The system uses CSS variables defined on `:root`:

```css
:root {
  --font-size-ui: 14px;        /* From settings.uiFontSize */
  --font-size-editor: 16px;    /* From settings.editorFontSize */
  
  /* Derived semantic sizes */
  --font-size-ui-xs: 10.5px;   /* uiFontSize * 0.75 */
  --font-size-ui-sm: 12.25px;  /* uiFontSize * 0.875 */
  --font-size-ui-lg: 15.75px;  /* uiFontSize * 1.125 */
  --font-size-ui-xl: 17.5px;   /* uiFontSize * 1.25 */
}
```

### useFontScale Hook

**Location**: `src/hooks/useFontScale.ts`

Syncs font size settings to CSS custom properties:

```typescript
export const useFontScale = () => {
  const uiFontSize = useSettingsStore(state => state.settings.uiFontSize);
  const editorFontSize = useSettingsStore(state => state.settings.editorFontSize);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--font-size-ui', `${uiFontSize}px`);
    root.style.setProperty('--font-size-editor', `${editorFontSize}px`);
    // ... derived sizes
  }, [uiFontSize, editorFontSize]);
};
```

### Settings Store

**Location**: `src/store/useSettingsStore.ts`

```typescript
export interface EditorSettings {
  uiFontSize: number;      // 12-18px
  editorFontSize: number;  // 14-24px
  // ...
}
```

**Migration**: Automatically converts legacy `fontSize` to `editorFontSize` on first load.

## Implementation Details

### UI Font Scaling

UI elements automatically inherit from the `body` element:

```css
body {
  font-size: var(--font-size-ui);
}
```

All child components inherit this size unless they specify their own `font-size`.

### Editor Font Scaling

The editor uses a dynamic `useEffect` to update font size without re-mounting:

```typescript
useEffect(() => {
  if (editor && editor.view && editor.view.dom) {
    const editorElement = editor.view.dom;
    editorElement.style.fontSize = `${settings.editorFontSize}px`;
    editorElement.style.lineHeight = `${settings.lineHeight}`;
  }
}, [editor, settings.editorFontSize, settings.lineHeight]);
```

**Critical**: `editorFontSize` is NOT in the `useEditor` dependency array to prevent editor re-initialization.

## Bug Fixes

### Text Disappearing Bug (FIXED)

**Problem**: Changing font size caused text to disappear until switching notes.

**Root Cause**: `fontSize` was in `useEditor` dependencies, causing full editor re-mount on change.

**Solution**: 
1. Removed `editorFontSize` from `useEditor` dependencies
2. Added separate `useEffect` to update font size dynamically
3. Editor stays mounted, only styles update

### Cursor Positioning (FIXED)

**Problem**: Padding on ProseMirror element created click dead zones.

**Solution**: Moved padding from ProseMirror element to wrapper div:

```tsx
<!-- Before -->
<div style={containerStyle}>
  <EditorContent className="p-8 pb-32" />
</div>

<!-- After -->
<div style={containerStyle} className="p-8 pb-32">
  <EditorContent />
</div>
```

## User Guide

### Changing Font Sizes

1. Open Settings (Cmd/Ctrl + ,)
2. Navigate to "Editor" tab
3. Adjust sliders:
   - **UI Font Size**: Changes sidebar, panels, menus
   - **Editor Font Size**: Changes note content

Changes apply immediately with smooth transitions.

### Recommended Settings

- **Small screens**: UI 12px, Editor 14px
- **Standard**: UI 14px, Editor 16px (default)
- **Large screens**: UI 16px, Editor 20px
- **Accessibility**: UI 18px, Editor 24px

## Future Enhancements

- Preset size options (Small, Medium, Large)
- Respect system font size preferences
- Per-note font size overrides via frontmatter
- Component-specific size utilities

## Technical Benefits

1. **No Re-mounting**: Smooth updates without losing editor state
2. **Reactive**: Changes apply immediately via CSS custom properties
3. **Separation of Concerns**: UI and editor scale independently
4. **CSS Inheritance**: UI components automatically inherit from body
5. **Accessible**: Users can customize for better readability

## Files

- `src/hooks/useFontScale.ts` - CSS custom property sync
- `src/store/useSettingsStore.ts` - Settings interface and migration
- `src/components/editor/Editor.tsx` - Dynamic editor font updates
- `src/components/settings/SettingsModal.tsx` - UI controls
- `src/App.tsx` - Hook integration
- `src/index.css` - CSS custom properties definition
