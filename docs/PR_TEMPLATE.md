# Saiko PR Template
Version: 1.0
Owner: Ken
Status: Active

This template is mandatory for all PRs (human or Cursor-generated).
Goal: fast review, high signal, no fluff, no speculation.

---

## Title Format
- Start with area prefix: `DB:`, `Fix:`, `Feat:`, `Chore:`, `Docs:`, `Refactor:`
- Then the change, in plain language
- Example: `DB: Add baseline migration to match existing schema`

---

## PR Body (Required Sections)

## What
1–3 sentences. Describe the change only. No adjectives, no narrative.

## Why
State the problem being solved and why now. 1–3 sentences.

## Changes
Bullet list of concrete changes. Prefer file paths and specific objects.
- `prisma/schema.prisma`: ...
- `docs/...`: ...
- `components/...`: ...

## Verification
List exactly what was run and what passed.
Include commands and results.
- `npx prisma migrate status` → Database schema is up to date
- `npm run build` → pass
- Tests: `npm test` / `pnpm test` → pass (if applicable)

## Risk
Answer with Yes/No. If Yes, add one line explaining containment.
- Data changes: Yes/No
- Schema changes: Yes/No
- Behavior changes: Yes/No
- Backward compatibility risk: Yes/No

## Notes
Anything intentionally excluded, follow-ups, or sequencing requirements.
Example: "TypeScript fix intentionally excluded; separate PR follows."

---

## Forbidden Content
- No "great news", "excited", emojis, or hype
- No speculative claims ("should", "likely", "probably")
- No new scope proposals
- No unrelated context
- No links unless necessary for verification

---

## Cursor Generation Prompt (Copy/Paste)
Use this when asking Cursor to write a PR:

"Write a PR using `/docs/PR_TEMPLATE.md`. Strictness: High.
No fluff. No speculation. Only factual changes.
Keep What/Why to max 3 sentences each.
Include Verification commands actually run and their outcomes.
Risk section must be Yes/No with one-line containment if Yes."
