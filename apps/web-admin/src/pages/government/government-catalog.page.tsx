import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiArrowRight,
  FiAward,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiColumns,
  FiGrid,
  FiLayers,
  FiLink2,
  FiList,
  FiPlus,
  FiSearch,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerChipFill,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerRowWash,
  ledgerSurface,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import type { PositionCategory } from '@/entities/government-position/model/types'
import { useCountries } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import {
  administrationDepartmentApi,
  type AdministrationDepartmentKind,
  DEPARTMENT_KIND_LABEL,
  DEPARTMENT_KIND_OPTIONS,
} from '@/shared/api/administration-department'
import {
  type CabinetListItemDto,
  personCareerApi,
} from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { formatCenturyLabel, getCenturyFromIso } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { SidePanel } from '@/shared/ui/side-panel'
import { PositionDefinitionsSection } from '@/widgets/country/country-detail/ui/position-definitions-section.widget'

import {
  type CabinetDisplayMode,
  type CabinetSortKey,
  type DepartmentSortKey,
  extractSignedStartYearFromIso,
  formatIsoShortPeriod,
  formatSignedYearLabel,
  GLOBAL_CABINET_CATEGORY_LABELS,
  type GovernmentCatalogTab,
  type GovernmentListReturnState,
  resolveCabinetCategory,
  resolveCabinetDisplayTitle,
  resolveCabinetHeadName,
  resolveCabinetMinisterCount,
  resolveCabinetPolityInfo,
  resolveCabinetPositionTitle,
  resolveDepartmentPolityInfo,
} from './government-helpers'

const UNDATED_CHAPTER = '__undated__'
const HISTORICAL_YEAR_PRESETS: readonly number[] = [1914, 1939, 1945, 1991]

function formatCenturyRangeSubtitle(century: number): string {
  if (century > 0) return `${(century - 1) * 100 + 1}–${century * 100}`
  const endMagnitude = (-century - 1) * 100 + 1
  return `기원전 ${-century * 100}–${endMagnitude}`
}

export function GovernmentCatalogPage() {
  useDocumentTitle('전 국가 정부·내각')
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab: GovernmentCatalogTab =
    searchParams.get('tab') === 'departments' ? 'departments' : 'cabinets'
  const queryText = searchParams.get('q') ?? ''
  const rawYearParam = searchParams.get('year') ?? ''
  const parsedYear =
    rawYearParam.trim() !== '' ? Number.parseInt(rawYearParam, 10) : Number.NaN
  const activeAtYear = Number.isFinite(parsedYear) ? parsedYear : undefined

  const currentOnly = searchParams.get('current') === '1'
  const linkedOnly = searchParams.get('linked') === '1'
  const selectedPolityToken = searchParams.get('polity') ?? ''
  const cabinetCatFilter = (searchParams.get('cabCat') ?? '') as
    | PositionCategory
    | ''
  const deptCategoryFilter = searchParams.get('categoryId') ?? ''
  const deptKindFilter = (searchParams.get('kind') ?? '') as
    | AdministrationDepartmentKind
    | ''
  const cabinetSort = (searchParams.get('sort') ??
    'period_desc') as CabinetSortKey
  const deptSort = (searchParams.get('deptSort') ??
    'country') as DepartmentSortKey
  const displayMode: CabinetDisplayMode =
    searchParams.get('view') === 'cards' ? 'cards' : 'ledger'

  const [yearInputDraft, setYearInputDraft] = useState<string>(rawYearParam)
  const [quickCreateOpen, setQuickCreateOpen] = useState<boolean>(false)
  const [positionDictOpen, setPositionDictOpen] = useState<boolean>(false)
  const [collapsedChapters, setCollapsedChapters] = useState<
    ReadonlySet<string>
  >(new Set())

  const navigateToCountryRegistration = (polityToken: string) => {
    const targetPolityId = polityToken.slice(2).trim()
    if (!targetPolityId) return
    const targetSub = activeTab === 'departments' ? 'ministries' : 'cabinets'
    navigate(
      `${pathKeys.countryGovernment(targetPolityId)}?sub=${targetSub}`,
    )
  }

  const updateParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams)
    for (const [paramKey, paramValue] of Object.entries(updates)) {
      if (!paramValue) nextParams.delete(paramKey)
      else nextParams.set(paramKey, paramValue)
    }
    setSearchParams(nextParams, { replace: true })
  }

  const returnState: GovernmentListReturnState = {
    governmentListSearch: location.search,
  }

  const { data: modernCountries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountries()

  const polityOptions = useMemo<SearchableSelectOption[]>(() => {
    const modernOpts: SearchableSelectOption[] = [...modernCountries]
      .sort((leftItem, rightItem) =>
        leftItem.name.localeCompare(rightItem.name, 'ko'),
      )
      .map((modernItem) => ({
        value: `C:${modernItem.id}`,
        label: modernItem.flagEmoji
          ? `${modernItem.flagEmoji} ${modernItem.name}`
          : modernItem.name,
        group: '현대 국가',
        keywords: [modernItem.name, modernItem.isoCode ?? ''],
      }))
    const historicalOpts: SearchableSelectOption[] = [...historicalCountries]
      .sort((leftItem, rightItem) =>
        leftItem.name.localeCompare(rightItem.name, 'ko'),
      )
      .map((histItem) => ({
        value: `H:${histItem.id}`,
        label: `🏛️ ${histItem.name}`,
        group: '역사적 국가',
        keywords: [histItem.name, histItem.enName ?? ''],
      }))
    return [...modernOpts, ...historicalOpts]
  }, [modernCountries, historicalCountries])

  const selectedCountryId = selectedPolityToken.startsWith('C:')
    ? selectedPolityToken.slice(2)
    : undefined
  const selectedHistoricalCountryId = selectedPolityToken.startsWith('H:')
    ? selectedPolityToken.slice(2)
    : undefined

  const baseCabinetsQuery = useQuery({
    queryKey: [
      'global-cabinets',
      selectedPolityToken || 'all',
      activeAtYear ?? 'all-years',
      currentOnly ? 'current' : 'all-terms',
      linkedOnly ? 'linked' : 'all-links',
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: selectedCountryId,
        historicalCountryId: selectedHistoricalCountryId,
        includeConstituents: Boolean(selectedHistoricalCountryId),
        activeAtYear,
        currentOnly: currentOnly || undefined,
        linkedOnly: linkedOnly || undefined,
        take: selectedPolityToken ? undefined : 500,
      }),
    staleTime: 60_000,
  })

  const deptCategoriesQuery = useQuery({
    queryKey: ['admin-dept-categories'],
    queryFn: () => administrationDepartmentApi.getCategories(),
    staleTime: 5 * 60_000,
  })

  const baseDepartmentsQuery = useQuery({
    queryKey: [
      'global-departments',
      selectedPolityToken || 'all',
      activeAtYear ?? 'all-years',
      deptCategoryFilter || 'all-categories',
      deptKindFilter || 'all-kinds',
    ],
    queryFn: () => {
      if (selectedHistoricalCountryId && !deptCategoryFilter && activeAtYear == null) {
        return administrationDepartmentApi.getByHistoricalCountryId(
          selectedHistoricalCountryId,
          { includeConstituents: true },
        )
      }
      return administrationDepartmentApi.getAll({
        countryId: selectedCountryId,
        historicalCountryId: selectedHistoricalCountryId,
        categoryId: deptCategoryFilter || undefined,
        kind: deptKindFilter || undefined,
        activeAtYear,
        take: selectedPolityToken ? undefined : 500,
      })
    },
    staleTime: 60_000,
  })

  const rawCabinets = useMemo(
    () => baseCabinetsQuery.data ?? [],
    [baseCabinetsQuery.data],
  )
  const rawDepartments = useMemo(
    () => baseDepartmentsQuery.data ?? [],
    [baseDepartmentsQuery.data],
  )

  const cabinetCategoryCounts = useMemo(() => {
    const countMap = new Map<PositionCategory, number>()
    for (const cabinetItem of rawCabinets) {
      const cat = resolveCabinetCategory(cabinetItem)
      countMap.set(cat, (countMap.get(cat) ?? 0) + 1)
    }
    return countMap
  }, [rawCabinets])

  const filteredCabinets = useMemo(() => {
    const needle = queryText.trim().toLowerCase()
    const filtered = rawCabinets.filter((cabinetItem) => {
      if (
        cabinetCatFilter &&
        resolveCabinetCategory(cabinetItem) !== cabinetCatFilter
      ) {
        return false
      }
      if (!needle) return true
      const polity = resolveCabinetPolityInfo(cabinetItem)
      const headName = resolveCabinetHeadName(cabinetItem)
      const posTitle = resolveCabinetPositionTitle(cabinetItem)
      const displayTitle = resolveCabinetDisplayTitle(cabinetItem)
      const linkageLabel =
        cabinetItem.linkageGroup?.event?.title ??
        cabinetItem.linkageGroup?.label ??
        ''
      const haystack = [
        polity.polityName,
        headName,
        posTitle,
        displayTitle,
        cabinetItem.name ?? '',
        linkageLabel,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })

    return [...filtered].sort((leftCab, rightCab) => {
      const leftIso = leftCab.headTenure?.startDate ?? leftCab.startDate
      const rightIso = rightCab.headTenure?.startDate ?? rightCab.startDate
      const leftYear = extractSignedStartYearFromIso(leftIso)
      const rightYear = extractSignedStartYearFromIso(rightIso)

      if (cabinetSort === 'country') {
        const leftCountry = resolveCabinetPolityInfo(leftCab).polityName
        const rightCountry = resolveCabinetPolityInfo(rightCab).polityName
        const countryCmp = leftCountry.localeCompare(rightCountry, 'ko')
        if (countryCmp !== 0) return countryCmp
        return (rightYear ?? -99999) - (leftYear ?? -99999)
      }
      if (cabinetSort === 'name') {
        return resolveCabinetDisplayTitle(leftCab).localeCompare(
          resolveCabinetDisplayTitle(rightCab),
          'ko',
        )
      }
      if (cabinetSort === 'period_asc') {
        if (leftYear == null && rightYear == null) return 0
        if (leftYear == null) return 1
        if (rightYear == null) return -1
        return leftYear - rightYear
      }
      if (leftYear == null && rightYear == null) return 0
      if (leftYear == null) return 1
      if (rightYear == null) return -1
      return rightYear - leftYear
    })
  }, [rawCabinets, cabinetCatFilter, queryText, cabinetSort])

  const cabinetChapters = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; century: number | null; items: CabinetListItemDto[] }
    >()
    for (const cabinetItem of filteredCabinets) {
      const iso = cabinetItem.headTenure?.startDate ?? cabinetItem.startDate
      const century = getCenturyFromIso(iso ?? null)
      const chapterKey = century != null ? String(century) : UNDATED_CHAPTER
      const existing = groups.get(chapterKey)
      if (existing) {
        existing.items.push(cabinetItem)
      } else {
        groups.set(chapterKey, {
          key: chapterKey,
          century,
          items: [cabinetItem],
        })
      }
    }
    return [...groups.values()]
  }, [filteredCabinets])

  const filteredDepartments = useMemo(() => {
    const needle = queryText.trim().toLowerCase()
    const filtered = rawDepartments.filter((deptItem) => {
      if (deptKindFilter && deptItem.kind !== deptKindFilter) return false
      if (deptCategoryFilter && deptItem.categoryId !== deptCategoryFilter) {
        return false
      }
      if (!needle) return true
      const polity = resolveDepartmentPolityInfo(deptItem)
      const haystack = [
        deptItem.name,
        deptItem.nameLocal ?? '',
        deptItem.nameEn ?? '',
        deptItem.abbreviation ?? '',
        deptItem.category?.name ?? '',
        deptItem.headquarters ?? '',
        polity.polityName,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })

    return [...filtered].sort((leftDept, rightDept) => {
      if (deptSort === 'name') {
        return leftDept.name.localeCompare(rightDept.name, 'ko')
      }
      const leftYear = leftDept.established
        ? leftDept.established.era === 'BC'
          ? -leftDept.established.year
          : leftDept.established.year
        : extractSignedStartYearFromIso(leftDept.establishedDate)
      const rightYear = rightDept.established
        ? rightDept.established.era === 'BC'
          ? -rightDept.established.year
          : rightDept.established.year
        : extractSignedStartYearFromIso(rightDept.establishedDate)

      if (deptSort === 'period_asc') {
        if (leftYear == null && rightYear == null) return 0
        if (leftYear == null) return 1
        if (rightYear == null) return -1
        return leftYear - rightYear
      }
      if (deptSort === 'period_desc') {
        if (leftYear == null && rightYear == null) return 0
        if (leftYear == null) return 1
        if (rightYear == null) return -1
        return rightYear - leftYear
      }
      const leftPolity = resolveDepartmentPolityInfo(leftDept).polityName
      const rightPolity = resolveDepartmentPolityInfo(rightDept).polityName
      const polityCmp = leftPolity.localeCompare(rightPolity, 'ko')
      if (polityCmp !== 0) return polityCmp
      return leftDept.name.localeCompare(rightDept.name, 'ko')
    })
  }, [rawDepartments, deptKindFilter, deptCategoryFilter, queryText, deptSort])

  const commitYearFilter = (rawVal: string) => {
    const trimmed = rawVal.trim()
    if (!trimmed) {
      updateParams({ year: null })
      return
    }
    const parsed = Number.parseInt(trimmed, 10)
    if (Number.isFinite(parsed) && parsed !== 0) {
      updateParams({ year: String(parsed), current: null })
    }
  }

  const stepActiveYear = (delta: number) => {
    const baseYear = activeAtYear ?? 1914
    let nextYear = baseYear + delta
    if (nextYear === 0) nextYear = delta > 0 ? 1 : -1
    setYearInputDraft(String(nextYear))
    updateParams({ year: String(nextYear), current: null })
  }

  const toggleChapterCollapsed = (chapterKey: string) => {
    setCollapsedChapters((prevSet) => {
      const nextSet = new Set(prevSet)
      if (nextSet.has(chapterKey)) nextSet.delete(chapterKey)
      else nextSet.add(chapterKey)
      return nextSet
    })
  }

  const hasAnyActiveFilter = Boolean(
    queryText.trim() ||
      activeAtYear != null ||
      currentOnly ||
      linkedOnly ||
      selectedPolityToken ||
      cabinetCatFilter ||
      deptCategoryFilter ||
      deptKindFilter,
  )

  const clearAllFilters = () => {
    setYearInputDraft('')
    setSearchParams(
      activeTab === 'departments' ? { tab: 'departments' } : {},
      { replace: true },
    )
  }

  return (
    <PageShell>
      <HeaderBlock>
        <TitleRow>
          <TitleCluster>
            <EyebrowLabel>GLOBAL GOVERNMENT ATLAS</EyebrowLabel>
            <PageTitle>전 국가 정부 · 내각 카탈로그</PageTitle>
            <PageSubtitle>
              특정 국가에 들어가지 않고도 모든 국가·역사국가의 역대 내각과 중앙부처·국가기관을
              연도·분류별로 횡단 비교하고 탐색합니다.
            </PageSubtitle>
          </TitleCluster>

          <HeaderActions>
            {activeAtYear != null && (
              <CrossJumpButton
                type="button"
                onClick={() => navigate(pathKeys.headsOfState(activeAtYear))}
              >
                <FiAward size={13} />
                <span>{formatSignedYearLabel(activeAtYear)}년 수장 비교 타임라인</span>
                <FiArrowRight size={13} />
              </CrossJumpButton>
            )}
            <CrossJumpButton
              type="button"
              onClick={() => setPositionDictOpen(true)}
            >
              <FiLayers size={13} />
              <span>관직·직위 사전</span>
            </CrossJumpButton>
            <PrimaryCreateBtn
              type="button"
              onClick={() => {
                if (selectedPolityToken) {
                  navigateToCountryRegistration(selectedPolityToken)
                } else {
                  setQuickCreateOpen((prevOpen) => !prevOpen)
                }
              }}
            >
              <FiPlus size={13} />
              <span>
                {selectedPolityToken
                  ? activeTab === 'departments'
                    ? '선택 국가에 부처 등록'
                    : '선택 국가에 내각 등록'
                  : activeTab === 'departments'
                    ? '국가 선택 후 부처 등록'
                    : '국가 선택 후 내각 등록'}
              </span>
            </PrimaryCreateBtn>
          </HeaderActions>
        </TitleRow>

        {quickCreateOpen && !selectedPolityToken && (
          <QuickCreateBar>
            <QuickCreateLabel>
              {activeTab === 'departments'
                ? '중앙부처·국가기관을 등록할 국가를 선택하면 해당 국가 정부·행정 탭으로 곧바로 이동합니다:'
                : '행정부·내각을 등록할 국가를 선택하면 해당 국가 정부·행정 탭으로 곧바로 이동합니다:'}
            </QuickCreateLabel>
            <QuickCreateSelectWrap>
              <SearchableSelect
                options={polityOptions}
                value=""
                onChange={(chosenToken) => {
                  if (chosenToken) {
                    setQuickCreateOpen(false)
                    navigateToCountryRegistration(chosenToken)
                  }
                }}
                placeholder="등록할 현대·역사 국가 검색 및 선택…"
                searchPlaceholder="국가명 검색…"
                ariaLabel="등록 대상 국가 선택"
              />
            </QuickCreateSelectWrap>
            <InlineClearBtn
              type="button"
              onClick={() => setQuickCreateOpen(false)}
              aria-label="빠른 등록 닫기"
            >
              <FiX size={13} />
            </InlineClearBtn>
          </QuickCreateBar>
        )}

        <PrimaryTabBar role="tablist" aria-label="정부 카탈로그 구분">
          <PrimaryTabButton
            type="button"
            role="tab"
            aria-selected={activeTab === 'cabinets'}
            $active={activeTab === 'cabinets'}
            onClick={() => updateParams({ tab: null })}
          >
            <FiUsers size={15} />
            <span>역대 행정부 · 내각</span>
            <TabCountPill $active={activeTab === 'cabinets'}>
              {filteredCabinets.length}
            </TabCountPill>
          </PrimaryTabButton>

          <PrimaryTabButton
            type="button"
            role="tab"
            aria-selected={activeTab === 'departments'}
            $active={activeTab === 'departments'}
            onClick={() => updateParams({ tab: 'departments' })}
          >
            <FiColumns size={15} />
            <span>중앙부처 · 국가기관</span>
            <TabCountPill $active={activeTab === 'departments'}>
              {filteredDepartments.length}
            </TabCountPill>
          </PrimaryTabButton>
        </PrimaryTabBar>
      </HeaderBlock>

      <FilterDeck>
        <FilterPrimaryRow>
          <SearchBox>
            <FiSearch size={14} />
            <SearchInput
              type="search"
              value={queryText}
              onChange={(changeEvent) =>
                updateParams({ 'q': changeEvent.target.value || null })
              }
              placeholder={
                activeTab === 'cabinets'
                  ? '내각명, 수반명(티서·비스마르크·루즈벨트), 직함, 국가명 검색…'
                  : '부처·기관명(외무성·국방성·예조·Honvéd), 원어·약칭, 국가명 검색…'
              }
              aria-label="통합 검색"
            />
            {queryText && (
              <InlineClearBtn
                type="button"
                onClick={() => updateParams({ 'q': null })}
                aria-label="검색어 지우기"
              >
                <FiX size={13} />
              </InlineClearBtn>
            )}
          </SearchBox>

          <PolitySelectWrap>
            <SearchableSelect
              options={polityOptions}
              value={selectedPolityToken}
              onChange={(nextVal) => updateParams({ polity: nextVal || null })}
              placeholder="전체 현대·역사 국가"
              searchPlaceholder="국가 또는 역사적 정치체 검색…"
              ariaLabel="국가·정치체 필터"
            />
          </PolitySelectWrap>

          <YearFilterGroup>
            <FiCalendar size={13} />
            <YearStepperBtn
              type="button"
              title="이전 해 (-1년)"
              onClick={() => stepActiveYear(-1)}
            >
              <FiChevronLeft size={13} />
            </YearStepperBtn>
            <YearInput
              type="text"
              inputMode="numeric"
              value={yearInputDraft}
              onChange={(changeEvent) =>
                setYearInputDraft(changeEvent.target.value)
              }
              onBlur={() => commitYearFilter(yearInputDraft)}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key === 'Enter') {
                  commitYearFilter(yearInputDraft)
                }
              }}
              placeholder="시점 연도 (예: 1914)"
              aria-label="동시대 조회 연도 (기원전은 음수)"
            />
            <YearStepperBtn
              type="button"
              title="다음 해 (+1년)"
              onClick={() => stepActiveYear(1)}
            >
              <FiChevronRight size={13} />
            </YearStepperBtn>
            {activeAtYear != null && (
              <InlineClearBtn
                type="button"
                onClick={() => {
                  setYearInputDraft('')
                  updateParams({ year: null })
                }}
                aria-label="연도 필터 해제"
              >
                <FiX size={13} />
              </InlineClearBtn>
            )}
          </YearFilterGroup>

          {activeTab === 'cabinets' && (
            <ViewToggleGroup role="group" aria-label="보기 방식">
              <ViewToggleBtn
                type="button"
                $active={displayMode === 'ledger'}
                onClick={() => updateParams({ view: null })}
                title="원장 목록 보기"
              >
                <FiList size={14} />
                <span>원장</span>
              </ViewToggleBtn>
              <ViewToggleBtn
                type="button"
                $active={displayMode === 'cards'}
                onClick={() => updateParams({ view: 'cards' })}
                title="다국 비교 카드 보드"
              >
                <FiGrid size={14} />
                <span>비교 보드</span>
              </ViewToggleBtn>
            </ViewToggleGroup>
          )}
        </FilterPrimaryRow>

        <FilterChipRow>
          <FilterChip
            type="button"
            $active={activeAtYear == null && !currentOnly && !linkedOnly}
            onClick={() => {
              setYearInputDraft('')
              updateParams({ year: null, current: null, linked: null })
            }}
          >
            전체 시대
          </FilterChip>

          {activeTab === 'cabinets' && (
            <>
              <FilterChip
                type="button"
                $active={currentOnly}
                onClick={() => {
                  setYearInputDraft('')
                  updateParams({
                    current: currentOnly ? null : '1',
                    year: null,
                  })
                }}
              >
                🟢 현직 내각만
              </FilterChip>

              <FilterChip
                type="button"
                $active={linkedOnly}
                onClick={() =>
                  updateParams({ linked: linkedOnly ? null : '1' })
                }
              >
                <FiLink2 size={12} />
                <span>다국 사건 연결 내각</span>
              </FilterChip>
            </>
          )}

          {HISTORICAL_YEAR_PRESETS.map((presetYear) => (
            <FilterChip
              key={presetYear}
              type="button"
              $active={activeAtYear === presetYear}
              onClick={() => {
                const nextYear =
                  activeAtYear === presetYear ? null : String(presetYear)
                setYearInputDraft(nextYear ?? '')
                updateParams({ year: nextYear, current: null })
              }}
            >
              {presetYear}년 동시대
            </FilterChip>
          ))}

          <ChipDivider />

          {activeTab === 'cabinets' ? (
            <>
              {(
                ['PRESIDENT', 'PM', 'MONARCH', 'OTHER'] as PositionCategory[]
              )
                .filter((catKey) => (cabinetCategoryCounts.get(catKey) ?? 0) > 0)
                .map((catKey) => (
                  <FilterChip
                    key={catKey}
                    type="button"
                    $active={cabinetCatFilter === catKey}
                    onClick={() =>
                      updateParams({
                        cabCat: cabinetCatFilter === catKey ? null : catKey,
                      })
                    }
                  >
                    <span>{GLOBAL_CABINET_CATEGORY_LABELS[catKey]}</span>
                    <ChipCount>{cabinetCategoryCounts.get(catKey)}</ChipCount>
                  </FilterChip>
                ))}
            </>
          ) : (
            <>
              {(deptCategoriesQuery.data ?? []).map((categoryItem) => (
                <FilterChip
                  key={categoryItem.id}
                  type="button"
                  $active={deptCategoryFilter === categoryItem.id}
                  onClick={() =>
                    updateParams({
                      categoryId:
                        deptCategoryFilter === categoryItem.id
                          ? null
                          : categoryItem.id,
                    })
                  }
                >
                  {categoryItem.name}
                </FilterChip>
              ))}
              {DEPARTMENT_KIND_OPTIONS.map((kindOpt) => (
                <FilterChip
                  key={kindOpt.value}
                  type="button"
                  $active={deptKindFilter === kindOpt.value}
                  onClick={() =>
                    updateParams({
                      kind:
                        deptKindFilter === kindOpt.value ? null : kindOpt.value,
                    })
                  }
                >
                  {kindOpt.label}
                </FilterChip>
              ))}
            </>
          )}

          {hasAnyActiveFilter && (
            <ResetFiltersBtn type="button" onClick={clearAllFilters}>
              <FiX size={12} />
              <span>필터 초기화</span>
            </ResetFiltersBtn>
          )}
        </FilterChipRow>
      </FilterDeck>

      {activeTab === 'cabinets' ? (
        baseCabinetsQuery.isLoading ? (
          <StatusPanel>전 국가 내각 데이터를 불러오는 중입니다…</StatusPanel>
        ) : baseCabinetsQuery.isError ? (
          <StatusPanel>
            데이터를 불러오지 못했습니다.{' '}
            <RetryButton
              type="button"
              onClick={() => void baseCabinetsQuery.refetch()}
            >
              다시 시도
            </RetryButton>
          </StatusPanel>
        ) : filteredCabinets.length === 0 ? (
          <StatusPanel>
            조건에 일치하는 행정부·내각이 없습니다. 연도나 검색 조건을 조정해 보세요.
          </StatusPanel>
        ) : displayMode === 'cards' ? (
          <ComparisonCardsGrid>
            {filteredCabinets.map((cabinetItem) => {
              const polity = resolveCabinetPolityInfo(cabinetItem)
              const headName = resolveCabinetHeadName(cabinetItem)
              const posTitle = resolveCabinetPositionTitle(cabinetItem)
              const displayTitle = resolveCabinetDisplayTitle(cabinetItem)
              const ministerCount = resolveCabinetMinisterCount(cabinetItem)
              const periodLabel = formatIsoShortPeriod(
                cabinetItem.headTenure?.startDate ?? cabinetItem.startDate,
                cabinetItem.headTenure
                  ? cabinetItem.headTenure.endDate
                  : cabinetItem.endDate,
                !polity.isHistorical,
              )
              const avatarUrl = cabinetItem.headTenure?.person?.profileImageUrl
                ? getUploadImageUrl(
                    cabinetItem.headTenure.person.profileImageUrl,
                  )
                : null

              return (
                <ComparisonCard
                  key={cabinetItem.id}
                  to={pathKeys.government.cabinetDetail(cabinetItem.id)}
                  state={returnState}
                >
                  <CardTopMeta>
                    <PolityBadge $historical={polity.isHistorical}>
                      <span>{polity.flagEmoji ?? (polity.isHistorical ? '🏛️' : '🏳️')}</span>
                      <span>{polity.polityName}</span>
                    </PolityBadge>
                    <CardPeriodMono>{periodLabel}</CardPeriodMono>
                  </CardTopMeta>

                  <CardLeaderRow>
                    {avatarUrl ? (
                      <LeaderAvatar src={avatarUrl} alt={headName} />
                    ) : (
                      <LeaderAvatarFallback>
                        {headName.slice(0, 1)}
                      </LeaderAvatarFallback>
                    )}
                    <LeaderTextCol>
                      <CardTitle>{displayTitle}</CardTitle>
                      <CardSubline>
                        {[headName, posTitle].filter(Boolean).join(' · ')}
                      </CardSubline>
                    </LeaderTextCol>
                  </CardLeaderRow>

                  <CardFooterRow>
                    <MetaTag>
                      <FiUsers size={11} />
                      <span>
                        {ministerCount > 0
                          ? `각료 ${ministerCount}명`
                          : '수반 단독·미편성'}
                      </span>
                    </MetaTag>
                    {cabinetItem.linkageGroup && (
                      <LinkageBadge>
                        <FiLink2 size={11} />
                        <span>
                          {cabinetItem.linkageGroup.event?.title ??
                            cabinetItem.linkageGroup.label ??
                            '다국 연결'}
                        </span>
                      </LinkageBadge>
                    )}
                  </CardFooterRow>
                </ComparisonCard>
              )
            })}
          </ComparisonCardsGrid>
        ) : (
          <LedgerContainer>
            <LedgerHeaderRow $cols="150px 200px minmax(0, 1fr) 180px 110px">
              <SortHeaderBtn
                type="button"
                $active={
                  cabinetSort === 'period_desc' || cabinetSort === 'period_asc'
                }
                onClick={() =>
                  updateParams({
                    sort:
                      cabinetSort === 'period_desc'
                        ? 'period_asc'
                        : 'period_desc',
                  })
                }
              >
                재임 기간{' '}
                {cabinetSort === 'period_asc'
                  ? '↑'
                  : cabinetSort === 'period_desc'
                    ? '↓'
                    : ''}
              </SortHeaderBtn>
              <SortHeaderBtn
                type="button"
                $active={cabinetSort === 'country'}
                onClick={() => updateParams({ sort: 'country' })}
              >
                소속 국가·정치체 {cabinetSort === 'country' ? '↑' : ''}
              </SortHeaderBtn>
              <SortHeaderBtn
                type="button"
                $active={cabinetSort === 'name'}
                onClick={() => updateParams({ sort: 'name' })}
              >
                행정부 · 수반 {cabinetSort === 'name' ? '↑' : ''}
              </SortHeaderBtn>
              <span>구성 · 국제 연결</span>
              <span>국가 지면</span>
            </LedgerHeaderRow>

            {cabinetChapters.map((chapter) => {
              const isCollapsed = collapsedChapters.has(chapter.key)
              const chapterTitle =
                chapter.century != null
                  ? formatCenturyLabel(chapter.century)
                  : '연대 미상'
              const chapterSubtitle =
                chapter.century != null
                  ? `(${formatCenturyRangeSubtitle(chapter.century)})`
                  : ''

              return (
                <ChapterSection key={chapter.key}>
                  {cabinetSort !== 'country' && cabinetSort !== 'name' && (
                    <ChapterHeaderBtn
                      type="button"
                      onClick={() => toggleChapterCollapsed(chapter.key)}
                      aria-expanded={!isCollapsed}
                    >
                      <ChapterBead />
                      <ChapterTitleText>{chapterTitle}</ChapterTitleText>
                      {chapterSubtitle && (
                        <ChapterRangeText>{chapterSubtitle}</ChapterRangeText>
                      )}
                      <ChapterLeaderRule />
                      <ChapterCountText>{chapter.items.length}건</ChapterCountText>
                    </ChapterHeaderBtn>
                  )}

                  {!isCollapsed &&
                    chapter.items.map((cabinetItem) => {
                      const polity = resolveCabinetPolityInfo(cabinetItem)
                      const headName = resolveCabinetHeadName(cabinetItem)
                      const posTitle = resolveCabinetPositionTitle(cabinetItem)
                      const displayTitle =
                        resolveCabinetDisplayTitle(cabinetItem)
                      const ministerCount =
                        resolveCabinetMinisterCount(cabinetItem)
                      const periodLabel = formatIsoShortPeriod(
                        cabinetItem.headTenure?.startDate ??
                          cabinetItem.startDate,
                        cabinetItem.headTenure
                          ? cabinetItem.headTenure.endDate
                          : cabinetItem.endDate,
                        !polity.isHistorical,
                      )
                      const avatarUrl = cabinetItem.headTenure?.person
                        ?.profileImageUrl
                        ? getUploadImageUrl(
                            cabinetItem.headTenure.person.profileImageUrl,
                          )
                        : null

                      return (
                        <LedgerDataRow
                          key={cabinetItem.id}
                          $cols="150px 200px minmax(0, 1fr) 180px 110px"
                          onClick={() =>
                            navigate(
                              pathKeys.government.cabinetDetail(cabinetItem.id),
                              { state: returnState },
                            )
                          }
                        >
                          <PeriodCell>{periodLabel}</PeriodCell>

                          <PolityCell>
                            <PolityBadge $historical={polity.isHistorical}>
                              <span>
                                {polity.flagEmoji ??
                                  (polity.isHistorical ? '🏛️' : '🏳️')}
                              </span>
                              <span>{polity.polityName}</span>
                            </PolityBadge>
                          </PolityCell>

                          <MainEntityCell>
                            {avatarUrl ? (
                              <RowAvatar src={avatarUrl} alt={headName} />
                            ) : (
                              <RowAvatarFallback>
                                {headName.slice(0, 1)}
                              </RowAvatarFallback>
                            )}
                            <MainEntityTexts>
                              <RowPrimaryTitle>{displayTitle}</RowPrimaryTitle>
                              <RowSecondaryMeta>
                                {[
                                  headName !== displayTitle ? headName : null,
                                  posTitle,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </RowSecondaryMeta>
                            </MainEntityTexts>
                          </MainEntityCell>

                          <BadgesCell>
                            {ministerCount > 0 && (
                              <MetaTag>각료 {ministerCount}명</MetaTag>
                            )}
                            {cabinetItem.linkageGroup && (
                              <LinkageBadge>
                                <FiLink2 size={11} />
                                <span>
                                  {cabinetItem.linkageGroup.event?.title ??
                                    '다국 연결'}
                                </span>
                              </LinkageBadge>
                            )}
                          </BadgesCell>

                          <ActionCell
                            onClick={(clickEvent) => clickEvent.stopPropagation()}
                          >
                            {polity.countryGovernmentUrl && (
                              <CountryJumpLink to={polity.countryGovernmentUrl}>
                                <span>국가 탭</span>
                                <FiArrowRight size={12} />
                              </CountryJumpLink>
                            )}
                          </ActionCell>
                        </LedgerDataRow>
                      )
                    })}
                </ChapterSection>
              )
            })}
          </LedgerContainer>
        )
      ) : baseDepartmentsQuery.isLoading ? (
        <StatusPanel>전 국가 중앙부처·국가기관을 불러오는 중입니다…</StatusPanel>
      ) : baseDepartmentsQuery.isError ? (
        <StatusPanel>
          기관 데이터를 불러오지 못했습니다.{' '}
          <RetryButton
            type="button"
            onClick={() => void baseDepartmentsQuery.refetch()}
          >
            다시 시도
          </RetryButton>
        </StatusPanel>
      ) : filteredDepartments.length === 0 ? (
        <StatusPanel>
          조건에 일치하는 부처·국가기관이 없습니다. 분류나 연도 필터를 조정해 보세요.
        </StatusPanel>
      ) : (
        <LedgerContainer>
          <LedgerHeaderRow $cols="150px 200px minmax(0, 1fr) 180px 160px">
            <SortHeaderBtn
              type="button"
              $active={
                deptSort === 'period_asc' || deptSort === 'period_desc'
              }
              onClick={() =>
                updateParams({
                  deptSort:
                    deptSort === 'period_asc' ? 'period_desc' : 'period_asc',
                })
              }
            >
              설립·존속 기간{' '}
              {deptSort === 'period_asc'
                ? '↑'
                : deptSort === 'period_desc'
                  ? '↓'
                  : ''}
            </SortHeaderBtn>
            <SortHeaderBtn
              type="button"
              $active={deptSort === 'country'}
              onClick={() => updateParams({ deptSort: 'country' })}
            >
              소속 국가·정치체 {deptSort === 'country' ? '↑' : ''}
            </SortHeaderBtn>
            <SortHeaderBtn
              type="button"
              $active={deptSort === 'name'}
              onClick={() => updateParams({ deptSort: 'name' })}
            >
              기관명 · 원어/약칭 {deptSort === 'name' ? '↑' : ''}
            </SortHeaderBtn>
            <span>공통 분류 · 유형</span>
            <span>계보 · 산하</span>
          </LedgerHeaderRow>

          {filteredDepartments.map((deptItem) => {
            const polity = resolveDepartmentPolityInfo(deptItem)
            const periodLabel = formatIsoShortPeriod(
              deptItem.establishedDate,
              deptItem.abolishedDate,
              !polity.isHistorical && !deptItem.abolished,
            )
            const subNames = [
              deptItem.abbreviation,
              deptItem.nameLocal,
              deptItem.nameEn,
            ]
              .filter(Boolean)
              .join(' · ')
            const lineageCount =
              deptItem.predecessors.length +
              deptItem.successors.length +
              (deptItem.militaryUnitSuccessors?.length ?? 0)

            return (
              <LedgerDataRow
                key={deptItem.id}
                $cols="150px 200px minmax(0, 1fr) 180px 160px"
                onClick={() =>
                  navigate(pathKeys.government.departmentDetail(deptItem.id), {
                    state: returnState,
                  })
                }
              >
                <PeriodCell>{periodLabel}</PeriodCell>

                <PolityCell>
                  <PolityBadge $historical={polity.isHistorical}>
                    <span>
                      {polity.flagEmoji ?? (polity.isHistorical ? '🏛️' : '🏳️')}
                    </span>
                    <span>{polity.polityName}</span>
                  </PolityBadge>
                </PolityCell>

                <MainEntityCell>
                  <MainEntityTexts>
                    <RowPrimaryTitle>{deptItem.name}</RowPrimaryTitle>
                    {subNames && <RowSecondaryMeta>{subNames}</RowSecondaryMeta>}
                  </MainEntityTexts>
                </MainEntityCell>

                <BadgesCell>
                  {deptItem.category && (
                    <CategoryTag>{deptItem.category.name}</CategoryTag>
                  )}
                  <MetaTag>
                    {DEPARTMENT_KIND_LABEL[deptItem.kind] ?? deptItem.kind}
                  </MetaTag>
                </BadgesCell>

                <BadgesCell>
                  {deptItem.parent && (
                    <MetaTag>상위: {deptItem.parent.name}</MetaTag>
                  )}
                  {lineageCount > 0 && (
                    <MetaTag>
                      <FiLayers size={11} />
                      <span>계보 {lineageCount}</span>
                    </MetaTag>
                  )}
                  {deptItem.militaryUnits.length > 0 && (
                    <MetaTag>군부대 {deptItem.militaryUnits.length}</MetaTag>
                  )}
                </BadgesCell>
              </LedgerDataRow>
            )
          })}
        </LedgerContainer>
      )}

      <SidePanel
        isOpen={positionDictOpen}
        onClose={() => setPositionDictOpen(false)}
        title="관직 · 직위 표준 사전"
        subtitle="전 국가 공통 직위(대통령·총리·장관·군주 등) 및 국가별 전용 관직 적용 범위를 통합 관리합니다"
        width="min(960px, 100vw)"
      >
        <div style={{ padding: '20px 24px 36px' }}>
          <PositionDefinitionsSection />
        </div>
      </SidePanel>
    </PageShell>
  )
}

export default GovernmentCatalogPage

/* ─── Styled Components ─────────────────────────────────────────────────── */

const PageShell = styled.div`
  max-width: 1320px;
  margin: 0 auto;
  padding: 28px 28px 64px;

  @media (max-width: 768px) {
    padding: 18px 14px 48px;
  }
`

const HeaderBlock = styled.header`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
`

const TitleRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const TitleCluster = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const EyebrowLabel = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PageSubtitle = styled.p`
  margin: 2px 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CrossJumpButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.14s ease;

  &:hover {
    opacity: 0.88;
  }
`

const PrimaryCreateBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.14s ease;

  &:hover {
    opacity: 0.9;
  }
`

const QuickCreateBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
`

const QuickCreateLabel = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const QuickCreateSelectWrap = styled.div`
  flex: 0 1 280px;
  min-width: 220px;
`

const PrimaryTabBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const PrimaryTabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  font-size: 13.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;
  margin-bottom: -1px;
  transition: color 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const TabCountPill = styled.span<{ $active: boolean }>`
  ${DIGIT_DISPLAY}
  padding: 1px 7px;
  border-radius: ${RADIUS.PILL};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : ledgerChipFill(theme.mode)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

const FilterDeck = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 18px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const FilterPrimaryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const SearchBox = styled.div`
  flex: 1 1 280px;
  min-width: 220px;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PolitySelectWrap = styled.div`
  flex: 0 1 250px;
  min-width: 210px;
`

const YearFilterGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const YearStepperBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerChipFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const YearInput = styled.input`
  ${DIGIT_DISPLAY}
  width: 122px;
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  text-align: center;

  &::placeholder {
    font-family: inherit;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const InlineClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ViewToggleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
`

const ViewToggleBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`

const FilterChipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const FilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 27px;
  padding: 0 10px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const ChipCount = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 10.5px;
  opacity: 0.8;
`

const ChipDivider = styled.span`
  width: 1px;
  height: 16px;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  margin: 0 2px;
`

const ResetFiltersBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 27px;
  padding: 0 9px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const LedgerContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  overflow: hidden;
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const LedgerHeaderRow = styled.div<{ $cols: string }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols};
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 900px) {
    display: none;
  }
`

const SortHeaderBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ChapterSection = styled.div`
  display: flex;
  flex-direction: column;
`

const ChapterHeaderBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerRowWash(theme.mode)};
  cursor: pointer;
  text-align: left;
`

const ChapterBead = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  flex-shrink: 0;
`

const ChapterTitleText = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ChapterRangeText = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChapterLeaderRule = styled.span`
  flex: 1;
  height: 1px;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const ChapterCountText = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LedgerDataRow = styled.div<{ $cols: string }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols};
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  cursor: pointer;
  transition: background 0.12s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 6px;
  }
`

const PeriodCell = styled.div`
  ${DIGIT_DISPLAY}
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PolityCell = styled.div`
  min-width: 0;
`

const PolityBadge = styled.span<{ $historical: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 3px 8px;
  border-radius: ${RADIUS.SM};
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.14)'
        : 'rgba(245, 158, 11, 0.1)'
      : ledgerChipFill(theme.mode)};
  color: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : theme.colors.text.primary};
`

const MainEntityCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const RowAvatar = styled.img`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const RowAvatarFallback = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const MainEntityTexts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const RowPrimaryTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RowSecondaryMeta = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const BadgesCell = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  min-width: 0;
`

const MetaTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CategoryTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const LinkageBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 170px;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.16)'
      : 'rgba(16, 185, 129, 0.1)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
`

const ActionCell = styled.div`
  display: flex;
  justify-content: flex-end;
`

const CountryJumpLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const ComparisonCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 12px;
`

const ComparisonCard = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  text-decoration: none;
  transition:
    border-color 0.14s ease,
    transform 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    transform: translateY(-1px);
  }
`

const CardTopMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const CardPeriodMono = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CardLeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
`

const LeaderAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const LeaderAvatarFallback = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const LeaderTextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const CardTitle = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardSubline = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardFooterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const StatusPanel = styled.div`
  padding: 48px 20px;
  text-align: center;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RetryButton = styled.button`
  ${css`
    margin-left: 8px;
    padding: 5px 10px;
    border-radius: ${RADIUS.XS};
    border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: transparent;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  `}
`
