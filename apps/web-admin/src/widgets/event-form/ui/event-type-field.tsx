/**
 * 등록 모달 — **세부 분야** 칸. 분야 바로 아래, '분야 › 세부'의 2단계(선택).
 *
 * 분야가 '무엇에 관한 일인가'라면 세부는 '어떤 꼴의 일인가'다(entities/event/model/event-type-registry.ts).
 * 그 분야에서 쓰이는 세부를 앞에 보이고 나머지는 '다른 세부 더 보기'에 의미군별로 묶어 둔다 — 저장은
 * 독립 축이라 군사 › 조약, 경제 › 법령처럼 무엇이든 고를 수 있다. 분야를 고르기 전에도 자주 쓰는
 * 세부를 먼저 고르면 어울리는 분야가 함께 선택된다. 다시 누르면 해제된다.
 */
import React, { useEffect, useRef, useState } from 'react'

import styled from 'styled-components'

import { domainLabel } from '@/entities/event/model/event-domain'
import {
  EVENT_TYPE_GROUPS,
  EVENT_TYPE_ORDER,
  EVENT_TYPES,
  type EventTypeKey,
  FACET_LABEL,
  FREQUENT_EVENT_TYPES,
  formatDomainPath,
  groupSubtypes,
  subtypesForDomain,
} from '@/entities/event/model/event-type-registry'
import {
  KitChipGroup,
  KitChoiceChip,
  KitGroupLabel,
} from '@/shared/ui/register-form-kit/register-form-kit'

export interface EventTypeFieldProps {
  /** 고른 분야 키(MILITARY…) — 앞에 보일 세부를 정한다. 없으면 자주 쓰는 세부 + 전체 보기 */
  domain: string | null
  value: EventTypeKey | null
  onChange: (next: EventTypeKey | null) => void
  /** 편집 모드 여부 — 편집 모드는 하단 '기록' 섹션을 렌더하지 않으므로 안내 문구를 달리한다 */
  isEditMode?: boolean
}

export function EventTypeField({
  domain,
  value,
  onChange,
  isEditMode = false,
}: EventTypeFieldProps) {
  const { primary, rest } = subtypesForDomain(domain)
  const [showRest, setShowRest] = useState(false)
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])

  /* 분야가 바뀌면 펼쳐 둔 '더 보기'를 접는다 */
  useEffect(() => {
    setShowRest(false)
  }, [domain])

  const selected = value ? EVENT_TYPES[value] : null
  const records = selected ? selected.core.filter((facet) => facet !== 'participants') : []

  const isNoDomain = !domain
  const isOtherDomain = domain === 'OTHER'
  const lockedInRest = value !== null && (isNoDomain ? !FREQUENT_EVENT_TYPES.includes(value) : rest.includes(value))
  const expanded = showRest || lockedInRest

  /* 현재 화면에 그려지는 칩 순서 — 방향키 이동과 탭 정지점(roving tabIndex)의 기준 */
  const visibleTypes: EventTypeKey[] = isNoDomain
    ? expanded
      ? EVENT_TYPE_GROUPS.flatMap((group) => group.types)
      : FREQUENT_EVENT_TYPES
    : isOtherDomain
      ? EVENT_TYPE_GROUPS.flatMap((group) => group.types)
      : expanded
        ? [...primary, ...groupSubtypes(rest).flatMap((group) => group.types)]
        : primary

  const selectedIndex = value ? visibleTypes.indexOf(value) : -1
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = buttonsRef.current.findIndex((button) => button === document.activeElement)
    if (current < 0 || visibleTypes.length === 0) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      const next = (current + 1) % visibleTypes.length
      buttonsRef.current[next]?.focus()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      const prev = (current - 1 + visibleTypes.length) % visibleTypes.length
      buttonsRef.current[prev]?.focus()
    }
  }

  let runningIndex = 0
  const chip = (type: EventTypeKey) => {
    const index = runningIndex
    runningIndex += 1
    const isSelected = value === type
    return (
      <KitChoiceChip
        key={type}
        ref={(element) => {
          buttonsRef.current[index] = element
        }}
        type="button"
        role="radio"
        aria-checked={isSelected}
        tabIndex={index === tabStop ? 0 : -1}
        $selected={isSelected}
        title={EVENT_TYPES[type].examples}
        onClick={() => onChange(isSelected ? null : type)}
      >
        {EVENT_TYPES[type].label}
      </KitChoiceChip>
    )
  }

  const groupLabel = domain ? `${domainLabel(domain)}의 세부 분야` : '세부 분야'

  return (
    <Wrap>
      <RadioHost role="radiogroup" aria-label={groupLabel} onKeyDown={handleKeyDown}>
        {isNoDomain ? (
          expanded ? (
            <GroupStack>
              {EVENT_TYPE_GROUPS.map((group) => (
                <GroupBlock key={group.label}>
                  <KitGroupLabel>{group.label}</KitGroupLabel>
                  <KitChipGroup>{group.types.map(chip)}</KitChipGroup>
                </GroupBlock>
              ))}
              {!lockedInRest && (
                <MoreRow>
                  <MoreButton type="button" onClick={() => setShowRest(false)}>
                    자주 쓰는 세부만 보기
                  </MoreButton>
                </MoreRow>
              )}
            </GroupStack>
          ) : (
            <KitChipGroup>
              {FREQUENT_EVENT_TYPES.map(chip)}
              <MoreButton type="button" onClick={() => setShowRest(true)}>
                전체 세부 보기 ({EVENT_TYPE_ORDER.length})
              </MoreButton>
            </KitChipGroup>
          )
        ) : isOtherDomain ? (
          <GroupStack>
            {EVENT_TYPE_GROUPS.map((group) => (
              <GroupBlock key={group.label}>
                <KitGroupLabel>{group.label}</KitGroupLabel>
                <KitChipGroup>{group.types.map(chip)}</KitChipGroup>
              </GroupBlock>
            ))}
          </GroupStack>
        ) : (
          <GroupStack>
            <KitChipGroup>
              {primary.map(chip)}
              {rest.length > 0 && !expanded && (
                <MoreButton type="button" onClick={() => setShowRest(true)}>
                  다른 세부 더 보기 ({rest.length})
                </MoreButton>
              )}
            </KitChipGroup>
            {expanded && rest.length > 0 && (
              <RestSection>
                {groupSubtypes(rest).map((group) => (
                  <GroupBlock key={group.label}>
                    <KitGroupLabel>{group.label}</KitGroupLabel>
                    <KitChipGroup>{group.types.map(chip)}</KitChipGroup>
                  </GroupBlock>
                ))}
                {!lockedInRest && (
                  <MoreRow>
                    <MoreButton type="button" onClick={() => setShowRest(false)}>
                      기본 세부만 보기
                    </MoreButton>
                  </MoreRow>
                )}
              </RestSection>
            )}
          </GroupStack>
        )}
      </RadioHost>
      <Hint>
        {selected ? (
          <>
            <span>
              {formatDomainPath(domain ?? selected.defaultDomain, selected.key)} — 예: {selected.examples}
            </span>
            {records.length > 0 && (
              <span>
                {isEditMode ? (
                  <>
                    핵심 기록 <b>{records.map((facet) => FACET_LABEL[facet]).join(' · ')}</b> — 상세 화면에서
                    편집합니다
                  </>
                ) : (
                  <>
                    붙는 기록 <b>{records.map((facet) => FACET_LABEL[facet]).join(' · ')}</b> — 아래
                    &lsquo;기록&rsquo;에서 바로 적습니다
                  </>
                )}
              </span>
            )}
          </>
        ) : domain ? (
          <span>선택 — 고르면 그 꼴에 맞는 기록 칸이 열립니다(전투면 교전 양측, 조약이면 맺어진 조약).</span>
        ) : (
          <span>선택 — 분야를 먼저 고르거나, 여기서 세부를 고르면 어울리는 분야가 함께 선택됩니다.</span>
        )}
      </Hint>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const RadioHost = styled.div`
  outline: none;
`

const GroupStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const GroupBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const RestSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.light};
`

const MoreRow = styled.div`
  display: flex;
  align-items: center;
`

const Hint = styled.p`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const MoreButton = styled.button`
  padding: 6px 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.light};
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`
