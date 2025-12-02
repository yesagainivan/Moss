import { useAppStore } from '../../store/useStore';
import { EditorLoader } from '../editor/EditorLoader';

interface PaneViewProps {
    paneId: string;
    isActive: boolean;
}

/**
 * PaneView renders a single leaf pane with its editor
 */
export const PaneView = ({ paneId, isActive }: PaneViewProps) => {
    const paneRoot = useAppStore(state => state.paneRoot);
    const findPaneById = useAppStore(state => state.findPaneById);
    const pane = findPaneById(paneId, paneRoot);

    const setActivePane = useAppStore(state => state.setActivePane);
    const notes = useAppStore(state => state.notes);

    if (!pane || pane.type !== 'leaf') {
        return null;
    }

    const tabs = pane.tabs || [];
    const activeTabId = pane.activeTabId;
    const activeTab = tabs.find(t => t.id === activeTabId);
    const noteId = activeTab?.noteId;
    const note = noteId ? notes[noteId] : null;

    const handleClick = () => {
        if (!isActive) {
            setActivePane(paneId);
        }
    };

    return (
        <div
            className={`flex-1 flex flex-col h-full overflow-hidden relative ${isActive ? 'border border-accent' : ''
                }`}
            onClick={handleClick}
        // className={`flex-1 flex flex-col h-full overflow-hidden relative ${isActive ? 'ring-2 ring-accent/50 ring-inset' : ''
        //     }`}
        // onClick={handleClick}
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
};
