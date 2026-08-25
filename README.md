<div align="center">

# Tabora

**A secure, multi-user proxy panel that runs entirely on Cloudflare Workers.**

[![CI](https://github.com/Taboraex/tabora-panel/actions/workflows/ci.yml/badge.svg)](https://github.com/Taboraex/tabora-panel/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Taboraex/tabora-panel?color=38bdf8)](https://github.com/Taboraex/tabora-panel/releases)
[![Licence](https://img.shields.io/badge/licence-GPL--3.0-6366f1)](./LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

🌐 [فارسی](./README_fa.md)

</div>

---

Tabora provides **VLESS** and **Trojan** over WebSocket, a modern bilingual
(English / فارسی) dashboard, per-user quotas and expiry, and subscription output
for Xray, Sing-box and Clash/Mihomo clients — all from a single `worker.js` file
with no server to maintain.

```
┌──────────────┐   WebSocket    ┌─────────────────┐   TCP    ┌──────────┐
│    Client    │ ─────────────► │ Tabora (Worker) │ ───────► │  Target  │
│ v2rayN/Clash │   VLESS/Trojan │  + D1 database  │          │          │
└──────────────┘                └─────────────────┘          └──────────┘
```

---

## Features

- **Two protocols** — VLESS and Trojan over WebSocket, with 0-RTT early data.
- **Multi-user** — per-subscriber UUID, traffic quota, daily cap, and expiry
  date. Users are auto-disabled when they exceed their limits.
- **Four subscription formats** — base64 URI list, plain URIs, Clash/Mihomo
  YAML, and Sing-box JSON. Format is auto-detected from the client User-Agent.
- **Bilingual dashboard** — English and Persian with full RTL support, dark and
  light themes, and a responsive layout that works on phones.
- **Decoy page** — any request outside the secret path mirrors a real website,
  so casual probes never see that a panel exists.
- **ProxyIP and NAT64** — automatic retry through a relay when Cloudflare's
  egress is blocked by the destination.
- **Private DoH** — UDP DNS is tunnelled to a DoH resolver of your choice.
- **JWT sessions** — HttpOnly, Secure, SameSite=Strict cookies with a rotating
  server-side secret; changing the password invalidates all sessions.
- **Backup and restore** — export the whole configuration as JSON and import it
  into another deployment.
- **Audit log** — logins, failed attempts, and every configuration change.

---

## Requirements

- A Cloudflare account (the free plan is enough)
- A **D1** database (recommended) or a **KV** namespace
- Node.js 18+ to build

---

## Quick start

### 1. Create the database

```bash
npx wrangler d1 create tabora-db
```

Copy the returned `database_id` into `wrangler.toml`.

### 2. Configure

Edit the `[vars]` block in `wrangler.toml`:

```toml
ADMIN_PASSWORD = "pick-something-strong"
SECURE_PATH    = "a-hard-to-guess-path"
FALLBACK       = "https://www.wikipedia.org"
```

Better still, keep the password out of the file:

```bash
npx wrangler secret put ADMIN_PASSWORD
```

### 3. Build and deploy

```bash
npm install
npm run build
npx wrangler deploy
```

### 4. Sign in

Open `https://<your-worker>.workers.dev/<SECURE_PATH>/panel`.

Every other path shows the decoy page.

---

## Configuration reference

All variables are optional except `ADMIN_PASSWORD`.

| Variable | Default | Description |
| --- | --- | --- |
| `ADMIN_PASSWORD` | `admin` | Panel password. **Change this.** |
| `SECURE_PATH` | `tabora` | Hidden base path for the panel and subscriptions. |
| `UUID` | derived | Fixed VLESS UUID (v4). Derived from the password if unset. |
| `TROJAN_PASSWORD` | derived | Trojan password. Derived from the password if unset. |
| `FALLBACK` | Wikipedia | Site mirrored for unauthorised requests. |
| `PROXY_IP` | built-in defaults | Comma-separated relay hosts, e.g. `1.2.3.4:443`. Seeds the relay list on a fresh deploy; once you save relays in the panel (or apply a scan), those win. |

### Traffic accounting

Every byte relayed back to a client is attributed to the user whose credential
opened the connection. Counters are buffered per connection and flushed via
`ctx.waitUntil`, which matters more than it sounds: a WebSocket handler returns
its 101 response immediately, so a write started afterwards is discarded unless
it is registered with the runtime. Without that registration the writes were
issued and dropped, quotas never moved, and every usage figure read zero.

The **Overview** tab charts the last 7 or 30 days as an inline SVG. There is no
charting library: the panel ships as a single self-contained file, and a CDN
dependency would be both a size cost and an availability risk on the networks
this tool is used on.

### Security

The panel is a single-credential admin surface reachable from anywhere, so the
protections are aimed at that reality:

- **Login throttling.** Eight failed attempts from one IP, or forty across all
  IPs, lock the form for fifteen minutes. Both buckets are needed: the per-IP
  limit stops one host hammering the form, the global one stops a distributed
  attempt using a fresh IP per guess.
- **PBKDF2-HMAC-SHA256** at 100,000 iterations (the Workers ceiling) for the
  admin password, replacing an iterated-SHA-256 chain. Existing panels keep
  working and are re-hashed transparently on the next sign-in.
- **Session cookies** are `HttpOnly`, `Secure`, `SameSite=Strict`.
- **Security headers** on every page: CSP with `frame-ancestors 'none'` and
  `base-uri 'none'`, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, HSTS.

`scripts/security-test.mjs` asserts all of the above against a deployed
worker. Run it after any change to auth.

> Note on obfuscation: the shipped `worker.js` is minified, but minification
> is not a security boundary — a Worker must be able to run its own code, so
> anything embedded in it can be recovered. Real protection comes from the
> controls above and from keeping your `ADMIN_PASSWORD`, `SECURE_PATH` and API
> tokens secret.

### Relays and the scanner

Cloudflare does not allow a Worker to open a TCP socket back into its own
network, and much of the web sits behind Cloudflare. Without a relay the
tunnel completes its handshake and then stalls with no data — which looks
exactly like a broken config. Tabora therefore ships working relay defaults so
a fresh install carries traffic immediately.

The **Scanner** tab tests and replaces them:

- **Relay health** probes each relay from the Worker and reports latency.
  Relays sit outside Cloudflare's network, so the Worker can measure them.
- **Clean IP scan** runs in your browser instead. A Worker cannot reach
  Cloudflare edges at all, and its timings would describe the datacentre
  rather than your connection — so the browser measures the path that actually
  matters to you.

Both let you apply the fastest results to your live configs in one click.

Everything else — ports, clean IPs, DNS, routing rules, naming templates — is
edited in the dashboard and stored in D1.

---

## Routes

| Path | Purpose |
| --- | --- |
| `/{path}/panel` | Dashboard (requires session) |
| `/{path}/login` | Sign-in page |
| `/{path}/sub` | Subscription endpoint |
| `/{path}/sub?u=NAME` | Per-user subscription |
| `/{path}/api/*` | JSON API (requires session) |
| `/vl`, `/tr` | WebSocket proxy endpoints |
| anything else | Decoy page |

### Subscription formats

Append `?format=` to force an output, or let Tabora sniff the User-Agent:

```
?format=base64     v2rayN, v2rayNG, Streisand, Shadowrocket
?format=clash      Clash Meta, Mihomo, Clash Verge, FlClash, Stash
?format=singbox    sing-box, husi, Hiddify, Karing, NekoBox
?format=plain      raw URI list, one per line
```

Opening a subscription URL in a browser shows a status page with the user's
quota, expiry and QR code instead of raw config.

---

## Project layout

```
src/
├── worker.ts              entry point and router
├── config/                defaults, constants, settings, validators
├── storage/               D1 layer, schema, in-isolate cache
├── auth/                  JWT sessions and password hashing
├── protocols/             VLESS, Trojan, WebSocket ↔ TCP relay
├── cores/                 URI, Clash and Sing-box config builders
├── users/                 subscriber model, quotas, usage accounting
├── handlers/              one module per route
└── assets/                panel, login and subscription pages
```

`npm run build` inlines each asset page, gzips it, bundles the worker with
esbuild, and writes a single self-contained `dist/worker.js`.

```bash
npm run check    # type-check
npm run build    # produce dist/worker.js
npm run dev      # local dev server via wrangler
```

---

## Limitations

Cloudflare Workers impose a few constraints that no panel can work around:

- **100,000 requests/day** on the free plan — comfortable for a handful of users.
- **No real UDP.** Only DNS (port 53) is supported, tunnelled over DoH. Telegram
  and WhatsApp voice/video calls will not work.
- **CPU time limits** per request.
- Cloudflare may disable Workers that match well-known proxy fingerprints.
  Tabora avoids literal protocol strings in the bundle, but no obfuscation is
  permanent.

---

## Security notes

- Change the default password immediately; the dashboard warns until you do.
- Pick a long, random `SECURE_PATH` — it is the first line of defence.
- Passwords are salted and hashed with 10,000 SHA-256 iterations.
- Sessions expire after 24 hours; changing the password rotates the signing
  secret and invalidates every existing session.
- The decoy proxy strips upstream cookies and CSP headers.

---

## Licence

GPL-3.0. See [LICENSE](./LICENSE).

Tabora is an independent implementation. Its architecture was informed by
studying prior art in this space — notably
[BPB-Worker-Panel](https://github.com/bia-pain-bache/BPB-Worker-Panel) (GPL-3.0),
[Nahan](https://github.com/itsyebekhe/nahan) (MIT) and
[edgetunnel](https://github.com/cmliu/edgetunnel) (GPL-2.0). Tabora is released
under GPL-3.0 so it remains compatible with that lineage.

**Use responsibly and in accordance with the laws that apply to you.**
