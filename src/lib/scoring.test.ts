import { describe, it, expect } from 'vitest';
import { clampScoreToVerdict, computeOverallScore, countByVerdict, scoreGrade, CONTRADICTED_CAP } from './scoring';
import type { Claim, Verdict } from './types';

function claim(verdict: Verdict, score: number): Claim {
  return { id: 'x', text: 't', verdict, score, reasoning: 'r', evidence: [], causes: [] };
}

describe('clampScoreToVerdict', () => {
  it('밴드 안의 점수는 그대로 둔다', () => {
    expect(clampScoreToVerdict('supported', 85)).toBe(85);
    expect(clampScoreToVerdict('insufficient', 45)).toBe(45);
    expect(clampScoreToVerdict('contradicted', 10)).toBe(10);
  });

  it('판정과 모순되는 높은 점수를 끌어내린다', () => {
    // 모델이 "상충함인데 90점"이라고 주는 실제 사례를 막기 위한 핵심 로직.
    expect(clampScoreToVerdict('contradicted', 90)).toBe(29);
    expect(clampScoreToVerdict('insufficient', 95)).toBe(69);
  });

  it('판정과 모순되는 낮은 점수를 끌어올린다', () => {
    expect(clampScoreToVerdict('supported', 10)).toBe(70);
    expect(clampScoreToVerdict('insufficient', 0)).toBe(30);
  });

  it('숫자가 아니면 밴드 중앙값으로 대체한다', () => {
    expect(clampScoreToVerdict('supported', NaN)).toBe(85);
    expect(clampScoreToVerdict('contradicted', NaN)).toBe(15);
  });

  it('소수점은 반올림한다', () => {
    expect(clampScoreToVerdict('supported', 82.6)).toBe(83);
  });
});

describe('computeOverallScore', () => {
  it('주장이 없으면 중립값 50을 준다', () => {
    expect(computeOverallScore([])).toBe(50);
  });

  it('전부 근거 있음이면 평균을 그대로 쓴다', () => {
    expect(computeOverallScore([claim('supported', 90), claim('supported', 80)])).toBe(85);
  });

  it('상충 주장이 하나라도 있으면 총점에 상한을 건다', () => {
    // 4개 중 3개가 90점이어도, 명백히 틀린 주장이 하나 있으면 답변 전체를 믿을 수 없다.
    const claims = [claim('supported', 90), claim('supported', 90), claim('supported', 90), claim('contradicted', 10)];
    const avg = (90 + 90 + 90 + 10) / 4; // 70
    expect(avg).toBeGreaterThan(CONTRADICTED_CAP);
    expect(computeOverallScore(claims)).toBe(CONTRADICTED_CAP);
  });

  it('상충이 있어도 평균이 이미 상한보다 낮으면 평균을 쓴다', () => {
    expect(computeOverallScore([claim('contradicted', 10), claim('contradicted', 20)])).toBe(15);
  });

  it('근거 불충분만 있으면 상한을 걸지 않는다', () => {
    expect(computeOverallScore([claim('insufficient', 60), claim('insufficient', 60)])).toBe(60);
  });
});

describe('countByVerdict', () => {
  it('판정별로 센다', () => {
    const counts = countByVerdict([claim('supported', 90), claim('contradicted', 5), claim('supported', 75)]);
    expect(counts).toEqual({ supported: 2, insufficient: 0, contradicted: 1 });
  });
});

describe('scoreGrade', () => {
  it('구간별 등급 라벨을 준다', () => {
    expect(scoreGrade(95).label).toBe('대체로 신뢰 가능');
    expect(scoreGrade(55).label).toBe('부분적으로 확인 필요');
    expect(scoreGrade(35).label).toBe('신뢰하기 어려움');
    expect(scoreGrade(10).label).toBe('중대한 오류 포함');
  });
});
