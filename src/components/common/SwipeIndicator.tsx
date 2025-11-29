import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export interface SwipeIndicatorHandle {
    update: (progress: number, direction: 'left' | 'right', isEnabled?: boolean) => void;
    reset: () => void;
}

export const SwipeIndicator = forwardRef<SwipeIndicatorHandle, {}>((_, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentDirection, setCurrentDirection] = useState<'left' | 'right' | null>(null);
    const [isDisabled, setIsDisabled] = useState(false);

    useImperativeHandle(ref, () => ({
        update: (progress: number, direction: 'left' | 'right', isEnabled = true) => {
            if (!containerRef.current) return;

            // Update direction state only if it changes (rare)
            setCurrentDirection(prev => {
                if (prev !== direction) return direction;
                return prev;
            });

            // Update disabled state
            setIsDisabled(!isEnabled);

            // Calculate styles with different behavior for disabled state
            let opacity: number;
            let scale: number;

            if (!isEnabled) {
                // Disabled state: lower max opacity, minimal animation
                opacity = Math.min(0.4, Math.max(0, (progress - 0.1) / 0.5) * 0.4);
                scale = 0.8 + (Math.min(1, progress) * 0.2); // Less dramatic scaling
            } else {
                // Enabled state: full brightness and animation
                opacity = Math.min(1, Math.max(0, (progress - 0.1) / 0.7));
                scale = 0.8 + (Math.min(1, progress) * 0.4);
            }

            const translateX = direction === 'left'
                ? Math.min(40, progress * 60)
                : Math.max(-40, -progress * 60);

            const isLeft = direction === 'left';

            // Apply styles directly
            const el = containerRef.current;
            // Disable transition for instant tracking
            el.style.transition = 'none';
            el.style.opacity = opacity.toString();
            el.style.transform = `translateY(-50%) translateX(${translateX}px) scale(${scale})`;

            // Update positioning classes manually if needed, or just keep fixed positioning
            if (isLeft) {
                el.style.left = '1rem'; // left-4
                el.style.right = 'auto';
            } else {
                el.style.left = 'auto';
                el.style.right = '1rem'; // right-4
            }
        },
        reset: () => {
            if (containerRef.current) {
                // Enable transition for smooth fade out
                containerRef.current.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out';
                containerRef.current.style.opacity = '0';
                // Reset transform to avoid layout jumps, but keep scale/translate consistent
                containerRef.current.style.transform = 'translateY(-50%) scale(0.8)';
            }
            setIsDisabled(false);
        }
    }));

    // Always render, but control visibility via opacity
    return (
        <div
            ref={containerRef}
            className="fixed top-1/2 -translate-y-1/2 z-50 pointer-events-none transition-none will-change-transform"
            style={{ opacity: 0 }}
        >
            <div className={`
                flex items-center justify-center w-12 h-12 rounded-full 
                bg-background/80 backdrop-blur-md border border-border shadow-lg
                text-foreground transition-all
                ${isDisabled ? 'opacity-60 grayscale' : ''}
            `}>
                {currentDirection === 'left' ? (
                    <ArrowLeft className="w-6 h-6" />
                ) : (
                    <ArrowRight className="w-6 h-6" />
                )}
            </div>
        </div>
    );
});

SwipeIndicator.displayName = 'SwipeIndicator';
