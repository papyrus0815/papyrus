import React, { useEffect, useId, useMemo, useRef, useState } from 'react'

import { motion } from 'framer-motion'
import {
  FiArrowDown,
  FiArrowUp,
  FiClock,
  FiImage,
  FiPlus,
  FiX,
} from 'react-icons/fi'
import styled, { type DefaultTheme, useTheme } from 'styled-components'

import {
  EVENT_COUNTRY_ROLE_OPTIONS,
  type EventCountryParticipant,
  type EventCountryRole,
  type RecentParticipantRef,
  type SuggestedCountryCandidate,
  eventCountryRoleHint,
  extractYearSuggestionFromTitle,
  findReplacementForMismatchedCountry,
  moveParticipant,
  participantKey,
  readRecentParticipants,
  resolveBatchCountryQuery,
  suggestCountriesFromTitle,
  swapTwoParticipants,
} from '@/entities/event/model'
import * as S from '@/pages/events/create/event-create.styles'
import { EVENT_DOMAIN_ORDER, EVENT_DOMAINS, type EventDomainKey } from '@/entities/event/model/event-domain'
import {
  EVENT_RELATION_ROLE_OPTIONS,
  type EventRelatedDraft,
  type EventRelationRoleKey,
  inferDefaultRelationRole,
  parseRelationRoleKey,
  toRelationRoleKey,
} from '@/features/event-facets/model/register-facets'
import { getImageUrl } from '@/pages/events/utils/event-create.utils'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { uploadImage } from '@/shared/api/upload'
import {
  describeLifespanMismatch,
  formatCountryPeriod,
  signedYearFromIsoLike,
} from '@/shared/lib/country-period'
import {
  filterCountriesByQuery,
  matchesHintYearRange,
} from '@/shared/lib/country-picker-filter'
import { isoPeriodEnd } from '@/shared/lib/iso-date'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'
import { type DatePickerPrecision } from '@/shared/ui/date-picker/date-picker-modal'
import { TimePickerModal } from '@/shared/ui/time-picker-modal/time-picker-modal'
import {
  KitUploadActions,
  KitUploadFilled,
  KitUploadRemove,
  KitUploadStrip,
  KitUploadText,
  KitUploadThumb,
} from '@/shared/ui/register-form-kit/register-form-kit'
import { notify } from '@/shared/ui/toast'

import { shouldEndFollowStart } from '../lib/event-date-parts'

import { EventDateField } from './event-date-field'

export interface SimilarEventCandidate {
  id: string
  title: string
  dateLabel?: string
  startYear?: number | null
  kind?: 'SINGLE' | 'COLLECTION'
}

export interface RelatedEventsSlotProps {
  items: EventRelatedDraft[]
  onChange: (next: EventRelatedDraft[]) => void
  onOpenPicker: () => void
  /** 인라인 빠른 검색어와 결과 목록 */
  quickSearch?: {
    query: string
    onQueryChange: (next: string) => void
    candidates: Array<{
      id: string
      title: string
      dateLabel?: string
      startYear?: number | null
    }>
    isSearching?: boolean
  }
  /** 동시대 추천 사건 (시작 연도 전후 사건 중 아직 연결 안 된 것) */
  contemporarySuggestions?: Array<{
    id: string
    title: string
    dateLabel?: string
    startYear?: number | null
  }>
  /** '등록 후 계속' 직후 방금 등록한 사건 원클릭 연결 제안 */
  lastSavedEvent?: {
    id: string
    title: string
    startYear?: number | null
  } | null
  /** 현재 사건의 시작 연도(부호 연도) — 연도 비교로 기본 관계 역할 추론용 */
  currentStartYear?: number | null
}

/**
 * 이벤트 기본 정보 입력 섹션
 */
interface BasicInfoSectionProps {
  // 기본 정보
  title: string
  setTitle: (value: string) => void
  description: string
  setDescription: (value: string) => void
  startDate: string
  setStartDate: (value: string) => void
  startTime: string
  setStartTime: (value: string) => void
  endDate: string
  setEndDate: (value: string) => void
  endTime: string
  setEndTime: (value: string) => void
  /**
   * 날짜 정밀도 — 연도만·연월만 아는 사건. 세터를 주면 달력에서 월·일을 비울 수 있다.
   * 없으면 예전처럼 연·월·일을 모두 고른다(다른 호출부 무변경).
   */
  startDatePrecision?: DatePickerPrecision
  setStartDatePrecision?: (value: DatePickerPrecision) => void
  endDatePrecision?: DatePickerPrecision
  setEndDatePrecision?: (value: DatePickerPrecision) => void
  /** 분야 키 — 빈 문자열이면 아직 안 고름(필수라 제출 때 오류) */
  category: EventDomainKey | ''
  setCategory: (value: EventDomainKey | '') => void
  thumbnail: string
  setThumbnail: (value: string) => void
  setThumbnailFile: (file: File | null) => void

  /** 키워드 (동일 사건 매핑용, 선택) */
  keywords?: string[]
  setKeywords?: (value: string[]) => void

  /**
   * 참여국 (선택) — 현대·역사를 한 배열에. 등록 시점에 역할과 한 줄 서술까지
   * 적을 수 있다("조약 체결국을 디테일하게"가 여기서 끝난다). 주도국은
   * role='INITIATOR'이고, 예전의 별표 토글은 역할에 흡수되어 사라졌다.
   */
  relatedCountries?: EventCountryParticipant[]
  setRelatedCountries?: (value: EventCountryParticipant[]) => void
  availableCountries?: CountryResponseDto[]
  availableHistoricalCountries?: HistoricalCountryResponseDto[]
  onOpenCountryModal?: () => void

  /**
   * 상위 사건(선택) 슬롯 — '부모에서 가지를 낳는' 트리 등록용. undefined면 행 자체를
   * 렌더하지 않는다(편집 모달 등 하이드레이션 미지원 지면). 피커 모달·선택 상태는
   * 부모(EventBasicForm)가 소유하고, 이 섹션은 칩·버튼 표시만 담당한다.
   */
  parentEventSlot?: {
    parent: { id: string; title: string } | null
    onOpenPicker: () => void
    onClear: () => void
    quickSearch?: {
      query: string
      onQueryChange: (next: string) => void
      candidates: Array<{
        id: string
        title: string
        dateLabel?: string
        startYear?: number | null
      }>
      isSearching?: boolean
      onSelectCandidate?: (candidate: {
        id: string
        title: string
        dateLabel?: string
        startYear?: number | null
      }) => void
    }
  }

  /**
   * 연관 사건(선택) 슬롯 — 계기·배경·대응·동시 진행 등 상위/하위 묶음이 아닌 사건끼리의 연결.
   * 신규 등록 전용.
   */
  relatedEventsSlot?: RelatedEventsSlotProps

  /**
   * 사건명 입력 시 이미 등록된 유사·중복 사건을 알려주고
   * 원클릭으로 상위 사건 지정 또는 연관 사건 추가를 지원하는 슬롯
   */
  similarEventsSlot?: {
    candidates: SimilarEventCandidate[]
    onSelectAsParent?: (candidate: SimilarEventCandidate) => void
    onAddAsRelated?: (candidate: SimilarEventCandidate) => void
  }

  /** 분야를 안 고르고 제출했을 때 */
  categoryError?: string
  /** 사건명 입력 시 바로 아래에 띄우는 추천 분류 원클릭 칩 */
  titleSuggestionSlot?: {
    label: string
    onApply: () => void
  }
  /** 세부 분야 칸 — 분야 바로 아래, 분야 › 세부의 2단계(붙는 기록을 정한다) */
  typeSlot?: React.ReactNode
  /** 세부의 핵심 기록 묶음 — '연결' 묶음 뒤 */
  recordsSlot?: { title: string; content: React.ReactNode }
  /** 참여국이 고른 세부의 핵심 기록이면 그 세부 이름 — 라벨의 '(선택)'을 대신한다 */
  participantsCoreOf?: string
  /** 참여국 '한 일(roleDescription)' 입력칸 placeholder — 세부 분야별로 맥락화 */
  roleDescriptionPlaceholder?: string
  /** 최근 사용한 참여국 목록 (생략 시 localStorage에서 읽음) */
  recentParticipants?: RecentParticipantRef[]

  /** 상위 사건의 참여국 불러오기 — 상위를 골랐고 아직 안 들어온 나라가 있을 때만 */
  parentCountriesSlot?: {
    count: number
    parentTitle: string
    onImport: () => void
  }

  /**
   * 진영(sides) 패싯 활성 시 참여국 행 안에서 바로 1편/2편을 배정하고
   * 아래 '기록 › 진영' 보드와 실시간 동기화하는 슬롯
   */
  participantSidesSlot?: {
    assignment: Partial<Record<string, 'A' | 'B'>>
    sideNames: [string, string]
    onAssign: (participantKey: string, slot: 'A' | 'B' | null) => void
    onReplaceKey?: (oldKey: string, newKey: string) => void
  }

  /**
   * 사건 종류(단일/묶음) — 신규 등록에서만. undefined면 행을 그리지 않는다(편집 모달: 전환은 상세 몫).
   */
  kindSlot?: {
    value: 'SINGLE' | 'COLLECTION'
    onChange: (value: 'SINGLE' | 'COLLECTION') => void
  }

  // UI 상태
  playClickSound: () => void
  getDateError: () => string | null
  calculateDaysDifference: () => number | null
  // 폼 제출 시도 후 노출되는 inline 에러 — 부모에서 submitAttempted 분기 후 전달
  titleError?: string
  startDateError?: string
  // 종료일 < 시작일은 즉시 노출 (제출 시도 전이라도)
  endDateError?: string
  /** 날짜 칸 직접 입력이 날짜가 못 될 때(2월 30일·연도 없는 월 등) — 폼이 저장을 막는 데 쓴다 */
  onDateInputErrorChange?: (which: 'start' | 'end', message: string | null) => void
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
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
  startDatePrecision = 'day',
  setStartDatePrecision,
  endDatePrecision = 'day',
  setEndDatePrecision,
  category,
  setCategory,
  thumbnail,
  setThumbnail,
  setThumbnailFile,
  keywords = [],
  setKeywords = () => {},
  relatedCountries = [],
  setRelatedCountries = () => {},
  availableCountries = [],
  availableHistoricalCountries = [],
  onOpenCountryModal,
  parentEventSlot,
  relatedEventsSlot,
  similarEventsSlot,
  kindSlot,
  categoryError,
  titleSuggestionSlot,
  typeSlot,
  recordsSlot,
  participantsCoreOf,
  roleDescriptionPlaceholder = '이 나라가 한 일 (선택)',
  recentParticipants,
  parentCountriesSlot,
  participantSidesSlot,
  playClickSound,
  getDateError,
  calculateDaysDifference,
  titleError,
  startDateError,
  onDateInputErrorChange,
  endDateError,
}) => {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const categoryButtonsRef = useRef<Array<HTMLButtonElement | null>>([])
  const selectedCategoryIndex = category ? EVENT_DOMAIN_ORDER.indexOf(category) : -1
  const categoryTabStop = selectedCategoryIndex >= 0 ? selectedCategoryIndex : 0

  const handleCategoryKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = categoryButtonsRef.current.findIndex((button) => button === document.activeElement)
    if (current < 0) return
    const count = EVENT_DOMAIN_ORDER.length
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      categoryButtonsRef.current[(current + 1) % count]?.focus()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      categoryButtonsRef.current[(current - 1 + count) % count]?.focus()
    }
  }

  /**
   * 모달 안이면 열리자마자 사건명에 포커스. 폼 본문이 모달의 첫 프레임 포커스 처리보다
   * 늦게 그려져, 모달은 첫 focusable인 닫기(✕)를 잡고 보라 링을 띄우고 있었다.
   * 사용자가 이미 다른 **입력칸**을 잡았으면 빼앗지 않는다(버튼·본문일 때만).
   */
  useEffect(() => {
    const input = titleInputRef.current
    const dialog = input?.closest('[role="dialog"]')
    if (!input || !dialog) return
    const active = document.activeElement
    const idle =
      !active ||
      active === document.body ||
      active === dialog ||
      (dialog.contains(active) && active.tagName === 'BUTTON')
    if (idle) input.focus({ preventScroll: true })
  }, [])
  /** 정밀도 세터가 오면 달력에서 월·일을 비울 수 있다 */
  const allowPartialDate = Boolean(setStartDatePrecision && setEndDatePrecision)
  /** 일까지 알 때만 시각이 의미 있다 — 연도만 아는 사건에 '14:00'은 거짓 정밀도 */
  const showStartTime = startDatePrecision === 'day'
  const showEndTime = endDatePrecision === 'day'
  /** 날짜 칸에 직접 친 값이 날짜가 못 될 때의 문구 — 폼이 저장을 막도록 위로도 알린다 */
  const [startInputError, setStartInputError] = useState<string | null>(null)
  const [endInputError, setEndInputError] = useState<string | null>(null)
  const reportDateInputError = (which: 'start' | 'end', message: string | null) => {
    if (which === 'start') setStartInputError(message)
    else setEndInputError(message)
    onDateInputErrorChange?.(which, message)
  }
  /**
   * 종료가 시작을 따라 채워지는 중인지. 대부분의 사건은 하루·한 해짜리라 종료를 따로 칠 일이 없다 —
   * 비어 있던 시작을 처음 쓸 때 종료도 비었으면 켜지고, 종료 칸을 직접 고치거나 비우면 꺼진다.
   * 처음부터 시작이 있던 경우(편집 중인 진행 중 사건)엔 켜지지 않아 비운 종료가 채워지지 않는다.
   */
  const [endFollowsStart, setEndFollowsStart] = useState(false)
  const startDateAnchorId = useId()
  const endDateAnchorId = useId()
  const [isStartTimeModalOpen, setIsStartTimeModalOpen] = useState(false)
  const [isEndTimeModalOpen, setIsEndTimeModalOpen] = useState(false)
  const startTimeTriggerRef = useRef<HTMLDivElement>(null)
  const endTimeTriggerRef = useRef<HTMLDivElement>(null)
  /**
   * 날짜·시간 칸은 div라 키보드로 닿지 않았다(시작일·시간 칸은 탭 정지점조차 없었고,
   * 종료일은 tabIndex -1로 프로그램 포커스만 받았다) — 키보드만으로는 날짜를 넣을 수 없었다.
   * 버튼 역할·탭 정지점·Enter/Space를 준다. Enter/Space는 클릭과 같은 경로(onClick)를 탄다.
   */
  const keyboardTrigger = {
    role: 'button',
    tabIndex: 0,
    onKeyDown: (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
        keyEvent.preventDefault()
        keyEvent.currentTarget.click()
      }
    },
  } as const
  const [keywordInput, setKeywordInput] = useState('')
  const [keywordValidationMsg, setKeywordValidationMsg] = useState('')
  const prevKeywordsLengthRef = useRef(keywords.length)

  const KEYWORD_MAX_LENGTH = 30
  const KEYWORD_MAX_COUNT = 20

  /**
   * 달력으로 시작일을 고른 직후 종료일 칸(연도)으로 포커스를 옮긴다 — 다음 행동을 가리킨다.
   * 피커는 언마운트 커밋에서 "열기 직전 포커스"를 동기 복원하므로 **다음 프레임**에 옮겨야
   * 덮이지 않는다. 직접 입력할 때는 사용자가 Tab으로 넘어간다.
   */
  const focusEndDateField = () => {
    window.requestAnimationFrame(() => {
      document
        .getElementById(endDateAnchorId)
        ?.querySelector<HTMLInputElement>('input')
        ?.focus({ preventScroll: true })
    })
  }

  const [countryQuickQuery, setCountryQuickQuery] = useState('')
  const [activeCountryResultIndex, setActiveCountryResultIndex] = useState(0)
  const [isCountryQuickDismissed, setIsCountryQuickDismissed] = useState(false)
  const [activeParentResultIndex, setActiveParentResultIndex] = useState(0)
  const [isParentQuickDismissed, setIsParentQuickDismissed] = useState(false)
  const [activeRelatedResultIndex, setActiveRelatedResultIndex] = useState(0)
  const [isRelatedQuickDismissed, setIsRelatedQuickDismissed] = useState(false)
  const [isThumbnailDragOver, setIsThumbnailDragOver] = useState(false)
  const [storedRecentParticipants] = useState<RecentParticipantRef[]>(() =>
    readRecentParticipants(),
  )
  const titleYearSuggestion = useMemo(
    () => (!startDate ? extractYearSuggestionFromTitle(title) : null),
    [title, startDate],
  )

  const hintYearRange = useMemo(() => {
    const effectiveStart = startDate || titleYearSuggestion?.startIso || ''
    const effectiveEnd =
      endDate || startDate || titleYearSuggestion?.endIso || effectiveStart
    const startYear = signedYearFromIsoLike(effectiveStart)
    const endYear = signedYearFromIsoLike(effectiveEnd)
    return { startYear, endYear }
  }, [startDate, endDate, titleYearSuggestion])

  const addRelatedEventCandidate = (
    candidate: {
      id: string
      title: string
      dateLabel?: string
      startYear?: number | null
    },
    overrideRole?: {
      relationType: EventRelatedDraft['relationType']
      direction: EventRelatedDraft['direction']
    },
  ) => {
    if (!relatedEventsSlot) return
    if (relatedEventsSlot.items.some((item) => item.relatedEventId === candidate.id)) {
      return
    }
    playClickSound()
    const inferred =
      overrideRole ??
      inferDefaultRelationRole(
        candidate.startYear,
        relatedEventsSlot.currentStartYear ?? hintYearRange.startYear,
      )
    relatedEventsSlot.onChange([
      ...relatedEventsSlot.items,
      {
        relatedEventId: candidate.id,
        title: candidate.title,
        dateLabel: candidate.dateLabel,
        startYear: candidate.startYear,
        relationType: inferred.relationType,
        direction: inferred.direction,
        description: '',
      },
    ])
    relatedEventsSlot.quickSearch?.onQueryChange('')
    setActiveRelatedResultIndex(0)
  }

  const applyTitleYearSuggestion = () => {
    if (!titleYearSuggestion) return
    playClickSound()
    setStartDate(titleYearSuggestion.startIso)
    setStartDatePrecision?.('year')
    setStartTime('')
    if (!endDate) {
      setEndDate(titleYearSuggestion.endIso)
      setEndDatePrecision?.('year')
      setEndTime('')
    }
  }

  const existingParticipantKeys = useMemo(
    () => new Set(relatedCountries.map(participantKey)),
    [relatedCountries],
  )

  const recentParticipantSuggestions = useMemo(() => {
    const source = recentParticipants ?? storedRecentParticipants
    return source
      .filter((item) => !existingParticipantKeys.has(participantKey(item)))
      .map((item) => {
        if (item.historicalCountryId) {
          const country = availableHistoricalCountries.find(
            (candidate) => candidate.id === item.historicalCountryId,
          )
          if (!country) return null
          return {
            key: `h:${country.id}`,
            label: country.name,
            historicalCountryId: country.id,
          }
        }
        if (item.countryId) {
          const country = availableCountries.find(
            (candidate) => candidate.id === item.countryId,
          )
          if (!country) return null
          return {
            key: `m:${country.id}`,
            label: country.name,
            countryId: country.id,
          }
        }
        return null
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  }, [
    recentParticipants,
    storedRecentParticipants,
    existingParticipantKeys,
    availableCountries,
    availableHistoricalCountries,
  ])

  const titleSuggestedCountries = useMemo(
    () =>
      suggestCountriesFromTitle(
        title,
        availableCountries,
        availableHistoricalCountries,
        hintYearRange,
        existingParticipantKeys,
      ),
    [
      title,
      availableCountries,
      availableHistoricalCountries,
      hintYearRange,
      existingParticipantKeys,
    ],
  )

  const batchCountryMatches = useMemo(
    () =>
      resolveBatchCountryQuery(
        countryQuickQuery,
        availableCountries,
        availableHistoricalCountries,
        hintYearRange,
        existingParticipantKeys,
      ),
    [
      countryQuickQuery,
      availableCountries,
      availableHistoricalCountries,
      hintYearRange,
      existingParticipantKeys,
    ],
  )

  const quickCountryMatches = useMemo(() => {
    const query = countryQuickQuery.trim()
    if (!query) return []
    const lower = query.toLowerCase()
    const matchedModern = filterCountriesByQuery(availableCountries, query)
      .filter((country) => !existingParticipantKeys.has(`m:${country.id}`))
      .map((country) => ({
        key: `m:${country.id}`,
        countryId: country.id,
        historicalCountryId: undefined as string | undefined,
        rawName: country.name,
        label: country.name,
        meta: country.isoCode ?? '',
        eraMatched: false,
        exact: country.name.toLowerCase() === lower,
        prefix: country.name.toLowerCase().startsWith(lower),
      }))
    const matchedHistorical = filterCountriesByQuery(
      availableHistoricalCountries,
      query,
    )
      .filter((country) => !existingParticipantKeys.has(`h:${country.id}`))
      .map((country) => {
        const eraMatched = matchesHintYearRange(country, hintYearRange)
        return {
          key: `h:${country.id}`,
          countryId: undefined as string | undefined,
          historicalCountryId: country.id,
          rawName: country.name,
          label: country.name,
          meta: formatCountryPeriod(country) ?? '',
          eraMatched,
          exact: country.name.toLowerCase() === lower,
          prefix: country.name.toLowerCase().startsWith(lower),
        }
      })
    const combined = [...matchedModern, ...matchedHistorical]
    combined.sort((left, right) => {
      if (left.exact !== right.exact) return left.exact ? -1 : 1
      if (left.eraMatched !== right.eraMatched) return left.eraMatched ? -1 : 1
      if (left.prefix !== right.prefix) return left.prefix ? -1 : 1
      return left.label.localeCompare(right.label, 'ko')
    })
    return combined.slice(0, 6)
  }, [
    countryQuickQuery,
    availableCountries,
    availableHistoricalCountries,
    existingParticipantKeys,
    hintYearRange,
  ])

  const addQuickParticipant = (
    target: {
      countryId?: string
      historicalCountryId?: string
    },
    role: EventCountryParticipant['role'] = 'PARTICIPANT',
  ) => {
    const key = participantKey(target)
    if (existingParticipantKeys.has(key)) return
    playClickSound()
    setRelatedCountries([
      ...relatedCountries,
      target.historicalCountryId
        ? { historicalCountryId: target.historicalCountryId, role }
        : { countryId: target.countryId, role },
    ])
    setCountryQuickQuery('')
    setActiveCountryResultIndex(0)
  }

  const addBatchParticipants = (
    candidates: ReadonlyArray<SuggestedCountryCandidate>,
  ) => {
    const fresh = candidates.filter(
      (candidate) => !existingParticipantKeys.has(candidate.key),
    )
    if (fresh.length === 0) return
    playClickSound()
    setRelatedCountries([
      ...relatedCountries,
      ...fresh.map((candidate) =>
        candidate.historicalCountryId
          ? {
              historicalCountryId: candidate.historicalCountryId,
              role: 'PARTICIPANT' as const,
            }
          : {
              countryId: candidate.countryId,
              role: 'PARTICIPANT' as const,
            },
      ),
    ])
    setCountryQuickQuery('')
    setActiveCountryResultIndex(0)
  }

  const handleSwapTwoParticipants = () => {
    if (relatedCountries.length !== 2) return
    playClickSound()
    const [first, second] = relatedCountries
    const keyA = participantKey(first)
    const keyB = participantKey(second)
    setRelatedCountries(swapTwoParticipants(relatedCountries))
    if (participantSidesSlot) {
      const slotA = participantSidesSlot.assignment[keyA] ?? null
      const slotB = participantSidesSlot.assignment[keyB] ?? null
      if (slotA !== slotB) {
        participantSidesSlot.onAssign(keyA, slotB)
        participantSidesSlot.onAssign(keyB, slotA)
      }
    }
  }

  const replaceParticipantAt = (
    rowIndex: number,
    oldKey: string,
    replacement: SuggestedCountryCandidate,
  ) => {
    playClickSound()
    setRelatedCountries(
      relatedCountries.map((row, index) => {
        if (index !== rowIndex) return row
        const nextRow: EventCountryParticipant = {
          ...row,
          countryId: replacement.countryId,
          historicalCountryId: replacement.historicalCountryId,
        }
        if (!replacement.countryId) delete nextRow.countryId
        if (!replacement.historicalCountryId) delete nextRow.historicalCountryId
        return nextRow
      }),
    )
    participantSidesSlot?.onReplaceKey?.(oldKey, replacement.key)
  }

  // F33 소프트 경고 — 사건 시점이 선택한 역사국가 존속기간 밖이면 인라인 경고(저장은 허용).
  // 사건 startDate는 '-YYYY'로 BC도 담을 수 있어 recordSupportsBc=true(부호 전 구간 비교).
  // availableHistoricalCountries가 구조화 존속기간(startEra/Year)을 담은 DTO라 그대로 대조.
  const historicalLifespanWarnings = useMemo(() => {
    const eventSignedYear = signedYearFromIsoLike(startDate)
    if (eventSignedYear == null) return []
    return relatedCountries
      .map((participant, index) => {
        if (!participant.historicalCountryId) return null
        const historicalId = participant.historicalCountryId
        const country = availableHistoricalCountries.find(
          (candidate) => candidate.id === historicalId,
        )
        if (!country) return null
        const mismatch = describeLifespanMismatch(country, eventSignedYear, {
          recordSupportsBc: true,
        })
        if (!mismatch) return null
        const replacement = findReplacementForMismatchedCountry(
          country,
          eventSignedYear,
          availableCountries,
          availableHistoricalCountries,
          existingParticipantKeys,
        )
        return {
          id: historicalId,
          index,
          key: participantKey(participant),
          name: country.name,
          mismatch,
          replacement,
        }
      })
      .filter(
        (
          item,
        ): item is {
          id: string
          index: number
          key: string
          name: string
          mismatch: string
          replacement: SuggestedCountryCandidate | null
        } => item != null,
      )
  }, [
    startDate,
    relatedCountries,
    availableCountries,
    availableHistoricalCountries,
    existingParticipantKeys,
  ])

  const addKeywordsFromInput = (rawOverride?: string) => {
    const raw = (rawOverride ?? keywordInput).trim()
    if (!raw) return
    const parts = raw
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) {
      setKeywordInput('')
      return
    }
    const tooLong = parts.filter((s) => s.length > KEYWORD_MAX_LENGTH)
    const valid = parts
      .filter((s) => s.length <= KEYWORD_MAX_LENGTH)
      .slice(0, Math.max(0, KEYWORD_MAX_COUNT - keywords.length))
    if (tooLong.length > 0) {
      setKeywordValidationMsg(
        `키워드는 ${KEYWORD_MAX_LENGTH}자 이내로 입력해 주세요. (${tooLong.length}개 생략됨)`,
      )
      setTimeout(() => setKeywordValidationMsg(''), 4000)
    }
    if (valid.length === 0) return
    const next = [...keywords, ...valid]
      .filter((k, i, arr) => arr.indexOf(k) === i)
      .slice(0, KEYWORD_MAX_COUNT)
    if (next.length >= KEYWORD_MAX_COUNT && parts.length > valid.length) {
      setKeywordValidationMsg(
        `키워드는 최대 ${KEYWORD_MAX_COUNT}개까지 등록할 수 있습니다.`,
      )
      setTimeout(() => setKeywordValidationMsg(''), 4000)
    }
    setKeywords(next)
    setKeywordInput('')
  }

  useEffect(() => {
    if (prevKeywordsLengthRef.current > 0 && keywords.length === 0) {
      setKeywordInput('')
    }
    prevKeywordsLengthRef.current = keywords.length
  }, [keywords.length])

  const activeDomainTone = category ? EVENT_DOMAINS[category] : null

  const handleThumbnailUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      notify.error('이미지 파일만 업로드할 수 있습니다.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      notify.error('파일 크기는 10MB를 초과할 수 없습니다.')
      return
    }

    if (thumbnail && thumbnail.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnail)
    }

    const previewUrl = URL.createObjectURL(file)
    setThumbnail(previewUrl)
    setThumbnailFile(file)

    try {
      const result = await uploadImage(file, 'events')
      URL.revokeObjectURL(previewUrl)
      setThumbnail(result.url)
    } catch {
      notify.error('썸네일 업로드에 실패했습니다.')
      URL.revokeObjectURL(previewUrl)
      setThumbnail('')
      setThumbnailFile(null)
    }
  }

  return (
    <S.FormSection
      as={motion.div}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={
        activeDomainTone
          ? {
              '--active-domain-rgb': activeDomainTone.soft.rgb,
              '--active-domain-accent': isDark
                ? activeDomainTone.dark
                : activeDomainTone.badge,
              '--active-domain-text': isDark
                ? activeDomainTone.soft.textDark
                : activeDomainTone.soft.text,
              '--chip-rgb': activeDomainTone.soft.rgb,
              '--chip-text': activeDomainTone.soft.text,
              '--chip-text-dark': activeDomainTone.soft.textDark,
            }
          : undefined
      }
    >
      <FormGroup
        id="event-form-group-basic"
        aria-labelledby="event-form-group-basic-title"
      >
        <FormGroupTitle id="event-form-group-basic-title">
          기본 정보
        </FormGroupTitle>
        {/* 사건명 */}
        <S.FormRow>
          <S.FormLabel htmlFor="event-form-title">
            사건명 <S.Required>*</S.Required>
          </S.FormLabel>
          <S.FormField>
            <TitleInput
              ref={titleInputRef}
              id="event-form-title"
              type="text"
              /* 모달이 열리면 닫기(✕)가 아니라 여기로 — 등록의 첫 동작은 이름 쓰기다 */
              data-autofocus=""
              placeholder="예: 제2차 세계 대전"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={Boolean(titleError)}
              aria-describedby={
                titleError ? 'event-form-title-error' : undefined
              }
            />
            {titleError && (
              <S.ErrorMessage id="event-form-title-error" role="alert">
                {titleError}
              </S.ErrorMessage>
            )}
            {(titleSuggestionSlot ||
              titleYearSuggestion ||
              (onOpenCountryModal && titleSuggestedCountries.length > 0)) && (
              <TitleSuggestionRow aria-label="사건명 자동 감지 추천">
                {titleYearSuggestion && (
                  <TitleSuggestionButton
                    type="button"
                    onClick={applyTitleYearSuggestion}
                  >
                    추천 기간 적용: {titleYearSuggestion.label}
                  </TitleSuggestionButton>
                )}
                {titleSuggestionSlot && (
                  <TitleSuggestionButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      titleSuggestionSlot.onApply()
                    }}
                  >
                    추천 분류 적용: {titleSuggestionSlot.label}
                  </TitleSuggestionButton>
                )}
                {onOpenCountryModal && titleSuggestedCountries.length > 0 && (
                  <TitleSuggestionButton
                    type="button"
                    onClick={() => addBatchParticipants(titleSuggestedCountries)}
                  >
                    추천 참여국 적용:{' '}
                    {titleSuggestedCountries
                      .map((candidate) => candidate.label)
                      .join(' · ')}
                  </TitleSuggestionButton>
                )}
                {[
                  Boolean(titleSuggestionSlot),
                  Boolean(titleYearSuggestion),
                  Boolean(onOpenCountryModal && titleSuggestedCountries.length > 0),
                ].filter(Boolean).length >= 2 && (
                  <TitleApplyAllButton
                    type="button"
                    aria-label="사건명 추천 모두 적용"
                    onClick={() => {
                      playClickSound()
                      titleSuggestionSlot?.onApply()
                      if (titleYearSuggestion) {
                        setStartDate(titleYearSuggestion.startIso)
                        setStartDatePrecision?.('year')
                        setStartTime('')
                        if (!endDate) {
                          setEndDate(titleYearSuggestion.endIso)
                          setEndDatePrecision?.('year')
                          setEndTime('')
                        }
                      }
                      if (onOpenCountryModal && titleSuggestedCountries.length > 0) {
                        addBatchParticipants(titleSuggestedCountries)
                      }
                    }}
                  >
                    한 번에 채우기
                  </TitleApplyAllButton>
                )}
              </TitleSuggestionRow>
            )}
            {similarEventsSlot && similarEventsSlot.candidates.length > 0 && (
              <SimilarEventsBar role="region" aria-label="유사·중복 사건 안내">
                <SimilarEventsLabel>유사 사건</SimilarEventsLabel>
                {similarEventsSlot.candidates.map((candidate) => (
                  <SimilarEventItem key={candidate.id}>
                    <SimilarEventTitle>
                      {candidate.title}
                      {candidate.dateLabel ? ` (${candidate.dateLabel})` : ''}
                    </SimilarEventTitle>
                    {candidate.kind === 'COLLECTION' &&
                      similarEventsSlot.onSelectAsParent && (
                        <SimilarEventActionBtn
                          type="button"
                          aria-label={`'${candidate.title}' 상위 사건으로 지정`}
                          onClick={() => {
                            playClickSound()
                            similarEventsSlot.onSelectAsParent?.(candidate)
                          }}
                        >
                          상위 사건으로 지정
                        </SimilarEventActionBtn>
                      )}
                    {similarEventsSlot.onAddAsRelated && (
                      <SimilarEventActionBtn
                        type="button"
                        aria-label={`'${candidate.title}' 연관 사건으로 추가`}
                        onClick={() => {
                          playClickSound()
                          similarEventsSlot.onAddAsRelated?.(candidate)
                        }}
                      >
                        연관 사건으로 추가
                      </SimilarEventActionBtn>
                    )}
                  </SimilarEventItem>
                ))}
              </SimilarEventsBar>
            )}
          </S.FormField>
        </S.FormRow>

        {/* 기간 — 사건명 바로 다음에 배치하여 시대 기준(역사국가·동시대 사건/인물)을 먼저 잡는다 */}
        <S.FormRow>
          <S.FormLabel>
            <div>
              기간 <S.Required>*</S.Required>
            </div>
            {startDate &&
              endDate &&
              !getDateError() &&
              (showStartTime && showEndTime ? (
                <S.PeriodBadge>
                  <FiClock size={12} />
                  {calculateDaysDifference()}일
                  {calculateDaysDifference() !== null &&
                    calculateDaysDifference()! > 365 && (
                      <span>
                        {' '}
                        (약 {Math.floor(calculateDaysDifference()! / 365)}년)
                      </span>
                    )}
                </S.PeriodBadge>
              ) : (
                (() => {
                  const sYear = signedYearFromIsoLike(startDate)
                  const eYear = signedYearFromIsoLike(endDate)
                  if (sYear != null && eYear != null && eYear > sYear) {
                    return (
                      <S.PeriodBadge>
                        <FiClock size={12} />약 {eYear - sYear}년
                      </S.PeriodBadge>
                    )
                  }
                  return null
                })()
              ))}
          </S.FormLabel>
          <S.FormField>
            <DateRangeGrid>
              <S.DateRangeColumn id="event-form-start-date">
                <S.DateRangeLabel>시작</S.DateRangeLabel>
                <DateTimeLine>
                  <EventDateField
                    anchorId={startDateAnchorId}
                    value={startDate}
                    precision={startDatePrecision}
                    allowPartial={allowPartialDate}
                    onChange={(iso, precision) => {
                      setStartDate(iso)
                      setStartDatePrecision?.(precision)
                      if (precision !== 'day') setStartTime('')
                      if (shouldEndFollowStart(endFollowsStart, startDate, endDate)) {
                        if (!endFollowsStart) setEndFollowsStart(true)
                        setEndDate(iso)
                        setEndDatePrecision?.(precision)
                        if (precision !== 'day') setEndTime('')
                      }
                    }}
                    onInputErrorChange={(message) => reportDateInputError('start', message)}
                    ariaLabel="시작 날짜"
                    pickerTitle="시작 일자 선택"
                    error={Boolean(startInputError || startDateError)}
                    maxDate={
                      endDate && !endFollowsStart ? isoPeriodEnd(endDate, endDatePrecision) : undefined
                    }
                    onPickedFromCalendar={focusEndDateField}
                  />
                  {showStartTime && (
                    <TimeTrigger
                      ref={startTimeTriggerRef}
                      aria-haspopup="dialog"
                      {...keyboardTrigger}
                      aria-label={`시작 시각${startTime ? ` ${startTime}` : ' (선택)'}`}
                      aria-expanded={isStartTimeModalOpen}
                      data-open={isStartTimeModalOpen || undefined}
                      data-empty={!startTime || undefined}
                      onClick={() => {
                        playClickSound()
                        setIsStartTimeModalOpen(true)
                      }}
                    >
                      <FiClock size={14} />
                      <S.DateInputDisplay>
                        {startTime || '시각'}
                      </S.DateInputDisplay>
                    </TimeTrigger>
                  )}
                </DateTimeLine>
              </S.DateRangeColumn>

              <S.DateRangeColumn>
                <S.DateRangeLabel>종료</S.DateRangeLabel>
                <DateTimeLine>
                  <EventDateField
                    anchorId={endDateAnchorId}
                    value={endDate}
                    precision={endDatePrecision}
                    allowPartial={allowPartialDate}
                    onChange={(iso, precision) => {
                      setEndFollowsStart(false)
                      setEndDate(iso)
                      setEndDatePrecision?.(precision)
                      if (precision !== 'day') setEndTime('')
                    }}
                    onInputErrorChange={(message) => reportDateInputError('end', message)}
                    ariaLabel="종료 날짜"
                    pickerTitle="종료 일자 선택"
                    error={Boolean(endInputError || endDateError || getDateError())}
                    minDate={startDate || undefined}
                  />
                  {showEndTime && (
                    <TimeTrigger
                      ref={endTimeTriggerRef}
                      aria-haspopup="dialog"
                      {...keyboardTrigger}
                      aria-label={`종료 시각${endTime ? ` ${endTime}` : ' (선택)'}`}
                      aria-expanded={isEndTimeModalOpen}
                      data-open={isEndTimeModalOpen || undefined}
                      data-empty={!endTime || undefined}
                      onClick={() => {
                        playClickSound()
                        setIsEndTimeModalOpen(true)
                      }}
                    >
                      <FiClock size={14} />
                      <S.DateInputDisplay>
                        {endTime || '시각'}
                      </S.DateInputDisplay>
                    </TimeTrigger>
                  )}
                </DateTimeLine>
              </S.DateRangeColumn>
            </DateRangeGrid>
            {(startInputError || endInputError || startDateError || endDateError || getDateError()) && (
              <S.ErrorMessage role="alert">
                {startInputError
                  ? `시작: ${startInputError}`
                  : endInputError
                    ? `종료: ${endInputError}`
                    : (startDateError ?? endDateError ?? getDateError())}
              </S.ErrorMessage>
            )}
          </S.FormField>
        </S.FormRow>

        {/* 분야 — 사건의 분류이자 색·필터의 기준이라 필수. 종류(단일/묶음)는 별도 행 대신 같은 흐름에서 간결하게 전환 */}
        <S.FormRow>
          <S.FormLabel as="span" id="event-form-category-label">
            분야 <S.Required>*</S.Required>
          </S.FormLabel>
          <S.FormField>
            <S.CategoryGrid
              id="event-form-category-grid"
              role="radiogroup"
              aria-labelledby="event-form-category-label"
              onKeyDown={handleCategoryKeyDown}
            >
              {EVENT_DOMAIN_ORDER.map((key, index) => {
                const domain = EVENT_DOMAINS[key]
                const Icon = domain.Icon
                const isSelected = category === key
                return (
                  <S.CategoryCard
                    key={key}
                    ref={(element) => {
                      categoryButtonsRef.current[index] = element
                    }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-pressed={isSelected}
                    tabIndex={index === categoryTabStop ? 0 : -1}
                    title={domain.tagline}
                    style={
                      {
                        '--cat-rgb': domain.soft.rgb,
                        '--cat-text': isDark ? domain.soft.textDark : domain.soft.text,
                        '--cat-accent': isDark ? domain.dark : domain.badge,
                      } as React.CSSProperties
                    }
                    $selected={isSelected}
                    onClick={() => {
                      playClickSound()
                      setCategory(isSelected ? '' : key)
                    }}
                  >
                    <S.CategoryIcon $selected={isSelected}>
                      <Icon size={13} />
                    </S.CategoryIcon>
                    <S.CategoryLabel>{domain.label}</S.CategoryLabel>
                  </S.CategoryCard>
                )
              })}
            </S.CategoryGrid>
            {categoryError && (
              <S.ErrorMessage id="event-form-category-error" role="alert">
                {categoryError}
              </S.ErrorMessage>
            )}
          </S.FormField>
        </S.FormRow>

        {/* 세부 분야 — 분야의 2단계(선택) + 사건 단위(단일/묶음) */}
        {(typeSlot || kindSlot) && (
          <S.FormRow>
            <S.FormLabel as="span">
              세부 분야<OptionalTag>(선택)</OptionalTag>
            </S.FormLabel>
            <S.FormField>
              {typeSlot}
              {kindSlot && (
                <KindInlineRow>
                  <KindInlineLabel>단위</KindInlineLabel>
                  <SegmentControl
                    ariaLabel="사건 종류"
                    value={kindSlot.value}
                    onChange={(next) => {
                      playClickSound()
                      kindSlot.onChange(next)
                    }}
                    options={[
                      { value: 'SINGLE', label: '단일 사건' },
                      { value: 'COLLECTION', label: '묶음 사건 (하위 사건 포함)' },
                    ]}
                  />
                </KindInlineRow>
              )}
            </S.FormField>
          </S.FormRow>
        )}

        {/* 개요 설명 — 기본 정보의 마무리로 사건 요약을 바로 적는다 */}
        <S.FormRow>
          <S.FormLabel>
            개요 설명<OptionalTag>(선택)</OptionalTag>
          </S.FormLabel>
          <S.FormField>
            <OverviewTextarea
              placeholder="사건의 개요 설명을 입력하세요."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </S.FormField>
        </S.FormRow>
      </FormGroup>

      {(onOpenCountryModal || recordsSlot) && (
        <FormGroup
          id="event-form-group-participants"
          aria-labelledby="event-form-group-participants-title"
        >
          <FormGroupTitle id="event-form-group-participants-title">
            {recordsSlot ? `참여 주체 · ${recordsSlot.title}` : '참여 주체'}
          </FormGroupTitle>
          {/* 참여국 */}
          {onOpenCountryModal && (
            <S.FormRow>
              <S.FormLabel>
                참여국
                <OptionalTag>{participantsCoreOf ? `(${participantsCoreOf} 핵심 기록)` : '(선택)'}</OptionalTag>
              </S.FormLabel>
              <S.FormField>
                {relatedCountries.length > 0 && (
                  <ParticipantList>
                    {relatedCountries.map((participant, index) => {
                      const isHistorical = Boolean(
                        participant.historicalCountryId,
                      )
                      const country = isHistorical
                        ? availableHistoricalCountries.find(
                            (candidate) =>
                              candidate.id ===
                              participant.historicalCountryId,
                          )
                        : availableCountries.find(
                            (candidate) =>
                              candidate.id === participant.countryId,
                          )
                      if (!country) return null
                      const key = participantKey(participant)
                      const currentRole: EventCountryRole =
                        participant.role ?? 'PARTICIPANT'
                      const patch = (
                        next: Partial<EventCountryParticipant>,
                      ) =>
                        setRelatedCountries(
                          relatedCountries.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, ...next } : row,
                          ),
                        )
                      return (
                        <ParticipantRow key={key}>
                          <ParticipantName>{country.name}</ParticipantName>
                          <RoleSelect
                            value={currentRole}
                            aria-label={`${country.name} 역할`}
                            title={
                              eventCountryRoleHint(currentRole) ?? undefined
                            }
                            onChange={(changeEvent) =>
                              patch({
                                role: changeEvent.target
                                  .value as EventCountryParticipant['role'],
                              })
                            }
                          >
                            {EVENT_COUNTRY_ROLE_OPTIONS.filter(
                              (option) =>
                                !option.deprecated ||
                                option.value === participant.role,
                            ).map((option) => (
                              <option
                                key={option.value}
                                value={option.value}
                                title={option.hint}
                              >
                                {option.label}
                              </option>
                            ))}
                          </RoleSelect>
                          {participantSidesSlot && (
                            <ParticipantSideGroup
                              role="group"
                              aria-label={`${country.name} 진영 배정`}
                            >
                              {(['A', 'B'] as const).map((slot, slotIdx) => {
                                const currentSlot =
                                  participantSidesSlot.assignment[key] ?? null
                                const active = currentSlot === slot
                                return (
                                  <ParticipantSideBtn
                                    key={slot}
                                    type="button"
                                    aria-pressed={active}
                                    $active={active}
                                    title={`${slotIdx + 1}번 진영 (${participantSidesSlot.sideNames[slotIdx]})`}
                                    aria-label={`${country.name} ${slotIdx + 1}편`}
                                    onClick={() => {
                                      playClickSound()
                                      participantSidesSlot.onAssign(
                                        key,
                                        active ? null : slot,
                                      )
                                    }}
                                  >
                                    {slotIdx + 1}편
                                  </ParticipantSideBtn>
                                )
                              })}
                            </ParticipantSideGroup>
                          )}
                          <RoleDescriptionInput
                            type="text"
                            value={participant.roleDescription ?? ''}
                            aria-label={`${country.name}가 한 일`}
                            placeholder={roleDescriptionPlaceholder}
                            onChange={(changeEvent) =>
                              patch({
                                roleDescription: changeEvent.target.value,
                              })
                            }
                          />
                          <ParticipantActions>
                            {relatedCountries.length > 1 && (
                              <>
                                <ParticipantMoveButton
                                  type="button"
                                  disabled={index === 0}
                                  aria-label={`${country.name} 위로 이동`}
                                  title="위로 이동"
                                  onClick={() => {
                                    playClickSound()
                                    setRelatedCountries(
                                      moveParticipant(
                                        relatedCountries,
                                        index,
                                        'up',
                                      ),
                                    )
                                  }}
                                >
                                  <FiArrowUp size={13} />
                                </ParticipantMoveButton>
                                <ParticipantMoveButton
                                  type="button"
                                  disabled={
                                    index === relatedCountries.length - 1
                                  }
                                  aria-label={`${country.name} 아래로 이동`}
                                  title="아래로 이동"
                                  onClick={() => {
                                    playClickSound()
                                    setRelatedCountries(
                                      moveParticipant(
                                        relatedCountries,
                                        index,
                                        'down',
                                      ),
                                    )
                                  }}
                                >
                                  <FiArrowDown size={13} />
                                </ParticipantMoveButton>
                              </>
                            )}
                            <ParticipantRemove
                              type="button"
                              aria-label={`${country.name} 제거`}
                              onClick={() => {
                                playClickSound()
                                setRelatedCountries(
                                  relatedCountries.filter(
                                    (row) => participantKey(row) !== key,
                                  ),
                                )
                                participantSidesSlot?.onAssign(key, null)
                              }}
                            >
                              <FiX size={14} />
                            </ParticipantRemove>
                          </ParticipantActions>
                        </ParticipantRow>
                      )
                    })}
                  </ParticipantList>
                )}
                <CountryQuickSearchRow>
                  <CountryQuickSearchAnchor
                    onBlur={(blurEvent) => {
                      if (
                        !blurEvent.currentTarget.contains(
                          blurEvent.relatedTarget as Node | null,
                        )
                      ) {
                        setIsCountryQuickDismissed(true)
                      }
                    }}
                  >
                    <CountryQuickSearchInput
                      type="search"
                      aria-label="참여국 빠른 검색"
                      placeholder="국가 이름·약칭 빠른 검색 (예: 청일, 영프, 프랑스, 영국…)"
                      value={countryQuickQuery}
                      onFocus={() => setIsCountryQuickDismissed(false)}
                      onChange={(changeEvent) => {
                        setCountryQuickQuery(changeEvent.target.value)
                        setActiveCountryResultIndex(0)
                        setIsCountryQuickDismissed(false)
                      }}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'ArrowDown') {
                          if (quickCountryMatches.length > 0) {
                            keyEvent.preventDefault()
                            setIsCountryQuickDismissed(false)
                            setActiveCountryResultIndex(
                              (prev) => (prev + 1) % quickCountryMatches.length,
                            )
                          }
                        } else if (keyEvent.key === 'ArrowUp') {
                          if (quickCountryMatches.length > 0) {
                            keyEvent.preventDefault()
                            setIsCountryQuickDismissed(false)
                            setActiveCountryResultIndex(
                              (prev) =>
                                (prev - 1 + quickCountryMatches.length) %
                                quickCountryMatches.length,
                            )
                          }
                        } else if (keyEvent.key === 'Enter') {
                          if (
                            batchCountryMatches.length >= 2 &&
                            activeCountryResultIndex === 0
                          ) {
                            keyEvent.preventDefault()
                            addBatchParticipants(batchCountryMatches)
                          } else if (quickCountryMatches.length > 0) {
                            keyEvent.preventDefault()
                            const target =
                              quickCountryMatches[
                                Math.min(
                                  activeCountryResultIndex,
                                  quickCountryMatches.length - 1,
                                )
                              ] ?? quickCountryMatches[0]
                            addQuickParticipant({
                              countryId: target.countryId,
                              historicalCountryId: target.historicalCountryId,
                            })
                          }
                        } else if (
                          keyEvent.key === 'Escape' &&
                          countryQuickQuery
                        ) {
                          keyEvent.preventDefault()
                          setCountryQuickQuery('')
                          setActiveCountryResultIndex(0)
                        }
                      }}
                    />
                    {countryQuickQuery.trim() && !isCountryQuickDismissed && (
                      <CountryQuickResultBox
                        role="region"
                        aria-label="참여국 빠른 검색 결과"
                      >
                        {batchCountryMatches.length >= 2 && (
                          <CountryQuickBatchButton
                            type="button"
                            onClick={() =>
                              addBatchParticipants(batchCountryMatches)
                            }
                          >
                            +{' '}
                            {batchCountryMatches
                              .map((candidate) => candidate.name)
                              .join(' · ')}{' '}
                            ({batchCountryMatches.length}개국 한 번에 추가)
                          </CountryQuickBatchButton>
                        )}
                        {quickCountryMatches.length > 0 ? (
                          quickCountryMatches.map((match, matchIdx) => (
                            <CountryQuickResultButton
                              key={match.key}
                              type="button"
                              $active={matchIdx === activeCountryResultIndex}
                              onMouseEnter={() =>
                                setActiveCountryResultIndex(matchIdx)
                              }
                              onClick={() =>
                                addQuickParticipant({
                                  countryId: match.countryId,
                                  historicalCountryId:
                                    match.historicalCountryId,
                                })
                              }
                            >
                              <CountryQuickResultName>
                                + {match.label}
                              </CountryQuickResultName>
                              <CountryQuickResultMeta>
                                {match.eraMatched && (
                                  <CountryEraBadge>시대 일치</CountryEraBadge>
                                )}
                                {match.meta && <span>{match.meta}</span>}
                              </CountryQuickResultMeta>
                            </CountryQuickResultButton>
                          ))
                        ) : (
                          batchCountryMatches.length < 2 && (
                            <CountryQuickEmpty>
                              &lsquo;{countryQuickQuery.trim()}&rsquo;에 맞는
                              국가가 없습니다.
                            </CountryQuickEmpty>
                          )
                        )}
                      </CountryQuickResultBox>
                    )}
                  </CountryQuickSearchAnchor>
                  <S.AddButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      onOpenCountryModal()
                    }}
                  >
                    <FiPlus size={15} />
                    {relatedCountries.length > 0 ? '국가 더 추가' : '국가 추가'}
                  </S.AddButton>
                  {relatedCountries.length === 2 && (
                    <S.AddButton
                      type="button"
                      title="두 참여국의 순서·역할(주도↔대상)·진영(1편↔2편)을 한 번에 맞바꿉니다"
                      onClick={handleSwapTwoParticipants}
                    >
                      역할·순서 맞바꾸기
                    </S.AddButton>
                  )}
                  {parentCountriesSlot && (
                    <S.AddButton
                      type="button"
                      title={`'${parentCountriesSlot.parentTitle}'의 참여국 중 아직 없는 나라를 넣습니다(역할은 비워 둠)`}
                      onClick={() => {
                        playClickSound()
                        parentCountriesSlot.onImport()
                      }}
                    >
                      <FiPlus size={15} />
                      상위 사건 참여국 {parentCountriesSlot.count}개 불러오기
                    </S.AddButton>
                  )}
                  {titleSuggestedCountries.length > 0 ? (
                    <RecentParticipantBar aria-label="사건명 추천 참여국">
                      <RecentParticipantLabel>추천</RecentParticipantLabel>
                      {titleSuggestedCountries.map((candidate) => (
                        <RecentParticipantChip
                          key={candidate.key}
                          type="button"
                          onClick={() =>
                            addQuickParticipant({
                              countryId: candidate.countryId,
                              historicalCountryId:
                                candidate.historicalCountryId,
                            })
                          }
                        >
                          + {candidate.label}
                        </RecentParticipantChip>
                      ))}
                      {titleSuggestedCountries.length >= 2 && (
                        <SuggestAllChip
                          type="button"
                          aria-label="사건명 추천 참여국 모두 추가"
                          onClick={() =>
                            addBatchParticipants(titleSuggestedCountries)
                          }
                        >
                          모두 추가 ({titleSuggestedCountries.length})
                        </SuggestAllChip>
                      )}
                    </RecentParticipantBar>
                  ) : (
                    relatedCountries.length === 0 &&
                    recentParticipantSuggestions.length > 0 && (
                      <RecentParticipantBar aria-label="최근 사용한 참여국">
                        <RecentParticipantLabel>최근</RecentParticipantLabel>
                        {recentParticipantSuggestions.map((entry) => (
                          <RecentParticipantChip
                            key={entry.key}
                            type="button"
                            onClick={() =>
                              addQuickParticipant({
                                countryId: entry.countryId,
                                historicalCountryId: entry.historicalCountryId,
                              })
                            }
                          >
                            + {entry.label}
                          </RecentParticipantChip>
                        ))}
                      </RecentParticipantBar>
                    )
                  )}
                </CountryQuickSearchRow>
                {historicalLifespanWarnings.map((item) => (
                  <AlertBox
                    key={item.id}
                    variant="warning"
                    style={{ marginTop: 6 }}
                  >
                    <strong>{item.name}</strong> {item.mismatch} 국가 소멸 전후
                    소급·연속 사건 등 정당한 경우라면 그대로 저장하세요.
                    {item.replacement && (
                      <LifespanReplaceBtn
                        type="button"
                        onClick={() =>
                          replaceParticipantAt(
                            item.index,
                            item.key,
                            item.replacement!,
                          )
                        }
                      >
                        {item.replacement.label}(으)로 교체
                      </LifespanReplaceBtn>
                    )}
                  </AlertBox>
                ))}
              </S.FormField>
            </S.FormRow>
          )}
          {/* 세부 분야의 핵심 기록 — 참여국 바로 아래에 이어서 배치 */}
          {recordsSlot && recordsSlot.content}
        </FormGroup>
      )}

      <FormGroup
        id="event-form-group-context"
        aria-labelledby="event-form-group-context-title"
      >
        <FormGroupTitle id="event-form-group-context-title">
          맥락 · 부가 정보
        </FormGroupTitle>

        {/* 상위 사건 */}
        {parentEventSlot && (
          <S.FormRow>
            <S.FormLabel>
              상위 사건<OptionalTag>(선택)</OptionalTag>
            </S.FormLabel>
            <S.FormField>
              {parentEventSlot.parent ? (
                <InlineControlRow>
                  <S.SelectedItemsContainer>
                    <S.SelectedItem>
                      <span>{parentEventSlot.parent.title}</span>
                      <S.RemoveButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          parentEventSlot.onClear()
                        }}
                        aria-label={`상위 사건 '${parentEventSlot.parent.title}' 해제`}
                      >
                        <FiX size={14} />
                      </S.RemoveButton>
                    </S.SelectedItem>
                    <S.AddButton
                      type="button"
                      onClick={() => {
                        playClickSound()
                        parentEventSlot.onOpenPicker()
                      }}
                    >
                      변경
                    </S.AddButton>
                  </S.SelectedItemsContainer>
                </InlineControlRow>
              ) : (
                <CountryQuickSearchRow>
                  {parentEventSlot.quickSearch && (
                    <CountryQuickSearchAnchor
                      onBlur={(blurEvent) => {
                        if (
                          !blurEvent.currentTarget.contains(
                            blurEvent.relatedTarget as Node | null,
                          )
                        ) {
                          setIsParentQuickDismissed(true)
                        }
                      }}
                    >
                      <CountryQuickSearchInput
                        type="search"
                        aria-label="상위 사건 빠른 검색"
                        placeholder="묶음 사건명으로 빠른 검색"
                        value={parentEventSlot.quickSearch.query}
                        onFocus={() => setIsParentQuickDismissed(false)}
                        onChange={(changeEvent) => {
                          parentEventSlot.quickSearch?.onQueryChange(
                            changeEvent.target.value,
                          )
                          setActiveParentResultIndex(0)
                          setIsParentQuickDismissed(false)
                        }}
                        onKeyDown={(keyEvent) => {
                          const matches =
                            parentEventSlot.quickSearch?.candidates ?? []
                          if (keyEvent.key === 'ArrowDown') {
                            if (matches.length > 0) {
                              keyEvent.preventDefault()
                              setIsParentQuickDismissed(false)
                              setActiveParentResultIndex(
                                (prev) => (prev + 1) % matches.length,
                              )
                            }
                          } else if (keyEvent.key === 'ArrowUp') {
                            if (matches.length > 0) {
                              keyEvent.preventDefault()
                              setIsParentQuickDismissed(false)
                              setActiveParentResultIndex(
                                (prev) =>
                                  (prev - 1 + matches.length) % matches.length,
                              )
                            }
                          } else if (keyEvent.key === 'Enter') {
                            if (matches.length > 0) {
                              keyEvent.preventDefault()
                              const target =
                                matches[
                                  Math.min(
                                    activeParentResultIndex,
                                    matches.length - 1,
                                  )
                                ] ?? matches[0]
                              playClickSound()
                              parentEventSlot.quickSearch?.onSelectCandidate?.(
                                target,
                              )
                              setActiveParentResultIndex(0)
                            }
                          } else if (
                            keyEvent.key === 'Escape' &&
                            parentEventSlot.quickSearch?.query
                          ) {
                            keyEvent.preventDefault()
                            parentEventSlot.quickSearch.onQueryChange('')
                            setActiveParentResultIndex(0)
                          }
                        }}
                      />
                      {parentEventSlot.quickSearch.query.trim() &&
                        !isParentQuickDismissed && (
                          <CountryQuickResultBox
                            role="region"
                            aria-label="상위 사건 빠른 검색 결과"
                          >
                          {parentEventSlot.quickSearch.candidates.length > 0 ? (
                            parentEventSlot.quickSearch.candidates.map(
                              (candidate, candidateIdx) => (
                                <CountryQuickResultButton
                                  key={candidate.id}
                                  type="button"
                                  $active={
                                    candidateIdx === activeParentResultIndex
                                  }
                                  onMouseEnter={() =>
                                    setActiveParentResultIndex(candidateIdx)
                                  }
                                  onClick={() => {
                                    playClickSound()
                                    parentEventSlot.quickSearch?.onSelectCandidate?.(
                                      candidate,
                                    )
                                    setActiveParentResultIndex(0)
                                  }}
                                >
                                  <CountryQuickResultName>
                                    {candidate.title}
                                  </CountryQuickResultName>
                                  {candidate.dateLabel && (
                                    <CountryQuickResultMeta>
                                      <span>{candidate.dateLabel}</span>
                                    </CountryQuickResultMeta>
                                  )}
                                </CountryQuickResultButton>
                              ),
                            )
                          ) : (
                            <CountryQuickEmpty>
                              {parentEventSlot.quickSearch.isSearching
                                ? '검색 중…'
                                : `‘${parentEventSlot.quickSearch.query.trim()}’에 맞는 묶음 사건이 없습니다.`}
                            </CountryQuickEmpty>
                          )}
                        </CountryQuickResultBox>
                      )}
                    </CountryQuickSearchAnchor>
                  )}
                  <S.AddButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      parentEventSlot.onOpenPicker()
                    }}
                  >
                    <FiPlus size={15} />
                    상위 사건 선택
                  </S.AddButton>
                </CountryQuickSearchRow>
              )}
            </S.FormField>
          </S.FormRow>
        )}

        {/* 연관 사건 */}
        {relatedEventsSlot && (
          <S.FormRow>
            <S.FormLabel>
              연관 사건<OptionalTag>(선택)</OptionalTag>
            </S.FormLabel>
            <S.FormField>
              {relatedEventsSlot.items.length > 0 && (
                <ParticipantList>
                  {relatedEventsSlot.items.map((item, index) => {
                    const roleKey = toRelationRoleKey(
                      item.relationType,
                      item.direction,
                    )
                    const patchItem = (next: Partial<EventRelatedDraft>) =>
                      relatedEventsSlot.onChange(
                        relatedEventsSlot.items.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, ...next } : row,
                        ),
                      )
                    return (
                      <ParticipantRow key={item.relatedEventId}>
                        <ParticipantName>{item.title}</ParticipantName>
                        {item.dateLabel && (
                          <RelatedEventDateMeta>
                            {item.dateLabel}
                          </RelatedEventDateMeta>
                        )}
                        <RoleSelect
                          value={roleKey}
                          aria-label={`${item.title} 관계 역할`}
                          onChange={(changeEvent) => {
                            const parsed = parseRelationRoleKey(
                              changeEvent.target
                                .value as EventRelationRoleKey,
                            )
                            patchItem({
                              relationType: parsed.relationType,
                              direction: parsed.direction,
                            })
                          }}
                        >
                          {EVENT_RELATION_ROLE_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </RoleSelect>
                        <RelatedDescriptionInput
                          type="text"
                          value={item.description ?? ''}
                          aria-label={`${item.title} 관계 설명`}
                          placeholder="어떻게 이어지는지 한 줄 설명 (선택)"
                          onChange={(changeEvent) =>
                            patchItem({
                              description: changeEvent.target.value,
                            })
                          }
                        />
                        <ParticipantActions>
                          <ParticipantRemove
                            type="button"
                            aria-label={`${item.title} 연관 해제`}
                            onClick={() => {
                              playClickSound()
                              relatedEventsSlot.onChange(
                                relatedEventsSlot.items.filter(
                                  (row) =>
                                    row.relatedEventId !==
                                    item.relatedEventId,
                                ),
                              )
                            }}
                          >
                            <FiX size={14} />
                          </ParticipantRemove>
                        </ParticipantActions>
                      </ParticipantRow>
                    )
                  })}
                </ParticipantList>
              )}
              <CountryQuickSearchRow>
                {relatedEventsSlot.quickSearch && (
                  <CountryQuickSearchAnchor
                    onBlur={(blurEvent) => {
                      if (
                        !blurEvent.currentTarget.contains(
                          blurEvent.relatedTarget as Node | null,
                        )
                      ) {
                        setIsRelatedQuickDismissed(true)
                      }
                    }}
                  >
                    <CountryQuickSearchInput
                      type="search"
                      aria-label="연관 사건 빠른 검색"
                      placeholder="사건명으로 빠른 검색하여 추가"
                      value={relatedEventsSlot.quickSearch.query}
                      onFocus={() => setIsRelatedQuickDismissed(false)}
                      onChange={(changeEvent) => {
                        relatedEventsSlot.quickSearch?.onQueryChange(
                          changeEvent.target.value,
                        )
                        setActiveRelatedResultIndex(0)
                        setIsRelatedQuickDismissed(false)
                      }}
                      onKeyDown={(keyEvent) => {
                        const matches =
                          relatedEventsSlot.quickSearch?.candidates ?? []
                        if (keyEvent.key === 'ArrowDown') {
                          if (matches.length > 0) {
                            keyEvent.preventDefault()
                            setIsRelatedQuickDismissed(false)
                            setActiveRelatedResultIndex(
                              (prev) => (prev + 1) % matches.length,
                            )
                          }
                        } else if (keyEvent.key === 'ArrowUp') {
                          if (matches.length > 0) {
                            keyEvent.preventDefault()
                            setIsRelatedQuickDismissed(false)
                            setActiveRelatedResultIndex(
                              (prev) =>
                                (prev - 1 + matches.length) % matches.length,
                            )
                          }
                        } else if (keyEvent.key === 'Enter') {
                          if (matches.length > 0) {
                            keyEvent.preventDefault()
                            const target =
                              matches[
                                Math.min(
                                  activeRelatedResultIndex,
                                  matches.length - 1,
                                )
                              ] ?? matches[0]
                            addRelatedEventCandidate(target)
                          }
                        } else if (
                          keyEvent.key === 'Escape' &&
                          relatedEventsSlot.quickSearch?.query
                        ) {
                          keyEvent.preventDefault()
                          relatedEventsSlot.quickSearch.onQueryChange('')
                          setActiveRelatedResultIndex(0)
                        }
                      }}
                    />
                    {relatedEventsSlot.quickSearch.query.trim() &&
                      !isRelatedQuickDismissed && (
                        <CountryQuickResultBox
                          role="region"
                          aria-label="연관 사건 빠른 검색 결과"
                        >
                        {relatedEventsSlot.quickSearch.candidates.length > 0 ? (
                          relatedEventsSlot.quickSearch.candidates.map(
                            (candidate, candidateIdx) => (
                              <CountryQuickResultButton
                                key={candidate.id}
                                type="button"
                                $active={
                                  candidateIdx === activeRelatedResultIndex
                                }
                                onMouseEnter={() =>
                                  setActiveRelatedResultIndex(candidateIdx)
                                }
                                onClick={() =>
                                  addRelatedEventCandidate(candidate)
                                }
                              >
                                <CountryQuickResultName>
                                  + {candidate.title}
                                </CountryQuickResultName>
                                {candidate.dateLabel && (
                                  <CountryQuickResultMeta>
                                    <span>{candidate.dateLabel}</span>
                                  </CountryQuickResultMeta>
                                )}
                              </CountryQuickResultButton>
                            ),
                          )
                        ) : (
                          <CountryQuickEmpty>
                            {relatedEventsSlot.quickSearch.isSearching
                              ? '검색 중…'
                              : `‘${relatedEventsSlot.quickSearch.query.trim()}’에 맞는 사건이 없습니다.`}
                          </CountryQuickEmpty>
                        )}
                      </CountryQuickResultBox>
                    )}
                  </CountryQuickSearchAnchor>
                )}
                <S.AddButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    relatedEventsSlot.onOpenPicker()
                  }}
                >
                  <FiPlus size={15} />
                  {relatedEventsSlot.items.length > 0
                    ? '사건 더 추가'
                    : '사건 찾아서 추가'}
                </S.AddButton>
                {relatedEventsSlot.lastSavedEvent &&
                  !relatedEventsSlot.items.some(
                    (item) =>
                      item.relatedEventId ===
                      relatedEventsSlot.lastSavedEvent?.id,
                  ) &&
                  parentEventSlot?.parent?.id !==
                    relatedEventsSlot.lastSavedEvent.id && (
                    <RecentParticipantBar aria-label="방금 등록한 사건 연결">
                      <RecentParticipantLabel>연속 연결</RecentParticipantLabel>
                      <RecentParticipantChip
                        type="button"
                        onClick={() =>
                          addRelatedEventCandidate(
                            relatedEventsSlot.lastSavedEvent!,
                            {
                              relationType: 'LED_TO',
                              direction: 'incoming',
                            },
                          )
                        }
                      >
                        + 방금 등록한 &lsquo;
                        {relatedEventsSlot.lastSavedEvent.title}&rsquo; 계기
                        사건으로 연결
                      </RecentParticipantChip>
                    </RecentParticipantBar>
                  )}
                {relatedEventsSlot.contemporarySuggestions &&
                  relatedEventsSlot.contemporarySuggestions.length > 0 && (
                    <RecentParticipantBar aria-label="동시대 추천 연관 사건">
                      <RecentParticipantLabel>동시대</RecentParticipantLabel>
                      {relatedEventsSlot.contemporarySuggestions
                        .slice(0, 4)
                        .map((candidate) => (
                          <RecentParticipantChip
                            key={candidate.id}
                            type="button"
                            onClick={() => addRelatedEventCandidate(candidate)}
                          >
                            + {candidate.title}
                            {candidate.dateLabel
                              ? ` (${candidate.dateLabel})`
                              : ''}
                          </RecentParticipantChip>
                        ))}
                    </RecentParticipantBar>
                  )}
              </CountryQuickSearchRow>
            </S.FormField>
          </S.FormRow>
        )}

        {/* 키워드: 내 사건 ↔ 타인 사건 매칭용 */}
        <S.FormRow>
          <S.FormLabel>
            키워드
            <OptionalTag>
              {keywords.length > 0
                ? `(${keywords.length}/${KEYWORD_MAX_COUNT})`
                : '(선택)'}
            </OptionalTag>
          </S.FormLabel>
          <S.FormField>
            <S.Input
              type="text"
              aria-label="키워드 입력"
              placeholder="같은 사건 매칭용 대표 낱말 입력 후 Enter 또는 쉼표(,) — 최대 20개·각 30자"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onBlur={() => {
                if (keywordInput.trim()) {
                  addKeywordsFromInput()
                }
              }}
              onKeyDown={(e) => {
                if ((e.nativeEvent as KeyboardEvent).isComposing) return
                if (e.key === 'Enter' || e.key === ',') {
                  if (keywordInput.trim()) {
                    e.preventDefault()
                    addKeywordsFromInput()
                  } else if (e.key === ',') {
                    e.preventDefault()
                  }
                } else if (
                  e.key === 'Backspace' &&
                  keywordInput === '' &&
                  keywords.length > 0
                ) {
                  e.preventDefault()
                  setKeywords(keywords.slice(0, -1))
                }
              }}
            />
            {keywordValidationMsg && (
              <S.ErrorMessage role="alert">
                {keywordValidationMsg}
              </S.ErrorMessage>
            )}
            {keywords.length > 0 && (
              <KeywordChipList>
                {keywords.map((keyword) => (
                  <KeywordChip key={keyword}>
                    {keyword}
                    <KeywordChipRemove
                      type="button"
                      onClick={() =>
                        setKeywords(
                          keywords.filter((item) => item !== keyword),
                        )
                      }
                      aria-label={`${keyword} 제거`}
                    >
                      <FiX size={12} />
                    </KeywordChipRemove>
                  </KeywordChip>
                ))}
                {keywords.length >= 2 && (
                  <KeywordClearAllButton
                    type="button"
                    aria-label="키워드 모두 지우기"
                    onClick={() => {
                      playClickSound()
                      setKeywords([])
                    }}
                  >
                    모두 지우기
                  </KeywordClearAllButton>
                )}
              </KeywordChipList>
            )}
          </S.FormField>
        </S.FormRow>

        {/* 썸네일 이미지 */}
        <S.FormRow>
          <S.FormLabel>
            썸네일 이미지<OptionalTag>(선택)</OptionalTag>
          </S.FormLabel>
          <S.FormField>
            {thumbnail ? (
              <KitUploadFilled
                onDragOver={(dragEvent) => {
                  dragEvent.preventDefault()
                  setIsThumbnailDragOver(true)
                }}
                onDragLeave={() => setIsThumbnailDragOver(false)}
                onDrop={(dropEvent) => {
                  dropEvent.preventDefault()
                  setIsThumbnailDragOver(false)
                  const file = dropEvent.dataTransfer.files?.[0]
                  if (file) {
                    playClickSound()
                    void handleThumbnailUpload(file)
                  }
                }}
              >
                <KitUploadThumb>
                  <img
                    src={getImageUrl(thumbnail)}
                    alt="썸네일 미리보기"
                    onError={() => {
                      if (thumbnail.startsWith('blob:')) {
                        URL.revokeObjectURL(thumbnail)
                      }
                    }}
                  />
                </KitUploadThumb>
                <KitUploadText>
                  <strong>
                    {isThumbnailDragOver
                      ? '여기에 놓아 대표 이미지 바꾸기'
                      : thumbnail.startsWith('blob:')
                        ? '올리는 중…'
                        : '대표 이미지'}
                  </strong>
                  <span>목록과 상세 머리에 쓰입니다</span>
                </KitUploadText>
                <KitUploadActions>
                  <S.UploadButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      thumbnailInputRef.current?.click()
                    }}
                  >
                    바꾸기
                  </S.UploadButton>
                  <KitUploadRemove
                    type="button"
                    aria-label="썸네일 제거"
                    onClick={() => {
                      playClickSound()
                      if (thumbnail.startsWith('blob:')) {
                        URL.revokeObjectURL(thumbnail)
                      }
                      setThumbnail('')
                      setThumbnailFile(null)
                      if (thumbnailInputRef.current) {
                        thumbnailInputRef.current.value = ''
                      }
                    }}
                  >
                    <FiX size={15} />
                  </KitUploadRemove>
                </KitUploadActions>
              </KitUploadFilled>
            ) : (
              <KitUploadStrip
                type="button"
                $dragOver={isThumbnailDragOver}
                onClick={() => {
                  playClickSound()
                  thumbnailInputRef.current?.click()
                }}
                onDragOver={(dragEvent) => {
                  dragEvent.preventDefault()
                  setIsThumbnailDragOver(true)
                }}
                onDragLeave={() => setIsThumbnailDragOver(false)}
                onDrop={(dropEvent) => {
                  dropEvent.preventDefault()
                  setIsThumbnailDragOver(false)
                  const file = dropEvent.dataTransfer.files?.[0]
                  if (file) {
                    playClickSound()
                    void handleThumbnailUpload(file)
                  }
                }}
              >
                <KitUploadThumb aria-hidden>
                  <FiImage size={18} />
                </KitUploadThumb>
                <KitUploadText>
                  <strong>
                    {isThumbnailDragOver
                      ? '여기에 놓아 대표 이미지 올리기'
                      : '대표 이미지 올리기'}
                  </strong>
                  <span>
                    클릭하거나 이미지를 끌어다 놓으세요 · 10MB 이하
                  </span>
                </KitUploadText>
              </KitUploadStrip>
            )}
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                void handleThumbnailUpload(file)
              }}
            />
          </S.FormField>
        </S.FormRow>
      </FormGroup>

      {/* 날짜/시간 선택 모달 */}
      <TimePickerModal
        isOpen={isStartTimeModalOpen}
        onClose={() => setIsStartTimeModalOpen(false)}
        onSelect={(time) => setStartTime(time)}
        initialTime={startTime}
        title="시작 시간 선택"
        anchorEl={startTimeTriggerRef.current}
      />
      <TimePickerModal
        isOpen={isEndTimeModalOpen}
        onClose={() => setIsEndTimeModalOpen(false)}
        onSelect={(time) => setEndTime(time)}
        initialTime={endTime}
        title="종료 시간 선택"
        anchorEl={endTimeTriggerRef.current}
      />
    </S.FormSection>
  )
}

/** 선택(비필수) 필드 라벨 옆 표기 — 필수(*)와 시각적으로 구분 */
const OptionalTag = styled.span`
  margin-left: 4px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => S.getC(theme).text.muted};
`

const ParticipantList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 6px;
`

const ParticipantRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  padding: 9px 0;
  border-bottom: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: transparent;

  &:first-child {
    padding-top: 2px;
  }

  &:last-child {
    padding-bottom: 4px;
    border-bottom: none;
  }
`

const ParticipantSideGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9'};
  flex-shrink: 0;
`

const ParticipantSideBtn = styled.button<{ $active: boolean }>`
  height: 28px;
  padding: 0 9px;
  border-radius: 6px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? theme.colors.activeLight
        : '#ffffff'
      : 'transparent'};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  color: ${({ $active, theme }) =>
    $active
      ? `var(--active-domain-text, ${theme.colors.primary})`
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ParticipantActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
`

const ParticipantMoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: ${({ theme }) => S.getC(theme).text.muted};
  cursor: pointer;

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    background-color: ${({ theme }) => S.getC(theme).background.hover};
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`

const RecentParticipantBar = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  flex-basis: 100%;
  gap: 6px 8px;
  margin-top: 2px;
  font-size: 12px;
`

const RecentParticipantLabel = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RecentParticipantChip = styled.button`
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.default};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const SuggestAllChip = styled.button`
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--active-domain-rgb, 99, 102, 241), 0.45);
  background: rgba(var(--active-domain-rgb, 99, 102, 241), 0.1);
  color: ${({ theme }) => `var(--active-domain-text, ${theme.colors.primary})`};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: rgba(var(--active-domain-rgb, 99, 102, 241), 0.16);
  }
`

const LifespanReplaceBtn = styled.button`
  display: inline-flex;
  align-items: center;
  height: 26px;
  margin-left: 8px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const CountryQuickSearchRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
`

const CountryQuickSearchAnchor = styled.div`
  position: relative;
  flex: 1 1 280px;
  min-width: 0;
`

const CountryQuickSearchInput = styled.input`
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  border-radius: 8px;
  background: ${({ theme }) => S.getC(theme).background.content};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.02)'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13px;
  letter-spacing: -0.01em;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => S.getC(theme).text.muted};
  }

  &:hover:not(:focus) {
    border-color: ${({ theme }) => S.getC(theme).border.hover};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const CountryQuickResultBox = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100%;
  width: max-content;
  max-width: min(440px, 85vw);
  max-height: 200px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1e1e24' : '#ffffff')};
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
`

const CountryQuickBatchButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid rgba(var(--active-domain-rgb, 99, 102, 241), 0.45);
  border-radius: 7px;
  background: rgba(var(--active-domain-rgb, 99, 102, 241), 0.1);
  color: ${({ theme }) => `var(--active-domain-text, ${theme.colors.primary})`};
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
`

const CountryQuickResultButton = styled.button<{ $active?: boolean }>`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 5px 8px;
  border: none;
  border-radius: 7px;
  background: ${({ $active, theme }) =>
    $active ? S.getC(theme).background.hover : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => S.getC(theme).background.hover};
  }
`

const CountryQuickResultName = styled.span`
  font-size: 13px;
  font-weight: 600;
`

const CountryQuickResultMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CountryEraBadge = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(var(--active-domain-rgb, 99, 102, 241), 0.14);
  color: ${({ theme }) => `var(--active-domain-text, ${theme.colors.primary})`};
`

const CountryQuickEmpty = styled.p`
  margin: 0;
  padding: 6px 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/**
 * 행에서 가장 강한 잉크가 '삭제'가 되면 안 된다 — 평소엔 중성색으로 물러나고
 * hover·focus에서만 파괴색을 띤다.
 */
const ParticipantRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  color: ${({ theme }) => S.getC(theme).text.muted};
  cursor: pointer;
  transition:
    color 0.14s,
    background-color 0.14s;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.error};
    background-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => S.getC(theme).border.focus};
    outline-offset: 1px;
  }
`

const ParticipantName = styled.span`
  min-width: 64px;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  margin-right: 2px;
`

/* 행 안 입력칸 공통 — 폼의 다른 입력칸과 같은 테·모서리·포커스 헤일로 */
const participantControl = ({ theme }: { theme: DefaultTheme }) => `
  height: 34px;
  border: 1px solid ${S.getC(theme).border.default};
  border-radius: 8px;
  background-color: ${S.getC(theme).background.content};
  color: ${theme.colors.text.primary};
  font-family: inherit;
  font-size: 13px;
  letter-spacing: -0.01em;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;

  &:hover {
    border-color: ${S.getC(theme).border.hover};
  }
  &:focus,
  &:focus-visible {
    outline: none;
    border-color: ${S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${S.getC(theme).border.focusHalo};
  }
`

/* 네이티브 화살표 대신 자체 셰브론 — 다른 선택칸과 같은 모양 */
const RoleSelect = styled.select`
  ${participantControl}
  appearance: none;
  flex-shrink: 0;
  padding: 0 28px 0 11px;
  font-weight: 600;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
`

const RoleDescriptionInput = styled.input`
  ${participantControl}
  flex: 1 1 180px;
  min-width: 140px;
  height: 34px;
  padding: 0 11px;

  &::placeholder {
    color: ${({ theme }) => S.getC(theme).text.muted};
  }
`

const TitleInput = styled(S.Input)`
  height: 42px;
  padding: 0 14px;
  font-size: 15px;
  font-weight: 600;
`

const OverviewTextarea = styled(S.Textarea)`
  min-height: 112px;
  padding: 11px 13px;
  line-height: 1.6;
`

/* ─── 묶음 ───
 * 행마다 그어 두던 구분선(8개)을 걷고, 성격이 같은 행끼리 묶어 섹션 헤더 바로 구획을 나눈다.
 * 기본 정보(필수 둘 + 카테고리) → 연결(참여국·상위) → 소개(글·키워드·이미지) 순 —
 * 위에서부터 채울수록 '등록할 만한 사건'이 되는 순서다. */
const FormGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 0 12px;

  & + & {
    margin-top: 28px;
    padding-top: 6px;
    border-top: none;
  }

  > ${S.FormRow} {
    padding: 14px 0;
    border-bottom: none;
  }
`

const FormGroupTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 0 0 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => S.getC(theme).border.light};
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(
      --active-domain-accent,
      ${({ theme }) => theme.colors.primary}
    );
    transition: background-color 0.2s ease;
  }
`

const InlineControlRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
`

/* ─── 기간 ─── */
const DateRangeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 14px;
  }
`

const DateTimeLine = styled.div`
  display: flex;
  gap: 8px;

  > :first-child {
    flex: 1;
    min-width: 0;
  }
`

/** 시각 — 날짜 옆 좁은 칸. 비어 있으면 자리표시 글자만 흐리게 */
const TimeTrigger = styled(S.DateInputWrapper)`
  flex: 0 0 104px;

  &[data-empty] ${S.DateInputDisplay} {
    color: ${({ theme }) => S.getC(theme).text.muted};
  }
`

/* ─── 키워드 칩 ─── (인라인 스타일·하드코딩 색 → 폼 토큰) */
const KeywordChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
`

const KeywordChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 4px 0 10px;
  border: 1px solid rgba(var(--active-domain-rgb, 99, 102, 241), 0.24);
  border-radius: 999px;
  background: ${({ theme }) =>
    `rgba(var(--active-domain-rgb, 99, 102, 241), ${theme.mode === 'dark' ? 0.12 : 0.06})`};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.2s ease, border-color 0.2s ease;
`

const KeywordChipRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => S.getC(theme).text.muted};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => S.getC(theme).background.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => S.getC(theme).border.focus};
    outline-offset: 1px;
  }
`

const KeywordClearAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) => theme.colors.error};
    outline: none;
  }
`

const TitleSuggestionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
`

const TitleSuggestionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => `var(--active-domain-text, ${theme.colors.primary})`};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: rgba(var(--active-domain-rgb, 99, 102, 241), 0.55);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const TitleApplyAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--active-domain-rgb, 99, 102, 241), 0.45);
  background: rgba(var(--active-domain-rgb, 99, 102, 241), 0.1);
  color: ${({ theme }) => `var(--active-domain-text, ${theme.colors.primary})`};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: rgba(var(--active-domain-rgb, 99, 102, 241), 0.16);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const SimilarEventsBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 2px;
  font-size: 12px;
`

const SimilarEventsLabel = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SimilarEventItem = styled.span`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const SimilarEventTitle = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SimilarEventActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const KindInlineRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 6px;
`

const KindInlineLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RelatedEventDateMeta = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RelatedDescriptionInput = styled.input`
  ${participantControl}
  flex: 1 1 180px;
  min-width: 140px;
  height: 34px;
  padding: 0 11px;

  &::placeholder {
    color: ${({ theme }) => S.getC(theme).text.muted};
  }
`
