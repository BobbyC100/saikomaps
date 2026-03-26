---
doc_id: SKAI/FEATURE-LIST-V2
doc_type: planning
title: SKAI 2.0 Feature List
version: "0.1-draft"
status: draft
owner: Bobby Ciccaglione
created: 2026-03-26
last_updated: 2026-03-26
project_id: KNOWLEDGE-SYSTEM
systems:
  - knowledge-system
summary: >
  Feature list for SKAI 2.0, organized into tiers. Covers retrieval upgrades,
  multi-turn chat, doc linking, onboarding support, and answer quality
  improvements built on top of the SKAI 1.0 foundation.
---

# SKAI 2.0 Feature List (Draft)

## Context

SKAI 1.0 is the knowledge-and-architecture retrieval surface for Saiko. Today it
handles single questions against 129+ indexed docs using lexical (keyword)
matching, returns grounded answers with citations, and supports answer/learn
modes at three depth levels.

This feature list defines what SKAI 2.0 should add, organized by priority tier.

### What's driving 2.0

- Answer quality needs to improve — lexical matching misses conceptual relevance
- The audience is broadening beyond Bobby to cross-functional team and onboarding
- Single-shot Q&A isn't enough — follow-up questions and refinement matter
- Answers should link back to source docs so people can go deeper

### Current limitations being addressed

- No semantic understanding (keyword-only matching)
- No conversation memory (every question is standalone)
- No links to source documents in answers
- UI is functional but minimal — not built for broader adoption
- No feedback loop to improve retrieval quality over time

---

## Tier 1 — Core (ships first)

### 1.1 Multi-turn chat with session memory

What: Replace the single-question UI with a conversational interface that
maintains context across a session. Follow-up questions like "what about the
enrichment part?" should work without re-stating the full context.

Why: The current UI forces users to front-load everything into one question.
Real understanding happens through follow-ups.

Implementation notes:
- New Prisma models: `skai_conversation`, `skai_message`
- Conversation context window sent to Claude on each turn
- Session-scoped (not persistent across days unless we decide otherwise)
- Preserve existing answer/learn mode and depth controls per-message

### 1.2 Source doc links (Cursor-compatible)

What: Every citation in an answer becomes a clickable link that opens the
source markdown file locally in Cursor.

Why: Citations are already extracted and displayed. Making them actionable
closes the loop — you read the answer, then go to the source if you want depth.

Implementation notes:
- Map `doc_id` → file path using `registry.json` `path` field (already available)
- Generate `vscode://file/...` URIs (Cursor supports the vscode:// protocol)
- Display as clickable links in the chat UI next to each citation
- Fallback: show the relative file path as copyable text if link can't resolve

### 1.3 Answer quality improvements (prompt + retrieval tuning)

What: Improve the quality and usefulness of answers without changing the
retrieval engine. Focus on prompt engineering and context formatting.

Why: Fastest path to better answers. The current prompt is solid but can be
refined for the broader audience.

Specific improvements:
- Chunk context ordering: present highest-relevance chunks first in the prompt
- Add doc metadata (title, doc_type, systems) to each chunk's context block
  so the model can reason about what kind of document it's citing
- Refine the system prompt for clarity when the user is new to the system
  (less jargon-heavy framing, more explanatory)
- Add a "confidence signal" to answers: when retrieval scores are low,
  explicitly tell the user "I found limited relevant docs for this question"
- Improve learn mode to produce more structured explanations with progressive
  disclosure (start simple, go deeper)

### 1.4 Improved chat UI

What: Clean, usable chat interface designed for broader internal adoption.

Why: The current UI is a developer prototype. For cross-functional and
onboarding use, it needs to feel approachable.

Key elements:
- Message thread layout (user messages + SKAI responses in sequence)
- Inline citation chips that link to source docs (see 1.2)
- Mode/depth controls accessible but not in the way
- Loading states and error handling that make sense to non-engineers
- Mobile-friendly (people will use this on phones during onboarding)

---

## Tier 2 — Retrieval upgrades

### 2.1 Semantic (vector) search

What: Add embedding-based retrieval so SKAI matches on meaning, not just
keywords. When someone asks "how does data quality get tracked" it should find
docs about confidence scoring and provenance even if those exact words aren't
used.

Why: This is the single biggest retrieval quality upgrade. Lexical search hits
a ceiling when the person asking doesn't already know the system's vocabulary —
which is exactly the case for the broader audience.

How it works (plain English):
- Each doc chunk gets converted into a numerical "fingerprint" that captures
  its meaning (called an embedding)
- When a question comes in, it gets the same treatment
- We find chunks whose fingerprints are closest to the question's fingerprint
- This means "enrichment pipeline" matches "how data gets processed" even
  though the words are completely different

Implementation notes:
- Add a `vector` column to `skai_chunks` (pgvector extension)
- Generate embeddings at index time (Anthropic or OpenAI embeddings API)
- Hybrid retrieval: combine lexical score + vector similarity score
- Re-rank results using the combined score before passing to the LLM
- Rebuild the chunk indexing pipeline (currently chunks don't exist in Prisma)

### 2.2 Chunk indexing pipeline

What: Build the actual `skai_chunks` table and a pipeline that splits docs
into retrievable chunks with metadata.

Why: Today the system falls back to registry.json and scores whole documents
by token overlap. Real chunk-level retrieval (which the query.ts code already
expects) will dramatically improve precision.

Implementation notes:
- Add `SkaiChunk` model to Prisma schema
- Build an indexing script that: reads each doc from the registry, splits into
  semantic chunks (by heading/section), stores with doc_id + metadata
- Run on doc changes (manual or CI hook)
- This is a prerequisite for vector search (2.1) but valuable on its own
  even with just lexical matching

### 2.3 Metadata-aware filtering in the UI

What: Let users filter by system (fields, traces, data-layer, enrichment, etc.)
and doc type (architecture, decision, reference) directly in the chat UI.

Why: Power users (Bobby, engineers) know what part of the system they're asking
about. Filtering narrows retrieval and improves answer relevance.

Implementation notes:
- The API already supports `category` and `systems` filters
- Surface these as optional filter chips or dropdowns in the chat UI
- Pre-populate from registry.json's known values

---

## Tier 3 — Adoption + feedback

### 3.1 Onboarding mode

What: A guided experience for new team members that walks them through
Saiko's architecture using SKAI. Not just "ask anything" — structured
entry points like "What is the Data Layer?" → "How do Fields work?" →
"What is TRACES?"

Why: The broader internal audience includes people joining the team who
need to learn the system. A curated starting path reduces the blank-page
problem.

Implementation notes:
- Predefined question sequences or topic cards on the SKAI landing page
- Each card kicks off a chat session scoped to that topic
- Could be as simple as suggested prompts, or as structured as a guided flow

### 3.2 Answer feedback mechanism

What: Thumbs up/down on each answer, with optional text feedback. Store
it for review.

Why: Without a feedback loop there's no way to know which answers are
actually useful and which retrieval gaps exist. This is the foundation
for iterative improvement.

Implementation notes:
- New Prisma model: `skai_feedback` (message_id, rating, comment, created_at)
- Simple UI: thumbs up/down below each answer
- Admin view or export for Bobby to review feedback periodically

### 3.3 Doc coverage dashboard

What: A simple view showing which docs are indexed, when they were last
updated, and whether they have chunks. Surface gaps.

Why: As the doc corpus grows, knowing what SKAI can and can't answer
becomes important. Also useful for identifying stale docs.

Implementation notes:
- Read from registry.json + skai_chunks table
- Show: total docs, docs with chunks, last indexed date, docs by system
- Flag docs with no chunks or outdated timestamps

### 3.4 Query log + analytics

What: Log every question asked, the retrieval scores, and whether the
user found the answer useful (ties into 3.2).

Why: Understand what people are actually asking. Identify retrieval gaps
(low-score queries), popular topics, and unanswered questions.

Implementation notes:
- New Prisma model: `skai_query_log`
- Log: question, retrieved doc_ids, scores, timestamp, user (if auth exists)
- Simple admin dashboard or export

### 3.5 Answer benchmarking and eval framework

What: A repeatable way to measure whether SKAI answers are getting better
or worse as retrieval and prompts change. A fixed set of test questions with
known-good answers, scored automatically.

Why: Without a benchmark, every change to retrieval, chunking, or prompts
is a guess. You need a baseline to measure against and a way to catch
regressions before they ship.

How it works:
- Build a **golden question set**: 30–50 questions that cover the key areas
  of the system (data layer, fields, traces, enrichment, identity, signals,
  decisions, product policy). These are questions you already know the right
  answer to.
- For each question, define:
  - **Expected doc_ids**: which docs should be retrieved (retrieval accuracy)
  - **Expected answer content**: key facts or statements the answer must
    include (answer quality)
  - **Expected non-content**: things the answer should NOT say (hallucination
    check)
- Build a scoring script that:
  1. Runs each question through the SKAI API
  2. Checks retrieval: did the right docs come back? (precision + recall on
     doc_ids)
  3. Checks answer: does the answer contain the expected key facts? Does it
     avoid the non-content?
  4. Scores each answer on a simple scale (e.g., retrieval hit rate, fact
     coverage rate, hallucination rate)
  5. Produces a summary report: overall score, per-category scores, regressions
     vs. last run

Implementation notes:
- Golden set stored as a JSON file in the repo (e.g., `docs/skai/eval/golden-questions.json`)
- Eval script: `scripts/skai-eval.ts` — runs the full set, outputs a report
- Can be run manually before merging retrieval changes, or in CI
- Track scores over time so you can see the trend line
- Start simple: even 20 well-chosen questions with expected doc_ids is enough
  to catch major regressions

Categories to cover in the golden set:
- Layer boundaries (data layer vs. fields vs. traces)
- Signal/confidence model
- Enrichment rules
- Identity/place rules
- Product policy (e.g., Google ratings restriction)
- Decision records (specific DEC-NNN lookups)
- Cross-cutting concepts (provenance, temporal state, reversibility)
- "New person" questions (what is SKAI, how do the systems connect)

---

## Tier 4 — Future considerations (not committed)

These are ideas worth tracking but not planned for the 2.0 scope.

- **Doc-aware re-indexing on commit**: auto-reindex chunks when docs change in
  the repo (CI integration)
- **Cross-doc relationship traversal**: when an answer cites doc A which
  references doc B, surface doc B as "related reading"
- **Slack integration**: ask SKAI questions from Slack
- **Role-based answer depth**: automatically adjust answer complexity based
  on whether the user is an engineer, PM, or new hire
- **Write-back suggestions**: when SKAI can't answer something, suggest
  that a doc should be written to cover the gap

---

## Open questions

1. **Session persistence**: Should chat sessions persist across days, or reset?
   Persistent sessions are useful for ongoing learning; ephemeral sessions are
   simpler and avoid stale context.

2. **Auth**: Does SKAI need user identity? Currently no auth model. Needed for
   feedback attribution and role-based features.

3. **Embedding provider**: Anthropic embeddings vs. OpenAI embeddings vs.
   open-source (e.g., Voyage, Cohere). Cost, quality, and vendor alignment
   considerations.

4. **Chunk strategy**: How to split docs — by heading, by paragraph, by fixed
   token count? Heading-based feels natural for structured architecture docs.

5. **Hosting**: Is the current Next.js setup sufficient for broader internal
   use, or does this need a more accessible deployment?
