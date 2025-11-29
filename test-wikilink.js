import { marked } from 'marked';

const wikilinkMarkedExtension = {
    name: 'wikilink',
    level: 'inline',
    start(src) {
        return src.match(/\[\[/)?.index;
    },
    tokenizer(src, _tokens) {
        const rule = /^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/;
        const match = rule.exec(src);
        if (match) {
            console.log('Tokenizing match:', match[0]);
            return {
                type: 'wikilink',
                raw: match[0],
                target: match[1].trim(),
            };
        }
    },
    renderer(token) {
        return `[[${token.target}]]`;
    }
};

marked.use({ extensions: [wikilinkMarkedExtension] });

const text = 'Hello [[world]] test';
const html = marked.parse(text);
console.log('Output:', html);
