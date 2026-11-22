import React, { useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import {
  FiArrowUpRight,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiPlus,
  FiShield,
  FiUser,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineHover,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  MOTION,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { primaryHouseLabel } from '@/entities/political-system/model/political-system'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { getUploadImageUrl } from '@/shared/api/upload'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { pathKeys } from '@/shared/router'
import {
  InstitutionAppointmentModal,
  type InstitutionAppointmentContextType,
} from '@/shared/ui/institution-appointment-modal'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'

import type {
  CurrentCabinetSummary,
  ElectionSummary,
} from '../../model/use-country-dashboard-stats'
import {
  formatMindMapElapsed,
  formatShortMindMapDate,
  type MindMapMember,
  type MindMapMilitaryCommandItem,
  type MindMapVacantSlot,
  useDashboardMindMap,
} from '../../model/use-dashboard-mindmap'
import {
  BentoActionBtn,
  BentoCard,
  BentoCardBadge,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoHeaderActions,
  type SegmentSlice,
  StackedSegmentBar,
} from './bento-primitives'

const NODE_HEIGHT = 44
const NODE_GAP = 8
const GUTTER = 44
const DEFAULT_COLLAPSED_BRANCHES = 14

const PARTY_FALLBACK_PALETTE = [
  '#4f46e5',
  '#0284c7',
  '#0d9488',
  '#d97706',
  '#db2777',
  '#64748b',
]

const nodeCenterY = (index: number) =>
  index * (NODE_HEIGHT + NODE_GAP) + NODE_HEIGHT / 2

const groupHeightOf = (count: number) =>
  count > 0 ? count * NODE_HEIGHT + (count - 1) * NODE_GAP : 0

export type MindMapBranchItem =
  | { kind: 'member'; key: string; member: MindMapMember }
  | { kind: 'vacant'; key: string; slot: MindMapVacantSlot }
  | { kind: 'military'; key: string; command: MindMapMilitaryCommandItem }

function AvatarThumb({
  imageUrl,
  name,
  size,
  monarch = false,
}: {
  imageUrl?: string | null
  name: string
  size: number
  monarch?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const resolved = !failed && imageUrl ? getUploadImageUrl(imageUrl) : null

  return (
    <AvatarCircle $size={size} $monarch={monarch}>
      {resolved ? (
        <img src={resolved} alt={name} onError={() => setFailed(true)} />
      ) : (
        <FiUser size={Math.round(size * 0.44)} aria-hidden />
      )}
    </AvatarCircle>
  )
}

function BezierBranchGroup({
  side,
  items,
  muted,
  onSelectPerson,
  onSelectVacant,
  onSelectMilitaryCommand,
}: {
  side: 'left' | 'right'
  items: MindMapBranchItem[]
  muted: boolean
  onSelectPerson: (personId: string) => void
  onSelectVacant: (slot: MindMapVacantSlot) => void
  onSelectMilitaryCommand?: (cmd: MindMapMilitaryCommandItem) => void
}) {
  const height = groupHeightOf(items.length)
  const originY = height / 2

  return (
    <WingGroupBox $side={side}>
      {items.length > 0 && (
        <ConnectorSvg
          $side={side}
          $muted={muted}
          width={GUTTER}
          height={height}
          viewBox={`0 0 ${GUTTER} ${height}`}
          aria-hidden
        >
          {items.map((item, idx) => {
            const y = nodeCenterY(idx)
            const d =
              side === 'left'
                ? `M ${GUTTER} ${originY} C ${GUTTER * 0.5} ${originY}, ${GUTTER * 0.5} ${y}, 0 ${y}`
                : `M 0 ${originY} C ${GUTTER * 0.5} ${originY}, ${GUTTER * 0.5} ${y}, ${GUTTER} ${y}`
            const isDashed =
              item.kind === 'vacant' ||
              (item.kind === 'military' && !item.command.commanderName)
            return (
              <path
                key={item.key}
                d={d}
                strokeDasharray={isDashed ? '3 3' : undefined}
              />
            )
          })}
        </ConnectorSvg>
      )}

      {items.map((item) => {
        if (item.kind === 'member') {
          const m = item.member
          const deptTag =
            m.departmentName &&
            !m.title.includes(m.departmentName.replace(/\s+/g, ''))
              ? `${m.departmentName} · ${m.title}`
              : m.title
          const startYearLabel = m.startDate
            ? formatShortMindMapDate(m.startDate).split('.')[0]
            : null

          return (
            <MinisterNodeBtn
              key={item.key}
              type="button"
              $side={side}
              onClick={() => {
                if (m.personId) onSelectPerson(m.personId)
              }}
              title={
                m.replaced && m.predecessor
                  ? `${deptTag} — ${m.name} (${m.predecessor} 후임)`
                  : `${deptTag} — ${m.name}`
              }
            >
              <AvatarThumb imageUrl={m.imageUrl} name={m.name} size={30} />
              <NodeMainText>
                <NodeRoleLine>
                  <span>{deptTag}</span>
                  {m.replaced ? <ReshuffleBadge>교체</ReshuffleBadge> : null}
                </NodeRoleLine>
                <NodePersonLine>
                  {m.partyColor ? (
                    <PartyDot $color={m.partyColor} title={m.partyName ?? ''} />
                  ) : null}
                  <strong>{m.name}</strong>
                </NodePersonLine>
              </NodeMainText>
              {startYearLabel ? (
                <NodeStartBadge>{startYearLabel}</NodeStartBadge>
              ) : null}
            </MinisterNodeBtn>
          )
        }

        if (item.kind === 'military') {
          const cmd = item.command
          if (cmd.commanderName) {
            return (
              <MinisterNodeBtn
                key={item.key}
                type="button"
                $side={side}
                onClick={() => {
                  if (cmd.commanderPersonId) {
                    onSelectPerson(cmd.commanderPersonId)
                  } else {
                    onSelectMilitaryCommand?.(cmd)
                  }
                }}
                title={`${cmd.unitName} — ${cmd.commanderName}`}
              >
                <AvatarThumb
                  imageUrl={cmd.commanderImageUrl}
                  name={cmd.commanderName}
                  size={30}
                />
                <NodeMainText>
                  <NodeRoleLine>
                    <span>
                      {cmd.unitName}
                      {cmd.commanderRankOrTitle
                        ? ` · ${cmd.commanderRankOrTitle}`
                        : ''}
                    </span>
                  </NodeRoleLine>
                  <NodePersonLine>
                    <strong>{cmd.commanderName}</strong>
                  </NodePersonLine>
                </NodeMainText>
                <UnitJumpTag
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectMilitaryCommand?.(cmd)
                  }}
                  title="부대 상세 보기"
                >
                  편제 ↗
                </UnitJumpTag>
              </MinisterNodeBtn>
            )
          }

          return (
            <VacantNodeBtn
              key={item.key}
              type="button"
              $side={side}
              onClick={() => onSelectMilitaryCommand?.(cmd)}
              title={`${cmd.unitName} 지휘관 임명 또는 부대 상세`}
            >
              <VacantDot aria-hidden>
                <FiShield size={12} />
              </VacantDot>
              <NodeMainText>
                <NodeRoleLine>
                  <span>{cmd.unitName}</span>
                </NodeRoleLine>
                <VacantSubLine>+ 지휘관 임명</VacantSubLine>
              </NodeMainText>
            </VacantNodeBtn>
          )
        }

        const s = item.slot
        return (
          <VacantNodeBtn
            key={item.key}
            type="button"
            $side={side}
            onClick={() => onSelectVacant(s)}
            title={`${s.departmentName} (${s.positionTitle}) 즉시 임명`}
          >
            <VacantDot aria-hidden>+</VacantDot>
            <NodeMainText>
              <NodeRoleLine>
                <span>{s.departmentName}</span>
              </NodeRoleLine>
              <VacantSubLine>{s.positionTitle} · 임명</VacantSubLine>
            </NodeMainText>
          </VacantNodeBtn>
        )
      })}
    </WingGroupBox>
  )
}

/**
 * 재사용 가능한 순수 베지어 마인드맵 스테이지 (국가 대시보드 & 내각 단독 상세 공용)
 */
export function MindMapDiagramStage({
  head,
  emptyHeadLabel = '국가원수 · 정부수반',
  polityLabel,
  headPeriodSummary,
  headVoteShare,
  ministersCount,
  departmentsCount,
  isHistorical = false,
  sovereignsAbove = [],
  cabinetsDuringReign = [],
  branches,
  collapsedLimit = DEFAULT_COLLAPSED_BRANCHES,
  onSelectPerson,
  onClickEmptyHead,
  onSelectVacant,
  onSelectMilitaryCommand,
  onSelectReignCabinet,
}: {
  head: MindMapMember | null
  emptyHeadLabel?: string
  polityLabel?: string | null
  headPeriodSummary?: string | null
  headVoteShare?: number | null
  ministersCount: number
  departmentsCount: number
  isHistorical?: boolean
  sovereignsAbove?: MindMapMember[]
  cabinetsDuringReign?: MindMapMember[]
  branches: MindMapBranchItem[]
  collapsedLimit?: number
  onSelectPerson: (personId: string) => void
  onClickEmptyHead: () => void
  onSelectVacant: (slot: MindMapVacantSlot) => void
  onSelectMilitaryCommand?: (cmd: MindMapMilitaryCommandItem) => void
  onSelectReignCabinet?: (cabinetId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? branches : branches.slice(0, collapsedLimit)
  const hiddenCount = Math.max(0, branches.length - visible.length)

  const pivot = Math.ceil(visible.length / 2)
  const leftItems = visible.slice(0, pivot)
  const rightItems = visible.slice(pivot)
  const isMonarchCenter = Boolean(head?.isMonarchical)

  return (
    <MindMapStage>
      <MindMapGrid $hasBranches={visible.length > 0}>
        {visible.length > 0 && (
          <MindMapSideCol $side="left">
            <BezierBranchGroup
              side="left"
              items={leftItems}
              muted={!head}
              onSelectPerson={onSelectPerson}
              onSelectVacant={onSelectVacant}
              onSelectMilitaryCommand={onSelectMilitaryCommand}
            />
          </MindMapSideCol>
        )}

        <CenterHubStack>
          {sovereignsAbove.length > 0 && (
            <>
              <CrownCounterpartList>
                {sovereignsAbove.map((cp) => (
                  <CrownCounterpartCard
                    key={cp.id}
                    type="button"
                    $monarch={Boolean(cp.isMonarchical)}
                    onClick={() => {
                      if (cp.personId) onSelectPerson(cp.personId)
                    }}
                    title={`${cp.title} ${cp.name} 인물 정보`}
                  >
                    <AvatarThumb
                      imageUrl={cp.imageUrl}
                      name={cp.name}
                      size={36}
                      monarch={Boolean(cp.isMonarchical)}
                    />
                    <CrownCardText>
                      <CrownRoleBadge $monarch={Boolean(cp.isMonarchical)}>
                        {cp.ordinal != null ? `제${cp.ordinal}대 ` : ''}
                        {cp.title}
                        {cp.regnalEraLabel ? ` · ${cp.regnalEraLabel}` : ''}
                      </CrownRoleBadge>
                      <CrownPersonName>{cp.name}</CrownPersonName>
                    </CrownCardText>
                  </CrownCounterpartCard>
                ))}
              </CrownCounterpartList>
              <VerticalSpine aria-hidden />
            </>
          )}

          {head ? (
            <LeaderCenterCard
              type="button"
              $monarch={isMonarchCenter}
              onClick={() => {
                if (head.personId) onSelectPerson(head.personId)
                else onClickEmptyHead()
              }}
            >
              <AvatarThumb
                imageUrl={head.imageUrl}
                name={head.name}
                size={84}
                monarch={isMonarchCenter}
              />

              <LeaderRoleRow>
                <LeaderRoleChip $monarch={isMonarchCenter}>
                  {head.ordinal != null ? `제${head.ordinal}대 ` : ''}
                  {head.title}
                </LeaderRoleChip>
                {!head.endDate && !isHistorical && (
                  <IncumbentBadge>현직</IncumbentBadge>
                )}
                {head.regnalEraLabel && (
                  <RegnalEraChip>{head.regnalEraLabel}</RegnalEraChip>
                )}
              </LeaderRoleRow>

              <LeaderName>{head.name}</LeaderName>

              {polityLabel && <LeaderPolitySub>{polityLabel}</LeaderPolitySub>}

              {headPeriodSummary && (
                <LeaderPeriodText>{headPeriodSummary}</LeaderPeriodText>
              )}

              <LeaderKpiMiniRow>
                <LeaderKpiCell>
                  <span>임명 수장</span>
                  <strong>{ministersCount}명</strong>
                </LeaderKpiCell>
                <LeaderKpiCell>
                  <span>편제 기관</span>
                  <strong>{departmentsCount}개</strong>
                </LeaderKpiCell>
                {headVoteShare != null && (
                  <LeaderKpiCell>
                    <span>득표율</span>
                    <strong>{headVoteShare.toFixed(1)}%</strong>
                  </LeaderKpiCell>
                )}
              </LeaderKpiMiniRow>
            </LeaderCenterCard>
          ) : (
            <LeaderEmptyCard type="button" onClick={onClickEmptyHead}>
              <AvatarThumb imageUrl={null} name={emptyHeadLabel} size={68} />
              <LeaderRoleChip $monarch={isHistorical}>
                {emptyHeadLabel}
              </LeaderRoleChip>
              <LeaderEmptyPrompt>
                <FiPlus size={13} /> 수반 · 통치자 등록하기
              </LeaderEmptyPrompt>
            </LeaderEmptyCard>
          )}

          {cabinetsDuringReign.length > 0 && (
            <>
              <VerticalSpine aria-hidden />
              <ReignCabinetsWrap>
                <ReignCabinetsLabel>
                  재위기 출범 내각 ({cabinetsDuringReign.length}대)
                </ReignCabinetsLabel>
                <ReignCabinetsPills>
                  {cabinetsDuringReign.slice(0, 4).map((cab) => (
                    <ReignCabinetPill
                      key={cab.id}
                      type="button"
                      onClick={() => {
                        if (cab.cabinetId && onSelectReignCabinet) {
                          onSelectReignCabinet(cab.cabinetId)
                        } else if (cab.personId) {
                          onSelectPerson(cab.personId)
                        }
                      }}
                    >
                      <span>{cab.cabinetLabel ?? cab.name}</span>
                      <small>{cab.name}</small>
                    </ReignCabinetPill>
                  ))}
                </ReignCabinetsPills>
              </ReignCabinetsWrap>
            </>
          )}
        </CenterHubStack>

        {visible.length > 0 && (
          <MindMapSideCol $side="right">
            <BezierBranchGroup
              side="right"
              items={rightItems}
              muted={!head}
              onSelectPerson={onSelectPerson}
              onSelectVacant={onSelectVacant}
              onSelectMilitaryCommand={onSelectMilitaryCommand}
            />
          </MindMapSideCol>
        )}
      </MindMapGrid>

      {(hiddenCount > 0 || expanded) && branches.length > collapsedLimit && (
        <ExpandBranchesRow>
          <ExpandBranchesBtn
            type="button"
            onClick={() => setExpanded((p) => !p)}
          >
            {expanded
              ? '마인드맵 접기'
              : `+ 외 ${hiddenCount}개 부처·사령부 모두 펼치기 (총 ${branches.length}개)`}
          </ExpandBranchesBtn>
        </ExpandBranchesRow>
      )}
    </MindMapStage>
  )
}

export interface ExecutiveMindMapBentoHeroProps {
  countryId?: string
  historicalCountryId?: string
  countryName: string
  countryIsoCode?: string | null
  description?: string | null
  focusedTenureId?: string | null
  onActiveTenureChange?: (tenureId: string | null) => void
  currentCabinetSummary?: CurrentCabinetSummary | null
  nextElection?: ElectionSummary | null
  recentElection?: ElectionSummary | null
  onEditOverview?: () => void
  onOpenPoliticalSystem: () => void
  onOpenCabinets: (cabinetId?: string | null) => void
  onOpenMinistries: (departmentId?: string | null) => void
  onOpenElections?: (electionId?: string) => void
  onSelectPerson: (personId: string) => void
  footerSlot?: React.ReactNode
}

export function ExecutiveMindMapBentoHero({
  countryId,
  historicalCountryId,
  countryName,
  countryIsoCode,
  description,
  focusedTenureId,
  onActiveTenureChange,
  currentCabinetSummary,
  nextElection,
  recentElection,
  onEditOverview,
  onOpenPoliticalSystem,
  onOpenCabinets,
  onOpenMinistries,
  onOpenElections,
  onSelectPerson,
  footerSlot,
}: ExecutiveMindMapBentoHeroProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [proseExpanded, setProseExpanded] = useState(false)
  const [branchDomain, setBranchDomain] = useState<'cabinet' | 'military'>(
    'cabinet',
  )

  // 인플레이스 임명 모달 상태 (대시보드 이탈 없이 빈 부처·사령부 즉시 임명)
  const [appointmentTarget, setAppointmentTarget] = useState<{
    contextType: InstitutionAppointmentContextType
    departmentId?: string | null
    departmentName?: string | null
    militaryUnitId?: string | null
    militaryUnitName?: string | null
    militaryUnitType?: string | null
  } | null>(null)

  const mindmap = useDashboardMindMap({
    countryId,
    historicalCountryId,
    countryName,
    countryIsoCode,
    focusedTenureId,
  })

  React.useEffect(() => {
    onActiveTenureChange?.(mindmap.activeHeadTenureId)
  }, [mindmap.activeHeadTenureId, onActiveTenureChange])

  // 국가가 바뀌면 기본 탭 복귀
  React.useEffect(() => {
    setBranchDomain('cabinet')
  }, [countryId, historicalCountryId])

  const activeBranches = useMemo<MindMapBranchItem[]>(() => {
    if (branchDomain === 'military' && mindmap.militaryBranches.length > 0) {
      return mindmap.militaryBranches.map((cmd) => ({
        kind: 'military',
        key: `mil:${cmd.unitId}`,
        command: cmd,
      }))
    }
    const filled: MindMapBranchItem[] = mindmap.members.map((member) => ({
      kind: 'member',
      key: `m:${member.id}`,
      member,
    }))
    const vacant: MindMapBranchItem[] = mindmap.vacantSlots.map((slot) => ({
      kind: 'vacant',
      key: `v:${slot.key}`,
      slot,
    }))
    return [...filled, ...vacant]
  }, [
    branchDomain,
    mindmap.militaryBranches,
    mindmap.members,
    mindmap.vacantSlots,
  ])

  const isMonarchCenter = Boolean(mindmap.head?.isMonarchical)
  const sovereignsAbove = !isMonarchCenter ? mindmap.counterpartHeads : []
  const cabinetsDuringReign = isMonarchCenter ? mindmap.counterpartHeads : []

  const cabinetPartySlices = useMemo<SegmentSlice[]>(() => {
    if (currentCabinetSummary?.partyDistribution?.length) {
      return currentCabinetSummary.partyDistribution.map((item, idx) => ({
        key: item.partyId ?? `p-${idx}`,
        label: item.partyName,
        value: item.count,
        color:
          item.color ||
          PARTY_FALLBACK_PALETTE[idx % PARTY_FALLBACK_PALETTE.length],
        meta: `${item.count}명`,
      }))
    }
    const partyMap = new Map<
      string,
      { label: string; count: number; color: string }
    >()
    for (const m of mindmap.members) {
      if (!m.partyName) continue
      const prev = partyMap.get(m.partyName)
      if (prev) prev.count += 1
      else {
        partyMap.set(m.partyName, {
          label: m.partyName,
          count: 1,
          color:
            m.partyColor ||
            PARTY_FALLBACK_PALETTE[partyMap.size % PARTY_FALLBACK_PALETTE.length],
        })
      }
    }
    return Array.from(partyMap.values()).map((p) => ({
      key: p.label,
      label: p.label,
      value: p.count,
      color: p.color,
      meta: `${p.count}명`,
    }))
  }, [currentCabinetSummary, mindmap.members])

  const seatSlices = useMemo<SegmentSlice[]>(() => {
    const ps = mindmap.activePoliticalSystem
    if (!ps) return []
    const out: SegmentSlice[] = []
    if (ps.lowerHouseSeats && ps.lowerHouseSeats > 0) {
      out.push({
        key: 'lower',
        label:
          ps.lowerHouseName?.trim() ||
          primaryHouseLabel(ps.legislatureType ?? null),
        value: ps.lowerHouseSeats,
        color: '#4f46e5',
        meta: `${ps.lowerHouseSeats.toLocaleString('ko-KR')}석`,
      })
    }
    if (
      ps.legislatureType === 'BICAMERAL' &&
      ps.upperHouseSeats &&
      ps.upperHouseSeats > 0
    ) {
      out.push({
        key: 'upper',
        label: ps.upperHouseName?.trim() || '상원',
        value: ps.upperHouseSeats,
        color: '#0ea5e9',
        meta: `${ps.upperHouseSeats.toLocaleString('ko-KR')}석`,
      })
    }
    return out
  }, [mindmap.activePoliticalSystem])

  const activeElection = mindmap.linkedElection ?? nextElection ?? recentElection
  const cleanDescription = description?.trim() ?? ''
  const plainOverviewPreview = useMemo(() => {
    if (!cleanDescription) return ''
    return cleanDescription
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }, [cleanDescription])

  const headPeriodSummary = useMemo(() => {
    const h = mindmap.head
    if (!h) return null
    const start = formatShortMindMapDate(h.startDate)
    const end = h.endDate ? formatShortMindMapDate(h.endDate) : '현재'
    const elapsed = !h.endDate ? formatMindMapElapsed(h.startDate) : null
    if (!start && !h.endDate) return null
    return `${start || '?'} ~ ${end}${elapsed ? ` (${elapsed})` : ''}`
  }, [mindmap.head])

  const showPowerRibbon =
    cabinetPartySlices.length > 0 ||
    seatSlices.length > 0 ||
    Boolean(activeElection)

  const handleOpenVacantAppointment = (slot: MindMapVacantSlot) => {
    if (slot.departmentId) {
      setAppointmentTarget({
        contextType: mindmap.activeCabinetId ? 'CABINET' : 'DEPARTMENT',
        departmentId: slot.departmentId,
        departmentName: slot.departmentName,
      })
      return
    }
    if (mindmap.activeCabinetId) {
      setAppointmentTarget({
        contextType: 'CABINET',
        departmentName: slot.departmentName,
      })
      return
    }
    onOpenMinistries(null)
  }

  const handleMilitaryBranchClick = (cmd: MindMapMilitaryCommandItem) => {
    if (!cmd.commanderName) {
      setAppointmentTarget({
        contextType: 'MILITARY_UNIT',
        militaryUnitId: cmd.unitId,
        militaryUnitName: cmd.unitName,
        militaryUnitType: cmd.unitType,
      })
      return
    }
    navigate(pathKeys.militaryUnitDetail(cmd.unitId))
  }

  return (
    <BentoCard aria-label={`${countryName} 국가 수장 및 각 부처 마인드맵`}>
      {/* 1. 상단 바: 정체 배지 + [내각 부처 | 군 통수부] 전환 + 정권 스테퍼 + 관리 바로가기 */}
      <BentoCardHeader>
        <HeroTitleCluster>
          <BentoCardTitleGroup>
            <BentoCardTitle>
              {branchDomain === 'military'
                ? '군 지휘부'
                : historicalCountryId
                  ? '조정 구조'
                  : '통치 구조'}
            </BentoCardTitle>
            {mindmap.activeCabinetLabel ? (
              <BentoCardBadge>{mindmap.activeCabinetLabel}</BentoCardBadge>
            ) : null}
          </BentoCardTitleGroup>

          {mindmap.polityBadges.length > 0 && (
            <RegimePillRow>
              {mindmap.polityBadges.map((label) => (
                <RegimePill
                  key={label}
                  type="button"
                  onClick={onOpenPoliticalSystem}
                >
                  {label}
                </RegimePill>
              ))}
            </RegimePillRow>
          )}
        </HeroTitleCluster>

        <BentoHeaderActions>
          {mindmap.militaryBranches.length > 0 && (
            <ModeSwitchGroup role="tablist" aria-label="마인드맵 권력축 전환">
              <ModeSwitchBtn
                type="button"
                $active={branchDomain === 'cabinet'}
                onClick={() => setBranchDomain('cabinet')}
              >
                내각 부처 ({mindmap.members.length + mindmap.vacantSlots.length})
              </ModeSwitchBtn>
              <ModeSwitchBtn
                type="button"
                $active={branchDomain === 'military'}
                onClick={() => setBranchDomain('military')}
              >
                군 수뇌부 ({mindmap.militaryBranches.length})
              </ModeSwitchBtn>
            </ModeSwitchGroup>
          )}

          {mindmap.canToggleMode && (
            <ModeSwitchGroup role="tablist" aria-label="수반 보기 기준">
              <ModeSwitchBtn
                type="button"
                $active={mindmap.effectiveFallbackMode}
                onClick={() => mindmap.setHeadViewMode('fallback')}
              >
                군주·원수 ({mindmap.rulersCount})
              </ModeSwitchBtn>
              <ModeSwitchBtn
                type="button"
                $active={!mindmap.effectiveFallbackMode}
                onClick={() => mindmap.setHeadViewMode('cabinet')}
              >
                내각 ({mindmap.cabinetsCount})
              </ModeSwitchBtn>
            </ModeSwitchGroup>
          )}

          {mindmap.navigation && (
            <RegimeStepper aria-label="역대 정권·치세 전환">
              <StepperArrowBtn
                type="button"
                disabled={!mindmap.navigation.onOlder}
                onClick={() => mindmap.navigation?.onOlder?.()}
                title={
                  mindmap.navigation.olderLabel
                    ? `이전: ${mindmap.navigation.olderLabel}`
                    : '이전 기록 없음'
                }
              >
                <FiChevronLeft size={13} />
              </StepperArrowBtn>
              <StepperCount>
                {mindmap.navigation.currentOrdinalIndex} /{' '}
                {mindmap.navigation.total}대
              </StepperCount>
              <StepperArrowBtn
                type="button"
                disabled={!mindmap.navigation.onNewer}
                onClick={() => mindmap.navigation?.onNewer?.()}
                title={
                  mindmap.navigation.newerLabel
                    ? `다음: ${mindmap.navigation.newerLabel}`
                    : '더 최근 기록 없음'
                }
              >
                <FiChevronRight size={13} />
              </StepperArrowBtn>
            </RegimeStepper>
          )}

          {/* '각료 임명'은 빈 부처 칸마다 있는 '+ 임명'과 같은 일이라 머리 줄에서 뺐다(조작 9개 → 줄임) */}
          <BentoActionBtn
            type="button"
            $accent
            onClick={() => onOpenCabinets(mindmap.activeCabinetId)}
          >
            내각·수반 관리 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      {/* 2. 슬림 1줄 국가 핵심 개요 배너 — 소개가 있을 때만. 없을 때의 '아직 등록되지 않았습니다' 안내는
          통치 구조 패널의 일이 아니다(소개 수정은 국가 머리의 '정보 수정'이 맡는다) */}
      {plainOverviewPreview && (
        <CompactOverviewStrip>
          {proseExpanded ? (
            <ExpandedProseWrap>
              {isLikelyRichTextHtml(cleanDescription) ? (
                <RichTextReadView html={cleanDescription} />
              ) : (
                <p>{cleanDescription}</p>
              )}
            </ExpandedProseWrap>
          ) : (
            <OneLineSummary onClick={() => setProseExpanded(true)}>
              {plainOverviewPreview}
            </OneLineSummary>
          )}
          <OverviewRightBtns>
            {plainOverviewPreview.length > 95 && (
              <MiniTextBtn
                type="button"
                onClick={() => setProseExpanded((p) => !p)}
              >
                {proseExpanded ? '접기' : '전문 보기'}
              </MiniTextBtn>
            )}
            {onEditOverview && (
              <MiniTextBtn type="button" onClick={onEditOverview}>
                <FiEdit2 size={10.5} /> 소개 편집
              </MiniTextBtn>
            )}
          </OverviewRightBtns>
        </CompactOverviewStrip>
      )}

      {/* 3. 중앙 국가 수장 + 좌·우 베지어 마인드맵 캔버스 */}
      <MindMapDiagramStage
        head={mindmap.head}
        emptyHeadLabel={mindmap.defaultEmptyHeadTitle}
        polityLabel={mindmap.activePolityLabel}
        headPeriodSummary={headPeriodSummary}
        headVoteShare={mindmap.headVoteShare}
        ministersCount={
          branchDomain === 'military'
            ? mindmap.militaryBranches.filter((b) => Boolean(b.commanderName))
                .length
            : mindmap.members.length
        }
        departmentsCount={
          branchDomain === 'military'
            ? mindmap.militaryBranches.length
            : mindmap.totalDepartmentsCount ||
              mindmap.members.length + mindmap.vacantSlots.length
        }
        isHistorical={Boolean(historicalCountryId)}
        sovereignsAbove={sovereignsAbove}
        cabinetsDuringReign={cabinetsDuringReign}
        branches={activeBranches}
        onSelectPerson={onSelectPerson}
        onClickEmptyHead={() => onOpenCabinets(null)}
        onSelectVacant={handleOpenVacantAppointment}
        onSelectMilitaryCommand={handleMilitaryBranchClick}
        onSelectReignCabinet={(cabId) => mindmap.selectCabinet(cabId)}
      />

      {/* 4. 하단 권력 지형 인포그래픽 리본 (정당 비중 · 의회 의석 · 선거) */}
      {showPowerRibbon && (
        <PowerRibbonGrid>
          {cabinetPartySlices.length > 0 && (
            <PowerRibbonCell>
              <RibbonCellHead>
                <span>내각 정당 구성</span>
                <button
                  type="button"
                  onClick={() => onOpenCabinets(mindmap.activeCabinetId)}
                >
                  상세 ↗
                </button>
              </RibbonCellHead>
              <StackedSegmentBar slices={cabinetPartySlices} height={8} />
            </PowerRibbonCell>
          )}

          {seatSlices.length > 0 && (
            <PowerRibbonCell>
              <RibbonCellHead>
                <span>입법부 의석 정원</span>
                <button type="button" onClick={onOpenPoliticalSystem}>
                  헌정 체제 ↗
                </button>
              </RibbonCellHead>
              <StackedSegmentBar slices={seatSlices} height={8} />
            </PowerRibbonCell>
          )}

          {activeElection && onOpenElections && (
            <PowerRibbonElectionBtn
              type="button"
              onClick={() => onOpenElections(activeElection.id)}
            >
              <RibbonCellHead as="div">
                <span>
                  {mindmap.linkedElection ? '정권 출범 선거' : '최근 · 예정 선거'}
                </span>
                <FiArrowUpRight size={12} />
              </RibbonCellHead>
              <ElectionNameLine>{activeElection.name}</ElectionNameLine>
              <ElectionMetaLine>
                {activeElection.pollDate
                  ? formatShortMindMapDate(activeElection.pollDate)
                  : ''}
                {mindmap.headVoteShare != null
                  ? ` · 득표율 ${mindmap.headVoteShare.toFixed(1)}%`
                  : ''}
              </ElectionMetaLine>
            </PowerRibbonElectionBtn>
          )}
        </PowerRibbonGrid>
      )}

      {footerSlot ? <HeroFooterSlot>{footerSlot}</HeroFooterSlot> : null}

      {/* 대시보드 이탈 없는 인플레이스 임명 모달 */}
      {appointmentTarget && (
        <InstitutionAppointmentModal
          isOpen={true}
          onClose={() => setAppointmentTarget(null)}
          contextType={appointmentTarget.contextType}
          countryId={countryId ?? null}
          historicalCountryId={historicalCountryId ?? null}
          countryName={countryName}
          countryIsoCode={countryIsoCode ?? null}
          departmentId={appointmentTarget.departmentId ?? null}
          departmentName={appointmentTarget.departmentName ?? null}
          militaryUnitId={appointmentTarget.militaryUnitId ?? null}
          militaryUnitName={appointmentTarget.militaryUnitName ?? null}
          militaryUnitType={appointmentTarget.militaryUnitType ?? null}
          cabinetId={mindmap.activeCabinetId}
          cabinetName={mindmap.activeCabinetLabel}
          cabinetStartDate={mindmap.activeCabinetDates.startDate}
          cabinetEndDate={mindmap.activeCabinetDates.endDate}
          availableDepartments={mindmap.eraDepartments}
          onSaved={() => {
            setAppointmentTarget(null)
            invalidateTenureQueries(queryClient, {
              countryId: countryId ?? undefined,
              historicalCountryId: historicalCountryId ?? undefined,
              cabinetId: mindmap.activeCabinetId ?? undefined,
            })
            if (mindmap.activeCabinetId) {
              void queryClient.invalidateQueries({
                queryKey: ['cabinet-overview', mindmap.activeCabinetId],
              })
            }
          }}
        />
      )}
    </BentoCard>
  )
}

/* ─── Styled Components (Event-Ledger Flat Infographic) ─────────────────── */

const HeroTitleCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
`

const RegimePillRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`

const RegimePill = styled.button`
  height: 21px;
  padding: 0 7px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.85;
  }
`

const ModeSwitchGroup = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const ModeSwitchBtn = styled.button<{ $active: boolean }>`
  height: 22px;
  padding: 0 8px;
  border: none;
  border-radius: 4px;
  background: ${({ theme, $active }) =>
    $active ? ledgerBackground(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  ${DIGIT_DISPLAY}
  cursor: pointer;
`

const RegimeStepper = styled.div`
  display: inline-flex;
  align-items: center;
  height: 26px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;
`

const StepperArrowBtn = styled.button`
  width: 25px;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`

const StepperCount = styled.span`
  padding: 0 7px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  ${DIGIT_DISPLAY}
`

const CompactOverviewStrip = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  margin: 0 18px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const OneLineSummary = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  flex: 1;
  min-width: 0;
`

const ExpandedProseWrap = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};

  p {
    margin: 0;
  }
`

const OverviewRightBtns = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const MiniTextBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const MindMapStage = styled.div`
  container-type: inline-size;
  padding: 14px 18px 16px;
`

const MindMapGrid = styled.div<{ $hasBranches: boolean }>`
  display: grid;
  grid-template-columns: ${({ $hasBranches }) =>
    $hasBranches
      ? `minmax(210px, 1fr) 256px minmax(210px, 1fr)`
      : 'minmax(0, 340px)'};
  gap: ${({ $hasBranches }) => ($hasBranches ? `${GUTTER}px` : '0')};
  align-items: center;
  justify-content: center;

  @container (max-width: 820px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
`

const MindMapSideCol = styled.div<{ $side: 'left' | 'right' }>`
  min-width: 0;

  @container (max-width: 820px) {
    order: ${({ $side }) => ($side === 'left' ? 2 : 3)};
  }
`

const CenterHubStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;

  @container (max-width: 820px) {
    order: 1;
  }
`

const WingGroupBox = styled.div<{ $side: 'left' | 'right' }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${NODE_GAP}px;
`

const ConnectorSvg = styled.svg<{ $side: 'left' | 'right'; $muted: boolean }>`
  position: absolute;
  top: 0;
  ${({ $side }) =>
    $side === 'left' ? `right: -${GUTTER}px;` : `left: -${GUTTER}px;`}
  pointer-events: none;
  overflow: visible;

  path {
    fill: none;
    stroke: ${({ theme, $muted }) =>
      $muted
        ? ledgerHairlineStrong(theme.mode)
        : theme.mode === 'dark'
          ? 'rgba(165, 180, 252, 0.34)'
          : 'rgba(79, 70, 229, 0.30)'};
    stroke-width: 1.4;
  }

  @container (max-width: 820px) {
    display: none;
  }
`

const nodeSharedCss = css`
  height: ${NODE_HEIGHT}px;
  padding: 0 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-width: 0;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;
`

const MinisterNodeBtn = styled.button<{ $side: 'left' | 'right' }>`
  ${nodeSharedCss}
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const VacantNodeBtn = styled.button<{ $side: 'left' | 'right' }>`
  ${nodeSharedCss}
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  opacity: 0.76;

  &:hover {
    opacity: 1;
    border-style: solid;
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const AvatarCircle = styled.span<{ $size: number; $monarch?: boolean }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: ${({ $size, $monarch, theme }) =>
    $size >= 60
      ? `2px solid ${
          $monarch
            ? theme.mode === 'dark'
              ? '#fcd34d'
              : '#d97706'
            : ledgerAccent(theme.mode)
        }`
      : `1px solid ${ledgerHairlineStrong(theme.mode)}`};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

const VacantDot = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  flex-shrink: 0;
`

const NodeMainText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
`

const NodeRoleLine = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const ReshuffleBadge = styled.em`
  font-style: normal;
  font-size: 9.5px;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 3px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(251, 191, 36, 0.14)'
      : 'rgba(217, 119, 6, 0.1)'};
  flex-shrink: 0;
`

const NodePersonLine = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;

  strong {
    font-size: 12.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const PartyDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const VacantSubLine = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const NodeStartBadge = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  ${DIGIT_DISPLAY}
`

const UnitJumpTag = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  padding: 2px 5px;
  border-radius: 4px;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  flex-shrink: 0;
`

/* ─── Central Leader & Dual-Executive Cards ──────────────────────────────── */

const CrownCounterpartList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`

const CrownCounterpartCard = styled.button<{ $monarch: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 9px;
  border: 1px solid
    ${({ theme, $monarch }) =>
      $monarch
        ? theme.mode === 'dark'
          ? 'rgba(252, 211, 77, 0.35)'
          : 'rgba(217, 119, 6, 0.32)'
        : ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const CrownCardText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const CrownRoleBadge = styled.span<{ $monarch: boolean }>`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme, $monarch }) =>
    $monarch
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : ledgerAccent(theme.mode)};
`

const CrownPersonName = styled.strong`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const VerticalSpine = styled.span`
  width: 1.5px;
  height: 12px;
  background: ${({ theme }) => ledgerAccentBorder(theme.mode)};
`

const LeaderCenterCard = styled.button<{ $monarch: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 16px 14px 13px;
  border-radius: 12px;
  border: 1.5px solid
    ${({ theme, $monarch }) =>
      $monarch
        ? theme.mode === 'dark'
          ? 'rgba(252, 211, 77, 0.45)'
          : 'rgba(217, 119, 6, 0.4)'
        : ledgerAccentBorder(theme.mode)};
  background: ${({ theme, $monarch }) =>
    $monarch
      ? theme.mode === 'dark'
        ? 'rgba(251, 191, 36, 0.06)'
        : 'rgba(254, 243, 199, 0.32)'
      : ledgerAccentSubtle(theme.mode)};
  font-family: inherit;
  text-align: center;
  cursor: pointer;
  box-shadow: none;
  transition: border-color ${MOTION.fast} ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const LeaderEmptyCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 20px 14px;
  border-radius: 12px;
  border: 1.5px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font-family: inherit;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const LeaderRoleRow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 2px;
`

const LeaderRoleChip = styled.span<{ $monarch: boolean }>`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $monarch }) =>
    $monarch
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : ledgerAccent(theme.mode)};
`

const IncumbentBadge = styled.span`
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#6366f1' : '#4f46e5'};
`

const RegnalEraChip = styled.span`
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LeaderName = styled.strong`
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LeaderPolitySub = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LeaderPeriodText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const LeaderKpiMiniRow = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const LeaderKpiCell = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  strong {
    font-size: 12px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }
`

const LeaderEmptyPrompt = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const ReignCabinetsWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

const ReignCabinetsLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ReignCabinetsPills = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ReignCabinetPill = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 7px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-family: inherit;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  small {
    font-size: 10.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const ExpandBranchesRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 12px;
`

const ExpandBranchesBtn = styled.button`
  height: 26px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  ${DIGIT_DISPLAY}
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const PowerRibbonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  padding: 12px 18px 14px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const PowerRibbonCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const RibbonCellHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};

  button {
    padding: 0;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    cursor: pointer;
  }
`

const PowerRibbonElectionBtn = styled.button`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 11px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  min-width: 0;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const ElectionNameLine = styled.strong`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ElectionMetaLine = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const HeroFooterSlot = styled.div`
  padding: 12px 18px 14px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`
