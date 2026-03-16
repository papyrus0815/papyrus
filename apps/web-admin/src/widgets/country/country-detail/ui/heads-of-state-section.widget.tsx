/**
 * 역대 수반(국가원수·정부수반·군주 등) 재임 기록 목록 및 추가 섹션
 * 연대표 국가 상세에서 해당 국가의 재임 기록을 보고 추가할 수 있음
 */
import React, { useEffect, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  FiArrowLeft,
  FiAward,
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
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api'
import { personCareerApi } from '@/shared/api/person-career'
import { getAllPersons, getPersonsByTenureCountry } from '@/shared/api/persons'
import { uploadImage } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { calcAgeAtTenure, formatPersonLifespan } from '@/shared/lib/tenure-person-utils'
import { CountrySearchModal } from '@/shared/ui/country-search-modal'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { DateRangeField, PersonSelectField } from '@/shared/ui/form-fields'
import {
  DateFieldBtn,
  DateFieldsRow,
  FieldHint,
  Input as RegisterInput,
  Required,
} from '@/shared/ui/register-form-layout'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/RichTextEditor'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal'

import { LineageTree } from './lineage-tree.widget'

/** 수반 등록 시 직책 선택에 사용할 관직 유형 (DB 관직 정의 필터용) */
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

/** 특정 직책 계보도에서 선 연결 없음용 */
const emptyMap = new Map<string, string[]>()

interface HeadsOfStateSectionProps {
  country: UnifiedCountry
  /** 인물 탭에 통합되어 상단 여백을 부모가 줄 때 true */
  embedded?: boolean
}

const MIN_LOADING_MS = 1000
const FADE_DURATION = 0.35

export function HeadsOfStateSection({
  country,
  embedded,
}: HeadsOfStateSectionProps) {
  const queryClient = useQueryClient()
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
  /** 수정 폼 탭: 기본정보 | 업적 */
  const [tenureFormTab, setTenureFormTab] = useState<'basic' | 'achievement'>(
    'basic',
  )
  /** 수반 등록 시 이 재임으로 행정부도 함께 만들기 (국가원수·정부수반만 표시) */
  const [createCabinetWithTenure, setCreateCabinetWithTenure] = useState(false)

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
    queryClient.invalidateQueries({
      queryKey: ['tenures-by-country', countryId, historicalCountryId],
    })
    queryClient.invalidateQueries({ queryKey: ['global-tenures'] })
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
    tenures.forEach((t: any) => {
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
  }, [tenures, positionDefinitions, getCountryNameForTenure])

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
  }, [editingTenureId, editingTenure, positionDefinitions])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const hasDefinition = !!selectedPositionDefinitionId
    const hasTitle = title.trim() !== ''
    if (!selectedPersonId || (!hasDefinition && !hasTitle) || !startDate) {
      toast.error('인물, 직책명(또는 기타 직접 입력), 취임일을 입력해주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const def = selectedPositionDefinition
      const resolvedPositionType = def ? def.positionType : 'OTHER'
      const notesValue = regnalName.trim()
        ? `왕명: ${regnalName.trim()}`
        : undefined
      // 정의 선택 시 직함은 2차 카테고리(Definition)에만 두고 Tenure에는 저장하지 않음
      const payload = {
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
            ? null
            : parseInt(regnalNumber, 10) || undefined,
        regnalNumber:
          regnalNumber.trim() === ''
            ? null
            : parseInt(regnalNumber, 10) || undefined,
        notes: notesValue,
        showPositionInfo: showOnEventsPage,
      }
      if (editingTenureId) {
        await personCareerApi.updateGovernmentPositionTenure(
          editingTenureId,
          payload,
        )
        toast.success('재임 기록이 수정되었습니다.')
      } else {
        const created = (await personCareerApi.addGovernmentPositionTenure(
          payload,
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
            toast.success('재임 기록과 행정부가 등록되었습니다.')
          } catch (cabinetErr: any) {
            toast.success('재임 기록이 추가되었습니다.')
            toast.error(cabinetErr?.message ?? '행정부 생성에 실패했습니다.')
          }
        } else {
          toast.success('재임 기록이 추가되었습니다.')
        }
        queryClient.invalidateQueries({
          queryKey: ['cabinets-by-country', countryId, historicalCountryId],
        })
      }
      resetForm()
      setEditingTenureId(null)
      refetch()
      setView('list')
    } catch (err: any) {
      toast.error(err?.message || '저장에 실패했습니다.')
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
  }

  const handleDeleteTenure = async () => {
    if (!editingTenureId) return
    if (!window.confirm('이 재임 기록을 삭제하시겠습니까?')) return
    try {
      await personCareerApi.deleteGovernmentPositionTenure(editingTenureId)
      toast.success('재임 기록이 삭제되었습니다.')
      resetForm()
      setView('list')
      refetch()
    } catch (err: any) {
      toast.error(err?.message || '삭제에 실패했습니다.')
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
      nameDisplayOrder?: string
    } | null,
  ) => {
    if (!p) return '—'
    return getPersonDisplayName({
      name: p.name || '',
      surname: p.surname ?? '',
      middleName: p.middleName ?? '',
      nameDisplayOrder:
        (p.nameDisplayOrder as 'korean' | 'western') ?? 'korean',
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
      toast.error('제목을 입력하세요.')
      return
    }
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
        await personCareerApi.updateTenureAchievement(
          tenureId,
          editingAchievementId,
          dto,
        )
        toast.success('업적이 수정되었습니다.')
      } else {
        await personCareerApi.createTenureAchievement(tenureId, dto)
        toast.success('업적·한일이 등록되었습니다.')
      }
      resetAchievementForm()
      queryClient.invalidateQueries({
        queryKey: ['tenures-by-country', countryId, historicalCountryId],
      })
    } catch (err: any) {
      toast.error(
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
    if (!window.confirm('이 업적을 삭제하시겠습니까?')) return
    try {
      await personCareerApi.deleteTenureAchievement(tenureId, achievementId)
      if (editingAchievementId === achievementId) resetAchievementForm()
      toast.success('업적이 삭제되었습니다.')
      queryClient.invalidateQueries({
        queryKey: ['tenures-by-country', countryId, historicalCountryId],
      })
    } catch (err: any) {
      toast.error(err?.message ?? '삭제에 실패했습니다.')
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
        : tenures
    return [...source].sort((a: any, b: any) => {
      const orderA = a.termNumber ?? a.regnalNumber ?? 0
      const orderB = b.termNumber ?? b.regnalNumber ?? 0
      if (orderA !== orderB) return orderA - orderB
      const startA = a.startDate ? new Date(a.startDate).getTime() : 0
      const startB = b.startDate ? new Date(b.startDate).getTime() : 0
      return startA - startB
    })
  }, [tenures, tenuresByPosition, effectivePositionLabel])

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
      const personIds = new Set(withOrder.map(getPersonId).filter(Boolean))
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
                      border: '4px solid #e5e7eb',
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
                              {toDisplayPositionLabel(g.label)} ({g.tenures.length})
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
                        {tenures.length > 0 && (
                          <span className="count">
                            {selectedPositionFilter != null
                              ? (tenuresByPosition.find(
                                  (g) => g.label === selectedPositionFilter,
                                )?.tenures.length ?? 0)
                              : tenures.length}
                            건
                          </span>
                        )}
                      </ListTitle>
                    </ListHeadLeft>
                    {/* 목록 검색창 — 목록 뷰일 때만 노출 */}
                    {listViewMode === 'list' && tenures.length > 0 && (
                      <TenureSearchWrap>
                        <TenureSearchIcon><FiSearch size={14} /></TenureSearchIcon>
                        <TenureSearchInput
                          type="text"
                          placeholder="이름, 직책, 연도 검색"
                          value={tenureSearchQuery}
                          onChange={(e) => setTenureSearchQuery(e.target.value)}
                        />
                        {tenureSearchQuery && (
                          <TenureSearchClear
                            type="button"
                            onClick={() => setTenureSearchQuery('')}
                            aria-label="검색어 지우기"
                          >
                            <FiX size={12} />
                          </TenureSearchClear>
                        )}
                      </TenureSearchWrap>
                    )}
                    {/* 보기 방식 탭 — 우측 분리 배치 */}
                    {showLineageTab && (
                      <>
                        <div style={{ width: 1, height: 24, background: '#e2e8f0', flexShrink: 0 }} />
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
                        <div style={{ width: 1, height: 24, background: '#e2e8f0', flexShrink: 0 }} />
                      </>
                    )}
                    <AddTenureButton
                      type="button"
                      onClick={() => setView('register')}
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
                  {tenures.length === 0 ? (
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
                            setCabinetModalTenureId(tenureId)
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
                            setCabinetModalTenureId(tenureId)
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
                      ).map(({ label, tenures: groupTenures }) => (
                        <div key={label}>
                          <PositionSectionTitle>
                            {toDisplayPositionLabel(label)}{' '}
                            <span className="count">
                              {groupTenures.length}명
                            </span>
                          </PositionSectionTitle>
                           <List>
                             {groupTenures.filter((t: any) => {
                               if (!tenureSearchQuery.trim()) return true
                               const q = tenureSearchQuery.trim().toLowerCase()
                               const name = getPersonName(t.person).toLowerCase()
                               const regnal = getRegnalNameFromNotes(t.notes)?.toLowerCase() ?? ''
                               const title = (t.title || t.position?.title || '').toLowerCase()
                               const startYear = t.startDate ? String(t.startDate).slice(0, 4) : ''
                               const endYear = t.endDate ? String(t.endDate).slice(0, 4) : ''
                               return (
                                 name.includes(q) ||
                                 regnal.includes(q) ||
                                 title.includes(q) ||
                                 startYear.includes(q) ||
                                 endYear.includes(q)
                               )
                             }).map((t: any) => {
                               const titleText =
                                 t.title || t.position?.title || '—'
                               const regnalFromNotes = getRegnalNameFromNotes(
                                 t.notes,
                               )
                               const countryLabel =
                                 !isHistorical &&
                                 (t.country?.name || t.historicalCountry?.name)
                                   ? t.country?.name || t.historicalCountry?.name
                                   : null
                               const lifespan = formatPersonLifespan(t.person)
                               const ageAtStart = calcAgeAtTenure(t.person, t.startDate)
                               const isHead =
                                 t.positionType === 'HEAD_OF_STATE' ||
                                 t.positionType === 'HEAD_OF_GOVERNMENT'
                              const isCabinetExpanded =
                                expandedCabinetTenureId === t.id
                              return (
                                <React.Fragment key={t.id}>
                                 <ListItem
                                     role="button"
                                     tabIndex={0}
                                     onClick={() => {
                                       setEditingTenureId(t.id)
                                       setView('register')
                                     }}
                                     onKeyDown={(e) => {
                                       if (e.key === 'Enter' || e.key === ' ') {
                                         e.preventDefault()
                                         setEditingTenureId(t.id)
                                         setView('register')
                                       }
                                     }}
                                   >
                                    <ItemAvatar
                                      $hasImage={!!t.person?.profileImageUrl}
                                    >
                                      {t.person?.profileImageUrl ? (
                                        <img
                                          src={t.person.profileImageUrl}
                                          alt={getPersonName(t.person)}
                                        />
                                      ) : (
                                        <FiUser size={22} />
                                      )}
                                    </ItemAvatar>
                                    <ListItemBody>
                                       <ItemRow>
                                         <ItemName>
                                           {getPersonName(t.person)}
                                         </ItemName>
                                         {(t.termNumber != null ||
                                           t.regnalNumber != null) && (
                                           <ItemTermBadge>
                                             {t.regnalNumber != null
                                               ? `${t.regnalNumber}세`
                                               : `제${t.termNumber}대`}
                                           </ItemTermBadge>
                                         )}
                                         <ItemDates>
                                           {formatDate(t.startDate)}
                                           <span className="sep">–</span>
                                           {t.endDate
                                             ? formatDate(t.endDate)
                                             : '현재'}
                                         </ItemDates>
                                       </ItemRow>
                                       {/* 생몰년 + 취임 당시 나이 */}
                                       {(lifespan !== '생몰년 미상' || ageAtStart != null) && (
                                         <ItemRow>
                                           {lifespan !== '생몰년 미상' && (
                                             <ItemLifespan>{lifespan}</ItemLifespan>
                                           )}
                                           {ageAtStart != null && (
                                             <ItemAgeBadge>취임 {ageAtStart}세</ItemAgeBadge>
                                           )}
                                         </ItemRow>
                                       )}
                                      <ItemRow>
                                        <ItemTitleBadge>
                                          {titleText}
                                        </ItemTitleBadge>
                                        {countryLabel != null && (
                                          <ItemCountryBadge>
                                            {countryLabel}
                                          </ItemCountryBadge>
                                        )}
                                        {regnalFromNotes && (
                                          <ItemRegnalName>
                                            왕명: {regnalFromNotes}
                                          </ItemRegnalName>
                                        )}
                                        {(
                                          t.person as {
                                            dynasty?: {
                                              id: string
                                              name: string
                                            } | null
                                          }
                                        )?.dynasty?.name && (
                                          <ItemDynastyName>
                                            가문:{' '}
                                            {
                                              (
                                                t.person as {
                                                  dynasty: { name: string }
                                                }
                                              ).dynasty.name
                                            }
                                          </ItemDynastyName>
                                        )}
                                      </ItemRow>
                                      {(t.achievements?.length ?? 0) > 0 && (
                                        <ItemRow>
                                          <AchievementChips>
                                            {(t.achievements as any[])
                                              .slice(0, 5)
                                              .map((a: any) => (
                                                <AchievementChip key={a.id}>
                                                  {a.title}
                                                </AchievementChip>
                                              ))}
                                            {(t.achievements as any[]).length >
                                              5 && (
                                              <AchievementChip $more>
                                                +
                                                {(t.achievements as any[])
                                                  .length - 5}
                                              </AchievementChip>
                                            )}
                                          </AchievementChips>
                                        </ItemRow>
                                      )}
                                    </ListItemBody>
                                    <ItemActions>
                                      <AchievementButton
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingTenureId(t.id)
                                          setView('register')
                                        }}
                                        title="수정·업적 등록"
                                      >
                                        <FiAward size={16} />
                                        업적·한일
                                      </AchievementButton>
                                      <ItemAction aria-label="재임 수정">
                                        <FiChevronRight
                                          size={20}
                                          strokeWidth={2.5}
                                        />
                                      </ItemAction>
                                    </ItemActions>
                                  </ListItem>
                                  {isHead && (
                                    <div
                                      style={{
                                        marginLeft: 48,
                                        marginBottom: 12,
                                      }}
                                    >
                                      <CabinetExpandButton
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setExpandedCabinetTenureId(
                                            isCabinetExpanded ? null : t.id,
                                          )
                                        }}
                                      >
                                        <FiChevronDown
                                          size={16}
                                          style={{
                                            transform: isCabinetExpanded
                                              ? 'rotate(180deg)'
                                              : 'none',
                                          }}
                                        />
                                        이 행정부 각료
                                      </CabinetExpandButton>
                                       {isCabinetExpanded && (
                                         <CabinetExpandPanel>
                                           {(subordinateTenures as any[])
                                             .length === 0 ? (
                                             <span
                                               style={{
                                                 fontSize: 13,
                                                 color: '#64748b',
                                               }}
                                             >
                                               등록된 각료가 없습니다. 인물 재임
                                               등록 시 소속 행정부를 선택하면
                                               여기에서 확인할 수 있습니다.
                                             </span>
                                           ) : (
                                             <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                               {(
                                                 subordinateTenures as any[]
                                               ).map((sub: any) => (
                                                 <div
                                                   key={sub.id}
                                                   style={{
                                                     display: 'flex',
                                                     alignItems: 'center',
                                                     gap: 10,
                                                     padding: '8px 12px',
                                                     background: '#fff',
                                                     border: '1px solid #e8ecf0',
                                                     borderRadius: 8,
                                                     fontSize: 13,
                                                   }}
                                                 >
                                                   <div style={{ flex: 1, minWidth: 0 }}>
                                                     <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                                       {sub.positionDefinition?.title ?? sub.title ?? '—'}
                                                     </span>
                                                     <span style={{ color: '#64748b', margin: '0 5px' }}>·</span>
                                                     <span style={{ color: '#334155' }}>{getPersonName(sub.person)}</span>
                                                   </div>
                                                   <span style={{
                                                     fontSize: 11.5, color: '#94a3b8',
                                                     whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                                                   }}>
                                                     {formatDate(sub.startDate)}~{sub.endDate ? formatDate(sub.endDate) : '현재'}
                                                   </span>
                                                   <span style={{
                                                     padding: '2px 7px', fontSize: 11, fontWeight: 600,
                                                     borderRadius: 999,
                                                     color: sub.endDate ? '#64748b' : '#15803d',
                                                     background: sub.endDate ? '#f1f5f9' : '#f0fdf4',
                                                     border: `1px solid ${sub.endDate ? '#e2e8f0' : '#bbf7d0'}`,
                                                   }}>
                                                     {sub.endDate ? '퇴임' : '재임 중'}
                                                   </span>
                                                 </div>
                                               )                                                  )}
                                                </div>
                                              )}
                                         </CabinetExpandPanel>
                                       )}
                                    </div>
                                 )}
                                </React.Fragment>
                              )
                            })}
                          </List>
                        </div>
                      ))}
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
            <BackToListButton
              type="button"
              onClick={() => {
                setEditingTenureId(null)
                setView('list')
              }}
            >
              <FiArrowLeft size={18} />
              목록 보기
            </BackToListButton>
            <HeadsFormTitle>
              {editingTenureId ? '수반 수정' : '수반 등록'}
            </HeadsFormTitle>
            <SubmitButton
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
            </SubmitButton>
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
                                          <div
                                            className="desc prose"
                                            dangerouslySetInnerHTML={{
                                              __html: a.description,
                                            }}
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
                                onChange={(e) =>
                                  setCreateCabinetWithTenure(e.target.checked)
                                }
                              />
                              <label htmlFor="heads-create-cabinet-with-tenure">
                                이 재임으로 행정부도 만들기
                              </label>
                            </CheckboxLabelRow>
                            <FieldHint>
                              체크하면 행정조직 탭에서 이 수반의 내각에 각료를
                              바로 추가할 수 있습니다.
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
        <SettingsOverlay onClick={() => setSettingsModalOpen(false)}>
          <SettingsCard onClick={(e) => e.stopPropagation()}>
            <SettingsHeader>
              <SettingsTitle>역대 수반 설정</SettingsTitle>
              <SettingsClose
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                aria-label="설정 닫기"
              >
                <FiX size={16} />
              </SettingsClose>
            </SettingsHeader>
            <SettingsBody>
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
            </SettingsBody>
          </SettingsCard>
        </SettingsOverlay>
      )}

      {cabinetModalTenureId && (
        <CabinetMembersModalOverlay
          onClick={() => setCabinetModalTenureId(null)}
        >
          <CabinetMembersModalCard onClick={(e) => e.stopPropagation()}>
            <CabinetMembersModalHeader>
              <div>
                <CabinetMembersModalTitle>
                  행정부 각료 현황
                </CabinetMembersModalTitle>
                <CabinetMembersModalDesc>
                  {selectedCabinetHeadCountry} · {selectedCabinetHeadTitle}(
                  {selectedCabinetHeadName})의 각료 구성
                </CabinetMembersModalDesc>
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
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                    color: '#4f46e5', background: '#eef2ff',
                    border: '1px solid #c7d2fe', borderRadius: 8, cursor: 'pointer',
                  }}
                >
                  <FiEdit2 size={12} />
                  수정
                </button>
                <CabinetMembersModalClose
                  type="button"
                  onClick={() => setCabinetModalTenureId(null)}
                  aria-label="각료 목록 닫기"
                >
                  <FiX size={18} />
                </CabinetMembersModalClose>
              </div>
            </CabinetMembersModalHeader>

            <CabinetMembersModalBody>
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
            </CabinetMembersModalBody>
          </CabinetMembersModalCard>
        </CabinetMembersModalOverlay>
      )}
    </SectionOuter>
  )
}

const HEAD_ACCENT = '#6366f1'

const SectionOuter = styled.div<{ $embedded?: boolean }>`
  margin-top: ${({ $embedded }) => ($embedded ? '0' : '0')};
`

const CabinetMembersModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 24px;
`

const CabinetMembersModalCard = styled.div`
  width: min(720px, 100%);
  max-height: min(80vh, 760px);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.12),
    0 1px 3px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const CabinetMembersModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
`

const CabinetMembersModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
`

const CabinetMembersModalDesc = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
`

const CabinetMembersModalClose = styled.button`
  width: 34px;
  height: 34px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: #f8fafc;
    color: #334155;
  }
`

const CabinetMembersModalBody = styled.div`
  padding: 14px 20px 20px;
  overflow: auto;
  flex: 1;
  min-height: 0;
`

const CabinetMembersSummary = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
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
  color: #475569;

  span {
    color: #64748b;
  }
  strong {
    color: #0f172a;
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
  color: #64748b;
`

const CabinetMembersEmpty = styled.div`
  padding: 24px 12px;
  font-size: 14px;
  color: #64748b;
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
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  font-size: 13px;
  color: #334155;

  strong {
    color: #0f172a;
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
  border: 1px solid ${({ $active }) => ($active ? '#bbf7d0' : '#e2e8f0')};
  color: ${({ $active }) => ($active ? '#15803d' : '#64748b')};
  background: ${({ $active }) => ($active ? '#f0fdf4' : '#f8fafc')};
`

const CabinetMembersMetaRow = styled.div`
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 10px;
  align-items: start;
  line-height: 1.45;

  span {
    color: #64748b;
    font-size: 12px;
  }
  b {
    color: #0f172a;
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
  &::-webkit-scrollbar {
    display: none;
  }
`

const PositionFilterTab = styled.button<{ $active?: boolean }>`
  padding: 7px 12px;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active }) => ($active ? '#4338ca' : '#64748b')};
  background: ${({ $active }) => ($active ? '#eef2ff' : 'transparent')};
  border: 1px solid ${({ $active }) => ($active ? '#c7d2fe' : 'transparent')};
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
  white-space: nowrap;

  &:hover {
    color: ${({ $active }) => ($active ? '#4338ca' : '#475569')};
    background: ${({ $active }) => ($active ? '#eef2ff' : '#f8fafc')};
    border-color: ${({ $active }) => ($active ? '#c7d2fe' : '#e2e8f0')};
  }
`

const ListWrap = styled.div<{ $lineageMode?: boolean }>`
  margin-top: 0;
  background: ${({ $lineageMode }) => ($lineageMode ? 'transparent' : '#fff')};
  border: ${({ $lineageMode }) =>
    $lineageMode ? 'none' : '1px solid #e2e8f0'};
  border-radius: ${({ $lineageMode }) => ($lineageMode ? '0' : '16px')};
  overflow: ${({ $lineageMode }) => ($lineageMode ? 'visible' : 'hidden')};
  box-shadow: ${({ $lineageMode }) =>
    $lineageMode ? 'none' : '0 1px 4px rgba(15, 23, 42, 0.04)'};
`

const ListHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  flex-wrap: wrap;
`

const ListHeadLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
  overflow-x: auto;
  min-width: 0;
  flex: 1;
  &::-webkit-scrollbar {
    display: none;
  }
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
  color: ${({ $active }) => ($active ? '#4338ca' : '#64748b')};
  background: ${({ $active }) => ($active ? '#eef2ff' : 'transparent')};
  border: 1px solid ${({ $active }) => ($active ? '#c7d2fe' : 'transparent')};
  border-radius: 7px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    color: ${({ $active }) => ($active ? '#4338ca' : '#475569')};
    background: ${({ $active }) => ($active ? '#eef2ff' : '#f8fafc')};
    border-color: ${({ $active }) => ($active ? '#c7d2fe' : '#e2e8f0')};
  }
`

const LineageWrap = styled.div`
  padding: 0;
  min-height: 200px;
`

const LineageLegend = styled.div`
  margin-bottom: 16px;
  padding: 10px 16px;
  background: #faf5ff;
  border: 1px solid #ede9fe;
  border-radius: 10px;
  font-size: 12px;
  color: #6d28d9;
  line-height: 1.5;
  opacity: 0.85;
`

const ListTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
  line-height: 1.3;

  .count {
    font-weight: 400;
    font-size: 13px;
    color: #94a3b8;
    margin-left: 6px;
  }
`

/** 직책별 섹션 제목 (국왕, 쇼군, 대통령, 총리 등) */
const PositionSectionTitle = styled.h3`
  margin: 0;
  padding: 6px 20px;
  font-size: 11px;
  font-weight: 700;
  color: #3730a3;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: #f5f3ff;
  border-bottom: 1px solid #ede9fe;
  border-top: 1px solid #ede9fe;
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
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: #f8fafc;
    color: #4338ca;
    border-color: #c7d2fe;
  }
`

const SettingsOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1250;
  padding: 20px;
`

const SettingsCard = styled.div`
  width: min(460px, 100%);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.12),
    0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
`

const SettingsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
`

const SettingsTitle = styled.h4`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
`

const SettingsClose = styled.button`
  width: 30px;
  height: 30px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`

const SettingsBody = styled.div`
  padding: 14px 16px 16px;
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
  color: #0f172a;
`

const SettingsHint = styled.div`
  font-size: 12px;
  color: #64748b;
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
  background: #f8fafc;
  border: 1.5px dashed #e2e8f0;
  border-radius: 14px;
  margin: 16px;
`

const EmptyIconWrap = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
`

const EmptyTitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
`

const EmptyDesc = styled.p`
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
  max-width: 320px;
  line-height: 1.5;
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  gap: 0;
`

const ListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e8ecf0;
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  transition:
    background 0.12s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  position: relative;
  margin: 0 8px;
  margin-bottom: 6px;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    background: #f8fafc;
    border-color: #94a3b8;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
  }
`

const ItemAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${({ $hasImage }) => ($hasImage ? '#f1f5f9' : '#eff1fe')};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #818cf8;
  border: 1px solid ${({ $hasImage }) => ($hasImage ? '#e2e8f0' : '#e0e3fc')};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const ListItemBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
`

const ItemName = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
  line-height: 1.3;
`

const ItemTermBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 4px;
  letter-spacing: 0.01em;
  flex-shrink: 0;
`

const ItemDates = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 400;
  color: #94a3b8;
  margin-left: auto;
  white-space: nowrap;

  .sep {
    margin: 0 1px;
    color: #cbd5e1;
  }
`

const ItemTitleBadge = styled.span`
  display: inline-block;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  background: #f1f5f9;
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
  font-size: 11.5px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
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
  color: #0f172a;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.02em;
`

/* 행정조직 통계/중앙부처 탭과 동일 (콘텐츠 너비만, 가로 늘어나지 않음) */
const TabNavigation = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  margin-bottom: 24px;
  width: fit-content;
  background: transparent;
  border: none;
  border-radius: 0;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

const TabButton = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$active ? '#c7d2fe' : 'transparent')};
  background: ${(p) => (p.$active ? '#eef2ff' : 'transparent')};
  color: ${(p) => (p.$active ? '#4338ca' : '#64748b')};
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '600' : '500')};
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    color: ${(p) => (p.$active ? '#4338ca' : '#475569')};
    background: ${(p) => (p.$active ? '#eef2ff' : '#f8fafc')};
    border-color: ${(p) => (p.$active ? '#c7d2fe' : '#e2e8f0')};
  }
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
  .desc.prose {
    font-size: 14px;
    color: #475569;
    line-height: 1.6;
    margin-bottom: 6px;
  }
  .desc.prose p {
    margin: 0 0 0.5em;
  }
  .desc.prose p:last-child {
    margin-bottom: 0;
  }
  .desc.prose ul,
  .desc.prose ol {
    margin: 0.5em 0;
    padding-left: 1.5em;
    list-style-position: outside;
  }
  .desc.prose ul {
    list-style-type: disc;
  }
  .desc.prose ol {
    list-style-type: decimal;
  }
  .desc.prose li {
    margin: 0.25em 0;
    display: list-item;
  }
  .desc.prose li p {
    margin: 0;
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

const FormCardWrapper = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
`

/* 행정조직 부처 등록 헤더와 동일: 한 줄 (목록 보기 | 제목 | 저장) */
const HeadsFormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
  background: #fff;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
`

const HeadsFormTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
  flex: 1;
  min-width: 0;
  @media (max-width: 640px) {
    width: 100%;
    order: -1;
    margin-bottom: 8px;
  }
`

const BackToListButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease;
  order: 0;

  &:hover {
    background: #f1f5f9;
    color: #475569;
    svg {
      transform: translateX(-2px);
    }
  }
  svg {
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
`

const FormSectionInner = styled.div`
  padding: 28px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 0;
`

const FormRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

/* 행정조직 부처 등록 폼과 동일: grid 360px 1fr, borderBottom #f3f4f6 */
const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;
  padding: 20px 0;
  border-bottom: 1px solid #f3f4f6;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 20px 0;
  }
`

const FieldLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  padding-top: 10px;

  @media (max-width: 768px) {
    padding-top: 0;
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

const FieldControl = styled.div<{ $variant?: 'person' | 'datePair' }>`
  min-width: 0;
  max-width: ${({ $variant }) =>
    $variant === 'person'
      ? '360px'
      : $variant === 'datePair'
        ? '480px'
        : '380px'};
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

/* 행정조직 부처 등록 input과 동일 */
const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: #9ca3af;
  }
  &:hover {
    border-color: #d1d5db;
  }
  &:focus {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
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

const SubmitButton = styled.button`
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
  color: #1e293b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: #a5b4fc;
    background: #fff;
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
  background: #cbd5e1;
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  padding: 0;

  &:hover {
    background: #94a3b8;
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
