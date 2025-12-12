import { usePaneStore } from '../../store/usePaneStore';
import { X, Pin, Copy, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import styles from './TabContextMenu.module.css';

interface TabContextMenuProps {
    tabId: string;
    isPinned: boolean;
    position: { x: number; y: number };
    onClose: () => void;
}

export const TabContextMenu = ({ tabId, isPinned, position, onClose }: TabContextMenuProps) => {
    const pinTab = usePaneStore(state => state.pinTab);
    const closeTab = usePaneStore(state => state.closeTab);
    const closeOtherTabs = usePaneStore(state => state.closeOtherTabs);
    const closeTabsToRight = usePaneStore(state => state.closeTabsToRight);
    const duplicateTab = usePaneStore(state => state.duplicateTab);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const handleAction = (action: () => void) => {
        action();
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className={styles['tab-context-menu']}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        >
            <button
                onClick={() => handleAction(() => pinTab(tabId))}
                className={styles['tab-context-menu-item']}
            >
                <Pin className="w-4 h-4" />
                {isPinned ? 'Unpin Tab' : 'Pin Tab'}
            </button>

            <button
                onClick={() => handleAction(() => duplicateTab(tabId))}
                className={styles['tab-context-menu-item']}
            >
                <Copy className="w-4 h-4" />
                Duplicate Tab
            </button>

            <div className={styles['tab-context-menu-separator']} />

            <button
                onClick={() => handleAction(() => closeTab(tabId))}
                className={`${styles['tab-context-menu-item']} ${styles.destructive}`}
            >
                <X className="w-4 h-4" />
                Close Tab
            </button>

            <button
                onClick={() => handleAction(() => closeOtherTabs(tabId))}
                className={styles['tab-context-menu-item']}
            >
                <XCircle className="w-4 h-4" />
                Close Other Tabs
            </button>

            <button
                onClick={() => handleAction(() => closeTabsToRight(tabId))}
                className={styles['tab-context-menu-item']}
            >
                <XCircle className="w-4 h-4" />
                Close Tabs to Right
            </button>
        </div>
    );
};
