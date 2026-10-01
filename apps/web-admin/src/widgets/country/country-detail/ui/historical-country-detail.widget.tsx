import { useEffect, useState, useCallback, useRef } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import { useThemeStore } from '@/shared/styles/theme.store'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getPersonsByHistoricalCountryUnion } from '@/shared/api/persons'
import {
  formatCountryPeriod,
  getCountryDurationYears,
  getCountryYearRange,
} from '@/shared/lib/country-period'
import { PoliticalSystemTab } from '@/features/government-info/ui/political-system-tab.widget'
import { pathKeys } from '@/shared/router'
import { uploadImage } from '@/shared/api/upload'
import * as DetailStyles from './country-detail.styles'
import * as ListStyles from '@/widgets/country/country-list/ui/country-list.styles'

const CountryStyles = { ...DetailStyles, ...ListStyles }

import {
  updateHistoricalCountry,
  getTransitionsByHistoricalCountryId,
} from '@/shared/api/historical-countries'

import { CountryElectionsSection } from './country-elections-section.widget'
import { CountryLawsSection } from './country-laws-section.widget'
import { TradePanel } from './country-data-manager/trade-panel'
import { EthnicitySection } from './ethnicity-section.widget'
import { EventsTimelineSection } from './events-timeline-section.widget'
import { HeadsOfStateSection } from './heads-of-state-section.widget'
import { PersonCard } from './person/person-card'
import { TreatySectionWidget } from './treaty-section.widget'
import { LoadingOverlay } from './loading-overlay'
import { MapRegionAdministrativeView } from './map-region-administrative-view'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { HistoricalFoundingCards } from './historical-founding-cards'
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
import {
  useHistoricalCountryDashboard,
  type HistoricalCompletenessField,
} from '../model/use-historical-country-dashboard'
import type { CompletenessField } from '../model/use-country-dashboard-stats'
import {
  IconCalendar,
  IconChart,
  IconClock,
  IconGlobe,
  IconHistory,
  IconLandmark,
  IconScroll,
  IconUserCheck,
  IconVote,
} from './country-detail-dashboard.icons'
import { ActivityFeed } from './dashboard-panels/activity-feed'
import { ChartEmpty } from './dashboard-panels/chart-empty'
import { ChartSkeleton } from './dashboard-panels/chart-skeleton'
import { CompletenessPanel } from './dashboard-panels/completeness-panel'
import { EventCalendarPanel } from './dashboard-panels/event-calendar-panel'
import { EventCenturyStrip } from './dashboard-panels/event-century-strip'
import { HistoricalRulerTimeline } from './dashboard-panels/historical-ruler-timeline'
import { LineageFlow } from './dashboard-panels/lineage-flow'
import { PoliticalSystemPanel } from './dashboard-panels/political-system-panel'
import { RecordLedger, type RecordLedgerRow } from './dashboard-panels/record-ledger'
import { SectionEmpty } from './dashboard-panels/section-empty'
import { SectionNav } from './dashboard-panels/section-nav'

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
  | 'succession' // 계승 관계
  | 'membership' // 소속·구성 (신성로마-제후국 등)
  | 'relation' // 국가 관계 (한·중 조공, 동맹 등)
  | 'treaty' // 조약·협정 (강화도조약 등)
  | 'culture' // 문화 유산

/**
 * 페이지 → 위젯이 받는 URL-동기화 가능한 탭 키 부분집합.
 *
 * `HistoricalCountryTab`은 더 많은 탭을 가지지만 URL 매핑은 `CountryDetailTabKey`와
 * 겹치는 것만 노출 — modern과 어휘 일치를 유지해 페이지 전환·딥링크 동작을 통일한다.
 */
type HistoricalSyncedTab =
  | 'heads'
  | 'regions'
  | 'government'
  | 'elections'
  | 'laws'
  | 'ethnicity'
  | 'treaty'

interface HistoricalCountryDetailProps {
  country: UnifiedCountry
  isLoading?: boolean
  onEdit?: (country: UnifiedCountry) => void
  onDelete?: (id: string) => void
  /** URL 연동: 특정 탭으로 직접 진입 시 (`'dashboard'` 등 historical에 없는 키는 외부에서 매핑 안 됨). */
  initialTab?: HistoricalSyncedTab
  /** 탭 변경 시 URL 갱신 콜백 — overview 등으로 돌아갈 땐 null. */
  onTabChangeToUrl?: (tab: HistoricalSyncedTab | null) => void
}

/*
 * 'heads'(역대 수반)는 URL에 싣지 않는다 — 라우팅 훅이 현대 국가 규약대로 heads를 행정조직
 * URL(/government)로 접어, 역사 국가에서 '역대 수반'을 누르면 행정조직(정체) 탭으로 튕겼다.
 * 역사 국가엔 역대 수반이 독립 탭이라 로컬 상태로만 둔다.
 */
const SYNCED_TAB_SET = new Set<HistoricalCountryTab>([
  'regions',
  'government',
  'elections',
  'laws',
  'ethnicity',
  'treaty',
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
  const [activeTab, setActiveTab] = useState<HistoricalCountryTab>(
    () => initialTab ?? 'overview',
  )

  // 이 위젯은 country-detail.widget이 country.type === 'historical'로 분기 후에만 마운트됨 — id 직접 사용.
  const historicalCountryId = country.id
  const { data: transitions = [] } = useQuery({
    queryKey: ['historical-country-transitions', historicalCountryId],
    queryFn: () => getTransitionsByHistoricalCountryId(historicalCountryId),
    enabled: !!historicalCountryId,
  })
  // 이 국가가 후임인 변천 = 탄생 유형 (고려 → 조선 시 조선 입장에서 "계승")
  const incomingTransition = transitions.find(
    (t) => t.successorId === historicalCountryId,
  )
  const incomingCategoryLabel = incomingTransition
    ? TRANSITION_EVENT_LABELS[incomingTransition.eventType] ?? incomingTransition.eventType
    : null

  const handleTabChange = (tab: HistoricalCountryTab) => {
    setActiveTab(tab)
    // URL과 연동되는 탭만 부모로 전파, 그 외(overview·events·figures 등)는 null로 reset.
    onTabChangeToUrl?.(
      SYNCED_TAB_SET.has(tab) ? (tab as HistoricalSyncedTab) : null,
    )
  }

  // URL에서 직접 진입·뒤로가기 시 탭 동기화 — initialTab이 있으면 그 탭, 없으면 synced 탭에 머물러 있을 때만 overview로 복귀.
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
      return
    }
    setActiveTab((prev) => (SYNCED_TAB_SET.has(prev) ? 'overview' : prev))
  }, [initialTab])

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
                />
              </CountryStyles.StickyTopBar>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                  }}
                >
                  {activeTab === 'overview' && (
                    <>
                      <CountryDetailHeader
                        country={country}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        fallbackIcon="🏛️"
                        meta={
                          <HistoricalHeaderMeta
                            country={country}
                            incomingCategoryLabel={incomingCategoryLabel}
                          />
                        }
                      />
                      <HistoricalOverviewSection
                        country={country}
                        onGoToTab={handleTabChange}
                      />
                    </>
                  )}
                  {/*
                    주요 사건 — 현대 국가와 동일한 연대표 위젯을 재사용한다.
                    사건 목록 API는 countryId에 역사국가 id를 넣으면
                    event_country_relation.historicalCountryId로 매칭된다.
                  */}
                  {activeTab === 'events' && (
                    <EventsTimelineSection countryId={country.id} />
                  )}
                  {activeTab === 'figures' && (
                    <HistoricalFiguresSection country={country} />
                  )}
                  {activeTab === 'heads' && (
                    <HeadsOfStateSection country={country} />
                  )}
                  {activeTab === 'regions' && (
                    <HistoricalRegionsSection country={country} />
                  )}
                  {activeTab === 'government' && (
                    /*
                      예전엔 "행정조직 정보는 현대 국가 상세에서" 한 줄이 전부였다.
                      정체(政體)만은 과거 국가에 그대로 붙는다 — 스키마도 dual FK고,
                      조선이 절대군주제·의회 없음이라는 사실을 적을 자리가 여기 말고는
                      없었다. 관직 정의·행정기구는 여전히 현대 국가 지면 몫이다.
                    */
                    <HistoricalGovernmentPane>
                      <PoliticalSystemTab
                        historicalCountryId={country.id}
                        countryName={country.name}
                      />
                      <HistoricalGovernmentNote>
                        관직 정의·행정기구는 현대 국가 상세의 행정조직 탭에서 관리합니다.
                      </HistoricalGovernmentNote>
                    </HistoricalGovernmentPane>
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
                      <TradePanel historicalCountryId={country.id} />
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
                  {/* 문화는 저작 API가 없어 플레이스홀더 — 로드맵 확정 시 배선.
                      영토 변천 탭은 저작 모델·데이터가 없어 제거함(행정구역은 regions 탭에서 실제 지원). */}
                  {activeTab === 'culture' && <CultureSection />}
                </motion.div>
              </AnimatePresence>
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

/** 머리글 메타 줄 — 영문 표기 · 존속 기간 · 국가 형태 · 변천 */
function HistoricalHeaderMeta({
  country,
  incomingCategoryLabel,
}: {
  country: UnifiedCountry
  incomingCategoryLabel?: string | null
}) {
  const period = formatCountryPeriod(country)
  return (
    <>
      {country.enName && <CountryStyles.HeroLocalName>{country.enName}</CountryStyles.HeroLocalName>}
      {country.enName && period && <CountryStyles.HeroMetaSep aria-hidden>·</CountryStyles.HeroMetaSep>}
      {period && <span>{period}</span>}
      {country.stateType && (
        <CountryStyles.HeroMetaChip>{getStateTypeLabel(country.stateType)}</CountryStyles.HeroMetaChip>
      )}
      {incomingCategoryLabel && (
        <CountryStyles.HeroMetaChip title="이 나라가 성립한 변천 유형">
          {incomingCategoryLabel}
        </CountryStyles.HeroMetaChip>
      )}
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
const HISTORICAL_TABS: ReadonlyArray<{ id: HistoricalCountryTab; label: string }> = [
  // id는 URL·동기화 탭 키라 그대로 두고 이름만 — 현대 국가 지면도 '대시보드'다
  { id: 'overview', label: '대시보드' },
  { id: 'events', label: '주요 사건' },
  { id: 'figures', label: '인물' },
  { id: 'heads', label: '역대 수반' },
  { id: 'succession', label: '계승' },
  { id: 'membership', label: '소속·구성' },
  { id: 'relation', label: '국가 관계' },
  { id: 'treaty', label: '조약' },
  { id: 'government', label: '행정조직' },
  { id: 'regions', label: '행정구역' },
  { id: 'laws', label: '법령' },
  { id: 'ethnicity', label: '민족' },
  { id: 'trade', label: '교역' },
  { id: 'elections', label: '선거·투표' },
]

const historicalTabId = (tab: HistoricalCountryTab) => `historical-country-tab-${tab}`

function HistoricalCountryTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: HistoricalCountryTab
  onTabChange: (tab: HistoricalCountryTab) => void
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
            return (
              <UnderlineTabButton
                key={tab.id}
                id={historicalTabId(tab.id)}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                $active={active}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </UnderlineTabButton>
            )
          })}
        </TabStyles.TopUnderlineTabNav>
      </TabStyles.Left>
    </TabStyles.Row>
  )
}

// ============================================
// 역사 개요 섹션
// ============================================

function HistoricalOverviewSection({
  country,
  onGoToTab,
}: {
  country: UnifiedCountry
  /** 요약 칸에서 해당 탭으로(역대 수반·사건·계승 …) */
  onGoToTab: (tab: HistoricalCountryTab) => void
}) {
  /* 구조화 존속 연도 — UnifiedCountry 타입엔 없지만 역사 국가 응답에는 실려 온다 */
  const structuredSpan = country as UnifiedCountry & {
    startEra?: string | null
    startYear?: number | null
    endEra?: string | null
    endYear?: number | null
  }

  const entityKind = (country as UnifiedCountry & { entityKind?: unknown }).entityKind as
    | 'STATE'
    | 'REGIME'
    | 'PERIOD'
    | null
    | undefined

  const queryClient = useQueryClient()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  /*
   * 개요 원문 — 이 화면의 country는 국가 목록에서 온 **경량 항목**일 수 있다(description 없음 →
   * historicalToUnified가 undefined). 그대로 쓰면 DB에 개요가 있는데도 '개요가 없습니다'가 떴다
   * (실측: 벨기에 왕국 544자). 없을 때만 상세를 단건 조회해 채운다.
   */
  const needsFullRecord = country.description === undefined
  const fullRecordQuery = useHistoricalCountry(needsFullRecord ? country.id : '')
  const resolvedDescription = needsFullRecord
    ? fullRecordQuery.data?.description
    : country.description
  // 현재 표시할 description. 원문으로 초기화하고 저장 시 직접 교체
  const [savedDescription, setSavedDescription] = useState<string | null | undefined>(
    () => resolvedDescription,
  )
  // stale closure 방지용 ref — 항상 최신 에디터 값을 보관
  const editorValueRef = useRef('')

  // 국가 변경 시 리셋
  useEffect(() => {
    setSavedDescription(resolvedDescription)
  }, [country.id, resolvedDescription])

  const updateMutation = useMutation({
    mutationFn: (description: string) =>
      updateHistoricalCountry(country.id, { description: description || undefined }),
    onSuccess: (_, description) => {
      const saved = description || null
      console.log('[OverviewSave] onSuccess description =', description, '/ saved =', saved)
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
    console.log('[OverviewSave] editorValueRef.current =', editorValueRef.current)
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
  const goPerson = (personId: string) =>
    navigate(pathKeys.personsTimelineDetail(personId))
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
  ]
  const totalRecords = recordAxes.reduce((sum, row) => sum + row.value, 0)

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
      return
    }
    onGoToTab(target)
  }

  return (
    <DashboardRoot ref={rootRef}>
      {/* 규모 줄 — 현대 국가 대시보드와 같은 칸(FactBar). 역사 국가의 '규모'는 시간이다 */}
      <DashboardStyles.FactBar aria-label="국가 개요 지표">
        <DashboardStyles.Fact>
          <DashboardStyles.FactLabel>존속 기간</DashboardStyles.FactLabel>
          <DashboardStyles.FactValue>{period}</DashboardStyles.FactValue>
        </DashboardStyles.Fact>
        {durationYears != null && (
          <DashboardStyles.Fact>
            <DashboardStyles.FactLabel>존속 연수</DashboardStyles.FactLabel>
            <DashboardStyles.FactValue>
              {durationYears.toLocaleString()}
              <DashboardStyles.FactUnit>년</DashboardStyles.FactUnit>
            </DashboardStyles.FactValue>
          </DashboardStyles.Fact>
        )}
        {country.stateType && (
          <DashboardStyles.Fact>
            <DashboardStyles.FactLabel>국가 형태</DashboardStyles.FactLabel>
            <DashboardStyles.FactValue>{getStateTypeLabel(country.stateType)}</DashboardStyles.FactValue>
          </DashboardStyles.Fact>
        )}
        {entityKind && entityKindLabel && (
          <DashboardStyles.Fact>
            <DashboardStyles.FactLabel>정치체 성격</DashboardStyles.FactLabel>
            <DashboardStyles.FactValue>{entityKindLabel}</DashboardStyles.FactValue>
          </DashboardStyles.Fact>
        )}
        {rulerCount > 0 && (
          <DashboardStyles.Fact>
            <DashboardStyles.FactLabel>역대 수반</DashboardStyles.FactLabel>
            <DashboardStyles.FactValue>
              {rulerCount}
              <DashboardStyles.FactUnit>명</DashboardStyles.FactUnit>
            </DashboardStyles.FactValue>
          </DashboardStyles.Fact>
        )}
        {capitalText && (
          <DashboardStyles.Fact>
            <DashboardStyles.FactLabel>수도</DashboardStyles.FactLabel>
            <DashboardStyles.FactValue>{capitalText}</DashboardStyles.FactValue>
          </DashboardStyles.Fact>
        )}
      </DashboardStyles.FactBar>

      {/* 목차 — 장이 열 개 가까이 이어진다. 장 목록은 아래 <section>+<h2>에서 읽는다 */}
      <SectionNav rootRef={rootRef} />

      {/* 첫 줄 — 글(이 나라가 무엇이었나) 옆에 기록 입구(무엇이 얼마나 쌓였나) */}
      <DashboardPair $lead $tall="aside">
        {/* 개요 — 이 나라가 무엇이었나. 글이 곧 이 지면의 첫 답이다 */}
        <DashboardStyles.Section aria-labelledby="historical-overview-heading">
          <DashboardStyles.SectionTitleRow>
            <DashboardStyles.SectionTitleIcon>
              <IconScroll />
            </DashboardStyles.SectionTitleIcon>
            <DashboardStyles.SectionTitleText id="historical-overview-heading">
              개요
            </DashboardStyles.SectionTitleText>
            {!isEditorOpen && (
              <DashboardStyles.SectionLink type="button" onClick={handleOpenEditor}>
                {savedDescription ? '수정' : '+ 작성'}
              </DashboardStyles.SectionLink>
            )}
          </DashboardStyles.SectionTitleRow>
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
          ) : savedDescription ? (
            <OverviewBody>
              {isLikelyRichTextHtml(savedDescription) ? (
                <RichTextReadView html={savedDescription} />
              ) : (
                <OverviewPlain>{savedDescription}</OverviewPlain>
              )}
            </OverviewBody>
          ) : (
            <SectionEmpty
              text="이 나라가 어떤 나라였는지 몇 문단으로 적어 두면 지면 맨 위에서 먼저 읽힙니다."
              actionLabel="개요 작성"
              onAction={handleOpenEditor}
            />
          )}
        </DashboardStyles.Section>

        {/* 기록 — 각 탭으로 가는 입구(숫자가 곧 링크) + 사건의 세기 분포 */}
        <DashboardStyles.Section>
          <DashboardStyles.SectionTitleRow>
            <DashboardStyles.SectionTitleIcon>
              <IconChart />
            </DashboardStyles.SectionTitleIcon>
            <DashboardStyles.SectionTitleText>기록</DashboardStyles.SectionTitleText>
            <DashboardStyles.SectionCountChip>
              총 {totalRecords.toLocaleString('ko-KR')}건
            </DashboardStyles.SectionCountChip>
          </DashboardStyles.SectionTitleRow>
          <DashboardStyles.RecordGrid>
            <DashboardStyles.RecordGridBody>
              <RecordLedger rows={recordAxes} />
              {stats.eventCenturyCounts.length > 0 && (
                <DashboardStyles.EventTimelineBlock>
                  <DashboardStyles.EventTimelineLabel>사건 연표</DashboardStyles.EventTimelineLabel>
                  <EventCenturyStrip
                    counts={stats.eventCenturyCounts}
                    onOpen={() => onGoToTab('events')}
                  />
                </DashboardStyles.EventTimelineBlock>
              )}
            </DashboardStyles.RecordGridBody>
          </DashboardStyles.RecordGrid>
        </DashboardStyles.Section>

        {/* 더 채울 것 — 개요가 짧으면 그 아래가 비어 있었다. 무엇을 쓸지 바로 이어 보이게 */}
        <DashboardStyles.Section>
          <DashboardStyles.SectionTitleRow>
            <DashboardStyles.SectionTitleIcon>
              <IconGlobe />
            </DashboardStyles.SectionTitleIcon>
            <DashboardStyles.SectionTitleText>더 채울 것</DashboardStyles.SectionTitleText>
          </DashboardStyles.SectionTitleRow>
          <CompletenessPanel
            filled={stats.completeness.filled}
            total={stats.completeness.total}
            missing={stats.completeness.missing}
            isLoading={stats.isCompletenessLoading}
            onFillMissing={goFill}
          />
        </DashboardStyles.Section>
      </DashboardPair>

      {/* 건국·멸망 — 존속 기간의 양 끝이 '어떻게' 열리고 닫혔나(배경·사건·초대·전신/후신) */}
      <DashboardStyles.Section aria-labelledby="historical-founding-heading">
        <DashboardStyles.SectionTitleRow>
          <DashboardStyles.SectionTitleIcon>
            <IconCalendar />
          </DashboardStyles.SectionTitleIcon>
          <DashboardStyles.SectionTitleText id="historical-founding-heading">
            건국·멸망
          </DashboardStyles.SectionTitleText>
        </DashboardStyles.SectionTitleRow>
        <HistoricalFoundingCards
          historicalCountryId={country.id}
          entityKind={entityKind ?? null}
          startYear={foundingSignedYear(structuredSpan.startEra, structuredSpan.startYear)}
          endYear={foundingSignedYear(structuredSpan.endEra, structuredSpan.endYear)}
          onGoToHeads={() => onGoToTab('heads')}
        />
      </DashboardStyles.Section>

      {/* 계보 — 전신·후신 두 대까지 세기 축 위에. 이 나라는 강조, 나머지는 눌러 건너간다 */}
      <DashboardStyles.Section>
        <DashboardStyles.SectionTitleRow>
          <DashboardStyles.SectionTitleIcon>
            <IconHistory />
          </DashboardStyles.SectionTitleIcon>
          <DashboardStyles.SectionTitleText>계보</DashboardStyles.SectionTitleText>
          {stats.lineage.length > 1 && (
            <DashboardStyles.SectionCountChip>
              앞뒤 {stats.lineage.length - 1}개국
            </DashboardStyles.SectionCountChip>
          )}
          <DashboardStyles.SectionLink type="button" onClick={() => onGoToTab('succession')}>
            계승 관리
          </DashboardStyles.SectionLink>
        </DashboardStyles.SectionTitleRow>
        {stats.loading.lineage ? (
          <ChartSkeleton variant="bars" />
        ) : stats.lineage.length <= 1 ? (
          <SectionEmpty
            text="이 나라가 무엇에서 나와 무엇으로 이어졌는지 계승 관계를 걸면, 앞뒤 두 대까지 세기 축 위에 그려집니다."
            actionLabel="계승 관계 추가"
            onAction={() => onGoToTab('succession')}
          />
        ) : (
          <LineageFlow
            historicalCountries={stats.lineage}
            currentId={country.id}
            onSelect={(id) => navigate(pathKeys.countryDetail(id))}
            maxPerColumn={4}
          />
        )}
      </DashboardStyles.Section>

      {/* 누가 다스렸나 옆에 어떤 체제였나 — 둘 다 '통치'의 두 얼굴이다 */}
      <DashboardPair $tall="main">
        {/* 역대 수반 — 끝난 나라엔 '지금'이 없다. 누가 얼마나 다스렸나가 이 나라의 윤곽이다 */}
        <DashboardStyles.Section>
          <DashboardStyles.SectionTitleRow>
            <DashboardStyles.SectionTitleIcon>
              <IconVote />
            </DashboardStyles.SectionTitleIcon>
            <DashboardStyles.SectionTitleText>역대 수반</DashboardStyles.SectionTitleText>
            {rulerCount > 0 && (
              <DashboardStyles.SectionCountChip>{rulerCount}명</DashboardStyles.SectionCountChip>
            )}
            {outOfSpanRulerCount > 0 && (
              <DashboardStyles.SectionCountChip
                title="존속 기간 밖에서 시작·종료한 기록 — 다른 나라에 걸려야 할 행일 수 있습니다"
              >
                기간 밖 {outOfSpanRulerCount}
              </DashboardStyles.SectionCountChip>
            )}
            <DashboardStyles.SectionLink type="button" onClick={() => onGoToTab('heads')}>
              전체 보기
            </DashboardStyles.SectionLink>
          </DashboardStyles.SectionTitleRow>
          {stats.loading.tenures ? (
            <ChartSkeleton variant="bars" />
          ) : stats.rulers.length === 0 ? (
            <SectionEmpty
              text="군주·국가원수·정부수반의 재위를 등록하면 존속 기간 위에 치세가 띠로 깔리고, 사람마다 카드가 섭니다."
              actionLabel="수반 등록"
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

        {/* 정체 — 어떤 체제였나(현대 국가와 같은 패널, 역사 국가 FK로) */}
        <PoliticalSystemPanel
          historicalCountryId={country.id}
          countryName={country.name}
          onOpenAll={() => onGoToTab('government')}
        />

        {/* 최근 활동 — 정체 아래 빈자리로(예전엔 맨 아래 따로 한 줄) */}
        <DashboardStyles.Section>
          <DashboardStyles.SectionTitleRow>
            <DashboardStyles.SectionTitleIcon>
              <IconClock />
            </DashboardStyles.SectionTitleIcon>
            <DashboardStyles.SectionTitleText>최근 활동</DashboardStyles.SectionTitleText>
            {stats.recentActivity.length > 0 && (
              <DashboardStyles.SectionCountChip>
                최근 {Math.min(stats.recentActivity.length, RECENT_ACTIVITY_LIMIT)}건
              </DashboardStyles.SectionCountChip>
            )}
          </DashboardStyles.SectionTitleRow>
          <DashboardStyles.FeedPanel>
            <ActivityFeed
              // 정체 아래 좁은 칸이라 6건 — 옆 역대 수반보다 길어지면 그쪽 아래가 빈다
              items={stats.recentActivity.slice(0, RECENT_ACTIVITY_LIMIT)}
              isLoading={stats.loading.persons || stats.loading.events}
              onPersonClick={goPerson}
              onEventClick={() => onGoToTab('events')}
            />
          </DashboardStyles.FeedPanel>
        </DashboardStyles.Section>
      </DashboardPair>

      {/* 사건 캘린더 — 연표가 '어느 세기'를 말하면 달력은 '그 달 며칠'을 말한다 */}
      <DashboardStyles.Section>
        <DashboardStyles.SectionTitleRow>
          <DashboardStyles.SectionTitleIcon>
            <IconCalendar />
          </DashboardStyles.SectionTitleIcon>
          <DashboardStyles.SectionTitleText>사건 캘린더</DashboardStyles.SectionTitleText>
          {stats.calendarEvents.length > 0 && (
            <DashboardStyles.SectionLink type="button" onClick={() => onGoToTab('events')}>
              주요 사건 전체 보기
            </DashboardStyles.SectionLink>
          )}
        </DashboardStyles.SectionTitleRow>
        {stats.loading.events ? (
          <ChartSkeleton variant="calendar" />
        ) : stats.calendarEvents.length === 0 ? (
          <ChartEmpty
            text="날짜가 있는 사건을 이 나라에 걸면 여기 달력에 그 날짜로 앉습니다."
            actionLabel="주요 사건으로"
            onAction={() => onGoToTab('events')}
          >
            <EventCalendarPanel events={[]} onSelectEvent={() => {}} />
          </ChartEmpty>
        ) : (
          <EventCalendarPanel
            events={stats.calendarEvents}
            onSelectEvent={setPreviewEventId}
          />
        )}
      </DashboardStyles.Section>

      {/* 달력에서 누른 사건 미리보기 — 섹션 조건 밖에 두어 열린 모달이 사라지지 않게 */}
      <EventInlineModal
        eventId={previewEventId}
        onClose={() => setPreviewEventId(null)}
        onNavigate={(eventId) => navigate(pathKeys.events.detail(eventId))}
      />
    </DashboardRoot>
  )
}

/**
 * 대시보드 뿌리 — 폭 판단을 뷰포트가 아니라 **지면 자신의 폭**으로 한다(좌측 목록·레일을
 * 접고 펴면 같은 뷰포트에서도 본문 폭이 400px 넘게 달라진다).
 */
/** 최근 활동 칸 건수 — 정체 아래 좁은 칸에 들어간다 */
const RECENT_ACTIVITY_LIMIT = 6

const DashboardRoot = styled(DashboardStyles.DashboardRoot)`
  container-type: inline-size;
  container-name: historical-dashboard;
`

/**
 * 두 장을 나란히 — 한 줄로 길게 이어지던 지면(1440×1000에서 화면 5장)을 줄인다.
 * 좁으면 한 줄로 되돌아간다. 선은 줄이 긋고 안의 장은 긋지 않는다(BottomRow와 같은 규약).
 * 두 칸이 높이를 맞추지 않게 start 정렬 — 짧은 쪽 아래가 통째로 비지 않도록.
 */
const DashboardPair = styled.div<{ $lead?: boolean; $tall: 'main' | 'aside' }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 32px 40px;
  padding-top: 30px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  /* 목차 바로 밑의 첫 줄 — 목차가 이미 선을 긋고 있어 두 겹이 된다 */
  ${({ $lead }) =>
    $lead &&
    `
    padding-top: 0;
    border-top: none;
  `}

  > section {
    padding-top: 0;
    border-top: none;
  }

  /* 한 줄일 때 둘째 장은 첫째와 선으로 가른다 */
  > section + section {
    padding-top: 30px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  }

  /* 1440 화면·목록 펼침에서 본문이 960px — 이때 두 칸이 서야 한다 */
  @container historical-dashboard (min-width: 880px) {
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    /* 첫 줄은 내용만큼, 남는 높이는 둘째 줄로 — 긴 칸 옆 짧은 칸 사이에 틈이 벌어지지 않게 */
    grid-template-rows: auto 1fr;

    > section + section {
      padding-top: 0;
      border-top: none;
    }

    /*
     * 세 장을 두 칸에 — 한쪽은 긴 장 하나가 두 줄을 차지하고, 다른 쪽은 짧은 장 둘을 쌓는다.
     * aside: [개요 | 기록] / [더 채울 것 | 기록]
     * main:  [역대 수반 | 정체] / [역대 수반 | 최근 활동]
     */
    ${({ $tall }) =>
      $tall === 'aside'
        ? `
      > :nth-child(1) { grid-column: 1; grid-row: 1; }
      > :nth-child(2) { grid-column: 2; grid-row: 1 / span 2; }
      > :nth-child(3) { grid-column: 1; grid-row: 2; }
    `
        : `
      > :nth-child(1) { grid-column: 1; grid-row: 1 / span 2; }
      > :nth-child(2) { grid-column: 2; grid-row: 1; }
      > :nth-child(3) { grid-column: 2; grid-row: 2; }
    `}

    /* 같은 칸에 쌓인 둘째 장 — 옅은 선으로만 가른다 */
    > :nth-child(3) {
      padding-top: 24px;
      border-top: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const OverviewBody = styled.div`
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14.5px;
  line-height: 1.8;
  color: ${({ theme }) => theme.colors.text.primary};
`

const OverviewPlain = styled.p`
  margin: 0;
  white-space: pre-wrap;
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
function HistoricalFiguresSection({ country }: { country: UnifiedCountry }) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const navigate = useNavigate()

  const { data: figures = [], isLoading } = useQuery({
    queryKey: ['historical-country-union-persons', country.id],
    queryFn: () => getPersonsByHistoricalCountryUnion(country.id),
    enabled: !!country.id,
  })

  if (isLoading) {
    return (
      <div
        style={{
          padding: '48px',
          background: isDark ? '#1d1d1d' : '#fafafa',
          minHeight: 'calc(100vh - 300px)',
          textAlign: 'center',
          color: isDark ? '#a1a1aa' : '#64748b',
        }}
      >
        불러오는 중…
      </div>
    )
  }

  if (figures.length === 0) {
    return (
      <div
        style={{
          padding: '48px',
          background: isDark ? '#1d1d1d' : '#fafafa',
          minHeight: 'calc(100vh - 300px)',
        }}
      >
        <EmptyState
          message="등록된 인물이 없습니다"
          description="이 국가를 주 국적으로 삼거나 재임·소속 기록이 있는 인물이 여기에 표시됩니다."
          isDark={isDark}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '48px',
        background: isDark ? '#1d1d1d' : '#fafafa',
        minHeight: 'calc(100vh - 300px)',
      }}
    >
      <p
        style={{
          margin: '0 0 20px',
          fontSize: 13,
          color: isDark ? '#a1a1aa' : '#64748b',
        }}
      >
        이 국가 소속 인물 {figures.length}명
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '20px',
        }}
      >
        {figures.map((figure, index) => (
          <PersonCard
            key={figure.id}
            person={figure}
            index={index}
            onClick={() => navigate(pathKeys.personsTimelineDetail(figure.id))}
          />
        ))}
      </div>
    </div>
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

// ============================================
// 문화 유산 섹션
// ============================================

/**
 * 문화 유산 탭 — 저작 가능한 데이터 모델·API가 아직 없어 정직한 '준비 중' 상태.
 *
 * 과거에는 국가명 includes('조선'|'고려') 매칭으로 하드코딩 목업을 렌더해
 * 실데이터로 오인될 수 있었다(예: 북한 상세에 조선왕조 유산). 목업을 제거해
 * 정직한 플레이스홀더로 둔다.
 */
function CultureSection() {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  return (
    <div
      style={{
        padding: '48px',
        background: isDark ? '#1d1d1d' : '#fafafa',
        minHeight: 'calc(100vh - 300px)',
      }}
    >
      <EmptyState
        message="문화 유산 정보가 준비 중입니다"
        description="문화재·예술·기록유산을 등록·표시하는 기능은 아직 제공되지 않습니다"
        isDark={isDark}
      />
    </div>
  )
}

// ============================================
// 공통 컴포넌트
// ============================================

function EmptyState({
  message,
  description,
  isDark = false,
}: {
  message: string
  description?: string
  isDark?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '80px 40px',
        background: isDark ? '#212121' : 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
        border: `1px solid ${isDark ? '#2a2a2a' : '#e2e8f0'}`,
        borderRadius: '14px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: isDark ? '#2a2a2a' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
        }}
      >
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDark ? '#a1a1aa' : '#64748b'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <div
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: isDark ? '#f5f5f5' : '#0f172a',
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}
        >
          {message}
        </div>
        {description && (
          <div style={{ fontSize: '14px', color: isDark ? '#a1a1aa' : '#64748b' }}>
            {description}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({
  label,
  value,
  color,
  isDark = false,
}: {
  label: string
  value: string
  color: string
  isDark?: boolean
}) {
  return (
    <div
      style={{
        padding: '24px',
        background: isDark ? '#212121' : '#ffffff',
        border: `1px solid ${isDark ? '#2a2a2a' : '#f1f5f9'}`,
        borderRadius: '14px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = isDark ? '#3f3f46' : '#cbd5e1'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = isDark ? '#2a2a2a' : '#f1f5f9'
      }}
    >
      {/* 좌측 컬러 라인 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          background: color,
        }}
      />

      <div style={{ position: 'relative', paddingLeft: '12px' }}>
        <div
          style={{
            fontSize: '12px',
            color: isDark ? '#71717a' : '#94a3b8',
            marginBottom: '8px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: isDark ? '#f5f5f5' : '#0f172a',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

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
