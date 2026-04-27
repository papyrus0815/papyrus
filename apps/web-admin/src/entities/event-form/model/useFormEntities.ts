/**
 * Event Form Entities - Data Loading Hook
 * FSD: entities/event-form/model
 *
 * 폼에 필요한 모든 엔티티 데이터를 로드합니다.
 * refetch()로 최신 데이터를 다시 불러올 수 있음 (예: 인물 등록 모달 닫은 뒤 엔티티 연결에서 검색 시).
 */

import { useCallback, useEffect, useState } from 'react'

import { getAllCountries, type CountryResponseDto } from '@/shared/api/countries'
import { dynastyApi, type Dynasty } from '@/shared/api/dynasty'
import { getAllEventCategories, type EventCategoryDto } from '@/shared/api/event-categories'
import { getAllEvents, type EventResponseDto } from '@/shared/api/events'
import { getAllHistoricalCountries, type HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { militaryUnitApi, type MilitaryUnit } from '@/shared/api/military-unit'
import { getAllPersons, type PersonResponseDto } from '@/shared/api/persons'
import { politicalPartyApi, type PoliticalParty } from '@/shared/api/political-party'

/**
 * 폼 진입마다 8개 API를 다시 호출하던 성능 부담을 줄이기 위한 세션-내 메모리 캐시.
 * TTL 안에는 마지막 응답을 즉시 반환하고, 만료 후엔 다시 가져옴.
 * 명시적 refetch()는 캐시를 무시하고 다시 받음.
 */
const CACHE_TTL_MS = 60_000

interface EntitiesSnapshot {
  availablePersons: PersonResponseDto[]
  availableCountries: CountryResponseDto[]
  availableHistoricalCountries: HistoricalCountryResponseDto[]
  dbCategories: EventCategoryDto[]
  availableMilitaryUnits: MilitaryUnit[]
  availableEvents: EventResponseDto[]
  availableDynasties: Dynasty[]
  availablePoliticalParties: PoliticalParty[]
}

let cachedSnapshot: EntitiesSnapshot | null = null
let cachedAt = 0
let inflight: Promise<EntitiesSnapshot> | null = null

const fetchEntities = async (): Promise<EntitiesSnapshot> => {
  const settled = await Promise.allSettled([
    getAllPersons(),
    getAllCountries(),
    getAllHistoricalCountries(),
    getAllEventCategories(),
    militaryUnitApi.getAll(),
    getAllEvents(),
    dynastyApi.getAll(),
    politicalPartyApi.getAll(),
  ])
  const valueOr = <T,>(p: PromiseSettledResult<T>, fallback: T): T =>
    p.status === 'fulfilled' ? p.value : fallback
  return {
    availablePersons: valueOr(settled[0], [] as PersonResponseDto[]),
    availableCountries: valueOr(settled[1], [] as CountryResponseDto[]),
    availableHistoricalCountries: valueOr(
      settled[2],
      [] as HistoricalCountryResponseDto[],
    ),
    dbCategories: valueOr(settled[3], [] as EventCategoryDto[]),
    availableMilitaryUnits: valueOr(settled[4], [] as MilitaryUnit[]),
    availableEvents: valueOr(settled[5], [] as EventResponseDto[]),
    availableDynasties: valueOr(settled[6], [] as Dynasty[]),
    availablePoliticalParties: valueOr(
      settled[7],
      [] as PoliticalParty[],
    ),
  }
}

export const useFormEntities = () => {
  const [availablePersons, setAvailablePersons] = useState<PersonResponseDto[]>(
    cachedSnapshot?.availablePersons ?? [],
  )
  const [availableCountries, setAvailableCountries] = useState<
    CountryResponseDto[]
  >(cachedSnapshot?.availableCountries ?? [])
  const [availableHistoricalCountries, setAvailableHistoricalCountries] =
    useState<HistoricalCountryResponseDto[]>(
      cachedSnapshot?.availableHistoricalCountries ?? [],
    )
  const [dbCategories, setDbCategories] = useState<EventCategoryDto[]>(
    cachedSnapshot?.dbCategories ?? [],
  )
  const [availableMilitaryUnits, setAvailableMilitaryUnits] = useState<
    MilitaryUnit[]
  >(cachedSnapshot?.availableMilitaryUnits ?? [])
  const [availableEvents, setAvailableEvents] = useState<EventResponseDto[]>(
    cachedSnapshot?.availableEvents ?? [],
  )
  const [availableDynasties, setAvailableDynasties] = useState<Dynasty[]>(
    cachedSnapshot?.availableDynasties ?? [],
  )
  const [availablePoliticalParties, setAvailablePoliticalParties] = useState<
    PoliticalParty[]
  >(cachedSnapshot?.availablePoliticalParties ?? [])
  // 신선한 캐시가 있으면 초기 로딩 표시도 띄우지 않음
  const [isLoading, setIsLoading] = useState(
    !cachedSnapshot || Date.now() - cachedAt > CACHE_TTL_MS,
  )

  const applySnapshot = useCallback((s: EntitiesSnapshot) => {
    setAvailablePersons(s.availablePersons)
    setAvailableCountries(s.availableCountries)
    setAvailableHistoricalCountries(s.availableHistoricalCountries)
    setDbCategories(s.dbCategories)
    setAvailableMilitaryUnits(s.availableMilitaryUnits)
    setAvailableEvents(s.availableEvents)
    setAvailableDynasties(s.availableDynasties)
    setAvailablePoliticalParties(s.availablePoliticalParties)
  }, [])

  const loadEntities = useCallback(
    async (force = false) => {
      // 신선한 캐시가 있으면 즉시 반환 — 폼 재진입 시 네트워크 8회 절약
      if (!force && cachedSnapshot && Date.now() - cachedAt < CACHE_TTL_MS) {
        applySnapshot(cachedSnapshot)
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        // 동시에 여러 마운트가 있어도 1개의 fetch만 돔
        if (!inflight) {
          inflight = fetchEntities()
        }
        const snap = await inflight
        cachedSnapshot = snap
        cachedAt = Date.now()
        applySnapshot(snap)
      } finally {
        inflight = null
        setIsLoading(false)
      }
    },
    [applySnapshot],
  )

  useEffect(() => {
    loadEntities()
  }, [loadEntities])

  return {
    availablePersons,
    availableCountries,
    availableHistoricalCountries,
    dbCategories,
    availableMilitaryUnits,
    availableEvents,
    availableDynasties,
    availablePoliticalParties,
    isLoading,
    /** 강제 새로고침 — 캐시 TTL 무시하고 다시 받음 */
    refetch: () => loadEntities(true),
  }
}

