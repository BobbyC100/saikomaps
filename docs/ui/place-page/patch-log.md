# Place Page — UI Patch Log

## Convention

Every visual tweak to the Place Page gets a **patch ID** in the commit message.

**Format:** `PP-NNN: short description`

Example commit: `PP-001: increase title size, tighten section gap`

Patches that only change CSS custom properties (tokens) are low-risk.
Patches that change layout structure or JSX are higher-risk and should be tested.

---

## Token Reference

All patchable values live in CSS custom properties at the top of `place.css`
inside the `#place-page` scope. Changing a token value is a one-line edit.

| Token | Default | Controls |
|---|---|---|
| `--pp-color-text` | `#36454F` | Primary text color everywhere |
| `--pp-color-link` | `#8B7355` | Links, accents, expand buttons |
| `--pp-color-accent` | `#C3B091` | Bullet dots, decorative elements |
| `--pp-color-rule` | `rgba(0,0,0,0.08)` | Section dividers, borders |
| `--pp-color-quote-border` | `rgba(195,176,145,0.3)` | Pull quote left border |
| `--pp-font-title` | `clamp(2rem,4.5vw,2.6rem)` | Place name H1 |
| `--pp-font-body` | `15px` | About module paragraph |
| `--pp-font-small` | `13px` | Lists, location module, sign strip |
| `--pp-font-micro` | `12px` | Ledger entries, section headers |
| `--pp-font-nano` | `11px` | Dates, citations, source labels |
| `--pp-font-pico` | `10px` | About source label |
| `--pp-font-quote` | `14px` | Pull quote text |
| `--pp-font-serif` | `'Libre Baskerville', Georgia, serif` | Pull quote family |
| `--pp-lh-body` | `1.65` | About module line height |
| `--pp-lh-list` | `1.6` | Lists, tips, offerings |
| `--pp-lh-tight` | `1.2` | Title line height |
| `--pp-rule-weight` | `3px` | Major section dividers |
| `--pp-rule-weight-light` | `1px` | Sidebar border, subtle dividers |
| `--pp-section-gap` | `2em` | Vertical space between sections |
| `--pp-section-pad` | `1.5em` | Padding inside section tops |
| `--pp-grid-gap` | `24px` | Page canvas column gap |
| `--pp-sidebar-gap` | `32px` | Gap between content + sidebar |
| `--pp-sidebar-pad` | `24px` | Left padding inside sidebar |
| `--pp-canvas-max` | `1280px` | Max page width |
| `--pp-canvas-pad-x` | `32px` | Horizontal padding (desktop) |
| `--pp-canvas-pad-x-mob` | `20px` | Horizontal padding (mobile) |
| `--pp-content-ratio` | `7fr` | Left column proportion |
| `--pp-sidebar-ratio` | `5fr` | Right column proportion |
| `--pp-l1-size` | `13px` | Section header font size |
| `--pp-l1-weight` | `600` | Section header weight |
| `--pp-l1-spacing` | `0.08em` | Section header letter-spacing |
| `--pp-l1-opacity` | `0.65` | Section header opacity |
| `--pp-l2-size` | `14px` | Subsection header font size |
| `--pp-l2-weight` | `500` | Subsection header weight |
| `--pp-l2-opacity` | `0.9` | Subsection header opacity |

---

## Patch Log

### PP-000: Initial token system

**Date:** 2026-03-04
**Author:** Cursor
**Scope:** CSS tokens + refactor
**Risk:** Low (no layout changes)

Extracted 35+ hardcoded values into CSS custom properties scoped to `#place-page`.
Refactored `place.css` to reference tokens. All visual output unchanged.

---

<!-- Next patch goes here. Copy this template:

### PP-NNN: title

**Date:** YYYY-MM-DD
**Author:**
**Scope:** tokens-only | layout | JSX
**Risk:** Low | Medium | High

Description of what changed and why.

**Tokens changed:**
- `--pp-token-name`: old → new

-->

### PP-001: Add hero-gap token

**Date:** 2026-03-04
**Scope:** tokens-only
**Risk:** Low

Dedicated spacing token between hero and top grid, decoupled from `--pp-section-gap`.

**Tokens changed:**
- `--pp-hero-gap`: (new) `36px`
- `#top-section margin-top`: `var(--pp-section-gap)` → `var(--pp-hero-gap)`
