/**
 * 인물 상세 패널 (리스트 페이지 우측 컨텐츠 영역)
 */
import { useCallback, useMemo, useRef, useState } from 'react'

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
  FiPlus,
  FiTrash2,
  FiTrendingUp,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

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
  getInfluenceTierGradient,
  getInfluenceTierLabel,
  type InfluenceTier,
} from '@/shared/lib/influence-tier'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { glassCardMixin } from '@/shared/styles/mixins'
import { Z_INDEX } from '@/shared/styles/z-index'
import { InfluenceBadge } from '@/shared/ui/influence-badge'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { SovereignReignRegisterPanel } from '@/shared/ui/sovereign-reign-register-panel/sovereign-reign-register-panel'
import { PersonLifeEventFormModal } from '@/widgets/person/person-life-event-form-modal/person-life-event-form-modal'
import { PersonLifeTimelineInfographic } from '@/widgets/person/person-life-timeline-infographic/person-life-timeline-infographic'
import { PersonGenealogyInfographic } from '@/widgets/person/person-genealogy-infographic/person-genealogy-infographic'
import { PersonHumanRelationshipsSection } from '@/widgets/person/person-human-relationships-section/person-human-relationships-section'
import {
  type ElectionCandidacyDetail,
  PersonPoliticsSection,
} from '@/widgets/person/person-politics-section/person-politics-section'

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
  createdAt?: string | null
  isAlive?: boolean | null
  influence?: number | null
  isDeathDateUnknown?: boolean | null
  dynastyId?: string | null
  religionId?: string | null
  countryId?: string | null
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
  spouseRelations?: Array<PersonNameFields & {
    id?: string; gender?: string | null; profileImageUrl?: string | null;
    profileImages?: { url?: string | null }[] | null;
    dynasty?: { id?: string; name?: string | null } | null;
    birthDate?: string | Date | null; deathDate?: string | Date | null;
    marriageStartDate?: string | null; marriageEndDate?: string | null;
  }> | null
  governmentPositions?: unknown[]
  governmentTenures?: unknown[]
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
                <DetailCountryRow>
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
              <KpiValue>{person.country.name}</KpiValue>
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
              <KpiValue>{person.dynasty.name}</KpiValue>
            </KpiItem>
          )}
          {person.religion && (
            <KpiItem>
              <KpiLabel>종교</KpiLabel>
              <KpiValue>{person.religion.name}</KpiValue>
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

                  {/* 2.5. 사망 정보 — 유형·원인·메모 중 하나라도 있으면 표시 */}
                  {(p.deathType || p.deathCause || p.deathNote) && (
                    <section aria-label="사망 정보">
                      <OverviewSectionHeaderRow>
                        <OverviewSectionHeading>
                          <FiAlertTriangle size={14} strokeWidth={2.2} />
                          <span>사망 정보</span>
                        </OverviewSectionHeading>
                      </OverviewSectionHeaderRow>
                      <DeathInfoBlock>
                        {(p.deathType || p.deathCause) && (
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
                        )}
                        {p.deathNote && (
                          <DeathNoteText>{p.deathNote}</DeathNoteText>
                        )}
                      </DeathInfoBlock>
                    </section>
                  )}

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

const BioMentionModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  box-sizing: border-box;
`

const BioMentionModalPanel = styled(motion.div)`
  /* 공용 glassCardMixin — 다른 모달(공용 ModalBox)과 톤 일치 (다크: rgba(20,20,20,0.92)) */
  ${({ theme }) => glassCardMixin(theme)}
  position: relative;
  border-radius: 24px;
  width: 100%;
  max-width: 740px;
  height: 68vh;
  min-height: 400px;
  max-height: 78vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: ${Z_INDEX.MODAL_CONTENT};
`

const BioMentionModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 16px 20px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fafbfc'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const BioMentionModalBack = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  transition:
    color 0.15s ease,
    background 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`

const BioMentionModalTitle = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const BioMentionModalOpenDetail = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99,102,241,0.14)'
      : 'rgba(99,102,241,0.08)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'};
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#3730a3')};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.22)'
        : 'rgba(99,102,241,0.14)'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.35)'};
  }
  &:active {
    transform: translateY(1px);
  }
`

const BioMentionModalClose = styled.button`
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
  border-radius: 50%;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow: none;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
    box-shadow: none;
  }
  &:active {
    transform: scale(0.97);
  }
`

const BioMentionModalBody = styled.div`
  overflow: auto;
  flex: 1;
  min-height: 280px;
  padding: 20px 24px 32px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'};
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#cbd5e1'};
    border-radius: 4px;
  }
`

const BioTermTooltipOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: transparent;
`

const BioTermTooltipPopover = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(12px, 12px);
  max-width: 360px;
  padding: 14px 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30, 30, 30, 0.96)' : '#fff'};
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'transparent'};
  box-shadow: none;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  strong {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #0d9488;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const BioDynastyTooltipPopover = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(12px, 12px);
  max-width: 360px;
  padding: 14px 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30, 30, 30, 0.96)' : '#fff'};
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'transparent'};
  box-shadow: none;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  strong {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #6366f1;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const PanelRoot = styled.div<{ $embed?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  background: transparent;

  @media (max-width: 968px) {
    padding: ${(p) => (p.$embed ? '0' : '0')};
  }
`

const TopNavBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`

const HeaderRow = styled.header`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 36px 32px 28px;
  border-radius: 20px;
  margin-bottom: 20px;
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  box-shadow: none;
`

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  min-width: 0;
  width: 100%;
`

const AvatarButton = styled.button<{ $loading?: boolean }>`
  position: relative;
  width: 132px;
  height: 132px;
  border-radius: 9999px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  font-weight: 700;
  cursor: ${({ $loading }) => ($loading ? 'wait' : 'pointer')};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.6)' : '#94a3b8'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  padding: 0;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : '#94a3b8'};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }

  svg {
    opacity: 0.9;
  }

  &:hover > span {
    opacity: 1;
  }
`

const AvatarOverlay = styled.span`
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.42);
  color: #fff;
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
`

const AvatarSpinner = styled.span`
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: avatarSpin 0.7s linear infinite;
  @keyframes avatarSpin {
    to { transform: rotate(360deg); }
  }
`

const HeaderTitleBlock = styled.div`
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const PageTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
`

const CountryFlagImg = styled.img`
  width: 22px;
  height: 15px;
  object-fit: cover;
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: none;
`

const CountryBracket = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 8px;
  letter-spacing: 0.02em;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
`

const DetailCountryRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 4px 12px 4px 8px;
  border-radius: 100px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
        `
      : css`
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        `}
`

const DetailCountryFlagEmoji = styled.span`
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
`

const DetailCountryName = styled.span`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(203,213,225,0.9)' : '#475569'};
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.25;
  text-align: center;
  word-break: keep-all;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  @media (max-width: 640px) {
    font-size: 19px;
    white-space: normal;
  }
`

const MonarchTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
`

const MonarchCrownIcon = styled.span`
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
`

const MonarchNameLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.9)' : 'rgba(160,110,0,0.95)'};
  letter-spacing: 0.02em;
`

const MonarchPositionBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 100px;
  letter-spacing: 0.02em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.85)' : 'rgba(140,95,0,0.9)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.18)'};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.4)'};
`

const PageSubtitleInline = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 14px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#64748b'};

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }
`

const PageSubtitle = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RegisteredByline = styled.p`
  margin: 8px 0 0;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.03em;
  font-style: italic;
  font-family: Georgia, 'Times New Roman', serif;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BackToListButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  flex-shrink: 0;
  color: #6366f1;
  transition: all 0.2s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.3);
          &:hover {
            background: rgba(99, 102, 241, 0.12);
            transform: translateY(-1px);
          }
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(99, 102, 241, 0.2);
          &:hover {
            background: rgba(99, 102, 241, 0.06);
            border-color: rgba(99, 102, 241, 0.35);
            transform: translateY(-1px);
            box-shadow: none;
          }
        `}
`

const OutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  color: #6366f1;
  transition: all 0.2s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.3);
          &:hover {
            background: rgba(99, 102, 241, 0.12);
            transform: translateY(-1px);
          }
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(99, 102, 241, 0.2);
          &:hover {
            background: rgba(99, 102, 241, 0.06);
            border-color: rgba(99, 102, 241, 0.35);
            transform: translateY(-1px);
            box-shadow: none;
          }
        `}
`

const DeleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          color: rgba(252, 165, 165, 0.9);
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          &:hover {
            background: rgba(239, 68, 68, 0.16);
            border-color: rgba(239, 68, 68, 0.45);
            transform: translateY(-1px);
          }
        `
      : css`
          color: #dc2626;
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.2);
          &:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.35);
            transform: translateY(-1px);
          }
        `}
`

/* ── 삭제 확인 모달 ────────────────────────────────────────────── */

const DeleteConfirmOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const DeleteConfirmDialog = styled(motion.div)`
  width: 100%;
  max-width: 380px;
  border-radius: 20px;
  padding: 32px 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(28, 28, 32, 0.97);
          border: 1px solid rgba(239, 68, 68, 0.2);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(239, 68, 68, 0.15);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
        `}
`

const DeleteConfirmIconWrap = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: #ef4444;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.22);
        `
      : css`
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.18);
        `}
`

const DeleteConfirmTitle = styled.h2`
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DeleteConfirmPersonName = styled.p`
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #ef4444;
`

const DeleteConfirmDesc = styled.p`
  margin: 0 0 24px;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DeleteConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
`

const DeleteConfirmCancelBtn = styled.button`
  flex: 1;
  padding: 12px 0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: ${theme.colors.text.primary};
          &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); }
        `
      : css`
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          &:hover:not(:disabled) { background: #e9eef5; }
        `}
`

const DeleteConfirmDeleteBtn = styled.button<{ $loading?: boolean }>`
  flex: 1;
  padding: 12px 0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
  border: none;
  background: #ef4444;
  color: #ffffff;
  opacity: ${({ $loading }) => ($loading ? 0.7 : 1)};
  &:disabled { cursor: not-allowed; }
  &:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
  }
`

/**
 * 인물 핵심 정보 대시보드 — 헤더 아래 한 줄.
 * 카드 중첩 없이, 하나의 줄(divider) 안에서 라벨 위 / 값 아래 형식으로
 * 균등하게 나열. 정보가 적어도 빈약해 보이지 않도록 큰 타이포 + 넉넉한 패딩.
 */
const KpiStrip = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0;
  margin-bottom: 28px;
  padding: 22px 4px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
`

const KpiItem = styled.div`
  flex: 1 1 0;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 18px;
  text-align: center;

  & + & {
    border-left: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0'};
  }
  @media (max-width: 760px) {
    flex: 1 1 33.333%;
    min-width: 0;
    padding: 10px 12px;
    &:nth-child(3n+1) {
      border-left: none;
    }
  }
  @media (max-width: 480px) {
    flex: 1 1 50%;
    &:nth-child(3n+1) {
      border-left: 1px solid
        ${({ theme }) =>
          theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0'};
    }
    &:nth-child(2n+1) {
      border-left: none;
    }
  }
`

const KpiLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
`

const KpiValue = styled.span`
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.4px;
  line-height: 1.15;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  word-break: keep-all;
`

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6366f1;
`

const FullGenealogyLinkRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
`

const FullGenealogyLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.07);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
  &:hover {
    background: rgba(99, 102, 241, 0.12);
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }
`

const SectionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

const FamilyBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
`

const FamilyBadge = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.005em;
  padding: 3px 10px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#475569'};
`

/** 개요 탭 섹션 래퍼 — 섹션 간 일관된 수직 리듬 (divider 대체) */
const OverviewSections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`

const OverviewSectionHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

const OverviewSectionHeading = styled.h3`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const CountMuted = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const InlineActions = styled.div`
  display: inline-flex;
  gap: 6px;
  align-items: center;
`

const UnifiedActionRow = styled.div`
  display: inline-flex;
  gap: 6px;
`

// ─── 재임·재위 통합 카드 ───────────────────────────────────────
const UnifiedCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const unifiedKindColor = {
  tenure: { base: '#4338ca', softBg: 'rgba(99,102,241,0.1)', text: '#4338ca' },
  reign: { base: '#0f766e', softBg: 'rgba(20,184,166,0.1)', text: '#0f766e' },
} as const

const UnifiedCard = styled.div<{ $kind: 'tenure' | 'reign' }>`
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: flex-start;
  padding: 16px 20px;
  border-radius: 14px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  overflow: hidden;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 16px;
    bottom: 16px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: ${({ $kind }) => unifiedKindColor[$kind].base};
    opacity: 0.85;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.18);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
  }

  @media (max-width: 560px) {
    padding: 14px 16px;
  }
`

const UnifiedCardMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const UnifiedCardTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const UnifiedKindBadge = styled.span<{ $kind: 'tenure' | 'reign' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 3px 9px 3px 8px;
  border-radius: 999px;
  background: ${({ $kind }) => unifiedKindColor[$kind].softBg};
  color: ${({ $kind }) => unifiedKindColor[$kind].text};
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $kind }) => unifiedKindColor[$kind].base};
    flex-shrink: 0;
  }
`

const UnifiedCardTitle = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  min-width: 0;
  word-break: break-word;
`

const UnifiedOrdinal = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const UnifiedMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
`

const UnifiedMetaChip = styled.span<{ $muted?: boolean }>`
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
  background: ${({ theme, $muted }) =>
    $muted
      ? 'transparent'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(15,23,42,0.045)'};
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
`

const UnifiedAgeBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.09)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};
`

const UnifiedSubRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 2px;
`

const UnifiedEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  ${UnifiedCard}:hover & {
    opacity: 1;
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  }
`

// ─── 영향력 블록 — 티어 색상은 @/shared/lib/influence-tier에서 관리 ───
const InfluenceBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 2px 2px;
`

const InfluenceSliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const InfluenceSliderInput = styled.input`
  flex: 1;
  accent-color: #6366f1;
`

const InfluenceBar = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
  overflow: hidden;
`

const InfluenceFill = styled.div<{
  $pct: number
  $tier: InfluenceTier | null
}>`
  height: 100%;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  background: ${({ $tier }) =>
    $tier
      ? getInfluenceTierGradient($tier)
      : 'linear-gradient(90deg, #cbd5e1 0%, #94a3b8 100%)'};
  border-radius: 4px;
  transition:
    width 0.3s,
    background 0.3s;
`

const InfluenceValueGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 64px;
`

const InfluenceValue = styled.span<{ $tier: InfluenceTier | null }>`
  font-weight: 700;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  color: ${({ $tier, theme }) =>
    $tier === 'top'
      ? '#b45309'
      : $tier === 'high'
        ? '#d97706'
        : $tier === 'mid'
          ? '#4f46e5'
          : $tier === 'low'
            ? theme.colors.text.secondary
            : theme.colors.text.tertiary};
`

const InfluenceTierLabel = styled.span<{ $tier: InfluenceTier }>`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${({ $tier }) =>
    $tier === 'top'
      ? '#b45309'
      : $tier === 'high'
        ? '#d97706'
        : $tier === 'mid'
          ? '#4f46e5'
          : '#64748b'};
`

const InfluenceAnchorRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 0 2px;
`

const InfluenceAnchor = styled.div<{
  $active: boolean
  $tier: InfluenceTier | null
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.3;
  color: ${({ theme, $active, $tier }) => {
    if (!$active) return theme.colors.text.tertiary
    if ($tier === 'top') return '#b45309'
    if ($tier === 'high') return '#d97706'
    if ($tier === 'mid')
      return theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'
    return theme.colors.text.secondary
  }};
  b {
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`

// ─── 전기 빈 상태 CTA ────────────────────────────────────────
const BioEmptyClickable = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 36px 28px;
  border-radius: 16px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(99,102,241,0.2)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(99,102,241,0.02)'};
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.18)'
        : 'rgba(99,102,241,0.35)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.035)'
        : 'rgba(99,102,241,0.04)'};
  }
  &:active {
    transform: translateY(1px);
  }
`

const BioEmptyTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#475569'};
`

const BioEmptyDesc = styled.div`
  font-size: 12px;
  font-weight: 500;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BioEmptyCta = styled.span`
  margin-top: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: #6366f1;
`

const TenureAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
  color: #6366f1;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.25);
          &:hover {
            background: rgba(99, 102, 241, 0.14);
            border-color: rgba(99, 102, 241, 0.45);
            transform: translateY(-1px);
          }
        `
      : css`
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.2);
          &:hover {
            background: rgba(99, 102, 241, 0.1);
            border-color: rgba(99, 102, 241, 0.4);
            transform: translateY(-1px);
          }
        `}
`

const TenureEmpty = styled.p`
  margin: 0;
  padding: 8px 0;
  font-size: 13px;
  line-height: 1.6;
  text-align: left;
  background: transparent;
  border: none;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
  strong {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.text.secondary : '#475569'};
    font-weight: 600;
  }
`

/* ── 군주 재위 카드 ──────────────────────────── */
const ReignCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ReignCard = styled.div`
  display: flex;
  align-items: stretch;
  border-radius: 14px;
  overflow: hidden;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          &:hover { background: rgba(255,255,255,0.06); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.25); }
        `
      : css`
          background: #fff;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        `}
`

const ReignCardAccent = styled.div`
  width: 4px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
`

const ReignCardBody = styled.div`
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ReignCardTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
`

const ReignCrownIcon = styled.span`
  font-size: 14px;
  line-height: 1;
  color: #d97706;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(217,119,6,0.3));
`

const ReignCardTitle = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.02em;
  display: flex;
  align-items: baseline;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${({ theme }) =>
    theme.mode === 'dark' ? `color: ${theme.colors.text.primary};` : `color: #1e293b;`}
`

const ReignOrdinal = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #d97706;
  background: rgba(217, 119, 6, 0.1);
  border-radius: 6px;
  padding: 1px 6px;
  flex-shrink: 0;
`

const ReignEditBtn = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: transparent;
          color: ${theme.colors.text.tertiary};
          &:hover { background: rgba(255,255,255,0.08); color: ${theme.colors.text.primary}; }
        `
      : css`
          background: transparent;
          color: #94a3b8;
          &:hover { background: #f1f5f9; color: #475569; }
        `}
`

const ReignCardMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const ReignMetaChip = styled.span<{ $muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  font-size: 11.5px;
  font-weight: 500;
  border-radius: 6px;
  padding: 2px 7px;
  ${({ theme, $muted }) =>
    theme.mode === 'dark'
      ? $muted
        ? `background: rgba(255,255,255,0.05); color: ${theme.colors.text.tertiary};`
        : `background: rgba(217,119,6,0.12); color: #fbbf24;`
      : $muted
        ? `background: #f8fafc; color: #64748b;`
        : `background: rgba(217,119,6,0.08); color: #92400e;`}
`

const SectionCard = styled.div`
  border-radius: 20px;
  padding: 24px 28px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: none;
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(20, 19, 34, 0.08);
          box-shadow: none;
        `}
`

const SectionCardBio = styled.div`
  background: transparent;
  padding: 4px 0 150px;
`

const BioSectionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

const BioSectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6366f1;
`

const BioText = styled.div`
  font-size: 14.5px;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 68ch;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DeathInfoBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const DeathInfoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`

const DeathTypePill = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.005em;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.08)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#fca5a5' : '#b91c1c'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.32)' : 'rgba(239, 68, 68, 0.22)'};
`

const DeathCauseText = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DeathNoteText = styled.p`
  margin: 0;
  font-size: 13.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 68ch;
`

const BioEditorWrap = styled.div`
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
`

const BioProse = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: 0 16px;
`

/** 전기: 공통 RichTextReadView + 인물 패널만 살짝 좁은 타이포 */
const BioContent = styled(RichTextReadView)`
  font-size: 14.5px;
  line-height: 1.8;
  word-break: break-word;
  & p {
    margin: 0 0 0.75em;
  }
  & p:last-child {
    margin-bottom: 0;
  }
`

const BioEditActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
`

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: none;
  transition: all 0.2s ease;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: none;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const BioEmptyHint = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
  padding: 4px 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LoadingWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 56px 24px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 2.5px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.25)'
        : 'rgba(99, 102, 241, 0.15)'};
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const LoadingText = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ErrorWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 56px 24px;
  text-align: center;
`

const ErrorIcon = styled.div`
  font-size: 40px;
  opacity: 0.55;
`

const ErrorTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ErrorDesc = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CloseBtn = styled.button`
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: none;
  transition: all 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: none;
  }
`

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
`

const TabNav = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  padding: 10px;
  margin-bottom: 24px;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  border-radius: 20px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: none;
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(20, 19, 34, 0.08);
          box-shadow: none;
        `}
`

const TabBtn = styled.button<{ $active: boolean }>`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '700' : '600')};
  cursor: pointer;
  white-space: nowrap;
  border-radius: 12px;
  transition: all 0.2s ease;

  ${({ $active, theme }) =>
    theme.mode === 'dark'
      ? css`
          color: ${$active ? '#ffffff' : 'rgba(255,255,255,0.55)'};
          background: ${$active
            ? '#6366f1'
            : 'transparent'};
          box-shadow: none;
          svg {
            flex-shrink: 0;
            opacity: ${$active ? 1 : 0.7};
          }
          &:hover {
            ${!$active &&
            css`
              color: #a5b4fc;
              background: rgba(99, 102, 241, 0.12);
            `}
          }
        `
      : css`
          color: ${$active ? '#ffffff' : '#64748b'};
          background: ${$active
            ? '#6366f1'
            : 'transparent'};
          box-shadow: none;
          svg {
            flex-shrink: 0;
            opacity: ${$active ? 1 : 0.7};
          }
          &:hover {
            ${!$active &&
            css`
              color: #6366f1;
              background: rgba(99, 102, 241, 0.08);
            `}
          }
        `}

  @media (max-width: 768px) {
    padding: 9px 14px;
    font-size: 12px;
    gap: 6px;
  }
`

const TabContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`

const ListBlock = styled.div`
  border-radius: 20px;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: none;
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(20, 19, 34, 0.08);
          box-shadow: none;
        `}
`

const ListRowGroupLabel = styled.div`
  padding: 10px 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#6366f1')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.08)'
      : 'rgba(99, 102, 241, 0.04)'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.15)'
        : 'rgba(99, 102, 241, 0.1)'};
`

const ListRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(226, 232, 240, 0.6)'};
  transition: background 0.15s;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(99, 102, 241, 0.04)'};
  }
`

const ListRowLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-shrink: 0;
  min-width: 60px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
`

const ListRowPrimary = styled.div`
  font-size: 14px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
`

const ListRowMeta = styled.div`
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#64748b'};
`

const TenureListWrap = styled.div`
  max-width: 100%;
`

const TenureList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const TenureRow = styled.li`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 12px;
  transition: all 0.2s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          &:hover {
            border-color: rgba(99, 102, 241, 0.35);
            background: rgba(99, 102, 241, 0.08);
            transform: translateX(4px);
          }
        `
      : css`
          background: #fafbfc;
          border: 1.5px solid #e2e8f0;
          &:hover {
            background: #ffffff;
            border-color: rgba(99, 102, 241, 0.3);
            transform: translateX(4px);
            box-shadow: none;
          }
        `}
`

const TenureRowMain = styled.div`
  min-width: 0;
  flex: 1;
`

const TenureRowTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 8px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
`

const TenureRowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  font-size: 12px;
  font-weight: 500;
`

const TenureRowMetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: ${theme.colors.text.secondary};
        `
      : css`
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.12);
          color: #64748b;
        `}
`

const TenureRowAgeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 8px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          color: #a5b4fc;
          background: rgba(99, 102, 241, 0.18);
          border: 1px solid rgba(99, 102, 241, 0.3);
        `
      : css`
          color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
        `}
`

const TenureRowSub = styled.div`
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 11.5px;
  line-height: 1.6;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: ${theme.colors.text.tertiary};
        `
      : css`
          background: rgba(99, 102, 241, 0.03);
          border: 1px solid rgba(99, 102, 241, 0.08);
          color: #64748b;
        `}

  span::before {
    content: '·';
    margin-right: 4px;
    opacity: 0.4;
  }
  span:first-child::before {
    content: none;
  }
`

const TenureRowEditBtn = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 11.5px;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  color: #6366f1;
  transition: all 0.2s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.3);
          &:hover {
            background: rgba(99, 102, 241, 0.15);
            transform: translateY(-1px);
            box-shadow: none;
          }
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(99, 102, 241, 0.2);
          &:hover {
            background: rgba(99, 102, 241, 0.08);
            transform: translateY(-1px);
            box-shadow: none;
          }
        `}
`

const TenureSectionCard = styled.div`
  max-width: 720px;
  border-radius: 20px;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: none;
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(20, 19, 34, 0.08);
          box-shadow: none;
        `}
`

const TenureSectionLabel = styled.div`
  padding: 12px 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#6366f1')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.08)'
      : 'rgba(99, 102, 241, 0.04)'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.15)'
        : 'rgba(99, 102, 241, 0.1)'};
`

const TenureItem = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(226, 232, 240, 0.6)'};
  transition: background 0.15s;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(99, 102, 241, 0.04)'};
  }
`

const TenurePositionTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
`

const TenureMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 9px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const chipStyles = css`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: ${theme.colors.text.secondary};
        `
      : css`
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.12);
          color: #64748b;
        `}
`

const TenureCountryBadge = styled.span`
  ${chipStyles}
`

const TenurePeriod = styled.span`
  ${chipStyles}
`

const TenureTerm = styled.span`
  ${chipStyles}
`

const TenureSub = styled.div`
  margin-top: 6px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptyState = styled.div`
  padding: 40px 24px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  border-radius: 16px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.3)'
        : 'rgba(99, 102, 241, 0.2)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(99, 102, 241, 0.02)'};
`

