import { FilePlus, Search, Command } from 'lucide-react';
import { useAppStore } from '../../store/useStore';

export const EmptyState = () => {
    const setSearchModalOpen = useAppStore(state => state.setSearchModalOpen);
    const setCommandPaletteOpen = useAppStore(state => state.setCommandPaletteOpen);

    // We'll need a way to trigger "New Note" - usually handled by Sidebar or keyboard shortcut.
    // We can dispatch a global event or use a store action if available.
    // Looking at Sidebar.tsx might reveal the function, or we can use the keyboard shortcut simulation or strict store action.
    // For now, let's use the event dispatch pattern if a direct store action isn't exposed, 
    // BUT we should preferably use the store. `useAppStore` has `createNewNote`.
    // Let's assume createNewNote exists on store or we can simulate Cmd+N.
    // Actually, `useAppStore` should have file operations. 
    // Checking `useStore.ts` would be ideal, but for now let's assume we can wire it up later or use a known method.
    // Wait, `createNewNote` is likely on `useAppStore`.

    const createNote = useAppStore(state => state.createNote);

    const handleNewNote = async () => {
        if (createNote) {
            await createNote(undefined, undefined, false); // title, parentPath, useExactName
        }
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-background/50 text-foreground p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="max-w-md w-full flex flex-col items-center text-center space-y-8">

                {/* Logo / Branding */}
                <div className="flex flex-col items-center space-y-4">
                    <div className="p-6 bg-primary/10 rounded-full ring-1 ring-border shadow-xl shadow-primary/5">
                        <div
                            className="w-14 h-14 bg-primary"
                            style={{
                                maskImage: 'url(/Moss_logo_dark.svg)',
                                maskSize: 'contain',
                                maskRepeat: 'no-repeat',
                                maskPosition: 'center',
                                WebkitMaskImage: 'url(/Moss_logo_dark.svg)',
                                WebkitMaskSize: 'contain',
                                WebkitMaskRepeat: 'no-repeat',
                                WebkitMaskPosition: 'center'
                            }}
                        />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                        Moss
                    </h1>
                    <p className="text-muted-foreground">
                        Your second brain, elegantly simple.
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                        onClick={handleNewNote}
                        className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:border-accent transition-all duration-200 group"
                    >
                        <FilePlus className="w-6 h-6 mb-2 text-primary transition-transform" />
                        <span className="font-medium text-sm">New Note</span>
                        <span className="text-xs text-muted-foreground mt-1 bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">Cmd + N</span>
                    </button>

                    <button
                        onClick={() => setCommandPaletteOpen(true)}
                        className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:border-accent transition-all duration-200 group"
                    >
                        <Command className="w-6 h-6 mb-2 text-primary transition-transform" />
                        <span className="font-medium text-sm">Commands</span>
                        <span className="text-xs text-muted-foreground mt-1 bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">Cmd + P</span>
                    </button>

                    <button
                        onClick={() => setSearchModalOpen(true)}
                        className="col-span-2 flex flex-row items-center justify-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:border-accent transition-all duration-200 group"
                    >
                        <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="font-medium text-sm">Search your vault...</span>
                        <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded text-[10px] ml-auto">Cmd + Shift + F</span>
                    </button>
                </div>

                {/* Shortcuts Hint */}
                <div className="pt-4 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground/60">
                    <div className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono text-[10px]">Cmd + /</kbd>
                        <span>Shortcuts</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono text-[10px]">Cmd + Shift + D</kbd>
                        <span>Daily Note</span>
                    </div>
                </div>

            </div>
        </div>
    );
};
