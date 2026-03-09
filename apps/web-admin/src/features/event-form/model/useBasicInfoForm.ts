/**
 * Event Form Feature - Basic Info Form State
 * FSD: features/event-form/model
 */
import { useState } from 'react'

import type { HistoricalEventCategory } from '@/pages/events/create/events.types'

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
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [relatedCountryIds, setRelatedCountryIds] = useState<string[]>([])
  const [relatedHistoricalCountryIds, setRelatedHistoricalCountryIds] =
    useState<string[]>([])

  // 유효성 검증
  const isValid = () => {
    const hasTitle = title.trim().length > 0
    const hasStartDate = startDate.length > 0
    const isDateValid =
      !endDate || !startDate || new Date(endDate) >= new Date(startDate)
    return hasTitle && hasStartDate && isDateValid
  }

  // 날짜 에러 메시지
  const getDateError = (): string | null => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return '종료일은 시작일보다 이후여야 합니다'
    }
    return null
  }

  // 날짜 차이 계산
  const calculateDaysDifference = (): number | null => {
    if (!startDate || !endDate) return null
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
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
    latitude,
    longitude,
    tags,
    keywords,
    relatedCountryIds,
    relatedHistoricalCountryIds,

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
    setLatitude,
    setLongitude,
    setTags,
    setKeywords,
    setRelatedCountryIds,
    setRelatedHistoricalCountryIds,

    // 유틸리티
    isValid,
    getDateError,
    calculateDaysDifference,
  }
}
