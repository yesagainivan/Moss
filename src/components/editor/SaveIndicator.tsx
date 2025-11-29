import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useSaveState, useActiveNote } from '../../store/useStore';

export const SaveIndicator = () => {
    const activeNote = useActiveNote();
    const saveState = useSaveState(activeNote?.id || '');

    if (!activeNote || !activeNote.id || !activeNote.id.includes('/')) {
        return null; // Only show for file system notes
    }


    switch (saveState.status) {
        case 'saving':
            return (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                </div>
            );

        case 'saved':
            return (
                <div className="flex items-center gap-2 text-sm text-success dark:text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saved</span>
                </div>
            );

            return (
                <div className="flex items-center gap-2 text-sm text-destructive" title={saveState.error || 'Save failed'}>
                    <AlertCircle className="w-4 h-4" />
                    <span>Error</span>
                </div>
            );

        case 'snapshot':
            return (
                <div className="flex items-center gap-2 text-sm text-accent font-medium animate-in fade-in slide-in-from-bottom-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Snapshot Saved</span>
                </div>
            );

        default:
            return null;
    }
};
