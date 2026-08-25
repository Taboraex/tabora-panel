# Tabora — brand mark

## The mark

A point-top hexagon containing a second, smaller hexagon joined by three spokes.
The construction reads two ways on purpose:

- **An isometric cube** — the panel is infrastructure, something built and solid.
- **A network node graph** — three luminous vertices are the relay endpoints the
  proxy actually hops through.

A bold **T** sits in the centre face. The mark deliberately avoids the
shield-and-padlock cliché that every other proxy project uses.

## Geometry

Nothing is eyeballed. The outer hexagon is computed as
`(256 + 190·cos(60i − 90°), 256 + 190·sin(60i − 90°))` for `i = 0…5`;
the inner face uses radius `190 × 0.60`. Nodes sit on alternating outer
vertices at r = 27. This is why the mark stays symmetrical at every size.

## Colour

| Token | Value |
|---|---|
| `--accent` | `#38bdf8` |
| `--accent-2` | `#6366f1` |
| gradient | `linear-gradient(120deg, #38bdf8, #6366f1)` |
| dark bg | `#070b14` |
| light bg | `#f4f7fb` |

Every shape is filled with the brand gradient — there are **no hardcoded
background fills**, so the mark works unchanged on the dark and light themes.

## Files

| File | Use |
|---|---|
| `icon.svg` | master mark, vector, infinitely scalable |
| `logo.svg` | horizontal lockup, mark + wordmark |
| `icon-1024/512/256/128/64/32/16.png` | transparent PNG icon set |
| `logo.png` | lockup, transparent |
| `logo-dark.png` / `logo-light.png` | lockup on each theme surface |
| `social-card.png` | 1200×630 OG / social preview |

`icon-16.png` and `icon-32.png` are the favicon sizes; the mark was tuned so the
T survives at 16 px.

## Clear space & minimum size

Keep clear space of at least half the mark's width on all sides. Minimum size is
16 px for the icon and 120 px wide for the lockup. Do not recolour, rotate,
add effects, or place the gradient mark on a mid-tone background.
