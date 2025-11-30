import { LucideIcon } from 'lucide-react';

export enum CommandCategory {
    Navigation = 'Navigation',
    Files = 'Files',
    Git = 'Git',
    Settings = 'Settings',
    Tabs = 'Tabs',
    Editor = 'Editor',
    Folders = 'Folders',
}

export interface Command {
    id: string;
    label: string;
    description?: string;
    icon: LucideIcon;
    shortcut?: string;
    category: CommandCategory;
    action: () => void | Promise<void>;
    condition?: () => boolean; // Optional: only show if condition is true
}

export interface RecentFile {
    noteId: string;
    name: string;
    path: string;
    timestamp: number;
}
