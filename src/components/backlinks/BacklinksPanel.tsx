import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Link2, X, FileText, Loader2 } from 'lucide-react';
import styles from './BacklinksPanel.module.css';
import { useAppStore } from '../../store/useStore';
import { useSettingsStore } from '../../store/useSettingsStore';

interface Backlink {
    source_path: string;
    source_title: string;
}

interface BacklinksPanelProps {
    noteId: string;
    isOpen: boolean;
    onClose: () => void;
    isEmbedded?: boolean;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({ noteId, isOpen, onClose, isEmbedded }) => {
    const [backlinks, setBacklinks] = useState<Backlink[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const vaultPath = useSettingsStore(state => state.currentVaultPath);
    const openNote = useAppStore(state => state.openNote);

    useEffect(() => {
        const fetchBacklinks = async () => {
            if (!vaultPath || !noteId) return;

            setIsLoading(true);
            try {
                // noteId is usually the relative path or absolute path depending on how it's stored
                // The backend expects the target path as it appears in the link.target
                // In graph.rs, we see that link targets are resolved to IDs.
                // We should pass the noteId which corresponds to the file path.

                const results = await invoke<Backlink[]>('get_backlinks', {
                    vaultPath,
                    notePath: noteId,
                });
                setBacklinks(results);
            } catch (error) {
                console.error('Failed to fetch backlinks:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen) {
            fetchBacklinks();
        }
    }, [noteId, vaultPath, isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className={styles.container}
            style={isEmbedded ? { width: '100%', borderLeft: 'none' } : undefined}
        >
            <div className={styles.header}>
                <div className={styles.title}>
                    <Link2 size={16} />
                    <span>Backlinks</span>
                    <span className={styles.count}>{backlinks.length}</span>
                </div>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={16} />
                </button>
            </div>

            <div className={styles.content}>
                {isLoading ? (
                    <div className={styles.loading}>
                        <Loader2 className={styles.spinner} size={20} />
                    </div>
                ) : backlinks.length > 0 ? (
                    <div className={styles.list}>
                        {backlinks.map((link, index) => (
                            <div
                                key={`${link.source_path}-${index}`}
                                className={styles.card}
                                onClick={() => openNote(link.source_path)}
                            >
                                <div className={styles.cardHeader}>
                                    <FileText size={14} className="text-muted-foreground" />
                                    <span className={styles.cardTitle}>{link.source_title}</span>
                                </div>
                                <div className={styles.cardPath}>{link.source_path}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <Link2 size={32} className={styles.emptyIcon} />
                        <span className={styles.emptyText}>No backlinks found</span>
                        <span className="text-xs text-muted-foreground">
                            Notes that link to this file will appear here.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
