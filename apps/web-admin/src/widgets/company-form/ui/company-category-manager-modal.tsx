/**
 * 기업 카테고리 관리 모달 — 옛 `/company-categories` 목록·폼 두 페이지를 대신한다.
 *
 * - 좌: 계층 트리(상위→하위 들여쓰기·기업 수) + 검색 + '새 카테고리'
 * - 우: 고른 카테고리의 편집 폼(이름·슬러그·상위·설명) + 저장·삭제
 *
 * 페이지를 오가던 시절엔 하나 고칠 때마다 목록→폼→목록으로 세 번 이동했고, 기업 목록의
 * 검색어·필터·스크롤이 날아갔다. 모달이면 닫은 뒤에도 기업 목록이 그대로 남는다.
 *
 * 목록 데이터는 기업 상세 '분류' 모듈과 같은 쿼리 키(['company-categories','all'])라 캐시를 공유한다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiCornerDownRight, FiPlus, FiSearch, FiTag, FiTrash2, FiX } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import {
  type CompanyCategory,
  companyCategoryApi,
} from '@/shared/api/company-category'
import { confirm } from '@/shared/ui/confirm-dialog'
import { Modal } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

const CATEGORIES_QUERY_KEY = ['company-categories', 'all'] as const

type FormState = { name: string; slug: string; description: string; parentId: string }

const EMPTY_FORM: FormState = { name: '', slug: '', description: '', parentId: '' }

const toForm = (category: CompanyCategory): FormState => ({
  name: category.name,
  slug: category.slug ?? '',
  description: category.description ?? '',
  parentId: category.parentId ?? '',
})

/** 편집 대상 — null=아무것도 안 고름, 'new'=새 카테고리, 그 외=수정할 id */
type Selection = null | 'new' | string

type TreeRow = { category: CompanyCategory; depth: number }

/**
 * 평면 목록 → 깊이 우선 트리 순서. 부모가 목록에 없으면(삭제·권한) 최상위로 취급한다.
 * 순환 데이터가 들어와도 무한 재귀하지 않게 방문 집합으로 막는다.
 */
const buildTree = (categories: CompanyCategory[]): TreeRow[] => {
  const ids = new Set(categories.map((category) => category.id))
  const children = new Map<string | null, CompanyCategory[]>()
  for (const category of categories) {
    const parentKey = category.parentId && ids.has(category.parentId) ? category.parentId : null
    const siblings = children.get(parentKey) ?? []
    siblings.push(category)
    children.set(parentKey, siblings)
  }
  for (const siblings of children.values())
    siblings.sort((left, right) => left.name.localeCompare(right.name, 'ko'))

  const rows: TreeRow[] = []
  const visited = new Set<string>()
  const walk = (parentKey: string | null, depth: number) => {
    for (const category of children.get(parentKey) ?? []) {
      if (visited.has(category.id)) continue
      visited.add(category.id)
      rows.push({ category, depth })
      walk(category.id, depth + 1)
    }
  }
  walk(null, 0)
  return rows
}

/** 자기 자신 + 모든 하위 — 상위 카테고리 선택지에서 빼야 순환이 안 생긴다 */
const selfAndDescendants = (categories: CompanyCategory[], rootId: string): Set<string> => {
  const result = new Set([rootId])
  let grew = true
  while (grew) {
    grew = false
    for (const category of categories) {
      if (category.parentId && result.has(category.parentId) && !result.has(category.id)) {
        result.add(category.id)
        grew = true
      }
    }
  }
  return result
}

/** '산업 › 제조 › 반도체' — 검색 결과처럼 트리 맥락이 끊긴 자리에서 위치를 알려 준다 */
const pathLabel = (categories: CompanyCategory[], category: CompanyCategory): string | null => {
  const byId = new Map(categories.map((item) => [item.id, item]))
  const names: string[] = []
  const seen = new Set<string>()
  let cursor = category.parentId ? byId.get(category.parentId) : undefined
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id)
    names.unshift(cursor.name)
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
  }
  return names.length ? names.join(' › ') : null
}

export interface CompanyCategoryManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CompanyCategoryManagerModal: React.FC<CompanyCategoryManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient()
  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => companyCategoryApi.getAll(),
    staleTime: 60_000,
    enabled: isOpen,
  })

  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState<Selection>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  /** 폼 기준선 — 고른 순간의 값. 이것과 다르면 미저장 변경 */
  const baselineRef = useRef<FormState>(EMPTY_FORM)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const isDirty =
    selection !== null && JSON.stringify(form) !== JSON.stringify(baselineRef.current)

  // 닫혔다 다시 열리면 처음 상태로
  useEffect(() => {
    if (isOpen) return
    setQuery('')
    setSelection(null)
    setForm(EMPTY_FORM)
    baselineRef.current = EMPTY_FORM
  }, [isOpen])

  const selected =
    selection && selection !== 'new'
      ? (categories.find((category) => category.id === selection) ?? null)
      : null

  const tree = useMemo(() => buildTree(categories), [categories])

  const needle = query.trim().toLowerCase()
  /** 검색 중엔 트리를 풀고 매칭만 평면으로 — 들여쓰기 대신 경로를 보여 준다 */
  const visibleRows: TreeRow[] = needle
    ? tree
        .filter(
          ({ category }) =>
            category.name.toLowerCase().includes(needle) ||
            (category.slug?.toLowerCase().includes(needle) ?? false),
        )
        .map(({ category }) => ({ category, depth: 0 }))
    : tree

  const parentOptions = useMemo(() => {
    const excluded =
      selection && selection !== 'new' ? selfAndDescendants(categories, selection) : new Set()
    return tree.filter(({ category }) => !excluded.has(category.id))
  }, [tree, categories, selection])

  /** 미저장 변경이 있으면 버릴지 묻는다 — 다른 항목 고르기·새로 만들기·닫기 공통 관문 */
  const confirmDiscard = async () =>
    !isDirty ||
    confirm({
      title: '저장하지 않은 변경',
      message: '편집 중인 내용이 저장되지 않았습니다. 버리고 계속할까요?',
      confirmLabel: '버리기',
      danger: true,
    })

  const select = async (next: Selection) => {
    if (next === selection) return
    let nextForm = EMPTY_FORM
    if (next && next !== 'new') {
      const target = categories.find((category) => category.id === next)
      if (!target) return
      nextForm = toForm(target)
    }
    if (!(await confirmDiscard())) return
    baselineRef.current = nextForm
    setForm(nextForm)
    setSelection(next)
    if (next === 'new') requestAnimationFrame(() => nameInputRef.current?.focus())
  }

  const handleClose = async () => {
    if (!(await confirmDiscard())) return
    onClose()
  }

  const invalidate = (alsoCompanies = false) => {
    void queryClient.invalidateQueries({ queryKey: ['company-categories'] })
    // 삭제는 기업에 걸린 분류 연결도 끊는다 — 기업 상세 캐시도 다시 받게
    if (alsoCompanies) void queryClient.invalidateQueries({ queryKey: ['companies'] })
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      notify.error('카테고리 이름을 입력해 주세요.')
      nameInputRef.current?.focus()
      return
    }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || null,
      description: form.description.trim() || null,
      parentId: form.parentId || null,
    }
    try {
      const saved =
        selection && selection !== 'new'
          ? await companyCategoryApi.update(selection, payload)
          : await companyCategoryApi.create(payload)
      const savedForm = { ...form, name: payload.name, slug: payload.slug ?? '' }
      baselineRef.current = savedForm
      setForm(savedForm)
      // 새로 만들었으면 그 항목을 계속 편집 중인 상태로
      if (saved?.id) setSelection(saved.id)
      invalidate()
      notify.success(selection === 'new' ? '카테고리를 추가했습니다.' : '저장했습니다.')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected || deleting) return
    const notes = [
      selected.childrenCount > 0
        ? `하위 ${selected.childrenCount}개 카테고리는 최상위로 올라갑니다.`
        : null,
      selected.companyCount > 0
        ? `연결된 기업 ${selected.companyCount}곳의 분류 연결이 해제됩니다.`
        : null,
    ].filter(Boolean)
    if (
      !(await confirm({
        title: '카테고리 삭제',
        message: [`'${selected.name}'을(를) 삭제합니다.`, ...notes].join(' '),
        confirmLabel: '삭제',
        danger: true,
      }))
    )
      return
    setDeleting(true)
    try {
      await companyCategoryApi.delete(selected.id)
      baselineRef.current = EMPTY_FORM
      setForm(EMPTY_FORM)
      setSelection(null)
      invalidate(true)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  const totalCompanies = categories.reduce((sum, category) => sum + category.companyCount, 0)

  const renderList = () => {
    if (isLoading) return <PaneNote>불러오는 중…</PaneNote>
    if (isError)
      return (
        <PaneNote>
          카테고리를 불러오지 못했습니다.
          <TextBtn type="button" onClick={() => void refetch()}>
            다시 시도
          </TextBtn>
        </PaneNote>
      )
    if (visibleRows.length === 0)
      return (
        <PaneNote>{needle ? '검색 결과가 없습니다.' : '아직 카테고리가 없습니다.'}</PaneNote>
      )
    return (
      <TreeList role="listbox" aria-label="카테고리">
        {visibleRows.map(({ category, depth }) => {
          const active = selection === category.id
          const path = needle ? pathLabel(categories, category) : null
          return (
            <li key={category.id}>
              <TreeItem
                type="button"
                role="option"
                aria-selected={active}
                $active={active}
                $depth={depth}
                onClick={() => void select(category.id)}
              >
                {depth > 0 && <FiCornerDownRight size={12} className="branch" aria-hidden />}
                <TreeText>
                  <TreeName>{category.name}</TreeName>
                  {path && <TreePath>{path}</TreePath>}
                </TreeText>
                <CountBadge
                  $muted={category.companyCount === 0}
                  title={`연결된 기업 ${category.companyCount}곳`}
                >
                  {category.companyCount}
                </CountBadge>
              </TreeItem>
            </li>
          )
        })}
      </TreeList>
    )
  }

  const renderEditor = () => {
    if (selection === null) {
      return (
        <EditorEmpty>
          <EmptyIcon aria-hidden>
            <FiTag size={20} />
          </EmptyIcon>
          <strong>카테고리를 고르세요</strong>
          <span>왼쪽 목록에서 고르면 여기서 고칠 수 있습니다.</span>
          <SecondaryBtn type="button" onClick={() => void select('new')}>
            <FiPlus size={14} />새 카테고리
          </SecondaryBtn>
        </EditorEmpty>
      )
    }
    const isNew = selection === 'new'
    return (
      <EditorForm onSubmit={handleSave} noValidate>
        <EditorHead>
          <EditorKicker>{isNew ? '새 카테고리' : '카테고리 편집'}</EditorKicker>
          {selected && (
            <EditorFacts>
              <span>
                기업 <strong>{selected.companyCount}</strong>곳
              </span>
              <span>
                하위 <strong>{selected.childrenCount}</strong>개
              </span>
            </EditorFacts>
          )}
        </EditorHead>

        <Field>
          <FieldLabel htmlFor="company-category-name">
            이름 <Required aria-hidden>*</Required>
          </FieldLabel>
          <Input
            id="company-category-name"
            ref={nameInputRef}
            value={form.name}
            maxLength={100}
            placeholder="예: 반도체"
            aria-required
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </Field>

        <FieldPair>
          <Field>
            <FieldLabel htmlFor="company-category-parent">상위 카테고리</FieldLabel>
            <Select
              id="company-category-parent"
              value={form.parentId}
              onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))}
            >
              <option value="">없음 (최상위)</option>
              {parentOptions.map(({ category, depth }) => (
                <option key={category.id} value={category.id}>
                  {`${'　'.repeat(depth)}${category.name}`}
                </option>
              ))}
            </Select>
            {!isNew && <Hint>자기 자신과 그 하위는 고를 수 없습니다.</Hint>}
          </Field>
          <Field>
            <FieldLabel htmlFor="company-category-slug">슬러그</FieldLabel>
            <Input
              id="company-category-slug"
              value={form.slug}
              maxLength={80}
              placeholder="예: semiconductor"
              spellCheck={false}
              $mono
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
            <Hint>외부 참조용 고유 코드 — 전체에서 겹치면 안 됩니다.</Hint>
          </Field>
        </FieldPair>

        <Field>
          <FieldLabel htmlFor="company-category-description">설명</FieldLabel>
          <Textarea
            id="company-category-description"
            value={form.description}
            rows={4}
            placeholder="어떤 기업을 이 분류에 넣는지 한두 줄로"
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </Field>

        <EditorActions>
          {selected && (
            <DangerBtn type="button" onClick={() => void handleDelete()} disabled={deleting}>
              <FiTrash2 size={14} />
              {deleting ? '삭제 중…' : '삭제'}
            </DangerBtn>
          )}
          <Spacer />
          {isDirty && <DirtyNote>저장하지 않은 변경</DirtyNote>}
          <SecondaryBtn
            type="button"
            disabled={!isDirty || saving}
            onClick={() => setForm(baselineRef.current)}
          >
            되돌리기
          </SecondaryBtn>
          <PrimaryBtn type="submit" disabled={saving || (!isNew && !isDirty)}>
            {saving ? '저장 중…' : isNew ? '추가' : '저장'}
          </PrimaryBtn>
        </EditorActions>
      </EditorForm>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => void handleClose()}
      title="기업 카테고리"
      subtitle={
        isLoading
          ? '기업 분류 체계 — 상위 카테고리로 계층을 만듭니다.'
          : `${categories.length}개 · 연결 ${totalCompanies}건 — 상위 카테고리로 계층을 만듭니다.`
      }
      size="wide"
      maxHeight="min(720px, 90vh)"
    >
      <Panes>
        <ListPane>
          <ListTools>
            <SearchWrap>
              <FiSearch size={14} className="lead" aria-hidden />
              <SearchInput
                type="search"
                placeholder="이름·슬러그 검색"
                aria-label="카테고리 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  // 모달 Esc보다 먼저 — 검색어부터 지운다
                  if (event.key === 'Escape' && query) {
                    event.stopPropagation()
                    setQuery('')
                  }
                }}
              />
              {query && (
                <ClearBtn type="button" aria-label="검색어 지우기" onClick={() => setQuery('')}>
                  <FiX size={12} />
                </ClearBtn>
              )}
            </SearchWrap>
            <AddBtn
              type="button"
              $active={selection === 'new'}
              onClick={() => void select('new')}
              aria-label="새 카테고리"
              title="새 카테고리"
            >
              <FiPlus size={16} />
            </AddBtn>
          </ListTools>
          <ListScroll>{renderList()}</ListScroll>
        </ListPane>
        <EditorPane>{renderEditor()}</EditorPane>
      </Panes>
    </Modal>
  )
}

// ───────────────────────── Styled ─────────────────────────
// 기업 목록(companies-list.page)과 같은 토큰: 브랜드 #2563eb · 메타 #6b7280/#a1a1aa · 컨트롤 34px

const BRAND = '#2563eb'
const metaText = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? '#a1a1aa' : '#6b7280'
const hairline = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)'
const fieldSurface = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'
const focusRing = css`
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${BRAND};
  }
`

/* 두 칸 — 좁으면(≤720) 위아래로 쌓는다.
   높이를 고정한다 — 내용 따라 늘면 항목을 고를 때마다 모달이 위아래로 덜컹거렸다(빈 상태 ↔ 폼) */
const Panes = styled.div`
  height: min(560px, calc(90vh - 92px));
  min-height: 0;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(160px, 40%) minmax(0, 1fr);
  }
`

const ListPane = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid ${hairline};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafbfc'};

  @media (max-width: 720px) {
    border-right: none;
    border-bottom: 1px solid ${hairline};
  }
`

const ListTools = styled.div`
  display: flex;
  gap: 6px;
  padding: 12px;
  border-bottom: 1px solid ${hairline};
`

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;

  svg.lead {
    position: absolute;
    left: 10px;
    color: ${metaText};
    pointer-events: none;
  }
`

const controlBase = css`
  box-sizing: border-box;
  width: 100%;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${fieldSurface};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  transition:
    border-color 0.15s,
    box-shadow 0.15s;

  &::placeholder {
    color: ${metaText};
  }
  &:focus {
    outline: none;
    border-color: ${BRAND};
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
`

const SearchInput = styled.input`
  ${controlBase}
  height: 34px;
  padding: 0 28px 0 30px;

  &::-webkit-search-cancel-button {
    display: none;
  }
`

const ClearBtn = styled.button`
  position: absolute;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ${focusRing}
`

const AddBtn = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid ${BRAND};
  background: ${({ $active }) => ($active ? '#1d4ed8' : BRAND)};
  color: #fff;
  cursor: pointer;

  &:hover {
    background: #1d4ed8;
  }
  ${focusRing}
`

const ListScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px;
`

const TreeList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const TreeItem = styled.button<{ $active: boolean; $depth: number }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  /* 깊이마다 16px — 가지 아이콘(12)+간격이 부모 글자 시작선 아래로 오게 */
  padding: 6px 8px 6px ${({ $depth }) => 10 + Math.max($depth - 1, 0) * 16 + ($depth > 0 ? 8 : 0)}px;
  border: none;
  border-radius: 8px;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
  ${focusRing}

  .branch {
    flex-shrink: 0;
    color: ${metaText};
    opacity: 0.7;
  }

  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.mode === 'dark' ? 'rgba(37, 99, 235, 0.22)' : '#eff6ff'};
          box-shadow: inset 2px 0 0 ${BRAND};
        `
      : css`
          background: transparent;
          &:hover {
            background: ${theme.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(15, 23, 42, 0.04)'};
          }
        `}
`

const TreeText = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const TreeName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TreePath = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: ${metaText};
`

const CountBadge = styled.span<{ $muted: boolean }>`
  flex-shrink: 0;
  min-width: 22px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: ${({ $muted, theme }) => ($muted ? metaText({ theme }) : theme.colors.text.secondary)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)'};
  opacity: ${({ $muted }) => ($muted ? 0.6 : 1)};
`

const PaneNote = styled.p`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 32px 12px;
  text-align: center;
  font-size: 13px;
  color: ${metaText};
`

const TextBtn = styled.button`
  border: none;
  background: none;
  padding: 2px 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${BRAND};
  cursor: pointer;
  ${focusRing}
`

const EditorPane = styled.div`
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`

const EditorEmpty = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 48px 24px;
  text-align: center;
  font-size: 13px;
  color: ${metaText};

  strong {
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  button {
    margin-top: 10px;
  }
`

const EmptyIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 6px;
  border-radius: 12px;
  color: ${BRAND};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(37, 99, 235, 0.18)' : '#eff6ff')};
`

const EditorForm = styled.form`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
`

const EditorHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const EditorKicker = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: ${metaText};
`

const EditorFacts = styled.span`
  display: inline-flex;
  gap: 12px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FieldPair = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Required = styled.span`
  color: ${({ theme }) => theme.colors.error};
`

const Input = styled.input<{ $mono?: boolean }>`
  ${controlBase}
  height: 36px;
  padding: 0 11px;
  ${({ $mono }) =>
    $mono &&
    css`
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12.5px;
    `}
`

const Select = styled.select`
  ${controlBase}
  height: 36px;
  padding: 0 8px;

  option {
    background: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Textarea = styled.textarea`
  ${controlBase}
  min-height: 96px;
  padding: 9px 11px;
  line-height: 1.55;
  resize: vertical;
`

const Hint = styled.span`
  font-size: 11.5px;
  line-height: 1.4;
  color: ${metaText};
`

const EditorActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid ${hairline};
`

const Spacer = styled.span`
  flex: 1;
`

const DirtyNote = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
`

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
  ${focusRing}

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const PrimaryBtn = styled.button`
  ${buttonBase}
  border: 1px solid ${BRAND};
  background: ${BRAND};
  color: #fff;

  &:hover:not(:disabled) {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }
`

const SecondaryBtn = styled.button`
  ${buttonBase}
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const DangerBtn = styled.button`
  ${buttonBase}
  padding: 0 10px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.error};

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.12)' : 'rgba(239, 68, 68, 0.06)'};
  }
`
