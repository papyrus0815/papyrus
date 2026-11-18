import React from 'react'
import { FiArrowUpRight } from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { type PersonResponseDto as Person } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { getPositionColor } from '@/shared/lib/position-color'
import { InfluenceBadge } from '@/shared/ui/influence-badge'
import { FOCUS_COLOR } from '@/shared/ui/register-form-layout'

export interface PersonCardProps {
  person: Person
  index?: number
  onClick: () => void
  onOpenDetail?: () => void
  dynastyName?: string | null
  roleLabel?: string | null
  roleColor?: string | null
}

function toSignedYear(
  year: number | null | undefined,
  era?: string | null,
): number | null {
  if (year == null || !Number.isFinite(year)) return null
  return era === 'BC' ? -Math.abs(year) : Math.abs(year)
}

export function PersonCard({
  person,
  onClick,
  onOpenDetail,
  dynastyName,
  roleLabel,
  roleColor,
}: PersonCardProps) {
  const fullName = getPersonDisplayName(person, true) || person.name
  const birthYear = person.birthYear
  const deathYear = person.deathYear
  const isBirthBc = person.birthEra === 'BC'
  const isDeathBc = person.deathEra === 'BC'

  const signedBirth = toSignedYear(birthYear, person.birthEra)
  const signedDeath = toSignedYear(deathYear, person.deathEra)
  const ageAtDeath =
    signedBirth != null && signedDeath != null && signedDeath >= signedBirth
      ? signedDeath - signedBirth - (signedBirth < 0 && signedDeath > 0 ? 1 : 0)
      : null

  const lifePct =
    ageAtDeath != null
      ? Math.min(Math.max(ageAtDeath, 6), 100)
      : birthYear != null
        ? 14
        : 0

  const primaryTenure = (
    person as Person & {
      jobTitle?: string | null
      governmentTenures?: Array<{
        title?: string | null
        positionType?: string | null
        positionDefinition?: {
          title?: string | null
          name?: string | null
          positionType?: string | null
        } | null
      }>
    }
  ).governmentTenures?.[0]
  const primaryPositionType =
    primaryTenure?.positionDefinition?.positionType ?? primaryTenure?.positionType
  const accentColor = roleColor || getPositionColor(primaryPositionType)
  const resolvedRole =
    roleLabel ??
    primaryTenure?.title?.trim() ??
    primaryTenure?.positionDefinition?.title?.trim() ??
    primaryTenure?.positionDefinition?.name?.trim() ??
    (person as Person & { jobTitle?: string | null }).jobTitle?.trim() ??
    null

  const displayImage = person.profileImageUrl
    ? getUploadImageUrl(person.profileImageUrl)
    : null

  return (
    <CardShell>
      <CardMainBtn
        type="button"
        aria-label={`${fullName || '이름 없음'} 미리보기`}
        onClick={onClick}
      >
        <ImageSide>
          <InfluenceBadge
            influence={(person as { influence?: number | null }).influence}
            variant="overlay"
          />
          {displayImage ? (
            <Img
              src={displayImage}
              alt={fullName}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <ImgPlaceholder $color={accentColor}>
              <span>{(fullName || '?').slice(0, 1)}</span>
            </ImgPlaceholder>
          )}
        </ImageSide>

        <Content>
          <NameRow>
            <RoleDot $color={accentColor} aria-hidden />
            <Name title={fullName}>{fullName}</Name>
          </NameRow>

          {resolvedRole && (
            <RoleBadge title={resolvedRole}>{resolvedRole}</RoleBadge>
          )}

          <LifespanRow>
            {birthYear != null || deathYear != null ? (
              <>
                <LifespanYear>
                  {birthYear != null
                    ? `${isBirthBc ? 'BC ' : ''}${Math.abs(birthYear)}`
                    : '?'}
                </LifespanYear>
                <LifespanTrack>
                  <LifespanFill $color={accentColor} $pct={lifePct} />
                </LifespanTrack>
                <LifespanYear>
                  {deathYear != null
                    ? `${isDeathBc ? 'BC ' : ''}${Math.abs(deathYear)}`
                    : '現'}
                </LifespanYear>
                {ageAtDeath != null && ageAtDeath >= 0 && (
                  <LifespanAge>{ageAtDeath}세</LifespanAge>
                )}
              </>
            ) : (
              <LifespanYearMuted>생몰년 미상</LifespanYearMuted>
            )}
          </LifespanRow>

          {dynastyName && (
            <MetaRow>
              <MetaBadge>{dynastyName}</MetaBadge>
            </MetaRow>
          )}
        </Content>
      </CardMainBtn>

      {onOpenDetail && (
        <CornerDetailBtn
          type="button"
          onClick={onOpenDetail}
          title={`${fullName} 연보 페이지 열기`}
          aria-label={`${fullName} 연보 페이지 열기`}
        >
          <FiArrowUpRight size={13} />
        </CornerDetailBtn>
      )}
    </CardShell>
  )
}

const CardShell = styled.div`
  position: relative;
  border-radius: ${RADIUS.MD};
  overflow: hidden;
  display: flex;
  align-items: stretch;
  min-height: 100px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: none;
  transition:
    border-color 0.14s ease,
    background 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const CardMainBtn = styled.button`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex: 1;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${FOCUS_COLOR};
    outline-offset: -2px;
  }
`

const CornerDetailBtn = styled.button`
  position: absolute;
  top: 7px;
  right: 7px;
  width: 24px;
  height: 24px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const ImageSide = styled.div`
  width: 84px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
`

const ImgPlaceholder = styled.div<{ $color: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color, theme }) =>
    theme.mode === 'dark' ? `${$color}1c` : `${$color}12`};
  color: ${({ $color }) => $color};
  font-size: 18px;
  font-weight: 800;
`

const Content = styled.div`
  flex: 1;
  min-width: 0;
  padding: 11px 13px;
  padding-right: 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
`

const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const RoleDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const Name = styled.h4`
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RoleBadge = styled.span`
  align-self: flex-start;
  max-width: 100%;
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(165, 180, 252, 0.12)'
      : 'rgba(79, 70, 229, 0.08)'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const LifespanRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`

const LifespanYear = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  flex-shrink: 0;
  ${DIGIT_DISPLAY}
`

const LifespanYearMuted = styled.span`
  font-size: 10.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.7;
`

const LifespanTrack = styled.div`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  position: relative;
  overflow: hidden;
  min-width: 24px;
`

const LifespanFill = styled.div<{ $color: string; $pct: number }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${({ $pct }) => $pct}%;
  min-width: 5px;
  background: ${({ $color }) => $color};
  border-radius: 2px;
  opacity: 0.8;
`

const LifespanAge = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;
  ${DIGIT_DISPLAY}
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const MetaBadge = styled.span`
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`
