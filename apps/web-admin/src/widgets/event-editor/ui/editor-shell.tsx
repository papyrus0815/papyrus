/**
 * 에디터 셸 — 헤더 + 좌측 sidebar nav + 우측 본문.
 * Phase 1 에서 비주얼 톤을 검증하기 위한 레이아웃 컨테이너.
 */
import { useCallback, useRef, useState, type ReactNode } from 'react'
import * as S from './styles'
import { SidebarNav } from './sidebar-nav'
import type { EventEditorSectionId, EventEditorSectionDef } from '../model/section-config'
import type { EventEditorFormValues } from '../model/schema'
import type { FieldErrors } from 'react-hook-form'
import {
  PrimaryButton,
  SecondaryButton,
} from '@/widgets/dynasty/ui/dynasty.styles'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  mode: 'create' | 'edit'
  values: EventEditorFormValues
  errors: FieldErrors<EventEditorFormValues>
  sections: EventEditorSectionDef[]
  saveStatus: SaveStatus
  saveStatusLabel?: string
  isSubmitting: boolean
  onCancel: () => void
  onSubmit: () => void
  children: ReactNode
}

const SAVE_STATUS_DEFAULTS: Record<SaveStatus, string> = {
  idle: '미저장',
  saving: '저장 중…',
  saved: '저장됨',
  error: '저장 실패',
}

export function EditorShell({
  mode,
  values,
  errors,
  sections,
  saveStatus,
  saveStatusLabel,
  isSubmitting,
  onCancel,
  onSubmit,
  children,
}: Props) {
  const mainRef = useRef<HTMLElement | null>(null)
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)

  const handleMainRef = useCallback((el: HTMLElement | null) => {
    mainRef.current = el
    setScrollEl(el)
  }, [])

  const handleJump = useCallback((id: EventEditorSectionId) => {
    const target = document.getElementById(`event-section-${id}`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const titleText = mode === 'edit' ? '사건 수정' : '사건 등록'
  const submitText = mode === 'edit' ? '변경사항 저장' : '사건 등록'

  return (
    <S.EditorRoot>
      <S.EditorStickyHeader>
        <S.EditorHeaderInner>
          <S.EditorHeaderLeft>
            <S.EditorBackBtn type="button" onClick={onCancel} aria-label="뒤로">
              ←
            </S.EditorBackBtn>
            <S.EditorTitle>{titleText}</S.EditorTitle>
            {values.title && (
              <S.EditorMeta>· {values.title}</S.EditorMeta>
            )}
          </S.EditorHeaderLeft>
          <S.EditorHeaderRight>
            <S.SaveStatusPill $tone={saveStatus}>
              {saveStatusLabel ?? SAVE_STATUS_DEFAULTS[saveStatus]}
            </S.SaveStatusPill>
            <SecondaryButton type="button" onClick={onCancel} disabled={isSubmitting}>
              취소
            </SecondaryButton>
            <PrimaryButton type="button" onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting ? '저장 중…' : submitText}
            </PrimaryButton>
          </S.EditorHeaderRight>
        </S.EditorHeaderInner>
      </S.EditorStickyHeader>

      <S.EditorBody>
        <S.EditorSidebar>
          <SidebarNav
            sections={sections}
            values={values}
            errors={errors}
            onJump={handleJump}
            scrollRoot={scrollEl}
          />
        </S.EditorSidebar>
        <S.EditorMain ref={handleMainRef}>
          <S.EditorMainInner>{children}</S.EditorMainInner>
        </S.EditorMain>
      </S.EditorBody>
    </S.EditorRoot>
  )
}
