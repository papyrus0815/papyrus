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
  BentoGridAsym,
  type MissingAxisChip,
} from './dashboard-infographic/bento-primitives'
import { ExecutiveMindMapBentoHero } from './dashboard-infographic/executive-mindmap-hero'
import {
  CompactGeoBentoCard,
  DemographicsBentoCard,
  DiplomacyTreatyLawBentoCard,
  MilitaryForceBentoCard,
  ModernEventsCard,
  ModernGovernanceAndLeadersHeroCard,
  ModernLineageCard,
  ParliamentAndPartyBentoCard,
  TradeAndIndustryBentoCard,
} from './dashboard-infographic/modern-bento-cards'
import { parsePopulation } from './dashboard-panels/format'

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
  const [activeMindMapState, setActiveMindMapState] = useState<{
    cid: string
    tid: string | null
  } | null>(null)
  const [mindMapVisibleState, setMindMapVisibleState] = useState<{
    cid: string
    visible: boolean
  } | null>(null)
  const focusedTenureId =
    focusedTenureState?.cid === country.id ? focusedTenureState.tid : null
  const activeMindMapTenureId =
    activeMindMapState?.cid === country.id ? activeMindMapState.tid : null
  const isMindMapVisible =
    mindMapVisibleState?.cid === country.id ? mindMapVisibleState.visible : false

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

  const { countryCompanyCount, companiesBySector } = useMemo(() => {
    const linkedHistIds = new Set(
      (country.historicalCountries ?? [])
        .map((hist) => hist.id)
        .filter((hid): hid is string => Boolean(hid)),
    )
    const matched = allCompanies.filter(
      (comp) =>
        comp.countryId === country.id ||
        (comp.historicalCountryId &&
          linkedHistIds.has(comp.historicalCountryId)),
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
        .sort((left, right) => right.count - left.count),
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

  const missingChips = useMemo<MissingAxisChip[]>(() => {
    const list: MissingAxisChip[] = stats.completeness.missing.map((field) => ({
      key: field.key,
      label: field.label,
      onClick: () => goFillTarget(field),
    }))
    const seen = new Set(list.map((chip) => chip.key))
    const pushChip = (chip: MissingAxisChip) => {
      if (!seen.has(chip.key)) {
        seen.add(chip.key)
        list.push(chip)
      }
    }

    if (
      economicIndicators.length === 0 &&
      developmentIndicators.length === 0 &&
      bondYields.length === 0
    ) {
      pushChip({
        key: 'indicators',
        label: '경제·통계 지표',
        onClick: () => setDataManagerTab('indicators'),
      })
    }
    if (demographicIndicators.length === 0) {
      pushChip({
        key: 'demographics',
        label: '인구 구조',
        onClick: () => setDataManagerTab('pyramid'),
      })
    }
    if (exportImports.length === 0) {
      pushChip({
        key: 'trade',
        label: '수출입 교역',
        onClick: goTrade,
      })
    }
    if (countryCompanyCount === 0) {
      pushChip({
        key: 'companies',
        label: '기업',
        onClick: goCompanies,
      })
    }
    if (
      stats.militaryCount === 0 &&
      stats.warSummary.totalMilitaryEvents === 0
    ) {
      pushChip({
        key: 'military',
        label: '군사 편제',
        onClick: goMilitary,
      })
    }

    return list
  }, [
    stats.completeness.missing,
    stats.militaryCount,
    stats.warSummary.totalMilitaryEvents,
    economicIndicators.length,
    developmentIndicators.length,
    bondYields.length,
    demographicIndicators.length,
    exportImports.length,
    countryCompanyCount,
    country.id,
  ])

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

  /* ─── 권력 작동층(의회·정당·선거 → 법령·조약 → 군사) → 경제·인구층(교역 → 인구) → 역사 계보층 순서로 배치 ─── */
  const modernPartiesCount = useMemo(
    () =>
      politicalParties.filter(
        (party) => !party.historicalCountryId || !party.dissolvedDate,
      ).length,
    [politicalParties],
  )

  const hasParliamentCard =
    modernPartiesCount > 0 ||
    stats.modernElectionCount > 0 ||
    Boolean(stats.civicSnapshot.latestLegislativeElectionId) ||
    Boolean(stats.civicSnapshot.activePolitySeats?.lowerSeats) ||
    Boolean(stats.civicSnapshot.activePolitySeats?.upperSeats)
  const hasDiplomacyCard =
    stats.treatyCount > 0 || stats.lawCount > 0 || stats.ethnicityCount > 0
  const hasMilitaryCard = stats.militaryCount > 0
  const hasTradeCard = exportImports.length > 0 || countryCompanyCount > 0
  const hasDemographicsCard = demographicIndicators.length > 0
  const hasLineageCard = (country.historicalCountries?.length ?? 0) > 0

  const populatedDomainCards: Array<{ key: string; node: ReactNode }> = []
  // 1순위: 의회 · 정당 · 선거 (행정부 마인드맵 바로 아래 최상단 배치)
  if (hasParliamentCard) {
    populatedDomainCards.push({
      key: 'parliament',
      node: (
        <ParliamentAndPartyBentoCard
          parties={politicalParties}
          civicSnapshot={stats.civicSnapshot}
          currentCabinet={stats.currentCabinet}
          electionCount={stats.electionCount}
          modernElectionCount={stats.modernElectionCount}
          historicalElectionCount={stats.historicalElectionCount}
          nextElection={stats.nextElection}
          recentElection={stats.recentElection}
          onOpenElections={goElections}
          onOpenPoliticalSystem={goPoliticalSystem}
          onOpenPartyCatalog={() =>
            navigate(pathKeys.politicalParties.list({ countryId: country.id }))
          }
        />
      ),
    })
  }
  // 2순위: 헌법 · 법령 · 외교 조약
  if (hasDiplomacyCard) {
    populatedDomainCards.push({
      key: 'diplomacy',
      node: (
        <DiplomacyTreatyLawBentoCard
          treatyCount={stats.treatyCount}
          lawCount={stats.lawCount}
          ethnicityCount={stats.ethnicityCount}
          civicSnapshot={stats.civicSnapshot}
          onOpenTreaties={goTreaty}
          onSelectTreaty={(tid) => navigate(pathKeys.treaties.detail(tid))}
          onOpenLaws={goLaws}
          onOpenEthnicity={goEthnicity}
        />
      ),
    })
  }
  // 3순위: 국방 · 군사 전력
  if (hasMilitaryCard) {
    populatedDomainCards.push({
      key: 'military',
      node: (
        <MilitaryForceBentoCard
          militaryCount={stats.militaryCount}
          highCommandCount={stats.highCommandCount}
          militaryBranchBreakdown={stats.militaryBranchBreakdown}
          warSummary={stats.warSummary}
          onOpenMilitary={goMilitary}
        />
      ),
    })
  }
  // 4순위: 교역 · 주력 산업 · 기업
  if (hasTradeCard) {
    populatedDomainCards.push({
      key: 'trade',
      node: (
        <TradeAndIndustryBentoCard
          exportImports={exportImports}
          companyCount={countryCompanyCount}
          companiesBySector={companiesBySector}
          onOpenTrade={goTrade}
          onOpenCompanies={goCompanies}
        />
      ),
    })
  }
  // 5순위: 인구 구조 · 연령 피라미드
  if (hasDemographicsCard) {
    populatedDomainCards.push({
      key: 'demographics',
      node: (
        <DemographicsBentoCard
          demographicIndicators={demographicIndicators}
          ethnicityCount={stats.ethnicityCount}
          onOpenPyramid={goStatsPyramid}
          onOpenEthnicity={goEthnicity}
          onOpenDataManager={() => setDataManagerTab('pyramid')}
        />
      ),
    })
  }
  // 6순위: 국가 계보 · 과거 정치체 (역사 연표 바로 위)
  if (hasLineageCard) {
    populatedDomainCards.push({
      key: 'lineage',
      node: (
        <ModernLineageCard
          countryName={country.name}
          historicalCountries={country.historicalCountries ?? []}
          onOpenHistoricalTab={goHistorical}
          onSelectHistoricalCountry={(hid) =>
            navigate(pathKeys.countryDetail(hid))
          }
        />
      ),
    })
  }

  const domainRows: ReactNode[] = []
  for (let rowIdx = 0; rowIdx < populatedDomainCards.length; rowIdx += 2) {
    const first = populatedDomainCards[rowIdx]
    const second = populatedDomainCards[rowIdx + 1]
    if (second) {
      domainRows.push(
        <BentoGrid2Col key={`${first.key}-${second.key}`}>
          {first.node}
          {second.node}
        </BentoGrid2Col>,
      )
    } else {
      domainRows.push(<div key={first.key}>{first.node}</div>)
    }
  }

  return (
    <>
      {header}
      <S.DashboardRoot ref={rootRef}>
        <BentoCanvas>
          {/* 1단 비대칭 히어로 벤토: [좌측: 국가 형태 · 현직 및 역대 국가수반] | [우측: 인터랙티브 지도 · 인구/영토/거시 제원] */}
          <BentoGridAsym $leftFr={1.34} $rightFr={1}>
            <ModernGovernanceAndLeadersHeroCard
              description={country.description}
              activePolitySeats={stats.civicSnapshot.activePolitySeats}
              currentHeads={stats.currentHeads}
              currentCabinet={stats.currentCabinet}
              historicalHeadCount={stats.historicalHeadCount}
              timeline={stats.executiveTimeline}
              regimeEras={stats.civicSnapshot.regimeEras}
              activeTenureId={activeMindMapTenureId ?? focusedTenureId}
              hideIncumbentHeads={isMindMapVisible}
              onFocusTenure={(tid) =>
                setFocusedTenureState({ cid: country.id, tid })
              }
              onEditOverview={onEdit}
              onOpenPoliticalSystem={goPoliticalSystem}
              onOpenCabinets={(cabinetId) =>
                goGovernment('cabinets', cabinetId)
              }
              onOpenHeadsTab={() =>
                navigate(pathKeys.countryHeadsOfState(country.id))
              }
              onSelectPerson={(pid) => setPreviewPersonId(pid)}
            />

            <CompactGeoBentoCard
              country={country}
              cityCount={stats.cityCount}
              scaleMetrics={{
                popNum,
                popYearNote,
                areaNum,
                densityText,
                continentComparison: stats.continentComparison,
                economicIndicators,
                developmentIndicators,
                bondYields,
                onOpenDemographics: goStatsPyramid,
                onOpenEconomics: goStatsIndicators,
                onOpenBonds: goStatsBonds,
              }}
              onOpenRegions={goRegions}
            />
          </BentoGridAsym>

          {/* 2단 전폭: 행정내각 · 행정부 수장 얼굴 및 각 부처 장관 마인드맵 */}
          <ExecutiveMindMapBentoHero
            countryId={isModern ? country.id : undefined}
            historicalCountryId={!isModern ? country.id : undefined}
            countryName={country.name}
            countryIsoCode={country.isoCode}
            focusedTenureId={focusedTenureId}
            onActiveTenureChange={(tid) =>
              setActiveMindMapState((prev) =>
                prev?.cid === country.id && prev.tid === tid
                  ? prev
                  : { cid: country.id, tid },
              )
            }
            currentCabinetSummary={stats.currentCabinet}
            cabinetMindMapMode
            onVisibilityChange={(visible) =>
              setMindMapVisibleState((prev) =>
                prev?.cid === country.id && prev.visible === visible
                  ? prev
                  : { cid: country.id, visible },
              )
            }
            onOpenPoliticalSystem={goPoliticalSystem}
            onOpenCabinets={(cabinetId) =>
              goGovernment('cabinets', cabinetId)
            }
            onOpenMinistries={(departmentId) =>
              goGovernment('ministries', null, departmentId)
            }
            onSelectPerson={(pid) => setPreviewPersonId(pid)}
          />

          {/* 3~4단: [의회·정당·선거 → 헌법·법령·조약 → 국방·군사 → 교역·산업 → 인구 구조 → 국가 계보] 우선순위 2열 벤토 */}
          {domainRows}

          {/* 5단: 역사 연표 · 핵심 전환점 인포그래픽 (시대·분야 비중 + 시간순 전환점 흐름) */}
          <ModernEventsCard
            eventCount={stats.eventCount}
            centuryBuckets={stats.eventCenturyDomainCounts}
            domainBreakdown={stats.eventDomainBreakdown}
            milestoneEvents={stats.milestoneEvents}
            warSummary={
              !hasMilitaryCard ? stats.warSummary : undefined
            }
            onSelectCentury={(cent) => goEventsCentury(cent)}
            onSelectCell={(cent, dom) => goEventsCentury(cent, dom)}
            onSelectEvent={(eid) => setPreviewEventId(eid)}
            onOpenEvents={goEvents}
            onOpenMilitary={goMilitary}
          />

          {/* 하단: 더 채울 수 있는 기록 + 최근 편집 */}
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
