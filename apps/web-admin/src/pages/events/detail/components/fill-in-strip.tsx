import { FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import {
  MOTION,
  RADIUS,
  ledgerAccent,
  ledgerHairline,
  ledgerHairlineStrong,
} from '@/pages/events/ledger/styles/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'

import * as S from '../styles'
import { type FoldableSectionId } from './section-outline.lib'

interface FillInStripProps {
  items: ReadonlyArray<{ id: FoldableSectionId; fillLabel: string }>
  onReveal: (id: FoldableSectionId) => void
}

/**
 * 더 채울 수 있는 것 — 내용이 없어 본문에서 접힌 섹션들의 자리.
 *
 * 예전엔 빈 섹션마다 제목 + 편집 블록(조약 만들기·상위 사건 지정·최상위로 지정·추가 상위·
 * 하위 추가·관련 사건 연결·이미지 업로드·URL 추가…)이 그대로 서서, 대부분의 사건에서
 * 본문이 끝난 뒤 화면 1/3이 빈 편집 화면이었다(톨비악 전투: 본문 뒤 약 1,700px).
 * 읽는 사람에겐 소음이고, 채우는 사람에겐 이 한 줄이면 충분하다 — 누르면 그 섹션이
 * 제자리에 펼쳐지고 그리로 스크롤된다.
 */
export function FillInStrip({ items, onReveal }: FillInStripProps) {
  if (items.length === 0) return null
  return (
    <Strip id="fill-in" aria-labelledby="fill-in-title">
      <StripTitle id="fill-in-title">더 채울 수 있는 것</StripTitle>
      <Chips>
        {items.map((item) => (
          <Chip key={item.id} type="button" onClick={() => onReveal(item.id)}>
            <FiPlus aria-hidden />
            {item.fillLabel}
          </Chip>
        ))}
      </Chips>
    </Strip>
  )
}

const Strip = styled(S.Section)`
  gap: 10px;
  padding-top: 18px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

/* 섹션 제목(20px)이 아니라 장부 라벨 크기 — 이건 본문 섹션이 아니라 편집 안내다. */
const StripTitle = styled.h2`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${metaText};
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    color ${MOTION.fast},
    border-color ${MOTION.fast};

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`
