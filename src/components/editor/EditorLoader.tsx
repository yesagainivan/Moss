import { Editor } from './Editor';
import { useAppStore } from '../../store/useStore';
import { useMemo } from 'react';

interface EditorLoaderProps {
    noteId: string;
    paneId?: string; // NEW: Pass paneId to editor
}

export const EditorLoader = ({ noteId, paneId }: EditorLoaderProps) => {
    // We read the content ONLY once when the component mounts (or noteId changes).
    // We do NOT subscribe to the store for content updates.
    // The Editor component itself handles internal state and updates.
    const initialContent = useMemo(() => {
        return useAppStore.getState().notes[noteId]?.content || '';
    }, [noteId]);

    return (
        <Editor
            key={noteId}
            noteId={noteId}
            initialContent={initialContent}
            paneId={paneId}
        />
    );
};
