/**
 * Event Create Page — BASIC 전용 최소 등록 폼.
 *
 * 정책: 등록은 *기본 정보*(사건명·기간·카테고리·썸네일·키워드·관련 국가)만 받고,
 * 나머지(본문·참여 인물·군사 모듈·상위/하위 사건 등)는 모두 *상세 페이지에서 인라인*으로
 * 등록한다. 과거의 거대한 다단계 폼(군사/외교/관계/위치 스텝)은 상세 인라인 편집으로
 * 대체되어 제거되었다.
 *
 * 저장 직후 해당 사건 상세로 이동해 사용자가 곧바로 내용을 이어 채우도록 유도한다.
 */
import React, { useEffect, useMemo, useState } from 'react'

import { toast } from 'react-hot-toast'
import { FiSave } from 'react-icons/fi'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'

import { invalidateGamification } from '@/entities/gamification'
import { useFormEntities } from '@/entities/event-form/model'
import {
  FORM_STEPS,
  buildEventSubmitData,
  checkBasicInfo,
  getFormSteps,
  getStepTitle,
  validateBasicInfo,
} from '@/features/event-create/lib'
import { useBasicInfoForm } from '@/features/event-form/model'
import {
  type EventDetail,
  eventDetailQueryOptions,
  eventKeys,
} from '@/pages/events/detail/use-event-detail'
import {
  type EventResponseDto,
  createEvent,
  getEventById,
  updateEvent,
} from '@/shared/api/events'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { pathKeys } from '@/shared/router'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/advanced-country-select-modal'
import { BasicInfoSection } from '@/widgets/event-form/ui/basic-info-section'
import { StepNavigation } from '@/widgets/event-form/ui/step-navigation'

import * as S from './event-create.styles'

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

  const isEditMode = Boolean(editEventId)

  // ===== Entity: Form Entities Data =====
  const { availableCountries, availableHistoricalCountries, dbCategories } =
    useFormEntities()

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
    setThumbnailFile,
    location,
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

  // ===== Page State =====
  const [isLoadingEvent, setIsLoadingEvent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const isDirtyRef = React.useRef(false)
  const skipNextDirtyRef = React.useRef(false)

  /**
   * BASIC 섹션의 군사 카테고리 빠른 입력(분쟁/전투 유형) 자리표시 — 최소 폼에서는
   * 저장하지 않고 상세 작전 정보 모듈에서 등록한다. 위젯 props 호환을 위한 로컬 state.
   */
  const [conflictType, setConflictType] = useState<
    'battle' | 'campaign' | 'war' | 'siege' | 'skirmish' | undefined
  >(undefined)
  const [combatTypes, setCombatTypes] = useState<
    Array<'land' | 'naval' | 'air'>
  >([])

  const validation = useMemo(
    () => checkBasicInfo({ title, startDate, endDate }),
    [title, startDate, endDate],
  )

  // 단일 스텝(BASIC)만 노출 — 나머지는 상세에서 등록.
  const steps = useMemo(
    () => getFormSteps(category).filter((s) => s.id === FORM_STEPS.BASIC),
    [category],
  )

  // 편집 모드: 기본 정보만 로드 (본문·군사·관계 등은 상세에서 편집).
  useEffect(() => {
    if (!isEditMode || !editEventId) return
    let cancelled = false
    setIsLoadingEvent(true)

    const loadEvent = async () => {
      try {
        const event = await getEventById(editEventId)
        if (cancelled) return

        setTitle(event.title)
        setDescription(event.description || '')

        const splitDateTime = (
          iso: string,
        ): { date: string; time: string } => {
          const date = iso.split('T')[0] || ''
          const m = iso.match(/T(\d{2}):(\d{2})/)
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

        setKeywords(Array.isArray(event.keywords) ? event.keywords : [])

        type LoadedImage = { imageUrl: string; isPrimary?: boolean }
        const eventImages = event.eventImages as LoadedImage[] | undefined
        if (eventImages && eventImages.length > 0) {
          const primaryImage = eventImages.find((img) => img.isPrimary)
          setThumbnail(primaryImage?.imageUrl || eventImages[0].imageUrl || '')
        } else if (event.thumbnail) {
          setThumbnail(event.thumbnail)
        }

        if (event.categoryId) setCategory(event.categoryId)

        if (event.relatedCountryIds)
          setRelatedCountryIds(event.relatedCountryIds)
        if (event.relatedHistoricalCountryIds)
          setRelatedHistoricalCountryIds(event.relatedHistoricalCountryIds)

        type CountryRel = { id: string; role?: string | null }
        const initiator = (
          event.relatedCountries as CountryRel[] | undefined
        )?.find((c) => c.role === 'INITIATOR')
        if (initiator) setPrimaryCountryId(initiator.id)
        const initiatorHist = (
          event.relatedHistoricalCountries as CountryRel[] | undefined
        )?.find((c) => c.role === 'INITIATOR')
        if (initiatorHist) setPrimaryHistoricalCountryId(initiatorHist.id)

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

  // 폼 입력 추적 — 첫 렌더와 편집 로딩 직후엔 dirty 처리 안 함.
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
    keywords,
    relatedCountryIds,
    relatedHistoricalCountryIds,
    primaryCountryId,
    primaryHistoricalCountryId,
  ])

  useEffect(() => {
    if (!isLoadingEvent) skipNextDirtyRef.current = true
  }, [isLoadingEvent])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const handleSubmit = async () => {
    if (isSubmitting) return
    setSubmitAttempted(true)
    try {
      if (!validateBasicInfo({ title, startDate })) return

      setIsSubmitting(true)
      // 상세 페이지 청크를 미리 데워 저장 직후 이동이 매끄럽도록.
      void import('../detail/event-detail.page')

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
        parentEventId: '',
        tags: [],
        relatedCountryIds,
        relatedHistoricalCountryIds,
        primaryCountryId,
        primaryHistoricalCountryId,
        relatedPersons: [],
        relatedEventIds: [],
        sections: [],
        militaryEvent: undefined,
        conferenceEvent: undefined,
        belligerentsGraph: { countries: [], relations: [] },
        warCost: '',
        mentionedPersons: [],
        mentionedEvents: [],
        childEventIds: [],
        keywords,
      })

      let targetId: string | undefined = editEventId
      let saved: EventResponseDto | undefined
      if (isEditMode && editEventId) {
        saved = await updateEvent(
          editEventId,
          eventData as Parameters<typeof updateEvent>[1],
        )
        toast.success('사건이 성공적으로 수정되었습니다!')
      } else {
        saved = await createEvent(eventData as Parameters<typeof createEvent>[0])
        targetId = saved.id
        toast.success('사건이 등록되었습니다. 상세에서 내용을 이어서 등록하세요.')
      }

      isDirtyRef.current = false
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      invalidateGamification(queryClient)

      if (onSuccess) {
        setIsSubmitting(false)
        onSuccess()
      } else if (targetId) {
        if (saved) {
          queryClient.setQueryData(
            eventKeys.detail(targetId),
            saved as unknown as EventDetail,
          )
        }
        await queryClient.ensureQueryData(eventDetailQueryOptions(targetId))
        navigate(pathKeys.events.detail(targetId), {
          viewTransition: true,
          replace: true,
        })
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
      setIsSubmitting(false)
    }
  }

  const content = (
    <>
      <S.ContentWrapper>
        <StepNavigation
          steps={steps}
          currentStep={FORM_STEPS.BASIC}
          setCurrentStep={() => {}}
          playClickSound={playClickSound}
          onBack={handleBack}
        />

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
              {getStepTitle(FORM_STEPS.BASIC, category)}
            </S.FormAreaTitle>
            <div style={{ display: 'flex', gap: '8px' }}>
              <S.ActionButton
                type="button"
                $variant="primary"
                onClick={() => {
                  playClickSound()
                  handleSubmit()
                }}
                disabled={!isBasicInfoValid() || isSubmitting || isLoadingEvent}
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
            conflictType={conflictType}
            setConflictType={setConflictType}
            combatTypes={combatTypes}
            setCombatTypes={setCombatTypes}
            playClickSound={playClickSound}
            getDateError={getDateError}
            calculateDaysDifference={calculateDaysDifference}
            titleError={submitAttempted ? validation.fields.title : undefined}
            startDateError={
              submitAttempted ? validation.fields.startDate : undefined
            }
            endDateError={validation.fields.endDate}
          />
        </S.FormArea>
      </S.ContentWrapper>

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
