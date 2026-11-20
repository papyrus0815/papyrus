/**
 * 참여 탭 순수 헬퍼 — 저장 payload 직렬화·참여국 합치기·인물 표시 이름.
 * (detail-actors.tsx에서 옮김. 화면 없이 테스트할 수 있게 React를 쓰지 않는다)
 */
import { type EventCountryRole } from '@/entities/event/model'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { type StructuredPoint } from '@/shared/api/evidence'

import { type EventDetail } from '../../use-event-detail'

/** 산문(한 일·비고) 접힘 줄 수 */
export const CLAMP_LINES = 2
/** 인물은 앞 N명만 보이고 '모두 보기'로 펼친다 */
export const PERSON_PREVIEW_COUNT = 6
/** 대표단은 나라마다 앞 N명 — 일본 대표단 7명이 화면 한 장을 먹었다 */
export const DELEGATION_PREVIEW_COUNT = 3

/**
 * 접어 둘 만큼 남는가 — 남는 게 2명 이하면 다 보인다.
 * 미국 대표단 4명 중 1명을 접어 '+1명 더 보기'를 세웠다(한 줄 아끼자고 클릭 하나를 더 시켰다).
 */
export const MIN_HIDDEN_TO_COLLAPSE = 3
export function shouldCollapse(total: number, previewCount: number): boolean {
  return total - previewCount >= MIN_HIDDEN_TO_COLLAPSE
}

export type EventPersonEntry = NonNullable<EventDetail['relatedPersons']>[number] & {
  deathAtEvent?: {
    label: string
    dateLabel: string | null
    cause: string | null
  } | null
}

/** 참여 인물 한 줄 — 참여 자격 국가는 3상(생략=유지 / null=비움 / 값=설정) */
export type PersonPayload = {
  personId: string
  role?: string
  note?: string
  countryId?: string | null
  historicalCountryId?: string | null
  sideId?: string | null
}

/**
 * UpdateEventDto.relatedPersons 항목 직렬화. null/빈 문자열은 undefined로 정규화해
 * 서버 `=== undefined` 가드와 정합. 참여 자격 국가는 싣지 않는다(생략=유지) —
 * 역할·순서만 바꾸는 저장이 그 값을 건드리지 않게.
 */
export function toPersonPayload(person: {
  personId: string
  role?: string | null
  note?: string | null
}): PersonPayload {
  return {
    personId: person.personId,
    role: person.role ?? undefined,
    note: person.note ?? undefined,
  }
}

/** 인물 표시 이름 — 이름 순서 규약(개인>국가>동양식)을 따른다 */
export function personNameOf(entry: Pick<EventPersonEntry, 'person'>): string {
  const person = entry.person
  if (!person) return '미상'
  return (
    getPersonDisplayName({
      name: person.name ?? '',
      surname: person.surname,
      middleName: person.middleName,
      nameDisplayOrder: person.nameDisplayOrder,
      country: person.country,
    }) || '미상'
  )
}

/** 참여국 한 행 — 현대·역사를 한 목록으로 합친 모양 */
export interface CountryRowData {
  id: string
  name: string
  flagEmoji: string | null
  isHistorical: boolean
  role: string | null
  roleDescription: string | null
  note: string | null
  sortOrder: number
  /** 존속 기간 경고 — 역사국가만(현대국은 기간 개념이 없다) */
  existenceWarning: string | null
  /** 진영 — 표시용(묶기)만. 저장 payload엔 싣지 않는다(생략=서버가 소속 유지) */
  sideId: string | null
  /** 참여국 줄 id — 이 나라 몫의 측정값(병력·사상자)이 여기에 붙는다 */
  participantId: string | null
  /** 참여 형태·가담·이탈 — 진영 모듈에서 적는 값을 여기서도 읽는다 */
  participation: 'FULL' | 'LIMITED' | 'INDIRECT' | 'NON_COMBATANT' | null
  join: StructuredPoint | null
  joinReason: string | null
  withdraw: StructuredPoint | null
  withdrawReason: string | null
}

/**
 * 참여국 — 현대·역사를 **한 목록**으로 합친다. 서버가 표시 편의로 두 배열을 내려주지만
 * 순서(sortOrder)는 둘에 걸쳐 하나이므로, 편집은 언제나 합친 목록으로 한다.
 */
export function buildCountryRows(
  modern: NonNullable<EventDetail['relatedCountries']>,
  historical: NonNullable<EventDetail['relatedHistoricalCountries']>,
): CountryRowData[] {
  const rows: CountryRowData[] = [
    ...modern.map((country, index) => ({
      id: country.id,
      name: country.name,
      flagEmoji: country.flagEmoji ?? null,
      isHistorical: false,
      role: country.role ?? null,
      roleDescription: country.roleDescription ?? null,
      note: country.note ?? null,
      sortOrder: country.sortOrder ?? index,
      existenceWarning: null,
      sideId: country.sideId ?? null,
      ...membershipOf(country),
    })),
    ...historical.map((country, index) => ({
      id: country.id,
      name: country.name,
      flagEmoji: null,
      isHistorical: true,
      role: country.role ?? null,
      roleDescription: country.roleDescription ?? null,
      note: country.note ?? null,
      sortOrder: country.sortOrder ?? index,
      existenceWarning: (country.existenceWarning ?? null) as string | null,
      sideId: country.sideId ?? null,
      ...membershipOf(country),
    })),
  ]
  rows.sort((left, right) => left.sortOrder - right.sortOrder)
  return rows
}

/** 참여국 행의 신원 — 현대/역사가 같은 uuid를 쓰더라도 섞이지 않는다 */
export function countryRowKey(row: { id: string; isHistorical: boolean }): string {
  return row.isHistorical ? `h:${row.id}` : `m:${row.id}`
}

/**
 * 행 → 서버 계약(`relatedCountries`) 한 줄.
 * 빈 문자열은 null로 눕혀 "지움"을 명확히 한다(3상 규약: 생략=유지, null=비움).
 */
export function toCountryPayload(row: {
  id: string
  isHistorical: boolean
  role: string | null
  roleDescription: string | null
  note: string | null
}) {
  return {
    ...(row.isHistorical ? { historicalCountryId: row.id } : { countryId: row.id }),
    role: (row.role ?? undefined) as EventCountryRole | undefined,
    roleDescription: row.roleDescription?.trim() ? row.roleDescription : null,
    note: row.note?.trim() ? row.note : null,
  }
}

/** 참여 자격 값 — 'h:역사국id' | 'c:현대국id' | ''(지정 안 함) */
export function participationValueOf(person: {
  countryId?: string | null
  historicalCountryId?: string | null
}): string {
  return person.historicalCountryId
    ? `h:${person.historicalCountryId}`
    : person.countryId
      ? `c:${person.countryId}`
      : ''
}

/** 인물의 참여 국가 키 — 참여국 행 키(`m:`/`h:`)와 같은 모양. 미지정이면 null */
export function delegationKeyOf(person: {
  countryId?: string | null
  historicalCountryId?: string | null
}): string | null {
  if (person.historicalCountryId) return `h:${person.historicalCountryId}`
  if (person.countryId) return `m:${person.countryId}`
  return null
}

/** 인물 잇기 모달의 '참여 소속 국가' 선택지 — 값은 `participationValueOf` 모양('c:'·'h:'), 첫 칸은 '없음' */
export function participationOptionsOf(
  rows: ReadonlyArray<{ id: string; isHistorical: boolean; name: string; flagEmoji: string | null }>,
): Array<{ value: string; label: string }> {
  if (rows.length === 0) return []
  return [
    { value: 'none', label: '없음' },
    ...rows.map((row) => ({
      value: `${row.isHistorical ? 'h' : 'c'}:${row.id}`,
      label: `${row.flagEmoji ? `${row.flagEmoji} ` : ''}${row.name}`,
    })),
  ]
}

/** 참여 소속 국가 값('c:'·'h:') → 그 나라의 진영 — 인물 잇기 모달이 '소속국 따름'을 미리 보인다 */
export function countrySideByParticipationValueOf(
  rows: ReadonlyArray<{ id: string; isHistorical: boolean; sideId?: string | null }>,
): Map<string, string | null> {
  return new Map(rows.map((row) => [`${row.isHistorical ? 'h' : 'c'}:${row.id}`, row.sideId ?? null]))
}

/**
 * 참여국 진영 표 — 키는 대표단 키(`m:`/`h:`)와 같은 모양. 진영 탭·참여 탭·히어로가 같은 표를 본다.
 */
export function countrySideMapOf(
  modern: ReadonlyArray<{ id: string; sideId?: string | null }> | null | undefined,
  historical: ReadonlyArray<{ id: string; sideId?: string | null }> | null | undefined,
): Map<string, string | null> {
  const map = new Map<string, string | null>()
  for (const country of modern ?? []) map.set(`m:${country.id}`, country.sideId ?? null)
  for (const country of historical ?? []) map.set(`h:${country.id}`, country.sideId ?? null)
  return map
}

/**
 * 인물의 실효 진영 — **인물에 따로 정한 진영이 있으면 그것, 없으면 소속국(참여 자격 국가)의 진영**.
 *
 * 인물 진영(person_event.side_id)은 예외(override)다. 내전처럼 같은 나라 사람이 반대편에 선 경우
 * (리프크네히트·룩셈부르크가 봉기 측, 소속국 바이마르는 과도정부 측)만 따로 적는다. 2026-11-20 실측에서
 * 소속국은 진영에 들어 있는데 인물은 비어 있는 행이 14개였다(아편전쟁 7, 크림 6 등). 이때 참여 탭은
 * 소속국 아래에 두어 그 진영 안에 보였고, 진영 탭은 '진영 밖'에 두었다. 두 화면이 이 함수 하나로
 * 같은 답을 낸다.
 */
export function effectivePersonSide(
  person: { sideId?: string | null; countryId?: string | null; historicalCountryId?: string | null },
  countrySideByKey: ReadonlyMap<string, string | null>,
): { sideId: string | null; source: 'own' | 'country' | null; countrySideId: string | null } {
  const key = delegationKeyOf(person)
  const countrySideId = key ? (countrySideByKey.get(key) ?? null) : null
  if (person.sideId) return { sideId: person.sideId, source: 'own', countrySideId }
  if (countrySideId) return { sideId: countrySideId, source: 'country', countrySideId }
  return { sideId: null, source: null, countrySideId: null }
}

/**
 * 소속국과 **다른 편**에 선 인물인가 — 인물 진영과 소속국 진영의 맨 위 진영이 다르면 그렇다.
 * 이런 인물을 소속국 줄 밑(대표단)에 두면 반대편 묶음 안에 태그 하나만 달고 서서 편이 거꾸로 읽힌다.
 * 소속국이 이 사건의 참여국이 아니면 대표단에 들 일이 없으므로 false다.
 */
export function isCrossSidePerson(
  person: { sideId?: string | null; countryId?: string | null; historicalCountryId?: string | null },
  countrySideByKey: ReadonlyMap<string, string | null>,
  sideRootOf: (sideId: string | null | undefined) => string | null,
): boolean {
  if (!person.sideId) return false
  const key = delegationKeyOf(person)
  if (!key || !countrySideByKey.has(key)) return false
  return sideRootOf(person.sideId) !== sideRootOf(countrySideByKey.get(key) ?? null)
}

/**
 * 대표단 — 참여국 줄마다 그 나라 자격으로 참여한 인물들. 인물 순서는 원래 순서 그대로.
 * 참여 국가가 없거나 그 나라가 참여국 목록에 없는 인물은 `unassigned`.
 * (실측: 참여 국가가 있는 160명 전원이 같은 사건의 참여국 줄과 맞았다)
 */
export function groupDelegations<Entry extends { countryId?: string | null; historicalCountryId?: string | null }>(
  rows: ReadonlyArray<{ id: string; isHistorical: boolean }>,
  persons: ReadonlyArray<Entry>,
): { byCountry: Map<string, Entry[]>; unassigned: Entry[] } {
  const rowKeys = new Set(rows.map(countryRowKey))
  const byCountry = new Map<string, Entry[]>()
  const unassigned: Entry[] = []
  for (const person of persons) {
    const key = delegationKeyOf(person)
    if (key && rowKeys.has(key)) byCountry.set(key, [...(byCountry.get(key) ?? []), person])
    else unassigned.push(person)
  }
  return { byCountry, unassigned }
}

function membershipOf(country: {
  participantId?: string | null
  participation?: CountryRowData['participation']
  join?: StructuredPoint | null
  joinReason?: string | null
  withdraw?: StructuredPoint | null
  withdrawReason?: string | null
}) {
  return {
    participantId: country.participantId ?? null,
    participation: country.participation ?? null,
    join: country.join ?? null,
    joinReason: country.joinReason ?? null,
    withdraw: country.withdraw ?? null,
    withdrawReason: country.withdrawReason ?? null,
  }
}

/** 참여 형태 — 전면은 기본이라 표시하지 않는다 */
export const PARTICIPATION_LABEL: Record<string, string> = {
  FULL: '전면',
  LIMITED: '제한 참전',
  INDIRECT: '간접 지원',
  NON_COMBATANT: '비전투',
}

/** 시점 한 토막 — '1914.8' · '기원전 44' */
export function formatPointShort(
  point: { era: 'BC' | 'AD'; year: number; month?: number | null; day?: number | null } | null | undefined,
): string | null {
  if (!point) return null
  const year = point.era === 'BC' ? `기원전 ${point.year}` : String(point.year)
  if (point.month && point.day) return `${year}.${point.month}.${point.day}`
  return point.month ? `${year}.${point.month}` : year
}

/**
 * 한 줄 시점 문자열('1917', '1917.4', '1917-04-06', '기원전 44', 'BC 44.3') → StructuredPoint.
 * 빈 문자열은 null(비움), 형식이 맞지 않으면 'invalid'를 돌려준다.
 */
export function parseCompactPoint(raw: string): StructuredPoint | null | 'invalid' {
  const trimmed = raw.trim()
  if (!trimmed) return null
  let era: 'BC' | 'AD' = 'AD'
  let rest = trimmed
  const bcMatch = rest.match(/^(?:기원전|BC|B\.C\.)\s*(.+)$/i)
  if (bcMatch) {
    era = 'BC'
    rest = bcMatch[1].trim()
  } else if (rest.startsWith('-')) {
    era = 'BC'
    rest = rest.slice(1).trim()
  }
  const match = rest.match(/^(\d{1,4})(?:[.\-/](\d{1,2})(?:[.\-/](\d{1,2}))?)?$/)
  if (!match) return 'invalid'
  const year = Number(match[1])
  const month = match[2] !== undefined ? Number(match[2]) : null
  const day = match[3] !== undefined ? Number(match[3]) : null
  if (!Number.isInteger(year) || year <= 0) return 'invalid'
  if (month !== null && (month < 1 || month > 12)) return 'invalid'
  if (day !== null && (day < 1 || day > 31)) return 'invalid'
  const precision: StructuredPoint['precision'] =
    day !== null ? 'day' : month !== null ? 'month' : 'year'
  return { era, year, month, day, precision }
}

/** 가담·이탈 한 줄 — '1914.8 가담 · 1918.11 이탈'. 둘 다 없으면 null */
export function membershipPeriodLabel(row: Pick<CountryRowData, 'join' | 'withdraw'>): string | null {
  const join = formatPointShort(row.join)
  const withdraw = formatPointShort(row.withdraw)
  if (!join && !withdraw) return null
  return [join && `${join} 가담`, withdraw && `${withdraw} 이탈`].filter(Boolean).join(' · ')
}
