---
doc_id: SYS-DRAFT-TRIGGER-V1
doc_type: system
status: active
owner: Bobby Ciccaglione
created: 2026-03-10
last_updated: 2026-03-10
project_id: KNOWLEDGE-SYSTEM
systems:
  - knowledge-system
  - repo-workflow
related_docs:
  - docs/system/knowledge-control-workstream-2026-03-10.md
summary: Defines when reusable knowledge must become a controlled draft.
category: operations
tags: [skai, registry]
source: repo
---

# Draft Trigger v1

## Purpose

Define the exact moment when knowledge must stop living only in chat and begin existing as a controlled draft.

## Rule

A draft is created when a conversation or work session produces knowledge that is likely to be reused, referenced, or governed later.

## Trigger Conditions

A draft must be created when any one of these happens.

### 1. New named artifact requested

Examples:

- "write the spec"
- "draft the workstream snapshot"
- "create the policy doc"
- "make the decision record"

This means the work has crossed from discussion into artifact creation.

### 2. Existing canonical doc needs non-trivial change

Examples:

- new section
- changed position or recommendation
- changed workflow
- changed metadata model
- changed system behavior

A trivial typo fix does not trigger a draft.  
A meaningful content change does.

### 3. Reusable knowledge emerges from discussion

Examples:

- architecture conclusion
- research synthesis
- operating rule
- policy
- workflow definition
- naming or metadata standard

If the knowledge is likely to matter outside the current chat, it should become a draft.

## What does not trigger a draft

These do not require draft creation by default:

- brainstorming fragments
- incomplete notes
- throwaway examples
- temporary explanation text
- unresolved ideas with no clear artifact yet

## Draft Output

When triggered, the system must produce a draft container with at least:

```yaml
doc_type:
project_id:
draft_source:
proposed_title:
proposed_path:
```

`draft_source` values:

- `chat`
- `cursor`
- `manual`
- `imported`

## Draft State

All drafts begin as:

```yaml
status: draft
```

They are not canonical.
They are candidates for promotion.
