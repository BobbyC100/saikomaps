# LA sanity pipeline — baseline snapshot

Run these to verify no regression. Compare output to this snapshot.

## 1. Scope count (expect: 5)

```bash
./scripts/db-neon.sh psql -Atc "select count(*) from public.v_places_la_bbox_golden;"
```

**Expected:** `5`

## 2. Confidence gate (expect: all 0.7, high_conf=yes)

```bash
./scripts/db-neon.sh psql -c "
SELECT p.slug, pts.version, pts.confidence
FROM public.v_places_la_bbox_golden v
JOIN public.places p ON p.id=v.id
JOIN public.place_tag_scores pts ON pts.place_id=p.id AND pts.version='tags_v1'
ORDER BY p.slug;"
```

**Expected:**

| slug | version | confidence |
|------|---------|------------|
| budonoki | tags_v1 | 0.7 |
| redbird-downtown-los-angeles | tags_v1 | 0.7 |
| republique | tags_v1 | 0.7 |
| seco | tags_v1 | 0.7 |
| tacos-1986 | tags_v1 | 0.7 |

## 3. Latest eval report

```bash
ls -lt tmp/eval-tag-scores-*.json | head -5
```

**Baseline report (2026-02-19):** `tmp/eval-tag-scores-1771560754702.json`

Key metrics: `placesWithInputCoverageAndHighConfidence=5`, `high_confidence_pct=100.0%`
