import { Node, mergeAttributes, InputRule } from '@tiptap/core';

export interface WikilinkOptions {
    HTMLAttributes: Record<string, any>;
    openNote?: (id: string, isCmdClick?: boolean, fragment?: string) => void;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        wikilink: {
            setWikilink: (options: { target: string }) => ReturnType;
        };
    }
}

export const Wikilink = Node.create<WikilinkOptions>({
    name: 'wikilink',
    priority: 1000,

    addOptions() {
        return {
            openNote: () => { },
            HTMLAttributes: {
                class: 'wikilink',
            },
        };
    },

    inline: true,
    group: 'inline',
    atom: true,

    addAttributes() {
        return {
            target: {
                default: null,
                parseHTML: element => element.getAttribute('data-target'),
                renderHTML: attributes => {
                    return {
                        'data-target': attributes.target,
                    };
                },
            },
            label: {
                default: null,
                parseHTML: element => element.innerText,
            },
            fragment: {
                default: null,
                parseHTML: element => element.getAttribute('data-fragment'),
                renderHTML: attributes => {
                    if (!attributes.fragment) return {};
                    return {
                        'data-fragment': attributes.fragment,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-target]',
            },
        ];
    },

    renderHTML({ HTMLAttributes, node }) {
        const displayText = node.attrs.label || node.attrs.target || (node.attrs.fragment ? '#' + node.attrs.fragment : '');
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), displayText];
    },

    // Removed addNodeView() to use default renderHTML() - this prevents spacing issues
    // Click handling is now done in Editor.tsx via editorProps.handleClick

    addInputRules() {
        return [
            new InputRule({
                find: /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/,
                handler: ({ state, range, match }) => {
                    const { tr } = state;
                    const start = range.from;
                    const end = range.to;
                    const target = match[1].trim();
                    const label = match[2] ? match[2].trim() : null;

                    // Insert the wikilink node
                    const wikilinkNode = this.type.create({ target, label });
                    tr.replaceWith(start, end, wikilinkNode);

                    // Position cursor after the wikilink node
                    // The node is at position 'start' and has nodeSize of 1 (atom)
                    // @ts-ignore
                    tr.setSelection(state.selection.constructor.near(tr.doc.resolve(start + 1)));
                },
            }),
        ];
    },

    addKeyboardShortcuts() {
        return {
            Backspace: () =>
                this.editor.commands.command(({ tr, state }) => {
                    const { selection } = state;
                    const { empty, anchor } = selection;
                    if (!empty) {
                        return false;
                    }
                    const node = state.doc.nodeAt(anchor - 1);
                    if (node && node.type.name === this.name) {
                        const text = node.attrs.label ? `[[${node.attrs.target}|${node.attrs.label}]]` : `[[${node.attrs.target}]]`;
                        tr.replaceWith(anchor - 1, anchor, state.schema.text(text));
                        return true;
                    }
                    return false;
                }),
        };
    },

    addStorage() {
        return {
            openNote: this.options.openNote,
        };
    },

    renderMarkdown(node) {
        const target = node.attrs?.target || '';
        const fragment = node.attrs?.fragment || '';
        const fullTarget = fragment ? (target ? `${target}#${fragment}` : `#${fragment}`) : target;
        return node.attrs?.label ? `[[${fullTarget}|${node.attrs.label}]]` : `[[${fullTarget}]]`;
    },

    parseMarkdown() {
        return {
            node: 'wikilink',
            getAttrs: (token: any) => {
                return {
                    target: token.target || '',
                    label: token.label,
                    fragment: token.fragment || null,
                };
            },
        };
    },
});

import { wikilinkMarkedExtension } from '../../../lib/markdown';

export { wikilinkMarkedExtension };

