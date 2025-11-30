import { describe, it, expect } from 'vitest';
import { LRUCache } from '../lib/LRUCache';

describe('LRUCache', () => {
    it('stores and retrieves values', () => {
        const cache = new LRUCache<string, number>(3);
        cache.set('a', 1);
        cache.set('b', 2);

        expect(cache.get('a')).toBe(1);
        expect(cache.get('b')).toBe(2);
    });

    it('evicts least recently used item when capacity exceeded', () => {
        const cache = new LRUCache<string, number>(3);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);

        // Cache is full, adding 'd' should evict 'a' (oldest)
        cache.set('d', 4);

        expect(cache.get('a')).toBeUndefined();
        expect(cache.get('b')).toBe(2);
        expect(cache.get('c')).toBe(3);
        expect(cache.get('d')).toBe(4);
    });

    it('updates item position on get', () => {
        const cache = new LRUCache<string, number>(3);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);

        // Access 'a' to make it recently used
        cache.get('a');

        // Add 'd', should evict 'b' now (oldest)
        cache.set('d', 4);

        expect(cache.get('a')).toBe(1);
        expect(cache.get('b')).toBeUndefined();
        expect(cache.get('c')).toBe(3);
        expect(cache.get('d')).toBe(4);
    });

    it('updates existing key without growing size', () => {
        const cache = new LRUCache<string, number>(2);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('a', 100); // Update 'a'

        expect(cache.size).toBe(2);
        expect(cache.get('a')).toBe(100);
        expect(cache.get('b')).toBe(2);
    });
});
