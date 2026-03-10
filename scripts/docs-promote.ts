/**
 * docs-promote.ts
 *
 * Promotes a draft document to canonical status in the repo.
 *
 * Usage:
 *   npm run docs:promote -- --path docs/system/my-doc.md --content path/to/draft.md
 *   npm run docs:promote -- --path docs/system/my-doc.md --stdin < draft.md
 *   npm run docs:promote -- --path docs/system/my-doc.md --content path/to/draft.md --dry-run
 *
 * Also accepts frontmatter overrides as flags:
 *   --doc-id MY-DOC-ID
 *   --doc-type system
 *   --project-id KNOWLEDGE-SYSTEM
 *   --status active
 *   --summary "One-line summary"
 *   --systems knowledge-system,repo-workflow
 *   --related-docs docs/system/foo.md,docs/system/bar.md
 *
 * If the target file already exists, the script will abort (use apply-doc-patch for updates).
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matter = require('gray-matter') as typeof import('gray-matter');

// ── Helpers ───────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`[docs-promote] ERROR: ${msg}`);
  process.exit(1);
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function inferDocId(filePath: string): string {
  // docs/system/promotion-flow-v1.md → SYS-PROMOTION-FLOW-V1
  // docs/traces/beverage-vocab.md    → TRACES-BEVERAGE-VOCAB
  const parts = filePath.replace(/^docs\//, '').replace(/\.md$/, '').split('/');
  const prefix = parts.length > 1 ? parts[0].toUpperCase() : 'DOC';
  const name = parts[parts.length - 1].toUpperCase().replace(/[^A-Z0-9]+/g, '-');

  // Use SYS as prefix for system docs to match existing convention
  const finalPrefix = prefix === 'SYSTEM' ? 'SYS' : prefix;
  return `${finalPrefix}-${name}`;
}

function inferDocType(filePath: string): string {
  if (filePath.startsWith('docs/system/')) return 'system';
  if (filePath.startsWith('docs/traces/')) return 'domain-spec';
  return 'document';
}

function inferProjectId(filePath: string): string {
  if (filePath.startsWith('docs/system/')) return 'KNOWLEDGE-SYSTEM';
  if (filePath.startsWith('docs/traces/')) return 'TRACES';
  return 'SAIKO';
}

// ── Parse args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

const targetPath = getFlag('path');
const contentPath = getFlag('content');
const useStdin = hasFlag('stdin');
const dryRun = hasFlag('dry-run');
const noCommit = hasFlag('no-commit');

if (!targetPath) {
  fail('--path is required. Example: --path docs/system/my-doc.md');
}

// Normalize target path (strip leading ./ if present)
const normalizedTarget = targetPath.replace(/^\.\//, '');
const absoluteTarget = resolve(process.cwd(), normalizedTarget);

// ── Check for collisions ──────────────────────────────────────────────────────

if (existsSync(absoluteTarget)) {
  fail(
    `Target already exists: ${normalizedTarget}\n` +
    `Use 'npm run docs:apply-patch' to update existing docs.`
  );
}

// ── Read content ──────────────────────────────────────────────────────────────

let rawContent: string;

if (contentPath) {
  const absContent = resolve(process.cwd(), contentPath);
  if (!existsSync(absContent)) {
    fail(`Content file not found: ${contentPath}`);
  }
  rawContent = readFileSync(absContent, 'utf-8');
} else if (useStdin) {
  try {
    rawContent = readFileSync('/dev/stdin', 'utf-8');
  } catch {
    fail('Failed to read from stdin.');
  }
} else {
  fail('Provide content via --content path/to/file.md or --stdin.');
}

// ── Parse existing frontmatter from content (if any) ──────────────────────────

const parsed = matter(rawContent);
const existingFm = parsed.data || {};
const bodyContent = parsed.content;

// ── Build canonical frontmatter ───────────────────────────────────────────────

const docId = getFlag('doc-id') || existingFm.doc_id || inferDocId(normalizedTarget);
const docType = getFlag('doc-type') || existingFm.doc_type || inferDocType(normalizedTarget);
const status = getFlag('status') || existingFm.status || 'active';
const owner = existingFm.owner || 'Bobby Ciccaglione';
const created = existingFm.created || today();
const lastUpdated = today();
const projectId = getFlag('project-id') || existingFm.project_id || inferProjectId(normalizedTarget);

const systemsRaw = getFlag('systems');
const systems: string[] = systemsRaw
  ? systemsRaw.split(',').map(s => s.trim())
  : existingFm.systems || [];

const relatedRaw = getFlag('related-docs');
const relatedDocs: string[] = relatedRaw
  ? relatedRaw.split(',').map(s => s.trim())
  : existingFm.related_docs || [];

const summary = getFlag('summary') || existingFm.summary || '';

const frontmatter: Record<string, unknown> = {
  doc_id: docId,
  doc_type: docType,
  status,
  owner,
  created,
  last_updated: lastUpdated,
  project_id: projectId,
};

if (systems.length > 0) frontmatter.systems = systems;
if (relatedDocs.length > 0) frontmatter.related_docs = relatedDocs;
if (summary) frontmatter.summary = summary;

// ── Assemble final document ───────────────────────────────────────────────────

const output = matter.stringify(bodyContent, frontmatter);

// ── Dry run ───────────────────────────────────────────────────────────────────

if (dryRun) {
  console.log('[docs-promote] DRY RUN — would write:\n');
  console.log(`  Path: ${normalizedTarget}`);
  console.log(`  doc_id: ${docId}`);
  console.log(`  doc_type: ${docType}`);
  console.log(`  status: ${status}`);
  console.log(`  project_id: ${projectId}`);
  console.log(`  summary: ${summary || '(none)'}`);
  console.log('');
  console.log('--- Preview (first 40 lines) ---');
  console.log(output.split('\n').slice(0, 40).join('\n'));
  if (output.split('\n').length > 40) console.log('...');
  process.exit(0);
}

// ── Write file ────────────────────────────────────────────────────────────────

const dir = dirname(absoluteTarget);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
  console.log(`[docs-promote] Created directory: ${dirname(normalizedTarget)}`);
}

writeFileSync(absoluteTarget, output, 'utf-8');
console.log(`[docs-promote] Wrote: ${normalizedTarget}`);

// ── Commit ────────────────────────────────────────────────────────────────────

if (noCommit) {
  console.log('[docs-promote] Skipping commit (--no-commit).');
} else {
  try {
    execSync(`git add "${absoluteTarget}"`, { stdio: 'pipe' });
    const commitMsg = `docs: promote ${basename(normalizedTarget)} [${docId}]`;
    execSync(`git commit -m "${commitMsg}"`, { stdio: 'pipe' });
    console.log(`[docs-promote] Committed: ${commitMsg}`);
  } catch (err) {
    console.error(`[docs-promote] WARNING: git commit failed: ${(err as Error).message}`);
    console.error('[docs-promote] File was written but not committed.');
  }
}

console.log('[docs-promote] Done.');
