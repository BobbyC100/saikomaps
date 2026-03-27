/**
 * Scan Entity Issues — Coverage Operations Issue Generator CLI
 *
 * Scans entities and generates/updates entity_issues rows.
 * Phase 1 of Coverage Operations (COVOPS-APPROACH-V1).
 *
 * Usage:
 *   npm run scan:issues                          # scan all non-CANDIDATE entities
 *   npm run scan:issues -- --slug seco           # single entity
 *   npm run scan:issues -- --dry-run             # preview without writing
 *   npm run scan:issues -- --verbose             # detailed per-entity logging
 *   npm run scan:issues -- --summary             # show issue type breakdown
 *
 * Requires: DATABASE_URL
 */

// Env is preloaded by: node -r ./scripts/load-env.js
import { PrismaClient } from '@prisma/client';
import { scanEntities, ISSUE_RULES } from '@/lib/coverage/issue-scanner';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  let slug: string | null = null;
  let dryRun = false;
  let verbose = false;
  let showSummary = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--slug') slug = args[++i] || null;
    else if (args[i]?.startsWith('--slug=')) slug = args[i].split('=')[1];
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--verbose') verbose = true;
    else if (args[i] === '--summary') showSummary = true;
  }

  return { slug, dryRun, verbose, showSummary };
}

async function main() {
  const { slug, dryRun, verbose, showSummary } = parseArgs();

  console.log('\n--- Entity Issue Scanner ---');
  if (dryRun) console.log('(dry run — no changes will be written)\n');
  else console.log('');

  if (slug) console.log(`Scanning single entity: ${slug}\n`);

  const result = await scanEntities(prisma, {
    slugs: slug ? [slug] : undefined,
    dryRun,
    verbose,
  });

  // Summary
  console.log('\n--- Scan Complete ---');
  console.log(`Entities scanned: ${result.entitiesScanned}`);
  console.log(`Issues created:   ${result.issuesCreated}`);
  console.log(`Issues resolved:  ${result.issuesResolved}`);
  console.log(`Issues unchanged: ${result.issuesUnchanged}`);

  if (showSummary || verbose) {
    console.log('\nIssue type breakdown:');
    // Show all rule types, sorted by count descending
    const sorted = ISSUE_RULES.map((r) => ({
      type: r.issueType,
      class: r.problemClass,
      severity: r.severity,
      count: result.byType[r.issueType] ?? 0,
    })).sort((a, b) => b.count - a.count);

    for (const row of sorted) {
      const bar = '█'.repeat(Math.min(row.count, 50));
      console.log(
        `  ${row.type.padEnd(25)} ${row.class.padEnd(10)} ${row.severity.padEnd(8)} ${String(row.count).padStart(4)}  ${bar}`,
      );
    }
  }

  if (dryRun) {
    console.log('\n(No changes were made — run without --dry-run to apply)');
  }

  // Show entities with most issues (top 10)
  if (verbose && result.results.length > 0) {
    const withIssues = result.results.filter((r) => r.issuesCreated > 0);
    if (withIssues.length > 0) {
      console.log(`\nTop entities by new issues:`);
      const top = withIssues
        .sort((a, b) => b.issuesCreated - a.issuesCreated)
        .slice(0, 10);
      for (const r of top) {
        console.log(`  ${r.slug.padEnd(35)} +${r.issuesCreated} new`);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
