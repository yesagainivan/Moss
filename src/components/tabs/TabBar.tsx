import { useCallback } from 'react';
import { usePaneStore } from '../../store/usePaneStore';
import { TabItem } from './TabItem';

export const TabBar = () => {
    // Subscribe to paneRoot to react to changes
    const activePaneId = usePaneStore(state => state.activePaneId);
    const findPaneById = usePaneStore(state => state.findPaneById);

    const activePane = activePaneId ? findPaneById(activePaneId) : null;
    const tabs = (activePane?.type === 'leaf' ? activePane.tabs : null) || [];
    const activeTabId = activePane?.type === 'leaf' ? activePane.activeTabId : null;

    const setActiveTab = usePaneStore(state => state.setPaneTab);
    const closeTab = usePaneStore(state => state.closeTab);

    const handleActivate = useCallback((id: string) => {
        if (activePaneId) {
            setActiveTab(activePaneId, id);
        }
    }, [setActiveTab, activePaneId]);

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
                    isPreview={tab.isPreview}
                    onActivate={handleActivate}
                    onClose={handleClose}
                />
            ))}
        </div>
    );
};
