import React, { useRef, useState } from 'react'

import { motion } from 'framer-motion'
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiFileText,
  FiGlobe,
  FiImage,
  FiShield,
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
import { DatePickerModal } from '@/shared/ui/date-picker'
import { TimePickerModal } from '@/shared/ui/time-picker-modal/TimePickerModal'

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

  // DB 카테고리
  dbCategories: EventCategoryDto[]

  // 태그
  tags: string[]
  setTags: React.Dispatch<React.SetStateAction<string[]>>

  // 관련 국가
  relatedCountryIds: string[]
  setRelatedCountryIds: React.Dispatch<React.SetStateAction<string[]>>
  relatedHistoricalCountryIds: string[]
  setRelatedHistoricalCountryIds: React.Dispatch<React.SetStateAction<string[]>>
  setShowCountryModal: (value: boolean) => void
  availableCountries: CountryResponseDto[]
  availableHistoricalCountries: HistoricalCountryResponseDto[]

  // UI 상태
  playClickSound: () => void
  getDateError: () => string | null
  calculateDaysDifference: () => number | null
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
  dbCategories,
  tags,
  setTags,
  relatedCountryIds,
  setRelatedCountryIds,
  relatedHistoricalCountryIds,
  setRelatedHistoricalCountryIds,
  setShowCountryModal,
  availableCountries,
  availableHistoricalCountries,
  playClickSound,
  getDateError,
  calculateDaysDifference,
}) => {
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const [tagInput, setTagInput] = useState('')
  const [isStartDateModalOpen, setIsStartDateModalOpen] = useState(false)
  const [isEndDateModalOpen, setIsEndDateModalOpen] = useState(false)
  const [isStartTimeModalOpen, setIsStartTimeModalOpen] = useState(false)
  const [isEndTimeModalOpen, setIsEndTimeModalOpen] = useState(false)

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
                onError={(e) => {
                  console.error('이미지 로드 실패:', thumbnail)
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
                const result = await uploadImage(file)
                URL.revokeObjectURL(previewUrl)
                setThumbnail(result.url)
              } catch (error) {
                console.error('썸네일 업로드 실패:', error)
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
        <S.FormLabel>
          사건명 <S.Required>*</S.Required>
        </S.FormLabel>
        <S.FormField>
          <S.Input
            type="text"
            placeholder="예: 제2차 세계 대전"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <S.Hint>역사적 사건의 정식 명칭을 입력하세요</S.Hint>
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
          {getDateError() && <S.ErrorMessage>{getDateError()}</S.ErrorMessage>}
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
        onSelect={(date) => setStartDate(date)}
        initialDate={startDate}
        maxDate={endDate}
        title="시작 일자 선택"
      />
      <DatePickerModal
        isOpen={isEndDateModalOpen}
        onClose={() => setIsEndDateModalOpen(false)}
        onSelect={(date) => setEndDate(date)}
        initialDate={endDate}
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
          {dbCategories.length > 0 ? (
            <S.CategoryGrid>
              {dbCategories.map((dbCat) => {
                const categoryId = dbCat.id
                const categoryName = dbCat.name
                const categoryKey = extractCategoryKey(categoryId) // 'military', 'diplomatic'
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
              <FiAlertCircle size={32} color="#cbd5e1" />
              <p>카테고리를 불러올 수 없습니다.</p>
              <p
                style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}
              >
                서버와의 연결을 확인해주세요.
              </p>
            </S.EmptyState>
          )}
          <S.Hint>사건의 유형을 선택하세요</S.Hint>

          {/* 군사 카테고리 안내 */}
          {category === 'military' && (
            <S.MilitaryNoticeBox
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, type: 'spring' }}
            >
              <S.MilitaryNoticeIcon>
                <FiShield size={28} />
              </S.MilitaryNoticeIcon>
              <S.MilitaryNoticeContent>
                <S.MilitaryNoticeTitle>
                  ⚔️ 군사 정보 입력이 필요합니다
                </S.MilitaryNoticeTitle>
                <S.MilitaryNoticeText>
                  다음 단계에서{' '}
                  <strong>교전 세력, 병력 규모, 피해 상황, 전투 결과</strong>{' '}
                  등을 상세히 기록하실 수 있습니다.
                </S.MilitaryNoticeText>
              </S.MilitaryNoticeContent>
            </S.MilitaryNoticeBox>
          )}

          {/* 외교/회의 카테고리 안내 */}
          {isDiplomaticCategory(category) && (
            <S.MilitaryNoticeBox
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, type: 'spring' }}
            >
              <S.MilitaryNoticeIcon>
                <FiGlobe size={28} />
              </S.MilitaryNoticeIcon>
              <S.MilitaryNoticeContent>
                <S.MilitaryNoticeTitle>
                  🤝 회담 정보 입력이 필요합니다
                </S.MilitaryNoticeTitle>
                <S.MilitaryNoticeText>
                  다음 단계에서{' '}
                  <strong>
                    참가국 및 역할, 조약/협정 내용, 국가별 적용 사항
                  </strong>{' '}
                  등을 상세히 기록하실 수 있습니다.
                </S.MilitaryNoticeText>
              </S.MilitaryNoticeContent>
            </S.MilitaryNoticeBox>
          )}
        </S.FormField>
      </S.FormRow>

      {/* 태그 */}
      <S.FormRow>
        <S.FormLabel>태그</S.FormLabel>
        <S.FormField>
          <S.TagInputWrapper>
            <S.Input
              type="text"
              placeholder="태그 입력 후 Enter (#으로 시작하면 그룹 태그)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault()
                  const newTag = tagInput.trim()
                  if (!tags.includes(newTag)) {
                    setTags([...tags, newTag])
                    setTagInput('')
                    playClickSound()
                  }
                }
              }}
            />
          </S.TagInputWrapper>
          {tags.length > 0 && (
            <S.TagList>
              {tags.map((tag) => (
                <S.TagChip key={tag} $isGroup={tag.startsWith('#')}>
                  {tag}
                  <S.TagRemoveButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setTags((prev: string[]) =>
                        prev.filter((tagItem: string) => tagItem !== tag),
                      )
                    }}
                  >
                    <FiX size={12} />
                  </S.TagRemoveButton>
                </S.TagChip>
              ))}
            </S.TagList>
          )}
          <S.Hint>
            💡 <strong>#</strong> 으로 시작하는 태그는 시리즈 그룹으로
            사용됩니다
            <br />
            예: #군축협정, #해군군축, #국제조약
          </S.Hint>
        </S.FormField>
      </S.FormRow>

      {/* 관련 국가 */}
      <S.FormRow>
        <S.FormLabel>관련 국가</S.FormLabel>
        <S.FormField>
          <S.Input
            type="text"
            placeholder="국가 검색 (클릭하여 선택)"
            value=""
            readOnly
            onClick={() => {
              playClickSound()
              setShowCountryModal(true)
            }}
            style={{ cursor: 'pointer' }}
          />

          {(relatedCountryIds.length > 0 ||
            relatedHistoricalCountryIds.length > 0) && (
            <S.SelectedCountriesList>
              {relatedCountryIds.map((countryId) => {
                const country = availableCountries.find(
                  (countryItem) => countryItem.id === countryId,
                )
                return (
                  <S.CountryChip key={countryId}>
                    <FiGlobe size={14} />
                    {country?.name || '알 수 없음'}
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setRelatedCountryIds((prev: string[]) =>
                          prev.filter((id: string) => id !== countryId),
                        )
                      }}
                    >
                      <FiX size={12} />
                    </button>
                  </S.CountryChip>
                )
              })}
              {relatedHistoricalCountryIds.map((countryId) => {
                const country = availableHistoricalCountries.find(
                  (countryItem) => countryItem.id === countryId,
                )
                return (
                  <S.CountryChip key={countryId}>
                    <FiGlobe size={14} />
                    {country?.name || '알 수 없음'}
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setRelatedHistoricalCountryIds((prev: string[]) =>
                          prev.filter((id: string) => id !== countryId),
                        )
                      }}
                    >
                      <FiX size={12} />
                    </button>
                  </S.CountryChip>
                )
              })}
            </S.SelectedCountriesList>
          )}
          <S.Hint>
            이 사건과 관련된 국가를 추가하세요 (예: 프랑스 혁명 → 프랑스)
          </S.Hint>
        </S.FormField>
      </S.FormRow>
    </S.FormSection>
  )
}
