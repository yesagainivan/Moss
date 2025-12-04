import React, { useState, useMemo } from 'react';
import { ChevronDown, Hash, Tag } from 'lucide-react';
import styles from './TagsPanel.module.css';
import { useAppStore } from '../../store/useStore';

interface TagsPanelProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export const TagsPanel: React.FC<TagsPanelProps> = ({ isCollapsed, onToggleCollapse }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const tagsData = useAppStore(state => state.tagsData);
    const selectedTags = useAppStore(state => state.selectedTags);
    const toggleTag = useAppStore(state => state.toggleTag);

    // Filter tags based on search query
    const filteredTags = useMemo(() => {
        if (!tagsData) return [];

        if (!searchQuery.trim()) {
            return tagsData.tags;
        }

        const query = searchQuery.toLowerCase();
        return tagsData.tags.filter(tag =>
            tag.tag.toLowerCase().includes(query)
        );
    }, [tagsData, searchQuery]);

    const handleTagClick = (tag: string) => {
        toggleTag(tag);
    };

    const totalTags = tagsData?.tags.length || 0;

    return (
        <div className={styles.container}>
            <div className={styles.header} onClick={onToggleCollapse}>
                <div className={styles.title}>
                    <Tag size={14} />
                    <span>Tags</span>
                    <span className={styles.tagCount}>{totalTags}</span>
                </div>
                <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${isCollapsed ? styles.chevronCollapsed : ''}`}
                />
            </div>

            {!isCollapsed && (
                <div className={styles.content}>
                    {totalTags > 0 && (
                        <input
                            type="text"
                            placeholder="Search tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchBox}
                        />
                    )}

                    {filteredTags.length > 0 ? (
                        <div className={styles.tagsList}>
                            {filteredTags.map((tagInfo) => {
                                const isActive = selectedTags.includes(tagInfo.tag);
                                return (
                                    <div
                                        key={tagInfo.tag}
                                        className={`${styles.tagItem} ${isActive ? styles.tagItemActive : ''}`}
                                        onClick={() => handleTagClick(tagInfo.tag)}
                                    >
                                        <div className={styles.tagName}>
                                            <Hash size={12} className={styles.tagIcon} />
                                            <span className={styles.tagText}>{tagInfo.tag}</span>
                                        </div>
                                        <span className={styles.tagCount}>{tagInfo.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : totalTags > 0 ? (
                        <div className={styles.emptyState}>
                            <Tag size={24} className={styles.emptyIcon} />
                            <div>No tags match "{searchQuery}"</div>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <Tag size={24} className={styles.emptyIcon} />
                            <div>No tags found</div>
                            <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                Add #tags to your notes
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
