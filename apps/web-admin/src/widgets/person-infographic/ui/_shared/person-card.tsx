/**
 * 카드 그리드(카드·시대 스토리·왕조·고정)에서 쓰는 인물 카드.
 *
 * 사건 목록(/events)의 잉크 규율을 따른다 — 평면 표면 + 헤어라인, 떠오르는 그림자·그라데이션 없음,
 * 분류(분야)는 칩 면 없이 **분류색 글자**로, 연도는 tabular 숫자로, 강조색은 indigo 하나.
 *
 *   ┌───────────────────────────────┐
 *   │ [초상]  이름            [고정]  │
 *   │        직함 · 군주              │
 *   │ 1769 – 1821 · 52세        정치  │
 *   │ 프랑스 · 보나파르트가             │
 *   │ 영향력 ━━━━━━━━━━━━━━━━━━  95   │
 *   └───────────────────────────────┘
 *
 * 이름·국가·소속·직책에 검색어 하이라이트 적용.
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
      style={{ ['--field' as string]: colorForField(person.field) }}
      onKeyDown={(event) => {
        // 카드 전체가 클릭 대상 — 키보드(Enter/Space)로도 열기. Space의 스크롤 기본동작 차단.
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(person.id)
        }
      }}
    >
      <Head>
        <Portrait>
          {person.profileImageUrl ? (
            <img src={person.profileImageUrl} alt="" loading="lazy" />
          ) : (
            <Initial aria-hidden>{person.name.slice(0, 1)}</Initial>
          )}
        </Portrait>
        <Identity>
          <Name title={person.name}>{highlight(person.name, query)}</Name>
          <TitleLine>
            {person.primaryTitle && (
              <span title={person.primaryTitle}>{highlight(person.primaryTitle, query)}</span>
            )}
            {role && <Role $monarch={person.isMonarch}>{role}</Role>}
          </TitleLine>
        </Identity>
        <PinBtn
          $active={pinned}
          onClick={(event) => onTogglePin(person.id, event)}
          title={pinned ? '고정 해제' : '상단에 고정'}
          aria-label={pinned ? '핀 해제' : '핀 고정'}
          aria-pressed={pinned}
          type="button"
        >
          <FiBookmark size={14} fill={pinned ? 'currentColor' : 'none'} />
        </PinBtn>
      </Head>

      <MetaRow>
        <Years>
          {born}
          <Dash>–</Dash>
          {died}
          {person.age != null && <Age> · {person.age}세</Age>}
        </Years>
        <Field>{person.field}</Field>
      </MetaRow>

      <Place>
        {hasCountry ? highlight(person.country, query) : <Unknown>국가 미상</Unknown>}
        {person.faction && <Faction title={person.faction}> · {highlight(person.faction, query)}</Faction>}
      </Place>

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
  grid-template-columns: repeat(auto-fill, minmax(236px, 1fr));
  gap: 10px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`

const Card = styled.div<{ $pinned?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 14px 14px 12px;
  border-radius: 10px;
  border: 1px solid
    ${({ $pinned }) => ($pinned ? BRAND.primaryBorderHover : 'var(--card-line)')};
  background: ${surface};
  cursor: pointer;
  transition: background ${MOTION_FAST}, border-color ${MOTION_FAST};
  --card-line: ${hairline};

  &:hover {
    --card-line: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.2)'};
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

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
`

const Portrait = styled.div`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: color-mix(in srgb, var(--field) 12%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--field) 22%, transparent);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }
`

const Initial = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 17px;
  font-weight: 800;
  color: var(--field);
`

const Identity = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 2px;
`

const Name = styled.div`
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TitleLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  min-height: 17px;
  font-size: 12px;
  font-weight: 500;
  color: ${metaText};

  & > span:first-child:not(:last-child),
  & > span:only-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
`

/** 군주·국가원수 — 칩 면 없이 색 글자(사건 목록 분류와 같은 잉크) */
const Role = styled.span<{ $monarch: boolean }>`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: ${({ $monarch, theme }) =>
    $monarch
      ? theme.mode === 'dark'
        ? '#fbbf24'
        : '#b45309'
      : theme.mode === 'dark'
        ? BRAND.primaryTextOnDark
        : BRAND.primary};
`

const PinBtn = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  margin: -4px -6px 0 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
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

const MetaRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px solid ${hairline};
`

const Years = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`

const Dash = styled.span`
  margin: 0 3px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Age = styled.span`
  font-weight: 500;
  color: ${metaText};
`

/** 분야 — 사건 목록의 '분류' 열처럼 면 없는 분류색 글자 */
const Field = styled.span`
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--field);
`

const Place = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 16px;
`

const Faction = styled.span`
  color: ${metaText};
`

const Unknown = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Influence = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const InfluenceLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Track = styled.div`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.07)'};
`

const Fill = styled.div`
  height: 100%;
  border-radius: 2px;
  background: ${BRAND.primary};
`

const InfluenceValue = styled.span`
  min-width: 20px;
  text-align: right;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`
