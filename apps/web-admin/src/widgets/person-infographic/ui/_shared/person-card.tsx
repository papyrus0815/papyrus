/**
 * 카드 그리드(카드·시대 스토리·왕조·고정)에서 쓰는 인물 카드 — 이미지가 주인공인 포트레이트 카드.
 *
 *   ┌──────────────────────┐
 *   │ 군주            [고정] │
 *   │                      │
 *   │      초상 4 : 5       │   ← 카드 폭 전체, hover 시 살짝 확대
 *   │                      │
 *   │▁▁▁▁ 어둠 그라데이션 ▁▁▁│
 *   │ 정치                  │   ← 이름·직함은 이미지 위 흰 글자
 *   │ 나폴레옹 보나파르트      │
 *   │ 프랑스 황제            │
 *   ├──────────────────────┤
 *   │ 1769 – 1821  향년 52세 │
 *   │ 프랑스 · 부르봉    ◔ 95 │
 *   └──────────────────────┘
 *
 * 사진이 없으면 분야색 포스터(큰 머리글자 + 은은한 광원)로 사진 카드와 같은 무게를 유지한다.
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
  // 깨진 이미지 URL은 포스터로 대체 — 빈 상자가 격자 한가운데 남지 않게.
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
      <Visual>
        {showImage ? (
          <Photo
            src={person.profileImageUrl ?? undefined}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Poster aria-hidden>
            <PosterInitial>{person.name.slice(0, 1)}</PosterInitial>
          </Poster>
        )}
        <Scrim aria-hidden />

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

        <Caption>
          <FieldTag>{person.field}</FieldTag>
          <Name title={person.name}>{highlight(person.name, query)}</Name>
          {person.primaryTitle && (
            <Title title={person.primaryTitle}>
              {highlight(person.primaryTitle, query)}
            </Title>
          )}
        </Caption>
      </Visual>

      <Body>
        <Row>
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
            {hasCountry ? highlight(person.country, query) : '국가 미상'}
            <PlaceSub>
              {' · '}
              {person.faction ? highlight(person.faction, query) : person.era.lbl}
            </PlaceSub>
          </Place>
          <Influence title={`영향력 ${person.influence}`}>
            <Ring style={{ ['--value' as string]: `${person.influence}` }} aria-hidden />
            {person.influence}
          </Influence>
        </Row>
      </Body>
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
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;

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
  border-radius: 14px;
  overflow: hidden;
  background: ${surface};
  border: 1px solid ${hairline};
  cursor: pointer;
  transition: border-color ${MOTION_FAST}, box-shadow ${MOTION_FAST};

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 42, 0.18)'};
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 8px 24px rgba(0, 0, 0, 0.45)'
        : '0 8px 24px rgba(15, 23, 42, 0.1)'};
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
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: #111111;
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

/** 사진 없는 인물 — 분야색 포스터. 격자에서 사진 카드와 같은 무게를 가진다. */
const Poster = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 24%;
  background:
    radial-gradient(
      circle at 50% 32%,
      color-mix(in srgb, var(--field) 45%, #ffffff) 0%,
      transparent 60%
    ),
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--field) 72%, #0b1020) 0%,
      color-mix(in srgb, var(--field) 28%, #05070d) 100%
    );
  ${zoomOnHover}
`

const PosterInitial = styled.span`
  font-size: 84px;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);

  @media (max-width: 640px) {
    font-size: 56px;
  }
`

/** 상·하단 어둠 — 흰 캡션·칩 대비 확보(사진 밝기와 무관) */
const Scrim = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.28) 0%,
    rgba(0, 0, 0, 0) 22%,
    rgba(0, 0, 0, 0) 45%,
    rgba(0, 0, 0, 0.55) 70%,
    rgba(0, 0, 0, 0.86) 100%
  );
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

const Caption = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 14px 14px 13px;
  color: #ffffff;

  @media (max-width: 640px) {
    padding: 10px 10px 10px;
  }
`

const FieldTag = styled.span`
  align-self: flex-start;
  margin-bottom: 3px;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  background: color-mix(in srgb, var(--field) 78%, #000000);
`

const Name = styled.div`
  font-size: 19px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.35);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 16px;
  }
`

const Title = styled.div`
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.82);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 13px;

  @media (max-width: 640px) {
    padding: 10px 10px 11px;
  }
`

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`

const Years = styled.span`
  font-size: 14px;
  font-weight: 700;
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
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
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
