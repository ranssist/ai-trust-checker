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

  // 키는 .env에서만 읽는다. 화면에서 입력받지 않는다.
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
      // fixture 모드는 "미리 계산해둔" 결과를 보여주는 것이므로,
      // 입력이 저장된 예시와 정확히 같을 때만 결과를 낼 수 있다.
      // 사용자가 예시를 고쳤는데 옛 판정을 보여주면 그건 거짓말이 된다.
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
      // 어떤 오류든 화면에 이유를 남긴다. 조용히 실패하면 디버깅이 불가능하다.
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
      {/* 정부24류 공공 서비스 사이트의 "이 누리집은 공식 누리집입니다" 상단 고지 바를 본떴다.
          다만 내용은 정반대 — 우리는 공식 서비스가 아니라는 걸 먼저 밝힌다. */}
      <div className="border-b border-slate-200 bg-gov-ink px-4 py-1.5 text-center text-[11px] text-slate-300 sm:px-6">
        이 페이지는 해커톤 프로토타입입니다 · 대한민국 정부 공식 서비스가 아닙니다
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gov-blue text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 3 4.5 6v5.2c0 4.9 3.2 8.6 7.5 9.8 4.3-1.2 7.5-4.9 7.5-9.8V6L12 3Z" strokeLinejoin="round" />
                <path d="m8.5 12 2.4 2.4L15.8 9.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">AI 답변 신뢰도 검증기</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                AI가 틀렸을 때, <strong className="font-semibold text-slate-700">왜 틀렸는지</strong>까지 설명합니다.
              </p>
            </div>
          </div>
          <a
            href="https://github.com/ranssist/ai-trust-checker"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-gov-blue hover:text-gov-blue sm:flex"
          >
            GitHub 저장소
          </a>
        </div>

        {/* 브레드크럼 — 정부24 서브페이지 상단의 "홈 > 카테고리 > 현재 위치" 패턴. */}
        <div className="border-t border-slate-100 bg-slate-50">
          <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 py-2 text-xs text-slate-500 sm:px-6">
            <span className="text-slate-400">홈</span>
            <span className="text-slate-300">›</span>
            <span className="font-medium text-gov-blue">답변 검증하기</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        {/* 박스형 안내 — 정부24 "공지사항" 카드 패턴을 빌려, 이 도구의 한계를 가장 먼저 알린다. */}
        <div className="flex items-start gap-3 rounded-lg border border-gov-blue-100 bg-gov-blue-50 p-4">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gov-blue text-[11px] font-bold text-white">
            i
          </span>
          <p className="text-xs leading-relaxed text-slate-700">
            <strong className="font-semibold text-gov-blue-dark">안내.</strong> 검증기 자체도 언어모델이라 틀릴 수
            있습니다. 문장 단위로 근거를 쪼개어 보여드리지만, 판정 결과를 최종 근거로 삼지 말고 반드시 원 출처를
            직접 확인하세요.
          </p>
        </div>
      </div>

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
                    report.meta.mode === 'fixture' ? 'bg-slate-200 text-slate-600' : 'bg-gov-blue-100 text-gov-blue-dark'
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

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-[11px] leading-relaxed text-slate-400">
            실시간 정보나 주관적 판단이 섞인 주장에 대해서는 정확도가 낮습니다 · 설명가능성 해커톤 출품작
          </p>
          <p className="mt-1 text-[11px] text-slate-300">
            © 2026 AI 답변 신뢰도 검증기.{' '}
            <a
              href="https://github.com/ranssist/ai-trust-checker"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-slate-200 underline-offset-2 hover:text-gov-blue"
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
