import { marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { wikilinkMarkedExtension, calloutMarkedExtension, WIKILINK_SEP } from '../lib/markdown';

// Configure marked with GFM (GitHub Flavored Markdown) enabled
// This includes support for task lists, strikethrough, tables, etc.
marked.use({
    gfm: true,  // Enable GitHub Flavored Markdown
    breaks: false,  // Don't convert single newlines to <br>
});
marked.use(gfmHeadingId());
marked.use({
    extensions: [wikilinkMarkedExtension, calloutMarkedExtension],
    renderer: {
        // Don't add target="_blank" for same-page hash links
        link({ href, title, tokens }) {
            const text = this.parser.parseInline(tokens);
            const isHashLink = href.startsWith('#');
            const titleAttr = title ? ` title="${title}"` : '';
            const targetAttr = isHashLink ? '' : ' target="_blank" rel="noopener noreferrer nofollow"';
            return `<a href="${href}"${titleAttr}${targetAttr}>${text}</a>`;
        }
    }
});

self.onmessage = (e: MessageEvent) => {
    let markdown = e.data;

    // Pre-process markdown to protect pipes in wikilinks from table splitting
    // Replace | with WIKILINK_SEP inside [[...]]
    markdown = markdown.replace(/\[\[([^\]]*?)\|([^\]]*?)\]\]/g, (_match: string, p1: string, p2: string) => {
        return `[[${p1}${WIKILINK_SEP}${p2}]]`;
    });

    try {
        const html = marked.parse(markdown);
        self.postMessage({ html });
    } catch (error) {
        self.postMessage({ error: String(error) });
    }
};
