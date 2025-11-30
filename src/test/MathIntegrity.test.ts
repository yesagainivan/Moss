import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { Mathematics } from '@tiptap/extension-mathematics';

/**
 * Data Integrity Tests for Mathematics
 * 
 * These tests ensure math expressions survive markdown round-trip conversions
 * (preview ↔ source mode switching) without data loss.
 */

describe('Mathematics Data Integrity', () => {
    // Helper to create an editor with math support
    const createEditor = (content: string) => {
        return new Editor({
            extensions: [
                StarterKit,
                Mathematics, // MUST come before Markdown
                Markdown,
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

    describe('Inline Math', () => {
        it('preserves inline math with single dollar signs', () => {
            const markdown = `This is inline math $x^2$ in text`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('$x^2$');
            expect(result).not.toContain('$$x^2$$'); // Should NOT be block
        });

        it('preserves multiple inline math expressions', () => {
            const markdown = `Formula $a^2$ and $b^2$ equals $c^2$`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('$a^2$');
            expect(result).toContain('$b^2$');
            expect(result).toContain('$c^2$');
        });

        it('preserves complex inline math', () => {
            const markdown = `The equation $\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$ is the quadratic formula`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('$');
            expect(result).toContain('\\frac');
            expect(result).toContain('\\sqrt');
        });
    });

    describe('Block Math', () => {
        it('preserves block math with double dollar signs', () => {
            const markdown = `$$
E = mc^2
$$`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('$$');
            expect(result).toContain('E = mc^2');
            expect(result).not.toMatch(/^\$[^$]/); // Should NOT start with single $
        });

        it('preserves Pythagorean theorem as block', () => {
            const markdown = `The Pythagorean theorem:

$$
a^{2} + b^{2} = c^{2}
$$`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('$$');
            expect(result).toContain('a^{2} + b^{2} = c^{2}');
        });

        it('preserves multiple block math expressions', () => {
            const markdown = `First equation:

$$
x^2 + y^2 = z^2
$$

Second equation:

$$
e^{i\\pi} + 1 = 0
$$`;

            const result = testRoundTrip(markdown);
            // Should have TWO instances of $$
            const dollarCount = (result.match(/\$\$/g) || []).length;
            expect(dollarCount).toBeGreaterThanOrEqual(4); // At least 2 blocks (4 $$)
        });

        it('preserves complex multi-line block math', () => {
            const markdown = `$$
\\begin{align}
x &= a + b \\\\
y &= c + d
\\end{align}
$$`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('$$');
            expect(result).toContain('\\begin{align}');
            expect(result).toContain('\\end{align}');
        });
    });

    describe('Mixed Inline and Block', () => {
        it('preserves both inline and block math correctly', () => {
            const markdown = `Inline math $x$ and block math:

$$
y = mx + b
$$

More inline $z$ here.`;

            const result = testRoundTrip(markdown);

            // Should have both single $ (inline) and $$ (block)
            expect(result).toContain('$x$');
            expect(result).toContain('$z$');
            expect(result).toContain('$$');
            expect(result).toContain('y = mx + b');
        });
    });

    describe('Edge Cases', () => {
        it('handles empty block math', () => {
            const markdown = `$$
$$`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('$$');
        });

        it('handles math with special characters', () => {
            const markdown = `$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('$$');
            expect(result).toContain('\\int');
            expect(result).toContain('\\sqrt{\\pi}');
        });

        it('preserves math in headings with inline', () => {
            const markdown = `# Equation $E=mc^2$

Content here.`;

            const result = testRoundTrip(markdown);
            expect(result).toContain('# Equation $E=mc^2$');
        });
    });
});
