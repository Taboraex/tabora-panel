# Contributing to Tabora

Thanks for taking the time to contribute. This document explains how to get a
development environment running and what we look for in a pull request.

---

## Getting started

```bash
git clone https://github.com/Taboraex/tabora-panel.git
cd tabora
npm install
npm run check     # type-check
npm run build     # produce dist/worker.js
```

To run it locally you need a `wrangler.dev.toml` (it is gitignored):

```toml
name = "tabora"
main = "dist/worker.js"
compatibility_date = "2024-09-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "tabora-db"
database_id = "local-dev-placeholder"

[vars]
ADMIN_PASSWORD = "devpassword"
SECURE_PATH = "tabora"
FALLBACK = ""
```

Then:

```bash
npx wrangler dev --config wrangler.dev.toml --local --port 8787
```

Open `http://127.0.0.1:8787/tabora/login`.

---

## Project layout

```
src/
├── worker.ts        entry point and router — add new routes here
├── config/          defaults, constants, settings loader, validators
├── storage/         D1 layer, schema, in-isolate cache
├── auth/            JWT sessions, password hashing
├── protocols/       VLESS, Trojan, WebSocket ↔ TCP relay
├── cores/           subscription builders (URI, Clash, Sing-box)
├── users/           subscriber model, quotas, usage accounting
├── handlers/        one module per route
└── assets/          panel, login and subscription pages
```

The build inlines every `src/assets/<page>/{index.html,style.css,script.js}`
into a gzipped base64 blob, bundles the worker with esbuild, and emits a single
`dist/worker.js`.

---

## Guidelines

**Keep the bundle small.** Tabora ships as one file that people paste into the
Cloudflare dashboard. Avoid adding dependencies unless there is no reasonable
alternative — the QR encoder, YAML emitter and SHA-224 implementation are all
hand-written for this reason.

**Type-check before you push.** `npm run check` must pass with no errors.

**Match the existing style.** 4-space indent in TypeScript, single quotes,
semicolons. Comments explain *why*, not *what*.

**Validate all user input.** Anything that reaches settings goes through
`src/config/validators.ts`. Add a validator when you add a setting.

**Never log secrets.** UUIDs, passwords and tokens must not reach `console.log`.

**Test what you change.** At minimum, verify the affected route by hand and
confirm generated configs still parse:

```bash
curl -s -A clash    "http://127.0.0.1:8787/tabora/sub" | python3 -c "import yaml,sys; yaml.safe_load(sys.stdin)"
curl -s -A sing-box "http://127.0.0.1:8787/tabora/sub" | python3 -c "import json,sys; json.load(sys.stdin)"
```

---

## Adding a new client core

1. Create `src/cores/<name>.ts` exporting `build<Name>Config(ctx: BuildContext)`.
2. Reuse the helpers in `src/cores/shared.ts` — `enumerateEndpoints`,
   `renderRemark`, `selectSniHost` — so naming and address selection stay
   consistent across cores.
3. Register the format in `resolveFormat()` in
   `src/handlers/subscription.ts`, including its User-Agent patterns.
4. Document the new `?format=` value in the README.

---

## Commit messages

Short, imperative subject lines. Conventional-commit prefixes are welcome:

```
feat: add Surge subscription format
fix: correct YAML indentation for nested maps
docs: clarify NAT64 setup
refactor: extract usage accounting from user service
```

---

## Pull requests

- One logical change per PR.
- Describe what changed and why; link any related issue.
- Note anything that affects existing deployments (settings shape, routes, DB
  schema) so it can go in the changelog.
- Confirm `npm run check` and `npm run build` both succeed.

---

## Reporting bugs

Open an issue using the bug report template. Include your deployment type
(Workers or Pages), the client and version you used, and the relevant part of
`wrangler tail` output — with UUIDs and passwords redacted.

---

## Security issues

**Do not open a public issue.** See [SECURITY.md](./SECURITY.md).

---

## Licence

By contributing you agree that your work is licensed under GPL-3.0, the same
licence as the project.
