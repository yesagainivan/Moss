import React, { useCallback } from 'react';
import { useAppStore } from '../../store/useStore';
import { usePaneStore } from '../../store/usePaneStore';
import { EditorLoader } from '../editor/EditorLoader';
import { RightPanel } from './RightPanel';
import { ResizableSplit } from './ResizableSplit';
import { EmptyState } from './EmptyState';

interface PaneViewProps {
    paneId: string;
    isActive: boolean;
}

/**
 * PaneView renders a single leaf pane with its editor
 * Optimized with React.memo to prevent unnecessary re-renders
 */
export const PaneView = React.memo(({ paneId, isActive }: PaneViewProps) => {
    // Optimized selector - only fetches this specific pane, not entire tree
    const pane = usePaneStore(
        useCallback(
            state => state.findPaneById(paneId),
            [paneId]
        )
    );
    const setActivePane = usePaneStore(state => state.setActivePane);
    const notes = useAppStore(state => state.notes);

    // Stable callback reference prevents child re-renders
    const handleClick = useCallback(() => {
        if (!isActive) {
            setActivePane(paneId);
        }
    }, [isActive, paneId, setActivePane]);

    if (!pane || pane.type !== 'leaf') {
        return null;
    }

    const tabs = pane.tabs || [];
    const activeTabId = pane.activeTabId;
    const activeTab = tabs.find(t => t.id === activeTabId);
    const noteId = activeTab?.noteId;
    const note = noteId ? notes[noteId] : null;

    const isBacklinksPanelOpen = useAppStore(state => state.isBacklinksPanelOpen);
    const setBacklinksPanelOpen = useAppStore(state => state.setBacklinksPanelOpen);
    const isOutlinePanelOpen = useAppStore(state => state.isOutlinePanelOpen);
    const setOutlinePanelOpen = useAppStore(state => state.setOutlinePanelOpen);

    return (
        <div
            className="flex-1 flex flex-row h-full overflow-hidden relative"
            onClick={handleClick}
        >
            {/* Active pane indicator dot */}
            {isActive && (
                <div className="absolute top-2 right-2 z-10 w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}

            <ResizableSplit
                side="right"
                initialSize={280}
                minSize={200}
                maxSize={600}
                isOpen={!!(noteId && note && (isOutlinePanelOpen || isBacklinksPanelOpen))}
                persistenceKey="right-sidebar-width"
                className="h-full w-full"
                mainContent={
                    <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
                        {noteId && note ? (
                            <EditorLoader noteId={noteId} paneId={paneId} />
                        ) : (
                            <EmptyState />
                        )}
                    </div>
                }
                sideContent={
                    <RightPanel
                        note={note}
                        isOutlineOpen={isOutlinePanelOpen}
                        isBacklinksOpen={isBacklinksPanelOpen}
                        setOutlineOpen={setOutlinePanelOpen}
                        setBacklinksOpen={setBacklinksPanelOpen}
                    />
                }
            />
        </div>
    );
});
