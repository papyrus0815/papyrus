/**
 * 인물 고르기 — 순수 로직(검색·정렬·맥락 순위·표시 문구). 화면 없이 테스트한다.
 */
import { type PersonResponseDto } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

export type PickerPerson = PersonResponseDto

export type PersonSortKey = 'relevance' | 'name' | 'birth-asc' | 'birth-desc'

/**
 * 고르는 자리의 맥락 — 주면 '이 무렵·이 나라' 인물이 위로 올라온다.
 * 예: 크림 전쟁(1853~1856, 러시아·오스만·프랑스·영국)의 참여 인물을 고를 때 470명 이름순 맨 앞이
 * '가브릴로 프린치프'였다.
 */
export interface PersonPickerContext {
  /** 기준 기간(천문 연도 — 기원전은 음수) */
  fromYear?: number | null
  toYear?: number | null
  /** 관련 나라 — 현대·역사 id 어느 쪽이든(인물의 countryId·historicalCountryId와 맞춘다) */
  countryIds?: ReadonlyArray<string>
  /** 이 맥락을 부르는 말 — '이 사건 무렵' 등 */
  label?: string
}

/** 천문 연도 — 기원전 n년 = -(n-1). 연도가 없으면 null */
export function signedYear(era: string | null | undefined, year: number | null | undefined): number | null {
  if (year === null || year === undefined) return null
  return era === 'BC' ? -(year - 1) : year
}

/** 생몰(없으면 활동기) 범위 — 맥락 기간과 겹치는지 보는 데 쓴다 */
export function lifeSpanOf(person: PickerPerson): { from: number | null; to: number | null } {
  const birth = signedYear(person.birthEra, person.birthYear)
  const death = signedYear(person.deathEra, person.deathYear)
  if (birth !== null || death !== null) return { from: birth, to: death }
  return {
    from: signedYear(person.floruitEra, person.floruitStartYear),
    to: signedYear(person.floruitEra, person.floruitEndYear),
  }
}

/** '1769 ~ 1849' · '기원전 100 ~ 기원전 44' · '활동 1850 ~ 1870' */
export function lifeSpanLabel(person: PickerPerson): string | null {
  const year = (era: string | null | undefined, value: number | null | undefined) =>
    value === null || value === undefined ? null : era === 'BC' ? `기원전 ${value}` : String(value)
  const birth = year(person.birthEra, person.birthYear)
  const death = year(person.deathEra, person.deathYear)
  if (birth || death) return `${birth ?? '?'} ~ ${death ?? (person.isAlive ? '현재' : '?')}`
  const start = year(person.floruitEra, person.floruitStartYear)
  const end = year(person.floruitEra, person.floruitEndYear)
  if (start || end) return `활동 ${start ?? '?'} ~ ${end ?? '?'}`
  return null
}

type OfficeRecord = {
  positionType?: string | null
  title?: string | null
  regnalName?: string | null
  positionDefinition?: { title?: string | null } | null
  historicalCountry?: { name?: string | null } | null
  country?: { name?: string | null } | null
}

/**
 * 대표 직위 한 줄 — 재위가 먼저, 없으면 재임 첫 줄. '일본 제국 외무장관' · '훈 제국 국왕 아틸라'.
 * 이름만으론 동명이인·같은 성 인물을 가르기 어려워 행에 함께 보인다(470명 중 223명이 기록 보유).
 */
export function headlineOffice(person: PickerPerson): string | null {
  const records = [
    ...((person as { sovereignReigns?: OfficeRecord[] }).sovereignReigns ?? []),
    ...((person as { governmentTenures?: OfficeRecord[] }).governmentTenures ?? []),
  ]
  const record = records[0]
  if (!record) return null
  const title = record.positionDefinition?.title ?? record.title
  if (!title) return null
  const place = record.historicalCountry?.name ?? record.country?.name ?? ''
  return [place, title, record.regnalName ?? ''].filter(Boolean).join(' ')
}

/** 검색 대상 문자열 — 표시 이름(양식 셋)·원어 이름·왕명·생몰년. 소문자 */
export function searchHaystack(person: PickerPerson): string {
  return [
    getPersonDisplayName(person),
    getPersonDisplayName(person, { countryDefaultNameDisplayOrder: 'western' }),
    getPersonDisplayName(person, { countryDefaultNameDisplayOrder: 'korean' }),
    person.originalName ?? '',
    person.regnalName ?? '',
    person.templeName ?? '',
    person.birthYear ? String(person.birthYear) : '',
    person.deathYear ? String(person.deathYear) : '',
  ]
    .join(' ')
    .toLowerCase()
}

/** 공백으로 나눈 낱말이 모두 들어 있으면 맞음 — '나폴레옹 3' 같은 조합 검색 */
export function matchesQuery(haystack: string, query: string): boolean {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return words.every((word) => haystack.includes(word))
}

/**
 * 맥락 점수 — 기간이 겹치면 2, 관련 나라면 1(합산). 맥락이 없거나 하나도 안 맞으면 0.
 * 생몰이 반쯤만 알려진 인물은 아는 쪽 끝만으로 잰다(모르면 그쪽은 열린 것으로 본다).
 */
export function contextScore(person: PickerPerson, context: PersonPickerContext | null | undefined): number {
  if (!context) return 0
  let score = 0
  const { fromYear, toYear } = context
  if (fromYear !== null && fromYear !== undefined) {
    const span = lifeSpanOf(person)
    if (span.from !== null || span.to !== null) {
      const start = span.from ?? -Infinity
      const end = span.to ?? (span.from !== null ? span.from + 90 : Infinity)
      const windowEnd = toYear ?? fromYear
      if (start <= windowEnd && end >= fromYear) score += 2
    }
  }
  const countries = context.countryIds ?? []
  if (
    countries.length > 0 &&
    ((person.countryId && countries.includes(person.countryId)) ||
      (person.historicalCountryId && countries.includes(person.historicalCountryId)))
  ) {
    score += 1
  }
  return score
}

/** 정렬 — 관련순은 맥락 점수 내림차순, 같으면 이름순 */
export function comparePersons(
  sortKey: PersonSortKey,
  context: PersonPickerContext | null | undefined,
): (left: PickerPerson, right: PickerPerson) => number {
  const byName = (left: PickerPerson, right: PickerPerson) =>
    getPersonDisplayName(left).localeCompare(getPersonDisplayName(right), 'ko')
  if (sortKey === 'birth-asc' || sortKey === 'birth-desc') {
    const direction = sortKey === 'birth-asc' ? 1 : -1
    return (left, right) => {
      const leftYear = lifeSpanOf(left).from
      const rightYear = lifeSpanOf(right).from
      if (leftYear === null && rightYear === null) return byName(left, right)
      if (leftYear === null) return 1
      if (rightYear === null) return -1
      return (leftYear - rightYear) * direction || byName(left, right)
    }
  }
  if (sortKey === 'relevance' && context) {
    return (left, right) => contextScore(right, context) - contextScore(left, context) || byName(left, right)
  }
  return byName
}
