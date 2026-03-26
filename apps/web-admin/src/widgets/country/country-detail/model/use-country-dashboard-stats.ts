import { useMemo } from 'react'

import { useQueries } from '@tanstack/react-query'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { cityApi } from '@/shared/api/city'
import { getAllEvents } from '@/shared/api/events'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { getPersonsByTenureCountry } from '@/shared/api/persons'
import { administrationDepartmentsByCountryQueryKey } from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

export interface RecentPersonItem {
  id: string
  displayName: string
  createdAt: string
  profileImageUrl?: string | null
}

export interface CountryDashboardStats {
  personCount: number
  militaryCount: number
  eventCount: number
  historicalCountryCount: number
  administrationCount: number
  cityCount: number
  recentPersons: RecentPersonItem[]
  isLoading: boolean
}

/**
 * 국가 상세 대시보드용 요약 수치 및 등록 현황
 */
export function useCountryDashboardStats(
  country: UnifiedCountry | null,
): CountryDashboardStats {
  const countryId = country?.id ?? ''
  const isModern = country?.type === 'modern'

  const [
    personsQuery,
    militaryQuery,
    eventsQuery,
    administrationQuery,
    citiesQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: ['persons-by-country', countryId],
        queryFn: () => getPersonsByTenureCountry({ countryId }),
        enabled: Boolean(countryId && isModern),
      },
      {
        queryKey: ['military-units'],
        queryFn: () => militaryUnitApi.getAll(),
        enabled: Boolean(countryId && isModern),
      },
      {
        queryKey: ['events-all-for-count'],
        queryFn: () => getAllEvents({ limit: 2000 }),
        enabled: Boolean(countryId && isModern),
      },
      {
        queryKey: administrationDepartmentsByCountryQueryKey(countryId),
        queryFn: () => administrationDepartmentApi.getByCountryId(countryId),
        enabled: Boolean(countryId && isModern),
      },
      {
        queryKey: ['cities-by-country', countryId],
        queryFn: () => cityApi.getByCountryId(countryId),
        enabled: Boolean(countryId && isModern),
      },
    ],
  })

  const personCount = personsQuery.data?.length ?? 0
  const militaryCount = Array.isArray(militaryQuery.data)
    ? militaryQuery.data.filter(
        (u) => (u.countryId ?? (u as any).country_id) === countryId,
      ).length
    : 0
  const eventCount = Array.isArray(eventsQuery.data)
    ? eventsQuery.data.filter((e) =>
        (e.countries ?? []).some((c: { id?: string }) => c.id === countryId),
      ).length
    : 0
  const historicalCountryCount = country?.historicalCountries?.length ?? 0
  const administrationCount = Array.isArray(administrationQuery.data)
    ? administrationQuery.data.length
    : 0
  const cityCount = Array.isArray(citiesQuery.data)
    ? citiesQuery.data.length
    : 0

  const recentPersons = useMemo((): RecentPersonItem[] => {
    const list = personsQuery.data ?? []
    const withDate = list.map(
      (p: {
        id?: string
        name?: string | null
        surname?: string | null
        createdAt?: string
        profileImageUrl?: string | null
      }) => ({
        ...p,
        _createdAt: p.createdAt ?? (p as any).created_at ?? '',
      }),
    )
    withDate.sort(
      (a, b) =>
        new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime(),
    )
    return withDate.slice(0, 7).map((p) => {
      const person = p as {
        id?: string
        name?: string | null
        surname?: string | null
        middleName?: string | null
        country?: { defaultNameDisplayOrder?: string | null } | null
        profileImageUrl?: string | null
        created_at?: string
      }
      const order =
        person.country?.defaultNameDisplayOrder ??
        country?.defaultNameDisplayOrder ??
        null
      const displayName =
        getPersonDisplayName(
          {
            name: person.name ?? '',
            surname: person.surname,
            middleName: person.middleName,
            country: person.country ?? undefined,
          },
          order != null ? { countryDefaultNameDisplayOrder: order } : undefined,
        ) ||
        person.name ||
        person.surname ||
        '이름 없음'
      return {
        id: person.id ?? '',
        displayName,
        createdAt: (p as any)._createdAt,
        profileImageUrl: person.profileImageUrl ?? (p as any).profile_image_url,
      }
    })
  }, [personsQuery.data, country?.defaultNameDisplayOrder])

  const isLoading =
    (isModern && personsQuery.isLoading) ||
    (isModern && militaryQuery.isLoading) ||
    (isModern && eventsQuery.isLoading) ||
    (isModern && administrationQuery.isLoading) ||
    (isModern && citiesQuery.isLoading)

  return {
    personCount,
    militaryCount,
    eventCount,
    historicalCountryCount,
    administrationCount,
    cityCount,
    recentPersons,
    isLoading,
  }
}
