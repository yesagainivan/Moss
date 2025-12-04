import { useEffect, useState, useMemo, useCallback } from 'react';
import { Command } from 'cmdk';
import { useAppStore } from '../../store/useStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { File, Search, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { debounce } from 'lodash-es';
import styles from './SearchModal.module.css';

interface SearchResult {
    id: string;
    title: string;
    path: string;
    modified: number;
    size: number;
}

export const SearchModal = () => {
    const isOpen = useAppStore(state => state.isSearchModalOpen);
    const setIsOpen = useAppStore(state => state.setSearchModalOpen);
    const vaultPath = useSettingsStore(state => state.currentVaultPath);
    const openNote = useAppStore(state => state.openNote);

    const [isClosing, setIsClosing] = useState(false);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Handle close with animation
    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setIsOpen(false);
            setSearch('');
            setResults([]);
        }, 100);
    }, [setIsOpen]);

    // Debounced search function
    const performSearch = useMemo(
        () =>
            debounce(async (query: string) => {
                if (!query.trim() || !vaultPath) {
                    setResults([]);
                    setIsSearching(false);
                    return;
                }

                try {
                    setIsSearching(true);
                    const searchResults = await invoke<SearchResult[]>('agent_search_notes', {
                        vaultPath,
                        query: query.trim(),
                    });
                    setResults(searchResults);
                } catch (error) {
                    console.error('Search failed:', error);
                    setResults([]);
                } finally {
                    setIsSearching(false);
                }
            }, 300),
        [vaultPath]
    );

    // Trigger search when query changes
    useEffect(() => {
        if (search.trim()) {
            setIsSearching(true);
            performSearch(search);
        } else {
            setResults([]);
            setIsSearching(false);
        }
    }, [search, performSearch]);

    // Clean up debounced function on unmount
    useEffect(() => {
        return () => {
            performSearch.cancel();
        };
    }, [performSearch]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, handleClose]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setResults([]);
            setIsSearching(false);
        }
    }, [isOpen]);

    if (!isOpen && !isClosing) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.backdrop} onClick={handleClose} />
            <div className={`${styles.container} ${isClosing ? styles.containerExit : ''}`}>
                <Command className="w-full" shouldFilter={false}>
                    <div className={styles.inputWrapper}>
                        <Search className={styles.searchIcon} />
                        <Command.Input
                            autoFocus
                            placeholder="Search notes..."
                            className={styles.input}
                            value={search}
                            onValueChange={setSearch}
                        />
                    </div>
                    <Command.List className={styles.list}>
                        {!search.trim() && (
                            <div className={styles.empty}>
                                Type to search across all notes
                            </div>
                        )}

                        {search.trim() && isSearching && (
                            <div className={styles.loading}>
                                <Loader2 className={styles.spinner} />
                                Searching...
                            </div>
                        )}

                        {search.trim() && !isSearching && results.length === 0 && (
                            <Command.Empty className={styles.empty}>
                                No notes found matching "{search}"
                            </Command.Empty>
                        )}

                        {results.map((result) => {
                            // Extract folder path (parent directory)
                            const pathParts = result.path.split('/');
                            const folderPath = pathParts.slice(0, -1).join('/');

                            return (
                                <Command.Item
                                    key={result.id}
                                    value={result.path}
                                    onSelect={() => {
                                        // Convert relative path to note ID (full path)
                                        const noteId = vaultPath ? `${vaultPath}/${result.path}` : result.path;
                                        openNote(noteId);
                                        handleClose();
                                    }}
                                    className={styles.item}
                                >
                                    <File className={styles.itemIcon} />
                                    <div className={styles.itemContent}>
                                        <span className={styles.itemTitle}>{result.title}</span>
                                        {folderPath && (
                                            <span className={styles.itemPath}>{folderPath}</span>
                                        )}
                                    </div>
                                </Command.Item>
                            );
                        })}
                    </Command.List>
                </Command>
            </div>
        </div>
    );
};
