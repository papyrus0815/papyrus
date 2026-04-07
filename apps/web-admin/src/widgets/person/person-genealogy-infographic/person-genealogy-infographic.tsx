/**
 * 인물 상세 가계도 — 부모(가로 한 줄) 아래 ∩형 가지 → 본인 → 자녀
 */
import { FiHeart, FiUsers } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { getUploadImageUrl } from '@/shared/api/upload'
import {
  type PersonNameFields,
  getPersonDisplayName,
} from '@/shared/lib/person-display-name'

type NodePerson = PersonNameFields & {
  id?: string
  profileImageUrl?: string | null
  /** 상세 API가 내려주는 프로필 갤러리(우선순위 1장만). profileImageUrl이 비었을 때 썸네일 폴백 */
  profileImages?: { url?: string | null }[] | null
}

type AvatarRole = 'parent' | 'parentAlt' | 'ego' | 'spouse' | 'child'

function resolvePersonThumbnailSrc(person: {
  profileImageUrl?: string | null
  profileImages?: { url?: string | null }[] | null
}): string | null {
  const primary = person.profileImageUrl?.trim()
  if (primary) return getUploadImageUrl(primary) || primary
  const gallery = person.profileImages?.[0]?.url?.trim()
  if (gallery) return getUploadImageUrl(gallery) || gallery
  return null
}

function GeoThumbnail({
  person,
  role,
}: {
  person: NodePerson
  role: AvatarRole
}) {
  const displayName = getPersonDisplayName(person, true)
  const src = resolvePersonThumbnailSrc(person)
  return (
    <NodeAvatar $role={role} $hasImage={Boolean(src)}>
      {src ? (
        <AvatarImage
          src={src}
          alt={`${displayName} 프로필 사진`}
          loading="lazy"
          decoding="async"
        />
      ) : (
        displayInitial(person)
      )}
    </NodeAvatar>
  )
}

export interface PersonGenealogyInfographicProps {
  ego: NodePerson
  father?: NodePerson | null
  mother?: NodePerson | null
  spouse?: NodePerson | null
  children?: NodePerson[] | null
}

function displayInitial(p: PersonNameFields): string {
  const full = getPersonDisplayName(p, true).trim()
  if (!full) return '?'
  return [...full][0] ?? '?'
}

/** 부모 둘: 각각 아래로 내려와 가로로 만난 뒤, 가운데에서 본인 쪽으로 수직 */
function ForkFromTwoParents() {
  return (
    <ForkSvg
      viewBox="0 0 400 52"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMin meet"
      aria-hidden
    >
      <title>부모 두 분에서 이어지는 혈연선</title>
      <path
        d="M 100 0 L 100 18 M 300 0 L 300 18 M 100 18 L 300 18 M 200 18 L 200 52"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </ForkSvg>
  )
}

/** 부모 한 명: 카드 중앙에서 수직으로만 하강 */
function ForkFromOneParent() {
  return (
    <ForkSvg
      viewBox="0 0 120 52"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMin meet"
      aria-hidden
    >
      <title>부모에서 이어지는 혈연선</title>
      <path
        d="M 60 0 L 60 52"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </ForkSvg>
  )
}

/** 본인에서 자녀: 1명은 직선, 2명 이상은 ㅗ형 가지 */
function ForkToChildren({ count }: { count: number }) {
  if (count <= 1) {
    return (
      <ForkSvg
        viewBox="0 0 120 44"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMin meet"
        aria-hidden
      >
        <title>본인에서 자녀로 이어지는 혈연선</title>
        <path
          d="M 60 0 L 60 44"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </ForkSvg>
    )
  }
  if (count === 2) {
    return (
      <ForkSvg
        viewBox="0 0 400 44"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMin meet"
        aria-hidden
      >
        <title>본인에서 두 자녀로 갈라지는 혈연선</title>
        <path
          d="M 200 0 L 200 14 L 100 14 L 100 44 M 200 14 L 300 14 L 300 44"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </ForkSvg>
    )
  }
  return (
    <ForkSvg
      viewBox="0 0 400 44"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMin meet"
      aria-hidden
    >
      <title>본인에서 자녀들로 갈라지는 혈연선</title>
      <path
        d="M 200 0 L 200 14 L 60 14 H 340 M 60 14 L 60 44 M 200 14 L 200 44 M 340 14 L 340 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </ForkSvg>
  )
}

export function PersonGenealogyInfographic({
  ego,
  father,
  mother,
  spouse,
  children,
}: PersonGenealogyInfographicProps) {
  const childList = (children ?? []).filter(Boolean)
  const hasParents = Boolean(father || mother)
  const hasSpouse = Boolean(spouse)
  const hasChildren = childList.length > 0
  const twoParents = Boolean(father && mother)

  if (!hasParents && !hasSpouse && !hasChildren) {
    return null
  }

  return (
    <Root>
      <InfographicHeader>
        <HeaderIcon aria-hidden>
          <FiUsers size={18} strokeWidth={1.75} />
        </HeaderIcon>
        <HeaderText>
          <HeaderTitle>가계도</HeaderTitle>
          <HeaderDesc>
            위·아래가 세대입니다. 가로로 이어진 선은 부부(또는 형제 줄기),
            아래로 꺾인 선은 자녀·후손 방향입니다.
          </HeaderDesc>
        </HeaderText>
      </InfographicHeader>

      <TreeCanvas>
        {hasParents && (
          <GenerationBlock>
            <GenerationTitle>① 부모 세대</GenerationTitle>
            <ParentsCardRow $two={twoParents}>
              {father && (
                <GeoNode $role="parent">
                  <GeoThumbnail person={father} role="parent" />
                  <NodeName>{getPersonDisplayName(father, true)}</NodeName>
                  <NodeBadge $role="parent">아버지</NodeBadge>
                </GeoNode>
              )}
              {mother && (
                <GeoNode $role="parent">
                  <GeoThumbnail person={mother} role="parentAlt" />
                  <NodeName>{getPersonDisplayName(mother, true)}</NodeName>
                  <NodeBadge $role="parentAlt">어머니</NodeBadge>
                </GeoNode>
              )}
            </ParentsCardRow>
            <ForkTrack>
              {twoParents ? <ForkFromTwoParents /> : <ForkFromOneParent />}
            </ForkTrack>
          </GenerationBlock>
        )}

        <GenerationBlock>
          <GenerationTitle>
            {hasParents ? '② 본인 세대' : '① 본인 세대'}
          </GenerationTitle>
          <EgoRow>
            <GeoNode $role="ego" $emphasis>
              <GeoThumbnail person={ego} role="ego" />
              <NodeName>{getPersonDisplayName(ego, true)}</NodeName>
              <NodeBadge $role="ego">본인</NodeBadge>
            </GeoNode>
            {hasSpouse && spouse && (
              <>
                <SpouseJoin aria-hidden>
                  <svg
                    width="36"
                    height="20"
                    viewBox="0 0 36 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M 0 10 L 36 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <SpouseHeart>
                    <FiHeart size={13} strokeWidth={2.2} />
                  </SpouseHeart>
                </SpouseJoin>
                <GeoNode $role="spouse">
                  <GeoThumbnail person={spouse} role="spouse" />
                  <NodeName>{getPersonDisplayName(spouse, true)}</NodeName>
                  <NodeBadge $role="spouse">배우자</NodeBadge>
                </GeoNode>
              </>
            )}
          </EgoRow>
        </GenerationBlock>

        {hasChildren && (
          <GenerationBlock>
            <ForkTrack $compact>
              <ForkToChildren count={childList.length} />
            </ForkTrack>
            <GenerationTitle>
              {hasParents ? '③ 자녀 세대' : '② 자녀 세대'}
            </GenerationTitle>
            <ChildrenGrid $count={childList.length}>
              {childList.map((child, idx) => (
                <GeoNode key={child.id ?? `child-${idx}`} $role="child">
                  <GeoThumbnail person={child} role="child" />
                  <NodeName>{getPersonDisplayName(child, true)}</NodeName>
                  <NodeBadge $role="child">자녀</NodeBadge>
                </GeoNode>
              ))}
            </ChildrenGrid>
          </GenerationBlock>
        )}
      </TreeCanvas>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const InfographicHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 20px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        `
      : css`
          background: ${theme.colors.background.secondary};
          border: 1px solid ${theme.colors.border.light};
        `}
`

const HeaderIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
`

const HeaderText = styled.div`
  min-width: 0;
`

const HeaderTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeaderDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeCanvas = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 4px 12px;
  width: 100%;
`

const GenerationBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 720px;
`

const GenerationTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 10px;
  align-self: flex-start;
  width: 100%;
  padding-left: 2px;
`

const ParentsCardRow = styled.div<{ $two: boolean }>`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: stretch;
  gap: ${({ $two }) => ($two ? 'clamp(20px, 8vw, 56px)' : '0')};
  width: 100%;
`

const ForkTrack = styled.div<{ $compact?: boolean }>`
  width: 100%;
  max-width: 560px;
  height: ${({ $compact }) => ($compact ? '48px' : '56px')};
  margin: 4px 0 8px;
  /* 중립 회색 혈연선 (라이트: 스톤, 다크: 슬레이트) */
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(148, 163, 184, 0.5)'
      : 'rgba(120, 113, 108, 0.55)'};
`

const ForkSvg = styled.svg`
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
`

const EgoRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
`

const SpouseJoin = styled.div`
  position: relative;
  flex: 0 0 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  margin: 0 2px;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(148, 163, 184, 0.5)'
      : 'rgba(120, 113, 108, 0.55)'};
`

const SpouseHeart = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  padding: 2px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? theme.colors.background.primary
      : theme.colors.background.primary};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,113,133,0.95)' : '#e11d48'};
`

const ChildrenGrid = styled.div<{ $count: number }>`
  display: grid;
  width: 100%;
  gap: 16px 18px;
  grid-template-columns: repeat(
    auto-fit,
    minmax(${({ $count }) => ($count <= 2 ? '220px' : '176px')}, 1fr)
  );
  justify-content: center;
  justify-items: stretch;
`

const GeoNode = styled.div<{ $role: string; $emphasis?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  flex: 0 1 280px;
  min-width: 156px;
  max-width: 300px;
  min-height: 168px;
  padding: 18px 14px 14px;
  border-radius: 20px;
  justify-content: flex-start;
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  ${({ $emphasis, theme }) =>
    $emphasis
      ? css`
          ${theme.mode === 'dark'
            ? css`
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.35);
              `
            : css`
                background: ${theme.colors.background.primary};
                border: 1px solid ${theme.colors.border.default};
                box-shadow:
                  0 1px 2px rgba(15, 23, 42, 0.04),
                  0 0 0 1px rgba(99, 102, 241, 0.2);
              `}
        `
      : css`
          ${theme.mode === 'dark'
            ? css`
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.06);
              `
            : css`
                background: ${theme.colors.background.primary};
                border: 1px solid ${theme.colors.border.light};
              `}
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
          &:hover {
            transform: translateY(-1px);
            ${theme.mode === 'dark'
              ? css`
                  border-color: rgba(255, 255, 255, 0.1);
                `
              : css`
                  border-color: ${theme.colors.border.medium};
                  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
                `}
          }
        `}
`

const AvatarImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const NodeAvatar = styled.div<{ $role: string; $hasImage?: boolean }>`
  width: 96px;
  height: 96px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);

  ${({ $hasImage }) =>
    $hasImage
      ? css`
          padding: 0;
        `
      : css``}

  ${({ $role }) => {
    switch ($role) {
      case 'parent':
        return css`
          background: #6366f1;
        `
      case 'parentAlt':
        return css`
          background: #8b5cf6;
        `
      case 'ego':
        return css`
          background: #0d9488;
        `
      case 'spouse':
        return css`
          background: #e11d48;
        `
      case 'child':
        return css`
          background: #0284c7;
        `
      default:
        return css`
          background: #64748b;
        `
    }
  }}
`

const NodeName = styled.div`
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

const NodeBadge = styled.span<{ $role: string }>`
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  padding: 4px 10px;
  border-radius: 8px;
  margin-top: auto;

  ${({ $role, theme }) => {
    const pill = (bg: string, fg: string) => css`
      background: ${bg};
      color: ${fg};
    `
    const dark = theme.mode === 'dark'
    switch ($role) {
      case 'parent':
        return pill(
          dark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
          dark ? '#a5b4fc' : '#4f46e5',
        )
      case 'parentAlt':
        return pill(
          dark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)',
          dark ? '#c4b5fd' : '#6d28d9',
        )
      case 'ego':
        return pill(
          dark ? 'rgba(45,212,191,0.15)' : 'rgba(13,148,136,0.1)',
          dark ? '#5eead4' : '#0f766e',
        )
      case 'spouse':
        return pill(
          dark ? 'rgba(244,63,94,0.15)' : 'rgba(225,29,72,0.08)',
          dark ? '#fda4af' : '#be123c',
        )
      case 'child':
        return pill(
          dark ? 'rgba(14,165,233,0.15)' : 'rgba(2,132,199,0.1)',
          dark ? '#7dd3fc' : '#0369a1',
        )
      default:
        return pill(
          dark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.15)',
          theme.colors.text.secondary,
        )
    }
  }}
`
