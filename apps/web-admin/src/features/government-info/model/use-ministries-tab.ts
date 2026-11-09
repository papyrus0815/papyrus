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
} from '@/shared/api/administration-department'
import { administrationDepartmentApi } from '@/shared/api/administration-department'

import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import {
  buildDepartmentDescription,
  countDescendantsInDepartmentTree,
  countDepartmentsByCategoryId,
  emptyMinistryFormFields,
  filterDepartmentsBySearchQuery,
  isDefenseRelatedCategory,
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
}

export function useMinistriesTab({
  effectiveCountryId,
  isHistorical = false,
  contentTab,
  cabinetOpenMinistryIntent,
  onConsumedCabinetOpenMinistryIntent,
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
  const [establishedDateModalOpen, setEstablishedDateModalOpen] =
    useState(false)
  const [abolishedDateModalOpen, setAbolishedDateModalOpen] = useState(false)
  const [categorySelectOpen, setCategorySelectOpen] = useState(false)
  const [parentSelectOpen, setParentSelectOpen] = useState(false)
  const [successorSelectOpen, setSuccessorSelectOpen] = useState(false)

  const loadMinistries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: departmentsQueryKey })
  }, [queryClient, departmentsQueryKey])

  const openMinistryEdit = useCallback((dept: AdministrationDepartment) => {
    setMinistryBrowseDepartment(null)
    setEditingMinistry(dept)
    setMinistryForm(ministryFormFieldsFromDepartment(dept))
    setMinistryFormModalOpen(true)
  }, [])

  const openMinistryCreateChild = useCallback(
    (parent: AdministrationDepartment, categoryId: string) => {
      setMinistryBrowseDepartment(null)
      setEditingMinistry(null)
      setMinistryForm(emptyMinistryFormFields(categoryId, parent.id))
      setMinistryFormModalOpen(true)
    },
    [],
  )

  const openMinistryCreateRootInCategory = useCallback((categoryId: string) => {
    setMinistryBrowseDepartment(null)
    setEditingMinistry(null)
    setMinistryForm(emptyMinistryFormFields(categoryId, ''))
    setMinistryFormModalOpen(true)
  }, [])

  const closeMinistryFormModal = useCallback(() => {
    setMinistryFormModalOpen(false)
    setEditingMinistry(null)
  }, [])

  const submitMinistryForm = useCallback(() => {
    if (!effectiveCountryId) return
    if (!ministryForm.name.trim()) {
      notify.error('부처명을 입력해주세요.')
      return
    }
    if (!ministryForm.categoryId?.trim()) {
      notify.error('카테고리를 선택해주세요.')
      return
    }
    const category = categoriesList.find(
      (row) => row.id === ministryForm.categoryId,
    )
    const defenseCat = isDefenseRelatedCategory(category ?? null)
    const defensePayload = defenseCat
      ? {
          officialNameEn: ministryForm.defenseOfficialNameEn.trim(),
          missionScope: ministryForm.defenseMissionScope.trim(),
          headquarters: ministryForm.defenseHeadquarters.trim(),
          orgStructure: ministryForm.defenseOrgStructure.trim(),
          budgetOrForcesNote: ministryForm.defenseBudgetOrForcesNote.trim(),
        }
      : null
    const descriptionCombined = buildDepartmentDescription(
      ministryForm.description.trim(),
      defensePayload,
      defenseCat,
    )
    const effectiveNameEn =
      ministryForm.nameEn.trim() ||
      (defenseCat ? ministryForm.defenseOfficialNameEn.trim() : '')
    const payload = {
      name: ministryForm.name.trim(),
      nameLocal: ministryForm.nameLocal.trim() || null,
      nameEn: effectiveNameEn || null,
      abbreviation: ministryForm.abbreviation.trim() || null,
      kind: ministryForm.kind || 'MINISTRY',
      parentId: ministryForm.parentId || null,
      categoryId: ministryForm.categoryId || null,
      thumbnailUrl: ministryForm.thumbnailUrl.trim() || null,
      description: descriptionCombined || null,
      establishedDate: ministryForm.establishedDate.trim() || null,
      abolishedDate: ministryForm.abolishedDate.trim() || null,
    }
    const nextSuccessorId = ministryForm.successorId.trim() || null
    const syncSuccessor = async (
      deptId: string,
      prevTransitions: AdministrationDepartment['successors'] = [],
    ) => {
      const prevPrimary = prevTransitions[0] ?? null
      if (prevPrimary && prevPrimary.department.id !== nextSuccessorId) {
        await administrationDepartmentApi.deleteTransition(
          prevPrimary.transitionId,
        )
      }
      if (
        nextSuccessorId &&
        (!prevPrimary || prevPrimary.department.id !== nextSuccessorId)
      ) {
        await administrationDepartmentApi.addTransition(deptId, {
          successorId: nextSuccessorId,
          kind: 'REORGANIZE',
        })
      }
    }
    if (editingMinistry) {
      administrationDepartmentApi
        .update(editingMinistry.id, payload)
        .then((updated) =>
          syncSuccessor(updated.id, editingMinistry.successors ?? []),
        )
        .then(() => {
          closeMinistryFormModal()
          loadMinistries()
        })
        .catch((err) =>
          notify.error(err instanceof Error ? err.message : '수정에 실패했습니다'),
        )
    } else {
      administrationDepartmentApi
        .create({
          ...payload,
          ...(isHistorical
            ? { historicalCountryId: effectiveCountryId }
            : { countryId: effectiveCountryId }),
        })
        .then((created) => syncSuccessor(created.id, []))
        .then(() => {
          closeMinistryFormModal()
          loadMinistries()
        })
        .catch((err) =>
          notify.error(err instanceof Error ? err.message : '등록에 실패했습니다'),
        )
    }
  }, [
    effectiveCountryId,
    isHistorical,
    ministryForm,
    editingMinistry,
    categoriesList,
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
            notify.error(
              err instanceof Error ? err.message : '삭제에 실패했습니다.',
            )
          })
      }
    },
    [ministriesList, loadMinistries],
  )

  const ministryCategoryDeptCounts = useMemo(
    () => countDepartmentsByCategoryId(ministriesList),
    [ministriesList],
  )

  useEffect(() => {
    if (contentTab === 'ministries') {
      administrationDepartmentApi
        .getCategories()
        .then(setCategoriesList)
        .catch(() => setCategoriesList([]))
    }
  }, [contentTab])

  useEffect(() => {
    if (!categoriesList.length) return
    setMinistryTreeCategoryId((prev) => {
      if (
        prev &&
        categoriesList.some((category) => category.id === prev)
      )
        return prev
      return categoriesList[0].id
    })
  }, [categoriesList])

  useEffect(() => {
    setMinistryBrowseDepartment(null)
  }, [ministryTreeCategoryId])

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
    setMinistryBrowseDepartment(null)
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
    loadMinistries,
    openMinistryEdit,
    openMinistryCreateChild,
    openMinistryCreateRootInCategory,
    closeMinistryFormModal,
    submitMinistryForm,
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
  }
}
