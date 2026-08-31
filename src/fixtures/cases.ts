/**
 * 데모용 예시 데이터.
 *
 * API 키가 없거나 인터넷이 끊긴 발표장에서도 앱 전체 흐름을 보여줄 수 있도록,
 * "일부러 오류를 섞은 질문-답변 쌍"과 그에 대한 기대 판정을 미리 적어둔 것이다.
 *
 * 여기 적는 값은 normalizeReport()를 그대로 통과시킨다(index.ts 참고).
 * 그래야 fixture 모드와 실시간 모드가 완전히 같은 코드 경로를 타고,
 * "데모에서만 예쁘게 나오는" 상황을 막을 수 있다.
 */

export interface RawCase {
  id: string;
  label: string;
  /** 발표할 때 "여기에 이런 오류를 심었습니다"라고 말할 내용. */
  plantedError: string;
  question: string;
  answer: string;
  summary: string;
  claims: unknown[];
}

export const RAW_CASES: RawCase[] = [
  {
    id: 'hunminjeongeum',
    label: '훈민정음 — 소장처와 글자 수',
    plantedError: '소장 기관을 다른 곳으로 바꾸고, 창제 당시 글자 수를 현대 글자 수로 바꿔 심었습니다.',
    question: '훈민정음에 대해 설명해줘.',
    answer:
      '훈민정음은 1443년에 창제되어 1446년에 반포되었습니다. 훈민정음 해례본은 현재 국립중앙박물관에 소장되어 있습니다. ' +
      '창제 당시 글자 수는 총 24자였습니다. 훈민정음은 세종대왕이 직접 창제했다는 것이 학계의 확립된 정설입니다.',
    summary:
      '연대 정보는 정확하지만, 해례본 소장처와 창제 당시 글자 수 두 가지가 사실과 어긋납니다. 창제 주체에 대한 서술도 학계 논쟁을 확정된 사실처럼 단정하고 있습니다.',
    claims: [
      {
        text: '훈민정음은 1443년에 창제되어 1446년에 반포되었습니다.',
        verdict: 'supported',
        score: 96,
        reasoning:
          '세종실록 25년(1443년) 12월의 창제 기록, 세종실록 28년(1446년) 9월의 반포 기록과 대조했습니다. 국사편찬위원회 자료에서도 동일한 연대를 제시합니다.',
        evidence: [
          {
            title: '조선왕조실록 세종실록',
            url: 'https://sillok.history.go.kr/',
            snippet: '세종 25년 12월 창제 기록 및 세종 28년 9월 반포 기록',
          },
        ],
        causes: [],
      },
      {
        text: '훈민정음 해례본은 현재 국립중앙박물관에 소장되어 있습니다.',
        verdict: 'contradicted',
        score: 8,
        reasoning:
          '국가유산청 국보 정보와 대조한 결과, 훈민정음 해례본(간송본)은 서울 성북구 간송미술관 소장입니다. 국립중앙박물관 소장품이 아닙니다.',
        evidence: [
          {
            title: '국가유산청 — 국보 훈민정음',
            url: 'https://www.heritage.go.kr/',
            snippet: '소재지: 서울특별시 성북구 (간송미술관)',
          },
        ],
        causes: [
          {
            code: 'entity_confusion',
            explanation:
              '"국립중앙박물관"은 한국 문화재 관련 문서에 가장 자주 등장하는 기관명입니다. 특정 국보의 소장처를 정확히 기억하지 못할 때, 통계적으로 가장 흔한 기관명으로 빈칸을 메운 것으로 보입니다.',
            likelihood: 80,
          },
          {
            code: 'fabricated_specifics',
            explanation:
              '소장처처럼 확인 가능한 고유명사를 검증 없이 그럴듯하게 채워 넣은 전형적인 패턴입니다.',
            likelihood: 55,
          },
        ],
      },
      {
        text: '창제 당시 글자 수는 총 24자였습니다.',
        verdict: 'contradicted',
        score: 10,
        reasoning:
          '훈민정음 해례본 원문 및 국립국어원 자료와 대조했습니다. 창제 당시는 자음 17자 + 모음 11자 = 총 28자입니다. 24자는 현재 한글 맞춤법에서 쓰는 글자 수로, 시점이 다릅니다.',
        evidence: [
          {
            title: '국립국어원 — 한글의 창제',
            url: 'https://www.korean.go.kr/',
            snippet: '창제 당시 28자(초성 17자, 중성 11자), 현재 사용 24자',
          },
        ],
        causes: [
          {
            code: 'entity_confusion',
            explanation:
              '"한글 글자 수"라는 표현으로 검색되는 문서에는 현대 기준 24자가 압도적으로 많습니다. 질문이 요구한 "창제 당시"라는 시점 조건을 놓치고 더 흔한 숫자를 가져온 것으로 보입니다.',
            likelihood: 85,
          },
        ],
      },
      {
        text: '훈민정음은 세종대왕이 직접 창제했다는 것이 학계의 확립된 정설입니다.',
        verdict: 'insufficient',
        score: 42,
        reasoning:
          '세종 친제설과 집현전 학자 협찬설이 모두 학계에 존재하며, 어느 한쪽이 "확립된 정설"이라고 볼 근거를 찾지 못했습니다. 창제 사실 자체가 아니라 "학계의 정설"이라는 서술이 문제입니다.',
        evidence: [],
        causes: [
          {
            code: 'overgeneralization',
            explanation:
              '학계에 이견이 있는 사안을 "확립된 정설"이라는 단정적 표현으로 압축했습니다. 사용자가 확신 있는 답을 원한다고 판단해 불확실성을 지운 결과로 보입니다.',
            likelihood: 75,
          },
        ],
      },
    ],
  },

  {
    id: 'python-version',
    label: '파이썬 최신 버전 — 학습 시점 문제',
    plantedError: '학습 시점 이후에 바뀐 최신 버전 정보와, 아직 일어나지 않은 변경(GIL 제거)을 심었습니다.',
    question: '파이썬 최신 버전이 뭐야? 뭐가 바뀌었어?',
    answer:
      '파이썬의 최신 안정 버전은 3.11이며, 2022년 10월에 출시되었습니다. 파이썬은 귀도 반 로섬이 만들었습니다. ' +
      '가장 큰 변화는 GIL이 3.12에서 완전히 제거되어 진정한 멀티스레딩이 가능해졌다는 점입니다.',
    summary:
      '"최신 버전"이라는 시점 의존 정보가 낡았고, GIL 제거는 아직 일어나지 않은 일을 완료된 것처럼 서술했습니다. 창시자 정보만 정확합니다.',
    claims: [
      {
        text: '파이썬의 최신 안정 버전은 3.11입니다.',
        verdict: 'contradicted',
        score: 12,
        reasoning:
          'python.org 다운로드 페이지와 대조했습니다. 3.11은 2022년 버전이며 그 이후로 여러 차례 새 마이너 릴리스가 나왔습니다. "최신"이라는 서술이 현재 시점에서 성립하지 않습니다.',
        evidence: [
          {
            title: 'python.org Downloads',
            url: 'https://www.python.org/downloads/',
            snippet: '연 1회 주기로 새 마이너 버전이 릴리스됩니다.',
          },
        ],
        causes: [
          {
            code: 'knowledge_cutoff',
            explanation:
              '"최신 버전"은 학습 시점에 고정되는 대표적인 정보입니다. 모델은 학습 데이터에서 가장 자주 "최신"으로 언급된 버전을 그대로 답했고, 그 시점 이후의 릴리스는 알 수 없습니다.',
            likelihood: 95,
          },
        ],
      },
      {
        text: '파이썬 3.11은 2022년 10월에 출시되었습니다.',
        verdict: 'supported',
        score: 94,
        reasoning:
          'python.org 릴리스 노트와 대조했습니다. 3.11.0은 2022년 10월 24일 릴리스가 맞습니다. 앞 문장과 달리 이 서술은 시점에 의존하지 않는 고정된 사실입니다.',
        evidence: [
          {
            title: 'Python 3.11.0 release notes',
            url: 'https://www.python.org/downloads/release/python-3110/',
            snippet: 'Release Date: Oct. 24, 2022',
          },
        ],
        causes: [],
      },
      {
        text: '파이썬은 귀도 반 로섬이 만들었습니다.',
        verdict: 'supported',
        score: 98,
        reasoning:
          'python.org 공식 소개 문서 및 파이썬 역사 문서와 대조했습니다. 1991년 귀도 반 로섬이 최초 공개했습니다.',
        evidence: [
          {
            title: 'Python.org — About',
            url: 'https://www.python.org/about/',
            snippet: 'Created by Guido van Rossum, first released in 1991',
          },
        ],
        causes: [],
      },
      {
        text: 'GIL이 3.12에서 완전히 제거되어 진정한 멀티스레딩이 가능해졌습니다.',
        verdict: 'contradicted',
        score: 6,
        reasoning:
          'PEP 703 및 파이썬 릴리스 노트와 대조했습니다. GIL을 뺀 free-threaded 빌드는 3.13에서 실험적 옵션으로 처음 들어갔고, 기본 빌드에서 GIL이 제거된 적은 없습니다. 버전과 완료 여부가 모두 어긋납니다.',
        evidence: [
          {
            title: 'PEP 703 — Making the Global Interpreter Lock Optional',
            url: 'https://peps.python.org/pep-0703/',
            snippet: 'optional, experimental free-threaded build',
          },
        ],
        causes: [
          {
            code: 'fabricated_specifics',
            explanation:
              'GIL 제거는 오랫동안 논의되어 온 주제라 관련 문서가 많습니다. "논의 중"인 상태를 "완료됨"으로 바꾸고, 버전 번호를 그럴듯한 값으로 채워 넣은 것으로 보입니다.',
            likelihood: 80,
          },
          {
            code: 'knowledge_cutoff',
            explanation:
              '진행 중이던 변경 사항의 최종 결과를 확인할 수 없어, 예상되는 결말을 사실처럼 서술했을 가능성이 있습니다.',
            likelihood: 60,
          },
        ],
      },
    ],
  },

  {
    id: 'nobel-twice',
    label: '노벨상 2회 수상 — 인물 혼동',
    plantedError: '수상 분야가 다른 사례(퀴리)를 같은 분야로 바꾸고, 수상하지 않은 인물(아인슈타인)을 추가했습니다.',
    question: '노벨 물리학상을 두 번 받은 사람이 있어?',
    answer:
      '네, 있습니다. 마리 퀴리는 노벨 물리학상을 두 번 수상했습니다. 존 바딘도 1956년과 1972년에 노벨 물리학상을 두 번 받았습니다. ' +
      '아인슈타인 역시 상대성 이론과 광전 효과로 두 차례 수상했습니다.',
    summary:
      '세 사례 중 하나만 맞습니다. 퀴리는 두 번 받았지만 분야가 다르고, 아인슈타인은 한 번만 수상했습니다.',
    claims: [
      {
        text: '마리 퀴리는 노벨 물리학상을 두 번 수상했습니다.',
        verdict: 'contradicted',
        score: 15,
        reasoning:
          '노벨재단 공식 수상자 목록과 대조했습니다. 퀴리는 1903년 물리학상, 1911년 화학상으로 서로 다른 분야에서 두 번 수상했습니다. "물리학상 두 번"은 사실과 다릅니다.',
        evidence: [
          {
            title: 'NobelPrize.org — Marie Curie',
            url: 'https://www.nobelprize.org/prizes/physics/1903/marie-curie/',
            snippet: 'Physics 1903, Chemistry 1911',
          },
        ],
        causes: [
          {
            code: 'entity_confusion',
            explanation:
              '"퀴리 = 노벨상 2회"와 "질문 = 물리학상 2회"라는 두 패턴이 겹치면서, 분야가 다르다는 결정적 차이가 뭉개졌습니다. 질문의 조건에 맞춰 사실을 끌어다 맞춘 형태입니다.',
            likelihood: 90,
          },
        ],
      },
      {
        text: '존 바딘은 1956년과 1972년에 노벨 물리학상을 두 번 받았습니다.',
        verdict: 'supported',
        score: 97,
        reasoning:
          '노벨재단 수상자 목록과 대조했습니다. 존 바딘은 1956년 트랜지스터 연구, 1972년 초전도 이론(BCS)으로 물리학상을 두 번 수상했습니다.',
        evidence: [
          {
            title: 'NobelPrize.org — John Bardeen',
            url: 'https://www.nobelprize.org/prizes/physics/1972/bardeen/',
            snippet: 'Physics 1956 and Physics 1972',
          },
        ],
        causes: [],
      },
      {
        text: '아인슈타인은 상대성 이론과 광전 효과로 두 차례 노벨상을 수상했습니다.',
        verdict: 'contradicted',
        score: 5,
        reasoning:
          '노벨재단 기록과 대조했습니다. 아인슈타인의 수상은 1921년 광전 효과 법칙 발견에 대한 물리학상 한 번뿐입니다. 상대성 이론으로는 노벨상을 받은 적이 없습니다.',
        evidence: [
          {
            title: 'NobelPrize.org — Albert Einstein',
            url: 'https://www.nobelprize.org/prizes/physics/1921/einstein/',
            snippet: 'for his discovery of the law of the photoelectric effect',
          },
        ],
        causes: [
          {
            code: 'overgeneralization',
            explanation:
              '"아인슈타인 = 가장 위대한 물리학자"라는 강한 연관이, 질문이 요구한 "2회 수상자" 목록에 그를 끼워 넣게 만든 것으로 보입니다. 유명도가 높을수록 이런 끌어들임이 자주 일어납니다.',
            likelihood: 80,
          },
          {
            code: 'fabricated_specifics',
            explanation: '"상대성 이론으로 수상"이라는 널리 퍼진 오해를 그대로 재생산했습니다.',
            likelihood: 65,
          },
        ],
      },
    ],
  },

  {
    id: 'highest-mountain',
    label: '가장 높은 산 — 질문 모호성',
    plantedError: '"우리나라"의 범위가 모호한 질문에, 한쪽 해석만 골라 단정하게 답하도록 했습니다.',
    question: '우리나라에서 가장 높은 산이 뭐야?',
    answer:
      '대한민국에서 가장 높은 산은 백두산으로, 높이는 2,744m입니다. 한라산은 남한에서 가장 높은 산으로 높이는 1,947m입니다.',
    summary:
      '질문의 "우리나라"가 남한인지 한반도 전체인지 모호한데, 답변은 이를 밝히지 않고 "대한민국"이라는 행정적 범위에 백두산을 넣어 서술했습니다.',
    claims: [
      {
        text: '대한민국에서 가장 높은 산은 백두산입니다.',
        verdict: 'contradicted',
        score: 18,
        reasoning:
          '행정구역 기준과 대조했습니다. 백두산은 북한과 중국 국경에 있어 대한민국 영토 내 산이 아닙니다. 대한민국(남한) 최고봉은 한라산입니다. "한반도에서 가장 높은 산"이라고 했다면 맞는 서술입니다.',
        evidence: [
          {
            title: '국토지리정보원 — 국토 정보',
            url: 'https://www.ngii.go.kr/',
            snippet: '남한 최고봉 한라산 1,947m',
          },
        ],
        causes: [
          {
            code: 'question_ambiguity',
            explanation:
              '"우리나라"는 문맥에 따라 남한을 뜻하기도 하고 한반도 전체를 뜻하기도 합니다. 모델은 되묻지 않고 한쪽(한반도)으로 해석한 뒤, 그 답을 "대한민국"이라는 다른 범위의 단어에 붙여버렸습니다.',
            likelihood: 85,
          },
          {
            code: 'entity_confusion',
            explanation: '"한반도 최고봉 = 백두산"이라는 강한 연관이, 범위가 다른 "대한민국"에도 그대로 적용됐습니다.',
            likelihood: 60,
          },
        ],
      },
      {
        text: '백두산의 높이는 2,744m입니다.',
        verdict: 'supported',
        score: 91,
        reasoning: '국토지리정보원 및 백과사전 자료와 대조했습니다. 백두산 최고봉(장군봉)의 높이로 2,744m가 통용됩니다.',
        evidence: [
          {
            title: '한국민족문화대백과사전 — 백두산',
            url: 'https://encykorea.aks.ac.kr/',
            snippet: '최고봉 장군봉 2,744m',
          },
        ],
        causes: [],
      },
      {
        text: '한라산은 남한에서 가장 높은 산이며 높이는 1,947m입니다.',
        verdict: 'supported',
        score: 93,
        reasoning: '국토지리정보원 표고 자료와 대조했습니다. 한라산 백록담 정상 표고는 1,947m로 남한 최고봉이 맞습니다.',
        evidence: [
          { title: '국토지리정보원', url: 'https://www.ngii.go.kr/', snippet: '한라산 1,947m' },
        ],
        causes: [],
      },
    ],
  },

  {
    id: 'vitamin-c',
    label: '비타민C와 감기 — 과잉 일반화',
    plantedError: '연구 결과를 과장하고, 부작용이 없다고 단정하고, 검증 불가능한 주관적 서술을 섞었습니다.',
    question: '비타민C를 많이 먹으면 감기가 예방되나요?',
    answer:
      '네, 비타민C를 하루 2000mg 이상 복용하면 감기를 예방할 수 있다는 것이 정설입니다. 라이너스 폴링이 1970년대에 비타민C 대량 복용을 주장했습니다. ' +
      '비타민C는 수용성이라 아무리 많이 먹어도 몸에 전혀 해롭지 않습니다. 감기에 걸렸을 때 비타민C를 먹으면 확실히 기분이 나아집니다.',
    summary:
      '건강 정보 특유의 위험한 패턴이 모두 들어 있습니다. 연구 결론을 뒤집어 단정하고, 안전성을 무조건적으로 보장하며, 주관적 느낌을 사실처럼 서술합니다.',
    claims: [
      {
        text: '비타민C를 하루 2000mg 이상 복용하면 감기를 예방할 수 있다는 것이 정설입니다.',
        verdict: 'contradicted',
        score: 14,
        reasoning:
          '코크란 체계적 문헌고찰(Vitamin C for preventing and treating the common cold)과 대조했습니다. 일반인 대상 정기 복용은 감기 발생률을 유의미하게 낮추지 못했고, 증상 지속 기간이 소폭 줄어드는 정도입니다. "예방 가능하다는 정설"은 결론을 뒤집은 서술입니다.',
        evidence: [
          {
            title: 'Cochrane Review — Vitamin C for preventing and treating the common cold',
            url: 'https://www.cochrane.org/',
            snippet: 'Regular supplementation had no effect on common cold incidence in the general population.',
          },
        ],
        causes: [
          {
            code: 'overgeneralization',
            explanation:
              '"증상 기간이 약간 줄어든다"는 제한적 결과가 "예방된다"로 확대됐습니다. 학습 데이터에는 논문보다 이런 주장을 담은 블로그·광고성 글이 훨씬 많아, 다수 의견 쪽으로 끌린 것으로 보입니다.',
            likelihood: 90,
          },
          {
            code: 'source_conflict',
            explanation: '학술 문헌과 대중 건강 콘텐츠가 정반대 결론을 말하는 주제라, 어느 쪽을 따르느냐에 따라 답이 갈립니다.',
            likelihood: 65,
          },
        ],
      },
      {
        text: '라이너스 폴링이 1970년대에 비타민C 대량 복용을 주장했습니다.',
        verdict: 'supported',
        score: 92,
        reasoning:
          '폴링의 저서 Vitamin C and the Common Cold(1970) 및 관련 과학사 자료와 대조했습니다. 그런 주장이 있었다는 사실 자체는 확인됩니다. (주장의 타당성과는 별개입니다.)',
        evidence: [
          {
            title: 'Linus Pauling Institute',
            url: 'https://lpi.oregonstate.edu/',
            snippet: 'Pauling advocated high-dose vitamin C beginning in 1970',
          },
        ],
        causes: [],
      },
      {
        text: '비타민C는 수용성이라 아무리 많이 먹어도 몸에 전혀 해롭지 않습니다.',
        verdict: 'contradicted',
        score: 16,
        reasoning:
          '미국 국립보건원(NIH) 영양보충제 팩트시트와 대조했습니다. 성인 상한섭취량은 하루 2000mg이며, 초과 시 설사·복통 등 위장장애와 신장결석 위험 증가가 보고되어 있습니다. "전혀 해롭지 않다"는 성립하지 않습니다.',
        evidence: [
          {
            title: 'NIH Office of Dietary Supplements — Vitamin C',
            url: 'https://ods.od.nih.gov/factsheets/VitaminC-Consumer/',
            snippet: 'Upper limit 2,000 mg/day for adults; high doses may cause diarrhea, nausea, kidney stones',
          },
        ],
        causes: [
          {
            code: 'overgeneralization',
            explanation:
              '"수용성 비타민은 초과분이 배출된다"는 부분적으로 맞는 원리를, "따라서 아무리 먹어도 안전하다"는 결론으로 확대했습니다. 원리에서 결론으로 한 단계 건너뛴 전형적인 패턴입니다.',
            likelihood: 88,
          },
        ],
      },
      {
        text: '감기에 걸렸을 때 비타민C를 먹으면 확실히 기분이 나아집니다.',
        verdict: 'insufficient',
        score: 38,
        reasoning:
          '"기분이 나아진다"는 개인의 주관적 경험이라 참·거짓을 가릴 대상이 아닙니다. 다만 "확실히"라는 단정적 표현은 근거 없이 붙었습니다.',
        evidence: [],
        causes: [
          {
            code: 'unverifiable_by_nature',
            explanation:
              '주관적 느낌에 대한 서술이라 어떤 출처와 대조해도 검증할 수 없습니다. 이런 문장에는 "확실히" 같은 단정 표현을 쓰지 않는 것이 맞습니다.',
            likelihood: 95,
          },
        ],
      },
    ],
  },
];
