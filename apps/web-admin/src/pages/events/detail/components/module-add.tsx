/**
 * 모듈 추가 — 빈 모듈 발견을 위한 dropdown.
 *
 * 사상자/작전 정보/교전 진영은 stub 데이터로 즉시 추가. 추가 후 사용자가 각 모듈에서
 * inline-edit으로 채움(현재는 read-only이라 후속 작업에서 모듈별 inline-edit 추가 필요).
 *
 * 조약(treaties)은 belligerents.metadata 트리 아래라 merge 필요 — 별도 사이클.
 * 행정부(cabinets)는 cabinet-events API 분리 — 별도 사이클.
 */
import { useEffect, useRef, useState } from 'react'

import { FiChevronDown, FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerHairlineStrong } from '@/pages/events/ledger/styles/ledger-tokens'
import { type UpdateEventDto } from '@/shared/api/events'

import { type EventDetail } from '../use-event-detail'
import {
  type EventDetailModuleKey,
} from '../use-event-detail'
import { MODULE_COLOR } from './module-colors'

interface ModuleAddProps {
  event: EventDetail
  enabledModules: EventDetailModuleKey[]
  onPatch: (patch: UpdateEventDto) => void
}

interface ModuleOption {
  key: EventDetailModuleKey
  label: string
  hint?: string
  patch: UpdateEventDto
}

export function ModuleAdd({ event, enabledModules, onPatch }: ModuleAddProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  /**
   * 모듈 추가 직후 *해당 모듈이 enabledModules에 들어오는 순간* 스크롤한다.
   * 과거엔 80ms 인터벌 + 1.5s 포기로 DOM 등장을 폴링했는데, react-query의
   * invalidate → refetch → 부모 재렌더 순서를 React 라이프사이클로 직접 듣는
   * 편이 깔끔. useEffect는 commit 후 동작하므로 DOM 노드는 그 시점에 이미 존재.
   */
  const [pendingScrollKey, setPendingScrollKey] = useState<EventDetailModuleKey | null>(null)

  /* 외부 클릭 닫기 */
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!pendingScrollKey) return
    if (!enabledModules.includes(pendingScrollKey)) return
    const targetId = `module-${pendingScrollKey}`
    /* 새 module 섹션이 DOM commit된 다음 페인트 프레임에 스크롤 — 레이아웃이
       다 잡힌 후라 점프가 부드러움. */
    const raf = window.requestAnimationFrame(() => {
      const node = document.getElementById(targetId)
      node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    setPendingScrollKey(null)
    return () => window.cancelAnimationFrame(raf)
  }, [pendingScrollKey, enabledModules])

  /**
   * 이미 활성화된 모듈은 옵션에서 제외.
   *
   * stub은 *모듈 enable만* 시그널하는 빈 값이어야 한다. 이전엔
   * `casualties: { killed: 0 }`처럼 의미 있어 보이는 값을 박아 둬서,
   * 사용자가 모듈을 클릭만 하고 떠나면 "전사 0명"이 데이터로 영구화되는
   * 오염이 있었다. 빈 객체 `{}`도 enabledModules 판정에서는 truthy라
   * 모듈은 정상적으로 표시되며, 모든 필드는 빈 InlineText로 렌더된다.
   */
  const allOptions: ModuleOption[] = [
    {
      key: 'casualties',
      label: '사상자·피해',
      patch: { casualties: {} },
    },
    {
      key: 'military-details',
      label: '작전 정보',
      patch: { militaryDetails: {} },
    },
    {
      key: 'belligerents',
      label: '교전 진영',
      patch: {
        belligerents: {
          ...(event.belligerents ?? {}),
          sides: [
            ...(event.belligerents?.sides ?? []),
            // 빈 이름으로 시작 — 사용자가 채울 때까지 placeholder만 노출.
            { name: '', countries: [] },
          ],
        },
      },
    },
  ]

  const options = allOptions.filter((opt) => !enabledModules.includes(opt.key))

  /* 후속 작업이라 dropdown에 disabled로 노출 — 사용자가 무엇이 가능할지 알도록. */
  const deferredOptions: Array<{ label: string; reason: string }> = []
  if (!enabledModules.includes('treaties')) {
    deferredOptions.push({
      label: '조약',
      reason: '교전 진영 추가 후 가능',
    })
  }
  if (!enabledModules.includes('cabinets')) {
    deferredOptions.push({
      label: '관련 행정부',
      reason: '별도 API — 후속',
    })
  }

  if (options.length === 0 && deferredOptions.length === 0) return null

  const apply = (opt: ModuleOption) => {
    onPatch(opt.patch)
    setOpen(false)
    /* 다음 refetch에서 enabledModules에 이 키가 포함되면 위의 useEffect가 스크롤. */
    setPendingScrollKey(opt.key)
  }

  return (
    <Host ref={ref}>
      <Trigger type="button" onClick={() => setOpen((v) => !v)}>
        <FiPlus />
        모듈 추가
        <FiChevronDown />
      </Trigger>
      {open && (
        <Menu role="menu">
          {options.map((opt) => (
            <MenuItem
              key={opt.key}
              type="button"
              role="menuitem"
              onClick={() => apply(opt)}
            >
              <Dot $color={MODULE_COLOR[opt.key]} />
              {opt.label}
            </MenuItem>
          ))}
          {deferredOptions.length > 0 && options.length > 0 && <Divider />}
          {deferredOptions.map((opt) => (
            <MenuItem key={opt.label} type="button" disabled aria-disabled>
              <Dot $muted />
              <span>{opt.label}</span>
              <Reason>— {opt.reason}</Reason>
            </MenuItem>
          ))}
        </Menu>
      )}
    </Host>
  )
}

const Host = styled.div`
  position: relative;
  display: inline-flex;
`

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 7px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.text.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  padding: 6px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
`

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 6px;
  transition: background 0.12s;

  &:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.06);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const Dot = styled.span<{ $color?: string; $muted?: boolean }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color, $muted, theme }) =>
    $muted ? theme.colors.text.tertiary : $color ?? theme.colors.text.tertiary};
  flex-shrink: 0;
`

const Divider = styled.div`
  height: 1px;
  margin: 4px 6px;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const Reason = styled.span`
  margin-left: auto;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
