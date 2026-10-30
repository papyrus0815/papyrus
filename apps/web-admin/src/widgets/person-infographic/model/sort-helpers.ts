import { countActiveScopes, matchesScopes } from './filter.store'
import type { AdaptedPerson } from './types'
import type { MultiScopes, PersonSortKey } from './filter.store'

export const SORT_OPTIONS: Array<[PersonSortKey, string]> = [
  ['influence', '영향력'],
  ['name', '이름'],
  ['year', '출생연도'],
  ['deathYear', '사망연도'],
  ['lifespan', '수명'],
]

/** 연도 미상(null)은 방향과 무관하게 항상 뒤로 보낸다. */
function cmpYear(
  yearA: number | null,
  yearB: number | null,
  dir: 'asc' | 'desc',
) {
  if (yearA == null && yearB == null) return 0
  if (yearA == null) return 1
  if (yearB == null) return -1
  return dir === 'asc' ? yearA - yearB : yearB - yearA
}

function compareBy(
  sort: PersonSortKey,
  personA: AdaptedPerson,
  personB: AdaptedPerson,
  reverse = false,
) {
  // 기본 방향: 이름만 오름차순(가→하), 연도·수명·영향력은 내림차순(최신·장수·고득점 먼저).
  // 미상(null) 및 영향력 미평가(0)는 방향과 무관하게 항상 맨 뒤로 보낸다.
  const yearDir: 'asc' | 'desc' = reverse ? 'asc' : 'desc'
  let primary: number
  if (sort === 'name') {
    const cmp = personA.name.localeCompare(personB.name, 'ko')
    primary = reverse ? -cmp : cmp
  } else if (sort === 'year') {
    primary = cmpYear(personA.born, personB.born, yearDir)
    if (primary === 0 && personA.born == null && personB.born == null) {
      primary = cmpYear(
        personA.activityStart ?? personA.activityYear,
        personB.activityStart ?? personB.activityYear,
        yearDir,
      )
    }
  } else if (sort === 'deathYear') {
    primary = cmpYear(personA.died, personB.died, yearDir)
    if (primary === 0 && personA.died == null && personB.died == null) {
      primary = cmpYear(
        personA.activityEnd ?? personA.activityYear,
        personB.activityEnd ?? personB.activityYear,
        yearDir,
      )
    }
  } else if (sort === 'lifespan') {
    primary = cmpYear(personA.age, personB.age, yearDir)
  } else {
    const infA = personA.influence > 0 ? personA.influence : null
    const infB = personB.influence > 0 ? personB.influence : null
    primary = cmpYear(infA, infB, yearDir)
  }
  if (primary !== 0) return primary
  // 동점 2차 기준 — 순서 결정성 확보(영향력 미상=0 대량 동점·동일 연도 방어).
  const byName = personA.name.localeCompare(personB.name, 'ko')
  if (byName !== 0) return byName
  return personA.id < personB.id ? -1 : personA.id > personB.id ? 1 : 0
}

/** 핀 된 인물을 항상 위로 올리는 정렬 비교 함수 생성기. */
export function makeSortFnWithPinned(
  pinned: Set<string>,
  sort: PersonSortKey,
  reverse = false,
): (a: AdaptedPerson, b: AdaptedPerson) => number {
  return (a, b) => {
    const pa = pinned.has(a.id)
    const pb = pinned.has(b.id)
    if (pa !== pb) return pa ? -1 : 1
    return compareBy(sort, a, b, reverse)
  }
}

/**
 * scope(era/region/field/country) 필터에 인물이 부합하는지 검사.
 * matrix·galaxy 등 "활성/비활성" 시각화에서 강조 대상 판별에 공통 사용.
 * 로직 정본은 filter.store의 matchesScopes — 여기서는 AdaptedPerson용 얇은 래퍼(era.key 주입).
 */
export function isPersonInScopes(
  person: AdaptedPerson,
  scopes: MultiScopes,
): boolean {
  return matchesScopes(person, scopes, (candidate) => candidate.era.key)
}

export function hasAnyActiveScope(scopes: MultiScopes): boolean {
  return countActiveScopes(scopes) > 0
}
