# SaikoAI Source Collector — Benchmark

Scores Approach A and/or B on publication coverage, content quality, and metadata.

## Quick Start

### Batch collect (recommended)

```bash
npm run batch                    # all places, skip done, 75s delay
npm run batch -- --limit 5      # first 5 only
npm run batch -- --category "wine bar"
npm run batch -- --start-at silver-lake-wine  # resume
npm run benchmark -- --slug all
```

### Approach B only (manual)

```bash
# 1. Run Approach B for each test place
npm run collect:b -- --slug psychic-wine --verbose
npm run collect:b -- --slug silver-lake-wine --verbose
npm run collect:b -- --slug the-douglas --verbose

# 2. Copy results into benchmark dir
cp data/input/sources/psychic-wine.json data/benchmark/approach-b/
cp data/input/sources/silver-lake-wine.json data/benchmark/approach-b/
cp data/input/sources/the-douglas.json data/benchmark/approach-b/

# 3. Score them
npm run benchmark -- --slug all
```

### Approach A + B (head-to-head)

```bash
# Run both collectors, copy to respective dirs, then compare
npm run collect -- --slug psychic-wine --verbose
cp data/input/sources/psychic-wine.json data/benchmark/approach-a/

npm run collect:b -- --slug psychic-wine --verbose
cp data/input/sources/psychic-wine.json data/benchmark/approach-b/

# Repeat for other places, then:
npm run benchmark -- --slug all --compare
```

> **Note:** `npm run collect` (Approach A / CSE Pipeline) is not yet implemented. Use `collect:b` for now.

## Directory layout

```
data/benchmark/
  approach-a/     ← CSE pipeline results (copy from data/input/sources/)
  approach-b/     ← Claude-native results (copy from data/input/sources/)
```

## Flags

- `--slug <name>` — Single place or `all`
- `--compare` — Head-to-head A vs B when both have results

## Review (insufficient sources)

```bash
npm run review -- --no-sources      # Triage places with 0 sources (m=manual, s=skip, r=retry)
npm run review -- --min-sources 3   # Review places below threshold (0 + 1–2 sources)
```

Logs: `data/review-log.json`, `data/no-sources-review.json`
