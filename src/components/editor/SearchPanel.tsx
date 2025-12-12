import { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { X, ChevronUp, ChevronDown, Replace } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SearchPanelProps {
    editor: Editor | null;
    isOpen: boolean;
    onClose: () => void;
}

export const SearchPanel = ({ editor, isOpen, onClose }: SearchPanelProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [replaceTerm, setReplaceTerm] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [showReplace, setShowReplace] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [updateCounter, setUpdateCounter] = useState(0); // Force re-render when search state changes

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Get search results from editor storage
    // These values will be fresh on each render (triggered by updateCounter changes)
    const storage = editor?.storage as any;
    const results = storage?.searchAndReplace?.results || [];
    const currentIndex = storage?.searchAndReplace?.currentIndex ?? -1;
    const resultCount = results.length;
    const currentPosition = currentIndex >= 0 ? currentIndex + 1 : 0;

    // Listen to editor updates to re-render when search state changes
    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => {
            // Force re-render when editor updates (search navigation, etc.)
            setUpdateCounter(c => c + 1);
        };

        editor.on('update', handleUpdate);
        editor.on('selectionUpdate', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
            editor.off('selectionUpdate', handleUpdate);
        };
    }, [editor]);

    // Suppress unused warning - updateCounter is used to force re-renders
    void updateCounter;

    // Update editor search term when input changes
    useEffect(() => {
        if (!editor) return;
        editor.commands.setSearchTerm(searchTerm);
    }, [searchTerm, editor]);

    // Update editor replace term
    useEffect(() => {
        if (!editor) return;
        editor.commands.setReplaceTerm(replaceTerm);
    }, [replaceTerm, editor]);

    // Focus search input when panel opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
        }
    }, [isOpen]);

    // Clear search when panel closes
    useEffect(() => {
        if (!isOpen && editor) {
            editor.commands.clearSearch();
            setSearchTerm('');
            setReplaceTerm('');
        }
    }, [isOpen, editor]);

    const handleNext = useCallback(() => {
        if (!editor) return;
        editor.commands.goToNextSearchResult();
    }, [editor]);

    const handlePrevious = useCallback(() => {
        if (!editor) return;
        editor.commands.goToPreviousSearchResult();
    }, [editor]);

    const handleReplace = useCallback(() => {
        if (!editor) return;
        editor.commands.replace();
    }, [editor]);

    const handleReplaceAll = useCallback(() => {
        if (!editor || !replaceTerm || resultCount === 0) return;
        console.log('[SearchPanel] Replace All clicked');
        setShowConfirm(true);
    }, [editor, replaceTerm, resultCount]);

    const confirmReplaceAll = useCallback(() => {
        if (!editor || showConfirm === false) return; // Guard against double-trigger
        console.log('[SearchPanel] Confirming Replace All');

        setShowConfirm(false); // Close dialog immediately

        // Execute replace all with slight delay to allow state to settle?
        // For now, synchronous call to see logs
        console.log('[SearchPanel] dispatching replaceAll command');
        editor.commands.replaceAll();
    }, [editor, showConfirm]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                handlePrevious();
            } else {
                handleNext();
            }
        } else if (e.key === 'g' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (e.shiftKey) {
                handlePrevious();
            } else {
                handleNext();
            }
        }
    }, [onClose, handleNext, handlePrevious]);

    if (!isOpen) return null;

    return (
        <div
            className="absolute top-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-3 w-96"
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => {
                // Prevent editor from stealing focus when clicking in search panel
                e.stopPropagation();
            }}
            onClick={(e) => {
                // Prevent clicks from bubbling to editor
                e.stopPropagation();
            }}
        >
            {/* Search Input Row */}
            <div className="flex items-center gap-2 mb-2">
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Find in document..."
                    className="flex-1 px-3 py-1.5 text-sm bg-secondary border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent"
                />

                {/* Result Counter */}
                <div className="text-xs text-muted-foreground whitespace-nowrap min-w-[60px] text-center">
                    {searchTerm && (
                        resultCount > 0
                            ? `${currentPosition}/${resultCount}`
                            : 'No results'
                    )}
                </div>

                {/* Navigation Buttons */}
                <button
                    onClick={handlePrevious}
                    disabled={resultCount === 0}
                    className="p-1.5 hover:bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous (Shift+Enter)"
                >
                    <ChevronUp className="w-4 h-4" />
                </button>
                <button
                    onClick={handleNext}
                    disabled={resultCount === 0}
                    className="p-1.5 hover:bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next (Enter)"
                >
                    <ChevronDown className="w-4 h-4" />
                </button>

                {/* Toggle Replace */}
                <button
                    onClick={() => setShowReplace(!showReplace)}
                    className={`p-1.5 rounded ${showReplace ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'}`}
                    title="Toggle Replace"
                >
                    <Replace className="w-4 h-4" />
                </button>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-secondary rounded"
                    title="Close (Esc)"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Replace Input Row (conditional) */}
            {showReplace && (
                <div className="flex items-center gap-2 mb-2">
                    <input
                        type="text"
                        value={replaceTerm}
                        onChange={(e) => setReplaceTerm(e.target.value)}
                        placeholder="Replace with..."
                        className="flex-1 px-3 py-1.5 text-sm bg-secondary border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <button
                        onClick={handleReplace}
                        disabled={resultCount === 0 || currentIndex < 0}
                        className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        Replace
                    </button>
                    <button
                        onClick={handleReplaceAll}
                        disabled={resultCount === 0 || !replaceTerm}
                        className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        All
                    </button>
                </div>
            )}

            {/* Options Row */}
            <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground text-muted-foreground">
                    <input
                        type="checkbox"
                        checked={caseSensitive}
                        onChange={(e) => setCaseSensitive(e.target.checked)}
                        className="rounded border-border"
                    />
                    <span>Case sensitive</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground text-muted-foreground">
                    <input
                        type="checkbox"
                        checked={useRegex}
                        onChange={(e) => setUseRegex(e.target.checked)}
                        className="rounded border-border"
                    />
                    <span>Regex</span>
                </label>
            </div>

            {/* Keyboard Hints */}
            <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                <div className="flex justify-between">
                    <span>Enter: Next</span>
                    <span>Shift+Enter: Previous</span>
                    <span>Esc: Close</span>
                </div>
            </div>

            {/* Confirmation Dialog for Replace All */}
            <ConfirmDialog
                isOpen={showConfirm}
                title="Replace All Occurrences"
                message={`Replace all ${resultCount} occurrence${resultCount !== 1 ? 's' : ''} of "${searchTerm}" with "${replaceTerm}"?`}
                confirmLabel="Replace All"
                cancelLabel="Cancel"
                onConfirm={confirmReplaceAll}
                onCancel={() => setShowConfirm(false)}
                variant="warning"
            />
        </div>
    );
};
