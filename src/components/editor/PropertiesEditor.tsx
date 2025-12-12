import React, { useState } from 'react';
import { Plus, X, List, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useStore';


interface PropertiesEditorProps {
    noteId: string;
}

export const PropertiesEditor: React.FC<PropertiesEditorProps> = ({ noteId }) => {
    // Directly access note from store using noteId, more reliable than useActiveNote()
    const note = useAppStore(state => state.notes[noteId]);
    const setNoteProperties = useAppStore(state => state.setNoteProperties);
    const [isExpanded, setIsExpanded] = useState(false);
    const [newPropKey, setNewPropKey] = useState('');

    if (!note) return null;

    const properties = note.properties || {};
    const hasProperties = Object.keys(properties).length > 0;

    const handleAddProperty = () => {
        if (!newPropKey.trim()) return;

        const newProps = { ...properties, [newPropKey.trim()]: '' };
        setNoteProperties(noteId, newProps);
        setNewPropKey('');
    };

    const handleUpdateProperty = (key: string, value: string) => {
        const newProps = { ...properties, [key]: value };
        setNoteProperties(noteId, newProps);
    };

    const handleDeleteProperty = (key: string) => {
        const newProps = { ...properties };
        delete newProps[key];
        setNoteProperties(noteId, newProps);
    };

    if (!isExpanded && !hasProperties) {
        return (
            <div
                className="px-8 pt-4 pb-0"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
                >
                    <List size={14} className="group-hover:text-accent" />
                    <span>Add properties</span>
                </button>
            </div>
        );
    }

    return (
        <div
            className="px-8 pt-4 pb-2 border-b border-border/50 mb-4 bg-secondary/5"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <List size={14} />
                    <span>Properties</span>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-hover"
                >
                    {isExpanded ? <X size={14} /> : <Plus size={14} />}
                </button>
            </div>

            {isExpanded && (
                <div className="space-y-2">
                    {/* Existing Properties */}
                    {Object.entries(properties).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 group">
                            <input
                                type="text"
                                value={key}
                                readOnly
                                className="w-1/3 bg-transparent text-xs text-secondary border border-transparent focus:border-accent rounded px-2 py-1 outline-none"
                            />
                            <div className="flex-1 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={value as string}
                                    onChange={(e) => handleUpdateProperty(key, e.target.value)}
                                    placeholder="Value"
                                    className="flex-1 bg-transparent text-xs text-primary border border-border focus:border-accent rounded px-2 py-1 outline-none placeholder:text-muted-foreground"
                                />
                                <button
                                    onClick={() => handleDeleteProperty(key)}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 p-1 transition-opacity"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add New Property */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/30 mt-2">
                        <input
                            type="text"
                            value={newPropKey}
                            onChange={(e) => setNewPropKey(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddProperty();
                            }}
                            placeholder="New property name"
                            className="bg-transparent text-xs text-secondary/70 border border-transparent focus:border-accent rounded px-2 py-1 outline-none w-1/3 placeholder:text-muted-foreground"
                        />
                        <button
                            onClick={handleAddProperty}
                            disabled={!newPropKey.trim()}
                            className="text-xs text-accent hover:text-accent-hover disabled:opacity-50 px-2 uppercase font-bold tracking-wider"
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
