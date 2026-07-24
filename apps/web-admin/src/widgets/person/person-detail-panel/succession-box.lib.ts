import { categorizePosition } from '@/entities/government-position/model/categorize'
import type { PositionCategory } from '@/entities/government-position/model/types'
import { formatSignedYear } from '@/shared/lib/lifespan-text'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import type {
  AdjacencyNeighbor,
  AdjacencyRecord,
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

/** 수장 라벨 — 묘호(세종)·왕호(루이 14세) 우선, 없으면 표시명 규칙 */
export function neighborLabel(neighbor: AdjacencyNeighbor): string {
  const { person, record } = neighbor
  const label =
    person.templeName?.trim() ||
    record.regnalName?.trim() ||
    person.regnalName?.trim() ||
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
