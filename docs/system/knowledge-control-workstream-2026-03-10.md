---
doc_id: SYS-KNOWLEDGE-CONTROL-WORKSTREAM-2026-03-10
doc_type: system
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-10'
project_id: KNOWLEDGE-SYSTEM
systems:
  - knowledge-system
  - boot-system
summary: >-
  Workstream template and progress snapshot for the knowledge control system — defines a standard format for capturing workstream goals, decisions, infrastructure, state changes, gaps, and resume instructions for Boot continuity.
related_docs:
  - docs/system/boot-context-inventory.md
  - docs/system/document-registry-audit.md
  - docs/skai/decision-index-spec-v1.md
  - docs/skai/research-ai-knowledge-architecture-v1.md
category: operations
tags: [skai, registry, ai-ops]
source: repo
---

docs/templates/workstream-template.md

Workstream Template
---
doc_id: TEMPLATE-WORKSTREAM
doc_type: template
status: active
owner: Bobby Ciccaglione
created: 2026-03-10
last_updated: 2026-03-10
project_id: ORG-SYSTEM
systems:
  - knowledge-system
related_docs: []
summary: Standard template for capturing workstream progress and next-session context.
---

# Workstream Progress Snapshot

Date: YYYY-MM-DD  
Workstream: <project name>  
Purpose: Capture the current state of a workstream so it can be resumed without reconstructing context.

---

# 1. Workstream Goal

Describe the purpose of the project or workstream.

Include:

• problem being solved  
• scope of this workstream  
• what success looks like

Example:

• establish document control system  
• enable automated knowledge indexing  
• support Boot-based context restoration

---

# 2. Starting State

Describe the system or repo before work began.

Include:

• existing infrastructure  
• relevant scripts  
• existing documents  
• current limitations

Example structure:

Boot system
scripts/boot.ts
scripts/session-end.ts
scripts/session-start.ts
Decision system
docs/decisions/
scripts/decision-cli.ts
Known limitations:

• inconsistent metadata  
• no document registry  
• manual doc updates

---

# 3. Major Decisions

List architectural decisions made during the workstream.

## Decision Title

Explanation of the decision.

Reference documents if applicable.

Example:
docs/ski/BASE-002.md
---

# 4. Infrastructure Implemented

List systems or tools created during the session.

Example:

Document patch system
scripts/apply-doc-patch.ts
Command:
npm run docs:apply-patch – patch.json
Describe capabilities.

---

# 5. System Architecture (Current)

Describe how the system now works.

Example:
Session Layer
Boot Layer
Decision Layer
Document Layer
Explain relationships between components.

---

# 6. State Change

Describe the difference between start and finish.

Example:

Before

• manual document editing  
• no project grouping  
• no structured metadata  

After

• canonical metadata envelope  
• patch-based document updates  
• project_id grouping  

---

# 7. Known Gaps

List features intentionally not implemented yet.

Examples:

• document registry generator  
• project brief system  
• Boot → decision integration  
• postmortem system

---

# 8. Current Knowledge Corpus

List documents created or modified during the workstream.

Example:
docs/ski/BASE-002.md
docs/ski/BASE-004.md
docs/system/document-registry-audit.md
docs/system/workstream-progress.md
---

# 9. Workstream Status

Example values:

foundation established  
prototype stage  
feature complete  
awaiting integration

---

# 10. Next Step

Define the **next smallest logical improvement**.

Example:

Boot → decision retrieval
Boot
↓
read next_session_objective
↓
run kickoff retrieval
Estimated complexity if known.

---

# 11. Resume Instructions

What someone should do to resume work.

Example:

Run Boot:
npm run boot
Open progress doc:
docs/system/.md
Then continue with next step.

---

# End of Workstream Snapshot

How this becomes an 
Orgstream
Your organization eventually ends up with:
docs/
  templates/
    workstream-template.md

  system/
    knowledge-control-workstream-2026-03-10.md
    other-workstreams.md

  ski/
  decisions/
So every project has a consistent final capture.

Why this matters
It solves three problems:
1. Boot continuity
Boot can load the latest workstream snapshot.

2. Human continuity
You don’t have to reconstruct context the next day.

3. Machine retrieval
Future systems can query:
doc_type: workstream
project_id: X
and reconstruct project history.

Recommended tiny next step
Tomorrow’s first move should be:
Boot → decision retrieval integration
Because then Boot restores not just the session, but also architectural reasoning.


