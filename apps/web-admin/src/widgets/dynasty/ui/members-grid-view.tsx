/**
 * 가문 구성원 카드 그리드 — 재위 배지 + 클릭 시 인물 상세로 이동.
 */
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { Person } from '@/shared/api/person'
import { getUploadImageUrl } from '@/shared/api/upload'
import { formatLifespan as formatLifespanText } from '@/shared/lib/lifespan-text'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

interface Props {
  persons: Person[]
}

function signedYear(era: 'BC' | 'AD' | null | undefined, year: number): number {
  return era === 'BC' ? -year : year
}

/** 생몰 한 줄 — 정본 formatLifespan에 위임(부호연도 어댑트). 빈 문자열이면 '연도 미상' 폴백. */
function formatLifespan(p: Person): string {
  return (
    formatLifespanText({
      birthYear: p.birthYear != null ? signedYear(p.birthEra, p.birthYear) : null,
      deathYear: p.deathYear != null ? signedYear(p.deathEra, p.deathYear) : null,
      isAlive: p.isAlive ?? undefined,
    }) || '연도 미상'
  )
}

function ageOf(p: Person): number | null {
  if (p.birthYear == null) return null
  const start = signedYear(p.birthEra ?? null, p.birthYear)
  if (p.isAlive) return new Date().getFullYear() - start
  if (p.deathYear == null) return null
  const end = signedYear(p.deathEra ?? null, p.deathYear)
  return end - start
}

function MemberAvatar({ person }: { person: Person }) {
  const src = person.profileImageUrl?.trim()
    ? getUploadImageUrl(person.profileImageUrl) || person.profileImageUrl
    : ''
  const displayName = getPersonDisplayName(person, true).trim()
  const initial = [...displayName][0] ?? '?'
  return (
    <AvatarWrap $has={Boolean(src)}>
      {src ? (
        <AvatarImg
          src={src}
          alt={displayName ? `${displayName} 프로필 사진` : ''}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <AvatarInitial aria-hidden>{initial}</AvatarInitial>
      )}
    </AvatarWrap>
  )
}

const IconCrown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M5 17h14v2H5v-2zm0-2l-2-9 5.5 4L12 4l3.5 6L21 6l-2 9H5z" />
  </svg>
)

export function MembersGridView({ persons }: Props) {
  const navigate = useNavigate()

  return (
    <Grid>
      {persons.map((p) => {
        const isRuling = !!p.regnalName?.trim()
        const isAlive = !!p.isAlive
        const age = ageOf(p)
        return (
          <Card
            key={p.id}
            type="button"
            onClick={() => navigate(pathKeys.personsTimelineDetail(p.id))}
          >
            <Header>
              <YearLine>{formatLifespan(p)}</YearLine>
              {isRuling && (
                <RulingBadge title="재위 인물">
                  <IconCrown /> 재위
                </RulingBadge>
              )}
              {!isRuling && isAlive && <AliveDot title="생존" />}
            </Header>
            <MemberAvatar person={p} />
            <Name>{getPersonDisplayName(p, true)}</Name>
            {p.regnalName?.trim() && (
              <Regnal>{p.regnalName.trim()}</Regnal>
            )}
            <MetaLine>
              {age != null && (
                <MetaPiece>{age}세{isAlive ? '+' : ''}</MetaPiece>
              )}
              {p.country?.name && (
                <MetaPiece>
                  {p.country.flagEmoji ? `${p.country.flagEmoji} ` : ''}
                  {p.country.name}
                </MetaPiece>
              )}
            </MetaLine>
            {p.influence != null && p.influence > 0 && (
              <InfluenceBar
                title={`영향력 ${p.influence}`}
                aria-label={`영향력 ${p.influence}`}
              >
                <InfluenceFill style={{ width: `${Math.min(100, p.influence)}%` }} />
              </InfluenceBar>
            )}
          </Card>
        )
      })}
    </Grid>
  )
}

/* ─── styles ───────────────────────────────────────────────────────────── */

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
  gap: 14px;
`

const Card = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 14px 12px 16px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 8px 22px ${({ theme }) => theme.colors.shadow.md};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  margin-bottom: 8px;
`

const YearLine = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.primary};
`

const RulingBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  border-radius: 999px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(255,214,10,0.18)' : 'rgba(245,158,11,0.14)'};
  color: ${({ theme }) =>
    isDark(theme.mode) ? '#ffd60a' : '#b45309'};
`

const AliveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.success};
  box-shadow: 0 0 0 2px
    ${({ theme }) =>
      isDark(theme.mode) ? 'rgba(48,209,88,0.18)' : 'rgba(16,185,129,0.18)'};
`

const AvatarWrap = styled.div<{ $has: boolean }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  border: 2px solid
    ${({ $has, theme }) =>
      $has
        ? 'transparent'
        : theme.colors.border.default};
  background: ${({ $has, theme }) =>
    $has ? 'transparent' : theme.colors.background.tertiary};
`

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const AvatarInitial = styled.span`
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Name = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

const Regnal = styled.div`
  margin-top: 3px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaLine = styled.div`
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaPiece = styled.span`
  &:not(:last-child)::after {
    content: '·';
    margin-left: 6px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const InfluenceBar = styled.div`
  margin-top: 8px;
  width: 100%;
  height: 3px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  border-radius: 999px;
  overflow: hidden;
`

const InfluenceFill = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.colors.primary};
  ${css`
    transition: width 0.2s ease;
  `}
`
