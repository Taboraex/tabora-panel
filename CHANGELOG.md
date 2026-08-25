# Changelog

All notable changes to Tabora are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[Unreleased]: https://github.com/Taboraex/tabora-panel/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/Taboraex/tabora-panel/releases/tag/v0.1.1
[0.1.0]: https://github.com/Taboraex/tabora-panel/releases/tag/v0.1.0
