/**
 * 국가 상세 → 정부·행정 → 행정부·내각 탭의 「원장 목록(Ledger)」 뷰.
 * 사건·전 국가 정부 카탈로그와 동일한 플랫 원장(Ledger) 디자인 언어로,
 * 내각 고유 기간(개각 구분)·집권여당·연호·각료·사건·조약 지표를 세기 구분선과 함께 밀도 있게 표시한다.
 */
import React, { useMemo } from 'react'

import {
  FiAward,
  FiCalendar,
  FiEdit2,
  FiFileText,
  FiLink2,
  FiUsers,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerChipFill,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerRowWash,
  ledgerSurface,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import type { CabinetListItemDto } from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import { resolveCabinetMinisterCount } from '@/shared/lib/ministry-department/department-cabinet-matcher'
import { parseSignedDateParts } from '@/shared/lib/tenure-person-utils'
import { computeCabinetReshuffleMetaMap } from '@/pages/government/government-helpers'

import {
  formatDate,
  getHeadTenureTerritoryLabel,
  getPersonName,
  resolveCabinetEffectiveDates,
} from './cabinets-section.helpers'

export interface CabinetsLedgerViewProps {
  items: readonly CabinetListItemDto[]
  countryName: string
  isHistoricalCountry: boolean
  showTerritoryLabels: boolean
  reignEraLineByCabinetId: ReadonlyMap<string, string>
  deletingCabinetId: string | null
  onSelectCabinet: (cabinetId: string) => void
  onInspectPerson?: (personId: string) => void
  onEditCabinet?: (
    cabinetItem: CabinetListItemDto,
    mouseEvent: React.MouseEvent,
  ) => void
}

interface RulingPartySummary {
  label: string
  color: string | null
  extraCoalitionCount: number
}

function resolveCabinetRulingParty(
  cabinetItem: CabinetListItemDto,
): RulingPartySummary | null {
  const parties = cabinetItem.politicalParties ?? []
  if (parties.length > 0) {
    const primary =
      parties.find(
        (entry) => entry.role === 'LEADING' || entry.role === 'RULING',
      ) ?? parties[0]
    const primaryParty = primary?.party as
      | {
          shortName?: string | null
          name?: string | null
          brandColor?: string | null
          color?: string | null
        }
      | undefined
    const label =
      primaryParty?.shortName?.trim() || primaryParty?.name?.trim() || ''
    if (label) {
      return {
        label,
        color: primaryParty?.brandColor ?? primaryParty?.color ?? null,
        extraCoalitionCount: Math.max(0, parties.length - 1),
      }
    }
  }
  const headParty = cabinetItem.headTenure?.party as
    | {
        shortName?: string | null
        name?: string | null
        brandColor?: string | null
        color?: string | null
      }
    | null
    | undefined
  if (headParty) {
    const label = headParty.shortName?.trim() || headParty.name?.trim() || ''
    if (label) {
      return {
        label,
        color: headParty.brandColor ?? headParty.color ?? null,
        extraCoalitionCount: 0,
      }
    }
  }
  return null
}

function resolveCenturyLabel(isoDate: string | null): {
  key: string
  label: string
} {
  if (!isoDate) return { key: 'unknown', label: '연대 미상' }
  const parts = parseSignedDateParts(isoDate)
  if (!parts) return { key: 'unknown', label: '연대 미상' }
  if (parts.signedYear < 0) {
    const bcCentury = Math.floor((Math.abs(parts.signedYear) - 1) / 100) + 1
    return { key: `bc-${bcCentury}`, label: `기원전 ${bcCentury}세기` }
  }
  const adCentury = Math.floor((parts.signedYear - 1) / 100) + 1
  return { key: `ad-${adCentury}`, label: `${adCentury}세기` }
}

export function CabinetsLedgerView({
  items,
  countryName,
  isHistoricalCountry,
  showTerritoryLabels,
  reignEraLineByCabinetId,
  deletingCabinetId,
  onSelectCabinet,
  onInspectPerson,
  onEditCabinet,
}: CabinetsLedgerViewProps) {
  const distinctCenturyCount = useMemo(() => {
    const keys = new Set<string>()
    for (const cabinetItem of items) {
      const effectiveDates = resolveCabinetEffectiveDates(cabinetItem)
      const century = resolveCenturyLabel(effectiveDates.startDate)
      if (century.key !== 'unknown') keys.add(century.key)
    }
    return keys.size
  }, [items])

  const showCenturyDividers = distinctCenturyCount > 1
  const reshuffleMetaMap = useMemo(
    () => computeCabinetReshuffleMetaMap([...items]),
    [items],
  )

  return (
    <LedgerShell role="region" aria-label="역대 행정부 원장 목록">
      <LedgerHeaderRow>
        <span>출범 · 존속 기간</span>
        <span>대수 · 직함</span>
        <span>수반 · 행정부 명칭</span>
        <DesktopOnlyCol>집권 여당 · 연호</DesktopOnlyCol>
        <RightHeaderCol>구성 · 기록</RightHeaderCol>
      </LedgerHeaderRow>

      <LedgerBody>
        {items.map((cabinetItem, rowIndex) => {
          const headTenure = cabinetItem.headTenure
          const effectiveDates = resolveCabinetEffectiveDates(cabinetItem)
          const effStart = effectiveDates.startDate
          const effEnd = effectiveDates.endDate
          const prevDates =
            rowIndex > 0 ? resolveCabinetEffectiveDates(items[rowIndex - 1]) : null
          const currentCentury = resolveCenturyLabel(effStart)
          const prevCentury =
            rowIndex > 0 && prevDates
              ? resolveCenturyLabel(prevDates.startDate)
              : null
          const shouldRenderCenturyHeader =
            showCenturyDividers &&
            (rowIndex === 0 || prevCentury?.key !== currentCentury.key)

          const ongoingLabel = isHistoricalCountry ? '' : '현재'
          const periodText = effStart
            ? `${formatDate(effStart)} – ${
                effEnd ? formatDate(effEnd) : ongoingLabel || '종료 미상'
              }`
            : '연대 미상'

          const territoryLabel = showTerritoryLabels
            ? getHeadTenureTerritoryLabel(
                headTenure ?? {
                  country: cabinetItem.country,
                  historicalCountry: cabinetItem.historicalCountry,
                },
                countryName,
              )
            : null

          const personDisplayName = headTenure?.person
            ? getPersonName(headTenure.person)
            : cabinetItem.name?.trim() || '집단지도 · 과도정부'

          const positionTitle = headTenure
            ? (headTenure.positionDefinition?.title ??
              headTenure.title ??
              '수반')
            : '집단지도 · 위원회'

          const ordinalText =
            headTenure?.ordinal != null
              ? `제${headTenure.ordinal}대${
                  headTenure.subTermNumber != null
                    ? ` ${headTenure.subTermNumber}기`
                    : ''
                }`
              : null

          const explicitCabinetName = cabinetItem.name?.trim() || null
          const avatarUrl = headTenure?.person?.profileImageUrl
            ? getUploadImageUrl(headTenure.person.profileImageUrl)
            : null

          const reignEraText =
            reignEraLineByCabinetId.get(cabinetItem.id) ?? null
          const rulingParty = resolveCabinetRulingParty(cabinetItem)
          const ministerCount = resolveCabinetMinisterCount(cabinetItem._count)
          const reshuffleMeta = reshuffleMetaMap.get(cabinetItem.id) ?? null
          const achievementCount = Array.isArray(headTenure?.achievements)
            ? headTenure.achievements.length
            : 0
          const eventCount = cabinetItem._count?.events ?? 0
          const treatyCount = cabinetItem._count?.treatySignatories ?? 0
          const hasLinkageGroup = Boolean(cabinetItem.linkageGroup)
          const isDeleting = deletingCabinetId === cabinetItem.id
          const leaderPersonId = headTenure?.person?.id ?? null
          const hasAnyMetric =
            ministerCount > 0 ||
            achievementCount > 0 ||
            eventCount > 0 ||
            treatyCount > 0 ||
            hasLinkageGroup

          return (
            <React.Fragment key={cabinetItem.id}>
              {shouldRenderCenturyHeader ? (
                <CenturyDividerRow>
                  <CenturyDividerLabel>
                    {currentCentury.label}
                  </CenturyDividerLabel>
                  <CenturyDividerLine />
                </CenturyDividerRow>
              ) : null}

              <LedgerRow
                role="button"
                tabIndex={isDeleting ? -1 : 0}
                aria-disabled={isDeleting}
                $striped={rowIndex % 2 === 1}
                $disabled={isDeleting}
                $reshuffleGrouped={Boolean(reshuffleMeta)}
                $reshuffleContinuation={Boolean(
                  reshuffleMeta?.isContinuationFromPrev,
                )}
                onClick={() => {
                  if (!isDeleting) {
                    onSelectCabinet(cabinetItem.id)
                  }
                }}
                onKeyDown={(keyboardEvent) => {
                  if (isDeleting) return
                  if (
                    keyboardEvent.key === 'Enter' ||
                    keyboardEvent.key === ' '
                  ) {
                    keyboardEvent.preventDefault()
                    onSelectCabinet(cabinetItem.id)
                  }
                }}
              >
                <PeriodCell>
                  <IncumbentDot $incumbent={Boolean(effStart && !effEnd && !isHistoricalCountry)} />
                  <span>{periodText}</span>
                </PeriodCell>

                <PositionCell>
                  <PositionMainLine>
                    {ordinalText && <OrdinalBadge>{ordinalText}</OrdinalBadge>}
                    {reshuffleMeta ? (
                      <ReshuffleBadge
                        title={`동일 수반 임기 내 총 ${reshuffleMeta.total}차 개각 중 제${reshuffleMeta.order}차 내각`}
                      >
                        제{reshuffleMeta.order}차
                      </ReshuffleBadge>
                    ) : null}
                    <PositionTitleSpan>{positionTitle}</PositionTitleSpan>
                  </PositionMainLine>
                  {territoryLabel && (
                    <TerritoryChip>
                      <TerritoryDot />
                      <span>{territoryLabel}</span>
                    </TerritoryChip>
                  )}
                </PositionCell>

                <LeaderCell>
                  {leaderPersonId && onInspectPerson ? (
                    <AvatarTriggerBtn
                      type="button"
                      title={`${personDisplayName} 인물 정보 미리보기`}
                      onClick={(mouseEvent) => {
                        mouseEvent.stopPropagation()
                        onInspectPerson(leaderPersonId)
                      }}
                    >
                      {avatarUrl ? (
                        <MiniAvatar src={avatarUrl} alt={personDisplayName} />
                      ) : (
                        <MiniAvatarFallback>
                          {personDisplayName.slice(0, 1)}
                        </MiniAvatarFallback>
                      )}
                    </AvatarTriggerBtn>
                  ) : avatarUrl ? (
                    <MiniAvatar src={avatarUrl} alt={personDisplayName} />
                  ) : (
                    <MiniAvatarFallback>
                      {personDisplayName.slice(0, 1)}
                    </MiniAvatarFallback>
                  )}
                  <LeaderTextStack>
                    {explicitCabinetName &&
                    explicitCabinetName !== personDisplayName ? (
                      <>
                        <LeaderNameText>{explicitCabinetName}</LeaderNameText>
                        <CabinetSubName>
                          {headTenure?.person ? `수반: ${personDisplayName}` : personDisplayName}
                        </CabinetSubName>
                      </>
                    ) : (
                      <LeaderNameText>{personDisplayName}</LeaderNameText>
                    )}
                  </LeaderTextStack>
                </LeaderCell>

                <DesktopOnlyCol>
                  <PartyEraStack>
                    {rulingParty ? (
                      <PartyBadge title={rulingParty.label}>
                        <PartyColorDot $color={rulingParty.color} />
                        <PartyLabelText>{rulingParty.label}</PartyLabelText>
                        {rulingParty.extraCoalitionCount > 0 && (
                          <CoalitionSuffix>
                            +{rulingParty.extraCoalitionCount}
                          </CoalitionSuffix>
                        )}
                      </PartyBadge>
                    ) : null}
                    {reignEraText ? (
                      <EraPill title={reignEraText}>{reignEraText}</EraPill>
                    ) : null}
                    {!rulingParty && !reignEraText ? (
                      <MutedDash>—</MutedDash>
                    ) : null}
                  </PartyEraStack>
                </DesktopOnlyCol>

                <MetaBadgeCell>
                  {ministerCount > 0 && (
                    <StatChip title={`소속 각료 ${ministerCount}명`}>
                      <FiUsers size={11} />
                      <span>{ministerCount}</span>
                    </StatChip>
                  )}
                  {achievementCount > 0 && (
                    <StatChip title={`재임 기록·업적 ${achievementCount}건`}>
                      <FiAward size={11} />
                      <span>{achievementCount}</span>
                    </StatChip>
                  )}
                  {eventCount > 0 && (
                    <StatChip title={`연결 역사 사건 ${eventCount}건`}>
                      <FiCalendar size={11} />
                      <span>{eventCount}</span>
                    </StatChip>
                  )}
                  {treatyCount > 0 && (
                    <StatChip title={`체결·서명 조약 ${treatyCount}건`}>
                      <FiFileText size={11} />
                      <span>{treatyCount}</span>
                    </StatChip>
                  )}
                  {hasLinkageGroup && (
                    <AccentChip title="다국 국제사건 연결 행정부">
                      <FiLink2 size={11} />
                      <span>연계</span>
                    </AccentChip>
                  )}
                  {!hasAnyMetric && <MutedDash>상세 →</MutedDash>}
                  {onEditCabinet && (
                    <QuickEditBtn
                      type="button"
                      title="행정부·내각 정보 수정"
                      aria-label={`${explicitCabinetName ?? personDisplayName} 수정`}
                      onClick={(mouseEvent) => {
                        mouseEvent.stopPropagation()
                        onEditCabinet(cabinetItem, mouseEvent)
                      }}
                    >
                      <FiEdit2 size={12} />
                    </QuickEditBtn>
                  )}
                </MetaBadgeCell>
              </LedgerRow>
            </React.Fragment>
          )
        })}
      </LedgerBody>
    </LedgerShell>
  )
}

const LedgerShell = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;
`

const LedgerHeaderRow = styled.div`
  display: grid;
  grid-template-columns: 196px 200px minmax(200px, 1fr) 176px 176px;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  @media (max-width: 1120px) {
    grid-template-columns: 170px 180px minmax(160px, 1fr) 140px;
  }

  @media (max-width: 720px) {
    display: none;
  }
`

const DesktopOnlyCol = styled.div`
  min-width: 0;

  @media (max-width: 1120px) {
    display: none;
  }
`

const RightHeaderCol = styled.span`
  text-align: right;
`

const LedgerBody = styled.div`
  display: flex;
  flex-direction: column;
`

const CenturyDividerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.025)'
      : 'rgba(15, 23, 42, 0.022)'};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const CenturyDividerLabel = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;
`

const CenturyDividerLine = styled.span`
  flex: 1;
  height: 1px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
`

const LedgerRow = styled.div<{
  $striped: boolean
  $disabled: boolean
  $reshuffleGrouped?: boolean
  $reshuffleContinuation?: boolean
}>`
  display: grid;
  grid-template-columns: 196px 200px minmax(200px, 1fr) 176px 176px;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  padding-left: ${({ $reshuffleGrouped }) => ($reshuffleGrouped ? '13px' : '16px')};
  box-sizing: border-box;
  border-left: ${({ $reshuffleGrouped, theme }) =>
    $reshuffleGrouped
      ? `3px solid ${ledgerAccent(theme.mode)}`
      : '3px solid transparent'};
  border-top: ${({ $reshuffleContinuation, theme }) =>
    $reshuffleContinuation
      ? `1px dashed ${ledgerHairline(theme.mode)}`
      : 'none'};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme, $striped }) =>
    $striped ? ledgerRowWash(theme.mode) : 'transparent'};
  text-align: left;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: background 0.12s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme, $disabled, $striped }) =>
      $disabled
        ? $striped
          ? ledgerRowWash(theme.mode)
          : 'transparent'
        : ledgerHoverFill(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }

  @media (max-width: 1120px) {
    grid-template-columns: 170px 180px minmax(160px, 1fr) 140px;
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 12px 14px;
  }
`

const PeriodCell = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const IncumbentDot = styled.span<{ $incumbent: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $incumbent, theme }) =>
    $incumbent
      ? '#10b981'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.2)'
        : 'rgba(15, 23, 42, 0.18)'};
`

const PositionCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-width: 0;
`

const PositionMainLine = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
`

const OrdinalBadge = styled.span`
  ${DIGIT_DISPLAY}
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const ReshuffleBadge = styled.span`
  ${DIGIT_DISPLAY}
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  font-size: 10.5px;
  font-weight: 700;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(148, 163, 184, 0.28)'
        : 'rgba(15, 23, 42, 0.16)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(15, 23, 42, 0.04)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PositionTitleSpan = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TerritoryChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.14)'
      : 'rgba(245, 158, 11, 0.09)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
`

const TerritoryDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  background: currentColor;
`

const LeaderCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const AvatarTriggerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.12s ease;

  &:hover {
    transform: scale(1.06);
  }
`

const MiniAvatar = styled.img`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const MiniAvatarFallback = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const LeaderTextStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const LeaderNameText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CabinetSubName = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PartyEraStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  min-width: 0;
`

const PartyBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
`

const PartyColorDot = styled.span<{ $color: string | null }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $color, theme }) =>
    $color || ledgerAccent(theme.mode)};
`

const PartyLabelText = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CoalitionSuffix = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const EraPill = styled.span`
  display: inline-block;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: ${RADIUS.PILL};
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MutedDash = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaBadgeCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  flex-wrap: wrap;

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`

const StatChip = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const AccentChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const QuickEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: ${RADIUS.XS};
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;

  &:hover {
    background: ${({ theme }) => ledgerChipFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
