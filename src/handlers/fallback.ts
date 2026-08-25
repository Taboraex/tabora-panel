import { Settings } from '#types/settings';
import { isValidUrl } from '@common/utils';

/**
 * Decoy response for anything that isn't a known route.
 *
 * Rather than returning 404 (which advertises "something is here"), we mirror a
 * legitimate site so casual probing and automated scanners see a normal page.
 */
export async function renderFallback(request: Request, settings: Settings): Promise<Response> {
    const target = settings.fallback?.trim();

    if (target && isValidUrl(target)) {
        try {
            const url = new URL(request.url);
            const upstream = new URL(target);
            upstream.pathname = url.pathname;
            upstream.search = url.search;

            const proxied = new Request(upstream.toString(), {
                method: request.method,
                headers: stripHopHeaders(request.headers),
                redirect: 'follow',
            });

            const response = await fetch(proxied);
            const headers = new Headers(response.headers);

            // `fetch` has already decompressed the body, so the upstream
            // encoding/length headers no longer describe what we are sending.
            headers.delete('content-encoding');
            headers.delete('content-length');
            headers.delete('transfer-encoding');
            headers.delete('content-security-policy');
            headers.delete('content-security-policy-report-only');
            // Don't leak the decoy's cookies to the client.
            headers.delete('set-cookie');

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers,
            });
        } catch {
            // fall through to the static page
        }
    }

    return new Response(STATIC_DECOY, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

function stripHopHeaders(headers: Headers): Headers {
    const out = new Headers(headers);
    for (const name of ['cf-connecting-ip', 'cf-ray', 'x-forwarded-for', 'x-real-ip', 'cookie']) {
        out.delete(name);
    }
    return out;
}

const STATIC_DECOY = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>It works!</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;
       display:grid;place-items:center;min-height:100vh;background:#fff;color:#222}
  main{text-align:center;padding:2rem;max-width:38rem}
  h1{font-weight:600;font-size:1.6rem;margin:0 0 .75rem}
  p{color:#666;line-height:1.6;margin:.4rem 0}
  hr{border:0;border-top:1px solid #eee;margin:1.5rem 0}
  small{color:#999}
</style>
</head>
<body>
<main>
  <h1>It works!</h1>
  <p>This is the default landing page for this server.</p>
  <p>The server software is running but no content has been configured yet.</p>
  <hr>
  <small>If you are the administrator, replace this page with your own content.</small>
</main>
</body>
</html>`;
