import { useEffect, useState } from 'react';
import { X, Clock, GitCommit, RotateCcw, ArrowLeft, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { useGitStore } from '../../store/useGitStore';
import { CommitInfo } from '../../types';
import * as Diff from 'diff';
import styles from './NoteHistoryModal.module.css';

interface NoteHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    notePath: string;
}

export const NoteHistoryModal = ({ isOpen, onClose, notePath }: NoteHistoryModalProps) => {
    const { forceSaveNote, updateNote, requestConfirmation } = useAppStore();
    const { getNoteHistory, getNoteContentAtCommit } = useGitStore();
    const [history, setHistory] = useState<CommitInfo[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null);
    const [commitContent, setCommitContent] = useState<string | null>(null);
    const [parentContent, setParentContent] = useState<string | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [viewMode, setViewMode] = useState<'diff' | 'source'>('diff');
    const [isClosing, setIsClosing] = useState(false);

    // Handle close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 50); // Match animation duration
    };

    // Fetch history when modal opens
    useEffect(() => {
        if (isOpen && notePath) {
            loadHistory();
        } else {
            // Reset state when closed
            setHistory([]);
            setSelectedCommit(null);
            setCommitContent(null);
            setParentContent(null);
        }
    }, [isOpen, notePath]);

    // Load content when commit selected
    useEffect(() => {
        if (selectedCommit && notePath) {
            loadCommitContent(selectedCommit);
        }
    }, [selectedCommit, notePath]);

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
    }, [isOpen]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const commits = await getNoteHistory(notePath);
            setHistory(commits);
            // Select first commit by default
            if (commits.length > 0) {
                setSelectedCommit(commits[0]);
            }

        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const loadCommitContent = async (commit: CommitInfo) => {
        setIsLoadingContent(true);
        try {
            // Fetch content at this commit
            try {
                const content = await getNoteContentAtCommit(notePath, commit.oid);
                setCommitContent(content);
            } catch (error) {
                // File doesn't exist in this commit (expected for commits before file creation)
                setCommitContent('');
                setParentContent('');
                setIsLoadingContent(false);
                return;
            }

            // Fetch content at parent commit (to show diff)
            const index = history.findIndex(c => c.oid === commit.oid);
            if (index !== -1 && index < history.length - 1) {
                const parent = history[index + 1];
                try {
                    const pContent = await getNoteContentAtCommit(notePath, parent.oid);
                    setParentContent(pContent);
                } catch (error) {
                    // File doesn't exist in parent commit (expected for initial file creation)
                    setParentContent('');
                }
            } else {
                setParentContent('');
            }
        } catch (error) {
            console.error('Unexpected error loading commit content:', error);
            setCommitContent('Error loading content');
        } finally {
            setIsLoadingContent(false);
        }
    };

    const handleRestore = async () => {
        if (!selectedCommit || !commitContent) return;

        const confirmed = await requestConfirmation(
            `Are you sure you want to restore this version? This will overwrite your current note.`
        );

        if (confirmed) {
            try {
                // Trigger editor refresh if note is currently open
                // CRITICAL: Dispatch this BEFORE updating store/saving to ensure
                // the Editor component cancels its pending debounced save.
                window.dispatchEvent(new CustomEvent('note-updated-externally', {
                    detail: { noteId: notePath, content: commitContent }
                }));

                // Use the full notePath directly - it's already the absolute path
                // CRITICAL: Update store state first to cancel any pending debounced saves
                // This prevents a race condition where a pending save overwrites the restore
                updateNote(notePath, commitContent);
                await forceSaveNote(notePath);

                handleClose();
            } catch (error) {
                console.error('Failed to restore note:', error);
                alert(`Failed to restore note: ${error instanceof Error ? error.message : 'Unknown error'}`);
                // Keep modal open so user can retry or investigate
            }
        }
    };

    if (!isOpen && !isClosing) return null;

    // Calculate diffs
    const diffs = (parentContent !== null && commitContent !== null)
        ? Diff.diffLines(parentContent, commitContent)
        : [];

    return (
        <div className="modal-backdrop" onClick={handleClose}>
            <div
                // className={`${styles.modalPanel} grain-overlay ${isClosing ? styles.modalPanelExit : ''}`}
                className={`${styles.modalPanel} ${isClosing ? styles.modalPanelExit : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className="flex items-center gap-3">
                        <div className={styles.headerIcon}>
                            <Clock className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h2 className={styles.headerTitle}>Version History</h2>
                            <p className={styles.headerSubtitle}>{notePath.split('/').pop()}</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className={styles.closeButton}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar: Commit List */}
                    <div className={styles.sidebar}>
                        {isLoadingHistory ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                                <GitCommit className="w-8 h-8 mb-2 opacity-50" />
                                <p>No history found</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto">
                                {history.map((commit) => (
                                    <button
                                        key={commit.oid}
                                        onClick={() => setSelectedCommit(commit)}
                                        className={`${styles.commitButton} ${selectedCommit?.oid === commit.oid ? styles.commitButtonSelected : ''}`}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <span className={`${styles.commitAuthor} ${commit.is_mosaic ? styles.commitAuthorMosaic : styles.commitAuthorUser}`}>
                                                {commit.is_mosaic ? 'Mosaic' : commit.author}
                                            </span>
                                            <span className={styles.commitDate}>
                                                {new Date(commit.timestamp * 1000).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className={styles.commitMessage}>{commit.message}</p>
                                        <p className={styles.commitOid}>
                                            {commit.oid.substring(0, 7)}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Content: Diff/Source View */}
                    <div className="flex-1 flex flex-col bg-transparent">
                        {selectedCommit ? (
                            <>
                                {/* Toolbar */}
                                <div className={styles.toolbar}>
                                    <div className={styles.viewModeToggle}>
                                        <button
                                            onClick={() => setViewMode('diff')}
                                            className={`${styles.viewModeButton} ${viewMode === 'diff' ? styles.viewModeButtonActive : ''}`}
                                        >
                                            Changes
                                        </button>
                                        <button
                                            onClick={() => setViewMode('source')}
                                            className={`${styles.viewModeButton} ${viewMode === 'source' ? styles.viewModeButtonActive : ''}`}
                                        >
                                            Source
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleRestore}
                                        className={styles.restoreButton}
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Restore this version
                                    </button>
                                </div>

                                {/* Content Area */}
                                <div className={styles.contentArea}>
                                    {isLoadingContent ? (
                                        <div className="h-full flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : viewMode === 'source' ? (
                                        <div className={styles.sourceView}>
                                            <pre>{commitContent}</pre>
                                        </div>
                                    ) : (
                                        <div className={styles.diffContainer}>
                                            {diffs.map((part, index) => {
                                                const className = part.added
                                                    ? styles.diffLineAdded
                                                    : part.removed
                                                        ? styles.diffLineRemoved
                                                        : styles.diffLineUnchanged;

                                                const prefix = part.added ? '+' : part.removed ? '-' : ' ';

                                                return (
                                                    <div key={index} className={className}>
                                                        <span className={styles.diffPrefix}>{prefix}</span>
                                                        <span>{part.value}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                                <ArrowLeft className="w-8 h-8 mb-2 opacity-50" />
                                <p>Select a version to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
