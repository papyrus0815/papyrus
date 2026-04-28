/**
 * Lens 칩 배열을 사건 목록에 적용 (모든 칩을 AND).
 *
 * 칩 종류별 매칭 규칙:
 *  - country  : event.relatedCountries 안에 해당 id 포함
 *  - hcountry : event.relatedHistoricalCountries 안에 해당 id 포함
 *  - category : event.categoryId === 칩의 id (안정 매칭)
 *  - decade   : startDate의 연도가 [decade, decade+10) 구간 안
 *  - century  : startDate의 연도가 해당 세기 안
 *  - quality  : 데이터 누락 조건 매칭
 */
import { useMemo } from 'react'

import type { HistoricalEvent } from '@/entities/event/model'
import type { LensChip } from '../types/lens'

const startYear = (evt: HistoricalEvent): number | null => {
  if (!evt.startDate) return null
  const date = new Date(evt.startDate)
  if (Number.isNaN(date.getTime())) return null
  return date.getFullYear()
}

const matchesChip = (evt: HistoricalEvent, chip: LensChip): boolean => {
  switch (chip.kind) {
    case 'country':
      return (evt.relatedCountries ?? []).some((item) => item.id === chip.value)
    case 'hcountry':
      return (evt.relatedHistoricalCountries ?? []).some((item) => item.id === chip.value)
    case 'category':
      return evt.categoryId === chip.value
    case 'decade': {
      const year = startYear(evt)
      if (year === null) return false
      const decade = Number(chip.value)
      if (Number.isNaN(decade)) return false
      return year >= decade && year < decade + 10
    }
    case 'century': {
      const year = startYear(evt)
      if (year === null) return false
      const century = Number(chip.value)
      if (Number.isNaN(century)) return false
      const start = (century - 1) * 100 + 1
      const end = century * 100
      return year >= start && year <= end
    }
    case 'quality': {
      if (chip.value === 'missing-description') return !evt.description?.trim()
      if (chip.value === 'no-countries') {
        return (
          (evt.relatedCountries?.length ?? 0) === 0 &&
          (evt.relatedHistoricalCountries?.length ?? 0) === 0
        )
      }
      if (chip.value === 'no-keywords') {
        const kws = (evt.keywords ?? []).map((kw) => kw?.trim()).filter(Boolean)
        return kws.length === 0
      }
      return false
    }
    default:
      return true
  }
}

export function useFilteredEvents(
  events: HistoricalEvent[],
  lens: LensChip[],
): HistoricalEvent[] {
  return useMemo(() => {
    if (lens.length === 0) return events
    return events.filter((evt) => lens.every((chip) => matchesChip(evt, chip)))
  }, [events, lens])
}
