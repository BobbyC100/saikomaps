/**
 * Automated QA / Lint Rules for SceneSense (fail-closed sanitizer)
 * Spec: Bobby pseudocode
 */

import type { Mode, VoiceOutput } from './voice-engine';

type LintStatus = 'PASS' | 'WARN' | 'FAIL';
type LintAction =
  | 'DROP_STATEMENT'
  | 'DROP_SURFACE'
  | 'REGENERATE'
  | 'DROP_ALL_SCENESENSE'
  | 'BLOCK_PUBLISH';

export type LintResult = {
  status: LintStatus;
  actions: LintAction[];
  reasons: string[];
  cleaned_output: VoiceOutput;
};

const BANNED_WORDS = [
  /locals/i,
  /tourist/i,
  /out-of-towner/i,
  /hipster/i,
  /influencer/i,
  /\bwealthy\b/i,
  /\brich\b/i,
  /\bpoor\b/i,
  /\bbest\b/i,
  /\bworst\b/i,
  /overrated/i,
  /\balways\b/i,
  /\bnever\b/i,
];

const POPULAR_TIMES = /popular times/i;
const EXCLUSIONARY = /(only for|not for|people like|not your crowd)/i;
const TIME_NUMERIC =
  /(\b\d{1,2}\s?(AM|PM)\b)|(\b\d{1,2}:\d{2}\b)|(\b\d{1,2}\s?[–-]\s?\d{1,2}\b)/;
const BUSY_WORDS = /\b(busy|busiest|typically busiest|peak)\b/i;

function cloneOutput(o: VoiceOutput): VoiceOutput {
  return {
    atmosphere: [...(o.atmosphere ?? [])],
    energy: [...(o.energy ?? [])],
    scene: [...(o.scene ?? [])],
  };
}

function dropEmpty(arr: string[]) {
  return arr.filter((s) => s && s.trim().length > 0);
}

function dropBanned(arr: string[], reasons: string[]) {
  return arr.filter((s) => {
    if (POPULAR_TIMES.test(s)) {
      reasons.push('B2_POPULAR_TIMES');
      return false;
    }
    if (EXCLUSIONARY.test(s)) {
      reasons.push('B3_EXCLUSIONARY');
      return false;
    }
    if (BANNED_WORDS.some((re) => re.test(s))) {
      reasons.push('B1_BANNED_WORD');
      return false;
    }
    return true;
  });
}

function cap(arr: string[], max: number, reasons: string[]) {
  if (arr.length <= max) return arr;
  reasons.push('A2_CAP_EXCEEDED');
  return arr.slice(0, max);
}

function commaCloudCheck(arr: string[], reasons: string[]): 'ok' | 'fail' {
  const commaHeavy = arr.some((s) => (s.match(/,/g)?.length ?? 0) >= 3);
  if (commaHeavy) {
    reasons.push('A4_TAG_CLOUD_COMMAS');
    return 'fail';
  }
  return 'ok';
}

function dedupeExact(out: VoiceOutput, reasons: string[]) {
  const seen = new Set<string>();
  const order: Array<keyof VoiceOutput> = [
    'atmosphere',
    'energy',
    'scene',
  ];
  for (const k of order) {
    out[k] = out[k].filter((s) => {
      const key = s.trim().toLowerCase();
      if (seen.has(key)) {
        reasons.push('E1_DUP_EXACT');
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

function enforceBusyPlacement(out: VoiceOutput, reasons: string[]) {
  (['energy', 'scene'] as Array<keyof VoiceOutput>).forEach(
    (k) => {
      out[k] = out[k].filter((s) => {
        if (BUSY_WORDS.test(s)) {
          reasons.push('C2_BUSY_NON_ATMOSPHERE');
          return false;
        }
        return true;
      });
    }
  );
}

function enforceNumericBusy(
  out: VoiceOutput,
  mode: Mode,
  energyConfidence: number,
  reasons: string[]
) {
  out.energy = out.energy.filter((s) => {
    if (!TIME_NUMERIC.test(s)) return true;
    const ok = mode === 'FULL' && energyConfidence >= 0.75;
    if (!ok) {
      reasons.push('C1_NUMERIC_TIME_NOT_ALLOWED');
      return false;
    }
    return true;
  });

  (['atmosphere', 'scene'] as Array<keyof VoiceOutput>).forEach(
    (k) => {
      out[k] = out[k].filter((s) => {
        if (TIME_NUMERIC.test(s)) {
          reasons.push('C1_NUMERIC_TIME_NON_ENERGY');
          return false;
        }
        return true;
      });
    }
  );
}

export function lintSceneSenseOutput(args: {
  prl: number;
  mode: Mode;
  confidence: {
    atmosphere: number;
    energy: number;
    scene: number;
  };
  output: VoiceOutput;
}): LintResult {
  const reasons: string[] = [];
  const actions: LintAction[] = [];
  let status: LintStatus = 'PASS';

  const cleaned = cloneOutput(args.output);

  if (args.prl < 3) {
    status = 'FAIL';
    reasons.push('A1_PRL_LT_3');
    actions.push('DROP_ALL_SCENESENSE');
    return {
      status,
      reasons,
      actions,
      cleaned_output: { atmosphere: [], energy: [], scene: [] },
    };
  }
  if (args.prl === 3 && args.mode !== 'LITE') {
    status = 'FAIL';
    reasons.push('A1_PRL3_NOT_LITE');
    actions.push('DROP_ALL_SCENESENSE');
    return {
      status,
      reasons,
      actions,
      cleaned_output: { atmosphere: [], energy: [], scene: [] },
    };
  }

  const conf = args.confidence;
  if (conf.atmosphere < 0.45) cleaned.atmosphere = [];
  if (conf.energy < 0.45) cleaned.energy = [];
  if (conf.scene < 0.45) cleaned.scene = [];

  cleaned.atmosphere = dropEmpty(cleaned.atmosphere);
  cleaned.energy = dropEmpty(cleaned.energy);
  cleaned.scene = dropEmpty(cleaned.scene);

  cleaned.atmosphere = dropBanned(cleaned.atmosphere, reasons);
  cleaned.energy = dropBanned(cleaned.energy, reasons);
  cleaned.scene = dropBanned(cleaned.scene, reasons);

  enforceBusyPlacement(cleaned, reasons);
  enforceNumericBusy(cleaned, args.mode, conf.energy, reasons);

  const surfaces: Array<keyof VoiceOutput> = [
    'atmosphere',
    'energy',
    'scene',
  ];
  for (const k of surfaces) {
    if (commaCloudCheck(cleaned[k], reasons) === 'fail') {
      status = 'FAIL';
      actions.push('REGENERATE');
      cleaned[k] = [];
    }
  }

  const maxPerSurface = args.mode === 'LITE' ? 2 : 4;
  for (const k of surfaces)
    cleaned[k] = cap(cleaned[k], maxPerSurface, reasons);

  dedupeExact(cleaned, reasons);

  if (args.mode === 'LITE') {
    const forbiddenLite = /(buzziest|peak|settles after)/i;
    cleaned.energy = cleaned.energy.filter((s) => {
      if (forbiddenLite.test(s) || TIME_NUMERIC.test(s)) {
        reasons.push('D2_LITE_TOO_STRONG');
        return false;
      }
      return true;
    });
  }

  if (reasons.length > 0 && status !== 'FAIL') status = 'WARN';
  if (
    reasons.some(
      (r) => r.startsWith('B') || r.startsWith('C') || r.startsWith('A1')
    )
  ) {
    actions.push('DROP_STATEMENT');
  }
  if (status === 'FAIL' && actions.length === 0) actions.push('DROP_SURFACE');

  return { status, reasons, actions, cleaned_output: cleaned };
}
