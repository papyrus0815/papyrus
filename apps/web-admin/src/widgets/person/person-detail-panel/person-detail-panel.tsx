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
  FiCalendar,
  FiCamera,
  FiEdit2,
  FiExternalLink,
  FiFileText,
  FiFlag,
  FiGitBranch,
  FiInfo,
  FiMapPin,
  FiPlus,
  FiTrash2,
  FiTrendingUp,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { personKeys } from '@/entities/person/api'
import type { PersonHumanRelationshipItem } from '@/shared/api/person-human-relationships'
import { personCareerApi } from '@/shared/api/person-career'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { deletePerson, updatePerson, getAllPersons } from '@/shared/api/persons'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
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

import { BirthDeathCards } from './birth-death-cards'
import { CollapsibleSection } from './collapsible-section'
import { PersonBiographySections } from './person-biography-sections'
import { SpouseDetailSection } from './spouse-detail-section'
import { TenureReignList } from './tenure-reign-list'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { InfluenceBadge } from '@/shared/ui/influence-badge'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { SovereignReignRegisterPanel } from '@/shared/ui/sovereign-reign-register-panel/sovereign-reign-register-panel'
import { notify } from '@/shared/ui/toast'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'
import { AwardRegisterModal } from '@/widgets/person/award-register-modal/award-register-modal'
import { CareerRegisterModal } from '@/widgets/person/career-register-modal/career-register-modal'
import { PersonLifeEventFormModal } from '@/widgets/person/person-life-event-form-modal/person-life-event-form-modal'
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
} from '@/widgets/person/person-politics-section/person-politics-section'

import {
  ActivityGroup,
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
  ErrorDesc,
  ErrorIcon,
  ErrorTitle,
  ErrorWrap,
  FamilyActionRow,
  FamilyActionBtn,
  FamilyBadge,
  FamilyBadgeRow,
  FoundedDynastyChip,
  FoundedDynastyRow,
  HeaderActions,
  HeaderLeft,
  HeaderRow,
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
  OverviewClusterLabel,
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
  SimpleEntryDeleteBtn,
  SimpleEntryDescription,
  SimpleEntryHeader,
  SimpleEntryItem,
  SimpleEntryList,
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
  UnifiedActionRow,
} from './person-detail-panel.styles'

import type {
  CombinedTenureItem,
  PersonDetailData,
  TabType,
  TenureLikeRecord,
} from './types'
import {
  formatDateKo,
  formatIsoDateKo,
  formatPeriod,
  isoDateSortKey,
  isoDateToApproxDays,
  pickGovernmentTenures,
} from './helpers'
import { deriveContemporaryHeadsTarget } from './contemporary-heads-target'
import { ContemporariesStrip } from './contemporaries-strip'

interface PersonDetailPanelProps {
  personId: string
  onClose: () => void
  onEdit: (id: string) => void
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

export function PersonDetailPanel({
  personId,
  onClose,
  onEdit,
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
   * - 대시보드(/history/dashboard/persons/:id) / 단독(/persons/:id/) 등 어느 컨텍스트에서든
   *   "사이드바·브레드크럼 그대로 유지하며 인물만 교체"되는 쪽으로 이동.
   * - 현재 personId 세그먼트가 URL에 없으면 기본(/persons/:id/)로 폴백.
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
      return `/persons/${encodeURIComponent(targetId)}/`
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
    return raw === 'overview' ||
      raw === 'genealogy' ||
      raw === 'politics' ||
      raw === 'events'
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
          params.set('tab', next)
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
  const [tenureModalOpen, setTenureModalOpen] = useState(false)
  const [editingTenureId, setEditingTenureId] = useState<string | null>(null)
  const [sovereignReignModalOpen, setSovereignReignModalOpen] = useState(false)
  const [editingReignId, setEditingReignId] = useState<string | null>(null)
  const [lifeEventModalOpen, setLifeEventModalOpen] = useState(false)
  const [editingLifeEvent, setEditingLifeEvent] = useState<PersonLifeEvent | null>(null)
  const [awardModalOpen, setAwardModalOpen] = useState(false)
  const [careerModalOpen, setCareerModalOpen] = useState(false)
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
  /** 학력·경력·수상 단건 삭제 대상 (null이면 다이얼로그 닫힘) */
  const [entryDeleteTarget, setEntryDeleteTarget] = useState<{
    kind: 'education' | 'award' | 'career'
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

  const { data: familyTreeData } = useQuery({
    queryKey: ['person-family-tree', personId],
    queryFn: () => getPersonFamilyTree(personId),
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: lifeEvents = [] } = useQuery({
    queryKey: ['person-life-events', personId],
    queryFn: () => listPersonLifeEvents(personId),
    enabled: !!personId,
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
    return list.map((r) => {
      const sp = r.spouse ?? r
      return {
        id: sp.id,
        name: getPersonDisplayName(sp, true),
        birthDate: sp.birthDate ? String(sp.birthDate) : null,
        deathDate: sp.deathDate ? String(sp.deathDate) : null,
        marriageStartDate: r.marriageStartDate ?? null,
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
    // 표시용 대(ordinal): 재위는 regnalNumber 우선, 재임은 termNumber 우선
    const ordinalOf = (it: { kind: 'tenure' | 'reign'; data: TenureLikeRecord }) =>
      it.kind === 'reign'
        ? it.data.regnalNumber ?? it.data.termNumber ?? null
        : it.data.termNumber ?? it.data.regnalNumber ?? null
    // 같은 종류·같은 대(ordinal)에 2건 이상이면 연임으로 카운트
    const termCounts = new Map<string, number>()
    for (const it of base) {
      const ord = ordinalOf(it)
      if (ord == null) continue
      const key = `${it.kind}:${ord}`
      termCounts.set(key, (termCounts.get(key) ?? 0) + 1)
    }
    const items: CombinedTenureItem[] = base.map((it) => {
      const ord = ordinalOf(it)
      const sub = it.data.subTermNumber
      // 연임 신호: 본인 회차(subTermNumber)가 2 이상이거나, 같은 대가 2건 이상.
      // subTermNumber 를 함께 보므로 ordinal 이 없어도 연임을 잡아낸다.
      const isReappointment =
        (sub != null && sub >= 2) ||
        (ord != null && (termCounts.get(`${it.kind}:${ord}`) ?? 0) >= 2)
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
   * 재임·재위 총 연수 (KPI). 군주 겸 수반 등 구간이 겹칠 수 있어 interval 병합 후
   * 합산 — 이중계산 방지. 0 이하이면 null.
   */
  const tenureTotalYears = useMemo(() => {
    const all = combinedTenures.items
    if (all.length === 0) return null
    // BC·고대 안전: ms 타임스탬프 대신 부호 있는 근사 일수로 구간을 표현한다.
    const now = isoDateToApproxDays(new Date().toISOString()) ?? 0
    const intervals = all
      .map(({ data }) => {
        const s = isoDateToApproxDays(data.startDate)
        if (s == null) return null
        const e = isoDateToApproxDays(data.endDate) ?? now
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

  /** KPI 배우자 목록 — spouseRelations 우선, 없으면 spouse 단건 폴백 */
  const kpiSpouses = useMemo(() => {
    const rels = (person?.spouseRelations ?? []) as NonNullable<
      PersonDetailData['spouseRelations']
    >
    return rels
      .map((r) => {
        const sp = r.spouse ?? null
        return {
          id: sp?.id as string | undefined,
          name: sp ? getPersonDisplayName(sp, true) : '',
        }
      })
      .filter((s) => s.name && s.name !== '이름 없음')
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

  const pushPersonToModalStack = useCallback((id: string) => {
    setPersonLinkStack((prev) => {
      // 같은 인물을 연속으로 열면 중복 push 방지, 스택이 과도하게 깊어지지
      // 않도록 최근 12단계로 상한(메모리·UX 안전장치).
      if (prev[prev.length - 1] === id) return prev
      const next = [...prev, id]
      return next.length > 12 ? next.slice(next.length - 12) : next
    })
  }, [])

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

  /** 인물 관련 모든 쿼리 캐시 무효화 (아바타 변경·삭제·수정 후 공통 호출) */
  const invalidatePersonCaches = useCallback(
    (withDetail = true) =>
      Promise.all([
        ...(withDetail
          ? [queryClient.invalidateQueries({ queryKey: ['persons', personId] })]
          : []),
        // 모달 스택의 부모 패널 등 다른 personId 상세에도 가족 노드(profileImageUrl 등)가
        // 박혀 있으므로 person-detail / family-tree 는 항상 broad invalidate.
        // 사건 상세의 참여 행위자 리스트도 event-detail 응답에 person.profileImageUrl을
        // 박아 두므로 함께 무효화해야 썸네일 변경이 즉시 반영된다.
        queryClient.invalidateQueries({ queryKey: ['person-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['person-family-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['event-detail'] }),
        queryClient.invalidateQueries({ queryKey: personKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['persons-by-country'] }),
        queryClient.invalidateQueries({ queryKey: ['persons-by-dynasty'] }),
        queryClient.invalidateQueries({ queryKey: ['persons-by-tenure-country'] }),
        // 동시대 수장 스트립 — 서버 유도 창이 대상의 사망 연도로 캡되므로
        // 인물(생몰) 수정 후에도 신선해야 한다 (재임 수정은 invalidateTenureQueries가 담당)
        queryClient.invalidateQueries({ queryKey: ['person-contemporaries'] }),
      ]),
    [personId, queryClient],
  )

  // ─── 가계도 하향 저작 — ego 기준 자녀/부모/배우자 추가·기존 인물 연결 ──────────
  const [familyAddMode, setFamilyAddMode] = useState<
    'child' | 'father' | 'mother' | 'spouse' | null
  >(null)
  /** 모달 열릴 때만 인물 풀 로드(검색 + "새 인물" 생성 대상). */
  const { data: familyAddPool } = useQuery({
    queryKey: ['persons-pool-for-family-add'],
    queryFn: getAllPersons,
    enabled: familyAddMode !== null,
    staleTime: 60_000,
  })

  /**
   * 선택/생성한 인물을 ego와 연결하는 FK write.
   * - child : 대상 인물의 fatherId/motherId(ego 성별) = ego
   * - father/mother : ego의 fatherId/motherId = 대상 인물
   * - spouse : ego.spouseRelations에 대상 인물 추가(기존 관계 보존, 서버가 canonical 정규화)
   */
  const applyFamilyLink = useCallback(
    async (targetId: string) => {
      const currentPerson = person
      const mode = familyAddMode
      if (!currentPerson || !mode || targetId === currentPerson.id) {
        setFamilyAddMode(null)
        return
      }
      try {
        if (mode === 'child') {
          // ego 성별로 자녀의 부/모 슬롯 결정(불명이면 아버지 기본, 이후 수정 가능)
          await updatePerson(
            targetId,
            currentPerson.gender === 'FEMALE'
              ? { motherId: currentPerson.id }
              : { fatherId: currentPerson.id },
          )
        } else if (mode === 'father') {
          await updatePerson(currentPerson.id, { fatherId: targetId })
        } else if (mode === 'mother') {
          await updatePerson(currentPerson.id, { motherId: targetId })
        } else if (mode === 'spouse') {
          // 기존 배우자 관계 보존 후 추가(update는 통째 교체 → 전체 배열 재전송).
          const existing = (currentPerson.spouseRelations ?? []).flatMap((rel) =>
            rel.spouse?.id
              ? [
                  {
                    spouseId: rel.spouse.id,
                    marriageStartDate: rel.marriageStartDate ?? undefined,
                    marriageEndDate: rel.marriageEndDate ?? undefined,
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
      } catch {
        notify.error('가족 관계 추가에 실패했습니다.')
      } finally {
        setFamilyAddMode(null)
      }
    },
    [person, familyAddMode, invalidatePersonCaches],
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
          const byMode = {
            child: { title: '자녀로 추가할 인물', exclude: [selfId] },
            father: { title: '아버지로 지정할 인물', exclude: [selfId, motherId, ...spouseIds] },
            mother: { title: '어머니로 지정할 인물', exclude: [selfId, fatherId, ...spouseIds] },
            spouse: {
              title: '배우자로 추가할 인물',
              exclude: [selfId, fatherId, motherId, ...spouseIds],
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

  /** 학력·경력·수상 단건 삭제 확정 */
  const handleEntryDeleteConfirm = useCallback(async () => {
    if (!entryDeleteTarget) return
    setIsEntryDeleting(true)
    try {
      if (entryDeleteTarget.kind === 'education') {
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
    return (
      <PanelRoot>
        <ErrorWrap>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle>인물을 찾을 수 없습니다</ErrorTitle>
          <ErrorDesc>목록에서 다시 선택해 주세요.</ErrorDesc>
          <CloseBtn type="button" onClick={onClose}>
            닫기
          </CloseBtn>
        </ErrorWrap>
      </PanelRoot>
    )
  }

  // API가 any를 반환하므로 정의된 타입으로 단일 캐스팅
  const p = person as unknown as PersonDetailData
  const fullName = getPersonDisplayName(p)

  // 군주 등록 여부 및 군주명 — SovereignReign.regnalName 정식 필드 우선
  const firstReign = p.sovereignReigns?.[0]
  const monarchName =
    p.templeName ||
    p.regnalName ||
    firstReign?.regnalName ||
    null
  const monarchPositionTitle =
    firstReign?.positionDefinition?.title || null

  const isDeceased = p.deathYear != null
  const currentYear = new Date().getFullYear()
  const ageAtDeath =
    isDeceased && p.birthYear != null && p.deathYear != null
      ? p.deathYear - p.birthYear
      : null
  const currentAge =
    !isDeceased && p.birthYear != null && p.birthEra !== 'BC'
      ? currentYear - p.birthYear
      : null

  /** 이름 밑: 년월일~년월일 (출생~사망 또는 출생~생존) */
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
  const rangeStr = [birthDateStr, deathDateStr].filter(Boolean).join(' ~ ')
  const subtitleLifespan = isDeceased
    ? rangeStr
      ? rangeStr + (ageAtDeath != null ? `(향년 ${ageAtDeath}세)` : '')
      : '생몰년 미상'
    : birthDateStr
      ? `${birthDateStr} ~ 생존${currentAge != null ? ` (${currentAge}세)` : ''}`
      : currentAge != null
        ? `생존 (${currentAge}세)`
        : '생존'

  const genderLabel =
    p.gender === 'MALE' ? '남' : p.gender === 'FEMALE' ? '여' : (p.gender ?? '—')

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
        as={motion.div}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* 상단 네비바: 목록으로 버튼(좌) + 수정 버튼(우) */}
        {!hideHeaderActions && (
          <TopNavBar>
            <BackToListButton
              type="button"
              onClick={() => {
                playClickSound()
                onClose()
              }}
            >
              <FiArrowLeft size={14} />
              {backLabel}
            </BackToListButton>
            <HeaderActions>
              <OutlineButton
                type="button"
                onClick={() => {
                  playClickSound()
                  onEdit(person.id)
                }}
              >
                <FiEdit2 size={13} />
                수정
              </OutlineButton>
              <DeleteButton
                type="button"
                onClick={() => {
                  playClickSound()
                  setDeleteConfirmOpen(true)
                }}
              >
                <FiTrash2 size={13} />
                삭제
              </DeleteButton>
            </HeaderActions>
          </TopNavBar>
        )}

        {/* 헤더: 썸네일 + 이름 */}
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
              aria-label="프로필 사진 변경"
              onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
            >
              {person.profileImageUrl ? (
                <img
                  src={
                    getUploadImageUrl(person.profileImageUrl) ||
                    person.profileImageUrl
                  }
                  alt={fullName}
                />
              ) : (
                <FiUsers size={24} aria-hidden />
              )}
              <AvatarOverlay aria-hidden>
                {uploadingAvatar ? (
                  <AvatarSpinner />
                ) : (
                  <FiCamera size={20} strokeWidth={2} />
                )}
              </AvatarOverlay>
            </AvatarButton>
            <HeaderTitleBlock>
              <PageTitleRow>
                <PageTitle>{fullName}</PageTitle>
              </PageTitleRow>
              {p.country?.name && (
                <DetailCountryRow
                  as="button"
                  type="button"
                  onClick={() => {
                    if (!p.country?.id) return
                    playClickSound()
                    navigate(pathKeys.countryDetail(p.country.id))
                  }}
                >
                  {countryFlagSrc ? (
                    <CountryFlagImg src={countryFlagSrc} alt="" aria-hidden />
                  ) : p.country?.flagEmoji ? (
                    <DetailCountryFlagEmoji>{p.country.flagEmoji}</DetailCountryFlagEmoji>
                  ) : null}
                  <DetailCountryName>{p.country.name}</DetailCountryName>
                </DetailCountryRow>
              )}
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
                  p.preEnthronementTitle ||
                  p.posthumousName
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
                    {p.preEnthronementTitle && (
                      <NameMetaRow>
                        <NameMetaLabel>작호</NameMetaLabel>
                        <NameMetaValue>{p.preEnthronementTitle}</NameMetaValue>
                      </NameMetaRow>
                    )}
                    {p.posthumousName && (
                      <NameMetaRow>
                        <NameMetaLabel>시호</NameMetaLabel>
                        <NameMetaValue>{p.posthumousName}</NameMetaValue>
                      </NameMetaRow>
                    )}
                  </NameMetaBlock>
                )
              })()}
              {p.nicknames && p.nicknames.length > 0 && (() => {
                const sorted = [...p.nicknames].sort(
                  (a, b) => (a.priority ?? 999) - (b.priority ?? 999),
                )
                return (
                  <NicknameRow>
                    {sorted.map((n, i) => (
                      <NicknameChip
                        key={n.id ?? n.nickname ?? `nickname-${i}`}
                        title={n.reason || undefined}
                      >
                        {n.type && <NicknameType>{n.type}</NicknameType>}
                        <NicknameValue>{n.nickname}</NicknameValue>
                        {n.reason && <NicknameReason>{n.reason}</NicknameReason>}
                      </NicknameChip>
                    ))}
                  </NicknameRow>
                )
              })()}
              {registeredAtLabel && (
                <RegisteredByline>등록 {registeredAtLabel}</RegisteredByline>
              )}
              {(() => {
                // 가족 구성 요약 뱃지 (부/모/배우자/자녀 수)
                const badges: Array<{ key: string; label: string; personId?: string; title?: string }> = []
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
                  })
                const childrenCount =
                  (person.children ?? []).length ?? 0
                if (childrenCount > 0)
                  badges.push({
                    key: 'children',
                    label: `자녀 ${childrenCount}`,
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
                    title: hasFkData && parts.length > 0 ? parts.join(' · ') : undefined,
                  })
                }
                if (badges.length === 0) return null
                return (
                  <FamilyBadgeRow>
                    {badges.map((badgeItem) =>
                      badgeItem.personId ? (
                        <FamilyBadge
                          key={badgeItem.key}
                          as="button"
                          type="button"
                          style={{ cursor: 'pointer' }}
                          title={badgeItem.title}
                          onClick={() => handlePersonClick(badgeItem.personId!)}
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
                      ),
                    )}
                  </FamilyBadgeRow>
                )
              })()}
            </HeaderTitleBlock>
          </HeaderLeft>
        </HeaderRow>

        {/* 기본정보 + 요약: 생몰·국가·성별·가문·종교·배우자·저작·정부직위·사건·조직 */}
        <KpiStrip $compact={embedInModal}>
          {person.country && (
            <KpiItem>
              <KpiLabel>국가</KpiLabel>
              <KpiValue>
                <KpiLink
                  type="button"
                  onClick={() => {
                    if (!person.country?.id) return
                    playClickSound()
                    navigate(pathKeys.countryDetail(person.country.id))
                  }}
                >
                  {person.country.name}
                </KpiLink>
              </KpiValue>
            </KpiItem>
          )}
          {(person.gender === 'MALE' || person.gender === 'FEMALE') && (
            <KpiItem>
              <KpiLabel>성별</KpiLabel>
              <KpiValue>{genderLabel}</KpiValue>
            </KpiItem>
          )}
          {(() => {
            if (p.birthYear == null) return null
            const span = isDeceased
              ? ageAtDeath != null
                ? `${ageAtDeath}년`
                : null
              : currentAge != null
                ? `${currentAge}년 (생존 중)`
                : null
            if (!span) return null
            return (
              <KpiItem>
                <KpiLabel>생존 기간</KpiLabel>
                <KpiValue>{span}</KpiValue>
              </KpiItem>
            )
          })()}
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
                    ? kpiSpouses.map((s, i) => (
                        <span key={s.id ?? `spouse-${i}`}>
                          {i > 0 && ' · '}
                          {s.id ? (
                            <KpiLink
                              type="button"
                              onClick={() => handlePersonClick(s.id!)}
                            >
                              {s.name}
                            </KpiLink>
                          ) : (
                            s.name
                          )}
                        </span>
                      ))
                    : fallbackName}
                </KpiValue>
              </KpiItem>
            )
          })()}
        </KpiStrip>

        {/* 탭 네비게이션 */}
        <TabNav role="tablist" aria-label="인물 상세 구역">
          <TabBtn
            type="button"
            role="tab"
            id="person-detail-tab-overview"
            aria-selected={activeTab === 'overview'}
            $active={activeTab === 'overview'}
            onClick={() => {
              playClickSound()
              handleTabChange('overview')
            }}
          >
            <FiInfo size={14} />
            개요
          </TabBtn>
          <TabBtn
            type="button"
            role="tab"
            id="person-detail-tab-genealogy"
            aria-selected={activeTab === 'genealogy'}
            $active={activeTab === 'genealogy'}
            onClick={() => {
              playClickSound()
              handleTabChange('genealogy')
            }}
          >
            <FiUsers size={14} />
            가계도
          </TabBtn>
          <TabBtn
            type="button"
            role="tab"
            id="person-detail-tab-politics"
            aria-selected={activeTab === 'politics'}
            $active={activeTab === 'politics'}
            onClick={() => {
              playClickSound()
              handleTabChange('politics')
            }}
          >
            <FiFlag size={14} />
            정치·선거
          </TabBtn>
          <TabBtn
            type="button"
            role="tab"
            id="person-detail-tab-events"
            aria-selected={activeTab === 'events'}
            $active={activeTab === 'events'}
            onClick={() => {
              playClickSound()
              handleTabChange('events')
            }}
          >
            <FiCalendar size={14} />
            연보
          </TabBtn>
        </TabNav>

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
                  {/* ── 클러스터 ① 생애·요약 ── */}
                  <OverviewClusterLabel>생애·요약</OverviewClusterLabel>

                  {/* 1. 전기 — 가장 중요한 서술 정보 */}
                  <section aria-label="전기">
                    <OverviewSectionHeaderRow>
                      <OverviewSectionHeading>
                        <FiBookOpen size={14} strokeWidth={2.2} />
                        <span>전기</span>
                      </OverviewSectionHeading>
                    </OverviewSectionHeaderRow>
                    <PersonBiographySections
                      personId={person.id}
                      sections={p.biographySections ?? undefined}
                      legacyBiography={person.biography}
                      onPersonClick={
                        embedInModal
                          ? (id) => onLinkedPersonClick?.(id)
                          : pushPersonToModalStack
                      }
                      setTermTooltip={setTermTooltip}
                      setDynastyTooltip={setDynastyTooltip}
                    />
                  </section>

                  {/* 2. 역사적 영향력 */}
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
                                // 낙관적 반영(트랜지션 내부에서만 허용) — 즉시 새 값 표시
                                setOptimisticInfluence(nextInfluence)
                                try {
                                  await updatePerson(person.id, {
                                    influence: nextInfluence,
                                  })
                                  // 영향력은 목록·인포그래픽·가문 그리드에도 박혀 있어
                                  // detail만이 아니라 넓게 무효화한다. await로 refetch 착지까지
                                  // 트랜지션을 pending 유지 → 낙관값이 옛 base로 되돌아가는
                                  // 깜빡임(새값→옛값→새값) 없이 새 base로 매끄럽게 수렴.
                                  await invalidatePersonCaches()
                                  // 성공 시에만 편집 모드 종료 — 실패하면 편집 모드·
                                  // influenceDraft를 그대로 유지해 즉시 재시도 가능.
                                  setEditingInfluence(false)
                                  notify.success('영향력이 저장되었습니다.')
                                } catch (err) {
                                  // 편집 모드 유지(닫지 않음). 낙관적 값은 트랜지션
                                  // 종료 후 base(person.influence)로 자연 수렴.
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

                  {/* 2.5. 능력치 · 성격 — 영향력과 같은 0–100 평가 메트릭 클러스터 */}
                  <PersonStatsSection personId={person.id} personName={fullName} />

                  {/* 2.55. 출생 / 사망 카드 — 좌우 분리. 장소 + 일자 + 사망정보를 함께 묶음 */}
                  <BirthDeathCards
                    person={p}
                    birthDateStr={birthDateStr}
                    deathDateStr={deathDateStr}
                    ageAtDeath={ageAtDeath}
                  />

                  {/* ── 클러스터 ② 이력·활동 ── */}
                  <OverviewClusterLabel>이력·활동</OverviewClusterLabel>

                  {/* 3. 재임·재위 통합 */}
                  <section aria-label="재임·재위">
                    <OverviewSectionHeaderRow>
                      <OverviewSectionHeading>
                        <FiAward size={14} strokeWidth={2.2} />
                        <span>재임·재위</span>
                        {combinedTenures.count > 0 && (
                          <CountMuted>{combinedTenures.count}</CountMuted>
                        )}
                      </OverviewSectionHeading>
                      {!embedInModal && (
                        <UnifiedActionRow>
                          <TenureAddButton
                            type="button"
                            onClick={() => {
                              playClickSound()
                              setEditingTenureId(null)
                              setTenureModalOpen(true)
                            }}
                          >
                            <FiPlus size={12} />
                            재임
                          </TenureAddButton>
                          <TenureAddButton
                            type="button"
                            onClick={() => {
                              playClickSound()
                              setEditingReignId(null)
                              setSovereignReignModalOpen(true)
                            }}
                          >
                            <FiPlus size={12} />
                            재위
                          </TenureAddButton>
                        </UnifiedActionRow>
                      )}
                    </OverviewSectionHeaderRow>
                    <TenureReignList
                      items={combinedTenures.items}
                      birthYear={person.birthYear}
                      birthMonth={person.birthMonth}
                      birthDay={person.birthDay}
                      deathDateStr={deathDateStr}
                      isDeceased={isDeceased}
                      embedInModal={embedInModal}
                      dynastyName={person.dynasty?.name ?? null}
                      currentPersonId={personId}
                      onPersonClick={handlePersonClick}
                      onPlayClick={playClickSound}
                      onEditTenure={(id) => {
                        setEditingTenureId(id)
                        setTenureModalOpen(true)
                      }}
                      onEditReign={(id) => {
                        setEditingReignId(id)
                        setSovereignReignModalOpen(true)
                      }}
                      onAchievementChanged={() => {
                        // 업적은 행정부·수장 비교 화면에도 박혀 있어 함께 무효화
                        invalidateTenureQueries(queryClient, { personId })
                      }}
                    />
                    {/* 동시대 수장 — 클릭 0회 발견 스트립. 수장비교 딥링크 CTA는
                        헤더에서 이곳(스트립 헤더)으로 이관 (검토서 §3 2단계) */}
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

                  <TenureRegisterPanel
                    personId={person.id}
                    open={tenureModalOpen}
                    onClose={() => {
                      setTenureModalOpen(false)
                      setEditingTenureId(null)
                    }}
                    onSuccess={() => {
                      setTenureModalOpen(false)
                      setEditingTenureId(null)
                    }}
                    tenureId={editingTenureId ?? undefined}
                  />
                  <SovereignReignRegisterPanel
                    personId={person.id}
                    open={sovereignReignModalOpen}
                    onClose={() => {
                      setSovereignReignModalOpen(false)
                      setEditingReignId(null)
                    }}
                    onSuccess={() => {
                      setSovereignReignModalOpen(false)
                      setEditingReignId(null)
                    }}
                    reignId={editingReignId}
                  />

                  {/* 3.35. 분야별 경력 */}
                  {(!embedInModal || (p.careers && p.careers.length > 0)) && (() => {
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
                        storageKey="careers"
                        ariaLabel="분야별 경력"
                        icon={<FiBriefcase size={14} strokeWidth={2.2} />}
                        title="분야별 경력"
                        count={careers.length > 0 ? careers.length : undefined}
                        defaultOpen={false}
                        actions={
                          !embedInModal && (
                            <UnifiedActionRow>
                              <TenureAddButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
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
                        {careers.length === 0 ? (
                          <TenureEmpty>
                            등록된 경력이 없습니다. 위 <strong>경력 버튼</strong>으로
                            추가하세요.
                          </TenureEmpty>
                        ) : (
                        <ActivityGroupList>
                          {kinds.map((k) => {
                            const list = grouped[k] ?? []
                            const sorted = list.slice().sort((a, b) => {
                              // BC/고대 안전 정렬(new Date 금지) — 날짜 없으면 맨 뒤.
                              const ta = a.startDate
                                ? isoDateSortKey(a.startDate)
                                : Number.NEGATIVE_INFINITY
                              const tb = b.startDate
                                ? isoDateSortKey(b.startDate)
                                : Number.NEGATIVE_INFINITY
                              return tb - ta
                            })
                            return (
                              <ActivityGroup key={k}>
                                <ActivityGroupTitle>
                                  {KIND_LABELS[k] ?? k} {list.length}
                                </ActivityGroupTitle>
                                <SimpleEntryList>
                                  {sorted.map((c, cIdx) => {
                                    const start = formatIsoDateKo(c.startDate)
                                    const end = formatIsoDateKo(c.endDate)
                                    const period =
                                      formatPeriod(start, end)
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
                                        )}
                                        <SimpleEntryHeader>
                                          <SimpleEntryTitle>
                                            {titleBits[0] ?? '미상'}
                                          </SimpleEntryTitle>
                                          {titleBits.slice(1).map((t, i) => (
                                            <SimpleEntryRole key={`role-${i}`}>{t}</SimpleEntryRole>
                                          ))}
                                        </SimpleEntryHeader>
                                        {subBits.length > 0 && (
                                          <SimpleEntryPeriod>{subBits.join(' · ')}</SimpleEntryPeriod>
                                        )}
                                        {period && (
                                          <SimpleEntryPeriod>{period}</SimpleEntryPeriod>
                                        )}
                                        {c.notes && (
                                          <SimpleEntryDescription>{c.notes}</SimpleEntryDescription>
                                        )}
                                      </SimpleEntryItem>
                                    )
                                  })}
                                </SimpleEntryList>
                              </ActivityGroup>
                            )
                          })}
                        </ActivityGroupList>
                        )}
                      </CollapsibleSection>
                    )
                  })()}

                  {/* 3.3. 학력 */}
                  {p.educations && p.educations.length > 0 && (
                    <CollapsibleSection
                      storageKey="education"
                      ariaLabel="학력"
                      icon={<FiBook size={14} strokeWidth={2.2} />}
                      title="학력"
                      count={p.educations.length}
                      defaultOpen={false}
                    >
                      <SimpleEntryList>
                        {p.educations
                          .slice()
                          .sort((a, b) => {
                            // BC/고대 안전 정렬(new Date 금지, isoDateSortKey) — 날짜 없으면 맨 뒤.
                            const ta = a.startDate
                              ? isoDateSortKey(a.startDate)
                              : Number.NEGATIVE_INFINITY
                            const tb = b.startDate
                              ? isoDateSortKey(b.startDate)
                              : Number.NEGATIVE_INFINITY
                            return tb - ta
                          })
                          .map((e, eduIdx) => {
                            const start = formatIsoDateKo(e.startDate)
                            const end = formatIsoDateKo(e.endDate)
                            const period =
                              formatPeriod(start, end, '재학중')
                            const subParts = [
                              e.major,
                              e.department,
                              e.classNumber != null ? `${e.classNumber}기` : null,
                              e.degree,
                            ].filter(Boolean) as string[]
                            return (
                              <SimpleEntryItem key={e.id ?? `edu-${eduIdx}`}>
                                {!embedInModal && e.id && (
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
                                )}
                                <SimpleEntryHeader>
                                  <SimpleEntryTitle>
                                    {e.organization?.name ?? '학교 미상'}
                                  </SimpleEntryTitle>
                                  {e.status && (
                                    <SimpleEntryRole>{e.status}</SimpleEntryRole>
                                  )}
                                </SimpleEntryHeader>
                                {subParts.length > 0 && (
                                  <SimpleEntryPeriod>
                                    {subParts.join(' · ')}
                                  </SimpleEntryPeriod>
                                )}
                                {period && (
                                  <SimpleEntryPeriod>{period}</SimpleEntryPeriod>
                                )}
                                {e.notes && (
                                  <SimpleEntryDescription>{e.notes}</SimpleEntryDescription>
                                )}
                              </SimpleEntryItem>
                            )
                          })}
                      </SimpleEntryList>
                    </CollapsibleSection>
                  )}

                  {/* 3.4. 수상·훈장 */}
                  {(!embedInModal || (p.awards && p.awards.length > 0)) && (
                    <CollapsibleSection
                      storageKey="awards"
                      ariaLabel="수상·훈장"
                      icon={<FiAward size={14} strokeWidth={2.2} />}
                      title="수상·훈장"
                      count={
                        p.awards && p.awards.length > 0 ? p.awards.length : undefined
                      }
                      defaultOpen={false}
                      actions={
                        !embedInModal && (
                          <UnifiedActionRow>
                            <TenureAddButton
                              type="button"
                              onClick={() => {
                                playClickSound()
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
                      {!p.awards || p.awards.length === 0 ? (
                        <TenureEmpty>
                          등록된 수상·훈장이 없습니다. 위{' '}
                          <strong>수상 버튼</strong>으로 추가하세요.
                        </TenureEmpty>
                      ) : (
                      <SimpleEntryList>
                        {p.awards
                          .slice()
                          .sort((a, b) => {
                            // BC/고대 안전 정렬(new Date 금지) — 날짜 없으면 맨 뒤.
                            const ta = a.awardDate
                              ? isoDateSortKey(a.awardDate)
                              : Number.NEGATIVE_INFINITY
                            const tb = b.awardDate
                              ? isoDateSortKey(b.awardDate)
                              : Number.NEGATIVE_INFINITY
                            return tb - ta
                          })
                          .map((a, awardIdx) => (
                            <SimpleEntryItem key={a.id ?? `award-${awardIdx}`}>
                              {!embedInModal && a.id && (
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
                              )}
                              <SimpleEntryHeader>
                                <SimpleEntryTitle>{a.awardName ?? '이름 없음'}</SimpleEntryTitle>
                                {a.category && (
                                  <SimpleEntryRole>{a.category}</SimpleEntryRole>
                                )}
                              </SimpleEntryHeader>
                              {(a.awardingBody || a.awardDate) && (
                                <SimpleEntryPeriod>
                                  {[
                                    a.awardingBody,
                                    formatIsoDateKo(a.awardDate),
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </SimpleEntryPeriod>
                              )}
                              {a.description && (
                                <SimpleEntryDescription>{a.description}</SimpleEntryDescription>
                              )}
                            </SimpleEntryItem>
                          ))}
                      </SimpleEntryList>
                      )}
                    </CollapsibleSection>
                  )}

                  {/* 3.5. 활동·이력 — 저작/창업/조직/군부대 */}
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
                        storageKey="activities"
                        ariaLabel="활동·이력"
                        icon={<FiFileText size={14} strokeWidth={2.2} />}
                        title="활동·이력"
                        count={total}
                        defaultOpen={false}
                      >
                        <ActivityGroupList>
                          {books.length > 0 && (
                            <ActivityGroup>
                              <ActivityGroupTitle>저작 {books.length}</ActivityGroupTitle>
                              <SimpleEntryList>
                                {books.map((b, bookIdx) => (
                                  <SimpleEntryItem key={b.id ?? `book-${bookIdx}`}>
                                    <SimpleEntryHeader>
                                      <SimpleEntryTitle>{b.title ?? '제목 없음'}</SimpleEntryTitle>
                                      {b.publishedYear && (
                                        <SimpleEntrySub>{b.publishedYear}년</SimpleEntrySub>
                                      )}
                                    </SimpleEntryHeader>
                                    {b.summary && (
                                      <SimpleEntryDescription>{b.summary}</SimpleEntryDescription>
                                    )}
                                  </SimpleEntryItem>
                                ))}
                              </SimpleEntryList>
                            </ActivityGroup>
                          )}
                          {founded.length > 0 && (
                            <ActivityGroup>
                              <ActivityGroupTitle>창업 기업 {founded.length}</ActivityGroupTitle>
                              <SimpleEntryList>
                                {founded.map((c, foundedIdx) => (
                                  <SimpleEntryItem key={c.id ?? `founded-${foundedIdx}`}>
                                    <SimpleEntryHeader>
                                      <SimpleEntryTitle>{c.name ?? '이름 없음'}</SimpleEntryTitle>
                                      {c.foundedAt && (
                                        <SimpleEntrySub>
                                          {formatIsoDateKo(c.foundedAt)}
                                        </SimpleEntrySub>
                                      )}
                                    </SimpleEntryHeader>
                                    {c.description && (
                                      <SimpleEntryDescription>{c.description}</SimpleEntryDescription>
                                    )}
                                  </SimpleEntryItem>
                                ))}
                              </SimpleEntryList>
                            </ActivityGroup>
                          )}
                          {orgRoles.length > 0 && (
                            <ActivityGroup>
                              <ActivityGroupTitle>조직 역할 {orgRoles.length}</ActivityGroupTitle>
                              <SimpleEntryList>
                                {orgRoles
                                  .slice()
                                  .sort((a, b) => {
                                    // BC/고대 안전 정렬(new Date 금지) — 날짜 없으면 맨 뒤.
                                    const ta = a.startDate
                                      ? isoDateSortKey(a.startDate)
                                      : Number.NEGATIVE_INFINITY
                                    const tb = b.startDate
                                      ? isoDateSortKey(b.startDate)
                                      : Number.NEGATIVE_INFINITY
                                    return tb - ta
                                  })
                                  .map((o, orgIdx) => {
                                    const start = formatIsoDateKo(o.startDate)
                                    const end = formatIsoDateKo(o.endDate)
                                    const period =
                                      formatPeriod(start, end)
                                    return (
                                      <SimpleEntryItem key={o.id ?? `org-${orgIdx}`}>
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
                                            <SimpleEntryRole>{o.roleTitle}</SimpleEntryRole>
                                          )}
                                        </SimpleEntryHeader>
                                        {period && (
                                          <SimpleEntryPeriod>{period}</SimpleEntryPeriod>
                                        )}
                                      </SimpleEntryItem>
                                    )
                                  })}
                              </SimpleEntryList>
                            </ActivityGroup>
                          )}
                          {milCmds.length > 0 && (
                            <ActivityGroup>
                              <ActivityGroupTitle>군부대 지휘 {milCmds.length}</ActivityGroupTitle>
                              <SimpleEntryList>
                                {milCmds
                                  .slice()
                                  .sort((a, b) => {
                                    // BC/고대 안전 정렬(new Date 금지) — 날짜 없으면 맨 뒤.
                                    const ta = a.startDate
                                      ? isoDateSortKey(a.startDate)
                                      : Number.NEGATIVE_INFINITY
                                    const tb = b.startDate
                                      ? isoDateSortKey(b.startDate)
                                      : Number.NEGATIVE_INFINITY
                                    return tb - ta
                                  })
                                  .map((m, milIdx) => {
                                    const start = formatIsoDateKo(m.startDate)
                                    const end = formatIsoDateKo(m.endDate)
                                    const period =
                                      formatPeriod(start, end)
                                    const titleParts = [m.rank, m.role].filter(Boolean) as string[]
                                    return (
                                      <SimpleEntryItem key={m.id ?? `mil-${milIdx}`}>
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
                                            <SimpleEntryRole>{titleParts.join(' · ')}</SimpleEntryRole>
                                          )}
                                        </SimpleEntryHeader>
                                        {period && (
                                          <SimpleEntryPeriod>{period}</SimpleEntryPeriod>
                                        )}
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

                  {/* ── 클러스터 ③ 관계 ── */}
                  {(!embedInModal ||
                    (p.spouseRelations?.length ?? 0) > 0 ||
                    ((person as { humanRelationships?: PersonHumanRelationshipItem[] })
                      .humanRelationships?.length ?? 0) > 0) && (
                    <OverviewClusterLabel>관계</OverviewClusterLabel>
                  )}

                  {/* 2.57. 배우자 상세 — 혼인 기간·메모 중 하나라도 있을 때만 표시 */}
                  <SpouseDetailSection spouseRelations={p.spouseRelations} />

                  {/* 4. 인간관계 */}
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

                  {/* ── 클러스터 ④ 소속·맥락 ── */}
                  {(!embedInModal ||
                    (p.countryAffiliations?.length ?? 0) > 0 ||
                    (p.foundedDynasties?.length ?? 0) > 0) && (
                    <OverviewClusterLabel>소속·맥락</OverviewClusterLabel>
                  )}

                  {/* 3.1. 국가 소속·국적 (다중) */}
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
                            const typeLabel = aff.affiliationType
                              ? TYPE_LABELS[aff.affiliationType] ??
                                aff.affiliationType
                              : '소속'
                            const start = formatIsoDateKo(aff.startDate)
                            const end = formatIsoDateKo(aff.endDate)
                            const period =
                              formatPeriod(start, end)
                            return (
                              <CountryAffiliationChip
                                key={aff.id ?? `aff-${affIdx}`}
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

                  {/* 3.2. 시조로 등록된 가문 */}
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

                  {/* 5. 소속 그룹 (세대·계파·동기) */}
                  <SamePersonGroupSection
                    currentPersonId={person.id}
                    currentPersonName={getPersonDisplayName(person, true)}
                    onPersonClick={
                      embedInModal ? onLinkedPersonClick : pushPersonToModalStack
                    }
                  />
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
                  {/* 하향 저작 퀵액션 — ego 기준 가족 추가(기존 인물 검색 또는 새 등록). */}
                  <FamilyActionRow>
                    <FamilyActionBtn type="button" onClick={() => setFamilyAddMode('child')}>
                      + 자녀 추가
                    </FamilyActionBtn>
                    <FamilyActionBtn
                      type="button"
                      onClick={() => setFamilyAddMode('father')}
                      disabled={!!person.father}
                      title={person.father ? '이미 아버지가 지정되어 있습니다' : undefined}
                    >
                      + 아버지 추가
                    </FamilyActionBtn>
                    <FamilyActionBtn
                      type="button"
                      onClick={() => setFamilyAddMode('mother')}
                      disabled={!!person.mother}
                      title={person.mother ? '이미 어머니가 지정되어 있습니다' : undefined}
                    >
                      + 어머니 추가
                    </FamilyActionBtn>
                    <FamilyActionBtn type="button" onClick={() => setFamilyAddMode('spouse')}>
                      + 배우자 추가
                    </FamilyActionBtn>
                  </FamilyActionRow>
                  {!person.father &&
                  !person.mother &&
                  !person.spouse &&
                  (!person.spouseRelations || person.spouseRelations.length === 0) &&
                  (!person.children || person.children.length === 0) ? (
                    <EmptyState>가족 정보가 없습니다</EmptyState>
                  ) : (
                    <PersonGenealogyInfographic
                      ego={person}
                      father={person.father}
                      mother={person.mother}
                      paternalGrandfather={person.father?.father}
                      paternalGrandmother={person.father?.mother}
                      maternalGrandfather={person.mother?.father}
                      maternalGrandmother={person.mother?.mother}
                      spouse={person.spouse}
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
                  {/* 가족 추가 모달 — 기존 인물 검색 또는 "새 인물" 생성 후 ego와 연결. */}
                  {familyModalConfig && (
                    <PersonSelectModal
                      persons={familyAddPool ?? []}
                      selectedPersonId=""
                      onSelect={(id) => applyFamilyLink(id)}
                      onClose={() => setFamilyAddMode(null)}
                      excludeIds={familyModalConfig.exclude.filter(Boolean)}
                      title={familyModalConfig.title}
                      searchPlaceholder="인물 검색…"
                      defaultCountryId={(person as { countryId?: string }).countryId || undefined}
                      loading={!familyAddPool}
                    />
                  )}
                </section>

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

            {activeTab === 'politics' && (
              <TabContent
                key="politics"
                role="tabpanel"
                id="person-detail-panel-politics"
                aria-labelledby="person-detail-tab-politics"
                as={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <PersonPoliticsSection
                  personId={person.id}
                  countryId={person.countryId ?? null}
                  variant="tab"
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
                />
                {p.partyLeaderships && p.partyLeaderships.length > 0 && (
                  <section aria-label="당 지도부 이력">
                    <SectionLabelRow>
                      <SectionLabel>당 지도부 이력</SectionLabel>
                      <CountMuted>{p.partyLeaderships.length}</CountMuted>
                    </SectionLabelRow>
                    <SimpleEntryList>
                      {p.partyLeaderships
                        .slice()
                        .sort((a, b) => {
                          const ta = a.startDate ? new Date(a.startDate).getTime() : 0
                          const tb = b.startDate ? new Date(b.startDate).getTime() : 0
                          return tb - ta
                        })
                        .map((l, partyIdx) => {
                          const start = formatIsoDateKo(l.startDate)
                          const end = formatIsoDateKo(l.endDate)
                          const period =
                            formatPeriod(start, end)
                          return (
                            <SimpleEntryItem key={l.id ?? `party-${partyIdx}`}>
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
                                  <SimpleEntryRole>{l.roleTitle}</SimpleEntryRole>
                                )}
                              </SimpleEntryHeader>
                              {period && (
                                <SimpleEntryPeriod>{period}</SimpleEntryPeriod>
                              )}
                            </SimpleEntryItem>
                          )
                        })}
                    </SimpleEntryList>
                  </section>
                )}
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
                    )}
                  </SectionLabelRow>
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

      <PersonLifeEventFormModal
        open={lifeEventModalOpen}
        personId={person.id}
        lifeEvent={editingLifeEvent}
        birthDate={person.birthDate ?? null}
        deathDate={person.deathDate ?? null}
        existingLifeEvents={lifeEvents}
        existingTenures={timelineTenures.map((t: any) => ({
          id: t.id,
          title: t.positionDefinition?.title ?? t.title ?? null,
          startDate: t.startDate ?? null,
          endDate: t.endDate ?? null,
        }))}
        existingReigns={timelineReigns.map((r: any) => ({
          id: r.id,
          title:
            r.regnalName ?? r.positionDefinition?.title ?? r.title ?? null,
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
        onClose={() => setAwardModalOpen(false)}
      />

      <CareerRegisterModal
        open={careerModalOpen}
        personId={person.id}
        onClose={() => setCareerModalOpen(false)}
      />
                    birthPlace={
                      p.birthCity?.name ??
                      p.birthAdminDivision?.name ??
                      p.birthPlaceText ??
                      null
                    }

      <EventInlineModal
        eventId={viewingEventId}
        onClose={() => setViewingEventId(null)}
        onNavigate={(eventId) => navigate(pathKeys.events.detail(eventId))}
        personContext={
          viewingEventId ? personEventContextByEventId.get(viewingEventId) ?? null : null
        }
      />

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
                  onEdit={() => setPersonLinkStack([])}
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
