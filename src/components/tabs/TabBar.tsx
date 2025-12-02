import { useCallback } from 'react';
import { useAppStore } from '../../store/useStore';
import { TabItem } from './TabItem';

export const TabBar = () => {
    // Subscribe to paneRoot to react to changes
    const paneRoot = useAppStore(state => state.paneRoot);
    const activePaneId = useAppStore(state => state.activePaneId);
    const findPaneById = useAppStore(state => state.findPaneById);

    const activePane = activePaneId ? findPaneById(activePaneId, paneRoot) : null;
    const tabs = (activePane?.type === 'leaf' ? activePane.tabs : null) || [];
    const activeTabId = activePane?.type === 'leaf' ? activePane.activeTabId : null;

    const setActiveTab = useAppStore(state => state.setActiveTab);
    const closeTab = useAppStore(state => state.closeTab);

    const handleActivate = useCallback((id: string) => {
        setActiveTab(id);
    }, [setActiveTab]);

    const handleClose = useCallback((id: string) => {
        closeTab(id);
    }, [closeTab]);

    if (tabs.length === 0) return null;

    return (
        <div className="flex items-center h-10 border-b border-border bg-card/50 overflow-x-auto no-scrollbar select-none">
            {tabs.map((tab) => (
                <TabItem
                    key={tab.id}
                    id={tab.id}
                    noteId={tab.noteId}
                    isActive={tab.id === activeTabId}
                    isDirty={tab.isDirty}
                    isPreview={tab.isPreview}
                    onActivate={handleActivate}
                    onClose={handleClose}
                />
            ))}
        </div>
    );
};
