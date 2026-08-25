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

        let html = readFileSync(base('index.html'), 'utf8').replaceAll('__VERSION__', pkg.version);

        if (existsSync(base('style.css'))) {
            html = html.replace('/* CSS_PLACEHOLDER */', readFileSync(base('style.css'), 'utf8'));
        }

        if (existsSync(base('script.js'))) {
            const raw = readFileSync(base('script.js'), 'utf8');
            const { code } = await jsMinify(raw, { module: true });
            // `$` sequences are special in String.replace — escape them.
            html = html.replace('/* JS_PLACEHOLDER */', () => code);
        }

        const minified = await htmlMinify(html, {
            collapseWhitespace: true,
            removeComments: true,
            removeAttributeQuotes: true,
            minifyCSS: true,
        });

        result[dir] = gzipSync(minified, { level: 9 }).toString('base64');
        const kb = (result[dir].length / 1024).toFixed(1);
        console.log(`  ${dim}${dir.padEnd(14)} ${kb} KB (gzip+b64)${reset}`);
    }

    console.log(`${ok} Assets bundled`);
    return result;
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
