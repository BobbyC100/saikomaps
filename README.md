---
doc_id: SAIKO-ROOT-README
doc_type: overview
status: active
owner: Bobby Ciccaglione
created: '2026-01-01'
last_updated: '2026-03-14'
project_id: SAIKO
summary: >-
  Top-level project README for Saiko Maps — data-first location intelligence
  platform overview, key directory structure, and development entry point.
systems:
  - platform
related_docs:
  - docs/APP_OVERVIEW.md
  - docs/LOCAL_DEV.md
category: product
tags: [places, pipeline, entities]
source: repo
---

Saiko Maps

Data-first location intelligence platform built on the Saiko Fields dataset.

Key directories

app/            Next.js application (UI + routes)
components/     reusable UI components
lib/            core business logic and data pipelines
data/           datasets and pipeline artifacts
scripts/        operational scripts
tests/          automated tests
prisma/         database schema and migrations
docs/           engineering documentation
ai-operations/  AI session logs and system state