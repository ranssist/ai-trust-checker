import { describe, it, expect } from 'vitest';
import { findFixtureByAnswer, fixtureToInputText } from './fixtureMatch';
import { parseQA } from './parseQA';
import { FIXTURES } from '../fixtures';

describe('findFixtureByAnswer', () => {
  it('예시 답변 그대로면 찾아낸다', () => {
    const f = FIXTURES[0];
    expect(findFixtureByAnswer(f.answer, FIXTURES)?.id).toBe(f.id);
  });

  it('공백과 줄바꿈 차이는 무시한다', () => {
    const f = FIXTURES[1];
    // 이미 공백인 자리만 늘린다. 없던 자리에 공백을 넣으면 그건 내용이 바뀐 것이다
    // (예: "3.11"에 줄바꿈을 끼우면 "3. 11"이 되어 다른 텍스트가 된다).
    const messy = `\n\n${f.answer.replace(/ /g, '   \n ')}\n  `;
    expect(findFixtureByAnswer(messy, FIXTURES)?.id).toBe(f.id);
  });

  it('내용이 한 글자라도 다르면 못 찾는다', () => {
    // 사용자가 예시를 고쳤는데 캐시된 판정을 그대로 보여주면 거짓말이 된다.
    const f = FIXTURES[0];
    expect(findFixtureByAnswer(f.answer + ' 그리고 하나 더.', FIXTURES)).toBeUndefined();
  });

  it('빈 문자열은 못 찾는다', () => {
    expect(findFixtureByAnswer('   ', FIXTURES)).toBeUndefined();
  });
});

describe('fixtureToInputText + parseQA 왕복', () => {
  it.each(FIXTURES.map((f) => [f.id, f] as const))('[%s] 입력창에 넣었다 빼도 원본과 같다', (_id, f) => {
    // UI가 예시를 텍스트로 펼쳤다가 다시 파싱하는 경로를 실제로 검증한다.
    const parsed = parseQA(fixtureToInputText(f));
    expect(parsed.question).toBe(f.question);
    expect(parsed.answer).toBe(f.answer);
    expect(parsed.usedFallback).toBe(false);
  });
});
