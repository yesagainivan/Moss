# Implement Tab/Shift-Tab Shortcuts

## Goal Description
Add keyboard shortcuts to the Tiptap editor so that pressing **Tab** indents a list item and **Shift+Tab** outdents it in the WYSIWYG editor. In source (markdown) mode, pressing **Tab** should insert two spaces at the cursor position. This enhances the editing experience by providing standard indentation behavior.

## User Review Required
- Confirm that inserting two spaces for Tab in source mode is acceptable (instead of a literal tab character). If a different number of spaces or a tab character is preferred, let me know.
- Confirm that using Tiptap's `sinkListItem` and `liftListItem` commands for list indentation is the desired approach.

## Proposed Changes
---
### Editor Component
#### [MODIFY] src/components/editor/Editor.tsx
- Update `handleKeyDown` in `editorProps` to handle `Tab` and `Shift+Tab`:
  - Prevent default behavior.
  - If `event.shiftKey` is true, call `editor.chain().liftListItem('listItem').run()` to outdent.
  - Otherwise, call `editor.chain().sinkListItem('listItem').run()` to indent.
- Ensure the existing save and AI shortcut logic remains unchanged.

#### [MODIFY] src/components/editor/Editor.tsx
- Update `handleSourceKeyDown` to handle `Tab` (without Shift) in source mode:
  - Prevent default.
  - Insert two spaces at the current cursor position in the textarea.
  - Update `sourceContent`, store, and debounce save.
  - Move cursor after inserted spaces.

---
## Verification Plan
### Automated Tests
- No existing unit tests cover keyboard shortcuts. I will add a new test using `@testing-library/react` to render the `Editor` component in both modes and simulate `Tab` key events.
  1. Render `Editor` with a simple list (`- Item 1`).
  2. Focus the editor, place cursor at the start of the list item, fire a `Tab` keydown event.
  3. Verify that the markdown now contains an indented list (`  - Item 1`).
  4. Fire a `Shift+Tab` keydown event and verify the list is outdented back.
- For source mode, render the textarea, simulate a `Tab` keydown, and verify two spaces are inserted.

### Manual Verification
- Open the app, create a list item, press Tab to indent, and Shift+Tab to outdent. Ensure the visual indentation matches expectations.
- In source mode, press Tab and confirm two spaces are added at the cursor.

**Commands to run tests**:
```bash
npm run test -- src/components/editor/Editor.test.tsx
```

Please review the plan and let me know if any adjustments are needed before I proceed to implementation.
