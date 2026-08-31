import { normalizeReport } from '../lib/normalize';
import type { Fixture, Report } from '../lib/types';
import { RAW_CASES } from './cases';

/**
 * fixture 원본 데이터를 실시간 모드와 "똑같은" 정규화 함수에 통과시켜 Report로 만든다.
 *
 * 굳이 이렇게 하는 이유:
 *  - 총점 계산 규칙이 한 곳(computeOverallScore)에만 존재하게 된다.
 *  - fixture에 판정과 모순되는 점수를 적어놔도 자동으로 보정된다.
 *  - 즉 "데모에서만 통하는 별도 경로"가 생기지 않는다.
 */
function buildFixture(raw: (typeof RAW_CASES)[number]): Fixture {
  const report: Report = normalizeReport(
    { summary: raw.summary, claims: raw.claims },
    {
      question: raw.question,
      answer: raw.answer,
      meta: {
        mode: 'fixture',
        webSearch: false,
        // 고정값을 쓴다. 렌더링할 때마다 값이 바뀌면 스냅샷 비교가 불가능해지기 때문.
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    },
  );

  return {
    id: raw.id,
    label: raw.label,
    plantedError: raw.plantedError,
    question: raw.question,
    answer: raw.answer,
    report,
  };
}

export const FIXTURES: Fixture[] = RAW_CASES.map(buildFixture);

export function getFixture(id: string): Fixture | undefined {
  return FIXTURES.find((f) => f.id === id);
}
