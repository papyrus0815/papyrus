import { useMemo } from 'react'

import styled, { useTheme } from 'styled-components'

import { formatObservationValue } from '@/entities/evidence/lib/format-observation'
import {
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerSubtleFill,
  MOTION,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { type Observation, type StructuredPoint } from '@/shared/api/evidence'

import { type EventDetail } from '../../use-event-detail'
import { toAxisSpan } from '../development-timeline.lib'
import { withSideColors } from '../side-colors'
import { buildMemberCells, buildSideMetricRows, sideSizeOf } from '../side-metrics.lib'
import { SIDE_OUTCOME_LABEL } from '../side-outcome'
import {
  type CountryRowData,
  countryRowKey,
  countrySideMapOf,
  effectivePersonSide,
  type EventPersonEntry,
  formatPointShort,
} from './actors.lib'

/*
 * 역할 묶음 — 색은 묶음마다 고정하지 않고 **무채 짙기 사다리**로 칠한다. 예전 역할 색(주도 파랑 #2563eb·중재 호박)이
 * 바로 위 진영 막대의 진영 색(1번 파랑 #1d4ed8·5번 호박 #a16207)과 같은 자리에 서서 '주도국 = 1번 진영'처럼 읽혔다.
 * 이름·개수는 범례가 말한다.
 */
const ROLE_GROUP_CONFIG: ReadonlyArray<{
  key: string
  label: string
  roles: ReadonlyArray<string>
}> = [
  { key: 'initiator', label: '주도·선포', roles: ['INITIATOR'] },
  { key: 'target', label: '대상·피해', roles: ['TARGET', 'VICTIM'] },
  { key: 'beneficiary', label: '수혜', roles: ['BENEFICIARY'] },
  { key: 'mediator', label: '중재·참관', roles: ['MEDIATOR', 'OBSERVER'] },
  { key: 'statehood', label: '성립·소멸', roles: ['FOUNDED', 'DISSOLVED'] },
  { key: 'participant', label: '일반 참여', roles: ['PARTICIPANT', 'ALLY', 'ADVERSARY', 'OTHER'] },
]

const ROLE_RAMP_LIGHT = ['#1e293b', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'] as const
const ROLE_RAMP_DARK = ['#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155'] as const

/** 중도 가담·이탈 막대에 싣는 나라 수 — 넘으면 '외 N개국'으로 알린다(예전엔 말없이 잘렸다) */
const TIMELINE_LIMIT = 4

function pointToDecimalYear(point: StructuredPoint | null | undefined): number | null {
  if (!point) return null
  const signedYear = point.era === 'BC' ? -point.year : point.year
  const monthOffset = point.month ? (point.month - 1) / 12 : 0
  const dayOffset = point.month && point.day ? (point.day - 1) / 365 : 0
  return signedYear + monthOffset + dayOffset
}

function formatAxisYear(decimalYear: number): string {
  const rounded = Math.floor(decimalYear)
  return rounded < 0 ? `BC ${Math.abs(rounded)}` : `${rounded}`
}

/** '4개국 · 3명' — 0인 쪽은 적지 않는다('11개국 · 0명'이 인물이 빠진 것처럼 읽혔다) */
function sideMemberLabel(countryCount: number, personCount: number): string {
  return [countryCount > 0 && `${countryCount}개국`, personCount > 0 && `${personCount}명`]
    .filter(Boolean)
    .join(' · ')
}

export interface ActorsInfographicBoardProps {
  event: EventDetail
  countryRows: CountryRowData[]
  persons: EventPersonEntry[]
  observations: Observation[]
  departmentCount?: number
  readOnly?: boolean
  onStartSides?: () => void
  onManageSides?: () => void
  onCountryClick: (countryId: string) => void
  onPersonClick: (personId: string) => void
  /** 수치 모듈로 — 대립 막대의 숫자를 자세히(지표별 비교·출처) */
  onShowMetrics?: () => void
}

export function ActorsInfographicBoard({
  event,
  countryRows,
  persons,
  observations,
  onCountryClick,
  onShowMetrics,
}: ActorsInfographicBoardProps) {
  const theme = useTheme()
  const isDarkMode = theme.mode === 'dark'

  const coloredSides = useMemo(
    () => withSideColors((event.sides ?? []).filter((side) => !side.parentSideId)),
    [event.sides],
  )

  const roleSlices = useMemo<SegmentSlice[]>(() => {
    if (countryRows.length === 0) return []
    const ramp = isDarkMode ? ROLE_RAMP_DARK : ROLE_RAMP_LIGHT
    return ROLE_GROUP_CONFIG.map((group) => ({
      key: group.key,
      label: group.label,
      value: countryRows.filter((row) => group.roles.includes(row.role || 'PARTICIPANT')).length,
    }))
      .filter((slice) => slice.value > 0)
      /* 있는 묶음끼리 사다리 순번 — 이웃한 조각이 늘 다른 짙기 */
      .map((slice, index) => ({ ...slice, color: ramp[index % ramp.length] }))
  }, [countryRows, isDarkMode])

  /**
   * 진영 세력 — 규모 값은 수치 모듈과 **같은 판정**(sideSizeOf: 대표값·'~이상' 제외, 진영 값 없으면 나라 합).
   * 예전엔 한쪽만 병력이 있으면 다른 쪽을 '나라 수×2+인물 수'로 채워 단위가 섞였다(자유군단 진압 사건:
   * 진압군 3,000명 대 봉기군 '3' — 봉기군 막대가 0.1%). 이제 막대는 모두 같은 단위일 때만 비례로 그린다.
   */
  const sideStats = useMemo(() => {
    if (coloredSides.length < 2) return null

    const sideIds = coloredSides.map((side) => side.id)
    const metricRows = buildSideMetricRows(observations, sideIds)
    const participantSide = new Map<string, { sideId: string; name: string }>()
    for (const row of countryRows) {
      if (row.participantId && row.sideId && sideIds.includes(row.sideId)) {
        participantSide.set(row.participantId, { sideId: row.sideId, name: row.name })
      }
    }
    const memberCells = buildMemberCells(observations, participantSide)
    /* 인물 진영 — 참여 목록·진영 탭과 같은 실효 진영(인물 진영 > 소속국 진영) */
    const countrySideByKey = countrySideMapOf(
      countryRows.filter((row) => !row.isHistorical),
      countryRows.filter((row) => row.isHistorical),
    )

    const items = coloredSides.map((side) => {
      const sideCountries = countryRows.filter((row) => row.sideId === side.id)
      const personCount = persons.filter(
        (person) => effectivePersonSide(person, countrySideByKey).sideId === side.id,
      ).length
      const size = sideSizeOf(metricRows, memberCells, side.id)
      const forceLabel = size
        ? formatObservationValue(
            size.derived
              ? { ...size.observation, value: String(Math.round(size.value)), low: null, high: null, atLeast: false }
              : size.observation,
          )
        : null
      return {
        id: side.id,
        name: side.name,
        color: side.color,
        outcome: side.outcome ? SIDE_OUTCOME_LABEL[side.outcome] : null,
        countries: sideCountries,
        personCount,
        size,
        forceLabel: forceLabel && size?.derived ? `${forceLabel} (나라 합)` : forceLabel,
        countWeight: Math.max(1, sideCountries.length * 2 + personCount),
      }
    })

    const measured = items.filter((item) => item.size)
    /* 'numeric' = 모두 규모 값 · 'count' = 아무도 없음(참여 국가·인물 수로) · 'mixed' = 일부만(막대를 그리지 않는다) */
    const mode: 'numeric' | 'count' | 'mixed' =
      measured.length === items.length ? 'numeric' : measured.length === 0 ? 'count' : 'mixed'
    const metricNames = [...new Set(measured.map((item) => item.size!.metricName))]
    return {
      mode,
      metricName: mode === 'count' ? null : metricNames.join(' · '),
      missingNames: items.filter((item) => !item.size).map((item) => item.name),
      items: items.map((item) => ({
        ...item,
        weight: mode === 'numeric' ? item.size!.value : item.countWeight,
      })),
    }
  }, [coloredSides, observations, countryRows, persons])

  const timelineSpans = useMemo(() => {
    const axis = toAxisSpan(event)
    if (!axis || axis.to - axis.from <= 0.05) return null
    const duration = axis.to - axis.from
    const timedRows = countryRows.filter((row) => Boolean(row.join || row.withdraw))
    if (timedRows.length === 0) return null

    const sideColorMap = new Map(coloredSides.map((side) => [side.id, side.color] as const))
    /* 진영 없는 나라 — 진영 색과 헷갈리지 않는 무채색 */
    const neutralColor = isDarkMode ? '#94a3b8' : '#64748b'

    const bars = timedRows.slice(0, TIMELINE_LIMIT).map((row) => {
      const joinVal = pointToDecimalYear(row.join)
      const withdrawVal = pointToDecimalYear(row.withdraw)
      const startRatio =
        joinVal != null ? Math.max(0, Math.min(0.95, (joinVal - axis.from) / duration)) : 0
      const endRatio =
        withdrawVal != null
          ? Math.max(startRatio + 0.05, Math.min(1, (withdrawVal - axis.from) / duration))
          : 1
      const joinText = formatPointShort(row.join)
      const withdrawText = formatPointShort(row.withdraw)
      return {
        key: countryRowKey(row),
        id: row.id,
        name: row.name,
        color: (row.sideId && sideColorMap.get(row.sideId)) || neutralColor,
        leftPct: Math.round(startRatio * 100),
        widthPct: Math.max(6, Math.round((endRatio - startRatio) * 100)),
        periodText: [joinText && `${joinText}~`, withdrawText && `~${withdrawText}`]
          .filter(Boolean)
          .join(' '),
      }
    })

    return {
      startLabel: formatAxisYear(axis.from),
      endLabel: formatAxisYear(axis.to),
      bars,
      hiddenCount: timedRows.length - bars.length,
    }
  }, [event, countryRows, coloredSides, isDarkMode])

  /* 역할이 '일반 참여' 한 가지뿐이면 막대가 말해 주는 것이 없다 */
  const showRoleLine = roleSlices.length >= 2
  if (!sideStats && !showRoleLine) return null

  /*
   * 요약판은 목록이 못 보여 주는 것만 싣는다 — 진영 세력 비교와 당사국 역할 분포.
   * 예전의 '참여 주체 구성'(도넛·막대)은 제목 줄의 국가·인물 수를 되풀이했고, '사건 참여 관계도'는
   * 바로 아래 목록의 앞 4개국·4명을 300px 칸에 다시 그려 이름이 '일..'·'소 소'로 잘렸다.
   * 진영 나누기·진영 편집 버튼은 목록 머리('참여 국가') 하나만 둔다(예전엔 요약판과 목록 머리에 둘씩 섰다).
   */
  return (
    <InfographicStrip aria-label="참여 구도 요약">
      {sideStats && (
        <StripColumn>
          <StripHead>
            <StripTitleRow>
              <StripTitle>진영 세력 대립 구도</StripTitle>
              <MetricTag $accent={Boolean(sideStats.metricName)}>
                {sideStats.metricName ?? '참여 규모 (국가·인물 수)'}
              </MetricTag>
              {onShowMetrics && sideStats.mode !== 'count' && (
                <MetricsLink type="button" onClick={onShowMetrics}>
                  수치 자세히 ↓
                </MetricsLink>
              )}
            </StripTitleRow>
          </StripHead>

          <StripBody>
            {sideStats.items.length === 2 ? (
              <DuelWrap>
                <DuelHeaderRow>
                  {sideStats.items.map((sideItem, sideIdx) => (
                    <DuelSideSummary key={sideItem.id} $alignRight={sideIdx === 1}>
                      <DuelSideTitle $alignRight={sideIdx === 1}>
                        <ColorDot $color={sideItem.color} />
                        <strong>{sideItem.name}</strong>
                        {sideItem.outcome && <OutcomeBadge>{sideItem.outcome}</OutcomeBadge>}
                      </DuelSideTitle>
                      <DuelSideMetrics>
                        {sideItem.forceLabel && <ForceNumber>{sideItem.forceLabel}</ForceNumber>}
                        <span>{sideMemberLabel(sideItem.countries.length, sideItem.personCount)}</span>
                      </DuelSideMetrics>
                    </DuelSideSummary>
                  ))}
                </DuelHeaderRow>

                {sideStats.mode === 'mixed' ? (
                  <TugNote>
                    {sideStats.missingNames.join(' · ')}의 {sideStats.metricName} 기록이 없어 막대를 그리지 않습니다
                  </TugNote>
                ) : (
                  <DuelTugTrack
                    role="img"
                    aria-label={`${sideStats.metricName ?? '참여 규모(국가·인물 수)'} 비교: ${sideStats.items
                      .map(
                        (sideItem) =>
                          `${sideItem.name} ${
                            sideStats.mode === 'numeric'
                              ? sideItem.forceLabel
                              : sideMemberLabel(sideItem.countries.length, sideItem.personCount)
                          }`,
                      )
                      .join(', ')}`}
                  >
                    {sideStats.items.map((sideItem) => (
                      <DuelTugBar
                        key={sideItem.id}
                        $color={sideItem.color}
                        style={{ flexGrow: sideItem.weight }}
                      />
                    ))}
                  </DuelTugTrack>
                )}

                <DuelFlagsRow>
                  {sideStats.items.map((sideItem, sideIdx) => (
                    <DuelFlagCluster key={sideItem.id} $alignRight={sideIdx === 1}>
                      {sideItem.countries.slice(0, 5).map((country) => (
                        <InlineCountryBtn
                          key={countryRowKey(country)}
                          type="button"
                          onClick={() => onCountryClick(country.id)}
                          title={country.name}
                        >
                          <span>{country.flagEmoji || country.name.charAt(0)}</span>
                          <em>{country.name}</em>
                        </InlineCountryBtn>
                      ))}
                      {sideItem.countries.length > 5 && (
                        <MoreCountTag>+{sideItem.countries.length - 5}</MoreCountTag>
                      )}
                    </DuelFlagCluster>
                  ))}
                </DuelFlagsRow>
              </DuelWrap>
            ) : (
              <MultiSideList>
                {(() => {
                  const maxWeight = Math.max(1, ...sideStats.items.map((sideItem) => sideItem.weight))
                  return sideStats.items.map((sideItem) => (
                    <MultiSideRow key={sideItem.id}>
                      <MultiSideHead>
                        <DuelSideTitle>
                          <ColorDot $color={sideItem.color} />
                          <strong>{sideItem.name}</strong>
                          {sideItem.outcome && <OutcomeBadge>{sideItem.outcome}</OutcomeBadge>}
                        </DuelSideTitle>
                        <DuelSideMetrics>
                          {sideItem.forceLabel && <ForceNumber>{sideItem.forceLabel}</ForceNumber>}
                          <span>{sideMemberLabel(sideItem.countries.length, sideItem.personCount)}</span>
                        </DuelSideMetrics>
                      </MultiSideHead>
                      {sideStats.mode !== 'mixed' && (
                        <MultiSideBarTrack aria-hidden>
                          <MultiSideBarFill
                            $color={sideItem.color}
                            style={{
                              width: `${Math.max(8, Math.round((sideItem.weight / maxWeight) * 100))}%`,
                            }}
                          />
                        </MultiSideBarTrack>
                      )}
                    </MultiSideRow>
                  ))
                })()}
                {sideStats.mode === 'mixed' && (
                  <TugNote>
                    {sideStats.missingNames.join(' · ')}의 {sideStats.metricName} 기록이 없어 막대를 그리지 않습니다
                  </TugNote>
                )}
              </MultiSideList>
            )}

            {timelineSpans && (
              <TimelineMiniBox>
                <SubSectionLabel>
                  <span>중도 가담 · 이탈 타임라인</span>
                  <span>
                    {timelineSpans.startLabel} — {timelineSpans.endLabel}
                  </span>
                </SubSectionLabel>
                <TimelineRows>
                  {timelineSpans.bars.map((bar) => (
                    <TimelineRow key={bar.key}>
                      <TimelineCountryBtn
                        type="button"
                        onClick={() => onCountryClick(bar.id)}
                        title={`${bar.name} (${bar.periodText})`}
                      >
                        {bar.name}
                      </TimelineCountryBtn>
                      <TimelineTrack title={bar.periodText}>
                        <TimelineBarFill
                          $color={bar.color}
                          style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%` }}
                        />
                      </TimelineTrack>
                      <TimelinePeriodText>{bar.periodText}</TimelinePeriodText>
                    </TimelineRow>
                  ))}
                  {timelineSpans.hiddenCount > 0 && (
                    <TimelineMore>외 {timelineSpans.hiddenCount}개국 — 참여 목록에서 모두 봅니다</TimelineMore>
                  )}
                </TimelineRows>
              </TimelineMiniBox>
            )}
          </StripBody>
        </StripColumn>
      )}

      {showRoleLine && (
        <RoleLine>
          <RoleLineLabel>
            당사국 역할
            <span>{countryRows.length}개국</span>
          </RoleLineLabel>
          <RoleLineBar>
            <StackedSegmentBar slices={roleSlices} height={6} />
          </RoleLineBar>
        </RoleLine>
      )}
    </InfographicStrip>
  )
}

/* ─── Flat Hairline Infographic Strip Styles (Zero Card-in-Card) ─── */

const InfographicStrip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

/* 당사국 역할 — 라벨 한 칸 + 막대(범례는 막대 밑). 좁으면 라벨이 위로 올라간다 */
const RoleLine = styled.div`
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: start;
  gap: 6px 16px;

  @container eventdetail (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const RoleLineLabel = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding-top: 1px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;

  span {
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }
`

const RoleLineBar = styled.div`
  min-width: 0;
  padding-top: 5px;
`

const StripColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const StripHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
`

const StripTitleRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
`

const StripTitle = styled.h3`
  margin: 0;
  font-size: 12.5px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const MetricTag = styled.span<{ $accent?: boolean }>`
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $accent }) =>
    $accent ? ledgerAccentSubtle(theme.mode) : ledgerSubtleFill(theme.mode)};
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  font-size: 10.5px;
  font-weight: 700;
`

const MetricsLink = styled.button`
  margin-left: auto;
  padding: 2px 4px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 12px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const TugNote = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TimelineMore = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StripBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const SubSectionLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

/* ─── Borderless Flat SVG Bezier Mind-Map Stage ─── */

/* ─── Duel / Confrontation Infographic (Flat Typographic Links) ─── */

const DuelWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const DuelHeaderRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
`

const DuelSideSummary = styled.div<{ $alignRight?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $alignRight }) => ($alignRight ? 'flex-end' : 'flex-start')};
  gap: 2px;
  min-width: 0;
  text-align: ${({ $alignRight }) => ($alignRight ? 'right' : 'left')};
`

const DuelSideTitle = styled.div<{ $alignRight?: boolean }>`
  display: inline-flex;
  align-items: center;
  flex-direction: ${({ $alignRight }) => ($alignRight ? 'row-reverse' : 'row')};
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};

  strong {
    font-weight: 750;
  }
`

const ColorDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2.5px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const OutcomeBadge = styled.span`
  padding: 1px 6px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DuelSideMetrics = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const ForceNumber = styled.strong`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DuelTugTrack = styled.div`
  display: flex;
  gap: 3px;
  width: 100%;
  height: 8px;
  border-radius: ${RADIUS.PILL};
  overflow: hidden;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const DuelTugBar = styled.div<{ $color: string }>`
  flex: 1 1 0;
  min-width: 8px;
  background: ${({ $color }) => $color};
`

const DuelFlagsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
`

const DuelFlagCluster = styled.div<{ $alignRight?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  justify-content: ${({ $alignRight }) => ($alignRight ? 'flex-end' : 'flex-start')};
  gap: 2px 8px;
`

const InlineCountryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
  max-width: 100%;

  span {
    font-size: 12px;
    flex-shrink: 0;
  }

  em {
    font-style: normal;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover em {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const MoreCountTag = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const MultiSideList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const MultiSideRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const MultiSideHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const MultiSideBarTrack = styled.div`
  height: 6px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const MultiSideBarFill = styled.div<{ $color: string }>`
  height: 100%;
  border-radius: ${RADIUS.PILL};
  background: ${({ $color }) => $color};
`

const TimelineMiniBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const TimelineRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const TimelineRow = styled.div`
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  font-size: 11px;
`

const TimelineCountryBtn = styled.button`
  padding: 0;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-weight: 650;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const TimelineTrack = styled.div`
  position: relative;
  height: 5px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const TimelineBarFill = styled.div<{ $color: string }>`
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: ${RADIUS.PILL};
  background: ${({ $color }) => $color};
`

const TimelinePeriodText = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 10.5px;
  white-space: nowrap;
  ${DIGIT_DISPLAY}
`
