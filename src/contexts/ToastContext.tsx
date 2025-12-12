import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Toast, ToastType } from '../components/ui/Toast';
import { v4 as uuidv4 } from 'uuid';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    addToast: (message: string, type: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Event bus for non-React components (like Zustand stores) to trigger toasts
export const toastEventBus = new EventTarget();

export const showToast = (message: string, type: ToastType = 'info', duration = 3000) => {
    toastEventBus.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message, type, duration }
    }));
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
        const id = uuidv4();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Listen to global toast events
    useEffect(() => {
        const handleToastEvent = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            addToast(detail.message, detail.type, detail.duration);
        };

        toastEventBus.addEventListener('show-toast', handleToastEvent);
        return () => toastEventBus.removeEventListener('show-toast', handleToastEvent);
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            onClose={() => removeToast(toast.id)}
                            duration={toast.duration}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
