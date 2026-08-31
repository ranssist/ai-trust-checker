import type { Claim, Cause, CauseCode, Evidence, Report, ReportMeta, Verdict } from './types';
import { clampScoreToVerdict, computeOverallScore } from './scoring';
import { CAUSE_LABEL } from './scoring';

/**
 * 모델이 돌려준 JSON을 앱이 믿고 쓸 수 있는 Report로 정규화한다.
 *
 * LLM 출력은 스키마를 줘도 가끔 어긋난다(필드 누락, 오타난 enum, 문자열로 온 숫자).
 * 여기서 한 번 걸러주면 UI 컴포넌트마다 방어 코드를 넣지 않아도 된다.
 * 순수 함수라서 Vitest로 이상한 입력을 마음껏 넣어볼 수 있다.
 */

const VALID_VERDICTS: Verdict[] = ['supported', 'insufficient', 'contradicted'];
const VALID_CAUSES = Object.keys(CAUSE_LABEL) as CauseCode[];

function asString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return fallback;
}

function asNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** 모르는 판정값이 오면 가장 보수적인 쪽(근거 불충분)으로 떨어뜨린다. 함부로 '근거 있음'을 주면 안 되므로. */
export function normalizeVerdict(v: unknown): Verdict {
  const s = asString(v).toLowerCase();
  if ((VALID_VERDICTS as string[]).includes(s)) return s as Verdict;
  // 한국어나 다른 표현으로 온 경우도 최대한 살려본다.
  if (/support|근거\s*있|사실|true|verified/.test(s)) return 'supported';
  if (/contradict|상충|거짓|false|incorrect|wrong/.test(s)) return 'contradicted';
  return 'insufficient';
}

/**
 * @param verifiedUrls 실제로 web_search가 반환한 URL 집합.
 *   - Set이 주어지면(=실시간 모드에서 검증을 수행함) 모델이 제출한 URL을 이 집합과 대조한다.
 *     집합에 없는 URL은 모델이 지어냈을 가능성이 있으므로 제거하고 urlVerified: false로 표시한다.
 *     검색을 아예 껐다면 이 집합은 비어 있으므로 URL이 있는 모든 evidence가 미확인 처리된다 —
 *     검색 없이는 어떤 URL도 실제로 존재를 확인할 방법이 없기 때문에 의도된 동작이다.
 *   - undefined면 대조를 하지 않는다(fixture 모드처럼 사람이 직접 큐레이션한 데이터).
 */
function normalizeEvidence(raw: unknown, verifiedUrls?: Set<string>): Evidence | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const snippet = asString(r.snippet ?? r.quote ?? r.text);
  const title = asString(r.title ?? r.source);
  // 제목과 인용문이 둘 다 비면 화면에 보여줄 게 없으므로 버린다.
  // (기본값 '출처'를 먼저 넣어버리면 이 가드가 절대 걸리지 않는다 — 실제로 그 버그가 있었다.)
  if (!snippet && !title) return null;
  const url = asString(r.url ?? r.link);
  const resolvedTitle = title || '출처';

  if (!url) return { title: resolvedTitle, snippet };
  if (!verifiedUrls) return { title: resolvedTitle, snippet, url };

  return verifiedUrls.has(url)
    ? { title: resolvedTitle, snippet, url, urlVerified: true }
    : { title: resolvedTitle, snippet, urlVerified: false }; // 지어낸 URL로 의심 — 링크 제거
}

function normalizeCause(raw: unknown): Cause | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const code = asString(r.code) as CauseCode;
  if (!VALID_CAUSES.includes(code)) return null; // 정의되지 않은 원인 코드는 버린다
  const likelihoodRaw = asNumber(r.likelihood);
  return {
    code,
    explanation: asString(r.explanation, CAUSE_LABEL[code]),
    likelihood: Number.isFinite(likelihoodRaw) ? Math.min(100, Math.max(0, Math.round(likelihoodRaw))) : 50,
  };
}

export function normalizeClaim(raw: unknown, index: number, verifiedUrls?: Set<string>): Claim | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const text = asString(r.text ?? r.claim ?? r.statement);
  if (!text) return null; // 주장 문장이 없으면 카드로 그릴 게 없다

  const verdict = normalizeVerdict(r.verdict ?? r.status);
  const score = clampScoreToVerdict(verdict, asNumber(r.score ?? r.confidence));

  // 근거 있음으로 판정된 주장에는 원인 후보를 붙이지 않는다(요구사항 4번).
  const causes =
    verdict === 'supported'
      ? []
      : asArray(r.causes).map(normalizeCause).filter((c): c is Cause => c !== null);

  return {
    id: asString(r.id) || `claim-${index + 1}`,
    text,
    verdict,
    score,
    reasoning: asString(r.reasoning ?? r.explanation, '판정 근거가 제공되지 않았습니다.'),
    evidence: asArray(r.evidence)
      .map((e) => normalizeEvidence(e, verifiedUrls))
      .filter((e): e is Evidence => e !== null),
    causes,
  };
}

export interface NormalizeContext {
  question: string;
  answer: string;
  meta: ReportMeta;
  /** verify.ts가 실제 web_search 응답에서 수집한 URL 집합. normalizeEvidence의 verifiedUrls 설명 참고. */
  verifiedUrls?: Set<string>;
}

export function normalizeReport(raw: unknown, ctx: NormalizeContext): Report {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  const claims = asArray(r.claims)
    .map((c, i) => normalizeClaim(c, i, ctx.verifiedUrls))
    .filter((c): c is Claim => c !== null);

  return {
    question: ctx.question,
    answer: ctx.answer,
    claims,
    // 총점은 모델이 준 값을 쓰지 않고 항상 우리가 다시 계산한다.
    // 그래야 "판정은 상충인데 총점은 높음" 같은 앞뒤 안 맞는 결과가 화면에 안 나온다.
    overallScore: computeOverallScore(claims),
    summary: asString(r.summary, claims.length ? '' : '검증 가능한 사실 주장을 찾지 못했습니다.'),
    meta: ctx.meta,
  };
}
