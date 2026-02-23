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
import { useNavigate, useParams } from 'react-router-dom'

import { useFormEntities } from '@/entities/event-form/model'
import {
  FORM_STEPS,
  buildEventSubmitData,
  buildMilitaryEventData,
  extractMentions,
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
import { getImageUrl } from '@/pages/events/utils/event-create.utils'
import {
  createEvent,
  getEventById,
  getEventsByParentId,
  updateEvent,
} from '@/shared/api/events'
import { uploadImage } from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { pathKeys } from '@/shared/router'
import type { MilitaryEvent } from '@/shared/types/military-event.types'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/AdvancedCountrySelectModal'
import { DatePickerModal } from '@/shared/ui/date-picker'
import {
  BasicInfoSection,
  DetailsSection,
  LocationSection,
  StepNavigation,
} from '@/widgets/event-form/ui'

import type { EventBelligerentsGraph } from '../types/belligerents-graph.types'
import type { ConferenceEvent } from '../types/conference-event.types'
import { formatDateRange } from '../utils/events.utils'
import { ConferenceEventForm } from './conference-event-form'
import * as S from './event-create.styles'
import { CATEGORY_ICON_MAP } from './events.constants'
import { searchMentionEntities } from './mention-system'
import {
  type BelligerentSide,
  type CasualtyData,
  type MilitaryConflictDetails,
  MilitaryEventForm,
} from './military-event-form'

export const EventCreatePageRefactored: React.FC = () => {
  const navigate = useNavigate()
  const { eventId: editEventId } = useParams<{ eventId?: string }>()
  const playClickSound = useClickSound()

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
  const [showCountryModal, setShowCountryModal] = useState(false)

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

  // 하위 사건들의 관계 데이터
  const [childEventsRelations, setChildEventsRelations] = useState<
    Array<{ relation: EventBelligerentsGraph; sourceName: string }>
  >([])

  // 🆕 하위 사건 선택 (기존 사건 연결)
  const [childEventIds, setChildEventIds] = useState<string[]>([])
  const [childEventSearch, setChildEventSearch] = useState('')
  const [showChildEventList, setShowChildEventList] = useState(false)
  const childEventSelectorRef = React.useRef<HTMLDivElement>(null)
  const [loadedChildEvents, setLoadedChildEvents] = useState<any[]>([])

  // 빠른 등록 (deprecated - 사용 안 함)
  const childEvents: Array<{
    title: string
    startDate?: string
    endDate?: string
    description?: string
    location?: string
    thumbnail?: string
  }> = []

  // 멘션 시스템
  const [mentionState, setMentionState] = useState<{
    sectionId: string
    cursorPosition: number
    searchTerm: string
    type: 'person' | 'event' | null
  } | null>(null)

  // 폼 단계
  const steps = useMemo(() => getFormSteps(category), [category])

  // 편집 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (!isEditMode || !editEventId) return

    const loadEvent = async () => {
      setIsLoadingEvent(true)
      try {
        const event = await getEventById(editEventId)

        // 기본 정보 설정
        setTitle(event.title)
        setDescription(event.description || '')

        // 🔧 FIX: 시작일/시간 설정
        if (event.startDate) {
          try {
            const startDateTime = new Date(event.startDate)
            if (!isNaN(startDateTime.getTime())) {
              const hours = startDateTime.getHours().toString().padStart(2, '0')
              const minutes = startDateTime
                .getMinutes()
                .toString()
                .padStart(2, '0')
              if (hours !== '00' || minutes !== '00') {
                setStartTime(`${hours}:${minutes}`)
              }
              setStartDate(event.startDate.split('T')[0])
            }
          } catch (e) {
            setStartDate(event.startDate.split('T')[0] || '')
          }
        }

        // 🔧 FIX: 종료일/시간 설정
        if (event.endDate) {
          try {
            const endDateTime = new Date(event.endDate)
            if (!isNaN(endDateTime.getTime())) {
              const hours = endDateTime.getHours().toString().padStart(2, '0')
              const minutes = endDateTime
                .getMinutes()
                .toString()
                .padStart(2, '0')
              if (hours !== '00' || minutes !== '00') {
                setEndTime(`${hours}:${minutes}`)
              }
              setEndDate(event.endDate.split('T')[0])
            }
          } catch (e) {
            setEndDate(event.endDate.split('T')[0] || '')
          }
        }

        setLocation(event.location || '')
        setKeywords(Array.isArray(event.keywords) ? event.keywords : [])

        // 썸네일 로드 (새 구조 우선, 레거시 fallback)
        if (event.eventImages && event.eventImages.length > 0) {
          const primaryImage = event.eventImages.find((img) => img.isPrimary)
          setThumbnail(
            primaryImage?.imageUrl || event.eventImages[0].imageUrl || '',
          )
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

        // 섹션 로드 (새 구조 우선, 레거시 fallback)
        if (event.eventSections && event.eventSections.length > 0) {
          // 새 구조: EventSection[] → EventSection[]
          const loadedSections = event.eventSections.map((section, index) => ({
            id: section.id,
            title: section.title,
            content: section.content,
            mentions: [], // 멘션은 별도 로직으로 추출 가능
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

        toast.success('사건 정보를 불러왔습니다')
      } catch {
        toast.error('사건 정보를 불러오는데 실패했습니다')
      } finally {
        setIsLoadingEvent(false)
      }
    }

    loadEvent()
  }, [isEditMode, editEventId])

  // 하위 사건 관계 로드
  useEffect(() => {
    if (isEditMode && editEventId) {
      getEventsByParentId(editEventId)
        .then((childEventsData) => {
          // 하위 사건 데이터와 ID 목록 설정
          setLoadedChildEvents(childEventsData)
          const childIds = childEventsData.map((child) => child.id)
          setChildEventIds(childIds)
        })
        .catch(() => {
          setLoadedChildEvents([])
          setChildEventIds([])
        })
    }
  }, [isEditMode, editEventId])

  // 제출 처리
  const handleSubmit = async () => {
    try {
      if (!validateBasicInfo({ title, startDate })) {
        return
      }

      const { mentionedPersons, mentionedEvents } = extractMentions(sections)

      const finalMilitaryEvent = isMilitaryCategory(category)
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
        relatedPersons,
        relatedEventIds,
        sections,
        militaryEvent: finalMilitaryEvent,
        conferenceEvent,
        belligerentsGraph,
        warCost,
        mentionedPersons,
        mentionedEvents,
        childEvents, // 🆕 하위 사건 빠른 추가 (deprecated)
        childEventIds, // 🆕 하위 사건 연결 (기존 사건)
        keywords,
      })

      if (isEditMode && editEventId) {
        await updateEvent(
          editEventId,
          eventData as Parameters<typeof updateEvent>[1],
        )
        toast.success('사건이 성공적으로 수정되었습니다!')
      } else {
        await createEvent(eventData as Parameters<typeof createEvent>[0])
        toast.success('사건이 성공적으로 등록되었습니다!')
      }

      navigate(pathKeys.events.root())
    } catch (error) {
      toast.error(
        `사건 등록에 실패했습니다: ${
          error instanceof Error ? error.message : '알 수 없는 오류'
        }`,
      )
    }
  }

  return (
    <S.PageWrapper>
      <S.ContentWrapper>
        {/* ===== Widget: Step Navigation ===== */}
        <StepNavigation
          steps={steps}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          playClickSound={playClickSound}
          onBack={() => navigate(pathKeys.events.root())}
        />

        {/* 우측: 폼 */}
        <S.FormArea>
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
                disabled={!isBasicInfoValid()}
              >
                <FiSave size={16} />
                {isEditMode ? '수정 완료' : '사건 등록'}
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
                            <div>
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
                  childEventsRelations={childEventsRelations}
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
              playClickSound={playClickSound}
              eventTitle={title}
              eventStartDate={startDate}
              eventEndDate={endDate}
              eventCategory={category}
              eventLocation={location}
              eventThumbnail={thumbnail}
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
    </S.PageWrapper>
  )
}

export default EventCreatePageRefactored
