---
doc_id: SYS-RESEARCH-FORMAT-V1
doc_type: system
status: active
owner: Bobby Ciccaglione
created: '2026-03-16'
last_updated: '2026-03-16'
project_id: KNOWLEDGE-SYSTEM
systems:
  - knowledge-system
  - repo-workflow
summary: >-
  Defines the standard format for research documents ingested into the Saiko
  knowledge base
---
# Research Document Format

## Purpose

Defines the standard format for research documents ingested into the Saiko knowledge base. Research documents are synthesis artifacts — they compile findings from external sources, editorial analysis, and community intelligence into structured knowledge that informs future architecture, product design, and signal model decisions.

Research documents are distinct from architecture docs (which specify current system behavior) and domain specs (which define vocabulary and contracts). Research captures **what we learned** and **what it implies**, not **what the system does**.

## Directory and Naming

- **Location:** `docs/research/`
- **Filename pattern:** `{topic-slug}-v{N}.md` (e.g., `cuisine-traditions-signals-v1.md`)
- **Doc ID prefix:** `RES-` (e.g., `RES-CUISINE-TRADITIONS-V1`)
- **Doc type:** `research`

The `docs-registry.ts` scanner discovers research docs automatically — no script changes needed.

## Frontmatter Schema

### Standard fields (required — same as all canonical docs)

| Field | Type | Description |
|-------|------|-------------|
| `doc_id` | string | `RES-{DESCRIPTIVE-NAME}-V{N}` |
| `doc_type` | string | Always `research` |
| `status` | enum | `active`, `draft`, `superseded`, `archived` |
| `owner` | string | Document owner |
| `created` | date | Creation date (YYYY-MM-DD) |
| `last_updated` | date | Last modification date |
| `project_id` | string | Which project this informs (SAIKO, TRACES, etc.) |
| `systems` | array | System tags for cross-indexing |
| `related_docs` | array | File paths to related canonical docs |
| `summary` | string | One-line summary of the research |

### Research-specific fields (optional but recommended)

| Field | Type | Description |
|-------|------|-------------|
| `research_domain` | string | Area of product/system this informs (e.g., `offering-signals`, `scenesense`, `coverage-ops`) |
| `source_types` | array | Kinds of sources consulted: `academic`, `editorial`, `industry-taxonomy`, `food-community`, `primary-observation`, `trade-publication` |
| `actionable` | boolean | Whether the doc contains concrete implementable recommendations |
| `informs_docs` | array | Forward pointers to docs this research should feed into (can reference future/planned docs) |

## Body Template

```markdown
# {Title}

## Overview
1-2 paragraph executive summary. What was researched, why, and the key finding.

## Findings
Organized by theme, not by source. Each section synthesizes across sources.

### {Finding Theme 1}
...

### {Finding Theme 2}
...

## Signal / Design Implications
What this means for Saiko's data model, product, or operations. Concrete proposed signals, fields, or architectural changes.

## Recommendations
Numbered, actionable items. Each should be implementable or testable.

## Sources
Bulleted list grouped by type. Enough to trace provenance, not academic citation format.

### Editorial
- Source — topic/list

### Academic / Industry
- Author/org — title or description

### Community / Primary
- Forum/community — topic
```

## Promotion Workflow

Research documents follow the standard promotion path:

1. Research is conducted in a chat session or external tool
2. Findings are compiled into the body template above
3. Human approves promotion
4. Promote via:

```bash
npm run docs:promote -- \
  --path docs/research/{topic-slug}-v1.md \
  --content /path/to/draft.md \
  --doc-id RES-{NAME}-V1 \
  --doc-type research \
  --project-id {PROJECT} \
  --status active \
  --summary "{one-line summary}" \
  --systems {system1},{system2}
```

5. Run `npm run docs:registry` to update registry

## When to Create a Research Document

A research doc should be created when:

- **External research was conducted** that produced findings relevant to product or system design
- **A cross-cutting analysis** synthesized information from multiple sources into a coherent framework
- **Signal vocabulary or taxonomy work** produced candidate terms, categories, or classification schemes
- **Competitive or landscape analysis** produced reusable intelligence

A research doc should NOT be created for:

- One-off observations or opinions (keep in session notes)
- Implementation decisions (use architecture docs)
- Vocabulary definitions without supporting research (use domain specs)
- Status updates or progress reports

## Versioning

Research documents version like all canonical docs. If new research significantly updates or contradicts a prior doc:

1. Create `{topic}-v2.md` with updated findings
2. Patch the v1 doc's status to `superseded` via `apply-doc-patch`
3. Reference v1 in v2's `related_docs`
