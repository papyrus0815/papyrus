import React from 'react'
import styled, { css } from 'styled-components'

import { type PersonResponseDto as Person } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { getPositionColor } from '@/shared/lib/position-color'
import { InfluenceBadge } from '@/shared/ui/influence-badge'
import { FOCUS_COLOR } from '@/shared/ui/register-form-layout'

interface PersonCardProps {
  person: Person
  index: number
  onClick: () => void
  dynastyName?: string | null
}

export function PersonCard({ person, onClick, dynastyName }: PersonCardProps) {
  const fullName = getPersonDisplayName(person)
  const birthYear = person.birthYear
  const deathYear = person.deathYear
  const isBirthBc = person.birthEra === 'BC'
  const isDeathBc = person.deathEra === 'BC'

  const ageAtDeath =
    birthYear != null && deathYear != null && !isBirthBc && !isDeathBc
      ? deathYear - birthYear
      : null

  const lifePct =
    ageAtDeath != null
      ? Math.min(Math.max(ageAtDeath, 4), 100)
      : birthYear != null ? 8 : 0

  const primaryTenure = (person as any).governmentTenures?.[0]
  const primaryPositionType =
    primaryTenure?.positionDefinition?.positionType ?? primaryTenure?.positionType
  const accentColor = getPositionColor(primaryPositionType)
  const displayImage = person.profileImageUrl

  return (
    <Card
      type="button"
      aria-label={`${fullName || '이름 없음'} 상세 보기`}
      onClick={onClick}
    >
      <ImageSide>
        <InfluenceBadge
          influence={(person as { influence?: number | null }).influence}
          variant="overlay"
        />
        {displayImage ? (
          <Img src={displayImage} alt={fullName} loading="lazy" decoding="async" />
        ) : (
          <ImgPlaceholder $color={accentColor}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </ImgPlaceholder>
        )}
      </ImageSide>

      <Content>
        <Name>{fullName}</Name>

        <LifespanRow>
          {birthYear != null ? (
            <>
              <LifespanYear>
                {isBirthBc ? 'BC ' : ''}{Math.abs(birthYear)}
              </LifespanYear>
              <LifespanTrack>
                <LifespanFill $color={accentColor} $pct={lifePct} />
              </LifespanTrack>
              <LifespanYear>
                {deathYear != null
                  ? `${isDeathBc ? 'BC ' : ''}${Math.abs(deathYear)}`
                  : '現'}
              </LifespanYear>
              {ageAtDeath != null && (
                <LifespanAge>· {ageAtDeath}세</LifespanAge>
              )}
            </>
          ) : (
            <LifespanYearMuted>생몰년 미상</LifespanYearMuted>
          )}
        </LifespanRow>

        {dynastyName && (
          <MetaRow>
            <MetaLabel>가문</MetaLabel>
            <MetaValue>{dynastyName}</MetaValue>
          </MetaRow>
        )}
      </Content>
    </Card>
  )
}

const Card = styled.button`
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  cursor: pointer;
  min-height: 112px;
  transition: box-shadow 0.25s ease, transform 0.25s ease;
  padding: 0;
  margin: 0;
  border: none;
  font: inherit;
  color: inherit;
  text-align: left;
  width: 100%;

  &:focus-visible {
    outline: 2px solid ${FOCUS_COLOR};
    outline-offset: 2px;
  }

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset,
            0 2px 12px rgba(0, 0, 0, 0.28);
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 1px 0 rgba(255, 255, 255, 0.08) inset,
              0 10px 32px rgba(0, 0, 0, 0.42);
          }
        `
      : css`
          background: #ffffff;
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.06),
            0 4px 12px rgba(0, 0, 0, 0.04);
          &:hover {
            transform: translateY(-2px);
            box-shadow:
              0 4px 8px rgba(0, 0, 0, 0.06),
              0 12px 28px rgba(0, 0, 0, 0.08);
          }
        `}
`

const ImageSide = styled.div`
  width: 106px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f3f4f6'};
`

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.25s ease;
  ${Card}:hover & {
    transform: scale(1.04);
  }
`

const ImgPlaceholder = styled.div<{ $color: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color, theme }) =>
    theme.mode === 'dark' ? `${$color}18` : `${$color}12`};
  color: ${({ $color }) => $color};
  opacity: 0.55;
  svg {
    width: 34px;
    height: 34px;
  }
`

const Content = styled.div`
  flex: 1;
  min-width: 0;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
`

const Name = styled.h3`
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const LifespanRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
`

const LifespanYear = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
`

const LifespanYearMuted = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.55;
  letter-spacing: 0.01em;
`

const LifespanTrack = styled.div`
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e9ecef'};
  position: relative;
  overflow: hidden;
`

const LifespanFill = styled.div<{ $color: string; $pct: number }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${({ $pct }) => $pct}%;
  min-width: 6px;
  background: ${({ $color }) => $color};
  border-radius: 2px;
  opacity: 0.75;
`

const LifespanAge = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
`

const MetaRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`

const MetaLabel = styled.span`
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const MetaValue = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`
