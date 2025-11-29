import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, GitMerge, FileCode2, AlertTriangle } from 'lucide-react';
import * as Diff from 'diff';
import styles from './ConflictResolutionModal.module.css';

interface ConflictInfo {
    path: string;
    ancestor?: string;
    ours: string;
    theirs: string;
}

interface ConflictResolutionModalProps {
    conflicts: ConflictInfo[];
    onResolve: (filePath: string, resolution: 'ours' | 'theirs' | 'manual', customContent?: string) => Promise<void>;
    onComplete: () => Promise<void>;
    onCancel: () => void;
}

export function ConflictResolutionModal({
    conflicts,
    onResolve,
    onComplete,
    onCancel
}: ConflictResolutionModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [resolvedFiles, setResolvedFiles] = useState<Set<string>>(new Set());
    const [isManualEdit, setIsManualEdit] = useState(false);
    const [manualContent, setManualContent] = useState('');
    const [isResolving, setIsResolving] = useState(false);

    const currentConflict = conflicts[currentIndex];
    const allResolved = resolvedFiles.size === conflicts.length;

    const handleResolve = async (resolution: 'ours' | 'theirs' | 'manual') => {
        setIsResolving(true);
        try {
            const content = resolution === 'manual' ? manualContent : undefined;
            await onResolve(currentConflict.path, resolution, content);

            // Mark as resolved
            setResolvedFiles(prev => new Set(prev).add(currentConflict.path));
            setIsManualEdit(false);
            setManualContent('');

            // Move to next conflict if not last
            if (currentIndex < conflicts.length - 1) {
                setCurrentIndex(currentIndex + 1);
            }
        } catch (err) {
            console.error('Failed to resolve conflict:', err);
        } finally {
            setIsResolving(false);
        }
    };

    const startManualEdit = () => {
        setIsManualEdit(true);
        setManualContent(currentConflict.ours); // Start with "ours" as base
    };

    const handleCompleteMerge = async () => {
        if (!allResolved) return;

        setIsResolving(true);
        try {
            await onComplete();
        } catch (err) {
            console.error('Failed to complete merge:', err);
        } finally {
            setIsResolving(false);
        }
    };

    // Calculate diffs for highlighting
    const oursDiff = currentConflict.ancestor
        ? Diff.diffWords(currentConflict.ancestor, currentConflict.ours)
        : null;

    const theirsDiff = currentConflict.ancestor
        ? Diff.diffWords(currentConflict.ancestor, currentConflict.theirs)
        : null;

    const content = (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <GitMerge className={styles.headerIcon} />
                        <div>
                            <h2 className={styles.title}>Resolve Conflicts</h2>
                            <p className={styles.subtitle}>
                                {resolvedFiles.size} of {conflicts.length} resolved
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className={styles.closeButton}
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* File List */}
                <div className={styles.fileList}>
                    {conflicts.map((conflict, index) => (
                        <button
                            key={conflict.path}
                            onClick={() => setCurrentIndex(index)}
                            className={`${styles.fileItem} ${index === currentIndex ? styles.fileItemActive : ''} ${resolvedFiles.has(conflict.path) ? styles.fileItemResolved : ''}`}
                        >
                            {resolvedFiles.has(conflict.path) ? (
                                <Check className="w-4 h-4 text-success" />
                            ) : (
                                <AlertTriangle className="w-4 h-4 text-warning" />
                            )}
                            <FileCode2 className="w-4 h-4" />
                            <span className={styles.fileName}>{conflict.path}</span>
                        </button>
                    ))}
                </div>

                {/* Diff Viewer */}
                <div className={styles.diffContainer}>
                    {!isManualEdit ? (
                        <div className={styles.threePane}>
                            {/* Ancestor */}
                            {currentConflict.ancestor && (
                                <div className={styles.pane}>
                                    <div className={styles.paneLabel}>
                                        Ancestor (Common Base)
                                    </div>
                                    <div className={styles.paneContent}>
                                        {currentConflict.ancestor || <span className={styles.emptyText}>No common ancestor</span>}
                                    </div>
                                </div>
                            )}

                            {/* Ours (Local) */}
                            <div className={styles.pane}>
                                <div className={styles.paneLabel}>
                                    Ours (Local)
                                </div>
                                <div className={styles.paneContent}>
                                    {oursDiff ? (
                                        oursDiff.map((part, index) => (
                                            <span
                                                key={index}
                                                className={part.added ? styles.diffAdd : ('removed' in part && part.removed) ? styles.diffRemove : ''}
                                            >
                                                {part.value}
                                            </span>
                                        ))
                                    ) : (
                                        currentConflict.ours
                                    )}
                                </div>
                            </div>

                            {/* Theirs (Remote) */}
                            <div className={styles.pane}>
                                <div className={styles.paneLabel}>
                                    Theirs (Remote)
                                </div>
                                <div className={styles.paneContent}>
                                    {theirsDiff ? (
                                        theirsDiff.map((part, index) => (
                                            <span
                                                key={index}
                                                className={part.added ? styles.diffAdd : ('removed' in part && part.removed) ? styles.diffRemove : ''}
                                            >
                                                {part.value}
                                            </span>
                                        ))
                                    ) : (
                                        currentConflict.theirs
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.manualEdit}>
                            <div className={styles.paneLabel}>
                                Manual Resolution
                            </div>
                            <textarea
                                value={manualContent}
                                onChange={(e) => setManualContent(e.target.value)}
                                className={styles.manualTextarea}
                                placeholder="Edit the content to resolve the conflict..."
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    {!isManualEdit ? (
                        <>
                            <button
                                onClick={() => handleResolve('ours')}
                                disabled={isResolving || resolvedFiles.has(currentConflict.path)}
                                className={styles.buttonSecondary}
                            >
                                Keep Ours
                            </button>
                            <button
                                onClick={() => handleResolve('theirs')}
                                disabled={isResolving || resolvedFiles.has(currentConflict.path)}
                                className={styles.buttonSecondary}
                            >
                                Keep Theirs
                            </button>
                            <button
                                onClick={startManualEdit}
                                disabled={isResolving || resolvedFiles.has(currentConflict.path)}
                                className={styles.buttonSecondary}
                            >
                                Manual Edit
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    setIsManualEdit(false);
                                    setManualContent('');
                                }}
                                className={styles.buttonSecondary}
                            >
                                Cancel Edit
                            </button>
                            <button
                                onClick={() => handleResolve('manual')}
                                disabled={isResolving || !manualContent.trim()}
                                className={styles.buttonPrimary}
                            >
                                Apply Resolution
                            </button>
                        </>
                    )}
                </div>

                {/* Complete Merge Button */}
                {allResolved && (
                    <div className={styles.completeSection}>
                        <div className={styles.completeBanner}>
                            <Check className="w-5 h-5 text-success" />
                            <span>All conflicts resolved!</span>
                        </div>
                        <button
                            onClick={handleCompleteMerge}
                            disabled={isResolving}
                            className={styles.buttonComplete}
                        >
                            Complete Merge & Push
                        </button>
                    </div>
                )}

                {/* Keyboard Hints */}
                <div className={styles.hints}>
                    <kbd>O</kbd> Keep Ours • <kbd>T</kbd> Keep Theirs • <kbd>M</kbd> Manual • <kbd>Esc</kbd> Cancel
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
