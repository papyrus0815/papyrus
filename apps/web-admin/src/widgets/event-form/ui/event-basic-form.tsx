/**
 * 사건 기본 정보 폼 **본체** — 셸(페이지·모달) 중립.
 *
 * 정책: 등록은 *기본 정보*(사건명·기간·카테고리·썸네일·키워드·관련 국가)만 받고,
 * 나머지(본문·참여 인물·군사 모듈·상위/하위 사건 등)는 모두 *상세 페이지에서 인라인*으로
 * 등록한다. 과거의 거대한 다단계 폼(군사/외교/관계/위치 스텝)은 상세 인라인 편집으로
 * 대체되어 제거되었다.
 *
 * 이 컴포넌트는 **폼 필드만** 렌더한다. 헤더·저장 버튼·로딩 오버레이·저장 후 이동은
 * 셸의 몫이다(`PersonRegisterView`가 폼 본체만 렌더하고 모달/페이지 외곽을 셸이 감싸는
 * 사내 선례와 동일한 분리). 셸은 다음으로 본체와 대화한다:
 *  - `formRef.current.submit()` — 저장 실행 (`<form>` 래핑을 쓰지 않으므로 Enter 암시적
 *    제출이 생기지 않는다)
 *  - `onStateChange` — 로딩/제출/유효성/첫 에러를 셸의 버튼·오버레이에 반영
 *  - `onDirtyChange` — 셸의 이탈 가드(useBlocker·모달 닫기 confirm)에 반영
 *  - `onSaved(eventId, mode)` — 저장 성공. **이동은 셸이 결정한다.**
 *
 * 저장 성공 시 캐시 시딩·상세 프리페치는 셸 종류와 무관하게 **항상** 수행한다.
 * (예전엔 `onSuccess` 콜백이 주어지면 통째로 건너뛰어, 콜백 경로를 쓰는 순간
 *  '등록 직후 무로딩 상세 진입'이 조용히 회귀하는 구조였다.)
 */
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { invalidateGamification } from '@/entities/gamification'
import { useFormEntities } from '@/entities/event-form/model'
import { buildEventSubmitData, checkBasicInfo, validateBasicInfo } from '@/features/event-create/lib'
import { useBasicInfoForm } from '@/features/event-form/model'
import type { BasicInfoResetOptions } from '@/features/event-form/model/useBasicInfoForm'
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
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/advanced-country-select-modal'
import { notify } from '@/shared/ui/toast'
import { BasicInfoSection } from '@/widgets/event-form/ui/basic-info-section'

/** 편집 로드 시 서버에서 받은 이미지(보존 대상 — 캡션·출처·정렬 포함) */
interface LoadedEventImage {
  imageUrl: string
  caption?: string
  source?: string
  order?: number
  isPrimary?: boolean
}

/** 셸이 본체에 명령하는 통로 — 저장 버튼이 셸에 있으므로 필요 */
export interface EventBasicFormHandle {
  /** 저장 실행. 유효하지 않으면 에러 표시만 하고 아무 일도 일어나지 않는다. */
  submit: () => Promise<void>
  /**
   * 폼 비우기 — 모달의 "사건 계속 등록"처럼 언마운트 없이 다음 입력을 받을 때.
   * 비운 상태가 새 기준선이 되므로 곧바로 dirty가 풀린다.
   */
  reset: (options?: BasicInfoResetOptions) => void
}

/** 셸이 헤더·버튼·오버레이를 그리는 데 필요한 본체 상태 */
export interface EventBasicFormState {
  isEditMode: boolean
  /** 편집 모드에서 기존 사건을 불러오는 중 */
  isLoading: boolean
  isSubmitting: boolean
  /** 저장 가능 여부 */
  isValid: boolean
  /** 저장 불가 사유 중 첫 번째 (버튼 title 용) */
  firstError?: string
}

export interface EventBasicFormProps {
  /** 편집 대상 사건 id. 없으면 신규 등록. */
  eventId?: string
  /** 셸이 `submit()`을 호출하기 위한 핸들 */
  formRef?: React.RefObject<EventBasicFormHandle | null>
  /** 미저장 변경 여부 통지 — 셸의 이탈 가드용 */
  onDirtyChange?: (isDirty: boolean) => void
  /** 로딩·제출·유효성 통지 — 셸의 버튼/오버레이용 */
  onStateChange?: (state: EventBasicFormState) => void
  /** 저장 성공. 캐시 시딩·프리페치는 이미 끝난 상태로 호출된다. 이동은 셸이 결정. */
  onSaved?: (eventId: string, mode: 'create' | 'edit') => void
  /**
   * 편집 모드 로드 성공 토스트 표시 여부(기본 true).
   * 모달 셸은 열 때마다 마운트라 매번 뜨므로 끄고 셸 subtitle로 대체할 것.
   */
  notifyOnLoad?: boolean
}

/**
 * 편집 저장용 eventImages payload 구성.
 *
 * BASIC 폼은 썸네일(대표) 한 장만 다루므로, 서버에서 로드한 전체 이미지를 토대로
 * **비대표 이미지와 캡션/출처를 보존**하면서 대표 슬롯만 현재 썸네일로 교체한다.
 * 백엔드 updateEvent는 `eventImages !== undefined`면 전량 삭제·재생성하므로,
 * 이 보존이 없으면 상세에서 추가한 이미지가 기본 정보 수정만으로 소실된다.
 *
 * @returns buildEventSubmitData에 넘길 배열. `undefined`면 thumbnail 기본 동작에 위임.
 */
export function buildPreservedEventImages(
  loaded: LoadedEventImage[] | null,
  thumbnail: string,
): Array<{
  imageUrl: string
  caption?: string
  source?: string
  order: number
  isPrimary: boolean
}> | undefined {
  // 로드된 이미지가 없으면(신규에 가까운 편집) thumbnail 기본 동작에 맡긴다.
  if (!loaded || loaded.length === 0) return undefined

  const originalPrimary = loaded.find((img) => img.isPrimary) ?? loaded[0]
  const others = loaded.filter((img) => img !== originalPrimary)

  const result: Array<{
    imageUrl: string
    caption?: string
    source?: string
    order: number
    isPrimary: boolean
  }> = []

  // 대표 슬롯: 현재 썸네일. URL이 원본 대표와 같으면 캡션/출처도 보존.
  if (thumbnail) {
    const sameAsOriginal = originalPrimary.imageUrl === thumbnail
    result.push({
      imageUrl: thumbnail,
      caption: sameAsOriginal ? originalPrimary.caption : undefined,
      source: sameAsOriginal ? originalPrimary.source : undefined,
      order: 0,
      isPrimary: true,
    })
  }

  // 비대표 이미지: 캡션/출처 그대로 보존(대표 제거 시 첫 장 승격 없이 갤러리 유지).
  others.forEach((img, index) => {
    result.push({
      imageUrl: img.imageUrl,
      caption: img.caption,
      source: img.source,
      order: result.length + index,
      isPrimary: false,
    })
  })

  // 결과가 비면(썸네일 제거 + 비대표 없음) thumbnail 기본 동작에 위임.
  return result.length > 0 ? result : undefined
}

export const EventBasicForm: React.FC<EventBasicFormProps> = ({
  eventId,
  formRef,
  onDirtyChange,
  onStateChange,
  onSaved,
  notifyOnLoad = true,
}) => {
  const queryClient = useQueryClient()
  const playClickSound = useClickSound()

  const isEditMode = Boolean(eventId)

  // ===== Entity: Form Entities Data =====
  // BASIC 폼은 국가·역사국가·카테고리 3종만 쓴다 — 나머지 5개(인물·군부대·사건 전량·
  // 가문·정당)는 호출하지 않는다.
  const { availableCountries, availableHistoricalCountries, dbCategories } =
    useFormEntities({
      only: ['countries', 'historicalCountries', 'categories'],
    })

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
    reset: resetFormFields,
  } = useBasicInfoForm()

  // ===== Form State =====
  const [isLoadingEvent, setIsLoadingEvent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  /**
   * 미저장 변경 여부. ref가 아니라 state인 이유 — 셸(useBlocker·모달 닫기 confirm)이
   * 렌더에 반영해야 하므로 통지가 필요하다. 판정은 ref로 하되 통지는 state로.
   */
  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(false)
  /**
   * 편집 하이드레이션이 끝날 때마다 증가 — 기준선(baseline) 재설정 트리거.
   * 로드 실패로 값이 하나도 안 바뀌어도 기준선은 잡혀야 하므로 `finally`에서 올린다.
   */
  const [hydrationToken, setHydrationToken] = useState(0)
  /**
   * 편집 모드에서 서버가 돌려준 전체 eventImages(캡션·출처·비대표 이미지 포함)를 보관.
   * 저장 시 폼은 썸네일(대표) 한 장만 다루므로, 이 배열을 토대로 비대표 이미지와
   * 캡션/출처를 보존하면서 썸네일만 교체해야 상세에서 추가한 이미지가 소실되지 않는다.
   */
  const loadedImagesRef = useRef<LoadedEventImage[] | null>(null)

  const markDirty = useCallback((next: boolean) => {
    if (isDirtyRef.current === next) return
    isDirtyRef.current = next
    setIsDirty(next)
  }, [])

  const validation = useMemo(
    () => checkBasicInfo({ title, startDate, endDate }),
    [title, startDate, endDate],
  )

  // 편집 모드: 기본 정보만 로드 (본문·군사·관계 등은 상세에서 편집).
  useEffect(() => {
    if (!isEditMode || !eventId) return
    let cancelled = false
    setIsLoadingEvent(true)

    const loadEvent = async () => {
      try {
        const event = await getEventById(eventId)
        if (cancelled) return

        setTitle(event.title)
        setDescription(event.description || '')

        const splitDateTime = (iso: string): { date: string; time: string } => {
          const date = iso.split('T')[0] || ''
          const matched = iso.match(/T(\d{2}):(\d{2})/)
          return { date, time: matched ? `${matched[1]}:${matched[2]}` : '' }
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

        const eventImages = event.eventImages as LoadedEventImage[] | undefined
        loadedImagesRef.current = eventImages ?? []
        if (eventImages && eventImages.length > 0) {
          const primaryImage = eventImages.find((img) => img.isPrimary)
          setThumbnail(primaryImage?.imageUrl || eventImages[0].imageUrl || '')
        } else if (event.thumbnail) {
          setThumbnail(event.thumbnail)
        }

        if (event.categoryId) setCategory(event.categoryId)

        if (event.relatedCountryIds) setRelatedCountryIds(event.relatedCountryIds)
        if (event.relatedHistoricalCountryIds)
          setRelatedHistoricalCountryIds(event.relatedHistoricalCountryIds)

        type CountryRel = { id: string; role?: string | null }
        const initiator = (
          event.relatedCountries as CountryRel[] | undefined
        )?.find((country) => country.role === 'INITIATOR')
        if (initiator) setPrimaryCountryId(initiator.id)
        const initiatorHist = (
          event.relatedHistoricalCountries as CountryRel[] | undefined
        )?.find((country) => country.role === 'INITIATOR')
        if (initiatorHist) setPrimaryHistoricalCountryId(initiatorHist.id)

        if (!cancelled && notifyOnLoad) notify.success('사건 정보를 불러왔습니다')
      } catch (error) {
        if (!cancelled) {
          console.error('[EventBasicForm] 사건 로드 실패:', error)
          notify.error('사건 정보를 불러오는데 실패했습니다')
        }
      } finally {
        if (!cancelled) {
          // 하이드레이션 결과(실패 시 빈 폼)가 곧 dirty 판정의 기준선이 된다.
          setHydrationToken((token) => token + 1)
          setIsLoadingEvent(false)
        }
      }
    }

    loadEvent()
    return () => {
      cancelled = true
    }
    // 세터들은 useState가 주는 안정 참조라 deps에 넣지 않는다 — 넣으면 로드가 반복된다.
  }, [isEditMode, eventId, notifyOnLoad])

  /**
   * dirty 판정 — 기준선(baseline) 대비 실제 값 비교.
   *
   * 예전엔 "다음 변경 1회를 건너뛰는" 플래그 두 개로 흉내 냈는데, 마운트 직후부터 dirty가
   * 켜져 아무것도 건드리지 않고 나가도 경고가 떴고, 편집 모드에서는 로드 후 **첫 수정이
   * 통째로 삼켜졌다**. 기준선 비교는 두 경우 모두 구조적으로 생기지 않는다.
   */
  const snapshot = useMemo(
    () =>
      JSON.stringify([
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
      ]),
    [
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
    ],
  )
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot
  /** null이면 아직 기준선 없음(편집 로드 중) → dirty 판정 보류 */
  const baselineRef = useRef<string | null>(null)

  // 기준선 설정: 신규는 마운트 시점, 편집은 하이드레이션이 끝난 시점.
  useEffect(() => {
    if (isEditMode && hydrationToken === 0) return
    baselineRef.current = snapshotRef.current
    markDirty(false)
  }, [isEditMode, hydrationToken, markDirty])

  useEffect(() => {
    if (baselineRef.current === null) return
    markDirty(snapshot !== baselineRef.current)
  }, [snapshot, markDirty])

  // 새로고침·탭 닫기 경고. SPA 내 라우트 전환은 셸(useBlocker)이 담당한다.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // 셸에 상태 통지
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const isValid = isBasicInfoValid()
  useEffect(() => {
    onStateChange?.({
      isEditMode,
      isLoading: isLoadingEvent,
      isSubmitting,
      isValid,
      firstError: validation.firstError ?? undefined,
    })
  }, [
    isEditMode,
    isLoadingEvent,
    isSubmitting,
    isValid,
    validation.firstError,
    onStateChange,
  ])

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return
    setSubmitAttempted(true)
    try {
      if (!validateBasicInfo({ title, startDate })) return

      setIsSubmitting(true)
      // 상세 페이지 청크를 미리 데워 저장 직후 이동이 매끄럽도록.
      void import('@/pages/events/detail/event-detail.page')

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
        sections: [],
        militaryEvent: undefined,
        conferenceEvent: undefined,
        belligerentsGraph: { countries: [], relations: [] },
        warCost: '',
        mentionedPersons: [],
        childEventIds: [],
        keywords,
        // 편집 시 상세에서 추가한 이미지·캡션을 보존하며 썸네일만 교체.
        // 신규는 undefined → buildEventSubmitData가 thumbnail로 단일 이미지 구성.
        eventImages: isEditMode
          ? buildPreservedEventImages(loadedImagesRef.current, thumbnail)
          : undefined,
      })

      let targetId: string | undefined = eventId
      let saved: EventResponseDto | undefined
      if (isEditMode && eventId) {
        saved = await updateEvent(
          eventId,
          // satisfies: 빌더 반환이 DTO에서 표류하면 tsc가 잡는다 (as 캐스트는 은폐)
          eventData satisfies Parameters<typeof updateEvent>[1],
        )
        notify.success('사건이 성공적으로 수정되었습니다!')
      } else {
        saved = await createEvent(
          eventData satisfies Parameters<typeof createEvent>[0],
        )
        targetId = saved.id
        notify.success('사건이 등록되었습니다. 상세에서 내용을 이어서 등록하세요.')
      }

      // 저장된 값이 새 기준선 — 이후 수정분만 다시 dirty가 된다.
      baselineRef.current = snapshotRef.current
      markDirty(false)

      /**
       * `refetchType: 'none'` — **표시만 하고 지금 다시 받지는 않는다.**
       *
       * 페이지 시절엔 저장과 동시에 목록이 언마운트돼 재조회가 아예 안 일어났다. 모달에서는
       * 목록이 뒤에 살아 있어서, 기본값(`'active'`)이면 `autoLoadAll`이 소진해 둔 N페이지가
       * 그 자리에서 전부 재조회된다. 게다가 이 시점엔 사용자가 상세로 갈지(=목록 언마운트,
       * 재조회가 통째로 낭비) 목록에 남을지 아직 고르지도 않았다.
       * 목록에 남는 분기에서 셸이 `refetchQueries`로 되살린다(EventRegisterModal).
       */
      queryClient.invalidateQueries({
        queryKey: eventKeys.lists(),
        refetchType: 'none',
      })
      if (!isEditMode) {
        // 신규 생성만 총개수를 늘림 → 헤더 "전체 N건" 무효화 (수정은 개수 불변)
        queryClient.invalidateQueries({
          queryKey: eventKeys.count(),
          refetchType: 'none',
        })
      }
      invalidateGamification(queryClient)

      // 캐시 시딩·상세 프리페치는 **셸 종류와 무관하게 항상** 수행한다.
      // 셸이 상세로 이동하든 모달에 잔류하든, 이 시딩이 '무로딩 상세 진입'의 전제다.
      if (targetId) {
        if (saved) {
          queryClient.setQueryData(
            eventKeys.detail(targetId),
            saved as unknown as EventDetail,
          )
        }
        await queryClient.ensureQueryData(eventDetailQueryOptions(targetId))
      }

      setIsSubmitting(false)
      if (targetId) onSaved?.(targetId, isEditMode ? 'edit' : 'create')
    } catch (error) {
      console.error('[EventBasicForm] 사건 저장 실패:', error)
      notify.error(
        `사건 ${isEditMode ? '수정' : '등록'}에 실패했습니다: ${
          error instanceof Error ? error.message : '알 수 없는 오류'
        }`,
      )
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    title,
    startDate,
    description,
    startTime,
    endDate,
    endTime,
    category,
    location,
    thumbnail,
    relatedCountryIds,
    relatedHistoricalCountryIds,
    primaryCountryId,
    primaryHistoricalCountryId,
    keywords,
    isEditMode,
    eventId,
    queryClient,
    markDirty,
    onSaved,
  ])

  const handleReset = useCallback(
    (options?: BasicInfoResetOptions) => {
      resetFormFields(options)
      setSubmitAttempted(false)
      // 비운 결과가 새 기준선 — 토큰을 올리면 기준선 effect가 다시 잡는다.
      setHydrationToken((token) => token + 1)
    },
    [resetFormFields],
  )

  useImperativeHandle(
    formRef,
    () => ({ submit: handleSubmit, reset: handleReset }),
    [handleSubmit, handleReset],
  )

  return (
    <>
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
        playClickSound={playClickSound}
        getDateError={getDateError}
        calculateDaysDifference={calculateDaysDifference}
        titleError={submitAttempted ? validation.fields.title : undefined}
        startDateError={submitAttempted ? validation.fields.startDate : undefined}
        endDateError={validation.fields.endDate}
      />

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
        selectedCountryIds={[...relatedCountryIds, ...relatedHistoricalCountryIds]}
        multiSelect={true}
      />
    </>
  )
}

export default EventBasicForm
