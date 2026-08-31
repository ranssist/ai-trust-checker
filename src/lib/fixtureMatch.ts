import type { Fixture } from './types';

/**
 * 입력창의 텍스트가 저장된 예시와 같은지 판단한다.
 *
 * fixture 모드는 "미리 계산해둔 판정"을 보여주는 것이라, 사용자가 예시를 조금이라도
 * 고치면 그 결과는 더 이상 그 텍스트에 대한 판정이 아니다.
 * 이걸 감지해서 "실시간 모드로 바꾸세요"라고 안내하기 위한 함수.
 */

/** 공백/줄바꿈 차이는 무시한다. 복붙 과정에서 흔히 달라지기 때문. */
function canonical(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function findFixtureByAnswer(answer: string, fixtures: Fixture[]): Fixture | undefined {
  const target = canonical(answer);
  if (!target) return undefined;
  return fixtures.find((f) => canonical(f.answer) === target);
}

/** 입력창에 채워 넣을 형태(질문/답변 라벨 포함)로 예시를 문자열화한다. */
export function fixtureToInputText(fixture: Fixture): string {
  return `질문: ${fixture.question}\n답변: ${fixture.answer}`;
}
