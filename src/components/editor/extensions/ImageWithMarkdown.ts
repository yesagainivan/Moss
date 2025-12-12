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
        const parentOptions = this.parent?.() as Partial<ImageOptions> || {};
        return {
            ...parentOptions,
            inline: false,
            allowBase64: false,
            HTMLAttributes: {},
            vaultPath: '',
            // Ensure resize is never undefined by providing explicit default
            resize: parentOptions.resize ?? false,
        };
    },

    renderHTML({ HTMLAttributes }) {
        const { src } = HTMLAttributes;
        const vaultPath = this.options.vaultPath;
        const newAttributes = { ...HTMLAttributes };

        if (vaultPath && src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('asset:')) {
            const fullPath = src.startsWith('/') ? src : `${vaultPath}/${src}`;
            const converted = convertFileSrc(fullPath);
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
