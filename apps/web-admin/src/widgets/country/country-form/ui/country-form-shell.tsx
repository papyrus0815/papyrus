/**
 * 공용 국가 모달 Shell — 현대 국가 / 역사적 국가 모달의 외곽(헤더·본문·푸터·인디케이터·인덱스).
 *
 * 디자인 토큰 통일:
 * - 너비 1100px, 높이 90vh
 * - 헤더: 타이틀 + 진척률 칩(필수 항목)
 * - 본문: 좌측 sticky 섹션 인덱스(scroll-spy) + 우측 폼 스크롤
 * - 푸터: 취소 + 제출
 *
 * 폼 자체는 자식으로 전달하며, formId로 푸터 submit 버튼과 연결.
 */
import React, { useEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiCheck, FiEdit2, FiPlus, FiX } from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

export interface RequiredFieldChip {
  /** 라벨 (예: "국가명", "대륙") */
  label: string
  /** 충족 여부 — true면 초록 체크 */
  done: boolean
  /** 클릭 시 점프할 필드의 name 또는 id (input/select의 name 또는 form-section data-jump-target) */
  jumpTarget?: string
}

export interface SectionIndexItem {
  /** 본문 섹션의 id (data-form-section 속성과 일치) */
  id: string
  /** 인덱스 라벨 */
  label: string
}

export interface CountryFormShellProps {
  /** 모달 열림 여부 */
  isOpen: boolean
  /** 닫기 요청 — 가드 통과 후 호출됨 (오버레이 클릭/Esc/취소) */
  onClose: () => void
  /** 모달 타이틀 */
  title: string
  /** 모드 — 타이틀 아이콘과 진척률 바 색에 사용 */
  mode?: 'create' | 'edit'
  /** 헤더 인디케이터 (필수 항목 진척률) */
  requiredFields?: RequiredFieldChip[]
  /** 좌측 sticky 섹션 인덱스 (scroll-spy) */
  sectionIndex?: SectionIndexItem[]
  /** 푸터 submit 버튼이 trigger할 form id */
  formId: string
  /** 제출 중 상태 */
  submitting?: boolean
  /** dirty 상태 — overlay/Esc 닫기 confirm용 */
  isDirty?: boolean
  /** 제출 버튼 라벨 (예: "국가 등록", "수정 완료") */
  submitLabel: string
  /** 폼 검증 통과 여부 — false면 부족 항목 안내, 클릭 시 첫 에러로 점프 (disabled 안 함) */
  isValid?: boolean
  /** 폼 본문 */
  children: React.ReactNode
  /** aria-labelledby용 id (기본: title-id) */
  titleId?: string
}

// ─── 스타일 ────────────────────────────────────────────────────────────────

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.38);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    padding: 0;
  }
`

const ModalBox = styled(motion.div)`
  width: min(1100px, 96vw);
  height: 90vh;
  max-height: 1200px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(20,20,20,0.92)'
      : 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e5e7eb'};
  border-radius: 20px;
  /* 다크모드: 톤다운 그림자 + 1px 화이트 ring으로 깊이감 */
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 24px 60px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
      : '0 24px 56px -8px rgba(15, 23, 42, 0.18), 0 4px 12px -4px rgba(15, 23, 42, 0.08)'};
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 768px) {
    width: 100vw;
    height: 100vh;
    max-height: none;
    border-radius: 0;
    border: none;
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 14px 16px;
  }
`

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.015em;
  display: inline-flex;
  align-items: center;
  gap: 10px;
`

const RequiredChips = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

/** 필수 인디케이터 — 미완료 회색, 완료 초록. 클릭 시 jumpTarget 점프. */
const RequiredChip = styled(motion.button)<{ $done: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 999px;
  background: ${({ $done, theme }) =>
    $done ? theme.colors.alert.success.bg : 'transparent'};
  color: ${({ $done, theme }) =>
    $done ? theme.colors.alert.success.fg : theme.colors.text.secondary};
  border: 1px solid
    ${({ $done, theme }) =>
      $done
        ? theme.colors.alert.success.border
        : theme.colors.border.default};
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ $done, theme }) =>
      $done ? theme.colors.alert.success.fg : theme.colors.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }

  svg {
    flex-shrink: 0;
  }
`

/** 모달 타이틀 좌측 아이콘 박스 (등록=+, 수정=연필) */
const TitleIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.alert.info.bg};
  color: ${({ theme }) => theme.colors.alert.info.fg};
  flex-shrink: 0;
`

/** 헤더 하단 진척률 바 (필수 항목 채움 정도) */
const ProgressTrack = styled.div`
  height: 3px;
  width: 100%;
  background: ${({ theme }) => theme.colors.border.light};
  position: relative;
  overflow: hidden;
`

const ProgressFill = styled(motion.div)<{ $complete: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: ${({ $complete, theme }) =>
    $complete
      ? `linear-gradient(90deg, ${theme.colors.alert.success.fg}, #22c55e)`
      : 'linear-gradient(90deg, #6366f1, #8b5cf6)'};
  border-radius: 0 999px 999px 0;
`

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/** 본문: 좌측 sticky 인덱스 + 우측 스크롤 컨테이너 */
const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 200px 1fr;
  position: relative;

  /* 태블릿: 사이드 인덱스 좁게 (라벨 → 숫자) */
  @media (max-width: 1100px) and (min-width: 769px) {
    grid-template-columns: 56px 1fr;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

/** 제출 중 본문 lock — 입력 막고 spinner */
const SubmittingOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(0,0,0,0.4)'
      : 'rgba(255,255,255,0.55)'};
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: all;
`

const SubmittingBox = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(20,20,20,0.92)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 24px rgba(0,0,0,0.4)'
      : '0 8px 24px rgba(15,23,42,0.12)'};
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`

const InlineSpinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid ${({ theme }) => theme.colors.border.medium};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`

const SideIndex = styled.nav`
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  padding: 24px 8px 24px 16px;
  overflow-y: auto;

  /* 태블릿: 라벨을 숫자로 축약 (1, 2, 3, 4) */
  @media (max-width: 1100px) and (min-width: 769px) {
    padding: 24px 4px;
    [data-section-label] {
      display: none;
    }
    [data-section-num] {
      display: inline-flex !important;
    }
  }

  @media (max-width: 768px) {
    display: none;
  }
`

const SectionNum = styled.span`
  display: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 auto;
`

const SideIndexList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const SideIndexItem = styled.li<{ $active: boolean }>`
  > button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: ${({ $active }) => ($active ? 600 : 500)};
    color: ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.text.secondary};
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.12)'
          : '#eef2ff'
        : 'transparent'};
    border: none;
    border-left: 3px solid
      ${({ $active, theme }) =>
        $active ? theme.colors.primary : 'transparent'};
    border-radius: 0 8px 8px 0;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;

    &:hover {
      background: ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(99,102,241,0.08)'
          : '#f1f5f9'};
    }
  }
`

const FormScroll = styled.div`
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    padding: 16px;
  }
`

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 12px 16px;
  }
`

const SubmitBtn = styled.button<{ $emphasis?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: ${({ $emphasis }) =>
    $emphasis
      ? 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)'
      : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: ${({ $emphasis }) =>
    $emphasis
      ? '0 6px 22px -2px rgba(99, 102, 241, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.3)'
      : '0 4px 14px -2px rgba(99, 102, 241, 0.35)'};
  transition:
    opacity 0.15s,
    transform 0.05s,
    box-shadow 0.15s,
    background 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.95;
    box-shadow: 0 6px 22px -2px rgba(99, 102, 241, 0.5);
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: 0 2px 8px -2px rgba(99, 102, 241, 0.35);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }
`

const FooterStatus = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
`

const FooterButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const FooterHint = styled.span<{ $variant?: 'warning' | 'success' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ $variant, theme }) => {
    if ($variant === 'warning') return theme.colors.alert.warning.fg
    if ($variant === 'success') return theme.colors.alert.success.fg
    return theme.colors.text.tertiary
  }};
`

const CancelBtn = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const Spinner = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`

// ─── 본체 ─────────────────────────────────────────────────────────────────

/** 모달 안에서 포커스 가능한 요소 셀렉터 */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function CountryFormShell({
  isOpen,
  onClose,
  title,
  mode,
  requiredFields = [],
  sectionIndex = [],
  formId,
  submitting = false,
  isDirty = false,
  submitLabel,
  isValid = true,
  children,
  titleId = 'country-form-shell-title',
}: CountryFormShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<string | null>(
    sectionIndex[0]?.id ?? null,
  )

  /** 변경사항 있을 때 닫기 가드 */
  const requestClose = () => {
    if (submitting) return
    if (isDirty) {
      const ok = window.confirm(
        '저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?',
      )
      if (!ok) return
    }
    onClose()
  }

  // Esc 닫기 + Tab focus trap
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        requestClose()
        return
      }
      // Tab focus trap — 모달 안에서만 순환
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute('aria-hidden'))
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, submitting, isDirty])

  // 첫 포커스 — 모달 열릴 때 첫 입력 필드로
  useEffect(() => {
    if (!isOpen) return
    // 다음 tick에 포커스 (DOM mount 후)
    const timer = window.setTimeout(() => {
      const root = scrollRef.current
      if (!root) return
      const firstInput = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
      )
      firstInput?.focus()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  // 검증 실패 후 첫 에러 필드로 자동 스크롤·포커스
  // (외부 폼이 invalid submit 시 [aria-invalid="true"] 표시한다고 가정)
  useEffect(() => {
    if (!isOpen) return
    const root = scrollRef.current
    if (!root) return
    const observer = new MutationObserver(() => {
      const firstError = root.querySelector<HTMLElement>(
        '[aria-invalid="true"]',
      )
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // 스크롤 후 포커스 (input 등 focusable일 때)
        if (typeof firstError.focus === 'function') {
          window.setTimeout(() => firstError.focus(), 200)
        }
      }
    })
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['aria-invalid'],
      subtree: true,
    })
    return () => observer.disconnect()
  }, [isOpen])

  // scroll-spy: 본문 스크롤 위치에 따라 활성 섹션 결정
  useEffect(() => {
    if (!isOpen || sectionIndex.length === 0) return
    const root = scrollRef.current
    if (!root) return

    const updateActive = () => {
      const rootRect = root.getBoundingClientRect()
      const offset = rootRect.top + 80 // 헤더 보정
      let current = sectionIndex[0].id
      for (const item of sectionIndex) {
        const el = root.querySelector<HTMLElement>(
          `[data-form-section="${item.id}"]`,
        )
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= offset) current = item.id
        else break
      }
      setActiveSection(current)
    }

    updateActive()
    root.addEventListener('scroll', updateActive)
    return () => root.removeEventListener('scroll', updateActive)
  }, [isOpen, sectionIndex])

  /** 인덱스 클릭 시 해당 섹션으로 스크롤 + pulse highlight */
  const handleIndexClick = (id: string) => {
    const root = scrollRef.current
    if (!root) return
    const target = root.querySelector<HTMLElement>(
      `[data-form-section="${id}"]`,
    )
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      target.setAttribute('data-anchor-pulse', 'true')
      window.setTimeout(() => {
        target.removeAttribute('data-anchor-pulse')
      }, 700)
    }
  }

  /** 헤더 칩 클릭 → 해당 필드로 점프 + focus + outline pulse */
  const handleChipJump = (jumpTarget: string) => {
    const root = scrollRef.current
    if (!root) return
    // name 또는 id 매칭
    const target = root.querySelector<HTMLElement>(
      `[name="${jumpTarget}"], #${jumpTarget}`,
    )
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      if (typeof target.focus === 'function') target.focus()
    }, 200)
  }

  // 진척률 (0~1)
  const completedCount = requiredFields.filter((f) => f.done).length
  const totalCount = requiredFields.length
  const progress = totalCount > 0 ? completedCount / totalCount : 0
  const isComplete = totalCount > 0 && completedCount === totalCount

  if (!isOpen) return null

  const content = (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          key="country-form-shell"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={requestClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <ModalBox
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 스크린리더용 라이브 리전 — 저장 중/완료 알림 */}
            <span
              role="status"
              aria-live="polite"
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              {submitting ? '저장 중입니다' : ''}
            </span>
            <ModalHeader>
              <HeaderLeft>
                <ModalTitle id={titleId}>
                  <TitleIcon aria-hidden>
                    {mode === 'edit' ? (
                      <FiEdit2 size={16} />
                    ) : (
                      <FiPlus size={18} />
                    )}
                  </TitleIcon>
                  {title}
                </ModalTitle>
                {requiredFields.length > 0 && (
                  <RequiredChips>
                    {requiredFields.map((f) => (
                      <RequiredChip
                        key={f.label}
                        type="button"
                        $done={f.done}
                        onClick={() =>
                          f.jumpTarget && handleChipJump(f.jumpTarget)
                        }
                        title={
                          f.jumpTarget
                            ? `${f.label} 필드로 이동`
                            : undefined
                        }
                        layout
                        animate={
                          f.done
                            ? { scale: [1.1, 1] }
                            : { scale: 1 }
                        }
                        transition={{
                          type: 'spring',
                          stiffness: 380,
                          damping: 18,
                        }}
                      >
                        {f.done && <FiCheck size={11} />}
                        {f.label}
                      </RequiredChip>
                    ))}
                  </RequiredChips>
                )}
              </HeaderLeft>
              <CloseBtn
                type="button"
                onClick={requestClose}
                aria-label="닫기"
                disabled={submitting}
              >
                <FiX size={20} />
              </CloseBtn>
            </ModalHeader>

            {/* 진척률 바 — 필수 항목 채워진 비율 */}
            {totalCount > 0 && (
              <ProgressTrack
                role="progressbar"
                aria-valuenow={completedCount}
                aria-valuemin={0}
                aria-valuemax={totalCount}
                aria-label={`필수 항목 ${completedCount} / ${totalCount}`}
              >
                <ProgressFill
                  $complete={isComplete}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 26,
                  }}
                />
              </ProgressTrack>
            )}

            <Body>
              {sectionIndex.length > 0 && (
                <SideIndex aria-label="섹션 인덱스">
                  <SideIndexList>
                    {sectionIndex.map((item, idx) => (
                      <SideIndexItem
                        key={item.id}
                        $active={activeSection === item.id}
                      >
                        <button
                          type="button"
                          onClick={() => handleIndexClick(item.id)}
                          title={item.label}
                        >
                          <span data-section-label>{item.label}</span>
                          <SectionNum data-section-num>{idx + 1}</SectionNum>
                        </button>
                      </SideIndexItem>
                    ))}
                  </SideIndexList>
                </SideIndex>
              )}
              <FormScroll ref={scrollRef} aria-busy={submitting}>
                {children}
              </FormScroll>
              <AnimatePresence>
                {submitting && (
                  <SubmittingOverlay
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <SubmittingBox>
                      <InlineSpinner />
                      저장 중입니다...
                    </SubmittingBox>
                  </SubmittingOverlay>
                )}
              </AnimatePresence>
            </Body>

            <ModalFooter>
              <FooterStatus>
                {!isDirty && totalCount === 0 && (
                  <FooterHint>변경사항 없음</FooterHint>
                )}
                {totalCount > 0 && completedCount < totalCount && (
                  <FooterHint $variant="warning">
                    필수 {totalCount - completedCount}개 항목이 더 필요합니다
                  </FooterHint>
                )}
                {totalCount > 0 && completedCount === totalCount && isDirty && (
                  <FooterHint $variant="success">
                    <FiCheck size={12} /> 저장 준비 완료
                  </FooterHint>
                )}
              </FooterStatus>
              <FooterButtons>
                <CancelBtn
                  type="button"
                  onClick={requestClose}
                  disabled={submitting}
                >
                  취소
                </CancelBtn>
                <SubmitBtn
                  type="submit"
                  form={formId}
                  disabled={submitting}
                  $emphasis={isComplete && isDirty}
                >
                  {submitting && <Spinner />}
                  {submitting ? '저장 중...' : submitLabel}
                </SubmitBtn>
              </FooterButtons>
            </ModalFooter>
          </ModalBox>
        </Overlay>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
