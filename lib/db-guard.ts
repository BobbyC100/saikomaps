/**
 * DB target guard: fail fast when production scripts run against local DB by mistake.
 * Use in any script that mutates data. Print DB host + database at start; require
 * ALLOW_LOCAL_DB=1 to proceed when DATABASE_URL points at localhost/127.0.0.1.
 */

function parseDatabaseUrl(url: string | undefined): { host: string; database: string } {
  if (!url || typeof url !== 'string') {
    return { host: '', database: '' };
  }
  const raw = url.trim().replace(/^["']|["']$/g, '');
  try {
    // postgresql://user:pass@host:5432/dbname or postgres://...
    const match = raw.match(/@([^/:@]+)(?::\d+)?(?:\/([^?]*))?/);
    const hostPart = match?.[1] ?? '';
    const dbPart = match?.[2] ?? '';
    const host = hostPart.trim(); // host only, no port
    const database = dbPart.split('?')[0].trim() || '';
    return { host, database };
  } catch {
    return { host: '', database: '' };
  }
}

function isLocalHost(host: string, url?: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (h === '' && url && /localhost|127\.0\.0\.1/.test(url)) return true;
  return false;
}

/** Call at script start. Prints DB target; exits process if local and ALLOW_LOCAL_DB is not set. */
export function assertDbTargetAllowed(): void {
  const url = process.env.DATABASE_URL;
  const { host, database } = parseDatabaseUrl(url);

  const dbLabel = host || database ? `${host || '?'} / ${database || '?'}` : url ? '(unparseable)' : '(DATABASE_URL unset)';
  console.log(`[DB] target: ${dbLabel}\n`);

  if (isLocalHost(host, url)) {
    const allow = process.env.ALLOW_LOCAL_DB;
    if (allow !== '1' && allow !== 'true') {
      console.error(
        '[DB] Blocked: DATABASE_URL points at localhost. Production scripts must run against Neon.\n' +
          '  To use Neon: run via db-neon.sh, e.g. ./scripts/db-neon.sh node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/sync-golden-to-places.ts\n' +
          '  Or set DATABASE_URL to your Neon URL (e.g. in .env or .env.db.neon) and run with that env loaded.\n' +
          '  To allow local anyway (e.g. for dev): ALLOW_LOCAL_DB=1 npm run <script>\n' +
          '  Sanity check target: npm run db:whoami   (ensure Prisma matches DB: npm run db:generate)\n'
      );
      process.exit(1);
    }
    console.log('[DB] ALLOW_LOCAL_DB=1 set — proceeding against local.\n');
  }
}

/** Returns a one-line banner string (host + database) for logging. */
export function getDbBanner(): string {
  const url = process.env.DATABASE_URL;
  const { host, database } = parseDatabaseUrl(url);
  if (!host && !database) return 'DATABASE_URL unset or invalid';
  return `host=${host || '?'} database=${database || '?'}`;
}
