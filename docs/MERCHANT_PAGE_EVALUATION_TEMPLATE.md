# Merchant Page Evaluation Template

**Decision-Support Architecture Audit**

| Field | Value |
|-------|-------|
| **Evaluator** | System / Engineering Agent |
| **Date** | 2025-02-18 |
| **System / Page Version** | Saiko Maps Place Page (System B layout); `app/(viewer)/place/[slug]/page.tsx` |

---

## 1. Purpose of This Audit

This audit evaluates the current merchant page as a decision-support engine, not as a visual or content surface.

The goal is to determine:
- What decisions the page currently supports well
- Where cognitive friction exists
- Where the system diverges from first-principles UX rules

This is not a redesign request.

---

## 2. Core Decision Loop Check (10-Second Test)

A first-time user should be able to answer the following within 10 seconds.

### 2.1 Identity & Relevance

| Question | Answer |
|----------|--------|
| Can the user immediately identify what this place is? | ☑ Yes ☐ Partially ☐ No |
| What information enables this? | **Name** (hero, H1); **category or meal context** (e.g., Lunch, Dinner, Late Night); **neighborhood**; **price** ($ symbols). Meta row: `mealContext · neighborhood · price` (e.g., "Dinner · Highland Park · $$"). |
| What is missing or unclear? | **Category** is replaced by meal context when derivable from hours; if hours missing, category may be absent. No explicit cuisine type in hero. |

---

### 2.2 Real-World Feasibility

| Question | Answer |
|----------|--------|
| Can the user determine whether they can go right now? | ☑ Yes ☐ Partially ☐ No |
| How is status communicated? | **Hero status row**: green/gray dot + text `Open · Closes 12 AM` or `Closed · Opens 11 AM`. **HoursCard**: today’s hours + "See all hours" for full week. **Irregular hours**: shows "Hours vary" (no fake precision). |
| Is uncertainty explicit when data is unreliable? | ☐ Yes ☑ No — No freshness or confidence metadata shown. `openNow` / `open_now` or parsed weekday hours used; no "hours may be outdated" or similar. Irregular hours are surfaced but there is no explicit "unknown" for missing hours. |

---

### 2.3 Experience Fit

| Question | Answer |
|----------|--------|
| Can the user reasonably predict what the experience will be like? | ☐ Yes ☑ Partially ☐ No |
| What signals support this judgment? | **Curator's Note** (description), **CoverageCard** (pull quote from editorial), **VibeCard** (tags), **GalleryCard**. Editorial and curator content provide experience cues. |
| Are facts and interpretation clearly separated? | ☑ Yes ☐ No — Curator labeled "CURATOR'S NOTE"; about copy labeled "ABOUT"; Coverage labeled by publication. Vibe tags are clearly editorial. |

---

### 2.4 Actionability

| Question | Answer |
|----------|--------|
| Is there a clear next action the user can take immediately? | ☑ Navigate ☑ Share ☐ Save ☐ None |
| Are actions visually and cognitively distinct from information? | ☑ Yes ☐ No |

**Notes:** **ActionStrip** (Nav, Call, Insta) is a dedicated row below hero. **Share** in header. **Save** is deferred (Phase 4 per `lib/action-set.ts`); no add-to-list on merchant page. **Reservations** card type exists in resolver but `ReservationsCard` is not implemented (TODO in page).

---

## 3. Cognitive Load Assessment (Per Region)

| Region | Primary user question | Mental steps | Exceeds 3-step limit? | If yes, why? |
|--------|------------------------|--------------|------------------------|--------------|
| **Hero** | What is this place? Can I go now? | 1–2 | ☐ Yes ☑ No | — |
| **ActionStrip** | How do I get there / contact? | 1 | ☐ Yes ☑ No | — |
| **HoursCard** | When is it open? | 1–2 (today visible; expand for week) | ☐ Yes ☑ No | — |
| **DescriptionCard** | What’s the vibe / story? | 1–2 | ☐ Yes ☑ No | — |
| **VibeCard** | What’s the feel? | 1 | ☐ Yes ☑ No | — |
| **CoverageCard** | What do critics say? | 1–2 | ☐ Yes ☑ No | — |
| **GalleryCard** | What does it look like? | 1 | ☐ Yes ☑ No | — |
| **AlsoOnCard** | Where else can I find this? | 1–2 | ☐ Yes ☑ No | — |

---

## 4. Functional Proximity & Grouping

| Question | Answer |
|----------|--------|
| Are related data points physically grouped? | ☑ Consistently ☐ Inconsistently ☐ Rarely |
| Examples where related information is separated | **Status** (hero) vs **full hours** (HoursCard in grid) — acceptable; hero answers "now", card answers "when". **Website** — in ActionStrip only via Instagram; standalone website link not in ActionStrip (LinksCard not implemented). |
| Observed impact | Generally coherent. User can answer "open now" in hero, then drill into hours in grid. Website as primary link is missing. |

---

## 5. Density & Emphasis Balance

| Question | Answer |
|----------|--------|
| Are high-utility facts the most immediately legible elements? | ☑ Yes ☐ No |
| Does qualitative/editorial content compete with operational facts? | ☐ Yes ☑ No |
| Where does density feel misaligned with importance? | Hero (name, status) and ActionStrip (Nav, Call) are prominent. Bento grid uses tiered ordering (hours → description → vibe → press → gallery). Editorial (CoverageCard) can be large; quote length drives span (3–5 cols) but is visually subordinate to hero. |

---

## 6. Missing Data & Degradation Behavior

| Question | Answer |
|----------|--------|
| Which data types are frequently missing? | ☑ Hours (or irregular) ☑ Editorial ☑ Experience signals ☐ Other |
| When data is missing, does the page remain coherent? | ☑ Yes ☐ Mostly ☐ No |
| Does the system: | ☑ Omit missing data cleanly (cards return `null`) ☐ Show explicit "unknown" states ☐ Leave confusing gaps |

**Notes:** Cards are conditionally rendered; no empty shells. Irregular hours → "Hours vary". No explicit "Unknown" or "Unverified" for missing hours or editorial. Reservation URL exists in data but ReservationsCard not implemented.

---

## 7. Metadata & Trust Calibration

| Question | Answer |
|----------|--------|
| Is freshness / confidence metadata present? | ☐ Yes ☑ No |
| If present, is it: | ☐ Contextual (attached to volatile facts) ☐ Global / detached ☐ Decorative |
| Does metadata meaningfully prevent wrong decisions? | ☐ Yes ☑ No |

**Notes:** `published_at`, `trust_level` exist in editorial source types but are not displayed in `CoverageCard`. No last-verified date for hours. No trust/freshness signals for status or editorial.

---

## 8. Scanning Path Support

| Question | Answer |
|----------|--------|
| Does the page support both surgical scanning and browsing? | ☑ Yes ☐ No |
| Can regions be understood independently when entered mid-page? | ☑ Yes ☐ No |

**Notes:** Hero + ActionStrip support fast scanning for identity and action. Bento cards have labels (HOURS, CURATOR'S NOTE, VIBE, etc.). Natural grid flow; regions are self-contained.

---

## 9. Region Integrity Test

| Region | Can it be removed without breaking the page? | Notes |
|--------|---------------------------------------------|-------|
| **Identity** (Hero name, meta, status) | ☐ Yes ☑ No | Core; page loses meaning |
| **Status** (open/closed in hero) | ☐ Yes ☑ No | Critical for "go now" decision |
| **ActionStrip** | ☐ Yes ☑ No | Primary completion actions |
| **HoursCard** | ☐ Yes ☑ Partially | Page works without; weakens feasibility |
| **Experience** (Description, Vibe, Coverage) | ☑ Yes ☐ No | Enhances prediction; optional |
| **Gallery** | ☑ Yes ☐ No | Optional visual |
| **AlsoOn** | ☑ Yes ☐ No | Discovery; optional |

---

## 10. Summary Evaluation

### Strengths

- **Hero** answers identity and "can I go now" quickly (name, meta, status, photo).
- **ActionStrip** separates primary actions (Nav, Call, Insta) from content.
- **Tiered layout** (System B) orders content by decision priority.
- **Facts vs. interpretation** are labeled (Curator's Note, About, Coverage).
- **Graceful degradation**: missing cards omitted; irregular hours → "Hours vary".
- **Scanning**: labels and structure support both quick lookup and browsing.

### Friction Points

- No **Save** action on merchant page (deferred).
- No **Reservations**, **Links**, or **Phone** cards despite resolver support.
- No **freshness/confidence** metadata; users can’t assess reliability.
- **Website** link not surfaced in ActionStrip (would require LinksCard).
- **Category** sometimes replaced by meal context; may feel inconsistent.

### Misalignments with Decision-Support Principles

1. **Trust calibration absent** — No freshness or confidence for hours, editorial, or status; increases risk of wrong "go now" decisions.
2. **Reservations and links deferred** — `reservationUrl` and `links` exist in resolver data but cards are unimplemented; high-value actions missing.
3. **Save deferred** — No add-to-list on place page; reduces actionability for list-oriented users.

---

## 11. Open Questions for Comparison

- Which user questions are implicitly assumed but not explicitly supported?  
  - "Do I need a reservation?" (reservationUrl present, card not shown)  
  - "Is this info up to date?" (no freshness)
- Which regions exist without a clear decision they enable?  
  - **QuietCard** (gap fill) — decorative; no decision.
- If one region were simplified or removed, which would most improve clarity?  
  - Reducing or reframing **CoverageCard** when quote is long could help; it can compete for attention. **QuietCard** is already minimal.

---

## 12. Evaluator Conclusion (Freeform)

Based on this audit, the current merchant page behaves primarily as:

- ☑ **A decision-support engine** (primary)
- ☐ An informational directory
- ☐ A brand/editorial surface
- ☐ A mixed system with unclear priorities

**Explanation:** The page is structured around core decisions (identity, status, action) with editorial content in support. Hero and ActionStrip prioritize "what is this" and "what do I do next." The System B tiering (hours, description, vibe, press, gallery) reflects decision importance. The main gaps are trust calibration, unimplemented high-value actions (reservations, links, save), and website visibility — not a fundamental shift away from decision-support.

---

## Appendix: Code References

| Element | Path |
|---------|------|
| Place page | `app/(viewer)/place/[slug]/page.tsx` |
| Hero | `components/merchant/HeroSection.tsx` |
| ActionStrip | `components/merchant/ActionStrip.tsx` |
| Layout resolver | `lib/utils/PlacePageLayoutResolver.systemB.ts` |
| API | `app/api/places/[slug]/route.ts` |
| Action-set (Save deferred) | `lib/action-set.ts` |
