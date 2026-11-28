import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlertTriangle,
  FiArrowUpRight,
  FiCheck,
  FiGitMerge,
  FiGlobe,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useCountries } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { militaryRankApi } from '@/shared/api/military-rank'
import { personCareerApi } from '@/shared/api/person-career'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { compareByCountryStart } from '@/shared/lib/country-period'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { PrimaryActionButton } from '@/shared/ui/primary-action-button'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import {
  classifyPositionScope,
  formatOfficeholderPeriod,
  formatScopeWindowText,
  getPositionTypeMeta,
  matchesPolityFilter,
  POSITION_TIER_FILTERS,
  POSITION_TYPE_META,
  type PositionDefinitionCatalogRow,
  type PositionTierFilterKey,
  type UnnormalizedTenureRow,
} from './components/government-positions.helpers'
import * as S from './components/government-positions.styles'
import { MilitaryRanksCatalogPanel } from './components/military-ranks-catalog-panel'

type ScopeModeKey =
  | 'all'
  | 'universal'
  | 'polity'
  | 'institution'
  | 'unnormalized'

type UsageFilterKey = 'all' | 'used' | 'unused' | 'monarchical'
type DetailTabKey = 'edit' | 'scopes' | 'holders'

export function GovernmentPositionsPage() {
  useDocumentTitle('관직 · 직책 정본 관리 | 파피루스')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const catalogMode =
    searchParams.get('catalog') === 'ranks' ? 'ranks' : 'positions'
  const selectedId = searchParams.get('id') || ''
  const scopeMode = (searchParams.get('scope') as ScopeModeKey) || 'all'
  const typeParam = searchParams.get('type') || 'ALL'
  const polityParam = searchParams.get('polity') || ''
  const urlQuery = searchParams.get('q') || ''

  const [searchInput, setSearchInput] = useState(urlQuery)
  const debouncedSearch = useDebouncedValue(searchInput, 180)
  const [tierFilter, setTierFilter] = useState<PositionTierFilterKey>('ALL')
  const [usageFilter, setUsageFilter] = useState<UsageFilterKey>('all')
  const [creatingMode, setCreatingMode] = useState(false)
  const [detailTab, setDetailTab] = useState<DetailTabKey>('edit')
  const [personModalId, setPersonModalId] = useState<string | null>(null)

  // Edit / Create Form Drafts
  const [draftTitle, setDraftTitle] = useState('')
  const [draftTitleEn, setDraftTitleEn] = useState('')
  const [draftTitleLocal, setDraftTitleLocal] = useState('')
  const [draftType, setDraftType] = useState('CABINET_MINISTER')
  const [draftRank, setDraftRank] = useState('10')
  const [draftMonarchical, setDraftMonarchical] = useState(false)
  const [draftCategoryId, setDraftCategoryId] = useState('')
  const [draftDeptId, setDraftDeptId] = useState('')
  const [draftEstablishedDate, setDraftEstablishedDate] = useState('')
  const [draftAbolishedDate, setDraftAbolishedDate] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftCreateScopePolity, setDraftCreateScopePolity] = useState('')
  const [savingForm, setSavingForm] = useState(false)

  // Scope Creator & Inline Scope Edit State
  const [newScopePolity, setNewScopePolity] = useState('')
  const [newScopeLocalTitle, setNewScopeLocalTitle] = useState('')
  const [newScopeStartEra, setNewScopeStartEra] = useState<'AD' | 'BC'>('AD')
  const [newScopeStartYear, setNewScopeStartYear] = useState('')
  const [newScopeEndEra, setNewScopeEndEra] = useState<'AD' | 'BC'>('AD')
  const [newScopeEndYear, setNewScopeEndYear] = useState('')
  const [newScopeNote, setNewScopeNote] = useState('')
  const [editingScopeId, setEditingScopeId] = useState<string | null>(null)
  const [editScopeLocalTitle, setEditScopeLocalTitle] = useState('')
  const [editScopeStartEra, setEditScopeStartEra] = useState<'AD' | 'BC'>('AD')
  const [editScopeStartYear, setEditScopeStartYear] = useState('')
  const [editScopeEndEra, setEditScopeEndEra] = useState<'AD' | 'BC'>('AD')
  const [editScopeEndYear, setEditScopeEndYear] = useState('')
  const [editScopeNote, setEditScopeNote] = useState('')
  const [savingScope, setSavingScope] = useState(false)

  // Merge State
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [merging, setMerging] = useState(false)

  // Unnormalized tenure promotion state
  const [relinkTargetByTenureId, setRelinkTargetByTenureId] = useState<
    Record<string, string>
  >({})
  const [relinkingTenureId, setRelinkingTenureId] = useState<string | null>(
    null,
  )

  const updateUrlParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v == null || v === '' || v === 'ALL' || v === 'all') {
              next.delete(k)
            } else {
              next.set(k, v)
            }
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (debouncedSearch !== urlQuery) {
      updateUrlParams({ q: debouncedSearch || null })
    }
  }, [debouncedSearch, updateUrlParams, urlQuery])

  // Queries
  const { data: rawDefinitions = [], isLoading: loadingDefs } = useQuery<
    PositionDefinitionCatalogRow[]
  >({
    queryKey: ['position-definitions', 'all'],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({}) as Promise<
        PositionDefinitionCatalogRow[]
      >,
    staleTime: 30_000,
  })

  const { data: unnormalizedTenures = [], isLoading: loadingUnnormalized } =
    useQuery<UnnormalizedTenureRow[]>({
      queryKey: ['position-definitions', 'unnormalized-tenures'],
      queryFn: () => personCareerApi.getUnnormalizedPositionTenures(),
      staleTime: 30_000,
    })

  const { data: selectedDetail } = useQuery<PositionDefinitionCatalogRow | null>(
    {
      queryKey: ['position-definition-detail', selectedId],
      queryFn: () =>
        selectedId
          ? (personCareerApi.getPositionDefinitionById(
              selectedId,
            ) as Promise<PositionDefinitionCatalogRow>)
          : Promise.resolve(null),
      enabled: Boolean(selectedId) && !creatingMode && catalogMode === 'positions',
      staleTime: 20_000,
    },
  )

  const { data: militaryRanks = [] } = useQuery({
    queryKey: ['military-ranks', 'catalog-all'],
    queryFn: () => militaryRankApi.list({ includeUniversal: true, limit: 500 }),
    staleTime: 60_000,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['administration-department-categories'],
    queryFn: () => administrationDepartmentApi.getCategories(),
    staleTime: 120_000,
  })

  const { data: allDepartments = [] } = useQuery({
    queryKey: ['global-departments-lite'],
    queryFn: () => administrationDepartmentApi.getAll({ take: 2000 }),
    staleTime: 120_000,
  })

  const { data: countries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountries()

  const polityOptions = useMemo<SearchableSelectOption[]>(() => {
    const modernOpts: SearchableSelectOption[] = [...countries]
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      .map((c) => ({
        value: `m:${c.id}`,
        label: `${c.flagEmoji ?? ''} ${c.name}`.trim(),
        group: '현대 국가',
      }))
    const histOpts: SearchableSelectOption[] = [...historicalCountries]
      .sort(compareByCountryStart)
      .map((hc) => ({
        value: `h:${hc.id}`,
        label: hc.name,
        group: '역사적 국가 · 시대 정체',
      }))
    return [...modernOpts, ...histOpts]
  }, [countries, historicalCountries])

  // Real (non-generic) definitions
  const realDefinitions = useMemo(
    () => rawDefinitions.filter((row) => !row.isGeneric),
    [rawDefinitions],
  )

  const kpiCounts = useMemo(() => {
    let universal = 0
    let polity = 0
    let institution = 0
    let totalTenures = 0
    for (const row of realDefinitions) {
      const cat = classifyPositionScope(row)
      if (cat === 'universal') universal += 1
      else if (cat === 'polity') polity += 1
      else if (cat === 'institution') institution += 1
      totalTenures += row.tenureCount ?? 0
    }
    return {
      total: realDefinitions.length,
      universal,
      polity,
      institution,
      totalTenures,
      unnormalized: unnormalizedTenures.length,
    }
  }, [realDefinitions, unnormalizedTenures])

  const filteredDefinitions = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return realDefinitions
      .filter((row) => {
        const scopeCat = classifyPositionScope(row)
        if (scopeMode === 'universal' && scopeCat !== 'universal') return false
        if (scopeMode === 'polity' && scopeCat !== 'polity') return false
        if (scopeMode === 'institution' && scopeCat !== 'institution') {
          return false
        }
        if (tierFilter !== 'ALL') {
          const meta = getPositionTypeMeta(row.positionType)
          if (meta.tier !== tierFilter) return false
        }
        if (typeParam !== 'ALL' && row.positionType !== typeParam) return false
        if (!matchesPolityFilter(row, polityParam)) return false

        const usedCount =
          (row.tenureCount ?? 0) +
          (row.politicalSystemsAsHeadOfState?.length ?? 0) +
          (row.politicalSystemsAsHeadOfGovernment?.length ?? 0) +
          (row.treatySignatoryCount ?? 0)
        if (usageFilter === 'used' && usedCount === 0) return false
        if (usageFilter === 'unused' && usedCount > 0) return false
        if (usageFilter === 'monarchical' && !row.isMonarchical) return false

        if (q) {
          const scopeText = (row.scopes ?? [])
            .map(
              (sc) =>
                `${sc.country?.name ?? ''} ${sc.historicalCountry?.name ?? ''} ${sc.localTitle ?? ''}`,
            )
            .join(' ')
          const haystack = [
            row.title,
            row.titleEn,
            row.titleLocal,
            row.description,
            row.category?.name,
            row.administrationDepartment?.name,
            row.militaryUnit?.name,
            row.organization?.name,
            scopeText,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return true
      })
      .sort((left, right) => {
        const rDiff = (left.rank ?? 999) - (right.rank ?? 999)
        if (rDiff !== 0) return rDiff
        return left.title.localeCompare(right.title, 'ko')
      })
  }, [
    realDefinitions,
    scopeMode,
    tierFilter,
    typeParam,
    polityParam,
    usageFilter,
    debouncedSearch,
  ])

  const selectedRow = useMemo<PositionDefinitionCatalogRow | null>(() => {
    if (!selectedId) return null
    return (
      selectedDetail ??
      realDefinitions.find((item) => item.id === selectedId) ??
      null
    )
  }, [selectedId, selectedDetail, realDefinitions])

  const hydrateDraftFromRow = useCallback((row: PositionDefinitionCatalogRow) => {
    setDraftTitle(row.title ?? '')
    setDraftTitleEn(row.titleEn ?? '')
    setDraftTitleLocal(row.titleLocal ?? '')
    setDraftType(row.positionType || 'CABINET_MINISTER')
    setDraftRank(row.rank != null ? String(row.rank) : '999')
    setDraftMonarchical(Boolean(row.isMonarchical))
    setDraftCategoryId(row.categoryId ?? '')
    setDraftDeptId(row.administrationDepartmentId ?? '')
    setDraftEstablishedDate(
      row.establishedDate ? row.establishedDate.slice(0, 10) : '',
    )
    setDraftAbolishedDate(
      row.abolishedDate ? row.abolishedDate.slice(0, 10) : '',
    )
    setDraftDescription(row.description ?? '')
    setMergeTargetId('')
    setEditingScopeId(null)
  }, [])

  useEffect(() => {
    if (selectedRow && !creatingMode) {
      hydrateDraftFromRow(selectedRow)
    }
  }, [selectedRow?.id, creatingMode, hydrateDraftFromRow])

  const openCreateForm = () => {
    if (catalogMode === 'ranks') {
      setCreatingMode(true)
      return
    }
    updateUrlParams({ id: null })
    setCreatingMode(true)
    setDetailTab('edit')
    setDraftTitle('')
    setDraftTitleEn('')
    setDraftTitleLocal('')
    setDraftType(typeParam !== 'ALL' ? typeParam : 'CABINET_MINISTER')
    setDraftRank('10')
    setDraftMonarchical(false)
    setDraftCategoryId('')
    setDraftDeptId('')
    setDraftEstablishedDate('')
    setDraftAbolishedDate('')
    setDraftDescription('')
    setDraftCreateScopePolity(polityParam || '')
  }

  const invalidateAllPositionQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['position-definitions'] }),
      queryClient.invalidateQueries({ queryKey: ['position-definition-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['cabinet-form-pos-defs'] }),
    ])
  }

  const handleSaveDefinition = async () => {
    const cleanTitle = draftTitle.trim()
    if (!cleanTitle) {
      notify.error('직책명을 입력해 주세요.')
      return
    }
    setSavingForm(true)
    try {
      const payload = {
        title: cleanTitle,
        titleEn: draftTitleEn.trim() || null,
        titleLocal: draftTitleLocal.trim() || null,
        positionType: draftType,
        rank: draftRank.trim() ? Number(draftRank.trim()) : 999,
        isMonarchical: draftMonarchical,
        categoryId: draftCategoryId || null,
        administrationDepartmentId: draftDeptId || null,
        establishedDate: draftEstablishedDate
          ? new Date(draftEstablishedDate).toISOString()
          : null,
        abolishedDate: draftAbolishedDate
          ? new Date(draftAbolishedDate).toISOString()
          : null,
        description: draftDescription.trim() || null,
      }

      if (creatingMode) {
        const created = (await personCareerApi.createPositionDefinition(
          payload,
        )) as PositionDefinitionCatalogRow
        if (draftCreateScopePolity && !draftDeptId) {
          const isHist = draftCreateScopePolity.startsWith('h:')
          const cleanPolityId = draftCreateScopePolity.replace(/^[mh]:/, '')
          if (cleanPolityId) {
            await personCareerApi.addPositionDefinitionScope(created.id, {
              countryId: !isHist ? cleanPolityId : null,
              historicalCountryId: isHist ? cleanPolityId : null,
              localTitle: draftTitleLocal.trim() || null,
            })
          }
        }
        await invalidateAllPositionQueries()
        setCreatingMode(false)
        updateUrlParams({ id: created.id })
        notify.success(`‘${cleanTitle}’ 직책 정본을 DB에 등록했습니다.`)
      } else if (selectedRow) {
        await personCareerApi.updatePositionDefinition(selectedRow.id, payload)
        await invalidateAllPositionQueries()
        notify.success(`‘${cleanTitle}’ 직책 정본을 수정했습니다.`)
      }
    } catch (err) {
      notify.error(getApiErrorMessage(err, '직책 저장에 실패했습니다.'))
    } finally {
      setSavingForm(false)
    }
  }

  const handleDeleteDefinition = async () => {
    if (!selectedRow) return
    const ok = await confirm({
      title: `‘${selectedRow.title}’ 직책 정본 삭제`,
      message:
        '참조 중인 재임·정체·조약 서명이 없을 때만 삭제할 수 있습니다. 중복 직책이라면 「재임자 · 통합」 탭에서 다른 정본으로 통합해 주세요. 삭제하시겠습니까?',
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    setSavingForm(true)
    try {
      await personCareerApi.deletePositionDefinition(selectedRow.id)
      await invalidateAllPositionQueries()
      updateUrlParams({ id: null })
      notify.success(`‘${selectedRow.title}’ 직책 정본을 삭제했습니다.`)
    } catch (err) {
      notify.error(getApiErrorMessage(err, '직책 삭제에 실패했습니다.'))
    } finally {
      setSavingForm(false)
    }
  }

  const handleAddScope = async () => {
    if (!selectedRow) return
    if (!newScopePolity) {
      notify.error('적용할 국가 또는 역사정체를 선택해 주세요.')
      return
    }
    const isHist = newScopePolity.startsWith('h:')
    const cleanPolityId = newScopePolity.replace(/^[mh]:/, '')
    setSavingScope(true)
    try {
      await personCareerApi.addPositionDefinitionScope(selectedRow.id, {
        countryId: !isHist ? cleanPolityId : null,
        historicalCountryId: isHist ? cleanPolityId : null,
        localTitle: newScopeLocalTitle.trim() || null,
        startEra: newScopeStartYear.trim() ? newScopeStartEra : null,
        startYear: newScopeStartYear.trim()
          ? Number(newScopeStartYear.trim())
          : null,
        endEra: newScopeEndYear.trim() ? newScopeEndEra : null,
        endYear: newScopeEndYear.trim() ? Number(newScopeEndYear.trim()) : null,
        note: newScopeNote.trim() || null,
      })
      setNewScopePolity('')
      setNewScopeLocalTitle('')
      setNewScopeStartYear('')
      setNewScopeEndYear('')
      setNewScopeNote('')
      await invalidateAllPositionQueries()
      notify.success('적용 국가·정체 스코프를 추가했습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '스코프 추가에 실패했습니다.'))
    } finally {
      setSavingScope(false)
    }
  }

  const handleSaveScopeEdit = async (scopeId: string) => {
    setSavingScope(true)
    try {
      await personCareerApi.updatePositionDefinitionScope(scopeId, {
        localTitle: editScopeLocalTitle.trim() || null,
        startEra: editScopeStartYear.trim() ? editScopeStartEra : null,
        startYear: editScopeStartYear.trim()
          ? Number(editScopeStartYear.trim())
          : null,
        endEra: editScopeEndYear.trim() ? editScopeEndEra : null,
        endYear: editScopeEndYear.trim()
          ? Number(editScopeEndYear.trim())
          : null,
        note: editScopeNote.trim() || null,
      })
      setEditingScopeId(null)
      await invalidateAllPositionQueries()
      notify.success('적용 범위 정보를 수정했습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '적용 범위 수정에 실패했습니다.'))
    } finally {
      setSavingScope(false)
    }
  }

  const handleRemoveScope = async (scopeId: string) => {
    setSavingScope(true)
    try {
      await personCareerApi.removePositionDefinitionScope(scopeId)
      await invalidateAllPositionQueries()
      notify.success('적용 범위를 해제했습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '적용 범위 해제에 실패했습니다.'))
    } finally {
      setSavingScope(false)
    }
  }

  const handleMergeDefinition = async () => {
    if (!selectedRow || !mergeTargetId) return
    const targetDef = realDefinitions.find((d) => d.id === mergeTargetId)
    if (!targetDef) return
    const ok = await confirm({
      title: `‘${selectedRow.title}’ → ‘${targetDef.title}’ 정본 통합`,
      message: `‘${selectedRow.title}’ 직책에 연결된 모든 재임(${selectedRow.tenureCount ?? 0}건), 헌정 정체, 조약 서명 기록을 ‘${targetDef.title}’ 정본으로 일괄 이관하고 원본 직책을 삭제합니다. 계속하시겠습니까?`,
      confirmLabel: '통합 실행',
      danger: true,
    })
    if (!ok) return
    setMerging(true)
    try {
      await personCareerApi.mergePositionDefinition(
        selectedRow.id,
        mergeTargetId,
      )
      invalidateTenureQueries(queryClient)
      await invalidateAllPositionQueries()
      updateUrlParams({ id: mergeTargetId })
      notify.success(`‘${targetDef.title}’ 정본으로 통합되었습니다.`)
    } catch (err) {
      notify.error(getApiErrorMessage(err, '직책 통합에 실패했습니다.'))
    } finally {
      setMerging(false)
    }
  }

  const handlePromoteUnnormalizedTenure = async (row: UnnormalizedTenureRow) => {
    const cleanTitle = (row.title ?? '').trim()
    const chosenTargetId = relinkTargetByTenureId[row.id] || ''
    setRelinkingTenureId(row.id)
    try {
      let targetDefId = chosenTargetId
      if (!targetDefId) {
        if (!cleanTitle) {
          throw new Error('승격할 직책명을 알 수 없습니다. 연결할 정본 직책을 선택해 주세요.')
        }
        const created = (await personCareerApi.createPositionDefinition({
          title: cleanTitle,
          positionType: row.positionType || 'SPECIAL_POSITION',
          administrationDepartmentId: row.administrationDepartmentId ?? null,
          militaryUnitId: row.militaryUnitId ?? null,
        })) as PositionDefinitionCatalogRow
        if (
          !row.administrationDepartmentId &&
          !row.militaryUnitId &&
          (row.historicalCountryId || row.countryId)
        ) {
          await personCareerApi.addPositionDefinitionScope(created.id, {
            countryId: row.historicalCountryId ? null : (row.countryId ?? null),
            historicalCountryId: row.historicalCountryId ?? null,
          })
        }
        targetDefId = created.id
      }
      await personCareerApi.updateGovernmentPositionTenure(row.id, {
        positionDefinitionId: targetDefId,
      })
      invalidateTenureQueries(queryClient)
      await invalidateAllPositionQueries()
      notify.success('재임 기록을 DB 직책 정본으로 정규화했습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '정규화 처리에 실패했습니다.'))
    } finally {
      setRelinkingTenureId(null)
    }
  }

  const mergeCandidateOptions = useMemo<SearchableSelectOption[]>(
    () =>
      realDefinitions
        .filter((d) => d.id !== selectedRow?.id)
        .map((d) => {
          const meta = getPositionTypeMeta(d.positionType)
          return {
            value: d.id,
            label: d.title,
            meta: `${meta.shortLabel} · 재임 ${d.tenureCount ?? 0}건`,
            group: meta.label,
            keywords: [d.titleEn, d.titleLocal, meta.label]
              .filter(Boolean)
              .join(' '),
          }
        }),
    [realDefinitions, selectedRow?.id],
  )

  const departmentSelectOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { value: '', label: '특정 부처에 귀속하지 않음 (일반·보편 또는 국가 스코프)' },
      ...allDepartments.map((dept) => ({
        value: dept.id,
        label: dept.name,
        meta:
          (dept as { historicalCountry?: { name?: string }; country?: { name?: string } })
            .historicalCountry?.name ??
          (dept as { country?: { name?: string } }).country?.name ??
          undefined,
      })),
    ],
    [allDepartments],
  )

  const drawerVisible =
    catalogMode === 'positions' &&
    scopeMode !== 'unnormalized' &&
    (creatingMode || Boolean(selectedRow))

  return (
    <S.PageScene>
      <S.PageWrapper>
        {/* ─── Tier 1: Top Editorial Chrome ─── */}
        <S.TopChrome>
          <S.TopHeadlineGroup>
            <S.AccentBar aria-hidden="true" />
            <div>
              <S.PageTitle>관직 · 직책 · 계급 정본 관리</S.PageTitle>
              <S.SummaryLine>
                <span>
                  관직·직책 정본 <b>{kpiCounts.total.toLocaleString()}</b>
                </span>
                <span className="sep">·</span>
                <span className="accent">
                  전역 보편 <b>{kpiCounts.universal.toLocaleString()}</b>
                </span>
                <span className="sep">·</span>
                <span>
                  국가·시대 고유 <b>{kpiCounts.polity.toLocaleString()}</b>
                </span>
                <span className="sep">·</span>
                <span>
                  기관·부대 전용 <b>{kpiCounts.institution.toLocaleString()}</b>
                </span>
                <span className="sep">·</span>
                <span>
                  군 계급 정본 <b>{militaryRanks.length.toLocaleString()}</b>
                </span>
                {kpiCounts.unnormalized > 0 ? (
                  <>
                    <span className="sep">·</span>
                    <span
                      className="warn"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setCreatingMode(false)
                        updateUrlParams({
                          catalog: null,
                          scope: 'unnormalized',
                          id: null,
                        })
                      }}
                    >
                      미정규화 재임 {kpiCounts.unnormalized}건 점검
                    </span>
                  </>
                ) : null}
              </S.SummaryLine>
            </div>
          </S.TopHeadlineGroup>

          <S.HeaderActions>
            <S.CrossDomainNav aria-label="연관 도메인 바로가기">
              <S.CrossDomainLink to="/political-parties">
                <span>정당 · 정치 세력</span>
                <FiArrowUpRight size={12} aria-hidden="true" />
              </S.CrossDomainLink>
              <S.CrossDomainLink to="/treaties">
                <span>조약 · 협정</span>
                <FiArrowUpRight size={12} aria-hidden="true" />
              </S.CrossDomainLink>
            </S.CrossDomainNav>

            <PrimaryActionButton
              $size="md"
              icon={<FiPlus size={14} />}
              onClick={openCreateForm}
            >
              {catalogMode === 'ranks'
                ? '새 군 계급 등록'
                : '새 직책 정본 등록'}
            </PrimaryActionButton>
          </S.HeaderActions>
        </S.TopChrome>

        {/* ─── Tier 2: Domain Switcher + Search + Polity Filter ─── */}
        <S.TopToolbarCard>
          <S.TopFilterRow>
            <S.ToolbarLeft>
              <S.DomainSegment role="tablist" aria-label="정부 도메인 전환">
                <S.SegmentBtn
                  type="button"
                  role="tab"
                  aria-selected={false}
                  onClick={() => navigate(pathKeys.government.list())}
                >
                  <span>행정부 · 내각</span>
                </S.SegmentBtn>
                <S.SegmentBtn
                  type="button"
                  role="tab"
                  aria-selected={false}
                  onClick={() =>
                    navigate(pathKeys.government.list({ tab: 'departments' }))
                  }
                >
                  <span>중앙부처 · 기관</span>
                </S.SegmentBtn>
                <S.SegmentBtn
                  type="button"
                  role="tab"
                  aria-selected={true}
                  $active={true}
                >
                  <span>관직 · 직책 정본</span>
                  <S.SegmentCount $active={true}>
                    {kpiCounts.total}
                  </S.SegmentCount>
                </S.SegmentBtn>
              </S.DomainSegment>

              <S.DomainSegment role="tablist" aria-label="정본 사전 종류 전환">
                <S.SegmentBtn
                  type="button"
                  role="tab"
                  aria-selected={catalogMode === 'positions'}
                  $active={catalogMode === 'positions'}
                  onClick={() => {
                    setCreatingMode(false)
                    updateUrlParams({ catalog: null })
                  }}
                >
                  <span>관직 · 직책</span>
                  <S.SegmentCount $active={catalogMode === 'positions'}>
                    {kpiCounts.total}
                  </S.SegmentCount>
                </S.SegmentBtn>
                <S.SegmentBtn
                  type="button"
                  role="tab"
                  aria-selected={catalogMode === 'ranks'}
                  $active={catalogMode === 'ranks'}
                  onClick={() => {
                    setCreatingMode(false)
                    updateUrlParams({ catalog: 'ranks', id: null })
                  }}
                >
                  <span>군 계급</span>
                  <S.SegmentCount $active={catalogMode === 'ranks'}>
                    {militaryRanks.length}
                  </S.SegmentCount>
                </S.SegmentBtn>
              </S.DomainSegment>

              <S.SearchInputWrap>
                <FiSearch size={13} />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={
                    catalogMode === 'ranks'
                      ? '계급명 · 원어 · 영문 · NATO 부호 검색…'
                      : '직책명 · 영문 · 원어 · 현지 표기 · 부처명 검색…'
                  }
                  aria-label="정본 검색"
                />
                {searchInput ? (
                  <S.ClearSearchBtn
                    type="button"
                    onClick={() => setSearchInput('')}
                    aria-label="검색어 지우기"
                  >
                    <FiX size={13} />
                  </S.ClearSearchBtn>
                ) : null}
              </S.SearchInputWrap>
            </S.ToolbarLeft>

            <S.ToolbarRight>
              <S.PolityPickerBox>
                <SearchableSelect
                  options={[
                    { value: '', label: '전체 국가 · 시대 정체' },
                    ...polityOptions,
                  ]}
                  value={polityParam}
                  onChange={(val) => updateUrlParams({ polity: val || null })}
                  placeholder="국가 · 역사정체 필터"
                />
              </S.PolityPickerBox>
            </S.ToolbarRight>
          </S.TopFilterRow>

          {catalogMode === 'positions' ? (
            <S.SubFilterRow>
              <S.FilterChipGroup role="group" aria-label="적용 범위 필터">
                <S.FilterChip
                  type="button"
                  $active={scopeMode === 'all'}
                  onClick={() => updateUrlParams({ scope: null })}
                >
                  전체 정본 ({kpiCounts.total})
                </S.FilterChip>
                <S.FilterChip
                  type="button"
                  $active={scopeMode === 'universal'}
                  onClick={() => updateUrlParams({ scope: 'universal' })}
                >
                  <FiGlobe size={11} />
                  전역 보편 ({kpiCounts.universal})
                </S.FilterChip>
                <S.FilterChip
                  type="button"
                  $active={scopeMode === 'polity'}
                  onClick={() => updateUrlParams({ scope: 'polity' })}
                >
                  국가 · 시대 고유 ({kpiCounts.polity})
                </S.FilterChip>
                <S.FilterChip
                  type="button"
                  $active={scopeMode === 'institution'}
                  onClick={() => updateUrlParams({ scope: 'institution' })}
                >
                  기관 · 부대 전용 ({kpiCounts.institution})
                </S.FilterChip>
                <S.FilterChip
                  type="button"
                  $warn
                  $active={scopeMode === 'unnormalized'}
                  onClick={() =>
                    updateUrlParams({ scope: 'unnormalized', id: null })
                  }
                >
                  <FiAlertTriangle size={11} />
                  미정규화 재임 감사 ({kpiCounts.unnormalized})
                </S.FilterChip>
              </S.FilterChipGroup>

              {scopeMode !== 'unnormalized' ? (
                <S.FilterChipGroup>
                  {POSITION_TIER_FILTERS.map((t) => (
                    <S.FilterChip
                      key={t.key}
                      type="button"
                      $active={tierFilter === t.key}
                      onClick={() => setTierFilter(t.key)}
                    >
                      {t.label}
                    </S.FilterChip>
                  ))}

                  <S.InlineSelect
                    value={typeParam}
                    onChange={(e) =>
                      updateUrlParams({
                        type: e.target.value === 'ALL' ? null : e.target.value,
                      })
                    }
                    aria-label="세부 직책 유형 필터"
                  >
                    <option value="ALL">전체 15종 유형</option>
                    {POSITION_TYPE_META.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </S.InlineSelect>

                  <S.InlineSelect
                    value={usageFilter}
                    onChange={(e) =>
                      setUsageFilter(e.target.value as UsageFilterKey)
                    }
                    aria-label="실사용 필터"
                  >
                    <option value="all">모든 직책</option>
                    <option value="used">재임·정체 사용 중</option>
                    <option value="unused">미사용 (0건)</option>
                    <option value="monarchical">군주·주권 칭호만</option>
                  </S.InlineSelect>
                </S.FilterChipGroup>
              ) : null}
            </S.SubFilterRow>
          ) : null}
        </S.TopToolbarCard>

        {/* ─── Tier 3: Main Workspace ─── */}
        {catalogMode === 'ranks' ? (
          <MilitaryRanksCatalogPanel
            searchQuery={debouncedSearch}
            polityFilter={polityParam}
            polityOptions={polityOptions}
            creatingRank={creatingMode}
            onCloseCreate={() => setCreatingMode(false)}
          />
        ) : scopeMode === 'unnormalized' ? (
          <S.LedgerPane>
            <S.LedgerHeaderBand
              style={{
                gridTemplateColumns:
                  'minmax(140px, 1fr) minmax(150px, 1.1fr) minmax(130px, 1fr) minmax(260px, 1.6fr)',
              }}
            >
              <span>인물 · 국가</span>
              <span>임시 저장된 직함 문자열</span>
              <span>소속 기관 · 기간</span>
              <span>DB 정본 승격 또는 기존 정본에 연결</span>
            </S.LedgerHeaderBand>
            <S.LedgerScrollList>
              {loadingUnnormalized ? (
                <S.EmptyStateBox>미정규화 재임 기록을 점검하는 중…</S.EmptyStateBox>
              ) : unnormalizedTenures.length === 0 ? (
                <S.EmptyStateBox>
                  모든 공직 재임 기록이 DB `government_position_definition` 정본에
                  100% 정규화되어 있습니다.
                </S.EmptyStateBox>
              ) : (
                unnormalizedTenures.map((row) => {
                  const personName = row.person
                    ? getPersonDisplayName(row.person)
                    : '인물 미상'
                  const polityName =
                    row.historicalCountry?.name ?? row.country?.name ?? '국가 미지정'
                  const instName =
                    row.administrationDepartment?.name ??
                    row.militaryUnit?.name ??
                    null
                  const isBusy = relinkingTenureId === row.id
                  return (
                    <S.LedgerRow
                      key={row.id}
                      style={{
                        gridTemplateColumns:
                          'minmax(140px, 1fr) minmax(150px, 1.1fr) minmax(130px, 1fr) minmax(260px, 1.6fr)',
                        cursor: 'default',
                      }}
                    >
                      <S.TitleCol>
                        <S.TitleMainLine>
                          <strong>{personName}</strong>
                        </S.TitleMainLine>
                        <S.TitleSubLine>{polityName}</S.TitleSubLine>
                      </S.TitleCol>
                      <S.TitleCol>
                        <S.TitleMainLine>
                          <strong>{row.title || '(직함 미입력)'}</strong>
                        </S.TitleMainLine>
                        <S.TitleSubLine>
                          임시 그릇: {row.positionDefinition?.title ?? row.positionType}
                        </S.TitleSubLine>
                      </S.TitleCol>
                      <S.TitleCol>
                        <S.TitleMainLine>
                          <span>{instName ?? '기관 없음'}</span>
                        </S.TitleMainLine>
                        <S.TitleSubLine>
                          {row.startYear
                            ? `${row.startEra === 'BC' ? 'BC ' : ''}${row.startYear}~${row.endYear ?? ''}`
                            : '연도 미상'}
                        </S.TitleSubLine>
                      </S.TitleCol>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          minWidth: 0,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 150 }}>
                          <SearchableSelect
                            options={[
                              {
                                value: '',
                                label: `새 정본 생성 (‘${row.title || '직책'}’)`,
                              },
                              ...mergeCandidateOptions,
                            ]}
                            value={relinkTargetByTenureId[row.id] || ''}
                            onChange={(val) =>
                              setRelinkTargetByTenureId((prev) => ({
                                ...prev,
                                [row.id]: val,
                              }))
                            }
                            placeholder="기존 정본 선택 또는 새 정본 생성"
                          />
                        </div>
                        <S.ActionBtn
                          type="button"
                          $variant="primary"
                          disabled={isBusy}
                          onClick={() =>
                            void handlePromoteUnnormalizedTenure(row)
                          }
                        >
                          {isBusy ? '처리 중…' : 'DB 정본 연결'}
                        </S.ActionBtn>
                      </div>
                    </S.LedgerRow>
                  )
                })
              )}
            </S.LedgerScrollList>
          </S.LedgerPane>
        ) : (
          <S.SplitWorkspace $hasDrawer={drawerVisible}>
            {/* Left Flat Ledger */}
            <S.LedgerPane>
              <S.LedgerHeaderBand>
                <span>서열</span>
                <span>유형 분류</span>
                <span>직책 정본명 · 원어/영문</span>
                <span data-col="scope">적용 범위 · 귀속 기관</span>
                <span style={{ textAlign: 'right' }}>실사용 연결</span>
              </S.LedgerHeaderBand>

              <S.LedgerScrollList>
                {loadingDefs ? (
                  <S.EmptyStateBox>관직·직책 정본을 불러오는 중…</S.EmptyStateBox>
                ) : filteredDefinitions.length === 0 ? (
                  <S.EmptyStateBox>
                    검색·필터 조건에 맞는 직책 정본이 없습니다.
                  </S.EmptyStateBox>
                ) : (
                  filteredDefinitions.map((row) => {
                    const meta = getPositionTypeMeta(row.positionType)
                    const scopeCat = classifyPositionScope(row)
                    const subTitleBits = [
                      row.titleLocal,
                      row.titleEn,
                      row.category ? `분류:${row.category.name}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    const sysCount =
                      (row.politicalSystemsAsHeadOfState?.length ?? 0) +
                      (row.politicalSystemsAsHeadOfGovernment?.length ?? 0)
                    const tCount = row.tenureCount ?? 0

                    return (
                      <S.LedgerRow
                        key={row.id}
                        $selected={!creatingMode && row.id === selectedRow?.id}
                        onClick={() => {
                          setCreatingMode(false)
                          updateUrlParams({ id: row.id })
                        }}
                      >
                        <S.RankNumCell>#{row.rank ?? 999}</S.RankNumCell>
                        <div>
                          <S.TypeBadge $tone={meta.tone}>
                            {meta.shortLabel}
                          </S.TypeBadge>
                        </div>
                        <S.TitleCol>
                          <S.TitleMainLine>
                            <strong>{row.title}</strong>
                            {row.isMonarchical ? (
                              <S.MonarchMiniTag>군주직</S.MonarchMiniTag>
                            ) : null}
                          </S.TitleMainLine>
                          {subTitleBits ? (
                            <S.TitleSubLine>{subTitleBits}</S.TitleSubLine>
                          ) : null}
                        </S.TitleCol>

                        <S.ScopeChipsCell data-col="scope">
                          {scopeCat === 'universal' ? (
                            <S.ScopePill $kind="universal">
                              전역 보편 칭호
                            </S.ScopePill>
                          ) : scopeCat === 'institution' ? (
                            <S.ScopePill $kind="institution">
                              {row.administrationDepartment?.name ??
                                row.militaryUnit?.name ??
                                row.organization?.name ??
                                '기관 전용'}
                            </S.ScopePill>
                          ) : (
                            <>
                              {(row.scopes ?? []).slice(0, 2).map((sc) => {
                                const pLabel =
                                  sc.historicalCountry?.name ??
                                  sc.country?.name ??
                                  '국가'
                                const win = formatScopeWindowText(sc)
                                return (
                                  <S.ScopePill key={sc.id} $kind="polity">
                                    {pLabel}
                                    {sc.localTitle ? ` (${sc.localTitle})` : ''}
                                    {win ? ` · ${win}` : ''}
                                  </S.ScopePill>
                                )
                              })}
                              {(row.scopes?.length ?? 0) > 2 ? (
                                <S.ScopePill $kind="polity">
                                  +{(row.scopes?.length ?? 0) - 2}
                                </S.ScopePill>
                              ) : null}
                            </>
                          )}
                        </S.ScopeChipsCell>

                        <S.UsageCell>
                          <S.UsagePill $active={tCount > 0}>
                            <FiUsers size={10} />
                            재임 {tCount}
                          </S.UsagePill>
                          {sysCount > 0 ? (
                            <S.UsagePill $active>정체 {sysCount}</S.UsagePill>
                          ) : null}
                        </S.UsageCell>
                      </S.LedgerRow>
                    )
                  })
                )}
              </S.LedgerScrollList>
            </S.LedgerPane>

            {/* Right Dossier & Management Pane */}
            {drawerVisible ? (
              <S.DetailPane aria-label="직책 정본 상세 및 편집">
                <S.DetailHead>
                  <S.DetailTitleBlock>
                    <h2>
                      {creatingMode
                        ? '새 관직 · 직책 정본 등록'
                        : (selectedRow?.title ?? '직책 편집')}
                    </h2>
                    {!creatingMode && selectedRow ? (
                      <S.TitleSubLine>
                        ID: {selectedRow.id.slice(0, 8)} · 재임{' '}
                        {selectedRow.tenureCount ?? 0}건 · 조약 서명{' '}
                        {selectedRow.treatySignatoryCount ?? 0}건
                      </S.TitleSubLine>
                    ) : null}
                  </S.DetailTitleBlock>
                  <S.ActionBtn
                    type="button"
                    onClick={() => {
                      setCreatingMode(false)
                      updateUrlParams({ id: null })
                    }}
                    aria-label="상세 패널 닫기"
                  >
                    <FiX size={14} />
                  </S.ActionBtn>
                </S.DetailHead>

                {!creatingMode && selectedRow ? (
                  <S.DetailTabs role="tablist">
                    <S.DetailTabBtn
                      type="button"
                      role="tab"
                      $active={detailTab === 'edit'}
                      onClick={() => setDetailTab('edit')}
                    >
                      정본 속성 편집
                    </S.DetailTabBtn>
                    <S.DetailTabBtn
                      type="button"
                      role="tab"
                      $active={detailTab === 'scopes'}
                      onClick={() => setDetailTab('scopes')}
                    >
                      적용 국가 스코프 ({selectedRow.scopes?.length ?? 0})
                    </S.DetailTabBtn>
                    <S.DetailTabBtn
                      type="button"
                      role="tab"
                      $active={detailTab === 'holders'}
                      onClick={() => setDetailTab('holders')}
                    >
                      역대 재임자 ({selectedRow.tenureCount ?? 0}) · 통합
                    </S.DetailTabBtn>
                  </S.DetailTabs>
                ) : null}

                <S.DetailScrollBody>
                  {(creatingMode || detailTab === 'edit') && (
                    <>
                      <S.FormFieldGrid>
                        <S.FieldBlock>
                          <span className="lbl">직책 정본명 (필수)</span>
                          <S.TextInput
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            placeholder="예: 내각총리대신, 영의정, 외무장관, 청장"
                          />
                        </S.FieldBlock>
                        <S.FieldBlock>
                          <span className="lbl">직책 유형 (15종 분류)</span>
                          <S.InlineSelect
                            style={{ height: 34 }}
                            value={draftType}
                            onChange={(e) => setDraftType(e.target.value)}
                          >
                            {POSITION_TYPE_META.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </S.InlineSelect>
                        </S.FieldBlock>
                      </S.FormFieldGrid>

                      <S.FormFieldGrid>
                        <S.FieldBlock>
                          <span className="lbl">원어 · 한자 표기</span>
                          <S.TextInput
                            value={draftTitleLocal}
                            onChange={(e) => setDraftTitleLocal(e.target.value)}
                            placeholder="예: 領議政, Reichskanzler"
                          />
                        </S.FieldBlock>
                        <S.FieldBlock>
                          <span className="lbl">영문 표기</span>
                          <S.TextInput
                            value={draftTitleEn}
                            onChange={(e) => setDraftTitleEn(e.target.value)}
                            placeholder="예: Chief State Councillor"
                          />
                        </S.FieldBlock>
                      </S.FormFieldGrid>

                      <S.FormFieldGrid>
                        <S.FieldBlock>
                          <span className="lbl">의전 서열 (낮을수록 상위)</span>
                          <S.TextInput
                            type="number"
                            value={draftRank}
                            onChange={(e) => setDraftRank(e.target.value)}
                          />
                        </S.FieldBlock>
                        <S.FieldBlock>
                          <span className="lbl">군주 · 주권 칭호 여부</span>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              height: 34,
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={draftMonarchical}
                              onChange={(e) =>
                                setDraftMonarchical(e.target.checked)
                              }
                            />
                            <span>군주·주권 원수 칭호 (국왕·황제 등)</span>
                          </label>
                        </S.FieldBlock>
                      </S.FormFieldGrid>

                      {creatingMode && !draftDeptId ? (
                        <S.FieldBlock>
                          <span className="lbl">
                            초기 적용 국가 · 시대 스코프 (비우면 전 국가 보편 직책)
                          </span>
                          <SearchableSelect
                            options={[
                              {
                                value: '',
                                label:
                                  '전역 보편 직책 (총리·장관·청장 등 모든 국가 공통)',
                              },
                              ...polityOptions,
                            ]}
                            value={draftCreateScopePolity}
                            onChange={(val) => setDraftCreateScopePolity(val)}
                            placeholder="전역 보편 직책 또는 특정 국가·시대 선택"
                          />
                        </S.FieldBlock>
                      ) : null}

                      <S.FormFieldGrid>
                        <S.FieldBlock>
                          <span className="lbl">중앙부처 표준 기능 분류</span>
                          <S.InlineSelect
                            style={{ height: 34 }}
                            value={draftCategoryId}
                            onChange={(e) => setDraftCategoryId(e.target.value)}
                          >
                            <option value="">선택 안 함</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </S.InlineSelect>
                        </S.FieldBlock>
                        <S.FieldBlock>
                          <span className="lbl">특정 행정기관(부처) 전용 귀속</span>
                          <SearchableSelect
                            options={departmentSelectOptions}
                            value={draftDeptId}
                            onChange={(val) => setDraftDeptId(val)}
                            placeholder="부처 전용 직책일 때만 선택"
                          />
                        </S.FieldBlock>
                      </S.FormFieldGrid>

                      <S.FormFieldGrid>
                        <S.FieldBlock>
                          <span className="lbl">직제 신설일 (선택)</span>
                          <S.TextInput
                            type="date"
                            value={draftEstablishedDate}
                            onChange={(e) =>
                              setDraftEstablishedDate(e.target.value)
                            }
                          />
                        </S.FieldBlock>
                        <S.FieldBlock>
                          <span className="lbl">직제 폐지일 (선택)</span>
                          <S.TextInput
                            type="date"
                            value={draftAbolishedDate}
                            onChange={(e) =>
                              setDraftAbolishedDate(e.target.value)
                            }
                          />
                        </S.FieldBlock>
                      </S.FormFieldGrid>

                      <S.FieldBlock>
                        <span className="lbl">직무 · 연혁 설명</span>
                        <S.TextArea
                          value={draftDescription}
                          onChange={(e) => setDraftDescription(e.target.value)}
                          placeholder="관직의 권한, 설치 경위, 품계 등을 기록합니다."
                        />
                      </S.FieldBlock>
                    </>
                  )}

                  {!creatingMode && selectedRow && detailTab === 'scopes' && (
                    <>
                      <S.RuleCallout>
                        <strong>적용 범위 규칙:</strong> 스코프 행이{' '}
                        <strong>0개</strong>이고 특정 기관에 귀속되지 않으면{' '}
                        <strong>전역 보편 직책</strong>으로 모든 국가의 임명
                        피커에 노출됩니다. 스코프를 <strong>1개 이상</strong>{' '}
                        추가하면 지정된 국가·역사정체에서만 노출됩니다.
                      </S.RuleCallout>

                      <S.SectionCard>
                        <S.SectionCardTitle>
                          <span>
                            현재 적용 국가 · 정체 ({selectedRow.scopes?.length ?? 0}
                            )
                          </span>
                        </S.SectionCardTitle>

                        {(selectedRow.scopes?.length ?? 0) === 0 ? (
                          <S.TitleSubLine>
                            현재 스코프가 없어 모든 국가에서 사용할 수 있는{' '}
                            <b>전역 보편 직책</b> 상태입니다.
                          </S.TitleSubLine>
                        ) : (
                          (selectedRow.scopes ?? []).map((sc) => {
                            const label =
                              sc.historicalCountry?.name ??
                              sc.country?.name ??
                              '국가 미상'
                            const winText = formatScopeWindowText(sc)
                            const isEditingThis = editingScopeId === sc.id

                            return (
                              <S.ScopeItemRow key={sc.id}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                  }}
                                >
                                  <div>
                                    <strong style={{ fontSize: 12.5 }}>
                                      {label}
                                    </strong>
                                    {sc.localTitle ? (
                                      <span
                                        style={{
                                          marginLeft: 6,
                                          fontSize: 11.5,
                                          opacity: 0.8,
                                        }}
                                      >
                                        ({sc.localTitle})
                                      </span>
                                    ) : null}
                                    {winText ? (
                                      <span
                                        style={{
                                          marginLeft: 6,
                                          fontSize: 11,
                                          opacity: 0.7,
                                        }}
                                      >
                                        · {winText}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div style={{ display: 'flex', gap: 5 }}>
                                    <S.ActionBtn
                                      type="button"
                                      style={{ height: 26, padding: '0 8px' }}
                                      onClick={() => {
                                        if (isEditingThis) {
                                          setEditingScopeId(null)
                                        } else {
                                          setEditingScopeId(sc.id)
                                          setEditScopeLocalTitle(
                                            sc.localTitle ?? '',
                                          )
                                          setEditScopeStartEra(
                                            sc.startEra === 'BC' ? 'BC' : 'AD',
                                          )
                                          setEditScopeStartYear(
                                            sc.startYear != null
                                              ? String(sc.startYear)
                                              : '',
                                          )
                                          setEditScopeEndEra(
                                            sc.endEra === 'BC' ? 'BC' : 'AD',
                                          )
                                          setEditScopeEndYear(
                                            sc.endYear != null
                                              ? String(sc.endYear)
                                              : '',
                                          )
                                          setEditScopeNote(sc.note ?? '')
                                        }
                                      }}
                                    >
                                      {isEditingThis ? '닫기' : '편집'}
                                    </S.ActionBtn>
                                    <S.ActionBtn
                                      type="button"
                                      $variant="danger"
                                      style={{ height: 26, padding: '0 8px' }}
                                      disabled={savingScope}
                                      onClick={() =>
                                        void handleRemoveScope(sc.id)
                                      }
                                    >
                                      해제
                                    </S.ActionBtn>
                                  </div>
                                </div>

                                {sc.note && !isEditingThis ? (
                                  <S.TitleSubLine>{sc.note}</S.TitleSubLine>
                                ) : null}

                                {isEditingThis ? (
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 8,
                                      paddingTop: 6,
                                    }}
                                  >
                                    <S.FormFieldGrid>
                                      <S.FieldBlock>
                                        <span className="lbl">
                                          이 국가에서의 현지 표기
                                        </span>
                                        <S.TextInput
                                          value={editScopeLocalTitle}
                                          onChange={(e) =>
                                            setEditScopeLocalTitle(
                                              e.target.value,
                                            )
                                          }
                                          placeholder="예: 征夷大将軍"
                                        />
                                      </S.FieldBlock>
                                      <S.FieldBlock>
                                        <span className="lbl">비고</span>
                                        <S.TextInput
                                          value={editScopeNote}
                                          onChange={(e) =>
                                            setEditScopeNote(e.target.value)
                                          }
                                        />
                                      </S.FieldBlock>
                                    </S.FormFieldGrid>
                                    <S.FormFieldGrid>
                                      <S.FieldBlock>
                                        <span className="lbl">시작 연도</span>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                          <S.InlineSelect
                                            style={{ height: 34 }}
                                            value={editScopeStartEra}
                                            onChange={(e) =>
                                              setEditScopeStartEra(
                                                e.target.value as 'AD' | 'BC',
                                              )
                                            }
                                          >
                                            <option value="AD">AD</option>
                                            <option value="BC">BC</option>
                                          </S.InlineSelect>
                                          <S.TextInput
                                            style={{ flex: 1 }}
                                            type="number"
                                            value={editScopeStartYear}
                                            onChange={(e) =>
                                              setEditScopeStartYear(
                                                e.target.value,
                                              )
                                            }
                                            placeholder="연도"
                                          />
                                        </div>
                                      </S.FieldBlock>
                                      <S.FieldBlock>
                                        <span className="lbl">종료 연도</span>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                          <S.InlineSelect
                                            style={{ height: 34 }}
                                            value={editScopeEndEra}
                                            onChange={(e) =>
                                              setEditScopeEndEra(
                                                e.target.value as 'AD' | 'BC',
                                              )
                                            }
                                          >
                                            <option value="AD">AD</option>
                                            <option value="BC">BC</option>
                                          </S.InlineSelect>
                                          <S.TextInput
                                            style={{ flex: 1 }}
                                            type="number"
                                            value={editScopeEndYear}
                                            onChange={(e) =>
                                              setEditScopeEndYear(e.target.value)
                                            }
                                            placeholder="연도"
                                          />
                                        </div>
                                      </S.FieldBlock>
                                    </S.FormFieldGrid>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                      }}
                                    >
                                      <S.ActionBtn
                                        type="button"
                                        $variant="primary"
                                        disabled={savingScope}
                                        onClick={() =>
                                          void handleSaveScopeEdit(sc.id)
                                        }
                                      >
                                        적용 범위 저장
                                      </S.ActionBtn>
                                    </div>
                                  </div>
                                ) : null}
                              </S.ScopeItemRow>
                            )
                          })
                        )}
                      </S.SectionCard>

                      <S.SectionCard>
                        <S.SectionCardTitle>
                          <span>+ 적용 국가 · 역사정체 스코프 추가</span>
                        </S.SectionCardTitle>
                        <S.FieldBlock>
                          <span className="lbl">대상 국가 또는 역사정체</span>
                          <SearchableSelect
                            options={polityOptions}
                            value={newScopePolity}
                            onChange={(val) => setNewScopePolity(val)}
                            placeholder="국가 · 왕조 · 시대 정체 검색…"
                          />
                        </S.FieldBlock>
                        <S.FormFieldGrid>
                          <S.FieldBlock>
                            <span className="lbl">현지 표기 (선택)</span>
                            <S.TextInput
                              value={newScopeLocalTitle}
                              onChange={(e) =>
                                setNewScopeLocalTitle(e.target.value)
                              }
                              placeholder="예: Kanzler"
                            />
                          </S.FieldBlock>
                          <S.FieldBlock>
                            <span className="lbl">비고 (선택)</span>
                            <S.TextInput
                              value={newScopeNote}
                              onChange={(e) => setNewScopeNote(e.target.value)}
                              placeholder="시대·헌법 근거 메모"
                            />
                          </S.FieldBlock>
                        </S.FormFieldGrid>
                        <S.FormFieldGrid>
                          <S.FieldBlock>
                            <span className="lbl">적용 시작 연도 (선택)</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <S.InlineSelect
                                style={{ height: 34 }}
                                value={newScopeStartEra}
                                onChange={(e) =>
                                  setNewScopeStartEra(
                                    e.target.value as 'AD' | 'BC',
                                  )
                                }
                              >
                                <option value="AD">AD</option>
                                <option value="BC">BC</option>
                              </S.InlineSelect>
                              <S.TextInput
                                style={{ flex: 1 }}
                                type="number"
                                value={newScopeStartYear}
                                onChange={(e) =>
                                  setNewScopeStartYear(e.target.value)
                                }
                                placeholder="시작 연도"
                              />
                            </div>
                          </S.FieldBlock>
                          <S.FieldBlock>
                            <span className="lbl">적용 종료 연도 (선택)</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <S.InlineSelect
                                style={{ height: 34 }}
                                value={newScopeEndEra}
                                onChange={(e) =>
                                  setNewScopeEndEra(
                                    e.target.value as 'AD' | 'BC',
                                  )
                                }
                              >
                                <option value="AD">AD</option>
                                <option value="BC">BC</option>
                              </S.InlineSelect>
                              <S.TextInput
                                style={{ flex: 1 }}
                                type="number"
                                value={newScopeEndYear}
                                onChange={(e) =>
                                  setNewScopeEndYear(e.target.value)
                                }
                                placeholder="종료 연도"
                              />
                            </div>
                          </S.FieldBlock>
                        </S.FormFieldGrid>
                        <div
                          style={{ display: 'flex', justifyContent: 'flex-end' }}
                        >
                          <S.ActionBtn
                            type="button"
                            $variant="primary"
                            disabled={savingScope}
                            onClick={() => void handleAddScope()}
                          >
                            <FiPlus size={13} />
                            스코프 추가
                          </S.ActionBtn>
                        </div>
                      </S.SectionCard>
                    </>
                  )}

                  {!creatingMode && selectedRow && detailTab === 'holders' && (
                    <>
                      {/* Linked Political Systems */}
                      {((selectedRow.politicalSystemsAsHeadOfState?.length ??
                        0) > 0 ||
                        (selectedRow.politicalSystemsAsHeadOfGovernment
                          ?.length ?? 0) > 0) && (
                        <S.SectionCard>
                          <S.SectionCardTitle>
                            <span>헌정 체제(정체) 공식 수반 직위 지정</span>
                          </S.SectionCardTitle>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                          >
                            {(
                              selectedRow.politicalSystemsAsHeadOfState ?? []
                            ).map((ps) => (
                              <S.ScopePill key={`hos-${ps.id}`} $kind="polity">
                                [국가원수] {ps.name} (
                                {ps.historicalCountry?.name ??
                                  ps.country?.name ??
                                  ''}
                                )
                              </S.ScopePill>
                            ))}
                            {(
                              selectedRow.politicalSystemsAsHeadOfGovernment ??
                              []
                            ).map((ps) => (
                              <S.ScopePill key={`hog-${ps.id}`} $kind="polity">
                                [정부수반] {ps.name} (
                                {ps.historicalCountry?.name ??
                                  ps.country?.name ??
                                  ''}
                                )
                              </S.ScopePill>
                            ))}
                          </div>
                        </S.SectionCard>
                      )}

                      {/* Officeholders list */}
                      <S.SectionCard>
                        <S.SectionCardTitle>
                          <span>
                            역대 임명 · 재임자 목록 (
                            {selectedRow.tenures?.length ??
                              selectedRow.tenureCount ??
                              0}
                            )
                          </span>
                        </S.SectionCardTitle>

                        {(selectedRow.tenures?.length ?? 0) === 0 ? (
                          <S.TitleSubLine>
                            아직 이 직책 정본으로 임명된 인물이 없습니다.
                          </S.TitleSubLine>
                        ) : (
                          (selectedRow.tenures ?? []).map((t) => {
                            const pName = t.person
                              ? getPersonDisplayName(t.person)
                              : '인물 미상'
                            const polityLabel =
                              t.historicalCountry?.name ??
                              t.country?.name ??
                              ''
                            const subOrg =
                              t.administrationDepartment?.name ??
                              t.militaryUnit?.name ??
                              t.cabinet?.name ??
                              ''
                            return (
                              <S.OfficeholderRowCard key={t.id}>
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      fontSize: 12.5,
                                    }}
                                  >
                                    {t.ordinal != null ? (
                                      <S.MonarchMiniTag>
                                        제{t.ordinal}대
                                      </S.MonarchMiniTag>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (t.person?.id) {
                                          setPersonModalId(t.person.id)
                                        }
                                      }}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        padding: 0,
                                        fontWeight: 700,
                                        color: 'inherit',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                      }}
                                    >
                                      {pName}
                                    </button>
                                    {t.title &&
                                    t.title.trim() !== selectedRow.title ? (
                                      <S.TitleSubLine>
                                        ({t.title})
                                      </S.TitleSubLine>
                                    ) : null}
                                  </div>
                                  <S.TitleSubLine>
                                    {[
                                      polityLabel,
                                      subOrg,
                                      formatOfficeholderPeriod(t),
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </S.TitleSubLine>
                                </div>
                                {t.cabinet?.id ? (
                                  <Link
                                    to={pathKeys.government.cabinetDetail(
                                      t.cabinet.id,
                                    )}
                                    style={{
                                      fontSize: 11,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    내각 ↗
                                  </Link>
                                ) : t.administrationDepartment?.id ? (
                                  <Link
                                    to={pathKeys.government.departmentDetail(
                                      t.administrationDepartment.id,
                                    )}
                                    style={{
                                      fontSize: 11,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    부처 ↗
                                  </Link>
                                ) : null}
                              </S.OfficeholderRowCard>
                            )
                          })
                        )}
                      </S.SectionCard>

                      {/* Duplicate Position Merge */}
                      <S.SectionCard>
                        <S.SectionCardTitle>
                          <span>
                            <FiGitMerge
                              size={12}
                              style={{ marginRight: 5, verticalAlign: -1 }}
                            />
                            중복 직책 정본 통합 (Merge)
                          </span>
                        </S.SectionCardTitle>
                        <S.TitleSubLine>
                          같은 직책이 중복 생성되었을 때, 모든 재임·정체·조약
                          기록을 아래 선택한 대상 정본으로 이관한 뒤 현재 행을
                          정리합니다.
                        </S.TitleSubLine>
                        <SearchableSelect
                          options={mergeCandidateOptions}
                          value={mergeTargetId}
                          onChange={(val) => setMergeTargetId(val)}
                          placeholder="통합해 합칠 대상 직책 정본 검색…"
                        />
                        <div
                          style={{ display: 'flex', justifyContent: 'flex-end' }}
                        >
                          <S.ActionBtn
                            type="button"
                            $variant="danger"
                            disabled={!mergeTargetId || merging}
                            onClick={() => void handleMergeDefinition()}
                          >
                            <FiGitMerge size={13} />
                            {merging
                              ? '통합 중…'
                              : '선택한 정본으로 이관 및 통합'}
                          </S.ActionBtn>
                        </div>
                      </S.SectionCard>
                    </>
                  )}
                </S.DetailScrollBody>

                {(creatingMode || detailTab === 'edit') && (
                  <S.DetailFooter>
                    <div>
                      {!creatingMode && selectedRow ? (
                        <S.ActionBtn
                          type="button"
                          $variant="danger"
                          disabled={savingForm}
                          onClick={() => void handleDeleteDefinition()}
                        >
                          <FiTrash2 size={13} />
                          정본 삭제
                        </S.ActionBtn>
                      ) : null}
                    </div>
                    <S.ActionBtn
                      type="button"
                      $variant="primary"
                      disabled={savingForm}
                      onClick={() => void handleSaveDefinition()}
                    >
                      {creatingMode ? (
                        <FiPlus size={14} />
                      ) : (
                        <FiCheck size={14} />
                      )}
                      {savingForm
                        ? '저장 중…'
                        : creatingMode
                          ? '직책 정본 등록'
                          : '변경사항 저장'}
                    </S.ActionBtn>
                  </S.DetailFooter>
                )}
              </S.DetailPane>
            ) : null}
          </S.SplitWorkspace>
        )}
      </S.PageWrapper>

      <PersonInlineModal
        personId={personModalId}
        onClose={() => setPersonModalId(null)}
        onEdit={() => setPersonModalId(null)}
      />
    </S.PageScene>
  )
}

export default GovernmentPositionsPage
