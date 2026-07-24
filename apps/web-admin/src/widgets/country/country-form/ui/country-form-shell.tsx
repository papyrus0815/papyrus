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
import { FiCheck, FiCloud, FiX } from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

import { confirm } from '@/shared/ui/confirm-dialog'
import { useBodyScrollLock } from '@/shared/hooks/use-body-scroll-lock.hook'
import { glassCardMixin } from '@/shared/styles/mixins'
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
  /** 채움 여부 — true면 인덱스 좌측에 작은 점 표시 */
  filled?: boolean
}

export interface CountryFormShellProps {
  /** 모달 열림 여부 */
  isOpen: boolean
  /** 닫기 요청 — 가드 통과 후 호출됨 (오버레이 클릭/Esc/취소) */
  onClose: () => void
  /** 모달 타이틀 */
  title: string
  /** 타이틀 옆 작은 서브타이틀 (예: 수정 모드의 편집 대상) */
  subtitle?: string
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
  /** 자동 저장(draft) 활성 여부 — true면 푸터에 "자동 저장됨" 표시 */
  draftEnabled?: boolean
  /**
   * 높이를 콘텐츠에 맞춤(90vh 고정 해제) — 짧은 폼(예: 필수-먼저 인물 등록)이
   * 큰 빈 공간 없이 내용만큼만 차지하도록. 미지정 시 기존 90vh 고정.
   */
  fitContent?: boolean
  /**
   * 셸이 aria-invalid MutationObserver로 첫 오류 필드를 자동 스크롤·포커스할지.
   * 폼이 자체적으로 첫-오류 이동을 하면(예: 인물 등록 뷰의 handleSubmit rAF) false로 꺼서
   * 타이핑 중 포커스 강탈·이중 스크롤 레이스를 없앤다. 기본 true(국가 폼 등 기존 동작 유지).
   */
  manageErrorFocus?: boolean
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
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: ${Z_INDEX.MODAL_OVERLAY};

  @media (max-width: 768px) {
    padding: 0;
  }
`

const ModalBox = styled(motion.div)<{ $fit?: boolean }>`
  ${({ theme }) => glassCardMixin(theme)}
  width: min(960px, 96vw);
  ${({ $fit }) =>
    $fit
      ? `height: auto; max-height: min(90vh, 1200px);`
      : `height: 90vh; max-height: 1200px;`}
  border-radius: 16px;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 768px) {
    width: 100vw;
    height: 100vh;
    /* 모바일 주소창 영역만큼 푸터 버튼이 잘리던 문제 — dvh로 실제 보이는 높이에 맞춤 */
    height: 100dvh;
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
  padding: 18px 24px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 14px 16px;
  }
`

const TitleWrap = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
`

/** 모달 타이틀 — 본문 14px보다 확연히 큰 위계로 격상 (16→20·600→700) */
const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  line-height: 1.2;
  flex-shrink: 0;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`

const Subtitle = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: color 0.12s;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/** 본문: 좌측 sticky 인덱스 + 우측 스크롤 컨테이너 */
const Body = styled.div<{ $hasIndex: boolean }>`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: ${({ $hasIndex }) => ($hasIndex ? '160px 1fr' : '1fr')};
  position: relative;

  /* 모달 폭이 min(960px,96vw)로 상한 고정이라 라벨 인덱스는 769px까지 항상 들어간다
     (구 1100px 폭 시절의 숫자배지 축소 브레이크포인트는 제거 — RESP-1). */
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
  padding: 24px 10px 24px 16px;
  overflow-y: auto;

  @media (max-width: 768px) {
    display: none;
  }
`

const SideIndexList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

/**
 * 좌측 인덱스 항목 — number badge + active accent bar.
 * 5px FilledDot은 안 보여서 폐기, badge 자체가 채움/활성 신호를 모두 담는다.
 * - badge 색: idle(회색) / filled(연한 indigo fill·indigo 글자) / active(indigo fill·흰 글자)
 * - active 시 좌측 2px vertical bar로 "여기" 표시 (Linear 패턴)
 */
const SideIndexItem = styled.li<{ $active: boolean }>`
  > button {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    padding: 8px 10px 8px 14px;
    font-size: 13px;
    font-weight: ${({ $active }) => ($active ? 600 : 500)};
    letter-spacing: -0.005em;
    color: ${({ $active, theme }) =>
      $active ? theme.colors.text.primary : theme.colors.text.secondary};
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition:
      color 0.15s ease,
      background 0.15s ease;

    &:hover {
      color: ${({ theme }) => theme.colors.text.primary};
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
    }

    /* active accent bar — 좌측 2px vertical line */
    &::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 50%;
      transform: translateY(-50%);
      width: 2px;
      height: ${({ $active }) => ($active ? '60%' : '0')};
      background: ${({ theme }) => theme.colors.primary};
      border-radius: 2px;
      transition: height 0.2s ease;
    }
  }
`

const SideIndexBadge = styled.span<{ $active: boolean; $filled: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  border-radius: 50%;
  flex-shrink: 0;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  color: ${({ $active, $filled, theme }) =>
    $active
      ? '#fff'
      : $filled
        ? theme.colors.primary
        : theme.colors.text.tertiary};
  background: ${({ $active, $filled, theme }) =>
    $active
      ? theme.colors.primary
      : $filled
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.18)'
          : '#eef2ff'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : '#f1f5f9'};
`

const FormScroll = styled.div`
  min-height: 0;
  overflow-y: auto;
  padding: 28px 32px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 2px;
  }

  @media (max-width: 768px) {
    padding: 20px 16px;
  }
`

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 10px 16px;
  }
`

const SubmitBtn = styled.button<{ $emphasis?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  transition:
    background 0.12s ease,
    box-shadow 0.12s ease,
    opacity 0.12s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.25);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
`

const FooterStatus = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

const FooterButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

/** 필수 진행도 — dot bar(N개 segment) + 텍스트 카운트. text-only보다 시각 anchor.
 *  미완 상태에선 button으로 렌더돼 첫 미완 필수 항목으로 점프(죽은 어포던스 해소). */
const ProgressGroup = styled.span<{ $clickable?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  ${({ $clickable }) =>
    $clickable
      ? `
    appearance: none;
    border: none;
    background: none;
    padding: 2px 4px;
    margin: 0 -4px;
    font: inherit;
    cursor: pointer;
    border-radius: 6px;
    &:hover { opacity: 0.8; }
    &:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  `
      : ''}
`

const ProgressBar = styled.span`
  display: inline-flex;
  gap: 3px;
`

const ProgressSegment = styled.span<{
  $filled: boolean
  $complete: boolean
}>`
  display: inline-block;
  width: 16px;
  height: 4px;
  border-radius: 2px;
  background: ${({ $filled, $complete, theme }) =>
    $complete
      ? theme.colors.alert.success.fg
      : $filled
        ? theme.colors.primary
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e5e7eb'};
  transition: background 0.2s ease;
`

const ProgressLabel = styled.span<{ $complete: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $complete, theme }) =>
    $complete ? theme.colors.alert.success.fg : theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  > svg {
    flex-shrink: 0;
  }
`

/** 자동 저장 표시 — 클라우드 icon + 작은 텍스트 */
const AutoSaveHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};

  > svg {
    flex-shrink: 0;
    opacity: 0.7;
  }
`

const CancelBtn = styled.button`
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  cursor: pointer;
  transition:
    border-color 0.12s,
    color 0.12s,
    background 0.12s;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
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
  subtitle,
  mode,
  requiredFields = [],
  sectionIndex = [],
  formId,
  submitting = false,
  isDirty = false,
  submitLabel,
  isValid = true,
  draftEnabled = false,
  fitContent = false,
  manageErrorFocus = true,
  children,
  titleId = 'country-form-shell-title',
}: CountryFormShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<string | null>(
    sectionIndex[0]?.id ?? null,
  )

  // 모달 열려 있는 동안 배경(body) 스크롤 락 — 모바일 스크롤 체이닝/닫기 점프 방지
  useBodyScrollLock(isOpen)

  /** 변경사항 있을 때 닫기 가드 */
  const requestClose = async () => {
    if (submitting) return
    if (isDirty) {
      const ok = await confirm({
        title: '확인',
        // draft 활성(신규 등록)이면 임시저장되므로 문구를 정합 — '저장 안 됨' 모순 제거
        message: draftEnabled
          ? '입력 내용은 임시 저장되어 다음에 이어서 작성할 수 있습니다. 닫으시겠습니까?'
          : '저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?',
      })
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

  // 트리거 포커스 복원 — 열릴 때 직전 포커스(연 요소)를 잡아 두고 닫힐 때 되돌린다.
  // (모달이 첫 입력으로 포커스를 옮기기 전 시점이라 activeElement가 트리거다.)
  useEffect(() => {
    if (!isOpen) return
    const opener = document.activeElement as HTMLElement | null
    return () => {
      opener?.focus?.()
    }
  }, [isOpen])

  // 첫 포커스 — 모달 열릴 때 첫 입력 필드로
  useEffect(() => {
    if (!isOpen) return
    // 터치 기기(coarse pointer)에선 자동 포커스를 생략 — 소프트 키보드가 상단(hero·이름)을
    // 가리는 부작용을 막는다. 데스크톱(fine pointer)은 기존대로 첫 필드 포커스.
    if (window.matchMedia?.('(pointer: coarse)').matches) return
    // 다음 tick에 포커스 (DOM mount 후)
    const timer = window.setTimeout(() => {
      const root = scrollRef.current
      if (!root) return
      // 첫 '보이는' 입력으로 포커스 — display:none 썸네일 파일 input(폼 DOM 최상단)이
      // 잡히면 focus()가 no-op이라 아무 필드도 포커스되지 않던 문제 차단.
      // [type=file] 제외 + offsetParent!=null(가시성) 필터로 실제 첫 입력(성/이름)에 착지.
      const candidates = Array.from(
        root.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]):not([type="file"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ),
      )
      const firstVisible = candidates.find((el) => el.offsetParent !== null)
      firstVisible?.focus()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  // 검증 실패 후 첫 에러 필드로 자동 스크롤·포커스
  // (외부 폼이 invalid submit 시 [aria-invalid="true"] 표시한다고 가정)
  // 폼이 자체적으로 첫-오류 이동을 관리하면(manageErrorFocus=false) 이 옵저버를 끈다 —
  // 상시 aria-invalid 감시가 타이핑 중 포커스를 강탈하고 폼 rAF와 이중 스크롤하는 레이스 제거.
  useEffect(() => {
    if (!isOpen || !manageErrorFocus) return
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
  }, [isOpen, manageErrorFocus])

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
      // 바닥까지 스크롤되면 마지막 섹션을 활성 — offset(top+80)보다 아래에서 시작하는
      // 짧은 마지막 섹션(예: 가족)이 영영 활성화되지 않는 결함 보정.
      // '>8' 가드로 넘치지 않는(fitContent) 폼에서의 오작동을 차단.
      if (
        root.scrollHeight - root.clientHeight > 8 &&
        root.scrollTop + root.clientHeight >= root.scrollHeight - 4
      ) {
        current = sectionIndex[sectionIndex.length - 1].id
      }
      setActiveSection(current)
    }

    updateActive()
    root.addEventListener('scroll', updateActive)
    return () => root.removeEventListener('scroll', updateActive)
  }, [isOpen, sectionIndex])

  /** 인덱스 클릭 시 해당 섹션으로 스크롤 (착지 피드백은 scroll-spy 활성 표시가 담당). */
  const handleIndexClick = (id: string) => {
    const root = scrollRef.current
    if (!root) return
    const target = root.querySelector<HTMLElement>(
      `[data-form-section="${id}"]`,
    )
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  /** 푸터 진행도 클릭 → 첫 미완 필수 항목으로 스크롤·포커스 */
  const handleRequiredJump = () => {
    const root = scrollRef.current
    if (!root) return
    const firstIncomplete = requiredFields.find((f) => !f.done && f.jumpTarget)
    const jump = firstIncomplete?.jumpTarget
    if (!jump) return
    const target = root.querySelector<HTMLElement>(
      `[name="${jump}"], [data-jump-target="${jump}"], [data-form-section="${jump}"], #${jump}`,
    )
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (typeof target.focus === 'function') {
      window.setTimeout(() => target.focus(), 200)
    }
  }

  // 필수 진척률 (텍스트 표시용)
  const completedCount = requiredFields.filter((f) => f.done).length
  const totalCount = requiredFields.length
  const isComplete = totalCount > 0 && completedCount === totalCount
  // 미완 + 점프 대상이 있을 때만 진행도를 클릭 가능한 버튼으로
  const canJumpRequired =
    !isComplete && requiredFields.some((f) => !f.done && f.jumpTarget)

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
            $fit={fitContent}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
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
              <TitleWrap>
                <ModalTitle id={titleId}>{title}</ModalTitle>
                {subtitle && <Subtitle>{subtitle}</Subtitle>}
              </TitleWrap>
              <CloseBtn
                type="button"
                onClick={requestClose}
                aria-label="닫기"
                disabled={submitting}
              >
                <FiX size={18} />
              </CloseBtn>
            </ModalHeader>

            <Body $hasIndex={sectionIndex.length > 0}>
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
                          aria-label={item.label}
                          aria-current={activeSection === item.id ? 'true' : undefined}
                          title={item.label}
                        >
                          <SideIndexBadge
                            $active={activeSection === item.id}
                            $filled={!!item.filled}
                          >
                            {idx + 1}
                          </SideIndexBadge>
                          <span data-section-label>{item.label}</span>
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
                      저장 중…
                    </SubmittingBox>
                  </SubmittingOverlay>
                )}
              </AnimatePresence>
            </Body>

            <ModalFooter>
              <FooterStatus>
                {totalCount > 0 && (
                  <ProgressGroup
                    as={canJumpRequired ? 'button' : undefined}
                    type={canJumpRequired ? 'button' : undefined}
                    $clickable={canJumpRequired}
                    onClick={canJumpRequired ? handleRequiredJump : undefined}
                    aria-label={
                      canJumpRequired ? '미완성 필수 항목으로 이동' : undefined
                    }
                    title={
                      completedCount < totalCount
                        ? `미완: ${requiredFields
                            .filter((f) => !f.done)
                            .map((f) => f.label)
                            .join(', ')}`
                        : '필수 항목 모두 입력'
                    }
                  >
                    <ProgressBar
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={totalCount}
                      aria-valuenow={completedCount}
                      aria-label={`필수 ${completedCount}/${totalCount}`}
                    >
                      {requiredFields.map((f, i) => (
                        <ProgressSegment
                          key={i}
                          $filled={f.done}
                          $complete={isComplete}
                        />
                      ))}
                    </ProgressBar>
                    <ProgressLabel $complete={isComplete}>
                      {isComplete && <FiCheck size={12} />}
                      필수 {completedCount}/{totalCount}
                    </ProgressLabel>
                  </ProgressGroup>
                )}
                {draftEnabled && isDirty && (
                  <AutoSaveHint title="입력 중인 내용을 임시 저장 중">
                    <FiCloud size={12} />
                    임시 저장 중
                  </AutoSaveHint>
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
                  {submitting ? '저장 중…' : submitLabel}
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
