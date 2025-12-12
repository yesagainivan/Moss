import React from 'react';
import { Note } from '../../types';
import { ResizableSplit } from './ResizableSplit';
import { OutlinePanel } from '../outline/OutlinePanel';
import { BacklinksPanel } from '../backlinks/BacklinksPanel';

interface RightPanelProps {
    note: Note | null;
    isOutlineOpen: boolean;
    isBacklinksOpen: boolean;
    setOutlineOpen: (open: boolean) => void;
    setBacklinksOpen: (open: boolean) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
    note,
    isOutlineOpen,
    isBacklinksOpen,
    setOutlineOpen,
    setBacklinksOpen,
}) => {
    if (!note) return null;
    if (!isOutlineOpen && !isBacklinksOpen) return null;

    // Determine content for panels
    const outlineContent = (
        <OutlinePanel
            noteContent={note.content}
            isOpen={true} // Always open inside its container
            isEmbedded={true}
            onClose={() => setOutlineOpen(false)}
        />
    );

    const backlinksContent = (
        <BacklinksPanel
            noteId={note.id}
            isOpen={true}
            isEmbedded={true} // Add this prop to BacklinksPanel to remove absolute positioning if needed
            onClose={() => setBacklinksOpen(false)}
        />
    );

    // If both open, split vertically
    if (isOutlineOpen && isBacklinksOpen) {
        return (
            <ResizableSplit
                side="top"
                initialSize={300} // Default height for top panel
                minSize={100}
                maxSize={800}
                mainContent={backlinksContent} // Bottom
                sideContent={outlineContent}   // Top
                className="h-full"
                persistenceKey="right-panel-vertical-split"
            />
        );
    }

    // Otherwise render single panel
    return (
        <div className="h-full w-full overflow-hidden">
            {isOutlineOpen ? outlineContent : backlinksContent}
        </div>
    );
};
