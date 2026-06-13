/**
 * Event Form Feature - Basic Info Form State
 * FSD: features/event-form/model
 */
import { useState } from 'react'

import type { HistoricalEventCategory } from '@/pages/events/create/events.types'
import { compareByDate, isoDaySpan } from '@/shared/lib/iso-date'

export const useBasicInfoForm = () => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [startDatePrecision, setStartDatePrecision] = useState<'year' | 'month' | 'day'>('day')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [endDatePrecision, setEndDatePrecision] = useState<'year' | 'month' | 'day'>('day')
  const [category, setCategory] = useState<HistoricalEventCategory | ''>('')
  const [thumbnail, setThumbnail] = useState<string>('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  // location: 사람이 읽는 위치 라벨(자유 텍스트 또는 DB 선택의 표시명) — DB Event.location 컬럼.
  const [location, setLocation] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [relatedCountryIds, setRelatedCountryIds] = useState<string[]>([])
  const [relatedHistoricalCountryIds, setRelatedHistoricalCountryIds] =
    useState<string[]>([])
  /**
   * 메인(주도) 국가 — 저장 시 EventCountryRelation.role=INITIATOR로 마킹.
   * Timeline 국가/대륙 모드의 lane 배치에 사용. 미지정이면 모두 PARTICIPANT.
   */
  const [primaryCountryId, setPrimaryCountryId] = useState<string | null>(null)
  const [primaryHistoricalCountryId, setPrimaryHistoricalCountryId] = useState<
    string | null
  >(null)

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
  }
}
