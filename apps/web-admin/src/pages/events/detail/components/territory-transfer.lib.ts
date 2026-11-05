/**
 * 영토 이전 표시 계산 — 나라별 합계(받은 쪽·내준 쪽)·면적 표기·발효 시점 표기. 화면과 분리해 스펙으로 지킨다.
 */
import { formatYearLabel } from '@/shared/lib/iso-date'

export interface TerritoryParty {
  countryId: string | null
  historicalCountryId: string | null
  name: string | null
}

export interface TerritoryRowLike {
  from: TerritoryParty
  to: TerritoryParty
  areaKm2: number | null
  population: number | null
}

/** 나라 묶음 키 — 등록된 나라는 id, 자유 이름은 이름, 비었으면 '' */
export function partyKey(party: TerritoryParty): string {
  if (party.countryId) return `m:${party.countryId}`
  if (party.historicalCountryId) return `h:${party.historicalCountryId}`
  return party.name ? `n:${party.name}` : ''
}

export const partyName = (party: TerritoryParty) => party.name ?? '미상'

export interface PartyTotal {
  key: string
  party: TerritoryParty
  areaKm2: number
  /** 면적을 아는 줄이 하나라도 있나 — 없으면 '면적 미상'(0으로 그리지 않는다) */
  hasArea: boolean
  population: number
  hasPopulation: boolean
  rows: number
}

/**
 * 나라별 합계 — 받은 쪽(gained)·내준 쪽(lost). 면적 큰 순, 면적 모르는 나라는 뒤.
 * 교환처럼 한 나라가 양쪽에 다 있으면 양쪽 합계에 각각 든다.
 */
export function summarizeTerritory(rows: ReadonlyArray<TerritoryRowLike>): { gained: PartyTotal[]; lost: PartyTotal[] } {
  const tally = (pick: (row: TerritoryRowLike) => TerritoryParty) => {
    const totals = new Map<string, PartyTotal>()
    for (const row of rows) {
      const party = pick(row)
      const key = partyKey(party)
      if (!key) continue
      const total = totals.get(key) ?? {
        key,
        party,
        areaKm2: 0,
        hasArea: false,
        population: 0,
        hasPopulation: false,
        rows: 0,
      }
      total.rows += 1
      if (row.areaKm2 != null) {
        total.areaKm2 += row.areaKm2
        total.hasArea = true
      }
      if (row.population != null) {
        total.population += row.population
        total.hasPopulation = true
      }
      totals.set(key, total)
    }
    return [...totals.values()].sort(
      (left, right) => Number(right.hasArea) - Number(left.hasArea) || right.areaKm2 - left.areaKm2,
    )
  }
  return { gained: tally((row) => row.to), lost: tally((row) => row.from) }
}

/** 면적 — 1만 km² 이상은 '9.2만 km²', 아래는 '36,300 km²' */
export function formatArea(km2: number): string {
  if (km2 >= 10_000) {
    const man = km2 / 10_000
    const text = man >= 100 ? Math.round(man).toLocaleString('ko-KR') : String(Math.round(man * 10) / 10)
    return `${text}만 km²`
  }
  return `${km2.toLocaleString('ko-KR')} km²`
}

/** 인구 — 1만 이상은 '450만 명', 1억 이상은 '1.2억 명' */
export function formatPopulation(count: number): string {
  if (count >= 100_000_000) return `${Math.round((count / 100_000_000) * 10) / 10}억 명`
  if (count >= 10_000) {
    const man = count / 10_000
    return `${man >= 100 ? Math.round(man).toLocaleString('ko-KR') : Math.round(man * 10) / 10}만 명`
  }
  return `${count.toLocaleString('ko-KR')}명`
}

/** 발효 시점 — '1772년 8월 5일', BC는 '기원전 241년' */
export function effectiveLabel(point: {
  effectiveEra: 'BC' | 'AD' | null
  effectiveYear: number | null
  effectiveMonth: number | null
  effectiveDay: number | null
}): string | null {
  if (point.effectiveYear == null) return null
  const signed = point.effectiveEra === 'BC' ? -point.effectiveYear : point.effectiveYear
  const year = formatYearLabel(signed)
  if (point.effectiveMonth == null) return year
  return `${year} ${point.effectiveMonth}월${point.effectiveDay != null ? ` ${point.effectiveDay}일` : ''}`
}
