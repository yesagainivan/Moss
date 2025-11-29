import { useState, memo } from 'react';
import { X, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAppStore } from '../../store/useStore';

interface TabItemProps {
    id: string;
    noteId: string;
    isActive: boolean;
    isDirty: boolean;
    isPreview: boolean;
    onActivate: (id: string) => void;
    onClose: (id: string) => void;
}

export const TabItem = memo(({ id, noteId, isActive, isDirty, isPreview, onActivate, onClose }: TabItemProps) => {
    const title = useAppStore(state => state.notes[noteId]?.title || 'Untitled');
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    const handleClick = () => {
        onActivate(id);
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (isDirty) {
            setShowCloseConfirm(true);
        } else {
            onClose(id);
        }
    };

    const confirmClose = () => {
        setShowCloseConfirm(false);
        onClose(id);
    };

    const cancelClose = () => {
        setShowCloseConfirm(false);
    };

    return (
        <>
            <div
                onClick={handleClick}
                className={cn(
                    "group flex items-center gap-2 px-3 py-2 text-sm border-r border-border cursor-pointer select-none min-w-[120px] max-w-[200px] h-full transition-colors",
                    isActive ? "bg-background text-foreground font-medium border-t-2 border-t-accent" : "bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground"
                )}
            >
                <span className={cn("flex-1 truncate", isPreview && "italic")} title={title}>{title}</span>

                <div className="flex items-center justify-center w-4 h-4">
                    {isDirty && (
                        <Circle className="w-2 h-2 fill-destructive text-destructive group-hover:hidden" />
                    )}
                    <button
                        onClick={handleClose}
                        className={cn(
                            "p-0.5 rounded-sm hover:bg-destructive/10 hover:text-destructive",
                            isDirty ? "hidden group-hover:block" : "opacity-0 group-hover:opacity-100"
                        )}
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showCloseConfirm}
                title="Unsaved Changes"
                message={`"${title}" has unsaved changes. Close anyway?`}
                confirmLabel="Close Anyway"
                cancelLabel="Keep Open"
                variant="warning"
                onConfirm={confirmClose}
                onCancel={cancelClose}
            />
        </>
    );
});
