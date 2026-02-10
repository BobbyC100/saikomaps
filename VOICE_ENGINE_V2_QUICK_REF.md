# Voice Engine v2.0 — Quick Reference Card

**Status**: ✅ Ready for deployment  
**Test**: `npx tsx scripts/test-voice-engine-v2.ts`

---

## What It Does

Generates cool, confident taglines using identity signals:

```
institution + protein-centric + #19 pastrami + family-legacy
→ "Sandwich institution. Period."

chef-driven + carb-forward + cacio e pepe + natural wine
→ "Cacio e pepe. Oxtail ragu. Echo Park's serious pasta room."
```

---

## Input Signals

### Core (flat fields in golden_records)
- `place_personality` → Pattern selection
- `cuisine_posture` → Food language
- `service_model` → Vibe language
- `price_tier` → Tone calibration
- `wine_program_intent` → Drink references

### Extended (identity_signals JSON)
- `signature_dishes[]` → Specific menu items
- `vibe_words[]` → Their words about themselves
- `key_producers[]` → Wine/spirits specificity
- `origin_story_type` → Authority framing

---

## Pattern Selection

| Personality | Primary Pattern | Weight |
|-------------|-----------------|--------|
| institution | Local Authority | 3x |
| neighborhood-spot | Neighborhood Anchor | 3x |
| chef-driven | Food Forward | 3x |
| scene | Vibe Check | 3x |
| hidden-gem | Local Authority | 3x |
| destination | Food / Neighborhood | 2x |

---

## Usage

### Test
```bash
npx tsx scripts/test-voice-engine-v2.ts
```

### Production Batch
```bash
# Dry run
npx tsx scripts/generate-taglines-v2.ts --dry-run --limit=10 --verbose

# Generate
npx tsx scripts/generate-taglines-v2.ts --limit=100 --concurrency=10
```

### Programmatic
```typescript
import { enrichPlaceV2, buildTaglineInputFromGoldenRecord } from '@/lib/voice-engine-v2';

const input = buildTaglineInputFromGoldenRecord(goldenRecord);
const result = await enrichPlaceV2(input);
// result.tagline, result.taglineCandidates, result.taglinePattern
```

---

## Files

### Implementation
- `lib/voice-engine-v2/*.ts` — 7 files

### Scripts
- `scripts/test-voice-engine-v2.ts` — Test ✅
- `scripts/generate-taglines-v2.ts` — Batch generation

### Docs
- `VOICE_ENGINE_V2_HANDOFF.md` — Comprehensive handoff
- `VOICE_ENGINE_V2_IMPLEMENTATION.md` — Technical spec
- `VOICE_ENGINE_V2_SUMMARY.md` — Quick start
- `VOICE_ENGINE_V2_QUICK_REF.md` — This file

---

## Quality Bar

✅ Confident, cool, deadpan  
✅ Short sentences, periods  
✅ Withhold more than share  
✅ 6-14 words max  

**Examples**: "Sandwich institution. Period." | "Good coffee. Nice light. Don't be in a hurry."

❌ Warm, enthusiastic, eager  
❌ "Amazing!", "You'll love it!", "Don't miss!"

---

## Deployment

1. **Schema Migration** — Add tagline fields to golden_records
2. **Test Batch** — 50 places, review output
3. **Full Batch** — All places with identity signals
4. **Integration** — Add to enrichment pipeline

---

## Cost

~$0.002-0.004 per place (Sonnet 4)  
100 places = ~$0.20-0.40  
1,000 places = ~$2-4

---

**Built**: Feb 10, 2026 | **Model**: Claude Sonnet 4 | **Status**: ✅ Ready
