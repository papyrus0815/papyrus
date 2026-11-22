import { FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  MOTION,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'

import * as S from '../styles'

/**
 * 개요 본문이 완전히 비어 있을 때의 시작 가이드 —
 * 빽빽한 가로줄 대신 각 서사 단계(핵심 요약 · 배경 · 전개 · 여파)가 무슨 역할인지
 * 한눈에 파악하고 클릭 한 번으로 바로 작성에 들어갈 수 있는 정돈된 스타터 그리드로 안내한다.
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
    step: string
    label: string
    hint: string
    actionLabel: string
    primary?: boolean
    onClick: () => void
  }> = [
    ...(onWriteSummary
      ? [
          {
            key: 'summary',
            step: '도입',
            label: '사건 핵심 요약',
            hint: '이 사건이 언제·누구 사이에서 일어난 어떤 사건이며 역사적으로 어떤 의의를 지니는지 한두 문단으로 먼저 개괄합니다.',
            actionLabel: '요약 작성하기',
            primary: true,
            onClick: onWriteSummary,
          },
        ]
      : []),
    {
      key: 'background',
      step: '01 · 원인',
      label: '배경',
      hint: '사건이 일어나게 된 구조적 원인, 직전 정세, 직접적인 도화선을 기록합니다.',
      actionLabel: '배경 작성하기',
      onClick: onWriteBackground,
    },
    ...(onWriteNarrative
      ? [
          {
            key: 'narrative',
            step: '02 · 경과',
            label: '전개',
            hint: '사건의 발단부터 주요 전환점·결말까지 시간 흐름에 따라 단락으로 나누어 기록합니다.',
            actionLabel: '전개 작성하기',
            onClick: onWriteNarrative,
          },
        ]
      : []),
    {
      key: 'aftermath',
      step: isSingleEvent ? '03 · 결과' : '02 · 결과',
      label: '여파',
      hint: '사건 직후의 결과와 제도·영토·국제질서·후속 사건에 미친 파장을 기록합니다.',
      actionLabel: '여파 작성하기',
      onClick: onWriteAftermath,
    },
  ]

  return (
    <NoticeSection
      role="region"
      aria-label={isSingleEvent ? '사건 본문 작성 시작' : '묶음 사건 전체 글 작성 시작'}
    >
      <S.SectionHeaderGroup>
        <S.SectionHeader>
          <S.SectionTitle>
            {isSingleEvent ? '사건 서사 기록하기' : '묶음 사건 개괄 기록하기'}
          </S.SectionTitle>
        </S.SectionHeader>
        <NoticeSubtitle>
          {isSingleEvent
            ? '아직 작성된 본문이 없습니다. 읽는 사람이 사건의 전모를 한눈에 이해할 수 있도록 핵심 요약부터 작성하거나 필요한 단계만 선택해 기록하세요.'
            : '세부 사건들의 흐름은 아래 ‘전개(하위 사건)’에서 다루고, 여기에는 이 묶음 사건 전체를 아우르는 핵심 요약과 배경·여파를 기록합니다.'}
        </NoticeSubtitle>
      </S.SectionHeaderGroup>

      <StarterGrid>
        {slots.map((slot) => (
          <StarterSlot key={slot.key} type="button" onClick={slot.onClick}>
            <StarterTop>
              <StepKicker>{slot.step}</StepKicker>
              <StarterTitle>{slot.label}</StarterTitle>
              <StarterHint>{slot.hint}</StarterHint>
            </StarterTop>
            <StarterCta $primary={slot.primary}>
              <FiPlus size={13} aria-hidden />
              {slot.actionLabel}
            </StarterCta>
          </StarterSlot>
        ))}
      </StarterGrid>
    </NoticeSection>
  )
}

const NoticeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  padding-bottom: 12px;
`

const NoticeSubtitle = styled.p`
  margin: 0;
  max-width: ${S.PROSE_MAX_WIDTH};
  word-break: keep-all;
  font-size: 13px;
  line-height: 1.6;
  color: ${metaText};
`

const StarterGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;

  @container eventdetail (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px 24px;
  }
`

const StarterSlot = styled.button`
  appearance: none;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const StarterTop = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const StepKicker = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const StarterTitle = styled.strong`
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StarterHint = styled.span`
  font-size: 13px;
  line-height: 1.6;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StarterCta = styled.span<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 650;
  color: ${({ theme, $primary }) =>
    $primary ? ledgerAccent(theme.mode) : theme.colors.text.primary};

  ${StarterSlot}:hover & {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`
