import { describe, it, expect } from 'vitest';
import { wikilinkMarkedExtension } from '../lib/markdown';

describe('Wikilink Markdown Extension', () => {
    it('should preserve simple wikilinks as text', () => {
        const token = {
            type: 'wikilink',
            target: 'MyNote',
            label: null,
            fragment: null,
        };

        const result = wikilinkMarkedExtension.renderer(token);
        expect(result).toBe('[[MyNote]]');
    });

    it('should preserve wikilinks with labels', () => {
        const token = {
            type: 'wikilink',
            target: 'MyNote',
            label: 'Custom Label',
            fragment: null,
        };

        const result = wikilinkMarkedExtension.renderer(token);
        expect(result).toBe('[[MyNote|Custom Label]]');
    });

    it('should preserve wikilinks with fragments', () => {
        const token = {
            type: 'wikilink',
            target: 'MyNote',
            label: null,
            fragment: 'Section',
        };

        const result = wikilinkMarkedExtension.renderer(token);
        expect(result).toBe('[[MyNote#Section]]');
    });

    it('should preserve fragment-only wikilinks', () => {
        const token = {
            type: 'wikilink',
            target: '',
            label: null,
            fragment: 'Section',
        };

        const result = wikilinkMarkedExtension.renderer(token);
        expect(result).toBe('[[#Section]]');
    });

    it('should preserve wikilinks with both fragment and label', () => {
        const token = {
            type: 'wikilink',
            target: 'MyNote',
            label: 'Custom Label',
            fragment: 'Section',
        };

        const result = wikilinkMarkedExtension.renderer(token);
        expect(result).toBe('[[MyNote#Section|Custom Label]]');
    });

    it('should tokenize simple wikilinks', () => {
        const src = '[[MyNote]]';
        const token = wikilinkMarkedExtension.tokenizer(src, []);

        expect(token).toBeDefined();
        expect(token?.type).toBe('wikilink');
        expect(token?.target).toBe('MyNote');
        expect(token?.label).toBeNull();
        expect(token?.fragment).toBeNull();
    });

    it('should tokenize wikilinks with labels', () => {
        const src = '[[MyNote|Display Text]]';
        const token = wikilinkMarkedExtension.tokenizer(src, []);

        expect(token).toBeDefined();
        expect(token?.target).toBe('MyNote');
        expect(token?.label).toBe('Display Text');
    });

    it('should tokenize wikilinks with fragments', () => {
        const src = '[[MyNote#Section]]';
        const token = wikilinkMarkedExtension.tokenizer(src, []);

        expect(token).toBeDefined();
        expect(token?.target).toBe('MyNote');
        expect(token?.fragment).toBe('Section');
    });

    it('should tokenize fragment-only wikilinks', () => {
        const src = '[[#Section]]';
        const token = wikilinkMarkedExtension.tokenizer(src, []);

        expect(token).toBeDefined();
        expect(token?.target).toBe('');
        expect(token?.fragment).toBe('Section');
    });

    it('should round-trip: tokenize and render produce original syntax', () => {
        const testCases = [
            '[[SimpleNote]]',
            '[[Note|Custom Label]]',
            '[[Note#Section]]',
            '[[#Fragment]]',
            '[[Note#Section|Label]]',
        ];

        testCases.forEach((original) => {
            const token = wikilinkMarkedExtension.tokenizer(original, []);
            expect(token).toBeDefined();

            if (token) {
                const rendered = wikilinkMarkedExtension.renderer(token);
                expect(rendered).toBe(original);
            }
        });
    });
});
