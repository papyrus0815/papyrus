import React, { useEffect, useMemo, useRef, useState } from 'react'

import { motion } from 'framer-motion'
import styled, { type DefaultTheme, useTheme } from 'styled-components'
import {
  FiAlertCircle,
  FiCalendar,
  FiClock,
  FiFileText,
  FiImage,
  FiPlus,
  FiX,
} from 'react-icons/fi'

import {
  EVENT_COUNTRY_ROLE_OPTIONS,
  participantKey,
  type EventCountryParticipant,
} from '@/entities/event/model'
import { extractCategoryKey } from '@/features/event-create/lib'
import * as S from '@/pages/events/create/event-create.styles'
import { CATEGORY_ICON_MAP } from '@/pages/events/create/events.constants'
import type { HistoricalEventCategory } from '@/pages/events/create/events.types'
import { CATEGORY_SOFT_COLORS } from '@/pages/events/styles/theme'
import { getImageUrl } from '@/pages/events/utils/event-create.utils'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import {
  describeLifespanMismatch,
  signedYearFromIsoLike,
} from '@/shared/lib/country-period'
import { uploadImage } from '@/shared/api/upload'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { TimePickerModal } from '@/shared/ui/time-picker-modal/time-picker-modal'
import { notify } from '@/shared/ui/toast'

/**
 * 날짜 표시용 포맷 — BC/고대 안전.
 * 네이티브 `new Date()`는 BC(천문학적 연도번호)·고대(타임존)에서 어긋나므로, ISO 문자열의
 * 선행 연도 자릿수와 부호를 직접 파싱한다(date-picker `-YYYY-MM-DD` 표기와 일치).
 */
function formatEventDateLabel(iso: string): string {
  const neg = iso.startsWith('-')
  const body = neg ? iso.slice(1) : iso
  const m = body.match(/^(\d{1,6})-(\d{1,2})-(\d{1,2})/)
  if (!m) {
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  const year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const day = parseInt(m[3], 10)
  return `${neg ? '기원전 ' : ''}${year}년 ${month}월 ${day}일`
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
  category: HistoricalEventCategory | ''
  setCategory: (value: HistoricalEventCategory | '') => void
  thumbnail: string
  setThumbnail: (value: string) => void
  setThumbnailFile: (file: File | null) => void

  /** 키워드 (동일 사건 매핑용, 선택) */
  keywords?: string[]
  setKeywords?: (value: string[]) => void

  // DB 카테고리
  dbCategories: EventCategoryDto[]

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

  // UI 상태
  playClickSound: () => void
  getDateError: () => string | null
  calculateDaysDifference: () => number | null
  // 폼 제출 시도 후 노출되는 inline 에러 — 부모에서 submitAttempted 분기 후 전달
  titleError?: string
  startDateError?: string
  // 종료일 < 시작일은 즉시 노출 (제출 시도 전이라도)
  endDateError?: string
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
  category,
  setCategory,
  thumbnail,
  setThumbnail,
  setThumbnailFile,
  keywords = [],
  setKeywords = () => {},
  dbCategories,
  relatedCountries = [],
  setRelatedCountries = () => {},
  availableCountries = [],
  availableHistoricalCountries = [],
  onOpenCountryModal,
  parentEventSlot,
  playClickSound,
  getDateError,
  calculateDaysDifference,
  titleError,
  startDateError,
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
  const [isStartDateModalOpen, setIsStartDateModalOpen] = useState(false)
  const [isEndDateModalOpen, setIsEndDateModalOpen] = useState(false)
  const [isStartTimeModalOpen, setIsStartTimeModalOpen] = useState(false)
  const [isEndTimeModalOpen, setIsEndTimeModalOpen] = useState(false)
  /** 시작일 선택 직후 종료일 필드로 포커스를 옮길지 (피커 닫힘 후 1회) */
  const pendingEndDateFocusRef = useRef(false)
  const endDateTriggerRef = useRef<HTMLDivElement>(null)
  const startDateTriggerRef = useRef<HTMLDivElement>(null)
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
   * 시작일 피커가 닫힌 **다음 프레임**에 종료일 필드로 포커스를 옮긴다.
   * 피커는 언마운트 커밋에서 "열기 직전 포커스"를 동기 복원하므로, 그보다 늦게 실행돼야
   * 우리 포커스가 덮이지 않는다.
   */
  useEffect(() => {
    if (isStartDateModalOpen) return
    if (!pendingEndDateFocusRef.current) return
    pendingEndDateFocusRef.current = false
    const frame = window.requestAnimationFrame(() => {
      endDateTriggerRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isStartDateModalOpen])

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
        return mismatch ? { id: historicalId, name: country.name, mismatch } : null
      })
      .filter(
        (item): item is { id: string; name: string; mismatch: string } => item != null,
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
              titleError ? 'event-form-title-error' : 'event-form-title-hint'
            }
          />
          {titleError ? (
            <S.ErrorMessage id="event-form-title-error" role="alert">
              {titleError}
            </S.ErrorMessage>
          ) : (
            <S.Hint id="event-form-title-hint">
              역사적 사건의 정식 명칭을 입력하세요
            </S.Hint>
          )}
        </S.FormField>
      </S.FormRow>

      {/* 기간 */}
      <S.FormRow>
        <S.FormLabel>
          <div>
            기간 <S.Required>*</S.Required>
          </div>
          {startDate && endDate && !getDateError() && (
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
          <S.DateRangeRow>
            <S.DateRangeColumn>
              <S.DateRangeLabel>시작일</S.DateRangeLabel>
              <S.DateInputWrapper
                ref={startDateTriggerRef}
                aria-haspopup="dialog"
                {...keyboardTrigger}
                aria-expanded={isStartDateModalOpen}
                data-open={isStartDateModalOpen || undefined}
                onClick={() => {
                  playClickSound()
                  setIsStartDateModalOpen(true)
                }}
              >
                <FiCalendar size={14} />
                <S.DateInputDisplay>
                  {startDate ? formatEventDateLabel(startDate) : '날짜 선택'}
                </S.DateInputDisplay>
              </S.DateInputWrapper>
              <S.DateInputWrapper
                ref={startTimeTriggerRef}
                aria-haspopup="dialog"
                {...keyboardTrigger}
                aria-expanded={isStartTimeModalOpen}
                data-open={isStartTimeModalOpen || undefined}
                onClick={() => {
                  playClickSound()
                  setIsStartTimeModalOpen(true)
                }}
                style={{ cursor: 'pointer', marginTop: '6px' }}
              >
                <FiClock size={14} />
                <S.DateInputDisplay>{startTime || '시간'}</S.DateInputDisplay>
              </S.DateInputWrapper>
            </S.DateRangeColumn>

            <S.DateRangeColumn>
              <S.DateRangeLabel>종료일</S.DateRangeLabel>
              <S.DateInputWrapper
                ref={endDateTriggerRef}
                aria-haspopup="dialog"
                {...keyboardTrigger}
                aria-expanded={isEndDateModalOpen}
                data-open={isEndDateModalOpen || undefined}
                onClick={() => {
                  playClickSound()
                  setIsEndDateModalOpen(true)
                }}
              >
                <FiCalendar size={14} />
                <S.DateInputDisplay>
                  {endDate ? formatEventDateLabel(endDate) : '날짜 선택'}
                </S.DateInputDisplay>
              </S.DateInputWrapper>
              <S.DateInputWrapper
                ref={endTimeTriggerRef}
                aria-haspopup="dialog"
                {...keyboardTrigger}
                aria-expanded={isEndTimeModalOpen}
                data-open={isEndTimeModalOpen || undefined}
                onClick={() => {
                  playClickSound()
                  setIsEndTimeModalOpen(true)
                }}
                style={{ cursor: 'pointer', marginTop: '6px' }}
              >
                <FiClock size={14} />
                <S.DateInputDisplay>{endTime || '시간'}</S.DateInputDisplay>
              </S.DateInputWrapper>
            </S.DateRangeColumn>
          </S.DateRangeRow>
          {(startDateError || endDateError || getDateError()) && (
            <S.ErrorMessage role="alert">
              {startDateError ?? endDateError ?? getDateError()}
            </S.ErrorMessage>
          )}
          <S.Hint>
            사건의 시작과 종료 날짜/시간을 설정하세요 (진행중이면 종료일
            비워두기)
          </S.Hint>
        </S.FormField>
      </S.FormRow>

      {/* 날짜/시간 선택 모달 */}
      <DatePickerModal
        isOpen={isStartDateModalOpen}
        onClose={() => setIsStartDateModalOpen(false)}
        onSelect={(date) => {
          setStartDate(date)
          setIsStartDateModalOpen(false)
          /**
           * 예전엔 `setTimeout(() => setIsEndDateModalOpen(true), 200)`으로 종료일
           * 피커를 **자동으로 이어 열었다**. 피커는 닫힐 때 "열기 직전 포커스"로
           * 포커스를 되돌리는데, 그 복원과 다음 피커의 열기가 타이머로 엇갈리면
           * 포커스가 이미 사라진 노드를 향한다(폼이 모달 안에 들어가면 더 잘 깨진다).
           * 자동 개방 대신 종료일 필드로 포커스만 옮겨 다음 행동을 가리킨다.
           */
          pendingEndDateFocusRef.current = true
        }}
        initialDate={startDate}
        maxDate={endDate}
        title="시작 일자 선택"
        /* 모달 대신 칸 아래 드롭다운 — 폼을 가리지 않고 고른 뒤 바로 이어 쓴다 */
        anchorEl={startDateTriggerRef.current}
      />
      <DatePickerModal
        isOpen={isEndDateModalOpen}
        onClose={() => setIsEndDateModalOpen(false)}
        onSelect={(date) => setEndDate(date)}
        initialDate={endDate || startDate}
        minDate={startDate}
        title="종료 일자 선택"
        anchorEl={endDateTriggerRef.current}
      />
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
              지정하면 이 사건이 해당 사건의 하위(가지)로 곧바로 등록됩니다.
              계층은 등록 후 상세의 &lsquo;연관&rsquo;에서 언제든 바꿀 수
              있습니다.
            </S.Hint>
          </S.FormField>
        </S.FormRow>
      )}

      {/* 카테고리 */}
      <S.FormRow>
        <S.FormLabel>
          <div>
            카테고리<OptionalTag>(선택)</OptionalTag>
          </div>
        </S.FormLabel>
        <S.FormField>
          {dbCategories.length > 0 ? (
            <S.CategoryGrid>
              {dbCategories.map((dbCat) => {
                const categoryId = dbCat.id
                const categoryName = dbCat.name
                const categoryKey = extractCategoryKey(categoryId)
                const Icon = CATEGORY_ICON_MAP[categoryName] || FiFileText
                const isSelected = category === categoryId
                /* 목록과 **같은 팔레트** — DB 이름(정치·전쟁/군사…)이 곧 키다. 예전 키 추출
                   (extractCategoryKey)은 'cat-xxx-n' id를 전제해 UUID에서 전부 회색이었다. */
                const tone =
                  CATEGORY_SOFT_COLORS[
                    categoryName as keyof typeof CATEGORY_SOFT_COLORS
                  ] ?? CATEGORY_SOFT_COLORS.other

                return (
                  <S.CategoryCard
                    key={dbCat.id}
                    type="button"
                    aria-pressed={isSelected}
                    style={
                      {
                        '--cat-rgb': tone.rgb,
                        '--cat-text': isDark ? tone.textDark : tone.text,
                      } as React.CSSProperties
                    }
                    $selected={isSelected}
                    $category={categoryKey}
                    onClick={() => {
                      playClickSound()
                      setCategory(isSelected ? '' : categoryId)
                    }}
                  >
                    <S.CategoryIcon
                      $category={categoryKey}
                      $selected={isSelected}
                    >
                      <Icon size={13} />
                    </S.CategoryIcon>
                    <S.CategoryLabel>{categoryName}</S.CategoryLabel>
                  </S.CategoryCard>
                )
              })}
            </S.CategoryGrid>
          ) : (
            <S.EmptyState>
              <FiAlertCircle
                size={32}
                color={isDark ? '#52525b' : '#cbd5e1'}
              />
              <p>카테고리를 불러올 수 없습니다.</p>
              <p
                style={{
                  fontSize: '12px',
                  color: isDark ? '#71717a' : '#94a3b8',
                  marginTop: '4px',
                }}
              >
                서버와의 연결을 확인해주세요.
              </p>
            </S.EmptyState>
          )}
          <S.Hint>사건의 유형을 선택하세요</S.Hint>
        </S.FormField>
      </S.FormRow>

      {/* 개요 설명 */}
      <S.FormRow>
        <S.FormLabel>
          개요 설명<OptionalTag>(선택)</OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <S.Textarea
            placeholder="사건에 대한 간단한 설명을 입력하세요"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <S.Hint>사건의 핵심 내용을 요약해주세요</S.Hint>
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
            placeholder="키워드 입력 후 엔터 (쉼표로 여러 개 가능, 최대 20개·각 30자)"
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
            <p
              style={{
                marginTop: 6,
                fontSize: 12,
                color: 'var(--error-color, #c53030)',
              }}
            >
              {keywordValidationMsg}
            </p>
          )}
          {keywords.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 8,
              }}
            >
              {keywords.map((k) => (
                <span
                  key={k}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    background: isDark
                      ? 'rgba(255,255,255,0.08)'
                      : '#e5e7eb',
                    color: isDark ? '#e5e7eb' : '#1f2937',
                    border: `1px solid ${
                      isDark ? 'rgba(255,255,255,0.14)' : '#d1d5db'
                    }`,
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {k}
                  <button
                    type="button"
                    onClick={() => setKeywords(keywords.filter((x) => x !== k))}
                    style={{
                      padding: 0,
                      marginLeft: 2,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      lineHeight: 1,
                      color: isDark ? '#a1a1aa' : '#6b7280',
                    }}
                    aria-label={`${k} 제거`}
                  >
                    <FiX size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <S.Hint>
            <strong>내가 등록한 사건</strong>과{' '}
            <strong>타인이 등록한 사건</strong>을 나중에 매칭할 때 사용합니다.
            같은 역사적 사건을 가리키는 대표 키워드(인명, 사건명, 연도 등)를
            넣어두면, 추후 검색·매칭으로 서로 연결할 수 있습니다. 입력 후 엔터로
            추가, ×로 제거.
          </S.Hint>
        </S.FormField>
      </S.FormRow>

      {/* 썸네일 이미지 */}
      <S.FormRow>
        <S.FormLabel>
          썸네일 이미지<OptionalTag>(선택)</OptionalTag>
        </S.FormLabel>
        <S.FormField>
          {thumbnail ? (
            <S.ThumbnailPreview
              onClick={() => {
                playClickSound()
                thumbnailInputRef.current?.click()
              }}
            >
              <S.ThumbnailImage
                src={getImageUrl(thumbnail)}
                alt="썸네일 미리보기"
                onError={() => {
                  if (thumbnail.startsWith('blob:')) {
                    URL.revokeObjectURL(thumbnail)
                  }
                }}
              />
              <S.ThumbnailDeleteButton
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
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
                <FiX size={16} />
              </S.ThumbnailDeleteButton>
            </S.ThumbnailPreview>
          ) : (
            <S.ThumbnailUploadArea>
              <FiImage size={32} />
              <p>썸네일 이미지를 업로드하세요</p>
              <S.UploadButton
                type="button"
                onClick={() => {
                  playClickSound()
                  thumbnailInputRef.current?.click()
                }}
              >
                이미지 업로드
              </S.UploadButton>
            </S.ThumbnailUploadArea>
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
          <S.Hint>사건 목록에 표시될 대표 이미지를 등록하세요</S.Hint>
        </S.FormField>
      </S.FormRow>

      {/* 관련 국가 */}
      {onOpenCountryModal && (
        <S.FormRow>
          <S.FormLabel>
            참여국<OptionalTag>(선택)</OptionalTag>
          </S.FormLabel>
          <S.FormField>
            {relatedCountries.length > 0 && (
              <ParticipantList>
                {relatedCountries.map((participant, index) => {
                  const isHistorical = Boolean(participant.historicalCountryId)
                  const country = isHistorical
                    ? availableHistoricalCountries.find(
                        (candidate) =>
                          candidate.id === participant.historicalCountryId,
                      )
                    : availableCountries.find(
                        (candidate) => candidate.id === participant.countryId,
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
                        {EVENT_COUNTRY_ROLE_OPTIONS.map((option) => (
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
                          patch({ roleDescription: changeEvent.target.value })
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
            {historicalLifespanWarnings.map((item) => (
              <AlertBox
                key={item.id}
                variant="warning"
                icon="⚠️"
                style={{ marginTop: 8 }}
              >
                <strong>{item.name}</strong> {item.mismatch} 국가 소멸 전후 소급·연속 사건 등
                정당한 경우라면 그대로 저장하세요.
              </AlertBox>
            ))}
            <S.Hint>
              나라마다 <strong>어떤 자격으로</strong> 관여했는지까지 적어 두면, 조약처럼
              나라별 사정이 다른 사건도 한눈에 읽힙니다 (예: 주도국·서명국은 주도,
              불참·거부국은 관찰). 역할을 <strong>주도국</strong>으로 두면 목록·타임라인이
              그 나라를 사건의 대표로 세웁니다.
            </S.Hint>
          </S.FormField>
        </S.FormRow>
      )}
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
  transition: color 0.14s, background-color 0.14s;

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
