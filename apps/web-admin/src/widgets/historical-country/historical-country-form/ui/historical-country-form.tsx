import React, { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import styled from 'styled-components'
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
import { FormInput, FormTextarea } from '@/shared/ui/form-input/form-input'
import { FormSelectNative } from '@/shared/ui/form-select-native/form-select-native'
import { RadioCardGroup } from '@/shared/ui/radio-card-group/radio-card-group'
import { SelectionChips } from '@/shared/ui/selection-chips/selection-chips'
import { TextareaWithCounterWrap } from '@/shared/ui/textarea-with-counter/textarea-with-counter'
import { ThumbnailUploader } from '@/shared/ui/thumbnail-uploader/thumbnail-uploader'
import * as S from '@/widgets/country/country-form/ui/country-form.styles'
import { EraDateInline } from './era-date-inline'
import { StateTypeModal } from './state-type-modal'

/** 모달 본문 레이아웃 — 미니멀 (탭 제거됨, 좌측 인덱스로 점프) */
const ModalFormLayoutWrap = styled.div`
  padding: 0;
  &[data-inner] {
    padding: 0;
  }
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
    margin-top: 40px;
  }
  ${S.FormSection} ${S.FormSection} {
    margin-top: 40px;
  }
  ${S.FormSectionHeader} {
    margin-bottom: 12px;
    padding: 0;
  }
  ${S.FormSectionIcon} {
    display: none;
  }
  ${S.FormSectionTitle} {
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
    margin: 0;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  ${S.FormSectionDescription} {
    display: none;
  }
  /* 필드: top-label */
  ${S.FormRow} {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 0;
    border: none;
  }
  @media (max-width: 640px) {
    ${S.FormRow} {
      grid-template-columns: 1fr;
    }
  }
  ${S.FormField} {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0;
    border: none;
    margin-top: 18px;
  }
  ${S.FormSection} > ${S.FormField}:first-of-type {
    margin-top: 0;
  }
  ${S.FormSection} > ${S.FormRow} {
    margin-top: 18px;
  }
  ${S.FormSection} > ${S.FormRow}:first-of-type {
    margin-top: 0;
  }
  ${S.FormLabel} {
    font-size: 13px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.secondary};
    padding-top: 0;
    margin: 0;
  }
  ${S.FormField} input:not([type='hidden']),
  ${S.FormField} button[type='button'],
  ${S.FormField} select,
  ${S.FormField} textarea {
    min-width: 0;
  }
  ${S.FormField} ${S.ErrorMessage} {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.alert.danger.fg};
    margin-top: 0;
  }
  ${S.SelectButton} {
    max-width: 100%;
  }
`

/** 시작/종료 시점을 한 줄에 — 좁으면 줄바꿈 */
const DateRange = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const RangeSep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 14px;
  padding: 0 2px;
`

/** 후임 국가 관계 미리보기: [현재] —[이벤트]→ [다음] */
const RelationPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 8px 0;
  font-size: 12.5px;
  flex-wrap: wrap;
`

const RelationNode = styled.span<{ $highlight?: boolean }>`
  font-weight: ${({ $highlight }) => ($highlight ? 500 : 400)};
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RelationArrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  .label {
    font-size: 11.5px;
    font-weight: 400;
  }
`

/** 존속 기간 자동 계산 결과 표시 (예: "약 725년 지속") */
const DurationHint = styled.div<{ $invalid?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  padding: 4px 0;
  color: ${({ $invalid, theme }) =>
    $invalid ? theme.colors.alert.danger.fg : theme.colors.text.tertiary};
  font-size: 12px;
  font-weight: 400;

  strong {
    font-weight: 600;
    color: ${({ $invalid, theme }) =>
      $invalid ? theme.colors.alert.danger.fg : theme.colors.text.primary};
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
.superRefine((data, ctx) => {
  // 시작 < 종료 시점 검증
  if (
    data.startEra &&
    data.startYear != null &&
    data.endEra &&
    data.endYear != null
  ) {
    const startAbs = data.startEra === 'BC' ? -data.startYear : data.startYear
    const endAbs = data.endEra === 'BC' ? -data.endYear : data.endYear
    if (endAbs < startAbs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endYear'],
        message: '종료 시점이 시작보다 이릅니다',
      })
    }
  }
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
      transitionScope?: 'STATE_SUCCESSION' | 'REGIME_CHANGE' | null
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
import type {
  StateTypeOption,
  StateTypeCategory,
} from './state-type-modal'

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

const STATE_TYPE_CATEGORIES: StateTypeCategory[] = [
  { key: 'monarchy', label: '군주제·제국' },
  { key: 'republic', label: '공화제·연방' },
  { key: 'regime', label: '정권·군정' },
  { key: 'tribal', label: '부족·유목' },
  { key: 'other', label: '기타' },
]

/**
 * 역사적 단위 분류 — 주권 국가 / 정권·군정 / 시대.
 * 라디오 카드로 표시. 라벨 + 예시 (아이콘 없음, 미니멀 텍스트).
 */
const ENTITY_KIND_OPTIONS: {
  value: 'STATE' | 'REGIME' | 'PERIOD'
  label: string
  example: string
}[] = [
  { value: 'STATE', label: '주권 국가', example: '신성로마, 프로이센' },
  { value: 'REGIME', label: '정권·군정', example: '무로마치·에도 막부' },
  { value: 'PERIOD', label: '시대', example: '메이지·다이쇼' },
]

export function HistoricalCountryForm({
  editing,
  initialPreset,
  modernCountries,
  historicalCountries = [],
  onClose,
  onSave,
  onDirtyChange,
  onValuesChange,
}: HistoricalCountryFormProps) {
  // ==================== 상태 관리 ====================

  /** 썸네일 이미지 미리보기 URL (ThumbnailUploader가 업로드·진행률·삭제 모두 처리) */
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')

  /** 국가 형태 선택 모달 표시 여부 */
  const [showStateTypeModal, setShowStateTypeModal] = useState(false)

  /** 현대 국가 선택 모달 표시 여부 */
  const [showModernCountryModal, setShowModernCountryModal] = useState(false)

  /** 후임 국가 선택 모달 표시 여부 */
  const [showParentHistoricalModal, setShowParentHistoricalModal] = useState(false)

  // 시점은 인라인 EraDateInline으로 직접 입력 (모달 제거됨)

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
      /** 변천 전환 성격 — 후임 역사 국가 연결 시에만 포함 */
      transitionScope?: 'STATE_SUCCESSION' | 'REGIME_CHANGE'
    } = {
      name: data.name,
      // RHF 기본값이 ''라 빈 입력은 null로 정규화 (빈 문자열 저장 방지)
      enName: data.enName?.trim() || null,
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

  /** 국가 형태 선택 버튼 라벨 */
  const getStateTypeLabel = () => {
    const option = STATE_TYPE_OPTIONS.find(
      (opt) => opt.value === selectedStateType,
    )
    return option?.label ?? '선택하세요'
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

  // ==================== 조기 반환 ====================

  /** editing이 null이면 렌더링하지 않음 */

  if (!editing) {
    return null
  }

  // ==================== JSX 렌더링 ====================

  // 탭 제거 — 모든 섹션 항상 표시 (좌측 인덱스로 점프)

  const formBody = (
    <>
      {/* ─── 기본 정보 ─── */}
      <S.FormSection data-form-section="basic">
        <S.FormSectionHeader>
          <div>
            <S.FormSectionTitle>기본 정보</S.FormSectionTitle>
          </div>
        </S.FormSectionHeader>

        {/* 대표 이미지 — 미니멀 정사각형 96px */}
        <S.FormField data-field="thumbnail">
          <S.FormLabel htmlFor="thumbnail-upload">대표 이미지</S.FormLabel>
          <ThumbnailUploader
            value={thumbnailPreview}
            category="countries"
            inputId="thumbnail-upload"
            alt="역사적 국가 대표 이미지 미리보기"
            onChange={(url) => {
              setThumbnailPreview(url)
              setValue('thumbnailUrl', url, { shouldValidate: true })
            }}
          />
          <input type="hidden" {...register('thumbnailUrl')} />
        </S.FormField>

        {/* 국가명 */}
        <S.FormField>
          <S.FormLabel htmlFor="name">
            국가명 <S.RequiredStar>*</S.RequiredStar>
          </S.FormLabel>
          <FormInput
            id="name"
            type="text"
            placeholder="조선"
            {...register('name')}
            $error={!!errors.name}
          />
          {errors.name && (
            <S.ErrorMessage>{errors.name.message}</S.ErrorMessage>
          )}
        </S.FormField>

        <S.FormField>
          <S.FormLabel htmlFor="enName">영문 표기 (선택)</S.FormLabel>
          <FormInput
            id="enName"
            type="text"
            placeholder="Joseon Dynasty"
            {...register('enName')}
            $error={!!errors.enName}
          />
          {errors.enName && (
            <S.ErrorMessage>{errors.enName.message}</S.ErrorMessage>
          )}
        </S.FormField>

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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
            </svg>
          </S.SelectButton>
          <input type="hidden" {...register('stateType')} />
          {selectedEntityKind === 'REGIME' && (
            <AlertBox variant="warning">
              정권·군정인 경우 국가 형태에 <strong>막부</strong>를 선택하는
              것을 권장합니다.
            </AlertBox>
          )}
          {errors.stateType && (
            <S.ErrorMessage>{errors.stateType.message}</S.ErrorMessage>
          )}
        </S.FormField>

        {/* 역사적 단위 분류 */}
        <S.FormField>
          <S.FormLabel>역사적 단위 분류 (선택)</S.FormLabel>
          <RadioCardGroup
            value={selectedEntityKind ?? undefined}
            onChange={(v) =>
              setValue('entityKind', v ?? null, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            allowEmpty
            emptyLabel="자동"
            options={ENTITY_KIND_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
              hint: opt.example,
            }))}
          />
          <S.FormHelp>막부 같은 정권은 정권/시대로 구분</S.FormHelp>
        </S.FormField>

        {/* 존속 기간 — 시작/종료 한 그룹 */}
        <S.FormField>
          <S.FormLabel>존속 기간</S.FormLabel>
          <DateRange>
            <EraDateInline
              era={watch('startEra')}
              year={watch('startYear')}
              month={watch('startMonth')}
              day={watch('startDay')}
              idPrefix="start"
              onChange={({ era, year, month, day }) => {
                setValue('startEra', era, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
                setValue('startYear', year, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
                setValue('startMonth', month, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
                setValue('startDay', day, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }}
            />
            <RangeSep>→</RangeSep>
            <EraDateInline
              era={watch('endEra')}
              year={watch('endYear')}
              month={watch('endMonth')}
              day={watch('endDay')}
              idPrefix="end"
              onChange={({ era, year, month, day }) => {
                setValue('endEra', era, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
                setValue('endYear', year, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
                setValue('endMonth', month, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
                setValue('endDay', day, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }}
            />
          </DateRange>
          {(() => {
            const sEra = watch('startEra')
            const sYear = watch('startYear')
            const eEra = watch('endEra')
            const eYear = watch('endYear')
            if (!sEra || sYear == null || !eEra || eYear == null) return null
            const startAbs = sEra === 'BC' ? -sYear : sYear
            const endAbs = eEra === 'BC' ? -eYear : eYear
            const duration = endAbs - startAbs
            if (duration < 0) {
              return (
                <DurationHint $invalid>
                  종료가 시작보다 이릅니다. 시점을 확인해주세요.
                </DurationHint>
              )
            }
            return (
              <DurationHint>
                약 <strong>{duration.toLocaleString()}년</strong> 지속
              </DurationHint>
            )
          })()}
        </S.FormField>
      </S.FormSection>

      {/* ─── 관계 ─── */}
      <S.FormSection data-form-section="relations">
        <S.FormSectionHeader>
          <div>
            <S.FormSectionTitle>관계</S.FormSectionTitle>
          </div>
        </S.FormSectionHeader>

        <S.FormField>
          <S.FormLabel htmlFor="parentModernCountryIds">
            오늘날 속한 국가
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
                selectedModernCountries.length === 0 ? '국가 선택' : '추가'
              }
              onAdd={() => setShowModernCountryModal(true)}
            />
            {selectedModernCountries.length === 0 && (
              <AlertBox variant="warning">
                미연결 시 이 역사국가에 등록된 인물의 임기·내각이 현대 국가
                행정조직 뷰(국가 → 행정부)에서 보이지 않을 수 있습니다.
              </AlertBox>
            )}
          </div>
        </S.FormField>

        {historicalCountries.length > 0 && (
          <>
            <S.FormField>
              <S.FormLabel htmlFor="parentHistoricalCountryIds">
                다음으로 이어진 국가
              </S.FormLabel>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <SelectionChips
                  items={historicalCountries
                    .filter((c) =>
                      selectedParentHistoricalIds.includes(c.id),
                    )
                    .map((c) => ({ id: c.id, label: c.name }))}
                  onRemove={(id) =>
                    setSelectedParentHistoricalIds((prev) =>
                      prev.filter((x) => x !== id),
                    )
                  }
                  addLabel={
                    selectedParentHistoricalIds.length === 0
                      ? '국가 선택'
                      : '추가'
                  }
                  onAdd={() => setShowParentHistoricalModal(true)}
                />
                <S.FormHelp>예: 고려 → 조선, 무로마치 → 에도</S.FormHelp>
              </div>
            </S.FormField>
            {selectedParentHistoricalIds.length > 0 && (
              <S.FormField>
                <S.FormLabel>어떻게 이어졌나</S.FormLabel>
                <FormSelectNative
                  value={transitionEventType}
                  onChange={(e) => {
                    const next = e.target.value as TransitionEventType
                    setTransitionEventType(next)
                    const group = TRANSITION_EVENT_GROUPS.find((g) =>
                      g.items.includes(next),
                    )
                    if (group) setTransitionScope(group.defaultScope)
                  }}
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
                </FormSelectNative>
                <S.FormHelp>
                  {(() => {
                    const group = TRANSITION_EVENT_GROUPS.find((g) =>
                      g.items.includes(transitionEventType),
                    )
                    if (group?.hint) return group.hint
                    return '변환 날짜는 다음 국가의 존속 시작 시점을 참조합니다.'
                  })()}
                </S.FormHelp>
                <S.FormLabel style={{ marginTop: 12 }}>변환 성격</S.FormLabel>
                <FormSelectNative
                  value={transitionScope}
                  onChange={(e) =>
                    setTransitionScope(
                      e.target.value as
                        | 'STATE_SUCCESSION'
                        | 'REGIME_CHANGE'
                        | '',
                    )
                  }
                  style={{ marginTop: 6 }}
                >
                  <option value="">자동 (변환 유형으로 추정)</option>
                  <option value="STATE_SUCCESSION">
                    국가 계승 — 주권 단위 변경
                  </option>
                  <option value="REGIME_CHANGE">
                    정권 교체 — 영토는 그대로
                  </option>
                </FormSelectNative>

                <RelationPreview>
                  <RelationNode>{watch('name') || '이 국가'}</RelationNode>
                  <RelationArrow>
                    <svg
                      width="20"
                      height="10"
                      viewBox="0 0 20 10"
                      fill="none"
                    >
                      <path
                        d="M0 5 L16 5 M12 1 L16 5 L12 9"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="label">
                      {TRANSITION_EVENT_LABELS[transitionEventType]}
                    </span>
                    <svg
                      width="20"
                      height="10"
                      viewBox="0 0 20 10"
                      fill="none"
                    >
                      <path
                        d="M0 5 L16 5 M12 1 L16 5 L12 9"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </RelationArrow>
                  <RelationNode $highlight>
                    {historicalCountries
                      .filter((c) =>
                        selectedParentHistoricalIds.includes(c.id),
                      )
                      .map((c) => c.name)
                      .join(', ')}
                  </RelationNode>
                </RelationPreview>
              </S.FormField>
            )}
          </>
        )}
      </S.FormSection>

      {/* ─── 서술 ─── */}
      <S.FormSection data-form-section="narrative">
        <S.FormSectionHeader>
          <div>
            <S.FormSectionTitle>서술</S.FormSectionTitle>
          </div>
        </S.FormSectionHeader>

        <S.FormField>
          <S.FormLabel htmlFor="nameOrigin">이름의 유래</S.FormLabel>
          <TextareaWithCounterWrap
            length={(watch('nameOrigin') ?? '').length}
            max={500}
          >
            <FormTextarea
              id="nameOrigin"
              rows={3}
              placeholder="국가명의 어원이나 명칭의 유래를 입력해주세요"
              {...register('nameOrigin')}
              $error={!!errors.nameOrigin}
              style={{ minHeight: '80px' }}
            />
          </TextareaWithCounterWrap>
          {errors.nameOrigin && (
            <S.ErrorMessage>{errors.nameOrigin.message}</S.ErrorMessage>
          )}
        </S.FormField>

        <S.FormField>
          <S.FormLabel htmlFor="description">설명</S.FormLabel>
          <TextareaWithCounterWrap
            length={(watch('description') ?? '').length}
            max={1000}
          >
            <FormTextarea
              id="description"
              rows={4}
              placeholder="역사적 국가에 대한 설명을 입력해주세요"
              {...register('description')}
              $error={!!errors.description}
              style={{ minHeight: '100px' }}
            />
          </TextareaWithCounterWrap>
          {errors.description && (
            <S.ErrorMessage>{errors.description.message}</S.ErrorMessage>
          )}
        </S.FormField>

        <S.FormField>
          <S.FormLabel htmlFor="history">역사</S.FormLabel>
          <TextareaWithCounterWrap
            length={(watch('history') ?? '').length}
            max={10000}
          >
            <FormTextarea
              id="history"
              rows={8}
              placeholder="역사적 국가의 역사를 자유롭게 서술해주세요 (마크다운 지원)"
              {...register('history')}
              $error={!!errors.history}
              style={{ minHeight: '180px' }}
            />
          </TextareaWithCounterWrap>
          {errors.history && (
            <S.ErrorMessage>{errors.history.message}</S.ErrorMessage>
          )}
        </S.FormField>
      </S.FormSection>
    </>
  )

  return (
    <>
      <S.Form
        id="historical-country-form"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
        noValidate
      >
        <ModalFormLayoutWrap data-inner>{formBody}</ModalFormLayoutWrap>
      </S.Form>

      {/* 국가 형태 선택 모달 (카테고리 + 검색) */}
      <StateTypeModal
        open={showStateTypeModal}
        onClose={() => setShowStateTypeModal(false)}
        options={STATE_TYPE_OPTIONS}
        categories={STATE_TYPE_CATEGORIES}
        selectedValue={selectedStateType}
        onSelect={handleStateTypeSelect}
      />

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

    </>
  )
}
