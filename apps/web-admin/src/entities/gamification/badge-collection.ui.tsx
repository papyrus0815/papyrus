import React from 'react'

import { FiAward, FiLock } from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

import type { Badge } from './gamification.api'

/** ISO → YYYY.MM.DD */
function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

/** 희귀도 문구 — 보유 비율이 낮을수록 희귀(자랑거리) */
function rarityText(b: Badge): string | null {
  if (b.rarityPct == null) return null
  if (b.holdersCount <= 0) return null
  if (b.rarityPct <= 0) return '전체의 1% 미만 보유'
  return `전체의 ${b.rarityPct}%만 보유`
}

const isRare = (b: Badge) => b.rarityPct != null && b.rarityPct > 0 && b.rarityPct <= 10

/**
 * 뱃지 컬렉션 쇼케이스 — 획득 뱃지를 크게 전시(희귀도·획득일)하고,
 * 미획득은 '도전 과제'로 분리해 진행도를 보여준다. 수집 완성도 미터 포함.
 */
export const BadgeCollection: React.FC<{ badges: Badge[] }> = ({ badges }) => {
  const earned = badges.filter((b) => b.earned)
  const locked = badges.filter((b) => !b.earned)
  const pct = badges.length > 0 ? Math.round((earned.length / badges.length) * 100) : 0

  return (
    <Wrap>
      {/* 완성도 미터 */}
      <Meter>
        <MeterTop>
          <MeterTitle>컬렉션 완성도</MeterTitle>
          <MeterCount>
            <b>{earned.length}</b> / {badges.length}
          </MeterCount>
        </MeterTop>
        <MeterTrack>
          <MeterFill style={{ width: `${pct}%` }} />
        </MeterTrack>
      </Meter>

      {/* 획득 쇼케이스 */}
      {earned.length > 0 ? (
        <Showcase>
          {earned.map((b) => (
            <EarnedCard key={b.code} $color={b.color} title={b.description}>
              {isRare(b) && <RareTag>희귀</RareTag>}
              <IconCircle $color={b.color}>
                <FiAward size={22} />
              </IconCircle>
              <EName>{b.label}</EName>
              {rarityText(b) && <Rarity>{rarityText(b)}</Rarity>}
              {b.earnedAt && <EDate>{fmtDate(b.earnedAt)} 획득</EDate>}
            </EarnedCard>
          ))}
        </Showcase>
      ) : (
        <Empty>아직 획득한 뱃지가 없어요. 콘텐츠를 등록해 첫 뱃지를 수집해보세요!</Empty>
      )}

      {/* 도전 과제(미획득) */}
      {locked.length > 0 && (
        <>
          <SectionLabel>도전 과제 ({locked.length})</SectionLabel>
          <LockedList>
            {locked.map((b) => (
              <LockedItem key={b.code} title={b.description}>
                <LockedIcon>
                  <FiLock size={14} />
                </LockedIcon>
                <LockedBody>
                  <LockedName>{b.label}</LockedName>
                  <LockedDesc>{b.description}</LockedDesc>
                  {b.target > 1 && (
                    <Progress>
                      <ProgressTrack>
                        <ProgressFill
                          $color={b.color}
                          style={{ width: `${Math.round((b.current / b.target) * 100)}%` }}
                        />
                      </ProgressTrack>
                      <ProgressLabel>
                        {b.current}/{b.target}
                      </ProgressLabel>
                    </Progress>
                  )}
                </LockedBody>
              </LockedItem>
            ))}
          </LockedList>
        </>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

/* 완성도 미터 */
const Meter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const MeterTop = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`

const MeterTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MeterCount = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    font-size: 16px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const MeterTrack = styled.div`
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  overflow: hidden;
`

const MeterFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #f59e0b, #ec4899);
  transition: width 0.5s ease;
`

/* 획득 쇼케이스 */
const Showcase = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
`

const shine = keyframes`
  0% { transform: translateX(-120%) rotate(8deg); }
  100% { transform: translateX(220%) rotate(8deg); }
`

const EarnedCard = styled.div<{ $color: string }>`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 14px 10px;
  border-radius: 14px;
  background: ${({ $color }) => `${$color}14`};
  border: 1px solid ${({ $color }) => `${$color}55`};

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
    animation: ${shine} 3.5s ease-in-out infinite;
  }
`

const RareTag = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(90deg, #ef4444, #ec4899);
  z-index: 1;
`

const IconCircle = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}26`};
  border: 1px solid ${({ $color }) => `${$color}66`};
`

const EName = styled.div`
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Rarity = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
`

const EDate = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Empty = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  padding: 4px 0;
`

/* 도전 과제 */
const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LockedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const LockedItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary};
  opacity: 0.85;
`

const LockedIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.tertiary};
`

const LockedBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`

const LockedName = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LockedDesc = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Progress = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
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
