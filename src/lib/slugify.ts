import GithubSlugger from 'github-slugger';

/**
 * Slugifies a heading string using GitHub's rules:
 * - Lowercase
 * - Spaces to hyphens
 * - Remove special characters
 * - Handle duplicates with counters
 */
export function slugify(text: string): string {
    const slugger = new GithubSlugger();
    return slugger.slug(text);
}

/**
 * Create a new slugger instance for batch processing
 * Use this when processing multiple headings to track duplicates
 */
export function createSlugger() {
    return new GithubSlugger();
}
