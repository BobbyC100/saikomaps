/**
 * TimeFOLD v1 — Temporal Context Evaluator
 *
 * Interprets existing system signals into user-facing temporal statements.
 * Read-only. Never writes. Produces at most one output class per place.
 *
 * Six output classes (priority order, highest wins):
 *   1. change_transition        — Editorial gate; ownership / concept change
 *   2. new_recently_opened      — Auto (high confidence) or Editorial
 *   3. temporariness_seasonal   — Auto; pop-up or scheduled appearance
 *   4. continuity_established   — Auto; stable long-running presence
 *   5. cultural_longevity       — Editorial-only; not auto-evaluated in v1
 *   6. silence                  — null return; explicitly valid, not a failure
 *
 * See: TimeFOLD v1 System Contract
 */

import { PrismaClient } from '@prisma/client';
import { TIMEFOLD_CONFIG, type TimeFOLDConfig } from './config';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TimeFOLDOutputClass =
  | 'change_transition'
  | 'new_recently_opened'
  | 'temporariness_seasonal'
  | 'continuity_established'
  | 'cultural_longevity';

/** 'auto' = passes confidence gate without human approval. 'editorial' = requires human sign-off. */
export type ApprovalGate = 'auto' | 'editorial';

export interface TimeFOLDOutput {
  outputClass: TimeFOLDOutputClass;
  approvalGate: ApprovalGate;
  /** Computed signal confidence, 0–1. */
  confidence: number;
  /** Suggested copy options for editorial to choose from or adapt. Never displayed raw. */
  exampleCopies: string[];
  /** Provenance: which input classes contributed to this output. */
  inputsUsed: string[];
  evaluatedAt: Date;
}

export interface TimeFOLDContext {
  /**
   * golden_records.canonical_id — primary key for traces and BLIS signals.
   * Required; TimeFOLD is grounded in the golden record layer.
   */
  canonicalId: string;

  /**
   * entities.id — optional; enables actor relationship and appearance signals.
   * If omitted, Change / Transition and Temporariness output classes cannot fire.
   */
  entityId?: string;

  /** Per-call config overrides. Useful for testing or city-specific tuning. */
  config?: Partial<TimeFOLDConfig>;
}

// ---------------------------------------------------------------------------
// Internal signal helpers
// ---------------------------------------------------------------------------

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate TimeFOLD output class for a place.
 *
 * Returns null (Silence) when no output class clears its confidence and
 * approval gates. Silence is correct and intended — not a fallback or error.
 *
 * Provenance contract: every non-null output records the input classes used
 * and the approval path taken (auto vs editorial), satisfying §9 of the
 * System Contract.
 */
export async function evaluateTimeFOLD(
  ctx: TimeFOLDContext
): Promise<TimeFOLDOutput | null> {
  const config: TimeFOLDConfig = { ...TIMEFOLD_CONFIG, ...ctx.config };
  const now = new Date();
  const recentCutoff = new Date(
    now.getTime() - config.changeTransitionWindowDays * 24 * 60 * 60 * 1000
  );

  // -------------------------------------------------------------------------
  // 1. Fetch traces — primary temporal ledger
  // -------------------------------------------------------------------------
  const traces = await prisma.traces.findMany({
    where: { entity_id: ctx.canonicalId },
    orderBy: { observed_at: 'asc' },
    select: {
      event_type: true,
      field_name: true,
      old_value: true,
      new_value: true,
      confidence: true,
      observed_at: true,
      source: true,
    },
  });

  // -------------------------------------------------------------------------
  // 2. Fetch BLIS — golden record lifecycle state
  // -------------------------------------------------------------------------
  const golden = await prisma.golden_records.findUnique({
    where: { canonical_id: ctx.canonicalId },
    select: {
      lifecycle_status: true,
      business_status: true,
      promotion_status: true,
      created_at: true,
    },
  });

  // -------------------------------------------------------------------------
  // 3. Fetch entity-layer signals (actor relationships, appearances)
  //    Only available when entityId is provided.
  // -------------------------------------------------------------------------
  let appearances: { id: string; status: string; scheduleText: string }[] = [];
  let actorRelationships: {
    id: string;
    actorId: string;
    role: string;
    isPrimary: boolean;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }[] = [];

  if (ctx.entityId) {
    [appearances, actorRelationships] = await Promise.all([
      prisma.entity_appearances.findMany({
        where: {
          subjectEntityId: ctx.entityId,
          status: { in: ['ACTIVE', 'ANNOUNCED'] },
        },
        select: { id: true, status: true, scheduleText: true },
      }),
      prisma.entity_actor_relationships.findMany({
        where: { entityId: ctx.entityId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          actorId: true,
          role: true,
          isPrimary: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);
  }

  // -------------------------------------------------------------------------
  // Signal derivation
  // -------------------------------------------------------------------------

  // Trace horizon: when was this entity first seen?
  const creationTrace = traces.find((t) => t.event_type === 'ENTITY_CREATED');
  const creationDate: Date | null = creationTrace?.observed_at ?? golden?.created_at ?? null;
  const daysSinceCreation = creationDate !== null ? daysBetween(creationDate, now) : null;

  // Identity churn: any IDENTITY_REMOVED in history
  const hasIdentityChurn = traces.some((t) => t.event_type === 'IDENTITY_REMOVED');

  // Recent HUMAN_OVERRIDE touching lifecycle or existence
  const recentExistenceOverride = traces.some(
    (t) =>
      t.event_type === 'HUMAN_OVERRIDE' &&
      t.observed_at >= recentCutoff &&
      (t.field_name === 'lifecycle_status' || t.field_name === 'business_status')
  );

  // Recent actor attachment traces (within change window)
  const recentActorAttachments = traces.filter(
    (t) =>
      t.event_type === 'IDENTITY_ATTACHED' &&
      t.field_name === 'actor_relationship' &&
      t.observed_at >= recentCutoff
  );

  // BLIS stability: entity is active and not flagged
  const isBlisStable =
    golden?.lifecycle_status === 'ACTIVE' ||
    golden?.lifecycle_status === 'LEGACY_FAVORITE';

  // -------------------------------------------------------------------------
  // Output class evaluation — priority order: highest first
  // -------------------------------------------------------------------------

  // ---- 1. Change / Transition (Editorial gate; never auto) ----------------
  //
  // Fires when: a recent actor attachment trace exists AND the entity has
  // more than one operator-role relationship (indicating a before/after exists).
  // Editorial approval required per contract §5.C.
  if (ctx.entityId && recentActorAttachments.length > 0) {
    const operatorRelationships = actorRelationships.filter((r) => r.role === 'operator');
    const hasBeforeAndAfter =
      operatorRelationships.length >= 2 ||
      operatorRelationships.some((r) => r.endDate !== null);

    if (hasBeforeAndAfter) {
      return {
        outputClass: 'change_transition',
        approvalGate: 'editorial',
        confidence: 0.75,
        exampleCopies: [
          'Operating under new ownership',
          'Evolved from its earlier concept',
        ],
        inputsUsed: ['traces:IDENTITY_ATTACHED', 'actor_relationships:operator'],
        evaluatedAt: now,
      };
    }
  }

  // ---- 2. New / Recently Opened (Auto at high confidence) -----------------
  //
  // Fires when: ENTITY_CREATED trace (or golden created_at) is within
  // newWindowDays, no identity churn, and confidence clears the auto gate.
  if (daysSinceCreation !== null && daysSinceCreation <= config.newWindowDays && !hasIdentityChurn) {
    // Confidence degrades if no explicit ENTITY_CREATED trace (relying on fallback timestamp)
    const confidence = creationTrace ? 0.9 : 0.7;

    if (confidence >= config.autoConfidenceThreshold) {
      return {
        outputClass: 'new_recently_opened',
        approvalGate: 'auto',
        confidence,
        exampleCopies: ['Recently opened', 'New addition to the neighborhood'],
        inputsUsed: [
          creationTrace ? 'traces:ENTITY_CREATED' : 'golden:created_at',
          'blis:lifecycle_status',
        ],
        evaluatedAt: now,
      };
    }

    // Below auto threshold — flag for editorial rather than silence
    return {
      outputClass: 'new_recently_opened',
      approvalGate: 'editorial',
      confidence,
      exampleCopies: ['Recently opened'],
      inputsUsed: [
        creationTrace ? 'traces:ENTITY_CREATED' : 'golden:created_at',
      ],
      evaluatedAt: now,
    };
  }

  // ---- 3. Temporariness / Seasonality (Auto) ------------------------------
  //
  // Fires when: entity has active or announced appearances (pop-up, market
  // stall, seasonal installation). Blocked if entity also has a fixed-location
  // contradiction (BLIS stable + no appearances — handled by absence of signal).
  if (ctx.entityId && appearances.length > 0) {
    return {
      outputClass: 'temporariness_seasonal',
      approvalGate: 'auto',
      confidence: 0.9,
      exampleCopies: ['Seasonal pop-up', 'Temporary installation'],
      inputsUsed: ['entity_appearances:ACTIVE'],
      evaluatedAt: now,
    };
  }

  // ---- 4. Continuity / Established (Auto) ---------------------------------
  //
  // Fires when: BLIS is stable, trace horizon exceeds continuityWindowDays,
  // no identity churn, and no recent HUMAN_OVERRIDE affecting existence.
  if (
    isBlisStable &&
    daysSinceCreation !== null &&
    daysSinceCreation > config.continuityWindowDays &&
    !hasIdentityChurn &&
    !recentExistenceOverride
  ) {
    return {
      outputClass: 'continuity_established',
      approvalGate: 'auto',
      confidence: 0.88,
      exampleCopies: ['Established neighborhood presence', 'Long-running local fixture'],
      inputsUsed: [
        'blis:lifecycle_status',
        creationTrace ? 'traces:ENTITY_CREATED' : 'golden:created_at',
      ],
      evaluatedAt: now,
    };
  }

  // ---- 5. Cultural Longevity — not auto-evaluated in v1 -------------------
  //
  // Per contract §5.E and §10: editorial-only, requires explicit human approval.
  // Not surfaced by automated evaluation. The editorial review surface is
  // responsible for emitting this class directly when a curator approves.
  //
  // Future: evaluator may suggest candidacy (confidence signal) without auto-output.

  // ---- 6. Silence ---------------------------------------------------------
  //
  // No output class cleared its gate. This is correct and intended per §3.F.
  return null;
}
