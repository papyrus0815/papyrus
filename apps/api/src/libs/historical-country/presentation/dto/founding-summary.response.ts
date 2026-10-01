/**
 * 역사 국가 건국·멸망 요약 — 개요 탭 '건국'·'멸망' 카드와 목록 국가 모달이 읽는다.
 * 새로 저장하는 것은 없다: 초대 통치자는 재위·재임 기록에서, 전신·후신은 계승 관계에서 파생.
 */

/** 초대 통치자의 인물 요약 — 표시명 조립은 클라이언트 공용 헬퍼(getPersonDisplayName)가 한다 */
export interface FoundingPersonDto {
  id: string
  name: string
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  regnalName: string | null
  profileImageUrl: string | null
}

export interface FirstRulerDto {
  /** monarch=군주 재위, headOfState=대통령 등 국가원수 재임, headOfGovernment=총리 등 정부수반 재임 */
  kind: 'monarch' | 'headOfState' | 'headOfGovernment'
  /** 재위·재임 기록 id */
  recordId: string
  /** 재위명(루이 14세) — 군주만 */
  regnalName: string | null
  /** 직함(대통령·총리·국왕) — 정의 제목 > 재임 행 제목 */
  title: string | null
  /**
   * numbered = 제1대로 기록된 행, earliest = 대수 기록이 없어 가장 이른 기록,
   * latest = 마지막 통치자(가장 늦게 시작한 기록)
   */
  basis: 'numbered' | 'earliest' | 'latest'
  startEra: 'BC' | 'AD' | null
  startYear: number | null
  endEra: 'BC' | 'AD' | null
  endYear: number | null
  person: FoundingPersonDto
}

export interface LinkedCountryDto {
  id: string
  name: string
  /** 계승 관계 유형(FOUNDED·CONQUEST·INDEPENDENCE·SUCCESSION…) */
  eventType: string
  startEra: 'BC' | 'AD' | null
  startYear: number | null
  endEra: 'BC' | 'AD' | null
  endYear: number | null
}

/** 건국·멸망 주체 한 행 — 인물·역사 국가·현대 국가·자유 입력 중 하나 */
export interface StatehoodAgentDto {
  id: string
  side: 'FOUNDING' | 'DISSOLUTION'
  kind: 'person' | 'historicalCountry' | 'country' | 'name'
  /** 인물·국가 id — kind='name'이면 null */
  refId: string | null
  /** 표시 이름 — 인물은 표시명 조립용 person 필드도 함께 */
  name: string
  person: FoundingPersonDto | null
  /** 역사 국가 주체의 존속 시작·끝 */
  startEra: 'BC' | 'AD' | null
  startYear: number | null
  endEra: 'BC' | 'AD' | null
  endYear: number | null
  note: string | null
  sortOrder: number
}

export interface FoundingSummaryDto {
  foundingNote: string | null
  dissolutionNote: string | null
  /** 종류별 한 명씩 — 군주·국가원수·정부수반 중 기록이 있는 것만 */
  /** 건국 주체 — 누가 세웠나(사용자가 지정) */
  founders: StatehoodAgentDto[]
  /** 멸망 주체 — 누구에게 멸망했나(사용자가 지정) */
  dissolvers: StatehoodAgentDto[]
  firstRulers: FirstRulerDto[]
  /** 마지막 통치자 — firstRulers와 같은 모양, 종류별 한 명(가장 늦게 시작한 기록) */
  lastRulers: FirstRulerDto[]
  /** 전신 국가 — 이 나라가 후임인 계승 관계 */
  predecessors: LinkedCountryDto[]
  /** 후신 국가 — 이 나라가 전임인 계승 관계 */
  successors: LinkedCountryDto[]
}
