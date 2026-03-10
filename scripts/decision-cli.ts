import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const INDEX_PATH = resolve(join(__dirname, '..', 'docs', 'decision_index.json'));

function loadIndex(): Record<string, unknown> {
  if (!existsSync(INDEX_PATH)) {
    console.error(`decision index not found: ${INDEX_PATH}`);
    console.error('Run: npm run decisions:index');
    process.exit(1);
  }
  return JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
}

function modeDecision(id: string): void {
  const index = loadIndex();
  const byId = index.by_id as Record<string, Record<string, unknown>>;

  if (!byId[id]) {
    console.error(`Decision not found: ${id}`);
    process.exit(1);
  }

  const d = byId[id];
  const domains = (d.problem_domains as string[]).join(', ');
  const systems = (d.systems_affected as string[]).join(', ');
  const sources = (d.source_documents as string[]).join(', ');

  console.log(`${d.decision_id} — ${d.title}`);
  console.log('');
  console.log(d.decision_summary);
  console.log('');
  console.log(`Domains:     ${domains}`);
  console.log(`Systems:     ${systems}`);
  console.log(`Type:        ${d.decision_type}`);
  console.log(`Status:      ${d.status}`);
  console.log(`Source Docs: ${sources}`);
}

function modeDomain(domain: string): void {
  const index = loadIndex();
  const byDomain = index.by_domain as Record<string, string[]>;
  const byId = index.by_id as Record<string, Record<string, unknown>>;

  const ids = byDomain[domain];
  if (!ids || ids.length === 0) {
    console.log(`No decisions found for domain: ${domain}`);
    return;
  }

  for (const id of ids) {
    const d = byId[id];
    console.log(`${id}  ${d.title}`);
  }
}

function modeKickoff(domain: string, jsonMode: boolean): void {
  const index = loadIndex();
  const byDomain = index.by_domain as Record<string, string[]>;
  const byId = index.by_id as Record<string, Record<string, unknown>>;

  const ids = byDomain[domain];
  if (!ids || ids.length === 0) {
    if (jsonMode) {
      console.log(JSON.stringify({ context_domain: domain, decisions: [] }, null, 2));
    } else {
      console.log(`No kickoff context found for domain: ${domain}`);
    }
    return;
  }

  const decisions = ids.map(id => byId[id]);

  if (jsonMode) {
    console.log(JSON.stringify({ context_domain: domain, decisions }, null, 2));
    return;
  }

  console.log(`Project Context: ${domain}`);
  console.log('');
  console.log('Relevant Decisions');
  console.log('------------------');

  for (const d of decisions) {
    const domains = (d.problem_domains as string[]).join(', ');
    const systems = (d.systems_affected as string[]).join(', ');
    const sources = (d.source_documents as string[]).join(', ');

    console.log(`${d.decision_id} — ${d.title}`);
    console.log('');
    console.log('Summary');
    console.log('-------');
    console.log(d.decision_summary);
    console.log('');
    console.log(`Domains:     ${domains}`);
    console.log(`Systems:     ${systems}`);
    console.log(`Type:        ${d.decision_type}`);
    console.log(`Status:      ${d.status}`);
    console.log(`Source Docs: ${sources}`);
    console.log('');
  }
}

// ── Entrypoint ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const jsonMode = argv.includes('--json');
const positional = argv.filter(a => !a.startsWith('--'));
const [mode, arg] = positional;

if (mode === 'decision') {
  if (!arg) {
    console.error('Usage: npm run decision <DEC-ID>');
    process.exit(1);
  }
  modeDecision(arg);
} else if (mode === 'domain') {
  if (!arg) {
    console.error('Usage: npm run decisions <domain>');
    process.exit(1);
  }
  modeDomain(arg);
} else if (mode === 'kickoff') {
  if (!arg) {
    console.error('Usage: npm run kickoff <domain> [--json]');
    process.exit(1);
  }
  modeKickoff(arg, jsonMode);
} else {
  console.error(`Unknown mode: ${mode}`);
  console.error('Valid modes: decision, domain');
  process.exit(1);
}
