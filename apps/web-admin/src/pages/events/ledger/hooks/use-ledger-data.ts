/**
 * 데이터 일괄 로드 — 사건(서버 페이징·필터)·카테고리·국가(현대/역사).
 *
 * Lens 칩 → 서버 query 파라미터로 변환해 useEvents에 그대로 전달한다.
 * 카테고리/국가 사전은 칩 라벨 복원에 쓴다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { type UseEventsOptions, useEvents } from '@/entities/event/model'
import { getAllCountries } from '@/shared/api/countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import {
  type EventCategoryDto,
  getAllEventCategories,
} from '@/shared/api/event-categories'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'

import type { LensChip } from '../types/lens'

export interface CountryDict {
  byId: Map<string, { id: string; name: string; flagEmoji?: string }>
}
export interface HistoricalCountryDict {
  byId: Map<string, { id: string; name: string }>
}
export interface CategoryDict {
  byId: Map<string, EventCategoryDto>
  byName: Map<string, EventCategoryDto>
}

const QUALITY_LABELS: Record<string, string> = {
  'missing-description': '본문 누락',
  'no-countries': '국가 미지정',
  'no-keywords': '키워드 없음',
}

type EventsLensOptions = Pick<
  UseEventsOptions,
  | 'countryId'
  | 'countryIds'
  | 'historicalCountryIds'
  | 'categoryId'
  | 'decade'
  | 'century'
  | 'hasNoDescription'
  | 'hasNoCountries'
  | 'hasNoKeywords'
>

/**
 * Lens 칩 배열 → useEvents 옵션. 같은 kind는 한 번만 활성화되므로 단순 매핑.
 * 다중 country/hcountry는 같은 kind가 여러 개 있을 수 있는 형태로 확장 가능하나,
 * 현 use-ledger-state는 kind당 1개로 제약 — 단일 값을 배열에 담아 전달한다.
 */
const lensToEventsOptions = (
  lens: LensChip[],
  countryId?: string | null,
): EventsLensOptions => {
  const opts: EventsLensOptions = {
    countryId: countryId ?? undefined,
  }
  for (const chip of lens) {
    switch (chip.kind) {
      case 'country':
        opts.countryIds = [...(opts.countryIds ?? []), chip.value]
        break
      case 'hcountry':
        opts.historicalCountryIds = [
          ...(opts.historicalCountryIds ?? []),
          chip.value,
        ]
        break
      case 'category':
        opts.categoryId = chip.value
        break
      case 'decade': {
        const num = parseInt(chip.value, 10)
        if (!Number.isNaN(num)) opts.decade = num
        break
      }
      case 'century': {
        const num = parseInt(chip.value, 10)
        if (!Number.isNaN(num)) opts.century = num
        break
      }
      case 'quality':
        if (chip.value === 'missing-description') opts.hasNoDescription = true
        else if (chip.value === 'no-countries') opts.hasNoCountries = true
        else if (chip.value === 'no-keywords') opts.hasNoKeywords = true
        break
    }
  }
  return opts
}

export function useLedgerData(
  countryId?: string | null,
  lens: LensChip[] = [],
) {
  const eventsOptions = useMemo(
    () => lensToEventsOptions(lens, countryId),
    [lens, countryId],
  )
  const {
    events,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasMore,
    fetchMoreEvents,
  } = useEvents(eventsOptions)

  const [dbCategories, setDbCategories] = useState<EventCategoryDto[]>([])
  const [countries, setCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [dictError, setDictError] = useState<Error | null>(null)
  const [dictLoading, setDictLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setDictLoading(true)
    setDictError(null)
    Promise.all([
      getAllEventCategories(),
      getAllCountries(),
      getAllHistoricalCountries(),
    ])
      .then(([cats, modern, historical]) => {
        if (cancelled) return
        setDbCategories(cats)
        setCountries(modern)
        setHistoricalCountries(historical)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDictError(err instanceof Error ? err : new Error('failed to load'))
      })
      .finally(() => {
        if (cancelled) return
        setDictLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const countryDict = useMemo<CountryDict>(() => {
    const byId = new Map<string, { id: string; name: string; flagEmoji?: string }>()
    for (const item of countries) byId.set(item.id, item)
    return { byId }
  }, [countries])

  const hCountryDict = useMemo<HistoricalCountryDict>(() => {
    const byId = new Map<string, { id: string; name: string }>()
    for (const item of historicalCountries) byId.set(item.id, item)
    return { byId }
  }, [historicalCountries])

  const categoryDict = useMemo<CategoryDict>(() => {
    const byId = new Map<string, EventCategoryDto>()
    const byName = new Map<string, EventCategoryDto>()
    for (const item of dbCategories) {
      byId.set(item.id, item)
      byName.set(item.name, item)
    }
    return { byId, byName }
  }, [dbCategories])

  /**
   * 칩 → 사람용 라벨. chip.label이 있으면 그 값을 우선,
   * 없으면 사전에서 찾고, 사전 미적중 시 value를 fallback.
   */
  const resolveChipLabel = useCallback(
    (chip: LensChip): string => {
      if (chip.label) return chip.label
      if (chip.kind === 'country') {
        return countryDict.byId.get(chip.value)?.name ?? chip.value
      }
      if (chip.kind === 'hcountry') {
        return hCountryDict.byId.get(chip.value)?.name ?? chip.value
      }
      if (chip.kind === 'category') {
        // chip.value === categoryId — DB 사전에서 이름으로 풀어준다
        return (
          categoryDict.byId.get(chip.value)?.name ??
          categoryDict.byName.get(chip.value)?.name ??
          chip.value
        )
      }
      if (chip.kind === 'decade') return `${chip.value}년대`
      if (chip.kind === 'century') return `${chip.value}세기`
      if (chip.kind === 'quality') {
        return QUALITY_LABELS[chip.value] ?? chip.value
      }
      return chip.value
    },
    [countryDict, hCountryDict, categoryDict],
  )

  return {
    events,
    isLoading: isLoading || dictLoading,
    isFetching,
    isFetchingNextPage,
    hasMore,
    fetchMoreEvents,
    isError: dictError !== null,
    error: dictError,
    dbCategories,
    countries,
    historicalCountries,
    countryDict,
    hCountryDict,
    categoryDict,
    resolveChipLabel,
  }
}
