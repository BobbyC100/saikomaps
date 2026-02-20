# LA-Scoped Gold and Eval

Tag-score evaluation uses gold sets (CSV or JSON). When running in LA-only mode (`--la-only`), gold rows must match places in `v_places_la_bbox_golden`. Use slug-based scoping to avoid hand-editing CSVs.

## 1. Generate LA-scoped gold from full gold

```bash
npm run gold:la:neon -- --gold=data/gold_sets/vibe_tags_v1.csv --out=data/gold_sets/vibe_tags_v1__la.csv
```

- Keeps only rows whose `place_slug` exists in the LA view
- Output defaults to `__la.csv` suffix if `--out` is omitted
- Requires `SAIKO_DB_FROM_WRAPPER=1` (use the npm script)

## 2. Evaluate with LA-scoped gold

```bash
npm run eval:tag-scores:neon:la -- --gold=data/gold_sets/vibe_tags_v1__la.csv --threshold=0.5
```

Eval also auto-scopes gold by `place_slug` when `--la-only` is set, so you can pass the full gold file and it will filter internally. Generating an LA file is optional but useful for auditing or re-use.

For LA bbox smoke eval, use: `npm run eval:tag-scores:neon:la:v1`
