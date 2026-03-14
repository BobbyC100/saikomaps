/**
 * generate-context.ts
 *
 * Reads docs/registry.json and concatenates all active canonical documents
 * into a single context.md file for AI session grounding.
 *
 * Usage:
 *   npm run docs:context
 *   npm run docs:context -- --status active        (default)
 *   npm run docs:context -- --status active,draft  (include drafts)
 *   npm run docs:context -- --project TRACES       (single project)
 *   npm run docs:context -- --system scenesense    (single system)
 *   npm run docs:context -- --dry-run              (print what would be included, no write)
 *
 * Output:
 *   docs/context.md  — generated, never hand-edited
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface RegistryEntry {
  doc_id: string;
  doc_type: string;
  status: string;
  title: string;
  path: string;
  owner: string;
  created: string;
  last_updated: string;
  project_id: string;
  summary: string;
  systems: string[];
  related_docs: string[];
}

interface Registry {
  generated: string;
  doc_count: number;
  docs: RegistryEntry[];
}

const ROOT = process.cwd();
const REGISTRY_PATH = join(ROOT, 'docs', 'registry.json');
const OUTPUT_PATH = join(ROOT, 'docs', 'context.md');

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

const dryRun = args.includes('--dry-run');
const statusFilter = new Set((getFlag('status') ?? 'active').split(',').map(s => s.trim()));
const projectFilter = getFlag('project')?.toUpperCase();
const systemFilter = getFlag('system')?.toLowerCase();

if (!existsSync(REGISTRY_PATH)) {
  console.error('[docs:context] ERROR: docs/registry.json not found. Run: npm run docs:registry');
  process.exit(1);
}

const registry: Registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));

let docs = registry.docs.filter(d => statusFilter.has(d.status));

if (projectFilter) {
  docs = docs.filter(d => d.project_id.toUpperCase() === projectFilter);
}

if (systemFilter) {
  docs = docs.filter(d => d.systems.some(s => s.toLowerCase() === systemFilter));
}

const TYPE_ORDER: Record<string, number> = {
  architecture: 0,
  'domain-spec': 1,
  spec: 2,
  system: 3,
  reference: 4,
  runbook: 5,
  guide: 6,
  research: 7,
  document: 8,
  overview: 9,
};

docs.sort((a, b) => {
  const projectCmp = a.project_id.localeCompare(b.project_id);
  if (projectCmp !== 0) return projectCmp;
  const typeCmp = (TYPE_ORDER[a.doc_type] ?? 99) - (TYPE_ORDER[b.doc_type] ?? 99);
  if (typeCmp !== 0) return typeCmp;
  return a.doc_id.localeCompare(b.doc_id);
});

if (dryRun) {
  console.log(`[docs:context] DRY RUN — would include ${docs.length} docs:\n`);
  for (const doc of docs) {
    const summary = doc.summary ? `  ${doc.summary}` : '  (no summary)';
    console.log(`  ${doc.doc_id.padEnd(48)} ${doc.doc_type}`);
    console.log(summary);
    console.log();
  }
  console.log(`[docs:context] Output would be written to: docs/context.md`);
  process.exit(0);
}

const lines: string[] = [];

lines.push(`# Saiko — Context Snapshot`);
lines.push(``);
lines.push(`> Generated: ${new Date().toISOString()}`);
lines.push(`> Source: docs/registry.json (${registry.generated})`);
lines.push(`> Documents: ${docs.length} included / ${registry.doc_count} total`);
lines.push(`> Filters: status=${[...statusFilter].join(',')}${projectFilter ? ` project=${projectFilter}` : ''}${systemFilter ? ` system=${systemFilter}` : ''}`);
lines.push(``);
lines.push(`---`);
lines.push(``);
lines.push(`This file is generated. Do not edit it directly.`);
lines.push(`To regenerate: \`npm run docs:context\``);
lines.push(``);

lines.push(`## Table of Contents`);
lines.push(``);
let currentProject = '';
for (const doc of docs) {
  if (doc.project_id !== currentProject) {
    lines.push(`**${doc.project_id}**`);
    currentProject = doc.project_id;
  }
  const anchor = doc.doc_id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  lines.push(`- [${doc.doc_id}](#${anchor}) — ${doc.title}${doc.summary ? `: ${doc.summary}` : ''}`);
}
lines.push(``);
lines.push(`---`);
lines.push(``);

let included = 0;
let missing = 0;

for (const doc of docs) {
  const docPath = join(ROOT, doc.path);

  lines.push(`## ${doc.doc_id}`);
  lines.push(``);
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| **Type** | ${doc.doc_type} |`);
  lines.push(`| **Status** | ${doc.status} |`);
  lines.push(`| **Project** | ${doc.project_id} |`);
  lines.push(`| **Path** | \`${doc.path}\` |`);
  lines.push(`| **Last Updated** | ${doc.last_updated} |`);
  if (doc.summary) {
    lines.push(`| **Summary** | ${doc.summary} |`);
  }
  if (doc.systems.length > 0) {
    lines.push(`| **Systems** | ${doc.systems.join(', ')} |`);
  }
  lines.push(``);

  if (!existsSync(docPath)) {
    lines.push(`> ⚠️ File not found at path: \`${doc.path}\``);
    lines.push(``);
    missing++;
    continue;
  }

  const raw = readFileSync(docPath, 'utf-8');
  const body = raw.replace(/^---[\s\S]*?---\n+/, '');
  lines.push(body.trimEnd());
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  included++;
}

lines.push(`## Registry Metadata`);
lines.push(``);
lines.push(`| Field | Value |`);
lines.push(`|-------|-------|`);
lines.push(`| Registry generated | ${registry.generated} |`);
lines.push(`| Context generated | ${new Date().toISOString()} |`);
lines.push(`| Docs included | ${included} |`);
lines.push(`| Docs missing on disk | ${missing} |`);
lines.push(`| Filters applied | status=${[...statusFilter].join(',')}${projectFilter ? `, project=${projectFilter}` : ''}${systemFilter ? `, system=${systemFilter}` : ''} |`);
lines.push(``);

const output = lines.join('\n');
writeFileSync(OUTPUT_PATH, output, 'utf-8');

console.log(`[docs:context] Wrote docs/context.md`);
console.log(`[docs:context] ${included} docs included${missing > 0 ? `, ${missing} missing on disk` : ''}`);
if (missing > 0) {
  console.log(`[docs:context] WARNING: ${missing} docs in registry were not found on disk. Re-run npm run docs:registry to resync.`);
}
