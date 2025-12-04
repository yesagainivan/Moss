import React, { useCallback } from 'react';
import { usePaneStore } from '../../store/usePaneStore';
import { PaneNode } from '../../types';
import { PaneView } from './PaneView';
import { ResizableSplit } from './ResizableSplit';

/**
 * PaneContainer recursively renders the pane tree
 * Handles both single panes and split layouts
 */
export const PaneContainer = () => {
    const paneRoot = usePaneStore(state => state.paneRoot);
    const activePaneId = usePaneStore(state => state.activePaneId);

    // Memoize renderPane to prevent unnecessary re-renders
    const renderPane = useCallback((node: PaneNode): React.ReactElement => {
        if (node.type === 'leaf') {
            // Render a single pane with editor
            return <PaneView paneId={node.id} isActive={node.id === activePaneId} />;
        }

        if (node.type === 'split' && node.children) {
            // Render split panes recursively
            const [leftChild, rightChild] = node.children;
            const isHorizontal = node.direction === 'horizontal';

            return (
                <ResizableSplit
                    side={isHorizontal ? 'top' : 'left'}
                    initialSize={node.splitRatio ? node.splitRatio * 100 : 50}
                    minSize={isHorizontal ? 100 : 200}
                    maxSize={isHorizontal ? 600 : 800}
                    sideContent={renderPane(leftChild)}
                    mainContent={renderPane(rightChild)}
                    persistenceKey={`moss-pane-split-${node.id}`}
                    isOpen={true}
                />
            );
        }

        return <div>Invalid pane configuration</div>;
    }, [activePaneId]); // Only recreate when activePaneId changes

    return (
        <div className="flex-1 h-full overflow-hidden">
            {renderPane(paneRoot)}
        </div>
    );
};
