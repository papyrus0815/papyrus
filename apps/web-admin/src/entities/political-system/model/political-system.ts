/**
 * 정체(政體) 모델 — enum 한글 라벨과 기간 표기의 단일 출처.
 *
 * 국가에 붙은 붙박이 값이 아니라 기간을 가진 레코드다. 프랑스 제3·4·5공화국이 한 국가
 * 아래 세 줄로 놓인다.
 */
import type { PoliticalSystem } from '@/shared/api/political-system'

export type GovernmentForm = NonNullable<PoliticalSystem['governmentForm']>
export type LegislatureType = NonNullable<PoliticalSystem['legislatureType']>
export type StateStructure = NonNullable<PoliticalSystem['stateStructure']>
export type PartySystem = NonNullable<PoliticalSystem['partySystem']>

export const GOVERNMENT_FORM_LABEL: Record<GovernmentForm, string> = {
  PRESIDENTIAL: '대통령제',
  PARLIAMENTARY: '의원내각제',
  SEMI_PRESIDENTIAL: '이원집정부제',
  CONSTITUTIONAL_MONARCHY: '입헌군주제',
  ABSOLUTE_MONARCHY: '절대군주제',
  MILITARY: '군사정권',
  ONE_PARTY: '일당제 국가',
  THEOCRACY: '신정',
  PROVISIONAL: '과도정부',
  OTHER: '기타',
}

/** 폼 드롭다운 순서 — 흔한 것부터 */
export const GOVERNMENT_FORM_ORDER: GovernmentForm[] = [
  'PRESIDENTIAL',
  'PARLIAMENTARY',
  'SEMI_PRESIDENTIAL',
  'CONSTITUTIONAL_MONARCHY',
  'ABSOLUTE_MONARCHY',
  'MILITARY',
  'ONE_PARTY',
  'THEOCRACY',
  'PROVISIONAL',
  'OTHER',
]

export const LEGISLATURE_TYPE_LABEL: Record<LegislatureType, string> = {
  UNICAMERAL: '단원제',
  BICAMERAL: '양원제',
  NONE: '의회 없음',
}

export const LEGISLATURE_TYPE_ORDER: LegislatureType[] = [
  'UNICAMERAL',
  'BICAMERAL',
  'NONE',
]

export const STATE_STRUCTURE_LABEL: Record<StateStructure, string> = {
  FEDERAL: '연방제',
  UNITARY: '단일국가',
  CONFEDERATION: '국가연합',
  OTHER: '기타',
}

export const STATE_STRUCTURE_ORDER: StateStructure[] = [
  'UNITARY',
  'FEDERAL',
  'CONFEDERATION',
  'OTHER',
]

export const PARTY_SYSTEM_LABEL: Record<PartySystem, string> = {
  ONE_PARTY: '일당제',
  TWO_PARTY: '양당제',
  MULTI_PARTY: '다당제',
  NON_PARTISAN: '무정당',
  OTHER: '기타',
}

export const PARTY_SYSTEM_ORDER: PartySystem[] = [
  'MULTI_PARTY',
  'TWO_PARTY',
  'ONE_PARTY',
  'NON_PARTISAN',
  'OTHER',
]

/**
 * 단원제일 때 lowerHouse*는 '하원'이 아니라 그냥 '의회'다.
 * 한 쌍의 컬럼을 두 뜻으로 쓰므로 라벨은 항상 이 함수를 거친다.
 */
export function primaryHouseLabel(type: LegislatureType | null): string {
  return type === 'BICAMERAL' ? '하원' : '의회'
}

/** BC는 음수. 정렬·비교는 반드시 이 값으로 — 원시 연도는 BC를 뒤집는다. */
export function toSignedYear(
  era: 'BC' | 'AD' | null,
  year: number | null,
): number | null {
  if (year == null) return null
  return era === 'BC' ? -year : year
}

const yearText = (era: 'BC' | 'AD' | null, year: number | null) =>
  year == null ? null : era === 'BC' ? `기원전 ${year}` : `${year}`

/** '1870–1940' · '1958–현재' · '기원전 52–기원전 27' · '연도 미상' */
export function formatPeriod(system: PoliticalSystem): string {
  const start = yearText(system.startEra, system.startYear)
  const end = yearText(system.endEra, system.endYear)
  if (start == null && end == null) return '연도 미상'
  if (start != null && end == null) {
    return system.isCurrent ? `${start}–현재` : `${start}–`
  }
  if (start == null && end != null) return `–${end}`
  return `${start}–${end}`
}

/** 한 줄 요약 — '대통령제 · 양원제' */
export function summarize(system: PoliticalSystem): string {
  const parts = [
    system.governmentForm && GOVERNMENT_FORM_LABEL[system.governmentForm],
    system.legislatureType && LEGISLATURE_TYPE_LABEL[system.legislatureType],
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '내용 없음'
}

/** 목록 정렬 — 오래된 순, 연도 미상은 끝. */
export function comparePoliticalSystems(
  left: PoliticalSystem,
  right: PoliticalSystem,
): number {
  const leftYear = toSignedYear(left.startEra, left.startYear)
  const rightYear = toSignedYear(right.startEra, right.startYear)
  if (leftYear == null && rightYear == null) return 0
  if (leftYear == null) return 1
  if (rightYear == null) return -1
  return leftYear - rightYear
}
