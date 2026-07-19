import { useEffect, useState, useCallback, useRef } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import { useThemeStore } from '@/shared/styles/theme.store'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getPersonsByTenureCountry } from '@/shared/api/persons'
import {
  formatCountryPeriod,
  getCountryDurationYears,
} from '@/shared/lib/country-period'
import { pathKeys } from '@/shared/router'
import { uploadImage } from '@/shared/api/upload'
import * as DetailStyles from './country-detail.styles'
import * as ListStyles from '@/widgets/country/country-list/ui/country-list.styles'

const CountryStyles = { ...DetailStyles, ...ListStyles }

import {
  updateHistoricalCountry,
  getTransitionsByHistoricalCountryId,
  createHistoricalCountryTransition,
  deleteHistoricalCountryTransition,
  getAllHistoricalCountries,
  getMembershipsByHistoricalCountryId,
  createHistoricalCountryMembership,
  updateHistoricalCountryMembership,
  deleteHistoricalCountryMembership,
  getRelationsByHistoricalCountryId,
  createHistoricalCountryRelation,
  deleteHistoricalCountryRelation,
  type HistoricalCountryTransitionDto,
  type CreateHistoricalCountryTransitionDto,
  type TransitionEventType,
  type HistoricalCountryMembershipDto,
  type CreateHistoricalCountryMembershipDto,
  type UpdateHistoricalCountryMembershipDto,
  type HistoricalMembershipRole,
  type HistoricalCountryRelationDto,
  type CreateHistoricalCountryRelationDto,
  type HistoricalRelationType,
} from '@/shared/api/historical-countries'

import { CountryFlag } from '../../shared'
import * as S from './country-detail.styles'
import { CountryElectionsSection } from './country-elections-section.widget'
import { CountryLawsSection } from './country-laws-section.widget'
import { EthnicitySection } from './ethnicity-section.widget'
import { EventsTimelineSection } from './events-timeline-section.widget'
import { HeadsOfStateSection } from './heads-of-state-section.widget'
import { PersonCard } from './person/person-card'
import { LoadingOverlay } from './loading-overlay'
import { MapRegionAdministrativeView } from './map-region-administrative-view'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view/rich-text-read-view'
import { notify } from '@/shared/ui/toast'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import {
  STATE_TYPE_COLORS,
  STATE_TYPE_EMOJIS,
  ENTITY_KIND_LABELS,
  ENTITY_KIND_COLORS,
  ENTITY_KIND_EMOJIS,
} from '@/entities/historical-country/model/constants'

// 역사적 국가 전용 컴팩트 스타일 (자리 최소화)
const CompactFlagWrapper = styled(S.MiniFlagWrapper)`
  height: 200px;
  @media (max-width: 768px) {
    height: 160px;
  }
`
const CompactNameOverlay = styled(S.CountryNameOverlay)`
  top: 20px;
  left: 20px;
  @media (max-width: 768px) {
    top: 12px;
    left: 16px;
  }
`
const CompactCountryName = styled(S.AnalyticsCountryName)`
  font-size: 28px;
  @media (max-width: 768px) {
    font-size: 22px;
  }
`
const CompactCountryLocalName = styled(S.AnalyticsCountryLocalName)`
  font-size: 14px;
  @media (max-width: 768px) {
    font-size: 12px;
  }
`
const CompactStrip = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 6px;
  margin-bottom: 0;
  padding: 6px 0;
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : 'var(--border-color-light, #e5e7eb)')};
  min-height: 0;
`
const CompactBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : 'rgba(255, 255, 255, 0.95)')};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};
  font-size: 11px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#6b7280')};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  & span:last-child {
    font-size: 12px;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#111827')};
    font-weight: 700;
    text-transform: none;
    letter-spacing: -0.01em;
  }
`
const CompactTabBar = styled(S.PersonInnerTabBar)`
  padding: 0;
  margin: 0;
  flex: 1;
  min-width: 0;
`
const CompactTabButton = styled(S.PersonInnerTabButton)`
  padding: 8px 12px;
  font-size: 12px;
`

// ============================================
// 역사적 국가 전용 탭 타입
// ============================================

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
  | 'succession' // 계승 관계
  | 'membership' // 소속·구성 (신성로마-제후국 등)
  | 'relation' // 국가 관계 (한·중 조공, 동맹 등)
  | 'territory' // 영토 변천
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

const SYNCED_TAB_SET = new Set<HistoricalCountryTab>([
  'heads',
  'regions',
  'government',
  'elections',
  'laws',
  'ethnicity',
])

/**
 * 역사적 국가 상세 페이지
 */
// 계승 이벤트 유형 한글 라벨 (배지·개요용, SuccessionSection보다 위에 정의)
const TRANSITION_EVENT_LABELS: Record<string, string> = {
  FOUNDED: '건국',
  CONQUEST: '정복',
  TREATY: '조약',
  INDEPENDENCE: '독립',
  UNIFICATION: '통일',
  UNION: '합병/연합',
  DISSOLVED: '멸망',
  SUCCESSION: '계승',
  SECULARIZATION: '세속화',
  SPLIT: '분열',
  OTHER: '기타',
}

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
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'

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
              <HistoricalCountryHeader
                country={country}
                onEdit={onEdit}
                onDelete={onDelete}
              />

              <HistoricalCountryTabs
                country={country}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                incomingCategoryLabel={incomingCategoryLabel}
              />

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
                    <HistoricalOverviewSection
                      country={country}
                      incomingCategoryLabel={incomingCategoryLabel}
                    />
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
                    <div style={{ padding: 32, textAlign: 'center', color: isDark ? '#a1a1aa' : '#64748b', fontSize: 14 }}>
                      행정조직 정보는 현대 국가 상세에서 확인할 수 있습니다.
                    </div>
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
                  {activeTab === 'succession' && (
                    <SuccessionSection country={country} />
                  )}
                  {activeTab === 'membership' && (
                    <MembershipSection country={country} />
                  )}
                  {activeTab === 'relation' && (
                    <RelationSection country={country} />
                  )}
                  {/* 영토·문화는 저작 API가 없어 플레이스홀더 — 로드맵 확정 시 배선 */}
                  {activeTab === 'territory' && <TerritorySection />}
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

interface HistoricalCountryHeaderProps {
  country: UnifiedCountry
  onEdit?: (country: UnifiedCountry) => void
  onDelete?: (id: string) => void
}

function HistoricalCountryHeader({
  country,
  onEdit,
  onDelete,
}: HistoricalCountryHeaderProps) {
  return (
    <>
      <CompactFlagWrapper
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', height: '100%' }}
        >
          <CountryFlag
            thumbnailUrl={country.thumbnailUrl}
            countryName={country.name}
            size="full"
          />
        </motion.div>

        <CompactNameOverlay
          as={motion.div}
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div whileHover={{ x: 4, transition: { duration: 0.2 } }}>
            <CompactCountryName>{country.name}</CompactCountryName>
          </motion.div>
          {country.enName && (
            <motion.div whileHover={{ x: 4, transition: { duration: 0.2 } }}>
              <CompactCountryLocalName>
                {country.enName}
              </CompactCountryLocalName>
            </motion.div>
          )}
        </CompactNameOverlay>

        <S.FlagGradientOverlay />
      </CompactFlagWrapper>

      {(onEdit || onDelete) && (
        <S.CompactKebabMenu
          as={motion.div}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <S.KebabButton
            as={motion.button}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              e.stopPropagation()
              const menu = e.currentTarget.nextElementSibling as HTMLElement
              if (menu) {
                menu.style.display =
                  menu.style.display === 'block' ? 'none' : 'block'
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </S.KebabButton>
          <S.DropdownMenu>
            {onEdit && (
              <S.DropdownButton
                as={motion.button}
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(country)
                  const menu = e.currentTarget.parentElement as HTMLElement
                  if (menu) menu.style.display = 'none'
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                수정
              </S.DropdownButton>
            )}
            {onDelete && (
              <S.DropdownButton
                as={motion.button}
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
                $isDelete
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(country.id)
                  const menu = e.currentTarget.parentElement as HTMLElement
                  if (menu) menu.style.display = 'none'
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                삭제
              </S.DropdownButton>
            )}
          </S.DropdownMenu>
        </S.CompactKebabMenu>
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
// 배지 + 탭 한 줄 (컴팩트)
// ============================================

interface HistoricalCountryTabsProps {
  country: UnifiedCountry
  activeTab: HistoricalCountryTab
  onTabChange: (tab: HistoricalCountryTab) => void
  /** 이 국가가 후임인 변천의 카테고리 라벨 (예: 계승, 세속화) */
  incomingCategoryLabel?: string | null
}

function HistoricalCountryTabs({
  country: _country,
  activeTab,
  onTabChange,
  incomingCategoryLabel,
}: HistoricalCountryTabsProps) {
  const tabs: { id: HistoricalCountryTab; label: string }[] = [
    { id: 'overview', label: '개요' },
    { id: 'events', label: '주요 사건' },
    { id: 'figures', label: '인물' },
    { id: 'heads', label: '역대 수반' },
    { id: 'regions', label: '행정구역' },
    { id: 'government', label: '행정조직' },
    { id: 'elections', label: '선거·투표' },
    { id: 'laws', label: '법령' },
    { id: 'ethnicity', label: '민족' },
    { id: 'succession', label: '계승' },
    { id: 'membership', label: '소속·구성' },
    { id: 'relation', label: '국가 관계' },
    { id: 'territory', label: '영토' },
    { id: 'culture', label: '문화' },
  ]

  return (
    <CompactStrip>
      {incomingCategoryLabel && (
        <CompactBadge>
          <span>변천</span>
          <span>{incomingCategoryLabel}</span>
        </CompactBadge>
      )}
      <CompactTabBar>
        {tabs.map((tab) => (
          <CompactTabButton
            key={tab.id}
            $active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </CompactTabButton>
        ))}
      </CompactTabBar>
    </CompactStrip>
  )
}

// ============================================
// 역사 개요 섹션
// ============================================

function HistoricalOverviewSection({
  country,
  incomingCategoryLabel,
}: {
  country: UnifiedCountry
  incomingCategoryLabel?: string | null
}) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'

  const entityKind = (country as any).entityKind as
    | 'STATE'
    | 'REGIME'
    | 'PERIOD'
    | null
    | undefined

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  // 현재 표시할 description. country.description으로 초기화하고 저장 시 직접 교체
  const [savedDescription, setSavedDescription] = useState<string | null | undefined>(
    () => country.description,
  )
  // stale closure 방지용 ref — 항상 최신 에디터 값을 보관
  const editorValueRef = useRef('')

  // 국가 변경 시 리셋
  useEffect(() => {
    setSavedDescription(country.description)
  }, [country.id, country.description])

  const updateMutation = useMutation({
    mutationFn: (description: string) =>
      updateHistoricalCountry(country.id, { description: description || undefined }),
    onSuccess: (_, description) => {
      const saved = description || null
      console.log('[OverviewSave] onSuccess description =', description, '/ saved =', saved)
      setSavedDescription(saved)
      setIsEditorOpen(false)
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
  const duration = durationYears != null ? `${durationYears}년` : null
  const stateTypeColor = country.stateType
    ? (STATE_TYPE_COLORS as Record<string, string>)[country.stateType] ?? '#6b7280'
    : '#6b7280'
  const stateTypeEmoji = country.stateType
    ? (STATE_TYPE_EMOJIS as Record<string, string>)[country.stateType] ?? '🏛️'
    : '🏛️'
  const entityKindColor = entityKind ? ENTITY_KIND_COLORS[entityKind] : null
  const entityKindEmoji = entityKind ? ENTITY_KIND_EMOJIS[entityKind] : null
  const entityKindLabel = entityKind ? ENTITY_KIND_LABELS[entityKind] : null

  return (
    <div
      style={{
        padding: '24px 28px 0',
        background: 'transparent',
        minHeight: 'calc(100vh - 300px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* 핵심 지표 칩 */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <OverviewStatChip label="존속 기간" value={period} color="#6366f1" isDark={isDark} />
        {duration && <OverviewStatChip label="존속 연수" value={duration} color="#8b5cf6" isDark={isDark} />}
        {country.stateType && (
          <OverviewStatChip
            label="국가 형태"
            value={`${stateTypeEmoji} ${getStateTypeLabel(country.stateType)}`}
            color={stateTypeColor}
            isDark={isDark}
          />
        )}
        {entityKind && entityKindLabel && (
          <OverviewStatChip
            label="정치체 성격"
            value={`${entityKindEmoji ?? ''} ${entityKindLabel}`}
            color={entityKindColor ?? '#6b7280'}
            isDark={isDark}
          />
        )}
        {incomingCategoryLabel && (
          <OverviewStatChip label="변천" value={incomingCategoryLabel} color="#f59e0b" isDark={isDark} />
        )}
      </div>

      {/* 개요 섹션 */}
      {isEditorOpen ? (
        /* 에디터 모드: 개요 카드 없이 에디터만 */
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '40px' }}>
          <div
            style={{
              maxWidth: '680px',
              width: '100%',
              margin: '0 auto',
            }}
          >
            <RichTextEditor
              value={savedDescription ?? ''}
              onChange={(html) => {
                editorValueRef.current = html
              }}
              placeholder="역사적 국가에 대한 개요를 작성하세요..."
              showTitle={false}
              onImageUpload={async (file) => {
                const result = await uploadImage(file, 'attachments')
                return result.url ?? (result as any)
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
                  background: isDark ? '#1e1e3a' : 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#6366f1',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: updateMutation.isPending ? '#a5b4fc' : '#6366f1',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'white',
                  cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {updateMutation.isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 읽기 모드 */
        <div style={{ paddingBottom: '40px' }}>
          {/* 레이블 + 버튼 */}
          <div
            style={{
              maxWidth: '680px',
              width: '100%',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#6366f1',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              개요
            </span>
            <button
              onClick={handleOpenEditor}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: `1px solid ${isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
                background: isDark ? '#1e1e3a' : 'white',
                fontSize: '12px',
                fontWeight: 700,
                color: '#6366f1',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#252547' : 'rgba(99,102,241,0.06)'
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? '#1e1e3a' : 'white'
                e.currentTarget.style.borderColor = isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'
              }}
            >
              {savedDescription ? '수정' : '+ 작성'}
            </button>
          </div>

          {/* 본문 or 빈 상태 */}
          <div style={{ maxWidth: '680px', width: '100%', margin: '0 auto' }}>
            {savedDescription ? (
              isLikelyRichTextHtml(savedDescription) ? (
                <RichTextReadView html={savedDescription} />
              ) : (
                <p
                  style={{
                    fontSize: '14.5px',
                    lineHeight: '1.85',
                    color: isDark ? '#d1d5db' : '#374151',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}
                >
                  {savedDescription}
                </p>
              )
            ) : (
              <p
                style={{
                  fontSize: '14px',
                  color: isDark ? '#52525b' : '#9ca3af',
                  margin: 0,
                }}
              >
                개요가 없습니다. 수정 버튼으로 추가할 수 있습니다.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// 개요 스탯 칩
// ============================================

function OverviewStatChip({
  label,
  value,
  color,
  isDark,
}: {
  label: string
  value: string
  color: string
  isDark: boolean
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '3px',
        padding: '10px 16px',
        background: isDark ? '#212121' : 'white',
        border: `1px solid ${color}${isDark ? '50' : '30'}`,
        borderRadius: '10px',
        minWidth: '100px',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          fontWeight: 600,
          color: color,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          opacity: 0.85,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: isDark ? '#f5f5f5' : '#111827',
          letterSpacing: '-0.02em',
          lineHeight: 1.3,
        }}
      >
        {value}
      </span>
    </div>
  )
}

// ============================================
// 주요 인물 섹션
// ============================================

/**
 * 주요 인물 탭 — 이 역사국가에 재임(관직·재위) 기록이 있는 실제 인물.
 *
 * 과거에는 국가명 includes('조선'|'고려') 매칭으로 하드코딩 목업을 렌더해
 * '조선민주주의인민공화국'(북한) 상세에 조선왕조 인물이 실데이터처럼 표시됐다.
 * 재임 API(GET /government-positions/historical-countries/:id/persons)로 대체.
 */
function HistoricalFiguresSection({ country }: { country: UnifiedCountry }) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const navigate = useNavigate()

  const { data: figures = [], isLoading } = useQuery({
    queryKey: ['historical-country-tenure-persons', country.id],
    queryFn: () => getPersonsByTenureCountry({ historicalCountryId: country.id }),
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
          description="이 국가에 재임(관직·재위) 기록이 있는 인물이 여기에 표시됩니다. 역대 수반 탭에서 재임을 등록해 보세요."
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
        이 국가에 재임 기록이 있는 인물 {figures.length}명
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
// 관계 행 공용 — 상대 국가명 링크
// ============================================

/** 관계 행에서 상대 국가명을 나타내는 링크. 평문과 구분되도록 인디고 계열. */
const RelatedCountryLink = styled(Link)<{ $isDark: boolean }>`
  font-weight: 600;
  color: ${({ $isDark }) => ($isDark ? '#a5b4fc' : '#4f46e5')};
  text-decoration: none;
  border-radius: 6px;
  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
`

/**
 * 계승·소속·관계 행의 상대 국가명 → 그 역사국가 상세로 이동.
 *
 * `/country/:historicalCountryId`가 이미 이 위젯(14탭 전용 상세)을 렌더하므로
 * 브리지 현대국을 경유할 필요가 없다 — 과거국가 탭 카드와 같은 목적지로 통일한다.
 * 지금 보고 있는 국가 자신이거나 이름이 없으면 링크하지 않는다(제자리 이동 방지).
 */
function RelatedCountryName({
  countryId,
  name,
  currentCountryId,
  fallbackLabel,
  isDark,
}: {
  countryId?: string | null
  name?: string | null
  currentCountryId: string
  fallbackLabel: string
  isDark: boolean
}) {
  const label = name?.trim()
  if (!label) {
    return (
      <span style={{ fontWeight: 600, color: isDark ? '#71717a' : '#94a3b8' }}>
        {fallbackLabel}
      </span>
    )
  }
  if (!countryId || countryId === currentCountryId) {
    return (
      <span style={{ fontWeight: 600, color: isDark ? '#f5f5f5' : '#0f172a' }}>
        {label}
      </span>
    )
  }
  return (
    <RelatedCountryLink
      to={pathKeys.countryDetail(countryId)}
      $isDark={isDark}
      title={`${label} 상세로 이동`}
    >
      {label}
    </RelatedCountryLink>
  )
}

// ============================================
// 계승 관계 섹션
// ============================================

function SuccessionSection({ country }: { country: UnifiedCountry }) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<{
    successorId: string
    eventType: TransitionEventType
  }>({ successorId: '', eventType: 'SUCCESSION' })

  const isHistorical = country.type === 'historical'
  const historicalCountryId = isHistorical ? country.id : null

  const { data: transitions = [], isLoading } = useQuery({
    queryKey: ['historical-country-transitions', historicalCountryId],
    queryFn: () => getTransitionsByHistoricalCountryId(historicalCountryId!),
    enabled: !!historicalCountryId,
  })

  const { data: historicalCountries = [] } = useQuery({
    queryKey: ['historical-countries-list'],
    queryFn: getAllHistoricalCountries,
    enabled: addOpen,
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateHistoricalCountryTransitionDto) =>
      createHistoricalCountryTransition(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historical-country-transitions', historicalCountryId] })
      setAddOpen(false)
      setForm({ successorId: '', eventType: 'SUCCESSION' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (tid: string) => deleteHistoricalCountryTransition(tid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historical-country-transitions', historicalCountryId] })
    },
  })

  const handleAddSubmit = () => {
    if (!historicalCountryId || !form.successorId) return
    createMutation.mutate({
      predecessorId: historicalCountryId,
      successorId: form.successorId,
      eventType: form.eventType,
    })
  }

  if (!isHistorical) {
    return (
      <div style={{ padding: 48, background: isDark ? '#1d1d1d' : '#fafafa', minHeight: 'calc(100vh - 300px)' }}>
        <EmptyState message="계승 관계는 역사적 국가에서만 조회·등록할 수 있습니다." isDark={isDark} />
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '32px 48px 48px',
        background: isDark ? '#1d1d1d' : '#fafafa',
        minHeight: 'calc(100vh - 300px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: isDark ? '#f5f5f5' : '#0f172a' }}>
          계승·변천 관계
        </h3>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          style={{
            padding: '10px 20px',
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          계승 추가
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: 48, textAlign: 'center', color: isDark ? '#a1a1aa' : '#64748b' }}>불러오는 중…</div>
      ) : transitions.length === 0 ? (
        <EmptyState
          message="등록된 계승·변천 관계가 없습니다"
          description="전임 국가 → 후임 국가, 이벤트 유형(계승·정복 등), 날짜를 등록할 수 있습니다."
          isDark={isDark}
        />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {transitions.map((t) => (
            <SuccessionRow
              key={t.id}
              transition={t}
              currentCountryId={country.id}
              onDelete={() => deleteMutation.mutate(t.id)}
              isDeleting={deleteMutation.isPending}
              isDark={isDark}
            />
          ))}
        </ul>
      )}

      {addOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setAddOpen(false)}
        >
          <div
            style={{
              background: isDark ? '#212121' : '#fff',
              borderRadius: 20,
              border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              padding: 24,
              width: '90%',
              maxWidth: 440,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: isDark ? '#f5f5f5' : '#111827' }}>
              계승·변천 추가
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: isDark ? '#a1a1aa' : '#64748b' }}>
              전임: <strong>{country.name}</strong> → 후임 국가 선택
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: isDark ? '#d1d5db' : '#374151' }}>
                후임 국가
              </label>
              <select
                value={form.successorId}
                onChange={(e) => setForm((f) => ({ ...f, successorId: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`,
                  borderRadius: 12,
                  fontSize: 14,
                  color: isDark ? '#f5f5f5' : '#111827',
                  background: isDark ? '#1d1d1d' : '#fff',
                }}
              >
                <option value="">선택</option>
                {historicalCountries
                  .filter((c) => c.id !== historicalCountryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: isDark ? '#d1d5db' : '#374151' }}>
                유형
              </label>
              <select
                value={form.eventType}
                onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value as TransitionEventType }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`,
                  borderRadius: 12,
                  fontSize: 14,
                  color: isDark ? '#f5f5f5' : '#111827',
                  background: isDark ? '#1d1d1d' : '#fff',
                }}
              >
                {(Object.keys(TRANSITION_EVENT_LABELS) as TransitionEventType[]).map((k) => (
                  <option key={k} value={k}>
                    {TRANSITION_EVENT_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#a1a1aa' : '#6b7280', marginBottom: 16 }}>
              변천 날짜는 후임 국가의 존속 시작 시점을 참조합니다.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                style={{
                  padding: '12px 24px',
                  border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`,
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: isDark ? '#a1a1aa' : '#64748b',
                  background: isDark ? '#212121' : '#fff',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddSubmit}
                disabled={!form.successorId || createMutation.isPending}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  background: '#6366f1',
                  cursor: 'pointer',
                }}
              >
                {createMutation.isPending ? '등록 중…' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MEMBERSHIP_ROLE_LABELS: Record<HistoricalMembershipRole, string> = {
  COLONY: '식민지',
  PROTECTORATE: '보호국',
  DOMINION: '자치령',
  CONFEDERATION_MEMBER: '연방 구성원',
  VASSAL_STATE: '속국',
  ALLY: '동맹',
  UNION: '연합',
  SUCCESSION: '계승',
  OTHER: '기타',
}

const RELATION_TYPE_LABELS: Record<HistoricalRelationType, string> = {
  ALLIANCE: '동맹',
  WAR: '전쟁',
  SUZERAIN_VASSAL: '종주국-속국',
  TRIBUTARY: '조공·책봉',
  PERSONAL_UNION: '동군연합',
}

function MembershipSection({ country }: { country: UnifiedCountry }) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editingMembership, setEditingMembership] = useState<HistoricalCountryMembershipDto | null>(null)
  const [form, setForm] = useState<{
    asParent: boolean
    otherCountryId: string
    role: HistoricalMembershipRole
    isLeadingMember: boolean
  }>({ asParent: true, otherCountryId: '', role: 'VASSAL_STATE', isLeadingMember: false })
  const [editForm, setEditForm] = useState<{ role: HistoricalMembershipRole; isLeadingMember: boolean }>({
    role: 'VASSAL_STATE',
    isLeadingMember: false,
  })

  const isHistorical = country.type === 'historical'
  const historicalCountryId = isHistorical ? country.id : null

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['historical-country-memberships', historicalCountryId],
    queryFn: () => getMembershipsByHistoricalCountryId(historicalCountryId!),
    enabled: !!historicalCountryId,
  })

  const { data: historicalCountries = [] } = useQuery({
    queryKey: ['historical-countries-list'],
    queryFn: getAllHistoricalCountries,
    enabled: addOpen,
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateHistoricalCountryMembershipDto) =>
      createHistoricalCountryMembership(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historical-country-memberships', historicalCountryId] })
      setAddOpen(false)
      setForm({ asParent: true, otherCountryId: '', role: 'VASSAL_STATE', isLeadingMember: false })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ mid, data }: { mid: string; data: UpdateHistoricalCountryMembershipDto }) =>
      updateHistoricalCountryMembership(mid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historical-country-memberships', historicalCountryId] })
      setEditingMembership(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (mid: string) => deleteHistoricalCountryMembership(mid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historical-country-memberships', historicalCountryId] })
    },
  })

  const handleAddSubmit = () => {
    if (!historicalCountryId || !form.otherCountryId) return
    createMutation.mutate({
      historicalCountryId: form.asParent ? historicalCountryId : form.otherCountryId,
      memberCountryId: form.asParent ? form.otherCountryId : historicalCountryId,
      role: form.role,
      isLeadingMember: form.role === 'CONFEDERATION_MEMBER' || form.role === 'UNION' ? form.isLeadingMember : undefined,
    })
  }

  const openEdit = (m: HistoricalCountryMembershipDto) => {
    setEditingMembership(m)
    setEditForm({ role: m.role, isLeadingMember: !!m.isLeadingMember })
  }

  const handleEditSubmit = () => {
    if (!editingMembership) return
    updateMutation.mutate({
      mid: editingMembership.id,
      data: {
        role: editForm.role,
        isLeadingMember: editForm.role === 'CONFEDERATION_MEMBER' || editForm.role === 'UNION' ? editForm.isLeadingMember : false,
      },
    })
  }

  if (!isHistorical) {
    return (
      <div style={{ padding: 48, background: isDark ? '#1d1d1d' : '#fafafa', minHeight: 'calc(100vh - 300px)' }}>
        <EmptyState message="소속·구성 관계는 역사적 국가에서만 조회·등록할 수 있습니다." isDark={isDark} />
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 48px 48px', background: isDark ? '#1d1d1d' : '#fafafa', minHeight: 'calc(100vh - 300px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: isDark ? '#f5f5f5' : '#0f172a' }}>소속·구성 관계</h3>
        <button type="button" onClick={() => setAddOpen(true)} style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          소속 추가
        </button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: isDark ? '#a1a1aa' : '#64748b' }}>
        신성로마제국–제후국, 종주국–속국 등 상위·하위 관계를 등록합니다.
      </p>
      {isLoading ? (
        <div style={{ padding: 48, textAlign: 'center', color: isDark ? '#a1a1aa' : '#64748b' }}>불러오는 중…</div>
      ) : memberships.length === 0 ? (
        <EmptyState message="등록된 소속·구성 관계가 없습니다" description="상위 국가–하위 국가, 역할(속국·연방 구성원 등)을 등록할 수 있습니다." isDark={isDark} />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {memberships.map((membership) => (
            <li key={membership.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: isDark ? '#212121' : '#fff', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 14 }}>
              <RelatedCountryName
                countryId={membership.historicalCountryId}
                name={membership.parentName}
                currentCountryId={country.id}
                fallbackLabel="(상위)"
                isDark={isDark}
              />
              <span style={{ color: isDark ? '#71717a' : '#94a3b8' }}>—</span>
              <RelatedCountryName
                countryId={membership.memberCountryId}
                name={membership.memberName}
                currentCountryId={country.id}
                fallbackLabel="(하위)"
                isDark={isDark}
              />
              <span style={{ padding: '4px 10px', background: isDark ? '#2a2a2a' : '#f1f5f9', borderRadius: 8, fontSize: 12, fontWeight: 600, color: isDark ? '#a5b4fc' : '#4f46e5' }}>
                {MEMBERSHIP_ROLE_LABELS[membership.role] ?? membership.role}
              </span>
              {membership.isLeadingMember && (
                <span style={{ padding: '4px 8px', background: '#fef3c7', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#b45309' }}>주축</span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => openEdit(membership)} style={{ padding: '6px 12px', fontSize: 12, color: '#4f46e5', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
                  수정
                </button>
                <button type="button" onClick={() => deleteMutation.mutate(membership.id)} disabled={deleteMutation.isPending} style={{ padding: '6px 12px', fontSize: 12, color: '#dc2626', background: 'transparent', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer' }}>
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editingMembership && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditingMembership(null)}>
          <div style={{ background: isDark ? '#212121' : '#fff', borderRadius: 20, border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, width: '90%', maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: isDark ? '#f5f5f5' : '#111827' }}>소속·구성 수정</h4>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: isDark ? '#a1a1aa' : '#64748b' }}>
              {editingMembership.parentName ?? '(상위)'} — {editingMembership.memberName ?? '(하위)'}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: isDark ? '#d1d5db' : '#374151' }}>역할</label>
              <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as HistoricalMembershipRole }))} style={{ width: '100%', padding: '12px 16px', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 12, fontSize: 14, color: isDark ? '#f5f5f5' : '#111827', background: isDark ? '#1d1d1d' : '#fff' }}>
                {(Object.keys(MEMBERSHIP_ROLE_LABELS) as HistoricalMembershipRole[]).map((k) => (
                  <option key={k} value={k}>{MEMBERSHIP_ROLE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            {(editForm.role === 'CONFEDERATION_MEMBER' || editForm.role === 'UNION') && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: isDark ? '#d1d5db' : '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editForm.isLeadingMember} onChange={(e) => setEditForm((f) => ({ ...f, isLeadingMember: e.target.checked }))} />
                  주축(주도국)
                </label>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingMembership(null)} style={{ padding: '12px 24px', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 12, fontSize: 14, fontWeight: 600, color: isDark ? '#a1a1aa' : '#64748b', background: isDark ? '#212121' : '#fff', cursor: 'pointer' }}>취소</button>
              <button type="button" onClick={handleEditSubmit} disabled={updateMutation.isPending} style={{ padding: '12px 24px', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#fff', background: '#6366f1', cursor: 'pointer' }}>
                {updateMutation.isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setAddOpen(false)}>
          <div style={{ background: isDark ? '#212121' : '#fff', borderRadius: 20, border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, width: '90%', maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: isDark ? '#f5f5f5' : '#111827' }}>소속·구성 추가</h4>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: isDark ? '#d1d5db' : '#374151' }}>이 국가의 위치</label>
              <select value={form.asParent ? 'parent' : 'member'} onChange={(e) => setForm((f) => ({ ...f, asParent: e.target.value === 'parent' }))} style={{ width: '100%', padding: '12px 16px', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 12, fontSize: 14, color: isDark ? '#f5f5f5' : '#111827', background: isDark ? '#1d1d1d' : '#fff' }}>
                <option value="parent">상위 (이 국가가 포함하는 하위 국가 추가)</option>
                <option value="member">하위 (이 국가가 소속된 상위 국가 추가)</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: isDark ? '#d1d5db' : '#374151' }}>{form.asParent ? '하위 국가' : '상위 국가'}</label>
              <select value={form.otherCountryId} onChange={(e) => setForm((f) => ({ ...f, otherCountryId: e.target.value }))} style={{ width: '100%', padding: '12px 16px', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 12, fontSize: 14, color: isDark ? '#f5f5f5' : '#111827', background: isDark ? '#1d1d1d' : '#fff' }}>
                <option value="">선택</option>
                {historicalCountries.filter((c) => c.id !== historicalCountryId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: isDark ? '#d1d5db' : '#374151' }}>역할</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as HistoricalMembershipRole }))} style={{ width: '100%', padding: '12px 16px', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 12, fontSize: 14, color: isDark ? '#f5f5f5' : '#111827', background: isDark ? '#1d1d1d' : '#fff' }}>
                {(Object.keys(MEMBERSHIP_ROLE_LABELS) as HistoricalMembershipRole[]).map((k) => (
                  <option key={k} value={k}>{MEMBERSHIP_ROLE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            {(form.role === 'CONFEDERATION_MEMBER' || form.role === 'UNION') && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: isDark ? '#d1d5db' : '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isLeadingMember} onChange={(e) => setForm((f) => ({ ...f, isLeadingMember: e.target.checked }))} />
                  주축(주도국)
                </label>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: isDark ? '#a1a1aa' : '#64748b' }}>연방·연합 내에서 주도적 역할을 한 구성원 (예: 독일 제국 내 프로이센)</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAddOpen(false)} style={{ padding: '12px 24px', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 12, fontSize: 14, fontWeight: 600, color: isDark ? '#a1a1aa' : '#64748b', background: isDark ? '#212121' : '#fff', cursor: 'pointer' }}>취소</button>
              <button type="button" onClick={handleAddSubmit} disabled={!form.otherCountryId || createMutation.isPending} style={{ padding: '12px 24px', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#fff', background: '#6366f1', cursor: 'pointer' }}>
                {createMutation.isPending ? '등록 중…' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RelationSection({ country }: { country: UnifiedCountry }) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<{
    asSubject: boolean
    otherCountryId: string
    relationType: HistoricalRelationType
  }>({ asSubject: true, otherCountryId: '', relationType: 'TRIBUTARY' })

  const isHistorical = country.type === 'historical'
  const historicalCountryId = isHistorical ? country.id : null

  const { data: relations = [], isLoading } = useQuery({
    queryKey: ['historical-country-relations', historicalCountryId],
    queryFn: () => getRelationsByHistoricalCountryId(historicalCountryId!),
    enabled: !!historicalCountryId,
  })

  const { data: historicalCountries = [] } = useQuery({
    queryKey: ['historical-countries-list'],
    queryFn: getAllHistoricalCountries,
    enabled: addOpen,
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateHistoricalCountryRelationDto) =>
      createHistoricalCountryRelation(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historical-country-relations', historicalCountryId] })
      setAddOpen(false)
      setForm({ asSubject: true, otherCountryId: '', relationType: 'TRIBUTARY' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (rid: string) => deleteHistoricalCountryRelation(rid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historical-country-relations', historicalCountryId] })
    },
  })

  const handleAddSubmit = () => {
    if (!historicalCountryId || !form.otherCountryId) return
    createMutation.mutate({
      subjectCountryId: form.asSubject ? historicalCountryId : form.otherCountryId,
      objectCountryId: form.asSubject ? form.otherCountryId : historicalCountryId,
      relationType: form.relationType,
    })
  }

  if (!isHistorical) {
    return (
      <div style={{ padding: 48, background: isDark ? '#1d1d1d' : '#fafafa', minHeight: 'calc(100vh - 300px)' }}>
        <EmptyState message="국가 관계는 역사적 국가에서만 조회·등록할 수 있습니다." isDark={isDark} />
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 48px 48px', background: isDark ? '#1d1d1d' : '#fafafa', minHeight: 'calc(100vh - 300px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: isDark ? '#f5f5f5' : '#0f172a' }}>국가 관계</h3>
        <button type="button" onClick={() => setAddOpen(true)} style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          관계 추가
        </button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: isDark ? '#a1a1aa' : '#64748b' }}>
        한·중 조공·책봉, 동맹, 전쟁 등 수평적 관계를 등록합니다.
      </p>
      {isLoading ? (
        <div style={{ padding: 48, textAlign: 'center', color: isDark ? '#a1a1aa' : '#64748b' }}>불러오는 중…</div>
      ) : relations.length === 0 ? (
        <EmptyState message="등록된 국가 관계가 없습니다" description="조공·책봉, 동맹, 전쟁, 종주국-속국, 동군연합 등을 등록할 수 있습니다." isDark={isDark} />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {relations.map((relation) => (
            <li key={relation.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: isDark ? '#212121' : '#fff', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 14 }}>
              <RelatedCountryName
                countryId={relation.subjectCountryId}
                name={relation.subjectCountryName}
                currentCountryId={country.id}
                fallbackLabel="(주체)"
                isDark={isDark}
              />
              <span style={{ color: isDark ? '#71717a' : '#94a3b8' }}>—</span>
              <span style={{ padding: '4px 10px', background: isDark ? '#2a2a2a' : '#f1f5f9', borderRadius: 8, fontSize: 12, fontWeight: 600, color: isDark ? '#a5b4fc' : '#4f46e5' }}>{RELATION_TYPE_LABELS[relation.relationType] ?? relation.relationType}</span>
              <span style={{ color: isDark ? '#71717a' : '#94a3b8' }}>—</span>
              <RelatedCountryName
                countryId={relation.objectCountryId}
                name={relation.objectCountryName}
                currentCountryId={country.id}
                fallbackLabel="(대상)"
                isDark={isDark}
              />
              <button type="button" onClick={() => deleteMutation.mutate(relation.id)} disabled={deleteMutation.isPending} style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 12, color: '#dc2626', background: 'transparent', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer' }}>
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setAddOpen(false)}>
          <div style={{ background: isDark ? '#212121' : '#fff', borderRadius: 20, border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, width: '90%', maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: isDark ? '#f5f5f5' : '#111827' }}>국가 관계 추가</h4>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: isDark ? '#d1d5db' : '#374151' }}>이 국가의 위치</label>
              <select value={form.asSubject ? 'subject' : 'object'} onChange={(e) => setForm((f) => ({ ...f, asSubject: e.target.value === 'subject' }))} style={{ width: '100%', padding: '12px 16px', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 12, fontSize: 14, color: isDark ? '#f5f5f5' : '#111827', background: isDark ? '#1d1d1d' : '#fff' }}>
                <option value="subject">주체 (이 국가 → 상대 국가)</option>
                <option value="object">대상 (상대 국가 → 이 국가)</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: isDark ? '#d1d5db' : '#374151' }}>상대 국가</label>
              <select value={form.otherCountryId} onChange={(e) => setForm((f) => ({ ...f, otherCountryId: e.target.value }))} style={{ width: '100%', padding: '12px 16px', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 12, fontSize: 14, color: isDark ? '#f5f5f5' : '#111827', background: isDark ? '#1d1d1d' : '#fff' }}>
                <option value="">선택</option>
                {historicalCountries.filter((c) => c.id !== historicalCountryId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: isDark ? '#d1d5db' : '#374151' }}>관계 유형</label>
              <select value={form.relationType} onChange={(e) => setForm((f) => ({ ...f, relationType: e.target.value as HistoricalRelationType }))} style={{ width: '100%', padding: '12px 16px', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 12, fontSize: 14, color: isDark ? '#f5f5f5' : '#111827', background: isDark ? '#1d1d1d' : '#fff' }}>
                {(Object.keys(RELATION_TYPE_LABELS) as HistoricalRelationType[]).map((k) => (
                  <option key={k} value={k}>{RELATION_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAddOpen(false)} style={{ padding: '12px 24px', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`, borderRadius: 12, fontSize: 14, fontWeight: 600, color: isDark ? '#a1a1aa' : '#64748b', background: isDark ? '#212121' : '#fff', cursor: 'pointer' }}>취소</button>
              <button type="button" onClick={handleAddSubmit} disabled={!form.otherCountryId || createMutation.isPending} style={{ padding: '12px 24px', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#fff', background: '#6366f1', cursor: 'pointer' }}>
                {createMutation.isPending ? '등록 중…' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SuccessionRow({
  transition,
  currentCountryId,
  onDelete,
  isDeleting,
  isDark,
}: {
  transition: HistoricalCountryTransitionDto
  /** 지금 보고 있는 국가 — 자기 자신은 링크하지 않는다. */
  currentCountryId: string
  onDelete: () => void
  isDeleting: boolean
  isDark: boolean
}) {
  const eventLabel = TRANSITION_EVENT_LABELS[transition.eventType as TransitionEventType] ?? transition.eventType
  const dateStr = transition.successorStartDate ?? '—'

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 20px',
        background: isDark ? '#212121' : '#fff',
        border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`,
        borderRadius: 14,
      }}
    >
      <RelatedCountryName
        countryId={transition.predecessorId}
        name={transition.predecessorName}
        currentCountryId={currentCountryId}
        fallbackLabel="(전임)"
        isDark={isDark}
      />
      <span style={{ color: isDark ? '#71717a' : '#94a3b8' }}>→</span>
      <RelatedCountryName
        countryId={transition.successorId}
        name={transition.successorName}
        currentCountryId={currentCountryId}
        fallbackLabel="(후임)"
        isDark={isDark}
      />
      <span
        style={{
          padding: '4px 10px',
          background: isDark ? '#2a2a2a' : '#f1f5f9',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          color: isDark ? '#a5b4fc' : '#4f46e5',
        }}
      >
        {eventLabel}
      </span>
      <span style={{ fontSize: 13, color: isDark ? '#a1a1aa' : '#64748b' }}>{dateStr}</span>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        style={{
          marginLeft: 'auto',
          padding: '8px 12px',
          fontSize: 12,
          color: '#dc2626',
          background: 'transparent',
          border: '1px solid #fecaca',
          borderRadius: 8,
          cursor: isDeleting ? 'not-allowed' : 'pointer',
        }}
      >
        {isDeleting ? '삭제 중…' : '삭제'}
      </button>
    </li>
  )
}

// ============================================
// 영토 변천 섹션
// ============================================

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

function TerritorySection() {
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
        message="영토 변천 정보가 준비 중입니다"
        description="역사적 지도와 영토 확장/축소 정보가 표시됩니다"
        isDark={isDark}
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
 * 실데이터로 오인될 수 있었다(예: 북한 상세에 조선왕조 유산). 목업을 제거하고
 * 영토 탭과 같은 플레이스홀더로 통일한다.
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
