# Service images

Drop one SVG per category here, named exactly `<category-slug>.svg`.
The app picks them up automatically; any missing file falls back to the
striped placeholder, so add them in any order.

Current category slugs (from the live catalog):

| File to add | Category |
|---|---|
| `cleaning.svg` | Home cleaning |
| `plumbing.svg` | Plumbing |
| `electrical.svg` | Electrical |
| `gardening.svg` | Gardening |
| `appliance-repair.svg` | Appliance repair |
| `handyman.svg` | Handyman |
| `carpentry.svg` | Carpentry |
| `painting.svg` | Painting & decor |
| `locksmith.svg` | Locksmith |
| `pest-control.svg` | Pest Control |
| `heating-gas.svg` | Heating & Gas |
| `air-conditioning.svg` | Air Conditioning |
| `roofing.svg` | Roofing |
| `moving-services.svg` | Moving Services |

Optional extra: `all-services.svg` for the "All Services" browse tile.

Guidelines: landscape-ish artwork works best (tiles crop with object-cover,
tallest tile is ~2:1). Keep files self-contained (no external references —
they're served as plain <img> sources). PNG/JPG also work if you change the
extension in packages/ui/src/service-image.tsx, but SVG is the convention.
