import React, { useEffect, useRef, useState } from 'react'

import { motion } from 'framer-motion'
import { useTheme } from 'styled-components'
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiFileText,
  FiGlobe,
  FiImage,
  FiShield,
  FiTag,
  FiX,
} from 'react-icons/fi'

import {
  extractCategoryKey,
  isDiplomaticCategory,
  isMilitaryCategory,
} from '@/features/event-create/lib'
import * as S from '@/pages/events/create/event-create.styles'
import { CATEGORY_ICON_MAP } from '@/pages/events/create/events.constants'
import type { HistoricalEventCategory } from '@/pages/events/create/events.types'
import { getImageUrl } from '@/pages/events/utils/event-create.utils'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { uploadImage } from '@/shared/api/upload'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { TimePickerModal } from '@/shared/ui/time-picker-modal/time-picker-modal'

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

  // 관련 국가 (선택적)
  relatedCountryIds?: string[]
  setRelatedCountryIds?: (value: string[]) => void
  relatedHistoricalCountryIds?: string[]
  setRelatedHistoricalCountryIds?: (value: string[]) => void
  availableCountries?: CountryResponseDto[]
  availableHistoricalCountries?: HistoricalCountryResponseDto[]
  onOpenCountryModal?: () => void

  // 군사 카테고리 전용 필드
  conflictType?: 'battle' | 'war' | 'siege' | 'campaign' | 'skirmish'
  setConflictType?: (
    value: 'battle' | 'war' | 'siege' | 'campaign' | 'skirmish',
  ) => void
  combatTypes?: ('land' | 'naval' | 'air')[]
  setCombatTypes?: (value: ('land' | 'naval' | 'air')[]) => void

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
  relatedCountryIds = [],
  setRelatedCountryIds = () => {},
  relatedHistoricalCountryIds = [],
  setRelatedHistoricalCountryIds = () => {},
  availableCountries = [],
  availableHistoricalCountries = [],
  onOpenCountryModal,
  conflictType,
  setConflictType,
  combatTypes = [],
  setCombatTypes,
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
  const combatTypeSectionRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false) // 스크롤 여부 추적
  const [isStartDateModalOpen, setIsStartDateModalOpen] = useState(false)
  const [isEndDateModalOpen, setIsEndDateModalOpen] = useState(false)
  const [isStartTimeModalOpen, setIsStartTimeModalOpen] = useState(false)
  const [isEndTimeModalOpen, setIsEndTimeModalOpen] = useState(false)
  const [keywordInput, setKeywordInput] = useState(keywords.join(', '))
  const [keywordValidationMsg, setKeywordValidationMsg] = useState('')
  const skipKeywordSyncRef = useRef(false)

  const KEYWORD_MAX_LENGTH = 30
  const KEYWORD_MAX_COUNT = 20

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

  // 전쟁/군사 카테고리 선택 시 자동 스크롤 (최초 1회만)
  useEffect(() => {
    if (
      isMilitaryCategory(category) &&
      combatTypeSectionRef.current &&
      !hasScrolledRef.current
    ) {
      setTimeout(() => {
        combatTypeSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }, 100)
      hasScrolledRef.current = true
    }

    // 카테고리가 군사가 아니게 변경되면 스크롤 플래그 리셋
    if (!isMilitaryCategory(category)) {
      hasScrolledRef.current = false
    }
  }, [category])

  return (
    <S.FormSection
      as={motion.div}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 썸네일 이미지 */}
      <S.FormRow>
        <S.FormLabel>썸네일 이미지</S.FormLabel>
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
                alert('파일 크기는 10MB를 초과할 수 없습니다.')
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
                alert('썸네일 업로드에 실패했습니다.')
                URL.revokeObjectURL(previewUrl)
                setThumbnail('')
                setThumbnailFile(null)
              }
            }}
          />
          <S.Hint>사건 목록에 표시될 대표 이미지를 등록하세요</S.Hint>
        </S.FormField>
      </S.FormRow>

      {/* 사건명 */}
      <S.FormRow>
        <S.FormLabel htmlFor="event-form-title">
          사건명 <S.Required>*</S.Required>
        </S.FormLabel>
        <S.FormField>
          <S.Input
            id="event-form-title"
            type="text"
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

      {/* 개요 설명 */}
      <S.FormRow>
        <S.FormLabel>개요 설명</S.FormLabel>
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
          <FiTag
            size={14}
            style={{ marginRight: 6, verticalAlign: 'middle' }}
          />
          키워드
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
                onClick={() => {
                  playClickSound()
                  setIsStartDateModalOpen(true)
                }}
              >
                <FiCalendar size={14} />
                <S.DateInputDisplay>
                  {startDate
                    ? new Date(startDate).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '날짜 선택'}
                </S.DateInputDisplay>
              </S.DateInputWrapper>
              <S.DateInputWrapper
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
                onClick={() => {
                  playClickSound()
                  setIsEndDateModalOpen(true)
                }}
              >
                <FiCalendar size={14} />
                <S.DateInputDisplay>
                  {endDate
                    ? new Date(endDate).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '날짜 선택'}
                </S.DateInputDisplay>
              </S.DateInputWrapper>
              <S.DateInputWrapper
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
          // 시작일 선택 직후 종료일 설정할 수 있도록 모달 열기
          setTimeout(() => setIsEndDateModalOpen(true), 200)
        }}
        initialDate={startDate}
        maxDate={endDate}
        title="시작 일자 선택"
      />
      <DatePickerModal
        isOpen={isEndDateModalOpen}
        onClose={() => setIsEndDateModalOpen(false)}
        onSelect={(date) => setEndDate(date)}
        initialDate={endDate || startDate}
        minDate={startDate}
        title="종료 일자 선택"
      />
      <TimePickerModal
        isOpen={isStartTimeModalOpen}
        onClose={() => setIsStartTimeModalOpen(false)}
        onSelect={(time) => setStartTime(time)}
        initialTime={startTime}
        title="시작 시간 선택"
      />
      <TimePickerModal
        isOpen={isEndTimeModalOpen}
        onClose={() => setIsEndTimeModalOpen(false)}
        onSelect={(time) => setEndTime(time)}
        initialTime={endTime}
        title="종료 시간 선택"
      />

      {/* 카테고리 */}
      <S.FormRow>
        <S.FormLabel>
          <div>카테고리</div>
        </S.FormLabel>
        <S.FormField>
          {/* 전쟁/군사 카테고리 선택 시 전투 유형 및 양상 선택 */}
          {isMilitaryCategory(category) &&
            setConflictType &&
            setCombatTypes && (
              <S.CombatTypeSection>
                {/* 전투 유형 */}
                <S.FormLabel style={{ marginBottom: '12px' }}>
                  <div>전투 유형</div>
                  <S.RequiredBadge>필수</S.RequiredBadge>
                </S.FormLabel>
                <S.Hint style={{ marginBottom: '12px' }}>
                  사건의 규모와 성격에 맞는 전투 유형을 선택하세요
                </S.Hint>
                <S.ConflictTypeGrid>
                  {[
                    { value: 'battle' as const, icon: '⚔️', label: '전투' },
                    { value: 'war' as const, icon: '🌍', label: '전쟁' },
                    { value: 'siege' as const, icon: '🏰', label: '공성전' },
                    { value: 'campaign' as const, icon: '🎯', label: '작전' },
                    {
                      value: 'skirmish' as const,
                      icon: '💥',
                      label: '소규모 교전',
                    },
                  ].map((type) => (
                    <S.ConflictTypeButton
                      key={type.value}
                      type="button"
                      $selected={conflictType === type.value}
                      onClick={() => {
                        playClickSound()
                        setConflictType(type.value)
                      }}
                    >
                      <S.ConflictTypeIcon
                        $selected={conflictType === type.value}
                      >
                        {type.icon}
                      </S.ConflictTypeIcon>
                      <S.ConflictTypeLabel>{type.label}</S.ConflictTypeLabel>
                    </S.ConflictTypeButton>
                  ))}
                </S.ConflictTypeGrid>

                {/* 전투 양상 */}
                <S.FormLabel
                  style={{ marginBottom: '12px', marginTop: '32px' }}
                >
                  <div>전투 양상</div>
                  <S.OptionalBadge>복수 선택 가능</S.OptionalBadge>
                </S.FormLabel>
                <S.Hint style={{ marginBottom: '12px' }}>
                  해당 사건의 전투 양상을 선택하세요 (지상전, 해전, 공중전 등)
                </S.Hint>
                <S.CombatTypeGrid>
                  {[
                    { value: 'land' as const, icon: '🪖', label: '지상전' },
                    { value: 'naval' as const, icon: '⚓', label: '해전' },
                    { value: 'air' as const, icon: '✈️', label: '공중전' },
                  ].map((type) => (
                    <S.CombatTypeButton
                      key={type.value}
                      type="button"
                      $selected={combatTypes.includes(type.value)}
                      onClick={() => {
                        playClickSound()
                        const updated = combatTypes.includes(type.value)
                          ? combatTypes.filter((t) => t !== type.value)
                          : [...combatTypes, type.value]
                        setCombatTypes(updated)
                      }}
                    >
                      <S.CombatTypeIcon
                        $selected={combatTypes.includes(type.value)}
                      >
                        {type.icon}
                      </S.CombatTypeIcon>
                      <S.CombatTypeLabel>{type.label}</S.CombatTypeLabel>
                    </S.CombatTypeButton>
                  ))}
                </S.CombatTypeGrid>
              </S.CombatTypeSection>
            )}

          {dbCategories.length > 0 ? (
            <S.CategoryGrid>
              {dbCategories.map((dbCat) => {
                const categoryId = dbCat.id
                const categoryName = dbCat.name
                const categoryKey = extractCategoryKey(categoryId)
                const Icon = CATEGORY_ICON_MAP[categoryName] || FiFileText
                const isSelected = category === categoryId

                return (
                  <S.CategoryCard
                    key={dbCat.id}
                    $selected={isSelected}
                    $category={categoryKey}
                    onClick={() => {
                      playClickSound()
                      setCategory(isSelected ? '' : categoryId)
                    }}
                  >
                    <S.CategoryIcon $category={categoryKey}>
                      <Icon size={20} />
                    </S.CategoryIcon>
                    <S.CategoryLabel>{categoryName}</S.CategoryLabel>
                    {isSelected && (
                      <S.CategoryCheck>
                        <FiCheck size={14} />
                      </S.CategoryCheck>
                    )}
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

      {/* 관련 국가 */}
      {onOpenCountryModal && (
        <S.FormRow>
          <S.FormLabel>관련 국가</S.FormLabel>
          <S.FormField>
            <S.AddButton
              type="button"
              onClick={() => {
                playClickSound()
                onOpenCountryModal()
              }}
            >
              <FiGlobe size={16} />
              국가 추가
            </S.AddButton>
            {(relatedCountryIds.length > 0 ||
              relatedHistoricalCountryIds.length > 0) && (
              <S.SelectedItemsContainer>
                {relatedCountryIds.map((countryId) => {
                  const country = availableCountries.find(
                    (c) => c.id === countryId,
                  )
                  if (!country) return null
                  return (
                    <S.SelectedItem key={countryId}>
                      <span>
                        {country.flagEmoji} {country.name}
                      </span>
                      <S.RemoveButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setRelatedCountryIds(
                            relatedCountryIds.filter((id) => id !== countryId),
                          )
                        }}
                      >
                        <FiX size={14} />
                      </S.RemoveButton>
                    </S.SelectedItem>
                  )
                })}
                {relatedHistoricalCountryIds.map((countryId) => {
                  const country = availableHistoricalCountries.find(
                    (c) => c.id === countryId,
                  )
                  if (!country) return null
                  return (
                    <S.SelectedItem key={countryId}>
                      <span>🏛️ {country.name}</span>
                      <S.RemoveButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setRelatedHistoricalCountryIds(
                            relatedHistoricalCountryIds.filter(
                              (id) => id !== countryId,
                            ),
                          )
                        }}
                      >
                        <FiX size={14} />
                      </S.RemoveButton>
                    </S.SelectedItem>
                  )
                })}
              </S.SelectedItemsContainer>
            )}
            <S.Hint>
              이 사건과 관련된 국가들을 선택하세요 (예: 한국전쟁 → 대한민국,
              북한, 미국, 중국 등)
            </S.Hint>
          </S.FormField>
        </S.FormRow>
      )}
    </S.FormSection>
  )
}
