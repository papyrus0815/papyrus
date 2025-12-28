/**
 * 이벤트 기본 정보 상태 관리 Hook
 * FSD: features/event-create/model
 */
import { useRef, useState } from 'react'

import type { HistoricalEventCategory } from '@/pages/events/create/events.types'
import type { MentionEntityType } from '@/pages/events/create/mention-system'
import type { EventCategoryDto } from '@/shared/api/event-categories'

export interface EventSection {
  id: string
  title: string
  content: string
  mentions: Array<{
    type: MentionEntityType
    id: string
    name: string
    startIndex: number
    endIndex: number
  }>
}

export const useEventBasicInfo = () => {
  // 기본 정보
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [category, setCategory] = useState<HistoricalEventCategory | ''>('')
  const [thumbnail, setThumbnail] = useState<string>('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  // DB 카테고리
  const [dbCategories, setDbCategories] = useState<EventCategoryDto[]>([])

  // 섹션 기반 내용 작성
  const [sections, setSections] = useState<EventSection[]>([
    { id: '1', title: 'Part 1', content: '', mentions: [] },
  ])

  // 위치 정보
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')

  // 태그
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  return {
    // 기본 정보
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
    thumbnailInputRef,

    // DB 카테고리
    dbCategories,
    setDbCategories,

    // 섹션
    sections,
    setSections,

    // 위치
    location,
    setLocation,
    latitude,
    setLatitude,
    longitude,
    setLongitude,

    // 태그
    tags,
    setTags,
    tagInput,
    setTagInput,
  }
}

export type EventBasicInfoState = ReturnType<typeof useEventBasicInfo>
