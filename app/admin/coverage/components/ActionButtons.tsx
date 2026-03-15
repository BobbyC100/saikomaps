'use client';

import { useState, useCallback } from 'react';

// ── Copy Command Button ──
export function CopyCommandButton({
  command,
  label,
  variant = 'default',
}: {
  command: string;
  label: string;
  variant?: 'default' | 'danger' | 'warning';
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [command]);

  const colors = {
    default: 'border-stone-300 text-stone-700 hover:bg-stone-50',
    danger: 'border-red-300 text-red-700 hover:bg-red-50',
    warning: 'border-yellow-400 text-yellow-800 hover:bg-yellow-50',
  };

  return (
    <button
      onClick={handleCopy}
      title={command}
      className={`text-xs px-2.5 py-1 rounded border transition-colors ${colors[variant]} ${
        copied ? 'bg-green-50 border-green-300 text-green-700' : ''
      }`}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ── Close Place Button (API call) ──
export function ClosePlaceButton({ placeId, placeName }: { placeId: string; placeName: string }) {
  const [state, setState] = useState<'idle' | 'confirming' | 'loading' | 'done' | 'error'>('idle');

  const handleClose = useCallback(async () => {
    if (state === 'idle') {
      setState('confirming');
      return;
    }
    if (state !== 'confirming') return;

    setState('loading');
    try {
      const res = await fetch(`/api/admin/places/${placeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PERMANENTLY_CLOSED', reason: 'Confirmed closed via coverage ops' }),
      });
      if (!res.ok) throw new Error(await res.text());
      setState('done');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [placeId, state]);

  if (state === 'done') return <span className="text-xs text-green-600 font-medium">Closed</span>;
  if (state === 'error') return <span className="text-xs text-red-600">Failed</span>;

  return (
    <button
      onClick={handleClose}
      className={`text-xs px-2.5 py-1 rounded border transition-colors ${
        state === 'confirming'
          ? 'bg-red-100 border-red-400 text-red-800 font-medium'
          : state === 'loading'
          ? 'border-stone-300 text-stone-400 cursor-wait'
          : 'border-red-300 text-red-700 hover:bg-red-50'
      }`}
      disabled={state === 'loading'}
    >
      {state === 'confirming' ? 'Confirm close?' : state === 'loading' ? 'Closing...' : 'Close'}
    </button>
  );
}

// ── Enrich Place Button (copy command) ──
export function EnrichPlaceButton({ slug }: { slug: string }) {
  return (
    <CopyCommandButton
      command={`npm run enrich:place -- --slug=${slug}`}
      label="Enrich"
    />
  );
}

// ── Bulk Action Bar ──
export function BulkActionBar({ issueType, count }: { issueType: string; count: number }) {
  const commands: Record<string, { cmd: string; label: string }> = {
    missing_hours: { cmd: 'npm run coverage:apply:neon -- --apply', label: 'Copy: coverage:apply' },
    missing_price_level: { cmd: 'npm run coverage:apply:neon -- --apply', label: 'Copy: coverage:apply' },
    missing_menu_link: { cmd: 'npm run scan-merchant-surfaces', label: 'Copy: scan-merchant-surfaces' },
    missing_reservations: { cmd: 'npm run scan-merchant-surfaces', label: 'Copy: scan-merchant-surfaces' },
    operating_status_unknown: { cmd: 'npm run coverage:apply:neon -- --apply', label: 'Copy: coverage:apply' },
    google_says_closed: { cmd: 'npm run place:close', label: 'Copy: place:close' },
  };

  const action = commands[issueType];
  if (!action || count === 0) return null;

  return <CopyCommandButton command={action.cmd} label={action.label} variant="warning" />;
}

// ── Row Actions for Red Flags ──
export function RedFlagActions({ placeId, slug }: { placeId: string; slug: string | null }) {
  return (
    <div className="flex gap-1.5">
      {slug && <EnrichPlaceButton slug={slug} />}
      {slug && (
        <a
          href={`/place/${slug}`}
          target="_blank"
          className="text-xs px-2.5 py-1 rounded border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors"
        >
          View
        </a>
      )}
    </div>
  );
}

// ── Row Actions for Tier 2 ──
export function Tier2PlaceActions({
  placeId,
  slug,
  issues,
}: {
  placeId: string;
  slug: string | null;
  issues: string[];
}) {
  const hasClosedIssue = issues.includes('google_says_closed');

  return (
    <div className="flex gap-1.5">
      {slug && <EnrichPlaceButton slug={slug} />}
      {hasClosedIssue && <ClosePlaceButton placeId={placeId} placeName={slug ?? placeId} />}
      {slug && (
        <a
          href={`/place/${slug}`}
          target="_blank"
          className="text-xs px-2.5 py-1 rounded border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors"
        >
          View
        </a>
      )}
    </div>
  );
}
