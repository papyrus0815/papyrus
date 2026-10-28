import React, { useEffect, useId, useMemo, useRef, useState } from 'react'

import { motion } from 'framer-motion'
import {
  FiClock,
  FiImage,
  FiPlus,
  FiX,
} from 'react-icons/fi'
import styled, { type DefaultTheme, useTheme } from 'styled-components'

import {
  EVENT_COUNTRY_ROLE_OPTIONS,
  type EventCountryParticipant,
  participantKey,
} from '@/entities/event/model'
import * as S from '@/pages/events/create/event-create.styles'
import { EVENT_DOMAIN_ORDER, EVENT_DOMAINS, type EventDomainKey } from '@/entities/event/model/event-domain'
import { getImageUrl } from '@/pages/events/utils/event-create.utils'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { uploadImage } from '@/shared/api/upload'
import {
  describeLifespanMismatch,
  signedYearFromIsoLike,
} from '@/shared/lib/country-period'
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

import { EventDateField } from './event-date-field'

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
  }

  /** 분야를 안 고르고 제출했을 때 */
  categoryError?: string
  /** 세부 분야 칸 — 분야 바로 아래, 분야 › 세부의 2단계(붙는 기록을 정한다) */
  typeSlot?: React.ReactNode
  /** 세부의 핵심 기록 묶음 — '연결' 묶음 뒤 */
  recordsSlot?: { title: string; content: React.ReactNode }
  /** 참여국이 고른 세부의 핵심 기록이면 그 세부 이름 — 라벨의 '(선택)'을 대신한다 */
  participantsCoreOf?: string

  /** 상위 사건의 참여국 불러오기 — 상위를 골랐고 아직 안 들어온 나라가 있을 때만 */
  parentCountriesSlot?: {
    count: number
    parentTitle: string
    onImport: () => void
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
  kindSlot,
  categoryError,
  typeSlot,
  recordsSlot,
  participantsCoreOf,
  parentCountriesSlot,
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
  const [keywordInput, setKeywordInput] = useState(keywords.join(', '))
  const [keywordValidationMsg, setKeywordValidationMsg] = useState('')
  const skipKeywordSyncRef = useRef(false)

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

  // F33 소프트 경고 — 사건 시점이 선택한 역사국가 존속기간 밖이면 인라인 경고(저장은 허용).
  // 사건 startDate는 '-YYYY'로 BC도 담을 수 있어 recordSupportsBc=true(부호 전 구간 비교).
  // availableHistoricalCountries가 구조화 존속기간(startEra/Year)을 담은 DTO라 그대로 대조.
  const historicalLifespanWarnings = useMemo(() => {
    const eventSignedYear = signedYearFromIsoLike(startDate)
    if (eventSignedYear == null) return []
    return relatedCountries
      .filter((participant) => participant.historicalCountryId)
      .map((participant) => {
        const historicalId = participant.historicalCountryId!
        const country = availableHistoricalCountries.find(
          (candidate) => candidate.id === historicalId,
        )
        if (!country) return null
        const mismatch = describeLifespanMismatch(country, eventSignedYear, {
          recordSupportsBc: true,
        })
        return mismatch
          ? { id: historicalId, name: country.name, mismatch }
          : null
      })
      .filter(
        (item): item is { id: string; name: string; mismatch: string } =>
          item != null,
      )
  }, [startDate, relatedCountries, availableHistoricalCountries])

  const addKeywordsFromInput = () => {
    const raw = keywordInput.trim()
    if (!raw) return
    const parts = raw
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const tooLong = parts.filter((s) => s.length > KEYWORD_MAX_LENGTH)
    const valid = parts
      .filter((s) => s.length <= KEYWORD_MAX_LENGTH)
      .slice(0, KEYWORD_MAX_COUNT - keywords.length)
    if (tooLong.length > 0) {
      setKeywordValidationMsg(
        `키워드는 ${KEYWORD_MAX_LENGTH}자 이내로 입력해 주세요. (${tooLong.length}개 생략됨)`,
      )
      setTimeout(() => setKeywordValidationMsg(''), 4000)
    }
    if (valid.length === 0) return
    let next = [...keywords, ...valid]
      .filter((k, i, arr) => arr.indexOf(k) === i)
      .slice(0, KEYWORD_MAX_COUNT)
    // 한글 조합 중 추가된 짧은 키워드 제거 (예: '히' + '히히' → '히히'만 유지)
    next = next.filter(
      (k) =>
        !next.some(
          (other) =>
            other !== k && other.length > k.length && other.includes(k),
        ),
    )
    if (next.length >= KEYWORD_MAX_COUNT && parts.length > valid.length) {
      setKeywordValidationMsg(
        `키워드는 최대 ${KEYWORD_MAX_COUNT}개까지 등록할 수 있습니다.`,
      )
      setTimeout(() => setKeywordValidationMsg(''), 4000)
    }
    skipKeywordSyncRef.current = true
    setKeywords(next)
    setKeywordInput('')
  }
  useEffect(() => {
    if (!skipKeywordSyncRef.current) setKeywordInput(keywords.join(', '))
    skipKeywordSyncRef.current = false
  }, [keywords])

  return (
    <S.FormSection
      as={motion.div}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <FormGroup aria-labelledby="event-form-group-basic">
        <FormGroupTitle id="event-form-group-basic">기본 정보</FormGroupTitle>
        {/* 사건명 */}
        <S.FormRow>
          <S.FormLabel htmlFor="event-form-title">
            사건명 <S.Required>*</S.Required>
          </S.FormLabel>
          <S.FormField>
            <S.Input
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
          </S.FormField>
        </S.FormRow>

        {/* 분야 — 무엇에 관한 일인가. 사건의 분류이자 색·필터의 기준이라 필수 */}
        <S.FormRow>
          <S.FormLabel as="span" id="event-form-category-label">
            분야 <S.Required>*</S.Required>
          </S.FormLabel>
          <S.FormField>
            <S.CategoryGrid role="group" aria-labelledby="event-form-category-label">
              {EVENT_DOMAIN_ORDER.map((key) => {
                const domain = EVENT_DOMAINS[key]
                const Icon = domain.Icon
                const isSelected = category === key
                /* 목록과 **같은 팔레트**(분야 레지스트리의 soft 톤) — 칩이 CSS 변수로 받는다 */
                return (
                  <S.CategoryCard
                    key={key}
                    type="button"
                    aria-pressed={isSelected}
                    title={domain.tagline}
                    style={
                      {
                        '--cat-rgb': domain.soft.rgb,
                        '--cat-text': isDark ? domain.soft.textDark : domain.soft.text,
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

        {/* 세부 분야 — 분야의 2단계(선택). 어떤 꼴의 일인가 — 붙는 기록을 정한다 */}
        {typeSlot && (
          <S.FormRow>
            <S.FormLabel as="span">
              세부 분야<OptionalTag>(선택)</OptionalTag>
            </S.FormLabel>
            <S.FormField>{typeSlot}</S.FormField>
          </S.FormRow>
        )}

        {/* 종류 — 묶음이면 전개를 하위 사건으로 쌓는다(본문엔 배경·여파만) */}
        {kindSlot && (
          <S.FormRow>
            <S.FormLabel as="span" id="event-form-kind-label">
              종류
            </S.FormLabel>
            <S.FormField>
              <SegmentControl
                appearance="chips"
                ariaLabel="사건 종류"
                value={kindSlot.value}
                onChange={(next) => {
                  playClickSound()
                  kindSlot.onChange(next)
                }}
                options={[
                  { value: 'SINGLE', label: '단일 사건' },
                  { value: 'COLLECTION', label: '묶음 사건' },
                ]}
              />
              <S.Hint>
                {kindSlot.value === 'COLLECTION'
                  ? '전쟁·위기처럼 여러 국면을 거느린 사건. 전개는 하위 사건으로 등록하고, 본문에는 배경과 여파만 씁니다.'
                  : '전투·회담·조약 체결처럼 한 덩어리로 서술하는 사건. 나중에 국면이 늘면 상세에서 하위 사건으로 나눌 수 있습니다.'}
              </S.Hint>
            </S.FormField>
          </S.FormRow>
        )}

        {/* 기간 */}
        <S.FormRow>
          <S.FormLabel>
            <div>
              기간 <S.Required>*</S.Required>
            </div>
            {/* 일수는 둘 다 일까지 알 때만 — '1950 ~ 1953'에 1,096일은 지어낸 숫자다 */}
            {startDate &&
              endDate &&
              !getDateError() &&
              showStartTime &&
              showEndTime && (
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
              )}
          </S.FormLabel>
          <S.FormField>
            <DateRangeGrid>
              <S.DateRangeColumn>
                <S.DateRangeLabel>시작</S.DateRangeLabel>
                {/* 날짜와 시각은 한 줄 — 시각은 쓰는 일이 드물어 날짜 옆 좁은 칸으로 물러난다 */}
                <DateTimeLine>
                  <EventDateField
                    anchorId={startDateAnchorId}
                    value={startDate}
                    precision={startDatePrecision}
                    allowPartial={allowPartialDate}
                    onChange={(iso, precision) => {
                      setStartDate(iso)
                      setStartDatePrecision?.(precision)
                      // 일을 모르게 되면 시각도 모른다 — 숨긴 칸에 값이 남아 저장되지 않게
                      if (precision !== 'day') setStartTime('')
                    }}
                    onInputErrorChange={(message) => reportDateInputError('start', message)}
                    ariaLabel="시작 날짜"
                    pickerTitle="시작 일자 선택"
                    error={Boolean(startInputError || startDateError)}
                    /* 연도만 아는 종료(1953-01-01로 저장)면 그해 끝까지 고를 수 있어야 한다 */
                    maxDate={endDate ? isoPeriodEnd(endDate, endDatePrecision) : undefined}
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
                {/* 날짜와 시각은 한 줄 — 시각은 쓰는 일이 드물어 날짜 옆 좁은 칸으로 물러난다 */}
                <DateTimeLine>
                  <EventDateField
                    anchorId={endDateAnchorId}
                    value={endDate}
                    precision={endDatePrecision}
                    allowPartial={allowPartialDate}
                    onChange={(iso, precision) => {
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
            <S.Hint>
              {allowPartialDate
                ? '칸에 바로 입력하거나 달력 아이콘으로 고르세요. 연도만 알면 연도만 — 진행 중이면 종료는 비워 두세요.'
                : '진행 중인 사건이면 종료는 비워 두세요.'}
            </S.Hint>
          </S.FormField>
        </S.FormRow>

      </FormGroup>

      {(onOpenCountryModal || parentEventSlot) && (
        <FormGroup aria-labelledby="event-form-group-link">
          <FormGroupTitle id="event-form-group-link">연결</FormGroupTitle>
          {/* 관련 국가 */}
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
                              candidate.id === participant.historicalCountryId,
                          )
                        : availableCountries.find(
                            (candidate) =>
                              candidate.id === participant.countryId,
                          )
                      if (!country) return null
                      const key = participantKey(participant)
                      const patch = (next: Partial<EventCountryParticipant>) =>
                        setRelatedCountries(
                          relatedCountries.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, ...next } : row,
                          ),
                        )
                      return (
                        <ParticipantRow key={key}>
                          <ParticipantName>
                            {isHistorical
                              ? `🏛️ ${country.name}`
                              : `${(country as CountryResponseDto).flagEmoji ?? ''} ${country.name}`}
                          </ParticipantName>
                          <RoleSelect
                            value={participant.role ?? 'PARTICIPANT'}
                            aria-label={`${country.name} 역할`}
                            onChange={(changeEvent) =>
                              patch({
                                role: changeEvent.target
                                  .value as EventCountryParticipant['role'],
                              })
                            }
                          >
                            {EVENT_COUNTRY_ROLE_OPTIONS.filter(
                              // 동맹국·적대국은 진영(D1)으로 대체 — 현재 값일 때만 보인다
                              (option) =>
                                !option.deprecated ||
                                option.value === participant.role,
                            ).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </RoleSelect>
                          <RoleDescriptionInput
                            value={participant.roleDescription ?? ''}
                            aria-label={`${country.name}가 한 일`}
                            placeholder="이 나라가 한 일 (선택)"
                            onChange={(changeEvent) =>
                              patch({
                                roleDescription: changeEvent.target.value,
                              })
                            }
                          />
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
                            }}
                          >
                            <FiX size={14} />
                          </ParticipantRemove>
                        </ParticipantRow>
                      )
                    })}
                  </ParticipantList>
                )}
                {/* 추가는 목록 **뒤** — 쌓이는 쪽에서 이어 붙이는 흐름 */}
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
                {historicalLifespanWarnings.map((item) => (
                  <AlertBox
                    key={item.id}
                    variant="warning"
                    icon="⚠️"
                    style={{ marginTop: 8 }}
                  >
                    <strong>{item.name}</strong> {item.mismatch} 국가 소멸 전후
                    소급·연속 사건 등 정당한 경우라면 그대로 저장하세요.
                  </AlertBox>
                ))}
                <S.Hint>
                  나라마다 역할과 한 일을 적어 두면 조약처럼 나라별 사정이 다른
                  사건도 한눈에 읽힙니다. <strong>주도국</strong>은 목록에서
                  사건의 대표로 섭니다.
                </S.Hint>
              </S.FormField>
            </S.FormRow>
          )}
          {/* 상위 사건 — 고아 생성 후 수동 연결 대신, 등록 시점에 바로 가지로 붙인다 */}
          {parentEventSlot && (
            <S.FormRow>
              <S.FormLabel>
                상위 사건<OptionalTag>(선택)</OptionalTag>
              </S.FormLabel>
              <S.FormField>
                {parentEventSlot.parent ? (
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
                ) : (
                  <S.AddButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      parentEventSlot.onOpenPicker()
                    }}
                  >
                    <FiPlus size={16} />
                    상위 사건 선택
                  </S.AddButton>
                )}
                <S.Hint>
                  고르면 그 사건의 하위로 등록됩니다. 등록 후 상세
                  &lsquo;연관&rsquo;에서 바꿀 수 있습니다.
                </S.Hint>
              </S.FormField>
            </S.FormRow>
          )}
        </FormGroup>
      )}

      {/* 세부의 핵심 기록 — 참여국(위 '연결') 위에 얹는 진영·성립/소멸, 그리고 조약·조직·인물·선거 */}
      {recordsSlot && (
        <FormGroup aria-labelledby="event-form-group-records">
          <FormGroupTitle id="event-form-group-records">{recordsSlot.title}</FormGroupTitle>
          {recordsSlot.content}
        </FormGroup>
      )}

      <FormGroup aria-labelledby="event-form-group-intro">
        <FormGroupTitle id="event-form-group-intro">소개</FormGroupTitle>
        {/* 개요 설명 */}
        <S.FormRow>
          <S.FormLabel>
            개요 설명<OptionalTag>(선택)</OptionalTag>
          </S.FormLabel>
          <S.FormField>
            <S.Textarea
              placeholder="무슨 일이 왜 일어났는지 두세 문장으로"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </S.FormField>
        </S.FormRow>

        {/* 키워드: 내 사건 ↔ 타인 사건 매칭용 */}
        <S.FormRow>
          <S.FormLabel>
            키워드<OptionalTag>(선택)</OptionalTag>
          </S.FormLabel>
          <S.FormField>
            <S.Input
              type="text"
              placeholder="입력 후 Enter — 쉼표로 여러 개 (최대 20개·각 30자)"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                if ((e.nativeEvent as KeyboardEvent).isComposing) return
                e.preventDefault()
                addKeywordsFromInput()
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
                        setKeywords(keywords.filter((item) => item !== keyword))
                      }
                      aria-label={`${keyword} 제거`}
                    >
                      <FiX size={12} />
                    </KeywordChipRemove>
                  </KeywordChip>
                ))}
              </KeywordChipList>
            )}
            <S.Hint>
              같은 사건을 가리키는 대표 낱말(인명·사건명·연도). 다른 사람이
              등록한 같은 사건과 이어 줄 때 씁니다.
            </S.Hint>
          </S.FormField>
        </S.FormRow>

        {/* 썸네일 이미지 */}
        <S.FormRow>
          <S.FormLabel>
            썸네일 이미지<OptionalTag>(선택)</OptionalTag>
          </S.FormLabel>
          <S.FormField>
            {/*
             * 선택 항목이라 한 줄 띠(register-form-kit) — 인물 등록 폼 프로필 사진과 같은 부품.
             */}
            {thumbnail ? (
              <KitUploadFilled>
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
                    {thumbnail.startsWith('blob:')
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
                onClick={() => {
                  playClickSound()
                  thumbnailInputRef.current?.click()
                }}
              >
                <KitUploadThumb aria-hidden>
                  <FiImage size={18} />
                </KitUploadThumb>
                <KitUploadText>
                  <strong>대표 이미지 올리기</strong>
                  <span>목록과 상세 머리에 쓰입니다 · 10MB 이하</span>
                </KitUploadText>
              </KitUploadStrip>
            )}
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return

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
  margin-left: 6px;
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* ─── 참여국 행 ───
 * 한 줄 = 국가 + 역할 + 한 줄 서술. 등록 시점에 이미 "누가 어떤 자격으로"가 적히므로
 * 조약처럼 국가별 사정이 다른 사건도 상세로 넘기지 않고 여기서 끝낼 수 있다. */
/*
 * 참여국 목록 — 한 나라 = 한 장의 옅은 행 카드 [국기·이름 | 역할 | 한 일 | 삭제].
 *
 * ⚠️ 예전 선택·입력칸은 테두리를 `theme.colors.border`(객체)로 칠해 값이 무효가 됐고,
 * 브라우저 기본 테(진한 1.5px)와 네이티브 화살표로 그려져 폼의 다른 입력칸과 딴판이었다.
 * 폼 토큰(S.getC)으로 맞춘다.
 */
const ParticipantList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 4px;
`

const ParticipantRow = styled.div`
  display: grid;
  /* 국가명이 주인공 — 이름 열을 역할 열보다 넓게 잡아 긴 국호도 잘리지 않게 한다. */
  grid-template-columns: minmax(132px, 1fr) 118px minmax(0, 1.7fr) 28px;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 12px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  border-radius: 10px;
  background: ${({ theme }) => S.getC(theme).background.section};
  transition: border-color 0.14s ease;

  &:hover,
  &:focus-within {
    border-color: ${({ theme }) => S.getC(theme).border.default};
  }

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 6px;
  }
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
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

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
  padding: 0 28px 0 10px;
  font-weight: 600;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
`

const RoleDescriptionInput = styled.input`
  ${participantControl}
  padding: 0 10px;
  min-width: 0;

  &::placeholder {
    color: ${({ theme }) => S.getC(theme).text.muted};
  }
`

/* ─── 묶음 ───
 * 행마다 그어 두던 구분선(8개)을 걷고, 성격이 같은 행끼리 묶어 묶음 사이에만 선을 둔다.
 * 기본 정보(필수 둘 + 카테고리) → 연결(참여국·상위) → 소개(글·키워드·이미지) 순 —
 * 위에서부터 채울수록 '등록할 만한 사건'이 되는 순서다. */
const FormGroup = styled.section`
  display: flex;
  flex-direction: column;
  padding: 0 0 8px;

  & + & {
    padding-top: 20px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  > ${S.FormRow} {
    padding: 12px 0;
    border-bottom: none;
  }
`

/** 인물 등록 폼 장 머리글(CoreSectionLabel)과 같은 15/700 — 12px 회색 eyebrow는 필드 라벨보다 약해 경계가 안 읽혔다 */
const FormGroupTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
`

/* ─── 기간 ─── */
const DateRangeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`

const DateTimeLine = styled.div`
  display: flex;
  gap: 6px;

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
  gap: 6px;
`

const KeywordChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 4px 0 10px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  border-radius: 999px;
  background: ${({ theme }) => S.getC(theme).background.section};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-weight: 500;
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
