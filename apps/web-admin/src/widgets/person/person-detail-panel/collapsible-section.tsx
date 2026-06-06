/**
 * 개요 탭 접기/펼치기 섹션 래퍼.
 * - 하단 데이터 많은 섹션(학력·경력·수상·활동 등)을 접을 수 있게 해 긴 스크롤을 완화.
 * - 펼침/접힘 상태는 storageKey 별 localStorage에 보존(인물 전환·새로고침에도 유지).
 * - 헤더는 토글 버튼, 본문은 framer-motion height 애니메이션.
 */
import { type ReactNode, useCallback, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { FiChevronRight } from 'react-icons/fi'
import styled from 'styled-components'

import { CountMuted } from './person-detail-panel.styles'

const STORAGE_PREFIX = 'papyrus.person-overview.collapse.'

function readStored(storageKey: string, defaultOpen: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch {
    /* localStorage 접근 불가 시 기본값 */
  }
  return defaultOpen
}

interface CollapsibleSectionProps {
  /** 접힘 상태 보존 키 (섹션별 고유) */
  storageKey: string
  ariaLabel: string
  icon: ReactNode
  title: string
  count?: number | null
  /** 기본 펼침 여부 (기본 true) */
  defaultOpen?: boolean
  /** 헤더 우측 액션(추가 버튼 등) — 토글 버튼과 분리되어 클릭이 토글로 전파되지 않음 */
  actions?: ReactNode
  children: ReactNode
}

export function CollapsibleSection({
  storageKey,
  ariaLabel,
  icon,
  title,
  count,
  defaultOpen = true,
  actions,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(() => readStored(storageKey, defaultOpen))

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_PREFIX + storageKey, next ? '1' : '0')
      } catch {
        /* 저장 실패는 무시 — UI 동작엔 영향 없음 */
      }
      return next
    })
  }, [storageKey])

  const bodyId = `overview-collapsible-${storageKey}`

  return (
    <section aria-label={ariaLabel}>
      <HeaderRow>
        <ToggleButton
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={bodyId}
        >
          <Chevron $open={open}>
            <FiChevronRight size={14} strokeWidth={2.4} />
          </Chevron>
          {icon}
          <TitleText>{title}</TitleText>
          {count != null && <CountMuted>{count}</CountMuted>}
        </ToggleButton>
        {actions}
      </HeaderRow>
      <AnimatePresence initial={false}>
        {open && (
          <Body
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            <BodyInner>{children}</BodyInner>
          </Body>
        )}
      </AnimatePresence>
    </section>
  )
}

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

const ToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-align: left;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:hover {
    color: ${({ theme }) => theme.colors.primary?.main ?? '#4338ca'};
  }
`

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  transition: transform 0.2s ease;
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
`

const TitleText = styled.span`
  /* 카운트 배지를 제목 바로 옆에 붙이기 위해 flex-grow 없음 */
`

const Body = styled(motion.div)`
  overflow: hidden;
`

const BodyInner = styled.div`
  /* AnimatePresence height 측정 대상 — 패딩은 자식 섹션이 관리 */
`
