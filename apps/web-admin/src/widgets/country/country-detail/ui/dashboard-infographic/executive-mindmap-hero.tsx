import React, { useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import {
  FiArrowUpRight,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiShield,
  FiUser,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css, keyframes, useTheme } from 'styled-components'

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
import { pathKeys } from '@/shared/router'
import {
  InstitutionAppointmentModal,
  type InstitutionAppointmentContextType,
} from '@/shared/ui/institution-appointment-modal'

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

const NODE_HEIGHT = 54
const NODE_GAP = 10
const GUTTER = 48
const DEFAULT_COLLAPSED_BRANCHES = 14

type MinistryDomainKey = 'security' | 'economy' | 'governance' | 'social'

interface MinistryDomainMeta {
  key: MinistryDomainKey
  label: string
  light: string
  dark: string
  softLight: string
  softDark: string
}

const MINISTRY_DOMAINS: Record<MinistryDomainKey, MinistryDomainMeta> = {
  security: {
    key: 'security',
    label: '외교 · 안보',
    light: '#4f46e5',
    dark: '#818cf8',
    softLight: 'rgba(79, 70, 229, 0.1)',
    softDark: 'rgba(129, 140, 248, 0.18)',
  },
  economy: {
    key: 'economy',
    label: '경제 · 산업',
    light: '#0d9488',
    dark: '#2dd4bf',
    softLight: 'rgba(13, 148, 136, 0.1)',
    softDark: 'rgba(45, 212, 191, 0.18)',
  },
  governance: {
    key: 'governance',
    label: '내정 · 사법',
    light: '#d97706',
    dark: '#fbbf24',
    softLight: 'rgba(217, 119, 6, 0.11)',
    softDark: 'rgba(251, 191, 36, 0.18)',
  },
  social: {
    key: 'social',
    label: '사회 · 인프라',
    light: '#0284c7',
    dark: '#38bdf8',
    softLight: 'rgba(2, 132, 199, 0.1)',
    softDark: 'rgba(56, 189, 248, 0.18)',
  },
}

const MINISTRY_DOMAIN_ORDER: MinistryDomainKey[] = [
  'security',
  'governance',
  'economy',
  'social',
]

function inferMinistryDomain(rawText: string, isMilitary = false): MinistryDomainMeta {
  if (isMilitary) return MINISTRY_DOMAINS.security
  const normalized = rawText.toLowerCase()
  if (
    /(국무|외교|외무|국방|전쟁|보훈|통일|안보|해군|육군|공군|해병|병조|예조|사령|state|defense|foreign|war|veteran|security)/.test(
      normalized,
    )
  ) {
    return MINISTRY_DOMAINS.security
  }
  if (
    /(재무|기획재정|기재|상무|산업|통상|농무|농림|에너지|해양|호조|공조|재정|경제|금융|treasury|commerce|energy|agriculture|trade|finance)/.test(
      normalized,
    )
  ) {
    return MINISTRY_DOMAINS.economy
  }
  if (
    /(내무|행정|행안|법무|국토안보|인사|법제|의정부|이조|형조|승정원|총리|수상|감사|interior|justice|homeland|home)/.test(
      normalized,
    )
  ) {
    return MINISTRY_DOMAINS.governance
  }
  return MINISTRY_DOMAINS.social
}

function getBranchDomainMeta(item: MindMapBranchItem): MinistryDomainMeta {
  if (item.kind === 'military') return MINISTRY_DOMAINS.security
  if (item.kind === 'member') {
    return inferMinistryDomain(
      `${item.member.departmentName ?? ''} ${item.member.title ?? ''}`,
    )
  }
  return inferMinistryDomain(
    `${item.slot.departmentName} ${item.slot.positionTitle}`,
  )
}

function describeArcSvg(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
): string {
  const safeSpan = Math.min(359.2, Math.max(0.5, endDeg - startDeg))
  const startRad = ((startDeg - 90) * Math.PI) / 180
  const endRad = ((startDeg + safeSpan - 90) * Math.PI) / 180
  const startX = cx + radius * Math.cos(startRad)
  const startY = cy + radius * Math.sin(startRad)
  const endX = cx + radius * Math.cos(endRad)
  const endY = cy + radius * Math.sin(endRad)
  const largeArc = safeSpan > 180 ? 1 : 0
  return `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`
}

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
  accentColor,
}: {
  imageUrl?: string | null
  name: string
  size: number
  monarch?: boolean
  accentColor?: string
}) {
  const [failed, setFailed] = useState(false)
  const resolved = !failed && imageUrl ? getUploadImageUrl(imageUrl) : null

  return (
    <AvatarCircle
      $size={size}
      $monarch={monarch}
      $accentColor={accentColor}
    >
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
  hubMonarch = false,
  cleanInstitutionalVacant = false,
  onSelectPerson,
  onSelectVacant,
  onSelectMilitaryCommand,
}: {
  side: 'left' | 'right'
  items: MindMapBranchItem[]
  muted: boolean
  hubMonarch?: boolean
  cleanInstitutionalVacant?: boolean
  onSelectPerson: (personId: string) => void
  onSelectVacant: (slot: MindMapVacantSlot) => void
  onSelectMilitaryCommand?: (cmd: MindMapMilitaryCommandItem) => void
}) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const height = groupHeightOf(items.length)
  const originY = height / 2
  const hubColor = hubMonarch
    ? isDark
      ? '#fcd34d'
      : '#d97706'
    : isDark
      ? '#818cf8'
      : '#4f46e5'

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
          <defs>
            {items.map((item, idx) => {
              const dom = getBranchDomainMeta(item)
              const targetColor = isDark ? dom.dark : dom.light
              const gradId = `mm-grad-${side}-${idx}`
              return (
                <linearGradient
                  key={gradId}
                  id={gradId}
                  x1={side === 'left' ? '100%' : '0%'}
                  y1="50%"
                  x2={side === 'left' ? '0%' : '100%'}
                  y2="50%"
                >
                  <stop offset="0%" stopColor={hubColor} stopOpacity="0.65" />
                  <stop offset="100%" stopColor={targetColor} stopOpacity="0.78" />
                </linearGradient>
              )
            })}
          </defs>
          {items.map((item, idx) => {
            const nodeY = nodeCenterY(idx)
            const pathD =
              side === 'left'
                ? `M ${GUTTER} ${originY} C ${GUTTER * 0.42} ${originY}, ${GUTTER * 0.58} ${nodeY}, 0 ${nodeY}`
                : `M 0 ${originY} C ${GUTTER * 0.42} ${originY}, ${GUTTER * 0.58} ${nodeY}, ${GUTTER} ${nodeY}`
            const isDashed =
              item.kind === 'vacant' ||
              (item.kind === 'military' && !item.command.commanderName)
            const endX = side === 'left' ? 2 : GUTTER - 2
            const dom = getBranchDomainMeta(item)
            const dotColor = isDark ? dom.dark : dom.light
            return (
              <g key={item.key}>
                <path
                  d={pathD}
                  stroke={muted ? undefined : `url(#mm-grad-${side}-${idx})`}
                  strokeDasharray={isDashed ? '4 3.5' : undefined}
                />
                <circle
                  cx={endX}
                  cy={nodeY}
                  r="3.2"
                  fill={muted ? ledgerHairlineStrong(theme.mode) : dotColor}
                />
              </g>
            )
          })}
          <circle
            cx={side === 'left' ? GUTTER - 1 : 1}
            cy={originY}
            r="6.5"
            fill={hubColor}
            fillOpacity="0.18"
          />
          <circle
            cx={side === 'left' ? GUTTER - 1 : 1}
            cy={originY}
            r="3.4"
            fill={hubColor}
          />
        </ConnectorSvg>
      )}

      {items.map((item) => {
        const dom = getBranchDomainMeta(item)
        const domColor = isDark ? dom.dark : dom.light
        const domSoft = isDark ? dom.softDark : dom.softLight

        if (item.kind === 'member') {
          const memberRow = item.member
          const deptPrimary = memberRow.departmentName?.trim() || dom.label
          const roleSub =
            memberRow.departmentName &&
            memberRow.title &&
            memberRow.title !== memberRow.departmentName
              ? memberRow.title
              : !memberRow.departmentName
                ? memberRow.title
                : null
          const startYearLabel = memberRow.startDate
            ? formatShortMindMapDate(memberRow.startDate).split('.')[0]
            : null

          return (
            <MinisterNodeBtn
              key={item.key}
              type="button"
              $side={side}
              $accent={domColor}
              onClick={() => {
                if (memberRow.personId) onSelectPerson(memberRow.personId)
              }}
              title={
                memberRow.replaced && memberRow.predecessor
                  ? `${deptPrimary} — ${memberRow.name} (${memberRow.predecessor} 후임)`
                  : `${deptPrimary} — ${memberRow.name}`
              }
            >
              <AvatarThumb
                imageUrl={memberRow.imageUrl}
                name={memberRow.name}
                size={36}
                accentColor={domColor}
              />
              <NodeMainText>
                <NodeRoleLine>
                  <DomainMinistryBadge $color={domColor} $bg={domSoft}>
                    {deptPrimary}
                  </DomainMinistryBadge>
                  {roleSub ? <span className="sub-role">{roleSub}</span> : null}
                  {memberRow.replaced ? (
                    <ReshuffleBadge>교체</ReshuffleBadge>
                  ) : null}
                </NodeRoleLine>
                <NodePersonLine>
                  {memberRow.partyColor ? (
                    <PartyDot
                      $color={memberRow.partyColor}
                      title={memberRow.partyName ?? ''}
                    />
                  ) : null}
                  <strong>{memberRow.name}</strong>
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
                $accent={domColor}
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
                  size={36}
                  accentColor={domColor}
                />
                <NodeMainText>
                  <NodeRoleLine>
                    <DomainMinistryBadge $color={domColor} $bg={domSoft}>
                      {cmd.unitName}
                    </DomainMinistryBadge>
                    {cmd.commanderRankOrTitle ? (
                      <span className="sub-role">{cmd.commanderRankOrTitle}</span>
                    ) : null}
                  </NodeRoleLine>
                  <NodePersonLine>
                    <strong>{cmd.commanderName}</strong>
                  </NodePersonLine>
                </NodeMainText>
                <UnitJumpTag
                  onClick={(evt) => {
                    evt.stopPropagation()
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
              title={`${cmd.unitName} 부대 상세`}
            >
              <VacantDot aria-hidden $color={domColor} $bg={domSoft}>
                <FiShield size={13} />
              </VacantDot>
              <NodeMainText>
                <NodeRoleLine>
                  <DomainMinistryBadge $color={domColor} $bg={domSoft}>
                    {cmd.unitName}
                  </DomainMinistryBadge>
                </NodeRoleLine>
                <VacantSubLine>
                  {cleanInstitutionalVacant ? '군 상위 사령부' : '+ 지휘관 임명'}
                </VacantSubLine>
              </NodeMainText>
            </VacantNodeBtn>
          )
        }

        const slotItem = item.slot
        return (
          <VacantNodeBtn
            key={item.key}
            type="button"
            $side={side}
            onClick={() => onSelectVacant(slotItem)}
            title={
              cleanInstitutionalVacant
                ? `${slotItem.departmentName} (${slotItem.positionTitle})`
                : `${slotItem.departmentName} (${slotItem.positionTitle}) 즉시 임명`
            }
          >
            <VacantDot aria-hidden $color={domColor} $bg={domSoft}>
              {cleanInstitutionalVacant ? '🏛' : '+'}
            </VacantDot>
            <NodeMainText>
              <NodeRoleLine>
                <DomainMinistryBadge $color={domColor} $bg={domSoft}>
                  {slotItem.departmentName}
                </DomainMinistryBadge>
              </NodeRoleLine>
              <VacantSubLine>
                {cleanInstitutionalVacant
                  ? slotItem.positionTitle
                  : `${slotItem.positionTitle} · 임명`}
              </VacantSubLine>
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
  cleanInstitutionalVacant = false,
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
  cleanInstitutionalVacant?: boolean
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
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const [expanded, setExpanded] = useState(false)

  const sortedBranches = useMemo(() => {
    const domainRank: Record<MinistryDomainKey, number> = {
      security: 0,
      governance: 1,
      economy: 2,
      social: 3,
    }
    return [...branches].sort((left, right) => {
      const dLeft = domainRank[getBranchDomainMeta(left).key]
      const dRight = domainRank[getBranchDomainMeta(right).key]
      return dLeft - dRight
    })
  }, [branches])

  const domainCounts = useMemo(() => {
    const counts: Record<MinistryDomainKey, number> = {
      security: 0,
      governance: 0,
      economy: 0,
      social: 0,
    }
    for (const item of sortedBranches) {
      counts[getBranchDomainMeta(item).key] += 1
    }
    return counts
  }, [sortedBranches])

  const radialArcs = useMemo(() => {
    const total = sortedBranches.length
    if (total === 0) return []
    const activeKeys = MINISTRY_DOMAIN_ORDER.filter(
      (domKey) => domainCounts[domKey] > 0,
    )
    const gapDeg = activeKeys.length > 1 ? 8 : 0
    const usableDeg = 360 - gapDeg * activeKeys.length
    let cursor = 0
    return activeKeys.map((domKey) => {
      const dom = MINISTRY_DOMAINS[domKey]
      const sweep = (domainCounts[domKey] / total) * usableDeg
      const dPath = describeArcSvg(59, 59, 51, cursor, cursor + sweep)
      cursor += sweep + gapDeg
      return {
        key: domKey,
        label: dom.label,
        count: domainCounts[domKey],
        color: isDark ? dom.dark : dom.light,
        dPath,
      }
    })
  }, [sortedBranches.length, domainCounts, isDark])

  const visible = expanded
    ? sortedBranches
    : sortedBranches.slice(0, collapsedLimit)
  const hiddenCount = Math.max(0, sortedBranches.length - visible.length)

  const pivot = Math.ceil(visible.length / 2)
  const leftItems = visible.slice(0, pivot)
  const rightItems = visible.slice(pivot)
  const isMonarchCenter = Boolean(head?.isMonarchical)

  return (
    <MindMapStage>
      {radialArcs.length > 1 && (
        <DomainLegendBar aria-label="부처 분야별 분포">
          {radialArcs.map((arc) => (
            <DomainLegendPill key={arc.key}>
              <span className="dot" style={{ background: arc.color }} />
              <span>{arc.label}</span>
              <strong>{arc.count}</strong>
            </DomainLegendPill>
          ))}
        </DomainLegendBar>
      )}

      <MindMapGrid $hasBranches={visible.length > 0}>
        {visible.length > 0 && (
          <MindMapSideCol $side="left">
            <BezierBranchGroup
              side="left"
              items={leftItems}
              muted={!head}
              hubMonarch={isMonarchCenter}
              cleanInstitutionalVacant={cleanInstitutionalVacant}
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
              <HubRingPortraitBox>
                <svg
                  className="ring-svg"
                  viewBox="0 0 118 118"
                  aria-hidden="true"
                >
                  <circle
                    cx="59"
                    cy="59"
                    r="51"
                    fill="none"
                    stroke={
                      isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(15, 23, 42, 0.07)'
                    }
                    strokeWidth="4.5"
                  />
                  <circle
                    cx="59"
                    cy="59"
                    r="56"
                    fill="none"
                    stroke={
                      isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(15, 23, 42, 0.09)'
                    }
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                  {radialArcs.length > 0 ? (
                    radialArcs.map((arc) => (
                      <path
                        key={arc.key}
                        d={arc.dPath}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth="4.5"
                        strokeLinecap="round"
                      />
                    ))
                  ) : (
                    <path
                      d={describeArcSvg(59, 59, 51, 30, 330)}
                      fill="none"
                      stroke={
                        isMonarchCenter
                          ? isDark
                            ? '#fcd34d'
                            : '#d97706'
                          : isDark
                            ? '#818cf8'
                            : '#4f46e5'
                      }
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <AvatarThumb
                  imageUrl={head.imageUrl}
                  name={head.name}
                  size={86}
                  monarch={isMonarchCenter}
                />
              </HubRingPortraitBox>

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
              hubMonarch={isMonarchCenter}
              cleanInstitutionalVacant={cleanInstitutionalVacant}
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
  /** 2단 내각·장관 마인드맵 전용 모드 (실제 임명된 장관이 있을 때만 노출, 공석 점선 및 중복 크롬 제거) */
  cabinetMindMapMode?: boolean
  onVisibilityChange?: (visible: boolean) => void
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
  focusedTenureId,
  onActiveTenureChange,
  currentCabinetSummary,
  nextElection,
  recentElection,
  cabinetMindMapMode = false,
  onVisibilityChange,
  onOpenPoliticalSystem,
  onOpenCabinets,
  onOpenMinistries,
  onOpenElections,
  onSelectPerson,
  footerSlot,
}: ExecutiveMindMapBentoHeroProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [branchDomain, setBranchDomain] = useState<'cabinet' | 'military'>(
    'cabinet',
  )
  const [slideMotion, setSlideMotion] = useState<{
    dir: 'left' | 'right' | null
    tick: number
  }>({ dir: null, tick: 0 })

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

  const onActiveTenureChangeRef = React.useRef(onActiveTenureChange)
  onActiveTenureChangeRef.current = onActiveTenureChange

  React.useEffect(() => {
    onActiveTenureChangeRef.current?.(mindmap.activeHeadTenureId)
  }, [mindmap.activeHeadTenureId])

  // 국가가 바뀌면 기본 탭 복귀
  React.useEffect(() => {
    setBranchDomain('cabinet')
  }, [countryId, historicalCountryId])

  const appointedMilitaryBranches = useMemo(
    () =>
      mindmap.militaryBranches.filter((cmd) => Boolean(cmd.commanderName)),
    [mindmap.militaryBranches],
  )

  const activeBranches = useMemo<MindMapBranchItem[]>(() => {
    if (branchDomain === 'military') {
      const milPool = cabinetMindMapMode
        ? appointedMilitaryBranches
        : mindmap.militaryBranches
      if (milPool.length > 0) {
        return milPool.map((cmd) => ({
          kind: 'military',
          key: `mil:${cmd.unitId}`,
          command: cmd,
        }))
      }
    }
    const filled: MindMapBranchItem[] = mindmap.members.map((member) => ({
      kind: 'member',
      key: `m:${member.id}`,
      member,
    }))
    if (cabinetMindMapMode) {
      if (filled.length > 0) return filled
      // 행정 수반은 등록되어 있으나 각료가 아직 비어 있는 경우, 실제 DB에 등록된 해당 시대 부처만 최대 6개 기관 노드로 연결
      const realDeptSlots = mindmap.vacantSlots
        .filter((slot) => Boolean(slot.departmentId))
        .slice(0, 6)
        .map<MindMapBranchItem>((slot) => ({
          kind: 'vacant',
          key: `v:${slot.key}`,
          slot,
        }))
      return realDeptSlots
    }
    const vacant: MindMapBranchItem[] = mindmap.vacantSlots.map((slot) => ({
      kind: 'vacant',
      key: `v:${slot.key}`,
      slot,
    }))
    return [...filled, ...vacant]
  }, [
    branchDomain,
    cabinetMindMapMode,
    appointedMilitaryBranches,
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

  const headPeriodSummary = useMemo(() => {
    const activeHead = mindmap.head
    if (!activeHead) return null
    const start = formatShortMindMapDate(activeHead.startDate)
    const end = activeHead.endDate
      ? formatShortMindMapDate(activeHead.endDate)
      : '현재'
    const elapsed = !activeHead.endDate
      ? formatMindMapElapsed(activeHead.startDate)
      : null
    if (!start && !activeHead.endDate) return null
    return `${start || '?'} ~ ${end}${elapsed ? ` (${elapsed})` : ''}`
  }, [mindmap.head])

  const showPowerRibbon = !cabinetMindMapMode && (
    cabinetPartySlices.length > 0 ||
    seatSlices.length > 0 ||
    Boolean(activeElection)
  )

  const hasExecutiveHeroData = cabinetMindMapMode
    ? Boolean(mindmap.head) || mindmap.members.length > 0
    : Boolean(mindmap.head) ||
      mindmap.members.length > 0 ||
      appointedMilitaryBranches.length > 0

  const isVisibleInCabinetMode =
    !cabinetMindMapMode || (!mindmap.isLoading && hasExecutiveHeroData)

  const onVisibilityChangeRef = React.useRef(onVisibilityChange)
  onVisibilityChangeRef.current = onVisibilityChange

  React.useEffect(() => {
    if (cabinetMindMapMode) {
      onVisibilityChangeRef.current?.(!mindmap.isLoading && hasExecutiveHeroData)
    }
  }, [cabinetMindMapMode, mindmap.isLoading, hasExecutiveHeroData])

  if (cabinetMindMapMode && !isVisibleInCabinetMode) {
    return null
  }

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
    <BentoCard aria-label={`${countryName} 행정부 및 각 부처 조직도`}>
      {/* 1. 상단 바: 행정부 타이틀 + 현재 내각 배지 + 바로가기 */}
      <BentoCardHeader>
        <HeroTitleCluster>
          <BentoCardTitleGroup>
            <BentoCardTitle>
              {branchDomain === 'military' ? '군 통수부' : '행정부'}
            </BentoCardTitle>
            {mindmap.activeCabinetLabel ? (
              <BentoCardBadge>
                {mindmap.activeCabinetLabel}
                {mindmap.navigation
                  ? ` · ${mindmap.navigation.currentOrdinalIndex}/${mindmap.navigation.total}`
                  : ''}
              </BentoCardBadge>
            ) : null}
          </BentoCardTitleGroup>

          {!cabinetMindMapMode && mindmap.polityBadges.length > 0 && (
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
          {(cabinetMindMapMode
            ? mindmap.members.length > 0 && appointedMilitaryBranches.length > 0
            : mindmap.militaryBranches.length > 0) && (
            <ModeSwitchGroup role="tablist" aria-label="마인드맵 권력축 전환">
              <ModeSwitchBtn
                type="button"
                $active={branchDomain === 'cabinet'}
                onClick={() => setBranchDomain('cabinet')}
              >
                내각 부처 ({mindmap.members.length})
              </ModeSwitchBtn>
              <ModeSwitchBtn
                type="button"
                $active={branchDomain === 'military'}
                onClick={() => setBranchDomain('military')}
              >
                군 수뇌부 (
                {cabinetMindMapMode
                  ? appointedMilitaryBranches.length
                  : mindmap.militaryBranches.length}
                )
              </ModeSwitchBtn>
            </ModeSwitchGroup>
          )}

          {!cabinetMindMapMode && mindmap.canToggleMode && (
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

          <BentoActionBtn
            type="button"
            $accent
            onClick={() => onOpenCabinets(mindmap.activeCabinetId)}
          >
            행정부 상세 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      {/* 2. 좌·우 사이드 화살표로 전환되는 중앙 수장 + 각 부처 마인드맵 스테이지 */}
      <MindMapCarouselShell $withArrows={Boolean(mindmap.navigation)}>
        {mindmap.navigation ? (
          <StageEdgeArrowBtn
            type="button"
            $side="left"
            disabled={!mindmap.navigation.onOlder}
            onClick={() => {
              if (!mindmap.navigation?.onOlder) return
              setSlideMotion((prev) => ({ dir: 'left', tick: prev.tick + 1 }))
              mindmap.navigation.onOlder()
            }}
            aria-label={
              mindmap.navigation.olderLabel
                ? `이전 행정부: ${mindmap.navigation.olderLabel}`
                : '이전 행정부 없음'
            }
            title={
              mindmap.navigation.olderLabel
                ? `이전: ${mindmap.navigation.olderLabel}`
                : '첫 행정부 기록입니다'
            }
          >
            <FiChevronLeft size={22} />
          </StageEdgeArrowBtn>
        ) : null}

        <MindMapSlideTrack
          key={slideMotion.tick}
          $direction={slideMotion.dir}
        >
          <MindMapDiagramStage
            head={mindmap.head}
            emptyHeadLabel={mindmap.defaultEmptyHeadTitle}
            polityLabel={mindmap.activePolityLabel}
            headPeriodSummary={headPeriodSummary}
            headVoteShare={mindmap.headVoteShare}
            ministersCount={
              branchDomain === 'military'
                ? mindmap.militaryBranches.filter((branch) =>
                    Boolean(branch.commanderName),
                  ).length
                : mindmap.members.length
            }
            departmentsCount={
              branchDomain === 'military'
                ? mindmap.militaryBranches.length
                : mindmap.totalDepartmentsCount ||
                  mindmap.members.length + mindmap.vacantSlots.length
            }
            isHistorical={Boolean(historicalCountryId)}
            cleanInstitutionalVacant={cabinetMindMapMode}
            sovereignsAbove={sovereignsAbove}
            cabinetsDuringReign={cabinetsDuringReign}
            branches={activeBranches}
            collapsedLimit={cabinetMindMapMode ? 12 : DEFAULT_COLLAPSED_BRANCHES}
            onSelectPerson={onSelectPerson}
            onClickEmptyHead={() => onOpenCabinets(null)}
            onSelectVacant={handleOpenVacantAppointment}
            onSelectMilitaryCommand={handleMilitaryBranchClick}
            onSelectReignCabinet={(cabId) => mindmap.selectCabinet(cabId)}
          />
        </MindMapSlideTrack>

        {mindmap.navigation ? (
          <StageEdgeArrowBtn
            type="button"
            $side="right"
            disabled={!mindmap.navigation.onNewer}
            onClick={() => {
              if (!mindmap.navigation?.onNewer) return
              setSlideMotion((prev) => ({ dir: 'right', tick: prev.tick + 1 }))
              mindmap.navigation.onNewer()
            }}
            aria-label={
              mindmap.navigation.newerLabel
                ? `다음 행정부: ${mindmap.navigation.newerLabel}`
                : '다음 행정부 없음'
            }
            title={
              mindmap.navigation.newerLabel
                ? `다음: ${mindmap.navigation.newerLabel}`
                : '가장 최근 행정부입니다'
            }
          >
            <FiChevronRight size={22} />
          </StageEdgeArrowBtn>
        ) : null}
      </MindMapCarouselShell>

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

          {!cabinetMindMapMode && seatSlices.length > 0 && (
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

          {!cabinetMindMapMode && activeElection && onOpenElections && (
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
  padding: 3px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(15, 23, 42, 0.045)'};
`

const ModeSwitchBtn = styled.button<{ $active: boolean }>`
  height: 23px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.28)'
        : '#ffffff'
      : 'transparent'};
  box-shadow: ${({ theme, $active }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 4px rgba(15, 23, 42, 0.08)'
      : 'none'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 700 : 550)};
  ${DIGIT_DISPLAY}
  cursor: pointer;
`

const slideFromLeft = keyframes`
  from {
    opacity: 0.45;
    transform: translateX(-22px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

const slideFromRight = keyframes`
  from {
    opacity: 0.45;
    transform: translateX(22px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

const MindMapCarouselShell = styled.div<{ $withArrows: boolean }>`
  position: relative;
  padding: ${({ $withArrows }) => ($withArrows ? '0 48px' : '0')};

  @media (max-width: 820px) {
    padding: ${({ $withArrows }) => ($withArrows ? '0 38px' : '0')};
  }
`

const MindMapSlideTrack = styled.div<{ $direction: 'left' | 'right' | null }>`
  min-width: 0;
  animation: ${({ $direction }) =>
    $direction === 'left'
      ? css`${slideFromLeft} 240ms cubic-bezier(0.22, 1, 0.36, 1)`
      : $direction === 'right'
        ? css`${slideFromRight} 240ms cubic-bezier(0.22, 1, 0.36, 1)`
        : 'none'};
`

const StageEdgeArrowBtn = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === 'left' ? 'left: 0;' : 'right: 0;')}
  transform: translateY(-50%);
  z-index: 3;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(30, 41, 59, 0.92)'
      : 'rgba(255, 255, 255, 0.96)'};
  color: ${({ theme }) => theme.colors.text.primary};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 24px -6px rgba(0, 0, 0, 0.55)'
      : '0 6px 20px -6px rgba(15, 23, 42, 0.14)'};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease,
    background ${MOTION.fast} ease,
    opacity ${MOTION.fast} ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(49, 46, 129, 0.55)' : '#ffffff'};
    transform: translateY(-50%) scale(1.06);
  }

  &:disabled {
    opacity: 0.25;
    cursor: default;
    box-shadow: none;
  }

  @media (max-width: 820px) {
    width: 32px;
    height: 32px;
  }
`

const MindMapStage = styled.div`
  container-type: inline-size;
  padding: 6px 4px 4px;
  border-radius: 0;
  background: transparent;
`

const MindMapGrid = styled.div<{ $hasBranches: boolean }>`
  display: grid;
  grid-template-columns: ${({ $hasBranches }) =>
    $hasBranches
      ? `minmax(186px, 1fr) 244px minmax(186px, 1fr)`
      : 'minmax(0, 340px)'};
  gap: ${({ $hasBranches }) => ($hasBranches ? `${GUTTER}px` : '0')};
  align-items: center;
  justify-content: center;

  @container (max-width: 680px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
`

const MindMapSideCol = styled.div<{ $side: 'left' | 'right' }>`
  min-width: 0;

  @container (max-width: 680px) {
    order: ${({ $side }) => ($side === 'left' ? 2 : 3)};
  }
`

const CenterHubStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;

  @container (max-width: 680px) {
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
          ? 'rgba(165, 180, 252, 0.36)'
          : 'rgba(99, 102, 241, 0.32)'};
    stroke-width: 1.75;
    stroke-linecap: round;
  }

  circle.node-dot,
  circle.hub-dot {
    fill: ${({ theme, $muted }) =>
      $muted
        ? ledgerHairlineStrong(theme.mode)
        : theme.mode === 'dark'
          ? '#818cf8'
          : '#6366f1'};
    opacity: 0.72;
  }

  @container (max-width: 680px) {
    display: none;
  }
`

const nodeSharedCss = css`
  height: ${NODE_HEIGHT}px;
  padding: 0 14px 0 9px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-width: 0;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease,
    transform ${MOTION.fast} ease,
    box-shadow ${MOTION.fast} ease;
`

const MinisterNodeBtn = styled.button<{
  $side: 'left' | 'right'
  $accent?: string
}>`
  ${nodeSharedCss}
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.065)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.72)' : '#ffffff'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 6px 18px -8px rgba(0, 0, 0, 0.48)'
      : '0 4px 16px -6px rgba(15, 23, 42, 0.075)'};

  &:hover {
    border-color: ${({ $accent, theme }) =>
      $accent ?? ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(30, 41, 59, 0.92)'
        : 'rgba(248, 250, 255, 1)'};
    transform: translateY(-1.5px);
  }
`

const VacantNodeBtn = styled.button<{ $side: 'left' | 'right' }>`
  ${nodeSharedCss}
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.09)'
        : 'rgba(15, 23, 42, 0.075)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(248, 250, 252, 0.85)'};
  opacity: 0.92;

  &:hover {
    opacity: 1;
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    transform: translateY(-1px);
  }
`

const AvatarCircle = styled.span<{
  $size: number
  $monarch?: boolean
  $accentColor?: string
}>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: ${({ $size, $monarch, $accentColor, theme }) =>
    $size >= 60
      ? `2.5px solid ${
          $monarch
            ? theme.mode === 'dark'
              ? '#fcd34d'
              : '#d97706'
            : ledgerAccent(theme.mode)
        }`
      : $accentColor
        ? `2px solid ${$accentColor}`
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

const VacantDot = styled.span<{ $color?: string; $bg?: string }>`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: ${({ $bg, theme }) => $bg ?? ledgerSubtleFill(theme.mode)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: ${({ $color, theme }) => $color ?? ledgerAccent(theme.mode)};
  flex-shrink: 0;
`

const DomainMinistryBadge = styled.span<{ $color: string; $bg: string }>`
  display: inline-flex;
  align-items: center;
  padding: 1.5px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 750;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  white-space: nowrap;
  flex-shrink: 0;
`

const DomainLegendBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
`

const DomainLegendPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3.5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.045)'
      : 'rgba(15, 23, 42, 0.035)'};

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  strong {
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }
`

const HubRingPortraitBox = styled.div`
  position: relative;
  width: 118px;
  height: 118px;
  display: flex;
  align-items: center;
  justify-content: center;

  .ring-svg {
    position: absolute;
    inset: 0;
    width: 118px;
    height: 118px;
    pointer-events: none;
  }
`

const NodeMainText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;
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

  .sub-role {
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
  gap: 10px;
  width: 100%;
  padding: 7px 14px 7px 8px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $monarch }) =>
      $monarch
        ? theme.mode === 'dark'
          ? 'rgba(252, 211, 77, 0.32)'
          : 'rgba(217, 119, 6, 0.24)'
        : ledgerAccentBorder(theme.mode)};
  background: ${({ theme, $monarch }) =>
    $monarch
      ? theme.mode === 'dark'
        ? 'rgba(251, 191, 36, 0.08)'
        : 'rgba(255, 251, 235, 0.92)'
      : theme.mode === 'dark'
        ? 'rgba(30, 41, 59, 0.7)'
        : '#ffffff'};
  box-shadow: 0 3px 10px -4px rgba(15, 23, 42, 0.06);
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
  gap: 7px;
  width: 100%;
  padding: 20px 16px 16px;
  border-radius: 24px;
  border: 1px solid
    ${({ theme, $monarch }) =>
      $monarch
        ? theme.mode === 'dark'
          ? 'rgba(252, 211, 77, 0.3)'
          : 'rgba(217, 119, 6, 0.22)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.12)'
          : 'rgba(15, 23, 42, 0.09)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : '#ffffff'};
  font-family: inherit;
  text-align: center;
  cursor: pointer;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 14px 32px -14px rgba(0, 0, 0, 0.5)'
      : '0 10px 28px -14px rgba(15, 23, 42, 0.14)'};
  transition:
    border-color ${MOTION.fast} ease,
    transform ${MOTION.fast} ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    transform: translateY(-1px);
  }
`

const LeaderEmptyCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 22px 16px;
  border-radius: 24px;
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
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#6366f1' : '#4f46e5'};
`

const RegnalEraChip = styled.span`
  padding: 2px 7px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(15, 23, 42, 0.05)'};
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
  gap: 10px;
  width: 100%;
  margin-top: 6px;
  padding: 7px 10px;
  border-radius: 14px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.045)'
      : 'rgba(15, 23, 42, 0.035)'};
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
  padding: 6px 22px 18px;
  background: transparent;
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
