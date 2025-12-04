import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useStore';
import { usePaneStore } from '../store/usePaneStore';
import { RecentFile } from '../types/CommandTypes';

const MAX_RECENT_FILES = 10;
const STORAGE_KEY = 'moss-recent-files';

export const useRecentFiles = () => {
    const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
    const activePaneId = usePaneStore(state => state.activePaneId);
    const paneIndex = usePaneStore(state => state.paneIndex);
    const activePane = paneIndex.get(activePaneId || '');
    const activeTabId = activePane?.activeTabId;
    const tabs = activePane?.tabs || [];
    const fileTree = useAppStore(state => state.fileTree);

    // Load recent files from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as RecentFile[];
                setRecentFiles(parsed);
            } catch (e) {
                console.error('Failed to parse recent files:', e);
            }
        }
    }, []);

    // Track when active tab changes and update recent files
    useEffect(() => {
        if (!activeTabId) return;

        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab || !activeTab.noteId) return;

        const noteId = activeTab.noteId;
        const fileNode = fileTree.find(node => node.noteId === noteId || node.path === noteId);
        if (!fileNode) return;

        const name = fileNode.name;
        const path = fileNode.path || '';

        // Update recent files list
        setRecentFiles(prev => {
            // Remove existing entry if present
            const filtered = prev.filter(f => f.noteId !== noteId);

            // Add to front
            const updated = [
                { noteId, name, path, timestamp: Date.now() },
                ...filtered
            ].slice(0, MAX_RECENT_FILES);

            // Persist to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

            return updated;
        });
    }, [activeTabId, tabs, fileTree]);

    return recentFiles;
};
