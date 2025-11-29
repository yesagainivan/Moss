import { ChevronDown, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string | null;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
}

export const Select = ({
    value,
    onChange,
    options,
    placeholder = 'Select an option...',
    className = ''
}: SelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Find the selected option
    const selectedOption = options.find(opt => opt.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Reset highlighted index when dropdown opens
    useEffect(() => {
        if (isOpen) {
            const selectedIndex = options.findIndex(opt => opt.value === value);
            setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        }
    }, [isOpen, value, options]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setHighlightedIndex(prev =>
                        prev < options.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (options[highlightedIndex]) {
                        onChange(options[highlightedIndex].value);
                        setIsOpen(false);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    setIsOpen(false);
                    break;
                case 'Tab':
                    setIsOpen(false);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, highlightedIndex, options, onChange]);

    // Scroll highlighted option into view
    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [highlightedIndex, isOpen]);

    return (
        <div ref={containerRef} className={`${styles.container} ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={styles.trigger}
            >
                <span className={selectedOption ? styles.triggerText : styles.triggerPlaceholder}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div ref={dropdownRef} className={styles.dropdown}>
                    {options.map((option, index) => {
                        const isSelected = option.value === value;
                        const isHighlighted = index === highlightedIndex;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`${styles.option} ${isHighlighted ? styles.optionHighlighted : ''
                                    }`}
                            >
                                <span>{option.label}</span>
                                {isSelected && (
                                    <Check className={styles.checkIcon} />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
