import React from 'react'

import { FiAward, FiLock } from 'react-icons/fi'
import styled from 'styled-components'

import type { Badge } from './gamification.api'

/** BADGE_FRAME 코스메틱 (본인 화면에서 획득 뱃지에 테두리/광채 적용). */
export interface BadgeFrameCosmetic {
  borderStyle?: string
  shadowEffect?: string
}

/** 뱃지 그리드 — 획득/미획득을 함께 보여준다(미획득은 흐리게 + 자물쇠). */
export const BadgeList: React.FC<{
  badges: Badge[]
  compact?: boolean
  /** 장착한 뱃지 테두리 코스메틱(획득 뱃지에만 적용) */
  frame?: BadgeFrameCosmetic | null
}> = ({ badges, compact, frame }) => {
  return (
    <Grid $compact={!!compact}>
      {badges.map((badge) => (
        <Item key={badge.code} $earned={badge.earned} title={`${badge.label} — ${badge.description}`}>
          <IconWrap
            $color={badge.color}
            $earned={badge.earned}
            style={
              frame && badge.earned
                ? { border: frame.borderStyle, boxShadow: frame.shadowEffect }
                : undefined
            }
          >
            {badge.earned ? <FiAward size={compact ? 14 : 18} /> : <FiLock size={compact ? 12 : 15} />}
          </IconWrap>
          {!compact && (
            <Meta>
              <Name $earned={badge.earned}>{badge.label}</Name>
              <Desc>{badge.description}</Desc>
              {!badge.earned && badge.target > 1 && (
                <Progress>
                  <ProgressTrack>
                    <ProgressFill
                      $color={badge.color}
                      style={{ width: `${Math.round((badge.current / badge.target) * 100)}%` }}
                    />
                  </ProgressTrack>
                  <ProgressLabel>
                    {badge.current}/{badge.target}
                  </ProgressLabel>
                </Progress>
              )}
            </Meta>
          )}
        </Item>
      ))}
    </Grid>
  )
}

const Grid = styled.div<{ $compact: boolean }>`
  display: grid;
  gap: ${({ $compact }) => ($compact ? '6px' : '10px')};
  grid-template-columns: ${({ $compact }) =>
    $compact ? 'repeat(auto-fill, minmax(34px, 1fr))' : 'repeat(auto-fill, minmax(200px, 1fr))'};
`

const Item = styled.div<{ $earned: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: ${({ theme }) => theme && '8px'};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary};
  opacity: ${({ $earned }) => ($earned ? 1 : 0.55)};
`

const IconWrap = styled.div<{ $color: string; $earned: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border-radius: 50%;
  color: ${({ $color, $earned, theme }) => ($earned ? $color : theme.colors.text.tertiary)};
  background: ${({ $color, $earned }) => ($earned ? `${$color}22` : 'transparent')};
  border: 1px solid
    ${({ $color, $earned, theme }) => ($earned ? `${$color}55` : theme.colors.border ?? '#0001')};
`

const Meta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const Name = styled.div<{ $earned: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Desc = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Progress = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
`

const ProgressTrack = styled.div`
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  overflow: hidden;
`

const ProgressFill = styled.div<{ $color: string }>`
  height: 100%;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  transition: width 0.4s ease;
`

const ProgressLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`
