import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiX } from 'react-icons/fi'

import type {
  CompanyCategoryInput,
  CompanyCategoryLink,
  UpdateCompanyInput,
} from '@/shared/api/company'
import { companyCategoryApi } from '@/shared/api/company-category'
import { confirm } from '@/shared/ui/confirm-dialog'

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
          <S.CategorySelect
            value=""
            onChange={(e) => {
              addCategory(e.target.value)
              e.target.value = ''
            }}
            aria-label="업종 추가"
          >
            <option value="">＋ 업종 추가</option>
            {addable.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.parent ? `${cat.parent.name} › ${cat.name}` : cat.name}
              </option>
            ))}
          </S.CategorySelect>
        )}
      </S.ChipRow>

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
