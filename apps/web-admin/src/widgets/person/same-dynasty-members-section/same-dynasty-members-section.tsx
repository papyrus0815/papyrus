/**
 * 같은 가문 구성원 섹션 — 인물 상세 가계도 탭에 표시.
 * 가로 스크롤 스트립 + 본인 강조 + 클릭 시 해당 인물로 이동.
 * 우측 액션: 구성원 인포그래픽 모달 열기.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiUsers } from 'react-icons/fi'
import styled from 'styled-components'

import { personApi, type Person } from '@/shared/api/person'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { DynastyMembersInfographicModal } from '@/widgets/dynasty/dynasty-members-infographic-modal'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

interface Props {
  dynastyId: string
  dynastyName: string
  currentPersonId: string
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

export function SameDynastyMembersSection({
  dynastyId,
  dynastyName,
  currentPersonId,
  onPersonClick,
}: Props) {
  const [showInfographic, setShowInfographic] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const currentCardRef = useRef<HTMLButtonElement>(null)

  const { data: persons = [], isLoading, isError } = useQuery({
    queryKey: ['persons-by-dynasty', dynastyId],
    queryFn: () => personApi.getByDynastyId(dynastyId),
    enabled: Boolean(dynastyId),
    staleTime: 60_000,
  })

  // 출생순 정렬 + 재위 N대 계산
  const { sorted, regnalIndex } = useMemo(() => {
    const list = [...persons].sort((a, b) => {
      const ya = a.birthYear != null ? signedYear(a.birthEra ?? null, a.birthYear) : Number.POSITIVE_INFINITY
      const yb = b.birthYear != null ? signedYear(b.birthEra ?? null, b.birthYear) : Number.POSITIVE_INFINITY
      return ya - yb
    })
    // 재위(regnalName 있는) 인물만 골라 출생순으로 N대 매핑
    const ruling = list.filter((p) => p.regnalName?.trim())
    const idx: Record<string, number> = {}
    ruling.forEach((p, i) => {
      idx[p.id] = i + 1
    })
    return { sorted: list, regnalIndex: idx }
  }, [persons])

  const others = sorted.filter((p) => p.id !== currentPersonId)

  // 본인 카드 자동 스크롤
  useEffect(() => {
    if (!stripRef.current || !currentCardRef.current) return
    const container = stripRef.current
    const card = currentCardRef.current
    const containerRect = container.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    const offset =
      cardRect.left - containerRect.left - containerRect.width / 2 + cardRect.width / 2
    container.scrollTo({ left: container.scrollLeft + offset, behavior: 'auto' })
  }, [sorted.length])

  return (
    <Wrap>
      <HeaderRow>
        <HeaderTitle>
          <FiUsers size={14} strokeWidth={2.2} />
          같은 가문 구성원
          <DynastyBadge>{dynastyName}</DynastyBadge>
        </HeaderTitle>
        {persons.length > 0 && (
          <InfographicBtn
            type="button"
            onClick={() => setShowInfographic(true)}
            aria-label="구성원 인포그래픽 열기"
          >
            구성원 인포그래픽
          </InfographicBtn>
        )}
      </HeaderRow>

      {isLoading ? (
        <Strip>
          {Array.from({ length: 6 }, (_, i) => (
            <SkCard key={i} />
          ))}
        </Strip>
      ) : isError ? (
        <StatusMsg $err>가문 구성원을 불러오지 못했습니다.</StatusMsg>
      ) : others.length === 0 ? (
        <StatusMsg>같은 가문에 다른 등록 인물이 없습니다.</StatusMsg>
      ) : (
        <Strip ref={stripRef}>
          {sorted.map((p) => {
            const isCurrent = p.id === currentPersonId
            const ruling = !!p.regnalName?.trim()
            const generation = ruling ? regnalIndex[p.id] : null
            const displayName = getPersonDisplayName(p, true)
            const src = p.profileImageUrl?.trim()
              ? getUploadImageUrl(p.profileImageUrl) || p.profileImageUrl
              : ''
            const initial = [...displayName][0] ?? '?'

            return (
              <Card
                key={p.id}
                ref={isCurrent ? currentCardRef : undefined}
                type="button"
                $current={isCurrent}
                onClick={() => {
                  if (isCurrent) return
                  if (onPersonClick) onPersonClick(p.id)
                  else window.open(`/persons-timeline/${p.id}/`, '_blank')
                }}
                aria-current={isCurrent ? 'true' : undefined}
                aria-label={
                  isCurrent
                    ? `${displayName} (본인)`
                    : `${displayName} 상세로 이동`
                }
              >
                {generation != null && (
                  <GenerationBadge>{generation}대</GenerationBadge>
                )}
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
                {p.regnalName?.trim() && (
                  <Regnal>{p.regnalName.trim()}</Regnal>
                )}
                <Years>{lifespan(p)}</Years>
              </Card>
            )
          })}
        </Strip>
      )}

      {showInfographic && (
        <DynastyMembersInfographicModal
          dynastyId={dynastyId}
          dynastyName={dynastyName}
          isOpen
          onClose={() => setShowInfographic(false)}
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
  gap: 10px;
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

const DynastyBadge = styled.span`
  margin-left: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(99,106,242,0.14)' : 'rgba(99,102,241,0.08)'};
  color: ${({ theme }) => theme.colors.primary};
`

const InfographicBtn = styled.button`
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

const Strip = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 2px 12px;
  scroll-behavior: smooth;
  scroll-snap-type: x proximity;

  /* 옅은 좌우 페이드 — 스크롤 가능 시각 단서 */
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

const GenerationBadge = styled.span`
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 1px 6px;
  font-size: 9.5px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(255,214,10,0.18)' : 'rgba(245,158,11,0.14)'};
  color: ${({ theme }) => (isDark(theme.mode) ? '#ffd60a' : '#b45309')};
  letter-spacing: 0.04em;
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

const Regnal = styled.div`
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
