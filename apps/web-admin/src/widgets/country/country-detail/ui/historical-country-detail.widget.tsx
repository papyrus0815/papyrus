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
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
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
import { CountryTradeSection } from './country-trade-section.widget'
import { EthnicitySection } from './ethnicity-section.widget'
import { EventsTimelineSection } from './events-timeline-section.widget'
import { GovernmentInfoSection } from './government-info-section.widget'
import { HeadsOfStateSection } from './heads-of-state-section.widget'
import { PersonCard } from './person/person-card'
import { TreatySectionWidget } from './treaty-section.widget'
import { LoadingOverlay } from './loading-overlay'
import { MapRegionAdministrativeView } from './map-region-administrative-view'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { HistoricalFoundingCards } from './historical-founding-cards'
import { TerritoryChangesSection } from './territory-changes-section'
import { WarDeclarationsSection } from './war-declarations-section'
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
import { RichTextReadView } from '@/shared/ui/rich-text-read-view/rich-text-read-view'
import { notify } from '@/shared/ui/toast'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { ENTITY_KIND_LABELS } from '@/entities/historical-country/model/constants'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'
import {
  useHistoricalCountryDashboard,
  type HistoricalCompletenessField,
} from '../model/use-historical-country-dashboard'
import type { CompletenessField } from '../model/use-country-dashboard-stats'
import {
  IconArchive,
  IconBriefcase,
  IconCalendar,
  IconChart,
  IconClock,
  IconGlobe,
  IconHistory,
  IconLandmark,
  IconPin,
  IconScroll,
  IconTrade,
  IconUserCheck,
  IconUsers,
  IconVote,
} from './country-detail-dashboard.icons'
import { ActivityFeed } from './dashboard-panels/activity-feed'
import { CountryMapDashboardPanel } from './dashboard-panels/country-map-dashboard-panel'
import { ChartSkeleton } from './dashboard-panels/chart-skeleton'
import { CountryCompaniesSection } from './dashboard-panels/country-companies-section'
import { CurrentCabinetPanel } from './dashboard-panels/current-cabinet-panel'
import { DashboardGuideBanner } from './dashboard-panels/dashboard-guide-banner'
import { EventCalendarPanel } from './dashboard-panels/event-calendar-panel'
import { EventCenturyStrip } from './dashboard-panels/event-century-strip'
import { HistoricalRulerTimeline } from './dashboard-panels/historical-ruler-timeline'
import { LineageFlow } from './dashboard-panels/lineage-flow'
import { PoliticalSystemPanel } from './dashboard-panels/political-system-panel'
import { RecordLedger, type RecordLedgerRow } from './dashboard-panels/record-ledger'
import { SectionEmpty } from './dashboard-panels/section-empty'
import { SectionHelpPopover } from './dashboard-panels/section-help-popover'
import { SectionNav } from './dashboard-panels/section-nav'
import { TradeSection } from './dashboard-panels/trade-section'

export type HistoricalCountryTab =
  | 'overview' // 역사 개요
  | 'events' // 주요 사건 (메인)
  | 'figures' // 주요 인물
  | 'heads' // 수장 (국왕, 황제 등)
  | 'regions' // 행정구역 (조선 팔도 등)
  | 'government' // 행정조직 (관직 정의, 행정기구)
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
    if (initialTab) return initialTab
    if (queryTabParam && LOCAL_QUERY_TAB_SET.has(queryTabParam)) {
      return queryTabParam
    }
    return 'overview'
  })
  const [governmentSubTab, setGovernmentSubTab] = useState<
    'system' | 'heads' | 'cabinets' | 'ministries' | 'military'
  >('system')
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
    const rulersInSpanCount = dashboardStats.rulers.filter(
      (ruler) => !ruler.isOutOfSpan,
    ).length
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
      heads: dashboardStats.loading.tenures ? undefined : rulersInSpanCount,
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
                          title="클릭하여 대시보드로 돌아가기"
                        >
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
                        <TabStyles.CompactActions>
                          <TabStyles.CompactActionBtn
                            type="button"
                            onClick={() => handleTabChange('overview')}
                          >
                            ← 대시보드
                          </TabStyles.CompactActionBtn>
                          {onEdit && (
                            <TabStyles.CompactActionBtn
                              type="button"
                              onClick={() => onEdit(country)}
                            >
                              기본 정보 수정
                            </TabStyles.CompactActionBtn>
                          )}
                        </TabStyles.CompactActions>
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
                      onGoToHeads={() => handleTabChange('heads')}
                    />
                  )}
                  {activeTab === 'heads' && (
                    <HeadsOfStateSection country={country} />
                  )}
                  {activeTab === 'regions' && (
                    <HistoricalRegionsSection country={country} />
                  )}
                  {activeTab === 'government' && (
                    /*
                      역사국가도 정체·역대 수반·행정부(내각)·중앙부처(6조/내각 각 성 등)·행정기구·직위 정의를
                      현대 국가와 동일한 통합 행정조직 섹션으로 관리한다.
                    */
                    <GovernmentInfoSection
                      country={country}
                      initialContentTab={governmentSubTab}
                    />
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
                        padding: '16px 24px 32px',
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
                        padding: '16px 24px 32px',
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
  { id: 'events', label: '주요 사건' },
  { id: 'figures', label: '인물' },
  { id: 'heads', label: '역대 수반', groupEnd: true },
  { id: 'succession', label: '계승' },
  { id: 'membership', label: '소속·구성' },
  { id: 'relation', label: '국가 관계' },
  { id: 'treaty', label: '조약', groupEnd: true },
  { id: 'government', label: '행정조직' },
  { id: 'regions', label: '행정구역' },
  { id: 'laws', label: '법령' },
  { id: 'ethnicity', label: '민족', groupEnd: true },
  { id: 'trade', label: '교역' },
  { id: 'companies', label: '기업' },
  { id: 'elections', label: '선거·투표' },
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
// 역사 개요 섹션
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
  /** 요약 칸에서 해당 탭으로(역대 수반·사건·계승 …) */
  onGoToTab: (tab: HistoricalCountryTab) => void
  onOpenGovernmentSubTab?: (
    subTab: 'system' | 'heads' | 'cabinets' | 'ministries' | 'military',
  ) => void
  onOpenEventsCentury: (century: number) => void
}) {
  /* 구조화 존속 연도 — UnifiedCountry 타입엔 없지만 역사 국가 응답에는 실려 온다 */
  const structuredSpan = country as UnifiedCountry & {
    startEra?: string | null
    startYear?: number | null
    endEra?: string | null
    endYear?: number | null
  }

  const queryClient = useQueryClient()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  /*
   * 개요 원문 — 이 화면의 country는 국가 목록에서 온 **경량 항목**일 수 있다(description 없음 →
   * historicalToUnified가 undefined). 그대로 쓰면 DB에 개요가 있는데도 '개요가 없습니다'가 떴다
   * (실측: 벨기에 왕국 544자). 없을 때만 상세를 단건 조회해 채운다.
   */
  const needsFullRecord =
    country.description === undefined ||
    country.nameOrigin === undefined ||
    country.history === undefined ||
    country.entityKind === undefined
  const fullRecordQuery = useHistoricalCountry(needsFullRecord ? country.id : '')
  const resolvedDescription =
    country.description !== undefined
      ? country.description
      : fullRecordQuery.data?.description
  const resolvedNameOrigin =
    country.nameOrigin !== undefined
      ? country.nameOrigin
      : (fullRecordQuery.data as { nameOrigin?: string | null } | undefined)?.nameOrigin
  const resolvedHistory =
    country.history !== undefined
      ? country.history
      : (fullRecordQuery.data as { history?: string | null } | undefined)?.history
  const entityKind = (
    country.entityKind !== undefined
      ? country.entityKind
      : (fullRecordQuery.data as { entityKind?: UnifiedCountry['entityKind'] } | undefined)?.entityKind
  ) as 'STATE' | 'REGIME' | 'PERIOD' | 'PEOPLE' | null | undefined

  // 현재 표시할 description. 원문으로 초기화하고 저장 시 직접 교체
  const [savedDescription, setSavedDescription] = useState<string | null | undefined>(
    () => resolvedDescription,
  )
  const [lineageDepthFilter, setLineageDepthFilter] = useState<'all' | 'direct'>(
    'all',
  )
  const [selectedModernEndpointId, setSelectedModernEndpointId] = useState<
    string | null
  >(null)
  const [indicatorDomainFilter, setIndicatorDomainFilter] = useState<
    'all' | 'trade' | 'companies'
  >('all')
  const [showEmptyIndicators, setShowEmptyIndicators] = useState(false)
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
  const hasTradeData = tradeRecords.length > 0
  const hasCompanyData = companyCount > 0
  const filledIndicatorDomains =
    Number(hasTradeData) + Number(hasCompanyData)
  const emptyIndicatorDomains = 2 - filledIndicatorDomains
  // stale closure 방지용 ref — 항상 최신 에디터 값을 보관
  const editorValueRef = useRef('')

  // 국가 변경 시 리셋
  useEffect(() => {
    setSavedDescription(resolvedDescription)
    setSelectedModernEndpointId(null)
  }, [country.id, resolvedDescription])

  const updateMutation = useMutation({
    mutationFn: (description: string) =>
      updateHistoricalCountry(country.id, { description: description || undefined }),
    onSuccess: (_, description) => {
      const saved = description || null
      setSavedDescription(saved)
      setIsEditorOpen(false)
      // 단건 캐시도 새 개요로 — 다시 들어왔을 때 옛 값으로 되돌아가지 않게
      void queryClient.invalidateQueries({ queryKey: historicalCountryKeys.detail(country.id) })
      notify.success('개요가 저장되었습니다.')
    },
    onError: () => {
      notify.error('저장 중 오류가 발생했습니다.')
    },
  })

  const handleOpenEditor = useCallback(() => {
    const initialValue = savedDescription ?? ''
    editorValueRef.current = initialValue
    setIsEditorOpen(true)
  }, [savedDescription])

  const handleSave = useCallback(() => {
    updateMutation.mutate(editorValueRef.current)
  }, [updateMutation])

  const handleClose = useCallback(() => {
    setIsEditorOpen(false)
  }, [])

  // 존속 기간·연수는 공용 BC 유틸이 단일 출처(@/shared/lib/country-period).
  // 로컬 재구현 금지 — 종료 미상을 '현재'로 둔갑시키던 옛 구현을 여기서 폐기했다.
  const period = formatCountryPeriod(country, { emptyText: '알 수 없음' })
  const durationYears = getCountryDurationYears(country)
  const entityKindLabel = entityKind ? ENTITY_KIND_LABELS[entityKind] : null

  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const stats = useHistoricalCountryDashboard(country, savedDescription)
  const span = getCountryYearRange(country)
  const [previewEventId, setPreviewEventId] = useState<string | null>(null)
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null)
  const goPerson = (personId: string) => setPreviewPersonId(personId)
  const capitalText = country.capital ? String(country.capital).trim() : ''
  /*
   * 역대 수반 수 — 지표 칸과 장 머리 칩이 같은 수를 말하게 한다. 예전엔 지표는 국가원수만
   * (독일 제국 5명), 칩은 존속 기간 밖 기록까지(7명) 세어 한 화면에 두 숫자가 떴다.
   * 존속 기간 밖 기록은 잘못 걸린 행일 가능성이 높아 따로 센다.
   */
  const rulersInSpan = stats.rulers.filter((ruler) => !ruler.isOutOfSpan)
  const rulerCount = rulersInSpan.length
  const outOfSpanRulerCount = stats.rulers.length - rulerCount

  /* 기록 원장 — 현대 국가 대시보드와 같은 막대 목록, 축만 역사 국가 것으로 */
  const recordAxes: RecordLedgerRow[] = [
    {
      key: 'person',
      label: '인물',
      unit: '명',
      value: stats.personCount,
      delta: 0,
      isLoading: stats.loading.persons,
      icon: <IconUserCheck />,
      onClick: () => onGoToTab('figures'),
    },
    {
      key: 'event',
      label: '사건',
      unit: '건',
      value: stats.eventCount,
      delta: 0,
      isLoading: stats.loading.events,
      icon: <IconCalendar />,
      onClick: () => onGoToTab('events'),
    },
    {
      key: 'ruler',
      label: '역대 수반',
      unit: '명',
      value: rulerCount,
      delta: 0,
      isLoading: stats.loading.tenures,
      icon: <IconVote />,
      onClick: () => onGoToTab('heads'),
    },
    {
      key: 'succession',
      label: '계승',
      unit: '건',
      value: stats.transitionCount,
      delta: 0,
      isLoading: stats.loading.lineage,
      icon: <IconHistory />,
      onClick: () => onGoToTab('succession'),
    },
    {
      key: 'membership',
      label: '소속·구성',
      unit: '건',
      value: stats.membershipCount,
      delta: 0,
      isLoading: stats.loading.memberships,
      icon: <IconLandmark />,
      onClick: () => onGoToTab('membership'),
    },
    {
      key: 'relation',
      label: '국가 관계',
      unit: '건',
      value: stats.relationCount,
      delta: 0,
      isLoading: stats.loading.relations,
      icon: <IconGlobe />,
      onClick: () => onGoToTab('relation'),
    },
    {
      key: 'treaty',
      label: '조약',
      unit: '건',
      value: stats.treatyCount,
      delta: 0,
      isLoading: stats.loading.treaties,
      icon: <IconScroll />,
      onClick: () => onGoToTab('treaty'),
    },
    {
      key: 'administration',
      label: '행정조직',
      unit: '건',
      value: stats.administrationCount,
      delta: 0,
      isLoading: stats.loading.administration,
      icon: <IconLandmark />,
      onClick: () => onGoToTab('government'),
    },
    {
      key: 'regions',
      label: '행정구역',
      unit: '곳',
      value: stats.divisionCount,
      delta: 0,
      isLoading: stats.loading.regions,
      icon: <IconPin />,
      onClick: () => onGoToTab('regions'),
    },
    {
      key: 'elections',
      label: '선거·투표',
      unit: '건',
      value: stats.electionCount,
      delta: 0,
      isLoading: stats.loading.elections,
      icon: <IconVote />,
      onClick: () => onGoToTab('elections'),
    },
    {
      key: 'laws',
      label: '법령',
      unit: '건',
      value: stats.lawCount,
      delta: 0,
      isLoading: stats.loading.laws,
      icon: <IconScroll />,
      onClick: () => onGoToTab('laws'),
    },
    {
      key: 'ethnicity',
      label: '구성 민족',
      unit: '개',
      value: stats.ethnicityCount,
      delta: 0,
      isLoading: stats.loading.ethnicity,
      icon: <IconUsers />,
      onClick: () => onGoToTab('ethnicity'),
    },
    {
      key: 'trade',
      label: '교역',
      unit: '개년',
      value: tradeYearCount,
      delta: 0,
      isLoading: false,
      icon: <IconTrade />,
      onClick: () => onGoToTab('trade'),
    },
    {
      key: 'companies',
      label: '기업·상단',
      unit: '개사',
      value: companyCount,
      delta: 0,
      isLoading: false,
      icon: <IconBriefcase />,
      onClick: () => onGoToTab('companies'),
    },
  ]
  const totalRecords = recordAxes.reduce((sum, row) => sum + row.value, 0)
  const missingFactLabels = [
    ...(period === '알 수 없음' ? ['존속 기간'] : []),
    ...(!country.stateType ? ['국가 형태'] : []),
    ...(!capitalText ? ['수도'] : []),
  ]

  /* 더 채울 것 칩 → 그 축을 채우는 자리로 */
  const goFill = (field: CompletenessField) => {
    const target = (field as HistoricalCompletenessField).historicalTarget
    if (target === 'overview') {
      handleOpenEditor()
      document
        .getElementById('historical-overview-heading')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (target === 'founding') {
      document
        .getElementById('historical-founding-heading')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const trigger = document.getElementById(
        'founding-note-trigger-founding',
      ) as HTMLButtonElement | null
      trigger?.click()
      return
    }
    onGoToTab(target)
  }

  const overviewFilledCount =
    (savedDescription ? 1 : 0) +
    (resolvedNameOrigin ? 1 : 0) +
    (resolvedHistory ? 1 : 0)
  const foundingStartSigned = foundingSignedYear(
    structuredSpan.startEra,
    structuredSpan.startYear,
  )
  const foundingEndSigned = foundingSignedYear(
    structuredSpan.endEra,
    structuredSpan.endYear,
  )
  const foundingFilledCount =
    (foundingStartSigned != null ? 1 : 0) + (foundingEndSigned != null ? 1 : 0)
  const firstRulerName = rulersInSpan[0]?.personName ?? null
  const lastRulerName =
    rulersInSpan.length > 1
      ? rulersInSpan[rulersInSpan.length - 1]?.personName ?? null
      : null

  return (
    <DashboardRoot ref={rootRef}>
      {/* 규모 줄 — 현대 국가 대시보드와 같은 6칸 제원 그리드(FactSpecGrid) + 누락 제원 보완 바 */}
      <DashboardStyles.FactBar aria-label="국가 개요 지표">
        <DashboardStyles.FactSpecGrid>
          <DashboardStyles.Fact $missing={period === '알 수 없음'}>
            <DashboardStyles.FactLabel>존속 기간</DashboardStyles.FactLabel>
            <DashboardStyles.FactValue $missing={period === '알 수 없음'}>
              {period}
            </DashboardStyles.FactValue>
            <DashboardStyles.FactSubNote>
              {span.start != null || span.end != null
                ? `${span.start != null ? '성립 연도 확인' : '성립 미상'} · ${span.end != null ? '종료 연도 확인' : '종료 미상'}`
                : '성립·종료 연도 미입력'}
            </DashboardStyles.FactSubNote>
          </DashboardStyles.Fact>
          <DashboardStyles.Fact $missing={durationYears == null}>
            <DashboardStyles.FactLabel>존속 연수</DashboardStyles.FactLabel>
            <DashboardStyles.FactValue $missing={durationYears == null}>
              {durationYears != null ? (
                <>
                  {durationYears.toLocaleString()}
                  <DashboardStyles.FactUnit>년</DashboardStyles.FactUnit>
                </>
              ) : (
                '미산정'
              )}
            </DashboardStyles.FactValue>
            <DashboardStyles.FactSubNote>
              {durationYears != null
                ? rulerCount > 0
                  ? `수반 1인당 평균 약 ${Math.round((durationYears / rulerCount) * 10) / 10}년`
                  : '성립~종료 통산 기간'
                : '성립·종료 연도 입력 시 자동 계산'}
            </DashboardStyles.FactSubNote>
          </DashboardStyles.Fact>
          <DashboardStyles.Fact $missing={!country.stateType}>
            <DashboardStyles.FactLabel>국가 형태</DashboardStyles.FactLabel>
            <DashboardStyles.FactValue $missing={!country.stateType}>
              {country.stateType
                ? getStateTypeLabel(country.stateType)
                : '미등록'}
            </DashboardStyles.FactValue>
            <DashboardStyles.FactSubNote>
              {country.era
                ? `시대 구분: ${country.era}`
                : '군주국 · 제국 · 공화국 등 체제 분류'}
            </DashboardStyles.FactSubNote>
          </DashboardStyles.Fact>
          <DashboardStyles.Fact $missing={!entityKindLabel}>
            <DashboardStyles.FactLabel>정치체 성격</DashboardStyles.FactLabel>
            <DashboardStyles.FactValue $missing={!entityKindLabel}>
              {entityKindLabel ?? '미분류'}
            </DashboardStyles.FactValue>
            <DashboardStyles.FactSubNote>
              {entityKind === 'STATE'
                ? '독립 국가 · 왕조 단위 주권체'
                : entityKind === 'REGIME'
                  ? '정권 · 헌정 체제 단위'
                  : entityKind === 'PERIOD'
                    ? '시대 · 역사 구분 단위'
                    : entityKind === 'PEOPLE'
                      ? '종족 · 부족 연맹 단위'
                      : '국가 · 정권 · 시대 · 종족 분류'}
            </DashboardStyles.FactSubNote>
          </DashboardStyles.Fact>
          <DashboardStyles.Fact $missing={rulerCount === 0}>
            <DashboardStyles.FactLabel>역대 수반</DashboardStyles.FactLabel>
            <DashboardStyles.FactValue $missing={rulerCount === 0}>
              {rulerCount > 0 ? (
                <>
                  {rulerCount}
                  <DashboardStyles.FactUnit>명</DashboardStyles.FactUnit>
                </>
              ) : (
                '미등록'
              )}
            </DashboardStyles.FactValue>
            <DashboardStyles.FactSubNote>
              {firstRulerName
                ? `${firstRulerName}${lastRulerName ? ` → ${lastRulerName}` : ' 재위'}`
                : '군주·국가원수·정부수반 미등록'}
            </DashboardStyles.FactSubNote>
          </DashboardStyles.Fact>
          <DashboardStyles.Fact $missing={!capitalText}>
            <DashboardStyles.FactLabel>수도</DashboardStyles.FactLabel>
            <DashboardStyles.FactValue $missing={!capitalText}>
              {capitalText || '미등록'}
            </DashboardStyles.FactValue>
            <DashboardStyles.FactSubNote>
              {capitalText
                ? stats.divisionCount > 0
                  ? `공식 수도 · 행정구역 ${stats.divisionCount}곳`
                  : '대표 도성 · 수도'
                : '수도 명칭 미입력'}
            </DashboardStyles.FactSubNote>
          </DashboardStyles.Fact>
        </DashboardStyles.FactSpecGrid>
        <ModernLinkStrip>
          <ModernLinkLabel>연결된 현대 국가</ModernLinkLabel>
          {linkedModernCountries.length > 0 ? (
            <ModernLinkItems>
              {linkedModernCountries.map((modern) => (
                <ModernLinkPill
                  key={modern.id}
                  type="button"
                  onClick={() => navigate(pathKeys.countryDetail(modern.id))}
                >
                  {modern.name} →
                </ModernLinkPill>
              ))}
              {onEdit && (
                <ModernLinkActionBtn type="button" onClick={onEdit}>
                  연결 수정
                </ModernLinkActionBtn>
              )}
            </ModernLinkItems>
          ) : (
            <ModernLinkItems>
              <ModernLinkMutedText>
                미연결 (현대 국가 대시보드 및 계보 흐름도에서 제외됨)
              </ModernLinkMutedText>
              {onEdit && (
                <ModernLinkActionBtn type="button" onClick={onEdit}>
                  + 현대 국가 연결
                </ModernLinkActionBtn>
              )}
            </ModernLinkItems>
          )}
        </ModernLinkStrip>
        {missingFactLabels.length > 0 && onEdit && (
          <DashboardStyles.FactEmptyRow>
            <DashboardStyles.FactEmptyText>
              미등록 제원: {missingFactLabels.join(' · ')}
            </DashboardStyles.FactEmptyText>
            <DashboardStyles.FactEmptyActions>
              <DashboardStyles.FactEmptyAction
                type="button"
                onClick={onEdit}
              >
                + 기본 정보 입력
              </DashboardStyles.FactEmptyAction>
            </DashboardStyles.FactEmptyActions>
          </DashboardStyles.FactEmptyRow>
        )}
      </DashboardStyles.FactBar>

      {/* 역사 국가 데이터 구축 4단계 가이드 & 정합성 자동 진단 배너 */}
      <DashboardGuideBanner
        countryId={country.id}
        isLoading={stats.isCompletenessLoading}
        steps={[
          {
            key: 'overview-profile',
            stepNumber: 1,
            title: '개요 · 기본 제원',
            description:
              '존속 기간·국가 형태·수도와 역사 개요 서술을 작성해 도입부를 완성합니다.',
            status:
              Boolean(savedDescription) && Boolean(capitalText || country.stateType)
                ? 'completed'
                : Boolean(savedDescription) || Boolean(capitalText || country.stateType)
                  ? 'partial'
                  : 'empty',
            statusLabel: savedDescription ? '개요 작성됨' : '개요 미작성',
            actionLabel: savedDescription
              ? onEdit
                ? '기본 정보 수정'
                : '개요 수정'
              : '개요 작성',
            onAction: () => {
              if (!savedDescription) handleOpenEditor()
              else if (onEdit) onEdit()
              else handleOpenEditor()
            },
          },
          {
            key: 'rulers-governance',
            stepNumber: 2,
            title: '역대 수반 · 정체',
            description:
              '군주·국가원수의 재위 기간과 통치 정체, 중앙 행정조직을 등록합니다.',
            status:
              rulerCount > 0 && stats.administrationCount > 0
                ? 'completed'
                : rulerCount > 0 || stats.administrationCount > 0
                  ? 'partial'
                  : 'empty',
            statusLabel:
              rulerCount > 0 ? `수반 ${rulerCount}명` : '수반 미등록',
            actionLabel: rulerCount === 0 ? '역대 수반 등록' : '행정조직 관리',
            onAction: () =>
              onGoToTab(rulerCount === 0 ? 'heads' : 'government'),
          },
          {
            key: 'lineage-founding',
            stepNumber: 3,
            title: '건국·멸망 · 계승 계보',
            description:
              '전신·후신 역사 국가와의 계승 관계를 연결하고 성립·종료 맥락을 기록합니다.',
            status:
              stats.transitionCount > 0 && stats.lineage.length > 1
                ? 'completed'
                : stats.transitionCount > 0
                  ? 'partial'
                  : 'empty',
            statusLabel:
              stats.transitionCount > 0
                ? `계승 ${stats.transitionCount}건`
                : '계승 미등록',
            actionLabel: '계승 관계 관리',
            onAction: () => onGoToTab('succession'),
          },
          {
            key: 'events-figures-relations',
            stepNumber: 4,
            title: '사건 · 인물 · 외교·법제',
            description:
              '주요 역사 사건과 인물, 주변국 관계·조약·법령·민족을 축적합니다.',
            status:
              stats.eventCount + stats.personCount > 0 &&
              stats.treatyCount + stats.lawCount + stats.relationCount > 0
                ? 'completed'
                : stats.eventCount +
                      stats.personCount +
                      stats.treatyCount +
                      stats.lawCount +
                      stats.relationCount >
                    0
                  ? 'partial'
                  : 'empty',
            statusLabel:
              stats.eventCount + stats.personCount > 0
                ? `사건·인물 ${stats.eventCount + stats.personCount}건`
                : '미등록',
            actionLabel:
              stats.eventCount === 0 ? '주요 사건 등록' : '인물·조약 관리',
            onAction: () =>
              onGoToTab(stats.eventCount === 0 ? 'events' : 'figures'),
          },
        ]}
        diagnosticHints={[
          ...(outOfSpanRulerCount > 0
            ? [
                {
                  key: 'out-of-span-rulers',
                  tone: 'warning' as const,
                  message: `이 국가의 존속 기간(${period}) 밖에서 시작·종료한 수반 재임 기록이 ${outOfSpanRulerCount}건 있습니다. 재임 연도나 소속 국가를 확인해 보세요.`,
                  actionLabel: '역대 수반 확인',
                  onAction: () => onGoToTab('heads'),
                },
              ]
            : []),
          ...(!capitalText && onEdit
            ? [
                {
                  key: 'missing-capital',
                  tone: 'info' as const,
                  message:
                    '수도가 아직 입력되지 않았습니다. 수도를 등록하면 상단 개요 지표 바에 함께 표시됩니다.',
                  actionLabel: '+ 수도 입력',
                  onAction: onEdit,
                },
              ]
            : []),
        ]}
      />

      {/* 목차 — 장이 열 개 가까이 이어진다. 장 목록은 아래 <section>+<h2>에서 읽는다 */}
      <SectionNav rootRef={rootRef} />

      {/* 개요 — 이 나라가 무엇이었나. 글이 곧 이 지면의 첫 답이다 */}
      <DashboardStyles.Section
        id="section-overview"
        aria-labelledby="historical-overview-heading"
        data-section-count={`${overviewFilledCount}/3`}
      >
        <DashboardStyles.SectionTitleRow>
          <DashboardStyles.SectionTitleIcon>
            <IconScroll />
          </DashboardStyles.SectionTitleIcon>
          <DashboardStyles.SectionTitleText id="historical-overview-heading">
            개요
          </DashboardStyles.SectionTitleText>
          <SectionHelpPopover sectionKey="overview" />
          <DashboardStyles.SectionCountChip>
            {overviewFilledCount}/3개 항목
          </DashboardStyles.SectionCountChip>
          {!isEditorOpen && (
            <DashboardStyles.SectionLink type="button" onClick={handleOpenEditor}>
              {savedDescription ? '수정' : '+ 작성'}
            </DashboardStyles.SectionLink>
          )}
        </DashboardStyles.SectionTitleRow>

        <DashboardStyles.SectionHeadlineStrip aria-label="개요 및 역사 서술 요약">
          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              개요 본문
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue $muted={!savedDescription}>
              {savedDescription ? '작성됨' : '미작성'}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {savedDescription
                ? `공백 제외 ${savedDescription.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length.toLocaleString('ko-KR')}자`
                : '도입부 개요 서술 미입력'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              국호 · 명칭 유래
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue $muted={!resolvedNameOrigin}>
              {resolvedNameOrigin ? '작성됨' : '미작성'}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {resolvedNameOrigin
                ? `공백 제외 ${resolvedNameOrigin.replace(/\s+/g, '').length.toLocaleString('ko-KR')}자`
                : '기본 정보에서 국호 유래 입력 가능'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              역사 서술
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue $muted={!resolvedHistory}>
              {resolvedHistory ? '작성됨' : '미작성'}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {resolvedHistory
                ? `공백 제외 ${resolvedHistory.replace(/\s+/g, '').length.toLocaleString('ko-KR')}자`
                : '기본 정보에서 통사 서술 입력 가능'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              연결 계보 · 조약
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={stats.transitionCount + stats.treatyCount === 0}
            >
              {stats.transitionCount + stats.treatyCount > 0 ? (
                <>
                  {(stats.transitionCount + stats.treatyCount).toLocaleString(
                    'ko-KR',
                  )}
                  <DashboardStyles.SectionHeadlineUnit>
                    건
                  </DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '미등록'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              계승 {stats.transitionCount}건 · 조약 {stats.treatyCount}건
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>
        </DashboardStyles.SectionHeadlineStrip>

        {isEditorOpen ? (
          <OverviewBody>
            <RichTextEditor
              value={savedDescription ?? ''}
              onChange={(html) => {
                editorValueRef.current = html
              }}
              placeholder="역사적 국가에 대한 개요를 작성하세요..."
              showTitle={false}
              onImageUpload={async (file) => {
                const result = await uploadImage(file, 'attachments')
                return result.url ?? (result as unknown as string)
              }}
            />
            <OverviewActions>
              <OverviewEditButton type="button" onClick={handleClose}>
                취소
              </OverviewEditButton>
              <OverviewSaveButton
                type="button"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? '저장 중…' : '저장'}
              </OverviewSaveButton>
            </OverviewActions>
          </OverviewBody>
        ) : (
          <OverviewLedgerGrid>
            <OverviewCol>
              <OverviewSubHeader>
                <NarrativeSubLabel>개요 본문</NarrativeSubLabel>
                <OverviewInlineAction type="button" onClick={handleOpenEditor}>
                  {savedDescription ? '수정' : '+ 개요 작성'}
                </OverviewInlineAction>
              </OverviewSubHeader>
              {savedDescription ? (
                isLikelyRichTextHtml(savedDescription) ? (
                  <RichTextReadView html={savedDescription} />
                ) : (
                  <OverviewPlain>{savedDescription}</OverviewPlain>
                )
              ) : (
                <OverviewColEmpty>
                  이 나라가 어떤 나라였는지 시대적 위상과 성립 배경을 몇 문단으로 적어 두면 지면 맨 위에서 먼저 읽힙니다.
                </OverviewColEmpty>
              )}
            </OverviewCol>

            <OverviewCol>
              <NarrativeSubBlock $first>
                <OverviewSubHeader>
                  <NarrativeSubLabel>국호 · 명칭 유래</NarrativeSubLabel>
                  {onEdit && (
                    <OverviewInlineAction type="button" onClick={onEdit}>
                      {resolvedNameOrigin ? '수정' : '+ 기본 정보에서 입력'}
                    </OverviewInlineAction>
                  )}
                </OverviewSubHeader>
                {resolvedNameOrigin ? (
                  <OverviewPlain>{resolvedNameOrigin}</OverviewPlain>
                ) : (
                  <OverviewColEmpty>
                    국호의 유래나 시대별 명칭 변천이 아직 기록되지 않았습니다.
                  </OverviewColEmpty>
                )}
              </NarrativeSubBlock>

              <NarrativeSubBlock>
                <OverviewSubHeader>
                  <NarrativeSubLabel>역사 서술</NarrativeSubLabel>
                  {onEdit && (
                    <OverviewInlineAction type="button" onClick={onEdit}>
                      {resolvedHistory ? '수정' : '+ 기본 정보에서 입력'}
                    </OverviewInlineAction>
                  )}
                </OverviewSubHeader>
                {resolvedHistory ? (
                  <OverviewPlain>{resolvedHistory}</OverviewPlain>
                ) : (
                  <OverviewColEmpty>
                    주요 시대 구분과 흥망성쇠 통사 서술이 아직 기록되지 않았습니다.
                  </OverviewColEmpty>
                )}
              </NarrativeSubBlock>
            </OverviewCol>
          </OverviewLedgerGrid>
        )}
      </DashboardStyles.Section>

      {/* 지리 · 강역 구글 지도 */}
      <DashboardStyles.Section
        id="section-geography"
        aria-labelledby="historical-geography-heading"
        data-section-count={stats.divisionCount > 0 ? String(stats.divisionCount) : undefined}
      >
        <DashboardStyles.SectionTitleRow>
          <DashboardStyles.SectionTitleIcon>
            <IconPin />
          </DashboardStyles.SectionTitleIcon>
          <DashboardStyles.SectionTitleText id="historical-geography-heading">
            지리 · 강역 구글 지도
          </DashboardStyles.SectionTitleText>
          <SectionHelpPopover sectionKey="geography" />
          {stats.divisionCount > 0 && (
            <DashboardStyles.SectionCountChip>
              행정구역 {stats.divisionCount.toLocaleString('ko-KR')}곳
            </DashboardStyles.SectionCountChip>
          )}
          <DashboardStyles.SectionLink
            type="button"
            onClick={() => onGoToTab('regions')}
          >
            행정구역 관리
          </DashboardStyles.SectionLink>
        </DashboardStyles.SectionTitleRow>
        <CountryMapDashboardPanel
          country={{
            ...country,
            enName:
              country.enName ??
              (fullRecordQuery.data as { enName?: string | null } | undefined)
                ?.enName,
          }}
          linkedModernCountries={linkedModernCountries}
          onEdit={onEdit}
          onOpenRegionsTab={(divisionId) => {
            if (divisionId) {
              navigate(
                `${pathKeys.countryRegions(country.id)}?division_id=${encodeURIComponent(divisionId)}`,
              )
            } else {
              onGoToTab('regions')
            }
          }}
        />
      </DashboardStyles.Section>

      {/* 건국·멸망 — 존속 기간의 양 끝이 '어떻게' 열리고 닫혔나(배경·사건·초대·전신/후신) */}
      <DashboardStyles.Section
        id="section-founding"
        aria-labelledby="historical-founding-heading"
        data-section-count={`${foundingFilledCount}/2`}
      >
        <DashboardStyles.SectionTitleRow>
          <DashboardStyles.SectionTitleIcon>
            <IconCalendar />
          </DashboardStyles.SectionTitleIcon>
          <DashboardStyles.SectionTitleText id="historical-founding-heading">
            {!entityKind || entityKind === 'STATE' ? '건국·멸망' : '성립·종료'}
          </DashboardStyles.SectionTitleText>
          <SectionHelpPopover sectionKey="founding" />
          <DashboardStyles.SectionCountChip>
            {foundingFilledCount}/2개 시점
          </DashboardStyles.SectionCountChip>
        </DashboardStyles.SectionTitleRow>
        <HistoricalFoundingCards
          historicalCountryId={country.id}
          entityKind={entityKind ?? null}
          startYear={foundingStartSigned}
          endYear={foundingEndSigned}
          onGoToHeads={() => onGoToTab('heads')}
          onGoToSuccession={() => onGoToTab('succession')}
        />
      </DashboardStyles.Section>

      {/* 영토 변천 — 사건의 '영토 이전' 줄을 이 나라 쪽에서(분할·할양·병합으로 얻고 잃은 땅) */}
      <TerritoryChangesSection historicalCountryId={country.id} />

      {/* 선전포고 · 참전 이력 — 선전포고(WAR_DECLARATION) 사건을 이 나라 쪽에서(선포 ──▶ 상대국 / 피선포 ◀── 상대국) */}
      <WarDeclarationsSection historicalCountryId={country.id} />

      {/* 역대 수반 — 0명이어도 대시보드에 상시 노출해 등록 진입점을 제공한다 */}
      <DashboardStyles.Section
        id="section-rulers"
        data-section-count={rulerCount > 0 ? String(rulerCount) : undefined}
      >
        <DashboardStyles.SectionTitleRow>
          <DashboardStyles.SectionTitleIcon>
            <IconVote />
          </DashboardStyles.SectionTitleIcon>
          <DashboardStyles.SectionTitleText>
            역대 수반
          </DashboardStyles.SectionTitleText>
          <SectionHelpPopover sectionKey="rulers" />
          {rulerCount > 0 && (
            <DashboardStyles.SectionCountChip>
              {rulerCount}명
            </DashboardStyles.SectionCountChip>
          )}
          {outOfSpanRulerCount > 0 && (
            <DashboardStyles.SectionCountChip title="존속 기간 밖에서 시작·종료한 기록 — 다른 나라에 걸려야 할 행일 수 있습니다">
              기간 밖 {outOfSpanRulerCount}
            </DashboardStyles.SectionCountChip>
          )}
          <DashboardStyles.SectionLink
            type="button"
            onClick={() => onGoToTab('heads')}
          >
            {stats.rulers.length > 0 ? '전체 보기' : '+ 수반 등록'}
          </DashboardStyles.SectionLink>
        </DashboardStyles.SectionTitleRow>
        {stats.loading.tenures ? (
          <ChartSkeleton variant="bars" />
        ) : stats.rulers.length === 0 ? (
          <SectionEmpty
            text="이 국가의 역대 군주·국가원수·정부수반 재임 기록이 아직 없습니다. 등록하면 존속 기간 위 재위 띠와 2열 수반 원장이 생성됩니다."
            hint="초대 통치자를 등록하면 상단 건국·멸망 원장에도 자동 연결됩니다"
            actionLabel="역대 수반 등록"
            onAction={() => onGoToTab('heads')}
          />
        ) : (
          <HistoricalRulerTimeline
            rulers={stats.rulers}
            spanStart={span.start}
            spanEnd={span.end}
            onSelectPerson={goPerson}
          />
        )}
      </DashboardStyles.Section>

      {/* 정체 — 어떤 체제였나(현대 국가와 같은 2열 원장 패널, 역사 국가 FK로 전체 폭 사용) */}
      <PoliticalSystemPanel
        historicalCountryId={country.id}
        countryName={country.name}
        onOpenAll={() => onGoToTab('government')}
      />

      {/* 행정부 · 군주·수반 — 황제·국왕과 내각·각료·중앙부처를 마인드맵으로 함께 보여준다 */}
      <CurrentCabinetPanel
        countryId=""
        historicalCountryId={country.id}
        countryName={country.name}
        onOpen={(_cabinetId, isFallbackHead) => {
          if (isFallbackHead) {
            onGoToTab('heads')
            return
          }
          onOpenGovernmentSubTab?.('cabinets')
        }}
        onOpenElections={() => onGoToTab('elections')}
        onSelectPerson={goPerson}
      />

      {/* 계보 — 전신·후신 두 대까지 세기 축 위에 + 소속·구성·국가 관계·연결 현대 국가 통합 */}
      <DashboardStyles.Section
        id="section-lineage"
        data-section-count={
          stats.transitionCount + stats.membershipCount + stats.relationCount > 0
            ? String(
                stats.transitionCount +
                  stats.membershipCount +
                  stats.relationCount,
              )
            : undefined
        }
      >
        <DashboardStyles.SectionTitleRow>
          <DashboardStyles.SectionTitleIcon>
            <IconHistory />
          </DashboardStyles.SectionTitleIcon>
          <DashboardStyles.SectionTitleText>계보</DashboardStyles.SectionTitleText>
          <SectionHelpPopover sectionKey="lineage" />
          <DashboardStyles.SectionCountChip>
            계승 {stats.transitionCount} · 소속 {stats.membershipCount} · 관계{' '}
            {stats.relationCount}
          </DashboardStyles.SectionCountChip>
          <LineageHeaderActions>
            <LineageHeaderBtn
              type="button"
              onClick={() => onGoToTab('succession')}
            >
              계승 관리
            </LineageHeaderBtn>
            <LineageHeaderBtn
              type="button"
              onClick={() => onGoToTab('membership')}
            >
              소속·구성
            </LineageHeaderBtn>
            <LineageHeaderBtn
              type="button"
              onClick={() => onGoToTab('relation')}
            >
              국가 관계
            </LineageHeaderBtn>
          </LineageHeaderActions>
        </DashboardStyles.SectionTitleRow>

        <DashboardStyles.SectionHeadlineStrip aria-label="국가 간 관계 3축 및 현대 계승 요약">
          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              전후 계승 · 변천
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={stats.transitionCount === 0}
            >
              {stats.transitionCount > 0 ? (
                <>
                  {stats.transitionCount.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>건</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '미등록'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {stats.lineage.length > 1
                ? `앞뒤 계보 ${stats.lineage.length - 1}개국`
                : '전신·후신 계승 관계 미등록'}{' '}
              ·{' '}
              <LineageInlineLink
                type="button"
                onClick={() => onGoToTab('succession')}
              >
                계승 탭 →
              </LineageInlineLink>
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              소속 · 구성 정치체
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={stats.membershipCount === 0}
            >
              {stats.membershipCount > 0 ? (
                <>
                  {stats.membershipCount.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>건</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '없음'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              연방·제국 소속 및 하위 구성국 ·{' '}
              <LineageInlineLink
                type="button"
                onClick={() => onGoToTab('membership')}
              >
                소속·구성 탭 →
              </LineageInlineLink>
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              수평 국가 관계
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={stats.relationCount === 0}
            >
              {stats.relationCount > 0 ? (
                <>
                  {stats.relationCount.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>건</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '없음'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              동맹·조공·교전·동군연합 ·{' '}
              <LineageInlineLink
                type="button"
                onClick={() => onGoToTab('relation')}
              >
                국가 관계 탭 →
              </LineageInlineLink>
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              연결된 현대 국가
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={linkedModernCountries.length === 0}
            >
              {linkedModernCountries.length > 0 ? (
                <>
                  {linkedModernCountries.length.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>개국</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '미연결'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {linkedModernCountries.length > 0
                ? linkedModernCountries.map((modern) => modern.name).join(' · ')
                : '기본 정보에서 연결할 현대 국가 지정 가능'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>
        </DashboardStyles.SectionHeadlineStrip>

        {stats.loading.lineage ? (
          <ChartSkeleton variant="bars" />
        ) : stats.lineage.length <= 1 && linkedModernCountries.length === 0 ? (
          <SectionEmpty
            text="이 나라가 무엇에서 나와 무엇으로 이어졌는지 계승 관계를 걸면, 앞뒤 두 대까지 세기 축 위에 그려집니다."
            hint="전신·후신 국가나 현대 국가를 연결하면 세기별 계보 흐름도가 자동 생성됩니다"
            actionLabel="계승 관계 추가"
            onAction={() => onGoToTab('succession')}
          />
        ) : (
          (() => {
            const directLineage = stats.lineage.filter(
              (node) => Math.abs(node.distance) <= 1,
            )
            const hasSecondDegree =
              directLineage.length > 1 &&
              directLineage.length < stats.lineage.length
            const displayedLineage =
              hasSecondDegree && lineageDepthFilter === 'direct'
                ? directLineage
                : stats.lineage
            const activeModern =
              linkedModernCountries.find(
                (modern) => modern.id === selectedModernEndpointId,
              ) ?? linkedModernCountries[0]
            const hasMultipleModern = linkedModernCountries.length > 1

            return (
              <LineageFlow
                historicalCountries={displayedLineage}
                currentId={country.id}
                modernEndpoint={
                  activeModern
                    ? {
                        id: activeModern.id,
                        name: activeModern.name,
                        flagEmoji: activeModern.flagEmoji,
                        thumbnailUrl: activeModern.thumbnailUrl,
                        isoCode: activeModern.isoCode,
                      }
                    : undefined
                }
                onSelect={(targetId) =>
                  navigate(pathKeys.countryDetail(targetId))
                }
                maxPerColumn={4}
                toolbarLeft={
                  hasSecondDegree || hasMultipleModern ? (
                    <DashboardStyles.LineageFilterGroup
                      role="group"
                      aria-label="계보 세대 및 현대 종착점 필터"
                    >
                      {hasSecondDegree && (
                        <>
                          <DashboardStyles.LineageFilterPill
                            type="button"
                            $active={lineageDepthFilter === 'all'}
                            onClick={() => setLineageDepthFilter('all')}
                          >
                            2대 전체 {stats.lineage.length}
                          </DashboardStyles.LineageFilterPill>
                          <DashboardStyles.LineageFilterPill
                            type="button"
                            $active={lineageDepthFilter === 'direct'}
                            onClick={() => setLineageDepthFilter('direct')}
                          >
                            직계 1대 {directLineage.length}
                          </DashboardStyles.LineageFilterPill>
                        </>
                      )}
                      {hasMultipleModern &&
                        linkedModernCountries.map((modern) => (
                          <DashboardStyles.LineageFilterPill
                            key={modern.id}
                            type="button"
                            $active={activeModern?.id === modern.id}
                            onClick={() =>
                              setSelectedModernEndpointId(modern.id)
                            }
                          >
                            현대: {modern.name}
                          </DashboardStyles.LineageFilterPill>
                        ))}
                    </DashboardStyles.LineageFilterGroup>
                  ) : undefined
                }
              />
            )
          })()
        )}
      </DashboardStyles.Section>

      {/* 기록 · 완성도 — 14개 도메인 2열 원장과 미등록 축 바로가기/완성도를 한 섹션으로 통합 */}
      <DashboardStyles.Section
        id="section-records"
        data-section-count={totalRecords > 0 ? String(totalRecords) : undefined}
      >
        <DashboardStyles.SectionTitleRow>
          <DashboardStyles.SectionTitleIcon>
            <IconArchive />
          </DashboardStyles.SectionTitleIcon>
          <DashboardStyles.SectionTitleText>
            기록 · 완성도
          </DashboardStyles.SectionTitleText>
          <SectionHelpPopover sectionKey="records" />
          <DashboardStyles.SectionCountChip>
            총 {totalRecords.toLocaleString('ko-KR')}건
          </DashboardStyles.SectionCountChip>
        </DashboardStyles.SectionTitleRow>
        <DashboardStyles.RecordGrid>
          <DashboardStyles.RecordGridBody>
            <RecordLedger
              rows={recordAxes}
              completeness={{
                filled: stats.completeness.filled,
                total: stats.completeness.total,
                missing: stats.completeness.missing,
                isLoading: stats.isCompletenessLoading,
              }}
              onFillMissing={goFill}
            />
            {stats.eventCenturyCounts.length > 0 && (
              <DashboardStyles.EventTimelineBlock>
                <DashboardStyles.EventTimelineLabel>
                  사건 연표
                </DashboardStyles.EventTimelineLabel>
                <EventCenturyStrip
                  counts={stats.eventCenturyCounts}
                  onOpen={onOpenEventsCentury}
                />
              </DashboardStyles.EventTimelineBlock>
            )}
          </DashboardStyles.RecordGridBody>
        </DashboardStyles.RecordGrid>
      </DashboardStyles.Section>

      {/* 최근 활동 — 전체 폭 2열 원장으로 표시 */}
      {(stats.loading.persons ||
        stats.loading.events ||
        stats.recentActivity.length > 0) && (
        <DashboardStyles.Section
          id="section-activity"
          data-section-count={
            stats.recentActivity.length > 0
              ? String(stats.recentActivity.length)
              : undefined
          }
        >
          <DashboardStyles.SectionTitleRow>
            <DashboardStyles.SectionTitleIcon>
              <IconClock />
            </DashboardStyles.SectionTitleIcon>
            <DashboardStyles.SectionTitleText>
              최근 활동
            </DashboardStyles.SectionTitleText>
            <SectionHelpPopover sectionKey="activity" />
            {stats.recentActivity.length > 0 && (
              <DashboardStyles.SectionCountChip>
                최근 {stats.recentActivity.length}건
              </DashboardStyles.SectionCountChip>
            )}
          </DashboardStyles.SectionTitleRow>
          <DashboardStyles.FeedPanel>
            <ActivityFeed
              items={stats.recentActivity}
              isLoading={stats.loading.persons || stats.loading.events}
              onPersonClick={goPerson}
              onEventClick={(eventId) => setPreviewEventId(eventId)}
              onNavigateDomain={(kind, _refId, personId) => {
                if (kind === 'tenure') {
                  if (personId) goPerson(personId)
                  else onGoToTab('heads')
                  return
                }
                if (
                  kind === 'political-system' ||
                  kind === 'cabinet' ||
                  kind === 'department'
                ) {
                  onGoToTab('government')
                  return
                }
                if (kind === 'city') {
                  onGoToTab('regions')
                  return
                }
                if (kind === 'law') {
                  onGoToTab('laws')
                  return
                }
                if (kind === 'treaty') {
                  onGoToTab('treaty')
                  return
                }
                if (kind === 'election') {
                  onGoToTab('elections')
                }
              }}
            />
          </DashboardStyles.FeedPanel>
        </DashboardStyles.Section>
      )}

      {/* 사건 캘린더 — 날짜가 있는 사건이 실제로 존재할 때만 노출 */}
      {(stats.loading.events || stats.calendarEvents.length > 0) && (
        <DashboardStyles.Section
          id="section-events"
          data-section-count={
            stats.calendarEvents.length > 0
              ? String(stats.calendarEvents.length)
              : undefined
          }
        >
          <DashboardStyles.SectionTitleRow>
            <DashboardStyles.SectionTitleIcon>
              <IconCalendar />
            </DashboardStyles.SectionTitleIcon>
            <DashboardStyles.SectionTitleText>사건 캘린더</DashboardStyles.SectionTitleText>
            <SectionHelpPopover sectionKey="calendar" />
            {stats.calendarEvents.length > 0 && (
              <DashboardStyles.SectionLink type="button" onClick={() => onGoToTab('events')}>
                주요 사건 전체 보기
              </DashboardStyles.SectionLink>
            )}
          </DashboardStyles.SectionTitleRow>
          {stats.loading.events ? (
            <ChartSkeleton variant="calendar" />
          ) : (
            <EventCalendarPanel
              key={country.id}
              events={stats.calendarEvents}
              onSelectEvent={setPreviewEventId}
            />
          )}
        </DashboardStyles.Section>
      )}

      {/* 역사 국가의 교역·기업 — 종합 원장 + 도메인 필터 + 빈 상세 패널 접기 */}
      <DashboardStyles.Section
        id="section-indicators"
        data-section-count={`${filledIndicatorDomains}/2`}
      >
        <DashboardStyles.SectionTitleRow>
          <DashboardStyles.SectionTitleIcon>
            <IconChart />
          </DashboardStyles.SectionTitleIcon>
          <DashboardStyles.SectionTitleText>
            교역 · 기업 지표
          </DashboardStyles.SectionTitleText>
          <SectionHelpPopover sectionKey="indicatorsHub" />
          <DashboardStyles.SectionCountChip>
            등록 {filledIndicatorDomains}/2개 도메인
          </DashboardStyles.SectionCountChip>
          <DashboardStyles.SectionHeaderActions>
            {emptyIndicatorDomains > 0 && (
              <DashboardStyles.SectionLink
                type="button"
                onClick={() => setShowEmptyIndicators((prev) => !prev)}
              >
                {showEmptyIndicators
                  ? `빈 섹션 접기`
                  : `빈 섹션 펼치기 (+${emptyIndicatorDomains})`}
              </DashboardStyles.SectionLink>
            )}
            <DashboardStyles.SectionLink
              type="button"
              onClick={() => onGoToTab('trade')}
            >
              교역 상세 보기 →
            </DashboardStyles.SectionLink>
          </DashboardStyles.SectionHeaderActions>
        </DashboardStyles.SectionTitleRow>

        <DashboardStyles.SectionHeadlineStrip aria-label="역사 국가 교역 및 기업 지표 요약">
          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              등록 도메인 현황
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={filledIndicatorDomains === 0}
            >
              {filledIndicatorDomains}/2
              <DashboardStyles.SectionHeadlineUnit>
                개 도메인
              </DashboardStyles.SectionHeadlineUnit>
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {emptyIndicatorDomains === 0
                ? '교역·기업 모두 등록 완료'
                : `미등록 ${emptyIndicatorDomains}개 도메인 · 아래 원장에서 추가`}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              교역 기록 연수
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue $muted={!hasTradeData}>
              {hasTradeData ? (
                <>
                  {tradeYearCount.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>
                    개년
                  </DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '미등록'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {hasTradeData
                ? '연도별 수출·수입 시계열 기록'
                : '연도별 교역 기록 미입력'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              누적 교역 건수
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue $muted={!hasTradeData}>
              {hasTradeData ? (
                <>
                  {tradeRecords.length.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>
                    건
                  </DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '미등록'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {hasTradeData
                ? '품목 · 교역 상대국 기록 포함'
                : '수출·수입 품목 및 상대국 미입력'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              등록 기업 · 상단
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue $muted={!hasCompanyData}>
              {hasCompanyData ? (
                <>
                  {companyCount.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>
                    개사
                  </DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '미등록'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {hasCompanyData
                ? '소속 상단 · 공방 · 금융기관'
                : '시대별 주요 기업·상단 미등록'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>
        </DashboardStyles.SectionHeadlineStrip>

        <DashboardStyles.IndicatorsLedgerWrap>
          <DashboardStyles.IndicatorsLedgerList>
            <DashboardStyles.IndicatorsLedgerItem>
              <DashboardStyles.IndicatorsLedgerRow>
                <DashboardStyles.IndicatorsLedgerIcon $filled={hasTradeData}>
                  <IconTrade />
                </DashboardStyles.IndicatorsLedgerIcon>
                <DashboardStyles.IndicatorsLedgerBody>
                  <DashboardStyles.IndicatorsLedgerTitleRow>
                    <DashboardStyles.IndicatorsLedgerTitle>
                      교역 (수출·수입)
                    </DashboardStyles.IndicatorsLedgerTitle>
                    <DashboardStyles.IndicatorsLedgerStatus $filled={hasTradeData}>
                      {hasTradeData ? `${tradeYearCount}개년` : '미등록'}
                    </DashboardStyles.IndicatorsLedgerStatus>
                  </DashboardStyles.IndicatorsLedgerTitleRow>
                  <DashboardStyles.IndicatorsLedgerScope $filled={hasTradeData}>
                    {hasTradeData
                      ? `교역 기록 ${tradeYearCount}개년 · 총 ${tradeRecords.length}건`
                      : '연도별 수출·수입 총액 · 품목 구성 · 주요 교역 상대국'}
                  </DashboardStyles.IndicatorsLedgerScope>
                </DashboardStyles.IndicatorsLedgerBody>
                <DashboardStyles.IndicatorsLedgerActions>
                  {hasTradeData && (
                    <DashboardStyles.IndicatorsLedgerFocusBtn
                      type="button"
                      $active={indicatorDomainFilter === 'trade'}
                      onClick={() =>
                        setIndicatorDomainFilter((prev) =>
                          prev === 'trade' ? 'all' : 'trade',
                        )
                      }
                    >
                      {indicatorDomainFilter === 'trade'
                        ? '필터 해제'
                        : '차트 집중'}
                    </DashboardStyles.IndicatorsLedgerFocusBtn>
                  )}
                  <DashboardStyles.IndicatorsLedgerActionBtn
                    type="button"
                    $filled={hasTradeData}
                    onClick={() => onGoToTab('trade')}
                  >
                    {hasTradeData ? '교역 탭 →' : '+ 교역 등록'}
                  </DashboardStyles.IndicatorsLedgerActionBtn>
                </DashboardStyles.IndicatorsLedgerActions>
              </DashboardStyles.IndicatorsLedgerRow>
            </DashboardStyles.IndicatorsLedgerItem>

            <DashboardStyles.IndicatorsLedgerItem>
              <DashboardStyles.IndicatorsLedgerRow>
                <DashboardStyles.IndicatorsLedgerIcon $filled={hasCompanyData}>
                  <IconBriefcase />
                </DashboardStyles.IndicatorsLedgerIcon>
                <DashboardStyles.IndicatorsLedgerBody>
                  <DashboardStyles.IndicatorsLedgerTitleRow>
                    <DashboardStyles.IndicatorsLedgerTitle>
                      기업 · 상단
                    </DashboardStyles.IndicatorsLedgerTitle>
                    <DashboardStyles.IndicatorsLedgerStatus $filled={hasCompanyData}>
                      {hasCompanyData
                        ? `${companyCount.toLocaleString()}개사`
                        : '미등록'}
                    </DashboardStyles.IndicatorsLedgerStatus>
                  </DashboardStyles.IndicatorsLedgerTitleRow>
                  <DashboardStyles.IndicatorsLedgerScope $filled={hasCompanyData}>
                    {hasCompanyData
                      ? `등록 기업·상단 ${companyCount.toLocaleString()}개사`
                      : '시대별 주요 기업 · 특권 상단 · 공방 · 금융기관'}
                  </DashboardStyles.IndicatorsLedgerScope>
                </DashboardStyles.IndicatorsLedgerBody>
                <DashboardStyles.IndicatorsLedgerActions>
                  {hasCompanyData && (
                    <DashboardStyles.IndicatorsLedgerFocusBtn
                      type="button"
                      $active={indicatorDomainFilter === 'companies'}
                      onClick={() =>
                        setIndicatorDomainFilter((prev) =>
                          prev === 'companies' ? 'all' : 'companies',
                        )
                      }
                    >
                      {indicatorDomainFilter === 'companies'
                        ? '필터 해제'
                        : '목록 집중'}
                    </DashboardStyles.IndicatorsLedgerFocusBtn>
                  )}
                  <DashboardStyles.IndicatorsLedgerActionBtn
                    type="button"
                    $filled={hasCompanyData}
                    onClick={() => onGoToTab('companies')}
                  >
                    {hasCompanyData ? '기업 탭 →' : '+ 기업 등록'}
                  </DashboardStyles.IndicatorsLedgerActionBtn>
                </DashboardStyles.IndicatorsLedgerActions>
              </DashboardStyles.IndicatorsLedgerRow>
            </DashboardStyles.IndicatorsLedgerItem>
          </DashboardStyles.IndicatorsLedgerList>

          {(filledIndicatorDomains > 0 || showEmptyIndicators) && (
            <DashboardStyles.IndicatorsFilterBar>
              {(
                [
                  {
                    key: 'all' as const,
                    label: '전체 도메인',
                    count: `${filledIndicatorDomains}/2`,
                  },
                  {
                    key: 'trade' as const,
                    label: '교역',
                    count: hasTradeData ? `${tradeYearCount}개년` : '0',
                  },
                  {
                    key: 'companies' as const,
                    label: '기업·상단',
                    count: hasCompanyData ? `${companyCount}개사` : '0',
                  },
                ] as const
              ).map((pill) => (
                <DashboardStyles.IndicatorsFilterChip
                  key={pill.key}
                  type="button"
                  $active={indicatorDomainFilter === pill.key}
                  onClick={() => setIndicatorDomainFilter(pill.key)}
                >
                  {pill.label} ({pill.count})
                </DashboardStyles.IndicatorsFilterChip>
              ))}
            </DashboardStyles.IndicatorsFilterBar>
          )}
        </DashboardStyles.IndicatorsLedgerWrap>

        {(filledIndicatorDomains > 0 || showEmptyIndicators) && (
          <DashboardStyles.IndicatorsGrid>
            {(indicatorDomainFilter === 'all' ||
              indicatorDomainFilter === 'trade') &&
              (hasTradeData ||
                showEmptyIndicators ||
                indicatorDomainFilter === 'trade') && (
                <TradeSection
                  historicalCountryId={country.id}
                  countryName={country.name}
                  onOpenDetailTab={() => onGoToTab('trade')}
                />
              )}
            {(indicatorDomainFilter === 'all' ||
              indicatorDomainFilter === 'companies') &&
              (hasCompanyData ||
                showEmptyIndicators ||
                indicatorDomainFilter === 'companies') && (
                <CountryCompaniesSection
                  historicalCountryId={country.id}
                  onOpenTab={() => onGoToTab('companies')}
                />
              )}
          </DashboardStyles.IndicatorsGrid>
        )}
      </DashboardStyles.Section>

      {/* 달력·활동·수반에서 누른 사건/인물 미리보기 — 섹션 조건 밖에 두어 열린 모달이 사라지지 않게 */}
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

/**
 * 대시보드 뿌리 — 폭 판단을 뷰포트가 아니라 **지면 자신의 폭**으로 한다(좌측 목록·레일을
 * 접고 펴면 같은 뷰포트에서도 본문 폭이 400px 넘게 달라진다).
 */
const DashboardRoot = styled(DashboardStyles.DashboardRoot)`
  container-type: inline-size;
  container-name: historical-dashboard;
`

const OverviewBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14.5px;
  line-height: 1.8;
  color: ${({ theme }) => theme.colors.text.primary};
`

const OverviewLedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 14px;
  line-height: 1.75;
  color: ${({ theme }) => theme.colors.text.primary};

  @container historical-dashboard (min-width: 820px) {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  }
`

const OverviewCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 14px 2px;

  @container historical-dashboard (min-width: 820px) {
    &:first-child {
      padding-right: 22px;
      border-right: 1px solid ${({ theme }) => theme.colors.border.light};
    }

    &:last-child {
      padding-left: 22px;
    }
  }

  @container historical-dashboard (max-width: 819px) {
    &:not(:first-child) {
      border-top: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const OverviewSubHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const OverviewInlineAction = styled.button`
  appearance: none;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const OverviewColEmpty = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OverviewPlain = styled.p`
  margin: 0;
  white-space: pre-wrap;
`

const NarrativeSubBlock = styled.div<{ $first?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: ${({ $first }) => ($first ? '0' : '12px')};
  margin-top: ${({ $first }) => ($first ? '0' : '4px')};
  border-top: ${({ theme, $first }) =>
    $first ? 'none' : `1px solid ${theme.colors.border.light}`};
`

const NarrativeSubLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.02em;
`

const OverviewActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const OverviewEditButton = styled.button`
  padding: 2px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const OverviewSaveButton = styled.button`
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  font-size: 12.5px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

/** 구조화 존속 연도 → 부호 연도(BC 음수) — 건국·멸망 카드 머리글 */
function foundingSignedYear(era: unknown, year: unknown): number | null {
  if (typeof year !== 'number') return null
  return era === 'BC' ? -year : year
}

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
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'tenured' | 'lifespan' | 'portrait'
  >('all')
  const [viewMode, setViewMode] = useState<'ledger' | 'cards'>('ledger')
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null)

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
          positionDefinition?: { name?: string | null } | null
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
        positionDefinition?: { name?: string | null } | null
      }>
    }
    const firstTenure = extended.governmentTenures?.[0]
    return (
      firstTenure?.title?.trim() ||
      firstTenure?.positionDefinition?.name?.trim() ||
      extended.jobTitle?.trim() ||
      null
    )
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
            {onGoToHeads && (
              <FiguresActionBtn type="button" onClick={onGoToHeads}>
                역대 수반 관리
              </FiguresActionBtn>
            )}
            <FiguresActionBtn
              type="button"
              onClick={() => navigate(pathKeys.personsDashboard())}
            >
              인물 대시보드 →
            </FiguresActionBtn>
          </FiguresHeadActions>
        </FiguresHeadRow>

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
                onClick={() => navigate(pathKeys.personsDashboard())}
              >
                인물 대시보드에서 연결 →
              </FiguresEmptySpecAction>
            </FiguresEmptySpecCell>
            <FiguresEmptySpecCell>
              <FiguresEmptySpecTitle>
                2. 역대 수반 · 관직 재임 등록
              </FiguresEmptySpecTitle>
              <FiguresEmptySpecDesc>
                역대 수반 탭이나 행정조직 탭에서 군주·국가원수·관직 재임자를 등록하면 별도 국적 설정 없이도 이 국가 인물로 함께 묶입니다.
              </FiguresEmptySpecDesc>
              {onGoToHeads && (
                <FiguresEmptySpecAction type="button" onClick={onGoToHeads}>
                  역대 수반 탭으로 이동 →
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
  padding: 2px 8px;
  border: none;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.activeLight};
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const ModernLinkMutedText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ModernLinkActionBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
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
