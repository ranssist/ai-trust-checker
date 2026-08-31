import { describe, it, expect } from 'vitest';
import { normalizeVerdict, normalizeClaim, normalizeReport } from './normalize';
import type { ReportMeta } from './types';

const META: ReportMeta = {
  mode: 'live',
  model: 'test',
  webSearch: false,
  generatedAt: '2026-01-01T00:00:00.000Z',
};

describe('normalizeVerdict', () => {
  it('정상 값을 통과시킨다', () => {
    expect(normalizeVerdict('supported')).toBe('supported');
    expect(normalizeVerdict('contradicted')).toBe('contradicted');
  });

  it('대소문자를 무시한다', () => {
    expect(normalizeVerdict('SUPPORTED')).toBe('supported');
  });

  it('한국어/유사 표현도 최대한 살린다', () => {
    expect(normalizeVerdict('상충함')).toBe('contradicted');
    expect(normalizeVerdict('근거 있음')).toBe('supported');
  });

  it('모르는 값은 가장 보수적인 insufficient로 떨어뜨린다', () => {
    // 알 수 없는 값을 supported로 처리하면 틀린 답변을 초록불로 보여주게 된다.
    expect(normalizeVerdict('bananas')).toBe('insufficient');
    expect(normalizeVerdict(undefined)).toBe('insufficient');
    expect(normalizeVerdict(42)).toBe('insufficient');
  });
});

describe('normalizeClaim', () => {
  it('정상 주장을 그대로 변환한다', () => {
    const c = normalizeClaim(
      {
        text: '세종대왕은 1397년에 태어났다.',
        verdict: 'supported',
        score: 95,
        reasoning: '조선왕조실록과 대조함.',
        evidence: [{ title: '실록', url: 'https://example.com', snippet: '태조 6년' }],
        causes: [],
      },
      0,
    );
    expect(c).not.toBeNull();
    expect(c!.score).toBe(95);
    expect(c!.evidence[0].url).toBe('https://example.com');
  });

  it('주장 문장이 없으면 버린다', () => {
    expect(normalizeClaim({ verdict: 'supported', score: 90 }, 0)).toBeNull();
    expect(normalizeClaim(null, 0)).toBeNull();
    expect(normalizeClaim('문자열', 0)).toBeNull();
  });

  it('id가 없으면 순번으로 만들어준다', () => {
    const c = normalizeClaim({ text: '어떤 주장' }, 2);
    expect(c!.id).toBe('claim-3');
  });

  it('문자열로 온 점수를 숫자로 바꾼다', () => {
    const c = normalizeClaim({ text: 'x', verdict: 'supported', score: '88점' }, 0);
    expect(c!.score).toBe(88);
  });

  it('판정과 점수가 모순되면 점수를 보정한다', () => {
    const c = normalizeClaim({ text: 'x', verdict: 'contradicted', score: 95 }, 0);
    expect(c!.score).toBe(29);
  });

  it('supported 주장에는 원인 후보를 붙이지 않는다', () => {
    const c = normalizeClaim(
      { text: 'x', verdict: 'supported', score: 90, causes: [{ code: 'knowledge_cutoff', explanation: 'e', likelihood: 80 }] },
      0,
    );
    expect(c!.causes).toEqual([]);
  });

  it('정의되지 않은 원인 코드는 버린다', () => {
    const c = normalizeClaim(
      {
        text: 'x',
        verdict: 'contradicted',
        score: 10,
        causes: [
          { code: 'made_up_code', explanation: 'e', likelihood: 90 },
          { code: 'entity_confusion', explanation: '비슷한 회사와 헷갈림', likelihood: 70 },
        ],
      },
      0,
    );
    expect(c!.causes).toHaveLength(1);
    expect(c!.causes[0].code).toBe('entity_confusion');
  });

  it('likelihood를 0~100으로 가둔다', () => {
    const c = normalizeClaim(
      { text: 'x', verdict: 'contradicted', score: 5, causes: [{ code: 'knowledge_cutoff', explanation: 'e', likelihood: 500 }] },
      0,
    );
    expect(c!.causes[0].likelihood).toBe(100);
  });

  it('reasoning이 없으면 기본 문구를 넣는다', () => {
    const c = normalizeClaim({ text: 'x', verdict: 'insufficient' }, 0);
    expect(c!.reasoning).toBe('판정 근거가 제공되지 않았습니다.');
  });

  it('깨진 evidence 항목은 걸러낸다', () => {
    const c = normalizeClaim({ text: 'x', verdict: 'supported', score: 90, evidence: [null, {}, { snippet: '내용' }] }, 0);
    expect(c!.evidence).toHaveLength(1);
    expect(c!.evidence[0].title).toBe('출처');
  });

  describe('verifiedUrls 대조 (지어낸 출처 방지)', () => {
    const raw = {
      text: 'x',
      verdict: 'contradicted',
      score: 10,
      evidence: [{ title: '실제 검색된 기사', url: 'https://real.example.com', snippet: 's' }],
    };

    it('verifiedUrls를 주지 않으면 대조하지 않고 URL을 그대로 둔다(기존 동작, fixture 모드용)', () => {
      const c = normalizeClaim(raw, 0);
      expect(c!.evidence[0].url).toBe('https://real.example.com');
      expect(c!.evidence[0].urlVerified).toBeUndefined();
    });

    it('실제 검색 결과 집합에 URL이 있으면 유지하고 urlVerified: true를 붙인다', () => {
      const c = normalizeClaim(raw, 0, new Set(['https://real.example.com']));
      expect(c!.evidence[0].url).toBe('https://real.example.com');
      expect(c!.evidence[0].urlVerified).toBe(true);
    });

    it('실제 검색 결과에 없는 URL(=지어냈을 가능성)은 링크를 제거하고 urlVerified: false로 표시한다', () => {
      const c = normalizeClaim(raw, 0, new Set(['https://other.example.com']));
      expect(c!.evidence[0].url).toBeUndefined();
      expect(c!.evidence[0].urlVerified).toBe(false);
      expect(c!.evidence[0].title).toBe('실제 검색된 기사'); // 제목/스니펫은 유지 — 근거 자체를 숨기지는 않는다
    });

    it('웹 검색을 아예 안 썼다면(빈 Set) 모든 URL이 미확인 처리된다', () => {
      const c = normalizeClaim(raw, 0, new Set());
      expect(c!.evidence[0].url).toBeUndefined();
      expect(c!.evidence[0].urlVerified).toBe(false);
    });
  });
});

describe('normalizeReport', () => {
  const ctx = { question: 'Q', answer: 'A', meta: META };

  it('총점을 모델 값이 아니라 직접 계산한다', () => {
    const report = normalizeReport(
      {
        summary: '요약',
        overallScore: 99, // 모델이 준 값 — 무시되어야 한다
        claims: [
          { text: 'a', verdict: 'supported', score: 90 },
          { text: 'b', verdict: 'contradicted', score: 10 },
        ],
      },
      ctx,
    );
    // 평균 50이지만 상충이 있으므로 상한 49가 적용된다.
    expect(report.overallScore).toBe(49);
  });

  it('claims가 아예 없어도 죽지 않는다', () => {
    const report = normalizeReport({}, ctx);
    expect(report.claims).toEqual([]);
    expect(report.overallScore).toBe(50);
    expect(report.summary).toContain('찾지 못했');
  });

  it('완전히 엉뚱한 입력도 처리한다', () => {
    expect(() => normalizeReport(null, ctx)).not.toThrow();
    expect(() => normalizeReport('문자열', ctx)).not.toThrow();
    expect(normalizeReport([1, 2, 3], ctx).claims).toEqual([]);
  });

  it('질문/답변/메타는 컨텍스트에서 가져온다', () => {
    const report = normalizeReport({ claims: [] }, ctx);
    expect(report.question).toBe('Q');
    expect(report.meta.mode).toBe('live');
  });

  it('ctx.verifiedUrls가 claims까지 전달된다', () => {
    const report = normalizeReport(
      {
        claims: [
          { text: 'a', verdict: 'supported', score: 90, evidence: [{ title: 't', url: 'https://ok.example.com', snippet: 's' }] },
          { text: 'b', verdict: 'contradicted', score: 10, evidence: [{ title: 't2', url: 'https://fake.example.com', snippet: 's2' }] },
        ],
      },
      { ...ctx, verifiedUrls: new Set(['https://ok.example.com']) },
    );
    expect(report.claims[0].evidence[0].urlVerified).toBe(true);
    expect(report.claims[1].evidence[0].urlVerified).toBe(false);
    expect(report.claims[1].evidence[0].url).toBeUndefined();
  });
});
