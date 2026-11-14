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
export type CabinetSortKey = 'period_desc' | 'period_asc' | 'country' | 'name'
export type DepartmentSortKey = 'country' | 'period_asc' | 'period_desc' | 'name'
export type DepartmentStatusFilter = 'all' | 'active' | 'abolished'

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
      countryGovernmentUrl: `${pathKeys.countryGovernment(historicalId)}?cabinetId=${encodeURIComponent(cabinet.id)}`,
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
      countryGovernmentUrl: `${pathKeys.countryGovernment(modernId)}?cabinetId=${encodeURIComponent(cabinet.id)}`,
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
        ? `${pathKeys.countryGovernment((historicalId ?? modernId)!)}?cabinetId=${encodeURIComponent(cabinet.id)}`
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
    const formatted = getPersonDisplayName(head.person)
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
    title: head.title ?? head.positionDefinition?.title ?? null,
  })
}

export const GLOBAL_CABINET_CATEGORY_LABELS: Record<PositionCategory, string> = {
  PRESIDENT: '대통령제',
  PM: '총리·내각책임',
  MONARCH: '군주 친정',
  POPE: '종교 수장',
  OTHER: '집단지도·기타',
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
          endReason: head.endReason ?? null,
          endReasonDetail: head.endReasonDetail ?? null,
          notes: head.notes ?? null,
        }
      : null,
  }
}
