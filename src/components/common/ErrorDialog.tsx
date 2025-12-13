import { X, AlertCircle } from 'lucide-react';

interface ErrorDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

export const ErrorDialog = ({ isOpen, title, message, onClose }: ErrorDialogProps) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 z-50 rounded-xl"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md">
                <div className="bg-background border border-border rounded-2xl shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-primary/10 rounded-md transition-colors"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <p className="text-sm text-foreground">{message}</p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end p-4 border-t border-border">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-md text-sm font-medium transition-colors"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
