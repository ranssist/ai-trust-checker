/**
 * 사용자가 챗봇 화면에서 복사해온 텍스트 덩어리를 질문/답변으로 쪼갠다.
 * 사람마다 붙여넣는 형식이 제각각이라(Q:/A:, 질문:/답변:, 사용자:/AI:)
 * 정규식으로 흔한 패턴을 먼저 시도하고, 안 맞으면 전체를 답변으로 본다.
 */

export interface ParsedQA {
  question: string;
  answer: string;
  /** 라벨을 못 찾아서 전체를 답변으로 처리했는지 여부. UI에서 안내 문구를 띄우는 데 쓴다. */
  usedFallback: boolean;
}

// 질문 쪽 라벨과 답변 쪽 라벨. 순서가 중요하다 — 긴 것부터 매칭해야 '질문'이 '질'로 잘리지 않는다.
const Q_LABELS = ['질문', '사용자', '유저', 'Question', 'User', 'Prompt', 'Q'];
const A_LABELS = ['답변', '어시스턴트', 'AI', 'Assistant', 'Answer', 'Response', 'Bot', 'A'];

function labelPattern(labels: string[]): RegExp {
  // 줄 맨 앞에 오는 "라벨:" 또는 "라벨)" 형태만 인정한다. 본문 중간의 콜론에 걸리면 안 되기 때문.
  const alt = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(String.raw`^[ \t]*(?:${alt})[ \t]*[:：)\].]`, 'im');
}

export function parseQA(raw: string): ParsedQA {
  const text = (raw ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return { question: '', answer: '', usedFallback: true };

  const qRe = labelPattern(Q_LABELS);
  const aRe = labelPattern(A_LABELS);

  const qMatch = qRe.exec(text);
  // 답변 라벨은 질문 라벨보다 뒤에 나와야 한다. 앞에서부터 찾으면 "A"가 질문 안 단어에 걸릴 수 있다.
  const searchFrom = qMatch ? qMatch.index + qMatch[0].length : 0;
  const aMatchLocal = aRe.exec(text.slice(searchFrom));

  if (qMatch && aMatchLocal) {
    const aStart = searchFrom + aMatchLocal.index;
    const question = text.slice(qMatch.index + qMatch[0].length, aStart).trim();
    const answer = text.slice(aStart + aMatchLocal[0].length).trim();
    if (question && answer) return { question, answer, usedFallback: false };
  }

  // 라벨이 답변 쪽에만 있는 경우: 그 앞부분 전체를 질문으로 본다.
  if (!qMatch && aMatchLocal) {
    const aStart = searchFrom + aMatchLocal.index;
    const question = text.slice(0, aStart).trim();
    const answer = text.slice(aStart + aMatchLocal[0].length).trim();
    if (answer) return { question, answer, usedFallback: false };
  }

  return { question: '', answer: text, usedFallback: true };
}

/** 입력이 검증할 만한 분량인지 확인. 너무 짧으면 API를 부르기 전에 막는다. */
export function validateInput(parsed: ParsedQA): { ok: boolean; message?: string } {
  if (!parsed.answer.trim()) return { ok: false, message: '검증할 답변 내용이 비어 있습니다.' };
  if (parsed.answer.trim().length < 20) {
    return { ok: false, message: '답변이 너무 짧습니다. 20자 이상 붙여넣어 주세요.' };
  }
  if (parsed.answer.length > 8000) {
    return { ok: false, message: '답변이 너무 깁니다(8000자 초과). 일부만 잘라서 검증해 주세요.' };
  }
  return { ok: true };
}
