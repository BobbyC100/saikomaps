# PRL Materialize — Implementation Doc (Cursor-Ready)

**Status:** Implemented (v1). Use this doc to verify correctness, fix drift, or extend.

---

## Problem

PRL is computed from **PlaceForPRL** input. If that input is incomplete (missing photos, tag/energy, reinforcement joins), everything looks like PRL-1 even when the place page shows photos, vibe tags, and editorial content.

- Production API returns `prl: 1`, `scenesense: null` for places like `/api/places/seco`
- Cron evaluator reports all PRL-1 when it lacks joins
- **Root cause:** PRL was derived from raw `places` columns, not materialized joins

---

## Solution

A single **PlaceForPRL materializer** used by:

1. **Cron evaluator** — batch census (read-only)
2. **API route** — single-place payload

Both call the same materializer → same `computePRL()` → no drift.

---

## Files

| File | Role |
|------|------|
| `lib/scenesense/prl-materialize.ts` | Materializer: `fetchPlaceForPRLBySlug`, `fetchPlaceForPRLBatch` |
| `lib/scenesense/prl.ts` | Types `PlaceForPRL`, `PRLResult`; `computePRL(place, prlOverride)` |
| `lib/scenesense/assembly.ts` | `assembleSceneSenseFromMaterialized()` — SceneSense from materialized PRL |
| `scripts/cron-prl-evaluator.ts` | Cron: uses `fetchPlaceForPRLBatch` + `computePRL` |
| `app/api/places/[slug]/route.ts` | API: uses `fetchPlaceForPRLBySlug` + `assembleSceneSenseFromMaterialized` |

---

## Materialization Rules (v1)

### 1) Photos

| Field | Rule |
|-------|------|
| `googlePhotosCount` | `places.googlePhotos` array length. If not array, 0. Optional fallback: `places.photoUrls?.length` or `places.photoUrl ? 1 : 0` if those columns exist. |
| `userPhotosCount` | 0 (v1) |
| `heroApproved` | True if `place_photo_eval` has any row with `tier === 'HERO'` (presence = approved) |
| `hasInteriorOrContextApproved` | True if `place_photo_eval` has any row with `tier IN ('HERO','GALLERY')` AND `type IN ('INTERIOR','CONTEXT')` |
| `curatorPhotoOverride` | false (v1) |

Powers: `HAS_ANY_PHOTO`, `HAS_PHOTO_QUALITY_THRESHOLD`.

### 2) Tag/Energy (v1 bridge)

| Field | Rule |
|-------|------|
| `hasTagSignals` | True if `place_tag_scores` has rows for place **or** legacy `vibeTags.length > 0` (v1 bridge) |
| `energyScore` | Latest `energy_scores.energy_score` for place, else null |
| `hasFormality` / `hasIdentitySignals` / `hasTemporalSignals` | false (v1) |

Powers: `HAS_ENERGY_OR_TAG_SIGNALS`, `HAS_MULTI_SCENESENSE_INPUTS`.

### 3) Reinforcement

| Field | Rule |
|-------|------|
| `appearsOnCount` | Count of `map_places` where `lists.status = 'PUBLISHED'` |
| `fieldsMembershipCount` | Via `golden_records.google_place_id` → `FieldsMembership.entityId` (removedAt = null) |
| `hasCoverageSource` | True if `editorialSources` non-empty OR `pullQuote` OR `pullQuoteSource` |

Powers: `HAS_REINFORCEMENT_SIGNAL`.

---

## API Contract

### Place API (`GET /api/places/[slug]`)

Returns in `data.location`:

- `prl` — effective PRL (override if present, else computed)
- `scenesense` — object when PRL ≥ 3, else null
- Optional: `computed_prl`, `prl_override`, `mode` for debugging

### PRL Census Endpoint (Implemented)

**`GET /api/admin/prl-census?limit=200&laOnly=1`**

- **Query params:** `limit` (1–1000, default 200), `laOnly` ("1" or "true")
- **Security:** Gated by `ADMIN_DEBUG=true` env var; returns 404 otherwise
- **Returns (JSON):**

```json
{
  "success": true,
  "data": {
    "countsByPRL": { "1": 9, "2": 0, "3": 0, "4": 0 },
    "blockedFromPRL3": {
        "HAS_CATEGORY": 4,
      "HAS_ADDRESS_OR_LATLNG": 4,
      "HAS_HOURS": 9,
      "HAS_ANY_PHOTO": 9,
      "HAS_DESCRIPTION_OR_CURATOR_NOTE": 4,
      "HAS_ENERGY_OR_TAG_SIGNALS": 4,
      "HAS_PHOTO_QUALITY_THRESHOLD": 9,
      "HAS_MULTI_SCENESENSE_INPUTS": 9,
      "HAS_REINFORCEMENT_SIGNAL": 9
    },
    "overriddenCount": 0,
    "sampleSlugsByPRL": {
      "1": ["budonoki", "buvons", "covell", "dan-tanas", "dunsmoor"],
      "2": [],
      "3": [],
      "4": []
    },
    "generatedAt": "2026-02-23T00:00:00.000Z",
    "limit": 200,
    "laOnly": true
  }
}
```

**File:** `app/api/admin/prl-census/route.ts`

---

## Verification

### A) Cron evaluator (Neon)

```bash
./scripts/db-neon.sh node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/cron-prl-evaluator.ts
```

**Expected:** PRL distribution changes from all-1 when data supports it; `blockedFromPRL3` reflects real blockers (e.g. `HAS_ENERGY_OR_TAG_SIGNALS` drops when vibeTags/place_tag_scores exist).

### B) Single place (prod)

```bash
curl -s https://saikomaps.vercel.app/api/places/seco | jq '.data.location | { slug, prl, scenesense, vibeTags }'
```

**Expected:** `prl` and `scenesense` consistent with PRL gating; `scenesense` null when PRL < 3.

### C) Census endpoint (prod)

```bash
curl -s "https://saikomaps.vercel.app/api/admin/prl-census?limit=200&laOnly=1" | jq
```

**Prereq:** Set `ADMIN_DEBUG=true` in Vercel env. Otherwise returns 404.

**Expected:** Same shape as evaluator output; single curl to confirm dataset state without Neon UI.

---

## Acceptance Criteria

1. Cron evaluator shows >1 PRL bucket when data supports it, or reveals real blockers (not missing joins).
2. Places with vibeTags + photos in DB see PRL rise appropriately (PRL-2 or PRL-3 depending on hours/business_status/photo_eval).
3. `/api/places/:slug` returns `prl` and `scenesense` consistent with PRL gating rules.

---

## Optional: Quick SECO Path

Without waiting on photo-eval/energy joins: add `prlOverride = 3` for `seco` via DB so SceneSense Lite speaks while the full materializer is built.

---

## Guardrails

- Do NOT add new migrations in this task.
- If a table is missing in Prisma, do not reference it; implement joins only for existing models.
- Keep the `vibeTags → hasTagSignals` bridge explicitly labeled `// v1 bridge` for future removal.
- Keep materializer read-only and deterministic (no side effects).
