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
import { useExportImports } from '@/entities/country/api.trade'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { companyApi } from '@/shared/api/company'
import { politicalPartyApi } from '@/shared/api/political-party'
import { pathKeys } from '@/shared/router'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import type {
  CompletenessField,
  RecentActivityItem,
} from '../model/use-country-dashboard-stats'
import { useCountryDashboardStats } from '../model/use-country-dashboard-stats'
import {
  CountryDataManagerModal,
  type MainTab,
} from './country-data-manager/country-data-manager-modal'
import * as S from './country-detail-dashboard.styles'
import {
  ArchiveFootprintBar,
  BentoCanvas,
  BentoGrid2Col,
  FiguresSpotlightBentoCard,
  type MissingAxisChip,
  type RadarAxisMetric,
} from './dashboard-infographic/bento-primitives'
import { ExecutiveMindMapBentoHero } from './dashboard-infographic/executive-mindmap-hero'
import {
  CompactGeoBentoCard,
  DemographicsBentoCard,
  DiplomacyTreatyLawBentoCard,
  type ModernDomainDensityItem,
  ModernExecutiveSpectrumCard,
  ModernHistoryForceBentoCard,
  NationalPowerGaugeStrip,
  NationalRadarProfileCard,
  ParliamentAndPartyBentoCard,
  TradeAndIndustryBentoCard,
} from './dashboard-infographic/modern-bento-cards'
import {
  formatAreaValue,
  formatPopulation,
  parsePopulation,
} from './dashboard-panels/format'
import { formatMetricValue } from './dashboard-panels/indicator-trend-chart'

function logSaturationScore(value: number, refMax: number): number {
  if (value <= 0) return 14
  return Math.min(
    100,
    Math.round(22 + (Math.log1p(value) / Math.log1p(Math.max(2, refMax))) * 78),
  )
}

export interface CountryDetailDashboardProps {
  country: UnifiedCountry
  onEdit?: () => void
  /** 상위 셸(CountryDetailInner)에서 이미 계산된 통계 객체를 전달하면 중복 연산을 생략한다 */
  preloadedStats?: ReturnType<typeof useCountryDashboardStats>
  header?: ReactNode
}

export function CountryDetailDashboard({
  country,
  onEdit,
  preloadedStats,
  header,
}: CountryDetailDashboardProps) {
  const navigate = useNavigate()
  const fallbackStats = useCountryDashboardStats(
    preloadedStats ? null : country,
  )
  const stats = preloadedStats ?? fallbackStats
  const rootRef = useRef<HTMLDivElement | null>(null)
  const isModern = country.type === 'modern'

  const { data: economicIndicators = [] } = useEconomicIndicators(
    isModern ? country.id : undefined,
  )
  const { data: demographicIndicators = [] } = useDemographicIndicators(
    isModern ? country.id : undefined,
  )
  const { data: developmentIndicators = [] } = useDevelopmentIndicators(
    isModern ? country.id : undefined,
  )
  const { data: bondYields = [] } = useBondYields(
    isModern ? country.id : undefined,
  )
  const { data: exportImports = [] } = useExportImports(
    isModern ? country.id : undefined,
  )
  const { data: allCompanies = [] } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => companyApi.getAll(),
    staleTime: 60_000,
  })
  const { data: politicalParties = [] } = useQuery({
    queryKey: ['political-parties', `c:${country.id}`],
    queryFn: () => politicalPartyApi.getAll({ countryId: country.id }),
    enabled: isModern,
    staleTime: 60_000,
  })

  const [dataManagerTab, setDataManagerTab] = useState<MainTab | null>(null)
  const [previewEventId, setPreviewEventId] = useState<string | null>(null)
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null)
  const [focusedTenureState, setFocusedTenureState] = useState<{
    cid: string
    tid: string
  } | null>(null)
  const [activeMindMapTenureId, setActiveMindMapTenureId] = useState<
    string | null
  >(null)
  const focusedTenureId =
    focusedTenureState?.cid === country.id ? focusedTenureState.tid : null

  const latestDemographicPop = useMemo(() => {
    const sorted = [...demographicIndicators]
      .filter((row) => parsePopulation(row.population) != null)
      .sort((first, second) => second.year - first.year)
    return sorted[0] ?? null
  }, [demographicIndicators])

  const directPopNum = parsePopulation(country.population)
  const popNum =
    directPopNum ?? parsePopulation(latestDemographicPop?.population)
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

  const { countryCompanyCount, companiesBySector } = useMemo(() => {
    const linkedHistIds = new Set(
      (country.historicalCountries ?? [])
        .map((h) => h.id)
        .filter((hid): hid is string => Boolean(hid)),
    )
    const matched = allCompanies.filter(
      (c) =>
        c.countryId === country.id ||
        (c.historicalCountryId && linkedHistIds.has(c.historicalCountryId)),
    )
    const statusMap = new Map<string, number>()
    for (const comp of matched) {
      const st = String(comp.status ?? '').toUpperCase()
      const label =
        st === 'DISSOLVED' || comp.dissolvedAt
          ? '해산·소멸'
          : st === 'ACQUIRED' || st === 'MERGED'
            ? '인수·합병'
            : st === 'NATIONALIZED'
              ? '국유화'
              : comp.historicalCountryId && !comp.countryId
                ? '전신 국가 기업'
                : '운영 기업'
      statusMap.set(label, (statusMap.get(label) ?? 0) + 1)
    }
    return {
      countryCompanyCount: matched.length,
      companiesBySector: [...statusMap.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
    }
  }, [allCompanies, country.id, country.historicalCountries])

  /* ─── Tab Deep-Link Helpers ────────────────────────────────────────────── */
  const goEvents = () => navigate(pathKeys.countryEvents(country.id))
  const goEventsCentury = (century: number, domain?: string) =>
    navigate(pathKeys.countryEvents(country.id, undefined, century, domain))
  const goGovernment = (
    subTab?: 'cabinets' | 'ministries' | 'system' | 'military',
    cabinetId?: string | null,
    departmentId?: string | null,
  ) => {
    if (subTab === 'military') {
      navigate(pathKeys.countryMilitary(country.id))
      return
    }
    const params = new URLSearchParams()
    if (typeof subTab === 'string' && subTab) params.set('sub', subTab)
    if (typeof cabinetId === 'string' && cabinetId) {
      params.set('cabinetId', cabinetId)
    }
    if (typeof departmentId === 'string' && departmentId) {
      params.set('departmentId', departmentId)
    }
    const qs = params.toString()
    navigate(`${pathKeys.countryGovernment(country.id)}${qs ? `?${qs}` : ''}`)
  }
  const goPoliticalSystem = () =>
    navigate(pathKeys.countryPoliticalSystem(country.id))
  const goRegions = (divisionId?: string) => {
    const base = pathKeys.countryRegions(country.id)
    navigate(
      typeof divisionId === 'string' && divisionId
        ? `${base}?division_id=${encodeURIComponent(divisionId)}`
        : base,
    )
  }
  const goPersons = () => navigate(pathKeys.countryPersons(country.id))
  const goElections = (electionId?: string) => {
    const base = pathKeys.countryElections(country.id)
    navigate(
      typeof electionId === 'string' && electionId
        ? `${base}?electionId=${encodeURIComponent(electionId)}`
        : base,
    )
  }
  const goTreaty = () => navigate(pathKeys.countryTreaty(country.id))
  const goLaws = () => navigate(pathKeys.countryLaws(country.id))
  const goEthnicity = () => navigate(pathKeys.countryEthnicity(country.id))
  const goHistorical = () => navigate(pathKeys.countryHistorical(country.id))
  const goStatsIndicators = () =>
    navigate(pathKeys.countryStatistics(country.id, 'indicators'))
  const goStatsPyramid = () =>
    navigate(pathKeys.countryStatistics(country.id, 'pyramid'))
  const goStatsBonds = () =>
    navigate(pathKeys.countryStatistics(country.id, 'bonds'))
  const goTrade = () => navigate(pathKeys.countryTrade(country.id))
  const goCompanies = () => navigate(pathKeys.countryCompanies(country.id))
  const goMilitary = () => navigate(pathKeys.countryMilitary(country.id))

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

  const missingChips = useMemo<MissingAxisChip[]>(
    () =>
      stats.completeness.missing.map((field) => ({
        key: field.key,
        label: field.label,
        onClick: () => goFillTarget(field),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats.completeness.missing, country.id],
  )

  const totalRecords =
    stats.personCount +
    stats.eventCount +
    stats.administrationCount +
    stats.cityCount +
    stats.electionCount +
    politicalParties.length +
    stats.historicalCountryCount +
    stats.treatyCount +
    stats.lawCount +
    stats.ethnicityCount +
    stats.militaryCount +
    countryCompanyCount

  const powerAxes = useMemo<RadarAxisMetric[]>(() => {
    const popPeers = stats.peerCountries
      .map((p) => p.population)
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b)
    const areaPeers = stats.peerCountries
      .map((p) => p.areaSqKm)
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b)
    const densPeers = stats.peerCountries
      .map((p) =>
        p.population && p.areaSqKm && p.areaSqKm > 0
          ? p.population / p.areaSqKm
          : null,
      )
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b)

    const pctRank = (arr: number[], val: number | null, fallback = 20) => {
      if (val == null || val <= 0 || arr.length === 0) return fallback
      let below = 0
      for (const item of arr) {
        if (item <= val) below += 1
      }
      return Math.max(14, Math.min(100, Math.round((below / arr.length) * 100)))
    }

    const sortedEco = [...economicIndicators].sort((a, b) => b.year - a.year)
    const latestGdpRow = sortedEco.find(
      (r) => r.gdp != null && Number.isFinite(Number(r.gdp)),
    )
    const latestCapRow = sortedEco.find(
      (r) => r.gdpPerCapita != null && Number.isFinite(Number(r.gdpPerCapita)),
    )
    const gdpVal = latestGdpRow?.gdp != null ? Number(latestGdpRow.gdp) : null
    const capVal =
      latestCapRow?.gdpPerCapita != null
        ? Number(latestCapRow.gdpPerCapita)
        : null

    // GDP: $1B ~ $30T log scale; GDP per capita: $500 ~ $90,000 log scale
    const gdpScore =
      gdpVal != null && gdpVal > 0
        ? Math.max(
            16,
            Math.min(
              100,
              Math.round(
                ((Math.log10(gdpVal) - 9) / (Math.log10(30e12) - 9)) * 84 + 16,
              ),
            ),
          )
        : 18
    const capScore =
      capVal != null && capVal > 0
        ? Math.max(
            16,
            Math.min(
              100,
              Math.round(
                ((Math.log10(capVal) - 2.7) / (Math.log10(90_000) - 2.7)) * 84 +
                  16,
              ),
            ),
          )
        : 18

    const sortedDev = [...developmentIndicators]
      .filter((d) => d.hdi != null && Number.isFinite(Number(d.hdi)))
      .sort((a, b) => b.year - a.year)
    const latestHdi =
      sortedDev[0]?.hdi != null ? Number(sortedDev[0].hdi) : null
    const hdiScore =
      latestHdi != null
        ? Math.max(
            18,
            Math.min(100, Math.round(((latestHdi - 0.35) / 0.62) * 82 + 18)),
          )
        : 20

    const densVal =
      popNum != null && areaNum != null && areaNum > 0
        ? popNum / areaNum
        : null

    return [
      {
        key: 'pop',
        label: '인구 규모',
        score: pctRank(popPeers, popNum),
        valueLabel: popNum != null ? formatPopulation(popNum) : '미기재',
        missing: popNum == null,
        onClick: goStatsPyramid,
      },
      {
        key: 'area',
        label: '영토 면적',
        score: pctRank(areaPeers, areaNum),
        valueLabel: areaNum != null ? formatAreaValue(areaNum) : '미기재',
        missing: areaNum == null,
        onClick: () => goRegions(),
      },
      {
        key: 'density',
        label: '인구 밀도',
        score: pctRank(densPeers, densVal),
        valueLabel: densVal != null ? `${densVal.toFixed(0)}명/km²` : '—',
        missing: densVal == null,
        onClick: () => goRegions(),
      },
      {
        key: 'gdp',
        label: '명목 GDP',
        score: gdpScore,
        valueLabel:
          gdpVal != null ? formatMetricValue(gdpVal, 'USD') : '지표 미입력',
        missing: gdpVal == null,
        onClick: goStatsIndicators,
      },
      {
        key: 'gdpCap',
        label: '1인당 소득',
        score: capScore,
        valueLabel:
          capVal != null
            ? formatMetricValue(capVal, 'USD_CAPITA')
            : '지표 미입력',
        missing: capVal == null,
        onClick: goStatsIndicators,
      },
      {
        key: 'hdi',
        label: '인간개발(HDI)',
        score: hdiScore,
        valueLabel: latestHdi != null ? latestHdi.toFixed(3) : '지표 미입력',
        missing: latestHdi == null,
        onClick: goStatsIndicators,
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stats.peerCountries,
    popNum,
    areaNum,
    economicIndicators,
    developmentIndicators,
    country.id,
  ])

  const archiveAxes = useMemo<RadarAxisMetric[]>(
    () => [
      {
        key: 'gov',
        label: '통치·제도',
        score: logSaturationScore(
          stats.administrationCount + stats.executiveTimeline.length,
          36,
        ),
        valueLabel: `${stats.administrationCount + stats.executiveTimeline.length}건`,
        onClick: () => goGovernment(),
      },
      {
        key: 'econ',
        label: '경제·교역',
        score: logSaturationScore(
          economicIndicators.length +
            exportImports.length +
            countryCompanyCount +
            bondYields.length,
          48,
        ),
        valueLabel: `지표 ${economicIndicators.length} · 기업 ${countryCompanyCount}`,
        onClick: goStatsIndicators,
      },
      {
        key: 'geo',
        label: '행정·민족',
        score: logSaturationScore(
          stats.cityCount +
            demographicIndicators.length +
            stats.ethnicityCount,
          24,
        ),
        valueLabel: `구역 ${stats.cityCount} · 민족 ${stats.ethnicityCount}`,
        onClick: () => goRegions(),
      },
      {
        key: 'history',
        label: '역사·인물',
        score: logSaturationScore(
          stats.eventCount + stats.personCount + stats.historicalCountryCount,
          120,
        ),
        valueLabel: `사건 ${stats.eventCount} · 인물 ${stats.personCount}`,
        onClick: goEvents,
      },
      {
        key: 'military',
        label: '군사·안보',
        score: logSaturationScore(
          stats.militaryCount +
            stats.warSummary.totalMilitaryEvents +
            stats.highCommandCount,
          28,
        ),
        valueLabel: `편제 ${stats.militaryCount} · 참전 ${stats.warSummary.totalMilitaryEvents}`,
        onClick: goMilitary,
      },
      {
        key: 'civic',
        label: '정당·외교',
        score: logSaturationScore(
          politicalParties.length +
            stats.electionCount +
            stats.treatyCount +
            stats.lawCount,
          32,
        ),
        valueLabel: `정당 ${politicalParties.length} · 조약 ${stats.treatyCount}`,
        onClick: () => goElections(),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      stats,
      economicIndicators.length,
      exportImports.length,
      countryCompanyCount,
      bondYields.length,
      demographicIndicators.length,
      politicalParties.length,
      country.id,
    ],
  )

  const domainItems = useMemo<ModernDomainDensityItem[]>(
    () => [
      {
        key: 'persons',
        label: '소속 인물',
        count: stats.personCount,
        unit: '명',
        onClick: goPersons,
      },
      {
        key: 'events',
        label: '역사 사건',
        count: stats.eventCount,
        unit: '건',
        onClick: goEvents,
      },
      {
        key: 'gov',
        label: '정부·내각·부처',
        count: stats.administrationCount,
        unit: '건',
        onClick: () => goGovernment(),
      },
      {
        key: 'politics',
        label: '정당·선거',
        count: politicalParties.length + stats.electionCount,
        unit: '건',
        onClick: () => goElections(),
      },
      {
        key: 'military',
        label: '군사 편제',
        count: stats.militaryCount,
        unit: '개',
        onClick: goMilitary,
      },
      {
        key: 'regions',
        label: '광역 행정구역',
        count: stats.cityCount,
        unit: '곳',
        onClick: () => goRegions(),
      },
      {
        key: 'treaties',
        label: '체결 조약',
        count: stats.treatyCount,
        unit: '건',
        onClick: goTreaty,
      },
      {
        key: 'laws',
        label: '헌법·법령',
        count: stats.lawCount,
        unit: '건',
        onClick: goLaws,
      },
      {
        key: 'historical',
        label: '전신·과거국가',
        count: stats.historicalCountryCount,
        unit: '개국',
        onClick: goHistorical,
      },
      {
        key: 'companies',
        label: '기업·교역연도',
        count: countryCompanyCount + exportImports.length,
        unit: '건',
        onClick: countryCompanyCount > 0 ? goCompanies : goTrade,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      stats,
      politicalParties.length,
      countryCompanyCount,
      exportImports.length,
      country.id,
    ],
  )

  const handleSelectActivity = (act: RecentActivityItem) => {
    if (act.kind === 'event') {
      setPreviewEventId(act.refId)
      return
    }
    if (act.kind === 'person') {
      setPreviewPersonId(act.refId)
      return
    }
    if (act.personId) {
      setPreviewPersonId(act.personId)
      return
    }
    if (
      act.kind === 'cabinet' ||
      act.kind === 'department' ||
      act.kind === 'political-system'
    ) {
      goGovernment()
    } else if (act.kind === 'election') {
      goElections(act.refId)
    } else if (act.kind === 'treaty') {
      goTreaty()
    } else if (act.kind === 'law') {
      goLaws()
    } else if (act.kind === 'city') {
      goRegions()
    }
  }

  const atlasCards: ReactNode[] = []
  atlasCards.push(
    <DemographicsBentoCard
      key="demographics"
      demographicIndicators={demographicIndicators}
      ethnicityCount={stats.ethnicityCount}
      onOpenPyramid={goStatsPyramid}
      onOpenEthnicity={goEthnicity}
      onOpenDataManager={() => setDataManagerTab('pyramid')}
    />,
  )
  atlasCards.push(
    <TradeAndIndustryBentoCard
      key="trade"
      exportImports={exportImports}
      companyCount={countryCompanyCount}
      companiesBySector={companiesBySector}
      onOpenTrade={goTrade}
      onOpenCompanies={goCompanies}
    />,
  )
  atlasCards.push(
    <DiplomacyTreatyLawBentoCard
      key="diplomacy"
      treatyCount={stats.treatyCount}
      lawCount={stats.lawCount}
      ethnicityCount={stats.ethnicityCount}
      civicSnapshot={stats.civicSnapshot}
      onOpenTreaties={goTreaty}
      onSelectTreaty={(tid) => navigate(pathKeys.treaties.detail(tid))}
      onOpenLaws={goLaws}
      onOpenEthnicity={goEthnicity}
    />,
  )
  atlasCards.push(
    <CompactGeoBentoCard
      key="geo"
      country={country}
      cityCount={stats.cityCount}
      onOpenRegions={goRegions}
    />,
  )

  return (
    <>
      {header}
      <S.DashboardRoot ref={rootRef}>
        <BentoCanvas>
          {/* 1단 (전폭 히어로): 대통령 · 국가수장 & 각 부처 수장 마인드맵 인포그래픽 */}
          <ExecutiveMindMapBentoHero
            countryId={isModern ? country.id : undefined}
            historicalCountryId={!isModern ? country.id : undefined}
            countryName={country.name}
            countryIsoCode={country.isoCode}
            description={country.description}
            focusedTenureId={focusedTenureId}
            onActiveTenureChange={setActiveMindMapTenureId}
            currentCabinetSummary={stats.currentCabinet}
            nextElection={stats.nextElection}
            recentElection={stats.recentElection}
            onEditOverview={onEdit}
            onOpenPoliticalSystem={goPoliticalSystem}
            onOpenCabinets={(cabinetId) => goGovernment('cabinets', cabinetId)}
            onOpenMinistries={(departmentId) =>
              goGovernment('ministries', null, departmentId)
            }
            onOpenElections={goElections}
            onSelectPerson={(pid) => setPreviewPersonId(pid)}
          />

          {/* 1B단 (통치 스펙트럼): 헌정 체제 & 역대 국가원수·정부수반 재임 바 (클릭 시 상단 마인드맵 즉시 연동) */}
          {/* 자료가 없어도 같은 자리에 — 카드가 스스로 빈 안내를 그린다(2026-09-10 같은 배치 원칙) */}
          <ModernExecutiveSpectrumCard
            timeline={stats.executiveTimeline}
            regimeEras={stats.civicSnapshot.regimeEras}
            activeTenureId={activeMindMapTenureId}
            onFocusTenure={(tid) =>
              setFocusedTenureState({ cid: country.id, tid })
            }
            onSelectPerson={(pid) => setPreviewPersonId(pid)}
            onOpenCabinets={() => goGovernment('cabinets')}
            onOpenPoliticalSystem={goPoliticalSystem}
            onOpenHeadsTab={() =>
              navigate(pathKeys.countryHeadsOfState(country.id))
            }
          />

          {/* 2단 (4칸 한줄 계기판): 인구·영토 아크 게이지 | GDP 스파크라인 | 국채 수익률곡선(1M~30Y)·성장 | HDI 스펙트럼 */}
          <NationalPowerGaugeStrip
            popNum={popNum}
            popYearNote={popYearNote}
            areaNum={areaNum}
            densityText={densityText}
            capitalText={capitalText}
            cityCount={stats.cityCount}
            continentComparison={stats.continentComparison}
            economicIndicators={economicIndicators}
            developmentIndicators={developmentIndicators}
            bondYields={bondYields}
            onOpenDemographics={goStatsPyramid}
            onOpenRegions={() => goRegions()}
            onOpenEconomics={goStatsIndicators}
            onOpenBonds={goStatsBonds}
            onOpenDataManager={() => setDataManagerTab('indicators')}
          />

          {/* 3단 (2열 핵심 아키텍처): 6축 국가 레이더 & 10대 도메인 밀도 | 의회 반원 아치 & 정당 스펙트럼 */}
          <BentoGrid2Col>
            <NationalRadarProfileCard
              countryId={country.id}
              countryName={country.name}
              continentId={country.continentId}
              powerAxes={powerAxes}
              archiveAxes={archiveAxes}
              peerCountries={stats.peerCountries}
              domainItems={domainItems}
              totalRecords={totalRecords}
            />
            <ParliamentAndPartyBentoCard
              parties={politicalParties}
              civicSnapshot={stats.civicSnapshot}
              currentCabinet={stats.currentCabinet}
              electionCount={stats.electionCount}
              nextElection={stats.nextElection}
              recentElection={stats.recentElection}
              onOpenElections={goElections}
              onOpenPoliticalSystem={goPoliticalSystem}
              onOpenPartyCatalog={() =>
                navigate(
                  pathKeys.politicalParties.list({ countryId: country.id }),
                )
              }
            />
          </BentoGrid2Col>

          {/*
            4단 (인구·교역·조약·지리 2×2) — 예전엔 자료 있는 카드만 골라 1·2·3·4장에 따라 격자 열 수까지
            바뀌었다(케냐는 지리 1장만). 같은 배치 원칙대로 늘 네 장, 빈 카드는 스스로 빈 안내를 그린다.
          */}
          <BentoGrid2Col>
            {atlasCards[0]}
            {atlasCards[1]}
          </BentoGrid2Col>
          <BentoGrid2Col>
            {atlasCards[2]}
            {atlasCards[3]}
          </BentoGrid2Col>

          {/* 5단: 통사 계보 간트 스파인 · 세기×분야 히트맵 매트릭스 & 분수령 사건 · 군사 전력 */}
          <ModernHistoryForceBentoCard
            countryName={country.name}
            historicalCountries={country.historicalCountries ?? []}
            eventCount={stats.eventCount}
            centuryBuckets={stats.eventCenturyDomainCounts}
            domainBreakdown={stats.eventDomainBreakdown}
            milestoneEvents={stats.milestoneEvents}
            militaryCount={stats.militaryCount}
            highCommandCount={stats.highCommandCount}
            militaryBranchBreakdown={stats.militaryBranchBreakdown}
            warSummary={stats.warSummary}
            onOpenHistoricalTab={goHistorical}
            onSelectHistoricalCountry={(hid) =>
              navigate(pathKeys.countryDetail(hid))
            }
            onSelectCentury={(cent) => goEventsCentury(cent)}
            onSelectCell={(cent, dom) => goEventsCentury(cent, dom)}
            onSelectEvent={(eid) => setPreviewEventId(eid)}
            onOpenEvents={goEvents}
            onOpenMilitary={goMilitary}
          />

          {/* 6단: 소속 인물 역할·시대 분포 도넛 & 주요 인물 초상 갤러리 */}
          <FiguresSpotlightBentoCard
            spotlight={stats.personSpotlight}
            personCount={stats.personCount}
            onSelectPerson={(pid) => setPreviewPersonId(pid)}
            onOpenPersonsTab={goPersons}
          />

          {/* 하단 1줄: 아카이브 완성도 도넛 링 + 미입력 보완 칩 + 최근 기록 티커 */}
          <ArchiveFootprintBar
            filled={stats.completeness.filled}
            total={stats.completeness.total}
            totalRecords={totalRecords}
            missingChips={missingChips}
            recentActivity={stats.recentActivity}
            onSelectActivity={handleSelectActivity}
          />
        </BentoCanvas>

        {/* 미리보기 · 편집 모달 */}
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
            countryId={country.id}
            countryName={country.name}
            initialTab={dataManagerTab ?? 'indicators'}
            open={dataManagerTab !== null}
            onClose={() => setDataManagerTab(null)}
          />
        )}
      </S.DashboardRoot>
    </>
  )
}
