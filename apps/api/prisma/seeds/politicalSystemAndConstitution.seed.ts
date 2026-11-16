import {
  Era,
  GovernmentForm,
  LegislatureType,
  PartySystem,
  StateStructure,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

interface LawTypeSeedEntry {
  name: string
  description: string
}

const LAW_TYPES: LawTypeSeedEntry[] = [
  {
    name: '헌법',
    description:
      '국가의 통치조직과 통치작용의 기본원리 및 국민의 기본권을 규정하는 최고 기본법 (Constitution)',
  },
  {
    name: '기본법·헌장',
    description:
      '헌법에 준하는 최고 규범력을 갖는 기본법·헌장·약법·흠정헌법 (Basic Law / Constitutional Charter)',
  },
  {
    name: '법률',
    description:
      '의회(입법부)가 제정한 성문 법률 및 수권법·선거법·조직법 등 (Statute / Act)',
  },
  {
    name: '율령·법전',
    description:
      '전근대 동서양 국가의 통치 기본 법전 및 율령 격식 (예: 경국대전, 무가제법도, 소보르노예 울로제니예 등)',
  },
  {
    name: '칙령·명령',
    description:
      '군주·원수·행정부가 발포한 칙령, 태정관 달, 대통령령, 포고령 및 시행령 (Decree / Ordinance)',
  },
  {
    name: '조례·규칙',
    description: '자치법규 및 의회·기관 내부 규칙 (Ordinance / Rule)',
  },
]

interface PoliticalSystemSeedEntry {
  name: string
  /** 현대 국가명 (country.name) */
  countryName?: string
  /** 역사 국가명 (historical_country.name) */
  historicalCountryName?: string
  startEra?: Era
  startYear: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: Era | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  isCurrent: boolean
  governmentForm: GovernmentForm
  legislatureType: LegislatureType
  lowerHouseName?: string | null
  lowerHouseSeats?: number | null
  upperHouseName?: string | null
  upperHouseSeats?: number | null
  /** 관직 정의 카탈로그 title (HEAD_OF_STATE) */
  headOfStatePositionTitle?: string | null
  /** 카탈로그 외 자유입력 직함 */
  headOfStateTitle?: string | null
  headOfStateHasPower?: boolean | null
  /** 관직 정의 카탈로그 title (HEAD_OF_GOVERNMENT) */
  headOfGovernmentPositionTitle?: string | null
  /** 카탈로그 외 자유입력 직함 */
  headOfGovernmentTitle?: string | null
  headOfGovernmentHasPower?: boolean | null
  stateStructure?: StateStructure | null
  partySystem?: PartySystem | null
  notes?: string | null
}

const POLITICAL_SYSTEMS: PoliticalSystemSeedEntry[] = [
  // ── 프랑스 (FR) — 기존 12건의 historicalCountryId·월일 보정 + 1791 입헌왕정 ──
  {
    name: '앙시앵 레짐 (프랑스 왕국)',
    countryName: '프랑스',
    historicalCountryName: '프랑스 왕국',
    startEra: 'AD',
    startYear: 1589,
    startMonth: 8,
    startDay: 2,
    endEra: 'AD',
    endYear: 1791,
    endMonth: 9,
    endDay: 3,
    isCurrent: false,
    governmentForm: 'ABSOLUTE_MONARCHY',
    legislatureType: 'NONE',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    stateStructure: 'UNITARY',
    notes:
      '부르봉 왕조 앙리 4세 즉위(1589)부터 1791년 헌법 반포 전까지의 전제왕정 체제. 신분의회인 삼부회는 1614년 이후 1789년 대혁명 직전까지 175년간 소집되지 않았다.',
  },
  {
    name: '1791년 헌법 입헌왕정',
    countryName: '프랑스',
    historicalCountryName: '프랑스 왕국',
    startEra: 'AD',
    startYear: 1791,
    startMonth: 9,
    startDay: 3,
    endEra: 'AD',
    endYear: 1792,
    endMonth: 9,
    endDay: 21,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '입법의회',
    lowerHouseSeats: 745,
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '제헌국민의회가 제정한 프랑스 최초의 성문헌법(1791년 헌법)에 따른 단원제 입헌군주제. 국왕에게 정지적 거부권을 부여했으나 1792년 8월 10일 봉기로 왕권이 정지되었다.',
  },
  {
    name: '제1공화국',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제1공화국',
    startEra: 'AD',
    startYear: 1792,
    startMonth: 9,
    startDay: 21,
    endEra: 'AD',
    endYear: 1804,
    endMonth: 5,
    endDay: 18,
    isCurrent: false,
    governmentForm: 'PARLIAMENTARY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '국민공회',
    lowerHouseSeats: 749,
    headOfStateTitle: '없음(합의체)',
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '국민공회(1792~1795, 공화력 1년 자코뱅 헌법)·총재정부(1795~1799, 공화력 3년 헌법 양원제)·통령정부(1799~1804, 공화력 8년 헌법)로 이어진 최초의 공화정 시기.',
  },
  {
    name: '제1제국',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제1제국',
    startEra: 'AD',
    startYear: 1804,
    startMonth: 5,
    startDay: 18,
    endEra: 'AD',
    endYear: 1814,
    endMonth: 4,
    endDay: 6,
    isCurrent: false,
    governmentForm: 'ABSOLUTE_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '입법원',
    lowerHouseSeats: 300,
    upperHouseName: '호헌원로원',
    upperHouseSeats: 80,
    headOfStatePositionTitle: '황제',
    headOfStateHasPower: true,
    stateStructure: 'UNITARY',
    notes:
      '공화력 12년 헌법(1804)과 국민투표로 출범한 나폴레옹 1세의 황제정 체제.',
  },
  {
    name: '부르봉 복고 왕정',
    countryName: '프랑스',
    historicalCountryName: '부르봉 복고 왕정',
    startEra: 'AD',
    startYear: 1814,
    startMonth: 6,
    startDay: 4,
    endEra: 'AD',
    endYear: 1830,
    endMonth: 8,
    endDay: 9,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '대의원',
    lowerHouseSeats: 430,
    upperHouseName: '귀족원',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes: '1814년 흠정헌장(Charte de 1814)으로 재산 제한선거와 양원제를 도입한 입헌군주제.',
  },
  {
    name: '7월 왕정',
    countryName: '프랑스',
    historicalCountryName: '7월 왕정',
    startEra: 'AD',
    startYear: 1830,
    startMonth: 8,
    startDay: 9,
    endEra: 'AD',
    endYear: 1848,
    endMonth: 2,
    endDay: 24,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '대의원',
    lowerHouseSeats: 459,
    upperHouseName: '귀족원',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1830년 7월 혁명과 개정 헌장으로 성립된 오를레앙가 루이필리프 1세의 자유주의 입헌군주제.',
  },
  {
    name: '제2공화국',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제2공화국',
    startEra: 'AD',
    startYear: 1848,
    startMonth: 2,
    startDay: 24,
    endEra: 'AD',
    endYear: 1852,
    endMonth: 12,
    endDay: 2,
    isCurrent: false,
    governmentForm: 'PRESIDENTIAL',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '국민의회',
    lowerHouseSeats: 750,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1848년 11월 헌법에 따라 남성 보통선거로 대통령(루이 나폴레옹 보나파르트)과 단원제 국민의회를 직접 선출한 최초의 프랑스 대통령제 공화국.',
  },
  {
    name: '제2제국',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제2제국',
    startEra: 'AD',
    startYear: 1852,
    startMonth: 12,
    startDay: 2,
    endEra: 'AD',
    endYear: 1870,
    endMonth: 9,
    endDay: 4,
    isCurrent: false,
    governmentForm: 'ABSOLUTE_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '입법원',
    lowerHouseSeats: 283,
    upperHouseName: '원로원',
    headOfStatePositionTitle: '황제',
    headOfStateHasPower: true,
    stateStructure: 'UNITARY',
    notes:
      '1852년 헌법과 국민투표로 출범한 나폴레옹 3세의 제정. 1860년대 후반 의회 권한을 확대한 자유제정(Empire libéral)으로 완화되었다.',
  },
  {
    name: '제3공화국',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제3공화국',
    startEra: 'AD',
    startYear: 1870,
    startMonth: 9,
    startDay: 4,
    endEra: 'AD',
    endYear: 1940,
    endMonth: 7,
    endDay: 10,
    isCurrent: false,
    governmentForm: 'PARLIAMENTARY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '하원',
    lowerHouseSeats: 618,
    upperHouseName: '상원',
    upperHouseSeats: 314,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1875년 헌법적 법률(Lois constitutionnelles de 1875)로 확립된 의원내각제 공화국. 1877년 5월 16일 헌정 위기 이후 대통령의 의회 해산권이 사문화되고 의회 우위 내각제가 정착되었다.',
  },
  {
    name: '비시 프랑스',
    countryName: '프랑스',
    historicalCountryName: '비시 프랑스',
    startEra: 'AD',
    startYear: 1940,
    startMonth: 7,
    startDay: 10,
    endEra: 'AD',
    endYear: 1944,
    endMonth: 8,
    endDay: 20,
    isCurrent: false,
    governmentForm: 'PROVISIONAL',
    legislatureType: 'NONE',
    headOfStatePositionTitle: '국가주석',
    headOfStateHasPower: true,
    stateStructure: 'UNITARY',
    notes:
      '1940년 7월 10일 헌법적 권한 위임법으로 제3공화국 의회가 정지되고 필리프 페탱 원수가 프랑스 국가원수(Chef de l’État Français)로 전권을 행사한 권위주의 정체.',
  },
  {
    name: '임시정부',
    countryName: '프랑스',
    startEra: 'AD',
    startYear: 1944,
    startMonth: 6,
    startDay: 3,
    endEra: 'AD',
    endYear: 1946,
    endMonth: 10,
    endDay: 27,
    isCurrent: false,
    governmentForm: 'PROVISIONAL',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '제헌의회',
    lowerHouseSeats: 586,
    headOfGovernmentTitle: '임시정부 수반',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '해방 후 샤를 드골 등을 수반으로 하여 여성 참정권 도입과 제4공화국 제헌의회 선거(1945·1946)를주도한 프랑스 공화국 임시정부(GPRF).',
  },
  {
    name: '제4공화국',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제4공화국',
    startEra: 'AD',
    startYear: 1946,
    startMonth: 10,
    startDay: 27,
    endEra: 'AD',
    endYear: 1958,
    endMonth: 10,
    endDay: 4,
    isCurrent: false,
    governmentForm: 'PARLIAMENTARY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '국민의회',
    lowerHouseSeats: 627,
    upperHouseName: '공화국참의원',
    upperHouseSeats: 320,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1946년 10월 국민투표로 채택된 제4공화국 헌법 체제. 하원(국민의회) 우위의 의원내각제였으나 잦은 내각 붕괴와 알제리 전쟁 위기로 1958년 개헌에 이르렀다.',
  },
  {
    name: '제5공화국',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제5공화국',
    startEra: 'AD',
    startYear: 1958,
    startMonth: 10,
    startDay: 4,
    isCurrent: true,
    governmentForm: 'SEMI_PRESIDENTIAL',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '국민의회',
    lowerHouseSeats: 577,
    upperHouseName: '상원',
    upperHouseSeats: 348,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1958년 10월 4일 공포된 현행 프랑스 제5공화국 헌법 체제. 대통령 권한을 대폭 강화한 이원집정부제(준대통령제)의 원형이며, 1962년 개헌으로 대통령 직선제를, 2000년 개헌으로 5년 임기제를 도입하였다.',
  },

  // ── 미국 (US) — 기존 2건 월일 보강 ────────────────────────────────────
  {
    name: '연합규약 체제',
    countryName: '미국',
    startEra: 'AD',
    startYear: 1781,
    startMonth: 3,
    startDay: 1,
    endEra: 'AD',
    endYear: 1789,
    endMonth: 3,
    endDay: 4,
    isCurrent: false,
    governmentForm: 'OTHER',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '연합회의',
    lowerHouseSeats: 13,
    headOfStateTitle: '연합회의 의장',
    headOfStateHasPower: false,
    stateStructure: 'CONFEDERATION',
    partySystem: 'NON_PARTISAN',
    notes:
      '독립한 13개 주의 국가연합. 별도의 행정부·사법부가 없었고 연합회의 의장은 의전직이었다. 과세권·통상규제권이 없어 1787년 필라델피아 제헌회의로 이어졌다.',
  },
  {
    name: '합중국 헌법 체제',
    countryName: '미국',
    startEra: 'AD',
    startYear: 1789,
    startMonth: 3,
    startDay: 4,
    isCurrent: true,
    governmentForm: 'PRESIDENTIAL',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '하원',
    lowerHouseSeats: 435,
    upperHouseName: '상원',
    upperHouseSeats: 100,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    stateStructure: 'FEDERAL',
    partySystem: 'TWO_PARTY',
    notes:
      '1787년 제헌회의가 기초하고 1789년 발효된 세계 최초의 근대 성문 연방헌법 및 대통령제 체제. 대통령이 국가원수이자 행정부 수반을 겸하며, 하원 435석·상원 100석의 엄격한 삼권분립과 연방제를 유지한다.',
  },

  // ── 한국 (KR) — 고려 · 조선 · 대한제국 · 대한민국(제1~6공화국) ─────────
  {
    name: '고려 2성 6부·도병마사 체제',
    countryName: '대한민국',
    historicalCountryName: '고려',
    startEra: 'AD',
    startYear: 918,
    startMonth: 7,
    startDay: 25,
    endEra: 'AD',
    endYear: 1392,
    endMonth: 7,
    endDay: 17,
    isCurrent: false,
    governmentForm: 'ABSOLUTE_MONARCHY',
    legislatureType: 'NONE',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    headOfGovernmentTitle: '문하시중',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'NON_PARTISAN',
    notes:
      '당·송의 관제를 수용하면서도 중서문하성·상서성의 2성 6부제와 독자적 재추 합의기구인 도병마사(도평의사사)·식목도감을 운영한 귀족·관료 군주제 체제.',
  },
  {
    name: '조선 경국대전·의정부 6조 체제',
    countryName: '대한민국',
    historicalCountryName: '조선',
    startEra: 'AD',
    startYear: 1392,
    startMonth: 7,
    startDay: 17,
    endEra: 'AD',
    endYear: 1897,
    endMonth: 10,
    endDay: 12,
    isCurrent: false,
    governmentForm: 'ABSOLUTE_MONARCHY',
    legislatureType: 'NONE',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '영의정',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'NON_PARTISAN',
    notes:
      '조선경국전(1394)과 경국대전(1485)으로 성문화된 유교적 법치·중앙집권 관료 군주제. 국왕 아래 최고 합좌기관인 의정부(영의정·좌의정·우의정)와 집행기관인 6조(이·호·예·병·형·공), 언론 3사(사헌부·사간원·홍문관)의 견제와 균형을 두었으며, 1895년 홍범 14조로 근대 내각제가 도입되었다.',
  },
  {
    name: '대한제국 대한국 국제 체제',
    countryName: '대한민국',
    historicalCountryName: '대한제국',
    startEra: 'AD',
    startYear: 1897,
    startMonth: 10,
    startDay: 12,
    endEra: 'AD',
    endYear: 1910,
    endMonth: 8,
    endDay: 29,
    isCurrent: false,
    governmentForm: 'ABSOLUTE_MONARCHY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '중추원',
    lowerHouseSeats: 50,
    headOfStatePositionTitle: '황제',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '내각총리대신',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'NON_PARTISAN',
    notes:
      '1897년 황제국 선포와 1899년 8월 17일 반포된 헌법 규범 「대한국 국제(大韓國國制)」에 기초한 전제군주제 체제. 자주독립 제국임을 천명하고 대원수로서의 황제에게 입법·행정·사법·군통수권을 집중시켰다.',
  },
  {
    name: '제1공화국 (1948년 제헌헌법 체제)',
    countryName: '대한민국',
    startEra: 'AD',
    startYear: 1948,
    startMonth: 7,
    startDay: 17,
    endEra: 'AD',
    endYear: 1960,
    endMonth: 6,
    endDay: 15,
    isCurrent: false,
    governmentForm: 'PRESIDENTIAL',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '제헌국회 · 민의원',
    lowerHouseSeats: 200,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '국무총리',
    headOfGovernmentHasPower: false,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1948년 5·10 총선거로 구성된 제헌국회가 제정·공포(7월 17일)한 대한민국 최초의 현대 민주헌법 체제. 1919년 대한민국 임시헌장의 민주공화국 정신을 계승하고 대통령제에 의원내각제 요소(국무총리·국무원)를 가미하였으며, 1952년 발췌개헌(직선제·양원제 규정)과 1954년 사사오입 개헌을 거쳤다.',
  },
  {
    name: '제2공화국 (1960년 내각책임제 헌법 체제)',
    countryName: '대한민국',
    startEra: 'AD',
    startYear: 1960,
    startMonth: 6,
    startDay: 15,
    endEra: 'AD',
    endYear: 1961,
    endMonth: 5,
    endDay: 16,
    isCurrent: false,
    governmentForm: 'PARLIAMENTARY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '민의원',
    lowerHouseSeats: 233,
    upperHouseName: '참의원',
    upperHouseSeats: 58,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '국무총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'TWO_PARTY',
    notes:
      '4·19 혁명 이후 1960년 6월 15일 제3차 개헌으로 출범한 대한민국 헌정사상 유일의 순수 의원내각제 및 민의원·참의원 양원제 체제. 헌법재판소 설치와 지방자치단체장 직선제를 도입하였다.',
  },
  {
    name: '국가재건최고회의 (5·16 군정기)',
    countryName: '대한민국',
    startEra: 'AD',
    startYear: 1961,
    startMonth: 5,
    startDay: 16,
    endEra: 'AD',
    endYear: 1963,
    endMonth: 12,
    endDay: 17,
    isCurrent: false,
    governmentForm: 'MILITARY',
    legislatureType: 'NONE',
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: false,
    headOfGovernmentTitle: '국가재건최고회의 의장',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'NON_PARTISAN',
    notes:
      '5·16 군사정변 이후 국가재건비상조치법에 따라 국회를 해산하고 국가재건최고회의가 입법·행정·사법 통제권을 행사한 과도 군정 체제.',
  },
  {
    name: '제3공화국 (1962년 제5차 개헌 체제)',
    countryName: '대한민국',
    startEra: 'AD',
    startYear: 1963,
    startMonth: 12,
    startDay: 17,
    endEra: 'AD',
    endYear: 1972,
    endMonth: 11,
    endDay: 21,
    isCurrent: false,
    governmentForm: 'PRESIDENTIAL',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '국회',
    lowerHouseSeats: 175,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '국무총리',
    headOfGovernmentHasPower: false,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1962년 12월 헌정사상 최초의 국민투표로 확정된 제5차 개헌 체제. 대통령 직선제(4년 중임)와 단원제 국회로 복귀하였으며 1969년 3선 개헌(제6차 개헌)을 거쳤다.',
  },
  {
    name: '제4공화국 (1972년 유신헌법 체제)',
    countryName: '대한민국',
    startEra: 'AD',
    startYear: 1972,
    startMonth: 11,
    startDay: 21,
    endEra: 'AD',
    endYear: 1980,
    endMonth: 10,
    endDay: 27,
    isCurrent: false,
    governmentForm: 'PRESIDENTIAL',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '국회',
    lowerHouseSeats: 219,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '국무총리',
    headOfGovernmentHasPower: false,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1972년 10월 유신과 제7차 개헌으로 수립된 권위주의 대통령제 체제. 통일주체국민회의에 의한 대통령 간선제(6년 연임 제한 폐지), 국회의원 1/3 추천권(유정회), 긴급조치권과 국회해산권을 규정하였다.',
  },
  {
    name: '제5공화국 (1980년 제8차 개헌 체제)',
    countryName: '대한민국',
    startEra: 'AD',
    startYear: 1980,
    startMonth: 10,
    startDay: 27,
    endEra: 'AD',
    endYear: 1987,
    endMonth: 10,
    endDay: 28,
    isCurrent: false,
    governmentForm: 'PRESIDENTIAL',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '국회',
    lowerHouseSeats: 276,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '국무총리',
    headOfGovernmentHasPower: false,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1980년 제8차 개헌으로 출범한 체제. 대통령 선거인단에 의한 7년 단임 간선제를 채택하고 국가보위입법회의가 입법을 대행한 후 제11대 국회가 구성되었다.',
  },
  {
    name: '제6공화국 (1987년 현행 헌법 체제)',
    countryName: '대한민국',
    startEra: 'AD',
    startYear: 1987,
    startMonth: 10,
    startDay: 29,
    isCurrent: true,
    governmentForm: 'PRESIDENTIAL',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '국회',
    lowerHouseSeats: 300,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '국무총리',
    headOfGovernmentHasPower: false,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1987년 6월 민주항쟁의 결실로 여야 합의 및 국민투표를 거쳐 1987년 10월 29일 공포·1988년 2월 25일 시행된 현행 대한민국 제9차 개헌 헌법 체제. 5년 단임 대통령 직선제, 대통령의 국회해산권 폐지, 국정감사권 부활, 헌법재판소 신설을 통해 민주적 헌정 질서를 확립하였다.',
  },

  // ── 일본 (JP) — 도쿠가와 막부 · 일본 제국 · 일본국 ──────────────────────
  {
    name: '막번 체제 (무가제법도·바쿠한 체제)',
    countryName: '일본',
    historicalCountryName: '도쿠가와 막부',
    startEra: 'AD',
    startYear: 1603,
    startMonth: 3,
    startDay: 24,
    endEra: 'AD',
    endYear: 1867,
    endMonth: 11,
    endDay: 9,
    isCurrent: false,
    governmentForm: 'MILITARY',
    legislatureType: 'NONE',
    headOfStatePositionTitle: '천황',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '쇼군',
    headOfGovernmentHasPower: true,
    stateStructure: 'CONFEDERATION',
    partySystem: 'NON_PARTISAN',
    notes:
      '교토의 천황은 명목상 군주로 두고 에도의 정이대장군(쇼군)이 무가제법도·금중병공가제법도에 의거해 중앙 막정(로주·와카도시요리·삼봉행)과 전국 약 260개 번(다이묘)을 통할한 막번 체제. 1867년 대정봉환으로 종식되었다.',
  },
  {
    name: '메이지 태정관 · 내각 창설 체제',
    countryName: '일본',
    historicalCountryName: '일본 제국',
    startEra: 'AD',
    startYear: 1868,
    startMonth: 1,
    startDay: 3,
    endEra: 'AD',
    endYear: 1889,
    endMonth: 2,
    endDay: 10,
    isCurrent: false,
    governmentForm: 'ABSOLUTE_MONARCHY',
    legislatureType: 'NONE',
    headOfStatePositionTitle: '천황',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '내각총리대신',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'NON_PARTISAN',
    notes:
      '1868년 왕정복고 대호령·5개조 어서문·정체서로 수립된 태정관 체제에서 출발하여, 1885년 12월 22일 태정관제를 폐지하고 근대 내각제도(초대 내각총리대신 이토 히로부미)를 창설해 입헌 체제 이행을 준비한 시기.',
  },
  {
    name: '대일본제국 헌법 체제 (메이지 헌법 체제)',
    countryName: '일본',
    historicalCountryName: '일본 제국',
    startEra: 'AD',
    startYear: 1889,
    startMonth: 2,
    startDay: 11,
    endEra: 'AD',
    endYear: 1947,
    endMonth: 5,
    endDay: 2,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '중의원',
    lowerHouseSeats: 466,
    upperHouseName: '귀족원',
    upperHouseSeats: 400,
    headOfStatePositionTitle: '천황',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '내각총리대신',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1889년 2월 11일 반포·1890년 11월 29일 시행된 대일본제국 헌법(흠정헌법) 체제. 천황 주권·통수권 독립과 제국의회(선출 중의원·비선출 귀족원) 양원제를 결합하였다.',
  },
  {
    name: '일본국 헌법 체제 (평화헌법 · 상징천황제)',
    countryName: '일본',
    historicalCountryName: '일본국',
    startEra: 'AD',
    startYear: 1947,
    startMonth: 5,
    startDay: 3,
    isCurrent: true,
    governmentForm: 'PARLIAMENTARY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '중의원',
    lowerHouseSeats: 465,
    upperHouseName: '참의원',
    upperHouseSeats: 248,
    headOfStatePositionTitle: '천황',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '내각총리대신',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1946년 11월 3일 공포·1947년 5월 3일 시행된 현행 일본국 헌법 체제. 천황을 국가와 국민 통합의 상징으로 규정하고 국민주권·평화주의(제9조)·중의원 우위의 의원내각제를 확립하였다.',
  },

  // ── 독일 (DE) — 프로이센 · 북독일 연방 · 독일 제국 · 바이마르 · 나치 · 동서독 · 현대 독일 ──
  {
    name: '프로이센 1850년 흠정헌법 체제',
    countryName: '독일',
    historicalCountryName: '프로이센 왕국',
    startEra: 'AD',
    startYear: 1850,
    startMonth: 1,
    startDay: 31,
    endEra: 'AD',
    endYear: 1918,
    endMonth: 11,
    endDay: 9,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '대의원(Abgeordnetenhaus)',
    lowerHouseSeats: 443,
    upperHouseName: '귀족원(Herrenhaus)',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1848년 혁명 이후 프리드리히 빌헬름 4세가 반포한 1850년 프로이센 헌법 체제. 납세액에 따른 3급 선거제와 국왕 중심의 군 통수권·총리 임면권을 유지하였다.',
  },
  {
    name: '북독일 연방 헌법 체제',
    countryName: '독일',
    historicalCountryName: '북독일 연방',
    startEra: 'AD',
    startYear: 1867,
    startMonth: 7,
    startDay: 1,
    endEra: 'AD',
    endYear: 1871,
    endMonth: 1,
    endDay: 18,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '북독일 제국의회',
    lowerHouseSeats: 297,
    upperHouseName: '연방참의원',
    upperHouseSeats: 43,
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'FEDERAL',
    partySystem: 'MULTI_PARTY',
    notes:
      '프로이센-오스트리아 전쟁 승리 후 비스마르크가 기초한 1867년 북독일 연방 헌법 체제. 1871년 독일 제국 헌법의 직접적 모태가 되었다.',
  },
  {
    name: '독일 제국 헌법 체제 (비스마르크 헌법)',
    countryName: '독일',
    historicalCountryName: '독일 제국',
    startEra: 'AD',
    startYear: 1871,
    startMonth: 1,
    startDay: 18,
    endEra: 'AD',
    endYear: 1918,
    endMonth: 11,
    endDay: 9,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '제국의회(Reichstag)',
    lowerHouseSeats: 397,
    upperHouseName: '연방참의원(Bundesrat)',
    upperHouseSeats: 58,
    headOfStatePositionTitle: '황제',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'FEDERAL',
    partySystem: 'MULTI_PARTY',
    notes:
      '1871년 4월 16일 제정된 독일 제국 헌법(비스마르크 헌법) 체제. 프로이센 국왕이 독일 황제를 겸임하며 제국총리는 의회가 아닌 황제에게만 책임을 졌고, 성인 남성 보통선거로 선출되는 제국의회와 25개 구성국 대표인 연방참의원 양원제를 두었다.',
  },
  {
    name: '바이마르 공화국 헌법 체제',
    countryName: '독일',
    historicalCountryName: '바이마르 공화국',
    startEra: 'AD',
    startYear: 1919,
    startMonth: 8,
    startDay: 11,
    endEra: 'AD',
    endYear: 1933,
    endMonth: 3,
    endDay: 23,
    isCurrent: false,
    governmentForm: 'SEMI_PRESIDENTIAL',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '국가의회(Reichstag)',
    lowerHouseSeats: 491,
    upperHouseName: '국가참의원(Reichsrat)',
    upperHouseSeats: 66,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'FEDERAL',
    partySystem: 'MULTI_PARTY',
    notes:
      '1919년 바이마르 제헌국민의회가 채택하고 8월 11일 공포된 바이마르 헌법 체제. 남녀 보통·비례대표 선거와 사회적 기본권을 선구적으로 규정했으나, 대통령의 긴급명령권(제48조)·의회 해산권과 극단적 다당화로 헌정 위기가 반복되었다.',
  },
  {
    name: '나치 독일 수권법 · 총통 독재 체제',
    countryName: '독일',
    historicalCountryName: '나치 독일 (제3제국)',
    startEra: 'AD',
    startYear: 1933,
    startMonth: 3,
    startDay: 24,
    endEra: 'AD',
    endYear: 1945,
    endMonth: 5,
    endDay: 8,
    isCurrent: false,
    governmentForm: 'ONE_PARTY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '국가의회(Reichstag)',
    lowerHouseSeats: 855,
    headOfStateTitle: '총통(Führer)',
    headOfStateHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'ONE_PARTY',
    notes:
      '1933년 국회의사당 방화 사건 긴급령과 전권위임법(수권법), 1934년 국가재건법(연방제 폐지) 및 국가원수법(대통령·총리직 통합)으로 바이마르 헌법을 형해화하고 확립된 히틀러 총통 1인 전체주의 체제.',
  },
  {
    name: '독일 민주 공화국 사회주의 헌법 체제 (동독)',
    countryName: '독일',
    historicalCountryName: '독일 민주 공화국 (동독)',
    startEra: 'AD',
    startYear: 1949,
    startMonth: 10,
    startDay: 7,
    endEra: 'AD',
    endYear: 1990,
    endMonth: 10,
    endDay: 3,
    isCurrent: false,
    governmentForm: 'ONE_PARTY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '인민의회(Volkskammer)',
    lowerHouseSeats: 500,
    headOfStateTitle: '국가평의회 의장',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'ONE_PARTY',
    notes:
      '1949년·1968년·1974년 동독 헌법에 따른 독일사회주의통일당(SED) 지도 체제. 1990년 10월 3일 기본법 제23조에 따른 서독 편입 방식으로 재통일되었다.',
  },
  {
    name: '독일 연방 공화국 기본법 체제 (서독 · 통일 독일)',
    countryName: '독일',
    startEra: 'AD',
    startYear: 1949,
    startMonth: 5,
    startDay: 23,
    isCurrent: true,
    governmentForm: 'PARLIAMENTARY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '연방의회(Bundestag)',
    lowerHouseSeats: 630,
    upperHouseName: '연방참의원(Bundesrat)',
    upperHouseSeats: 69,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '연방총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'FEDERAL',
    partySystem: 'MULTI_PARTY',
    notes:
      '1949년 5월 23일 공포된 독일 연방 공화국 기본법(Grundgesetz) 체제. 인간의 존엄성 불가침(제1조), 방어적 민주주의, 건설적 불신임제(후임 총리 선출 없는 불신임 금지), 연방헌법재판소를 핵심으로 하며 1990년 통일 이후에도 현행 헌법으로 작동하고 있다.',
  },

  // ── 러시아 (RU) — 차르국 · 러시아 제국 · 임시정부 · 소련 · 러시아 연방 ──
  {
    name: '러시아 차르국 전제군주제 · 젬스키 소보르 체제',
    countryName: '러시아',
    historicalCountryName: '러시아 차르국',
    startEra: 'AD',
    startYear: 1547,
    startMonth: 1,
    startDay: 16,
    endEra: 'AD',
    endYear: 1721,
    endMonth: 11,
    endDay: 2,
    isCurrent: false,
    governmentForm: 'ABSOLUTE_MONARCHY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '젬스키 소보르(전국신분의회)',
    headOfStatePositionTitle: '황제',
    headOfStateHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'NON_PARTISAN',
    notes:
      '1547년 이반 4세의 차르 대관과 1649년 대법전(소보르노예 울로제니예)으로 성문화된 전제군주제. 보야르 두마(귀족회의)와 젬스키 소보르가 자문·입법에 참여하였다.',
  },
  {
    name: '러시아 제국 전제군주제 (차르 전제정)',
    countryName: '러시아',
    historicalCountryName: '러시아 제국',
    startEra: 'AD',
    startYear: 1721,
    startMonth: 11,
    startDay: 2,
    endEra: 'AD',
    endYear: 1906,
    endMonth: 4,
    endDay: 22,
    isCurrent: false,
    governmentForm: 'ABSOLUTE_MONARCHY',
    legislatureType: 'NONE',
    headOfStatePositionTitle: '황제',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'NON_PARTISAN',
    notes:
      '표트르 대제의 제국 선포(1721)와 1832년 러시아 제국 법전(스페란스키 편찬)에 기초한 무제한 차르 전제정 체제. 1905년 10월 선언으로 장관회의 의장(총리)직이 신설되어 비테 내각이 출범하였다.',
  },
  {
    name: '러시아 제국 1906년 국가기본법 체제 (외견적 입헌군주제)',
    countryName: '러시아',
    historicalCountryName: '러시아 제국',
    startEra: 'AD',
    startYear: 1906,
    startMonth: 4,
    startDay: 23,
    endEra: 'AD',
    endYear: 1917,
    endMonth: 3,
    endDay: 15,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '국가두마(하원)',
    lowerHouseSeats: 442,
    upperHouseName: '국가평의회(상원)',
    upperHouseSeats: 196,
    headOfStatePositionTitle: '황제',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1905년 혁명 이후 1906년 4월 23일 반포된 개정 국가기본법 체제. 러시아 사상 최초의 선출 의회인 국가두마와 상원 격인 국가평의회 양원제를 도입했으나, 황제가 내각 임면권·외교군사권·비회기 긴급입법권(제87조)을 보유하였다.',
  },
  {
    name: '러시아 공화국 · 임시정부 체제',
    countryName: '러시아',
    historicalCountryName: '러시아 공화국',
    startEra: 'AD',
    startYear: 1917,
    startMonth: 3,
    startDay: 15,
    endEra: 'AD',
    endYear: 1917,
    endMonth: 11,
    endDay: 7,
    isCurrent: false,
    governmentForm: 'PROVISIONAL',
    legislatureType: 'NONE',
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1917년 2월 혁명으로 니콜라이 2세가 퇴위한 뒤 전러시아 제헌의회 소집 전까지 국정을 담당한 리보프·케렌스키 임시정부 체제.',
  },
  {
    name: '소비에트 사회주의 공화국 연방 헌법 체제',
    countryName: '러시아',
    historicalCountryName: '소비에트 사회주의 공화국 연방',
    startEra: 'AD',
    startYear: 1922,
    startMonth: 12,
    startDay: 30,
    endEra: 'AD',
    endYear: 1991,
    endMonth: 12,
    endDay: 26,
    isCurrent: false,
    governmentForm: 'ONE_PARTY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '연방소비에트',
    lowerHouseSeats: 750,
    upperHouseName: '민족소비에트',
    upperHouseSeats: 750,
    headOfStateTitle: '최고소비에트 상임간부회 의장',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '서기장',
    headOfGovernmentHasPower: true,
    stateStructure: 'FEDERAL',
    partySystem: 'ONE_PARTY',
    notes:
      '1924년 소련 헌법, 1936년 스탈린 헌법, 1977년 브레즈네프 헌법(공산당 영도 조항 제6조)으로 이어진 소비에트 사회주의 연방 및 공산당 일당 지배 체제.',
  },
  {
    name: '러시아 연방 1993년 헌법 체제',
    countryName: '러시아',
    startEra: 'AD',
    startYear: 1993,
    startMonth: 12,
    startDay: 25,
    isCurrent: true,
    governmentForm: 'SEMI_PRESIDENTIAL',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '국가두마(하원)',
    lowerHouseSeats: 450,
    upperHouseName: '연방평의회(상원)',
    upperHouseSeats: 178,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'FEDERAL',
    partySystem: 'MULTI_PARTY',
    notes:
      '1993년 헌정 위기 이후 국민투표로 채택된 현행 러시아 연방 헌법 체제. 강력한 대통령 중심의 이원집정부제 연방공화국이며 2008년(임기 6년 연장)·2020년 개헌을 거쳤다.',
  },

  // ── 영국 (GB) — 잉글랜드 왕국 · 그레이트브리튼 왕국 · 연합왕국 ────────────
  {
    name: '잉글랜드 권리장전 입헌군주제 체제',
    countryName: '영국',
    historicalCountryName: '잉글랜드 왕국',
    startEra: 'AD',
    startYear: 1689,
    startMonth: 12,
    startDay: 16,
    endEra: 'AD',
    endYear: 1707,
    endMonth: 4,
    endDay: 30,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '서민원(하원)',
    lowerHouseSeats: 513,
    upperHouseName: '귀족원(상원)',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'TWO_PARTY',
    notes:
      '1688년 명예혁명과 1689년 권리장전(Bill of Rights), 1701년 왕위계승법으로 의회 주권과 입헌군주제의 기틀을 확립한 체제.',
  },
  {
    name: '그레이트브리튼 연합법 · 초기 내각제 체제',
    countryName: '영국',
    historicalCountryName: '그레이트브리튼 왕국',
    startEra: 'AD',
    startYear: 1707,
    startMonth: 5,
    startDay: 1,
    endEra: 'AD',
    endYear: 1800,
    endMonth: 12,
    endDay: 31,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '서민원(하원)',
    lowerHouseSeats: 558,
    upperHouseName: '귀족원(상원)',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'TWO_PARTY',
    notes:
      '1707년 잉글랜드·스코틀랜드 연합법으로 출범하여 하노버 왕조 조지 1세·로버트 월폴 집권기(1721~1742)를 거치며 국왕은 군림하되 통치하지 않는 의원내각제 관행이 형성된 시기.',
  },
  {
    name: '연합왕국 고전적 의원내각제 · 입헌군주제 체제',
    countryName: '영국',
    historicalCountryName: '그레이트브리튼 및 아일랜드 연합왕국',
    startEra: 'AD',
    startYear: 1801,
    startMonth: 1,
    startDay: 1,
    endEra: 'AD',
    endYear: 1922,
    endMonth: 12,
    endDay: 5,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '서민원(하원)',
    lowerHouseSeats: 658,
    upperHouseName: '귀족원(상원)',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'TWO_PARTY',
    notes:
      '1800년 아일랜드 연합법으로 출범하고 1832·1867·1884년 선거법 개정 및 1911년 의회법(상원 거부권 제한)을 통해 하원 다수당 기반의 웨스트민스터 의원내각제를 완성한 체제.',
  },
  {
    name: '영국 불문헌법 · 웨스트민스터 의원내각제 체제',
    countryName: '영국',
    historicalCountryName: '그레이트브리튼 및 북아일랜드 연합왕국',
    startEra: 'AD',
    startYear: 1922,
    startMonth: 12,
    startDay: 6,
    isCurrent: true,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '서민원(House of Commons)',
    lowerHouseSeats: 650,
    upperHouseName: '귀족원(House of Lords)',
    upperHouseSeats: 780,
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '단일 성문 헌법전 없이 마그나 카르타(1215), 권리장전(1689), 연합법(1707·1800), 의회법(1911·1949), 1998년 인권법·지방분권법 및 헌정 관습으로 운영되는 불문헌법 의원내각제·입헌군주제 체제.',
  },

  // ── 중국 (CN) & 대만 (TW) — 청나라 · 중화민국 · 중화인민공화국 ────────────
  {
    name: '청나라 군기처 전제황권 · 흠정헌법대강 체제',
    countryName: '중국',
    historicalCountryName: '청나라',
    startEra: 'AD',
    startYear: 1636,
    startMonth: 5,
    startDay: 15,
    endEra: 'AD',
    endYear: 1912,
    endMonth: 2,
    endDay: 12,
    isCurrent: false,
    governmentForm: 'ABSOLUTE_MONARCHY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '자정원(1910~1912)',
    lowerHouseSeats: 200,
    headOfStatePositionTitle: '황제',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '내각총리대신',
    headOfGovernmentHasPower: false,
    stateStructure: 'UNITARY',
    partySystem: 'NON_PARTISAN',
    notes:
      '내각대학사와 군기처 중심의 황제 독재 체제였으나, 청말 신정기인 1908년 흠정헌법대강 반포, 1910년 자정원 소집, 1911년 책임내각(경친왕·위안스카이 내각) 및 헌법중대신조 19조 선포를 거쳐 1912년 선통제 퇴위로 종식되었다.',
  },
  {
    name: '중화민국 임시약법 · 북양정부 체제',
    countryName: '중국',
    historicalCountryName: '중화민국',
    startEra: 'AD',
    startYear: 1912,
    startMonth: 1,
    startDay: 1,
    endEra: 'AD',
    endYear: 1928,
    endMonth: 10,
    endDay: 9,
    isCurrent: false,
    governmentForm: 'PARLIAMENTARY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '중의원',
    lowerHouseSeats: 596,
    upperHouseName: '참의원',
    upperHouseSeats: 274,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1912년 3월 11일 공포된 중화민국 임시약법(아시아 최초의 공화국 헌법 규범)에 기초한 초기 공화정 및 베이징 북양정부 체제.',
  },
  {
    name: '중화민국 국민정부 훈정약법 · 5원 체제',
    countryName: '중국',
    historicalCountryName: '중화민국',
    startEra: 'AD',
    startYear: 1928,
    startMonth: 10,
    startDay: 10,
    endEra: 'AD',
    endYear: 1947,
    endMonth: 12,
    endDay: 24,
    isCurrent: false,
    governmentForm: 'ONE_PARTY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '입법원',
    headOfStateTitle: '국민정부 주석',
    headOfStateHasPower: true,
    headOfGovernmentTitle: '행정원장',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'ONE_PARTY',
    notes:
      '북벌 완수 후 1931년 중화민국 훈정시기약법으로 제도화된 중국국민당 일당 훈정(訓政) 및 5원(행정·입법·사법·고시·감찰) 체제.',
  },
  {
    name: '중화민국 1947년 헌법 · 증수조문 체제',
    countryName: '대만',
    historicalCountryName: '중화민국',
    startEra: 'AD',
    startYear: 1947,
    startMonth: 12,
    startDay: 25,
    isCurrent: true,
    governmentForm: 'SEMI_PRESIDENTIAL',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '입법원',
    lowerHouseSeats: 113,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentTitle: '행정원장',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1946년 제헌국민대회가 제정하고 1947년 12월 25일 시행된 중화민국 헌법 체제. 1948~1991년 동원감란시기 임시조관을 거쳐 1991년 이후 7차례 헌법증수조문 개정으로 총통 직선제와 단원제 입법원 중심의 이원집정부제를 확립하였다.',
  },
  {
    name: '중화인민공화국 인민민주전정 · 전국인민대표대회 체제',
    countryName: '중국',
    historicalCountryName: '중화인민공화국',
    startEra: 'AD',
    startYear: 1949,
    startMonth: 10,
    startDay: 1,
    isCurrent: true,
    governmentForm: 'ONE_PARTY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '전국인민대표대회',
    lowerHouseSeats: 2977,
    headOfStatePositionTitle: '국가주석',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리(국무원)',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'ONE_PARTY',
    notes:
      '1949년 중국인민정치협상회의 공동강령(임시헌법)으로 출범하여 1954년 제1차 헌법과 현행 1982년 헌법으로 확립된 중국공산당 영도하 사회주의 일당 국가 체제.',
  },

  // ── 이탈리아 (IT) — 사르데냐 왕국 · 이탈리아 왕국 · 파시스트 · 공화국 ────
  {
    name: '사르데냐 왕국 알베르토 헌장 입헌군주제 체제',
    countryName: '이탈리아',
    historicalCountryName: '사르데냐 왕국',
    startEra: 'AD',
    startYear: 1848,
    startMonth: 3,
    startDay: 4,
    endEra: 'AD',
    endYear: 1861,
    endMonth: 3,
    endDay: 17,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '대의원(하원)',
    lowerHouseSeats: 204,
    upperHouseName: '원로원(상원)',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1848년 3월 4일 카를로 알베르토 국왕이 공포한 알베르토 헌장(Statuto Albertino) 체제. 카보우르 내각을 통해 의회 책임정치와 이탈리아 통일을 달성하였다.',
  },
  {
    name: '이탈리아 왕국 알베르토 헌장 입헌군주제 체제',
    countryName: '이탈리아',
    historicalCountryName: '이탈리아 왕국',
    startEra: 'AD',
    startYear: 1861,
    startMonth: 3,
    startDay: 17,
    endEra: 'AD',
    endYear: 1922,
    endMonth: 10,
    endDay: 30,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '대의원(Camera dei Deputati)',
    lowerHouseSeats: 508,
    upperHouseName: '원로원(Senato del Regno)',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1861년 통일 이탈리아 왕국 수립과 함께 사르데냐 왕국의 알베르토 헌장을 그대로 전국 헌법으로 확장 적용한 입헌군주제·의원내각제 체제.',
  },
  {
    name: '파시스트 이탈리아 일당독재 체제',
    countryName: '이탈리아',
    historicalCountryName: '파시스트 이탈리아',
    startEra: 'AD',
    startYear: 1922,
    startMonth: 10,
    startDay: 31,
    endEra: 'AD',
    endYear: 1943,
    endMonth: 7,
    endDay: 25,
    isCurrent: false,
    governmentForm: 'ONE_PARTY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '파시 및 조합원',
    upperHouseName: '원로원',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'ONE_PARTY',
    notes:
      '1922년 로마 진군 이후 1925년 정부수반 권한법·1928년 파시즘 대평의회 헌법기관화·1939년 하원 폐지(파시 및 조합원 대체)로 알베르토 헌장을 형해화한 무솔리니 파시스트 독재 체제.',
  },
  {
    name: '이탈리아 공화국 1948년 헌법 체제',
    countryName: '이탈리아',
    startEra: 'AD',
    startYear: 1948,
    startMonth: 1,
    startDay: 1,
    isCurrent: true,
    governmentForm: 'PARLIAMENTARY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '하원(Camera dei Deputati)',
    lowerHouseSeats: 400,
    upperHouseName: '상원(Senato della Repubblica)',
    upperHouseSeats: 200,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1946년 6월 왕정 폐지 국민투표 및 제헌의회 선출을 거쳐 1948년 1월 1일 발효된 현행 이탈리아 공화국 헌법 체제. 하원과 상원이 동등한 권한을 갖는 완전 양원제 의원내각제이다.',
  },

  // ── 오스트리아(AT) · 헝가리(HU) · 세르비아(RS) · 루마니아(RO) · 스페인(ES) · 폴란드(PL) · 벨기에(BE) · 네덜란드(NL) ──
  {
    name: '오스트리아-헝가리 1867년 대타협 · 12월 헌법 이중제국 체제',
    countryName: '오스트리아',
    historicalCountryName: '오스트리아-헝가리 제국',
    startEra: 'AD',
    startYear: 1867,
    startMonth: 12,
    startDay: 21,
    endEra: 'AD',
    endYear: 1918,
    endMonth: 11,
    endDay: 12,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '제국의회 하원(Abgeordnetenhaus)',
    lowerHouseSeats: 516,
    upperHouseName: '제국의회 귀족원(Herrenhaus)',
    headOfStatePositionTitle: '황제',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'CONFEDERATION',
    partySystem: 'MULTI_PARTY',
    notes:
      '1867년 오스트리아-헝가리 대타협(Ausgleich)과 12월 헌법(5대 국가기본법)으로 성립된 이중군주제. 합스부르크 군주가 오스트리아 황제와 헝가리 사도왕을 겸임하며 외교·전쟁·공동재정 3개 공동부처만 공유하였다.',
  },
  {
    name: '오스트리아 연방헌법(B-VG) 체제',
    countryName: '오스트리아',
    startEra: 'AD',
    startYear: 1920,
    startMonth: 10,
    startDay: 1,
    isCurrent: true,
    governmentForm: 'PARLIAMENTARY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '국민의회(Nationalrat)',
    lowerHouseSeats: 183,
    upperHouseName: '연방평의회(Bundesrat)',
    upperHouseSeats: 61,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '연방총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'FEDERAL',
    partySystem: 'MULTI_PARTY',
    notes:
      '한스 켈젠이 기초한 1920년 오스트리아 연방헌법(B-VG) 체제. 세계 최초의 독립 헌법재판소 제도를 도입했으며 1945년 제2공화국 출범 시 복원되어 현재까지 유지되고 있다.',
  },
  {
    name: '헝가리 왕국 1867년 대타협 · 입헌군주제 체제',
    countryName: '헝가리',
    historicalCountryName: '헝가리 왕국',
    startEra: 'AD',
    startYear: 1867,
    startMonth: 5,
    startDay: 29,
    endEra: 'AD',
    endYear: 1918,
    endMonth: 11,
    endDay: 16,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '중의원(Képviselőház)',
    lowerHouseSeats: 453,
    upperHouseName: '귀족원(Főrendiház)',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1848년 4월법과 1867년 법률 제12호(대타협법)에 기초한 성 이슈트반 왕관령 입헌군주제 체제. 독자적인 헝가리 의회와 책임내각(안드라시·티사 내각 등)을 운영하였다.',
  },
  {
    name: '헝가리 제3공화국 · 2011년 기본법 체제',
    countryName: '헝가리',
    historicalCountryName: '헝가리 제3공화국',
    startEra: 'AD',
    startYear: 1989,
    startMonth: 10,
    startDay: 23,
    isCurrent: true,
    governmentForm: 'PARLIAMENTARY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '국민의회(Országgyűlés)',
    lowerHouseSeats: 199,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1989년 민주화 개헌과 2011년 제정(2012년 발효)된 헝가리 기본법(Alaptörvény)에 기초한 단원제 의원내각제 공화국.',
  },
  {
    name: '세르비아 왕국 1888 · 1903년 헌법 입헌군주제 체제',
    countryName: '세르비아',
    historicalCountryName: '세르비아 왕국 (근대)',
    startEra: 'AD',
    startYear: 1882,
    startMonth: 3,
    startDay: 6,
    endEra: 'AD',
    endYear: 1918,
    endMonth: 12,
    endDay: 1,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '국민의회(Narodna skupština)',
    lowerHouseSeats: 166,
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1888년 급진 헌법과 1903년 5월 정변 후 복원된 1903년 헌법에 따른 의원내각제적 입헌군주제 체제. 니콜라 파시치의 인민급진당 내각이 발칸 전쟁과 제1차 세계대전기 국정을 이끌었다.',
  },
  {
    name: '세르비아-크로아티아-슬로베니아 왕국 비도브단 헌법 체제',
    historicalCountryName: '세르비아-크로아티아-슬로베니아 왕국',
    startEra: 'AD',
    startYear: 1918,
    startMonth: 12,
    startDay: 1,
    endEra: 'AD',
    endYear: 1929,
    endMonth: 1,
    endDay: 6,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '국민의회(Narodna skupština)',
    lowerHouseSeats: 315,
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1921년 6월 28일 제헌의회에서 가결된 비도브단(성 비투스 축일) 헌법 체제. 단일국가·입헌군주제를 규정했으나 민족 갈등 끝에 1929년 1월 6일 알렉산다르 1세의 왕당 독재 선포로 정지되었다.',
  },
  {
    name: '루마니아 왕국 1866 · 1923년 입헌군주제 및 전시 독재 체제',
    countryName: '루마니아',
    historicalCountryName: '루마니아 왕국',
    startEra: 'AD',
    startYear: 1881,
    startMonth: 3,
    startDay: 15,
    endEra: 'AD',
    endYear: 1947,
    endMonth: 12,
    endDay: 30,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '대의원',
    lowerHouseSeats: 387,
    upperHouseName: '원로원',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1866년 헌법과 1923년 대루마니아 헌법의 입헌군주제에서 출발하여, 1938년 카롤 2세 친정 헌법과 1940~1944년 얀 안토네스쿠 내각의 전시 군사독재 시기를 거쳤다.',
  },
  {
    name: '스페인 1876년 왕정복고 입헌군주제 체제',
    countryName: '스페인',
    historicalCountryName: '스페인 왕국 (왕정복고)',
    startEra: 'AD',
    startYear: 1874,
    startMonth: 12,
    startDay: 29,
    endEra: 'AD',
    endYear: 1931,
    endMonth: 4,
    endDay: 14,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '하원(Congreso)',
    upperHouseName: '상원(Senado)',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'TWO_PARTY',
    notes:
      '1876년 스페인 헌법에 기초한 부르봉 왕정복고 체제. 보수당과 자유당이 평화적으로 정권을 교대하는 투르노(Turno) 양당 체제를 운영하였다.',
  },
  {
    name: '스페인 제2공화국 1931년 헌법 체제',
    countryName: '스페인',
    historicalCountryName: '스페인 제2공화국',
    startEra: 'AD',
    startYear: 1931,
    startMonth: 4,
    startDay: 14,
    endEra: 'AD',
    endYear: 1939,
    endMonth: 4,
    endDay: 1,
    isCurrent: false,
    governmentForm: 'PARLIAMENTARY',
    legislatureType: 'UNICAMERAL',
    lowerHouseName: '코르테스(의회)',
    lowerHouseSeats: 473,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1931년 제헌 코르테스가 제정한 스페인 제2공화국 헌법 체제. 정교분리·여성 참정권·자치주 자치권을 도입한 단원제 민주공화국이었으나 스페인 내전 패배로 붕괴하였다.',
  },
  {
    name: '스페인 1978년 민주 헌법 체제',
    countryName: '스페인',
    historicalCountryName: '스페인 왕국',
    startEra: 'AD',
    startYear: 1975,
    startMonth: 11,
    startDay: 22,
    isCurrent: true,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '하원(Congreso de los Diputados)',
    lowerHouseSeats: 350,
    upperHouseName: '상원(Senado)',
    upperHouseSeats: 266,
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '프랑코 사후 민주화 이행(Transición)과 1978년 헌법 제정으로 확립된 현행 의회군주제 및 자치주(Comunidades Autónomas) 고도 분권 체제.',
  },
  {
    name: '벨기에 왕국 1831년 헌법 체제',
    countryName: '벨기에',
    historicalCountryName: '벨기에 왕국',
    startEra: 'AD',
    startYear: 1831,
    startMonth: 2,
    startDay: 7,
    isCurrent: true,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '하원(상원·하원 양원)',
    lowerHouseSeats: 150,
    upperHouseName: '상원(Senaat/Sénat)',
    upperHouseSeats: 60,
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'FEDERAL',
    partySystem: 'MULTI_PARTY',
    notes:
      '1831년 제정되어 국민주권에 입각한 유럽 대륙 의회군주제의 전형이 된 벨기에 헌법 체제. 1970~1993년 단계적 개헌을 통해 언어·지역 공동체 기반 연방국가로 전환되었다.',
  },
  {
    name: '네덜란드 왕국 1815 · 1848년 헌법 체제',
    countryName: '네덜란드',
    historicalCountryName: '네덜란드 왕국',
    startEra: 'AD',
    startYear: 1815,
    startMonth: 8,
    startDay: 24,
    isCurrent: true,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '제2원(하원, Tweede Kamer)',
    lowerHouseSeats: 150,
    upperHouseName: '제1원(상원, Eerste Kamer)',
    upperHouseSeats: 75,
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: false,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1815년 네덜란드 왕국 기본법으로 출범하고 1848년 토르베커(Thorbecke) 개헌으로 국왕 불가침과 내각의 의회 책임을 확립한 입헌군주제·의원내각제 체제.',
  },
  {
    name: '폴란드-리투아니아 귀족공화정 · 1791년 5월 3일 헌법 체제',
    countryName: '폴란드',
    historicalCountryName: '폴란드-리투아니아 연방',
    startEra: 'AD',
    startYear: 1569,
    startMonth: 7,
    startDay: 1,
    endEra: 'AD',
    endYear: 1795,
    endMonth: 10,
    endDay: 24,
    isCurrent: false,
    governmentForm: 'CONSTITUTIONAL_MONARCHY',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '세임(하원)',
    upperHouseName: '원로원(상원)',
    headOfStatePositionTitle: '국왕',
    headOfStateHasPower: false,
    stateStructure: 'CONFEDERATION',
    partySystem: 'NON_PARTISAN',
    notes:
      '1569년 루블린 연합과 1573년 헨리크 조항으로 선거왕정·귀족 민주정을 운영하였으며, 1791년 5월 3일 유럽 최초·세계 두 번째 근대 성문헌법을 제정하였다.',
  },
  {
    name: '폴란드 제2공화국 1921년 3월 헌법 · 1935년 4월 헌법 체제',
    countryName: '폴란드',
    historicalCountryName: '폴란드 제2공화국',
    startEra: 'AD',
    startYear: 1918,
    startMonth: 11,
    startDay: 11,
    endEra: 'AD',
    endYear: 1939,
    endMonth: 9,
    endDay: 30,
    isCurrent: false,
    governmentForm: 'SEMI_PRESIDENTIAL',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '세임(Sejm)',
    lowerHouseSeats: 444,
    upperHouseName: '상원(Senat)',
    upperHouseSeats: 111,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1921년 3월 헌법(의원내각제)으로 출범한 뒤 1926년 피우수트스키 5월 쿠데타와 1935년 4월 헌법 개정을 통해 대통령 권한을 강화한 체제.',
  },
  {
    name: '폴란드 제3공화국 1997년 헌법 체제',
    countryName: '폴란드',
    historicalCountryName: '폴란드 제3공화국',
    startEra: 'AD',
    startYear: 1989,
    startMonth: 12,
    startDay: 29,
    isCurrent: true,
    governmentForm: 'SEMI_PRESIDENTIAL',
    legislatureType: 'BICAMERAL',
    lowerHouseName: '세임(Sejm)',
    lowerHouseSeats: 460,
    upperHouseName: '상원(Senat)',
    upperHouseSeats: 100,
    headOfStatePositionTitle: '대통령',
    headOfStateHasPower: true,
    headOfGovernmentPositionTitle: '총리',
    headOfGovernmentHasPower: true,
    stateStructure: 'UNITARY',
    partySystem: 'MULTI_PARTY',
    notes:
      '1989년 원탁회의 개헌과 1997년 현행 폴란드 공화국 헌법으로 확립된 이원집정부제·양원제 민주공화국 체제.',
  },
]

interface LawSeedEntry {
  name: string
  lawTypeName: string
  countryName?: string
  historicalCountryName?: string
  startDate?: string
  endDate?: string
  articleNumber?: number
  paragraphNumber?: number
  summary: string
  note?: string
  /** 기존 Event.title 과 연결할 제목 목록 (EventContextLink 생성) */
  linkedEventTitles?: string[]
}

const LAWS: LawSeedEntry[] = [
  // ── 한국 (KR) ──────────────────────────────────────────────────────────
  {
    name: '경국대전 (經國大典)',
    lawTypeName: '율령·법전',
    countryName: '대한민국',
    historicalCountryName: '조선',
    startDate: '1485-01-01',
    endDate: '1894-07-27',
    summary:
      '세조 때 편찬을 시작해 성종 16년(1485년) 반포·시행된 조선 왕조의 최고 통치 기본 법전. 이·호·예·병·형·공 6전 체제로 의정부·6조 관제와 통치 규범을 집대성하였다.',
  },
  {
    name: '홍범 14조 (洪範十四條)',
    lawTypeName: '기본법·헌장',
    countryName: '대한민국',
    historicalCountryName: '조선',
    startDate: '1895-01-07',
    endDate: '1899-08-17',
    articleNumber: 1,
    summary:
      '고종이 종묘에 고한 한국 최초의 근대적 국정 기본강령(근대 헌법의 효시). 청나라에 대한 사대관계 청산, 왕실 사무(궁내부)와 국정 사무(내각)의 분리, 재정 일원화와 법률에 의한 인민 재산·생명 보호를 천명하였다.',
  },
  {
    name: '대한국 국제 (大韓國國制)',
    lawTypeName: '헌법',
    countryName: '대한민국',
    historicalCountryName: '대한제국',
    startDate: '1899-08-17',
    endDate: '1910-08-29',
    articleNumber: 1,
    summary:
      '1899년(광무 3년) 고종 황제가 반포한 대한제국의 흠정 헌법(전 9조). 제1조에서 대한국은 세계 만국이 공인한 자주독립 제국임을 선언하고, 황제의 무한 군주권·통수권·입법·사법·외교 대권을 명문화하였다.',
  },
  {
    name: '대한민국 임시헌장 (大韓民國臨時憲章)',
    lawTypeName: '헌법',
    countryName: '대한민국',
    startDate: '1919-04-11',
    endDate: '1948-07-17',
    articleNumber: 1,
    summary:
      '1919년 4월 11일 상하이 임시의정원이 제정·선포한 대한민국 최초의 민주공화국 헌법(전 10조). 제1조 「대한민국은 민주공화제로 함」을 최초로 천명하고 삼권분립·국민 평등·기본권을 규정하여 1948년 제헌헌법의 직접적 모태가 되었다.',
  },
  {
    name: '대한민국 제헌헌법 (1948년 헌법)',
    lawTypeName: '헌법',
    countryName: '대한민국',
    startDate: '1948-07-17',
    endDate: '1960-06-15',
    articleNumber: 1,
    summary:
      '1948년 5·10 총선거로 구성된 제헌국회가 7월 12일 의결하고 7월 17일 공포한 대한민국 최초의 현대 성문헌법(전 10장 103조). 3·1 운동과 대한민국 임시정부 법통 계승, 민주공화국·국민주권 원칙, 단원제 국회와 대통령 중심제(국무총리·국무원 병존)를 규정하였다.',
  },
  {
    name: '대한민국 제3차 개헌 헌법 (1960년 제2공화국 내각책임제 헌법)',
    lawTypeName: '헌법',
    countryName: '대한민국',
    startDate: '1960-06-15',
    endDate: '1962-12-26',
    summary:
      '4·19 혁명 직후 1960년 6월 15일 개정된 제2공화국 헌법. 국무총리와 국무원이 민의원에 연대책임을 지는 순수 의원내각제, 민의원·참의원 양원제, 헌법재판소 설치, 대법원장·대법관 선거제 및 기본권 본질적 내용 침해 금지를 도입하였다.',
  },
  {
    name: '대한민국 제5차 개헌 헌법 (1962년 제3공화국 헌법)',
    lawTypeName: '헌법',
    countryName: '대한민국',
    startDate: '1962-12-26',
    endDate: '1972-12-27',
    summary:
      '1962년 12월 17일 헌정사상 최초의 국민투표로 확정된 제3공화국 전면개정 헌법. 인간으로서의 존엄과 가치 조항 신설, 대통령 직선제(4년 1차 중임)와 단원제 국회 복귀, 대법원의 위헌법률심사권을 규정하였다.',
  },
  {
    name: '대한민국 제7차 개헌 헌법 (1972년 유신헌법)',
    lawTypeName: '헌법',
    countryName: '대한민국',
    startDate: '1972-12-27',
    endDate: '1980-10-27',
    articleNumber: 53,
    summary:
      '1972년 10월 유신으로 비상국무회의가 의결하고 국민투표로 공포된 제4공화국 헌법. 통일주체국민회의에 의한 대통령 간선제(6년 임기, 연임 제한 폐지), 대통령의 긴급조치권(제53조)·국회해산권 및 국회의원 1/3 추천권을 규정하였다.',
  },
  {
    name: '대한민국 제8차 개헌 헌법 (1980년 제5공화국 헌법)',
    lawTypeName: '헌법',
    countryName: '대한민국',
    startDate: '1980-10-27',
    endDate: '1988-02-24',
    summary:
      '1980년 10월 27일 공포된 제5공화국 전면개정 헌법. 유신헌법의 통일주체국민회의와 긴급조치권을 폐지하고 대통령 선거인단에 의한 7년 단임 간선제 및 행복추구권·환경권·무죄추정 원칙을 명문화하였다.',
  },
  {
    name: '대한민국 현행 헌법 (1987년 제9차 개헌 · 제6공화국 헌법)',
    lawTypeName: '헌법',
    countryName: '대한민국',
    startDate: '1987-10-29',
    articleNumber: 1,
    paragraphNumber: 2,
    summary:
      '1987년 6월 민주항쟁 이후 여야 합의와 국민투표(찬성 93.1%)를 거쳐 1987년 10월 29일 공포·1988년 2월 25일 시행된 대한민국 현행 헌법(전 10장 130조). 5년 단임 대통령 직선제, 대통령 국회해산권 폐지, 국정감사권 부활, 헌법재판소 및 헌법소원 제도를 확립하였다.',
  },

  // ── 일본 (JP) ──────────────────────────────────────────────────────────
  {
    name: '무가제법도 (武家諸法度)',
    lawTypeName: '율령·법전',
    countryName: '일본',
    historicalCountryName: '도쿠가와 막부',
    startDate: '1615-08-30',
    endDate: '1867-11-09',
    summary:
      '1615년(겐나 원년) 도쿠가와 이에야스·히데타다가 전국 다이묘를 통제하기 위해 반포한 에도 막부의 최고 기본법. 1635년 3대 쇼군 이에미쓰 개정판에서 참근교대제를 제도화하여 260년 막번 체제의 헌정 근간이 되었다.',
  },
  {
    name: '5개조 어서문 및 정체서 (五箇条の御誓文 · 政体書)',
    lawTypeName: '기본법·헌장',
    countryName: '일본',
    historicalCountryName: '일본 제국',
    startDate: '1868-04-06',
    endDate: '1889-02-11',
    articleNumber: 1,
    summary:
      '1868년 메이지 천황이 반포한 유신 신정부의 국시(5개조 어서문)와 이를 구체화한 최초의 성문 통치조직 규범(정체서). 널리 회의를 일으켜 만기(萬機)를 공론으로 결정한다는 원칙과 태정관 관제를 규정하였다.',
  },
  {
    name: '내각직권 및 태정관 달 제69호 (内閣職権 · 内閣制度創始)',
    lawTypeName: '칙령·명령',
    countryName: '일본',
    historicalCountryName: '일본 제국',
    startDate: '1885-12-22',
    endDate: '1889-12-24',
    articleNumber: 1,
    summary:
      '1885년 12월 22일 고대 율령제 이래의 태정관제(태정대신·좌우대신·참의)를 폐지하고 내각총리대신과 각 성 대신으로 구성되는 근대 유럽식 내각제도를 창설한 헌정 개혁 법령.',
    linkedEventTitles: ['태정관제 폐지 및 내각제도 창설'],
  },
  {
    name: '대일본제국 헌법 (메이지 헌법, 大日本帝国憲法)',
    lawTypeName: '헌법',
    countryName: '일본',
    historicalCountryName: '일본 제국',
    startDate: '1889-02-11',
    endDate: '1947-05-02',
    articleNumber: 1,
    summary:
      '이토 히로부미 등이 프로이센 헌법을 모델로 기초하여 1889년 2월 11일 공포·1890년 11월 29일 시행된 일본 제국의 흠정헌법(전 7장 76조). 천황의 통치권 총람(제4조), 군 통수권 독립(제11조), 제국의회(중의원·귀족원)의 입법·예산 협찬권을 규정하였다.',
  },
  {
    name: '일본국 헌법 (日本国憲法 · 평화헌법)',
    lawTypeName: '헌법',
    countryName: '일본',
    historicalCountryName: '일본국',
    startDate: '1947-05-03',
    articleNumber: 9,
    paragraphNumber: 1,
    summary:
      '1946년 11월 3일 공포·1947년 5월 3일 시행된 현행 일본국 헌법(전 11장 103조). 메이지 헌법을 전면 개정하여 국민주권·상징천황제(제1조), 전쟁 및 전력 보유 포기(제9조 평화주의), 기본적 인권 존중과 의원내각제를 확립하였다.',
    linkedEventTitles: ['일본국 헌법 공포', '일본국 헌법 시행'],
  },

  // ── 독일 (DE) ──────────────────────────────────────────────────────────
  {
    name: '1850년 프로이센 왕국 헌법 (Preußische Verfassungsurkunde)',
    lawTypeName: '헌법',
    countryName: '독일',
    historicalCountryName: '프로이센 왕국',
    startDate: '1850-01-31',
    endDate: '1918-11-09',
    summary:
      '1848년 혁명 이후 프리드리히 빌헬름 4세가 제정·개정한 프로이센 왕국의 입헌군주제 흠정헌법. 양원제 의회와 기본권을 도입하면서도 군주 대권과 3급 선거제를 유지하여 이후 독일 제국 및 일본 메이지 헌법에 큰 영향을 미쳤다.',
  },
  {
    name: '독일 제국 헌법 (1871년 비스마르크 헌법)',
    lawTypeName: '헌법',
    countryName: '독일',
    historicalCountryName: '독일 제국',
    startDate: '1871-04-16',
    endDate: '1919-08-11',
    articleNumber: 11,
    summary:
      '독일 통일 직후 오토 폰 비스마르크가 기초해 1871년 4월 16일 제정된 독일 제국의 연방헌법. 프로이센 국왕의 독일 황제직 겸임, 황제에게만 책임지는 제국총리, 보통선거 제국의회(Reichstag)와 연방참의원(Bundesrat)의 이원적 연방 구조를 규정하였다.',
  },
  {
    name: '바이마르 공화국 헌법 (독일국 헌법, Weimarer Reichsverfassung)',
    lawTypeName: '헌법',
    countryName: '독일',
    historicalCountryName: '바이마르 공화국',
    startDate: '1919-08-11',
    endDate: '1945-05-08',
    articleNumber: 48,
    summary:
      '후고 프로이스가 기초하고 바이마르 제헌국민의회가 채택하여 1919년 8월 11일 공포된 현대적 민주헌법. 세계 최초로 사회적 기본권과 경제민주주의를 체계화했으나, 제48조 대통령 국가긴급권 조항이 훗날 의회민주주의 형해화의 통로로 악용되었다.',
    linkedEventTitles: [
      '독일 바이마르 제헌국민의회 개헌',
      '독일 바이마르 헌법 공포 및 바이마르 공화국 출범',
    ],
  },
  {
    name: '전권위임법 (수권법, Ermächtigungsgesetz 1933)',
    lawTypeName: '법률',
    countryName: '독일',
    historicalCountryName: '나치 독일 (제3제국)',
    startDate: '1933-03-24',
    endDate: '1945-05-08',
    articleNumber: 1,
    summary:
      '정식 명칭 「국민과 국가의 고난을 제거하기 위한 법률」. 히틀러 내각이 국가의회와 국가참의원의 동의 없이 법률(헌법 개정적 법률 포함)을 제정할 수 있도록 위임함으로써 바이마르 헌법의 권력분립을 파괴하고 나치 독재의 법적 기반이 된 수권법.',
  },
  {
    name: '독일 연방 공화국 기본법 (Grundgesetz, 1949)',
    lawTypeName: '기본법·헌장',
    countryName: '독일',
    startDate: '1949-05-23',
    articleNumber: 1,
    paragraphNumber: 1,
    summary:
      '1949년 5월 23일 본(Bonn) 의회평의회가 제정한 서독 및 통일 독일의 현행 헌법. 제1조 제1항 「인간의 존엄성은 불가침이다」와 영구불변조항(제79조 제3항), 건설적 불신임제(제67조), 정당 해산 제도 등 방어적 민주주의와 연방 법치국가 원리를 천명하였다.',
  },

  // ── 프랑스 (FR) ────────────────────────────────────────────────────────
  {
    name: '인간과 시민의 권리 선언 (1789년 프랑스 인권선언)',
    lawTypeName: '기본법·헌장',
    countryName: '프랑스',
    historicalCountryName: '프랑스 왕국',
    startDate: '1789-08-26',
    articleNumber: 1,
    summary:
      '1789년 8월 26일 프랑스 제헌국민의회가 채택한 근대 입헌주의의 핵심 헌장(전 17조). 인간의 자유·평등, 국민주권, 권력분립(제16조), 소유권 불가침을 선언하였으며 오늘날까지 프랑스 현행 헌법 전문을 통해 헌법적 효력을 갖는다.',
    linkedEventTitles: ['제헌국민의회 발족', '봉건제 폐지 선언'],
  },
  {
    name: '1791년 프랑스 헌법 (프랑스 최초의 성문헌법)',
    lawTypeName: '헌법',
    countryName: '프랑스',
    historicalCountryName: '프랑스 왕국',
    startDate: '1791-09-03',
    endDate: '1792-09-21',
    summary:
      '제헌국민의회가 제정하고 루이 16세가 선서한 프랑스 최초의 성문 입헌군주제 헌법. 1789년 인권선언을 전문으로 삼고 국민주권, 단원제 입법의회, 능동적 시민의 제한선거 및 국왕의 정지적 거부권을 규정하였다.',
    linkedEventTitles: ['1791년 프랑스 헌법 반포'],
  },
  {
    name: '1793년 프랑스 헌법 (공화력 1년 자코뱅 헌법)',
    lawTypeName: '헌법',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제1공화국',
    startDate: '1793-06-24',
    endDate: '1795-08-22',
    summary:
      '국민공회 산악파(자코뱅)가 기초하고 국민투표로 채택된 급진 민주공화제 헌법. 남성 보통선거권, 인민주권, 생존권·교육권·저항권을 최초로 명문화했으나 혁명전쟁 비상사태로 시행이 유보되었다.',
    linkedEventTitles: ['1793년 헌법(자코뱅 헌법) 채택'],
  },
  {
    name: '1814년 헌장 (Charte constitutionnelle de 1814)',
    lawTypeName: '기본법·헌장',
    countryName: '프랑스',
    historicalCountryName: '부르봉 복고 왕정',
    startDate: '1814-06-04',
    endDate: '1830-08-14',
    summary:
      '나폴레옹 몰락 후 복위한 루이 18세가 반포한 입헌군주제 흠정헌장. 대혁명의 법 앞의 평등과 나폴레옹 법전을 인정하면서 귀족원·대의원 양원제와 국왕 대권을 조화시켰으며, 1830년 7월 왕정 개정 헌장의 모태가 되었다.',
  },
  {
    name: '1848년 프랑스 제2공화국 헌법',
    lawTypeName: '헌법',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제2공화국',
    startDate: '1848-11-04',
    endDate: '1852-01-14',
    summary:
      '1848년 2월 혁명 후 제헌국민의회가 제정한 제2공화국 헌법. 남성 보통선거에 의해 직선되는 4년 단임 대통령과 750석 단원제 국민의회의 엄격한 권력분립을 규정하였다.',
  },
  {
    name: '1875년 프랑스 제3공화국 헌법적 법률 (Lois constitutionnelles de 1875)',
    lawTypeName: '헌법',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제3공화국',
    startDate: '1875-02-24',
    endDate: '1940-07-10',
    summary:
      '상원 조직법·공공권력 조직법·공공권력 관계법 등 3개 헌법적 법률로 구성된 제3공화국 헌법. 왕당파와 공화파의 타협으로 탄생하여 프랑스 헌정사상 가장 오랫동안(65년) 지속된 양원제 의원내각제 헌법이다.',
  },
  {
    name: '1946년 프랑스 제4공화국 헌법',
    lawTypeName: '헌법',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제4공화국',
    startDate: '1946-10-27',
    endDate: '1958-10-04',
    summary:
      '제2차 세계대전 해방 후 제2차 제헌의회가 기초하고 국민투표로 확정된 제4공화국 헌법. 여성 참정권과 사회적·경제적 권리를 전문에 명시하고 하원(국민의회) 우위의 의원내각제를 규정하였다.',
  },
  {
    name: '1958년 프랑스 제5공화국 현행 헌법',
    lawTypeName: '헌법',
    countryName: '프랑스',
    historicalCountryName: '프랑스 제5공화국',
    startDate: '1958-10-04',
    articleNumber: 5,
    summary:
      '샤를 드골과 미셸 드브레가 주도해 1958년 9월 국민투표(찬성 79.2%)를 거쳐 10월 4일 공포된 프랑스 현행 헌법. 국가원수인 대통령의 중재권·의회해산권·비상대권과 의회에 책임지는 총리·내각을 결합한 이원집정부제 헌법이다.',
  },

  // ── 미국 (US) & 영국 (GB) ──────────────────────────────────────────────
  {
    name: '연합규약 (Articles of Confederation and Perpetual Union)',
    lawTypeName: '기본법·헌장',
    countryName: '미국',
    startDate: '1781-03-01',
    endDate: '1789-03-04',
    summary:
      '독립 전쟁 중 제2차 대륙회의가 채택하고 13개 주 비준으로 1781년 발효된 미국의 첫 헌법적 규약. 각 주의 주권을 유지한 느슨한 국가연합을 규정하였다.',
  },
  {
    name: '미합중국 헌법 (United States Constitution, 1787 제정 · 1789 발효)',
    lawTypeName: '헌법',
    countryName: '미국',
    startDate: '1789-03-04',
    articleNumber: 1,
    summary:
      '1787년 필라델피아 제헌회의에서 제정되고 1789년 발효된 현존 최고(最古)의 근대 성문 연방헌법. 입법(제1조)·행정(제2조)·사법(제3조)의 삼권분립과 연방주의, 그리고 1791년 권리장전(수정헌법 제1~10조)을 비롯한 27개 수정조항으로 구성된다.',
  },
  {
    name: '1689년 영국 권리장전 (Bill of Rights 1689)',
    lawTypeName: '기본법·헌장',
    countryName: '영국',
    historicalCountryName: '잉글랜드 왕국',
    startDate: '1689-12-16',
    summary:
      '명예혁명 직후 영국 의회가 제정하고 공동왕 윌리엄 3세와 메리 2세가 승인한 영국 불문헌법의 핵심 기본법. 의회 동의 없는 법률 정지·과세·상비군 유지를 금지하고 의회 자유선거와 언론 자유를 보장하였다.',
  },
  {
    name: '1707년 연합법 (Acts of Union 1707)',
    lawTypeName: '법률',
    countryName: '영국',
    historicalCountryName: '그레이트브리튼 왕국',
    startDate: '1707-05-01',
    summary:
      '잉글랜드 왕국과 스코틀랜드 왕국을 단일 주권국가인 그레이트브리튼 왕국과 단일 의회(웨스트민스터 의회)로 통합한 헌법적 법률.',
  },
  {
    name: '1911년 의회법 (Parliament Act 1911)',
    lawTypeName: '법률',
    countryName: '영국',
    historicalCountryName: '그레이트브리튼 및 아일랜드 연합왕국',
    startDate: '1911-08-18',
    summary:
      '비선출 상원(귀족원)의 재정법안 거부권을 폐지하고 일반 법안에 대한 절대적 거부권을 2년 정지적 거부권으로 축소하여 선출 하원(서민원)의 입법 우위를 확정한 헌법적 법률.',
  },

  // ── 러시아 (RU) · 중국(CN)/대만(TW) · 이탈리아(IT) · 오스트리아(AT) · 폴란드(PL) · 스페인(ES) ──
  {
    name: '소보르노예 울로제니예 (1649년 러시아 차르국 대법전)',
    lawTypeName: '율령·법전',
    countryName: '러시아',
    historicalCountryName: '러시아 차르국',
    startDate: '1649-01-29',
    endDate: '1832-12-31',
    summary:
      '알렉세이 미하일로비치 차르 시기 젬스키 소보르(전국신분의회)가 제정한 러시아 최초의 인쇄 종합 성문법전(전 25장 967조). 차르 주권 보호와 농노제 법제화를 규정하여 1832년 제국 법전 편찬 전까지 약 200년간 기본법으로 기능하였다.',
  },
  {
    name: '1906년 러시아 제국 국가기본법 (Основные государственные законы)',
    lawTypeName: '기본법·헌장',
    countryName: '러시아',
    historicalCountryName: '러시아 제국',
    startDate: '1906-04-23',
    endDate: '1917-03-15',
    articleNumber: 87,
    summary:
      '1905년 10월 선언에 따라 제1차 국가두마 개원 직전 니콜라이 2세가 반포한 러시아 제국 최초의 헌법적 기본법. 국가두마와 국가평의회의 입법 참여를 규정하면서도 황제의 전제권과 비회기 긴급칙령권(제87조)을 유보하였다.',
  },
  {
    name: '1936년 소비에트 사회주의 공화국 연방 헌법 (스탈린 헌법)',
    lawTypeName: '헌법',
    countryName: '러시아',
    historicalCountryName: '소비에트 사회주의 공화국 연방',
    startDate: '1936-12-05',
    endDate: '1977-10-07',
    articleNumber: 126,
    summary:
      '1936년 제8차 임시 전연방 소비에트 대회에서 채택된 소련의 두 번째 연방헌법. 연방소비에트·민족소비에트 양원제 최고소비에트와 보통·평등·직접·비밀선거를 규정하는 한편 제126조에 공산당의 전위적 영도 지위를 최초로 명문화하였다.',
  },
  {
    name: '1993년 러시아 연방 헌법',
    lawTypeName: '헌법',
    countryName: '러시아',
    startDate: '1993-12-25',
    summary:
      '1993년 12월 12일 국민투표로 채택되어 12월 25일 발효된 현행 러시아 연방 헌법. 소비에트 체제를 종식하고 강력한 대통령 권한과 연방의회(국가두마·연방평의회) 양원제를 규정하였다.',
  },
  {
    name: '흠정헌법대강 (欽定憲法大綱, 1908)',
    lawTypeName: '기본법·헌장',
    countryName: '중국',
    historicalCountryName: '청나라',
    startDate: '1908-08-27',
    endDate: '1912-02-12',
    summary:
      '청말 예비입헌기인 광서 34년(1908년) 헌정편차관이 일본 제국 헌법을 모델로 제정·반포한 중국 역사상 최초의 근대 헌법적 문서(본문 군상대권 14조·부록 신민권리의무 9조). 9년 뒤 입헌군주제 시행을 예고하였다.',
  },
  {
    name: '중화민국 임시약법 (中華民國臨時約法, 1912)',
    lawTypeName: '기본법·헌장',
    countryName: '중국',
    historicalCountryName: '중화민국',
    startDate: '1912-03-11',
    endDate: '1914-05-01',
    articleNumber: 2,
    summary:
      '신해혁명 직후 1912년 3월 11일 난징 임시정부 임시참의원이 제정하고 임시대총통 쑨원이 공포한 아시아 최초의 민주공화국 헌법 규범(전 7장 56조). 주권재민, 삼권분립, 위안스카이 견제를 위한 책임내각제를 규정하였다.',
  },
  {
    name: '중화민국 헌법 (1947년 제헌헌법 및 증수조문)',
    lawTypeName: '헌법',
    countryName: '대만',
    historicalCountryName: '중화민국',
    startDate: '1947-12-25',
    articleNumber: 1,
    summary:
      '1946년 12월 25일 난징 제헌국민대회가 제정하고 1947년 12월 25일 시행된 중화민국의 현행 헌법(전 14장 175조). 쑨원의 삼민주의와 오권헌법(행정·입법·사법·고시·감찰)에 기초하며 1991년 이후 헌법증수조문으로 총통 직선제와 민주화를 실현하였다.',
  },
  {
    name: '중화인민공화국 헌법 (1954년 제정 · 1982년 현행 헌법)',
    lawTypeName: '헌법',
    countryName: '중국',
    historicalCountryName: '중화인민공화국',
    startDate: '1982-12-04',
    articleNumber: 1,
    summary:
      '1949년 공동강령과 1954년 제1차 헌법을 거쳐 1982년 12월 4일 제5기 전국인민대표대회 제5차 회의에서 채택된 중화인민공화국의 현행 헌법. 인민민주전정, 전국인민대표대회 유일 최고권력기관 원칙, 개혁개방 및 사회주의 시장경제를 규정한다.',
  },
  {
    name: '알베르토 헌장 (Statuto Albertino, 1848)',
    lawTypeName: '기본법·헌장',
    countryName: '이탈리아',
    historicalCountryName: '사르데냐 왕국',
    startDate: '1848-03-04',
    endDate: '1947-12-31',
    summary:
      '1848년 3월 4일 사르데냐 국왕 카를로 알베르토가 반포한 입헌군주제 흠정헌장. 1861년 이탈리아 통일 이후 이탈리아 왕국의 기본 헌법이 되어 1948년 공화국 헌법 시행 전까지 100년간 효력을 유지하였다.',
  },
  {
    name: '이탈리아 공화국 헌법 (Costituzione della Repubblica Italiana, 1948)',
    lawTypeName: '헌법',
    countryName: '이탈리아',
    startDate: '1948-01-01',
    articleNumber: 1,
    summary:
      '1946년 제헌의회가 제정하여 1948년 1월 1일 발효된 현행 이탈리아 헌법. 제1조 「이탈리아는 노동에 기초한 민주공화국이다」를 천명하고 파시즘 재건 금지, 완전 대등 양원제, 헌법재판소 및 주(Regione) 자치를 확립하였다.',
  },
  {
    name: '1867년 오스트리아 12월 헌법 및 대타협 기본법 (Dezemberverfassung)',
    lawTypeName: '기본법·헌장',
    countryName: '오스트리아',
    historicalCountryName: '오스트리아-헝가리 제국',
    startDate: '1867-12-21',
    endDate: '1918-11-12',
    summary:
      '오스트리아-헝가리 대타협(Ausgleich) 직후 프란츠 요제프 1세가 재가한 5개 국가기본법 총칭. 시민의 일반 권리, 제국의회 대표권, 제국재판소 설치 및 헝가리와의 공동사무 처리 절차를 규정하였다.',
  },
  {
    name: '1920년 오스트리아 연방헌법 (Bundes-Verfassungsgesetz, B-VG)',
    lawTypeName: '헌법',
    countryName: '오스트리아',
    startDate: '1920-10-01',
    summary:
      '법학자 한스 켈젠이 초안을 작성하여 1920년 10월 1일 제정된 오스트리아의 현행 연방헌법. 세계 최초로 추상적 규범통제권을 가진 독립 헌법재판소(오스트리아형 헌법재판 모델)를 창설하였다.',
  },
  {
    name: '1791년 폴란드-리투아니아 5월 3일 헌법 (Konstytucja 3 maja)',
    lawTypeName: '헌법',
    countryName: '폴란드',
    historicalCountryName: '폴란드-리투아니아 연방',
    startDate: '1791-05-03',
    endDate: '1795-10-24',
    summary:
      '폴란드-리투아니아 연방의 4년 세임(대세임)이 1791년 5월 3일 채택한 유럽 최초이자 미합중국 헌법에 이은 세계 두 번째 근대 성문헌법. 귀족의 만장일치 거부권(리베룸 베토)을 폐지하고 다수결 원칙과 삼권분립 입헌군주제를 도입하였다.',
  },
  {
    name: '1978년 스페인 헌법 (Constitución Española de 1978)',
    lawTypeName: '헌법',
    countryName: '스페인',
    historicalCountryName: '스페인 왕국',
    startDate: '1978-12-29',
    articleNumber: 1,
    summary:
      '프랑코 독재 종식 후 민주화 이행기 제헌 코르테스가 기초하고 1978년 12월 국민투표(찬성 88.5%)를 거쳐 발효된 스페인 현행 헌법. 사회적·민주적 법치국가, 의회군주제, 17개 자치주 분권 체제를 확립하였다.',
  },
]

export async function seedPoliticalSystemsAndConstitutions(
  prisma: PrismaService,
): Promise<void> {
  console.log(
    '\n📜 국가별 제헌(헌법·기본법) 및 시대별 헌정 체제(PoliticalSystem) 시딩 시작...',
  )

  // 0. 마스터 맵 적재 (국가, 역사국가, 관직 정의)
  const countries = await prisma.country.findMany({
    select: { id: true, name: true },
  })
  const countryByName = new Map(countries.map((c) => [c.name, c.id]))

  const historicalCountries = await prisma.historicalCountry.findMany({
    select: { id: true, name: true },
  })
  const hcByName = new Map(historicalCountries.map((h) => [h.name, h.id]))

  // 도쿠가와 막부 ↔ 일본 브리지 보강 (없으면 일본 국가 상세 스코프 및 정체 수정 시 브리지 검증에서 누락됨)
  const japanId = countryByName.get('일본')
  const tokugawaId = hcByName.get('도쿠가와 막부')
  if (japanId && tokugawaId) {
    const existingBridge =
      await prisma.historicalCountryModernCountry.findFirst({
        where: {
          historicalCountryId: tokugawaId,
          modernCountryId: japanId,
        },
        select: { id: true },
      })
    if (!existingBridge) {
      await prisma.historicalCountryModernCountry.create({
        data: {
          historicalCountryId: tokugawaId,
          modernCountryId: japanId,
          startEra: 'AD',
          startYear: 1603,
          endEra: 'AD',
          endYear: 1868,
        },
      })
      console.log('  🔗 브리지 보강: 도쿠가와 막부 ↔ 일본')
    }
  }

  const posDefs = await prisma.governmentPositionDefinition.findMany({
    where: {
      positionType: { in: ['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'] },
    },
    select: { id: true, title: true, positionType: true },
  })
  const hosPosByTitle = new Map(
    posDefs
      .filter((p) => p.positionType === 'HEAD_OF_STATE')
      .map((p) => [p.title, p.id]),
  )
  const hogPosByTitle = new Map(
    posDefs
      .filter((p) => p.positionType === 'HEAD_OF_GOVERNMENT')
      .map((p) => [p.title, p.id]),
  )

  // 1. LawType 시딩
  const lawTypeByName = new Map<string, string>()
  let lawTypeCreated = 0
  for (const lt of LAW_TYPES) {
    const existing = await prisma.lawType.findFirst({
      where: { name: lt.name },
    })
    if (existing) {
      lawTypeByName.set(lt.name, existing.id)
      if (!existing.description && lt.description) {
        await prisma.lawType.update({
          where: { id: existing.id },
          data: { description: lt.description },
        })
      }
    } else {
      const created = await prisma.lawType.create({
        data: {
          name: lt.name,
          description: lt.description,
        },
      })
      lawTypeByName.set(lt.name, created.id)
      lawTypeCreated += 1
    }
  }
  console.log(
    `  ✅ 법 분류(LawType) 준비 완료 (신규 ${lawTypeCreated}건 / 총 ${lawTypeByName.size}종)`,
  )

  // 2. PoliticalSystem 시딩 및 기존 행(프랑스 12건·미국 2건) 보정
  let psCreated = 0
  let psUpdated = 0
  let psSkipped = 0

  for (const item of POLITICAL_SYSTEMS) {
    const countryId = item.countryName
      ? (countryByName.get(item.countryName) ?? null)
      : null
    const historicalCountryId = item.historicalCountryName
      ? (hcByName.get(item.historicalCountryName) ?? null)
      : null

    if (!countryId && !historicalCountryId) {
      console.warn(
        `  ⚠️  정체 스킵 (대상 국가/역사국가 없음): ${item.name} (${item.countryName ?? ''}/${item.historicalCountryName ?? ''})`,
      )
      continue
    }

    const headOfStatePositionId = item.headOfStatePositionTitle
      ? (hosPosByTitle.get(item.headOfStatePositionTitle) ?? null)
      : null
    const headOfGovernmentPositionId = item.headOfGovernmentPositionTitle
      ? (hogPosByTitle.get(item.headOfGovernmentPositionTitle) ?? null)
      : null

    // 자연키 조회: 같은 이름 + (같은 countryId 또는 같은 historicalCountryId)
    const existing = await prisma.politicalSystem.findFirst({
      where: {
        name: item.name,
        OR: [
          ...(countryId ? [{ countryId }] : []),
          ...(historicalCountryId ? [{ historicalCountryId }] : []),
        ],
      },
    })

    if (existing) {
      const patch: Record<string, unknown> = {}
      if (!existing.historicalCountryId && historicalCountryId) {
        patch.historicalCountryId = historicalCountryId
      }
      if (!existing.countryId && countryId) {
        patch.countryId = countryId
      }
      if (existing.startMonth == null && item.startMonth != null) {
        patch.startMonth = item.startMonth
      }
      if (existing.startDay == null && item.startDay != null) {
        patch.startDay = item.startDay
      }
      if (existing.endMonth == null && item.endMonth != null) {
        patch.endMonth = item.endMonth
      }
      if (existing.endDay == null && item.endDay != null) {
        patch.endDay = item.endDay
      }
      if (
        item.name === '앙시앵 레짐 (프랑스 왕국)' &&
        existing.endYear === 1792 &&
        item.endYear === 1791
      ) {
        patch.endYear = 1791
        patch.endMonth = 9
        patch.endDay = 3
      }
      if (!existing.notes && item.notes) {
        patch.notes = item.notes
      }
      if (
        !existing.headOfGovernmentPositionId &&
        !existing.headOfGovernmentTitle &&
        headOfGovernmentPositionId
      ) {
        patch.headOfGovernmentPositionId = headOfGovernmentPositionId
        patch.headOfGovernmentHasPower = item.headOfGovernmentHasPower ?? true
      }

      if (Object.keys(patch).length > 0) {
        await prisma.politicalSystem.update({
          where: { id: existing.id },
          data: patch,
        })
        psUpdated += 1
      } else {
        psSkipped += 1
      }
    } else {
      await prisma.politicalSystem.create({
        data: {
          name: item.name,
          countryId,
          historicalCountryId,
          startEra: item.startEra ?? (item.startYear != null ? 'AD' : null),
          startYear: item.startYear,
          startMonth: item.startMonth ?? null,
          startDay: item.startDay ?? null,
          endEra:
            item.endYear != null ? (item.endEra ?? item.startEra ?? 'AD') : null,
          endYear: item.endYear ?? null,
          endMonth: item.endMonth ?? null,
          endDay: item.endDay ?? null,
          isCurrent: item.isCurrent,
          governmentForm: item.governmentForm,
          legislatureType: item.legislatureType,
          lowerHouseName: item.lowerHouseName ?? null,
          lowerHouseSeats: item.lowerHouseSeats ?? null,
          upperHouseName: item.upperHouseName ?? null,
          upperHouseSeats: item.upperHouseSeats ?? null,
          headOfStatePositionId,
          headOfStateTitle: headOfStatePositionId
            ? null
            : (item.headOfStateTitle ?? null),
          headOfStateHasPower: item.headOfStateHasPower ?? null,
          headOfGovernmentPositionId,
          headOfGovernmentTitle: headOfGovernmentPositionId
            ? null
            : (item.headOfGovernmentTitle ?? null),
          headOfGovernmentHasPower: item.headOfGovernmentHasPower ?? null,
          stateStructure: item.stateStructure ?? null,
          partySystem: item.partySystem ?? null,
          notes: item.notes ?? null,
        },
      })
      psCreated += 1
    }
  }
  console.log(
    `  ✅ 정체·헌정 체제(PoliticalSystem) 완료 (신규 ${psCreated}건 / 보강 ${psUpdated}건 / 유지 ${psSkipped}건)`,
  )

  // 3. Law(헌법·기본법·법전) 시딩 및 EventContextLink 연결
  let lawCreated = 0
  let lawUpdated = 0
  let eventLinkCreated = 0

  for (const lawItem of LAWS) {
    const countryId = lawItem.countryName
      ? (countryByName.get(lawItem.countryName) ?? null)
      : null
    const historicalCountryId = lawItem.historicalCountryName
      ? (hcByName.get(lawItem.historicalCountryName) ?? null)
      : null
    const lawTypeId = lawTypeByName.get(lawItem.lawTypeName) ?? null

    if (!countryId && !historicalCountryId) {
      console.warn(`  ⚠️  법령 스킵 (국가 없음): ${lawItem.name}`)
      continue
    }

    const startDate = lawItem.startDate
      ? new Date(`${lawItem.startDate}T00:00:00.000Z`)
      : null
    const endDate = lawItem.endDate
      ? new Date(`${lawItem.endDate}T00:00:00.000Z`)
      : null

    let lawRecord = await prisma.law.findFirst({
      where: {
        name: lawItem.name,
        OR: [
          ...(countryId ? [{ countryId }] : []),
          ...(historicalCountryId ? [{ historicalCountryId }] : []),
        ],
      },
    })

    if (lawRecord) {
      const lawPatch: Record<string, unknown> = {}
      if (!lawRecord.lawTypeId && lawTypeId) lawPatch.lawTypeId = lawTypeId
      if (!lawRecord.countryId && countryId) lawPatch.countryId = countryId
      if (!lawRecord.historicalCountryId && historicalCountryId) {
        lawPatch.historicalCountryId = historicalCountryId
      }
      if (!lawRecord.startDate && startDate) lawPatch.startDate = startDate
      if (!lawRecord.endDate && endDate) lawPatch.endDate = endDate
      if (!lawRecord.summary && lawItem.summary) {
        lawPatch.summary = lawItem.summary
      }
      if (Object.keys(lawPatch).length > 0) {
        lawRecord = await prisma.law.update({
          where: { id: lawRecord.id },
          data: lawPatch,
        })
        lawUpdated += 1
      }
    } else {
      lawRecord = await prisma.law.create({
        data: {
          name: lawItem.name,
          lawTypeId,
          countryId,
          historicalCountryId,
          startDate,
          endDate,
          articleNumber: lawItem.articleNumber ?? null,
          paragraphNumber: lawItem.paragraphNumber ?? null,
          summary: lawItem.summary,
          note: lawItem.note ?? null,
        },
      })
      lawCreated += 1
    }

    // 연결할 사건(Event)이 있으면 EventContextLink 생성
    if (lawItem.linkedEventTitles && lawItem.linkedEventTitles.length > 0) {
      const matchedEvents = await prisma.event.findMany({
        where: { title: { in: lawItem.linkedEventTitles } },
        select: { id: true, title: true },
      })
      for (const ev of matchedEvents) {
        const existingLink = await prisma.eventContextLink.findFirst({
          where: {
            eventId: ev.id,
            lawId: lawRecord.id,
          },
          select: { id: true },
        })
        if (!existingLink) {
          await prisma.eventContextLink.create({
            data: {
              eventId: ev.id,
              lawId: lawRecord.id,
              note: `제헌·헌법 공포 및 시행 근거 법령 (${lawItem.name})`,
            },
          })
          eventLinkCreated += 1
        }
      }
    }
  }

  console.log(
    `  ✅ 제헌·헌법 법령(Law) 완료 (신규 ${lawCreated}건 / 보강 ${lawUpdated}건 / 사건-법령 연결 ${eventLinkCreated}건)\n`,
  )
}
