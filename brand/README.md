# Tabora — brand mark

## The mark

A circular seal: a chrome **T** cut through a purple neon ring, circuit
traces on a dark disc, the word **TABORA** under the letter. This is a
raster seal — the artwork the operator supplied — not a reconstructed SVG.

## Colour

| Token | Value |
|---|---|
| neon | `#c084fc` / `#a855f7` |
| chrome | `#e5e7eb` → `#94a3b8` |
| disc | `#050814` |

## Files

| File | Use |
|---|---|
| `logo.webp` | master seal, 1024² |
| `logo.png` | 256² PNG preview |
| `logo-dark.webp` / `logo-light.webp` | 640² on the dark disc |
| `icon-16/32/64/128.png` | favicon / small UI |
| `icon-256/512/1024.webp` | large icon set |
| `social-card.jpg` | 1200×630 |

Embedded copies used by the worker live in `src/assets/shared/`
(`logo-badge.webp`, `logo-mark.webp`, `favicon.png`) and are inlined as
data URIs at build time.

## Clear space

Keep the circular ring intact. Do not crop into the T, recolour the neon,
or place the seal on a busy mid-tone background.
