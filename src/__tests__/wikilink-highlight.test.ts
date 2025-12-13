import { describe, it, expect } from 'vitest';

describe('WikilinkHighlight Decoration Regex', () => {
    // Test the regex pattern used in WikilinkHighlight extension
    const wikilinkRegex = /\[\[([^\]|#]+)?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

    it('should match simple wikilinks', () => {
        const text = 'This is a [[SimpleNote]] in text.';
        const matches = [...text.matchAll(wikilinkRegex)];

        expect(matches).toHaveLength(1);
        expect(matches[0][1]).toBe('SimpleNote'); // target
        expect(matches[0][2]).toBeUndefined(); // fragment
        expect(matches[0][3]).toBeUndefined(); // label
    });

    it('should match wikilinks with labels', () => {
        const text = 'Check out [[MyNote|Custom Label]] here.';
        const matches = [...text.matchAll(wikilinkRegex)];

        expect(matches).toHaveLength(1);
        expect(matches[0][1]).toBe('MyNote'); // target
        expect(matches[0][2]).toBeUndefined(); // fragment
        expect(matches[0][3]).toBe('Custom Label'); // label
    });

    it('should match wikilinks with fragments', () => {
        const text = 'See [[MyNote#Section]] for details.';
        const matches = [...text.matchAll(wikilinkRegex)];

        expect(matches).toHaveLength(1);
        expect(matches[0][1]).toBe('MyNote'); // target
        expect(matches[0][2]).toBe('Section'); // fragment
        expect(matches[0][3]).toBeUndefined(); // label
    });

    it('should match fragment-only wikilinks', () => {
        const text = 'Jump to [[#Introduction]] above.';
        const matches = [...text.matchAll(wikilinkRegex)];

        expect(matches).toHaveLength(1);
        expect(matches[0][1]).toBeUndefined(); // target
        expect(matches[0][2]).toBe('Introduction'); // fragment
        expect(matches[0][3]).toBeUndefined(); // label
    });

    it('should match complex wikilinks', () => {
        const text = 'Read [[MyNote#Section|Click Here]] please.';
        const matches = [...text.matchAll(wikilinkRegex)];

        expect(matches).toHaveLength(1);
        expect(matches[0][1]).toBe('MyNote'); // target
        expect(matches[0][2]).toBe('Section'); // fragment
        expect(matches[0][3]).toBe('Click Here'); // label
    });

    it('should match multiple wikilinks in one text', () => {
        const text = 'Links: [[First]], [[Second|Label]], and [[#Fragment]].';
        const matches = [...text.matchAll(wikilinkRegex)];

        expect(matches).toHaveLength(3);
        expect(matches[0][1]).toBe('First');
        expect(matches[1][1]).toBe('Second');
        expect(matches[1][3]).toBe('Label');
        expect(matches[2][2]).toBe('Fragment');
    });

    it('should match wikilinks with spaces and special characters', () => {
        const text = '[[My Long Note Name#Section With Spaces|Display Label]]';
        const matches = [...text.matchAll(wikilinkRegex)];

        expect(matches).toHaveLength(1);
        expect(matches[0][1]).toBe('My Long Note Name');
        expect(matches[0][2]).toBe('Section With Spaces');
        expect(matches[0][3]).toBe('Display Label');
    });

    it('should NOT match incomplete wikilinks', () => {
        const invalidCases = [
            '[[incomplete',
            'incomplete]]',
            '[single bracket]',
        ];

        invalidCases.forEach((text) => {
            const matches = [...text.matchAll(wikilinkRegex)];
            expect(matches).toHaveLength(0);
        });
    });

    it('should extract correct positions for decoration application', () => {
        const text = 'Before [[MyNote]] after.';
        const regex = /\[\[([^\]|#]+)?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;

            expect(start).toBe(7); // Position of [[
            expect(end).toBe(17); // Position after ]]
            expect(text.substring(start, end)).toBe('[[MyNote]]');
        }
    });
});
