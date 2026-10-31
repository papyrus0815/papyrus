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

import { CountMuted, sectionHeadingCss } from './person-detail-panel.styles'

const STORAGE_PREFIX = 'papyrus.person-career.collapse.'

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
  /** 섹션 DOM id (앵커 스크롤용) */
  id?: string
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
  /** count=0일 때도 내부 모달 ref 유지를 위해 자식을 마운트해 둘지 여부 */
  keepChildrenMountedWhenEmpty?: boolean
  children: ReactNode
}

export function CollapsibleSection({
  id,
  storageKey,
  ariaLabel,
  icon,
  title,
  count,
  defaultOpen = true,
  actions,
  keepChildrenMountedWhenEmpty = false,
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

  const isEmpty = count === 0
  const effectiveOpen = isEmpty ? false : open
  const bodyId = `overview-collapsible-${storageKey}`

  return (
    <SectionRoot
      id={id}
      aria-label={ariaLabel}
      data-collapsible
      data-open={effectiveOpen ? 'true' : 'false'}
      data-empty={isEmpty || undefined}
    >
      <HeaderRow $open={effectiveOpen}>
        {isEmpty ? (
          <StaticHeading>
            {icon}
            <TitleText>{title}</TitleText>
            <CountMuted>0</CountMuted>
          </StaticHeading>
        ) : (
          <ToggleButton
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={bodyId}
          >
            {icon}
            <TitleText>{title}</TitleText>
            {count != null && <CountMuted>{count}</CountMuted>}
            <Chevron $open={open}>
              <FiChevronRight size={14} strokeWidth={2.4} />
            </Chevron>
          </ToggleButton>
        )}
        {actions}
      </HeaderRow>
      {isEmpty ? (
        keepChildrenMountedWhenEmpty ? (
          children
        ) : null
      ) : (
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
      )}
    </SectionRoot>
  )
}

const SectionRoot = styled.section`
  scroll-margin-top: var(--person-sticky-offset, 24px);
`

const HeaderRow = styled.div<{ $open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: ${({ $open }) => ($open ? '10px' : '0')};
  /* 접혀 있으면 아래에 아무것도 없으므로 여백도 두지 않는다 */
  margin-bottom: ${({ $open }) => ($open ? '8px' : '0')};
  border-bottom: ${({ $open, theme }) =>
    $open
      ? `1px solid ${
          theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(15, 23, 42, 0.09)'
        }`
      : 'none'};
`

const StaticHeading = styled.h3`
  ${sectionHeadingCss}
  flex: 1 1 auto;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ToggleButton = styled.button`
  ${sectionHeadingCss}
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;

  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  }
`

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  margin-left: -2px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: transform 0.2s ease, color 0.15s ease;
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
