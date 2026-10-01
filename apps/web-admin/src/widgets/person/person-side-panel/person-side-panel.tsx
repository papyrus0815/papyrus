/**
 * 인물 목록 + 우측 상세 패널 분할 — 사건 목록(/events)의 CatalogSplit·CatalogDetailDrawer와 같은 문법.
 *
 * - >1200px: 목록 | 패널 2열 그리드. 패널은 스크롤 컨테이너(ContentShell DetailPane) 안에서
 *   sticky로 붙어 목록을 내려도 제자리에 있고, 자기 안에서만 스크롤한다.
 * - ≤1200px: 우측에서 미끄러져 들어오는 fixed drawer + backdrop(dialog·포커스 트랩·Esc).
 *
 * 패널 안에서 다른 인물 링크를 누르면 스택에 쌓아 같은 패널에서 전환한다('뒤로'로 복귀) —
 * 예전 PersonInlineModal과 같은 동작.
 *
 * 인물 미선택이면 패널을 **아예 그리지 않아** 목록이 전폭을 쓴다. 닫힘 전환(0.24s)을 재생하려고
 * 닫힌 뒤 잠깐 더 마운트해 두고, 그동안은 마지막 인물을 붙들어 둔다.
 */
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiArrowLeft, FiArrowUpRight, FiX } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { getPersonDetailById } from '@/shared/api/persons-detail'
import { useBodyScrollLock } from '@/shared/hooks/use-body-scroll-lock.hook'
import { useFocusTrap } from '@/shared/hooks/use-focus-trap.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { Z_INDEX } from '@/shared/styles/z-index'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'

/** 이 폭 이하에서는 drawer — 사건 목록과 같은 분기점 */
const DRAWER_QUERY = '(max-width: 1200px)'
const CLOSE_MS = 240

export interface PersonSplitViewProps {
  /** 패널에 띄울 인물. null이면 패널 닫힘(목록 전폭). */
  personId: string | null
  onClose: () => void
  /** 헤더 '상세 페이지' — 지금 패널에 보이는 인물(스택 최상단)의 전용 상세로 이동 */
  onOpenDetail?: (id: string) => void
  /** 패널 안에서 링크로 다른 인물로 옮겨갔을 때 — '최근 본 인물' 기록 등 */
  onPersonShown?: (id: string) => void
  /** 패널 안 ✎ 편집 — id는 지금 보이는 인물 */
  onEdit?: (id: string) => void
  /** 목록 지면 */
  children: ReactNode
}

export function PersonSplitView({
  personId,
  onClose,
  onOpenDetail,
  onPersonShown,
  onEdit,
  children,
}: PersonSplitViewProps) {
  const open = personId != null

  // 닫힘 전환이 끝날 때까지 마운트 유지 + 그동안 보여줄 마지막 인물
  const [mounted, setMounted] = useState(open)
  const [lastPersonId, setLastPersonId] = useState(personId)
  if (personId != null && personId !== lastPersonId) setLastPersonId(personId)
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  return (
    <SplitGrid $hasPanel={mounted}>
      <ListColumn>{children}</ListColumn>
      {mounted && lastPersonId && (
        <PersonSidePanel
          open={open}
          personId={lastPersonId}
          onClose={onClose}
          onOpenDetail={onOpenDetail}
          onPersonShown={onPersonShown}
          onEdit={onEdit}
        />
      )}
    </SplitGrid>
  )
}

interface PersonSidePanelProps {
  open: boolean
  personId: string
  onClose: () => void
  onOpenDetail?: (id: string) => void
  onPersonShown?: (id: string) => void
  onEdit?: (id: string) => void
}

function PersonSidePanel({
  open,
  personId,
  onClose,
  onOpenDetail,
  onPersonShown,
  onEdit,
}: PersonSidePanelProps) {
  // 첫 프레임은 닫힌 모양으로 그리고 다음 프레임에 연다 — 그래야 여는 전환이 재생된다
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (!open) {
      setEntered(false)
      return
    }
    const frame = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(frame)
  }, [open])
  const shown = open && entered

  const [isDrawer, setIsDrawer] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(DRAWER_QUERY)
    const update = () => setIsDrawer(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  /** 패널 안 인물 링크 스택 — 목록에서 다른 인물을 고르면 초기화 */
  const [stack, setStack] = useState<string[]>([])
  useEffect(() => {
    setStack([])
  }, [personId])
  const activeId = stack[stack.length - 1] ?? personId

  const { data: activePerson } = useQuery({
    queryKey: ['person-detail', activeId],
    queryFn: () => getPersonDetailById(activeId),
    enabled: !!activeId,
  })
  const titleName = activePerson ? getPersonDisplayName(activePerson) : ''

  const goBack = () => setStack((prev) => prev.slice(0, -1))
  const pushPerson = (id: string) => {
    setStack((prev) => [...prev, id])
    onPersonShown?.(id)
  }

  const hostRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const drawerActive = isDrawer && open
  useFocusTrap(hostRef, drawerActive)
  useBodyScrollLock(drawerActive)

  // 인물이 바뀌면 패널 스크롤을 맨 위로
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [activeId])

  // Esc — drawer에선 항상, 데스크톱 열에선 포커스가 패널 안에 있을 때만(목록 키보드 조작을 가로채지 않게)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const inside = hostRef.current?.contains(document.activeElement) ?? false
      if (!isDrawer && !inside) return
      if (stack.length > 0) setStack((prev) => prev.slice(0, -1))
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isDrawer, stack.length, onClose])

  return (
    <>
      <Backdrop $open={shown} onClick={onClose} aria-hidden="true" />
      <PanelHost
        ref={hostRef}
        $open={shown}
        role={isDrawer ? 'dialog' : 'region'}
        aria-modal={drawerActive ? true : undefined}
        aria-label={`인물 상세: ${titleName || '선택된 인물'}`}
      >
        <PanelHeader>
          {stack.length > 0 && (
            <IconButton type="button" onClick={goBack} aria-label="이전 인물로">
              <FiArrowLeft size={18} aria-hidden />
            </IconButton>
          )}
          <PanelTitle title={titleName}>{titleName || '인물'}</PanelTitle>
          {onOpenDetail && (
            <OpenDetailButton type="button" onClick={() => onOpenDetail(activeId)}>
              상세 페이지
              <FiArrowUpRight size={15} aria-hidden />
            </OpenDetailButton>
          )}
          <IconButton type="button" onClick={onClose} aria-label="패널 닫기">
            <FiX size={18} aria-hidden />
          </IconButton>
        </PanelHeader>
        <PanelScroll ref={scrollRef} key={activeId}>
          <PersonDetailPanel
            personId={activeId}
            onClose={onClose}
            onEdit={(id) => onEdit?.(id)}
            hideHeaderActions
            embedInModal
            onLinkedPersonClick={pushPerson}
          />
        </PanelScroll>
      </PanelHost>
    </>
  )
}

const SplitGrid = styled.div<{ $hasPanel: boolean }>`
  display: grid;
  /* 폭을 보간하지 말 것 — 목록(차트·카드)이 매 프레임 재조판된다 */
  grid-template-columns: ${({ $hasPanel }) =>
    $hasPanel ? 'minmax(0, 1fr) clamp(420px, 30vw, 620px)' : 'minmax(0, 1fr)'};
  align-items: start;
  min-height: 100%;

  @media (max-width: 1200px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const ListColumn = styled.div`
  min-width: 0;
`

const surface = css`
  background: ${({ theme }) => (theme.mode === 'dark' ? '#171717' : '#ffffff')};
  border-left: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0')};
`

const PanelHost = styled.div<{ $open: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  ${surface}

  /* 데스크톱 — 그리드 두 번째 열, 스크롤 컨테이너 높이에 붙는다 */
  @media (min-width: 1201px) {
    position: sticky;
    top: 0;
    height: calc(100vh - var(--header-height, 0px));
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    transform: translateX(${({ $open }) => ($open ? '0' : '16px')});
    transition:
      opacity 0.2s ease,
      transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @media (max-width: 1200px) {
    position: fixed;
    top: var(--header-height, 0px);
    right: 0;
    bottom: 0;
    width: min(480px, 92vw);
    z-index: ${Z_INDEX.DRAWER_CONTENT};
    box-shadow: ${({ $open }) => ($open ? '-12px 0 32px rgba(15, 17, 29, 0.18)' : 'none')};
    transform: translateX(${({ $open }) => ($open ? '0' : '100%')});
    transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    overscroll-behavior: contain;
  }

  @media (max-width: 640px) {
    width: 100vw;
    border-left: none;
  }

  @media (min-width: 1201px) and (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none;
  }
  @media (max-width: 1200px) and (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Backdrop = styled.div<{ $open: boolean }>`
  display: none;

  @media (max-width: 1200px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.42);
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    transition: opacity 0.2s ease;
    z-index: ${Z_INDEX.DRAWER_OVERLAY};
  }
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 12px 12px 12px 20px;
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0')};
`

const PanelTitle = styled.h2`
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 2px;
  }
`

const OpenDetailButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  height: 32px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 2px;
  }
`

const PanelScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 20px 32px;

  @media (prefers-reduced-motion: no-preference) {
    animation: personPanelSwapIn 0.18s ease;
  }
  @keyframes personPanelSwapIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`
