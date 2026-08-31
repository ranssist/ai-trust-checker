import { useState } from 'react';
import type { Claim } from '../lib/types';
import { VERDICT_UI, CAUSE_LABEL } from '../lib/scoring';

/**
 * 주장 하나를 카드로 그린다.
 * 색상(초록/노랑/빨강)은 scoring.ts의 VERDICT_UI 한 곳에서만 정의하고 여기서 가져다 쓴다.
 */
export function ClaimCard({ claim, index }: { claim: Claim; index: number }) {
  const ui = VERDICT_UI[claim.verdict];
  // 근거가 있는 주장은 접어두고, 문제가 있는 주장만 펼쳐서 보여준다.
  const [open, setOpen] = useState(claim.verdict !== 'supported');

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1 w-full ${ui.bar}`} />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
              {index + 1}
            </span>
            <p className="min-w-0 text-[15px] leading-relaxed font-medium text-slate-900">{claim.text}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${ui.badge}`}>
              {ui.label}
            </span>
            <span className="tabular-nums text-sm font-bold text-slate-700">{claim.score}</span>
          </div>
        </div>

        {/* 점수 막대 — 숫자만으로는 눈에 안 들어와서 시각적으로 한 번 더 보여준다. */}
        <div className="mt-3 ml-9 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${ui.bar}`} style={{ width: `${claim.score}%` }} />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-3 ml-9 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          {open ? '접기 ▲' : '판정 근거 보기 ▼'}
        </button>

        {open && (
          <div className="mt-3 ml-9 space-y-4 border-l-2 border-slate-100 pl-4">
            <section>
              <h4 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">판정 근거</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{claim.reasoning}</p>
            </section>

            {claim.evidence.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">대조한 출처</h4>
                <ul className="mt-1 space-y-1.5">
                  {claim.evidence.map((e, i) => (
                    <li key={i} className="text-sm text-slate-600">
                      {e.url ? (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-gov-blue-dark underline decoration-gov-blue-100 underline-offset-2 hover:decoration-gov-blue"
                        >
                          {e.title}
                        </a>
                      ) : (
                        <span className="font-medium text-slate-700">{e.title}</span>
                      )}
                      {e.urlVerified === false && (
                        <span
                          title="AI가 이 출처의 URL을 제시했지만, 실제 검색 결과에서 찾지 못해 링크를 지웠습니다. 지어낸 출처일 수 있습니다."
                          className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200"
                        >
                          ⚠ 미확인 출처
                        </span>
                      )}
                      {e.snippet && <span className="text-slate-500"> — {e.snippet}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {claim.causes.length > 0 && (
              <section className="rounded-lg bg-slate-50 p-3">
                <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  AI가 왜 이렇게 답했을까
                </h4>
                <ul className="mt-2 space-y-2.5">
                  {claim.causes.map((cause, i) => (
                    <li key={i}>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          {CAUSE_LABEL[cause.code]}
                        </span>
                        <span className="text-[11px] text-slate-400">가능성 {cause.likelihood}%</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{cause.explanation}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
