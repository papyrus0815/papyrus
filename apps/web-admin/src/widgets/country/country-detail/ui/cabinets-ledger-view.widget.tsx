/**
 * 국가 상세 → 정부·행정 → 행정부·내각 탭의 「원장 목록(Ledger)」 뷰.
 * 사건·전 국가 정부 카탈로그와 동일한 플랫 원장(Ledger) 디자인 언어로,
 * 내각 고유 기간(개각 구분)·집권여당·연호·각료·사건·조약 지표를 세기 구분선과 함께 밀도 있게 표시한다.
 *
 * - 주어는 연표와 같게 **수반 이름**, 내각 이름은 그 아래 부제(예전엔 내각명이 제목·'수반: …' 접두어 19회).
 * - 넷째 열 '취임 → 퇴임 · 정당' — 취임 방식·퇴임 사유는 거의 모든 행에 채워져 있는데 어느 보기에도 안 보였다.
 *   예전 넷째 열(정당·연호)은 표 폭 1060px 이하에서 통째로 숨어 1440px 화면에서도 안 나왔다 — 좁으면 수반 칸
 *   아래로 내려앉게 바꿨다.
 * - 행 사이 표지(정치체 전환 · 군주 교체 · 기록 공백)는 연표와 같은 buildCabinetListMarkers 결과를 받는다.
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
import {
  APPOINTMENT_METHOD_LABELS,
  TENURE_END_REASON_LABELS,
} from '@/shared/lib/tenure-labels'
import { parseSignedDateParts } from '@/shared/lib/tenure-person-utils'
import { computeCabinetReshuffleMetaMap } from '@/pages/government/government-helpers'

import {
  type CabinetListMarker,
  formatCabinetTransitionLine,
  formatDate,
  getHeadTenureTerritoryLabel,
  getPersonName,
  resolveCabinetEffectiveDates,
} from './cabinets-section.helpers'
import {
  approxDaysBetween,
  formatTenureDuration,
} from './cabinets-vertical-timeline'

export interface CabinetsLedgerViewProps {
  items: readonly CabinetListItemDto[]
  countryName: string
  isHistoricalCountry: boolean
  showTerritoryLabels: boolean
  /** 행 id → 그 행 앞에 그릴 표지(정치체 전환 · 군주 교체 · 기록 공백) */
  markersByCabinetId?: ReadonlyMap<string, CabinetListMarker[]>
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

export function resolveCabinetRulingParty(
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
  markersByCabinetId,
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
        <span>수반 · 내각</span>
        <DesktopOnlyColHeader>취임 → 퇴임 · 정당</DesktopOnlyColHeader>
        <RightHeaderCol>기록</RightHeaderCol>
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

          const startPartsForDuration = effStart
            ? parseSignedDateParts(effStart)
            : null
          const endPartsForDuration = effEnd ? parseSignedDateParts(effEnd) : null
          const durationLabel =
            startPartsForDuration && (endPartsForDuration || !isHistoricalCountry)
              ? formatTenureDuration(
                  approxDaysBetween(
                    startPartsForDuration,
                    endPartsForDuration ?? {
                      signedYear: new Date().getFullYear(),
                      month: new Date().getMonth() + 1,
                      day: new Date().getDate(),
                    },
                  ),
                )
              : null
          const transition = formatCabinetTransitionLine(headTenure, {
            appointment: APPOINTMENT_METHOD_LABELS,
            endReason: TENURE_END_REASON_LABELS,
          })
          const rowMarkers = markersByCabinetId?.get(cabinetItem.id) ?? []

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

              {rowMarkers.map((marker) => (
                <MarkerDividerRow key={marker.key} $kind={marker.kind}>
                  {marker.kind === 'reign' ? (
                    <span className="marker-sub">군주</span>
                  ) : null}
                  <span className="marker-label">{marker.label}</span>
                  {marker.kind === 'gap' && marker.detail ? (
                    <span className="marker-sub">{marker.detail}</span>
                  ) : null}
                </MarkerDividerRow>
              ))}

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
                  <span className="period-line">
                    <IncumbentDot $incumbent={Boolean(effStart && !effEnd && !isHistoricalCountry)} />
                    <span>{periodText}</span>
                  </span>
                  {durationLabel ? (
                    <span className="duration">{durationLabel}</span>
                  ) : null}
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
                    <LeaderNameText>{personDisplayName}</LeaderNameText>
                    {explicitCabinetName &&
                    explicitCabinetName !== personDisplayName ? (
                      <CabinetSubName>{explicitCabinetName}</CabinetSubName>
                    ) : null}
                  </LeaderTextStack>
                </LeaderCell>

                <DesktopOnlyCol>
                  <PartyEraStack>
                    {transition ? (
                      <TransitionText>
                        {transition.appointment ?? '—'}
                        {transition.endReason ? (
                          <>
                            <span className="arrow" aria-label="에서">
                              →
                            </span>
                            {transition.endReason}
                          </>
                        ) : null}
                      </TransitionText>
                    ) : null}
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
                    {!transition && !rulingParty && !reignEraText ? (
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

/*
 * 열 접기는 화면 폭이 아니라 이 표의 폭으로 판단한다 — 국가 목록·내비 레일이 460px를 먹어 1440px 화면에서도
 * 표는 ~980px인데 @media(1120px)는 넓다고 보고 5열(합 1,028px)을 깔아 오른쪽 '구성' 열·상세 버튼이 잘렸다.
 */
const LedgerShell = styled.div`
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;
`

const DesktopOnlyColHeader = styled.span``

const LedgerHeaderRow = styled.div`
  display: grid;
  grid-template-columns: 184px 168px minmax(180px, 1fr) minmax(180px, 0.9fr) auto;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  @container (max-width: 900px) {
    grid-template-columns: 172px 156px minmax(0, 1fr) auto;

    /* 넷째 열은 좁으면 수반 칸 아래로 내려가므로 머리에서 뺀다 */
    > ${DesktopOnlyColHeader} {
      display: none;
    }
  }

  @container (max-width: 640px) {
    display: none;
  }
`

/** 넷째 열(취임 → 퇴임 · 정당) — 좁으면 숨기지 않고 수반 칸 아래 둘째 줄로 내려앉는다 */
const DesktopOnlyCol = styled.div`
  min-width: 0;

  @container (max-width: 900px) {
    grid-column: 3 / 4;
    grid-row: 2;
  }
  @container (max-width: 640px) {
    grid-column: auto;
    grid-row: auto;
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
  position: relative;
  display: grid;
  grid-template-columns: 184px 168px minmax(180px, 1fr) minmax(180px, 0.9fr) auto;
  align-items: center;
  gap: 4px 12px;
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

  @container (max-width: 900px) {
    grid-template-columns: 172px 156px minmax(0, 1fr) auto;
  }

  @container (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 12px 14px;
  }
`

const PeriodCell = styled.span`
  ${DIGIT_DISPLAY}
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  .period-line {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .duration {
    padding-left: 13px;
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

/** 행 사이 표지 — 정치체 전환(굵은 머리) · 군주 교체(옅은 머리) · 기록 공백(점선 띠) */
const MarkerDividerRow = styled.div<{ $kind: CabinetListMarker['kind'] }>`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 2px 8px;
  padding: ${({ $kind }) => ($kind === 'polity' ? '10px 16px 8px' : '7px 16px')};
  border-bottom: 1px ${({ $kind }) => ($kind === 'gap' ? 'dashed' : 'solid')}
    ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ $kind, theme }) =>
    $kind === 'gap'
      ? `repeating-linear-gradient(135deg, transparent 0 6px, ${ledgerRowWash(theme.mode)} 6px 12px)`
      : 'transparent'};
  word-break: keep-all;

  .marker-label {
    font-size: ${({ $kind }) => ($kind === 'polity' ? 13 : 12)}px;
    font-weight: ${({ $kind }) => ($kind === 'reign' ? 600 : 700)};
    color: ${({ $kind, theme }) =>
      $kind === 'polity' ? theme.colors.text.primary : theme.colors.text.secondary};
  }
  .marker-sub {
    ${DIGIT_DISPLAY}
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const TransitionText = styled.span`
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 5px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  word-break: keep-all;

  .arrow {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
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

  /* 카드형(좁은 칸)에서는 기록 칩·수정 단추를 카드 오른쪽 위에 — 예전엔 연필 하나가 맨 아래 한 줄을 차지했다 */
  @container (max-width: 640px) {
    position: absolute;
    top: 10px;
    right: 10px;
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
