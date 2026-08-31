import { describe, it, expect } from 'vitest';
import { parseQA, validateInput } from './parseQA';

describe('parseQA', () => {
  it('Q:/A: 형식을 분리한다', () => {
    const r = parseQA('Q: 세종대왕은 언제 태어났나요?\nA: 1397년에 태어났습니다.');
    expect(r.question).toBe('세종대왕은 언제 태어났나요?');
    expect(r.answer).toBe('1397년에 태어났습니다.');
    expect(r.usedFallback).toBe(false);
  });

  it('한국어 라벨(질문:/답변:)을 분리한다', () => {
    const r = parseQA('질문: 파이썬은 누가 만들었나요?\n답변: 귀도 반 로섬이 만들었습니다.');
    expect(r.question).toBe('파이썬은 누가 만들었나요?');
    expect(r.answer).toBe('귀도 반 로섬이 만들었습니다.');
  });

  it('사용자:/AI: 형식도 분리한다', () => {
    const r = parseQA('사용자: 안녕\nAI: 반갑습니다. 무엇을 도와드릴까요?');
    expect(r.question).toBe('안녕');
    expect(r.answer).toBe('반갑습니다. 무엇을 도와드릴까요?');
  });

  it('여러 줄짜리 답변을 통째로 가져온다', () => {
    const r = parseQA('질문: 설명해줘\n답변: 첫째 줄.\n둘째 줄.\n셋째 줄.');
    expect(r.answer).toBe('첫째 줄.\n둘째 줄.\n셋째 줄.');
  });

  it('답변 라벨만 있으면 앞부분을 질문으로 본다', () => {
    const r = parseQA('대한민국의 수도는?\n답변: 서울입니다.');
    expect(r.question).toBe('대한민국의 수도는?');
    expect(r.answer).toBe('서울입니다.');
    expect(r.usedFallback).toBe(false);
  });

  it('라벨이 없으면 전체를 답변으로 두고 fallback 표시를 켠다', () => {
    const r = parseQA('지구는 태양 주위를 돕니다. 공전 주기는 약 365일입니다.');
    expect(r.question).toBe('');
    expect(r.answer).toContain('지구는 태양');
    expect(r.usedFallback).toBe(true);
  });

  it('본문 중간의 콜론에는 걸리지 않는다', () => {
    // "주의:"는 줄 맨 앞이지만 우리가 아는 라벨이 아니므로 분리 기준이 되면 안 된다.
    const r = parseQA('주의: 이것은 예시입니다. 참고하세요.');
    expect(r.usedFallback).toBe(true);
    expect(r.answer).toContain('주의:');
  });

  it('빈 입력을 안전하게 처리한다', () => {
    const r = parseQA('   ');
    expect(r.answer).toBe('');
    expect(r.usedFallback).toBe(true);
  });
});

describe('validateInput', () => {
  it('답변이 비면 거부한다', () => {
    expect(validateInput({ question: 'q', answer: '', usedFallback: false }).ok).toBe(false);
  });

  it('20자 미만이면 거부한다', () => {
    expect(validateInput({ question: '', answer: '짧음', usedFallback: true }).ok).toBe(false);
  });

  it('8000자를 넘으면 거부한다', () => {
    const long = 'ㄱ'.repeat(8001);
    expect(validateInput({ question: '', answer: long, usedFallback: true }).ok).toBe(false);
  });

  it('정상 길이는 통과한다', () => {
    const ok = validateInput({ question: 'q', answer: '이 문장은 스무 글자를 확실히 넘습니다.', usedFallback: false });
    expect(ok.ok).toBe(true);
  });
});
