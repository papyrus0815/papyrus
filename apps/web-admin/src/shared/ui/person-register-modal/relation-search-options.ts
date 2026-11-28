/**
 * 인물 등록 폼의 가문·가족 드롭다운 옵션 — 이름만 있던 후보에 "누구인지"를 붙인다.
 *
 * - 가문: 존속 기간 · 구성원 수 ('1598–1605 · 2명'). 동명 분가(합스부르크-로트링겐·-에스테…)를 가른다.
 * - 인물: 국기(앞 칸) + 이름 아래 줄에 생몰년 · 국적 ('1868–1918 · 러시아 제국'). 실데이터에 '니콜라이 로마노프'가
 *   둘인데 이름만으론 누가 누군지 알 수 없었다.
 * - 인물은 이 사람의 출생연도를 알면 **시기가 맞는 후보를 앞 묶음으로** 올린다(제외는 없다 —
 *   생몰 미상·기록 오류가 흔하다). 부모 = 15~70년 앞에 태어난 사람, 배우자 = ±30년.
 */
import { formatSignedYear } from '@/shared/lib/lifespan-text'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import type { PersonResponseDto } from '@/shared/api/persons'

import type { SearchOption } from './sections/inline-search-select'

type EraLike = string | null | undefined

/** 크기 연도 + era → 부호 연도. 크기 연도가 없으면 ISO 날짜('-0044-…' 포함)에서 */
function signedYear(era: EraLike, magnitude: number | null | undefined, iso?: string | null): number | null {
  if (magnitude != null && Number.isFinite(magnitude)) {
    const abs = Math.abs(magnitude)
    return era === 'BC' ? -abs : abs
  }
  if (!iso) return null
  const negative = iso.startsWith('-')
  const match = (negative ? iso.slice(1) : iso).match(/^(\d{1,6})/)
  if (!match) return null
  const year = parseInt(match[1], 10)
  if (!Number.isFinite(year)) return null
  return negative || era === 'BC' ? -year : year
}

function rangeText(start: number | null, end: number | null): string {
  if (start == null && end == null) return ''
  if (start != null && end != null) return `${formatSignedYear(start)}–${formatSignedYear(end)}`
  if (start != null) return `${formatSignedYear(start)}–`
  return `?–${formatSignedYear(end as number)}`
}

// ─── 가문 ────────────────────────────────────────────────────────────────────

/** 가문 목록 응답에서 쓰는 필드만(SDK 타입이 늦게 생성돼도 깨지지 않게 구조형으로) */
export interface DynastyOptionSource {
  id: string
  name: string
  startEra?: EraLike
  startYear?: number | null
  startDate?: string | null
  endEra?: EraLike
  endYear?: number | null
  endDate?: string | null
  memberCount?: number | null
  originPlace?: string | null
  founderText?: string | null
}

export function buildDynastySearchOptions(dynasties: ReadonlyArray<DynastyOptionSource>): SearchOption[] {
  return dynasties.map((dynasty) => {
    const period = rangeText(
      signedYear(dynasty.startEra, dynasty.startYear, dynasty.startDate),
      signedYear(dynasty.endEra, dynasty.endYear, dynasty.endDate),
    )
    const members = dynasty.memberCount ? `${dynasty.memberCount}명` : ''
    return {
      value: dynasty.id,
      label: dynasty.name,
      meta: [period, members].filter(Boolean).join(' · ') || undefined,
      keywords: [dynasty.originPlace, dynasty.founderText].filter(Boolean).join(' ') || undefined,
    }
  })
}

// ─── 인물 ────────────────────────────────────────────────────────────────────

type PersonLike = PersonResponseDto & {
  birthEra?: EraLike
  birthYear?: number | null
  birthDate?: string | null
  deathEra?: EraLike
  deathYear?: number | null
  deathDate?: string | null
  isAlive?: boolean | null
}

export function personBirthSignedYear(person: PersonResponseDto): number | null {
  const like = person as PersonLike
  return signedYear(like.birthEra, like.birthYear, like.birthDate)
}

/** 후보 묶음의 기준 출생연도 — basis가 있으면 본인 생몰년이 아니라 가족에서 추정한 값 */
export interface BirthAnchor {
  year: number
  /** '아버지'·'어머니'·'배우자' — 추정 근거. 본인 출생연도면 null */
  basis: string | null
}

/**
 * 이 사람의 출생연도를 모를 때 이미 고른 가족으로 어림한다 — 부모 출생 +30년, 배우자는 동갑.
 * (생몰 미상 왕족을 등록하면서 아버지부터 고르는 흐름에서 어머니·배우자 후보가 묶이지 않던 틈)
 */
export function estimateBirthAnchor(
  ownBirthYear: number | null | undefined,
  relatives: {
    father?: PersonResponseDto | null
    mother?: PersonResponseDto | null
    spouses?: ReadonlyArray<PersonResponseDto | null | undefined>
  },
): BirthAnchor | null {
  if (ownBirthYear != null) return { year: ownBirthYear, basis: null }
  const parents: Array<[PersonResponseDto | null | undefined, string]> = [
    [relatives.father, '아버지'],
    [relatives.mother, '어머니'],
  ]
  for (const [parent, basis] of parents) {
    const birth = parent ? personBirthSignedYear(parent) : null
    if (birth != null) return { year: birth + 30, basis }
  }
  for (const spouse of relatives.spouses ?? []) {
    const birth = spouse ? personBirthSignedYear(spouse) : null
    if (birth != null) return { year: birth, basis: '배우자' }
  }
  return null
}

function personLifespanText(person: PersonLike): string {
  const birth = personBirthSignedYear(person)
  const death = signedYear(person.deathEra, person.deathYear, person.deathDate)
  if (birth != null && death == null && person.isAlive) return `${formatSignedYear(birth)}–`
  return rangeText(birth, death)
}

export type RelationKind = 'parent' | 'spouse'

/** 이 사람(출생 anchor) 기준으로 후보의 출생연도가 그럴듯한가 */
function isPlausible(kind: RelationKind, anchor: number, candidateBirth: number): boolean {
  const gap = anchor - candidateBirth
  return kind === 'parent' ? gap >= 15 && gap <= 70 : Math.abs(gap) <= 30
}

/** 그럴듯함 안에서의 순서 — 부모는 30년 앞, 배우자는 동갑에 가까울수록 앞 */
function closeness(kind: RelationKind, anchor: number, candidateBirth: number): number {
  return kind === 'parent' ? Math.abs(anchor - candidateBirth - 30) : Math.abs(anchor - candidateBirth)
}

export function buildPersonSearchOptions(
  persons: ReadonlyArray<PersonResponseDto>,
  {
    excludeIds,
    currentSelectedId,
    anchorBirthYear,
    anchorBasis,
    kind,
  }: {
    excludeIds: ReadonlyArray<string>
    currentSelectedId?: string
    /** 이 사람의 출생 부호 연도 — 없으면 묶지 않고 받은 순서대로 */
    anchorBirthYear?: number | null
    /** 기준 연도를 가족에서 추정했으면 그 근거('아버지') — 묶음 제목에 '추정'을 밝힌다 */
    anchorBasis?: string | null
    kind: RelationKind
  },
): SearchOption[] {
  const excludeSet = new Set(excludeIds.filter(Boolean))
  const pool = persons.filter(
    (person) => (currentSelectedId && person.id === currentSelectedId) || !excludeSet.has(person.id),
  ) as PersonLike[]

  const toOption = (person: PersonLike, group?: string): SearchOption => {
    const countryName = person.country?.name ?? ''
    return {
      value: person.id,
      label: getPersonDisplayName(person),
      leading: person.country?.flagEmoji ?? undefined,
      // 둘째 줄 — 우측 열에 두면 '소비에트 사회주의 공화국 연방' 같은 긴 국명이 이름을 '니콜…'까지 밀어냈다
      sub: [personLifespanText(person), countryName].filter(Boolean).join(' · ') || undefined,
      group,
    }
  }

  if (anchorBirthYear == null) return pool.map((person) => toOption(person))

  const plausible: Array<{ person: PersonLike; score: number }> = []
  const rest: PersonLike[] = []
  for (const person of pool) {
    const birth = personBirthSignedYear(person)
    if (birth != null && isPlausible(kind, anchorBirthYear, birth)) {
      plausible.push({ person, score: closeness(kind, anchorBirthYear, birth) })
    } else {
      rest.push(person)
    }
  }
  if (plausible.length === 0) return rest.map((person) => toOption(person))
  plausible.sort((left, right) => left.score - right.score)
  const baseLabel = kind === 'parent' ? '나이가 맞는 인물' : '같은 세대 인물'
  const plausibleLabel = anchorBasis ? `${baseLabel} · ${anchorBasis} 기준 추정` : baseLabel
  return [
    ...plausible.map(({ person }) => toOption(person, plausibleLabel)),
    ...rest.map((person) => toOption(person, '그 밖의 인물')),
  ]
}
