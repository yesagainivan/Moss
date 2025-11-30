import { AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'warning'
}: ConfirmDialogProps) => {
    const [isClosing, setIsClosing] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // 1. Wait for Key Release (fast typists/holding key)
            const handleKeyUp = (e: KeyboardEvent) => {
                if (e.key === 'Enter') setIsReady(true);
            };
            window.addEventListener('keyup', handleKeyUp);

            // 2. Fallback Timer (mouse users / missed events)
            const timer = setTimeout(() => setIsReady(true), 400);

            return () => {
                window.removeEventListener('keyup', handleKeyUp);
                clearTimeout(timer);
            };
        } else {
            setIsReady(false);
        }
    }, [isOpen]);

    // Handle close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onCancel();
        }, 50); // Match animation duration
    };

    // Handle Enter and Escape keys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Enter') {
                if (isReady && !e.repeat) {
                    e.preventDefault();
                    onConfirm();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isReady, onConfirm]);

    if (!isOpen && !isClosing) return null;

    const variantColors = {
        danger: 'bg-destructive hover:bg-destructive/90',
        warning: 'bg-warning hover:bg-warning/90',
        info: 'bg-info hover:bg-info/90'
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="modal-backdrop"
                onClick={handleClose}
            >
                {/* Modal */}
                <div
                    className={`${isClosing ? 'modal-exit' : 'modal-appear'} bg-background border border-border rounded-2xl shadow-lg max-w-md w-full mx-4 p-6`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                        <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                            <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-destructive' : 'text-warning'}`} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground">
                                {title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {message}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-foreground bg-surface hover:bg-surface/80 rounded-md transition-colors"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-4 py-2 text-sm font-medium text-white ${variantColors[variant]} rounded-md transition-colors`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
