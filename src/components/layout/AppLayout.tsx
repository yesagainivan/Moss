import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { useAppStore } from '../../store/useStore';
import { ResizableSplit } from './ResizableSplit';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { TitleBar } from './TitleBar';
import { CommandPalette } from '../common/CommandPalette';
import { SearchModal } from '../common/SearchModal';
import { ShortcutsModal } from '../common/ShortcutsModal';
import { TemplatePicker } from '../templates/TemplatePicker';
import { useAppInitialization } from '../../hooks/useAppInitialization';
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';
import { ErrorBoundary } from '../common/ErrorBoundary'; // Assuming ErrorBoundary is in common
import { NoteHistoryModal } from '../git/NoteHistoryModal';

export const AppLayout = () => {
    // Initialize app and shortcuts
    useAppInitialization();
    useGlobalShortcuts();

    // Selective subscriptions
    const isSidebarOpen = useAppStore(state => state.isSidebarOpen);
    const confirmationRequest = useAppStore(state => state.confirmationRequest);
    const resolveConfirmation = useAppStore(state => state.resolveConfirmation);
    const isTemplatePickerOpen = useAppStore(state => state.isTemplatePickerOpen);
    const setTemplatePickerOpen = useAppStore(state => state.setTemplatePickerOpen);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyNotePath, setHistoryNotePath] = useState<string | null>(null);

    // Handle open-history-modal event
    useEffect(() => {
        const handleOpenHistory = () => {
            // Get active note
            import('../../store/usePaneStore').then(({ usePaneStore }) => {
                const paneStore = usePaneStore.getState();
                const activePane = paneStore.getActivePane();
                if (activePane && activePane.activeTabId) {
                    const tab = activePane.tabs?.find(t => t.id === activePane.activeTabId);
                    if (tab && tab.noteId) {
                        setHistoryNotePath(tab.noteId);
                        setIsHistoryOpen(true);
                    }
                }
            });
        };

        window.addEventListener('open-history-modal', handleOpenHistory);
        return () => window.removeEventListener('open-history-modal', handleOpenHistory);
    }, []);

    return (
        <div className="relative grain-overlay flex h-screen w-screen bg-background text-foreground overflow-hidden pt-8 rounded-xl border border-border/50">
            <TitleBar />
            <ErrorBoundary>
                <ResizableSplit
                    side="left"
                    initialSize={250}
                    minSize={200}
                    maxSize={400}
                    isOpen={isSidebarOpen}
                    persistenceKey="moss-sidebar-width"
                    sideContent={<Sidebar />}
                    mainContent={<MainContent />}
                />
            </ErrorBoundary>

            <ConfirmDialog
                isOpen={!!confirmationRequest}
                title="Confirmation Required"
                message={confirmationRequest?.message || ''}
                confirmLabel="Confirm"
                cancelLabel="Cancel"
                variant="warning"
                onConfirm={() => resolveConfirmation(true)}
                onCancel={() => resolveConfirmation(false)}
            />
            {historyNotePath && (
                <NoteHistoryModal
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    notePath={historyNotePath}
                />
            )}
            <CommandPalette />
            <SearchModal />
            <ShortcutsModal />
            <TemplatePicker
                isOpen={isTemplatePickerOpen}
                onClose={() => setTemplatePickerOpen(false)}
            />
        </div>
    );
};
