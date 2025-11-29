import Image from '@tiptap/extension-image';

/**
 * Extended Image with markdown serialization support
 */
export const ImageWithMarkdown = Image.extend({
    renderMarkdown(node: any) {
        const { src, alt, title } = node.attrs;
        const altText = alt || '';
        const titleAttr = title ? ` "${title}"` : '';
        return `![${altText}](${src}${titleAttr})`;
    },
});
