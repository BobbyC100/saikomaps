---
doc_id: SYS-PROMOTION-FLOW-V1
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
  - docs/system/draft-trigger-v1.md
  - docs/system/knowledge-control-workstream-2026-03-10.md
summary: Defines the controlled path from approved draft to canonical document.
---

# Promotion Flow v1

## Purpose

Define the controlled path from approved draft to canonical document.

## Rule

Nothing becomes canonical until it passes through the promotion flow.

## Input

The promotion flow starts when Bobby explicitly approves a draft.

Approval language can be simple:

- "promote this"
- "make this canonical"
- "add this to the system"
- "update the canonical doc"

## Flow

### Step 1. Identify intent

The system first determines which of these actions applies:

- `create_new`
- `update_existing`
- `supersede_existing`
- `reject`

The system may suggest the action, but Bobby is final authority.

### Step 2. Run collision check

The system checks for likely overlap using:

- exact `doc_id`
- exact path
- fuzzy title match
- fuzzy filename match
- `project_id` overlap
- `related_docs` overlap

For v1, collision check is warning-only.  
It does not auto-decide.

### Step 3. Select canonical target

One of two outcomes follows.

#### New canonical doc

The system proposes:

- path
- title
- `doc_type`
- `project_id`

#### Existing canonical doc update

The system identifies the target doc and the update type:

- frontmatter update
- section replace
- body append
- superseding version

### Step 4. Normalize metadata

Before writing, the system ensures the document has the canonical envelope:

```yaml
doc_id:
doc_type:
status:
owner:
created:
last_updated:
project_id:
systems:
related_docs:
summary:
```

For workstream docs only, optionally:

```yaml
workstream_state:
```

### Step 5. Apply repo change

The system writes the file or updates the existing one through the repo layer.

Allowed v1 outcomes:

- create new markdown file
- apply frontmatter patch
- apply section replacement patch

### Step 6. Register canonical doc

If a registry exists, update it.
If no registry exists yet, the repo file itself becomes the canonical source and the registry step is deferred.

### Step 7. Mark result

The document must end in one of these states:

- `status: active`
- `status: superseded`
- `status: archived`

A promoted doc cannot remain ambiguous.

## Output

A successful promotion produces:

- one canonical file path
- one canonical doc state
- one clear relation to existing docs
- zero ambiguity about which version governs

## Failure Conditions

Promotion must stop and ask for a decision if:

- two likely canonical targets are found
- no valid target can be identified
- `doc_type` cannot be inferred reasonably
- update would overwrite a different active document without confirmation

## Behavioral Rule

A workstream is not cleanly closed until any approved draft has either:

- been promoted
- been explicitly rejected
- been explicitly left in draft

No silent in-between state.
