/**
 * 역대 수반(국가원수·정부수반·군주 등) 재임 기록 목록 및 추가 섹션
 * 연대표 국가 상세에서 해당 국가의 재임 기록을 보고 추가할 수 있음
 */
import React, { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import { FiPlus, FiUser, FiCalendar, FiChevronRight, FiArrowLeft, FiChevronDown, FiSave, FiAward, FiTrash2, FiInfo, FiEdit2 } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { uploadImage } from '@/shared/api/upload'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/RichTextEditor'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api'
import { getAllPersons, getPersonsByTenureCountry } from '@/shared/api/persons'
import { personCareerApi } from '@/shared/api/person-career'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { CountrySearchModal } from '@/shared/ui/country-search-modal'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/PersonSelectModal'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { LineageTree } from './lineage-tree.widget'

/** 수반 등록 시 직책 선택에 사용할 관직 유형 (DB 관직 정의 필터용) */
const HEADS_POSITION_TYPES = new Set([
  'HEAD_OF_STATE',
  'HEAD_OF_GOVERNMENT',
  'REGENT',
  'HEIR_APPARENT',
  'ROYAL_NOBLE_TITLE',
])

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

export function HeadsOfStateSection({ country, embedded }: HeadsOfStateSectionProps) {
  const queryClient = useQueryClient()
  const isHistorical = country.type === 'historical'
  const [showLoading, setShowLoading] = useState(true)
  const loadStartRef = useRef<number>(Date.now())
  const minLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countryId = !isHistorical ? country.id : undefined
  const historicalCountryId = isHistorical ? country.id : undefined

  const [view, setView] = useState<'list' | 'register'>('list')
  /** 목록 내 표시 모드: 목록 | 계보도(대수 기준) */
  const [listViewMode, setListViewMode] = useState<'list' | 'lineage'>('lineage')
  /** 수정 모드: 목록에서 클릭한 재임 ID (설정되면 수정 폼 표시) */
  const [editingTenureId, setEditingTenureId] = useState<string | null>(null)
  const [personSelectModalOpen, setPersonSelectModalOpen] = useState(false)
  const [positionTitleModalOpen, setPositionTitleModalOpen] = useState(false)
  const [startDateModalOpen, setStartDateModalOpen] = useState(false)
  const [endDateModalOpen, setEndDateModalOpen] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState('')
  /** 직책: DB 관직 정의 ID. null이면 기타(직접 입력) */
  const [selectedPositionDefinitionId, setSelectedPositionDefinitionId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [termNumber, setTermNumber] = useState('')
  const [regnalNumber, setRegnalNumber] = useState('')
  const [regnalName, setRegnalName] = useState('')
  /** 사건 페이지(역대 수반 토글)에 이 재임을 노출할지 여부 */
  const [showOnEventsPage, setShowOnEventsPage] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  /** 계보도에서 표시할 직책(직책명). 직책별로 계보를 분리해 표시 */
  const [selectedLineagePositionLabel, setSelectedLineagePositionLabel] = useState<string | null>(
    null,
  )
  /** 역대 수반 페이지에서 사용자가 선택한 직책. null = 전체 */
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<string | null>(null)
  /** 수반 등록 시 소속 국가: null = 현대 국가(현재), 값 있으면 하위 역사적 국가 ID */
  const [selectedAffinityHistoricalId, setSelectedAffinityHistoricalId] = useState<string | null>(
    null,
  )
  const [affinityCountryModalOpen, setAffinityCountryModalOpen] = useState(false)

  /** 업적: 컨텐츠 영역 인라인 폼용 (모달 없음) */
  const [achievementTenureId, setAchievementTenureId] = useState<string | null>(null)
  const [achievementPersonName, setAchievementPersonName] = useState('')
  const [achievementTitle, setAchievementTitle] = useState('')
  const [achievementDescription, setAchievementDescription] = useState('')
  const [achievementStartDate, setAchievementStartDate] = useState('')
  const [achievementEndDate, setAchievementEndDate] = useState('')
  const [achievementShowOnEventsPage, setAchievementShowOnEventsPage] = useState(true)
  const [achievementDateField, setAchievementDateField] = useState<'start' | 'end' | null>(null)
  const [achievementSubmitting, setAchievementSubmitting] = useState(false)
  /** 수정 중인 업적 ID (설정 시 폼이 수정 모드) */
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null)
  /** 수정 폼 탭: 기본정보 | 업적 */
  const [tenureFormTab, setTenureFormTab] = useState<'basic' | 'achievement'>('basic')

  /** 현대 국가일 때 하위 역사적 국가 목록 (이 현대 국가에 연결된 역사적 국가) */
  const { data: subordinateHistoricalFromApi = [] } = useHistoricalCountriesByModernCountry(
    countryId ?? '',
  )
  const subordinateHistorical =
    (country as any).historicalCountries?.length > 0
      ? (country as any).historicalCountries
      : subordinateHistoricalFromApi
  const hasSubordinateHistorical = Array.isArray(subordinateHistorical) && subordinateHistorical.length > 0

  const { data: tenures = [], isLoading } = useQuery({
    queryKey: ['tenures-by-country', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId,
        historicalCountryId,
      }),
    enabled: !!countryId || !!historicalCountryId,
  })

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
    return [...byDef, { value: OTHER_POSITION_VALUE, label: '기타 (직접 입력)' }]
  }, [positionDefinitions])

  const refetch = () => {
    queryClient.invalidateQueries({
      queryKey: ['tenures-by-country', countryId, historicalCountryId],
    })
    queryClient.invalidateQueries({
      queryKey: ['position-definitions', countryId, historicalCountryId],
    })
  }

  const selectedPositionDefinition = selectedPositionDefinitionId
    ? (positionDefinitions as any[]).find((d) => d.id === selectedPositionDefinitionId)
    : null

  /** 재임 기록의 소속 국가 표시명 (역사적 국가·현대 국가 구분). 헤더에 "신성로마제국 · 황제"처럼 표시하기 위함 */
  const getCountryNameForTenure = React.useCallback(
    (t: any) =>
      (t?.historicalCountry?.name ?? t?.country?.name ?? (country as { name?: string })?.name ?? '').trim(),
    [country],
  )

  /** 국가·직책별로 묶은 재임 목록. "신성로마제국 · 황제", "브란덴부르크 선제후국 · 선제후"처럼 소속 국가별로 구분 */
  const tenuresByPosition = React.useMemo(() => {
    const defs = positionDefinitions as any[]
    const getPositionLabel = (t: any) => {
      const defId = t.positionDefinitionId ?? t.position?.id
      const def = defId && defs.length ? defs.find((d: any) => d.id === defId) : null
      if (def?.title) return def.title.trim()
      const title = (t.title || t.position?.title || '').trim()
      return title || '(기타)'
    }
    const map = new Map<string, any[]>()
    tenures.forEach((t: any) => {
      const countryName = getCountryNameForTenure(t)
      const positionLabel = getPositionLabel(t)
      const key = countryName ? `${countryName} · ${positionLabel}` : positionLabel
      const list = map.get(key) ?? []
      list.push(t)
      map.set(key, list)
    })
    const getRankForLabel = (label: string) => {
      const positionPart = label.includes(' · ') ? label.split(' · ')[1]?.trim() ?? label : label
      return defs.find((d: any) => d.title === positionPart)?.rank ?? 999
    }
    return Array.from(map.entries())
      .map(([label, list]) => ({ label, tenures: list }))
      .sort((a, b) => {
        const rankA = getRankForLabel(a.label)
        const rankB = getRankForLabel(b.label)
        if (rankA !== rankB) return rankA - rankB
        return a.label.localeCompare(b.label, 'ko')
      })
  }, [tenures, positionDefinitions, getCountryNameForTenure])

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
    setTermNumber(t.termNumber != null ? String(t.termNumber) : '')
    setRegnalNumber(t.regnalNumber != null ? String(t.regnalNumber) : '')
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
      const notesValue = regnalName.trim() ? `왕명: ${regnalName.trim()}` : undefined
      // 정의 선택 시 직함은 2차 카테고리(Definition)에만 두고 Tenure에는 저장하지 않음
      const payload = {
        personId: selectedPersonId,
        positionType: resolvedPositionType as any,
        positionDefinitionId: def?.id || undefined,
        title: def ? undefined : title.trim() || undefined,
        titleEn: def ? undefined : (titleEn.trim() || undefined),
        countryId: selectedAffinityHistoricalId ? undefined : countryId ?? undefined,
        historicalCountryId: selectedAffinityHistoricalId ?? historicalCountryId ?? undefined,
        startDate,
        endDate: endDate || undefined,
        termNumber: termNumber.trim() === '' ? null : (parseInt(termNumber, 10) || undefined),
        regnalNumber: regnalNumber.trim() === '' ? null : (parseInt(regnalNumber, 10) || undefined),
        notes: notesValue,
        showPositionInfo: showOnEventsPage,
      }
      if (editingTenureId) {
        await personCareerApi.updateGovernmentPositionTenure(editingTenureId, payload)
        toast.success('재임 기록이 수정되었습니다.')
      } else {
        await personCareerApi.addGovernmentPositionTenure(payload)
        toast.success('재임 기록이 추가되었습니다.')
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
    setTermNumber('')
    setRegnalNumber('')
    setRegnalName('')
    setShowOnEventsPage(true)
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
      ? (title ? `기타: ${title}` : '기타 (직접 입력)')
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
      return y && m && d ? `BC ${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일` : iso
    }
    const date = new Date(iso)
    if (isNaN(date.getTime())) return iso
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getPersonName = (p: { name?: string; surname?: string; middleName?: string; nameDisplayOrder?: string } | null) => {
    if (!p) return '—'
    return getPersonDisplayName({
      name: p.name || '',
      surname: p.surname ?? '',
      middleName: p.middleName ?? '',
      nameDisplayOrder: (p.nameDisplayOrder as 'korean' | 'western') ?? 'korean',
    })
  }

  /** notes에서 "왕명: xxx" 추출 */
  const getRegnalNameFromNotes = (notes: string | null | undefined) => {
    if (!notes?.trim()) return null
    const m = notes.match(/왕명\s*:\s*(.+?)(?:\n|$)/i) || notes.match(/왕명\s*:\s*(.+)/i)
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
  const startEditAchievement = (a: { id: string; title?: string; description?: string; startDate?: string; endDate?: string; showOnEventsPage?: boolean }) => {
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
        await personCareerApi.updateTenureAchievement(tenureId, editingAchievementId, dto)
        toast.success('업적이 수정되었습니다.')
      } else {
        await personCareerApi.createTenureAchievement(tenureId, dto)
        toast.success('업적·한일이 등록되었습니다.')
      }
      resetAchievementForm()
      queryClient.invalidateQueries({ queryKey: ['tenures-by-country', countryId, historicalCountryId] })
    } catch (err: any) {
      toast.error(err?.message ?? (editingAchievementId ? '수정에 실패했습니다.' : '등록에 실패했습니다.'))
    } finally {
      setAchievementSubmitting(false)
    }
  }

  /** 업적 삭제 */
  const handleDeleteAchievement = async (tenureId: string, achievementId: string) => {
    if (!window.confirm('이 업적을 삭제하시겠습니까?')) return
    try {
      await personCareerApi.deleteTenureAchievement(tenureId, achievementId)
      if (editingAchievementId === achievementId) resetAchievementForm()
      toast.success('업적이 삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['tenures-by-country', countryId, historicalCountryId] })
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
        ? tenuresByPosition.find((g) => g.label === effectivePositionLabel)?.tenures ?? []
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
    if (selectedLineagePositionLabel == null || !labels.has(selectedLineagePositionLabel)) {
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

  /** personId → full person (서버 persons 목록, fatherId/motherId 포함). 키는 normId로 통일 */
  const personById = React.useMemo(() => {
    const map = new Map<string, any>()
    persons.forEach((p: any) => {
      const k = normId(p.id)
      if (k) map.set(k, p)
    })
    return map
  }, [persons])

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
    const getPersonId = (t: any) => normId(t?.person?.id ?? (t as any)?.personId)
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
          (byRow.get(r) ?? []).sort((a: any, b: any) => orderNum(a) - orderNum(b)),
        )
      const placement = new Map<string, { row: number; col: number }>()
      rows.forEach((row, rowIdx) => {
        row.forEach((t: any, colIdx: number) => placement.set(t.id, { row: rowIdx, col: colIdx }))
      })
      const personIds = new Set(withOrder.map(getPersonId).filter(Boolean))
      const tenureByPersonId = new Map<string, any>()
      withOrder.forEach((t: any) => {
        const pid = getPersonId(t)
        if (!pid) return
        const existing = tenureByPersonId.get(pid)
        if (!existing || orderNum(existing) < orderNum(t)) tenureByPersonId.set(pid, t)
      })
      const parentToChildren = new Map<string, string[]>()
      withOrder.forEach((t: any) => {
        const parentPersonId = getParentIdFromTenureForRow(t, personIds, personById, persons)
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

  /** 전체일 때: 모든 직책을 세기별로 묶어 하나의 막대·하나의 트리로 표시. 랭크 순으로 직책 정렬, 같은 세로 열에는 같은 직책만, 직책 구간마다 구분선 */
  const mergedLineageAll = React.useMemo(() => {
    if (selectedPositionFilter != null) return null
    const defs = positionDefinitions as any[]
    const getRank = (label: string) => {
      const positionPart = label.includes(' · ') ? label.split(' · ')[1]?.trim() ?? label : label
      return defs.find((d: any) => d.title === positionPart)?.rank ?? 999
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
      lineageEligibleGroups.find((g) => g.tenures.some((x: any) => x.id === t.id))?.label ?? '—'
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
    const getPersonId = (t: any) => normId(t?.person?.id ?? (t as any)?.personId)
    const centuries = Array.from(byCentury.keys()).sort((a, b) => a - b)
    const positionsOrder = [...lineageEligibleGroups]
      .sort((a, b) => getRank(a.label) - getRank(b.label))
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
      const startTime = (t: any) => (t?.startDate ? new Date(t.startDate).getTime() : 0)
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
        const rowTenures = tenuresInCentury.filter((t: any) => subRowByTenureId.get(t.id) === sr)
        if (rowTenures.length > 0) rowGroups.push(rowTenures)
      }
      const minStart = (row: any[]) =>
        Math.min(...row.map((t: any) => (t.startDate ? new Date(t.startDate).getTime() : 0)))
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
      label: pos,
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
    return { rows, placement, parentToChildren, separatorBeforeCols, positionHeaders, yearRange }
  }, [lineageEligibleGroups, selectedPositionFilter, lineageByGroup, positionDefinitions, personById, persons])

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
      const fromTenure = (t?.person as { dynasty?: { name: string } } | undefined)?.dynasty?.name
      if (fromTenure) return fromTenure
      const pid = normId(t?.person?.id ?? (t as any)?.personId)
      if (!pid) return null
      const p = personById.get(pid) ?? persons.find((x: any) => normId(x.id) === pid)
      return (p as { dynasty?: { name: string } } | undefined)?.dynasty?.name ?? null
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
    const startTime = (t: any) => (t?.startDate ? new Date(t.startDate).getTime() : 0)
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
      row.forEach((t: any, colIdx: number) => map.set(t.id, { row: rowIdx, col: colIdx }))
    })
    return map
  }, [lineageRows])

  /** 부모 tenure id -> 자식 tenure id[] (연결선 그리기용). 서버 persons의 fatherId 기준. */
  const parentToChildren = React.useMemo(() => {
    const getPersonId = (t: any) => normId(t?.person?.id ?? (t as any)?.personId)
    const personIds = new Set<string>(
      lineageTenures.map(getPersonId).filter((id): id is string => id != null),
    )
    const tenureByPersonId = new Map<string, any>()
    lineageTenures.forEach((t: any) => {
      const pid = getPersonId(t)
      if (!pid) return
      const existing = tenureByPersonId.get(pid)
      const order = t.termNumber ?? t.regnalNumber ?? 0
      if (!existing || (existing.termNumber ?? existing.regnalNumber ?? 0) > order)
        tenureByPersonId.set(pid, t)
    })
    const map = new Map<string, string[]>()
    lineageTenures.forEach((t: any) => {
      const parentPersonId = getParentIdFromTenureForRow(t, personIds, personById, persons)
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
                transition={{ duration: FADE_DURATION, ease: [0.25, 0.1, 0.25, 1] }}
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
                transition={{ duration: FADE_DURATION, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <ListWrap>
                  <ListHead>
                    <ListHeadLeft>
                      {tenuresByPosition.length > 0 && (
                        <PositionFilterTabs role="tablist" aria-label="직책 선택">
                          <PositionFilterTab
                            role="tab"
                            type="button"
                            $active={selectedPositionFilter == null}
                            onClick={() => {
                              setSelectedPositionFilter(null)
                              setSelectedLineagePositionLabel(
                                lineageEligibleGroups.length > 0 ? lineageEligibleGroups[0].label : null,
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
                              {g.label} ({g.tenures.length})
                            </PositionFilterTab>
                          ))}
                        </PositionFilterTabs>
                      )}
                      {showLineageTab && (
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
                      )}
                      <ListTitle>
                        {listViewMode === 'lineage' && lineageTenures.length > 0
                          ? effectivePositionLabel
                            ? `${effectivePositionLabel} 계보`
                            : (country as { name?: string })?.name
                              ? `${(country as { name: string }).name} · 역대 수반 계보`
                              : '역대 수반 계보'
                          : '재임 목록'}
                        {tenures.length > 0 && (
                          <span className="count">
                            {selectedPositionFilter != null
                              ? tenuresByPosition.find((g) => g.label === selectedPositionFilter)
                                  ?.tenures.length ?? 0
                              : tenures.length}
                            건
                          </span>
                        )}
                      </ListTitle>
                    </ListHeadLeft>
                    <AddTenureButton type="button" onClick={() => setView('register')}>
                      <FiPlus size={20} />
                      수반 등록
                    </AddTenureButton>
                  </ListHead>
                  {tenures.length === 0 ? (
                    <EmptyState>
                      <EmptyIconWrap>
                        <FiUser size={40} />
                      </EmptyIconWrap>
                      <EmptyTitle>등록된 재임 기록이 없습니다</EmptyTitle>
                      <EmptyDesc>수반 등록 버튼을 눌러 재임 기록을 추가해 보세요.</EmptyDesc>
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
                          separatorBeforeCols={mergedLineageAll.separatorBeforeCols}
                          positionHeaders={mergedLineageAll.positionHeaders}
                          onCardClick={(tenureId) => {
                            setEditingTenureId(tenureId)
                            setView('register')
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
                            setEditingTenureId(tenureId)
                            setView('register')
                          }}
                        />
                      )}
                    </LineageWrap>
                  ) : (
                    <>
                      {(selectedPositionFilter != null
                        ? tenuresByPosition.filter((g) => g.label === selectedPositionFilter)
                        : tenuresByPosition
                      ).map(({ label, tenures: groupTenures }) => (
                        <div key={label} style={{ marginBottom: 24 }}>
                          <PositionSectionTitle>
                            {label} <span className="count">({groupTenures.length}명)</span>
                          </PositionSectionTitle>
                          <List>
                            {groupTenures.map((t: any) => {
                              const titleText = t.title || t.position?.title || '—'
                              const regnalFromNotes = getRegnalNameFromNotes(t.notes)
                              const countryLabel =
                                !isHistorical &&
                                (t.country?.name || t.historicalCountry?.name)
                                  ? t.country?.name || t.historicalCountry?.name
                                  : null
                              return (
                                <ListItem
                                  key={t.id}
                                  onClick={() => {
                                    setEditingTenureId(t.id)
                                    setView('register')
                                  }}
                                >
                                  <ItemAvatar $hasImage={!!t.person?.profileImageUrl}>
                                    {t.person?.profileImageUrl ? (
                                      <img src={t.person.profileImageUrl} alt="" />
                                    ) : (
                                      <FiUser size={22} />
                                    )}
                                  </ItemAvatar>
                                  <ListItemBody>
                                    <ItemRow>
                                      <ItemName>
                                        {getPersonName(t.person)}
                                        {(t.termNumber != null || t.regnalNumber != null) && (
                                          <ItemTermBadge>
                                            {t.regnalNumber != null
                                              ? `${t.regnalNumber}세`
                                              : `제${t.termNumber}대`}
                                          </ItemTermBadge>
                                        )}
                                      </ItemName>
                                      <ItemDates>
                                        <FiCalendar size={14} />
                                        {formatDate(t.startDate)}
                                        <span className="sep">~</span>
                                        {t.endDate ? formatDate(t.endDate) : '현재'}
                                      </ItemDates>
                                    </ItemRow>
                                    <ItemRow>
                                      <ItemTitleBadge>{titleText}</ItemTitleBadge>
                                      {countryLabel != null && (
                                        <ItemCountryBadge>{countryLabel}</ItemCountryBadge>
                                      )}
                                      {regnalFromNotes && (
                                        <ItemRegnalName>왕명: {regnalFromNotes}</ItemRegnalName>
                                      )}
                                      {(t.person as { dynasty?: { id: string; name: string } | null })?.dynasty?.name && (
                                        <ItemDynastyName>
                                          가문: {(t.person as { dynasty: { name: string } }).dynasty.name}
                                        </ItemDynastyName>
                                      )}
                                    </ItemRow>
                                    {(t.achievements?.length ?? 0) > 0 && (
                                      <ItemRow>
                                        <AchievementChips>
                                          {(t.achievements as any[]).slice(0, 5).map((a: any) => (
                                            <AchievementChip key={a.id}>{a.title}</AchievementChip>
                                          ))}
                                          {(t.achievements as any[]).length > 5 && (
                                            <AchievementChip $more>+{(t.achievements as any[]).length - 5}</AchievementChip>
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
                                      <FiChevronRight size={20} strokeWidth={2.5} />
                                    </ItemAction>
                                  </ItemActions>
                                </ListItem>
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
            <HeadsFormTitle>{editingTenureId ? '수반 수정' : '수반 등록'}</HeadsFormTitle>
            <SubmitButton
              type="submit"
              form="heads-of-state-register-form"
              disabled={isSubmitting || !selectedPersonId || (!title.trim() && !selectedPositionDefinitionId) || !startDate}
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
                        ? (subordinateHistorical as any[]).find(
                            (h: any) => h.id === selectedAffinityHistoricalId,
                          )?.name ?? '역사적 국가'
                        : `현대 국가 (현재: ${country.name})`}
                    </span>
                    <FiChevronDown size={20} />
                  </SelectTriggerButton>
                  <FieldHint>
                    현대 국가 또는 이 국가에 연결된 하위 역사적 국가 중 하나를 선택하세요.
                  </FieldHint>
                </FieldControl>
              </FieldRow>
            )}
            <FieldRow>
              <FieldLabel>인물 <Required>필수</Required></FieldLabel>
              <FieldControl $variant="person">
                <PersonSelectButton
                  type="button"
                  onClick={() => setPersonSelectModalOpen(true)}
                  $hasValue={!!selectedPersonId}
                >
                  <PersonAvatar $hasImage={!!selectedPerson?.profileImageUrl}>
                    {selectedPerson?.profileImageUrl ? (
                      <img src={selectedPerson.profileImageUrl} alt="" />
                    ) : (
                      <FiUser size={22} />
                    )}
                  </PersonAvatar>
                  <PersonLabel>
                    {selectedPersonId
                      ? getPersonName(selectedPerson)
                      : '인물 선택'}
                  </PersonLabel>
                  <FiChevronRight size={20} strokeWidth={2.5} />
                </PersonSelectButton>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>직책명 <Required>필수</Required></FieldLabel>
              <FieldControl>
              <SelectTriggerButton
                type="button"
                onClick={() => setPositionTitleModalOpen(true)}
                $hasValue={selectedPositionDefinitionId != null || title.trim() !== ''}
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
            <FieldRow>
              <FieldLabel>취임일 · 퇴임일 <Required>필수</Required></FieldLabel>
              <FieldControl $variant="datePair">
                <DatePairRow>
                  <SelectTriggerButton
                    type="button"
                    onClick={() => setStartDateModalOpen(true)}
                    $hasValue={!!startDate}
                  >
                    <FiCalendar size={16} />
                    <span>{startDate ? formatDateForInput(startDate) : '취임일'}</span>
                    <FiChevronDown size={20} />
                  </SelectTriggerButton>
                  <SelectTriggerButton
                    type="button"
                    onClick={() => setEndDateModalOpen(true)}
                    $hasValue={!!endDate}
                  >
                    <FiCalendar size={16} />
                    <span>{endDate ? formatDateForInput(endDate) : '퇴임일 (선택)'}</span>
                    <FiChevronDown size={20} />
                  </SelectTriggerButton>
                </DatePairRow>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>대수</FieldLabel>
              <FieldControl>
                <Input
                  type="number"
                  min={1}
                  value={termNumber}
                  onChange={(e) => setTermNumber(e.target.value)}
                  placeholder="예: 4 (세종 = 조선 제4대)"
                  title="동아시아: 제n대"
                />
                <FieldHint>동아시아 군주·대통령용. 제4대 → 4 입력</FieldHint>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>재위 번호</FieldLabel>
              <FieldControl>
                <Input
                  type="number"
                  min={1}
                  value={regnalNumber}
                  onChange={(e) => setRegnalNumber(e.target.value)}
                  placeholder="예: 14 (루이 14세)"
                  title="서양 군주: 이름 뒤 숫자"
                />
                <FieldHint>서양 군주용. 루이 14세 → 14, 제임스 1세 → 1</FieldHint>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>사건 페이지 노출</FieldLabel>
              <FieldControl>
                <CheckboxRow>
                  <input
                    type="checkbox"
                    id="heads-show-on-events"
                    checked={showOnEventsPage}
                    onChange={(e) => setShowOnEventsPage(e.target.checked)}
                  />
                  <label htmlFor="heads-show-on-events">
                    사건 목록 페이지에 이 수반을 노출합니다 (역대 수반 토글 시 표시)
                  </label>
                </CheckboxRow>
              </FieldControl>
            </FieldRow>
          </FormRows>
                        <FormActions>
                          {editingTenureId && (
                            <DeleteButton type="button" onClick={handleDeleteTenure} disabled={isSubmitting}>
                              삭제
                            </DeleteButton>
                          )}
                          <ResetButton type="button" onClick={resetForm} disabled={isSubmitting}>
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
                            재위 기간 중 한 일·업적을 등록합니다. (사건과 별도로 관리되며, 사건 페이지 표시를 켜면 연대표에 나옵니다.)
                          </AchievementSectionHint>
                          {(() => {
                            const editingTenure = tenures.find((t: any) => t.id === editingTenureId) as any
                            const achievements = (editingTenure?.achievements ?? []) as any[]
                            return (
                              <>
                                {achievements.length > 0 && (
                                  <AchievementCardList>
                                    {achievements.map((a: any) => (
                                      <AchievementCard key={a.id}>
                                        <AchievementCardContent>
                                          <strong className="title">{a.title}</strong>
                                          {a.description && (
                                            <div
                                              className="desc prose"
                                              dangerouslySetInnerHTML={{ __html: a.description }}
                                            />
                                          )}
                                          {(a.startDate || a.endDate) && (
                                            <span className="date">
                                              {a.startDate ? formatDateForInput(a.startDate) : ''}
                                              {a.startDate && a.endDate ? ' ~ ' : ''}
                                              {a.endDate ? formatDateForInput(a.endDate) : ''}
                                            </span>
                                          )}
                                        </AchievementCardContent>
                                        <AchievementCardActions>
                                          <EditAchievementButton
                                            type="button"
                                            onClick={() => startEditAchievement(a)}
                                            title="업적 수정"
                                          >
                                            <FiEdit2 size={16} />
                                          </EditAchievementButton>
                                          <DeleteAchievementButton
                                            type="button"
                                            onClick={() => handleDeleteAchievement(editingTenureId, a.id)}
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
                                    <Input
                                      type="text"
                                      value={achievementTitle}
                                      onChange={(e) => setAchievementTitle(e.target.value)}
                                      placeholder="예: 한글 창제, 대동법 시행"
                                    />
                                  </AchievementField>
                                  <AchievementField>
                                    <label>시작일 / 종료일 (선택)</label>
                                    <DatePairRow>
                                      <SelectTriggerButton
                                        type="button"
                                        onClick={() => setAchievementDateField('start')}
                                        $hasValue={!!achievementStartDate}
                                      >
                                        <FiCalendar size={16} />
                                        <span>{achievementStartDate ? formatDateForInput(achievementStartDate) : '시작일 선택'}</span>
                                        <FiChevronDown size={20} />
                                      </SelectTriggerButton>
                                      <SelectTriggerButton
                                        type="button"
                                        onClick={() => setAchievementDateField('end')}
                                        $hasValue={!!achievementEndDate}
                                      >
                                        <FiCalendar size={16} />
                                        <span>{achievementEndDate ? formatDateForInput(achievementEndDate) : '종료일 선택'}</span>
                                        <FiChevronDown size={20} />
                                      </SelectTriggerButton>
                                    </DatePairRow>
                                  </AchievementField>
                                  <AchievementField>
                                    <label>설명 (선택)</label>
                                    <RichTextEditor
                                      value={achievementDescription}
                                      onChange={setAchievementDescription}
                                      showTitle={false}
                                      placeholder="내용을 입력하세요. 사건 등록과 동일하게 서식·이미지를 넣을 수 있습니다."
                                      onImageUpload={async (file) => {
                                        const result = await uploadImage(file, 'persons')
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
                                        onChange={(e) => setAchievementShowOnEventsPage(e.target.checked)}
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
                                      disabled={achievementSubmitting || !achievementTitle.trim()}
                                    >
                                      {achievementSubmitting
                                        ? (editingAchievementId ? '수정 중…' : '등록 중…')
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
                                  ? (subordinateHistorical as any[]).find(
                                      (h: any) => h.id === selectedAffinityHistoricalId,
                                    )?.name ?? '역사적 국가'
                                  : `현대 국가 (현재: ${country.name})`}
                              </span>
                              <FiChevronDown size={20} />
                            </SelectTriggerButton>
                            <FieldHint>
                              현대 국가 또는 이 국가에 연결된 하위 역사적 국가 중 하나를 선택하세요.
                            </FieldHint>
                          </FieldControl>
                        </FieldRow>
                      )}
                      <FieldRow>
                        <FieldLabel>인물 <Required>필수</Required></FieldLabel>
                        <FieldControl $variant="person">
                          <PersonSelectButton
                            type="button"
                            onClick={() => setPersonSelectModalOpen(true)}
                            $hasValue={!!selectedPersonId}
                          >
                            <PersonAvatar $hasImage={!!selectedPerson?.profileImageUrl}>
                              {selectedPerson?.profileImageUrl ? (
                                <img src={selectedPerson.profileImageUrl} alt="" />
                              ) : (
                                <FiUser size={22} />
                              )}
                            </PersonAvatar>
                            <PersonLabel>
                              {selectedPersonId
                                ? getPersonName(selectedPerson)
                                : '인물 선택'}
                            </PersonLabel>
                            <FiChevronRight size={20} strokeWidth={2.5} />
                          </PersonSelectButton>
                        </FieldControl>
                      </FieldRow>
                      <FieldRow>
                        <FieldLabel>직책명 <Required>필수</Required></FieldLabel>
                        <FieldControl>
                          <SelectTriggerButton
                            type="button"
                            onClick={() => setPositionTitleModalOpen(true)}
                            $hasValue={selectedPositionDefinitionId != null || title.trim() !== ''}
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
                      <FieldRow>
                        <FieldLabel>취임일 · 퇴임일 <Required>필수</Required></FieldLabel>
                        <FieldControl $variant="datePair">
                          <DatePairRow>
                            <SelectTriggerButton
                              type="button"
                              onClick={() => setStartDateModalOpen(true)}
                              $hasValue={!!startDate}
                            >
                              <FiCalendar size={16} />
                              <span>{startDate ? formatDateForInput(startDate) : '취임일'}</span>
                              <FiChevronDown size={20} />
                            </SelectTriggerButton>
                            <SelectTriggerButton
                              type="button"
                              onClick={() => setEndDateModalOpen(true)}
                              $hasValue={!!endDate}
                            >
                              <FiCalendar size={16} />
                              <span>{endDate ? formatDateForInput(endDate) : '퇴임일 (선택)'}</span>
                              <FiChevronDown size={20} />
                            </SelectTriggerButton>
                          </DatePairRow>
                        </FieldControl>
                      </FieldRow>
                      <FieldRow>
                        <FieldLabel>대수</FieldLabel>
                        <FieldControl>
                          <Input
                            type="number"
                            min={1}
                            value={termNumber}
                            onChange={(e) => setTermNumber(e.target.value)}
                            placeholder="예: 4 (세종 = 조선 제4대)"
                            title="동아시아: 제n대"
                          />
                          <FieldHint>동아시아 군주·대통령용. 제4대 → 4 입력</FieldHint>
                        </FieldControl>
                      </FieldRow>
                      <FieldRow>
                        <FieldLabel>재위 번호</FieldLabel>
                        <FieldControl>
                          <Input
                            type="number"
                            min={1}
                            value={regnalNumber}
                            onChange={(e) => setRegnalNumber(e.target.value)}
                            placeholder="예: 14 (루이 14세)"
                            title="서양 군주: 이름 뒤 숫자"
                          />
                          <FieldHint>서양 군주용. 루이 14세 → 14, 제임스 1세 → 1</FieldHint>
                        </FieldControl>
                      </FieldRow>
                      <FieldRow>
                        <FieldLabel>사건 페이지 노출</FieldLabel>
                        <FieldControl>
                          <CheckboxRow>
                            <input
                              type="checkbox"
                              id="heads-show-on-events-new"
                              checked={showOnEventsPage}
                              onChange={(e) => setShowOnEventsPage(e.target.checked)}
                            />
                            <label htmlFor="heads-show-on-events-new">
                              사건 목록 페이지에 이 수반을 노출합니다 (역대 수반 토글 시 표시)
                            </label>
                          </CheckboxRow>
                        </FieldControl>
                      </FieldRow>
                    </FormRows>
                    <FormActions>
                      <ResetButton type="button" onClick={resetForm} disabled={isSubmitting}>
                        초기화
                      </ResetButton>
                    </FormActions>
                  </>
                )}
              </FormSectionInner>
          </form>
        </FormCardWrapper>
      )}

      {personSelectModalOpen && (
        <PersonSelectModal
          persons={allPersonsForModal}
          selectedPersonId={selectedPersonId}
          onSelect={(id) => {
            setSelectedPersonId(id)
            setPersonSelectModalOpen(false)
          }}
          onClose={() => setPersonSelectModalOpen(false)}
        />
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
          historicalCountries={(subordinateHistorical as any[]).map((h: any) => ({
            id: h.id,
            name: h.name,
            flagEmoji: (h as any).flagEmoji ?? null,
            enName: h.enName,
            startYear: h.startYear,
            endYear: h.endYear,
          }))}
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

      <DatePickerModal
        isOpen={startDateModalOpen}
        onClose={() => setStartDateModalOpen(false)}
        title="취임일 선택"
        initialDate={startDate || undefined}
        onSelect={(date) => {
          setStartDate(date)
          setStartDateModalOpen(false)
          setEndDateModalOpen(true)
        }}
      />

      <DatePickerModal
        isOpen={endDateModalOpen}
        onClose={() => setEndDateModalOpen(false)}
        title="퇴임일 선택"
        initialDate={endDate || undefined}
        onSelect={(date) => {
          setEndDate(date)
          setEndDateModalOpen(false)
        }}
      />
    </SectionOuter>
  )
}

const HEAD_ACCENT = '#6366f1'

const SectionOuter = styled.div<{ $embedded?: boolean }>`
  margin-top: ${({ $embedded }) => ($embedded ? '0' : '28px')};
`

const SectionHeader = styled.div`
  margin-bottom: 48px;
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  color: #111;
  letter-spacing: -0.04em;
  line-height: 1.2;
`

const SectionSubtitle = styled.p`
  margin: 12px 0 0;
  font-size: 17px;
  color: #666;
  line-height: 1.5;
`

const PositionFilterTabs = styled.div`
  display: flex;
  gap: 2px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 10px;
  flex-wrap: wrap;
  border: 1px solid rgba(0, 0, 0, 0.04);
`

const PositionFilterTab = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#fff' : '#64748b')};
  background: ${({ $active }) => ($active ? HEAD_ACCENT : 'transparent')};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: ${({ $active }) => ($active ? '#fff' : '#334155')};
    background: ${({ $active }) => ($active ? '#4f46e5' : 'rgba(0,0,0,0.04)')};
    ${({ $active }) => $active && 'box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);'}
  }
`

const ListWrap = styled.div`
  margin-top: 0;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  overflow: visible;
`

const ListHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 28px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(180deg, #fafbff 0%, #ffffff 100%);
  flex-wrap: wrap;
  border-radius: 12px 12px 0 0;
`

const ListHeadLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
`

const ViewModeTabs = styled.div`
  display: flex;
  gap: 2px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.04);
`

const ViewModeTab = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#fff' : '#64748b')};
  background: ${({ $active }) => ($active ? HEAD_ACCENT : 'transparent')};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    color: ${({ $active }) => ($active ? '#fff' : '#334155')};
    background: ${({ $active }) => ($active ? '#4f46e5' : 'rgba(0,0,0,0.04)')};
    ${({ $active }) => $active && 'box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);'}
  }
`

const LineageWrap = styled.div`
  padding: 0;
  min-height: 200px;
`

const LineageLegend = styled.div`
  margin-bottom: 24px;
  padding: 16px 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 13px;
  color: #475569;
  line-height: 1.55;
`

const ListTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.03em;
  line-height: 1.3;

  .count {
    font-weight: 500;
    font-size: 14px;
    color: #64748b;
    margin-left: 8px;
  }
`

/** 직책별 섹션 제목 (국왕, 쇼군, 대통령, 총리 등) */
const PositionSectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  letter-spacing: -0.01em;

  .count {
    font-weight: 500;
    font-size: 13px;
    color: #64748b;
    margin-left: 6px;
  }
`

const AddTenureButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: ${HEAD_ACCENT};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.2);

  &:hover {
    background: #4f46e5;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
  gap: 16px;
  text-align: center;
`

const EmptyIconWrap = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  background: #f1f5f9;
  border-radius: 12px;
`

const EmptyTitle = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
`

const EmptyDesc = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
  max-width: 320px;
  line-height: 1.5;
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
`

const ListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #faf5ff;
  }
`

const ItemAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: ${({ $hasImage }) => ($hasImage ? '#f1f5f9' : '#e2e8f0')};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;

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
  gap: 6px;
`

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
`

const ItemName = styled.div`
  font-weight: 700;
  font-size: 16px;
  color: #0f172a;
  line-height: 1.3;
`

const ItemTermBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 6px;
`

const ItemDates = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  margin-left: auto;

  .sep {
    margin: 0 2px;
    color: #94a3b8;
  }
`

const ItemTitleBadge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border-radius: 8px;
`

const ItemCountryBadge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #0f766e;
  background: #ccfbf1;
  border-radius: 8px;
`

const ItemRegnalName = styled.span`
  font-size: 13px;
  color: #64748b;
  font-style: italic;
`

const ItemDynastyName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #7c3aed;
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
  transition: background 0.2s ease, color 0.2s ease;

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
  transition: color 0.2s ease, background 0.2s ease;

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
  gap: 6px;
  padding: 6px;
  margin-bottom: 24px;
  width: fit-content;
  background: #f1f5f9;
  border-radius: 20px;
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
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  background: ${(p) => (p.$active ? '#ffffff' : 'transparent')};
  color: ${(p) => (p.$active ? '#4f46e5' : '#64748b')};
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '600' : '500')};
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  box-shadow: ${(p) => (p.$active ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none')};

  svg {
    flex-shrink: 0;
  }

  &:hover {
    color: ${(p) => (p.$active ? '#4f46e5' : '#475569')};
    background: ${(p) => (p.$active ? '#ffffff' : 'rgba(255,255,255,0.6)')};
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

const AchievementList = styled.ul`
  list-style: none;
  margin: 0 0 20px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const AchievementListItem = styled.li`
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;

  strong {
    display: block;
    margin-bottom: 4px;
    color: #0f172a;
  }
  .desc {
    display: block;
    color: #64748b;
    font-size: 13px;
    margin-bottom: 4px;
  }
  .date {
    font-size: 12px;
    color: #94a3b8;
  }
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
  transition: color 0.2s, background 0.2s;
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
  transition: color 0.2s, background 0.2s;
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

const AchievementForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
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

const AchievementDateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  .date-btn {
    flex: 1;
    padding: 10px 14px;
    font-size: 14px;
    text-align: left;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    color: #475569;
    cursor: pointer;
  }
  .date-btn:hover {
    background: #f1f5f9;
  }
  .sep {
    color: #94a3b8;
    font-size: 14px;
  }
`

/* 행정조직과 동일한 디자인·색상 */
const BORDER_COLOR = '#e5e7eb'
const FOCUS_COLOR = '#4f46e5'
const BG_INPUT = '#f8fafc'
const TEXT_PRIMARY = '#0f172a'
const TEXT_SECONDARY = '#64748b'
const TEXT_MUTED = '#6b7280'

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
  font-size: 20px;
  font-weight: 700;
  color: #111827;
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
  transition: color 0.2s ease, background 0.2s ease;
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

const SectionHeaderBlock = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;

  > svg {
    color: ${FOCUS_COLOR};
    margin-top: 2px;
    flex-shrink: 0;
  }
`

const SectionHeaderTitle = styled.h3`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: ${TEXT_PRIMARY};
  letter-spacing: -0.03em;
`

const SectionHeaderDesc = styled.p`
  margin: 8px 0 0;
  font-size: 15px;
  color: ${TEXT_SECONDARY};
  line-height: 1.5;
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

const FieldHint = styled.span`
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: ${TEXT_SECONDARY};
  line-height: 1.4;
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
    $variant === 'person' ? '360px' : $variant === 'datePair' ? '480px' : '380px'};
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

const Required = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${TEXT_MUTED};
  margin-left: 4px;
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

/* 행정조직 폼과 동일: input 스타일 */
const PersonSelectButton = styled.button<{ $hasValue: boolean }>`
  width: 100%;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ $hasValue }) => ($hasValue ? '#111827' : '#9ca3af')};
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #d1d5db;
  }
  svg:last-of-type {
    flex-shrink: 0;
    opacity: 0.5;
  }
`

const PersonAvatar = styled.div<{ $hasImage: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $hasImage }) => ($hasImage ? 'transparent' : 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)')};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    color: #6366f1;
  }
`

const PersonLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-weight: 600;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #ef4444;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease;

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
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);

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
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;

  &:hover:not(:disabled) {
    border-color: #4f46e5;
    color: #4f46e5;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

