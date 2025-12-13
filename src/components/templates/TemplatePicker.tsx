import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useStore';
import { Template } from '../../types';
import { FileText, X, Search } from 'lucide-react';

interface TemplatePickerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({ isOpen, onClose }) => {
    const templates = useAppStore(state => state.templates);
    const createNoteFromTemplate = useAppStore(state => state.createNoteFromTemplate);

    const [searchQuery, setSearchQuery] = useState('');
    const [noteTitle, setNoteTitle] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Filter templates based on search
    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) return templates;
        const query = searchQuery.toLowerCase();
        return templates.filter(t => t.name.toLowerCase().includes(query));
    }, [templates, searchQuery]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setNoteTitle('');
            setSelectedTemplate(templates[0] || null);
        }
    }, [isOpen, templates]);

    const handleCreate = async () => {
        if (!selectedTemplate || !noteTitle.trim()) return;

        setIsCreating(true);
        try {
            await createNoteFromTemplate(selectedTemplate.name, noteTitle.trim());
            onClose();
        } catch (e) {
            console.error('Failed to create note from template:', e);
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter' && e.metaKey) {
            handleCreate();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const currentIndex = filteredTemplates.findIndex(t => t.name === selectedTemplate?.name);
            const nextIndex = Math.min(currentIndex + 1, filteredTemplates.length - 1);
            setSelectedTemplate(filteredTemplates[nextIndex]);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const currentIndex = filteredTemplates.findIndex(t => t.name === selectedTemplate?.name);
            const prevIndex = Math.max(currentIndex - 1, 0);
            setSelectedTemplate(filteredTemplates[prevIndex]);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-background border border-border rounded-xl shadow-2xl w-[600px] max-h-[600px] flex flex-col"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">Create from Template</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-secondary/50 rounded transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Note Title Input */}
                <div className="p-4 border-b border-border">
                    <input
                        type="text"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        placeholder="Note title..."
                        className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                        autoFocus
                    />
                </div>

                {/* Template Search */}
                <div className="p-4 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search templates..."
                            className="w-full pl-10 pr-3 py-2 bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                </div>

                {/* Template List and Preview */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Template List */}
                    <div className="w-1/2 border-r border-border overflow-y-auto">
                        {filteredTemplates.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                                <FileText className="w-12 h-12 mb-2 opacity-50" />
                                <p>No templates found</p>
                                <p className="text-xs mt-1">Add templates to .moss/templates/</p>
                            </div>
                        ) : (
                            filteredTemplates.map((template) => (
                                <button
                                    key={template.name}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors border-l-2 ${selectedTemplate?.name === template.name
                                        ? 'border-primary bg-primary/10'
                                        : 'border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm text-foreground truncate">
                                            {template.name}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Template Preview */}
                    <div className="w-1/2 overflow-y-auto bg-secondary/10">
                        {selectedTemplate ? (
                            <div className="p-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                    Preview
                                </h3>
                                <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono">
                                    {selectedTemplate.content.slice(0, 500)}
                                    {selectedTemplate.content.length > 500 && '...'}
                                </pre>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Select a template
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                        <kbd className="px-2 py-1 bg-secondary/50 rounded text-xs">Cmd+Enter</kbd> to create
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!selectedTemplate || !noteTitle.trim() || isCreating}
                            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating ? 'Creating...' : 'Create Note'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
