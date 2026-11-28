import type { GovernmentPositionDefinitionScope } from '@/shared/api/person-career'

export type PositionScopeCategory =
  | 'universal'
  | 'polity'
  | 'institution'
  | 'generic'

export type PositionTierFilterKey =
  | 'ALL'
  | 'SOVEREIGN'
  | 'EXECUTIVE'
  | 'BRANCHES'
  | 'SPECIALIZED'

export interface PositionDefinitionTenantSystemSummary {
  id: string
  name: string
  governmentForm?: string | null
  isCurrent?: boolean
  countryId?: string | null
  historicalCountryId?: string | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
}

export interface PositionDefinitionOfficeholderRow {
  id: string
  title?: string | null
  positionType?: string | null
  ordinal?: number | null
  subTermNumber?: number | null
  regnalName?: string | null
  rankTitle?: string | null
  startEra?: 'BC' | 'AD' | string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  startDate?: string | null
  endEra?: 'BC' | 'AD' | string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  endDate?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  person?: {
    id: string
    name: string
    surname?: string | null
    originalName?: string | null
    nameDisplayOrder?: string | null
    profileImageUrl?: string | null
  } | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
  administrationDepartment?: { id: string; name: string } | null
  militaryUnit?: { id: string; name: string } | null
  cabinet?: { id: string; name?: string | null } | null
}

export interface PositionDefinitionCatalogRow {
  id: string
  title: string
  titleEn?: string | null
  titleLocal?: string | null
  positionType: string
  description?: string | null
  rank?: number | null
  isMonarchical?: boolean | null
  isGeneric?: boolean | null
  categoryId?: string | null
  category?: { id: string; name: string; nameEn?: string | null } | null
  administrationDepartmentId?: string | null
  administrationDepartment?: {
    id: string
    name: string
    categoryId?: string | null
    countryId?: string | null
    historicalCountryId?: string | null
  } | null
  militaryUnitId?: string | null
  militaryUnit?: {
    id: string
    name: string
    abbreviation?: string | null
    unitType?: string | null
    countryId?: string | null
    historicalCountryId?: string | null
  } | null
  organizationId?: string | null
  organization?: {
    id: string
    name: string
    shortName?: string | null
  } | null
  establishedDate?: string | null
  abolishedDate?: string | null
  scopes?: GovernmentPositionDefinitionScope[] | null
  tenureCount?: number
  treatySignatoryCount?: number
  politicalSystemsAsHeadOfState?: PositionDefinitionTenantSystemSummary[]
  politicalSystemsAsHeadOfGovernment?: PositionDefinitionTenantSystemSummary[]
  tenures?: PositionDefinitionOfficeholderRow[]
}

export interface UnnormalizedTenureRow {
  id: string
  title?: string | null
  positionType?: string | null
  ordinal?: number | null
  startEra?: string | null
  startYear?: number | null
  endEra?: string | null
  endYear?: number | null
  countryId?: string | null
  historicalCountryId?: string | null
  administrationDepartmentId?: string | null
  militaryUnitId?: string | null
  positionDefinition?: {
    id: string
    title: string
    positionType: string
    isGeneric?: boolean
  } | null
  person?: {
    id: string
    name: string
    surname?: string | null
    originalName?: string | null
    nameDisplayOrder?: string | null
  } | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
  administrationDepartment?: { id: string; name: string } | null
  militaryUnit?: { id: string; name: string } | null
}

export const POSITION_TYPE_META: ReadonlyArray<{
  value: string
  label: string
  shortLabel: string
  tier: Exclude<PositionTierFilterKey, 'ALL'>
  tone: 'amber' | 'blue' | 'emerald' | 'teal' | 'sky' | 'violet' | 'rose' | 'orange' | 'slate'
}> = [
  { value: 'HEAD_OF_STATE', label: '국가원수 · 군주', shortLabel: '국가원수', tier: 'SOVEREIGN', tone: 'amber' },
  { value: 'HEAD_OF_GOVERNMENT', label: '정부수반 · 총리', shortLabel: '정부수반', tier: 'EXECUTIVE', tone: 'blue' },
  { value: 'DEPUTY_HEAD_OF_STATE', label: '부원수 · 부통령', shortLabel: '부원수', tier: 'SOVEREIGN', tone: 'amber' },
  { value: 'REGENT', label: '섭정', shortLabel: '섭정', tier: 'SOVEREIGN', tone: 'rose' },
  { value: 'HEIR_APPARENT', label: '왕위 · 황위 계승자', shortLabel: '왕세자', tier: 'SOVEREIGN', tone: 'violet' },
  { value: 'ROYAL_NOBLE_TITLE', label: '왕족 · 귀족 작위', shortLabel: '작위', tier: 'SOVEREIGN', tone: 'violet' },
  { value: 'CABINET_MINISTER', label: '각료 · 장관', shortLabel: '장관·각료', tier: 'EXECUTIVE', tone: 'emerald' },
  { value: 'VICE_MINISTER', label: '차관 · 차관보', shortLabel: '차관', tier: 'EXECUTIVE', tone: 'teal' },
  { value: 'SPECIAL_POSITION', label: '중앙행정기관장 · 특별직', shortLabel: '기관장·특별직', tier: 'SPECIALIZED', tone: 'slate' },
  { value: 'JUDICIARY', label: '사법부 · 검찰', shortLabel: '사법부', tier: 'BRANCHES', tone: 'amber' },
  { value: 'LEGISLATOR', label: '입법부 · 의회', shortLabel: '의회', tier: 'BRANCHES', tone: 'sky' },
  { value: 'LOCAL_GOVERNMENT', label: '지방정부 · 총독', shortLabel: '지방·총독', tier: 'BRANCHES', tone: 'emerald' },
  { value: 'DIPLOMATIC_POST', label: '외교 사절 · 영사', shortLabel: '외교직', tier: 'SPECIALIZED', tone: 'blue' },
  { value: 'MILITARY_COMMANDER', label: '군 지휘관 · 참모', shortLabel: '군 지휘', tier: 'SPECIALIZED', tone: 'orange' },
  { value: 'OTHER', label: '기타 공직', shortLabel: '기타', tier: 'SPECIALIZED', tone: 'slate' },
]

export const POSITION_TIER_FILTERS: ReadonlyArray<{
  key: PositionTierFilterKey
  label: string
}> = [
  { key: 'ALL', label: '전체 층위' },
  { key: 'SOVEREIGN', label: '원수 · 왕실 · 섭정' },
  { key: 'EXECUTIVE', label: '수반 · 각료 · 차관' },
  { key: 'BRANCHES', label: '입법 · 사법 · 지방' },
  { key: 'SPECIALIZED', label: '기관장 · 군 · 외교' },
]

export const MILITARY_BRANCH_LABELS: Record<string, string> = {
  ARMY: '육군',
  NAVY: '해군',
  AIR_FORCE: '공군',
  MARINE_CORPS: '해병대',
  COAST_GUARD: '해안경비대',
  SPACE_FORCE: '우주군',
  JOINT: '합동·전군',
  OTHER: '기타',
}

export function getPositionTypeMeta(positionType?: string | null) {
  return (
    POSITION_TYPE_META.find((item) => item.value === positionType) ??
    POSITION_TYPE_META[POSITION_TYPE_META.length - 1]
  )
}

export function classifyPositionScope(
  row: PositionDefinitionCatalogRow,
): PositionScopeCategory {
  if (row.isGeneric) return 'generic'
  if (
    row.administrationDepartmentId ||
    row.militaryUnitId ||
    row.organizationId
  ) {
    return 'institution'
  }
  if ((row.scopes?.length ?? 0) > 0) {
    return 'polity'
  }
  return 'universal'
}

export function matchesPolityFilter(
  row: PositionDefinitionCatalogRow,
  polityValue: string,
): boolean {
  const trimmed = polityValue.trim()
  if (!trimmed) return true
  const isHistorical = trimmed.startsWith('h:')
  const targetId = trimmed.replace(/^[mh]:/, '')
  if (!targetId) return true

  const scopeCat = classifyPositionScope(row)
  // 소속 부처·부대가 있는 경우 해당 부처·부대의 국가 축 확인
  if (row.administrationDepartment) {
    if (isHistorical) {
      if (row.administrationDepartment.historicalCountryId === targetId) {
        return true
      }
    } else if (row.administrationDepartment.countryId === targetId) {
      return true
    }
  }
  if (row.militaryUnit) {
    if (isHistorical) {
      if (row.militaryUnit.historicalCountryId === targetId) return true
    } else if (row.militaryUnit.countryId === targetId) {
      return true
    }
  }
  if (row.scopes && row.scopes.length > 0) {
    return row.scopes.some((sc) =>
      isHistorical
        ? sc.historicalCountryId === targetId
        : sc.countryId === targetId,
    )
  }
  // 무스코프·무기관이면 보편 직책 — 국가 필터 선택 시에도 해당 국가에서 사용 가능한 직책이나,
  // 국가 고유 + 귀속만 보고 싶을 때는 scopeMode='polity'|'institution'과 조합한다.
  return scopeCat === 'universal'
}

export function formatScopeWindowText(scope: {
  startEra?: string | null
  startYear?: number | null
  endEra?: string | null
  endYear?: number | null
}): string | null {
  if (scope.startYear == null && scope.endYear == null) return null
  const fmt = (era?: string | null, yr?: number | null) => {
    if (yr == null) return ''
    return era === 'BC' ? `BC ${yr}` : `${yr}`
  }
  const left = fmt(scope.startEra, scope.startYear)
  const right = fmt(scope.endEra, scope.endYear)
  if (left && right) return `${left}~${right}`
  if (left) return `${left}~`
  return `~${right}`
}

export function formatOfficeholderPeriod(row: PositionDefinitionOfficeholderRow): string {
  const fmtPart = (
    era?: string | null,
    yr?: number | null,
    mo?: number | null,
    dy?: number | null,
    iso?: string | null,
  ): string => {
    if (yr != null && Number.isFinite(yr)) {
      const prefix = era === 'BC' ? 'BC ' : ''
      const m = mo != null ? `.${String(mo).padStart(2, '0')}` : ''
      const d = mo != null && dy != null ? `.${String(dy).padStart(2, '0')}` : ''
      return `${prefix}${yr}${m}${d}`
    }
    if (iso) {
      const m = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(iso.trim())
      if (m) {
        const yNum = Number(m[1])
        const p = yNum < 0 ? `BC ${Math.abs(yNum)}` : `${yNum}`
        return `${p}${m[2] ? `.${m[2]}` : ''}${m[3] ? `.${m[3]}` : ''}`
      }
    }
    return ''
  }
  const s = fmtPart(row.startEra, row.startYear, row.startMonth, row.startDay, row.startDate)
  const e = fmtPart(row.endEra, row.endYear, row.endMonth, row.endDay, row.endDate)
  if (!s && !e) return '기간 미상'
  return `${s || '?'} ~ ${e || '재임·현직'}`
}
