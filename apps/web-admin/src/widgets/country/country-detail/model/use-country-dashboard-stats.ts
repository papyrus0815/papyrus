import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { cityApi } from '@/shared/api/city'
import { getAllEvents } from '@/shared/api/events'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { personApi } from '@/shared/api/person'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'

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
export function useCountryDashboardStats(country: UnifiedCountry | null): CountryDashboardStats {
  const countryId = country?.id ?? ''
  const isModern = country?.type === 'modern'

  const [personsQuery, militaryQuery, eventsQuery, administrationQuery, citiesQuery] =
    useQueries({
      queries: [
        {
          queryKey: ['persons-by-country', countryId],
          queryFn: () => personApi.getByCountryId(countryId),
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
          queryKey: ['administration-departments-by-country', countryId],
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
    ? militaryQuery.data.filter((u) => (u.countryId ?? (u as any).country_id) === countryId).length
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
  const cityCount = Array.isArray(citiesQuery.data) ? citiesQuery.data.length : 0

  const recentPersons = useMemo((): RecentPersonItem[] => {
    const list = personsQuery.data ?? []
    const withDate = list.map((p: { id?: string; name?: string | null; surname?: string | null; createdAt?: string; profileImageUrl?: string | null }) => ({
      ...p,
      _createdAt: p.createdAt ?? (p as any).created_at ?? '',
    }))
    withDate.sort((a, b) => new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime())
    return withDate.slice(0, 7).map((p) => ({
      id: p.id ?? '',
      displayName: [p.surname, p.name].filter(Boolean).join(' ') || p.name || p.surname || '이름 없음',
      createdAt: (p as any)._createdAt,
      profileImageUrl: p.profileImageUrl ?? (p as any).profile_image_url,
    }))
  }, [personsQuery.data])

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
