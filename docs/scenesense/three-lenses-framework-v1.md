---
doc_id: SS-FW-001
doc_type: domain-spec
status: active
owner: Bobby Ciccaglione
created: '2026-03-12'
last_updated: '2026-03-12'
project_id: TRACES
systems:
  - scenesense
  - traces
summary: Defines the three universal lenses (Atmosphere, Energy, Scene) used by SceneSense to interpret restaurant environments.
related_docs:
  - docs/scenesense/atmosphere-lens-v1.md
  - docs/scenesense/energy-lens-v1.md
  - docs/scenesense/scene-lens-v1.md
  - docs/scenesense/glossary-v1.md
  - docs/scenesense/display-contract-v1.md
---
# Three Universal Lenses Framework

## Purpose

Define the universal interpretation framework used by SceneSense to describe how places are experienced.

SceneSense interprets restaurant environments through three lenses:

- Atmosphere
- Energy
- Scene

Each lens describes a different dimension of guest experience.

---

## Core Model

Dining environments contain three universal components:

| Component | Lens |
|-----------|------|
| Place | Atmosphere |
| Activity | Energy |
| People | Scene |

This mapping forms the conceptual foundation of SceneSense.

---

## Lens Roles

**Atmosphere** describes the physical and sensory qualities of the space.

**Energy** describes the activity level and temporal rhythm within the space.

**Scene** describes the social patterns of use and behavioral expectations.

---

## System Boundary

Restaurant information in Saiko exists in two layers.

### Programs (House Perspective)

Programs describe what the restaurant offers and operates.

Examples:

- food program
- beverage program
- service model
- price tier

Programs describe operations.

### SceneSense (Guest Perspective)

SceneSense interprets how the place is experienced once guests are present.

It does not describe offerings or operations.

Instead it interprets:

- environment
- activity
- social use

---

## Signal Ownership

### Programs

| Signal | Examples |
|--------|----------|
| food_program | wood-fired cooking, sushi counter |
| beverage_program | natural wine list, craft cocktails |
| service_model | full-service, counter-service, bar-service |
| price_tier | $, $$, $$$, $$$$ |

Programs describe what the restaurant operates and sells.

### SceneSense

**Atmosphere** (environmental signals):

- lighting
- noise
- density
- spatial layout
- seating style
- material feel

**Energy** (activity signals):

- crowd intensity
- movement
- tempo
- busy windows
- daypart activity

**Scene** (social signals):

- dining posture
- group patterns
- social role
- formality
- social register

---

## Programs Influence SceneSense

Programs are not SceneSense. But program signals can inform interpretation.

Example: `price_tier = $$$$` may increase the probability of descriptors like `formal dining` or `special-occasion dining`. But the descriptor belongs to Scene, not Programs.

Programs describe the restaurant's operating model. SceneSense describes how the space behaves socially once guests arrive.

---

## Observational Principle

SceneSense descriptors must describe observable conditions.

Descriptors avoid:

- opinions
- recommendations
- marketing language

Correct:

- dim room
- lively evenings
- group dining

Incorrect:

- amazing
- trendy
- must-try

---

## Cultural Neutrality

Descriptors must function across global dining contexts.

The SceneSense vocabulary avoids culturally specific constructs.

Neutral:

- group dining
- late-night crowd
- neighborhood crowd

Contextual interpretations may exist at the local interpretation layer, but the signal vocabulary remains universal.

---

## Ambiance Deprecation

Earlier SceneSense versions included an Ambiance surface that mixed signals from three conceptual domains: environmental perception, service posture, and social expectations.

To resolve this ambiguity, the model was revised. Signals previously associated with Ambiance are redistributed:

| Signal | New Owner |
|--------|-----------|
| physical comfort (material feel, spatial warmth) | Atmosphere |
| social register (relaxed, polished, unpretentious) | Scene |
| formality | Scene |
| activity tokens | Energy |
| service model | Programs |

The display contract (SS-DISPLAY-CONTRACT-V1) currently specifies the prior three-surface model (Atmosphere / Ambiance / Scene). A v2 display contract aligned to this framework will be produced as a follow-up when the code migration is implemented.
