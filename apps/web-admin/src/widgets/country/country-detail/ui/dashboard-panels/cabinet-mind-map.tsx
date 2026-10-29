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
  /** 하위 역사국가 소속 정권일 때 표시할 정치체 이름 (예: 독일 제국, 비시 프랑스) */
  polityLabel?: string | null
  /**
   * 몇 번째 정권인지(카드 안 '1 / 3대', 좁은 화면의 아래 넘기기 줄)를 지도가 직접 그릴지.
   * 패널이 위에 정권 띠를 깔면 같은 정보가 두 번 나오므로 끈다. 기본 true.
   */
  showPosition?: boolean
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
   * 공석 부처 슬롯·부처 관리 줄 — 수반/각료 직하단, 선거 카드 위에 놓여
   * '수반 → 각료·부처 → 선거' 위계를 유지한다.
   */
  rosterSlot?: ReactNode
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
 * 가운데 카드와 가지 사이. 곡선이 이 폭 안에서 휜다 — 1440px 표준 데스크톱 본문(960px)에서도
 * 좌·우 가지 + 중앙 카드 3열 마인드맵이 넉넉히 서도록 48px로 잡는다.
 */
const GUTTER = 48
/**
 * 가지 칸 폭 — 최소·최대만 잡고 남는 폭은 흡수한다.
 */
const BRANCH_MIN = 200
const BRANCH_MAX = 520

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
  polityLabel,
  stats,
  renderFace,
  onSelectPerson,
  collapsedLimit = 16,
  expanded,
  onToggleExpand,
  rosterSlot,
  electionSlot,
  nav,
  showPosition = true,
}: CabinetMindMapProps) {
  const visible = expanded ? members : members.slice(0, collapsedLimit)
  const hidden = members.length - visible.length
  const hasBranches = visible.length > 0

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
        $branches={hasBranches}
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
        {hasBranches && (
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
        )}

        <MapCenter $branches={hasBranches}>
          {head ? (
            <CenterCard
              type="button"
              $branches={hasBranches}
              onClick={() => head.personId && onSelectPerson(head.personId)}
              aria-label={`${head.name} 상세`}
            >
              <CenterFace $branches={hasBranches}>
                {renderFace(head, 112)}
              </CenterFace>
              <CenterRole $branches={hasBranches}>
                {head.ordinal != null && `제${head.ordinal}대 `}
                {head.title}
                {!head.endDate && <CenterNow>현직</CenterNow>}
                {polityLabel && <CenterPolity>{polityLabel}</CenterPolity>}
              </CenterRole>
              <CenterName $branches={hasBranches}>{head.name}</CenterName>
              {cabinetLabel && (
                <CenterCabinet $branches={hasBranches}>
                  {cabinetLabel}
                </CenterCabinet>
              )}
              {showPosition && nav && nav.total > 1 && (
                /* 목록을 걷은 대신 위치를 여기 적는다 — 줄기 위에 두면 선을 끊는다 */
                <CenterOrdinal $branches={hasBranches}>
                  {nav.index + 1} / {nav.total}대
                </CenterOrdinal>
              )}
              {stats.length > 0 && (
                <CenterStats $branches={hasBranches}>
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
            <CenterCardStatic $branches={hasBranches}>
              <CenterName $branches={hasBranches}>
                {cabinetLabel ?? '행정부'}
              </CenterName>
              <CenterCabinet $branches={hasBranches}>수반 미등록</CenterCabinet>
            </CenterCardStatic>
          )}
        </MapCenter>

        {hasBranches && (
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
        )}
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

      {showPosition && nav && nav.total > 1 && (
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

      {rosterSlot && <RosterSlotWrap>{rosterSlot}</RosterSlotWrap>}

      {electionSlot && (
        <>
          {hasBranches && <Stem aria-hidden />}
          <ElectionBranch $nav={!!nav} $branches={hasBranches}>
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
          {/* ↻ 기호만으로는 무슨 뜻인지 몰랐다 — 글자로. 전임자는 title 툴팁에 */}
          {member.replaced && <Swap>교체</Swap>}
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
   * 가지가 없는 정권(각료 0명)에서는 아래 부처 슬롯 격자와 같은 폭을 쓰도록 1열 전폭으로 편다.
   * 가지가 있을 때는 3열(또는 nav 포함 5열) 마인드맵 격자를 세운다.
   */
  grid-template-columns: ${({ $nav, $branches }) => {
    if (!$branches) {
      return $nav ? '44px minmax(0, 1fr) 44px' : 'minmax(0, 1fr)'
    }
    const branch = `minmax(${BRANCH_MIN}px, ${BRANCH_MAX}px)`
    return $nav
      ? `44px ${branch} auto ${branch} 44px`
      : `${branch} auto ${branch}`
  }};
  gap: ${({ $branches }) => ($branches ? GUTTER : 20)}px;
  align-items: center;
  justify-content: ${({ $branches }) => ($branches ? 'center' : 'stretch')};

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

  /*
   * 좁은 칼럼 — 수반 카드를 맨 위 한 줄에 눕히고 각료는 여러 열 격자로 깐다.
   */
  @container (max-width: 820px) {
    grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
    gap: 10px;
    justify-content: stretch;
    align-items: stretch;
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
  @container (max-width: 820px) {
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

  @container (max-width: 820px) {
    display: flex;
  }
`

const NavPosition = styled.span`
  font-size: 12px;
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

  @container (max-width: 820px) {
    display: inline-flex;
  }
`

const MapSide = styled.div<{ $side: 'left' | 'right' }>`
  display: flex;
  justify-content: ${({ $side }) =>
    $side === 'left' ? 'flex-end' : 'flex-start'};

  @container (max-width: 820px) {
    display: contents;
  }
`

const GroupBox = styled.div<{ $side: 'left' | 'right' }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${NODE_GAP}px;
  width: 100%;

  /* 좁은 화면에서는 묶음을 풀어 각료가 지도 격자에 바로 앉는다 */
  @container (max-width: 820px) {
    display: contents;
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

  @container (max-width: 820px) {
    display: none;
  }
`

const MapCenter = styled.div<{ $branches?: boolean }>`
  display: flex;
  justify-content: ${({ $branches }) => ($branches ? 'center' : 'stretch')};
  min-width: 0;

  /* 격자에선 DOM 순서(왼쪽 가지 → 가운데 → 오른쪽 가지)대로면 수반이 각료 사이에 낀다 */
  @container (max-width: 820px) {
    grid-column: 1 / -1;
    order: -1;
    justify-content: stretch;
    margin-bottom: 6px;
  }
`

const horizontalCenterLayout = css`
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  column-gap: 22px;
  row-gap: 2px;
  align-content: center;
  align-items: center;
  justify-items: start;
  text-align: left;
  padding: 18px 22px;
`

const centerSurface = css<{ $branches?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 288px;
  padding: 20px 20px 16px;
  border-radius: 20px;
  text-align: center;
  /*
   * 면은 무채색으로 두고 장미색은 직함·현직 표시·얼굴 테두리에만 남긴다.
   */
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.035)'
      : theme.colors.background.primary};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 24px rgba(0,0,0,0.3)'
      : '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)'};

  ${({ $branches }) => !$branches && horizontalCenterLayout}

  /* 좁은 칼럼 — 가로로 눕힌다: 얼굴 | 직함·이름·정권 | 요약 */
  @container (max-width: 820px) {
    ${horizontalCenterLayout}
  }
`

const CenterCard = styled.button<{ $branches?: boolean }>`
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
    border-color: rgba(190, 18, 60, 0.45);
  }
  &:focus-visible {
    outline: 2px solid ${CENTER_ACCENT};
    outline-offset: 3px;
  }
`

const CenterCardStatic = styled.div<{ $branches?: boolean }>`
  ${centerSurface}
`

/** 얼굴 둘레 링 — 가운데가 중심이라는 걸 색이 아니라 형태로 말한다 */
const CenterFace = styled.span<{ $branches?: boolean }>`
  display: inline-flex;
  padding: 4px;
  margin-bottom: 12px;
  border-radius: 999px;
  border: 2px solid rgba(190, 18, 60, 0.55);

  img,
  span {
    border-radius: 999px;
  }

  ${({ $branches }) =>
    !$branches &&
    css`
      grid-column: 1;
      grid-row: 1 / span 4;
      margin-bottom: 0;
    `}

  @container (max-width: 820px) {
    grid-column: 1;
    grid-row: 1 / span 4;
    margin-bottom: 0;
  }
`

const CenterRole = styled.span<{ $branches?: boolean }>`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: ${({ $branches }) => ($branches ? 'center' : 'flex-start')};
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${CENTER_ACCENT};
  ${({ $branches }) =>
    !$branches &&
    css`
      grid-column: 2;
    `}
  @container (max-width: 820px) {
    grid-column: 2;
    justify-content: flex-start;
  }
`

const CenterNow = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: ${CENTER_ACCENT};
`

const CenterPolity = styled.span`
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
`

const CenterName = styled.span<{ $branches?: boolean }>`
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.text.primary};
  ${({ $branches }) =>
    !$branches &&
    css`
      grid-column: 2;
    `}
  @container (max-width: 820px) {
    grid-column: 2;
  }
`

const CenterOrdinal = styled.span<{ $branches?: boolean }>`
  margin-top: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
  ${({ $branches }) =>
    !$branches &&
    css`
      grid-column: 2;
    `}
  @container (max-width: 820px) {
    grid-column: 2;
  }
`

const CenterCabinet = styled.span<{ $branches?: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${({ $branches }) =>
    !$branches &&
    css`
      grid-column: 2;
    `}
  @container (max-width: 820px) {
    grid-column: 2;
  }
`

/**
 * 요약은 카드 **안**에 둔다. 밖에 두면 가운데 칸이 카드보다 커져 곡선이 카드 모서리가
 * 아니라 허공에서 끝난다 — 실제로 그렇게 보였다.
 */
const CenterStats = styled.dl<{ $branches?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 18px;
  width: 100%;
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};

  ${({ $branches, theme }) =>
    !$branches &&
    css`
      grid-column: 3;
      grid-row: 1 / span 4;
      align-self: center;
      width: auto;
      max-width: 520px;
      justify-content: flex-end;
      margin: 0;
      padding: 0 0 0 22px;
      border-top: none;
      border-left: 1px solid ${theme.colors.border.light};
    `}

  /* 눕힌 카드에선 오른쪽 칸 — 세로 구분선으로 이름 칸과 가른다 */
  @container (max-width: 820px) {
    grid-column: 3;
    grid-row: 1 / span 4;
    align-self: center;
    width: auto;
    max-width: 520px;
    justify-content: flex-end;
    margin: 0;
    padding: 0 0 0 22px;
    border-top: none;
    border-left: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  /* 더 좁으면 요약이 이름 칸을 짓눌러 직함이 한 글자씩 꺾였다 — 요약은 아래 줄로 */
  @container (max-width: 760px) {
    grid-column: 1 / -1;
    grid-row: auto;
    justify-self: stretch;
    max-width: none;
    justify-content: flex-start;
    margin-top: 14px;
    padding: 12px 0 0;
    border-left: none;
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const CenterStat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 56px;
`

const CenterStatKey = styled.dt`
  font-size: 12px;
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

const RosterSlotWrap = styled.div`
  margin-top: 16px;
`

/**
 * 가운데 카드에서 선거로 내려가는 줄기.
 */
const Stem = styled.div`
  width: 1px;
  height: 26px;
  margin: 0 auto;
  background: ${lineColor};

  @container (max-width: 820px) {
    display: none;
  }
`

/**
 * 선거 카드 폭.
 */
const ElectionBranch = styled.div<{ $nav?: boolean; $branches?: boolean }>`
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
          display: block;
          margin-top: 16px;

          > * {
            width: 100%;
            max-width: none;
          }
        `}

  /* 좁은 칼럼 — 위 각료 격자와 같은 폭으로 맞춘다 */
  @container (max-width: 820px) {
    display: block;
    margin-top: 16px;

    > * {
      width: 100%;
      max-width: none;
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

  /* 격자 칸에서는 좌·우 가지 구분이 없다 — 모두 얼굴이 왼쪽 */
  @container (max-width: 820px) {
    flex-direction: row;
    text-align: left;

    &:hover {
      transform: none;
    }
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

  @container (max-width: 820px) {
    align-items: flex-start;
  }
`

/** 좁아지면 이름이 먼저다 — 날짜는 그때 물러난다 */
const NodeDate = styled.span`
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @container (max-width: 1120px) {
    display: none;
  }
`

const NodeTitle = styled.span`
  font-size: 12px;
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
  flex-shrink: 0;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: rgba(245, 158, 11, 0.14);
`
