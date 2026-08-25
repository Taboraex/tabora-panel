# Security Policy

## Supported versions

Only the latest release receives security fixes. Please upgrade before
reporting an issue.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅        |

---

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's private reporting instead:

1. Go to the [Security tab](https://github.com/Taboraex/tabora-panel/security/advisories)
2. Click **Report a vulnerability**
3. Describe the issue, how to reproduce it, and the impact you expect

You should get an initial response within a few days. Once a fix is ready it
will be released and the advisory published with credit to you, unless you
prefer to stay anonymous.

---

## Scope

In scope:

- Authentication or session bypass
- Leaking UUIDs, passwords, tokens or other users' data
- Injection in the panel or in generated subscription configs
- Privilege escalation between subscribers
- Anything that exposes the panel from outside the secret path

Out of scope:

- Cloudflare platform limits (request caps, CPU limits, no UDP support)
- Blocking or throttling by a network operator or ISP
- Weak configuration chosen by the operator (default password, short secret
  path) — the dashboard already warns about these
- Denial of service through ordinary traffic volume

---

## Hardening your deployment

Tabora protects the panel with several layers. Please use all of them.

**Change the default password immediately.** The dashboard shows a warning
until you do. Prefer a secret over a plaintext var:

```bash
npx wrangler secret put ADMIN_PASSWORD
```

**Use a long, random secret path.** It is the first line of defence — any
request outside it only ever sees the decoy page.

```toml
SECURE_PATH = "k7f2m9x4qw8vz1"
```

**Keep credentials out of Git.** `wrangler.toml` is committed. Put real values
in Wrangler secrets or in `.dev.vars`, which is gitignored.

**Rotate credentials if you suspect exposure.** Changing the panel password
rotates the JWT signing secret and invalidates every active session.
Regenerating the UUID and Trojan password invalidates all existing client
configs, so redistribute subscription links afterwards.

---

## How Tabora protects itself

| Measure | Implementation |
| --- | --- |
| Password storage | Salted, 10,000 iterations of SHA-256 |
| Sessions | JWT (HS256), HttpOnly + Secure + SameSite=Strict, 24h expiry |
| Session revocation | Password change rotates the server-side signing secret |
| Timing attacks | Constant-time comparison on password verification |
| Panel discovery | Everything outside the secret path returns the decoy page |
| Decoy proxy | Strips upstream `Set-Cookie` and CSP headers |
| Static fingerprinting | Protocol names assembled at runtime, never literals |
| Input validation | 16 validators run on every settings write |
| Log hygiene | Secrets are never written to `console.log` |

---

## A note on threat model

Tabora is a censorship-circumvention tool. It aims to keep the panel hidden and
your credentials safe. It **cannot** make you anonymous, and it cannot protect
you from an adversary who controls your device or your Cloudflare account.

Cloudflare can see your account and worker activity. Choose your deployment and
your threat model accordingly.
