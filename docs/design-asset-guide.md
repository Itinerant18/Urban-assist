# Urban Assist — Design Asset Production Guide

**Audience:** the designer producing images, illustrations, video and other visual assets for the customer app.
**How it works:** the app uses a **drop-a-file convention**. Every visual slot in the app already exists in code with a designed fallback. You produce a file, name it exactly as specified below, drop it into the folder, and the app picks it up automatically — **no developer needed, no code changes**. If a file is missing, the app shows a graceful fallback (the category icon on a tinted tile, or a striped placeholder), so you can deliver assets incrementally in any order.

---

## 1. Where files go

Everything goes into **one folder** in the repo:

```
apps/customer/public/images/services/     ← all category art (icons, cards, banners, before/after)
apps/customer/public/images/steps/        ← how-it-works step illustrations
apps/customer/public/images/people/       ← reviewer/testimonial avatars
apps/customer/public/media/loops/         ← video loops + their poster stills
```

After adding or changing files, a developer (or you, if comfortable) runs `pnpm sync:images` once — this copies the art to the provider and admin apps too. Videos and steps/people stay customer-only.

**Naming rules:** all lowercase, kebab-case (`heating-gas`, not `Heating & Gas`). No spaces, no `&`, no capitals. The name before the suffix must be the exact category slug from §2.

---

## 2. The 14 category slugs

Every category asset is named after its slug:

`cleaning` · `plumbing` · `electrical` · `gardening` · `appliance-repair` · `handyman` · `carpentry` · `painting` · `locksmith` · `pest-control` · `heating-gas` · `air-conditioning` · `roofing` · `moving-services`

---

## 3. Asset classes — what to make

The app uses **one asset class per slot type** (like Urban Company): small icons in icon slots, wide scene art in card/banner slots. Never one image stretched everywhere.

### 3a. Icons — ✅ already done

`<slug>.webp` (+ `.svg` fallback). The current circular badge illustrations. Nothing to produce unless a new category is added. **Keep these as the style anchor** for everything below.

### 3b. Card art — `<slug>-card.webp` ← **highest priority**

Shown as the media header on service cards and grid tiles across the funnel — the images that make people tap.

| Property | Spec |
| --- | --- |
| File name | `cleaning-card.webp`, `plumbing-card.webp`, … (14 files) |
| Ratio / size | **4:3 — 800 × 600 px** |
| Weight | **≤ 60 KB** (webp, quality ~70) |
| Content | A *scene*, not a badge: a professional at work in a UK home, or a styled tool/result flat-lay. Match the style of the existing cleaning & plumbing photos (navy "Urban Assist" uniform, warm UK interior). |
| Composition | Keep the subject inside an **8% safe margin** on all edges — edges may be slightly cropped on some screens. |
| Text | **Never bake text into the image.** The app overlays labels itself. |

### 3c. Banner art — `<slug>-banner.webp`

Wide hero image at the top of category and subcategory pages.

| Property | Spec |
| --- | --- |
| File name | `cleaning-banner.webp`, … (14 files) |
| Ratio / size | **21:9 — 1680 × 720 px** |
| Weight | **≤ 120 KB** (webp, quality ~70) |
| Content | Wide environmental scene (room being worked in, finished result). |
| Composition | **Keep the left third visually calm/clear** — the page overlays the title there on desktop. |

### 3d. Video loops — `media/loops/<slug>-loop.mp4` + poster

Ambient, muted, looping clips for hero slots. The app already has the slots wired — it shows the poster still until the mp4 exists, then plays the video automatically. Ship posters first if video takes longer.

| Property | Spec |
| --- | --- |
| Video file | `cleaning-loop.mp4` — H.264, 720p (1280×720), **10–20 seconds**, seamless loop, **no audio track needed** (it will always play muted) |
| Weight | **≤ 2 MB per clip** — this is a hard budget |
| Poster file | `cleaning-loop-poster.webp` — 1280 × 720, ≤ 50 KB. Use a real frame from the clip (ideally the first frame) so the video start is invisible |
| Content | Slow, calm motion: wiping a surface, water filling, brush strokes. No fast cuts, no camera shake — it loops next to text people are reading |
| Priority order | `cleaning`, `plumbing`, `electrical` first (highest-traffic categories) |

### 3e. Before / After pairs — `<slug>-before.webp` + `<slug>-after.webp`

Powers the interactive drag-comparison slider. **Only for transformation categories:** `cleaning`, `gardening`, `painting`.

| Property | Spec |
| --- | --- |
| Files | `cleaning-before.webp` + `cleaning-after.webp` (pairs) |
| Ratio / size | **4:3 — 800 × 600 px** each, ≤ 60 KB each |
| Critical rule | Both photos must be the **identical framing/angle/lighting** — same room, same camera position. The user drags a divider between them; any shift between the two ruins the effect |

### 3f. How-it-works step illustrations — `steps/step-1.webp`, `step-2.webp`, `step-3.webp`

Three spot illustrations for the "Book without the phone-tag" section (1 Choose a service · 2 Pick a time · 3 We match your pro).

| Property | Spec |
| --- | --- |
| Files | `images/steps/step-1.webp`, `step-2.webp`, `step-3.webp` |
| Ratio / size | Square — 480 × 480 px, ≤ 40 KB each |
| Style | Same illustration language as the category badges (same palette, same rendering style), one clear focal object per step. Consistent stroke/lighting across all three |

### 3g. Reviewer avatars — `people/avatar-01.webp` … `avatar-08.webp`

For testimonials and review lists. Until these exist the app shows tasteful initials circles.

| Property | Spec |
| --- | --- |
| Files | `images/people/avatar-01.webp` through `avatar-08.webp` |
| Size | Square — 256 × 256 px, ≤ 15 KB each |
| Content | Diverse, warm-lit, UK-plausible faces (AI-generated is fine — must NOT be real identifiable people unless licensed), neutral background, genuine relaxed expressions. No stock-photo gloss |

---

## 4. Style guide (must match)

- **Palette:** warm stone background `#F5F1EB` · slate navy `#1F3A4D` · terracotta accent `#C1622E` · sage green `#6B8F6B` · amber `#D9A441`. Photography should sit comfortably on the stone/white surfaces — warm light, no cold blue casts.
- **Brand feel (from the product spec):** premium, warm, trustworthy, **calm**. Never loud: no starbursts, no red urgency, no cluttered compositions.
- **People in photos:** professionals wear the navy "Urban Assist" uniform (see existing cleaning/plumbing card art). Homes look like real UK homes (bay windows, terraced interiors, UK plugs/kettles — details sell it).
- **No text in images. Ever.** Labels, prices and badges are rendered by the app on top.

## 5. Format rules

- **Photographic / painterly art → `.webp`** (quality ~70). Never wrap a raster image inside an SVG — it triples the file size. (If your tool only exports SVG-wrapped rasters, a dev can run `python scripts/export-webp.py` to convert.)
- **True flat vector art → `.svg`** is fine (icons, step illustrations if genuinely vector).
- Weights above are budgets, not suggestions — the app targets fast loads on mobile 4G. If a file lands over budget, re-export at lower quality before delivering.

## 6. Delivery workflow

1. Produce files, named exactly per this guide.
2. Drop them into the folders in §1 (via the repo, or hand the batch to a developer).
3. Dev runs `pnpm sync:images` and refreshes the site — assets appear immediately.
4. Check your work in the app: the category pages (`/services/<slug>`), a subcategory page, and the home page. Every image should look complete (never cropped heads/tools) and load fast.

## 7. Priority order (what to make first)

1. **14 × card art** (`-card.webp`) — biggest visible upgrade, every funnel page uses them.
2. **14 × banner art** (`-banner.webp`) — category/subcategory heroes.
3. **3 × loop posters, then mp4s** for cleaning/plumbing/electrical.
4. **3 × before/after pairs** (cleaning, gardening, painting).
5. **3 × step illustrations + 8 × avatars.**

Total: ~45 images + 3 short videos. Deliver in any order within a tier — everything falls back gracefully until it arrives.
