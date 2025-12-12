import Image, { ImageOptions } from '@tiptap/extension-image';
import { convertFileSrc } from '@tauri-apps/api/core';

interface ImageWithMarkdownOptions extends ImageOptions {
    vaultPath: string;
}

/**
 * Extended Image with markdown serialization support and local asset rendering
 */
export const ImageWithMarkdown = Image.extend<ImageWithMarkdownOptions>({
    addOptions() {
        return {
            inline: false,
            allowBase64: false,
            HTMLAttributes: {},
            ...this.parent?.(),
            vaultPath: '',
        };
    },

    renderHTML({ HTMLAttributes }) {
        const { src } = HTMLAttributes;
        const vaultPath = this.options.vaultPath;
        const newAttributes = { ...HTMLAttributes };

        // console.log('DEBUG: ImageWithMarkdown renderHTML input', { src, vaultPath });

        if (vaultPath && src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('asset:')) {
            const fullPath = src.startsWith('/') ? src : `${vaultPath}/${src}`;
            const converted = convertFileSrc(fullPath);
            // console.log('DEBUG: Converting path', { from: fullPath, to: converted });
            newAttributes.src = converted;
        }

        return ['img', newAttributes];
    },

    renderMarkdown(node: any) {
        const { src, alt, title } = node.attrs;
        const altText = alt || '';
        const titleAttr = title ? ` "${title}"` : '';
        return `![${altText}](${src}${titleAttr})`;
    },
});
