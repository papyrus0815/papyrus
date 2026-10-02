/**
 * 카드 그리드(세기별·왕조·고정)에서 쓰는 인물 카드.
 *
 *   ┌──────────────────────┐
 *   │ 군주            [고정] │
 *   │      초상 1 : 1       │   ← 사진은 사진만. hover 시 살짝 확대
 *   ├──────────────────────┤
 *   │ 나폴레옹 보나파르트      │   ← 글은 지면 위 — 사건 목록 행과 같은 잉크
 *   │ 프랑스 황제            │
 *   │ 1769 – 1821  향년 52세 │
 *   │ ● 정치 · 프랑스    ◔ 95 │   ← 색은 분야 점 하나에만
 *   └──────────────────────┘
 *
 * 예전엔 이름·직함을 사진 위 흰 글자로 얹느라 모든 카드에 검은 스크림을 깔았고, 사진 없는
 * 인물(다수)은 짙은 회색 판이라 격자 절반이 검은 벽이었다. 사건 목록처럼 밝은 지면 + 절제된
 * 색으로 바꾼다. 사진이 없거나 깨지면 공통 빈 초상(EmptyPortrait — 옅은 실루엣)으로 대체.
 * 이름·직함·국가·가문에 검색어 하이라이트 적용.
 */
import type React from 'react'
import { memo, useMemo, useState } from 'react'

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
  // 깨진 이미지 URL은 공통 빈 초상으로 대체 — 빈 상자가 격자 한가운데 남지 않게.
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = !!person.profileImageUrl && !imageFailed

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
  /**
   * 영향력 0 = 아직 평가하지 않음(실데이터 470명 중 139명, 30%). 예전엔 빈 링 + '0'으로 그려
   * '영향력 없음'으로 읽혔다 — 고대 군주들이 줄줄이 0이었다. 값이 아니라 상태로 보인다.
   */
  const influenceRated = person.influence > 0
  /**
   * 둘째 줄 — 직함이 없으면 가문(소속)을 올린다. 직함 없는 카드는 이름과 생몰 사이가 한 줄
   * 비어 '정보가 빠진 카드'처럼 보였고, 가문은 정작 맨 아랫줄 꼬리에서 말줄임으로 잘리고 있었다
   * ('정치 · 프랑크 왕국 · 카롤…'). 올린 가문은 아랫줄에서 뺀다.
   */
  const subtitle = person.primaryTitle ?? (person.faction || null)
  const factionInSubtitle = !person.primaryTitle && !!person.faction

  // 카드 핵심 정보를 스크린리더 이름에 포함 (배지·생몰·영향력이 시각에만 의존하던 문제 보강)
  const ariaLabel = [
    person.name,
    role,
    hasCountry ? person.country : null,
    person.field,
    `생몰 ${born === '?' ? '미상' : born}–${died === '?' ? '미상' : died}`,
    influenceRated ? `영향력 ${person.influence}` : '영향력 미평가',
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
      <Visual>
        {showImage ? (
          <Photo
            src={person.profileImageUrl ?? undefined}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <EmptyPortrait />
        )}
        {/* 위쪽 칩(역할·고정) 대비용 옅은 그늘 — 글자를 얹지 않으니 아래쪽 어둠은 없다 */}
        {(role || pinned) && showImage && <Scrim aria-hidden />}

        {role && <RoleTag $monarch={person.isMonarch}>{role}</RoleTag>}
        <PinBtn
          $active={pinned}
          onClick={(event) => onTogglePin(person.id, event)}
          title={pinned ? '고정 해제' : '상단에 고정'}
          aria-label={pinned ? '핀 해제' : '핀 고정'}
          aria-pressed={pinned}
          type="button"
        >
          <FiBookmark size={15} fill={pinned ? 'currentColor' : 'none'} />
        </PinBtn>
      </Visual>

      <Body>
        <Name title={person.name}>{highlight(person.name, query)}</Name>
        {subtitle && (
          <Title title={subtitle} $muted={factionInSubtitle}>
            {highlight(subtitle, query)}
          </Title>
        )}
        {/* 직함 유무와 무관하게 메타 두 줄은 카드 바닥에 — 같은 줄 카드끼리 생몰·영향력이 나란히 */}
        <Row $pushDown>
          <Years>
            {born}
            <Dash>–</Dash>
            {died}
          </Years>
          {person.age != null && (
            <Age>{person.isAlive ? `${person.age}세` : `향년 ${person.age}세`}</Age>
          )}
        </Row>
        <Row>
          <Place>
            {/* 분야는 점 하나의 색으로 — 사건 목록의 분류처럼 색은 이 한 곳에만 쓴다 */}
            {/* '기타'는 분류 잔여라 새 정보가 아니다 — 대부분의 카드에 반복되던 소음 */}
            {person.field !== '기타' && (
              <>
                <FieldDot aria-hidden />
                <FieldName>{person.field}</FieldName>
                <PlaceSub>{' · '}</PlaceSub>
              </>
            )}
            {hasCountry ? highlight(person.country, query) : '국가 미상'}
            {person.faction && !factionInSubtitle && (
              <PlaceSub>
                {' · '}
                {highlight(person.faction, query)}
              </PlaceSub>
            )}
          </Place>
          {influenceRated ? (
            <Influence title={`영향력 ${person.influence}`}>
              <Ring
                style={{ ['--value' as string]: `${person.influence}` }}
                aria-hidden
              />
              {person.influence}
            </Influence>
          ) : (
            <Unrated title="영향력 미평가">미평가</Unrated>
          )}
        </Row>
      </Body>
    </Card>
  )
}

/**
 * 공통 빈 초상 — 사진이 없거나 깨진 모든 인물에 같은 모양(사람 실루엣만, 글자 없음).
 * 인물마다 다른 글자·색을 만들지 않아 '사진 없음'이 데이터 상태로 한눈에 읽힌다.
 * 하단 캡션(흰 글자)이 얹히므로 양 테마 모두 중간 톤 이상 어두운 중립 바탕을 쓴다.
 */
export function EmptyPortrait() {
  return (
    <Empty aria-hidden>
      <svg viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="23" r="11" fill="currentColor" />
        <path d="M9 60c0-13 10.3-21.5 23-21.5S55 47 55 60z" fill="currentColor" />
      </svg>
    </Empty>
  )
}

/**
 * 부모(시대/왕조 뷰)의 재정렬·핀 토글 시 동일 props 카드의 리렌더 차단.
 * person(어댑트 캐시)·콜백 모두 참조 안정적이라 기본 shallow 비교로 충분.
 */
export const PersonCardItem = memo(PersonCardItemBase)

export const EraCardGrid = styled.div`
  display: grid;
  /* 172px — 본문 920px에서 한 줄 5장. 220px일 땐 3장이라 한 화면에 3명만 보였다. */
  grid-template-columns: repeat(auto-fill, minmax(172px, 1fr));
  gap: 16px 14px;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
`

const Card = styled.div<{ $pinned?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 10px;
  overflow: hidden;
  background: ${surface};
  border: 1px solid ${hairline};
  cursor: pointer;
  transition: border-color ${MOTION_FAST}, background ${MOTION_FAST};

  /* 사건 목록 행처럼 hover는 면의 옅은 틴트 — 그림자로 띄우지 않는다 */
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.16)'};
    background: ${({ theme }) => (theme.mode === 'dark' ? '#1a1a1a' : '#f8fafc')};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
  ${({ $pinned }) =>
    $pinned &&
    css`
      border-color: ${BRAND.primary};
      box-shadow: 0 0 0 1px ${BRAND.primary};
    `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Visual = styled.div`
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-bottom: 1px solid ${hairline};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1a1b1f' : '#f4f5f7')};
`

const zoomOnHover = css`
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  ${Card}:hover & {
    transform: scale(1.04);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    ${Card}:hover & {
      transform: none;
    }
  }
`

const Photo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  ${zoomOnHover}
`

const Empty = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  /* 사진 없음은 데이터 상태 — 사진보다 한 단계 물러선 옅은 중립(예전 짙은 판은 격자를 검게 덮었다) */
  color: ${({ theme }) => (theme.mode === 'dark' ? '#2a2d33' : '#e3e6eb')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1a1b1f' : '#f4f5f7')};
  ${zoomOnHover}

  /*
   * 실루엣은 판의 38%로 — 48%일 땐 사진 없는 카드(470명 중 250명, 53%)마다 큰 회색 사람이
   * 서서, 격자의 시선이 '있는 사진'이 아니라 '없는 사진'으로 갔다. 자리만 말하고 물러선다.
   */
  svg {
    display: block;
    width: 38%;
    height: auto;
  }
`

/** 위쪽 칩 뒤 옅은 그늘 — 밝은 사진 위에서도 칩 테두리가 읽히게 */
const Scrim = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.26) 0%, rgba(0, 0, 0, 0) 28%);
  pointer-events: none;
`

const glassChip = css`
  background: rgba(15, 15, 20, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.18);
`

const RoleTag = styled.span<{ $monarch: boolean }>`
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${({ $monarch }) => ($monarch ? '#fcd34d' : '#bfdbfe')};
  ${glassChip}
`

const PinBtn = styled.button<{ $active: boolean }>`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  cursor: pointer;
  color: #ffffff;
  ${glassChip}
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transition: opacity ${MOTION_FAST}, background ${MOTION_FAST};

  ${({ $active }) =>
    $active &&
    css`
      background: ${BRAND.primary};
      border-color: ${BRAND.primary};
    `}

  ${Card}:hover &,
  ${Card}:focus-within &,
  &:focus-visible {
    opacity: 1;
  }
  &:hover {
    background: ${({ $active }) => ($active ? BRAND.primaryHover : 'rgba(15, 15, 20, 0.7)')};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px ${BRAND.primary};
  }
  /* 터치 기기는 hover가 없다 — 항상 보이게 */
  @media (hover: none) {
    opacity: 1;
  }
`

const Name = styled.div`
  font-size: 14.5px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

/* $muted — 직함 대신 올린 가문. 직함보다 한 단 흐리게(직함인 척하지 않게) */
const Title = styled.div<{ $muted?: boolean }>`
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: ${({ theme, $muted }) =>
    $muted ? metaText({ theme }) : theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px 11px;

  @media (max-width: 640px) {
    padding: 10px 10px 11px;
  }
`

const Row = styled.div<{ $pushDown?: boolean }>`
  ${({ $pushDown }) =>
    $pushDown &&
    css`
      margin-top: auto;
      padding-top: 6px;
    `}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`

const Years = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Dash = styled.span`
  margin: 0 4px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Age = styled.span`
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  color: ${metaText};
  white-space: nowrap;

  @media (max-width: 640px) {
    display: none;
  }
`

const Place = styled.span`
  min-width: 0;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FieldDot = styled.span`
  display: inline-block;
  width: 7px;
  height: 7px;
  margin: 0 5px 1px 0;
  border-radius: 50%;
  vertical-align: middle;
  background: var(--field);
`

const FieldName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PlaceSub = styled.span`
  font-weight: 500;
  color: ${metaText};
`

const Influence = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

/* 미평가 — 수치 자리에 작은 글자. 링을 비워 두면 '0점'으로 읽힌다 */
const Unrated = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  color: ${metaText};
`

/** 영향력 링 — conic-gradient 한 요소로 0~100을 호로 그린다 */
const Ring = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: conic-gradient(
    ${BRAND.primary} calc(var(--value) * 1%),
    ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.1)'}
      0
  );
  mask: radial-gradient(circle, transparent 3.5px, #000000 4px);
  -webkit-mask: radial-gradient(circle, transparent 3.5px, #000000 4px);
`
