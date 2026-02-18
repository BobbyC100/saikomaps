# Energy Score — Specification (Locked)

**System:** Saiko Maps — Place Profile System  
**Category:** Energy (0–100 spectrum)  
**Date:** February 17, 2026  
**Status:** Locked — pipeline-generated, auditable, no mocks. Post-run we only tune weights/lexicons, not dimensions.

---

## Relationship to Formality

Energy structure is locked (inputs + ranges + confidence + missing-data handling + event baseline rule). Formality follows the same standard; see `FORMALITY_SCORE_SPEC.md`.

---

## What It Measures

How stimulating the environment is on a typical peak service window. Not "best night ever," not event-only spikes. The baseline energy of the place when it's doing what it does.

```
Calm ←————————————→ Buzzing
0                                    100
```

---

## Inputs (In Priority Order)

### A) Popular-Times Density (0–50 points)

Derived from Google "popular times" / visit density proxies. Capped at 50 (not 60) to prevent raw traffic volume from dominating the score. Density contributes to stimulation but not linearly — a packed quiet omakase counter is not the same energy as a packed loud trattoria.

**Compute:**
- **Peak intensity:** max(popularity) over week → 0–30 points
- **Peak width:** contiguous minutes above 70% of peak → 0–15 points
- **Sustained consistency:** inverse of variance — steady high traffic scores higher than spiky bursts → 0–5 points

Wide, sustained intensity = energetic baseline. Short chaotic spike ≠ high energy place.

**Event baseline rule:** If recurring event windows are detectable (e.g., weekly DJ night shows as a spike pattern), downweight those windows in baseline calculation. Score reflects what the place is on a normal busy night, not its best event night. If event frequency data is unavailable, use median popularity rather than peak to reduce spike inflation.

### B) Crowd / Noise Language (-25 to +25 points)

From editorial coverage + about page copy + extracted identity terms. Expanded range (from ±20) to give social perception more influence relative to raw traffic data.

**Two lexicons:**

High-energy terms: bustling, packed, loud, buzzing, electric, lively, raucous, scene, party, roaring, pumping, chaotic, wild

Low-energy terms: quiet, calm, intimate, hushed, peaceful, low-key, relaxed, serene, gentle, whisper, subdued, mellow

**Scoring:**
- Term hits weighted by source quality (editorial coverage > about page)
- Decay by freshness (older coverage downweighted)
- Net score from balance of high vs. low hits
- Range: -25 to +25

### C) Operational Accelerants (0–15 points)

From Google Places flags and structured data.

| Signal | Points |
|--------|--------|
| liveMusic = true | +10 |
| Bar-forward (serves beer/cocktails as primary) | +5 |
| goodForGroups = true | +5 |

Cap at 15. These are additive indicators, not decisive on their own.

### D) Capacity / Compression Proxy (0–15 points)

High demand in a small space raises perceived energy. The room is doing more than its footprint suggests.

**Signals:**
- "Tiny dining room," "tight space," "bar packed," "hard to get in"
- "Shoulder to shoulder," "no empty seats," "standing room"
- Reservation friction (see below)

**Reservation friction (recommended if available):**
If reservability + booking scarcity signals exist (Resy/OpenTable availability snapshots, waitlist frequency, "booked out" language), convert to 0–10 points and feed into compression score.

### E) Sensory Intensity Modifier (-5 to +10 points)

Grounded in environmental psychology research on multisensory arousal (Krishna, 2012; Bitner, 1992; Ryu & Jang, 2008). Sensory inputs — sound, sight, smell, touch — directly raise or lower stimulation. We can detect proxies for these from text data.

**Sound signals (strongest sensory driver of energy):**

| Signal | Source | Points |
|--------|--------|--------|
| DJ nights, live band, live music specificity | About page, editorial | +3 |
| "No music," "ambient playlist," "quiet background" | About page, editorial | -2 |

Note: liveMusic flag already captured in Section C. This captures specificity beyond the boolean — a DJ set reads differently than a solo acoustic guitarist.

**Sight signals (visual arousal):**

| Signal | Source | Points |
|--------|--------|--------|
| Neon, vibrant colors, bright/warm lighting | About page, editorial | +2 |
| Dim, dark, candlelit, muted tones | About page, editorial | -2 |

Note: Visual signals also feed Ambiance tags (Moody, Airy, etc.). The Energy modifier captures the arousal component only — does the visual environment stimulate or sedate?

**Smell signals (olfactory arousal):**

| Signal | Source | Points |
|--------|--------|--------|
| Open kitchen, wood-fire, charcoal, live cooking | About page, editorial, menu | +3 |
| Bakery, coffee roaster, smoker | About page, editorial | +2 |

Open kitchens and live fire create ambient sensory stimulation — heat, smoke, sizzle, aroma. These raise perceived energy even before the crowd arrives.

**Touch signals (haptic environment):**

Touch primarily feeds Formality, not Energy. Not scored here. The material quality of the environment (linen vs. paper, leather vs. plastic) shapes expectations and behavioral codes but does not directly raise or lower stimulation.

**Sensory modifier cap:** -5 to +10 points. This is a refinement layer, not a primary driver.

---

## Final Energy Score

```
Energy = clamp(
    Popularity (0–50)
  + Language (-25..+25)
  + Flags (0–15)
  + Compression (0–15)
  + Sensory (-5..+10),
  0, 100
)
```

**Maximum theoretical score:** 115, clamped to 100.  
**Minimum theoretical score:** -30, clamped to 0.

### Missing Data Handling

If Popular-Times data is unavailable (new restaurants, low Google coverage):

- Do **not** score Popularity as 0. That penalizes new places unfairly.
- Instead, **reweight remaining components proportionally** to fill the 0–100 range.
- Normalize: `Energy = clamp( (Language + Flags + Compression + Sensory) × (100 / 65), 0, 100 )`
- Confidence drops significantly (loses 0.40 contribution). Score is directional, not precise.
- Store the score. Display only if remaining confidence ≥ 0.5.

---

## Energy Confidence (0–1)

Based on coverage of available inputs:

| Input Present | Confidence Contribution |
|---------------|------------------------|
| Popular-times data | 0.40 |
| Editorial coverage / about page text | 0.30 |
| Google Places flags | 0.10 |
| Compression signals | 0.10 |
| Sensory signals | 0.10 |

Language confidence raised to 0.30 (from 0.25) to reflect its expanded scoring range and importance as the primary social-perception input.

**Confidence drives display:** If confidence is below 0.5, the Energy score is stored but not displayed on the merchant page. Low-confidence scores are available for internal use (Voice Engine, recommendations) but not surfaced to users.

---

## Calibration Examples

| Place | Expected Energy | Why |
|-------|----------------|-----|
| Dunsmoor | ~70 | Compressed dining room, serious demand density, but not a party. High popularity + compression, moderate language. |
| Buvons | ~56 | Patio wine bar, social but not loud. Moderate popularity, positive language, low compression. Events (DJ nights) create spikes but don't alter baseline. |
| Dan Tana's | ~82 | Loud institution, packed nightly, high-density bar, reservation friction. High on every axis. |
| Covell | ~64 | Wine bar with conversational hum, spatial compression from long bar format, but naturally capped by intimate scale. |
| Quiet neighborhood sushi bar | ~25 | Low popularity density, "quiet," "intimate" language, no flags, no compression. |
| Taco truck | ~40 | Moderate traffic, outdoor, casual, no compression, no sensory modifiers. |
| Nightclub-adjacent late night spot | ~90+ | Peak popularity, "packed," "loud," liveMusic, DJ, neon, maximal compression. |

---

## Edge Cases

**Event-driven spikes:** Handled in Section A. Recurring event windows are downweighted in baseline calculation. If event frequency is undetectable, median popularity is used instead of peak. This prevents places like Buvons (periodic DJ nights) from scoring artificially high.

**Seasonal variation:** Patio-forward places may have different energy profiles summer vs. winter. V1 does not account for this. Flag for V2.

**Time-of-day variation:** A place can be calm at lunch and buzzing at dinner. V1 scores the peak service window. Time-of-day profiles are a V2 feature that could leverage popular-times hourly data.

**New places / insufficient data:** Handled in Missing Data section above. Remaining components are reweighted proportionally. Score is stored but only displayed if confidence ≥ 0.5.

---

## Research Foundation

The Energy score is grounded in the **Arousal** dimension of the Mehrabian-Russell PAD Model (1974), which identifies arousal as one of three fundamental emotional responses to any environment. Arousal measures stimulation level — from sleepy/inactive to excited/alert.

The sensory modifier draws from:
- **Bitner (1992)** — Servicescape model identifying ambient conditions (sound, scent, temperature) as environmental stimuli
- **Ryu & Jang (2008)** — DINESCAPE scale confirming ambience and lighting as distinct dimensions of restaurant environment perception
- **Krishna (2012)** — Sensory marketing framework establishing that all five senses influence consumer arousal and behavior
- **QSR/Curion sensory research** — Color studies showing warm/bright colors raise arousal; cool/dark colors lower it

The novel contribution: applying these validated frameworks to data-derived text signals rather than in-person measurement. We cannot measure decibel levels or scent intensity from data — but we can detect language proxies for sensory environments that the research confirms drive arousal.
