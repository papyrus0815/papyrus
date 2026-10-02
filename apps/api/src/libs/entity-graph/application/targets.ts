/**
 * 연결 대상(target) 조립 — kind별 최소 select와 라벨·보조줄·소유 판정.
 * 투영들이 같은 대상을 같은 모양으로 그리게 하는 단일 출처.
 */
import {
  signedYearFromEraDate,
  signedYearFromStructuredOrDate,
} from '../../person/application/head-record.shared'
import { displayPersonName } from '../../shared/person-display-name'
import type { ConnectionPeriod, ConnectionTarget } from '../domain/entity-graph.types'

/** 부호 연도 → '1852' / '기원전 44' */
export function formatSignedYear(year: number | null): string {
  if (year == null) return '?'
  return year < 0 ? `기원전 ${-year}` : `${year}`
}

export function periodLabel(period: ConnectionPeriod | null): string | null {
  if (!period || (period.from == null && period.to == null)) return null
  if (period.to == null || period.to === period.from) return formatSignedYear(period.from)
  return `${formatSignedYear(period.from)}–${formatSignedYear(period.to)}`
}

/** DATETIME만 있는 원천(재임·조직역할·당원 등) → 부호 연도 구간. DATETIME은 AD 전용 */
export function periodFromDates(
  start: Date | null | undefined,
  end: Date | null | undefined,
): ConnectionPeriod | null {
  const from = start ? start.getUTCFullYear() : null
  const to = end ? end.getUTCFullYear() : null
  return from == null && to == null ? null : { from, to }
}

/** 구조화 축(era+year) 우선, DATETIME 폴백 — 재위·사건·소속처럼 BC를 담는 원천 */
export function periodFromStructured(row: {
  startEra?: string | null
  startYear?: number | null
  startDate?: Date | null
  endEra?: string | null
  endYear?: number | null
  endDate?: Date | null
}): ConnectionPeriod | null {
  const from = signedYearFromStructuredOrDate(row.startEra, row.startYear, row.startDate)
  const to = signedYearFromStructuredOrDate(row.endEra, row.endYear, row.endDate)
  return from == null && to == null ? null : { from, to }
}

// ── 인물 ──

export const PERSON_TARGET_SELECT = {
  id: true,
  name: true,
  surname: true,
  middleName: true,
  nameDisplayOrder: true,
  country: { select: { defaultNameDisplayOrder: true } },
  profileImageUrl: true,
  accountId: true,
  birthEra: true,
  birthDate: true,
  deathEra: true,
  deathDate: true,
  isAlive: true,
} as const

export interface PersonTargetRow {
  id: string
  name: string
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  country: { defaultNameDisplayOrder: string | null } | null
  profileImageUrl: string | null
  accountId: string | null
  birthEra: string | null
  birthDate: Date | null
  deathEra: string | null
  deathDate: Date | null
  isAlive: boolean
}

export function personTarget(
  person: PersonTargetRow,
  accountId: string | undefined,
): ConnectionTarget {
  const born = signedYearFromEraDate(person.birthEra, person.birthDate)
  const died = signedYearFromEraDate(person.deathEra, person.deathDate)
  const lifespan =
    born == null && died == null
      ? null
      : `${formatSignedYear(born)}–${person.isAlive ? '' : formatSignedYear(died)}`
  return {
    kind: 'person',
    id: person.id,
    label: displayPersonName(person),
    subtitle: lifespan,
    imageUrl: person.profileImageUrl,
    accessible: !accountId || person.accountId === accountId,
  }
}

// ── 사건 ──

export const EVENT_TARGET_SELECT = {
  id: true,
  title: true,
  startEra: true,
  startYear: true,
  startDate: true,
  endEra: true,
  endYear: true,
  endDate: true,
  createdById: true,
} as const

export interface EventTargetRow {
  id: string
  title: string
  startEra: string | null
  startYear: number | null
  startDate: Date | null
  endEra: string | null
  endYear: number | null
  endDate: Date | null
  createdById: string
}

export function eventTarget(
  event: EventTargetRow,
  accountId: string | undefined,
): ConnectionTarget {
  return {
    kind: 'event',
    id: event.id,
    label: event.title,
    subtitle: periodLabel(periodFromStructured(event)),
    imageUrl: null,
    accessible: !accountId || event.createdById === accountId,
  }
}

// ── 국가(현대·역사) ──

export const COUNTRY_TARGET_SELECT = {
  id: true,
  name: true,
  flagEmoji: true,
  thumbnailUrl: true,
} as const

export function countryTarget(country: {
  id: string
  name: string
  flagEmoji: string | null
  thumbnailUrl: string | null
}): ConnectionTarget {
  return {
    kind: 'country',
    id: country.id,
    // 국기 이모지는 붙이지 않는다 — 칩이 kind 아이콘을 이미 그려 이모지와 겹쳤다
    label: country.name,
    subtitle: '현대 국가',
    imageUrl: country.thumbnailUrl,
    accessible: true,
  }
}

export const HISTORICAL_COUNTRY_TARGET_SELECT = {
  id: true,
  name: true,
  thumbnailUrl: true,
  startEra: true,
  startYear: true,
  endEra: true,
  endYear: true,
} as const

export function historicalCountryTarget(country: {
  id: string
  name: string
  thumbnailUrl: string | null
  startEra: string | null
  startYear: number | null
  endEra: string | null
  endYear: number | null
}): ConnectionTarget {
  return {
    kind: 'historicalCountry',
    id: country.id,
    label: country.name,
    subtitle: periodLabel(periodFromStructured(country)),
    imageUrl: country.thumbnailUrl,
    accessible: true,
  }
}

/** 현대·역사 dual-FK 행 → 대상. 둘 다 있으면 역사 우선(레포 공인 규약) */
export function polityTarget(row: {
  country?: Parameters<typeof countryTarget>[0] | null
  historicalCountry?: Parameters<typeof historicalCountryTarget>[0] | null
}): ConnectionTarget | null {
  if (row.historicalCountry) return historicalCountryTarget(row.historicalCountry)
  if (row.country) return countryTarget(row.country)
  return null
}

// ── 그 밖의 엔티티(소유 개념 없음) ──

export function simpleTarget(
  kind: ConnectionTarget['kind'],
  row: { id: string; name: string },
  subtitle: string | null = null,
  imageUrl: string | null = null,
): ConnectionTarget {
  return { kind, id: row.id, label: row.name, subtitle, imageUrl, accessible: true }
}
