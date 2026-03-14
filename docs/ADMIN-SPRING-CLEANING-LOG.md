---
doc_id: SAIKO-ADMIN-SPRING-CLEANING-2026-03
doc_type: document
status: active
owner: Bobby Ciccaglione
created: 2026-03-13
last_updated: 2026-03-13
project_id: SAIKO
systems:
  - admin
related_docs: []
summary: Record of admin routes and features retired or fixed in March 2026 — Review Queue, Energy Engine, Appearances auth, GPID Queue URL. Captures rationale for each retirement.
---

# Admin Spring Cleaning Log — March 2026

## Retired: Review Queue (/admin/review)

What it did: Human adjudication of ML resolver output — "same place or different place" decisions for entity matches with confidence between 0.70 and 0.90.

Why retired: The ML-based deduplication pipeline is no longer active. The 20 pending records were corrupted ingest artifacts from a deprecated editorial_era_intake path — not real deduplication candidates. The review queue was solving a problem that no longer exists in the current ingest path.

Action taken:
- Route archived
- Nav item removed
- Admin dashboard card removed
- pending records cleared from review_queue table

## Retired: Energy Engine (/admin/energy)

What it did: Displayed energy/atmosphere scoring for places — a 0-100 classification system intended as a precursor to SceneSense vibe tagging.

Why retired: The scoring system ran but produced no meaningful signal. 143 records all scored 0-9 out of 100, avg confidence 0.01. The system was superseded by place_tag_scores (Cozy tag) which has real coverage. No consumer surface ever consumed energy_scores.

Action taken:
- Route archived
- Nav item removed
- Admin dashboard card removed
- energy_scores table retained but not active

## Fixed: Appearances auth (/admin/appearances)

Issue: Route was redirecting to /login instead of loading within authenticated admin session.
Fix: Applied same auth guard used by other admin routes.

## Fixed: GPID Queue URL

Old route: /admin/identity/gpid-queue
New route: /admin/gpid-queue
Reason: Flattened to match nav label and pattern of other admin pages.

## Admin nav after spring cleaning
Dashboard / Intake / Coverage / Instagram / Photos / GPID Queue / Appearances
