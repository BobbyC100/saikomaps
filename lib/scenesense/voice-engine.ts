/**
 * SceneSense Voice Engine — Deterministic copy generation
 * Spec: Bobby pseudocode — CanonicalSceneSense + VoiceCtx
 */

export type Mode = 'LITE' | 'FULL';

export type VoiceCtx = {
  prl: 3 | 4;
  mode: Mode;
  confidence: {
    overall: number;
    vibe: number;
    atmosphere: number;
    ambiance: number;
    scene: number;
  };
};

export type VoiceOutput = {
  vibe: string[];
  atmosphere: string[];
  ambiance: string[];
  scene: string[];
};

export type CanonicalSceneSense = {
  vibe?: {
    core?: Array<
      'BUZZY' | 'CHILL' | 'LIVELY' | 'LOW_KEY' | 'CALM' | 'STEADY' | 'ELECTRIC'
    >;
    time_variants?: Partial<
      Record<'early_evening' | 'late' | 'weekend' | 'weekday', string>
    >;
    busy_windows?: Array<{
      label: string;
      confidence: number;
      startHour?: number;
      endHour?: number;
    }>;
    tempo?: Array<'LINGER_FRIENDLY' | 'QUICK_TURN'>;
  };
  atmosphere?: {
    noise?: 'LOUD' | 'CONVERSATIONAL' | 'QUIET';
    lighting?: 'DIM' | 'WARM' | 'BRIGHT';
    density?: 'TIGHT' | 'AIRY' | 'PACKED';
    seating?: Array<'BAR_FORWARD' | 'PATIO_FRIENDLY' | 'COUNTER_FIRST'>;
  };
  ambiance?: {
    formality?: 'CASUAL' | 'CASUAL_REFINED' | 'REFINED';
    service?: 'FULL_SERVICE' | 'COUNTER_SERVICE' | 'BAR_SERVICE';
    comfort?: Array<'RELAXED' | 'POLISHED' | 'UNPRETENTIOUS'>;
  };
  scene?: {
    roles?: Array<
      'DATE_FRIENDLY' | 'AFTER_WORK' | 'GROUP_FRIENDLY' | 'SOLO_FRIENDLY'
    >;
    context?: Array<'NEIGHBORHOOD_STAPLE' | 'DESTINATION_LEANING'>;
  };
};

const BANNED = [
  /locals/i,
  /tourist/i,
  /out-of-towner/i,
  /hipster/i,
  /influencer/i,
  /\bbest\b/i,
  /\bworst\b/i,
  /overrated/i,
  /\balways\b/i,
  /\bnever\b/i,
];

const ENERGY_MAP: Record<string, string> = {
  BUZZY: 'Buzzy',
  CHILL: 'Chill',
  LIVELY: 'Lively',
  LOW_KEY: 'Low-key',
  CALM: 'Calm',
  STEADY: 'Steady',
  ELECTRIC: 'Electric',
};
const ATM_NOISE: Record<string, string> = {
  LOUD: 'Loud',
  CONVERSATIONAL: 'Conversational',
  QUIET: 'Quiet',
};
const ATM_LIGHT: Record<string, string> = {
  DIM: 'Dim',
  WARM: 'Warm-lit',
  BRIGHT: 'Bright',
};
const ATM_DENSITY: Record<string, string> = {
  TIGHT: 'Tight room',
  AIRY: 'Airy',
  PACKED: 'Packed',
};
const AMB_FORMALITY: Record<string, string> = {
  CASUAL: 'Casual',
  CASUAL_REFINED: 'Casual-refined',
  REFINED: 'Refined',
};
const AMB_SERVICE: Record<string, string> = {
  FULL_SERVICE: 'Full service',
  COUNTER_SERVICE: 'Counter service',
  BAR_SERVICE: 'Bar service',
};
const AMB_COMFORT: Record<string, string> = {
  RELAXED: 'Relaxed',
  POLISHED: 'Polished',
  UNPRETENTIOUS: 'Unpretentious',
};
const SCENE_ROLE: Record<string, string> = {
  DATE_FRIENDLY: 'Date-friendly',
  AFTER_WORK: 'After-work',
  GROUP_FRIENDLY: 'Group-friendly',
  SOLO_FRIENDLY: 'Solo-friendly',
};
const SCENE_CONTEXT: Record<string, string> = {
  NEIGHBORHOOD_STAPLE: 'Neighborhood staple',
  DESTINATION_LEANING: 'Destination-leaning',
};

function safePush(out: string[], s?: string) {
  if (!s) return;
  if (BANNED.some((re) => re.test(s))) return;
  out.push(s);
}

function isHighConfidenceForNumericBusy(ctx: VoiceCtx): boolean {
  return ctx.mode === 'FULL' && ctx.confidence.vibe >= 0.75;
}

function formatBusyStatement(
  ctx: VoiceCtx,
  busy?: NonNullable<CanonicalSceneSense['vibe']>['busy_windows']
): string | null {
  if (!busy || busy.length === 0) return null;

  const top = busy
    .slice()
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];

  if (
    isHighConfidenceForNumericBusy(ctx) &&
    typeof top.startHour === 'number' &&
    typeof top.endHour === 'number'
  ) {
    const start = top.startHour;
    const end = top.endHour;
    const to12 = (h: number) => {
      const hr = ((h + 11) % 12) + 1;
      const suffix = h >= 12 ? 'PM' : 'AM';
      return { hr, suffix };
    };
    const s = to12(start);
    const e = to12(end);
    const suffix = s.suffix === e.suffix ? ` ${s.suffix}` : '';
    const range = `${s.hr}–${e.hr}${suffix || ` ${s.suffix}`}`;
    return `Busiest: ${range}`;
  }

  if (ctx.mode === 'LITE' || ctx.confidence.vibe < 0.75) {
    if (top.label === 'EVENING') return 'Typically busiest in the evening';
    if (top.label === 'AFTER_WORK') return 'Often busiest after work';
    return 'Typically gets busiest in the evening';
  }

  return null;
}

export function generateSceneSenseCopy(
  canonical: CanonicalSceneSense,
  ctx: VoiceCtx
): VoiceOutput {
  const out: VoiceOutput = {
    vibe: [],
    atmosphere: [],
    ambiance: [],
    scene: [],
  };

  // VIBE
  if (ctx.confidence.vibe >= 0.45) {
    const core = canonical.vibe?.core?.[0];
    if (core === 'ELECTRIC' && ctx.mode !== 'FULL') {
      // electric is Full-only
    } else {
      safePush(out.vibe, core ? ENERGY_MAP[core] : undefined);
    }

    if (ctx.mode === 'FULL' && ctx.confidence.vibe >= 0.65) {
      const early = canonical.vibe?.time_variants?.early_evening;
      const late = canonical.vibe?.time_variants?.late;
      if (
        early &&
        late &&
        ENERGY_MAP[early] &&
        ENERGY_MAP[late] &&
        early !== late
      ) {
        safePush(
          out.vibe,
          `${ENERGY_MAP[early]} early evening · ${ENERGY_MAP[late]} late`
        );
      }
    }

    const busy = formatBusyStatement(ctx, canonical.vibe?.busy_windows);
    safePush(out.vibe, busy ?? undefined);

    const tempo = canonical.vibe?.tempo?.[0];
    if (tempo === 'LINGER_FRIENDLY') safePush(out.vibe, 'Lingering-friendly');
    if (tempo === 'QUICK_TURN') safePush(out.vibe, 'Quick-turn tables');
  }

  // ATMOSPHERE
  if (ctx.confidence.atmosphere >= 0.45) {
    safePush(
      out.atmosphere,
      canonical.atmosphere?.lighting
        ? ATM_LIGHT[canonical.atmosphere.lighting]
        : undefined
    );
    safePush(
      out.atmosphere,
      canonical.atmosphere?.noise
        ? ATM_NOISE[canonical.atmosphere.noise]
        : undefined
    );
    safePush(
      out.atmosphere,
      canonical.atmosphere?.density
        ? ATM_DENSITY[canonical.atmosphere.density]
        : undefined
    );
    const seating = canonical.atmosphere?.seating?.[0];
    if (seating === 'BAR_FORWARD') safePush(out.atmosphere, 'Bar-forward');
    if (seating === 'PATIO_FRIENDLY') safePush(out.atmosphere, 'Patio-friendly');
  }

  // AMBIANCE
  if (ctx.confidence.ambiance >= 0.45) {
    safePush(
      out.ambiance,
      canonical.ambiance?.formality
        ? AMB_FORMALITY[canonical.ambiance.formality]
        : undefined
    );

    if (ctx.mode === 'FULL' && ctx.confidence.ambiance >= 0.65) {
      const form = canonical.ambiance?.formality
        ? AMB_FORMALITY[canonical.ambiance.formality]
        : null;
      const svc = canonical.ambiance?.service
        ? AMB_SERVICE[canonical.ambiance.service]
        : null;
      if (form && svc)
        safePush(out.ambiance, `${form} · ${svc.toLowerCase()}`);
    } else {
      safePush(
        out.ambiance,
        canonical.ambiance?.service
          ? AMB_SERVICE[canonical.ambiance.service]
          : undefined
      );
    }

    const comfort = canonical.ambiance?.comfort?.[0];
    if (comfort) safePush(out.ambiance, AMB_COMFORT[comfort]);
  }

  // SCENE
  if (ctx.confidence.scene >= 0.45) {
    const role = canonical.scene?.roles?.[0];
    if (role) safePush(out.scene, SCENE_ROLE[role]);

    const context = canonical.scene?.context?.[0];
    if (context) safePush(out.scene, SCENE_CONTEXT[context]);

    if (ctx.mode === 'LITE' && out.scene.length < 2)
      safePush(out.scene, 'Easy repeat spot');
  }

  const cap = (arr: string[], max: number) => arr.slice(0, max);
  const maxPerSurface = ctx.mode === 'LITE' ? 2 : 4;
  out.vibe = cap(out.vibe, maxPerSurface);
  out.atmosphere = cap(out.atmosphere, maxPerSurface);
  out.ambiance = cap(out.ambiance, maxPerSurface);
  out.scene = cap(out.scene, maxPerSurface);

  return out;
}
