# Theme & Color Reference: Urban Assist Customer Profile

This document captures the color palette, typography, spacing, shadows, and component designs used in the Customer Profile/Account interface. Use these specifications to maintain visual consistency when building the Service Provider profile.

---

## 1. Color Palette (Tailwind Tokens & CSS Variables)

| Element Name | CSS Variable | Hex Code | Purpose & Usage in Profile |
| :--- | :--- | :--- | :--- |
| **Warm Stone** | `--bg` | `#F5F1EB` | Page background, alternating section bands. |
| **Slate Navy** | `--ink` | `#1F3A4D` | Heading text, section headers, price lists, navigation highlights. |
| **Charcoal** | `--charcoal` | `#2B2B28` | Primary body copy, card labels, text inputs. |
| **Terracotta** | `--accent` | `#C1622E` | Primary CTA buttons ("Save profile", "Upload documents"), focus indicators. |
| **Terracotta Hover** | `--accent-hover`| `#A9531F` | CTA button hover state. |
| **Sage Green** | `--success` | `#6B8F6B` | Verified badges, success markers, confirmation status. |
| **Rust Red** | `--danger` | `#B23A2E` | Error messages, "Delete account" buttons, cancelled status tags. |
| **Amber** | `--amber` | `#D9A441` | Review star ratings, star rating bar chart fills. |
| **Muted Text** | `--muted` | `#6B6A62` | Secondary labels, descriptions, helper text, and timestamps. |
| **Hairline** | `--hairline` | `#ECE6D9` | Card borders, dividers, subtle section separators. |
| **Input Border** | `--input-border` | `#E2DACB` | Text input borders, selection dropdown borders. |
| **White** | (Standard) | `#FFFFFF` | Card backgrounds, profile card panels. |

*Note: The project rules forbid the use of pure black (`#000000`). Charcoal (`#2B2B28`) is the darkest text color, and Slate Navy (`#1F3A4D`) is the darkest brand accent.*

---

## 2. Typography & Fonts

*   **Font Family**: `Inter` (sans-serif) loaded via Google Fonts. Fallback: `system-ui`, `sans-serif`.
*   **Scale for Profile Pages**:
    *   **Page H1 Header**: `font-display text-xl font-bold` (~24px) - Slate Navy.
    *   **Card Section Title**: `font-display text-sm font-semibold` (~14px) - Slate Navy/Charcoal.
    *   **Form Labels**: `text-xs font-medium` (~11-12px) - Muted Text (`#6B6A62`).
    *   **Body Copy / Help Text**: `text-xs` to `text-sm` (12-14px) - Charcoal or Muted Text.
    *   **Badge Text**: `text-[11px] font-medium` - Caps or small text.
    *   **Minimum size**: Never drop below `11px` for any UI typography.

---

## 3. Cards, Shadows, and Spacing

*   **Borders & Radius**:
    *   **Card Corners**: `rounded-[var(--card-radius)]` (defined as `14px` or `xl`).
    *   **Input Fields**: `rounded-xl` (`14px` border radius).
    *   **Pills & Badge Buttons**: `rounded-full` (circle/pill).
    *   **Borders**: `1px` border using `border-hairline` (`#ECE6D9`).
*   **Shadows**:
    *   Cards use a very soft shadow: `box-shadow: 0 4px 14px rgba(31, 58, 77, 0.05)` (represented as `shadow-card`).
    *   Do not use heavy, harsh, or high-contrast drop-shadows.
*   **Touch Targets**:
    *   All interactive elements (buttons, inputs, checkboxes) should have a minimum touch target size of `44px` (class `tap`).

---

## 4. Specific Component Guidelines

### 4.1. Account Cards (`card` class)
Customer cards are rendered as white blocks with a thin border and rounded corners:
```html
<div class="rounded-[14px] border border-[#ECE6D9] bg-white p-5 shadow-card">
  <!-- Content here -->
</div>
```

### 4.2. Form Inputs (Fields & Inputs)
Text inputs are custom-styled with a subtle border and direct focus outline:
- **Default State**: Background `#FFFFFF`, Border `#E2DACB` (`input-border`), padding `10px 14px`.
- **Focus State**: Outline `2px` solid Terracotta (`#C1622E`), border shifts to Slate Navy (`#1F3A4D`).
- **Disabled State**: Muted grey text, disabled cursor, light gray overlay.

### 4.3. Badges (`Badge` component)
Badges use 15% opacity backgrounds of their respective semantic color for readability:
- **Verified / Approved**: Background `rgba(107, 143, 107, 0.15)` (Sage), Text `#6B8F6B`.
- **Pending**: Background `rgba(193, 98, 46, 0.15)` (Terracotta/Accent), Text `#C1622E`.
- **Alert / Rejected**: Background `rgba(178, 58, 46, 0.15)` (Rust Red), Text `#B23A2E`.
