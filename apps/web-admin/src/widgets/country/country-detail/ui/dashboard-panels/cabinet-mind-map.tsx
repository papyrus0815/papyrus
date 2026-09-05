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
  /** 가운데 노드 안 요약 — 취임·재임·각료 수 등 */
  stats: Array<{ key: string; label: string; value: string; warn?: boolean }>
  /** 얼굴은 패널이 그린다(이미지 실패 폴백을 그쪽이 들고 있다) */
  renderFace: (member: CabinetMember, size: number) => ReactNode
  onSelectPerson: (personId: string) => void
  /** 접혀 있을 때 보여줄 각료 수. 넘치면 '더 펼치기'가 뜬다 */
  collapsedLimit?: number
  expanded: boolean
  onToggleExpand: () => void
}

/* ─── 좌표 상수 ────────────────────────────────────────────────────────
 *
 * 곡선을 그리려면 좌표가 필요하고, 좌표를 얻는 길은 둘뿐이다 — DOM 실측이거나
 * 고정 규격이거나. 가계도에서 상수 폭과 실제 DOM 폭이 어긋나 커넥터가 빗나갔던
 * 전례가 있어(genealogy-connector-drift), 여기서는 **규격을 고정해 계산 없이 맞춘다**.
 * 노드 높이·간격·거터가 상수면 i번째 노드의 중심 y는 산술로 나온다.
 */
const NODE_HEIGHT = 46
const NODE_GAP = 12
/** 가운데 카드와 가지 사이. 곡선이 이 폭 안에서 휜다 */
const GUTTER = 64
/** 가지 칸 폭 고정 — 곡선의 끝점이 어디인지 알아야 한다 */
const BRANCH_WIDTH = 236

const nodeCenterY = (index: number) =>
  index * (NODE_HEIGHT + NODE_GAP) + NODE_HEIGHT / 2

const groupHeightOf = (count: number) =>
  count > 0 ? count * NODE_HEIGHT + (count - 1) * NODE_GAP : 0

/**
 * 행정부 마인드맵 — 가운데 수반, 좌·우로 휘어 나가는 각료.
 *
 * 예전엔 수반 히어로 카드 아래에 각료 칩이 격자로 깔려 있었다. 그러면 "이 정권에 이런
 * 사람들이 있다"는 **목록**은 되지만 "이 사람 밑에 이 사람들이 있다"는 **관계**는 안 보인다.
 * 정권은 본디 한 사람을 중심으로 뻗은 구조라 마인드맵이 그 모양에 맞는다.
 *
 * 가지는 직각 브래킷이 아니라 **베지어 곡선**이다. 직각으로 꺾으면 조직도가 되고,
 * 조직도는 지휘계통을 주장한다 — 여기 있는 건 "이 정권을 이룬 사람들"이지 명령 체계가
 * 아니다. 곡선이 그 느슨한 소속을 더 정확히 말한다.
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
    <MapWrap>
      <MapRoot>
        <MapSide $side="left">
          <SideGroup side="left" nodes={leftNodes}>
            {leftNodes.map((member) => (
              <BranchNode
                key={member.id}
                member={member}
                side="left"
                renderFace={renderFace}
                onSelectPerson={onSelectPerson}
              />
            ))}
          </SideGroup>
        </MapSide>

        <MapCenter>
          {head ? (
            <CenterCard
              type="button"
              onClick={() => head.personId && onSelectPerson(head.personId)}
              aria-label={`${head.name} 상세`}
            >
              <CenterFace>{renderFace(head, 92)}</CenterFace>
              <CenterRole>
                {head.termNumber != null && `제${head.termNumber}대 `}
                {head.title}
                {!head.endDate && <CenterNow>현직</CenterNow>}
              </CenterRole>
              <CenterName>{head.name}</CenterName>
              {cabinetLabel && <CenterCabinet>{cabinetLabel}</CenterCabinet>}
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
            </CenterCard>
          ) : (
            <CenterCardStatic>
              <CenterName>{cabinetLabel ?? '행정부'}</CenterName>
              <CenterCabinet>수반 미등록</CenterCabinet>
            </CenterCardStatic>
          )}
        </MapCenter>

        <MapSide $side="right">
          <SideGroup side="right" nodes={rightNodes}>
            {rightNodes.map((member) => (
              <BranchNode
                key={member.id}
                member={member}
                side="right"
                renderFace={renderFace}
                onSelectPerson={onSelectPerson}
              />
            ))}
          </SideGroup>
        </MapSide>
      </MapRoot>

      {members.length > collapsedLimit && (
        <ExpandRow>
          <ExpandLink type="button" onClick={onToggleExpand}>
            {hidden > 0 ? `각료 ${hidden}명 더 펼치기` : '접기'}
          </ExpandLink>
        </ExpandRow>
      )}
    </MapWrap>
  )
}

interface SideGroupProps {
  side: 'left' | 'right'
  nodes: CabinetMember[]
  children: ReactNode
}

/**
 * 한쪽 가지 묶음 + 그 묶음에서 가운데로 뻗는 곡선.
 *
 * 곡선 SVG를 칼럼이 아니라 **묶음**에 붙이는 게 핵심이다. 칼럼은 행 높이만큼 늘어나
 * 그 안에서 묶음이 어디에 놓이는지 알 수 없지만, 묶음 자신을 기준으로 하면 첫 노드부터
 * 마지막 노드까지가 곧 좌표계다.
 */
function SideGroup({ side, nodes, children }: SideGroupProps) {
  const height = groupHeightOf(nodes.length)
  const originY = height / 2

  return (
    <GroupBox $side={side}>
      {nodes.length > 0 && (
        <BranchSvg
          $side={side}
          width={GUTTER}
          height={height}
          viewBox={`0 0 ${GUTTER} ${height}`}
          aria-hidden
          focusable="false"
        >
          {nodes.map((member, index) => {
            const y = nodeCenterY(index)
            /* 제어점을 거터 한가운데 두면 양끝에서 수평으로 빠져나가 부드럽게 만난다 */
            const path =
              side === 'left'
                ? `M ${GUTTER} ${originY} C ${GUTTER / 2} ${originY}, ${GUTTER / 2} ${y}, 0 ${y}`
                : `M 0 ${originY} C ${GUTTER / 2} ${originY}, ${GUTTER / 2} ${y}, ${GUTTER} ${y}`
            return <path key={member.id} d={path} />
          })}
        </BranchSvg>
      )}
      {children}
    </GroupBox>
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
      $replaced={member.replaced}
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

/* ─── 스타일 ──────────────────────────────────────────────────────────── */

const CENTER_ACCENT = '#be123c'

const lineColor = css`
  ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.20)' : 'rgba(15,23,42,0.18)'}
`

const MapWrap = styled.div`
  margin-bottom: 18px;
`

/**
 * 가지 칸을 **고정 폭**으로 잡는다. 남는 폭을 나눠 가지면 곡선의 끝점이 화면마다 달라져
 * 상수로 그린 경로와 어긋난다. 지도 자체는 가운데 정렬해 넓은 화면에서도 덩어리로 읽힌다.
 */
const MapRoot = styled.div`
  display: grid;
  grid-template-columns: ${BRANCH_WIDTH}px auto ${BRANCH_WIDTH}px;
  gap: ${GUTTER}px;
  align-items: center;
  justify-content: center;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    justify-content: stretch;
  }
`

const MapSide = styled.div<{ $side: 'left' | 'right' }>`
  display: flex;
  justify-content: ${({ $side }) =>
    $side === 'left' ? 'flex-end' : 'flex-start'};

  @media (max-width: 1100px) {
    order: 2;
  }
`

const GroupBox = styled.div<{ $side: 'left' | 'right' }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${NODE_GAP}px;
  width: 100%;

  /* 좁은 화면에서는 곡선 대신 왼쪽 세로줄 하나로 접는다 */
  @media (max-width: 1100px) {
    padding-left: 18px;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: ${NODE_HEIGHT / 2}px;
      bottom: ${NODE_HEIGHT / 2}px;
      width: 1px;
      background: ${lineColor};
    }
  }
`

const BranchSvg = styled.svg<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 0;
  ${({ $side }) =>
    $side === 'left' ? `right: -${GUTTER}px;` : `left: -${GUTTER}px;`}
  pointer-events: none;
  overflow: visible;

  path {
    fill: none;
    stroke: ${lineColor};
    stroke-width: 1.25;
  }

  @media (max-width: 1100px) {
    display: none;
  }
`

const MapCenter = styled.div`
  display: flex;
  justify-content: center;
  min-width: 0;

  @media (max-width: 1100px) {
    order: 1;
  }
`

const centerSurface = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 268px;
  padding: 22px 24px 18px;
  border-radius: 20px;
  border: 1px solid rgba(190, 18, 60, 0.3);
  text-align: center;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(190,18,60,0.16), rgba(190,18,60,0.05))'
      : 'linear-gradient(180deg, rgba(190,18,60,0.07), rgba(255,255,255,0.9))'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 10px 30px rgba(0,0,0,0.35)'
      : '0 10px 26px rgba(190,18,60,0.10)'};
`

const CenterCard = styled.button`
  ${centerSurface}
  appearance: none;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(190, 18, 60, 0.55);
    box-shadow: 0 14px 34px rgba(190, 18, 60, 0.18);
  }
  &:focus-visible {
    outline: 2px solid ${CENTER_ACCENT};
    outline-offset: 3px;
  }
`

const CenterCardStatic = styled.div`
  ${centerSurface}
`

/** 얼굴 둘레 링 — 가운데가 중심이라는 걸 색이 아니라 형태로 말한다 */
const CenterFace = styled.span`
  display: inline-flex;
  padding: 3px;
  margin-bottom: 10px;
  border-radius: 999px;
  border: 2px solid rgba(190, 18, 60, 0.45);

  img,
  span {
    border-radius: 999px;
  }
`

const CenterRole = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${CENTER_ACCENT};
`

const CenterNow = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: ${CENTER_ACCENT};
`

const CenterName = styled.span`
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CenterCabinet = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/**
 * 요약은 카드 **안**에 둔다. 밖에 두면 가운데 칸이 카드보다 커져 곡선이 카드 모서리가
 * 아니라 허공에서 끝난다 — 실제로 그렇게 보였다.
 */
const CenterStats = styled.dl`
  /*
   * 격자(auto-fit)로 두면 마지막 줄이 칸 수를 그대로 물려받아 두 칸이 세 칸 폭에
   * 늘어붙는다 — 첫 줄과 어긋나 보였다. 줄바꿈된 나머지가 가운데로 모이도록 flex.
   */
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 18px;
  width: 100%;
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px solid rgba(190, 18, 60, 0.18);
`

const CenterStat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 56px;
`

const CenterStatKey = styled.dt`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CenterStatValue = styled.dd<{ $warn?: boolean }>`
  margin: 0;
  font-size: 12.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  white-space: nowrap;
  color: ${({ $warn, theme }) =>
    $warn ? '#b45309' : theme.colors.text.primary};
`

const ExpandRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 12px;
`

const ExpandLink = styled.button`
  border: none;
  background: none;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const Node = styled.button<{ $side: 'left' | 'right'; $replaced: boolean }>`
  position: relative;
  appearance: none;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: ${NODE_HEIGHT}px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    border-color: ${({ theme }) => theme.colors.border.medium};
    transform: translateX(
      ${({ $side }) => ($side === 'left' ? '-2px' : '2px')}
    );
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 2px;
  }

  /* 임기 중 교체된 자리 — 색을 칠하지 않고 가장자리 한 줄로만 표시한다 */
  ${({ $replaced }) =>
    $replaced &&
    css`
      border-color: rgba(180, 83, 9, 0.35);
    `}

  @media (max-width: 1100px) {
    transform: none;
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
  letter-spacing: 0.01em;
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
