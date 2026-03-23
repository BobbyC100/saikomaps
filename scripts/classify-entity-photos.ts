#!/usr/bin/env node
/**
 * classify-entity-photos.ts
 *
 * Classify Instagram media for entities using Claude Haiku vision model.
 * Fetches 12 most recent photos per entity, classifies them, stores photoType.
 *
 * Usage:
 *   # Single entity by slug
 *   npx tsx scripts/classify-entity-photos.ts --slug=buvons
 *
 *   # Single entity by ID
 *   npx tsx scripts/classify-entity-photos.ts --entity-id=<uuid>
 *
 *   # Batch process N entities with Instagram accounts
 *   npx tsx scripts/classify-entity-photos.ts --batch=10
 */

import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const db = new PrismaClient();
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PhotoType = 'INTERIOR' | 'FOOD' | 'BAR_DRINKS' | 'CROWD_ENERGY' | 'DETAIL' | 'EXTERIOR';

interface ClassificationResult {
  mediaId: string;
  photoType: PhotoType;
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────────────────────────────────────

const slugArg = process.argv.find((a) => a.startsWith('--slug='));
const entityArg = process.argv.find((a) => a.startsWith('--entity-id='));
const batchArg = process.argv.find((a) => a.startsWith('--batch='));
const dryRun = process.argv.includes('--dry-run');

const targetSlug = slugArg ? slugArg.split('=')[1] : undefined;
const targetEntityId = entityArg ? entityArg.split('=')[1] : undefined;
const batchSize = batchArg ? parseInt(batchArg.split('=')[1], 10) : undefined;

if (!targetSlug && !targetEntityId && !batchSize) {
  console.error('Usage: --slug=<slug> OR --entity-id=<id> OR --batch=<n>');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Download image and convert to base64
// ─────────────────────────────────────────────────────────────────────────────

async function downloadImageAsBase64(mediaUrl: string): Promise<string | null> {
  try {
    const response = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Saiko Places Bot)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (err) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Classify single image
// ─────────────────────────────────────────────────────────────────────────────

async function classifySingleImage(mediaUrl: string): Promise<PhotoType | null> {
  try {
    // Download image and convert to base64
    const base64 = await downloadImageAsBase64(mediaUrl);
    if (!base64) {
      return null;
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Classify this restaurant/hospitality photo into exactly ONE category. Respond with only the category name, nothing else.

Categories:
- INTERIOR: Indoor dining space, kitchen, bar counter, restaurant interior
- FOOD: Plated dishes, food close-ups, prepared meals
- BAR_DRINKS: Cocktails, drinks, wine, beverages, bar setup
- CROWD_ENERGY: People dining, social atmosphere, customers, gatherings
- DETAIL: Architectural details, decor, furniture, ambiance elements
- EXTERIOR: Outside view, storefront, patio, entrance

Response: `,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const text = content.text.trim().toUpperCase();
      const validTypes: PhotoType[] = ['INTERIOR', 'FOOD', 'BAR_DRINKS', 'CROWD_ENERGY', 'DETAIL', 'EXTERIOR'];
      if (validTypes.includes(text as PhotoType)) {
        return text as PhotoType;
      }
    }
    return null;
  } catch (err) {
    if (process.env.DEBUG_CLASSIFY === '1') {
      console.error('  Classification error:', err);
    }
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Classify photos for entity
// ─────────────────────────────────────────────────────────────────────────────

async function classifyEntityPhotos(entityId: string, entitySlug: string): Promise<void> {
  console.log(`\n📸 Classifying photos for ${entitySlug}...`);

  // Get Instagram account for this entity
  const account = await db.instagram_accounts.findFirst({
    where: { entityId },
    select: { instagramUserId: true, username: true },
  });

  if (!account) {
    console.log(`  ⚠️  No Instagram account found`);
    return;
  }

  // Get 12 most recent media items with URLs (all types: images, videos, carousels)
  const media = await db.instagram_media.findMany({
    where: {
      instagramUserId: account.instagramUserId,
      mediaUrl: { not: null },
    },
    select: {
      id: true,
      mediaUrl: true,
      mediaType: true,
      photoType: true,
    },
    orderBy: { timestamp: 'desc' },
    take: 12,
  });

  if (media.length === 0) {
    console.log(`  ⚠️  No photos found`);
    return;
  }

  const unclassifiedCount = media.filter((m) => !m.photoType).length;
  console.log(`  Found ${media.length} photos from @${account.username} (${unclassifiedCount} unclassified, ${media.length - unclassifiedCount} already classified)`);

  // Classify each photo (skip already-classified ones)
  const results: ClassificationResult[] = [];
  for (let i = 0; i < media.length; i++) {
    const m = media[i];

    if (m.photoType) {
      process.stdout.write(`  [${i + 1}/${media.length}] Already classified... `);
      console.log(`✓ ${m.photoType}`);
      continue;
    }

    process.stdout.write(`  [${i + 1}/${media.length}] Classifying... `);

    const photoType = await classifySingleImage(m.mediaUrl!);
    if (photoType) {
      results.push({ mediaId: m.id, photoType, confidence: 0.95 });
      console.log(`✓ ${photoType}`);
    } else {
      console.log(`✗ (unclassifiable)`);
    }
  }

  // Store classifications
  if (dryRun) {
    console.log(`\n  📋 [DRY RUN] Would update ${results.length} photos:`);
    results.forEach((r) => console.log(`    - ${r.mediaId}: ${r.photoType}`));
  } else {
    console.log(`\n  💾 Storing classifications for ${results.length} photos...`);
    for (const result of results) {
      await db.instagram_media.update({
        where: { id: result.mediaId },
        data: {
          photoType: result.photoType,
          classifiedAt: new Date(),
        },
      });
    }
    console.log(`  ✓ Classifications stored`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  try {
    if (targetSlug) {
      // Single entity by slug
      const entity = await db.entities.findUnique({
        where: { slug: targetSlug },
        select: { id: true, slug: true },
      });
      if (!entity) {
        console.error(`Entity not found: ${targetSlug}`);
        process.exit(1);
      }
      await classifyEntityPhotos(entity.id, entity.slug);
    } else if (targetEntityId) {
      // Single entity by ID
      const entity = await db.entities.findUnique({
        where: { id: targetEntityId },
        select: { id: true, slug: true },
      });
      if (!entity) {
        console.error(`Entity not found: ${targetEntityId}`);
        process.exit(1);
      }
      await classifyEntityPhotos(entity.id, entity.slug);
    } else if (batchSize) {
      // Batch process entities with Instagram accounts
      console.log(`Processing ${batchSize} entities with Instagram accounts...`);

      const entities = await db.entities.findMany({
        where: {
          instagram_accounts: {
            some: {
              media: {
                some: {
                  photoType: null,
                },
              },
            },
          },
        },
        select: { id: true, slug: true },
        take: batchSize,
      });

      console.log(`Found ${entities.length} entities to process`);

      for (const entity of entities) {
        await classifyEntityPhotos(entity.id, entity.slug);
      }
    }

    console.log('\n✅ Done');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
