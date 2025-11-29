import { invoke } from '@tauri-apps/api/core';
import type { Tool, ToolCall, NoteMetadata } from './types';
import { useAppStore } from '../../store/useStore';

// ============================================================================
// Tool Definitions (Gemini Function Calling Format)
// ============================================================================

export const AVAILABLE_TOOLS: Tool[] = [
    {
        name: 'get_note',
        description: 'Fetches the full markdown content of a note by its file path. Use this when you need to read the complete contents of a specific note.',
        parameters: {
            type: 'object',
            properties: {
                note_path: {
                    type: 'string',
                    description: 'The absolute file path to the note (e.g., /Users/username/vault/my-note.md)',
                },
            },
            required: ['note_path'],
        },
    },
    {
        name: 'batch_read',
        description: 'Efficiently reads multiple notes in a single operation. Much faster than calling get_note multiple times. Use this when you need to read the content of 2 or more notes at once (e.g., comparing notes, gathering context from multiple files, fact-checking across documents).',
        parameters: {
            type: 'object',
            properties: {
                note_paths: {
                    type: 'array',
                    description: 'Array of file paths to read (e.g., ["/Users/username/vault/note1.md", "Projects/note2.md"]). Can be absolute or relative paths.',
                    items: {
                        type: 'string',
                        description: 'File path to a note',
                    },
                },
            },
            required: ['note_paths'],
        },
    },
    {
        name: 'create_note',
        description: 'Creates a new note with the specified filename and content. You can specify a path to create notes in subfolders (e.g., "Projects/MyNote.md"). Use your judgment on whether to explain the content first or create it directly based on complexity and context.',
        parameters: {
            type: 'object',
            properties: {
                filename: {
                    type: 'string',
                    description: 'The name of the note or path (e.g., "Meeting Notes", "Projects/Idea"). Extension .md will be added automatically if missing.',
                },
                content: {
                    type: 'string',
                    description: 'The markdown content of the note.',
                },
            },
            required: ['filename', 'content'],
        },
    },
    {
        name: 'batch_create_notes',
        description: 'Creates multiple notes in a single operation. This is much more efficient than creating notes one by one. Use this when you need to create a structured vault, folder with multiple notes, or any scenario where you\'re creating more than one note at a time. Use your judgment on whether to explain the content first or create directly based on complexity and context.',
        parameters: {
            type: 'object',
            properties: {
                notes: {
                    type: 'array',
                    description: 'Array of notes to create, each with filename and content',
                    items: {
                        type: 'object',
                        description: 'A note to create with filename and content',
                        properties: {
                            filename: {
                                type: 'string',
                                description: 'The name of the note or path (e.g., "Meeting Notes", "Projects/Idea"). Extension .md will be added automatically if missing.',
                            },
                            content: {
                                type: 'string',
                                description: 'The markdown content of the note.',
                            },
                        },
                        required: ['filename', 'content'],
                    },
                },
            },
            required: ['notes'],
        },
    },
    {
        name: 'update_note',
        description: 'Updates an existing note by replacing its entire content. Use your judgment on whether to explain changes first or update directly based on the complexity of the changes and user expectations.',
        parameters: {
            type: 'object',
            properties: {
                filename: {
                    type: 'string',
                    description: 'The name of the note or path (e.g., "Meeting Notes", "Projects/Idea"). Extension .md will be added automatically if missing.',
                },
                content: {
                    type: 'string',
                    description: 'The new markdown content of the note. This will overwrite the existing content.',
                },
            },
            required: ['filename', 'content'],
        },
    },
    {
        name: 'batch_update_notes',
        description: 'Updates multiple notes in a single operation. This is much more efficient than updating notes one by one and creates a single atomic commit. Use this when you need to refactor multiple files, update cross-references, or apply a change pattern across several notes.',
        parameters: {
            type: 'object',
            properties: {
                notes: {
                    type: 'array',
                    description: 'Array of notes to update, each with filename and new content',
                    items: {
                        type: 'object',
                        description: 'A note to update with filename and content',
                        properties: {
                            filename: {
                                type: 'string',
                                description: 'The name of the note or path (e.g., "Meeting Notes", "Projects/Idea"). Extension .md will be added automatically if missing.',
                            },
                            content: {
                                type: 'string',
                                description: 'The new markdown content of the note. This will overwrite the existing content.',
                            },
                        },
                        required: ['filename', 'content'],
                    },
                },
            },
            required: ['notes'],
        },
    },
    {
        name: 'create_folder',
        description: 'Creates a new folder in the vault. Use this to organize notes.',
        parameters: {
            type: 'object',
            properties: {
                folder_name: {
                    type: 'string',
                    description: 'The name or path of the folder to create (e.g., "Projects", "Archive/2023").',
                },
            },
            required: ['folder_name'],
        },
    },
    {
        name: 'search_notes',
        description: 'Searches all notes in the vault for a specific text query. Returns metadata for notes that contain the search term. Use this to find notes related to a topic.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The text to search for (case-insensitive)',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'semantic_search',
        description: 'Performs semantic search to find notes based on meaning and concepts, not just exact keywords. Use this when you need to find notes related to ideas, themes, or concepts even if they don\'t contain the exact search terms. For example, use this to find notes about "productivity" even if they use words like "efficiency" or "effectiveness" instead.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The concept or idea to search for (e.g., "personal growth", "project management strategies")',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results to return (default: 5)',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'list_recent_notes',
        description: 'Lists recently modified notes in the vault, sorted by modification time (newest first). You can optionally filter by time period.',
        parameters: {
            type: 'object',
            properties: {
                count: {
                    type: 'number',
                    description: 'Maximum number of notes to return',
                },
                days: {
                    type: 'number',
                    description: 'Optional: only return notes modified within this many days. Omit to get all notes.',
                },
            },
            required: ['count'],
        },
    },
    {
        name: 'list_all_notes',
        description: 'Lists all notes in the vault with their metadata (title, path, modification time). Use this to get an overview of the entire vault.',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'open_note',
        description: 'Opens a note in the editor for the user to view. Use this when the user asks to "see" or "open" a specific note.',
        parameters: {
            type: 'object',
            properties: {
                note_path: {
                    type: 'string',
                    description: 'The name or path of the note to open (e.g., "Meeting Notes", "Projects/Idea").',
                },
            },
            required: ['note_path'],
        },
    },
    {
        name: 'move_note',
        description: 'Moves or renames a note. Use this to organize notes into folders or rename them.',
        parameters: {
            type: 'object',
            properties: {
                source: {
                    type: 'string',
                    description: 'The current name or path of the note (e.g., "Meeting Notes").',
                },
                destination: {
                    type: 'string',
                    description: 'The new path relative to vault root (e.g., "Archive/Meeting Notes").',
                },
            },
            required: ['source', 'destination'],
        },
    },
    {
        name: 'delete_note',
        description: 'Deletes a note permanently. Use this to remove unwanted notes.',
        parameters: {
            type: 'object',
            properties: {
                note_path: {
                    type: 'string',
                    description: 'The name or path of the note to delete.',
                },
            },
            required: ['note_path'],
        },
    },
    {
        name: 'search_wikipedia',
        description: 'Search Wikipedia for articles related to a query. Returns a list of matching articles with titles and short descriptions. Use this to find Wikipedia pages about people, topics, events, or concepts.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search term (e.g., "Albert Einstein", "Quantum Mechanics", "French Revolution")',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results to return (default: 5, max: 10)',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'get_wikipedia_summary',
        description: 'Get a concise summary/introduction of a Wikipedia article. ALWAYS try this first before fetching the full content. Perfect for getting quick facts, dates, and overview information about a topic. Use this when you need basic biographical info or topic overview.',
        parameters: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'The exact title of the Wikipedia article (e.g., "Albert Einstein", "Theory of Relativity")',
                },
            },
            required: ['title'],
        },
    },
    {
        name: 'get_wikipedia_content',
        description: 'Get the full content of a Wikipedia article in markdown format. WARNING: This can be very large and consume a lot of context. Only use this if the summary was insufficient and you need specific details. The content will be truncated if it exceeds the limit.',
        parameters: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'The exact title of the Wikipedia article (e.g., "Albert Einstein", "Theory of Relativity")',
                },
            },
            required: ['title'],
        },
    },
];

// ============================================================================
// Tool Executor
// ============================================================================

export async function executeTool(
    call: ToolCall,
    vaultPath: string | null,
    signal?: AbortSignal
): Promise<any> {
    if (!vaultPath) {
        throw new Error('No vault is open');
    }

    // Check if aborted before execution
    if (signal?.aborted) {
        throw new Error('AbortError');
    }
    const { name, arguments: args } = call;

    try {
        switch (name) {
            case 'get_note': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }
                const content = await invoke<string>('agent_get_note', {
                    vaultPath: vaultPath,
                    notePath: args.note_path,
                });
                return content;
            }

            case 'batch_read': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }

                interface BatchReadResult {
                    success: Array<{ path: string; content: string }>;
                    failed: Array<{ path: string; error: string }>;
                }

                const result = await invoke<BatchReadResult>('agent_batch_read', {
                    vaultPath: vaultPath,
                    notePaths: args.note_paths,
                });

                // Format result for Ambre
                const successCount = result.success.length;
                const failCount = result.failed.length;

                if (failCount > 0) {
                    const failedPaths = result.failed.map(f => `• ${f.path}: ${f.error}`).join('\n');
                    return {
                        ...result,
                        summary: `Read ${successCount} note${successCount === 1 ? '' : 's'} successfully. ${failCount} failed:\n${failedPaths}`,
                    };
                }

                return {
                    ...result,
                    summary: `Read ${successCount} note${successCount === 1 ? '' : 's'} successfully`,
                };
            }

            case 'create_note': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }
                const relativePath = await invoke<string>('agent_create_note', {
                    vaultPath: vaultPath,
                    filename: args.filename,
                    content: args.content,
                });

                // Refresh file tree
                await useAppStore.getState().refreshFileTree();

                // Calculate absolute path and open the note to load it into store
                const absolutePath = `${vaultPath}/${relativePath}`;
                await useAppStore.getState().openNote(absolutePath, true);

                return `Note created successfully: ${args.filename}`;
            }

            case 'batch_create_notes': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }

                interface BatchCreateResult {
                    success: string[];
                    failed: Array<{ filename: string; error: string }>;
                }

                const result = await invoke<BatchCreateResult>('agent_batch_create_notes', {
                    vaultPath: vaultPath,
                    notes: args.notes,
                });

                // Refresh file tree
                await useAppStore.getState().refreshFileTree();

                // Open the first successfully created note to load it into store
                if (result.success.length > 0) {
                    const firstNotePath = `${vaultPath}/${result.success[0]}`;
                    await useAppStore.getState().openNote(firstNotePath, true);
                }

                // Format result message
                const successCount = result.success.length;
                const failCount = result.failed.length;
                let message = `Created ${successCount} note${successCount === 1 ? '' : 's'} successfully`;

                if (failCount > 0) {
                    message += `. ${failCount} failed:\n`;
                    result.failed.forEach(f => {
                        message += `  • ${f.filename}: ${f.error}\n`;
                    });
                }

                return message;
            }


            case 'update_note': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }
                const relativePath = await invoke<string>('agent_update_note', {
                    vaultPath: vaultPath,
                    filename: args.filename,
                    content: args.content,
                });

                // Convert to absolute path for editor matching
                const absolutePath = `${vaultPath}/${relativePath}`;

                // Refresh file tree
                await useAppStore.getState().refreshFileTree();

                // Update the note in the store if it's currently loaded
                // This ensures the editor reflects the changes immediately
                useAppStore.getState().updateNote(absolutePath, args.content);

                // Dispatch event to notify Editor to refresh content
                // CRITICAL: Use absolute path to match editor's noteId
                window.dispatchEvent(new CustomEvent('note-updated-externally', {
                    detail: { noteId: absolutePath, content: args.content }
                }));

                return `Note updated successfully: ${args.filename}`;
            }

            case 'batch_update_notes': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }

                interface BatchUpdateResult {
                    success: string[];
                    failed: Array<{ filename: string; error: string }>;
                }

                const result = await invoke<BatchUpdateResult>('agent_batch_update_notes', {
                    vaultPath: vaultPath,
                    notes: args.notes,
                });

                // Refresh file tree
                await useAppStore.getState().refreshFileTree();

                // Update loaded notes in store if they are open
                const store = useAppStore.getState();

                // For each successfully updated note, check if it's open and update store
                // We need to resolve absolute paths for store matching
                for (const relativePath of result.success) {
                    const absolutePath = `${vaultPath}/${relativePath}`;

                    // Find the content for this note from args
                    // Note: args.notes uses filenames which might not match relativePath exactly if extension was added
                    // But usually relativePath returned from backend is clean
                    const noteArg = args.notes.find((n: any) => {
                        const nPath = n.filename.endsWith('.md') ? n.filename : `${n.filename}.md`;
                        return relativePath.endsWith(nPath);
                    });

                    if (noteArg) {
                        store.updateNote(absolutePath, noteArg.content);

                        // Dispatch event for editor
                        window.dispatchEvent(new CustomEvent('note-updated-externally', {
                            detail: { noteId: absolutePath, content: noteArg.content }
                        }));
                    }
                }

                // Format result message
                const successCount = result.success.length;
                const failCount = result.failed.length;
                let message = `Updated ${successCount} note${successCount === 1 ? '' : 's'} successfully`;

                if (failCount > 0) {
                    message += `. ${failCount} failed:\n`;
                    result.failed.forEach(f => {
                        message += `  • ${f.filename}: ${f.error}\n`;
                    });
                }

                return message;
            }

            case 'create_folder': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }
                await invoke<string>('agent_create_folder', {
                    vaultPath: vaultPath,
                    folderName: args.folder_name,
                });

                // Refresh file tree
                await useAppStore.getState().refreshFileTree();

                return `Folder created successfully: ${args.folder_name}`;
            }

            case 'search_notes': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }
                const results = await invoke<NoteMetadata[]>('agent_search_notes', {
                    vaultPath: vaultPath,
                    query: args.query,
                });
                return results;
            }

            case 'semantic_search': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }
                const results = await invoke<Array<{ file_path: string; content: string; score: number }>>('agent_semantic_search', {
                    vaultPath: vaultPath,
                    query: args.query,
                    limit: args.limit || 5,
                });
                return results;
            }

            case 'list_recent_notes': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }
                const results = await invoke<NoteMetadata[]>(
                    'agent_list_recent_notes',
                    {
                        vaultPath: vaultPath,
                        count: args.count,
                        days: args.days || null,
                    }
                );
                return results;
            }

            case 'open_note': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }
                const fullPath = await invoke<string>('agent_resolve_path', {
                    vaultPath: vaultPath,
                    shortPath: args.note_path,
                });

                await useAppStore.getState().openNote(fullPath);
                return `Opened note: ${args.note_path}`;
            }

            case 'list_all_notes': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }
                const results = await invoke<NoteMetadata[]>('agent_list_all_notes', {
                    vaultPath: vaultPath,
                });
                return results;
            }

            case 'move_note': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }
                // Resolve source path
                const sourcePath = await invoke<string>('agent_resolve_path', {
                    vaultPath: vaultPath,
                    shortPath: args.source,
                });

                // Construct destination path (relative to vault root)
                // Ensure destination has .md extension if source had it or if it's a file
                let destPath = `${vaultPath}/${args.destination}`;
                if (!destPath.endsWith('.md') && sourcePath.endsWith('.md')) {
                    destPath += '.md';
                }

                await useAppStore.getState().moveNote(sourcePath, destPath);
                return `Moved note from ${args.source} to ${args.destination}`;
            }

            case 'delete_note': {
                if (!vaultPath) {
                    throw new Error('No vault is currently open');
                }
                const notePath = await invoke<string>('agent_resolve_path', {
                    vaultPath: vaultPath,
                    shortPath: args.note_path,
                });

                // Ask for confirmation
                const confirmed = await useAppStore.getState().requestConfirmation(
                    `Are you sure you want to delete "${args.note_path}"? This action cannot be undone.`
                );
                if (!confirmed) {
                    return `Deletion cancelled by user.`;
                }

                await useAppStore.getState().deleteNote(notePath);
                return `Deleted note: ${args.note_path}`;
            }

            case 'search_wikipedia': {
                const results = await invoke<{ results: Array<{ title: string; pageid: number; snippet: string }> }>('search_wikipedia', {
                    query: args.query,
                    limit: args.limit || 5,
                });
                return results;
            }

            case 'get_wikipedia_summary': {
                const summary = await invoke<{ title: string; extract: string; url: string }>('get_wikipedia_summary', {
                    title: args.title,
                });
                return summary;
            }

            case 'get_wikipedia_content': {
                const content = await invoke<{ title: string; content: string; url: string }>('get_wikipedia_content', {
                    title: args.title,
                });
                return content;
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        throw new Error(`Tool execution failed for ${name}: ${error}`);
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format tool result for display in UI
 */
export function formatToolResult(toolName: string, result: any): string {
    switch (toolName) {
        case 'get_note':
            return `📄 Retrieved note (${result.length} characters)`;

        case 'batch_read':
            if (result?.success && Array.isArray(result.success)) {
                const count = result.success.length;
                const totalChars = result.success.reduce((sum: number, n: any) => sum + (n.content?.length || 0), 0);
                return `📚 Read ${count} note${count === 1 ? '' : 's'} (${totalChars} characters total)`;
            }
            return '📚 Batch read completed';

        case 'create_note':
            return `📝 Created note`;

        case 'update_note':
            return `📝 Updated note`;

        case 'batch_update_notes':
            // Parse result to count successes
            if (typeof result === 'string') {
                const match = result.match(/Updated (\d+) note/);
                if (match) {
                    return `📝 Updated ${match[1]} note${match[1] === '1' ? '' : 's'}`;
                }
            }
            return `📝 Batch updated notes`;

        case 'batch_create_notes':
            // Parse result to count successes
            if (typeof result === 'string') {
                const match = result.match(/Created (\d+) note/);
                if (match) {
                    return `📦 Created ${match[1]} note${match[1] === '1' ? '' : 's'}`;
                }
            }
            return `📦 Batch created notes`;


        case 'create_folder':
            return `📂 Created folder`;

        case 'move_note':
            return `📦 Moved note`;

        case 'delete_note':
            return `🗑️ Deleted note`;

        case 'open_note':
            return `📂 Opened note`;

        case 'search_notes':
            if (Array.isArray(result)) {
                return `🔍 Found ${result.length} note${result.length === 1 ? '' : 's'} matching the search`;
            }
            return '🔍 Search completed';

        case 'list_recent_notes':
        case 'list_all_notes':
            if (Array.isArray(result)) {
                return `📋 Retrieved ${result.length} note${result.length === 1 ? '' : 's'}`;
            }
            return '📋 Retrieved notes';

        case 'semantic_search':
            if (Array.isArray(result)) {
                return `🔍 Found ${result.length} related note${result.length === 1 ? '' : 's'}`;
            }
            return '🔍 Semantic search completed';

        case 'search_wikipedia':
            if (result?.results && Array.isArray(result.results)) {
                return `📚 Found ${result.results.length} Wikipedia article${result.results.length === 1 ? '' : 's'}`;
            }
            return '📚 Wikipedia search completed';

        case 'get_wikipedia_summary':
            if (result?.title) {
                return `📖 Retrieved summary for "${result.title}"`;
            }
            return '📖 Retrieved Wikipedia summary';

        case 'get_wikipedia_content':
            if (result?.title) {
                const wordCount = result.content ? result.content.split(/\s+/).length : 0;
                return `📄 Retrieved full article "${result.title}" (${wordCount} words)`;
            }
            return '📄 Retrieved Wikipedia article';

        default:
            return `✅ Tool ${toolName} executed`;
    }
}
