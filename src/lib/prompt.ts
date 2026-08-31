import { CAUSE_LABEL } from './scoring';
import type { CauseCode } from './types';

/**
 * 모델에게 줄 지시문과 출력 스키마.
 * UI/정규화 로직과 떨어뜨려 놓아야 프롬프트만 고쳐 실험하기 쉽다.
 */

const causeList = (Object.entries(CAUSE_LABEL) as [CauseCode, string][])
  .map(([code, label]) => `  - "${code}": ${label}`)
  .join('\n');

export const SYSTEM_PROMPT = `당신은 생성형 AI의 답변을 사실 확인하는 검증 분석가입니다.
사용자가 붙여넣은 "질문-답변 쌍"에서 검증 가능한 사실적 주장을 뽑아내고, 각각을 판정합니다.

## 주장 추출 규칙
- 참/거짓을 가릴 수 있는 문장만 주장으로 뽑습니다.
- 인사말, 의견("~하는 것이 좋습니다"), 지시문, 조건부 추측은 주장이 아닙니다.
- 한 문장에 사실이 여러 개 섞여 있으면 나눕니다.
  예: "A사는 1998년에 설립되었고 본사는 서울에 있다" → 설립연도 / 본사위치 두 개.
- 주장은 원문 표현을 최대한 그대로 옮깁니다. 요약하거나 고쳐 쓰지 않습니다.
- 최대 12개까지만 뽑습니다. 넘치면 답변의 핵심에 가까운 것부터 고릅니다.

## 판정 규칙
- "supported": 신뢰할 만한 출처로 확인됨. 점수 70~100.
- "insufficient": 확인할 근거를 찾지 못했거나, 출처가 불충분/모호함. 점수 30~69.
- "contradicted": 신뢰할 만한 출처와 명백히 어긋남. 점수 0~29.
- 확인이 안 되는 것과 틀린 것은 다릅니다. 근거를 못 찾았다고 "contradicted"로 처리하지 마세요.
- 주관적 판단, 미래 예측, 개인 취향은 "insufficient" + 원인 "unverifiable_by_nature"로 둡니다.

## 오류 원인 분류 (supported가 아닌 주장에만 부여)
왜 AI가 이렇게 답했을 가능성이 있는지 아래 코드 중에서 1~2개 고르고, 이 사례에 맞게 구체적으로 설명하세요.
${causeList}

## 작성 지침
- reasoning과 explanation은 한국어로, 각각 2~3문장.
- reasoning에는 "무엇을 무엇과 대조했는지"를 반드시 적습니다. "틀렸습니다"만 쓰면 안 됩니다.
- 확신이 없으면 확신 없다고 쓰세요. 지어내지 마세요.
- 검색 도구를 쓸 수 있으면 반드시 사용해 실제 출처를 확인하고, evidence에 그 출처를 넣으세요.
- 최종 결과는 반드시 submit_verification 도구를 호출해서 제출합니다. 본문 텍스트로 답하지 마세요.`;

/**
 * 결과 제출용 도구 스키마.
 * strict: true를 쓰지 않는 이유 — 스키마가 조금만 어긋나도 API가 400을 내는데,
 * 어차피 normalize.ts에서 한 번 더 검증하므로 여기서는 유연하게 두고
 * 런타임 방어는 정규화 함수에 맡긴다.
 */
export const SUBMIT_TOOL = {
  name: 'submit_verification',
  description: '사실 확인 결과를 제출합니다. 검증이 끝나면 반드시 이 도구를 호출하세요.',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description: '답변 전체에 대한 2~3문장 총평. 어떤 부분이 문제인지 먼저 언급.',
      },
      claims: {
        type: 'array',
        description: '추출한 주장별 판정 결과. 원문에 나온 순서대로.',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', description: '답변에서 뽑은 주장 문장 (원문 그대로)' },
            verdict: {
              type: 'string',
              enum: ['supported', 'insufficient', 'contradicted'],
            },
            score: {
              type: 'integer',
              description: '0~100. supported는 70~100, insufficient는 30~69, contradicted는 0~29.',
            },
            reasoning: { type: 'string', description: '무엇과 대조해서 왜 이 판정이 나왔는지 (한국어 2~3문장)' },
            evidence: {
              type: 'array',
              description: '판정 근거가 된 출처. 검색을 못 했으면 빈 배열.',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  url: { type: 'string' },
                  snippet: { type: 'string', description: '해당 출처에서 근거가 되는 부분' },
                },
                required: ['title', 'snippet'],
              },
            },
            causes: {
              type: 'array',
              description: 'supported가 아닐 때만 채움. 1~2개.',
              items: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    enum: Object.keys(CAUSE_LABEL),
                  },
                  explanation: { type: 'string', description: '이 사례에서 왜 그렇게 봤는지 (한국어)' },
                  likelihood: { type: 'integer', description: '이 원인일 가능성 0~100' },
                },
                required: ['code', 'explanation', 'likelihood'],
              },
            },
          },
          required: ['text', 'verdict', 'score', 'reasoning', 'evidence', 'causes'],
        },
      },
    },
    required: ['summary', 'claims'],
  },
};

export function buildUserMessage(question: string, answer: string): string {
  return [
    '아래는 어떤 AI 챗봇의 질문-답변 쌍입니다. 답변을 사실 확인해 주세요.',
    '',
    '=== 질문 ===',
    question || '(질문이 제공되지 않음 — 답변만으로 판단하세요)',
    '',
    '=== AI의 답변 ===',
    answer,
  ].join('\n');
}
