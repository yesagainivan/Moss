import { useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { useAppStore } from '../../store/useStore';
import { FileNode } from '../../types';
import { File, Search } from 'lucide-react';
import { useCommandRegistry } from '../../hooks/useCommandRegistry';
import { useRecentFiles } from '../../hooks/useRecentFiles';
import { CommandCategory } from '../../types/CommandTypes';

export const CommandPalette = () => {
    const isOpen = useAppStore(state => state.isCommandPaletteOpen);
    const setIsOpen = useAppStore(state => state.setCommandPaletteOpen);
    const fileTree = useAppStore(state => state.fileTree);
    const openNote = useAppStore(state => state.openNote);
    const [isClosing, setIsClosing] = useState(false);
    const [search, setSearch] = useState('');

    const commands = useCommandRegistry();
    const recentFiles = useRecentFiles();

    // Determine mode based on search input
    const isCommandMode = search.startsWith('>');
    const searchQuery = isCommandMode ? search.slice(1).trim() : search.trim();

    // Handle close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setIsOpen(false);
            setSearch(''); // Reset search

            // Restore focus to editor after closing
            setTimeout(() => {
                const editorElement = document.querySelector('.ProseMirror');
                if (editorElement instanceof HTMLElement) {
                    editorElement.focus();
                }
            }, 100);
        }, 50);
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

    // Get recent files that still exist in file tree
    const validRecentFiles = useMemo(() => {
        return recentFiles
            .map(recent => allFiles.find(f => f.noteId === recent.noteId || f.path === recent.noteId))
            .filter((f): f is FileNode => f !== undefined)
            .slice(0, 5); // Show top 5 recent files
    }, [recentFiles, allFiles]);

    // Filter files excluding recent ones
    const otherFiles = useMemo(() => {
        const recentNoteIds = new Set(validRecentFiles.map(f => f.noteId || f.path));
        return allFiles.filter(f => !recentNoteIds.has(f.noteId || f.path || ''));
    }, [allFiles, validRecentFiles]);

    // Group commands by category
    const commandsByCategory = useMemo(() => {
        const grouped = commands.reduce((acc, cmd) => {
            if (!acc[cmd.category]) {
                acc[cmd.category] = [];
            }
            acc[cmd.category].push(cmd);
            return acc;
        }, {} as Record<CommandCategory, typeof commands>);

        return grouped;
    }, [commands]);

    const categoryOrder = [
        CommandCategory.Navigation,
        CommandCategory.Files,
        CommandCategory.Git,
        CommandCategory.Tabs,
        CommandCategory.Editor,
        CommandCategory.Settings,
        CommandCategory.Folders,
    ];

    if (!isOpen && !isClosing) return null;

    return (
        <div className="command-palette-overlay">
            <div
                className="command-palette-backdrop"
                onClick={handleClose}
            />
            <div className={`command-palette-container ${isClosing ? 'modal-exit' : ''}`}>
                <Command className="w-full" shouldFilter={false}>
                    <div className="command-palette-input-wrapper" cmdk-input-wrapper="">
                        <Search className="command-palette-search-icon" />
                        <Command.Input
                            autoFocus
                            placeholder={isCommandMode ? "Search commands..." : "Search notes or type '>' for commands..."}
                            className="command-palette-input"
                            value={search}
                            onValueChange={setSearch}
                        />
                    </div>
                    <Command.List className="command-palette-list">
                        <Command.Empty className="command-palette-empty">
                            {isCommandMode ? 'No commands found.' : 'No notes found.'}
                        </Command.Empty>

                        {/* FILE MODE */}
                        {!isCommandMode && (
                            <>
                                {/* Recent Files */}
                                {validRecentFiles.length > 0 && searchQuery === '' && (
                                    <Command.Group heading="Recent Files" className="command-palette-group">
                                        {validRecentFiles.map((file) => (
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
                                    </Command.Group>
                                )}

                                {/* All Files */}
                                <Command.Group
                                    heading={validRecentFiles.length > 0 && searchQuery === '' ? "All Files" : "Files"}
                                    className="command-palette-group"
                                >
                                    {otherFiles
                                        .filter(file => {
                                            if (!searchQuery) return true;
                                            const name = file.name.toLowerCase();
                                            const path = (file.path || '').toLowerCase();
                                            const query = searchQuery.toLowerCase();
                                            return name.includes(query) || path.includes(query);
                                        })
                                        .map((file) => (
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
                                </Command.Group>
                            </>
                        )}

                        {/* COMMAND MODE */}
                        {isCommandMode && categoryOrder.map(category => {
                            const categoryCommands = commandsByCategory[category] || [];
                            if (categoryCommands.length === 0) return null;

                            // Filter commands by search query
                            const filteredCommands = categoryCommands.filter(cmd => {
                                if (!searchQuery) return true;
                                const query = searchQuery.toLowerCase();
                                return (
                                    cmd.label.toLowerCase().includes(query) ||
                                    (cmd.description?.toLowerCase().includes(query) || false)
                                );
                            });

                            if (filteredCommands.length === 0) return null;

                            return (
                                <Command.Group key={category} heading={category} className="command-palette-group">
                                    {filteredCommands.map(cmd => {
                                        const Icon = cmd.icon;
                                        return (
                                            <Command.Item
                                                key={cmd.id}
                                                value={cmd.label}
                                                onSelect={async () => {
                                                    await cmd.action();
                                                    handleClose();
                                                }}
                                                className="command-palette-item command-palette-command-item"
                                            >
                                                <Icon className="command-palette-item-icon" />
                                                <div className="command-palette-item-content">
                                                    <span className="command-palette-item-name">{cmd.label}</span>
                                                    {cmd.description && (
                                                        <span className="command-palette-item-description">
                                                            {cmd.description}
                                                        </span>
                                                    )}
                                                </div>
                                                {cmd.shortcut && (
                                                    <span className="command-palette-item-shortcut">
                                                        {cmd.shortcut}
                                                    </span>
                                                )}
                                            </Command.Item>
                                        );
                                    })}
                                </Command.Group>
                            );
                        })}
                    </Command.List>
                </Command>
            </div>
        </div>
    );
};
