---
doc_id: ARCH-SOCIAL-FIELDS-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: SAIKO
systems:
  - entities
  - coverage-operations
  - identity-enrichment
related_docs:
  - docs/architecture/identity-scoring-v1.md
  - docs/architecture/coverage-ops-approach-v1.md
  - docs/architecture/instagram-ingestion-field-spec-v1.md
summary: >-
  Specification for social media handle fields on entities (Instagram, TikTok).
  Covers storage format, discovery, validation, identity weight, and the
  sentinel value convention for confirmed-none.
---

# Social Fields — Entity-Level Specification

## Fields

| Column | Table | Type | Example value | Identity weight |
|--------|-------|------|---------------|-----------------|
| `instagram` | entities | TEXT, nullable | `tacos1986` | 2 |
| `tiktok` | entities | TEXT, nullable | `tacos1986official` | 2 |

## Storage Convention

- Store the **handle only** — no `@` prefix, no full URL
- Example: `tacos1986` not `@tacos1986` not `https://instagram.com/tacos1986`
- Sentinel value `NONE` means "confirmed this entity has no account on this platform"
- `NULL` means "unknown / not yet checked"

## Discovery Methods

### Automated (via `/api/admin/tools/discover-social`)

1. **Surface extraction** — if `merchant_surfaces` has an instagram/tiktok surface, extract handle from the URL
2. **Claude-powered search** — searches `"{entity name} {city} instagram/tiktok"`, extracts handle from results, validates format
3. **Website scraping** — `lib/website-enrichment/links.ts` extracts social links from entity websites (`instagram.com` → `instagram`, pattern extensible to TikTok)

### Manual (via Coverage Ops UI)

- Inline text field per issue row — paste handle directly
- "None" button — sets sentinel `NONE` value
- Google search link — opens `"{entity name} Los Angeles"` in new tab for manual lookup

## Validation

Handles must match: `/^[a-zA-Z0-9._]+$/`

Rejected patterns:
- Full URLs (extract handle instead)
- Post/reel/story URLs (not profile URLs)
- Literal strings `none`, `null`
- Empty or whitespace-only

## Integration Points

Social fields are wired into:

| System | File | What it does |
|--------|------|-------------|
| Issue scanner | `lib/coverage/issue-scanner.ts` | Flags `missing_instagram` / `missing_tiktok` (LOW severity) |
| Coverage Ops UI | `app/admin/coverage-ops/page.tsx` | Inline editing, discovery buttons, bulk actions |
| Identity scoring | `lib/identity-enrichment.ts` | Weight 2 each in anchor model |
| Place page API | `app/api/places/[slug]/route.ts` | Returns handles in response |
| Action strip | `components/merchant/ActionStrip.tsx` | Links to profile |
| Location card | `components/LocationCard.tsx` | Shows handle with link |
| Market facts | `components/merchant/MarketFactsCard.tsx` | Shows handle with link |
| Fields v2 | `lib/fields-v2/write-claim.ts` | Claim-to-entity mapping |
| Entity patch | `app/api/admin/entities/[id]/patch/route.ts` | Allows saving via API |

## Why TikTok?

TikTok is a first-class social field because:
1. **Street food discovery** — taco carts, pop-ups, and mobile vendors use TikTok as their primary (sometimes only) online presence
2. **Food reviewer platform** — reviewers post TikTok videos that drive significant discovery traffic
3. **Identity signal** — for entities without GPID or website, TikTok + Instagram together provide weight 4 in identity scoring, approaching the value of GPID alone (weight 4)

## Future: Additional Platforms

The same pattern can extend to other platforms (YouTube, X/Twitter, Threads) by:
1. Adding a nullable TEXT column to entities
2. Adding to `ANCHOR_WEIGHTS` in identity-enrichment
3. Adding `missing_{platform}` rule to issue scanner
4. Adding inline editing in Coverage Ops
5. Adding discovery mode to `discover-social` route
