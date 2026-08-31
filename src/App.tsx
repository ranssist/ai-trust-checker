import { useMemo, useState } from 'react';
import { InputPanel, type Mode } from './components/InputPanel';
import { ScoreSummary } from './components/ScoreSummary';
import { ClaimCard } from './components/ClaimCard';
import { FIXTURES } from './fixtures';
import { parseQA, validateInput } from './lib/parseQA';
import { findFixtureByAnswer, fixtureToInputText } from './lib/fixtureMatch';
import { readApiKey, verifyWithApi, VerifyError, MODEL_ID } from './lib/verify';
import type { Fixture, Report } from './lib/types';

export default function App() {
  const [mode, setMode] = useState<Mode>('fixture');
  const [text, setText] = useState('');
  const [activeFixtureId, setActiveFixtureId] = useState<string | null>(null);
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const apiKey = useMemo(() => readApiKey(), []);

  function pickFixture(f: Fixture) {
    setActiveFixtureId(f.id);
    setText(fixtureToInputText(f));
    setReport(null);
    setError('');
  }

  async function handleSubmit() {
    setError('');
    setReport(null);

    const parsed = parseQA(text);
    const valid = validateInput(parsed);
    if (!valid.ok) {
      setError(valid.message ?? '입력을 확인해 주세요.');
      return;
    }

    if (mode === 'fixture') {
      const match = findFixtureByAnswer(parsed.answer, FIXTURES);
      if (!match) {
        setError(
          '저장된 예시와 내용이 다릅니다. 위 예시 중 하나를 그대로 고르거나, "실시간 검증" 모드로 전환하세요.',
        );
        return;
      }
      setActiveFixtureId(match.id);
      setReport(match.report);
      return;
    }

    setLoading(true);
    setProgress('요청을 준비하는 중…');
    try {
      const result = await verifyWithApi({
        apiKey,
        question: parsed.question,
        answer: parsed.answer,
        useWebSearch,
        onProgress: setProgress,
      });
      setReport(result);
    } catch (e) {
      const msg =
        e instanceof VerifyError
          ? e.message
          : e instanceof Error
            ? `API 호출 실패: ${e.message}`
            : '알 수 없는 오류가 발생했습니다.';
      setError(msg);
      console.error('[verify] 실패:', e);
    } finally {
      setLoading(false);
      setProgress('');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">AI 답변 신뢰도 검증기</h1>
          <p className="mt-1 text-sm text-slate-500">
            AI가 틀렸을 때, <strong className="font-semibold text-slate-700">왜 틀렸는지</strong>까지 설명합니다 —
            주장 단위로 쪼개고, 출처와 대조하고, 오류의 원인 후보를 붙입니다.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="lg:sticky lg:top-6 lg:self-start">
          <InputPanel
            mode={mode}
            onModeChange={(m) => {
              setMode(m);
              setReport(null);
              setError('');
            }}
            text={text}
            onTextChange={(t) => {
              setText(t);
              setActiveFixtureId(null);
            }}
            fixtures={FIXTURES}
            activeFixtureId={activeFixtureId}
            onPickFixture={pickFixture}
            useWebSearch={useWebSearch}
            onWebSearchChange={setUseWebSearch}
            hasApiKey={Boolean(apiKey)}
            loading={loading}
            onSubmit={handleSubmit}
          />
        </section>

        <section className="min-w-0 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800">
              {error}
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-slate-800" />
              <p className="mt-3 text-sm text-slate-600">{progress}</p>
              <p className="mt-1 text-xs text-slate-400">
                웹 검색을 켜면 30초 이상 걸릴 수 있습니다.
              </p>
            </div>
          )}

          {!loading && !report && !error && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm font-medium text-slate-600">아직 검증한 답변이 없습니다.</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                왼쪽에서 예시를 고르거나, 챗봇 답변을 붙여넣고 검증을 눌러 보세요.
              </p>
            </div>
          )}

          {report && (
            <>
              <ScoreSummary report={report} />

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span
                  className={`rounded px-1.5 py-0.5 font-semibold ${
                    report.meta.mode === 'fixture' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {report.meta.mode === 'fixture' ? '저장된 예시' : '실시간 검증'}
                </span>
                <span>모델 {report.meta.model ?? MODEL_ID}</span>
                <span>웹 검색 {report.meta.webSearch ? '사용' : '미사용'}</span>
                {report.meta.durationMs != null && <span>{(report.meta.durationMs / 1000).toFixed(1)}초 소요</span>}
              </div>

              <ol className="space-y-3">
                {report.claims.map((c, i) => (
                  <ClaimCard key={c.id} claim={c} index={i} />
                ))}
              </ol>

              {report.claims.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  검증 가능한 사실 주장을 찾지 못했습니다. 의견이나 지시문만 있는 답변일 수 있습니다.
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pt-2 pb-10 sm:px-6">
        <p className="text-[11px] leading-relaxed text-slate-400">
          이 도구는 프로토타입입니다. 검증기 자체도 언어모델이라 틀릴 수 있으며, 실시간 정보나 주관적 판단이 섞인
          주장에 대해서는 정확도가 낮습니다. 판정 결과를 최종 근거로 삼지 말고 반드시 원 출처를 직접 확인하세요.
        </p>
      </footer>
    </div>
  );
}
