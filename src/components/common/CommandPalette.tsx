import { useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { useAppStore } from '../../store/useStore';
import { FileNode } from '../../types';
import { File, Search } from 'lucide-react';

export const CommandPalette = () => {
    const isOpen = useAppStore(state => state.isCommandPaletteOpen);
    const setIsOpen = useAppStore(state => state.setCommandPaletteOpen);
    const fileTree = useAppStore(state => state.fileTree);
    const openNote = useAppStore(state => state.openNote);
    const [isClosing, setIsClosing] = useState(false);

    // Handle close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setIsOpen(false);

            // Restore focus to editor after closing
            // Find the ProseMirror editor and focus it
            setTimeout(() => {
                const editorElement = document.querySelector('.ProseMirror');
                if (editorElement instanceof HTMLElement) {
                    editorElement.focus();
                }
            }, 100); // Delay to ensure palette is fully closed
        }, 50); // Match animation duration
    };

    // Toggle with Cmd+P
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (isOpen) {
                    handleClose();
                } else {
                    setIsOpen(true);
                }
            }
            // Close on Escape
            if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                handleClose();
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [isOpen, setIsOpen]);

    // Flatten file tree to get all files
    const allFiles = useMemo(() => {
        const files: FileNode[] = [];
        const traverse = (nodes: FileNode[]) => {
            nodes.forEach(node => {
                if (node.type === 'file') {
                    files.push(node);
                }
                if (node.children) {
                    traverse(node.children);
                }
            });
        };
        traverse(fileTree);
        return files;
    }, [fileTree]);

    if (!isOpen && !isClosing) return null;

    return (
        <div className="command-palette-overlay">
            <div
                className="command-palette-backdrop"
                onClick={handleClose}
            />
            <div className={`command-palette-container ${isClosing ? 'modal-exit' : ''}`}>
                <Command className="w-full">
                    <div className="command-palette-input-wrapper" cmdk-input-wrapper="">
                        <Search className="command-palette-search-icon" />
                        <Command.Input
                            autoFocus
                            placeholder="Search notes..."
                            className="command-palette-input"
                        />
                    </div>
                    <Command.List className="command-palette-list">
                        <Command.Empty className="command-palette-empty">
                            No notes found.
                        </Command.Empty>
                        {allFiles.map((file) => (
                            <Command.Item
                                key={file.id}
                                value={file.path || file.name}
                                onSelect={() => {
                                    if (file.noteId) {
                                        openNote(file.noteId);
                                        handleClose();
                                    }
                                }}
                                className="command-palette-item"
                            >
                                <File className="command-palette-item-icon" />
                                <span className="command-palette-item-name">{file.name}</span>
                                {file.path && (
                                    <span className="command-palette-item-path">
                                        {file.path.split('/').slice(0, -1).join('/').split('/').pop()}
                                    </span>
                                )}
                            </Command.Item>
                        ))}
                    </Command.List>
                </Command>
            </div>
        </div>
    );
};
