/**
 * 같은 국가 전/후 재위(reign-adjacency) 응답 계약.
 *
 * "인물 X의 이 재위 **바로 앞뒤(같은 국가)** 에 누가 통치했는가"를 답하는 두 번째
 * 발견(discovery) 계약 — 「동시대 수장」(/persons/:id/contemporaries, 시간 겹침)과
 * **직교**한다(이쪽은 시간축 인접 = 승계). 인물 상세 재위 카드의 「승계 박스」가 첫
 * 소비자이고, 국가 상세 등 미래 지면이 같은 계약을 재사용한다
 * (검토서 docs/person-reign-neighbors-review.md §3.2).
 *
 * 시간 계약 (contemporaries와 동일):
 * - 연도는 부호 연도(signed year). 현 스키마의 tenure/reign DATETIME은 AD 전용이라
 *   BC 앵커는 계산 생략(meta.bcSkippedCount)이지만, era 마이그가 와도 계약은 불변.
 * - 정렬 진실원은 startDate. regnalNumber는 표시 전용(nullable·복위 시 NULL 강제).
 */
import type {
  ContemporaryRecordDto,
  ContemporaryRulerPersonDto,
} from './person-contemporaries.response'

/** 관계 라벨 — 프론트: 선대/후대 */
export type AdjacencyRelation = 'PREDECESSOR' | 'SUCCESSOR'

/** contemporaries record 형태 + adjacency 전용 정밀도 필드(additive) */
export interface AdjacencyRecordDto extends ContemporaryRecordDto {
  /** 'year'면 월·일은 01-01 관행 채움 — 같은 해 동률/정렬 모호 인지용 */
  startDatePrecision: string | null
}

export interface AdjacencyNeighborDto {
  relation: AdjacencyRelation
  /** isOwned 포함 — 타계정이면 상세 진입 불가라 프론트가 칩 비활성 */
  person: ContemporaryRulerPersonDto
  record: AdjacencyRecordDto
  /**
   * 이웃 재위 기간이 앵커 재위와 겹침(공동·중첩·대립왕) — 순수 승계가 아님을 표시.
   * 순수 startDate 인접은 승계와 공동/중첩을 구분 못 하므로 거짓말하지 않고 UI가 구분 렌더한다.
   */
  overlapsAnchor: boolean
  /** 같은 경계 startDate(연 단위 모호 포함)를 공유하는 공동 이웃이 이 방향에 함께 있음 */
  coBoundary: boolean
  /**
   * 대상 본인의 다른 재위 단계(복위·공동→단독)가 최근접 이웃으로 잡힌 경우.
   * 카드가 이미 본인 재위를 렌더하므로 프론트는 딥링크를 비활성화한다(same-route no-op 회피).
   */
  isSelf: boolean
}

export interface ReignAdjacencyScopeDto {
  countryId: string | null
  historicalCountryId: string | null
  /** succession 요청이 전이 그래프 미시드로 instance-only로 강등됨 (B4) */
  degradedToStrict: boolean
}

export interface ReignAdjacencyEntryDto {
  /** 대상 인물의 이 재위 record — 프론트 카드가 이 id로 조인 */
  subjectRecordId: string
  subjectRecordKind: 'TENURE' | 'SOVEREIGN_REIGN'
  scope: ReignAdjacencyScopeDto
  /** 선대 — 가까운 것 먼저(startDate 내림차순). 동률(공동군주)은 배열로 전부 노출 */
  predecessors: AdjacencyNeighborDto[]
  /** 후대 — 가까운 것 먼저(startDate 오름차순) */
  successors: AdjacencyNeighborDto[]
  /** over-fetch 창이 경계에서 잘렸을 가능성(0이 아니면 무성 절단 방지 캡션 필수) */
  omittedCoBoundaryCount: number
}

export interface PersonReignAdjacencyMetaDto {
  /** 요청 스코프 — 'instance'(정확 국가) | 'succession'(전이 그래프 확장, B4) */
  scope: 'instance' | 'succession'
  /** 앵커로 삼은 수장급 record 수(계산 성공분) */
  totalSubjectRecords: number
  /** BC(연도<1)라 계산 생략한 앵커 수 */
  bcSkippedCount: number
  /** 국가 정보가 없어(교황 등) 스코프를 못 잡은 앵커 수 */
  noCountryCount: number
}

export interface PersonReignAdjacencyResponseDto {
  meta: PersonReignAdjacencyMetaDto
  /** 계산 가능한 수장급 record별 전/후 (BC·국가없음 앵커는 제외 — meta 카운트로 노출) */
  entries: ReignAdjacencyEntryDto[]
}
