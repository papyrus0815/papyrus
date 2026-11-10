/**
 * 인물 등록 뷰 모달 — 사건 등록 모달(EventRegisterModal)과 동일한 RegisterModal 셸·2단 분할·스티키 푸터 사용.
 * 페이지 임베드(person-edit.page)는 PersonRegisterView 직접 사용.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiColumns } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { invalidatePersonCaches } from '@/entities/person/api'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  PersonRegisterView,
  type PersonRegisterFormState,
  type PersonRegisterViewHandle,
} from '@/shared/ui/person-register-modal/person-register-view'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'

const CREATE_LEAVE_MESSAGE =
  '작성 중인 내용은 임시 저장되어 다음에 이어 쓸 수 있습니다. 창을 닫으시겠습니까?'
const EDIT_LEAVE_MESSAGE = '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?'
const RESET_CONFIRM_MESSAGE =
  '작성 중인 내용을 모두 지우고 처음 상태로 되돌리시겠습니까?'

const FORM_SECTION_LINKS = [
  { id: 'person-form-group-basic', label: '기본 정보' },
  { id: 'person-form-group-life', label: '생애' },
  { id: 'person-form-group-affiliation', label: '소속' },
  { id: 'person-form-group-family', label: '가족' },
] as const

const LAYOUT_STORAGE_KEY = 'papyrus:person-register-layout'

function readInitialLayoutMode(): 'split' | 'single' {
  if (typeof window === 'undefined') return 'split'
  try {
    const saved = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    return saved === 'single' ? 'single' : 'split'
  } catch {
    return 'split'
  }
}

export interface PersonRegisterViewModalProps {
  isOpen: boolean
  onClose: () => void
  initialCountryId?: string | null
  onSuccess?: (personId: string) => void
  /**
   * 등록 완료 다이얼로그 "상세 보기"의 **이동 목적지**만 오버라이드.
   * 캐시 무효화·onSuccess·모달 닫기(정산)는 언제나 래퍼가 먼저 수행하므로 여기서는
   * 이동만 하면 된다 — 지면 고유의 상세 경로가 있는 호출부용.
   * 기본은 `/persons-timeline/:id`. `false`를 주면 "상세 보기" 액션 자체를 감춘다(2지 분기 유지).
   */
  onViewDetail?: ((personId: string) => void) | false
  /** 수정할 인물 ID (없으면 신규 등록) */
  editPersonId?: string | null
  /** 모달 제목 (기본: 인물 등록 / 인물 수정) */
  title?: string
  /** 수정 모드 시 헤더 서브타이틀 (편집 중인 인물 이름) */
  editPersonName?: string
}

export function PersonRegisterViewModal({
  isOpen,
  onClose,
  initialCountryId,
  onSuccess,
  onViewDetail,
  editPersonId,
  title,
  editPersonName,
}: PersonRegisterViewModalProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const formHandleRef = useRef<PersonRegisterViewHandle | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const isEdit = Boolean(editPersonId)

  const [formState, setFormState] = useState<PersonRegisterFormState>({
    isEditMode: isEdit,
    isLoading: false,
    isSubmitting: false,
    isValid: false,
  })
  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty

  const markDirty = useCallback((next: boolean) => {
    isDirtyRef.current = next
    setIsDirty(next)
  }, [])

  const [activeSectionId, setActiveSectionId] = useState<string>(
    FORM_SECTION_LINKS[0].id,
  )
  const [layoutMode, setLayoutMode] = useState<'split' | 'single'>(
    readInitialLayoutMode,
  )

  const toggleLayoutMode = useCallback(() => {
    setLayoutMode((prev) => {
      const next = prev === 'split' ? 'single' : 'split'
      try {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, next)
      } catch {
        // storage disabled
      }
      return next
    })
  }, [])

  // 모달 닫힐 때 상태 리셋
  useEffect(() => {
    if (!isOpen) {
      markDirty(false)
      setActiveSectionId(FORM_SECTION_LINKS[0].id)
    }
  }, [isOpen, markDirty])

  const {
    isLoading,
    isSubmitting,
    isValid,
    firstError,
    firstErrorTarget,
    missingCount,
    draftSavedAt,
    lifeFilled,
    affiliationSectionCount,
    familySectionCount,
  } = formState
  const busy = isLoading || isSubmitting

  const scrollToTopAndFocusFirst = useCallback(() => {
    setActiveSectionId(FORM_SECTION_LINKS[0].id)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo?.({ top: 0, behavior: 'smooth' })
      scrollContainerRef.current.scrollTop = 0
    }
    const leftPane = document.getElementById('person-form-split-left')
    if (leftPane) {
      leftPane.scrollTo?.({ top: 0, behavior: 'smooth' })
      leftPane.scrollTop = 0
    }
    const rightPane = document.getElementById('person-form-split-right')
    if (rightPane) {
      rightPane.scrollTo?.({ top: 0, behavior: 'smooth' })
      rightPane.scrollTop = 0
    }
    const nameInput = scrollContainerRef.current?.querySelector<HTMLElement>(
      '[data-jump-target="name"]',
    )
    nameInput?.focus()
  }, [])

  const scrollToSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId)
    const section = document.getElementById(sectionId)
    if (!section) return
    const leftPane = document.getElementById('person-form-split-left')
    const rightPane = document.getElementById('person-form-split-right')
    if (sectionId === 'person-form-group-basic' && leftPane) {
      leftPane.scrollTo?.({ top: 0, behavior: 'smooth' })
      leftPane.scrollTop = 0
      return
    }
    if (sectionId === 'person-form-group-affiliation' && rightPane) {
      rightPane.scrollTo?.({ top: 0, behavior: 'smooth' })
      rightPane.scrollTop = 0
      return
    }
    section.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleFormScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null
      if (target?.id === 'person-form-split-left') {
        const leftRect = target.getBoundingClientRect()
        const lifeEl = document.getElementById('person-form-group-life')
        const nextId =
          lifeEl && lifeEl.getBoundingClientRect().top <= leftRect.top + 96
            ? 'person-form-group-life'
            : 'person-form-group-basic'
        setActiveSectionId((prev) => (prev === nextId ? prev : nextId))
        return
      }
      if (target?.id === 'person-form-split-right') {
        const rightRect = target.getBoundingClientRect()
        const familyEl = document.getElementById('person-form-group-family')
        const nextId =
          familyEl && familyEl.getBoundingClientRect().top <= rightRect.top + 96
            ? 'person-form-group-family'
            : 'person-form-group-affiliation'
        setActiveSectionId((prev) => (prev === nextId ? prev : nextId))
        return
      }
      const container = event.currentTarget
      const containerRect = container.getBoundingClientRect()
      const threshold = containerRect.top + 96
      let currentId: string = FORM_SECTION_LINKS[0].id
      for (const item of FORM_SECTION_LINKS) {
        const el = document.getElementById(item.id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= threshold) {
          currentId = item.id
        }
      }
      setActiveSectionId((prev) => (prev === currentId ? prev : currentId))
    },
    [],
  )

  const handleResetForm = useCallback(async () => {
    if (busy) return
    if (
      isDirtyRef.current &&
      !(await confirm({ title: '초기화 확인', message: RESET_CONFIRM_MESSAGE }))
    ) {
      return
    }
    formHandleRef.current?.reset()
    markDirty(false)
    scrollToTopAndFocusFirst()
  }, [busy, markDirty, scrollToTopAndFocusFirst])

  const focusFirstMissingField = useCallback(() => {
    if (!firstErrorTarget) return
    const container = scrollContainerRef.current ?? document
    const el = container.querySelector<HTMLElement>(
      `[data-jump-target="${firstErrorTarget}"]`,
    )
    if (!el) return
    if (firstErrorTarget === 'gender') {
      const btn =
        el.querySelector<HTMLElement>('button, [tabindex="0"]') ?? el
      btn.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      btn.focus?.()
      return
    }
    el.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    el.focus?.()
  }, [firstErrorTarget])

  /** Esc·오버레이·취소 공통 — dirty면 확인부터 */
  const requestClose = useCallback(async () => {
    if (isSubmitting) return
    const leaveMessage = isEdit ? EDIT_LEAVE_MESSAGE : CREATE_LEAVE_MESSAGE
    if (
      isDirtyRef.current &&
      !(await confirm({ title: '확인', message: leaveMessage }))
    ) {
      return
    }
    markDirty(false)
    onClose()
  }, [isEdit, isSubmitting, markDirty, onClose])

  /**
   * create 직후 — 캐시만 무효화하고 모달은 유지.
   * 여기서 닫으면 폼 안의 "다른 인물 이어서 등록" 다이얼로그가 그려지기 전에 언마운트됨.
   * 닫기는 다이얼로그 응답 후 handleSuccess(닫기 선택) 또는 onClose(취소)로 실행.
   */
  const handleCreated = (personId: string) => {
    invalidatePersonCaches(queryClient, { personId })
  }

  const handleSuccess = (personId?: string) => {
    invalidatePersonCaches(queryClient, { personId })
    markDirty(false)
    onSuccess?.(personId ?? '')
    onClose()
  }

  /**
   * 등록 완료 다이얼로그의 "상세 보기" — 모달을 먼저 닫고(스크롤 락·포커스 복원 정리)
   * 방금 등록한 인물 상세로 이동. 등록 직후 재위·경력 등 나머지 기록을 이어서 채우는 경로.
   */
  const handleViewDetail = (personId: string) => {
    handleSuccess(personId)
    if (typeof onViewDetail === 'function') onViewDetail(personId)
    else navigate(pathKeys.personsTimelineDetail(personId))
  }

  const resolvedTitle = title ?? (isEdit ? '인물 수정' : '인물 등록')

  return (
    <RegisterModal
      isOpen={isOpen}
      onClose={() => {
        void requestClose()
      }}
      title={resolvedTitle}
      headerActions={
        <HeaderActionsBar>
          {isEdit && editPersonName && (
            <HeaderContextBadge title={`편집 대상: ${editPersonName}`}>
              <HeaderContextBadgeText>{editPersonName}</HeaderContextBadgeText>
            </HeaderContextBadge>
          )}
          <SectionJumpNav aria-label="폼 섹션 이동">
            {FORM_SECTION_LINKS.map((item) => {
              const isActive = activeSectionId === item.id
              const badgeText =
                item.id === 'person-form-group-basic'
                  ? isValid && !isLoading
                    ? '✓'
                    : null
                  : item.id === 'person-form-group-life'
                    ? lifeFilled && !isLoading
                      ? '✓'
                      : null
                    : item.id === 'person-form-group-affiliation'
                      ? (affiliationSectionCount ?? 0) > 0
                        ? String(affiliationSectionCount)
                        : null
                      : (familySectionCount ?? 0) > 0
                        ? String(familySectionCount)
                        : null
              return (
                <SectionJumpBtn
                  key={item.id}
                  type="button"
                  $active={isActive}
                  aria-label={item.label}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => scrollToSection(item.id)}
                >
                  <span>{item.label}</span>
                  {badgeText && (
                    <SectionJumpBadge
                      $done={badgeText === '✓'}
                      aria-hidden="true"
                      data-section-badge={item.id}
                    >
                      {badgeText}
                    </SectionJumpBadge>
                  )}
                </SectionJumpBtn>
              )
            })}
          </SectionJumpNav>
          <LayoutModeToggleBtn
            type="button"
            $active={layoutMode === 'split'}
            aria-pressed={layoutMode === 'split'}
            aria-label={
              layoutMode === 'split'
                ? '1단 세로 보기로 전환'
                : '2단 좌우 분할 보기로 전환'
            }
            title={
              layoutMode === 'split'
                ? '좌우 2단 분할 보기 중 (클릭 시 1단 세로 보기로 전환)'
                : '1단 세로 보기 중 (클릭 시 좌우 2단 분할 보기로 전환)'
            }
            onClick={toggleLayoutMode}
          >
            <FiColumns size={13} />
            <span>{layoutMode === 'split' ? '2단 분할' : '1단 보기'}</span>
          </LayoutModeToggleBtn>
          {!isEdit && isDirty && !busy && (
            <HeaderResetBtn
              type="button"
              aria-label="작성 내용 초기화"
              title="입력한 내용을 모두 비우고 처음 상태로 되돌립니다"
              onClick={() => {
                void handleResetForm()
              }}
            >
              초기화
            </HeaderResetBtn>
          )}
        </HeaderActionsBar>
      }
      maxWidth={
        layoutMode === 'split' ? 'min(1440px, 96vw)' : 'min(1040px, 96vw)'
      }
      minHeight="90vh"
      height={layoutMode === 'split' ? '90vh' : undefined}
      fullBleedOnMobile
      closeOnEsc={!isSubmitting}
      closeOnOverlayClick={!isSubmitting}
    >
      <PersonModalFormScroll
        ref={scrollContainerRef}
        $layoutMode={layoutMode}
        onScroll={handleFormScroll}
        onScrollCapture={handleFormScroll}
      >
        {isSubmitting && (
          <BusyBar role="status" aria-live="polite">
            {isEdit ? '수정 사항을 저장하는 중...' : '인물을 등록하는 중...'}
          </BusyBar>
        )}
        {isOpen && (
          <PersonRegisterView
            initialCountryId={initialCountryId}
            editPersonId={editPersonId ?? undefined}
            layoutMode={layoutMode}
            formHandleRef={formHandleRef}
            onCancel={() => {
              void requestClose()
            }}
            onSuccess={handleSuccess}
            onCreated={handleCreated}
            onViewDetail={onViewDetail === false ? undefined : handleViewDetail}
            onDirtyChange={markDirty}
            onFormStateChange={setFormState}
          />
        )}
      </PersonModalFormScroll>

      <PersonRegisterModalStickyFooter>
        <FooterHint $warning={!isValid && Boolean(firstError)}>
          {!isEdit && Boolean(draftSavedAt) && (
            <DraftSavedBadge
              role="status"
              aria-label="임시 자동 저장됨"
              title="작성 중인 내용은 이 브라우저에 자동으로 임시 저장됩니다"
            >
              <DraftSavedDot aria-hidden="true" />
              자동 저장됨
            </DraftSavedBadge>
          )}
          {!isValid && firstError ? (
            <FooterJumpButton
              type="button"
              onClick={focusFirstMissingField}
              title="클릭하면 해당 필수 입력 칸으로 이동합니다"
            >
              <span>필수 입력: {firstError}</span>
              {typeof missingCount === 'number' && missingCount > 1 && (
                <FooterMissingCount>외 {missingCount - 1}건</FooterMissingCount>
              )}
              <FooterJumpArrow aria-hidden="true">→</FooterJumpArrow>
            </FooterJumpButton>
          ) : isEdit ? (
            <FooterReadyGroup>
              <span>인물 정보를 수정합니다</span>
              <FooterShortcutItem>
                <FooterKbd>⌘↵</FooterKbd>
                <span>바로 저장</span>
              </FooterShortcutItem>
            </FooterReadyGroup>
          ) : (
            <FooterReadyGroup>
              <FooterReadyBadge>등록 준비 완료</FooterReadyBadge>
              <FooterShortcutItem>
                <FooterKbd>⌘↵</FooterKbd>
                <span>저장</span>
              </FooterShortcutItem>
              <FooterShortcutItem>
                <FooterKbd>⇧⌘↵</FooterKbd>
                <span>등록 후 계속</span>
              </FooterShortcutItem>
            </FooterReadyGroup>
          )}
        </FooterHint>
        <FooterActions>
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={() => {
              void requestClose()
            }}
            disabled={isSubmitting}
          >
            취소
          </PersonRegisterModalCancelBtn>
          {!isEdit && (
            <PersonRegisterModalCancelBtn
              type="button"
              disabled={!isValid || busy}
              title="저장 후 창을 닫지 않고 같은 국적으로 다음 인물을 바로 이어 등록합니다 (단축키: ⌘/Ctrl + Shift + Enter)"
              onClick={() => {
                formHandleRef.current?.submit({ continueAfterSave: true })
              }}
            >
              등록 후 계속
            </PersonRegisterModalCancelBtn>
          )}
          <PersonRegisterModalPrimaryBtn
            type="button"
            onClick={() => {
              formHandleRef.current?.submit({ continueAfterSave: false })
            }}
            disabled={busy}
            title={
              isLoading
                ? '인물 정보를 불러오는 중'
                : isSubmitting
                  ? '저장 중...'
                  : !isValid
                    ? (firstError
                        ? `필수 입력: ${firstError}`
                        : '필수 정보를 입력해야 저장할 수 있습니다')
                    : '단축키: ⌘/Ctrl + Enter'
            }
          >
            {isSubmitting
              ? isEdit
                ? '수정 중...'
                : '등록 중...'
              : isEdit
                ? '수정 완료'
                : '인물 등록'}
          </PersonRegisterModalPrimaryBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>
    </RegisterModal>
  )
}

const HeaderActionsBar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  margin-right: 4px;

  @media (max-width: 768px) {
    display: none;
  }
`

const HeaderContextBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 220px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.3)'
        : 'rgba(99, 102, 241, 0.22)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.14)'
      : 'rgba(99, 102, 241, 0.06)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  font-size: 11.5px;
  font-weight: 600;
`

const HeaderContextBadgeText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SectionJumpNav = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.04)'
      : 'rgba(15, 23, 42, 0.04)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SectionJumpBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.14s ease,
    background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#ffffff'};
    outline: none;
  }
`

const SectionJumpBadge = styled.span<{ $done?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  background: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.2)'
        : 'rgba(16, 185, 129, 0.14)'
      : theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.12)'};
  color: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : theme.colors.primary};
`

const LayoutModeToggleBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.35)'
          : 'rgba(99, 102, 241, 0.28)'
        : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.06)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : theme.colors.primary
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease,
    background-color 0.14s ease;

  @media (max-width: 1180px) {
    display: none;
  }

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }
`

const HeaderResetBtn = styled.button`
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease,
    background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.35)'
        : 'rgba(239, 68, 68, 0.28)'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'};
    outline: none;
  }
`

const PersonModalFormScroll = styled(PersonRegisterModalFormScroll)<{
  $layoutMode: 'split' | 'single'
}>`
  overflow-x: hidden;

  ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? `
    @media (min-width: 1180px) {
      overflow-y: hidden;
      padding: 22px 28px;
    }
  `
      : ''}
`

const BusyBar = styled.div`
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FooterHint = styled.div<{ $warning?: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  font-weight: ${({ $warning }) => ($warning ? 600 : 400)};
  line-height: 1.4;
  color: ${({ $warning, theme }) =>
    $warning ? theme.colors.text.secondary : theme.colors.text.tertiary};

  @media (max-width: 768px) {
    display: none;
  }
`

const DraftSavedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.14)'
      : 'rgba(16, 185, 129, 0.1)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.28)'
        : 'rgba(16, 185, 129, 0.22)'};
`

const DraftSavedDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
`

const FooterJumpButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.32)'
        : 'rgba(99, 102, 241, 0.24)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.14)'
      : 'rgba(99, 102, 241, 0.07)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.13)'};
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }
`

const FooterJumpArrow = styled.span`
  font-size: 11.5px;
  opacity: 0.85;
`

const FooterMissingCount = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.22)'
      : 'rgba(99, 102, 241, 0.12)'};
`

const FooterReadyGroup = styled.span`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`

const FooterReadyBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FooterShortcutItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FooterKbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 19px;
  padding: 0 5px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1;
`

const FooterActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
`
