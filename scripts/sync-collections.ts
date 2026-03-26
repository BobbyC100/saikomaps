import { db } from '@/lib/db'
import { previewCollectionSync, applyCollectionSync } from '@/lib/collections/sync'

type ParsedArgs = {
  apply: boolean
  userId: string | null
  verbose: boolean
  json: boolean
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const verbose = args.includes('--verbose')
  const json = args.includes('--json')
  const userIdArg = args.find((item) => item.startsWith('--user-id='))
  const userId = userIdArg ? userIdArg.replace('--user-id=', '') : null
  return {
    apply,
    verbose,
    json,
    userId: userId || process.env.SAIKO_COLLECTIONS_USER_ID || null,
  }
}

async function main() {
  const { apply, userId, verbose, json } = parseArgs()

  if (!apply) {
    const preview = await previewCollectionSync()
    const withEntities = preview.filter((item) => item.entityCount > 0).length
    const empty = preview.filter((item) => item.entityCount === 0)
    const reasonCounts = new Map<string, number>()
    for (const row of empty) {
      const key = row.reason ?? 'unknown'
      reasonCounts.set(key, (reasonCounts.get(key) || 0) + 1)
    }

    if (json) {
      const payload = {
        summary: {
          totalCollections: preview.length,
          withEntities,
          emptyCollections: empty.length,
          reasonCounts: [...reasonCounts.entries()].reduce<Record<string, number>>((acc, [key, value]) => {
            acc[key] = value
            return acc
          }, {}),
        },
        emptyCollections: empty,
        allCollections: preview,
      }
      console.log(JSON.stringify(payload, null, 2))
      return
    }

    console.log(`Previewed ${preview.length} collections (${withEntities} with at least 1 entity).`)
    if (verbose) {
      console.log(`\nEmpty collections: ${empty.length}`)
      console.log('\nReason summary:')
      ;[...reasonCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .forEach(([reason, count]) => {
          console.log(`- ${reason}: ${count}`)
        })

      console.log('\nEmpty collection details:')
      empty.forEach((row) => {
        console.log(
          `- ${row.slug} | scope=${row.scope} vertical=${row.verticalKey} sourceNeighborhoods=${row.sourceNeighborhoods} verticalPool=${row.verticalPoolCount} neighborhoodPool=${row.neighborhoodPoolCount} reason=${row.reason}`
        )
      })
    }
    console.log('Run with --apply --user-id=<owner-id> to write changes.')
    return
  }

  if (!userId) {
    throw new Error('Missing --user-id=<owner-id> (or set SAIKO_COLLECTIONS_USER_ID)')
  }

  await applyCollectionSync({ userId })
  console.log('Collection sync complete.')
}

main()
  .catch((error) => {
    console.error('sync-collections failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
