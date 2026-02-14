# Saiko Maps — Global Header + Persistent Search V1

**Status:** Locked for Implementation  
**Date:** February 10, 2026

---

## Purpose

The Global Header + Persistent Search is the core "see more" mechanism for V1.  
Saiko is shared-link-first: users arrive on a Map or Place, then decide whether to explore more or create.

---

## 1. Header Visibility Rules (LOCKED)

### Page Context → Header Behavior

| Page Type | Search UI |
|-----------|-----------|
| Homepage | Full search bar visible |
| Search Results | Full search bar visible |
| Map View | Search icon → expand inline |
| Merchant Page | Search icon → expand inline |

- Homepage/Search = discovery-first
- Map/Merchant = immersive-first
- This split is intentional and final

---

## 2. Search Interaction Pattern (V1)

### Behavior
- User types → presses Enter
- Navigates to `/search?q=...`

### Implementation
- Search inputs wrapped in `<form method="GET" action="/search">`
- Input uses `name="q"`
- No live suggestions required for V1

### Rationale
- Fast to ship
- Predictable
- Upgradeable later (dropdown suggestions = V2)

---

## 3. Immersive Pages — Expanded Search State

### Default (Map / Merchant)
- Logo visible
- Search icon visible
- Share icon visible
- Minimal chrome

### Expanded Search
- Search bar expands inline
- Header chrome hides except:
  - Share icon remains reachable
- Close via:
  - X button
  - Escape key

### Notes
- Expanded search is a mode
- Share remains accessible at all times

---

## 4. Header Actions & Copy (LOCKED)

### CTA Language
- Primary CTA: **Create** (locked)
- Do NOT change to "Start a Map" or "New Map"

### Logged Out
- Actions: **Create** + **Sign In**

### Logged In
- Actions: **Create** + Profile icon (dashboard access)

---

## 5. Branding Rules (LOCKED)

- Header logo text is always: **"Saiko Maps"**
- No shortened "Saiko" variant in header

---

## 6. Design Constraints

- Expanded search bar should have a max width (e.g. ~720px) to avoid overexpansion on large screens
- Field Notes palette stays as-is
- Header height stays compact (~56px)

---

## 7. Accessibility & Semantics (REQUIRED)

- Search input:
  - `type="search"`
  - `name="q"`
  - Explicit `aria-label`
- Expanded search container uses appropriate `role="search"`
- No autofocus attribute
- Focus handled via JS on expand

---

## 8. Explicit Non-Goals (V1)

- No live search suggestions
- No related maps / recommendations
- No Explore page dependency
- No Collections concept in header

Persistent search is the only "see more" mechanism for V1.

---

## One-Line Summary

Implement a global header where Homepage/Search show a full search bar, Map/Merchant pages show a collapsed search icon that expands inline, Enter navigates to /search?q=, Share remains reachable at all times, CTA copy stays "Create," and branding is always "Saiko Maps."
