/**
 * 카드 그리드(카드·시대 스토리·왕조·고정)에서 쓰는 인물 카드 — 이미지가 주인공인 인셋 포트레이트 카드.
 *
 *   ┌────────────────────────┐
 *   │ ┌────────────────────┐ │
 *   │ │ 군주          [고정] │ │   ← 카드 안쪽 8px 여백에 4:5 초상(카드 면적의 대부분)
 *   │ │                    │ │      hover 시 살짝 확대
 *   │ │       초상 4:5      │ │
 *   │ │                    │ │      사진 없음/깨짐 → 공통 빈 초상(EmptyPortrait)
 *   │ └────────────────────┘ │
 *   │ 정치 · 프랑스            │   ← 분야(분류색) · 국가
 *   │ 나폴레옹 보나파르트        │   ← 이름 17/800, 두 줄까지
 *   │ 프랑스 황제              │
 *   │ ────────────────────── │
 *   │ 1769 – 1821 · 52세  ◔ 95 │
 *   └────────────────────────┘
 *
 * 글자를 이미지 위에 얹지 않는다 — 사진 밝기·빈 초상과 무관하게 같은 대비로 읽힌다.
 * 이름·직함·국가에 검색어 하이라이트 적용.
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
  // 깨진 이미지 URL은 공통 빈 초상으로 대체 — 브라우저 깨진 아이콘이 격자에 남지 않게.
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
          <EmptyPortrait />
        )}
        {showImage && <TopShade aria-hidden />}

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
        <Eyebrow>
          <Field>{person.field}</Field>
          {hasCountry && (
            <>
              <Sep aria-hidden>·</Sep>
              <Country>{highlight(person.country, query)}</Country>
            </>
          )}
        </Eyebrow>
        <Name title={person.name}>{highlight(person.name, query)}</Name>
        <Title title={person.primaryTitle ?? undefined}>
          {person.primaryTitle ? highlight(person.primaryTitle, query) : person.era.lbl}
        </Title>

        <Footer>
          <Years>
            {born}
            <Dash>–</Dash>
            {died}
            {person.age != null && <Age> · {person.age}세</Age>}
          </Years>
          <Influence title={`영향력 ${person.influence}`}>
            <Ring style={{ ['--value' as string]: `${person.influence}` }} aria-hidden />
            {person.influence}
          </Influence>
        </Footer>
      </Body>
    </Card>
  )
}

/**
 * 부모(시대/왕조 뷰)의 재정렬·핀 토글 시 동일 props 카드의 리렌더 차단.
 * person(어댑트 캐시)·콜백 모두 참조 안정적이라 기본 shallow 비교로 충분.
 */
export const PersonCardItem = memo(PersonCardItemBase)

/**
 * 공통 빈 초상 — 사진이 없는 모든 인물에 같은 모양. 인물마다 다른 글자·색을 만들지 않아
 * '사진 없음'이 데이터 상태로 한눈에 읽히고 격자가 조용해진다.
 */
export function EmptyPortrait() {
  return (
    <Empty aria-hidden>
      <svg viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="24" r="11" fill="currentColor" />
        <path d="M10 58c0-12.2 9.8-20 22-20s22 7.8 22 20" fill="currentColor" />
      </svg>
      <EmptyLabel>사진 없음</EmptyLabel>
    </Empty>
  )
}

export const EraCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(216px, 1fr));
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
  padding: 8px;
  border-radius: 16px;
  background: ${surface};
  border: 1px solid ${hairline};
  cursor: pointer;
  transition: border-color ${MOTION_FAST}, box-shadow ${MOTION_FAST}, transform ${MOTION_FAST};

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.14)'};
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 12px 28px rgba(0, 0, 0, 0.5)'
        : '0 12px 28px rgba(15, 23, 42, 0.1)'};
    transform: translateY(-2px);
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
      &:hover {
        border-color: ${BRAND.primary};
      }
    `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`

const Visual = styled.div`
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: 10px;
  overflow: hidden;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1b1d22' : '#eef1f5')};
  /* 사진 가장자리 헤어라인 — 흰 배경 사진이 카드 면과 섞이지 않게 */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 0 1px
      ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)')};
    pointer-events: none;
  }
`

const Photo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);

  ${Card}:hover & {
    transform: scale(1.05);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    ${Card}:hover & {
      transform: none;
    }
  }
`

/** 상단 칩 대비용 옅은 어둠 — 사진일 때만 */
const TopShade = styled.div`
  position: absolute;
  inset: 0 0 auto 0;
  height: 30%;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0));
  pointer-events: none;
`

const Empty = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#343842' : '#cfd6e0')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, #1f2228 0%, #16181c 100%)'
      : 'linear-gradient(180deg, #f4f6f9 0%, #e7ebf1 100%)'};

  svg {
    display: block;
    width: 38%;
    height: auto;
  }
`

const EmptyLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const glassChip = css`
  background: rgba(15, 15, 20, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #ffffff;
`

const RoleTag = styled.span<{ $monarch: boolean }>`
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  ${glassChip}
  color: ${({ $monarch }) => ($monarch ? '#fcd34d' : '#bfdbfe')};
`

const PinBtn = styled.button<{ $active: boolean }>`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  cursor: pointer;
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
    background: ${({ $active }) => ($active ? BRAND.primaryHover : 'rgba(15, 15, 20, 0.72)')};
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

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 6px 4px;
  min-width: 0;
`

const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
`

/** 분야 — 사건 목록 '분류'처럼 면 없는 분류색 글자 */
const Field = styled.span`
  flex-shrink: 0;
  color: var(--field);
`

const Sep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Country = styled.span`
  min-width: 0;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Name = styled.div`
  margin-top: 1px;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 15px;
  }
`

const Title = styled.div`
  /* 푸터(margin-top:auto)와의 최소 간격 — 같은 줄 카드끼리 푸터 y는 auto가 맞춘다 */
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 500;
  color: ${metaText};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid ${hairline};
`

const Years = styled.span`
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 640px) {
    font-size: 11.5px;
    letter-spacing: -0.02em;
  }
`

const Dash = styled.span`
  margin: 0 3px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Age = styled.span`
  font-weight: 500;
  color: ${metaText};

  @media (max-width: 640px) {
    display: none;
  }
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
