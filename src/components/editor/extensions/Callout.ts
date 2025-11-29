import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';

export interface CalloutOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        callout: {
            setCallout: (options: { type: string; title?: string }) => ReturnType;
        };
    }
}

export const Callout = Node.create<CalloutOptions>({
    name: 'callout',
    priority: 1000,

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'callout',
            },
        };
    },

    content: 'block+',
    group: 'block',
    defining: true,

    addAttributes() {
        return {
            type: {
                default: 'note',
                parseHTML: element => element.getAttribute('data-callout-type') || 'note',
                renderHTML: attributes => ({
                    'data-callout-type': attributes.type,
                }),
            },
            title: {
                default: null,
                parseHTML: element => {
                    const titleEl = element.querySelector('.callout-title');
                    return titleEl?.textContent || null;
                },
                renderHTML: attributes => ({
                    'data-callout-title': attributes.title,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div.callout',
                contentElement: '.callout-content',
                getAttrs: (element) => {
                    if (typeof element === 'string') return null;
                    return {
                        type: element.getAttribute('data-callout-type') || 'note',
                        title: element.getAttribute('data-callout-title') || null,
                    };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes, node }) {
        const type = node.attrs.type || 'note';
        const title = node.attrs.title || type.charAt(0).toUpperCase() + type.slice(1);

        return [
            'div',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: `callout callout-${type}`,
            }),
            [
                'div',
                { class: 'callout-title' },
                title,
            ],
            [
                'div',
                { class: 'callout-content' },
                0, // Content placeholder
            ],
        ];
    },

    addCommands() {
        return {
            setCallout: (options) => ({ commands }) => {
                return commands.wrapIn(this.name, options);
            },
        };
    },

    addInputRules() {
        return [
            // Detect > [!type] or > [!type] title and convert to callout
            // This allows users to create callouts by typing
            new InputRule({
                find: /^>\s*\[!([a-z]+)\](?:\s+([^\n]+))?\s$/i,
                handler: ({ state, range, match }) => {
                    const { tr } = state;
                    const type = match[1].toLowerCase();
                    const title = match[2]?.trim() || null;

                    // Delete the matched text
                    tr.delete(range.from, range.to);

                    // Insert a callout node with a paragraph inside
                    const calloutNode = this.type.create(
                        { type, title },
                        state.schema.nodes.paragraph.create()
                    );

                    tr.insert(range.from, calloutNode);
                    tr.setSelection(
                        new TextSelection(tr.doc.resolve(range.from + 1))
                    );
                },
            }),
        ];
    },

    addKeyboardShortcuts() {
        return {
            // Backspace at start of callout should unwrap it
            Backspace: () =>
                this.editor.commands.command(({ state }) => {
                    const { selection } = state;
                    const { $from } = selection;

                    // Check if we're at the start of a callout
                    if ($from.parent.type.name === this.name && $from.parentOffset === 0) {
                        return this.editor.commands.lift(this.name);
                    }

                    return false;
                }),
        };
    },

    renderMarkdown(node: any) {
        const type = node.attrs?.type || 'note';
        const title = node.attrs?.title || '';

        // Start with callout header
        let markdown = `> [!${type}]`;
        if (title && title !== type.charAt(0).toUpperCase() + type.slice(1)) {
            // Only include title if it's different from the default
            markdown += ` ${title}`;
        }
        markdown += '\n';

        // node.content is directly the array of children in JSON format
        if (node.content && Array.isArray(node.content) && node.content.length > 0) {
            const paragraphs: string[] = [];

            // Iterate through each child (paragraph)
            node.content.forEach((child: any) => {
                // Extract text from the paragraph
                let text = '';

                // child.content is also directly an array of text nodes
                if (child.content && Array.isArray(child.content)) {
                    child.content.forEach((textNode: any) => {
                        if (textNode.text) {
                            text += textNode.text;
                        } else if (textNode.type === 'hardBreak') {
                            // Hard break (Shift+Enter or single Enter) creates a line break
                            text += '\n';
                        }
                    });
                } else if (child.text) {
                    // Direct text node
                    text = child.text;
                }

                if (text.trim()) {
                    paragraphs.push(text.trim());
                }
            });

            if (paragraphs.length > 0) {
                // For each paragraph, split by newlines and prefix each line
                const prefixedParagraphs = paragraphs.map(para => {
                    // Split paragraph into lines and prefix each
                    const lines = para.split('\n');
                    return lines.map(line => `> ${line}`).join('\n');
                }).join('\n>\n'); // Blank line between paragraphs

                markdown += prefixedParagraphs;
            }
        }

        return markdown;
    },

    parseMarkdown() {
        return {
            node: 'callout',
            getAttrs: (token: any) => ({
                type: token.calloutType || 'note',
                title: token.title || null,
            }),
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('calloutContentWrapper'),
                props: {
                    // Ensure callout content is always wrapped in blocks
                    transformPasted: (slice) => {
                        return slice;
                    },
                },
            }),
        ];
    },
});

export { calloutMarkedExtension } from '../../../lib/markdown';
