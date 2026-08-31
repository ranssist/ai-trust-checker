import type { Claim, Verdict, CauseCode } from './types';

/**
 * 판정별 허용 점수 구간.
 * 모델이 "상충함인데 신뢰도 85점" 같은 모순된 값을 뱉는 일이 실제로 있어서,
 * 판정을 기준으로 점수를 이 구간 안으로 강제로 밀어넣는다.
 */
export const SCORE_BANDS: Record<Verdict, readonly [number, number]> = {
  supported: [70, 100],
  insufficient: [30, 69],
  contradicted: [0, 29],
};

/** 판정과 점수가 모순되지 않도록 점수를 밴드 안으로 클램프한다. */
export function clampScoreToVerdict(verdict: Verdict, rawScore: number): number {
  const [min, max] = SCORE_BANDS[verdict];
  // NaN이나 undefined가 들어오면 밴드 중앙값으로 대체 (앱이 죽지 않게).
  if (!Number.isFinite(rawScore)) return Math.round((min + max) / 2);
  return Math.min(max, Math.max(min, Math.round(rawScore)));
}

/**
 * 총점 계산.
 * 단순 평균만 쓰면 "10개 중 9개 맞았으니 90점" 이 되어버리는데,
 * 사실 확인에서는 명백히 틀린 주장 1개가 답변 전체의 신뢰를 무너뜨린다.
 * 그래서 상충 주장이 하나라도 있으면 총점에 상한(49점)을 건다.
 */
export const CONTRADICTED_CAP = 49;

export function computeOverallScore(claims: Claim[]): number {
  if (claims.length === 0) return 50; // 검증할 주장이 없으면 판단 보류 = 중립값
  const avg = claims.reduce((sum, c) => sum + c.score, 0) / claims.length;
  const hasContradiction = claims.some((c) => c.verdict === 'contradicted');
  const rounded = Math.round(avg);
  return hasContradiction ? Math.min(rounded, CONTRADICTED_CAP) : rounded;
}

/** 판정별 개수. 대시보드 상단 요약 칩에 쓴다. */
export function countByVerdict(claims: Claim[]): Record<Verdict, number> {
  const counts: Record<Verdict, number> = { supported: 0, insufficient: 0, contradicted: 0 };
  for (const c of claims) counts[c.verdict] += 1;
  return counts;
}

/** 화면 표시용 한국어 라벨과 Tailwind 색상 클래스. */
export const VERDICT_UI: Record<Verdict, { label: string; badge: string; bar: string; dot: string }> = {
  supported: {
    label: '근거 있음',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  insufficient: {
    label: '근거 불충분',
    badge: 'bg-amber-100 text-amber-800 ring-amber-600/20',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  contradicted: {
    label: '상충함',
    badge: 'bg-red-100 text-red-800 ring-red-600/20',
    bar: 'bg-red-500',
    dot: 'bg-red-500',
  },
};

/** 오류 원인 코드 → 사람이 읽는 이름. UI와 프롬프트 양쪽에서 재사용한다. */  
export const CAUSE_LABEL: Record<CauseCode, string> = {
  knowledge_cutoff: '학습 시점 이후 변경',
  entity_confusion: '유사 대상과 혼동',
  question_ambiguity: '질문 모호성으로 인한 오독',
  overgeneralization: '과잉 일반화',
  fabricated_specifics: '세부 정보 지어냄',
  source_conflict: '출처 간 불일치',
  unverifiable_by_nature: '원리상 검증 불가',
};

/** 총점 → 한 줄 등급. */
export function scoreGrade(score: number): { label: string; tone: string } {
  if (score >= 70) return { label: '대체로 신뢰 가능', tone: 'text-emerald-700' };
  if (score >= 50) return { label: '부분적으로 확인 필요', tone: 'text-amber-700' };
  if (score >= 30) return { label: '신뢰하기 어려움', tone: 'text-orange-700' };
  return { label: '중대한 오류 포함', tone: 'text-red-700' };
}
