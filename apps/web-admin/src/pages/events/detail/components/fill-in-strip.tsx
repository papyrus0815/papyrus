import { FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerHairline, ledgerHairlineStrong } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'

import * as S from '../styles'
import {
  CollapsedActorChipBtn,
  CollapsedActorInfo,
  CollapsedActorSlot,
} from './actors/actors.styles'
import { type FoldableSectionId } from './section-outline.lib'

interface FillInStripProps {
  items: ReadonlyArray<{
    id: FoldableSectionId
    label?: string
    fillLabel: string
    hint?: string
  }>
  onReveal: (id: FoldableSectionId) => void
}

/**
 * 추가로 작성할 수 있는 항목 — 내용이 비어 본문에서 접어 둔 섹션들을
 * 항목명 + 1줄 용도 설명 + [+ 작성] 버튼의 평면 hairline 행으로 안내한다.
 */
export function FillInStrip({ items, onReveal }: FillInStripProps) {
  if (items.length === 0) return null
  return (
    <Strip id="fill-in" aria-labelledby="fill-in-title">
      <StripHeader>
        <StripTitle id="fill-in-title">추가로 작성할 수 있는 항목</StripTitle>
        <StripSubtitle>
          아직 비어 있어 접어 둔 섹션입니다. 필요한 항목만 열어 기록합니다.
        </StripSubtitle>
      </StripHeader>
      <SlotList>
        {items.map((item) => (
          <CollapsedActorSlot key={item.id}>
            <CollapsedActorInfo>
              <strong>{item.label ?? item.fillLabel}</strong>
              {item.hint && <span>{item.hint}</span>}
            </CollapsedActorInfo>
            <CollapsedActorChipBtn type="button" onClick={() => onReveal(item.id)}>
              <FiPlus size={12} aria-hidden />
              {item.fillLabel}
            </CollapsedActorChipBtn>
          </CollapsedActorSlot>
        ))}
      </SlotList>
    </Strip>
  )
}

const Strip = styled(S.Section)`
  gap: 10px;
  width: 100%;
  padding-top: 18px;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const StripHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const StripTitle = styled.h2`
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StripSubtitle = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${metaText};
`

const SlotList = styled.div`
  display: flex;
  flex-direction: column;

  @container eventdetail (min-width: 1180px) {
    &:has(> :nth-child(2)) {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 28px;
      align-items: stretch;

      > :nth-child(-n + 2) {
        border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
      }
    }
  }
`
