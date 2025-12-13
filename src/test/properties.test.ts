import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';

describe('Properties / Frontmatter Handling', () => {
    describe('gray-matter library behavior', () => {
        it('should parse frontmatter correctly', () => {
            const content = '---\ntitle: Test\ntags: [tag1, tag2]\n---\n# Hello World';
            const parsed = matter(content);

            expect(parsed.data).toEqual({ title: 'Test', tags: ['tag1', 'tag2'] });
            expect(parsed.content).toBe('# Hello World');
        });

        it('should handle empty properties', () => {
            const content = '# Hello World';
            const parsed = matter(content);

            expect(parsed.data).toEqual({});
            expect(parsed.content).toBe('# Hello World');
        });

        it('should stringify content with properties', () => {
            const body = '# Hello World';
            const properties = { title: 'Test', author: 'John' };
            const result = matter.stringify(body, properties);

            expect(result).toBe('---\ntitle: Test\nauthor: John\n---\n# Hello World');
        });

        it('should stringify empty body with properties', () => {
            const body = '';
            const properties = { new: 'None' };
            const result = matter.stringify(body, properties);

            expect(result).toBe('---\nnew: None\n---\n');
        });

        it('should handle body with only whitespace', () => {
            const body = '\n\n';
            const properties = { test: 'value' };
            const result = matter.stringify(body, properties);

            expect(result).toBe('---\ntest: value\n---\n\n\n');
        });
    });

    describe('Idempotent save/load cycle', () => {
        it('should handle save -> load -> save without duplication', () => {
            const originalBody = '# Test Note\n\nSome content here';
            const properties = { author: 'Test', date: '2024-01-01' };

            // First save: Add frontmatter
            const saved1 = matter.stringify(originalBody, properties);
            expect(saved1).toBe('---\nauthor: Test\ndate: 2024-01-01\n---\n# Test Note\n\nSome content here');

            // Load: Parse it back
            const loaded1 = matter(saved1);
            expect(loaded1.content).toBe(originalBody);
            expect(loaded1.data).toEqual(properties);

            // Second save: Should produce same output
            const saved2 = matter.stringify(loaded1.content, loaded1.data);
            expect(saved2).toBe(saved1);
        });

        it('should strip existing frontmatter before re-adding', () => {
            // Simulates content that already has frontmatter (e.g., from Git restore)
            const contentWithFrontmatter = '---\nold: value\n---\n# Content';
            const newProperties = { new: 'property' };

            // Parse to strip existing frontmatter
            const { content: bodyOnly } = matter(contentWithFrontmatter);

            // Re-add with new properties
            const result = matter.stringify(bodyOnly, newProperties);

            expect(result).toBe('---\nnew: property\n---\n# Content');
            // Should NOT contain the old property
            expect(result).not.toContain('old: value');
        });

        it('should handle multiple save/load cycles', () => {
            let currentContent = '# Original';
            let currentProps: Record<string, string> = { a: 'first' };

            // Cycle 1
            let saved = matter.stringify(currentContent, currentProps);
            let loaded = matter(saved);
            expect(loaded.content).toBe(currentContent);
            expect(loaded.data).toEqual(currentProps);

            // Cycle 2: Update properties
            currentProps = { a: 'first', b: 'second' };
            saved = matter.stringify(loaded.content, currentProps);
            loaded = matter(saved);
            expect(loaded.content).toBe(currentContent);
            expect(loaded.data).toEqual(currentProps);

            // Cycle 3: Update content and properties
            currentContent = '# Modified';
            currentProps = { b: 'second', c: 'third' };
            saved = matter.stringify(currentContent, currentProps);
            loaded = matter(saved);
            expect(loaded.content).toBe(currentContent);
            expect(loaded.data).toEqual(currentProps);
        });
    });

    describe('Edge cases', () => {
        it('should handle properties with None/null values', () => {
            const body = '# Test';
            const properties = { key: 'None' };
            const result = matter.stringify(body, properties);

            expect(result).toContain('key: None');

            const parsed = matter(result);
            expect(parsed.data.key).toBe('None'); // String "None", not null
        });

        it('should handle content that looks like frontmatter but isn\'t', () => {
            // Content contains markdown that looks like frontmatter
            const body = '# Frontmatter Guide\n\n---\nThis is not frontmatter\n---';
            const properties = { title: 'Guide' };

            const result = matter.stringify(body, properties);
            const parsed = matter(result);

            expect(parsed.content).toBe(body);
            expect(parsed.data).toEqual(properties);
        });

        it('should handle content with heading markers', () => {
            const body = '## new: None\n\nSome content';
            const properties = { actual: 'property' };

            const result = matter.stringify(body, properties);
            expect(result).toBe('---\nactual: property\n---\n## new: None\n\nSome content');

            const parsed = matter(result);
            expect(parsed.content).toBe(body);
            expect(parsed.data).toEqual(properties);
        });

        it('should distinguish between frontmatter property and content with same text', () => {
            // If content happens to contain "new: None" as text
            const body = 'Create a new: None object';
            const properties = { new: 'None' };

            const result = matter.stringify(body, properties);
            expect(result).toBe('---\nnew: None\n---\nCreate a new: None object');

            const parsed = matter(result);
            expect(parsed.content).toBe(body);
            expect(parsed.data.new).toBe('None');
        });

        it('should handle empty properties object', () => {
            const body = '# Content';
            const properties = {};

            // When properties is empty, should we add frontmatter or not?
            // Based on our implementation: Object.keys(proper ties).length > 0
            const result = matter.stringify(body, properties);

            // gray-matter still adds empty frontmatter
            expect(result).toBe('---\n---\n# Content');
        });
    });

    describe('Real-world scenarios', () => {
        it('should handle note created without properties, then properties added', () => {
            // Initial state: no properties
            const content = '# My Note\n\nSome text';
            let properties: Record<string, string> = {};
            // User adds a property via PropertiesEditor
            properties = { author: 'John' };

            // Save
            const saved = matter.stringify(content, properties);
            expect(saved).toBe('---\nauthor: John\n---\n# My Note\n\nSome text');

            // Load (simulates app restart)
            const loaded = matter(saved);
            expect(loaded.content).toBe(content);
            expect(loaded.data).toEqual(properties);
        });

        it('should handle Git restore with frontmatter', () => {
            // Git stores complete file with frontmatter
            const gitContent = '---\nversion: 1\nauthor: Alice\n---\n# Historical Content';

            // Parse to separate
            const { content: bodyOnly, data: properties } = matter(gitContent);

            expect(bodyOnly).toBe('# Historical Content');
            expect(properties).toEqual({ version: 1, author: 'Alice' });

            // When saved again, should produce same output
            const resaved = matter.stringify(bodyOnly, properties);
            expect(resaved).toBe(gitContent);
        });

        it('should handle property deletion', () => {
            const content = '# Note';
            let properties: Record<string, string> = { a: '1', b: '2', c: '3' };

            // Save with all properties
            let saved = matter.stringify(content, properties);

            // Delete property 'b'
            properties = { a: '1', c: '3' };
            saved = matter.stringify(content, properties);

            expect(saved).not.toContain('b:');
            expect(saved).toContain('a: 1');
            expect(saved).toContain('c: 3');
        });
    });
});
