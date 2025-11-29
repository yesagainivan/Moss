import Heading from '@tiptap/extension-heading';

/**
 * Extended Heading that preserves GitHub-compatible heading IDs
 * from parsed markdown
 */
export const HeadingWithId = Heading.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            id: {
                default: null,
                parseHTML: element => element.id || null,
                renderHTML: attributes => {
                    if (!attributes.id) {
                        return {};
                    }
                    return {
                        id: attributes.id,
                    };
                },
            },
        };
    },
});
