import { describe, expect, it } from 'vitest';
import { TAGLINE_GENERATOR_SYSTEM_PROMPT_V2 } from './prompts';

describe('tagline generator prompt variety contract', () => {
  it('defines four distinct pattern families', () => {
    expect(TAGLINE_GENERATOR_SYSTEM_PROMPT_V2).toContain('PATTERN 1 — PROGRAM FORWARD');
    expect(TAGLINE_GENERATOR_SYSTEM_PROMPT_V2).toContain('PATTERN 2 — IDENTITY FORWARD');
    expect(TAGLINE_GENERATOR_SYSTEM_PROMPT_V2).toContain('PATTERN 3 — SCENE FORWARD');
    expect(TAGLINE_GENERATOR_SYSTEM_PROMPT_V2).toContain('PATTERN 4 — CONTRAST / AUTHORITY');
  });

  it('explicitly requires structural and cadence variety', () => {
    expect(TAGLINE_GENERATOR_SYSTEM_PROMPT_V2).toContain('Do not reuse the same cadence');
    expect(TAGLINE_GENERATOR_SYSTEM_PROMPT_V2).toContain('Distinct from the other candidates in structure and cadence');
  });
});
