import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import type {
  PartyMembershipRow,
  PoliticalPartyRow,
} from '@/shared/api/election'
import type { PoliticalSystem } from '@/shared/api/political-system'
import type { Era } from '@/shared/api/persons'
import {
  compareByCountryStart,
  type CountryPeriodShape,
  describeLifespanMismatch,
  getCountryYearRange,
  toSignedYear,
} from '@/shared/lib/country-period'
import { isPartialRangeInverted } from '@/shared/lib/partial-date-string'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { formatDate, getPersonName } from './cabinets-section.helpers'

export interface ParsedDateParts {
  era: Era
  year: string
  month: string
  day: string
}

export interface EnrichedPolityOption {
  id: string
  name: string
  kind: 'modern' | 'historical'
  modernCountryId?: string | null
  eraLabel?: string | null
  startYear?: number | null
  endYear?: number | null
  startEra?: string | null
  endEra?: string | null
  stateType?: string | null
  cabinetCount: number
}

export interface PolityPeriodEntry {
  id: string
  name: string
  startYear?: number | null
  endYear?: number | null
  startEra?: string | null
  endEra?: string | null
  stateType?: string | null
}

export interface PolityYearGuidance {
  severity: 'warning' | 'info'
  message: string
  suggestedPolities: EnrichedPolityOption[]
}

export interface PreviousCabinetBriefing {
  cabinetTitle: string
  periodText: string
  suggestedNextOrdinal: number | null
  continuationStartParts: ParsedDateParts | null
  latestCabinetId: string | null
  latestHeadTenureId: string | null
  latestHeadCabinetCount: number
  isLatestOngoing: boolean
  latestStartParts: ParsedDateParts
}

export interface ReappointmentTermSuggestion {
  lastOrdinal: number | null
  nextSubTermNumber: number
  summaryLabel: string
}

export interface ScopedRoleDefinitionInput {
  id: string
  title: string
  positionType?: string | null
  isMonarchical?: boolean | null
}

export interface ExistingExecutiveTenureSummary {
  id: string
  title?: string | null
  positionType?: string | null
  positionDefinitionId?: string | null
  positionDefinition?: {
    id?: string
    title?: string | null
    positionType?: string | null
    isMonarchical?: boolean | null
  } | null
  person?: Parameters<typeof getPersonName>[0] & { id?: string | null }
  personId?: string | null
  ordinal?: number | null
  subTermNumber?: number | null
  startDate?: string | null
  endDate?: string | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
}

export interface ExistingCabinetSummary {
  id: string
  name?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  startDate?: string | null
  endDate?: string | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  headTenure?: ExistingExecutiveTenureSummary | null
}

export interface PersonLifespanCandidate {
  id: string
  name: string
  surname?: string | null
  middleName?: string | null
  originalName?: string | null
  nameDisplayOrder?: string | null
  country?: {
    defaultNameDisplayOrder?: string | null
    isoCode?: string | null
  } | null
  birthEra?: Era | string | null
  birthYear?: number | null
  deathEra?: Era | string | null
  deathYear?: number | null
  floruitEra?: Era | string | null
  floruitStartYear?: number | null
  floruitEndYear?: number | null
}

const MONARCHICAL_TITLE_PATTERN =
  /^(국왕|황제|여왕|천황|군주|대공|공작|술탄|칼리프|파라오|차르|샤|칸|가한|태왕|왕|친왕|국왕\(친정\)|황제\(친정\))$/

const SURNAME_FIRST_ISO_CODES = new Set([
  'HU',
  'KR',
  'KP',
  'JP',
  'CN',
  'TW',
  'VN',
  'MN',
])

const SURNAME_FIRST_COUNTRY_NAME_PATTERN =
  /헝가리|대한민국|한국|조선|고려|백제|신라|고구려|발해|대한제국|일본|중국|베트남|몽골|대만/

const PARLIAMENTARY_COUNTRY_ISO_CODES = new Set([
  'HU',
  'GB',
  'JP',
  'DE',
  'IT',
  'ES',
  'NL',
  'BE',
  'SE',
  'NO',
  'DK',
  'FI',
  'AT',
  'GR',
  'CZ',
  'SK',
  'CA',
  'AU',
  'NZ',
  'IN',
  'IL',
  'SG',
  'MY',
  'TH',
  'IE',
])

export function isMonarchicalExecutiveOption(option: {
  title: string
  isMonarchical?: boolean | null
}): boolean {
  if (option.isMonarchical === true) return true
  const trimmedTitle = option.title.trim()
  if (!trimmedTitle) return false
  return (
    MONARCHICAL_TITLE_PATTERN.test(trimmedTitle) ||
    trimmedTitle.includes('친정')
  )
}

export function inferExecutivePositionType(
  roleTitle: string,
  explicitType?: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT' | null,
): 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT' {
  if (
    explicitType === 'HEAD_OF_STATE' ||
    explicitType === 'HEAD_OF_GOVERNMENT'
  ) {
    return explicitType
  }
  const normalized = roleTitle.trim()
  if (
    /대통령|국가원수|국가주석|최고지도자|국민지도자|집정관|제1집정|호국경|총통|국왕|황제|군주|여왕|대공|술탄|칼리프|파라오|섭정/.test(
      normalized,
    )
  ) {
    return 'HEAD_OF_STATE'
  }
  return 'HEAD_OF_GOVERNMENT'
}

export function parseStructuredOrIsoDate(
  record:
    | {
        era?: string | null
        year?: number | null
        month?: number | null
        day?: number | null
        isoDate?: string | null
      }
    | null
    | undefined,
): ParsedDateParts {
  if (!record) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  if (record.year != null && Number.isFinite(Number(record.year))) {
    const numericYear = Number(record.year)
    return {
      era: record.era === 'BC' || numericYear < 0 ? 'BC' : 'AD',
      year: String(Math.abs(numericYear)),
      month: record.month != null ? String(record.month) : '',
      day: record.day != null ? String(record.day) : '',
    }
  }
  const rawIso = record.isoDate?.trim()
  if (!rawIso) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  const isoMatch = /^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(rawIso)
  if (!isoMatch) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  const parsedYear = Number(isoMatch[1])
  if (!Number.isFinite(parsedYear) || parsedYear === 0) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  return {
    era: parsedYear < 0 ? 'BC' : 'AD',
    year: String(Math.abs(parsedYear)),
    month: isoMatch[2] ? String(Number(isoMatch[2])) : '',
    day: isoMatch[3] ? String(Number(isoMatch[3])) : '',
  }
}

export function formatPolityEraRange(polity: {
  startYear?: number | null
  endYear?: number | null
  startEra?: string | null
  endEra?: string | null
}): string | null {
  const { start, end } = getCountryYearRange(polity)
  if (start == null && end == null) return null
  const startLabel =
    start != null ? (start < 0 ? `BC ${Math.abs(start)}` : `${start}`) : ''
  const endLabel =
    end != null
      ? end < 0
        ? `BC ${Math.abs(end)}`
        : `${end}`
      : start != null && start >= 1900
        ? '현재'
        : '미상'
  return `${startLabel}~${endLabel}`
}

export function buildSortedPolityOptions(params: {
  country: UnifiedCountry | null
  fallbackHistoricalCountries?: PolityPeriodEntry[]
  constituentPolities?: PolityPeriodEntry[]
  cabinetCountByPolityId?: ReadonlyMap<string, number>
}): EnrichedPolityOption[] {
  const {
    country,
    fallbackHistoricalCountries = [],
    constituentPolities = [],
    cabinetCountByPolityId,
  } = params
  if (!country) return []

  const getCount = (polityId: string) =>
    cabinetCountByPolityId?.get(polityId) ?? 0

  if (country.type === 'modern') {
    const rawHistoricalList: PolityPeriodEntry[] =
      country.historicalCountries && country.historicalCountries.length > 0
        ? country.historicalCountries
        : fallbackHistoricalCountries

    const sortedHistoricals = [...rawHistoricalList].sort(compareByCountryStart)

    const result: EnrichedPolityOption[] = [
      {
        id: country.id,
        name: `${country.name} (현대국가)`,
        kind: 'modern',
        modernCountryId: country.id,
        cabinetCount: getCount(country.id),
      },
    ]

    for (const histItem of sortedHistoricals) {
      result.push({
        id: histItem.id,
        name: histItem.name,
        kind: 'historical',
        modernCountryId: country.id,
        eraLabel: formatPolityEraRange(histItem),
        startYear: histItem.startYear ?? null,
        endYear: histItem.endYear ?? null,
        startEra: histItem.startEra ?? null,
        endEra: histItem.endEra ?? null,
        stateType: histItem.stateType ?? null,
        cabinetCount: getCount(histItem.id),
      })
    }
    return result
  }

  const sortedConstituents = [...constituentPolities]
    .filter((item) => item.id !== country.id)
    .sort(compareByCountryStart)

  const historicalResult: EnrichedPolityOption[] = [
    {
      id: country.id,
      name:
        sortedConstituents.length > 0
          ? `${country.name} (통합·본체)`
          : country.name,
      kind: 'historical',
      modernCountryId: null,
      eraLabel: formatPolityEraRange(country),
      startYear: country.startYear ?? null,
      endYear: country.endYear ?? null,
      startEra: country.startEra ?? null,
      endEra: country.endEra ?? null,
      stateType: country.stateType ?? null,
      cabinetCount: getCount(country.id),
    },
  ]

  for (const constituentItem of sortedConstituents) {
    historicalResult.push({
      id: constituentItem.id,
      name: constituentItem.name,
      kind: 'historical',
      modernCountryId: null,
      eraLabel: formatPolityEraRange(constituentItem),
      startYear: constituentItem.startYear ?? null,
      endYear: constituentItem.endYear ?? null,
      startEra: constituentItem.startEra ?? null,
      endEra: constituentItem.endEra ?? null,
      stateType: constituentItem.stateType ?? null,
      cabinetCount: getCount(constituentItem.id),
    })
  }

  return historicalResult
}

function doesHistoricalPolityCoverSignedYear(
  polity: CountryPeriodShape,
  signedYear: number,
): boolean {
  const { start, end } = getCountryYearRange(polity)
  if (start == null && end == null) return false
  if (start != null && signedYear < start) return false
  if (end != null && signedYear > end) return false
  return true
}

export function resolvePolityYearGuidance(params: {
  polityOptions: EnrichedPolityOption[]
  selectedPolityId: string
  signedStartYear: number | null
}): PolityYearGuidance | null {
  const { polityOptions, selectedPolityId, signedStartYear } = params
  if (signedStartYear == null || polityOptions.length <= 1) return null

  const activePolity = polityOptions.find(
    (optionItem) => optionItem.id === selectedPolityId,
  )
  if (!activePolity) return null

  const matchingHistoricals = polityOptions.filter(
    (optionItem) =>
      optionItem.kind === 'historical' &&
      optionItem.id !== selectedPolityId &&
      doesHistoricalPolityCoverSignedYear(optionItem, signedStartYear),
  )

  const yearDisplay =
    signedStartYear < 0
      ? `기원전 ${Math.abs(signedStartYear)}년`
      : `${signedStartYear}년`

  if (activePolity.kind === 'historical') {
    const mismatchText = describeLifespanMismatch(
      activePolity,
      signedStartYear,
      { recordSupportsBc: true },
    )
    if (!mismatchText) return null

    if (matchingHistoricals.length > 0) {
      const targetNames = matchingHistoricals
        .map((item) =>
          item.eraLabel ? `${item.name}(${item.eraLabel})` : item.name,
        )
        .join(' · ')
      return {
        severity: 'warning',
        message: `입력한 ${yearDisplay}은 현재 선택된 "${activePolity.name}"의 ${mismatchText} ${targetNames} 시기에 해당합니다.`,
        suggestedPolities: matchingHistoricals,
      }
    }

    const modernFallback = polityOptions.filter(
      (optionItem) => optionItem.kind === 'modern',
    )
    return {
      severity: 'warning',
      message: `입력한 ${yearDisplay}은 현재 선택된 "${activePolity.name}"의 ${mismatchText}`,
      suggestedPolities: modernFallback,
    }
  }

  // Currently selected is 'modern' (e.g. 헝가리 (현대국가))
  if (matchingHistoricals.length === 0) return null

  const closedMatches = matchingHistoricals.filter(
    (optionItem) => optionItem.endYear != null,
  )
  if (closedMatches.length > 0) {
    const targetNames = closedMatches
      .map((item) =>
        item.eraLabel ? `${item.name}(${item.eraLabel})` : item.name,
      )
      .join(' · ')
    return {
      severity: 'info',
      message: `입력한 ${yearDisplay}은 ${targetNames} 시기입니다. 시대별 정치체로 구분해 기록하려면 아래 버튼을 눌러 전환하세요.`,
      suggestedPolities: closedMatches,
    }
  }

  // Open-ended contemporary historical polity (e.g. 헝가리 제3공화국 1989~현재)
  const openMatches = matchingHistoricals.filter(
    (optionItem) => optionItem.endYear == null,
  )
  const openWithExistingCabinets = openMatches.filter(
    (optionItem) =>
      optionItem.cabinetCount > 0 && activePolity.cabinetCount === 0,
  )
  if (openWithExistingCabinets.length > 0) {
    const targetOption = openWithExistingCabinets[0]
    return {
      severity: 'info',
      message: `이 국가의 기존 내각(${targetOption.cabinetCount}건)은 "${targetOption.name}"에 등록되어 있습니다. 같은 시대에 맞춰 등록할까요?`,
      suggestedPolities: openWithExistingCabinets,
    }
  }

  return null
}

export function resolveContemporaryRepublicNotice(
  polityOptions: EnrichedPolityOption[],
  selectedPolityId: string,
): {
  message: string
  recommendedPolity: EnrichedPolityOption | null
} | null {
  const modernPolity = polityOptions.find(
    (optionItem) => optionItem.kind === 'modern',
  )
  if (!modernPolity) return null

  const openHistoricals = polityOptions.filter(
    (optionItem) =>
      optionItem.kind === 'historical' &&
      optionItem.endYear == null &&
      optionItem.startYear != null &&
      optionItem.startYear >= 1900,
  )
  if (openHistoricals.length === 0) return null

  const primaryOpenHist = openHistoricals[0]
  if (
    selectedPolityId !== modernPolity.id &&
    selectedPolityId !== primaryOpenHist.id
  ) {
    return null
  }

  if (primaryOpenHist.cabinetCount > 0 && modernPolity.cabinetCount === 0) {
    return {
      message: `현재 현대 시기 내각 ${primaryOpenHist.cabinetCount}건이 "${primaryOpenHist.name}"에 기록되어 있습니다. 일관성을 위해 동일한 소속 선택을 권장합니다.`,
      recommendedPolity:
        selectedPolityId !== primaryOpenHist.id ? primaryOpenHist : null,
    }
  }

  if (modernPolity.cabinetCount > 0 && primaryOpenHist.cabinetCount === 0) {
    return {
      message: `현재 현대 시기 내각 ${modernPolity.cabinetCount}건이 "${modernPolity.name}"에 기록되어 있습니다.`,
      recommendedPolity:
        selectedPolityId !== modernPolity.id ? modernPolity : null,
    }
  }

  return {
    message: `공화국·체제별로 나누어 기록할 때는 "${primaryOpenHist.name}"을, 시대 구분 없이 국가 전체에 두려면 "${modernPolity.name}"을 선택하세요.`,
    recommendedPolity:
      selectedPolityId === modernPolity.id ? primaryOpenHist : null,
  }
}

export function findMatchingPoliticalSystem(
  politicalSystems: PoliticalSystem[],
  axis: { countryId: string | null; historicalCountryId: string | null },
  signedStartYear: number | null,
): PoliticalSystem | null {
  if (politicalSystems.length === 0) return null

  const scopedList = politicalSystems.filter((sysItem) => {
    if (axis.historicalCountryId) {
      return sysItem.historicalCountryId === axis.historicalCountryId
    }
    if (axis.countryId) {
      return (
        sysItem.countryId === axis.countryId && !sysItem.historicalCountryId
      )
    }
    return true
  })

  const pool = scopedList.length > 0 ? scopedList : politicalSystems

  if (signedStartYear != null) {
    const yearMatched = pool.find((sysItem) => {
      const startSigned = toSignedYear(sysItem.startEra, sysItem.startYear)
      const endSigned = toSignedYear(sysItem.endEra, sysItem.endYear)
      if (startSigned != null && signedStartYear < startSigned) return false
      if (endSigned != null && signedStartYear > endSigned) return false
      return startSigned != null || endSigned != null
    })
    if (yearMatched) return yearMatched
  }

  const currentSystem = pool.find((sysItem) => sysItem.isCurrent)
  if (currentSystem) return currentSystem

  return pool[pool.length - 1] ?? null
}

export function extractCanonicalRoleFromPoliticalSystem(
  activePoliticalSystem: PoliticalSystem | null | undefined,
  nonMonarchicalDefs: ScopedRoleDefinitionInput[],
): {
  title: string
  positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  positionDefId: string | null
  reasonHint: string
} | null {
  if (!activePoliticalSystem) return null

  const govForm = activePoliticalSystem.governmentForm ?? null
  const systemLeadsViaState =
    govForm === 'PRESIDENTIAL' ||
    (activePoliticalSystem.headOfStateHasPower === true &&
      activePoliticalSystem.headOfGovernmentHasPower === false)

  const candidateBranchList: Array<{
    posObj: { id: string; title: string; positionType?: string } | null
    rawTitle: string | null
    explicitPosId: string | null
    branch: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  }> = systemLeadsViaState
    ? [
        {
          posObj: activePoliticalSystem.headOfStatePosition ?? null,
          rawTitle: activePoliticalSystem.headOfStateTitle ?? null,
          explicitPosId: activePoliticalSystem.headOfStatePositionId ?? null,
          branch: 'HEAD_OF_STATE',
        },
        {
          posObj: activePoliticalSystem.headOfGovernmentPosition ?? null,
          rawTitle: activePoliticalSystem.headOfGovernmentTitle ?? null,
          explicitPosId:
            activePoliticalSystem.headOfGovernmentPositionId ?? null,
          branch: 'HEAD_OF_GOVERNMENT',
        },
      ]
    : [
        {
          posObj: activePoliticalSystem.headOfGovernmentPosition ?? null,
          rawTitle: activePoliticalSystem.headOfGovernmentTitle ?? null,
          explicitPosId:
            activePoliticalSystem.headOfGovernmentPositionId ?? null,
          branch: 'HEAD_OF_GOVERNMENT',
        },
        {
          posObj: activePoliticalSystem.headOfStatePosition ?? null,
          rawTitle: activePoliticalSystem.headOfStateTitle ?? null,
          explicitPosId: activePoliticalSystem.headOfStatePositionId ?? null,
          branch: 'HEAD_OF_STATE',
        },
      ]

  for (const branchEntry of candidateBranchList) {
    const cleanTitle = (
      branchEntry.posObj?.title ??
      branchEntry.rawTitle ??
      ''
    ).trim()
    if (!cleanTitle) continue
    if (isMonarchicalExecutiveOption({ title: cleanTitle })) continue

    const matchedOption = nonMonarchicalDefs.find(
      (defOption) =>
        (branchEntry.posObj?.id && defOption.id === branchEntry.posObj.id) ||
        (branchEntry.explicitPosId &&
          defOption.id === branchEntry.explicitPosId) ||
        defOption.title.trim() === cleanTitle,
    )
    const regimeLabel = activePoliticalSystem.name?.trim() || '헌정 체제'
    return {
      title: cleanTitle,
      positionType: inferExecutivePositionType(
        cleanTitle,
        (branchEntry.posObj?.positionType as
          | 'HEAD_OF_STATE'
          | 'HEAD_OF_GOVERNMENT'
          | undefined) ?? branchEntry.branch,
      ),
      positionDefId:
        matchedOption?.id ??
        branchEntry.posObj?.id ??
        branchEntry.explicitPosId ??
        null,
      reasonHint: `${regimeLabel}에 지정된 공식 수반 직책("${cleanTitle}")이 기본 선택되었습니다.`,
    }
  }

  return null
}

export function resolveSmartDefaultExecutiveRole(params: {
  headPositionOptions: ScopedRoleDefinitionInput[]
  existingHeadTenures: ExistingExecutiveTenureSummary[]
  activePoliticalSystem?: PoliticalSystem | null
  polityDisplayName?: string
  polityStateType?: string | null
  countryIsoCode?: string | null
  isHistoricalPolity?: boolean
}): {
  title: string
  positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  positionDefId: string | null
  reasonHint: string | null
} {
  const {
    headPositionOptions,
    existingHeadTenures,
    activePoliticalSystem = null,
    polityDisplayName = '',
    polityStateType = null,
    countryIsoCode = null,
    isHistoricalPolity = false,
  } = params

  const nonMonarchicalDefs = headPositionOptions.filter(
    (defItem) => !isMonarchicalExecutiveOption(defItem),
  )

  // 0) If activePoliticalSystem specifies an explicit canonical non-monarchical executive role, honor it first
  const canonicalFromSystem = extractCanonicalRoleFromPoliticalSystem(
    activePoliticalSystem,
    nonMonarchicalDefs,
  )
  if (canonicalFromSystem) {
    return canonicalFromSystem
  }

  // 1) Check non-monarchical role most frequently used in existing tenures of this polity
  const roleFrequency = new Map<
    string,
    {
      count: number
      positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
      positionDefId: string | null
    }
  >()
  for (const tenureItem of existingHeadTenures) {
    const rawTitle = (
      tenureItem.title ??
      tenureItem.positionDefinition?.title ??
      ''
    ).trim()
    if (!rawTitle) continue
    if (
      isMonarchicalExecutiveOption({
        title: rawTitle,
        isMonarchical: tenureItem.positionDefinition?.isMonarchical,
      })
    ) {
      continue
    }
    const existingEntry = roleFrequency.get(rawTitle)
    const inferredType = inferExecutivePositionType(
      rawTitle,
      (tenureItem.positionType ??
        tenureItem.positionDefinition?.positionType) as
        | 'HEAD_OF_STATE'
        | 'HEAD_OF_GOVERNMENT'
        | null,
    )
    const matchedDef = nonMonarchicalDefs.find(
      (defOption) => defOption.title.trim() === rawTitle,
    )
    roleFrequency.set(rawTitle, {
      count: (existingEntry?.count ?? 0) + 1,
      positionType: inferredType,
      positionDefId:
        matchedDef?.id ??
        tenureItem.positionDefinitionId ??
        tenureItem.positionDefinition?.id ??
        null,
    })
  }

  let topExistingTitle: string | null = null
  let topExistingCount = 0
  for (const [candidateTitle, meta] of roleFrequency.entries()) {
    if (meta.count > topExistingCount) {
      topExistingTitle = candidateTitle
      topExistingCount = meta.count
    }
  }

  if (topExistingTitle) {
    const chosenMeta = roleFrequency.get(topExistingTitle)!
    return {
      title: topExistingTitle,
      positionType: chosenMeta.positionType,
      positionDefId: chosenMeta.positionDefId,
      reasonHint: `이 시대의 기존 내각에서 가장 많이 쓰인 직책("${topExistingTitle}")이 기본 선택되었습니다.`,
    }
  }

  // 2) Determine preferred executive branch from PoliticalSystem / stateType / country cues
  const govForm = activePoliticalSystem?.governmentForm ?? null
  let prefersHeadOfGov = false
  let prefersHeadOfState = false
  let reasonHint: string | null = null

  if (
    govForm === 'PARLIAMENTARY' ||
    govForm === 'CONSTITUTIONAL_MONARCHY' ||
    govForm === 'SEMI_PRESIDENTIAL'
  ) {
    prefersHeadOfGov = true
    reasonHint =
      govForm === 'PARLIAMENTARY'
        ? '의원내각제 정체에 맞춰 "총리"가 기본 선택되었습니다.'
        : govForm === 'CONSTITUTIONAL_MONARCHY'
          ? '입헌군주제 정체에 맞춰 내각 수반인 "총리"가 기본 선택되었습니다.'
          : '이원집정부제 정체에 맞춰 내각을 이끄는 "총리"가 기본 선택되었습니다.'
  } else if (govForm === 'PRESIDENTIAL') {
    prefersHeadOfState = true
    reasonHint = '대통령제 정체에 맞춰 "대통령"이 기본 선택되었습니다.'
  } else if (
    /왕국|제국|공국|대공국|섭정/.test(polityDisplayName) ||
    polityStateType === 'KINGDOM' ||
    polityStateType === 'EMPIRE' ||
    polityStateType === 'PRINCIPALITY'
  ) {
    prefersHeadOfGov = true
    reasonHint =
      '군주·섭정 시대의 내각 수반으로 "총리"가 기본 선택되었습니다. (국왕·섭정 본인의 재위는 군주·원수 재위에서 등록)'
  } else if (
    (countryIsoCode &&
      PARLIAMENTARY_COUNTRY_ISO_CODES.has(countryIsoCode.toUpperCase())) ||
    /헝가리|영국|일본|독일|이탈리아|스페인|캐나다|호주|인민공화국|소비에트/.test(
      polityDisplayName,
    )
  ) {
    prefersHeadOfGov = true
  }

  // 3) Match against non-monarchical PositionDefinitions if available
  if (nonMonarchicalDefs.length > 0) {
    if (prefersHeadOfGov) {
      const hogDef = nonMonarchicalDefs.find(
        (defOption) =>
          inferExecutivePositionType(
            defOption.title,
            defOption.positionType as
              | 'HEAD_OF_STATE'
              | 'HEAD_OF_GOVERNMENT'
              | null,
          ) === 'HEAD_OF_GOVERNMENT',
      )
      if (hogDef) {
        return {
          title: hogDef.title.trim(),
          positionType: 'HEAD_OF_GOVERNMENT',
          positionDefId: hogDef.id,
          reasonHint,
        }
      }
    }
    if (prefersHeadOfState) {
      const hosDef = nonMonarchicalDefs.find(
        (defOption) =>
          inferExecutivePositionType(
            defOption.title,
            defOption.positionType as
              | 'HEAD_OF_STATE'
              | 'HEAD_OF_GOVERNMENT'
              | null,
          ) === 'HEAD_OF_STATE',
      )
      if (hosDef) {
        return {
          title: hosDef.title.trim(),
          positionType: 'HEAD_OF_STATE',
          positionDefId: hosDef.id,
          reasonHint,
        }
      }
    }
    const firstSafeDef = nonMonarchicalDefs[0]
    return {
      title: firstSafeDef.title.trim(),
      positionType: inferExecutivePositionType(
        firstSafeDef.title,
        firstSafeDef.positionType as
          | 'HEAD_OF_STATE'
          | 'HEAD_OF_GOVERNMENT'
          | null,
      ),
      positionDefId: firstSafeDef.id,
      reasonHint,
    }
  }

  // 4) Fallback standard title (never monarchical!)
  const fallbackTitle = prefersHeadOfGov
    ? '총리'
    : prefersHeadOfState
      ? '대통령'
      : isHistoricalPolity
        ? '총리'
        : '대통령'

  return {
    title: fallbackTitle,
    positionType: fallbackTitle === '대통령' ? 'HEAD_OF_STATE' : 'HEAD_OF_GOVERNMENT',
    positionDefId: null,
    reasonHint,
  }
}

function computeRecordSortKey(record: {
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  startDate?: string | null
}): number {
  const parsed = parseStructuredOrIsoDate({
    era: record.startEra,
    year: record.startYear,
    month: record.startMonth,
    day: record.startDay,
    isoDate: record.startDate,
  })
  const numericYear = Number(parsed.year)
  if (!parsed.year || !Number.isFinite(numericYear) || numericYear <= 0) {
    return -999_999_999
  }
  const signedYear = parsed.era === 'BC' ? -numericYear : numericYear
  const monthNum = parsed.month ? Number(parsed.month) : 1
  const dayNum = parsed.day ? Number(parsed.day) : 1
  return signedYear * 10000 + monthNum * 100 + dayNum
}

function formatPartsCompact(parts: ParsedDateParts): string {
  if (!parts.year) return '미상'
  const prefix = parts.era === 'BC' ? 'BC ' : ''
  const monthSuffix = parts.month ? `.${parts.month.padStart(2, '0')}` : ''
  const daySuffix =
    parts.month && parts.day ? `.${parts.day.padStart(2, '0')}` : ''
  return `${prefix}${parts.year}${monthSuffix}${daySuffix}`
}

export function buildPreviousCabinetBriefing(params: {
  cabinets: ExistingCabinetSummary[]
  existingHeadTenures: ExistingExecutiveTenureSummary[]
  roleTitle: string
  positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
}): PreviousCabinetBriefing | null {
  const { cabinets, existingHeadTenures, roleTitle, positionType } = params
  const cleanRole = roleTitle.trim()

  // Compute suggestedNextOrdinal from matching role tenures
  let maxOrdinal = 0
  for (const tenureItem of existingHeadTenures) {
    const itemTitle = (
      tenureItem.title ??
      tenureItem.positionDefinition?.title ??
      ''
    ).trim()
    const itemType =
      tenureItem.positionType ??
      tenureItem.positionDefinition?.positionType ??
      null
    const matchesRole =
      (cleanRole && itemTitle === cleanRole) ||
      (!itemTitle && itemType === positionType)
    if (
      matchesRole &&
      tenureItem.ordinal != null &&
      Number.isFinite(tenureItem.ordinal) &&
      tenureItem.ordinal > maxOrdinal
    ) {
      maxOrdinal = tenureItem.ordinal
    }
  }
  const suggestedNextOrdinal = maxOrdinal > 0 ? maxOrdinal + 1 : null

  if (cabinets.length > 0) {
    const sortedCabs = [...cabinets].sort(
      (leftCab, rightCab) =>
        computeRecordSortKey({
          startEra: leftCab.startEra ?? leftCab.headTenure?.startEra,
          startYear: leftCab.startYear ?? leftCab.headTenure?.startYear,
          startMonth: leftCab.startMonth ?? leftCab.headTenure?.startMonth,
          startDay: leftCab.startDay ?? leftCab.headTenure?.startDay,
          startDate: leftCab.startDate ?? leftCab.headTenure?.startDate,
        }) -
        computeRecordSortKey({
          startEra: rightCab.startEra ?? rightCab.headTenure?.startEra,
          startYear: rightCab.startYear ?? rightCab.headTenure?.startYear,
          startMonth: rightCab.startMonth ?? rightCab.headTenure?.startMonth,
          startDay: rightCab.startDay ?? rightCab.headTenure?.startDay,
          startDate: rightCab.startDate ?? rightCab.headTenure?.startDate,
        }),
    )
    const latestCab = sortedCabs[sortedCabs.length - 1]
    const headTenure = latestCab.headTenure
    const startParts = parseStructuredOrIsoDate({
      era: latestCab.startEra ?? headTenure?.startEra,
      year: latestCab.startYear ?? headTenure?.startYear,
      month: latestCab.startMonth ?? headTenure?.startMonth,
      day: latestCab.startDay ?? headTenure?.startDay,
      isoDate: latestCab.startDate ?? headTenure?.startDate,
    })
    const endParts = parseStructuredOrIsoDate({
      era:
        latestCab.startYear != null
          ? latestCab.endEra
          : (latestCab.endEra ?? headTenure?.endEra),
      year:
        latestCab.startYear != null
          ? latestCab.endYear
          : (latestCab.endYear ?? headTenure?.endYear),
      month:
        latestCab.startYear != null
          ? latestCab.endMonth
          : (latestCab.endMonth ?? headTenure?.endMonth),
      day:
        latestCab.startYear != null
          ? latestCab.endDay
          : (latestCab.endDay ?? headTenure?.endDay),
      isoDate:
        latestCab.startYear != null
          ? latestCab.endDate
          : (latestCab.endDate ?? headTenure?.endDate),
    })

    const ordText =
      headTenure?.ordinal != null
        ? `제${headTenure.ordinal}대${headTenure.subTermNumber != null ? ` ${headTenure.subTermNumber}기` : ''} `
        : ''
    const personLabel = headTenure?.person
      ? getPersonName(headTenure.person)
      : ''
    const fallbackTitle = `${ordText}${personLabel || '행정부'} 내각`.trim()
    const cabinetTitle = latestCab.name?.trim() || fallbackTitle
    const periodText = `${formatPartsCompact(startParts)} ~ ${endParts.year ? formatPartsCompact(endParts) : '현직'}`
    const latestHeadId = headTenure?.id ?? null
    const latestHeadCabCount = latestHeadId
      ? cabinets.filter((cabRow) => cabRow.headTenure?.id === latestHeadId)
          .length
      : 0

    return {
      cabinetTitle,
      periodText,
      suggestedNextOrdinal,
      continuationStartParts: endParts.year ? endParts : null,
      latestCabinetId: latestCab.id,
      latestHeadTenureId: latestHeadId,
      latestHeadCabinetCount: latestHeadCabCount,
      isLatestOngoing: !endParts.year,
      latestStartParts: startParts,
    }
  }

  // Fallback to latest head tenure if no cabinet record is loaded yet
  const nonMonarchicalTenures = existingHeadTenures.filter(
    (tenureItem) =>
      !isMonarchicalExecutiveOption({
        title:
          tenureItem.title ?? tenureItem.positionDefinition?.title ?? '',
        isMonarchical: tenureItem.positionDefinition?.isMonarchical,
      }),
  )
  if (nonMonarchicalTenures.length === 0) return null

  const sortedTenures = [...nonMonarchicalTenures].sort(
    (leftTenure, rightTenure) =>
      computeRecordSortKey(leftTenure) - computeRecordSortKey(rightTenure),
  )
  const latestTenure = sortedTenures[sortedTenures.length - 1]
  const startParts = parseStructuredOrIsoDate({
    era: latestTenure.startEra,
    year: latestTenure.startYear,
    month: latestTenure.startMonth,
    day: latestTenure.startDay,
    isoDate: latestTenure.startDate,
  })
  const endParts = parseStructuredOrIsoDate({
    era: latestTenure.endEra,
    year: latestTenure.endYear,
    month: latestTenure.endMonth,
    day: latestTenure.endDay,
    isoDate: latestTenure.endDate,
  })
  const ordText =
    latestTenure.ordinal != null
      ? `제${latestTenure.ordinal}대${latestTenure.subTermNumber != null ? ` ${latestTenure.subTermNumber}기` : ''} `
      : ''
  const personLabel = latestTenure.person
    ? getPersonName(latestTenure.person)
    : '수반'
  const roleLabel =
    latestTenure.title ?? latestTenure.positionDefinition?.title ?? '내각'
  const periodText = `${startParts.year ? formatPartsCompact(startParts) : latestTenure.startDate ? formatDate(latestTenure.startDate) : '?'} ~ ${endParts.year ? formatPartsCompact(endParts) : latestTenure.endDate ? formatDate(latestTenure.endDate) : '현직'}`

  return {
    cabinetTitle: `${ordText}${personLabel} (${roleLabel})`,
    periodText,
    suggestedNextOrdinal,
    continuationStartParts: endParts.year ? endParts : null,
    latestCabinetId: null,
    latestHeadTenureId: latestTenure.id,
    latestHeadCabinetCount: 0,
    isLatestOngoing: !endParts.year && !latestTenure.endDate,
    latestStartParts: startParts,
  }
}

export function canAutoClosePreviousOngoingCabinet(
  briefing: PreviousCabinetBriefing | null,
  newStartParts: ParsedDateParts,
): boolean {
  if (!briefing || !briefing.isLatestOngoing || !briefing.latestCabinetId) {
    return false
  }
  const parsedNewYear = Number(newStartParts.year.trim())
  if (
    !newStartParts.year.trim() ||
    !Number.isInteger(parsedNewYear) ||
    parsedNewYear <= 0
  ) {
    return false
  }
  if (briefing.latestStartParts.year.trim()) {
    if (isPartialRangeInverted(briefing.latestStartParts, newStartParts)) {
      return false
    }
  }
  return true
}

export function checkReshuffleTenureRangeWarning(params: {
  tenure: ExistingExecutiveTenureSummary | null
  cabinetStart: ParsedDateParts
  cabinetEnd: ParsedDateParts
}): string | null {
  const { tenure, cabinetStart, cabinetEnd } = params
  if (!tenure || !cabinetStart.year.trim()) return null

  const tenureStart = parseStructuredOrIsoDate({
    era: tenure.startEra,
    year: tenure.startYear,
    month: tenure.startMonth,
    day: tenure.startDay,
    isoDate: tenure.startDate,
  })
  const tenureEnd = parseStructuredOrIsoDate({
    era: tenure.endEra,
    year: tenure.endYear,
    month: tenure.endMonth,
    day: tenure.endDay,
    isoDate: tenure.endDate,
  })

  if (
    tenureStart.year.trim() &&
    isPartialRangeInverted(tenureStart, cabinetStart)
  ) {
    return `입력한 개각 출범일(${formatPartsCompact(cabinetStart)})이 기준 수반 임기의 시작일(${formatPartsCompact(tenureStart)})보다 앞섭니다. 동일 임기 내 개각인지, 아니면 별도의 새 임기(재집권)인지 확인해주세요.`
  }

  if (tenureEnd.year.trim()) {
    if (isPartialRangeInverted(cabinetStart, tenureEnd)) {
      return `입력한 개각 출범일(${formatPartsCompact(cabinetStart)})이 기준 수반 임기의 종료일(${formatPartsCompact(tenureEnd)}) 이후입니다. 퇴임 후 재집권이라면 [총리·대통령 등 1인 수반 내각] 모드로 새 임기를 등록해주세요.`
    }
    if (
      cabinetEnd.year.trim() &&
      isPartialRangeInverted(cabinetEnd, tenureEnd)
    ) {
      return `입력한 개각 종료일(${formatPartsCompact(cabinetEnd)})이 기준 수반 임기의 종료일(${formatPartsCompact(tenureEnd)})을 벗어납니다.`
    }
  }

  return null
}

export function buildReappointmentSuggestion(
  priorTenuresForPerson: ExistingExecutiveTenureSummary[],
): ReappointmentTermSuggestion | null {
  if (priorTenuresForPerson.length === 0) return null
  const sorted = [...priorTenuresForPerson].sort(
    (leftItem, rightItem) =>
      computeRecordSortKey(leftItem) - computeRecordSortKey(rightItem),
  )
  const latest = sorted[sorted.length - 1]
  const lastOrdinal =
    latest.ordinal != null && Number.isFinite(latest.ordinal)
      ? latest.ordinal
      : null
  const maxSubTerm = priorTenuresForPerson.reduce((accMax, item) => {
    const subVal = item.subTermNumber ?? 0
    return subVal > accMax ? subVal : accMax
  }, 0)
  const nextSubTermNumber = Math.max(
    maxSubTerm + 1,
    priorTenuresForPerson.length + 1,
  )
  const summaryLabel =
    lastOrdinal != null
      ? `제${lastOrdinal}대 ${nextSubTermNumber}기`
      : `${nextSubTermNumber}기`
  return {
    lastOrdinal,
    nextSubTermNumber,
    summaryLabel,
  }
}

export function inferDefaultQuickPersonNameOrder(params: {
  country?: UnifiedCountry | null
  polityDisplayName?: string
  countryIsoCode?: string | null
  countryDefaultNameDisplayOrder?: string | null
}): 'korean' | 'western' {
  const {
    country = null,
    polityDisplayName = '',
    countryIsoCode = null,
    countryDefaultNameDisplayOrder = null,
  } = params
  const isoUpper = (countryIsoCode ?? country?.isoCode ?? '').toUpperCase()
  if (isoUpper && SURNAME_FIRST_ISO_CODES.has(isoUpper)) {
    return 'korean'
  }
  const combinedName = `${country?.name ?? ''} ${polityDisplayName}`
  if (SURNAME_FIRST_COUNTRY_NAME_PATTERN.test(combinedName)) {
    return 'korean'
  }
  const explicitOrder =
    countryDefaultNameDisplayOrder ?? country?.defaultNameDisplayOrder ?? null
  if (explicitOrder === 'korean') {
    return 'korean'
  }
  if (explicitOrder === 'western') {
    return 'western'
  }
  return 'western'
}

export function formatQuickPersonPreview(params: {
  surname: string
  givenName: string
  nameDisplayOrder: 'korean' | 'western'
}): string {
  const cleanSurname = params.surname.trim()
  const cleanGiven = params.givenName.trim()
  if (!cleanSurname && !cleanGiven) return ''
  return getPersonDisplayName({
    name: cleanGiven,
    surname: cleanSurname || null,
    nameDisplayOrder: params.nameDisplayOrder,
  })
}

export function formatPersonLifespanTag(
  person: PersonLifespanCandidate,
): string | null {
  const signedBirth = toSignedYear(person.birthEra, person.birthYear)
  const signedDeath = toSignedYear(person.deathEra, person.deathYear)
  if (signedBirth != null || signedDeath != null) {
    const birthText =
      signedBirth != null
        ? signedBirth < 0
          ? `BC ${Math.abs(signedBirth)}`
          : `${signedBirth}`
        : '?'
    const deathText =
      signedDeath != null
        ? signedDeath < 0
          ? `BC ${Math.abs(signedDeath)}`
          : `${signedDeath}`
        : ''
    return `${birthText}~${deathText}`
  }
  const signedFlStart = toSignedYear(
    person.floruitEra,
    person.floruitStartYear,
  )
  const signedFlEnd = toSignedYear(person.floruitEra, person.floruitEndYear)
  if (signedFlStart != null || signedFlEnd != null) {
    const startText =
      signedFlStart != null
        ? signedFlStart < 0
          ? `BC ${Math.abs(signedFlStart)}`
          : `${signedFlStart}`
        : ''
    const endText =
      signedFlEnd != null
        ? signedFlEnd < 0
          ? `BC ${Math.abs(signedFlEnd)}`
          : `${signedFlEnd}`
        : ''
    return `활동 ${startText}~${endText}`
  }
  return null
}

export function isPersonPlausibleForYear(
  person: PersonLifespanCandidate,
  signedYear: number | null,
): boolean {
  if (signedYear == null) return true
  const signedBirth = toSignedYear(person.birthEra, person.birthYear)
  const signedDeath = toSignedYear(person.deathEra, person.deathYear)
  if (signedBirth != null && signedYear < signedBirth + 12) return false
  if (signedDeath != null && signedYear > signedDeath + 1) return false
  if (signedBirth != null && signedYear - signedBirth > 105) return false
  return true
}

export function checkPersonTenureLifespanWarning(
  person: PersonLifespanCandidate | null | undefined,
  signedStartYear: number | null,
): string | null {
  if (!person || signedStartYear == null) return null
  const personName = getPersonDisplayName(person)
  const lifespanTag = formatPersonLifespanTag(person)
  const signedBirth = toSignedYear(person.birthEra, person.birthYear)
  const signedDeath = toSignedYear(person.deathEra, person.deathYear)
  const yearLabel =
    signedStartYear < 0
      ? `기원전 ${Math.abs(signedStartYear)}년`
      : `${signedStartYear}년`

  if (signedDeath != null && signedStartYear > signedDeath) {
    const deathLabel =
      signedDeath < 0 ? `기원전 ${Math.abs(signedDeath)}년` : `${signedDeath}년`
    return `선택한 인물(${personName}${lifespanTag ? `, ${lifespanTag}` : ''})의 사망 연도(${deathLabel}) 이후인 ${yearLabel}으로 입력되어 있습니다. 부자·동명이인이거나 연도 오기인지 확인해주세요.`
  }

  if (signedBirth != null && signedStartYear < signedBirth) {
    const birthLabel =
      signedBirth < 0 ? `기원전 ${Math.abs(signedBirth)}년` : `${signedBirth}년`
    return `선택한 인물(${personName}${lifespanTag ? `, ${lifespanTag}` : ''})의 출생 연도(${birthLabel}) 이전 시점(${yearLabel})입니다. 취임 연도나 인물을 확인해주세요.`
  }

  return null
}

export function formatPeriodDurationSummary(
  startParts: ParsedDateParts,
  endParts: ParsedDateParts,
): string | null {
  const startNumYear = Number(startParts.year.trim())
  if (
    !startParts.year.trim() ||
    !Number.isInteger(startNumYear) ||
    startNumYear <= 0
  ) {
    return null
  }
  if (!endParts.year.trim()) {
    return '현직 · 존속 중 (종료일 비움)'
  }
  const endNumYear = Number(endParts.year.trim())
  if (!Number.isInteger(endNumYear) || endNumYear <= 0) {
    return null
  }

  const signedStartYear =
    startParts.era === 'BC' ? -startNumYear : startNumYear
  const signedEndYear = endParts.era === 'BC' ? -endNumYear : endNumYear
  const startMonthNum = startParts.month.trim()
    ? Number(startParts.month.trim())
    : null
  const endMonthNum = endParts.month.trim()
    ? Number(endParts.month.trim())
    : null

  const totalMonths =
    (signedEndYear - signedStartYear) * 12 +
    ((endMonthNum ?? 6) - (startMonthNum ?? 6))

  if (totalMonths < 0) return null
  if (totalMonths === 0) {
    return signedEndYear === signedStartYear ? '1년 미만 (단기)' : null
  }
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years > 0 && months > 0) {
    return startMonthNum != null && endMonthNum != null
      ? `약 ${years}년 ${months}개월`
      : `약 ${years}년`
  }
  if (years > 0) {
    return `약 ${years}년`
  }
  return `약 ${months}개월`
}

function extractSignedYearFromDateLike(
  rawDate: string | Date | null | undefined,
): number | null {
  if (!rawDate) return null
  if (rawDate instanceof Date) {
    const fullYear = rawDate.getUTCFullYear()
    return Number.isFinite(fullYear) ? fullYear : null
  }
  const trimmed = String(rawDate).trim()
  if (!trimmed) return null
  const yearMatch = /^(-?\d{1,6})/.exec(trimmed)
  if (!yearMatch) return null
  const parsed = Number(yearMatch[1])
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : null
}

export function formatPartyOptionLabel(party: PoliticalPartyRow): string {
  const shortSuffix =
    party.shortName && party.shortName.trim() !== party.name.trim()
      ? ` (${party.shortName.trim()})`
      : ''
  const foundedYear = extractSignedYearFromDateLike(party.foundedDate)
  const dissolvedYear = extractSignedYearFromDateLike(party.dissolvedDate)
  if (foundedYear != null || dissolvedYear != null) {
    const startText =
      foundedYear != null
        ? foundedYear < 0
          ? `BC ${Math.abs(foundedYear)}`
          : String(foundedYear)
        : '?'
    const endText =
      dissolvedYear != null
        ? dissolvedYear < 0
          ? `BC ${Math.abs(dissolvedYear)}`
          : String(dissolvedYear)
        : ''
    return `${party.name}${shortSuffix} · ${startText}~${endText}`
  }
  return `${party.name}${shortSuffix}`
}

export function organizePartiesForCabinetScope(params: {
  parties: PoliticalPartyRow[]
  countryId: string | null
  historicalCountryId: string | null
  signedStartYear: number | null
}): {
  recommendedParties: PoliticalPartyRow[]
  otherParties: PoliticalPartyRow[]
} {
  const { parties, countryId, historicalCountryId, signedStartYear } = params
  const recommendedParties: PoliticalPartyRow[] = []
  const otherParties: PoliticalPartyRow[] = []

  for (const partyRow of parties) {
    const foundedYear = extractSignedYearFromDateLike(partyRow.foundedDate)
    const dissolvedYear = extractSignedYearFromDateLike(partyRow.dissolvedDate)
    const hasLifespan = foundedYear != null || dissolvedYear != null

    const overlapsYear =
      signedStartYear != null && hasLifespan
        ? (foundedYear == null || signedStartYear >= foundedYear - 1) &&
          (dissolvedYear == null || signedStartYear <= dissolvedYear + 1)
        : null

    const isDirectPolityMatch = historicalCountryId
      ? partyRow.historicalCountryId === historicalCountryId
      : Boolean(
          countryId &&
            partyRow.countryId === countryId &&
            !partyRow.historicalCountryId,
        )

    if (overlapsYear === true) {
      recommendedParties.push(partyRow)
    } else if (overlapsYear === false && !isDirectPolityMatch) {
      otherParties.push(partyRow)
    } else if (isDirectPolityMatch && overlapsYear !== false) {
      recommendedParties.push(partyRow)
    } else if (
      historicalCountryId &&
      !partyRow.historicalCountryId &&
      signedStartYear == null
    ) {
      // Modern-country party when no startYear is typed yet on a historical polity
      otherParties.push(partyRow)
    } else if (overlapsYear === false) {
      otherParties.push(partyRow)
    } else {
      recommendedParties.push(partyRow)
    }
  }

  return { recommendedParties, otherParties }
}

export function resolveMatchingPartyFromMemberships(
  memberships: PartyMembershipRow[],
  signedStartYear: number | null,
): { partyId: string; partyName: string } | null {
  if (!Array.isArray(memberships) || memberships.length === 0) return null

  const normalizedEntries = memberships
    .map((memberItem) => {
      const resolvedId = memberItem.partyId ?? memberItem.party?.id ?? ''
      if (!resolvedId) return null
      const resolvedName = memberItem.party?.name?.trim() || '소속 정당'
      const startSigned = extractSignedYearFromDateLike(memberItem.startDate)
      const endSigned = extractSignedYearFromDateLike(memberItem.endDate)
      return {
        partyId: resolvedId,
        partyName: resolvedName,
        startSigned,
        endSigned,
      }
    })
    .filter(
      (
        entryItem,
      ): entryItem is {
        partyId: string
        partyName: string
        startSigned: number | null
        endSigned: number | null
      } => entryItem !== null,
    )

  if (normalizedEntries.length === 0) return null

  if (signedStartYear != null) {
    const overlapping = normalizedEntries.find(
      (entryItem) =>
        (entryItem.startSigned == null ||
          signedStartYear >= entryItem.startSigned - 1) &&
        (entryItem.endSigned == null ||
          signedStartYear <= entryItem.endSigned + 1),
    )
    if (overlapping) {
      return {
        partyId: overlapping.partyId,
        partyName: overlapping.partyName,
      }
    }
  }

  const sortedByStart = [...normalizedEntries].sort(
    (leftEntry, rightEntry) =>
      (rightEntry.startSigned ?? -999_999) -
      (leftEntry.startSigned ?? -999_999),
  )
  const chosen = sortedByStart[0]
  return {
    partyId: chosen.partyId,
    partyName: chosen.partyName,
  }
}
