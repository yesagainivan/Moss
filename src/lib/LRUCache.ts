/**
 * Simple LRU (Least Recently Used) Cache
 * Automatically evicts oldest entries when capacity is exceeded
 */
export class LRUCache<K, V> {
    private cache: Map<K, V>;
    private readonly capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key: K): V | undefined {
        if (!this.cache.has(key)) {
            return undefined;
        }

        // Move to end (most recently used)
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key: K, value: V): void {
        // If key exists, delete it first to re-insert at end
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        this.cache.set(key, value);

        // Evict oldest (first) entry if over capacity
        if (this.cache.size > this.capacity) {
            const firstKey = this.cache.keys().next();
            if (!firstKey.done) {
                this.cache.delete(firstKey.value);
            }
        }
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}
