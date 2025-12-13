import { useEffect, useRef, useState } from 'react';
import { Loader2, Check } from 'lucide-react';

interface AIInlinePromptProps {
    isOpen: boolean;
    position: { top: number; left: number } | null;
    onSubmit: (instruction: string) => void;
    onClose: () => void;
    isGenerating?: boolean;
    onAccept?: () => void;
    onCancel?: () => void;
    isStreaming?: boolean; // New prop to distinguish streaming vs completed
}

export const AIInlinePrompt = ({
    isOpen,
    position,
    onSubmit,
    onClose,
    isGenerating = false,
    onAccept,
    onCancel,
    isStreaming = false
}: AIInlinePromptProps) => {
    const [instruction, setInstruction] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current && !isGenerating) {
            inputRef.current.focus();
            setInstruction(''); // Clear previous input
        }
    }, [isOpen, isGenerating]);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                if (!isGenerating) {
                    onClose();
                }
            }
        };

        if (isOpen) {
            // Delay adding listener to avoid immediate close from the same click that opened it
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, isGenerating]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (instruction.trim() && !isGenerating) {
            onSubmit(instruction.trim());
            setInstruction('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && !isGenerating) {
            e.preventDefault();
            onClose();
        }
    };

    if (!isOpen || !position) return null;

    return (
        <div
            ref={containerRef}
            className="ai-inline-prompt"
            style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 1000,
            }}
        >
            {isGenerating ? (
                // Generating state: show loading indicator and accept/cancel buttons
                <div className="ai-inline-prompt-form grain-overlay bg-background border border-border rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                        {isStreaming ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                            <Check className="w-4 h-4 text-primary" />
                        )}
                        <span className="text-sm text-foreground">
                            {isStreaming ? 'Generating...' : 'Complete!'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onAccept}
                            className="flex-1 px-3 py-2 bg-primary text-white hover:bg-primary/90 rounded-md text-sm font-medium transition-colors"
                        >
                            Accept
                        </button>
                        <button
                            onClick={onCancel}
                            className="flex-1 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                // Input state: show prompt input
                <form onSubmit={handleSubmit} className="ai-inline-prompt-form grain-overlay">
                    <input
                        ref={inputRef}
                        type="text"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask AI to transform this text..."
                        className="ai-inline-prompt-input"
                    />
                    <div className="ai-inline-prompt-hint">
                        Press <kbd>Enter</kbd> to submit • <kbd>Esc</kbd> to cancel
                    </div>
                </form>
            )}
        </div>
    );
};
