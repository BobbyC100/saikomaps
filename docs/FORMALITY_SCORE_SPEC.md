# Formality Score — Specification (Locked)

**System**: Saiko Maps — Place Profile System  
**Category**: Formality (0–100 spectrum)  
**Date**: February 17, 2026  
**Status**: Locked — pipeline-generated, auditable, no mocks. Post-run we only tune weights/lexicons, not dimensions.

---

## Relationship to Energy

Energy structure is locked (inputs + ranges + confidence + missing-data handling + event baseline rule). Formality follows the same standard: same doc shape, same implementation discipline.

---

## What It Measures

How much the place dictates your behavior — expectations around reservation norms, service ritual, pacing, and how put-together you need to be.

```
Come-as-you-are  ←———————————————————————————→  Put-together
       0                                                   100
```

Formality is not quality. It is behavioral constraint.

---

## Inputs (Priority Order)

### A) Service Model (0–40 points)

**Source**: Identity layer (`service_model`) + extracted service signals.

**Base mapping (Identity)**:

| Identity value | Points |
|----------------|--------|
| counter / fast casual / truck | 5–12 |
| bar-first (wine bar, cocktail bar with bites) | 10–18 |
| full-service a la carte | 20–30 |
| tasting menu / omakase / coursed prix fixe | 30–40 |

**Modifiers** (from coverage/about/menu language):

- “tasting,” “omakase,” “prix fixe,” “coursed” → +5 (cap 40)
- “order at counter,” “grab-and-go,” “walk-up” → -5 (floor 0)

**Rationale**: Service ritual is the strongest driver of behavioral expectation.

---

### B) Price Tier (0–25 points)

**Source**: Identity layer (`price_tier`).

| price_tier | Points |
|------------|--------|
| $ | 5 |
| $$ | 12 |
| $$$ | 20 |
| $$$$ | 25 |

Price is a constraint proxy, not the constraint itself — capped at 25.

---

### C) Reservation Norms / Friction (0–20 points)

**Source**: Google `reservable` + coverage language + booking scarcity signals.

| Signal | Points |
|--------|--------|
| reservable true | +8 |
| “reservations recommended” | +5 |
| “reservation required” / “hard to get” / “booked out” | +10 |
| waitlist / deposit / cancellation policy language | +5 |

Cap at 20.

---

### D) Dress / Ritual Language (-5 to +10 points)

**Source**: Coverage + about copy.

**High-formality terms (+)**: refined, elegant, polished, upscale, white-tablecloth, jacket, formal, ceremony, pairings, sommelier-led, choreographed  

**Low-formality terms (-)**: casual, laid-back, no-fuss, come-as-you-are, counter-service, shorts welcome, beachy  

Range: -5 to +10. Stronger upward push than downward; low formality is already captured by service model.

---

### E) Tableware / Material Cues (0–5 points)

**Source**: Text (or later curated sources) when detectable.

- “linen,” “white tablecloth,” “crystal,” “fine china” → +3 to +5
- “paper plates,” “plastic cups,” “standing room” → 0 (do not go negative)

Cap at 5. Optional in V1; include if signals exist.

---

## Final Formality Score

```
Formality = clamp(
    ServiceModel (0–40)
  + PriceTier (0–25)
  + Reservation (0–20)
  + Language (-5..+10)
  + Materials (0–5),
  0, 100
)
```

- **Max theoretical**: 40 + 25 + 20 + 10 + 5 = 100  
- **Min theoretical**: 0 (after clamp)

---

## Missing Data Handling

If `price_tier` or `service_model` is missing (rare if Identity is functioning):

- Reweight remaining components proportionally to 100.
- Confidence drops sharply.
- Store score; **do not display** unless confidence ≥ 0.5.

Formality should be mostly computable from Identity + reservability even with limited text.

---

## Formality Confidence (0–1)

| Input | Contribution |
|-------|--------------|
| service_model | 0.40 |
| price_tier | 0.25 |
| reservation signals | 0.20 |
| coverage/about language | 0.10 |
| material cues | 0.05 |

**Display threshold**: 0.5 (same as Energy, consistent rule).

---

## Calibration Examples (LA Validation Set)

| Place | Target ~Score | Notes |
|-------|----------------|-------|
| Dunsmoor | ~72 | Full-service, $$$, reservation friction, coursed pacing language |
| Dan Tana’s | ~76 | Classic full-service, $$$, reservation expectations, ritual cues |
| Covell | ~46 | Bar-first, $$, walk-in friendly, casual posture despite wine seriousness |
| Buvons | ~44 | Patio wine bar, $$, casual language, light reservation constraint |

---

## Edge Cases

- **High price / low ritual** (expensive counter-service): price pushes up, service model pulls down → score lands mid.
- **Low price / high ritual** (formal tea service, special omakase pop-up): service model and reservation friction dominate.
- **Scene-y clubs with bottle service**: can be high energy but not necessarily high formality; Formality stays driven by service + reservation + ritual language, not nightlife status.

---

## Implementation Order

1. Lock the Formality structure (this spec).
2. Implement scoring functions (same pipeline pattern as Energy).
3. Run full LA dataset + output distributions.
4. Tune only weights/lexicons as needed; do not change dimensions or input set.
