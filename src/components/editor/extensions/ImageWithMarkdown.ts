import Image from '@tiptap/extension-image';

/**
 * Extended Image with markdown serialization support
 */
export const ImageWithMarkdown = Image.extend({
    addStorage() {
        return {
            markdown: {
                serialize(state: any, node: any) {
                    const { src, alt, title } = node.attrs;
                    const altText = alt || '';
                    const titleAttr = title ? ` "${title}"` : '';
                    state.write(`![${altText}](${src}${titleAttr})`);
                    state.closeBlock(node);
                },
            },
        };
    },
});
