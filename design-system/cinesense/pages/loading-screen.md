# Loading Screen Page Overrides

> **PROJECT:** CineSense
> **Generated:** 2026-10-26 14:25:25
> **Page Type:** Empty State

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content
- **Sections:** Hero (Name/Role) > Project Grid (Masonry) > About/Philosophy > Contact

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Neutral background (let work shine). Text: Black/White. Accent: Minimal.

### Component Overrides

- Avoid: Apply one timing threshold to every operation or leave long waits unexplained
- Avoid: Load everything upfront
- Avoid: Leave UI frozen with no feedback

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Small hover (50-100ms), loading spinners, success/error state anim, gesture-triggered (swipe/pinch), haptic
- Feedback: Follow platform and component guidance; preserve layout focus and accessible busy status
- Performance: Lazy load below-fold images and content
- Animation: Use skeleton screens or spinners
- CTA Placement: Project Card Hover + Footer Contact
