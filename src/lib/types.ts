// 이 파일은 앱 전체가 공유하는 "데이터 모양"을 정의한다.
// fixture 모드든 실시간 API 모드든 결국 여기 정의된 Report 하나로 수렴하게 만들어서,
// UI가 두 모드를 구분할 필요가 없게 하는 것이 목적이다.

/** 주장 하나에 대한 판정 결과. 요구사항의 근거있음 / 근거불충분 / 상충함. */
export type Verdict = 'supported' | 'insufficient' | 'contradicted';

/**
 * AI가 왜 이렇게 틀렸는지에 대한 원인 후보.
 * 자유 서술이 아니라 '닫힌 집합'으로 둔 이유: 모델이 매번 다른 표현을 쓰면
 * UI에서 아이콘/색을 매핑할 수 없고, 통계도 낼 수 없기 때문이다.
 */
export type CauseCode =
  | 'knowledge_cutoff'        // 학습 데이터 시점 이후에 사실이 바뀜
  | 'entity_confusion'        // 비슷한 다른 인물/사건/제품과 헷갈림
  | 'question_ambiguity'      // 질문이 모호해서 다른 뜻으로 읽음
  | 'overgeneralization'      // 일부 사례를 전체인 것처럼 확대
  | 'fabricated_specifics'    // 숫자·날짜·고유명사를 그럴듯하게 지어냄
  | 'source_conflict'         // 출처들끼리 내용이 서로 다름
  | 'unverifiable_by_nature'; // 주관/예측이라 원리상 참·거짓을 못 가림

/** 판정 근거로 제시된 출처 한 건. */
export interface Evidence {
  title: string;
  url?: string;
  snippet: string;
  /**
   * 이 URL이 실제 web_search 결과에 있었는지 코드로 대조한 결과.
   * true = 대조해서 실제로 검색된 URL임을 확인함.
   * false = 모델이 URL을 제시했지만 실제 검색 결과에 없어 링크를 제거함(지어냈을 가능성).
   * undefined = 대조를 수행하지 않음(fixture 모드 등).
   */
  urlVerified?: boolean;
}

/** 오류 원인 후보 한 건. likelihood는 "이 원인일 가능성" 0~100. */
export interface Cause {
  code: CauseCode;
  explanation: string;
  likelihood: number;
}

/** 답변에서 뽑아낸 검증 가능한 사실 주장 하나 + 그 판정. */
export interface Claim {
  id: string;
  text: string;
  verdict: Verdict;
  /** 0~100. 이 주장 자체를 얼마나 믿을 수 있는지. verdict와 밴드가 맞도록 보정된 값. */
  score: number;
  /** 왜 이 판정이 나왔는지에 대한 설명. 설명가능성의 핵심이라 필수 필드로 둔다. */
  reasoning: string;
  evidence: Evidence[];
  /** verdict가 supported면 빈 배열. */
  causes: Cause[];
}

export interface ReportMeta {
  mode: 'fixture' | 'live';
  model?: string;
  webSearch: boolean;
  generatedAt: string;
  durationMs?: number;
}

/** 검증 1회의 최종 결과물. UI는 이것만 그린다. */
export interface Report {
  question: string;
  answer: string;
  claims: Claim[];
  /** 0~100 총점. */
  overallScore: number;
  summary: string;
  meta: ReportMeta;
}

/** fixture 파일 한 건 = 예시 질문·답변 + 기대 판정 결과. */
export interface Fixture {
  id: string;
  label: string;
  /** 이 예시에 어떤 오류를 일부러 심었는지 (발표 때 설명용). */
  plantedError: string;
  question: string;
  answer: string;
  report: Report;
}
