import React, { useState } from 'react';
import { Plus, X, List, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import styles from './PropertiesEditor.module.css';

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
                className={styles.addPropertiesContainer}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => setIsExpanded(true)}
                    className={styles.addPropertiesButton}
                >
                    <List size={14} />
                    <span>Add properties</span>
                </button>
            </div>
        );
    }

    return (
        <div
            className={styles.propertiesContainer}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <List size={14} />
                    <span>Properties</span>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={styles.toggleButton}
                >
                    {isExpanded ? <X size={14} /> : <Plus size={14} />}
                </button>
            </div>

            {isExpanded && (
                <div className={styles.propertiesList}>
                    {/* Existing Properties */}
                    {Object.entries(properties).map(([key, value]) => (
                        <div key={key} className={styles.propertyRow}>
                            <input
                                type="text"
                                value={key}
                                readOnly
                                className={styles.propertyKey}
                            />
                            <div className={styles.propertyValueContainer}>
                                <input
                                    type="text"
                                    value={value as string}
                                    onChange={(e) => handleUpdateProperty(key, e.target.value)}
                                    placeholder="Value"
                                    className={styles.propertyValue}
                                />
                                <button
                                    onClick={() => handleDeleteProperty(key)}
                                    className={styles.deleteButton}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add New Property */}
                    <div className={styles.addPropertyForm}>
                        <input
                            type="text"
                            value={newPropKey}
                            onChange={(e) => setNewPropKey(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddProperty();
                            }}
                            placeholder="New property name"
                            className={styles.newPropertyInput}
                        />
                        <button
                            onClick={handleAddProperty}
                            disabled={!newPropKey.trim()}
                            className={styles.addButton}
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
