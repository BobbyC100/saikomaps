# Saiko Maps — Glossary

Core terms and principles for product, engineering, and AI systems.

---

## Places

**Inclusion on Saiko Maps implies endorsement. Access to external inventory does not.**

- **Saiko Place**: A place intentionally included in Saiko Maps. Inclusion implies Saiko endorsement (curated, trusted, canonical).
- **External Place**: A place accessible for reference/list-making (e.g., from Google Places), but not curated or endorsed by Saiko.

---

## Data Contracts

- **PlaceCanonical**: Saiko's customer-facing, editorially trusted representation of a place. See [DATA-CONTRACT-PLACE-CANONICAL.md](./DATA-CONTRACT-PLACE-CANONICAL.md).
- **Evidence**: Raw or staging data (e.g., `discovered_*` fields, crawler results) that has not been promoted to canonical status.
- **Promotion**: The intentional, reviewed process of moving Evidence to Canonical fields.

---

## Trust & Editorial

- **Canonical**: Promoted, reviewed, and approved for customer display. Never auto-overwritten.
- **Staging**: Temporary, unreviewed data awaiting promotion or rejection.
- **Coverage**: External editorial content (articles, reviews) that has been approved for display (`status: APPROVED`).
- **Saiko IP**: Editorial content authored or synthesized by Saiko (summaries, curator notes, signals).

---

## Forbidden in Customer Responses

These must never appear in customer-facing APIs or UI:

- Any `discovered_*` fields
- Raw Google descriptions, types, or place IDs
- Internal IDs, foreign keys, or timestamps (unless part of canonical provenance)
- Crawl evidence or audit payloads
- Ranking, scoring, or ad configuration metadata
