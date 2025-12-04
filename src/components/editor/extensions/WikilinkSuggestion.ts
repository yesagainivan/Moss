import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { WikilinkSuggestionList } from './WikilinkSuggestionList';
import { useAppStore } from '../../../store/useStore';
import { PluginKey } from '@tiptap/pm/state';

export interface WikilinkSuggestionOptions {
    suggestion: {
        char: string;
        command: ({ editor, range, props }: any) => void;
    };
}

interface SuggestionItem {
    name: string;
    path: string;
    folder: string;
    category?: 'recent' | 'same-folder' | 'other';
}

// Simple fuzzy match function
function fuzzyMatch(text: string, query: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // If query is empty, match everything
    if (!lowerQuery) return true;

    // Simple contains check (can be made more sophisticated later)
    return lowerText.includes(lowerQuery);
}

// Get folder path from file path
function getFolderPath(filePath: string): string {
    const parts = filePath.split('/');
    parts.pop(); // Remove filename
    return parts.join('/') || '/';
}

// Get note name from file path
function getNoteName(filePath: string): string {
    const parts = filePath.split('/');
    const filename = parts[parts.length - 1] || '';
    return filename.replace(/\.md$/, '');
}

export const WikilinkSuggestion = Extension.create<WikilinkSuggestionOptions>({
    name: 'wikilinkSuggestion',

    addOptions() {
        return {
            suggestion: {
                char: '[[',
                command: ({ editor, range, props }) => {
                    // Get the wikilink node type from the schema
                    const { schema } = editor.state;
                    const wikilinkType = schema.nodes.wikilink;

                    if (!wikilinkType) {
                        // Fallback: just insert text if wikilink node type doesn't exist
                        editor
                            .chain()
                            .focus()
                            .deleteRange(range)
                            .insertContent(`[[${props.name}]]`)
                            .run();
                        return;
                    }

                    // Create and insert the wikilink node directly
                    editor
                        .chain()
                        .focus()
                        .deleteRange(range)
                        .insertContent({
                            type: 'wikilink',
                            attrs: {
                                target: props.name,
                                label: null,
                                fragment: null,
                            },
                        })
                        .run();
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                pluginKey: new PluginKey('wikilinkSuggestion'),
                editor: this.editor,
                char: this.options.suggestion.char,
                command: this.options.suggestion.command,

                items: ({ query }) => {
                    const store = useAppStore.getState();
                    const fileTree = store.fileTree;
                    const paneIndex = store.paneIndex;
                    const activePaneId = store.activePaneId;
                    const vaultPath = store.vaultPath;

                    if (!fileTree || fileTree.length === 0) return [];

                    // Get active pane for recent notes and current folder context
                    const activePane = activePaneId ? paneIndex.get(activePaneId) : null;

                    // Get current note to exclude it from suggestions
                    const currentNote = (activePane && activePane.type === 'leaf' && activePane.activeTabId)
                        ? activePane.tabs?.find(t => t.id === activePane.activeTabId)?.noteId || ''
                        : '';

                    // Get all markdown files (excluding current note)
                    const allNotes: SuggestionItem[] = fileTree
                        .filter(node =>
                            node.type === 'file' &&
                            node.path?.endsWith('.md') &&
                            node.path !== currentNote // Don't suggest current note
                        )
                        .map(node => ({
                            name: getNoteName(node.path!),
                            path: node.path!,
                            folder: getFolderPath(node.path!),
                        }));

                    // Get recently opened notes from active pane's tabs
                    const recentNotePaths = new Set<string>();

                    if (activePane && activePane.type === 'leaf' && activePane.tabs) {
                        // Get last 10 opened notes (excluding current)
                        activePane.tabs
                            .slice(-10)
                            .reverse()
                            .forEach(tab => {
                                if (tab.noteId && tab.noteId !== currentNote) {
                                    recentNotePaths.add(tab.noteId);
                                }
                            });
                    }

                    // Get current note's folder for context-aware suggestions
                    // Normalize folder paths: treat vault root specially
                    const currentFolder = currentNote ? getFolderPath(currentNote) : '';
                    const normalizedCurrentFolder = currentFolder === vaultPath ? '' : currentFolder;

                    // Categorize and filter notes
                    let suggestions: SuggestionItem[] = [];

                    // If no query, show smart suggestions
                    if (!query || query.trim() === '') {
                        // Add recent notes (max 5)
                        const recentNotes = allNotes
                            .filter(note => recentNotePaths.has(note.path))
                            .slice(0, 5)
                            .map(note => ({ ...note, category: 'recent' as const }));

                        // Add same folder notes (max 5, excluding recent)
                        // Normalize note folder for comparison
                        const sameFolderNotes = allNotes
                            .filter(note => {
                                const normalizedNoteFolder = note.folder === vaultPath ? '' : note.folder;
                                return normalizedNoteFolder === normalizedCurrentFolder &&
                                    !recentNotePaths.has(note.path);
                            })
                            .slice(0, 5)
                            .map(note => ({ ...note, category: 'same-folder' as const }));

                        // Add some alphabetical notes (max 10, excluding recent and same folder)
                        const usedPaths = new Set([...recentNotePaths, ...sameFolderNotes.map(n => n.path)]);
                        const otherNotes = allNotes
                            .filter(note => !usedPaths.has(note.path))
                            .slice(0, 10)
                            .map(note => ({ ...note, category: 'other' as const }));

                        suggestions = [...recentNotes, ...sameFolderNotes, ...otherNotes];
                    } else {
                        // Fuzzy search all notes
                        suggestions = allNotes
                            .filter(note => fuzzyMatch(note.name, query))
                            .slice(0, 50) // Limit to 50 results
                            .map(note => {
                                // Mark with category for visual distinction
                                if (recentNotePaths.has(note.path)) {
                                    return { ...note, category: 'recent' as const };
                                } else {
                                    const normalizedNoteFolder = note.folder === vaultPath ? '' : note.folder;
                                    if (normalizedNoteFolder === normalizedCurrentFolder) {
                                        return { ...note, category: 'same-folder' as const };
                                    }
                                }
                                return { ...note, category: 'other' as const };
                            });

                        // Sort by priority: exact match > recent > same folder > alphabetical
                        suggestions.sort((a, b) => {
                            const exactA = a.name.toLowerCase() === query.toLowerCase();
                            const exactB = b.name.toLowerCase() === query.toLowerCase();

                            if (exactA && !exactB) return -1;
                            if (!exactA && exactB) return 1;

                            if (a.category === 'recent' && b.category !== 'recent') return -1;
                            if (a.category !== 'recent' && b.category === 'recent') return 1;

                            if (a.category === 'same-folder' && b.category === 'other') return -1;
                            if (a.category === 'other' && b.category === 'same-folder') return 1;

                            return a.name.localeCompare(b.name);
                        });
                    }

                    return suggestions;
                },

                render: () => {
                    let component: ReactRenderer;
                    let popup: TippyInstance[];

                    return {
                        onStart: (props) => {
                            component = new ReactRenderer(WikilinkSuggestionList, {
                                props,
                                editor: props.editor,
                            });

                            if (!props.clientRect) {
                                return;
                            }

                            popup = tippy('body', {
                                getReferenceClientRect: props.clientRect as any,
                                appendTo: () => document.body,
                                content: component.element,
                                showOnCreate: true,
                                interactive: true,
                                trigger: 'manual',
                                placement: 'bottom-start',
                                theme: 'wikilink-suggestion',
                            });
                        },

                        onUpdate(props) {
                            component.updateProps(props);

                            if (!props.clientRect) {
                                return;
                            }

                            popup[0].setProps({
                                getReferenceClientRect: props.clientRect as any,
                            });
                        },

                        onKeyDown(props) {
                            if (props.event.key === 'Escape') {
                                popup[0].hide();
                                return true;
                            }

                            const ref = component.ref as any;
                            return ref?.onKeyDown?.(props) ?? false;
                        },

                        onExit() {
                            popup[0].destroy();
                            component.destroy();
                        },
                    };
                },
            }),
        ];
    },
});
