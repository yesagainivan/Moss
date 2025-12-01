import { useAppStore } from '../../store/useStore';

/**
 * Undo button for reverting Ambre's last change
 * Uses Git revert (safe, non-destructive)
 */
export const UndoAmbreButton = () => {
    const { gitEnabled, undoLastAmbreChange } = useAppStore();

    if (!gitEnabled) {
        return null; // Hide button if Git is not enabled
    }

    return (
        <button
            onClick={undoLastAmbreChange}
            className="p-2 hover:bg-secondary rounded transition-colors group relative"
            title="Undo last Ambre change"
            aria-label="Undo last change made by Ambre"
        >
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground group-hover:text-foreground transition-colors"
            >
                {/* Undo icon - curved arrow pointing left */}
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
            </svg>

            {/* Tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-background border border-border text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Undo Ambre's last change
            </div>
        </button>
    );
};
