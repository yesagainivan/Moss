import { useEffect, useState } from 'react';
import { X, Command, FileText, RefreshCw, Layout } from 'lucide-react';

export const ShortcutsModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-shortcuts-modal', handleOpen);
        return () => window.removeEventListener('open-shortcuts-modal', handleOpen);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    const categories = [
        {
            title: 'General',
            icon: <Command className="w-4 h-4" />,
            shortcuts: [
                { keys: ['Cmd', 'Shift', 'F'], description: 'Global Search' },
                { keys: ['Cmd', 'P'], description: 'Command Palette' },
                { keys: ['Cmd', ','], description: 'Settings' },
                { keys: ['Cmd', '/'], description: 'Show Shortcuts' },
            ]
        },
        {
            title: 'Editor',
            icon: <FileText className="w-4 h-4" />,
            shortcuts: [
                { keys: ['Cmd', 'S'], description: 'Save Note' },
                { keys: ['Cmd', 'K'], description: 'AI Assistant' },
                { keys: ['Cmd', 'F'], description: 'Find in Note' },
                { keys: ['Cmd', 'Click'], description: 'Open Link' },
            ]
        },
        {
            title: 'Navigation',
            icon: <RefreshCw className="w-4 h-4" />,
            shortcuts: [
                { keys: ['Cmd', '['], description: 'Go Back' },
                { keys: ['Cmd', ']'], description: 'Go Forward' },
                { keys: ['Cmd', 'Shift', 'D'], description: 'Daily Note' },
                { keys: ['Cmd', 'H'], description: 'Note History' },
            ]
        },
        {
            title: 'Layout',
            icon: <Layout className="w-4 h-4" />,
            shortcuts: [
                { keys: ['Cmd', 'B'], description: 'Toggle Sidebar' },
                { keys: ['Cmd', 'Opt', 'B'], description: 'Toggle Backlinks' },
                { keys: ['Cmd', 'Opt', 'O'], description: 'Toggle Outline' },
                { keys: ['Cmd', '\\'], description: 'Split Vertically' },
            ]
        }
    ];

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className="w-full max-w-3xl bg-card border border-border shadow-2xl rounded-xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-border bg-card/50">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-accent/10 rounded-lg">
                                    <Command className="w-5 h-5 text-accent" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                                    <p className="text-sm text-muted-foreground">Master the keyboard to work faster</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-accent/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                            {categories.map((category) => (
                                <div key={category.title} className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground pb-2 border-b border-border/50">
                                        {category.icon}
                                        {category.title}
                                    </div>
                                    <div className="space-y-3">
                                        {category.shortcuts.map((shortcut, idx) => (
                                            <div key={idx} className="flex items-center justify-between group">
                                                <span className="text-sm text-foreground group-hover:text-accent transition-colors">
                                                    {shortcut.description}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {shortcut.keys.map((key, keyIdx) => (
                                                        <div key={keyIdx} className="flex items-center">
                                                            <kbd className="h-6 px-2 min-w-[1.5rem] flex items-center justify-center bg-secondary/50 border border-border rounded text-[10px] font-sans font-medium text-muted-foreground shadow-sm">
                                                                {key}
                                                            </kbd>
                                                            {keyIdx < shortcut.keys.length - 1 && (
                                                                <span className="mx-0.5 text-muted-foreground/30 text-xs">+</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-muted/20 border-t border-border flex justify-center text-xs text-muted-foreground">
                            Press <kbd className="mx-1 px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">Esc</kbd> to close
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
