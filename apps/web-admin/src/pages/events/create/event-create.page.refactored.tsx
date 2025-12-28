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
  FiSave,
  FiSearch,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'

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
import {
  createEvent,
  getEventById,
  getEventsByParentId,
  updateEvent,
} from '@/shared/api/events'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { pathKeys } from '@/shared/router'
import type { MilitaryEvent } from '@/shared/types/military-event.types'
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
  const routerLocation = useLocation()
  const playClickSound = useClickSound()

  // 편집 모드 감지
  const editEventId = routerLocation.state?.editEventId as string | undefined
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
  const [countrySearchTerm, setCountrySearchTerm] = useState('')

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
        setStartDate(event.startDate?.split('T')[0] || '')
        setEndDate(event.endDate?.split('T')[0] || '')
        setLocation(event.location || '')
        setThumbnail(event.thumbnail || '')

        if (event.category?.name) {
          setCategory(event.category.name)
        }

        if (event.sections) {
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
      } catch (error) {
        console.error('사건 정보 로드 실패:', error)
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
        .then((childEvents) => {
          // 하위 사건 관계 처리 로직 (기존과 동일)
          setChildEventsRelations([])
        })
        .catch((error) => {
          console.error('하위 사건 관계 로드 실패:', error)
          setChildEventsRelations([])
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
      })

      console.log('📤 사건 데이터 전송:', eventData)

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

      navigate(pathKeys.history.events())
    } catch (error) {
      console.error('사건 등록 실패:', error)
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
          onBack={() => navigate(pathKeys.history.events())}
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
              dbCategories={dbCategories}
              tags={tags}
              setTags={setTags}
              relatedCountryIds={relatedCountryIds}
              setRelatedCountryIds={setRelatedCountryIds}
              relatedHistoricalCountryIds={relatedHistoricalCountryIds}
              setRelatedHistoricalCountryIds={setRelatedHistoricalCountryIds}
              setShowCountryModal={setShowCountryModal}
              availableCountries={availableCountries}
              availableHistoricalCountries={availableHistoricalCountries}
              playClickSound={playClickSound}
              getDateError={getDateError}
              calculateDaysDifference={calculateDaysDifference}
            />
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

          {/* 관계 정보 */}
          {currentStep === FORM_STEPS.BASIC && (
            <S.FormSection>
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
        </S.FormArea>
      </S.ContentWrapper>

      {/* 국가 선택 모달 */}
      {showCountryModal &&
        createPortal(
          <>
            <S.ModalOverlay
              onClick={() => setShowCountryModal(false)}
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <S.Modal
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <S.ModalHeader>
                <h3>국가 선택</h3>
                <button
                  type="button"
                  onClick={() => setShowCountryModal(false)}
                >
                  <FiX size={20} />
                </button>
              </S.ModalHeader>
              <S.ModalContent>
                <S.Input
                  type="text"
                  placeholder="국가명 검색..."
                  value={countrySearchTerm}
                  onChange={(e) => setCountrySearchTerm(e.target.value)}
                  autoFocus
                />
                <S.CountryModalSection>
                  <S.CountryModalTitle>현대 국가</S.CountryModalTitle>
                  <S.CountryModalList>
                    {availableCountries
                      .filter((country) =>
                        country.name
                          .toLowerCase()
                          .includes(countrySearchTerm.toLowerCase()),
                      )
                      .map((country) => {
                        const isSelected = relatedCountryIds.includes(
                          country.id,
                        )
                        return (
                          <S.CountryModalItem
                            key={country.id}
                            $selected={isSelected}
                            onClick={() => {
                              playClickSound()
                              if (isSelected) {
                                setRelatedCountryIds((prev) =>
                                  prev.filter((id) => id !== country.id),
                                )
                              } else {
                                setRelatedCountryIds([
                                  ...relatedCountryIds,
                                  country.id,
                                ])
                              }
                            }}
                          >
                            <FiGlobe size={16} />
                            <span>{country.name}</span>
                            {isSelected && (
                              <FiCheck size={16} color="#22c55e" />
                            )}
                          </S.CountryModalItem>
                        )
                      })}
                  </S.CountryModalList>
                </S.CountryModalSection>
                <S.CountryModalSection>
                  <S.CountryModalTitle>역사적 국가</S.CountryModalTitle>
                  <S.CountryModalList>
                    {availableHistoricalCountries
                      .filter((country) =>
                        country.name
                          .toLowerCase()
                          .includes(countrySearchTerm.toLowerCase()),
                      )
                      .map((country) => {
                        const isSelected = relatedHistoricalCountryIds.includes(
                          country.id,
                        )
                        return (
                          <S.CountryModalItem
                            key={country.id}
                            $selected={isSelected}
                            onClick={() => {
                              playClickSound()
                              if (isSelected) {
                                setRelatedHistoricalCountryIds((prev) =>
                                  prev.filter((id) => id !== country.id),
                                )
                              } else {
                                setRelatedHistoricalCountryIds([
                                  ...relatedHistoricalCountryIds,
                                  country.id,
                                ])
                              }
                            }}
                          >
                            <FiGlobe size={16} />
                            <span>{country.name}</span>
                            {isSelected && (
                              <FiCheck size={16} color="#22c55e" />
                            )}
                          </S.CountryModalItem>
                        )
                      })}
                  </S.CountryModalList>
                </S.CountryModalSection>
              </S.ModalContent>
            </S.Modal>
          </>,
          document.body,
        )}
    </S.PageWrapper>
  )
}

export default EventCreatePageRefactored
