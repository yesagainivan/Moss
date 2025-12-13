export const WIKILINK_SEP = '__WK_SEP__';

export const wikilinkMarkedExtension = {
    name: 'wikilink',
    level: 'inline' as const,
    start(src: string) {
        return src.match(/\[\[/)?.index;
    },
    tokenizer(src: string, _tokens: any) {
        const rule = /^\[\[([^\]]+?)\]\]/;
        const match = rule.exec(src);
        if (match) {
            const content = match[1];
            let target, label, fragment;

            if (content.includes(WIKILINK_SEP)) {
                const parts = content.split(WIKILINK_SEP);
                target = parts[0].trim();
                label = parts[1].trim();
            } else if (content.includes('|')) {
                // Fallback for cases where pre-processing didn't happen or isn't needed
                const parts = content.split('|');
                target = parts[0].trim();
                label = parts[1].trim();
            } else {
                target = content.trim();
                label = null;
            }

            // Extract fragment if present (e.g., "Note#Heading" or "#Heading")
            if (target.includes('#')) {
                const fragmentIndex = target.indexOf('#');
                fragment = target.slice(fragmentIndex + 1).trim();
                target = target.slice(0, fragmentIndex).trim();
            }

            return {
                type: 'wikilink',
                raw: match[0],
                target: target,
                label: label,
                fragment: fragment || null,
            };
        }
    },
    renderer(token: any) {
        // Return the original wikilink syntax as plain text
        // This allows WikilinkHighlight decorations to style it
        const target = token.target || '';
        const fragment = token.fragment || '';
        const label = token.label;

        // Reconstruct the wikilink syntax
        const fullTarget = fragment ? (target ? `${target}#${fragment}` : `#${fragment}`) : target;
        return label ? `[[${fullTarget}|${label}]]` : `[[${fullTarget}]]`;
    }
};

export const calloutMarkedExtension = {
    name: 'callout',
    level: 'block' as const,
    start(src: string) {
        return src.match(/^>\s*\[!/)?.index;
    },
    tokenizer(src: string, _tokens: any) {
        // Match callout syntax: > [!type] optional title
        // Followed by subsequent lines starting with >
        // Updated regex to NOT require a newline, making title optional on the line
        const headerRule = /^>\s*\[!([a-z]+)\](?:\s+([^\n]+))?/i;
        const match = headerRule.exec(src);

        if (match) {
            const type = match[1].toLowerCase();
            const title = match[2]?.trim() || null;
            let raw = match[0];
            let content = '';

            // Find where the header ends (either newline or end of string)
            let startPos = match[0].length;
            if (src[startPos] === '\n') {
                raw += '\n';
                startPos++;
            }

            // Collect subsequent lines that start with >
            // Make sure we skip the first line (which was the header)
            const remaining = src.substring(startPos);
            const lines = remaining.split('\n');

            for (const line of lines) {
                // Check if this line is another callout header
                if (line.match(/^>\s*\[![a-z]+\]/i)) {
                    // Stop processing - this is a new callout
                    break;
                }

                if (line.startsWith('>')) {
                    raw += line + '\n';
                    // Remove leading > and optional space
                    content += line.replace(/^>\s?/, '') + '\n';
                } else if (line.trim() === '') {
                    // Allow empty lines within the callout
                    raw += line + '\n';
                    content += '\n';
                } else {
                    // End of callout (line doesn't start with >)
                    break;
                }
            }

            return {
                type: 'callout',
                raw: raw.trimEnd(),
                calloutType: type,
                title: title,
                text: content.trimEnd(),
            };
        }
    },
    renderer(token: any) {
        const type = token.calloutType || 'note';
        const title = token.title || (type.charAt(0).toUpperCase() + type.slice(1));
        const content = token.text || '';

        // Split content into paragraphs (separated by blank lines)
        // Each non-blank line becomes a paragraph
        let contentHtml = '';
        if (content) {
            const paragraphs = content.split(/\n\n+/); // Split on one or more blank lines
            contentHtml = paragraphs
                .map((para: string) => {
                    const trimmed = para.trim();
                    return trimmed ? `<p>${trimmed.replace(/\n/g, '<br>')}</p>` : '';
                })
                .filter(Boolean)
                .join('');
        }

        return `<div class="callout callout-${type}" data-callout-type="${type}" data-callout-title="${title}">
<div class="callout-title">${title}</div>
<div class="callout-content">${contentHtml}</div>
</div>`;
    }
};
