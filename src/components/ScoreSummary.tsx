import type { Report } from '../lib/types';
import { countByVerdict, scoreGrade, VERDICT_UI } from '../lib/scoring';

/** 총점 도넛 게이지. SVG 원의 stroke-dasharray로 채움 비율을 표현한다. */
function ScoreDial({ score }: { score: number }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : score >= 30 ? '#f97316' : '#ef4444';

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0 -rotate-90">
      <circle cx="60" cy="60" r={R} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${(C * score) / 100} ${C}`}
      />
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90 fill-slate-900 text-[28px] font-bold"
        style={{ transformOrigin: '60px 60px' }}
      >
        {score}
      </text>
    </svg>
  );
}

export function ScoreSummary({ report }: { report: Report }) {
  const counts = countByVerdict(report.claims);
  const grade = scoreGrade(report.overallScore);
  const hasContradiction = counts.contradicted > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ScoreDial score={report.overallScore} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className={`text-lg font-bold ${grade.tone}`}>{grade.label}</h2>
            <span className="text-xs text-slate-400">종합 신뢰도 {report.overallScore}/100</span>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">{report.summary}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {(['supported', 'insufficient', 'contradicted'] as const).map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 ring-inset"
              >
                <span className={`h-2 w-2 rounded-full ${VERDICT_UI[v].dot}`} />
                {VERDICT_UI[v].label} {counts[v]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {hasContradiction && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800">
          사실과 어긋나는 주장이 {counts.contradicted}개 있습니다. 이런 경우 종합 점수는 49점을 넘지 못하도록
          제한됩니다. 나머지 내용이 정확하더라도 이 답변을 그대로 인용하면 안 됩니다.
        </p>
      )}
    </div>
  );
}
