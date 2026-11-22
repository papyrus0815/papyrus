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
 * 행정부(cabinets)는 cabinet-events API 분리 — 별도 사이클. 아직 붙일 수 없는 기능은 **보이지 않는다**
 * (예전엔 '관련 행정부 — 별도 API — 후속'이라는 개발 메모가 사용자 화면에 그대로 떴다).
 */
import { useEffect, useState } from 'react'

import { FiChevronDown, FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import { eventTypeFeatures } from '@/entities/event/model'
import {
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type UpdateEventDto } from '@/shared/api/events'

import { buildMilitaryPatch } from '../military-edit'
import {
  type EventDetail,
  type EventDetailModuleKey,
} from '../use-event-detail'
import {
  CollapsedActorChipBtn,
  CollapsedActorInfo,
  CollapsedActorSlot,
} from './actors/actors.styles'
import { MODULE_COLOR } from './module-colors'

interface ModuleAddProps {
  event: EventDetail
  enabledModules: EventDetailModuleKey[]
  onPatch: (patch: UpdateEventDto) => void
  /** 전투서열·병기·교리 모듈 펼치기 (진영이 아직 없으면 기본 진영도 함께 생성) */
  onShowForces: () => void | Promise<void>
  /** 수치 모듈 펼치기 — 저장 없음 */
  onShowMetrics: () => void
  /**
   * 'directory'(기본) = 활성 모듈 아래에 놓이는 한 줄 설명형 추가 디렉터리.
   * 'cards' = 켠 모듈이 하나도 없을 때 빈 탭에 펼쳐 보여 주는 원장 목록.
   */
  variant?: 'directory' | 'cards'
}

/** 모듈이 무엇을 기록하는지 한 줄 안내 */
const MODULE_DESCRIPTION: Record<EventDetailModuleKey, string> = {
  metrics: '병력·사상자·피해액·득표율 등 숫자로 남는 지표를 출처·추정 범위와 함께 비교합니다.',
  sides: '각 진영에 투입된 군사 부대(전투서열), 병기·장비, 진영별 작전 목표·교리를 기록합니다.',
  'military-details': '작전 목적·전술·전략·전투 유형·전쟁 비용 등 군사 작전 세부 사실을 적습니다.',
  cabinets: '이 사건을 다룬 각국 행정부(내각)를 확인합니다.',
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
  onShowForces,
  onShowMetrics,
  variant = 'directory',
}: ModuleAddProps) {
  /**
   * 모듈 추가 직후 *해당 모듈이 enabledModules에 들어오는 순간* 스크롤한다.
   */
  const [pendingScrollKey, setPendingScrollKey] = useState<EventDetailModuleKey | null>(null)

  useEffect(() => {
    if (!pendingScrollKey) return
    if (!enabledModules.includes(pendingScrollKey)) return
    const targetId = `module-${pendingScrollKey}`
    const raf = window.requestAnimationFrame(() => {
      const node = document.getElementById(targetId)
      node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    setPendingScrollKey(null)
    return () => window.cancelAnimationFrame(raf)
  }, [pendingScrollKey, enabledModules])

  const features = eventTypeFeatures(event.type, event.domain)

  const allOptions: ModuleOption[] = [
    {
      key: 'metrics',
      label: features.metricsMenuLabel,
      run: onShowMetrics,
    },
    {
      key: 'sides',
      label: '전투서열 · 병기 · 교리',
      run: onShowForces,
    },
    {
      key: 'military-details',
      label: '작전 정보',
      run: () => onPatch(buildMilitaryPatch(event, (current) => ({ ...(current ?? {}) }))),
    },
  ]

  const options = allOptions.filter((opt) => !enabledModules.includes(opt.key))
  const isMilitaryContext =
    event.domain === 'MILITARY' ||
    features.suggestedModules.includes('military-details') ||
    features.suggestedModules.includes('sides')
  const suggestedOptions = features.suggestedModules
    .filter((key) => key !== 'sides' || isMilitaryContext)
    .flatMap((key) => options.filter((opt) => opt.key === key))
  const otherOptions = options.filter((opt) => !suggestedOptions.includes(opt))
  const primaryOptions =
    suggestedOptions.length > 0
      ? suggestedOptions
      : options.filter((opt) => opt.key === 'metrics')
  const foldedOptions = otherOptions.filter((opt) => !primaryOptions.includes(opt))
  const [showFolded, setShowFolded] = useState(false)

  if (options.length === 0) return null

  const apply = (opt: ModuleOption) => {
    void opt.run()
    setPendingScrollKey(opt.key)
  }

  if (variant === 'cards') {
    return (
      <CardList aria-label="붙일 수 있는 기능">
        {[...primaryOptions, ...(showFolded ? foldedOptions : [])].map((opt) => (
          <OptionRow key={opt.key} type="button" onClick={() => apply(opt)}>
            <Dot $color={MODULE_COLOR[opt.key]} />
            <CardText>
              <CardTitle>
                {opt.label}
                {suggestedOptions.includes(opt) && <CardBadge>이 분류에 권장</CardBadge>}
              </CardTitle>
              <CardHint>{MODULE_DESCRIPTION[opt.key]}</CardHint>
            </CardText>
            <CardAction aria-hidden>
              <FiPlus />
              시작
            </CardAction>
          </OptionRow>
        ))}
        {foldedOptions.length > 0 && !showFolded && (
          <MoreToggle type="button" onClick={() => setShowFolded(true)}>
            <FiChevronDown aria-hidden />
            다른 기능 {foldedOptions.length}개 더 보기 ({foldedOptions.map((opt) => opt.label).join(' · ')})
          </MoreToggle>
        )}
      </CardList>
    )
  }

  const orderedOptions = [...suggestedOptions, ...otherOptions]

  return (
    <DirectorySection aria-label="추가 기록 모듈">
      <DirectoryHeader>
        <strong>추가 기록 모듈</strong>
        <small>이 사건에 필요한 기록만 선택해 켭니다. 시작하면 위에 새 섹션이 열립니다.</small>
      </DirectoryHeader>
      <DirectoryList>
        {orderedOptions.map((opt) => (
          <CollapsedActorSlot key={opt.key}>
            <CollapsedActorInfo>
              <OptionTitleInline>
                <Dot $color={MODULE_COLOR[opt.key]} />
                <strong>{opt.label}</strong>
                {suggestedOptions.includes(opt) && <CardBadge>권장</CardBadge>}
              </OptionTitleInline>
              <span>{MODULE_DESCRIPTION[opt.key]}</span>
            </CollapsedActorInfo>
            <CollapsedActorChipBtn type="button" onClick={() => apply(opt)}>
              <FiPlus size={12} aria-hidden />
              {opt.label} 시작
            </CollapsedActorChipBtn>
          </CollapsedActorSlot>
        ))}
      </DirectoryList>
    </DirectorySection>
  )
}

const DirectorySection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-top: 40px;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const DirectoryHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  strong {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  small {
    font-size: 13px;
    line-height: 1.55;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const DirectoryList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  @container eventdetail (min-width: 1180px) {
    &:has(> :nth-child(2)) {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 40px;
      align-items: stretch;
    }
  }
`

const OptionTitleInline = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
`

const Dot = styled.span<{ $color?: string }>`
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color, theme }) => $color ?? theme.colors.text.tertiary};
  flex-shrink: 0;
`

/* ── 빈 '진영·수치' 탭 목록 (중첩 카드 없이 평면 원장 행) ── */

const MoreToggle = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0 2px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 2px;
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  @container eventdetail (min-width: 1180px) {
    &:has(> button:nth-child(2)) {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 28px;
    }
  }
`

const OptionRow = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 6px;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  font: inherit;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: background 0.14s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.text.primary};
    outline-offset: -2px;
  }
`

const CardText = styled.span`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
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
  font-weight: 650;
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
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    width: 12px;
    height: 12px;
  }

  ${OptionRow}:hover & {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
