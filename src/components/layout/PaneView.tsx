import React, { useCallback } from 'react';
import { useAppStore } from '../../store/useStore';
import { EditorLoader } from '../editor/EditorLoader';

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
    const pane = useAppStore(
        useCallback(
            state => state.findPaneById(paneId),
            [paneId]
        )
    );
    const setActivePane = useAppStore(state => state.setActivePane);
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

    return (
        <div
            className={`flex-1 flex flex-col h-full overflow-hidden relative ${isActive ? 'border border-accent' : ''
                }`}
            onClick={handleClick}
        >
            {noteId && note ? (
                <EditorLoader noteId={noteId} paneId={paneId} />
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                        <h3 className="text-lg font-medium mb-2">No note open</h3>
                        <p className="text-sm">Select a note from the sidebar or create a new one.</p>
                    </div>
                </div>
            )}
        </div>
    );
});
