/**
 * 진영 수치 그래프 — 비교표(module-metrics)의 '그래프' 보기.
 *
 * 형식:
 *  - 진영이 **둘**이면 대결형(가운데 지표 이름, 왼쪽·오른쪽으로 뻗는 막대) — 전쟁 수치의 기본 질문이 '누가 더'라서
 *    두 막대가 같은 축에서 마주 보게 한다.
 *  - 셋 이상이면 지표마다 진영 막대 묶음.
 *  - **눈금은 지표(행)마다 따로** — 병력(수십만)과 포로(수천)를 한 자로 재면 작은 쪽이 0이 된다. 두 척도를 한 축에
 *    올리지 않는다(행 = 작은 배수). 그래서 행끼리 막대 길이를 견주지 말라고 머리에 적는다.
 *  - 대결형에서 **한쪽만 값이 있는 지표**는 막대 없이 값만 아래 묶음에 — 견줄 상대 없는 막대는 행 눈금이라 늘
 *    100%로 차서 '압도적 우세'처럼 읽혔다(자유군단 진압 사건: 7줄 전부 한쪽만, 비교 0).
 *  - 아래 '손실 구성' — 사망·부상·실종·포로를 진영마다 한 막대로 쌓아 **같은 자로**(부분과 전체).
 *  - 아래 '나라별 몫' — 진영 값을 나라가 얼마씩 냈는지, 진영 색 한 가지로 큰 나라부터.
 *
 * 색은 진영 색(진영을 따라간다, 순위를 따라가지 않는다). 글자는 글자 토큰 — 값·이름에 진영 색을 입히지 않는다.
 * 출처 미검증 값은 막대를 흐리게(검증된 값과 섞였을 때만 — 전부 미검증이면 흐림이 아무것도 가르지 않는다).
 * 범위 값은 막대 끝에 수염, '~이상'은 끝이 흐려진다. 값이 여럿인데 대표가 없는 칸은 옅은 띠 + 값마다 눈금.
 * 막대를 누르면 그 값을 고친다(터치는 첫 탭에 설명, 두 번째 탭에 고치기).
 */
import { type FocusEvent, type MouseEvent, type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react'

import { FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import { ESTIMATE_ROLE_LABEL } from '@/entities/evidence/lib/evidence-labels'
import {
  formatObservationExact,
  formatObservationValue,
  isUnverified,
  observationExtent,
  unverifiedLabel,
} from '@/entities/evidence/lib/format-observation'
import { glassCardMixin } from '@/shared/styles/mixins'
import {
  ledgerAccent,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'
import { type Observation } from '@/shared/api/evidence'
import { metaText } from '@/pages/events/styles/theme'

import { subjectParticle } from './side-metrics-commentary.lib'
import {
  formatRate,
  LOSS_COMPONENTS,
  type LossComposition,
  lossCompositions,
  lossRate,
  memberSum,
  representativeOf,
  type MemberEntry,
} from './side-metrics.lib'

export interface ChartSide {
  id: string
  name: string
  color: string
}

export interface ChartRow {
  key: string
  name: string
  cells: Map<string, Observation[]>
}

interface SideMetricsChartProps {
  rows: ReadonlyArray<ChartRow>
  sides: ReadonlyArray<ChartSide>
  memberCells: Map<string, Map<string, MemberEntry<Observation>[]>>
  unitCells?: Map<string, Map<string, MemberEntry<Observation>[]>>
  onEdit: (observation: Observation) => void
  onAdd: (sideId: string, metricKey: string) => void
  /** 값이 여럿인 칸을 누르면 — 표 보기로(어느 값을 고칠지 표에서 고른다) */
  onShowTable?: () => void
  sourceLabel: (observation: Observation) => string
}

/** 병력·참여 인원을 한 줄로 합친 행의 키 — 한 진영은 병력만, 다른 진영은 참여 인원만 있을 때 */
const PAIRED_SIZE_KEY = 'size:paired'

/**
 * 한 진영·한 지표의 그릴 값.
 *  - value: 대표값(값 하나, 또는 채택 하나)
 *  - multiple: 값이 여럿인데 대표가 없음 — 예전엔 '+ 값'(빈칸)으로 그렸다(1차 아편전쟁 영국 측 손실 합계 520 · 1천~2천)
 *  - derived: 진영 값이 없어 나라 몫 또는 산하 부대 몫을 더한 계산 값
 *  - empty: 아무 값 없음 → '+ 값'
 */
type DatumKind = 'value' | 'multiple' | 'derived' | 'empty'

interface BarDatum {
  key: string
  side: ChartSide
  kind: DatumKind
  metricKey: string
  derivedSource: 'country' | 'unit' | null
  observation: Observation | null
  /** multiple일 때 그 칸의 값들 */
  candidates: Observation[]
  center: number | null
  low: number | null
  high: number | null
  openEnded: boolean
  unverified: boolean
  label: string
}

/** 계산한 합을 같은 표기로('약 63.7만명') — 원래 값의 지표·통화를 빌린다 */
function sumLabel(base: Observation, value: number): string {
  return formatObservationValue({ ...base, value: String(Math.round(value)), low: null, high: null, atLeast: false })
}

/** 값 여럿의 폭 표기 — '520~2,000명' */
function spanLabel(base: Observation, low: number, high: number): string {
  if (Math.round(low) === Math.round(high)) return sumLabel(base, low)
  return formatObservationValue({
    ...base,
    value: null,
    low: String(Math.round(low)),
    high: String(Math.round(high)),
    atLeast: false,
  })
}

const NOTE_LIMIT = 90
const clipNote = (note: string) => (note.length > NOTE_LIMIT ? `${note.slice(0, NOTE_LIMIT)}…` : note)

function datumOf(
  row: ChartRow,
  side: ChartSide,
  memberCells: SideMetricsChartProps['memberCells'],
  unitCells?: SideMetricsChartProps['unitCells'],
): BarDatum {
  const key = `${row.key}:${side.id}`
  const base = {
    key,
    side,
    metricKey: row.key,
    derivedSource: null as 'country' | 'unit' | null,
    candidates: [] as Observation[],
    openEnded: false,
  }
  const list = row.cells.get(side.id) ?? []
  const representative = representativeOf(list)
  const extent = representative ? observationExtent(representative) : null
  if (representative && extent) {
    return {
      ...base,
      kind: 'value',
      metricKey: representative.metric.key,
      observation: representative,
      center: extent.center,
      low: extent.low,
      high: extent.high,
      openEnded: extent.openEnded,
      unverified: isUnverified(representative),
      label: formatObservationValue(representative),
    }
  }
  if (list.length > 1) {
    const extents = list
      .map((observation) => observationExtent(observation))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    if (extents.length > 0) {
      const low = Math.min(...extents.map((entry) => entry.low))
      const high = Math.max(...extents.map((entry) => entry.high))
      return {
        ...base,
        kind: 'multiple',
        observation: null,
        candidates: list,
        center: null,
        low,
        high,
        unverified: list.every(isUnverified),
        label: `값 ${list.length}개 · ${spanLabel(list[0], low, high)}`,
      }
    }
  }
  const members = memberCells.get(row.key)?.get(side.id) ?? []
  const sum = memberSum(members)
  if (sum !== null && members[0]) {
    return {
      ...base,
      kind: 'derived',
      metricKey: members[0].observation.metric.key,
      derivedSource: 'country',
      observation: null,
      center: sum,
      low: sum,
      high: sum,
      unverified: members.every((member) => isUnverified(member.observation)),
      label: sumLabel(members[0].observation, sum),
    }
  }
  const units = unitCells?.get(row.key)?.get(side.id) ?? []
  const unitTotal = memberSum(units)
  if (unitTotal !== null && units[0]) {
    return {
      ...base,
      kind: 'derived',
      metricKey: units[0].observation.metric.key,
      derivedSource: 'unit',
      observation: null,
      center: unitTotal,
      low: unitTotal,
      high: unitTotal,
      unverified: units.every((unitItem) => isUnverified(unitItem.observation)),
      label: sumLabel(units[0].observation, unitTotal),
    }
  }
  return { ...base, kind: 'empty', observation: null, center: null, low: null, high: null, unverified: false, label: '' }
}

/**
 * 진영 둘 중 한쪽은 병력만, 다른 쪽은 참여 인원만 있으면 한 줄로 — 봉기 진압처럼 한편은 정규군, 다른 편은
 * 군중일 때 '얼마나 모였나'를 마주 세운다(손실률도 병력이 없으면 참여 인원으로 잰다 — lossRate와 같은 규칙).
 */
function pairSizeRows(
  rows: ReadonlyArray<ChartRow>,
  sides: ReadonlyArray<ChartSide>,
  memberCells: SideMetricsChartProps['memberCells'],
  unitCells?: SideMetricsChartProps['unitCells'],
): ChartRow[] {
  const personnel = rows.find((row) => row.key === 'military.personnel')
  const participants = rows.find((row) => row.key === 'society.participants')
  if (sides.length !== 2 || !personnel || !participants) return [...rows]
  const has = (row: ChartRow, sideId: string) =>
    (row.cells.get(sideId)?.length ?? 0) > 0 ||
    (memberCells.get(row.key)?.get(sideId)?.length ?? 0) > 0 ||
    (unitCells?.get(row.key)?.get(sideId)?.length ?? 0) > 0
  if (!sides.every((side) => has(personnel, side.id) !== has(participants, side.id))) return [...rows]
  const merged: ChartRow = {
    key: PAIRED_SIZE_KEY,
    name: `${personnel.name} · ${participants.name}`,
    cells: new Map(
      sides.map((side) => [side.id, (has(personnel, side.id) ? personnel : participants).cells.get(side.id) ?? []]),
    ),
  }
  return rows.flatMap((row) => (row === personnel ? [merged] : row === participants ? [] : [row]))
}

function isComparableDatum(datum: BarDatum): datum is BarDatum & { center: number } {
  return (
    (datum.kind === 'value' || datum.kind === 'derived') &&
    !datum.openEnded &&
    datum.center !== null &&
    datum.center > 0
  )
}

/** 배수 — 두 값이 다 비교 가능할 때만('~이상'·값 여럿이면 내지 않는다) */
function ratioOf(left: BarDatum, right: BarDatum): { ratio: number; larger: BarDatum; direction: 'start' | 'end' } | null {
  if (!isComparableDatum(left) || !isComparableDatum(right)) return null
  const leftCenter = left.center
  const rightCenter = right.center
  const ratio = Math.max(leftCenter, rightCenter) / Math.min(leftCenter, rightCenter)
  if (ratio < 1.05) return null
  return leftCenter >= rightCenter
    ? { ratio, larger: left, direction: 'start' }
    : { ratio, larger: right, direction: 'end' }
}

/** 양쪽 점유 비('57 : 43') — 두 값이 모두 비교 가능할 때만 */
function shareSplitOf(left: BarDatum, right: BarDatum): { leftPct: number; rightPct: number } | null {
  if (!isComparableDatum(left) || !isComparableDatum(right)) return null
  const total = left.center + right.center
  if (total <= 0) return null
  const leftPct = Math.max(1, Math.min(99, Math.round((left.center / total) * 100)))
  return { leftPct, rightPct: 100 - leftPct }
}

const formatRatio = (ratio: number) => (ratio >= 10 ? String(Math.round(ratio)) : ratio.toFixed(1))

/** 손실 구성 몫의 짙기·결 — 진영 정체는 색으로, 네 몫(사망·부상·실종·포로)은 짙기와 미세 패턴으로 가른다 */
const PART_OPACITY: Record<(typeof LOSS_COMPONENTS)[number]['key'], number> = {
  deaths: 0.95,
  wounded: 0.72,
  missing: 0.56,
  captured: 0.38,
}

const PART_PATTERN: Record<(typeof LOSS_COMPONENTS)[number]['key'], string | undefined> = {
  deaths: undefined,
  wounded: undefined,
  missing:
    'repeating-linear-gradient(135deg, rgba(255,255,255,0.38) 0 2px, transparent 2px 5px)',
  captured:
    'repeating-linear-gradient(45deg, rgba(255,255,255,0.42) 0 2px, transparent 2px 5px)',
}

interface TooltipState {
  key: string
  posX: number
  posY: number
  title: string
  lines: string[]
}

function buildBreakdownBlocks(
  rows: ReadonlyArray<ChartRow>,
  sides: ReadonlyArray<ChartSide>,
  cellsMap: Map<string, Map<string, MemberEntry<Observation>[]>> | undefined,
) {
  if (!cellsMap) return []
  return rows.flatMap((row) =>
    sides.flatMap((side) => {
      const members = cellsMap.get(row.key)?.get(side.id) ?? []
      const perMember = new Map<string, MemberEntry<Observation>[]>()
      for (const member of members) {
        perMember.set(member.name, [...(perMember.get(member.name) ?? []), member])
      }
      const entries = [...perMember.entries()]
        .map(([name, list]) => {
          const picked = representativeOf(list.map((member) => member.observation))
          const extent = picked ? observationExtent(picked) : null
          return picked && extent ? { name, observation: picked, center: extent.center } : null
        })
        .filter((entry): entry is { name: string; observation: Observation; center: number } => Boolean(entry))
        .sort((left, right) => right.center - left.center)
      return entries.length >= 2 ? [{ row, side, entries }] : []
    }),
  )
}

export function SideMetricsChart({
  rows,
  sides,
  memberCells,
  unitCells,
  onEdit,
  onAdd,
  onShowTable,
  sourceLabel,
}: SideMetricsChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  /** 마지막 입력 방식 — 터치는 첫 탭에 설명을 띄우고 두 번째 탭에 고친다(마우스는 hover가 설명) */
  const inputRef = useRef<'mouse' | 'touch' | 'keyboard'>('mouse')
  const butterfly = sides.length === 2

  /* 열린 설명은 바깥(다른 막대 포함)을 누르면 닫는다 — 터치엔 mouseleave가 없다 */
  useEffect(() => {
    if (!tooltip) return
    const close = (event: globalThis.PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('[data-bar-key]')?.getAttribute('data-bar-key') === tooltip.key) return
      setTooltip(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [tooltip])

  const displayRows = butterfly ? pairSizeRows(rows, sides, memberCells, unitCells) : [...rows]
  const resolveRowDatum = (row: ChartRow, side: ChartSide) => {
    if (row.key === PAIRED_SIZE_KEY) {
      const personnelRow = rows.find((candidate) => candidate.key === 'military.personnel')
      const participantRow = rows.find((candidate) => candidate.key === 'society.participants')
      const personnelDatum = personnelRow ? datumOf(personnelRow, side, memberCells, unitCells) : null
      if (personnelDatum && personnelDatum.kind !== 'empty') return personnelDatum
      const participantDatum = participantRow ? datumOf(participantRow, side, memberCells, unitCells) : null
      if (participantDatum && participantDatum.kind !== 'empty') return participantDatum
    }
    return datumOf(row, side, memberCells, unitCells)
  }
  const table = displayRows.map((row) => ({ row, data: sides.map((side) => resolveRowDatum(row, side)) }))
  /* 손실률 — 표의 '손실률' 줄과 같은 계산(원래 행 + 나라·부대 합 기준) */
  const rates = new Map(sides.map((side) => [side.id, lossRate(rows, side.id, memberCells, unitCells)] as const))
  const compositions = lossCompositions(rows, sides.map((side) => side.id))

  /** 나라별 몫 · 부대별 몫 — 값이 둘 이상 있는 (지표, 진영)만 */
  const memberBlocks = buildBreakdownBlocks(rows, sides, memberCells)
  const unitBlocks = buildBreakdownBlocks(rows, sides, unitCells)

  const drawn = table.flatMap(({ data }) => data).filter((datum) => datum.kind !== 'empty')
  const subObservations = [
    ...memberBlocks.flatMap(({ entries }) => entries.map((entry) => entry.observation)),
    ...unitBlocks.flatMap(({ entries }) => entries.map((entry) => entry.observation)),
  ]
  /* 흐림은 '검증된 값과 섞였을 때'만 — 시드 수치 80개 중 72개가 미검증이라 7건 중 6건이 통째로 흐렸다 */
  const verifiedFlags = [...drawn.map((datum) => datum.unverified), ...subObservations.map(isUnverified)]
  const fadeUnverified = verifiedFlags.includes(true) && verifiedFlags.includes(false)
  const anyOpenEnded = drawn.some((datum) => datum.openEnded)
  const anyMultiple = drawn.some((datum) => datum.kind === 'multiple')
  const anyDerived = drawn.some((datum) => datum.kind === 'derived')

  const rateFor = (datum: BarDatum) => {
    const rate = rates.get(datum.side.id)
    if (!rate) return null
    return (datum.kind === 'value' || datum.kind === 'derived') && datum.metricKey === rate.sizeKey ? rate : null
  }
  const anyRate = table.some(({ data }) => data.some((datum) => rateFor(datum) !== null))

  const actionHint = (datum: BarDatum, touch: boolean) => {
    if (datum.kind === 'value') return touch ? '한 번 더 누르면 고칩니다' : '누르면 고칩니다'
    if (datum.kind === 'multiple' && onShowTable) {
      return touch ? '한 번 더 누르면 표에서 하나씩 봅니다' : '누르면 표에서 하나씩 봅니다'
    }
    return ''
  }

  const showTooltip = (element: HTMLElement, datum: BarDatum, metricName: string, touch: boolean) => {
    const host = hostRef.current
    if (!host) return
    const hostRect = host.getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    const rate = rateFor(datum)
    let lines: string[]
    if (datum.kind === 'multiple') {
      lines = [
        '대표(채택) 값이 정해지지 않은 추정치들',
        ...datum.candidates.map((candidate) => {
          const role = candidate.estimateRole ? ` (${ESTIMATE_ROLE_LABEL[candidate.estimateRole]})` : ''
          return `${formatObservationValue(candidate)}${role}${candidate.note ? ` — ${clipNote(candidate.note)}` : ''}`
        }),
      ]
    } else if (datum.kind === 'derived') {
      const sourceText = datum.derivedSource === 'unit' ? '산하 부대별 값을 더한 계산 값' : '나라별 값을 더한 계산 값'
      lines = [
        `${datum.label} — ${sourceText}`,
        rate ? `손실률 ${formatRate(rate.rate)} — ${rate.lossName} ÷ ${rate.sizeName}` : '',
        datum.unverified ? '출처 미검증 값이 섞임' : '',
      ]
    } else if (datum.observation) {
      lines = [
        formatObservationExact(datum.observation),
        datum.observation.note ? clipNote(datum.observation.note) : '',
        rate ? `손실률 ${formatRate(rate.rate)} — ${rate.lossName} ÷ ${datum.observation.metric.name}` : '',
        datum.unverified ? unverifiedLabel(datum.observation) : sourceLabel(datum.observation),
      ]
    } else {
      lines = []
    }
    lines = [...lines, actionHint(datum, touch)].filter(Boolean)
    /* 툴팁(최대 280px)이 지면 밖으로 잘리지 않게 가운데 x를 안쪽으로 당긴다(휴대폰 왼쪽 막대에서 잘렸다) */
    const half = Math.min(140, hostRect.width / 2)
    const center = rect.left - hostRect.left + rect.width / 2
    setTooltip({
      key: datum.key,
      posX: Math.max(half, Math.min(hostRect.width - half, center)),
      posY: rect.top - hostRect.top,
      title: `${datum.side.name} · ${metricName}`,
      lines,
    })
  }
  const hideTooltip = () => setTooltip(null)

  /** 막대(또는 값) 하나의 입력 처리 — 마우스는 hover 설명·클릭 실행, 터치는 첫 탭 설명·두 번째 탭 실행 */
  const interactionFor = (datum: BarDatum, metricName: string, action: (() => void) | null) => ({
    'data-bar-key': datum.key,
    onPointerDown: (pointerEvent: PointerEvent<HTMLElement>) => {
      inputRef.current = pointerEvent.pointerType === 'touch' ? 'touch' : 'mouse'
    },
    onPointerEnter: (pointerEvent: PointerEvent<HTMLElement>) => {
      if (pointerEvent.pointerType === 'mouse') showTooltip(pointerEvent.currentTarget, datum, metricName, false)
    },
    onPointerLeave: (pointerEvent: PointerEvent<HTMLElement>) => {
      if (pointerEvent.pointerType === 'mouse') hideTooltip()
    },
    onFocus: (focusEvent: FocusEvent<HTMLElement>) => {
      if (inputRef.current !== 'touch') showTooltip(focusEvent.currentTarget, datum, metricName, false)
    },
    onBlur: hideTooltip,
    onClick: (mouseEvent: MouseEvent<HTMLElement>) => {
      if (inputRef.current === 'touch' && tooltip?.key !== datum.key) {
        showTooltip(mouseEvent.currentTarget, datum, metricName, true)
        return
      }
      action?.()
    },
  })

  /**
   * 막대 하나 — 진영 값이면 버튼(고치기), 값 여럿이면 버튼(표로), 나라 합이면 그림만, 값이 없으면 '+ 값' 자리.
   * bare = 막대 없이 값만(대결형에서 상대가 없는 줄).
   */
  const renderBar = (
    row: ChartRow,
    datum: BarDatum,
    max: number,
    direction: 'start' | 'end',
    bare = false,
    sharePct: number | null = null,
  ) => {
    if (datum.kind === 'empty') {
      /* 합친 규모 행에는 빈칸이 없다(양쪽 다 값이 있을 때만 합친다) — 그래도 지표 키가 아니므로 '+ 값'을 내지 않는다 */
      if (row.key === PAIRED_SIZE_KEY) return null
      return (
        <AddSlot
          type="button"
          $direction={direction}
          onClick={() => onAdd(datum.side.id, row.key)}
          aria-label={`${datum.side.name} ${row.name} 추가`}
        >
          <FiPlus aria-hidden />값
        </AddSlot>
      )
    }
    const scale = (value: number) => (max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0)
    const rate = rateFor(datum)
    const fade = fadeUnverified && datum.unverified
    let track: ReactNode = null
    if (!bare && datum.kind === 'multiple' && datum.low !== null && datum.high !== null) {
      const from = scale(datum.low)
      const to = Math.max(scale(datum.high), from + 1.5)
      const ticks = datum.candidates
        .map((candidate) => observationExtent(candidate)?.center)
        .filter((center): center is number => center != null)
      track = (
        <Track $direction={direction}>
          <RangeBand
            $direction={direction}
            $faded={fade}
            style={{
              [direction === 'end' ? 'left' : 'right']: `${from}%`,
              width: `${to - from}%`,
              background: datum.side.color,
              borderColor: datum.side.color,
            }}
          />
          {ticks.map((center, index) => (
            <CandidateTick
              key={index}
              style={{ [direction === 'end' ? 'left' : 'right']: `calc(${scale(center)}% - 1px)`, background: datum.side.color }}
            />
          ))}
        </Track>
      )
    } else if (!bare && datum.center !== null) {
      const width = Math.max(scale(datum.center), 1.5)
      const whisker =
        datum.low !== null && datum.high !== null && datum.high > datum.low
          ? { from: scale(datum.low), to: scale(datum.high) }
          : null
      track = (
        <Track $direction={direction}>
          <BarFill
            $direction={direction}
            $unverified={fade}
            $derived={datum.kind === 'derived'}
            $openEnded={datum.openEnded}
            style={{ width: `${width}%`, background: datum.side.color }}
          />
          {rate && (
            /* 손실 몫 — 병력 막대 안, 축 쪽에서부터(병력 대비 손실이 한눈에) */
            <LossOverlay $direction={direction} style={{ width: `${width * Math.min(1, rate.rate)}%` }} />
          )}
          {whisker && (
            <WhiskerLine
              $direction={direction}
              style={
                direction === 'end'
                  ? { left: `${whisker.from}%`, width: `${whisker.to - whisker.from}%` }
                  : { right: `${whisker.from}%`, width: `${whisker.to - whisker.from}%` }
              }
            />
          )}
        </Track>
      )
    }
    const derivedBadgeText = datum.derivedSource === 'unit' ? '부대 합' : '나라 합'
    const derivedAccessible = datum.derivedSource === 'unit' ? '(산하 부대별 값의 합)' : '(나라별 값의 합)'
    const content = (
      <>
        {track}
        <BarValue $direction={direction}>
          {datum.label}
          {datum.kind === 'derived' && <span className="derived">{derivedBadgeText}</span>}
          {sharePct !== null && <span className="derived">{sharePct}%</span>}
          {rate && <span className="derived loss-tag">손실 {formatRate(rate.rate)}</span>}
        </BarValue>
      </>
    )
    const unverifiedNote = datum.unverified ? ', 출처 미검증' : ''
    const accessibleName = `${datum.side.name} ${row.name} ${datum.label}${rate ? `, 손실률 ${formatRate(rate.rate)}` : ''}${unverifiedNote}`
    if (datum.kind === 'value' && datum.observation) {
      const observation = datum.observation
      return (
        <BarButton
          type="button"
          $direction={direction}
          aria-label={`${accessibleName} — 고치기`}
          {...interactionFor(datum, row.name, () => onEdit(observation))}
        >
          {content}
        </BarButton>
      )
    }
    if (datum.kind === 'multiple' && onShowTable) {
      return (
        <BarButton
          type="button"
          $direction={direction}
          aria-label={`${accessibleName}, 대표 값 미정 — 표에서 보기`}
          {...interactionFor(datum, row.name, onShowTable)}
        >
          {content}
        </BarButton>
      )
    }
    return (
      <BarStatic
        $direction={direction}
        role="img"
        aria-label={datum.kind === 'derived' ? `${accessibleName}${derivedAccessible}` : accessibleName}
        tabIndex={0}
        {...interactionFor(datum, row.name, null)}
      >
        {content}
      </BarStatic>
    )
  }

  const renderButterflyRow = (row: ChartRow, data: BarDatum[], bare: boolean) => {
    const [left, right] = data
    const max = Math.max(left.high ?? 0, right.high ?? 0)
    const ratio = bare ? null : ratioOf(left, right)
    const split = bare ? null : shareSplitOf(left, right)
    return (
      <ButterflyRow key={row.key} role="listitem">
        <Half>{renderBar(row, left, max, 'start', bare)}</Half>
        <MetricLabel>
          <span className="name">{row.name}</span>
          {ratio && (
            <span
              className="ratio"
              title={`${ratio.larger.side.name}${subjectParticle(ratio.larger.side.name)} ${formatRatio(ratio.ratio)}배 (큰 쪽 ÷ 작은 쪽)`}
            >
              {ratio.direction === 'start' && (
                <span className="arrow" style={{ color: ratio.larger.side.color }} aria-hidden>
                  ◀
                </span>
              )}
              <span>{formatRatio(ratio.ratio)}배</span>
              {ratio.direction === 'end' && (
                <span className="arrow" style={{ color: ratio.larger.side.color }} aria-hidden>
                  ▶
                </span>
              )}
              <span className="sr-only">, {ratio.larger.side.name} 쪽이 큼</span>
            </span>
          )}
          {split && (
            <span className="split" aria-hidden title={`비중 ${split.leftPct}% : ${split.rightPct}%`}>
              {split.leftPct} : {split.rightPct}
            </span>
          )}
        </MetricLabel>
        <Half>{renderBar(row, right, max, 'end', bare)}</Half>
      </ButterflyRow>
    )
  }

  /* 대결형: 양쪽 다 값이 있는 줄(비교) / 한쪽만 있는 줄(값만) */
  const comparedEntries = table.filter(({ data }) => data.every((datum) => datum.kind !== 'empty'))
  const loneEntries = table.filter(({ data }) => data.some((datum) => datum.kind === 'empty'))

  const legendNotes = [
    '막대 길이는 지표마다 따로 잽니다',
    fadeUnverified && '흐린 막대 = 출처 없음·미검증',
    anyDerived && '흰 빗금 막대 = 나라·부대 합산',
    anyOpenEnded && '끝이 흐려지는 막대 = ~이상(하한)',
    anyMultiple && '옅은 띠 = 대표가 정해지지 않은 여러 추정치',
    anyRate && '진한 빗금 = 병력 중 손실',
  ].filter(Boolean)

  const renderBreakdownSection = (
    title: string,
    blocks: ReturnType<typeof buildBreakdownBlocks>,
  ) => (
    <Members aria-label={title}>
      <MembersTitle>{title}</MembersTitle>
      <MembersGrid>
        {blocks.map(({ row, side, entries }) => {
          const total = entries.reduce((sum, entry) => sum + entry.center, 0)
          const max = entries[0]?.center ?? 0
          return (
            <MemberCard key={`${title}:${row.key}:${side.id}`}>
              <MemberHead>
                <Swatch style={{ background: side.color }} aria-hidden />
                {side.name} · {row.name}
              </MemberHead>
              <ul>
                {entries.map((entry) => (
                  <li key={entry.name}>
                    <button
                      type="button"
                      onClick={() => onEdit(entry.observation)}
                      aria-label={`${entry.name} ${row.name} ${formatObservationValue(entry.observation)} — 고치기`}
                      title={formatObservationExact(entry.observation)}
                    >
                      <span className="name">{entry.name}</span>
                      <span className="track">
                        <span
                          className="fill"
                          style={{
                            width: `${max > 0 ? Math.max(1.5, (entry.center / max) * 100) : 0}%`,
                            background: side.color,
                            opacity: fadeUnverified && isUnverified(entry.observation) ? 0.45 : 0.9,
                          }}
                        />
                      </span>
                      <span className="value">
                        {formatObservationValue(entry.observation)}
                        {total > 0 && <span className="share">{Math.round((entry.center / total) * 100)}%</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </MemberCard>
          )
        })}
      </MembersGrid>
    </Members>
  )

  return (
    <Host
      ref={hostRef}
      onKeyDownCapture={() => {
        inputRef.current = 'keyboard'
      }}
    >
      <Legend aria-label="범례">
        {sides.map((side) => (
          <LegendItem key={side.id}>
            <Swatch style={{ background: side.color }} aria-hidden />
            {side.name}
          </LegendItem>
        ))}
        <LegendNote>{legendNotes.join(' · ')}</LegendNote>
      </Legend>

      {butterfly ? (
        <>
          {comparedEntries.length > 0 && (
            <div>
              <ButterflyAxisHead aria-hidden>
                <span className="wing left">
                  <Swatch style={{ background: sides[0].color }} />
                  {sides[0].name}
                </span>
                <span className="axis">지표 · 우세 배수</span>
                <span className="wing right">
                  <Swatch style={{ background: sides[1].color }} />
                  {sides[1].name}
                </span>
              </ButterflyAxisHead>
              <Butterfly role="list" aria-label="진영 수치 비교">
                {comparedEntries.map(({ row, data }) => renderButterflyRow(row, data, false))}
              </Butterfly>
            </div>
          )}
          {loneEntries.length > 0 && (
            <LoneBlock>
              <SubHead>
                한쪽 진영만 기록
                <span>견줄 값이 없어 막대 없이 적습니다</span>
              </SubHead>
              <Butterfly role="list" aria-label="한쪽 진영만 기록된 수치">
                {loneEntries.map(({ row, data }) => renderButterflyRow(row, data, true))}
              </Butterfly>
            </LoneBlock>
          )}
        </>
      ) : (
        <Grouped role="list" aria-label="진영 수치 비교">
          {table.map(({ row, data }) => {
            const max = Math.max(0, ...data.map((datum) => datum.high ?? 0))
            const allComparable = data.length >= 2 && data.every(isComparableDatum)
            const rowSum = allComparable ? data.reduce((acc, datum) => acc + (datum.center ?? 0), 0) : 0
            return (
              <GroupBlock key={row.key} role="listitem">
                <GroupTitle>{row.name}</GroupTitle>
                {data.map((datum) => {
                  const sharePct =
                    allComparable && rowSum > 0 && datum.center !== null
                      ? Math.round((datum.center / rowSum) * 100)
                      : null
                  return (
                    <GroupLine key={datum.side.id}>
                      <span className="side">
                        <Swatch style={{ background: datum.side.color }} aria-hidden />
                        {datum.side.name}
                      </span>
                      {renderBar(row, datum, max, 'end', false, sharePct)}
                    </GroupLine>
                  )
                })}
              </GroupBlock>
            )
          })}
        </Grouped>
      )}

      {compositions.length > 0 && (
        <LossCompositionBlock compositions={compositions} sides={sides} onEdit={onEdit} />
      )}

      {memberBlocks.length > 0 && renderBreakdownSection('나라별 몫', memberBlocks)}
      {unitBlocks.length > 0 && renderBreakdownSection('부대별 몫', unitBlocks)}

      {tooltip && (
        <Tooltip role="tooltip" style={{ left: tooltip.posX, top: tooltip.posY }}>
          <strong>{tooltip.title}</strong>
          {tooltip.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </Tooltip>
      )}
    </Host>
  )
}

/**
 * 손실 구성 — 진영마다 사망·부상·실종·포로를 한 막대로 쌓는다. **진영끼리 같은 자**(위 행들은 행마다 따로 잰다).
 * 위 행들만으로는 포로 720 대 47.4만 줄이 손실 합계 줄과 똑같이 꽉 찬 막대라, 무엇이 손실을 키웠는지 안 보였다
 * (보불전쟁 프랑스 측: 포로가 몫의 59%). 기록된 '손실 합계'는 세로선, 몫의 합과 5% 넘게 어긋나면 한 줄로 알린다.
 */
function LossCompositionBlock({
  compositions,
  sides,
  onEdit,
}: {
  compositions: LossComposition<Observation>[]
  sides: ReadonlyArray<ChartSide>
  onEdit: (observation: Observation) => void
}) {
  const max = Math.max(...compositions.map((composition) => Math.max(composition.sum, composition.total?.value ?? 0)))
  const usedParts = LOSS_COMPONENTS.filter((component) =>
    compositions.some((composition) => composition.parts.some((part) => part.key === component.key)),
  )
  const anyTotal = compositions.some((composition) => composition.total)
  return (
    <Composition aria-label="손실 구성">
      <CompositionHead>
        <MembersTitle>손실 구성</MembersTitle>
        <CompositionLegend aria-hidden>
          {usedParts.map((component) => (
            <span key={component.key}>
              <i
                style={{
                  opacity: PART_OPACITY[component.key],
                  backgroundImage: PART_PATTERN[component.key],
                }}
              />
              {component.label}
            </span>
          ))}
        </CompositionLegend>
        <LegendNote>진영끼리 같은 자로 잽니다{anyTotal && ' · 세로선 = 기록된 손실 합계'}</LegendNote>
      </CompositionHead>
      {compositions.map((composition) => {
        const side = sides.find((entry) => entry.id === composition.sideId)
        if (!side) return null
        const base = composition.parts[0].observation
        return (
          <CompositionLine key={composition.sideId}>
            <span className="side">
              <Swatch style={{ background: side.color }} aria-hidden />
              {side.name}
            </span>
            <CompositionTrack aria-hidden>
              {composition.parts.map((part) => (
                <span
                  key={part.key}
                  className="part"
                  title={`${part.label} ${formatObservationValue(part.observation)}`}
                  style={{
                    width: `${max > 0 ? Math.max(0.8, (part.value / max) * 100) : 0}%`,
                    backgroundColor: side.color,
                    backgroundImage: PART_PATTERN[part.key],
                    opacity: PART_OPACITY[part.key],
                  }}
                />
              ))}
              {composition.total && max > 0 && (
                <span className="total" style={{ left: `calc(${(composition.total.value / max) * 100}% - 1px)` }} />
              )}
            </CompositionTrack>
            <span className="sum">
              {composition.parts.length >= 2 ? sumLabel(base, composition.sum) : formatObservationValue(base)}
            </span>
            <CompositionParts>
              {composition.parts.map((part) => (
                <button
                  key={part.key}
                  type="button"
                  onClick={() => onEdit(part.observation)}
                  aria-label={`${side.name} ${part.observation.metric.name} ${formatObservationValue(part.observation)} — 고치기`}
                  title={part.observation.metric.name}
                >
                  <i
                    className="part-dot"
                    aria-hidden
                    style={{
                      backgroundColor: side.color,
                      backgroundImage: PART_PATTERN[part.key],
                      opacity: PART_OPACITY[part.key],
                    }}
                  />
                  {part.label} {formatObservationValue(part.observation)}
                  {composition.parts.length >= 2 && (
                    <span className="share">{Math.round((part.value / composition.sum) * 100)}%</span>
                  )}
                </button>
              ))}
              {composition.parts.length === 1 && <span className="hint">{composition.parts[0].label}만 기록</span>}
              {composition.mismatch !== null && composition.total && (
                <span className="hint">
                  몫의 합 {sumLabel(base, composition.sum)} — 기록된 합계 {formatObservationValue(composition.total.observation)}와{' '}
                  {sumLabel(base, Math.abs(composition.mismatch))} 차이(정의·집계 범위가 다를 수 있음)
                </span>
              )}
            </CompositionParts>
          </CompositionLine>
        )
      })}
    </Composition>
  )
}

/* ───────────────────────── 조판 ───────────────────────── */

type Direction = { $direction: 'start' | 'end' }

const Host = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const Swatch = styled.span`
  display: inline-block;
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 3px;
`

const LegendNote = styled.span`
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: ${metaText};
`

const ButterflyAxisHead = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(96px, 150px) minmax(0, 1fr);
  align-items: center;
  padding: 0 0 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};

  @media (max-width: 639px) {
    grid-template-columns: minmax(0, 1fr) minmax(64px, 84px) minmax(0, 1fr);
  }

  .wing {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .wing.left {
    justify-content: flex-end;
    padding-right: 10px;
  }
  .wing.right {
    justify-content: flex-start;
    padding-left: 10px;
  }
  .axis {
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: ${metaText};
  }
`

const Butterfly = styled.div`
  display: flex;
  flex-direction: column;
`

const ButterflyRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(96px, 150px) minmax(0, 1fr);
  align-items: stretch;
  min-height: 44px;

  /* 휴대폰 폭 — 가운데 지표 칸을 줄여 막대 자리를 돌려준다 */
  @media (max-width: 639px) {
    grid-template-columns: minmax(0, 1fr) minmax(64px, 84px) minmax(0, 1fr);
  }
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

const Half = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 8px 10px;

  @media (max-width: 639px) {
    padding: 8px 4px;
  }
`

const MetricLabel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 10px;
  text-align: center;
  border-inline: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  @media (max-width: 639px) {
    padding: 6px 4px;
  }

  .name {
    font-size: 12.5px;
    font-weight: 650;
    line-height: 1.35;
    word-break: keep-all;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .ratio {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11.5px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .split {
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
    color: ${metaText};
  }
  .arrow {
    font-size: 9px;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
`

/* 막대 + 값 한 줄. 왼쪽 반은 거꾸로(축이 가운데) */
const barLine = ({ $direction }: Direction) => `
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  flex-direction: ${$direction === 'start' ? 'row-reverse' : 'row'};
`

const BarButton = styled.button<Direction>`
  ${barLine}
  padding: 4px 0;
  border: 0;
  border-radius: 4px;
  background: none;
  font: inherit;
  cursor: pointer;

  &:hover > span:first-child,
  &:focus-visible > span:first-child {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const BarStatic = styled.div<Direction>`
  ${barLine}
  padding: 4px 0;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const Track = styled.span<Direction>`
  position: relative;
  flex: 1 1 auto;
  min-width: 28px;
  height: 14px;
  border-radius: 3px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  transition: background 0.14s;
`

/* 축(가운데)에 붙은 쪽은 각지고, 값 끝만 4px 둥글게 */
const BarFill = styled.span<Direction & { $unverified: boolean; $derived: boolean; $openEnded: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  ${({ $direction }) => ($direction === 'start' ? 'right: 0; border-radius: 4px 0 0 4px;' : 'left: 0; border-radius: 0 4px 4px 0;')}
  opacity: ${({ $unverified }) => ($unverified ? 0.45 : 0.9)};
  /* 나라 합(계산)은 빗금 — 저장된 진영 값과 구분(색만으로 말하지 않게) */
  ${({ $derived }) =>
    $derived
      ? 'background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.45) 0 3px, transparent 3px 7px) !important;'
      : ''}
  /* '~이상' — 값 끝이 흐려진다(하한일 뿐, 끝이 정해지지 않았다) */
  ${({ $openEnded, $direction }) => {
    if (!$openEnded) return ''
    const mask = `linear-gradient(to ${$direction === 'start' ? 'left' : 'right'}, #000 calc(100% - 18px), transparent)`
    return `mask-image: ${mask}; -webkit-mask-image: ${mask};`
  }}
`

/* 값 여럿(대표 미정) — 가장 낮은 값~가장 높은 값을 옅은 띠로, 값마다 눈금 */
const RangeBand = styled.span<Direction & { $faded: boolean }>`
  position: absolute;
  top: 2px;
  bottom: 2px;
  border: 1px solid;
  border-radius: 3px;
  opacity: ${({ $faded }) => ($faded ? 0.18 : 0.3)};
`

const CandidateTick = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  border-radius: 1px;
`

/* 병력 중 손실 몫 — 축 쪽에서부터 빗금 */
const LossOverlay = styled.span<Direction>`
  position: absolute;
  top: 0;
  bottom: 0;
  ${({ $direction }) => ($direction === 'start' ? 'right: 0;' : 'left: 0;')}
  background-image: repeating-linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.42) 0 2px,
    rgba(0, 0, 0, 0.18) 2px 5px
  );
  pointer-events: none;
`

const LoneBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SubHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  span {
    font-size: 12px;
    font-weight: 400;
    color: ${metaText};
  }
`

const WhiskerLine = styled.span<Direction>`
  position: absolute;
  top: 50%;
  height: 2px;
  transform: translateY(-50%);
  background: ${({ theme }) => theme.colors.text.primary};
  opacity: 0.6;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4px;
    width: 2px;
    height: 10px;
    background: inherit;
  }
  &::before {
    left: 0;
  }
  &::after {
    right: 0;
  }
`

const BarValue = styled.span<Direction>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 639px) {
    font-size: 12px;
  }

  .derived {
    font-size: 11px;
    font-weight: 500;
    color: ${metaText};
  }
`

const AddSlot = styled.button<Direction>`
  display: flex;
  align-items: center;
  justify-content: ${({ $direction }) => ($direction === 'start' ? 'flex-end' : 'flex-start')};
  gap: 3px;
  width: 100%;
  padding: 6px 4px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 12px;
  color: ${metaText};
  cursor: pointer;

  svg {
    width: 12px;
    height: 12px;
  }
  &:hover,
  &:focus-visible {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const Grouped = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const GroupBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const GroupTitle = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const GroupLine = styled.div`
  display: grid;
  grid-template-columns: minmax(90px, 170px) minmax(0, 1fr);
  align-items: center;
  gap: 10px;

  .side {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    font-size: 12px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.secondary};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Members = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const MembersTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const MembersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px 28px;
`

const MemberCard = styled.div`
  min-width: 0;

  ul {
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
  }
  button {
    display: grid;
    grid-template-columns: minmax(64px, 110px) minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 3px 0;
    border: 0;
    background: none;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover .name {
      color: ${({ theme }) => theme.colors.text.primary};
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
      outline-offset: 2px;
      border-radius: 4px;
    }
  }
  .name {
    overflow: hidden;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .track {
    position: relative;
    height: 10px;
    border-radius: 2px;
    background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 0 3px 3px 0;
  }
  .value {
    display: inline-flex;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .share {
    font-weight: 400;
    color: ${metaText};
  }
`

const MemberHead = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Tooltip = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  position: absolute;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 280px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 8px));

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Composition = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const CompositionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
`

const CompositionLegend = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background-color: ${({ theme }) => theme.colors.text.primary};
  }
`

const CompositionLine = styled.div`
  display: grid;
  grid-template-columns: minmax(90px, 170px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px 10px;

  .side {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sum {
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  @media (max-width: 639px) {
    grid-template-columns: minmax(0, 1fr) auto;
    .side {
      grid-column: 1 / -1;
    }
  }
`

const CompositionTrack = styled.span`
  position: relative;
  display: flex;
  height: 16px;
  border-radius: 3px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};

  .part {
    flex: 0 0 auto;
    height: 100%;
  }
  /* 몫 사이 1px 틈 — 지면 색을 몰라도 경계가 선다 */
  .part + .part {
    margin-left: 1px;
  }
  .part:first-of-type {
    border-radius: 3px 0 0 3px;
  }
  .part:last-of-type {
    border-radius: 0 3px 3px 0;
  }
  .part:only-of-type {
    border-radius: 3px;
  }
  .total {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) => theme.colors.text.primary};
  }
`

const CompositionParts = styled.div`
  grid-column: 2 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 3px 12px;
  font-size: 12px;

  @media (max-width: 639px) {
    grid-column: 1 / -1;
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 0;
    border: 0;
    background: none;
    font: inherit;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: pointer;

    .part-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    &:hover {
      text-decoration: underline;
    }
    &:focus-visible {
      outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
      outline-offset: 2px;
      border-radius: 4px;
    }
  }
  .share,
  .hint {
    color: ${metaText};
  }
`
