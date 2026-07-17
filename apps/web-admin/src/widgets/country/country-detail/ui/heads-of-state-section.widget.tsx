/**
 * 역대 수반(국가원수·정부수반·군주 등) 재임 기록 목록 및 추가 섹션
 * 연대표 국가 상세에서 해당 국가의 재임 기록을 보고 추가할 수 있음
 */
import React, { useEffect, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import {
  FiArrowLeft,
  FiAward,
  FiBook,
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
  FiEdit2,
  FiInfo,
  FiPlus,
  FiSave,
  FiSearch,
  FiSettings,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api'
import {
  type CreateRegnalEraDto,
  type RegnalEraDto,
  personCareerApi,
} from '@/shared/api/person-career'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { getAllPersons, getPersonsByTenureCountry } from '@/shared/api/persons'
import { uploadImage } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  calcAgeAtTenure,
  formatPersonLifespan,
} from '@/shared/lib/tenure-person-utils'
import { useThemeStore } from '@/shared/styles/theme.store'
import { confirm } from '@/shared/ui/confirm-dialog'
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalSubtitle,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import {
  BackButton,
  DateFieldBtn,
  DateFieldsRow,
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormCardWrapper,
  FormRows,
  FormSectionInner,
  Input,
  Input as RegisterInput,
  Required,
  SubmitButton,
  TabButton,
  TabNavigation,
} from '@/shared/ui/register-form-layout'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'
import {
  SelectModal,
  type SelectOption,
} from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import {
  adminTenureHintFromRow,
  dedupeHeadsOfStateTenuresForDisplay,
} from './heads-of-state-tenure-dedup'
import { LineageTree } from './lineage-tree.widget'

const HEADS_POSITION_TYPES = new Set([
  'HEAD_OF_STATE',
  'HEAD_OF_GOVERNMENT',
  'REGENT',
  'HEIR_APPARENT',
  'ROYAL_NOBLE_TITLE',
])

/** 계보도 열 순서: 국가원수 좌측, 이어서 정부수반·섭정·왕족/귀족 */
const POSITION_TYPE_ORDER: Record<string, number> = {
  HEAD_OF_STATE: 0,
  HEAD_OF_GOVERNMENT: 1,
  REGENT: 2,
  HEIR_APPARENT: 3,
  ROYAL_NOBLE_TITLE: 4,
  OTHER: 5,
}

const OTHER_POSITION_VALUE = 'OTHER'

function formatRegnalEraDatePart(
  year?: number | null,
  monthValue?: number | null,
  dayValue?: number | null,
): string {
  if (year == null) return ''
  if (monthValue != null && dayValue != null)
    return `${year}-${String(monthValue).padStart(2, '0')}-${String(dayValue).padStart(2, '0')}`
  if (monthValue != null)
    return `${year}-${String(monthValue).padStart(2, '0')}`
  return String(year)
}

function formatRegnalEraRangeLabel(era: RegnalEraDto): string {
  const start = formatRegnalEraDatePart(
    era.startYear,
    era.startMonth,
    era.startDay,
  )
  const end = formatRegnalEraDatePart(era.endYear, era.endMonth, era.endDay)
  if (start && end) return `${start} ~ ${end}`
  if (start) return `${start} ~ (종료 미입력)`
  return ''
}

function tenureRowSupportsRegnalEras(t: unknown): boolean {
  if (!t || typeof t !== 'object') return false
  const row = t as Record<string, unknown>
  if (row.recordKind === 'SOVEREIGN_REIGN') return true
  const posDef = row.positionDefinition as Record<string, unknown> | undefined
  const pt = row.positionType ?? posDef?.positionType
  return pt === 'HEAD_OF_STATE'
}

/** 특정 직책 계보도에서 선 연결 없음용 */
const emptyMap = new Map<string, string[]>()

interface HeadsOfStateSectionProps {
  country: UnifiedCountry
  /** 인물 탭에 통합되어 상단 여백을 부모가 줄 때 true */
  embedded?: boolean
}

const MIN_LOADING_MS = 1000
const FADE_DURATION = 0.35

// ─── 인포그래픽 타임라인 ────────────────────────────────────────────────────
const HEADS_TL_ROWS = [
  { line: '#6366f1', textColor: '#3730a3' },
  { line: '#f59e0b', textColor: '#78350f' },
  { line: '#10b981', textColor: '#065f46' },
  { line: '#e11d48', textColor: '#881337' },
]
const HEADS_TL_ROW_SIZE = 4
const HEADS_ROW_H = 380
const HEADS_BUBBLE_W = 84
const HEADS_THUMB = 72

function HeadsTlCard({
  thumbUrl,
  personName,
  titleText,
  range,
  ageAtStart,
  birthPlace,
  lifespan,
  regnalName,
  dynastyName,
  achievements,
  lineColor,
  textColor,
  isDark,
  adminTenureHint,
}: {
  thumbUrl: string | null
  personName: string
  titleText: string
  range: string
  ageAtStart: number | null
  birthPlace: string | null
  lifespan: string | null
  regnalName: string | null | undefined
  dynastyName: string | null
  achievements: any[]
  lineColor: string
  textColor: string
  isDark: boolean
  /** 재위 행에만: 동일 기간 행정부 수반 재임이 숨겨졌을 때 안내 */
  adminTenureHint?: string | null
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* 원형 썸네일 */}
      <div
        style={{
          flexShrink: 0,
          width: HEADS_THUMB,
          height: HEADS_THUMB,
          borderRadius: '50%',
          overflow: 'hidden',
          background: `${lineColor}18`,
          border: `3px solid ${lineColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 3px 10px ${lineColor}44`,
        }}
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={personName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
            }}
          />
        ) : (
          <FiUser size={26} color={lineColor} style={{ opacity: 0.3 }} />
        )}
      </div>
      {/* 우측 텍스트 */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 800,
            color: isDark ? '#f1f5f9' : '#0f172a',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {personName}
        </div>
        {regnalName && (
          <div
            style={{
              fontSize: 11,
              color: '#7c3aed',
              fontStyle: 'italic',
              marginTop: 1,
            }}
          >
            {regnalName}
          </div>
        )}
        <div
          style={{
            fontSize: 12,
            color: lineColor,
            fontWeight: 600,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {titleText}
        </div>
        {adminTenureHint ? (
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: isDark ? 'rgba(148,163,184,0.95)' : '#64748b',
              marginTop: 4,
              lineHeight: 1.35,
            }}
          >
            {adminTenureHint}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 5,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '3px 8px',
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: lineColor,
              background: `${lineColor}12`,
              borderRadius: 5,
              padding: '2px 9px',
              whiteSpace: 'nowrap',
            }}
          >
            {range}
          </span>
          {ageAtStart != null && (
            <span
              style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}
            >
              취임 {ageAtStart}세
            </span>
          )}
        </div>
        <div
          style={{
            marginTop: 4,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2px 8px',
          }}
        >
          {lifespan && (
            <span
              style={{ fontSize: 11, color: isDark ? '#475569' : '#b0bac9' }}
            >
              {lifespan}
            </span>
          )}
          {birthPlace && (
            <span
              style={{
                fontSize: 11,
                color: '#b0bac9',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span style={{ fontSize: 9.5, color: '#c8d0da' }}>출신</span>
              {birthPlace}
            </span>
          )}
          {dynastyName && (
            <span style={{ fontSize: 11, color: '#7c3aed' }}>
              가문: {dynastyName}
            </span>
          )}
        </div>
        {achievements.length > 0 && (
          <div
            style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 3 }}
          >
            {achievements.slice(0, 2).map((a: any) => (
              <span
                key={a.id}
                style={{
                  fontSize: 10.5,
                  padding: '1px 7px',
                  borderRadius: 10,
                  color: isDark ? '#c4b5fd' : '#6d28d9',
                  background: isDark ? 'rgba(109,40,217,0.15)' : '#f5f3ff',
                }}
              >
                {a.title}
              </span>
            ))}
            {achievements.length > 2 && (
              <span
                style={{
                  fontSize: 10.5,
                  padding: '1px 7px',
                  borderRadius: 10,
                  color: isDark ? '#94a3b8' : '#64748b',
                  background: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
                }}
              >
                +{achievements.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function HeadsOfStateSection({
  country,
  embedded,
}: HeadsOfStateSectionProps) {
  const queryClient = useQueryClient()
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const isHistorical = country.type === 'historical'
  const [showLoading, setShowLoading] = useState(true)
  const loadStartRef = useRef<number>(Date.now())
  const minLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countryId = !isHistorical ? country.id : undefined
  const historicalCountryId = isHistorical ? country.id : undefined

  const [view, setView] = useState<'list' | 'register'>('list')
  /** 목록 내 표시 모드: 목록 | 계보도(대수 기준) */
  const [listViewMode, setListViewMode] = useState<'list' | 'lineage'>(
    'lineage',
  )
  /** 수정 모드: 목록에서 클릭한 재임 ID (설정되면 수정 폼 표시) */
  const [editingTenureId, setEditingTenureId] = useState<string | null>(null)
  const [personSelectModalOpen, setPersonSelectModalOpen] = useState(false)
  const [positionTitleModalOpen, setPositionTitleModalOpen] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState('')
  /** 직책: DB 관직 정의 ID. null이면 기타(직접 입력) */
  const [selectedPositionDefinitionId, setSelectedPositionDefinitionId] =
    useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [regnalNumber, setRegnalNumber] = useState('') // 대수/재위번호 통합
  const [regnalName, setRegnalName] = useState('')
  /** 사건 페이지(역대 수반 토글)에 이 재임을 노출할지 여부 */
  const [showOnEventsPage, setShowOnEventsPage] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  /** 계보도에서 표시할 직책(직책명). 직책별로 계보를 분리해 표시 */
  const [selectedLineagePositionLabel, setSelectedLineagePositionLabel] =
    useState<string | null>(null)
  /** 역대 수반 페이지에서 사용자가 선택한 직책. null = 전체 */
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<
    string | null
  >(null)
  /** 목록 검색어 */
  const [tenureSearchQuery, setTenureSearchQuery] = useState('')
  /** 수반 등록 시 소속 국가: null = 현대 국가(현재), 값 있으면 하위 역사적 국가 ID */
  const [selectedAffinityHistoricalId, setSelectedAffinityHistoricalId] =
    useState<string | null>(null)
  const [affinityCountryModalOpen, setAffinityCountryModalOpen] =
    useState(false)
  /** 목록에서 "이 행정부 각료" 펼친 재임 ID */
  const [expandedCabinetTenureId, setExpandedCabinetTenureId] = useState<
    string | null
  >(null)
  /** 설정 모달: 교황 전역 표시 on/off */
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [showGlobalPope, setShowGlobalPope] = useState(true)
  /** 계보도 카드 클릭 시: 해당 수반의 각료 목록 모달 */
  const [cabinetModalTenureId, setCabinetModalTenureId] = useState<
    string | null
  >(null)

  /** 업적: 컨텐츠 영역 인라인 폼용 (모달 없음) */
  const [achievementTenureId, setAchievementTenureId] = useState<string | null>(
    null,
  )
  const [achievementPersonName, setAchievementPersonName] = useState('')
  const [achievementTitle, setAchievementTitle] = useState('')
  const [achievementDescription, setAchievementDescription] = useState('')
  const [achievementStartDate, setAchievementStartDate] = useState('')
  const [achievementEndDate, setAchievementEndDate] = useState('')
  const [achievementShowOnEventsPage, setAchievementShowOnEventsPage] =
    useState(true)
  const [achievementDateField, setAchievementDateField] = useState<
    'start' | 'end' | null
  >(null)
  const [achievementSubmitting, setAchievementSubmitting] = useState(false)
  /** 수정 중인 업적 ID (설정 시 폼이 수정 모드) */
  const [editingAchievementId, setEditingAchievementId] = useState<
    string | null
  >(null)
  /** 연호 폼 */
  const [editingRegnalEraId, setEditingRegnalEraId] = useState<string | null>(
    null,
  )
  const [regnalEraName, setRegnalEraName] = useState('')
  const [regnalEraNameEn, setRegnalEraNameEn] = useState('')
  const [regnalEraStartYear, setRegnalEraStartYear] = useState('')
  const [regnalEraStartMonth, setRegnalEraStartMonth] = useState('')
  const [regnalEraStartDay, setRegnalEraStartDay] = useState('')
  const [regnalEraEndYear, setRegnalEraEndYear] = useState('')
  const [regnalEraEndMonth, setRegnalEraEndMonth] = useState('')
  const [regnalEraEndDay, setRegnalEraEndDay] = useState('')
  const [regnalEraChangeReason, setRegnalEraChangeReason] = useState('')
  const [regnalEraSubmitting, setRegnalEraSubmitting] = useState(false)
  /** 수정 폼 탭: 기본정보 | 업적 | 연호 */
  const [tenureFormTab, setTenureFormTab] = useState<
    'basic' | 'achievement' | 'regnalEra'
  >('basic')
  /** 수반 등록 시 이 재임으로 행정부도 함께 만들기 (국가원수·정부수반만 표시) */
  const [createCabinetWithTenure, setCreateCabinetWithTenure] = useState(false)
  /** 국가원수(HEAD_OF_STATE)만 — 재위만 기록(군주 등록과 동일, 행정부 수반 후보 제외) */
  const [sovereignReignOnlyForm, setSovereignReignOnlyForm] = useState(false)

  /** 현대 국가일 때 하위 역사적 국가 목록 (이 현대 국가에 연결된 역사적 국가) */
  const { data: subordinateHistoricalFromApi = [] } =
    useHistoricalCountriesByModernCountry(countryId ?? '')
  const subordinateHistorical =
    (country as any).historicalCountries?.length > 0
      ? (country as any).historicalCountries
      : subordinateHistoricalFromApi
  const hasSubordinateHistorical =
    Array.isArray(subordinateHistorical) && subordinateHistorical.length > 0

  const { data: countryTenures = [], isLoading } = useQuery({
    queryKey: ['tenures-by-country', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId,
        historicalCountryId,
      }),
    enabled: !!countryId || !!historicalCountryId,
  })

  /** 전역 수반(교황 등) — 흐름도에 함께 노출 */
  const { data: globalTenures = [] } = useQuery({
    queryKey: ['global-tenures'],
    queryFn: () => personCareerApi.getGlobalTenures(),
    enabled: !!countryId || !!historicalCountryId,
  })

  /** 전역 수반 중 직책명이 "교황"인 것만 — 전체 국가 흐름도에 노출 */
  const popeTenures = React.useMemo(() => {
    const titleOf = (t: any) =>
      (
        t?.positionDefinition?.title ??
        t?.position?.title ??
        t?.title ??
        ''
      ).trim()
    return (globalTenures as any[]).filter((t) => titleOf(t) === '교황')
  }, [globalTenures])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('heads.showGlobalPope')
      if (saved === 'false') setShowGlobalPope(false)
    } catch {
      // ignore localStorage read errors
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        'heads.showGlobalPope',
        showGlobalPope ? 'true' : 'false',
      )
    } catch {
      // ignore localStorage write errors
    }
  }, [showGlobalPope])

  /** 국가 재임 + 교황(전역) 병합 */
  const tenures = React.useMemo(
    () =>
      showGlobalPope
        ? [...(countryTenures as any[]), ...popeTenures]
        : [...(countryTenures as any[])],
    [countryTenures, popeTenures, showGlobalPope],
  )

  /** 목록·계보 표시용: 국왕 재위 + 행정부 수반 재임 이중 행은 재위만 노출 */
  const tenuresUi = React.useMemo(
    () => dedupeHeadsOfStateTenuresForDisplay(tenures as any[]),
    [tenures],
  )

  const resolveHeadTenureIdForCabinetModal = React.useCallback(
    (tenureId: string) => {
      const row =
        tenuresUi.find((t: any) => t.id === tenureId) ??
        tenures.find((t: any) => t.id === tenureId)
      return row?._displayLinkedHeadTenure?.id ?? tenureId
    },
    [tenuresUi, tenures],
  )

  // 최소 1초 로딩 표시 후 부드럽게 전환
  useEffect(() => {
    if (isLoading) {
      loadStartRef.current = Date.now()
      setShowLoading(true)
    } else {
      const elapsed = Date.now() - loadStartRef.current
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed)
      minLoadTimeoutRef.current = setTimeout(() => {
        setShowLoading(false)
        minLoadTimeoutRef.current = null
      }, remaining)
    }
    return () => {
      if (minLoadTimeoutRef.current) {
        clearTimeout(minLoadTimeoutRef.current)
        minLoadTimeoutRef.current = null
      }
    }
  }, [isLoading])

  const { data: persons = [] } = useQuery({
    queryKey: ['persons-by-tenure-country', countryId, historicalCountryId],
    queryFn: () =>
      getPersonsByTenureCountry({ countryId, historicalCountryId }),
    enabled: !!countryId || !!historicalCountryId,
  })

  /** 수반 등록 시 인물 선택 모달용 — 전체 인물 목록(재임 여부 무관) */
  const { data: allPersonsForModal = [] } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons(),
    enabled: personSelectModalOpen,
  })

  /** 펼친 수반 재임의 하위 각료 목록 (이 행정부 각료) */
  const { data: subordinateTenures = [] } = useQuery({
    queryKey: ['subordinate-tenures', expandedCabinetTenureId],
    queryFn: () =>
      personCareerApi.getSubordinateTenures(expandedCabinetTenureId!),
    enabled: !!expandedCabinetTenureId,
  })
  /** 계보도 카드에서 연 각료 모달의 하위 각료 목록 */
  const {
    data: cabinetModalSubordinateTenures = [],
    isLoading: isCabinetModalLoading,
  } = useQuery({
    queryKey: ['subordinate-tenures-modal', cabinetModalTenureId],
    queryFn: () => personCareerApi.getSubordinateTenures(cabinetModalTenureId!),
    enabled: !!cabinetModalTenureId,
  })

  /** 해당 국가의 관직 정의(DB) — 직책명 선택 목록으로 사용 */
  const { data: positionDefinitions = [] } = useQuery({
    queryKey: ['position-definitions', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId,
        historicalCountryId,
      }),
    enabled: !!countryId || !!historicalCountryId,
  })

  /** 직책 선택 옵션: DB 관직 정의(수반 관련 유형) + 기타 */
  const positionTitleOptions: SelectOption<string>[] = React.useMemo(() => {
    const defs = (positionDefinitions as any[]).filter((d) =>
      HEADS_POSITION_TYPES.has(d.positionType),
    )
    const byDef = defs.map((d) => ({ value: d.id, label: d.title }))
    return [
      ...byDef,
      { value: OTHER_POSITION_VALUE, label: '기타 (직접 입력)' },
    ]
  }, [positionDefinitions])

  const refetch = () => {
    invalidateTenureQueries(queryClient)
    // 직책 정의 목록은 tenure 캐시군에 속하지 않아 별도 무효화
    queryClient.invalidateQueries({
      queryKey: ['position-definitions', countryId, historicalCountryId],
    })
  }

  const selectedPositionDefinition = selectedPositionDefinitionId
    ? (positionDefinitions as any[]).find(
        (d) => d.id === selectedPositionDefinitionId,
      )
    : null

  const selectedCabinetModalHead = cabinetModalTenureId
    ? tenures.find((t: any) => t.id === cabinetModalTenureId)
    : null

  /** 재임 기록의 소속 국가 표시명 (역사적 국가·현대 국가 구분). 헤더에 "신성로마제국 · 황제"처럼 표시하기 위함 */
  const getCountryNameForTenure = React.useCallback(
    (t: any) => (t?.historicalCountry?.name ?? t?.country?.name ?? '').trim(),
    [],
  )

  /** 국가·직책별로 묶은 재임 목록. "신성로마제국 · 황제", "브란덴부르크 선제후국 · 선제후"처럼 소속 국가별로 구분 */
  const tenuresByPosition = React.useMemo(() => {
    const defs = positionDefinitions as any[]
    const getPositionLabel = (t: any) => {
      const defId = t.positionDefinitionId ?? t.position?.id
      const def =
        defId && defs.length ? defs.find((d: any) => d.id === defId) : null
      if (def?.title) return def.title.trim()
      // 전역 수반(교황 등): API 응답에 positionDefinition 내장
      const embeddedTitle = (
        t.positionDefinition?.title ??
        t.position?.title ??
        t.title ??
        ''
      ).trim()
      if (embeddedTitle) return embeddedTitle
      return '(기타)'
    }
    const map = new Map<string, any[]>()
    tenuresUi.forEach((t: any) => {
      const countryName = getCountryNameForTenure(t)
      const positionLabel = getPositionLabel(t)
      const key =
        positionLabel === '교황'
          ? positionLabel
          : countryName
            ? `${countryName} · ${positionLabel}`
            : positionLabel
      const list = map.get(key) ?? []
      list.push(t)
      map.set(key, list)
    })
    const getPositionPart = (label: string) =>
      label.includes(' · ') ? (label.split(' · ')[1]?.trim() ?? label) : label
    const getDefForLabel = (label: string) => {
      const part = getPositionPart(label)
      return defs.find((d: any) => d.title === part)
    }
    const getRankForLabel = (label: string) =>
      getDefForLabel(label)?.rank ?? 999
    const getTypeOrder = (label: string) =>
      POSITION_TYPE_ORDER[getDefForLabel(label)?.positionType ?? 'OTHER'] ?? 99
    return Array.from(map.entries())
      .map(([label, list]) => ({ label, tenures: list }))
      .sort((a, b) => {
        const orderA = getTypeOrder(a.label)
        const orderB = getTypeOrder(b.label)
        if (orderA !== orderB) return orderA - orderB
        const rankA = getRankForLabel(a.label)
        const rankB = getRankForLabel(b.label)
        if (rankA !== rankB) return rankA - rankB
        return a.label.localeCompare(b.label, 'ko')
      })
  }, [tenuresUi, positionDefinitions, getCountryNameForTenure])

  /** UI 표시용 라벨: 구분점(·) 제거 */
  const toDisplayPositionLabel = React.useCallback(
    (label: string) => label.replace(/\s*·\s*/g, ' ').trim(),
    [],
  )

  const isMonarchPosition =
    selectedPositionDefinition?.positionType === 'HEAD_OF_STATE' ||
    selectedPositionDefinitionId === null

  /** 목록에서 재임 클릭 시 수정 폼으로 전환 + 데이터 채우기 */
  const editingTenure = editingTenureId
    ? tenures.find((t: any) => t.id === editingTenureId)
    : null
  const editingIsSovereignReign =
    editingTenure != null &&
    (editingTenure as any).recordKind === 'SOVEREIGN_REIGN'

  const editingHostSupportsRegnalEras = React.useMemo(
    () => editingTenure != null && tenureRowSupportsRegnalEras(editingTenure),
    [editingTenure],
  )

  React.useEffect(() => {
    if (!editingTenureId || !editingTenure) return
    setTenureFormTab('basic')
    setEditingAchievementId(null)
    setAchievementTitle('')
    setAchievementDescription('')
    setAchievementStartDate('')
    setAchievementEndDate('')
    setAchievementShowOnEventsPage(true)
    const t = editingTenure as any
    setAchievementTenureId(editingTenureId)
    setAchievementPersonName(getPersonName(t?.person))
    setSelectedPersonId(t.personId || '')
    const defId = t.positionDefinitionId || t.position?.id
    const defs = positionDefinitions as any[]
    const matchedDef = defId && defs.find((d) => d.id === defId)
    if (matchedDef) {
      setSelectedPositionDefinitionId(matchedDef.id)
      setTitle(matchedDef.title || '')
      setTitleEn(matchedDef.titleEn || '')
    } else {
      setSelectedPositionDefinitionId(null)
      setTitle(t.title || t.position?.title || '')
      setTitleEn(t.titleEn || t.position?.titleEn || '')
    }
    setStartDate(t.startDate || '')
    setEndDate(t.endDate || '')
    setRegnalNumber(
      t.regnalNumber != null
        ? String(t.regnalNumber)
        : t.termNumber != null
          ? String(t.termNumber)
          : '',
    )
    setRegnalName(getRegnalNameFromNotes(t.notes) || '')
    setShowOnEventsPage(t.showPositionInfo !== false)
    setSelectedAffinityHistoricalId(t.historicalCountryId ?? null)
    setSovereignReignOnlyForm((t as any).recordKind === 'SOVEREIGN_REIGN')
    setEditingRegnalEraId(null)
    setRegnalEraName('')
    setRegnalEraNameEn('')
    setRegnalEraStartYear('')
    setRegnalEraStartMonth('')
    setRegnalEraStartDay('')
    setRegnalEraEndYear('')
    setRegnalEraEndMonth('')
    setRegnalEraEndDay('')
    setRegnalEraChangeReason('')
  }, [editingTenureId, editingTenure, positionDefinitions])

  useEffect(() => {
    if (sovereignReignOnlyForm) setCreateCabinetWithTenure(false)
  }, [sovereignReignOnlyForm])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const hasDefinition = !!selectedPositionDefinitionId
    const hasTitle = title.trim() !== ''
    if (!selectedPersonId || (!hasDefinition && !hasTitle) || !startDate) {
      notify.error('인물, 직책명(또는 기타 직접 입력), 취임일을 입력해주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const def = selectedPositionDefinition
      const resolvedPositionType = def ? def.positionType : 'OTHER'
      const notesValue = regnalName.trim()
        ? `왕명: ${regnalName.trim()}`
        : undefined
      const editingRow = editingTenureId
        ? (tenures.find((t: any) => t.id === editingTenureId) as any)
        : null
      const editAsSovereign = editingRow?.recordKind === 'SOVEREIGN_REIGN'
      const useSovereignPath =
        resolvedPositionType === 'HEAD_OF_STATE' &&
        sovereignReignOnlyForm &&
        !!def?.id

      const sovereignPayload = {
        personId: selectedPersonId,
        positionDefinitionId: def?.id,
        countryId: selectedAffinityHistoricalId
          ? undefined
          : (countryId ?? undefined),
        historicalCountryId:
          selectedAffinityHistoricalId ?? historicalCountryId ?? undefined,
        startDate,
        endDate: endDate || undefined,
        termNumber:
          regnalNumber.trim() === ''
            ? undefined
            : parseInt(regnalNumber, 10) || undefined,
        regnalNumber:
          regnalNumber.trim() === ''
            ? undefined
            : parseInt(regnalNumber, 10) || undefined,
        notes: notesValue,
        showPositionInfo: showOnEventsPage,
      }

      // 정의 선택 시 직함은 2차 카테고리(Definition)에만 두고 Tenure에는 저장하지 않음
      const tenurePayload = {
        personId: selectedPersonId,
        positionType: resolvedPositionType as any,
        positionDefinitionId: def?.id || undefined,
        title: def ? undefined : title.trim() || undefined,
        titleEn: def ? undefined : titleEn.trim() || undefined,
        countryId: selectedAffinityHistoricalId
          ? undefined
          : (countryId ?? undefined),
        historicalCountryId:
          selectedAffinityHistoricalId ?? historicalCountryId ?? undefined,
        startDate,
        endDate: endDate || undefined,
        termNumber:
          regnalNumber.trim() === ''
            ? undefined
            : parseInt(regnalNumber, 10) || undefined,
        regnalNumber:
          regnalNumber.trim() === ''
            ? undefined
            : parseInt(regnalNumber, 10) || undefined,
        notes: notesValue,
        showPositionInfo: showOnEventsPage,
      }

      if (editingTenureId) {
        if (editAsSovereign) {
          await personCareerApi.updateSovereignReign(
            editingTenureId,
            sovereignPayload,
          )
          notify.success('재위 기록이 수정되었습니다.')
        } else {
          await personCareerApi.updateGovernmentPositionTenure(
            editingTenureId,
            tenurePayload,
          )
          notify.success('재임 기록이 수정되었습니다.')
        }
      } else if (useSovereignPath) {
        await personCareerApi.addSovereignReign(sovereignPayload)
        notify.success('재위 기록이 추가되었습니다.')
        // 아래 refetch()가 invalidateTenureQueries로 전 surface 무효화
      } else {
        const created = (await personCareerApi.addGovernmentPositionTenure(
          tenurePayload,
        )) as {
          id: string
          countryId?: string | null
          historicalCountryId?: string | null
        }
        const isHeadType =
          resolvedPositionType === 'HEAD_OF_STATE' ||
          resolvedPositionType === 'HEAD_OF_GOVERNMENT'
        if (createCabinetWithTenure && isHeadType && created?.id) {
          try {
            await personCareerApi.createCabinet({ headTenureId: created.id })
            notify.success('재임 기록과 행정부가 등록되었습니다.')
          } catch (cabinetErr: any) {
            notify.success('재임 기록이 추가되었습니다.')
            notify.error(cabinetErr?.message ?? '행정부 생성에 실패했습니다.')
          }
        } else {
          notify.success('재임 기록이 추가되었습니다.')
        }
      }
      resetForm()
      setEditingTenureId(null)
      refetch()
      setView('list')
    } catch (err: any) {
      notify.error(err?.message || '저장에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setEditingTenureId(null)
    setSelectedPersonId('')
    setSelectedPositionDefinitionId(null)
    setSelectedAffinityHistoricalId(null)
    setTitle('')
    setTitleEn('')
    setStartDate('')
    setEndDate('')
    setRegnalNumber('')
    setRegnalName('')
    setShowOnEventsPage(true)
    setCreateCabinetWithTenure(false)
    setSovereignReignOnlyForm(false)
  }

  const handleDeleteTenure = async () => {
    if (!editingTenureId) return
    const row = tenures.find((t: any) => t.id === editingTenureId) as any
    const isSov = row?.recordKind === 'SOVEREIGN_REIGN'
    if (
      !(await confirm({
        title: '삭제 확인',
        message: isSov
          ? '이 재위 기록을 삭제하시겠습니까?'
          : '이 재임 기록을 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    try {
      if (isSov) {
        await personCareerApi.deleteSovereignReign(editingTenureId)
        notify.success('재위 기록이 삭제되었습니다.')
      } else {
        await personCareerApi.deleteGovernmentPositionTenure(editingTenureId)
        notify.success('재임 기록이 삭제되었습니다.')
      }
      resetForm()
      setView('list')
      refetch()
    } catch (err: any) {
      notify.error(err?.message || '삭제에 실패했습니다.')
    }
  }

  const handlePositionTitleSelect = (value: string) => {
    setPositionTitleModalOpen(false)
    if (value === OTHER_POSITION_VALUE) {
      setSelectedPositionDefinitionId(null)
      setTitle('')
      setTitleEn('')
    } else {
      const def = (positionDefinitions as any[]).find((d) => d.id === value)
      if (def) {
        setSelectedPositionDefinitionId(def.id)
        setTitle(def.title || '')
        setTitleEn(def.titleEn || '')
      }
    }
  }

  const positionTitleLabel =
    selectedPositionDefinitionId === null
      ? title
        ? `기타: ${title}`
        : '기타 (직접 입력)'
      : selectedPositionDefinition
        ? selectedPositionDefinition.title
        : '직책 선택'

  const formatDate = (d: string) => {
    if (!d) return '—'
    const date = new Date(d)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateForInput = (iso: string) => {
    if (!iso) return ''
    if (iso.startsWith('-')) {
      const [, y, m, d] = iso.match(/^-(\d+)-(\d+)-(\d+)/) || []
      return y && m && d
        ? `BC ${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`
        : iso
    }
    const date = new Date(iso)
    if (isNaN(date.getTime())) return iso
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getPersonName = (
    p: {
      name?: string
      surname?: string
      middleName?: string
      nameDisplayOrder?: string | null
      country?: { defaultNameDisplayOrder?: string | null } | null
    } | null,
  ) => {
    if (!p) return '—'
    return getPersonDisplayName({
      name: p.name || '',
      surname: p.surname ?? '',
      middleName: p.middleName ?? '',
      nameDisplayOrder: p.nameDisplayOrder ?? null,
      country: p.country ?? null,
    })
  }

  const selectedCabinetHeadName = selectedCabinetModalHead
    ? getPersonName((selectedCabinetModalHead as any).person)
    : '—'
  const selectedCabinetHeadTitle = selectedCabinetModalHead
    ? (selectedCabinetModalHead as any).title ||
      (selectedCabinetModalHead as any).position?.title ||
      '수반'
    : '수반'
  const selectedCabinetHeadCountry = selectedCabinetModalHead
    ? getCountryNameForTenure(selectedCabinetModalHead as any) ||
      (country as { name?: string })?.name ||
      '—'
    : (country as { name?: string })?.name || '—'
  const selectedCabinetHeadPeriod = selectedCabinetModalHead
    ? `${formatDate((selectedCabinetModalHead as any).startDate)} ~ ${
        (selectedCabinetModalHead as any).endDate
          ? formatDate((selectedCabinetModalHead as any).endDate)
          : '현재'
      }`
    : '—'
  const cabinetModalSummary = React.useMemo(() => {
    const list = cabinetModalSubordinateTenures as any[]
    const total = list.length
    const active = list.filter((x: any) => !x?.endDate).length
    const ended = total - active
    return { total, active, ended }
  }, [cabinetModalSubordinateTenures])

  /** notes에서 "왕명: xxx" 추출 */
  const getRegnalNameFromNotes = (notes: string | null | undefined) => {
    if (!notes?.trim()) return null
    const m =
      notes.match(/왕명\s*:\s*(.+?)(?:\n|$)/i) ||
      notes.match(/왕명\s*:\s*(.+)/i)
    return m ? m[1].trim() : null
  }

  /** 업적 폼 초기화 (추가 모드로) */
  const resetAchievementForm = () => {
    setEditingAchievementId(null)
    setAchievementTitle('')
    setAchievementDescription('')
    setAchievementStartDate('')
    setAchievementEndDate('')
    setAchievementShowOnEventsPage(true)
  }

  /** 업적 수정 모드로 폼 채우기 */
  const startEditAchievement = (a: {
    id: string
    title?: string
    description?: string
    startDate?: string
    endDate?: string
    showOnEventsPage?: boolean
  }) => {
    setEditingAchievementId(a.id)
    setAchievementTitle(a.title ?? '')
    setAchievementDescription(a.description ?? '')
    setAchievementStartDate(a.startDate ?? '')
    setAchievementEndDate(a.endDate ?? '')
    setAchievementShowOnEventsPage(a.showOnEventsPage ?? true)
  }

  /** 업적/한일 등록 또는 수정 제출 */
  const handleAchievementSubmit = async () => {
    const tenureId = achievementTenureId ?? editingTenureId
    if (!tenureId || !achievementTitle.trim()) {
      notify.error('제목을 입력하세요.')
      return
    }
    const hostRow = tenures.find((t: any) => t.id === tenureId) as any
    const achievementIsSovereign = hostRow?.recordKind === 'SOVEREIGN_REIGN'
    setAchievementSubmitting(true)
    try {
      const dto = {
        title: achievementTitle.trim(),
        description: achievementDescription.trim() || undefined,
        startDate: achievementStartDate || undefined,
        endDate: achievementEndDate || undefined,
        showOnEventsPage: achievementShowOnEventsPage,
      }
      if (editingAchievementId) {
        if (achievementIsSovereign) {
          await personCareerApi.updateSovereignReignAchievement(
            tenureId,
            editingAchievementId,
            dto,
          )
        } else {
          await personCareerApi.updateTenureAchievement(
            tenureId,
            editingAchievementId,
            dto,
          )
        }
        notify.success('업적이 수정되었습니다.')
      } else if (achievementIsSovereign) {
        await personCareerApi.createSovereignReignAchievement(tenureId, dto)
        notify.success('업적·한일이 등록되었습니다.')
      } else {
        await personCareerApi.createTenureAchievement(tenureId, dto)
        notify.success('업적·한일이 등록되었습니다.')
      }
      resetAchievementForm()
      invalidateTenureQueries(queryClient)
    } catch (err: any) {
      notify.error(
        err?.message ??
          (editingAchievementId
            ? '수정에 실패했습니다.'
            : '등록에 실패했습니다.'),
      )
    } finally {
      setAchievementSubmitting(false)
    }
  }

  /** 업적 삭제 */
  const handleDeleteAchievement = async (
    tenureId: string,
    achievementId: string,
  ) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 업적을 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    const hostRow = tenures.find((t: any) => t.id === tenureId) as any
    const achievementHostIsSovereign = hostRow?.recordKind === 'SOVEREIGN_REIGN'
    try {
      if (achievementHostIsSovereign) {
        await personCareerApi.deleteSovereignReignAchievement(
          tenureId,
          achievementId,
        )
      } else {
        await personCareerApi.deleteTenureAchievement(tenureId, achievementId)
      }
      if (editingAchievementId === achievementId) resetAchievementForm()
      notify.success('업적이 삭제되었습니다.')
      invalidateTenureQueries(queryClient)
    } catch (err: any) {
      notify.error(err?.message ?? '삭제에 실패했습니다.')
    }
  }

  const resetRegnalEraForm = React.useCallback(() => {
    setEditingRegnalEraId(null)
    setRegnalEraName('')
    setRegnalEraNameEn('')
    setRegnalEraStartYear('')
    setRegnalEraStartMonth('')
    setRegnalEraStartDay('')
    setRegnalEraEndYear('')
    setRegnalEraEndMonth('')
    setRegnalEraEndDay('')
    setRegnalEraChangeReason('')
  }, [])

  const startEditRegnalEra = React.useCallback((era: RegnalEraDto) => {
    setEditingRegnalEraId(era.id)
    setRegnalEraName(era.eraName ?? '')
    setRegnalEraNameEn(era.eraNameEn ?? '')
    setRegnalEraStartYear(era.startYear != null ? String(era.startYear) : '')
    setRegnalEraStartMonth(era.startMonth != null ? String(era.startMonth) : '')
    setRegnalEraStartDay(era.startDay != null ? String(era.startDay) : '')
    setRegnalEraEndYear(era.endYear != null ? String(era.endYear) : '')
    setRegnalEraEndMonth(era.endMonth != null ? String(era.endMonth) : '')
    setRegnalEraEndDay(era.endDay != null ? String(era.endDay) : '')
    setRegnalEraChangeReason(era.changeReason ?? '')
  }, [])

  const parseOptionalMdPart = (s: string): number | undefined => {
    const t = s.trim()
    if (!t) return undefined
    const n = parseInt(t, 10)
    return Number.isFinite(n) ? n : undefined
  }

  const handleRegnalEraSubmit = async () => {
    if (!editingTenureId) return
    if (!regnalEraName.trim()) {
      notify.error('연호명을 입력하세요.')
      return
    }
    const sy = parseInt(regnalEraStartYear.trim(), 10)
    if (!Number.isFinite(sy) || sy < 1) {
      notify.error('시작 연도는 1 이상의 숫자로 입력하세요.')
      return
    }
    const hostRow = tenures.find((t: any) => t.id === editingTenureId) as any
    if (!tenureRowSupportsRegnalEras(hostRow)) {
      notify.error('이 재임에는 연호를 붙일 수 없습니다.')
      return
    }
    const sm = parseOptionalMdPart(regnalEraStartMonth)
    const sd = parseOptionalMdPart(regnalEraStartDay)
    const ey = parseOptionalMdPart(regnalEraEndYear)
    const em = parseOptionalMdPart(regnalEraEndMonth)
    const ed = parseOptionalMdPart(regnalEraEndDay)
    const checkMd = (
      label: string,
      v: number | undefined,
      raw: string,
    ): boolean => {
      if (raw.trim() === '') return true
      if (v === undefined) {
        notify.error(`${label}은(는) 올바른 숫자여야 합니다.`)
        return false
      }
      return true
    }
    if (!checkMd('시작 월', sm, regnalEraStartMonth)) return
    if (!checkMd('시작 일', sd, regnalEraStartDay)) return
    if (!checkMd('종료 연도', ey, regnalEraEndYear)) return
    if (!checkMd('종료 월', em, regnalEraEndMonth)) return
    if (!checkMd('종료 일', ed, regnalEraEndDay)) return
    if (sm != null && (sm < 1 || sm > 12)) {
      notify.error('시작 월은 1–12 사이여야 합니다.')
      return
    }
    if (sd != null && (sd < 1 || sd > 31)) {
      notify.error('시작 일은 1–31 사이여야 합니다.')
      return
    }
    if (em != null && (em < 1 || em > 12)) {
      notify.error('종료 월은 1–12 사이여야 합니다.')
      return
    }
    if (ed != null && (ed < 1 || ed > 31)) {
      notify.error('종료 일은 1–31 사이여야 합니다.')
      return
    }

    const base: CreateRegnalEraDto = {
      eraName: regnalEraName.trim(),
      eraNameEn: regnalEraNameEn.trim() || null,
      startYear: sy,
      startMonth: regnalEraStartMonth.trim() === '' ? null : (sm ?? null),
      startDay: regnalEraStartDay.trim() === '' ? null : (sd ?? null),
      endYear: regnalEraEndYear.trim() === '' ? null : (ey ?? null),
      endMonth: regnalEraEndMonth.trim() === '' ? null : (em ?? null),
      endDay: regnalEraEndDay.trim() === '' ? null : (ed ?? null),
      changeReason: regnalEraChangeReason.trim() || null,
    }

    setRegnalEraSubmitting(true)
    try {
      if (editingRegnalEraId) {
        const patch: Partial<CreateRegnalEraDto> = {
          eraName: base.eraName,
          eraNameEn: base.eraNameEn,
          startYear: base.startYear,
          startMonth: base.startMonth,
          startDay: base.startDay,
          endYear: base.endYear,
          endMonth: base.endMonth,
          endDay: base.endDay,
          changeReason: base.changeReason,
        }
        await personCareerApi.updateRegnalEra(editingRegnalEraId, patch)
        notify.success('연호가 수정되었습니다.')
      } else {
        const isSovereign = hostRow?.recordKind === 'SOVEREIGN_REIGN'
        if (isSovereign) {
          await personCareerApi.createRegnalEraForSovereignReign(
            editingTenureId,
            base,
          )
        } else {
          await personCareerApi.createRegnalEra(editingTenureId, base)
        }
        notify.success('연호가 등록되었습니다.')
      }
      resetRegnalEraForm()
      invalidateTenureQueries(queryClient)
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        (editingRegnalEraId ? '수정에 실패했습니다.' : '등록에 실패했습니다.')
      notify.error(msg)
    } finally {
      setRegnalEraSubmitting(false)
    }
  }

  const handleDeleteRegnalEra = async (eraId: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 연호를 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    try {
      await personCareerApi.deleteRegnalEra(eraId)
      if (editingRegnalEraId === eraId) resetRegnalEraForm()
      notify.success('연호가 삭제되었습니다.')
      invalidateTenureQueries(queryClient)
    } catch (err: any) {
      notify.error(err?.message ?? '삭제에 실패했습니다.')
    }
  }

  const selectedPerson =
    persons.find((p: any) => p.id === selectedPersonId) ??
    allPersonsForModal.find((p: any) => p.id === selectedPersonId) ??
    null

  /** 상단 직책 선택과 계보 직책 선택 통합: 사용자가 선택한 직책이 있으면 우선 사용 */
  const effectivePositionLabel =
    selectedPositionFilter ?? selectedLineagePositionLabel

  /** 계보도에서 선택된 직책의 재임만 사용. 대수/세 없어도 포함(변경백 등은 대수 없음). 정렬: 대수·세 → 재임 시작일 */
  const lineageTenures = React.useMemo(() => {
    const source =
      effectivePositionLabel != null
        ? (tenuresByPosition.find((g) => g.label === effectivePositionLabel)
            ?.tenures ?? [])
        : tenuresUi
    return [...source].sort((a: any, b: any) => {
      const orderA = a.termNumber ?? a.regnalNumber ?? 0
      const orderB = b.termNumber ?? b.regnalNumber ?? 0
      if (orderA !== orderB) return orderA - orderB
      const startA = a.startDate ? new Date(a.startDate).getTime() : 0
      const startB = b.startDate ? new Date(b.startDate).getTime() : 0
      return startA - startB
    })
  }, [tenuresUi, tenuresByPosition, effectivePositionLabel])

  /** 계보 표시 가능한 직책 그룹(재임이 하나 이상인 직책. 대수 없어도 표시 가능) */
  const lineageEligibleGroups = React.useMemo(
    () => tenuresByPosition.filter((g) => g.tenures.length > 0),
    [tenuresByPosition],
  )

  // 계보 직책 선택 초기값: lineage 가능한 첫 번째 직책
  useEffect(() => {
    if (lineageEligibleGroups.length === 0) return
    const labels = new Set(lineageEligibleGroups.map((g) => g.label))
    if (
      selectedLineagePositionLabel == null ||
      !labels.has(selectedLineagePositionLabel)
    ) {
      setSelectedLineagePositionLabel(lineageEligibleGroups[0].label)
    }
  }, [lineageEligibleGroups, selectedLineagePositionLabel])

  /** person id 비교용: trim + 소문자 통일 (UUID/API 대소문자 차이 방지) */
  const normId = (id: unknown) =>
    id != null && id !== '' ? String(id).trim().toLowerCase() : null

  /** person 객체에서 부모 ID 읽기 (camel/snake, 직속/중첩 모두 시도) */
  const getParentIdFromPerson = (p: any) => {
    if (!p || typeof p !== 'object') return null
    const fatherId = normId((p as any)?.fatherId ?? (p as any)?.father_id)
    const motherId = normId((p as any)?.motherId ?? (p as any)?.mother_id)
    if (fatherId) return fatherId
    if (motherId) return motherId
    const inner = (p as any)?.person ?? (p as any)?.data
    if (inner && typeof inner === 'object') {
      const f = normId(inner.fatherId ?? inner.father_id)
      const m = normId(inner.motherId ?? inner.mother_id)
      if (f) return f
      if (m) return m
    }
    return null
  }

  /** 연결선/이전 표시용: 부모가 현재 목록(personIds)에 있을 때만 부모 id 반환 */
  const getParentIdInSet = (p: any, personIds: Set<string>) => {
    const parentId = getParentIdFromPerson(p)
    return parentId && personIds.has(parentId) ? parentId : null
  }

  /** 행 그룹핑용: 부모 id. tenure.person(tenures API) 우선, 없으면 persons 목록에서 조회 */
  const getParentIdFromTenureForRow = (
    t: any,
    _personIds: Set<string>,
    personByIdMap: Map<string, any>,
    personsList: any[],
  ) => {
    const pid = normId(t?.person?.id ?? (t as any)?.personId)
    let parentId = getParentIdFromPerson(t?.person)
    if (parentId) return parentId
    parentId = normId((t as any)?.fatherId ?? (t as any)?.father_id)
    if (parentId) return parentId
    if (pid) {
      const fromList = personsList.find((p: any) => normId(p.id) === pid)
      const p = fromList ?? personByIdMap.get(pid)
      if (p) return getParentIdFromPerson(p)
    }
    return null
  }

  /** personId → full person. 국가 재임 인물 + 전역 재임(교황 등) 인물 포함. lineage 부모-자식 해석용 */
  const personById = React.useMemo(() => {
    const map = new Map<string, any>()
    persons.forEach((p: any) => {
      const k = normId(p.id)
      if (k) map.set(k, p)
    })
    popeTenures.forEach((t: any) => {
      const p = t?.person
      const k = p ? normId(p.id) : null
      if (k && !map.has(k)) map.set(k, p)
    })
    return map
  }, [persons, popeTenures])

  /** 직책별 계보 데이터 (전체일 때 mergedLineageAll에서 사용). 행은 항상 재위/대수 세대별. */
  const lineageByGroup = React.useMemo(() => {
    if (selectedPositionFilter != null) return []
    const orderNum = (t: any) => {
      const n =
        t?.termNumber ?? t?.term_number ?? t?.regnalNumber ?? t?.regnal_number
      if (n == null) return 0
      const num = typeof n === 'number' ? n : parseInt(String(n), 10)
      return Number.isNaN(num) ? 0 : num
    }
    const orderToRowIndex = (order: number) =>
      order <= 1 ? 0 : Math.floor((order - 2) / 2) + 1
    const getPersonId = (t: any) =>
      normId(t?.person?.id ?? (t as any)?.personId)
    return lineageEligibleGroups.map((g) => {
      const withOrder = g.tenures
        .filter((t: any) => t.termNumber != null || t.regnalNumber != null)
        .sort((a: any, b: any) => orderNum(a) - orderNum(b))
      const byRow = new Map<number, any[]>()
      withOrder.forEach((t: any) => {
        const rowIdx = orderToRowIndex(orderNum(t))
        const list = byRow.get(rowIdx) ?? []
        list.push(t)
        byRow.set(rowIdx, list)
      })
      const rows = Array.from(byRow.keys())
        .sort((a, b) => a - b)
        .map((r) =>
          (byRow.get(r) ?? []).sort(
            (a: any, b: any) => orderNum(a) - orderNum(b),
          ),
        )
      const placement = new Map<string, { row: number; col: number }>()
      rows.forEach((row, rowIdx) => {
        row.forEach((t: any, colIdx: number) =>
          placement.set(t.id, { row: rowIdx, col: colIdx }),
        )
      })
      const personIds = new Set(
        withOrder.map(getPersonId).filter((id): id is string => !!id),
      )
      const tenureByPersonId = new Map<string, any>()
      withOrder.forEach((t: any) => {
        const pid = getPersonId(t)
        if (!pid) return
        const existing = tenureByPersonId.get(pid)
        if (!existing || orderNum(existing) < orderNum(t))
          tenureByPersonId.set(pid, t)
      })
      const parentToChildren = new Map<string, string[]>()
      withOrder.forEach((t: any) => {
        const parentPersonId = getParentIdFromTenureForRow(
          t,
          personIds,
          personById,
          persons,
        )
        if (!parentPersonId) return
        const parentTenure = tenureByPersonId.get(parentPersonId)
        if (!parentTenure) return
        const list = parentToChildren.get(parentTenure.id) ?? []
        list.push(t.id)
        parentToChildren.set(parentTenure.id, list)
      })
      return { label: g.label, rows, placement, parentToChildren }
    })
  }, [lineageEligibleGroups, selectedPositionFilter, personById, persons])

  /** 전체일 때: 모든 직책을 세기별로 묶어 하나의 막대·하나의 트리로 표시. 직책 타입 순(국가원수→왕족/귀족) 후 랭크 순 정렬 */
  const mergedLineageAll = React.useMemo(() => {
    if (selectedPositionFilter != null) return null
    const defs = positionDefinitions as any[]
    const getPositionPart = (label: string) =>
      label.includes(' · ') ? (label.split(' · ')[1]?.trim() ?? label) : label
    const getDef = (label: string) => {
      const part = getPositionPart(label)
      return defs.find((d: any) => d.title === part)
    }
    const getRank = (label: string) => getDef(label)?.rank ?? 999
    const getPositionTypeOrder = (label: string) => {
      const def = getDef(label)
      const type = def?.positionType ?? 'OTHER'
      return POSITION_TYPE_ORDER[type] ?? 99
    }
    const all = lineageEligibleGroups.flatMap((g) => g.tenures)
    const sorted = [...all].sort((a: any, b: any) => {
      const oa = a.termNumber ?? a.regnalNumber ?? 0
      const ob = b.termNumber ?? b.regnalNumber ?? 0
      if (oa !== ob) return oa - ob
      const startA = a.startDate ? new Date(a.startDate).getTime() : 0
      const startB = b.startDate ? new Date(b.startDate).getTime() : 0
      return startA - startB
    })
    if (sorted.length === 0) return null
    const getCentury = (t: any) => {
      if (!t?.startDate) return 0
      const y = new Date(t.startDate).getFullYear()
      return Math.floor(y / 100) + (y >= 0 ? 1 : 0)
    }
    const getPosition = (t: any) =>
      lineageEligibleGroups.find((g) =>
        g.tenures.some((x: any) => x.id === t.id),
      )?.label ?? '—'
    const byCentury = new Map<number, any[]>()
    sorted.forEach((t: any) => {
      const c = getCentury(t)
      const list = byCentury.get(c) ?? []
      list.push(t)
      byCentury.set(c, list)
    })
    const parentToChildren = new Map<string, string[]>()
    lineageByGroup.forEach((g) => {
      g.parentToChildren.forEach((childIds, parentId) => {
        parentToChildren.set(parentId, childIds)
      })
    })
    const sortByOrder = (a: any, b: any) => {
      const oa = a.termNumber ?? a.regnalNumber ?? 0
      const ob = b.termNumber ?? b.regnalNumber ?? 0
      if (oa !== ob) return oa - ob
      const startA = a.startDate ? new Date(a.startDate).getTime() : 0
      const startB = b.startDate ? new Date(b.startDate).getTime() : 0
      return startA - startB
    }
    const getPersonId = (t: any) =>
      normId(t?.person?.id ?? (t as any)?.personId)
    const centuries = Array.from(byCentury.keys()).sort((a, b) => a - b)
    const positionsOrder = [...lineageEligibleGroups]
      .sort((a, b) => {
        const orderA = getPositionTypeOrder(a.label)
        const orderB = getPositionTypeOrder(b.label)
        if (orderA !== orderB) return orderA - orderB
        return getRank(a.label) - getRank(b.label)
      })
      .map((g) => g.label)
    const allRows: any[][] = []
    centuries.forEach((c) => {
      const tenuresInCentury = byCentury.get(c) ?? []
      const byPos = new Map<string, any[]>()
      tenuresInCentury.forEach((t: any) => {
        const pos = getPosition(t)
        const list = byPos.get(pos) ?? []
        list.push(t)
        byPos.set(pos, list)
      })
      const orderNum = (t: any) => {
        const n =
          t?.termNumber ?? t?.term_number ?? t?.regnalNumber ?? t?.regnal_number
        if (n == null) return 0
        const num = typeof n === 'number' ? n : parseInt(String(n), 10)
        return Number.isNaN(num) ? 0 : num
      }
      const orderToRowIndex = (order: number) =>
        order <= 1 ? 0 : Math.floor((order - 2) / 2) + 1
      const subRowByTenureId = new Map<string, number>()
      const startTime = (t: any) =>
        t?.startDate ? new Date(t.startDate).getTime() : 0
      positionsOrder.forEach((pos) => {
        const list = (byPos.get(pos) ?? []).sort(
          (a: any, b: any) =>
            orderNum(a) - orderNum(b) || startTime(a) - startTime(b),
        )
        if (list.length === 0) return
        const byRow = new Map<number, any[]>()
        list.forEach((t: any) => {
          const rowIdx = orderToRowIndex(orderNum(t))
          const arr = byRow.get(rowIdx) ?? []
          arr.push(t)
          byRow.set(rowIdx, arr)
        })
        const positionRows = Array.from(byRow.keys())
          .sort((a, b) => a - b)
          .map((r) =>
            (byRow.get(r) ?? []).sort(
              (a: any, b: any) =>
                orderNum(a) - orderNum(b) || startTime(a) - startTime(b),
            ),
          )
        positionRows.forEach((row, rowIdx) => {
          row.forEach((t: any) => subRowByTenureId.set(t.id, rowIdx))
        })
      })
      const maxSubRow = Math.max(0, ...Array.from(subRowByTenureId.values()))
      const rowGroups: any[][] = []
      for (let sr = 0; sr <= maxSubRow; sr++) {
        const rowTenures = tenuresInCentury.filter(
          (t: any) => subRowByTenureId.get(t.id) === sr,
        )
        if (rowTenures.length > 0) rowGroups.push(rowTenures)
      }
      const minStart = (row: any[]) =>
        Math.min(
          ...row.map((t: any) =>
            t.startDate ? new Date(t.startDate).getTime() : 0,
          ),
        )
      rowGroups.sort((a, b) => minStart(a) - minStart(b))
      rowGroups.forEach((r) => allRows.push(r))
    })
    const maxPerPosition = new Map<string, number>()
    allRows.forEach((row) => {
      const byPos = new Map<string, number>()
      row.forEach((t: any) => {
        const pos = getPosition(t)
        byPos.set(pos, (byPos.get(pos) ?? 0) + 1)
      })
      positionsOrder.forEach((pos) => {
        const count = byPos.get(pos) ?? 0
        if (count > 0)
          maxPerPosition.set(pos, Math.max(maxPerPosition.get(pos) ?? 0, count))
      })
    })
    /** 데이터가 있는 직책만 열로 사용해 빈 공간 축소 */
    const positionsWithData = positionsOrder.filter(
      (pos) => (maxPerPosition.get(pos) ?? 0) > 0,
    )
    let colStart = 0
    const columnStartByPosition = new Map<string, number>()
    /* 직책(국가·직책) 그룹당 열 1개. 같은 그룹 수반은 연도 기준 레이아웃에서 같은 열에 세로로 쌓임 */
    positionsWithData.forEach((pos) => {
      columnStartByPosition.set(pos, colStart)
      colStart += 1
    })
    const rows = allRows
    const placement = new Map<string, { row: number; col: number }>()
    rows.forEach((row, rowIdx) => {
      const byPos = new Map<string, any[]>()
      row.forEach((t: any) => {
        const pos = getPosition(t)
        const list = byPos.get(pos) ?? []
        list.push(t)
        byPos.set(pos, list)
      })
      positionsWithData.forEach((pos) => {
        const list = (byPos.get(pos) ?? []).sort(sortByOrder)
        const startCol = columnStartByPosition.get(pos) ?? 0
        list.forEach((t: any) => {
          placement.set(t.id, { row: rowIdx, col: startCol })
        })
      })
    })
    const separatorBeforeCols = positionsWithData
      .slice(1)
      .map((pos) => columnStartByPosition.get(pos))
      .filter((c): c is number => c != null)
    const positionHeaders = positionsWithData.map((pos) => ({
      label: toDisplayPositionLabel(pos),
      startCol: columnStartByPosition.get(pos) ?? 0,
      colCount: 1,
    }))
    const allTenures = rows.flat()
    const getYear = (s: string | null | undefined): number | null => {
      if (!s) return null
      const y = parseInt(String(s).slice(0, 4), 10)
      return Number.isNaN(y) ? null : y
    }
    let minYear = Infinity
    let maxYear = -Infinity
    allTenures.forEach((t: any) => {
      const start = getYear(t.startDate)
      const end = getYear(t.endDate)
      const endY = end ?? (start != null ? new Date().getFullYear() : null)
      if (start != null) minYear = Math.min(minYear, start)
      if (endY != null) maxYear = Math.max(maxYear, endY)
    })
    const yearRange =
      minYear !== Infinity && maxYear !== -Infinity && maxYear >= minYear
        ? { minYear, maxYear: Math.max(maxYear, minYear + 1) }
        : undefined
    return {
      rows,
      placement,
      parentToChildren,
      separatorBeforeCols,
      positionHeaders,
      yearRange,
    }
  }, [
    lineageEligibleGroups,
    selectedPositionFilter,
    lineageByGroup,
    positionDefinitions,
    personById,
    persons,
    toDisplayPositionLabel,
  ])

  /** 재임 ID → 직책명 (카드에 직책 뱃지 표시용, 전체 보기에서 사용) */
  const tenureIdToPositionLabel = React.useMemo(() => {
    const m = new Map<string, string>()
    tenuresByPosition.forEach((g) =>
      g.tenures.forEach((t: any) => m.set(t.id, g.label)),
    )
    return m
  }, [tenuresByPosition])
  const getPositionLabel = (t: any) =>
    tenureIdToPositionLabel.get(t.id) ?? (t.title || t.position?.title) ?? '—'

  /** 계보도 카드용: 재임 인물의 가문명 (tenure.person.dynasty 우선, 없으면 persons 목록에서 조회) */
  const getDynastyNameForTenure = React.useCallback(
    (t: any) => {
      const fromTenure = (
        t?.person as { dynasty?: { name: string } } | undefined
      )?.dynasty?.name
      if (fromTenure) return fromTenure
      const pid = normId(t?.person?.id ?? (t as any)?.personId)
      if (!pid) return null
      const p =
        personById.get(pid) ?? persons.find((x: any) => normId(x.id) === pid)
      return (
        (p as { dynasty?: { name: string } } | undefined)?.dynasty?.name ?? null
      )
    },
    [personById, persons],
  )

  /** 세대별 그룹: 재위/대수로 행 배치. 1대만 첫 행, 2·3대 같은 행, 4·5대 같은 행 … (형제 가로 배치). */
  const lineageRows = React.useMemo(() => {
    if (lineageTenures.length === 0) return []
    const orderNum = (t: any) => {
      const n =
        t?.termNumber ?? t?.term_number ?? t?.regnalNumber ?? t?.regnal_number
      if (n == null) return 0
      const num = typeof n === 'number' ? n : parseInt(String(n), 10)
      return Number.isNaN(num) ? 0 : num
    }
    /** order 1 → row 0, order 2,3 → row 1, order 4,5 → row 2, … */
    const orderToRowIndex = (order: number) =>
      order <= 1 ? 0 : Math.floor((order - 2) / 2) + 1
    const byRow = new Map<number, any[]>()
    lineageTenures.forEach((t: any) => {
      const order = orderNum(t)
      const rowIdx = orderToRowIndex(order)
      const list = byRow.get(rowIdx) ?? []
      list.push(t)
      byRow.set(rowIdx, list)
    })
    const rowIndexes = Array.from(byRow.keys()).sort((a, b) => a - b)
    const startTime = (t: any) =>
      t?.startDate ? new Date(t.startDate).getTime() : 0
    const rows = rowIndexes.map((r) =>
      (byRow.get(r) ?? []).sort(
        (a: any, b: any) =>
          orderNum(a) - orderNum(b) || startTime(a) - startTime(b),
      ),
    )
    return rows.length > 0 ? rows : [lineageTenures]
  }, [lineageTenures])

  /** 노드 배치: tenure id -> { row, col } (가계도 SVG/그리드용) */
  const lineagePlacement = React.useMemo(() => {
    const map = new Map<string, { row: number; col: number }>()
    lineageRows.forEach((row, rowIdx) => {
      row.forEach((t: any, colIdx: number) =>
        map.set(t.id, { row: rowIdx, col: colIdx }),
      )
    })
    return map
  }, [lineageRows])

  /** 부모 tenure id -> 자식 tenure id[] (연결선 그리기용). 서버 persons의 fatherId 기준. */
  const parentToChildren = React.useMemo(() => {
    const getPersonId = (t: any) =>
      normId(t?.person?.id ?? (t as any)?.personId)
    const personIds = new Set<string>(
      lineageTenures.map(getPersonId).filter((id): id is string => id != null),
    )
    const tenureByPersonId = new Map<string, any>()
    lineageTenures.forEach((t: any) => {
      const pid = getPersonId(t)
      if (!pid) return
      const existing = tenureByPersonId.get(pid)
      const order = t.termNumber ?? t.regnalNumber ?? 0
      if (
        !existing ||
        (existing.termNumber ?? existing.regnalNumber ?? 0) > order
      )
        tenureByPersonId.set(pid, t)
    })
    const map = new Map<string, string[]>()
    lineageTenures.forEach((t: any) => {
      const parentPersonId = getParentIdFromTenureForRow(
        t,
        personIds,
        personById,
        persons,
      )
      if (!parentPersonId) return
      const parentTenure = tenureByPersonId.get(parentPersonId)
      if (!parentTenure) return
      const list = map.get(parentTenure.id) ?? []
      list.push(t.id)
      map.set(parentTenure.id, list)
    })
    return map
  }, [lineageTenures, personById, persons])

  const showLineageTab = lineageEligibleGroups.length > 0

  return (
    <SectionOuter $embedded={embedded}>
      {view === 'list' ? (
        <div style={{ position: 'relative', minHeight: '400px' }}>
          <AnimatePresence mode="wait">
            {showLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: FADE_DURATION,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  color: '#64748b',
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      border: `4px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                      borderTopColor: '#6366f1',
                      borderRadius: '50%',
                      margin: '0 auto 16px',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <p>인물 데이터를 불러오는 중...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: FADE_DURATION,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                <ListWrap $lineageMode={listViewMode === 'lineage'}>
                  <ListHead>
                    <ListHeadLeft>
                      {tenuresByPosition.length > 0 && (
                        <PositionFilterTabs
                          role="tablist"
                          aria-label="직책 선택"
                        >
                          <PositionFilterTab
                            role="tab"
                            type="button"
                            $active={selectedPositionFilter == null}
                            onClick={() => {
                              setSelectedPositionFilter(null)
                              setSelectedLineagePositionLabel(
                                lineageEligibleGroups.length > 0
                                  ? lineageEligibleGroups[0].label
                                  : null,
                              )
                            }}
                          >
                            전체
                          </PositionFilterTab>
                          {tenuresByPosition.map((g) => (
                            <PositionFilterTab
                              key={g.label}
                              role="tab"
                              type="button"
                              $active={selectedPositionFilter === g.label}
                              onClick={() => {
                                setSelectedPositionFilter(g.label)
                                setSelectedLineagePositionLabel(g.label)
                              }}
                            >
                              {toDisplayPositionLabel(g.label)} (
                              {g.tenures.length})
                            </PositionFilterTab>
                          ))}
                        </PositionFilterTabs>
                      )}
                      <ListTitle>
                        {listViewMode === 'lineage' && lineageTenures.length > 0
                          ? effectivePositionLabel
                            ? `${toDisplayPositionLabel(effectivePositionLabel)} 계보`
                            : (country as { name?: string })?.name
                              ? `${(country as { name: string }).name} 역대 수반 계보`
                              : '역대 수반 계보'
                          : '재임 목록'}
                        {tenuresUi.length > 0 && (
                          <span className="count">
                            {selectedPositionFilter != null
                              ? (tenuresByPosition.find(
                                  (g) => g.label === selectedPositionFilter,
                                )?.tenures.length ?? 0)
                              : tenuresUi.length}
                            건
                          </span>
                        )}
                      </ListTitle>
                    </ListHeadLeft>
                    {/* 목록 검색창 — 목록 뷰일 때만 노출 */}
                    {listViewMode === 'list' && tenuresUi.length > 0 && (
                      <TenureSearchWrap>
                        <TenureSearchIcon>
                          <FiSearch size={14} />
                        </TenureSearchIcon>
                        <TenureSearchInput
                          type="text"
                          placeholder="이름, 직책, 연도 검색"
                          value={tenureSearchQuery}
                          onChange={(e) => setTenureSearchQuery(e.target.value)}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = isDark
                              ? 'rgba(99,102,241,0.6)'
                              : '#a5b4fc'
                            e.currentTarget.style.background = isDark
                              ? 'rgba(255,255,255,0.08)'
                              : '#fff'
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = isDark
                              ? 'rgba(255,255,255,0.12)'
                              : '#e2e8f0'
                            e.currentTarget.style.background = isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#f8fafc'
                          }}
                        />
                        {tenureSearchQuery ? (
                          <TenureSearchClear
                            type="button"
                            onClick={() => setTenureSearchQuery('')}
                            aria-label="검색어 지우기"
                          >
                            <FiX size={12} />
                          </TenureSearchClear>
                        ) : (
                          <span
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#c8d0da',
                              pointerEvents: 'none',
                            }}
                          >
                            {tenuresUi.length}개
                          </span>
                        )}
                      </TenureSearchWrap>
                    )}
                    {/* 보기 방식 탭 — 우측 분리 배치 */}
                    {showLineageTab && (
                      <>
                        <LineageDivider />
                        <ViewModeTabs role="tablist" aria-label="보기 방식">
                          <ViewModeTab
                            role="tab"
                            aria-selected={listViewMode === 'lineage'}
                            $active={listViewMode === 'lineage'}
                            onClick={() => setListViewMode('lineage')}
                          >
                            계보도
                          </ViewModeTab>
                          <ViewModeTab
                            role="tab"
                            aria-selected={listViewMode === 'list'}
                            $active={listViewMode === 'list'}
                            onClick={() => setListViewMode('list')}
                          >
                            목록
                          </ViewModeTab>
                        </ViewModeTabs>
                        <LineageDivider />
                      </>
                    )}
                    <AddTenureButton
                      type="button"
                      onClick={() => {
                        resetForm()
                        setView('register')
                      }}
                    >
                      <FiPlus size={20} />
                      수반 등록
                    </AddTenureButton>
                    <SettingsButton
                      type="button"
                      onClick={() => setSettingsModalOpen(true)}
                      aria-label="역대 수반 설정"
                    >
                      <FiSettings size={16} />
                    </SettingsButton>
                  </ListHead>
                  {tenuresUi.length === 0 ? (
                    <EmptyState>
                      <EmptyIconWrap>
                        <FiUser size={40} />
                      </EmptyIconWrap>
                      <EmptyTitle>등록된 재임 기록이 없습니다</EmptyTitle>
                      <EmptyDesc>
                        수반 등록 버튼을 눌러 재임 기록을 추가해 보세요.
                      </EmptyDesc>
                      <EmptyDesc
                        style={{ marginTop: 8, fontSize: 13, color: '#94a3b8' }}
                      >
                        행정부·각료는 <strong>행정조직 → 행정부</strong> 탭에서
                        새 수반과 함께 한 번에 등록할 수 있습니다.
                      </EmptyDesc>
                    </EmptyState>
                  ) : listViewMode === 'lineage' &&
                    (selectedPositionFilter == null
                      ? mergedLineageAll != null
                      : lineageTenures.length > 0) ? (
                    <LineageWrap>
                      {selectedPositionFilter == null && mergedLineageAll ? (
                        <LineageTree
                          rows={mergedLineageAll.rows}
                          placement={mergedLineageAll.placement}
                          parentToChildren={emptyMap}
                          variableCardHeight
                          yearRange={mergedLineageAll.yearRange}
                          getPersonName={getPersonName}
                          formatDate={formatDate}
                          getRegnalNameFromNotes={getRegnalNameFromNotes}
                          getPositionLabel={getPositionLabel}
                          getDynastyNameForTenure={getDynastyNameForTenure}
                          separatorBeforeCols={
                            mergedLineageAll.separatorBeforeCols
                          }
                          positionHeaders={mergedLineageAll.positionHeaders}
                          onCardClick={(tenureId) => {
                            setCabinetModalTenureId(
                              resolveHeadTenureIdForCabinetModal(tenureId),
                            )
                          }}
                        />
                      ) : (
                        <LineageTree
                          rows={lineageRows}
                          placement={lineagePlacement}
                          parentToChildren={emptyMap}
                          getPersonName={getPersonName}
                          formatDate={formatDate}
                          getRegnalNameFromNotes={getRegnalNameFromNotes}
                          getDynastyNameForTenure={getDynastyNameForTenure}
                          onCardClick={(tenureId) => {
                            setCabinetModalTenureId(
                              resolveHeadTenureIdForCabinetModal(tenureId),
                            )
                          }}
                        />
                      )}
                    </LineageWrap>
                  ) : (
                    <>
                      {(selectedPositionFilter != null
                        ? tenuresByPosition.filter(
                            (g) => g.label === selectedPositionFilter,
                          )
                        : tenuresByPosition
                      )
                        .map(
                          ({
                            label,
                            tenures: groupTenures,
                          }): React.ReactNode => {
                            const filteredTenures = groupTenures.filter(
                              (t: any) => {
                                if (!tenureSearchQuery.trim()) return true
                                const q = tenureSearchQuery.trim().toLowerCase()
                                const name = getPersonName(
                                  t.person,
                                ).toLowerCase()
                                const regnal =
                                  getRegnalNameFromNotes(
                                    t.notes,
                                  )?.toLowerCase() ?? ''
                                const title = (
                                  t.title ||
                                  t.position?.title ||
                                  ''
                                ).toLowerCase()
                                const startYear = t.startDate
                                  ? String(t.startDate).slice(0, 4)
                                  : ''
                                const endYear = t.endDate
                                  ? String(t.endDate).slice(0, 4)
                                  : ''
                                return (
                                  name.includes(q) ||
                                  regnal.includes(q) ||
                                  title.includes(q) ||
                                  startYear.includes(q) ||
                                  endYear.includes(q)
                                )
                              },
                            )
                            if (filteredTenures.length === 0) return null

                            const rows: any[][] = []
                            for (
                              let i = 0;
                              i < filteredTenures.length;
                              i += HEADS_TL_ROW_SIZE
                            ) {
                              rows.push(
                                filteredTenures.slice(i, i + HEADS_TL_ROW_SIZE),
                              )
                            }

                            return (
                              <div key={label} style={{ marginBottom: 24 }}>
                                <PositionSectionTitle>
                                  {toDisplayPositionLabel(label)}{' '}
                                  <span className="count">
                                    {filteredTenures.length}명
                                  </span>
                                </PositionSectionTitle>
                                {/* 직책 그룹 요약 바 */}
                                {(() => {
                                  const years = filteredTenures.flatMap(
                                    (t: any) => {
                                      const s = t.startDate
                                        ? new Date(t.startDate).getFullYear()
                                        : null
                                      return s ? [s] : []
                                    },
                                  )
                                  const minY = years.length
                                    ? Math.min(...years)
                                    : null
                                  const maxY = years.length
                                    ? Math.max(...years)
                                    : null
                                  return (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '6px 20px 10px',
                                        borderBottom: '1px solid #f0f2f5',
                                        background: '#fafbfc',
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 5,
                                        }}
                                      >
                                        <FiUsers size={12} color="#94a3b8" />
                                        <span
                                          style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: '#334155',
                                          }}
                                        >
                                          {filteredTenures.length}명
                                        </span>
                                      </div>
                                      {minY && (
                                        <>
                                          <div
                                            style={{
                                              width: 1,
                                              height: 10,
                                              background: '#e2e8f0',
                                            }}
                                          />
                                          <div
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 5,
                                            }}
                                          >
                                            <FiCalendar
                                              size={11}
                                              color="#94a3b8"
                                            />
                                            <span
                                              style={{
                                                fontSize: 12,
                                                color: '#64748b',
                                              }}
                                            >
                                              {minY} – {maxY ?? '현재'}
                                            </span>
                                          </div>
                                        </>
                                      )}
                                      <div style={{ flex: 1 }} />
                                      <div style={{ display: 'flex', gap: 4 }}>
                                        {HEADS_TL_ROWS.map((r, i) => (
                                          <div
                                            key={i}
                                            style={{
                                              width: 8,
                                              height: 8,
                                              borderRadius: '50%',
                                              background: r.line,
                                            }}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })()}

                                {rows.map((rowItems, rowIdx) => {
                                  const p =
                                    HEADS_TL_ROWS[rowIdx % HEADS_TL_ROWS.length]
                                  const isReversed = rowIdx % 2 === 1
                                  const displayItems = isReversed
                                    ? [...rowItems].reverse()
                                    : rowItems
                                  const isLastRow = rowIdx === rows.length - 1

                                  return (
                                    <div
                                      key={rowIdx}
                                      style={{
                                        background: isDark
                                          ? 'rgba(255,255,255,0.02)'
                                          : '#fff',
                                        borderBottom:
                                          rowIdx < rows.length - 1
                                            ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f2f5'}`
                                            : 'none',
                                      }}
                                    >
                                      {/* 행 레이블 */}
                                      {(() => {
                                        const firstTerm =
                                          rowItems[0]?.regnalNumber ??
                                          rowItems[0]?.termNumber
                                        const lastTerm =
                                          rowItems[rowItems.length - 1]
                                            ?.regnalNumber ??
                                          rowItems[rowItems.length - 1]
                                            ?.termNumber
                                        const rangeLabel =
                                          firstTerm != null && lastTerm != null
                                            ? firstTerm === lastTerm
                                              ? `제${firstTerm}대`
                                              : `제${firstTerm}–${lastTerm}대`
                                            : `${rowIdx * HEADS_TL_ROW_SIZE + 1}번째 행`
                                        return (
                                          <div
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              padding: '10px 24px 0',
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: 4,
                                                height: 16,
                                                borderRadius: 2,
                                                background: p.line,
                                                flexShrink: 0,
                                              }}
                                            />
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: p.line,
                                                letterSpacing: '0.04em',
                                              }}
                                            >
                                              {rangeLabel}
                                            </span>
                                            <div
                                              style={{
                                                flex: 1,
                                                height: 1,
                                                background: `linear-gradient(90deg, ${p.line}33, transparent)`,
                                              }}
                                            />
                                            <span
                                              style={{
                                                fontSize: 10.5,
                                                color: '#c8d0da',
                                              }}
                                            >
                                              {rowItems.length}명
                                            </span>
                                          </div>
                                        )
                                      })()}
                                      <div
                                        style={{
                                          position: 'relative',
                                          height: HEADS_ROW_H,
                                          padding: '0 20px',
                                        }}
                                      >
                                        {/* 수평선 — 노드 X 기준으로 좌측 시작 */}
                                        <div
                                          style={{
                                            position: 'absolute',
                                            left: 20 + HEADS_BUBBLE_W / 2,
                                            right: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            height: 3,
                                            background: `linear-gradient(90deg, ${p.line}cc, ${p.line}33)`,
                                            zIndex: 0,
                                          }}
                                        />

                                        {/* 아이템 그리드 */}
                                        <div
                                          style={{
                                            display: 'grid',
                                            gridTemplateColumns: `repeat(${HEADS_TL_ROW_SIZE}, 1fr)`,
                                            height: '100%',
                                            gap: '0 8px',
                                            position: 'relative',
                                            zIndex: 1,
                                          }}
                                        >
                                          {Array.from({
                                            length: HEADS_TL_ROW_SIZE,
                                          }).map((_, colIdx) => {
                                            const t = displayItems[colIdx]
                                            if (!t)
                                              return <div key={`e-${colIdx}`} />

                                            const titleText =
                                              t.title ||
                                              t.position?.title ||
                                              '—'
                                            const regnalFromNotes =
                                              getRegnalNameFromNotes(t.notes)
                                            const lifespan =
                                              formatPersonLifespan(t.person)
                                            const ageAtStart = calcAgeAtTenure(
                                              t.person,
                                              t.startDate,
                                            )
                                            const startYear = t.startDate
                                              ? new Date(
                                                  t.startDate,
                                                ).getFullYear()
                                              : null
                                            const endYear = t.endDate
                                              ? new Date(
                                                  t.endDate,
                                                ).getFullYear()
                                              : null
                                            const range = startYear
                                              ? `${startYear}–${endYear ?? '현재'}`
                                              : '—'
                                            const termLabel =
                                              t.regnalNumber != null
                                                ? `${t.regnalNumber}세`
                                                : t.termNumber != null
                                                  ? `제${t.termNumber}대`
                                                  : null
                                            const thumbUrl =
                                              t.person?.profileImageUrl ?? null
                                            const personName = getPersonName(
                                              t.person,
                                            )
                                            const birthPlace = ((
                                              t.person as any
                                            )?.birthCity?.name ??
                                              (t.person as any)
                                                ?.birthAdminDivision?.name ??
                                              (t.person as any)
                                                ?.birthPlaceText ??
                                              null) as string | null
                                            const dynastyName =
                                              (t.person as any)?.dynasty
                                                ?.name ?? null
                                            const itemOnTop = colIdx % 2 === 0

                                            return (
                                              <div
                                                key={t.id}
                                                role="button"
                                                tabIndex={0}
                                                style={{
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  alignItems: 'flex-start',
                                                  height: '100%',
                                                  cursor: 'pointer',
                                                  padding: '0 4px',
                                                }}
                                                onClick={() => {
                                                  setEditingTenureId(t.id)
                                                  setView('register')
                                                }}
                                                onKeyDown={(e) => {
                                                  if (
                                                    e.key === 'Enter' ||
                                                    e.key === ' '
                                                  ) {
                                                    e.preventDefault()
                                                    setEditingTenureId(t.id)
                                                    setView('register')
                                                  }
                                                }}
                                              >
                                                {/* 위쪽 */}
                                                <div
                                                  style={{
                                                    flex: 1,
                                                    width: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'flex-end',
                                                    paddingBottom: 8,
                                                  }}
                                                >
                                                  {itemOnTop ? (
                                                    <div
                                                      style={{
                                                        width: '100%',
                                                        transition:
                                                          'transform 0.18s ease, opacity 0.15s',
                                                      }}
                                                      onMouseEnter={(e) => {
                                                        ;(
                                                          e.currentTarget as HTMLDivElement
                                                        ).style.transform =
                                                          'translateY(-3px)'
                                                        ;(
                                                          e.currentTarget as HTMLDivElement
                                                        ).style.opacity = '0.92'
                                                      }}
                                                      onMouseLeave={(e) => {
                                                        ;(
                                                          e.currentTarget as HTMLDivElement
                                                        ).style.transform =
                                                          'translateY(0)'
                                                        ;(
                                                          e.currentTarget as HTMLDivElement
                                                        ).style.opacity = '1'
                                                      }}
                                                    >
                                                      <HeadsTlCard
                                                        thumbUrl={thumbUrl}
                                                        personName={personName}
                                                        titleText={titleText}
                                                        range={range}
                                                        ageAtStart={ageAtStart}
                                                        birthPlace={birthPlace}
                                                        lifespan={
                                                          lifespan !==
                                                          '생몰년 미상'
                                                            ? lifespan
                                                            : null
                                                        }
                                                        regnalName={
                                                          regnalFromNotes
                                                        }
                                                        dynastyName={
                                                          dynastyName
                                                        }
                                                        achievements={
                                                          t.achievements ?? []
                                                        }
                                                        lineColor={p.line}
                                                        textColor={p.textColor}
                                                        isDark={isDark}
                                                        adminTenureHint={adminTenureHintFromRow(
                                                          t,
                                                        )}
                                                      />
                                                    </div>
                                                  ) : (
                                                    <div
                                                      style={{
                                                        display: 'inline-flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        background: isDark
                                                          ? 'rgba(255,255,255,0.06)'
                                                          : '#fff',
                                                        border: `2.5px solid ${p.line}`,
                                                        borderRadius: 28,
                                                        padding: '6px 14px',
                                                        minWidth:
                                                          HEADS_BUBBLE_W,
                                                        boxShadow: `0 2px 10px ${p.line}44`,
                                                        textAlign: 'center',
                                                      }}
                                                    >
                                                      <span
                                                        style={{
                                                          fontSize: 17,
                                                          fontWeight: 900,
                                                          color: p.textColor,
                                                          letterSpacing:
                                                            '-0.03em',
                                                          lineHeight: 1.2,
                                                        }}
                                                      >
                                                        {startYear ?? '—'}
                                                      </span>
                                                      {termLabel && (
                                                        <span
                                                          style={{
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                            color: p.line,
                                                            marginTop: 1,
                                                          }}
                                                        >
                                                          {termLabel}
                                                        </span>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>

                                                {/* 수직선 + 노드 — 버블 중앙 정렬 */}
                                                <div
                                                  style={{
                                                    width: 2,
                                                    height: 10,
                                                    background: p.line,
                                                    opacity: 0.6,
                                                    marginLeft:
                                                      HEADS_BUBBLE_W / 2 - 1,
                                                    flexShrink: 0,
                                                  }}
                                                />
                                                <div
                                                  style={{
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: '50%',
                                                    background: isDark
                                                      ? '#1e1e2e'
                                                      : '#fff',
                                                    border: `3px solid ${p.line}`,
                                                    boxShadow: `0 0 0 3px ${isDark ? '#1e1e2e' : '#fff'}`,
                                                    marginLeft:
                                                      HEADS_BUBBLE_W / 2 - 7,
                                                    flexShrink: 0,
                                                    zIndex: 2,
                                                  }}
                                                />
                                                <div
                                                  style={{
                                                    width: 2,
                                                    height: 10,
                                                    background: p.line,
                                                    opacity: 0.6,
                                                    marginLeft:
                                                      HEADS_BUBBLE_W / 2 - 1,
                                                    flexShrink: 0,
                                                  }}
                                                />

                                                {/* 아래쪽 */}
                                                <div
                                                  style={{
                                                    flex: 1,
                                                    width: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-start',
                                                    justifyContent:
                                                      'flex-start',
                                                    paddingTop: 8,
                                                  }}
                                                >
                                                  {!itemOnTop ? (
                                                    <div
                                                      style={{
                                                        width: '100%',
                                                        transition:
                                                          'transform 0.18s ease, opacity 0.15s',
                                                      }}
                                                      onMouseEnter={(e) => {
                                                        ;(
                                                          e.currentTarget as HTMLDivElement
                                                        ).style.transform =
                                                          'translateY(3px)'
                                                        ;(
                                                          e.currentTarget as HTMLDivElement
                                                        ).style.opacity = '0.92'
                                                      }}
                                                      onMouseLeave={(e) => {
                                                        ;(
                                                          e.currentTarget as HTMLDivElement
                                                        ).style.transform =
                                                          'translateY(0)'
                                                        ;(
                                                          e.currentTarget as HTMLDivElement
                                                        ).style.opacity = '1'
                                                      }}
                                                    >
                                                      <HeadsTlCard
                                                        thumbUrl={thumbUrl}
                                                        personName={personName}
                                                        titleText={titleText}
                                                        range={range}
                                                        ageAtStart={ageAtStart}
                                                        birthPlace={birthPlace}
                                                        lifespan={
                                                          lifespan !==
                                                          '생몰년 미상'
                                                            ? lifespan
                                                            : null
                                                        }
                                                        regnalName={
                                                          regnalFromNotes
                                                        }
                                                        dynastyName={
                                                          dynastyName
                                                        }
                                                        achievements={
                                                          t.achievements ?? []
                                                        }
                                                        lineColor={p.line}
                                                        textColor={p.textColor}
                                                        isDark={isDark}
                                                        adminTenureHint={adminTenureHintFromRow(
                                                          t,
                                                        )}
                                                      />
                                                    </div>
                                                  ) : (
                                                    <div
                                                      style={{
                                                        display: 'inline-flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        background: isDark
                                                          ? 'rgba(255,255,255,0.06)'
                                                          : '#fff',
                                                        border: `2.5px solid ${p.line}`,
                                                        borderRadius: 28,
                                                        padding: '6px 14px',
                                                        minWidth:
                                                          HEADS_BUBBLE_W,
                                                        boxShadow: `0 2px 10px ${p.line}44`,
                                                        textAlign: 'center',
                                                      }}
                                                    >
                                                      <span
                                                        style={{
                                                          fontSize: 17,
                                                          fontWeight: 900,
                                                          color: p.textColor,
                                                          letterSpacing:
                                                            '-0.03em',
                                                          lineHeight: 1.2,
                                                        }}
                                                      >
                                                        {startYear ?? '—'}
                                                      </span>
                                                      {termLabel && (
                                                        <span
                                                          style={{
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                            color: p.line,
                                                            marginTop: 1,
                                                          }}
                                                        >
                                                          {termLabel}
                                                        </span>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          },
                        )
                        .filter(Boolean)}
                    </>
                  )}
                </ListWrap>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <FormCardWrapper>
          <HeadsFormHeader>
            <BackButton
              type="button"
              onClick={() => {
                setEditingTenureId(null)
                setView('list')
              }}
            >
              <FiArrowLeft size={18} />
              목록 보기
            </BackButton>
            <HeadsFormTitle>
              {editingTenureId ? '수반 수정' : '수반 등록'}
            </HeadsFormTitle>
            <HeadsSubmitButton
              type="submit"
              form="heads-of-state-register-form"
              disabled={
                isSubmitting ||
                !selectedPersonId ||
                (!title.trim() && !selectedPositionDefinitionId) ||
                !startDate
              }
            >
              <FiSave size={16} />
              {isSubmitting ? '저장 중…' : '저장'}
            </HeadsSubmitButton>
          </HeadsFormHeader>
          <form id="heads-of-state-register-form" onSubmit={handleAddSubmit}>
            <FormSectionInner>
              {editingTenureId ? (
                <>
                  <TabNavigation>
                    <TabButton
                      type="button"
                      $active={tenureFormTab === 'basic'}
                      onClick={() => setTenureFormTab('basic')}
                    >
                      <FiInfo size={16} />
                      기본정보
                    </TabButton>
                    <TabButton
                      type="button"
                      $active={tenureFormTab === 'achievement'}
                      onClick={() => setTenureFormTab('achievement')}
                    >
                      <FiAward size={16} />
                      업적
                    </TabButton>
                    {editingHostSupportsRegnalEras && (
                      <TabButton
                        type="button"
                        $active={tenureFormTab === 'regnalEra'}
                        onClick={() => setTenureFormTab('regnalEra')}
                      >
                        <FiBook size={16} />
                        연호
                      </TabButton>
                    )}
                  </TabNavigation>
                  {tenureFormTab === 'basic' && (
                    <TabPanel>
                      <SubSectionTitle>기본정보</SubSectionTitle>
                      <SectionHint>
                        재임 기간·직책·인물 등 기본 정보를 입력합니다.
                      </SectionHint>
                      <FormRows>
                        {!isHistorical && hasSubordinateHistorical && (
                          <FieldRow>
                            <FieldLabel>소속 국가</FieldLabel>
                            <FieldControl>
                              <SelectTriggerButton
                                type="button"
                                onClick={() =>
                                  setAffinityCountryModalOpen(true)
                                }
                                $hasValue
                              >
                                <span>
                                  {selectedAffinityHistoricalId
                                    ? ((subordinateHistorical as any[]).find(
                                        (h: any) =>
                                          h.id === selectedAffinityHistoricalId,
                                      )?.name ?? '역사적 국가')
                                    : `현대 국가 (현재: ${country.name})`}
                                </span>
                                <FiChevronDown size={20} />
                              </SelectTriggerButton>
                              <FieldHint>
                                현대 국가 또는 연결된 하위 역사적 국가 중 하나를
                                선택하세요.
                              </FieldHint>
                            </FieldControl>
                          </FieldRow>
                        )}
                        <PersonSelectField
                          label="인물"
                          required
                          hint="재임 기록에 연결할 인물을 선택하세요."
                          value={selectedPersonId}
                          selectedPerson={selectedPerson}
                          persons={allPersonsForModal}
                          isModalOpen={personSelectModalOpen}
                          onModalOpenChange={setPersonSelectModalOpen}
                          onSelect={setSelectedPersonId}
                          placeholder="인물 선택"
                        />
                        <FieldRow>
                          <FieldLabel>
                            직책명 <Required aria-label="필수" />
                          </FieldLabel>
                          <FieldControl>
                            <SelectTriggerButton
                              type="button"
                              onClick={() => setPositionTitleModalOpen(true)}
                              $hasValue={
                                selectedPositionDefinitionId != null ||
                                title.trim() !== ''
                              }
                            >
                              <span>{positionTitleLabel}</span>
                              <FiChevronDown size={20} />
                            </SelectTriggerButton>
                          </FieldControl>
                        </FieldRow>
                        {isMonarchPosition && (
                          <FieldRow>
                            <FieldLabel>왕명</FieldLabel>
                            <FieldControl>
                              <Input
                                value={regnalName}
                                onChange={(e) => setRegnalName(e.target.value)}
                                placeholder="예: 세종, 루이 14세, 강희"
                              />
                            </FieldControl>
                          </FieldRow>
                        )}
                        {selectedPositionDefinitionId === null && (
                          <>
                            <FieldRow>
                              <FieldLabel>직책명 (직접 입력)</FieldLabel>
                              <FieldControl>
                                <Input
                                  value={title}
                                  onChange={(e) => setTitle(e.target.value)}
                                  placeholder="예: 최고지도자"
                                />
                              </FieldControl>
                            </FieldRow>
                            <FieldRow>
                              <FieldLabel>직책명 (영문)</FieldLabel>
                              <FieldControl>
                                <Input
                                  value={titleEn}
                                  onChange={(e) => setTitleEn(e.target.value)}
                                  placeholder="예: Supreme Leader"
                                />
                              </FieldControl>
                            </FieldRow>
                          </>
                        )}
                        <DateRangeField
                          label="취임일 · 퇴임일"
                          required
                          startValue={startDate}
                          endValue={endDate}
                          onStartChange={setStartDate}
                          onEndChange={setEndDate}
                          startPlaceholder="취임일"
                          endPlaceholder="퇴임일 (선택)"
                          openEndAfterStart
                        />
                        <FieldRow>
                          <FieldLabel>대수/재위번호</FieldLabel>
                          <FieldControl>
                            <Input
                              type="number"
                              min={1}
                              value={regnalNumber}
                              onChange={(e) => setRegnalNumber(e.target.value)}
                              placeholder="예: 4 (세종), 14 (루이 14세), 266 (프란치스코)"
                              title="역대 순번"
                            />
                            <FieldHint>
                              역대 순번. 동아시아(제4대)·서양
                              군주(14세)·교황(266대) 등 숫자만 입력
                            </FieldHint>
                          </FieldControl>
                        </FieldRow>
                        <FieldRow>
                          <FieldLabel>사건 페이지 노출</FieldLabel>
                          <FieldControl>
                            <EventsPageCheckWrap>
                              <CheckboxLabelRow>
                                <input
                                  type="checkbox"
                                  id="heads-show-on-events"
                                  checked={showOnEventsPage}
                                  onChange={(e) =>
                                    setShowOnEventsPage(e.target.checked)
                                  }
                                />
                                <label htmlFor="heads-show-on-events">
                                  연대표·사건 목록에 표시
                                </label>
                              </CheckboxLabelRow>
                              <FieldHint>
                                역대 수반 토글 시 목록에 포함됩니다.
                              </FieldHint>
                            </EventsPageCheckWrap>
                          </FieldControl>
                        </FieldRow>
                        {selectedPositionDefinition?.positionType ===
                          'HEAD_OF_STATE' && (
                          <FieldRow>
                            <FieldLabel>행정부 연동</FieldLabel>
                            <FieldControl>
                              <EventsPageCheckWrap>
                                <CheckboxLabelRow>
                                  <input
                                    type="checkbox"
                                    id="heads-sovereign-reign-only-edit"
                                    checked={sovereignReignOnlyForm}
                                    disabled={editingIsSovereignReign}
                                    onChange={(e) =>
                                      setSovereignReignOnlyForm(
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  <label htmlFor="heads-sovereign-reign-only-edit">
                                    재위만 기록 (행정부 수반과 분리)
                                  </label>
                                </CheckboxLabelRow>
                                <FieldHint>
                                  군주 등록과 동일합니다. 체크 시 내각이 자동
                                  생성되지 않고, 행정부 등록의 수반 후보에도
                                  나오지 않습니다.
                                </FieldHint>
                              </EventsPageCheckWrap>
                            </FieldControl>
                          </FieldRow>
                        )}
                      </FormRows>
                      <FormActions>
                        {editingTenureId && (
                          <DeleteButton
                            type="button"
                            onClick={handleDeleteTenure}
                            disabled={isSubmitting}
                          >
                            삭제
                          </DeleteButton>
                        )}
                        <ResetButton
                          type="button"
                          onClick={resetForm}
                          disabled={isSubmitting}
                        >
                          초기화
                        </ResetButton>
                      </FormActions>
                    </TabPanel>
                  )}
                  {tenureFormTab === 'achievement' && editingTenureId && (
                    <TabPanel>
                      <AchievementSectionBlock>
                        <SubSectionTitle>
                          <FiAward size={20} />
                          업적
                        </SubSectionTitle>
                        <AchievementSectionHint>
                          재위 기간 중 업적·한 일을 등록합니다. 사건 페이지
                          표시를 켜면 연대표에 노출됩니다.
                        </AchievementSectionHint>
                        {(() => {
                          const editingTenure = tenures.find(
                            (t: any) => t.id === editingTenureId,
                          ) as any
                          const achievements = (editingTenure?.achievements ??
                            []) as any[]
                          return (
                            <>
                              {achievements.length > 0 && (
                                <AchievementCardList>
                                  {achievements.map((a: any) => (
                                    <AchievementCard key={a.id}>
                                      <AchievementCardContent>
                                        <strong className="title">
                                          {a.title}
                                        </strong>
                                        {a.description && (
                                          <AchievementDescRead
                                            html={a.description}
                                          />
                                        )}
                                        {(a.startDate || a.endDate) && (
                                          <span className="date">
                                            {a.startDate
                                              ? formatDateForInput(a.startDate)
                                              : ''}
                                            {a.startDate && a.endDate
                                              ? ' ~ '
                                              : ''}
                                            {a.endDate
                                              ? formatDateForInput(a.endDate)
                                              : ''}
                                          </span>
                                        )}
                                      </AchievementCardContent>
                                      <AchievementCardActions>
                                        <EditAchievementButton
                                          type="button"
                                          onClick={() =>
                                            startEditAchievement(a)
                                          }
                                          title="업적 수정"
                                        >
                                          <FiEdit2 size={16} />
                                        </EditAchievementButton>
                                        <DeleteAchievementButton
                                          type="button"
                                          onClick={() =>
                                            handleDeleteAchievement(
                                              editingTenureId,
                                              a.id,
                                            )
                                          }
                                          title="업적 삭제"
                                        >
                                          <FiTrash2 size={16} />
                                        </DeleteAchievementButton>
                                      </AchievementCardActions>
                                    </AchievementCard>
                                  ))}
                                </AchievementCardList>
                              )}
                              <AchievementInlineForm>
                                <AchievementField>
                                  <label>제목 (필수)</label>
                                  <AchievementTitleInputWrap>
                                    <RegisterInput
                                      type="text"
                                      value={achievementTitle}
                                      onChange={(e) =>
                                        setAchievementTitle(e.target.value)
                                      }
                                      placeholder="예: 한글 창제, 대동법 시행"
                                    />
                                  </AchievementTitleInputWrap>
                                </AchievementField>
                                <AchievementField>
                                  <label>시작일 / 종료일 (선택)</label>
                                  <DateFieldsRow>
                                    <DateFieldBtn
                                      type="button"
                                      onClick={() =>
                                        setAchievementDateField('start')
                                      }
                                      $hasValue={!!achievementStartDate}
                                    >
                                      <FiCalendar size={16} />
                                      <span>
                                        {achievementStartDate
                                          ? formatDateForInput(
                                              achievementStartDate,
                                            )
                                          : '시작일 선택'}
                                      </span>
                                      <FiChevronDown size={20} />
                                    </DateFieldBtn>
                                    <DateFieldBtn
                                      type="button"
                                      onClick={() =>
                                        setAchievementDateField('end')
                                      }
                                      $hasValue={!!achievementEndDate}
                                    >
                                      <FiCalendar size={16} />
                                      <span>
                                        {achievementEndDate
                                          ? formatDateForInput(
                                              achievementEndDate,
                                            )
                                          : '종료일 선택'}
                                      </span>
                                      <FiChevronDown size={20} />
                                    </DateFieldBtn>
                                  </DateFieldsRow>
                                </AchievementField>
                                <AchievementField>
                                  <label>설명 (선택)</label>
                                  <RichTextEditor
                                    value={achievementDescription}
                                    onChange={setAchievementDescription}
                                    showTitle={false}
                                    placeholder="내용을 입력하세요. 사건 등록과 동일하게 서식·이미지를 넣을 수 있습니다."
                                    onImageUpload={async (file) => {
                                      const result = await uploadImage(
                                        file,
                                        'persons',
                                      )
                                      return result.url ?? result
                                    }}
                                  />
                                </AchievementField>
                                <AchievementField>
                                  <CheckboxRow>
                                    <input
                                      type="checkbox"
                                      id="achievement-show-on-events-inline"
                                      checked={achievementShowOnEventsPage}
                                      onChange={(e) =>
                                        setAchievementShowOnEventsPage(
                                          e.target.checked,
                                        )
                                      }
                                    />
                                    <label htmlFor="achievement-show-on-events-inline">
                                      사건 페이지(연대표)에 표시
                                    </label>
                                  </CheckboxRow>
                                </AchievementField>
                                <AchievementInlineActions>
                                  {editingAchievementId && (
                                    <button
                                      type="button"
                                      className="cancel"
                                      onClick={() => resetAchievementForm()}
                                      disabled={achievementSubmitting}
                                    >
                                      취소
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="submit"
                                    onClick={() => handleAchievementSubmit()}
                                    disabled={
                                      achievementSubmitting ||
                                      !achievementTitle.trim()
                                    }
                                  >
                                    {achievementSubmitting
                                      ? editingAchievementId
                                        ? '수정 중…'
                                        : '등록 중…'
                                      : editingAchievementId
                                        ? '수정 완료'
                                        : '업적 추가'}
                                  </button>
                                </AchievementInlineActions>
                              </AchievementInlineForm>
                            </>
                          )
                        })()}
                      </AchievementSectionBlock>
                    </TabPanel>
                  )}
                  {tenureFormTab === 'regnalEra' &&
                    editingTenureId &&
                    editingHostSupportsRegnalEras && (
                      <TabPanel>
                        <AchievementSectionBlock>
                          <SubSectionTitle>
                            <FiBook size={20} />
                            연호
                          </SubSectionTitle>
                          <AchievementSectionHint>
                            재위 전용 기록·국가원수 재임에 元号·연호 구간을
                            붙입니다. 일본 연호(예: 昭和), 중국·조선 연호 등
                            시작 연도는 필수입니다.
                          </AchievementSectionHint>
                          {(() => {
                            const row = tenures.find(
                              (t: any) => t.id === editingTenureId,
                            ) as any
                            const eras = (
                              (row?.regnalEras ?? []) as RegnalEraDto[]
                            )
                              .slice()
                              .sort(
                                (eraA, eraB) => eraA.startYear - eraB.startYear,
                              )
                            return (
                              <>
                                {eras.length > 0 && (
                                  <AchievementCardList>
                                    {eras.map((era) => (
                                      <AchievementCard key={era.id}>
                                        <AchievementCardContent>
                                          <strong className="title">
                                            {era.eraName}
                                            {era.eraNameEn ? (
                                              <span
                                                style={{
                                                  fontWeight: 400,
                                                  color: '#64748b',
                                                  marginLeft: 8,
                                                }}
                                              >
                                                ({era.eraNameEn})
                                              </span>
                                            ) : null}
                                          </strong>
                                          <span className="date">
                                            {formatRegnalEraRangeLabel(era)}
                                          </span>
                                          {era.changeReason ? (
                                            <span
                                              className="date"
                                              style={{
                                                display: 'block',
                                                marginTop: 4,
                                              }}
                                            >
                                              사유: {era.changeReason}
                                            </span>
                                          ) : null}
                                        </AchievementCardContent>
                                        <AchievementCardActions>
                                          <EditAchievementButton
                                            type="button"
                                            onClick={() =>
                                              startEditRegnalEra(era)
                                            }
                                            title="연호 수정"
                                          >
                                            <FiEdit2 size={16} />
                                          </EditAchievementButton>
                                          <DeleteAchievementButton
                                            type="button"
                                            onClick={() =>
                                              handleDeleteRegnalEra(era.id)
                                            }
                                            title="연호 삭제"
                                          >
                                            <FiTrash2 size={16} />
                                          </DeleteAchievementButton>
                                        </AchievementCardActions>
                                      </AchievementCard>
                                    ))}
                                  </AchievementCardList>
                                )}
                                <AchievementInlineForm>
                                  <AchievementField>
                                    <label>연호명 (필수)</label>
                                    <AchievementTitleInputWrap>
                                      <RegisterInput
                                        type="text"
                                        value={regnalEraName}
                                        onChange={(e) =>
                                          setRegnalEraName(e.target.value)
                                        }
                                        placeholder="예: 昭和, 康熙, 建文"
                                      />
                                    </AchievementTitleInputWrap>
                                  </AchievementField>
                                  <AchievementField>
                                    <label>영문·로마자 (선택)</label>
                                    <AchievementTitleInputWrap>
                                      <RegisterInput
                                        type="text"
                                        value={regnalEraNameEn}
                                        onChange={(e) =>
                                          setRegnalEraNameEn(e.target.value)
                                        }
                                        placeholder="예: Shōwa, Kangxi"
                                      />
                                    </AchievementTitleInputWrap>
                                  </AchievementField>
                                  <AchievementField>
                                    <label>시작: 연도(필수) · 월 · 일</label>
                                    <RegnalEraYmdRow>
                                      <RegisterInput
                                        type="number"
                                        min={1}
                                        value={regnalEraStartYear}
                                        onChange={(e) =>
                                          setRegnalEraStartYear(e.target.value)
                                        }
                                        placeholder="연도"
                                      />
                                      <RegisterInput
                                        type="number"
                                        min={1}
                                        max={12}
                                        value={regnalEraStartMonth}
                                        onChange={(e) =>
                                          setRegnalEraStartMonth(e.target.value)
                                        }
                                        placeholder="월"
                                      />
                                      <RegisterInput
                                        type="number"
                                        min={1}
                                        max={31}
                                        value={regnalEraStartDay}
                                        onChange={(e) =>
                                          setRegnalEraStartDay(e.target.value)
                                        }
                                        placeholder="일"
                                      />
                                    </RegnalEraYmdRow>
                                  </AchievementField>
                                  <AchievementField>
                                    <label>종료: 연도 · 월 · 일 (선택)</label>
                                    <RegnalEraYmdRow>
                                      <RegisterInput
                                        type="number"
                                        min={1}
                                        value={regnalEraEndYear}
                                        onChange={(e) =>
                                          setRegnalEraEndYear(e.target.value)
                                        }
                                        placeholder="연도"
                                      />
                                      <RegisterInput
                                        type="number"
                                        min={1}
                                        max={12}
                                        value={regnalEraEndMonth}
                                        onChange={(e) =>
                                          setRegnalEraEndMonth(e.target.value)
                                        }
                                        placeholder="월"
                                      />
                                      <RegisterInput
                                        type="number"
                                        min={1}
                                        max={31}
                                        value={regnalEraEndDay}
                                        onChange={(e) =>
                                          setRegnalEraEndDay(e.target.value)
                                        }
                                        placeholder="일"
                                      />
                                    </RegnalEraYmdRow>
                                    <FieldHint style={{ marginTop: 8 }}>
                                      비우면 재위·재임 종료 시점까지로 해석해
                                      표시할 수 있습니다.
                                    </FieldHint>
                                  </AchievementField>
                                  <AchievementField>
                                    <label>변경 사유 (선택)</label>
                                    <AchievementTitleInputWrap>
                                      <RegisterInput
                                        type="text"
                                        value={regnalEraChangeReason}
                                        onChange={(e) =>
                                          setRegnalEraChangeReason(
                                            e.target.value,
                                          )
                                        }
                                        placeholder="예: 즉위, 개원, 재난"
                                      />
                                    </AchievementTitleInputWrap>
                                  </AchievementField>
                                  <AchievementInlineActions>
                                    {editingRegnalEraId && (
                                      <button
                                        type="button"
                                        className="cancel"
                                        onClick={() => resetRegnalEraForm()}
                                        disabled={regnalEraSubmitting}
                                      >
                                        취소
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="submit"
                                      onClick={() => handleRegnalEraSubmit()}
                                      disabled={
                                        regnalEraSubmitting ||
                                        !regnalEraName.trim() ||
                                        !regnalEraStartYear.trim()
                                      }
                                    >
                                      {regnalEraSubmitting
                                        ? editingRegnalEraId
                                          ? '수정 중…'
                                          : '등록 중…'
                                        : editingRegnalEraId
                                          ? '수정 완료'
                                          : '연호 추가'}
                                    </button>
                                  </AchievementInlineActions>
                                </AchievementInlineForm>
                              </>
                            )
                          })()}
                        </AchievementSectionBlock>
                      </TabPanel>
                    )}
                </>
              ) : (
                <>
                  <SubSectionTitle>기본정보</SubSectionTitle>
                  <SectionHint>
                    재임 기간·직책·인물 등 기본 정보를 입력합니다.
                  </SectionHint>
                  <FormRows>
                    {!isHistorical && hasSubordinateHistorical && (
                      <FieldRow>
                        <FieldLabel>소속 국가</FieldLabel>
                        <FieldControl>
                          <SelectTriggerButton
                            type="button"
                            onClick={() => setAffinityCountryModalOpen(true)}
                            $hasValue
                          >
                            <span>
                              {selectedAffinityHistoricalId
                                ? ((subordinateHistorical as any[]).find(
                                    (h: any) =>
                                      h.id === selectedAffinityHistoricalId,
                                  )?.name ?? '역사적 국가')
                                : `현대 국가 (현재: ${country.name})`}
                            </span>
                            <FiChevronDown size={20} />
                          </SelectTriggerButton>
                          <FieldHint>
                            현대 국가 또는 연결된 하위 역사적 국가 중 하나를
                            선택하세요.
                          </FieldHint>
                        </FieldControl>
                      </FieldRow>
                    )}
                    <PersonSelectField
                      label="인물"
                      required
                      hint="재임 기록에 연결할 인물을 선택하세요."
                      value={selectedPersonId}
                      selectedPerson={selectedPerson}
                      persons={allPersonsForModal}
                      isModalOpen={personSelectModalOpen}
                      onModalOpenChange={setPersonSelectModalOpen}
                      onSelect={setSelectedPersonId}
                      placeholder="인물 선택"
                    />
                    <FieldRow>
                      <FieldLabel>
                        직책명 <Required aria-label="필수" />
                      </FieldLabel>
                      <FieldControl>
                        <SelectTriggerButton
                          type="button"
                          onClick={() => setPositionTitleModalOpen(true)}
                          $hasValue={
                            selectedPositionDefinitionId != null ||
                            title.trim() !== ''
                          }
                        >
                          <span>{positionTitleLabel}</span>
                          <FiChevronDown size={20} />
                        </SelectTriggerButton>
                      </FieldControl>
                    </FieldRow>
                    {isMonarchPosition && (
                      <FieldRow>
                        <FieldLabel>왕명</FieldLabel>
                        <FieldControl>
                          <Input
                            value={regnalName}
                            onChange={(e) => setRegnalName(e.target.value)}
                            placeholder="예: 세종, 루이 14세, 강희"
                          />
                        </FieldControl>
                      </FieldRow>
                    )}
                    {selectedPositionDefinitionId === null && (
                      <>
                        <FieldRow>
                          <FieldLabel>직책명 (직접 입력)</FieldLabel>
                          <FieldControl>
                            <Input
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="예: 최고지도자"
                            />
                          </FieldControl>
                        </FieldRow>
                        <FieldRow>
                          <FieldLabel>직책명 (영문)</FieldLabel>
                          <FieldControl>
                            <Input
                              value={titleEn}
                              onChange={(e) => setTitleEn(e.target.value)}
                              placeholder="예: Supreme Leader"
                            />
                          </FieldControl>
                        </FieldRow>
                      </>
                    )}
                    <DateRangeField
                      label="취임일 · 퇴임일"
                      required
                      startValue={startDate}
                      endValue={endDate}
                      onStartChange={setStartDate}
                      onEndChange={setEndDate}
                      startPlaceholder="취임일"
                      endPlaceholder="퇴임일 (선택)"
                      openEndAfterStart
                    />
                    <FieldRow>
                      <FieldLabel>대수/재위번호</FieldLabel>
                      <FieldControl>
                        <Input
                          type="number"
                          min={1}
                          value={regnalNumber}
                          onChange={(e) => setRegnalNumber(e.target.value)}
                          placeholder="예: 4 (세종), 14 (루이 14세), 266 (프란치스코)"
                          title="역대 순번"
                        />
                        <FieldHint>
                          역대 순번. 동아시아(제4대)·서양 군주(14세)·교황(266대)
                          등 숫자만 입력
                        </FieldHint>
                      </FieldControl>
                    </FieldRow>
                    <FieldRow>
                      <FieldLabel>사건 페이지 노출</FieldLabel>
                      <FieldControl>
                        <EventsPageCheckWrap>
                          <CheckboxLabelRow>
                            <input
                              type="checkbox"
                              id="heads-show-on-events-new"
                              checked={showOnEventsPage}
                              onChange={(e) =>
                                setShowOnEventsPage(e.target.checked)
                              }
                            />
                            <label htmlFor="heads-show-on-events-new">
                              연대표·사건 목록에 표시
                            </label>
                          </CheckboxLabelRow>
                          <FieldHint>
                            역대 수반 토글 시 목록에 포함됩니다.
                          </FieldHint>
                        </EventsPageCheckWrap>
                      </FieldControl>
                    </FieldRow>
                    {selectedPositionDefinition?.positionType ===
                      'HEAD_OF_STATE' && (
                      <FieldRow>
                        <FieldLabel>행정부 연동</FieldLabel>
                        <FieldControl>
                          <EventsPageCheckWrap>
                            <CheckboxLabelRow>
                              <input
                                type="checkbox"
                                id="heads-sovereign-reign-only-new"
                                checked={sovereignReignOnlyForm}
                                onChange={(e) =>
                                  setSovereignReignOnlyForm(e.target.checked)
                                }
                              />
                              <label htmlFor="heads-sovereign-reign-only-new">
                                재위만 기록 (행정부 수반과 분리)
                              </label>
                            </CheckboxLabelRow>
                            <FieldHint>
                              군주 등록과 동일합니다. 체크 시 내각이 자동
                              생성되지 않고, 행정부 등록의 수반 후보에도 나오지
                              않습니다.
                            </FieldHint>
                          </EventsPageCheckWrap>
                        </FieldControl>
                      </FieldRow>
                    )}
                    {(selectedPositionDefinition?.positionType ===
                      'HEAD_OF_STATE' ||
                      selectedPositionDefinition?.positionType ===
                        'HEAD_OF_GOVERNMENT') && (
                      <FieldRow>
                        <FieldLabel>행정부</FieldLabel>
                        <FieldControl>
                          <EventsPageCheckWrap>
                            <CheckboxLabelRow>
                              <input
                                type="checkbox"
                                id="heads-create-cabinet-with-tenure"
                                checked={createCabinetWithTenure}
                                disabled={sovereignReignOnlyForm}
                                onChange={(e) => {
                                  const next = e.target.checked
                                  setCreateCabinetWithTenure(next)
                                  if (next) setSovereignReignOnlyForm(false)
                                }}
                              />
                              <label htmlFor="heads-create-cabinet-with-tenure">
                                이 재임으로 행정부도 만들기
                              </label>
                            </CheckboxLabelRow>
                            <FieldHint>
                              체크하면 행정조직 탭에서 이 수반의 내각에 각료를
                              바로 추가할 수 있습니다. 재위만 기록과 함께 쓸 수
                              없습니다.
                            </FieldHint>
                          </EventsPageCheckWrap>
                        </FieldControl>
                      </FieldRow>
                    )}
                  </FormRows>
                  <FormActions>
                    <ResetButton
                      type="button"
                      onClick={resetForm}
                      disabled={isSubmitting}
                    >
                      초기화
                    </ResetButton>
                  </FormActions>
                </>
              )}
            </FormSectionInner>
          </form>
        </FormCardWrapper>
      )}

      <SelectModal
        isOpen={positionTitleModalOpen}
        onClose={() => setPositionTitleModalOpen(false)}
        title="직책명 선택"
        options={positionTitleOptions}
        selectedValue={selectedPositionDefinitionId ?? OTHER_POSITION_VALUE}
        onSelect={handlePositionTitleSelect}
      />

      {!isHistorical && hasSubordinateHistorical && (
        <CountrySearchModal
          isOpen={affinityCountryModalOpen}
          onClose={() => setAffinityCountryModalOpen(false)}
          title="소속 국가 선택"
          placeholder="국가명으로 검색..."
          modernCountries={[
            {
              id: '',
              name: `현대 국가 (현재: ${country.name})`,
              flagEmoji: (country as any).flagEmoji ?? null,
            },
          ]}
          historicalCountries={(subordinateHistorical as any[]).map(
            (h: any) => ({
              id: h.id,
              name: h.name,
              flagEmoji: (h as any).flagEmoji ?? null,
              enName: h.enName,
              startYear: h.startYear,
              endYear: h.endYear,
            }),
          )}
          selectedCountryId={selectedAffinityHistoricalId ?? ''}
          onSelect={({ id }) => setSelectedAffinityHistoricalId(id || null)}
        />
      )}

      <DatePickerModal
        isOpen={achievementDateField !== null}
        onClose={() => setAchievementDateField(null)}
        title={achievementDateField === 'start' ? '시작일 선택' : '종료일 선택'}
        initialDate={
          achievementDateField === 'start'
            ? achievementStartDate || undefined
            : achievementEndDate || undefined
        }
        onSelect={(date) => {
          if (achievementDateField === 'start') setAchievementStartDate(date)
          else if (achievementDateField === 'end') setAchievementEndDate(date)
          setAchievementDateField(null)
        }}
      />

      {settingsModalOpen && (
        <ModalOverlay onClick={() => setSettingsModalOpen(false)}>
          <ModalBox $maxWidth="460px" onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>역대 수반 설정</ModalTitle>
              <ModalCloseButton
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                aria-label="설정 닫기"
              >
                <FiX size={16} />
              </ModalCloseButton>
            </ModalHeader>
            <ModalBody>
              <SettingsItem>
                <SettingsLabelWrap>
                  <SettingsLabel>교황 전역 표시</SettingsLabel>
                  <SettingsHint>
                    켜면 모든 국가에서 교황 계보를 함께 표시합니다.
                  </SettingsHint>
                </SettingsLabelWrap>
                <SettingsSwitch
                  type="button"
                  $on={showGlobalPope}
                  onClick={() => setShowGlobalPope((v) => !v)}
                  aria-pressed={showGlobalPope}
                >
                  <span />
                </SettingsSwitch>
              </SettingsItem>
            </ModalBody>
          </ModalBox>
        </ModalOverlay>
      )}

      {cabinetModalTenureId && (
        <ModalOverlay onClick={() => setCabinetModalTenureId(null)}>
          <ModalBox
            $maxWidth="720px"
            $maxHeight="80vh"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <div>
                <ModalTitle>행정부 각료 현황</ModalTitle>
                <ModalSubtitle>
                  {selectedCabinetHeadCountry} · {selectedCabinetHeadTitle}(
                  {selectedCabinetHeadName})의 각료 구성
                </ModalSubtitle>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* 수반 수정 버튼 — 계보도 카드에서 접근 */}
                <button
                  type="button"
                  onClick={() => {
                    const tenureId = cabinetModalTenureId
                    setCabinetModalTenureId(null)
                    if (tenureId) {
                      setEditingTenureId(tenureId)
                      setView('register')
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#4f46e5',
                    background: '#eef2ff',
                    border: '1px solid #c7d2fe',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <FiEdit2 size={12} />
                  수정
                </button>
                <ModalCloseButton
                  type="button"
                  onClick={() => setCabinetModalTenureId(null)}
                  aria-label="각료 목록 닫기"
                >
                  <FiX size={18} />
                </ModalCloseButton>
              </div>
            </ModalHeader>

            <ModalBody>
              <CabinetMembersSummary>
                <CabinetMembersSummaryRow>
                  <span>수반</span>
                  <strong>{selectedCabinetHeadName}</strong>
                </CabinetMembersSummaryRow>
                <CabinetMembersSummaryRow>
                  <span>재임</span>
                  <strong>{selectedCabinetHeadPeriod}</strong>
                </CabinetMembersSummaryRow>
                <CabinetMembersSummaryStats>
                  <span>총 {cabinetModalSummary.total}명</span>
                  <span>재임 중 {cabinetModalSummary.active}명</span>
                  <span>퇴임 {cabinetModalSummary.ended}명</span>
                </CabinetMembersSummaryStats>
              </CabinetMembersSummary>
              {isCabinetModalLoading ? (
                <CabinetMembersLoading>
                  각료 목록을 불러오는 중...
                </CabinetMembersLoading>
              ) : (cabinetModalSubordinateTenures as any[]).length === 0 ? (
                <CabinetMembersEmpty>
                  등록된 각료가 없습니다. 인물 재임 등록 시 소속 행정부를
                  선택하면 여기에서 확인할 수 있습니다.
                </CabinetMembersEmpty>
              ) : (
                <CabinetMembersList>
                  {(cabinetModalSubordinateTenures as any[]).map((sub: any) => (
                    <CabinetMembersItem key={sub.id}>
                      <CabinetMembersItemTop>
                        <strong>
                          {sub.positionDefinition?.title ?? sub.title ?? '—'}
                        </strong>
                        <CabinetMembersStatus $active={!sub.endDate}>
                          {sub.endDate ? '퇴임' : '재임 중'}
                        </CabinetMembersStatus>
                      </CabinetMembersItemTop>
                      <CabinetMembersMetaRow>
                        <span>인물</span>
                        <b>{getPersonName(sub.person)}</b>
                      </CabinetMembersMetaRow>
                      <CabinetMembersMetaRow>
                        <span>재임기간</span>
                        <b>
                          {formatDate(sub.startDate)} ~{' '}
                          {sub.endDate ? formatDate(sub.endDate) : '현재'}
                        </b>
                      </CabinetMembersMetaRow>
                      <CabinetMembersMetaRow>
                        <span>소속 국가</span>
                        <b>
                          {sub.historicalCountry?.name ??
                            sub.country?.name ??
                            selectedCabinetHeadCountry}
                        </b>
                      </CabinetMembersMetaRow>
                    </CabinetMembersItem>
                  ))}
                </CabinetMembersList>
              )}
            </ModalBody>
          </ModalBox>
        </ModalOverlay>
      )}
    </SectionOuter>
  )
}

const HEAD_ACCENT = '#6366f1'

const SectionOuter = styled.div<{ $embedded?: boolean }>`
  margin-top: ${({ $embedded }) => ($embedded ? '0' : '0')};
`

const CabinetMembersSummary = styled.div`
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  padding: 10px 12px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const CabinetMembersSummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};

  span {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
    text-align: right;
  }
`

const CabinetMembersSummaryStats = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;

  span {
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid #dbeafe;
    background: #eff6ff;
    color: #1e3a8a;
    font-size: 12px;
    font-weight: 600;
  }
`

const CabinetMembersLoading = styled.div`
  padding: 24px 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CabinetMembersEmpty = styled.div`
  padding: 24px 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.6;
`

const CabinetMembersList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const CabinetMembersItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff'};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
  }

  @media (max-width: 768px) {
    gap: 6px;
  }
`

const CabinetMembersItemTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const CabinetMembersStatus = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? '#bbf7d0'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e2e8f0'};
  color: ${({ $active }) => ($active ? '#15803d' : '#64748b')};
  background: ${({ $active, theme }) =>
    $active
      ? '#f0fdf4'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#f8fafc'};
`

const CabinetMembersMetaRow = styled.div`
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 10px;
  align-items: start;
  line-height: 1.45;

  span {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-size: 12px;
  }
  b {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
    word-break: break-word;
  }
`

const PositionFilterTabs = styled.div`
  display: flex;
  gap: 4px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  flex-wrap: nowrap;
  overflow-x: auto;
  max-width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  &::-webkit-scrollbar {
    height: 5px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.18)'
        : 'rgba(15, 23, 42, 0.18)'};
  }
`

const PositionFilterTab = styled.button<{ $active?: boolean }>`
  padding: 7px 12px;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4338ca'
      : theme.mode === 'dark'
        ? '#94a3b8'
        : '#64748b'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.15)'
        : '#eef2ff'
      : 'transparent'};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.4)'
          : '#c7d2fe'
        : 'transparent'};
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
  white-space: nowrap;

  &:hover {
    color: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? '#a5b4fc'
          : '#4338ca'
        : theme.mode === 'dark'
          ? '#cbd5e1'
          : '#475569'};
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.2)'
          : '#eef2ff'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : '#f8fafc'};
    border-color: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.5)'
          : '#c7d2fe'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : '#e2e8f0'};
  }
`

const ListWrap = styled.div<{ $lineageMode?: boolean }>`
  margin-top: 0;
  background: ${({ $lineageMode, theme }) =>
    $lineageMode
      ? 'transparent'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : '#fff'};
  border: ${({ $lineageMode, theme }) =>
    $lineageMode
      ? 'none'
      : `1px solid ${theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`};
  border-radius: ${({ $lineageMode }) => ($lineageMode ? '0' : '16px')};
  overflow: ${({ $lineageMode }) => ($lineageMode ? 'visible' : 'hidden')};
  box-shadow: ${({ $lineageMode, theme }) =>
    $lineageMode
      ? 'none'
      : theme.mode === 'dark'
        ? '0 1px 4px rgba(0,0,0,0.3)'
        : '0 1px 4px rgba(15, 23, 42, 0.04)'};
`

const ListHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'};
  flex-wrap: wrap;
`

const ListHeadLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1;
`

const ViewModeTabs = styled.div`
  display: flex;
  gap: 4px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
`

const ViewModeTab = styled.button<{ $active?: boolean }>`
  padding: 6px 14px;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4338ca'
      : theme.mode === 'dark'
        ? '#94a3b8'
        : '#64748b'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.15)'
        : '#eef2ff'
      : 'transparent'};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.4)'
          : '#c7d2fe'
        : 'transparent'};
  border-radius: 7px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    color: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? '#a5b4fc'
          : '#4338ca'
        : theme.mode === 'dark'
          ? '#cbd5e1'
          : '#475569'};
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.2)'
          : '#eef2ff'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : '#f8fafc'};
    border-color: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.5)'
          : '#c7d2fe'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : '#e2e8f0'};
  }
`

const LineageDivider = styled.div`
  width: 1px;
  height: 24px;
  background: ${({ theme }) => theme.colors.border.default};
  flex-shrink: 0;
`

const LineageWrap = styled.div`
  padding: 0;
  min-height: 200px;
`

const LineageLegend = styled.div`
  margin-bottom: 16px;
  padding: 10px 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(109,40,217,0.1)' : '#faf5ff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(109,40,217,0.3)' : '#ede9fe'};
  border-radius: 10px;
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c4b5fd' : '#6d28d9')};
  line-height: 1.5;
  opacity: 0.85;
`

const ListTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
  line-height: 1.3;

  .count {
    font-weight: 400;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    margin-left: 6px;
  }
`

/** 직책별 섹션 제목 (국왕, 쇼군, 대통령, 총리 등) */
const PositionSectionTitle = styled.h3`
  margin: 0;
  padding: 6px 20px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#3730a3')};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.1)' : '#f5f3ff'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : '#ede9fe'};
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : '#ede9fe'};
  display: flex;
  align-items: center;
  gap: 6px;

  .count {
    font-weight: 500;
    font-size: 11px;
    color: #7c3aed;
    letter-spacing: 0;
    text-transform: none;
    opacity: 0.7;
  }
`

const AddTenureButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.15s,
    box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.22);

  &:hover {
    background: #4f46e5;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.32);
  }

  &:active {
    transform: translateY(0);
  }
`

const SettingsButton = styled.button`
  width: 34px;
  height: 34px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#f8fafc'};
    color: #4338ca;
    border-color: #c7d2fe;
  }
`

const SettingsItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const SettingsLabelWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const SettingsLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SettingsHint = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SettingsSwitch = styled.button<{ $on: boolean }>`
  width: 46px;
  height: 28px;
  border: 1px solid ${({ $on }) => ($on ? '#818cf8' : '#cbd5e1')};
  border-radius: 999px;
  background: ${({ $on }) => ($on ? '#eef2ff' : '#f8fafc')};
  position: relative;
  cursor: pointer;
  transition: all 0.15s ease;

  span {
    position: absolute;
    top: 3px;
    left: ${({ $on }) => ($on ? '21px' : '3px')};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ $on }) => ($on ? '#6366f1' : '#94a3b8')};
    transition: all 0.15s ease;
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  gap: 12px;
  text-align: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  border: 1.5px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 14px;
  margin: 16px;
`

const EmptyIconWrap = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
`

const EmptyTitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyDesc = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  max-width: 320px;
  line-height: 1.5;
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 4px 0 8px;
  display: flex;
  flex-direction: column;
  gap: 0;
`

const ListItem = styled.li`
  display: flex;
  align-items: stretch;
  gap: 0;
  cursor: pointer;
  position: relative;

  &:hover .tenure-card {
    border-color: #a5b4fc;
    background: linear-gradient(135deg, #eef2ff 0%, #f8f9ff 100%);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.12);
  }
`

const ItemAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 44px;
  height: 54px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: ${({ $hasImage, theme }) =>
    $hasImage
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : '#f1f5f9'
      : '#eff1fe'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #818cf8;
  border: 1px solid
    ${({ $hasImage, theme }) =>
      $hasImage
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e2e8f0'
        : '#e0e3fc'};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }
`

const ListItemBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
`

const ItemName = styled.div`
  font-weight: 700;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.3;
  letter-spacing: -0.02em;
`

const ItemTermBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 700;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 5px;
  letter-spacing: 0.01em;
  flex-shrink: 0;
`

const ItemDates = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  color: #4338ca;
  background: #eef2ff;
  padding: 2px 8px;
  border-radius: 5px;
  margin-left: auto;
  white-space: nowrap;

  .sep {
    margin: 0 1px;
    color: #a5b4fc;
  }
`

const ItemTitleBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  background: transparent;
  border-radius: 4px;
`

const ItemCountryBadge = styled.span`
  display: inline-block;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 500;
  color: #0d9488;
  background: #f0fdf9;
  border-radius: 4px;
`

const ItemRegnalName = styled.span`
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
`

const ItemDynastyName = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #7c3aed;
`

const ItemLifespan = styled.span`
  font-size: 11px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
`

const ItemBirthPlace = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
`

const ItemAgeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 600;
  color: #0369a1;
  background: #e0f2fe;
  border-radius: 4px;
`

const AchievementChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const AchievementChip = styled.span<{ $more?: boolean }>`
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  color: #6d28d9;
  background: #f5f3ff;
  border-radius: 6px;
  ${({ $more }) => $more && 'font-style: italic; color: #64748b;'}
`

const ItemActions = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`

const AchievementButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #4f46e5;
  background: #eef2ff;
  border: 1px solid #e0e7ff;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    opacity 0.15s ease;
  opacity: 0;
  pointer-events: none;

  ${ListItem}:hover & {
    opacity: 1;
    pointer-events: auto;
  }

  &:hover {
    background: #e0e7ff;
    color: #4338ca;
  }

  &:active {
    background: #e5e7eb;
  }
`

const ItemAction = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: #94a3b8;
  transition:
    color 0.2s ease,
    background 0.2s ease;

  ${ListItem}:hover & {
    background: #eef2ff;
    color: var(--color-primary);
  }
`

/* 기본정보 / 업적 구분 섹션 */
/* 행정조직 섹션 제목과 동일 (예: 중앙부처 현황) */
const SubSectionTitle = styled.h4`
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.02em;
`

const TabPanel = styled.div`
  padding-top: 0;
  margin-top: 24px;
`

const AchievementSectionBlock = styled.div`
  margin-top: 0;
  padding-top: 0;
`

const AchievementSectionHint = styled.p`
  margin: 0 0 16px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
`

/** 기본정보·업적 탭 공용: 섹션 제목 아래 설명 */
const SectionHint = styled.p`
  margin: 0 0 20px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
`

const AchievementCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`

const AchievementCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  transition: box-shadow 0.2s;
  &:hover {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
`

const AchievementDescRead = styled(RichTextReadView)`
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin-bottom: 6px;
`

const AchievementCardContent = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  .title {
    display: block;
    margin-bottom: 8px;
    font-size: 15px;
    font-weight: 600;
    color: #0f172a;
  }
  .date {
    font-size: 12px;
    color: #94a3b8;
  }
`

const AchievementCardActions = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`

const EditAchievementButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: #64748b;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s;
  &:hover {
    color: #4f46e5;
    background: #eef2ff;
  }
`

const DeleteAchievementButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: #64748b;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s;
  &:hover {
    color: #dc2626;
    background: #fee2e2;
  }
`

const AchievementInlineForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
`

const AchievementInlineActions = styled.div`
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;

  .cancel {
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    background: #fff;
    color: #64748b;
  }
  .cancel:hover:not(:disabled) {
    background: #f8fafc;
    color: #475569;
  }
  .cancel:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .submit {
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    background: #6366f1;
    color: #fff;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  }
  .submit:hover:not(:disabled) {
    background: #4f46e5;
  }
  .submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

/* 행정조직과 동일한 디자인·색상 */
const BORDER_COLOR = '#e5e7eb'
const FOCUS_COLOR = '#4f46e5'
const BG_INPUT = '#f8fafc'
const TEXT_PRIMARY = '#0f172a'
const TEXT_SECONDARY = '#64748b'
const TEXT_MUTED = '#6b7280'

const AchievementTitleInputWrap = styled.div`
  max-width: 480px;
`

const RegnalEraYmdRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  max-width: 520px;

  input {
    width: 96px;
    min-width: 0;
    padding: 10px 12px;
    font-size: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    box-sizing: border-box;
  }
  input:first-of-type {
    width: 112px;
  }
`

const AchievementField = styled.div`
  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }
  textarea {
    width: 100%;
    padding: 10px 14px;
    font-size: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    box-sizing: border-box;
    resize: vertical;
    min-height: 72px;
  }
`

/** 수반 등록 폼 헤더 (register-form-layout FormHeader 스타일 기반) */
const HeadsFormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-wrap: wrap;
`

const HeadsFormTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
  flex: 1;
  min-width: 0;
  @media (max-width: 640px) {
    width: 100%;
    order: -1;
    margin-bottom: 8px;
  }
`

const EventsPageCheckWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const CheckboxLabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: #6366f1;
    cursor: pointer;
    flex-shrink: 0;
  }
  label {
    font-size: 14px;
    color: ${TEXT_PRIMARY};
    cursor: pointer;
    user-select: none;
  }
`

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: #6366f1;
    cursor: pointer;
  }
  label {
    font-size: 14px;
    color: ${TEXT_PRIMARY};
    cursor: pointer;
    user-select: none;
  }
`

const DatePairRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  > button {
    flex: 1;
    min-width: 0;
  }
`

/* 행정조직 부처 등록 select 버튼과 동일 */
const triggerButtonStyles = `
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  color: inherit;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #d1d5db;
  }
  span {
    flex: 1;
  }
  svg:last-of-type {
    flex-shrink: 0;
    opacity: 0.5;
  }
`

const SelectTriggerButton = styled.button<{ $hasValue?: boolean }>`
  ${triggerButtonStyles}
  color: ${({ $hasValue }) => ($hasValue ? '#111827' : '#9ca3af')};
`

const FormActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
`

const DeleteButton = styled.button`
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #ef4444;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: #dc2626;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const HeadsSubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: #6366f1;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 4px rgba(99, 102, 241, 0.2);

  &:hover:not(:disabled) {
    background: #4f46e5;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ResetButton = styled.button`
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: #4f46e5;
    color: #4f46e5;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const TenureSearchWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
`

const TenureSearchIcon = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  display: flex;
  align-items: center;
  pointer-events: none;
`

const TenureSearchInput = styled.input`
  width: 200px;
  height: 34px;
  padding: 0 32px 0 32px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  border-radius: 8px;
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.6)' : '#a5b4fc'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
  }
`

const TenureSearchClear = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#cbd5e1'};
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  padding: 0;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.35)' : '#94a3b8'};
  }
`

const CabinetExpandButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.14);
    border-color: rgba(99, 102, 241, 0.35);
  }
`

const CabinetExpandPanel = styled.div`
  margin-top: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
`
