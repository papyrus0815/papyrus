/**
 * 등록 모달 — **세부 분야** 칸. 분야 바로 아래, '분야 › 세부'의 2단계(선택).
 *
 * 분야가 '무엇에 관한 일인가'라면 세부는 '어떤 꼴의 일인가'다(entities/event/model/event-type-registry.ts).
 * 그 분야에서 쓰이는 세부를 앞에 보이고 나머지는 '더 보기'에 둔다 — 저장은 독립 축이라 군사 › 조약,
 * 경제 › 법령처럼 무엇이든 고를 수 있다. 세부는 붙는 기록도 정한다(전투 → 교전 양측, 조약 → 맺어진 조약).
 * 다시 누르면 해제된다.
 */
import { useState } from 'react'

import styled from 'styled-components'

import {
  EVENT_TYPES,
  type EventTypeKey,
  FACET_LABEL,
  subtypesForDomain,
} from '@/entities/event/model/event-type-registry'
import { KitChipGroup, KitChoiceChip } from '@/shared/ui/register-form-kit/register-form-kit'

interface EventTypeFieldProps {
  /** 고른 분야 이름 — 앞에 보일 세부를 정한다. 없으면 안내만 */
  domain: string | null
  value: EventTypeKey | null
  onChange: (next: EventTypeKey | null) => void
}

export function EventTypeField({ domain, value, onChange }: EventTypeFieldProps) {
  const { primary, rest } = subtypesForDomain(domain)
  /* 고른 세부가 '더 보기' 쪽이면 펼친 채로 — 고른 값이 안 보이면 안 된다 */
  const [showRest, setShowRest] = useState(false)
  const expanded = showRest || (value !== null && rest.includes(value))

  if (!domain) {
    return <Hint>분야를 고르면 그 분야의 세부(전투·조약·법령…)가 여기 나옵니다.</Hint>
  }

  const selected = value ? EVENT_TYPES[value] : null
  const records = selected ? selected.core.filter((facet) => facet !== 'participants') : []
  const chip = (type: EventTypeKey) => (
    <KitChoiceChip
      key={type}
      type="button"
      role="radio"
      aria-checked={value === type}
      $selected={value === type}
      title={EVENT_TYPES[type].examples}
      onClick={() => onChange(value === type ? null : type)}
    >
      {EVENT_TYPES[type].label}
    </KitChoiceChip>
  )

  return (
    <Wrap>
      <KitChipGroup role="radiogroup" aria-label={`${domain}의 세부 분야`}>
        {primary.map(chip)}
        {expanded && rest.map(chip)}
        {rest.length > 0 && !expanded && (
          <MoreButton type="button" onClick={() => setShowRest(true)}>
            더 보기 ({rest.length})
          </MoreButton>
        )}
      </KitChipGroup>
      <Hint>
        {selected ? (
          <>
            <span>
              {domain} › {selected.label} — 예: {selected.examples}
            </span>
            {records.length > 0 && (
              <span>
                붙는 기록 <b>{records.map((facet) => FACET_LABEL[facet]).join(' · ')}</b> — 아래 &lsquo;기록&rsquo;에서 바로
                적습니다
              </span>
            )}
          </>
        ) : (
          <span>선택 — 고르면 그 꼴에 맞는 기록 칸이 열립니다(전투면 교전 양측, 조약이면 맺어진 조약).</span>
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
