import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FiPlus, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import type {
  CompanyProductInput,
  CompanyProductItem,
  UpdateCompanyInput,
} from '@/shared/api/company'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'
import { confirm } from '@/shared/ui/confirm-dialog'
import { InlineDate, InlineRichText, InlineText } from '@/shared/ui/inline-edit'

import * as S from './company-detail.styles'

interface ProductRow {
  key: string
  serverId?: string
  name: string
  category: string
  productLine: string
  description: string
  announcedAt: string | null
  releasedAt: string | null
  /* 입력 컨트롤 없는 보존 필드 — 기존 값을 PUT에 그대로 실어 보존. */
  discontinuedAt: string | null
  imageUrl: string | null
}

function makeRow(product: CompanyProductItem, key: string): ProductRow {
  return {
    key,
    serverId: product.id,
    name: product.name ?? '',
    category: product.category ?? '',
    productLine: product.productLine ?? '',
    description: product.description ?? '',
    announcedAt: product.announcedAt,
    releasedAt: product.releasedAt,
    discontinuedAt: product.discontinuedAt,
    imageUrl: product.imageUrl,
  }
}

interface CompanyProductsModuleProps {
  products: CompanyProductItem[]
  onPatch: (patch: UpdateCompanyInput) => void
  onPersonClick?: (personId: string) => void
}

/**
 * 제품 카탈로그 편집 — 제품·기술을 1급 항목으로(예: NVIDIA Blackwell, Hopper).
 * 서버 delete-and-recreate라 변경 시 전체 배열 PUT.
 */
export function CompanyProductsModule({
  products,
  onPatch,
  onPersonClick,
}: CompanyProductsModuleProps) {
  const counterRef = useRef(0)
  const nextKey = useCallback(
    () => `product-${Date.now()}-${++counterRef.current}`,
    [],
  )

  const serverRows = useMemo(
    () =>
      (products ?? [])
        .slice()
        .sort((a, right) => (a.order ?? 0) - (right.order ?? 0)),
    [products],
  )

  const [rows, setRows] = useState<ProductRow[]>(() =>
    serverRows.map((product) => makeRow(product, nextKey())),
  )

  useEffect(() => {
    setRows((prev) => syncRows(prev, serverRows, nextKey))
  }, [serverRows, nextKey])

  const commitRows = (next: ProductRow[]) => {
    setRows(next)
    const cleaned: CompanyProductInput[] = next
      .filter((row) => row.name.trim())
      .map((row, idx) => ({
        name: row.name.trim(),
        category: row.category.trim() || null,
        productLine: row.productLine.trim() || null,
        description: isVisuallyEmptyRichText(row.description)
          ? null
          : row.description,
        announcedAt: row.announcedAt,
        releasedAt: row.releasedAt,
        discontinuedAt: row.discontinuedAt,
        imageUrl: row.imageUrl,
        order: idx,
      }))
    onPatch({ products: cleaned })
  }

  const addRow = () => {
    setRows((arr) => [
      ...arr,
      {
        key: nextKey(),
        name: '',
        category: '',
        productLine: '',
        description: '',
        announcedAt: null,
        releasedAt: null,
        discontinuedAt: null,
        imageUrl: null,
      },
    ])
  }

  const updateRow = (idx: number, patch: Partial<ProductRow>) => {
    commitRows(rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const removeRow = async (idx: number) => {
    const row = rows[idx]
    if (!row) return
    const hasContent =
      !!row.name.trim() ||
      !!row.category.trim() ||
      !!row.productLine.trim() ||
      !isVisuallyEmptyRichText(row.description) ||
      !!row.announcedAt ||
      !!row.releasedAt
    if (
      hasContent &&
      !(await confirm({
        title: '제품 삭제',
        message: '이 제품 항목을 삭제할까요? 되돌릴 수 없습니다.',
        confirmLabel: '삭제',
        danger: true,
      }))
    ) {
      return
    }
    commitRows(rows.filter((entry) => entry.key !== row.key))
  }

  return (
    <S.Section id="company-products">
      <S.SectionHeader>
        <S.SectionTitle>제품</S.SectionTitle>
        {rows.length > 0 && (
          <S.SectionSubtitle>{rows.length}개</S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {rows.length === 0 ? (
        <S.EmptyState>
          제품·기술을 카탈로그로 기록할 수 있습니다 (예: Blackwell B200, Hopper H100).
        </S.EmptyState>
      ) : (
        <CardGrid>
          {rows.map((row, idx) => (
            <ProductCard key={row.key}>
              <S.RowHeader>
                <S.RowTitleHost>
                  <InlineText
                    value={row.name}
                    onSave={(next) => updateRow(idx, { name: next })}
                    placeholder="제품명 (예: Blackwell B200)"
                    label="제품명"
                  />
                </S.RowTitleHost>
                <S.ManageActions>
                  <S.IconBtn
                    type="button"
                    onClick={() => void removeRow(idx)}
                    aria-label="제품 삭제"
                    $danger
                  >
                    <FiTrash2 />
                  </S.IconBtn>
                </S.ManageActions>
              </S.RowHeader>

              <S.RowMetaLine>
                <span>
                  <S.RowFieldLabel>분류</S.RowFieldLabel>
                  <InlineText
                    value={row.category}
                    onSave={(next) => updateRow(idx, { category: next })}
                    placeholder="예: GPU"
                    label="분류"
                  />
                </span>
                <span>
                  <S.RowFieldLabel>제품 라인</S.RowFieldLabel>
                  <InlineText
                    value={row.productLine}
                    onSave={(next) => updateRow(idx, { productLine: next })}
                    placeholder="예: Blackwell 아키텍처"
                    label="제품 라인"
                  />
                </span>
              </S.RowMetaLine>

              <S.RowMetaLine>
                <span>
                  <S.RowFieldLabel>발표</S.RowFieldLabel>
                  <InlineDate
                    value={row.announcedAt}
                    onSave={(next) => updateRow(idx, { announcedAt: next })}
                    emptyLabel="미입력"
                    pickerTitle="발표일 선택"
                    blockBc
                    label="발표일"
                  />
                </span>
                <span>
                  <S.RowFieldLabel>출시</S.RowFieldLabel>
                  <InlineDate
                    value={row.releasedAt}
                    onSave={(next) => updateRow(idx, { releasedAt: next })}
                    emptyLabel="미입력"
                    pickerTitle="출시일 선택"
                    blockBc
                    label="출시일"
                  />
                </span>
              </S.RowMetaLine>

              <S.RowNarrative>
                <S.RowFieldLabel>설명</S.RowFieldLabel>
                <InlineRichText
                  value={row.description}
                  onSave={(next) => updateRow(idx, { description: next })}
                  placeholder="제품 의의·특징 — 인물·사건을 인라인으로 링크할 수 있습니다."
                  onPersonClick={onPersonClick}
                  stickyEditButton={false}
                  label="제품 설명"
                />
              </S.RowNarrative>
            </ProductCard>
          ))}
        </CardGrid>
      )}

      <S.AddButton type="button" onClick={addRow}>
        <FiPlus /> 제품 추가
      </S.AddButton>
    </S.Section>
  )
}

/** server↔로컬 키 보존 동기화(name 기준 매칭). */
function syncRows(
  prev: ProductRow[],
  server: CompanyProductItem[],
  nextKey: () => string,
): ProductRow[] {
  if (prev.length === server.length) {
    return server.map((srv, i) => {
      const p = prev[i]
      const prevIsAhead =
        p.serverId === undefined ||
        (p.serverId !== srv.id &&
          (p.name !== (srv.name ?? '') ||
            p.description !== (srv.description ?? '')))
      if (prevIsAhead) return { ...p, serverId: srv.id }
      return makeRow(srv, p.key)
    })
  }

  const prevUsed = new Array<boolean>(prev.length).fill(false)
  const next: ProductRow[] = []
  for (const srv of server) {
    let matchedIdx = prev.findIndex(
      (p, i) => !prevUsed[i] && p.serverId === srv.id,
    )
    if (matchedIdx < 0) {
      matchedIdx = prev.findIndex(
        (p, i) => !prevUsed[i] && p.name === (srv.name ?? ''),
      )
    }
    if (matchedIdx >= 0) {
      prevUsed[matchedIdx] = true
      next.push(makeRow(srv, prev[matchedIdx].key))
    } else {
      next.push(makeRow(srv, nextKey()))
    }
  }
  for (let i = 0; i < prev.length; i++) {
    if (!prevUsed[i]) next.push(prev[i])
  }
  return next
}

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  align-items: start;
`

/** 제품 카드 — 카탈로그식 그리드. 모듈 카드(GridCell) 안의 채워진 카드. */
const ProductCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`
