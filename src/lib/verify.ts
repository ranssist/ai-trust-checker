import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, SUBMIT_TOOL, buildUserMessage } from './prompt';
import { normalizeReport } from './normalize';
import type { Report } from './types';

/** 실시간 검증에 쓰는 모델. 최신 Opus 계열. */
export const MODEL_ID = 'claude-opus-5';
/** 정책상 거절이 났을 때 서버가 대신 돌려줄 모델. */
const FALLBACK_MODEL = 'claude-opus-4-8';

export interface VerifyOptions {
  apiKey: string;
  question: string;
  answer: string;
  /** 웹 검색 도구 사용 여부. 끄면 모델의 학습 지식만으로 판정한다(정확도 하락). */
  useWebSearch: boolean;
  /** 진행 상황을 UI에 흘려보내기 위한 콜백. */
  onProgress?: (message: string) => void;
}

export class VerifyError extends Error {}

/**
 * 이번 턴의 응답에 실제 web_search 결과가 있으면 그 URL들을 into에 모은다.
 *
 * 왜 필요한가: submit_verification 도구는 evidence.url을 모델이 "자유 텍스트로" 채운다.
 * 즉 실제로 web_search가 반환한 적 없는 URL을 모델이 그럴듯하게 지어내도 스키마상으로는 유효하다.
 * 여기서 모은 집합을 normalizeReport에 넘겨 대조하면, 실제 검색되지 않은 URL(=지어낸 출처로 의심)을
 * "판정 근거"로 그대로 보여주는 사고를 막을 수 있다.
 */
function collectSearchedUrls(content: Anthropic.Beta.BetaContentBlock[], into: Set<string>): void {
  for (const block of content) {
    if (block.type !== 'web_search_tool_result') continue;
    if (!Array.isArray(block.content)) continue; // 에러 블록(BetaWebSearchToolResultError)인 경우
    for (const item of block.content) {
      if (item.url) into.add(item.url);
    }
  }
}

/**
 * Anthropic API를 호출해 실제 검증을 수행한다.
 *
 * 흐름:
 *  1) 시스템 프롬프트 + 사용자 Q/A를 보낸다.
 *  2) 모델이 web_search(서버측 도구)를 쓰면 API가 알아서 돌리고, 길어지면 stop_reason='pause_turn'으로 끊는다.
 *     → 그 응답을 그대로 대화에 이어 붙여 재요청하면 이어서 진행된다.
 *  3) 모델이 submit_verification 도구를 호출하면 그 input이 우리가 원하는 결과다.
 */
export async function verifyWithApi(opts: VerifyOptions): Promise<Report> {
  const { apiKey, question, answer, useWebSearch, onProgress } = opts;
  if (!apiKey) throw new VerifyError('API 키가 없습니다. .env에 VITE_ANTHROPIC_API_KEY를 설정하세요.');

  const client = new Anthropic({
    apiKey,
    // 이 앱은 서버 없이 브라우저에서 직접 API를 부르는 해커톤 데모다.
    // 실제 서비스라면 키를 백엔드에 두어야 한다(README 한계점 참고).
    dangerouslyAllowBrowser: true,
  });

  const tools: Anthropic.Beta.BetaToolUnion[] = [SUBMIT_TOOL as Anthropic.Beta.BetaToolUnion];
  if (useWebSearch) {
    tools.unshift({ type: 'web_search_20260209', name: 'web_search', max_uses: 8 });
  }

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: 'user', content: buildUserMessage(question, answer) },
  ];

  const startedAt = Date.now();
  // pause_turn이 반복될 수 있으므로 상한을 둔다. 무한 루프 방지.
  const MAX_TURNS = 6;
  // 실제로 검색된 URL만 모은다. useWebSearch가 꺼져 있으면 계속 빈 채로 남고,
  // 그 결과 evidence의 모든 URL이 "미확인"으로 표시된다 — 검색 없이는 어떤 URL도
  // 실재를 확인할 수 없으므로 의도된 동작이다.
  const searchedUrls = new Set<string>();

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    onProgress?.(turn === 0 ? '주장을 추출하고 대조하는 중…' : `근거를 계속 확인하는 중… (${turn + 1}단계)`);

    const response = await client.beta.messages.stream({
      model: MODEL_ID,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      thinking: { type: 'adaptive' },
      tools,
      messages,
      // 정책상 거절이 나면 같은 요청을 대체 모델로 서버가 다시 돌려준다.
      betas: ['server-side-fallback-2026-06-01'],
      fallbacks: [{ model: FALLBACK_MODEL }],
    }).finalMessage();

    if (response.stop_reason === 'refusal') {
      throw new VerifyError('모델이 이 내용의 검증을 거절했습니다. 다른 답변으로 시도해 주세요.');
    }

    collectSearchedUrls(response.content, searchedUrls);

    // 모델이 결과를 제출했는지 먼저 본다.
    const submitted = response.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock =>
        b.type === 'tool_use' && b.name === SUBMIT_TOOL.name,
    );
    if (submitted) {
      return normalizeReport(submitted.input, {
        question,
        answer,
        meta: {
          mode: 'live',
          model: response.model ?? MODEL_ID,
          webSearch: useWebSearch,
          generatedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
        },
        verifiedUrls: searchedUrls,
      });
    }

    // 서버측 도구(web_search)를 돌리느라 턴이 잠시 멈춘 경우 → 이어서 요청.
    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }

    // 도구를 안 부르고 그냥 말로 끝냈다면, 한 번 더 도구 호출을 요구한다.
    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: 'submit_verification 도구를 호출해서 결과를 제출해 주세요.',
    });
  }

  throw new VerifyError('모델이 정해진 형식으로 결과를 제출하지 않았습니다. 다시 시도해 주세요.');
}

/** .env에서 키를 읽는다. 없으면 빈 문자열. */
export function readApiKey(): string {
  return (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined)?.trim() ?? '';
}
