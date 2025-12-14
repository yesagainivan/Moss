import React, { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import * as Diff from 'diff';
import styles from './DiffContainer.module.css';

interface DiffContainerProps {
    originalText: string;
    generatedText: string;
    isStreaming: boolean;
    onAccept: () => void;
    onDiscard: () => void;
}

export const DiffContainer = ({
    originalText,
    generatedText,
    isStreaming,
    onAccept,
    onDiscard,
}: DiffContainerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-focus on mount for keyboard accessibility
    useEffect(() => {
        containerRef.current?.focus();
    }, []);

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onDiscard();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (!isStreaming) {
                onAccept();
            }
        }
    };

    // State for diffs to allow throttling
    const [diffs, setDiffs] = React.useState<Diff.Change[]>([]);

    // Throttle the expensive diff calculation
    useEffect(() => {
        // Initial calculation
        if (!diffs.length) {
            setDiffs(Diff.diffWords(originalText, generatedText));
        }

        const calculateDiff = setTimeout(() => {
            setDiffs(Diff.diffWords(originalText, generatedText));
        }, 100); // 100ms debounce/throttle-ish behavior for smooth updates

        return () => clearTimeout(calculateDiff);
    }, [originalText, generatedText]);

    return (
        <div
            ref={containerRef}
            className={styles.container}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <span className={styles.title}>AI Suggestion</span>
                    {isStreaming && (
                        <div className={styles.statusBadge}>
                            <Loader2 className={styles.loadingIcon} />
                            <span>Generating...</span>
                        </div>
                    )}
                </div>
                <div className={styles.shortcuts}>
                    <div className="hidden sm:block">
                        <kbd className={styles.key}>⌘ + ⏎</kbd> Accept
                        <span className="mx-1">•</span>
                        <kbd className={styles.key}>Esc</kbd> Discard
                    </div>
                </div>
            </div>

            {/* Split View */}
            <div className={styles.splitView}>
                {/* Original Pane */}
                <div className={`${styles.pane} ${styles.originalPane}`}>
                    <div className={styles.paneHeader}>
                        <span>Original</span>
                    </div>
                    <div className={styles.paneContent}>
                        {originalText || <span className={styles.emptyText}>Empty selection</span>}
                    </div>
                </div>

                {/* Generated Pane */}
                <div className={`${styles.pane} ${styles.generatedPane}`}>
                    <div className={styles.paneHeader}>
                        <span>Suggested</span>
                    </div>
                    <div className={styles.paneContent}>
                        {generatedText ? (
                            <>
                                {diffs.map((part, index) => {
                                    if (part.added) {
                                        return (
                                            <span key={index} className={styles.added}>
                                                {part.value}
                                            </span>
                                        );
                                    } else if (part.removed) {
                                        return null; // Don't show removed parts in generated view
                                    } else {
                                        return <span key={index} className={styles.unchanged}>{part.value}</span>;
                                    }
                                })}
                            </>
                        ) : (
                            <span className={`${styles.emptyText} ${styles.thinking} ${isStreaming ? styles.pulse : ''}`}>
                                {isStreaming ? 'Thinking...' : 'No output'}
                            </span>
                        )}
                        {/* Invisible element to scroll to bottom */}
                        <div ref={(el) => {
                            if (el && isStreaming) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'end' });
                            }
                        }} />
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className={styles.footer}>
                <button
                    onClick={onDiscard}
                    className={`${styles.button} ${styles.discardButton}`}
                >
                    Discard
                </button>
                <button
                    onClick={onAccept}
                    disabled={isStreaming}
                    className={`${styles.button} ${styles.acceptButton}`}
                >
                    {isStreaming ? (
                        <>
                            <Loader2 className={styles.loadingIcon} />
                            <span>Generating</span>
                        </>
                    ) : (
                        <>
                            <span>Accept Changes</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
