import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import { FiLayers, FiPlus, FiEdit2, FiTrash2, FiAward, FiChevronRight } from 'react-icons/fi'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import type { AdministrationDepartmentCategory } from '@/shared/api/administration-department'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { useThemeStore } from '@/shared/styles/theme.store'
import { PositionDefinitionsSection } from '@/widgets/country/country-detail/ui/position-definitions-section.widget'

export const DepartmentCategoriesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const [selectedCategory, setSelectedCategory] = useState<AdministrationDepartmentCategory | null>(null)
  const [editingCategory, setEditingCategory] = useState<AdministrationDepartmentCategory | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryForm, setCategoryForm] = useState({ name: '', nameEn: '' })
  const [categoryFormError, setCategoryFormError] = useState('')

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-dept-categories'],
    queryFn: () => administrationDepartmentApi.getCategories(),
  })

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['admin-dept-categories'] })

  const openCreate = () => {
    setEditingCategory(null)
    setCategoryForm({ name: '', nameEn: '' })
    setCategoryFormError('')
    setShowCategoryForm(true)
  }

  const openEdit = (cat: AdministrationDepartmentCategory) => {
    setEditingCategory(cat)
    setCategoryForm({ name: cat.name, nameEn: cat.nameEn ?? '' })
    setCategoryFormError('')
    setShowCategoryForm(true)
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryForm.name.trim()) {
      setCategoryFormError('카테고리명을 입력해주세요.')
      return
    }
    const payload = { name: categoryForm.name.trim(), nameEn: categoryForm.nameEn.trim() || null }
    try {
      if (editingCategory) {
        await administrationDepartmentApi.updateCategory(editingCategory.id, payload)
        notify.success('카테고리가 수정되었습니다.')
        if (selectedCategory?.id === editingCategory.id) {
          setSelectedCategory({ ...editingCategory, ...payload })
        }
      } else {
        await administrationDepartmentApi.createCategory(payload)
        notify.success('카테고리가 등록되었습니다.')
      }
      refetch()
      setShowCategoryForm(false)
    } catch (err: any) {
      notify.error(err?.message || '저장에 실패했습니다.')
    }
  }

  const handleDeleteCategory = async (cat: AdministrationDepartmentCategory) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `"${cat.name}" 카테고리를 삭제하시겠습니까?`,
        danger: true,
      }))
    )
      return
    try {
      await administrationDepartmentApi.deleteCategory(cat.id)
      notify.success('삭제되었습니다.')
      if (selectedCategory?.id === cat.id) setSelectedCategory(null)
      refetch()
    } catch (err: any) {
      notify.error(err?.message || '삭제에 실패했습니다.')
    }
  }

  return (
    <PageWrapper>
      <PageContainer>
        <PageHeader>
          <HeaderLeft>
            <HeaderIcon><FiLayers size={28} /></HeaderIcon>
            <HeaderText>
              <h1>중앙부처 카테고리</h1>
              <p>외교, 국방 등 부처 카테고리별 직위 정의를 관리합니다</p>
            </HeaderText>
          </HeaderLeft>
        </PageHeader>

        <SplitLayout>
          {/* 좌측: 카테고리 목록 */}
          <LeftPanel>
            <ListHeader>
              <ListTitle>카테고리 목록</ListTitle>
              <AddBtn type="button" onClick={openCreate}>
                <FiPlus size={14} /> 카테고리 추가
              </AddBtn>
            </ListHeader>

            {showCategoryForm && (
              <CategoryForm onSubmit={handleSaveCategory}>
                <CategoryInput
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="카테고리명 (예: 외교)"
                  autoFocus
                />
                <CategoryInput
                  value={categoryForm.nameEn}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, nameEn: e.target.value }))}
                  placeholder="영문명 (예: Foreign Affairs)"
                />
                {categoryFormError && <ErrorMsg>{categoryFormError}</ErrorMsg>}
                <FormBtns>
                  <SaveBtn type="submit">{editingCategory ? '수정' : '추가'}</SaveBtn>
                  <CancelBtn type="button" onClick={() => setShowCategoryForm(false)}>취소</CancelBtn>
                </FormBtns>
              </CategoryForm>
            )}

            {isLoading ? (
              <Empty>불러오는 중...</Empty>
            ) : categories.length === 0 ? (
              <Empty>등록된 카테고리가 없습니다.</Empty>
            ) : (
              <CategoryList>
                {categories.map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    $selected={selectedCategory?.id === cat.id}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <CategoryItemMain>
                      <FiLayers size={16} />
                      <div>
                        <div>{cat.name}</div>
                        {cat.nameEn && <SubText>{cat.nameEn}</SubText>}
                      </div>
                    </CategoryItemMain>
                    <ItemActions>
                      <IconBtn
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEdit(cat) }}
                        title="수정"
                      >
                        <FiEdit2 size={14} />
                      </IconBtn>
                      <IconBtn
                        $danger
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat) }}
                        title="삭제"
                      >
                        <FiTrash2 size={14} />
                      </IconBtn>
                      <FiChevronRight size={14} style={{ color: '#c7d2fe', marginLeft: 4 }} />
                    </ItemActions>
                  </CategoryItem>
                ))}
              </CategoryList>
            )}
          </LeftPanel>

          {/* 우측: 선택된 카테고리의 직위 정의 */}
          <RightPanel>
            {selectedCategory ? (
              <PositionDefinitionsSection
                fixedCategoryId={selectedCategory.id}
                fixedCategoryName={selectedCategory.name}
              />
            ) : (
              <EmptyRight>
                <FiAward size={48} style={{ color: isDark ? '#2a2a2a' : '#e2e8f0' }} />
                <p>좌측에서 카테고리를 선택하면<br />해당 카테고리의 직위 정의를 관리할 수 있습니다.</p>
              </EmptyRight>
            )}
          </RightPanel>
        </SplitLayout>
      </PageContainer>
    </PageWrapper>
  )
}

const PageWrapper = styled.div`
  padding: 24px;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1d1d1d' : '#f8fafc')};
  min-height: calc(100vh - var(--header-height, 60px));
`

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

const HeaderIcon = styled.div`
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 16px;
  color: #fff;
  box-shadow: 0 8px 16px rgba(99, 102, 241, 0.25);
`

const HeaderText = styled.div`
  h1 { margin: 0; font-size: 28px; font-weight: 700; color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#0f172a')}; }
  p { margin: 4px 0 0; font-size: 14px; color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#64748b')}; }
`

const SplitLayout = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const LeftPanel = styled.div`
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : '#fff')};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(20, 19, 34, 0.08)')};
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  overflow: hidden;
`

const ListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1.5px solid rgba(99, 102, 241, 0.1);
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : 'linear-gradient(135deg, #fafbfc, #f8fafc)')};
`

const ListTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#0f172a')};
`

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#eef2ff')};
  border: 1px solid #c7d2fe;
  border-radius: 10px;
  cursor: pointer;
  &:hover { background: #e0e7ff; border-color: #a5b4fc; }
`

const CategoryForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f3f4f6')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1d1d1d' : '#f8fafc')};
`

const CategoryInput = styled.input`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  &:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
`

const ErrorMsg = styled.p`
  margin: 0;
  font-size: 12px;
  color: #dc2626;
`

const FormBtns = styled.div`
  display: flex;
  gap: 8px;
`

const SaveBtn = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 10px;
  cursor: pointer;
`

const CancelBtn = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#64748b')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : '#fff')};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};
  border-radius: 10px;
  cursor: pointer;
`

const CategoryList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const CategoryItem = styled.li<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px;
  border-radius: 12px;
  cursor: pointer;
  background: ${(p) => p.$selected ? 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))' : 'transparent'};
  border: 1.5px solid ${(p) => p.$selected ? 'rgba(99,102,241,0.4)' : 'transparent'};
  transition: all 0.15s;
  &:hover {
    background: ${(p) => p.$selected ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.1))' : 'rgba(99,102,241,0.04)'};
    border-color: ${(p) => p.$selected ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.15)'};
  }
`

const CategoryItemMain = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#0f172a')};
  font-size: 14px;
  font-weight: 600;
  svg { color: #6366f1; flex-shrink: 0; }
`

const SubText = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#64748b')};
  margin-top: 2px;
`

const ItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`

const IconBtn = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#94a3b8')};
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: ${(p) => p.$danger ? '#fee2e2' : (p.theme.mode === 'dark' ? '#2a2a2a' : '#f1f5f9')};
    color: ${(p) => p.$danger ? '#dc2626' : (p.theme.mode === 'dark' ? '#f5f5f5' : '#0f172a')};
  }
`

const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#94a3b8')};
`

const RightPanel = styled.div`
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : '#fff')};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(20, 19, 34, 0.08)')};
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  padding: 28px;
`

const EmptyRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 20px;
  text-align: center;
  p {
    margin: 0;
    font-size: 15px;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#94a3b8')};
    line-height: 1.6;
  }
`
