import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { usePoliticalSystems } from '@/entities/political-system/api'
import { GOVERNMENT_FORM_LABEL } from '@/entities/political-system/model/political-system'
import {
  DEPARTMENT_KIND_LABEL,
  administrationDepartmentApi,
} from '@/shared/api/administration-department'
import { apiConnection } from '@/shared/api/client'
import { getOrganizations } from '@/shared/api/organizations'
import { personCareerApi } from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  resolveCabinetEffectiveDates,
  shouldHideCabinetFromExecutiveTimeline,
} from '@/shared/lib/ministry-department/department-cabinet-matcher'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { parseDepartmentDescription } from '@/shared/lib/ministry-department/ministry-department-utils'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { countCountryScopedPositions } from './count-country-scoped-positions'
import { useConstituentHistoricalPolities } from './use-constituent-historical-polities'

export type GovernmentStatisticTimelineItem = {
  id: string
  year: string
  sortYear: number
  title: string
  description: string
  type:
    | 'establishment'
    | 'reform'
    | 'achievement'
    | 'crisis'
    | 'merger'
    | 'regime'
    | 'cabinet'
  orgName: string
  orgType: string
  images?: string[]
  targetKind?: 'department' | 'cabinet' | 'system'
  targetId?: string
}

export type GovernmentCategoryStatRow = {
  categoryName: string
  departmentCount: number
  categoryId?: string | null
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
 * 통계·연혁 탭 전용 — 조회 중인 국가의 실제 정체·행정부·중앙부처·고유 관직·산하조직 데이터를 집계한다.
 */
export function useGovernmentStatistics(options?: GovernmentStatisticsOptions) {
  const [selectedEventType, setSelectedEventType] = useState<string>('all')
  const country = options?.country
  const effectiveCountryId = options?.effectiveCountryId ?? country?.id
  const isHistorical = country?.type === 'historical'
  const queryCountryId = isHistorical ? undefined : effectiveCountryId
  const queryHistoricalCountryId = isHistorical ? effectiveCountryId : undefined

  const { data: constituentPolities = [] } = useConstituentHistoricalPolities(
    isHistorical ? effectiveCountryId : undefined,
  )

  const { data: departments = [] } = useQuery({
    queryKey: isHistorical
      ? administrationDepartmentsByHistoricalCountryQueryKey(
          effectiveCountryId,
          { includeConstituents: true },
        )
      : administrationDepartmentsByCountryQueryKey(effectiveCountryId),
    queryFn: () =>
      isHistorical
        ? administrationDepartmentApi.getByHistoricalCountryId(
            effectiveCountryId!,
            { includeConstituents: true },
          )
        : administrationDepartmentApi.getByCountryId(effectiveCountryId!),
    enabled: Boolean(effectiveCountryId),
  })

  const { data: cabinets = [] } = useQuery({
    queryKey: [
      'cabinets-by-country',
      queryCountryId ?? '',
      queryHistoricalCountryId ?? null,
      ...(isHistorical ? (['with-constituents'] as const) : []),
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: queryCountryId || undefined,
        historicalCountryId: queryHistoricalCountryId || undefined,
        includeConstituents: isHistorical || undefined,
      }),
    enabled: Boolean(effectiveCountryId),
  })

  const { data: positionDefinitions = [] } = useQuery({
    queryKey: ['position-definitions', 'all'],
    queryFn: () => personCareerApi.getPositionDefinitions({}),
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

  const { data: politicalSystems = [] } = usePoliticalSystems({
    countryId: queryCountryId,
    historicalCountryId: queryHistoricalCountryId,
    includeConstituents: isHistorical || undefined,
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
      (dept) => !dept.abolishedDate && dept.abolished?.year == null,
    ).length
    const totalMinistries = ministryDepts.length
    const totalConstitutional = specialDepts.length
    const totalAgencies = agencyDepts.length
    const totalLocal = organizations.length
    const totalOrganizations = departments.length + organizations.length

    const visibleCabinets = cabinets.filter(
      (cabItem) =>
        !shouldHideCabinetFromExecutiveTimeline(cabItem.headTenure, cabItem),
    )
    const totalCabinets = visibleCabinets.length
    const totalPositions = countCountryScopedPositions(
      positionDefinitions,
      country,
      constituentPolities,
    )

    const uniqueMilitaryUnitIds = new Set<string>()
    for (const dept of departments) {
      for (const unitRef of dept.militaryUnits ?? []) {
        if (unitRef.id) uniqueMilitaryUnitIds.add(unitRef.id)
      }
    }
    const totalMilitaryUnits = uniqueMilitaryUnitIds.size

    const categoryCountMap = new Map<
      string,
      { count: number; categoryId: string | null }
    >()
    for (const dept of departments) {
      const catName = dept.category?.name?.trim() || '미분류'
      const prevEntry = categoryCountMap.get(catName)
      categoryCountMap.set(catName, {
        count: (prevEntry?.count ?? 0) + 1,
        categoryId: prevEntry?.categoryId ?? dept.categoryId ?? null,
      })
    }
    const categoryStats: GovernmentCategoryStatRow[] = Array.from(
      categoryCountMap.entries(),
    )
      .sort((entryA, entryB) => entryB[1].count - entryA[1].count)
      .slice(0, 8)
      .map(([catName, entryValue]) => ({
        categoryName: catName,
        departmentCount: entryValue.count,
        categoryId: entryValue.categoryId,
      }))

    const allEvents: GovernmentStatisticTimelineItem[] = []

    for (const systemItem of politicalSystems) {
      const sysYear = formatStructuredYear(
        systemItem.startEra,
        systemItem.startYear,
        null,
      )
      if (!sysYear) continue
      const formLabel = systemItem.governmentForm
        ? GOVERNMENT_FORM_LABEL[systemItem.governmentForm]
        : '정체 변천'
      const systemDisplayName = systemItem.name?.trim() || formLabel
      const polityPrefix = systemItem.historicalCountry?.name
        ? `[${systemItem.historicalCountry.name}] `
        : ''
      allEvents.push({
        id: `sys-${systemItem.id}`,
        year: sysYear.label,
        sortYear: sysYear.sortYear,
        title: `${polityPrefix}${systemDisplayName} 체제 수립`,
        description:
          systemItem.notes?.trim() ||
          `${formLabel} 중심의 헌정·통치 체제가 수립되었습니다.`,
        type: 'regime',
        orgName: formLabel,
        orgType: '정체·헌정',
        targetKind: 'system',
        targetId: systemItem.id,
      })
    }

    for (const cabItem of visibleCabinets) {
      const effIso = resolveCabinetEffectiveDates(cabItem).startDate
      const cabYear = formatStructuredYear(
        cabItem.startEra,
        cabItem.startYear,
        effIso,
      )
      if (!cabYear) continue
      const headPersonName = cabItem.headTenure?.person
        ? getPersonDisplayName(cabItem.headTenure.person)
        : null
      const posTitle =
        cabItem.headTenure?.positionDefinition?.title ??
        cabItem.headTenure?.title ??
        '내각'
      const cabTitle =
        cabItem.name?.trim() ||
        (headPersonName ? `${headPersonName} ${posTitle}` : '행정부 출범')
      const headAvatar = cabItem.headTenure?.person?.profileImageUrl
        ? [getUploadImageUrl(cabItem.headTenure.person.profileImageUrl)]
        : undefined
      allEvents.push({
        id: `cab-${cabItem.id}`,
        year: cabYear.label,
        sortYear: cabYear.sortYear,
        title: `${cabTitle} 출범`,
        description: headPersonName
          ? `수반: ${headPersonName} (${posTitle})`
          : `${cabTitle} 정권·내각이 구성되었습니다.`,
        type: 'cabinet',
        orgName: headPersonName ?? cabTitle,
        orgType: '행정부·내각',
        images: headAvatar,
        targetKind: 'cabinet',
        targetId: cabItem.id,
      })
    }

    for (const dept of departments) {
      const kindLabel =
        DEPARTMENT_KIND_LABEL[dept.kind ?? 'MINISTRY'] ?? '중앙부처'
      const cleanDesc = parseDepartmentDescription(
        dept.description,
      ).cleanDescription
      const resolvedThumb = dept.thumbnailUrl
        ? [getUploadImageUrl(dept.thumbnailUrl)]
        : undefined
      const est = formatStructuredYear(
        dept.established?.era,
        dept.established?.year,
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
          images: resolvedThumb,
          targetKind: 'department',
          targetId: dept.id,
        })
      }
      const abo = formatStructuredYear(
        dept.abolished?.era,
        dept.abolished?.year,
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
          images: resolvedThumb,
          targetKind: 'department',
          targetId: dept.id,
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
        const isMerger = succ.kind === 'MERGE' || succ.kind === 'ABSORBED'
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
          images: resolvedThumb,
          targetKind: 'department',
          targetId: succ.department.id,
        })
      }
      for (const milSucc of dept.militaryUnitSuccessors ?? []) {
        if (!milSucc.militaryUnit?.name) continue
        const trYear =
          milSucc.year != null
            ? {
                label:
                  milSucc.era === 'BC'
                    ? `BC ${milSucc.year}`
                    : `${milSucc.year}`,
                sortYear:
                  milSucc.era === 'BC' ? -milSucc.year : milSucc.year,
              }
            : abo
        const isMerger = milSucc.kind === 'MERGE' || milSucc.kind === 'ABSORBED'
        allEvents.push({
          id: `tr-mil-${milSucc.transitionId}`,
          year: trYear?.label ?? '군제 개편',
          sortYear: trYear?.sortYear ?? 0,
          title: `${dept.name} → ${milSucc.militaryUnit.name}`,
          description:
            milSucc.note ||
            `행정부처 ${dept.name}에서 군사조직 ${milSucc.militaryUnit.name}(으)로 개편·이관되었습니다.`,
          type: isMerger ? 'merger' : 'reform',
          orgName: dept.name,
          orgType: '군제 개편',
          images: resolvedThumb,
          targetKind: 'department',
          targetId: dept.id,
        })
      }
    }

    allEvents.sort((eventA, eventB) => eventB.sortYear - eventA.sortYear)

    const eventCounts = {
      all: allEvents.length,
      regime: allEvents.filter((event) => event.type === 'regime').length,
      cabinet: allEvents.filter((event) => event.type === 'cabinet').length,
      establishment: allEvents.filter((event) => event.type === 'establishment')
        .length,
      reform: allEvents.filter((event) => event.type === 'reform').length,
      achievement: allEvents.filter((event) => event.type === 'achievement')
        .length,
      crisis: allEvents.filter((event) => event.type === 'crisis').length,
      merger: allEvents.filter((event) => event.type === 'merger').length,
    }

    return {
      totalPoliticalSystems: politicalSystems.length,
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
      ministryExamples: ministryDepts.slice(0, 3).map((dept) => dept.name),
      agencyExamples: agencyDepts.slice(0, 3).map((dept) => dept.name),
      specialExamples: specialDepts.slice(0, 3).map((dept) => dept.name),
      organizationExamples: organizations.slice(0, 3).map((org) => org.name),
      allEvents,
      eventCounts,
      categoryStats,
    }
  }, [
    departments,
    cabinets,
    positionDefinitions,
    country,
    constituentPolities,
    organizations,
    politicalSystems,
  ])

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
