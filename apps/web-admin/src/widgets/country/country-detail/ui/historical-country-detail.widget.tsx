import React, { useEffect, useState, useCallback, useRef } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import styled from 'styled-components'
import { useThemeStore } from '@/shared/styles/theme.store'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
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

import { historicalCountryMockData } from '../mock/historical-country.mock'
import { CountryFlag } from '../../shared'
import * as S from './country-detail.styles'
import { CountryElectionsSection } from './country-elections-section.widget'
import { CountryLawsSection } from './country-laws-section.widget'
import { EthnicitySection } from './ethnicity-section.widget'
import { HeadsOfStateSection } from './heads-of-state-section.widget'
import { LoadingOverlay } from './loading-overlay'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view/rich-text-read-view'
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
  border-bottom: 1px solid var(--border-color-light, #e5e7eb);
  min-height: 0;
`
const CompactBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  font-size: 11px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  & span:last-child {
    font-size: 12px;
    color: #111827;
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
  | 'government' // 행정조직 (관직 정의, 행정기구)
  | 'elections' // 선거·투표 (역사 국가 맥락)
  | 'laws' // 법령 카탈로그
  | 'ethnicity' // 구성 민족
  | 'succession' // 계승 관계
  | 'membership' // 소속·구성 (신성로마-제후국 등)
  | 'relation' // 국가 관계 (한·중 조공, 동맹 등)
  | 'territory' // 영토 변천
  | 'culture' // 문화 유산

// ============================================
// 사건 상세 데이터 타입
// ============================================

interface EventPerson {
  id: string
  name: string
  role: string
  side: 'ally' | 'enemy' | 'neutral'
  imageUrl?: string
  achievements?: string[]
}

interface MilitaryUnit {
  id: string
  name: string
  type: string
  size: string
  commander: string
  casualties?: string
}

interface Strategy {
  id: string
  name: string
  description: string
  outcome: 'success' | 'failure' | 'partial'
  date?: string
}

interface SubEvent {
  id: string
  date: string
  name: string
  description: string
  location?: string
  significance: string
  casualties?: {
    allies?: string
    enemies?: string
    civilians?: string
  }
}

interface EventDetailData {
  // 기본 정보
  id: string
  name: string
  type: string
  startDate: string
  endDate?: string
  location: string
  description: string

  // 배경 및 결과
  background: string
  outcome: string
  significance: string

  // 관련 세력
  sides: {
    name: string
    countries: string[]
    leaders: string[]
  }[]

  // 상세 데이터
  subEvents: SubEvent[]
  persons: EventPerson[]
  militaryUnits: MilitaryUnit[]
  strategies: Strategy[]

  // 통계
  statistics: {
    duration: string
    totalCasualties?: string
    territoriesChanged?: string
    economicImpact?: string
  }

  // 미디어
  images?: string[]
  maps?: string[]
}

/**
 * 페이지 → 위젯이 받는 URL-동기화 가능한 탭 키 부분집합.
 *
 * `HistoricalCountryTab`은 더 많은 탭을 가지지만 URL 매핑은 `CountryDetailTabKey`와
 * 겹치는 것만 노출 — modern과 어휘 일치를 유지해 페이지 전환·딥링크 동작을 통일한다.
 */
type HistoricalSyncedTab =
  | 'heads'
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
                  {activeTab === 'events' && (
                    <HistoricalEventsSection country={country} />
                  )}
                  {activeTab === 'figures' && (
                    <HistoricalFiguresSection country={country} />
                  )}
                  {activeTab === 'heads' && (
                    <HeadsOfStateSection country={country} />
                  )}
                  {activeTab === 'government' && (
                    <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
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
                  {activeTab === 'territory' && (
                    <TerritorySection country={country} />
                  )}
                  {activeTab === 'culture' && (
                    <CultureSection country={country} />
                  )}
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
      toast.success('개요가 저장되었습니다.')
    },
    onError: () => {
      toast.error('저장 중 오류가 발생했습니다.')
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

  const formatPeriod = () => {
    const start = country.startYear
      ? `${country.startEra === 'BC' ? '기원전 ' : ''}${country.startYear}년`
      : '알 수 없음'
    const end = country.endYear
      ? `${country.endEra === 'BC' ? '기원전 ' : ''}${country.endYear}년`
      : '현재'
    return `${start} ~ ${end}`
  }

  const calculateDuration = () => {
    if (!country.startYear || !country.endYear) return null
    const startYear =
      country.startEra === 'BC' ? -country.startYear : country.startYear
    const endYear = country.endEra === 'BC' ? -country.endYear : country.endYear
    const diff = endYear - startYear
    return diff > 0 ? `${diff}년` : null
  }

  const period = formatPeriod()
  const duration = calculateDuration()
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
// 주요 사건 섹션 - 사건 중심 설계
// ============================================

function HistoricalEventsSection({ country }: { country: UnifiedCountry }) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [selectedEventType, setSelectedEventType] = useState<string>('all')
  const [eventDetailTab, setEventDetailTab] = useState<
    'overview' | 'subevents' | 'persons' | 'military' | 'strategy'
  >('overview')

  const getMockDataKey = (name: string): 'joseon' | 'goryeo' | null => {
    if (name.includes('조선')) return 'joseon'
    if (name.includes('고려')) return 'goryeo'
    return null
  }

  const dataKey = getMockDataKey(country.name)
  const events = dataKey ? historicalCountryMockData[dataKey]?.events : null

  // Mock 상세 데이터 (임진왜란 예시)
  const eventDetails: Record<string, EventDetailData> = {
    'imjin-war': {
      id: 'imjin-war',
      name: '임진왜란',
      type: 'war',
      startDate: '1592년 4월 13일',
      endDate: '1598년 12월 16일',
      location: '한반도 전역, 일본 규슈',
      description:
        '일본의 도요토미 히데요시가 조선을 침략하여 발발한 7년간의 전쟁',
      background:
        '도요토미 히데요시는 일본 통일 후 대륙 진출을 꿈꾸며 조선에 명나라 정벌의 길을 빌려달라고 요구했으나 거절당했다. 이에 1592년 4월, 15만 대군을 이끌고 부산포에 상륙하여 전쟁이 시작되었다.',
      outcome:
        '조선과 명나라 연합군의 승리로 일본군 철수. 그러나 조선은 국토 전역이 황폐화되고 막대한 인명 피해를 입었다.',
      significance:
        '조선의 국력이 크게 약화되었으나, 이순신 장군의 활약으로 제해권을 장악하여 전세를 역전시켰다. 임진왜란은 동아시아 3국의 정치 지형을 크게 변화시켰다.',
      sides: [
        {
          name: '조선-명 연합군',
          countries: ['조선', '명나라'],
          leaders: ['선조', '이순신', '권율', '이여송'],
        },
        {
          name: '일본군',
          countries: ['일본'],
          leaders: ['도요토미 히데요시', '고니시 유키나가', '가토 기요마사'],
        },
      ],
      subEvents: [
        {
          id: 'busan-landing',
          date: '1592년 4월 13일',
          name: '부산포 전투',
          description:
            '고니시 유키나가가 이끄는 일본군 1군이 부산포에 상륙하여 첫 전투 시작',
          location: '경상도 부산포',
          significance:
            '임진왜란의 시작을 알리는 전투. 조선군은 준비 부족으로 패배',
          casualties: {
            allies: '약 3,000명',
            enemies: '약 500명',
          },
        },
        {
          id: 'hansan-battle',
          date: '1592년 7월 8일',
          name: '한산도 대첩',
          description: '이순신 장군이 학익진 전법으로 일본 수군을 격파한 해전',
          location: '한산도 앞바다',
          significance: '조선 수군의 제해권 장악. 세계 4대 해전 중 하나로 평가',
          casualties: {
            allies: '전사 19명, 부상 100여명',
            enemies: '전사 약 9,000명, 침몰 73척',
          },
        },
        {
          id: 'haengju-battle',
          date: '1593년 2월 12일',
          name: '행주대첩',
          description: '권율 장군이 이끄는 조선군이 일본군 3만을 격퇴',
          location: '행주산성',
          significance:
            '육전의 3대 대첩 중 하나. 민간인들의 활약이 돋보인 전투',
          casualties: {
            allies: '전사 약 130명',
            enemies: '전사 약 10,000명',
          },
        },
        {
          id: 'noryang-battle',
          date: '1598년 11월 19일',
          name: '노량 해전',
          description: '이순신 장군의 마지막 전투이자 최종 승리',
          location: '노량 앞바다',
          significance: '임진왜란의 마지막 해전. 이순신 장군 전사',
          casualties: {
            allies: '전사 약 200명 (이순신 포함)',
            enemies: '전사 약 5,000명',
          },
        },
      ],
      persons: [
        {
          id: 'yi-sunsin',
          name: '이순신',
          role: '삼도수군통제사',
          side: 'ally',
          achievements: [
            '23전 23승 무패 기록',
            '한산도 대첩으로 제해권 장악',
            '명량해전에서 13척으로 133척 격파',
            '노량해전 승리 후 전사',
          ],
        },
        {
          id: 'gwon-yul',
          name: '권율',
          role: '도원수',
          side: 'ally',
          achievements: [
            '행주대첩 승리',
            '경기도 방어 총지휘',
            '화약 무기 효과적 활용',
          ],
        },
        {
          id: 'konishi',
          name: '고니시 유키나가',
          role: '1군 총대장',
          side: 'enemy',
          achievements: ['부산포 상륙 선봉', '한성 점령', '평양성 주둔'],
        },
        {
          id: 'kato',
          name: '가토 기요마사',
          role: '2군 총대장',
          side: 'enemy',
          achievements: ['함경도 진격', '두만강까지 북진', '호랑이 사냥 일화'],
        },
      ],
      militaryUnits: [
        {
          id: 'joseon-navy',
          name: '조선 수군',
          type: '해군',
          size: '판옥선 약 80척',
          commander: '이순신',
          casualties: '약 30척 손실',
        },
        {
          id: 'japan-army-1',
          name: '일본군 1군',
          type: '육군',
          size: '약 18,700명',
          commander: '고니시 유키나가',
          casualties: '약 7,000명',
        },
        {
          id: 'righteous-army',
          name: '의병',
          type: '민병대',
          size: '전국 약 50,000명',
          commander: '곽재우, 조헌 등',
          casualties: '약 15,000명',
        },
        {
          id: 'ming-army',
          name: '명나라 원군',
          type: '육군',
          size: '약 43,000명',
          commander: '이여송',
          casualties: '약 5,000명',
        },
      ],
      strategies: [
        {
          id: 'turtle-ship',
          name: '거북선 활용',
          description:
            '세계 최초의 철갑선인 거북선을 전투에 투입하여 적선에 돌진하는 전술',
          outcome: 'success',
          date: '1592년 5월',
        },
        {
          id: 'crane-wing',
          name: '학익진 전법',
          description:
            '학이 날개를 펼친 형태로 적을 포위하여 섬멸하는 해전 전술',
          outcome: 'success',
          date: '1592년 7월',
        },
        {
          id: 'scorched-earth',
          name: '청야전술',
          description:
            '의병들이 일본군의 보급로를 차단하고 식량을 확보하지 못하도록 하는 전술',
          outcome: 'success',
        },
        {
          id: 'ambush',
          name: '매복 게릴라전',
          description: '산악 지형을 이용한 기습 공격으로 일본군의 진격을 지연',
          outcome: 'partial',
        },
      ],
      statistics: {
        duration: '6년 8개월 (1592.4.13 ~ 1598.12.16)',
        totalCasualties: '조선: 약 100만명, 일본: 약 15만명, 명: 약 2만명',
        territoriesChanged:
          '한반도 전역이 전쟁터가 되었으나 최종적으로 원상 복구',
        economicImpact: '조선 경제 붕괴, 인구 감소, 국가 재정 파탄',
      },
      images: [
        '/images/history/imjin-war-1.jpg',
        '/images/history/imjin-war-2.jpg',
        '/images/history/imjin-war-3.jpg',
      ],
      maps: [
        '/images/history/imjin-war-map-1.jpg',
        '/images/history/imjin-war-map-2.jpg',
      ],
    },
  }

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> =
      {
        war: { bg: '#fef2f2', text: '#991b1b', border: '#ef4444' },
        reform: { bg: '#f5f3ff', text: '#5b21b6', border: '#8b5cf6' },
        culture: { bg: '#eff6ff', text: '#1e40af', border: '#3b82f6' },
        diplomacy: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
        disaster: { bg: '#fff7ed', text: '#9a3412', border: '#f97316' },
        achievement: { bg: '#ecfdf5', text: '#065f46', border: '#10b981' },
      }
    return colors[type] || { bg: '#f1f5f9', text: '#475569', border: '#64748b' }
  }

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      war: '전쟁',
      reform: '개혁',
      culture: '문화',
      diplomacy: '외교',
      disaster: '재난',
      achievement: '업적',
    }
    return labels[type] || type
  }

  const eventTypes = events
    ? Array.from(new Set(events.map((e) => e.type)))
    : []

  const filteredEvents =
    selectedEventType === 'all'
      ? events
      : events?.filter((e) => e.type === selectedEventType)

  const currentEventDetail = selectedEvent ? eventDetails[selectedEvent] : null

  if (!events || events.length === 0) {
    return (
      <div
        style={{
          padding: '48px',
          background: '#fafafa',
          minHeight: 'calc(100vh - 300px)',
        }}
      >
        <EmptyState message="주요 사건 정보가 없습니다" />
      </div>
    )
  }

  // 사건 상세 보기가 열려있을 때
  if (selectedEvent && currentEventDetail) {
    return (
      <EventDetailView
        event={currentEventDetail}
        activeTab={eventDetailTab}
        onTabChange={setEventDetailTab}
        onBack={() => setSelectedEvent(null)}
        colorSet={getEventTypeColor(currentEventDetail.type)}
      />
    )
  }

  // 사건 목록 보기
  return (
    <div
      style={{
        padding: '48px',
        background: '#fafafa',
        minHeight: 'calc(100vh - 300px)',
      }}
    >
      {/* 타임라인 컨테이너 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.borderColor = '#cbd5e1'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.borderColor = '#e2e8f0'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '2px solid #f1f5f9',
            background: '#ffffff',
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            주요 사건 (클릭하여 상세 보기)
          </h3>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedEventType('all')}
              style={{
                padding: '7px 14px',
                fontSize: '12px',
                background:
                  selectedEventType === 'all'
                    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                    : '#fff',
                color: selectedEventType === 'all' ? '#fff' : '#64748b',
                border: `2px solid ${selectedEventType === 'all' ? '#1e293b' : '#e5e7eb'}`,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontWeight: 700,
                boxShadow:
                  selectedEventType === 'all'
                    ? '0 4px 12px rgba(30, 41, 59, 0.3)'
                    : 'none',
                transform:
                  selectedEventType === 'all'
                    ? 'translateY(-1px)'
                    : 'translateY(0)',
              }}
            >
              전체
            </button>
            {eventTypes.map((type) => {
              const colorSet = getEventTypeColor(type)
              return (
                <button
                  key={type}
                  onClick={() => setSelectedEventType(type)}
                  style={{
                    padding: '7px 14px',
                    fontSize: '12px',
                    background:
                      selectedEventType === type
                        ? `linear-gradient(135deg, ${colorSet.bg} 0%, ${colorSet.bg}dd 100%)`
                        : '#fff',
                    color:
                      selectedEventType === type ? colorSet.text : '#64748b',
                    border: `2px solid ${selectedEventType === type ? colorSet.border : '#e5e7eb'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontWeight: 700,
                    boxShadow:
                      selectedEventType === type
                        ? `0 4px 12px ${colorSet.border}40`
                        : 'none',
                    transform:
                      selectedEventType === type
                        ? 'translateY(-1px)'
                        : 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedEventType !== type) {
                      e.currentTarget.style.borderColor = colorSet.border
                      e.currentTarget.style.backgroundColor = `${colorSet.bg}80`
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedEventType !== type) {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.backgroundColor = '#fff'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }
                  }}
                >
                  {getEventTypeLabel(type)}
                </button>
              )
            })}
          </div>
        </div>

        {/* 타임라인 내용 */}
        <div
          style={{
            position: 'relative',
            padding: '32px 28px',
            minHeight: '600px',
          }}
        >
          {/* 타임라인 선 */}
          <div
            style={{
              position: 'absolute',
              left: '154px',
              top: '12px',
              bottom: '12px',
              width: '2px',
              background: '#e2e8f0',
              borderRadius: '1px',
            }}
          />

          {filteredEvents && filteredEvents.length > 0 ? (
            filteredEvents.map((event, index) => {
              const colorSet = getEventTypeColor(event.type)
              const hasDetail = eventDetails[event.id]

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{
                    delay: index * 0.1,
                    type: 'spring',
                    stiffness: 100,
                    damping: 15,
                  }}
                  style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr',
                    gap: '28px',
                    marginBottom:
                      index < filteredEvents.length - 1 ? '32px' : '0',
                  }}
                >
                  {/* 왼쪽: 날짜 + 타입 */}
                  <div
                    style={{
                      position: 'relative',
                      paddingTop: '4px',
                      textAlign: 'right',
                    }}
                  >
                    {/* 타임라인 점 */}
                    <div
                      style={{
                        position: 'absolute',
                        right: '-21px',
                        top: '12px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: colorSet.border,
                        border: '3px solid #ffffff',
                        boxShadow: `0 0 0 2px ${colorSet.border}`,
                        zIndex: 2,
                      }}
                    />

                    {/* 년도 */}
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: '#0f172a',
                        marginBottom: '8px',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {event.year}년
                    </div>
                    <span
                      style={{
                        padding: '5px 12px',
                        fontSize: '11px',
                        background: `linear-gradient(135deg, ${colorSet.bg} 0%, ${colorSet.bg}dd 100%)`,
                        color: colorSet.text,
                        border: `2px solid ${colorSet.border}`,
                        borderRadius: '8px',
                        fontWeight: 700,
                        letterSpacing: '-0.01em',
                        display: 'inline-block',
                      }}
                    >
                      {getEventTypeLabel(event.type)}
                    </span>
                  </div>

                  {/* 오른쪽: 내용 카드 */}
                  <motion.div
                    whileHover={{ scale: 1.01, x: 4 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 20,
                    }}
                    onClick={() => {
                      if (hasDetail) {
                        setSelectedEvent(event.id)
                      }
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #f1f5f9',
                      borderRadius: '12px',
                      padding: '20px 24px',
                      cursor: hasDetail ? 'pointer' : 'default',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colorSet.border
                      e.currentTarget.style.boxShadow = `0 6px 20px ${colorSet.border}25`
                      e.currentTarget.style.background = `linear-gradient(135deg, #ffffff 0%, ${colorSet.bg}25 100%)`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#f1f5f9'
                      e.currentTarget.style.boxShadow =
                        '0 1px 3px rgba(0, 0, 0, 0.03)'
                      e.currentTarget.style.background = '#ffffff'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: 800,
                            color: '#0f172a',
                            marginBottom: '10px',
                            lineHeight: '1.5',
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {event.title}
                        </div>
                        <div
                          style={{
                            fontSize: '14px',
                            color: '#64748b',
                            lineHeight: '1.7',
                          }}
                        >
                          {event.description}
                        </div>
                      </div>
                      {hasDetail && (
                        <div
                          style={{
                            marginLeft: '16px',
                            padding: '8px 16px',
                            background: `linear-gradient(135deg, ${colorSet.bg} 0%, ${colorSet.bg}dd 100%)`,
                            color: colorSet.text,
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            border: `2px solid ${colorSet.border}`,
                          }}
                        >
                          상세보기 →
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )
            })
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                padding: '60px 20px',
              }}
            >
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
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
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h4
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 10px 0',
                    letterSpacing: '-0.02em',
                  }}
                >
                  사건이 없습니다
                </h4>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#64748b',
                    lineHeight: '1.8',
                    margin: 0,
                  }}
                >
                  선택한 유형의 사건이 없습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 주요 인물 섹션
// ============================================

function HistoricalFiguresSection({ country }: { country: UnifiedCountry }) {
  const getMockDataKey = (name: string): 'joseon' | 'goryeo' | null => {
    if (name.includes('조선')) return 'joseon'
    if (name.includes('고려')) return 'goryeo'
    return null
  }

  const dataKey = getMockDataKey(country.name)
  const figures = dataKey ? historicalCountryMockData[dataKey]?.figures : null

  if (!figures || figures.length === 0) {
    return (
      <div
        style={{
          padding: '48px',
          background: '#fafafa',
          minHeight: 'calc(100vh - 300px)',
        }}
      >
        <EmptyState message="주요 인물 정보가 없습니다" />
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '48px',
        background: '#fafafa',
        minHeight: 'calc(100vh - 300px)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '20px',
        }}
      >
        {figures.map((figure, index) => (
          <motion.div
            key={figure.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: index * 0.08,
              type: 'spring',
              stiffness: 120,
              damping: 15,
            }}
            whileHover={{ scale: 1.02, y: -4 }}
            style={{
              background: '#ffffff',
              border: '1px solid #f1f5f9',
              borderRadius: '14px',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#f1f5f9'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
          >
            {/* 인물 이미지 */}
            {figure.imageUrl && (
              <div
                style={{
                  width: '100%',
                  height: '240px',
                  overflow: 'hidden',
                  background:
                    'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                  position: 'relative',
                }}
              >
                <img
                  src={getUploadImageUrl(figure.imageUrl)}
                  alt={figure.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}

            <div style={{ padding: '24px' }}>
              {/* 이름 & 생몰년 */}
              <div style={{ marginBottom: '16px' }}>
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 6px 0',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {figure.name}
                </h3>
                {figure.enName && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#94a3b8',
                      margin: '0 0 8px 0',
                      fontWeight: 600,
                    }}
                  >
                    {figure.enName}
                  </p>
                )}
                {(figure.birthYear || figure.deathYear) && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#3b82f6',
                      marginBottom: '0',
                      fontWeight: 700,
                    }}
                  >
                    {figure.birthYear && `${figure.birthYear}년`}
                    {figure.birthYear && figure.deathYear && ' ~ '}
                    {figure.deathYear && `${figure.deathYear}년`}
                  </p>
                )}
              </div>

              {/* 역할 */}
              <div
                style={{
                  padding: '10px 14px',
                  background:
                    'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '2px solid #3b82f6',
                  borderRadius: '10px',
                  marginBottom: '16px',
                }}
              >
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1e40af',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {figure.role}
                </p>
              </div>

              {/* 설명 */}
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: '#64748b',
                  marginBottom: '18px',
                }}
              >
                {figure.description}
              </p>

              {/* 업적 */}
              {figure.achievements && figure.achievements.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#94a3b8',
                      marginBottom: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    주요 업적
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {figure.achievements
                      .slice(0, 3)
                      .map((achievement, achIndex) => (
                        <div
                          key={achIndex}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 12px',
                            background: '#fafbfc',
                            borderRadius: '8px',
                            border: '1px solid #f1f5f9',
                          }}
                        >
                          <div
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: '#3b82f6',
                              marginTop: '7px',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: '13px',
                              color: '#475569',
                              lineHeight: '1.6',
                              flex: 1,
                            }}
                          >
                            {achievement}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// 계승 관계 섹션
// ============================================

function SuccessionSection({ country }: { country: UnifiedCountry }) {
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
      <div style={{ padding: 48, background: '#fafafa', minHeight: 'calc(100vh - 300px)' }}>
        <EmptyState message="계승 관계는 역사적 국가에서만 조회·등록할 수 있습니다." />
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '32px 48px 48px',
        background: '#fafafa',
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
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
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
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>불러오는 중…</div>
      ) : transitions.length === 0 ? (
        <EmptyState
          message="등록된 계승·변천 관계가 없습니다"
          description="전임 국가 → 후임 국가, 이벤트 유형(계승·정복 등), 날짜를 등록할 수 있습니다."
        />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {transitions.map((t) => (
            <SuccessionRow
              key={t.id}
              transition={t}
              currentCountryName={country.name}
              onDelete={() => deleteMutation.mutate(t.id)}
              isDeleting={deleteMutation.isPending}
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
              background: '#fff',
              borderRadius: 20,
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              padding: 24,
              width: '90%',
              maxWidth: 440,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#111827' }}>
              계승·변천 추가
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              전임: <strong>{country.name}</strong> → 후임 국가 선택
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                후임 국가
              </label>
              <select
                value={form.successorId}
                onChange={(e) => setForm((f) => ({ ...f, successorId: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  fontSize: 14,
                  color: '#111827',
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
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                유형
              </label>
              <select
                value={form.eventType}
                onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value as TransitionEventType }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  fontSize: 14,
                  color: '#111827',
                }}
              >
                {(Object.keys(TRANSITION_EVENT_LABELS) as TransitionEventType[]).map((k) => (
                  <option key={k} value={k}>
                    {TRANSITION_EVENT_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
              변천 날짜는 후임 국가의 존속 시작 시점을 참조합니다.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#64748b',
                  background: '#fff',
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
      <div style={{ padding: 48, background: '#fafafa', minHeight: 'calc(100vh - 300px)' }}>
        <EmptyState message="소속·구성 관계는 역사적 국가에서만 조회·등록할 수 있습니다." />
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 48px 48px', background: '#fafafa', minHeight: 'calc(100vh - 300px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>소속·구성 관계</h3>
        <button type="button" onClick={() => setAddOpen(true)} style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          소속 추가
        </button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
        신성로마제국–제후국, 종주국–속국 등 상위·하위 관계를 등록합니다.
      </p>
      {isLoading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>불러오는 중…</div>
      ) : memberships.length === 0 ? (
        <EmptyState message="등록된 소속·구성 관계가 없습니다" description="상위 국가–하위 국가, 역할(속국·연방 구성원 등)을 등록할 수 있습니다." />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {memberships.map((m) => (
            <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14 }}>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{m.parentName ?? '(상위)'}</span>
              <span style={{ color: '#94a3b8' }}>—</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{m.memberName ?? '(하위)'}</span>
              <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#4f46e5' }}>
                {MEMBERSHIP_ROLE_LABELS[m.role] ?? m.role}
              </span>
              {m.isLeadingMember && (
                <span style={{ padding: '4px 8px', background: '#fef3c7', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#b45309' }}>주축</span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => openEdit(m)} style={{ padding: '6px 12px', fontSize: 12, color: '#4f46e5', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
                  수정
                </button>
                <button type="button" onClick={() => deleteMutation.mutate(m.id)} disabled={deleteMutation.isPending} style={{ padding: '6px 12px', fontSize: 12, color: '#dc2626', background: 'transparent', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer' }}>
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editingMembership && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditingMembership(null)}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, width: '90%', maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#111827' }}>소속·구성 수정</h4>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b' }}>
              {editingMembership.parentName ?? '(상위)'} — {editingMembership.memberName ?? '(하위)'}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>역할</label>
              <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as HistoricalMembershipRole }))} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827' }}>
                {(Object.keys(MEMBERSHIP_ROLE_LABELS) as HistoricalMembershipRole[]).map((k) => (
                  <option key={k} value={k}>{MEMBERSHIP_ROLE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            {(editForm.role === 'CONFEDERATION_MEMBER' || editForm.role === 'UNION') && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editForm.isLeadingMember} onChange={(e) => setEditForm((f) => ({ ...f, isLeadingMember: e.target.checked }))} />
                  주축(주도국)
                </label>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingMembership(null)} style={{ padding: '12px 24px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#64748b', background: '#fff', cursor: 'pointer' }}>취소</button>
              <button type="button" onClick={handleEditSubmit} disabled={updateMutation.isPending} style={{ padding: '12px 24px', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#fff', background: '#6366f1', cursor: 'pointer' }}>
                {updateMutation.isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setAddOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, width: '90%', maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#111827' }}>소속·구성 추가</h4>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>이 국가의 위치</label>
              <select value={form.asParent ? 'parent' : 'member'} onChange={(e) => setForm((f) => ({ ...f, asParent: e.target.value === 'parent' }))} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827' }}>
                <option value="parent">상위 (이 국가가 포함하는 하위 국가 추가)</option>
                <option value="member">하위 (이 국가가 소속된 상위 국가 추가)</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>{form.asParent ? '하위 국가' : '상위 국가'}</label>
              <select value={form.otherCountryId} onChange={(e) => setForm((f) => ({ ...f, otherCountryId: e.target.value }))} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827' }}>
                <option value="">선택</option>
                {historicalCountries.filter((c) => c.id !== historicalCountryId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>역할</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as HistoricalMembershipRole }))} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827' }}>
                {(Object.keys(MEMBERSHIP_ROLE_LABELS) as HistoricalMembershipRole[]).map((k) => (
                  <option key={k} value={k}>{MEMBERSHIP_ROLE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            {(form.role === 'CONFEDERATION_MEMBER' || form.role === 'UNION') && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isLeadingMember} onChange={(e) => setForm((f) => ({ ...f, isLeadingMember: e.target.checked }))} />
                  주축(주도국)
                </label>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>연방·연합 내에서 주도적 역할을 한 구성원 (예: 독일 제국 내 프로이센)</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAddOpen(false)} style={{ padding: '12px 24px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#64748b', background: '#fff', cursor: 'pointer' }}>취소</button>
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
      <div style={{ padding: 48, background: '#fafafa', minHeight: 'calc(100vh - 300px)' }}>
        <EmptyState message="국가 관계는 역사적 국가에서만 조회·등록할 수 있습니다." />
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 48px 48px', background: '#fafafa', minHeight: 'calc(100vh - 300px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>국가 관계</h3>
        <button type="button" onClick={() => setAddOpen(true)} style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          관계 추가
        </button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
        한·중 조공·책봉, 동맹, 전쟁 등 수평적 관계를 등록합니다.
      </p>
      {isLoading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>불러오는 중…</div>
      ) : relations.length === 0 ? (
        <EmptyState message="등록된 국가 관계가 없습니다" description="조공·책봉, 동맹, 전쟁, 종주국-속국, 동군연합 등을 등록할 수 있습니다." />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {relations.map((r) => (
            <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14 }}>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.subjectCountryName ?? '(주체)'}</span>
              <span style={{ color: '#94a3b8' }}>—</span>
              <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#4f46e5' }}>{RELATION_TYPE_LABELS[r.relationType] ?? r.relationType}</span>
              <span style={{ color: '#94a3b8' }}>—</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.objectCountryName ?? '(대상)'}</span>
              <button type="button" onClick={() => deleteMutation.mutate(r.id)} disabled={deleteMutation.isPending} style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 12, color: '#dc2626', background: 'transparent', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer' }}>
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setAddOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, width: '90%', maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#111827' }}>국가 관계 추가</h4>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>이 국가의 위치</label>
              <select value={form.asSubject ? 'subject' : 'object'} onChange={(e) => setForm((f) => ({ ...f, asSubject: e.target.value === 'subject' }))} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827' }}>
                <option value="subject">주체 (이 국가 → 상대 국가)</option>
                <option value="object">대상 (상대 국가 → 이 국가)</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>상대 국가</label>
              <select value={form.otherCountryId} onChange={(e) => setForm((f) => ({ ...f, otherCountryId: e.target.value }))} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827' }}>
                <option value="">선택</option>
                {historicalCountries.filter((c) => c.id !== historicalCountryId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>관계 유형</label>
              <select value={form.relationType} onChange={(e) => setForm((f) => ({ ...f, relationType: e.target.value as HistoricalRelationType }))} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827' }}>
                {(Object.keys(RELATION_TYPE_LABELS) as HistoricalRelationType[]).map((k) => (
                  <option key={k} value={k}>{RELATION_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAddOpen(false)} style={{ padding: '12px 24px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#64748b', background: '#fff', cursor: 'pointer' }}>취소</button>
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
  currentCountryName,
  onDelete,
  isDeleting,
}: {
  transition: HistoricalCountryTransitionDto
  currentCountryName: string
  onDelete: () => void
  isDeleting: boolean
}) {
  const fromName = transition.predecessorName ?? '(전임)'
  const toName = transition.successorName ?? '(후임)'
  const eventLabel = TRANSITION_EVENT_LABELS[transition.eventType as TransitionEventType] ?? transition.eventType
  const dateStr = transition.successorStartDate ?? '—'

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 20px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
      }}
    >
      <span style={{ fontWeight: 600, color: '#0f172a' }}>{fromName}</span>
      <span style={{ color: '#94a3b8' }}>→</span>
      <span style={{ fontWeight: 600, color: '#0f172a' }}>{toName}</span>
      <span
        style={{
          padding: '4px 10px',
          background: '#f1f5f9',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          color: '#4f46e5',
        }}
      >
        {eventLabel}
      </span>
      <span style={{ fontSize: 13, color: '#64748b' }}>{dateStr}</span>
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

function TerritorySection({ country }: { country: UnifiedCountry }) {
  return (
    <div
      style={{
        padding: '48px',
        background: '#fafafa',
        minHeight: 'calc(100vh - 300px)',
      }}
    >
      <EmptyState
        message="영토 변천 정보가 준비 중입니다"
        description="역사적 지도와 영토 확장/축소 정보가 표시됩니다"
      />
    </div>
  )
}

// ============================================
// 문화 유산 섹션
// ============================================

function CultureSection({ country }: { country: UnifiedCountry }) {
  const getMockDataKey = (name: string): 'joseon' | 'goryeo' | null => {
    if (name.includes('조선')) return 'joseon'
    if (name.includes('고려')) return 'goryeo'
    return null
  }

  const dataKey = getMockDataKey(country.name)
  const culture = dataKey ? historicalCountryMockData[dataKey]?.culture : null

  if (!culture || culture.length === 0) {
    return (
      <div
        style={{
          padding: '48px',
          background: '#fafafa',
          minHeight: 'calc(100vh - 300px)',
        }}
      >
        <EmptyState message="문화 유산 정보가 없습니다" />
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '48px',
        background: '#fafafa',
        minHeight: 'calc(100vh - 300px)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '20px',
        }}
      >
        {culture.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: index * 0.08,
              type: 'spring',
              stiffness: 120,
              damping: 15,
            }}
            whileHover={{ scale: 1.02, y: -4 }}
            style={{
              background: '#ffffff',
              border: '1px solid #f1f5f9',
              borderRadius: '14px',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#f1f5f9'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
          >
            {/* 이미지 */}
            {item.imageUrl && (
              <div
                style={{
                  width: '100%',
                  height: '220px',
                  overflow: 'hidden',
                  background:
                    'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                  position: 'relative',
                }}
              >
                <img
                  src={getUploadImageUrl(item.imageUrl)}
                  alt={item.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '6px 14px',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid #3b82f6',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#1e40af',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {item.category}
                </div>
              </div>
            )}

            <div style={{ padding: '24px' }}>
              {/* 제목 */}
              <div style={{ marginBottom: '14px' }}>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 6px 0',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {item.name}
                </h3>
                {item.year && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#3b82f6',
                      margin: 0,
                      fontWeight: 700,
                    }}
                  >
                    {item.year}년
                  </p>
                )}
              </div>

              {/* 설명 */}
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: '#64748b',
                  marginBottom: '16px',
                }}
              >
                {item.description}
              </p>

              {/* 의의 */}
              <div
                style={{
                  padding: '16px',
                  background:
                    'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  borderRadius: '10px',
                  border: '2px solid #3b82f6',
                }}
              >
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#3b82f6',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  역사적 의의
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: '#1e40af',
                    margin: 0,
                  }}
                >
                  {item.significance}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// 공통 컴포넌트
// ============================================

function EmptyState({
  message,
  description,
}: {
  message: string
  description?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '80px 40px',
        background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
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
          stroke="#64748b"
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
            color: '#0f172a',
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}
        >
          {message}
        </div>
        {description && (
          <div style={{ fontSize: '14px', color: '#64748b' }}>
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
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div
      style={{
        padding: '24px',
        background: '#ffffff',
        border: '1px solid #f1f5f9',
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
        e.currentTarget.style.borderColor = '#cbd5e1'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = '#f1f5f9'
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
            color: '#94a3b8',
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
            color: '#0f172a',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 사건 상세 뷰 컴포넌트
// ============================================

interface EventDetailViewProps {
  event: EventDetailData
  activeTab: 'overview' | 'subevents' | 'persons' | 'military' | 'strategy'
  onTabChange: (
    tab: 'overview' | 'subevents' | 'persons' | 'military' | 'strategy',
  ) => void
  onBack: () => void
  colorSet: { bg: string; text: string; border: string }
}

function EventDetailView({
  event,
  activeTab,
  onTabChange,
  onBack,
  colorSet,
}: EventDetailViewProps) {
  const tabs = [
    { id: 'overview' as const, label: '개요' },
    {
      id: 'subevents' as const,
      label: `세부 사건 (${event.subEvents.length})`,
    },
    { id: 'persons' as const, label: `인물 (${event.persons.length})` },
    { id: 'military' as const, label: `군사 (${event.militaryUnits.length})` },
    { id: 'strategy' as const, label: `전략 (${event.strategies.length})` },
  ]

  return (
    <div
      style={{
        padding: '48px',
        background: '#fafafa',
        minHeight: 'calc(100vh - 300px)',
      }}
    >
      {/* 뒤로가기 버튼 */}
      <button
        onClick={onBack}
        style={{
          padding: '10px 20px',
          background: '#fff',
          border: '2px solid #e5e7eb',
          borderRadius: '10px',
          color: '#64748b',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(-4px)'
          e.currentTarget.style.borderColor = colorSet.border
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)'
          e.currentTarget.style.borderColor = '#e5e7eb'
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        목록으로 돌아가기
      </button>

      {/* 사건 헤더 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colorSet.bg} 0%, ${colorSet.bg}dd 100%)`,
          border: `2px solid ${colorSet.border}`,
          borderRadius: '16px',
          padding: '40px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '36px',
                fontWeight: 800,
                color: colorSet.text,
                margin: '0 0 12px 0',
                letterSpacing: '-0.02em',
              }}
            >
              {event.name}
            </h1>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                fontSize: '14px',
                color: colorSet.text,
                fontWeight: 600,
              }}
            >
              <span>
                {event.startDate} ~ {event.endDate || '진행중'}
              </span>
              <span>•</span>
              <span>{event.location}</span>
            </div>
          </div>
        </div>

        {/* 통계 그리드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.9)',
              padding: '20px',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: colorSet.text,
                marginBottom: '8px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              기간
            </div>
            <div
              style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}
            >
              {event.statistics.duration}
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.9)',
              padding: '20px',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: colorSet.text,
                marginBottom: '8px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              세부 사건
            </div>
            <div
              style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}
            >
              {event.subEvents.length}건
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.9)',
              padding: '20px',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: colorSet.text,
                marginBottom: '8px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              관련 인물
            </div>
            <div
              style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}
            >
              {event.persons.length}명
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.9)',
              padding: '20px',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: colorSet.text,
                marginBottom: '8px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              전략
            </div>
            <div
              style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}
            >
              {event.strategies.length}개
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '8px',
          marginBottom: '24px',
          display: 'flex',
          gap: '8px',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              padding: '12px 20px',
              background:
                activeTab === tab.id
                  ? `linear-gradient(135deg, ${colorSet.bg} 0%, ${colorSet.bg}dd 100%)`
                  : 'transparent',
              color: activeTab === tab.id ? colorSet.text : '#64748b',
              border:
                activeTab === tab.id
                  ? `2px solid ${colorSet.border}`
                  : '2px solid transparent',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = '#f1f5f9'
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <EventOverviewTab event={event} colorSet={colorSet} />
          )}
          {activeTab === 'subevents' && (
            <SubEventsTab subEvents={event.subEvents} colorSet={colorSet} />
          )}
          {activeTab === 'persons' && (
            <PersonsTab persons={event.persons} colorSet={colorSet} />
          )}
          {activeTab === 'military' && (
            <MilitaryTab units={event.militaryUnits} colorSet={colorSet} />
          )}
          {activeTab === 'strategy' && (
            <StrategyTab strategies={event.strategies} colorSet={colorSet} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// 개요 탭
function EventOverviewTab({
  event,
  colorSet,
}: {
  event: EventDetailData
  colorSet: { bg: string; text: string; border: string }
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 배경 */}
      <Section title="배경" colorSet={colorSet}>
        <p
          style={{
            fontSize: '15px',
            lineHeight: '1.8',
            color: '#475569',
            margin: 0,
          }}
        >
          {event.background}
        </p>
      </Section>

      {/* 설명 */}
      <Section title="경과" colorSet={colorSet}>
        <p
          style={{
            fontSize: '15px',
            lineHeight: '1.8',
            color: '#475569',
            margin: 0,
          }}
        >
          {event.description}
        </p>
      </Section>

      {/* 결과 */}
      <Section title="결과" colorSet={colorSet}>
        <p
          style={{
            fontSize: '15px',
            lineHeight: '1.8',
            color: '#475569',
            margin: 0,
          }}
        >
          {event.outcome}
        </p>
      </Section>

      {/* 의의 */}
      <Section title="역사적 의의" colorSet={colorSet}>
        <p
          style={{
            fontSize: '15px',
            lineHeight: '1.8',
            color: '#475569',
            margin: 0,
          }}
        >
          {event.significance}
        </p>
      </Section>

      {/* 교전 세력 */}
      <Section title="교전 세력" colorSet={colorSet}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {event.sides.map((side, index) => (
            <div
              key={index}
              style={{
                padding: '24px',
                background: '#fafbfc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
              }}
            >
              <h4
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '16px',
                }}
              >
                {side.name}
              </h4>
              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    marginBottom: '6px',
                    fontWeight: 600,
                  }}
                >
                  참전 국가
                </div>
                <div style={{ fontSize: '14px', color: '#475569' }}>
                  {side.countries.join(', ')}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    marginBottom: '6px',
                    fontWeight: 600,
                  }}
                >
                  주요 지휘관
                </div>
                <div style={{ fontSize: '14px', color: '#475569' }}>
                  {side.leaders.join(', ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 통계 */}
      {event.statistics.totalCasualties && (
        <Section title="전쟁 통계" colorSet={colorSet}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
            }}
          >
            <StatCard
              label="총 인명 피해"
              value={event.statistics.totalCasualties}
            />
            {event.statistics.territoriesChanged && (
              <StatCard
                label="영토 변화"
                value={event.statistics.territoriesChanged}
              />
            )}
            {event.statistics.economicImpact && (
              <StatCard
                label="경제적 영향"
                value={event.statistics.economicImpact}
              />
            )}
          </div>
        </Section>
      )}
    </div>
  )
}

// 세부 사건 탭
function SubEventsTab({
  subEvents,
  colorSet,
}: {
  subEvents: SubEvent[]
  colorSet: { bg: string; text: string; border: string }
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {subEvents.map((subEvent, index) => (
        <motion.div
          key={subEvent.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '28px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '0 0 8px 0',
                }}
              >
                {subEvent.name}
              </h3>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: 600,
                }}
              >
                <span>{subEvent.date}</span>
                {subEvent.location && (
                  <>
                    <span>•</span>
                    <span>{subEvent.location}</span>
                  </>
                )}
              </div>
            </div>
            <div
              style={{
                padding: '6px 14px',
                background: `linear-gradient(135deg, ${colorSet.bg} 0%, ${colorSet.bg}dd 100%)`,
                color: colorSet.text,
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: `2px solid ${colorSet.border}`,
              }}
            >
              {index + 1}차
            </div>
          </div>

          <p
            style={{
              fontSize: '15px',
              lineHeight: '1.8',
              color: '#475569',
              marginBottom: '20px',
            }}
          >
            {subEvent.description}
          </p>

          <div
            style={{
              padding: '20px',
              background: '#fafbfc',
              borderRadius: '12px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              역사적 의의
            </div>
            <p
              style={{
                fontSize: '14px',
                lineHeight: '1.7',
                color: '#475569',
                margin: 0,
              }}
            >
              {subEvent.significance}
            </p>
          </div>

          {subEvent.casualties && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}
            >
              {subEvent.casualties.allies && (
                <CasualtyCard
                  label="아군 피해"
                  value={subEvent.casualties.allies}
                />
              )}
              {subEvent.casualties.enemies && (
                <CasualtyCard
                  label="적군 피해"
                  value={subEvent.casualties.enemies}
                />
              )}
              {subEvent.casualties.civilians && (
                <CasualtyCard
                  label="민간인 피해"
                  value={subEvent.casualties.civilians}
                />
              )}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

// 인물 탭
function PersonsTab({
  persons,
  colorSet,
}: {
  persons: EventPerson[]
  colorSet: { bg: string; text: string; border: string }
}) {
  const getSideColor = (side: string) => {
    const colors = {
      ally: { bg: '#ecfdf5', text: '#065f46', border: '#10b981' },
      enemy: { bg: '#fef2f2', text: '#991b1b', border: '#ef4444' },
      neutral: { bg: '#f1f5f9', text: '#475569', border: '#64748b' },
    }
    return colors[side as keyof typeof colors] || colors.neutral
  }

  const getSideLabel = (side: string) => {
    const labels = { ally: '아군', enemy: '적군', neutral: '중립' }
    return labels[side as keyof typeof labels] || side
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '20px',
      }}
    >
      {persons.map((person, index) => {
        const sideColor = getSideColor(person.side)
        return (
          <motion.div
            key={person.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 }}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              overflow: 'hidden',
            }}
          >
            {person.imageUrl && (
              <div
                style={{
                  width: '100%',
                  height: '200px',
                  background:
                    'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                }}
              >
                <img
                  src={getUploadImageUrl(person.imageUrl)}
                  alt={person.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}
            <div style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px',
                }}
              >
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  {person.name}
                </h3>
                <span
                  style={{
                    padding: '4px 10px',
                    background: `linear-gradient(135deg, ${sideColor.bg} 0%, ${sideColor.bg}dd 100%)`,
                    color: sideColor.text,
                    border: `2px solid ${sideColor.border}`,
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {getSideLabel(person.side)}
                </span>
              </div>
              <p
                style={{
                  fontSize: '14px',
                  color: '#64748b',
                  marginBottom: '20px',
                  fontWeight: 600,
                }}
              >
                {person.role}
              </p>

              {person.achievements && person.achievements.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#94a3b8',
                      marginBottom: '10px',
                      textTransform: 'uppercase',
                    }}
                  >
                    주요 업적
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {person.achievements.map((achievement, achIndex) => (
                      <div
                        key={achIndex}
                        style={{
                          display: 'flex',
                          gap: '10px',
                          padding: '10px',
                          background: '#fafbfc',
                          borderRadius: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: colorSet.border,
                            marginTop: '7px',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: '13px',
                            color: '#475569',
                            lineHeight: '1.6',
                          }}
                        >
                          {achievement}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// 군사 탭
function MilitaryTab({
  units,
  colorSet,
}: {
  units: MilitaryUnit[]
  colorSet: { bg: string; text: string; border: string }
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: '20px',
      }}
    >
      {units.map((unit, index) => (
        <motion.div
          key={unit.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '28px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '20px',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '0 0 8px 0',
                }}
              >
                {unit.name}
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#64748b',
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                {unit.type}
              </p>
            </div>
            <div
              style={{
                padding: '6px 14px',
                background: `linear-gradient(135deg, ${colorSet.bg} 0%, ${colorSet.bg}dd 100%)`,
                color: colorSet.text,
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: `2px solid ${colorSet.border}`,
              }}
            >
              {unit.type}
            </div>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <InfoRow label="규모" value={unit.size} />
            <InfoRow label="지휘관" value={unit.commander} />
            {unit.casualties && (
              <InfoRow label="손실" value={unit.casualties} />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// 전략 탭
function StrategyTab({
  strategies,
  colorSet,
}: {
  strategies: Strategy[]
  colorSet: { bg: string; text: string; border: string }
}) {
  const getOutcomeColor = (outcome: string) => {
    const colors = {
      success: {
        bg: '#ecfdf5',
        text: '#065f46',
        border: '#10b981',
        label: '성공',
      },
      failure: {
        bg: '#fef2f2',
        text: '#991b1b',
        border: '#ef4444',
        label: '실패',
      },
      partial: {
        bg: '#fef3c7',
        text: '#92400e',
        border: '#f59e0b',
        label: '부분 성공',
      },
    }
    return colors[outcome as keyof typeof colors] || colors.partial
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {strategies.map((strategy, index) => {
        const outcomeColor = getOutcomeColor(strategy.outcome)
        return (
          <motion.div
            key={strategy.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '28px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 8px 0',
                  }}
                >
                  {strategy.name}
                </h3>
                {strategy.date && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#64748b',
                      margin: 0,
                      fontWeight: 600,
                    }}
                  >
                    {strategy.date}
                  </p>
                )}
              </div>
              <span
                style={{
                  padding: '6px 14px',
                  background: `linear-gradient(135deg, ${outcomeColor.bg} 0%, ${outcomeColor.bg}dd 100%)`,
                  color: outcomeColor.text,
                  border: `2px solid ${outcomeColor.border}`,
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {outcomeColor.label}
              </span>
            </div>
            <p
              style={{
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#475569',
                margin: 0,
              }}
            >
              {strategy.description}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}

// 헬퍼 컴포넌트들
function Section({
  title,
  children,
  colorSet,
}: {
  title: string
  children: React.ReactNode
  colorSet: { bg: string; text: string; border: string }
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '28px',
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 800,
          color: colorSet.text,
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: `2px solid ${colorSet.border}`,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '20px',
        background: '#fafbfc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: '#94a3b8',
          marginBottom: '6px',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
        {value}
      </div>
    </div>
  )
}

function CasualtyCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '16px',
        background: '#fafbfc',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: '#94a3b8',
          marginBottom: '4px',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
        {value}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        background: '#fafbfc',
        borderRadius: '8px',
      }}
    >
      <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 700 }}>
        {label}
      </span>
      <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>
        {value}
      </span>
    </div>
  )
}
