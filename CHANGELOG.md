# Changelog

All notable changes to Tabora are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] — 2026-08-26

### Added

- **Intelligent clean-IP scanner.** The pool no longer throws random samples
  at Cloudflare. It walks, in order: previous winners for this operator, a
  baked catalogue of Cloudflare clean IPs that actually front a Worker,
  neighbours in the same /24 as whatever answered, then a wider sample of
  the front ranges. Smart mode stops as soon as it has enough healthy,
  diverse IPs. Quick / Smart / Deep is a single control.
- Catalogue is Worker-front only — IRCF/CFScanner dumps that mix colo
  interconnects, WARP endpoints and unused `/22`s are not used as seeds.

### Changed

- Pinned IPs prefer distinct `/24`s so one throttled prefix cannot take
  down every config.

## [0.7.3] — 2026-08-26

### Fixed

- **N country-pool IPs produced N × ports × protocols configs.** Three Turkey
  IPs with the default ports and both VLESS and Trojan became dozens of
  nodes, so nothing looked “fixed”. A live pool now emits **exactly one
  config per pinned IPv4**: port 443 (or the first selected TLS port), one
  protocol (VLESS if both are on), and no worker-hostname filler. Clash and
  sing-box drop the url-test group so the client cannot hop between those IPs.
- **Scanner could pin a lossy random address just to fill `keep`.** Ranking
  now requires several successful probes, prefers the verified Worker-front
  seed list, and never pads the pool with IPs that dropped packets. Every
  scan still includes the full seed list even when “keep” is 1–3.

## [0.7.2] — 2026-08-26

### Fixed

- **Hiddify refused the subscription** with
  `duplicate outbound/endpoint tag`. The 0.7.1 name template dropped
  `{PROTOCOL}`, so VLESS and Trojan of the same IP rendered as one tag and
  Sing-box (which Hiddify uses) rejected the JSON. Outbound tags / Clash
  proxy names are now forced unique, and the default template includes
  `{PROTOCOL}` again. Existing 0.7.1 templates are migrated on load.

## [0.7.1] — 2026-08-26

### Fixed

- **Country-pool configs never pinged or connected.** The 0.7.0 catalogue used
  geolocated AS13335 prefixes (Turkey `104.23.181.0/22`, `172.70.112.0/22`,
  …). Those are colo interconnects: TCP may open, but they do not front a
  Worker, so every generated config was dead and Hiddify hid them. The pool
  now samples only prefixes that actually serve `*.workers.dev`
  (`104.16/14`, `104.20/15`, `104.24/14`, `162.159/16`, `188.114.96/20`) plus
  a seed list of verified fronts. Country is a **label** on the same anycast.
- Existing panels auto-heal on load: non-front IPs are dropped from the pool
  and from `cleanIPs`; an empty pool disables itself and falls back to the
  worker hostname.
- Pool IPs are enumerated **first**, so they are not squeezed out of the first
  `maxConfigs` slots by hostname × ports × protocols.
- URI / Clash / sing-box / gaming configs set `allowInsecure` /
  `skip-cert-verify` / `insecure` when the server address is an IPv4, which
  is what clients need when SNI is the worker hostname and the socket is an IP.

### Changed

- Default name template is now `{FLAG} {COUNTRY} {PREFIX}-{INDEX} · {ADDRESS}`
  so Hiddify’s geo flag (often 🇺🇸 on anycast) does not hide which country
  you pinned.

## [0.7.0] — 2026-08-26

### Added

- **Proxy IP Pool** in the Scanner tab. Pick a country (Turkey, Germany,
  Netherlands, UAE, … or “Best for me”), probe only Cloudflare IPs that
  belong to that country from the operator’s own network, and automatically
  pin the fastest ones as the address field of every generated config.
- Country catalogue with geo-tagged Cloudflare prefixes (IST, FRA, AMS, DXB
  and 18 more) so “scan Turkey” actually tests Istanbul ranges, not a random
  /13.
- Lock-to-pool mode: subscriptions emit only the pinned IPv4 literals — no
  worker hostname, no DNS re-resolution — which is what “fixed IP configs”
  means in practice.
- Scanner UI rebuilt around the pool: flag grid, radar sweep while probing,
  ranked latency bars, and a live “active pool” strip.

### Changed

- Config remarks now receive `{FLAG}` / `{COUNTRY}` from the active pool so
  a Turkey pin shows up as 🇹🇷 in v2rayNG, Clash and Sing-box alike.

## [0.1.3] — 2026-08-25

### Fixed

- **Two modals appeared over the dashboard on load.** The "Add user" and
  "Change password" dialogs both carry the `hidden` attribute, but `hidden` is
  only `display: none` in the user-agent stylesheet — and
  `.modal-backdrop { display: grid }` outranks it. Both dialogs rendered on top
  of the panel immediately after signing in.

  The display rule is now scoped with `:not([hidden])`, so a hidden element
  never receives a `display` value from our stylesheet and the UA default
  applies cleanly. This was chosen over `!important` because the latter cannot
  be verified in the test environment.

### Removed

- **The Change password dialog.** Panels are provisioned by the Telegram
  launcher, which hands the password to the operator at install time, so an
  in-panel change flow added a modal, a form and three fields for no benefit.
  The `POST /api/set-password` endpoint is retained: it still guards first-run
  setup for panels deployed by hand.
- The unused `WARN_PASSWORD` template placeholder and the default-password
  toast that pointed at the now-removed button.

### Added

- The browser-level UI test now asserts that **no element carrying `hidden` is
  rendered**, and that the Add-user modal still opens and closes on click.

---

## [0.1.2] — 2026-08-25

### Fixed

- **Sign in did nothing.** The login and panel pages bootstrapped their config
  with `window.__BASE__ = "__BASE__";`. Substitution replaced *both*
  occurrences, including the identifier, producing `window./secretpath =
  "/secretpath";` — a `SyntaxError` that aborted the entire inline script.
  No submit handler was ever attached, so clicking Sign in was inert. The API
  was healthy throughout, which is why request-level testing missed it.

  Placeholders now use a `{{NAME}}` delimiter that cannot appear inside a
  JavaScript identifier, and substitution runs through
  `src/common/template.ts`, which escapes values for both HTML and JS-string
  contexts.

- **Dashboard fields stayed empty when canvas was unavailable.** QR rendering
  ran before the settings form was populated, so a `getContext` failure in a
  restricted webview left every input blank. QR drawing is now guarded and the
  form is filled first.

### Added

- `scripts/ui-test.mjs` — a browser-level test that loads the pages in a real
  DOM and clicks through login, rather than calling the API directly. Verified
  to fail against the broken build and pass against the fix.
- Build-time guard that substitutes every placeholder with a hostile value and
  re-parses each inline script, failing the build if one breaks.
- CI checks for leftover `__PLACEHOLDER__` tokens in the bundle and runs the
  browser-level test.

---

## [0.1.1] — 2026-08-25

### Fixed

- **Multi-user support on KV-only deployments.** `UserService` issued raw SQL
  that silently no-opped when no D1 binding was present: creating a user
  reported success but the record was never stored, and the Users tab stayed
  empty. Users, usage counters and logs now go through a storage-agnostic
  collection layer that uses D1 tables when available and JSON documents in KV
  otherwise. This matters for the Telegram launcher, which provisions panels
  with KV because D1 needs an extra API-token permission.

### Changed

- Protocol identifiers in the Clash and Sing-box builders are now assembled at
  runtime instead of appearing as string literals in the bundle, matching the
  rest of the codebase and the CI anti-fingerprinting gate.

---

## [Unreleased]

### Planned

- Telegram bot for managing users and reading stats
- In-panel self-update via the Cloudflare API
- Private DoH endpoint exposed as a route
- Per-user protocol and port overrides in the dashboard UI

---

## [0.1.0] — 2026-08-25

First public release.

### Added

**Protocols**
- VLESS over WebSocket with 0-RTT early data
- Trojan over WebSocket, including a hand-written SHA-224 implementation
- WebSocket ↔ TCP relay with automatic retry through ProxyIP or NAT64
- UDP DNS tunnelled to a configurable DoH resolver

**Subscriptions**
- Four output formats: base64 URI list, plain URIs, Clash/Mihomo YAML and
  Sing-box JSON
- Format auto-detection from the client User-Agent
- Per-user subscription links with `Subscription-Userinfo` headers
- Informational nodes showing live quota and expiry inside the client
- Browser visitors get an HTML status page with a QR code instead of raw config
- Configurable naming template with `{FLAG}`, `{PREFIX}`, `{INDEX}`,
  `{PROTOCOL}`, `{PORT}` and `{ADDRESS}` tags

**Users**
- Multi-user support with a unique UUID per subscriber
- Total traffic quota, daily cap and expiry date
- Automatic disabling when a limit is reached
- Status model: active, paused, expired, quota-exceeded, daily-limit,
  auto-disabled
- Per-user overrides for protocols, ports, clean IPs and panel domain

**Panel**
- Bilingual dashboard, English and Persian, with full RTL support
- Dark and light themes
- Five tabs: Overview, Links, Users, Settings, Logs
- Responsive layout down to phone width
- QR code generation with a dependency-free encoder
- Backup export and import as JSON
- Activity log covering logins, failures and configuration changes

**Security**
- JWT sessions over HttpOnly, Secure, SameSite=Strict cookies
- Passwords salted and hashed with 10,000 SHA-256 iterations
- Constant-time password comparison
- Password change rotates the signing secret and revokes all sessions
- Decoy page mirrors a real site for every request outside the secret path
- Decoy proxy strips upstream cookies and CSP headers
- Protocol identifiers assembled at runtime, never present as literals
- 16 input validators run on every settings write

**Storage**
- Cloudflare D1 as the primary datastore, with five tables
- Optional KV fallback
- In-isolate TTL cache to keep hot paths off the database

**Build**
- TypeScript sources bundled by esbuild into one `dist/worker.js`
- Assets inlined, minified, gzipped and base64-embedded
- Output around 100 KB, well under the 1 MB Workers limit

[Unreleased]: https://github.com/Taboraex/tabora-panel/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/Taboraex/tabora-panel/releases/tag/v0.8.0
[0.7.3]: https://github.com/Taboraex/tabora-panel/releases/tag/v0.7.3
[0.7.2]: https://github.com/Taboraex/tabora-panel/releases/tag/v0.7.2
[0.7.1]: https://github.com/Taboraex/tabora-panel/releases/tag/v0.7.1
[0.7.0]: https://github.com/Taboraex/tabora-panel/releases/tag/v0.7.0
[0.1.3]: https://github.com/Taboraex/tabora-panel/releases/tag/v0.1.3
[0.1.2]: https://github.com/Taboraex/tabora-panel/releases/tag/v0.1.2
[0.1.1]: https://github.com/Taboraex/tabora-panel/releases/tag/v0.1.1
[0.1.0]: https://github.com/Taboraex/tabora-panel/releases/tag/v0.1.0
