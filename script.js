const htmlInput = document.getElementById('html-code');
const cssInput = document.getElementById('css-code');
const jsInput = document.getElementById('js-code');
const outputFrame = document.getElementById('output');

function expandEmmet(abbr) {
    if (abbr === '!') {
        return `<!DOCTYPE html>\n<html lang="uk">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>`;
    }

    const voidTags = ['img', 'input', 'br', 'hr', 'meta', 'link'];

    function parseElement(str) {
        let count = 1;
        const multMatch = str.match(/\*(\d+)$/);
        if (multMatch) {
            count = parseInt(multMatch[1], 10);
            str = str.slice(0, -multMatch[0].length);
        }

        let text = '';
        const textMatch = str.match(/\{([^}]*)\}/);
        if (textMatch) {
            text = textMatch[1];
            str = str.replace(textMatch[0], '');
        }

        let attrs = '';
        const attrMatch = str.match(/\[([^\]]*)\]/);
        if (attrMatch) {
            attrs = ' ' + attrMatch[1];
            str = str.replace(attrMatch[0], '');
        }

        const idMatch = str.match(/#([a-zA-Z0-9_-]+)/);
        const id = idMatch ? ` id="${idMatch[1]}"` : '';
        if (idMatch) str = str.replace(idMatch[0], '');

        const classes = [];
        str = str.replace(/\.([a-zA-Z0-9_-]+)/g, (_, cls) => {
            classes.push(cls);
            return '';
        });
        const classAttr = classes.length ? ` class="${classes.join(' ')}"` : '';

        const tag = str || 'div';
        return { tag, id, classAttr, attrs, text, count };
    }

    function buildTree(expr, indent = '') {
        const siblings = [];
        let depth = 0, current = '';
        for (let char of expr) {
            if (char === '{' || char === '[') depth++;
            if (char === '}' || char === ']') depth--;
            if (char === '+' && depth === 0) {
                siblings.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        siblings.push(current);

        return siblings.map(sib => {
            let childIndex = -1;
            depth = 0;
            for (let i = 0; i < sib.length; i++) {
                if (sib[i] === '{' || sib[i] === '[') depth++;
                if (sib[i] === '}' || sib[i] === ']') depth--;
                if (sib[i] === '>' && depth === 0) {
                    childIndex = i;
                    break;
                }
            }

            const parentStr = childIndex !== -1 ? sib.slice(0, childIndex) : sib;
            const childStr = childIndex !== -1 ? sib.slice(childIndex + 1) : '';
            const el = parseElement(parentStr);

            let result = [];
            for (let i = 0; i < el.count; i++) {
                const openTag = `<${el.tag}${el.id}${el.classAttr}${el.attrs}>`;
                if (voidTags.includes(el.tag)) {
                    result.push(`${indent}${openTag}`);
                } else if (childStr) {
                    const childrenHtml = buildTree(childStr, indent + '    ');
                    result.push(`${indent}${openTag}\n${childrenHtml}\n${indent}</${el.tag}>`);
                } else {
                    result.push(`${indent}${openTag}${el.text}</${el.tag}>`);
                }
            }
            return result.join('\n');
        }).join('\n');
    }

    if (!/^[a-zA-Z0-9.#>+*{}\[\]="':_-]+$/.test(abbr)) return null;
    return buildTree(abbr);
}

htmlInput.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();

        const cursorPos = this.selectionStart;
        const textBeforeCursor = this.value.substring(0, cursorPos);
        const textAfterCursor = this.value.substring(this.selectionEnd);
        const match = textBeforeCursor.match(/([^\s]+)$/);

        if (match) {
            const abbr = match[1];
            const expanded = expandEmmet(abbr);
            
            if (expanded) {
                const newTextBefore = textBeforeCursor.slice(0, -abbr.length) + expanded;
                this.value = newTextBefore + textAfterCursor;
                this.selectionStart = this.selectionEnd = newTextBefore.length;
                runCode();
                return;
            }
        }
        this.value = textBeforeCursor + '    ' + textAfterCursor;
        this.selectionStart = this.selectionEnd = cursorPos + 4;
    }
});
[cssInput, jsInput].forEach(editor => {
    editor.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
        }
    });
});
function runCode() {
    const html = htmlInput.value;
    const css = `<style>${cssInput.value}</style>`;
    const js = jsInput.value;

    const frameDoc = outputFrame.contentDocument || outputFrame.contentWindow.document;

    frameDoc.open();
    frameDoc.write(html + css);
    frameDoc.close();
    try {
        outputFrame.contentWindow.eval(js);
    } catch (error) {
        console.error('Помилка виконання JS:', error);
    }
}

htmlInput.addEventListener('input', runCode);
cssInput.addEventListener('input', runCode);
jsInput.addEventListener('input', runCode);

runCode();
