# Skill: saiko-component-spec

## Purpose
Define a UI component clearly enough for implementation without ambiguity.

## Required Sections

1. Purpose
- What the component does
- Why it exists

2. Inputs (Data Contract)
- What data it receives
- Required vs optional fields

3. States
- default
- loading (if applicable)
- empty
- error (if applicable)

4. Variants
- size
- density
- context (if applicable)

5. Layout Behavior
- grid position
- responsiveness
- expansion/collapse rules

6. Constraints
- what it must not do
- what it must not assume

## Rules

- Do not mix data logic with UI logic
- Do not assume hidden data
- Do not leave behavior undefined

## Output Format

Structured, clean, implementation-ready (no fluff)