/**
 * 인물 상세 — 소속 그룹(세대·계파·동기) 섹션.
 * "같은 가문 구성원"(SameDynastyMembersSection) 패턴을 미러 — 묶음별로 가로 스크롤 멤버 스트립.
 * 한 인물은 여러 묶음에 속할 수 있어 그룹마다 한 줄씩 렌더.
 */
import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FiLayers, FiSettings } from 'react-icons/fi'
import styled from 'styled-components'

import type { Person } from '@/shared/api/person'
import {
  getPersonGroupsByPerson,
  type PersonGroup,
} from '@/shared/api/person-groups'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { PersonGroupManageModal } from '@/widgets/person/person-group-manage-modal/person-group-manage-modal'
import { GroupTypeBadge } from '@/widgets/person/person-group-ui/group-type-ui'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

interface Props {
  currentPersonId: string
  currentPersonName?: string
  /** 다른 인물 카드 클릭 시 핸들러 (모달 스택 푸시 등). */
  onPersonClick?: (personId: string) => void
}

function signedYear(era: 'BC' | 'AD' | null | undefined, year: number): number {
  return era === 'BC' ? -year : year
}

function formatYearLabel(
  era: 'BC' | 'AD' | null | undefined,
  year: number | null | undefined,
): string {
  if (year == null || !Number.isFinite(year)) return ''
  return era === 'BC' ? `BC ${year}` : `${year}`
}

function lifespan(p: Person): string {
  const b = formatYearLabel(p.birthEra ?? null, p.birthYear ?? null)
  const d = p.isAlive
    ? '—'
    : formatYearLabel(p.deathEra ?? null, p.deathYear ?? null)
  if (!b && !d) return '연도 미상'
  if (!b) return `? — ${d || '?'}`
  if (p.isAlive) return `${b} —`
  return `${b} — ${d || '?'}`
}

/**
 * 멤버 정렬: 세대(GENERATION)는 출생순이 자연스럽고,
 * 그 외(계파·동기 등)는 백엔드 sortOrder(수동 정렬)를 존중.
 */
function sortMembers(group: PersonGroup) {
  if (group.type === 'GENERATION') {
    return [...group.members].sort((a, b) => {
      const ya =
        a.person.birthYear != null
          ? signedYear(a.person.birthEra ?? null, a.person.birthYear)
          : Number.POSITIVE_INFINITY
      const yb =
        b.person.birthYear != null
          ? signedYear(b.person.birthEra ?? null, b.person.birthYear)
          : Number.POSITIVE_INFINITY
      return ya - yb
    })
  }
  // 백엔드가 이미 sortOrder→createdAt으로 정렬해 내려줌 — 순서 유지
  return group.members
}

export function SamePersonGroupSection({
  currentPersonId,
  currentPersonName,
  onPersonClick,
}: Props) {
  const [showManage, setShowManage] = useState(false)
  const navigate = useNavigate()

  const {
    data: groups = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['person-groups-by-person', currentPersonId],
    queryFn: () => getPersonGroupsByPerson(currentPersonId),
    enabled: Boolean(currentPersonId),
    staleTime: 60_000,
  })

  const sortedGroups = useMemo(
    () =>
      [...groups].sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.name.localeCompare(b.name, 'ko'),
      ),
    [groups],
  )

  return (
    <Wrap>
      <HeaderRow>
        <HeaderTitle>
          <FiLayers size={14} strokeWidth={2.2} />
          소속 그룹
          <Hint>같은 세대·계파·동기</Hint>
        </HeaderTitle>
        <ManageBtn
          type="button"
          onClick={() => setShowManage(true)}
          aria-label="소속 그룹 관리"
        >
          <FiSettings size={13} />
          그룹 관리
        </ManageBtn>
      </HeaderRow>

      {isLoading ? (
        <Strip>
          {Array.from({ length: 5 }, (_, i) => (
            <SkCard key={i} />
          ))}
        </Strip>
      ) : isError ? (
        <StatusMsg $err>소속 그룹을 불러오지 못했습니다.</StatusMsg>
      ) : sortedGroups.length === 0 ? (
        <StatusMsg>
          아직 소속된 묶음이 없습니다. ‘그룹 관리’에서 세대·계파·동기를 만들어
          보세요.
        </StatusMsg>
      ) : (
        <Groups>
          {sortedGroups.map((group) => {
            const members = sortMembers(group)
            return (
              <GroupBlock key={group.id}>
                <GroupHead>
                  <GroupTypeBadge type={group.type} />
                  <GroupName
                    type="button"
                    onClick={() =>
                      navigate(pathKeys.personGroupDetail(group.id))
                    }
                    title="묶음 상세 보기"
                  >
                    {group.name}
                  </GroupName>
                  {group.type === 'GENERATION' &&
                    group.generationOrder != null && (
                      <OrdinalBadge>{group.generationOrder}세대</OrdinalBadge>
                    )}
                  {group.center && (
                    <CenterChip title="구심점">
                      ★ {getPersonDisplayName(group.center, true)}
                    </CenterChip>
                  )}
                  {(group.predecessor || group.successors.length > 0) && (
                    <SuccessionHint
                      type="button"
                      onClick={() =>
                        navigate(pathKeys.personGroupDetail(group.id))
                      }
                      title="세대 계승 보기"
                    >
                      {group.predecessor ? '← 이전' : ''}
                      {group.predecessor && group.successors.length > 0
                        ? ' · '
                        : ''}
                      {group.successors.length > 0 ? '다음 →' : ''}
                    </SuccessionHint>
                  )}
                  <MemberCount>{group.memberCount}명</MemberCount>
                </GroupHead>
                <Strip>
                  {members.map((m) => {
                    const p = m.person
                    const isCurrent = p.id === currentPersonId
                    const displayName = getPersonDisplayName(p, true)
                    const src = p.profileImageUrl?.trim()
                      ? getUploadImageUrl(p.profileImageUrl) || p.profileImageUrl
                      : ''
                    const initial = [...displayName][0] ?? '?'
                    return (
                      <Card
                        key={m.membershipId}
                        type="button"
                        $current={isCurrent}
                        onClick={() => {
                          if (isCurrent) return
                          if (onPersonClick) onPersonClick(p.id)
                          else window.open(`/persons/${p.id}/`, '_blank')
                        }}
                        aria-current={isCurrent ? 'true' : undefined}
                        aria-label={
                          isCurrent
                            ? `${displayName} (본인)`
                            : `${displayName} 상세로 이동`
                        }
                      >
                        {isCurrent && <CurrentBadge>본인</CurrentBadge>}
                        <Avatar $has={Boolean(src)}>
                          {src ? (
                            <img
                              src={src}
                              alt={`${displayName} 프로필`}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <AvatarInitial aria-hidden>{initial}</AvatarInitial>
                          )}
                        </Avatar>
                        <Name $current={isCurrent}>{displayName}</Name>
                        {m.roleLabel?.trim() && (
                          <RoleLabel>{m.roleLabel.trim()}</RoleLabel>
                        )}
                        <Years>{lifespan(p)}</Years>
                      </Card>
                    )
                  })}
                </Strip>
              </GroupBlock>
            )
          })}
        </Groups>
      )}

      {showManage && (
        <PersonGroupManageModal
          personId={currentPersonId}
          personName={currentPersonName}
          onClose={() => {
            setShowManage(false)
            void refetch()
          }}
        />
      )}
    </Wrap>
  )
}

/* ─── styles ───────────────────────────────────────────────────────────── */

const Wrap = styled.section`
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const HeaderTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;

  svg {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const Hint = styled.span`
  margin-left: 2px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ManageBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      isDark(theme.mode) ? 'rgba(99,106,242,0.12)' : 'rgba(99,102,241,0.06)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const Groups = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const GroupBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const GroupHead = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
`

const GroupName = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
  cursor: pointer;
  text-align: left;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`

const CenterChip = styled.span`
  padding: 1px 8px;
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(255,214,10,0.16)' : 'rgba(245,158,11,0.12)'};
  color: ${({ theme }) => (isDark(theme.mode) ? '#ffd60a' : '#b45309')};
  white-space: nowrap;
`

const SuccessionHint = styled.button`
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const OrdinalBadge = styled.span`
  padding: 1px 7px;
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(255,214,10,0.18)' : 'rgba(245,158,11,0.14)'};
  color: ${({ theme }) => (isDark(theme.mode) ? '#ffd60a' : '#b45309')};
`

const MemberCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Strip = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 2px 12px;
  scroll-behavior: smooth;
  scroll-snap-type: x proximity;

  mask-image: linear-gradient(
    90deg,
    transparent 0,
    #000 16px,
    #000 calc(100% - 16px),
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0,
    #000 16px,
    #000 calc(100% - 16px),
    transparent 100%
  );

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.medium};
    border-radius: 999px;
  }
`

const Card = styled.button<{ $current: boolean }>`
  position: relative;
  flex-shrink: 0;
  width: 124px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 14px 10px 12px;
  gap: 6px;
  border-radius: 14px;
  border: 1px solid
    ${({ $current, theme }) =>
      $current ? theme.colors.primary : theme.colors.border.default};
  background: ${({ $current, theme }) =>
    $current
      ? isDark(theme.mode)
        ? 'rgba(99,106,242,0.14)'
        : 'rgba(99,102,241,0.06)'
      : theme.colors.background.primary};
  cursor: ${({ $current }) => ($current ? 'default' : 'pointer')};
  font: inherit;
  color: inherit;
  scroll-snap-align: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;

  &:hover {
    ${({ $current, theme }) =>
      !$current &&
      `
    transform: translateY(-2px);
    border-color: ${theme.colors.primary};
    box-shadow: 0 6px 16px ${theme.colors.shadow.sm};
  `}
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const CurrentBadge = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 1px 7px;
  font-size: 9.5px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  letter-spacing: 0.04em;
`

const Avatar = styled.div<{ $has: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  border: 2px solid
    ${({ $has, theme }) =>
      $has ? 'transparent' : theme.colors.border.default};
  background: ${({ $has, theme }) =>
    $has ? 'transparent' : theme.colors.background.tertiary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const AvatarInitial = styled.span`
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Name = styled.div<{ $current: boolean }>`
  font-size: 12px;
  font-weight: ${({ $current }) => ($current ? 800 : 700)};
  color: ${({ $current, theme }) =>
    $current ? theme.colors.primary : theme.colors.text.primary};
  line-height: 1.3;
  word-break: keep-all;
`

const RoleLabel = styled.div`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Years = styled.div`
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const StatusMsg = styled.p<{ $err?: boolean }>`
  margin: 6px 0;
  padding: 14px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme, $err }) =>
    $err ? theme.colors.error : theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  border-radius: 10px;
`

const SkCard = styled.div`
  flex-shrink: 0;
  width: 124px;
  height: 124px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`
