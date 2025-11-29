import { Mark, mergeAttributes } from '@tiptap/core';

export const DiffAdd = Mark.create({
    name: 'diffAdd',

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'diff-add',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span.diff-add',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
});

export const DiffRemove = Mark.create({
    name: 'diffRemove',

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'diff-remove',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span.diff-remove',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
});
