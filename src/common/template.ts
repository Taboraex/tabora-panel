/**
 * Asset template substitution.
 *
 * Placeholders use a `{{NAME}}` delimiter rather than bare `__NAME__` tokens.
 * That matters: an inline script written as
 *
 *     window.__BASE__ = "__BASE__";
 *
 * has the placeholder appearing twice — once as the value, once as part of the
 * variable name. A blind replace rewrites the identifier too and produces
 * `window./secret = "/secret";`, a SyntaxError that kills the whole script and
 * silently breaks every button on the page.
 *
 * `{{BASE}}` cannot form part of a JavaScript identifier, so the value slot is
 * the only thing that can ever match.
 */

/** Escape a value so it is safe inside an HTML attribute or text node. */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escape a value for embedding inside a double-quoted JavaScript string
 * literal, which is how the inline bootstrap scripts receive their config.
 */
function escapeJsString(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/</g, '\\u003c');
}

/**
 * Replace every `{{KEY}}` in `template` with its value.
 *
 * Values are escaped for both HTML and JS-string contexts, so a hostile
 * setting (say a secure path containing a quote) cannot break out of either.
 */
export function renderTemplate(
    template: string,
    values: Record<string, string>,
): string {
    return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key: string) => {
        const value = values[key];
        if (value === undefined) return match;
        // Escaping for a JS string also leaves the value safe in HTML text,
        // since the characters that matter there are quotes and angle brackets.
        return escapeJsString(escapeHtml(value));
    });
}

export { escapeHtml };
