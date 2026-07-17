/**
 * 인물 통합 기록 비교(records/compare) 응답 계약.
 *
 * "인물이 시점 T에 X를 했다"를 기록하는 5개 채널(연보·재임/재위·업적·사건참여·수상)을
 * 읽기 시점에 union해 인물별 시간축 기록으로 정규화한다. 저장 모델은 건드리지 않는다
 * (검토서 docs/person-record-convergence-era-compare-review.md — 채널 존치, 계약만 수렴).
 *
 * 시간 계약:
 * - 연도는 전부 부호 연도(signed year) — BC는 음수. 정규화는 서버가 독점한다.
 *   (현재 BC를 실을 수 있는 소스는 Event 구조화 필드뿐이지만, 이후 연보 era 컬럼이
 *    추가돼도 이 계약은 불변 — 프론트 무수정 확장이 목표)
 * - fromYear는 포함, toYear는 배타(exclusive).
 */

export type PersonRecordKind =
  | 'LIFE_EVENT'
  | 'TENURE'
  | 'REIGN'
  | 'ACHIEVEMENT'
  | 'EVENT'
  | 'AWARD'

export interface PersonRecordItemDto {
  kind: PersonRecordKind
  /** 원본 행 PK (채널별 테이블의 id) */
  sourceId: string
  personId: string
  title: string
  /** 서술 요약 — HTML 제거·공백 축약·200자 트림 */
  summary: string | null
  /**
   * 채널별 분류 문자열 — LIFE_EVENT: 연보 category, AWARD: 수상 category,
   * TENURE/REIGN: GovernmentPositionType. 라벨링은 프론트 기존 상수 재사용.
   */
  category: string | null
  /** 부호 연도 (BC 음수). 미상이면 null */
  startYear: number | null
  /** 부호 연도. 재임/재위 진행 중(ongoing)이면 null */
  endYear: number | null
  /** 재임/재위가 종료일 없이 진행 중인지 (역사 기록의 종료 미상과 구분 불가 — 스키마 계약상 동일) */
  ongoing: boolean
  /** ISO 문자열 (AD DATETIME이 있을 때만 — 일 단위 표시용 보조) */
  startDate: string | null
  endDate: string | null
  /** year | month | day — 소스에 정밀도 개념이 있을 때만 */
  precision: string | null
  /**
   * 사건(Event) 정본 참조 — EVENT kind는 사건 자신의 id, ACHIEVEMENT는 eventId 링크.
   * 여러 인물의 기록이 같은 linkEventId를 가지면 "공유 사건"으로 묶어 표시할 수 있다.
   */
  linkEventId: string | null
  /** 재임/재위 맥락 국가명 */
  countryName: string | null
  /** EVENT: PersonEvent.role */
  role: string | null
}

export interface PersonRecordsPersonDto {
  person: {
    id: string
    name: string
    surname: string | null
    middleName: string | null
    nameDisplayOrder: string | null
    /** 부호 연도 (era 플래그 + 크기값 DATETIME 하이브리드를 서버에서 정규화) */
    birthYear: number | null
    deathYear: number | null
  }
  /** 시간순(부호 연도 오름차순, 미상 뒤) 정렬된 기록 */
  records: PersonRecordItemDto[]
  /** 기간 필터 지정 시 연도 미상이라 제외된 기록 수 (무성 절단 방지용 카운트) */
  undatedCount: number
}

export interface PersonRecordsCompareResponseDto {
  meta: {
    /** 연보 노출 범위 — v1은 요청 계정 본인 등록분만 (인물 공개 정책 확정 전 보수 고정) */
    lifeEventScope: 'OWN_ACCOUNT_ONLY'
    fromYear: number | null
    /** 배타(exclusive) 상한 */
    toYear: number | null
    sources: PersonRecordKind[]
    /** 요청했으나 존재하지 않는 personId */
    missingPersonIds: string[]
  }
  persons: PersonRecordsPersonDto[]
}
