import React, { useState, useMemo, useCallback } from 'react';
import { useAppStore, useFileActions } from '../../store/useStore';
import { usePaneStore } from '../../store/usePaneStore';
import { Plus, File, Edit2, FolderOpen, FolderPlus, Folder, Trash2, GripVertical, Network, Keyboard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { checkExists } from '../../lib/fs';
import { FileNode } from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, DragStartEvent, pointerWithin, useDraggable, useDroppable } from '@dnd-kit/core';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { TagsPanel } from '../tags/TagsPanel';

// ... (existing code)

interface ContextMenuProps {
    x: number;
    y: number;
    nodeType: 'file' | 'folder';
    onClose: () => void;
    onRename?: () => void;
    onDelete: () => void;
    onNewNote?: () => void;
    onNewFolder?: () => void;
}

const ContextMenu = ({ x, y, nodeType, onClose, onRename, onDelete, onNewNote, onNewFolder }: ContextMenuProps) => {
    return (
        <>
            <div className="context-menu-backdrop" onClick={onClose} />
            <div
                className="context-menu"
                style={{ left: `${x}px`, top: `${y}px` }}
            >
                {nodeType === 'folder' && (
                    <>
                        <button
                            onClick={() => { onNewNote?.(); onClose(); }}
                            className="context-menu-item"
                        >
                            <File className="context-menu-item-icon" />
                            New Note Here
                        </button>
                        <button
                            onClick={() => { onNewFolder?.(); onClose(); }}
                            className="context-menu-item"
                        >
                            <FolderPlus className="context-menu-item-icon" />
                            New Folder Here
                        </button>
                        <div className="context-menu-divider" />
                    </>
                )}
                {onRename && (
                    <button
                        onClick={() => { onRename(); onClose(); }}
                        className="context-menu-item"
                    >
                        <Edit2 className="context-menu-item-icon" />
                        Rename
                    </button>
                )}
                <button
                    onClick={() => { onDelete(); onClose(); }}
                    className="context-menu-item context-menu-item-delete"
                >
                    <Trash2 className="context-menu-item-icon" />
                    {nodeType === 'folder' ? 'Delete Folder' : 'Delete Note'}
                </button>
            </div>
        </>
    );
};

// Flattened node type for virtualization
interface FlatNode {
    id: string;
    node: FileNode;
    depth: number;
    isExpanded: boolean;
    hasChildren: boolean;
    isCreationInput?: boolean; // If true, this is a temporary input row
    creationType?: 'note' | 'folder';
}

const FileTreeRow = ({
    flatNode,
    toggleExpansion,
    onStartCreating,
    style,
    onContextMenuOpen,
    activeNoteId,
    isEditing,
    onStopEditing
}: {
    flatNode: FlatNode;
    toggleExpansion: (path: string) => void;
    onStartCreating: (parentId: string, type: 'note' | 'folder') => void;
    style: React.CSSProperties;
    onContextMenuOpen: (e: React.MouseEvent, node: FileNode) => void;
    activeNoteId?: string | null;
    isEditing?: boolean;
    onStopEditing?: () => void;
}) => {
    const { node, depth, isExpanded, isCreationInput, creationType } = flatNode;
    const { openNote, renameNote, createNote, createFolder, renameFolder } = useFileActions();
    const setSelectedFolder = useAppStore(state => state.setSelectedFolder);

    const isActiveNote = node.noteId === activeNoteId;
    const isSelected = useAppStore(state => state.selectedFolderPath === node.path);
    const isDirty = useAppStore(state => node.noteId ? state.dirtyNoteIds.has(node.noteId) : false);

    const [editName, setEditName] = useState(node.name);

    // Sync editName when node changes (e.g. after rename)
    React.useEffect(() => {
        setEditName(node.name);
    }, [node.name]);

    // Initialize edit name when entering edit mode
    React.useEffect(() => {
        if (isEditing) {
            setEditName(node.name);
        }
    }, [isEditing, node.name]);

    // Creation state (only used if isCreationInput is true)
    const [newName, setNewName] = useState('');

    // Drag & Drop
    const draggableId = node.path || node.id;
    const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
        id: draggableId,
        data: { node },
        disabled: isEditing || isCreationInput,
    });

    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: draggableId,
        disabled: node.type !== 'folder' || isCreationInput,
        data: { node },
    });

    // Handle creation input submission
    const submitCreation = async () => {
        if (!newName.trim()) {
            // Cancelled
            onStartCreating('', 'note'); // Reset creation state (hacky way to cancel)
            return;
        }

        if (isCreationInput && creationType) {
            if (creationType === 'note') {
                const id = await createNote(newName, node.path, true);
                if (id) openNote(id);
            } else {
                await createFolder(newName, node.path);
            }
            onStartCreating('', 'note'); // Reset
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isCreationInput) return;

        if (node.type === 'folder') {
            if (node.path) {
                toggleExpansion(node.path);
                setSelectedFolder(node.path);
            }
        } else if (node.noteId) {
            const isNewTab = e.metaKey || e.ctrlKey;
            openNote(node.noteId, isNewTab);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isCreationInput) return;
        e.preventDefault();
        e.stopPropagation();
        onContextMenuOpen(e, node);
    };

    const saveName = () => {
        if (node.type === 'file' && node.noteId && editName.trim()) {
            renameNote(node.noteId, editName);
        } else if (node.type === 'folder' && node.path && editName.trim()) {
            renameFolder(node.path, editName);
        }
        if (onStopEditing) onStopEditing();
    };

    if (isCreationInput) {
        return (
            <div style={{ ...style, paddingLeft: `${depth * 8 + 2}px` }} className="flex items-center gap-1 px-1 py-1.5 rounded-md text-sm mb-1">
                {creationType === 'note' ? (
                    <File className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <Folder className="w-4 h-4 text-muted-foreground" />
                )}
                <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submitCreation();
                        if (e.key === 'Escape') onStartCreating('', 'note'); // Cancel
                    }}
                    onBlur={submitCreation}
                    className="flex-1 bg-background border border-input rounded px-1 py-0.5 text-xs outline-none placeholder:text-muted-foreground"
                    placeholder={creationType === 'note' ? "Note name" : "Folder name"}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        );
    }

    return (
        <div style={style} ref={setDropRef}>
            <div
                ref={setDragRef}
                {...attributes}
                className={cn(
                    "group flex items-center gap-1 px-1 py-1.5 rounded-0 cursor-pointer hover:bg-primary/10 text-sm transition-colors select-none w-[95%]",
                    isSelected && "bg-primary/10 text-foreground font-medium",
                    isActiveNote && "bg-primary/10 border-l-2 border-l-primary",
                    isDragging && "opacity-50",
                    isOver && node.type === 'folder' && "bg-primary/20 ring-2 ring-primary"
                )}
                style={{ paddingLeft: `${depth * 8 + 2}px` }}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
            >
                {/* Drag handle */}
                <div
                    {...listeners}
                    className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="w-3 h-3 text-muted-foreground" />
                </div>

                {node.type === 'folder' ? (
                    isExpanded ? (
                        <FolderOpen className="w-4 h-4 text-primary" />
                    ) : (
                        <Folder className="w-4 h-4 text-muted-foreground" />
                    )
                ) : (
                    <File className="w-4 h-4 text-muted-foreground" />
                )}

                {isEditing ? (
                    <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                        <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') saveName();
                                if (e.key === 'Escape') onStopEditing?.();
                            }}
                            onBlur={saveName}
                            className="flex-1 bg-background border border-input rounded px-1 py-0.5 text-xs outline-none placeholder:text-muted-foreground"
                            placeholder="File name"
                        />
                    </div>
                ) : (
                    <>
                        <span className="flex-1 truncate">{node.name}</span>
                        {isDirty && (
                            <div className="w-2 h-2 rounded-full bg-yellow-500/70 mr-2" title="Unsaved changes" />
                        )}
                        {node.type === 'file' && (
                            <div className="flex gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onContextMenuOpen(e, node);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0 hover:bg-background rounded transition-opacity"
                                >
                                    <Edit2 className="w-3 h-3 text-muted-foreground" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export const Sidebar = () => {
    const { moveNote, deleteNote, deleteFolder } = useFileActions();
    const fileTree = useAppStore(state => state.fileTree);
    const vaultPath = useAppStore(state => state.vaultPath);
    const openVault = useAppStore(state => state.openVault);
    const isVaultLoading = useAppStore(state => state.isVaultLoading);
    const currentView = useAppStore(state => state.currentView);
    const setCurrentView = useAppStore(state => state.setCurrentView);
    const setCommandPaletteOpen = useAppStore(state => state.setCommandPaletteOpen);
    const expandedPaths = useAppStore(state => state.expandedPaths);
    const toggleFolder = useAppStore(state => state.toggleFolder);
    const revealTrigger = useAppStore(state => state.revealTrigger); // Subscribe to trigger
    const activePaneId = usePaneStore(state => state.activePaneId);
    const paneIndex = usePaneStore(state => state.paneIndex);
    const activePane = paneIndex.get(activePaneId || '');
    const activeTabId = activePane?.activeTabId;
    const tabs = activePane?.tabs || [];
    const selectedTags = useAppStore(state => state.selectedTags);
    const tagsData = useAppStore(state => state.tagsData);

    const virtuosoRef = React.useRef<VirtuosoHandle>(null);

    // Creation state
    const [creatingState, setCreatingState] = useState<{ parentId: string, type: 'note' | 'folder' } | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [sidebarContextMenu, setSidebarContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [rowContextMenu, setRowContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);
    const [isTagsPanelCollapsed, setIsTagsPanelCollapsed] = useState(true);
    const [nodeToDelete, setNodeToDelete] = useState<FileNode | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

    const activeNoteId = tabs.find(t => t.id === activeTabId)?.noteId;

    // Drag & Drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const toggleExpansion = useCallback((path: string) => {
        toggleFolder(path);
    }, [toggleFolder]);

    // Flatten tree logic
    const flatData = useMemo(() => {
        if (!fileTree || fileTree.length === 0) return [];

        // Filter files by selected tags (AND logic)
        let filteredTree = fileTree;
        if (selectedTags.length > 0 && tagsData) {
            // Build a set of file paths that have ALL selected tags
            const filesWithAllTags = new Set<string>();

            // For each selected tag, get the files that have it
            const tagFileSets = selectedTags.map(tag => {
                const tagInfo = tagsData.tags.find(t => t.tag === tag);
                return new Set(tagInfo?.files || []);
            });

            // Find files that are in ALL tag sets (intersection)
            if (tagFileSets.length > 0) {
                // Start with the first tag's files
                const firstSet = tagFileSets[0];
                firstSet.forEach(filePath => {
                    // Check if this file is in all other tag sets
                    const inAllSets = tagFileSets.every(set => set.has(filePath));
                    if (inAllSets) {
                        filesWithAllTags.add(filePath);
                    }
                });
            }

            // Filter the file tree to only include matching files
            filteredTree = fileTree.filter(node => {
                if (node.type === 'file') {
                    // For files, check if they're in the filtered set
                    const relativePath = node.path?.replace(vaultPath + '/', '') || '';
                    return filesWithAllTags.has(relativePath);
                } else {
                    // Keep folders (we'll handle folder visibility in the flatten logic)
                    return true;
                }
            });
        }

        const result: FlatNode[] = [];
        const vaultPathStr = vaultPath || '';

        // The backend now returns a flat list sorted by path.
        // We need to:
        // 1. Calculate depth based on path
        // 2. Filter out items whose parents are not expanded
        // 3. Sort folders before files at each level (if not already done by backend, but backend sort is by path)
        // Actually, backend sort by path is:
        // /A
        // /A/file.md
        // /B
        // This is depth-first, which is what we want for the tree.
        // However, we want folders first WITHIN a level?
        // If we want folders first, simple path sort might not be enough if we have:
        // /A/file.md
        // /A/subfolder
        // 'f' comes before 's', so file comes first.
        // To fix this on frontend without complex tree reconstruction:
        // We can reconstruct the tree structure temporarily or use a smart sort.
        // Given the constraints and the previous recursive structure, let's try to process the flat list.

        // Helper to check if all parents are expanded
        const isVisible = (path: string) => {
            if (!path.startsWith(vaultPathStr)) return true; // Should not happen
            const relative = path.slice(vaultPathStr.length);
            const parts = relative.split('/').filter(p => p);

            // Check all parent paths
            let currentPath = vaultPathStr;
            for (let i = 0; i < parts.length - 1; i++) {
                currentPath = currentPath === '/' ? `/${parts[i]}` : `${currentPath}/${parts[i]}`;
                // If this parent folder is NOT in expandedPaths, then the child is hidden
                if (!expandedPaths.has(currentPath)) {
                    return false;
                }
            }
            return true;
        };

        // We need to re-sort to ensure folders come before files at the same level
        // This is tricky with a purely flat list without rebuilding the tree.
        // Let's rebuild a lightweight tree structure for sorting, then flatten again?
        // Or just trust the backend sort for now?
        // Let's stick to the flat list from backend and just filter for visibility.
        // If sorting is an issue, we can address it.

        for (const node of filteredTree) {
            if (!node.path) continue;

            // Calculate depth
            // Remove vault path prefix
            const relativePath = node.path.startsWith(vaultPathStr)
                ? node.path.slice(vaultPathStr.length)
                : node.path;

            // Split by slash and filter empty (handles leading slash)
            const parts = relativePath.split('/').filter(p => p);
            const depth = Math.max(0, parts.length - 1);

            // Check visibility
            if (!isVisible(node.path)) continue;

            result.push({
                id: node.id,
                node,
                depth,
                isExpanded: expandedPaths.has(node.path),
                hasChildren: node.type === 'folder', // We assume folders can have children
            });

            // Handle creation input (if this node is the parent of the creation input)
            if (creatingState && creatingState.parentId === node.id && expandedPaths.has(node.path)) {
                result.push({
                    id: 'creation-input',
                    node: { ...node, id: 'creation-input', name: '' }, // Dummy node
                    depth: depth + 1,
                    isExpanded: false,
                    hasChildren: false,
                    isCreationInput: true,
                    creationType: creatingState.type
                });
            }
        }

        // Handle root level creation
        if (creatingState && !creatingState.parentId) {
            result.push({
                id: 'creation-input-root',
                node: { ...fileTree[0] || {}, id: 'creation-input-root', name: '' } as any,
                depth: 0,
                isExpanded: false,
                hasChildren: false,
                isCreationInput: true,
                creationType: creatingState.type
            });
        }

        return result;
    }, [fileTree, expandedPaths, creatingState, vaultPath, selectedTags, tagsData]);





    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) {
            return;
        }

        const draggedNode = active.data.current?.node as FileNode;
        let targetDirPath = '';

        const targetNode = over.data.current?.node as FileNode;
        if (!targetNode || targetNode.type !== 'folder') return;

        if (draggedNode.type === 'folder' && targetNode.path?.startsWith(draggedNode.path + '/')) {
            return;
        }
        targetDirPath = targetNode.path!;

        if (!draggedNode) return;
        const oldPath = draggedNode.path || draggedNode.noteId;
        if (!oldPath) return;

        const fileName = draggedNode.name;
        let newPath = `${targetDirPath}/${fileName}`;
        const currentDir = oldPath.substring(0, oldPath.lastIndexOf('/'));

        if (currentDir === targetDirPath) return;

        try {
            let counter = 1;
            let finalFileName = fileName;
            const nameWithoutExt = fileName.replace(/\.md$/, '');
            const ext = fileName.endsWith('.md') ? '.md' : '';

            while (await checkExists(newPath)) {
                finalFileName = `${nameWithoutExt} (${counter})${ext}`;
                newPath = `${targetDirPath}/${finalFileName}`;
                counter++;
            }

            await moveNote(oldPath, newPath);
        } catch (e) {
            console.error('Failed to move item:', e);
        }
    };

    // Root creation handlers
    const handleRootCreateNote = () => {
        if (vaultPath) setCreatingState({ parentId: vaultPath, type: 'note' });
    };

    const handleRootCreateFolder = () => {
        if (vaultPath) setCreatingState({ parentId: vaultPath, type: 'folder' });
    };

    // We need to inject root creation item into flatData if needed
    // Actually, simpler to just use a separate UI for root creation or prepend it
    // But `FileTreeRow` handles the input logic.
    // Let's prepend root creation item to flatData if active
    const finalData = useMemo(() => {
        if (creatingState && creatingState.parentId === vaultPath) {
            const rootDummyNode: FileNode = { id: 'root', name: 'root', type: 'folder', path: vaultPath, children: [] };
            return [{
                id: 'root-creation',
                node: rootDummyNode,
                depth: 0,
                isExpanded: false,
                hasChildren: false,
                isCreationInput: true,
                creationType: creatingState.type
            }, ...flatData];
        }
        return flatData;
    }, [flatData, creatingState, vaultPath]);

    // Handle reveal trigger
    React.useEffect(() => {
        if (!virtuosoRef.current || !activeTabId) return;

        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab) return;

        const noteId = activeTab.noteId;

        // Use setTimeout to ensure folders have expanded in the DOM first
        // This allows React to re-render with the new expandedPaths before we scroll
        setTimeout(() => {
            // Find index of the note in finalData
            const index = finalData.findIndex(item => item.node.noteId === noteId);

            if (index !== -1 && virtuosoRef.current) {
                virtuosoRef.current.scrollToIndex({
                    index,
                    align: 'center',
                    behavior: 'auto'
                });
            }
        }, 50); // Small delay to allow React to re-render
    }, [revealTrigger, finalData, activeTabId, tabs]);

    // Handle context menu on empty space
    const handleSidebarContextMenu = (e: React.MouseEvent) => {
        // Only show if we have a vault open
        if (!vaultPath) return;

        e.preventDefault();
        e.stopPropagation();
        setSidebarContextMenu({ x: e.clientX, y: e.clientY });
    };

    // Handle row context menu
    const handleRowContextMenuOpen = (e: React.MouseEvent, node: FileNode) => {
        setSidebarContextMenu(null); // Close sidebar menu
        setRowContextMenu({ x: e.clientX, y: e.clientY, node });
    };

    // Get file actions and store for context menu
    // const { renameNote, deleteNote, renameFolder, deleteFolder } = useFileActions();
    // const requestConfirmation = useAppStore(state => state.requestConfirmation);

    // Handle rename from context menu
    const handleRowRename = () => {
        if (!rowContextMenu) return;
        setEditingNodeId(rowContextMenu.node.id);
        setRowContextMenu(null);
    };

    // Handle delete from context menu
    const handleRowDelete = () => {
        if (!rowContextMenu) return;
        setNodeToDelete(rowContextMenu.node);
        setRowContextMenu(null);
    };

    const confirmDelete = async () => {
        if (!nodeToDelete) return;

        if (nodeToDelete.type === 'file' && nodeToDelete.noteId) {
            await deleteNote(nodeToDelete.noteId);
        } else if (nodeToDelete.type === 'folder' && nodeToDelete.path) {
            await deleteFolder(nodeToDelete.path);
        }
        setNodeToDelete(null);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="w-full bg-card border-r border-border h-full flex flex-col select-none">
                <div className="h-10 px-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Notes</h2>
                    <div className="flex gap-1">
                        <button
                            onClick={handleRootCreateFolder}
                            className="p-1 hover:bg-primary/10 rounded-md transition-colors"
                            title="New Folder"
                        >
                            <FolderPlus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleRootCreateNote}
                            className="p-1 hover:bg-primary/10 rounded-md transition-colors"
                            title="New Note"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-shortcuts-modal'))}
                            className="p-1 hover:bg-primary/10 rounded-md transition-colors"
                            title="Keyboard Shortcuts (Cmd+/)"
                        >
                            <Keyboard className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {vaultPath && (
                    <div
                        className="h-10 px-4 flex items-center text-xs text-muted-foreground border-b border-border truncate cursor-pointer hover:bg-primary/10 hover:text-foreground transition-colors shrink-0"
                        title="Click to search notes (Cmd+P)"
                        onClick={() => setCommandPaletteOpen(true)}
                    >
                        {vaultPath.split('/').pop()}
                    </div>
                )}

                <div className="flex-1 overflow-hidden flex flex-col " onContextMenu={handleSidebarContextMenu}>
                    {isVaultLoading ? (
                        <div className="space-y-2 p-2">
                            <div className="h-4 bg-primary/10 rounded animate-pulse w-3/4" />
                            <div className="h-4 bg-primary/10 rounded animate-pulse w-1/2" />
                            <div className="h-4 bg-primary/10 rounded animate-pulse w-2/3" />
                            <div className="h-4 bg-primary/10 rounded animate-pulse w-full" />
                        </div>
                    ) : (
                        <Virtuoso
                            ref={virtuosoRef}
                            data={finalData}
                            computeItemKey={(_index, item) => item.id}
                            itemContent={(_index, item) => (
                                <FileTreeRow
                                    flatNode={item}
                                    toggleExpansion={toggleExpansion}
                                    onStartCreating={(parentId, type) => {
                                        if (!parentId) setCreatingState(null);
                                        else setCreatingState({ parentId, type });
                                    }}
                                    onContextMenuOpen={handleRowContextMenuOpen}
                                    style={{}}
                                    activeNoteId={activeNoteId}
                                    isEditing={editingNodeId === item.node.id}
                                    onStopEditing={() => setEditingNodeId(null)}
                                />
                            )}
                            style={{ height: '100%', overflowX: 'hidden' }}
                            className="p-1 mt-2"
                        />
                    )}
                </div>

                {/* Context menu for sidebar empty space */}
                {sidebarContextMenu && (
                    <ContextMenu
                        x={sidebarContextMenu.x}
                        y={sidebarContextMenu.y}
                        nodeType="folder"
                        onClose={() => setSidebarContextMenu(null)}
                        onDelete={() => { }} // No delete action for empty space
                        onNewNote={() => {
                            handleRootCreateNote();
                            setSidebarContextMenu(null);
                        }}
                        onNewFolder={() => {
                            handleRootCreateFolder();
                            setSidebarContextMenu(null);
                        }}
                    />
                )}

                {/* Context menu for row items */}
                {rowContextMenu && (
                    <ContextMenu
                        x={rowContextMenu.x}
                        y={rowContextMenu.y}
                        nodeType={rowContextMenu.node.type}
                        onClose={() => setRowContextMenu(null)}
                        onRename={handleRowRename}
                        onDelete={handleRowDelete}
                        onNewNote={rowContextMenu.node.type === 'folder' ? () => {
                            const path = rowContextMenu.node.path!;
                            if (!expandedPaths.has(path)) {
                                toggleFolder(path);
                            }
                            setCreatingState({ parentId: path, type: 'note' });
                            setRowContextMenu(null);
                        } : undefined}
                        onNewFolder={rowContextMenu.node.type === 'folder' ? () => {
                            const path = rowContextMenu.node.path!;
                            if (!expandedPaths.has(path)) {
                                toggleFolder(path);
                            }
                            setCreatingState({ parentId: path, type: 'folder' });
                            setRowContextMenu(null);
                        } : undefined}
                    />
                )}

                {/* Tags Panel */}
                <TagsPanel
                    isCollapsed={isTagsPanelCollapsed}
                    onToggleCollapse={() => setIsTagsPanelCollapsed(!isTagsPanelCollapsed)}
                />

                <div className="p-2 border-t border-border space-y-1 shrink-0">
                    <button
                        onClick={() => setCurrentView(currentView === 'graph' ? 'editor' : 'graph')}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                            currentView === 'graph'
                                ? "bg-primary/20 text-foreground font-medium"
                                : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                        )}
                    >
                        <Network className="w-4 h-4" />
                        <span>Knowledge Graph</span>
                    </button>
                    <button
                        onClick={openVault}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-foreground rounded-md transition-colors"
                    >
                        <FolderOpen className="w-4 h-4" />
                        <span>Open Vault</span>
                    </button>
                </div>
            </div>

            {nodeToDelete && (
                <ConfirmDialog
                    isOpen={!!nodeToDelete}
                    title={nodeToDelete.type === 'folder' ? "Delete Folder" : "Delete Note"}
                    message={`Are you sure you want to delete "${nodeToDelete.name}"? ${nodeToDelete.type === 'folder' ? 'All contents will be permanently deleted.' : 'This action cannot be undone.'}`}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    variant="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setNodeToDelete(null)}
                />
            )}

            <DragOverlay>
                {activeId ? (
                    <div className="bg-primary/20 px-2 py-1.5 rounded-md border border-primary text-sm opacity-80 pointer-events-none">
                        Dragging...
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
