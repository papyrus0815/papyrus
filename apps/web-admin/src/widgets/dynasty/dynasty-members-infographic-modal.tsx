/**
 * 가문에 소속된 인물을 출생년 순 타임라인·카드 그리드로 표시 (대시보드 가문용)
 */
import { useQuery } from '@tanstack/react-query'
import { FiUsers, FiX } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { personApi, type Person } from '@/shared/api/person'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

export type DynastyMembersInfographicModalProps = {
  dynastyId: string
  dynastyName: string
  isOpen: boolean
  onClose: () => void
}

function formatYearLabel(era: string | null | undefined, year: number | null | undefined): string {
  if (year == null || !Number.isFinite(year)) return ''
  const prefix = era === 'BC' ? 'BC ' : ''
  return `${prefix}${year}`
}

function formatLifespan(p: Person): string {
  const b = formatYearLabel(p.birthEra ?? null, p.birthYear ?? null)
  const d = p.isAlive
    ? '—'
    : formatYearLabel(p.deathEra ?? null, p.deathYear ?? null)
  if (!b && !d) return '연도 미상'
  if (!b) return `? — ${d || '?'}`
  if (p.isAlive) return `${b} —`
  return `${b} — ${d || '?'}`
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

export function DynastyMembersInfographicModal({
  dynastyId,
  dynastyName,
  isOpen,
  onClose,
}: DynastyMembersInfographicModalProps) {
  const { data: persons = [], isLoading, isError, error } = useQuery({
    queryKey: ['persons-by-dynasty', dynastyId],
    queryFn: () => personApi.getByDynastyId(dynastyId),
    enabled: isOpen && Boolean(dynastyId),
    staleTime: 60_000,
  })

  if (!isOpen) return null

  return (
    <Overlay
      role="dialog"
      aria-modal
      aria-labelledby="dynasty-members-title"
      onClick={onClose}
    >
      <Panel onClick={(e) => e.stopPropagation()}>
        <PanelHeader>
          <HeaderLead>
            <HeaderIcon aria-hidden>
              <FiUsers size={20} strokeWidth={1.75} />
            </HeaderIcon>
            <div>
              <PanelTitle id="dynasty-members-title">가문 인물 인포그래픽</PanelTitle>
              <PanelSubtitle>{dynastyName}</PanelSubtitle>
            </div>
          </HeaderLead>
          <CloseBtn type="button" aria-label="닫기" onClick={onClose}>
            <FiX size={22} />
          </CloseBtn>
        </PanelHeader>

        <PanelBody>
          {isLoading && <StatusMsg>인물을 불러오는 중…</StatusMsg>}
          {isError && (
            <StatusMsg $err>
              {error instanceof Error && error.message
                ? error.message
                : '목록을 불러오지 못했습니다.'}
            </StatusMsg>
          )}
          {!isLoading && !isError && persons.length === 0 && (
            <StatusMsg>이 가문에 등록된 인물이 없습니다. 인물 카드에서 가문을 지정해 주세요.</StatusMsg>
          )}
          {!isLoading && !isError && persons.length > 0 && (
            <>
              <TimelineLegend>
                출생년이 알려진 인물은 앞쪽에, 연도 미상은 뒤에 표시됩니다. 가로는 시간 흐름을 나타냅니다.
              </TimelineLegend>
              <TimelineTrack aria-hidden>
                <TimelineLine />
              </TimelineTrack>
              <CardGrid>
                {persons.map((p) => (
                  <MemberCard key={p.id}>
                    <CardYear>{formatLifespan(p)}</CardYear>
                    <MemberAvatar person={p} />
                    <CardName>{getPersonDisplayName(p, true)}</CardName>
                    {p.regnalName?.trim() ? (
                      <CardRegnal>{p.regnalName.trim()}</CardRegnal>
                    ) : null}
                    {p.country?.name ? <CardMeta>{p.country.name}</CardMeta> : null}
                  </MemberCard>
                ))}
              </CardGrid>
            </>
          )}
        </PanelBody>
      </Panel>
    </Overlay>
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
`

const Panel = styled.div`
  width: 100%;
  max-width: 1100px;
  max-height: min(90vh, 920px);
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: #14141c;
          border: 1px solid rgba(255, 255, 255, 0.08);
        `
      : css`
          background: #fff;
          border: 1px solid #e5e7eb;
        `}
`

const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
`

const HeaderLead = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

const HeaderIcon = styled.div`
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
`

const PanelTitle = styled.h2`
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PanelSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CloseBtn = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PanelBody = styled.div`
  padding: 20px 22px 28px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
`

const StatusMsg = styled.p<{ $err?: boolean }>`
  margin: 32px 0;
  text-align: center;
  font-size: 14px;
  color: ${({ theme, $err }) =>
    $err ? theme.colors.error : theme.colors.text.secondary};
`

const TimelineLegend = styled.p`
  margin: 0 0 16px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TimelineTrack = styled.div`
  position: relative;
  height: 10px;
  margin-bottom: 20px;
`

const TimelineLine = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 3px;
  margin-top: -1.5px;
  border-radius: 999px;
  background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
  opacity: 0.35;
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
  gap: 18px;
`

const MemberCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 12px 18px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 8px 24px ${({ theme }) => theme.colors.shadow.md};
  }
`

const CardYear = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 10px;
`

const AvatarWrap = styled.div<{ $has: boolean }>`
  width: 72px;
  height: 72px;
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
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : '#e2e8f0'};
  background: ${({ $has, theme }) =>
    $has
      ? 'transparent'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#f1f5f9'};
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

const CardName = styled.div`
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

const CardRegnal = styled.div`
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CardMeta = styled.div`
  margin-top: 6px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
