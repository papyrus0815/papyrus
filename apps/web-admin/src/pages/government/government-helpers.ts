import { categorizePosition } from '@/entities/government-position/model/categorize'
import type { PositionCategory } from '@/entities/government-position/model/types'
import type { AdministrationDepartment } from '@/shared/api/administration-department'
import type { CabinetListItemDto } from '@/shared/api/person-career'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import type { EditableCabinetRecord } from '@/widgets/country/country-detail/ui/cabinet-form-modal.widget'

export type GovernmentCatalogTab = 'cabinets' | 'departments'
export type CabinetDisplayMode = 'ledger' | 'cards'
export type GovernmentListDensity = 'compact' | 'cozy' | 'roomy'
export type CabinetSortKey =
  | 'period_desc'
  | 'period_asc'
  | 'duration_desc'
  | 'members_desc'
  | 'country'
  | 'name'
export type DepartmentSortKey =
  | 'country'
  | 'period_asc'
  | 'period_desc'
  | 'duration_desc'
  | 'tenures_desc'
  | 'name'
export type DepartmentStatusFilter =
  | 'all'
  | 'active'
  | 'superseded'
  | 'historical'
  | 'abolished'
export type GovernmentHideableColumn =
  | 'end'
  | 'party'
  | 'dur'
  | 'members'
  | 'extra'

export const GOVERNMENT_HIDEABLE_COLUMNS: ReadonlyArray<{
  key: GovernmentHideableColumn
  cabinetLabel: string
  deptLabel: string
}> = [
  { key: 'end', cabinetLabel: '종료 시점', deptLabel: '폐지 시점' },
  { key: 'party', cabinetLabel: '집권·연정 정당', deptLabel: '상위·전신 계보' },
  { key: 'dur', cabinetLabel: '재임 기간 막대', deptLabel: '존속 기간 막대' },
  { key: 'members', cabinetLabel: '각료 수', deptLabel: '역대 수장 수' },
  { key: 'extra', cabinetLabel: '관여 사건·업적', deptLabel: '산하·관여 사건' },
]

export interface GovernmentListReturnState {
  governmentListSearch?: string
}

export interface GovernmentCatalogMemory {
  density?: GovernmentListDensity
  displayMode?: CabinetDisplayMode
  cabinetSort?: CabinetSortKey
  deptSort?: DepartmentSortKey
  lastQuery?: string
  collapsedChapters?: string[]
  hiddenColumns?: GovernmentHideableColumn[]
}

const CATALOG_MEMORY_STORAGE_KEY = 'papyrus:government-catalog-prefs:v1'
const TRANSIENT_CATALOG_PARAMS = ['selected'] as const

export function normalizeGovernmentDensity(
  rawDensity: unknown,
): GovernmentListDensity {
  if (rawDensity === 'compact' || rawDensity === 'cozy' || rawDensity === 'roomy') {
    return rawDensity
  }
  if (rawDensity === 'comfortable') {
    return 'roomy'
  }
  return 'cozy'
}

export function toRememberedGovernmentQuery(
  searchParams: URLSearchParams,
): string {
  const cleaned = new URLSearchParams(searchParams)
  for (const transientKey of TRANSIENT_CATALOG_PARAMS) {
    cleaned.delete(transientKey)
  }
  return cleaned.toString()
}

export function readGovernmentCatalogMemory(): GovernmentCatalogMemory {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CATALOG_MEMORY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return {}
    const normalized: GovernmentCatalogMemory = {
      ...(parsed as GovernmentCatalogMemory),
      density:
        parsed.density != null
          ? normalizeGovernmentDensity(parsed.density)
          : undefined,
      collapsedChapters: Array.isArray(parsed.collapsedChapters)
        ? parsed.collapsedChapters.filter(
            (chapterKey): chapterKey is string => typeof chapterKey === 'string',
          )
        : undefined,
    }
    return normalized
  } catch {
    return {}
  }
}

export function writeGovernmentCatalogMemory(
  patch: Partial<GovernmentCatalogMemory>,
): void {
  if (typeof window === 'undefined') return
  try {
    const prev = readGovernmentCatalogMemory()
    window.localStorage.setItem(
      CATALOG_MEMORY_STORAGE_KEY,
      JSON.stringify({ ...prev, ...patch }),
    )
  } catch {
    // ignore storage quota errors
  }
}

export function readGovernmentListSearch(state: unknown): string {
  if (
    state &&
    typeof state === 'object' &&
    'governmentListSearch' in state &&
    typeof (state as GovernmentListReturnState).governmentListSearch === 'string'
  ) {
    return (state as GovernmentListReturnState).governmentListSearch ?? ''
  }
  return ''
}

export function formatSignedYearLabel(signedYear: number): string {
  return signedYear < 0 ? `BC ${-signedYear}` : String(signedYear)
}

/**
 * 개각(제2·3차 내각) 고유 기간을 최우선으로 사용하고, 없을 때만 수반 전체 임기로 폴백한다.
 */
export function resolveCabinetEffectiveDates(cabinet: CabinetListItemDto): {
  startDate: string | null
  endDate: string | null
  isOngoing: boolean
} {
  const startDate = cabinet.startDate ?? cabinet.headTenure?.startDate ?? null
  const hasExplicitCabinetPeriod =
    (cabinet as { startYear?: number | null }).startYear != null
  const endDate = hasExplicitCabinetPeriod
    ? (cabinet.endDate ?? cabinet.headTenure?.endDate ?? null)
    : (cabinet.endDate ?? cabinet.headTenure?.endDate ?? null)
  const polity = resolveCabinetPolityInfo(cabinet)
  const isOngoing = !polity.isHistorical && Boolean(startDate) && !endDate
  return { startDate, endDate, isOngoing }
}

export function formatIsoShortPeriod(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  isOngoingFallback = false,
): string {
  const startParts = parseIsoDateParts(startIso)
  const endParts = parseIsoDateParts(endIso)
  if (!startParts && !endParts) return '연대 미상'
  const startText = startParts
    ? `${formatSignedYearLabel(startParts.year)}${
        startParts.month ? `.${String(startParts.month).padStart(2, '0')}` : ''
      }`
    : '?'
  const endText = endParts
    ? `${formatSignedYearLabel(endParts.year)}${
        endParts.month ? `.${String(endParts.month).padStart(2, '0')}` : ''
      }`
    : isOngoingFallback
      ? '현재'
      : ''
  if (!endText) return `${startText}–`
  if (startText === endText) return startText
  return `${startText}–${endText}`
}

export function extractSignedStartYearFromIso(
  iso: string | null | undefined,
): number | null {
  const parts = parseIsoDateParts(iso)
  return parts ? parts.year : null
}

export function compareIsoDateChronological(
  leftIso: string | null | undefined,
  rightIso: string | null | undefined,
  direction: 'asc' | 'desc' = 'asc',
): number {
  const leftParts = parseIsoDateParts(leftIso)
  const rightParts = parseIsoDateParts(rightIso)
  if (!leftParts && !rightParts) return 0
  if (!leftParts) return 1
  if (!rightParts) return -1
  const leftScore =
    leftParts.year * 10000 +
    (leftParts.month ?? 1) * 100 +
    (leftParts.day ?? 1)
  const rightScore =
    rightParts.year * 10000 +
    (rightParts.month ?? 1) * 100 +
    (rightParts.day ?? 1)
  return direction === 'asc' ? leftScore - rightScore : rightScore - leftScore
}

export interface TenureSpanInfo {
  startText: string
  endText: string
  durationLabel: string
  monthsSpan: number | null
  /** 0~100: 기간 열의 수평 막대 폭 비율 */
  barPct: number
  isOngoing: boolean
}

/**
 * 시작일·종료일을 [시작], [종료], [기간 막대+라벨] 3요소로 분해한다.
 * `/events` 페이지의 "시간을 문자열이 아닌 위치·길이로 부호화" 원칙을 내각/기관 재임 기간에 적용한다.
 */
export function calculateTenureSpanInfo(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  isOngoing = false,
  referenceMaxMonths = 144,
): TenureSpanInfo {
  const startParts = parseIsoDateParts(startIso)
  const endParts = parseIsoDateParts(endIso)

  const startText = startParts
    ? `${formatSignedYearLabel(startParts.year)}${
        startParts.month ? `.${String(startParts.month).padStart(2, '0')}` : ''
      }`
    : '미상'

  const endText = endParts
    ? `${formatSignedYearLabel(endParts.year)}${
        endParts.month ? `.${String(endParts.month).padStart(2, '0')}` : ''
      }`
    : isOngoing
      ? '현재'
      : '—'

  if (!startParts) {
    return {
      startText,
      endText,
      durationLabel: '',
      monthsSpan: null,
      barPct: 0,
      isOngoing,
    }
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const effectiveEndYear = endParts
    ? endParts.year
    : isOngoing
      ? currentYear
      : null
  const effectiveEndMonth = endParts
    ? (endParts.month ?? 12)
    : isOngoing
      ? currentMonth
      : null

  if (effectiveEndYear == null) {
    return {
      startText,
      endText,
      durationLabel: '단기·미상',
      monthsSpan: 1,
      barPct: 12,
      isOngoing,
    }
  }

  const startMonthIndex = startParts.year * 12 + (startParts.month ?? 1)
  const endMonthIndex = effectiveEndYear * 12 + (effectiveEndMonth ?? 1)
  const rawMonths = Math.max(1, endMonthIndex - startMonthIndex)

  const years = Math.floor(rawMonths / 12)
  const remMonths = rawMonths % 12
  let durationLabel = ''
  if (years > 0 && remMonths > 0) {
    durationLabel = `${years}년 ${remMonths}개월`
  } else if (years > 0) {
    durationLabel = `${years}년`
  } else {
    durationLabel = `${rawMonths}개월`
  }

  const normalized = Math.min(1, rawMonths / Math.max(12, referenceMaxMonths))
  const barPct = Math.round(Math.max(10, Math.sqrt(normalized) * 100))

  return {
    startText,
    endText: startText === endText && !isOngoing ? '당해' : endText,
    durationLabel,
    monthsSpan: rawMonths,
    barPct,
    isOngoing,
  }
}

export function resolveCabinetDistinctSubMeta(cabinet: CabinetListItemDto): {
  hasExplicitCabinetName: boolean
  headName: string
  posTitle: string
} {
  const explicitName = cabinet.name?.trim() ?? ''
  const headName = resolveCabinetHeadName(cabinet)
  const posTitle = resolveCabinetPositionTitle(cabinet)
  const fallbackTitle = `${headName} ${
    cabinet.headTenure?.title?.trim() ||
    cabinet.headTenure?.positionDefinition?.title?.trim() ||
    '내각'
  }`.trim()
  const hasExplicitCabinetName =
    Boolean(explicitName) &&
    explicitName !== fallbackTitle &&
    explicitName !== headName
  return {
    hasExplicitCabinetName,
    headName,
    posTitle,
  }
}

export function resolveCabinetPolityInfo(cabinet: CabinetListItemDto): {
  polityId: string | null
  modernCountryId: string | null
  historicalCountryId: string | null
  polityName: string
  isHistorical: boolean
  flagEmoji: string | null
  countryGovernmentUrl: string | null
} {
  const head = cabinet.headTenure
  const historicalCountry = head?.historicalCountry ?? cabinet.historicalCountry
  const modernCountry = head?.country ?? cabinet.country
  const historicalId =
    cabinet.historicalCountryId ??
    head?.historicalCountryId ??
    historicalCountry?.id ??
    null
  const modernId =
    cabinet.countryId ?? head?.countryId ?? modernCountry?.id ?? null

  if (historicalId && historicalCountry?.name) {
    return {
      polityId: historicalId,
      modernCountryId: modernId,
      historicalCountryId: historicalId,
      polityName: historicalCountry.name,
      isHistorical: true,
      flagEmoji: null,
      countryGovernmentUrl: `${pathKeys.countryGovernment(historicalId)}?sub=cabinets&cabinetId=${encodeURIComponent(cabinet.id)}`,
    }
  }
  if (modernId && modernCountry?.name) {
    return {
      polityId: modernId,
      modernCountryId: modernId,
      historicalCountryId: null,
      polityName: modernCountry.name,
      isHistorical: false,
      flagEmoji: modernCountry.flagEmoji ?? null,
      countryGovernmentUrl: `${pathKeys.countryGovernment(modernId)}?sub=cabinets&cabinetId=${encodeURIComponent(cabinet.id)}`,
    }
  }
  return {
    polityId: historicalId ?? modernId,
    modernCountryId: modernId,
    historicalCountryId: historicalId,
    polityName: historicalCountry?.name ?? modernCountry?.name ?? '국가 미지정',
    isHistorical: Boolean(historicalId),
    flagEmoji: modernCountry?.flagEmoji ?? null,
    countryGovernmentUrl:
      historicalId || modernId
        ? `${pathKeys.countryGovernment((historicalId ?? modernId)!)}?sub=cabinets&cabinetId=${encodeURIComponent(cabinet.id)}`
        : null,
  }
}

export function resolveDepartmentPolityInfo(dept: AdministrationDepartment): {
  polityId: string | null
  modernCountryId: string | null
  historicalCountryId: string | null
  polityName: string
  isHistorical: boolean
  flagEmoji: string | null
  countryGovernmentUrl: string | null
} {
  const deptDeepLinkSuffix = `?sub=ministries&departmentId=${encodeURIComponent(dept.id)}`
  if (dept.historicalCountryId && dept.historicalCountry?.name) {
    return {
      polityId: dept.historicalCountryId,
      modernCountryId: dept.countryId ?? null,
      historicalCountryId: dept.historicalCountryId,
      polityName: dept.historicalCountry.name,
      isHistorical: true,
      flagEmoji: null,
      countryGovernmentUrl: `${pathKeys.countryGovernment(dept.historicalCountryId)}${deptDeepLinkSuffix}`,
    }
  }
  if (dept.countryId && dept.country?.name) {
    const flagEmoji =
      (dept.country as { flagEmoji?: string | null }).flagEmoji ?? null
    return {
      polityId: dept.countryId,
      modernCountryId: dept.countryId,
      historicalCountryId: null,
      polityName: dept.country.name,
      isHistorical: false,
      flagEmoji,
      countryGovernmentUrl: `${pathKeys.countryGovernment(dept.countryId)}${deptDeepLinkSuffix}`,
    }
  }
  const fallbackPolityId = dept.historicalCountryId ?? dept.countryId ?? null
  return {
    polityId: fallbackPolityId,
    modernCountryId: dept.countryId ?? null,
    historicalCountryId: dept.historicalCountryId ?? null,
    polityName:
      dept.historicalCountry?.name ?? dept.country?.name ?? '국가 미지정',
    isHistorical: Boolean(dept.historicalCountryId),
    flagEmoji: null,
    countryGovernmentUrl: fallbackPolityId
      ? `${pathKeys.countryGovernment(fallbackPolityId)}${deptDeepLinkSuffix}`
      : null,
  }
}

export function resolveCabinetHeadName(cabinet: CabinetListItemDto): string {
  const head = cabinet.headTenure
  if (!head) return cabinet.name?.trim() || '집단지도체제·내각'
  const regnal = head.regnalName?.trim()
  if (regnal) return regnal
  if (head.person) {
    const formatted = getPersonDisplayName({
      ...head.person,
      name: head.person.name ?? '',
    })
    if (formatted && formatted !== '—') return formatted
  }
  return cabinet.name?.trim() || head.title?.trim() || '수반 미상'
}

export function resolveCabinetPositionTitle(
  cabinet: CabinetListItemDto,
): string {
  const head = cabinet.headTenure
  const rawTitle =
    head?.title?.trim() ||
    head?.positionDefinition?.title?.trim() ||
    (head ? '' : '집단지도·위원단')
  const ordinalText = head?.ordinal != null ? `제${head.ordinal}대` : ''
  const subTermText =
    head?.subTermNumber != null ? `${head.subTermNumber}기` : ''
  return [ordinalText, subTermText, rawTitle].filter(Boolean).join(' ')
}

export function resolveCabinetDisplayTitle(cabinet: CabinetListItemDto): string {
  const explicitName = cabinet.name?.trim()
  const headName = resolveCabinetHeadName(cabinet)
  if (explicitName) return explicitName
  const posTitle =
    cabinet.headTenure?.title?.trim() ||
    cabinet.headTenure?.positionDefinition?.title?.trim() ||
    '내각'
  return `${headName} ${posTitle}`
}

export function resolveCabinetMinisterCount(
  cabinet: CabinetListItemDto,
): number {
  const membersCount = cabinet._count?.members ?? 0
  const legacyCount = cabinet._count?.memberTenures ?? 0
  return Math.max(membersCount, legacyCount)
}

export interface CabinetLeadingPartySummary {
  id: string
  label: string
  fullName: string
  brandColor: string | null
  extraCoalitionCount: number
}

export function resolveCabinetLeadingParty(
  cabinet: CabinetListItemDto,
): CabinetLeadingPartySummary | null {
  const partyLinks = cabinet.politicalParties ?? []
  if (partyLinks.length > 0) {
    const leadingLink =
      partyLinks.find((partyLink) => partyLink.role === 'LEADING') ??
      partyLinks[0]
    if (leadingLink?.party) {
      return {
        id: leadingLink.party.id,
        label:
          leadingLink.party.shortName?.trim() || leadingLink.party.name.trim(),
        fullName: leadingLink.party.name.trim(),
        brandColor: leadingLink.party.brandColor ?? null,
        extraCoalitionCount: Math.max(0, partyLinks.length - 1),
      }
    }
  }
  const headParty = cabinet.headTenure?.party
  if (headParty?.name) {
    return {
      id: headParty.id,
      label: headParty.shortName?.trim() || headParty.name.trim(),
      fullName: headParty.name.trim(),
      brandColor: headParty.brandColor ?? null,
      extraCoalitionCount: 0,
    }
  }
  return null
}

export function resolveCabinetCategory(
  cabinet: CabinetListItemDto,
): PositionCategory {
  const head = cabinet.headTenure
  if (!head) return 'OTHER'
  return categorizePosition({
    positionType:
      head.positionDefinition?.positionType ?? head.positionType ?? null,
    isMonarchical: head.isMonarchical ?? false,
    positionTitle: head.title ?? head.positionDefinition?.title ?? null,
    appointmentMethod: head.appointmentMethod ?? null,
  })
}

export const GLOBAL_CABINET_CATEGORY_LABELS: Record<PositionCategory, string> = {
  PRESIDENT: '국가원수 · 대통령',
  PM: '정부수반 · 총리 · 재상',
  MONARCH: '군주 친정 · 섭정',
  POPE: '종교 · 신정 수장',
  OTHER: '집단지도 · 임시정부',
}

export interface CabinetReshuffleMeta {
  /** 동일 수반 임기(`headTenure.id`) 내 시간순 개각 회차 (1부터 시작) */
  order: number
  /** 동일 수반 임기 내 총 내각 수 */
  total: number
  /** 현재 정렬 목록에서 바로 위 행과 동일 수반 임기인지 여부 */
  isContinuationFromPrev: boolean
  /** 현재 정렬 목록에서 바로 아래 행으로 동일 수반 임기가 이어지는지 여부 */
  isContinuedInNext: boolean
}

/**
 * 동일 수반 임기(`headTenure.id`) 아래 복수의 개각(제1·2·3차 내각)이 존재하는 경우
 * 회차(order/total)와 인접 행 연속 여부를 계산한다.
 */
export function computeCabinetReshuffleMetaMap(
  cabinets: CabinetListItemDto[],
): Map<string, CabinetReshuffleMeta> {
  const byHeadTenureId = new Map<string, CabinetListItemDto[]>()
  for (const cab of cabinets) {
    const htId = cab.headTenure?.id
    if (!htId) continue
    const bucket = byHeadTenureId.get(htId)
    if (bucket) {
      bucket.push(cab)
    } else {
      byHeadTenureId.set(htId, [cab])
    }
  }

  const orderMap = new Map<string, { order: number; total: number }>()
  for (const [, group] of byHeadTenureId) {
    if (group.length <= 1) continue
    const sortedAsc = [...group].sort((leftCab, rightCab) => {
      const leftStart = resolveCabinetEffectiveDates(leftCab).startDate
      const rightStart = resolveCabinetEffectiveDates(rightCab).startDate
      return compareIsoDateChronological(leftStart, rightStart, 'asc')
    })
    sortedAsc.forEach((cab, idx) => {
      orderMap.set(cab.id, { order: idx + 1, total: sortedAsc.length })
    })
  }

  const result = new Map<string, CabinetReshuffleMeta>()
  cabinets.forEach((cab, index) => {
    const htId = cab.headTenure?.id
    if (!htId) return
    const orderInfo = orderMap.get(cab.id)
    if (!orderInfo) return
    const prevHtId = index > 0 ? cabinets[index - 1]?.headTenure?.id : null
    const nextHtId =
      index < cabinets.length - 1 ? cabinets[index + 1]?.headTenure?.id : null
    result.set(cab.id, {
      order: orderInfo.order,
      total: orderInfo.total,
      isContinuationFromPrev: prevHtId === htId,
      isContinuedInNext: nextHtId === htId,
    })
  })
  return result
}

/**
 * URL polity 토큰(`C:uuid`/`H:uuid` 또는 `m:uuid`/`h:uuid`)을 모달 초기값(`m:uuid`/`h:uuid`)으로 정규화한다.
 */
export function toModalPolityValue(polityToken: string | null | undefined): string {
  if (!polityToken) return ''
  if (polityToken.startsWith('C:')) return `m:${polityToken.slice(2)}`
  if (polityToken.startsWith('H:')) return `h:${polityToken.slice(2)}`
  if (polityToken.startsWith('m:') || polityToken.startsWith('h:')) {
    return polityToken
  }
  return ''
}

/**
 * 카탈로그/상세의 `CabinetListItemDto`를 `CabinetFormModal` 수정 입력 타입으로 안전하게 매핑한다.
 */
export function toEditableCabinetRecord(
  cabinet: CabinetListItemDto,
): EditableCabinetRecord {
  const head = cabinet.headTenure
  return {
    id: cabinet.id,
    name: cabinet.name ?? null,
    description: cabinet.description ?? null,
    countryId: cabinet.countryId ?? head?.countryId ?? null,
    historicalCountryId:
      cabinet.historicalCountryId ?? head?.historicalCountryId ?? null,
    startDate: cabinet.startDate ?? null,
    endDate: cabinet.endDate ?? null,
    startEra: cabinet.startEra ?? null,
    startYear: cabinet.startYear ?? null,
    startMonth: cabinet.startMonth ?? null,
    startDay: cabinet.startDay ?? null,
    endEra: cabinet.endEra ?? null,
    endYear: cabinet.endYear ?? null,
    endMonth: cabinet.endMonth ?? null,
    endDay: cabinet.endDay ?? null,
    headTenure: head
      ? {
          id: head.id,
          personId: head.person?.id ?? null,
          person: head.person ?? undefined,
          title: head.title ?? null,
          positionType: head.positionType ?? null,
          positionDefinitionId: head.positionDefinition?.id ?? null,
          positionDefinition: head.positionDefinition ?? null,
          countryId: head.countryId ?? null,
          historicalCountryId: head.historicalCountryId ?? null,
          ordinal: head.ordinal ?? null,
          subTermNumber: head.subTermNumber ?? null,
          partyId:
            (head as { partyId?: string | null }).partyId ??
            (head as { party?: { id?: string | null } | null }).party?.id ??
            null,
          startDate: head.startDate ?? null,
          endDate: head.endDate ?? null,
          startEra: (head as { startEra?: string | null }).startEra ?? null,
          startYear: (head as { startYear?: number | null }).startYear ?? null,
          startMonth: (head as { startMonth?: number | null }).startMonth ?? null,
          startDay: (head as { startDay?: number | null }).startDay ?? null,
          endEra: (head as { endEra?: string | null }).endEra ?? null,
          endYear: (head as { endYear?: number | null }).endYear ?? null,
          endMonth: (head as { endMonth?: number | null }).endMonth ?? null,
          endDay: (head as { endDay?: number | null }).endDay ?? null,
          appointmentMethod: head.appointmentMethod ?? null,
          appointmentDetail:
            (head as { appointmentDetail?: string | null }).appointmentDetail ??
            null,
          endReason: head.endReason ?? null,
          endReasonDetail: head.endReasonDetail ?? null,
          notes: head.notes ?? null,
        }
      : null,
  }
}
