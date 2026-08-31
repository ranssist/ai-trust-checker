import { describe, it, expect } from 'vitest';
import { FIXTURES, getFixture } from './index';
import { CAUSE_LABEL, SCORE_BANDS } from '../lib/scoring';
import type { CauseCode, Verdict } from '../lib/types';

/**
 * fixture는 "기대 판정 결과"를 담은 데이터이므로, 그 기대값 자체를 테스트로 못 박아둔다.
 * 나중에 프롬프트나 점수 규칙을 손댔을 때 데모가 조용히 망가지는 걸 막기 위한 안전장치다.
 */

const EXPECTED: Record<string, Verdict[]> = {
  hunminjeongeum: ['supported', 'contradicted', 'contradicted', 'insufficient'],
  'python-version': ['contradicted', 'supported', 'supported', 'contradicted'],
  'nobel-twice': ['contradicted', 'supported', 'contradicted'],
  'highest-mountain': ['contradicted', 'supported', 'supported'],
  'vitamin-c': ['contradicted', 'supported', 'contradicted', 'insufficient'],
};

describe('fixtures', () => {
  it('요구사항대로 3~5개의 예시를 제공한다', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(3);
    expect(FIXTURES.length).toBeLessThanOrEqual(5);
  });

  it('id가 중복되지 않는다', () => {
    const ids = FIXTURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(FIXTURES.map((f) => [f.id, f] as const))('[%s] 기대 판정 순서와 일치한다', (id, f) => {
    expect(f.report.claims.map((c) => c.verdict)).toEqual(EXPECTED[id]);
  });

  it.each(FIXTURES.map((f) => [f.id, f] as const))('[%s] 모든 주장이 정규화를 통과했다', (_id, f) => {
    // 정규화에서 버려진 주장이 있으면 원본 개수와 달라진다.
    expect(f.report.claims.length).toBe(EXPECTED[f.id].length);
    for (const c of f.report.claims) {
      expect(c.text.length).toBeGreaterThan(0);
      expect(c.reasoning.length).toBeGreaterThan(10);
      expect(c.id).toMatch(/^claim-\d+$/);
    }
  });

  it.each(FIXTURES.map((f) => [f.id, f] as const))('[%s] 점수가 판정 밴드 안에 있다', (_id, f) => {
    for (const c of f.report.claims) {
      const [min, max] = SCORE_BANDS[c.verdict];
      expect(c.score).toBeGreaterThanOrEqual(min);
      expect(c.score).toBeLessThanOrEqual(max);
    }
  });

  it.each(FIXTURES.map((f) => [f.id, f] as const))('[%s] 오류 원인 부착 규칙을 지킨다', (_id, f) => {
    for (const c of f.report.claims) {
      if (c.verdict === 'supported') {
        // 근거 있음에는 원인을 붙이지 않는다.
        expect(c.causes).toHaveLength(0);
      } else {
        // 요구사항 4번: 불충분/상충에는 반드시 원인 후보가 붙어야 한다.
        expect(c.causes.length).toBeGreaterThanOrEqual(1);
        for (const cause of c.causes) {
          expect(Object.keys(CAUSE_LABEL)).toContain(cause.code as CauseCode);
          expect(cause.explanation.length).toBeGreaterThan(10);
          expect(cause.likelihood).toBeGreaterThanOrEqual(0);
          expect(cause.likelihood).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it.each(FIXTURES.map((f) => [f.id, f] as const))('[%s] 오류를 심었으므로 총점 상한이 걸린다', (_id, f) => {
    // 모든 예시에 상충 주장이 최소 1개 있으므로 총점은 49를 넘을 수 없다.
    expect(f.report.claims.some((c) => c.verdict === 'contradicted')).toBe(true);
    expect(f.report.overallScore).toBeLessThanOrEqual(49);
  });

  it.each(FIXTURES.map((f) => [f.id, f] as const))('[%s] 발표용 메타데이터가 채워져 있다', (_id, f) => {
    expect(f.label.length).toBeGreaterThan(0);
    expect(f.plantedError.length).toBeGreaterThan(0);
    expect(f.report.summary.length).toBeGreaterThan(10);
    expect(f.report.meta.mode).toBe('fixture');
  });

  it('오류 원인 7종 중 최소 5종이 예시에 등장한다', () => {
    // 발표에서 원인 분류 체계를 보여주려면 종류가 어느 정도 다양해야 한다.
    const seen = new Set(FIXTURES.flatMap((f) => f.report.claims.flatMap((c) => c.causes.map((x) => x.code))));
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });

  it('getFixture가 id로 찾아준다', () => {
    expect(getFixture('nobel-twice')?.label).toContain('노벨상');
    expect(getFixture('없는id')).toBeUndefined();
  });
});
