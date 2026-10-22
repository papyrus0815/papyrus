/**
 * 모듈 추가 — 빈 모듈 발견을 위한 dropdown.
 *
 * 순서는 **사건 카테고리**가 정한다(entities/event/model/category-features). 그 분류에 맞는 모듈이
 * '이 분류에 맞는 기능'으로 맨 위에 오고, 나머지는 숨기지 않고 '다른 기능'으로 아래에 둔다.
 *
 * - 진영: 진영 API로 첫 진영 둘을 만든다(이름은 진영 1·2 — 모듈에서 고친다)
 * - 수치: 저장할 것이 없으므로 모듈만 펼친다(첫 수치를 기록하면 서버 데이터로 유지된다)
 * - 작전 정보: 빈 작전 정보를 upsert해 활성화
 *
 * 행정부(cabinets)는 cabinet-events API 분리 — 별도 사이클.
 */
import { useEffect, useRef, useState } from 'react'

import { FiChevronDown, FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import { eventTypeFeatures } from '@/entities/event/model'
import {
  ledgerAccentSubtle,
  ledgerHairlineStrong,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type UpdateEventDto } from '@/shared/api/events'

import { buildMilitaryPatch } from '../military-edit'
import { type EventDetail } from '../use-event-detail'
import {
  type EventDetailModuleKey,
} from '../use-event-detail'
import { MODULE_COLOR } from './module-colors'

interface ModuleAddProps {
  event: EventDetail
  enabledModules: EventDetailModuleKey[]
  onPatch: (patch: UpdateEventDto) => void
  /** 진영 모듈 시작 — 첫 진영 둘 생성 */
  onStartSides: () => Promise<void>
  /** 수치 모듈 펼치기 — 저장 없음 */
  onShowMetrics: () => void
  /**
   * 'menu'(기본) = 드롭다운 버튼. 'cards' = 켠 모듈이 하나도 없을 때 탭을 채우는 카드 목록 —
   * 빈 탭에 버튼 하나만 덩그러니 있으면 무엇을 붙일 수 있는지 열어 보기 전엔 알 수 없었다.
   */
  variant?: 'menu' | 'cards'
}

/** 카드 변형의 한 줄 설명 — 모듈이 무엇을 기록하는지 */
const MODULE_DESCRIPTION: Record<EventDetailModuleKey, string> = {
  sides: '참여국을 편으로 묶는다 — 참여국 역할(주도·적대…)이 있으면 초안을 만들어 준다',
  metrics: '병력·사상자·비용처럼 숫자로 남는 기록을 출처와 함께',
  'military-details': '작전명·전장·지휘 체계 같은 군사 작전의 사실',
  cabinets: '이 사건을 다룬 행정부(내각)',
}

interface ModuleOption {
  key: EventDetailModuleKey
  label: string
  hint?: string
  run: () => void | Promise<void>
}

export function ModuleAdd({
  event,
  enabledModules,
  onPatch,
  onStartSides,
  onShowMetrics,
  variant = 'menu',
}: ModuleAddProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  /**
   * 모듈 추가 직후 *해당 모듈이 enabledModules에 들어오는 순간* 스크롤한다.
   * 과거엔 80ms 인터벌 + 1.5s 포기로 DOM 등장을 폴링했는데, react-query의
   * invalidate → refetch → 부모 재렌더 순서를 React 라이프사이클로 직접 듣는
   * 편이 깔끔. useEffect는 commit 후 동작하므로 DOM 노드는 그 시점에 이미 존재.
   */
  const [pendingScrollKey, setPendingScrollKey] = useState<EventDetailModuleKey | null>(null)

  /* 외부 클릭 + Esc 닫기 */
  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
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
  const features = eventTypeFeatures(event.type, event.domain)

  const allOptions: ModuleOption[] = [
    {
      key: 'sides',
      label: '진영',
      run: onStartSides,
    },
    {
      key: 'metrics',
      label: features.metricsMenuLabel,
      run: onShowMetrics,
    },
    {
      key: 'military-details',
      label: '작전 정보',
      // 빈 객체로 모듈만 활성화(truthy) — 필드는 inline-edit으로 채움.
      run: () => onPatch(buildMilitaryPatch(event, (current) => ({ ...(current ?? {}) }))),
    },
  ]

  const options = allOptions.filter((opt) => !enabledModules.includes(opt.key))
  const suggestedOptions = features.suggestedModules.flatMap((key) =>
    options.filter((opt) => opt.key === key),
  )
  const otherOptions = options.filter((opt) => !features.suggestedModules.some((key) => key === opt.key))

  /* 후속 작업이라 dropdown에 disabled로 노출 — 사용자가 무엇이 가능할지 알도록. */
  const deferredOptions: Array<{ label: string; reason: string }> = []
  if (!enabledModules.includes('cabinets')) {
    deferredOptions.push({
      label: '관련 행정부',
      reason: '별도 API — 후속',
    })
  }

  if (options.length === 0 && deferredOptions.length === 0) return null

  const apply = (opt: ModuleOption) => {
    void opt.run()
    setOpen(false)
    /* 다음 refetch에서 enabledModules에 이 키가 포함되면 위의 useEffect가 스크롤. */
    setPendingScrollKey(opt.key)
  }

  if (variant === 'cards') {
    return (
      <CardList aria-label="붙일 수 있는 기능">
        {[...suggestedOptions, ...otherOptions].map((opt) => (
          <OptionCard key={opt.key} type="button" onClick={() => apply(opt)}>
            <Dot $color={MODULE_COLOR[opt.key]} />
            <CardText>
              <CardTitle>
                {opt.label}
                {suggestedOptions.includes(opt) && <CardBadge>이 분류에 맞음</CardBadge>}
              </CardTitle>
              <CardHint>{MODULE_DESCRIPTION[opt.key]}</CardHint>
            </CardText>
            <CardAction aria-hidden>
              <FiPlus />
              시작
            </CardAction>
          </OptionCard>
        ))}
        {deferredOptions.map((opt) => (
          <OptionCard key={opt.label} type="button" disabled aria-disabled>
            <Dot $muted />
            <CardText>
              <CardTitle>{opt.label}</CardTitle>
              <CardHint>{opt.reason}</CardHint>
            </CardText>
          </OptionCard>
        ))}
      </CardList>
    )
  }

  return (
    <Host ref={ref}>
      <Trigger
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <FiPlus />
        모듈 추가
        <FiChevronDown />
      </Trigger>
      {open && (
        <Menu role="menu">
          {suggestedOptions.length > 0 && (
            <MenuGroup role="group" aria-label="이 분류에 맞는 기능">
              <GroupLabel aria-hidden>이 분류에 맞는 기능</GroupLabel>
              {suggestedOptions.map((opt) => (
                <ModuleMenuItem key={opt.key} option={opt} onApply={apply} />
              ))}
            </MenuGroup>
          )}
          {suggestedOptions.length > 0 && otherOptions.length > 0 && <Divider role="separator" />}
          {otherOptions.length > 0 && (
            <MenuGroup role="group" aria-label={suggestedOptions.length > 0 ? '다른 기능' : '모듈'}>
              {suggestedOptions.length > 0 && <GroupLabel aria-hidden>다른 기능</GroupLabel>}
              {otherOptions.map((opt) => (
                <ModuleMenuItem key={opt.key} option={opt} onApply={apply} />
              ))}
            </MenuGroup>
          )}
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

function ModuleMenuItem({
  option,
  onApply,
}: {
  option: ModuleOption
  onApply: (option: ModuleOption) => void
}) {
  return (
    <MenuItem type="button" role="menuitem" onClick={() => onApply(option)}>
      <Dot $color={MODULE_COLOR[option.key]} />
      {option.label}
    </MenuItem>
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
  border-radius: ${RADIUS.SM};
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
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 24px rgba(0, 0, 0, 0.5)'
      : '0 8px 24px rgba(15, 23, 42, 0.08)'};
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
  border-radius: ${RADIUS.SM};
  transition: background 0.12s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
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

const MenuGroup = styled.div`
  display: flex;
  flex-direction: column;
`

/* 메뉴 안 묶음 머리글 — 항목이 아니므로 role 없이 시각 구분만. */
const GroupLabel = styled.div`
  padding: 6px 10px 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${metaText};
`

const Divider = styled.div`
  height: 1px;
  margin: 4px 6px;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

/* 모듈을 왜 못 켜는지 설명하는 줄 — 읽히지 않으면 비활성 이유가 화면에서 사라진다. */
const Reason = styled.span`
  margin-left: auto;
  font-size: 11.5px;
  color: ${metaText};
`

/* ── 카드 변형 — 빈 '진영·수치' 탭 ── */

const CardList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 10px;
  max-width: 980px;
`

const OptionCard = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: transparent;
  font: inherit;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition:
    border-color 0.14s,
    background 0.14s;

  > ${Dot} {
    margin-top: 6px;
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.text.tertiary};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.text.primary};
    outline-offset: 2px;
  }
  &:disabled {
    cursor: not-allowed;
    border-style: dashed;
    color: ${metaText};
  }
`

const CardText = styled.span`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
`

const CardTitle = styled.span`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
`

const CardBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${metaText};
`

const CardHint = styled.span`
  font-size: 12.5px;
  line-height: 1.5;
  color: ${metaText};
`

const CardAction = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    width: 12px;
    height: 12px;
  }

  ${OptionCard}:hover & {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
