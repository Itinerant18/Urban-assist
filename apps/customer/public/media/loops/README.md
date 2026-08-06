# Video loops

Ambient, muted, looping clips for the hero slots on category, subcategory and
service pages. The slots are video-ready **today**: drop the poster still and
it renders as a designed still; drop the mp4 too and it plays automatically.
No code changes, ever.

No `pnpm sync:images` needed — loops stay customer-app-only.

## Expected files

| # | Filename | Spec |
|---:|---|---|
| 1 | `cleaning-loop-poster.webp` | 1280×720, ≤ 50 KB, real frame from the clip (ideally first) |
| 2 | `cleaning-loop.mp4` | H.264, 720p, 10–20 s, ≤ 2 MB, muted, seamless loop |
| 3 | `plumbing-loop-poster.webp` | as above |
| 4 | `plumbing-loop.mp4` | as above |
| 5 | `electrical-loop-poster.webp` | as above |
| 6 | `electrical-loop.mp4` | as above |

Priority order: `cleaning`, `plumbing`, `electrical` first (highest-traffic
categories). Additional categories can be added any time — name them
`<slug>-loop-poster.webp` / `<slug>-loop.mp4` and they light up the same
slots.

Content: slow, calm motion — wiping a surface, water filling, brush strokes.
No fast cuts, no camera shake (it loops next to text people are reading).
No audio track needed (always plays muted).

Full spec: `docs/design-asset-guide.md` §3d.
