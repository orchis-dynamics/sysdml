"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizeIdent = canonicalizeIdent;
const LITERAL_PERIOD_SENTINEL = '\u{2024}';
const MODULE_SEPARATOR = '\u{00B7}';
function splitIdentifierParts(s) {
    const parts = [];
    let remaining = s;
    while (remaining.length > 0) {
        if (remaining.charCodeAt(0) === 0x22) {
            let i = 1;
            let closed = false;
            while (i < remaining.length) {
                if (remaining.charCodeAt(i) === 0x5c &&
                    i + 1 < remaining.length &&
                    remaining.charCodeAt(i + 1) === 0x22) {
                    i += 2;
                }
                else if (remaining.charCodeAt(i) === 0x22) {
                    parts.push(remaining.slice(0, i + 1));
                    remaining = remaining.slice(i + 1);
                    closed = true;
                    break;
                }
                else {
                    i += 1;
                }
            }
            if (!closed) {
                parts.push(remaining);
                remaining = '';
            }
        }
        else {
            const next = remaining.indexOf('"');
            const end = next === -1 ? remaining.length : next;
            parts.push(remaining.slice(0, end));
            remaining = remaining.slice(end);
        }
    }
    return parts;
}
function replaceWhitespaceWithUnderscore(s) {
    let result = '';
    let inWhitespace = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '\\' && i + 1 < s.length && (s[i + 1] === 'n' || s[i + 1] === 'r')) {
            i += 1;
            if (!inWhitespace) {
                result += '_';
                inWhitespace = true;
            }
        }
        else if (c === '\\') {
            inWhitespace = false;
            result += c;
        }
        else if (c === '\n' || c === '\r' || c === '\t' || c === ' ' || c === '\u{00A0}') {
            if (!inWhitespace) {
                result += '_';
                inWhitespace = true;
            }
        }
        else {
            inWhitespace = false;
            result += c;
        }
    }
    return result;
}
function canonicalizeIdent(name) {
    const trimmed = name.trim();
    let canonical = '';
    for (const part of splitIdentifierParts(trimmed)) {
        const isQuoted = part.length >= 2 && part.charCodeAt(0) === 0x22 && part.charCodeAt(part.length - 1) === 0x22;
        let mapped;
        if (isQuoted) {
            const inner = part.slice(1, part.length - 1);
            mapped = inner.includes('.') ? inner.split('.').join(LITERAL_PERIOD_SENTINEL) : inner;
        }
        else {
            mapped = part.split('.').join(MODULE_SEPARATOR);
        }
        mapped = mapped.split('\\\\').join('\\');
        mapped = replaceWhitespaceWithUnderscore(mapped);
        mapped = mapped.toLowerCase();
        canonical += mapped;
    }
    return canonical;
}
//# sourceMappingURL=canonicalize.js.map