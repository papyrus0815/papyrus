import React from 'react'

import { FiAward } from 'react-icons/fi'
import styled from 'styled-components'

import { fmtNum, gradeMeta } from './grade.model'
import type { PointSummary } from './gamification.api'

/** 등급 칩 — 등급명 + (선택)점수. 헤더/프로필 등에서 재사용. */
export const GradeChip: React.FC<{
  gradeCode: string | null | undefined
  points?: number | null
}> = ({ gradeCode, points }) => {
  const meta = gradeMeta(gradeCode)
  return (
    <Chip $color={meta.color} $bg={meta.bg} title={`${meta.label} 등급`}>
      <FiAward size={11} />
      <span>{meta.label}</span>
      {points != null && <Pts>{fmtNum(points)}P</Pts>}
    </Chip>
  )
}

/** 프로필용 등급 카드 — 등급 칩 + 다음 등급까지 진행 바. */
export const GradeProgressCard: React.FC<{ summary: PointSummary }> = ({ summary }) => {
  const meta = gradeMeta(summary.gradeCode)
  const pct = Math.round((summary.progressRatio ?? 0) * 100)
  const nextMeta = summary.nextGradeCode ? gradeMeta(summary.nextGradeCode) : null
  return (
    <Card>
      <CardTop>
        <TopLeft>
          <GradeChip gradeCode={summary.gradeCode} />
          {summary.rank != null && <RankPill>전체 {fmtNum(summary.rank)}위</RankPill>}
        </TopLeft>
        <Total>{fmtNum(summary.totalPoints)}P</Total>
      </CardTop>
      <Track>
        <Fill $color={meta.color} style={{ width: `${pct}%` }} />
      </Track>
      <CardFoot>
        {nextMeta ? (
          <span>
            {nextMeta.label}까지 <b>{fmtNum(summary.pointsToNext)}P</b>
          </span>
        ) : (
          <span>최고 등급 달성 🎉</span>
        )}
        <span>등록 {fmtNum(summary.contributionCount)}건</span>
      </CardFoot>
    </Card>
  )
}

const Chip = styled.span<{ $color: string; $bg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.6;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  white-space: nowrap;
`

const Pts = styled.span`
  font-weight: 700;
  opacity: 0.85;
`

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0 2px;
`

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const TopLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const RankPill = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const Total = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Track = styled.div`
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  overflow: hidden;
`

const Fill = styled.div<{ $color: string }>`
  height: 100%;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  transition: width 0.4s ease;
`

const CardFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`
