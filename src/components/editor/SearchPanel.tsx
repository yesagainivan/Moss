import { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { X, ChevronUp, ChevronDown, Replace } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import styles from './SearchPanel.module.css';

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
        setShowConfirm(true);
    }, [editor, replaceTerm, resultCount]);

    const confirmReplaceAll = useCallback(() => {
        if (!editor || showConfirm === false) return; // Guard against double-trigger

        setShowConfirm(false); // Close dialog immediately
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
            className={styles.searchPanel}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Search Input Row */}
            <div className={styles.searchRow}>
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Find in document..."
                    className={styles.searchPanelInput}
                />

                {/* Result Counter */}
                <div className={styles.searchPanelCounter}>
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
                    className={styles.searchPanelNavBtn}
                    title="Previous (Shift+Enter)"
                >
                    <ChevronUp className="w-4 h-4" />
                </button>
                <button
                    onClick={handleNext}
                    disabled={resultCount === 0}
                    className={styles.searchPanelNavBtn}
                    title="Next (Enter)"
                >
                    <ChevronDown className="w-4 h-4" />
                </button>

                {/* Toggle Replace */}
                <button
                    onClick={() => setShowReplace(!showReplace)}
                    className={`${styles.searchPanelToggleBtn} ${showReplace ? styles.searchPanelToggleBtnActive : styles.searchPanelToggleBtnInactive}`}
                    title="Toggle Replace"
                >
                    <Replace className="w-4 h-4" />
                </button>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className={styles.searchPanelNavBtn}
                    title="Close (Esc)"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Replace Input Row (conditional) */}
            {showReplace && (
                <div className={styles.searchRow}>
                    <input
                        type="text"
                        value={replaceTerm}
                        onChange={(e) => setReplaceTerm(e.target.value)}
                        placeholder="Replace with..."
                        className={styles.searchPanelInput}
                    />
                    <button
                        onClick={handleReplace}
                        disabled={resultCount === 0 || currentIndex < 0}
                        className={styles.searchPanelActionBtn}
                    >
                        Replace
                    </button>
                    <button
                        onClick={handleReplaceAll}
                        disabled={resultCount === 0 || !replaceTerm}
                        className={styles.searchPanelActionBtn}
                    >
                        All
                    </button>
                </div>
            )}

            {/* Options Row */}
            <div className="flex items-center gap-3 text-xs">
                <label className={styles.searchPanelOptionLabel}>
                    <input
                        type="checkbox"
                        checked={caseSensitive}
                        onChange={(e) => setCaseSensitive(e.target.checked)}
                        className={styles.searchPanelCheckbox}
                    />
                    <span>Case sensitive</span>
                </label>
                {/* <label className="search-panel-option-label"> */}
                <label className={styles.searchPanelOptionLabel}>
                    <input
                        type="checkbox"
                        checked={useRegex}
                        onChange={(e) => setUseRegex(e.target.checked)}
                        className={styles.searchPanelCheckbox}
                    />
                    <span>Regex</span>
                </label>
            </div>

            {/* Keyboard Hints */}
            <div className={styles.searchPanelHints}>
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
