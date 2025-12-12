import { useEffect, useState } from 'react';
import { X, Command, FileText, RefreshCw, Layout } from 'lucide-react';
import styles from './ShortcutsModal.module.css';

export const ShortcutsModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-shortcuts-modal', handleOpen);
        return () => window.removeEventListener('open-shortcuts-modal', handleOpen);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    const categories = [
        {
            title: 'General',
            icon: <Command className={styles.categoryIcon} />,
            shortcuts: [
                { keys: ['Cmd', 'Shift', 'F'], description: 'Global Search' },
                { keys: ['Cmd', 'P'], description: 'Command Palette' },
                { keys: ['Cmd', ','], description: 'Settings' },
                { keys: ['Cmd', '/'], description: 'Show Shortcuts' },
            ]
        },
        {
            title: 'Editor',
            icon: <FileText className={styles.categoryIcon} />,
            shortcuts: [
                { keys: ['Cmd', 'S'], description: 'Save Note' },
                { keys: ['Cmd', 'K'], description: 'AI Assistant' },
                { keys: ['Cmd', 'F'], description: 'Find in Note' },
                { keys: ['Cmd', 'Click'], description: 'Open Link' },
            ]
        },
        {
            title: 'Navigation',
            icon: <RefreshCw className={styles.categoryIcon} />,
            shortcuts: [
                { keys: ['Cmd', '['], description: 'Go Back' },
                { keys: ['Cmd', ']'], description: 'Go Forward' },
                { keys: ['Cmd', 'Shift', 'D'], description: 'Daily Note' },
                { keys: ['Cmd', 'H'], description: 'Note History' },
            ]
        },
        {
            title: 'Layout',
            icon: <Layout className={styles.categoryIcon} />,
            shortcuts: [
                { keys: ['Cmd', 'B'], description: 'Toggle Sidebar' },
                { keys: ['Cmd', 'Opt', 'B'], description: 'Toggle Backlinks' },
                { keys: ['Cmd', 'Opt', 'O'], description: 'Toggle Outline' },
                { keys: ['Cmd', '\\'], description: 'Split Vertically' },
            ]
        }
    ];

    return (
        <>
            {isOpen && (
                <div
                    className={styles.overlay}
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className={styles.modal}
                    >
                        <div className={styles.header}>
                            <div className={styles.headerContent}>
                                <div className={styles.iconWrapper}>
                                    <Command className={styles.icon} />
                                </div>
                                <div>
                                    <h2 className={styles.title}>Keyboard Shortcuts</h2>
                                    <p className={styles.subtitle}>Master the keyboard to work faster</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className={styles.closeButton}
                            >
                                <X className={styles.closeIcon} />
                            </button>
                        </div>

                        <div className={`${styles.content} custom-scrollbar`}>
                            {categories.map((category) => (
                                <div key={category.title} className={styles.category}>
                                    <div className={styles.categoryHeader}>
                                        {category.icon}
                                        {category.title}
                                    </div>
                                    <div className={styles.shortcutList}>
                                        {category.shortcuts.map((shortcut, idx) => (
                                            <div key={idx} className={styles.shortcutItem}>
                                                <span className={styles.shortcutDescription}>
                                                    {shortcut.description}
                                                </span>
                                                <div className={styles.keys}>
                                                    {shortcut.keys.map((key, keyIdx) => (
                                                        <div key={keyIdx} className={styles.keyWrapper}>
                                                            <kbd className={styles.key}>
                                                                {key}
                                                            </kbd>
                                                            {keyIdx < shortcut.keys.length - 1 && (
                                                                <span className={styles.plus}>+</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.footer}>
                            Press <kbd className={styles.footerKey}>Esc</kbd> to close
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
