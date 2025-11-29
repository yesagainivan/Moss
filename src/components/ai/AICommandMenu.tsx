import { RefObject, useEffect, useRef } from 'react';
import { useAIStore } from '../../store/useAIStore';

interface AICommandMenuProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRef: RefObject<HTMLButtonElement | null>;
}

export const AICommandMenu = ({ isOpen, onClose, anchorRef }: AICommandMenuProps) => {
    const { customPrompts } = useAIStore();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                anchorRef.current &&
                !anchorRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    const handleCommand = (name: string, instruction: string) => {
        window.dispatchEvent(
            new CustomEvent('ai-command-trigger', {
                detail: { command: name, instruction },
            })
        );
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="absolute z-50 min-w-[200px] overflow-hidden rounded-xl border shadow-lg"
            style={{
                top: anchorRef.current ? anchorRef.current.offsetTop + anchorRef.current.offsetHeight + 4 : 0,
                left: anchorRef.current ? anchorRef.current.offsetLeft : 0,
                backgroundColor: 'var(--popover)',
                borderColor: 'var(--border)',
                color: 'var(--popover-foreground)',
            }}
        >
            {customPrompts.map((prompt) => (
                <button
                    key={prompt.id}
                    onClick={() => handleCommand(prompt.name, prompt.instruction)}
                    className="block w-full px-4 py-3 text-left text-sm transition-colors hover:bg-secondary"
                    style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                    }}
                >
                    {prompt.name}
                </button>
            ))}
        </div>
    );
};
