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
        },
        // Custom renderer for task lists to match Tiptap's expectations
        list(token) {
            const type = token.ordered ? 'ol' : 'ul';
            const start = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
            // Check if any item is a task
            const isTask = token.items.some((item) => item.task);
            const listClass = isTask ? ' data-type="taskList"' : '';

            const body = token.items.map((item) => this.listitem(item)).join('');

            return `<${type}${listClass}${start}>\n${body}</${type}>\n`;
        },
        listitem(token) {
            // Use parser.parse instead of parseInline to handle all token types (including paragraphs)
            // This fixes the "Token with 'paragraph' type was not found" error
            let content = this.parser.parse(token.tokens);
            // Remove wrapping <p> tags if present (list items shouldn't have them)
            content = content.replace(/^<p>(.*)<\/p>\n$/s, '$1');

            if (token.task) {
                const checked = token.checked ? 'true' : 'false';
                return `<li data-type="taskItem" data-checked="${checked}">
<label><input type="checkbox" ${token.checked ? 'checked' : ''} disabled><span></span></label>
<div>${content}</div>
</li>\n`;
            }
            return `<li>${content}</li>\n`;
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
