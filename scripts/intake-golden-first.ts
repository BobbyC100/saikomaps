#!/usr/bin/env node
/**
 * Golden-first intake: read file → raw_records (lossless).
 * No direct writes to places.
 * CLI: npm run intake -- --batch <id> --source <type> [--file <path>] [--dry-run]
 */

import { PrismaClient, Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { normalizeNameForMatch } from '@/lib/intake-normalize'
import { db } from '@/lib/db'

function parseArgs(): { batchId: string; source: string; filePath: string; dryRun: boolean } {
  const args = process.argv.slice(2)
  const batchIdx = args.indexOf('--batch')
  const sourceIdx = args.indexOf('--source')
  const fileIdx = args.indexOf('--file')
  const batchId = batchIdx >= 0 ? args[batchIdx + 1] : undefined
  const source = sourceIdx >= 0 ? args[sourceIdx + 1] : undefined
  const filePath = fileIdx >= 0 ? args[fileIdx + 1] : path.join(process.cwd(), 'data', 'coverage_seed_v1.txt')
  const dryRun = args.includes('--dry-run')
  if (!batchId || !source) {
    console.error('Usage: intake-golden-first.ts --batch <id> --source <type> [--file <path>] [--dry-run]')
    process.exit(1)
  }
  return { batchId, source, filePath, dryRun }
}

function readLines(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function main() {
  const { batchId, source, filePath, dryRun } = parseArgs()

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath)
    process.exit(1)
  }

  const lines = readLines(filePath)
  if (lines.length === 0) {
    console.log('No lines to ingest')
    process.exit(0)
  }

  const now = new Date()
  let readCount = 0
  let insertedCount = 0
  const sourceName = `intake_${source}`

  for (let i = 0; i < lines.length; i++) {
    const name = lines[i]
    readCount++
    const externalId = `${sourceName}:${batchId}:${i}`
    const rawJson = { name, source, source_type: source, intake_batch_id: batchId }
    const nameNormalized = normalizeNameForMatch(name)

    if (dryRun) {
      console.log('  [dry-run]', name)
      continue
    }

    await db.raw_records.upsert({
      where: {
        source_name_external_id: { source_name: sourceName, external_id: externalId },
      },
      create: {
        source_name: sourceName,
        external_id: externalId,
        raw_json: rawJson as Prisma.JsonValue,
        name_normalized: nameNormalized,
        intake_batch_id: batchId,
        source_type: source,
        imported_at: now,
        ingested_at: now,
        is_processed: false,
      },
      update: {
        raw_json: rawJson as Prisma.JsonValue,
        name_normalized: nameNormalized,
        intake_batch_id: batchId,
        source_type: source,
        imported_at: now,
      },
    })
    insertedCount++
  }

  console.log('Intake summary')
  console.log('  read_count:     %d', readCount)
  console.log('  inserted_count: %d', insertedCount)
  console.log('  batch_id:       %s', batchId)
  console.log('  source:        %s', source)
  if (dryRun) console.log('  (dry-run: no DB writes)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
