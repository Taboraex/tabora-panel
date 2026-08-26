/**
 * Tabora build pipeline.
 *
 * Inlines every asset page (HTML + CSS + JS) into a single gzipped base64 blob,
 * bundles the TypeScript worker with esbuild, minifies it, and emits one
 * self-contained dist/worker.js that can be pasted straight into Cloudflare.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';
import { build } from 'esbuild';
import { minify as jsMinify } from 'terser';
import { minify as htmlMinify } from 'html-minifier-terser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSET_PATH = join(ROOT, 'src/assets');
const DIST_PATH = join(ROOT, 'dist');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const green = '\x1b[32m';
const red = '\x1b[31m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';
const ok = `${green}✔${reset}`;
const fail = `${red}✗${reset}`;

/** Read every src/assets/<name>/index.html, inline its sibling css/js, gzip it. */
async function processAssets() {
    const result = {};
    if (!existsSync(ASSET_PATH)) return result;

    const dirs = readdirSync(ASSET_PATH, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

    for (const dir of dirs) {
        const base = (file) => join(ASSET_PATH, dir, file);
        if (!existsSync(base('index.html'))) continue;

        // Placeholders are substituted at runtime by src/common/template.ts.
        let html = readFileSync(base('index.html'), 'utf8');

        if (existsSync(base('style.css'))) {
            html = html.replace('/* CSS_PLACEHOLDER */', readFileSync(base('style.css'), 'utf8'));
        }

        if (existsSync(base('script.js'))) {
            const raw = readFileSync(base('script.js'), 'utf8');
            const { code } = await jsMinify(raw, { module: true });
            // `$` sequences are special in String.replace — escape them.
            html = html.replace('/* JS_PLACEHOLDER */', () => code);
        }

        const minified = injectBrandImages(await htmlMinify(html, {
            collapseWhitespace: true,
            removeComments: true,
            removeAttributeQuotes: true,
            minifyCSS: true,
        }));

        // Guard: every inline script must still parse once placeholders are
        // filled in. A placeholder that doubles as a JS identifier (the old
        // `window.__BASE__ = "__BASE__"` form) silently breaks the whole page.
        assertScriptsSurviveSubstitution(dir, minified);

        result[dir] = gzipSync(minified, { level: 9 }).toString('base64');
        const kb = (result[dir].length / 1024).toFixed(1);
        console.log(`  ${dim}${dir.padEnd(14)} ${kb} KB (gzip+b64)${reset}`);
    }

    console.log(`${ok} Assets bundled`);
    return result;
}

function dataUri(file, mime) {
    const buf = readFileSync(join(ASSET_PATH, 'shared', file));
    return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Swap brand-image tokens for data URIs *after* minify.
 *
 * html-minifier may strip quotes around a token. Base64 contains `=`, which
 * is illegal in an unquoted HTML attribute, so the replacement always
 * re-quotes the value.
 */
function injectBrandImages(html) {
    const images = {
        LOGO_BADGE_SRC: dataUri('logo-badge.webp', 'image/webp'),
        LOGO_MARK_SRC: dataUri('logo-mark.webp', 'image/webp'),
        FAVICON_SRC: dataUri('favicon.png', 'image/png'),
    };
    for (const [token, uri] of Object.entries(images)) {
        const next = html.replace(
            new RegExp(`(src|href)=(["']?)${token}\\2`, 'g'),
            `$1="${uri}"`,
        );
        if (next === html && html.includes(token)) {
            throw new Error(`brand token ${token} was not substituted`);
        }
        html = next;
    }
    return html;
}

/**
 * Substitute every {{PLACEHOLDER}} with a hostile sample value and confirm the
 * inline scripts still parse. Catches placeholders that sit inside identifiers.
 */
function assertScriptsSurviveSubstitution(dir, html) {
    const sample = '/a-b_c9';
    const filled = html.replace(/\{\{[A-Z_]+\}\}/g, sample);

    const scripts = [...filled.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
    for (const [, code] of scripts) {
        if (!code.trim()) continue;
        try {
            new Function(code);
        } catch (error) {
            throw new Error(
                `${dir}: inline script does not parse after placeholder ` +
                `substitution — ${error.message}\n` +
                `Check for a placeholder used as part of an identifier.`,
            );
        }
    }

    const leftover = filled.match(/__[A-Z_]+__/g);
    if (leftover) {
        throw new Error(`${dir}: legacy placeholders remain: ${[...new Set(leftover)].join(', ')}`);
    }
}

async function buildWorker() {
    console.log(`\n${dim}Building Tabora v${pkg.version}${reset}\n`);

    const assets = await processAssets();

    const bundled = await build({
        entryPoints: [join(ROOT, 'src/worker.ts')],
        bundle: true,
        format: 'esm',
        write: false,
        platform: 'browser',
        target: 'esnext',
        external: ['cloudflare:sockets'],
        define: { VERSION: JSON.stringify(pkg.version) },
        logLevel: 'warning',
    });

    console.log(`${ok} Worker bundled`);

    const { code: script } = await jsMinify(bundled.outputFiles[0].text, {
        module: true,
        output: { comments: false },
        compress: { dead_code: true, passes: 2 },
    });

    console.log(`${ok} Worker minified`);

    const embedded = {
        PANEL_HTML: assets['panel'] ?? '',
        LOGIN_HTML: assets['login'] ?? '',
        SUBSCRIPTION_HTML: assets['subscription'] ?? '',
        ERROR_HTML: assets['error'] ?? '',
    };

    const banner = [
        `// Tabora Panel v${pkg.version}`,
        `// Build: ${new Date().toISOString()}`,
        '// @ts-nocheck',
    ].join('\n');

    const worker = `${banner}\nObject.assign(globalThis, ${JSON.stringify(embedded)});\n${script}`;

    mkdirSync(DIST_PATH, { recursive: true });
    writeFileSync(join(DIST_PATH, 'worker.js'), worker, 'utf8');

    const sizeKb = (Buffer.byteLength(worker) / 1024).toFixed(1);
    console.log(`${ok} Wrote dist/worker.js ${dim}(${sizeKb} KB)${reset}\n`);
}

buildWorker().catch((err) => {
    console.error(`${fail} Build failed:`, err);
    process.exit(1);
});
