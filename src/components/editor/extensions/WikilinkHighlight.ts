import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const WikilinkHighlight = Extension.create({
    name: 'wikilinkHighlight',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('wikilinkHighlight'),
                props: {
                    decorations(state) {
                        const decorations: Decoration[] = [];
                        const doc = state.doc;

                        doc.descendants((node, pos) => {
                            if (!node.isText) return;
                            const text = node.text;
                            if (!text) return;

                            // Match [[target|label]] or [[target]] or [[#fragment]] or [[target#fragment]]
                            // Supports: [[note]], [[note#section]], [[#section]], [[note|display]]
                            const regex = /\[\[([^\]|#]+)?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
                            let match;

                            while ((match = regex.exec(text)) !== null) {
                                const start = pos + match.index;
                                const end = start + match[0].length;
                                const target = match[1]?.trim() || '';
                                const fragment = match[2]?.trim() || '';
                                const label = match[3]?.trim() || null;

                                decorations.push(
                                    Decoration.inline(start, end, {
                                        class: 'wikilink',
                                        'data-target': target,
                                        'data-fragment': fragment || undefined,
                                        'data-label': label || undefined,
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
