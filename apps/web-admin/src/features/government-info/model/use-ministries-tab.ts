import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  AdministrationDepartment,
  AdministrationDepartmentCategory,
  CreateAdministrationDepartmentInput,
} from '@/shared/api/administration-department'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { militaryUnitApi } from '@/shared/api/military-unit'

import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import {
  ALL_DEPARTMENTS_CATEGORY_ID,
  UNCATEGORIZED_CATEGORY_ID,
  countDescendantsInDepartmentTree,
  countDepartmentsByCategoryId,
  emptyMinistryFormFields,
  filterDepartmentsBySearchQuery,
  ministryFormFieldsFromDepartment,
} from '@/shared/lib/ministry-department/ministry-department-utils'

import type { GovernmentContentTab } from './government-content-tab'
import type { MinistryFormFields } from './ministry-form-fields'

export type UseMinistriesTabOptions = {
  effectiveCountryId: string | undefined
  isHistorical?: boolean
  contentTab: GovernmentContentTab
  /** 행정부 탭에서「부처 등록」으로 넘어올 때 */
  cabinetOpenMinistryIntent: { categoryId: string } | null
  onConsumedCabinetOpenMinistryIntent: () => void
  /** 군사 조직 탭 등에서 특정 부처 상세로 바로 이동할 때 */
  focusDepartmentId?: string | null
  onConsumedFocusDepartment?: () => void
}

export function useMinistriesTab({
  effectiveCountryId,
  isHistorical = false,
  contentTab,
  cabinetOpenMinistryIntent,
  onConsumedCabinetOpenMinistryIntent,
  focusDepartmentId,
  onConsumedFocusDepartment,
}: UseMinistriesTabOptions) {
  const queryClient = useQueryClient()
  const departmentsQueryKey = useMemo(
    () =>
      isHistorical
        ? administrationDepartmentsByHistoricalCountryQueryKey(
            effectiveCountryId,
          )
        : administrationDepartmentsByCountryQueryKey(effectiveCountryId),
    [effectiveCountryId, isHistorical],
  )

  const {
    data: ministriesList = [],
    isLoading: ministriesLoading,
  } = useQuery({
    queryKey: departmentsQueryKey,
    queryFn: () =>
      isHistorical
        ? administrationDepartmentApi.getByHistoricalCountryId(
            effectiveCountryId!,
          )
        : administrationDepartmentApi.getByCountryId(effectiveCountryId!),
    enabled: !!effectiveCountryId && contentTab === 'ministries',
  })
  const [ministryFormModalOpen, setMinistryFormModalOpen] = useState(false)
  const [ministrySearchQuery, setMinistrySearchQuery] = useState('')
  const [ministryTreeCategoryId, setMinistryTreeCategoryId] =
    useState<string>('')
  const [ministryBrowseDepartment, setMinistryBrowseDepartment] =
    useState<AdministrationDepartment | null>(null)
  const [editingMinistry, setEditingMinistry] =
    useState<AdministrationDepartment | null>(null)
  const [ministryForm, setMinistryForm] = useState<MinistryFormFields>(() =>
    emptyMinistryFormFields('', ''),
  )
  const [categoriesList, setCategoriesList] = useState<
    AdministrationDepartmentCategory[]
  >([])

  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [submittingMinistry, setSubmittingMinistry] = useState(false)
  const [establishedDateModalOpen, setEstablishedDateModalOpen] =
    useState(false)
  const [abolishedDateModalOpen, setAbolishedDateModalOpen] = useState(false)
  const [categorySelectOpen, setCategorySelectOpen] = useState(false)
  const [parentSelectOpen, setParentSelectOpen] = useState(false)
  const [successorSelectOpen, setSuccessorSelectOpen] = useState(false)
  const [predecessorSelectOpen, setPredecessorSelectOpen] = useState(false)

  const loadMinistries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: departmentsQueryKey })
  }, [queryClient, departmentsQueryKey])

  const openMinistryEdit = useCallback((dept: AdministrationDepartment) => {
    setEditingMinistry(dept)
    setMinistryForm(ministryFormFieldsFromDepartment(dept))
    setMinistryFormModalOpen(true)
  }, [])

  const openMinistryCreateChild = useCallback(
    (parent: AdministrationDepartment, categoryId: string) => {
      setEditingMinistry(null)
      setMinistryForm(
        emptyMinistryFormFields(
          parent.categoryId || categoryId,
          parent.id,
          parent.historicalCountryId ?? '',
          parent.kind ?? 'MINISTRY',
        ),
      )
      setMinistryFormModalOpen(true)
    },
    [],
  )

  const openMinistryCreateRootInCategory = useCallback(
    (
      categoryId: string,
      defaultHistoricalCountryId = '',
      defaultKind: NonNullable<AdministrationDepartment['kind']> = 'MINISTRY',
    ) => {
      setEditingMinistry(null)
      const resolvedCatId =
        categoryId === UNCATEGORIZED_CATEGORY_ID ||
        categoryId === ALL_DEPARTMENTS_CATEGORY_ID
          ? ''
          : categoryId
      setMinistryForm(
        emptyMinistryFormFields(
          resolvedCatId,
          '',
          defaultHistoricalCountryId,
          defaultKind,
        ),
      )
      setMinistryFormModalOpen(true)
    },
    [],
  )

  const closeMinistryFormModal = useCallback(() => {
    setMinistryFormModalOpen(false)
    setEditingMinistry(null)
  }, [])

  const submitMinistryForm = useCallback(() => {
    if (!effectiveCountryId || submittingMinistry) return
    if (!ministryForm.name.trim()) {
      notify.error('부처·기관명을 입력해주세요.')
      return
    }
    const effectiveNameEn =
      ministryForm.nameEn.trim() ||
      ministryForm.defenseOfficialNameEn.trim()
    const resolvedHistoricalCountryId = isHistorical
      ? effectiveCountryId
      : ministryForm.historicalCountryId.trim() || null
    const resolvedCategoryId =
      ministryForm.categoryId &&
      ministryForm.categoryId !== ALL_DEPARTMENTS_CATEGORY_ID &&
      ministryForm.categoryId !== UNCATEGORIZED_CATEGORY_ID
        ? ministryForm.categoryId
        : null

    type DateInfoPayload = NonNullable<
      CreateAdministrationDepartmentInput['establishedInfo']
    >
    const buildStructuredDateInfo = (
      era: 'AD' | 'BC',
      year: number | null,
      month: number | null,
      day: number | null,
    ): DateInfoPayload | null => {
      if (year == null || !Number.isFinite(year) || year <= 0) return null
      return {
        era: (era || 'AD') as DateInfoPayload['era'],
        year: Math.trunc(year),
        ...(month != null && month >= 1 && month <= 12
          ? { month: Math.trunc(month) }
          : {}),
        ...(month != null &&
        day != null &&
        day >= 1 &&
        day <= 31
          ? { day: Math.trunc(day) }
          : {}),
      }
    }

    const establishedInfo = buildStructuredDateInfo(
      ministryForm.establishedEra,
      ministryForm.establishedYear,
      ministryForm.establishedMonth,
      ministryForm.establishedDay,
    )
    const abolishedInfo = buildStructuredDateInfo(
      ministryForm.abolishedEra,
      ministryForm.abolishedYear,
      ministryForm.abolishedMonth,
      ministryForm.abolishedDay,
    )

    const payload: CreateAdministrationDepartmentInput = {
      name: ministryForm.name.trim(),
      nameLocal: ministryForm.nameLocal.trim() || null,
      nameEn: effectiveNameEn || null,
      abbreviation: ministryForm.abbreviation.trim() || null,
      kind: ministryForm.kind || 'MINISTRY',
      parentId: ministryForm.parentId || null,
      categoryId: resolvedCategoryId,
      thumbnailUrl: ministryForm.thumbnailUrl.trim() || null,
      description: ministryForm.description.trim() || null,
      primaryMission: ministryForm.defenseMissionScope.trim() || null,
      headquarters: ministryForm.defenseHeadquarters.trim() || null,
      orgStructure: ministryForm.defenseOrgStructure.trim() || null,
      budgetNote: ministryForm.defenseBudgetOrForcesNote.trim() || null,
      establishedInfo,
      abolishedInfo,
      establishedDate: establishedInfo
        ? null
        : ministryForm.establishedDate.trim() || null,
      abolishedDate: abolishedInfo
        ? null
        : ministryForm.abolishedDate.trim() || null,
      historicalCountryId: resolvedHistoricalCountryId,
      ...(isHistorical ? {} : { countryId: effectiveCountryId }),
    }

    const desiredPredecessors = (() => {
      const list = ministryForm.predecessorTransitions ?? []
      const seen = new Set<string>()
      return list.filter((item) => {
        const trimmedId = item.predecessorId.trim()
        if (!trimmedId || seen.has(trimmedId)) return false
        seen.add(trimmedId)
        return true
      })
    })()

    const desiredTransitions = (() => {
      const list =
        ministryForm.successorTransitions &&
        ministryForm.successorTransitions.length > 0
          ? ministryForm.successorTransitions
          : ministryForm.successorId.trim()
            ? [
                {
                  successorId: ministryForm.successorId.trim(),
                  kind: 'REORGANIZE' as const,
                },
              ]
            : []
      const seen = new Set<string>()
      return list.filter((item) => {
        const trimmedId = item.successorId.trim()
        if (!trimmedId || seen.has(trimmedId)) return false
        seen.add(trimmedId)
        return true
      })
    })()

    const desiredMilitarySuccessors = (() => {
      const list = ministryForm.militaryUnitSuccessorTransitions ?? []
      const seen = new Set<string>()
      return list.filter((item) => {
        const trimmedId = item.unitId.trim()
        if (!trimmedId || seen.has(trimmedId)) return false
        seen.add(trimmedId)
        return true
      })
    })()

    const syncLineageAndUnits = async (
      deptId: string,
      prevPredecessors: AdministrationDepartment['predecessors'] = [],
      prevTransitions: AdministrationDepartment['successors'] = [],
      prevMilitarySuccessors: NonNullable<
        AdministrationDepartment['militaryUnitSuccessors']
      > = [],
      prevUnitIds: string[] = [],
    ) => {
      let touchedMilitary = false

      // 1. 전신 기관(predecessors) 동기화: predecessorId -> deptId
      const desiredByPredecessorId = new Map(
        desiredPredecessors.map((item) => [item.predecessorId.trim(), item]),
      )
      for (const prev of prevPredecessors) {
        const matched = desiredByPredecessorId.get(prev.department.id)
        if (!matched) {
          await administrationDepartmentApi.deleteTransition(prev.transitionId)
        } else {
          const nextKind = matched.kind ?? 'REORGANIZE'
          const nextYear = matched.year ?? null
          const nextEra = matched.era ?? (nextYear != null ? 'AD' : null)
          const nextMonth = nextYear != null ? (matched.month ?? null) : null
          const nextNote = matched.note?.trim() ? matched.note.trim() : null
          if (
            prev.kind !== nextKind ||
            (prev.era ?? null) !== nextEra ||
            (prev.year ?? null) !== nextYear ||
            (prev.month ?? null) !== nextMonth ||
            (prev.note ?? null) !== nextNote
          ) {
            await administrationDepartmentApi.updateTransition(
              prev.transitionId,
              {
                kind: nextKind,
                era: nextEra,
                year: nextYear,
                month: nextMonth,
                note: nextNote,
              },
            )
          }
        }
      }
      const prevPredecessorIds = new Set(
        prevPredecessors.map((prev) => prev.department.id),
      )
      for (const desired of desiredPredecessors) {
        const sourceId = desired.predecessorId.trim()
        if (!prevPredecessorIds.has(sourceId)) {
          const nextYear = desired.year ?? null
          const nextEra = desired.era ?? (nextYear != null ? 'AD' : null)
          const nextMonth = nextYear != null ? (desired.month ?? null) : null
          const nextNote = desired.note?.trim() ? desired.note.trim() : null
          await administrationDepartmentApi.addTransition(sourceId, {
            successorId: deptId,
            kind: desired.kind ?? 'REORGANIZE',
            era: nextEra,
            year: nextYear,
            month: nextMonth,
            note: nextNote,
          })
        }
      }

      // 2. 후신 기관(successors) 동기화: deptId -> successorId
      const desiredBySuccessorId = new Map(
        desiredTransitions.map((item) => [item.successorId.trim(), item]),
      )
      for (const prev of prevTransitions) {
        const matched = desiredBySuccessorId.get(prev.department.id)
        if (!matched) {
          await administrationDepartmentApi.deleteTransition(prev.transitionId)
        } else {
          const nextKind = matched.kind ?? 'REORGANIZE'
          const nextYear = matched.year ?? null
          const nextEra = matched.era ?? (nextYear != null ? 'AD' : null)
          const nextMonth = nextYear != null ? (matched.month ?? null) : null
          const nextNote = matched.note?.trim() ? matched.note.trim() : null
          if (
            prev.kind !== nextKind ||
            (prev.era ?? null) !== nextEra ||
            (prev.year ?? null) !== nextYear ||
            (prev.month ?? null) !== nextMonth ||
            (prev.note ?? null) !== nextNote
          ) {
            await administrationDepartmentApi.updateTransition(
              prev.transitionId,
              {
                kind: nextKind,
                era: nextEra,
                year: nextYear,
                month: nextMonth,
                note: nextNote,
              },
            )
          }
        }
      }
      const prevSuccessorIds = new Set(
        prevTransitions.map((prev) => prev.department.id),
      )
      for (const desired of desiredTransitions) {
        const targetId = desired.successorId.trim()
        if (!prevSuccessorIds.has(targetId)) {
          const nextYear = desired.year ?? null
          const nextEra = desired.era ?? (nextYear != null ? 'AD' : null)
          const nextMonth = nextYear != null ? (desired.month ?? null) : null
          const nextNote = desired.note?.trim() ? desired.note.trim() : null
          await administrationDepartmentApi.addTransition(deptId, {
            successorId: targetId,
            kind: desired.kind ?? 'REORGANIZE',
            era: nextEra,
            year: nextYear,
            month: nextMonth,
            note: nextNote,
          })
        }
      }

      // 3. 군사조직으로의 후신 계보(부처 → 군사조직, 예: 제국전쟁성 → OKW) 동기화
      const desiredMilitaryByUnitId = new Map(
        desiredMilitarySuccessors.map((item) => [item.unitId.trim(), item]),
      )
      for (const prevMil of prevMilitarySuccessors) {
        const prevTargetUnitId = prevMil.militaryUnit?.id
        if (!prevTargetUnitId) continue
        const matchedMil = desiredMilitaryByUnitId.get(prevTargetUnitId)
        if (!matchedMil) {
          await militaryUnitApi.deleteTransition(prevMil.transitionId)
          touchedMilitary = true
        } else {
          const nextKind = matchedMil.kind ?? 'REORGANIZE'
          const nextYear = matchedMil.year ?? null
          const nextEra = matchedMil.era ?? (nextYear != null ? 'AD' : null)
          const nextMonth = nextYear != null ? (matchedMil.month ?? null) : null
          const nextNote = matchedMil.note?.trim()
            ? matchedMil.note.trim()
            : null
          if (
            prevMil.kind !== nextKind ||
            (prevMil.era ?? null) !== nextEra ||
            (prevMil.year ?? null) !== nextYear ||
            (prevMil.month ?? null) !== nextMonth ||
            (prevMil.note ?? null) !== nextNote
          ) {
            await militaryUnitApi.updateTransition(prevMil.transitionId, {
              kind: nextKind,
              era: nextEra,
              year: nextYear,
              month: nextMonth,
              note: nextNote,
            })
            touchedMilitary = true
          }
        }
      }
      const prevMilitaryUnitIds = new Set(
        prevMilitarySuccessors
          .map((prevMil) => prevMil.militaryUnit?.id)
          .filter((unitId): unitId is string => Boolean(unitId)),
      )
      for (const desiredMil of desiredMilitarySuccessors) {
        const targetUnitId = desiredMil.unitId.trim()
        if (!prevMilitaryUnitIds.has(targetUnitId)) {
          const nextYear = desiredMil.year ?? null
          const nextEra = desiredMil.era ?? (nextYear != null ? 'AD' : null)
          const nextMonth = nextYear != null ? (desiredMil.month ?? null) : null
          const nextNote = desiredMil.note?.trim()
            ? desiredMil.note.trim()
            : null
          await militaryUnitApi.addTransition(targetUnitId, {
            predecessorDepartmentId: deptId,
            kind: desiredMil.kind ?? 'REORGANIZE',
            era: nextEra,
            year: nextYear,
            month: nextMonth,
            note: nextNote,
          })
          touchedMilitary = true
        }
      }

      // 4. 연결 군부대(militaryUnits) 동기화
      const desiredUnitIds = new Set(
        (ministryForm.linkedMilitaryUnitIds ?? []).filter(Boolean),
      )
      const prevUnitIdSet = new Set(prevUnitIds.filter(Boolean))
      const unitUpdatePromises: Promise<unknown>[] = []
      for (const prevUnitId of prevUnitIdSet) {
        if (!desiredUnitIds.has(prevUnitId)) {
          unitUpdatePromises.push(
            militaryUnitApi.update(prevUnitId, {
              administrationDepartmentId: null,
            }),
          )
        }
      }
      for (const nextUnitId of desiredUnitIds) {
        if (!prevUnitIdSet.has(nextUnitId)) {
          unitUpdatePromises.push(
            militaryUnitApi.update(nextUnitId, {
              administrationDepartmentId: deptId,
            }),
          )
        }
      }
      if (unitUpdatePromises.length > 0) {
        await Promise.all(unitUpdatePromises)
        touchedMilitary = true
      }
      if (touchedMilitary) {
        void queryClient.invalidateQueries({ queryKey: ['military-units'] })
        void queryClient.invalidateQueries({ queryKey: ['military-unit'] })
      }
    }

    setSubmittingMinistry(true)
    if (editingMinistry) {
      administrationDepartmentApi
        .update(editingMinistry.id, payload)
        .then((updated) =>
          syncLineageAndUnits(
            updated.id,
            editingMinistry.predecessors ?? [],
            editingMinistry.successors ?? [],
            editingMinistry.militaryUnitSuccessors ?? [],
            (editingMinistry.militaryUnits ?? []).map((unit) => unit.id),
          ).then(async () => {
            try {
              const refreshed = await administrationDepartmentApi.getById(
                updated.id,
              )
              return refreshed ?? updated
            } catch {
              return updated
            }
          }),
        )
        .then((updated) => {
          notify.success(`「${updated.name}」 기관 정보가 저장되었습니다.`)
          setMinistryBrowseDepartment(updated)
          closeMinistryFormModal()
          loadMinistries()
        })
        .catch((err) =>
          notify.error(getApiErrorMessage(err, '수정에 실패했습니다.')),
        )
        .finally(() => setSubmittingMinistry(false))
    } else {
      administrationDepartmentApi
        .create(payload)
        .then((created) =>
          syncLineageAndUnits(created.id, [], [], [], []).then(async () => {
            try {
              const refreshed = await administrationDepartmentApi.getById(
                created.id,
              )
              return refreshed ?? created
            } catch {
              return created
            }
          }),
        )
        .then((created) => {
          notify.success(`「${created.name}」 기관이 등록되었습니다.`)
          setMinistryBrowseDepartment(created)
          closeMinistryFormModal()
          loadMinistries()
        })
        .catch((err) =>
          notify.error(getApiErrorMessage(err, '등록에 실패했습니다.')),
        )
        .finally(() => setSubmittingMinistry(false))
    }
  }, [
    effectiveCountryId,
    submittingMinistry,
    isHistorical,
    ministryForm,
    editingMinistry,
    queryClient,
    loadMinistries,
    closeMinistryFormModal,
  ])

  const handleMinistryDelete = useCallback(
    async (dept: AdministrationDepartment) => {
      const sub = countDescendantsInDepartmentTree(dept.id, ministriesList)
      if (sub > 0) {
        notify.error(
          `「${dept.name}」에 하위 기관 ${sub}개가 연결되어 있어 바로 삭제할 수 없습니다. 하위 기관을 먼저 이동하거나 삭제해 주세요.`,
        )
        return
      }
      const msg = `"${dept.name}" 부처를 삭제하시겠습니까?`
      if (await confirm({ title: '삭제 확인', message: msg, danger: true })) {
        void administrationDepartmentApi
          .delete(dept.id)
          .then(() => {
            setMinistryBrowseDepartment((prev) =>
              prev?.id === dept.id ? null : prev,
            )
            loadMinistries()
          })
          .catch((err) => {
            notify.error(getApiErrorMessage(err, '삭제에 실패했습니다.'))
          })
      }
    },
    [ministriesList, loadMinistries],
  )

  const ministryCategoryDeptCounts = useMemo(
    () => countDepartmentsByCategoryId(ministriesList),
    [ministriesList],
  )

  /** 탭 바 표시용 카테고리 목록 — 맨 앞에 '전체 기관' 통합 탭을 두고, 미분류 부처가 있으면 끝에 '미분류·직속' 탭 추가 */
  const displayCategoriesList = useMemo<
    AdministrationDepartmentCategory[]
  >(() => {
    const allTab: AdministrationDepartmentCategory = {
      id: ALL_DEPARTMENTS_CATEGORY_ID,
      name: '전체 기관',
      nameEn: null,
    }
    const uncategorizedCount =
      ministryCategoryDeptCounts.get(UNCATEGORIZED_CATEGORY_ID) ?? 0
    if (categoriesList.length > 0 && uncategorizedCount <= 0) {
      return [allTab, ...categoriesList]
    }
    return [
      allTab,
      ...categoriesList,
      { id: UNCATEGORIZED_CATEGORY_ID, name: '미분류·직속', nameEn: null },
    ]
  }, [categoriesList, ministryCategoryDeptCounts])

  const reloadCategories = useCallback(() => {
    administrationDepartmentApi
      .getCategories()
      .then(setCategoriesList)
      .catch(() => setCategoriesList([]))
  }, [])

  useEffect(() => {
    if (contentTab === 'ministries') {
      reloadCategories()
    }
  }, [contentTab, reloadCategories])

  useEffect(() => {
    if (!displayCategoriesList.length) return
    setMinistryTreeCategoryId((prev) => {
      if (
        prev &&
        displayCategoriesList.some((category) => category.id === prev)
      )
        return prev
      return displayCategoriesList[0].id
    })
  }, [displayCategoriesList])

  useEffect(() => {
    if (!focusDepartmentId || contentTab !== 'ministries') return
    if (ministriesList.length === 0) return
    const matchedDept = ministriesList.find(
      (deptItem) => deptItem.id === focusDepartmentId,
    )
    if (matchedDept) {
      setMinistryTreeCategoryId((prevCatId) =>
        prevCatId === ALL_DEPARTMENTS_CATEGORY_ID
          ? ALL_DEPARTMENTS_CATEGORY_ID
          : matchedDept.categoryId || UNCATEGORIZED_CATEGORY_ID,
      )
      setMinistryBrowseDepartment(matchedDept)
    }
    onConsumedFocusDepartment?.()
  }, [
    focusDepartmentId,
    contentTab,
    ministriesList,
    onConsumedFocusDepartment,
  ])

  useEffect(() => {
    if (!ministryBrowseDepartment) return
    if (
      !ministriesList.some((dept) => dept.id === ministryBrowseDepartment.id)
    ) {
      setMinistryBrowseDepartment(null)
    }
  }, [ministriesList, ministryBrowseDepartment])

  const ministryBrowseResolved = useMemo(() => {
    if (!ministryBrowseDepartment) return null
    return (
      ministriesList.find((dept) => dept.id === ministryBrowseDepartment.id) ??
      ministryBrowseDepartment
    )
  }, [ministriesList, ministryBrowseDepartment])

  const showMinistryListToolbar = useMemo(
    () => !(ministryBrowseResolved && !ministryFormModalOpen),
    [ministryBrowseResolved, ministryFormModalOpen],
  )

  useEffect(() => {
    if (!cabinetOpenMinistryIntent || contentTab !== 'ministries') return
    setEditingMinistry(null)
    setMinistryForm(
      emptyMinistryFormFields(cabinetOpenMinistryIntent.categoryId, ''),
    )
    setMinistryFormModalOpen(true)
    onConsumedCabinetOpenMinistryIntent()
  }, [
    cabinetOpenMinistryIntent,
    contentTab,
    onConsumedCabinetOpenMinistryIntent,
  ])

  return {
    ministriesList,
    ministriesLoading,
    ministryFormModalOpen,
    setMinistryFormModalOpen,
    ministrySearchQuery,
    setMinistrySearchQuery,
    ministryTreeCategoryId,
    setMinistryTreeCategoryId,
    ministryBrowseDepartment,
    setMinistryBrowseDepartment,
    editingMinistry,
    setEditingMinistry,
    ministryForm,
    setMinistryForm,
    categoriesList,
    setCategoriesList,
    reloadCategories,
    displayCategoriesList,
    loadMinistries,
    openMinistryEdit,
    openMinistryCreateChild,
    openMinistryCreateRootInCategory,
    closeMinistryFormModal,
    submitMinistryForm,
    submittingMinistry,
    handleMinistryDelete,
    ministryCategoryDeptCounts,
    ministryBrowseResolved,
    showMinistryListToolbar,
    filterDepartmentsBySearchQuery,
    thumbnailInputRef,
    thumbnailUploading,
    setThumbnailUploading,
    establishedDateModalOpen,
    setEstablishedDateModalOpen,
    abolishedDateModalOpen,
    setAbolishedDateModalOpen,
    categorySelectOpen,
    setCategorySelectOpen,
    parentSelectOpen,
    setParentSelectOpen,
    successorSelectOpen,
    setSuccessorSelectOpen,
    predecessorSelectOpen,
    setPredecessorSelectOpen,
  }
}
