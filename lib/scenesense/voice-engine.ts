/**
 * SceneSense Voice Engine — Deterministic copy generation
 * Three lenses: Atmosphere (physical environment) / Energy (activity level) / Scene (social patterns)
 * Spec: SS-FW-001 – SS-FW-004, SS-DISPLAY-CONTRACT-V2
 */

export type Mode = 'LITE' | 'FULL';

export type VoiceCtx = {
  prl: 3 | 4;
  mode: Mode;
  confidence: {
    overall: number;
    atmosphere: number;
    energy: number;
    scene: number;
  };
};

export type VoiceOutput = {
  atmosphere: string[];
  energy: string[];
  scene: string[];
};

export type CanonicalSceneSense = {
  atmosphere?: {
    tempo?: Array<'LINGER_FRIENDLY' | 'QUICK_TURN'>;
    noise?: 'LOUD' | 'CONVERSATIONAL' | 'QUIET';
    lighting?: 'DIM' | 'WARM' | 'BRIGHT';
    density?: 'TIGHT' | 'AIRY' | 'PACKED';
    seating?: Array<'BAR_FORWARD' | 'PATIO_FRIENDLY' | 'COUNTER_FIRST'>;
  };
  energy?: {
    /** Energy character derived from identity_signals.language_signals. */
    tokens?: Array<'BUZZY' | 'CHILL' | 'LIVELY' | 'LOW_KEY' | 'CALM' | 'STEADY' | 'ELECTRIC'>;
    time_variants?: Partial<Record<'early_evening' | 'late' | 'weekend' | 'weekday', string>>;
    busy_windows?: Array<{
      label: string;
      confidence: number;
      startHour?: number;
      endHour?: number;
    }>;
  };
  scene?: {
    roles?: Array<'DATE_FRIENDLY' | 'AFTER_WORK' | 'GROUP_FRIENDLY' | 'SOLO_FRIENDLY'>;
    context?: Array<'NEIGHBORHOOD_STAPLE' | 'DESTINATION_LEANING'>;
    formality?: 'CASUAL' | 'CASUAL_REFINED' | 'REFINED';
    register?: Array<'RELAXED' | 'POLISHED' | 'UNPRETENTIOUS'>;
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
const SCENE_FORMALITY: Record<string, string> = {
  CASUAL: 'Casual',
  CASUAL_REFINED: 'Casual-refined',
  REFINED: 'Refined',
};
const SCENE_REGISTER: Record<string, string> = {
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
  return ctx.mode === 'FULL' && ctx.confidence.energy >= 0.75;
}

function formatBusyStatement(
  ctx: VoiceCtx,
  busy?: NonNullable<CanonicalSceneSense['energy']>['busy_windows']
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

  if (ctx.mode === 'LITE' || ctx.confidence.energy < 0.75) {
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
    atmosphere: [],
    energy: [],
    scene: [],
  };

  // ATMOSPHERE — physical and sensory environment only
  if (ctx.confidence.atmosphere >= 0.45) {
    const tempo = canonical.atmosphere?.tempo?.[0];
    if (tempo === 'LINGER_FRIENDLY') safePush(out.atmosphere, 'Lingering-friendly');
    if (tempo === 'QUICK_TURN') safePush(out.atmosphere, 'Quick-turn tables');

    safePush(
      out.atmosphere,
      canonical.atmosphere?.lighting ? ATM_LIGHT[canonical.atmosphere.lighting] : undefined
    );
    safePush(
      out.atmosphere,
      canonical.atmosphere?.noise ? ATM_NOISE[canonical.atmosphere.noise] : undefined
    );
    safePush(
      out.atmosphere,
      canonical.atmosphere?.density ? ATM_DENSITY[canonical.atmosphere.density] : undefined
    );
    const seating = canonical.atmosphere?.seating?.[0];
    if (seating === 'BAR_FORWARD') safePush(out.atmosphere, 'Bar-forward');
    if (seating === 'PATIO_FRIENDLY') safePush(out.atmosphere, 'Patio-friendly');
  }

  // ENERGY — activity level and temporal rhythm
  if (ctx.confidence.energy >= 0.45) {
    const core = canonical.energy?.tokens?.[0];
    if (core === 'ELECTRIC' && ctx.mode !== 'FULL') {
      // ELECTRIC is Full-only
    } else {
      safePush(out.energy, core ? ENERGY_MAP[core] : undefined);
    }

    if (ctx.mode === 'FULL' && ctx.confidence.energy >= 0.65) {
      const early = canonical.energy?.time_variants?.early_evening;
      const late = canonical.energy?.time_variants?.late;
      if (early && late && ENERGY_MAP[early] && ENERGY_MAP[late] && early !== late) {
        safePush(out.energy, `${ENERGY_MAP[early]} early evening · ${ENERGY_MAP[late]} late`);
      }
    }

    const busy = formatBusyStatement(ctx, canonical.energy?.busy_windows);
    safePush(out.energy, busy ?? undefined);
  }

  // SCENE — social patterns, formality, social register
  if (ctx.confidence.scene >= 0.45) {
    const role = canonical.scene?.roles?.[0];
    if (role) safePush(out.scene, SCENE_ROLE[role]);

    const context = canonical.scene?.context?.[0];
    if (context) safePush(out.scene, SCENE_CONTEXT[context]);

    const formality = canonical.scene?.formality;
    if (formality) safePush(out.scene, SCENE_FORMALITY[formality]);

    const register = canonical.scene?.register?.[0];
    if (register) safePush(out.scene, SCENE_REGISTER[register]);

    if (ctx.mode === 'LITE' && out.scene.length < 2)
      safePush(out.scene, 'Easy repeat spot');
  }

  const cap = (arr: string[], max: number) => arr.slice(0, max);
  const maxPerSurface = ctx.mode === 'LITE' ? 2 : 4;
  out.atmosphere = cap(out.atmosphere, maxPerSurface);
  out.energy = cap(out.energy, maxPerSurface);
  out.scene = cap(out.scene, maxPerSurface);

  return out;
}
