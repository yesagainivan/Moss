# Wikilink Architecture

## Overview

Wikilinks in Moss use inline decorations to style regular text, not custom node types. This follows the same proven pattern as tags and provides natural cursor behavior.

## Syntax

```markdown
[[SimpleNote]]                 # Basic wikilink
[[Note|Custom Label]]          # Wikilink with display label
[[Note#Section]]               # Wikilink to heading
[[#Fragment]]                  # Same-note heading link
[[Note#Section|Label]]         # Combined: note + section + label
```

## Architecture

### Decorations, Not Nodes

**Key Insight**: Wikilinks are **styled text**, not special nodes.

```
Document:    "Check [[MyNote]] here"  (plain text)
             ↓
Decorations: <span class="wikilink" data-target="MyNote">[[MyNote]]</span>
             ↓
Result:      Styled, clickable text that's directly editable
```

### Comparison: Old vs New

| Aspect | Old (Atom Nodes) | New (Decorations) |
|--------|------------------|-------------------|
| Implementation | Custom node type | Inline decoration |
| Lines of code | ~150 | ~50 |
| Cursor behavior | ❌ Problematic | ✅ Natural |
| Editability | Special handling | ✅ Directly editable |
| Browser consistency | ❌ Chrome issues | ✅ Consistent |
| Complexity | High | Low |

## Implementation

### WikilinkHighlight Extension

**Location**: `src/components/editor/extensions/WikilinkHighlight.ts`

Uses a ProseMirror plugin to scan text nodes and apply decorations:

```typescript
export const WikilinkHighlight = Extension.create({
  name: 'wikilinkHighlight',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            
            doc.descendants((node, pos) => {
              if (!node.isText) return;
              
              // Match [[target|label]] or [[target]] or [[#fragment]]
              const regex = /\[\[([^\]|#]+)?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
              
              while ((match = regex.exec(text)) !== null) {
                decorations.push(
                  Decoration.inline(start, end, {
                    class: 'wikilink',
                    'data-target': match[1],
                    'data-fragment': match[2],
                    'data-label': match[3],
                  })
                );
              }
            });
            
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
```

### Markdown Rendering

**Location**: `src/lib/markdown.ts`

The markdown renderer preserves wikilinks as plain text instead of converting to HTML:

```typescript
renderer(token: any) {
  // Return original wikilink syntax as plain text
  const fullTarget = fragment 
    ? (target ? `${target}#${fragment}` : `#${fragment}`) 
    : target;
  return label ? `[[${fullTarget}|${label}]]` : `[[${fullTarget}]]`;
}
```

**Why**: Decorations need plain text to style. Converting to HTML breaks the pattern.

### Click Handling

**Location**: `src/components/editor/Editor.tsx`

```typescript
handleClick: (_view, _pos, event) => {
  const target = event.target as HTMLElement;
  
  if (target.closest('.wikilink')) {
    event.preventDefault();
    const wikilink = target.closest('.wikilink') as HTMLElement;
    const noteTarget = wikilink.getAttribute('data-target') || '';
    const fragment = wikilink.getAttribute('data-fragment') || '';
    const isCmdClick = event.metaKey || event.ctrlKey;
    
    handleWikilinkClick(noteTarget, fragment, isCmdClick);
    return true;
  }
}
```

## Benefits

### Perfect Cursor Behavior

- ✅ Click anywhere around wikilinks → cursor at nearest character
- ✅ No jumping or unexpected positioning
- ✅ Consistent with VS Code, Word, Obsidian
- ✅ Browser-independent behavior

### Direct Editability

Users can edit wikilink text naturally:

```
Type: [[MyNote]]
↓
Edit: Change "MyNote" to "OtherNote"
↓
Result: [[OtherNote]]
```

No need to delete and re-type the entire wikilink!

### Simpler Code

- **67% less code** than atom node implementation
- No NodeView complexity
- No storage management
- No workarounds needed

## Pattern: Tags vs Wikilinks

Both tags and wikilinks use the same decoration pattern:

| Feature | Tags (#tag) | Wikilinks ([[link]]) |
|---------|-------------|----------------------|
| Extension | TagHighlight | WikilinkHighlight |
| Type | Decoration | Decoration |
| Lines of code | ~40 | ~50 |
| Cursor behavior | ✅ Perfect | ✅ Perfect |
| Directly editable | ✅ Yes | ✅ Yes |

**Lesson**: If tags work perfectly with decorations, wikilinks should too!

## Styling

**Location**: `src/index.css`

```css
.wikilink {
  @apply text-accent cursor-pointer hover:underline font-medium rounded;
  background-color: color-mix(in srgb, var(--accent), transparent 92%);
  display: inline;
  vertical-align: baseline;
}
```

**Note**: Uses `margin` not `padding` to avoid click dead zones.

## Testing

Comprehensive test suite ensures correctness:

**Test Files**:
- `src/__tests__/wikilink.test.ts` - Markdown parsing (10 tests)
- `src/__tests__/wikilink-highlight.test.ts` - Decoration regex (9 tests)

**Test Coverage**:
- ✅ All wikilink formats parse correctly
- ✅ Tokenization and rendering round-trip
- ✅ Regex matches all valid patterns
- ✅ Position extraction for decorations
- ✅ Invalid syntax rejected

Run tests: `npm test -- wikilink`

## Migration

**No breaking changes!**
- ✅ Markdown format unchanged
- ✅ Existing notes work as-is
- ✅ No data migration needed
- ✅ Backend parsing unchanged

## Troubleshooting

### Wikilinks Not Highlighting

Check that `WikilinkHighlight` is in the editor extensions list:

```typescript
extensions: [
  WikilinkHighlight,  // Should be present
  // ...
]
```

### Clicks Not Working

Verify the click handler is registered in `editorProps.handleClick`.

### Markdown Not Preserving Wikilinks

Check `wikilinkMarkedExtension.renderer` returns plain text, not HTML.

## Future Enhancements

- Autocomplete for wikilinks
- Broken link detection
- Backlink previews on hover
- Alias suggestions

## Files

- `src/components/editor/extensions/WikilinkHighlight.ts` - Decoration extension
- `src/lib/markdown.ts` - Markdown parsing
- `src/components/editor/Editor.tsx` - Click handling
- `src/__tests__/wikilink*.test.ts` - Test suite
- `src/index.css` - Styling

## References

- [ProseMirror Decorations](https://prosemirror.net/docs/guide/#decorations)
- [Inline Decorations Best Practices](https://discuss.prosemirror.net/)
- Tags implementation: `src/components/editor/extensions/TagHighlight.ts`
