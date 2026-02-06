# Saiko Maps — Complete Design Handoff for Cursor

## Overview

This document contains all approved designs, specs, and HTML mockups for the Saiko Maps v2 redesign.

**Design Philosophy:**
> Saiko Maps should feel like a well-designed object—confident, quiet, precise, with room for moments of personality. Ease through precision. Southern California sensibility + Japanese craftsmanship.

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Global Header & Footer](#2-global-header--footer)
3. [Map View Title Card](#3-map-view-title-card)
4. [Merchant Page](#4-merchant-page)
5. [Sharing (Instagram + Open Graph)](#5-sharing)
6. [Component Checklist](#6-component-checklist)

---

## 1. Design System

### Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#FFFFFF` | Primary surface |
| Background Alt | `#FAFAF9` | Secondary surface, cards |
| Text Primary | `#1A1A1A` | Headlines, body |
| Text Secondary | `#6B6B6B` | Descriptions, metadata |
| Text Tertiary | `#9A9A9A` | Captions, timestamps |
| Accent (Coral) | `#E07A5F` | Highlights, borders, CTAs |
| Border | `#E5E5E5` | Card borders, dividers |
| Border Subtle | `#F0F0F0` | Internal dividers |
| Success | `#2D8A4E` | "Open now" status |

### Typography

| Element | Font | Size | Weight | Style |
|---------|------|------|--------|-------|
| Title (Maps/Merchants) | Playfair Display | 28-32px | 400 | Italic |
| Section Header | System Sans | 16px | 600 | Normal |
| Body | System Sans | 14px | 400 | Normal |
| Caption | System Sans | 13px | 400 | Normal |
| Meta | System Sans | 12px | 400 | Normal |
| Label | System Sans | 10-11px | 500-600 | Uppercase, 0.08-0.1em tracking |

**Font Stack:** `'Playfair Display', Georgia, serif` for titles; `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` for everything else.

### Spacing & Shape

| Property | Value |
|----------|-------|
| Border Radius | 2px (sharp, not bubbly) |
| Card Border | 1px solid #E5E5E5 |
| Accent Border | 4px solid #E07A5F (top only) |
| Card Shadow | `0 4px 12px rgba(224, 122, 95, 0.15), 0 2px 4px rgba(0,0,0,0.04)` |
| Button Radius | 2px (square buttons) or 50% (icon buttons) |
| Icon Button Size | 38px |

### Wavy Divider SVG

```html
<svg width="120" height="8" viewBox="0 0 120 8" fill="none">
  <path 
    d="M0 4C10 4 10 1 20 1C30 1 30 7 40 7C50 7 50 1 60 1C70 1 70 7 80 7C90 7 90 1 100 1C110 1 110 4 120 4" 
    stroke="#E07A5F" 
    stroke-width="2"
    stroke-linecap="round"
    fill="none"
  />
</svg>
```

---

## 2. Global Header & Footer

### Header — Logged In

```
┌─────────────────────────────────────────────────────────────────┐
│  SAIKO MAPS                    Create New | Dashboard | Account | Sign Out  │
└─────────────────────────────────────────────────────────────────┘
```

- Logo → `/dashboard`
- Nav items: Create New | Dashboard | Account | Sign Out

### Header — Logged Out

```
┌─────────────────────────────────────────────────────────────────┐
│  SAIKO MAPS                                   Sign In | Create Your Own    │
└─────────────────────────────────────────────────────────────────┘
```

- Logo → homepage
- Nav items: Sign In | Create Your Own

### Header — Map/Merchant View (Immersive)

```
┌─────────────────────────────────────────────────────────────────┐
│  SAIKO MAPS                                                     │
└─────────────────────────────────────────────────────────────────┘
```

- Logo only (destination based on auth state)
- No nav items — minimal chrome, content-focused

### Footer — Map/Merchant View

```
┌─────────────────────────────────────────────────────────────────┐
│                          Saiko Maps                             │
└─────────────────────────────────────────────────────────────────┘
```

- Centered text only, or none

### Footer — All Other Pages

```
┌─────────────────────────────────────────────────────────────────┐
│  Saiko Maps                                              About  │
└─────────────────────────────────────────────────────────────────┘
```

- Wordmark + About link

---

## 3. Map View Title Card

### Approved Design

- **Border:** 4px top coral + coral-tinted shadow (layered effect)
- **Title:** Playfair Display Italic, 28-32px
- **Cover Image:** 80×80px, square with 2px radius, optional
- **Category:** Optional, coral uppercase label
- **Share:** Circular icon buttons (IG + Link)
- **Edit:** Circular icon button, visible to owner only

### Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← 4px coral
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                      [Cover Image]                              │
│                        80×80px                                  │
│                                                                 │
│                   SURF & COFFEE                                 │
│                  (coral, uppercase)                             │
│                                                                 │
│                   Bobby Biarritz                                │
│               (Playfair Display Italic)                         │
│                                                                 │
│    My favorite spots from two weeks in Biarritz.                │
│    Surf, coffee, and everything in between.                     │
│                      (description)                              │
│                                                                 │
│                    ～～～～～～～                                │
│                   (wavy divider)                                │
│                                                                 │
│                  by Demo User                                   │
│                (bold italic name)                               │
│                                                                 │
│           Updated Jan 29, 2026 · 28 locations                   │
│                                                                 │
│                  (IG) (Link) (Edit)                             │
│                   icon buttons                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Share Dropdown (removed, now icon buttons)

Share options are now circular icon buttons:
- Instagram icon → triggers story image download
- Link icon → copies URL to clipboard

**Removed:** Share to X (Twitter)

---

## 4. Merchant Page

### Approved Layout: Split View

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SAIKO MAPS                                                                  │
├────────────────────────────────┬─────────────────────────────────────────────┤
│                                │                                             │
│     [Merchant Photo]           │                                             │
│     (from Google Places)       │                                             │
│                                │              [MAP]                          │
│  ┌──────────────────────────┐  │                                             │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  │         showing this location               │
│  │                          │  │                                             │
│  │  COFFEE · SURF           │  │              (●)                            │
│  │                          │  │           coral pin                         │
│  │  Biarritz Coffee Club    │  │                                             │
│  │  (Playfair Italic)       │  │                                             │
│  │                          │  │                                             │
│  │  Description text...     │  │                                             │
│  │                          │  │                                             │
│  │  ～～～～～～～          │  │                                             │
│  │                          │  │                                             │
│  │  📍 Address              │  │                                             │
│  │  🕐 Hours (expandable)   │  │                                             │
│  │  📞 Phone                │  │                                             │
│  │  🌐 Website              │  │                                             │
│  │  📷 Instagram            │  │                                             │
│  │                          │  │                                             │
│  │  APPEARS ON              │  │                                             │
│  │  [Map 1] [Map 2]         │  │                                             │
│  │                          │  │                                             │
│  │  (IG) (Link)             │  │                                             │
│  │                          │  │                                             │
│  └──────────────────────────┘  │                                             │
│                                │                                             │
├────────────────────────────────┴─────────────────────────────────────────────┤
│                              Saiko Maps                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Content Structure

| Element | Source | Required |
|---------|--------|----------|
| Name | Google Places / User | Yes |
| Category tags | User-added | Optional |
| Description | User-written | Optional |
| Photo | Google Places API | Yes |
| Address | Google Places | Yes |
| Phone | Google Places | Optional |
| Website | Google Places | Optional |
| Hours | Google Places | Optional |
| Social links | User-added | Optional |
| "Appears on" | System | Yes |

### Hours Component

- Show today's hours + "Open/Closed" badge
- Expandable to show full week
- Badge: green background (#2D8A4E), white text, 2px radius

---

## 5. Sharing

### Instagram Story Image (1080×1920)

Generated server-side per merchant.

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         [MERCHANT PHOTO]            │
│         (from Google Places)        │
│              55% height             │
│                                     │
│     gradient overlay at bottom      │
│                                     │
├─────────────────────────────────────┤  ← 3px coral bar
│                                     │
│      COFFEE · SURF                  │
│                                     │
│      Biarritz Coffee Club           │
│      (Playfair Italic, 48px)        │
│                                     │
│      The best flat white in         │
│      Biarritz...                    │
│                                     │
│      📍 12 Rue du Port Vieux        │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  SAIKO MAPS    saikomaps.com/pl...  │
│                                     │
└─────────────────────────────────────┘
```

### Open Graph Image (1200×630)

Generated server-side per merchant.

```
┌──────────────────────────────────────────────────────────────┐
│                          │░░░│                                │
│                          │░░░│  COFFEE · SURF                 │
│     [MERCHANT PHOTO]     │░░░│                                │
│                          │░░░│  Biarritz Coffee Club          │
│        45% width         │ 4 │  (Playfair Italic)             │
│                          │ px│                                │
│                          │   │  The best flat white in        │
│                          │   │  Biarritz...                   │
│                          │   │                                │
│                          │   │  📍 Biarritz, France           │
│                          │   │                                │
│                          │   │  SAIKO MAPS                    │
└──────────────────────────────────────────────────────────────┘
```

### Open Graph Meta Tags

```html
<meta property="og:title" content="Biarritz Coffee Club" />
<meta property="og:description" content="The best flat white in Biarritz. Tiny spot run by two Aussie expats." />
<meta property="og:image" content="https://saikomaps.com/og/place/biarritz-coffee-club.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://saikomaps.com/place/biarritz-coffee-club" />
<meta property="og:type" content="place" />
<meta property="og:site_name" content="Saiko Maps" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Biarritz Coffee Club — Saiko Maps" />
<meta name="twitter:description" content="The best flat white in Biarritz." />
<meta name="twitter:image" content="https://saikomaps.com/og/place/biarritz-coffee-club.png" />
```

### Share Flow

**Instagram:**
1. User taps IG icon
2. Server generates 1080×1920 PNG
3. Image downloads to device
4. Deep link to IG app (mobile): `instagram://story-camera`
5. Show toast/modal with instructions to add Link Sticker

**Copy Link:**
1. User taps link icon
2. URL copied to clipboard
3. Show toast: "Link copied to clipboard"
4. When pasted elsewhere, OG tags create rich preview

---

## 6. Component Checklist

| Component | Status | Notes |
|-----------|--------|-------|
| Design System (colors, type) | ✅ Approved | |
| Global Header (logged in) | ✅ Approved | |
| Global Header (logged out) | ✅ Approved | |
| Map View Header (immersive) | ✅ Approved | Logo only |
| Map View Title Card | ✅ Approved | Playfair Italic, 4px coral top, layered shadow |
| Map View Footer | ✅ Approved | Minimal or none |
| Merchant Page (split view) | ✅ Approved | Left: info card, Right: map |
| Share Buttons | ✅ Approved | Circular icons (IG, Link, Edit) |
| Instagram Story Image | ✅ Approved | 1080×1920, server-generated |
| Open Graph Image | ✅ Approved | 1200×630, server-generated |
| Open Graph Meta Tags | ✅ Approved | Per merchant page |
| Wavy Divider | ✅ Approved | SVG, coral stroke |
| Hours Component | ✅ Approved | Expandable, status badge |

---

## Appendix: What Was Removed

| Item | Reason |
|------|--------|
| Share to X (Twitter) | Not needed |
| "Create Your Own" footer CTA | Cleaner map view |
| Full nav on map/merchant pages | Immersive experience |
| Cream/tan backgrounds | Too soft, now white |
| Large border radius (12-16px) | Too bubbly, now 2px |
| Text buttons in title card | Replaced with icon buttons |
