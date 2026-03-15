---
doc_id: UI-SOCIAL-IDENTITY-DESIGN-V1
doc_type: design
status: draft
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: TRACES
systems:
  - place-page
  - social-signals
  - voice-engine
related_docs:
  - docs/architecture/unified-social-signals-v1.md
  - docs/architecture/social-fields-spec-v1.md
  - docs/voice/saiko-voice-layer.md
  - docs/ui/place-page/patch-log.md
  - docs/scenesense/display-contract-v1.md
summary: >-
  Design specification for surfacing unified social signals (Instagram, TikTok,
  YouTube) on the place page — identity block integration, social proof
  surfaces, and editorial rendering via the Voice Layer.
category: product
tags: [ui, social, identity, places]
source: repo
---

# Place Page — Social Identity & Signals Design

## 1. Purpose

Define how unified social signals (from `ARCH-UNIFIED-SOCIAL-V1`) surface on
the place page. This doc covers the data-to-pixel contract: which signals
appear, where they render, and how the Voice Layer translates them into
editorial language.

This is a **design doc**, not a build spec. The page will be updated once
implementation is complete — this doc captures intent and constraints so work
can proceed across sessions.

---

## 2. Current State

### What exists today

| Element | ID | Status |
|---|---|---|
| Place title | `#place-title` | Populated (entity name) |
| Identity subline | `#identity-subline` | `"{neighborhood} {category}"` — populated |
| Signals sentence | `#identity-signals` | `"{open_state} — {energy_phrase}"` — depends on SceneSense |
| Facts band | `#facts-band` | Action links: Directions, Reserve, Call, Website, Instagram, Menu, Wine |
| Description | `#identity-description` | Populated for enriched places |
| Place character | `#place-character` | Atmosphere / Ambiance / Scene rows (SceneSense) |
| Offering signals | `#offering-signals` | **Hardcoded null** — `offeringSignals` not wired in API |
| Rail | `#rail-column` | "Appears on N maps" only |

### What's missing

1. **TikTok link** in facts band — entity field exists, not rendered
2. **YouTube link** in facts band — entity field doesn't exist yet (added in unified schema)
3. **Social proof signals** — no follower counts, posting cadence, engagement indicators
4. **Social momentum** — no trend/velocity signals from social content
5. **Offering signals wiring** — API hardcodes null; `derived_signals` table not plumbed

---

## 3. Design Changes

### 3.1 Facts Band — Social Links

**Current:** Instagram link only (when `location.instagram` is populated).

**Target:** Platform-aware social links for all three platforms.

```
[ Directions ] [ Reserve ] [ Call ] [ Website ] [ IG ] [ TT ] [ YT ] [ Menu ] [ Wine ]
```

Rules:
- Each social link renders only when the entity has a non-null, non-`NONE` handle
- Icon + handle text (truncated if needed)
- Links to canonical profile URL:
  - Instagram: `https://instagram.com/{handle}`
  - TikTok: `https://tiktok.com/@{handle}`
  - YouTube: `https://youtube.com/@{handle}`
- Order: IG before TT before YT (frequency-of-use ordering for restaurants)
- No platform renders if handle is `NONE` (sentinel = confirmed absent)

**Patch scope:** JSX only (low risk). No new tokens needed — inherits `#facts-band` styling.

### 3.2 Identity Subline — Social Activity Signal

**Current:** `"{neighborhood} {category}"` — e.g., "Culver City restaurant"

**Target (v2):** Optionally append a social freshness indicator when social data is available.

```
Culver City restaurant · active on Instagram, TikTok
```

Rules:
- Only surfaces if entity has at least one `social_accounts` row with `source_status = 'active'`
- Platform names rendered in natural language, not handles
- Max 2 platforms shown (pick by most recent `posted_at`)
- Separator: ` · ` (matches existing facet separator in `getIdentitySublineV2`)
- Omit entirely if no social accounts exist — subline falls back to current behavior
- **This is a Voice Layer concern** — implemented in `lib/voice/saiko.ts` or `lib/contracts/place-page.identity.ts`

### 3.3 Rail Column — Social Proof Block

**Current:** Single `.rail-block` showing "Appears on N maps".

**Target:** Add a social proof rail block below the existing one.

```
Record
Appears on 3 maps

Social
142K followers on Instagram
47 videos on TikTok
Last posted 2 days ago
```

Data sources:
- `social_accounts.follower_count` (latest snapshot)
- `social_accounts.media_count`
- `social_content` MAX(`posted_at`) per platform
- Freshness: relative time ("2 days ago", "this week", "last month")

Rules:
- Rail block only renders if at least one social account exists
- Follower counts formatted with K/M suffixes (e.g., "142K", "1.2M")
- Freshness line is singular: most recent post across all platforms
- Label is "Social" (L1 section header, matches existing rail styling)
- No engagement rates or metrics in v1 — keep it human-readable

**Patch scope:** JSX + CSS (medium risk). New `.rail-block` instance, no new tokens.

### 3.4 Offering Signals — Unblock the API

**Not a social signals change**, but blocking the page from showing its full identity.

The API route (`/api/places/[slug]/route.ts`, ~line 268) hardcodes `offeringSignals` to null. This must be wired to `derived_signals` before the page can render:

- Food line (cuisinePosture or fallback cuisineType)
- Wine/Drinks line (wineProgramIntent or servesBeer/servesWine booleans)
- Service line (serviceModel)
- Price line (priceTier or fallback priceLevel)

**Dependency:** Phase 3 of Fields v2 (`derived_signals` wiring). Not part of social signals work, but noted here because it affects identity block completeness.

---

## 4. Voice Layer Extensions

### New VoiceSignals fields

```typescript
interface VoiceSignals {
  // existing
  neighborhood: string | null | undefined;
  category: string | null | undefined;
  atmosphere?: string[] | null | undefined;

  // new — social activity
  activePlatforms?: string[];  // e.g., ['instagram', 'tiktok']
  lastPostedDaysAgo?: number;  // days since most recent post
}
```

### New phrase rendering

| Signal | Condition | Phrase |
|---|---|---|
| `activePlatforms` = ['instagram'] | single platform | "active on Instagram" |
| `activePlatforms` = ['instagram', 'tiktok'] | two platforms | "active on Instagram, TikTok" |
| `activePlatforms` = ['instagram', 'tiktok', 'youtube'] | three platforms | "active on Instagram, TikTok, YouTube" |
| `lastPostedDaysAgo` = 0 | today | "posted today" |
| `lastPostedDaysAgo` = 1 | yesterday | "posted yesterday" |
| `lastPostedDaysAgo` <= 7 | this week | "posted this week" |
| `lastPostedDaysAgo` <= 30 | this month | "active this month" |
| `lastPostedDaysAgo` > 30 | stale | omit — don't surface stale signals |

### Guardrails (per VOICE-SAIKO-VOICE-LAYER)

- No signal invention: only render what `social_accounts` / `social_content` contain
- Deterministic: same inputs always produce same output
- Omit over fabricate: if data is missing, omit the line

---

## 5. Data Contract

### API additions to `/api/places/[slug]`

New fields in the `location` response object:

```typescript
// Added to PlacePageLocation
socialAccounts?: {
  platform: string;        // 'instagram' | 'tiktok' | 'youtube'
  username: string;
  followerCount?: number;
  mediaCount?: number;
  verified?: boolean;
  lastContentAt?: string;  // ISO timestamp of most recent post
}[];
```

Source: `social_accounts` table, filtered by `entity_id`, `source_status = 'active'`.

### Computation (server-side, in route handler)

```
activePlatforms = socialAccounts.map(a => a.platform)
lastPostedDaysAgo = min(socialAccounts.map(a => daysSince(a.lastContentAt)))
```

These are derived in the API route, not stored. Passed to the Voice Layer for rendering.

---

## 6. Patch Plan

All changes tracked via the existing patch log (`docs/ui/place-page/patch-log.md`).

| Patch | Scope | Risk | Description |
|---|---|---|---|
| PP-005 | JSX | Low | Add TikTok + YouTube links to facts band |
| PP-006 | JSX + CSS | Medium | Add social proof rail block |
| PP-007 | JSX | Low | Wire social activity into identity subline via Voice Layer |

These patches depend on:
1. Unified social schema migration (Phase 1 of `ARCH-UNIFIED-SOCIAL-V1`)
2. `youtube` entity field addition
3. At least one social platform ingesting data

PP-005 (social links in facts band) can ship immediately — it only needs entity handle fields, which already exist for Instagram and TikTok.

---

## 7. Design Tokens

No new design tokens required. All social elements inherit existing tokens:

| Element | Inherits from |
|---|---|
| Social links in facts band | `#facts-band a` styling |
| Social proof rail block | `.rail-block` styling |
| Social activity subline text | `#identity-subline` styling |
| Platform names | `--pp-font-small`, `--pp-color-text` |
| Follower counts | `--pp-font-small`, `--pp-l1-opacity` |

If visual tuning is needed post-implementation, new tokens will be added via the standard patch process.

---

## 8. Mobile Considerations

| Breakpoint | Behavior |
|---|---|
| Desktop (>1024px) | Full layout: social links in facts band, rail block visible |
| Mobile (<=767px) | Facts band wraps; rail column stacks below main content |
| Tablet (768-1024px) | Currently unsupported (shows message) |

Social links in facts band should wrap gracefully — no special mobile treatment needed beyond existing facts-band flex-wrap behavior.

Rail social proof block stacks below main content on mobile (inherits existing rail collapse behavior).

---

## 9. Non-Goals

- Social content embedding (no TikTok/IG/YT embeds on the page)
- Engagement metrics visible to consumers (no like counts, view counts)
- Social feed or timeline rendering
- Platform-specific branding or colors
- Social account verification badges (beyond the `verified` boolean for future use)

---

## 10. Success Criteria

The design is successful when:

1. A visitor sees which social platforms a place is active on (facts band links)
2. The identity block communicates social presence without feeling like a dashboard
3. The rail provides glanceable social proof (followers, recency) for places that have it
4. Places without social accounts render identically to today — no empty states, no "N/A"
5. All rendering follows Voice Layer principles: deterministic, no invention, omit over fabricate
