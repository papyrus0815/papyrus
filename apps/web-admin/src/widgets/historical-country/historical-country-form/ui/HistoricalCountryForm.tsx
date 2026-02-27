import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormSidePanel } from '@/shared/ui/form-side-panel'
import type { HistoricalCountry, Era } from '@/entities/historical-country/api'
import { useHistoricalCountry } from '@/features/historical-country/use-historical-countries.hook'
import { uploadImage } from '@/shared/api/upload'
import type { TransitionEventType } from '@/shared/api/historical-countries'
import { DatePickerModal } from '@/shared/ui/date-picker'
import * as S from '../../../../pages/history/country/country.styles'

const TRANSITION_EVENT_LABELS: Record<TransitionEventType, string> = {
  FOUNDED: '건국',
  CONQUEST: '정복',
  TREATY: '조약',
  INDEPENDENCE: '독립',
  UNIFICATION: '통일',
  UNION: '합병/연합',
  DISSOLVED: '멸망',
  SUCCESSION: '계승',
  SECULARIZATION: '세속화',
  SPLIT: '분열',
  OTHER: '기타',
}

/**
 * 역사적 국가 Form 스키마
 */
const historicalCountrySchema = z.object({
  name: z.string().min(1, '국가명(한글)을 입력해주세요'),
  enName: z.string().optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  // 존속 시작
  startEra: z.enum(['BC', 'AD']).optional(),
  startYear: z
    .number()
    .int('정수를 입력해주세요')
    .positive('양수를 입력해주세요')
    .optional()
    .or(z.literal(undefined)),
  startMonth: z
    .number()
    .int('정수를 입력해주세요')
    .min(1, '1~12 사이의 월을 입력해주세요')
    .max(12, '1~12 사이의 월을 입력해주세요')
    .optional()
    .or(z.literal(undefined)),
  startDay: z
    .number()
    .int('정수를 입력해주세요')
    .min(1, '1~31 사이의 일을 입력해주세요')
    .max(31, '1~31 사이의 일을 입력해주세요')
    .optional()
    .or(z.literal(undefined)),
  // 존속 종료
  endEra: z.enum(['BC', 'AD']).optional(),
  endYear: z
    .number()
    .int('정수를 입력해주세요')
    .positive('양수를 입력해주세요')
    .optional()
    .or(z.literal(undefined)),
  endMonth: z
    .number()
    .int('정수를 입력해주세요')
    .min(1, '1~12 사이의 월을 입력해주세요')
    .max(12, '1~12 사이의 월을 입력해주세요')
    .optional()
    .or(z.literal(undefined)),
  endDay: z
    .number()
    .int('정수를 입력해주세요')
    .min(1, '1~31 사이의 일을 입력해주세요')
    .max(31, '1~31 사이의 일을 입력해주세요')
    .optional()
    .or(z.literal(undefined)),
  stateType: z.string().min(1, '국가 형태를 입력해주세요'),
  parentModernCountryIds: z.array(z.string()).optional(), // 여러 현대 국가 지원
  parentHistoricalCountryIds: z.array(z.string()).optional(), // 상위 역사적 국가 지원
})

type HistoricalCountryFormData = z.infer<typeof historicalCountrySchema>

interface ModernCountryOption {
  id: string
  name: string
}

interface HistoricalCountryOption {
  id: string
  name: string
}

interface HistoricalCountryFormProps {
  editing: HistoricalCountry | null
  modernCountries: ModernCountryOption[]
  /** 상위 국가로 선택 가능한 역사적 국가 목록 (편집 중인 자신 제외해 전달) */
  historicalCountries?: HistoricalCountryOption[]
  onClose: () => void
  onSave: (
    data: Omit<HistoricalCountry, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      parentModernCountryIds?: string[]
      parentHistoricalCountryIds?: string[]
      transitionEventType?: TransitionEventType
      transitionEventDate?: string
    },
  ) => Promise<void>
}

/**
 * 역사적 국가 Form 컴포넌트
 */
// 국가 형태 옵션
const STATE_TYPE_OPTIONS = [
  { value: 'EMPIRE', label: '제국', icon: '👑', desc: '황제가 통치하는 국가' },
  { value: 'KINGDOM', label: '왕국', icon: '🏰', desc: '왕이 통치하는 국가' },
  {
    value: 'REPUBLIC',
    label: '공화국',
    icon: '🏛️',
    desc: '선출된 대표가 통치하는 국가',
  },
  {
    value: 'DYNASTY',
    label: '왕조',
    icon: '🎭',
    desc: '세습적 왕가가 통치하는 국가',
  },
  {
    value: 'HEREDITARY',
    label: '세습',
    icon: '🏛️',
    desc: '세습적 통치가 이어지는 정치체',
  },
  {
    value: 'FEDERATION',
    label: '연방',
    icon: '🤝',
    desc: '여러 국가의 연합체',
  },
  {
    value: 'PRINCIPALITY',
    label: '공국',
    icon: '🎪',
    desc: '공작이 통치하는 국가',
  },
  {
    value: 'ELECTORATE',
    label: '선제후국',
    icon: '⚜️',
    desc: '황제 선출권을 가진 제후의 영토',
  },
  {
    value: 'MARGRAVIATE',
    label: '변경백령',
    icon: '🏴',
    desc: '변경백이 다스리는 변경 지대의 영토',
  },
  {
    value: 'CALIPHATE',
    label: '칼리프국',
    icon: '☪️',
    desc: '이슬람 지도자가 통치하는 국가',
  },
  {
    value: 'SULTANATE',
    label: '술탄국',
    icon: '🕌',
    desc: '술탄이 통치하는 국가',
  },
  {
    value: 'KHANATE',
    label: '칸국',
    icon: '🏹',
    desc: '칸이 통치하는 유목 국가',
  },
  {
    value: 'CONFEDERATION',
    label: '연합',
    icon: '🔗',
    desc: '느슨한 형태의 국가 연합',
  },
  {
    value: 'CITY_STATE',
    label: '도시국가',
    icon: '🏙️',
    desc: '독립적인 도시 형태의 국가',
  },
  {
    value: 'THEOCRACY',
    label: '신정 국가',
    icon: '⛪',
    desc: '종교 지도자가 통치하는 국가',
  },
  {
    value: 'TRIBAL_STATE',
    label: '부족 국가/연합',
    icon: '🛡️',
    desc: '부족 또는 부족 연맹',
  },
  {
    value: 'NOMADIC_EMPIRE',
    label: '유목 제국',
    icon: '🐎',
    desc: '유목민이 세운 제국',
  },
  {
    value: 'PERSONAL_UNION',
    label: '동군연합',
    icon: '👥',
    desc: '같은 군주 아래 여러 정치체가 연합',
  },
  { value: 'OTHER', label: '기타', icon: '📋', desc: '기타 국가 형태' },
]

export function HistoricalCountryForm({
  editing,
  modernCountries,
  historicalCountries = [],
  onClose,
  onSave,
}: HistoricalCountryFormProps) {
  // ==================== 상태 관리 ====================

  /** 썸네일 이미지 미리보기 URL */
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')

  /** 업로드할 썸네일 파일 */
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  /** 썸네일 업로드 중/에러 */
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string | null>(null)

  /** 국가 형태 선택 모달 표시 여부 */
  const [showStateTypeModal, setShowStateTypeModal] = useState(false)

  /** 현대 국가 선택 모달 표시 여부 */
  const [showModernCountryModal, setShowModernCountryModal] = useState(false)

  /** 상위 역사적 국가 선택 모달 표시 여부 */
  const [showParentHistoricalModal, setShowParentHistoricalModal] = useState(false)

  /** 시작 기원 선택 모달 표시 여부 */
  const [showStartEraModal, setShowStartEraModal] = useState(false)

  /** 종료 기원 선택 모달 표시 여부 */
  const [showEndEraModal, setShowEndEraModal] = useState(false)

  /** 선택된 현대 국가 ID 배열 (신성로마제국 같은 다중 국가 지원) */
  const [selectedModernCountries, setSelectedModernCountries] = useState<
    string[]
  >([])

  /** 선택된 상위 역사적 국가 ID 배열 (후임) */
  const [selectedParentHistoricalIds, setSelectedParentHistoricalIds] =
    useState<string[]>([])

  /** 상위(후임) 설정 시 변천 유형·날짜 */
  const [transitionEventType, setTransitionEventType] =
    useState<TransitionEventType>('SUCCESSION')
  const [transitionEventDate, setTransitionEventDate] = useState('')
  const [transitionDatePickerOpen, setTransitionDatePickerOpen] = useState(false)

  /** 수정 시 상세 API로 시작/종료 시점 등 전체 필드 확실히 로드 */
  const { data: editingDetail } = useHistoricalCountry(editing?.id)

  // 수정 모드에서는 상세 API 응답 우선 사용 (시작/종료 시점이 목록 응답에 없을 수 있음)
  const formSource =
    editing?.id && editingDetail ? editingDetail : editing

  // ==================== Form Hook 설정 ====================

  /**
   * React Hook Form 설정
   * - Zod 스키마로 유효성 검증
   * - 모든 이벤트에서 실시간 검증 (onChange, onBlur)
   */
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<HistoricalCountryFormData>({
    resolver: zodResolver(historicalCountrySchema),
    mode: 'all', // 모든 이벤트에서 검증
    reValidateMode: 'onChange', // 재검증도 onChange
    criteriaMode: 'all', // 모든 에러 표시
  })

  // ==================== useEffect 훅 ====================

  /**
   * formSource(editing 또는 상세 API 응답)가 바뀔 때마다 폼 초기화
   * - 수정 모드: 상세 API 우선 사용해 시작/종료 시점까지 확실히 채움
   * - 생성 모드: 빈 값으로 초기화
   */
  useEffect(() => {
    if (editing) {
      if (editing.id) {
        // 수정 모드: formSource(상세 API 응답 우선)로 폼 채우기
        const raw = formSource as HistoricalCountry & {
          parentModernCountryIds?: string[]
          parentHistoricalCountryIds?: string[]
          start_era?: string
          start_year?: number
          start_month?: number
          start_day?: number
          end_era?: string
          end_year?: number
          end_month?: number
          end_day?: number
        }
        const parentIds = raw?.parentModernCountryIds ?? []
        const parentHistIds = raw?.parentHistoricalCountryIds ?? []
        const num = (v: number | null | undefined) =>
          v !== null && v !== undefined ? v : undefined
        const str = (v: string | null | undefined) => v || undefined
        reset({
          name: (raw?.name ?? editing.name) || '',
          enName: (raw?.enName ?? editing.enName) || '',
          description: (raw?.description ?? editing.description) || '',
          thumbnailUrl: (raw?.thumbnailUrl ?? editing.thumbnailUrl) || '',
          startEra: str(raw?.startEra ?? raw?.start_era),
          startYear: num(raw?.startYear ?? raw?.start_year),
          startMonth: num(raw?.startMonth ?? raw?.start_month),
          startDay: num(raw?.startDay ?? raw?.start_day),
          endEra: str(raw?.endEra ?? raw?.end_era),
          endYear: num(raw?.endYear ?? raw?.end_year),
          endMonth: num(raw?.endMonth ?? raw?.end_month),
          endDay: num(raw?.endDay ?? raw?.end_day),
          stateType: (raw?.stateType ?? editing.stateType) || '',
          parentModernCountryIds: parentIds,
          parentHistoricalCountryIds: parentHistIds,
        })
        setThumbnailPreview((raw?.thumbnailUrl ?? editing.thumbnailUrl) || '')
        setSelectedModernCountries(parentIds)
        setSelectedParentHistoricalIds(parentHistIds)
      } else {
        // 생성 모드: 빈 값으로 초기화
        reset({
          name: '',
          enName: '',
          description: '',
          thumbnailUrl: '',
          startEra: undefined,
          startYear: undefined,
          startMonth: undefined,
          startDay: undefined,
          endEra: undefined,
          endYear: undefined,
          endMonth: undefined,
          endDay: undefined,
          stateType: '',
          parentModernCountryIds: [],
          parentHistoricalCountryIds: [],
        })
        setThumbnailPreview('')
        setSelectedModernCountries([])
        setSelectedParentHistoricalIds([])
      }
      setThumbnailFile(null)
    }
  }, [editing, formSource, reset])

  // ==================== 이벤트 핸들러 ====================

  /**
   * 썸네일 파일 업로드 핸들러
   * - 서버에 업로드 후 반환된 URL만 저장 (DB 255자 제한, base64 미사용)
   */
  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbnailFile(file)
    setThumbnailUploadError(null)
    setThumbnailUploading(true)
    try {
      const result = await uploadImage(file)
      const url = (result.url ?? '').length > 255 ? (result.url ?? '').slice(0, 255) : (result.url ?? '')
      setValue('thumbnailUrl', url, { shouldValidate: true })
      setThumbnailPreview(result.url ?? '')
    } catch (err) {
      setThumbnailUploadError((err as Error).message)
      setThumbnailPreview('')
      setValue('thumbnailUrl', '')
    } finally {
      setThumbnailUploading(false)
    }
  }

  /**
   * 폼 제출 핸들러
   * - 데이터를 API 형식에 맞게 변환
   * - 수정 모드인 경우 id 포함
   * - 저장 성공 후 폼 초기화 및 닫기
   */
  const onSubmit = async (data: HistoricalCountryFormData) => {
    // API 페이로드 구성
    const payload: Omit<HistoricalCountry, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      parentModernCountryIds?: string[]
    } = {
      name: data.name,
      enName: data.enName,
      description: data.description || null,
      thumbnailUrl: data.thumbnailUrl || null,
      // 존속 시작 날짜
      startEra: data.startEra || null,
      startYear: data.startYear || null,
      startMonth: data.startMonth || null,
      startDay: data.startDay || null,
      // 존속 종료 날짜
      endEra: data.endEra || null,
      endYear: data.endYear || null,
      endMonth: data.endMonth || null,
      endDay: data.endDay || null,
      stateType: data.stateType as any, // STATE_TYPE_OPTIONS의 value를 HistoricalStateType으로 변환
    }

    // 수정 모드인 경우 id 추가
    if (editing?.id) {
      payload.id = editing.id
    }

    // 상위 현대 국가가 선택된 경우 추가 (여러 국가 지원)
    if (selectedModernCountries.length > 0) {
      payload.parentModernCountryIds = selectedModernCountries
    }
    // 상위(후임) 선택 시 추가 + 변천 유형·날짜 (API에서 Transition 생성에 사용)
    if (selectedParentHistoricalIds.length > 0) {
      payload.parentHistoricalCountryIds = selectedParentHistoricalIds
      payload.transitionEventType = transitionEventType
      payload.transitionEventDate = transitionEventDate || undefined
    }

    // 저장 및 폼 초기화
    await onSave(payload)
    reset()
    setThumbnailPreview('')
    setThumbnailFile(null)
    setSelectedModernCountries([])
    setSelectedParentHistoricalIds([])
    setTransitionEventType('SUCCESSION')
    setTransitionEventDate('')
    onClose()
  }

  /**
   * 폼 닫기 핸들러
   * - 모든 상태 초기화 후 부모 컴포넌트의 onClose 호출
   */
  const handleClose = () => {
    reset()
    setThumbnailPreview('')
    setThumbnailFile(null)
    setThumbnailUploadError(null)
    setThumbnailUploading(false)
    setSelectedModernCountries([])
    setSelectedParentHistoricalIds([])
    setTransitionEventType('SUCCESSION')
    setTransitionEventDate('')
    onClose()
  }

  /**
   * 국가 형태 선택 핸들러
   * - 선택한 값을 폼에 설정하고 모달 닫기
   */
  const handleStateTypeSelect = (value: string) => {
    setValue('stateType', value, { shouldValidate: true })
    setShowStateTypeModal(false)
  }

  /**
   * 시작 기원 선택 핸들러
   */
  const handleStartEraSelect = (era: 'BC' | 'AD') => {
    setValue('startEra', era, { shouldValidate: true })
    setShowStartEraModal(false)
  }

  /**
   * 종료 기원 선택 핸들러
   */
  const handleEndEraSelect = (era: 'BC' | 'AD') => {
    setValue('endEra', era, { shouldValidate: true })
    setShowEndEraModal(false)
  }

  /**
   * 현대 국가 선택/해제 핸들러 (다중 선택 지원)
   * - 이미 선택된 국가는 제거, 없으면 추가
   */
  const handleModernCountryToggle = (countryId: string) => {
    setSelectedModernCountries((prev) => {
      if (prev.includes(countryId)) {
        // 이미 선택됨 -> 제거
        return prev.filter((id) => id !== countryId)
      } else {
        // 선택 안됨 -> 추가
        return [...prev, countryId]
      }
    })
  }

  /**
   * 모든 현대 국가 선택 해제
   */
  const handleClearModernCountries = () => {
    setSelectedModernCountries([])
  }

  /**
   * 상위 역사적 국가 선택/해제 (다중 선택)
   */
  const handleParentHistoricalToggle = (historicalCountryId: string) => {
    setSelectedParentHistoricalIds((prev) =>
      prev.includes(historicalCountryId)
        ? prev.filter((id) => id !== historicalCountryId)
        : [...prev, historicalCountryId],
    )
  }

  const handleClearParentHistorical = () => {
    setSelectedParentHistoricalIds([])
  }

  // ==================== Helper 함수 ====================

  /** 선택된 국가 형태 값 */
  const selectedStateType = watch('stateType')

  /** 선택된 시작 기원 */
  const selectedStartEra = watch('startEra')

  /** 선택된 종료 기원 */
  const selectedEndEra = watch('endEra')

  /**
   * 국가 형태 선택 버튼 라벨 생성
   * @returns 아이콘과 라벨 또는 플레이스홀더
   */
  const getStateTypeLabel = () => {
    const option = STATE_TYPE_OPTIONS.find(
      (opt) => opt.value === selectedStateType,
    )
    return option ? `${option.icon} ${option.label}` : '선택하세요'
  }

  /**
   * 시작 기원 라벨 생성
   */
  const getStartEraLabel = () => {
    if (selectedStartEra === 'BC') return '기원전'
    if (selectedStartEra === 'AD') return '기원후'
    return '선택'
  }

  /**
   * 종료 기원 라벨 생성
   */
  const getEndEraLabel = () => {
    if (selectedEndEra === 'BC') return '기원전'
    if (selectedEndEra === 'AD') return '기원후'
    return '선택'
  }

  /**
   * 선택된 현대 국가들의 라벨 생성
   * @returns 선택된 국가명 목록 또는 기본 텍스트
   */
  const getModernCountriesLabel = () => {
    if (selectedModernCountries.length === 0) {
      return '없음 (독립적인 역사 국가)'
    }
    const selectedNames = modernCountries
      .filter((country) => selectedModernCountries.includes(country.id))
      .map((country) => country.name)
    return `🌍 ${selectedNames.join(', ')}`
  }

  const getParentHistoricalLabel = () => {
    if (selectedParentHistoricalIds.length === 0) {
      return '없음'
    }
    const names = historicalCountries
      .filter((c) => selectedParentHistoricalIds.includes(c.id))
      .map((c) => c.name)
    return `📜 ${names.join(', ')}`
  }

  // ==================== 조기 반환 ====================

  /** editing이 null이면 렌더링하지 않음 */

  if (!editing) {
    return null
  }

  // ==================== JSX 렌더링 ====================

  return (
    <>
      <FormSidePanel
        isOpen={!!editing}
        title={editing.id ? '역사적 국가 수정' : '역사적 국가 등록'}
        onClose={handleClose}
        submitLabel={
          isSubmitting ? '처리중...' : editing.id ? '수정 완료' : '국가 등록'
        }
        formId="historical-country-form"
        submitDisabled={!isValid || isSubmitting}
        headerExtra={
          <S.RequiredFieldsNotice>
            <S.RequiredFieldsIcon>⚠️</S.RequiredFieldsIcon>
            <S.RequiredFieldsText>
              <S.RequiredFieldsTitle>필수 항목:</S.RequiredFieldsTitle>
              <S.RequiredFieldsList>
                <S.RequiredFieldItem $completed={!!watch('name')}>
                  국가명(한글)
                </S.RequiredFieldItem>
                ,{' '}
                <S.RequiredFieldItem $completed={!!watch('enName')}>
                  국가명(영문)
                </S.RequiredFieldItem>
                ,{' '}
                <S.RequiredFieldItem $completed={!!watch('stateType')}>
                  국가 형태
                </S.RequiredFieldItem>
              </S.RequiredFieldsList>
            </S.RequiredFieldsText>
          </S.RequiredFieldsNotice>
        }
      >
        <S.Form id="historical-country-form" onSubmit={handleSubmit(onSubmit)}>
          {/* 기본 정보 */}
          <S.FormSection>
            <S.FormSectionHeader>
              <S.FormSectionIcon>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                    fill="currentColor"
                  />
                </svg>
              </S.FormSectionIcon>
              <div>
                <S.FormSectionTitle>기본 정보</S.FormSectionTitle>
                <S.FormSectionDescription>
                  역사적 국가의 이름, 형태, 존속 기간을 입력하세요
                </S.FormSectionDescription>
              </div>
            </S.FormSectionHeader>

            {/* 썸네일 (국가명 위, 파일 업로드만) */}
            <S.FormField style={{ marginBottom: '16px' }}>
              <S.FormLabel htmlFor="thumbnail-upload">썸네일</S.FormLabel>
              {thumbnailPreview && (
                <S.ThumbnailPreview
                  style={{ maxWidth: '100%', overflow: 'hidden', marginBottom: '12px' }}
                >
                  <S.ThumbnailImage
                    src={thumbnailPreview}
                    alt="썸네일 미리보기"
                    style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain' }}
                  />
                </S.ThumbnailPreview>
              )}
              <S.FileUploadWrapper>
                <S.FileUploadLabel htmlFor="thumbnail-upload">
                  <S.FileUploadIcon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.FileUploadIcon>
                  <S.FileUploadText>
                    {thumbnailUploading
                      ? '업로드 중...'
                      : thumbnailFile
                        ? thumbnailFile.name
                        : '이미지 파일 선택'}
                  </S.FileUploadText>
                </S.FileUploadLabel>
                <S.FileInput
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  disabled={thumbnailUploading}
                />
              </S.FileUploadWrapper>
              {thumbnailUploadError && (
                <S.ErrorMessage style={{ marginTop: '8px' }}>
                  {thumbnailUploadError}
                </S.ErrorMessage>
              )}
              <input type="hidden" {...register('thumbnailUrl')} />
            </S.FormField>

            <S.FormRow>
              {/* 국가명 (한글) */}
              <S.FormField>
                <S.FormLabel htmlFor="name">
                  국가명 (한글) <S.RequiredStar>*</S.RequiredStar>
                </S.FormLabel>
                <S.Input
                  id="name"
                  type="text"
                  placeholder="예: 조선"
                  {...register('name')}
                  $error={!!errors.name}
                />
                {errors.name && (
                  <S.ErrorMessage>{errors.name.message}</S.ErrorMessage>
                )}
              </S.FormField>

              {/* 국가명 (영문) */}
              <S.FormField>
                <S.FormLabel htmlFor="enName">국가명 (영문)</S.FormLabel>
                <S.Input
                  id="enName"
                  type="text"
                  placeholder="예: Joseon Dynasty"
                  {...register('enName')}
                  $error={!!errors.enName}
                />
                {errors.enName && (
                  <S.ErrorMessage>{errors.enName.message}</S.ErrorMessage>
                )}
              </S.FormField>
            </S.FormRow>

            <S.FormRow>
              {/* 국가 형태 */}
              <S.FormField>
                <S.FormLabel htmlFor="stateType">
                  국가 형태 <S.RequiredStar>*</S.RequiredStar>
                </S.FormLabel>
                <S.SelectButton
                  type="button"
                  onClick={() => setShowStateTypeModal(true)}
                  $error={!!errors.stateType}
                  $hasValue={!!selectedStateType}
                >
                  <span>{getStateTypeLabel()}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
                  </svg>
                </S.SelectButton>
                <input type="hidden" {...register('stateType')} />
                {errors.stateType && (
                  <S.ErrorMessage>{errors.stateType.message}</S.ErrorMessage>
                )}
              </S.FormField>

              {/* 상위 현대 국가 (다중 선택 지원) */}
              <S.FormField>
                <S.FormLabel htmlFor="parentModernCountryIds">
                  상위 현대 국가 (선택, 여러 개 가능)
                </S.FormLabel>
                <S.SelectButton
                  type="button"
                  onClick={() => setShowModernCountryModal(true)}
                  $hasValue={selectedModernCountries.length > 0}
                >
                  <span>{getModernCountriesLabel()}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
                  </svg>
                </S.SelectButton>
                {selectedModernCountries.length > 0 && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginTop: '4px',
                    }}
                  >
                    {selectedModernCountries.length}개 국가 선택됨
                  </div>
                )}
              </S.FormField>

              {/* 상위 역사적 국가 = 후임 (이 국가가 어떤 국가로 이어졌는지). 예: 고려 → 조선 시 고려가 조선 선택 */}
              {historicalCountries.length > 0 && (
                <>
                  <S.FormField>
                    <S.FormLabel htmlFor="parentHistoricalCountryIds">
                      상위 역사적 국가 (후임)
                    </S.FormLabel>
                    <S.SelectButton
                      type="button"
                      onClick={() => setShowParentHistoricalModal(true)}
                      $hasValue={selectedParentHistoricalIds.length > 0}
                    >
                      <span>{getParentHistoricalLabel()}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
                      </svg>
                    </S.SelectButton>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '4px',
                      }}
                    >
                      이 국가가 어떤 국가로 이어졌는지. 예: 고려 → 조선
                    </div>
                    {selectedParentHistoricalIds.length > 0 && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#374151',
                          marginTop: '4px',
                        }}
                      >
                        {selectedParentHistoricalIds.length}개 선택됨
                      </div>
                    )}
                  </S.FormField>
                  {selectedParentHistoricalIds.length > 0 && (
                    <S.FormRow>
                      <S.FormField>
                        <S.FormLabel>변천 유형</S.FormLabel>
                        <select
                          value={transitionEventType}
                          onChange={(e) =>
                            setTransitionEventType(e.target.value as TransitionEventType)
                          }
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            fontSize: 14,
                            color: '#111827',
                            background: '#fff',
                          }}
                        >
                          {(Object.keys(TRANSITION_EVENT_LABELS) as TransitionEventType[]).map(
                            (k) => (
                              <option key={k} value={k}>
                                {TRANSITION_EVENT_LABELS[k]}
                              </option>
                            )
                          )}
                        </select>
                      </S.FormField>
                      <S.FormField>
                        <S.FormLabel>변천 날짜</S.FormLabel>
                        <button
                          type="button"
                          onClick={() => setTransitionDatePickerOpen(true)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            fontSize: 14,
                            color: transitionEventDate ? '#111827' : '#9ca3af',
                            background: '#fff',
                            textAlign: 'left',
                          }}
                        >
                          {transitionEventDate
                            ? transitionEventDate.replace(/-/g, '.')
                            : '날짜 선택'}
                        </button>
                      </S.FormField>
                    </S.FormRow>
                  )}
                </>
              )}
            </S.FormRow>

            {/* 존속 기간 */}
            <S.FormSection style={{ marginTop: '24px' }}>
              <S.FormSectionHeader>
                <S.FormSectionIcon>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"
                      fill="currentColor"
                    />
                  </svg>
                </S.FormSectionIcon>
                <div>
                  <S.FormSectionTitle>존속 기간</S.FormSectionTitle>
                  <S.FormSectionDescription>
                    국가의 시작과 종료 시점을 입력하세요 (선택사항)
                  </S.FormSectionDescription>
                </div>
              </S.FormSectionHeader>

              {/* 존속 시작 */}
              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                    }}
                  >
                    📅 시작 시점
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      fontWeight: '400',
                    }}
                  >
                    (선택)
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr',
                    gap: '12px',
                  }}
                >
                  {/* 기원 선택 */}
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        marginBottom: '6px',
                        height: '18px',
                      }}
                    >
                      기원
                    </div>
                    <S.SelectButton
                      type="button"
                      onClick={() => setShowStartEraModal(true)}
                      $error={!!errors.startEra}
                      $hasValue={!!selectedStartEra}
                      style={{
                        width: '100%',
                        fontSize: '15px',
                        fontWeight: '600',
                        height: '44px',
                      }}
                    >
                      <span>{getStartEraLabel()}</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
                      </svg>
                    </S.SelectButton>
                    <input type="hidden" {...register('startEra')} />
                    {errors.startEra && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#dc2626',
                          marginTop: '6px',
                          fontWeight: '500',
                        }}
                      >
                        {errors.startEra.message}
                      </div>
                    )}
                  </div>

                  {/* 년월일 입력 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 80px',
                      gap: '8px',
                    }}
                  >
                    {/* 년 */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '6px',
                          height: '18px',
                        }}
                      >
                        년 *
                      </div>
                      <S.Input
                        type="number"
                        placeholder="1392"
                        {...register('startYear', {
                          setValueAs: (value) =>
                            value === '' ? undefined : Number(value),
                        })}
                        $error={!!errors.startYear}
                        style={{
                          width: '100%',
                          fontSize: '15px',
                          height: '44px',
                          borderRadius: '8px',
                          fontWeight: '500',
                        }}
                      />
                      {errors.startYear && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#dc2626',
                            marginTop: '4px',
                          }}
                        >
                          {errors.startYear.message}
                        </div>
                      )}
                    </div>

                    {/* 월 */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '6px',
                          height: '18px',
                        }}
                      >
                        월
                      </div>
                      <S.Input
                        type="number"
                        placeholder="7"
                        min="1"
                        max="12"
                        {...register('startMonth', {
                          setValueAs: (value) =>
                            value === '' ? undefined : Number(value),
                        })}
                        $error={!!errors.startMonth}
                        style={{
                          width: '100%',
                          fontSize: '15px',
                          height: '44px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontWeight: '500',
                        }}
                      />
                      {errors.startMonth && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#dc2626',
                            marginTop: '4px',
                          }}
                        >
                          {errors.startMonth.message}
                        </div>
                      )}
                    </div>

                    {/* 일 */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '6px',
                          height: '18px',
                        }}
                      >
                        일
                      </div>
                      <S.Input
                        type="number"
                        placeholder="17"
                        min="1"
                        max="31"
                        {...register('startDay', {
                          setValueAs: (value) =>
                            value === '' ? undefined : Number(value),
                        })}
                        $error={!!errors.startDay}
                        style={{
                          width: '100%',
                          fontSize: '15px',
                          height: '44px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontWeight: '500',
                        }}
                      />
                      {errors.startDay && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#dc2626',
                            marginTop: '4px',
                          }}
                        >
                          {errors.startDay.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 존속 종료 */}
              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                    }}
                  >
                    🏁 종료 시점
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      fontWeight: '400',
                    }}
                  >
                    (선택)
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr',
                    gap: '12px',
                  }}
                >
                  {/* 기원 선택 */}
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        marginBottom: '6px',
                        height: '18px',
                      }}
                    >
                      기원
                    </div>
                    <S.SelectButton
                      type="button"
                      onClick={() => setShowEndEraModal(true)}
                      $error={!!errors.endEra}
                      $hasValue={!!selectedEndEra}
                      style={{
                        width: '100%',
                        fontSize: '15px',
                        fontWeight: '600',
                        height: '44px',
                      }}
                    >
                      <span>{getEndEraLabel()}</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
                      </svg>
                    </S.SelectButton>
                    <input type="hidden" {...register('endEra')} />
                    {errors.endEra && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#dc2626',
                          marginTop: '6px',
                          fontWeight: '500',
                        }}
                      >
                        {errors.endEra.message}
                      </div>
                    )}
                  </div>

                  {/* 년월일 입력 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 80px',
                      gap: '8px',
                    }}
                  >
                    {/* 년 */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '6px',
                          height: '18px',
                        }}
                      >
                        년 *
                      </div>
                      <S.Input
                        type="number"
                        placeholder="1897"
                        {...register('endYear', {
                          setValueAs: (value) =>
                            value === '' ? undefined : Number(value),
                        })}
                        $error={!!errors.endYear}
                        style={{
                          width: '100%',
                          fontSize: '15px',
                          height: '44px',
                          borderRadius: '8px',
                          fontWeight: '500',
                        }}
                      />
                      {errors.endYear && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#dc2626',
                            marginTop: '4px',
                          }}
                        >
                          {errors.endYear.message}
                        </div>
                      )}
                    </div>

                    {/* 월 */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '6px',
                          height: '18px',
                        }}
                      >
                        월
                      </div>
                      <S.Input
                        type="number"
                        placeholder="10"
                        min="1"
                        max="12"
                        {...register('endMonth', {
                          setValueAs: (value) =>
                            value === '' ? undefined : Number(value),
                        })}
                        $error={!!errors.endMonth}
                        style={{
                          width: '100%',
                          fontSize: '15px',
                          height: '44px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontWeight: '500',
                        }}
                      />
                      {errors.endMonth && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#dc2626',
                            marginTop: '4px',
                          }}
                        >
                          {errors.endMonth.message}
                        </div>
                      )}
                    </div>

                    {/* 일 */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '6px',
                          height: '18px',
                        }}
                      >
                        일
                      </div>
                      <S.Input
                        type="number"
                        placeholder="12"
                        min="1"
                        max="31"
                        {...register('endDay', {
                          setValueAs: (value) =>
                            value === '' ? undefined : Number(value),
                        })}
                        $error={!!errors.endDay}
                        style={{
                          width: '100%',
                          fontSize: '15px',
                          height: '44px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontWeight: '500',
                        }}
                      />
                      {errors.endDay && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#dc2626',
                            marginTop: '4px',
                          }}
                        >
                          {errors.endDay.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </S.FormSection>
          </S.FormSection>

          {/* 추가 정보 */}
          <S.FormSection>
            <S.FormSectionHeader>
              <S.FormSectionIcon>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                    fill="currentColor"
                  />
                </svg>
              </S.FormSectionIcon>
              <div>
                <S.FormSectionTitle>추가 정보</S.FormSectionTitle>
                <S.FormSectionDescription>
                  설명 등 부가적인 정보를 입력하세요 (선택)
                </S.FormSectionDescription>
              </div>
            </S.FormSectionHeader>

            {/* 설명 */}
            <S.FormField>
              <S.FormLabel htmlFor="description">설명</S.FormLabel>
              <S.Input
                as="textarea"
                id="description"
                rows={4}
                placeholder="역사적 국가에 대한 설명을 입력해주세요"
                {...register('description')}
                $error={!!errors.description}
                style={{ minHeight: '100px', resize: 'vertical' }}
              />
              {errors.description && (
                <S.ErrorMessage>{errors.description.message}</S.ErrorMessage>
              )}
            </S.FormField>
          </S.FormSection>
        </S.Form>
      </FormSidePanel>

      {/* ==================== 국가 형태 선택 모달 ==================== */}
      {showStateTypeModal
        ? createPortal(
            <>
              <S.SelectModalOverlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowStateTypeModal(false)}
              />
              <S.SelectModal
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <S.SelectModalHeader>
                  <S.SelectModalTitle>국가 형태 선택</S.SelectModalTitle>
                  <S.SelectModalClose
                    onClick={() => setShowStateTypeModal(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectModalClose>
                </S.SelectModalHeader>
                <S.SelectModalContent>
                  {STATE_TYPE_OPTIONS.map((option) => (
                    <S.SelectOption
                      key={option.value}
                      $active={selectedStateType === option.value}
                      onClick={() => handleStateTypeSelect(option.value)}
                    >
                      <S.SelectOptionIcon>{option.icon}</S.SelectOptionIcon>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          flex: 1,
                        }}
                      >
                        <S.SelectOptionText>{option.label}</S.SelectOptionText>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {option.desc}
                        </span>
                      </div>
                      {selectedStateType === option.value && (
                        <S.SelectOptionCheck>
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                              fill="currentColor"
                            />
                          </svg>
                        </S.SelectOptionCheck>
                      )}
                    </S.SelectOption>
                  ))}
                </S.SelectModalContent>
              </S.SelectModal>
            </>,
            document.body,
          )
        : null}

      {/* ==================== 현대 국가 선택 모달 (다중 선택 지원) ==================== */}
      {showModernCountryModal
        ? createPortal(
            <>
              <S.SelectModalOverlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowModernCountryModal(false)}
              />
              <S.SelectModal
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <S.SelectModalHeader>
                  <S.SelectModalTitle>
                    상위 현대 국가 선택 (여러 개 선택 가능)
                  </S.SelectModalTitle>
                  <S.SelectModalClose
                    onClick={() => setShowModernCountryModal(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectModalClose>
                </S.SelectModalHeader>
                <S.SelectModalContent>
                  {selectedModernCountries.length > 0 && (
                    <div
                      style={{
                        padding: '12px',
                        background: '#f3f4f6',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '14px', color: '#374151' }}>
                        {selectedModernCountries.length}개 선택됨
                      </span>
                      <button
                        type="button"
                        onClick={handleClearModernCountries}
                        style={{
                          padding: '4px 12px',
                          fontSize: '13px',
                          color: '#dc2626',
                          background: 'white',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        전체 해제
                      </button>
                    </div>
                  )}
                  {modernCountries.map((country) => (
                    <S.SelectOption
                      key={country.id}
                      $active={selectedModernCountries.includes(country.id)}
                      onClick={() => handleModernCountryToggle(country.id)}
                    >
                      <S.SelectOptionIcon>🌍</S.SelectOptionIcon>
                      <S.SelectOptionText>{country.name}</S.SelectOptionText>
                      {selectedModernCountries.includes(country.id) && (
                        <S.SelectOptionCheck>
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                              fill="currentColor"
                            />
                          </svg>
                        </S.SelectOptionCheck>
                      )}
                    </S.SelectOption>
                  ))}
                </S.SelectModalContent>
              </S.SelectModal>
            </>,
            document.body,
          )
        : null}

      {/* ==================== 상위 역사적 국가 선택 모달 ==================== */}
      {showParentHistoricalModal
        ? createPortal(
            <>
              <S.SelectModalOverlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowParentHistoricalModal(false)}
              />
              <S.SelectModal
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <S.SelectModalHeader>
                  <S.SelectModalTitle>
                    상위 역사적 국가 선택 (여러 개 선택 가능)
                  </S.SelectModalTitle>
                  <S.SelectModalClose
                    onClick={() => setShowParentHistoricalModal(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectModalClose>
                </S.SelectModalHeader>
                <S.SelectModalContent>
                  {selectedParentHistoricalIds.length > 0 && (
                    <div
                      style={{
                        padding: '12px',
                        background: '#f3f4f6',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '14px', color: '#374151' }}>
                        {selectedParentHistoricalIds.length}개 선택됨
                      </span>
                      <button
                        type="button"
                        onClick={handleClearParentHistorical}
                        style={{
                          padding: '4px 12px',
                          fontSize: '13px',
                          color: '#dc2626',
                          background: 'white',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        전체 해제
                      </button>
                    </div>
                  )}
                  {historicalCountries.map((hc) => (
                    <S.SelectOption
                      key={hc.id}
                      $active={selectedParentHistoricalIds.includes(hc.id)}
                      onClick={() => handleParentHistoricalToggle(hc.id)}
                    >
                      <S.SelectOptionIcon>📜</S.SelectOptionIcon>
                      <S.SelectOptionText>{hc.name}</S.SelectOptionText>
                      {selectedParentHistoricalIds.includes(hc.id) && (
                        <S.SelectOptionCheck>
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                              fill="currentColor"
                            />
                          </svg>
                        </S.SelectOptionCheck>
                      )}
                    </S.SelectOption>
                  ))}
                </S.SelectModalContent>
              </S.SelectModal>
            </>,
            document.body,
          )
        : null}

      {/* ==================== 시작 기원 선택 모달 ==================== */}
      {showStartEraModal
        ? createPortal(
            <>
              <S.SelectModalOverlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowStartEraModal(false)}
              />
              <S.SelectModal
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <S.SelectModalHeader>
                  <S.SelectModalTitle>시작 기원 선택</S.SelectModalTitle>
                  <S.SelectModalClose
                    onClick={() => setShowStartEraModal(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectModalClose>
                </S.SelectModalHeader>
                <S.SelectModalContent>
                  <S.SelectOption
                    $active={selectedStartEra === 'BC'}
                    onClick={() => handleStartEraSelect('BC')}
                  >
                    <S.SelectOptionIcon>📜</S.SelectOptionIcon>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        flex: 1,
                      }}
                    >
                      <S.SelectOptionText>기원전 (BC)</S.SelectOptionText>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        Before Christ - 서기 이전 시대
                      </span>
                    </div>
                    {selectedStartEra === 'BC' && (
                      <S.SelectOptionCheck>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                  <S.SelectOption
                    $active={selectedStartEra === 'AD'}
                    onClick={() => handleStartEraSelect('AD')}
                  >
                    <S.SelectOptionIcon>📅</S.SelectOptionIcon>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        flex: 1,
                      }}
                    >
                      <S.SelectOptionText>기원후 (AD)</S.SelectOptionText>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        Anno Domini - 서기 이후 시대
                      </span>
                    </div>
                    {selectedStartEra === 'AD' && (
                      <S.SelectOptionCheck>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                </S.SelectModalContent>
              </S.SelectModal>
            </>,
            document.body,
          )
        : null}

      {/* ==================== 종료 기원 선택 모달 ==================== */}
      {showEndEraModal
        ? createPortal(
            <>
              <S.SelectModalOverlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowEndEraModal(false)}
              />
              <S.SelectModal
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <S.SelectModalHeader>
                  <S.SelectModalTitle>종료 기원 선택</S.SelectModalTitle>
                  <S.SelectModalClose onClick={() => setShowEndEraModal(false)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectModalClose>
                </S.SelectModalHeader>
                <S.SelectModalContent>
                  <S.SelectOption
                    $active={selectedEndEra === 'BC'}
                    onClick={() => handleEndEraSelect('BC')}
                  >
                    <S.SelectOptionIcon>📜</S.SelectOptionIcon>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        flex: 1,
                      }}
                    >
                      <S.SelectOptionText>기원전 (BC)</S.SelectOptionText>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        Before Christ - 서기 이전 시대
                      </span>
                    </div>
                    {selectedEndEra === 'BC' && (
                      <S.SelectOptionCheck>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                  <S.SelectOption
                    $active={selectedEndEra === 'AD'}
                    onClick={() => handleEndEraSelect('AD')}
                  >
                    <S.SelectOptionIcon>📅</S.SelectOptionIcon>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        flex: 1,
                      }}
                    >
                      <S.SelectOptionText>기원후 (AD)</S.SelectOptionText>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        Anno Domini - 서기 이후 시대
                      </span>
                    </div>
                    {selectedEndEra === 'AD' && (
                      <S.SelectOptionCheck>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                </S.SelectModalContent>
              </S.SelectModal>
            </>,
            document.body,
          )
        : null}

      <DatePickerModal
        isOpen={transitionDatePickerOpen}
        onClose={() => setTransitionDatePickerOpen(false)}
        onSelect={(date) => {
          setTransitionEventDate(date)
          setTransitionDatePickerOpen(false)
        }}
        initialDate={transitionEventDate || undefined}
        title="변천 날짜 선택"
      />
    </>
  )
}
