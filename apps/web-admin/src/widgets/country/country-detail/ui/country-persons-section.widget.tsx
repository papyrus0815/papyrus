/**
 * 국가 상세 "인물" 탭 — 현대 국가(주 국적·재임·소속 + 브리지된 과거 국가 묶음)와
 * 역사 국가(단일 역사 정치체 3원 합집합) 양쪽을 단일 인포그래픽 경험으로 제공한다.
 *
 * - 상단 3열 인터랙티브 Bento 인포그래픽(정치체/수명 비중 · 세기별 활동 히스토그램 · 6대 직역 도넛)
 *   → 차트 막대·범례 클릭 시 하단 원장/카드/생애 연대기가 즉시 연동 필터링됨
 * - 도메인 직역 필터 칩 + 검색 + 4종 정렬(시대 오래된순/최신순 · 관직·영향력순 · 이름순)
 * - 3모드 보기 전환: [2열 원장 | 초상 카드 | 생애 연대기(동시대 코호트 바)]
 * - 행 클릭 시 PersonInlineModal 인라인 상세 미리보기(편집·상세 페이지 이동 연동)
 */
import { CountryTabEmptyState } from './country-tab-empty-state'
import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlignLeft,
  FiArrowUpRight,
  FiBarChart2,
  FiBriefcase,
  FiChevronDown,
  FiFlag,
  FiGrid,
  FiList,
  FiPlus,
  FiSearch,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  MiniDonutRing,
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { personApi } from '@/shared/api/person'
import {
  getPersonsByHistoricalCountryUnion,
  type PersonResponseDto as Person,
} from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { PrimaryActionButton } from '@/shared/ui/primary-action-button'
import { SectionSubNav, SubNavFigure } from '@/shared/ui/section-sub-nav/section-sub-nav'
import { InfluenceBadge } from '@/shared/ui/influence-badge'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import * as DashboardStyles from './country-detail-dashboard.styles'
import {
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
} from './dashboard-infographic/bento-primitives'
import {
  LedgerFilterChip,
  LedgerViewSwitch,
  LedgerViewSwitchItem,
} from './country-ledger-primitives'
import { CountryPersonGroupsBlock } from './country-person-groups-block.widget'
import { LedgerTableSkeleton } from '@/shared/ui/ledger-skeleton'
import { PersonCard } from './person/person-card'

export interface CountryPersonsSectionProps {
  country: UnifiedCountry
  /** 역사 국가 상세에서 정부·행정 탭 전환이 내부 상태일 때 전달 */
  onGoToGovernment?: () => void
}

interface PersonGroup {
  key: string
  label: string
  /** 과거 국가 묶음이면 그 id — 현대 묶음은 null */
  historicalCountryId: string | null
  persons: Person[]
}

type EraScopeKey = 'all' | 'modern' | 'historical'

type RoleCategoryKey =
  | '군주·국가원수'
  | '행정·관직'
  | '군사·지휘관'
  | '정치·입법'
  | '학술·문화·기타'
  | '미분류'

type PersonSortKey = 'yearAsc' | 'yearDesc' | 'influenceDesc' | 'nameAsc'
type PersonViewMode = 'ledger' | 'cards' | 'timeline'

const ROLE_ORDER: RoleCategoryKey[] = [
  '군주·국가원수',
  '행정·관직',
  '군사·지휘관',
  '정치·입법',
  '학술·문화·기타',
  '미분류',
]

const GROUP_INITIAL_LIMIT = 24
const TIMELINE_MAX_ROWS = 80

type ExtendedPerson = Person & {
  jobTitle?: string | null
  influence?: number | null
  governmentTenures?: Array<{
    title?: string | null
    rankTitle?: string | null
    startYear?: number | null
    endYear?: number | null
    startDate?: string | null
    endDate?: string | null
    positionDefinition?: { title?: string | null; name?: string | null } | null
    administrationDepartment?: {
      name?: string | null
      abbreviation?: string | null
    } | null
    militaryUnit?: {
      name?: string | null
      abbreviation?: string | null
    } | null
  }>
}

function getTenureCount(person: Person): number {
  return (person as ExtendedPerson).governmentTenures?.length ?? 0
}

function hasPersonTenure(person: Person): boolean {
  const extended = person as ExtendedPerson
  return Boolean(
    (extended.governmentTenures && extended.governmentTenures.length > 0) ||
      extended.jobTitle,
  )
}

function scoreTenureImportance(
  tenure: NonNullable<ExtendedPerson['governmentTenures']>[number],
): number {
  const rawRole = (
    tenure.title ??
    tenure.positionDefinition?.title ??
    tenure.positionDefinition?.name ??
    ''
  ).trim()
  if (
    /황제|천황|국왕|여왕|군주|대통령|총통|총리|수상|주석|영의정|승상|재상|술탄|칸|파라오/.test(
      rawRole,
    ) &&
    !/부총리|부통령/.test(rawRole)
  ) {
    return 100
  }
  if (/부통령|부총리|좌의정|우의정|섭정/.test(rawRole)) {
    return 85
  }
  if (/장관|대신|국무비서|상서|판서|처장|청장|총재|의장/.test(rawRole)) {
    return 70
  }
  if (/원수|대장|상급대장|사령관|참모총장|제독|도독/.test(rawRole)) {
    return 60
  }
  if (tenure.administrationDepartment || tenure.militaryUnit) {
    return 40
  }
  return 20
}

function getPrimaryRoleLabel(person: Person): string | null {
  const extended = person as ExtendedPerson
  const tenures = extended.governmentTenures ?? []
  const bestTenure =
    tenures.length > 0
      ? [...tenures].sort(
          (left, right) =>
            scoreTenureImportance(right) - scoreTenureImportance(left),
        )[0]
      : undefined
  if (bestTenure) {
    const rawRole =
      bestTenure.title?.trim() ||
      bestTenure.positionDefinition?.title?.trim() ||
      bestTenure.positionDefinition?.name?.trim() ||
      ''
    const institutionLabel =
      bestTenure.militaryUnit?.abbreviation?.trim() ||
      bestTenure.militaryUnit?.name?.trim() ||
      bestTenure.administrationDepartment?.abbreviation?.trim() ||
      bestTenure.administrationDepartment?.name?.trim() ||
      ''
    const withInst =
      institutionLabel && rawRole && !rawRole.includes(institutionLabel)
        ? `${institutionLabel} ${rawRole}`
        : rawRole || institutionLabel
    const rankSuffix = bestTenure.rankTitle?.trim()
      ? ` · ${bestTenure.rankTitle.trim()}`
      : ''
    if (withInst) return `${withInst}${rankSuffix}`
  }
  return extended.jobTitle?.trim() || null
}

function toSignedYear(
  year: number | null | undefined,
  era?: string | null,
): number | null {
  if (year == null || !Number.isFinite(year)) return null
  return era === 'BC' ? -Math.abs(year) : Math.abs(year)
}

function formatSignedYearLabel(signedYear: number): string {
  if (signedYear < 0) return `BC ${Math.abs(signedYear)}`
  return `${signedYear}`
}

function getPersonLifespanSpan(person: Person): {
  start: number
  end: number
  isPoint: boolean
  age: number | null
} | null {
  const signedBirth = toSignedYear(person.birthYear, person.birthEra)
  const signedDeath = toSignedYear(person.deathYear, person.deathEra)
  const currentYear = new Date().getFullYear()

  if (signedBirth != null && signedDeath != null && signedDeath >= signedBirth) {
    const age =
      signedDeath - signedBirth - (signedBirth < 0 && signedDeath > 0 ? 1 : 0)
    return {
      start: signedBirth,
      end: Math.max(signedBirth + 1, signedDeath),
      isPoint: false,
      age: age >= 0 && age <= 130 ? age : null,
    }
  }
  if (signedBirth != null) {
    const isLikelyModernLiving = signedBirth >= currentYear - 105
    const end = isLikelyModernLiving
      ? currentYear
      : signedBirth + 55
    return {
      start: signedBirth,
      end,
      isPoint: !isLikelyModernLiving,
      age: null,
    }
  }
  if (signedDeath != null) {
    return {
      start: signedDeath - 50,
      end: signedDeath,
      isPoint: true,
      age: null,
    }
  }

  const tenures = (person as ExtendedPerson).governmentTenures ?? []
  const years: number[] = []
  for (const t of tenures) {
    if (t.startYear != null && Number.isFinite(t.startYear)) years.push(t.startYear)
    else if (t.startDate) {
      const py = parseInt(t.startDate.slice(0, 4), 10)
      if (Number.isFinite(py)) years.push(py)
    }
    if (t.endYear != null && Number.isFinite(t.endYear)) years.push(t.endYear)
    else if (t.endDate) {
      const py = parseInt(t.endDate.slice(0, 4), 10)
      if (Number.isFinite(py)) years.push(py)
    }
  }
  if (years.length > 0) {
    const minY = Math.min(...years)
    const maxY = Math.max(...years)
    return {
      start: minY,
      end: Math.max(minY + 1, maxY),
      isPoint: minY === maxY,
      age: null,
    }
  }
  return null
}

function formatPersonLifespan(person: Person): string {
  const birthText =
    person.birthYear != null
      ? `${person.birthEra === 'BC' ? 'BC ' : ''}${Math.abs(person.birthYear)}`
      : null
  const deathText =
    person.deathYear != null
      ? `${person.deathEra === 'BC' ? 'BC ' : ''}${Math.abs(person.deathYear)}`
      : null
  const span = getPersonLifespanSpan(person)
  const ageSuffix = span?.age != null ? ` · ${span.age}세` : ''
  if (!birthText && !deathText) {
    if (span) {
      return `재임 ${formatSignedYearLabel(span.start)}${span.end > span.start + 1 ? `~${formatSignedYearLabel(span.end)}` : ''}년경`
    }
    return '생몰년 미상'
  }
  if (birthText && deathText) return `${birthText} ~ ${deathText}년${ageSuffix}`
  if (birthText) return `${birthText}년생`
  return `~ ${deathText}년 몰`
}

function getPersonActiveSignedYear(person: Person): number | null {
  const signedBirth = toSignedYear(person.birthYear, person.birthEra)
  const signedDeath = toSignedYear(person.deathYear, person.deathEra)

  if (signedBirth != null && signedDeath != null) {
    const mid = Math.round((signedBirth + signedDeath) / 2)
    return mid === 0 ? 1 : mid
  }
  if (signedBirth != null) {
    const est = Math.min(new Date().getFullYear(), signedBirth + 30)
    return est === 0 ? 1 : est
  }
  if (signedDeath != null) {
    const est = signedDeath - 28
    return est === 0 ? -1 : est
  }

  const firstTenure = (person as ExtendedPerson).governmentTenures?.[0]
  if (firstTenure?.startYear != null && Number.isFinite(firstTenure.startYear)) {
    return firstTenure.startYear
  }
  if (firstTenure?.startDate) {
    const parsedYear = parseInt(firstTenure.startDate.slice(0, 4), 10)
    if (Number.isFinite(parsedYear) && parsedYear !== 0) return parsedYear
  }
  return null
}

function getPersonCenturyIndex(person: Person): number | null {
  const activeYear = getPersonActiveSignedYear(person)
  if (activeYear == null || activeYear === 0) return null
  return activeYear > 0
    ? Math.ceil(activeYear / 100)
    : -Math.ceil(Math.abs(activeYear) / 100)
}

function formatCenturyFromIndex(cIdx: number): string {
  return cIdx > 0 ? `${cIdx}세기` : `BC ${Math.abs(cIdx)}세기`
}

function classifyPersonRoleCategory(person: Person): RoleCategoryKey {
  const extended = person as ExtendedPerson
  const roleLabel = (getPrimaryRoleLabel(person) ?? '').toLowerCase()
  const firstTenure = extended.governmentTenures?.[0]

  if (
    person.regnalName ||
    /왕|황제|천황|군주|대통령|총통|총리|수상|주석|술탄|파라오|칸|태조|세종|정조|영조|국왕|여왕|대공|공작/.test(
      roleLabel,
    )
  ) {
    return '군주·국가원수'
  }
  if (
    firstTenure?.militaryUnit ||
    /장군|제독|원수|사령관|무관|군인|장교|도독|절도사|통제사|참모총장|장수/.test(
      roleLabel,
    )
  ) {
    return '군사·지휘관'
  }
  if (
    firstTenure?.administrationDepartment ||
    (extended.governmentTenures && extended.governmentTenures.length > 0) ||
    /장관|대신|상서|판서|정승|영의정|좌의정|우의정|총독|지사|관료|외교|대사|승상|재상/.test(
      roleLabel,
    )
  ) {
    return '행정·관직'
  }
  if (/의원|당수|대표|정치인|원로원|혁명가|독립운동|정치가/.test(roleLabel)) {
    return '정치·입법'
  }
  if (extended.jobTitle?.trim()) {
    return '학술·문화·기타'
  }
  return '미분류'
}

function getRoleColorMap(isDark: boolean): Record<RoleCategoryKey, string> {
  return isDark
    ? {
        '군주·국가원수': '#a5b4fc',
        '행정·관직': '#38bdf8',
        '군사·지휘관': '#f87171',
        '정치·입법': '#34d399',
        '학술·문화·기타': '#fbbf24',
        미분류: '#64748b',
      }
    : {
        '군주·국가원수': '#4f46e5',
        '행정·관직': '#0284c7',
        '군사·지휘관': '#dc2626',
        '정치·입법': '#059669',
        '학술·문화·기타': '#d97706',
        미분류: '#94a3b8',
      }
}

function sortPersons(persons: Person[], sortBy: PersonSortKey): Person[] {
  const copy = [...persons]
  copy.sort((left, right) => {
    if (sortBy === 'nameAsc') {
      const lName = getPersonDisplayName(left, true) || left.name
      const rName = getPersonDisplayName(right, true) || right.name
      return lName.localeCompare(rName, 'ko')
    }
    if (sortBy === 'influenceDesc') {
      const lInf = (left as ExtendedPerson).influence ?? -1
      const rInf = (right as ExtendedPerson).influence ?? -1
      if (rInf !== lInf) return rInf - lInf
      const lTen = getTenureCount(left)
      const rTen = getTenureCount(right)
      if (rTen !== lTen) return rTen - lTen
    }
    const lYear = getPersonActiveSignedYear(left)
    const rYear = getPersonActiveSignedYear(right)
    if (lYear == null && rYear == null) {
      const lName = getPersonDisplayName(left, true) || left.name
      const rName = getPersonDisplayName(right, true) || right.name
      return lName.localeCompare(rName, 'ko')
    }
    if (lYear == null) return 1
    if (rYear == null) return -1
    if (lYear !== rYear) {
      return sortBy === 'yearDesc' ? rYear - lYear : lYear - rYear
    }
    const lName = getPersonDisplayName(left, true) || left.name
    const rName = getPersonDisplayName(right, true) || right.name
    return lName.localeCompare(rName, 'ko')
  })
  return copy
}

export function CountryPersonsSection({
  country,
}: CountryPersonsSectionProps) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const isHistoricalCountry = country.type === 'historical'
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [eraScope, setEraScope] = useState<EraScopeKey>('all')
  const [polityFilter, setPolityFilter] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<RoleCategoryKey | 'all'>('all')
  const [centuryFilter, setCenturyFilter] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<PersonSortKey>('yearAsc')
  const [viewMode, setViewMode] = useState<PersonViewMode>('ledger')
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [editPersonId, setEditPersonId] = useState<string | null>(null)

  const modernGroupedQuery = useQuery({
    queryKey: ['persons', 'by-country-grouped', country.id],
    queryFn: () => personApi.getByCountryIdGrouped(country.id),
    staleTime: 60_000,
    enabled: !isHistoricalCountry && Boolean(country.id),
  })

  const historicalUnionQuery = useQuery({
    queryKey: ['historical-country-union-persons', country.id],
    queryFn: () => getPersonsByHistoricalCountryUnion(country.id),
    staleTime: 60_000,
    enabled: isHistoricalCountry && Boolean(country.id),
  })

  const isLoading = isHistoricalCountry
    ? historicalUnionQuery.isLoading
    : modernGroupedQuery.isLoading
  const isError = isHistoricalCountry
    ? historicalUnionQuery.isError
    : modernGroupedQuery.isError
  const refetch = isHistoricalCountry
    ? historicalUnionQuery.refetch
    : modernGroupedQuery.refetch

  const normalizedData = useMemo(() => {
    if (isHistoricalCountry) {
      const list = historicalUnionQuery.data ?? []
      return {
        modern: [] as Person[],
        historical:
          list.length > 0
            ? [
                {
                  historicalCountryId: country.id,
                  historicalCountryName: country.name,
                  persons: list,
                },
              ]
            : [],
      }
    }
    return {
      modern: modernGroupedQuery.data?.modern ?? [],
      historical: modernGroupedQuery.data?.historical ?? [],
    }
  }, [
    isHistoricalCountry,
    historicalUnionQuery.data,
    modernGroupedQuery.data,
    country.id,
    country.name,
  ])

  const roleColorMap = useMemo(() => getRoleColorMap(isDark), [isDark])

  const summaryStats = useMemo(() => {
    const modernList = normalizedData.modern
    const historicalGroups = normalizedData.historical
    const uniqueById = new Map<string, Person>()
    for (const person of modernList) {
      uniqueById.set(person.id, person)
    }
    const historicalUniqueIds = new Set<string>()
    for (const group of historicalGroups) {
      for (const person of group.persons) {
        uniqueById.set(person.id, person)
        historicalUniqueIds.add(person.id)
      }
    }
    const allUnique = Array.from(uniqueById.values())
    const tenuredCount = allUnique.filter(hasPersonTenure).length
    const totalCount = allUnique.length

    const palette = isDark
      ? ['#a5b4fc', '#38bdf8', '#34d399', '#fbbf24', '#c084fc', '#94a3b8']
      : ['#4f46e5', '#0284c7', '#059669', '#d97706', '#7c3aed', '#64748b']

    // 1A. 현대 국가용: 소속 정치체 비중
    const politySlices: Array<SegmentSlice & { filterKey: string | null }> = []
    if (!isHistoricalCountry) {
      if (modernList.length > 0) {
        politySlices.push({
          key: '__modern__',
          filterKey: '__modern__',
          label: `${country.name} (현대)`,
          value: modernList.length,
          color: palette[0],
          meta: `${modernList.length}명`,
        })
      }
      const nonEmptyHistorical = [...historicalGroups]
        .filter((group) => group.persons.length > 0)
        .sort((left, right) => right.persons.length - left.persons.length)
      const topHist = nonEmptyHistorical.slice(0, 4)
      const restHistCount = nonEmptyHistorical
        .slice(4)
        .reduce((acc, group) => acc + group.persons.length, 0)
      topHist.forEach((group, idx) => {
        politySlices.push({
          key: group.historicalCountryId,
          filterKey: group.historicalCountryId,
          label: group.historicalCountryName,
          value: group.persons.length,
          color: palette[(idx + 1) % (palette.length - 1)],
          meta: `${group.persons.length}명`,
        })
      })
      if (restHistCount > 0) {
        politySlices.push({
          key: 'other-hist',
          filterKey: null,
          label: `기타 역사국가 (${nonEmptyHistorical.length - 4}개국)`,
          value: restHistCount,
          color: palette[palette.length - 1],
          meta: `${restHistCount}명`,
        })
      }
    }

    // 1B. 역사 국가(또는 단일 정치체)용: 향년(수명) 구간 & 생애 지표
    let ageSum = 0
    let ageKnownCount = 0
    let longestPerson: { name: string; age: number } | null = null
    const ageBands = { u40: 0, b40_59: 0, b60_79: 0, o80: 0 }
    for (const person of allUnique) {
      const span = getPersonLifespanSpan(person)
      if (span?.age != null && span.age > 0) {
        ageSum += span.age
        ageKnownCount += 1
        const pName = getPersonDisplayName(person, true) || person.name
        if (!longestPerson || span.age > longestPerson.age) {
          longestPerson = { name: pName, age: span.age }
        }
        if (span.age < 40) ageBands.u40 += 1
        else if (span.age < 60) ageBands.b40_59 += 1
        else if (span.age < 80) ageBands.b60_79 += 1
        else ageBands.o80 += 1
      }
    }
    const avgAge = ageKnownCount > 0 ? Math.round(ageSum / ageKnownCount) : null
    const lifespanSlices: SegmentSlice[] = [
      {
        key: 'u40',
        label: '40세 미만',
        value: ageBands.u40,
        color: isDark ? '#f87171' : '#dc2626',
        meta: `${ageBands.u40}명`,
      },
      {
        key: '40-59',
        label: '40~59세',
        value: ageBands.b40_59,
        color: isDark ? '#fbbf24' : '#d97706',
        meta: `${ageBands.b40_59}명`,
      },
      {
        key: '60-79',
        label: '60~79세',
        value: ageBands.b60_79,
        color: isDark ? '#a5b4fc' : '#4f46e5',
        meta: `${ageBands.b60_79}명`,
      },
      {
        key: '80+',
        label: '80세 이상',
        value: ageBands.o80,
        color: isDark ? '#34d399' : '#059669',
        meta: `${ageBands.o80}명`,
      },
    ].filter((slice) => slice.value > 0)

    // 2. 세기별 활동 인물 히스토그램
    const centuryCountMap = new Map<number, number>()
    let datedCount = 0
    for (const person of allUnique) {
      const cIdx = getPersonCenturyIndex(person)
      if (cIdx == null) continue
      datedCount += 1
      centuryCountMap.set(cIdx, (centuryCountMap.get(cIdx) ?? 0) + 1)
    }
    const sortedCenturyEntries = [...centuryCountMap.entries()].sort(
      (left, right) => left[0] - right[0],
    )
    const centuryBuckets = sortedCenturyEntries
      .slice(-14)
      .map(([cIdx, count]) => ({
        century: cIdx,
        key: String(cIdx),
        label: formatCenturyFromIndex(cIdx),
        shortLabel: cIdx > 0 ? `${cIdx}c` : `B${Math.abs(cIdx)}c`,
        count,
      }))
    const maxCenturyCount = Math.max(
      0,
      ...centuryBuckets.map((bucket) => bucket.count),
    )
    const peakCentury = centuryBuckets.reduce<{
      century: number
      label: string
      count: number
    } | null>(
      (best, cur) => (!best || cur.count > best.count ? cur : best),
      null,
    )

    // 3. 직역·역할 분포
    const roleCounts = new Map<RoleCategoryKey, number>()
    for (const person of allUnique) {
      const cat = classifyPersonRoleCategory(person)
      roleCounts.set(cat, (roleCounts.get(cat) ?? 0) + 1)
    }
    const roleSlices: Array<SegmentSlice & { roleKey: RoleCategoryKey }> =
      ROLE_ORDER.filter((roleKey) => (roleCounts.get(roleKey) ?? 0) > 0).map(
        (roleKey) => ({
          key: roleKey,
          roleKey,
          label: roleKey,
          value: roleCounts.get(roleKey) ?? 0,
          color: roleColorMap[roleKey],
          meta: `${roleCounts.get(roleKey) ?? 0}명`,
        }),
      )

    const nonEmptyHistGroupCount = historicalGroups.filter(
      (grp) => grp.persons.length > 0,
    ).length
    const classifiedCount = totalCount - (roleCounts.get('미분류') ?? 0)

    return {
      totalCount,
      modernCount: modernList.length,
      historicalCount: historicalUniqueIds.size,
      historicalGroupCount: nonEmptyHistGroupCount,
      tenuredCount,
      classifiedCount,
      politySlices,
      ageKnownCount,
      avgAge,
      longestPerson,
      lifespanSlices,
      centuryBuckets,
      maxCenturyCount,
      datedCount,
      peakCentury,
      roleSlices,
    }
  }, [normalizedData, isDark, isHistoricalCountry, country.name, roleColorMap])

  const groups = useMemo<PersonGroup[]>(() => {
    const lowered = query.trim().toLowerCase()
    const matchesPerson = (person: Person, groupLabel: string) => {
      if (
        roleFilter !== 'all' &&
        classifyPersonRoleCategory(person) !== roleFilter
      ) {
        return false
      }
      if (
        centuryFilter != null &&
        getPersonCenturyIndex(person) !== centuryFilter
      ) {
        return false
      }
      if (!lowered) return true
      const tenures = (person as ExtendedPerson).governmentTenures ?? []
      const instNames = tenures
        .flatMap((t) => [
          t.title,
          t.administrationDepartment?.name,
          t.militaryUnit?.name,
        ])
        .filter(Boolean)
      const searchable = [
        getPersonDisplayName(person, true),
        person.name,
        person.surname,
        person.regnalName,
        getPrimaryRoleLabel(person),
        ...instNames,
        groupLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(lowered)
    }

    const result: PersonGroup[] = []

    if (isHistoricalCountry) {
      const singleGroup = normalizedData.historical[0]
      if (singleGroup) {
        const matched = sortPersons(
          singleGroup.persons.filter((p) =>
            matchesPerson(p, singleGroup.historicalCountryName),
          ),
          sortBy,
        )
        if (matched.length > 0) {
          result.push({
            key: singleGroup.historicalCountryId,
            label: singleGroup.historicalCountryName,
            historicalCountryId: singleGroup.historicalCountryId,
            persons: matched,
          })
        }
      }
      return result
    }

    if (
      eraScope !== 'historical' &&
      (polityFilter == null || polityFilter === '__modern__')
    ) {
      const modern = sortPersons(
        normalizedData.modern.filter((person) =>
          matchesPerson(person, country.name),
        ),
        sortBy,
      )
      if (modern.length > 0) {
        result.push({
          key: '__modern__',
          label: country.name,
          historicalCountryId: null,
          persons: modern,
        })
      }
    }

    if (eraScope !== 'modern' && polityFilter !== '__modern__') {
      for (const group of normalizedData.historical) {
        if (polityFilter && group.historicalCountryId !== polityFilter) continue
        const persons = sortPersons(
          group.persons.filter((person) =>
            matchesPerson(person, group.historicalCountryName),
          ),
          sortBy,
        )
        if (persons.length === 0) continue
        result.push({
          key: group.historicalCountryId,
          label: group.historicalCountryName,
          historicalCountryId: group.historicalCountryId,
          persons,
        })
      }
    }

    return result
  }, [
    normalizedData,
    isHistoricalCountry,
    query,
    eraScope,
    polityFilter,
    roleFilter,
    centuryFilter,
    sortBy,
    country.name,
  ])

  const filteredUniquePersons = useMemo(() => {
    const map = new Map<string, { person: Person; groupLabel: string; isHistorical: boolean }>()
    for (const group of groups) {
      for (const person of group.persons) {
        if (!map.has(person.id)) {
          map.set(person.id, {
            person,
            groupLabel: group.label,
            isHistorical: Boolean(group.historicalCountryId),
          })
        }
      }
    }
    return Array.from(map.values())
  }, [groups])

  const timelineCohortData = useMemo(() => {
    if (viewMode !== 'timeline') return null
    const sorted = sortPersons(
      filteredUniquePersons.map((item) => item.person),
      sortBy === 'yearDesc' ? 'yearDesc' : 'yearAsc',
    )
    const groupMetaById = new Map(
      filteredUniquePersons.map((item) => [item.person.id, item]),
    )
    const datedItems: Array<{
      person: Person
      displayName: string
      roleLabel: string | null
      roleCategory: RoleCategoryKey
      color: string
      groupLabel: string
      span: NonNullable<ReturnType<typeof getPersonLifespanSpan>>
    }> = []
    let undatedCount = 0

    for (const person of sorted) {
      const span = getPersonLifespanSpan(person)
      if (!span) {
        undatedCount += 1
        continue
      }
      const cat = classifyPersonRoleCategory(person)
      const meta = groupMetaById.get(person.id)
      datedItems.push({
        person,
        displayName: getPersonDisplayName(person, true) || person.name,
        roleLabel: getPrimaryRoleLabel(person),
        roleCategory: cat,
        color: roleColorMap[cat],
        groupLabel: meta?.groupLabel ?? country.name,
        span,
      })
    }

    if (datedItems.length === 0) {
      return { rows: [], undatedCount, minYear: 0, maxYear: 1, ticks: [] as number[], truncatedCount: 0 }
    }

    const visibleRows = datedItems.slice(0, TIMELINE_MAX_ROWS)
    const truncatedCount = Math.max(0, datedItems.length - visibleRows.length)
    const minYear = Math.min(...visibleRows.map((row) => row.span.start))
    const maxYear = Math.max(...visibleRows.map((row) => row.span.end), minYear + 10)
    const range = Math.max(10, maxYear - minYear)

    const tickCount = 5
    const ticks = Array.from({ length: tickCount }, (_, idx) => {
      const raw = Math.round(minYear + (range * idx) / (tickCount - 1))
      return raw === 0 ? 1 : raw
    })

    return {
      rows: visibleRows,
      undatedCount,
      minYear,
      maxYear: minYear + range,
      ticks,
      truncatedCount,
    }
  }, [viewMode, filteredUniquePersons, sortBy, roleColorMap, country.name])

  const filteredUniqueCount = filteredUniquePersons.length
  const isFilterActive =
    eraScope !== 'all' ||
    polityFilter != null ||
    roleFilter !== 'all' ||
    centuryFilter != null ||
    query.trim().length > 0

  const resetAllFilters = () => {
    setEraScope('all')
    setPolityFilter(null)
    setRoleFilter('all')
    setCenturyFilter(null)
    setQuery('')
  }

  const toggleCollapse = (key: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const toggleGroupExpand = (key: string) =>
    setExpandedGroups((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const invalidateAllPersonQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: ['persons', 'by-country-grouped', country.id],
    })
    void queryClient.invalidateQueries({
      queryKey: ['historical-country-union-persons', country.id],
    })
    void queryClient.invalidateQueries({
      queryKey: ['country-persons', country.id],
    })
    void queryClient.invalidateQueries({ queryKey: ['persons'] })
  }

  const hasAny = summaryStats.totalCount > 0
  const activePolityLabel = useMemo(() => {
    if (!polityFilter) return null
    if (polityFilter === '__modern__') return `${country.name} (현대)`
    return (
      normalizedData.historical.find(
        (grp) => grp.historicalCountryId === polityFilter,
      )?.historicalCountryName ?? null
    )
  }, [polityFilter, country.name, normalizedData.historical])

  return (
    <DashboardStyles.DashboardRoot>
      <SectionWrap>
        {/* 제목은 위 탭('인물')이 맡는다 — 우측에는 인물 등록 주 액션 하나만 배치 */}
        <SectionSubNav
          summary={
            <span>
              {isHistoricalCountry ? '소속 인물' : '소속·역사 인물'}{' '}
              <SubNavFigure>
                {summaryStats.totalCount.toLocaleString('ko-KR')}
              </SubNavFigure>
              명
            </span>
          }
          actions={
            isLoading || !hasAny ? null : (
              <PrimaryActionButton
                onClick={() => {
                  setEditPersonId(null)
                  setRegisterModalOpen(true)
                }}
              >
                <FiPlus size={14} />
                <span>인물 등록</span>
              </PrimaryActionButton>
            )
          }
        />

        {hasAny && (
          <PersonsBentoWrap aria-label="소속 인물 인포그래픽 요약">
            <EditorialSummaryGrid>
              {/* Column 1: 현대 국가 → 정치체·시대 비중(클릭 필터) / 역사 국가 → 수명 구간 및 생애 요약 */}
              <BentoCard>
                <BentoCardHeader style={{ paddingBottom: 14 }}>
                  <BentoCardTitleGroup>
                    <BentoCardTitle style={{ fontSize: 16 }}>
                      {isHistoricalCountry
                        ? '인물 규모 · 수명 분포'
                        : '소속 정치체 · 시대 비중'}
                    </BentoCardTitle>
                    <BentoCardBadge>
                      총 {summaryStats.totalCount.toLocaleString('ko-KR')}명
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                  {polityFilter && (
                    <InlineCardResetBtn
                      type="button"
                      onClick={() => setPolityFilter(null)}
                    >
                      전체 정치체
                    </InlineCardResetBtn>
                  )}
                </BentoCardHeader>
                <BentoCardBody style={{ gap: 14 }}>
                  {isHistoricalCountry ? (
                    <>
                      <PolityHeroRow>
                        <PolityBigCount>
                          {summaryStats.totalCount.toLocaleString('ko-KR')}
                          <span>명</span>
                        </PolityBigCount>
                        <PolitySplitNote>
                          {summaryStats.avgAge != null
                            ? `평균 향년 ${summaryStats.avgAge}세 (확인 ${summaryStats.ageKnownCount}명)`
                            : `관직·재임 ${summaryStats.tenuredCount}명 · 연대 확인 ${summaryStats.datedCount}명`}
                        </PolitySplitNote>
                      </PolityHeroRow>

                      {summaryStats.lifespanSlices.length > 0 ? (
                        <StackedSegmentBar
                          slices={summaryStats.lifespanSlices}
                          height={9}
                          showPercent
                        />
                      ) : (
                        <HistFooterNote>
                          생몰년이 등록되면 향년 구간 인포그래픽이 자동 집계됩니다.
                        </HistFooterNote>
                      )}
                      {summaryStats.longestPerson && (
                        <HistFooterNote>
                          최장수 기록: {summaryStats.longestPerson.name} (
                          {summaryStats.longestPerson.age}세)
                        </HistFooterNote>
                      )}
                    </>
                  ) : (
                    <>
                      <PolityHeroRow>
                        <PolityBigCount>
                          {summaryStats.totalCount.toLocaleString('ko-KR')}
                          <span>명</span>
                        </PolityBigCount>
                        <PolitySplitNote>
                          현대 {summaryStats.modernCount}명 · 과거{' '}
                          {summaryStats.historicalGroupCount}개국{' '}
                          {summaryStats.historicalCount}명
                        </PolitySplitNote>
                      </PolityHeroRow>

                      <StackedSegmentBar
                        slices={summaryStats.politySlices}
                        height={9}
                        showPercent
                        showLegend={false}
                      />

                      <PolityLegendList>
                        {summaryStats.politySlices.slice(0, 6).map((slice) => {
                          const isSelected =
                            slice.filterKey != null &&
                            polityFilter === slice.filterKey
                          return slice.filterKey ? (
                            <PolityLegendBtn
                              key={slice.key}
                              type="button"
                              $active={isSelected}
                              onClick={() => {
                                setEraScope('all')
                                setPolityFilter((prev) =>
                                  prev === slice.filterKey
                                    ? null
                                    : slice.filterKey,
                                )
                              }}
                              title={`${slice.label} 인물만 필터링`}
                            >
                              <PolityLegendDot $color={slice.color} />
                              <PolityLegendName>{slice.label}</PolityLegendName>
                              <PolityLegendCount>{slice.meta}</PolityLegendCount>
                            </PolityLegendBtn>
                          ) : (
                            <PolityLegendStatic key={slice.key}>
                              <PolityLegendDot $color={slice.color} />
                              <PolityLegendName>{slice.label}</PolityLegendName>
                              <PolityLegendCount>{slice.meta}</PolityLegendCount>
                            </PolityLegendStatic>
                          )
                        })}
                      </PolityLegendList>
                    </>
                  )}
                </BentoCardBody>
              </BentoCard>

              {/* Column 2: 세기별 활동 인물 분포 히스토그램 (클릭 시 세기 필터) */}
              <BentoCard>
                <BentoCardHeader style={{ paddingBottom: 14 }}>
                  <BentoCardTitleGroup>
                    <BentoCardTitle style={{ fontSize: 16 }}>
                      세기별 활동 분포
                    </BentoCardTitle>
                    <BentoCardBadge>
                      {summaryStats.datedCount > 0
                        ? `연대 확인 ${summaryStats.datedCount}명`
                        : '연대 미기재'}
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                  {centuryFilter != null && (
                    <InlineCardResetBtn
                      type="button"
                      onClick={() => setCenturyFilter(null)}
                    >
                      {formatCenturyFromIndex(centuryFilter)} 해제
                    </InlineCardResetBtn>
                  )}
                </BentoCardHeader>
                <BentoCardBody style={{ gap: 12 }}>
                  {summaryStats.centuryBuckets.length > 0 ? (
                    <>
                      <CenturyHistBars
                        role="group"
                        $compact={summaryStats.centuryBuckets.length <= 5}
                        aria-label="세기별 활동 인물 분포 (클릭하여 세기 필터)"
                      >
                        {summaryStats.centuryBuckets.map((bucket) => {
                          const heightPct =
                            summaryStats.maxCenturyCount > 0
                              ? Math.max(
                                  12,
                                  (bucket.count /
                                    summaryStats.maxCenturyCount) *
                                    100,
                                )
                              : 12
                          const isSelected = centuryFilter === bucket.century
                          const isPeak =
                            centuryFilter == null &&
                            summaryStats.peakCentury?.century === bucket.century
                          const isDimmed =
                            centuryFilter != null && !isSelected
                          return (
                            <CenturyBarColBtn
                              key={bucket.key}
                              type="button"
                              $active={isSelected}
                              $dimmed={isDimmed}
                              aria-pressed={isSelected}
                              onClick={() =>
                                setCenturyFilter((prev) =>
                                  prev === bucket.century
                                    ? null
                                    : bucket.century,
                                )
                              }
                              title={`${bucket.label}: ${bucket.count}명 (클릭하여 필터)`}
                            >
                              <CenturyBarCount $active={isSelected}>
                                {bucket.count}
                              </CenturyBarCount>
                              <CenturyBarTrack $active={isSelected}>
                                <CenturyBarFill
                                  $highlight={isSelected || isPeak}
                                  style={{ height: `${heightPct}%` }}
                                />
                              </CenturyBarTrack>
                              <CenturyBarAxis $active={isSelected}>
                                {bucket.shortLabel}
                              </CenturyBarAxis>
                            </CenturyBarColBtn>
                          )
                        })}
                      </CenturyHistBars>
                      <HistFooterNote>
                        {summaryStats.peakCentury
                          ? `최다 집중: ${summaryStats.peakCentury.label} (${summaryStats.peakCentury.count}명)`
                          : ''}
                        {' · 막대 클릭 시 세기 필터'}
                      </HistFooterNote>
                    </>
                  ) : (
                    <HistEmptyNote>
                      생몰년 또는 재임 연도가 등록되면 세기별 분포 히스토그램이 표시됩니다.
                    </HistEmptyNote>
                  )}
                </BentoCardBody>
              </BentoCard>

              {/* Column 3: 주요 직역 · 역할 분포 (클릭 시 직역 필터) */}
              <BentoCard>
                <BentoCardHeader style={{ paddingBottom: 14 }}>
                  <BentoCardTitleGroup>
                    <BentoCardTitle style={{ fontSize: 16 }}>
                      주요 직역 · 역할 구성
                    </BentoCardTitle>
                    <BentoCardBadge>
                      직역 분류 {summaryStats.classifiedCount}명
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                  {roleFilter !== 'all' && (
                    <InlineCardResetBtn
                      type="button"
                      onClick={() => setRoleFilter('all')}
                    >
                      전체 직역
                    </InlineCardResetBtn>
                  )}
                </BentoCardHeader>
                <BentoCardBody>
                  <RoleDonutLayout>
                    <MiniDonutRing
                      slices={summaryStats.roleSlices}
                      size={82}
                      strokeWidth={10.5}
                      centerValue={
                        roleFilter !== 'all'
                          ? String(
                              summaryStats.roleSlices.find(
                                (slice) => slice.roleKey === roleFilter,
                              )?.value ?? 0,
                            )
                          : String(summaryStats.classifiedCount)
                      }
                      centerLabel={
                        roleFilter !== 'all' ? '선택 직역' : '분류 직역'
                      }
                    />
                    <RoleLegendList>
                      {summaryStats.roleSlices.slice(0, 5).map((slice) => {
                        const pct =
                          summaryStats.totalCount > 0
                            ? Math.round(
                                (slice.value / summaryStats.totalCount) * 100,
                              )
                            : 0
                        const isSelected = roleFilter === slice.roleKey
                        return (
                          <RoleLegendBtn
                            key={slice.key}
                            type="button"
                            $active={isSelected}
                            onClick={() =>
                              setRoleFilter((prev) =>
                                prev === slice.roleKey ? 'all' : slice.roleKey,
                              )
                            }
                            title={`${slice.label} 인물만 보기`}
                          >
                            <PolityLegendDot $color={slice.color} />
                            <RoleLegendName $active={isSelected}>
                              {slice.label}
                            </RoleLegendName>
                            <RoleLegendMeta>
                              {slice.value}명 ({pct}%)
                            </RoleLegendMeta>
                          </RoleLegendBtn>
                        )
                      })}
                    </RoleLegendList>
                  </RoleDonutLayout>
                </BentoCardBody>
              </BentoCard>
            </EditorialSummaryGrid>
          </PersonsBentoWrap>
        )}

        <CountryPersonGroupsBlock
          countryId={isHistoricalCountry ? undefined : country.id}
          historicalCountryId={isHistoricalCountry ? country.id : undefined}
        />

        {isLoading ? (
          <LedgerTableSkeleton
            rows={7}
            columns={4}
            showToolbar={false}
            label="인물 목록을 불러오는 중"
          />
        ) : isError ? (
          <ErrorRow role="alert">
            <span>인물 목록을 불러오지 못했습니다.</span>
            <RetryButton type="button" onClick={() => void refetch()}>
              다시 시도
            </RetryButton>
          </ErrorRow>
        ) : !hasAny ? (
          <CountryTabEmptyState
            Icon={FiUsers}
            title="아직 이 국가와 연결된 인물이 없습니다"
            description={`인물의 주 국적이나 시대별 소속 국가를 ${country.name}${isHistoricalCountry ? '' : '(또는 연결된 과거 국가)'}로 지정하면 여기에 모입니다. 내각·행정기관·군 부대 재임을 기록해도 함께 묶입니다.`}
            actionLabel="인물 등록"
            onAction={() => {
              setEditPersonId(null)
              setRegisterModalOpen(true)
            }}
            features={[
              { Icon: FiFlag, title: '소속 정치체 · 시대', description: '현대 국가와 과거 국가별로 나눠 비중을 봄' },
              { Icon: FiBarChart2, title: '세기별 활동', description: '어느 세기에 인물이 몰렸는지 막대로' },
              { Icon: FiBriefcase, title: '직역 · 역할', description: '군주·관료·군인 등 역할 구성' },
            ]}
          />
        ) : (
          <>
            <FilterToolbar>
              <ToolbarTopRow>
                <ToolbarSearchCluster>
                  <SearchInputWrap>
                    <FiSearch size={14} />
                    <input
                      type="search"
                      value={query}
                      onChange={(changeEvent) =>
                        setQuery(changeEvent.target.value)
                      }
                      placeholder="이름 · 시호 · 직책 · 기관 검색…"
                      aria-label="인물 검색"
                    />
                  </SearchInputWrap>

                  {activePolityLabel && (
                    <ActiveFilterTag
                      type="button"
                      onClick={() => setPolityFilter(null)}
                    >
                      <span>정치체: {activePolityLabel}</span>
                      <FiX size={11} />
                    </ActiveFilterTag>
                  )}
                  {centuryFilter != null && (
                    <ActiveFilterTag
                      type="button"
                      onClick={() => setCenturyFilter(null)}
                    >
                      <span>{formatCenturyFromIndex(centuryFilter)}</span>
                      <FiX size={11} />
                    </ActiveFilterTag>
                  )}
                  {isFilterActive && (
                    <FilterStatusWrap>
                      <FilterResultText>
                        {filteredUniqueCount.toLocaleString('ko-KR')}명 검색됨
                      </FilterResultText>
                      <FilterResetBtn type="button" onClick={resetAllFilters}>
                        필터 초기화
                      </FilterResetBtn>
                    </FilterStatusWrap>
                  )}
                </ToolbarSearchCluster>

                <ToolbarRight>
                  <SortSelect
                    value={sortBy}
                    onChange={(evt) =>
                      setSortBy(evt.target.value as PersonSortKey)
                    }
                    aria-label="인물 정렬 기준"
                  >
                    <option value="yearAsc">시대순 (오래된순)</option>
                    <option value="yearDesc">시대순 (최신순)</option>
                    <option value="influenceDesc">영향력·관직순</option>
                    <option value="nameAsc">이름 가나다순</option>
                  </SortSelect>

                  <LedgerViewSwitch role="group" aria-label="인물 보기 방식">
                    <LedgerViewSwitchItem
                      type="button"
                      $active={viewMode === 'ledger'}
                      onClick={() => setViewMode('ledger')}
                    >
                      <FiList size={13} />
                      <span>2열 원장</span>
                    </LedgerViewSwitchItem>
                    <LedgerViewSwitchItem
                      type="button"
                      $active={viewMode === 'cards'}
                      onClick={() => setViewMode('cards')}
                    >
                      <FiGrid size={13} />
                      <span>초상 카드</span>
                    </LedgerViewSwitchItem>
                    <LedgerViewSwitchItem
                      type="button"
                      $active={viewMode === 'timeline'}
                      onClick={() => setViewMode('timeline')}
                    >
                      <FiAlignLeft size={13} />
                      <span>생애 연대기</span>
                    </LedgerViewSwitchItem>
                  </LedgerViewSwitch>
                </ToolbarRight>
              </ToolbarTopRow>

              <FilterChipGroup role="tablist" aria-label="인물 범위 및 직역 필터">
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={
                    eraScope === 'all' &&
                    roleFilter === 'all' &&
                    polityFilter == null
                  }
                  $active={
                    eraScope === 'all' &&
                    roleFilter === 'all' &&
                    polityFilter == null
                  }
                  onClick={() => {
                    setEraScope('all')
                    setPolityFilter(null)
                    setRoleFilter('all')
                  }}
                >
                  전체{' '}
                  <FilterChipCount>{summaryStats.totalCount}</FilterChipCount>
                </FilterChip>

                {!isHistoricalCountry && summaryStats.historicalCount > 0 && (
                  <>
                    <FilterChip
                      type="button"
                      role="tab"
                      aria-selected={eraScope === 'modern'}
                      $active={eraScope === 'modern'}
                      onClick={() => {
                        setPolityFilter(null)
                        setEraScope((prev) =>
                          prev === 'modern' ? 'all' : 'modern',
                        )
                      }}
                    >
                      현대 국가{' '}
                      <FilterChipCount>
                        {summaryStats.modernCount}
                      </FilterChipCount>
                    </FilterChip>
                    <FilterChip
                      type="button"
                      role="tab"
                      aria-selected={eraScope === 'historical'}
                      $active={eraScope === 'historical'}
                      onClick={() => {
                        setPolityFilter(null)
                        setEraScope((prev) =>
                          prev === 'historical' ? 'all' : 'historical',
                        )
                      }}
                    >
                      과거 국가{' '}
                      <FilterChipCount>
                        {summaryStats.historicalCount}
                      </FilterChipCount>
                    </FilterChip>
                    <ToolbarPipe aria-hidden />
                  </>
                )}

                {summaryStats.roleSlices
                  .filter((slice) => slice.roleKey !== '미분류')
                  .map((slice) => {
                    const active = roleFilter === slice.roleKey
                    return (
                      <FilterChip
                        key={slice.roleKey}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        $active={active}
                        onClick={() =>
                          setRoleFilter((prev) =>
                            prev === slice.roleKey ? 'all' : slice.roleKey,
                          )
                        }
                      >
                        <PolityLegendDot $color={slice.color} />
                        <span>{slice.label}</span>
                        <FilterChipCount>{slice.value}</FilterChipCount>
                      </FilterChip>
                    )
                  })}
              </FilterChipGroup>
            </FilterToolbar>

            {groups.length === 0 ? (
              <NoMatchRow>
                <span>선택한 필터나 검색어와 일치하는 소속 인물이 없습니다.</span>
                <FilterResetBtn type="button" onClick={resetAllFilters}>
                  전체 보기
                </FilterResetBtn>
              </NoMatchRow>
            ) : viewMode === 'timeline' && timelineCohortData ? (
              <TimelineCohortPanel aria-label="소속 인물 생애 연대기">
                {timelineCohortData.rows.length === 0 ? (
                  <NoMatchRow>
                    <span>
                      생몰년 또는 재임 연도가 확인된 인물이 없어 연대기 막대를 구성할 수 없습니다.
                    </span>
                    <FilterResetBtn
                      type="button"
                      onClick={() => setViewMode('ledger')}
                    >
                      2열 원장으로 보기
                    </FilterResetBtn>
                  </NoMatchRow>
                ) : (
                  <>
                    <TimelineAxisHeader>
                      <TimelineNameHead>인물 · 주요 직책</TimelineNameHead>
                      <TimelineTicksTrack>
                        {timelineCohortData.ticks.map((tick, idx) => (
                          <TimelineTickLabel key={`${tick}-${idx}`}>
                            {formatSignedYearLabel(tick)}년
                          </TimelineTickLabel>
                        ))}
                      </TimelineTicksTrack>
                      <TimelineSpanHead>생몰 · 향년</TimelineSpanHead>
                    </TimelineAxisHeader>

                    <TimelineRowsWrap>
                      {timelineCohortData.rows.map((row) => {
                        const totalSpan = Math.max(
                          1,
                          timelineCohortData.maxYear -
                            timelineCohortData.minYear,
                        )
                        const leftPct = Math.max(
                          0,
                          Math.min(
                            98,
                            ((row.span.start - timelineCohortData.minYear) /
                              totalSpan) *
                              100,
                          ),
                        )
                        const widthPct = Math.max(
                          1.4,
                          Math.min(
                            100 - leftPct,
                            ((row.span.end - row.span.start) / totalSpan) * 100,
                          ),
                        )
                          return (
                            <TimelinePersonRow
                              key={row.person.id}
                              type="button"
                              onClick={() => setPreviewPersonId(row.person.id)}
                            >
                              <TimelinePersonLead>
                                <TimelineMiniAvatar $accent={row.color}>
                                  {row.person.profileImageUrl ? (
                                    <img
                                      src={getUploadImageUrl(
                                        row.person.profileImageUrl,
                                      )}
                                      alt=""
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span>{row.displayName.slice(0, 1)}</span>
                                  )}
                                </TimelineMiniAvatar>
                                <TimelinePersonName title={row.displayName}>
                                  {row.displayName}
                                </TimelinePersonName>
                                {row.roleLabel && (
                                  <TimelineRolePill title={row.roleLabel}>
                                    {row.roleLabel}
                                  </TimelineRolePill>
                                )}
                              </TimelinePersonLead>

                            <TimelineBarLane>
                              <TimelineSpanBar
                                $color={row.color}
                                $dashed={row.span.isPoint}
                                style={{
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                }}
                              />
                            </TimelineBarLane>

                            <TimelineSpanMeta>
                              {formatPersonLifespan(row.person)}
                            </TimelineSpanMeta>
                          </TimelinePersonRow>
                        )
                      })}
                    </TimelineRowsWrap>

                    {(timelineCohortData.undatedCount > 0 ||
                      timelineCohortData.truncatedCount > 0) && (
                      <TimelineFooterMeta>
                        {timelineCohortData.truncatedCount > 0 && (
                          <span>
                            상위 {TIMELINE_MAX_ROWS}명 표시 중 (외{' '}
                            {timelineCohortData.truncatedCount}명은 직역·세기 필터로 좁혀 확인)
                          </span>
                        )}
                        {timelineCohortData.undatedCount > 0 && (
                          <span>
                            연대 미기재 {timelineCohortData.undatedCount}명은 2열 원장에서 확인할 수 있습니다.
                          </span>
                        )}
                      </TimelineFooterMeta>
                    )}
                  </>
                )}
              </TimelineCohortPanel>
            ) : (
              groups.map((group) => {
                const isCollapsed = collapsed.has(group.key)
                const isGroupExpanded =
                  expandedGroups.has(group.key) || isFilterActive
                const visiblePersons =
                  isGroupExpanded || group.persons.length <= GROUP_INITIAL_LIMIT
                    ? group.persons
                    : group.persons.slice(0, GROUP_INITIAL_LIMIT)
                const hiddenCount =
                  group.persons.length - visiblePersons.length
                const historicalTargetId = group.historicalCountryId
                const showGroupHeader =
                  !isHistoricalCountry || groups.length > 1

                return (
                  <Group key={group.key}>
                    {showGroupHeader && (
                      <GroupHeadRow>
                        <GroupToggleBtn
                          type="button"
                          onClick={() => toggleCollapse(group.key)}
                          aria-expanded={!isCollapsed}
                        >
                          <Caret $collapsed={isCollapsed} aria-hidden>
                            <FiChevronDown size={14} />
                          </Caret>
                          <GroupLabel>{group.label}</GroupLabel>
                          {historicalTargetId ? (
                            <PastBadge>과거 국가</PastBadge>
                          ) : (
                            <ModernBadge>현대 국가</ModernBadge>
                          )}
                          <GroupCount>{group.persons.length}명</GroupCount>
                        </GroupToggleBtn>

                        {historicalTargetId && (
                          <GroupCountryLinkBtn
                            type="button"
                            onClick={() =>
                              navigate(
                                pathKeys.countryDetail(historicalTargetId),
                              )
                            }
                          >
                            <span>국가 상세</span>
                            <FiArrowUpRight size={12} />
                          </GroupCountryLinkBtn>
                        )}
                      </GroupHeadRow>
                    )}

                    {!isCollapsed && (
                      <>
                        {viewMode === 'ledger' ? (
                          <PersonLedgerGrid>
                            {visiblePersons.map((person) => {
                              const displayName =
                                getPersonDisplayName(person, true) ||
                                person.name
                              const roleLabel = getPrimaryRoleLabel(person)
                              const roleCategory =
                                classifyPersonRoleCategory(person)
                              const roleColor = roleColorMap[roleCategory]
                              const tenureCount = getTenureCount(person)
                              const lifespanLabel = formatPersonLifespan(person)
                              const influence = (person as ExtendedPerson)
                                .influence
                              return (
                                <PersonLedgerCell
                                  key={`${group.key}-${person.id}`}
                                >
                                  <PersonLedgerMainBtn
                                    type="button"
                                    onClick={() =>
                                      setPreviewPersonId(person.id)
                                    }
                                  >
                                    <PersonAvatar $accent={roleColor}>
                                      {person.profileImageUrl ? (
                                        <img
                                          src={getUploadImageUrl(
                                            person.profileImageUrl,
                                          )}
                                          alt=""
                                          loading="lazy"
                                        />
                                      ) : (
                                        <span>{displayName.slice(0, 1)}</span>
                                      )}
                                    </PersonAvatar>

                                    <PersonMetaCol>
                                      <PersonNameRow>
                                        <PolityLegendDot $color={roleColor} />
                                        <PersonNameText>
                                          {displayName}
                                        </PersonNameText>
                                        <InfluenceBadge
                                          influence={influence}
                                          variant="inline"
                                        />
                                        {tenureCount > 1 && (
                                          <ExtraTenureBadge>
                                            +{tenureCount - 1}직
                                          </ExtraTenureBadge>
                                        )}
                                      </PersonNameRow>
                                      <PersonSubInfoRow>
                                        {roleLabel && (
                                          <PersonRoleBadge title={roleLabel}>
                                            {roleLabel}
                                          </PersonRoleBadge>
                                        )}
                                        <PersonLifespanText>
                                          {lifespanLabel}
                                        </PersonLifespanText>
                                      </PersonSubInfoRow>
                                    </PersonMetaCol>
                                  </PersonLedgerMainBtn>

                                  <PersonDetailBtn
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        pathKeys.personsTimelineDetail(
                                          person.id,
                                        ),
                                      )
                                    }
                                  >
                                    연보 →
                                  </PersonDetailBtn>
                                </PersonLedgerCell>
                              )
                            })}
                          </PersonLedgerGrid>
                        ) : (
                          <CardGrid>
                            {visiblePersons.map((person, index) => {
                              const roleCat = classifyPersonRoleCategory(person)
                              return (
                                <PersonCard
                                  key={`${group.key}-${person.id}`}
                                  person={person}
                                  index={index}
                                  roleLabel={getPrimaryRoleLabel(person)}
                                  roleColor={roleColorMap[roleCat]}
                                  dynastyName={
                                    !isHistoricalCountry &&
                                    group.historicalCountryId
                                      ? group.label
                                      : null
                                  }
                                  onClick={() => setPreviewPersonId(person.id)}
                                  onOpenDetail={() =>
                                    navigate(
                                      pathKeys.personsTimelineDetail(person.id),
                                    )
                                  }
                                />
                              )
                            })}
                          </CardGrid>
                        )}

                        {hiddenCount > 0 && (
                          <ShowMoreRow>
                            <ShowMoreBtn
                              type="button"
                              onClick={() => toggleGroupExpand(group.key)}
                            >
                              {group.label} 인물 +{hiddenCount}명 더 펼치기 (총{' '}
                              {group.persons.length}명)
                            </ShowMoreBtn>
                          </ShowMoreRow>
                        )}
                      </>
                    )}
                  </Group>
                )
              })
            )}
          </>
        )}

        <PersonInlineModal
          personId={previewPersonId}
          onClose={() => setPreviewPersonId(null)}
          onEdit={(targetId) => {
            setPreviewPersonId(null)
            setEditPersonId(targetId)
            setRegisterModalOpen(true)
          }}
          onOpenDetail={(targetId) => {
            setPreviewPersonId(null)
            navigate(pathKeys.personsTimelineDetail(targetId))
          }}
        />

        <PersonRegisterViewModal
          isOpen={registerModalOpen}
          onClose={() => {
            setRegisterModalOpen(false)
            setEditPersonId(null)
          }}
          initialCountryId={editPersonId ? undefined : country.id}
          editPersonId={editPersonId}
          onSuccess={() => {
            invalidateAllPersonQueries()
          }}
        />
      </SectionWrap>
    </DashboardStyles.DashboardRoot>
  )
}

const SectionWrap = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
`

const InlineCardResetBtn = styled.button`
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const FilterToolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 0 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const ToolbarTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const ToolbarSearchCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 240px;
`

const FilterChipGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const ToolbarPipe = styled.span`
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const FilterChip = styled(LedgerFilterChip)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

const FilterChipCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  ${DIGIT_DISPLAY}
  opacity: 0.85;
`

const ToolbarRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ActiveFilterTag = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
`

const FilterStatusWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const FilterResultText = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FilterResetBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const SearchInputWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
  width: min(280px, 100%);
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &:focus-within {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: transparent;
  }

  input {
    border: none;
    background: transparent;
    font-family: inherit;
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 12.5px;
    width: 100%;
    outline: none;
  }
`

const SortSelect = styled.select`
  height: 34px;
  padding: 0 10px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const Group = styled.section`
  display: flex;
  flex-direction: column;
  padding-top: 18px;
`

const GroupHeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const GroupToggleBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 10px 0;
  border: none;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
`

const GroupCountryLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 6px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const Caret = styled.span<{ $collapsed: boolean }>`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: transform 0.15s ease;
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});
`

const GroupLabel = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PastBadge = styled.span`
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#92400e')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245,158,11,0.16)' : '#fef3c7'};
`

const ModernBadge = styled.span`
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
`

const GroupCount = styled.span`
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const PersonLedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const PersonLedgerCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  @media (min-width: 760px) {
    &:nth-child(odd) {
      padding-right: 10px;
    }

    &:nth-child(even) {
      padding-left: 10px;
      border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }
`

const PersonLedgerMainBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 12px 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const PersonAvatar = styled.div<{ $accent: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: ${({ $accent }) => $accent};
  background: ${({ $accent, theme }) =>
    theme.mode === 'dark' ? `${$accent}22` : `${$accent}14`};
  border: 1.5px solid
    ${({ $accent, theme }) =>
      theme.mode === 'dark' ? `${$accent}55` : `${$accent}38`};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const PersonMetaCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const PersonNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  min-width: 0;
`

const PersonNameText = styled.span`
  font-size: 14px;
  font-weight: 750;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PersonSubInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
`

const PersonRoleBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 650;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ExtraTenureBadge = styled.span`
  padding: 0 5px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const PersonLifespanText = styled.span`
  font-size: 11.5px;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PersonDetailBtn = styled.button`
  padding: 6px 10px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(256px, 1fr));
  gap: 12px;
  padding-top: 14px;
`

const ShowMoreRow = styled.div`
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
`

const ShowMoreBtn = styled.button`
  padding: 6px 14px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  ${DIGIT_DISPLAY}

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const TimelineCohortPanel = styled.section`
  display: flex;
  flex-direction: column;
  margin-top: 12px;
  border: none;
  background: transparent;
`

const TimelineAxisHeader = styled.div`
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 150px;
  align-items: center;
  gap: 14px;
  padding: 10px 8px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 780px) {
    grid-template-columns: 160px minmax(0, 1fr);
  }
`

const TimelineNameHead = styled.span``

const TimelineTicksTrack = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${DIGIT_DISPLAY}
`

const TimelineTickLabel = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TimelineSpanHead = styled.span`
  text-align: right;
  @media (max-width: 780px) {
    display: none;
  }
`

const TimelineRowsWrap = styled.div`
  display: flex;
  flex-direction: column;
`

const TimelinePersonRow = styled.button`
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 150px;
  align-items: center;
  gap: 14px;
  padding: 9px 8px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 780px) {
    grid-template-columns: 160px minmax(0, 1fr);
  }
`

const TimelinePersonLead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const TimelineMiniAvatar = styled.span<{ $accent: string }>`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 800;
  color: ${({ $accent }) => $accent};
  background: ${({ $accent, theme }) =>
    theme.mode === 'dark' ? `${$accent}24` : `${$accent}14`};
  border: 1px solid
    ${({ $accent, theme }) =>
      theme.mode === 'dark' ? `${$accent}50` : `${$accent}38`};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const TimelinePersonName = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TimelineRolePill = styled.span`
  padding: 0 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 96px;
`

const TimelineBarLane = styled.div`
  position: relative;
  height: 12px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const TimelineSpanBar = styled.div<{ $color: string; $dashed?: boolean }>`
  position: absolute;
  top: 2px;
  bottom: 2px;
  min-width: 6px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  opacity: ${({ $dashed }) => ($dashed ? 0.55 : 0.88)};
`

const TimelineSpanMeta = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  ${DIGIT_DISPLAY}

  @media (max-width: 780px) {
    display: none;
  }
`

const TimelineFooterMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const NoMatchRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 4px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ErrorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const RetryButton = styled.button`
  border: none;
  background: transparent;
  padding: 0 2px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: underline;
  cursor: pointer;
`

const PersonsBentoWrap = styled.div`
  padding: 24px 0 28px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  margin-top: 10px;
`

const EditorialSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  align-items: start;

  > *:first-child {
    padding-right: 28px;
  }

  > *:nth-child(2) {
    padding: 0 28px;
    border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }

  > *:nth-child(3) {
    padding-left: 28px;
  }

  @media (max-width: 1120px) {
    grid-template-columns: 1fr;
    gap: 24px;

    > *:first-child,
    > *:nth-child(2),
    > *:nth-child(3) {
      padding: 0;
      border-left: none;
      border-right: none;
    }

    > * + * {
      padding-top: 24px;
      border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }
`

const PolityHeroRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 10px;
`

const PolityBigCount = styled.strong`
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}

  span {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PolitySplitNote = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const PolityLegendList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
`

const PolityLegendBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  font-size: 11.5px;
  cursor: pointer;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const PolityLegendStatic = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 11.5px;
  padding: 2px 2px;
`

const PolityLegendDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const PolityLegendName = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 112px;
`

const PolityLegendCount = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 700;
  ${DIGIT_DISPLAY}
`

const CenturyHistBars = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: flex-end;
  justify-content: ${({ $compact }) => ($compact ? 'flex-start' : 'space-between')};
  gap: ${({ $compact }) => ($compact ? '14px' : '4px')};
  height: 86px;
  padding-top: 4px;

  > button {
    flex: ${({ $compact }) => ($compact ? '0 0 42px' : '1 1 0')};
  }
`

const CenturyBarColBtn = styled.button<{
  $active?: boolean
  $dimmed?: boolean
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  height: 100%;
  min-width: 0;
  padding: 2px 1px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  opacity: ${({ $dimmed }) => ($dimmed ? 0.42 : 1)};
  font-family: inherit;
  cursor: pointer;

  &:hover {
    opacity: 1;
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const CenturyBarCount = styled.span<{ $active?: boolean }>`
  font-size: 9.5px;
  font-weight: 700;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  line-height: 1;
  ${DIGIT_DISPLAY}
`

const CenturyBarTrack = styled.div<{ $active?: boolean }>`
  width: 100%;
  max-width: 22px;
  flex: 1;
  display: flex;
  align-items: flex-end;
  border-radius: ${RADIUS.XS} ${RADIUS.XS} 0 0;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  border-bottom: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : ledgerHairline(theme.mode)};
`

const CenturyBarFill = styled.div<{ $highlight?: boolean }>`
  width: 100%;
  border-radius: ${RADIUS.XS} ${RADIUS.XS} 0 0;
  background: ${({ theme, $highlight }) =>
    $highlight
      ? 'linear-gradient(180deg, #6366f1 0%, #0ea5e9 100%)'
      : theme.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(165, 180, 252, 0.52) 0%, rgba(56, 189, 248, 0.36) 100%)'
        : 'linear-gradient(180deg, rgba(99, 102, 241, 0.44) 0%, rgba(14, 165, 233, 0.3) 100%)'};
`

const CenturyBarAxis = styled.span<{ $active?: boolean }>`
  font-size: 9.5px;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  line-height: 1;
  white-space: nowrap;
  ${DIGIT_DISPLAY}
`

const HistFooterNote = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const HistEmptyNote = styled.div`
  padding: 16px 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RoleDonutLayout = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

const RoleLegendList = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const RoleLegendBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 3px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  font-size: 11.5px;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const RoleLegendName = styled.span<{ $active?: boolean }>`
  flex: 1;
  min-width: 0;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RoleLegendMeta = styled.span`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 700;
  ${DIGIT_DISPLAY}
`
