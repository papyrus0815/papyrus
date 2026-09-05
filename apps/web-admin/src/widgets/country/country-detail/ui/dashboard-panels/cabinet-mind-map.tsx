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
  /**
   * 이 정권을 낳은 선거. 지도 아래 줄기로 내려 단다 — 선거가 정권을 낳았으니
   * 별도 패널로 떼어 두면 둘이 남남으로 읽힌다.
   */
  electionSlot?: ReactNode
  /**
   * 정권 넘기기 — 지도 자체가 한 장의 슬라이드다.
   *
   * 예전엔 위에 정권 카드 리스트를 깔아 눌러 고르게 했다. 그러면 화면 맨 위가 목록이
   * 되어 "이 나라의 지금"보다 "정권이 몇 대 있나"가 먼저 읽힌다. 목록을 걷고 지도
   * 양옆에 버튼만 남긴다.
   */
  nav?: {
    /** 왼쪽 = 더 최근 */
    onNewer: (() => void) | null
    /** 오른쪽 = 더 이전 */
    onOlder: (() => void) | null
    newerLabel: string | null
    olderLabel: string | null
    /** 몇 번째 정권인지 — 목록을 걷은 대신 위치를 적는다 */
    index: number
    total: number
    /** 슬라이드 방향 전환을 알리는 키 (정권 id) */
    slideKey: string | null
  }
}

/* ─── 좌표 상수 ────────────────────────────────────────────────────────
 *
 * 곡선을 그리려면 좌표가 필요하고, 좌표를 얻는 길은 둘뿐이다 — DOM 실측이거나
 * 고정 규격이거나. 가계도에서 상수 폭과 실제 DOM 폭이 어긋나 커넥터가 빗나갔던
 * 전례가 있어(genealogy-connector-drift), 여기서는 **규격을 고정해 계산 없이 맞춘다**.
 * 노드 높이·간격·거터가 상수면 i번째 노드의 중심 y는 산술로 나온다.
 */
const NODE_HEIGHT = 54
const NODE_GAP = 12
/**
 * 가운데 카드와 가지 사이. 곡선이 이 폭 안에서 휜다 — 넓을수록 완만하다.
 * 64px는 지도가 좁을 때 정한 값이라 폭을 되찾은 지금은 곡선이 급하게 꺾였다.
 */
const GUTTER = 88
/**
 * 가지 칸 폭 — 최소·최대만 잡고 남는 폭은 흡수한다.
 *
 * 처음엔 248px로 고정했다. "곡선 끝점을 알아야 한다"고 봤기 때문인데, 실제로는 곡선
 * SVG가 **거터 안에만** 있고 그 끝점은 언제나 노드 묶음의 모서리(로컬 좌표 0 또는
 * GUTTER)다 — 가지 폭이 변해도 경로는 어긋나지 않는다. 고정했더니 2,162px 본문에서
 * 좌우로 600px씩 비었다.
 */
const BRANCH_MIN = 200
const BRANCH_MAX = 560

const nodeCenterY = (index: number) =>
  index * (NODE_HEIGHT + NODE_GAP) + NODE_HEIGHT / 2

/** 'YYYY-MM-DD…' → 'YYYY.M.D' — 저장된 달력 날짜를 그대로 찍는다(시간대 보정 금지) */
function formatNodeDate(iso: string): string {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!matched) return ''
  return `${Number(matched[1])}.${Number(matched[2])}.${Number(matched[3])}`
}

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
  electionSlot,
  nav,
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
      <MapRoot
        key={nav?.slideKey ?? 'map'}
        $nav={!!nav}
        $branches={visible.length > 0}
      >
        {nav && (
          <NavButton
            type="button"
            $side="left"
            disabled={!nav.onNewer}
            aria-label={
              nav.newerLabel ? `다음 정부로: ${nav.newerLabel}` : '더 최근 정부 없음'
            }
            title={nav.newerLabel ?? undefined}
            onClick={() => nav.onNewer?.()}
          >
            ‹
          </NavButton>
        )}
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
              <CenterFace>{renderFace(head, 112)}</CenterFace>
              <CenterRole>
                {head.termNumber != null && `제${head.termNumber}대 `}
                {head.title}
                {!head.endDate && <CenterNow>현직</CenterNow>}
              </CenterRole>
              <CenterName>{head.name}</CenterName>
              {cabinetLabel && <CenterCabinet>{cabinetLabel}</CenterCabinet>}
              {nav && nav.total > 1 && (
                /* 목록을 걷은 대신 위치를 여기 적는다 — 줄기 위에 두면 선을 끊는다 */
                <CenterOrdinal>
                  {nav.index + 1} / {nav.total}대
                </CenterOrdinal>
              )}
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
        {nav && (
          <NavButton
            type="button"
            $side="right"
            disabled={!nav.onOlder}
            aria-label={
              nav.olderLabel ? `이전 정부로: ${nav.olderLabel}` : '더 이전 정부 없음'
            }
            title={nav.olderLabel ?? undefined}
            onClick={() => nav.onOlder?.()}
          >
            ›
          </NavButton>
        )}
      </MapRoot>

      {nav && nav.total > 1 && (
        <NavRow>
          <NavCompact
            type="button"
            disabled={!nav.onNewer}
            aria-label={
              nav.newerLabel ? `다음 정부로: ${nav.newerLabel}` : '더 최근 정부 없음'
            }
            onClick={() => nav.onNewer?.()}
          >
            ‹
          </NavCompact>
          <NavPosition>
            {nav.index + 1} / {nav.total}대
          </NavPosition>
          <NavCompact
            type="button"
            disabled={!nav.onOlder}
            aria-label={
              nav.olderLabel ? `이전 정부로: ${nav.olderLabel}` : '더 이전 정부 없음'
            }
            onClick={() => nav.onOlder?.()}
          >
            ›
          </NavCompact>
        </NavRow>
      )}

      {members.length > collapsedLimit && (
        <ExpandRow>
          <ExpandLink type="button" onClick={onToggleExpand}>
            {hidden > 0 ? `각료 ${hidden}명 더 펼치기` : '접기'}
          </ExpandLink>
        </ExpandRow>
      )}

      {electionSlot && (
        <>
          <Stem aria-hidden />
          <ElectionBranch $nav={!!nav} $branches={visible.length > 0}>
            {electionSlot}
          </ElectionBranch>
        </>
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
      <NodeFace>{renderFace(member, 36)}</NodeFace>
      <NodeText $side={side}>
        <NodeTitle>{member.title}</NodeTitle>
        <NodeName>
          {member.name}
          {member.replaced && <Swap aria-label="임기 중 교체">↻</Swap>}
        </NodeName>
      </NodeText>
      {/*
        * 넓어진 가지 칸을 이름 하나로 비워 두지 않는다. 취임일은 각료 명단에서 가장
        * 자주 찾는 값이고, 오른쪽 끝에 세우면 여러 줄이 세로로 정렬돼 표처럼 읽힌다.
        */}
      {member.startDate && (
        <NodeDate>{formatNodeDate(member.startDate)}</NodeDate>
      )}
    </Node>
  )
}

/* ─── 스타일 ──────────────────────────────────────────────────────────── */

const CENTER_ACCENT = '#be123c'

const lineColor = css`
  ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.20)' : 'rgba(15,23,42,0.18)'}
`

/**
 * 지도가 접히는 기준은 화면 폭이 아니라 **이 칼럼의 폭**이다. 좌측 국가 목록과 우측
 * 관리 레일이 폭을 가져가므로 뷰포트로 재면 1,400px 화면에서도 본문은 900px이고,
 * 3열 최소폭(약 1,090px)을 못 채운 채 가로로 넘친다.
 */
const MapWrap = styled.div`
  container-type: inline-size;
  margin-bottom: 18px;
`

/**
 * 가지 칸을 **고정 폭**으로 잡는다. 남는 폭을 나눠 가지면 곡선의 끝점이 화면마다 달라져
 * 상수로 그린 경로와 어긋난다. 지도 자체는 가운데 정렬해 넓은 화면에서도 덩어리로 읽힌다.
 */
const MapRoot = styled.div<{ $nav?: boolean; $branches?: boolean }>`
  display: grid;
  /*
   * 가지가 없는 정권(각료 0명)에서도 가지 칸을 폭대로 잡으면 넘기기 버튼이 카드에서
   * 250px 떨어져 허공에 뜬다 — 가지가 있을 때만 그 칸을 세운다.
   */
  grid-template-columns: ${({ $nav, $branches }) => {
    const branch = $branches
      ? `minmax(${BRANCH_MIN}px, ${BRANCH_MAX}px)`
      : '0'
    return $nav
      ? `44px ${branch} auto ${branch} 44px`
      : `${branch} auto ${branch}`
  }};
  gap: ${({ $branches }) => ($branches ? GUTTER : 20)}px;
  align-items: center;
  justify-content: center;

  /* 정권을 넘길 때 지도가 한 장씩 갈리는 느낌 — key가 바뀌면 다시 재생된다 */
  animation: cabinetSlideIn 0.24s cubic-bezier(0.22, 1, 0.36, 1);

  @keyframes cabinetSlideIn {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @container (max-width: 1120px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    justify-content: stretch;
  }
`

/**
 * 지도 양옆 정권 넘기기 버튼.
 *
 * 끝에 닿아도 감추지 않는다 — 사라지면 지도 전체가 좌우로 밀려 방금 누른 자리에
 * 다른 것이 와 있다. 비활성으로 남겨 자리를 지킨다.
 */
const NavButton = styled.button<{ $side: 'left' | 'right' }>`
  justify-self: ${({ $side }) => ($side === 'left' ? 'end' : 'start')};
  width: 44px;
  height: 44px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  line-height: 1;
  font-family: inherit;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.hover};
    border-color: rgba(190, 18, 60, 0.45);
    color: ${CENTER_ACCENT};
  }
  &:focus-visible {
    outline: 2px solid ${CENTER_ACCENT};
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.28;
    cursor: default;
  }

  /* 좁은 화면에서는 아래 한 줄(NavRow)이 대신한다 */
  @container (max-width: 1120px) {
    display: none;
  }
`

/** 몇 번째 정권인지 — 목록을 걷은 대신 위치를 적는다 */
const NavRow = styled.div`
  /* 넓은 화면에서는 지도 양옆 버튼이 맡는다 */
  display: none;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;

  @container (max-width: 1120px) {
    display: flex;
  }
`

const NavPosition = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 넓은 화면에선 위치 표시만, 좁은 화면에선 이 버튼이 넘기기를 맡는다 */
const NavCompact = styled.button`
  display: none;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-family: inherit;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:disabled {
    opacity: 0.28;
    cursor: default;
  }

  @container (max-width: 1120px) {
    display: inline-flex;
  }
`

const MapSide = styled.div<{ $side: 'left' | 'right' }>`
  display: flex;
  justify-content: ${({ $side }) =>
    $side === 'left' ? 'flex-end' : 'flex-start'};

  @container (max-width: 1120px) {
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
  @container (max-width: 1120px) {
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

  @container (max-width: 1120px) {
    display: none;
  }
`

const MapCenter = styled.div`
  display: flex;
  justify-content: center;
  min-width: 0;

  @container (max-width: 1120px) {
    order: 1;
  }
`

const centerSurface = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 340px;
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
  padding: 4px;
  margin-bottom: 12px;
  border-radius: 999px;
  border: 3px solid rgba(190, 18, 60, 0.5);
  box-shadow:
    0 0 0 1px rgba(190, 18, 60, 0.12),
    0 8px 22px rgba(190, 18, 60, 0.22);

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

const CenterOrdinal = styled.span`
  margin-top: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
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

/**
 * 가운데 카드에서 선거로 내려가는 줄기.
 *
 * 좌우 가지는 곡선이지만 이건 곧은 선이다 — 곡선은 '여럿으로 갈라짐'을, 직선은
 * '하나에서 하나로'를 뜻한다. 선거는 이 정권 하나를 낳았다.
 */
const Stem = styled.div`
  width: 1px;
  height: 26px;
  margin: 0 auto;
  background: ${lineColor};

  @container (max-width: 1120px) {
    display: none;
  }
`

/**
 * 선거 카드 폭.
 *
 * 640px로 두었더니 1,900px짜리 지도 아래에 손바닥만 한 카드가 매달려 균형이 깨졌다.
 * 지도의 **가지 바깥 모서리**까지 맞춘다 — 같은 격자를 깔고 넘기기 버튼 칸만 비운다.
 */
const ElectionBranch = styled.div<{ $nav?: boolean; $branches?: boolean }>`
  /*
   * 가지가 있으면 지도와 같은 격자를 깔아 가지 바깥 모서리까지 맞춘다.
   *
   * 가지가 없을 때 그 격자를 그대로 쓰면 가지 칸이 0이 되고, 남은 auto 칸이 폭 100%인
   * 자식과 서로를 참조해 **세로 한 줄로 찌그러진다**(실제로 독일에서 그렇게 됐다).
   * 그때는 격자를 걷고 가운데 정렬한다.
   */
  ${({ $nav, $branches }) =>
    $branches
      ? css`
          display: grid;
          grid-template-columns: ${$nav
            ? `44px minmax(${BRANCH_MIN}px, ${BRANCH_MAX}px) auto minmax(${BRANCH_MIN}px, ${BRANCH_MAX}px) 44px`
            : `minmax(${BRANCH_MIN}px, ${BRANCH_MAX}px) auto minmax(${BRANCH_MIN}px, ${BRANCH_MAX}px)`};
          gap: ${GUTTER}px;
          justify-content: center;

          > * {
            grid-column: ${$nav ? '2 / -2' : '1 / -1'};
            width: 100%;
          }
        `
      : css`
          display: flex;
          justify-content: center;

          > * {
            width: 100%;
            max-width: 720px;
          }
        `}

  @container (max-width: 1120px) {
    display: flex;
    justify-content: center;

    > * {
      max-width: 640px;
    }
  }
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
  /*
   * 왼쪽 가지는 좌우를 뒤집는다 — 얼굴이 곡선과 만나는 쪽(안쪽)에 서고 날짜는 바깥에
   * 선다. 뒤집지 않으면 왼쪽 날짜만 가운데 카드에 바짝 붙어 중앙이 어수선해진다.
   */
  flex-direction: ${({ $side }) => ($side === 'left' ? 'row-reverse' : 'row')};
  text-align: ${({ $side }) => ($side === 'left' ? 'right' : 'left')};
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

  @container (max-width: 1120px) {
    transform: none;
  }
`

const NodeFace = styled.span`
  display: inline-flex;
  flex-shrink: 0;
`

const NodeText = styled.span<{ $side: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $side }) => ($side === 'left' ? 'flex-end' : 'flex-start')};
  min-width: 0;
  flex: 1;
  gap: 1px;
`

/** 좁아지면 이름이 먼저다 — 날짜는 그때 물러난다 */
const NodeDate = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @container (max-width: 1280px) {
    display: none;
  }
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
  max-width: 100%;
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
