import React, { useMemo, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { FiCalendar, FiChevronDown, FiGlobe, FiInfo, FiSearch } from 'react-icons/fi'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import styled, { useTheme } from 'styled-components'
import { FormSidePanel } from '@/shared/ui/form-side-panel/form-side-panel'
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
import type {
  HistoricalCountry,
  Era,
  HistoricalEntityKind,
} from '@/entities/historical-country/api'
import type { HistoricalStateType } from '@/shared/api/historical-countries'
import { useHistoricalCountry } from '@/features/historical-country/use-historical-countries.hook'
import { useFormDraft } from '@/shared/lib/use-form-draft'
import type { TransitionEventType } from '@/shared/api/historical-countries'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import { FormInput } from '@/shared/ui/form-input/form-input'
import { SelectionChips } from '@/shared/ui/selection-chips/selection-chips'
import { TextareaWithCounterWrap } from '@/shared/ui/textarea-with-counter/textarea-with-counter'
import { ThumbnailUploader } from '@/shared/ui/thumbnail-uploader/thumbnail-uploader'
import * as S from '@/widgets/country/country-form/ui/country-form.styles'
import { EraDateModal } from './era-date-modal'

/** 모달: 인물 등록 모달(PersonRegisterView)과 동일 — FormSectionInner 기본 패딩(28px 32px 32px) 유지, FormHeader 24px 28px */
const ModalFormLayoutWrap = styled.div`
  padding: 0;
  &[data-inner] {
    padding: 0;
  }
  /* 국가 등록 버튼: 하단 border 제거, 탭 메뉴와 간격 축소 */
  ${FormHeader} {
    padding: 12px 28px 8px;
    border-bottom: none;
  }
  ${FormSectionInner} {
    padding-top: 16px;
  }
  ${TabNavigation} {
    margin-bottom: 24px;
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
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
  /* 중첩 섹션(존속 기간, 추가 정보): 여백만 적용 — 상단 border 제거(위 필드 그룹 border와 이중선 방지) */
  ${S.FormSection} ${S.FormSection} {
    margin-top: 28px;
    padding-top: 32px;
    border-top: none;
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
    color: ${({ theme }) => theme.colors.text.primary};
    margin: 0 0 4px 0;
  }
  ${S.FormSectionDescription} {
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.secondary};
    margin: 0;
  }
  ${S.FormRow} {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    border: none;
  }
  /* 인물 등록 FieldRow와 동일: 360px 1fr, 20px 0 */
  ${S.FormField} {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 24px;
    align-items: start;
    padding: 20px 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
  @media (max-width: 768px) {
    ${S.FormField} {
      grid-template-columns: 1fr;
    }
  }
  ${S.FormLabel} {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
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
    color: ${({ theme }) => theme.colors.alert.danger.fg};
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
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
  /* 국가 형태·정치체 성격: 같은 성격 필드끼리 그룹, 행 사이 보더 없음 */
  .state-type-group ${S.FormField} {
    border-bottom: none;
  }
  .state-type-group {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
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
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
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
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }
  /* 대표 이미지: 카드형 업로드 영역 — 원형 프리뷰 + 안내 문구 */
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle {
    width: 96px;
    height: 96px;
    min-width: 96px;
    min-height: 96px;
    max-width: 96px;
    max-height: 96px;
    border-radius: 50%;
    overflow: hidden;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)'};
    border: 2px dashed ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#cbd5e1'};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle:hover {
    border-color: #6366f1;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.1)'
        : 'linear-gradient(145deg, #eef2ff 0%, #e0e7ff 100%)'};
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle[data-has-image] {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
    border-color: ${({ theme }) => theme.colors.border.default};
    border-style: solid;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle[data-has-image]:hover {
    border-color: #6366f1;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.12);
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle svg {
    color: ${({ theme }) => theme.colors.text.secondary};
    width: 36px;
    height: 36px;
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-hint {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    line-height: 1.4;
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
  /* 존속 기간 DateDetailRow: 너비·정렬만 오버라이드 (색상은 공용 Input에서 처리) */
  ${S.DateDetailRow} input[type='number'],
  ${S.DateDetailRow} ${FormInput} {
    width: 72px;
    min-width: 72px;
    text-align: center;
    box-sizing: border-box;
  }
  ${S.DateDetailRow} input[type='number']:focus,
  ${S.DateDetailRow} ${FormInput}:focus {
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
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 12px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ${DateFieldBtn}:hover {
    border-color: #4f46e5;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.1)' : '#faf5ff'};
  }
  ${DateFieldBtn}:focus-visible {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  /* 인물 등록 RFL Input과 동일: 테두리, 12px radius, 포커스 인디고 */
  /* S.Input은 공용 register-form-layout Input을 re-export하므로 별도 오버라이드 불필요 */
  /* SelectButton */
  ${S.SelectButton} {
    padding: 10px 14px;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 12px;
    max-width: 380px;
  }
  ${S.SelectButton}:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
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
 * 변천 유형 카테고리화 — 셀렉트에 optgroup으로 표시.
 * - 국가 차원: 새 국가가 탄생/소멸하는 변환
 * - 정권 차원: 같은 영토에서 정권만 교체
 * - 기타: 분류가 모호한 경우
 */
const TRANSITION_EVENT_GROUPS: Array<{
  label: string
  hint: string
  defaultScope: 'STATE_SUCCESSION' | 'REGIME_CHANGE' | ''
  items: TransitionEventType[]
}> = [
  {
    label: '국가 차원 (주권 단위 변경)',
    hint: '예: 신라 → 고려, 조선 → 대한민국',
    defaultScope: 'STATE_SUCCESSION',
    items: [
      'FOUNDED',
      'INDEPENDENCE',
      'UNIFICATION',
      'UNION',
      'SUCCESSION',
      'SPLIT',
      'CONQUEST',
    ],
  },
  {
    label: '정권 차원 (영토는 그대로, 정권만 교체)',
    hint: '예: 무로마치 막부 → 에도 막부',
    defaultScope: 'REGIME_CHANGE',
    items: ['SECULARIZATION'],
  },
  {
    label: '기타',
    hint: '',
    defaultScope: '',
    items: ['TREATY', 'DISSOLVED', 'OTHER'],
  },
]

/**
 * 역사적 국가 Form 스키마
 */
const historicalCountrySchema = z.object({
  name: z.string().min(1, '국가명(한글)을 입력해주세요'),
  enName: z.string().optional(),
  nameOrigin: z.string().optional(),
  description: z.string().optional(),
  history: z.string().optional(),
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
  /** RHF dirty 상태 변경 콜백 — 모달 close 가드 */
  onDirtyChange?: (isDirty: boolean) => void
  /** RHF 값 변경 콜백 — 모달 헤더 인디케이터 갱신 */
  onValuesChange?: (values: Partial<HistoricalCountryFormData>) => void
}

/**
 * 역사적 국가 Form 컴포넌트
 */
// 국가 형태 옵션 (라벨 + 설명만, 이모지 없음)
interface StateTypeOption {
  value: string
  label: string
  desc: string
  category: 'monarchy' | 'republic' | 'regime' | 'tribal' | 'other'
}

const STATE_TYPE_OPTIONS: StateTypeOption[] = [
  // ─ 군주제·제국
  { value: 'EMPIRE', label: '제국', desc: '황제가 통치하는 국가', category: 'monarchy' },
  { value: 'KINGDOM', label: '왕국', desc: '왕이 통치하는 국가', category: 'monarchy' },
  { value: 'DYNASTY', label: '왕조', desc: '세습적 왕가가 통치하는 국가', category: 'monarchy' },
  { value: 'PRINCIPALITY', label: '공국', desc: '공작이 통치하는 국가', category: 'monarchy' },
  { value: 'ELECTORATE', label: '선제후국', desc: '황제 선출권을 가진 제후의 영토', category: 'monarchy' },
  { value: 'MARGRAVIATE', label: '변경백령', desc: '변경백이 다스리는 변경 지대의 영토', category: 'monarchy' },
  { value: 'CALIPHATE', label: '칼리프국', desc: '이슬람 지도자가 통치하는 국가', category: 'monarchy' },
  { value: 'SULTANATE', label: '술탄국', desc: '술탄이 통치하는 국가', category: 'monarchy' },
  { value: 'PERSONAL_UNION', label: '동군연합', desc: '같은 군주 아래 여러 정치체가 연합', category: 'monarchy' },
  // ─ 공화제·연방
  { value: 'REPUBLIC', label: '공화국', desc: '선출된 대표가 통치하는 국가', category: 'republic' },
  { value: 'FEDERATION', label: '연방', desc: '여러 국가의 연합체', category: 'republic' },
  { value: 'CONFEDERATION', label: '연합', desc: '느슨한 형태의 국가 연합', category: 'republic' },
  { value: 'CITY_STATE', label: '도시국가', desc: '독립적인 도시 형태의 국가', category: 'republic' },
  { value: 'THEOCRACY', label: '신정 국가', desc: '종교 지도자가 통치하는 국가', category: 'republic' },
  // ─ 정권·세습 (영토는 동일, 통치체만 변경)
  { value: 'SHOGUNATE', label: '막부', desc: '쇼군이 실권을 가진 군정 (무로마치·에도 막부 등)', category: 'regime' },
  { value: 'HEREDITARY', label: '세습', desc: '세습적 통치가 이어지는 정치체', category: 'regime' },
  // ─ 부족·유목
  { value: 'KHANATE', label: '칸국', desc: '칸이 통치하는 유목 국가', category: 'tribal' },
  { value: 'NOMADIC_EMPIRE', label: '유목 제국', desc: '유목민이 세운 제국', category: 'tribal' },
  { value: 'TRIBAL_STATE', label: '부족 국가/연합', desc: '부족 또는 부족 연맹', category: 'tribal' },
  // ─ 기타
  { value: 'OTHER', label: '기타', desc: '기타 국가 형태', category: 'other' },
]

const STATE_TYPE_CATEGORIES: { key: StateTypeOption['category']; label: string }[] =
  [
    { key: 'monarchy', label: '👑 군주제·제국' },
    { key: 'republic', label: '🏛 공화제·연방' },
    { key: 'regime', label: '⚔️ 정권·군정' },
    { key: 'tribal', label: '🐎 부족·유목' },
    { key: 'other', label: '⚙️ 기타' },
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
  onDirtyChange,
  onValuesChange,
}: HistoricalCountryFormProps) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  /** 인라인 셀렉트 스타일 (변천 유형·전환 성격 등 native select 통일) */
  const inlineSelectStyle = {
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
    borderRadius: 12,
    fontSize: 14,
    color: isDark ? '#f1f5f9' : '#111827',
    background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
  } as const

  // ==================== 상태 관리 ====================

  /** 썸네일 이미지 미리보기 URL (ThumbnailUploader가 업로드·진행률·삭제 모두 처리) */
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')

  /** 국가 형태 선택 모달 표시 여부 */
  const [showStateTypeModal, setShowStateTypeModal] = useState(false)

  /** 현대 국가 선택 모달 표시 여부 */
  const [showModernCountryModal, setShowModernCountryModal] = useState(false)

  /** 후임 국가 선택 모달 표시 여부 */
  const [showParentHistoricalModal, setShowParentHistoricalModal] = useState(false)

  /** 국가 형태 모달 내 검색어 */
  const [stateTypeSearch, setStateTypeSearch] = useState('')

  /** 시작 시점 선택 모달 표시 여부 (BC/AD + 년·월·일은 EraDateModal에서 함께 입력) */
  const [showStartEraModal, setShowStartEraModal] = useState(false)
  /** 종료 시점 선택 모달 표시 여부 */
  const [showEndEraModal, setShowEndEraModal] = useState(false)

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
    formState: { errors, isValid, isSubmitting, isDirty },
    reset,
    setValue,
    watch,
    getValues,
  } = useForm<HistoricalCountryFormData>({
    resolver: zodResolver(historicalCountrySchema),
    mode: 'onTouched', // 한번 만진 필드만 검증 (첫 진입부터 빨간색 방지)
    reValidateMode: 'onChange',
    criteriaMode: 'all',
  })

  // dirty 변경 → 외부 모달의 close 가드에 알림
  const onDirtyChangeRef = useRef(onDirtyChange)
  onDirtyChangeRef.current = onDirtyChange
  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty)
  }, [isDirty])

  // 값 변경 → 외부 모달 헤더 인디케이터 갱신
  const onValuesChangeRef = useRef(onValuesChange)
  onValuesChangeRef.current = onValuesChange
  useEffect(() => {
    if (!onValuesChangeRef.current) return
    const sub = watch((values) => {
      onValuesChangeRef.current?.(values as Partial<HistoricalCountryFormData>)
    })
    return () => sub.unsubscribe()
  }, [watch])

  // create 모드 자동 저장 (localStorage draft)
  const watchedAll = watch()
  const isCreateMode = !editing?.id
  const { clear: clearDraft } = useFormDraft({
    key: 'historical-country-create',
    enabled: isCreateMode,
    values: watchedAll,
    onRestore: (data) => {
      reset(data)
      if (data.thumbnailUrl) setThumbnailPreview(data.thumbnailUrl)
    },
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
          transitionScope?: 'STATE_SUCCESSION' | 'REGIME_CHANGE' | null
        }
        const parentIds = raw?.parentModernCountryIds ?? []
        const parentHistIds = raw?.parentHistoricalCountryIds ?? []
        const num = (v: number | null | undefined) =>
          v !== null && v !== undefined ? v : undefined
        reset({
          name: (raw?.name ?? editing.name) || '',
          enName: (raw?.enName ?? editing.enName) || '',
          nameOrigin: (raw?.nameOrigin ?? editing.nameOrigin) || '',
          description: (raw?.description ?? editing.description) || '',
          history: (raw?.history ?? editing.history) || '',
          thumbnailUrl: (raw?.thumbnailUrl ?? editing.thumbnailUrl) || '',
          startEra: raw?.startEra ?? undefined,
          startYear: num(raw?.startYear),
          startMonth: num(raw?.startMonth),
          startDay: num(raw?.startDay),
          endEra: raw?.endEra ?? undefined,
          endYear: num(raw?.endYear),
          endMonth: num(raw?.endMonth),
          endDay: num(raw?.endDay),
          stateType: (raw?.stateType ?? editing.stateType) || '',
          entityKind: (raw?.entityKind ?? editing.entityKind) ?? undefined,
          parentModernCountryIds: parentIds,
          parentHistoricalCountryIds: parentHistIds,
        })
        setThumbnailPreview((raw?.thumbnailUrl ?? editing.thumbnailUrl) || '')
        setSelectedModernCountries(parentIds)
        setSelectedParentHistoricalIds(parentHistIds)
        setTransitionEventType(raw?.transitionEventType ?? 'SUCCESSION')
        setTransitionScope(raw?.transitionScope ?? '')
      } else {
        // 생성 모드: 빈 값으로 초기화 (막부 등록 시 initialPreset으로 국가 형태·정치체 성격 미리 채움)
        reset({
          name: '',
          enName: '',
          nameOrigin: '',
          description: '',
          history: '',
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
    }
  }, [editing, formSource, reset, initialPreset])

  // ==================== 이벤트 핸들러 ====================

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
      history: data.history || null,
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
      stateType: data.stateType as HistoricalStateType,
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
    clearDraft()
    reset()
    setThumbnailPreview('')
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

  /** 모달 탭: 기본(이름·국가형태·존속) / 연결(현대국가·후임·변천) / 서술(설명·역사) */
  const [modalTab, setModalTab] = useState<
    'basic' | 'connection' | 'narrative'
  >('basic')

  /**
   * 국가 형태 선택 버튼 라벨 생성
   */
  const getStateTypeLabel = () => {
    const option = STATE_TYPE_OPTIONS.find(
      (opt) => opt.value === selectedStateType,
    )
    return option ? option.label : '선택하세요'
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

  // 모달 모드에선 탭별 표시. 사이드패널 모드(embedIn='panel')에선 모두 표시.
  const showOnBasic = embedIn !== 'modal' || modalTab === 'basic'
  const showOnConnection = embedIn !== 'modal' || modalTab === 'connection'
  const showOnNarrative = embedIn !== 'modal' || modalTab === 'narrative'

  const formBody = (
    <>
          {/* 기본 정보 */}
          <S.FormSection>
            {/* 모달 기본 탭에서만: 기본 정보 헤더·썸네일·이름·국가형태·존속기간 표시 */}
            <div style={{ display: showOnBasic ? 'block' : 'none' }}>
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

            {/* 대표 이미지 (국기·상징 등) */}
            <S.FormField data-field="thumbnail">
              <S.FormLabel htmlFor="thumbnail-upload">대표 이미지</S.FormLabel>
              <ThumbnailUploader
                value={thumbnailPreview}
                category="countries"
                inputId="thumbnail-upload"
                alt="역사적 국가 대표 이미지 미리보기"
                emptyHint="국기·상징 이미지를 추가 (선택)"
                hasImageHint="클릭 또는 드래그하여 이미지 변경"
                onChange={(url) => {
                  setThumbnailPreview(url)
                  setValue('thumbnailUrl', url, { shouldValidate: true })
                }}
              />
              <input type="hidden" {...register('thumbnailUrl')} />
            </S.FormField>

            <div className="name-group">
              <S.FormRow>
                <S.FormField className="name-group-field">
                  <S.FormLabel htmlFor="name">
                    국가명 (한글) <S.RequiredStar>*</S.RequiredStar>
                  </S.FormLabel>
                  <FormInput
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
                  <FormInput
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
                <FormInput
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

            {/* 모달 연결·후임 탭 전용 섹션 헤더 */}
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
                style={{
                  display: showOnBasic ? 'block' : 'none',
                  width: '100%',
                }}
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
                      <AlertBox variant="warning" icon="💡">
                        정권·군정인 경우 국가 형태에 <strong>막부</strong>를
                        선택하는 것을 권장합니다.
                      </AlertBox>
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
                    <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#6b7280', marginTop: '4px' }}>
                      막부·메이지 시대 등은 정권/시대를 선택하세요
                    </div>
                  </S.FormField>
                </div>
              <div style={{ display: showOnConnection ? 'contents' : 'none' }}>
              {/* 연결된 현대 국가 (다중 선택 지원) — chip 표시 + 추가 버튼 */}
              <S.FormField>
                <S.FormLabel htmlFor="parentModernCountryIds">
                  연결된 현대 국가 (권장, 여러 개 가능)
                </S.FormLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SelectionChips
                    items={modernCountries
                      .filter((c) => selectedModernCountries.includes(c.id))
                      .map((c) => ({ id: c.id, label: c.name }))}
                    onRemove={(id) =>
                      setSelectedModernCountries((prev) =>
                        prev.filter((x) => x !== id),
                      )
                    }
                    addLabel={
                      selectedModernCountries.length === 0
                        ? '국가 선택'
                        : '추가'
                    }
                    onAdd={() => setShowModernCountryModal(true)}
                  />
                  {selectedModernCountries.length === 0 && (
                    <AlertBox variant="warning" icon="⚠️">
                      미연결 시 이 역사국가에 등록된 인물의 임기·내각이 현대
                      국가 행정조직 뷰(국가 → 행정부)에서 보이지 않을 수
                      있습니다.
                    </AlertBox>
                  )}
                </div>
              </S.FormField>

              {/* 후임 국가: 이 국가가 끝나고 어떤 국가로 이어졌는지. 예: 고려 → 조선 */}
              {historicalCountries.length > 0 && (
                <>
                  <S.FormField>
                    <S.FormLabel htmlFor="parentHistoricalCountryIds">
                      후임 국가
                    </S.FormLabel>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <SelectionChips
                        items={historicalCountries
                          .filter((c) =>
                            selectedParentHistoricalIds.includes(c.id),
                          )
                          .map((c) => ({
                            id: c.id,
                            label: c.name,
                            icon: '📜',
                          }))}
                        onRemove={(id) =>
                          setSelectedParentHistoricalIds((prev) =>
                            prev.filter((x) => x !== id),
                          )
                        }
                        addLabel={
                          selectedParentHistoricalIds.length === 0
                            ? '후임 국가 선택'
                            : '추가'
                        }
                        onAdd={() => setShowParentHistoricalModal(true)}
                      />
                      <div
                        style={{
                          fontSize: '12px',
                          color: isDark ? '#94a3b8' : '#6b7280',
                        }}
                      >
                        이 국가가 어떤 국가로 이어졌는지. 예: 고려 → 조선
                      </div>
                    </div>
                  </S.FormField>
                  {selectedParentHistoricalIds.length > 0 && (
                    <S.FormField>
                      <S.FormLabel>변천 유형</S.FormLabel>
                      <select
                        value={transitionEventType}
                        onChange={(e) => {
                          const next = e.target.value as TransitionEventType
                          setTransitionEventType(next)
                          // 변천 유형 변경 시 전환 성격 자동 추론 (사용자가 명시 안 한 경우)
                          const group = TRANSITION_EVENT_GROUPS.find((g) =>
                            g.items.includes(next),
                          )
                          if (group) setTransitionScope(group.defaultScope)
                        }}
                        style={inlineSelectStyle}
                      >
                        {TRANSITION_EVENT_GROUPS.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.items.map((k) => (
                              <option key={k} value={k}>
                                {TRANSITION_EVENT_LABELS[k]}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <div
                        style={{
                          fontSize: '12px',
                          color: isDark ? '#94a3b8' : '#6b7280',
                          marginTop: '6px',
                        }}
                      >
                        {(() => {
                          const group = TRANSITION_EVENT_GROUPS.find((g) =>
                            g.items.includes(transitionEventType),
                          )
                          if (group?.hint) return group.hint
                          return '변천 날짜는 후임 국가의 존속 시작 시점을 참조합니다.'
                        })()}
                      </div>
                      {/* 전환 성격 — 자동 추론된 값을 미리 선택. 모호한 경우만 사용자가 덮어씀 */}
                      <S.FormLabel style={{ marginTop: 12 }}>
                        전환 성격
                      </S.FormLabel>
                      <select
                        value={transitionScope}
                        onChange={(e) =>
                          setTransitionScope(
                            e.target.value as
                              | 'STATE_SUCCESSION'
                              | 'REGIME_CHANGE'
                              | '',
                          )
                        }
                        style={{ ...inlineSelectStyle, marginTop: 6 }}
                      >
                        <option value="">자동 (변천 유형으로 추정)</option>
                        <option value="STATE_SUCCESSION">
                          국가 계승 — 주권 단위 변경
                        </option>
                        <option value="REGIME_CHANGE">
                          정권 교체 — 영토는 그대로
                        </option>
                      </select>
                    </S.FormField>
                  )}
                </>
              )}
              </div>
            </S.FormRow>

            {/* 존속 기간 — 기본 탭에서만, 기본 정보·추가 정보와 동일한 섹션 구조 */}
            <div style={{ display: showOnBasic ? 'block' : 'none' }}>
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

          {/* 서술 (설명·역사) — 모달의 '서술' 탭 / 사이드패널 모두에서 표시 */}
          <div style={{ display: showOnNarrative ? 'block' : 'none' }}>
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
              <TextareaWithCounterWrap
                length={(watch('description') ?? '').length}
                max={1000}
              >
                <FormInput
                  as="textarea"
                  id="description"
                  rows={4}
                  placeholder="역사적 국가에 대한 설명을 입력해주세요"
                  {...register('description')}
                  $error={!!errors.description}
                  style={{ minHeight: '100px', resize: 'vertical' }}
                />
              </TextareaWithCounterWrap>
              {errors.description && (
                <S.ErrorMessage>{errors.description.message}</S.ErrorMessage>
              )}
            </S.FormField>

            {/* 역사 서술 */}
            <S.FormField>
              <S.FormLabel htmlFor="history">역사</S.FormLabel>
              <TextareaWithCounterWrap
                length={(watch('history') ?? '').length}
                max={10000}
              >
                <FormInput
                  as="textarea"
                  id="history"
                  rows={8}
                  placeholder="역사적 국가의 역사를 자유롭게 서술해주세요 (마크다운 지원)"
                  {...register('history')}
                  $error={!!errors.history}
                  style={{ minHeight: '180px', resize: 'vertical' }}
                />
              </TextareaWithCounterWrap>
              {errors.history && (
                <S.ErrorMessage>{errors.history.message}</S.ErrorMessage>
              )}
            </S.FormField>
          </S.FormSection>
          </div>

          </S.FormSection>
    </>
  )

  const formContent =
    embedIn === 'modal' ? (
      <S.Form
        id="historical-country-form"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
        noValidate
      >
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
            <TabButton
              type="button"
              $active={modalTab === 'narrative'}
              onClick={() => setModalTab('narrative')}
            >
              <FiInfo size={16} />
              서술
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
        // 모달 모드: Shell이 헤더·푸터를 담당하므로 폼 본문만 렌더
        formContent
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
                  {STATE_TYPE_CATEGORIES.map((cat) => {
                    const items = filteredStateTypeOptions.filter(
                      (o) => o.category === cat.key,
                    )
                    if (items.length === 0) return null
                    return (
                      <div key={cat.key} style={{ marginBottom: 6 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isDark ? '#94a3b8' : '#6b7280',
                            padding: '8px 16px 4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {cat.label}
                        </div>
                        {items.map((option) => (
                          <S.SelectOption
                            key={option.value}
                            $active={selectedStateType === option.value}
                            onClick={() => handleStateTypeSelect(option.value)}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <S.SelectOptionText>
                                {option.label}
                              </S.SelectOptionText>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: isDark ? '#94a3b8' : '#6b7280',
                                  lineHeight: 1.4,
                                }}
                              >
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
                      </div>
                    )
                  })}
                  {filteredStateTypeOptions.length === 0 && (
                    <S.EmptyState style={{ padding: '24px 16px' }}>
                      <span style={{ color: isDark ? '#64748b' : '#9ca3af', fontSize: 14 }}>
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

      {/* 시작 시점 선택 모달 (BC/AD + Y·M·D) */}
      <EraDateModal
        open={showStartEraModal}
        title="시작 시점 선택"
        initial={{
          era: getValues('startEra'),
          year: getValues('startYear'),
          month: getValues('startMonth'),
          day: getValues('startDay'),
        }}
        onClose={() => setShowStartEraModal(false)}
        onApply={({ era, year, month, day }) => {
          if (era !== undefined)
            setValue('startEra', era, { shouldValidate: true, shouldDirty: true })
          if (year !== undefined)
            setValue('startYear', year, { shouldValidate: true, shouldDirty: true })
          if (month !== undefined)
            setValue('startMonth', month, { shouldValidate: true, shouldDirty: true })
          if (day !== undefined)
            setValue('startDay', day, { shouldValidate: true, shouldDirty: true })
        }}
      />

      {/* 종료 시점 선택 모달 */}
      <EraDateModal
        open={showEndEraModal}
        title="종료 시점 선택"
        initial={{
          era: getValues('endEra'),
          year: getValues('endYear'),
          month: getValues('endMonth'),
          day: getValues('endDay'),
        }}
        onClose={() => setShowEndEraModal(false)}
        onApply={({ era, year, month, day }) => {
          if (era !== undefined)
            setValue('endEra', era, { shouldValidate: true, shouldDirty: true })
          if (year !== undefined)
            setValue('endYear', year, { shouldValidate: true, shouldDirty: true })
          if (month !== undefined)
            setValue('endMonth', month, { shouldValidate: true, shouldDirty: true })
          if (day !== undefined)
            setValue('endDay', day, { shouldValidate: true, shouldDirty: true })
        }}
      />
    </>
  )
}
