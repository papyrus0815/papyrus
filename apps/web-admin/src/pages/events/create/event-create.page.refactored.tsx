/**
 * Event Create Page - FSD Refactored
 * FSD: pages/events/create
 *
 * 이 페이지는 조립(composition) 레이어로, 비즈니스 로직은 features/entities에,
 * UI 컴포넌트는 widgets에 위임합니다.
 */
import React, { useEffect, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  FiCheck,
  FiChevronDown,
  FiFileText,
  FiGlobe,
  FiImage,
  FiPlus,
  FiSave,
  FiSearch,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'

import { useFormEntities } from '@/entities/event-form/model'
import {
  FORM_STEPS,
  buildEventSubmitData,
  buildMilitaryEventData,
  checkBasicInfo,
  extractMentions,
  extractMentionsFromHtml,
  getFormSteps,
  getStepTitle,
  isDiplomaticCategory,
  isMilitaryCategory,
  validateBasicInfo,
} from '@/features/event-create/lib'
import { type EventSection, type FormStep } from '@/features/event-create/model'
import {
  useBasicInfoForm,
  useRelationshipsForm,
} from '@/features/event-form/model'
import { eventKeys } from '@/pages/events/detail/use-event-detail'
import { getImageUrl } from '@/pages/events/utils/event-create.utils'
import {
  type EventResponseDto,
  createEvent,
  getEventById,
  getEventsByParentId,
  updateEvent,
} from '@/shared/api/events'
import { uploadImage } from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { pathKeys } from '@/shared/router'
import type { MilitaryEvent } from '@/shared/types/military-event.types'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/advanced-country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { BasicInfoSection } from '@/widgets/event-form/ui/basic-info-section'
import { DetailsSection } from '@/widgets/event-form/ui/details-section'
import { LocationSection } from '@/widgets/event-form/ui/location-section'
import { EventCabinetsSection } from '@/widgets/event-form/ui/event-cabinets-section'
import { StepNavigation } from '@/widgets/event-form/ui/step-navigation'

import type { EventBelligerentsGraph } from '../types/belligerents-graph.types'
import type { ConferenceEvent } from '../types/conference-event.types'
import { formatDateRange } from '../utils/events.utils'
import { ConferenceEventForm } from './conference-event-form'
import * as S from './event-create.styles'
import { CATEGORY_ICON_MAP } from './events.constants'
import { searchMentionEntities } from '@/shared/lib/mention/mention-system'
import {
  type BelligerentSide,
  type CasualtyData,
  type MilitaryConflictDetails,
  MilitaryEventForm,
} from './military-event-form'

export interface EventCreatePageRefactoredProps {
  /** 대시보드 등 임베드 시: 전체 화면 레이아웃 없음, onBack/onSuccess 사용 */
  embed?: boolean
  /** 뒤로가기(이전 페이지) 시 호출. 미전달 시 /events 로 이동 */
  onBack?: () => void
  /** 등록/수정 성공 시 호출. 미전달 시 /events 로 이동 */
  onSuccess?: () => void
}

export const EventCreatePageRefactored: React.FC<
  EventCreatePageRefactoredProps
> = ({ embed = false, onBack: onBackProp, onSuccess }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { eventId: editEventId } = useParams<{ eventId?: string }>()
  const playClickSound = useClickSound()

  const goBack = onBackProp ?? (() => navigate(pathKeys.events.root()))
  const handleBack = () => {
    if (
      isDirtyRef.current &&
      !window.confirm(
        '저장하지 않은 변경 사항이 있습니다. 페이지를 떠나시겠습니까?',
      )
    ) {
      return
    }
    goBack()
  }

  // 편집 모드 감지
  const isEditMode = Boolean(editEventId)

  // ===== Entity: Form Entities Data =====
  const {
    availablePersons,
    availableCountries,
    availableHistoricalCountries,
    dbCategories,
    availableMilitaryUnits,
    availableEvents,
    availablePoliticalParties,
    isLoading: isLoadingEntities,
  } = useFormEntities()

  // ===== Feature: Basic Info Form =====
  const {
    title,
    setTitle,
    description,
    setDescription,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    category,
    setCategory,
    thumbnail,
    setThumbnail,
    thumbnailFile,
    setThumbnailFile,
    location,
    setLocation,
    latitude,
    setLatitude,
    longitude,
    setLongitude,
    tags,
    setTags,
    keywords,
    setKeywords,
    relatedCountryIds,
    setRelatedCountryIds,
    relatedHistoricalCountryIds,
    setRelatedHistoricalCountryIds,
    primaryCountryId,
    setPrimaryCountryId,
    primaryHistoricalCountryId,
    setPrimaryHistoricalCountryId,
    isValid: isBasicInfoValid,
    getDateError,
    calculateDaysDifference,
  } = useBasicInfoForm()

  // ===== Feature: Relationships Form =====
  const {
    parentEventId,
    setParentEventId,
    parentEventSearch,
    setParentEventSearch,
    showParentEventList,
    setShowParentEventList,
    parentEventData,
    parentEventSelectorRef,
    filteredParentEvents,
    relatedPersons,
    setRelatedPersons,
    personSearch,
    setPersonSearch,
    showPersonList,
    setShowPersonList,
    personSelectorRef,
    filteredPersons,
    relatedEventIds,
    setRelatedEventIds,
    relatedEventSearch,
    setRelatedEventSearch,
    showRelatedEventList,
    setShowRelatedEventList,
    relatedEventSelectorRef,
    filteredRelatedEvents,
  } = useRelationshipsForm(availableEvents, availablePersons)

  // ===== Page State =====
  const [currentStep, setCurrentStep] = useState<FormStep>(FORM_STEPS.BASIC)
  const [isLoadingEvent, setIsLoadingEvent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCountryModal, setShowCountryModal] = useState(false)
  // Unsaved changes 추적 — submit 시 false로 전환되어 경고 안 뜨게 함
  const isDirtyRef = React.useRef(false)
  // 편집 모드: 초기 로드 직후엔 dirty 아님 (사용자 입력만 dirty 처리)
  const skipNextDirtyRef = React.useRef(false)

  // 군사 카테고리 전용 필드
  const [militaryEvent, setMilitaryEvent] = useState<MilitaryEvent>({
    belligerentSides: [],
    relations: [],
    militaryDetails: {
      conflictType: undefined,
      combatTypes: [],
    },
    casualties: [],
    warCost: '',
  })

  // 레거시 구조 (하위 호환성)
  const [belligerents, setBelligerents] = useState<BelligerentSide[]>([])
  const [belligerentsGraph, setBelligerentsGraph] =
    useState<EventBelligerentsGraph>({
      countries: [],
      relations: [],
    })
  const [casualties, setCasualties] = useState<{
    [sideId: string]: CasualtyData
  }>({})
  const [militaryDetails, setMilitaryDetails] =
    useState<MilitaryConflictDetails>({
      type: 'battle',
      combatType: ['land'],
      outcome: '',
    })
  const [warCost, setWarCost] = useState('')

  // 회담/외교 카테고리 전용 필드
  const [conferenceEvent, setConferenceEvent] = useState<ConferenceEvent>({
    participants: [],
    treaties: [],
    countryTerms: [],
  })

  // 섹션 기반 내용 작성
  const [sections, setSections] = useState<EventSection[]>([
    { id: '1', title: 'Part 1', content: '', mentions: [] },
  ])

  // 🆕 하위 사건 선택 (기존 사건 연결)
  const [childEventIds, setChildEventIds] = useState<string[]>([])
  const [childEventSearch, setChildEventSearch] = useState('')
  const [showChildEventList, setShowChildEventList] = useState(false)
  const childEventSelectorRef = React.useRef<HTMLDivElement>(null)
  const [loadedChildEvents, setLoadedChildEvents] = useState<
    EventResponseDto[]
  >([])

  // 멘션 시스템
  const [mentionState, setMentionState] = useState<{
    sectionId: string
    cursorPosition: number
    searchTerm: string
    type: 'person' | 'event' | null
  } | null>(null)

  // 사용자가 한 번이라도 제출을 시도했는지 — 제출 전엔 inline 에러 숨김
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const validation = useMemo(
    () => checkBasicInfo({ title, startDate, endDate }),
    [title, startDate, endDate],
  )

  // 폼 단계
  const steps = useMemo(() => getFormSteps(category), [category])

  // 편집 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (!isEditMode || !editEventId) return

    // editEventId가 빠르게 바뀔 때(예: 뒤로/앞으로) 이전 요청 결과로 덮어쓰지
    // 못하도록 mounted 플래그로 가드. AbortController가 없는 SDK 호출이라
    // 응답 자체는 막을 수 없지만 setState는 차단함.
    let cancelled = false
    setIsLoadingEvent(true)

    const loadEvent = async () => {
      try {
        // 본 사건 + 하위 사건 목록을 병렬로 받음 (두 호출은 서로 의존 없음).
        // 어느 한쪽이 실패해도 가능한 한 다른 쪽 결과는 반영하기 위해 allSettled.
        const [eventResult, childResult] = await Promise.allSettled([
          getEventById(editEventId),
          getEventsByParentId(editEventId),
        ])
        if (cancelled) return

        // 하위 사건 결과 처리
        if (childResult.status === 'fulfilled') {
          setLoadedChildEvents(childResult.value)
          setChildEventIds(childResult.value.map((c) => c.id))
        } else {
          console.error(
            '[EventCreatePage] 하위 사건 로드 실패:',
            childResult.reason,
          )
          setLoadedChildEvents([])
          setChildEventIds([])
        }

        // 메인 사건 실패 시 알림 후 종료
        if (eventResult.status !== 'fulfilled') {
          throw eventResult.reason
        }
        const event = eventResult.value

        // 기본 정보 설정
        setTitle(event.title)
        setDescription(event.description || '')

        // ISO 문자열에서 날짜·시간 분리. 자정(00:00)도 명시 입력으로 인정 —
        // 원본 ISO에 시간 부분이 있으면 그대로 시간 필드에 채워, 자정 시작
        // 사건이 다음 저장에서 시간 정보 손실되지 않게 함.
        const splitDateTime = (
          iso: string,
        ): { date: string; time: string } => {
          const date = iso.split('T')[0] || ''
          const m = iso.match(/T(\d{2}):(\d{2})/)
          // 원본 문자열에 시간이 명시돼 있을 때만 time을 채움. 시간 부분이
          // 없는 ISO("YYYY-MM-DD")는 시간 미입력으로 처리.
          return { date, time: m ? `${m[1]}:${m[2]}` : '' }
        }

        if (event.startDate) {
          const { date, time } = splitDateTime(event.startDate)
          setStartDate(date)
          if (time) setStartTime(time)
        }

        if (event.endDate) {
          const { date, time } = splitDateTime(event.endDate)
          setEndDate(date)
          if (time) setEndTime(time)
        }

        setLocation(event.location || '')
        setKeywords(Array.isArray(event.keywords) ? event.keywords : [])

        // 썸네일 로드 (새 구조 우선, 레거시 fallback)
        type LoadedImage = {
          imageUrl: string
          isPrimary?: boolean
        }
        const eventImages = event.eventImages as LoadedImage[] | undefined
        if (eventImages && eventImages.length > 0) {
          const primaryImage = eventImages.find((img) => img.isPrimary)
          setThumbnail(primaryImage?.imageUrl || eventImages[0].imageUrl || '')
        } else if (event.thumbnail) {
          setThumbnail(event.thumbnail)
        }

        // 🔧 FIX: 카테고리는 ID를 저장해야 함
        if (event.categoryId) {
          setCategory(event.categoryId)
        }

        // 관련 국가 로드
        if (event.relatedCountryIds) {
          setRelatedCountryIds(event.relatedCountryIds)
        }
        if (event.relatedHistoricalCountryIds) {
          setRelatedHistoricalCountryIds(event.relatedHistoricalCountryIds)
        }
        // 메인 국가 복원 — role==='INITIATOR'인 항목을 찾아 primary state에 세팅
        // event는 API 응답 (any에 가까운 loose type) — relation은 {id, role, ...} 형태.
        type CountryRel = { id: string; role?: string | null }
        const initiatorCountry = (
          event.relatedCountries as CountryRel[] | undefined
        )?.find((c) => c.role === 'INITIATOR')
        if (initiatorCountry) {
          setPrimaryCountryId(initiatorCountry.id)
        }
        const initiatorHist = (
          event.relatedHistoricalCountries as CountryRel[] | undefined
        )?.find((c) => c.role === 'INITIATOR')
        if (initiatorHist) {
          setPrimaryHistoricalCountryId(initiatorHist.id)
        }

        // 섹션 로드 (새 구조 우선, 레거시 fallback)
        type LoadedSection = { id: string; title: string; content: string }
        const eventSections = event.eventSections as
          | LoadedSection[]
          | undefined
        if (eventSections && eventSections.length > 0) {
          // 본문 HTML에서 entity-link 멘션 복원 — 편집 후 저장 시 멘션
          // 메타데이터(relatedPersons/relatedEventIds)가 사라지지 않도록 함
          const loadedSections = eventSections.map((section) => ({
            id: section.id,
            title: section.title,
            content: section.content,
            mentions: extractMentionsFromHtml(section.content),
          }))
          setSections(loadedSections)
        } else if (event.sections) {
          // 레거시 구조
          if (
            typeof event.sections === 'object' &&
            !Array.isArray(event.sections)
          ) {
            if (event.sections.items && Array.isArray(event.sections.items)) {
              setSections(event.sections.items)
            }
          } else if (Array.isArray(event.sections)) {
            setSections(event.sections)
          }
        }

        // 군사 정보 설정 (간소화)
        if ('militaryEvent' in event && event.militaryEvent) {
          setMilitaryEvent(event.militaryEvent)
        }

        // 회담 정보 설정
        if ('conferenceEvent' in event && event.conferenceEvent) {
          setConferenceEvent(event.conferenceEvent)
        }

        // 상위 사건 로드
        if (event.parentEventId) {
          setParentEventId(event.parentEventId)
          if (event.parentEvent?.title) {
            setParentEventSearch(event.parentEvent.title)
          }
        }

        // 관련 인물 로드 (PersonEvent 행 → relatedPersons 폼 형태로 매핑)
        if (
          'relatedPersons' in event &&
          Array.isArray(
            (event as { relatedPersons?: unknown }).relatedPersons,
          )
        ) {
          const rp = (
            event as {
              relatedPersons?: Array<{
                personId: string
                role?: string | null
                note?: string | null
              }>
            }
          ).relatedPersons
          if (rp) {
            setRelatedPersons(
              rp.map((p) => ({
                personId: p.personId,
                role: p.role ?? '',
                note: p.note ?? '',
              })),
            )
          }
        }

        // 관련 사건 ID 로드 (relatedEventIds — 평면 배열로 들어오는 경우)
        if (
          'relatedEventIds' in event &&
          Array.isArray(
            (event as { relatedEventIds?: unknown }).relatedEventIds,
          )
        ) {
          setRelatedEventIds(
            (event as { relatedEventIds?: string[] }).relatedEventIds ?? [],
          )
        }

        if (!cancelled) toast.success('사건 정보를 불러왔습니다')
      } catch (error) {
        if (!cancelled) {
          console.error('[EventCreatePage] 사건 로드 실패:', error)
          toast.error('사건 정보를 불러오는데 실패했습니다')
        }
      } finally {
        if (!cancelled) setIsLoadingEvent(false)
      }
    }

    loadEvent()
    return () => {
      cancelled = true
    }
  }, [isEditMode, editEventId])

  // 폼 입력 추적 — 첫 렌더와 편집 모드 로딩 직후엔 dirty 처리하지 않음
  useEffect(() => {
    if (skipNextDirtyRef.current) {
      skipNextDirtyRef.current = false
      return
    }
    isDirtyRef.current = true
  }, [
    title,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    category,
    thumbnail,
    location,
    keywords,
    relatedCountryIds,
    relatedHistoricalCountryIds,
    parentEventId,
    relatedPersons,
    relatedEventIds,
    sections,
    militaryEvent,
    conferenceEvent,
    belligerentsGraph,
    warCost,
    childEventIds,
  ])

  // 편집 모드 로딩이 끝나면 다음 렌더의 dirty 갱신 한 번 무시
  useEffect(() => {
    if (!isLoadingEvent) {
      skipNextDirtyRef.current = true
    }
  }, [isLoadingEvent])

  // beforeunload — 새로고침/탭 닫기 시 경고
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      e.preventDefault()
      // 최신 브라우저는 사용자 메시지를 무시하지만 기본 경고는 띄움
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // 제출 처리
  const handleSubmit = async () => {
    if (isSubmitting) return // 중복 제출 방지
    setSubmitAttempted(true)
    try {
      if (!validateBasicInfo({ title, startDate })) {
        // 첫 단계로 되돌려 inline 에러를 보여줌
        setCurrentStep(FORM_STEPS.BASIC)
        return
      }

      setIsSubmitting(true)
      const { mentionedPersons, mentionedEvents } = extractMentions(sections)

      // 카테고리 변경 후 이전 카테고리 데이터가 잔존해도 서버에 보내지 않도록
      // 카테고리별로 한 번 더 게이팅. (UI 상으로는 보존돼서, 카테고리를 다시
      // 군사/외교로 되돌리면 입력값이 살아남음.)
      const isMilitary = isMilitaryCategory(category)
      const isDiplomatic = isDiplomaticCategory(category)

      const finalMilitaryEvent = isMilitary
        ? buildMilitaryEventData(category, {
            belligerents,
            belligerentsGraph,
            militaryDetails,
            casualties,
            warCost,
          })
        : undefined

      const eventData = buildEventSubmitData({
        title: title.trim(),
        description: description.trim(),
        startDate,
        startTime,
        endDate,
        endTime,
        category,
        location,
        thumbnail,
        parentEventId,
        tags,
        relatedCountryIds,
        relatedHistoricalCountryIds,
        primaryCountryId,
        primaryHistoricalCountryId,
        relatedPersons,
        relatedEventIds,
        sections,
        militaryEvent: finalMilitaryEvent,
        conferenceEvent: isDiplomatic ? conferenceEvent : undefined,
        belligerentsGraph: isMilitary
          ? belligerentsGraph
          : { countries: [], relations: [] },
        warCost: isMilitary ? warCost : '',
        mentionedPersons,
        mentionedEvents,
        childEventIds, // 하위 사건 연결 (기존 사건)
        keywords,
      })

      // 이동 대상 사건 id — 수정은 editEventId, 생성은 응답 id.
      let targetId: string | undefined = editEventId
      if (isEditMode && editEventId) {
        await updateEvent(
          editEventId,
          eventData as Parameters<typeof updateEvent>[1],
        )
        toast.success('사건이 성공적으로 수정되었습니다!')
      } else {
        const created = await createEvent(
          eventData as Parameters<typeof createEvent>[0],
        )
        targetId = created.id
        toast.success('사건이 성공적으로 등록되었습니다!')
      }

      // 저장 성공 — 더 이상 dirty 아님 (이탈 경고 비활성화)
      isDirtyRef.current = false

      // 목록 캐시 무효화 — 이후 목록 복귀 시 새/수정 사건이 반영되도록.
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })

      if (onSuccess) {
        onSuccess()
      } else if (targetId) {
        // 등록·수정 후 *해당 사건 상세*로. 등록은 보통 본문·이미지·관계를 이어서
        // 채우므로, 목록으로 빠지는 것보다 상세로 진입해 작업을 잇는 편이 자연스럽다.
        navigate(pathKeys.events.detail(targetId), { viewTransition: true })
      } else {
        navigate(pathKeys.events.root())
      }
    } catch (error) {
      console.error('[EventCreatePage] 사건 저장 실패:', error)
      toast.error(
        `사건 ${isEditMode ? '수정' : '등록'}에 실패했습니다: ${
          error instanceof Error ? error.message : '알 수 없는 오류'
        }`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const content = (
    <>
    <S.ContentWrapper>
        {/* ===== Widget: Step Navigation ===== */}
        <StepNavigation
          steps={steps}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          playClickSound={playClickSound}
          onBack={handleBack}
        />

        {/* 우측: 폼 */}
        <S.FormArea aria-busy={isLoadingEvent || isSubmitting}>
          {(isLoadingEvent || isSubmitting) && (
            <S.FormOverlay role="status" aria-live="polite">
              <S.OverlaySpinner />
              <span>
                {isLoadingEvent
                  ? '사건 정보를 불러오는 중...'
                  : isEditMode
                    ? '수정 사항을 저장하는 중...'
                    : '사건을 등록하는 중...'}
              </span>
            </S.FormOverlay>
          )}
          <S.FormAreaHeader>
            <S.FormAreaTitle>
              {getStepTitle(currentStep, category)}
            </S.FormAreaTitle>
            <div style={{ display: 'flex', gap: '8px' }}>
              <S.ActionButton
                type="button"
                $variant="primary"
                onClick={() => {
                  playClickSound()
                  handleSubmit()
                }}
                disabled={
                  !isBasicInfoValid() || isSubmitting || isLoadingEvent
                }
                title={
                  isLoadingEvent
                    ? '사건 정보를 불러오는 중'
                    : isSubmitting
                      ? '저장 중...'
                      : !isBasicInfoValid()
                        ? (validation.firstError ??
                          '기본 정보를 입력해야 저장할 수 있습니다')
                        : undefined
                }
                aria-disabled={
                  !isBasicInfoValid() || isSubmitting || isLoadingEvent
                }
              >
                <FiSave size={16} />
                {isSubmitting
                  ? isEditMode
                    ? '수정 중...'
                    : '등록 중...'
                  : isEditMode
                    ? '수정 완료'
                    : '사건 등록'}
              </S.ActionButton>
            </div>
          </S.FormAreaHeader>

          {/* ===== Widget: Basic Info Section ===== */}
          {currentStep === FORM_STEPS.BASIC && (
            <BasicInfoSection
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              startDate={startDate}
              setStartDate={setStartDate}
              startTime={startTime}
              setStartTime={setStartTime}
              endDate={endDate}
              setEndDate={setEndDate}
              endTime={endTime}
              setEndTime={setEndTime}
              category={category}
              setCategory={setCategory}
              thumbnail={thumbnail}
              setThumbnail={setThumbnail}
              setThumbnailFile={setThumbnailFile}
              keywords={keywords}
              setKeywords={setKeywords}
              dbCategories={dbCategories}
              relatedCountryIds={relatedCountryIds}
              setRelatedCountryIds={setRelatedCountryIds}
              relatedHistoricalCountryIds={relatedHistoricalCountryIds}
              setRelatedHistoricalCountryIds={setRelatedHistoricalCountryIds}
              primaryCountryId={primaryCountryId}
              setPrimaryCountryId={setPrimaryCountryId}
              primaryHistoricalCountryId={primaryHistoricalCountryId}
              setPrimaryHistoricalCountryId={setPrimaryHistoricalCountryId}
              availableCountries={availableCountries}
              availableHistoricalCountries={availableHistoricalCountries}
              onOpenCountryModal={() => setShowCountryModal(true)}
              conflictType={militaryDetails.type}
              setConflictType={(type) =>
                setMilitaryDetails({ ...militaryDetails, type })
              }
              combatTypes={militaryDetails.combatType}
              setCombatTypes={(types) =>
                setMilitaryDetails({ ...militaryDetails, combatType: types })
              }
              playClickSound={playClickSound}
              getDateError={getDateError}
              calculateDaysDifference={calculateDaysDifference}
              titleError={
                submitAttempted ? validation.fields.title : undefined
              }
              startDateError={
                submitAttempted ? validation.fields.startDate : undefined
              }
              endDateError={
                // 종료일 < 시작일 에러는 사용자가 인지하기 좋게 즉시 노출
                validation.fields.endDate
              }
            />
          )}

          {/* 🆕 하위 사건 선택 (기존 사건 연결) */}
          {currentStep === FORM_STEPS.RELATIONSHIPS && (
            <S.FormSection
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <S.FormRow>
                <S.FormLabel>하위 사건</S.FormLabel>
                <S.FormField>
                  <S.ParentEventSelector ref={childEventSelectorRef}>
                    <S.ParentEventInputWrapper>
                      <FiSearch size={16} />
                      <S.ParentEventInput
                        type="text"
                        placeholder="하위 사건으로 추가할 사건 검색..."
                        value={childEventSearch}
                        onChange={(e) => {
                          setChildEventSearch(e.target.value)
                          setShowChildEventList(true)
                        }}
                        onFocus={() => setShowChildEventList(true)}
                      />
                      <S.ToggleButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setShowChildEventList(!showChildEventList)
                        }}
                      >
                        <FiChevronDown
                          size={16}
                          style={{
                            transform: showChildEventList
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                          }}
                        />
                      </S.ToggleButton>
                    </S.ParentEventInputWrapper>
                    {showChildEventList && (
                      <S.ParentEventList>
                        {availableEvents
                          .filter((event) =>
                            event.title
                              .toLowerCase()
                              .includes(childEventSearch.toLowerCase()),
                          )
                          .filter((event) => event.id !== editEventId)
                          .filter((event) => !event.parentEventId)
                          .map((event) => {
                            const isSelected = childEventIds.includes(event.id)
                            return (
                              <S.ParentEventItem
                                key={event.id}
                                $selected={isSelected}
                                onClick={() => {
                                  playClickSound()
                                  if (isSelected) {
                                    setChildEventIds((prev) =>
                                      prev.filter((id) => id !== event.id),
                                    )
                                  } else {
                                    setChildEventIds((prev) => [
                                      ...prev,
                                      event.id,
                                    ])
                                  }
                                }}
                              >
                                {isSelected && <FiCheck size={14} />}
                                <span>{event.title}</span>
                                {event.startDate && (
                                  <S.ParentEventDate>
                                    {new Date(event.startDate).getFullYear()}
                                  </S.ParentEventDate>
                                )}
                              </S.ParentEventItem>
                            )
                          })}
                      </S.ParentEventList>
                    )}
                  </S.ParentEventSelector>
                  {childEventIds.length > 0 && (
                    <S.SelectedEventsList>
                      {childEventIds.map((eventId) => {
                        // availableEvents와 loadedChildEvents 모두에서 찾기
                        const event =
                          availableEvents.find((e) => e.id === eventId) ||
                          loadedChildEvents.find((e) => e.id === eventId)
                        return (
                          <S.SelectedEventInfo key={eventId}>
                            <FiCheck size={14} />
                            <span>
                              {event?.title || `알 수 없음 (${eventId})`}
                            </span>
                            <S.ClearButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setChildEventIds((prev) =>
                                  prev.filter((id) => id !== eventId),
                                )
                              }}
                            >
                              <FiX size={12} />
                            </S.ClearButton>
                          </S.SelectedEventInfo>
                        )
                      })}
                    </S.SelectedEventsList>
                  )}
                  <S.Hint>
                    💡 <strong>하위 사건 연결 안내:</strong>
                    <br />
                    • 기존 등록된 사건들 중에서 선택하여 이 사건의 하위 사건으로
                    연결할 수 있습니다
                    <br />
                    • 여러 개의 사건을 선택할 수 있습니다
                    <br />• 예시: "제2차 세계대전"에 "폴란드 침공", "노르망디
                    상륙작전" 등을 연결
                  </S.Hint>
                </S.FormField>
              </S.FormRow>
            </S.FormSection>
          )}

          {/* 관계 설정: 상위 사건, 관련 인물, 관련 사건 */}
          {currentStep === FORM_STEPS.RELATIONSHIPS && (
            <S.FormSection
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              {/* 상위 사건 */}
              <S.FormRow>
                <S.FormLabel>상위 사건</S.FormLabel>
                <S.FormField>
                  <S.ParentEventSelector ref={parentEventSelectorRef}>
                    <S.ParentEventInputWrapper>
                      <FiSearch size={16} />
                      <S.ParentEventInput
                        type="text"
                        placeholder="상위 사건 검색..."
                        value={parentEventSearch}
                        onChange={(e) => {
                          setParentEventSearch(e.target.value)
                          setShowParentEventList(true)
                        }}
                        onFocus={() => setShowParentEventList(true)}
                      />
                      {parentEventId && (
                        <S.ClearButton
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setParentEventId('')
                            setParentEventSearch('')
                          }}
                        >
                          <FiX size={14} />
                        </S.ClearButton>
                      )}
                      <S.ToggleButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setShowParentEventList(!showParentEventList)
                        }}
                      >
                        <FiChevronDown
                          size={16}
                          style={{
                            transform: showParentEventList
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </S.ToggleButton>
                    </S.ParentEventInputWrapper>
                    {showParentEventList && (
                      <S.ParentEventList>
                        {filteredParentEvents.length > 0 ? (
                          filteredParentEvents.map((event) => (
                            <S.ParentEventItem
                              key={event.id}
                              $selected={parentEventId === event.id}
                              onClick={() => {
                                playClickSound()
                                setParentEventId(event.id)
                                setParentEventSearch(event.title)
                                setShowParentEventList(false)
                              }}
                            >
                              <S.ParentEventIcon
                                $category={event.category?.name || 'other'}
                              >
                                {React.createElement(
                                  event.category?.name
                                    ? CATEGORY_ICON_MAP[event.category.name] ||
                                        FiFileText
                                    : FiFileText,
                                  {
                                    size: 16,
                                  },
                                )}
                              </S.ParentEventIcon>
                              <S.ParentEventInfo>
                                <S.ParentEventTitle>
                                  {event.title}
                                </S.ParentEventTitle>
                                <S.ParentEventMeta>
                                  {event.category?.name || '카테고리 없음'} ·{' '}
                                  {event.startDate
                                    ? formatDateRange(
                                        event.startDate,
                                        event.endDate || undefined,
                                      )
                                    : '날짜 없음'}
                                </S.ParentEventMeta>
                              </S.ParentEventInfo>
                              {parentEventId === event.id && (
                                <FiCheck size={16} color="#22c55e" />
                              )}
                            </S.ParentEventItem>
                          ))
                        ) : (
                          <S.EmptyState>
                            <FiSearch size={24} />
                            <p>검색 결과가 없습니다</p>
                          </S.EmptyState>
                        )}
                      </S.ParentEventList>
                    )}
                  </S.ParentEventSelector>
                  {parentEventId && (
                    <S.SelectedEventInfo>
                      <FiCheck size={14} />
                      <span>
                        선택됨:{' '}
                        {
                          availableEvents.find((e) => e.id === parentEventId)
                            ?.title
                        }
                      </span>
                    </S.SelectedEventInfo>
                  )}
                  <S.Hint>
                    이 사건이 다른 사건의 하위 사건인 경우 상위 사건을
                    선택하세요 (예: 노르망디 상륙작전 → 제2차 세계 대전)
                  </S.Hint>
                </S.FormField>
              </S.FormRow>

              {/* 관련 인물 */}
              <S.FormRow>
                <S.FormLabel>관련 인물</S.FormLabel>
                <S.FormField>
                  <S.PersonSelector ref={personSelectorRef}>
                    <S.ParentEventInputWrapper>
                      <FiSearch size={16} />
                      <S.ParentEventInput
                        type="text"
                        placeholder="인물 검색..."
                        value={personSearch}
                        onChange={(e) => {
                          setPersonSearch(e.target.value)
                          setShowPersonList(true)
                        }}
                        onFocus={() => setShowPersonList(true)}
                      />
                      <S.ToggleButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setShowPersonList(!showPersonList)
                        }}
                      >
                        <FiChevronDown
                          size={16}
                          style={{
                            transform: showPersonList
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </S.ToggleButton>
                    </S.ParentEventInputWrapper>
                    {showPersonList && (
                      <S.ParentEventList>
                        {filteredPersons.length > 0 ? (
                          filteredPersons.map((person) => {
                            const isSelected = relatedPersons.some(
                              (p) => p.personId === person.id,
                            )
                            return (
                              <S.ParentEventItem
                                key={person.id}
                                $selected={isSelected}
                                onClick={() => {
                                  playClickSound()
                                  if (isSelected) {
                                    setRelatedPersons((prev) =>
                                      prev.filter(
                                        (p) => p.personId !== person.id,
                                      ),
                                    )
                                  } else {
                                    setRelatedPersons((prev) => [
                                      ...prev,
                                      {
                                        personId: person.id,
                                        role: '',
                                        note: '',
                                      },
                                    ])
                                  }
                                  setShowPersonList(false)
                                  setPersonSearch('')
                                }}
                              >
                                <S.ParentEventIcon $category="political">
                                  <FiUsers size={16} />
                                </S.ParentEventIcon>
                                <S.ParentEventInfo>
                                  <S.ParentEventTitle>
                                    {person.name || '이름 없음'}
                                  </S.ParentEventTitle>
                                  <S.ParentEventMeta>
                                    {person.birthYear
                                      ? `${person.birthYear}년`
                                      : '정보 없음'}
                                  </S.ParentEventMeta>
                                </S.ParentEventInfo>
                                {isSelected && (
                                  <FiCheck size={16} color="#22c55e" />
                                )}
                              </S.ParentEventItem>
                            )
                          })
                        ) : (
                          <S.EmptyState>
                            <FiSearch size={24} />
                            <p>검색 결과가 없습니다</p>
                          </S.EmptyState>
                        )}
                      </S.ParentEventList>
                    )}
                  </S.PersonSelector>
                  {relatedPersons.length > 0 && (
                    <S.SelectedPersonsList>
                      {relatedPersons.map((person) => {
                        const personData = availablePersons.find(
                          (p) => p.id === person.personId,
                        )
                        return (
                          <S.SelectedPersonItem key={person.personId}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong>{personData?.name || '이름 없음'}</strong>
                              <S.Input
                                type="text"
                                placeholder="역할 (예: 총사령관, 외교관)"
                                value={person.role}
                                onChange={(e) => {
                                  setRelatedPersons((prev) =>
                                    prev.map((p) =>
                                      p.personId === person.personId
                                        ? { ...p, role: e.target.value }
                                        : p,
                                    ),
                                  )
                                }}
                                style={{ marginTop: '8px', fontSize: '12px' }}
                              />
                              <S.Textarea
                                placeholder="이 인물 시점의 사건 메모 — 인물 연보에 그대로 표시됩니다 (예: 1군단 사령관으로 노르망디 작전 지휘 / 다리 부상 후 영국 송환)"
                                value={person.note}
                                onChange={(e) => {
                                  setRelatedPersons((prev) =>
                                    prev.map((p) =>
                                      p.personId === person.personId
                                        ? { ...p, note: e.target.value }
                                        : p,
                                    ),
                                  )
                                }}
                                rows={3}
                                style={{ marginTop: '6px', fontSize: '12px' }}
                              />
                            </div>
                            <S.ClearButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setRelatedPersons((prev) =>
                                  prev.filter(
                                    (p) => p.personId !== person.personId,
                                  ),
                                )
                              }}
                            >
                              <FiX size={14} />
                            </S.ClearButton>
                          </S.SelectedPersonItem>
                        )
                      })}
                    </S.SelectedPersonsList>
                  )}
                  <S.Hint>이 사건과 관련된 주요 인물을 추가하세요</S.Hint>
                </S.FormField>
              </S.FormRow>

              {/* 관련 사건 */}
              <S.FormRow>
                <S.FormLabel>관련 사건</S.FormLabel>
                <S.FormField>
                  <S.ParentEventSelector ref={relatedEventSelectorRef}>
                    <S.ParentEventInputWrapper>
                      <FiSearch size={16} />
                      <S.ParentEventInput
                        type="text"
                        placeholder="관련 사건 검색..."
                        value={relatedEventSearch}
                        onChange={(e) => {
                          setRelatedEventSearch(e.target.value)
                          setShowRelatedEventList(true)
                        }}
                        onFocus={() => setShowRelatedEventList(true)}
                      />
                      <S.ToggleButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setShowRelatedEventList(!showRelatedEventList)
                        }}
                      >
                        <FiChevronDown
                          size={16}
                          style={{
                            transform: showRelatedEventList
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </S.ToggleButton>
                    </S.ParentEventInputWrapper>
                    {showRelatedEventList && (
                      <S.ParentEventList>
                        {filteredRelatedEvents.length > 0 ? (
                          filteredRelatedEvents.map((event) => {
                            const isSelected = relatedEventIds.includes(
                              event.id,
                            )
                            return (
                              <S.ParentEventItem
                                key={event.id}
                                $selected={isSelected}
                                onClick={() => {
                                  playClickSound()
                                  if (isSelected) {
                                    setRelatedEventIds((prev) =>
                                      prev.filter((id) => id !== event.id),
                                    )
                                  } else {
                                    setRelatedEventIds((prev) => [
                                      ...prev,
                                      event.id,
                                    ])
                                  }
                                  setShowRelatedEventList(false)
                                  setRelatedEventSearch('')
                                }}
                              >
                                <S.ParentEventIcon
                                  $category={event.category?.name || 'other'}
                                >
                                  {React.createElement(
                                    event.category?.name
                                      ? CATEGORY_ICON_MAP[
                                          event.category.name
                                        ] || FiFileText
                                      : FiFileText,
                                    {
                                      size: 16,
                                    },
                                  )}
                                </S.ParentEventIcon>
                                <S.ParentEventInfo>
                                  <S.ParentEventTitle>
                                    {event.title}
                                  </S.ParentEventTitle>
                                  <S.ParentEventMeta>
                                    {event.category?.name || '카테고리 없음'} ·{' '}
                                    {event.startDate
                                      ? formatDateRange(
                                          event.startDate,
                                          event.endDate || undefined,
                                        )
                                      : '날짜 없음'}
                                  </S.ParentEventMeta>
                                </S.ParentEventInfo>
                                {isSelected && (
                                  <FiCheck size={16} color="#22c55e" />
                                )}
                              </S.ParentEventItem>
                            )
                          })
                        ) : (
                          <S.EmptyState>
                            <FiSearch size={24} />
                            <p>검색 결과가 없습니다</p>
                          </S.EmptyState>
                        )}
                      </S.ParentEventList>
                    )}
                  </S.ParentEventSelector>
                  {relatedEventIds.length > 0 && (
                    <S.SelectedEventsList>
                      {relatedEventIds.map((eventId) => {
                        const event = availableEvents.find(
                          (e) => e.id === eventId,
                        )
                        return (
                          <S.SelectedEventInfo key={eventId}>
                            <FiCheck size={14} />
                            <span>{event?.title || '알 수 없음'}</span>
                            <S.ClearButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setRelatedEventIds((prev) =>
                                  prev.filter((id) => id !== eventId),
                                )
                              }}
                              style={{ marginLeft: '8px' }}
                            >
                              <FiX size={12} />
                            </S.ClearButton>
                          </S.SelectedEventInfo>
                        )
                      })}
                    </S.SelectedEventsList>
                  )}
                  <S.Hint>
                    상위 사건 외에 연관된 다른 사건들을 추가하세요
                  </S.Hint>
                </S.FormField>
              </S.FormRow>
            </S.FormSection>
          )}

          {/* ===== Widget: Military Event Form ===== */}
          {currentStep === FORM_STEPS.MILITARY &&
            isMilitaryCategory(category) && (
              <S.FormSection
                as={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <MilitaryEventForm
                  militaryEvent={militaryEvent}
                  setMilitaryEvent={setMilitaryEvent}
                  belligerents={belligerents}
                  setBelligerents={setBelligerents}
                  casualties={casualties}
                  setCasualties={setCasualties}
                  militaryDetails={militaryDetails}
                  setMilitaryDetails={setMilitaryDetails}
                  warCost={warCost}
                  setWarCost={setWarCost}
                  availableCountries={availableCountries}
                  availableHistoricalCountries={availableHistoricalCountries}
                  availableMilitaryUnits={availableMilitaryUnits}
                  availablePersons={availablePersons}
                  parentEvent={
                    parentEventData &&
                    parentEventData.belligerents &&
                    typeof parentEventData.belligerents === 'object' &&
                    'sides' in parentEventData.belligerents &&
                    Array.isArray(parentEventData.belligerents.sides)
                      ? {
                          id: parentEventData.id,
                          title: parentEventData.title,
                          belligerents: {
                            sides: parentEventData.belligerents
                              .sides as BelligerentSide[],
                          },
                        }
                      : undefined
                  }
                  belligerentsGraph={belligerentsGraph}
                  setBelligerentsGraph={setBelligerentsGraph}
                />
              </S.FormSection>
            )}

          {/* ===== Widget: Conference Event Form ===== */}
          {currentStep === FORM_STEPS.MILITARY &&
            isDiplomaticCategory(category) && (
              <S.FormSection
                as={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ConferenceEventForm
                  conferenceEvent={conferenceEvent}
                  setConferenceEvent={setConferenceEvent}
                  availableCountries={availableCountries}
                  availableHistoricalCountries={availableHistoricalCountries}
                  availablePersons={availablePersons}
                />
              </S.FormSection>
            )}

          {/* ===== Widget: Details Section ===== */}
          {currentStep === FORM_STEPS.DETAILS && (
            <DetailsSection
              sections={sections}
              setSections={setSections}
              availablePersons={availablePersons}
              availableEvents={availableEvents}
              availableCountries={availableCountries}
              availableHistoricalCountries={availableHistoricalCountries}
              availableMilitaryUnits={availableMilitaryUnits}
              availablePoliticalParties={availablePoliticalParties}
              mentionEntitiesLoading={isLoadingEntities}
              playClickSound={playClickSound}
              eventTitle={title}
              eventStartDate={startDate}
              eventEndDate={endDate}
              eventCategory={category}
              eventLocation={location}
              eventThumbnail={thumbnail}
            />
          )}

          {/* ===== 관련 행정부 (CabinetEvent N:M) — 편집 모드에서만 ===== */}
          {currentStep === FORM_STEPS.DETAILS && isEditMode && editEventId && (
            <EventCabinetsSection
              eventId={editEventId}
              relatedCountryIds={relatedCountryIds}
              relatedHistoricalCountryIds={relatedHistoricalCountryIds}
            />
          )}

          {/* ===== Widget: Location Section ===== */}
          {currentStep === FORM_STEPS.LOCATION && (
            <LocationSection
              location={location}
              setLocation={setLocation}
              latitude={latitude}
              setLatitude={setLatitude}
              longitude={longitude}
              setLongitude={setLongitude}
            />
          )}
        </S.FormArea>
      </S.ContentWrapper>

      {/* 국가 선택 모달 - 인물 페이지와 동일한 스타일 */}
      <AdvancedCountrySelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSelect={(country) => {
          if (country.isHistorical) {
            if (relatedHistoricalCountryIds.includes(country.id)) {
              setRelatedHistoricalCountryIds(
                relatedHistoricalCountryIds.filter((id) => id !== country.id),
              )
            } else {
              setRelatedHistoricalCountryIds([
                ...relatedHistoricalCountryIds,
                country.id,
              ])
            }
          } else {
            if (relatedCountryIds.includes(country.id)) {
              setRelatedCountryIds(
                relatedCountryIds.filter((id) => id !== country.id),
              )
            } else {
              setRelatedCountryIds([...relatedCountryIds, country.id])
            }
          }
        }}
        modernCountries={availableCountries}
        historicalCountries={availableHistoricalCountries}
        title="관련 국가 선택"
        selectedCountryIds={[
          ...relatedCountryIds,
          ...relatedHistoricalCountryIds,
        ]}
        multiSelect={true}
      />
    </>
  )

  if (embed) {
    return (
      <div style={{ width: '100%', minHeight: 0, overflow: 'auto' }}>
        {content}
      </div>
    )
  }
  return <S.PageWrapper>{content}</S.PageWrapper>
}

export default EventCreatePageRefactored
