/**
 * 인물 상세 패널 (리스트 페이지 우측 컨텐츠 영역)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCamera,
  FiEdit2,
  FiExternalLink,
  FiFlag,
  FiInfo,
  FiMapPin,
  FiPlus,
  FiTrash2,
  FiTrendingUp,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'

import { personKeys } from '@/entities/person/api'
import type { PersonHumanRelationshipItem } from '@/shared/api/person-human-relationships'
import { deletePerson, updatePerson } from '@/shared/api/persons'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getPersonFamilyTree } from '@/shared/api/persons-family-tree'
import {
  type PersonLifeEvent,
  listPersonLifeEvents,
} from '@/shared/api/person-life-events'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
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
import { InfluenceBadge } from '@/shared/ui/influence-badge'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { SovereignReignRegisterPanel } from '@/shared/ui/sovereign-reign-register-panel/sovereign-reign-register-panel'
import { PersonLifeEventFormModal } from '@/widgets/person/person-life-event-form-modal/person-life-event-form-modal'
import { PersonLifeTimelineInfographic } from '@/widgets/person/person-life-timeline-infographic/person-life-timeline-infographic'
import { PersonGenealogyInfographic } from '@/widgets/person/person-genealogy-infographic/person-genealogy-infographic'
import { PersonHumanRelationshipsSection } from '@/widgets/person/person-human-relationships-section/person-human-relationships-section'
import { SameDynastyMembersSection } from '@/widgets/person/same-dynasty-members-section/same-dynasty-members-section'
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
  BioDynastyTooltipPopover,
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
  BioTermTooltipOverlay,
  BioTermTooltipPopover,
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
  DeathCauseText,
  DeathInfoRow,
  DeathNoteText,
  DeathTypePill,
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
  FamilyBadge,
  FamilyBadgeRow,
  FoundedDynastyChip,
  FoundedDynastyRow,
  FullGenealogyLink,
  FullGenealogyLinkRow,
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
  LifeCard,
  LifeCardAge,
  LifeCardGrid,
  LifeCardHeader,
  LifeCardIconWrap,
  LifeCardLabel,
  LifeCardRow,
  LifeCardTitle,
  LifeCardValue,
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
  SimpleEntryDescription,
  SimpleEntryHeader,
  SimpleEntryItem,
  SimpleEntryList,
  SimpleEntryPeriod,
  SimpleEntryRole,
  SimpleEntrySub,
  SimpleEntryTitle,
  Spinner,
  SpouseDetailHeader,
  SpouseDetailItem,
  SpouseDetailList,
  SpouseDetailName,
  SpouseDetailNote,
  SpouseDetailPeriod,
  TabBtn,
  TabContent,
  TabContentArea,
  TabNav,
  TenureAddButton,
  TenureEmpty,
  TopNavBar,
  UnifiedActionRow,
  UnifiedAgeBadge,
  UnifiedCard,
  UnifiedCardList,
  UnifiedCardMain,
  UnifiedCardTitle,
  UnifiedCardTopRow,
  UnifiedEditBtn,
  UnifiedKindBadge,
  UnifiedMetaChip,
  UnifiedMetaRow,
  UnifiedOrdinal,
  UnifiedSubRow,
} from './person-detail-panel.styles'

type TabType = 'overview' | 'genealogy' | 'politics' | 'events'

/** 인물 상세 API 응답의 실질적 shape (persons-detail은 any 반환이므로 이 컴포넌트 내에서 타입 선언) */
interface PersonDetailData {
  id: string
  name: string
  surname?: string | null
  middleName?: string | null
  nameDisplayOrder?: string | null
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  birthEra?: string | null
  deathYear?: number | null
  deathMonth?: number | null
  deathDay?: number | null
  deathEra?: string | null
  deathType?: string | null
  deathCause?: string | null
  deathNote?: string | null
  gender?: string | null
  biography?: string | null
  profileImageUrl?: string | null
  regnalName?: string | null
  templeName?: string | null
  posthumousName?: string | null
  preEnthronementTitle?: string | null
  originalName?: string | null
  surnameMeaning?: string | null
  nameMeaning?: string | null
  middleNameMeaning?: string | null
  nicknames?: Array<{
    id?: string
    nickname?: string | null
    type?: string | null
    priority?: number | null
  }> | null
  createdAt?: string | null
  isAlive?: boolean | null
  influence?: number | null
  isDeathDateUnknown?: boolean | null
  dynastyId?: string | null
  religionId?: string | null
  denomination?: { id: string; name: string } | null
  countryId?: string | null
  countryAffiliations?: Array<{
    id?: string
    affiliationType?: string | null
    priority?: number | null
    startDate?: string | null
    endDate?: string | null
    countryId?: string | null
    historicalCountryId?: string | null
    country?: { id: string; name: string; isoCode?: string | null; flagEmoji?: string | null; thumbnailUrl?: string | null } | null
    historicalCountry?: { id: string; name: string } | null
  }> | null
  foundedDynasties?: Array<{
    id?: string
    name?: string | null
  }> | null
  educations?: Array<{
    id?: string
    organization?: { id?: string; name?: string | null } | null
    educationType?: string | null
    classNumber?: number | null
    degree?: string | null
    major?: string | null
    department?: string | null
    startDate?: string | null
    endDate?: string | null
    status?: string | null
    notes?: string | null
  }> | null
  awards?: Array<{
    id?: string
    awardName?: string | null
    awardingBody?: string | null
    awardDate?: string | null
    category?: string | null
    description?: string | null
  }> | null
  careers?: Array<{
    id?: string
    /** military / business / academic / religious / artist / athlete / media / legal / medical */
    kind: string
    /** 보직·직함·직급 등 카테고리별 라벨 */
    title?: string | null
    /** 군 계급 또는 직급 (Job 객체) */
    rank?: { id?: string; name?: string | null } | null
    organization?: { id?: string; name?: string | null } | null
    branch?: string | null
    department?: string | null
    termNumber?: number | null
    startDate?: string | null
    endDate?: string | null
    notes?: string | null
  }> | null
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
    isoCode?: string | null
    thumbnailUrl?: string | null
    defaultNameDisplayOrder?: string | null
  } | null
  dynasty?: { id: string; name: string } | null
  father?: (PersonNameFields & {
    id?: string
    gender?: string | null
    profileImageUrl?: string | null
    profileImages?: { url?: string | null }[] | null
    dynasty?: { id?: string; name?: string | null } | null
    birthDate?: string | Date | null
    deathDate?: string | Date | null
    father?: (PersonNameFields & { id?: string; gender?: string | null; profileImageUrl?: string | null; profileImages?: { url?: string | null }[] | null; dynasty?: { id?: string; name?: string | null } | null; birthDate?: string | Date | null; deathDate?: string | Date | null }) | null
    mother?: (PersonNameFields & { id?: string; gender?: string | null; profileImageUrl?: string | null; profileImages?: { url?: string | null }[] | null; dynasty?: { id?: string; name?: string | null } | null; birthDate?: string | Date | null; deathDate?: string | Date | null }) | null
  }) | null
  mother?: (PersonNameFields & {
    id?: string
    gender?: string | null
    profileImageUrl?: string | null
    profileImages?: { url?: string | null }[] | null
    dynasty?: { id?: string; name?: string | null } | null
    birthDate?: string | Date | null
    deathDate?: string | Date | null
    father?: (PersonNameFields & { id?: string; gender?: string | null; profileImageUrl?: string | null; profileImages?: { url?: string | null }[] | null; dynasty?: { id?: string; name?: string | null } | null; birthDate?: string | Date | null; deathDate?: string | Date | null }) | null
    mother?: (PersonNameFields & { id?: string; gender?: string | null; profileImageUrl?: string | null; profileImages?: { url?: string | null }[] | null; dynasty?: { id?: string; name?: string | null } | null; birthDate?: string | Date | null; deathDate?: string | Date | null }) | null
  }) | null
  spouse?: PersonNameFields | null
  siblings?: Array<PersonNameFields & {
    id?: string; gender?: string | null; profileImageUrl?: string | null;
    profileImages?: { url?: string | null }[] | null;
    dynasty?: { id?: string; name?: string | null } | null;
    birthDate?: string | Date | null; deathDate?: string | Date | null;
  }> | null
  spouseRelations?: Array<{
    id?: string
    marriageStartDate?: string | null
    marriageEndDate?: string | null
    note?: string | null
    spouse?: (PersonNameFields & {
      id?: string
      gender?: string | null
      profileImageUrl?: string | null
      profileImages?: { url?: string | null }[] | null
      dynasty?: { id?: string; name?: string | null } | null
      birthDate?: string | Date | null
      deathDate?: string | Date | null
    }) | null
  }> | null
  birthCity?: { id: string; name: string } | null
  deathCity?: { id: string; name: string } | null
  birthAdminDivision?: { id: string; name: string } | null
  deathAdminDivision?: { id: string; name: string } | null
  birthPlaceText?: string | null
  deathPlaceText?: string | null
  governmentPositions?: unknown[]
  governmentTenures?: unknown[]
  partyLeaderships?: Array<{
    id?: string
    roleTitle?: string | null
    startDate?: string | null
    endDate?: string | null
    party?: { id?: string; name?: string | null; shortName?: string | null } | null
  }> | null
  organizationRoles?: Array<{
    id?: string
    roleTitle?: string | null
    startDate?: string | null
    endDate?: string | null
    organization?: { id?: string; name?: string | null; shortName?: string | null } | null
  }> | null
  militaryCommands?: Array<{
    id?: string
    rank?: string | null
    role?: string | null
    startDate?: string | null
    endDate?: string | null
    unit?: { id?: string; name?: string | null; unitType?: string | null } | null
  }> | null
  books?: Array<{
    id?: string
    title?: string | null
    publishedYear?: number | null
    summary?: string | null
  }> | null
  foundedCompanies?: Array<{
    id?: string
    name?: string | null
    foundedAt?: string | null
    description?: string | null
  }> | null
  companies?: Array<{
    id?: string
    name?: string | null
    foundedAt?: string | null
    description?: string | null
  }> | null
  sovereignReigns?: Array<{
    id: string
    startDate?: string | null
    endDate?: string | null
    notes?: string | null
    regnalName?: string | null
    regnalNumber?: number | null
    positionDefinition?: { id?: string; title?: string | null } | null
    country?: { id?: string; name?: string | null } | null
    historicalCountry?: { id?: string; name?: string | null } | null
  }> | null
  humanRelationships?: unknown[]
  events?: unknown[]
  electionCandidacies?: unknown[]
}

/** "YYYY년 M월 D일" 형식 (월·일 없으면 년만) */
function formatDateKo(
  year: number | null | undefined,
  month?: number | null,
  day?: number | null,
  era?: string | null,
): string {
  if (year == null) return ''
  const prefix = era === 'BC' ? '기원전 ' : ''
  if (month != null && day != null)
    return `${prefix}${year}년 ${month}월 ${day}일`
  if (month != null) return `${prefix}${year}년 ${month}월`
  return `${prefix}${year}년`
}

/** ISO 날짜 문자열 → "YYYY년 M월 D일" */
function formatIsoDateKo(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `${y}년 ${m}월 ${day}일`
  } catch {
    return ''
  }
}

/** 사망 유형 enum → 한국어 라벨 */
const DEATH_TYPE_LABELS: Record<string, string> = {
  NATURAL: '자연사',
  ILLNESS: '병사',
  ASSASSINATION: '암살',
  EXECUTION: '처형',
  BATTLE: '전사',
  ACCIDENT: '사고사',
  SUICIDE: '자살',
  UNKNOWN: '불명',
  OTHER: '기타',
}

/**
 * 전기 편집 시 에디터에 넣을 값: 일반 텍스트면 \n → <br> 변환, 이미 HTML이면 그대로.
 * (RichTextEditor는 HTML을 다루므로 평문 개행이 보이지 않음)
 */
function biographyToEditorValue(raw: string | null | undefined): string {
  if (raw == null || raw === '') return ''
  const trimmed = raw.trimStart()
  if (trimmed.startsWith('<')) return raw
  return raw.replace(/\n/g, '<br>')
}

/**
 * 특정 시점에 몇 살이었는지 계산 (출생년월일 + 해당 날짜)
 * 출생 정보 없으면 null
 */
function getAgeAtDate(
  birthYear: number | null | undefined,
  birthMonth?: number | null,
  birthDay?: number | null,
  dateIso?: string | null,
): number | null {
  if (birthYear == null || !dateIso) return null
  try {
    const d = new Date(dateIso)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    let age = y - birthYear
    if (age < 0) return null
    if (birthMonth != null && birthDay != null) {
      if (m < birthMonth || (m === birthMonth && day < birthDay)) age--
    }
    return age
  } catch {
    return null
  }
}

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
}

export function PersonDetailPanel({
  personId,
  onClose,
  onEdit,
  closeLabel = '닫기',
  hideHeaderActions = false,
  embedInModal = false,
  onLinkedPersonClick,
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
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [tenureModalOpen, setTenureModalOpen] = useState(false)
  const [editingTenureId, setEditingTenureId] = useState<string | null>(null)
  const [sovereignReignModalOpen, setSovereignReignModalOpen] = useState(false)
  const [editingReignId, setEditingReignId] = useState<string | null>(null)
  const [lifeEventModalOpen, setLifeEventModalOpen] = useState(false)
  const [editingLifeEvent, setEditingLifeEvent] = useState<PersonLifeEvent | null>(null)
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
  const [editingBiography, setEditingBiography] = useState(false)
  const [biographyDraft, setBiographyDraft] = useState('')
  const [savingBiography, setSavingBiography] = useState(false)
  const [editingInfluence, setEditingInfluence] = useState(false)
  const [influenceDraft, setInfluenceDraft] = useState(0)
  const [savingInfluence, setSavingInfluence] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingPerson, setDeletingPerson] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  /** 루트 패널: 전기 인물 링크 → 모달 스택(같은 오버레이에서 인물 전환, 중첩 모달 방지) */
  const [personLinkStack, setPersonLinkStack] = useState<string[]>([])
  const [termTooltip, setTermTooltip] =
    useState<RichTextTermTooltipState | null>(null)
  const [dynastyTooltip, setDynastyTooltip] =
    useState<RichTextDynastyTooltipState | null>(null)

  const {
    data: person,
    isLoading,
    isError,
  } = useQuery({
    queryKey: personKeys.detailFull(personId),
    queryFn: () => getPersonDetailById(personId),
    enabled: !!personId,
  })

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
    const f = (person as any)?.father
    if (!f) return null
    return {
      id: f.id,
      name: getPersonDisplayName(f, true),
      birthDate: f.birthDate ? String(f.birthDate) : null,
      deathDate: f.deathDate ? String(f.deathDate) : null,
    }
  }, [person])

  const timelineMother = useMemo(() => {
    const m = (person as any)?.mother
    if (!m) return null
    return {
      id: m.id,
      name: getPersonDisplayName(m, true),
      birthDate: m.birthDate ? String(m.birthDate) : null,
      deathDate: m.deathDate ? String(m.deathDate) : null,
    }
  }, [person])

  const timelineChildren = useMemo(() => {
    const list = ((person as any)?.children ?? []) as any[]
    return list.map((c) => ({
      id: c.id,
      name: getPersonDisplayName(c, true),
      birthDate: c.birthDate ? String(c.birthDate) : null,
      deathDate: c.deathDate ? String(c.deathDate) : null,
    }))
  }, [person])

  const timelineSpouses = useMemo(() => {
    const list = ((person as any)?.spouseRelations ?? []) as any[]
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
    const list = ((person as any)?.siblings ?? []) as any[]
    return list.map((s) => ({
      id: s.id,
      name: getPersonDisplayName(s, true),
      birthDate: s.birthDate ? String(s.birthDate) : null,
      deathDate: s.deathDate ? String(s.deathDate) : null,
    }))
  }, [person])

  const timelineReigns = useMemo(
    () => ((person as any)?.sovereignReigns ?? []) as any[],
    [person],
  )
  const timelineTenures = useMemo(
    () =>
      ((person as any)?.governmentPositions ??
        (person as any)?.governmentTenures ??
        []) as any[],
    [person],
  )
  const timelineEvents = useMemo(
    () => ((person as any)?.events ?? []) as any[],
    [person],
  )

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

  const pushPersonToModalStack = useCallback((id: string) => {
    setPersonLinkStack((prev) => [...prev, id])
  }, [])

  /** 인물 관련 모든 쿼리 캐시 무효화 (아바타 변경·삭제·수정 후 공통 호출) */
  const invalidatePersonCaches = useCallback(
    (withDetail = true) =>
      Promise.all([
        ...(withDetail
          ? [
              queryClient.invalidateQueries({ queryKey: personKeys.detailFull(personId) }),
              queryClient.invalidateQueries({ queryKey: personKeys.detail(personId) }),
            ]
          : []),
        queryClient.invalidateQueries({ queryKey: personKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['persons-by-country'] }),
        queryClient.invalidateQueries({ queryKey: ['persons-by-dynasty'] }),
        queryClient.invalidateQueries({ queryKey: ['persons-by-tenure-country'] }),
      ]),
    [personId, queryClient],
  )

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
        toast.success('프로필 사진이 변경되었습니다.')
      } catch (err) {
        toast.error(
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
      toast.success('인물이 삭제되었습니다.')
      setDeleteConfirmOpen(false)
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '인물 삭제에 실패했습니다.',
      )
    } finally {
      setDeletingPerson(false)
    }
  }, [personId, invalidatePersonCaches, onClose])

  const { handleProseClick: handleBioProseClick } = useRichTextProseClick({
    navigate,
    samePersonId: personId,
    onPersonClick: embedInModal
      ? (id) => {
          onLinkedPersonClick?.(id)
        }
      : pushPersonToModalStack,
    setTermTooltip,
    setDynastyTooltip,
  })

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

  const birthYearText = p.birthYear
    ? `${p.birthYear}${p.birthEra === 'BC' ? ' BC' : ''}`
    : '?'
  const deathYearText = p.deathYear
    ? `${p.deathYear}${p.deathEra === 'BC' ? ' BC' : ''}`
    : null
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
  const lifespanText = isDeceased
    ? `${birthYearText} ~ ${deathYearText}${ageAtDeath != null ? ` · 사망 · ${ageAtDeath}세` : ' · 사망'}`
    : `${birthYearText} ~ ${currentAge != null ? `생존 (${currentAge}세)` : '생존'}`

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

  /** API가 governmentPositions 또는 governmentTenures 중 하나로 내려줄 수 있음 */
  const tenuresList = (p.governmentPositions ?? p.governmentTenures ?? []) as unknown[]

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
                    navigate(pathKeys.history.countryDetail(p.country.id))
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
                    {sorted.map((n) => (
                      <NicknameChip key={n.id ?? n.nickname ?? Math.random()}>
                        {n.type && <NicknameType>{n.type}</NicknameType>}
                        <NicknameValue>{n.nickname}</NicknameValue>
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
                const badges: Array<{ key: string; label: string }> = []
                if (p.father) badges.push({ key: 'father', label: '부' })
                if (p.mother) badges.push({ key: 'mother', label: '모' })
                const spouseCount = (p.spouseRelations ?? []).length
                if (spouseCount > 0)
                  badges.push({
                    key: 'spouses',
                    label: `배우자 ${spouseCount}`,
                  })
                const childrenCount =
                  ((person as any).children ?? []).length ?? 0
                if (childrenCount > 0)
                  badges.push({
                    key: 'children',
                    label: `자녀 ${childrenCount}`,
                  })
                const siblingCount = (p.siblings ?? []).length
                if (siblingCount > 0)
                  badges.push({
                    key: 'siblings',
                    label: `형제 ${siblingCount}`,
                  })
                if (badges.length === 0) return null
                return (
                  <FamilyBadgeRow>
                    {badges.map((b) => (
                      <FamilyBadge key={b.key}>{b.label}</FamilyBadge>
                    ))}
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
                    navigate(pathKeys.history.countryDetail(person.country.id))
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
          {(() => {
            // 재임 + 재위 총 연수
            const allTenures = [
              ...tenuresList,
              ...((p.sovereignReigns ?? []) as any[]),
            ]
            if (allTenures.length === 0) return null
            const totalDays = allTenures.reduce((acc, t: any) => {
              const s = t.startDate ? new Date(t.startDate).getTime() : null
              const e = t.endDate ? new Date(t.endDate).getTime() : Date.now()
              if (s == null) return acc
              return acc + Math.max(0, e - s)
            }, 0)
            const years = Math.round(totalDays / (365.25 * 86_400_000))
            if (years <= 0) return null
            return (
              <KpiItem>
                <KpiLabel>재임·재위 총</KpiLabel>
                <KpiValue>약 {years}년</KpiValue>
              </KpiItem>
            )
          })()}
          {person.influence != null && person.influence > 0 && (
            <KpiItem>
              <KpiLabel>영향력</KpiLabel>
              <KpiValue>
                <InfluenceBadge influence={person.influence} />
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
                    navigate(pathKeys.dynasty())
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
            const rels = (p.spouseRelations ?? []) as any[]
            const names = rels
              .map((r) => {
                const sp = r.spouse ?? r
                return getPersonDisplayName(sp, true)
              })
              .filter((n) => n && n !== '이름 없음')
            const displayName =
              names.length > 0
                ? names.join(' · ')
                : person.spouse
                  ? getPersonDisplayName(person.spouse)
                  : null
            if (!displayName) return null
            return (
              <KpiItem>
                <KpiLabel>배우자 {names.length > 1 ? `(${names.length})` : ''}</KpiLabel>
                <KpiValue>{displayName}</KpiValue>
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
              setActiveTab('overview')
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
              setActiveTab('genealogy')
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
              setActiveTab('politics')
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
              setActiveTab('events')
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
                  {/* 1. 전기 — 가장 중요한 서술 정보 */}
                  <section aria-label="전기">
                    <OverviewSectionHeaderRow>
                      <OverviewSectionHeading>
                        <FiBookOpen size={14} strokeWidth={2.2} />
                        <span>전기</span>
                      </OverviewSectionHeading>
                      {!editingBiography && person.biography && !embedInModal && (
                        <OutlineButton
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setBiographyDraft(
                              biographyToEditorValue(person.biography),
                            )
                            setEditingBiography(true)
                          }}
                        >
                          <FiEdit2 size={14} />
                          수정
                        </OutlineButton>
                      )}
                    </OverviewSectionHeaderRow>
                    {editingBiography ? (
                      <SectionCardBio>
                        <BioEditorWrap>
                          <RichTextEditor
                            value={biographyDraft}
                            onChange={setBiographyDraft}
                            showTitle={false}
                            placeholder="전기(약력)를 입력하세요. 서식·이미지를 넣을 수 있습니다."
                            onImageUpload={async (file) => {
                              const result = await uploadImage(file, 'persons')
                              return result.url
                            }}
                          />
                          <BioEditActions>
                            <OutlineButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setEditingBiography(false)
                                setBiographyDraft('')
                              }}
                              disabled={savingBiography}
                            >
                              취소
                            </OutlineButton>
                            <PrimaryButton
                              type="button"
                              onClick={async () => {
                                playClickSound()
                                setSavingBiography(true)
                                try {
                                  await updatePerson(person.id, {
                                    biography:
                                      biographyDraft?.trim() || undefined,
                                  })
                                  await queryClient.invalidateQueries({
                                    queryKey: personKeys.detailFull(personId),
                                  })
                                  setEditingBiography(false)
                                  setBiographyDraft('')
                                  toast.success('전기가 저장되었습니다.')
                                } catch (err: unknown) {
                                  toast.error(
                                    err instanceof Error
                                      ? err.message
                                      : '전기 저장에 실패했습니다.',
                                  )
                                } finally {
                                  setSavingBiography(false)
                                }
                              }}
                              disabled={savingBiography}
                            >
                              {savingBiography ? '저장 중…' : '저장'}
                            </PrimaryButton>
                          </BioEditActions>
                        </BioEditorWrap>
                      </SectionCardBio>
                    ) : person.biography ? (
                      <SectionCardBio>
                        <BioProse>
                          {isLikelyRichTextHtml(person.biography) ? (
                            <div
                              onClick={handleBioProseClick}
                              role="presentation"
                            >
                              <BioContent html={person.biography ?? ''} />
                            </div>
                          ) : (
                            <BioText>{person.biography}</BioText>
                          )}
                        </BioProse>
                      </SectionCardBio>
                    ) : !embedInModal ? (
                      <BioEmptyClickable
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setBiographyDraft(biographyToEditorValue(null))
                          setEditingBiography(true)
                        }}
                      >
                        <BioEmptyTitle>이 인물의 전기를 기록해보세요</BioEmptyTitle>
                        <BioEmptyDesc>
                          생애·업적·영향을 자유롭게 서술할 수 있습니다. 서식·이미지 지원.
                        </BioEmptyDesc>
                        <BioEmptyCta>+ 전기 작성 시작</BioEmptyCta>
                      </BioEmptyClickable>
                    ) : (
                      <SectionCardBio>
                        <BioEmptyHint>전기(약력)가 없습니다.</BioEmptyHint>
                      </SectionCardBio>
                    )}
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
                            onClick={async () => {
                              setSavingInfluence(true)
                              try {
                                await updatePerson(person.id, {
                                  influence: influenceDraft,
                                })
                                queryClient.invalidateQueries({
                                  queryKey: personKeys.detailFull(personId),
                                })
                                setEditingInfluence(false)
                                toast.success('영향력이 저장되었습니다.')
                              } catch (err) {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : '영향력 저장에 실패했습니다.',
                                )
                              } finally {
                                setSavingInfluence(false)
                              }
                            }}
                          >
                            {savingInfluence ? '저장 중…' : '저장'}
                          </OutlineButton>
                          <OutlineButton
                            type="button"
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
                        : (person.influence ?? 0)
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
                  {(() => {
                    const birthPlace =
                      p.birthCity?.name ??
                      p.birthAdminDivision?.name ??
                      p.birthPlaceText ??
                      null
                    const deathPlace =
                      p.deathCity?.name ??
                      p.deathAdminDivision?.name ??
                      p.deathPlaceText ??
                      null
                    const hasBirth = !!birthDateStr || !!birthPlace
                    const hasDeath =
                      !!deathDateStr ||
                      !!deathPlace ||
                      !!p.deathType ||
                      !!p.deathCause ||
                      !!p.deathNote
                    if (!hasBirth && !hasDeath) return null
                    return (
                      <LifeCardGrid>
                        {hasBirth && (
                          <LifeCard $tone="birth" aria-label="출생 정보">
                            <LifeCardHeader>
                              <LifeCardIconWrap $tone="birth">
                                <FiCalendar size={14} strokeWidth={2.2} />
                              </LifeCardIconWrap>
                              <LifeCardTitle>출생</LifeCardTitle>
                            </LifeCardHeader>
                            {birthDateStr && (
                              <LifeCardRow>
                                <LifeCardLabel>일자</LifeCardLabel>
                                <LifeCardValue>{birthDateStr}</LifeCardValue>
                              </LifeCardRow>
                            )}
                            {birthPlace && (
                              <LifeCardRow>
                                <LifeCardLabel>장소</LifeCardLabel>
                                <LifeCardValue>{birthPlace}</LifeCardValue>
                              </LifeCardRow>
                            )}
                          </LifeCard>
                        )}
                        {hasDeath && (
                          <LifeCard $tone="death" aria-label="사망 정보">
                            <LifeCardHeader>
                              <LifeCardIconWrap $tone="death">
                                <FiAlertTriangle size={14} strokeWidth={2.2} />
                              </LifeCardIconWrap>
                              <LifeCardTitle>사망</LifeCardTitle>
                              {ageAtDeath != null && (
                                <LifeCardAge>향년 {ageAtDeath}세</LifeCardAge>
                              )}
                            </LifeCardHeader>
                            {deathDateStr && (
                              <LifeCardRow>
                                <LifeCardLabel>일자</LifeCardLabel>
                                <LifeCardValue>{deathDateStr}</LifeCardValue>
                              </LifeCardRow>
                            )}
                            {deathPlace && (
                              <LifeCardRow>
                                <LifeCardLabel>장소</LifeCardLabel>
                                <LifeCardValue>{deathPlace}</LifeCardValue>
                              </LifeCardRow>
                            )}
                            {(p.deathType || p.deathCause) && (
                              <LifeCardRow>
                                <LifeCardLabel>유형</LifeCardLabel>
                                <DeathInfoRow>
                                  {p.deathType && (
                                    <DeathTypePill>
                                      {DEATH_TYPE_LABELS[p.deathType] ?? p.deathType}
                                    </DeathTypePill>
                                  )}
                                  {p.deathCause && (
                                    <DeathCauseText>{p.deathCause}</DeathCauseText>
                                  )}
                                </DeathInfoRow>
                              </LifeCardRow>
                            )}
                            {p.deathNote && (
                              <DeathNoteText>{p.deathNote}</DeathNoteText>
                            )}
                          </LifeCard>
                        )}
                      </LifeCardGrid>
                    )
                  })()}

                  {/* 2.57. 배우자 상세 — 혼인 기간·메모 중 하나라도 있을 때만 표시 */}
                  {(() => {
                    const rels = (p.spouseRelations ?? []).filter(
                      (r) =>
                        r.note ||
                        r.marriageStartDate ||
                        r.marriageEndDate,
                    )
                    if (rels.length === 0) return null
                    return (
                      <section aria-label="배우자 상세">
                        <OverviewSectionHeaderRow>
                          <OverviewSectionHeading>
                            <FiUsers size={14} strokeWidth={2.2} />
                            <span>배우자 상세</span>
                            {rels.length > 1 && <CountMuted>{rels.length}</CountMuted>}
                          </OverviewSectionHeading>
                        </OverviewSectionHeaderRow>
                        <SpouseDetailList>
                          {rels.map((r, idx) => {
                            const sp = r.spouse ?? null
                            const name = sp
                              ? getPersonDisplayName(sp, true)
                              : '이름 없음'
                            const start = formatIsoDateKo(r.marriageStartDate)
                            const end = formatIsoDateKo(r.marriageEndDate)
                            const period = [start, end].filter(Boolean).join(' ~ ')
                            return (
                              <SpouseDetailItem key={r.id ?? `spouse-${idx}`}>
                                <SpouseDetailHeader>
                                  <SpouseDetailName>{name}</SpouseDetailName>
                                  {period && (
                                    <SpouseDetailPeriod>{period}</SpouseDetailPeriod>
                                  )}
                                </SpouseDetailHeader>
                                {r.note && (
                                  <SpouseDetailNote>{r.note}</SpouseDetailNote>
                                )}
                              </SpouseDetailItem>
                            )
                          })}
                        </SpouseDetailList>
                      </section>
                    )
                  })()}

                  {/* 3. 재임·재위 통합 */}
                  <section aria-label="재임·재위">
                    <OverviewSectionHeaderRow>
                      <OverviewSectionHeading>
                        <FiAward size={14} strokeWidth={2.2} />
                        <span>재임·재위</span>
                        {tenuresList.length + (p.sovereignReigns?.length ?? 0) > 0 && (
                          <CountMuted>
                            {tenuresList.length + (p.sovereignReigns?.length ?? 0)}
                          </CountMuted>
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
                            수반
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
                            군주
                          </TenureAddButton>
                        </UnifiedActionRow>
                      )}
                    </OverviewSectionHeaderRow>
                    {(() => {
                      type CombinedItem =
                        | { kind: 'tenure'; data: any }
                        | { kind: 'reign'; data: any }
                      const combined: CombinedItem[] = [
                        ...tenuresList.map(
                          (t: any): CombinedItem => ({ kind: 'tenure', data: t }),
                        ),
                        ...((p.sovereignReigns ?? []).map(
                          (r): CombinedItem => ({ kind: 'reign', data: r }),
                        )),
                      ]
                      combined.sort((a, b) => {
                        const ta = a.data.startDate
                          ? new Date(a.data.startDate).getTime()
                          : 0
                        const tb = b.data.startDate
                          ? new Date(b.data.startDate).getTime()
                          : 0
                        return ta - tb
                      })

                      if (combined.length === 0) {
                        return (
                          <TenureEmpty>
                            {embedInModal ? (
                              '등록된 재임·재위 기록이 없습니다.'
                            ) : (
                              <>
                                등록된 재임·재위 기록이 없습니다. 위{' '}
                                <strong>수반·군주 버튼</strong>으로 추가하세요.
                              </>
                            )}
                          </TenureEmpty>
                        )
                      }

                      return (
                        <UnifiedCardList>
                          {combined.map((item) => {
                            const isReign = item.kind === 'reign'
                            const d = item.data
                            const posTitle =
                              d.positionDefinition?.title ?? d.title ?? '직책'
                            const countryName =
                              d.historicalCountry?.name ?? d.country?.name ?? null
                            const startStr = formatIsoDateKo(d.startDate)
                            const endStr = d.endDate ? formatIsoDateKo(d.endDate) : null
                            const termNum = d.termNumber ?? d.regnalNumber
                            const ageAtStart = getAgeAtDate(
                              person.birthYear,
                              person.birthMonth,
                              person.birthDay,
                              d.startDate,
                            )
                            const ageAtEnd = d.endDate
                              ? getAgeAtDate(
                                  person.birthYear,
                                  person.birthMonth,
                                  person.birthDay,
                                  d.endDate,
                                )
                              : null
                            const mainTitle = isReign && d.regnalName
                              ? `${d.regnalName} · ${posTitle}`
                              : posTitle
                            return (
                              <UnifiedCard key={`${item.kind}-${d.id}`} $kind={item.kind}>
                                <UnifiedCardMain>
                                  <UnifiedCardTopRow>
                                    <UnifiedKindBadge $kind={item.kind}>
                                      {isReign ? '재위' : '재임'}
                                    </UnifiedKindBadge>
                                    <UnifiedCardTitle>
                                      {mainTitle}
                                      {termNum != null && (
                                        <UnifiedOrdinal>
                                          {isReign ? `${termNum}대` : `제${termNum}대`}
                                        </UnifiedOrdinal>
                                      )}
                                    </UnifiedCardTitle>
                                  </UnifiedCardTopRow>
                                  <UnifiedMetaRow>
                                    {countryName && (
                                      <UnifiedMetaChip>{countryName}</UnifiedMetaChip>
                                    )}
                                    {(startStr || endStr) && (
                                      <UnifiedMetaChip $muted>
                                        {startStr || '?'} – {endStr ?? '현재'}
                                      </UnifiedMetaChip>
                                    )}
                                    {ageAtStart != null && (
                                      <UnifiedAgeBadge>
                                        {ageAtStart}세에 취임
                                      </UnifiedAgeBadge>
                                    )}
                                    {ageAtEnd != null && (
                                      <UnifiedAgeBadge>
                                        {ageAtEnd}세에 퇴임
                                      </UnifiedAgeBadge>
                                    )}
                                  </UnifiedMetaRow>
                                  {!isReign &&
                                    (d.appointmentMethod || d.endReason || d.endReasonDetail || d.notes) && (
                                      <UnifiedSubRow>
                                        {d.appointmentMethod && <span>취임: {d.appointmentMethod}</span>}
                                        {(d.endReason || d.endReasonDetail) && (
                                          <span>퇴임: {d.endReason ?? d.endReasonDetail}</span>
                                        )}
                                        {d.notes && <span>{d.notes}</span>}
                                      </UnifiedSubRow>
                                    )}
                                </UnifiedCardMain>
                                {!embedInModal && (
                                  <UnifiedEditBtn
                                    type="button"
                                    aria-label="수정"
                                    onClick={() => {
                                      playClickSound()
                                      if (isReign) {
                                        setEditingReignId(d.id)
                                        setSovereignReignModalOpen(true)
                                      } else {
                                        setEditingTenureId(d.id)
                                        setTenureModalOpen(true)
                                      }
                                    }}
                                  >
                                    <FiEdit2 size={12} />
                                  </UnifiedEditBtn>
                                )}
                              </UnifiedCard>
                            )
                          })}
                        </UnifiedCardList>
                      )
                    })()}
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

                  {/* 3.1. 국가 소속·국적 (다중) */}
                  {p.countryAffiliations && p.countryAffiliations.length > 0 && (() => {
                    const TYPE_LABELS: Record<string, string> = {
                      CITIZENSHIP: '국적',
                      BIRTH: '출생',
                      SERVED: '복무',
                      EXILE: '망명',
                      RESIDENCE: '거주',
                      DIPLOMATIC: '외교',
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
                          {sorted.map((aff) => {
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
                              start && end
                                ? `${start} ~ ${end}`
                                : start
                                  ? `${start} ~ 현재`
                                  : null
                            return (
                              <CountryAffiliationChip
                                key={aff.id ?? Math.random()}
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
                          <FiAward size={14} strokeWidth={2.2} />
                          <span>시조 가문</span>
                          {p.foundedDynasties.length > 1 && (
                            <CountMuted>{p.foundedDynasties.length}</CountMuted>
                          )}
                        </OverviewSectionHeading>
                      </OverviewSectionHeaderRow>
                      <FoundedDynastyRow>
                        {p.foundedDynasties.map((d) => (
                          <FoundedDynastyChip
                            key={d.id ?? d.name ?? Math.random()}
                            type="button"
                            onClick={() => {
                              playClickSound()
                              navigate(pathKeys.dynasty())
                            }}
                          >
                            {d.name ?? '이름 없음'}
                          </FoundedDynastyChip>
                        ))}
                      </FoundedDynastyRow>
                    </section>
                  )}

                  {/* 3.3. 학력 */}
                  {p.educations && p.educations.length > 0 && (
                    <section aria-label="학력">
                      <OverviewSectionHeaderRow>
                        <OverviewSectionHeading>
                          <FiBookOpen size={14} strokeWidth={2.2} />
                          <span>학력</span>
                          <CountMuted>{p.educations.length}</CountMuted>
                        </OverviewSectionHeading>
                      </OverviewSectionHeaderRow>
                      <SimpleEntryList>
                        {p.educations
                          .slice()
                          .sort((a, b) => {
                            const ta = a.startDate ? new Date(a.startDate).getTime() : 0
                            const tb = b.startDate ? new Date(b.startDate).getTime() : 0
                            return tb - ta
                          })
                          .map((e) => {
                            const start = formatIsoDateKo(e.startDate)
                            const end = formatIsoDateKo(e.endDate)
                            const period =
                              start && end
                                ? `${start} ~ ${end}`
                                : start
                                  ? `${start} ~ 재학중`
                                  : null
                            const subParts = [
                              e.major,
                              e.department,
                              e.classNumber != null ? `${e.classNumber}기` : null,
                              e.degree,
                            ].filter(Boolean) as string[]
                            return (
                              <SimpleEntryItem key={e.id ?? Math.random()}>
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
                    </section>
                  )}

                  {/* 3.35. 분야별 경력 */}
                  {p.careers && p.careers.length > 0 && (() => {
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
                    const grouped = p.careers.reduce<Record<string, typeof p.careers>>(
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
                      <section aria-label="분야별 경력">
                        <OverviewSectionHeaderRow>
                          <OverviewSectionHeading>
                            <FiAward size={14} strokeWidth={2.2} />
                            <span>분야별 경력</span>
                            <CountMuted>{p.careers.length}</CountMuted>
                          </OverviewSectionHeading>
                        </OverviewSectionHeaderRow>
                        <ActivityGroupList>
                          {kinds.map((k) => {
                            const list = grouped[k] ?? []
                            const sorted = list.slice().sort((a, b) => {
                              const ta = a.startDate ? new Date(a.startDate).getTime() : 0
                              const tb = b.startDate ? new Date(b.startDate).getTime() : 0
                              return tb - ta
                            })
                            return (
                              <ActivityGroup key={k}>
                                <ActivityGroupTitle>
                                  {KIND_LABELS[k] ?? k} {list.length}
                                </ActivityGroupTitle>
                                <SimpleEntryList>
                                  {sorted.map((c) => {
                                    const start = formatIsoDateKo(c.startDate)
                                    const end = formatIsoDateKo(c.endDate)
                                    const period =
                                      start && end
                                        ? `${start} ~ ${end}`
                                        : start
                                          ? `${start} ~ 현재`
                                          : null
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
                                      <SimpleEntryItem key={c.id ?? Math.random()}>
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
                      </section>
                    )
                  })()}

                  {/* 3.4. 수상·훈장 */}
                  {p.awards && p.awards.length > 0 && (
                    <section aria-label="수상·훈장">
                      <OverviewSectionHeaderRow>
                        <OverviewSectionHeading>
                          <FiAward size={14} strokeWidth={2.2} />
                          <span>수상·훈장</span>
                          <CountMuted>{p.awards.length}</CountMuted>
                        </OverviewSectionHeading>
                      </OverviewSectionHeaderRow>
                      <SimpleEntryList>
                        {p.awards
                          .slice()
                          .sort((a, b) => {
                            const ta = a.awardDate ? new Date(a.awardDate).getTime() : 0
                            const tb = b.awardDate ? new Date(b.awardDate).getTime() : 0
                            return tb - ta
                          })
                          .map((a) => (
                            <SimpleEntryItem key={a.id ?? Math.random()}>
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
                    </section>
                  )}

                  {/* 3.5. 활동·이력 — 저작/창업/조직/군부대 */}
                  {(() => {
                    const books = p.books ?? []
                    const founded = p.foundedCompanies ?? []
                    const owned = (p.companies ?? []).filter(
                      (c) => !founded.some((f) => f.id === c.id),
                    )
                    const orgRoles = p.organizationRoles ?? []
                    const milCmds = p.militaryCommands ?? []
                    const total =
                      books.length +
                      founded.length +
                      owned.length +
                      orgRoles.length +
                      milCmds.length
                    if (total === 0) return null
                    return (
                      <section aria-label="활동·이력">
                        <OverviewSectionHeaderRow>
                          <OverviewSectionHeading>
                            <FiBookOpen size={14} strokeWidth={2.2} />
                            <span>활동·이력</span>
                            <CountMuted>{total}</CountMuted>
                          </OverviewSectionHeading>
                        </OverviewSectionHeaderRow>
                        <ActivityGroupList>
                          {books.length > 0 && (
                            <ActivityGroup>
                              <ActivityGroupTitle>저작 {books.length}</ActivityGroupTitle>
                              <SimpleEntryList>
                                {books.map((b) => (
                                  <SimpleEntryItem key={b.id ?? Math.random()}>
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
                                {founded.map((c) => (
                                  <SimpleEntryItem key={c.id ?? Math.random()}>
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
                          {owned.length > 0 && (
                            <ActivityGroup>
                              <ActivityGroupTitle>관련 기업 {owned.length}</ActivityGroupTitle>
                              <SimpleEntryList>
                                {owned.map((c) => (
                                  <SimpleEntryItem key={c.id ?? Math.random()}>
                                    <SimpleEntryHeader>
                                      <SimpleEntryTitle>{c.name ?? '이름 없음'}</SimpleEntryTitle>
                                      {c.foundedAt && (
                                        <SimpleEntrySub>
                                          {formatIsoDateKo(c.foundedAt)}
                                        </SimpleEntrySub>
                                      )}
                                    </SimpleEntryHeader>
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
                                    const ta = a.startDate ? new Date(a.startDate).getTime() : 0
                                    const tb = b.startDate ? new Date(b.startDate).getTime() : 0
                                    return tb - ta
                                  })
                                  .map((o) => {
                                    const start = formatIsoDateKo(o.startDate)
                                    const end = formatIsoDateKo(o.endDate)
                                    const period =
                                      start && end
                                        ? `${start} ~ ${end}`
                                        : start
                                          ? `${start} ~ 현재`
                                          : null
                                    return (
                                      <SimpleEntryItem key={o.id ?? Math.random()}>
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
                                    const ta = a.startDate ? new Date(a.startDate).getTime() : 0
                                    const tb = b.startDate ? new Date(b.startDate).getTime() : 0
                                    return tb - ta
                                  })
                                  .map((m) => {
                                    const start = formatIsoDateKo(m.startDate)
                                    const end = formatIsoDateKo(m.endDate)
                                    const period =
                                      start && end
                                        ? `${start} ~ ${end}`
                                        : start
                                          ? `${start} ~ 현재`
                                          : null
                                    const titleParts = [m.rank, m.role].filter(Boolean) as string[]
                                    return (
                                      <SimpleEntryItem key={m.id ?? Math.random()}>
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
                      </section>
                    )
                  })()}

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
                  {!embedInModal && (
                    <FullGenealogyLinkRow>
                      <FullGenealogyLink
                        onClick={() => {
                          playClickSound()
                          window.open(`/genealogy/${person.id}/`, '_blank')
                        }}
                      >
                        <FiUsers size={14} strokeWidth={1.75} />
                        전체 가계도 보기
                      </FullGenealogyLink>
                    </FullGenealogyLinkRow>
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
                        .map((l) => {
                          const start = formatIsoDateKo(l.startDate)
                          const end = formatIsoDateKo(l.endDate)
                          const period =
                            start && end
                              ? `${start} ~ ${end}`
                              : start
                                ? `${start} ~ 현재`
                                : null
                          return (
                            <SimpleEntryItem key={l.id ?? Math.random()}>
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
                      navigate(pathKeys.events.detail(eventId))
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
                <BioMentionModalTitle title={modalTopPersonName}>
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
        <BioTermTooltipOverlay
          role="presentation"
          onClick={() => setTermTooltip(null)}
        >
          <BioTermTooltipPopover
            $x={termTooltip.x}
            $y={termTooltip.y}
            onClick={(e) => e.stopPropagation()}
          >
            <strong>{termTooltip.name}</strong>
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {termTooltip.description === null
                ? ' 로딩…'
                : termTooltip.description || '(설명 없음)'}
            </span>
          </BioTermTooltipPopover>
        </BioTermTooltipOverlay>
      )}

      {dynastyTooltip && (
        <BioTermTooltipOverlay
          role="presentation"
          onClick={() => setDynastyTooltip(null)}
        >
          <BioDynastyTooltipPopover
            $x={dynastyTooltip.x}
            $y={dynastyTooltip.y}
            onClick={(e) => e.stopPropagation()}
          >
            <strong>가문 · {dynastyTooltip.name}</strong>
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {dynastyTooltip.description === null
                ? ' 로딩…'
                : dynastyTooltip.description || '(설명 없음)'}
            </span>
          </BioDynastyTooltipPopover>
        </BioTermTooltipOverlay>
      )}
    </>
  )
}
