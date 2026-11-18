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
import { usePoliticalSystems } from '@/entities/political-system/api'
import { resolveCurrentSystem } from '@/entities/political-system/model/political-system'
import { companyApi } from '@/shared/api/company'
import { pathKeys } from '@/shared/router'
import { CompanyRegisterModal } from '@/widgets/company-form'
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
  BentoGridAsym,
  type MissingAxisChip,
} from './dashboard-infographic/bento-primitives'
import {
  CompactGeoBentoCard,
  DemographicsBentoCard,
  GovernancePowerBentoCard,
  MacroSparklinesBentoStrip,
  ModernHistoryForceBentoCard,
  NationalScaleBentoCard,
  TradeAndIndustryBentoCard,
} from './dashboard-infographic/modern-bento-cards'
import { parsePopulation } from './dashboard-panels/format'

export interface CountryDetailDashboardProps {
  country: UnifiedCountry
  onEdit?: () => void
  /**
   * 국가 히어로(국기 썸네일·국가명). 대시보드 탭에서만 뜨므로 셸 좌측 칼럼 안에서
   * 렌더한다.
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
  const politicalSystemsQuery = usePoliticalSystems({
    countryId: isModern ? country.id : undefined,
    historicalCountryId: isModern ? undefined : country.id,
  })

  const [dataManagerTab, setDataManagerTab] = useState<MainTab | null>(null)
  const [companyRegisterOpen, setCompanyRegisterOpen] = useState(false)
  const [previewEventId, setPreviewEventId] = useState<string | null>(null)
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null)

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

  const currentPolity = useMemo(
    () =>
      resolveCurrentSystem(politicalSystemsQuery.data ?? [], {
        preferModernDirect: isModern,
      }),
    [politicalSystemsQuery.data, isModern],
  )
  const isBridgedPolity =
    isModern && Boolean(currentPolity?.historicalCountryId)

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
    const sectorMap = new Map<string, number>()
    for (const comp of matched) {
      const label =
        (comp as { industry?: string | null; sector?: string | null }).industry?.trim() ||
        (comp as { sector?: string | null }).sector?.trim() ||
        (comp.status === 'DISSOLVED' ? '해산·소멸' : '등록 기업')
      sectorMap.set(label, (sectorMap.get(label) ?? 0) + 1)
    }
    return {
      countryCompanyCount: matched.length,
      companiesBySector: [...sectorMap.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
    }
  }, [allCompanies, country.id, country.historicalCountries])

  /* ─── Tab Deep-Link Helpers ────────────────────────────────────────────── */
  const goEvents = () => navigate(pathKeys.countryEvents(country.id))
  const goEventsCentury = (century: number) =>
    navigate(pathKeys.countryEvents(country.id, undefined, century))
  const goGovernment = (
    subTab?: 'cabinets' | 'ministries' | 'system' | 'military',
    cabinetId?: string | null,
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
    stats.historicalCountryCount +
    stats.treatyCount +
    stats.lawCount +
    stats.ethnicityCount +
    stats.militaryCount +
    countryCompanyCount

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

  const hasDemographicsCard =
    demographicIndicators.length > 0 || stats.ethnicityCount > 0
  const hasTradeCard = exportImports.length > 0 || countryCompanyCount > 0
  const hasHistoryForceCard =
    (country.historicalCountries?.length ?? 0) > 0 ||
    stats.eventCenturyDomainCounts.length > 0 ||
    stats.militaryCount > 0

  return (
    <>
      {header}
      <S.DashboardRoot ref={rootRef}>
        <BentoCanvas>
          {/* 1단 벤토: 헌정·통치 구조 (좌) + 국력 스케일·대륙 백분위 게이지 (우) */}
          <BentoGridAsym $leftFr={1.18} $rightFr={1}>
            <GovernancePowerBentoCard
              description={country.description}
              currentPolity={currentPolity}
              isBridgedPolity={isBridgedPolity}
              currentHeads={stats.currentHeads}
              currentCabinet={stats.currentCabinet}
              nextElection={stats.nextElection}
              recentElection={stats.recentElection}
              onEditCountry={onEdit}
              onOpenPoliticalSystem={goPoliticalSystem}
              onOpenCabinets={(cabinetId) => goGovernment('cabinets', cabinetId)}
              onOpenElections={goElections}
              onSelectPerson={(pid) => setPreviewPersonId(pid)}
            />

            <NationalScaleBentoCard
              popNum={popNum}
              popYearNote={popYearNote}
              areaNum={areaNum}
              densityText={densityText}
              capitalText={capitalText}
              cityCount={stats.cityCount}
              continentComparison={stats.continentComparison}
              latestGdp={latestEconomicGdp}
              latestGdpPerCapita={latestEconomicGdpPerCapita}
              latestHdi={latestDevelopmentHdi}
              onOpenDemographics={goStatsPyramid}
              onOpenRegions={() => goRegions()}
              onOpenEconomics={goStatsIndicators}
              onOpenDataManager={() => setDataManagerTab('indicators')}
            />
          </BentoGridAsym>

          {/* 2단 벤토: 거시경제 4대 핵심 추이 스파크라인 스트립 (데이터 있을 때 즉시 노출) */}
          <MacroSparklinesBentoStrip
            economicIndicators={economicIndicators}
            bondYields={bondYields}
            onOpenEconomics={goStatsIndicators}
            onOpenBonds={goStatsBonds}
            onOpenDataManager={() => setDataManagerTab('indicators')}
          />

          {/* 3단 벤토: 인구 피라미드·연령 구조 (좌) + 대외 교역 수지·기업 생태계 (우) */}
          {(hasDemographicsCard || hasTradeCard) &&
            (hasDemographicsCard && hasTradeCard ? (
              <BentoGrid2Col>
                <DemographicsBentoCard
                  demographicIndicators={demographicIndicators}
                  ethnicityCount={stats.ethnicityCount}
                  onOpenPyramid={goStatsPyramid}
                  onOpenEthnicity={goEthnicity}
                  onOpenDataManager={() => setDataManagerTab('pyramid')}
                />
                <TradeAndIndustryBentoCard
                  exportImports={exportImports}
                  companyCount={countryCompanyCount}
                  companiesBySector={companiesBySector}
                  onOpenTrade={goTrade}
                  onOpenCompanies={goCompanies}
                />
              </BentoGrid2Col>
            ) : (
              <>
                {hasDemographicsCard ? (
                  <DemographicsBentoCard
                    demographicIndicators={demographicIndicators}
                    ethnicityCount={stats.ethnicityCount}
                    onOpenPyramid={goStatsPyramid}
                    onOpenEthnicity={goEthnicity}
                    onOpenDataManager={() => setDataManagerTab('pyramid')}
                  />
                ) : null}
                {hasTradeCard ? (
                  <TradeAndIndustryBentoCard
                    exportImports={exportImports}
                    companyCount={countryCompanyCount}
                    companiesBySector={companiesBySector}
                    onOpenTrade={goTrade}
                    onOpenCompanies={goCompanies}
                  />
                ) : null}
              </>
            ))}

          {/* 4단 벤토: 통사 계보·세기별 사건·군사력 (좌) + 컴팩트 강역·행정구역 맵 (우) */}
          {hasHistoryForceCard ? (
            <BentoGridAsym $leftFr={1.35} $rightFr={1}>
              <ModernHistoryForceBentoCard
                countryName={country.name}
                historicalCountries={country.historicalCountries ?? []}
                eventCount={stats.eventCount}
                centuryBuckets={stats.eventCenturyDomainCounts}
                domainBreakdown={stats.eventDomainBreakdown}
                militaryCount={stats.militaryCount}
                highCommandCount={stats.highCommandCount}
                militaryBranchBreakdown={stats.militaryBranchBreakdown}
                warSummary={stats.warSummary}
                onOpenHistoricalTab={goHistorical}
                onSelectHistoricalCountry={(hid) =>
                  navigate(pathKeys.countryDetail(hid))
                }
                onSelectCentury={goEventsCentury}
                onOpenEvents={goEvents}
                onOpenMilitary={goMilitary}
              />
              <CompactGeoBentoCard
                country={country}
                cityCount={stats.cityCount}
                onOpenRegions={goRegions}
              />
            </BentoGridAsym>
          ) : (
            <CompactGeoBentoCard
              country={country}
              cityCount={stats.cityCount}
              onOpenRegions={goRegions}
            />
          )}

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
