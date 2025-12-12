import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { TagSuggestionList } from './TagSuggestionList';
import { useAppStore } from '../../../store/useStore';
import { PluginKey } from '@tiptap/pm/state';

export interface TagSuggestionOptions {
    suggestion: {
        char: string;
        command: ({ editor, range, props }: any) => void;
    };
}

export const TagSuggestion = Extension.create<TagSuggestionOptions>({
    name: 'tagSuggestion',

    addOptions() {
        return {
            suggestion: {
                char: '#',
                command: ({ editor, range, props }) => {
                    // Insert the tag
                    editor
                        .chain()
                        .focus()
                        .insertContentAt(range, `#${props.tag}`)
                        .run();
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                pluginKey: new PluginKey('tagSuggestion'),
                editor: this.editor,
                char: this.options.suggestion.char,
                allowedPrefixes: null, // Allow triggering after any character
                command: this.options.suggestion.command,

                items: ({ query }) => {
                    // Get tags from the store
                    const tagsData = useAppStore.getState().tagsData;

                    if (!tagsData || !tagsData.tags) return [];

                    // Filter tags by query
                    const lowerQuery = query.toLowerCase();
                    return tagsData.tags
                        .filter((tagInfo: { tag: string; count: number; files: string[] }) =>
                            tagInfo.tag.toLowerCase().includes(lowerQuery)
                        )
                        .slice(0, 10) // Limit to 10 suggestions
                        .map((tagInfo: { tag: string; count: number; files: string[] }) => ({
                            tag: tagInfo.tag,
                            count: tagInfo.count,
                        }));
                },

                render: () => {
                    let component: ReactRenderer;
                    let popup: TippyInstance[];

                    return {
                        onStart: (props) => {
                            component = new ReactRenderer(TagSuggestionList, {
                                props,
                                editor: props.editor,
                            });

                            if (!props.clientRect) {
                                return;
                            }

                            popup = tippy('body', {
                                getReferenceClientRect: props.clientRect as any,
                                appendTo: () => document.body,
                                content: component.element,
                                showOnCreate: true,
                                interactive: true,
                                trigger: 'manual',
                                placement: 'bottom-start',
                                theme: 'tag-suggestion',
                            });
                        },

                        onUpdate(props) {
                            component?.updateProps(props);

                            if (!props.clientRect) {
                                return;
                            }

                            const tippyInstance = popup?.[0];
                            if (tippyInstance && !tippyInstance.state.isDestroyed) {
                                tippyInstance.setProps({
                                    getReferenceClientRect: props.clientRect as any,
                                });
                            }
                        },

                        onKeyDown(props) {
                            if (props.event.key === 'Escape') {
                                popup?.[0]?.hide();
                                return true;
                            }

                            // Access the component's ref properly
                            const ref = component?.ref as any;
                            return ref?.onKeyDown?.(props) ?? false;
                        },

                        onExit() {
                            popup?.[0]?.destroy();
                            component?.destroy();
                        },
                    };
                },
            }),
        ];
    },
});
