import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const statePath = join(process.cwd(), 'ai-operations/state/repo_state.md');

if (!existsSync(statePath)) {
  console.error('[session:start] ERROR: repo_state.md not found. Run npm run repo:state first.');
  process.exit(1);
}

const state = readFileSync(statePath, 'utf-8');

const hr = '─'.repeat(56);

console.log(`\n┌${hr}┐`);
console.log(`│  SAIKO — REPO STATE${' '.repeat(36)}│`);
console.log(`└${hr}┘\n`);
console.log(state.trim());

console.log(`\n┌${hr}┐`);
console.log(`│  SESSION START${' '.repeat(41)}│`);
console.log(`└${hr}┘\n`);
console.log(`Session Objective:
  (write one sentence describing today's focus)

Active Pull Request:
  (optional)

Notes:
  (optional)
`);
