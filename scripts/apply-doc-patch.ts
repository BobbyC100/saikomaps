/**
 * apply-doc-patch.ts
 *
 * Applies a structured JSON patch to a canonical markdown document.
 *
 * Usage:
 *   npm run docs:apply-patch -- path/to/patch.json
 *
 * Supported patch types (v1):
 *   frontmatter_update  — merge key/value changes into YAML frontmatter
 *   section_replace     — replace the body of a named markdown heading
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matter = require('gray-matter') as typeof import('gray-matter');

// ── Types ─────────────────────────────────────────────────────────────────────

interface FrontmatterPatch {
  patch_type: 'frontmatter_update';
  target_doc: string;
  changes: Record<string, unknown>;
}

interface SectionReplacePatch {
  patch_type: 'section_replace';
  target_doc: string;
  section: string;
  content: string;
}

type Patch = FrontmatterPatch | SectionReplacePatch;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`[apply-doc-patch] ERROR: ${msg}`);
  process.exit(1);
}

function headingLevel(line: string): number {
  const m = line.match(/^(#{1,6})\s/);
  return m ? m[1].length : 0;
}

// ── Patch handlers ────────────────────────────────────────────────────────────

function applyFrontmatterUpdate(patch: FrontmatterPatch, raw: string): string {
  const parsed = matter(raw);

  if (!parsed.matter) {
    fail(`'${patch.target_doc}' has no frontmatter block. Add a --- block before using frontmatter_update.`);
  }

  const updatedData = { ...parsed.data, ...patch.changes };

  // Reconstruct: gray-matter.stringify preserves the original body content.
  return matter.stringify(parsed.content, updatedData);
}

function applySectionReplace(patch: SectionReplacePatch, raw: string): string {
  const parsed = matter(raw);
  const body = parsed.content;
  const lines = body.split('\n');

  const targetHeading = patch.section.trimEnd();
  const targetLevel = headingLevel(targetHeading);

  if (targetLevel === 0) {
    fail(`'section' value "${patch.section}" is not a valid markdown heading (must start with #).`);
  }

  // Find the exact heading line
  const startIdx = lines.findIndex(l => l.trimEnd() === targetHeading);
  if (startIdx === -1) {
    fail(`Section heading "${patch.section}" not found in '${patch.target_doc}'.`);
  }

  // Find the end: next heading at same or higher level (fewer or equal #)
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const lvl = headingLevel(lines[i]);
    if (lvl > 0 && lvl <= targetLevel) {
      endIdx = i;
      break;
    }
  }

  // Splice: keep heading line, replace body until endIdx
  const newContent = patch.content.endsWith('\n') ? patch.content : patch.content + '\n';
  const updated = [
    ...lines.slice(0, startIdx + 1),
    '',
    ...newContent.split('\n').slice(0, -1), // trim trailing empty from split
    '',
    ...lines.slice(endIdx),
  ].join('\n');

  // Reconstruct with original frontmatter untouched
  return matter.stringify(updated, parsed.data);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));

if (args.length === 0) {
  fail('No patch file specified.\nUsage: npm run docs:apply-patch -- path/to/patch.json');
}

const patchPath = resolve(process.cwd(), args[0]);

if (!existsSync(patchPath)) {
  fail(`Patch file not found: ${patchPath}`);
}

let patch: Patch;
try {
  patch = JSON.parse(readFileSync(patchPath, 'utf-8')) as Patch;
} catch (err) {
  fail(`Failed to parse patch file: ${(err as Error).message}`);
}

if (!patch.patch_type) fail('patch.patch_type is required.');
if (!patch.target_doc) fail('patch.target_doc is required.');

const targetPath = resolve(process.cwd(), patch.target_doc);

if (!existsSync(targetPath)) {
  fail(`Target document not found: ${patch.target_doc}`);
}

const raw = readFileSync(targetPath, 'utf-8');
let output: string;

switch (patch.patch_type) {
  case 'frontmatter_update': {
    if (!patch.changes || typeof patch.changes !== 'object') {
      fail('frontmatter_update requires a "changes" object.');
    }
    output = applyFrontmatterUpdate(patch, raw);
    break;
  }
  case 'section_replace': {
    if (typeof patch.section !== 'string' || !patch.section.trim()) {
      fail('section_replace requires a "section" string.');
    }
    if (typeof patch.content !== 'string') {
      fail('section_replace requires a "content" string.');
    }
    output = applySectionReplace(patch, raw);
    break;
  }
  default: {
    const unknown = (patch as { patch_type: string }).patch_type;
    fail(`Unsupported patch_type: "${unknown}". Valid types: frontmatter_update, section_replace`);
  }
}

writeFileSync(targetPath, output, 'utf-8');
console.log(`Applied ${patch.patch_type} to ${patch.target_doc}`);
