# Subcategory icons

Drop one icon per subcategory into this folder, named `subs/<sub-slug>.webp`,
and every subcategory slot in the app picks it up automatically — "Browse by
type" grids, subcategory page heroes, sibling tiles, the sticky sub-header, and
service cards that inherit their subcategory's icon.

Until a file exists the slot renders the subcategory's current lucide glyph —
identical to today, never a broken image — so you can deliver in any order.

## Spec

- Square, 512 × 512 px, ≤ 20 KB (webp, quality ~70).
- **Transparent background** — the app renders each icon on its own tinted
  tile (category colour at ~10% opacity).
- Same illustration language as the category badge icons
  (`images/services/<slug>.webp`): palette `#1F3A4D` navy / `#C1622E`
  terracotta / `#6B8F6B` sage / `#D9A441` amber.
- One clear subject, centred, **~15% padding** — icons render at 16–64 px, so
  keep shapes bold and legible at small sizes.
- No text in the image.

After adding files, run `pnpm sync:images` to fan them out to the provider and
admin apps.

## The 48 slugs

| Slug | Subcategory |
|---|---|
| `home-cleaning` | Home Cleaning |
| `kitchen-cleaning` | Kitchen Cleaning |
| `bathroom-cleaning` | Bathroom Cleaning |
| `carpet-upholstery` | Carpet & Upholstery |
| `window-cleaning` | Window Cleaning |
| `plumbing-repairs` | Repairs |
| `plumbing-installations` | Installations |
| `emergency-plumbing` | Emergency Plumbing |
| `electrical-repairs` | Repairs |
| `electrical-installations` | Installations |
| `electrical-testing` | Testing & Certification |
| `furniture-assembly` | Furniture Assembly |
| `wall-mounting` | Wall Mounting |
| `general-handyman` | General Repairs |
| `interior-painting` | Interior Painting |
| `exterior-painting` | Exterior Painting |
| `carpentry-furniture` | Custom Furniture |
| `carpentry-doors` | Doors |
| `carpentry-flooring` | Flooring |
| `garden-maintenance` | Garden Maintenance |
| `landscaping` | Landscaping |
| `trees` | Tree Surgery |
| `rats-mice` | Rats & Mice |
| `wasps` | Wasps |
| `ants` | Ants |
| `cockroaches` | Cockroaches |
| `bed-bugs` | Bed Bugs |
| `fleas` | Fleas |
| `birds` | Birds |
| `appliance-repair` | Repair |
| `appliance-installation` | Installation |
| `boiler` | Boiler Services |
| `heating-services` | Central Heating |
| `gas-services` | Gas Safety |
| `ac-installation` | Installation |
| `ac-repair` | Repair |
| `ac-servicing` | Servicing |
| `ac-gas-recharge` | Gas Recharge |
| `roof-repair` | Roof Repair |
| `roof-replacement` | Roof Replacement |
| `chimney-gutter` | Chimney & Guttering |
| `lockout-service` | Lockout Service |
| `lock-replacement` | Lock Replacement |
| `door-repair-locksmith` | Door Repair |
| `security-upgrade` | Security Upgrade |
| `house-move` | House Move |
| `packing-services` | Packing |
| `man-van` | Man & Van |
