import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const TagHighlight = Extension.create({
    name: 'tagHighlight',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('tagHighlight'),
                props: {
                    decorations(state) {
                        const decorations: Decoration[] = [];
                        const doc = state.doc;

                        doc.descendants((node, pos) => {
                            if (!node.isText) return;

                            const text = node.text;
                            if (!text) return;

                            // Regex to match tags: #[a-zA-Z0-9_-]{2,}
                            // Must match the backend regex in tags.rs
                            const regex = /#([a-zA-Z0-9_-]{2,})/g;
                            let match;

                            while ((match = regex.exec(text)) !== null) {
                                const start = pos + match.index;
                                const end = start + match[0].length;
                                decorations.push(
                                    Decoration.inline(start, end, {
                                        class: 'tag-highlight',
                                    })
                                );
                            }
                        });

                        return DecorationSet.create(doc, decorations);
                    },
                },
            }),
        ];
    },
});
