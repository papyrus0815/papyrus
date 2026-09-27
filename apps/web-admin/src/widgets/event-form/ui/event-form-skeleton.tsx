/**
 * 사건 등록 폼 스켈레톤 — 폼 청크(lazy)와 수정 모드의 사건 불러오기 동안 **폼과 같은 격자**로
 * 자리를 잡아 둔다.
 *
 * 예전엔 빈 모달 가운데 13px '폼을 불러오는 중...' 한 줄이었다. 모달 높이 600px이 통째로 비어
 * '고장 난 화면'처럼 읽혔고, 폼이 뜨는 순간 내용이 위에서부터 한꺼번에 들이찼다. 같은 자리·같은
 * 모양(라벨 열 + 입력칸 막대)을 먼저 그려 두면 폼은 제자리에 채워지기만 한다.
 *
 * 격자 치수는 `pages/events/create/event-create.styles`의 FormRow(200px | 1fr, gap 24, 행 여백 20)
 * 를 따른다 — 거기를 바꾸면 여기도 같이 바꿀 것.
 */
import React from 'react'

import styled, { css } from 'styled-components'

import { shimmerAnimation } from '@/pages/events/styles/shared.styles'

export const EventFormSkeleton: React.FC<{ label?: string }> = ({
  label = '폼을 불러오는 중',
}) => (
  <Root role="status" aria-busy="true" aria-live="polite">
    <SrOnly>{label}</SrOnly>
    {/* 사건명 */}
    <Row>
      <Label $w={56} />
      <Field>
        <Bar $h={40} />
        <Bar $h={10} $w="34%" $soft />
      </Field>
    </Row>
    {/* 기간 — 시작/종료 × 날짜/시간 */}
    <Row>
      <Label $w={40} />
      <Field>
        <TwoCols>
          <Bar $h={10} $w="22%" $soft />
          <Bar $h={10} $w="22%" $soft />
          <Bar $h={36} />
          <Bar $h={36} />
          <Bar $h={36} />
          <Bar $h={36} />
        </TwoCols>
      </Field>
    </Row>
    {/* 상위 사건 */}
    <Row>
      <Label $w={72} />
      <Field>
        <Bar $h={34} $w="136px" />
      </Field>
    </Row>
    {/* 카테고리 칩 */}
    <Row>
      <Label $w={64} />
      <Field>
        <Chips>
          {[74, 70, 96, 70, 70, 88, 70, 92, 70, 70, 96].map((width, index) => (
            <Bar key={index} $h={34} $w={`${width}px`} $pill />
          ))}
        </Chips>
      </Field>
    </Row>
    {/* 개요 설명 */}
    <Row $last>
      <Label $w={64} />
      <Field>
        <Bar $h={112} />
      </Field>
    </Row>
  </Root>
)

const Root = styled.div`
  display: flex;
  flex-direction: column;
`

const Row = styled.div<{ $last?: boolean }>`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
  align-items: start;
  padding: 20px 0;
  border-bottom: ${({ $last, theme }) =>
    $last ? 'none' : `1px solid ${theme.colors.border.light}`};

  &:first-child {
    padding-top: 4px;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 160px 1fr;
    gap: 16px;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 16px 0;
  }
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 680px;
  min-width: 0;
`

const TwoCols = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const barBg = css`
  background: linear-gradient(
    90deg,
    ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)'}
      0%,
    ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.09)'}
      50%,
    ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)'}
      100%
  );
  ${shimmerAnimation}
`

const Label = styled.span<{ $w: number }>`
  display: block;
  width: ${({ $w }) => $w}px;
  height: 14px;
  margin-top: 12px;
  border-radius: 4px;
  ${barBg}

  @media (max-width: 768px) {
    margin-top: 0;
  }
`

const Bar = styled.span<{ $h: number; $w?: string; $pill?: boolean; $soft?: boolean }>`
  display: block;
  width: ${({ $w }) => $w ?? '100%'};
  height: ${({ $h }) => $h}px;
  border-radius: ${({ $pill, $h }) => ($pill ? '999px' : $h <= 12 ? '4px' : '8px')};
  opacity: ${({ $soft }) => ($soft ? 0.7 : 1)};
  ${barBg}
`

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`
