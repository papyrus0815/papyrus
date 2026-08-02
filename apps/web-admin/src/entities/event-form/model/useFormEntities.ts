/**
 * Event Form Entities - Data Loading Hook
 * FSD: entities/event-form/model
 *
 * 폼에 필요한 엔티티 데이터를 로드합니다.
 * refetch()로 최신 데이터를 다시 불러올 수 있음 (예: 인물 등록 모달 닫은 뒤 엔티티 연결에서 검색 시).
 *
 * `only` 옵션으로 **필요한 엔티티만** 받을 수 있습니다. 사건 기본 정보 폼처럼 3종만 쓰는
 * 화면이 8개 API(그중 `getAllEvents()`는 사건 전량 조회)를 매번 부르던 낭비를 없앱니다.
 *
 * ⚠️ 부분 로드 결과는 **절대 공용 캐시에 쓰지 않습니다**. 캐시는 모듈 전역 단일 스냅샷이라
 * 부분 스냅샷을 써 넣으면, 8종을 전부 기대하는 화면(국가 상세의 사건 등록 폼 등)이
 * 그 캐시를 집어 빈 배열을 받게 됩니다. 부분 로드는 캐시를 *읽기만* 합니다.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

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

/** `only`로 지정 가능한 엔티티 키 */
export type FormEntityKey =
  | 'persons'
  | 'countries'
  | 'historicalCountries'
  | 'categories'
  | 'militaryUnits'
  | 'events'
  | 'dynasties'
  | 'politicalParties'

export const ALL_FORM_ENTITY_KEYS: readonly FormEntityKey[] = [
  'persons',
  'countries',
  'historicalCountries',
  'categories',
  'militaryUnits',
  'events',
  'dynasties',
  'politicalParties',
]

export interface UseFormEntitiesOptions {
  /**
   * 로드할 엔티티. 미지정이면 8종 전부.
   * 부분 지정 시 나머지는 빈 배열로 남고 네트워크 호출도 하지 않는다.
   */
  only?: readonly FormEntityKey[]
}

const emptySnapshot = (): EntitiesSnapshot => ({
  availablePersons: [],
  availableCountries: [],
  availableHistoricalCountries: [],
  dbCategories: [],
  availableMilitaryUnits: [],
  availableEvents: [],
  availableDynasties: [],
  availablePoliticalParties: [],
})

let cachedSnapshot: EntitiesSnapshot | null = null
let cachedAt = 0
/** 전체 로드 전용 in-flight 공유. 부분 로드는 키 조합이 달라 공유하지 않는다. */
let inflightFull: Promise<EntitiesSnapshot> | null = null

/** 키별 fetch + 스냅샷 슬롯 대응표 — 새 엔티티 추가 시 여기 한 곳만 늘리면 된다. */
const LOADERS: {
  [Key in FormEntityKey]: (snapshot: EntitiesSnapshot) => Promise<void>
} = {
  persons: async (snapshot) => {
    snapshot.availablePersons = await getAllPersons()
  },
  countries: async (snapshot) => {
    snapshot.availableCountries = await getAllCountries()
  },
  historicalCountries: async (snapshot) => {
    snapshot.availableHistoricalCountries = await getAllHistoricalCountries()
  },
  categories: async (snapshot) => {
    snapshot.dbCategories = await getAllEventCategories()
  },
  militaryUnits: async (snapshot) => {
    snapshot.availableMilitaryUnits = await militaryUnitApi.getAll()
  },
  events: async (snapshot) => {
    snapshot.availableEvents = await getAllEvents()
  },
  dynasties: async (snapshot) => {
    snapshot.availableDynasties = await dynastyApi.getAll()
  },
  politicalParties: async (snapshot) => {
    snapshot.availablePoliticalParties = await politicalPartyApi.getAll()
  },
}

/**
 * 요청한 키만 병렬 로드. 개별 실패는 빈 배열로 흡수(기존 allSettled 동작 유지) —
 * 한 엔티티가 죽어도 폼 전체가 못 열리는 일은 없어야 한다.
 */
const fetchEntities = async (
  keys: readonly FormEntityKey[],
): Promise<EntitiesSnapshot> => {
  const snapshot = emptySnapshot()
  await Promise.allSettled(keys.map((key) => LOADERS[key](snapshot)))
  return snapshot
}

export const useFormEntities = (options?: UseFormEntitiesOptions) => {
  /**
   * `only`를 인라인 배열로 넘겨도 매 렌더 새 참조가 되지 않도록 정렬·직렬화한 키로 고정.
   * 이 문자열이 곧 로드 단위의 정체성이다.
   */
  const onlyKey = useMemo(() => {
    const keys = options?.only ? [...options.only] : [...ALL_FORM_ENTITY_KEYS]
    return keys.sort().join(',')
  }, [options?.only])

  const requestedKeys = useMemo(
    () => onlyKey.split(',') as FormEntityKey[],
    [onlyKey],
  )
  const isFullLoad = requestedKeys.length === ALL_FORM_ENTITY_KEYS.length

  const [snapshot, setSnapshot] = useState<EntitiesSnapshot>(
    () => cachedSnapshot ?? emptySnapshot(),
  )
  // 신선한 캐시가 있으면 초기 로딩 표시도 띄우지 않음(전체 캐시는 부분 요청도 덮는다)
  const [isLoading, setIsLoading] = useState(
    !cachedSnapshot || Date.now() - cachedAt > CACHE_TTL_MS,
  )

  const loadEntities = useCallback(
    async (force = false) => {
      // 신선한 전체 캐시가 있으면 즉시 반환 — 부분 요청도 전체 캐시로 충족된다.
      if (!force && cachedSnapshot && Date.now() - cachedAt < CACHE_TTL_MS) {
        setSnapshot(cachedSnapshot)
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        if (isFullLoad) {
          // 동시에 여러 마운트가 있어도 1개의 fetch만 돔
          if (!inflightFull) {
            inflightFull = fetchEntities(ALL_FORM_ENTITY_KEYS)
          }
          try {
            const loaded = await inflightFull
            cachedSnapshot = loaded
            cachedAt = Date.now()
            setSnapshot(loaded)
          } finally {
            inflightFull = null
          }
        } else {
          // 부분 로드 — 공용 캐시에 쓰지 않는다(전역 단일 스냅샷 오염 방지).
          setSnapshot(await fetchEntities(requestedKeys))
        }
      } finally {
        setIsLoading(false)
      }
    },
    [isFullLoad, requestedKeys],
  )

  useEffect(() => {
    loadEntities()
  }, [loadEntities])

  return {
    availablePersons: snapshot.availablePersons,
    availableCountries: snapshot.availableCountries,
    availableHistoricalCountries: snapshot.availableHistoricalCountries,
    dbCategories: snapshot.dbCategories,
    availableMilitaryUnits: snapshot.availableMilitaryUnits,
    availableEvents: snapshot.availableEvents,
    availableDynasties: snapshot.availableDynasties,
    availablePoliticalParties: snapshot.availablePoliticalParties,
    isLoading,
    /** 강제 새로고침 — 캐시 TTL 무시하고 다시 받음 */
    refetch: () => loadEntities(true),
  }
}
