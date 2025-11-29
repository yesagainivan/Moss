import React, { useRef, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import * as Diff from 'diff';

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

    // Calculate unified diff for inline display
    const diffs = Diff.diffWords(originalText, generatedText);

    return (
        <div
            ref={containerRef}
            className="diff-container grain-overlay"
            style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
            }}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            {/* Header */}
            <div className="diff-header">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">AI Assistant</span>
                    {isStreaming && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                </div>
                <button
                    onClick={onDiscard}
                    className="p-1 hover:bg-secondary rounded transition-colors"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Diff Content - Side by Side */}
            <div className="diff-content">
                <div className="diff-pane">
                    <div className="diff-pane-label">Original</div>
                    <div className="diff-pane-text diff-original">
                        {originalText || <span className="text-muted-foreground italic">Empty</span>}
                    </div>
                </div>
                <div className="diff-pane">
                    <div className="diff-pane-label">Generated</div>
                    <div className="diff-pane-text diff-generated">
                        {generatedText ? (
                            <>
                                {diffs.map((part, index) => {
                                    if (part.added) {
                                        return (
                                            <span key={index} className="diff-add">
                                                {part.value}
                                            </span>
                                        );
                                    } else if (part.removed) {
                                        return null; // Don't show removed parts in generated view
                                    } else {
                                        return <span key={index}>{part.value}</span>;
                                    }
                                })}
                            </>
                        ) : (
                            <span className="text-muted-foreground italic">
                                {isStreaming ? 'Generating...' : 'No output'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="diff-actions">
                <button
                    onClick={onDiscard}
                    className="diff-button diff-button-secondary"
                >
                    Discard
                </button>
                <button
                    onClick={onAccept}
                    disabled={isStreaming}
                    className="diff-button diff-button-primary"
                >
                    Accept {!isStreaming && '✓'}
                </button>
            </div>

            {/* Keyboard hint */}
            <div className="diff-hint">
                <kbd>Cmd/Ctrl+Enter</kbd> Accept • <kbd>Esc</kbd> Discard
            </div>
        </div>
    );
};
