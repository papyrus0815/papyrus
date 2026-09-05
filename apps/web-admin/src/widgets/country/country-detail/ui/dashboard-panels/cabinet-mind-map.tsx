import type { ReactNode } from 'react'

import styled, { css } from 'styled-components'

import type { CabinetMember } from './cabinet-member.types'

export interface CabinetMindMapProps {
  /** 가운데 노드가 될 수반. 없으면 정권 이름만으로 중심을 세운다 */
  head: CabinetMember | null
  /** 가지가 될 각료들 */
  members: CabinetMember[]
  /** 정권 이름 (예: 트럼프 2기 행정부) */
  cabinetLabel: string | null
  /** 가운데 노드 아래 요약 — 취임·재임·각료 수 등 */
  stats: Array<{ key: string; label: string; value: string; warn?: boolean }>
  /** 얼굴은 패널이 그린다(이미지 실패 폴백을 그쪽이 들고 있다) */
  renderFace: (member: CabinetMember, size: number) => ReactNode
  onSelectPerson: (personId: string) => void
  /** 접혀 있을 때 보여줄 각료 수. 넘치면 '모두 보기'가 뜬다 */
  collapsedLimit?: number
  expanded: boolean
  onToggleExpand: () => void
}

/**
 * 행정부 마인드맵 — 가운데 수반, 좌·우로 뻗는 각료.
 *
 * 예전엔 수반 히어로 카드 아래에 각료 칩이 격자로 깔려 있었다. 그러면 "이 정권에 이런
 * 사람들이 있다"는 **목록**은 되지만 "이 사람 밑에 이 사람들이 있다"는 **관계**는 안 보인다.
 * 정권은 본디 한 사람을 중심으로 뻗은 구조라 마인드맵이 그 모양에 맞는다.
 *
 * 연결선은 JS 실측 없이 CSS만으로 그린다. 가계도에서 상수 폭과 실제 DOM 폭이 어긋나
 * 선이 빗나갔던 전례가 있어(genealogy-connector-drift), 여기서는 **노드 높이를 고정**하고
 * 척추선을 그 절반만큼 안쪽으로 들여 좌표를 계산 없이 맞춘다.
 */
export function CabinetMindMap({
  head,
  members,
  cabinetLabel,
  stats,
  renderFace,
  onSelectPerson,
  collapsedLimit = 16,
  expanded,
  onToggleExpand,
}: CabinetMindMapProps) {
  const visible = expanded ? members : members.slice(0, collapsedLimit)
  const hidden = members.length - visible.length

  /*
   * 좌우로 반씩 가른다. 섞지 않고 앞쪽 절반을 왼쪽에 두어, 좁은 화면에서 한 줄로 접혔을 때
   * (왼쪽 → 오른쪽 순서로 이어 읽으므로) 원래 순서가 그대로 유지된다.
   */
  const pivot = Math.ceil(visible.length / 2)
  const leftNodes = visible.slice(0, pivot)
  const rightNodes = visible.slice(pivot)

  return (
    <MapRoot>
      <MapSide $side="left" $spine={leftNodes.length > 0}>
        {leftNodes.map((member) => (
          <BranchNode
            key={member.id}
            member={member}
            side="left"
            renderFace={renderFace}
            onSelectPerson={onSelectPerson}
          />
        ))}
      </MapSide>

      <MapCenter>
        <CenterAnchor
          $left={leftNodes.length > 0}
          $right={rightNodes.length > 0}
        >
        {head ? (
          <CenterCard
            type="button"
            onClick={() => head.personId && onSelectPerson(head.personId)}
            aria-label={`${head.name} 상세`}
          >
            <CenterFace>{renderFace(head, 84)}</CenterFace>
            <CenterRole>
              {head.termNumber != null && `제${head.termNumber}대 `}
              {head.title}
              {!head.endDate && <CenterNow>현직</CenterNow>}
            </CenterRole>
            <CenterName>{head.name}</CenterName>
            {cabinetLabel && <CenterCabinet>{cabinetLabel}</CenterCabinet>}
          </CenterCard>
        ) : (
          <CenterCardStatic>
            <CenterName>{cabinetLabel ?? '행정부'}</CenterName>
            <CenterCabinet>수반 미등록</CenterCabinet>
          </CenterCardStatic>
        )}
        </CenterAnchor>

        {stats.length > 0 && (
          <CenterStats>
            {stats.map((stat) => (
              <CenterStat key={stat.key}>
                <CenterStatKey>{stat.label}</CenterStatKey>
                <CenterStatValue $warn={stat.warn}>
                  {stat.value}
                </CenterStatValue>
              </CenterStat>
            ))}
          </CenterStats>
        )}

        {(hidden > 0 || expanded) && members.length > collapsedLimit && (
          <ExpandLink type="button" onClick={onToggleExpand}>
            {hidden > 0 ? `각료 ${hidden}명 더 펼치기` : '접기'}
          </ExpandLink>
        )}
      </MapCenter>

      <MapSide $side="right" $spine={rightNodes.length > 0}>
        {rightNodes.map((member) => (
          <BranchNode
            key={member.id}
            member={member}
            side="right"
            renderFace={renderFace}
            onSelectPerson={onSelectPerson}
          />
        ))}
      </MapSide>
    </MapRoot>
  )
}

interface BranchNodeProps {
  member: CabinetMember
  side: 'left' | 'right'
  renderFace: (member: CabinetMember, size: number) => ReactNode
  onSelectPerson: (personId: string) => void
}

function BranchNode({
  member,
  side,
  renderFace,
  onSelectPerson,
}: BranchNodeProps) {
  return (
    <Node
      $side={side}
      type="button"
      onClick={() => member.personId && onSelectPerson(member.personId)}
      title={
        member.replaced && member.predecessor
          ? `${member.predecessor} 후임`
          : member.title
      }
    >
      <NodeFace>{renderFace(member, 28)}</NodeFace>
      <NodeText>
        <NodeTitle>{member.title}</NodeTitle>
        <NodeName>
          {member.name}
          {member.replaced && <Swap aria-label="임기 중 교체">↻</Swap>}
        </NodeName>
      </NodeText>
    </Node>
  )
}

/* ─── 좌표 상수 ────────────────────────────────────────────────────────
 * 노드 높이를 고정하고 그 절반을 척추선 안쪽 여백으로 쓴다 — 첫/마지막 노드의
 * 한가운데에서 선이 시작·끝나게 하는 유일한 방법이 실측 아니면 이 고정값이다.
 */
const NODE_HEIGHT = 46
const HALF_NODE = NODE_HEIGHT / 2
/** 가운데 칸과 가지 칸 사이 간격. 척추선은 그 한가운데 선다 */
const GUTTER = 56
const SPINE_OFFSET = GUTTER / 2

const lineColor = css`
  ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)'}
`

const MapRoot = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: ${GUTTER}px;
  align-items: center;
  margin-bottom: 18px;

  /* 좁으면 가운데를 위로 올리고 가지를 아래로 잇는다 — 두 칸이 순서대로 이어진다 */
  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    justify-items: stretch;
  }
`

const MapSide = styled.div<{ $side: 'left' | 'right'; $spine: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: ${({ $side }) => ($side === 'left' ? 'flex-end' : 'flex-start')};

  /* 척추선 — 첫 노드 한가운데에서 마지막 노드 한가운데까지 */
  ${({ $spine, $side }) =>
    $spine &&
    css`
      &::before {
        content: '';
        position: absolute;
        top: ${HALF_NODE}px;
        bottom: ${HALF_NODE}px;
        ${$side === 'left'
          ? `right: -${SPINE_OFFSET}px;`
          : `left: -${SPINE_OFFSET}px;`}
        width: 1px;
        background: ${lineColor};
      }
    `}

  @media (max-width: 1100px) {
    align-items: stretch;
    order: 2;

    &::before {
      left: 12px;
      right: auto;
    }
  }
`

const MapCenter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 0;

  @media (max-width: 1100px) {
    order: 1;
  }
`

/**
 * 가로 연결선의 기준점.
 *
 * 커넥터를 칼럼(MapCenter)에 걸면 요약줄까지 포함한 높이의 50%에서 선이 나가 **카드
 * 한가운데를 비껴간다**. 카드만 감싼 이 상자의 50%가 곧 카드의 한가운데다.
 * 폭은 칼럼을 꽉 채워야 선이 칼럼 가장자리에서 출발한다.
 */
const CenterAnchor = styled.div<{ $left: boolean; $right: boolean }>`
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    height: 1px;
    width: ${SPINE_OFFSET}px;
    background: ${lineColor};
  }
  &::before {
    left: -${SPINE_OFFSET}px;
    display: ${({ $left }) => ($left ? 'block' : 'none')};
  }
  &::after {
    right: -${SPINE_OFFSET}px;
    display: ${({ $right }) => ($right ? 'block' : 'none')};
  }

  @media (max-width: 1100px) {
    &::before,
    &::after {
      display: none;
    }
  }
`

const centerSurface = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 18px 26px 20px;
  border-radius: 18px;
  border: 1px solid rgba(190, 18, 60, 0.35);
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(190,18,60,0.10)' : 'rgba(190,18,60,0.05)'};
  text-align: center;
  max-width: 320px;
`

const CenterCard = styled.button`
  ${centerSurface}
  appearance: none;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    transform 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(190, 18, 60, 0.6);
  }
  &:focus-visible {
    outline: 2px solid rgba(190, 18, 60, 0.7);
    outline-offset: 2px;
  }
`

const CenterCardStatic = styled.div`
  ${centerSurface}
`

const CenterFace = styled.span`
  display: inline-flex;
  margin-bottom: 6px;
`

const CenterRole = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #be123c;
`

const CenterNow = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #be123c;
`

const CenterName = styled.span`
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CenterCabinet = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CenterStats = styled.dl`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 20px;
  margin: 0;
`

const CenterStat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
`

const CenterStatKey = styled.dt`
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CenterStatValue = styled.dd<{ $warn?: boolean }>`
  margin: 0;
  font-size: 13.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: ${({ $warn, theme }) =>
    $warn ? '#b45309' : theme.colors.text.primary};
`

const ExpandLink = styled.button`
  border: none;
  background: none;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const Node = styled.button<{ $side: 'left' | 'right' }>`
  position: relative;
  appearance: none;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  max-width: 260px;
  height: ${NODE_HEIGHT}px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  /* 노드 → 척추선 잔가지 */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    height: 1px;
    width: ${SPINE_OFFSET}px;
    background: ${lineColor};
    ${({ $side }) =>
      $side === 'left'
        ? `right: -${SPINE_OFFSET}px;`
        : `left: -${SPINE_OFFSET}px;`}
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 2px;
  }

  @media (max-width: 1100px) {
    max-width: none;
    margin-left: 24px;

    &::before {
      left: -12px;
      right: auto;
      width: 12px;
    }
  }
`

const NodeFace = styled.span`
  display: inline-flex;
  flex-shrink: 0;
`

const NodeText = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
`

const NodeTitle = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const NodeName = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Swap = styled.span`
  font-size: 10px;
  color: #b45309;
`
