import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import './TagSuggestionList.css';

interface TagSuggestionItem {
    tag: string;
    count: number;
}

interface TagSuggestionListProps {
    items: TagSuggestionItem[];
    command: (item: TagSuggestionItem) => void;
}

export const TagSuggestionList = forwardRef((props: TagSuggestionListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

    // Auto-scroll selected item into view
    useEffect(() => {
        const selectedElement = document.querySelector('.tag-suggestion-item.is-selected');
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedIndex]);

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
            <div className="tag-suggestion-list">
                <div className="tag-suggestion-empty">No tags found</div>
            </div>
        );
    }

    return (
        <div className="tag-suggestion-list">
            {props.items.map((item, index) => (
                <button
                    key={item.tag}
                    className={`tag-suggestion-item ${index === selectedIndex ? 'is-selected' : ''}`}
                    onClick={() => selectItem(index)}
                >
                    <span className="tag-suggestion-name">#{item.tag}</span>
                    <span className="tag-suggestion-count">{item.count}</span>
                </button>
            ))}
        </div>
    );
});

TagSuggestionList.displayName = 'TagSuggestionList';
