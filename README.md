<div align="center">

<p align="center"><img src="brand/logo.svg" alt="Tabora" width="240"></p>

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
- **One-tap import** — the subscription page opens Hiddify, v2rayNG, V2Box or
  Happ through their own URL schemes and imports the profile automatically, so
  nobody has to copy and paste a link by hand. See
  [The subscription page](#the-subscription-page).
- **Decoy page** — any request outside the secret path mirrors a real website,
  so casual probes never see that a panel exists.
- **Telegram remote control** — after install or upgrade from the bot, manage
  users, traffic and the kill switch from chat. The dashboard shows when a
  panel is linked.
- **Clean IP scanner** — multi-wave scan from your own network that finds many
  low-ping Worker-front IPv4s, ranks them on stability, and lets you choose
  how many to pin. Each pinned IP becomes exactly one config.
- **Gaming profiles** — pin one fixed IP, port and protocol so the route never
  changes between sessions. Candidate edges are measured repeatedly from your
  own browser and ranked on *stability*, not raw speed. See
  [Gaming profiles](#gaming-profiles).
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

- **Clean IP scan** is how you get a real fixed IP. It runs in your browser
  as a multi-wave sweep of Cloudflare addresses that actually front a Worker
  (not colo interconnects, not “Turkey `/22`” anycast theatre): previous
  winners, verified seeds, a baked catalogue, nearby `/24`s, then a wider
  sample. Ranking favours steady low ping over a single fast probe, and a
  keep slider (1–30) lets you choose how many of the healthy IPs to pin. Each
  one becomes exactly one config on port 443 — leftover catalogue domains
  do not multiply ports or protocols, no country labels, no hostname that
  re-resolves.
- **Relay health** probes each relay from the Worker and reports latency.
  Relays sit outside Cloudflare's network, so the Worker can measure them.

Relay and clean-IP results are applied by hand from the scan results.

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
| `/{path}/sub?gaming=1` | Pinned gaming profiles only |
| `/{path}/api/*` | JSON API (requires session) |
| `/{path}/api/bot/*` | Telegram launcher (`X-Tabora-Key`) |
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

## Gaming profiles

A normal subscription lists every address x port combination and wraps them in
a `url-test` group, so the client picks whichever edge is fastest and re-checks
on a timer. That is the right behaviour for browsing and the wrong behaviour
for games:

- the client **re-probes every few minutes and can switch mid-match**;
- the default clean-IP entries are *domains*, so DNS re-resolves on every
  reconnect and can land on a different edge — the ping moves between sessions;
- multiplexing adds head-of-line blocking, which shows up as a spike.

A gaming profile pins **one IPv4 literal, one port, one protocol** and emits no
selector group at all. Every session takes the identical route.

### How ranking works

Candidates are measured **from your browser**, five times each. A worker cannot
usefully measure this: it sits in a datacentre, so its latency describes
Cloudflare's network rather than yours, and it is not permitted to open sockets
into Cloudflare's own address space at all.

Results are scored on stability rather than speed:

```
score = median + 2 x jitter + 500 x lossRate     (lower is better)
```

Jitter is the **median of successive differences** (RFC 3550 style). Standard
deviation would let one outlier condemn a good edge; median absolute deviation
would ignore up to half the samples and rate an alternating 40/200 ms route as
"stable" — which is exactly the pattern that rubber-bands a match. Grades run
S/A/B/C/D off the composite score, so a steady 90 ms outranks a jumpy 45 ms.

### Options

| Option | Effect |
| --- | --- |
| Lock to profile | Emits no `url-test`/`urltest` group, so the client cannot drift. On by default. |
| Skip relay hop | Game servers are not behind Cloudflare, so the relay detour is unnecessary latency. |
| Split tunnel | Routes only game traffic through the tunnel; everything else goes direct. |

### Honest limits

Cloudflare Workers carry **TCP, not UDP**. Most competitive shooters send
gameplay over UDP and will not pass through any Workers-based tunnel — no panel
can change that. What a pinned profile does deliver: a route that never
changes, no DNS lookup at connect time, no mid-match switching, and no extra
relay hop. That is a real, measurable win for TCP games, launchers, matchmaking
and downloads.


---

## The subscription page

Opening a subscription URL in a browser serves a page built for the person
holding the link rather than for a client app.

### One-tap import

Each supported app registers its own URL scheme and expects the subscription in
its own shape, so the page builds a different link per app:

| App | Deep link |
| --- | --- |
| Hiddify | `hiddify://install-sub?url=<encoded>&name=<name>` |
| v2rayNG | `v2rayng://install-sub?url=<encoded>&name=<name>` |
| V2Box | `v2box://install-sub?url=<encoded>&name=<name>` |
| Happ | `happ://add/<url>` — path segment, not a query parameter |

Each link also pins an explicit `?format=` — sing-box for Hiddify, base64 for
the Xray-based clients. That is load-bearing, not cosmetic: importers fetch over
plain HTTP with a generic WebView or Dart User-Agent and `Accept: text/html`,
which is indistinguishable from a real browser by sniffing alone. Without the
format the worker served them the human status page and the app reported
*unable to determine config format*. An explicit `?format=` now always wins over
UA detection.

A browser cannot be asked whether a scheme is registered, so the page infers it:
a successful hand-off backgrounds the document, and if the page is still visible
a moment later nothing opened. In that case the link is copied to the clipboard
instead, so tapping an app you do not have installed is never a dead end.

### Copy actions

Subscription link, VLESS config, Clash link, Sing-box link, and copy-all. The
VLESS and copy-all actions fetch `?format=plain` and pull the URIs out of the
response, so they return real configs rather than another link.

`User-Agent` is a forbidden header for `fetch()`, which is why the format is
requested in the query string rather than by spoofing a client UA.

### Gaming subscriptions

Opening `?gaming=1` in a browser shows the same page marked with a Gaming badge,
and every link it produces — deep links, copies and QR — keeps the flag, so the
visitor always receives the pinned profile rather than the full server list.

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
├── gaming/                endpoint scoring and pinned-profile builders
├── scanner/               clean-IP and relay probing
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
  and WhatsApp voice/video calls will not work, and UDP-based game traffic
  (most competitive shooters) will not tunnel — see
  [Gaming profiles](#gaming-profiles).
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

## Brand

The mark and wordmark live in [`brand/`](./brand). It is a hexagon holding a
**T** with three nodes on alternating vertices — the letter and a network
topology at the same time, deliberately avoiding the shield-and-padlock motif
that most panels in this space share.
