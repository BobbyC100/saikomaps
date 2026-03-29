import { describe, expect, it } from 'vitest';
import { selectMostDiverseCandidate, validateCandidateVariety } from './diversity';

describe('validateCandidateVariety', () => {
  it('passes a set with distinct openings and low overlap', () => {
    const candidates: [string, string, string, string] = [
      'Seasonal British cooking with a pastry-led opening act.',
      'Los Feliz corner with neighborhood-room energy and late dinner pull.',
      'Lively service pace, then smoked trout toast and quiche precision.',
      'Rustic British fare meets California restraint.',
    ];
    const result = validateCandidateVariety(candidates);
    expect(result.valid).toBe(true);
    expect(result.repeatedOpenings).toEqual([]);
    expect(result.maxOverlap).toBeLessThan(0.62);
  });

  it('fails when candidates reuse the same opening signature', () => {
    const candidates: [string, string, string, string] = [
      'Natural wine list with broad bottle depth.',
      'Natural wine focus and a lively room.',
      'Natural wine and pastry-led food, all in one pace.',
      'Natural wine authority. Enough said.',
    ];
    const result = validateCandidateVariety(candidates);
    expect(result.valid).toBe(false);
    expect(result.repeatedOpenings.length).toBeGreaterThan(0);
  });
});

describe('selectMostDiverseCandidate', () => {
  it('keeps selected index when it is not repetitive', () => {
    const candidates: [string, string, string, string] = [
      'Rustic British cooking with pastry and breakfast depth.',
      'Los Feliz spot with all-day room rhythm and neighborhood draw.',
      'Warm room energy, then espresso and quiche in steady sequence.',
      'British fare meets California precision.',
    ];
    const pick = selectMostDiverseCandidate(candidates, 0, [
      'Natural wine bar in Echo Park with a sharp by-the-glass list.',
      'Downtown counter service and a focused lunch format.',
    ]);
    expect(pick.index).toBe(0);
    expect(pick.changed).toBe(false);
  });

  it('switches to a less repetitive candidate when overlap is high', () => {
    const candidates: [string, string, string, string] = [
      'Natural wine focus with broad bottle depth and producer detail.',
      'Los Feliz room with breakfast pastries and espresso service.',
      'Service moves quickly, then smoked trout toast and quiche land.',
      'Rustic British fare meets California polish in Los Feliz.',
    ];
    const pick = selectMostDiverseCandidate(candidates, 0, [
      'Natural wine focus with broad bottle depth and producer detail.',
      'Natural wine focus and by-the-glass depth near Silver Lake.',
    ]);
    expect(pick.changed).toBe(true);
    expect(pick.index).not.toBe(0);
  });
});
