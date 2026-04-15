/**
 * 인물 상세 패널 (리스트 페이지 우측 컨텐츠 영역)
 */
import { useCallback, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCalendar,
  FiCamera,
  FiEdit2,
  FiFlag,
  FiInfo,
  FiPlus,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { personKeys } from '@/entities/person/api'
import type { PersonHumanRelationshipItem } from '@/shared/api/person-human-relationships'
import { deletePerson, updatePerson } from '@/shared/api/persons'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getPersonFamilyTree } from '@/shared/api/persons-family-tree'
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
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { Z_INDEX } from '@/shared/styles/z-index'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { SovereignReignRegisterPanel } from '@/shared/ui/sovereign-reign-register-panel/sovereign-reign-register-panel'
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
  gender?: string | null
  biography?: string | null
  profileImageUrl?: string | null
  regnalName?: string | null
  templeName?: string | null
  posthumousName?: string | null
  createdAt?: string | null
  isAlive?: boolean | null
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
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [tenureModalOpen, setTenureModalOpen] = useState(false)
  const [editingTenureId, setEditingTenureId] = useState<string | null>(null)
  const [sovereignReignModalOpen, setSovereignReignModalOpen] = useState(false)
  const [editingReignId, setEditingReignId] = useState<string | null>(null)
  const [editingBiography, setEditingBiography] = useState(false)
  const [biographyDraft, setBiographyDraft] = useState('')
  const [savingBiography, setSavingBiography] = useState(false)
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

  // 군주 등록 여부 및 군주명
  // RegisterMonarchModal은 왕명을 notes에 "왕명: <name>" 형식으로 저장
  function parseRegnalNameFromNotes(notes: string | null | undefined): string | null {
    if (!notes?.trim()) return null
    const m = notes.match(/왕명\s*:\s*(.+?)(?:\n|$)/i) || notes.match(/왕명\s*:\s*(.+)/i)
    return m ? m[1].trim() : null
  }
  const firstReign = p.sovereignReigns?.[0]
  const monarchName =
    p.templeName ||
    p.regnalName ||
    parseRegnalNameFromNotes(firstReign?.notes) ||
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
            </HeaderTitleBlock>
          </HeaderLeft>
        </HeaderRow>

        {/* 기본정보 + 요약: 생몰·국가·성별·가문·종교·배우자·저작·정부직위·사건·조직 */}
        <KpiStrip $compact={embedInModal}>
          {person.country && (
            <>
              <KpiItem>
                <KpiLabel>국가</KpiLabel>
                <KpiValue>{person.country.name}</KpiValue>
              </KpiItem>
            </>
          )}
          {(person.gender === 'MALE' || person.gender === 'FEMALE') && (
            <KpiItem>
              <KpiLabel>성별</KpiLabel>
              <KpiValue>{genderLabel}</KpiValue>
            </KpiItem>
          )}
          <KpiItem>
            <KpiLabel>정부 직위</KpiLabel>
            <KpiValue>{tenuresList.length}건</KpiValue>
          </KpiItem>
          <KpiItem>
            <KpiLabel>주요 사건</KpiLabel>
            <KpiValue>{person.events?.length ?? 0}건</KpiValue>
          </KpiItem>
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
          {person.spouse && (
            <KpiItem>
              <KpiLabel>배우자</KpiLabel>
              <KpiValue>{getPersonDisplayName(person.spouse)}</KpiValue>
            </KpiItem>
          )}
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
            사건
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
                <section aria-label="등록된 직책">
                  <SectionLabelRow>
                    <SectionLabel>등록된 직책</SectionLabel>
                    {!embedInModal && (
                      <TenureAddButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setEditingTenureId(null)
                          setTenureModalOpen(true)
                        }}
                      >
                        <FiPlus size={14} />
                        수반 등록
                      </TenureAddButton>
                    )}
                  </SectionLabelRow>
                  {tenuresList.length > 0 ? (
                    <TenureList>
                        {tenuresList.map((tenure: any) => {
                          const positionTitle =
                            tenure.positionDefinition?.title ??
                            tenure.title ??
                            '직책'
                          const countryName =
                            tenure.country?.name ??
                            tenure.historicalCountry?.name ??
                            null
                          const startStr = formatIsoDateKo(tenure.startDate)
                          const endStr = tenure.endDate
                            ? formatIsoDateKo(tenure.endDate)
                            : null
                          const period = startStr
                            ? endStr
                              ? `${startStr} ~ ${endStr}`
                              : `${startStr} ~ 현재`
                            : '—'
                          const termNum =
                            tenure.termNumber ?? tenure.regnalNumber
                          const appointmentMethod = tenure.appointmentMethod
                          const endReason =
                            tenure.endReason ?? tenure.endReasonDetail
                          const notes = tenure.notes
                          const ageAtStart = getAgeAtDate(
                            person.birthYear,
                            person.birthMonth,
                            person.birthDay,
                            tenure.startDate,
                          )
                          return (
                            <TenureRow key={tenure.id}>
                              <TenureRowMain>
                                <TenureRowTitle>{positionTitle}</TenureRowTitle>
                                <TenureRowMeta>
                                  {countryName && (
                                    <TenureRowMetaItem>
                                      {countryName}
                                    </TenureRowMetaItem>
                                  )}
                                  {termNum != null && (
                                    <TenureRowMetaItem>
                                      제{termNum}대
                                    </TenureRowMetaItem>
                                  )}
                                  <TenureRowMetaItem>
                                    {period}
                                  </TenureRowMetaItem>
                                  {ageAtStart != null && (
                                    <TenureRowAgeBadge>
                                      {ageAtStart}세에 취임
                                    </TenureRowAgeBadge>
                                  )}
                                </TenureRowMeta>
                                {(appointmentMethod || endReason || notes) && (
                                  <TenureRowSub>
                                    {appointmentMethod && (
                                      <span>취임: {appointmentMethod}</span>
                                    )}
                                    {endReason && (
                                      <span>퇴임: {endReason}</span>
                                    )}
                                    {notes && <span>{notes}</span>}
                                  </TenureRowSub>
                                )}
                              </TenureRowMain>
                              {!embedInModal && (
                                <TenureRowEditBtn
                                  type="button"
                                  onClick={() => {
                                    playClickSound()
                                    setEditingTenureId(tenure.id)
                                    setTenureModalOpen(true)
                                  }}
                                >
                                  <FiEdit2 size={12} />
                                  수정
                                </TenureRowEditBtn>
                              )}
                            </TenureRow>
                          )
                        })}
                    </TenureList>
                  ) : (
                    <TenureEmpty>
                      {embedInModal ? (
                        '등록된 재임 기록이 없습니다.'
                      ) : (
                        <>
                          등록된 재임 기록이 없습니다.{' '}
                          <strong>수반 등록</strong>
                          으로 직책·국가·기간을 추가하세요.
                        </>
                      )}
                    </TenureEmpty>
                  )}
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

                <OverviewSectionDivider />

                {/* 군주 재위 섹션 */}
                <section aria-label="군주 재위">
                  <SectionLabelRow>
                    <SectionLabel>군주 재위</SectionLabel>
                    {!embedInModal && (
                      <TenureAddButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setEditingReignId(null)
                          setSovereignReignModalOpen(true)
                        }}
                      >
                        <FiPlus size={14} />
                        군주 등록
                      </TenureAddButton>
                    )}
                  </SectionLabelRow>
                  {(() => {
                    const reigns = (p.sovereignReigns ?? []) as NonNullable<typeof p.sovereignReigns>
                    if (reigns.length === 0) {
                      return (
                        <TenureEmpty>
                          {embedInModal ? (
                            '등록된 재위 기록이 없습니다.'
                          ) : (
                            <>
                              등록된 재위 기록이 없습니다.{' '}
                              <strong>군주 등록</strong>으로 재위 기간을 추가하세요.
                            </>
                          )}
                        </TenureEmpty>
                      )
                    }
                    return (
                      <ReignCardList>
                        {reigns.map((reign) => {
                          const posTitle = reign.positionDefinition?.title ?? '군주'
                          const countryName =
                            reign.historicalCountry?.name ?? reign.country?.name ?? null
                          const startStr = formatIsoDateKo(reign.startDate)
                          const endStr = reign.endDate ? formatIsoDateKo(reign.endDate) : null
                          const regnalNoteMatch = (reign.notes ?? '').match(/왕명\s*:\s*(.+?)(?:\n|$)/i) || (reign.notes ?? '').match(/왕명\s*:\s*(.+)/i)
                          const regnalNameFromNote = regnalNoteMatch ? regnalNoteMatch[1].trim() : null
                          return (
                            <ReignCard key={reign.id}>
                              <ReignCardAccent />
                              <ReignCardBody>
                                <ReignCardTopRow>
                                  <ReignCrownIcon>♛</ReignCrownIcon>
                                  <ReignCardTitle>
                                    {regnalNameFromNote
                                      ? `${regnalNameFromNote} · ${posTitle}`
                                      : posTitle}
                                    {reign.regnalNumber != null && (
                                      <ReignOrdinal>{reign.regnalNumber}대</ReignOrdinal>
                                    )}
                                  </ReignCardTitle>
                                  {!embedInModal && (
                                    <ReignEditBtn
                                      type="button"
                                      onClick={() => {
                                        playClickSound()
                                        setEditingReignId(reign.id)
                                        setSovereignReignModalOpen(true)
                                      }}
                                    >
                                      <FiEdit2 size={11} />
                                    </ReignEditBtn>
                                  )}
                                </ReignCardTopRow>
                                <ReignCardMetaRow>
                                  {countryName && (
                                    <ReignMetaChip>{countryName}</ReignMetaChip>
                                  )}
                                  {(startStr || endStr) && (
                                    <ReignMetaChip $muted>
                                      {startStr || '?'}
                                      {' – '}
                                      {endStr ?? '현재'}
                                    </ReignMetaChip>
                                  )}
                                </ReignCardMetaRow>
                              </ReignCardBody>
                            </ReignCard>
                          )
                        })}
                      </ReignCardList>
                    )
                  })()}
                </section>

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

                <OverviewSectionDivider />

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

                <OverviewSectionDivider />

                <section aria-label="전기">
                  <BioSectionLabelRow>
                    <BioSectionLabel>전기</BioSectionLabel>
                    {!editingBiography ? (
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
                        {person.biography ? '수정' : '추가'}
                      </OutlineButton>
                    ) : null}
                  </BioSectionLabelRow>
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
                  ) : (
                    <SectionCardBio>
                      <BioEmptyHint>
                        전기(약력)가 없습니다. 수정 버튼으로 추가할 수 있습니다.
                      </BioEmptyHint>
                    </SectionCardBio>
                  )}
                </section>
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
                <section aria-label="주요 사건">
                  <SectionLabel>주요 사건</SectionLabel>
                  {!person.events || person.events.length === 0 ? (
                    <EmptyState>사건 정보가 없습니다</EmptyState>
                  ) : (
                    <ListBlock>
                      {person.events.map((evt: any) => (
                        <ListRow key={evt.id}>
                          <ListRowPrimary>{evt.event?.title}</ListRowPrimary>
                          <ListRowMeta>
                            {evt.event?.startDate &&
                              new Date(evt.event.startDate).toLocaleDateString(
                                'ko-KR',
                              )}
                            {evt.role && ` · ${evt.role}`}
                          </ListRowMeta>
                        </ListRow>
                      ))}
                    </ListBlock>
                  )}
                </section>
              </TabContent>
            )}

          </AnimatePresence>
        </TabContentArea>
      </PanelRoot>

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
  position: relative;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30,30,30,0.92)' : '#ffffff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border: ${({ theme }) =>
    theme.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none'};
  border-radius: 24px;
  box-shadow: none;
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
  @media (max-width: 640px) {
    flex-basis: 50%;
    & + & {
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

/** 개요 탭 섹션(직책 / 인간관계 / 전기) 사이 구분선 */
const OverviewSectionDivider = styled.hr`
  margin: 32px 0;
  border: none;
  height: 1px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent)'
      : 'linear-gradient(90deg, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent)'};
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
