import {
  Fragment,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiEdit2,
  FiPlus,
} from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import { useThemeStore } from '@/shared/styles/theme.store'

import type { Country } from '@/entities/country/api'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { useCountryListState } from '@/widgets/country/country-list/country-list-state.context'
import {
  formatCountryPeriod,
  getCountryDurationYears,
  getCountryYearRange,
} from '@/shared/lib/country-period'
import { PoliticalSystemTab } from '@/features/government-info/ui/political-system-tab.widget'
import { pathKeys } from '@/shared/router'
import { getUploadImageUrl } from '@/shared/api/upload'
import * as DetailStyles from './country-detail.styles'
import * as ListStyles from '@/widgets/country/country-list/ui/country-list.styles'

const CountryStyles = { ...DetailStyles, ...ListStyles }

import {
  updateHistoricalCountry,
  getTransitionsByHistoricalCountryId,
} from '@/shared/api/historical-countries'
import { companyApi } from '@/shared/api/company'
import { useTradeRecords } from '@/entities/trade/api'

import { CountryCompaniesTabSection } from './country-companies-tab-section.widget'
import { CountryElectionsSection } from './country-elections-section.widget'
import { CountryLawsSection } from './country-laws-section.widget'
import { CountryMilitarySection } from './country-military-section.widget'
import { CountryPersonsSection } from './country-persons-section.widget'
import { CountryTradeSection } from './country-trade-section.widget'
import { EthnicitySection } from './ethnicity-section.widget'
import { EventsTimelineSection } from './events-timeline-section.widget'
import { GovernmentInfoSection } from './government-info-section.widget'
import { TreatySectionWidget } from './treaty-section.widget'
import { LoadingOverlay } from './loading-overlay'
import { MapRegionAdministrativeView } from './map-region-administrative-view'
import {
  MembershipSection,
  RelationSection,
  SuccessionSection,
  TRANSITION_EVENT_LABELS,
} from './historical-relations-sections'
import { CountryDetailHeader } from './country-detail-header.widget'
import * as TabStyles from './overview-sub-tabs.styles'
import * as DashboardStyles from './country-detail-dashboard.styles'
import { SectionTabHeader } from '@/shared/ui/section-page-layout'
import { UnderlineTabButton } from '@/shared/ui/underline-tabs'
import {
  historicalCountryKeys,
  useHistoricalCountry,
} from '@/entities/historical-country/api'
import { notify } from '@/shared/ui/toast'
import { ENTITY_KIND_LABELS } from '@/entities/historical-country/model/constants'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'
import {
  useHistoricalCountryDashboard,
  type HistoricalCompletenessField,
} from '../model/use-historical-country-dashboard'
import type {
  CompletenessField,
  RecentActivityItem,
} from '../model/use-country-dashboard-stats'
import { IconLandmark } from './country-detail-dashboard.icons'
import { ChartSkeleton } from './dashboard-panels/chart-skeleton'
import {
  ArchiveFootprintBar,
  BentoActionBtn,
  BentoCanvas,
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoDivider,
  BentoGrid2Col,
  BentoGridAsym,
  BentoHeaderActions,
  CenturyEventMatrixAndMilestones,
  FiguresSpotlightBentoCard,
  MilitaryForceInfographicBlock,
  type MissingAxisChip,
} from './dashboard-infographic/bento-primitives'
import {
  getHistoricalCountryTerritoryChanges,
  territoryTransferKeys,
} from '@/shared/api/territory-transfers'
import {
  HistoricalDomainArchiveCard,
  HistoricalHeroFlowCard,
  HistoricalLineageDiplomacyCard,
  HistoricalRulerSpectrumCard,
  HistoricalTerritoryWaterfallCard,
} from './dashboard-infographic/historical-bento-cards'
import { ExecutiveMindMapBentoHero } from './dashboard-infographic/executive-mindmap-hero'
import { CompactGeoBentoCard } from './dashboard-infographic/modern-bento-cards'

export type HistoricalCountryTab =
  | 'overview' // 역사 개요
  | 'events' // 주요 사건 (메인)
  | 'figures' // 주요 인물
  | 'heads' // 수장 (국왕, 황제 등)
  | 'regions' // 행정구역 (조선 팔도 등)
  | 'government' // 정부·행정
  | 'military' // 군사 사령부·편제
  | 'elections' // 선거·투표 (역사 국가 맥락)
  | 'laws' // 법령 카탈로그
  | 'ethnicity' // 구성 민족
  | 'trade' // 교역 (수출·수입)
  | 'companies' // 기업·상단
  | 'succession' // 계승 관계
  | 'membership' // 소속·구성 (신성로마-제후국 등)
  | 'relation' // 국가 관계 (한·중 조공, 동맹 등)
  | 'treaty' // 조약·협정 (강화도조약 등)

/**
 * 페이지 → 위젯이 받는 URL-동기화 가능한 탭 키 부분집합.
 *
 * `HistoricalCountryTab`은 더 많은 탭을 가지지만 URL 매핑은 `CountryDetailTabKey`와
 * 겹치는 것만 노출 — modern과 어휘 일치를 유지해 페이지 전환·딥링크 동작을 통일한다.
 */
type HistoricalSyncedTab =
  | 'events'
  | 'figures'
  | 'heads'
  | 'regions'
  | 'government'
  | 'military'
  | 'elections'
  | 'laws'
  | 'ethnicity'
  | 'treaty'
  | 'trade'
  | 'companies'

type HistoricalUrlTab = Exclude<HistoricalSyncedTab, 'figures'> | 'persons'

const LOCAL_QUERY_TAB_SET = new Set<HistoricalCountryTab>([
  'heads',
  'succession',
  'membership',
  'relation',
])

interface HistoricalCountryDetailProps {
  country: UnifiedCountry
  isLoading?: boolean
  onEdit?: (country: UnifiedCountry) => void
  onDelete?: (id: string) => void
  /** URL 연동: 특정 탭으로 직접 진입 시 (`'dashboard'` 등 historical에 없는 키는 외부에서 매핑 안 됨). */
  initialTab?: HistoricalSyncedTab
  /** 탭 변경 시 URL 갱신 콜백 — overview 등으로 돌아갈 땐 null. */
  onTabChangeToUrl?: (tab: HistoricalUrlTab | null) => void
}

/*
 * 'heads'(역대 수반)는 라우트 세그먼트에는 싣지 않고 ?tab= 쿼리로 유지한다 —
 * 라우팅 훅이 현대 국가 규약대로 /heads를 행정조직 URL(/government)로 접기 때문이다.
 */
const SYNCED_TAB_SET = new Set<HistoricalCountryTab>([
  'events',
  'figures',
  'regions',
  'government',
  'military',
  'elections',
  'laws',
  'ethnicity',
  'treaty',
  'trade',
  'companies',
])

/**
 * 역사적 국가 상세 페이지
 */
// 계승 이벤트 유형 한글 라벨 (배지·개요용, SuccessionSection보다 위에 정의)

export function HistoricalCountryDetail({
  country,
  isLoading = false,
  onEdit,
  onDelete,
  initialTab,
  onTabChangeToUrl,
}: HistoricalCountryDetailProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryTabParam = searchParams.get('tab') as HistoricalCountryTab | null
  const [activeTab, setActiveTab] = useState<HistoricalCountryTab>(() => {
    if (initialTab === 'heads' || queryTabParam === 'heads') return 'government'
    if (initialTab) return initialTab
    if (queryTabParam && LOCAL_QUERY_TAB_SET.has(queryTabParam)) {
      return queryTabParam
    }
    return 'overview'
  })
  const [governmentSubTab, setGovernmentSubTab] = useState<
    'system' | 'cabinets' | 'ministries'
  >('cabinets')
  const [focusEventsCentury, setFocusEventsCentury] = useState<number | null>(
    null,
  )

  // 이 위젯은 country-detail.widget이 country.type === 'historical'로 분기 후에만 마운트됨 — id 직접 사용.
  const historicalCountryId = country.id
  const navigate = useNavigate()
  const { countries: allModernCountries, apiHistoricalCountries } =
    useCountryListState()
  const linkedModernCountries = useMemo<Country[]>(() => {
    const matchedHistorical = apiHistoricalCountries?.find(
      (item) => item.id === historicalCountryId,
    ) as { parentModernCountryIds?: string[] } | undefined
    const detailModernIds = new Set(
      matchedHistorical?.parentModernCountryIds ?? [],
    )
    return allModernCountries.filter((modern) => {
      if (detailModernIds.has(modern.id)) return true
      const embeddedHistorical = (
        modern as { historicalCountries?: Array<{ id: string }> }
      ).historicalCountries
      return Boolean(
        embeddedHistorical?.some((hist) => hist.id === historicalCountryId),
      )
    })
  }, [allModernCountries, apiHistoricalCountries, historicalCountryId])

  const { data: transitions = [] } = useQuery({
    queryKey: ['historical-country-transitions', historicalCountryId],
    queryFn: () => getTransitionsByHistoricalCountryId(historicalCountryId),
    enabled: !!historicalCountryId,
  })
  // 이 국가가 후임인 변천 = 탄생 유형 (고려 → 조선 시 조선 입장에서 "계승")
  const incomingTransition = transitions.find(
    (transition) => transition.successorId === historicalCountryId,
  )
  const incomingCategoryLabel = incomingTransition
    ? TRANSITION_EVENT_LABELS[incomingTransition.eventType] ?? incomingTransition.eventType
    : null

  const dashboardStats = useHistoricalCountryDashboard(country, country.description)
  const { data: tradeRecords = [] } = useTradeRecords(
    historicalCountryId ? { historicalCountryId } : {},
  )
  const { data: allCompanies = [] } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => companyApi.getAll(),
    staleTime: 60_000,
    enabled: Boolean(historicalCountryId),
  })
  const tabCounts = useMemo<
    Partial<Record<HistoricalCountryTab, number>>
  >(() => {
    const companyCount = allCompanies.filter(
      (company) => company.historicalCountryId === historicalCountryId,
    ).length
    return {
      events: dashboardStats.loading.events
        ? undefined
        : dashboardStats.eventCount,
      figures: dashboardStats.loading.persons
        ? undefined
        : dashboardStats.personCount,
      regions: dashboardStats.loading.regions
        ? undefined
        : dashboardStats.divisionCount,
      succession: dashboardStats.loading.lineage
        ? undefined
        : dashboardStats.transitionCount,
      membership: dashboardStats.loading.memberships
        ? undefined
        : dashboardStats.membershipCount,
      relation: dashboardStats.loading.relations
        ? undefined
        : dashboardStats.relationCount,
      treaty: dashboardStats.loading.treaties
        ? undefined
        : dashboardStats.treatyCount,
      government: dashboardStats.loading.administration
        ? undefined
        : dashboardStats.administrationCount + dashboardStats.rulers.length,
      military: dashboardStats.loading.military
        ? undefined
        : dashboardStats.militaryCount,
      elections: dashboardStats.loading.elections
        ? undefined
        : dashboardStats.electionCount,
      laws: dashboardStats.loading.laws ? undefined : dashboardStats.lawCount,
      ethnicity: dashboardStats.loading.ethnicity
        ? undefined
        : dashboardStats.ethnicityCount,
      trade: tradeRecords.length,
      companies: companyCount,
    }
  }, [
    dashboardStats,
    allCompanies,
    historicalCountryId,
    tradeRecords.length,
  ])
  const headerPeriod = formatCountryPeriod(country)

  const handleTabChange = (tab: HistoricalCountryTab) => {
    if (tab !== 'events') {
      setFocusEventsCentury(null)
    }
    if (tab === 'heads') {
      setGovernmentSubTab('cabinets')
      setActiveTab('government')
      onTabChangeToUrl?.('government')
      return
    }
    setActiveTab(tab)
    if (SYNCED_TAB_SET.has(tab)) {
      onTabChangeToUrl?.(
        tab === 'figures' ? 'persons' : (tab as HistoricalUrlTab),
      )
      return
    }
    onTabChangeToUrl?.(null)
    if (LOCAL_QUERY_TAB_SET.has(tab)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('tab', tab)
          return next
        },
        { replace: true },
      )
    } else if (searchParams.has('tab')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('tab')
          return next
        },
        { replace: true },
      )
    }
  }

  const handleOpenEventsCentury = (century: number, domain?: string) => {
    setFocusEventsCentury(century)
    setActiveTab('events')
    navigate(pathKeys.countryEvents(country.id, undefined, century, domain))
  }

  // URL에서 직접 진입·뒤로가기 시 탭 동기화 — initialTab이 있으면 그 탭, 없으면 synced 탭에 머물러 있을 때만 overview로 복귀.
  useEffect(() => {
    if (initialTab === 'heads' || queryTabParam === 'heads') {
      setGovernmentSubTab('cabinets')
      setActiveTab('government')
      return
    }
    if (initialTab) {
      setActiveTab(initialTab)
      return
    }
    if (queryTabParam && LOCAL_QUERY_TAB_SET.has(queryTabParam)) {
      setActiveTab(queryTabParam)
      return
    }
    setActiveTab((prev) => (SYNCED_TAB_SET.has(prev) ? 'overview' : prev))
  }, [initialTab, queryTabParam])

  return (
    <CountryStyles.DetailPaneRelative>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingOverlay key="loading" message="국가 정보를 불러오는 중..." />
        ) : (
          <motion.div
            key={`content-${country.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ width: '100%', height: '100%' }}
          >
            <CountryStyles.AnalyticsDashboard
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ gap: 0 }}
            >
              {/*
                현대 국가 상세와 같은 골격 — 탭이 맨 위(스티키), 국가 머리글은 개요 탭 안.
                예전엔 썸네일이 없는 나라(대부분)에서도 200px 회색 그라데이션 배너가 모든 탭 위를
                차지했고, 탭 줄은 '변천' 배지와 15개 탭이 한 줄에 끼여 화면 끝에서 잘렸다.
              */}
              <CountryStyles.StickyTopBar>
                <HistoricalCountryTabs
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  counts={tabCounts}
                  contextBar={
                    activeTab !== 'overview' ? (
                      <TabStyles.CompactContextBar>
                        <TabStyles.CompactCountryBtn
                          type="button"
                          onClick={() => handleTabChange('overview')}
                          title="역사 개요로 돌아가기"
                        >
                          <FiArrowLeft aria-hidden />
                          <TabStyles.CompactFlag aria-hidden>
                            {country.thumbnailUrl ? (
                              <img
                                src={getUploadImageUrl(country.thumbnailUrl)}
                                alt=""
                              />
                            ) : (
                              country.flagEmoji || <IconLandmark />
                            )}
                          </TabStyles.CompactFlag>
                          <TabStyles.CompactName>
                            {country.name}
                          </TabStyles.CompactName>
                          {headerPeriod && (
                            <TabStyles.CompactMeta>
                              {headerPeriod}
                            </TabStyles.CompactMeta>
                          )}
                        </TabStyles.CompactCountryBtn>
                        {onEdit && (
                          <TabStyles.CompactActions>
                            <TabStyles.CompactActionBtn
                              type="button"
                              onClick={() => onEdit(country)}
                            >
                              <FiEdit2 aria-hidden />
                              기본 정보 수정
                            </TabStyles.CompactActionBtn>
                          </TabStyles.CompactActions>
                        )}
                      </TabStyles.CompactContextBar>
                    ) : undefined
                  }
                />
              </CountryStyles.StickyTopBar>

              <CountryStyles.TabSwapMotion
                key={activeTab}
                role="tabpanel"
                aria-labelledby={historicalTabId(activeTab)}
                tabIndex={0}
              >
                {activeTab === 'overview' && (
                    <>
                      <CountryDetailHeader
                        country={country}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        fallbackIcon={<IconLandmark />}
                        meta={
                          <HistoricalHeaderMeta
                            country={country}
                            incomingCategoryLabel={incomingCategoryLabel}
                            linkedModernCountries={linkedModernCountries}
                            onNavigateModernCountry={(modernId) =>
                              navigate(pathKeys.countryDetail(modernId))
                            }
                          />
                        }
                      />
                      <HistoricalOverviewSection
                        country={country}
                        linkedModernCountries={linkedModernCountries}
                        onEdit={onEdit ? () => onEdit(country) : undefined}
                        onGoToTab={handleTabChange}
                        onOpenGovernmentSubTab={(subTab) => {
                          if (subTab === 'military') {
                            handleTabChange('military')
                            return
                          }
                          setGovernmentSubTab(subTab)
                          handleTabChange('government')
                        }}
                        onOpenEventsCentury={handleOpenEventsCentury}
                      />
                    </>
                  )}
                  {/*
                    주요 사건 — 현대 국가와 동일한 연대표 위젯을 재사용한다.
                    사건 목록 API는 countryId에 역사국가 id를 넣으면
                    event_country_relation.historicalCountryId로 매칭된다.
                  */}
                  {activeTab === 'events' && (
                    <EventsTimelineSection
                      countryId={country.id}
                      countryName={country.name}
                      isHistoricalCountry
                      focusCentury={
                        focusEventsCentury != null
                          ? String(focusEventsCentury)
                          : null
                      }
                    />
                  )}
                  {activeTab === 'figures' && (
                    <CountryPersonsSection
                      country={country}
                      onGoToGovernment={() => {
                        setGovernmentSubTab('cabinets')
                        handleTabChange('government')
                      }}
                    />
                  )}
                  {activeTab === 'regions' && (
                    <HistoricalRegionsSection country={country} />
                  )}
                  {activeTab === 'government' && (
                    <CountryStyles.TabContentPane>
                      <GovernmentInfoSection
                        country={country}
                        initialContentTab={governmentSubTab}
                      />
                    </CountryStyles.TabContentPane>
                  )}
                  {activeTab === 'military' && (
                    <CountryStyles.TabContentPane>
                      <CountryMilitarySection country={country} />
                    </CountryStyles.TabContentPane>
                  )}
                  {activeTab === 'elections' && (
                    <CountryStyles.TabContentPane>
                      <CountryElectionsSection
                        historicalCountryId={country.id}
                      />
                    </CountryStyles.TabContentPane>
                  )}
                  {activeTab === 'laws' && (
                    <CountryStyles.TabContentPane>
                      <CountryLawsSection historicalCountryId={country.id} />
                    </CountryStyles.TabContentPane>
                  )}
                  {activeTab === 'ethnicity' && (
                    <EthnicitySection historicalCountryId={country.id} />
                  )}
                  {/*
                    교역 — 예전에는 현대 국가 전용이라 조선·청의 무역을 담을 자리가
                    아예 없었다. 편집 패널은 현대·역사 국가를 함께 다룬다.
                  */}
                  {activeTab === 'trade' && (
                    <div
                      style={{
                        maxWidth: '100%',
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        alignSelf: 'stretch',
                      }}
                    >
                      <CountryTradeSection
                        historicalCountryId={country.id}
                        countryName={country.name}
                      />
                    </div>
                  )}
                  {activeTab === 'companies' && (
                    <div
                      style={{
                        maxWidth: '100%',
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        alignSelf: 'stretch',
                      }}
                    >
                      <CountryCompaniesTabSection country={country} />
                    </div>
                  )}
                  {activeTab === 'succession' && (
                    <SuccessionSection country={country} />
                  )}
                  {activeTab === 'membership' && (
                    <MembershipSection country={country} />
                  )}
                  {activeTab === 'relation' && (
                    <RelationSection country={country} />
                  )}
                  {/*
                    조약 — 위젯의 Wrap은 자체 스크롤이 없다. 역사국가 상세의 탭 패널은
                    flex/minHeight:0 컨테이너라 교역 탭과 같은 스크롤 래퍼가 필요하다.
                  */}
                  {activeTab === 'treaty' && (
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        alignSelf: 'stretch',
                      }}
                    >
                      <TreatySectionWidget country={country} />
                    </div>
                  )}
              </CountryStyles.TabSwapMotion>
            </CountryStyles.AnalyticsDashboard>
          </motion.div>
        )}
      </AnimatePresence>
    </CountryStyles.DetailPaneRelative>
  )
}

// ============================================
// 역사적 국가 헤더 (현대 국가와 동일 레이아웃/스타일)
// ============================================

/** 머리글 메타 줄 — 영문 표기 · 존속 기간 · 국가 형태 · 변천 · 연결 현대 국가 */
function HistoricalHeaderMeta({
  country,
  incomingCategoryLabel,
  linkedModernCountries = [],
  onNavigateModernCountry,
}: {
  country: UnifiedCountry
  incomingCategoryLabel?: string | null
  linkedModernCountries?: Country[]
  onNavigateModernCountry?: (modernId: string) => void
}) {
  const period = formatCountryPeriod(country)
  const entityKind = country.entityKind
  const entityKindLabel = entityKind ? ENTITY_KIND_LABELS[entityKind] : null
  return (
    <>
      {country.enName && <CountryStyles.HeroLocalName>{country.enName}</CountryStyles.HeroLocalName>}
      {country.enName && period && <CountryStyles.HeroMetaSep aria-hidden>·</CountryStyles.HeroMetaSep>}
      {period && <span>{period}</span>}
      {country.stateType && (
        <CountryStyles.HeroMetaChip>{getStateTypeLabel(country.stateType)}</CountryStyles.HeroMetaChip>
      )}
      {entityKind && entityKind !== 'STATE' && entityKindLabel && (
        <CountryStyles.HeroMetaChip title="역사적 단위 분류">
          {entityKindLabel}
        </CountryStyles.HeroMetaChip>
      )}
      {incomingCategoryLabel && (
        <CountryStyles.HeroMetaChip title="이 나라가 성립한 변천 유형">
          {incomingCategoryLabel}
        </CountryStyles.HeroMetaChip>
      )}
      {linkedModernCountries.map((modern) => (
        <HeaderModernLinkBtn
          key={modern.id}
          type="button"
          title={`${modern.name} 현대 국가 상세로 이동`}
          onClick={() => onNavigateModernCountry?.(modern.id)}
        >
          현대: {modern.name} →
        </HeaderModernLinkBtn>
      ))}
    </>
  )
}

// 국가 형태 한글 라벨
function getStateTypeLabel(stateType: string): string {
  const labels: Record<string, string> = {
    EMPIRE: '제국',
    KINGDOM: '왕국',
    REPUBLIC: '공화국',
    DUCHY: '공국',
    PRINCIPALITY: '공국',
    ELECTORATE: '선제후국',
    MARGRAVIATE: '변경백령',
    CONFEDERATION: '연합',
    CITY_STATE: '도시국가',
    CALIPHATE: '칼리프국',
    SULTANATE: '술탄국',
    KHANATE: '칸국',
    THEOCRACY: '신정 국가',
    TRIBAL_STATE: '부족 국가',
    NOMADIC_EMPIRE: '유목 제국',
    TRIBAL_UNION: '부족연합',
    DYNASTY: '왕조',
    HEREDITARY: '세습',
    PERSONAL_UNION: '동군연합',
    OTHER: '기타',
  }
  return labels[stateType] || stateType
}

// ============================================
// 탭 — 현대 국가 상세와 같은 밑줄 탭(스티키 상단)
// ============================================

/**
 * 순서 = 이 나라를 이해하는 순서: 개요 → 사건·인물·수반 → 나라 사이 관계(계승·소속·관계·조약)
 * → 내부 제도(행정·법·민족·교역·선거). '문화'는 기능이 없는 자리표시라 목록에서 뺐다
 * (URL로 들어오면 안내 화면은 그대로 뜬다).
 */
const HISTORICAL_TABS: ReadonlyArray<{
  id: HistoricalCountryTab
  label: string
  groupEnd?: boolean
}> = [
  // 1. 종합 개요
  { id: 'overview', label: '대시보드', groupEnd: true },
  // 2. 통치·정치·제도 (현대 국가와 동일한 핵심 위치)
  { id: 'government', label: '정부·행정' },
  { id: 'elections', label: '정당·선거' },
  { id: 'laws', label: '법령', groupEnd: true },
  // 3. 역사·인물·계승 (시간축 서사 및 정통성 계보)
  { id: 'events', label: '사건' },
  { id: 'figures', label: '인물' },
  { id: 'succession', label: '계승', groupEnd: true },
  // 4. 강역·군사·대외 관계
  { id: 'regions', label: '행정구역' },
  { id: 'military', label: '군사' },
  { id: 'treaty', label: '조약' },
  { id: 'relation', label: '국가 관계' },
  { id: 'membership', label: '소속·구성', groupEnd: true },
  // 5. 경제·산업·사회
  { id: 'trade', label: '교역' },
  { id: 'companies', label: '기업' },
  { id: 'ethnicity', label: '민족' },
]

const historicalTabId = (tab: HistoricalCountryTab) => `historical-country-tab-${tab}`

function HistoricalCountryTabs({
  activeTab,
  onTabChange,
  counts,
  contextBar,
}: {
  activeTab: HistoricalCountryTab
  onTabChange: (tab: HistoricalCountryTab) => void
  counts?: Partial<Record<HistoricalCountryTab, number>>
  contextBar?: ReactNode
}) {
  const listRef = useRef<HTMLDivElement | null>(null)

  /* WAI-ARIA tabs — ←/→ 이웃 탭, Home/End 처음/끝(현대 국가 상세 OverviewSubTabs와 같은 규약) */
  const handleKeyDown = (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(keyEvent.key)) return
    keyEvent.preventDefault()
    const index = HISTORICAL_TABS.findIndex((tab) => tab.id === activeTab)
    const last = HISTORICAL_TABS.length - 1
    const nextIndex =
      keyEvent.key === 'Home'
        ? 0
        : keyEvent.key === 'End'
          ? last
          : keyEvent.key === 'ArrowLeft'
            ? index > 0 ? index - 1 : last
            : index < last ? index + 1 : 0
    const target = HISTORICAL_TABS[nextIndex]
    onTabChange(target.id)
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLButtonElement>(`#${CSS.escape(historicalTabId(target.id))}`)
        ?.focus()
    })
  }

  return (
    <TabStyles.StickyContainer>
      {contextBar}
      <TabStyles.Row>
        <TabStyles.Left>
          <TabStyles.TopUnderlineTabNav
            ref={listRef}
            role="tablist"
            aria-label="역사 국가 상세 메뉴"
            onKeyDown={handleKeyDown}
          >
            {HISTORICAL_TABS.map((tab) => {
              const active = activeTab === tab.id
              const count = counts?.[tab.id]
              const isEmptyTab =
                tab.id !== 'overview' &&
                !active &&
                count !== undefined &&
                count === 0

              return (
                <Fragment key={tab.id}>
                  <UnderlineTabButton
                    id={historicalTabId(tab.id)}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    $active={active}
                    data-empty={isEmptyTab ? '' : undefined}
                    onClick={() => onTabChange(tab.id)}
                  >
                    <TabStyles.TabLabelWrap $empty={isEmptyTab}>
                      <span>{tab.label}</span>
                      {count != null && count > 0 && (
                        <TabStyles.TabCountBadge $active={active}>
                          {count.toLocaleString('ko-KR')}
                        </TabStyles.TabCountBadge>
                      )}
                    </TabStyles.TabLabelWrap>
                  </UnderlineTabButton>
                  {tab.groupEnd && <TabStyles.TabGroupDivider aria-hidden />}
                </Fragment>
              )
            })}
          </TabStyles.TopUnderlineTabNav>
        </TabStyles.Left>
      </TabStyles.Row>
    </TabStyles.StickyContainer>
  )
}

// ============================================
// 역사 개요 섹션 (Bento Infographic Board)
// ============================================

function HistoricalOverviewSection({
  country,
  linkedModernCountries = [],
  onEdit,
  onGoToTab,
  onOpenGovernmentSubTab,
  onOpenEventsCentury,
}: {
  country: UnifiedCountry
  linkedModernCountries?: Country[]
  onEdit?: () => void
  onGoToTab: (tab: HistoricalCountryTab) => void
  onOpenGovernmentSubTab?: (
    subTab: 'system' | 'cabinets' | 'ministries' | 'military',
  ) => void
  onOpenEventsCentury: (century: number, domain?: string) => void
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const needsFullRecord =
    country.description === undefined ||
    country.nameOrigin === undefined ||
    country.history === undefined ||
    country.entityKind === undefined
  const fullRecordQuery = useHistoricalCountry(
    needsFullRecord ? country.id : '',
  )
  const resolvedDescription =
    country.description !== undefined
      ? country.description
      : fullRecordQuery.data?.description
  const resolvedNameOrigin =
    country.nameOrigin !== undefined
      ? country.nameOrigin
      : (fullRecordQuery.data as { nameOrigin?: string | null } | undefined)
          ?.nameOrigin
  const resolvedHistory =
    country.history !== undefined
      ? country.history
      : (fullRecordQuery.data as { history?: string | null } | undefined)
          ?.history
  const entityKind = (
    country.entityKind !== undefined
      ? country.entityKind
      : (
          fullRecordQuery.data as
            | { entityKind?: UnifiedCountry['entityKind'] }
            | undefined
        )?.entityKind
  ) as 'STATE' | 'REGIME' | 'PERIOD' | 'PEOPLE' | null | undefined

  const [savedDescription, setSavedDescription] = useState<
    string | null | undefined
  >(() => resolvedDescription)
  const editorValueRef = useRef('')

  useEffect(() => {
    setSavedDescription(resolvedDescription)
  }, [country.id, resolvedDescription])

  const updateMutation = useMutation({
    mutationFn: (description: string) =>
      updateHistoricalCountry(country.id, {
        description: description || undefined,
      }),
    onSuccess: (_, description) => {
      setSavedDescription(description || null)
      setIsEditorOpen(false)
      void queryClient.invalidateQueries({
        queryKey: historicalCountryKeys.detail(country.id),
      })
      notify.success('개요가 저장되었습니다.')
    },
    onError: () => {
      notify.error('저장 중 오류가 발생했습니다.')
    },
  })

  const handleOpenEditor = useCallback(() => {
    editorValueRef.current = savedDescription ?? ''
    setIsEditorOpen(true)
  }, [savedDescription])

  const handleSave = useCallback(() => {
    updateMutation.mutate(editorValueRef.current)
  }, [updateMutation])

  const handleClose = useCallback(() => {
    setIsEditorOpen(false)
  }, [])

  const { data: tradeRecords = [] } = useTradeRecords(
    country.id ? { historicalCountryId: country.id } : {},
  )
  const { data: allCompanies = [] } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => companyApi.getAll(),
    staleTime: 60_000,
    enabled: Boolean(country.id),
  })
  const companyCount = useMemo(
    () =>
      allCompanies.filter(
        (company) => company.historicalCountryId === country.id,
      ).length,
    [allCompanies, country.id],
  )
  const tradeYearCount = useMemo(
    () => new Set(tradeRecords.map((row) => row.year)).size,
    [tradeRecords],
  )

  const period = formatCountryPeriod(country, { emptyText: '알 수 없음' })
  const durationYears = getCountryDurationYears(country)
  const entityKindLabel = entityKind ? ENTITY_KIND_LABELS[entityKind] : null
  const stateTypeLabel = country.stateType
    ? getStateTypeLabel(country.stateType)
    : null

  const stats = useHistoricalCountryDashboard(country, savedDescription)
  const span = getCountryYearRange(country)
  const [previewEventId, setPreviewEventId] = useState<string | null>(null)
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null)
  const [focusedTenureId, setFocusedTenureId] = useState<string | null>(null)
  const [activeMindMapTenureId, setActiveMindMapTenureId] = useState<
    string | null
  >(null)

  const capitalText = country.capital ? String(country.capital).trim() : ''
  const effectiveCapital = capitalText || stats.capitalDivisionName || ''
  const hasGeoLocation =
    stats.divisionCount > 0 ||
    (country.latitude != null && country.longitude != null)

  const goFill = (field: CompletenessField) => {
    const target = (field as HistoricalCompletenessField).historicalTarget
    if (target === 'overview') {
      handleOpenEditor()
      return
    }
    if (target === 'founding') {
      onGoToTab('succession')
      return
    }
    if (
      target === 'government' &&
      field.governmentSubTab &&
      onOpenGovernmentSubTab
    ) {
      onOpenGovernmentSubTab(field.governmentSubTab)
      return
    }
    onGoToTab(target)
  }

  const missingChips = useMemo<MissingAxisChip[]>(
    () =>
      stats.completeness.missing.map((field) => ({
        key: field.key,
        label: field.label,
        onClick: () => goFill(field),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats.completeness.missing, country.id],
  )

  const totalRecords =
    stats.personCount +
    stats.eventCount +
    stats.transitionCount +
    stats.membershipCount +
    stats.relationCount +
    stats.treatyCount +
    stats.administrationCount +
    stats.militaryCount +
    stats.divisionCount +
    stats.lawCount +
    stats.ethnicityCount +
    stats.electionCount +
    tradeYearCount +
    companyCount

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
      act.kind === 'political-system' ||
      act.kind === 'cabinet' ||
      act.kind === 'department'
    ) {
      onGoToTab('government')
    } else if (act.kind === 'city') {
      onGoToTab('regions')
    } else if (act.kind === 'law') {
      onGoToTab('laws')
    } else if (act.kind === 'treaty') {
      onGoToTab('treaty')
    } else if (act.kind === 'election') {
      onGoToTab('elections')
    }
  }

  const { data: territoryChanges = [] } = useQuery({
    queryKey: territoryTransferKeys.party('historical', country.id),
    queryFn: () => getHistoricalCountryTerritoryChanges(country.id),
    enabled: Boolean(country.id),
    staleTime: 60_000,
  })
  const hasTerritoryCard = territoryChanges.length > 0
  const hasLineageCard =
    stats.lineage.length > 1 ||
    linkedModernCountries.length > 0 ||
    stats.membershipCount + stats.relationCount + stats.treatyCount > 0

  const domainArchiveCard = (
    <HistoricalDomainArchiveCard
      items={[
        {
          key: 'figures',
          label: '소속 인물',
          count: stats.personCount,
          unit: '명',
          onOpen: () => onGoToTab('figures'),
        },
        {
          key: 'events',
          label: '역사 사건',
          count: stats.eventCount,
          unit: '건',
          onOpen: () => onGoToTab('events'),
        },
        {
          key: 'government',
          label: '정부·관직',
          count: stats.administrationCount + stats.rulers.length,
          unit: '건',
          onOpen: () => onGoToTab('government'),
        },
        {
          key: 'military',
          label: '군사 편제',
          count: stats.militaryCount,
          unit: '개',
          onOpen: () => onGoToTab('military'),
        },
        {
          key: 'regions',
          label: '행정구역',
          count: stats.divisionCount,
          unit: '개',
          onOpen: () => onGoToTab('regions'),
        },
        {
          key: 'laws',
          label: '법령·율령',
          count: stats.lawCount,
          unit: '건',
          onOpen: () => onGoToTab('laws'),
        },
        {
          key: 'treaty',
          label: '체결 조약',
          count: stats.treatyCount,
          unit: '건',
          onOpen: () => onGoToTab('treaty'),
        },
        {
          key: 'ethnicity',
          label: '구성 민족',
          count: stats.ethnicityCount,
          unit: '개',
          onOpen: () => onGoToTab('ethnicity'),
        },
        {
          key: 'relation',
          label: '계승·외교',
          count:
            stats.transitionCount +
            stats.membershipCount +
            stats.relationCount,
          unit: '건',
          onOpen: () => onGoToTab('succession'),
        },
        {
          key: 'trade',
          label: '교역·상단',
          count: tradeYearCount + companyCount,
          unit: '건',
          onOpen: () =>
            onGoToTab(tradeYearCount > 0 ? 'trade' : 'companies'),
        },
      ]}
    />
  )

  const hasEventsOrMilitary =
    stats.eventCenturyDomainCounts.length > 0 ||
    stats.milestoneEvents.length > 0 ||
    stats.militaryCount > 0 ||
    tradeYearCount > 0 ||
    companyCount > 0

  const eventsAndForceCard = hasEventsOrMilitary ? (
    <BentoCard aria-label="세기별 역사 사건 밀도 및 군사·교역 요약">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>세기별 사건 매트릭스 · 분수령 사건 · 군사</BentoCardTitle>
          {stats.eventCount > 0 ? (
            <BentoCardBadge>사건 {stats.eventCount}건</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          {tradeYearCount > 0 ? (
            <BentoActionBtn type="button" onClick={() => onGoToTab('trade')}>
              교역 {tradeYearCount}개년
            </BentoActionBtn>
          ) : null}
          {companyCount > 0 ? (
            <BentoActionBtn
              type="button"
              onClick={() => onGoToTab('companies')}
            >
              기업·상단 {companyCount}
            </BentoActionBtn>
          ) : null}
          <BentoActionBtn
            type="button"
            $accent
            onClick={() => onGoToTab('events')}
          >
            주요 사건 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {stats.eventCenturyDomainCounts.length > 0 ||
        stats.milestoneEvents.length > 0 ? (
          <CenturyEventMatrixAndMilestones
            buckets={stats.eventCenturyDomainCounts}
            domainBreakdown={stats.eventDomainBreakdown}
            milestones={stats.milestoneEvents}
            onSelectCentury={(cent) => onOpenEventsCentury(cent)}
            onSelectCell={(cent, dom) => onOpenEventsCentury(cent, dom)}
            onSelectEvent={(eid) => setPreviewEventId(eid)}
          />
        ) : null}

        {(stats.militaryCount > 0 ||
          stats.warSummary.totalMilitaryEvents > 0) && (
          <>
            {stats.eventCenturyDomainCounts.length > 0 ||
            stats.milestoneEvents.length > 0 ? (
              <BentoDivider />
            ) : null}
            <MilitaryForceInfographicBlock
              militaryCount={stats.militaryCount}
              highCommandCount={stats.highCommandCount}
              branchBreakdown={stats.militaryBranchBreakdown}
              warSummary={stats.warSummary}
              onOpenMilitary={() => onGoToTab('military')}
            />
          </>
        )}
      </BentoCardBody>
    </BentoCard>
  ) : null

  return (
    <DashboardRoot ref={rootRef}>
      <BentoCanvas>
        {/* 1단 (전폭 히어로): 통치 군주·황제 & 당대 조정 관서·내각 마인드맵 */}
        <ExecutiveMindMapBentoHero
          historicalCountryId={country.id}
          countryName={country.name}
          focusedTenureId={focusedTenureId}
          onActiveTenureChange={setActiveMindMapTenureId}
          onEditOverview={handleOpenEditor}
          onOpenPoliticalSystem={() =>
            onOpenGovernmentSubTab
              ? onOpenGovernmentSubTab('system')
              : onGoToTab('government')
          }
          onOpenCabinets={() =>
            onOpenGovernmentSubTab
              ? onOpenGovernmentSubTab('cabinets')
              : onGoToTab('government')
          }
          onOpenMinistries={() =>
            onOpenGovernmentSubTab
              ? onOpenGovernmentSubTab('ministries')
              : onGoToTab('government')
          }
          onOpenElections={() => onGoToTab('elections')}
          onSelectPerson={(pid) => setPreviewPersonId(pid)}
        />

        {/* 2단: 역대 통치자 비례 치세 스펙트럼 (클릭 시 상단 마인드맵 즉시 연동) */}
        <HistoricalRulerSpectrumCard
          rulers={stats.rulers}
          politicalSystems={stats.politicalSystems}
          spanStart={span.start}
          spanEnd={span.end}
          activeTenureId={activeMindMapTenureId}
          onFocusRulerTenure={(tid) => setFocusedTenureId(tid)}
          onSelectPerson={(pid) => setPreviewPersonId(pid)}
          onOpenPoliticalSystem={() =>
            onOpenGovernmentSubTab
              ? onOpenGovernmentSubTab('system')
              : onGoToTab('government')
          }
          onOpenRulersTab={() =>
            onOpenGovernmentSubTab
              ? onOpenGovernmentSubTab('cabinets')
              : onGoToTab('government')
          }
        />

        {/* 3단: 왕조·정치체 정체성 & 성립 → 존속 → 종식 타임라인 플로우 */}
        <HistoricalHeroFlowCard
          countryName={country.name}
          periodLabel={period}
          durationYears={durationYears}
          stateTypeLabel={stateTypeLabel}
          entityKindLabel={entityKindLabel}
          effectiveCapital={effectiveCapital}
          savedDescription={savedDescription}
          nameOrigin={resolvedNameOrigin}
          historyText={resolvedHistory}
          isEditorOpen={isEditorOpen}
          isSaving={updateMutation.isPending}
          onEditorChange={(html) => {
            editorValueRef.current = html
          }}
          onOpenEditor={handleOpenEditor}
          onSaveEditor={handleSave}
          onCancelEditor={handleClose}
          onEditBasic={onEdit}
          founding={stats.founding}
          rulersCount={stats.rulers.length}
          politicalSystems={stats.politicalSystems}
          onOpenGovernment={() =>
            onOpenGovernmentSubTab
              ? onOpenGovernmentSubTab('system')
              : onGoToTab('government')
          }
          onOpenSuccession={() => onGoToTab('succession')}
          onSelectPerson={(pid) => setPreviewPersonId(pid)}
          onSelectEvent={(eid) => setPreviewEventId(eid)}
        />

        {/* 3단: 전후 계승 스팬·대외 관계 & 강역 변천 워터폴 / 도메인 아카이브 스냅샷 (빈 칸 없는 적응형 페어링) */}
        {hasLineageCard && hasTerritoryCard ? (
          <>
            <BentoGrid2Col>
              <HistoricalLineageDiplomacyCard
                currentId={country.id}
                lineage={stats.lineage}
                linkedModernCountries={linkedModernCountries}
                membershipCount={stats.membershipCount}
                relationCount={stats.relationCount}
                treatyCount={stats.treatyCount}
                onSelectCountry={(cid) => navigate(pathKeys.countryDetail(cid))}
                onOpenSuccession={() => onGoToTab('succession')}
                onOpenMembership={() => onGoToTab('membership')}
                onOpenRelations={() => onGoToTab('relation')}
                onOpenTreaties={() => onGoToTab('treaty')}
              />

              <HistoricalTerritoryWaterfallCard
                historicalCountryId={country.id}
                onSelectEvent={(eid) => setPreviewEventId(eid)}
              />
            </BentoGrid2Col>
            {domainArchiveCard}
          </>
        ) : hasLineageCard ? (
          <BentoGrid2Col>
            <HistoricalLineageDiplomacyCard
              currentId={country.id}
              lineage={stats.lineage}
              linkedModernCountries={linkedModernCountries}
              membershipCount={stats.membershipCount}
              relationCount={stats.relationCount}
              treatyCount={stats.treatyCount}
              onSelectCountry={(cid) => navigate(pathKeys.countryDetail(cid))}
              onOpenSuccession={() => onGoToTab('succession')}
              onOpenMembership={() => onGoToTab('membership')}
              onOpenRelations={() => onGoToTab('relation')}
              onOpenTreaties={() => onGoToTab('treaty')}
            />
            {domainArchiveCard}
          </BentoGrid2Col>
        ) : hasTerritoryCard ? (
          <BentoGrid2Col>
            <HistoricalTerritoryWaterfallCard
              historicalCountryId={country.id}
              onSelectEvent={(eid) => setPreviewEventId(eid)}
            />
            {domainArchiveCard}
          </BentoGrid2Col>
        ) : (
          domainArchiveCard
        )}

        {/* 4단: 세기별 사건·군사력 & (좌표·행정구역 보유 시) 컴팩트 강역 지도 */}
        {eventsAndForceCard && hasGeoLocation ? (
          <BentoGridAsym $leftFr={1.3} $rightFr={1}>
            {eventsAndForceCard}
            <CompactGeoBentoCard
              country={country}
              cityCount={stats.divisionCount}
              onOpenRegions={(divId) => {
                if (divId) {
                  navigate(
                    `${pathKeys.countryRegions(country.id)}?division_id=${encodeURIComponent(divId)}`,
                  )
                } else {
                  onGoToTab('regions')
                }
              }}
            />
          </BentoGridAsym>
        ) : (
          <>
            {eventsAndForceCard}
            {hasGeoLocation ? (
              <CompactGeoBentoCard
                country={country}
                cityCount={stats.divisionCount}
                onOpenRegions={(divId) => {
                  if (divId) {
                    navigate(
                      `${pathKeys.countryRegions(country.id)}?division_id=${encodeURIComponent(divId)}`,
                    )
                  } else {
                    onGoToTab('regions')
                  }
                }}
              />
            ) : null}
          </>
        )}

        {/* 5단: 소속 인물 역할·시대 분포 도넛 & 주요 인물 초상 갤러리 */}
        <FiguresSpotlightBentoCard
          spotlight={stats.personSpotlight}
          personCount={stats.personCount}
          onSelectPerson={(pid) => setPreviewPersonId(pid)}
          onOpenPersonsTab={() => onGoToTab('figures')}
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
    </DashboardRoot>
  )
}

const DashboardRoot = styled(DashboardStyles.DashboardRoot)`
  container-type: inline-size;
  container-name: historical-dashboard;
`

// ============================================
// 행정구역 섹션 — 현대 국가와 동일한 등록/드릴다운 UI를 historicalCountryId 소속으로 사용
// ============================================

function HistoricalRegionsSection({ country }: { country: UnifiedCountry }) {
  const [mapLocation, setMapLocation] = useState<{
    latitude: number
    longitude: number
    name: string
  } | null>(null)

  return (
    <HistoricalRegionsPane>
      <SectionTabHeader
        variant="plain"
        title="행정구역 · 강역 편제"
        description="시기별 행정구역 체계(도·주·부·목·군·현)와 치소 좌표, 개편 계보를 인포그래픽과 계층 트리로 탐색합니다."
      />
      <MapRegionAdministrativeView
        country={{
          id: country.id,
          name: country.name,
          latitude: country.latitude ?? null,
          longitude: country.longitude ?? null,
        }}
        owner={{ historicalCountryId: country.id }}
        mapLocation={mapLocation}
        onCityClick={(loc) => {
          if (!loc.id) {
            setMapLocation(null)
            return
          }
          setMapLocation({
            latitude: loc.latitude,
            longitude: loc.longitude,
            name: loc.name,
          })
        }}
      />
    </HistoricalRegionsPane>
  )
}

const HistoricalRegionsPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 24px 32px;
  min-height: calc(100vh - 300px);
`

/* 역사 국가의 행정조직 탭 = 정체 + 안내 한 줄 */
const HistoricalGovernmentPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 24px 32px;
  flex: 1;
  min-height: 0;
`

const HistoricalGovernmentNote = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeaderModernLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 4px;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.active};
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const ModernLinkStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ModernLinkLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const ModernLinkItems = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ModernLinkPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border: 1px solid rgba(99, 102, 241, 0.28);
  border-radius: 5px;
  background: rgba(99, 102, 241, 0.08);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
  }
`

const ModernLinkMutedText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ModernLinkActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 5px;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
    border-color: rgba(99, 102, 241, 0.4);
  }
`

const LineageHeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  flex-wrap: wrap;
`

const LineageHeaderBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.active};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const LineageInlineLink = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`
