import React, { useMemo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { FiCalendar, FiChevronDown, FiGlobe, FiInfo, FiSearch } from 'react-icons/fi'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import styled from 'styled-components'
import { FormSidePanel } from '@/shared/ui/form-side-panel'
import {
  DateFieldBtn,
  DateFieldsRow,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormHeader,
  FormRows,
  FormSectionInner,
  SubmitButton,
  TabButton,
  TabNavigation,
} from '@/shared/ui/register-form-layout'
import type { HistoricalCountry, Era } from '@/entities/historical-country/api'
import { useHistoricalCountry } from '@/features/historical-country/use-historical-countries.hook'
import { uploadImage } from '@/shared/api/upload'
import type { TransitionEventType } from '@/shared/api/historical-countries'
import { CountrySearchModal } from '@/shared/ui/country-search-modal'
import * as S from '../../../../pages/history/country/country.styles'

/** 모달: FormScroll이 이미 24px 패딩을 주므로 FormSectionInner 패딩 제거해 간격 통일 */
const ModalFormLayoutWrap = styled.div`
  padding: 0;
  &[data-inner] {
    padding: 0;
  }
  ${FormSectionInner} {
    padding: 0;
  }
  ${FormHeader} {
    padding: 0 0 16px 0;
    border-bottom: none;
  }
  ${TabNavigation} {
    margin-bottom: 20px;
  }
  /* 섹션: 상단 보더 있는 경우(2번째 이후) — 간격 통일 */
  ${S.FormSection} {
    margin-top: 0;
    padding: 0;
    border: none;
    gap: 0;
  }
  ${S.FormSection}:first-of-type {
    margin-top: 0;
  }
  ${S.FormSection}:not(:first-of-type) {
    margin-top: 28px;
    padding-top: 32px;
    border-top: 1px solid #e5e7eb;
  }
  /* 모든 섹션 헤더(타이틀+설명) 동일 스타일·간격 */
  ${S.FormSectionHeader} {
    margin-bottom: 16px;
  }
  ${S.FormSectionIcon} {
    display: none;
  }
  ${S.FormSectionTitle} {
    font-size: 15px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 4px 0;
  }
  ${S.FormSectionDescription} {
    font-size: 13px;
    color: #6b7280;
    margin: 0;
  }
  ${S.FormRow} {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    border: none;
  }
  /* 인물 등록 FieldRow와 동일: 360px 1fr, 20px 0, border #f3f4f6 */
  ${S.FormField} {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 24px;
    align-items: start;
    padding: 20px 0;
    border-bottom: 1px solid #f3f4f6;
  }
  @media (max-width: 768px) {
    ${S.FormField} {
      grid-template-columns: 1fr;
    }
  }
  ${S.FormLabel} {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    padding-top: 10px;
    margin: 0;
    grid-column: 1;
    grid-row: 1;
  }
  ${S.FormField} input:not([type='hidden']),
  ${S.FormField} button[type='button'],
  ${S.FormField} select,
  ${S.FormField} textarea {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
  }
  ${S.FormField} ${S.ErrorMessage} {
    grid-column: 2;
    grid-row: 2;
    font-size: 12px;
    color: #dc2626;
    margin-top: 4px;
  }
  ${S.FormField} > div {
    grid-column: 2;
  }
  /* 국가명(한글)·(영문)·유래: 같은 성격 필드끼리는 행 사이 보더 없음, 그룹 하단에만 */
  ${S.FormField}.name-group-field {
    border-bottom: none;
  }
  .name-group {
    border-bottom: 1px solid #f3f4f6;
  }
  /* 국가 형태·정치체 성격: 같은 성격 필드끼리 그룹, 행 사이 보더 없음 */
  .state-type-group ${S.FormField} {
    border-bottom: none;
  }
  .state-type-group {
    border-bottom: 1px solid #f3f4f6;
  }
  /* 단일 컬럼 필드(국가명 유래, 설명 등)는 전체 너비 */
  ${S.FormField}[style*='marginTop'] {
    display: flex;
    flex-direction: column;
    gap: 8px;
    grid-template-columns: 1fr;
  }
  ${S.FormField}[style*='marginTop'] ${S.ErrorMessage} {
    grid-column: unset;
    grid-row: unset;
  }
  ${S.FormField}[data-field='thumbnail'] {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 24px;
    align-items: start;
    padding: 20px 0;
    border-bottom: 1px solid #f3f4f6;
    min-width: 0;
  }
  ${S.FormField}[data-field='thumbnail'] ${S.FormLabel} {
    padding-top: 8px;
    grid-column: 1;
    grid-row: 1;
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-right {
    grid-column: 2;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  /* 88px 원형 하나: 미리보기일 때 이미지, 없을 때 업로드 프롬프트 (인물 썸네일과 동일) */
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle {
    width: 88px;
    height: 88px;
    min-width: 88px;
    min-height: 88px;
    max-width: 88px;
    max-height: 88px;
    border-radius: 50%;
    overflow: hidden;
    background: rgba(226, 232, 240, 0.6);
    border: 2px dashed rgba(99, 102, 241, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 0.2s, background 0.2s;
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle:hover {
    border-color: rgba(99, 102, 241, 0.6);
    background: rgba(226, 232, 240, 0.9);
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle[data-has-image] {
    background: transparent;
    border-color: transparent;
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle svg {
    color: #94a3b8;
    width: 32px;
    height: 32px;
  }
  ${S.FormField}[data-field='thumbnail'] ${S.ErrorMessage} {
    grid-column: 2;
    width: 100%;
  }
  @media (max-width: 768px) {
    ${S.FormField}[data-field='thumbnail'] {
      grid-template-columns: 1fr;
    }
    ${S.FormField}[data-field='thumbnail'] .thumbnail-right {
      grid-column: unset;
    }
  }
  /* 존속 기간 DateDetailRow: RFL Input과 동일 스타일 */
  ${S.DateDetailRow} input[type='number'],
  ${S.DateDetailRow} ${S.Input} {
    padding: 12px 16px;
    font-size: 14px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    width: 72px;
    min-width: 72px;
    text-align: center;
    box-sizing: border-box;
  }
  ${S.DateDetailRow} input[type='number']:focus,
  ${S.DateDetailRow} ${S.Input}:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  ${S.DateDetailRow} ${S.SelectButton} {
    min-width: 100px;
    padding: 10px 14px;
  }
  /* 존속 기간 달력 버튼(기원 선택): RFL DateFieldBtn과 동일 */
  ${DateFieldsRow} {
    max-width: 480px;
  }
  ${DateFieldBtn} {
    padding: 12px 16px;
    font-size: 14px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: #fff;
    color: #111827;
  }
  ${DateFieldBtn}:hover {
    border-color: #4f46e5;
    background: #faf5ff;
  }
  ${DateFieldBtn}:focus-visible {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  /* 인물 등록 RFL Input과 동일: #e5e7eb 테두리, 12px radius, 포커스 인디고 */
  ${S.Input} {
    width: 100%;
    padding: 12px 16px;
    font-size: 14px;
    color: #111827;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s ease;
  }
  ${S.Input}::placeholder {
    color: #9ca3af;
  }
  ${S.Input}:hover:not(:focus) {
    border-color: #d1d5db;
  }
  ${S.Input}:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  /* 인물 등록 SelectBtn과 동일: 10px 14px, max-width 380px */
  ${S.SelectButton} {
    padding: 10px 14px;
    font-size: 14px;
    color: #111827;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    max-width: 380px;
  }
  ${S.SelectButton}:hover {
    border-color: #d1d5db;
  }
  ${S.SelectButton}:focus-visible {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

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
  nameOrigin: z.string().optional(),
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
  entityKind: z.enum(['STATE', 'REGIME', 'PERIOD']).optional().nullable(),
  parentModernCountryIds: z.array(z.string()).optional(), // 여러 현대 국가 지원
  parentHistoricalCountryIds: z.array(z.string()).optional(), // 후임 국가 ID 배열
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
  /** 'panel' = 우측 FormSidePanel(기본), 'modal' = 모달 래퍼용(폼 본문만 렌더) */
  embedIn?: 'panel' | 'modal'
  /** 등록 모달에서 "막부" 선택 시 폼에 미리 채울 값 */
  initialPreset?: { stateType: 'SHOGUNATE'; entityKind: 'REGIME' }
  modernCountries: ModernCountryOption[]
  /** 후임으로 선택 가능한 역사적 국가 목록 (편집 중인 자신 제외해 전달) */
  historicalCountries?: HistoricalCountryOption[]
  onClose: () => void
  onSave: (
    data: Omit<HistoricalCountry, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      parentModernCountryIds?: string[]
      parentHistoricalCountryIds?: string[]
      transitionEventType?: TransitionEventType
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
    value: 'SHOGUNATE',
    label: '막부',
    icon: '⚔️',
    desc: '쇼군이 실권을 가진 군정 (무로마치·에도 막부 등)',
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

const ENTITY_KIND_OPTIONS: { value: 'STATE' | 'REGIME' | 'PERIOD'; label: string }[] = [
  { value: 'STATE', label: '주권 국가 (신성로마, 프로이센 등)' },
  { value: 'REGIME', label: '정권·군정 (무로마치·에도 막부 등)' },
  { value: 'PERIOD', label: '시대 (메이지·다이쇼 시대 등)' },
]

export function HistoricalCountryForm({
  editing,
  embedIn = 'panel',
  initialPreset,
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

  /** 후임 국가 선택 모달 표시 여부 */
  const [showParentHistoricalModal, setShowParentHistoricalModal] = useState(false)

  /** 국가 형태 모달 내 검색어 */
  const [stateTypeSearch, setStateTypeSearch] = useState('')

  /** 시작 기원 선택 모달 표시 여부 */
  const [showStartEraModal, setShowStartEraModal] = useState(false)
  /** 시작 시점 모달 내 년/월/일 (모달 열릴 때 폼 값으로 초기화) */
  const [startModalYMD, setStartModalYMD] = useState({ y: '', m: '', d: '' })

  /** 종료 기원 선택 모달 표시 여부 */
  const [showEndEraModal, setShowEndEraModal] = useState(false)
  /** 종료 시점 모달 내 년/월/일 */
  const [endModalYMD, setEndModalYMD] = useState({ y: '', m: '', d: '' })

  /** 선택된 현대 국가 ID 배열 (신성로마제국 같은 다중 국가 지원) */
  const [selectedModernCountries, setSelectedModernCountries] = useState<
    string[]
  >([])

  /** 선택된 후임 국가 ID 배열 */
  const [selectedParentHistoricalIds, setSelectedParentHistoricalIds] =
    useState<string[]>([])

  /** 후임 설정 시 변천 유형 (날짜는 후임 국가의 존속 시작 시점 참조) */
  const [transitionEventType, setTransitionEventType] =
    useState<TransitionEventType>('SUCCESSION')
  /** 후임 설정 시 전환 성격: 국가 교체 vs 정권 교체 */
  const [transitionScope, setTransitionScope] = useState<'STATE_SUCCESSION' | 'REGIME_CHANGE' | ''>('')

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
    getValues,
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
          transitionEventType?: TransitionEventType
          entityKind?: 'STATE' | 'REGIME' | 'PERIOD' | null
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
        const era = (v: string | null | undefined): 'BC' | 'AD' | undefined =>
          v === 'BC' || v === 'AD' ? v : undefined
        reset({
          name: (raw?.name ?? editing.name) || '',
          enName: (raw?.enName ?? editing.enName) || '',
          nameOrigin: (raw?.nameOrigin ?? (editing as any).nameOrigin) || '',
          description: (raw?.description ?? editing.description) || '',
          thumbnailUrl: (raw?.thumbnailUrl ?? editing.thumbnailUrl) || '',
          startEra: era(raw?.startEra ?? raw?.start_era),
          startYear: num(raw?.startYear ?? raw?.start_year),
          startMonth: num(raw?.startMonth ?? raw?.start_month),
          startDay: num(raw?.startDay ?? raw?.start_day),
          endEra: era(raw?.endEra ?? raw?.end_era),
          endYear: num(raw?.endYear ?? raw?.end_year),
          endMonth: num(raw?.endMonth ?? raw?.end_month),
          endDay: num(raw?.endDay ?? raw?.end_day),
          stateType: (raw?.stateType ?? editing.stateType) || '',
          entityKind: (raw?.entityKind ?? (editing as any).entityKind) ?? undefined,
          parentModernCountryIds: parentIds,
          parentHistoricalCountryIds: parentHistIds,
        })
        setThumbnailPreview((raw?.thumbnailUrl ?? editing.thumbnailUrl) || '')
        setSelectedModernCountries(parentIds)
        setSelectedParentHistoricalIds(parentHistIds)
        setTransitionEventType(
          (raw?.transitionEventType as TransitionEventType) ?? 'SUCCESSION',
        )
        setTransitionScope(
          (raw as { transitionScope?: 'STATE_SUCCESSION' | 'REGIME_CHANGE' | null })?.transitionScope ?? '',
        )
      } else {
        // 생성 모드: 빈 값으로 초기화 (막부 등록 시 initialPreset으로 국가 형태·정치체 성격 미리 채움)
        reset({
          name: '',
          enName: '',
          nameOrigin: '',
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
          stateType: initialPreset?.stateType ?? '',
          entityKind: initialPreset?.entityKind ?? undefined,
          parentModernCountryIds: [],
          parentHistoricalCountryIds: [],
        })
        setThumbnailPreview('')
        setSelectedModernCountries([])
        setSelectedParentHistoricalIds([])
        setTransitionEventType('SUCCESSION')
        setTransitionScope('')
      }
      setThumbnailFile(null)
    }
  }, [editing, formSource, reset, initialPreset])

  /** 시작 시점 모달 열릴 때 폼 값으로 년/월/일 초기화 */
  useEffect(() => {
    if (showStartEraModal) {
      const v = getValues()
      setStartModalYMD({
        y: v.startYear != null ? String(v.startYear) : '',
        m: v.startMonth != null ? String(v.startMonth) : '',
        d: v.startDay != null ? String(v.startDay) : '',
      })
    }
  }, [showStartEraModal, getValues])

  /** 종료 시점 모달 열릴 때 폼 값으로 년/월/일 초기화 */
  useEffect(() => {
    if (showEndEraModal) {
      const v = getValues()
      setEndModalYMD({
        y: v.endYear != null ? String(v.endYear) : '',
        m: v.endMonth != null ? String(v.endMonth) : '',
        d: v.endDay != null ? String(v.endDay) : '',
      })
    }
  }, [showEndEraModal, getValues])

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
      const result = await uploadImage(file, 'countries')
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
      nameOrigin: data.nameOrigin || null,
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
      entityKind: data.entityKind ?? null,
    }

    // 수정 모드인 경우 id 추가
    if (editing?.id) {
      payload.id = editing.id
    }

    // 연결된 현대 국가가 선택된 경우 추가 (여러 국가 지원)
    if (selectedModernCountries.length > 0) {
      payload.parentModernCountryIds = selectedModernCountries
    }
    // 후임 선택 시 추가 + 변천 유형·전환 성격 (날짜는 후임 국가 시작 시점 참조)
    if (selectedParentHistoricalIds.length > 0) {
      payload.parentHistoricalCountryIds = selectedParentHistoricalIds
      payload.transitionEventType = transitionEventType
      payload.transitionScope = transitionScope || undefined
    }

    // 저장 및 폼 초기화
    await onSave(payload)
    reset()
    setThumbnailPreview('')
    setThumbnailFile(null)
    setSelectedModernCountries([])
    setSelectedParentHistoricalIds([])
    setTransitionEventType('SUCCESSION')
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

  /** 시작 기원 선택 (모달 내에서만, 적용 버튼으로 닫음) */
  const handleStartEraSelect = (era: 'BC' | 'AD') => {
    setValue('startEra', era, { shouldValidate: true })
  }

  /** 시작 시점 모달 적용: 년/월/일 반영 후 닫기 */
  const handleStartDateApply = () => {
    const y = startModalYMD.y === '' ? undefined : Number(startModalYMD.y)
    const m = startModalYMD.m === '' ? undefined : Number(startModalYMD.m)
    const d = startModalYMD.d === '' ? undefined : Number(startModalYMD.d)
    if (y !== undefined) setValue('startYear', y, { shouldValidate: true })
    if (m !== undefined) setValue('startMonth', m, { shouldValidate: true })
    if (d !== undefined) setValue('startDay', d, { shouldValidate: true })
    setShowStartEraModal(false)
  }

  /** 종료 기원 선택 (모달 내에서만) */
  const handleEndEraSelect = (era: 'BC' | 'AD') => {
    setValue('endEra', era, { shouldValidate: true })
  }

  /** 종료 시점 모달 적용 */
  const handleEndDateApply = () => {
    const y = endModalYMD.y === '' ? undefined : Number(endModalYMD.y)
    const m = endModalYMD.m === '' ? undefined : Number(endModalYMD.m)
    const d = endModalYMD.d === '' ? undefined : Number(endModalYMD.d)
    if (y !== undefined) setValue('endYear', y, { shouldValidate: true })
    if (m !== undefined) setValue('endMonth', m, { shouldValidate: true })
    if (d !== undefined) setValue('endDay', d, { shouldValidate: true })
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
   * 후임 국가 선택/해제 (다중 선택)
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
  /** 선택된 정치체 성격 (REGIME일 때 국가 형태 막부 권장 힌트 표시) */
  const selectedEntityKind = watch('entityKind')

  /** 선택된 시작 기원 */
  const selectedStartEra = watch('startEra')

  /** 선택된 종료 기원 */
  const selectedEndEra = watch('endEra')

  /** 모달일 때 탭 (기본 정보 / 연결·후임) */
  const [modalTab, setModalTab] = useState<'basic' | 'connection'>('basic')

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

  /** 출생일·사망일 스타일용: 시작 시점 표시 문자열 */
  const formatStartDateDisplay = () => {
    const era = watch('startEra')
    const y = watch('startYear')
    const m = watch('startMonth')
    const d = watch('startDay')
    if (!era || y == null) return '선택'
    const parts = [era === 'BC' ? 'BC' : 'AD', String(y)]
    if (m != null) parts.push(String(m))
    if (d != null) parts.push(String(d))
    return parts.join('.')
  }

  /** 출생일·사망일 스타일용: 종료 시점 표시 문자열 */
  const formatEndDateDisplay = () => {
    const era = watch('endEra')
    const y = watch('endYear')
    const m = watch('endMonth')
    const d = watch('endDay')
    if (!era || y == null) return '선택'
    const parts = [era === 'BC' ? 'BC' : 'AD', String(y)]
    if (m != null) parts.push(String(m))
    if (d != null) parts.push(String(d))
    return parts.join('.')
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
    return selectedNames.join(', ')
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

  /** 국가 형태 모달: 검색어로 필터링된 옵션 */
  const filteredStateTypeOptions = useMemo(() => {
    const q = stateTypeSearch.trim().toLowerCase()
    if (!q) return STATE_TYPE_OPTIONS
    return STATE_TYPE_OPTIONS.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.desc && opt.desc.toLowerCase().includes(q)),
    )
  }, [stateTypeSearch])

  // ==================== 조기 반환 ====================

  /** editing이 null이면 렌더링하지 않음 */

  if (!editing) {
    return null
  }

  // ==================== JSX 렌더링 ====================

  const formBody = (
    <>
          {/* 기본 정보 */}
          <S.FormSection>
            {/* 모달 기본 탭에서만: 기본 정보 헤더·썸네일·이름·국가형태·존속기간 표시 */}
            <div style={{ display: embedIn === 'modal' && modalTab === 'connection' ? 'none' : 'block' }}>
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

            {/* 대표 이미지 (국기·상징 등) — 인물 등록 썸네일과 동일: 88px 원형 하나 */}
            <S.FormField data-field="thumbnail">
              <S.FormLabel htmlFor="thumbnail-upload">대표 이미지</S.FormLabel>
              <div className="thumbnail-right">
                <label
                  className="thumbnail-circle"
                  htmlFor="thumbnail-upload"
                  data-has-image={!!thumbnailPreview}
                >
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="대표 이미지 미리보기" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  )}
                </label>
                {thumbnailUploading && (
                  <span style={{ fontSize: 13, color: '#64748b' }}>업로드 중…</span>
                )}
                <S.FileInput
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  disabled={thumbnailUploading}
                />
              </div>
              {thumbnailUploadError && (
                <S.ErrorMessage style={{ marginTop: '8px' }}>
                  {thumbnailUploadError}
                </S.ErrorMessage>
              )}
              <input type="hidden" {...register('thumbnailUrl')} />
            </S.FormField>

            <div className="name-group">
              <S.FormRow>
                <S.FormField className="name-group-field">
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

                <S.FormField className="name-group-field">
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

              {/* 국가명 유래 */}
              <S.FormField className="name-group-field">
                <S.FormLabel htmlFor="nameOrigin">국가명 유래</S.FormLabel>
                <S.Input
                  as="textarea"
                  id="nameOrigin"
                  rows={3}
                  placeholder="국가명의 어원·명칭 유래를 입력해주세요"
                  {...register('nameOrigin')}
                  $error={!!errors.nameOrigin}
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
                {errors.nameOrigin && (
                  <S.ErrorMessage>{errors.nameOrigin.message}</S.ErrorMessage>
                )}
              </S.FormField>
            </div>
            </div>

            {/* 모달 연결·후임 탭에서만: 섹션 헤더 표시 */}
            {embedIn === 'modal' && modalTab === 'connection' && (
              <S.FormSectionHeader>
                <S.FormSectionIcon>
                  <FiGlobe size={20} />
                </S.FormSectionIcon>
                <div>
                  <S.FormSectionTitle>연결 · 후임</S.FormSectionTitle>
                  <S.FormSectionDescription>
                    현대 국가 연결, 후임 국가, 변천 유형을 입력하세요
                  </S.FormSectionDescription>
                </div>
              </S.FormSectionHeader>
            )}

            <S.FormRow>
              {/* 기본 탭: 국가 형태·정치체 성격 (같은 성격) / 연결 탭: 연결 현대국가, 후임, 변천 */}
              <div
                className="state-type-group"
                style={{ display: embedIn === 'modal' && modalTab === 'connection' ? 'none' : 'block', width: '100%' }}
              >
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
                    {selectedEntityKind === 'REGIME' && (
                      <div style={{ fontSize: '12px', color: '#7c2d12', marginTop: '6px', background: '#fef3c7', padding: '8px 10px', borderRadius: 8 }}>
                        💡 정권·군정인 경우 국가 형태에 <strong>막부</strong>를 선택하는 것을 권장합니다.
                      </div>
                    )}
                    {errors.stateType && (
                      <S.ErrorMessage>{errors.stateType.message}</S.ErrorMessage>
                    )}
                  </S.FormField>
                  <S.FormField>
                    <S.FormLabel htmlFor="entityKind">정치체 성격 (선택)</S.FormLabel>
                    <S.Select
                      id="entityKind"
                      {...register('entityKind')}
                      $error={!!errors.entityKind}
                    >
                      <option value="">미지정 (과거 주권 국가로 간주)</option>
                      {ENTITY_KIND_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </S.Select>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      막부·메이지 시대 등은 정권/시대를 선택하세요
                    </div>
                  </S.FormField>
                </div>
              <div style={{ display: embedIn === 'modal' && modalTab === 'basic' ? 'none' : 'contents' }}>
              {/* 연결된 현대 국가 (다중 선택 지원) */}
              <S.FormField>
                <S.FormLabel htmlFor="parentModernCountryIds">
                  연결된 현대 국가 (선택, 여러 개 가능)
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

              {/* 후임 국가: 이 국가가 끝나고 어떤 국가로 이어졌는지. 예: 고려 → 조선 */}
              {historicalCountries.length > 0 && (
                <>
                  <S.FormField>
                    <S.FormLabel htmlFor="parentHistoricalCountryIds">
                      후임 국가
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
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                        변천 날짜는 후임 국가의 존속 시작 시점을 참조합니다.
                      </div>
                      <S.FormLabel style={{ marginTop: 12 }}>전환 성격 (선택)</S.FormLabel>
                      <select
                        value={transitionScope}
                        onChange={(e) =>
                          setTransitionScope(e.target.value as 'STATE_SUCCESSION' | 'REGIME_CHANGE' | '')
                        }
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 12,
                          fontSize: 14,
                          color: '#111827',
                          background: '#fff',
                          marginTop: 6,
                        }}
                      >
                        <option value="">미지정</option>
                        <option value="STATE_SUCCESSION">국가 계승 (신라→고려 등 주권 단위 변경)</option>
                        <option value="REGIME_CHANGE">정권 교체 (무로마치→에도 등 같은 나라 안 정권 변경)</option>
                      </select>
                    </S.FormField>
                  )}
                </>
              )}
              </div>
            </S.FormRow>

            {/* 존속 기간 — 기본 탭에서만, 기본 정보·추가 정보와 동일한 섹션 구조 */}
            <div style={{ display: embedIn === 'modal' && modalTab === 'connection' ? 'none' : 'block' }}>
            <S.FormSection>
              <S.FormSectionHeader>
                <S.FormSectionIcon>
                  <FiCalendar size={20} />
                </S.FormSectionIcon>
                <div>
                  <S.FormSectionTitle>존속 기간</S.FormSectionTitle>
                  <S.FormSectionDescription>
                    국가의 시작과 종료 시점을 입력하세요 (선택사항)
                  </S.FormSectionDescription>
                </div>
              </S.FormSectionHeader>
              <FieldRow>
                <FieldLabel>시작 · 종료</FieldLabel>
                <FieldControl $variant="datePair">
                  <DateFieldsRow>
                    <DateFieldBtn
                      type="button"
                      $hasValue={formatStartDateDisplay() !== '선택'}
                      onClick={() => setShowStartEraModal(true)}
                    >
                      <FiCalendar size={18} />
                      <span>{formatStartDateDisplay()}</span>
                      <FiChevronDown size={16} />
                    </DateFieldBtn>
                    <DateFieldBtn
                      type="button"
                      $hasValue={formatEndDateDisplay() !== '선택'}
                      onClick={() => setShowEndEraModal(true)}
                    >
                      <FiCalendar size={18} />
                      <span>{formatEndDateDisplay()}</span>
                      <FiChevronDown size={16} />
                    </DateFieldBtn>
                  </DateFieldsRow>
                </FieldControl>
              </FieldRow>
            </S.FormSection>
            </div>

          {/* 추가 정보 — 연결·후임 탭에서만 표시 */}
          <div style={{ display: embedIn === 'modal' && modalTab === 'basic' ? 'none' : 'block' }}>
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
          </div>

          </S.FormSection>
    </>
  )

  const formContent =
    embedIn === 'modal' ? (
      <S.Form id="historical-country-form" onSubmit={handleSubmit(onSubmit)}>
        <FormSectionInner>
          <TabNavigation>
            <TabButton
              type="button"
              $active={modalTab === 'basic'}
              onClick={() => setModalTab('basic')}
            >
              <FiInfo size={16} />
              기본 정보
            </TabButton>
            <TabButton
              type="button"
              $active={modalTab === 'connection'}
              onClick={() => setModalTab('connection')}
            >
              <FiGlobe size={16} />
              연결 · 후임
            </TabButton>
          </TabNavigation>
          <ModalFormLayoutWrap data-inner>
            {formBody}
          </ModalFormLayoutWrap>
        </FormSectionInner>
      </S.Form>
    ) : (
      <S.Form id="historical-country-form" onSubmit={handleSubmit(onSubmit)}>
        {formBody}
      </S.Form>
    )

  return (
    <>
      {embedIn === 'modal' ? (
        <ModalFormLayoutWrap>
          <FormHeader style={{ justifyContent: 'flex-end' }}>
            <SubmitButton
              type="submit"
              form="historical-country-form"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting
                ? '처리중...'
                : editing.id
                  ? '수정 완료'
                  : '국가 등록'}
            </SubmitButton>
          </FormHeader>
          {formContent}
        </ModalFormLayoutWrap>
      ) : (
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
        {formContent}
      </FormSidePanel>
      )}

      {/* ==================== 국가 형태 선택 모달 ==================== */}
      {showStateTypeModal
        ? createPortal(
            <>
              <S.SelectModalOverlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  setShowStateTypeModal(false)
                  setStateTypeSearch('')
                }}
              />
              <S.SelectModal
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{
                  transform: 'translate(-50%, -50%)',
                  height: 'min(520px, 85vh)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <S.SelectModalHeader>
                  <S.SelectModalTitle>국가 형태 선택</S.SelectModalTitle>
                  <S.SelectModalClose
                    onClick={() => {
                      setShowStateTypeModal(false)
                      setStateTypeSearch('')
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectModalClose>
                </S.SelectModalHeader>
                <S.ModalSearchWrap>
                  <FiSearch size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <S.ModalSearchInput
                    type="text"
                    placeholder="형태 검색 (예: 왕국, 제국)"
                    value={stateTypeSearch}
                    onChange={(e) => setStateTypeSearch(e.target.value)}
                  />
                </S.ModalSearchWrap>
                <S.SelectModalContent style={{ maxHeight: 320, flex: '1 1 0', minHeight: 0 }}>
                  {filteredStateTypeOptions.map((option) => (
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
                          minWidth: 0,
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
                  {filteredStateTypeOptions.length === 0 && (
                    <S.EmptyState style={{ padding: '24px 16px' }}>
                      <span style={{ color: '#9ca3af', fontSize: 14 }}>
                        검색 결과가 없습니다.
                      </span>
                    </S.EmptyState>
                  )}
                </S.SelectModalContent>
              </S.SelectModal>
            </>,
            document.body,
          )
        : null}

      {/* 연결된 현대 국가 선택: 공용 모달 (현대 국가만 표시, 다중 선택) */}
      <CountrySearchModal
        isOpen={showModernCountryModal}
        onClose={() => setShowModernCountryModal(false)}
        title="연결된 현대 국가 선택 (여러 개 선택 가능)"
        modernCountries={modernCountries.map((c) => ({ id: c.id, name: c.name }))}
        historicalCountries={[]}
        modernOnly
        selectedCountryIds={selectedModernCountries}
        onSelectMultiple={(countries) =>
          setSelectedModernCountries(countries.map((c) => c.id))
        }
        placeholder="국가명으로 검색..."
      />

      {/* 후임 국가 선택: 공용 모달 (역사적 국가만 표시, 다중 선택) */}
      <CountrySearchModal
        isOpen={showParentHistoricalModal}
        onClose={() => setShowParentHistoricalModal(false)}
        title="후임 국가 선택 (이 국가가 이어져 간 나라)"
        modernCountries={[]}
        historicalCountries={historicalCountries.map((c) => ({
          id: c.id,
          name: c.name,
        }))}
        historicalOnly
        selectedCountryIds={selectedParentHistoricalIds}
        onSelectMultiple={(countries) =>
          setSelectedParentHistoricalIds(countries.map((c) => c.id))
        }
        placeholder="국가명으로 검색..."
      />

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
                <S.SelectModalFooter style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      placeholder="년"
                      value={startModalYMD.y}
                      onChange={(e) => setStartModalYMD((prev) => ({ ...prev, y: e.target.value }))}
                      style={{ width: 72, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', fontSize: 14 }}
                    />
                    <input
                      type="number"
                      placeholder="월"
                      min={1}
                      max={12}
                      value={startModalYMD.m}
                      onChange={(e) => setStartModalYMD((prev) => ({ ...prev, m: e.target.value }))}
                      style={{ width: 56, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', fontSize: 14 }}
                    />
                    <input
                      type="number"
                      placeholder="일"
                      min={1}
                      max={31}
                      value={startModalYMD.d}
                      onChange={(e) => setStartModalYMD((prev) => ({ ...prev, d: e.target.value }))}
                      style={{ width: 56, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', fontSize: 14 }}
                    />
                  </div>
                  <S.SelectModalFooterButton type="button" onClick={handleStartDateApply}>
                    적용
                  </S.SelectModalFooterButton>
                </S.SelectModalFooter>
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
                <S.SelectModalFooter style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      placeholder="년"
                      value={endModalYMD.y}
                      onChange={(e) => setEndModalYMD((prev) => ({ ...prev, y: e.target.value }))}
                      style={{ width: 72, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', fontSize: 14 }}
                    />
                    <input
                      type="number"
                      placeholder="월"
                      min={1}
                      max={12}
                      value={endModalYMD.m}
                      onChange={(e) => setEndModalYMD((prev) => ({ ...prev, m: e.target.value }))}
                      style={{ width: 56, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', fontSize: 14 }}
                    />
                    <input
                      type="number"
                      placeholder="일"
                      min={1}
                      max={31}
                      value={endModalYMD.d}
                      onChange={(e) => setEndModalYMD((prev) => ({ ...prev, d: e.target.value }))}
                      style={{ width: 56, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center', fontSize: 14 }}
                    />
                  </div>
                  <S.SelectModalFooterButton type="button" onClick={handleEndDateApply}>
                    적용
                  </S.SelectModalFooterButton>
                </S.SelectModalFooter>
              </S.SelectModal>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
