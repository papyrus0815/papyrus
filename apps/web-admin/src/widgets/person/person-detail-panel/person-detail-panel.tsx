/**
 * 인물 상세 패널 (리스트 페이지 우측 컨텐츠 영역)
 */
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiAward,
  FiBook,
  FiBookOpen,
  FiBriefcase,
  FiCamera,
  FiEdit2,
  FiExternalLink,
  FiFileText,
  FiFlag,
  FiGitBranch,
  FiLink,
  FiMapPin,
  FiPlus,
  FiTrash2,
  FiTrendingUp,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import {
  personKeys,
  invalidatePersonCaches as invalidatePersonCachesShared,
} from '@/entities/person/api'
import type { PersonHumanRelationshipItem } from '@/shared/api/person-human-relationships'
import { personCareerApi } from '@/shared/api/person-career'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { deletePerson, updatePerson, getAllPersons, getPersonById } from '@/shared/api/persons'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getPersonFamilyTree } from '@/shared/api/persons-family-tree'
import {
  type PersonLifeEvent,
  listPersonLifeEvents,
} from '@/shared/api/person-life-events'
import {
  createRichTextImageUploader,
  getUploadImageUrl,
  uploadImage,
} from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import { RichTextEntityTooltip } from '@/shared/ui/rich-text-read-view'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { useBodyScrollLock } from '@/shared/hooks/use-body-scroll-lock.hook'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { useFocusTrap } from '@/shared/hooks/use-focus-trap.hook'
import {
  type RichTextDynastyTooltipState,
  type RichTextTermTooltipState,
  useRichTextProseClick,
  useRichTextTooltipEscape,
} from '@/shared/hooks/use-rich-text-prose-click'
import { MARRIAGE_RANK_LABELS } from '@/shared/lib/marriage-rank-labels'
import { NICKNAME_TYPE_LABELS } from '@/shared/lib/nickname-type-labels'
import {
  type PersonNameFields,
  getPersonDisplayName,
} from '@/shared/lib/person-display-name'
import {
  INFLUENCE_ANCHORS,
  getInfluenceTier,
  getInfluenceTierLabel,
} from '@/shared/lib/influence-tier'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'

import type { EntityConnectionTarget } from '@/shared/api/entity-graph'
import { ConnectionsPanel } from '@/shared/ui/entity-graph'
import { BioClamp } from './bio-clamp'
import { BirthDeathCards } from './birth-death-cards'
import { CollapsibleSection } from './collapsible-section'
import { PersonBiographySections } from './person-biography-sections'
import { SpouseDetailSection } from './spouse-detail-section'
import { getRecordFamily } from '@/entities/government-position/model/record-family'
import { TenureReignList } from './tenure-reign-list'
import { computeLifeTimeline } from './life-timeline.lib'
import { LifeTimeline } from './life-timeline'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { confirm } from '@/shared/ui/confirm-dialog'
import { InfluenceBadge } from '@/shared/ui/influence-badge'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { notify } from '@/shared/ui/toast'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'
import { AwardRegisterModal } from '@/widgets/person/award-register-modal/award-register-modal'
import { CareerRegisterModal } from '@/widgets/person/career-register-modal/career-register-modal'
import { EducationRegisterModal } from '@/widgets/person/education-register-modal/education-register-modal'
import { PersonLifeEventFormModal } from '@/widgets/person/person-life-event-form-modal/person-life-event-form-modal'
import { PersonEventLinkModal } from '@/widgets/person/person-event-link-modal/person-event-link-modal'
import { getRecordEventSuggestions } from '@/shared/api/person-event-links'
import { PersonLifeTimelineInfographic } from '@/widgets/person/person-life-timeline-infographic/person-life-timeline-infographic'
import { classifySiblingKinship } from '@/widgets/person/person-genealogy-infographic/family-tree-derive'
import { PersonGenealogyInfographic } from '@/widgets/person/person-genealogy-infographic/person-genealogy-infographic'
import { PersonHumanRelationshipsSection } from '@/widgets/person/person-human-relationships-section/person-human-relationships-section'
import { SameDynastyMembersSection } from '@/widgets/person/same-dynasty-members-section/same-dynasty-members-section'
import { SamePersonGroupSection } from '@/widgets/person/same-person-group-section/same-person-group-section'
import { DynastyMembersInfographicModal } from '@/widgets/dynasty/dynasty-members-infographic-modal'
import { PersonStatsSection } from '@/widgets/person/person-stats-section/person-stats-section'
import {
  type ElectionCandidacyDetail,
  PersonPoliticsSection,
  type PersonPoliticsSectionActions,
} from '@/widgets/person/person-politics-section/person-politics-section'

import {
  ActivityGroup,
  ActivityGroupCount,
  ActivityGroupList,
  ActivityGroupTitle,
  AvatarButton,
  AvatarOverlay,
  AvatarSpinner,
  BackToListButton,
  BioContent,
  BioEditActions,
  BioEditorWrap,
  BioEmptyClickable,
  BioEmptyCta,
  BioEmptyDesc,
  BioEmptyHint,
  BioEmptyTitle,
  BioMentionModalBack,
  BioMentionModalBody,
  BioMentionModalClose,
  BioMentionModalHeader,
  BioMentionModalOpenDetail,
  BioMentionModalOverlay,
  BioMentionModalPanel,
  BioMentionModalTitle,
  BioProse,
  BioSectionLabel,
  BioSectionLabelRow,
  BioText,
  CareerFillInChip,
  CareerFillInChips,
  CareerFillInStrip,
  CareerFillInTitle,
  CareerSummaryChip,
  CareerSummaryChips,
  CareerSummaryCount,
  CareerSummaryDot,
  CareerSummaryLabel,
  CareerSummaryStrip,
  CloseBtn,
  CountMuted,
  CountryAffiliationChip,
  CountryAffiliationList,
  CountryAffiliationName,
  CountryAffiliationPeriod,
  CountryAffiliationType,
  CountryBracket,
  CountryFlagImg,
  DeleteButton,
  DeleteConfirmActions,
  DeleteConfirmCancelBtn,
  DeleteConfirmDeleteBtn,
  DeleteConfirmDesc,
  DeleteConfirmDialog,
  DeleteConfirmIconWrap,
  DeleteConfirmOverlay,
  DeleteConfirmPersonName,
  DeleteConfirmTitle,
  DetailCountryFlagEmoji,
  DetailCountryName,
  DetailCountryRow,
  EmptyState,
  ErrorActions,
  ErrorDesc,
  ErrorIcon,
  ErrorTitle,
  ErrorWrap,
  InfluenceEmpty,
  LifeEventsErrorNote,
  PrimaryRetryBtn,
  FamilyActionRow,
  FamilyActionBtn,
  FamilyBadge,
  FamilyBadgeRow,
  FoundedDynastyChip,
  FoundedDynastyRow,
  HeaderActions,
  HeaderLeft,
  HeaderRow,
  CompactIdentity,
  CompactIdentityAvatarFallback,
  CompactIdentityMeta,
  CompactIdentityName,
  CompactIdentityRow,
  HeroCard,
  StickyNavBar,
  TabCount,
  HeaderTitleBlock,
  InfluenceAnchor,
  InfluenceAnchorRow,
  InfluenceBar,
  InfluenceBlock,
  InfluenceFill,
  InfluenceSliderInput,
  InfluenceSliderRow,
  InfluenceTierLabel,
  InfluenceValue,
  InfluenceValueGroup,
  InlineActions,
  KpiItem,
  KpiLabel,
  KpiLink,
  KpiStrip,
  KpiSubValue,
  KpiValue,
  LoadingText,
  LoadingWrap,
  MonarchCrownIcon,
  MonarchNameLabel,
  MonarchPositionBadge,
  MonarchTitleRow,
  NameMetaBlock,
  NameMetaLabel,
  NameMetaOriginal,
  NameMetaRow,
  NameMetaValue,
  NicknameChip,
  NicknameReason,
  NicknameRow,
  NicknameType,
  NicknameValue,
  OutlineButton,
  OverviewSectionHeaderRow,
  OverviewSectionHeading,
  OverviewSections,
  PageSubtitle,
  PageTitle,
  PageTitleRow,
  PanelRoot,
  PrimaryButton,
  RegisteredByline,
  SectionCard,
  SectionCardBio,
  SectionLabel,
  SectionLabelRow,
  SimpleEntryDateCol,
  SimpleEntryDeleteBtn,
  SimpleEntryDescription,
  SimpleEntryEditBtn,
  SimpleEntryHeader,
  SimpleEntryItem,
  SimpleEntryList,
  SimpleEntryMainCol,
  SimpleEntryPeriod,
  SimpleEntryRole,
  SimpleEntrySub,
  SimpleEntryTitle,
  Spinner,
  TabBtn,
  TabContent,
  TabContentArea,
  TabNav,
  TenureAddButton,
  TenureEmpty,
  TopNavBar,
  TopNavLeft,
  TopNavSep,
  UnifiedActionRow,
} from './person-detail-panel.styles'
import { PersonActionsMenu } from './person-actions-menu'
import { PersonTopSearchBar } from './person-top-search-bar'

import type {
  CombinedTenureItem,
  PersonDetailData,
  TabType,
  TenureLikeRecord,
} from './types'
import {
  ageBetweenYears,
  formatDateKo,
  formatIsoDateKo,
  formatPeriod,
  isoDateSortKey,
  isoDateToApproxDays,
  pickGovernmentTenures,
} from './helpers'
import { formatFloruit } from '@/shared/lib/lifespan-text'
import { deriveContemporaryHeadsTarget } from './contemporary-heads-target'
import { ContemporariesStrip } from './contemporaries-strip'
import {
  getPersonReignAdjacency,
  personReignAdjacencyKeys,
  type ReignAdjacencyEntry,
} from '@/shared/api/person-reign-adjacency'

interface PersonDetailPanelProps {
  personId: string
  onClose: () => void
  onEdit: (id: string) => void
  /** 새 인물 등록 모달 열기 (상단 네비바 우측에 노출) */
  onAdd?: () => void
  /** 닫기/뒤로가기 버튼 문구 (예: "목록으로", "닫기") */
  closeLabel?: string
  /** true면 헤더의 수정·닫기 버튼 숨김 (모달 등 외부에서 닫기 제공 시) */
  hideHeaderActions?: boolean
  /** true면 수반 등록·직책 수정 버튼 숨김 (모달에서 정보만 볼 때) */
  embedInModal?: boolean
  /**
   * embedInModal일 때 필수에 가깝게: 전기 인물 링크 클릭 시 부모 모달 스택만 갱신
   * (자식 패널에서 또 모달을 열지 않음)
   */
  onLinkedPersonClick?: (personId: string) => void
  /**
   * true면 로드된 인물 이름을 브라우저 탭 제목(<title>)에 반영한다.
   * 풀페이지 라우트(인물 상세/타임라인)에서만 켠다 — 모달·임베드에서 켜면
   * 뒤 페이지의 제목을 덮어쓰므로 기본 false.
   */
  syncDocumentTitle?: boolean
}

/**
 * nestia HttpError에서 서버가 보낸 사람이 읽을 수 있는 사유를 추출.
 * HttpError.message는 응답 body(NestJS 예외 JSON) 문자열이라 { message }를 파싱한다.
 * JSON이 아니거나 너무 길거나 HTML이면 fallback으로 안전하게 후퇴.
 */
function extractApiErrorMessage(err: unknown, fallback: string): string {
  const raw = err && typeof err === 'object' && 'message' in err
    ? (err as { message?: unknown }).message
    : undefined
  if (typeof raw !== 'string') return fallback
  try {
    const body = JSON.parse(raw) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.trim()) return body.message
    if (Array.isArray(body.message) && body.message.length) return body.message.join(', ')
  } catch {
    if (raw.length < 200 && !raw.trimStart().startsWith('<')) return raw
  }
  return fallback
}

/** 인물 상세 6탭 순서 — 키보드 ←/→/Home/End 내비게이션과 탭 렌더 순서 정본 */
const PERSON_TAB_ORDER: readonly TabType[] = [
  'overview',
  'career',
  'genealogy',
  'events',
  'evaluation',
  'connections',
]

/** 연결 패널에서 이 화면의 모달로 여는 종류 — 나머지는 상세 경로 */
const CONNECTION_MODAL_KINDS = ['person', 'event', 'dynasty'] as const

export function PersonDetailPanel({
  personId,
  onClose,
  onEdit,
  onAdd,
  closeLabel = '닫기',
  hideHeaderActions = false,
  embedInModal = false,
  onLinkedPersonClick,
  syncDocumentTitle = false,
}: PersonDetailPanelProps) {
  const playClickSound = useClickSound()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  /**
   * 현재 URL 안의 personId 세그먼트를 다른 id로 교체해 목적지 URL 계산.
   * - 대시보드(/persons-timeline/:id) 등 어느 컨텍스트에서든
   *   "사이드바·브레드크럼 그대로 유지하며 인물만 교체"되는 쪽으로 이동.
   * - 현재 personId 세그먼트가 URL에 없으면 기본(/persons-timeline/:id/)로 폴백.
   */
  const buildDetailUrlFor = useCallback(
    (targetId: string) => {
      const current = location.pathname
      if (personId && current.includes(personId)) {
        return (
          current.replace(personId, encodeURIComponent(targetId)) +
          location.search
        )
      }
      return `/persons-timeline/${encodeURIComponent(targetId)}/`
    },
    [location.pathname, location.search, personId],
  )
  /**
   * 탭 상태 ↔ URL `?tab=` 동기화.
   * - 독립 페이지(embedInModal=false)에서만 URL과 동기화한다.
   * - 모달 임베드(embedInModal=true)에서는 URL을 건드리지 않고 순수 로컬 state로 동작.
   */
  const [searchParams, setSearchParams] = useSearchParams()
  const parseTab = useCallback((raw: string | null): TabType => {
    // 옛 'politics' 탭은 '이력·활동'('career')으로 매핑
    if (raw === 'politics') return 'career'
    return raw === 'overview' ||
      raw === 'career' ||
      raw === 'genealogy' ||
      raw === 'events' ||
      raw === 'evaluation' ||
      raw === 'connections'
      ? raw
      : 'overview'
  }, [])
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    embedInModal ? 'overview' : parseTab(searchParams.get('tab')),
  )
  /** 탭 전환: 로컬 state 갱신 + (독립 페이지일 때만) URL `?tab=` 갱신(replace, 기존 쿼리 보존) */
  const handleTabChange = useCallback(
    (next: TabType) => {
      setActiveTab(next)
      if (embedInModal) return
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === 'overview') params.delete('tab')
          else params.set('tab', next)
          return params
        },
        { replace: true },
      )
    },
    [embedInModal, setSearchParams],
  )
  /** 외부 URL 변화(뒤로가기 등) → activeTab 동기화. 같은 값이면 setState 스킵해 불필요 렌더 방지 */
  useEffect(() => {
    if (embedInModal) return
    const urlTab = parseTab(searchParams.get('tab'))
    setActiveTab((prev) => (prev === urlTab ? prev : urlTab))
  }, [embedInModal, parseTab, searchParams])
  /** 탭바 화살표 키 내비게이션(AY4) — ←/→ 순환, Home/End. roving tabindex와 함께 완결. */
  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const order = PERSON_TAB_ORDER
      const idx = order.indexOf(activeTab)
      let nextIdx = idx
      if (event.key === 'ArrowRight') nextIdx = (idx + 1) % order.length
      else if (event.key === 'ArrowLeft')
        nextIdx = (idx - 1 + order.length) % order.length
      else if (event.key === 'Home') nextIdx = 0
      else if (event.key === 'End') nextIdx = order.length - 1
      else return
      event.preventDefault()
      const nextKey = order[nextIdx]
      handleTabChange(nextKey)
      document.getElementById(`person-detail-tab-${nextKey}`)?.focus()
    },
    [activeTab, handleTabChange],
  )
  const [tenureModalOpen, setTenureModalOpen] = useState(false)
  const [editingTenureId, setEditingTenureId] = useState<string | null>(null)
  const [sovereignReignModalOpen, setSovereignReignModalOpen] = useState(false)
  const [editingReignId, setEditingReignId] = useState<string | null>(null)
  /** 재임·재위 단일 진입점 — "추가" 클릭 시 군주/관직 선택 스텝을 띄우고, 선택에 따라
   *  기존 등록 패널(SovereignReign/GovernmentPositionTenure)로 라우팅한다. 두 폼·백엔드 무변경. */
  const [addKindChooserOpen, setAddKindChooserOpen] = useState(false)
  const [lifeEventModalOpen, setLifeEventModalOpen] = useState(false)
  /** 인물 쪽에서 사건 참여를 잇는 모달('사건' 탭 '사건 연결') */
  const [eventLinkModalOpen, setEventLinkModalOpen] = useState(false)
  const [editingLifeEvent, setEditingLifeEvent] = useState<PersonLifeEvent | null>(null)
  /** 헤더 아바타 이미지 로드 실패 → 글리프 폴백(MD1). src 변경 시 리셋. */
  const [avatarBroken, setAvatarBroken] = useState(false)
  /** 국가 배지 국기 이미지(업로드 썸네일·flagcdn) 로드 실패 → flagEmoji 폴백(MD4). */
  const [countryFlagBroken, setCountryFlagBroken] = useState(false)
  const [awardModalOpen, setAwardModalOpen] = useState(false)
  const [editingAward, setEditingAward] = useState<any | null>(null)
  const [careerModalOpen, setCareerModalOpen] = useState(false)
  const [editingCareer, setEditingCareer] = useState<any | null>(null)
  const [educationModalOpen, setEducationModalOpen] = useState(false)
  const [editingEducation, setEditingEducation] = useState<any | null>(null)
  /** 연보의 사건 카드 클릭 시 띄울 사건 인라인 모달 — null이면 닫힘 */
  const [viewingEventId, setViewingEventId] = useState<string | null>(null)
  /** 저장 직후 하이라이트·스크롤 대상 id (타임라인 인포그래픽에 전달). 0.8초 뒤 자동 해제 */
  const [highlightedLifeEventId, setHighlightedLifeEventId] = useState<string | null>(null)

  /** URL `?life=<id>` 진입 시 해당 연보로 자동 스크롤·하이라이트 */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const lifeId = params.get('life')
    if (lifeId) {
      setHighlightedLifeEventId(lifeId)
      // 너무 짧으면 데이터 로드 전에 사라질 수 있어 4초 유지
      const timer = window.setTimeout(
        () => setHighlightedLifeEventId(null),
        4000,
      )
      return () => window.clearTimeout(timer)
    }
  }, [])
  const [editingInfluence, setEditingInfluence] = useState(false)
  const [influenceDraft, setInfluenceDraft] = useState(0)
  const [savingInfluence, setSavingInfluence] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingPerson, setDeletingPerson] = useState(false)
  /** 학력·경력·수상·재임·재위 단건 삭제 대상 (null이면 다이얼로그 닫힘) */
  const [entryDeleteTarget, setEntryDeleteTarget] = useState<{
    kind: 'education' | 'award' | 'career' | 'tenure' | 'reign'
    id: string
    careerKind?: string
    label: string
  } | null>(null)
  const [isEntryDeleting, setIsEntryDeleting] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  /** 루트 패널: 전기 인물 링크 → 모달 스택(같은 오버레이에서 인물 전환, 중첩 모달 방지) */
  const [personLinkStack, setPersonLinkStack] = useState<string[]>([])
  const [termTooltip, setTermTooltip] =
    useState<RichTextTermTooltipState | null>(null)
  const [dynastyTooltip, setDynastyTooltip] =
    useState<RichTextDynastyTooltipState | null>(null)
  // 가문 KPI·시조 가문 칩 클릭 시 페이지 이동 대신 "가문 한눈에" 모달을 연다.
  // 하나의 상태로 person.dynasty(소속)·foundedDynasties(시조) 어느 쪽이든 열 수 있게 {id,name} 보관.
  const [dynastyModal, setDynastyModal] = useState<{
    id: string
    name: string
  } | null>(null)

  const {
    data: person,
    isLoading,
    isError,
    error: personError,
    refetch: refetchPerson,
  } = useQuery<PersonDetailData>({
    queryKey: personKeys.detailFull(personId),
    queryFn: () => getPersonDetailById(personId) as Promise<PersonDetailData>,
    enabled: !!personId,
  })

  // 풀페이지 라우트에서만(syncDocumentTitle) 탭 제목을 인물 이름으로 채운다.
  // 훅은 early return 이전에 무조건 호출하고, 끌 땐 null을 넘겨 무시시킨다.
  useDocumentTitle(
    syncDocumentTitle && person
      ? getPersonDisplayName(person as unknown as PersonNameFields)
      : null,
  )

  /**
   * 영향력 낙관적 표시값 (React 19 useOptimistic).
   * 저장 트랜지션 동안 즉시 새 값을 보여주고, refetch로 base(person.influence)가
   * 갱신되면 자동으로 그 값으로 수렴 — 저장→재조회 사이 지연 체감 제거.
   */
  const [optimisticInfluence, setOptimisticInfluence] = useOptimistic(
    person?.influence ?? 0,
    (_prev, next: number) => next,
  )

  // 가계도 탭에서만 BFS 페치 — familyTreeData 소비처는 genealogy 탭 하나뿐인데
  // 패널 마운트마다(사건 상세에서 인물 모달 훑기 등) 12+단계 BFS·수백 KB를 받던 비용 제거.
  // staleTime 5분이라 탭 재진입은 캐시. 기본 탭이 genealogy(URL)면 즉시 페치.
  const { data: familyTreeData } = useQuery({
    queryKey: ['person-family-tree', personId],
    queryFn: () => getPersonFamilyTree(personId),
    enabled: !!personId && activeTab === 'genealogy',
    staleTime: 5 * 60 * 1000,
  })

  // 아바타 URL이 바뀌면(업로드·인물 전환) 깨짐 상태 리셋(MD1).
  useEffect(() => {
    setAvatarBroken(false)
  }, [person?.profileImageUrl])
  // 국가가 바뀌면 국기 깨짐 상태 리셋(MD4).
  useEffect(() => {
    setCountryFlagBroken(false)
  }, [person?.country?.thumbnailUrl, person?.country?.isoCode])

  const { data: lifeEvents = [], isError: lifeEventsError } = useQuery({
    queryKey: ['person-life-events', personId],
    queryFn: () => listPersonLifeEvents(personId),
    // 연보 탭·연보 등록 모달에서만 소비하므로 그때만 페치(PF3) — 개요 진입·모달 스택
    // 마다 큰 설명 페이로드를 받던 비용 제거(가계도 쿼리와 동일하게 게이트).
    enabled: !!personId && (activeTab === 'events' || lifeEventModalOpen),
    // 탭/서브탭 전환마다 큰 설명 페이로드를 재요청하지 않도록 1분 캐시.
    // 모달에서 작성·삭제 후 invalidateQueries로 명시적 새로고침.
    staleTime: 60 * 1000,
  })

  // ── 타임라인 인포그래픽용 파생 데이터 (참조 안정) ──
  const timelineFather = useMemo(() => {
    const f = person?.father
    if (!f) return null
    return {
      id: f.id,
      name: getPersonDisplayName(f, true),
      birthDate: f.birthDate ? String(f.birthDate) : null,
      deathDate: f.deathDate ? String(f.deathDate) : null,
    }
  }, [person])

  const timelineMother = useMemo(() => {
    const m = person?.mother
    if (!m) return null
    return {
      id: m.id,
      name: getPersonDisplayName(m, true),
      birthDate: m.birthDate ? String(m.birthDate) : null,
      deathDate: m.deathDate ? String(m.deathDate) : null,
    }
  }, [person])

  const timelineChildren = useMemo(() => {
    const list = (person?.children ?? []) as any[]
    return list.map((c) => ({
      id: c.id,
      name: getPersonDisplayName(c, true),
      birthDate: c.birthDate ? String(c.birthDate) : null,
      deathDate: c.deathDate ? String(c.deathDate) : null,
    }))
  }, [person])

  const timelineSpouses = useMemo(() => {
    const list = (person?.spouseRelations ?? []) as any[]
    return list.map((rel) => {
      const sp = rel.spouse ?? rel
      return {
        id: sp.id,
        name: getPersonDisplayName(sp, true),
        birthDate: sp.birthDate ? String(sp.birthDate) : null,
        deathDate: sp.deathDate ? String(sp.deathDate) : null,
        marriageStartDate: rel.marriageStartDate ?? null,
        // BC 혼인은 타임라인(AD 축)에 올리면 둔갑 — era로 게이트
        marriageStartEra: rel.marriageStartEra ?? null,
        marriageStartPrecision: rel.marriageStartPrecision ?? null,
      }
    })
  }, [person])

  const timelineSiblings = useMemo(() => {
    const list = (person?.siblings ?? []) as any[]
    return list.map((s) => ({
      id: s.id,
      name: getPersonDisplayName(s, true),
      birthDate: s.birthDate ? String(s.birthDate) : null,
      deathDate: s.deathDate ? String(s.deathDate) : null,
    }))
  }, [person])

  const timelineReigns = useMemo(
    () => (person?.sovereignReigns ?? []) as any[],
    [person],
  )
  const timelineTenures = useMemo(
    () => pickGovernmentTenures(person),
    [person],
  )
  const timelineEvents = useMemo(
    () => (person?.events ?? []) as any[],
    [person],
  )
  /** 분야별 경력을 타임라인 인포그래픽 입력으로 매핑 — kind→한국어 라벨 부여 */
  const timelineCareers = useMemo(() => {
    const KIND_LABELS: Record<string, string> = {
      military: '군사',
      business: '기업',
      academic: '학계',
      religious: '종교',
      artist: '예술',
      athlete: '체육',
      media: '언론',
      legal: '법조',
      medical: '의료',
    }
    return ((person?.careers ?? []) as any[]).map((c) => ({
      id: c.id,
      startDate: c.startDate ?? null,
      endDate: c.endDate ?? null,
      title: c.title ?? null,
      notes: c.notes ?? null,
      kindLabel: KIND_LABELS[c.kind] ?? c.kind ?? null,
      organization: c.organization ?? null,
      rank: c.rank ?? null,
    }))
  }, [person])
  /**
   * eventId → 이 인물 시점의 사건 컨텍스트(role/note) 룩업.
   * EventInlineModal에 넘겨 "이 인물의 역할 — X" 줄을 모달에 표시할 때 사용.
   */
  const personEventContextByEventId = useMemo(() => {
    const m = new Map<string, { role?: string | null; note?: string | null }>()
    for (const e of timelineEvents) {
      const eid = e?.event?.id
      if (eid) m.set(eid, { role: e?.role ?? null, note: e?.note ?? null })
    }
    return m
  }, [timelineEvents])

  /**
   * 재임·재위 통합 목록 — startDate 순 정렬 + 연임 판정용 대(ordinal) 카운트.
   * 매 렌더마다 정렬·Map 구축을 반복하지 않도록 메모이즈 (개요 "재임·재위" 섹션 입력).
   */
  const combinedTenures = useMemo(() => {
    const tenures = pickGovernmentTenures(person)
    const reigns = person?.sovereignReigns ?? []
    const base: Array<{ kind: 'tenure' | 'reign'; data: TenureLikeRecord }> = [
      ...tenures.map((t) => ({ kind: 'tenure' as const, data: t })),
      ...reigns.map((r) => ({ kind: 'reign' as const, data: r })),
    ]
    base.sort((a, b) => {
      // BC·고대 안전 정렬 (startDate 없는 항목은 맨 뒤로)
      return isoDateSortKey(a.data.startDate) - isoDateSortKey(b.data.startDate)
    })
    // 표시용 대수 — 재위·재임 공통 ordinal
    const ordinalOf = (it: { kind: 'tenure' | 'reign'; data: TenureLikeRecord }) =>
      it.data.ordinal ?? null
    // 같은 종류·같은 국가(정체)·같은 직위·같은 대(ordinal)에 2건 이상이면 연임으로 카운트
    const termKeyOf = (
      it: { kind: 'tenure' | 'reign'; data: TenureLikeRecord },
      ord: number,
    ) => {
      const polityKey =
        it.data.historicalCountry?.id ?? it.data.country?.id ?? ''
      const posKey = it.data.positionDefinition?.id ?? it.data.title ?? ''
      return `${it.kind}:${polityKey}:${posKey}:${ord}`
    }
    const termCounts = new Map<string, number>()
    for (const it of base) {
      const ord = ordinalOf(it)
      if (ord == null) continue
      const key = termKeyOf(it, ord)
      termCounts.set(key, (termCounts.get(key) ?? 0) + 1)
    }
    const items: CombinedTenureItem[] = base.map((it) => {
      const ord = ordinalOf(it)
      const sub = it.data.subTermNumber
      // 연임 신호: 본인 회차(subTermNumber)가 2 이상이거나, 같은 직위·같은 대가 2건 이상.
      // subTermNumber 를 함께 보므로 ordinal 이 없어도 연임을 잡아낸다.
      const isReappointment =
        (sub != null && sub >= 2) ||
        (ord != null && (termCounts.get(termKeyOf(it, ord)) ?? 0) >= 2)
      return { kind: it.kind, data: it.data, ordinalNum: ord, isReappointment }
    })
    return { items, count: items.length }
  }, [person])

  /**
   * 「동시대 수장 비교」 딥링크 타깃 — 수장급(국가원수·정부수반·재위) 기록이 있을
   * 때만 산출되고, null이면 CTA 자체를 렌더하지 않는다. 종료일 미입력 기록은
   * 사망 연도로 캡해 대표 연도가 엉뚱한 시대로 밀리지 않게 한다.
   */
  const contemporaryHeadsTarget = useMemo(() => {
    const deathSignedYear =
      person?.deathYear != null
        ? person.deathEra === 'BC'
          ? -person.deathYear
          : person.deathYear
        : null
    return deriveContemporaryHeadsTarget({
      tenures: pickGovernmentTenures(person),
      reigns: person?.sovereignReigns ?? [],
      deathSignedYear,
      // 사망 확정 + 연도 미상 인물의 종료일 미입력 재위가 올해까지 늘어나
      // 대표 연도가 수백 년 뒤로 밀리는 것 방지
      deceasedWithUnknownDeathYear:
        deathSignedYear == null &&
        (person?.isAlive === false || person?.isDeathDateUnknown === true),
    })
  }, [person])

  /**
   * 같은 국가 전/후 재위(승계) — 대상의 모든 수장급 record별 선대/후대를 한 번에.
   * 게이트는 동시대 수장 스트립과 동일(수장급 재임·재위 있을 때만). 응답을
   * recordId로 조인할 수 있게 Map으로 변환해 재임·재위 카드에 주입한다.
   */
  // scope=succession: 전이 그래프로 정체 경계(왕국→공화국, 차르국→제국)를 잇는다
  // (D1 결정 = 인스턴스 출시 → 크로스 가산). 전이 미시드 국가는 서버가 instance로 자동 강등.
  const reignAdjacencyQuery = useQuery({
    queryKey: personReignAdjacencyKeys.byPerson(personId, { scope: 'succession' }),
    queryFn: () => getPersonReignAdjacency(personId, { scope: 'succession' }),
    enabled: contemporaryHeadsTarget != null && activeTab === 'career',
  })
  const adjacencyByRecordId = useMemo(() => {
    const map = new Map<string, ReignAdjacencyEntry>()
    for (const entry of reignAdjacencyQuery.data?.entries ?? []) {
      map.set(entry.subjectRecordId, entry)
    }
    return map
  }, [reignAdjacencyQuery.data])

  /**
   * 재임·재위별 '이 기간의 사건' 제안 — 업적으로 한 번에 잇는 후보. '이력·활동' 탭에서만 받아
   * 카드마다 나눠 준다(모달 임베드는 읽기 전용이라 받지 않음).
   */
  const recordEventSuggestionsQuery = useQuery({
    queryKey: ['person-record-event-suggestions', personId],
    queryFn: () => getRecordEventSuggestions(personId),
    enabled:
      !!personId &&
      !embedInModal &&
      combinedTenures.items.length > 0 &&
      activeTab === 'career',
    staleTime: 60_000,
  })

  /**
   * 종료일 미입력 구간의 상한(근사 일수). 사망자는 사망일까지만 합산해 재임 총 연수가
   * 현재(2026)까지 늘어나 수백 년 부풀지 않게 한다(TC2, 사망일 카드 폴백과 통일).
   * - 생존자: null(호출부가 now 사용)
   * - 사망 확정 + 사망일 있음: 사망일
   * - 사망 확정 + 연도 미상: 'unknown'(호출부가 open-ended 구간 제외)
   */
  const tenureOpenEndCap = useMemo<number | 'unknown' | null>(() => {
    if (!person) return null
    const deceased =
      person.deathYear != null ||
      person.isAlive === false ||
      person.isDeathDateUnknown === true
    if (!deceased) return null
    const capIso =
      person.deathDate ??
      (person.deathYear != null
        ? `${person.deathEra === 'BC' ? '-' : ''}${String(person.deathYear).padStart(4, '0')}-${String(person.deathMonth ?? 12).padStart(2, '0')}-${String(person.deathDay ?? 28).padStart(2, '0')}`
        : null)
    const cap = capIso ? isoDateToApproxDays(capIso) : null
    return cap ?? 'unknown'
  }, [person])

  /**
   * 재임·재위 총 연수 (KPI). 군주 겸 수반 등 구간이 겹칠 수 있어 interval 병합 후
   * 합산 — 이중계산 방지. 0 이하이면 null.
   */
  const tenureTotalYears = useMemo(() => {
    const all = combinedTenures.items
    if (all.length === 0) return null
    // BC·고대 안전: ms 타임스탬프 대신 부호 있는 근사 일수로 구간을 표현한다.
    const now = isoDateToApproxDays(new Date().toISOString()) ?? 0
    // 종료일 미입력 구간의 끝: 사망자는 사망일, 생존자는 현재. 사망 확정·연도 미상은 제외.
    const openEnd = tenureOpenEndCap === 'unknown' ? null : tenureOpenEndCap ?? now
    const intervals = all
      .map(({ data }) => {
        const s = isoDateToApproxDays(data.startDate)
        if (s == null) return null
        let e = isoDateToApproxDays(data.endDate)
        if (e == null) {
          if (openEnd == null) return null
          e = openEnd
        }
        return [s, Math.max(s, e)] as [number, number]
      })
      .filter((iv): iv is [number, number] => iv != null)
      .sort((a, b) => a[0] - b[0])
    let totalDays = 0
    let curStart: number | null = null
    let curEnd = 0
    for (const [s, e] of intervals) {
      if (curStart == null) {
        curStart = s
        curEnd = e
      } else if (s <= curEnd) {
        curEnd = Math.max(curEnd, e)
      } else {
        totalDays += curEnd - curStart
        curStart = s
        curEnd = e
      }
    }
    if (curStart != null) totalDays += curEnd - curStart
    const years = Math.round(totalDays / 365.25)
    return years > 0 ? years : null
  }, [combinedTenures])

  /**
   * 생애 타임라인 배치 — 머리 카드 안에서 재임·작위·재위 구간을 생애 축 위에 보여준다.
   * 가족 판정은 카드 목록(tenure-reign-list)과 같은 getRecordFamily — 막대 색과 카드 눈썹이 같은 말을 한다.
   */
  const lifeTimeline = useMemo(() => {
    if (!person) return null
    const signed = (year?: number | null, era?: string | null) =>
      year == null ? null : era === 'BC' ? -year : year
    return computeLifeTimeline({
      records: combinedTenures.items.map(({ kind, data }) => ({
        key: `${kind}-${data.id}`,
        family:
          kind === 'reign'
            ? 'reign'
            : getRecordFamily({
                  positionType:
                    data.positionType ?? data.positionDefinition?.positionType ?? null,
                  isMonarchical: data.positionDefinition?.isMonarchical ?? null,
                }) === 'NOBLE_TITLE'
              ? 'noble'
              : 'office',
        title:
          kind === 'reign' && data.regnalName
            ? data.regnalName
            : data.title ?? data.positionDefinition?.title ?? '직책',
        startDate: data.startDate,
        endDate: data.endDate,
      })),
      birthYear: signed(person.birthYear, person.birthEra),
      deathYear: signed(person.deathYear, person.deathEra),
      isDeceased:
        person.deathYear != null ||
        person.isAlive === false ||
        person.isDeathDateUnknown === true,
      nowYear: new Date().getFullYear(),
    })
  }, [person, combinedTenures])

  /** 타임라인 막대 → '이력·활동' 탭의 그 카드로. 다른 탭이면 전환한 뒤 렌더를 기다려 스크롤한다. */
  const jumpToRecord = useCallback(
    (key: string) => {
      const scroll = () => {
        const el = document.getElementById(`person-record-${key}`)
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.setAttribute('data-highlighted', 'true')
        window.setTimeout(() => {
          el.removeAttribute('data-highlighted')
        }, 1600)
      }
      if (activeTab !== 'career') {
        handleTabChange('career')
        window.setTimeout(scroll, 80)
        return
      }
      scroll()
    },
    [activeTab, handleTabChange],
  )

  /** KPI 배우자 목록 — spouseRelations 우선, 없으면 spouse 단건 폴백 */
  const kpiSpouses = useMemo(() => {
    const rels = (person?.spouseRelations ?? []) as NonNullable<
      PersonDetailData['spouseRelations']
    >
    return rels
      .map((rel) => {
        const sp = rel.spouse ?? null
        return {
          id: sp?.id as string | undefined,
          name: sp ? getPersonDisplayName(sp, true) : '',
          /** 혼인 서열 토큰 — 있으면 이름 뒤 괄호 표기 */
          rank: rel.marriageRank ?? null,
        }
      })
      .filter((entry) => entry.name && entry.name !== '이름 없음')
  }, [person])

  const modalTopId =
    !embedInModal && personLinkStack.length > 0
      ? personLinkStack[personLinkStack.length - 1]
      : null

  const { data: modalTopPerson } = useQuery({
    queryKey:
      modalTopId != null
        ? personKeys.detailFull(modalTopId)
        : (['person-detail', '__idle__'] as const),
    queryFn: () => getPersonDetailById(modalTopId!),
    enabled: modalTopId != null,
  })
  const modalTopPersonName = modalTopPerson
    ? getPersonDisplayName(modalTopPerson)
    : ''

  /** BioMention 인물 스택 모달이 열려 있는지 — 스크롤 락·포커스 트랩 활성 조건 */
  const bioMentionModalOpen =
    !embedInModal && personLinkStack.length > 0 && modalTopId != null
  const bioMentionPanelRef = useRef<HTMLDivElement>(null)
  useBodyScrollLock(bioMentionModalOpen)
  useFocusTrap(bioMentionPanelRef, bioMentionModalOpen)
  // Esc로 스택 1단 pop(마지막이면 닫힘) — 키보드 닫기 경로(AY9). 열린 자식 툴팁·
  // 라이트박스가 Esc를 먼저 소비했으면(마커) 양보한다.
  useEffect(() => {
    if (!bioMentionModalOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (document.querySelector('[data-lightbox-open="true"]')) return
      event.stopPropagation()
      setPersonLinkStack((prev) => prev.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bioMentionModalOpen])

  const pushPersonToModalStack = useCallback(
    (id: string) => {
      setPersonLinkStack((prev) => {
        // 루트 인물로 되돌아가면 스택 전체를 닫는다 — 같은 인물의 전기 편집기 2개가
        // 한 창에 동시 마운트돼 이중 writer 충돌이 나는 A→B→A 경로 차단(CC2).
        if (id === personId) return []
        // 스택에 이미 있으면 새 인스턴스 push 대신 그 깊이까지 pop('그 인물로 돌아가기').
        const existingIdx = prev.indexOf(id)
        if (existingIdx >= 0) return prev.slice(0, existingIdx + 1)
        // 스택이 과도하게 깊어지지 않도록 최근 12단계로 상한(메모리·UX 안전장치).
        const next = [...prev, id]
        return next.length > 12 ? next.slice(next.length - 12) : next
      })
    },
    [personId],
  )

  /**
   * 인물 링크 클릭 공통 핸들러 — 모달 임베드면 부모 스택만 갱신(중첩 모달 방지),
   * 루트 패널이면 자체 모달 스택에 push. 가계도 카드·가족 칩 등에서 공유.
   */
  const handlePersonClick = useCallback(
    (id: string) => {
      if (!id) return
      playClickSound()
      if (embedInModal) onLinkedPersonClick?.(id)
      else pushPersonToModalStack(id)
    },
    [embedInModal, onLinkedPersonClick, pushPersonToModalStack, playClickSound],
  )

  /**
   * 연결 패널 칩 → 이 화면의 미리보기로. 인물은 모달 스택, 사건은 사건 미리보기, 가문은
   * 가문 한눈에 — 페이지를 떠나지 않고 건너간다. 나머지(국가·조약·묶음)는 칩이 상세 경로로 간다.
   */
  const openConnection = useCallback(
    (target: EntityConnectionTarget) => {
      if (target.kind === 'person') {
        handlePersonClick(target.id)
        return
      }
      playClickSound()
      if (target.kind === 'event') setViewingEventId(target.id)
      else if (target.kind === 'dynasty') setDynastyModal({ id: target.id, name: target.label })
    },
    [handlePersonClick, playClickSound],
  )

  /** 인물 관련 모든 쿼리 캐시 무효화 (아바타 변경·삭제·수정 후 공통 호출) — 중앙 헬퍼 위임(G3-2) */
  const invalidatePersonCaches = useCallback(
    (withDetail = true) =>
      invalidatePersonCachesShared(queryClient, {
        personId: withDetail ? personId : undefined,
      }),
    [personId, queryClient],
  )

  // ─── 가계도 하향 저작 — ego 기준 자녀/부모/배우자 추가·기존 인물 연결 ──────────
  const [familyAddMode, setFamilyAddMode] = useState<
    'child' | 'father' | 'mother' | 'spouse' | null
  >(null)
  /**
   * 자녀 링크 직후 반대편 부모 지정 프롬프트 — '자녀 추가'가 ego 쪽 슬롯만 기록해
   * 편부모 FK(→ 가계도 형제 판별불가)를 체계적으로 양산하던 상류 근인 개선.
   * 검토서 docs/genealogy-half-sibling-display-review.md §10 배치4 무마이그 항목.
   */
  const [childOtherParent, setChildOtherParent] = useState<{
    childId: string
    childName: string
    slot: 'fatherId' | 'motherId'
  } | null>(null)
  /** 모달 열릴 때만 인물 풀 로드(검색 + "새 인물" 생성 대상).
   *  쿼리 키를 personKeys.all(['persons']) 프리픽스 안에 둬 invalidatePersonCaches가
   *  가족 추가·인물 생성 후 이 풀도 함께 무효화하도록 한다(기존 독립 키는 미커버였음). */
  const { data: familyAddPool, isFetching: familyAddPoolFetching } = useQuery({
    queryKey: ['persons', 'pool-for-family-add'],
    queryFn: getAllPersons,
    enabled: familyAddMode !== null || childOtherParent !== null,
    staleTime: 5 * 60_000,
  })
  /** 반대편 부모 최유력 후보(=ego의 배우자) — 피커 목록 상단에 핀 */
  const egoSpouseIdsForPin = useMemo(
    () =>
      (person?.spouseRelations ?? []).flatMap((rel) =>
        rel.spouse?.id ? [rel.spouse.id] : [],
      ),
    [person],
  )

  /**
   * 선택/생성한 인물을 ego와 연결하는 FK write.
   * - child : 대상 인물의 fatherId/motherId(ego 성별) = ego
   * - father/mother : ego의 fatherId/motherId = 대상 인물
   * - spouse : ego.spouseRelations에 대상 인물 추가(기존 관계 보존, 서버가 canonical 정규화)
   */
  const applyFamilyLink = useCallback(
    async (targetId: string, targetName?: string) => {
      const currentPerson = person
      const mode = familyAddMode
      if (!currentPerson || !mode || targetId === currentPerson.id) {
        setFamilyAddMode(null)
        return
      }
      try {
        if (mode === 'child') {
          const egoName = getPersonDisplayName(currentPerson as unknown as PersonNameFields, true)
          // ego 성별로 자녀의 부/모 슬롯 결정. MALE/FEMALE이 아니면(미지정 등) 어느 슬롯에
          // 넣을지 명시적으로 물어 여성 인물이 아버지 슬롯에 잘못 들어가는 것을 막는다.
          const genderUpper = (currentPerson.gender ?? '').toUpperCase()
          let slot: 'fatherId' | 'motherId'
          if (genderUpper === 'FEMALE') slot = 'motherId'
          else if (genderUpper === 'MALE') slot = 'fatherId'
          else {
            const asFather = await confirm({
              title: '부모 슬롯 선택',
              message: `${egoName}의 성별이 지정되지 않았습니다. 아버지로 기록할까요? (취소하면 어머니로 기록됩니다)`,
              confirmLabel: '아버지로',
              cancelLabel: '어머니로',
            })
            slot = asFather ? 'fatherId' : 'motherId'
          }
          // 대상 자녀에게 이미 다른 부/모가 지정돼 있으면 무경고 덮어쓰기 대신 교체 확인.
          // (덮어쓰면 그 자녀가 기존 부모의 가계도에서 조용히 사라진다)
          const target = familyAddPool?.find((candidate) => candidate.id === targetId)
          const existingParentId = slot === 'fatherId' ? target?.fatherId : target?.motherId
          if (existingParentId && existingParentId !== currentPerson.id) {
            const slotLabel = slot === 'fatherId' ? '아버지' : '어머니'
            const ok = await confirm({
              title: `${slotLabel} 교체`,
              message: `이 인물에게는 이미 ${slotLabel}가 지정되어 있습니다. ${egoName}(으)로 교체하면 기존 ${slotLabel}의 가계도에서 빠집니다. 교체할까요?`,
              confirmLabel: '교체',
              danger: true,
            })
            if (!ok) {
              setFamilyAddMode(null)
              return
            }
          }
          await updatePerson(targetId, { [slot]: currentPerson.id })
          // 반대편 부모가 미기록이면 이어서 지정 프롬프트 — 편부모 FK로 남기지 않기 위한
          // 선택 단계(모달 닫기 = 나중에). 이미 기록돼 있으면 프롬프트 생략.
          const otherSlot: 'fatherId' | 'motherId' = slot === 'fatherId' ? 'motherId' : 'fatherId'
          const otherAlreadySet = Boolean(
            otherSlot === 'motherId' ? target?.motherId : target?.fatherId,
          )
          if (!otherAlreadySet) {
            setChildOtherParent({
              childId: targetId,
              // 즉석 생성 인물은 풀 스냅샷에 없다 — 모달이 건네준 표시명으로 폴백
              childName: target
                ? getPersonDisplayName(target as unknown as PersonNameFields, true)
                : (targetName ?? '자녀'),
              slot: otherSlot,
            })
          }
        } else if (mode === 'father') {
          await updatePerson(currentPerson.id, { fatherId: targetId })
        } else if (mode === 'mother') {
          await updatePerson(currentPerson.id, { motherId: targetId })
        } else if (mode === 'spouse') {
          // 기존 배우자 관계 보존 후 추가(update는 통째 교체 → 전체 배열 재전송).
          // 정실/계비/후궁 서열(marriageRank) 및 기원전·고대·연단위 구조화 날짜(marriageStart/End)도 함께 보존한다.
          const toDateInfo = (
            era?: string | null,
            year?: number | null,
            month?: number | null,
            day?: number | null,
          ) =>
            year != null
              ? {
                  era: (era === 'BC' ? 'BC' : 'AD') as 'BC' | 'AD',
                  year,
                  ...(month != null ? { month } : {}),
                  ...(day != null ? { day } : {}),
                }
              : undefined
          const existing = (currentPerson.spouseRelations ?? []).flatMap((rel) =>
            rel.spouse?.id
              ? [
                  {
                    spouseId: rel.spouse.id,
                    marriageStart: toDateInfo(
                      rel.marriageStartEra,
                      rel.marriageStartYear,
                      rel.marriageStartMonth,
                      rel.marriageStartDay,
                    ),
                    marriageEnd: toDateInfo(
                      rel.marriageEndEra,
                      rel.marriageEndYear,
                      rel.marriageEndMonth,
                      rel.marriageEndDay,
                    ),
                    marriageStartDate: rel.marriageStartDate ?? undefined,
                    marriageEndDate: rel.marriageEndDate ?? undefined,
                    marriageRank:
                      (rel.marriageRank as
                        | 'PRIMARY'
                        | 'SECOND_PRIMARY'
                        | 'THIRD_PRIMARY'
                        | 'CONCUBINE'
                        | 'OTHER'
                        | null
                        | undefined) ?? null,
                    note: rel.note ?? null,
                  },
                ]
              : [],
          )
          if (existing.some((rel) => rel.spouseId === targetId)) {
            notify.error('이미 배우자로 등록된 인물입니다.')
            setFamilyAddMode(null)
            return
          }
          await updatePerson(currentPerson.id, {
            spouseRelations: [...existing, { spouseId: targetId }],
          })
        }
        await invalidatePersonCaches(true)
        notify.success('가족 관계를 추가했습니다.')
      } catch (err) {
        // 서버(assertNoParentCycle 등)가 보낸 구체 사유를 표시 — nestia HttpError.message는
        // 응답 body(JSON) 문자열이라 그대로 쓰지 않고 { message } 를 파싱한다.
        notify.error(extractApiErrorMessage(err, '가족 관계 추가에 실패했습니다.'))
      } finally {
        setFamilyAddMode(null)
      }
    },
    [person, familyAddMode, familyAddPool, invalidatePersonCaches],
  )

  /** 자녀의 반대편 부모 FK write — 프롬프트에서 인물 선택 시 */
  const applyChildOtherParent = useCallback(
    async (targetId: string) => {
      const pending = childOtherParent
      if (!pending || targetId === pending.childId) {
        setChildOtherParent(null)
        return
      }
      try {
        // 프롬프트가 뜬 뒤 다른 탭/세션이 이 슬롯을 채웠을 수 있다 — 스테일 풀 스냅샷
        // 대신 쓰기 직전 서버 재확인 후, 점유 시 ego 슬롯과 동일한 교체 confirm.
        const fresh = await getPersonById(pending.childId)
        const occupiedId = pending.slot === 'motherId' ? fresh.motherId : fresh.fatherId
        const slotLabel = pending.slot === 'motherId' ? '어머니' : '아버지'
        if (occupiedId && occupiedId !== targetId) {
          const ok = await confirm({
            title: `${slotLabel} 교체`,
            message: `이 인물에게는 이미 ${slotLabel}가 지정되어 있습니다. 교체하면 기존 ${slotLabel}의 가계도에서 빠집니다. 교체할까요?`,
            confirmLabel: '교체',
            danger: true,
          })
          if (!ok) return
        }
        await updatePerson(pending.childId, { [pending.slot]: targetId })
        await invalidatePersonCaches(true)
        notify.success(`${slotLabel} 관계를 추가했습니다.`)
      } catch (err) {
        notify.error(extractApiErrorMessage(err, '가족 관계 추가에 실패했습니다.'))
      } finally {
        setChildOtherParent(null)
      }
    },
    [childOtherParent, invalidatePersonCaches],
  )

  /** 가족 추가 모달 config(제목·exclude) — 모드+ego 기준. person 없으면 null. */
  const familyModalConfig =
    familyAddMode && person
      ? (() => {
          const spouseIds = (person.spouseRelations ?? []).flatMap((rel) =>
            rel.spouse?.id ? [rel.spouse.id] : [],
          )
          const selfId = person.id
          const fatherId = person.father?.id ?? ''
          const motherId = person.mother?.id ?? ''
          // 자녀는 배우자 후보에서 제외 — 자식 페이지에선 부모 선택이 막히는데 부모
          // 페이지에선 자식 선택이 허용되는 비대칭 근친혼 게이트를 없앤다.
          const childIds = (person.children ?? [])
            .map((child) => child.id)
            .filter(Boolean) as string[]
          const byMode = {
            child: { title: '자녀로 추가할 인물', exclude: [selfId] },
            father: { title: '아버지로 지정할 인물', exclude: [selfId, motherId, ...spouseIds] },
            mother: { title: '어머니로 지정할 인물', exclude: [selfId, fatherId, ...spouseIds] },
            spouse: {
              title: '배우자로 추가할 인물',
              exclude: [selfId, fatherId, motherId, ...spouseIds, ...childIds],
            },
          } as const
          return byMode[familyAddMode]
        })()
      : null

  const handleAvatarFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      // reset so same file can be re-selected
      e.target.value = ''
      setUploadingAvatar(true)
      try {
        const result = await uploadImage(file, 'persons')
        await updatePerson(personId, { profileImageUrl: result.url })
        await invalidatePersonCaches(true)
        notify.success('프로필 사진이 변경되었습니다.')
      } catch (err) {
        notify.error(
          err instanceof Error ? err.message : '사진 업로드에 실패했습니다.',
        )
      } finally {
        setUploadingAvatar(false)
      }
    },
    [personId, invalidatePersonCaches],
  )

  const handleDeleteConfirm = useCallback(async () => {
    setDeletingPerson(true)
    try {
      await deletePerson(personId)
      await invalidatePersonCaches(false)
      notify.success('인물이 삭제되었습니다.')
      setDeleteConfirmOpen(false)
      onClose()
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '인물 삭제에 실패했습니다.',
      )
    } finally {
      setDeletingPerson(false)
    }
  }, [personId, invalidatePersonCaches, onClose])

  /** 학력·경력·수상·재임·재위 단건 삭제 확정 */
  const handleEntryDeleteConfirm = useCallback(async () => {
    if (!entryDeleteTarget) return
    setIsEntryDeleting(true)
    try {
      if (
        entryDeleteTarget.kind === 'tenure' ||
        entryDeleteTarget.kind === 'reign'
      ) {
        await personCareerApi.deleteGovernmentPositionTenure(
          entryDeleteTarget.id,
        )
        invalidateTenureQueries(queryClient, { personId })
        void queryClient.invalidateQueries({
          queryKey: ['person-record-event-suggestions', personId],
        })
      } else if (entryDeleteTarget.kind === 'education') {
        await personCareerApi.deleteEducation(entryDeleteTarget.id)
      } else if (entryDeleteTarget.kind === 'award') {
        await personCareerApi.deleteAward(entryDeleteTarget.id)
      } else {
        await personCareerApi.deleteCareerByKind(
          entryDeleteTarget.careerKind ?? '',
          entryDeleteTarget.id,
        )
      }
      await queryClient.invalidateQueries({
        queryKey: personKeys.detailFull(personId),
      })
      notify.success(`'${entryDeleteTarget.label}' 항목을 삭제했습니다.`)
      setEntryDeleteTarget(null)
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '삭제에 실패했습니다.',
      )
    } finally {
      setIsEntryDeleting(false)
    }
  }, [entryDeleteTarget, queryClient, personId])

  /**
   * 고정 내비(StickyNavBar) 상태 —
   *  - heroOut: 머리 카드가 화면 밖이면 축약 머리(사진·이름)를 고정 내비 위에 띄운다.
   *  - activeCluster: 개요에서 지금 읽고 있는 묶음 — 섹션 칩 강조.
   *  - stickyHeight: 고정 내비 높이 → CSS 변수 --person-sticky-offset(앵커 착지 여백).
   * 스크롤 컨테이너가 window가 아니라 레이아웃 내부 요소라, scroll은 capture로 문서 전체에서 받는다.
   */
  const heroRef = useRef<HTMLDivElement>(null)
  /** 전기 '관리' 토글 포털 자리(state — 마운트 뒤 자식이 다시 그려지도록) */
  const [bioToolbarEl, setBioToolbarEl] = useState<HTMLSpanElement | null>(null)
  /** '이력·활동' 탭의 '정당·선거' 머리 추가 버튼 → 섹션 안 등록 모달 */
  const politicsActionsRef = useRef<PersonPoliticsSectionActions>(null)
  const stickyNavRef = useRef<HTMLDivElement>(null)
  const [heroOut, setHeroOut] = useState(false)
  const [stickyHeight, setStickyHeight] = useState(0)
  const personLoaded = !!person

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || embedInModal) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => setHeroOut(!entry.isIntersecting),
      // 고정 내비에 가려지는 머리 카드 아래쪽은 '안 보이는' 것으로 친다
      { rootMargin: '-120px 0px 0px 0px', threshold: 0 },
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [personLoaded, embedInModal])

  useEffect(() => {
    const nav = stickyNavRef.current
    if (!nav) return undefined
    const observer = new ResizeObserver(() => setStickyHeight(nav.offsetHeight))
    observer.observe(nav)
    return () => observer.disconnect()
  }, [personLoaded])

  // 전기 편집·키보드 단축키·인물 링크 클릭은 PersonBiographySections로 이관됨.
  // termTooltip/dynastyTooltip 포털은 그대로 유지 — 자식이 setter로 구동.
  useRichTextTooltipEscape(
    !!termTooltip,
    !!dynastyTooltip,
    () => setTermTooltip(null),
    () => setDynastyTooltip(null),
  )

  if (isLoading) {
    return (
      <PanelRoot>
        <LoadingWrap>
          <Spinner />
          <LoadingText>인물 정보를 불러오는 중...</LoadingText>
        </LoadingWrap>
      </PanelRoot>
    )
  }

  if (isError || !person) {
    // 상태 구분(ER1): 404=삭제/부재, 401·403=권한, 그 외/네트워크=일시 오류(재시도).
    const status = (personError as { status?: number } | null)?.status ?? null
    const isNotFound = status === 404
    const isAuth = status === 401 || status === 403
    const isTransient = !isNotFound && !isAuth
    return (
      <PanelRoot>
        <ErrorWrap>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle>
            {isNotFound
              ? '인물을 찾을 수 없습니다'
              : isAuth
                ? '접근 권한이 없습니다'
                : '인물 정보를 불러오지 못했습니다'}
          </ErrorTitle>
          <ErrorDesc>
            {isNotFound
              ? '삭제되었거나 존재하지 않는 인물입니다. 목록에서 다시 선택해 주세요.'
              : isAuth
                ? '세션이 만료되었거나 이 인물을 볼 권한이 없습니다.'
                : '일시적인 오류일 수 있습니다. 잠시 후 다시 시도해 주세요.'}
          </ErrorDesc>
          <ErrorActions>
            {isTransient && (
              <PrimaryRetryBtn type="button" onClick={() => refetchPerson()}>
                다시 시도
              </PrimaryRetryBtn>
            )}
            <CloseBtn type="button" onClick={onClose}>
              닫기
            </CloseBtn>
          </ErrorActions>
        </ErrorWrap>
      </PanelRoot>
    )
  }

  // API가 any를 반환하므로 정의된 타입으로 단일 캐스팅
  const p = person as unknown as PersonDetailData
  const fullName = getPersonDisplayName(p)

  // 군주 등록 여부 및 군주명 — SovereignReign.regnalName 정식 필드 우선, 스칼라 비었을 때 별칭(TEMPLE_NAME/POSTHUMOUS_NAME/COURT_TITLE) 폴백
  const firstReign = p.sovereignReigns?.[0]
  const findNicknameValue = (type: string) =>
    p.nicknames?.find((n) => n.type === type && n.nickname?.trim())?.nickname?.trim() || null
  const effectiveTempleName = p.templeName?.trim() || findNicknameValue('TEMPLE_NAME')
  const effectivePosthumousName =
    p.posthumousName?.trim() || findNicknameValue('POSTHUMOUS_NAME')
  const effectivePreEnthronementTitle =
    p.preEnthronementTitle?.trim() || findNicknameValue('COURT_TITLE')
  const monarchName =
    effectiveTempleName ||
    p.regnalName ||
    firstReign?.regnalName ||
    null
  const monarchPositionTitle =
    firstReign?.positionDefinition?.title || null

  // 사망 판정을 몰년뿐 아니라 생존 플래그·사망일 미상 플래그까지 확장(UX1) — 몰년 미상
  // 고인이 '생존'으로 둔갑하지 않게. 향년은 era 안전 계산(BC·BC→AD 교차, TC1) + 생일 전 사망 보정.
  const isDeceased =
    p.deathYear != null ||
    p.isAlive === false ||
    p.isDeathDateUnknown === true
  const currentYear = new Date().getFullYear()
  const ageAtDeath = ageBetweenYears(
    p.birthYear,
    p.birthEra,
    p.deathYear,
    p.deathEra,
    {
      birthMonth: p.birthMonth,
      birthDay: p.birthDay,
      deathMonth: p.deathMonth,
      deathDay: p.deathDay,
    },
  )
  const currentAge =
    !isDeceased && p.birthYear != null && p.birthEra !== 'BC'
      ? currentYear - p.birthYear
      : null

  /** 이름 밑: 년월일~년월일 (출생~사망 또는 출생~생존). circa면 '경' 접미(canon). */
  const birthDateStr = formatDateKo(
    p.birthYear ?? undefined,
    p.birthMonth ?? undefined,
    p.birthDay ?? undefined,
    p.birthEra,
  )
  const deathDateStr = formatDateKo(
    p.deathYear ?? undefined,
    p.deathMonth ?? undefined,
    p.deathDay ?? undefined,
    p.deathEra,
  )
  const birthLabel = birthDateStr
    ? `${birthDateStr}${p.isBirthDateApproximate ? '경' : ''}`
    : ''
  const deathLabel = deathDateStr
    ? `${deathDateStr}${p.isDeathDateApproximate ? '경' : ''}`
    : ''
  const isApproxLifespan = !!(
    p.isBirthDateApproximate || p.isDeathDateApproximate
  )
  // 생몰 전면 미상 폴백 — 활동시기(floruit)가 있으면 그것으로, 없으면 재위·재임 기간으로 폴백.
  const floruitLabel =
    !birthLabel && !deathLabel
      ? formatFloruit(
          p.floruitStartYear != null
            ? p.floruitEra === 'BC'
              ? -p.floruitStartYear
              : p.floruitStartYear
            : null,
          p.floruitEndYear != null
            ? p.floruitEra === 'BC'
              ? -p.floruitEndYear
              : p.floruitEndYear
            : null,
        )
      : ''
  const tenureFallbackLabel = (() => {
    if (
      birthLabel ||
      deathLabel ||
      floruitLabel ||
      combinedTenures.items.length === 0
    ) {
      return ''
    }
    const hasReign = combinedTenures.items.some((it) => it.kind === 'reign')
    const prefix = hasReign ? '재위' : '재임'
    const formatSignedYr = (signed: number) =>
      signed < 0 ? `기원전 ${-signed}년` : `${signed}년`
    const signedYears: number[] = []
    for (const it of combinedTenures.items) {
      const sp = parseIsoDateParts(it.data.startDate)
      if (sp) signedYears.push(sp.era === 'BC' ? -sp.year : sp.year)
      const ep = parseIsoDateParts(it.data.endDate)
      if (ep) signedYears.push(ep.era === 'BC' ? -ep.year : ep.year)
    }
    if (signedYears.length === 0) return ''
    const minY = Math.min(...signedYears)
    const maxY = Math.max(...signedYears)
    return minY === maxY
      ? `${prefix} ${formatSignedYr(minY)}경`
      : `${prefix} ${formatSignedYr(minY)} ~ ${formatSignedYr(maxY)}`
  })()
  const subtitleLifespan = (() => {
    if (isDeceased) {
      if (birthLabel && deathLabel) {
        const ageText =
          ageAtDeath != null
            ? ` (향년 ${isApproxLifespan ? '약 ' : ''}${ageAtDeath}세)`
            : ''
        return `${birthLabel} ~ ${deathLabel}${ageText}`
      }
      if (birthLabel) return `${birthLabel} ~ 몰년 미상`
      if (deathLabel) return `출생 미상 ~ ${deathLabel}`
      return floruitLabel || tenureFallbackLabel || '생몰년 미상'
    }
    if (birthLabel) {
      // 몰년 기록이 없어도 currentAge가 비상식적(>120)이면 생존 단정 대신 몰년 미상.
      if (currentAge != null && currentAge > 120) return `${birthLabel} ~ 몰년 미상`
      const liveAgeText =
        currentAge != null
          ? ` (${p.isBirthDateApproximate ? '약 ' : ''}${currentAge}세)`
          : ''
      return `${birthLabel} ~ 생존${liveAgeText}`
    }
    return floruitLabel || tenureFallbackLabel || '생존'
  })()

  const genderLabel =
    p.gender === 'MALE' ? '남' : p.gender === 'FEMALE' ? '여' : (p.gender ?? '—')

  /** 축약 머리의 생몰 — '1852–1931'(BC는 '기원전 N'). 머리 카드의 긴 부제를 한 토막으로. */
  const compactLifespan = (() => {
    const yearText = (
      year?: number | null,
      era?: string | null,
      approx?: boolean | null,
    ) => {
      if (year == null) return '미상'
      const base = era === 'BC' ? `기원전 ${year}` : `${year}`
      return approx ? `${base}경` : base
    }
    if (p.birthYear == null && p.deathYear == null) {
      return floruitLabel || tenureFallbackLabel
    }
    return `${yearText(p.birthYear, p.birthEra, p.isBirthDateApproximate)}–${
      isDeceased
        ? yearText(p.deathYear, p.deathEra, p.isDeathDateApproximate)
        : '현재'
    }`
  })()

  /** 탭 건수 — 누르기 전에 어디에 기록이 있는지 한눈에 파악 */
  const genealogyCount =
    (p.father ? 1 : 0) +
    (p.mother ? 1 : 0) +
    (p.spouseRelations?.length ? p.spouseRelations.length : p.spouse ? 1 : 0) +
    (person.children?.length ?? 0) +
    (p.siblings?.length ?? 0)
  const humanRelationshipsCount =
    (person as { humanRelationships?: PersonHumanRelationshipItem[] })
      .humanRelationships?.length ?? 0
  const relationsTabCount = genealogyCount + humanRelationshipsCount
  const politicsCount =
    ((person as { partyMemberships?: unknown[] }).partyMemberships?.length ?? 0) +
    ((person as { electionCandidacies?: unknown[] }).electionCandidacies?.length ?? 0) +
    (p.partyLeaderships?.length ?? 0)
  const activitiesCount =
    (p.books?.length ?? 0) +
    (p.foundedCompanies?.length ?? 0) +
    (p.organizationRoles?.length ?? 0) +
    (p.militaryCommands?.length ?? 0)
  const careerTabCount =
    combinedTenures.count +
    (p.careers?.length ?? 0) +
    (p.educations?.length ?? 0) +
    (p.awards?.length ?? 0) +
    activitiesCount +
    politicsCount
  const annalsCount =
    timelineReigns.length +
    timelineTenures.length +
    timelineCareers.length +
    timelineEvents.length +
    lifeEvents.length

  const backLabel = closeLabel

  const familyFather = p.father
  const familyMother = p.mother
  const familySpouse = p.spouse
  const hasFamilyOnOverview =
    familyFather != null || familyMother != null || familySpouse != null

  const countryFlagSrc = p.country?.thumbnailUrl
    ? getUploadImageUrl(p.country.thumbnailUrl) || p.country.thumbnailUrl
    : p.country?.isoCode
      ? `https://flagcdn.com/w80/${p.country.isoCode.toLowerCase()}.png`
      : null

  const registeredAtLabel = (() => {
    const raw = p.createdAt
    if (!raw) return null
    try {
      const d = new Date(raw)
      return d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return null
    }
  })()

  return (
    <>
      <PanelRoot
        $embed={embedInModal}
        style={{ ['--person-sticky-offset' as string]: `${stickyHeight + 16}px` }}
        as={motion.div}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* 상단 네비바: 평문 복귀 링크(좌) + 통합 인물 검색·이동(중) + 수정·더보기(⋯) 메뉴(우) */}
        {!hideHeaderActions && (
          <TopNavBar>
            <TopNavLeft>
              <BackToListButton
                type="button"
                onClick={() => {
                  playClickSound()
                  onClose()
                }}
              >
                <FiArrowLeft size={13} />
                {backLabel}
              </BackToListButton>
              {!embedInModal && (
                <>
                  <TopNavSep aria-hidden="true">·</TopNavSep>
                  <BackToListButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      navigate(pathKeys.personsTimeline())
                    }}
                  >
                    인물 목록
                  </BackToListButton>
                </>
              )}
            </TopNavLeft>
            {!embedInModal && (
              <PersonTopSearchBar
                currentPersonId={person.id}
                onSelectPerson={(targetId) => {
                  playClickSound()
                  if (onLinkedPersonClick) {
                    onLinkedPersonClick(targetId)
                  } else {
                    navigate(buildDetailUrlFor(targetId))
                  }
                }}
              />
            )}
            <HeaderActions>
              <OutlineButton
                type="button"
                onClick={() => {
                  playClickSound()
                  onEdit(person.id)
                }}
              >
                <FiEdit2 size={12} />
                수정
              </OutlineButton>
              <PersonActionsMenu
                onAdd={!embedInModal ? onAdd : undefined}
                onDelete={() => {
                  playClickSound()
                  setDeleteConfirmOpen(true)
                }}
              />
            </HeaderActions>
          </TopNavBar>
        )}

        {/* 머리 카드: 썸네일·이름 + 핵심 정보 줄 + 생애 타임라인 */}
        <HeroCard ref={heroRef}>
        <HeaderRow>
          <HeaderLeft>
            {/* 숨긴 파일 입력 */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarFileChange}
            />
            <AvatarButton
              type="button"
              $loading={uploadingAvatar}
              aria-label={embedInModal ? fullName : '프로필 사진 변경'}
              // 임베드(읽기) 모달에서는 업로드 트리거 비활성 — 편집 어포던스 누출 방지(UX2).
              onClick={() =>
                !embedInModal &&
                !uploadingAvatar &&
                avatarInputRef.current?.click()
              }
              style={embedInModal ? { cursor: 'default' } : undefined}
            >
              {person.profileImageUrl && !avatarBroken ? (
                <img
                  src={
                    getUploadImageUrl(person.profileImageUrl) ||
                    person.profileImageUrl
                  }
                  alt={fullName}
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <FiUsers size={24} aria-hidden />
              )}
              {!embedInModal && (
                <AvatarOverlay aria-hidden>
                  {uploadingAvatar ? (
                    <AvatarSpinner />
                  ) : (
                    <FiCamera size={20} strokeWidth={2} />
                  )}
                </AvatarOverlay>
              )}
            </AvatarButton>
            <HeaderTitleBlock>
              <PageTitleRow>
                <PageTitle>{fullName}</PageTitle>
              </PageTitleRow>
              {p.country?.name && (() => {
                // /country/:id 셸이 역사국가 id도 그대로 resolve해 전용 상세(14탭)를 렌더하므로
                // 현대/역사 구분 없이 country 블록의 id를 그대로 목적지로 쓴다(브리지 현대국 우회 불필요).
                const navTargetId = p.country?.id ?? null
                const interactive = !!navTargetId
                return (
                <DetailCountryRow
                  as={interactive ? 'button' : 'div'}
                  {...(interactive ? { type: 'button' as const } : {})}
                  onClick={
                    interactive
                      ? () => {
                          playClickSound()
                          navigate(pathKeys.countryDetail(navTargetId))
                        }
                      : undefined
                  }
                >
                  {countryFlagSrc && !countryFlagBroken ? (
                    <CountryFlagImg
                      src={countryFlagSrc}
                      alt=""
                      aria-hidden
                      onError={() => setCountryFlagBroken(true)}
                    />
                  ) : p.country?.flagEmoji ? (
                    <DetailCountryFlagEmoji>{p.country.flagEmoji}</DetailCountryFlagEmoji>
                  ) : null}
                  <DetailCountryName>{p.country.name}</DetailCountryName>
                </DetailCountryRow>
                )
              })()}
              {monarchName && (
                <MonarchTitleRow>
                  <MonarchCrownIcon>♛</MonarchCrownIcon>
                  <MonarchNameLabel>{monarchName}</MonarchNameLabel>
                  {monarchPositionTitle && (
                    <MonarchPositionBadge>{monarchPositionTitle}</MonarchPositionBadge>
                  )}
                </MonarchTitleRow>
              )}
              <PageSubtitle>{subtitleLifespan}</PageSubtitle>
              {(() => {
                const meaningParts = [
                  p.surname && p.surnameMeaning
                    ? `${p.surname} ${p.surnameMeaning}`
                    : null,
                  p.name && p.nameMeaning
                    ? `${p.name} ${p.nameMeaning}`
                    : null,
                  p.middleName && p.middleNameMeaning
                    ? `${p.middleName} ${p.middleNameMeaning}`
                    : null,
                ].filter(Boolean) as string[]
                const has =
                  p.originalName ||
                  meaningParts.length > 0 ||
                  effectivePreEnthronementTitle ||
                  effectivePosthumousName
                if (!has) return null
                return (
                  <NameMetaBlock>
                    {p.originalName && (
                      <NameMetaRow>
                        <NameMetaLabel>원어</NameMetaLabel>
                        <NameMetaOriginal>{p.originalName}</NameMetaOriginal>
                      </NameMetaRow>
                    )}
                    {meaningParts.length > 0 && (
                      <NameMetaRow>
                        <NameMetaLabel>뜻</NameMetaLabel>
                        <NameMetaValue>
                          {meaningParts.join(' · ')}
                        </NameMetaValue>
                      </NameMetaRow>
                    )}
                    {effectivePreEnthronementTitle && (
                      <NameMetaRow>
                        <NameMetaLabel>작호</NameMetaLabel>
                        <NameMetaValue>{effectivePreEnthronementTitle}</NameMetaValue>
                      </NameMetaRow>
                    )}
                    {effectivePosthumousName && (
                      <NameMetaRow>
                        <NameMetaLabel>시호</NameMetaLabel>
                        <NameMetaValue>{effectivePosthumousName}</NameMetaValue>
                      </NameMetaRow>
                    )}
                  </NameMetaBlock>
                )
              })()}
              {p.nicknames && p.nicknames.length > 0 && (() => {
                // 상단 왕관 배지(monarchName) 및 작호·시호 메타행과 동일한 텍스트는 별칭 칩에서 중복 노출하지 않는다.
                const deduped = p.nicknames.filter((nick) => {
                  const val = nick.nickname?.trim()
                  if (!val) return false
                  if (nick.type === 'TEMPLE_NAME' && val === effectiveTempleName) return false
                  if (nick.type === 'POSTHUMOUS_NAME' && val === effectivePosthumousName)
                    return false
                  if (
                    nick.type === 'COURT_TITLE' &&
                    val === effectivePreEnthronementTitle
                  )
                    return false
                  return true
                })
                if (deduped.length === 0) return null
                const sorted = [...deduped].sort(
                  (a, b) => (a.priority ?? 999) - (b.priority ?? 999),
                )
                return (
                  <NicknameRow>
                    {sorted.map((nick, idx) => (
                      <NicknameChip
                        key={nick.id ?? nick.nickname ?? `nickname-${idx}`}
                        title={nick.reason || undefined}
                      >
                        {nick.type && (
                          <NicknameType>
                            {NICKNAME_TYPE_LABELS[nick.type] ?? nick.type}
                          </NicknameType>
                        )}
                        <NicknameValue>{nick.nickname}</NicknameValue>
                        {nick.reason && (
                          <NicknameReason>{nick.reason}</NicknameReason>
                        )}
                      </NicknameChip>
                    ))}
                  </NicknameRow>
                )
              })()}
              {registeredAtLabel && (
                <RegisteredByline>등록 {registeredAtLabel}</RegisteredByline>
              )}
              {(() => {
                // 가족 구성 요약 뱃지 (부/모/배우자/자녀/형제 수)
                const jumpToGenealogy = () => {
                  playClickSound()
                  handleTabChange('genealogy')
                  window.requestAnimationFrame(() => {
                    document
                      .getElementById('person-detail-tab-genealogy')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  })
                }
                const badges: Array<{
                  key: string
                  label: string
                  personId?: string
                  onClick?: () => void
                  title?: string
                }> = []
                if (p.father)
                  badges.push({
                    key: 'father',
                    label: '부',
                    personId: p.father.id ?? undefined,
                  })
                if (p.mother)
                  badges.push({
                    key: 'mother',
                    label: '모',
                    personId: p.mother.id ?? undefined,
                  })
                const spouseCount = (p.spouseRelations ?? []).length
                if (spouseCount > 0)
                  badges.push({
                    key: 'spouses',
                    label: `배우자 ${spouseCount}`,
                    onClick: jumpToGenealogy,
                    title: '가계도 탭에서 배우자 보기',
                  })
                const childrenCount =
                  (person.children ?? []).length ?? 0
                if (childrenCount > 0)
                  badges.push({
                    key: 'children',
                    label: `자녀 ${childrenCount}`,
                    onClick: jumpToGenealogy,
                    title: '가계도 탭에서 자녀 보기',
                  })
                const siblingCount = (p.siblings ?? []).length
                if (siblingCount > 0) {
                  // 공유 축 분해 툴팁 — 사실 진술만(이복/이부 단정 없음). REST siblings는
                  // take 무제한(무절단 완전)이라 억제 조건 불필요. FK 미도달(구 캐시)이면 생략.
                  const egoFks = { fatherId: p.fatherId ?? null, motherId: p.motherId ?? null }
                  let fullCount = 0
                  let fatherOnlyCount = 0
                  let motherOnlyCount = 0
                  let hasFkData = false
                  for (const sib of p.siblings ?? []) {
                    if (sib?.fatherId === undefined && sib?.motherId === undefined) continue
                    hasFkData = true
                    const shared = classifySiblingKinship(egoFks, sib).sharedAxis
                    if (shared === 'both') fullCount += 1
                    else if (shared === 'father') fatherOnlyCount += 1
                    else if (shared === 'mother') motherOnlyCount += 1
                  }
                  const parts: string[] = []
                  if (fullCount > 0) parts.push(`부모 모두 공유 ${fullCount}`)
                  if (fatherOnlyCount > 0) parts.push(`아버지만 공유 ${fatherOnlyCount}`)
                  if (motherOnlyCount > 0) parts.push(`어머니만 공유 ${motherOnlyCount}`)
                  badges.push({
                    key: 'siblings',
                    label: `형제 ${siblingCount}`,
                    onClick: jumpToGenealogy,
                    title: hasFkData && parts.length > 0 ? parts.join(' · ') : '가계도 탭에서 형제 보기',
                  })
                }
                if (badges.length === 0) return null
                return (
                  <FamilyBadgeRow>
                    {badges.map((badgeItem) => {
                      const handleClick = badgeItem.personId
                        ? () => handlePersonClick(badgeItem.personId!)
                        : badgeItem.onClick
                      return handleClick ? (
                        <FamilyBadge
                          key={badgeItem.key}
                          as="button"
                          type="button"
                          title={badgeItem.title}
                          aria-label={
                            badgeItem.title
                              ? `${badgeItem.label} — ${badgeItem.title}`
                              : undefined
                          }
                          onClick={handleClick}
                        >
                          {badgeItem.label}
                        </FamilyBadge>
                      ) : (
                        <FamilyBadge
                          key={badgeItem.key}
                          title={badgeItem.title}
                          // title은 마우스 hover 전용 — SR 경로는 라벨+분해 병합 aria-label로 확보
                          aria-label={badgeItem.title ? `${badgeItem.label} — ${badgeItem.title}` : undefined}
                        >
                          {badgeItem.label}
                        </FamilyBadge>
                      )
                    })}
                  </FamilyBadgeRow>
                )
              })()}
            </HeaderTitleBlock>
          </HeaderLeft>
        </HeaderRow>

        {/* 기본정보 + 요약: 생몰·국가·성별·가문·종교·배우자·저작·정부직위·사건·조직 */}
        <KpiStrip $compact={embedInModal}>
          {/* 국가·생존 기간은 머리(국기 칩·'향년 N세' 부제)에 이미 있어 여기서 반복하지 않는다 */}
          {(person.gender === 'MALE' || person.gender === 'FEMALE') && (
            <KpiItem>
              <KpiLabel>성별</KpiLabel>
              <KpiValue>{genderLabel}</KpiValue>
            </KpiItem>
          )}
          {tenureTotalYears != null && (
            <KpiItem>
              <KpiLabel>재임·재위 총</KpiLabel>
              <KpiValue>약 {tenureTotalYears}년</KpiValue>
            </KpiItem>
          )}
          {optimisticInfluence != null && optimisticInfluence > 0 && (
            <KpiItem>
              <KpiLabel>영향력</KpiLabel>
              <KpiValue>
                {/* 낙관값 단일 소스 — 저장 중에도 섹션 슬라이더와 배지가 어긋나지 않게 */}
                <InfluenceBadge influence={optimisticInfluence} />
              </KpiValue>
            </KpiItem>
          )}
          {person.dynasty && (
            <KpiItem>
              <KpiLabel>가문</KpiLabel>
              <KpiValue>
                <KpiLink
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setDynastyModal({
                      id: person.dynasty!.id,
                      name: person.dynasty!.name,
                    })
                  }}
                >
                  {person.dynasty.name}
                </KpiLink>
              </KpiValue>
            </KpiItem>
          )}
          {person.religion && (
            <KpiItem>
              <KpiLabel>종교</KpiLabel>
              <KpiValue>
                {person.religion.name}
                {p.denomination?.name && (
                  <KpiSubValue> · {p.denomination.name}</KpiSubValue>
                )}
              </KpiValue>
            </KpiItem>
          )}
          {(() => {
            const fallbackName = person.spouse
              ? getPersonDisplayName(person.spouse)
              : null
            const hasAny = kpiSpouses.length > 0 || fallbackName
            if (!hasAny) return null
            return (
              <KpiItem>
                <KpiLabel>배우자 {kpiSpouses.length > 1 ? `(${kpiSpouses.length})` : ''}</KpiLabel>
                <KpiValue>
                  {kpiSpouses.length > 0
                    ? kpiSpouses.map((sp, idx) => (
                        <span key={sp.id ?? `spouse-${idx}`}>
                          {idx > 0 && ' · '}
                          {sp.id ? (
                            <KpiLink
                              type="button"
                              onClick={() => handlePersonClick(sp.id!)}
                            >
                              {sp.name}
                            </KpiLink>
                          ) : (
                            sp.name
                          )}
                          {sp.rank
                            ? ` (${MARRIAGE_RANK_LABELS[sp.rank] ?? sp.rank})`
                            : ''}
                        </span>
                      ))
                    : fallbackName}
                </KpiValue>
              </KpiItem>
            )
          })()}
        </KpiStrip>

        {lifeTimeline && (
          <LifeTimeline
            layout={lifeTimeline}
            onSelect={jumpToRecord}
            onOpenAnnals={
              activeTab === 'events'
                ? undefined
                : () => {
                    playClickSound()
                    handleTabChange('events')
                  }
            }
          />
        )}
        </HeroCard>

        {/* 고정 내비: 축약 머리 + 탭 + (개요) 섹션 칩 */}
        <StickyNavBar ref={stickyNavRef} $sticky={!embedInModal} $raised={heroOut}>
        {!embedInModal && (
          <CompactIdentity $visible={heroOut} aria-hidden={!heroOut}>
            <div>
              <CompactIdentityRow>
                {person.profileImageUrl && !avatarBroken ? (
                  <img
                    src={
                      getUploadImageUrl(person.profileImageUrl) ||
                      person.profileImageUrl
                    }
                    alt=""
                  />
                ) : (
                  <CompactIdentityAvatarFallback>
                    <FiUsers size={14} aria-hidden />
                  </CompactIdentityAvatarFallback>
                )}
                <CompactIdentityName>{fullName}</CompactIdentityName>
                <CompactIdentityMeta>{compactLifespan}</CompactIdentityMeta>
              </CompactIdentityRow>
            </div>
          </CompactIdentity>
        )}
        {/* 탭 네비게이션 (6탭: 개요 | 이력·활동 | 가계·관계 | 연보 | 평가 | 연결) */}
        <TabNav
          role="tablist"
          aria-label="인물 상세 구역"
          onKeyDown={handleTabKeyDown}
        >
          <TabBtn
            type="button"
            role="tab"
            id="person-detail-tab-overview"
            aria-controls="person-detail-panel-overview"
            aria-selected={activeTab === 'overview'}
            tabIndex={activeTab === 'overview' ? 0 : -1}
            $active={activeTab === 'overview'}
            onClick={() => {
              playClickSound()
              handleTabChange('overview')
            }}
          >
            개요
          </TabBtn>
          <TabBtn
            type="button"
            role="tab"
            id="person-detail-tab-career"
            aria-controls="person-detail-panel-career"
            aria-selected={activeTab === 'career'}
            tabIndex={activeTab === 'career' ? 0 : -1}
            $active={activeTab === 'career'}
            $empty={careerTabCount === 0}
            onClick={() => {
              playClickSound()
              handleTabChange('career')
            }}
          >
            이력·활동
            {(careerTabCount > 0 || activeTab === 'career') && (
              <TabCount aria-label={`${careerTabCount}건`}>{careerTabCount}</TabCount>
            )}
          </TabBtn>
          <TabBtn
            type="button"
            role="tab"
            id="person-detail-tab-genealogy"
            aria-controls="person-detail-panel-genealogy"
            aria-selected={activeTab === 'genealogy'}
            tabIndex={activeTab === 'genealogy' ? 0 : -1}
            $active={activeTab === 'genealogy'}
            $empty={relationsTabCount === 0}
            onClick={() => {
              playClickSound()
              handleTabChange('genealogy')
            }}
          >
            가계·관계
            <TabCount aria-label={`${relationsTabCount}명`}>{relationsTabCount}</TabCount>
          </TabBtn>
          <TabBtn
            type="button"
            role="tab"
            id="person-detail-tab-events"
            aria-controls="person-detail-panel-events"
            aria-selected={activeTab === 'events'}
            tabIndex={activeTab === 'events' ? 0 : -1}
            $active={activeTab === 'events'}
            $empty={annalsCount === 0}
            onClick={() => {
              playClickSound()
              handleTabChange('events')
            }}
          >
            연보
            {(annalsCount > 0 || activeTab === 'events') && (
              <TabCount aria-label={`${annalsCount}건`}>{annalsCount}</TabCount>
            )}
          </TabBtn>
          <TabBtn
            type="button"
            role="tab"
            id="person-detail-tab-evaluation"
            aria-controls="person-detail-panel-evaluation"
            aria-selected={activeTab === 'evaluation'}
            tabIndex={activeTab === 'evaluation' ? 0 : -1}
            $active={activeTab === 'evaluation'}
            onClick={() => {
              playClickSound()
              handleTabChange('evaluation')
            }}
          >
            평가
            {person.influence != null && (
              <TabCount aria-label={`영향력 ${optimisticInfluence}점`}>
                {optimisticInfluence}
              </TabCount>
            )}
          </TabBtn>
          <TabBtn
            type="button"
            role="tab"
            id="person-detail-tab-connections"
            aria-controls="person-detail-panel-connections"
            aria-selected={activeTab === 'connections'}
            tabIndex={activeTab === 'connections' ? 0 : -1}
            $active={activeTab === 'connections'}
            onClick={() => {
              playClickSound()
              handleTabChange('connections')
            }}
          >
            연결
          </TabBtn>
        </TabNav>
        </StickyNavBar>

        {/* 탭 컨텐츠 */}
        <TabContentArea>
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <TabContent
                key="overview"
                role="tabpanel"
                id="person-detail-panel-overview"
                aria-labelledby="person-detail-tab-overview"
                as={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <OverviewSections>
                  {/* 출생 / 사망 카드 */}
                  <BirthDeathCards
                    person={p}
                    birthDateStr={birthDateStr}
                    deathDateStr={deathDateStr}
                    ageAtDeath={ageAtDeath}
                  />

                  {/* 국가 소속·국적 (다중) */}
                  {p.countryAffiliations && p.countryAffiliations.length > 0 && (() => {
                    const TYPE_LABELS: Record<string, string> = {
                      CITIZENSHIP: '국적',
                      BIRTH_PLACE: '출생',
                      PRIMARY_RESIDENCE: '거주',
                      SERVED: '복무',
                      EXILE: '망명',
                      OTHER: '기타',
                    }
                    const sorted = p.countryAffiliations.slice().sort((a, b) => {
                      const pa = a.priority ?? 999
                      const pb = b.priority ?? 999
                      return pa - pb
                    })
                    return (
                      <section aria-label="국가 소속·국적">
                        <OverviewSectionHeaderRow>
                          <OverviewSectionHeading>
                            <FiFlag size={14} strokeWidth={2.2} />
                            <span>국가 소속·국적</span>
                            <CountMuted>{sorted.length}</CountMuted>
                          </OverviewSectionHeading>
                        </OverviewSectionHeaderRow>
                        <CountryAffiliationList>
                          {sorted.map((aff, affIdx) => {
                            const c =
                              aff.historicalCountry ??
                              aff.country ??
                              null
                            const targetCountryId = c?.id ?? null
                            const interactive = Boolean(targetCountryId)
                            const typeLabel = aff.affiliationType
                              ? TYPE_LABELS[aff.affiliationType] ??
                                aff.affiliationType
                              : '소속'
                            const start = formatIsoDateKo(aff.startDate)
                            const end = formatIsoDateKo(aff.endDate)
                            const period =
                              formatPeriod(start, end, isDeceased ? '미상' : '현재')
                            return (
                              <CountryAffiliationChip
                                key={aff.id ?? `aff-${affIdx}`}
                                as={interactive ? 'button' : 'div'}
                                {...(interactive
                                  ? {
                                      type: 'button' as const,
                                      onClick: () => {
                                        playClickSound()
                                        navigate(pathKeys.countryDetail(targetCountryId!))
                                      },
                                    }
                                  : {})}
                                $primary={aff.priority === 0}
                              >
                                <CountryAffiliationType>{typeLabel}</CountryAffiliationType>
                                <CountryAffiliationName>
                                  {c?.name ?? '국가 미상'}
                                </CountryAffiliationName>
                                {period && (
                                  <CountryAffiliationPeriod>{period}</CountryAffiliationPeriod>
                                )}
                              </CountryAffiliationChip>
                            )
                          })}
                        </CountryAffiliationList>
                      </section>
                    )
                  })()}

                  {/* 시조로 등록된 가문 */}
                  {p.foundedDynasties && p.foundedDynasties.length > 0 && (
                    <section aria-label="시조 가문">
                      <OverviewSectionHeaderRow>
                        <OverviewSectionHeading>
                          <FiGitBranch size={14} strokeWidth={2.2} />
                          <span>시조 가문</span>
                          {p.foundedDynasties.length > 1 && (
                            <CountMuted>{p.foundedDynasties.length}</CountMuted>
                          )}
                        </OverviewSectionHeading>
                      </OverviewSectionHeaderRow>
                      <FoundedDynastyRow>
                        {p.foundedDynasties.map((d, dIdx) => (
                          <FoundedDynastyChip
                            key={d.id ?? d.name ?? `dynasty-${dIdx}`}
                            type="button"
                            onClick={() => {
                              playClickSound()
                              if (d.id) {
                                setDynastyModal({
                                  id: d.id,
                                  name: d.name ?? '이름 없음',
                                })
                              } else {
                                navigate(pathKeys.dynasty())
                              }
                            }}
                          >
                            {d.name ?? '이름 없음'}
                          </FoundedDynastyChip>
                        ))}
                      </FoundedDynastyRow>
                    </section>
                  )}

                  {/* 전기 — 개요 탭의 핵심 서술 */}
                  <section aria-label="전기">
                    <OverviewSectionHeaderRow>
                      <OverviewSectionHeading>
                        <FiBookOpen size={14} strokeWidth={2.2} />
                        <span>전기</span>
                      </OverviewSectionHeading>
                      <span ref={setBioToolbarEl} />
                    </OverviewSectionHeaderRow>
                    {embedInModal ? (
                      <BioClamp resetKey={person.id}>
                        <PersonBiographySections
                          personId={person.id}
                          sections={p.biographySections ?? undefined}
                          legacyBiography={person.biography}
                          readOnly={embedInModal}
                          toolbarContainer={bioToolbarEl}
                          lifespanBounds={{
                            minSigned:
                              p.birthYear != null
                                ? p.birthEra === 'BC'
                                  ? -p.birthYear
                                  : p.birthYear
                                : null,
                            maxSigned:
                              p.deathYear != null
                                ? p.deathEra === 'BC'
                                  ? -p.deathYear
                                  : p.deathYear
                                : null,
                          }}
                          onPersonClick={(id) => onLinkedPersonClick?.(id)}
                          setTermTooltip={setTermTooltip}
                          setDynastyTooltip={setDynastyTooltip}
                        />
                      </BioClamp>
                    ) : (
                      <PersonBiographySections
                        personId={person.id}
                        sections={p.biographySections ?? undefined}
                        legacyBiography={person.biography}
                        readOnly={embedInModal}
                        toolbarContainer={bioToolbarEl}
                        lifespanBounds={{
                          minSigned:
                            p.birthYear != null
                              ? p.birthEra === 'BC'
                                ? -p.birthYear
                                : p.birthYear
                              : null,
                          maxSigned:
                            p.deathYear != null
                              ? p.deathEra === 'BC'
                                ? -p.deathYear
                                : p.deathYear
                              : null,
                        }}
                        onPersonClick={pushPersonToModalStack}
                        setTermTooltip={setTermTooltip}
                        setDynastyTooltip={setDynastyTooltip}
                      />
                    )}
                  </section>
                </OverviewSections>
              </TabContent>
            )}

            {activeTab === 'career' && (
              <TabContent
                key="career"
                role="tabpanel"
                id="person-detail-panel-career"
                aria-labelledby="person-detail-tab-career"
                as={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <OverviewSections>
                  {/* 0. 이력·활동 상단 구성 요약 · 빠른 점프 바 (활성 섹션이 2개 이상일 때) */}
                  {(() => {
                    const activitiesCount =
                      (p.books?.length ?? 0) +
                      (p.foundedCompanies?.length ?? 0) +
                      (p.organizationRoles?.length ?? 0) +
                      (p.militaryCommands?.length ?? 0)
                    const activeCareerSections = [
                      {
                        id: 'career-section-tenures',
                        label: '재임·재위',
                        count: combinedTenures.count,
                        color: '#6366f1',
                      },
                      {
                        id: 'career-section-careers',
                        label: '분야별 경력',
                        count: p.careers?.length ?? 0,
                        color: '#3b82f6',
                      },
                      {
                        id: 'career-section-education',
                        label: '학력',
                        count: p.educations?.length ?? 0,
                        color: '#14b8a6',
                      },
                      {
                        id: 'career-section-awards',
                        label: '수상·훈장',
                        count: p.awards?.length ?? 0,
                        color: '#f59e0b',
                      },
                      {
                        id: 'career-section-activities',
                        label: '활동·이력',
                        count: activitiesCount,
                        color: '#8b5cf6',
                      },
                      {
                        id: 'career-section-politics',
                        label: '정당·선거',
                        count: politicsCount,
                        color: '#ec4899',
                      },
                    ].filter((s) => s.count > 0)
                    if (activeCareerSections.length < 2) return null
                    return (
                      <CareerSummaryStrip aria-label="이력·활동 구성 요약">
                        <CareerSummaryLabel>구성 요약</CareerSummaryLabel>
                        <CareerSummaryChips>
                          {activeCareerSections.map((sec) => (
                            <CareerSummaryChip
                              key={sec.id}
                              type="button"
                              onClick={() => {
                                playClickSound()
                                const el = document.getElementById(sec.id)
                                el?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'start',
                                })
                              }}
                            >
                              <CareerSummaryDot $color={sec.color} />
                              <span>{sec.label}</span>
                              <CareerSummaryCount>{sec.count}</CareerSummaryCount>
                            </CareerSummaryChip>
                          ))}
                        </CareerSummaryChips>
                      </CareerSummaryStrip>
                    )
                  })()}

                  {/* 1. 재임·재위 통합 (데이터 있을 때만 본문에 노출) */}
                  {combinedTenures.count > 0 && (
                    <section
                      id="career-section-tenures"
                      aria-label="재임·재위"
                      style={{
                        scrollMarginTop: 'var(--person-sticky-offset, 24px)',
                      }}
                    >
                      <OverviewSectionHeaderRow
                        style={{
                          paddingBottom: 10,
                          marginBottom: 8,
                          borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
                        }}
                      >
                        <OverviewSectionHeading>
                          <FiAward size={14} strokeWidth={2.2} />
                          <span>재임·재위</span>
                          <CountMuted>{combinedTenures.count}</CountMuted>
                        </OverviewSectionHeading>
                        {!embedInModal && (
                          <UnifiedActionRow>
                            <TenureAddButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setAddKindChooserOpen(true)
                              }}
                            >
                              <FiPlus size={12} />
                              재임·재위 추가
                            </TenureAddButton>
                          </UnifiedActionRow>
                        )}
                      </OverviewSectionHeaderRow>
                      <TenureReignList
                        items={combinedTenures.items}
                        birthYear={person.birthYear}
                        birthMonth={person.birthMonth}
                        birthDay={person.birthDay}
                        birthEra={person.birthEra ?? null}
                        deathDateStr={deathDateStr}
                        isDeceased={isDeceased}
                        embedInModal={embedInModal}
                        dynastyName={person.dynasty?.name ?? null}
                        currentPersonId={personId}
                        onPersonClick={handlePersonClick}
                        adjacencyByRecordId={adjacencyByRecordId}
                        achievementSuggestionsByRecordId={
                          recordEventSuggestionsQuery.data?.byRecordId
                        }
                        onEventClick={(eventId) => setViewingEventId(eventId)}
                        onPlayClick={playClickSound}
                        onEditTenure={(id) => {
                          setEditingTenureId(id)
                          setTenureModalOpen(true)
                        }}
                        onEditReign={(id) => {
                          setEditingReignId(id)
                          setSovereignReignModalOpen(true)
                        }}
                        onDeleteTenure={(id, label) => {
                          setEntryDeleteTarget({ kind: 'tenure', id, label })
                        }}
                        onDeleteReign={(id, label) => {
                          setEntryDeleteTarget({ kind: 'reign', id, label })
                        }}
                        onAchievementChanged={() => {
                          invalidateTenureQueries(queryClient, { personId })
                          void queryClient.invalidateQueries({
                            queryKey: ['person-record-event-suggestions', personId],
                          })
                        }}
                      />
                      <ContemporariesStrip
                        personId={personId}
                        enabled={contemporaryHeadsTarget != null}
                        onPersonClick={handlePersonClick}
                        onOpenCompare={
                          !embedInModal && contemporaryHeadsTarget
                            ? () => {
                                playClickSound()
                                navigate(
                                  pathKeys.headsOfState(
                                    contemporaryHeadsTarget.year,
                                    {
                                      range: contemporaryHeadsTarget.range,
                                      pins: contemporaryHeadsTarget.pins,
                                    },
                                  ),
                                )
                              }
                            : undefined
                        }
                      />
                    </section>
                  )}

                  {/* 2. 분야별 경력 (데이터 있을 때만 본문에 노출) */}
                  {(p.careers?.length ?? 0) > 0 && (() => {
                    const careers = p.careers ?? []
                    const KIND_LABELS: Record<string, string> = {
                      military: '군사',
                      business: '기업',
                      academic: '학계',
                      religious: '종교',
                      artist: '예술',
                      athlete: '체육',
                      media: '언론',
                      legal: '법조',
                      medical: '의료',
                    }
                    const KIND_ORDER: Record<string, number> = {
                      military: 0, business: 1, academic: 2, religious: 3,
                      artist: 4, athlete: 5, media: 6, legal: 7, medical: 8,
                    }
                    const grouped = careers.reduce<Record<string, typeof careers>>(
                      (acc, c) => {
                        ;(acc[c.kind] ??= []).push(c)
                        return acc
                      },
                      {},
                    )
                    const kinds = Object.keys(grouped).sort(
                      (a, b) => (KIND_ORDER[a] ?? 99) - (KIND_ORDER[b] ?? 99),
                    )
                    return (
                      <CollapsibleSection
                        id="career-section-careers"
                        storageKey="careers"
                        ariaLabel="분야별 경력"
                        icon={<FiBriefcase size={14} strokeWidth={2.2} />}
                        title="분야별 경력"
                        count={careers.length}
                        defaultOpen
                        actions={
                          !embedInModal && (
                            <UnifiedActionRow>
                              <TenureAddButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setEditingCareer(null)
                                  setCareerModalOpen(true)
                                }}
                              >
                                <FiPlus size={12} />
                                경력
                              </TenureAddButton>
                            </UnifiedActionRow>
                          )
                        }
                      >
                        <ActivityGroupList>
                          {kinds.map((k) => {
                            const list = grouped[k] ?? []
                            const sorted = list.slice().sort((a, b) => {
                              const ta = a.startDate
                                ? isoDateSortKey(a.startDate)
                                : Number.POSITIVE_INFINITY
                              const tb = b.startDate
                                ? isoDateSortKey(b.startDate)
                                : Number.POSITIVE_INFINITY
                              return ta - tb
                            })
                            return (
                              <ActivityGroup key={k}>
                                <ActivityGroupTitle>
                                  <span>{KIND_LABELS[k] ?? k}</span>
                                  <ActivityGroupCount>{list.length}</ActivityGroupCount>
                                </ActivityGroupTitle>
                                <SimpleEntryList>
                                  {sorted.map((c, cIdx) => {
                                    const start = formatIsoDateKo(c.startDate)
                                    const end = formatIsoDateKo(c.endDate)
                                    const period =
                                      formatPeriod(start, end, isDeceased ? '미상' : '현재')
                                    const isOngoing =
                                      !!c.startDate && !c.endDate && !isDeceased
                                    const titleBits = [
                                      c.organization?.name,
                                      c.rank?.name,
                                      c.title,
                                    ].filter(Boolean) as string[]
                                    const subBits = [
                                      c.branch,
                                      c.department,
                                      c.termNumber != null
                                        ? `${c.termNumber}대`
                                        : null,
                                    ].filter(Boolean) as string[]
                                    return (
                                      <SimpleEntryItem key={c.id ?? `career-${k}-${cIdx}`}>
                                        {!embedInModal && c.id && (
                                          <>
                                            <SimpleEntryEditBtn
                                              type="button"
                                              data-role="entry-edit"
                                              aria-label="수정"
                                              onClick={() => {
                                                playClickSound()
                                                setEditingCareer(c)
                                                setCareerModalOpen(true)
                                              }}
                                            >
                                              <FiEdit2 size={12} />
                                            </SimpleEntryEditBtn>
                                            <SimpleEntryDeleteBtn
                                              type="button"
                                              data-role="entry-delete"
                                              aria-label="삭제"
                                              disabled={isEntryDeleting}
                                              onClick={() =>
                                                setEntryDeleteTarget({
                                                  kind: 'career',
                                                  id: c.id!,
                                                  careerKind: c.kind,
                                                  label: titleBits[0] ?? '경력',
                                                })
                                              }
                                            >
                                              <FiTrash2 size={13} />
                                            </SimpleEntryDeleteBtn>
                                          </>
                                        )}
                                        <SimpleEntryDateCol
                                          $ongoing={isOngoing}
                                          $muted={!period}
                                        >
                                          {period || '연도 미상'}
                                        </SimpleEntryDateCol>
                                        <SimpleEntryMainCol>
                                          <SimpleEntryHeader>
                                            <SimpleEntryTitle>
                                              {titleBits[0] ?? '미상'}
                                            </SimpleEntryTitle>
                                            {titleBits.slice(1).map((t, i) => (
                                              <SimpleEntryRole
                                                key={`role-${i}`}
                                                $tone={i === 0 ? 'accent' : 'neutral'}
                                              >
                                                {t}
                                              </SimpleEntryRole>
                                            ))}
                                          </SimpleEntryHeader>
                                          {subBits.length > 0 && (
                                            <SimpleEntryPeriod>
                                              {subBits.join(' · ')}
                                            </SimpleEntryPeriod>
                                          )}
                                          {c.notes && (
                                            <SimpleEntryDescription>
                                              {c.notes}
                                            </SimpleEntryDescription>
                                          )}
                                        </SimpleEntryMainCol>
                                      </SimpleEntryItem>
                                    )
                                  })}
                                </SimpleEntryList>
                              </ActivityGroup>
                            )
                          })}
                        </ActivityGroupList>
                      </CollapsibleSection>
                    )
                  })()}

                  {/* 3. 학력 (데이터 있을 때만 본문에 노출) */}
                  {(p.educations?.length ?? 0) > 0 && (
                    <CollapsibleSection
                      id="career-section-education"
                      storageKey="education"
                      ariaLabel="학력"
                      icon={<FiBook size={14} strokeWidth={2.2} />}
                      title="학력"
                      count={p.educations?.length ?? 0}
                      defaultOpen
                      actions={
                        !embedInModal && (
                          <UnifiedActionRow>
                            <TenureAddButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setEditingEducation(null)
                                setEducationModalOpen(true)
                              }}
                            >
                              <FiPlus size={12} />
                              학력
                            </TenureAddButton>
                          </UnifiedActionRow>
                        )
                      }
                    >
                      <SimpleEntryList>
                        {(p.educations ?? [])
                          .slice()
                          .sort((a, b) => {
                            const ta = a.startDate
                              ? isoDateSortKey(a.startDate)
                              : Number.POSITIVE_INFINITY
                            const tb = b.startDate
                              ? isoDateSortKey(b.startDate)
                              : Number.POSITIVE_INFINITY
                            return ta - tb
                          })
                          .map((e, eduIdx) => {
                            const start = formatIsoDateKo(e.startDate)
                            const end = formatIsoDateKo(e.endDate)
                            const period =
                              formatPeriod(start, end, isDeceased ? '미상' : '재학중')
                            const isOngoing =
                              !!e.startDate && !e.endDate && !isDeceased
                            const subParts = [
                              e.major,
                              e.department,
                              e.classNumber != null ? `${e.classNumber}기` : null,
                            ].filter(Boolean) as string[]
                            return (
                              <SimpleEntryItem key={e.id ?? `edu-${eduIdx}`}>
                                {!embedInModal && e.id && (
                                  <>
                                    <SimpleEntryEditBtn
                                      type="button"
                                      data-role="entry-edit"
                                      aria-label="수정"
                                      onClick={() => {
                                        playClickSound()
                                        setEditingEducation(e)
                                        setEducationModalOpen(true)
                                      }}
                                    >
                                      <FiEdit2 size={12} />
                                    </SimpleEntryEditBtn>
                                    <SimpleEntryDeleteBtn
                                      type="button"
                                      data-role="entry-delete"
                                      aria-label="삭제"
                                      disabled={isEntryDeleting}
                                      onClick={() =>
                                        setEntryDeleteTarget({
                                          kind: 'education',
                                          id: e.id!,
                                          label:
                                            e.organization?.name ?? '학교 미상',
                                        })
                                      }
                                    >
                                      <FiTrash2 size={13} />
                                    </SimpleEntryDeleteBtn>
                                  </>
                                )}
                                <SimpleEntryDateCol
                                  $ongoing={isOngoing}
                                  $muted={!period}
                                >
                                  {period || '연도 미상'}
                                </SimpleEntryDateCol>
                                <SimpleEntryMainCol>
                                  <SimpleEntryHeader>
                                    <SimpleEntryTitle>
                                      {e.organization?.name ?? '학교 미상'}
                                    </SimpleEntryTitle>
                                    {e.status && (
                                      <SimpleEntryRole
                                        $tone={
                                          e.status === '졸업' ? 'teal' : 'neutral'
                                        }
                                      >
                                        {e.status}
                                      </SimpleEntryRole>
                                    )}
                                    {e.degree && (
                                      <SimpleEntryRole $tone="accent">
                                        {e.degree}
                                      </SimpleEntryRole>
                                    )}
                                  </SimpleEntryHeader>
                                  {subParts.length > 0 && (
                                    <SimpleEntryPeriod>
                                      {subParts.join(' · ')}
                                    </SimpleEntryPeriod>
                                  )}
                                  {e.notes && (
                                    <SimpleEntryDescription>
                                      {e.notes}
                                    </SimpleEntryDescription>
                                  )}
                                </SimpleEntryMainCol>
                              </SimpleEntryItem>
                            )
                          })}
                      </SimpleEntryList>
                    </CollapsibleSection>
                  )}

                  {/* 4. 수상·훈장 (데이터 있을 때만 본문에 노출) */}
                  {(p.awards?.length ?? 0) > 0 && (
                    <CollapsibleSection
                      id="career-section-awards"
                      storageKey="awards"
                      ariaLabel="수상·훈장"
                      icon={<FiAward size={14} strokeWidth={2.2} />}
                      title="수상·훈장"
                      count={p.awards?.length ?? 0}
                      defaultOpen
                      actions={
                        !embedInModal && (
                          <UnifiedActionRow>
                            <TenureAddButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setEditingAward(null)
                                setAwardModalOpen(true)
                              }}
                            >
                              <FiPlus size={12} />
                              수상
                            </TenureAddButton>
                          </UnifiedActionRow>
                        )
                      }
                    >
                      <SimpleEntryList>
                        {(p.awards ?? [])
                          .slice()
                          .sort((a, b) => {
                            const ta = a.awardDate
                              ? isoDateSortKey(a.awardDate)
                              : Number.POSITIVE_INFINITY
                            const tb = b.awardDate
                              ? isoDateSortKey(b.awardDate)
                              : Number.POSITIVE_INFINITY
                            return ta - tb
                          })
                          .map((a, awardIdx) => {
                            const awardDateStr = formatIsoDateKo(a.awardDate)
                            return (
                              <SimpleEntryItem key={a.id ?? `award-${awardIdx}`}>
                                {!embedInModal && a.id && (
                                  <>
                                    <SimpleEntryEditBtn
                                      type="button"
                                      data-role="entry-edit"
                                      aria-label="수정"
                                      onClick={() => {
                                        playClickSound()
                                        setEditingAward(a)
                                        setAwardModalOpen(true)
                                      }}
                                    >
                                      <FiEdit2 size={12} />
                                    </SimpleEntryEditBtn>
                                    <SimpleEntryDeleteBtn
                                      type="button"
                                      data-role="entry-delete"
                                      aria-label="삭제"
                                      disabled={isEntryDeleting}
                                      onClick={() =>
                                        setEntryDeleteTarget({
                                          kind: 'award',
                                          id: a.id!,
                                          label: a.awardName ?? '수상·훈장',
                                        })
                                      }
                                    >
                                      <FiTrash2 size={13} />
                                    </SimpleEntryDeleteBtn>
                                  </>
                                )}
                                <SimpleEntryDateCol $muted={!awardDateStr}>
                                  {awardDateStr || '일자 미상'}
                                </SimpleEntryDateCol>
                                <SimpleEntryMainCol>
                                  <SimpleEntryHeader>
                                    <SimpleEntryTitle>
                                      {a.awardName ?? '이름 없음'}
                                    </SimpleEntryTitle>
                                    {a.category && (
                                      <SimpleEntryRole $tone="amber">
                                        {a.category}
                                      </SimpleEntryRole>
                                    )}
                                  </SimpleEntryHeader>
                                  {a.awardingBody && (
                                    <SimpleEntryPeriod>
                                      {a.awardingBody}
                                    </SimpleEntryPeriod>
                                  )}
                                  {a.description && (
                                    <SimpleEntryDescription>
                                      {a.description}
                                    </SimpleEntryDescription>
                                  )}
                                </SimpleEntryMainCol>
                              </SimpleEntryItem>
                            )
                          })}
                      </SimpleEntryList>
                    </CollapsibleSection>
                  )}

                  {/* 5. 활동·이력 — 저작/창업/조직/군부대 */}
                  {(() => {
                    const books = p.books ?? []
                    const founded = p.foundedCompanies ?? []
                    const orgRoles = p.organizationRoles ?? []
                    const milCmds = p.militaryCommands ?? []
                    const total =
                      books.length +
                      founded.length +
                      orgRoles.length +
                      milCmds.length
                    if (total === 0) return null
                    return (
                      <CollapsibleSection
                        id="career-section-activities"
                        storageKey="activities"
                        ariaLabel="활동·이력"
                        icon={<FiFileText size={14} strokeWidth={2.2} />}
                        title="활동·이력"
                        count={total}
                        defaultOpen={total > 0}
                      >
                        <ActivityGroupList>
                          {books.length > 0 && (
                            <ActivityGroup>
                              <ActivityGroupTitle>
                                <span>저작</span>
                                <ActivityGroupCount>{books.length}</ActivityGroupCount>
                              </ActivityGroupTitle>
                              <SimpleEntryList>
                                {books.map((b, bookIdx) => (
                                  <SimpleEntryItem key={b.id ?? `book-${bookIdx}`}>
                                    <SimpleEntryDateCol $muted={!b.publishedYear}>
                                      {b.publishedYear
                                        ? `${b.publishedYear}년`
                                        : '연도 미상'}
                                    </SimpleEntryDateCol>
                                    <SimpleEntryMainCol>
                                      <SimpleEntryHeader>
                                        <SimpleEntryTitle>
                                          {b.title ?? '제목 없음'}
                                        </SimpleEntryTitle>
                                      </SimpleEntryHeader>
                                      {b.summary && (
                                        <SimpleEntryDescription>
                                          {b.summary}
                                        </SimpleEntryDescription>
                                      )}
                                    </SimpleEntryMainCol>
                                  </SimpleEntryItem>
                                ))}
                              </SimpleEntryList>
                            </ActivityGroup>
                          )}
                          {founded.length > 0 && (
                            <ActivityGroup>
                              <ActivityGroupTitle>
                                <span>창업 기업</span>
                                <ActivityGroupCount>{founded.length}</ActivityGroupCount>
                              </ActivityGroupTitle>
                              <SimpleEntryList>
                                {founded.map((c, foundedIdx) => {
                                  const foundedDateStr = formatIsoDateKo(
                                    c.foundedAt,
                                  )
                                  return (
                                    <SimpleEntryItem
                                      key={c.id ?? `founded-${foundedIdx}`}
                                    >
                                      <SimpleEntryDateCol
                                        $muted={!foundedDateStr}
                                      >
                                        {foundedDateStr || '연도 미상'}
                                      </SimpleEntryDateCol>
                                      <SimpleEntryMainCol>
                                        <SimpleEntryHeader>
                                          <SimpleEntryTitle>
                                            {c.name ?? '이름 없음'}
                                          </SimpleEntryTitle>
                                        </SimpleEntryHeader>
                                        {c.description && (
                                          <SimpleEntryDescription>
                                            {c.description}
                                          </SimpleEntryDescription>
                                        )}
                                      </SimpleEntryMainCol>
                                    </SimpleEntryItem>
                                  )
                                })}
                              </SimpleEntryList>
                            </ActivityGroup>
                          )}
                          {orgRoles.length > 0 && (
                            <ActivityGroup>
                              <ActivityGroupTitle>
                                <span>조직 역할</span>
                                <ActivityGroupCount>{orgRoles.length}</ActivityGroupCount>
                              </ActivityGroupTitle>
                              <SimpleEntryList>
                                {orgRoles
                                  .slice()
                                  .sort((a, b) => {
                                    const ta = a.startDate
                                      ? isoDateSortKey(a.startDate)
                                      : Number.POSITIVE_INFINITY
                                    const tb = b.startDate
                                      ? isoDateSortKey(b.startDate)
                                      : Number.POSITIVE_INFINITY
                                    return ta - tb
                                  })
                                  .map((o, orgIdx) => {
                                    const start = formatIsoDateKo(o.startDate)
                                    const end = formatIsoDateKo(o.endDate)
                                    const period =
                                      formatPeriod(start, end, isDeceased ? '미상' : '현재')
                                    const isOngoing =
                                      !!o.startDate && !o.endDate && !isDeceased
                                    return (
                                      <SimpleEntryItem key={o.id ?? `org-${orgIdx}`}>
                                        <SimpleEntryDateCol
                                          $ongoing={isOngoing}
                                          $muted={!period}
                                        >
                                          {period || '연도 미상'}
                                        </SimpleEntryDateCol>
                                        <SimpleEntryMainCol>
                                          <SimpleEntryHeader>
                                            <SimpleEntryTitle>
                                              {o.organization?.name ?? '조직 미상'}
                                              {o.organization?.shortName && (
                                                <SimpleEntrySub>
                                                  {' '}({o.organization.shortName})
                                                </SimpleEntrySub>
                                              )}
                                            </SimpleEntryTitle>
                                            {o.roleTitle && (
                                              <SimpleEntryRole $tone="accent">
                                                {o.roleTitle}
                                              </SimpleEntryRole>
                                            )}
                                          </SimpleEntryHeader>
                                        </SimpleEntryMainCol>
                                      </SimpleEntryItem>
                                    )
                                  })}
                              </SimpleEntryList>
                            </ActivityGroup>
                          )}
                          {milCmds.length > 0 && (
                            <ActivityGroup>
                              <ActivityGroupTitle>
                                <span>군부대 지휘</span>
                                <ActivityGroupCount>{milCmds.length}</ActivityGroupCount>
                              </ActivityGroupTitle>
                              <SimpleEntryList>
                                {milCmds
                                  .slice()
                                  .sort((a, b) => {
                                    const ta = a.startDate
                                      ? isoDateSortKey(a.startDate)
                                      : Number.POSITIVE_INFINITY
                                    const tb = b.startDate
                                      ? isoDateSortKey(b.startDate)
                                      : Number.POSITIVE_INFINITY
                                    return ta - tb
                                  })
                                  .map((m, milIdx) => {
                                    const start = formatIsoDateKo(m.startDate)
                                    const end = formatIsoDateKo(m.endDate)
                                    const period =
                                      formatPeriod(start, end, isDeceased ? '미상' : '현재')
                                    const isOngoing =
                                      !!m.startDate && !m.endDate && !isDeceased
                                    const titleParts = [m.rank, m.role].filter(Boolean) as string[]
                                    return (
                                      <SimpleEntryItem key={m.id ?? `mil-${milIdx}`}>
                                        <SimpleEntryDateCol
                                          $ongoing={isOngoing}
                                          $muted={!period}
                                        >
                                          {period || '연도 미상'}
                                        </SimpleEntryDateCol>
                                        <SimpleEntryMainCol>
                                          <SimpleEntryHeader>
                                            <SimpleEntryTitle>
                                              {m.unit?.name ?? '부대 미상'}
                                              {m.unit?.unitType && (
                                                <SimpleEntrySub>
                                                  {' '}({m.unit.unitType})
                                                </SimpleEntrySub>
                                              )}
                                            </SimpleEntryTitle>
                                            {titleParts.length > 0 && (
                                              <SimpleEntryRole $tone="accent">
                                                {titleParts.join(' · ')}
                                              </SimpleEntryRole>
                                            )}
                                          </SimpleEntryHeader>
                                        </SimpleEntryMainCol>
                                      </SimpleEntryItem>
                                    )
                                  })}
                              </SimpleEntryList>
                            </ActivityGroup>
                          )}
                        </ActivityGroupList>
                      </CollapsibleSection>
                    )
                  })()}

                  {/* 6. 정당·선거 (데이터 있을 때는 섹션, 없을 때는 모달 호스트만 마운트) */}
                  {politicsCount > 0 ? (
                    <CollapsibleSection
                      id="career-section-politics"
                      storageKey="politics"
                      ariaLabel="정당·선거"
                      icon={<FiFlag size={14} strokeWidth={2.2} />}
                      title="정당·선거"
                      count={politicsCount}
                      defaultOpen
                      keepChildrenMountedWhenEmpty
                      actions={
                        !embedInModal && (
                          <UnifiedActionRow>
                            <TenureAddButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                politicsActionsRef.current?.openCreate()
                              }}
                            >
                              <FiPlus size={12} />
                              당원 소속
                            </TenureAddButton>
                          </UnifiedActionRow>
                        )
                      }
                    >
                      <PersonPoliticsSection
                        personId={person.id}
                        countryId={person.countryId ?? null}
                        variant="overview"
                        actionsRef={politicsActionsRef}
                        partyMemberships={
                          (
                            person as {
                              partyMemberships?: import('@/shared/api/election').PartyMembershipRow[]
                            }
                          ).partyMemberships
                        }
                        electionCandidacies={
                          (
                            person as {
                              electionCandidacies?: ElectionCandidacyDetail[]
                            }
                          ).electionCandidacies
                        }
                        footer={
                          p.partyLeaderships && p.partyLeaderships.length > 0 ? (
                            <section aria-label="당 지도부 이력">
                              <ActivityGroupTitle style={{ marginTop: 18 }}>
                                <span>당 지도부 이력</span>
                                <ActivityGroupCount>
                                  {p.partyLeaderships.length}
                                </ActivityGroupCount>
                              </ActivityGroupTitle>
                              <SimpleEntryList>
                                {p.partyLeaderships
                                  .slice()
                                  .sort((a, b) => {
                                    const ta = a.startDate
                                      ? isoDateSortKey(a.startDate)
                                      : Number.POSITIVE_INFINITY
                                    const tb = b.startDate
                                      ? isoDateSortKey(b.startDate)
                                      : Number.POSITIVE_INFINITY
                                    return ta - tb
                                  })
                                  .map((l, partyIdx) => {
                                    const start = formatIsoDateKo(l.startDate)
                                    const end = formatIsoDateKo(l.endDate)
                                    const period =
                                      formatPeriod(start, end, isDeceased ? '미상' : '현재')
                                    const isOngoing =
                                      !!l.startDate && !l.endDate && !isDeceased
                                    return (
                                      <SimpleEntryItem key={l.id ?? `party-${partyIdx}`}>
                                        <SimpleEntryDateCol
                                          $ongoing={isOngoing}
                                          $muted={!period}
                                        >
                                          {period || '연도 미상'}
                                        </SimpleEntryDateCol>
                                        <SimpleEntryMainCol>
                                          <SimpleEntryHeader>
                                            <SimpleEntryTitle>
                                              {l.party?.name ?? '정당 미상'}
                                              {l.party?.shortName && (
                                                <SimpleEntrySub>
                                                  {' '}({l.party.shortName})
                                                </SimpleEntrySub>
                                              )}
                                            </SimpleEntryTitle>
                                            {l.roleTitle && (
                                              <SimpleEntryRole $tone="accent">
                                                {l.roleTitle}
                                              </SimpleEntryRole>
                                            )}
                                          </SimpleEntryHeader>
                                        </SimpleEntryMainCol>
                                      </SimpleEntryItem>
                                    )
                                  })}
                              </SimpleEntryList>
                            </section>
                          ) : null
                        }
                      />
                    </CollapsibleSection>
                  ) : !embedInModal ? (
                    <PersonPoliticsSection
                      personId={person.id}
                      countryId={person.countryId ?? null}
                      variant="overview"
                      actionsRef={politicsActionsRef}
                      partyMemberships={[]}
                      electionCandidacies={[]}
                    />
                  ) : null}

                  {/* 빈 섹션 통합 추가 스트립 (하단 더 채울 수 있는 이력) */}
                  {embedInModal && careerTabCount === 0 && (
                    <TenureEmpty>등록된 이력·활동 기록이 없습니다.</TenureEmpty>
                  )}
                  {!embedInModal && (() => {
                    const missingCareerAdds: Array<{
                      key: string
                      label: string
                      onClick: () => void
                    }> = []
                    if (combinedTenures.count === 0) {
                      missingCareerAdds.push({
                        key: 'tenure',
                        label: '재임·재위 추가',
                        onClick: () => {
                          playClickSound()
                          setAddKindChooserOpen(true)
                        },
                      })
                    }
                    if ((p.careers?.length ?? 0) === 0) {
                      missingCareerAdds.push({
                        key: 'careers',
                        label: '분야별 경력',
                        onClick: () => {
                          playClickSound()
                          setEditingCareer(null)
                          setCareerModalOpen(true)
                        },
                      })
                    }
                    if ((p.educations?.length ?? 0) === 0) {
                      missingCareerAdds.push({
                        key: 'education',
                        label: '학력',
                        onClick: () => {
                          playClickSound()
                          setEditingEducation(null)
                          setEducationModalOpen(true)
                        },
                      })
                    }
                    if ((p.awards?.length ?? 0) === 0) {
                      missingCareerAdds.push({
                        key: 'awards',
                        label: '수상·훈장',
                        onClick: () => {
                          playClickSound()
                          setEditingAward(null)
                          setAwardModalOpen(true)
                        },
                      })
                    }
                    if (politicsCount === 0) {
                      missingCareerAdds.push({
                        key: 'politics',
                        label: '당원 소속',
                        onClick: () => {
                          playClickSound()
                          politicsActionsRef.current?.openCreate()
                        },
                      })
                    }
                    if (missingCareerAdds.length === 0) return null
                    return (
                      <CareerFillInStrip
                        $isFirst={careerTabCount === 0}
                        aria-label="더 채울 수 있는 이력"
                      >
                        <CareerFillInTitle>
                          {careerTabCount === 0
                            ? '등록된 이력·활동이 없습니다 · 첫 이력을 추가해보세요'
                            : '더 채울 수 있는 이력'}
                        </CareerFillInTitle>
                        <CareerFillInChips>
                          {missingCareerAdds.map((item) => (
                            <CareerFillInChip
                              key={item.key}
                              type="button"
                              onClick={item.onClick}
                            >
                              <FiPlus size={12} />
                              {item.label}
                            </CareerFillInChip>
                          ))}
                        </CareerFillInChips>
                      </CareerFillInStrip>
                    )
                  })()}
                </OverviewSections>
              </TabContent>
            )}

            {activeTab === 'genealogy' && (
              <TabContent
                key="genealogy"
                role="tabpanel"
                id="person-detail-panel-genealogy"
                aria-labelledby="person-detail-tab-genealogy"
                as={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <section aria-label="가족 관계">
                  <SectionLabel>가족 관계</SectionLabel>
                  {!embedInModal && (
                    <FamilyActionRow>
                      <FamilyActionBtn type="button" onClick={() => setFamilyAddMode('child')}>
                        + 자녀 추가
                      </FamilyActionBtn>
                      <FamilyActionBtn
                        type="button"
                        aria-disabled={person.father ? true : undefined}
                        onClick={() =>
                          person.father
                            ? notify.error('이미 아버지가 지정되어 있습니다. 변경은 수정 모달에서 하세요.')
                            : setFamilyAddMode('father')
                        }
                        title={person.father ? '이미 아버지가 지정되어 있습니다' : undefined}
                      >
                        + 아버지 추가
                      </FamilyActionBtn>
                      <FamilyActionBtn
                        type="button"
                        aria-disabled={person.mother ? true : undefined}
                        onClick={() =>
                          person.mother
                            ? notify.error('이미 어머니가 지정되어 있습니다. 변경은 수정 모달에서 하세요.')
                            : setFamilyAddMode('mother')
                        }
                        title={person.mother ? '이미 어머니가 지정되어 있습니다' : undefined}
                      >
                        + 어머니 추가
                      </FamilyActionBtn>
                      <FamilyActionBtn type="button" onClick={() => setFamilyAddMode('spouse')}>
                        + 배우자 추가
                      </FamilyActionBtn>
                    </FamilyActionRow>
                  )}
                  {genealogyCount === 0 &&
                  (!familyTreeData || familyTreeData.nodes.length <= 1) ? (
                    <EmptyState>가족 정보가 없습니다</EmptyState>
                  ) : (
                    <PersonGenealogyInfographic
                      ego={person}
                      showHeader={false}
                      father={person.father}
                      mother={person.mother}
                      paternalGrandfather={person.father?.father}
                      paternalGrandmother={person.father?.mother}
                      maternalGrandfather={person.mother?.father}
                      maternalGrandmother={person.mother?.mother}
                      spouses={(person.spouseRelations ?? []).map((r: any) => r.spouse).filter(Boolean)}
                      siblings={person.siblings}
                      children={person.children}
                      familyTreeData={familyTreeData}
                      onPersonClick={
                        embedInModal
                          ? onLinkedPersonClick
                          : pushPersonToModalStack
                      }
                    />
                  )}
                  {familyModalConfig && (
                    <PersonSelectModal
                      persons={familyAddPool ?? []}
                      selectedPersonId=""
                      onSelect={(id, name) => applyFamilyLink(id, name)}
                      onClose={() => setFamilyAddMode(null)}
                      excludeIds={familyModalConfig.exclude.filter(Boolean)}
                      title={familyModalConfig.title}
                      searchPlaceholder="인물 검색…"
                      defaultCountryId={(person as { countryId?: string }).countryId || undefined}
                      allowCreate
                      onCreatedPerson={(created) =>
                        queryClient.setQueryData(
                          ['persons', 'pool-for-family-add'],
                          (old?: typeof familyAddPool) => (old ? [created, ...old] : old),
                        )
                      }
                      loading={familyAddPoolFetching}
                    />
                  )}
                </section>

                {/* 배우자 상세 — 혼인 기간·메모 */}
                <SpouseDetailSection
                  spouseRelations={p.spouseRelations}
                  isDeceased={isDeceased}
                  onPersonClick={handlePersonClick}
                />

                {/* 인간관계 */}
                {(!embedInModal || humanRelationshipsCount > 0) && (
                  <PersonHumanRelationshipsSection
                    personId={person.id}
                    relationships={
                      (
                        person as {
                          humanRelationships?: PersonHumanRelationshipItem[]
                        }
                      ).humanRelationships
                    }
                    onPersonClick={
                      embedInModal ? onLinkedPersonClick : pushPersonToModalStack
                    }
                  />
                )}

                {/* 소속 그룹 (세대·계파·동기) */}
                <SamePersonGroupSection
                  currentPersonId={person.id}
                  currentPersonName={getPersonDisplayName(person, true)}
                  readOnly={embedInModal}
                  onPersonClick={
                    embedInModal ? onLinkedPersonClick : pushPersonToModalStack
                  }
                />

                {person.dynasty?.id && person.dynasty?.name && (
                  <SameDynastyMembersSection
                    dynastyId={person.dynasty.id}
                    dynastyName={person.dynasty.name}
                    currentPersonId={person.id}
                    onPersonClick={
                      embedInModal
                        ? onLinkedPersonClick
                        : pushPersonToModalStack
                    }
                  />
                )}
              </TabContent>
            )}

            {activeTab === 'evaluation' && (
              <TabContent
                key="evaluation"
                role="tabpanel"
                id="person-detail-panel-evaluation"
                aria-labelledby="person-detail-tab-evaluation"
                as={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <OverviewSections>
                  {/* 1. 역사적 영향력 */}
                  {(!embedInModal || person.influence != null) && (
                    <section aria-label="역사적 영향력">
                      <OverviewSectionHeaderRow>
                        <OverviewSectionHeading>
                          <FiTrendingUp size={14} strokeWidth={2.2} />
                          <span>역사적 영향력</span>
                        </OverviewSectionHeading>
                        {!embedInModal && !editingInfluence && (
                          <OutlineButton
                            type="button"
                            onClick={() => {
                              setInfluenceDraft(person.influence ?? 0)
                              setEditingInfluence(true)
                            }}
                          >
                            {person.influence != null ? '수정' : '설정'}
                          </OutlineButton>
                        )}
                        {editingInfluence && (
                          <InlineActions>
                            <OutlineButton
                              type="button"
                              disabled={savingInfluence}
                              onClick={() => {
                                const nextInfluence = influenceDraft
                                setSavingInfluence(true)
                                startTransition(async () => {
                                  setOptimisticInfluence(nextInfluence)
                                  try {
                                    await updatePerson(person.id, {
                                      influence: nextInfluence,
                                    })
                                    await invalidatePersonCaches()
                                    setEditingInfluence(false)
                                    notify.success('영향력이 저장되었습니다.')
                                  } catch (err) {
                                    notify.error(
                                      err instanceof Error
                                        ? err.message
                                        : '영향력 저장에 실패했습니다.',
                                    )
                                  } finally {
                                    setSavingInfluence(false)
                                  }
                                })
                              }}
                            >
                              {savingInfluence ? '저장 중…' : '저장'}
                            </OutlineButton>
                            <OutlineButton
                              type="button"
                              disabled={savingInfluence}
                              onClick={() => setEditingInfluence(false)}
                            >
                              취소
                            </OutlineButton>
                          </InlineActions>
                        )}
                      </OverviewSectionHeaderRow>
                      {(() => {
                        if (!editingInfluence && person.influence == null) {
                          if (embedInModal) return null
                          return (
                            <InfluenceEmpty>
                              아직 영향력 평가가 없습니다. ‘설정’을 눌러 기록해 보세요.
                            </InfluenceEmpty>
                          )
                        }
                        const current = editingInfluence
                          ? influenceDraft
                          : optimisticInfluence
                        const currentTier = getInfluenceTier(current)
                        return (
                          <InfluenceBlock>
                            <InfluenceSliderRow>
                              {editingInfluence ? (
                                <InfluenceSliderInput
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={influenceDraft}
                                  onChange={(e) =>
                                    setInfluenceDraft(Number(e.target.value))
                                  }
                                  aria-valuenow={influenceDraft}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label="역사적 영향력"
                                />
                              ) : (
                                <InfluenceBar>
                                  <InfluenceFill
                                    $pct={current}
                                    $tier={currentTier}
                                  />
                                </InfluenceBar>
                              )}
                              <InfluenceValueGroup>
                                <InfluenceValue $tier={currentTier}>
                                  {current}
                                </InfluenceValue>
                                {currentTier && (
                                  <InfluenceTierLabel $tier={currentTier}>
                                    {getInfluenceTierLabel(currentTier)}
                                  </InfluenceTierLabel>
                                )}
                              </InfluenceValueGroup>
                            </InfluenceSliderRow>
                            <InfluenceAnchorRow>
                              {INFLUENCE_ANCHORS.map((a) => (
                                <InfluenceAnchor
                                  key={a.value}
                                  $active={current >= a.value}
                                  $tier={a.tier}
                                  style={{ left: `${a.value}%` }}
                                  title={
                                    a.tier
                                      ? `${a.value} 이상 — ${getInfluenceTierLabel(a.tier)}`
                                      : '영향력 없음'
                                  }
                                >
                                  <b>{a.value}</b>
                                  <span>{a.label}</span>
                                </InfluenceAnchor>
                              ))}
                            </InfluenceAnchorRow>
                          </InfluenceBlock>
                        )
                      })()}
                    </section>
                  )}

                  {/* 2. 능력치 · 성격 */}
                  <PersonStatsSection
                    personId={person.id}
                    personName={fullName}
                    readOnly={embedInModal}
                  />
                </OverviewSections>
              </TabContent>
            )}

            {activeTab === 'connections' && (
              <TabContent
                key="connections"
                role="tabpanel"
                id="person-detail-panel-connections"
                aria-labelledby="person-detail-tab-connections"
                as={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <OverviewSections>
                  <ConnectionsPanel
                    kind="person"
                    id={person.id}
                    onOpen={openConnection}
                    openableKinds={CONNECTION_MODAL_KINDS}
                  />
                </OverviewSections>
              </TabContent>
            )}



            {activeTab === 'events' && (
              <TabContent
                key="events"
                role="tabpanel"
                id="person-detail-panel-events"
                aria-labelledby="person-detail-tab-events"
                as={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <section aria-label="연보">
                  <SectionLabelRow>
                    <SectionLabel>연보 · 통합 타임라인</SectionLabel>
                    {!embedInModal && (
                      <UnifiedActionRow>
                        {/* 기록 비교 뷰 딥링크 — ?view=records&recordPersonIds=<id> */}
                        <TenureAddButton
                          type="button"
                          onClick={() => {
                            playClickSound()
                            navigate(pathKeys.personsTimelineRecords([personId]))
                          }}
                        >
                          <FiUsers size={14} />
                          다른 인물과 비교
                        </TenureAddButton>
                        {/* 사건 목록의 사건에 이 인물을 바로 잇는다 — 연보에 같은 일을 또 적지 않게 */}
                        <TenureAddButton
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setEventLinkModalOpen(true)
                          }}
                        >
                          <FiLink size={14} />
                          사건 연결
                        </TenureAddButton>
                        <TenureAddButton
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setEditingLifeEvent(null)
                            setLifeEventModalOpen(true)
                          }}
                        >
                          <FiPlus size={14} />
                          연보 추가
                        </TenureAddButton>
                      </UnifiedActionRow>
                    )}
                  </SectionLabelRow>
                  {lifeEventsError && (
                    <LifeEventsErrorNote role="alert">
                      연보를 불러오지 못했습니다. 아래 타임라인이 불완전할 수 있어요.
                      <PrimaryRetryBtn
                        type="button"
                        onClick={() =>
                          queryClient.invalidateQueries({
                            queryKey: ['person-life-events', personId],
                          })
                        }
                      >
                        다시 시도
                      </PrimaryRetryBtn>
                    </LifeEventsErrorNote>
                  )}
                  <PersonLifeTimelineInfographic
                    birthDate={
                      p.birthYear != null
                        ? `${String(p.birthYear).padStart(4, '0')}-${String(p.birthMonth ?? 1).padStart(2, '0')}-${String(p.birthDay ?? 1).padStart(2, '0')}`
                        : null
                    }
                    deathDate={
                      p.deathYear != null
                        ? `${String(p.deathYear).padStart(4, '0')}-${String(p.deathMonth ?? 1).padStart(2, '0')}-${String(p.deathDay ?? 1).padStart(2, '0')}`
                        : null
                    }
                    birthEra={p.birthEra ?? null}
                    deathEra={p.deathEra ?? null}
                    birthPlace={
                      p.birthCity?.name ??
                      p.birthAdminDivision?.name ??
                      p.birthPlaceText ??
                      null
                    }
                    deathType={p.deathType ?? null}
                    deathCause={p.deathCause ?? null}
                    deathNote={p.deathNote ?? null}
                    isAlive={p.isAlive ?? null}
                    reigns={timelineReigns}
                    tenures={timelineTenures}
                    careers={timelineCareers}
                    events={timelineEvents}
                    lifeEvents={lifeEvents}
                    father={timelineFather}
                    mother={timelineMother}
                    children={timelineChildren}
                    spouses={timelineSpouses}
                    siblings={timelineSiblings}
                    highlightedLifeEventId={highlightedLifeEventId}
                    onStartEditLife={(le) => {
                      setEditingLifeEvent(le)
                      setLifeEventModalOpen(true)
                    }}
                    onFamilyPersonClick={
                      embedInModal ? onLinkedPersonClick : pushPersonToModalStack
                    }
                    onAddLifeEvent={
                      !embedInModal
                        ? () => {
                            playClickSound()
                            setEditingLifeEvent(null)
                            setLifeEventModalOpen(true)
                          }
                        : undefined
                    }
                    onEventClick={(eventId) => {
                      // 페이지 직접 진입 대신 인라인 미리보기 모달 — 빠른 훑어보기 → 필요할 때만 상세로 이동
                      setViewingEventId(eventId)
                    }}
                  />
                </section>
              </TabContent>
            )}

          </AnimatePresence>
        </TabContentArea>
      </PanelRoot>

      <PersonEventLinkModal
        isOpen={eventLinkModalOpen}
        onClose={() => setEventLinkModalOpen(false)}
        personId={person.id}
        personName={getPersonDisplayName(person as unknown as PersonNameFields)}
      />
      <PersonLifeEventFormModal
        open={lifeEventModalOpen}
        personId={person.id}
        lifeEvent={editingLifeEvent}
        birthDate={person.birthDate ?? null}
        deathDate={person.deathDate ?? null}
        existingLifeEvents={lifeEvents}
        existingTenures={timelineTenures.map((t: any) => ({
          id: t.id,
          title: t.title ?? t.positionDefinition?.title ?? null,
          startDate: t.startDate ?? null,
          endDate: t.endDate ?? null,
        }))}
        existingReigns={timelineReigns.map((r: any) => ({
          id: r.id,
          title:
            r.regnalName ?? r.title ?? r.positionDefinition?.title ?? null,
          startDate: r.startDate ?? null,
          endDate: r.endDate ?? null,
        }))}
        onClose={() => {
          setLifeEventModalOpen(false)
          setEditingLifeEvent(null)
        }}
        onSuccess={(savedId) => {
          // savedId가 있고 모달이 닫히지 않은 경우(저장 후 추가 모드)는 건드리지 않음 — 모달 자체가 onClose 호출 안 함
          if (savedId) {
            setHighlightedLifeEventId(savedId)
            requestAnimationFrame(() => {
              window.setTimeout(() => setHighlightedLifeEventId(null), 1600)
            })
          }
        }}
      />

      <AwardRegisterModal
        open={awardModalOpen}
        personId={person.id}
        initialAward={editingAward}
        onClose={() => {
          setAwardModalOpen(false)
          setEditingAward(null)
        }}
      />

      <CareerRegisterModal
        open={careerModalOpen}
        personId={person.id}
        initialCareer={editingCareer}
        onClose={() => {
          setCareerModalOpen(false)
          setEditingCareer(null)
        }}
      />

      <EducationRegisterModal
        open={educationModalOpen}
        personId={person.id}
        initialEducation={editingEducation}
        onClose={() => {
          setEducationModalOpen(false)
          setEditingEducation(null)
        }}
      />

      <TenureRegisterPanel
        personId={person.id}
        defaultMonarchical={sovereignReignModalOpen}
        open={tenureModalOpen || sovereignReignModalOpen}
        onClose={() => {
          setTenureModalOpen(false)
          setEditingTenureId(null)
          setSovereignReignModalOpen(false)
          setEditingReignId(null)
        }}
        onSuccess={() => {
          setTenureModalOpen(false)
          setEditingTenureId(null)
          setSovereignReignModalOpen(false)
          setEditingReignId(null)
        }}
        tenureId={(editingTenureId ?? editingReignId) ?? undefined}
        initialCountryId={
          !(editingTenureId ?? editingReignId)
            ? (person as { countryId?: string }).countryId ||
              person.country?.id ||
              person.countryAffiliations?.[0]?.countryId ||
              person.countryAffiliations?.[0]?.country?.id ||
              undefined
            : undefined
        }
        initialHistoricalCountryId={
          !(editingTenureId ?? editingReignId)
            ? (person as { historicalCountryId?: string | null })
                .historicalCountryId ??
              person.historicalCountry?.id ??
              person.countryAffiliations?.[0]?.historicalCountryId ??
              person.countryAffiliations?.[0]?.historicalCountry?.id ??
              undefined
            : undefined
        }
      />

      <SelectModal
        isOpen={addKindChooserOpen}
        onClose={() => setAddKindChooserOpen(false)}
        title="추가할 기록 선택"
        options={[
          {
            value: 'reign',
            icon: '👑',
            label: '군주 재위',
            description: '국왕·황제·천황·쇼군 등 군주의 재위',
          },
          {
            value: 'tenure',
            icon: '🏛️',
            label: '관직 재임',
            description: '대통령·총리·장관·외교관 등 공직 임기',
          },
        ]}
        onSelect={(kind) => {
          setAddKindChooserOpen(false)
          playClickSound()
          if (kind === 'reign') {
            setEditingReignId(null)
            setSovereignReignModalOpen(true)
          } else {
            setEditingTenureId(null)
            setTenureModalOpen(true)
          }
        }}
      />

      <EventInlineModal
        eventId={viewingEventId}
        onClose={() => setViewingEventId(null)}
        onNavigate={(eventId) => navigate(pathKeys.events.detail(eventId))}
        personContext={
          viewingEventId ? personEventContextByEventId.get(viewingEventId) ?? null : null
        }
      />

      {/* 자녀 추가 후속 — 반대편 부모 지정 프롬프트(닫으면 건너뜀). 탭 조건 밖(패널
          최상위)에 렌더: updatePerson 대기 중 탭을 벗어나도 유령 재출현 없이 즉시 뜬다. */}
      {childOtherParent && (
        <PersonSelectModal
          persons={familyAddPool ?? []}
          pinnedIds={egoSpouseIdsForPin}
          selectedPersonId=""
          onSelect={(id) => applyChildOtherParent(id)}
          onClose={() => setChildOtherParent(null)}
          excludeIds={[childOtherParent.childId, person.id].filter(Boolean)}
          title={`${childOtherParent.childName}의 ${childOtherParent.slot === 'motherId' ? '어머니' : '아버지'}도 지정할까요? (닫으면 건너뜀)`}
          searchPlaceholder="인물 검색…"
          defaultCountryId={(person as { countryId?: string }).countryId || undefined}
          allowCreate
          onCreatedPerson={(created) =>
            queryClient.setQueryData(
              ['persons', 'pool-for-family-add'],
              (old?: typeof familyAddPool) => (old ? [created, ...old] : old),
            )
          }
          loading={!familyAddPool}
        />
      )}

      <AnimatePresence>
        {deleteConfirmOpen && (
          <DeleteConfirmOverlay
            key="delete-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !deletingPerson && setDeleteConfirmOpen(false)}
            role="presentation"
          >
            <DeleteConfirmDialog
              key="delete-confirm-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-confirm-title"
            >
              <DeleteConfirmIconWrap>
                <FiAlertTriangle size={28} strokeWidth={1.75} />
              </DeleteConfirmIconWrap>
              <DeleteConfirmTitle id="delete-confirm-title">인물 삭제</DeleteConfirmTitle>
              <DeleteConfirmPersonName>{fullName}</DeleteConfirmPersonName>
              <DeleteConfirmDesc>
                이 인물을 삭제하면 프로필 사진을 포함한 모든 데이터가 영구적으로 제거됩니다.
                <br />이 작업은 되돌릴 수 없습니다.
              </DeleteConfirmDesc>
              <DeleteConfirmActions>
                <DeleteConfirmCancelBtn
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deletingPerson}
                >
                  취소
                </DeleteConfirmCancelBtn>
                <DeleteConfirmDeleteBtn
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deletingPerson}
                  $loading={deletingPerson}
                >
                  {deletingPerson ? '삭제 중...' : '삭제'}
                </DeleteConfirmDeleteBtn>
              </DeleteConfirmActions>
            </DeleteConfirmDialog>
          </DeleteConfirmOverlay>
        )}
      </AnimatePresence>

      {/* 학력·경력·수상 단건 삭제 확인 */}
      <ConfirmDialog
        isOpen={!!entryDeleteTarget}
        title="항목 삭제"
        message={`'${entryDeleteTarget?.label ?? ''}' 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel={isEntryDeleting ? '삭제 중…' : '삭제'}
        cancelLabel="취소"
        danger
        onConfirm={handleEntryDeleteConfirm}
        onCancel={() => {
          if (!isEntryDeleting) setEntryDeleteTarget(null)
        }}
      />

      <AnimatePresence>
        {!embedInModal && personLinkStack.length > 0 && modalTopId && (
          <BioMentionModalOverlay
            key="bio-mention-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setPersonLinkStack([])}
            role="presentation"
          >
            <BioMentionModalPanel
              key={`bio-mention-${modalTopId}`}
              ref={bioMentionPanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="bio-mention-modal-title"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <BioMentionModalHeader>
                {personLinkStack.length > 1 && (
                  <BioMentionModalBack
                    type="button"
                    onClick={() =>
                      setPersonLinkStack((stack) => stack.slice(0, -1))
                    }
                    aria-label="이전 인물"
                  >
                    <FiArrowLeft size={18} strokeWidth={2.25} />
                    이전
                  </BioMentionModalBack>
                )}
                <BioMentionModalTitle
                  id="bio-mention-modal-title"
                  title={modalTopPersonName}
                >
                  {modalTopPersonName || '인물'}
                </BioMentionModalTitle>
                <BioMentionModalBack
                  type="button"
                  onClick={() => {
                    const targetId = modalTopId
                    setPersonLinkStack([])
                    onEdit(targetId)
                  }}
                  aria-label="인물 수정"
                >
                  <FiEdit2 size={14} strokeWidth={2.2} />
                  수정
                </BioMentionModalBack>
                {/*
                  인물 상세 페이지로 이동 — 현재 URL 컨텍스트(대시보드/단독 페이지 등) 유지.
                  buildDetailUrlFor가 현재 경로의 personId 세그먼트만 교체.
                  href는 접근성·우클릭 메뉴(새 탭 열기 등)용으로 유지.
                */}
                {(() => {
                  const targetUrl = buildDetailUrlFor(modalTopId)
                  return (
                    <BioMentionModalOpenDetail
                      href={targetUrl}
                      onClick={(e) => {
                        // Cmd/Ctrl·Shift·가운데 클릭은 브라우저 기본(새 탭/창) 동작 유지
                        if (
                          e.metaKey ||
                          e.ctrlKey ||
                          e.shiftKey ||
                          e.button !== 0
                        ) {
                          return
                        }
                        e.preventDefault()
                        setPersonLinkStack([])
                        navigate(targetUrl)
                      }}
                      aria-label="인물 상세 페이지로 이동"
                      title="인물 상세 페이지로 이동"
                    >
                      <FiExternalLink size={15} strokeWidth={2.2} />
                      <span>상세로 이동</span>
                    </BioMentionModalOpenDetail>
                  )
                })()}
                <BioMentionModalClose
                  type="button"
                  onClick={() => setPersonLinkStack([])}
                  aria-label="닫기"
                >
                  <FiX size={20} strokeWidth={2.5} />
                </BioMentionModalClose>
              </BioMentionModalHeader>
              <BioMentionModalBody>
                <PersonDetailPanel
                  personId={modalTopId}
                  onClose={() => setPersonLinkStack([])}
                  onEdit={(id) => {
                    setPersonLinkStack([])
                    onEdit(id)
                  }}
                  hideHeaderActions
                  embedInModal
                  onLinkedPersonClick={pushPersonToModalStack}
                />
              </BioMentionModalBody>
            </BioMentionModalPanel>
          </BioMentionModalOverlay>
        )}
      </AnimatePresence>

      {termTooltip && (
        <RichTextEntityTooltip
          x={termTooltip.x}
          y={termTooltip.y}
          eyebrow={termTooltip.name}
          eyebrowColor="#0d9488"
          description={termTooltip.description}
          onClose={() => setTermTooltip(null)}
          action={
            termTooltip.countryId
              ? {
                  label: '국가 보기 →',
                  onClick: () => {
                    const countryId = termTooltip.countryId
                    setTermTooltip(null)
                    if (countryId) navigate(pathKeys.countryDetail(countryId))
                  },
                }
              : null
          }
        />
      )}

      {dynastyTooltip && (
        <RichTextEntityTooltip
          x={dynastyTooltip.x}
          y={dynastyTooltip.y}
          eyebrow={`가문 · ${dynastyTooltip.name}`}
          eyebrowColor="#6366f1"
          description={dynastyTooltip.description}
          onClose={() => setDynastyTooltip(null)}
          action={{
            label: '가문 구성원 보기 →',
            onClick: () => {
              const { dynastyId, name } = dynastyTooltip
              setDynastyTooltip(null)
              setDynastyModal({ id: dynastyId, name })
            },
          }}
        />
      )}

      {/* 가문 한눈에 보기 — 가문 KPI·시조 가문 칩 클릭으로 열림(페이지 이동 대체) */}
      {dynastyModal && (
        <DynastyMembersInfographicModal
          dynastyId={dynastyModal.id}
          dynastyName={dynastyModal.name}
          isOpen
          onClose={() => setDynastyModal(null)}
        />
      )}
    </>
  )
}
