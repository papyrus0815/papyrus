/**
 * 인물 동시대 수장(contemporaries) 응답 계약.
 *
 * "인물 X의 재위·재임 기간에 (다른 나라에서) 누가 통치했는가"를 답하는 첫
 * 발견(discovery) 계약 — 기존 /person-records/compare(personIds 필수, enrichment 전용)와
 * 직교한다. 인물 상세 스트립이 첫 소비자이고, 국가 상세·persons-timeline 등
 * 미래 지면이 같은 계약을 재사용한다 (검토서 docs/person-contemporary-rulers-review.md §3).
 *
 * 시간 계약 (person-records/compare와 동일):
 * - 연도는 전부 부호 연도(signed year, BC 음수). fromYear 포함, toYear 배타.
 * - 현재 스키마의 tenure/reign DATETIME은 AD 전용이라 BC 창은 빈 결과지만,
 *   era 컬럼 마이그레이션이 와도 이 계약은 불변 (서버 파생만 교체).
 */

export type ContemporaryRecordKind = 'TENURE' | 'SOVEREIGN_REIGN'

export interface ContemporaryRecordDto {
  /** 원본 행 PK (recordKind별 테이블) */
  recordId: string
  recordKind: ContemporaryRecordKind
  /**
   * GovernmentPositionType — SOVEREIGN_REIGN은 전량 HEAD_OF_STATE로 간주
   * (mapSovereignReignToChronologyItem·normalize-tenures와 동일 관례)
   */
  positionType: string
  /** 직위명 — tenure.title ?? positionDefinition.title (재위는 정의 title만) */
  title: string | null
  /** categorizePosition 입력용 (세습/선거 분기) */
  appointmentMethod: string | null
  /** 왕호/재위명 (재위 전용) */
  regnalName: string | null
  regnalNumber: number | null
  termNumber: number | null
  /** 부호 연도 (현 스키마상 AD 양수) */
  startYear: number
  /** 종료일 미기록이면 null — 「재위 중」과 「미입력」은 스키마상 구분 불가 (person.isAlive로 판단) */
  endYear: number | null
  startDate: string
  endDate: string | null
  country: { id: string; name: string; flagEmoji: string | null } | null
  historicalCountry: { id: string; name: string } | null
}

export interface ContemporaryRulerPersonDto {
  id: string
  name: string | null
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  /** 주 국적의 이름 순서 기본값 — 개인 오버라이드 없을 때 서양식(이름·성) 판단용 */
  country: { defaultNameDisplayOrder: string | null } | null
  profileImageUrl: string | null
  templeName: string | null
  regnalName: string | null
  isAlive: boolean
  /** 부호 연도 — 종료일 없는 기록의 표시(?–) 판단용 */
  deathYear: number | null
  /**
   * 요청 계정 소유 인물인지 — 인물 상세(:id)는 소유자 게이트라 타계정 인물은
   * 열 수 없다. false면 프론트는 칩을 비활성(비클릭) 렌더 (가계도 isOwned 선례).
   */
  isOwned: boolean
}

export interface ContemporaryRulerDto {
  person: ContemporaryRulerPersonDto
  /** 창과 겹치는 수장급 기록들 — startYear 오름차순 */
  records: ContemporaryRecordDto[]
  /** 대상 창과의 겹침 길이(년) — 정렬·cap 근거를 응답에 노출 */
  overlapYears: number
}

export interface PersonContemporariesMetaDto {
  window: { fromYear: number; toYear: number }
  /** true면 창을 대상 인물의 수장급 재위 구간에서 서버가 유도 */
  derivedFromSubject: boolean
  scope: 'all' | 'sameCountry'
  /** cap 적용 전 전체 인물 수 */
  totalPersons: number
  /** cap으로 잘린 인물 수 — 0이 아니면 프론트는 무성 절단 방지 캡션 필수 */
  omittedCount: number
}

export interface PersonContemporariesResponseDto {
  meta: PersonContemporariesMetaDto
  /** 겹침 길이 내림차순 (동률은 시작 연도 오름차순) */
  rulers: ContemporaryRulerDto[]
}
