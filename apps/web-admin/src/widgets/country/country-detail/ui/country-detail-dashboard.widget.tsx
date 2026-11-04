import type { ReactNode } from 'react'
import { useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import {
  useBondYields,
  useDemographicIndicators,
  useDevelopmentIndicators,
  useEconomicIndicators,
} from '@/entities/country/api.indicators'
import { useCountryRecords } from '@/entities/country/api.records'
import { useExportImports } from '@/entities/country/api.trade'
import { toPyramidRows } from '@/entities/country/model/population-pyramid'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { usePoliticalSystems } from '@/entities/political-system/api'
import { useTradeRecords } from '@/entities/trade/api'
import { companyApi } from '@/shared/api/company'
import type { DemographicIndicator } from '@/shared/api/country-indicators'
import { compareByCountryStart } from '@/shared/lib/country-period'
import { pathKeys } from '@/shared/router'

import { formatRelativeTime } from '../lib/relative-time'
import type { CompletenessField } from '../model/use-country-dashboard-stats'
import { useCountryDashboardStats } from '../model/use-country-dashboard-stats'
import {
  CountryDataManagerModal,
  type MainTab,
} from './country-data-manager/country-data-manager-modal'
import {
  IconArchive,
  IconBriefcase,
  IconCalendar,
  IconChart,
  IconCity,
  IconClock,
  IconHistory,
  IconLandmark,
  IconMilitary,
  IconPercent,
  IconRefresh,
  IconScroll,
  IconTrade,
  IconUserCheck,
  IconUsers,
  IconVote,
} from './country-detail-dashboard.icons'
import * as S from './country-detail-dashboard.styles'
import { ActivityFeed } from './dashboard-panels/activity-feed'
import {
  RecordLedger,
  type RecordLedgerRow,
} from './dashboard-panels/record-ledger'
import { CompareLine } from './dashboard-panels/compare-line'
import { CurrentCabinetPanel } from './dashboard-panels/current-cabinet-panel'
import { ChartSkeleton } from './dashboard-panels/chart-skeleton'
import {
  DashboardGuideBanner,
  type DiagnosticHintItem,
  type GuideStepItem,
} from './dashboard-panels/dashboard-guide-banner'
import { SectionEmpty } from './dashboard-panels/section-empty'
import { SectionHelpPopover } from './dashboard-panels/section-help-popover'
import { ElectionCard } from './dashboard-panels/election-card'
import {
  formatAreaValue,
  formatPopulation,
  parsePopulation,
} from './dashboard-panels/format'
import { BondYieldSection } from './dashboard-panels/bond-yield-section'
import { formatMetricValue } from './dashboard-panels/indicator-trend-chart'
import { IndicatorTrendsSection } from './dashboard-panels/indicator-trends-section'
import { CountryCompaniesSection } from './dashboard-panels/country-companies-section'
import { EventCalendarPanel } from './dashboard-panels/event-calendar-panel'
import { EventCenturyStrip } from './dashboard-panels/event-century-strip'
import { CompanyRegisterModal } from '@/widgets/company-form'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'
import { LineageFlow } from './dashboard-panels/lineage-flow'
import { PoliticalSystemPanel } from './dashboard-panels/political-system-panel'
import { PopulationPyramidSection } from './dashboard-panels/population-pyramid-section'
import { SectionNav } from './dashboard-panels/section-nav'
import { TradeSection } from './dashboard-panels/trade-section'

/** 대시보드 계보 요약에 한 번에 보여줄 과거 국가 수 */
const LINEAGE_SUMMARY_LIMIT = 12

export interface CountryDetailDashboardProps {
  country: UnifiedCountry
  onEdit?: () => void
  /**
   * 국가 히어로(국기 썸네일·국가명). 대시보드 탭에서만 뜨므로 셸 좌측 칼럼 안에서
   * 렌더한다 — 그래야 우측 관리 레일이 썸네일 줄부터 시작한다.
   */
  header?: ReactNode
}

export function CountryDetailDashboard({
  country,
  onEdit,
  header,
}: CountryDetailDashboardProps) {
  const navigate = useNavigate()
  const stats = useCountryDashboardStats(country)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const isModern = country.type === 'modern'

  const { data: economicIndicators = [], isLoading: isEconomicLoading } =
    useEconomicIndicators(isModern ? country.id : undefined)
  const { data: demographicIndicators = [], isLoading: isDemographicLoading } =
    useDemographicIndicators(isModern ? country.id : undefined)
  const { data: developmentIndicators = [], isLoading: isDevelopmentLoading } =
    useDevelopmentIndicators(isModern ? country.id : undefined)
  const { data: bondYields = [], isLoading: isBondsLoading } = useBondYields(
    isModern ? country.id : undefined,
  )
  const { data: exportImports = [], isLoading: isModernTradeLoading } =
    useExportImports(isModern ? country.id : undefined)
  const {
    data: historicalTradeRecords = [],
    isLoading: isHistoricalTradeLoading,
  } = useTradeRecords(isModern ? {} : { historicalCountryId: country.id })
  const { data: allCompanies = [], isLoading: isCompaniesLoading } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => companyApi.getAll(),
    staleTime: 60_000,
  })
  const politicalSystemsQuery = usePoliticalSystems({
    countryId: isModern ? country.id : undefined,
    historicalCountryId: isModern ? undefined : country.id,
  })
  const { data: countryRecords = [] } = useCountryRecords(
    isModern ? country.id : undefined,
  )

  const [dataManagerTab, setDataManagerTab] = useState<MainTab | null>(null)
  const [expandEmptyIndicators, setExpandEmptyIndicators] = useState(false)
  const [expandNotes, setExpandNotes] = useState(false)
  const [companyRegisterOpen, setCompanyRegisterOpen] = useState(false)
  const [indicatorDomainFilter, setIndicatorDomainFilter] = useState<
    'ALL' | 'trends' | 'pyramid' | 'bonds' | 'trade' | 'companies'
  >('ALL')

  const latestDemographicPop = useMemo(() => {
    const sorted = [...demographicIndicators]
      .filter((row) => parsePopulation(row.population) != null)
      .sort((first, second) => second.year - first.year)
    return sorted[0] ?? null
  }, [demographicIndicators])

  const latestEconomicGdp = useMemo(() => {
    const sorted = [...economicIndicators]
      .filter((row) => row.gdp != null && Number.isFinite(row.gdp))
      .sort((first, second) => second.year - first.year)
    return sorted[0] ?? null
  }, [economicIndicators])

  const latestEconomicGdpPerCapita = useMemo(() => {
    const sorted = [...economicIndicators]
      .filter(
        (row) => row.gdpPerCapita != null && Number.isFinite(row.gdpPerCapita),
      )
      .sort((first, second) => second.year - first.year)
    return sorted[0] ?? null
  }, [economicIndicators])

  const latestDevelopmentHdi = useMemo(() => {
    const sorted = [...developmentIndicators]
      .filter((row) => row.hdi != null && Number.isFinite(Number(row.hdi)))
      .sort((first, second) => second.year - first.year)
    return sorted[0] ?? null
  }, [developmentIndicators])

  const latestMacroYear = useMemo(() => {
    const years = [
      ...economicIndicators.map((row) => row.year),
      ...demographicIndicators.map((row) => row.year),
      ...developmentIndicators.map((row) => row.year),
      ...bondYields.map((row) => row.year),
    ].filter(Number.isFinite)
    return years.length > 0 ? Math.max(...years) : null
  }, [
    economicIndicators,
    demographicIndicators,
    developmentIndicators,
    bondYields,
  ])

  const directPopNum = parsePopulation(country.population)
  const popNum = directPopNum ?? parsePopulation(latestDemographicPop?.population)
  const popYearNote =
    directPopNum == null && latestDemographicPop
      ? `${latestDemographicPop.year}년 지표`
      : null

  const areaNum = country.areaSqKm != null ? Number(country.areaSqKm) : null
  const densityText =
    popNum != null &&
    areaNum != null &&
    areaNum > 0 &&
    Number.isFinite(popNum) &&
    Number.isFinite(areaNum)
      ? `${(popNum / areaNum).toFixed(1)} 명/km²`
      : null
  const capitalText = country.capital ? String(country.capital).trim() : ''

  const hasAnyFact =
    popNum != null ||
    country.areaSqKm != null ||
    !!densityText ||
    !!capitalText ||
    latestEconomicGdp != null ||
    latestEconomicGdpPerCapita != null ||
    latestDevelopmentHdi != null

  const goEvents = () => navigate(pathKeys.countryEvents(country.id))
  /** 연표 막대 → 사건 탭의 그 세기 묶음 */
  const goEventsCentury = (century: number) =>
    navigate(pathKeys.countryEvents(country.id, undefined, century))
  const goGovernment = (
    subTab?: 'heads' | 'cabinets' | 'ministries' | 'system' | 'military',
    cabinetId?: string | null,
  ) => {
    const params = new URLSearchParams()
    if (typeof subTab === 'string' && subTab) params.set('sub', subTab)
    if (typeof cabinetId === 'string' && cabinetId) params.set('cabinetId', cabinetId)
    const qs = params.toString()
    navigate(`${pathKeys.countryGovernment(country.id)}${qs ? `?${qs}` : ''}`)
  }
  const goRegions = () => navigate(pathKeys.countryRegions(country.id))
  // 인물은 이제 국가 지면 안에 탭이 있다 — 대시보드에서 밖으로 내보내지 않는다
  const goPersons = () => navigate(pathKeys.countryPersons(country.id))
  const goElections = () => navigate(pathKeys.countryElections(country.id))
  const goTreaty = () => navigate(pathKeys.countryTreaty(country.id))
  const goLaws = () => navigate(pathKeys.countryLaws(country.id))
  const goEthnicity = () => navigate(pathKeys.countryEthnicity(country.id))
  const goHistorical = () => navigate(pathKeys.countryHistorical(country.id))
  /* 행정조직의 '정체' 탭을 바로 연다 — countryGovernment로 보내면 역대 수반에 떨어진다 */
  const goPoliticalSystem = () =>
    navigate(pathKeys.countryPoliticalSystem(country.id))

  /** 기록 완성도 칩 → 그 축을 채우는 탭으로 */
  const goFillTarget = (field: CompletenessField) => {
    switch (field.target) {
      case 'government':
        return goGovernment(field.governmentSubTab)
      case 'persons':
        return goPersons()
      case 'events':
        return goEvents()
      case 'elections':
        return goElections()
      case 'historical':
        return goHistorical()
      case 'regions':
        return goRegions()
      case 'treaty':
        return goTreaty()
      case 'laws':
        return goLaws()
      case 'ethnicity':
        return goEthnicity()
    }
  }

  const totalActivity = stats.recentActivity.length
  // 서버가 linkKind로 전신을 구분해주면 대시보드 요약엔 직계 전신선만 기본으로 보이되,
  // 구성국·역사유산 등이 함께 있을 때는 '직계 전신 / 전체 연결' 필터 토글을 제공한다.
  const lineageAll = country.historicalCountries ?? []
  const lineagePredecessors = lineageAll.filter(
    (hc) => hc.linkKind === 'PREDECESSOR',
  )
  const hasLineageFilterToggle =
    lineagePredecessors.length > 0 &&
    lineagePredecessors.length < lineageAll.length
  const [lineageFilter, setLineageFilter] = useState<'predecessor' | 'all'>(
    'predecessor',
  )
  const lineage =
    hasLineageFilterToggle && lineageFilter === 'predecessor'
      ? lineagePredecessors
      : lineagePredecessors.length > 0 && !hasLineageFilterToggle
        ? lineagePredecessors
        : lineageAll

  /**
   * 계보 요약 상한 — linkKind(PREDECESSOR)가 채워지지 않은 국가에서는 전체가 그대로 나온다.
   * 독일이 47개라 대시보드 첫 화면의 절반을 계보가 먹었다.
   *
   * 자를 위치는 의도적이어야 한다. 계보는 시간순으로 이어지는 흐름이라 **정렬 전 배열을 자르면
   * 임의의 조각**이 나온다(실제로 그랬다). 먼저 존속 시작순으로 세우고 **가장 최근 전신 쪽**을
   * 남긴다 — 이 국가가 무엇에서 곧바로 이어졌는지가 요약에서 제일 궁금한 것이라서다.
   * 접힌 앞부분은 목록 위에 '이전 N개'로 드러낸다.
   */
  const lineageSorted = useMemo(
    () => [...lineage].sort(compareByCountryStart),
    [lineage],
  )
  const [lineageExpanded, setLineageExpanded] = useState(false)
  /*
   * 캘린더에서 누른 사건 — 페이지로 튕기지 않고 모달로 먼저 보여준다. 대시보드는
   * '이 나라를 훑는' 자리라 사건 하나 때문에 지면을 떠나면 보던 맥락(달·연도 커서)이
   * 통째로 날아간다. 깊게 들어갈 사건만 모달 안 '사건 상세로 이동'으로 넘어간다.
   */
  const [previewEventId, setPreviewEventId] = useState<string | null>(null)
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null)
  const lineageVisible = lineageExpanded
    ? lineageSorted
    : lineageSorted.slice(-LINEAGE_SUMMARY_LIMIT)
  const lineageHidden = lineageSorted.length - lineageVisible.length

  // 기록 완성도는 여러 쿼리를 모수로 삼는다 — 하나라도 로딩 중이면 "비어 있다"고 말하지 않는다
  const completenessLoading =
    stats.loading.persons ||
    stats.loading.events ||
    stats.loading.tenures ||
    stats.loading.cabinets ||
    stats.loading.elections ||
    stats.loading.administration ||
    stats.loading.cities ||
    stats.loading.treaties ||
    stats.loading.laws ||
    stats.loading.ethnicity

  /**
   * 기록 축 정의 — 값이 있는 축은 카드로, 0인 축은 아래 한 줄 칩으로 갈린다.
   * 로딩 중에는 '비어 있다'고 단정하지 않고 카드 쪽에 남긴다(스켈레톤이 그려진다).
   */
  const recordAxes: RecordLedgerRow[] = [
    {
      key: 'person',
      label: '인물',
      unit: '명',
      value: stats.personCount,
      delta: stats.deltaCounts.person,
      isLoading: stats.loading.persons,
      icon: <IconUserCheck />,
      onClick: goPersons,
    },
    {
      key: 'event',
      label: '사건',
      unit: '건',
      value: stats.eventCount,
      delta: stats.deltaCounts.event,
      isLoading: stats.loading.events,
      icon: <IconCalendar />,
      onClick: goEvents,
    },
    {
      key: 'administration',
      label: '행정조직',
      unit: '건',
      value: stats.administrationCount,
      delta: stats.deltaCounts.administration,
      isLoading: stats.loading.administration,
      icon: <IconLandmark />,
      onClick: () => goGovernment(),
    },
    {
      key: 'city',
      label: '행정구역',
      unit: '개',
      value: stats.cityCount,
      delta: stats.deltaCounts.city,
      isLoading: stats.loading.cities,
      icon: <IconCity />,
      onClick: goRegions,
    },
    {
      key: 'election',
      label: '선거',
      unit: '건',
      value: stats.electionCount,
      delta: 0,
      isLoading: stats.loading.elections,
      icon: <IconVote />,
      onClick: goElections,
    },
    {
      key: 'historical',
      label: '과거 국가',
      unit: '개',
      value: stats.historicalCountryCount,
      delta: 0,
      isLoading: false,
      icon: <IconHistory />,
      onClick: goHistorical,
    },
    {
      key: 'treaty',
      label: '조약',
      unit: '건',
      value: stats.treatyCount,
      delta: 0,
      isLoading: stats.loading.treaties,
      icon: <IconScroll />,
      onClick: goTreaty,
    },
    {
      key: 'laws',
      label: '법령',
      unit: '건',
      value: stats.lawCount,
      delta: 0,
      isLoading: stats.loading.laws,
      icon: <IconScroll />,
      onClick: goLaws,
    },
    {
      key: 'ethnicity',
      label: '민족',
      unit: '개',
      value: stats.ethnicityCount,
      delta: 0,
      isLoading: stats.loading.ethnicity,
      icon: <IconUsers />,
      onClick: goEthnicity,
    },
    {
      key: 'military',
      label: '군대',
      unit: '개',
      value: stats.militaryCount,
      delta: 0,
      isLoading: stats.loading.military,
      icon: <IconMilitary />,
      onClick: () => goGovernment('military'),
    },
  ]
  const totalRegistered = recordAxes.reduce((sum, axis) => sum + axis.value, 0)
  /* 행정부 묶음 — 규모 줄과 함께 아래 지면에서 한 번 쓴다 */
  const governmentSection = (
    <CurrentCabinetPanel
      countryId={country.id}
      countryName={country.name}
      countryIsoCode={country.isoCode}
      onOpen={(cabinetId, isFallbackHead) =>
        goGovernment(isFallbackHead ? 'heads' : 'cabinets', cabinetId)
      }
      onOpenElections={goElections}
      onSelectPerson={(personId) => setPreviewPersonId(personId)}
    >
      {/* 위 '이 정권을 낳은 선거'와 같은 선거면 카드를 그리지 않는다 */}
      {(linkedElectionId) => (
        <ElectionCard
          next={stats.nextElection}
          recent={stats.recentElection}
          isLoading={stats.loading.elections}
          onOpen={goElections}
          hideElectionId={linkedElectionId}
        />
      )}
    </CurrentCabinetPanel>
  )

  const missingCoreFactCount =
    (popNum == null ? 1 : 0) +
    (country.areaSqKm == null ? 1 : 0) +
    (!capitalText ? 1 : 0) +
    (isModern && latestEconomicGdp?.gdp == null ? 1 : 0)

  /* 무컨테이너 헤어라인 국가 규모 스펙 바 — 입력된 제원과 미입력 제원을 한눈에 비교하고 보완 동선을 연결 */
  const factBar = (
    <S.FactBar aria-label="국가 기본 제원 및 규모">
      <S.FactSpecGrid>
        <S.Fact $missing={popNum == null}>
          <S.FactLabel>인구</S.FactLabel>
          {popNum != null ? (
            <>
              <S.FactValue>
                {formatPopulation(popNum)}
                <S.FactUnit>명</S.FactUnit>
              </S.FactValue>
              {popYearNote ? (
                <S.FactSubNote>{popYearNote}</S.FactSubNote>
              ) : (
                <CompareLine
                  comparison={stats.continentComparison}
                  metric="population"
                />
              )}
            </>
          ) : (
            <>
              <S.FactValue $missing>미등록</S.FactValue>
              <S.FactSubNote>기본 프로필 또는 인구 지표 미입력</S.FactSubNote>
            </>
          )}
        </S.Fact>

        <S.Fact $missing={country.areaSqKm == null}>
          <S.FactLabel>면적</S.FactLabel>
          {country.areaSqKm != null ? (
            <>
              <S.FactValue>
                {formatAreaValue(country.areaSqKm)}
                <S.FactUnit>km²</S.FactUnit>
              </S.FactValue>
              <CompareLine
                comparison={stats.continentComparison}
                metric="area"
              />
            </>
          ) : (
            <>
              <S.FactValue $missing>미등록</S.FactValue>
              <S.FactSubNote>영토 면적(km²) 미입력</S.FactSubNote>
            </>
          )}
        </S.Fact>

        <S.Fact $missing={!densityText}>
          <S.FactLabel>인구 밀도</S.FactLabel>
          {densityText ? (
            <>
              <S.FactValue>{densityText}</S.FactValue>
              <S.FactSubNote>인구 ÷ 면적 자동 산출</S.FactSubNote>
            </>
          ) : (
            <>
              <S.FactValue $missing>—</S.FactValue>
              <S.FactSubNote>인구·면적 입력 시 자동 산출</S.FactSubNote>
            </>
          )}
        </S.Fact>

        <S.Fact $missing={!capitalText}>
          <S.FactLabel>수도</S.FactLabel>
          {capitalText ? (
            <>
              <S.FactValue>{capitalText}</S.FactValue>
              <S.FactSubNote>공식 수도</S.FactSubNote>
            </>
          ) : (
            <>
              <S.FactValue $missing>미등록</S.FactValue>
              <S.FactSubNote>수도 명칭 미입력</S.FactSubNote>
            </>
          )}
        </S.Fact>

        {(isModern || latestEconomicGdp?.gdp != null) && (
          <S.Fact $missing={latestEconomicGdp?.gdp == null}>
            <S.FactLabel>명목 GDP</S.FactLabel>
            {latestEconomicGdp?.gdp != null ? (
              <>
                <S.FactValue>
                  {formatMetricValue(latestEconomicGdp.gdp, '$')}
                </S.FactValue>
                <S.FactSubNote>
                  {latestEconomicGdp.year}년 기준
                  {latestEconomicGdp.gdpGrowthRate != null
                    ? ` · 성장률 ${Number(latestEconomicGdp.gdpGrowthRate) >= 0 ? '+' : ''}${Number(latestEconomicGdp.gdpGrowthRate).toFixed(1)}%`
                    : ''}
                </S.FactSubNote>
              </>
            ) : (
              <>
                <S.FactValue $missing>미등록</S.FactValue>
                <S.FactSubNote>연도별 경제 지표 미입력</S.FactSubNote>
              </>
            )}
          </S.Fact>
        )}

        {(isModern ||
          latestEconomicGdpPerCapita?.gdpPerCapita != null ||
          latestDevelopmentHdi?.hdi != null) && (
          <S.Fact
            $missing={
              latestEconomicGdpPerCapita?.gdpPerCapita == null &&
              latestDevelopmentHdi?.hdi == null
            }
          >
            <S.FactLabel>1인당 GDP · HDI</S.FactLabel>
            {latestEconomicGdpPerCapita?.gdpPerCapita != null ? (
              <>
                <S.FactValue>
                  {formatMetricValue(
                    latestEconomicGdpPerCapita.gdpPerCapita,
                    '$',
                  )}
                </S.FactValue>
                <S.FactSubNote>
                  {latestEconomicGdpPerCapita.year}년 기준
                  {latestDevelopmentHdi?.hdi != null
                    ? ` · HDI ${Number(latestDevelopmentHdi.hdi).toFixed(3)}`
                    : ' · HDI 미입력'}
                </S.FactSubNote>
              </>
            ) : latestDevelopmentHdi?.hdi != null ? (
              <>
                <S.FactValue>
                  HDI {Number(latestDevelopmentHdi.hdi).toFixed(3)}
                </S.FactValue>
                <S.FactSubNote>
                  {latestDevelopmentHdi.year}년 인간개발지수 · 1인당 GDP 미입력
                </S.FactSubNote>
              </>
            ) : (
              <>
                <S.FactValue $missing>미등록</S.FactValue>
                <S.FactSubNote>1인당 소득 · 인간개발지수 미입력</S.FactSubNote>
              </>
            )}
          </S.Fact>
        )}
      </S.FactSpecGrid>

      {missingCoreFactCount > 0 && (onEdit || isModern) && (
        <S.FactEmptyRow aria-label="국가 기본 제원 보완 안내">
          <S.FactEmptyText>
            {hasAnyFact
              ? `핵심 제원 중 ${missingCoreFactCount}개 항목이 비어 있습니다. 누락된 제원을 입력하면 인구 밀도와 대륙 내 순위가 자동 계산됩니다.`
              : '인구·면적·수도·GDP 등 국가 기본 제원이 아직 등록되지 않았습니다.'}
          </S.FactEmptyText>
          <S.FactEmptyActions>
            {onEdit && (
              <S.FactEmptyAction type="button" onClick={onEdit}>
                {hasAnyFact ? '+ 기본 제원 보완' : '+ 기본 제원 입력'}
              </S.FactEmptyAction>
            )}
            {isModern && (
              <S.FactEmptyAction
                type="button"
                onClick={() => setDataManagerTab('indicators')}
              >
                + 연도별 지표 등록
              </S.FactEmptyAction>
            )}
          </S.FactEmptyActions>
        </S.FactEmptyRow>
      )}
      {country.description?.trim() && (
        <S.FactDescriptionBar>
          <S.FactDescriptionLabel>국가 개요</S.FactDescriptionLabel>
          <S.FactDescriptionText>{country.description.trim()}</S.FactDescriptionText>
          {onEdit && (
            <S.FactDescriptionEditBtn type="button" onClick={onEdit}>
              수정
            </S.FactDescriptionEditBtn>
          )}
        </S.FactDescriptionBar>
      )}
    </S.FactBar>
  )

  const hasActivitySection = stats.loading.activity || totalActivity > 0

  const linkedHistoricalIds = useMemo(
    () =>
      isModern
        ? (country.historicalCountries ?? []).map((item) => item.id)
        : [],
    [isModern, country.historicalCountries],
  )

  const countryCompanies = useMemo(() => {
    const histSet = new Set(linkedHistoricalIds)
    return allCompanies.filter((company) => {
      if (isModern) {
        if (company.countryId === country.id) return true
        if (company.historicalCountryId && histSet.has(company.historicalCountryId)) {
          return true
        }
        return false
      }
      return company.historicalCountryId === country.id
    })
  }, [allCompanies, isModern, country.id, linkedHistoricalIds])

  const countryCompanyCount = countryCompanies.length

  const pyramidYears = useMemo(() => {
    return (demographicIndicators as DemographicIndicator[])
      .map((indicator) => ({
        year: indicator.year,
        rows: toPyramidRows(indicator),
      }))
      .filter((entry) => entry.rows.length > 0)
      .sort((left, right) => left.year - right.year)
  }, [demographicIndicators])

  const hasPyramidData = pyramidYears.length > 0

  const hasTrendIndicators =
    economicIndicators.length > 0 ||
    demographicIndicators.length > 0 ||
    developmentIndicators.length > 0

  const hasBondsData = bondYields.length > 0
  const tradeRecords = isModern ? exportImports : historicalTradeRecords
  const isTradeLoading = isModern
    ? isModernTradeLoading
    : isHistoricalTradeLoading
  const hasTradeData = tradeRecords.length > 0

  const isTrendsLoading =
    isEconomicLoading || isDemographicLoading || isDevelopmentLoading

  const showTrendsPanel =
    isModern &&
    (indicatorDomainFilter === 'ALL' || indicatorDomainFilter === 'trends') &&
    (expandEmptyIndicators || isTrendsLoading || hasTrendIndicators)
  const showPyramidPanel =
    isModern &&
    (indicatorDomainFilter === 'ALL' || indicatorDomainFilter === 'pyramid') &&
    (expandEmptyIndicators || isDemographicLoading || hasPyramidData)
  const showBondsPanel =
    isModern &&
    (indicatorDomainFilter === 'ALL' || indicatorDomainFilter === 'bonds') &&
    (expandEmptyIndicators || isBondsLoading || hasBondsData)
  const showTradePanel =
    (indicatorDomainFilter === 'ALL' || indicatorDomainFilter === 'trade') &&
    (expandEmptyIndicators || isTradeLoading || hasTradeData)
  const showCompaniesPanel =
    (indicatorDomainFilter === 'ALL' || indicatorDomainFilter === 'companies') &&
    (expandEmptyIndicators || isCompaniesLoading || countryCompanyCount > 0)

  const hasVisibleIndicatorPanels =
    showTrendsPanel ||
    showPyramidPanel ||
    showBondsPanel ||
    showTradePanel ||
    showCompaniesPanel

  const indicatorHubSpecs = useMemo(() => {
    const items: Array<{
      key: 'trends' | 'pyramid' | 'bonds' | 'trade' | 'companies'
      icon: ReactNode
      title: string
      filled: boolean
      statusLabel: string
      scope: string
      actionLabel: string
      onAction: () => void
      tabLabel: string
      onOpenTab: () => void
    }> = []

    if (isModern) {
      // 1. 경제 · 인구 · 사회 지표 추이
      const econSorted = [...economicIndicators].sort(
        (left, right) => right.year - left.year,
      )
      const demoSorted = [...demographicIndicators].sort(
        (left, right) => right.year - left.year,
      )
      const devSorted = [...developmentIndicators].sort(
        (left, right) => right.year - left.year,
      )
      const trendYears = [
        ...econSorted.map((row) => row.year),
        ...demoSorted.map((row) => row.year),
        ...devSorted.map((row) => row.year),
      ].filter(Number.isFinite)
      const latestTrendYear =
        trendYears.length > 0 ? Math.max(...trendYears) : null
      const earliestTrendYear =
        trendYears.length > 0 ? Math.min(...trendYears) : null

      const trendParts: string[] = []
      if (econSorted[0]?.gdp != null) {
        trendParts.push(
          `GDP ${formatMetricValue(Number(econSorted[0].gdp), '$')}`,
        )
      }
      if (econSorted[0]?.gdpGrowthRate != null) {
        trendParts.push(
          `성장률 ${formatMetricValue(Number(econSorted[0].gdpGrowthRate), '%')}`,
        )
      }
      if (econSorted[0]?.gdpPerCapita != null) {
        trendParts.push(
          `1인당 ${formatMetricValue(Number(econSorted[0].gdpPerCapita), '$')}`,
        )
      }
      if (demoSorted[0]?.fertilityRate != null) {
        trendParts.push(
          `출산율 ${Number(demoSorted[0].fertilityRate).toFixed(2)}`,
        )
      }
      if (devSorted[0]?.hdi != null && trendParts.length < 4) {
        trendParts.push(`HDI ${Number(devSorted[0].hdi).toFixed(3)}`)
      }

      items.push({
        key: 'trends',
        icon: <IconChart />,
        title: '경제 · 인구 · 사회 지표 추이',
        filled: hasTrendIndicators,
        statusLabel: hasTrendIndicators
          ? earliestTrendYear &&
            latestTrendYear &&
            earliestTrendYear !== latestTrendYear
            ? `${earliestTrendYear}–${latestTrendYear}년`
            : `${latestTrendYear ?? ''}년 등록`
          : '미등록',
        scope:
          hasTrendIndicators && trendParts.length > 0
            ? trendParts.join(' · ')
            : 'GDP · 1인당 GDP · 물가 · 실업률 · 인구 · 출산율 · 기대수명 · HDI 연도별 시계열',
        actionLabel: hasTrendIndicators ? '지표 관리' : '+ 지표 등록',
        onAction: () => setDataManagerTab('indicators'),
        tabLabel: '통계 탭',
        onOpenTab: () =>
          navigate(pathKeys.countryStatistics(country.id, 'indicators')),
      })

      // 2. 인구 피라미드
      const latestPyr =
        pyramidYears.length > 0 ? pyramidYears[pyramidYears.length - 1] : null
      const latestPyrTotal = latestPyr
        ? latestPyr.rows.reduce((sum, row) => sum + row.total, 0)
        : 0

      items.push({
        key: 'pyramid',
        icon: <IconUsers />,
        title: '인구 피라미드',
        filled: hasPyramidData,
        statusLabel: hasPyramidData
          ? `${pyramidYears.length}개 연도 · ${latestPyr?.year}년`
          : '미등록',
        scope:
          hasPyramidData && latestPyr
            ? `${latestPyr.year}년 연령별 총인구 ${latestPyrTotal.toLocaleString('ko-KR')}명 · 9개 연령대 남·여 구조`
            : '연령대별 남·여 인구 분포 · 유소년·생산연령·고령 비중 · 성비 · 노령화지수',
        actionLabel: hasPyramidData ? '피라미드 관리' : '+ 피라미드 등록',
        onAction: () => setDataManagerTab('pyramid'),
        tabLabel: '피라미드 탭',
        onOpenTab: () =>
          navigate(pathKeys.countryStatistics(country.id, 'pyramid')),
      })

      // 3. 국채 수익률 곡선
      const bondYearSet = new Set(bondYields.map((bond) => bond.year))
      const bondMatSet = new Set(bondYields.map((bond) => bond.maturity))
      const latestBondYr =
        bondYearSet.size > 0 ? Math.max(...bondYearSet) : null
      const latest10Y = bondYields.find(
        (bond) => bond.year === latestBondYr && bond.maturity === 'Y10',
      )

      items.push({
        key: 'bonds',
        icon: <IconPercent />,
        title: '국채 수익률 곡선',
        filled: hasBondsData,
        statusLabel: hasBondsData
          ? `${bondYearSet.size}개 연도 · 만기 ${bondMatSet.size}종`
          : '미등록',
        scope: hasBondsData
          ? [
              latestBondYr ? `${latestBondYr}년 기준` : null,
              latest10Y
                ? `10년물 ${Number(latest10Y.yieldRate).toFixed(2)}%`
                : null,
              `만기 ${bondMatSet.size}종 수익률 곡선`,
            ]
              .filter(Boolean)
              .join(' · ')
          : '만기별(1M~30Y) 국채 금리 추이 · 10Y-2Y 장단기 금리차(스프레드) 및 역전 감지',
        actionLabel: hasBondsData ? '금리 관리' : '+ 금리 등록',
        onAction: () => setDataManagerTab('bonds'),
        tabLabel: '국채 탭',
        onOpenTab: () =>
          navigate(pathKeys.countryStatistics(country.id, 'bonds')),
      })
    }

    // 4. 수출입 · 교역 구조 (현대·역사 국가 공통)
    const tradeSorted = [...tradeRecords].sort(
      (left, right) =>
        Number(right.signedYear ?? right.year) -
        Number(left.signedYear ?? left.year),
    )
    const latestTr = tradeSorted[0]

    items.push({
      key: 'trade',
      icon: <IconTrade />,
      title: '수출입 · 교역 구조',
      filled: hasTradeData,
      statusLabel: hasTradeData
        ? `${tradeRecords.length}개 연도 · ${latestTr?.year}년`
        : '미등록',
      scope:
        hasTradeData && latestTr
          ? [
              `${latestTr.year}년`,
              latestTr.exportValue != null
                ? `수출 ${Number(latestTr.exportValue).toLocaleString('ko-KR')}`
                : null,
              latestTr.importValue != null
                ? `수입 ${Number(latestTr.importValue).toLocaleString('ko-KR')}`
                : null,
              latestTr.currencyCode,
            ]
              .filter(Boolean)
              .join(' · ')
          : '연도별 수출·수입 총액 · 무역수지 흑자·적자 · 주요 교역 상대국 및 품목 비중',
      actionLabel: hasTradeData ? '교역 관리' : '+ 교역 등록',
      onAction: () => {
        if (isModern) setDataManagerTab('trade')
        else navigate(pathKeys.countryTrade(country.id))
      },
      tabLabel: '교역 탭',
      onOpenTab: () => navigate(pathKeys.countryTrade(country.id)),
    })

    // 5. 주요 기업 (현대·역사 국가 공통)
    const activeCompCount = countryCompanies.filter(
      (company) =>
        !company.dissolvedAt &&
        (!company.status || company.status === 'ACTIVE'),
    ).length
    const endedCompCount = countryCompanyCount - activeCompCount
    const previewCompNames = countryCompanies
      .slice(0, 3)
      .map((company) => company.name)
      .join(', ')

    items.push({
      key: 'companies',
      icon: <IconBriefcase />,
      title: '주요 기업',
      filled: countryCompanyCount > 0,
      statusLabel:
        countryCompanyCount > 0 ? `${countryCompanyCount}개 기업` : '미등록',
      scope:
        countryCompanyCount > 0
          ? [
              `활동 ${activeCompCount}`,
              endedCompCount > 0 ? `종료 ${endedCompCount}` : null,
              previewCompNames
                ? `${previewCompNames}${countryCompanyCount > 3 ? ` 외 ${countryCompanyCount - 3}개` : ''}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')
          : '본사 소재 기업 · 산업 분야 · 티커 · 설립·해산 연도 · 창업자 및 대표 인물 연결',
      actionLabel: countryCompanyCount > 0 ? '+ 기업 추가' : '+ 기업 등록',
      onAction: () => setCompanyRegisterOpen(true),
      tabLabel: '기업 탭',
      onOpenTab: () => navigate(pathKeys.countryCompanies(country.id)),
    })

    return items
  }, [
    isModern,
    economicIndicators,
    demographicIndicators,
    developmentIndicators,
    hasTrendIndicators,
    pyramidYears,
    hasPyramidData,
    bondYields,
    hasBondsData,
    tradeRecords,
    hasTradeData,
    countryCompanies,
    countryCompanyCount,
    navigate,
    country.id,
  ])

  const filledIndicatorSpecs = useMemo(
    () => indicatorHubSpecs.filter((spec) => spec.filled),
    [indicatorHubSpecs],
  )
  const emptyIndicatorCount =
    indicatorHubSpecs.length - filledIndicatorSpecs.length

  const politicalSystemCount = (politicalSystemsQuery.data ?? []).length

  /* 4단계 온보딩 구축 가이드 계산 */
  const guideSteps = useMemo<GuideStepItem[]>(() => {
    const profileCount =
      (popNum != null ? 1 : 0) +
      (country.areaSqKm != null ? 1 : 0) +
      (capitalText ? 1 : 0)
    const step1Status: GuideStepItem['status'] =
      profileCount >= 2 ? 'completed' : profileCount === 1 ? 'partial' : 'empty'

    const hasSystem = politicalSystemCount > 0
    const hasGovernance =
      stats.currentHeads.length > 0 ||
      stats.currentCabinet != null ||
      stats.administrationCount > 0
    const step2Status: GuideStepItem['status'] =
      hasSystem && hasGovernance
        ? 'completed'
        : hasSystem || hasGovernance
          ? 'partial'
          : 'empty'

    const historyAxisCount =
      (lineage.length > 0 ? 1 : 0) +
      (stats.eventCount > 0 ? 1 : 0) +
      (stats.personCount > 0 ? 1 : 0)
    const step3Status: GuideStepItem['status'] =
      historyAxisCount >= 2
        ? 'completed'
        : historyAxisCount === 1
          ? 'partial'
          : 'empty'

    const economyLawCount =
      (hasTrendIndicators ? 1 : 0) +
      (hasTradeData ? 1 : 0) +
      (countryCompanyCount > 0 ? 1 : 0) +
      (stats.treatyCount + stats.lawCount > 0 ? 1 : 0)
    const step4Status: GuideStepItem['status'] =
      economyLawCount >= 2
        ? 'completed'
        : economyLawCount === 1
          ? 'partial'
          : 'empty'

    return [
      {
        key: 'profile',
        stepNumber: 1,
        title: '기본 프로필 · 규모',
        description:
          '인구·면적·수도 등 기본 제원을 입력해 국가 규모 바와 대륙 내 순위를 계산합니다.',
        status: step1Status,
        statusLabel:
          step1Status === 'completed'
            ? '입력 완료'
            : step1Status === 'partial'
              ? '일부 입력'
              : '미입력',
        actionLabel: onEdit ? '기본 정보 입력' : '지표 입력',
        onAction: () => {
          if (onEdit) onEdit()
          else setDataManagerTab('indicators')
        },
      },
      {
        key: 'governance',
        stepNumber: 2,
        title: '정체 · 행정부 구성',
        description:
          '헌법 정체(대통령제·내각제)와 중앙부처 편제, 역대 수반·내각 각료를 등록합니다.',
        status: step2Status,
        statusLabel:
          step2Status === 'completed'
            ? '구성 완료'
            : step2Status === 'partial'
              ? '일부 등록'
              : '미등록',
        actionLabel: !hasSystem ? '정체 등록' : '행정부 관리',
        onAction: () => {
          if (!hasSystem) goPoliticalSystem()
          else goGovernment()
        },
      },
      {
        key: 'history',
        stepNumber: 3,
        title: '계보 · 사건 · 인물',
        description:
          '전신 과거 국가를 연결하고 주요 역사 사건과 인물을 축적해 타임라인을 완성합니다.',
        status: step3Status,
        statusLabel:
          step3Status === 'completed'
            ? `${stats.eventCount + stats.personCount}건 등록`
            : step3Status === 'partial'
              ? '일부 등록'
              : '미등록',
        actionLabel:
          lineage.length === 0
            ? '과거 국가 연결'
            : stats.eventCount === 0
              ? '사건 등록'
              : '인물 등록',
        onAction: () => {
          if (lineage.length === 0) goHistorical()
          else if (stats.eventCount === 0) goEvents()
          else goPersons()
        },
      },
      {
        key: 'economy',
        stepNumber: 4,
        title: '경제 · 교역 · 법제 심화',
        description:
          '연도별 거시경제 지표, 인구 피라미드, 수출입 교역, 주요 기업과 법령·조약을 보완합니다.',
        status: step4Status,
        statusLabel:
          step4Status === 'completed'
            ? '심화 완료'
            : step4Status === 'partial'
              ? '일부 등록'
              : '미등록',
        actionLabel: '경제·통계 관리',
        onAction: () => setDataManagerTab('indicators'),
      },
    ]
  }, [
    popNum,
    country.areaSqKm,
    capitalText,
    politicalSystemCount,
    stats.currentHeads.length,
    stats.currentCabinet,
    stats.administrationCount,
    stats.eventCount,
    stats.personCount,
    stats.treatyCount,
    stats.lawCount,
    lineage.length,
    hasTrendIndicators,
    hasTradeData,
    countryCompanyCount,
    onEdit,
  ])

  /* 데이터 정합성 및 보완 자동 진단 힌트 */
  const diagnosticHints = useMemo<DiagnosticHintItem[]>(() => {
    const hints: DiagnosticHintItem[] = []

    if (popNum != null && country.areaSqKm == null && onEdit) {
      hints.push({
        key: 'missing-area',
        tone: 'info',
        message:
          '인구는 등록되어 있으나 면적이 비어 있어 인구 밀도와 대륙 내 면적 순위가 계산되지 않고 있습니다.',
        actionLabel: '+ 면적 입력',
        onAction: onEdit,
      })
    } else if (popNum == null && country.areaSqKm != null) {
      hints.push({
        key: 'missing-pop',
        tone: 'info',
        message:
          '면적은 등록되어 있으나 인구가 비어 있어 인구 밀도가 계산되지 않고 있습니다.',
        actionLabel: '+ 인구 입력',
        onAction: () => {
          if (onEdit) onEdit()
          else setDataManagerTab('indicators')
        },
      })
    }

    if (
      !politicalSystemsQuery.isLoading &&
      politicalSystemCount === 0 &&
      (stats.currentHeads.length > 0 || stats.currentCabinet != null)
    ) {
      hints.push({
        key: 'missing-polity',
        tone: 'info',
        message:
          '수반·내각은 등록되어 있으나 헌법 정체(대통령제·의원내각제 등)가 아직 비어 있습니다.',
        actionLabel: '정체 탭 열기',
        onAction: goPoliticalSystem,
      })
    }

    const distinctIndicatorYears = new Set([
      ...economicIndicators.map((row) => row.year),
      ...demographicIndicators.map((row) => row.year),
      ...developmentIndicators.map((row) => row.year),
    ]).size

    if (distinctIndicatorYears === 1) {
      hints.push({
        key: 'single-indicator-year',
        tone: 'info',
        message:
          '현재 연도별 경제·인구 지표가 1개 연도만 등록되어 있습니다. 비교 연도를 1개 더 추가하면 전년 대비 증감과 추이선이 완성됩니다.',
        actionLabel: '+ 비교 연도 추가',
        onAction: () => setDataManagerTab('indicators'),
      })
    }

    return hints
  }, [
    popNum,
    country.areaSqKm,
    onEdit,
    politicalSystemsQuery.isLoading,
    politicalSystemCount,
    stats.currentHeads.length,
    stats.currentCabinet,
    economicIndicators,
    demographicIndicators,
    developmentIndicators,
  ])

  return (
    <>
      {header}
      <S.DashboardRoot ref={rootRef}>
      {/*
        구성 원칙 — 위에서부터 "이 나라가 어떤 나라인가"로 답한다.
        예전 배치는 데이터 완성도·등록 현황(관리 지표)이 첫 화면을 차지하고, 이 국가에서
        가장 특징적인 자산인 **계보(연결된 과거국가)** 가 2,500px 아래 맨 끝에 있었다.
        순서를 뒤집는다: 규모 → 계보 → 지금의 통치 → 기록 입구 → 활동/보완.
      */}

      {/*
        1. 규모 — 인구·면적·밀도·수도.

        ISO는 규모 지표가 아니라 식별자라 히어로 이름 옆 칩으로 옮겼다.
        값이 없는 칸은 아예 세우지 않는다 — 실DB에서 `capital`은 71개국 전부 비어 있어
        '수도 —'가 모든 국가에서 죽은 칸이었다. 빈 칸을 크게 보여주는 건 정보가 아니다.
      */}
      {factBar}

      {/* 국가 데이터 구축 4단계 가이드 & 정합성 자동 진단 배너 */}
      <DashboardGuideBanner
        countryId={country.id}
        steps={guideSteps}
        diagnosticHints={diagnosticHints}
        isLoading={completenessLoading}
      />

      {/*
        목차 — 장이 열 개 넘게 한 칼럼으로 이어져 5,000px가 넘는다. 규모 줄 바로 아래에서
        붙어 따라오며 지금 장을 표시한다(장 목록은 지면의 <section>에서 읽는다).
      */}
      <SectionNav rootRef={rootRef} />

      {/* 2. 계보 — 이 국가의 시간축. 예전엔 맨 아래에 있어 사실상 보이지 않았다. */}
      {lineageAll.length === 0 ? (
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon>
              <IconHistory />
            </S.SectionTitleIcon>
            <S.SectionTitleText>계보</S.SectionTitleText>
            <SectionHelpPopover sectionKey="lineage" />
          </S.SectionTitleRow>
          <SectionEmpty
            text="이 국가로 이어지는 과거 국가가 아직 없습니다. 연결하면 언제부터 언제까지 어떤 나라였는지 시간축이 그려집니다."
            hint="전신·후신 국가를 연결하면 세기별 계보 흐름도가 자동 생성됩니다"
            actionLabel="과거 국가 연결"
            onAction={goHistorical}
          />
        </S.Section>
      ) : (
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon>
              <IconHistory />
            </S.SectionTitleIcon>
            <S.SectionTitleText>계보</S.SectionTitleText>
            <SectionHelpPopover sectionKey="lineage" />
            <S.SectionCountChip>과거 국가 {lineage.length}개</S.SectionCountChip>
            <S.SectionLink type="button" onClick={goHistorical}>
              전체 보기
            </S.SectionLink>
          </S.SectionTitleRow>
          <LineageFlow
            historicalCountries={lineageVisible}
            maxPerColumn={lineageExpanded ? undefined : 3}
            onSelect={(id) => navigate(pathKeys.countryDetail(id))}
            modernEndpoint={
              isModern
                ? {
                    id: country.id,
                    name: country.name,
                    flagEmoji: country.flagEmoji,
                    thumbnailUrl: country.thumbnailUrl,
                    isoCode: country.isoCode,
                  }
                : undefined
            }
            toolbarLeft={
              <>
                {hasLineageFilterToggle && (
                  <S.LineageFilterGroup
                    role="group"
                    aria-label="계보 연결 범위 필터"
                  >
                    <S.LineageFilterPill
                      type="button"
                      $active={lineageFilter === 'predecessor'}
                      onClick={() => setLineageFilter('predecessor')}
                    >
                      직계 전신 {lineagePredecessors.length}
                    </S.LineageFilterPill>
                    <S.LineageFilterPill
                      type="button"
                      $active={lineageFilter === 'all'}
                      onClick={() => setLineageFilter('all')}
                    >
                      전체 연결 {lineageAll.length}
                    </S.LineageFilterPill>
                  </S.LineageFilterGroup>
                )}
                {(lineageHidden > 0 ||
                  (lineageExpanded &&
                    lineageSorted.length > LINEAGE_SUMMARY_LIMIT)) && (
                  <S.LineageMoreRow>
                    <S.SectionLink
                      type="button"
                      onClick={() => setLineageExpanded((prev) => !prev)}
                    >
                      {lineageExpanded
                        ? '최근만 보기'
                        : `← 이전 ${lineageHidden}개 펼치기`}
                    </S.SectionLink>
                  </S.LineageMoreRow>
                )}
              </>
            }
          />
        </S.Section>
      )}

      {/*
       * 3. 행정부 — 정권 카드로 고르고 그 정권의 수반·각료를 본다.
       */}
      <PoliticalSystemPanel
        countryId={isModern ? country.id : undefined}
        historicalCountryId={isModern ? undefined : country.id}
        countryName={country.name}
        onOpenAll={goPoliticalSystem}
      />

      {governmentSection}

      {/*
        4. 기록 · 완성도 — 10대 아카이빙 축의 완성도 헤드라인 요약과 2열 헤어라인 비교 원장을 통합 표시한다.
      */}
      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon>
            <IconArchive />
          </S.SectionTitleIcon>
          <S.SectionTitleText>기록 · 완성도</S.SectionTitleText>
          <SectionHelpPopover sectionKey="records" />
          <S.SectionCountChip>
            총 {totalRegistered.toLocaleString('ko-KR')}건
          </S.SectionCountChip>
          {isModern && (
            <S.SectionAction
              type="button"
              onClick={() => setDataManagerTab('records')}
            >
              {countryRecords.length > 0
                ? `국가 메모 (${countryRecords.length})`
                : '+ 국가 메모'}
            </S.SectionAction>
          )}
        </S.SectionTitleRow>

        <S.RecordGrid>
          <S.RecordGridBody>
            <RecordLedger
              rows={recordAxes}
              completeness={{
                filled: stats.completeness.filled,
                total: stats.completeness.total,
                missing: stats.completeness.missing,
                isLoading: completenessLoading,
              }}
              onFillMissing={goFillTarget}
            />
            {stats.eventCenturyCounts.length > 0 && (
              <S.EventTimelineBlock>
                <S.EventTimelineLabel>
                  사건 연표 — 세기별 사건 분포
                </S.EventTimelineLabel>
                <EventCenturyStrip
                  counts={stats.eventCenturyCounts}
                  onOpen={goEventsCentury}
                />
              </S.EventTimelineBlock>
            )}
          </S.RecordGridBody>
        </S.RecordGrid>
        {countryRecords.length > 0 && (
          <S.CountryNotesBlock>
            <S.CountryNotesHeader>
              <S.EventTimelineLabel>
                국가 메모 · 기록 ({countryRecords.length}건)
              </S.EventTimelineLabel>
              <S.CountryNotesActions>
                {countryRecords.length > 6 && (
                  <S.SectionLink
                    type="button"
                    onClick={() => setExpandNotes((prev) => !prev)}
                  >
                    {expandNotes
                      ? '메모 접기'
                      : `메모 더보기 (+${countryRecords.length - 6}건)`}
                  </S.SectionLink>
                )}
                <S.SectionLink
                  type="button"
                  onClick={() => setDataManagerTab('records')}
                >
                  + 메모 추가 · 관리
                </S.SectionLink>
              </S.CountryNotesActions>
            </S.CountryNotesHeader>
            <S.CountryNotesList>
              {(expandNotes ? countryRecords : countryRecords.slice(0, 6)).map(
                (rec) => (
                  <S.CountryNoteItem key={rec.id}>
                    <S.CountryNoteDate>
                      {new Date(rec.recordedAt).toLocaleDateString('ko-KR')}
                    </S.CountryNoteDate>
                    <S.CountryNoteText>{rec.description}</S.CountryNoteText>
                  </S.CountryNoteItem>
                ),
              )}
            </S.CountryNotesList>
          </S.CountryNotesBlock>
        )}
      </S.Section>

      {/*
        4-1. 사건 캘린더 — 날짜가 있는 사건이 실제로 존재할 때만 노출한다.
      */}
      {stats.loading.events ? (
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon>
              <IconCalendar />
            </S.SectionTitleIcon>
            <S.SectionTitleText>사건 캘린더</S.SectionTitleText>
            <SectionHelpPopover sectionKey="calendar" />
          </S.SectionTitleRow>
          <ChartSkeleton variant="calendar" />
        </S.Section>
      ) : stats.calendarEvents.length > 0 ? (
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon>
              <IconCalendar />
            </S.SectionTitleIcon>
            <S.SectionTitleText>사건 캘린더</S.SectionTitleText>
            <SectionHelpPopover sectionKey="calendar" />
            <S.SectionLink type="button" onClick={goEvents}>
              연대표 전체 보기
            </S.SectionLink>
          </S.SectionTitleRow>
          <EventCalendarPanel
            key={country.id}
            events={stats.calendarEvents}
            onSelectEvent={setPreviewEventId}
          />
        </S.Section>
      ) : null}

      {/*
       * 4-2. 최근 활동 — 활동 내역이 실제로 있을 때만 깔끔하게 단독 노출한다.
       */}
      {hasActivitySection && (
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon>
              <IconClock />
            </S.SectionTitleIcon>
            <S.SectionTitleText>최근 활동</S.SectionTitleText>
            <SectionHelpPopover sectionKey="activity" />
            {totalActivity > 0 && (
              <S.SectionCountChip>{totalActivity}건</S.SectionCountChip>
            )}
            {stats.lastUpdatedAt && (
              <S.LastUpdatedHint>
                <IconRefresh /> {formatRelativeTime(stats.lastUpdatedAt)} 갱신
              </S.LastUpdatedHint>
            )}
          </S.SectionTitleRow>
          <S.FeedPanel>
            <ActivityFeed
              items={stats.recentActivity}
              isLoading={stats.loading.activity}
              onPersonClick={(personId) => setPreviewPersonId(personId)}
              onEventClick={(eventId) => setPreviewEventId(eventId)}
              onNavigateDomain={(kind, refId, personId) => {
                if (kind === 'tenure') {
                  if (personId) setPreviewPersonId(personId)
                  else goGovernment('heads')
                  return
                }
                if (kind === 'political-system') {
                  goPoliticalSystem()
                  return
                }
                if (kind === 'cabinet') {
                  goGovernment('cabinets', refId)
                  return
                }
                if (kind === 'department') {
                  goGovernment('ministries')
                  return
                }
                if (kind === 'election') {
                  goElections()
                  return
                }
                if (kind === 'law') {
                  goLaws()
                  return
                }
                if (kind === 'treaty') {
                  goTreaty()
                  return
                }
                if (kind === 'city') {
                  goRegions()
                }
              }}
            />
          </S.FeedPanel>
        </S.Section>
      )}

      {/*
        5. 경제 · 인구 · 교역 · 기업 지표 (역사 국가는 교역 · 기업 지표) —
        상단 2열 헤어라인 종합 원장에서 지표 축의 등록 상태와 최신 핵심 수치(KPI)를 한눈에 비교하고,
        하단 차트 그리드에서는 데이터가 등록된 분야의 전용 시각화를 거시→미시 순으로 펼친다.
      */}
      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon>
            <IconChart />
          </S.SectionTitleIcon>
          <S.SectionTitleText>
            {isModern
              ? '경제 · 인구 · 교역 · 기업 지표'
              : '교역 · 기업 지표'}
          </S.SectionTitleText>
          <SectionHelpPopover sectionKey="indicatorsHub" />
          <S.SectionCountChip>
            {filledIndicatorSpecs.length === 0
              ? `${indicatorHubSpecs.length}개 분야 미등록`
              : `${filledIndicatorSpecs.length}/${indicatorHubSpecs.length}개 분야 등록`}
          </S.SectionCountChip>
          <S.SectionHeaderActions>
            {isModern && (
              <S.SectionAction
                type="button"
                onClick={() => setDataManagerTab('indicators')}
              >
                통합 지표 관리
              </S.SectionAction>
            )}
            {emptyIndicatorCount > 0 && (
              <S.SectionLink
                type="button"
                onClick={() => setExpandEmptyIndicators((prev) => !prev)}
              >
                {expandEmptyIndicators
                  ? '빈 섹션 접기'
                  : `빈 섹션 펼치기 (+${emptyIndicatorCount})`}
              </S.SectionLink>
            )}
          </S.SectionHeaderActions>
        </S.SectionTitleRow>

        <S.SectionHeadlineStrip aria-label="지표 도메인 종합 요약">
          <S.SectionHeadlineCell>
            <S.SectionHeadlineLabel>등록 도메인 현황</S.SectionHeadlineLabel>
            <S.SectionHeadlineValue $muted={filledIndicatorSpecs.length === 0}>
              {filledIndicatorSpecs.length}/{indicatorHubSpecs.length}
              <S.SectionHeadlineUnit>개 분야</S.SectionHeadlineUnit>
            </S.SectionHeadlineValue>
            <S.SectionHeadlineSub>
              {emptyIndicatorCount === 0
                ? '모든 지표 도메인 등록 완료'
                : `미등록 ${emptyIndicatorCount}개 분야 · 아래 원장에서 추가`}
            </S.SectionHeadlineSub>
          </S.SectionHeadlineCell>

          <S.SectionHeadlineCell>
            <S.SectionHeadlineLabel>
              {isModern ? '거시 · 금리 · 인구 기준' : '교역 기록 연수'}
            </S.SectionHeadlineLabel>
            {isModern ? (
              <>
                <S.SectionHeadlineValue $muted={latestMacroYear == null}>
                  {latestMacroYear != null ? (
                    <>
                      {latestMacroYear}
                      <S.SectionHeadlineUnit>년 최신</S.SectionHeadlineUnit>
                    </>
                  ) : (
                    '미등록'
                  )}
                </S.SectionHeadlineValue>
                <S.SectionHeadlineSub>
                  {latestMacroYear != null
                    ? `거시 ${economicIndicators.length} · 인구 ${demographicIndicators.length} · 국채 ${new Set(bondYields.map((bond) => bond.year)).size}개년`
                    : '경제·인구·국채 시계열 미입력'}
                </S.SectionHeadlineSub>
              </>
            ) : (
              <>
                <S.SectionHeadlineValue $muted={!hasTradeData}>
                  {hasTradeData ? (
                    <>
                      {new Set(tradeRecords.map((row) => row.year)).size}
                      <S.SectionHeadlineUnit>개년</S.SectionHeadlineUnit>
                    </>
                  ) : (
                    '미등록'
                  )}
                </S.SectionHeadlineValue>
                <S.SectionHeadlineSub>
                  {hasTradeData
                    ? '연도별 수출·수입 시계열 기록'
                    : '교역 연도 기록 미입력'}
                </S.SectionHeadlineSub>
              </>
            )}
          </S.SectionHeadlineCell>

          <S.SectionHeadlineCell>
            <S.SectionHeadlineLabel>교역 기록 범위</S.SectionHeadlineLabel>
            <S.SectionHeadlineValue $muted={!hasTradeData}>
              {hasTradeData ? (
                <>
                  {tradeRecords.length.toLocaleString('ko-KR')}
                  <S.SectionHeadlineUnit>건</S.SectionHeadlineUnit>
                </>
              ) : (
                '미등록'
              )}
            </S.SectionHeadlineValue>
            <S.SectionHeadlineSub>
              {hasTradeData
                ? `최신 ${[...tradeRecords].sort((left, right) => Number(right.signedYear ?? right.year) - Number(left.signedYear ?? left.year))[0]?.year}년 교역 수지·품목`
                : '수출·수입 총액 및 주요 교역품 미입력'}
            </S.SectionHeadlineSub>
          </S.SectionHeadlineCell>

          <S.SectionHeadlineCell>
            <S.SectionHeadlineLabel>등록 기업 · 상단</S.SectionHeadlineLabel>
            <S.SectionHeadlineValue $muted={countryCompanyCount === 0}>
              {countryCompanyCount > 0 ? (
                <>
                  {countryCompanyCount.toLocaleString('ko-KR')}
                  <S.SectionHeadlineUnit>개사</S.SectionHeadlineUnit>
                </>
              ) : (
                '미등록'
              )}
            </S.SectionHeadlineValue>
            <S.SectionHeadlineSub>
              {countryCompanyCount > 0
                ? `활동 ${countryCompanies.filter((company) => !company.dissolvedAt && (!company.status || company.status === 'ACTIVE')).length}개사 · 본사·소속 기업`
                : '주요 기업·상단·금융기관 미등록'}
            </S.SectionHeadlineSub>
          </S.SectionHeadlineCell>
        </S.SectionHeadlineStrip>

        <S.IndicatorsLedgerWrap>
          <S.IndicatorsLedgerList>
            {indicatorHubSpecs.map((spec) => (
              <S.IndicatorsLedgerItem key={spec.key}>
                <S.IndicatorsLedgerRow>
                  <S.IndicatorsLedgerIcon $filled={spec.filled}>
                    {spec.icon}
                  </S.IndicatorsLedgerIcon>
                  <S.IndicatorsLedgerBody>
                    <S.IndicatorsLedgerTitleRow>
                      <S.IndicatorsLedgerTitle>
                        {spec.title}
                      </S.IndicatorsLedgerTitle>
                      <S.IndicatorsLedgerStatus $filled={spec.filled}>
                        {spec.statusLabel}
                      </S.IndicatorsLedgerStatus>
                    </S.IndicatorsLedgerTitleRow>
                    <S.IndicatorsLedgerScope $filled={spec.filled}>
                      {spec.scope}
                    </S.IndicatorsLedgerScope>
                  </S.IndicatorsLedgerBody>
                  <S.IndicatorsLedgerActions>
                    {spec.filled && (
                      <S.IndicatorsLedgerFocusBtn
                        type="button"
                        $active={indicatorDomainFilter === spec.key}
                        onClick={() =>
                          setIndicatorDomainFilter((prev) =>
                            prev === spec.key ? 'ALL' : spec.key,
                          )
                        }
                      >
                        {indicatorDomainFilter === spec.key
                          ? '전체 보기'
                          : '차트 집중'}
                      </S.IndicatorsLedgerFocusBtn>
                    )}
                    <S.IndicatorsLedgerActionBtn
                      type="button"
                      $filled={spec.filled}
                      onClick={spec.onAction}
                    >
                      {spec.actionLabel}
                    </S.IndicatorsLedgerActionBtn>
                    <S.IndicatorsLedgerTabLink
                      type="button"
                      onClick={spec.onOpenTab}
                    >
                      {spec.tabLabel}
                    </S.IndicatorsLedgerTabLink>
                  </S.IndicatorsLedgerActions>
                </S.IndicatorsLedgerRow>
              </S.IndicatorsLedgerItem>
            ))}
          </S.IndicatorsLedgerList>

          {(filledIndicatorSpecs.length > 1 || expandEmptyIndicators) && (
            <S.IndicatorsFilterBar
              role="tablist"
              aria-label="지표 차트 표시 분야 선택"
            >
              <S.IndicatorsFilterChip
                type="button"
                role="tab"
                aria-selected={indicatorDomainFilter === 'ALL'}
                $active={indicatorDomainFilter === 'ALL'}
                onClick={() => setIndicatorDomainFilter('ALL')}
              >
                전체 차트 (
                {expandEmptyIndicators
                  ? indicatorHubSpecs.length
                  : filledIndicatorSpecs.length}
                )
              </S.IndicatorsFilterChip>
              {indicatorHubSpecs
                .filter((spec) => spec.filled || expandEmptyIndicators)
                .map((spec) => (
                  <S.IndicatorsFilterChip
                    key={spec.key}
                    type="button"
                    role="tab"
                    aria-selected={indicatorDomainFilter === spec.key}
                    $active={indicatorDomainFilter === spec.key}
                    onClick={() =>
                      setIndicatorDomainFilter((prev) =>
                        prev === spec.key ? 'ALL' : spec.key,
                      )
                    }
                  >
                    {spec.title}
                  </S.IndicatorsFilterChip>
                ))}
            </S.IndicatorsFilterBar>
          )}
        </S.IndicatorsLedgerWrap>
      </S.Section>

      {hasVisibleIndicatorPanels && (
        <S.IndicatorsGrid>
          {showTrendsPanel && (
            <IndicatorTrendsSection
              countryId={country.id}
              countryName={country.name}
              onOpenDetailTab={() =>
                navigate(pathKeys.countryStatistics(country.id, 'indicators'))
              }
            />
          )}
          {showPyramidPanel && (
            <PopulationPyramidSection
              countryId={country.id}
              countryName={country.name}
              onOpenDetailTab={() =>
                navigate(pathKeys.countryStatistics(country.id, 'pyramid'))
              }
            />
          )}
          {showBondsPanel && (
            <BondYieldSection
              countryId={country.id}
              countryName={country.name}
              onOpenDetailTab={() =>
                navigate(pathKeys.countryStatistics(country.id, 'bonds'))
              }
            />
          )}
          {showTradePanel && (
            <TradeSection
              countryId={isModern ? country.id : undefined}
              historicalCountryId={isModern ? undefined : country.id}
              countryName={country.name}
              onOpenDetailTab={() =>
                navigate(pathKeys.countryTrade(country.id))
              }
            />
          )}
          {showCompaniesPanel && (
            <CountryCompaniesSection
              countryId={isModern ? country.id : undefined}
              historicalCountryId={isModern ? undefined : country.id}
              linkedHistoricalCountryIds={linkedHistoricalIds}
              onOpenTab={() => navigate(pathKeys.countryCompanies(country.id))}
            />
          )}
        </S.IndicatorsGrid>
      )}

      {/* 캘린더·활동에서 누른 사건/인물 미리보기 — 섹션 조건 밖(루트)에 두어야
          하위 섹션이 리렌더되어도 열린 모달이 사라지지 않는다 */}
      <EventInlineModal
        eventId={previewEventId}
        onClose={() => setPreviewEventId(null)}
        onNavigate={(eventId) => navigate(pathKeys.events.detail(eventId))}
      />
      <PersonInlineModal
        personId={previewPersonId}
        onClose={() => setPreviewPersonId(null)}
        onEdit={(personId) => {
          setPreviewPersonId(null)
          navigate(pathKeys.personsTimelineDetail(personId))
        }}
        onOpenDetail={(personId) => {
          setPreviewPersonId(null)
          navigate(pathKeys.personsTimelineDetail(personId))
        }}
      />
      {isModern && (
        <CountryDataManagerModal
          open={dataManagerTab !== null}
          onClose={() => setDataManagerTab(null)}
          countryId={country.id}
          countryName={country.name}
          initialTab={dataManagerTab ?? 'records'}
        />
      )}
      {companyRegisterOpen && (
        <CompanyRegisterModal
          isOpen={companyRegisterOpen}
          onClose={() => setCompanyRegisterOpen(false)}
          defaultCountryId={isModern ? country.id : undefined}
          defaultHistoricalCountryId={isModern ? undefined : country.id}
        />
      )}

      </S.DashboardRoot>
    </>
  )
}
