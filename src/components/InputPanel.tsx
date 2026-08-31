import type { Fixture } from '../lib/types';

export type Mode = 'fixture' | 'live';

interface Props {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  text: string;
  onTextChange: (t: string) => void;
  fixtures: Fixture[];
  activeFixtureId: string | null;
  onPickFixture: (f: Fixture) => void;
  useWebSearch: boolean;
  onWebSearchChange: (v: boolean) => void;
  hasApiKey: boolean;
  loading: boolean;
  onSubmit: () => void;
}

export function InputPanel(props: Props) {
  const {
    mode, onModeChange, text, onTextChange, fixtures, activeFixtureId, onPickFixture,
    useWebSearch, onWebSearchChange, hasApiKey, loading, onSubmit,
  } = props;

  const liveBlocked = mode === 'live' && !hasApiKey;

  return (
    <div className="space-y-4">
      {/* 모드 토글 — 요구사항 6번. API 키/네트워크 없이도 데모가 되도록. */}
      <div className="flex rounded-lg bg-slate-100 p-1">
        {(
          [
            ['fixture', '저장된 예시', '네트워크 없이 즉시'],
            ['live', '실시간 검증', 'Anthropic API 호출'],
          ] as const
        ).map(([value, label, hint]) => (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            <span className="ml-1.5 hidden text-[11px] font-normal text-slate-400 sm:inline">{hint}</span>
          </button>
        ))}
      </div>

      {mode === 'fixture' && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
            오류를 일부러 섞은 예시 — 하나 고르세요
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {fixtures.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onPickFixture(f)}
                className={`rounded-lg border p-3 text-left transition ${
                  activeFixtureId === f.id
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-800">{f.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{f.plantedError}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="qa" className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-400 uppercase">
          AI 챗봇의 질문-답변 붙여넣기
        </label>
        <textarea
          id="qa"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder={'질문: 노벨 물리학상을 두 번 받은 사람이 있어?\n답변: 네, 마리 퀴리는 노벨 물리학상을 두 번 수상했습니다...'}
          className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 font-mono text-[13px] leading-relaxed text-slate-800 placeholder:text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          "질문:" / "답변:" 라벨을 붙이면 더 정확합니다. 없으면 전체를 답변으로 봅니다.
        </p>
      </div>

      {mode === 'live' && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3">
          <input
            type="checkbox"
            checked={useWebSearch}
            onChange={(e) => onWebSearchChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">
            웹 검색으로 출처 대조
            <span className="mt-0.5 block text-xs text-slate-500">
              끄면 검증 모델의 학습 지식만으로 판정합니다. 최신 정보에 대한 정확도가 크게 떨어집니다.
            </span>
          </span>
        </label>
      )}

      {liveBlocked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <strong className="font-semibold">API 키가 없습니다.</strong> 프로젝트 루트에{' '}
          <code className="rounded bg-amber-100 px-1">.env</code> 파일을 만들고{' '}
          <code className="rounded bg-amber-100 px-1">VITE_ANTHROPIC_API_KEY</code>를 넣은 뒤 개발 서버를 다시 켜세요.
          (<code className="rounded bg-amber-100 px-1">.env.example</code> 참고) 지금은 "저장된 예시" 모드로 데모할 수
          있습니다.
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || liveBlocked || !text.trim()}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? '검증 중…' : mode === 'fixture' ? '저장된 판정 결과 보기' : '실시간으로 검증하기'}
      </button>
    </div>
  );
}
