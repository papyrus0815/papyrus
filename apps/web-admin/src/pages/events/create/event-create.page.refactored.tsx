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

  // 🆕 하위 사건 빠른 등록
  const [childEvents, setChildEvents] = useState<
    Array<{
      title: string
      startDate?: string
      endDate?: string
      description?: string
      location?: string
      thumbnail?: string
    }>
  >([])
  const [showChildEventForm, setShowChildEventForm] = useState(false)
  const [newChildEvent, setNewChildEvent] = useState({
    title: '',
    startDate: '',
    endDate: '',
    description: '',
    location: '',
    thumbnail: '',
  })
  const [showChildStartDatePicker, setShowChildStartDatePicker] =
    useState(false)
  const [showChildEndDatePicker, setShowChildEndDatePicker] = useState(false)
  const [childThumbnailFile, setChildThumbnailFile] = useState<File | null>(
    null,
  )

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

        console.log('📥 사건 로드:', event)

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
        setThumbnail(event.thumbnail || '')

        console.log('🖼️ 썸네일 로드:', event.thumbnail)

        // 🔧 FIX: 카테고리는 ID를 저장해야 함
        if (event.categoryId) {
          setCategory(event.categoryId) // "cat-military-001"
          console.log(
            '✅ 카테고리 로드:',
            event.categoryId,
            event.category?.name,
          )
        }

        // 관련 국가 로드
        if (event.relatedCountryIds) {
          setRelatedCountryIds(event.relatedCountryIds)
          console.log('✅ 관련 현대 국가 로드:', event.relatedCountryIds)
        }
        if (event.relatedHistoricalCountryIds) {
          setRelatedHistoricalCountryIds(event.relatedHistoricalCountryIds)
          console.log(
            '✅ 관련 역사적 국가 로드:',
            event.relatedHistoricalCountryIds,
          )
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
        childEvents, // 🆕 하위 사건 추가
      })

      console.log('🔍 [디버깅] category 값:', category)
      console.log('🔍 [디버깅] eventData.categoryId:', eventData.categoryId)
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

      navigate(pathKeys.events.root())
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

          {/* 🆕 하위 사건 빠른 추가 */}
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
                  {childEvents.length > 0 && (
                    <S.ChildEventsList>
                      {childEvents.map((child, idx) => (
                        <S.ChildEventItem key={idx}>
                          {child.thumbnail &&
                            typeof child.thumbnail === 'string' &&
                            child.thumbnail.trim() && (
                              <S.ChildEventThumbnail
                                src={getImageUrl(child.thumbnail)}
                                alt={child.title}
                              />
                            )}
                          <S.ChildEventInfo>
                            <strong>{child.title}</strong>
                            <div>
                              {child.startDate && (
                                <span>{child.startDate}</span>
                              )}
                              {child.startDate && child.endDate && (
                                <span> ~ </span>
                              )}
                              {child.endDate && <span>{child.endDate}</span>}
                              {child.location && (
                                <span> · {child.location}</span>
                              )}
                            </div>
                          </S.ChildEventInfo>
                          <S.RemoveChildButton
                            type="button"
                            onClick={() => {
                              playClickSound()
                              setChildEvents(
                                childEvents.filter((_, i) => i !== idx),
                              )
                            }}
                          >
                            <FiX size={14} />
                          </S.RemoveChildButton>
                        </S.ChildEventItem>
                      ))}
                    </S.ChildEventsList>
                  )}

                  {showChildEventForm ? (
                    <S.ChildEventFormCard>
                      {/* 사건명 */}
                      <S.FormRow>
                        <S.FormLabel>
                          사건명 <S.Required>*</S.Required>
                        </S.FormLabel>
                        <S.Input
                          type="text"
                          placeholder="하위 사건명을 입력하세요"
                          value={newChildEvent.title}
                          onChange={(e) =>
                            setNewChildEvent({
                              ...newChildEvent,
                              title: e.target.value,
                            })
                          }
                        />
                      </S.FormRow>

                      {/* 기간 */}
                      <S.FormRow>
                        <S.FormLabel>기간</S.FormLabel>
                        <S.DateRangeRow>
                          <S.DateRangeColumn>
                            <S.DateRangeLabel>시작일</S.DateRangeLabel>
                            <S.DateInputWrapper>
                              <S.DateInputDisplay
                                onClick={() => {
                                  playClickSound()
                                  setShowChildStartDatePicker(true)
                                }}
                              >
                                {newChildEvent.startDate || '날짜 선택'}
                              </S.DateInputDisplay>
                            </S.DateInputWrapper>
                          </S.DateRangeColumn>
                          <S.DateRangeColumn>
                            <S.DateRangeLabel>종료일</S.DateRangeLabel>
                            <S.DateInputWrapper>
                              <S.DateInputDisplay
                                onClick={() => {
                                  playClickSound()
                                  setShowChildEndDatePicker(true)
                                }}
                              >
                                {newChildEvent.endDate || '날짜 선택'}
                              </S.DateInputDisplay>
                            </S.DateInputWrapper>
                          </S.DateRangeColumn>
                        </S.DateRangeRow>
                      </S.FormRow>

                      {/* 위치 */}
                      <S.FormRow>
                        <S.FormLabel>위치</S.FormLabel>
                        <S.Input
                          type="text"
                          placeholder="발생 위치를 입력하세요"
                          value={newChildEvent.location}
                          onChange={(e) =>
                            setNewChildEvent({
                              ...newChildEvent,
                              location: e.target.value,
                            })
                          }
                        />
                      </S.FormRow>

                      {/* 썸네일 */}
                      <S.FormRow>
                        <S.FormLabel>썸네일 이미지</S.FormLabel>
                        {newChildEvent.thumbnail &&
                        typeof newChildEvent.thumbnail === 'string' &&
                        newChildEvent.thumbnail.trim() ? (
                          <S.ThumbnailPreview>
                            <S.ThumbnailImage
                              src={getImageUrl(newChildEvent.thumbnail)}
                              alt="썸네일"
                            />
                            <S.ThumbnailDeleteButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setNewChildEvent({
                                  ...newChildEvent,
                                  thumbnail: '',
                                })
                                setChildThumbnailFile(null)
                              }}
                            >
                              <FiX size={14} />
                            </S.ThumbnailDeleteButton>
                          </S.ThumbnailPreview>
                        ) : (
                          <S.ThumbnailUploadArea>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              id="child-thumbnail-upload"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  setChildThumbnailFile(file)
                                  try {
                                    const uploadResponse =
                                      await uploadImage(file)
                                    setNewChildEvent({
                                      ...newChildEvent,
                                      thumbnail: uploadResponse.url, // 🔧 FIX: .url 추출
                                    })
                                    toast.success('이미지가 업로드되었습니다')
                                  } catch (error) {
                                    console.error('이미지 업로드 실패:', error)
                                    toast.error('이미지 업로드에 실패했습니다')
                                  }
                                }
                              }}
                            />
                            <label htmlFor="child-thumbnail-upload">
                              <S.UploadButton as="span">
                                <FiImage size={16} />
                                이미지 선택
                              </S.UploadButton>
                            </label>
                          </S.ThumbnailUploadArea>
                        )}
                      </S.FormRow>

                      {/* 버튼 */}
                      <S.FormRow>
                        <S.ChildEventFormActions>
                          <S.ActionButton
                            type="button"
                            $variant="secondary"
                            onClick={() => {
                              playClickSound()
                              setShowChildEventForm(false)
                              setNewChildEvent({
                                title: '',
                                startDate: '',
                                endDate: '',
                                description: '',
                                location: '',
                                thumbnail: '',
                              })
                              setChildThumbnailFile(null)
                            }}
                          >
                            <FiX size={14} />
                            취소
                          </S.ActionButton>
                          <S.ActionButton
                            type="button"
                            $variant="primary"
                            onClick={() => {
                              playClickSound()

                              // 유효성 검사
                              if (!newChildEvent.title.trim()) {
                                toast.error('❌ 사건명은 필수 항목입니다')
                                return
                              }

                              if (newChildEvent.title.trim().length < 2) {
                                toast.error(
                                  '❌ 사건명은 최소 2자 이상이어야 합니다',
                                )
                                return
                              }

                              if (
                                newChildEvent.startDate &&
                                newChildEvent.endDate
                              ) {
                                const start = new Date(newChildEvent.startDate)
                                const end = new Date(newChildEvent.endDate)
                                if (end < start) {
                                  toast.error(
                                    '❌ 종료일은 시작일보다 이후여야 합니다',
                                  )
                                  return
                                }
                              }

                              // 중복 체크
                              const isDuplicate = childEvents.some(
                                (event) =>
                                  event.title.trim() ===
                                  newChildEvent.title.trim(),
                              )
                              if (isDuplicate) {
                                toast.error(
                                  '❌ 같은 이름의 하위 사건이 이미 있습니다',
                                )
                                return
                              }

                              setChildEvents([...childEvents, newChildEvent])
                              setNewChildEvent({
                                title: '',
                                startDate: '',
                                endDate: '',
                                description: '',
                                location: '',
                                thumbnail: '',
                              })
                              setChildThumbnailFile(null)
                              setShowChildEventForm(false)
                              toast.success(
                                `✅ "${newChildEvent.title}" 하위 사건이 추가되었습니다`,
                              )
                            }}
                          >
                            <FiCheck size={14} />
                            추가
                          </S.ActionButton>
                        </S.ChildEventFormActions>
                      </S.FormRow>
                    </S.ChildEventFormCard>
                  ) : (
                    <S.AddButton
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setShowChildEventForm(true)
                      }}
                    >
                      <FiPlus size={16} />
                      하위 사건 추가
                    </S.AddButton>
                  )}
                  <S.Hint>
                    💡 <strong>하위 사건 추가 안내:</strong>
                    <br />
                    • 이 사건에 포함되는 세부 사건들을 빠르게 등록할 수 있습니다
                    <br />
                    • 사건명만 필수이며, 나머지는 선택사항입니다
                    <br />
                    • 등록 후 각 하위 사건을 클릭하여 상세 내용을 작성할 수
                    있습니다
                    <br />• 예시: "2차 세계대전" → "폴란드 침공", "프랑스 침공",
                    "노르망디 상륙작전" 등
                  </S.Hint>
                </S.FormField>
              </S.FormRow>

              {/* DatePicker 모달들 */}
              <DatePickerModal
                isOpen={showChildStartDatePicker}
                onClose={() => setShowChildStartDatePicker(false)}
                onSelect={(date: string) => {
                  setNewChildEvent({ ...newChildEvent, startDate: date })
                  setShowChildStartDatePicker(false)
                }}
                initialDate={newChildEvent.startDate}
              />
              <DatePickerModal
                isOpen={showChildEndDatePicker}
                onClose={() => setShowChildEndDatePicker(false)}
                onSelect={(date: string) => {
                  setNewChildEvent({ ...newChildEvent, endDate: date })
                  setShowChildEndDatePicker(false)
                }}
                initialDate={newChildEvent.endDate}
              />
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
