import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { Callout } from '../components/editor/extensions/Callout';
import { TaskList } from '@tiptap/extension-list/task-list';
import { TaskItem } from '@tiptap/extension-list/task-item';

/**
 * Data Integrity Tests for Callouts
 * 
 * These tests ensure callouts survive markdown round-trip conversions
 * (preview ↔ source mode switching) without data loss.
 */

describe('Callout Data Integrity', () => {
    // Helper to create an editor with callout support
    const createEditor = (content: string) => {
        return new Editor({
            extensions: [
                StarterKit,
                TaskList,
                TaskItem,
                Markdown,
                Callout,
            ],
            content,
            contentType: 'markdown',
        });
    };

    // Helper to test markdown round-trip
    const testRoundTrip = (markdown: string) => {
        const editor = createEditor(markdown);
        // @ts-ignore - getMarkdown is added by @tiptap/markdown extension
        const serialized = editor.getMarkdown();
        editor.destroy();
        return serialized.trim();
    };

    describe('Basic Callout Types', () => {
        it('preserves info callout', () => {
            const markdown = `> [!info]
> This is an info callout`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!info]');
            expect(result).toContain('This is an info callout');
        });

        it('preserves warning callout', () => {
            const markdown = `> [!warning]
> This is a warning callout`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!warning]');
            expect(result).toContain('This is a warning callout');
        });

        it('preserves note callout', () => {
            const markdown = `> [!note]
> This is a note callout`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!note]');
            expect(result).toContain('This is a note callout');
        });

        it('preserves success callout', () => {
            const markdown = `> [!success]
> This is a success callout`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!success]');
            expect(result).toContain('This is a success callout');
        });

        it('preserves danger callout', () => {
            const markdown = `> [!danger]
> This is a danger callout`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!danger]');
            expect(result).toContain('This is a danger callout');
        });

        it('preserves tip callout', () => {
            const markdown = `> [!tip]
> This is a tip callout`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!tip]');
            expect(result).toContain('This is a tip callout');
        });
    });

    describe('Custom Titles', () => {
        it('preserves custom title', () => {
            const markdown = `> [!warning] Custom Warning Title
> This warning has a custom title`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!warning] Custom Warning Title');
            expect(result).toContain('This warning has a custom title');
        });

        it('handles title with special characters', () => {
            const markdown = `> [!info] Title: With Colon & Ampersand!
> Content here`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('Title: With Colon & Ampersand!');
        });
    });

    describe('Multi-line Content', () => {
        it('preserves multiple lines', () => {
            const markdown = `> [!info]
> Line one
> Line two
> Line three`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('Line one');
            expect(result).toContain('Line two');
            expect(result).toContain('Line three');
        });

        it('preserves multiple paragraphs', () => {
            const markdown = `> [!note]
> First paragraph
>
> Second paragraph
>
> Third paragraph`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('First paragraph');
            expect(result).toContain('Second paragraph');
            expect(result).toContain('Third paragraph');
        });

        it('handles complex multi-line content', () => {
            const markdown = `> [!warning] Important Notice
> This is the first line
> This is the second line
>
> This is a new paragraph
> With multiple lines`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!warning]');
            expect(result).toContain('Important Notice');
            expect(result).toContain('first line');
            expect(result).toContain('second line');
            expect(result).toContain('new paragraph');
        });
    });

    describe('Formatting inside Callouts', () => {
        it('preserves bold text', () => {
            const markdown = `> [!info]
> This text has **bold** formatting`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('**bold**');
        });

        it('preserves italic text', () => {
            const markdown = `> [!info]
> This text has *italic* formatting`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('*italic*');
        });

        it('preserves inline code', () => {
            const markdown = `> [!tip]
> Use the \`console.log()\` function for debugging`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('`console.log()`');
        });

        it('preserves links', () => {
            const markdown = `> [!info]
> Check out [this link](https://example.com)`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[this link](https://example.com)');
        });
    });

    describe('Edge Cases', () => {
        it('handles empty callout', () => {
            const markdown = `> [!note]
>`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!note]');
        });

        it('handles very long content', () => {
            const longText = 'Lorem ipsum dolor sit amet, '.repeat(50);
            const markdown = `> [!info]
> ${longText}`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!info]');
            expect(result).toContain('Lorem ipsum');
        });

        it('handles callout at end of document', () => {
            const markdown = `# Heading

Some text

> [!warning]
> Final callout`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!warning]');
            expect(result).toContain('Final callout');
        });
    });

    describe('Multiple Callouts', () => {
        it('preserves multiple sequential callouts', () => {
            const markdown = `> [!info]
> First callout

> [!warning]
> Second callout

> [!tip]
> Third callout`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('[!info]');
            expect(result).toContain('First callout');
            expect(result).toContain('[!warning]');
            expect(result).toContain('Second callout');
            expect(result).toContain('[!tip]');
            expect(result).toContain('Third callout');
        });
    });

    describe('Mixed Content Documents', () => {
        it('preserves callouts mixed with other markdown', () => {
            const markdown = `# Title

Regular paragraph

> [!warning]
> Important warning

## Section

- List item 1
- List item 2

> [!tip]
> Helpful tip

**Bold text** and *italic*`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('# Title');
            expect(result).toContain('[!warning]');
            expect(result).toContain('Important warning');
            expect(result).toContain('[!tip]');
            expect(result).toContain('Helpful tip');
            expect(result).toContain('List item 1');
            expect(result).toContain('**Bold text**');
        });
    });
});
