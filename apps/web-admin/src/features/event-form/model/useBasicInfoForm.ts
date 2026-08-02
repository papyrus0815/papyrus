/**
 * Event Form Feature - Basic Info Form State
 * FSD: features/event-form/model
 */
import { useCallback, useState } from 'react'

import type { HistoricalEventCategory } from '@/pages/events/create/events.types'
import { compareByDate, isoDaySpan } from '@/shared/lib/iso-date'

type DatePrecision = 'year' | 'month' | 'day'

/**
 * 폼 초기값 — `reset()`의 단일 출처.
 * 필드를 추가하면 여기와 `reset()` 양쪽에 반영해야 "계속 등록"에서 유령 값이 남지 않는다.
 */
export const BASIC_INFO_FORM_INITIAL = {
  title: '',
  description: '',
  startDate: '',
  startTime: '',
  startDatePrecision: 'day' as DatePrecision,
  endDate: '',
  endTime: '',
  endDatePrecision: 'day' as DatePrecision,
  category: '' as HistoricalEventCategory | '',
  thumbnail: '',
  thumbnailFile: null as File | null,
  location: '',
  tags: [] as string[],
  keywords: [] as string[],
  relatedCountryIds: [] as string[],
  relatedHistoricalCountryIds: [] as string[],
  primaryCountryId: null as string | null,
  primaryHistoricalCountryId: null as string | null,
} as const

/** `reset()`에서 유지할 수 있는 필드 — 연속 등록 시 매번 다시 고르지 않게 한다. */
export interface BasicInfoResetOptions {
  keepCategory?: boolean
  keepRelatedCountries?: boolean
}

export const useBasicInfoForm = () => {
  const initial = BASIC_INFO_FORM_INITIAL
  const [title, setTitle] = useState<string>(initial.title)
  const [description, setDescription] = useState<string>(initial.description)
  const [startDate, setStartDate] = useState<string>(initial.startDate)
  const [startTime, setStartTime] = useState<string>(initial.startTime)
  const [startDatePrecision, setStartDatePrecision] = useState<DatePrecision>(
    initial.startDatePrecision,
  )
  const [endDate, setEndDate] = useState<string>(initial.endDate)
  const [endTime, setEndTime] = useState<string>(initial.endTime)
  const [endDatePrecision, setEndDatePrecision] = useState<DatePrecision>(
    initial.endDatePrecision,
  )
  const [category, setCategory] = useState<HistoricalEventCategory | ''>(
    initial.category,
  )
  const [thumbnail, setThumbnail] = useState<string>(initial.thumbnail)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(
    initial.thumbnailFile,
  )
  // location: 사람이 읽는 위치 라벨(자유 텍스트 또는 DB 선택의 표시명) — DB Event.location 컬럼.
  const [location, setLocation] = useState<string>(initial.location)
  const [tags, setTags] = useState<string[]>([...initial.tags])
  const [keywords, setKeywords] = useState<string[]>([...initial.keywords])
  const [relatedCountryIds, setRelatedCountryIds] = useState<string[]>([
    ...initial.relatedCountryIds,
  ])
  const [relatedHistoricalCountryIds, setRelatedHistoricalCountryIds] =
    useState<string[]>([...initial.relatedHistoricalCountryIds])
  /**
   * 메인(주도) 국가 — 저장 시 EventCountryRelation.role=INITIATOR로 마킹.
   * Timeline 국가/대륙 모드의 lane 배치에 사용. 미지정이면 모두 PARTICIPANT.
   */
  const [primaryCountryId, setPrimaryCountryId] = useState<string | null>(
    initial.primaryCountryId,
  )
  const [primaryHistoricalCountryId, setPrimaryHistoricalCountryId] = useState<
    string | null
  >(initial.primaryHistoricalCountryId)

  /**
   * 폼 초기화 — 모달의 "사건 계속 등록"처럼 언마운트 없이 다음 입력을 받을 때 사용.
   * 연속 등록은 보통 같은 카테고리·같은 국가 묶음이라 그 둘은 유지할 수 있게 열어둔다.
   */
  const reset = useCallback((options?: BasicInfoResetOptions) => {
    setTitle(initial.title)
    setDescription(initial.description)
    setStartDate(initial.startDate)
    setStartTime(initial.startTime)
    setStartDatePrecision(initial.startDatePrecision)
    setEndDate(initial.endDate)
    setEndTime(initial.endTime)
    setEndDatePrecision(initial.endDatePrecision)
    setThumbnail(initial.thumbnail)
    setThumbnailFile(initial.thumbnailFile)
    setLocation(initial.location)
    setTags([...initial.tags])
    setKeywords([...initial.keywords])
    if (!options?.keepCategory) setCategory(initial.category)
    if (!options?.keepRelatedCountries) {
      setRelatedCountryIds([...initial.relatedCountryIds])
      setRelatedHistoricalCountryIds([...initial.relatedHistoricalCountryIds])
      setPrimaryCountryId(initial.primaryCountryId)
      setPrimaryHistoricalCountryId(initial.primaryHistoricalCountryId)
    }
  }, [initial])

  // 유효성 검증 — BC/고대 날짜는 네이티브 Date 비교 시 NaN이 되므로 iso-date 유틸 사용.
  const isValid = () => {
    const hasTitle = title.trim().length > 0
    const hasStartDate = startDate.length > 0
    const isDateValid =
      !endDate || !startDate || compareByDate(startDate, endDate) <= 0
    return hasTitle && hasStartDate && isDateValid
  }

  // 날짜 에러 메시지
  const getDateError = (): string | null => {
    if (startDate && endDate && compareByDate(startDate, endDate) > 0) {
      return '종료일은 시작일보다 이후여야 합니다'
    }
    return null
  }

  // 날짜 차이 계산 (BC/고대 포함 TZ 안전)
  const calculateDaysDifference = (): number | null => {
    if (!startDate || !endDate) return null
    return isoDaySpan(startDate, endDate)
  }

  return {
    // 상태
    title,
    description,
    startDate,
    startTime,
    startDatePrecision,
    endDate,
    endTime,
    endDatePrecision,
    category,
    thumbnail,
    thumbnailFile,
    location,
    tags,
    keywords,
    relatedCountryIds,
    relatedHistoricalCountryIds,
    primaryCountryId,
    primaryHistoricalCountryId,

    // 세터
    setTitle,
    setDescription,
    setStartDate,
    setStartTime,
    setStartDatePrecision,
    setEndDate,
    setEndTime,
    setEndDatePrecision,
    setCategory,
    setThumbnail,
    setThumbnailFile,
    setLocation,
    setTags,
    setKeywords,
    setRelatedCountryIds,
    setRelatedHistoricalCountryIds,
    setPrimaryCountryId,
    setPrimaryHistoricalCountryId,

    // 유틸리티
    isValid,
    getDateError,
    calculateDaysDifference,
    reset,
  }
}
