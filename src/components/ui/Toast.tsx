import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export const Toast = ({ message, type, onClose, duration = 4000 }: ToastProps) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        // Wait for animation to finish before removing from DOM
        setTimeout(onClose, 200);
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'success': return 'border-green-500/20';
            case 'error': return 'border-red-500/20';
            case 'warning': return 'border-yellow-500/20';
            default: return 'border-blue-500/20';
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'success': return 'bg-green-500/10';
            case 'error': return 'bg-red-500/10';
            case 'warning': return 'bg-yellow-500/10';
            default: return 'bg-blue-500/10';
        }
    };

    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm bg-card/95
                min-w-[300px] max-w-sm
                transition-all duration-200 ease-out
                ${getBorderColor()}
                ${isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100 animate-in slide-in-from-right-full'}
            `}
        >
            <div className={`p-1 rounded-full ${getBgColor()}`}>
                {getIcon()}
            </div>
            <p className="flex-1 text-sm font-medium text-foreground">{message}</p>
            <button
                onClick={handleClose}
                className="p-1 hover:bg-accent/10 rounded-md transition-colors text-muted-foreground hover:text-foreground"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
