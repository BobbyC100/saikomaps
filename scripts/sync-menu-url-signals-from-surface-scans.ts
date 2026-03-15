#!/usr/bin/env node
/**
 * Sync merchant_signals.menu_url from deterministic merchant_surface_scans evidence.
 *
 * v1 behavior (intentionally minimal):
 * - Source: latest successful scan per entity
 * - Eligible scans:
 *   - http_status < 400
 *   - menu_present = true
 *   - menu_url is non-empty
 *   - menu_read_state in ('readable', 'unreadable_pdf')
 * - URL normalization:
 *   - resolve relative menu_url against COALESCE(final_url, source_url)
 * - Write policy:
 *   - fill merchant_signals.menu_url only when current value is null/empty
 *   - never overwrite non-empty existing values
 *
 * Usage:
 *   npx tsx scripts/sync-menu-url-signals-from-surface-scans.ts [--dry-run] [--limit=N]
 */

import { config } from "dotenv";
config({ path: ".env" });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: ".env.local", override: true });
}

import { db } from "../lib/db";

type ScanCandidateRow = {
  entity_id: string;
  source_url: string;
  final_url: string | null;
  menu_url: string;
  menu_read_state: string | null;
  current_menu_url: string | null;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1] ?? "0", 10) : 0;
  return { dryRun, limit: Number.isFinite(limit) && limit > 0 ? limit : null };
}

function hasNonEmptyText(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeMenuUrl(menuUrl: string, baseUrl: string): string | null {
  try {
    return new URL(menuUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function countMerchantSignalMenuUrls(): Promise<number> {
  const rows = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM merchant_signals
    WHERE menu_url IS NOT NULL
      AND btrim(menu_url) <> ''
  `;
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const { dryRun, limit } = parseArgs();
  console.log(
    `\nSync menu_url signals from surface scans${dryRun ? " [DRY RUN]" : ""}\n`
  );

  const scansExists = await tableExists("merchant_surface_scans");
  const signalsExists = await tableExists("merchant_signals");

  if (!signalsExists) {
    console.log("merchant_signals table is missing. Exiting.");
    return;
  }
  if (!scansExists) {
    console.log("merchant_surface_scans table is missing. Exiting.");
    return;
  }

  const beforeCount = await countMerchantSignalMenuUrls();

  const scanCandidates = await db.$queryRaw<ScanCandidateRow[]>`
    WITH latest_scan AS (
      SELECT DISTINCT ON (mss.entity_id)
        mss.entity_id,
        mss.source_url,
        mss.final_url,
        mss.menu_present,
        mss.menu_url,
        mss.menu_read_state,
        mss.fetched_at
      FROM merchant_surface_scans mss
      WHERE mss.http_status < 400
      ORDER BY mss.entity_id, mss.fetched_at DESC
    )
    SELECT
      ls.entity_id,
      ls.source_url,
      ls.final_url,
      ls.menu_url,
      ls.menu_read_state,
      ms.menu_url AS current_menu_url
    FROM latest_scan ls
    LEFT JOIN merchant_signals ms ON ms.entity_id = ls.entity_id
    WHERE ls.menu_url IS NOT NULL
      AND btrim(ls.menu_url) <> ''
      AND ls.menu_present = true
      AND ls.menu_read_state IN ('readable', 'unreadable_pdf')
  `;

  const toFill: Array<{ entityId: string; normalizedMenuUrl: string }> = [];
  let invalidOrUnresolvable = 0;

  for (const row of scanCandidates) {
    if (hasNonEmptyText(row.current_menu_url)) continue;
    const baseUrl = row.final_url ?? row.source_url;
    const normalized = normalizeMenuUrl(row.menu_url, baseUrl);
    if (!normalized) {
      invalidOrUnresolvable++;
      continue;
    }
    toFill.push({ entityId: row.entity_id, normalizedMenuUrl: normalized });
  }

  const limited = limit ? toFill.slice(0, limit) : toFill;

  console.log(`Eligible latest scans: ${scanCandidates.length}`);
  console.log(`Candidate fills (empty merchant_signals only): ${toFill.length}`);
  if (limit) console.log(`Limit applied: ${limit} (processing ${limited.length})`);
  console.log(`Skipped invalid/unresolvable URLs: ${invalidOrUnresolvable}`);

  if (dryRun) {
    console.log("\nDry-run examples:");
    for (const row of limited.slice(0, 10)) {
      console.log(`  ${row.entityId} -> ${row.normalizedMenuUrl}`);
    }
    const afterCount = beforeCount + limited.length;
    console.log(`\nmerchant_signals.menu_url before: ${beforeCount}`);
    console.log(`merchant_signals.menu_url after (projected): ${afterCount}`);
    return;
  }

  let written = 0;
  for (const row of limited) {
    const existing = await db.merchant_signals.findUnique({
      where: { entityId: row.entityId },
      select: { entityId: true, menu_url: true },
    });

    if (existing && hasNonEmptyText(existing.menu_url)) {
      continue;
    }

    if (!existing) {
      await db.merchant_signals.create({
        data: {
          entityId: row.entityId,
          menu_url: row.normalizedMenuUrl,
        },
      });
      written++;
      continue;
    }

    await db.merchant_signals.update({
      where: { entityId: row.entityId },
      data: {
        menu_url: row.normalizedMenuUrl,
      },
    });
    written++;
  }

  const afterCount = await countMerchantSignalMenuUrls();
  console.log(`\nRows written: ${written}`);
  console.log(`merchant_signals.menu_url before: ${beforeCount}`);
  console.log(`merchant_signals.menu_url after: ${afterCount}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
