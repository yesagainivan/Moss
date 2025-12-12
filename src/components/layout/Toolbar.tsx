import { Settings as SettingsIcon, Sparkles, Bot, ArrowLeft, ArrowRight, BarChart3, SplitSquareHorizontal, SplitSquareVertical, XCircle, Link2, List } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { SettingsModal } from '../settings/SettingsModal';
import { AICommandMenu } from '../ai/AICommandMenu';
import { useAgentStore } from '../../store/useAgentStore';
import { useAppStore } from '../../store/useStore';
import { usePaneStore } from '../../store/usePaneStore';
import { useGitStore } from '../../store/useGitStore';
import { SaveIndicator } from '../editor/SaveIndicator';
import { UndoAmbreButton } from '../git/UndoAmbreButton';
import { ActivityCalendar } from '../git/ActivityCalendar';
import { Clock } from 'lucide-react';
import { GitHubSyncIndicator } from '../toolbar/GitHubSyncIndicator';

export const Toolbar = () => {
    const [showSettings, setShowSettings] = useState(false);
    const [showAIMenu, setShowAIMenu] = useState(false);
    const [showActivity, setShowActivity] = useState(false);
    const aiButtonRef = useRef<HTMLButtonElement>(null);
    const { toggleOpen: toggleAgent, isOpen: isAgentOpen } = useAgentStore();
    const { navigateBack, navigateForward, isBacklinksPanelOpen, setBacklinksPanelOpen, isOutlinePanelOpen, setOutlinePanelOpen } = useAppStore();
    const { splitPane, closePane, activePaneId, paneRoot, getActivePane } = usePaneStore();
    const gitEnabled = useGitStore(state => state.gitEnabled);

    const activePane = getActivePane();
    const tabs = activePane?.tabs || [];
    const activeTabId = activePane?.activeTabId;
    const activeTab = tabs.find(t => t.id === activeTabId);
    const canGoBack = activeTab?.history && (activeTab.historyIndex || 0) > 0;
    const canGoForward = activeTab?.history && (activeTab.historyIndex || 0) < (activeTab.history.length - 1);

    // Check if we can close the current pane (must have more than one pane)
    const canClosePane = paneRoot.type === 'split';



    // Listen for settings shortcut
    useEffect(() => {
        const handleOpenSettings = () => {
            setShowSettings(true);
        };
        window.addEventListener('open-settings-modal', handleOpenSettings);
        return () => window.removeEventListener('open-settings-modal', handleOpenSettings);
    }, []);

    return (
        <>
            <div className="h-10 border-b border-border bg-background flex items-center justify-between px-2 pl-0 select-none">
                {/* Left side - Navigation & AI Tools */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 mr-2 border-r border-border">
                        <button
                            onClick={navigateBack}
                            disabled={!canGoBack}
                            className={`p-1.5 rounded-md transition-colors ${canGoBack ? 'hover:bg-accent/10 text-foreground' : 'text-muted-foreground/50 cursor-not-allowed'}`}
                            title="Go Back"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={navigateForward}
                            disabled={!canGoForward}
                            className={`p-1.5 rounded-md transition-colors ${canGoForward ? 'hover:bg-accent/10 text-foreground' : 'text-muted-foreground/50 cursor-not-allowed'}`}
                            title="Go Forward"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-1 mr-2 border-r border-border pr-2">
                        <button
                            onClick={() => activePaneId && splitPane(activePaneId, 'vertical')}
                            className="p-1.5 hover:bg-accent/10 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                            title="Split Vertical (Cmd+\)"
                        >
                            <SplitSquareHorizontal className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => activePaneId && splitPane(activePaneId, 'horizontal')}
                            className="p-1.5 hover:bg-accent/10 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                            title="Split Horizontal (Cmd+Shift+\)"
                        >
                            <SplitSquareVertical className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => activePaneId && closePane(activePaneId)}
                            disabled={!canClosePane}
                            className={`p-1.5 rounded-md transition-colors ${canClosePane ? 'hover:bg-accent/10 text-muted-foreground hover:text-foreground' : 'text-muted-foreground/30 cursor-not-allowed'}`}
                            title="Close Pane (Cmd+W)"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>

                    <UndoAmbreButton />

                    {gitEnabled && activeTab && (
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-history-modal'))}
                            className="p-1.5 hover:bg-accent/10 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                            title="View History"
                        >
                            <Clock className="w-4 h-4" />
                        </button>
                    )}

                    {gitEnabled && (
                        <button
                            onClick={() => setShowActivity(true)}
                            className="p-1.5 hover:bg-accent/10 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                            title="Activity Calendar"
                        >
                            <BarChart3 className="w-4 h-4" />
                        </button>
                    )}

                    <button
                        ref={aiButtonRef}
                        onClick={() => setShowAIMenu(!showAIMenu)}
                        className={`p-1.5 rounded-md transition-colors ${showAIMenu ? 'bg-accent/10 text-accent' : 'hover:bg-accent/10 text-muted-foreground'
                            }`}
                        title="AI Tools"
                    >
                        <Sparkles className="w-4 h-4" />
                    </button>
                </div>

                {/* Center - Save Indicator */}
                <SaveIndicator />

                {/* Right side - Settings & Agent */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setBacklinksPanelOpen(!isBacklinksPanelOpen)}
                        className={`p-1.5 rounded-md transition-colors ${isBacklinksPanelOpen ? 'bg-accent/10 text-accent' : 'hover:bg-accent/10 text-muted-foreground'}`}
                        title="Toggle Backlinks (Cmd+Opt+B)"
                    >
                        <Link2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setOutlinePanelOpen(!isOutlinePanelOpen)}
                        className={`p-1.5 rounded-md transition-colors ${isOutlinePanelOpen ? 'bg-accent/10 text-accent' : 'hover:bg-accent/10 text-muted-foreground'}`}
                        title="Toggle Outline (Cmd+Opt+O)"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <GitHubSyncIndicator />
                    <button
                        onClick={toggleAgent}
                        className={`p-1.5 rounded-md transition-colors ${isAgentOpen ? 'bg-accent/10 text-accent' : 'hover:bg-accent/10 text-muted-foreground'}`}
                        title="Chat with Ambre"
                    >
                        <Bot className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-1.5 hover:bg-accent/10 rounded-md transition-colors"
                        title="Settings"
                    >
                        <SettingsIcon className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
            </div>

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />

            <AICommandMenu
                isOpen={showAIMenu}
                onClose={() => setShowAIMenu(false)}
                anchorRef={aiButtonRef}
            />



            <ActivityCalendar
                isOpen={showActivity}
                onClose={() => setShowActivity(false)}
            />
        </>
    );
};
