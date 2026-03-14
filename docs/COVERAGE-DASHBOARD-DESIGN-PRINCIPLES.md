---
doc_id: SAIKO-COVERAGE-DASHBOARD-DESIGN-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: 2026-03-13
last_updated: 2026-03-13
project_id: SAIKO
systems:
  - admin
  - coverage-dashboard
related_docs:
  - docs/ENRICHMENT-OPERATIONS-INVENTORY.md
  - docs/ENTITY-PROFILE-SPEC.md
summary: Design principles for the Coverage Dashboard — a work surface for resolving data gaps, organized by solution type (automated vs. semi-automated vs. human-only) rather than by missing field.
---

# Coverage Dashboard — Design Principles

## Purpose
The Coverage Dashboard is a work surface, not a diagnostic report. Someone arrives here to fix problems and leave with fewer of them.

## The Core Rule
Every number shown must either confirm things are healthy or tell you what kind of action is needed. If a number doesn't imply an action, it doesn't belong on the page.

## Dumb count vs. smart count
Dumb: "36 records missing neighborhood"
Smart: "33 can be auto-fixed via Google Places enrichment — 6 need a human"

The difference: a smart count tells you who does the work — the system or you.

## Problem grouping principle
Group problems by solution, not by field. The universe of solutions is constrained to the tools that exist. Design Coverage from the tools outward, not from the missing fields inward.

## Automation first
Automated operations run before any human review. Human work is reserved for what the system genuinely cannot resolve. The page should make it obvious which bucket each problem falls into.

## Operations inventory (as of March 2026)
Automated:
- Google Places enrichment — given a GPID, fetches address, coords, neighborhood, phone, hours, website
- Neighborhood reverse lookup — given coords, derives neighborhood

Semi-automated (system proposes, human confirms):
- GPID matching — system finds candidate, human approves
- Instagram handle finder — AI-assisted, human confirms
- Photo fetch and eval — system pulls Google photos, human tags

Human only:
- Editorial fields — description, TimeFOLD signal
- Manual field entry — anything system cannot find

## Key insight (March 2026)
If a record has a GPID, neighborhood can be derived automatically via Google Places. "Missing neighborhood" is not always a human problem. 33 of 49 missing-neighborhood records had GPIDs and could be auto-resolved. Always check what the system can fix before surfacing a problem to a human.
