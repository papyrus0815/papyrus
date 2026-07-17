import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type {
  CompanyCategoryInput,
  CompanyCategoryLink,
  UpdateCompanyInput,
} from '@/shared/api/company'
import { companyCategoryApi } from '@/shared/api/company-category'
import { confirm } from '@/shared/ui/confirm-dialog'
import { Modal } from '@/shared/ui/modal'

import * as S from './company-detail.styles'

interface LinkRow {
  categoryId: string
  categoryName: string
  fromDate: string | null
  toDate: string | null
  note: string | null
}

interface CompanyCategoriesModuleProps {
  categories: CompanyCategoryLink[]
  onPatch: (patch: UpdateCompanyInput) => void
}

/**
 * 업종(CompanyCategory) 연결 — 칩 + 기존 업종 추가 select.
 * v1은 평면 목록(계층 트리·기간은 후속). 서버 delete-and-recreate라 변경 시 전체
 * 배열 PUT. categoryId 중복은 추가 select에서 제외해 방지.
 */
export function CompanyCategoriesModule({
  categories,
  onPatch,
}: CompanyCategoriesModuleProps) {
  const [links, setLinks] = useState<LinkRow[]>(() => toLinks(categories))
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    setLinks(toLinks(categories))
  }, [categories])

  const { data: allCategories } = useQuery({
    queryKey: ['company-categories', 'all'],
    queryFn: () => companyCategoryApi.getAll(),
    staleTime: 60_000,
  })

  const linkedIds = useMemo(
    () => new Set(links.map((link) => link.categoryId)),
    [links],
  )
  const addable = useMemo(
    () => (allCategories ?? []).filter((cat) => !linkedIds.has(cat.id)),
    [allCategories, linkedIds],
  )

  const commit = (next: LinkRow[]) => {
    setLinks(next)
    const payload: CompanyCategoryInput[] = next.map((link) => ({
      categoryId: link.categoryId,
      fromDate: link.fromDate,
      toDate: link.toDate,
      note: link.note,
    }))
    onPatch({ categories: payload })
  }

  const addCategory = (categoryId: string) => {
    if (!categoryId || linkedIds.has(categoryId)) return
    const found = (allCategories ?? []).find((cat) => cat.id === categoryId)
    if (!found) return
    commit([
      ...links,
      {
        categoryId,
        categoryName: found.name,
        fromDate: null,
        toDate: null,
        note: null,
      },
    ])
  }

  const removeCategory = async (categoryId: string) => {
    const target = links.find((link) => link.categoryId === categoryId)
    if (
      !(await confirm({
        title: '업종 제거',
        message: target
          ? `'${target.categoryName}' 업종 연결을 제거할까요?`
          : '이 업종 연결을 제거할까요?',
        confirmLabel: '제거',
        danger: true,
      }))
    ) {
      return
    }
    commit(links.filter((link) => link.categoryId !== categoryId))
  }

  return (
    <S.Section id="company-categories">
      <S.SectionHeader>
        <S.SectionTitle>업종</S.SectionTitle>
        {links.length > 0 && (
          <S.SectionSubtitle>{links.length}개</S.SectionSubtitle>
        )}
      </S.SectionHeader>

      <S.ChipRow>
        {links.map((link) => (
          <S.CategoryChip key={link.categoryId}>
            {link.categoryName}
            <S.ChipRemove
              type="button"
              onClick={() => void removeCategory(link.categoryId)}
              aria-label={`${link.categoryName} 업종 제거`}
            >
              <FiX />
            </S.ChipRemove>
          </S.CategoryChip>
        ))}

        {addable.length > 0 && (
          <AddChipBtn type="button" onClick={() => setPickerOpen(true)}>
            <FiPlus /> 업종 추가
          </AddChipBtn>
        )}
      </S.ChipRow>

      <Modal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="업종 추가"
        size="narrow"
      >
        <PickList role="listbox" aria-label="업종 선택">
          {addable.map((cat) => (
            <PickRow
              key={cat.id}
              type="button"
              onClick={() => {
                addCategory(cat.id)
                setPickerOpen(false)
              }}
            >
              {cat.parent ? `${cat.parent.name} › ${cat.name}` : cat.name}
            </PickRow>
          ))}
          {addable.length === 0 && (
            <PickEmpty>추가할 업종이 없습니다.</PickEmpty>
          )}
        </PickList>
      </Modal>

      {links.length === 0 && addable.length === 0 && (
        <S.EmptyState>등록된 업종 분류가 없습니다.</S.EmptyState>
      )}
    </S.Section>
  )
}

function toLinks(categories: CompanyCategoryLink[]): LinkRow[] {
  return (categories ?? []).map((cat) => ({
    categoryId: cat.categoryId,
    categoryName: cat.categoryName,
    fromDate: cat.fromDate,
    toDate: cat.toDate,
    note: cat.note,
  }))
}

/** 칩 행의 '＋ 업종 추가' — native select 대신 모달 피커를 여는 칩형 버튼. */
const AddChipBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.12s,
    color 0.12s;

  svg {
    width: 13px;
    height: 13px;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const PickList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  max-height: min(60vh, 420px);
  overflow-y: auto;
`

const PickRow = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 11px 14px;
  border: none;
  border-radius: 10px;
  font: inherit;
  font-size: 0.9375rem;
  text-align: left;
  cursor: pointer;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: background 0.12s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`

const PickEmpty = styled.p`
  margin: 0;
  padding: 18px 14px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 0.875rem;
`
