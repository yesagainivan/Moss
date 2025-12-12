import { Extension } from '@tiptap/core';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

export interface SearchAndReplaceOptions {
    searchResultClass: string;
    caseSensitive: boolean;
    disableRegex: boolean;
}

export interface SearchAndReplaceStorage {
    searchTerm: string;
    replaceTerm: string;
    results: Array<{ from: number; to: number }>;
    currentIndex: number;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        searchAndReplace: {
            setSearchTerm: (searchTerm: string) => ReturnType;
            setReplaceTerm: (replaceTerm: string) => ReturnType;
            goToNextSearchResult: () => ReturnType;
            goToPreviousSearchResult: () => ReturnType;
            replace: () => ReturnType;
            replaceAll: () => ReturnType;
            clearSearch: () => ReturnType;
        };
    }
}

const searchAndReplacePluginKey = new PluginKey('searchAndReplace');

export const SearchAndReplace = Extension.create<SearchAndReplaceOptions, SearchAndReplaceStorage>({
    name: 'searchAndReplace',

    addOptions() {
        return {
            searchResultClass: 'search-result',
            caseSensitive: false,
            disableRegex: false,
        };
    },

    addStorage() {
        return {
            searchTerm: '',
            replaceTerm: '',
            results: [],
            currentIndex: -1,
        };
    },

    addCommands() {
        return {
            setSearchTerm: (searchTerm: string) => ({ editor }) => {
                this.storage.searchTerm = searchTerm;
                this.storage.currentIndex = -1; // Reset current index on new search
                editor.view.dispatch(editor.state.tr);
                return true;
            },
            setReplaceTerm: (replaceTerm: string) => () => {
                this.storage.replaceTerm = replaceTerm;
                return true;
            },
            goToNextSearchResult: () => ({ state, dispatch, editor }) => {
                const { results } = this.storage;
                if (results.length === 0) return false;

                this.storage.currentIndex = (this.storage.currentIndex + 1) % results.length;
                const result = results[this.storage.currentIndex];

                if (dispatch) {
                    const tr = state.tr
                        .setSelection(TextSelection.create(state.doc, result.from, result.to))
                        .scrollIntoView()
                        .setMeta('searchUpdate', true);
                    dispatch(tr);

                    // Manual fallback for scrolling if ProseMirror fails (common in nested scroll containers)
                    // We need to wait for the DOM to update with the new search-result-active class
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            const activeResult = editor.view.dom.querySelector('.search-result-active');
                            if (activeResult) {
                                activeResult.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                    inline: 'nearest'
                                });
                            }
                        });
                    });
                }
                return true;
            },
            goToPreviousSearchResult: () => ({ state, dispatch, editor }) => {
                const { results } = this.storage;
                if (results.length === 0) return false;

                this.storage.currentIndex =
                    this.storage.currentIndex <= 0 ? results.length - 1 : this.storage.currentIndex - 1;
                const result = results[this.storage.currentIndex];

                if (dispatch) {
                    const tr = state.tr
                        .setSelection(TextSelection.create(state.doc, result.from, result.to))
                        .scrollIntoView()
                        .setMeta('searchUpdate', true);
                    dispatch(tr);

                    // Manual fallback for scrolling
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            const activeResult = editor.view.dom.querySelector('.search-result-active');
                            if (activeResult) {
                                activeResult.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                    inline: 'nearest'
                                });
                            }
                        });
                    });
                }
                return true;
            },
            replace: () => ({ state, dispatch }: any) => {
                const { replaceTerm, results, currentIndex } = this.storage;
                if (results.length === 0 || currentIndex < 0) return false;

                const result = results[currentIndex];
                const { from, to } = result;
                const docSize = state.doc.content.size;

                // Validate position
                if (from < 0 || to > docSize || from >= to) {
                    return false;
                }

                if (dispatch) {
                    // Create transaction from the PROVIDED state
                    const tr = state.tr.insertText(replaceTerm, from, to);
                    dispatch(tr);
                }

                return true;
            },
            replaceAll: () => ({ state, dispatch }: any) => {
                const { replaceTerm, results } = this.storage;
                if (results.length === 0) return false;

                const docSize = state.doc.content.size;

                // Validate all positions are still valid with provided state
                const validResults = results.filter(({ from, to }: any) => {
                    return from >= 0 && to <= docSize && from < to;
                });

                if (validResults.length === 0) {
                    this.storage.results = [];
                    this.storage.currentIndex = -1;
                    return false;
                }

                if (dispatch) {
                    try {
                        let tr = state.tr;

                        // Replace all matches from last to first to maintain positions
                        [...validResults].reverse().forEach(({ from, to }: any) => {
                            tr = tr.insertText(replaceTerm, from, to);
                        });

                        dispatch(tr);
                    } catch (error) {
                        console.error('Replace all failed during transaction build:', error);
                        // Prevent broken state
                        this.storage.results = [];
                        this.storage.currentIndex = -1;
                        return false;
                    }
                }

                return true;
            },
            clearSearch: () => ({ editor }) => {
                this.storage.searchTerm = '';
                this.storage.replaceTerm = '';
                this.storage.results = [];
                this.storage.currentIndex = -1;
                editor.view.dispatch(editor.state.tr);
                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        const { searchResultClass, caseSensitive, disableRegex } = this.options;

        return [
            new Plugin({
                key: searchAndReplacePluginKey,
                state: {
                    init: () => DecorationSet.empty,
                    apply: (_tr, _oldState, _, newState) => {
                        const { searchTerm, currentIndex } = this.storage;

                        if (!searchTerm) {
                            this.storage.results = [];
                            return DecorationSet.empty;
                        }

                        // Find all matches by traversing the document
                        const results: Array<{ from: number; to: number }> = [];
                        const decorations: Decoration[] = [];

                        let searchPattern: RegExp;

                        try {
                            if (disableRegex) {
                                // Escape special regex characters for literal search
                                const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                searchPattern = new RegExp(escapedTerm, caseSensitive ? 'g' : 'gi');
                            } else {
                                searchPattern = new RegExp(searchTerm, caseSensitive ? 'g' : 'gi');
                            }
                        } catch (e) {
                            // Invalid regex, return empty
                            this.storage.results = [];
                            return DecorationSet.empty;
                        }

                        // Traverse the document to find matches at correct positions
                        newState.doc.descendants((node, pos) => {
                            if (node.isText && node.text) {
                                let match;
                                // Reset regex state for each text node
                                searchPattern.lastIndex = 0;
                                while ((match = searchPattern.exec(node.text)) !== null) {
                                    const from = pos + match.index;
                                    const to = from + match[0].length;
                                    results.push({ from, to });

                                    // Add decoration for this match
                                    const isActive = results.length - 1 === currentIndex;
                                    const className = isActive
                                        ? `${searchResultClass} search-result-active`
                                        : searchResultClass;

                                    decorations.push(
                                        Decoration.inline(from, to, {
                                            class: className,
                                        })
                                    );
                                }
                            }
                        });

                        this.storage.results = results;

                        return DecorationSet.create(newState.doc, decorations);
                    },
                },
                props: {
                    decorations(state) {
                        return this.getState(state);
                    },
                },
            }),
        ];
    },
});
