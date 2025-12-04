export interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

export interface Tab {
    id: string;
    noteId: string;
    isPreview: boolean; // Preview tab (will be replaced when opening another note)
    history: string[]; // Navigation history stack
    historyIndex: number; // Current position in history stack
}

export interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    children?: FileNode[];
    noteId?: string; // If it's a file, it links to a note
    path?: string; // FS path
}

export interface SaveState {
    status: 'idle' | 'saving' | 'saved' | 'error' | 'snapshot';
    lastSaved: number | null;
    error: string | null;
}

// Pane system for split view
export interface PaneNode {
    id: string;
    type: 'leaf' | 'split';

    // For split nodes (contain two child panes)
    direction?: 'horizontal' | 'vertical';
    children?: PaneNode[];
    splitRatio?: number; // 0.0 to 1.0, how much space first child gets
    parentId?: string;

    // For leaf nodes (actual editor panes that display content)
    tabs?: Tab[]; // Each leaf pane has its own tabs
    activeTabId?: string | null; // Which tab is displayed in this pane
}

export interface CommitStats {
    files_changed: number;
    insertions: number;
    deletions: number;
    file_paths: string[];
}

export interface CommitInfo {
    oid: string;
    message: string;
    author: string;
    timestamp: number;
    is_ambre: boolean;
    stats?: CommitStats;
}
