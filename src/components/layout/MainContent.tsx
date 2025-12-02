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
                    sideContent={
                        (() => {
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
                        })()
                    }
                    mainContent={
                        currentView === 'graph' && settings.graphPosition === 'center' ? (
                            <ResizableSplit
                                side="right"
                                initialSize={400}
                                minSize={300}
                                maxSize={800}
                                persistenceKey="moss-graph-width"
                                sideContent={<GraphView />}
                                mainContent={<PaneContainer />}
                            />
                        ) : (
                            <PaneContainer />
                        )
                    }
                />
            </div>
        </div>
    );
};
