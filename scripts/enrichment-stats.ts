import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  const surfaceEntities = await db.merchant_surfaces.groupBy({ by: ['entity_id'], _count: { id: true } });
  const surfaceEntityIds = new Set(surfaceEntities.map(r => r.entityId));

  const laEntities = await db.entities.findMany({
    where: { googlePlaceId: { contains: 'woAR' } },
    select: { id: true, slug: true, website: true }
  });

  const laWithSurface    = laEntities.filter(e => surfaceEntityIds.has(e.id));
  const laNoSurface      = laEntities.filter(e => !surfaceEntityIds.has(e.id));
  const laNoSurfaceNoWeb = laNoSurface.filter(e => !e.website);
  const laNoSurfaceWeb   = laNoSurface.filter(e => !!e.website);

  const signalIds = new Set(
    (await db.derived_signals.findMany({ where: { signal_key: 'identity_signals' }, select: { entityId: true } }))
      .map(r => r.entityId)
  );
  const taglineIds = new Set(
    (await db.interpretation_cache.findMany({ where: { output_type: 'TAGLINE', is_current: true }, select: { entityId: true } }))
      .map(r => r.entityId as string)
  );

  const laFullyEnriched    = laWithSurface.filter(e => taglineIds.has(e.id));
  const laSignalsNoTagline = laWithSurface.filter(e => signalIds.has(e.id) && !taglineIds.has(e.id));
  const laHeldOrNoContent  = laWithSurface.filter(e => !signalIds.has(e.id));

  // Unknown slugs breakdown
  const unknownAll   = laEntities.filter(e => e.slug.startsWith('unknown-'));
  const unknownNoWeb = unknownAll.filter(e => !e.website);

  console.log('=== UNKNOWN SLUGS (LA scope)');
  console.log('  Total unknown-* slugs:', unknownAll.length);
  console.log('  With no website:', unknownNoWeb.length, '(all of them — parks/museums/civic venues)');

  console.log('\n=== LA ENTITIES TOTAL:', laEntities.length);
  console.log('  With website:',  laEntities.filter(e => !!e.website).length);
  console.log('  No website:',    laEntities.filter(e => !e.website).length);

  console.log('\n=== ENRICHMENT PIPELINE STATUS');
  console.log('  Fully enriched (tagline written):                ', laFullyEnriched.length);
  console.log('  Signals extracted, tagline not yet generated:    ', laSignalsNoTagline.length);
  console.log('  Surfaces run, signals held (low conf/no content):', laHeldOrNoContent.length);
  console.log('  Discovery not yet run, HAS website:              ', laNoSurfaceWeb.length);
  console.log('  No website (need alt signal: GPID/IG):           ', laNoSurfaceNoWeb.length);

  console.log('\n=== REMAINING ACTIONABLE');
  console.log('  Batches of 25 to clear website-having queue:     ', Math.ceil(laNoSurfaceWeb.length / 25));
  console.log('  No-website entities needing manual/IG approach:  ', laNoSurfaceNoWeb.length + laHeldOrNoContent.length);
}

main().catch(console.error).finally(() => db.$disconnect());
