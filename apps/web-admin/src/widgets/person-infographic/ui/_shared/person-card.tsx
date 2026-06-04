/**
 * 시대 스토리/왕조 등 카드 그리드에서 사용하는 인물 카드.
 *
 * 이름·국가·소속·직책에 검색어 하이라이트 적용.
 * 핀 토글, 군주/국가원수 배지, 분야 태그, 영향력 게이지 포함.
 */
import type React from 'react'
import { memo, useMemo } from 'react'
import styled, { css } from 'styled-components'

import type { AdaptedPerson } from '../../model/types'
import { highlight } from './highlight'

type EraConf = { color: string; lbl: string }

interface PersonCardProps {
  p: AdaptedPerson
  era: EraConf
  q: string
  pinned: boolean
  onTogglePin: (id: string, e: React.MouseEvent) => void
  onOpen: (id: string) => void
}

function PersonCardItemBase({
  p,
  era,
  q,
  pinned,
  onTogglePin,
  onOpen,
}: PersonCardProps) {
  // bio 정규식 2회는 biography가 안 바뀌면 재실행 불필요 (카드 다수 + 부모 재정렬 리렌더 누적)
  const bioTooltip = useMemo(
    () =>
      p.biography
        ? p.biography
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 240)
        : undefined,
    [p.biography],
  )
  return (
    <EraCard $pinned={pinned} title={bioTooltip} onClick={() => onOpen(p.id)}>
      <EraCardThumbWrap $color={era.color}>
        {p.profileImageUrl ? (
          <EraCardThumbImg src={p.profileImageUrl} alt={p.name} loading="lazy" />
        ) : (
          <EraCardThumbGradient $color={era.color}>
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              width={46}
              height={46}
              role="img"
              aria-label="인물 기본 아이콘"
            >
              <circle cx="24" cy="18" r="8" />
              <path d="M8 40c0-8.8 7.2-14 16-14s16 5.2 16 14" />
            </svg>
          </EraCardThumbGradient>
        )}
        {(p.isMonarch || p.isHeadOfState) && (
          <EraCardBadge
            title={p.isMonarch ? '군주' : '국가원수'}
            aria-label={p.isMonarch ? '군주' : '국가원수'}
            style={{ background: p.isMonarch ? '#b45309' : '#1d4ed8' }}
          >
            {p.isMonarch ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width={11} height={11}>
                <path d="M5 16L3 5l5.5 4L12 4l3.5 5L21 5l-2 11H5zm0 2v2h14v-2H5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width={11} height={11}>
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            )}
          </EraCardBadge>
        )}
        <EraCardPin
          $active={pinned}
          onClick={(e) => onTogglePin(p.id, e)}
          title={pinned ? '핀 해제' : '핀 고정'}
          aria-label={pinned ? '핀 해제' : '핀 고정'}
          aria-pressed={pinned}
          type="button"
        >
          <svg
            viewBox="0 0 24 24"
            fill={pinned ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
            width={12}
            height={12}
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </EraCardPin>
        <EraCardFieldTag $color={era.color}>{p.field}</EraCardFieldTag>
      </EraCardThumbWrap>
      <EraCardBody>
        <EraName title={p.name}>{highlight(p.name, q)}</EraName>
        {p.primaryTitle && (
          <EraPrimaryTitle title={p.primaryTitle}>
            {highlight(p.primaryTitle, q)}
          </EraPrimaryTitle>
        )}
        <EraCountryRow>
          <EraCountryName title={p.country}>
            {highlight(p.country, q)}
          </EraCountryName>
          {p.faction && (
            <EraFaction title={p.faction}>
              · {highlight(p.faction, q)}
            </EraFaction>
          )}
        </EraCountryRow>
        <EraYear>
          {p.born < 0 ? `${-p.born}BC` : p.born}
          {' – '}
          {p.isAlive ? '현재' : p.died < 0 ? `${-p.died}BC` : p.died}
          {p.age != null && ` · ${p.age}세`}
        </EraYear>
        <EraInfluenceRow>
          <EraBarTrack>
            <EraBarFill
              style={{ width: p.influence + '%', background: era.color }}
            />
          </EraBarTrack>
          <EraInfluenceValue>{p.influence}</EraInfluenceValue>
        </EraInfluenceRow>
      </EraCardBody>
    </EraCard>
  )
}

/**
 * 부모(시대/왕조 뷰)의 재정렬·핀 토글 시 동일 props 카드의 리렌더 차단.
 * p(어댑트 캐시)·era(ERAS 상수)·콜백 모두 참조 안정적이라 기본 shallow 비교로 충분.
 */
export const PersonCardItem = memo(PersonCardItemBase)

export const EraCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(172px, 1fr));
  gap: 12px;
`

const EraCard = styled.div<{ $pinned?: boolean }>`
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.14s, box-shadow 0.14s, background 0.14s;
  ${({ theme, $pinned }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid
            ${$pinned ? '#fbbf24' : 'rgba(255,255,255,0.07)'};
          &:hover {
            background: rgba(255, 255, 255, 0.07);
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
          }
        `
      : css`
          background: ${theme.colors.background.secondary};
          border: 1px solid
            ${$pinned ? '#f59e0b' : theme.colors.border.light};
          &:hover {
            background: ${theme.colors.background.tertiary};
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
          }
        `}
`

const EraCardThumbWrap = styled.div<{ $color: string }>`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
`

const EraCardThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
`

const EraCardThumbGradient = styled.div<{ $color: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  ${({ theme, $color }) =>
    theme.mode === 'dark'
      ? css`
          background: radial-gradient(circle at 30% 25%, ${$color}22, transparent 62%),
            linear-gradient(160deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015));
          color: ${$color};
          opacity: 0.88;
        `
      : css`
          background: radial-gradient(circle at 30% 25%, ${$color}1a, transparent 65%),
            linear-gradient(160deg, #ffffff, #eef1f5);
          color: ${$color};
          opacity: 0.72;
        `}
`

const EraCardBadge = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
`

const EraCardPin = styled.button<{ $active: boolean }>`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.14s, color 0.14s, transform 0.14s, opacity 0.14s;
  ${({ $active }) =>
    $active
      ? css`
          background: #fbbf24;
          color: #1f1200;
          opacity: 1;
        `
      : css`
          background: rgba(0, 0, 0, 0.4);
          color: #fff;
          opacity: 0;
          ${EraCard}:hover &, &:focus-visible {
            opacity: 1;
          }
          &:hover {
            background: rgba(0, 0, 0, 0.6);
            transform: scale(1.08);
          }
        `}
`

const EraCardFieldTag = styled.span<{ $color: string }>`
  position: absolute;
  bottom: 6px;
  right: 6px;
  font-size: 9px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 10px;
  background: ${({ $color }) => $color}ee;
  color: #fff;
  letter-spacing: 0.02em;
`

const EraCardBody = styled.div`
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const EraName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const EraPrimaryTitle = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const EraCountryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
`

const EraCountryName = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
  max-width: 60%;
`

const EraFaction = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`

const EraYear = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const EraInfluenceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
`

const EraBarTrack = styled.div`
  flex: 1;
  height: 5px;
  border-radius: 3px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f3f4f6'};
`

const EraBarFill = styled.div`
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
`

const EraInfluenceValue = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
  min-width: 20px;
  text-align: right;
`
