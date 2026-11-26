/**
 * 국가 상세 → 정부·행정 → 행정부·내각 「연표」 보기 — 한 줄에 행정부 하나씩 내려가는 세로 연표.
 *
 *   1885  ●  (사진) 이토 히로부미  내각총리대신
 *   제1대 │       1차 이토 내각 · 일본 제국
 *         │       1885.12.22 – 1888.04.30 · 2년 4개월 · 취임 44세
 *         │       ▬▬▬▬▬▬ (재임 길이)
 *
 * 예전 지그재그(한 줄 4칸 고정 + 사진 212px)는 1440px에서 글자 칸이 20px만 남아 이름이 사라졌고, 큰 연도가
 * 축 반대편 — 이웃 카드 옆 — 에 붙어 남의 연도로 읽혔다. 재임이 1년이든 20년이든 같은 칸이라 연표인데 기간이
 * 안 보였다. 여기서는 연도를 자기 줄 왼쪽에 두고, 이름을 가장 크게, 재임 길이는 막대로 그린다.
 * 축은 중립 회색이다 — 예전엔 군주 재위 색이었으나 팔레트가 거의 같은 주황이라 메이지·쇼와가 구분되지 않았다.
 * 군주 교체·정치체 전환·기록 공백은 행 사이 표지(MarkerRow)가 글자로 말하고, 공백 구간 축은 점선이 된다.
 *
 * 폭에 따라 세 꼴:
 *   - 넓은 칸(≥830px): 한 행이 넷째 칸까지 가로로 펼쳐진 표 — 수반·내각 | 재임 기간(막대가 칸 폭을 다 씀) |
 *     취임 → 퇴임 · 정당 · 나이 · 업적. 맨 위에 옅은 열 머리. 예전엔 본문 칸을 440px로 묶어 1440px 화면에서
 *     오른쪽 3분의 1이 비었고, 정보가 세로로 쌓여 한 행이 80px였다.
 *   - 중간(760~830px): 본문 둘째 칸에 이름·기간, 셋째 칸에 취임·퇴임·정당.
 *   - 좁은 칸: 모두 한 칸에 위아래로.
 * 목록에는 수정 단추를 두지 않는다 — 행을 누르면 상세, 수정은 상세에서.
 */
import React from 'react'

import { FiAward, FiFlag } from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'

import type { CabinetListMarker } from './cabinets-section.helpers'

export interface CabinetVerticalTimelineRow {
  id: string
  personId: string | null
  personName: string
  posTitle: string
  /** '제1대' · '제3대 2기' */
  termLabel: string | null
  cabinetName: string | null
  territoryLabel: string | null
  /** 취임일이 걸친 군주 재위 연호 한 줄 */
  reignEraLine: string | null
  thumbUrl: string | null
  /** 소속(국가·정체) 구분 색 — 사진 링·재임 막대 */
  ringColor: string | null
  /** 이 행 앞에 끼울 표지(정치체 전환 · 군주 교체 · 기록 공백) */
  markers?: CabinetListMarker[]
  /** 취임 방식 → 퇴임 사유 라벨 */
  transition: { appointment: string | null; endReason: string | null } | null
  partyLabel: string | null
  partyColor: string | null
  /** 부호 있는 취임 연도(BC 음수) — 세기 묶음 */
  startSignedYear: number | null
  startYearLabel: string | null
  range: string
  durationLabel: string | null
  durationDays: number | null
  ageAtStart: number | null
  achievementCount: number
  isCurrent: boolean
  isDeleting: boolean
  ariaLabel: string
}

/** 두 날짜(부호 있는 ISO) 사이 대략 일수 — 막대·'N년 M개월'용(윤년 무시) */
export function approxDaysBetween(
  start: { signedYear: number; month: number; day: number },
  end: { signedYear: number; month: number; day: number },
): number {
  /* 서기 1년 바로 앞이 BC 1년 — 0년이 없으니 BC 쪽은 한 해 당긴다 */
  const toLinear = (parts: { signedYear: number; month: number; day: number }) =>
    (parts.signedYear < 0 ? parts.signedYear + 1 : parts.signedYear) * 365.25 +
    (parts.month - 1) * 30.44 +
    (parts.day - 1)
  return Math.max(0, Math.round(toLinear(end) - toLinear(start)))
}

export function formatTenureDuration(days: number): string {
  if (days < 31) return `${Math.max(1, days)}일`
  const totalMonths = Math.round(days / 30.44)
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0) return `${months}개월`
  return months === 0 ? `${years}년` : `${years}년 ${months}개월`
}

function centuryLabel(signedYear: number): string {
  if (signedYear < 0) return `BC ${Math.floor((Math.abs(signedYear) - 1) / 100) + 1}세기`
  return `${Math.floor((signedYear - 1) / 100) + 1}세기`
}

export function CabinetsVerticalTimeline({
  rows,
  hidePosTitle = false,
  onSelect,
}: {
  rows: CabinetVerticalTimelineRow[]
  /** 목록 전체가 같은 직함이라 요약 줄에 한 번 쓴 경우 — 행마다 직함을 빼낸다 */
  hidePosTitle?: boolean
  onSelect: (cabinetId: string) => void
}) {
  const maxDays = Math.max(1, ...rows.map((row) => row.durationDays ?? 0))
  const longestLabel = maxDays > 1 ? formatTenureDuration(maxDays) : null
  const centuries = new Set(
    rows.map((row) => (row.startSignedYear != null ? centuryLabel(row.startSignedYear) : '')),
  )
  /* 몇 줄 안 되면(독일 2개) 세기 머리가 줄마다 끼어 오히려 소음 — 6줄 이상일 때만 */
  const showCenturyHeads = centuries.size > 1 && rows.length >= 6

  /**
   * 같은 사람이 잇달아 맡은 행(요시다 3·4·5차)은 한 묶음 — 첫 행만 사진·이름, 다음 행들은 사진 자리에 가는
   * 안내선과 '내각 이름 + 연임'만. 예전엔 같은 사진·이름이 네 번 반복됐다. 표지(정치체·군주·공백)나 세기 머리가
   * 끼면 묶음을 끊는다 — 머리 바로 아래 사진 없는 행이 오면 누구 행인지 안 보인다.
   */
  const rowCentury = (row: CabinetVerticalTimelineRow) =>
    row.startSignedYear != null ? centuryLabel(row.startSignedYear) : ''
  const continuesPrevious = (rowIndex: number): boolean => {
    if (rowIndex <= 0 || rowIndex >= rows.length) return false
    const row = rows[rowIndex]
    const prevRow = rows[rowIndex - 1]
    if (!row.personId || row.personId !== prevRow.personId) return false
    if ((row.markers ?? []).length > 0) return false
    if (showCenturyHeads && rowCentury(row) && rowCentury(row) !== rowCentury(prevRow)) return false
    return true
  }

  let prevCentury: string | null = null
  return (
    <TimelineList aria-label="역대 행정부 연표">
      {/* 넓은 칸에서만 — 가로로 펼친 넷째 칸까지 무엇인지 */}
      <ColumnHead aria-hidden>
        <span />
        <span />
        <span className="cells">
          <span />
          <span>{hidePosTitle ? '수반 · 내각' : '수반 · 직함 · 내각'}</span>
          <span>재임 기간{longestLabel ? <em>막대 = 최장 {longestLabel} 대비</em> : null}</span>
          <span>취임 → 퇴임 · 정당</span>
        </span>
      </ColumnHead>
      {rows.map((row, rowIdx) => {
        const prevRow = rowIdx > 0 ? rows[rowIdx - 1] : null
        const century = row.startSignedYear != null ? centuryLabel(row.startSignedYear) : ''
        const centuryHead = showCenturyHeads && century && century !== prevCentury ? century : null
        prevCentury = century || prevCentury
        /* 같은 사람이 잇달아 맡으면 묶음의 이어지는 행 — 사진·이름 대신 안내선과 내각 이름 */
        const isContinuation = continuesPrevious(rowIdx)
        const hasContinuationBelow = continuesPrevious(rowIdx + 1)
        const barPct =
          row.durationDays != null ? Math.max(2, Math.round((row.durationDays / maxDays) * 100)) : 0
        const markers = row.markers ?? []
        return (
          <React.Fragment key={row.id}>
            {centuryHead ? (
              <CenturyHead aria-hidden>
                <span>{centuryHead}</span>
              </CenturyHead>
            ) : null}
            {markers.map((marker) => (
              <MarkerRow key={marker.key} $kind={marker.kind}>
                <span aria-hidden />
                <AxisCol
                  aria-hidden
                  $dashed={marker.kind === 'gap'}
                  $first={rowIdx === 0}
                  $last={false}
                  $bare
                />
                {marker.kind === 'gap' ? (
                  <span className="marker-text">
                    <strong>{marker.label}</strong>
                    {marker.detail ? <span className="detail">{marker.detail}</span> : null}
                  </span>
                ) : marker.kind === 'polity' ? (
                  <span className="marker-text">
                    <FiFlag aria-hidden size={12} />
                    <strong>{marker.label}</strong>
                    {marker.reignLabel ? (
                      <span className="reign-inline">
                        <span className="detail">군주</span>
                        {marker.reignLabel}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="marker-text">
                    <span className="detail">군주</span>
                    <strong>{marker.label}</strong>
                  </span>
                )}
              </MarkerRow>
            ))}
            <TimelineRow>
              <YearCol>
                <span className="year">{row.startYearLabel ?? '—'}</span>
                {row.termLabel ? <span className="term">{row.termLabel}</span> : null}
              </YearCol>
              <AxisCol
                aria-hidden
                $first={rowIdx === 0 && markers.length === 0}
                $last={rowIdx === rows.length - 1}
              >
                <AxisNode $ring={row.ringColor} $current={row.isCurrent} />
              </AxisCol>
              <Body>
                <MainBtn
                  type="button"
                  disabled={row.isDeleting}
                  aria-label={row.ariaLabel}
                  onClick={() => onSelect(row.id)}
                >
                  <AvatarCell
                    aria-hidden
                    $continuation={isContinuation}
                    $continuesBelow={hasContinuationBelow}
                  >
                    {isContinuation ? (
                      <span className="guide-dot" />
                    ) : (
                      <Avatar $ring={row.ringColor}>
                        {row.thumbUrl ? (
                          <img src={row.thumbUrl} alt="" />
                        ) : (
                          <span className="initial">{row.personName.slice(0, 1) || '?'}</span>
                        )}
                      </Avatar>
                    )}
                  </AvatarCell>
                  <IdentityStack>
                    {isContinuation ? (
                      <NameLine $continuation>
                        <strong>{row.cabinetName ?? row.personName}</strong>
                        <span className="again">연임</span>
                      </NameLine>
                    ) : (
                      <NameLine>
                        <strong>{row.personName}</strong>
                        {hidePosTitle ? null : <span className="pos">{row.posTitle}</span>}
                      </NameLine>
                    )}
                    {isContinuation ? (
                      row.territoryLabel ? <SubLine>{row.territoryLabel}</SubLine> : null
                    ) : row.cabinetName || row.territoryLabel ? (
                      <SubLine>
                        {[row.cabinetName, row.territoryLabel].filter(Boolean).join(' · ')}
                      </SubLine>
                    ) : null}
                    {row.reignEraLine ? <EraLine>{row.reignEraLine}</EraLine> : null}
                  </IdentityStack>
                  <PeriodStack>
                    <span className="range">{row.range}</span>
                    {row.durationLabel ? (
                      <span className="duration">
                        <span className="duration-text">{row.durationLabel}</span>
                        {barPct > 0 ? (
                          <DurationTrack
                            aria-hidden
                            title={
                              longestLabel
                                ? `재임 ${row.durationLabel} — 이 목록 최장(${longestLabel}) 대비`
                                : undefined
                            }
                          >
                            <span
                              style={{
                                width: `${barPct}%`,
                                background: row.ringColor ?? undefined,
                              }}
                            />
                          </DurationTrack>
                        ) : null}
                      </span>
                    ) : null}
                  </PeriodStack>
                  <FactsStack>
                    {row.transition ? (
                      /* 원장과 같은 '취임 → 퇴임' 한 줄 */
                      <span
                        className="transition"
                        title={`취임 ${row.transition.appointment ?? '미상'} → 퇴임 ${row.transition.endReason ?? (row.isCurrent ? '현직' : '미상')}`}
                      >
                        {row.transition.appointment ?? '—'}
                        {row.transition.endReason ? (
                          <>
                            <span className="arrow" aria-hidden>
                              →
                            </span>
                            {row.transition.endReason}
                          </>
                        ) : null}
                      </span>
                    ) : null}
                    <span className="facts">
                      {row.partyLabel ? (
                        <span className="party" title={`정당 ${row.partyLabel}`}>
                          <span
                            className="party-dot"
                            aria-hidden
                            style={row.partyColor ? { background: row.partyColor } : undefined}
                          />
                          {row.partyLabel}
                        </span>
                      ) : null}
                      {row.ageAtStart != null ? <span>취임 {row.ageAtStart}세</span> : null}
                      {row.achievementCount > 0 ? (
                        <span className="award">
                          <FiAward aria-hidden size={11} />
                          업적 {row.achievementCount}
                        </span>
                      ) : null}
                      {row.isCurrent ? <span className="current">현직</span> : null}
                    </span>
                  </FactsStack>
                </MainBtn>
              </Body>
            </TimelineRow>
          </React.Fragment>
        )
      })}
    </TimelineList>
  )
}

const YEAR_COL_PX = 72
const AXIS_COL_PX = 22
/** 노드 세로 위치 — 이름 줄 가운데에 맞춤 */
const NODE_TOP_PX = 20
/** 이 폭(목록 칸)부터 한 행을 가로 네 칸 표로 펼친다 */
const WIDE_PX = 830
const WIDE_GAP_PX = 24
/** 넓은 칸 — 사진 · 수반·내각 · 재임 기간 · 취임→퇴임·정당. ColumnHead도 같은 값 */
const ROW_COLUMNS_WIDE =
  '44px minmax(190px, 1.05fr) minmax(220px, 1.25fr) minmax(170px, 0.9fr)'

/* 위 여백 — 첫 세기 머리('19세기')가 요약 줄('19개 행정부 · 1885–1954')에 붙어 요약의 일부로 읽혔다 */
const TimelineList = styled.ol`
  container-type: inline-size;
  list-style: none;
  margin: 0;
  padding: 14px 0 8px;
`

/* 넓은 칸에서만 보이는 열 머리 — 줄과 같은 격자(연도 · 축 · [사진 · 수반 · 기간 · 사실]) */
const ColumnHead = styled.li`
  display: none;

  @container (min-width: ${WIDE_PX}px) {
    display: grid;
    grid-template-columns: ${YEAR_COL_PX}px ${AXIS_COL_PX}px minmax(0, 1fr);
    column-gap: 10px;
    margin: 0 0 4px;

    .cells {
      display: grid;
      grid-template-columns: ${ROW_COLUMNS_WIDE};
      column-gap: ${WIDE_GAP_PX}px;
      padding: 0 14px 6px 8px;
      border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
    em {
      margin-left: 8px;
      font-style: normal;
      font-weight: 500;
      letter-spacing: 0;
    }
  }
`

const CenturyHead = styled.li`
  display: grid;
  grid-template-columns: ${YEAR_COL_PX}px minmax(0, 1fr);
  column-gap: 12px;
  align-items: center;
  margin: 14px 0 6px;

  span {
    justify-self: end;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &::after {
    content: '';
    height: 1px;
    background: ${({ theme }) => ledgerHairline(theme.mode)};
  }
  /* 맨 앞(열 머리는 좁은 칸에서 숨으므로 그 바로 뒤도) */
  &:first-child,
  ${ColumnHead} + & {
    margin-top: 0;
  }
`

const TimelineRow = styled.li`
  display: grid;
  grid-template-columns: ${YEAR_COL_PX}px ${AXIS_COL_PX}px minmax(0, 1fr);
  column-gap: 10px;

  @container (max-width: 560px) {
    grid-template-columns: 52px 18px minmax(0, 1fr);
    column-gap: 8px;
  }
`

const YearCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-top: ${NODE_TOP_PX - 9}px;
  ${DIGIT_DISPLAY}

  .year {
    font-size: 19px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .term {
    margin-top: 3px;
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
    white-space: nowrap;
  }

  @container (max-width: 560px) {
    .year {
      font-size: 16px;
    }
  }
`

const AxisCol = styled.div<{
  $first: boolean
  $last: boolean
  /** 기록 공백 구간 — 점선 */
  $dashed?: boolean
  /** 표지 줄 — 노드 없이 줄 전체 높이를 잇는다 */
  $bare?: boolean
}>`
  position: relative;

  /* 위 이음(첫 줄은 노드부터) */
  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: ${({ $first }) => ($first ? `${NODE_TOP_PX}px` : '0')};
    height: ${({ $first, $bare }) => ($first ? '0' : $bare ? '100%' : `${NODE_TOP_PX}px`)};
    width: 0;
    margin-left: -1px;
    border-left: 2px ${({ $dashed }) => ($dashed ? 'dashed' : 'solid')}
      ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
  /* 아래 이음 */
  &::after {
    content: '';
    display: ${({ $bare }) => ($bare ? 'none' : 'block')};
    position: absolute;
    left: 50%;
    top: ${NODE_TOP_PX}px;
    bottom: ${({ $last }) => ($last ? 'auto' : '0')};
    height: ${({ $last }) => ($last ? '0' : 'auto')};
    width: 0;
    margin-left: -1px;
    border-left: 2px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

/** 행 사이 표지 — 정치체 전환(굵게) · 군주 교체(옅게) · 기록 공백(점선 축 + 회색 띠) */
const MarkerRow = styled.li<{ $kind: CabinetListMarker['kind'] }>`
  display: grid;
  grid-template-columns: ${YEAR_COL_PX}px ${AXIS_COL_PX}px minmax(0, 1fr);
  column-gap: 10px;
  min-height: ${({ $kind }) => ($kind === 'gap' ? 44 : 30)}px;

  .marker-text {
    align-self: center;
    display: inline-flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 8px;
    width: fit-content;
    max-width: 100%;
    margin-left: 8px;
    font-size: ${({ $kind }) => ($kind === 'polity' ? 13 : 12)}px;
    line-height: 1.4;
    word-break: keep-all;
    color: ${({ theme, $kind }) =>
      $kind === 'polity' ? theme.colors.text.primary : theme.colors.text.secondary};
    ${({ $kind, theme }) =>
      $kind === 'gap'
        ? `
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px dashed ${ledgerHairlineStrong(theme.mode)};
      background: ${ledgerHoverFill(theme.mode)};
    `
        : ''}
  }
  .reign-inline {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    margin-left: 4px;
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .reign-inline::before {
    content: '·';
    margin-right: 4px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .marker-text strong {
    font-weight: ${({ $kind }) => ($kind === 'reign' ? 600 : 700)};
  }
  .marker-text svg {
    align-self: center;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  .detail {
    ${DIGIT_DISPLAY}
    font-size: 11.5px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  @container (max-width: 560px) {
    grid-template-columns: 52px 18px minmax(0, 1fr);
    column-gap: 8px;
  }
`

const AxisNode = styled.span<{ $ring: string | null; $current: boolean }>`
  position: absolute;
  z-index: 1;
  left: 50%;
  top: ${NODE_TOP_PX}px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid ${({ theme, $ring }) => $ring ?? ledgerAccent(theme.mode)};
  background: ${({ theme, $ring, $current }) =>
    $current ? ($ring ?? ledgerAccent(theme.mode)) : theme.colors.background.primary};
`

const Body = styled.div`
  position: relative;
  min-width: 0;
  padding-bottom: 6px;
`

/*
 * 행 단추 = 네 칸 격자(사진 · 수반 · 기간 · 사실). 칸 배치는 폭에 따라 바뀐다 — 맨 위 머리 주석 참고.
 * 열 폭은 ColumnHead와 같은 값(ROW_COLUMNS_WIDE)을 써야 머리와 줄이 맞는다.
 */
const MainBtn = styled.button`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: start;
  column-gap: 12px;
  row-gap: 4px;
  width: 100%;
  padding: 8px 12px 10px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.14s ease;

  > :first-child {
    grid-row: 1 / span 3;
  }
  > :not(:first-child) {
    grid-column: 2;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: progress;
  }

  @container (min-width: 760px) {
    grid-template-columns: 44px minmax(0, 1fr) minmax(180px, 0.55fr);
    column-gap: 20px;

    > :first-child {
      grid-row: 1 / span 2;
    }
    > :nth-child(4) {
      grid-column: 3;
      grid-row: 1 / span 2;
    }
  }

  @container (min-width: ${WIDE_PX}px) {
    grid-template-columns: ${ROW_COLUMNS_WIDE};
    align-items: center;
    column-gap: ${WIDE_GAP_PX}px;
    padding: 8px 14px 8px 8px;

    > :first-child {
      grid-row: 1;
    }
    > :nth-child(2) {
      grid-column: 2;
      grid-row: 1;
    }
    > :nth-child(3) {
      grid-column: 3;
      grid-row: 1;
    }
    > :nth-child(4) {
      grid-column: 4;
      grid-row: 1;
    }
  }
`

/** 취임 → 퇴임 · 정당 · 나이 · 업적 — 좁으면 본문 아래, 중간이면 오른쪽 칸(왼쪽 가는 선), 넓으면 넷째 칸 */
const FactsStack = styled.span`
  /* 좁은 칸은 '임명 → 사임 · 취임 44세'를 한 줄로 — 위아래로 쌓으면 폰에서 행이 한 줄 더 길어졌다 */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 12px;
  min-width: 0;
  font-size: 12px;
  line-height: 1.45;

  .transition {
    display: inline-flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0 5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
    word-break: keep-all;
  }
  .arrow {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }
  .facts:empty {
    display: none;
  }
  .facts > span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .party {
    gap: 5px;
    min-width: 0;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  .party-dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  .current {
    font-weight: 700;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  @container (min-width: 760px) {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: flex-start;
    gap: 4px;
    padding: 2px 0 0 14px;
    border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
  @container (min-width: ${WIDE_PX}px) {
    padding: 0;
    border-left: none;
  }
`

/** 사진 칸 — 묶음이면 사진 아래로(첫 행)·위아래로(이어지는 행) 안내선을 그어 한 사람의 연속 임기를 잇는다 */
const AvatarCell = styled.span<{ $continuation: boolean; $continuesBelow: boolean }>`
  position: relative;
  align-self: stretch;
  display: flex;
  justify-content: center;
  width: 44px;
  flex-shrink: 0;

  &::after {
    content: '';
    display: ${({ $continuation, $continuesBelow }) =>
      $continuation || $continuesBelow ? 'block' : 'none'};
    position: absolute;
    left: 50%;
    width: 2px;
    margin-left: -1px;
    border-radius: 1px;
    /* MainBtn 위아래 여백(8+10)과 줄 사이 6px를 넘어 이웃 행 칸까지 닿게 */
    top: ${({ $continuation }) => ($continuation ? '-26px' : '50px')};
    bottom: ${({ $continuesBelow }) => ($continuesBelow ? '-26px' : 'calc(100% - 15px)')};
    background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }

  .guide-dot {
    position: relative;
    z-index: 1;
    width: 9px;
    height: 9px;
    margin-top: 11px;
    border-radius: 50%;
    border: 2px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    background: ${({ theme }) => theme.colors.background.primary};
  }
`

const Avatar = styled.span<{ $ring: string | null }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 0 2px ${({ theme, $ring }) => $ring ?? ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#eef0f4')};
  color: ${({ theme }) => theme.colors.text.secondary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* 사진 없을 때 — 원장 보기와 같은 첫 글자 */
  .initial {
    font-size: 16px;
    font-weight: 800;
  }
`

const IdentityStack = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const NameLine = styled.span<{ $continuation?: boolean }>`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 2px 8px;

  strong {
    font-size: ${({ $continuation }) => ($continuation ? 14 : 15)}px;
    font-weight: ${({ $continuation }) => ($continuation ? 650 : 700)};
    line-height: 1.35;
    color: ${({ theme }) => theme.colors.text.primary};
    word-break: keep-all;
  }
  .pos {
    font-size: 12.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .again {
    align-self: center;
    padding: 0 6px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    line-height: 17px;
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

const SubLine = styled.span`
  font-size: 12.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  word-break: keep-all;
`

/*
 * 재임 기간 — 날짜 한 줄 + '2년 4개월 ▬▬▬'. 넓은 칸에선 막대가 칸 폭을 다 써(최장 대비) 행끼리 길이를 견준다.
 * 구분점(·) 대신 간격으로 나눈다 — 좁은 칸에서 줄이 넘어가면 점이 줄 머리에 혼자 남았다.
 */
const PeriodStack = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 14px;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

  .range {
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .duration {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  @container (min-width: ${WIDE_PX}px) {
    flex-direction: column;
    align-items: stretch;
    gap: 3px;

    .range {
      font-size: 12.5px;
    }
    .duration {
      display: flex;
    }
    .duration-text {
      flex: 0 0 64px;
    }
  }
`

const EraLine = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  word-break: keep-all;
`

/* 재임 길이 막대(최장 재임 대비). 좁으면 글자 옆 짧은 막대, 넓은 칸에선 칸 폭을 다 쓴다. 폰 폭에선 숨긴다 */
const DurationTrack = styled.span`
  display: inline-block;
  flex-shrink: 0;
  width: 72px;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  @container (min-width: ${WIDE_PX}px) {
    flex: 1 1 auto;
    width: auto;
    height: 6px;
  }
  @container (max-width: 560px) {
    display: none;
  }
`
