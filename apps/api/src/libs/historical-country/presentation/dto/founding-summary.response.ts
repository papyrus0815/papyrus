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
  /** numbered = 제1대로 기록된 행, earliest = 대수 기록이 없어 가장 이른 기록 */
  basis: 'numbered' | 'earliest'
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

export interface FoundingSummaryDto {
  foundingNote: string | null
  dissolutionNote: string | null
  /** 종류별 한 명씩 — 군주·국가원수·정부수반 중 기록이 있는 것만 */
  firstRulers: FirstRulerDto[]
  /** 전신 국가 — 이 나라가 후임인 계승 관계 */
  predecessors: LinkedCountryDto[]
  /** 후신 국가 — 이 나라가 전임인 계승 관계 */
  successors: LinkedCountryDto[]
}
