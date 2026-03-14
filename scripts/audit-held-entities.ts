import { PrismaClient, Prisma } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  // Check 88 Club artifact content
  const sampleSlug = '88-club-restaurant-3-hot2025-mei-lin-top-chef-winner';
  const entity = await db.entities.findUnique({ where: { slug: sampleSlug }, select: { id: true } });
  if (!entity) { console.log('entity not found'); return; }

  const surfaces = await db.merchant_surfaces.findMany({
    where: { entity_id: entity.id },
    select: { id: true, surface_type: true, fetch_status: true, parse_status: true, source_url: true, raw_text: true },
  });
  console.log('88 Club surfaces:');
  for (const s of surfaces) {
    console.log(`  type=${s.surface_type} fetch=${s.fetch_status} parse=${s.parse_status} raw_text=${s.raw_text?.length ?? 0}chars`);
    console.log(`  url=${s.source_url}`);
  }

  const artifacts = await db.merchant_surface_artifacts.findMany({
    where: { merchant_surface: { entity_id: entity.id } },
    select: { artifact_type: true, artifact_version: true, artifact_json: true },
  });
  console.log('\n88 Club artifacts:');
  for (const a of artifacts) {
    const json = a.artifact_json as any;
    const textBlocks = json?.text_blocks;
    const totalText = textBlocks ? textBlocks.map((b: any) => b.text || '').join('').length : 0;
    console.log(`  type=${a.artifact_type} v=${a.artifact_version} text_blocks=${textBlocks?.length ?? 0} total_chars=${totalText}`);
    if (textBlocks && textBlocks.length > 0) {
      console.log(`  first_block_preview: ${(textBlocks[0].text || '').substring(0, 200)}`);
    }
  }

  // Parse status distribution for held entities
  const parseStats: any[] = await db.$queryRaw`
    SELECT ms.parse_status, COUNT(*)::int as count
    FROM merchant_surfaces ms
    JOIN entities e ON e.id = ms.entity_id
    WHERE e.needs_human_review = true
      AND NOT EXISTS (SELECT 1 FROM derived_signals ds WHERE ds.entity_id = e.id AND ds.signal_key = 'identity_signals')
    GROUP BY ms.parse_status
  `;
  console.log('\nParse status distribution for held entities:');
  parseStats.forEach(r => console.log(`  ${r.parse_status || 'null'}: ${r.count}`));

  // Check what extract-identity-signals actually reads
  // It reads from merchant_surface_artifacts.artifact_json.text_blocks
  // OR from golden_records (which is empty)
  // Let's see how many held entities have sufficient text_blocks
  const heldIds: any[] = await db.$queryRaw`
    SELECT e.id FROM entities e
    WHERE e.needs_human_review = true
      AND EXISTS (SELECT 1 FROM merchant_surfaces ms WHERE ms.entity_id = e.id)
      AND NOT EXISTS (SELECT 1 FROM derived_signals ds WHERE ds.entity_id = e.id AND ds.signal_key = 'identity_signals')
  `;

  let hasGoodContent = 0;
  let hasMinimalContent = 0;
  let hasNoContent = 0;

  for (const { id } of heldIds) {
    const arts = await db.merchant_surface_artifacts.findMany({
      where: { merchant_surface: { entity_id: id } },
      select: { artifact_json: true },
    });
    let totalChars = 0;
    for (const a of arts) {
      const json = a.artifact_json as any;
      if (json?.text_blocks) {
        totalChars += json.text_blocks.reduce((sum: number, b: any) => sum + (b.text?.length ?? 0), 0);
      }
    }
    if (totalChars > 500) hasGoodContent++;
    else if (totalChars > 0) hasMinimalContent++;
    else hasNoContent++;
  }

  console.log(`\nHeld entities content quality (${heldIds.length} total):`);
  console.log(`  Good (>500 chars): ${hasGoodContent}`);
  console.log(`  Minimal (1-500 chars): ${hasMinimalContent}`);
  console.log(`  No content (0 chars): ${hasNoContent}`);
}

main().catch(console.error).finally(() => db.$disconnect());
