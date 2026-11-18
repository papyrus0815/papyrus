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
  getPersonsByHistoricalCountryUnion,
  type PersonResponseDto,
} from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
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
import { CountryPersonGroupsBlock } from './country-person-groups-block.widget'
import { CountryTradeSection } from './country-trade-section.widget'
import { EthnicitySection } from './ethnicity-section.widget'
import { EventsTimelineSection } from './events-timeline-section.widget'
import { GovernmentInfoSection } from './government-info-section.widget'
import { PersonCard } from './person/person-card'
import { TreatySectionWidget } from './treaty-section.widget'
import { LoadingOverlay } from './loading-overlay'
import { MapRegionAdministrativeView } from './map-region-administrative-view'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'
import {
  MembershipSection,
  RelationSection,
  SuccessionSection,
  TRANSITION_EVENT_LABELS,
} from './historical-relations-sections'
import { CountryDetailHeader } from './country-detail-header.widget'
import * as TabStyles from './overview-sub-tabs.styles'
import * as DashboardStyles from './country-detail-dashboard.styles'
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
  MilitaryForceInfographicBlock,
  type MissingAxisChip,
  StackedCenturyDomainChart,
} from './dashboard-infographic/bento-primitives'
import {
  HistoricalHeroFlowCard,
  HistoricalLineageDiplomacyCard,
  HistoricalRulerSpectrumCard,
  HistoricalTerritoryWaterfallCard,
} from './dashboard-infographic/historical-bento-cards'
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
  >(() =>
    initialTab === 'heads' || queryTabParam === 'heads' ? 'cabinets' : 'system',
  )
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
        : dashboardStats.administrationCount,
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
      setGovernmentSubTab('system')
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

  const handleOpenEventsCentury = (century: number) => {
    setFocusEventsCentury(century)
    handleTabChange('events')
  }

  // URL에서 직접 진입·뒤로가기 시 탭 동기화 — initialTab이 있으면 그 탭, 없으면 synced 탭에 머물러 있을 때만 overview로 복귀.
  useEffect(() => {
    if (initialTab === 'heads' || queryTabParam === 'heads') {
      setGovernmentSubTab('system')
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
                      focusCentury={
                        focusEventsCentury != null
                          ? String(focusEventsCentury)
                          : null
                      }
                    />
                  )}
                  {activeTab === 'figures' && (
                    <HistoricalFiguresSection
                      country={country}
                      onGoToHeads={() => {
                        setGovernmentSubTab('cabinets')
                        handleTabChange('government')
                      }}
                    />
                  )}
                  {activeTab === 'regions' && (
                    <HistoricalRegionsSection country={country} />
                  )}
                  {activeTab === 'government' && (
                    /*
                      역사국가도 정체·역대 수반·행정부(내각)·중앙부처(6조/내각 각 성 등)를
                      현대 국가와 동일한 통합 정부·행정 섹션으로 관리한다.
                    */
                    <GovernmentInfoSection
                      country={country}
                      initialContentTab={governmentSubTab}
                    />
                  )}
                  {activeTab === 'military' && (
                    <CountryMilitarySection country={country} />
                  )}
                  {activeTab === 'elections' && (
                    <div
                      style={{
                        padding: '16px 24px 32px',
                        maxWidth: '100%',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignSelf: 'stretch',
                      }}
                    >
                      <CountryElectionsSection
                        historicalCountryId={country.id}
                      />
                    </div>
                  )}
                  {activeTab === 'laws' && (
                    <div
                      style={{
                        padding: '16px 24px 32px',
                        maxWidth: '100%',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignSelf: 'stretch',
                      }}
                    >
                      <CountryLawsSection historicalCountryId={country.id} />
                    </div>
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
  // id는 URL·동기화 탭 키라 그대로 두고 이름만 — 현대 국가 지면도 '대시보드'다
  { id: 'overview', label: '대시보드', groupEnd: true },
  { id: 'events', label: '사건' },
  { id: 'figures', label: '인물', groupEnd: true },
  { id: 'succession', label: '계승' },
  { id: 'membership', label: '소속·구성' },
  { id: 'relation', label: '국가 관계' },
  { id: 'treaty', label: '조약', groupEnd: true },
  { id: 'government', label: '정부·행정' },
  { id: 'military', label: '군사' },
  { id: 'regions', label: '행정구역' },
  { id: 'laws', label: '법령' },
  { id: 'ethnicity', label: '민족', groupEnd: true },
  { id: 'trade', label: '교역' },
  { id: 'companies', label: '기업' },
  { id: 'elections', label: '정당·선거' },
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
  onOpenEventsCentury: (century: number) => void
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

  const hasEventsOrMilitary =
    stats.eventCenturyDomainCounts.length > 0 ||
    stats.militaryCount > 0 ||
    tradeYearCount > 0 ||
    companyCount > 0

  const eventsAndForceCard = hasEventsOrMilitary ? (
    <BentoCard aria-label="세기별 역사 사건 밀도 및 군사·교역 요약">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>세기별 사건 리듬 · 군사 · 경제</BentoCardTitle>
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
        {stats.eventCenturyDomainCounts.length > 0 ? (
          <div>
            <StackedCenturyDomainChart
              buckets={stats.eventCenturyDomainCounts}
              domainBreakdown={stats.eventDomainBreakdown}
              onSelectCentury={onOpenEventsCentury}
            />
          </div>
        ) : null}

        {(stats.militaryCount > 0 ||
          stats.warSummary.totalMilitaryEvents > 0) && (
          <>
            {stats.eventCenturyDomainCounts.length > 0 ? (
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
        {/* 1단: 왕조·정치체 정체성 & 성립 → 존속 → 종식 타임라인 플로우 */}
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

        {/* 2단: 역대 통치자 비례 치세 스펙트럼 */}
        <HistoricalRulerSpectrumCard
          rulers={stats.rulers}
          spanStart={span.start}
          spanEnd={span.end}
          onSelectPerson={(pid) => setPreviewPersonId(pid)}
          onOpenRulersTab={() =>
            onOpenGovernmentSubTab
              ? onOpenGovernmentSubTab('cabinets')
              : onGoToTab('government')
          }
        />

        {/* 3단: 전후 계승 스팬·대외 관계 & 강역 변천 워터폴 */}
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
// 주요 인물 섹션
// ============================================

/**
 * 주요 인물 탭 — 이 역사국가 소속 인물(주 국적 + 재임 + 소속 3원 합집합).
 *
 * 과거에는 국가명 includes('조선'|'고려') 매칭으로 하드코딩 목업을 렌더해
 * '조선민주주의인민공화국'(북한) 상세에 조선왕조 인물이 실데이터처럼 표시됐다.
 * 재임 단독 API를 쓰던 것을 3원 합집합(GET /persons/by-historical-country/:id)으로
 * 대체 — 재임 없는 문인·학자(현대 국가 상세와 동일 기준)도 포함된다.
 */
function HistoricalFiguresSection({
  country,
  onGoToHeads,
}: {
  country: UnifiedCountry
  onGoToHeads?: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'tenured' | 'lifespan' | 'portrait'
  >('all')
  const [viewMode, setViewMode] = useState<'ledger' | 'cards'>('ledger')
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)

  const { data: figures = [], isLoading } = useQuery({
    queryKey: ['historical-country-union-persons', country.id],
    queryFn: () => getPersonsByHistoricalCountryUnion(country.id),
    enabled: !!country.id,
  })

  const hasTenure = (person: PersonResponseDto) => {
    const tenures = (
      person as PersonResponseDto & {
        governmentTenures?: Array<{
          title?: string | null
          positionDefinition?: { title?: string | null; name?: string | null } | null
        }>
      }
    ).governmentTenures
    return Boolean(
      (tenures && tenures.length > 0) ||
        (person as PersonResponseDto & { jobTitle?: string | null }).jobTitle,
    )
  }

  const getPrimaryRoleLabel = (person: PersonResponseDto): string | null => {
    const extended = person as PersonResponseDto & {
      jobTitle?: string | null
      governmentTenures?: Array<{
        title?: string | null
        rankTitle?: string | null
        positionDefinition?: { title?: string | null; name?: string | null } | null
        administrationDepartment?: {
          name?: string | null
          abbreviation?: string | null
        } | null
        militaryUnit?: {
          name?: string | null
          abbreviation?: string | null
        } | null
      }>
    }
    const firstTenure = extended.governmentTenures?.[0]
    if (firstTenure) {
      const rawRole =
        firstTenure.title?.trim() ||
        firstTenure.positionDefinition?.title?.trim() ||
        firstTenure.positionDefinition?.name?.trim() ||
        ''
      const institutionLabel =
        firstTenure.militaryUnit?.abbreviation?.trim() ||
        firstTenure.militaryUnit?.name?.trim() ||
        firstTenure.administrationDepartment?.abbreviation?.trim() ||
        firstTenure.administrationDepartment?.name?.trim() ||
        ''
      const withInst =
        institutionLabel && rawRole && !rawRole.includes(institutionLabel)
          ? `${institutionLabel} ${rawRole}`
          : rawRole || institutionLabel
      const rankSuffix = firstTenure.rankTitle?.trim()
        ? ` · ${firstTenure.rankTitle.trim()}`
        : ''
      if (withInst) return `${withInst}${rankSuffix}`
    }
    return extended.jobTitle?.trim() || null
  }

  const formatPersonLifespan = (person: PersonResponseDto): string => {
    const birthText =
      person.birthYear != null
        ? `${person.birthEra === 'BC' ? 'BC ' : ''}${Math.abs(person.birthYear)}`
        : null
    const deathText =
      person.deathYear != null
        ? `${person.deathEra === 'BC' ? 'BC ' : ''}${Math.abs(person.deathYear)}`
        : null
    if (!birthText && !deathText) return '생몰년 미상'
    if (birthText && deathText) return `${birthText} ~ ${deathText}년`
    if (birthText) return `${birthText}년생`
    return `~ ${deathText}년 몰`
  }

  const withTenureList = useMemo(
    () => figures.filter(hasTenure),
    [figures],
  )
  const withLifespanList = useMemo(
    () =>
      figures.filter(
        (person) => person.birthYear != null || person.deathYear != null,
      ),
    [figures],
  )
  const withPortraitList = useMemo(
    () => figures.filter((person) => Boolean(person.profileImageUrl)),
    [figures],
  )

  const filteredFigures = useMemo(() => {
    const lowered = searchQuery.trim().toLowerCase()
    return figures.filter((person) => {
      if (categoryFilter === 'tenured' && !hasTenure(person)) return false
      if (
        categoryFilter === 'lifespan' &&
        person.birthYear == null &&
        person.deathYear == null
      ) {
        return false
      }
      if (categoryFilter === 'portrait' && !person.profileImageUrl) {
        return false
      }
      if (!lowered) return true
      const searchable = [
        getPersonDisplayName(person, true),
        person.name,
        person.surname,
        person.regnalName,
        getPrimaryRoleLabel(person),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(lowered)
    })
  }, [figures, categoryFilter, searchQuery])

  return (
    <DashboardStyles.DashboardRoot>
      <FiguresSectionWrap>
        <FiguresHeadRow>
          <FiguresHeadText>
            <FiguresTitle>소속 인물</FiguresTitle>
            <FiguresDescription>
              이 국가를 주 국적으로 삼거나 재위·관직 재임·소속 기록이 있는 3원 합집합 인물 원장입니다.
            </FiguresDescription>
          </FiguresHeadText>
          <FiguresHeadActions>
            <FiguresActionBtn
              type="button"
              onClick={() => setRegisterModalOpen(true)}
            >
              + 인물 등록
            </FiguresActionBtn>
            <FiguresActionBtn
              type="button"
              onClick={() => navigate(pathKeys.personsTimeline())}
            >
              인물 대시보드 →
            </FiguresActionBtn>
          </FiguresHeadActions>
        </FiguresHeadRow>

        <CountryPersonGroupsBlock historicalCountryId={country.id} />

        <DashboardStyles.SectionHeadlineStrip aria-label="소속 인물 요약 지표">
          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              전체 소속 인물
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue $muted={figures.length === 0}>
              {figures.length > 0 ? (
                <>
                  {figures.length.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>명</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '미등록'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              주 국적 · 재임 · 소속 3원 합집합
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              관직·재임 기록 보유
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={withTenureList.length === 0}
            >
              {withTenureList.length > 0 ? (
                <>
                  {withTenureList.length.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>명</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '없음'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {figures.length > 0
                ? `전체의 ${Math.round((withTenureList.length / figures.length) * 100)}% · 군주·관료·직책 보유`
                : '재위·관직 재임자 기록 대기'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              생몰년 확인율
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={withLifespanList.length === 0}
            >
              {figures.length > 0 ? (
                <>
                  {Math.round((withLifespanList.length / figures.length) * 100)}
                  <DashboardStyles.SectionHeadlineUnit>%</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '—'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {figures.length > 0
                ? `생년·몰년 확인 ${withLifespanList.length}/${figures.length}명`
                : '생몰년 데이터 미집계'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              초상 보유율
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={withPortraitList.length === 0}
            >
              {figures.length > 0 ? (
                <>
                  {Math.round((withPortraitList.length / figures.length) * 100)}
                  <DashboardStyles.SectionHeadlineUnit>%</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '—'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {figures.length > 0
                ? `초상 이미지 ${withPortraitList.length}/${figures.length}명`
                : '초상 이미지 미등록'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>
        </DashboardStyles.SectionHeadlineStrip>

        {isLoading ? (
          <ChartSkeleton variant="bars" rows={5} />
        ) : figures.length === 0 ? (
          <FiguresEmptySpecGrid>
            <FiguresEmptySpecCell>
              <FiguresEmptySpecTitle>
                1. 주 국적 · 소속 국가 지정
              </FiguresEmptySpecTitle>
              <FiguresEmptySpecDesc>
                인물 정보에서 주 국적 또는 시대별 소속 국가로 {country.name}을(를) 지정하면 문인·학자·장수 등 모든 인물이 자동 집계됩니다.
              </FiguresEmptySpecDesc>
              <FiguresEmptySpecAction
                type="button"
                onClick={() => setRegisterModalOpen(true)}
              >
                + 인물 등록하기
              </FiguresEmptySpecAction>
            </FiguresEmptySpecCell>
            <FiguresEmptySpecCell>
              <FiguresEmptySpecTitle>
                2. 행정부 · 관직 재임 등록
              </FiguresEmptySpecTitle>
              <FiguresEmptySpecDesc>
                정부·행정 탭에서 행정부·중앙부처 관직 재임자를 등록하면 별도 국적 설정 없이도 이 국가 인물로 함께 묶입니다.
              </FiguresEmptySpecDesc>
              {onGoToHeads && (
                <FiguresEmptySpecAction type="button" onClick={onGoToHeads}>
                  정부·행정 탭으로 이동 →
                </FiguresEmptySpecAction>
              )}
            </FiguresEmptySpecCell>
          </FiguresEmptySpecGrid>
        ) : (
          <>
            <FiguresToolbar>
              <FiguresFilterGroup role="tablist" aria-label="인물 분류 필터">
                <FiguresFilterChip
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === 'all'}
                  $active={categoryFilter === 'all'}
                  onClick={() => setCategoryFilter('all')}
                >
                  전체 <FiguresFilterCount>{figures.length}</FiguresFilterCount>
                </FiguresFilterChip>
                <FiguresFilterChip
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === 'tenured'}
                  $active={categoryFilter === 'tenured'}
                  onClick={() => setCategoryFilter('tenured')}
                >
                  관직·재임{' '}
                  <FiguresFilterCount>{withTenureList.length}</FiguresFilterCount>
                </FiguresFilterChip>
                <FiguresFilterChip
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === 'lifespan'}
                  $active={categoryFilter === 'lifespan'}
                  onClick={() => setCategoryFilter('lifespan')}
                >
                  생몰년 확인{' '}
                  <FiguresFilterCount>{withLifespanList.length}</FiguresFilterCount>
                </FiguresFilterChip>
                <FiguresFilterChip
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === 'portrait'}
                  $active={categoryFilter === 'portrait'}
                  onClick={() => setCategoryFilter('portrait')}
                >
                  초상 보유{' '}
                  <FiguresFilterCount>{withPortraitList.length}</FiguresFilterCount>
                </FiguresFilterChip>
              </FiguresFilterGroup>

              <FiguresToolbarRight>
                <FiguresSearchInput
                  type="search"
                  value={searchQuery}
                  onChange={(changeEvent) =>
                    setSearchQuery(changeEvent.target.value)
                  }
                  placeholder="이름 · 시호 · 직책 검색…"
                  aria-label="소속 인물 검색"
                />
                <FiguresViewToggle role="group" aria-label="인물 보기 방식">
                  <FiguresViewBtn
                    type="button"
                    $active={viewMode === 'ledger'}
                    onClick={() => setViewMode('ledger')}
                  >
                    2열 원장
                  </FiguresViewBtn>
                  <FiguresViewBtn
                    type="button"
                    $active={viewMode === 'cards'}
                    onClick={() => setViewMode('cards')}
                  >
                    초상 카드
                  </FiguresViewBtn>
                </FiguresViewToggle>
              </FiguresToolbarRight>
            </FiguresToolbar>

            {filteredFigures.length === 0 ? (
              <FiguresNoMatch>
                선택한 필터나 검색어와 일치하는 소속 인물이 없습니다.
              </FiguresNoMatch>
            ) : viewMode === 'ledger' ? (
              <FiguresLedgerGrid>
                {filteredFigures.map((person) => {
                  const displayName =
                    getPersonDisplayName(person, true) || person.name
                  const roleLabel = getPrimaryRoleLabel(person)
                  const lifespanLabel = formatPersonLifespan(person)
                  return (
                    <FiguresLedgerRow key={person.id}>
                      <FiguresLedgerMainBtn
                        type="button"
                        onClick={() => setPreviewPersonId(person.id)}
                      >
                        <FiguresAvatar>
                          {person.profileImageUrl ? (
                            <img
                              src={getUploadImageUrl(person.profileImageUrl)}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span>{displayName.slice(0, 1)}</span>
                          )}
                        </FiguresAvatar>
                        <FiguresPersonMeta>
                          <FiguresNameLine>
                            <FiguresPersonName>{displayName}</FiguresPersonName>
                            {roleLabel && (
                              <FiguresRoleBadge>{roleLabel}</FiguresRoleBadge>
                            )}
                          </FiguresNameLine>
                          <FiguresLifespanText>
                            {lifespanLabel}
                          </FiguresLifespanText>
                        </FiguresPersonMeta>
                      </FiguresLedgerMainBtn>
                      <FiguresDetailBtn
                        type="button"
                        onClick={() =>
                          navigate(pathKeys.personsTimelineDetail(person.id))
                        }
                      >
                        연보 →
                      </FiguresDetailBtn>
                    </FiguresLedgerRow>
                  )
                })}
              </FiguresLedgerGrid>
            ) : (
              <FiguresCardGrid>
                {filteredFigures.map((figure, index) => (
                  <PersonCard
                    key={figure.id}
                    person={figure}
                    index={index}
                    onClick={() =>
                      navigate(pathKeys.personsTimelineDetail(figure.id))
                    }
                  />
                ))}
              </FiguresCardGrid>
            )}
          </>
        )}
      </FiguresSectionWrap>

      <PersonInlineModal
        personId={previewPersonId}
        onClose={() => setPreviewPersonId(null)}
      />

      <PersonRegisterViewModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        initialCountryId={country.id}
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: ['historical-country-union-persons', country.id],
          })
          void queryClient.invalidateQueries({ queryKey: ['persons'] })
        }}
      />
    </DashboardStyles.DashboardRoot>
  )
}


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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: '28px 32px 48px',
        minHeight: 'calc(100vh - 300px)',
      }}
    >
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
    </div>
  )
}

const FiguresSectionWrap = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
`

const FiguresHeadRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 14px;
`

const FiguresHeadText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const FiguresTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const FiguresDescription = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FiguresHeadActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const FiguresActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.active};
  }
`

const FiguresToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FiguresFilterGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`

const FiguresFilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  cursor: pointer;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? theme.colors.active : theme.colors.text.primary};
  }
`

const FiguresFilterCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
`

const FiguresToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const FiguresSearchInput = styled.input`
  width: min(240px, 100%);
  height: 30px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
  }
`

const FiguresViewToggle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border-left: 1px solid ${({ theme }) => theme.colors.border.light};
  padding-left: 8px;
`

const FiguresViewBtn = styled.button<{ $active: boolean }>`
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  cursor: pointer;
`

const FiguresLedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const FiguresLedgerRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 760px) {
    &:nth-child(even) {
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }

    &:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
  }
`

const FiguresLedgerMainBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
`

const FiguresAvatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const FiguresPersonMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`

const FiguresNameLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const FiguresPersonName = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const FiguresRoleBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
  white-space: nowrap;
  flex-shrink: 0;
`

const FiguresLifespanText = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FiguresDetailBtn = styled.button`
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.active};
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const FiguresCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
`

const FiguresNoMatch = styled.p`
  margin: 0;
  padding: 20px 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FiguresEmptySpecGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const FiguresEmptySpecCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 14px;
  min-width: 0;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  @media (min-width: 720px) {
    & + & {
      border-top: none;
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const FiguresEmptySpecTitle = styled.div`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const FiguresEmptySpecDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FiguresEmptySpecAction = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.activeLight};
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
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
