# Documentation Policy

**Version:** 1.0  
**Owner:** Ken  
**Status:** ACTIVE  
**Last updated:** 2026-02-15

---

## Purpose

This policy governs how documentation is created, maintained, and referenced in the Saiko Maps codebase.

Goal: Keep docs tight, factual, and canonical. No drift between spec and code.

---

## Document Types

### 1. Feature Specifications (SPEC)

**Location:** `/docs/features/{feature-name}/SPEC_v{X.Y}.md`

**Required Header:**
```markdown
# {Feature Name} — SPEC v{X.Y}

**Version:** {X.Y}
**Owner:** {Name}
**Status:** ACTIVE | DEPRECATED | SUPERSEDED
**Last verified vs code:** {YYYY-MM-DD}
**Canonical path:** /docs/features/{feature-name}/SPEC_v{X.Y}.md
```

**Content Rules:**
- Summary: 2-3 sentences max
- Scope: What's included, what's excluded
- Schema changes: Exact Prisma syntax
- API changes: Exact file paths and code snippets
- Acceptance criteria: Testable statements only
- No speculation, no timelines, no "should" language

**Version Updates:**
- Increment minor (0.1) for clarifications, small additions
- Increment major (1.0) for breaking changes or major rewrites
- Never edit a spec that's been shipped. Create new version.

### 2. Design System Docs

**Location:** `/docs/` (root level)

**Examples:** `BENTO_CARD_DESIGN_PATTERNS.md`, `MERCHANT_PAGE_GRID_SYSTEM_V1.md`

**Purpose:** Visual patterns, component structure, grid systems

**Update Frequency:** As needed when design patterns change

### 3. Process Docs

**Location:** `/docs/` (root level)

**Examples:** `PR_TEMPLATE.md`, `DOC_POLICY.md`

**Purpose:** Team workflows, review standards, commit conventions

**Update Frequency:** When team processes evolve

### 4. Reference Docs

**Location:** `/docs/` (root level)

**Examples:** `DATABASE_SCHEMA.md`, `SITEMAP.md`, `APP_OVERVIEW.md`

**Purpose:** System architecture, routing structure, database schema

**Update Frequency:** When underlying systems change significantly

---

## Canonical Index

**File:** `/docs/INDEX.md`

**Rules:**
1. All active docs MUST be listed in INDEX.md
2. Deprecated docs move to "Deprecated / Historical" section
3. Update INDEX.md in same commit as new doc
4. Group by type: Architecture, Design, Features, Process, Reference
5. Include one-line description for each entry

---

## Conflict Resolution

### When Code and Spec Diverge

**Rule:** Production code is canonical.

**Process:**
1. Identify the divergence
2. Determine if code or spec is correct
3. If code is correct: Update spec or create new version
4. If spec is correct: Create PR to align code
5. Document the resolution in commit message

**Never silently edit specs to match code without acknowledgment.**

---

## Documentation Standards

### Language

- Use present tense
- Be direct and factual
- No marketing language or hype
- No emojis (except in user-facing content if explicitly requested)
- No speculation ("should", "probably", "likely")

### Structure

- Use headers for scanability
- Use code blocks with language tags
- Use bullet lists for concrete items
- Use tables for comparison data
- Include file paths for all code references

### Examples

**Good:**
```markdown
Add `placeType` field to places table.
Update `/api/places/[slug]` to expose classification fields.
```

**Bad:**
```markdown
We should probably add a placeType field to help classify venues.
This will make it easier to handle different types of places going forward.
```

---

## Cursor Integration

When generating PRs or implementing features, Cursor agents should:

1. Check `/docs/INDEX.md` first to find relevant specs
2. Read the spec completely before starting work
3. Follow spec exactly as written
4. If spec is unclear, ask for clarification (don't guess)
5. If code diverges from spec, flag it immediately

**Handoff Format:**
"Implement feature using `/docs/features/{name}/SPEC_v{X.Y}.md`. 
Follow exactly. Flag any conflicts with production code."

---

## Maintenance

### Quarterly Review

Every quarter, review:
- Are all active docs still relevant?
- Do specs match production code?
- Should any docs be deprecated?
- Is INDEX.md up to date?

### Deprecation Process

1. Mark doc header: `**Status:** DEPRECATED`
2. Add deprecation reason and date
3. Link to replacement doc (if any)
4. Move to "Deprecated / Historical" in INDEX.md
5. Do not delete (keep for historical context)

---

## Questions

If unclear on documentation standards or policy, ask Ken.

Do not improvise or assume.
