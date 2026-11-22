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
 * 축 색은 그 행정부가 걸친 군주 재위(범례와 같은 색)다 — 지그재그의 재위 띠를 축이 이어받는다.
 */
import React from 'react'

import { FiAward, FiEdit2, FiUser } from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'

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
  /** 군주 재위 범례 색 — 축 */
  monarchLineHex: string | null
  monarchId: string | null
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
  onSelect,
  onEdit,
}: {
  rows: CabinetVerticalTimelineRow[]
  onSelect: (cabinetId: string) => void
  onEdit: (cabinetId: string, clickEvent: React.MouseEvent) => void
}) {
  const maxDays = Math.max(1, ...rows.map((row) => row.durationDays ?? 0))
  const centuries = new Set(
    rows.map((row) => (row.startSignedYear != null ? centuryLabel(row.startSignedYear) : '')),
  )
  /* 몇 줄 안 되면(독일 2개) 세기 머리가 줄마다 끼어 오히려 소음 — 6줄 이상일 때만 */
  const showCenturyHeads = centuries.size > 1 && rows.length >= 6

  let prevCentury: string | null = null
  return (
    <TimelineList aria-label="역대 행정부 연표">
      {rows.map((row, rowIdx) => {
        const prevRow = rowIdx > 0 ? rows[rowIdx - 1] : null
        const century = row.startSignedYear != null ? centuryLabel(row.startSignedYear) : ''
        const centuryHead = showCenturyHeads && century && century !== prevCentury ? century : null
        prevCentury = century || prevCentury
        /* 같은 사람이 잇달아 맡으면(이토 1·2·3차) 사진을 줄여 반복을 누그러뜨린다 */
        const isRepeatPerson = Boolean(row.personId && prevRow?.personId === row.personId)
        /* 축: 노드 아래는 이 줄의 군주 색, 노드 위는 윗줄 색을 이어받아 줄 경계에서 끊기지 않게 */
        const axisColor = row.monarchLineHex
        const axisTopColor = prevRow?.monarchLineHex ?? null
        const barPct =
          row.durationDays != null ? Math.max(2, Math.round((row.durationDays / maxDays) * 100)) : 0
        return (
          <React.Fragment key={row.id}>
            {centuryHead ? (
              <CenturyHead aria-hidden>
                <span>{centuryHead}</span>
              </CenturyHead>
            ) : null}
            <TimelineRow>
              <YearCol>
                <span className="year">{row.startYearLabel ?? '—'}</span>
                {row.termLabel ? <span className="term">{row.termLabel}</span> : null}
              </YearCol>
              <AxisCol
                aria-hidden
                $color={axisColor}
                $topColor={axisTopColor}
                $first={rowIdx === 0}
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
                  <Avatar $ring={row.ringColor} $small={isRepeatPerson}>
                    {row.thumbUrl ? <img src={row.thumbUrl} alt="" /> : <FiUser aria-hidden />}
                  </Avatar>
                  <TextStack>
                    <NameLine>
                      <strong>{row.personName}</strong>
                      <span className="pos">{row.posTitle}</span>
                      {isRepeatPerson ? <span className="again">연임</span> : null}
                    </NameLine>
                    {row.cabinetName || row.territoryLabel ? (
                      <SubLine>
                        {[row.cabinetName, row.territoryLabel].filter(Boolean).join(' · ')}
                      </SubLine>
                    ) : null}
                    <MetaLine>
                      <span className="range">{row.range}</span>
                      {row.durationLabel ? <span>{row.durationLabel}</span> : null}
                      {row.ageAtStart != null ? <span>취임 {row.ageAtStart}세</span> : null}
                      {row.achievementCount > 0 ? (
                        <span className="award">
                          <FiAward aria-hidden size={11} />
                          업적 {row.achievementCount}
                        </span>
                      ) : null}
                      {row.isCurrent ? <span className="current">현직</span> : null}
                    </MetaLine>
                    {row.reignEraLine ? (
                      <EraLine>
                        {row.monarchLineHex ? (
                          <span className="dot" style={{ background: row.monarchLineHex }} />
                        ) : null}
                        {row.reignEraLine}
                      </EraLine>
                    ) : null}
                    {barPct > 0 ? (
                      <DurationTrack title={row.durationLabel ?? undefined}>
                        <span
                          style={{
                            width: `${barPct}%`,
                            background: row.ringColor ?? undefined,
                          }}
                        />
                      </DurationTrack>
                    ) : null}
                  </TextStack>
                </MainBtn>
                <EditBtn
                  type="button"
                  aria-label={`${row.personName} 행정부 빠른 수정`}
                  title="행정부 빠른 수정"
                  onClick={(clickEvent) => onEdit(row.id, clickEvent)}
                >
                  <FiEdit2 size={12} aria-hidden />
                </EditBtn>
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

const TimelineList = styled.ol`
  container-type: inline-size;
  list-style: none;
  margin: 0;
  padding: 4px 0 8px;
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
  &:first-child {
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
  $color: string | null
  $topColor: string | null
  $first: boolean
  $last: boolean
}>`
  position: relative;

  /* 위 이음(첫 줄은 노드부터) */
  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: ${({ $first }) => ($first ? `${NODE_TOP_PX}px` : '0')};
    height: ${({ $first }) => ($first ? '0' : `${NODE_TOP_PX}px`)};
    width: 3px;
    margin-left: -1.5px;
    background: ${({ theme, $topColor }) => $topColor ?? ledgerHairlineStrong(theme.mode)};
    opacity: ${({ $topColor }) => ($topColor ? 0.75 : 1)};
  }
  /* 아래 이음 — 이 줄이 걸친 군주 재위 색 */
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: ${NODE_TOP_PX}px;
    bottom: ${({ $last }) => ($last ? 'auto' : '0')};
    height: ${({ $last }) => ($last ? '0' : 'auto')};
    width: 3px;
    margin-left: -1.5px;
    background: ${({ theme, $color }) => $color ?? ledgerHairlineStrong(theme.mode)};
    opacity: ${({ $color }) => ($color ? 0.75 : 1)};
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

  &:hover > button:last-child,
  &:focus-within > button:last-child {
    opacity: 1;
  }
`

const MainBtn = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 8px 40px 10px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.14s ease;

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
`

const Avatar = styled.span<{ $ring: string | null; $small: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $small }) => ($small ? 30 : 44)}px;
  height: ${({ $small }) => ($small ? 30 : 44)}px;
  margin: ${({ $small }) => ($small ? '3px 7px 0' : '0')};
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 0 2px ${({ theme, $ring }) => $ring ?? ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#eef0f4')};
  color: ${({ theme }) => theme.colors.text.tertiary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    width: 45%;
    height: 45%;
  }
`

const TextStack = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
`

const NameLine = styled.span`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 2px 8px;

  strong {
    font-size: 15px;
    font-weight: 700;
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
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SubLine = styled.span`
  font-size: 12.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  word-break: keep-all;
`

const MetaLine = styled.span`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

  > span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  > span + span::before {
    content: '·';
    margin: 0 7px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .range {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .current {
    font-weight: 700;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const EraLine = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  word-break: keep-all;

  .dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
`

const DurationTrack = styled.span`
  display: block;
  width: 100%;
  max-width: 260px;
  height: 4px;
  margin-top: 4px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const EditBtn = styled.button`
  position: absolute;
  top: 8px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
`
