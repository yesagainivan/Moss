import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { useAIStore, AIProvider, DEFAULT_PERSONA } from '../../store/useAIStore';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAppStore } from '../../store/useStore';
import { useGitStore } from '../../store/useGitStore';
import { VaultHistory } from '../git/VaultHistory';
import { GitHubLogin } from './GitHubLogin';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Select } from '../common/Select';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: Tab;
}

type Tab = 'editor' | 'ai' | 'git';

export const SettingsModal = ({ isOpen, onClose, initialTab = 'editor' }: SettingsModalProps) => {
    const { settings, updateSettings } = useSettingsStore();
    const {
        selectedProvider,
        selectedModel,
        models,
        setProvider,
        setModel,
        systemPrompt,
        setSystemPrompt,
        useDefaultSystemPrompt,
        setUseDefaultSystemPrompt,
        customPrompts,
        addCustomPrompt,
        updateCustomPrompt,
        deleteCustomPrompt,
    } = useAIStore();

    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [newPromptName, setNewPromptName] = useState('');
    const [newPromptInstruction, setNewPromptInstruction] = useState('');
    const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
    const [isIndexing, setIsIndexing] = useState(false);
    const [indexStatus, setIndexStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [indexMessage, setIndexMessage] = useState('');
    const { requestConfirmation } = useAppStore();
    const { gitEnabled, checkGitStatus } = useGitStore();
    const [isInitializingGit, setIsInitializingGit] = useState(false);
    const [gitMessage, setGitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    // Confirm Dialog State
    const [modelToDelete, setModelToDelete] = useState<{ provider: AIProvider, model: string } | null>(null);

    // Handle close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 50); // Match animation duration
    };

    // Reset tab when opened with new initialTab
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    // Load API key when provider changes
    useEffect(() => {
        const loadApiKey = async () => {
            if (selectedProvider) {
                try {
                    const key = await invoke<string>('get_api_key', { provider: selectedProvider });
                    setApiKey(key);
                } catch (e) {
                    // No key found or error, clear input
                    setApiKey('');
                }
            } else {
                setApiKey('');
            }
            setTestStatus('idle');
            setErrorMessage('');
        };

        if (isOpen) {
            loadApiKey();
        }
    }, [selectedProvider, isOpen]);

    // Check Git status when modal opens
    useEffect(() => {
        if (isOpen) {
            checkGitStatus();
        }
    }, [isOpen, checkGitStatus]);

    const handleSaveKey = async () => {
        if (!selectedProvider) return;

        setIsSaving(true);
        try {
            if (apiKey.trim()) {
                await invoke('save_api_key', { provider: selectedProvider, key: apiKey });
            } else {
                await invoke('delete_api_key', { provider: selectedProvider });
            }
            setTestStatus('idle');
        } catch (e) {
            console.error('Failed to save key:', e);
            setErrorMessage('Failed to save API key');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!selectedProvider) return;

        setIsTesting(true);
        setTestStatus('idle');
        setErrorMessage('');

        try {
            // Ensure key is saved first if it was just typed
            if (apiKey.trim()) {
                await invoke('save_api_key', { provider: selectedProvider, key: apiKey });
            }

            const success = await invoke<boolean>('test_ai_connection', { provider: selectedProvider });
            if (success) {
                setTestStatus('success');
            } else {
                setTestStatus('error');
                setErrorMessage('Connection failed. Please check your API key.');
            }
        } catch (e) {
            setTestStatus('error');
            setErrorMessage(typeof e === 'string' ? e : 'Connection failed');
        } finally {
            setIsTesting(false);
        }
    };

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    if (!isOpen && !isClosing) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="modal-backdrop"
                onClick={handleClose}
            >
                {/* Modal */}
                <div
                    className={`${isClosing ? 'modal-exit' : 'modal-appear'} bg-background border border-border rounded-2xl shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border">
                        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
                        <button
                            onClick={handleClose}
                            className="p-1 hover:bg-primary/10 rounded-md transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-border mb-6 mt-4 px-6">
                        <button
                            onClick={() => setActiveTab('editor')}
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'editor'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Editor
                        </button>
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ai'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            AI
                        </button>
                        <button
                            onClick={() => setActiveTab('git')}
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'git'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Version Control
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'editor' && (
                            <div className="space-y-6 px-6">
                                {/* Editor Section */}
                                <div>
                                    <h3 className="text-lg font-medium text-foreground mb-4">Theme Library</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-2">
                                            <button
                                                onClick={() => useThemeStore.getState().setActiveTheme(null)}
                                                className={`p-3 rounded-lg border text-left transition-all ${!useThemeStore.getState().activeThemeId
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:bg-secondary/50'
                                                    }`}
                                            >
                                                <div className="font-medium text-sm">Default Theme</div>
                                                <div className="text-xs text-muted-foreground">The classic Moss experience</div>
                                            </button>

                                            {useThemeStore.getState().themes.map(theme => (
                                                <button
                                                    key={theme.name}
                                                    onClick={() => useThemeStore.getState().setActiveTheme(theme.name)}
                                                    className={`p-3 rounded-lg border text-left transition-all ${useThemeStore.getState().activeThemeId === theme.name
                                                        ? 'border-primary bg-primary/10'
                                                        : 'border-border hover:bg-secondary/50'
                                                        }`}
                                                >
                                                    <div className="font-medium text-sm">{theme.name}</div>
                                                    <div className="text-xs text-muted-foreground">{theme.description}</div>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => useThemeStore.getState().loadThemes()}
                                                className="px-3 py-2 text-xs font-medium bg-border hover:bg-border/80 rounded-md transition-colors"
                                            >
                                                Reload Themes
                                            </button>
                                            {/* Open Folder button placeholder */}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Place .yaml theme files in your app data directory to add custom themes.
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-border my-6"></div>

                                <div>
                                    <h3 className="text-lg font-medium text-foreground mb-4">Editor Appearance</h3>
                                    <div className="space-y-4">
                                        {/* Theme Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Theme
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(['light', 'dark', 'system'] as const).map((theme) => (
                                                    <button
                                                        key={theme}
                                                        onClick={() => updateSettings({ theme })}
                                                        className={`px-3 py-2 text-sm font-medium rounded-md border transition-all ${settings.theme === theme
                                                            ? 'bg-primary text-background border-primary'
                                                            : 'bg-background text-foreground border-input hover:bg-secondary/50'
                                                            }`}
                                                    >
                                                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Knowledge Graph Section */}
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                                                Knowledge Graph
                                            </h3>
                                            <div className="space-y-4">
                                                {/* Graph Position */}
                                                <div>
                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                        Position
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            onClick={() => updateSettings({ graphPosition: 'center' })}
                                                            className={`px-3 py-2 text-sm font-medium rounded-md border transition-all ${settings.graphPosition === 'center'
                                                                ? 'bg-primary text-background border-primary'
                                                                : 'bg-background text-foreground border-input hover:bg-secondary/50'
                                                                }`}
                                                        >
                                                            Center (Split)
                                                        </button>
                                                        <button
                                                            onClick={() => updateSettings({ graphPosition: 'sidebar' })}
                                                            className={`px-3 py-2 text-sm font-medium rounded-md border transition-all ${settings.graphPosition === 'sidebar'
                                                                ? 'bg-primary text-background border-primary'
                                                                : 'bg-background text-foreground border-input hover:bg-secondary/50'
                                                                }`}
                                                        >
                                                            Sidebar (Stacked)
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Sidebar Position */}
                                                <div>
                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                        Sidebar Position (Outline/Backlinks)
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            onClick={() => updateSettings({ sidebarPosition: 'left' })}
                                                            className={`px-3 py-2 text-sm font-medium rounded-md border transition-all ${settings.sidebarPosition === 'left'
                                                                ? 'bg-primary text-background border-primary'
                                                                : 'bg-background text-foreground border-input hover:bg-secondary/50'
                                                                }`}
                                                        >
                                                            Left
                                                        </button>
                                                        <button
                                                            onClick={() => updateSettings({ sidebarPosition: 'right' })}
                                                            className={`px-3 py-2 text-sm font-medium rounded-md border transition-all ${settings.sidebarPosition === 'right' || !settings.sidebarPosition // partial backward compatibility
                                                                ? 'bg-primary text-background border-primary'
                                                                : 'bg-background text-foreground border-input hover:bg-secondary/50'
                                                                }`}
                                                        >
                                                            Right
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Graph Particles */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <label className="text-sm font-medium text-foreground">
                                                            Link Particles
                                                        </label>
                                                        <p className="text-xs text-muted-foreground">
                                                            Show animated dots moving along links.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => updateSettings({ graphShowParticles: !settings.graphShowParticles })}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${settings.graphShowParticles ? 'bg-primary' : 'bg-input'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.graphShowParticles ? 'translate-x-6' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
                                                </div>

                                                {/* Graph Labels */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <label className="text-sm font-medium text-foreground">
                                                            Node Labels
                                                        </label>
                                                        <p className="text-xs text-muted-foreground">
                                                            Show text labels for notes. Hiding them improves performance.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => updateSettings({ graphShowLabels: !settings.graphShowLabels })}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${settings.graphShowLabels ? 'bg-primary' : 'bg-input'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.graphShowLabels ? 'translate-x-6' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full h-[1px] bg-border my-2"></div>

                                        {/* UI Font Size */}
                                        <div>
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-foreground">
                                                        UI Font Size: {settings.uiFontSize}px
                                                    </label>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        Controls sidebars, panels, and menus
                                                    </p>
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min="12"
                                                max="18"
                                                step="1"
                                                value={settings.uiFontSize}
                                                onChange={(e) =>
                                                    updateSettings({ uiFontSize: parseInt(e.target.value) })
                                                }
                                                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>12px</span>
                                                <span>18px</span>
                                            </div>
                                        </div>

                                        {/* Editor Font Size */}
                                        <div>
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-foreground">
                                                        Editor Font Size: {settings.editorFontSize}px
                                                    </label>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        Controls note content size
                                                    </p>
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min="14"
                                                max="24"
                                                step="1"
                                                value={settings.editorFontSize}
                                                onChange={(e) =>
                                                    updateSettings({ editorFontSize: parseInt(e.target.value) })
                                                }
                                                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>14px</span>
                                                <span>24px</span>
                                            </div>
                                        </div>

                                        {/* Line Height */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Line Height: {settings.lineHeight.toFixed(1)}
                                            </label>
                                            <input
                                                type="range"
                                                min="1.4"
                                                max="2.0"
                                                step="0.1"
                                                value={settings.lineHeight}
                                                onChange={(e) =>
                                                    updateSettings({ lineHeight: parseFloat(e.target.value) })
                                                }
                                                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>Compact</span>
                                                <span>Spacious</span>
                                            </div>
                                        </div>

                                        {/* Grain Level */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Glass Grain: {settings.grainLevel === 0 ? 'None' : settings.grainLevel}
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="5"
                                                value={settings.grainLevel}
                                                onChange={(e) => {
                                                    const level = parseInt(e.target.value);
                                                    updateSettings({ grainLevel: level });
                                                    useThemeStore.getState().updateGrainLevel(level);
                                                }}
                                                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>None</span>
                                                <span>Heavy</span>
                                            </div>
                                        </div>

                                        {/* Grain Texture */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Grain Texture
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(['subtle', 'dense', 'noise'] as const).map((texture) => (
                                                    <button
                                                        key={texture}
                                                        onClick={() => {
                                                            updateSettings({ grainTexture: texture });
                                                            useThemeStore.getState().updateGrainTexture(texture);
                                                        }}
                                                        className={`px-3 py-2 text-sm font-medium rounded-md border transition-all ${settings.grainTexture === texture
                                                            ? 'bg-primary text-background border-primary'
                                                            : 'bg-background text-foreground border-input hover:bg-secondary/50'
                                                            }`}
                                                    >
                                                        {texture.charAt(0).toUpperCase() + texture.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Readable Line Length (Max Width) */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-medium text-foreground">
                                                    Readable Line Length
                                                </label>
                                                <p className="text-xs text-muted-foreground">
                                                    Limit editor width for comfortable reading on wide screens.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => updateSettings({ enableMaxWidth: !settings.enableMaxWidth })}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enableMaxWidth ? 'bg-primary' : 'bg-secondary'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enableMaxWidth ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Max Width Slider - only shown when enabled */}
                                        {settings.enableMaxWidth && (
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    Max Width: {settings.maxWidth}px
                                                </label>
                                                <input
                                                    type="range"
                                                    min="600"
                                                    max="1200"
                                                    step="50"
                                                    value={settings.maxWidth}
                                                    onChange={(e) =>
                                                        updateSettings({ maxWidth: parseInt(e.target.value) })
                                                    }
                                                    className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                                                />
                                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                    <span>Narrow</span>
                                                    <span>Wide</span>
                                                </div>
                                            </div>
                                        )}


                                        {/* Auto-save Delay */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Auto-save Delay: {settings.autoSaveDelay === 0 ? 'Instant' : `${settings.autoSaveDelay / 1000}s`}
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="5000"
                                                step="500"
                                                value={settings.autoSaveDelay}
                                                onChange={(e) =>
                                                    updateSettings({ autoSaveDelay: parseInt(e.target.value) })
                                                }
                                                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>Instant</span>
                                                <span>5 seconds</span>
                                            </div>
                                        </div>

                                        {/* Spell Check */}
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-foreground">
                                                Spell Check
                                            </label>
                                            <button
                                                onClick={() => updateSettings({ spellCheck: !settings.spellCheck })}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.spellCheck ? 'bg-primary' : 'bg-secondary'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.spellCheck ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Show Diff Panel */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-medium text-foreground">
                                                    Show AI Diff Panel
                                                </label>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Preview AI changes in a diff view before accepting (when off, changes stream directly)
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => updateSettings({ showDiffPanel: !settings.showDiffPanel })}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showDiffPanel ? 'bg-primary' : 'bg-secondary'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showDiffPanel ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Tab */}
                        {activeTab === 'ai' && (
                            <div className="space-y-6 px-6">
                                <div>
                                    <h3 className="text-lg font-medium text-foreground mb-4">AI Provider</h3>
                                    <div className="space-y-4">
                                        {/* Provider Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Provider
                                            </label>
                                            <Select
                                                value={selectedProvider}
                                                onChange={(value) => setProvider(value as AIProvider)}
                                                options={[
                                                    { value: 'gemini', label: 'Google Gemini (Free Tier Available)' },
                                                    { value: 'cerebras', label: 'Cerebras (Fast Inference)' },
                                                    { value: 'openrouter', label: 'OpenRouter (Claude, GPT-4, etc.)' },
                                                    { value: 'ollama', label: 'Ollama (Local)' }
                                                ]}
                                                placeholder="Select a provider..."
                                            />
                                        </div>

                                        {selectedProvider && (
                                            <>
                                                {/* Model Selection */}
                                                <div>
                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                        Model
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <Select
                                                            value={selectedModel}
                                                            onChange={(value) => setModel(value)}
                                                            options={models[selectedProvider].map(model => ({
                                                                value: model,
                                                                label: model
                                                            }))}
                                                            placeholder="Select a model..."
                                                            className="flex-1"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                if (selectedProvider && selectedModel) {
                                                                    setModelToDelete({ provider: selectedProvider, model: selectedModel });
                                                                }
                                                            }}
                                                            disabled={!selectedModel}
                                                            className="px-3 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                                                            title="Remove selected model"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Add New Model */}
                                                    <div className="mt-2 flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Add new model ID (e.g. gpt-4-turbo)"
                                                            className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted-foreground"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const input = e.currentTarget;
                                                                    const val = input.value.trim();
                                                                    if (val && selectedProvider) {
                                                                        useAIStore.getState().addModel(selectedProvider, val);
                                                                        input.value = '';
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                if (selectedProvider) {
                                                                    useAIStore.getState().resetModels(selectedProvider);
                                                                }
                                                            }}
                                                            className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground underline"
                                                        >
                                                            Reset Defaults
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* API Key */}
                                                <div>
                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                        {selectedProvider === 'ollama' ? 'Host URL' : 'API Key'}
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type={selectedProvider === 'ollama' ? 'text' : 'password'}
                                                            value={apiKey}
                                                            onChange={(e) => setApiKey(e.target.value)}
                                                            placeholder={
                                                                selectedProvider === 'gemini' ? "Enter your Gemini API Key" :
                                                                    selectedProvider === 'cerebras' ? "Enter your Cerebras API Key" :
                                                                        selectedProvider === 'openrouter' ? "Enter your OpenRouter API Key" :
                                                                            "http://localhost:11434 (default)"
                                                            }
                                                            className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted-foreground"
                                                        />
                                                        <button
                                                            onClick={handleSaveKey}
                                                            disabled={isSaving}
                                                            className="px-4 py-2 bg-accent hover:bg-accent/80 text-background rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {isSaving ? 'Saving...' : 'Save'}
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {selectedProvider === 'ollama'
                                                            ? "Enter your Ollama host URL. Leave empty to use default (http://localhost:11434)."
                                                            : "Your API key is stored securely in your system's keychain."}
                                                    </p>
                                                </div>

                                                {/* System Prompt Configuration */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="block text-sm font-medium text-foreground">
                                                            Agent Persona
                                                        </label>
                                                        <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg">
                                                            <button
                                                                onClick={() => setUseDefaultSystemPrompt(true)}
                                                                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${useDefaultSystemPrompt
                                                                    ? 'bg-background shadow-sm text-foreground'
                                                                    : 'text-muted-foreground hover:text-foreground'
                                                                    }`}
                                                            >
                                                                Default
                                                            </button>
                                                            <button
                                                                onClick={() => setUseDefaultSystemPrompt(false)}
                                                                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${!useDefaultSystemPrompt
                                                                    ? 'bg-background shadow-sm text-foreground'
                                                                    : 'text-muted-foreground hover:text-foreground'
                                                                    }`}
                                                            >
                                                                Custom
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <textarea
                                                        value={useDefaultSystemPrompt ? DEFAULT_PERSONA : systemPrompt}
                                                        onChange={(e) => !useDefaultSystemPrompt && setSystemPrompt(e.target.value)}
                                                        readOnly={useDefaultSystemPrompt}
                                                        placeholder="You are a helpful writing assistant..."
                                                        className={`w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent min-h-[150px] resize-y ${useDefaultSystemPrompt ? 'opacity-70 cursor-not-allowed' : ''
                                                            }`}
                                                    />
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {useDefaultSystemPrompt
                                                            ? "Using the built-in Mosaic persona. Switch to 'Custom' to define your own."
                                                            : "Define the personality and voice of the AI assistant. Core tool instructions will be automatically appended."}
                                                    </p>
                                                </div>

                                                {/* Editor Actions */}
                                                <div>
                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                        Editor Actions
                                                    </label>
                                                    <div className="space-y-3">
                                                        {customPrompts.map((prompt) => (
                                                            <div
                                                                key={prompt.id}
                                                                className="border border-input rounded-md p-3 space-y-2"
                                                            >
                                                                {editingPromptId === prompt.id ? (
                                                                    <>
                                                                        <input
                                                                            type="text"
                                                                            defaultValue={prompt.name}
                                                                            placeholder="Prompt Name"
                                                                            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                                                            onBlur={(e) => {
                                                                                const newName = e.target.value.trim();
                                                                                const textareaValue = e.target.parentElement?.querySelector('textarea')?.value.trim();
                                                                                if (newName && textareaValue) {
                                                                                    updateCustomPrompt(prompt.id, newName, textareaValue);
                                                                                }
                                                                                setEditingPromptId(null);
                                                                            }}
                                                                        />
                                                                        <textarea
                                                                            defaultValue={prompt.instruction}
                                                                            placeholder="Instruction"
                                                                            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent min-h-[60px] resize-y"
                                                                        />
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex items-start justify-between">
                                                                            <div className="flex-1">
                                                                                <h4 className="font-medium text-sm">{prompt.name}</h4>
                                                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                                                    {prompt.instruction}
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex gap-2 ml-3">
                                                                                <button
                                                                                    onClick={() => setEditingPromptId(prompt.id)}
                                                                                    className="text-xs px-2 py-1 bg-accent hover:bg-accent/80 text-background rounded transition-colors"
                                                                                >
                                                                                    Edit
                                                                                </button>
                                                                                {!prompt.isDefault && (
                                                                                    <button
                                                                                        onClick={() => deleteCustomPrompt(prompt.id)}
                                                                                        className="text-xs px-2 py-1 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded transition-colors"
                                                                                    >
                                                                                        Delete
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {/* Add New Prompt */}
                                                        <div className="border border-dashed border-input rounded-md p-3 space-y-2">
                                                            <input
                                                                type="text"
                                                                value={newPromptName}
                                                                onChange={(e) => setNewPromptName(e.target.value)}
                                                                placeholder="Prompt Name (e.g., Translate)"
                                                                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted-foreground"
                                                            />
                                                            <textarea
                                                                value={newPromptInstruction}
                                                                onChange={(e) => setNewPromptInstruction(e.target.value)}
                                                                placeholder="Instruction (e.g., Translate the following text to Spanish)"
                                                                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent min-h-[60px] resize-y placeholder:text-muted-foreground"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    if (newPromptName.trim() && newPromptInstruction.trim()) {
                                                                        addCustomPrompt(newPromptName.trim(), newPromptInstruction.trim());
                                                                        setNewPromptName('');
                                                                        setNewPromptInstruction('');
                                                                    }
                                                                }}
                                                                disabled={!newPromptName.trim() || !newPromptInstruction.trim()}
                                                                className="w-full px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Add Prompt
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Create custom AI commands for the "Rewrite" feature. These appear in the editor's AI menu.
                                                    </p>
                                                </div>

                                                {/* Test Connection */}
                                                <div className="pt-2">
                                                    <button
                                                        onClick={handleTestConnection}
                                                        disabled={isTesting || !apiKey}
                                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        {isTesting ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Testing...
                                                            </>
                                                        ) : (
                                                            'Test Connection'
                                                        )}
                                                    </button>

                                                    {testStatus === 'success' && (
                                                        <div className="flex items-center gap-2 mt-3 text-sm text-success">
                                                            <Check className="w-4 h-4" />
                                                            Connection successful!
                                                        </div>
                                                    )}

                                                    {testStatus === 'error' && (
                                                        <div className="flex items-center gap-2 mt-3 text-sm text-destructive">
                                                            <AlertCircle className="w-4 h-4" />
                                                            {errorMessage || 'Connection failed'}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Vector Search Section */}
                                <div className="border-t border-border my-6"></div>
                                <div className="py-4">
                                    <h3 className="text-lg font-medium text-foreground mb-2">Vector Search</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Enable semantic search by indexing your vault. This allows Mosaic to understand concepts and find notes by meaning, not just keywords.
                                    </p>

                                    {selectedProvider === 'openrouter' && (
                                        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                            <div className="text-sm text-yellow-500">
                                                <p className="font-medium">Backend Dependency Warning</p>
                                                <p className="mt-1 opacity-90">
                                                    Semantic Search currently requires a <strong>Google Gemini API Key</strong> to generate embeddings in the backend, even if you are using OpenRouter for the agent. Please ensure you have a Gemini key saved if you wish to use this feature.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={async () => {
                                            const vaultPath = useAppStore.getState().vaultPath;
                                            if (!vaultPath) {
                                                setIndexStatus('error');
                                                setIndexMessage('No vault is currently open');
                                                return;
                                            }
                                            setIsIndexing(true);
                                            setIndexStatus('idle');
                                            setIndexMessage('');
                                            try {
                                                await invoke('trigger_indexing', { vaultPath });
                                                setIndexStatus('success');
                                                setIndexMessage('Vault indexed successfully! Mosaic can now use semantic search.');
                                            } catch (e) {
                                                setIndexStatus('error');
                                                setIndexMessage(typeof e === 'string' ? e : 'Indexing failed');
                                            } finally {
                                                setIsIndexing(false);
                                            }
                                        }}
                                        disabled={isIndexing}
                                        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-background rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isIndexing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Indexing...
                                            </>
                                        ) : (
                                            'Re-Index Vault'
                                        )}
                                    </button>

                                    {indexStatus === 'success' && (
                                        <div className="flex items-center gap-2 mt-3 text-sm text-success">
                                            <Check className="w-4 h-4" />
                                            {indexMessage}
                                        </div>
                                    )}

                                    {indexStatus === 'error' && (
                                        <div className="flex items-center gap-2 mt-3 text-sm text-destructive">
                                            <AlertCircle className="w-4 h-4" />
                                            {indexMessage || 'Indexing failed'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Git Version Control Tab */}
                        {activeTab === 'git' && (
                            <div className="p-6 pt-0">
                                <h3 className="text-lg font-medium text-foreground mb-2">Version Control</h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Enable Git version control to automatically track Mosaic's changes and undo them if needed.
                                </p>

                                <div className="space-y-4">
                                    {/* Status Display */}
                                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Git Status</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {gitEnabled
                                                    ? 'Version control is active. Mosaic\'s changes are tracked.'
                                                    : 'Version control is not enabled for this vault.'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {gitEnabled ? (
                                                <span className="flex items-center gap-2 text-sm text-success">
                                                    <Check className="w-4 h-4" />
                                                    Enabled
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">Disabled</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Enable Git Button */}
                                    {!gitEnabled && (
                                        <div>
                                            <button
                                                onClick={async () => {
                                                    const { vaultPath } = useAppStore.getState();
                                                    if (!vaultPath) {
                                                        setGitMessage({ type: 'error', text: 'No vault is open' });
                                                        return;
                                                    }

                                                    const confirmed = await requestConfirmation(
                                                        'Initialize Git repository in this vault? This will create a .git folder and enable version control.'
                                                    );
                                                    if (!confirmed) return;

                                                    setIsInitializingGit(true);
                                                    setGitMessage(null); // Clear previous messages
                                                    try {
                                                        await invoke('init_git_repository', { vaultPath });
                                                        await checkGitStatus();
                                                        setGitMessage({ type: 'success', text: 'Git repository initialized! Version control is now enabled.' });
                                                    } catch (e) {
                                                        console.error('Failed to initialize Git:', e);
                                                        setGitMessage({ type: 'error', text: `Failed to initialize Git: ${e}` });
                                                    } finally {
                                                        setIsInitializingGit(false);
                                                    }
                                                }}
                                                disabled={isInitializingGit}
                                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {isInitializingGit ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Initializing...
                                                    </>
                                                ) : (
                                                    'Enable Version Control'
                                                )}
                                            </button>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                This will run <code className="px-1 py-0.5 bg-accent rounded text-xs text-background">git init</code> in your vault folder.
                                            </p>

                                            {/* Success/Error Messages */}
                                            {gitMessage && (
                                                <div className={`mt-3 p-3 rounded-md flex items-start gap-2 ${gitMessage.type === 'success'
                                                    ? 'bg-success/10 border border-success/20 text-success'
                                                    : 'bg-destructive/10 border border-destructive/20 text-destructive'
                                                    }`}>
                                                    {gitMessage.type === 'success' ? (
                                                        <Check className="w-4 h-4 shrink-0 mt-0.5" />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                    )}
                                                    <p className="text-sm">{gitMessage.text}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Info for Git-enabled vaults */}
                                    {gitEnabled && (
                                        <div className="p-4 bg-secondary/30 rounded-lg">
                                            <p className="text-sm text-foreground mb-2">
                                                <strong>Features enabled:</strong>
                                            </p>
                                            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                                <li>Auto-commits after Mosaic creates or updates notes</li>
                                                <li>Undo button (↶) in toolbar to revert Mosaic's last change</li>
                                                <li>Full Git history available via command line</li>
                                            </ul>
                                        </div>
                                    )}

                                    {/* Snapshot Vault Button */}
                                    {gitEnabled && (
                                        <div className="pt-4 border-t border-border">
                                            <h4 className="text-sm font-medium text-foreground mb-2">Manual Snapshot</h4>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Create a commit for all changes in the vault. Useful for saving a checkpoint of your entire workspace.
                                            </p>
                                            <button
                                                onClick={async () => {
                                                    const confirmed = await requestConfirmation(
                                                        'Create a snapshot of the entire vault? This will commit all changes in all files.'
                                                    );
                                                    if (!confirmed) return;

                                                    try {
                                                        await useGitStore.getState().snapshotVault();
                                                        setGitMessage({ type: 'success', text: 'Vault snapshot created successfully!' });
                                                    } catch (e) {
                                                        console.error('Failed to snapshot vault:', e);
                                                        setGitMessage({ type: 'error', text: `Failed to snapshot vault: ${e}` });
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-accent hover:bg-accent/80 text-background rounded-md text-xs font-medium transition-colors flex items-center gap-2"
                                            >
                                                <Check className="w-3 h-3" />
                                                Snapshot Entire Vault
                                            </button>
                                        </div>
                                    )}

                                    {/* GitHub Sync Section */}
                                    {gitEnabled && (
                                        <div className="pt-4 border-t border-border">
                                            <h4 className="text-sm font-medium text-foreground mb-2">GitHub Sync</h4>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Connect your GitHub account to sync your vault to a private repository.
                                            </p>
                                            {/* <GitHubLogin clientId="YOUR_CLIENT_ID_HERE" /> */}
                                            <GitHubLogin clientId="Ov23limdko2amqB6G4pN" />
                                        </div>
                                    )}

                                    {/* Vault History */}
                                    {gitEnabled && <VaultHistory requestConfirmation={requestConfirmation} setGitMessage={setGitMessage} />}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-foreground bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={!!modelToDelete}
                title="Delete Model"
                message={`Are you sure you want to remove ${modelToDelete?.model || ''}? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => {
                    if (modelToDelete && modelToDelete.provider && modelToDelete.model) {
                        useAIStore.getState().removeModel(modelToDelete.provider, modelToDelete.model);
                        setModelToDelete(null);
                    }
                }}
                onCancel={() => setModelToDelete(null)}
            />
        </>
    );
};
