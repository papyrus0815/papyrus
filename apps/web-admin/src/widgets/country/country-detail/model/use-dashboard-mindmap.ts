import { useCallback, useEffect, useMemo, useState } from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { politicalSystemKeys } from '@/entities/political-system/api'
import {
  GOVERNMENT_FORM_LABEL,
  headOfGovernmentTitleOf,
  headOfStateTitleOf,
  LEGISLATURE_TYPE_LABEL,
  PARTY_SYSTEM_LABEL,
  STATE_STRUCTURE_LABEL,
} from '@/entities/political-system/model/political-system'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { personCareerApi } from '@/shared/api/person-career'
import {
  listPoliticalSystems,
  type PoliticalSystem,
} from '@/shared/api/political-system'
import {
  compareCabinetsNewestFirst,
  dateRangesOverlapIso,
  doesMemberMatchDepartment,
  filterDepartmentsForCabinet,
  findActivePoliticalSystemForCabinet,
  GOVERNMENT_FORM_META,
  getTenureChronologyKey,
} from '@/shared/lib/ministry-department/department-cabinet-matcher'
import {
  DEPARTMENT_NAME_FRAMES,
  type DepartmentNameFrame,
  getDepartmentNameFrame,
  inferDepartmentFrameId,
  suggestFrameItems,
} from '@/shared/lib/ministry-department/department-name-frames'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

export interface MindMapMember {
  id: string
  personId: string | null
  name: string
  imageUrl: string | null
  title: string
  departmentName?: string | null
  departmentId?: string | null
  startDate: string | null
  endDate: string | null
  isHead: boolean
  ordinal: number | null
  replaced: boolean
  predecessor: string | null
  isMonarchical?: boolean
  regnalEraLabel?: string | null
  polityLabel?: string | null
  cabinetId?: string | null
  cabinetLabel?: string | null
  partyName?: string | null
  partyColor?: string | null
  administrationDepartmentId?: string | null
  administrationDepartment?: {
    id: string
    name?: string | null
    categoryId?: string | null
  } | null
  positionDefinition?: {
    id?: string
    title?: string | null
    titleEn?: string | null
    categoryId?: string | null
    administrationDepartmentId?: string | null
  } | null
}

export interface MindMapVacantSlot {
  key: string
  departmentId: string | null
  departmentName: string
  positionTitle: string
  isPreset?: boolean
}

export interface MindMapMilitaryCommandItem {
  unitId: string
  unitName: string
  branch: string
  unitType: string
  commanderPersonId: string | null
  commanderName: string | null
  commanderImageUrl: string | null
  commanderRankOrTitle: string | null
  startDate: string | null
}

export interface MindMapSelectorItem {
  id: string
  mode: 'cabinet' | 'fallback'
  label: string
  subLabel: string | null
  imageUrl: string | null
  active: boolean
}

interface RawTenureRow {
  id: string
  personId?: string | null
  cabinetId?: string | null
  positionType?: string | null
  positionDefinition?: {
    id?: string
    positionType?: string | null
    title?: string | null
    titleEn?: string | null
    categoryId?: string | null
    administrationDepartmentId?: string | null
    isMonarchical?: boolean | null
  } | null
  title?: string | null
  ordinal?: number | null
  isMonarchical?: boolean | null
  regnalName?: string | null
  regnalEras?: Array<{
    id: string
    eraName?: string | null
    startEra?: string | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
    endEra?: string | null
    endYear?: number | null
    endMonth?: number | null
    endDay?: number | null
    startDate?: string | null
    endDate?: string | null
  }> | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  startDate?: string | null
  endDate?: string | null
  administrationDepartmentId?: string | null
  administrationDepartment?: {
    id: string
    name: string
    categoryId?: string | null
  } | null
  militaryUnitId?: string | null
  rankTitle?: string | null
  historicalCountryId?: string | null
  historicalCountry?: { id?: string; name?: string | null } | null
  politicalParty?: {
    id?: string
    name?: string | null
    color?: string | null
  } | null
  electionCandidacy?: {
    id: string
    result?: {
      voteSharePercent?: string | number | null
      elected?: boolean
    } | null
    election?: {
      id: string
      name: string
      pollDate?: string | null
      electionType?: string | null
    } | null
  } | null
  person?: {
    id?: string
    name: string
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
    profileImageUrl?: string | null
    country?: {
      defaultNameDisplayOrder?: string | null
      isoCode?: string | null
    } | null
  } | null
}

const HEAD_TYPES = new Set(['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'])

function isTenureMonarchical(row: RawTenureRow | null | undefined): boolean {
  if (!row) return false
  if (row.isMonarchical || row.positionDefinition?.isMonarchical) return true
  if (row.regnalName?.trim()) return true
  const title = (row.title ?? row.positionDefinition?.title ?? '').trim()
  return /황제|국왕|여왕|왕|천황|차르|술탄|대공|샤|파라오|칸|태왕|가한|쇼군/.test(
    title,
  )
}

function resolveTenureDisplayName(row: RawTenureRow | null | undefined): string {
  if (!row) return '이름 미상'
  const regnal = row.regnalName?.trim()
  if (regnal && isTenureMonarchical(row)) return regnal
  if (row.person?.name) {
    return (
      getPersonDisplayName({
        name: row.person.name,
        surname: row.person.surname ?? null,
        middleName: row.person.middleName ?? null,
        nameDisplayOrder: row.person.nameDisplayOrder ?? null,
        country: row.person.country ?? null,
      }) || row.person.name
    )
  }
  return regnal || '이름 미상'
}

function formatStructuredIso(
  era: string | null | undefined,
  year: number | null | undefined,
  month: number,
  day: number,
): string | null {
  if (year == null || !Number.isFinite(year) || year <= 0) return null
  const prefix = era === 'BC' ? '-' : ''
  const y = String(Math.abs(year)).padStart(4, '0')
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${prefix}${y}-${m}-${d}`
}

function resolveTenureStartIso(row: RawTenureRow | null | undefined): string | null {
  if (!row) return null
  if (row.startDate) return row.startDate
  return formatStructuredIso(
    row.startEra,
    row.startYear,
    row.startMonth ?? 1,
    row.startDay ?? 1,
  )
}

function resolveTenureEndIso(row: RawTenureRow | null | undefined): string | null {
  if (!row) return null
  if (row.endDate) return row.endDate
  return formatStructuredIso(
    row.endEra,
    row.endYear,
    row.endMonth ?? 12,
    row.endDay ?? 28,
  )
}

function tenuresOverlap(
  a: RawTenureRow | null | undefined,
  b: RawTenureRow | null | undefined,
): boolean {
  const aStart = resolveTenureStartIso(a)
  const bStart = resolveTenureStartIso(b)
  if (!aStart || !bStart) return false
  const aEnd = resolveTenureEndIso(a)
  const bEnd = resolveTenureEndIso(b)
  if (
    aEnd &&
    bEnd &&
    aStart.length >= 10 &&
    aEnd.length >= 10 &&
    bStart.length >= 10 &&
    bEnd.length >= 10 &&
    aStart < aEnd &&
    bStart < bEnd &&
    (aEnd === bStart || bEnd === aStart)
  ) {
    return false
  }
  return dateRangesOverlapIso(aStart, aEnd, bStart, bEnd)
}

function resolveRegnalEraLabel(
  row: RawTenureRow | null | undefined,
  pivotStartIso?: string | null,
  pivotEndIso?: string | null,
): string | null {
  const eras = (row?.regnalEras ?? []).filter((e) => e.eraName?.trim())
  if (eras.length === 0) return null
  if (pivotStartIso) {
    const matched = eras.find((e) => {
      const startIso =
        e.startDate ??
        formatStructuredIso(
          e.startEra,
          e.startYear,
          e.startMonth ?? 1,
          e.startDay ?? 1,
        )
      const endIso =
        e.endDate ??
        formatStructuredIso(
          e.endEra ?? e.startEra,
          e.endYear,
          e.endMonth ?? 12,
          e.endDay ?? 28,
        )
      return dateRangesOverlapIso(
        startIso,
        endIso,
        pivotStartIso,
        pivotEndIso ?? null,
      )
    })
    if (matched?.eraName) return `${matched.eraName.trim()} 연호`
  }
  const names = eras.map((e) => e.eraName!.trim())
  return names.length === 1 ? names[0] : names.slice(0, 2).join('·')
}

function isCabinetMinisterCandidate(
  row: RawTenureRow,
  headTenure: RawTenureRow,
): boolean {
  if (row.id === headTenure.id) return false
  const headPersonId = headTenure.person?.id ?? headTenure.personId ?? null
  const rowPersonId = row.person?.id ?? row.personId ?? null
  if (headPersonId && rowPersonId === headPersonId) return false

  const type = row.positionType ?? row.positionDefinition?.positionType ?? ''
  if (HEAD_TYPES.has(type)) return false
  if (
    type === 'ROYAL_NOBLE_TITLE' ||
    type === 'DIPLOMATIC_POST' ||
    type === 'LOCAL_GOVERNMENT' ||
    type === 'LEGISLATOR'
  ) {
    return false
  }
  if (row.administrationDepartmentId) return true
  if (
    type === 'CABINET_MINISTER' ||
    type === 'VICE_MINISTER' ||
    type === 'DEPUTY_HEAD_OF_STATE'
  ) {
    return true
  }
  const title = (row.title ?? row.positionDefinition?.title ?? '').trim()
  if (
    (type === 'SPECIAL_POSITION' || !type) &&
    /장관|대신|상서|판서|정승|영의정|좌의정|우의정|승상|재상|총리|부총리|부통령|총재|의장|처장|청장|위원장|국무|내각|대장군|도독/.test(
      title,
    )
  ) {
    return true
  }
  return false
}

function protocolRank(title: string): number {
  if (/총리|수상|영의정|승상|재상|부통령/.test(title) && !/부총리/.test(title)) {
    return 0
  }
  if (/부총리|좌의정|우의정/.test(title)) return 1
  return 2
}

function resolveDepartmentHeadPositionTitle(
  deptName: string,
  currentFrame: DepartmentNameFrame,
  countryName?: string | null,
  polityLabel?: string | null,
): string {
  const clean = deptName.trim()
  const candidates = [
    ...currentFrame.items,
    ...DEPARTMENT_NAME_FRAMES.flatMap((f) => f.items),
  ]
  for (const item of candidates) {
    if (!item.headPositionTitle) continue
    if (
      clean === item.name ||
      clean.endsWith(` ${item.name}`) ||
      (item.name.length >= 2 && clean.endsWith(item.name))
    ) {
      return item.headPositionTitle
    }
  }

  let shortName = clean
  for (const prefix of [polityLabel, countryName]) {
    const p = prefix?.trim()
    if (p && shortName.startsWith(`${p} `)) {
      shortName = shortName.slice(p.length + 1).trim()
    }
  }

  if (/부$/.test(shortName) && currentFrame.headTitle === '부장') {
    return `${shortName}장`
  }
  if (
    /(부|성|처)$/.test(shortName) &&
    (currentFrame.headTitle === '장관' ||
      currentFrame.headTitle === '대신' ||
      currentFrame.headTitle === '상서')
  ) {
    return `${shortName.replace(/(부|성|처)$/, '')}${currentFrame.headTitle}`
  }
  if (/조$/.test(shortName) && currentFrame.headTitle === '판서') {
    return `${shortName}판서`
  }
  return `${shortName} ${currentFrame.headTitle}`
}

export function formatShortMindMapDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const bc = /^-(\d{1,6})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (bc) return `BC ${Number(bc[1])}`
  const ad = /^(\d{1,4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (ad) {
    const y = Number(ad[1])
    const m = Number(ad[2])
    const d = Number(ad[3])
    if (m === 1 && d === 1) return `${y}년`
    return `${y}.${m}.${d}`
  }
  const yearOnly = /^(-?\d{1,6})/.exec(iso.trim())
  if (yearOnly) {
    const y = Number(yearOnly[1])
    return y < 0 ? `BC ${Math.abs(y)}` : `${y}년`
  }
  return iso.trim()
}

export function formatMindMapElapsed(iso: string | null | undefined): string | null {
  if (!iso || iso.startsWith('-')) return null
  const start = new Date(iso)
  if (Number.isNaN(start.getTime())) return null
  const now = new Date()
  const months =
    (now.getFullYear() - start.getUTCFullYear()) * 12 +
    (now.getMonth() - start.getUTCMonth())
  if (months < 1) return '현직 취임'
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (years === 0) return `${rest}개월째`
  return rest === 0 ? `${years}년째` : `${years}년 ${rest}개월째`
}

export interface UseDashboardMindMapParams {
  countryId?: string
  historicalCountryId?: string
  countryName?: string | null
  countryIsoCode?: string | null
  /** 외부(예: 역사국가 치세 스펙트럼 막대)에서 특정 통치자 재임 ID를 선택했을 때 */
  focusedTenureId?: string | null
}

export function useDashboardMindMap({
  countryId = '',
  historicalCountryId,
  countryName,
  countryIsoCode,
  focusedTenureId,
}: UseDashboardMindMapParams) {
  const isModernScope = Boolean(countryId) && !historicalCountryId

  const [headViewMode, setHeadViewMode] = useState<'cabinet' | 'fallback'>(
    historicalCountryId ? 'fallback' : 'cabinet',
  )
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(
    null,
  )
  const [selectedFallbackHeadId, setSelectedFallbackHeadId] = useState<
    string | null
  >(null)

  const departmentsQuery = useQuery({
    queryKey: historicalCountryId
      ? administrationDepartmentsByHistoricalCountryQueryKey(
          historicalCountryId,
          { includeConstituents: true },
        )
      : administrationDepartmentsByCountryQueryKey(countryId),
    queryFn: () =>
      historicalCountryId
        ? administrationDepartmentApi.getByHistoricalCountryId(
            historicalCountryId,
            { includeConstituents: true },
          )
        : administrationDepartmentApi.getByCountryId(countryId),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 5 * 60_000,
  })

  const cabinetsQuery = useQuery({
    queryKey: [
      'cabinets-by-country',
      countryId || undefined,
      historicalCountryId,
      ...(historicalCountryId ? (['with-constituents'] as const) : []),
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryId || undefined,
        historicalCountryId,
        includeConstituents: Boolean(historicalCountryId) || undefined,
      }),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  const tenuresQuery = useQuery({
    queryKey: [
      'tenures-by-country',
      countryId || undefined,
      historicalCountryId,
      ...(historicalCountryId ? (['with-constituents'] as const) : []),
    ],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId: countryId || undefined,
        historicalCountryId,
        includeConstituents: Boolean(historicalCountryId) || undefined,
      }),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  const politicalSystemsQuery = useQuery({
    queryKey: politicalSystemKeys.list({
      countryId: countryId || undefined,
      historicalCountryId,
    }),
    queryFn: () =>
      listPoliticalSystems({
        countryId: countryId || undefined,
        historicalCountryId,
      }),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 5 * 60_000,
  })

  const cabinets = useMemo(() => {
    const rows = cabinetsQuery.data ?? []
    const scopedRows = isModernScope
      ? rows.filter(
          (cab) =>
            !(cab as { historicalCountryId?: string | null }).historicalCountryId &&
            !cab.headTenure?.historicalCountryId,
        )
      : rows
    return [...scopedRows].sort(compareCabinetsNewestFirst)
  }, [cabinetsQuery.data, isModernScope])

  const cabinetHeadIds = useMemo(() => {
    const set = new Set<string>()
    for (const cab of cabinets) {
      if (cab.headTenure?.id) set.add(cab.headTenure.id)
    }
    return set
  }, [cabinets])

  const fallbackHeadTenures = useMemo(() => {
    const rows = (tenuresQuery.data ?? []) as RawTenureRow[]
    const hasDirectHistoricalHeads = historicalCountryId
      ? rows.some((row) => {
          const posType =
            row.positionType ?? row.positionDefinition?.positionType ?? ''
          return (
            HEAD_TYPES.has(posType) &&
            row.historicalCountryId === historicalCountryId
          )
        })
      : false

    const filtered = rows.filter((row) => {
      const type =
        row.positionType ?? row.positionDefinition?.positionType ?? ''
      if (!HEAD_TYPES.has(type)) return false
      if (isModernScope && row.historicalCountryId) {
        return false
      }
      if (
        historicalCountryId &&
        hasDirectHistoricalHeads &&
        row.historicalCountryId &&
        row.historicalCountryId !== historicalCountryId
      ) {
        return false
      }
      if (!historicalCountryId && cabinets.length > 0 && cabinetHeadIds.has(row.id)) {
        return false
      }
      // 역사 국가에서는 내각과 별개로 국가원수·군주 전체 계보를 치세 모드로 탐색 가능하게 유지
      if (historicalCountryId && cabinetHeadIds.has(row.id) && !isTenureMonarchical(row)) {
        return false
      }
      return true
    })

    // 현대는 최신순(인덱스 0 = 현직), 역사는 연대기 오름차순(인덱스 0 = 초대 군주/원수) 정렬이 자연스럽지만
    // 일관된 좌우 네비게이션을 위해 최신순 정렬 후 역사국가는 기본 선택을 마지막/대표 군주 또는 초대 군주로 설정
    return filtered.sort((left, right) => {
      const keyLeft = getTenureChronologyKey(left) ?? Number.MIN_SAFE_INTEGER
      const keyRight = getTenureChronologyKey(right) ?? Number.MIN_SAFE_INTEGER
      return keyRight - keyLeft
    })
  }, [tenuresQuery.data, historicalCountryId, isModernScope, cabinets.length, cabinetHeadIds])

  // 국가 변경 시 초기 모드 설정
  useEffect(() => {
    if (historicalCountryId) {
      setHeadViewMode(cabinets.length > 0 ? 'cabinet' : 'fallback')
      return
    }
    const hasModernCabinet = cabinets.some(
      (cab) => !cab.headTenure?.historicalCountryId,
    )
    const hasModernFallbackHead = fallbackHeadTenures.some(
      (row) => !row.historicalCountryId,
    )
    setHeadViewMode(
      !hasModernCabinet && hasModernFallbackHead ? 'fallback' : 'cabinet',
    )
  }, [countryId, historicalCountryId, fallbackHeadTenures, cabinets])

  useEffect(() => {
    if (cabinets.length === 0) {
      setSelectedCabinetId(null)
      return
    }
    setSelectedCabinetId((prev) => {
      if (prev && cabinets.some((c) => c.id === prev)) return prev
      const modernPool = isModernScope
        ? cabinets.filter((c) => !c.headTenure?.historicalCountryId)
        : []
      const pool = modernPool.length > 0 ? modernPool : cabinets
      const activeCab = pool.find((c) => !c.headTenure?.endDate)
      return (activeCab ?? pool[0]).id
    })
  }, [cabinets, isModernScope])

  useEffect(() => {
    if (fallbackHeadTenures.length === 0) {
      setSelectedFallbackHeadId(null)
      return
    }
    setSelectedFallbackHeadId((prev) => {
      if (prev && fallbackHeadTenures.some((r) => r.id === prev)) return prev
      if (historicalCountryId) {
        // 역사 국가는 초대(창건) 군주·수반(배열 마지막)을 기본 표시해 건국부터 탐색하기 좋게 함
        return fallbackHeadTenures[fallbackHeadTenures.length - 1].id
      }
      const modernPool = isModernScope
        ? fallbackHeadTenures.filter((r) => !r.historicalCountryId)
        : []
      const pool = modernPool.length > 0 ? modernPool : fallbackHeadTenures
      return (pool.find((r) => !r.endDate && r.endYear == null) ?? pool[0]).id
    })
  }, [fallbackHeadTenures, isModernScope, historicalCountryId])

  const selectByTenureId = useCallback(
    (tenureId: string) => {
      const matchedCab = cabinets.find((c) => c.headTenure?.id === tenureId)
      if (matchedCab) {
        setSelectedCabinetId(matchedCab.id)
        setHeadViewMode('cabinet')
        return
      }
      const matchedFallback = fallbackHeadTenures.find((r) => r.id === tenureId)
      if (matchedFallback) {
        setSelectedFallbackHeadId(matchedFallback.id)
        setHeadViewMode('fallback')
      }
    },
    [cabinets, fallbackHeadTenures],
  )

  useEffect(() => {
    if (focusedTenureId) {
      selectByTenureId(focusedTenureId)
    }
  }, [focusedTenureId, selectByTenureId])

  const effectiveFallbackMode =
    cabinets.length === 0 ||
    (headViewMode === 'fallback' && fallbackHeadTenures.length > 0)

  const selectedCabinet = effectiveFallbackMode
    ? null
    : (cabinets.find((c) => c.id === selectedCabinetId) ?? cabinets[0] ?? null)

  const activeFallbackHead = useMemo(
    () =>
      fallbackHeadTenures.find((r) => r.id === selectedFallbackHeadId) ??
      fallbackHeadTenures[0] ??
      null,
    [fallbackHeadTenures, selectedFallbackHeadId],
  )

  const overviewQuery = useQuery({
    queryKey: ['cabinet-overview', selectedCabinet?.id ?? null],
    queryFn: () =>
      personCareerApi.getCabinetOverview(selectedCabinet!.id),
    enabled: Boolean(!effectiveFallbackMode && selectedCabinet?.id),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  const effectiveOverview = useMemo(() => {
    if (effectiveFallbackMode || !selectedCabinet) return null
    const raw = overviewQuery.data ?? null
    if (!raw) return null
    if (raw.id === selectedCabinet.id) return raw
    return overviewQuery.isFetching ? raw : null
  }, [
    effectiveFallbackMode,
    selectedCabinet,
    overviewQuery.data,
    overviewQuery.isFetching,
  ])

  const activeCabinetScope = useMemo(() => {
    const scopeTenure = effectiveFallbackMode
      ? activeFallbackHead
      : ((effectiveOverview?.headTenure ??
          selectedCabinet?.headTenure) as RawTenureRow | null | undefined)
    if (!scopeTenure) {
      return {
        startDate: null,
        endDate: null,
        historicalCountryId: historicalCountryId ?? null,
      }
    }
    return {
      startDate: resolveTenureStartIso(scopeTenure),
      endDate: resolveTenureEndIso(scopeTenure),
      historicalCountryId:
        scopeTenure.historicalCountryId ?? historicalCountryId ?? null,
    }
  }, [
    effectiveFallbackMode,
    activeFallbackHead,
    effectiveOverview,
    selectedCabinet,
    historicalCountryId,
  ])

  const activePoliticalSystem: PoliticalSystem | null = useMemo(
    () =>
      findActivePoliticalSystemForCabinet(
        politicalSystemsQuery.data ?? [],
        activeCabinetScope,
      ),
    [politicalSystemsQuery.data, activeCabinetScope],
  )

  const allDepartments = departmentsQuery.data ?? []
  const eraDepartments = useMemo(
    () => filterDepartmentsForCabinet(allDepartments, activeCabinetScope),
    [allDepartments, activeCabinetScope],
  )

  const activePolityLabel =
    selectedCabinet?.headTenure?.historicalCountry?.name ??
    activeFallbackHead?.historicalCountry?.name ??
    null
  const activeHistId =
    selectedCabinet?.headTenure?.historicalCountryId ??
    activeFallbackHead?.historicalCountryId ??
    historicalCountryId ??
    null

  const frame = useMemo(() => {
    const frameId = inferDepartmentFrameId(
      eraDepartments.map((d) => d.name),
      {
        name: activePolityLabel ?? countryName ?? null,
        isoCode: activeHistId ? null : (countryIsoCode ?? null),
        isHistorical: Boolean(activeHistId),
      },
    )
    return getDepartmentNameFrame(frameId)
  }, [eraDepartments, activePolityLabel, countryName, activeHistId, countryIsoCode])

  const { head, members } = useMemo(() => {
    const allRows = (tenuresQuery.data ?? []) as RawTenureRow[]

    const mapRow = (
      row: RawTenureRow,
      isHead: boolean,
      replaced: boolean,
      predecessor: string | null,
    ): MindMapMember => {
      const matchedDept =
        row.administrationDepartment ??
        eraDepartments.find((dept) =>
          doesMemberMatchDepartment(
            {
              title: row.title ?? row.positionDefinition?.title ?? null,
              administrationDepartmentId: row.administrationDepartmentId ?? null,
              administrationDepartment: row.administrationDepartment ?? null,
              positionDefinition: row.positionDefinition ?? null,
            },
            dept,
            eraDepartments,
          ),
        ) ??
        null

      return {
        id: String(row.id),
        personId: row.person?.id ?? row.personId ?? null,
        name: resolveTenureDisplayName(row),
        imageUrl: row.person?.profileImageUrl ?? null,
        title: (
          row.title ??
          row.positionDefinition?.title ??
          (isHead ? '국가원수' : '각료')
        ).trim(),
        departmentName: matchedDept?.name ?? null,
        departmentId: matchedDept?.id ?? row.administrationDepartmentId ?? null,
        startDate: resolveTenureStartIso(row),
        endDate: resolveTenureEndIso(row),
        isHead,
        ordinal: typeof row.ordinal === 'number' ? row.ordinal : null,
        replaced,
        predecessor,
        isMonarchical: isTenureMonarchical(row),
        regnalEraLabel: resolveRegnalEraLabel(row),
        polityLabel: row.historicalCountry?.name ?? null,
        partyName: row.politicalParty?.name ?? null,
        partyColor: row.politicalParty?.color ?? null,
        administrationDepartmentId: row.administrationDepartmentId ?? null,
        administrationDepartment: row.administrationDepartment ?? null,
        positionDefinition: row.positionDefinition ?? null,
      }
    }

    const dedupeAndSortMinisters = (rawList: RawTenureRow[]): MindMapMember[] => {
      const bySlotKey = new Map<string, RawTenureRow[]>()
      for (const row of rawList) {
        const title = (row.title ?? row.positionDefinition?.title ?? '').trim()
        const slotKey = row.administrationDepartmentId
          ? `dept:${row.administrationDepartmentId}`
          : title
        if (!slotKey) continue
        const bucket = bySlotKey.get(slotKey) ?? []
        bucket.push(row)
        bySlotKey.set(slotKey, bucket)
      }

      const out: MindMapMember[] = []
      for (const list of bySlotKey.values()) {
        const current =
          list.find((r) => !resolveTenureEndIso(r)) ??
          [...list].sort((a, b) =>
            (resolveTenureEndIso(b) ?? '').localeCompare(
              resolveTenureEndIso(a) ?? '',
            ),
          )[0]
        if (!current) continue
        const earlier = list
          .filter((r) => r.id !== current.id && Boolean(resolveTenureEndIso(r)))
          .sort((a, b) =>
            (resolveTenureEndIso(b) ?? '').localeCompare(
              resolveTenureEndIso(a) ?? '',
            ),
          )[0]
        out.push(
          mapRow(
            current,
            false,
            Boolean(earlier),
            earlier ? resolveTenureDisplayName(earlier) : null,
          ),
        )
      }

      out.sort(
        (a, b) =>
          protocolRank(a.title) - protocolRank(b.title) ||
          (a.startDate ?? '').localeCompare(b.startDate ?? ''),
      )
      return out
    }

    if (effectiveFallbackMode) {
      if (!activeFallbackHead) {
        return { head: null, members: [] as MindMapMember[] }
      }
      const headHistId = activeFallbackHead.historicalCountryId ?? null
      const overlappingMinisters = allRows.filter((row) => {
        if (!isCabinetMinisterCandidate(row, activeFallbackHead)) return false
        if (
          !historicalCountryId &&
          (row.historicalCountryId ?? null) !== headHistId
        ) {
          return false
        }
        return tenuresOverlap(row, activeFallbackHead)
      })
      return {
        head: mapRow(activeFallbackHead, true, false, null),
        members: dedupeAndSortMinisters(overlappingMinisters),
      }
    }

    const headTenure = (effectiveOverview?.headTenure ??
      selectedCabinet?.headTenure ??
      null) as RawTenureRow | null
    const explicitRows = (effectiveOverview?.memberTenures ??
      []) as RawTenureRow[]
    const explicitIds = new Set(explicitRows.map((r) => r.id))
    const headHistId =
      selectedCabinet?.headTenure?.historicalCountryId ??
      headTenure?.historicalCountryId ??
      null

    const dateMatchedRows = allRows.filter((row) => {
      if (explicitIds.has(row.id)) return false
      if (selectedCabinet?.id && row.cabinetId === selectedCabinet.id) {
        return row.id !== headTenure?.id
      }
      if (!headTenure) return false
      if (row.cabinetId && row.cabinetId !== selectedCabinet?.id) return false
      if (!isCabinetMinisterCandidate(row, headTenure)) return false
      if (
        !historicalCountryId &&
        (row.historicalCountryId ?? null) !== headHistId
      ) {
        return false
      }
      return tenuresOverlap(row, headTenure)
    })

    return {
      head: headTenure ? mapRow(headTenure, true, false, null) : null,
      members: dedupeAndSortMinisters([...explicitRows, ...dateMatchedRows]),
    }
  }, [
    effectiveFallbackMode,
    activeFallbackHead,
    effectiveOverview,
    selectedCabinet,
    tenuresQuery.data,
    eraDepartments,
    historicalCountryId,
  ])

  const formatCabLabel = useCallback(
    (c: (typeof cabinets)[number]) => {
      if (c.name?.trim()) return c.name.trim()
      const ht = c.headTenure as RawTenureRow | undefined
      return `${resolveTenureDisplayName(ht)} 행정부`
    },
    [],
  )

  const counterpartHeads = useMemo<MindMapMember[]>(() => {
    const allRows = (tenuresQuery.data ?? []) as RawTenureRow[]

    if (effectiveFallbackMode) {
      if (!activeFallbackHead) return []
      const targetHistId = activeFallbackHead.historicalCountryId ?? null
      const exactCabs = cabinets.filter((c) => {
        if (!c.headTenure || c.headTenure.id === activeFallbackHead.id) {
          return false
        }
        if (
          !historicalCountryId &&
          (c.headTenure.historicalCountryId ?? null) !== targetHistId
        ) {
          return false
        }
        return tenuresOverlap(c.headTenure as RawTenureRow, activeFallbackHead)
      })

      return [...exactCabs]
        .sort((a, b) =>
          (
            resolveTenureStartIso(a.headTenure as RawTenureRow | undefined) ?? ''
          ).localeCompare(
            resolveTenureStartIso(b.headTenure as RawTenureRow | undefined) ?? '',
          ),
        )
        .map((c) => {
          const ht = c.headTenure as RawTenureRow
          return {
            id: String(ht.id ?? c.id),
            cabinetId: c.id,
            cabinetLabel: formatCabLabel(c),
            personId: ht.person?.id ?? ht.personId ?? null,
            name: resolveTenureDisplayName(ht),
            imageUrl: ht.person?.profileImageUrl ?? null,
            title: (
              ht.title ??
              ht.positionDefinition?.title ??
              '내각수반'
            ).trim(),
            startDate: resolveTenureStartIso(ht),
            endDate: resolveTenureEndIso(ht),
            isHead: true,
            isMonarchical: false,
            polityLabel: ht.historicalCountry?.name ?? null,
            ordinal: typeof ht.ordinal === 'number' ? ht.ordinal : null,
            replaced: false,
            predecessor: null,
          }
        })
    }

    const headTenure = (effectiveOverview?.headTenure ??
      selectedCabinet?.headTenure) as RawTenureRow | undefined
    if (!headTenure) return []
    const headPersonId = headTenure.person?.id ?? headTenure.personId ?? null
    const headHistId =
      selectedCabinet?.headTenure?.historicalCountryId ??
      headTenure.historicalCountryId ??
      null
    const headType =
      headTenure.positionType ??
      headTenure.positionDefinition?.positionType ??
      ''
    const headTitle = (
      headTenure.title ??
      headTenure.positionDefinition?.title ??
      ''
    ).trim()
    const headLooksLikePM =
      headType === 'HEAD_OF_GOVERNMENT' ||
      /총리|수상|내각총리대신|총리대신|재상|영의정/.test(headTitle)

    const baseCandidates = allRows.filter((row) => {
      if (row.id === headTenure.id) return false
      const type =
        row.positionType ?? row.positionDefinition?.positionType ?? ''
      if (!HEAD_TYPES.has(type)) return false
      const rowPersonId = row.person?.id ?? row.personId ?? null
      if (headPersonId && rowPersonId === headPersonId) return false
      if (
        rowPersonId &&
        members.some((m) => m.personId && m.personId === rowPersonId)
      ) {
        return false
      }
      return tenuresOverlap(row, headTenure)
    })

    const exactHist = baseCandidates.filter(
      (row) => (row.historicalCountryId ?? null) === headHistId,
    )
    const candidates =
      exactHist.length > 0
        ? exactHist
        : baseCandidates.filter(
            (row) =>
              isTenureMonarchical(row) ||
              row.historicalCountryId == null ||
              headHistId == null,
          )
    if (candidates.length === 0) return []

    const targetType = headLooksLikePM ? 'HEAD_OF_STATE' : 'HEAD_OF_GOVERNMENT'
    const preferred = candidates.filter((row) => {
      const type =
        row.positionType ?? row.positionDefinition?.positionType ?? ''
      return type === targetType || isTenureMonarchical(row)
    })
    const finalList = preferred.length > 0 ? preferred : candidates

    return finalList.map((picked) => ({
      id: String(picked.id),
      personId: picked.person?.id ?? picked.personId ?? null,
      name: resolveTenureDisplayName(picked),
      imageUrl: picked.person?.profileImageUrl ?? null,
      title: (
        picked.title ??
        picked.positionDefinition?.title ??
        (headLooksLikePM ? '국가원수' : '정부수반')
      ).trim(),
      startDate: resolveTenureStartIso(picked),
      endDate: resolveTenureEndIso(picked),
      isHead: true,
      isMonarchical: isTenureMonarchical(picked),
      regnalEraLabel: resolveRegnalEraLabel(
        picked,
        resolveTenureStartIso(headTenure),
        resolveTenureEndIso(headTenure),
      ),
      polityLabel: picked.historicalCountry?.name ?? null,
      ordinal: typeof picked.ordinal === 'number' ? picked.ordinal : null,
      replaced: false,
      predecessor: null,
    }))
  }, [
    effectiveFallbackMode,
    activeFallbackHead,
    cabinets,
    historicalCountryId,
    formatCabLabel,
    effectiveOverview,
    selectedCabinet,
    tenuresQuery.data,
    members,
  ])

  /**
   * 공석·미등록 중앙부처 슬롯:
   * 1) 국가에 등록된 중앙부처(eraDepartments) 중 현 정권/치세에 각료가 아직 배정되지 않은 부처는 모두 표시해
   *    전체 행정부 부처 편제를 한눈에 파악할 수 있게 한다.
   * 2) 만약 등록된 각료도 부처도 아예 0건인 초기 국가라면 시대 틀(frame)에서 핵심 6개 부처 슬롯만 안내용으로 제시한다.
   */
  const vacantSlots = useMemo<MindMapVacantSlot[]>(() => {
    const usedLabels = new Set<string>(
      members.map((m) => m.title.replace(/\s+/g, '')),
    )

    const unmatchedDepts = eraDepartments
      .filter(
        (dept) =>
          !members.some((m) =>
            doesMemberMatchDepartment(m, dept, eraDepartments),
          ),
      )
      .map((dept, idx) => {
        const positionTitle = resolveDepartmentHeadPositionTitle(
          dept.name,
          frame,
          countryName,
          activePolityLabel,
        )
        const frameIdx = frame.items.findIndex(
          (item) =>
            item.headPositionTitle === positionTitle ||
            dept.name === item.name ||
            dept.name.endsWith(` ${item.name}`) ||
            (item.name.length >= 2 && dept.name.endsWith(item.name)),
        )
        return {
          dept,
          positionTitle,
          order: frameIdx >= 0 ? frameIdx : 100 + idx,
        }
      })
      .sort((a, b) => a.order - b.order)

    const slots: MindMapVacantSlot[] = []
    for (const { dept, positionTitle } of unmatchedDepts) {
      const norm = positionTitle.replace(/\s+/g, '')
      if (usedLabels.has(norm)) continue
      usedLabels.add(norm)
      slots.push({
        key: `dept:${dept.id}`,
        departmentId: dept.id,
        departmentName: dept.name,
        positionTitle,
      })
    }

    if (members.length === 0 && slots.length === 0) {
      const suggestions = suggestFrameItems(
        frame,
        eraDepartments.map((d) => d.name),
      ).slice(0, 6)
      for (const item of suggestions) {
        const pos = item.headPositionTitle ?? `${item.name} ${frame.headTitle}`
        slots.push({
          key: `preset:${frame.id}:${item.slot}:${item.name}`,
          departmentId: null,
          departmentName: item.name,
          positionTitle: pos,
          isPreset: true,
        })
      }
    }

    return slots
  }, [members, eraDepartments, frame, countryName, activePolityLabel])

  const polityBadges = useMemo(() => {
    if (!activePoliticalSystem) return []
    const items: string[] = []
    if (activePoliticalSystem.stateStructure) {
      items.push(STATE_STRUCTURE_LABEL[activePoliticalSystem.stateStructure])
    }
    if (activePoliticalSystem.governmentForm) {
      items.push(GOVERNMENT_FORM_LABEL[activePoliticalSystem.governmentForm])
    }
    if (activePoliticalSystem.legislatureType) {
      items.push(LEGISLATURE_TYPE_LABEL[activePoliticalSystem.legislatureType])
    }
    if (activePoliticalSystem.partySystem) {
      items.push(PARTY_SYSTEM_LABEL[activePoliticalSystem.partySystem])
    }
    return items
  }, [activePoliticalSystem])

  const regimeMeta = activePoliticalSystem?.governmentForm
    ? (GOVERNMENT_FORM_META[activePoliticalSystem.governmentForm] ?? null)
    : null

  const defaultEmptyHeadTitle = useMemo(() => {
    if (activePoliticalSystem) {
      return (
        headOfGovernmentTitleOf(activePoliticalSystem) ??
        headOfStateTitleOf(activePoliticalSystem) ??
        regimeMeta?.defaultHeadRoleLabel ??
        (historicalCountryId ? '군주 · 통치자' : '국가원수 · 정부수반')
      )
    }
    return historicalCountryId ? '군주 · 통치자' : '국가원수 · 정부수반'
  }, [activePoliticalSystem, regimeMeta, historicalCountryId])

  // 정권 / 행정부 좌우 화살표 통합 네비게이션 (리스트 노출 없이 화살표만으로 모든 역대 행정부·치세 전환)
  const navigation = useMemo(() => {
    if (!historicalCountryId) {
      type UnifiedStep = {
        mode: 'cabinet' | 'fallback'
        id: string
        label: string
        chronKey: number
      }
      const unified: UnifiedStep[] = [
        ...cabinets.map((cab) => ({
          mode: 'cabinet' as const,
          id: cab.id,
          label: formatCabLabel(cab),
          chronKey:
            getTenureChronologyKey(
              (cab.headTenure as RawTenureRow | undefined) ?? {},
            ) ?? Number.MAX_SAFE_INTEGER,
        })),
        ...fallbackHeadTenures.map((row) => ({
          mode: 'fallback' as const,
          id: row.id,
          label: `${resolveTenureDisplayName(row)} 행정부`,
          chronKey: getTenureChronologyKey(row) ?? Number.MIN_SAFE_INTEGER,
        })),
      ].sort((left, right) => right.chronKey - left.chronKey)

      if (unified.length <= 1) return null
      const activeMode = effectiveFallbackMode ? 'fallback' : 'cabinet'
      const activeId = effectiveFallbackMode
        ? activeFallbackHead?.id
        : selectedCabinet?.id
      const idx = Math.max(
        0,
        unified.findIndex(
          (step) => step.mode === activeMode && step.id === activeId,
        ),
      )
      const olderStep = idx < unified.length - 1 ? unified[idx + 1] : null
      const newerStep = idx > 0 ? unified[idx - 1] : null
      const activateStep = (step: UnifiedStep) => {
        if (step.mode === 'cabinet') {
          setSelectedCabinetId(step.id)
          setHeadViewMode('cabinet')
        } else {
          setSelectedFallbackHeadId(step.id)
          setHeadViewMode('fallback')
        }
      }
      return {
        currentOrdinalIndex: unified.length - idx,
        total: unified.length,
        olderLabel: olderStep?.label ?? null,
        newerLabel: newerStep?.label ?? null,
        onOlder: olderStep ? () => activateStep(olderStep) : null,
        onNewer: newerStep ? () => activateStep(newerStep) : null,
      }
    }

    if (effectiveFallbackMode) {
      if (fallbackHeadTenures.length <= 1) return null
      const idx = Math.max(
        0,
        fallbackHeadTenures.findIndex(
          (row) => row.id === activeFallbackHead?.id,
        ),
      )
      const olderRow =
        idx < fallbackHeadTenures.length - 1
          ? fallbackHeadTenures[idx + 1]
          : null
      const newerRow = idx > 0 ? fallbackHeadTenures[idx - 1] : null
      return {
        currentOrdinalIndex: fallbackHeadTenures.length - idx,
        total: fallbackHeadTenures.length,
        olderLabel: olderRow ? resolveTenureDisplayName(olderRow) : null,
        newerLabel: newerRow ? resolveTenureDisplayName(newerRow) : null,
        onOlder: olderRow
          ? () => setSelectedFallbackHeadId(olderRow.id)
          : null,
        onNewer: newerRow
          ? () => setSelectedFallbackHeadId(newerRow.id)
          : null,
      }
    }

    if (cabinets.length <= 1) return null
    const idx = Math.max(
      0,
      cabinets.findIndex((cab) => cab.id === selectedCabinet?.id),
    )
    const olderCab = idx < cabinets.length - 1 ? cabinets[idx + 1] : null
    const newerCab = idx > 0 ? cabinets[idx - 1] : null
    return {
      currentOrdinalIndex: cabinets.length - idx,
      total: cabinets.length,
      olderLabel: olderCab ? formatCabLabel(olderCab) : null,
      newerLabel: newerCab ? formatCabLabel(newerCab) : null,
      onOlder: olderCab ? () => setSelectedCabinetId(olderCab.id) : null,
      onNewer: newerCab ? () => setSelectedCabinetId(newerCab.id) : null,
    }
  }, [
    historicalCountryId,
    effectiveFallbackMode,
    fallbackHeadTenures,
    activeFallbackHead,
    cabinets,
    selectedCabinet,
    formatCabLabel,
  ])

  const linkedElection =
    effectiveOverview?.headTenure?.electionCandidacy?.election ?? null
  const headVoteShareRaw =
    effectiveOverview?.headTenure?.electionCandidacy?.result?.voteSharePercent
  const headVoteShare =
    headVoteShareRaw != null && headVoteShareRaw !== ''
      ? Number(headVoteShareRaw)
      : null

  const activeCabinetLabel =
    !effectiveFallbackMode && selectedCabinet
      ? formatCabLabel(selectedCabinet)
      : activeFallbackHead
        ? `${resolveTenureDisplayName(activeFallbackHead)} ${isModernScope ? '행정부' : '치세'}`
        : null

  const militaryUnitsQuery = useQuery({
    queryKey: [
      'military-units',
      'mindmap-scope',
      countryId || undefined,
      historicalCountryId,
    ],
    queryFn: () =>
      militaryUnitApi.getAll(
        historicalCountryId ? { historicalCountryId } : { countryId },
      ),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 2 * 60_000,
  })

  const militaryBranches = useMemo<MindMapMilitaryCommandItem[]>(() => {
    const units = militaryUnitsQuery.data ?? []
    if (units.length === 0) return []
    const HIGH_TYPES = new Set([
      'HIGH_COMMAND',
      'MINISTRY_DEFENSE',
      'JOINT_COMMAND',
      'THEATER',
      'ARMY_GROUP',
      'FIELD_ARMY',
      'FLEET',
      'AIR_FORCE_COMMAND',
    ])
    const topPool = units.filter(
      (u) => !u.parentId || HIGH_TYPES.has(String(u.unitType ?? '')),
    )
    const selectedPool = (topPool.length > 0 ? topPool : units).slice(0, 16)
    const allTenures = (tenuresQuery.data ?? []) as RawTenureRow[]
    const scopeTenure = effectiveFallbackMode
      ? activeFallbackHead
      : ((effectiveOverview?.headTenure ??
          selectedCabinet?.headTenure) as RawTenureRow | null | undefined)

    return selectedPool.map((u) => {
      const unitTenures = allTenures.filter((r) => r.militaryUnitId === u.id)
      const matched =
        (scopeTenure
          ? unitTenures.find((r) => tenuresOverlap(r, scopeTenure))
          : null) ??
        unitTenures.find((r) => !resolveTenureEndIso(r)) ??
        unitTenures[0] ??
        null

      return {
        unitId: u.id,
        unitName: u.name,
        branch: String(u.branch ?? 'OTHER'),
        unitType: String(u.unitType ?? ''),
        commanderPersonId: matched
          ? (matched.person?.id ?? matched.personId ?? null)
          : null,
        commanderName: matched ? resolveTenureDisplayName(matched) : null,
        commanderImageUrl: matched?.person?.profileImageUrl ?? null,
        commanderRankOrTitle: matched
          ? ([matched.rankTitle, matched.title ?? matched.positionDefinition?.title]
              .filter(Boolean)
              .join(' · ') || '지휘관')
          : null,
        startDate: matched ? resolveTenureStartIso(matched) : null,
      }
    })
  }, [
    militaryUnitsQuery.data,
    tenuresQuery.data,
    effectiveFallbackMode,
    activeFallbackHead,
    effectiveOverview,
    selectedCabinet,
  ])

  const selectorItems = useMemo<MindMapSelectorItem[]>(() => {
    if (!effectiveFallbackMode && cabinets.length > 0) {
      return cabinets.slice(0, 8).map((cab) => {
        const ht = cab.headTenure as RawTenureRow | undefined
        const headName = ht ? resolveTenureDisplayName(ht) : null
        return {
          id: cab.id,
          mode: 'cabinet',
          label: formatCabLabel(cab),
          subLabel:
            headName && !formatCabLabel(cab).includes(headName)
              ? headName
              : null,
          imageUrl: ht?.person?.profileImageUrl ?? null,
          active: cab.id === selectedCabinet?.id,
        }
      })
    }
    return fallbackHeadTenures.slice(0, 8).map((row) => {
      const startStr = formatShortMindMapDate(resolveTenureStartIso(row))
      const yearOnly = startStr ? startStr.split('.')[0] : null
      return {
        id: row.id,
        mode: 'fallback',
        label: resolveTenureDisplayName(row),
        subLabel: yearOnly,
        imageUrl: row.person?.profileImageUrl ?? null,
        active: row.id === activeFallbackHead?.id,
      }
    })
  }, [
    effectiveFallbackMode,
    cabinets,
    formatCabLabel,
    selectedCabinet?.id,
    fallbackHeadTenures,
    activeFallbackHead?.id,
  ])

  return {
    isLoading:
      cabinetsQuery.isLoading ||
      (effectiveFallbackMode
        ? tenuresQuery.isLoading
        : overviewQuery.isLoading && !selectedCabinet?.headTenure),
    head,
    counterpartHeads,
    members,
    vacantSlots,
    militaryBranches,
    eraDepartments,
    selectorItems,
    activeCabinetDates: {
      startDate: activeCabinetScope.startDate,
      endDate: activeCabinetScope.endDate,
    },
    totalDepartmentsCount: eraDepartments.length,
    activeCabinetId: selectedCabinet?.id ?? null,
    activeHeadTenureId: head?.id ?? null,
    activeCabinetLabel,
    activePolityLabel,
    activePoliticalSystem,
    polityBadges,
    defaultEmptyHeadTitle,
    effectiveFallbackMode,
    canToggleMode: cabinets.length > 0 && fallbackHeadTenures.length > 0,
    cabinetsCount: cabinets.length,
    rulersCount: fallbackHeadTenures.length,
    setHeadViewMode,
    selectCabinet: (cabId: string) => {
      setSelectedCabinetId(cabId)
      setHeadViewMode('cabinet')
    },
    selectFallbackHead: (tenureId: string) => {
      setSelectedFallbackHeadId(tenureId)
      setHeadViewMode('fallback')
    },
    selectByTenureId,
    navigation,
    linkedElection,
    headVoteShare,
  }
}
