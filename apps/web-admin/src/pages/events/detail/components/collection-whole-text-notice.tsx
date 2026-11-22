import { FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerHairline } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'

import {
  CollapsedActorChipBtn,
  CollapsedActorInfo,
  CollapsedActorSlot,
} from './actors/actors.styles'

/**
 * 개요 본문이 비어 있을 때의 시작 안내 — 점선 칩이나 흩어진 밑줄 글자 대신
 * 항목명 + 1줄 용도 설명 + [+ 쓰기] 버튼의 평면 hairline 행으로 통일한다.
 */
export function CollectionWholeTextNotice({
  onWriteSummary,
  onWriteBackground,
  onWriteNarrative,
  onWriteAftermath,
}: {
  /** 요약도 비었으면 — 빈 요약 자리표시를 따로 세우지 않고 여기서 쓴다 */
  onWriteSummary?: () => void
  onWriteBackground: () => void
  /** 단일 사건의 '아직 글이 없다' 안내로 쓸 때 — 단일 사건은 전개도 제 글이라 전개 쓰기가 붙는다 */
  onWriteNarrative?: () => void
  onWriteAftermath: () => void
}) {
  const isSingleEvent = Boolean(onWriteNarrative)
  const slots: Array<{
    key: string
    label: string
    hint: string
    actionLabel: string
    onClick: () => void
  }> = [
    ...(onWriteSummary
      ? [
          {
            key: 'summary',
            label: '요약',
            hint: '이 사건이 무엇이었는지 핵심 성격을 한두 문단으로 먼저 요약합니다.',
            actionLabel: '요약 쓰기',
            onClick: onWriteSummary,
          },
        ]
      : []),
    {
      key: 'background',
      label: '배경',
      hint: '사건이 일어나게 된 원인, 구조적 맥락, 직전 정세를 기록합니다.',
      actionLabel: '배경 쓰기',
      onClick: onWriteBackground,
    },
    ...(onWriteNarrative
      ? [
          {
            key: 'narrative',
            label: '전개',
            hint: '사건의 발단·전환점·결말이 흘러간 경과를 시간순 단락으로 기록합니다.',
            actionLabel: '전개 쓰기',
            onClick: onWriteNarrative,
          },
        ]
      : []),
    {
      key: 'aftermath',
      label: '여파',
      hint: '사건 직후의 결과와 제도·국제질서·후속 사건에 미친 영향을 기록합니다.',
      actionLabel: '여파 쓰기',
      onClick: onWriteAftermath,
    },
  ]

  return (
    <NoticeSection role="region" aria-label={isSingleEvent ? '사건 본문 작성 시작' : '묶음 사건 전체 글 작성 시작'}>
      <NoticeHeader>
        <NoticeTitle>
          {isSingleEvent ? '본문 글 시작하기' : '묶음 사건 전체 글 시작하기'}
        </NoticeTitle>
        <NoticeSubtitle>
          {isSingleEvent
            ? '아직 작성된 본문이 없습니다. 요약부터 적거나 배경·전개·여파 중 필요한 항목을 열어 기록합니다.'
            : '세부 경과는 아래 하위 사건들이 맡고, 여기에는 묶음 사건 전체를 아우르는 글을 기록합니다.'}
        </NoticeSubtitle>
      </NoticeHeader>
      <SlotList>
        {slots.map((slot) => (
          <CollapsedActorSlot key={slot.key}>
            <CollapsedActorInfo>
              <strong>{slot.label}</strong>
              <span>{slot.hint}</span>
            </CollapsedActorInfo>
            <CollapsedActorChipBtn type="button" onClick={slot.onClick}>
              <FiPlus size={12} aria-hidden />
              {slot.actionLabel}
            </CollapsedActorChipBtn>
          </CollapsedActorSlot>
        ))}
      </SlotList>
    </NoticeSection>
  )
}

const NoticeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
`

const NoticeHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const NoticeTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const NoticeSubtitle = styled.p`
  margin: 0;
  word-break: keep-all;
  font-size: 12.5px;
  line-height: 1.55;
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
