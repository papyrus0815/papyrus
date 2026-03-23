import { useCallback, useEffect, useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { toast } from 'react-hot-toast'
import { FiGrid, FiX } from 'react-icons/fi'
import { ThemeProvider, useTheme } from 'styled-components'

import type { AdministrationDepartmentCategory } from '@/shared/api/administration-department'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { invalidateAdministrationDepartmentQueries } from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'

import {
  CategoryBtnRow,
  CategoryDeleteBtn,
  CategoryEditBtn,
  CategoryEmptyMessage,
  CategoryFormBlock,
  CategoryFormLabel,
  CategoryInput,
  CategoryItemActions,
  CategoryList,
  CategoryListItem,
  CategoryListItemLabel,
  CategoryListSectionTitle,
  CategoryModalBody,
  CategoryModalBox,
  CategoryModalCloseBtn,
  CategoryModalDesc,
  CategoryModalHeader,
  CategoryModalOverlay,
  CategoryModalTitle,
  CategoryPrimaryBtn,
  CategorySecondaryBtn,
  CategorySectionTitle,
} from './government-category-modal.styles'

export interface GovernmentCategoryModalProps {
  open: boolean
  onClose: () => void
}

export function GovernmentCategoryModal({
  open,
  onClose,
}: GovernmentCategoryModalProps) {
  const queryClient = useQueryClient()
  const parentTheme = useTheme()
  const isDark = useThemeStore((state) => state.mode === 'dark')
  const cabinetsPalette = useMemo(
    () => getCabinetsSectionPalette(isDark),
    [isDark],
  )
  const categoryModalTheme = useMemo(
    () => ({ ...parentTheme, gov: cabinetsPalette }),
    [parentTheme, cabinetsPalette],
  )

  const [categoryModalList, setCategoryModalList] = useState<
    AdministrationDepartmentCategory[]
  >([])
  const [categoryForm, setCategoryForm] = useState({ name: '', nameEn: '' })
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  )
  const [categoryFormSaving, setCategoryFormSaving] = useState(false)

  const loadCategoryModalList = useCallback(() => {
    administrationDepartmentApi
      .getCategories()
      .then((list) => {
        setCategoryModalList(list)
      })
      .catch(() => setCategoryModalList([]))
  }, [])

  useEffect(() => {
    if (open) loadCategoryModalList()
  }, [open, loadCategoryModalList])

  useEffect(() => {
    if (!open) {
      setEditingCategoryId(null)
      setCategoryForm({ name: '', nameEn: '' })
    }
  }, [open])

  const closeAndReset = () => {
    onClose()
    setEditingCategoryId(null)
    setCategoryForm({ name: '', nameEn: '' })
  }

  const saveCategoryForm = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('카테고리명을 입력해주세요.')
      return
    }
    setCategoryFormSaving(true)
    try {
      if (editingCategoryId) {
        await administrationDepartmentApi.updateCategory(editingCategoryId, {
          name: categoryForm.name.trim(),
          nameEn: categoryForm.nameEn.trim() || null,
        })
        toast.success('카테고리가 수정되었습니다.')
      } else {
        await administrationDepartmentApi.createCategory({
          name: categoryForm.name.trim(),
          nameEn: categoryForm.nameEn.trim() || null,
        })
        toast.success('카테고리가 추가되었습니다.')
      }
      await loadCategoryModalList()
      await invalidateAdministrationDepartmentQueries(queryClient)
      setEditingCategoryId(null)
      setCategoryForm({ name: '', nameEn: '' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setCategoryFormSaving(false)
    }
  }

  const deleteCategoryById = async (id: string) => {
    if (
      !confirm(
        '이 카테고리를 삭제하시겠습니까? 해당 카테고리를 쓰는 부처는 카테고리가 해제됩니다.',
      )
    )
      return
    try {
      await administrationDepartmentApi.deleteCategory(id)
      toast.success('카테고리가 삭제되었습니다.')
      await loadCategoryModalList()
      await invalidateAdministrationDepartmentQueries(queryClient)
      if (editingCategoryId === id) {
        setEditingCategoryId(null)
        setCategoryForm({ name: '', nameEn: '' })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    }
  }

  if (!open) return null

  return (
    <ThemeProvider theme={categoryModalTheme}>
      <CategoryModalOverlay
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeAndReset()
        }}
      >
        <CategoryModalBox
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
        >
          <CategoryModalHeader>
            <div>
              <CategoryModalTitle id="category-modal-title">
                <FiGrid size={24} strokeWidth={2} />
                부처 카테고리
              </CategoryModalTitle>
              <CategoryModalDesc>국방·외교 등 공통 분류 관리</CategoryModalDesc>
            </div>
            <CategoryModalCloseBtn
              type="button"
              onClick={closeAndReset}
              aria-label="닫기"
            >
              <FiX size={22} strokeWidth={2} />
            </CategoryModalCloseBtn>
          </CategoryModalHeader>

          <CategoryModalBody>
            <CategoryFormBlock>
              <CategorySectionTitle>추가 / 수정</CategorySectionTitle>
              <CategoryFormLabel htmlFor="category-form-name">
                카테고리명
              </CategoryFormLabel>
              <CategoryInput
                id="category-form-name"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="예: 국방"
              />
              <CategoryFormLabel htmlFor="category-form-nameEn">
                영문명 (선택)
              </CategoryFormLabel>
              <CategoryInput
                id="category-form-nameEn"
                value={categoryForm.nameEn}
                onChange={(event) =>
                  setCategoryForm((prev) => ({
                    ...prev,
                    nameEn: event.target.value,
                  }))
                }
                placeholder="예: Defense"
              />
              <CategoryBtnRow>
                <CategoryPrimaryBtn
                  type="button"
                  onClick={saveCategoryForm}
                  disabled={categoryFormSaving}
                >
                  {categoryFormSaving
                    ? '저장 중…'
                    : editingCategoryId
                      ? '수정'
                      : '추가'}
                </CategoryPrimaryBtn>
                {editingCategoryId && (
                  <CategorySecondaryBtn
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(null)
                      setCategoryForm({ name: '', nameEn: '' })
                    }}
                  >
                    취소
                  </CategorySecondaryBtn>
                )}
              </CategoryBtnRow>
            </CategoryFormBlock>

            <CategoryListSectionTitle>등록된 카테고리</CategoryListSectionTitle>
            <CategoryList>
              {categoryModalList.length === 0 ? (
                <CategoryEmptyMessage>
                  등록된 카테고리가 없습니다.
                </CategoryEmptyMessage>
              ) : (
                categoryModalList.map((cat) => (
                  <CategoryListItem key={cat.id}>
                    <CategoryListItemLabel>
                      {cat.name}
                      {cat.nameEn && <span>({cat.nameEn})</span>}
                    </CategoryListItemLabel>
                    <CategoryItemActions>
                      <CategoryEditBtn
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(cat.id)
                          setCategoryForm({
                            name: cat.name,
                            nameEn: cat.nameEn ?? '',
                          })
                        }}
                      >
                        수정
                      </CategoryEditBtn>
                      <CategoryDeleteBtn
                        type="button"
                        onClick={() => deleteCategoryById(cat.id)}
                      >
                        삭제
                      </CategoryDeleteBtn>
                    </CategoryItemActions>
                  </CategoryListItem>
                ))
              )}
            </CategoryList>
          </CategoryModalBody>
        </CategoryModalBox>
      </CategoryModalOverlay>
    </ThemeProvider>
  )
}
