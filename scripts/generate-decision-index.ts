/**
 * Decision Index Generator
 *
 * Reads /docs/decisions/DEC-*.md, parses YAML frontmatter, validates all
 * fields, and writes /docs/decision_index.json.
 *
 * Vocabulary note: the allowed values for problem_domains, decision_type,
 * status, outcome_status, and systems_affected are duplicated here from
 * SKI/BASE-004. This duplication is temporary — once vocab loading from
 * SKI/BASE-004 is automated, this hardcoded list should be removed.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matter = require('gray-matter') as typeof import('gray-matter');

// ── Controlled vocabularies (source: SKI/BASE-004) ───────────────────────────

const VALID_PROBLEM_DOMAINS = new Set([
  'ingestion',
  'capture-automation',
  'lifecycle',
  'governance',
  'data-model',
  'retrieval',
  'rendering',
  'editorial',
  'ops-workflow',
  'product-definition',
]);

const VALID_DECISION_TYPES = new Set([
  'architecture',
  'policy',
  'product',
  'operational',
  'research-conclusion',
]);

const VALID_STATUSES = new Set([
  'active',
  'superseded',
  'invalidated',
  'draft',
]);

const VALID_OUTCOME_STATUSES = new Set([
  'unknown',
  'validated',
  'invalidated',
  'mixed',
]);

const VALID_SYSTEMS_AFFECTED = new Set([
  'SaikoFields',
  'TRACES',
  'Voice Engine',
  'Knowledge System',
  'Kickoff Engine',
  'Postmortem Engine',
]);

// ── Constants ─────────────────────────────────────────────────────────────────

const REPO_ROOT = resolve(join(__dirname, '..'));
const DECISIONS_DIR = join(REPO_ROOT, 'docs', 'decisions');
const OUTPUT_PATH = join(REPO_ROOT, 'docs', 'decision_index.json');
const DECISION_ID_RE = /^DEC-\d+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Types ─────────────────────────────────────────────────────────────────────

interface DecisionEntry {
  decision_id: string;
  title: string;
  decision_summary: string;
  decision_date: string;
  problem_domains: string[];
  systems_affected: string[];
  decision_type: string;
  status: string;
  source_documents: string[];
  assumptions: string[];
  outcome_status: string;
  outcome_summary: string | null;
  superseded_by: string | null;
  tags: string[];
  created: string;
  last_updated: string;
  source_path: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE_RE.test(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string');
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  if (!existsSync(DECISIONS_DIR)) {
    console.error(`decisions directory not found: ${DECISIONS_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(DECISIONS_DIR)
    .filter(f => f.startsWith('DEC-') && f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.log('No decision files found. Writing empty index.');
  }

  const errors: string[] = [];
  const entries: DecisionEntry[] = [];
  const seenIds = new Map<string, string>();

  for (const filename of files) {
    const filePath = join(DECISIONS_DIR, filename);
    const raw = readFileSync(filePath, 'utf-8');
    const { data } = matter(raw);
    const fileErrors: string[] = [];

    // Required string fields
    const requiredStrings: string[] = [
      'decision_id',
      'title',
      'decision_summary',
      'decision_date',
      'decision_type',
      'status',
      'outcome_status',
      'created',
      'last_updated',
    ];
    for (const field of requiredStrings) {
      if (typeof data[field] !== 'string' || !(data[field] as string).trim()) {
        fileErrors.push(`missing required field \`${field}\``);
      }
    }

    // Required array fields
    const requiredArrays: string[] = [
      'problem_domains',
      'systems_affected',
      'source_documents',
      'assumptions',
    ];
    for (const field of requiredArrays) {
      if (!isStringArray(data[field])) {
        fileErrors.push(`missing required field \`${field}\` (must be a string array)`);
      }
    }

    // If any required fields are missing, skip deeper validation for this file
    if (fileErrors.length > 0) {
      for (const e of fileErrors) errors.push(`${filename}: ${e}`);
      continue;
    }

    const id: string = data.decision_id;
    const status: string = data.status;

    // decision_id format
    if (!DECISION_ID_RE.test(id)) {
      fileErrors.push(`invalid decision_id format \`${id}\` (must match DEC-\\d+)`);
    }

    // duplicate decision_id
    if (seenIds.has(id)) {
      fileErrors.push(`duplicate decision_id \`${id}\` (also in ${seenIds.get(id)})`);
    } else {
      seenIds.set(id, filename);
    }

    // ISO date fields
    for (const field of ['decision_date', 'created', 'last_updated'] as const) {
      if (!isValidDate(data[field])) {
        fileErrors.push(`malformed ISO date in \`${field}\`: ${JSON.stringify(data[field])}`);
      }
    }

    // problem_domains values
    for (const v of data.problem_domains as string[]) {
      if (!VALID_PROBLEM_DOMAINS.has(v)) {
        fileErrors.push(`invalid problem_domains value \`${v}\``);
      }
    }

    // systems_affected values
    for (const v of data.systems_affected as string[]) {
      if (!VALID_SYSTEMS_AFFECTED.has(v)) {
        fileErrors.push(`invalid systems_affected value \`${v}\``);
      }
    }

    // decision_type
    if (!VALID_DECISION_TYPES.has(data.decision_type)) {
      fileErrors.push(`invalid decision_type \`${data.decision_type}\``);
    }

    // status
    if (!VALID_STATUSES.has(status)) {
      fileErrors.push(`invalid status \`${status}\``);
    }

    // outcome_status
    if (!VALID_OUTCOME_STATUSES.has(data.outcome_status)) {
      fileErrors.push(`invalid outcome_status \`${data.outcome_status}\``);
    }

    // superseded_by
    const supersededBy: string | null =
      typeof data.superseded_by === 'string' && data.superseded_by.trim()
        ? data.superseded_by.trim()
        : null;

    if (supersededBy !== null && !DECISION_ID_RE.test(supersededBy)) {
      fileErrors.push(`invalid superseded_by format \`${supersededBy}\` (must match DEC-\\d+)`);
    }

    if (fileErrors.length > 0) {
      for (const e of fileErrors) errors.push(`${filename}: ${e}`);
      continue;
    }

    entries.push({
      decision_id: id,
      title: data.title,
      decision_summary: data.decision_summary,
      decision_date: data.decision_date,
      problem_domains: data.problem_domains,
      systems_affected: data.systems_affected,
      decision_type: data.decision_type,
      status,
      source_documents: data.source_documents,
      assumptions: data.assumptions,
      outcome_status: data.outcome_status,
      outcome_summary:
        typeof data.outcome_summary === 'string' && data.outcome_summary.trim()
          ? data.outcome_summary.trim()
          : null,
      superseded_by: supersededBy,
      tags: isStringArray(data.tags) ? data.tags : [],
      created: data.created,
      last_updated: data.last_updated,
      source_path: `/docs/decisions/${filename}`,
    });
  }

  // ── Cross-file validation: superseded_by references ──────────────────────
  const allIds = new Set(entries.map(e => e.decision_id));
  const idToStatus = new Map(entries.map(e => [e.decision_id, e.status]));

  for (const entry of entries) {
    if (entry.superseded_by === null) continue;
    const target = entry.superseded_by;
    const sourceFile = `DEC-${entry.decision_id.replace('DEC-', '')}.md`;

    if (!allIds.has(target)) {
      errors.push(`${sourceFile}: superseded_by references missing decision \`${target}\``);
      continue;
    }
    const targetStatus = idToStatus.get(target);
    if (targetStatus === 'draft') {
      errors.push(
        `${sourceFile}: superseded_by target ${target} has invalid status \`draft\``
      );
    }
  }

  // ── Fail fast if any errors ───────────────────────────────────────────────
  if (errors.length > 0) {
    console.error('\nDecision index generation failed:\n');
    for (const e of errors) console.error(`  ${e}`);
    console.error('');
    process.exit(1);
  }

  // ── Sort: decision_date descending, decision_id ascending ─────────────────
  entries.sort((a, b) => {
    const dateCmp = b.decision_date.localeCompare(a.decision_date);
    if (dateCmp !== 0) return dateCmp;
    return a.decision_id.localeCompare(b.decision_id);
  });

  // ── Write output ──────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const byId: Record<string, DecisionEntry> = {};
  for (const entry of entries) {
    byId[entry.decision_id] = entry;
  }

  const byDomain: Record<string, string[]> = {};
  for (const entry of entries) {
    for (const domain of entry.problem_domains) {
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(entry.decision_id);
    }
  }

  const bySystem: Record<string, string[]> = {};
  for (const entry of entries) {
    for (const system of entry.systems_affected) {
      if (!bySystem[system]) bySystem[system] = [];
      bySystem[system].push(entry.decision_id);
    }
  }

  // governs[system] = active decision IDs affecting that system
  const governs: Record<string, string[]> = {};
  for (const entry of entries) {
    if (entry.status !== 'active') continue;
    for (const system of entry.systems_affected) {
      if (!governs[system]) governs[system] = [];
      governs[system].push(entry.decision_id);
    }
  }

  // supersedes[original] = [replacing] for each decision that has superseded_by set
  const supersedes: Record<string, string[]> = {};
  for (const entry of entries) {
    if (entry.superseded_by !== null) {
      if (!supersedes[entry.decision_id]) supersedes[entry.decision_id] = [];
      supersedes[entry.decision_id].push(entry.superseded_by);
    }
  }

  const output = {
    schema_version: '1.0',
    generator_version: '1.0',
    last_generated: today,
    source_directory: '/docs/decisions',
    decisions: entries,
    by_id: byId,
    by_domain: byDomain,
    by_system: bySystem,
    governs,
    supersedes,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`✓  Written ${entries.length} decision(s) to ${OUTPUT_PATH}`);
}

main();
