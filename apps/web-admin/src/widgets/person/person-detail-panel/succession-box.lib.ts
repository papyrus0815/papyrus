import { categorizePosition } from '@/entities/government-position/model/categorize'
import type { PositionCategory } from '@/entities/government-position/model/types'
import { formatSignedYear } from '@/shared/lib/lifespan-text'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import type {
  AdjacencyNeighbor,
  AdjacencyRecord,
  AdjacencyRecordKind,
} from '@/shared/api/person-reign-adjacency'

/**
 * 「같은 국가 전/후 재위(승계)」 박스의 순수 어댑터 — API 이웃을 표시 모델로 변환한다.
 * categorizePosition의 kind 계약('SOVEREIGN_REIGN' 정확 일치)과 BC-safe 부호 연도
 * 포맷을 여기 한 곳에서만 다뤄, 컴포넌트는 표시에만 집중한다
 * (contemporaries-strip.lib.ts와 동형 — 두 화면이 다르게 세면 안 됨).
 */

export function neighborCategory(record: AdjacencyRecord): PositionCategory {
  return categorizePosition({
    // kind는 'SOVEREIGN_REIGN' 정확 일치 계약 — recordKind 대문자 그대로 넘긴다
    // (lowercase를 넘기면 전원 오분류되는 함정이 검증에서 확인된 바 있음)
    kind: record.recordKind,
    positionType: record.positionType,
    positionTitle: record.title,
    appointmentMethod: record.appointmentMethod,
  })
}

/**
 * 수장 라벨 — 묘호(세종)·기록 왕호(에드워드 7세) 우선, 없으면 인물 표시명.
 * person.regnalName은 라벨로 쓰지 않는다 — 원문 표기('Nicholas')·칭호('쇼군')·
 * 맨 서수('4세')가 섞인 오염 필드 (contemporaries-strip.lib chipLabelOf와 동일 규약).
 */
export function neighborLabel(neighbor: AdjacencyNeighbor): string {
  const { person, record } = neighbor
  const label =
    person.templeName?.trim() ||
    record.regnalName?.trim() ||
    getPersonDisplayName({ ...person, name: person.name ?? '' })
  return label || '(이름 미상)'
}

/** 재위 구간 표기 — 종료일 미기록은 생존이면 "–"(재위 중), 아니면 "–?"(미상) */
export function neighborSpan(neighbor: AdjacencyNeighbor): string {
  const { person, record } = neighbor
  const start = formatSignedYear(record.startYear)
  if (record.endYear != null) return `${start}–${formatSignedYear(record.endYear)}`
  return person.isAlive ? `${start}–` : `${start}–?`
}

/** 이웃이 속한 정체(政體)명 — 역사국가 우선 */
export function neighborPolity(record: AdjacencyRecord): string | null {
  return record.historicalCountry?.name ?? record.country?.name ?? null
}

export interface SuccessionVocabulary {
  predecessor: string
  successor: string
  /** 빈 상태 문구에 쓰는 기록 명사 */
  recordNoun: string
}

/**
 * 승계 어휘 — 군주 재위는 「선대/후대」, 재임(대통령·총리)은 「전임/후임」.
 * 서버가 축(국가원수 ⊥ 정부수반)을 분리한 뒤로 정부수반 카드의 빈 칼럼이 흔해졌는데,
 * 거기에 '재위' 어휘가 남으면 총리 카드가 군주 말투로 말한다. 갈림 신호는
 * tenure-reign-list의 즉위/취임 관례와 동일하게 recordKind 하나로 통일한다.
 */
export function successionVocabulary(
  subjectRecordKind: AdjacencyRecordKind,
): SuccessionVocabulary {
  return subjectRecordKind === 'SOVEREIGN_REIGN'
    ? { predecessor: '선대', successor: '후대', recordNoun: '재위' }
    : { predecessor: '전임', successor: '후임', recordNoun: '재임' }
}
