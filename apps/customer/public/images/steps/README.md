# How-it-works step illustrations

Drop art into this folder, named exactly as listed below, and the
"Book without the phone-tag" section on the home page and service detail
pages picks it up automatically. Until a file exists, the step slot shows a
tinted square with the step number — a designed fallback.

No `pnpm sync:images` needed — steps stay customer-app-only.

## Expected files

| # | Filename | Spec | Used in step |
|---:|---|---|---|
| 1 | `step-1.webp` | 480×480 px square, ≤ 40 KB | 1 · Choose a service |
| 2 | `step-2.webp` | 480×480 px square, ≤ 40 KB | 2 · Pick a time |
| 3 | `step-3.webp` | 480×480 px square, ≤ 40 KB | 3 · We match your pro |

Style: same illustration language as the category badges (same palette, same
rendering style), one clear focal object per step, consistent stroke/lighting
across all three. No text in the image — the app overlays labels itself.

Full spec: `docs/design-asset-guide.md` §3f.
