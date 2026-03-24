/**
 * Coverage Operations — Tool Action Wiring
 *
 * Maps each issue_type to the API endpoint that resolves it.
 * Used by both individual row actions and bulk operations.
 */

import type { IssueRow, GoogleSaysClosedDetail } from './types';

export interface ToolConfig {
  label: string;
  queuedLabel: string;
  isLink?: boolean;
  href?: string;
  invoke?: (issue: IssueRow) => Promise<Response>;
  /** If set, bulk action calls this once with all issues instead of looping invoke() */
  bulkInvoke?: (issues: IssueRow[]) => Promise<Response>;
  /** @deprecated Use bulkInvoke instead */
  batchOnce?: boolean;
}

export const TOOL_ACTIONS: Record<string, ToolConfig> = {
  unresolved_identity: {
    label: 'Strengthen Identity',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/discover-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Resolve identity by strengthening anchor coverage (website + Instagram),
        // not by assuming GPID is the only path.
        body: JSON.stringify({ mode: 'both', slug: issue.entity_slug }),
      }),
  },
  missing_gpid: {
    label: 'Find GPID',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/seed-gpid-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: issue.entity_id }),
      }),
    bulkInvoke: (issues) =>
      fetch('/api/admin/tools/seed-gpid-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityIds: issues.map((i) => i.entity_id) }),
      }),
  },
  enrichment_incomplete: {
    label: 'Enrich',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch(`/api/admin/enrich/${encodeURIComponent(issue.entity_slug)}`, { method: 'POST' }),
  },
  missing_coords: {
    label: 'Run Stage 1',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/enrich-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: encodeURIComponent(issue.entity_slug), stage: 1 }),
      }),
  },
  missing_neighborhood: {
    label: 'Derive',
    queuedLabel: 'Done',
    invoke: (issue) =>
      fetch('/api/admin/tools/derive-neighborhood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: issue.entity_id }),
      }),
  },
  missing_hours: {
    label: 'Run Stage 1',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/enrich-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: encodeURIComponent(issue.entity_slug), stage: 1 }),
      }),
  },
  missing_price_level: {
    label: 'Run Stage 1',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/enrich-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: encodeURIComponent(issue.entity_slug), stage: 1 }),
      }),
  },
  operating_status_unknown: {
    label: 'Run Stage 1',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/enrich-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: encodeURIComponent(issue.entity_slug), stage: 1 }),
      }),
  },
  missing_menu_link: {
    label: 'Run Stage 6',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/enrich-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: encodeURIComponent(issue.entity_slug), stage: 6 }),
      }),
  },
  missing_reservations: {
    label: 'Run Stage 6',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/enrich-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: encodeURIComponent(issue.entity_slug), stage: 6 }),
      }),
  },
  missing_website: {
    label: 'Discover Web',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/discover-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'website', slug: encodeURIComponent(issue.entity_slug) }),
      }),
  },
  missing_phone: {
    label: 'Run Stage 1',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/enrich-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: encodeURIComponent(issue.entity_slug), stage: 1 }),
      }),
  },
  missing_instagram: {
    label: 'Discover IG',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/discover-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'instagram', slug: encodeURIComponent(issue.entity_slug) }),
      }),
  },
  missing_tiktok: {
    label: 'Discover TikTok',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/discover-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'tiktok', slug: encodeURIComponent(issue.entity_slug) }),
      }),
  },
  google_says_closed: {
    label: 'Mark Closed',
    queuedLabel: 'Done',
    invoke: async (issue) => {
      const detail = issue.detail as GoogleSaysClosedDetail | null;
      const googleStatus = detail?.googleStatus;
      const newStatus = googleStatus === 'CLOSED_PERMANENTLY' ? 'PERMANENTLY_CLOSED' : 'CLOSED';
      return fetch(`/api/admin/entities/${issue.entity_id}/patch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'status', value: newStatus }),
      });
    },
  },
  potential_duplicate: {
    label: 'Review / Merge',
    queuedLabel: 'Done',
    // invoke is not used — handled by special case in handleAction
  },
};
