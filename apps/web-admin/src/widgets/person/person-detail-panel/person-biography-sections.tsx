/**
 * 인물 전기(생애 서술) — 다중 섹션 에디터.
 *
 * 사건 상세(detail-narrative)의 섹션 배열 패턴을 인물에 미러링.
 * 저장은 사건과 동일하게 sections 배열을 통째로 PUT → 서버에서 delete-and-recreate.
 * 읽기 모드는 공용 RichTextProseWithEntityClicks로 엔티티 클릭·용어/가문 정의 툴팁까지 지원.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  FiArrowDown,
  FiArrowUp,
  FiEdit2,
  FiPlus,
  FiSettings,
  FiTrash2,
} from 'react-icons/fi'
import styled from 'styled-components'

import { personKeys } from '@/entities/person/api'
import type {
  RichTextDynastyTooltipState,
  RichTextTermTooltipState,
} from '@/shared/hooks/use-rich-text-prose-click'
import { createRichTextImageUploader } from '@/shared/api/upload'
import { updatePerson } from '@/shared/api/persons'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextProseWithEntityClicks } from '@/shared/ui/rich-text-read-view'

export type BiographySectionData = {
  id?: string
  title: string
  content: string
  order?: number
  sectionType?: string | null
}

type Row = { key: string; title: string; content: string }

let keySeq = 0
const nextKey = () => `bio-sec-${keySeq++}`

function toRows(
  sections: BiographySectionData[] | undefined,
  legacyBiography: string | null | undefined,
): Row[] {
  const list = (sections ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (list.length > 0) {
    return list.map((s) => ({
      key: nextKey(),
      title: s.title ?? '',
      content: s.content ?? '',
    }))
  }
  // 섹션이 없고 레거시 단일 전기가 있으면 첫 섹션으로 시드(저장 시 섹션으로 이관).
  if (legacyBiography && legacyBiography.trim()) {
    return [{ key: nextKey(), title: '생애', content: legacyBiography }]
  }
  return []
}

type Props = {
  personId: string
  sections: BiographySectionData[] | undefined
  /** 섹션이 비었을 때 시드로 쓸 레거시 단일 전기(person.biography) */
  legacyBiography?: string | null
  /** 읽기 본문 인물 멘션 클릭 (패널 모달 스택 등) */
  onPersonClick: (personId: string) => void
  /** 읽기 본문 용어(.term) 클릭 → 정의 툴팁 (패널 포털과 공유) */
  setTermTooltip?: React.Dispatch<
    React.SetStateAction<RichTextTermTooltipState | null>
  >
  /** 읽기 본문 가문 엔티티 클릭 → 정의 툴팁 (패널 포털과 공유) */
  setDynastyTooltip?: React.Dispatch<
    React.SetStateAction<RichTextDynastyTooltipState | null>
  >
}

export function PersonBiographySections({
  personId,
  sections,
  legacyBiography,
  onPersonClick,
  setTermTooltip,
  setDynastyTooltip,
}: Props) {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<Row[]>(() =>
    toRows(sections, legacyBiography),
  )
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [manageMode, setManageMode] = useState(false)
  const [saving, setSaving] = useState(false)
  /** 편집 진입 시점의 제목/본문 — Esc 취소 시 dirty 판단·복원용 */
  const editInitialRef = useRef<{ title: string; content: string }>({
    title: '',
    content: '',
  })

  const persist = useCallback(
    async (next: Row[]) => {
      setSaving(true)
      try {
        const cleaned = next
          .filter((r) => r.title.trim() || r.content.trim())
          .map((r, idx) => ({
            title: r.title.trim() || '(제목 없음)',
            content: r.content,
            order: idx,
          }))
        await updatePerson(personId, { sections: cleaned })
        await queryClient.invalidateQueries({
          queryKey: personKeys.detailFull(personId),
        })
        toast.success('전기가 저장되었습니다.')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '전기 저장에 실패했습니다.',
        )
      } finally {
        setSaving(false)
      }
    },
    [personId, queryClient],
  )

  const updateField = useCallback(
    (key: string, patch: Partial<Row>) => {
      setRows((arr) => arr.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    },
    [],
  )

  const addSection = useCallback(() => {
    const row = { key: nextKey(), title: '', content: '' }
    editInitialRef.current = { title: '', content: '' }
    setRows((arr) => [...arr, row])
    setEditingKey(row.key)
  }, [])

  const beginEdit = useCallback(
    (key: string) => {
      const row = rows.find((r) => r.key === key)
      editInitialRef.current = {
        title: row?.title ?? '',
        content: row?.content ?? '',
      }
      setEditingKey(key)
    },
    [rows],
  )

  /** 편집 취소 — 초기값으로 복원하고, 빈 섹션(새로 추가했다 비운 것)은 제거 */
  const cancelEdit = useCallback(() => {
    const key = editingKey
    if (key == null) return
    setRows((arr) =>
      arr
        .map((r) =>
          r.key === key
            ? {
                ...r,
                title: editInitialRef.current.title,
                content: editInitialRef.current.content,
              }
            : r,
        )
        .filter((r) => r.key !== key || r.title.trim() || r.content.trim()),
    )
    setEditingKey(null)
  }, [editingKey])

  const removeSection = useCallback(
    (key: string) => {
      setRows((arr) => {
        const next = arr.filter((r) => r.key !== key)
        void persist(next)
        return next
      })
      if (editingKey === key) setEditingKey(null)
    },
    [persist, editingKey],
  )

  const moveSection = useCallback(
    (key: string, dir: -1 | 1) => {
      setRows((arr) => {
        const idx = arr.findIndex((r) => r.key === key)
        const target = idx + dir
        if (idx < 0 || target < 0 || target >= arr.length) return arr
        const next = arr.slice()
        const [item] = next.splice(idx, 1)
        next.splice(target, 0, item)
        void persist(next)
        return next
      })
    },
    [persist],
  )

  const saveSection = useCallback(
    (_key: string) => {
      setEditingKey(null)
      void persist(rows)
    },
    [persist, rows],
  )

  /**
   * 섹션 편집 중 키보드 단축키 — 사건 본문 인라인 에디터(InlineRichText)와 동일 UX.
   *  - ⌘/Ctrl+Enter: 저장
   *  - Esc: 취소(미저장 변경이 있으면 확인 후 폐기·복원)
   */
  useEffect(() => {
    if (editingKey == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (!saving) saveSection(editingKey)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        const row = rows.find((r) => r.key === editingKey)
        const dirty = row
          ? row.title !== editInitialRef.current.title ||
            row.content !== editInitialRef.current.content
          : false
        if (dirty && !window.confirm('저장하지 않은 변경을 버릴까요?')) return
        cancelEdit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingKey, rows, saving, saveSection, cancelEdit])

  if (rows.length === 0) {
    return (
      <EmptyAddButton type="button" onClick={addSection}>
        <FiPlus size={15} />첫 전기 섹션 작성
      </EmptyAddButton>
    )
  }

  return (
    <Wrap>
      <Toolbar>
        <ManageToggle
          type="button"
          $active={manageMode}
          onClick={() => setManageMode((v) => !v)}
        >
          <FiSettings size={13} />
          {manageMode ? '관리 끝' : '관리'}
        </ManageToggle>
      </Toolbar>

      {rows.map((row, idx) => {
        const isEditing = editingKey === row.key
        return (
          <SectionItem key={row.key}>
            <SectionHead>
              <SectionIndex>{idx + 1}</SectionIndex>
              {isEditing ? (
                <SectionTitleInput
                  value={row.title}
                  placeholder="섹션 제목 (예: 생애, 업적, 평가)"
                  onChange={(e) => updateField(row.key, { title: e.target.value })}
                  autoFocus
                />
              ) : (
                <SectionTitle>{row.title || '(제목 없음)'}</SectionTitle>
              )}
              <HeadActions>
                {manageMode && (
                  <>
                    <IconBtn
                      type="button"
                      title="위로"
                      disabled={idx === 0 || saving}
                      onClick={() => moveSection(row.key, -1)}
                    >
                      <FiArrowUp size={14} />
                    </IconBtn>
                    <IconBtn
                      type="button"
                      title="아래로"
                      disabled={idx === rows.length - 1 || saving}
                      onClick={() => moveSection(row.key, 1)}
                    >
                      <FiArrowDown size={14} />
                    </IconBtn>
                    <IconBtn
                      type="button"
                      title="삭제"
                      $danger
                      disabled={saving}
                      onClick={() => removeSection(row.key)}
                    >
                      <FiTrash2 size={14} />
                    </IconBtn>
                  </>
                )}
                {!manageMode && !isEditing && (
                  <IconBtn
                    type="button"
                    title="편집"
                    onClick={() => beginEdit(row.key)}
                  >
                    <FiEdit2 size={14} />
                  </IconBtn>
                )}
              </HeadActions>
            </SectionHead>

            <SectionBody>
              {isEditing ? (
                <>
                  <RichTextEditor
                    value={row.content}
                    onChange={(v) => updateField(row.key, { content: v })}
                    showTitle={false}
                    placeholder="본문을 입력하세요. 서식·이미지·인물 멘션을 넣을 수 있습니다."
                    onImageUpload={createRichTextImageUploader('persons')}
                  />
                  <EditHint>⌘/Ctrl + Enter 저장 · Esc 취소</EditHint>
                  <EditActions>
                    <GhostBtn
                      type="button"
                      disabled={saving}
                      onClick={cancelEdit}
                    >
                      취소
                    </GhostBtn>
                    <PrimaryBtn
                      type="button"
                      disabled={saving}
                      onClick={() => saveSection(row.key)}
                    >
                      {saving ? '저장 중…' : '저장'}
                    </PrimaryBtn>
                  </EditActions>
                </>
              ) : row.content && isLikelyRichTextHtml(row.content) ? (
                <RichTextProseWithEntityClicks
                  html={row.content}
                  samePersonId={personId}
                  onPersonClick={onPersonClick}
                  setTermTooltip={setTermTooltip}
                  setDynastyTooltip={setDynastyTooltip}
                />
              ) : row.content ? (
                <PlainText>{row.content}</PlainText>
              ) : (
                <EmptyHint>본문이 없습니다. 편집을 눌러 작성하세요.</EmptyHint>
              )}
            </SectionBody>
          </SectionItem>
        )
      })}

      <AddButton type="button" onClick={addSection} disabled={saving}>
        <FiPlus size={14} />섹션 추가
      </AddButton>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
`

const ManageToggle = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 7px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? '#4f46e5' : theme.colors.border.default};
  color: ${({ theme, $active }) =>
    $active ? '#4f46e5' : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? 'rgba(79,70,229,0.08)' : theme.colors.background.primary};
  cursor: pointer;
`

const SectionItem = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.colors.background.primary};
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const SectionIndex = styled.span`
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 6px;
`

const SectionTitle = styled.h4`
  flex: 1 1 auto;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SectionTitleInput = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 7px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
    border-color: #4f46e5;
  }
`

const HeadActions = styled.div`
  flex: 0 0 auto;
  display: inline-flex;
  gap: 4px;
`

const IconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme, $danger }) =>
    $danger ? '#dc2626' : theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.12s;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.background.secondary};
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`

const SectionBody = styled.div`
  font-size: 14px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EditHint = styled.div`
  margin: 6px 2px 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EditActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
`

const GhostBtn = styled.button`
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

const PrimaryBtn = styled.button`
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
  border: none;
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

const PlainText = styled.div`
  white-space: pre-wrap;
  word-break: break-word;
`

const EmptyHint = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: flex-start;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: #4f46e5;
    color: #4f46e5;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

const EmptyAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    border-color: #4f46e5;
    color: #4f46e5;
  }
`
