import React, { useMemo } from 'react';
import { List, X, Circle } from 'lucide-react';
import styles from './OutlinePanel.module.css';
import { slugify } from '../../lib/slugify';

interface HeadingItem {
    level: number;
    text: string;
    line: number;
}

interface OutlinePanelProps {
    noteContent: string;
    isOpen: boolean;
    onClose: () => void;
}

export const OutlinePanel: React.FC<OutlinePanelProps> = ({
    noteContent,
    isOpen,
    onClose,
}) => {
    const headings = useMemo(() => {
        const items: HeadingItem[] = [];
        const lines = noteContent.split('\n');

        lines.forEach((line, index) => {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                items.push({
                    level: match[1].length,
                    text: match[2].trim(),
                    line: index + 1, // 1-indexed
                });
            }
        });

        return items;
    }, [noteContent]);

    const handleHeadingClick = (headingText: string) => {
        // Use the same slugify function that HeadingWithId extension uses
        const headingId = slugify(headingText);
        const element = document.getElementById(headingId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.title}>
                    <List size={16} />
                    <span>Outline</span>
                    <span className={styles.count}>{headings.length}</span>
                </div>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={16} />
                </button>
            </div>

            <div className={styles.content}>
                {headings.length > 0 ? (
                    <div className={styles.list}>
                        {headings.map((heading, index) => (
                            <div
                                key={`${heading.line}-${index}`}
                                className={`${styles.headingItem} ${styles[`level${heading.level}`]}`}
                                onClick={() => handleHeadingClick(heading.text)}
                            >
                                <Circle
                                    size={heading.level === 1 ? 8 : heading.level === 2 ? 6 : 4}
                                    className={styles.headingIcon}
                                    fill="currentColor"
                                />
                                <span className={styles.headingText}>{heading.text}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <List size={32} className={styles.emptyIcon} />
                        <span className={styles.emptyText}>No headings found</span>
                        <span className="text-xs text-muted-foreground">
                            Add headings to see the outline.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
