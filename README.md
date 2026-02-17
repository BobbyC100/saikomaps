# Saiko Maps

**Create something worth giving to someone else.**

Saiko Maps is a lightweight creative tool for making cool, personal maps — fast. Curated templates that are more visual, playful, and expressive than traditional mapping tools. Built for people who care about aesthetics but don't want to spend hours designing.

---

## What It Is

A location-sharing app where every map looks like it belongs in a magazine, not a spreadsheet. Users pick a template, drop their favorite spots, add a personal take, and share it. The result is an editorial-style map experience — think Eater guides meets personal travel journals.

Maps live at shareable URLs. Each place gets its own merchant profile page with photos, hours, editorial context, and curator notes. Share cards let users push maps to Instagram Stories, feeds, and messages with template-matched visuals.

## Who It's For

90s kids who want to share places they love — travel memories, local recommendations, personal guides. The friend who always knows the spot.

---

## Templates

Four aesthetic-first templates, each with its own personality, color palette, typography, and share card design.

| Template | Tone | Font | Vibe |
|---|---|---|---|
| **Postcard** | Warm, nostalgic | Nunito | Polaroid vacation snapshots, golden hour, faded coral |
| **Neon** | Bold, nightlife | Bebas Neue | Drive poster energy, Tokyo signage, 2am underground |
| **Field Notes** | Minimal, editorial | Libre Baskerville | Well-kept travel journal, worn leather, quiet confidence |
| **Zine** | DIY, irreverent | Special Elite | Cut-and-paste, punk flyers, record shop staples |

*All template fonts are free via Google Fonts.*

---

## Brand

### Palette

Brand colors used for app chrome and marketing:

| Color | Hex |
|---|---|
| Red | `#D64541` |
| Light Blue | `#89B4C4` |

*Each template carries its own palette — see the Brand Bible for full color specs.*

### Logo

Square divided diagonally with two mirrored circles. Inspired by nautical signal flags — vintage, handmade quality without being literal about maps.

### Voice

Knowledgeable, casual, warm, minimal. Knows what it's talking about, doesn't over-explain, feels like a friend who has good taste. Be direct. Sound like a person, not a brand. Make it feel easy.

---

## Key Surfaces

### Map View

Split-view layout — location cards on the left, interactive map on the right (desktop). Mobile-first toggle between list and map. Template-specific styling applies to pins, cards, popups, and covers.

### Merchant Profile (`/place/[slug]`)

Individual place pages with a three-tier data hierarchy:

- **Tier 1 — Identity + Action:** Hero photo, name, meta row, action trio (Call · Instagram · Directions), photo gallery
- **Tier 2 — Editorial + Context:** Curator's note, coverage quotes, hours
- **Tier 3 — Reference + Discovery:** Styled map tile, coverage links, "Also On" cross-references

*Data degrades gracefully — if a tier has no data, the space collapses. See Merchant Data Hierarchy for the full spec.*

### Share Cards

Optimized for social sharing. The share is a teaser, not the whole map — tapping opens the full map link.

| Format | Ratio | Use |
|---|---|---|
| **Stories (Primary)** | 9:16 | IG Stories, TikTok, Reels |
| **Feed (Secondary)** | 1:1 | IG Feed, Twitter, iMessage |

*Each template has its own share card design — Postcard looks like a vintage postcard, Field Notes like a torn journal page, etc.*

---

## Design Reference Files

| File | What It Contains |
|---|---|
| `saiko-brand-bible-v3.docx` | Full brand guide — palettes, typography, voice, templates, share card specs |
| `saiko-merchant-data-hierarchy.md` | Locked data hierarchy for merchant profiles and all place-data surfaces |
| `cover-concepts.html` | V1 cover card explorations (Field Notes template) |
| `cover-concepts-v2.html` | V2 covers — typography + vitals, bento grid, blueprint constellation, surf map |
| `pin-popup-concepts.html` | V1 pin popup explorations — journal entry, bento card, minimal pill, blueprint |
| `pin-popup-concepts-v2.html` | V2 popups — refined bento + pill, labeled pin style explorations |
| `field-notes-final-concept.html` | Final interactive concept — stacked label pins + bento card popup, light/dark |

---

## Design Principles

- **Aesthetic-first templates** — each template is a complete visual system, not a skin
- **The data tells the story, not the template** — blocks earn their space; sparse pages degrade gracefully
- **Minimal info, maximum personality** — every surface shows only what it needs to
- **Every surface is a subset of the same hierarchy** — map popup, list card, merchant profile, and share card all pull from the same tiered data model, never inverted
- **Lo-fi over high-gloss** — grain, texture, candid moments; imperfection adds character
- **The share is a teaser, not the whole thing** — social cards drive curiosity, not completeness

---

## Development

Built with Cursor AI as the primary development tool, with Claude providing structured specifications and troubleshooting guidance. Session-based authentication with database foreign key relationships for user management.

**All PRs must follow `/docs/PR_TEMPLATE.md`.**

### Password recovery

Forgot-password flow uses Resend for email. Set in `.env.local`:

- `RESEND_API_KEY` — from [Resend](https://resend.com)
- `RESEND_FROM_EMAIL` — sender address (e.g. `Saiko Maps <noreply@yourdomain.com>`)
- `NEXT_PUBLIC_APP_URL` — base URL for reset links (e.g. `https://app.example.com`)

Without `RESEND_API_KEY`, the app still returns success but does not send email (useful for local dev).

---

## Authentication Architecture

### Auth System
- **Provider:** NextAuth v4 with Credentials provider
- **Strategy:** JWT sessions (30-day expiration)
- **Password Hashing:** bcryptjs

### Auth Guards (Centralized)

All authentication logic is centralized in `lib/auth/guards.ts`:

```typescript
import { requireUserId, requireAdmin, requireOwnership } from '@/lib/auth/guards'

// Require any authenticated user
export async function POST(req: NextRequest) {
  const userId = await requireUserId() // Throws 401 if not authed
}

// Require admin user
export async function POST(req: NextRequest) {
  const userId = await requireAdmin() // Throws 403 if not admin
}

// Require resource ownership
export async function PATCH(req: NextRequest) {
  const userId = await requireUserId()
  const resource = await db.findUnique(...)
  await requireOwnership(resource.userId) // Throws 403 if not owner
}
```

### Environment Variables

Required for authentication:
```bash
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

### Admin Access

Admin users are determined by email address in `ADMIN_EMAILS` environment variable.

Protected routes:
- `/admin/*` - Admin panel
- `/api/admin/*` - Admin API endpoints

### Rate Limiting (Upstash)

AI and other sensitive endpoints use Upstash Redis for rate limiting. Set in `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=<your-upstash-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>
```

Without these, development allows requests with a warning; production fails closed.

---

## Public Routes

### Coverage Metrics
- `GET /coverage` - View geographic coverage and data quality metrics
- Public access (no authentication required)
- Moved from `/admin/coverage` in v1.2.0

---

**Saiko Maps · 2026**
