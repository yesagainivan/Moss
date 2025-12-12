import { useCallback } from 'react';
import { usePaneStore } from '../../store/usePaneStore';
import { TabItem } from './TabItem';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';

export const TabBar = () => {
    // Subscribe to the active pane directly so we re-render when its content (tabs) changes
    const activePane = usePaneStore(state => {
        const activeId = state.activePaneId;
        if (!activeId) return null;
        return state.paneIndex.get(activeId) || null;
    });

    const tabs = (activePane?.type === 'leaf' ? activePane.tabs : null) || [];
    const activeTabId = activePane?.type === 'leaf' ? activePane.activeTabId : null;

    const setActiveTab = usePaneStore(state => state.setPaneTab);
    const closeTab = usePaneStore(state => state.closeTab);
    const reorderTabs = usePaneStore(state => state.reorderTabs);

    // Configure sensors - require minimal movement to start drag
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required to start drag
            },
        })
    );

    const handleActivate = useCallback((id: string) => {
        if (activePane?.id) {
            setActiveTab(activePane.id, id);
        }
    }, [setActiveTab, activePane]);

    const handleClose = useCallback((id: string) => {
        closeTab(id);
    }, [closeTab]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id || !activePane?.id) return;

        const oldIndex = tabs.findIndex(tab => tab.id === active.id);
        const newIndex = tabs.findIndex(tab => tab.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Check if we're trying to move a pinned tab to unpinned section or vice versa
        const draggedTab = tabs[oldIndex];
        const targetTab = tabs[newIndex];

        // Prevent moving pinned tabs to unpinned section and vice versa
        if (draggedTab.isPinned !== targetTab.isPinned) return;

        // Reorder tabs
        const newTabs = [...tabs];
        const [removed] = newTabs.splice(oldIndex, 1);
        newTabs.splice(newIndex, 0, removed);

        reorderTabs(activePane.id, newTabs.map(t => t.id));
    }, [tabs, activePane, reorderTabs]);

    if (tabs.length === 0) return null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToHorizontalAxis]}
        >
            <SortableContext items={tabs.map(t => t.id)} strategy={horizontalListSortingStrategy}>
                <div className="flex items-center h-10 border-b border-border bg-card/50 overflow-x-auto no-scrollbar select-none">
                    {tabs.map((tab) => (
                        <TabItem
                            key={tab.id}
                            id={tab.id}
                            noteId={tab.noteId}
                            isActive={tab.id === activeTabId}
                            isPreview={tab.isPreview}
                            isPinned={tab.isPinned}
                            onActivate={handleActivate}
                            onClose={handleClose}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
};
