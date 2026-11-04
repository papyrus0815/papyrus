/**
 * 사건 등록 모달 — 목록·대시보드에서 흐름을 끊지 않고 사건을 추가하는 표면.
 *
 * 페이지(`/events/create`) 대신 이걸 쓰는 이유는 "목록을 보면서 입력"이 아니다. 오버레이가
 * 화면 대부분을 가리므로 병행 참조는 못 준다. **사는 것은 복귀 충실도** — 목록의 스크롤·
 * 필터·정렬·접힘·선택이 아무것도 언마운트되지 않고 그대로 남는다. 페이지로 나갔다 오면
 * URL에 없는 UI 상태(접힘·펼침)는 소멸하고, 돌아오는 URL도 필터가 빠진 `/events`였다.
 *
 * 폭: `min(1040px, 96vw)` — 폼 설계폭이 라벨 200 + gap 24 + 필드 680 = 904px이고
 * FormScroll padding이 32×2라 콘텐츠 976px > 904px. 즉 **페이지 대비 가로 손실 0**.
 * 기본 셸 폭(960px)이면 콘텐츠가 896px로 904px에 못 미쳐 라벨/필드가 눌린다.
 *
 * 본문은 `React.lazy` — 이 모달이 목록·대시보드에 정적으로 딸려가면 두 진입 화면의
 * 초기 번들에 폼 청크(gzip 약 19KB)가 상시 얹힌다. 이 앱의 다른 등록 모달은 정적 import가
 * 지배적이지만, 여기서는 "폼을 안 여는 다수"가 비용을 내는 구조라 분리한다.
 *
 * 편집도 `eventId`로 지원하지만 **편집 진입점은 만들지 않는다** — 사건 상세가 이미 같은
 * 필드를 인라인 PATCH하므로 세 번째 편집 표면이 된다(흡수는 별도 배치).
 */
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { eventKeys } from '@/shared/api/event-query-keys'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'

import { EventFormLoading } from './event-form-loading'
import type {
  EventCountryParticipant,
  EventDomainKey,
  EventTypeKey,
} from '@/entities/event/model'
import type { EventRelatedDraft } from '@/features/event-facets/model/register-facets'
import type {
  EventBasicFormHandle,
  EventBasicFormState,
  EventParentPreset,
} from '@/widgets/event-form/ui/event-basic-form'

export type { EventParentPreset } from '@/widgets/event-form/ui/event-basic-form'
export type { EventRelatedDraft } from '@/features/event-facets/model/register-facets'

const LazyEventBasicForm = React.lazy(() =>
  import('@/widgets/event-form/ui/event-basic-form').then((module) => ({
    default: module.EventBasicForm,
  })),
)

const CREATE_LEAVE_MESSAGE =
  '작성 중인 내용은 임시 저장되어 다음에 이어 쓸 수 있습니다. 창을 닫으시겠습니까?'
const EDIT_LEAVE_MESSAGE = '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?'
const RESET_CONFIRM_MESSAGE =
  '작성 중인 내용을 모두 지우고 처음 상태로 되돌리시겠습니까?'

const FORM_SECTION_LINKS = [
  { id: 'event-form-group-basic', label: '기본 정보' },
  { id: 'event-form-group-participants', label: '참여 주체' },
  { id: 'event-form-group-context', label: '맥락·부가' },
] as const

export interface EventRegisterModalProps {
  isOpen: boolean
  /** 닫기 — dirty면 이 컴포넌트가 먼저 확인을 받는다 */
  onClose: () => void
  /** 편집 대상. 없으면 신규 등록. */
  eventId?: string
  /**
   * 저장 성공 통지 — 호출부가 자기 목록을 추가로 손봐야 할 때만.
   * 캐시 무효화는 폼 본체가 이미 했으므로 대개 필요 없다.
   */
  onSaved?: (eventId: string) => void
  /**
   * 미저장 변경 통지 — URL 동기화 호스트가 **뒤로가기**를 가로채려면 필요하다.
   * 뒤로가기는 이 컴포넌트를 거치지 않고 언마운트시키므로 자체 확인이 닿지 않는다.
   */
  onDirtyChange?: (isDirty: boolean) => void
  /**
   * 상위 사건 프리셋 — 전달되면 '상위 사건' 필드가 이 값으로 채워진 채 열린다
   * (사용자가 해제·변경 가능). 상세의 '새 하위 사건 만들기'와 트리 뷰(W3)가
   * `{ id: string; title: string }` 시그니처 그대로 소비한다. 신규 등록 전용.
   */
  initialParent?: EventParentPreset
  /** 목록·조망 등 진입 지면의 분야 필터 프리필(신규 등록 전용) */
  initialDomain?: EventDomainKey | string | null
  /** 목록·조망 등 진입 지면의 세부 분야 필터 프리필(신규 등록 전용) */
  initialEventType?: EventTypeKey | string | null
  /** 목록·조망 등 진입 지면의 참여국 필터 프리필(신규 등록 전용) */
  initialCountries?: EventCountryParticipant[]
  /** 상세 '새 관련 사건 등록' 등 진입 지면의 연관 사건 프리필(신규 등록 전용) */
  initialRelatedEvents?: EventRelatedDraft[]
}

export const EventRegisterModal: React.FC<EventRegisterModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSaved,
  onDirtyChange,
  initialParent,
  initialDomain,
  initialEventType,
  initialCountries,
  initialRelatedEvents,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const formRef = useRef<EventBasicFormHandle | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [formState, setFormState] = useState<EventBasicFormState>({
    isEditMode: Boolean(eventId),
    isLoading: false,
    isSubmitting: false,
    isValid: false,
  })
  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty

  /** 호스트(URL 동기화)에도 dirty를 알린다 — 뒤로가기 가드가 여기에 걸린다 */
  const markDirty = useCallback(
    (next: boolean) => {
      isDirtyRef.current = next
      setIsDirty(next)
      onDirtyChange?.(next)
    },
    [onDirtyChange],
  )
  /** 저장 직후 3지 분기 다이얼로그 대상 */
  const [savedEventId, setSavedEventId] = useState<string | null>(null)
  /** '등록 후 계속' 버튼으로 저장했을 때 확인 다이얼로그 없이 즉시 다음 등록으로 이어간다 */
  const continueAfterSaveRef = useRef(false)

  /**
   * 완료 다이얼로그가 뜨면 상세 페이지 청크를 미리 받는다 — 라우트가 `lazy`라 '상세 보기'
   * 클릭 후에야 받기 시작하면 그동안 목록에 멈춰 있다. 라우트의 import와 같은 모듈이라
   * 두 번 받지 않는다. 그래도 남는 대기는 레이아웃의 RouteProgressBar가 표시한다.
   */
  useEffect(() => {
    if (savedEventId === null) return
    void import('@/pages/events/detail/event-detail.page').catch(() => undefined)
  }, [savedEventId])

  const {
    isEditMode,
    isLoading,
    isSubmitting,
    isValid,
    firstError,
    missingCount,
    draftSavedAt,
  } = formState
  const busy = isLoading || isSubmitting

  const scrollToTopAndFocusTitle = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo?.({ top: 0, behavior: 'smooth' })
      scrollContainerRef.current.scrollTop = 0
    }
    const titleInput = document.getElementById('event-form-title')
    titleInput?.focus()
  }, [])

  const scrollToSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId)
    section?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleResetForm = useCallback(async () => {
    if (busy) return
    if (
      isDirtyRef.current &&
      !(await confirm({ title: '초기화 확인', message: RESET_CONFIRM_MESSAGE }))
    ) {
      return
    }
    formRef.current?.reset()
    markDirty(false)
    scrollToTopAndFocusTitle()
  }, [busy, markDirty, scrollToTopAndFocusTitle])

  /** 모달 안 어디서든 Cmd/Ctrl + Enter로 즉시 저장, Cmd/Ctrl + Shift + Enter로 등록 후 계속 */
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        if (!isValid || busy || savedEventId !== null) return
        event.preventDefault()
        continueAfterSaveRef.current = Boolean(event.shiftKey && !isEditMode)
        void formRef.current?.submit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isValid, busy, savedEventId, isEditMode])

  const focusFirstMissingField = useCallback(() => {
    if (!firstError) return
    if (firstError.includes('사건명')) {
      const el = document.getElementById('event-form-title')
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      el?.focus()
      return
    }
    if (firstError.includes('분야')) {
      const grid = document.getElementById('event-form-category-grid')
      const btn = grid?.querySelector<HTMLElement>('[tabindex="0"], button')
      btn?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      btn?.focus()
      return
    }
    const dateCol = document.getElementById('event-form-start-date')
    const input = dateCol?.querySelector<HTMLElement>('input')
    input?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    input?.focus()
  }, [firstError])

  /** Esc·오버레이·취소 공통 — dirty면 확인부터 */
  const requestClose = useCallback(async () => {
    if (isSubmitting) return
    const leaveMessage = isEditMode ? EDIT_LEAVE_MESSAGE : CREATE_LEAVE_MESSAGE
    if (
      isDirtyRef.current &&
      !(await confirm({ title: '확인', message: leaveMessage }))
    ) {
      return
    }
    markDirty(false)
    onClose()
  }, [isEditMode, isSubmitting, markDirty, onClose])

  /**
   * 뒤에 살아 있는 목록을 지금 되살린다.
   *
   * 폼 본체는 저장 시 `refetchType: 'none'`으로 **표시만** 한다 — 그 시점엔 사용자가
   * 상세로 갈지 목록에 남을지 아직 모르는데, 상세로 가면 목록은 언마운트되므로 그
   * 재조회가 통째로 낭비이기 때문이다. 목록에 남기로 한 분기에서만 여기서 받는다.
   * 마운트된 쿼리가 없으면(대시보드에서 연 경우) no-op.
   */
  const refetchMountedLists = useCallback(() => {
    void queryClient.refetchQueries({ queryKey: eventKeys.lists(), type: 'active' })
    void queryClient.refetchQueries({ queryKey: eventKeys.count(), type: 'active' })
  }, [queryClient])

  const handleSaved = useCallback(
    (id: string) => {
      markDirty(false)
      onSaved?.(id)
      if (continueAfterSaveRef.current) {
        continueAfterSaveRef.current = false
        formRef.current?.reset({ keepCategory: true, keepRelatedCountries: true })
        scrollToTopAndFocusTitle()
        refetchMountedLists()
        return
      }
      setSavedEventId(id)
    },
    [markDirty, onSaved, refetchMountedLists, scrollToTopAndFocusTitle],
  )

  /** 상세 보기 — 폼 본체가 캐시 시딩·프리페치를 끝낸 뒤라 무로딩 진입 */
  const handleViewDetail = useCallback(() => {
    const targetId = savedEventId
    setSavedEventId(null)
    onClose()
    if (targetId) {
      navigate(pathKeys.events.detail(targetId), { viewTransition: true })
    }
  }, [navigate, onClose, savedEventId])

  /** 계속 등록 — 연속 입력은 대개 같은 카테고리·같은 국가 묶음이라 그 둘은 남긴다 */
  const handleRegisterAnother = useCallback(() => {
    setSavedEventId(null)
    formRef.current?.reset({ keepCategory: true, keepRelatedCountries: true })
    scrollToTopAndFocusTitle()
    refetchMountedLists()
  }, [refetchMountedLists, scrollToTopAndFocusTitle])

  const handleCloseAfterSave = useCallback(() => {
    setSavedEventId(null)
    onClose()
    refetchMountedLists()
  }, [onClose, refetchMountedLists])

  return (
    <>
      <RegisterModal
        isOpen={isOpen}
        onClose={() => {
          void requestClose()
        }}
        title={isEditMode ? '사건 수정' : '사건 등록'}
        headerActions={
          <HeaderActionsBar>
            <SectionJumpNav aria-label="폼 섹션 이동">
              {FORM_SECTION_LINKS.map((item) => (
                <SectionJumpBtn
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                >
                  {item.label}
                </SectionJumpBtn>
              ))}
            </SectionJumpNav>
            {!isEditMode && isDirty && !busy && (
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
        maxWidth="min(1040px, 96vw)"
        minHeight="min(680px, 86vh)"
        height="min(840px, 88vh)"
        fullBleedOnMobile
        // 저장 중에는 Esc·오버레이로 닫히지 않게 — 요청이 날아간 뒤 UI만 사라지는 상태 방지
        closeOnEsc={!isSubmitting}
        closeOnOverlayClick={!isSubmitting}
      >
        <PersonRegisterModalFormScroll ref={scrollContainerRef}>
          {isSubmitting && (
            <BusyBar role="status" aria-live="polite">
              {isEditMode ? '수정 사항을 저장하는 중...' : '사건을 등록하는 중...'}
            </BusyBar>
          )}
          {/* 수정 모드에서 사건을 불러오는 동안 — 빈 폼 위의 안내 띠 대신 도는 로딩.
              폼은 마운트해 둔 채(불러오기·하이드레이션이 돌아야 한다) 가려 둔다. */}
          {isLoading && <EventFormLoading label="사건 정보를 불러오는 중" />}
          <Suspense fallback={<EventFormLoading />}>
            {isOpen && (
              <FormReveal hidden={isLoading}>
                <LazyEventBasicForm
                  eventId={eventId}
                  initialParent={initialParent}
                  initialDomain={initialDomain}
                  initialEventType={initialEventType}
                  initialCountries={initialCountries}
                  initialRelatedEvents={initialRelatedEvents}
                  formRef={formRef}
                  onDirtyChange={markDirty}
                  onStateChange={setFormState}
                  onSaved={handleSaved}
                  // 모달은 열 때마다 마운트라 로드 토스트가 매번 뜬다 — 제목으로 대체
                  notifyOnLoad={false}
                />
              </FormReveal>
            )}
          </Suspense>
        </PersonRegisterModalFormScroll>

        <PersonRegisterModalStickyFooter>
          <FooterHint $warning={!isValid && Boolean(firstError)}>
            {!isEditMode && Boolean(draftSavedAt) && (
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
            ) : isEditMode ? (
              <FooterReadyGroup>
                <span>기본 정보만 수정합니다</span>
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
            {!isEditMode && (
              <PersonRegisterModalCancelBtn
                type="button"
                disabled={!isValid || busy}
                title="저장 후 창을 닫지 않고 같은 분야·참여국으로 다음 사건을 바로 이어 등록합니다 (단축키: ⌘/Ctrl + Shift + Enter)"
                onClick={() => {
                  continueAfterSaveRef.current = true
                  void formRef.current?.submit()
                }}
              >
                등록 후 계속
              </PersonRegisterModalCancelBtn>
            )}
            <PersonRegisterModalPrimaryBtn
              type="button"
              onClick={() => {
                continueAfterSaveRef.current = false
                void formRef.current?.submit()
              }}
              disabled={!isValid || busy}
              title={
                isLoading
                  ? '사건 정보를 불러오는 중'
                  : isSubmitting
                    ? '저장 중...'
                    : !isValid
                      ? (firstError ?? '기본 정보를 입력해야 저장할 수 있습니다')
                      : '단축키: ⌘/Ctrl + Enter'
              }
            >
              {isSubmitting
                ? isEditMode
                  ? '수정 중...'
                  : '등록 중...'
                : isEditMode
                  ? '수정 완료'
                  : '사건 등록'}
            </PersonRegisterModalPrimaryBtn>
          </FooterActions>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>

      {/*
       * 등록 완료 3지 분기. 초기 포커스는 ConfirmDialog 규약대로 '닫기' —
       * 주 액션 '상세 보기'는 화면 이탈이라, 반사적 Enter로 연속 등록 흐름이 끊기지 않게 한다.
       */}
      <ConfirmDialog
        isOpen={savedEventId !== null}
        title={isEditMode ? '사건 수정 완료' : '사건 등록 완료'}
        message={
          isEditMode
            ? '수정했습니다. 상세로 이동해 나머지 기록을 이어서 편집할 수 있습니다.'
            : '등록했습니다. 상세로 이동해 본문·인물·군사 기록을 이어서 채우거나, 사건을 계속 등록할 수 있습니다.'
        }
        confirmLabel="상세 보기"
        altLabel={isEditMode ? undefined : '사건 계속 등록'}
        onAlt={isEditMode ? undefined : handleRegisterAnother}
        cancelLabel="닫기"
        onConfirm={handleViewDetail}
        onCancel={handleCloseAfterSave}
      />
    </>
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

const SectionJumpNav = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SectionJumpBtn = styled.button`
  height: 24px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s ease, background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#ffffff'};
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
  transition: color 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.28)'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'};
    outline: none;
  }
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

/** 로딩이 걷히고 폼이 들어설 때 짧게 페이드인 */
const FormReveal = styled.div`
  @media (prefers-reduced-motion: no-preference) {
    animation: eventFormReveal 0.2s ease;
  }
  @keyframes eventFormReveal {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
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
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#6ee7b7' : '#047857'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.1)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.22)'};
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
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.32)' : 'rgba(99, 102, 241, 0.24)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.14)' : 'rgba(99, 102, 241, 0.07)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.13)'};
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
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.12)'};
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

export default EventRegisterModal
