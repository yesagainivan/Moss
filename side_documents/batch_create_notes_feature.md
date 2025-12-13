# Batch Create Notes Feature 🚀

## Overview

The `batch_create_notes` tool enables Mosaic (the AI agent) to create multiple notes in a single operation, dramatically improving efficiency when building structured vaults or creating multiple related notes.

## Implementation Details

### Backend (Rust)

**File**: `src-tauri/src/tools.rs`

New types:
- `NoteToCreate`: Input structure for each note (filename + content)
- `BatchCreateResult`: Response structure with success/failed arrays
- `BatchCreateError`: Error details for failed notes

**Command**: `agent_batch_create_notes`
- Accepts an array of notes to create
- Returns detailed success/failure information
- Automatically handles `.md` extension
- Creates parent directories as needed
- Continues processing even if some notes fail

### Frontend (TypeScript)

**File**: `src/lib/agent/tools.ts`

**Tool Definition**:
```typescript
{
    name: 'batch_create_notes',
    description: 'Creates multiple notes in a single operation...',
    parameters: {
        notes: Array<{
            filename: string,
            content: string
        }>
    }
}
```

**Executor**:
- Calls the Rust backend command
- Refreshes the file tree
- Formats detailed success/failure messages
- Returns user-friendly feedback

## Usage Examples

### Example 1: Creating a Simple Vault Structure

```javascript
{
    "notes": [
        {
            "filename": "Index",
            "content": "# My Vault\n\nWelcome to my knowledge base!"
        },
        {
            "filename": "Projects/Project A",
            "content": "# Project A\n\nProject details..."
        },
        {
            "filename": "Projects/Project B",
            "content": "# Project B\n\nMore details..."
        }
    ]
}
```

### Example 2: Vault Builder Pattern (Euler-style)

The agent can now efficiently create entire knowledge graphs:

```javascript
{
    "notes": [
        {
            "filename": "Leonhard Euler",
            "content": "# Leonhard Euler\n\n..."
        },
        {
            "filename": "Timeline/1707-1727: Basel Years",
            "content": "# Basel Years\n\n..."
        },
        {
            "filename": "Timeline/1727-1741: St. Petersburg",
            "content": "# St. Petersburg Period\n\n..."
        },
        {
            "filename": "Works/Basel Problem",
            "content": "# Basel Problem\n\n..."
        },
        {
            "filename": "Legacy/Euler's Number",
            "content": "# Euler's Number (e)\n\n..."
        }
    ]
}
```

## Benefits

### Performance
- **Before**: Creating 10 notes = 10 separate tool calls
- **After**: Creating 10 notes = 1 tool call
- Reduces context window usage
- Speeds up vault generation significantly

### Error Handling
- Partial success is allowed
- Detailed error reporting for failed notes
- Successful notes are still created even if some fail

### User Experience
- Clean, summarized feedback
- Shows exactly which notes succeeded/failed
- Automatic file tree refresh

## Response Format

**Success (all notes created)**:
```
Created 5 notes successfully
```

**Partial Success**:
```
Created 3 notes successfully. 2 failed:
  • Projects/Duplicate: Note 'Projects/Duplicate.md' already exists
  • Invalid/Path: Failed to create parent directories: Permission denied
```

## Integration with Vault Builder

This feature directly enables Mosaic's "Vault Builder" workflow. When given the Vault Builder prompt, Mosaic can now:

1. Create folder structure (using `create_folder`)
2. **Batch create all notes** (using `batch_create_notes`)
3. Open the main index (using `open_note`)

This reduces a 50-note vault creation from 50+ tool calls to ~5-10 tool calls.

## Testing

To test the feature:

1. Ask Mosaic to create multiple notes at once:
   ```
   "Create 5 notes about different programming languages in a 'Languages' folder"
   ```

2. Use the Vault Builder prompt with any notable person:
   ```
   "Create an Euler-style vault for Albert Einstein"
   ```

3. Verify:
   - Notes are created correctly
   - File tree updates automatically
   - Error handling works (try duplicates)
   - Feedback is clear and informative

## Next Steps

With `batch_create_notes` implemented, the next high-priority feature is **web_search** to enable Mosaic to fetch accurate external data for vault building.
