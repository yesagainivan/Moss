import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface ResizableSplitProps {
    mainContent: React.ReactNode;
    sideContent: React.ReactNode;
    side: 'left' | 'right' | 'top' | 'bottom';
    initialSize?: number;
    minSize?: number;
    maxSize?: number;
    isOpen?: boolean;
    className?: string;
    persistenceKey?: string; // Key for localStorage persistence
}

export const ResizableSplit: React.FC<ResizableSplitProps> = React.memo(({
    mainContent,
    sideContent,
    side,
    initialSize = 250,
    minSize = 200,
    maxSize = 600,
    isOpen = true,
    className,
    persistenceKey
}) => {
    // Load persisted size
    const loadedSize = persistenceKey
        ? localStorage.getItem(persistenceKey)
        : null;
    const [size, setSize] = useState(
        loadedSize ? parseInt(loadedSize, 10) : initialSize
    );
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const isVertical = side === 'top' || side === 'bottom';

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            let newSize = initialSize;

            if (side === 'left') {
                newSize = e.clientX - rect.left;
            } else if (side === 'right') {
                newSize = rect.right - e.clientX;
            } else if (side === 'top') {
                newSize = e.clientY - rect.top;
            } else if (side === 'bottom') {
                newSize = rect.bottom - e.clientY;
            }

            if (newSize >= minSize && newSize <= maxSize) {
                setSize(newSize);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('blur', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('blur', handleMouseUp);
        };
    }, [isResizing, side, minSize, maxSize, initialSize]);

    // Persistence
    useEffect(() => {
        if (!isResizing && persistenceKey) {
            localStorage.setItem(persistenceKey, size.toString());
        }
    }, [isResizing, size, persistenceKey]);

    // Always render the same structure, use CSS to hide/show instead of conditional rendering
    // This prevents mainContent from remounting when isOpen changes
    return (
        <div ref={containerRef} className={cn("flex h-full w-full overflow-hidden", isVertical ? "flex-col" : "flex-row", className)}>
            {(side === 'left' || side === 'top') && (
                <>
                    <div
                        ref={sidebarRef}
                        style={{
                            [isVertical ? 'height' : 'width']: isOpen ? size : 0,
                            display: isOpen ? 'block' : 'none'
                        }}
                        className="shrink-0 overflow-hidden"
                    >
                        {sideContent}
                    </div>
                    {isOpen && (
                        <div
                            className={cn(
                                "z-10 flex items-center justify-center group transition-colors hover:bg-accent/50 active:bg-accent",
                                isVertical ? "h-1 w-full cursor-row-resize" : "w-1 h-full cursor-col-resize"
                            )}
                            onMouseDown={startResizing}
                        >
                            <div className={cn(
                                "bg-border group-hover:bg-accent/50",
                                isVertical ? "h-[1px] w-full" : "w-[1px] h-full"
                            )} />
                        </div>
                    )}
                </>
            )}

            <div className="flex-1 min-w-0 min-h-0 overflow-hidden relative">
                {mainContent}
                {isResizing && (
                    <div className={cn("fixed inset-0 z-[9999] select-none", isVertical ? "cursor-row-resize" : "cursor-col-resize")} />
                )}
            </div>

            {(side === 'right' || side === 'bottom') && (
                <>
                    {isOpen && (
                        <div
                            className={cn(
                                "z-10 flex items-center justify-center group transition-colors hover:bg-accent/50 active:bg-accent",
                                isVertical ? "h-1 w-full cursor-row-resize" : "w-1 h-full cursor-col-resize"
                            )}
                            onMouseDown={startResizing}
                        >
                            <div className={cn(
                                "bg-border group-hover:bg-accent/50",
                                isVertical ? "h-[1px] w-full" : "w-[1px] h-full"
                            )} />
                        </div>
                    )}
                    <div
                        style={{
                            [isVertical ? 'height' : 'width']: isOpen ? size : 0,
                            display: isOpen ? 'block' : 'none'
                        }}
                        className="shrink-0 overflow-hidden"
                    >
                        {sideContent}
                    </div>
                </>
            )}
        </div>
    );
});
