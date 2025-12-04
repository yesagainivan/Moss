import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import './WikilinkSuggestionList.css';

interface WikilinkSuggestionItem {
    name: string;
    path: string;
    folder: string;
    category?: 'recent' | 'same-folder' | 'other';
}

interface WikilinkSuggestionListProps {
    items: WikilinkSuggestionItem[];
    command: (item: WikilinkSuggestionItem) => void;
}

export const WikilinkSuggestionList = forwardRef((props: WikilinkSuggestionListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }

            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }

            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }

            return false;
        },
    }));

    if (props.items.length === 0) {
        return (
            <div className="wikilink-suggestion-list">
                <div className="wikilink-suggestion-empty">No notes found</div>
            </div>
        );
    }

    return (
        <div className="wikilink-suggestion-list">
            {props.items.map((item, index) => (
                <button
                    key={item.path}
                    className={`wikilink-suggestion-item ${index === selectedIndex ? 'is-selected' : ''}`}
                    onClick={() => selectItem(index)}
                >
                    {item.category === 'recent' && (
                        <span className="wikilink-suggestion-badge recent">Recent</span>
                    )}
                    {item.category === 'same-folder' && (
                        <span className="wikilink-suggestion-badge same-folder">Same Folder</span>
                    )}
                    <div className="wikilink-suggestion-content">
                        <span className="wikilink-suggestion-name">{item.name}</span>
                        <span className="wikilink-suggestion-path">{item.folder || '/'}</span>
                    </div>
                </button>
            ))}
        </div>
    );
});

WikilinkSuggestionList.displayName = 'WikilinkSuggestionList';
