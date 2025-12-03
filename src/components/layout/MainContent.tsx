import { useMemo } from 'react';
import { Toolbar } from './Toolbar';
import { TabBar } from '../tabs/TabBar';
import { ResizableSplit } from './ResizableSplit';
import { AgentChat } from '../agent/AgentChat';
import GraphView from '../graph/GraphView';
import { PaneContainer } from './PaneContainer';
import { useAppStore } from '../../store/useStore';
import { useAgentStore } from '../../store/useAgentStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export const MainContent = () => {
    // Selective subscriptions to prevent re-renders on unrelated state changes
    const currentView = useAppStore(state => state.currentView);

    const isAgentOpen = useAgentStore(state => state.isOpen);
    const settings = useSettingsStore(state => state.settings);

    // Memoize PaneContainer to prevent remounting when unrelated state changes
    const paneContainer = useMemo(() => <PaneContainer />, []);

    // Memoize the main content area to maintain stable references
    const mainContent = useMemo(() => {
        if (currentView === 'graph' && settings.graphPosition === 'center') {
            return (
                <ResizableSplit
                    side="right"
                    initialSize={400}
                    minSize={300}
                    maxSize={800}
                    persistenceKey="moss-graph-width"
                    sideContent={<GraphView />}
                    mainContent={paneContainer}
                />
            );
        }
        return paneContainer;
    }, [currentView, settings.graphPosition, paneContainer]);

    // Memoize the side content area
    const sideContent = useMemo(() => {
        const showGraph = currentView === 'graph' && settings.graphPosition === 'sidebar';
        const showAgent = isAgentOpen;

        if (showGraph && showAgent) {
            return (
                <ResizableSplit
                    side="top"
                    initialSize={300}
                    minSize={150}
                    maxSize={600}
                    persistenceKey="moss-graph-height"
                    sideContent={<GraphView />}
                    mainContent={<AgentChat />}
                />
            );
        }

        if (showGraph) {
            return <GraphView />;
        }

        if (showAgent) {
            return <AgentChat />;
        }

        return null;
    }, [currentView, settings.graphPosition, isAgentOpen]);

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
            <Toolbar />
            <TabBar />

            <div className="flex-1 relative h-full overflow-hidden">
                <ResizableSplit
                    side="right"
                    initialSize={400}
                    minSize={300}
                    maxSize={600}
                    isOpen={isAgentOpen || (currentView === 'graph' && settings.graphPosition === 'sidebar')}
                    persistenceKey="moss-agent-width"
                    sideContent={sideContent}
                    mainContent={mainContent}
                />
            </div>
        </div>
    );
};
