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
  IconCalendar,
  IconChart,
  IconCity,
  IconClock,
  IconHistory,
  IconLandmark,
  IconMilitary,
  IconRefresh,
  IconScroll,
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
import { CompletenessPanel } from './dashboard-panels/completeness-panel'
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
  const { data: exportImports = [], isLoading: isTradeLoading } =
    useExportImports(isModern ? country.id : undefined)
  const { data: allCompanies = [], isLoading: isCompaniesLoading } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => companyApi.getAll(),
    staleTime: 60_000,
    enabled: isModern,
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

  const latestDemographicPop = useMemo(() => {
    const sorted = [...demographicIndicators]
      .filter((row) => row.population != null && Number.isFinite(row.population))
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

  const directPopNum = parsePopulation(country.population)
  const popNum = directPopNum ?? latestDemographicPop?.population ?? null
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
    latestEconomicGdpPerCapita != null

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
    ...(stats.militaryCount > 0
      ? [
          {
            key: 'military',
            label: '군대',
            unit: '개',
            value: stats.militaryCount,
            delta: 0,
            isLoading: stats.loading.military,
            icon: <IconMilitary />,
            onClick: () => goGovernment('military'),
          } satisfies RecordLedgerRow,
        ]
      : []),
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

  /* 규모 줄은 빈 지면과 채워진 지면이 함께 쓴다 — 같은 JSX를 두 벌 두지 않는다 */
  const factBar = hasAnyFact ? (
    <S.FactBar aria-label="국가 규모">
      {popNum != null && (
        <S.Fact>
          <S.FactLabel>인구</S.FactLabel>
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
        </S.Fact>
      )}
      {country.areaSqKm != null && (
        <S.Fact>
          <S.FactLabel>면적</S.FactLabel>
          <S.FactValue>
            {formatAreaValue(country.areaSqKm)}
            <S.FactUnit>km²</S.FactUnit>
          </S.FactValue>
          <CompareLine
            comparison={stats.continentComparison}
            metric="area"
          />
        </S.Fact>
      )}
      {densityText && (
        <S.Fact>
          <S.FactLabel>인구 밀도</S.FactLabel>
          <S.FactValue>{densityText}</S.FactValue>
        </S.Fact>
      )}
      {capitalText && (
        <S.Fact>
          <S.FactLabel>수도</S.FactLabel>
          <S.FactValue>{capitalText}</S.FactValue>
        </S.Fact>
      )}
      {latestEconomicGdp?.gdp != null && (
        <S.Fact>
          <S.FactLabel>명목 GDP</S.FactLabel>
          <S.FactValue>
            {formatMetricValue(latestEconomicGdp.gdp, '$')}
          </S.FactValue>
          <S.FactSubNote>{latestEconomicGdp.year}년 기준</S.FactSubNote>
        </S.Fact>
      )}
      {latestEconomicGdpPerCapita?.gdpPerCapita != null && (
        <S.Fact>
          <S.FactLabel>1인당 GDP</S.FactLabel>
          <S.FactValue>
            {formatMetricValue(latestEconomicGdpPerCapita.gdpPerCapita, '$')}
          </S.FactValue>
          <S.FactSubNote>
            {latestEconomicGdpPerCapita.year}년 기준
          </S.FactSubNote>
        </S.Fact>
      )}
    </S.FactBar>
  ) : (
    <S.FactEmptyRow aria-label="국가 규모 미등록">
      <S.FactEmptyText>
        인구·면적·수도·GDP 등 기본 규모가 아직 등록되지 않았습니다.
      </S.FactEmptyText>
      <S.FactEmptyActions>
        {onEdit && (
          <S.FactEmptyAction type="button" onClick={onEdit}>
            + 기본 규모 입력
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
  )

  const hasActivitySection = stats.loading.activity || totalActivity > 0

  const countryCompanyCount = useMemo(
    () =>
      allCompanies.filter((company) => company.countryId === country.id).length,
    [allCompanies, country.id],
  )

  const hasPyramidData = useMemo(
    () =>
      (demographicIndicators as DemographicIndicator[]).some(
        (indicator) => toPyramidRows(indicator).length > 0,
      ),
    [demographicIndicators],
  )

  const hasTrendIndicators =
    economicIndicators.length > 0 ||
    demographicIndicators.length > 0 ||
    developmentIndicators.length > 0

  const hasBondsData = bondYields.length > 0
  const hasTradeData = exportImports.length > 0

  const isIndicatorsLoading =
    isCompaniesLoading ||
    isEconomicLoading ||
    isDemographicLoading ||
    isDevelopmentLoading ||
    isBondsLoading ||
    isTradeLoading

  const allFiveIndicatorsEmpty =
    isModern &&
    !isIndicatorsLoading &&
    countryCompanyCount === 0 &&
    !hasPyramidData &&
    !hasTrendIndicators &&
    !hasBondsData &&
    !hasTradeData

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
        4. 기록 · 완성도 — 각 탭으로 가는 입구와 완성도를 한 카드에 통합.
        등록된 기록이 0건이면 도넛 완성도 카드를, 1건 이상이면 가로 비교 막대 + 미등록 축 바로가기 칩을 함께 보여준다.
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

        {totalRegistered === 0 &&
        countryRecords.length === 0 &&
        !completenessLoading ? (
          <CompletenessPanel
            filled={stats.completeness.filled}
            total={stats.completeness.total}
            missing={stats.completeness.missing}
            isLoading={completenessLoading}
            onFillMissing={goFillTarget}
          />
        ) : (
          <>
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
                    <S.EventTimelineLabel>사건 연표</S.EventTimelineLabel>
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
                  <S.SectionLink
                    type="button"
                    onClick={() => setDataManagerTab('records')}
                  >
                    관리
                  </S.SectionLink>
                </S.CountryNotesHeader>
                <S.CountryNotesList>
                  {countryRecords.slice(0, 5).map((rec) => (
                    <S.CountryNoteItem key={rec.id}>
                      <S.CountryNoteDate>
                        {new Date(rec.recordedAt).toLocaleDateString('ko-KR')}
                      </S.CountryNoteDate>
                      <S.CountryNoteText>{rec.description}</S.CountryNoteText>
                    </S.CountryNoteItem>
                  ))}
                </S.CountryNotesList>
              </S.CountryNotesBlock>
            )}
          </>
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
            />
          </S.FeedPanel>
        </S.Section>
      )}

      {/*
        5. 기업·인구 피라미드·지표 추이·국채 금리·교역 —
        5개 지표가 모두 비어 있을 때는 빈 점선 박스 5개를 나열하는 대신 단일 통합 안내 카드로 압축하고,
        하나라도 데이터가 있거나 사용자가 '개별 섹션 펼치기'를 눌렀을 때만 개별 섹션을 펼친다.
      */}
      {country.type === 'modern' &&
        (allFiveIndicatorsEmpty && !expandEmptyIndicators ? (
          <S.Section>
            <S.SectionTitleRow>
              <S.SectionTitleIcon>
                <IconChart />
              </S.SectionTitleIcon>
              <S.SectionTitleText>
                경제 · 인구 · 교역 · 기업 지표
              </S.SectionTitleText>
              <SectionHelpPopover sectionKey="indicatorsHub" />
              <S.SectionLink
                type="button"
                onClick={() => setExpandEmptyIndicators(true)}
              >
                빈 섹션 개별 펼치기 ▾
              </S.SectionLink>
            </S.SectionTitleRow>
            <S.UnifiedIndicatorsCard>
              <S.UnifiedIndicatorsTextCol>
                <S.UnifiedIndicatorsDesc>
                  주요 기업, 인구 피라미드, 거시경제·인구 추이, 국채 금리, 수출입
                  교역 데이터가 아직 등록되지 않았습니다. 아래 버튼에서 원하는
                  분야를 등록하면 전용 시각화 차트가 즉시 활성화됩니다.
                </S.UnifiedIndicatorsDesc>
                <S.UnifiedIndicatorsHint>
                  💡 어느 한 분야라도 데이터가 입력되면 자동으로 개별 차트
                  섹션으로 전환됩니다.
                </S.UnifiedIndicatorsHint>
              </S.UnifiedIndicatorsTextCol>
              <S.UnifiedIndicatorsActions>
                <S.UnifiedIndicatorBtn
                  type="button"
                  onClick={() => setDataManagerTab('indicators')}
                >
                  + 연도별 경제·인구 지표
                </S.UnifiedIndicatorBtn>
                <S.UnifiedIndicatorBtn
                  type="button"
                  onClick={() => setDataManagerTab('pyramid')}
                >
                  + 인구 피라미드
                </S.UnifiedIndicatorBtn>
                <S.UnifiedIndicatorBtn
                  type="button"
                  onClick={() => setDataManagerTab('bonds')}
                >
                  + 국채 금리
                </S.UnifiedIndicatorBtn>
                <S.UnifiedIndicatorBtn
                  type="button"
                  onClick={() => setDataManagerTab('trade')}
                >
                  + 수출입 교역
                </S.UnifiedIndicatorBtn>
                <S.UnifiedIndicatorBtn
                  type="button"
                  onClick={() => navigate(pathKeys.countryCompanies(country.id))}
                >
                  + 주요 기업 등록
                </S.UnifiedIndicatorBtn>
              </S.UnifiedIndicatorsActions>
            </S.UnifiedIndicatorsCard>
          </S.Section>
        ) : (
          <S.IndicatorsGrid>
            <CountryCompaniesSection
              countryId={country.id}
              onOpenTab={() => navigate(pathKeys.countryCompanies(country.id))}
            />
            <PopulationPyramidSection
              countryId={country.id}
              countryName={country.name}
              onOpenDetailTab={() =>
                navigate(pathKeys.countryStatistics(country.id, 'pyramid'))
              }
            />
            <IndicatorTrendsSection
              countryId={country.id}
              countryName={country.name}
              onOpenDetailTab={() =>
                navigate(pathKeys.countryStatistics(country.id, 'indicators'))
              }
            />
            <BondYieldSection
              countryId={country.id}
              countryName={country.name}
              onOpenDetailTab={() =>
                navigate(pathKeys.countryStatistics(country.id, 'bonds'))
              }
            />
            <TradeSection
              countryId={country.id}
              countryName={country.name}
              onOpenDetailTab={() => navigate(pathKeys.countryTrade(country.id))}
            />
          </S.IndicatorsGrid>
        ))}

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

      </S.DashboardRoot>
    </>
  )
}
