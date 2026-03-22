---
doc_id: ARCH-VISIT-BUCKET-V0
status: PROBLEM_FRAMING
owner: Bobby
created: 2026-03-20
last_updated: 2026-03-20
layer: Problem Framing (pre-spec)
related_docs:
  - docs/architecture/enrichment-model-v1.md
  - docs/architecture/coverage-dashboard-v2-spec.md
---

# Entity Visit Information — Problem Framing (v0)

> **Status:** Problem Framing — intentionally avoids prescribing solutions.
> **Purpose:** Define the open questions and ambiguities around the "Visit" (formerly "Access") bucket in the Saiko completeness model.

---

## 1. Context

Saiko currently uses a three-bucket completeness model:

- Identity
- Visit (formerly "Access")
- Offering

The "Visit" bucket is intended to represent the information required for a user to engage with an entity in the real world.

However, the exact scope, naming, and boundaries of this bucket remain unclear.

---

## 2. Core Question

**What category of information does "Visit" actually represent?**

This is not a naming problem — it is a classification problem.

Is this bucket:

- Contact information?
- Visit planning information?
- Operational interface with the entity?
- A combination of the above?

The system currently mixes multiple concepts under this bucket without a precise definition.

---

## 3. Ambiguity in Scope

### 3.1 Contact vs Interaction

Some fields clearly fall under "contact":

- Phone
- Email

Others extend beyond contact:

- Hours
- Reservations
- Walk-in expectations

These are not "contact" signals — they describe how interaction with the entity works.

**Open question:** Should this bucket be defined around contact, or around interaction more broadly?

---

### 3.2 Planning vs Execution

Some data helps a user plan:

- Hours
- Website
- Instagram

Some data enables execution:

- Reservations
- Phone
- Booking links

**Open question:** Is this bucket about planning a visit, executing a visit, or both?

---

### 3.3 Physical vs Digital Interaction

Some entities are primarily physical (restaurants, parks). Others may be accessed digitally (content-driven entities, brands, etc.).

Instagram, for example:

- Can function as contact (DM)
- Can function as primary discovery surface
- Can function as the entity's main public presence

**Open question:** Is this bucket limited to physical visitation, or does it include digital interaction pathways?

---

## 4. Source vs Signal Confusion

There is a structural ambiguity between:

- **Sources** (e.g., Instagram, website)
- **Signals** (e.g., phone, hours, reservations)

Instagram in particular highlights this issue:

- It is not just a field (like phone)
- It is a multi-purpose source that can inform identity, offering, and interaction

**Open question:** How should the system distinguish between a source of information and the role that information plays in the completeness model?

**Working direction (from discussion 2026-03-20):** The completeness buckets should measure whether we have the *signals*, not whether we have the *source*. Instagram is a source. From that source we get identity signals (handle confirmation), engagement signals (booking link, hours in bio), and offering signals (food photos, menu highlights). The bucket should care about the signals, not the source.

---

## 5. Subtype Variability

The importance of fields within this bucket varies significantly by entity subtype:

- Restaurants → reservations, hours, walk-in expectations are critical
- Taco carts → reservations may be irrelevant
- Parks → phone may be irrelevant
- Retail → hours + location more important than booking

**Open question:** How should this bucket adapt across subtypes without becoming inconsistent or fragmented?

---

## 6. Completeness vs Relevance

Not all fields should count equally:

- Some are essential for interaction
- Some are additive but not required
- Some are irrelevant depending on subtype

**Open question:** How should the system distinguish between required, optional, and irrelevant interaction signals without overfitting to specific entity types?

---

## 7. Relationship to User Intent

This bucket is implicitly tied to user intent:

- "Can I go here?"
- "How do I contact them?"
- "Can I book this?"

However, different users may prioritize different interaction paths (e.g., phone vs Instagram vs website).

**Open question:** Should this bucket model a single canonical interaction path, or multiple possible paths to engagement?

---

## 8. Naming Ambiguity

Several candidate names exist, each with limitations:

- **Access** → suggests permissions or system access
- **Contact** → too narrow (misses hours, reservations)
- **Visit** → may imply only physical presence
- **Visit Info** → descriptive but less precise
- **Reach** → covers physical and digital but may be unfamiliar
- **Engagement** → carries marketing baggage

**Open question:** What naming best reflects the underlying concept without constraining it incorrectly?

---

## 9. Boundary with Other Buckets

There is overlap with other buckets:

- Identity (e.g., Instagram bio, brand presence)
- Offering (e.g., menu on website, products on IG)

**Open question:** Where should the boundaries be drawn between Identity, Visit, and Offering when the same source contributes to all three?

**Working direction (from discussion 2026-03-20):** Sources span buckets; signals don't. Each extracted signal maps to exactly one bucket based on what it represents. The source it came from is irrelevant to bucket assignment.

---

## 10. Negative Confidence

Related to enrichment effectiveness: when a source is checked and the expected signal is not found (e.g., website has no hours), the system should record this as a negative finding with confidence. This prevents redundant re-enrichment and supports accurate completeness measurement.

**Open question:** How should the system represent "we checked and this data doesn't exist at this source"?

---

## 11. Open Problems Summary

The system must resolve:

1. What this bucket fundamentally represents (contact vs interaction vs visit)
2. How to handle sources that span multiple roles (e.g., Instagram)
3. How to adapt across entity subtypes without fragmentation
4. How to model multiple interaction paths
5. How to define clean boundaries with Identity and Offering
6. What terminology best captures the concept
7. How to represent confirmed absence of data

---

## 12. Goal for Next Iteration

The next iteration should:

- Propose a precise definition of this bucket
- Define its boundaries relative to Identity and Offering
- Clarify how sources map into buckets (signal-based, not source-based)
- Validate the model across multiple entity subtypes

---

*Saiko Fields · Visit Bucket · Problem Framing v0 · 2026-03-20*
