import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { useAppStore } from '../../store/useStore';
import { ResizableSplit } from './ResizableSplit';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { TitleBar } from './TitleBar';
import { CommandPalette } from '../common/CommandPalette';
import { SearchModal } from '../common/SearchModal';
import { TemplatePicker } from '../templates/TemplatePicker';
import { useAppInitialization } from '../../hooks/useAppInitialization';
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';

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

    return (
        <div className="relative grain-overlay flex h-screen w-screen bg-background text-foreground overflow-hidden pt-8 rounded-xl border border-border/50">
            <TitleBar />
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
            <CommandPalette />
            <SearchModal />
            <TemplatePicker
                isOpen={isTemplatePickerOpen}
                onClose={() => setTemplatePickerOpen(false)}
            />
        </div>
    );
};
