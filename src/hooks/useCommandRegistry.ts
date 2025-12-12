import { useMemo } from 'react';
import {
    Command,
    CommandCategory
} from '../types/CommandTypes';
import { useAppStore, useActiveTabId, useTabs } from '../store/useStore';
import { usePaneStore } from '../store/usePaneStore';
import { useGitStore } from '../store/useGitStore';
import { useThemeStore } from '../store/useThemeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
    Home,
    Network,
    PanelLeftClose,
    PanelLeftOpen,
    ArrowLeft,
    ArrowRight,
    FilePlus,
    Trash2,
    FileEdit,
    Copy,
    GitCommit,
    History,
    RotateCcw,
    Settings,
    Moon,
    Sun,
    FileType,
    X,
    XCircle,
    FolderPlus,
    ChevronDown,
    ChevronRight,
    Link,
    Calendar,
} from 'lucide-react';


export const useCommandRegistry = (): Command[] => {
    const {
        currentView,
        setCurrentView,
        isSidebarOpen,
        toggleSidebar,
        navigateBack,
        navigateForward,
        canNavigateBack,
        canNavigateForward,
        createNote,
        openNote,
        deleteNote,
        forceSaveNote,
        setSaveState,
        vaultPath,
        collapseAllFolders,
        expandAllFolders,
        duplicateNote,
    } = useAppStore();

    const {
        closeTab,
        closeAllTabs,
        closeOtherTabs,
    } = usePaneStore();

    const {
        snapshotNote,
        snapshotVault,
        undoLastAmbreChange,
    } = useGitStore();

    const activeTabId = useActiveTabId();
    const tabs = useTabs();

    const activeTab = tabs.find(t => t.id === activeTabId);
    const currentNoteId = activeTab?.noteId;

    const commands = useMemo<Command[]>(() => {
        const isDark = document.documentElement.classList.contains('dark');

        return [
            // ========== NAVIGATION ==========
            {
                id: 'toggle-view',
                label: currentView === 'editor' ? 'Switch to Graph View' : 'Switch to Editor View',
                description: 'Toggle between editor and graph visualization',
                icon: currentView === 'editor' ? Network : Home,
                category: CommandCategory.Navigation,
                action: () => setCurrentView(currentView === 'editor' ? 'graph' : 'editor'),
            },
            {
                id: 'toggle-sidebar',
                label: isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar',
                description: 'Toggle file explorer visibility',
                icon: isSidebarOpen ? PanelLeftClose : PanelLeftOpen,
                shortcut: '⌘B',
                category: CommandCategory.Navigation,
                action: toggleSidebar,
            },
            {
                id: 'navigate-back',
                label: 'Navigate Back',
                description: 'Go to previous note in history',
                icon: ArrowLeft,
                shortcut: '⌘[',
                category: CommandCategory.Navigation,
                action: navigateBack,
                condition: canNavigateBack,
            },
            {
                id: 'navigate-forward',
                label: 'Navigate Forward',
                description: 'Go to next note in history',
                icon: ArrowRight,
                shortcut: '⌘]',
                category: CommandCategory.Navigation,
                action: navigateForward,
                condition: canNavigateForward,
            },

            // ========== FILES ==========
            {
                id: 'create-note',
                label: 'Create New Note',
                description: 'Create a new note in vault',
                icon: FilePlus,
                category: CommandCategory.Files,
                action: async () => {
                    const noteId = await createNote('Untitled');
                    if (noteId) {
                        await openNote(noteId);
                    }
                },
            },
            {
                id: 'delete-note',
                label: 'Delete Current Note',
                description: 'Delete the active note',
                icon: Trash2,
                category: CommandCategory.Files,
                action: async () => {
                    if (currentNoteId) {
                        const note = useAppStore.getState().notes[currentNoteId];
                        const noteName = note?.title || currentNoteId.split('/').pop() || 'this note';

                        const confirmed = await useAppStore.getState().requestConfirmation(
                            `Are you sure you want to delete "${noteName}"? This action cannot be undone.`
                        );

                        if (confirmed) {
                            await deleteNote(currentNoteId);
                        }
                    }
                },
                condition: () => !!currentNoteId,
            },
            {
                id: 'rename-note',
                label: 'Rename Current Note',
                description: 'Rename the active note',
                icon: FileEdit,
                category: CommandCategory.Files,
                action: () => {
                    if (currentNoteId) {
                        // Dispatch custom event for rename modal/input
                        window.dispatchEvent(new CustomEvent('rename-current-note', {
                            detail: { noteId: currentNoteId }
                        }));
                    }
                },
                condition: () => !!currentNoteId,
            },
            {
                id: 'duplicate-note',
                label: 'Duplicate Current Note',
                description: 'Create a copy of the active note',
                icon: Copy,
                category: CommandCategory.Files,
                action: async () => {
                    if (currentNoteId) {
                        await duplicateNote(currentNoteId);
                    }
                },
                condition: () => !!currentNoteId,
            },
            {
                id: 'copy-note-path',
                label: 'Copy Note Path',
                description: 'Copy the file path to clipboard',
                icon: Link,
                category: CommandCategory.Files,
                action: async () => {
                    if (currentNoteId) {
                        await navigator.clipboard.writeText(currentNoteId);
                    }
                },
                condition: () => !!currentNoteId,
            },
            {
                id: 'new-from-template',
                label: 'New Note from Template',
                description: 'Create a note using a template',
                icon: FileType,
                category: CommandCategory.Files,
                action: () => {
                    useAppStore.getState().loadTemplates();
                    useAppStore.getState().setTemplatePickerOpen(true);
                },
                condition: () => !!vaultPath,
            },
            {
                id: 'open-daily-note',
                label: 'Open Today\'s Note',
                description: 'Open or create today\'s daily note',
                icon: Calendar,
                shortcut: '⌘⇧D',
                category: CommandCategory.Files,
                action: async () => {
                    await useAppStore.getState().openDailyNote();
                },
                condition: () => {
                    const settings = useSettingsStore.getState().dailyNotes;
                    return !!vaultPath && settings.enabled;
                },
            },

            // ========== GIT ==========
            {
                id: 'snapshot-note',
                label: 'Snapshot Current Note',
                description: 'Create a Git commit for this note',
                icon: GitCommit,
                shortcut: '⌘⇧S',
                category: CommandCategory.Git,
                action: async () => {
                    if (currentNoteId) {
                        await snapshotNote(currentNoteId, forceSaveNote, setSaveState);
                    }
                },
                condition: () => !!currentNoteId && !!vaultPath,
            },
            {
                id: 'snapshot-vault',
                label: 'Snapshot Entire Vault',
                description: 'Create a Git commit for all changes',
                icon: GitCommit,
                shortcut: '⌘⌥S',
                category: CommandCategory.Git,
                action: snapshotVault,
                condition: () => !!vaultPath,
            },
            {
                id: 'view-history',
                label: 'View Note History',
                description: 'Show Git history for current note',
                icon: History,
                shortcut: '⌘H',
                category: CommandCategory.Git,
                action: () => {
                    window.dispatchEvent(new CustomEvent('open-history-modal'));
                },
                condition: () => !!vaultPath,
            },
            {
                id: 'undo-ambre',
                label: 'Undo Last Ambre Change',
                description: 'Revert the last AI-made change',
                icon: RotateCcw,
                category: CommandCategory.Git,
                action: async () => {
                    await undoLastAmbreChange(useAppStore.getState().requestConfirmation);
                },
                condition: () => !!vaultPath,
            },

            // ========== SETTINGS ==========
            {
                id: 'open-settings',
                label: 'Open Settings',
                description: 'Configure application settings',
                icon: Settings,
                shortcut: '⌘,',
                category: CommandCategory.Settings,
                action: () => {
                    window.dispatchEvent(new CustomEvent('open-settings-modal'));
                },
            },
            {
                id: 'toggle-theme',
                label: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
                description: 'Toggle between light and dark theme',
                icon: isDark ? Sun : Moon,
                category: CommandCategory.Settings,
                action: () => {
                    document.documentElement.classList.toggle('dark');
                    const newIsDark = document.documentElement.classList.contains('dark');
                    localStorage.setItem('moss-theme-mode', newIsDark ? 'dark' : 'light');
                    // Reapply active theme
                    useThemeStore.getState().applyTheme(newIsDark);
                },
            },
            {
                id: 'toggle-source-preview',
                label: 'Toggle Source/Preview Mode',
                description: 'Switch between markdown source and preview',
                icon: FileType,
                category: CommandCategory.Editor,
                action: () => {
                    // Dispatch event for editor to handle
                    window.dispatchEvent(new CustomEvent('toggle-editor-mode'));
                },
                condition: () => !!currentNoteId,
            },

            // ========== TABS ==========
            {
                id: 'close-tab',
                label: 'Close Current Tab',
                description: 'Close the active tab',
                icon: X,
                shortcut: '⌘W',
                category: CommandCategory.Tabs,
                action: () => {
                    if (activeTabId) {
                        closeTab(activeTabId);
                    }
                },
                condition: () => !!activeTabId,
            },
            {
                id: 'close-all-tabs',
                label: 'Close All Tabs',
                description: 'Close all open tabs',
                icon: XCircle,
                category: CommandCategory.Tabs,
                action: closeAllTabs,
                condition: () => tabs.length > 0,
            },
            {
                id: 'close-other-tabs',
                label: 'Close Other Tabs',
                description: 'Close all tabs except the active one',
                icon: XCircle,
                category: CommandCategory.Tabs,
                action: () => {
                    if (activeTabId) {
                        closeOtherTabs(activeTabId);
                    }
                },
                condition: () => tabs.length > 1,
            },

            // ========== FOLDERS ==========
            {
                id: 'create-folder',
                label: 'Create New Folder',
                description: 'Create a new folder in vault',
                icon: FolderPlus,
                category: CommandCategory.Folders,
                action: () => {
                    // Dispatch event for folder creation
                    window.dispatchEvent(new CustomEvent('create-folder'));
                },
                condition: () => !!vaultPath,
            },
            {
                id: 'collapse-all',
                label: 'Collapse All Folders',
                description: 'Collapse all expanded folders',
                icon: ChevronDown,
                category: CommandCategory.Folders,
                action: collapseAllFolders,
                condition: () => !!vaultPath,
            },
            {
                id: 'expand-all',
                label: 'Expand All Folders',
                description: 'Expand all folders in sidebar',
                icon: ChevronRight,
                category: CommandCategory.Folders,
                action: expandAllFolders,
                condition: () => !!vaultPath,
            },
        ];
    }, [
        currentView,
        isSidebarOpen,
        canNavigateBack,
        canNavigateForward,
        currentNoteId,
        activeTabId,
        tabs.length,
        vaultPath,
    ]);

    // Filter out commands whose conditions are not met
    return commands.filter(cmd => !cmd.condition || cmd.condition());
};
