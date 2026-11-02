import { Fragment, type ReactNode } from 'react'

import styled, { css } from 'styled-components'

import type { CabinetMember } from './cabinet-member.types'

export interface CabinetBranchSlot {
  key: string
  node: ReactNode
}

export interface CabinetMindMapProps {
  /** 가운데 노드가 될 수반. 없으면 정권 이름만으로 중심을 세운다 */
  head: CabinetMember | null
  /**
   * 이원집정부제·의원내각제·입헌군주제 등에서 동시대 대응 수반 (단건 호환)
   */
  counterpartHead?: CabinetMember | null
  /**
   * 동시대 대응 수반·내각 목록
   * - 내각 중심 보기일 때: 해당 내각 기간에 재위한 황제·국왕·국가원수 목록
   * - 군주 중심 보기일 때: 해당 군주 재위기에 출범한 행정부(내각·총리) 목록
   */
  counterpartHeads?: CabinetMember[]
  /** 동시대 군주 카드를 눌러 해당 군주의 치세 보기로 전환할 때 */
  onSelectCounterpartHead?: (member: CabinetMember) => void
  /** 군주 중심 보기에서 동시대 내각 카드를 눌러 해당 내각으로 전환할 때 */
  onSelectCabinet?: (cabinetId: string) => void
  /** 군주 중심 보기에서 동시대 내각·수반을 새로 등록할 때 */
  onRegisterCabinetHead?: () => void
  /** 내각 중심 보기에서 동시대 군주·국가원수를 새로 등록할 때 */
  onRegisterCounterpartHead?: () => void
  /** 현재 정권·치세에 각료(장관·대신 등)를 바로 등록할 때 */
  onRegisterMinister?: () => void
  /** 수반이 아직 없을 때 가운데 빈 카드에 표시할 기본 수반 직책 라벨 (예: 정부 수반, 대통령, 내각총리대신) */
  emptyHeadRoleLabel?: string | null
  /** 해당 정권 시기의 정체(정부형태) 라벨 (예: 대통령제, 의원내각제, 입헌군주제) */
  regimeLabel?: string | null
  /** 가지가 될 각료들 */
  members: CabinetMember[]
  /**
   * 각료(members) 외에 마인드맵 좌·우 가지에 함께 달 부처 슬롯·기본 틀 슬롯(54px 규격).
   * 각료가 0명이거나 적은 국가에서도 중앙 수반 카드 좌·우로 베지어 곡선 가지가 뻗는
   * 동일한 3열 마인드맵 구조를 유지한다.
   */
  branchSlots?: CabinetBranchSlot[]
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
  if (matched) {
    return `${Number(matched[1])}.${Number(matched[2])}.${Number(matched[3])}`
  }
  const yearOnly = /^(\d{1,4})$/.exec(iso.trim())
  if (yearOnly) return `${Number(yearOnly[1])}년`
  return iso.trim()
}

function formatPeriodText(
  startDate: string | null,
  endDate: string | null,
): string {
  const start = startDate ? formatNodeDate(startDate) : ''
  const end = endDate ? formatNodeDate(endDate) : '현재'
  if (!start && !endDate) return ''
  return `${start || '?'} ~ ${end}`
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
  counterpartHead,
  counterpartHeads,
  onSelectCounterpartHead,
  onSelectCabinet,
  onRegisterCabinetHead,
  onRegisterCounterpartHead,
  onRegisterMinister,
  emptyHeadRoleLabel,
  regimeLabel,
  members,
  branchSlots,
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
  const extraSlots = branchSlots ?? []

  type CombinedBranchItem =
    | { kind: 'member'; key: string; member: CabinetMember }
    | { kind: 'slot'; key: string; node: ReactNode }

  const combinedBranches: CombinedBranchItem[] = [
    ...visible.map((member) => ({
      kind: 'member' as const,
      key: `m:${member.id}`,
      member,
    })),
    ...extraSlots.map((slot) => ({
      kind: 'slot' as const,
      key: `s:${slot.key}`,
      node: slot.node,
    })),
  ]
  const hasBranches = combinedBranches.length > 0
  const counterparts =
    counterpartHeads && counterpartHeads.length > 0
      ? counterpartHeads
      : counterpartHead
        ? [counterpartHead]
        : []
  const isMonarchCenter = Boolean(head?.isMonarchical)
  const showSovereignAbove = !isMonarchCenter && counterparts.length > 0
  const showReignCabinetsBelow = isMonarchCenter && counterparts.length > 0

  /*
   * 좌우로 반씩 가른다. 섞지 않고 앞쪽 절반을 왼쪽에 두어, 좁은 화면에서 한 줄로 접혔을 때
   * (왼쪽 → 오른쪽 순서로 이어 읽으므로) 원래 순서가 그대로 유지된다.
   */
  const pivot = Math.ceil(combinedBranches.length / 2)
  const leftItems = combinedBranches.slice(0, pivot)
  const rightItems = combinedBranches.slice(pivot)

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
            <SideGroup side="left" nodeKeys={leftItems.map((item) => item.key)}>
              {leftItems.map((item) =>
                item.kind === 'member' ? (
                  <BranchNode
                    key={item.key}
                    member={item.member}
                    side="left"
                    renderFace={renderFace}
                    onSelectPerson={onSelectPerson}
                  />
                ) : (
                  <Fragment key={item.key}>{item.node}</Fragment>
                ),
              )}
            </SideGroup>
          </MapSide>
        )}

        <MapCenter $branches={hasBranches}>
          <CenterStack $branches={hasBranches}>
            {showSovereignAbove && (
              <>
                <CounterpartDeck $branches={hasBranches}>
                  {counterparts.length > 0 ? (
                    counterparts.map((cp) => (
                      <SovereignPairCard
                        key={cp.id}
                        $monarch={Boolean(cp.isMonarchical)}
                        $branches={hasBranches}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          cp.personId && onSelectPerson(cp.personId)
                        }
                        onKeyDown={(event) => {
                          if (
                            (event.key === 'Enter' || event.key === ' ') &&
                            cp.personId
                          ) {
                            event.preventDefault()
                            onSelectPerson(cp.personId)
                          }
                        }}
                        title={`${cp.title} ${cp.name} 인물 상세`}
                      >
                        <SovereignPairFace $monarch={Boolean(cp.isMonarchical)}>
                          {renderFace(cp, 44)}
                        </SovereignPairFace>
                        <SovereignPairBody>
                          <SovereignPairTop>
                            <SovereignPairBadge
                              $monarch={Boolean(cp.isMonarchical)}
                            >
                              {cp.isMonarchical ? '👑 재위 군주' : '국가원수·수반'}
                            </SovereignPairBadge>
                            <SovereignPairRole>
                              {cp.ordinal != null && `제${cp.ordinal}대 `}
                              {cp.title}
                            </SovereignPairRole>
                            {cp.regnalEraLabel && (
                              <SovereignEraTag>
                                {cp.regnalEraLabel}
                              </SovereignEraTag>
                            )}
                            {cp.polityLabel && cp.polityLabel !== polityLabel && (
                              <SovereignPolityTag>
                                {cp.polityLabel}
                              </SovereignPolityTag>
                            )}
                          </SovereignPairTop>
                          <SovereignPairNameRow>
                            <SovereignPairName>{cp.name}</SovereignPairName>
                            {(cp.startDate || cp.endDate) && (
                              <SovereignPairPeriod>
                                {formatPeriodText(cp.startDate, cp.endDate)}
                              </SovereignPairPeriod>
                            )}
                          </SovereignPairNameRow>
                        </SovereignPairBody>
                        {onSelectCounterpartHead && (
                          <SovereignSwitchBtn
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              onSelectCounterpartHead(cp)
                            }}
                            title={`${cp.name} 재위기 전체 보기`}
                          >
                            {cp.isMonarchical ? '치세 보기' : '수반 보기'}
                          </SovereignSwitchBtn>
                        )}
                      </SovereignPairCard>
                    ))
                  ) : (
                    <SovereignEmptyButton
                      type="button"
                      onClick={() => onRegisterCounterpartHead?.()}
                    >
                      <SovereignPairBadge $monarch>
                        👑 재위 군주·원수
                      </SovereignPairBadge>
                      <SovereignEmptyLabel>
                        + 동시대 군주·국가원수 등록
                      </SovereignEmptyLabel>
                    </SovereignEmptyButton>
                  )}
                </CounterpartDeck>
                <DualExecutiveConnector $branches={hasBranches} aria-hidden />
              </>
            )}

            {head ? (
              <CenterCard
                type="button"
                $branches={hasBranches}
                $monarch={isMonarchCenter}
                onClick={() => head.personId && onSelectPerson(head.personId)}
                aria-label={`${head.name} 상세`}
              >
                <CenterFace $branches={hasBranches} $monarch={isMonarchCenter}>
                  {renderFace(head, 112)}
                </CenterFace>
                <CenterRole $branches={hasBranches} $monarch={isMonarchCenter}>
                  {isMonarchCenter && <MonarchCrown aria-hidden>👑</MonarchCrown>}
                  {head.ordinal != null && `제${head.ordinal}대 `}
                  {head.title}
                  {!head.endDate && <CenterNow>현직</CenterNow>}
                  {head.regnalEraLabel && (
                    <CenterEraTag>{head.regnalEraLabel}</CenterEraTag>
                  )}
                  {polityLabel && <CenterPolity>{polityLabel}</CenterPolity>}
                  {regimeLabel && <CenterRegime>{regimeLabel}</CenterRegime>}
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
              <CenterCard
                type="button"
                $branches={hasBranches}
                onClick={() => onRegisterCabinetHead?.()}
                aria-label="국가원수·정부수반 등록"
              >
                <CenterFace $branches={hasBranches} aria-hidden>
                  <CenterEmptyInnerFace>+</CenterEmptyInnerFace>
                </CenterFace>
                <CenterRole $branches={hasBranches}>
                  {emptyHeadRoleLabel ?? '국가원수 · 정부수반'}
                  {polityLabel && <CenterPolity>{polityLabel}</CenterPolity>}
                  {regimeLabel && <CenterRegime>{regimeLabel}</CenterRegime>}
                </CenterRole>
                <CenterName $branches={hasBranches}>+ 수반 등록</CenterName>
                <CenterCabinet $branches={hasBranches}>
                  {cabinetLabel ?? '황제 · 국왕 · 대통령 · 총리 · 재상'}
                </CenterCabinet>
                <CenterStats $branches={hasBranches}>
                  <CenterStat>
                    <CenterStatKey>취임</CenterStatKey>
                    <CenterStatValue>—</CenterStatValue>
                  </CenterStat>
                  <CenterStat>
                    <CenterStatKey>재임</CenterStatKey>
                    <CenterStatValue>—</CenterStatValue>
                  </CenterStat>
                  <CenterStat>
                    <CenterStatKey>각료</CenterStatKey>
                    <CenterStatValue>{members.length}명</CenterStatValue>
                  </CenterStat>
                </CenterStats>
              </CenterCard>
            )}

            {showReignCabinetsBelow && (
              <>
                <DualExecutiveConnector $branches={hasBranches} aria-hidden />
                <ReignCabinetsDeck $branches={hasBranches}>
                  <ReignCabinetsHeader>
                    <ReignCabinetsTitle>
                      🏛️ 재위 중 행정부 · 내각
                    </ReignCabinetsTitle>
                    <ReignCabinetsHeaderRight>
                      <ReignCabinetsCount>
                        {counterparts.length}대
                      </ReignCabinetsCount>
                      {counterparts.length > 0 && onRegisterCabinetHead && (
                        <ReignCabinetsAddBtn
                          type="button"
                          onClick={onRegisterCabinetHead}
                        >
                          + 내각 등록
                        </ReignCabinetsAddBtn>
                      )}
                    </ReignCabinetsHeaderRight>
                  </ReignCabinetsHeader>
                  {counterparts.length > 0 ? (
                    <ReignCabinetsList $branches={hasBranches}>
                      {counterparts.map((cp) => (
                        <ReignCabinetItem
                          key={cp.id}
                          type="button"
                          onClick={() => {
                            if (cp.cabinetId && onSelectCabinet) {
                              onSelectCabinet(cp.cabinetId)
                              return
                            }
                            if (cp.personId) {
                              onSelectPerson(cp.personId)
                            }
                          }}
                          title={
                            cp.cabinetId
                              ? `${cp.cabinetLabel ?? cp.name} 내각 보기로 전환`
                              : `${cp.name} 상세`
                          }
                        >
                          <ReignCabinetAvatar>
                            {renderFace(cp, 34)}
                          </ReignCabinetAvatar>
                          <ReignCabinetInfo>
                            <ReignCabinetLabel>
                              {cp.cabinetLabel ??
                                (cp.ordinal != null
                                  ? `제${cp.ordinal}대 ${cp.title}`
                                  : cp.title)}
                            </ReignCabinetLabel>
                            <ReignCabinetSub>
                              <strong>{cp.name}</strong>
                              {cp.cabinetLabel && cp.title ? ` · ${cp.title}` : ''}
                              {(cp.startDate || cp.endDate) &&
                                ` · ${formatPeriodText(cp.startDate, cp.endDate)}`}
                            </ReignCabinetSub>
                          </ReignCabinetInfo>
                          {cp.cabinetId && onSelectCabinet && (
                            <ReignCabinetGo>내각 보기 ›</ReignCabinetGo>
                          )}
                        </ReignCabinetItem>
                      ))}
                    </ReignCabinetsList>
                  ) : (
                    <ReignCabinetEmptyButton
                      type="button"
                      onClick={() => onRegisterCabinetHead?.()}
                    >
                      <ReignCabinetEmptyPlus aria-hidden>+</ReignCabinetEmptyPlus>
                      <ReignCabinetEmptyText>
                        <ReignCabinetEmptyTitle>
                          이 치세의 내각 · 수반 등록
                        </ReignCabinetEmptyTitle>
                        <ReignCabinetEmptySub>
                          총리·재상·수반을 등록하면 치세와 함께 표시됩니다
                        </ReignCabinetEmptySub>
                      </ReignCabinetEmptyText>
                    </ReignCabinetEmptyButton>
                  )}
                </ReignCabinetsDeck>
              </>
            )}

            {onRegisterMinister && (
              <RegisterMinisterBtn
                type="button"
                onClick={onRegisterMinister}
              >
                + 이 {isMonarchCenter ? '치세' : '정권'}의 각료 등록
              </RegisterMinisterBtn>
            )}
          </CenterStack>
        </MapCenter>

        {hasBranches && (
          <MapSide $side="right">
            <SideGroup side="right" nodeKeys={rightItems.map((item) => item.key)}>
              {rightItems.map((item) =>
                item.kind === 'member' ? (
                  <BranchNode
                    key={item.key}
                    member={item.member}
                    side="right"
                    renderFace={renderFace}
                    onSelectPerson={onSelectPerson}
                  />
                ) : (
                  <Fragment key={item.key}>{item.node}</Fragment>
                ),
              )}
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
  nodeKeys: string[]
  children: ReactNode
}

/**
 * 한쪽 가지 묶음 + 그 묶음에서 가운데로 뻗는 곡선.
 *
 * 곡선 SVG를 칼럼이 아니라 **묶음**에 붙이는 게 핵심이다. 칼럼은 행 높이만큼 늘어나
 * 그 안에서 묶음이 어디에 놓이는지 알 수 없지만, 묶음 자신을 기준으로 하면 첫 노드부터
 * 마지막 노드까지가 곧 좌표계다.
 */
function SideGroup({ side, nodeKeys, children }: SideGroupProps) {
  const height = groupHeightOf(nodeKeys.length)
  const originY = height / 2

  return (
    <GroupBox $side={side}>
      {nodeKeys.length > 0 && (
        <BranchSvg
          $side={side}
          width={GUTTER}
          height={height}
          viewBox={`0 0 ${GUTTER} ${height}`}
          aria-hidden
          focusable="false"
        >
          {nodeKeys.map((key, index) => {
            const y = nodeCenterY(index)
            /* 제어점을 거터 한가운데 두면 양끝에서 수평으로 빠져나가 부드럽게 만난다 */
            const path =
              side === 'left'
                ? `M ${GUTTER} ${originY} C ${GUTTER / 2} ${originY}, ${GUTTER / 2} ${y}, 0 ${y}`
                : `M 0 ${originY} C ${GUTTER / 2} ${originY}, ${GUTTER / 2} ${y}, ${GUTTER} ${y}`
            return <path key={key} d={path} />
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

const CENTER_ACCENT = '#6366f1'

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
    border-color: rgba(99, 102, 241, 0.45);
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
  justify-content: center;
  min-width: 0;

  /* 격자에선 DOM 순서(왼쪽 가지 → 가운데 → 오른쪽 가지)대로면 수반이 각료 사이에 낀다 */
  @container (max-width: 820px) {
    grid-column: 1 / -1;
    order: -1;
    justify-content: stretch;
    margin-bottom: 6px;
  }
`

const CenterStack = styled.div<{ $branches?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: auto;
  min-width: 0;

  @container (max-width: 820px) {
    align-items: stretch;
    width: 100%;
  }
`

const CounterpartDeck = styled.div<{ $branches?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 288px;

  @container (max-width: 820px) {
    width: 100%;
  }
`

const SovereignPairCard = styled.div<{
  $monarch?: boolean
  $branches?: boolean
}>`
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 10px 13px;
  border-radius: 16px;
  border: 1px solid
    ${({ $monarch, theme }) =>
      $monarch
        ? theme.mode === 'dark'
          ? 'rgba(251, 191, 36, 0.35)'
          : 'rgba(217, 119, 6, 0.32)'
        : theme.colors.border.medium};
  background: ${({ $monarch, theme }) =>
    $monarch
      ? theme.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.10), rgba(255, 255, 255, 0.03))'
        : 'linear-gradient(135deg, #fffbeb, #ffffff)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.035)'
        : theme.colors.background.primary};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 4px 14px rgba(0, 0, 0, 0.24)'
      : '0 2px 10px rgba(15, 23, 42, 0.05)'};
  cursor: pointer;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ $monarch }) =>
      $monarch ? 'rgba(217, 119, 6, 0.6)' : 'rgba(99, 102, 241, 0.45)'};
  }
`

const SovereignPairFace = styled.span<{ $monarch?: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  padding: 2px;
  border-radius: 999px;
  border: 1.5px solid
    ${({ $monarch }) =>
      $monarch ? 'rgba(217, 119, 6, 0.65)' : 'rgba(99, 102, 241, 0.5)'};

  img,
  span {
    border-radius: 999px;
  }
`

const SovereignPairBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`

const SovereignPairTop = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
`

const SovereignPairBadge = styled.span<{ $monarch?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: ${({ $monarch, theme }) =>
    $monarch
      ? theme.mode === 'dark'
        ? '#fde68a'
        : '#92400e'
      : theme.mode === 'dark'
        ? '#c7d2fe'
        : '#3730a3'};
  background: ${({ $monarch, theme }) =>
    $monarch
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.22)'
        : '#fef3c7'
      : theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : '#e0e7ff'};
`

const SovereignPairRole = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SovereignEraTag = styled.span`
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.3)'
        : 'rgba(217, 119, 6, 0.22)'};
`

const SovereignPolityTag = styled.span`
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.05)'};
`

const SovereignPairNameRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
`

const SovereignPairName = styled.span`
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SovereignPairPeriod = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SovereignSwitchBtn = styled.button`
  flex-shrink: 0;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(251, 191, 36, 0.35)'
        : 'rgba(217, 119, 6, 0.32)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.14)' : '#fffbeb'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fde68a' : '#b45309')};
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.25)' : '#fef3c7'};
    border-color: rgba(217, 119, 6, 0.55);
  }
`

const DualExecutiveConnector = styled.div<{ $branches?: boolean }>`
  width: 2px;
  height: 14px;
  margin: 0 auto;
  background: linear-gradient(
    180deg,
    rgba(217, 119, 6, 0.55),
    rgba(99, 102, 241, 0.55)
  );
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

const centerSurface = css<{ $branches?: boolean; $monarch?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 288px;
  padding: 20px 20px 16px;
  border-radius: 20px;
  text-align: center;
  /*
   * 면은 무채색으로 두고 장미색/황금색은 직함·현직 표시·얼굴 테두리에만 남긴다.
   */
  border: 1px solid
    ${({ $monarch, theme }) =>
      $monarch
        ? theme.mode === 'dark'
          ? 'rgba(251, 191, 36, 0.38)'
          : 'rgba(217, 119, 6, 0.35)'
        : theme.colors.border.medium};
  background: ${({ $monarch, theme }) =>
    $monarch
      ? theme.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(251, 191, 36, 0.08), rgba(255,255,255,0.035))'
        : 'linear-gradient(180deg, #fffdf5, #ffffff)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.035)'
        : theme.colors.background.primary};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 24px rgba(0,0,0,0.3)'
      : '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)'};

  /* 좁은 칼럼 — 가로로 눕힌다: 얼굴 | 직함·이름·정권 | 요약 */
  @container (max-width: 820px) {
    ${horizontalCenterLayout}
  }
`

const CenterCard = styled.button<{ $branches?: boolean; $monarch?: boolean }>`
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
    border-color: ${({ $monarch }) =>
      $monarch ? 'rgba(217, 119, 6, 0.6)' : 'rgba(99, 102, 241, 0.45)'};
  }
  &:focus-visible {
    outline: 2px solid ${CENTER_ACCENT};
    outline-offset: 3px;
  }
`

const CenterEmptyInnerFace = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  font-size: 36px;
  font-weight: 700;
  background: ${({ theme }) => theme.colors.hover};
  color: ${({ theme }) => theme.colors.text.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

/** 얼굴 둘레 링 — 가운데가 중심이라는 걸 색이 아니라 형태로 말한다 */
const CenterFace = styled.span<{ $branches?: boolean; $monarch?: boolean }>`
  display: inline-flex;
  padding: 4px;
  margin-bottom: 12px;
  border-radius: 999px;
  border: 2px solid
    ${({ $monarch }) =>
      $monarch ? 'rgba(217, 119, 6, 0.65)' : 'rgba(99, 102, 241, 0.55)'};

  img,
  span {
    border-radius: 999px;
  }

  @container (max-width: 820px) {
    grid-column: 1;
    grid-row: 1 / span 4;
    margin-bottom: 0;
  }
`

const CenterRole = styled.span<{ $branches?: boolean; $monarch?: boolean }>`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${({ $monarch, theme }) =>
    $monarch
      ? theme.mode === 'dark'
        ? '#fbbf24'
        : '#b45309'
      : CENTER_ACCENT};
  @container (max-width: 820px) {
    grid-column: 2;
    justify-content: flex-start;
  }
`

const MonarchCrown = styled.span`
  font-size: 13px;
  line-height: 1;
`

const CenterEraTag = styled.span`
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fde68a' : '#92400e')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7'};
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

const CenterRegime = styled.span`
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.18)' : '#eef2ff'};
`

const ReignCabinetsDeck = styled.div<{ $branches?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 288px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.025)'
      : 'rgba(248, 250, 252, 0.9)'};

  @container (max-width: 820px) {
    width: 100%;
  }
`

const ReignCabinetsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const ReignCabinetsTitle = styled.span`
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ReignCabinetsCount = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${CENTER_ACCENT};
  background: rgba(99, 102, 241, 0.12);
`

const ReignCabinetsList = styled.div<{ $branches?: boolean }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
`

const ReignCabinetItem = styled.button`
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 11px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.45);
    background: ${({ theme }) => theme.colors.hover};
  }
`

const ReignCabinetAvatar = styled.span`
  display: inline-flex;
  flex-shrink: 0;

  img,
  span {
    border-radius: 999px;
  }
`

const ReignCabinetInfo = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
`

const ReignCabinetLabel = styled.span`
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ReignCabinetSub = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const ReignCabinetGo = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: ${CENTER_ACCENT};
`

const ReignCabinetsHeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const ReignCabinetsAddBtn = styled.button`
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px dashed rgba(99, 102, 241, 0.45);
  background: transparent;
  font-size: 10.5px;
  font-weight: 700;
  font-family: inherit;
  color: ${CENTER_ACCENT};
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: ${CENTER_ACCENT};
  }
`

const ReignCabinetEmptyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 11px;
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) => theme.colors.background.primary};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.5);
    background: ${({ theme }) => theme.colors.hover};
  }
`

const ReignCabinetEmptyPlus = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px dashed rgba(99, 102, 241, 0.45);
  font-size: 15px;
  font-weight: 700;
  color: ${CENTER_ACCENT};
  background: rgba(99, 102, 241, 0.08);
`

const ReignCabinetEmptyText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
`

const ReignCabinetEmptyTitle = styled.span`
  font-size: 12px;
  font-weight: 800;
  color: ${CENTER_ACCENT};
`

const ReignCabinetEmptySub = styled.span`
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SovereignEmptyButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 14px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(251, 191, 36, 0.35)'
        : 'rgba(217, 119, 6, 0.35)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(251, 191, 36, 0.05)'
      : 'rgba(255, 251, 235, 0.7)'};
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: rgba(217, 119, 6, 0.6);
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(251, 191, 36, 0.12)'
        : 'rgba(254, 243, 199, 0.85)'};
  }
`

const SovereignEmptyLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fde68a' : '#b45309')};
`

const RegisterMinisterBtn = styled.button`
  margin-top: 10px;
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px dashed rgba(99, 102, 241, 0.45);
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.08)'
      : 'rgba(99, 102, 241, 0.05)'};
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: ${CENTER_ACCENT};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.16)'
        : 'rgba(99, 102, 241, 0.11)'};
  }
`

const CenterName = styled.span<{ $branches?: boolean }>`
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.text.primary};
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
  @container (max-width: 820px) {
    grid-column: 2;
  }
`

const CenterCabinet = styled.span<{ $branches?: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
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
