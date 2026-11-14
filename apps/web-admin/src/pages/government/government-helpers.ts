import { categorizePosition } from '@/entities/government-position/model/categorize'
import type { PositionCategory } from '@/entities/government-position/model/types'
import type { AdministrationDepartment } from '@/shared/api/administration-department'
import type { CabinetListItemDto } from '@/shared/api/person-career'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'

export type GovernmentCatalogTab = 'cabinets' | 'departments'
export type CabinetDisplayMode = 'ledger' | 'cards'
export type CabinetSortKey = 'period_desc' | 'period_asc' | 'country' | 'name'
export type DepartmentSortKey = 'country' | 'period_asc' | 'period_desc' | 'name'

export interface GovernmentListReturnState {
  governmentListSearch?: string
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
  return signedYear < 0 ? `기원전 ${-signedYear}` : String(signedYear)
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
  polityName: string
  isHistorical: boolean
  flagEmoji: string | null
  countryGovernmentUrl: string | null
} {
  const head = cabinet.headTenure
  const historicalCountry = head?.historicalCountry ?? cabinet.historicalCountry
  const modernCountry = head?.country ?? cabinet.country
  const historicalId =
    head?.historicalCountryId ??
    cabinet.historicalCountryId ??
    historicalCountry?.id ??
    null
  const modernId =
    head?.countryId ?? cabinet.countryId ?? modernCountry?.id ?? null

  if (historicalId && historicalCountry?.name) {
    return {
      polityId: historicalId,
      polityName: historicalCountry.name,
      isHistorical: true,
      flagEmoji: null,
      countryGovernmentUrl: `${pathKeys.countryGovernment(historicalId)}?cabinetId=${encodeURIComponent(cabinet.id)}`,
    }
  }
  if (modernId && modernCountry?.name) {
    return {
      polityId: modernId,
      polityName: modernCountry.name,
      isHistorical: false,
      flagEmoji: modernCountry.flagEmoji ?? null,
      countryGovernmentUrl: `${pathKeys.countryGovernment(modernId)}?cabinetId=${encodeURIComponent(cabinet.id)}`,
    }
  }
  return {
    polityId: historicalId ?? modernId,
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
  polityName: string
  isHistorical: boolean
  flagEmoji: string | null
  countryGovernmentUrl: string | null
} {
  const deptDeepLinkSuffix = `?sub=ministries&departmentId=${encodeURIComponent(dept.id)}`
  if (dept.historicalCountryId && dept.historicalCountry?.name) {
    return {
      polityId: dept.historicalCountryId,
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
      polityName: dept.country.name,
      isHistorical: false,
      flagEmoji,
      countryGovernmentUrl: `${pathKeys.countryGovernment(dept.countryId)}${deptDeepLinkSuffix}`,
    }
  }
  const fallbackPolityId = dept.historicalCountryId ?? dept.countryId ?? null
  return {
    polityId: fallbackPolityId,
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
  const ordinalText =
    head?.ordinal != null ? `제${head.ordinal}대` : ''
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
