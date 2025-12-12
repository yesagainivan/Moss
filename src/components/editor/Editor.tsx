import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { Wikilink } from './extensions/Wikilink';
import { Callout } from './extensions/Callout';
import { HeadingWithId } from './extensions/HeadingWithId';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-list/task-list';
import { TaskItem } from '@tiptap/extension-list/task-item';
import { ImageWithMarkdown } from './extensions/ImageWithMarkdown';
import { TagHighlight } from './extensions/TagHighlight';
import { TagSuggestion } from './extensions/TagSuggestion';
import { WikilinkSuggestion } from './extensions/WikilinkSuggestion';
import { useAppStore, debouncedSaveNote } from '../../store/useStore';
import { usePaneStore } from '../../store/usePaneStore';
import { PropertiesEditor } from './PropertiesEditor';
import styles from './Editor.module.css';
import 'tippy.js/dist/tippy.css';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAIStore } from '../../store/useAIStore';
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { AIInlinePrompt } from '../ai/AIInlinePrompt';
import { DiffContainer } from '../ai/DiffContainer';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { debounce } from 'lodash-es';
import { ErrorDialog } from '../common/ErrorDialog';
import { useMarkdownWorker } from '../../hooks/useMarkdownWorker';

import { slugify } from '../../lib/slugify';
import { LRUCache } from '../../lib/LRUCache';

interface EditorProps {
    noteId: string;
    initialContent: string;
    paneId?: string; // NEW: Add paneId to identify which pane this editor belongs to
}

// Cache for parsed markdown to speed up note switching
// LRU cache with capacity of 100 to prevent unbounded memory growth
const markdownCache = new LRUCache<string, string>(100);



export const Editor = ({ noteId, initialContent, paneId }: EditorProps) => {
    const updateNote = useAppStore(state => state.updateNote);
    const forceSaveNote = useAppStore(state => state.forceSaveNote);
    const setScrollPosition = useAppStore(state => state.setScrollPosition);
    const activePaneId = usePaneStore(state => state.activePaneId);

    const savedScrollPosition = useAppStore(state => state.scrollPositions[noteId]);

    const settings = useSettingsStore(state => state.settings);

    const selectedProvider = useAIStore(state => state.selectedProvider);
    const setStreaming = useAIStore(state => state.setStreaming);
    const setStreamedText = useAIStore(state => state.setStreamedText);
    const appendStreamedText = useAIStore(state => state.appendStreamedText);

    const streamedText = useAIStore((state) => state.streamedText);
    const isStreaming = useAIStore((state) => state.isStreaming);
    const streamStartPos = useRef<number | null>(null);

    // Worker hook
    const { parseMarkdown } = useMarkdownWorker();

    // Error dialog state
    const [error, setError] = useState<{ title: string; message: string } | null>(null);

    // Inline AI prompt state
    const [showInlinePrompt, setShowInlinePrompt] = useState(false);
    const [promptPosition, setPromptPosition] = useState<{ top: number; left: number } | null>(null);

    // Diff Container state
    const [showDiffContainer, setShowDiffContainer] = useState(false);
    const [originalContent, setOriginalContent] = useState<string>('');
    const [originalSelection, setOriginalSelection] = useState<{ from: number; to: number } | null>(null);

    // Live streaming mode state
    const liveStreamInsertPos = useRef<number | null>(null);
    const [isLiveModeActive, setIsLiveModeActive] = useState(false);

    // Parse markdown to HTML asynchronously using worker
    const [initialHtml, setInitialHtml] = useState<string | null>(null);
    const isReady = useRef(false);



    // Helper to calculate prompt position
    const calculatePromptPosition = (view: any, selection: any) => {
        const { head, from } = selection;
        const headCoords = view.coordsAtPos(head);
        const fromCoords = view.coordsAtPos(from);

        const isHeadVisible = headCoords.top >= 0 && headCoords.top <= window.innerHeight;
        const isFromVisible = fromCoords.top >= 0 && fromCoords.top <= window.innerHeight;

        let top, left;

        if (isHeadVisible) {
            top = headCoords.top - 80;
            left = headCoords.left;
        } else if (isFromVisible) {
            top = fromCoords.top - 80;
            left = fromCoords.left;
        } else {
            // Fallback to center
            top = window.innerHeight / 2 - 100;
            left = window.innerWidth / 2 - 200;
        }

        // Clamp to viewport
        top = Math.max(20, Math.min(top, window.innerHeight - 150));
        left = Math.max(20, Math.min(left, window.innerWidth - 420));

        return { top, left };
    };

    useEffect(() => {
        let isMounted = true;
        const parse = async () => {
            // Check cache first
            const cached = markdownCache.get(initialContent);
            if (cached !== undefined) {
                if (isMounted) setInitialHtml(cached);
                return;
            }

            try {
                const html = await parseMarkdown(initialContent);

                // LRU cache automatically handles eviction when capacity is exceeded
                markdownCache.set(initialContent, html);

                if (isMounted) setInitialHtml(html);
            } catch (e) {
                console.error('Failed to parse markdown:', e);
                // Fallback or error state?
            }
        };
        parse();
        return () => { isMounted = false; };
    }, [initialContent, parseMarkdown]);

    // noteIndex removed in favor of backend resolution


    // Debounced update to prevent heavy markdown serialization on every keystroke
    const debouncedUpdate = useMemo(() => debounce((editor: any, noteId: string) => {
        // @ts-ignore
        const markdown = editor.getMarkdown();
        updateNote(noteId, markdown);
        debouncedSaveNote(noteId, markdown);
    }, 300), [updateNote, debouncedSaveNote]);

    // Handle scroll position saving
    const handleScroll = useMemo(() => debounce((e: React.UIEvent<HTMLDivElement>) => {
        if (e.target instanceof HTMLElement) {
            setScrollPosition(noteId, e.target.scrollTop);
        }
    }, 100), [noteId, setScrollPosition]);



    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false, // Disable default heading to use our custom one
            }),
            HeadingWithId, // Custom heading that preserves IDs
            TaskList,
            TaskItem.configure({
                nested: true,
                HTMLAttributes: {
                    'data-type': 'taskItem',
                },
            }),
            Markdown,
            Wikilink.configure({
                openNote: async (id, isCmdClick = false, fragment) => {
                    const { vaultPath, createNote, openNote } = useAppStore.getState();

                    if (!vaultPath) {
                        console.warn('No vault path set');
                        return;
                    }

                    // Helper to scroll to heading after note opens
                    const scrollToHeading = (frag: string) => {
                        // Use setTimeout to ensure content is rendered
                        setTimeout(() => {
                            // Use the proper GitHub slugify function
                            const headingId = slugify(frag);
                            const element = document.getElementById(headingId);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }, 100);
                    };

                    // Handle same-note fragment links (e.g., [[#Heading]])
                    if (!id && fragment) {
                        scrollToHeading(fragment);
                        return;
                    }

                    try {
                        // Use backend to resolve the wikilink
                        const resolvedRelativePath = await invoke<string>('agent_resolve_wikilink', {
                            vaultPath,
                            linkText: id,
                        });

                        // Construct absolute path for openNote
                        // resolvedRelativePath is relative to vault, so we prepend vaultPath
                        // Ensure we handle potential leading slashes correctly
                        const absolutePath = `${vaultPath}/${resolvedRelativePath}`;

                        // Open the resolved note
                        openNote(absolutePath, isCmdClick);

                        // Scroll to heading if fragment provided
                        if (fragment) {
                            scrollToHeading(fragment);
                        }
                    } catch (e) {
                        console.warn('Failed to resolve wikilink:', e);
                        // If resolution fails, check if we should create it
                        if (isCmdClick && vaultPath) {
                            // Cmd/Ctrl+click and note doesn't exist - create it with exact name
                            const newNotePath = await createNote(id, undefined, true);
                            if (newNotePath) {
                                // Open the newly created note
                                openNote(newNotePath, isCmdClick);
                            }
                        }
                    }
                },
            }),
            TagHighlight,
            TagSuggestion,
            WikilinkSuggestion,
            Callout,
            ImageWithMarkdown.configure({
                inline: false, // Block mode for note-taking (like Obsidian/Notion)
                allowBase64: false, // Only allow URL-based images for now
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: '', // Initialize with empty, will be updated via useEffect
        editorProps: {
            attributes: {
                class: 'prose max-w-none focus:outline-none p-8 pb-32 prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-accent prose-code:bg-secondary/50 prose-code:px-1 prose-code:rounded prose-a:text-accent prose-blockquote:border-l-accent',
                style: `font-size: ${settings.fontSize * 1.2}px; line-height: ${settings.lineHeight};`,
            },
            handleClick: (_view, _pos, event) => {
                const target = event.target as HTMLElement;

                // Handle standard markdown anchor links (e.g., <a href="#heading">)
                // Check this FIRST to prevent Tauri from intercepting
                if (target.tagName === 'A') {
                    const anchor = target as HTMLAnchorElement;
                    // Remove target attribute for hash links to prevent browser opening
                    if (anchor.hash && anchor.hash.startsWith('#')) {
                        anchor.removeAttribute('target');
                        event.preventDefault();
                        event.stopPropagation();
                        const hash = anchor.hash.slice(1); // Remove #
                        if (hash) {
                            const element = document.getElementById(hash);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                        return true;
                    }
                }

                // Handle wikilinks
                if (target.closest('.wikilink')) {
                    event.preventDefault();
                    const wikilink = target.closest('.wikilink') as HTMLElement;
                    const noteTarget = wikilink.getAttribute('data-target');
                    const fragment = wikilink.getAttribute('data-fragment');

                    if (editor) {
                        // Use the Wikilink extension's openNote handler from storage
                        const wikilinkStorage = (editor.storage as any).wikilink;
                        const wikilinkOpenNote = wikilinkStorage?.openNote;
                        if (wikilinkOpenNote) {
                            wikilinkOpenNote(noteTarget, event.metaKey || event.ctrlKey, fragment);
                        }
                        return true;
                    }
                }

                return false;
            },
            handleKeyDown: (view, event) => {
                // Cmd+S / Ctrl+S: Force save immediately
                const isSave = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
                if (isSave) {
                    event.preventDefault();

                    // CRITICAL: Cancel any pending debounced saves first
                    debouncedUpdate.cancel();

                    // CRITICAL: Sync immediately before saving, bypassing debounce
                    // @ts-ignore
                    const markdown = editor?.getMarkdown();
                    if (markdown) {
                        updateNote(noteId, markdown);
                        forceSaveNote(noteId);
                    }
                    return true;
                }

                // Tab / Shift+Tab: Indent/outdent list items
                if (event.key === 'Tab') {
                    event.preventDefault();
                    if (event.shiftKey) {
                        // Outdent
                        editor?.chain().liftListItem('listItem').run();
                    } else {
                        // Indent
                        editor?.chain().sinkListItem('listItem').run();
                    }
                    return true;
                }

                // Cmd+K / Ctrl+K OR Cmd+Enter / Ctrl+Enter: Open inline AI prompt
                const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
                const isCmdEnter = (event.metaKey || event.ctrlKey) && event.key === 'Enter';

                if (isCmdK || isCmdEnter) {
                    event.preventDefault();

                    const selection = view.state.selection;
                    // Allow empty selection (cursor position) for generation

                    // Smart positioning logic
                    const { top, left } = calculatePromptPosition(view, selection);

                    setPromptPosition({ top, left });
                    setShowInlinePrompt(true);
                    return true;
                }
                return false;
            },
        },
        onUpdate: ({ editor, transaction }) => {
            // CRITICAL: Don't save if we haven't initialized content yet!
            if (!isReady.current) return;

            // Ignore updates that don't change the document (e.g. selection changes)
            // Also ignore updates that are explicitly marked to prevent updates (e.g. initial load)
            if (!transaction.docChanged || transaction.getMeta('preventUpdate')) {
                return;
            }


            // Debounce the heavy serialization and store update
            debouncedUpdate(editor, noteId);
        },
    }, [settings.fontSize, settings.lineHeight, settings.showDiffPanel, noteId, updateNote, debouncedSaveNote, forceSaveNote]);

    const containerRef = useRef<HTMLDivElement>(null);

    // Update editor content when initialHtml is ready
    useEffect(() => {
        if (editor && initialHtml !== null && !isReady.current) {
            // Use chain to batch commands and prevent multiple updates
            editor.chain()
                .setContent(initialHtml)
                .setMeta('preventUpdate', true) // Prevent triggering onUpdate
                .run();

            isReady.current = true;

            // Restore scroll position
            if (containerRef.current) {
                if (savedScrollPosition !== undefined) {
                    containerRef.current.scrollTop = savedScrollPosition;
                } else {
                    containerRef.current.scrollTop = 0;
                }
            }

            // Force cursor update after content switch (transparent window bug fix)
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('force-cursor-update'));
            }, 50);
        }
    }, [noteId, initialHtml, editor, savedScrollPosition]);

    // Listen for external updates (e.g. from Agent)
    // CRITICAL: Only respond if this editor is in the active pane
    useEffect(() => {
        const handleExternalUpdate = async (e: Event) => {
            const customEvent = e as CustomEvent;
            const { noteId: updatedNoteId, content } = customEvent.detail;

            // Only update if:
            // 1. This is the right note
            // We REMOVED the check for active pane to ensure all split views stay in sync

            if (updatedNoteId === noteId && editor) {


                // CRITICAL: Cancel any pending debounced save to prevent overwriting
                debouncedUpdate.cancel();

                // Update the in-memory note content to match the external update
                // This prevents the editor from thinking it has unsaved changes
                updateNote(noteId, content);

                // Parse the new markdown content
                const newHtml = await parseMarkdown(content);

                // Update editor content
                editor.chain()
                    .setContent(newHtml)
                    .setMeta('preventUpdate', true) // Prevent triggering onUpdate loop
                    .run();

            } else {
            }
        };

        window.addEventListener('note-updated-externally', handleExternalUpdate);
        return () => {
            window.removeEventListener('note-updated-externally', handleExternalUpdate);
        };
    }, [noteId, editor, parseMarkdown, debouncedUpdate, updateNote, paneId, activePaneId]);



    useEffect(() => {
        const handleCommand = async (e: Event) => {
            const customEvent = e as CustomEvent;
            const { instruction } = customEvent.detail;

            if (!editor) return;

            // CRITICAL: Only respond if this editor is in the active pane
            const currentActivePaneId = usePaneStore.getState().activePaneId;
            console.log('[AI Command] Editor checking pane:', { paneId, currentActivePaneId, noteId });

            // Strict check: paneId must exist and match activePaneId
            if (!paneId || paneId !== currentActivePaneId) {
                console.log('[AI Command] Skipping inactive or undefined pane:', paneId);
                return;
            }
            console.log('[AI Command] Processing in active pane:', paneId);

            // Set this pane as the active requestor for AI
            useAIStore.getState().setActiveRequestPaneId(paneId);

            const selection = editor.state.selection;
            // Allow empty selection for generation

            if (!selectedProvider) {
                setError({ title: 'Provider Required', message: 'Please select an AI provider in Settings.' });
                return;
            }

            const selectedModel = useAIStore.getState().selectedModel;
            if (!selectedModel) {
                setError({ title: 'Model Required', message: 'Please select an AI model in Settings.' });
                return;
            }

            setStreaming(true);
            setStreamedText('');

            // Get the full Markdown representation for AI context
            // The AI will see the FULL document with all Markdown structure
            // @ts-ignore - getMarkdown is added by @tiptap/markdown extension
            const fullMarkdown = editor.getMarkdown();

            // Capture selected text AS MARKDOWN for better AI context and diff view
            let selectedText = '';
            if (!selection.empty) {
                try {
                    // Use official Tiptap Markdown API to serialize selection to Markdown
                    const selectionFragment = selection.content().toJSON();

                    // Wrap fragment in a document structure for proper serialization
                    // The serializer expects a full document, not a fragment
                    const selectionDoc = {
                        type: 'doc',
                        content: selectionFragment.content || []
                    };

                    // @ts-ignore - markdown property is added by @tiptap/markdown extension
                    selectedText = editor.markdown.serialize(selectionDoc);

                    // If serialization returns empty, use fallback
                    if (!selectedText || selectedText.trim() === '') {
                        console.warn('Serialization returned empty, using textBetween fallback');
                        selectedText = editor.state.doc.textBetween(selection.from, selection.to, '\n');
                    }
                } catch (error) {
                    console.warn('Failed to serialize selection as Markdown, falling back to plain text:', error);
                    // Fallback: use textBetween with newline separator
                    selectedText = editor.state.doc.textBetween(selection.from, selection.to, '\n');
                }
            }

            // Store for display in diff (now Markdown)
            setOriginalContent(selectedText);
            setOriginalSelection({ from: selection.from, to: selection.to });
            streamStartPos.current = selection.from;

            // Smart positioning logic
            const { top, left } = calculatePromptPosition(editor.view, selection);

            setPromptPosition({ top, left });

            // Choose mode based on settings
            if (settings.showDiffPanel) {
                // Diff mode: show diff container (centered), hide prompt
                setShowDiffContainer(true);
                setShowInlinePrompt(false);
                setIsLiveModeActive(false);
            } else {
                // Live mode: keep prompt visible with generating state
                setShowInlinePrompt(true);
                setShowDiffContainer(false);
                setIsLiveModeActive(true);
                // Track insert position for live streaming
                liveStreamInsertPos.current = selection.from;

                // If there's a selection, delete it first to prepare for streaming
                if (!selection.empty) {
                    editor.chain()
                        .setTextSelection({ from: selection.from, to: selection.to })
                        .deleteSelection()
                        .run();
                }
            }

            // Get full note content AS MARKDOWN for AI context
            const currentNote = useAppStore.getState().notes[noteId];
            const noteTitle = currentNote?.title || 'Untitled';

            // Construct context with MARKDOWN so AI sees structure
            let context = '';
            if (!selection.empty) {
                // Transform mode: send full Markdown for context
                // Note: We send the full document so AI understands structure around the selection
                context = `Note Title: "${noteTitle}"\n\nFull note content (Markdown):\n${fullMarkdown}\n\n---\n\nSelected text to transform:\n${selectedText}\n\nIMPORTANT: Respond ONLY with the transformed Markdown text. DO NOT wrap your response in code fences or add any explanations. Just output the raw Markdown.`;
            } else {
                // Generation mode (no selection)
                // Provide Markdown context before cursor with proper newline separator
                const textBefore = editor.state.doc.textBetween(Math.max(0, selection.from - 1000), selection.from, '\n');
                context = `Note Title: "${noteTitle}"\n\nFull note content (Markdown):\n${fullMarkdown}\n\n---\n\nCONTEXT: The user has placed their cursor after: "...${textBefore}"\n\nTASK: Generate text at this cursor position based on the instruction.\n\nIMPORTANT: Respond ONLY with the raw Markdown text. DO NOT wrap your response in code fences or add any explanations.`;
            }



            try {
                await invoke('ai_rewrite_text', {
                    provider: selectedProvider,
                    model: useAIStore.getState().selectedModel,
                    systemPrompt: useAIStore.getState().systemPrompt,
                    instruction: instruction, // Custom instruction from the prompt
                    context: context,
                });
            } catch (err) {
                console.error(err);
                setStreaming(false);
                setError({ title: 'AI Error', message: String(err) });
            }
        };

        window.addEventListener('ai-command-trigger', handleCommand);
        return () => {
            window.removeEventListener('ai-command-trigger', handleCommand);
        };
    }, [editor, selectedProvider, noteId, appendStreamedText, setStreaming, setStreamedText, settings]);

    // Handle Accept/Discard for DiffContainer
    const handleAccept = async () => {
        if (!editor || !originalSelection) return;

        const streamedText = useAIStore.getState().streamedText;
        if (!streamedText) return;

        try {
            // Parse the generated text as Markdown
            const html = await parseMarkdown(streamedText);

            // Replace the original selection with the new content
            editor.chain()
                .setTextSelection(originalSelection)
                .insertContent(html as string)
                .run();

            setShowDiffContainer(false);
        } catch (e) {
            console.error('Failed to accept changes:', e);
            setError({ title: 'Accept Error', message: 'Failed to apply changes' });
        }
    };

    const handleDiscard = () => {
        setShowDiffContainer(false);
        setStreamedText('');
    };

    // Handle Live Mode Accept/Cancel
    const handleLiveAccept = async () => {
        // Parse the plain markdown to rich HTML before accepting
        if (!editor || liveStreamInsertPos.current === null) {
            setShowInlinePrompt(false);
            setIsLiveModeActive(false);
            return;
        }

        const streamedText = useAIStore.getState().streamedText;
        if (streamedText) {
            const insertPos = liveStreamInsertPos.current;
            const endPos = insertPos + streamedText.length;

            try {
                // Parse markdown to HTML
                const html = await parseMarkdown(streamedText);

                // Replace plain text with rich HTML
                editor.chain()
                    .setTextSelection({ from: insertPos, to: endPos })
                    .insertContent(html as string)
                    .run();
            } catch (e) {
                console.error('Failed to parse markdown on accept:', e);
            }
        }

        // Close and clean up
        setShowInlinePrompt(false);
        setStreamedText('');
        setIsLiveModeActive(false);
        liveStreamInsertPos.current = null;
    };

    const handleLiveCancel = async () => {
        if (!editor) {
            setShowInlinePrompt(false);
            setIsLiveModeActive(false);
            return;
        }

        // Undo the live-streamed changes
        const streamedText = useAIStore.getState().streamedText;
        if (streamedText && liveStreamInsertPos.current !== null) {
            const insertPos = liveStreamInsertPos.current;
            const endPos = insertPos + streamedText.length;

            // Delete the live-streamed plain text
            editor.chain()
                .setTextSelection({ from: insertPos, to: endPos })
                .deleteSelection()
                .run();

            // Restore original selection if there was one
            if (originalSelection && originalSelection.from !== originalSelection.to) {
                const originalText = originalContent;
                if (originalText) {
                    try {
                        // Parse the original markdown back to HTML
                        const html = await parseMarkdown(originalText);
                        editor.chain()
                            .setTextSelection({ from: insertPos, to: insertPos })
                            .insertContent(html as string)
                            .run();
                    } catch (e) {
                        console.error('Failed to restore original content:', e);
                        // Fallback: insert as plain text
                        editor.chain()
                            .setTextSelection({ from: insertPos, to: insertPos })
                            .insertContent(originalText)
                            .run();
                    }
                }
            }
        }

        setShowInlinePrompt(false);
        setStreamedText('');
        setIsLiveModeActive(false);
        liveStreamInsertPos.current = null;
    };

    // Handle AI Streaming
    useEffect(() => {
        let unlistenFunctions: (() => void)[] = [];
        let isMounted = true;

        const setupListeners = async () => {
            try {
                // Use window-specific listeners to avoid global event issues
                const unlistenChunk = await listen('ai-stream-chunk', (event: any) => {
                    if (!isMounted) return;
                    const chunk = event.payload;

                    // CRITICAL: Only process stream if this editor initiated the request
                    const activeRequestPaneId = useAIStore.getState().activeRequestPaneId;

                    // If we have a paneId, we MUST match the active request pane
                    if (paneId && activeRequestPaneId && paneId !== activeRequestPaneId) {
                        return;
                    }

                    // If we don't have a paneId (legacy/fallback), only process if no specific pane is active
                    if (!paneId && activeRequestPaneId) {
                        return;
                    }

                    // Check if we're in live mode by checking if liveStreamInsertPos is set
                    // This avoids closure issues with settings
                    const isInLiveMode = liveStreamInsertPos.current !== null;

                    if (isInLiveMode) {
                        // Live streaming mode: insert chunk directly
                        if (editor && liveStreamInsertPos.current !== null) {
                            const currentPos = liveStreamInsertPos.current + useAIStore.getState().streamedText.length;
                            editor.chain()
                                .setTextSelection({ from: currentPos, to: currentPos })
                                .insertContent(chunk)
                                .run();
                        }
                    }
                    // Always accumulate for diff mode or undo purposes in live mode
                    appendStreamedText(chunk);
                });


                const unlistenDone = await listen('ai-stream-done', async () => {
                    if (!isMounted) return;
                    setStreaming(false);
                    // Don't parse to HTML here - keep as plain text for consistent positions
                    // Will parse to HTML when user clicks Accept
                });

                const unlistenError = await listen('ai-stream-error', (event: any) => {
                    if (!isMounted) return;
                    console.error('AI Stream Error:', event.payload);
                    setStreaming(false);
                    alert('AI Error: ' + event.payload);
                });

                if (isMounted) {
                    unlistenFunctions = [unlistenChunk, unlistenDone, unlistenError];
                } else {

                    unlistenChunk();
                    unlistenDone();
                    unlistenError();
                }
            } catch (error) {
                console.error('Failed to setup AI listeners:', error);
            }
        };

        setupListeners();

        return () => {
            isMounted = false;
            unlistenFunctions.forEach(fn => {
                if (fn) {
                    try {
                        fn();
                    } catch (e) {
                        console.warn('Error unlistening (safe to ignore):', e);
                    }
                }
            });
        };
    }, [editor, appendStreamedText, setStreaming]);

    // Source Mode State
    const [isSourceMode, setIsSourceMode] = useState(false);
    const [sourceContent, setSourceContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const savedCursorPosition = useRef<number | null>(null);

    // Toggle Source Mode
    const toggleSourceMode = useCallback(async () => {
        if (!editor) return;

        if (isSourceMode) {
            // Switching: Source → Preview
            // Save textarea cursor position before switching
            if (textareaRef.current) {
                savedCursorPosition.current = textareaRef.current.selectionStart;
            }

            // Parse markdown to HTML
            const html = await parseMarkdown(sourceContent);

            editor.chain()
                .setContent(html as string)
                .setMeta('preventUpdate', true)
                .run();

            setIsSourceMode(false);
        } else {
            // Switching: Preview → Source
            // Save editor cursor position before switching
            const { from } = editor.state.selection;
            savedCursorPosition.current = from;

            // @ts-ignore
            const markdown = editor.getMarkdown();
            setSourceContent(markdown);
            setIsSourceMode(true);
        }
    }, [editor, isSourceMode, sourceContent, parseMarkdown]);

    // Focus and cursor position management for source mode toggle
    const prevSourceMode = useRef(isSourceMode);
    useEffect(() => {
        // Only focus if the mode has actually changed
        if (prevSourceMode.current !== isSourceMode) {
            if (!isSourceMode && editor) {
                // Switched to WYSIWYG mode - focus the editor and restore cursor
                setTimeout(() => {
                    if (savedCursorPosition.current !== null) {
                        // Clamp position to document length to prevent errors
                        const maxPos = editor.state.doc.content.size;
                        const safePos = Math.min(savedCursorPosition.current, maxPos - 1);
                        editor.chain().focus().setTextSelection(safePos).run();
                    } else {
                        editor.commands.focus('start');
                    }
                }, 50);
            } else if (isSourceMode && textareaRef.current) {
                // Switched to source mode - focus the textarea and restore cursor
                setTimeout(() => {
                    textareaRef.current?.focus();
                    if (savedCursorPosition.current !== null && textareaRef.current) {
                        // Clamp position to content length
                        const maxPos = textareaRef.current.value.length;
                        const safePos = Math.min(savedCursorPosition.current, maxPos);
                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = safePos;
                    }
                }, 50);
            }
            prevSourceMode.current = isSourceMode;
        }
    }, [isSourceMode, editor]);


    // Handle Source Mode Input
    const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setSourceContent(newContent);

        // Update store and save
        updateNote(noteId, newContent);
        debouncedSaveNote(noteId, newContent);
    };

    // Handle Source Mode KeyDown
    const handleSourceKeyDown = (e: React.KeyboardEvent) => {
        // Cmd+T: Toggle back to WYSIWYG
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't') {
            e.preventDefault();
            toggleSourceMode();
            return;
        }

        // Cmd+S: Save
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            debouncedUpdate.cancel();
            forceSaveNote(noteId);
            return;
        }

        // Tab: Insert two spaces at cursor position
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            const target = e.target as HTMLTextAreaElement;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const value = target.value;
            const newValue = value.substring(0, start) + '  ' + value.substring(end);
            setSourceContent(newValue);
            // Update store and save
            updateNote(noteId, newValue);
            // Mark tab as dirty
            // Update global dirty state
            useAppStore.getState().setSaveState(noteId, { status: 'saving' }); // Use 'saving' or 'idle' instead of 'unsaved' if 'unsaved' is not valid
            // Move cursor after inserted spaces
            const newPos = start + 2;
            target.selectionStart = target.selectionEnd = newPos;
            return;
        }
    };

    const handleEditorClick = useCallback(() => {
        editor?.commands.focus();
    }, [editor]);

    if (!editor || (initialContent && !initialHtml)) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading note...</span>
                </div>
            </div>
        );
    }

    // Constraint for max width style
    const containerStyle = settings.enableMaxWidth ? {
        maxWidth: `${settings.maxWidth}px`,
        margin: '0 auto',
        width: '100%',
    } : {
        width: '100%',
    };

    return (
        <div className="flex flex-col h-full bg-background relative" onClick={handleEditorClick}>
            {/* Properties Editor - Fixed at top, supports width constraint if desired, or full width */}
            {!isSourceMode && (
                <div style={containerStyle} className="px-0">
                    <PropertiesEditor noteId={noteId} />
                </div>
            )}

            {/* Scrollable Editor Container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto"
                style={{ cursor: 'text' }}
            >
                {isSourceMode ? (
                    <div style={containerStyle} className="h-full min-h-full pb-32">
                        <textarea
                            ref={textareaRef}
                            value={sourceContent}
                            onChange={(e) => setSourceContent(e.target.value)}
                            className="w-full h-full p-8 bg-transparent border-none outline-none resize-none font-mono"
                            style={{
                                fontSize: `${settings.fontSize}px`,
                                lineHeight: settings.lineHeight,
                            }}
                            spellCheck={settings.spellCheck}
                        />
                    </div>
                ) : (
                    <div style={containerStyle} className="h-full">
                        <EditorContent
                            editor={editor}
                            className="h-full"
                            spellCheck={settings.spellCheck}
                            onKeyDown={(e) => {
                                // Cmd+T: Toggle Source Mode
                                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't') {
                                    e.preventDefault();
                                    toggleSourceMode();
                                }
                            }}
                        />
                    </div>
                )}

                {/* Clickable area at bottom for easy focus */}
                <div
                    className="h-[30vh]"
                    onClick={(e) => {
                        e.stopPropagation();
                        editor?.commands.focus('end');
                    }}
                />
            </div>

            <ErrorDialog
                isOpen={error !== null}
                title={error?.title || ''}
                message={error?.message || ''}
                onClose={() => setError(null)}
            />
            <AIInlinePrompt
                isOpen={showInlinePrompt}
                position={promptPosition}
                onSubmit={(instruction) => {
                    // Don't close prompt immediately - let handleCommand decide based on mode
                    // In live mode, it needs to stay open to show generating state
                    // Dispatch AI command with custom instruction
                    window.dispatchEvent(
                        new CustomEvent('ai-command-trigger', {
                            detail: { command: 'Custom', instruction },
                        })
                    );
                }}
                onClose={() => setShowInlinePrompt(false)}
                isGenerating={isLiveModeActive}
                isStreaming={isStreaming}
                onAccept={handleLiveAccept}
                onCancel={handleLiveCancel}
            />
            {showDiffContainer && (
                <DiffContainer
                    originalText={originalContent}
                    generatedText={streamedText}
                    isStreaming={isStreaming}
                    onAccept={handleAccept}
                    onDiscard={handleDiscard}
                />
            )}
        </div>
    );
};
