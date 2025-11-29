
import { marked } from 'marked';

marked.use({
    gfm: true,
    breaks: false,
});




const renderer = {
    list(token: any) {
        const type = token.ordered ? 'ol' : 'ul';
        const start = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
        // Check if any item is a task
        const isTask = token.items.some((item: any) => item.task);
        const listClass = isTask ? ' data-type="taskList"' : '';

        // Use the body from the token, which is already processed items
        // But marked renderer.list receives the body string as second arg in older versions, 
        // or we iterate items. In marked v14+ (which we likely have), it might be different.
        // Let's stick to the signature: list({ items, ordered, start, body })
        // Actually, looking at marked docs, renderer.list(token) is for the token object.
        // Wait, the signature in marked 14 is list(token).

        const body = token.items.map((item: any) => this.listitem(item)).join('');

        return `<${type}${listClass}${start}>\n${body}</${type}>\n`;
    },
    listitem(token: any) {
        let content = token.text;
        if (token.task) {
            const checked = token.checked ? 'true' : 'false';
            return `<li data-type="taskItem" data-checked="${checked}">
<label><input type="checkbox" ${token.checked ? 'checked' : ''} disabled><span></span></label>
<div>${content}</div>
</li>\n`;
        }
        return `<li>${content}</li>\n`;
    }
};

marked.use({ renderer });

const markdown = `
- [ ] Task 1
- [x] Task 2
- Regular item
`;

const html = marked.parse(markdown);
console.log(html);
