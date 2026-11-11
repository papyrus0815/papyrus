import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  DEPARTMENT_KIND_LABEL,
  administrationDepartmentApi,
} from '@/shared/api/administration-department'
import { apiConnection } from '@/shared/api/client'
import { getOrganizations } from '@/shared/api/organizations'
import { personCareerApi } from '@/shared/api/person-career'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { parseDepartmentDescription } from '@/shared/lib/ministry-department/ministry-department-utils'

export type GovernmentStatisticTimelineItem = {
  id: string
  year: string
  sortYear: number
  title: string
  description: string
  type: 'establishment' | 'reform' | 'achievement' | 'crisis' | 'merger'
  orgName: string
  orgType: string
  images?: string[]
}

export type GovernmentCategoryStatRow = {
  year: string
  budget: number
}

export type GovernmentStatisticsOptions = {
  country?: UnifiedCountry
  effectiveCountryId?: string
}

function formatStructuredYear(
  era: string | null | undefined,
  year: number | null | undefined,
  isoDate: string | null | undefined,
): { label: string; sortYear: number } | null {
  if (year != null) {
    const isBc = era === 'BC'
    return {
      label: isBc ? `BC ${year}` : `${year}`,
      sortYear: isBc ? -year : year,
    }
  }
  if (!isoDate) return null
  const trimmed = isoDate.trim()
  const bcMatch = /^-\d+/.exec(trimmed)
  if (bcMatch) {
    const num = Math.abs(parseInt(bcMatch[0], 10))
    return { label: `BC ${num}`, sortYear: -num }
  }
  const yearMatch = /^(\d{1,4})/.exec(trimmed)
  if (yearMatch) {
    const num = parseInt(yearMatch[1], 10)
    return { label: `${num}`, sortYear: num }
  }
  return null
}

/**
 * 통계 탭 전용 — 조회 중인 국가의 실제 행정부처·내각·직위 정의·산하조직 데이터를 기반으로 집계한다.
 */
export function useGovernmentStatisticsMockData(
  options?: GovernmentStatisticsOptions,
) {
  const [selectedEventType, setSelectedEventType] = useState<string>('all')
  const country = options?.country
  const effectiveCountryId = options?.effectiveCountryId ?? country?.id
  const isHistorical = country?.type === 'historical'
  const queryCountryId = isHistorical ? undefined : effectiveCountryId
  const queryHistoricalCountryId = isHistorical ? effectiveCountryId : undefined

  const { data: departments = [] } = useQuery({
    queryKey: isHistorical
      ? administrationDepartmentsByHistoricalCountryQueryKey(effectiveCountryId)
      : administrationDepartmentsByCountryQueryKey(effectiveCountryId),
    queryFn: () =>
      isHistorical
        ? administrationDepartmentApi.getByHistoricalCountryId(
            effectiveCountryId!,
          )
        : administrationDepartmentApi.getByCountryId(effectiveCountryId!),
    enabled: Boolean(effectiveCountryId),
  })

  const { data: cabinets = [] } = useQuery({
    queryKey: [
      'cabinets-by-country',
      queryCountryId ?? '',
      queryHistoricalCountryId ?? null,
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: queryCountryId || undefined,
        historicalCountryId: queryHistoricalCountryId || undefined,
      }),
    enabled: Boolean(effectiveCountryId),
  })

  const { data: positionDefinitions = [] } = useQuery({
    queryKey: [
      'position-definitions-stats',
      queryCountryId ?? '',
      queryHistoricalCountryId ?? null,
    ],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId: queryCountryId || undefined,
        historicalCountryId: queryHistoricalCountryId || undefined,
      }),
    enabled: Boolean(effectiveCountryId),
  })

  const { data: organizations = [] } = useQuery({
    queryKey: [
      'organizations-by-country-stats',
      effectiveCountryId,
      country?.type,
    ],
    queryFn: () =>
      getOrganizations(
        apiConnection,
        isHistorical
          ? { historicalCountryId: effectiveCountryId }
          : { countryId: effectiveCountryId },
      ),
    enabled: Boolean(effectiveCountryId),
  })

  const base = useMemo(() => {
    const ministryDepts = departments.filter(
      (dept) => (dept.kind ?? 'MINISTRY') === 'MINISTRY',
    )
    const agencyDepts = departments.filter((dept) => dept.kind === 'AGENCY')
    const specialDepts = departments.filter(
      (dept) =>
        dept.kind != null &&
        dept.kind !== 'MINISTRY' &&
        dept.kind !== 'AGENCY',
    )
    const activeDepartmentCount = departments.filter(
      (dept) => !dept.abolishedDate && dept.abolishedYear == null,
    ).length
    const totalMinistries = ministryDepts.length
    const totalConstitutional = specialDepts.length
    const totalAgencies = agencyDepts.length
    const totalLocal = organizations.length
    const totalOrganizations = departments.length + organizations.length
    const totalCabinets = cabinets.length
    const totalPositions = positionDefinitions.length
    const totalMilitaryUnits = departments.reduce(
      (sum, dept) => sum + (dept.militaryUnits?.length ?? 0),
      0,
    )

    // 카테고리별 기관 분포 (막대 차트용)
    const categoryCountMap = new Map<string, number>()
    for (const dept of departments) {
      const catName = dept.category?.name?.trim() || '미분류'
      categoryCountMap.set(catName, (categoryCountMap.get(catName) ?? 0) + 1)
    }
    const budgetData: GovernmentCategoryStatRow[] = Array.from(
      categoryCountMap.entries(),
    )
      .sort((entryA, entryB) => entryB[1] - entryA[1])
      .slice(0, 8)
      .map(([catName, count]) => ({
        year: catName,
        budget: count,
      }))

    const allEvents: GovernmentStatisticTimelineItem[] = []
    for (const dept of departments) {
      const kindLabel =
        DEPARTMENT_KIND_LABEL[dept.kind ?? 'MINISTRY'] ?? '중앙부처'
      const cleanDesc = parseDepartmentDescription(
        dept.description,
      ).cleanDescription
      const est = formatStructuredYear(
        dept.establishedInfo?.era,
        dept.establishedInfo?.year,
        dept.establishedDate,
      )
      if (est) {
        allEvents.push({
          id: `est-${dept.id}`,
          year: est.label,
          sortYear: est.sortYear,
          title: `${dept.name} 설립`,
          description:
            cleanDesc || `${dept.name}(${kindLabel}) 기관이 설립되었습니다.`,
          type: 'establishment',
          orgName: dept.name,
          orgType: kindLabel,
          images: dept.thumbnailUrl ? [dept.thumbnailUrl] : undefined,
        })
      }
      const abo = formatStructuredYear(
        dept.abolishedInfo?.era,
        dept.abolishedInfo?.year,
        dept.abolishedDate,
      )
      if (abo) {
        allEvents.push({
          id: `abo-${dept.id}`,
          year: abo.label,
          sortYear: abo.sortYear,
          title: `${dept.name} 폐지`,
          description: `${dept.name}(${kindLabel}) 기관이 폐지되었습니다.`,
          type: 'crisis',
          orgName: dept.name,
          orgType: kindLabel,
          images: dept.thumbnailUrl ? [dept.thumbnailUrl] : undefined,
        })
      }
      for (const succ of dept.successors ?? []) {
        const trYear =
          succ.year != null
            ? {
                label: succ.era === 'BC' ? `BC ${succ.year}` : `${succ.year}`,
                sortYear: succ.era === 'BC' ? -succ.year : succ.year,
              }
            : abo
        const isMerger = succ.kind === 'MERGE' || succ.kind === 'ABSORB'
        allEvents.push({
          id: `tr-${succ.transitionId}`,
          year: trYear?.label ?? '개편',
          sortYear: trYear?.sortYear ?? 0,
          title: `${dept.name} → ${succ.department.name}`,
          description:
            succ.note ||
            `${dept.name}에서 ${succ.department.name}(으)로 계보가 이어졌습니다.`,
          type: isMerger ? 'merger' : 'reform',
          orgName: dept.name,
          orgType: kindLabel,
          images: dept.thumbnailUrl ? [dept.thumbnailUrl] : undefined,
        })
      }
    }

    allEvents.sort((eventA, eventB) => eventB.sortYear - eventA.sortYear)

    const eventCounts = {
      all: allEvents.length,
      establishment: allEvents.filter((event) => event.type === 'establishment')
        .length,
      reform: allEvents.filter((event) => event.type === 'reform').length,
      achievement: allEvents.filter((event) => event.type === 'achievement')
        .length,
      crisis: allEvents.filter((event) => event.type === 'crisis').length,
      merger: allEvents.filter((event) => event.type === 'merger').length,
    }

    return {
      totalDepartments: departments.length,
      activeDepartmentCount,
      totalMinistries,
      totalConstitutional,
      totalAgencies,
      totalLocal,
      totalOrganizations,
      totalCabinets,
      totalPositions,
      totalMilitaryUnits,
      totalBudget: String(totalCabinets),
      totalEmployees: totalPositions.toLocaleString(),
      ministryExamples: ministryDepts.slice(0, 3).map((dept) => dept.name),
      agencyExamples: agencyDepts.slice(0, 3).map((dept) => dept.name),
      specialExamples: specialDepts.slice(0, 3).map((dept) => dept.name),
      organizationExamples: organizations.slice(0, 3).map((org) => org.name),
      allEvents,
      eventCounts,
      budgetData,
    }
  }, [departments, cabinets, positionDefinitions, organizations])

  const filteredEvents = useMemo(() => {
    if (selectedEventType === 'all') return base.allEvents
    return base.allEvents.filter((event) => event.type === selectedEventType)
  }, [base.allEvents, selectedEventType])

  return {
    ...base,
    filteredEvents,
    selectedEventType,
    onSelectedEventTypeChange: setSelectedEventType,
  }
}
