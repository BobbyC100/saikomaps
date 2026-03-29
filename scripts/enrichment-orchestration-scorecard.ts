#!/usr/bin/env node

import { db } from "../lib/db";
import { ORCHESTRATION_REASON, FRESHNESS_WINDOWS_MS, ageMs } from "../lib/enrichment/orchestration-reasons";
import { computeSloSummary, type ScoreRow } from "../lib/enrichment/orchestration-scorecard";

const args = process.argv.slice(2);
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1] ?? null;
const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10) || 10;
const jsonOut = args.includes("--json");

function pct(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

async function buildRow(entityId: string, slug: string, name: string): Promise<ScoreRow> {
  const discovered = await db.merchant_surfaces.findMany({
    where: {
      entityId,
      sourceUrl: { contains: "http" },
      OR: [
        { sourceUrl: { contains: "menu" } },
        { sourceUrl: { contains: "dinner" } },
        { sourceUrl: { contains: "lunch" } },
        { sourceUrl: { contains: "brunch" } },
        { sourceUrl: { contains: "cafe" } },
        { sourceUrl: { contains: "wine" } },
        { sourceUrl: { contains: "drink" } },
      ],
    },
    select: { sourceUrl: true },
    distinct: ["sourceUrl"],
  });

  const fetches = await db.menu_fetches.findMany({
    where: { entityId },
    orderBy: { fetchedAt: "desc" },
    select: {
      sourceUrl: true,
      httpStatus: true,
      rawText: true,
      fetchedAt: true,
    },
  });

  const successfulFetches = fetches.filter((f) => (f.httpStatus ?? 0) > 0 && (f.httpStatus ?? 0) < 400);
  const fetchedDistinctUrls = new Set(successfulFetches.map((f) => f.sourceUrl)).size;

  const latestIdentity = await db.derived_signals.findFirst({
    where: { entityId, signalKey: "menu_identity", signalVersion: "v1" },
    orderBy: { computedAt: "desc" },
    select: { computedAt: true },
  });
  const latestStructure = await db.derived_signals.findFirst({
    where: { entityId, signalKey: "menu_structure", signalVersion: "v1" },
    orderBy: { computedAt: "desc" },
    select: { computedAt: true },
  });
  const latestOffering = await db.derived_signals.findFirst({
    where: { entityId, signalKey: "offering_programs", signalVersion: "v1" },
    orderBy: { computedAt: "desc" },
    select: { signalValue: true },
  });

  const reasons: string[] = [];
  if (discovered.length === 0) reasons.push(ORCHESTRATION_REASON.NO_MENU_SURFACES_DISCOVERED);
  if (discovered.length > 0 && fetchedDistinctUrls < discovered.length) {
    reasons.push(ORCHESTRATION_REASON.MENU_SURFACES_DISCOVERED_NOT_FETCHED);
  }
  if (!latestIdentity) reasons.push(ORCHESTRATION_REASON.NO_MENU_IDENTITY_SIGNAL);
  if (!latestStructure) reasons.push(ORCHESTRATION_REASON.NO_MENU_STRUCTURE_SIGNAL);

  const identityAge = ageMs(latestIdentity?.computedAt ?? null);
  const structureAge = ageMs(latestStructure?.computedAt ?? null);
  if (identityAge !== null && identityAge > FRESHNESS_WINDOWS_MS.MENU_SIGNAL_MAX_AGE) {
    reasons.push(ORCHESTRATION_REASON.MENU_IDENTITY_STALE);
  }
  if (structureAge !== null && structureAge > FRESHNESS_WINDOWS_MS.MENU_SIGNAL_MAX_AGE) {
    reasons.push(ORCHESTRATION_REASON.MENU_STRUCTURE_STALE);
  }

  const offeringValue = (latestOffering?.signalValue ?? null) as Record<string, unknown> | null;
  const readiness = offeringValue?.readiness as Record<string, unknown> | undefined;
  const offeringReady =
    typeof readiness?.isReadyForOfferingAssembly === "boolean"
      ? (readiness.isReadyForOfferingAssembly as boolean)
      : null;
  const gateReasons = Array.isArray(readiness?.gateReasons)
    ? readiness?.gateReasons.filter((r): r is string => typeof r === "string")
    : [];

  return {
    slug,
    name,
    discoveredEligibleMenus: discovered.length,
    fetchedMenuDocs: successfulFetches.length,
    fetchedDistinctUrls,
    menuIdentityPresent: Boolean(latestIdentity),
    menuStructurePresent: Boolean(latestStructure),
    offeringPresent: Boolean(latestOffering),
    offeringReady,
    gateReasons,
    reasons,
  };
}

async function main() {
  const entities = await db.entities.findMany({
    where: slugArg ? { slug: slugArg } : { website: { not: null }, primaryVertical: "EAT" },
    select: { id: true, slug: true, name: true },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  if (entities.length === 0) {
    console.log("No entities found.");
    return;
  }

  const rows: ScoreRow[] = [];
  for (const e of entities) rows.push(await buildRow(e.id, e.slug, e.name));
  const slo = computeSloSummary(rows);

  if (jsonOut) {
    console.log(JSON.stringify({ rows, slo }, null, 2));
    return;
  }

  console.log("Enrichment orchestration scorecard\n");
  for (const row of rows) {
    console.log(`${row.name} (${row.slug})`);
    console.log(`  discovered eligible menus: ${row.discoveredEligibleMenus}`);
    console.log(`  fetched menus:             ${row.fetchedMenuDocs} docs / ${row.fetchedDistinctUrls} distinct urls`);
    console.log(`  menu_identity:             ${row.menuIdentityPresent ? "yes" : "no"}`);
    console.log(`  menu_structure:            ${row.menuStructurePresent ? "yes" : "no"}`);
    console.log(`  offering_programs:         ${row.offeringPresent ? "yes" : "no"}${row.offeringReady === null ? "" : row.offeringReady ? " (ready)" : " (blocked)"}`);
    if (row.gateReasons.length > 0) console.log(`  offering gate reasons:     ${row.gateReasons.join(", ")}`);
    if (row.reasons.length > 0) console.log(`  orchestration reasons:     ${row.reasons.join(", ")}`);
    console.log("");
  }

  console.log("SLO summary (with explicit denominators)\n");
  console.log(
    `  discovery->fetch coverage: ${slo.discoveryToFetchCoverage.numerator}/${slo.discoveryToFetchCoverage.denominator} (${pct(slo.discoveryToFetchCoverage.ratio)})`
  );
  console.log(
    `  fetch->interpret completion: ${slo.fetchToInterpretCompletion.numerator}/${slo.fetchToInterpretCompletion.denominator} (${pct(slo.fetchToInterpretCompletion.ratio)})`
  );
  console.log(
    `  offering availability: ${slo.offeringAvailability.numerator}/${slo.offeringAvailability.denominator} (${pct(slo.offeringAvailability.ratio)})`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
