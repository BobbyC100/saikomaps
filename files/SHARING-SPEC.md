# Saiko Maps — Sharing Spec

## Overview

Two sharing methods for merchant pages:
1. **Share to Instagram** — Generates a downloadable Story image + attempts deep link to IG app
2. **Copy Link** — Copies URL; Open Graph tags ensure beautiful previews everywhere

---

## 1. Instagram Story Image

### Specs

| Property | Value |
|----------|-------|
| Dimensions | 1080 × 1920px (9:16 aspect ratio) |
| Format | PNG |
| Generation | Server-side (on-demand or cached) |

### Layout

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
├─────────────────────────────────────┤  ← 3px coral accent bar
│                                     │
│      COFFEE · SURF                  │  ← category (coral, uppercase)
│                                     │
│      Biarritz Coffee Club           │  ← title (Playfair Italic)
│                                     │
│      The best flat white in         │  ← description (gray)
│      Biarritz. Tiny spot run        │
│      by two Aussie expats.          │
│                                     │
│      📍 12 Rue du Port Vieux        │  ← location (light gray)
│                                     │
│  ─────────────────────────────────  │  ← thin divider
│                                     │
│  SAIKO MAPS    saikomaps.com/pl...  │  ← branding + URL
│                                     │
└─────────────────────────────────────┘
```

### Design Details

| Element | Style |
|---------|-------|
| Photo | Top 55%, full bleed, gradient overlay at bottom |
| Coral bar | 3px solid #E07A5F, full width |
| Category | 10px, weight 600, #E07A5F, uppercase, 0.12em tracking |
| Title | 48px, Playfair Display Italic, #1A1A1A |
| Description | 24px, weight 400, #6B6B6B, line-height 1.5 |
| Location | 20px, #9A9A9A, with pin icon |
| Divider | 1px solid #F0F0F0 |
| Branding | "SAIKO MAPS" left, URL right |
| Background | #FFFFFF |
| Padding | 48px horizontal, 40px vertical (content area) |

### URL Display

The URL should be visible on the image so users know what to paste in the Link Sticker:
- Format: `saikomaps.com/place/[slug]`
- Truncate if needed with ellipsis
- Color: #E07A5F
- Weight: 500

---

## 2. Share Flow (Instagram)

### Mobile Web (iOS/Android)

```
1. User taps "Share to Instagram" button
2. Client requests story image from server
3. Server generates 1080×1920 PNG (or returns cached)
4. Image downloads to user's device
5. Attempt deep link: instagram://story-camera
6. If IG opens: show toast "Select your downloaded image, then add a Link Sticker"
7. If IG doesn't open: show modal with instructions
```

### Desktop Web

```
1. User clicks "Share to Instagram" button
2. Client requests story image from server
3. Image downloads to user's device
4. Show modal:
   - "Image downloaded!"
   - "Open Instagram on your phone"
   - "Upload to your Story"
   - "Add a Link Sticker with: [URL shown, copy button]"
```

### Deep Link Attempt (Mobile)

```javascript
// Try to open Instagram
const instagramUrl = 'instagram://story-camera';

// Check if we can open it
if (navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
  window.location.href = instagramUrl;
  
  // Fallback after timeout (if IG didn't open)
  setTimeout(() => {
    // Show instructions modal
  }, 2500);
}
```

---

## 3. Open Graph Tags

### Meta Tags (per merchant page)

```html
<!-- Primary OG Tags -->
<meta property="og:title" content="Biarritz Coffee Club" />
<meta property="og:description" content="The best flat white in Biarritz. Tiny spot run by two Aussie expats who know their coffee." />
<meta property="og:image" content="https://saikomaps.com/og/place/biarritz-coffee-club.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://saikomaps.com/place/biarritz-coffee-club" />
<meta property="og:type" content="place" />
<meta property="og:site_name" content="Saiko Maps" />

<!-- Optional: Location data -->
<meta property="place:location:latitude" content="43.4832" />
<meta property="place:location:longitude" content="-1.5586" />

<!-- Twitter Card (fallback) -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Biarritz Coffee Club — Saiko Maps" />
<meta name="twitter:description" content="The best flat white in Biarritz." />
<meta name="twitter:image" content="https://saikomaps.com/og/place/biarritz-coffee-club.png" />
```

### OG Image Specs

| Property | Value |
|----------|-------|
| Dimensions | 1200 × 630px (1.91:1 aspect ratio) |
| Format | PNG or JPG |
| Generation | Server-side (on-demand, cached) |

### OG Image Layout

```
┌──────────────────────────────────────────────────────────────┐
│                          │░░░│                                │
│                          │░░░│  COFFEE · SURF                 │
│     [MERCHANT PHOTO]     │░░░│                                │
│                          │░░░│  Biarritz Coffee Club          │
│        45% width         │ 4 │                                │
│                          │ px│  The best flat white in        │
│                          │   │  Biarritz. Tiny spot run by    │
│                          │   │  two Aussie expats.            │
│                          │   │                                │
│                          │   │  📍 Biarritz, France           │
│                          │   │                                │
│                          │   │  SAIKO MAPS                    │
└──────────────────────────────────────────────────────────────┘
                            ↑
                     4px coral border
```

### OG Image Design Details

| Element | Style |
|---------|-------|
| Photo | Left 45%, full height, from Google Places |
| Coral border | 4px solid #E07A5F, between photo and info |
| Info panel | Right 55%, white background, 40px padding |
| Category | 12px, weight 600, #E07A5F, uppercase |
| Title | 36px, Playfair Display Italic, #1A1A1A |
| Description | 16px, #6B6B6B, line-height 1.4, max 2 lines |
| Location | 14px, #9A9A9A, city/country only |
| Branding | "SAIKO MAPS" bottom, 12px, weight 600 |

---

## 4. Server-Side Image Generation

### Endpoint

```
GET /api/share/story/:slug
GET /api/share/og/:slug
```

### Implementation Options

1. **Node.js + Canvas** (node-canvas)
2. **Puppeteer** (screenshot a rendered HTML template)
3. **Sharp + SVG** (compose layers)
4. **Vercel OG** (@vercel/og) — recommended if on Vercel

### Caching

- Cache generated images by merchant slug
- Invalidate when merchant data changes
- Store in CDN (Cloudflare, Vercel Edge, etc.)

### Example (Vercel OG)

```typescript
// app/api/og/place/[slug]/route.tsx
import { ImageResponse } from '@vercel/og';

export async function GET(request: Request, { params }) {
  const merchant = await getMerchant(params.slug);
  
  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        width: '1200px',
        height: '630px',
        backgroundColor: '#FFFFFF',
      }}>
        {/* Photo */}
        <img
          src={merchant.photoUrl}
          style={{ width: '45%', height: '100%', objectFit: 'cover' }}
        />
        {/* Coral border */}
        <div style={{ width: '4px', backgroundColor: '#E07A5F' }} />
        {/* Info panel */}
        <div style={{ flex: 1, padding: '40px' }}>
          {/* ... */}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

---

## 5. UI Components

### Share Button (in Title Card / Merchant Page)

Two circular icon buttons:
1. **Instagram** — coral icon, triggers story image download + deep link
2. **Link** — coral icon, copies URL to clipboard + shows toast

### Instagram Share Modal (Desktop)

```
┌─────────────────────────────────────────────┐
│                                             │
│         📱 Share to Instagram               │
│                                             │
│    Your image has been downloaded!          │
│                                             │
│    1. Open Instagram on your phone          │
│    2. Create a new Story                    │
│    3. Select the downloaded image           │
│    4. Add a Link Sticker with this URL:     │
│                                             │
│    ┌─────────────────────────────────────┐  │
│    │ saikomaps.com/place/biarritz-co... │  │
│    │                            [Copy]  │  │
│    └─────────────────────────────────────┘  │
│                                             │
│                              [Done]         │
│                                             │
└─────────────────────────────────────────────┘
```

### Copy Link Toast

```
┌──────────────────────────────────┐
│  ✓ Link copied to clipboard      │
└──────────────────────────────────┘
```

---

## 6. Summary

| Feature | Format | Size | Generation |
|---------|--------|------|------------|
| Story Image | PNG | 1080 × 1920 | Server-side |
| OG Image | PNG/JPG | 1200 × 630 | Server-side |
| Deep Link | URL scheme | — | Client-side (mobile) |
| OG Tags | HTML meta | — | SSR per page |

---

## 7. Platforms Supported

| Platform | Method | Preview |
|----------|--------|---------|
| Instagram Story | Download image + Link Sticker | Story image |
| iMessage | Paste URL | OG card |
| WhatsApp | Paste URL | OG card |
| Slack | Paste URL | OG card |
| Discord | Paste URL | OG card |
| Twitter/X | Paste URL | Twitter card |
| LinkedIn | Paste URL | OG card |
| Facebook | Paste URL | OG card |
