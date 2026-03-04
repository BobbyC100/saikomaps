/**
 * POST /api/admin/places/[id]/intent-profile
 *
 * Set or clear the Intent Profile override for an entity.
 * Admin-only.
 *
 * Body:
 *   { intentProfile: 'transactional' | 'visit-now' | 'go-there' | null,
 *     intentProfileOverride: boolean }
 *
 * - intentProfileOverride=true + intentProfile=<value>  → override active
 * - intentProfileOverride=false (or intentProfile=null)  → computed fallback
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import type { IntentProfile } from '@/lib/intent-profile';

const VALID_PROFILES: IntentProfile[] = ['transactional', 'visit-now', 'go-there'];

interface RequestBody {
  intentProfile: string | null;
  intentProfileOverride: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) throw err;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { intentProfile, intentProfileOverride } = body;

  // Validate enum when override is active
  if (intentProfileOverride && intentProfile !== null) {
    if (!VALID_PROFILES.includes(intentProfile as IntentProfile)) {
      return NextResponse.json(
        { error: `intentProfile must be one of: ${VALID_PROFILES.join(', ')} or null` },
        { status: 400 }
      );
    }
  }

  const entity = await db.entities.findUnique({ where: { id } });
  if (!entity) {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }

  const updated = await db.entities.update({
    where: { id },
    data: {
      intentProfile: intentProfileOverride ? intentProfile : null,
      intentProfileOverride: intentProfileOverride ?? false,
    },
    select: { id: true, name: true, intentProfile: true, intentProfileOverride: true },
  });

  return NextResponse.json({ success: true, entity: updated });
}
