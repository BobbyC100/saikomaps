# SaikoAI Extraction Prompt — V2.1

Production-ready system prompt for the enrichment pipeline.
Drop directly into your job runner.

Tested against: Maru Coffee (Los Feliz) — 5 patches applied from real-world test.

---

See `lib/saikoai/prompts/place-extraction.ts` for the prompt implementation.
See `docs/extraction-test-output-maru-coffee.json` for sample output.

---

## Changelog

- **V2.2**: Patches from first live extraction (Maru Coffee batch run). Patch 6: Curator note voice — lead with feel, ban "Wikipedia voice". Patch 7: Null fields must have editor hints (hard requirement). Patch 8: Equipment/brand name filter across all fields.

- **V2.1.1**: Added framing section. System prompt now states explicitly: SaikoAI populates the editorial bento fields on each Merchant Profile; Google Places handles the basics (name, address, hours, coordinates, category); SaikoAI handles the sensory, experiential, editorial stuff. Fields section header restates the split.

- **V2.1**: Tested against Maru Coffee (Los Feliz) with real sources.
  Added curator_note exclusion list (no credentials, equipment, dates).
  Added curator_note length cap (2-3 sentences, max 4). Added multi-
  location handling rule (one card per materially different location).
  Added source age penalty (>3 years = confidence downgrade). Added
  universal price normalization scale ($–$$$$). Added null field
  guidance for editors (actionable fill suggestions).
