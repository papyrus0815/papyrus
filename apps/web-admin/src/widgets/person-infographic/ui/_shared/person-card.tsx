/**
 * 카드 그리드(카드·시대 스토리·왕조·고정)에서 쓰는 인물 카드 — 가로형 프로필 카드(최소 296px — 사이드바 펼친 1440 폭에서 3열).
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ ┌────────┐  정치 · 군주                  [고정] │
 *   │ │        │  나폴레옹 보나파르트                  │
 *   │ │  초상   │  프랑스 황제                        │
 *   │ │ 96×120 │                                   │
 *   │ │        │  1769 – 1821  · 52세              │
 *   │ └────────┘                                   │
 *   ├─────────────────────────────────────────────┤
 *   │ 국가 프랑스      시대 ● 근대 19c    가문 부르봉 │
 *   │ 영향력 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  95 │
 *   └─────────────────────────────────────────────┘
 *
 * 사건 목록(/events)의 잉크 규율 — 평면 표면 + 헤어라인, 떠오르는 그림자 없음,
 * 분류(분야)는 면 없는 분류색 글자, 연도는 tabular 숫자, 강조색은 indigo 하나.
 * 이름·직함·국가·가문에 검색어 하이라이트 적용.
 */
import type React from 'react'
import { memo, useMemo } from 'react'

import { FiBookmark } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { formatYear } from '../../model/century'
import { colorForField } from '../../model/constants'
import type { AdaptedPerson } from '../../model/types'

import { BRAND, hairline, metaText, MOTION_FAST, surface } from './catalog.styles'
import { highlight } from './highlight'

interface PersonCardProps {
  person: AdaptedPerson
  query: string
  pinned: boolean
  onTogglePin: (id: string, event: React.MouseEvent) => void
  onOpen: (id: string) => void
}

function PersonCardItemBase({
  person,
  query,
  pinned,
  onTogglePin,
  onOpen,
}: PersonCardProps) {
  // bio 정규식 2회는 biography가 안 바뀌면 재실행 불필요 (카드 다수 + 부모 재정렬 리렌더 누적)
  const bioTooltip = useMemo(
    () =>
      person.biography
        ? person.biography
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 240)
        : undefined,
    [person.biography],
  )
  const role = person.isMonarch ? '군주' : person.isHeadOfState ? '국가원수' : null
  const born = person.born == null ? '?' : formatYear(person.born)
  const died = person.isAlive ? '현재' : person.died == null ? '?' : formatYear(person.died)
  const hasCountry = !!person.country && person.country !== '미상'

  // 카드 핵심 정보를 스크린리더 이름에 포함 (배지·생몰·영향력이 시각에만 의존하던 문제 보강)
  const ariaLabel = [
    person.name,
    role,
    hasCountry ? person.country : null,
    person.field,
    `생몰 ${born === '?' ? '미상' : born}–${died === '?' ? '미상' : died}`,
    `영향력 ${person.influence}`,
    '상세 보기',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Card
      $pinned={pinned}
      title={bioTooltip}
      onClick={() => onOpen(person.id)}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      style={{
        ['--field' as string]: colorForField(person.field),
        ['--era' as string]: person.era.color,
      }}
      onKeyDown={(event) => {
        // 카드 전체가 클릭 대상 — 키보드(Enter/Space)로도 열기. Space의 스크롤 기본동작 차단.
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(person.id)
        }
      }}
    >
      <Main>
        <Portrait>
          {person.profileImageUrl ? (
            <img src={person.profileImageUrl} alt="" loading="lazy" />
          ) : (
            <Initial aria-hidden>{person.name.slice(0, 1)}</Initial>
          )}
        </Portrait>

        <Identity>
          <Eyebrow>
            <Field>{person.field}</Field>
            {role && (
              <>
                <EyebrowDot aria-hidden>·</EyebrowDot>
                <Role $monarch={person.isMonarch}>{role}</Role>
              </>
            )}
          </Eyebrow>
          <Name title={person.name}>{highlight(person.name, query)}</Name>
          {person.primaryTitle && (
            <Title title={person.primaryTitle}>
              {highlight(person.primaryTitle, query)}
            </Title>
          )}
          <Life>
            <Years>
              {born}
              <Dash>–</Dash>
              {died}
            </Years>
            {person.age != null && <Age>{person.isAlive ? `${person.age}세` : `향년 ${person.age}세`}</Age>}
          </Life>
        </Identity>

        <PinBtn
          $active={pinned}
          onClick={(event) => onTogglePin(person.id, event)}
          title={pinned ? '고정 해제' : '상단에 고정'}
          aria-label={pinned ? '핀 해제' : '핀 고정'}
          aria-pressed={pinned}
          type="button"
        >
          <FiBookmark size={16} fill={pinned ? 'currentColor' : 'none'} />
        </PinBtn>
      </Main>

      <Facts>
        <Fact>
          <FactLabel>국가</FactLabel>
          <FactValue title={hasCountry ? person.country : undefined}>
            {hasCountry ? highlight(person.country, query) : <Muted>미상</Muted>}
          </FactValue>
        </Fact>
        <Fact>
          <FactLabel>시대</FactLabel>
          <FactValue>
            <EraDot aria-hidden />
            {person.era.lbl}
          </FactValue>
        </Fact>
        <Fact>
          <FactLabel>가문</FactLabel>
          <FactValue title={person.faction || undefined}>
            {person.faction ? highlight(person.faction, query) : <Muted>—</Muted>}
          </FactValue>
        </Fact>
      </Facts>

      <Influence>
        <InfluenceLabel>영향력</InfluenceLabel>
        <Track>
          <Fill style={{ width: `${person.influence}%` }} />
        </Track>
        <InfluenceValue>{person.influence}</InfluenceValue>
      </Influence>
    </Card>
  )
}

/**
 * 부모(시대/왕조 뷰)의 재정렬·핀 토글 시 동일 props 카드의 리렌더 차단.
 * person(어댑트 캐시)·콜백 모두 참조 안정적이라 기본 shallow 비교로 충분.
 */
export const PersonCardItem = memo(PersonCardItemBase)

export const EraCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(296px, 1fr));
  gap: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 10px;
  }
`

const Card = styled.div<{ $pinned?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 14px;
  border: 1px solid
    ${({ $pinned }) => ($pinned ? BRAND.primaryBorderHover : 'var(--card-line)')};
  background: ${surface};
  cursor: pointer;
  overflow: hidden;
  transition: background ${MOTION_FAST}, border-color ${MOTION_FAST};
  --card-line: ${hairline};

  /* 좌측 분야색 띠 — 카드 격자를 훑을 때 분야가 색으로 먼저 읽힌다 */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--field);
    opacity: 0.85;
  }

  &:hover {
    --card-line: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 42, 0.2)'};
    background: ${({ theme }) => (theme.mode === 'dark' ? '#1a1a1a' : '#fbfcfe')};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
  ${({ $pinned, theme }) =>
    $pinned &&
    css`
      background: ${theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
    `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Main = styled.div`
  /* 남는 높이를 머리가 흡수 — 같은 줄 카드끼리 사실 줄·영향력 줄 y가 맞는다 */
  flex: 1;
  display: flex;
  align-items: stretch;
  gap: 16px;
  padding: 18px 16px 16px 20px;
  min-width: 0;

  @media (max-width: 640px) {
    gap: 14px;
    padding: 16px 12px 14px 16px;
  }
`

const Portrait = styled.div`
  width: 96px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--field) 18%, transparent),
    color-mix(in srgb, var(--field) 6%, transparent)
  );
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--field) 22%, transparent);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  @media (max-width: 640px) {
    width: 76px;
    height: 96px;
  }
`

const Initial = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 38px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--field);
  opacity: 0.9;

  @media (max-width: 640px) {
    font-size: 30px;
  }
`

const Identity = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 16px;
  font-size: 12px;
  font-weight: 700;
`

/** 분야 — 사건 목록의 '분류' 열처럼 면 없는 분류색 글자 */
const Field = styled.span`
  color: var(--field);
`

const EyebrowDot = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 군주·국가원수 — 칩 면 없이 색 글자 */
const Role = styled.span<{ $monarch: boolean }>`
  color: ${({ $monarch, theme }) =>
    $monarch
      ? theme.mode === 'dark'
        ? '#fbbf24'
        : '#b45309'
      : theme.mode === 'dark'
        ? BRAND.primaryTextOnDark
        : BRAND.primary};
`

const Name = styled.div`
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  /* 긴 이름은 두 줄까지 — 한 줄 말줄임으로 '보나파르트 나…'가 되던 문제 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: keep-all;
`

const Title = styled.div`
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const Life = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: auto;
  padding-top: 8px;
`

const Years = styled.span`
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`

const Dash = styled.span`
  margin: 0 4px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Age = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${metaText};
  white-space: nowrap;
`

const PinBtn = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  align-self: flex-start;
  width: 32px;
  height: 32px;
  margin: -6px -4px 0 -8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primaryTextOnDark
        : BRAND.primary
      : theme.colors.text.tertiary};
  opacity: ${({ $active }) => ($active ? 1 : 0.45)};
  transition: opacity ${MOTION_FAST}, color ${MOTION_FAST}, background ${MOTION_FAST};

  ${Card}:hover & {
    opacity: 1;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)'};
  }
  &:focus-visible {
    outline: none;
    opacity: 1;
    box-shadow: ${BRAND.focusRing};
  }
`

const Facts = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 12px 16px 0 20px;
  border-top: 1px solid ${hairline};

  @media (max-width: 640px) {
    padding: 12px 12px 0 16px;
  }
`

const Fact = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const FactLabel = styled.dt`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FactValue = styled.dd`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`

const EraDot = styled.span`
  display: inline-block;
  margin-right: 5px;
  vertical-align: 1px;
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--era);
`

const Muted = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Influence = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 16px 20px;

  @media (max-width: 640px) {
    padding: 12px 12px 14px 16px;
  }
`

const InfluenceLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Track = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.07)'};
`

const Fill = styled.div`
  height: 100%;
  border-radius: 3px;
  background: ${BRAND.primary};
`

const InfluenceValue = styled.span`
  min-width: 24px;
  text-align: right;
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`
