/**
 * 역대 수반(국가원수·정부수반·군주 등) 재임 기록 목록 및 추가 섹션
 * 연대표 국가 상세에서 해당 국가의 재임 기록을 보고 추가할 수 있음
 */
import React, { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import { FiPlus, FiUser, FiCalendar, FiChevronRight, FiArrowLeft, FiChevronDown, FiSave } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getAllPersons, getPersonsByTenureCountry } from '@/shared/api/persons'
import { personCareerApi } from '@/shared/api/person-career'
import { DatePickerModal } from '@/shared/ui/date-picker'
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

  const isMonarchPosition =
    selectedPositionDefinition?.positionType === 'HEAD_OF_STATE' ||
    selectedPositionDefinitionId === null

  /** 목록에서 재임 클릭 시 수정 폼으로 전환 + 데이터 채우기 */
  const editingTenure = editingTenureId
    ? tenures.find((t: any) => t.id === editingTenureId)
    : null

  React.useEffect(() => {
    if (!editingTenureId || !editingTenure) return
    const t = editingTenure as any
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
        countryId,
        historicalCountryId,
        startDate,
        endDate: endDate || undefined,
        termNumber: termNumber ? parseInt(termNumber, 10) : undefined,
        regnalNumber: regnalNumber ? parseInt(regnalNumber, 10) : undefined,
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

  const selectedPerson = persons.find((p: any) => p.id === selectedPersonId) ?? null

  /** 계보도용: 대수/재위번호 있는 재임만, 대수 순 정렬 */
  const lineageTenures = React.useMemo(() => {
    const withOrder = tenures.filter(
      (t: any) => t.termNumber != null || t.regnalNumber != null,
    )
    return [...withOrder].sort((a: any, b: any) => {
      const orderA = a.termNumber ?? a.regnalNumber ?? 0
      const orderB = b.termNumber ?? b.regnalNumber ?? 0
      if (orderA !== orderB) return orderA - orderB
      const startA = a.startDate ? new Date(a.startDate).getTime() : 0
      const startB = b.startDate ? new Date(b.startDate).getTime() : 0
      return startA - startB
    })
  }, [tenures])

  /** person에서 부모 ID (camelCase/snake_case 모두 지원) */
  const getParentId = (p: any, personIds: Set<string>) => {
    const norm = (id: unknown) => (id != null && id !== '' ? String(id) : null)
    const fatherId = norm((p as any)?.fatherId ?? (p as any)?.father_id)
    const motherId = norm((p as any)?.motherId ?? (p as any)?.mother_id)
    if (fatherId && personIds.has(fatherId)) return fatherId
    if (motherId && personIds.has(motherId)) return motherId
    return null
  }

  /** personId → full person (persons API에 fatherId/motherId 있음, tenures의 person에는 없을 수 있음) */
  const personById = React.useMemo(() => {
    const map = new Map<string, any>()
    persons.forEach((p: any) => map.set(String(p.id), p))
    return map
  }, [persons])

  /** 세대별 그룹: 같은 부모 = 같은 행(형제). 부모 ID는 persons 목록 기준으로 사용. */
  const lineageRows = React.useMemo(() => {
    const norm = (id: unknown) => (id != null && id !== '' ? String(id) : null)
    const personIds = new Set(
      lineageTenures
        .map((t: any) => norm(t.person?.id))
        .filter((id): id is string => id != null),
    )
    const byParent = new Map<string | null, any[]>()
    lineageTenures.forEach((t: any) => {
      const pid = norm(t.person?.id)
      const fullPerson = pid ? personById.get(pid) ?? t.person : t.person
      const parentId = getParentId(fullPerson, personIds)
      const list = byParent.get(parentId) ?? []
      list.push(t)
      byParent.set(parentId, list)
    })
    const roots = byParent.get(null) ?? []
    const hasFamilyLinks = roots.length < lineageTenures.length

    if (!hasFamilyLinks && lineageTenures.length > 0) {
      // 부모 연결 없음: 같은 부모→같은 행 규칙 적용 불가, 대수 순 1인 1행
      return lineageTenures.map((t: any) => [t])
    }

    const rows: any[][] = []
    let currentGen = roots
    const seen = new Set<string>()
    while (currentGen.length > 0) {
      currentGen.sort((a: any, b: any) => {
        const oa = a.termNumber ?? a.regnalNumber ?? 0
        const ob = b.termNumber ?? b.regnalNumber ?? 0
        return oa - ob
      })
      rows.push(currentGen)
      currentGen.forEach((t: any) => seen.add(t.id))
      const nextGen = currentGen.flatMap((t: any) => {
        const parentPersonId = norm(t.person?.id)
        return parentPersonId ? byParent.get(parentPersonId) ?? [] : []
      })
      currentGen = nextGen.filter((t: any) => !seen.has(t.id))
    }
    if (rows.length === 0 && lineageTenures.length > 0) rows.push([...lineageTenures])
    return rows
  }, [lineageTenures, personById])

  /** 노드 배치: tenure id -> { row, col } (가계도 SVG/그리드용) */
  const lineagePlacement = React.useMemo(() => {
    const map = new Map<string, { row: number; col: number }>()
    lineageRows.forEach((row, rowIdx) => {
      row.forEach((t: any, colIdx: number) => map.set(t.id, { row: rowIdx, col: colIdx }))
    })
    return map
  }, [lineageRows])

  /** 부모 tenure id -> 자식 tenure id[] (연결선 그리기용). 부모 ID는 persons 목록 기준. */
  const parentToChildren = React.useMemo(() => {
    const norm = (id: unknown) => (id != null && id !== '' ? String(id) : null)
    const personIds = new Set(
      lineageTenures.map((t: any) => norm(t.person?.id)).filter((id): id is string => id != null),
    )
    const tenureByPersonId = new Map<string, any>()
    lineageTenures.forEach((t: any) => {
      const pid = norm(t.person?.id)
      if (!pid) return
      const existing = tenureByPersonId.get(pid)
      const order = t.termNumber ?? t.regnalNumber ?? 0
      if (!existing || (existing.termNumber ?? existing.regnalNumber ?? 0) > order)
        tenureByPersonId.set(pid, t)
    })
    const map = new Map<string, string[]>()
    lineageTenures.forEach((t: any) => {
      const pid = norm(t.person?.id)
      const fullPerson = pid ? personById.get(pid) ?? t.person : t.person
      const parentId = getParentId(fullPerson, personIds)
      if (!parentId) return
      const parentTenure = tenureByPersonId.get(parentId)
      if (!parentTenure) return
      const list = map.get(parentTenure.id) ?? []
      list.push(t.id)
      map.set(parentTenure.id, list)
    })

    if (map.size === 0 && lineageTenures.length >= 2) {
      for (let i = 0; i < lineageTenures.length - 1; i++) {
        map.set(lineageTenures[i].id, [lineageTenures[i + 1].id])
      }
    }
    return map
  }, [lineageTenures, personById])

  const showLineageTab = tenures.length > 0 && lineageTenures.length > 0

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
                      border: '4px solid #e2e8f0',
                      borderTopColor: '#8b5cf6',
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
                          ? '역대 수반 계보'
                          : '재임 목록'}
                        {tenures.length > 0 && <span className="count">{tenures.length}건</span>}
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
                  ) : listViewMode === 'lineage' && lineageTenures.length > 0 ? (
                    <LineageWrap>
                      <LineageLegend>
                        <strong>가계도</strong> — 선으로 연결된 위→아래가 부모→자식 관계입니다. 카드의 <strong>재위 연도</strong>가 강조되어 있습니다. 인물에 부·모가 등록되어 있어야 선이 연결됩니다.
                      </LineageLegend>
                      <LineageTree
                        rows={lineageRows}
                        placement={lineagePlacement}
                        parentToChildren={parentToChildren}
                        getPersonName={getPersonName}
                        formatDate={formatDate}
                        getRegnalNameFromNotes={getRegnalNameFromNotes}
                        onCardClick={(tenureId) => {
                          setEditingTenureId(tenureId)
                          setView('register')
                        }}
                      />
                    </LineageWrap>
                  ) : (
                    <List>
              {tenures.map((t: any) => {
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
                      </ItemRow>
                    </ListItemBody>
                    <ItemAction aria-label="인물 보기">
                      <FiChevronRight size={20} strokeWidth={2.5} />
                    </ItemAction>
                  </ListItem>
                )
              })}
                    </List>
                  )}
                </ListWrap>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <>
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
          <FormCardHeader>
              <FormCardTitle>
                {editingTenureId ? '수반 수정' : '수반 등록'}
              </FormCardTitle>
              <SubmitButton
                type="submit"
                form="heads-of-state-register-form"
                disabled={isSubmitting || !selectedPersonId || (!title.trim() && !selectedPositionDefinitionId) || !startDate}
              >
                <FiSave size={16} />
                {isSubmitting ? '저장 중…' : '저장'}
              </SubmitButton>
          </FormCardHeader>
          <form id="heads-of-state-register-form" onSubmit={handleAddSubmit}>
              <FormSectionInner>
                <SectionHeaderBlock>
                  <FiUser size={28} />
                  <div>
                    <SectionHeaderTitle>재임 정보</SectionHeaderTitle>
                    <SectionHeaderDesc>
                      이 국가의 역대 수반(대통령·총리·국왕 등) 재임 기록을 등록합니다.
                    </SectionHeaderDesc>
                  </div>
                </SectionHeaderBlock>
          <FormRows>
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
              </FormSectionInner>
          </form>
        </>
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

      <DatePickerModal
        isOpen={startDateModalOpen}
        onClose={() => setStartDateModalOpen(false)}
        title="취임일 선택"
        initialDate={startDate || undefined}
        onSelect={(date) => {
          setStartDate(date)
          setStartDateModalOpen(false)
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

const ListWrap = styled.div`
  margin-top: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`

const ListHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-wrap: wrap;
`

const ListHeadLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
`

const ViewModeTabs = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #e2e8f0;
  border-radius: 10px;
`

const ViewModeTab = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#fff' : '#64748b')};
  background: ${({ $active }) => ($active ? 'var(--color-primary)' : 'transparent')};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    color: ${({ $active }) => ($active ? '#fff' : '#334155')};
    background: ${({ $active }) => ($active ? '#7c3aed' : 'rgba(0,0,0,0.06)')};
  }
`

const LineageWrap = styled.div`
  padding: 24px 24px 32px;
  min-height: 200px;
`

const LineageLegend = styled.div`
  margin-bottom: 20px;
  padding: 14px 18px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 10px;
  font-size: 13px;
  color: #0c4a6e;
  line-height: 1.5;
`

const ListTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;

  .count {
    font-weight: 500;
    font-size: 14px;
    color: #64748b;
    margin-left: 8px;
  }
`

const AddTenureButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: #8b5cf6;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
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

const ItemAction = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: #94a3b8;
  transition: color 0.2s ease, background 0.2s ease;

  ${ListItem}:hover & {
    background: #ede9fe;
    color: var(--color-primary);
  }
`

/* 사건 등록 페이지와 동일한 폼 카드/필드 스타일 */
const BORDER_COLOR = '#e2e8f0'
const FOCUS_COLOR = '#8b5cf6'
const BG_INPUT = '#f8fafc'
const TEXT_PRIMARY = '#1e293b'
const TEXT_SECONDARY = '#64748b'
const TEXT_MUTED = '#94a3b8'

const BackToListButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 600;
  color: ${TEXT_SECONDARY};
  background: #ffffff;
  border: 1.5px solid ${BORDER_COLOR};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: ${TEXT_PRIMARY};
    svg {
      transform: translateX(-3px);
    }
  }
  svg {
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
`

const FormCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 0;
  border-bottom: 1.5px solid ${BORDER_COLOR};
  background: transparent;
  margin-bottom: 24px;
`

const FormCardTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${TEXT_PRIMARY};
  letter-spacing: -0.02em;
`

const FormSectionInner = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
`

const SectionHeaderBlock = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding-bottom: 32px;
  margin-bottom: 32px;
  border-bottom: 1px solid #f1f5f9;

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

const FieldRow = styled.div`
  display: flex;
  align-items: center;
  gap: 32px;
  min-height: 72px;
  padding: 20px 0;
  border-bottom: 1px solid #f1f5f9;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    min-height: 0;
    padding: 24px 0;
  }
`

const FieldLabel = styled.label`
  flex-shrink: 0;
  width: 160px;
  font-size: 15px;
  font-weight: 600;
  color: ${TEXT_PRIMARY};
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    width: 100%;
    font-size: 14px;
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
    accent-color: #7c3aed;
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
  flex: 1;
  min-width: 0;
  max-width: ${({ $variant }) =>
    $variant === 'person' ? '360px' : $variant === 'datePair' ? '640px' : '520px'};
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

const Input = styled.input`
  width: 100%;
  padding: 18px 20px;
  font-size: 16px;
  color: ${TEXT_PRIMARY};
  background: ${BG_INPUT};
  border: 1px solid ${BORDER_COLOR};
  border-radius: 14px;
  transition: all 0.2s ease;

  &::placeholder {
    color: ${TEXT_MUTED};
  }
  &:hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
  }
  &:focus {
    outline: none;
    border-color: ${FOCUS_COLOR};
    background: #ffffff;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.08);
  }
`

const triggerButtonStyles = `
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  font-size: 16px;
  color: inherit;
  background: ${BG_INPUT};
  border: 1px solid ${BORDER_COLOR};
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
  }
  span {
    flex: 1;
  }
  svg:last-of-type {
    flex-shrink: 0;
    color: ${TEXT_MUTED};
  }
`

const SelectTriggerButton = styled.button<{ $hasValue?: boolean }>`
  ${triggerButtonStyles}
  color: ${({ $hasValue }) => ($hasValue ? TEXT_PRIMARY : TEXT_MUTED)};
`

/* 인물 선택 전용: 아바타 + 이름 + 화살표 카드 스타일 */
const PersonSelectButton = styled.button<{ $hasValue: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  font-size: 16px;
  color: ${({ $hasValue }) => ($hasValue ? TEXT_PRIMARY : TEXT_MUTED)};
  background: ${({ $hasValue }) => ($hasValue ? '#f8fafc' : '#f1f5f9')};
  border: 1px solid ${BORDER_COLOR};
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;
    color: ${TEXT_PRIMARY};
  }
  svg:last-of-type {
    flex-shrink: 0;
    color: ${TEXT_MUTED};
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
  gap: 16px;
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid #f1f5f9;
`

const DeleteButton = styled.button`
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    transform: translateY(-1px);
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
  padding: 14px 28px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ResetButton = styled.button`
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  color: ${TEXT_SECONDARY};
  background: #ffffff;
  border: 1.5px solid ${BORDER_COLOR};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${FOCUS_COLOR};
    color: ${FOCUS_COLOR};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

