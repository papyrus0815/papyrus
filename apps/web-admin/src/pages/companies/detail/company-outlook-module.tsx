import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FiPlus, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import type {
  CatalystDateConfidence,
  CompanyOutlookCatalystInput,
  CompanyOutlookDriverInput,
  CompanyOutlookInput,
  CompanyOutlookItem,
  CompanyOutlookScenarioInput,
  DriverImpact,
  DriverImportance,
  DriverRole,
  OutlookConfidence,
  OutlookOutcome,
  OutlookStance,
  ScenarioKind,
  UpdateCompanyInput,
  ValuationMethod,
} from '@/shared/api/company'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'
import {
  formatGrouped,
  numToStr,
  readGrouped,
  strToNum,
} from '@/shared/lib/number-format'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  InlineDate,
  InlineRichText,
  InlineSelect,
  type InlineSelectOption,
  InlineText,
} from '@/shared/ui/inline-edit'

import {
  changeTone,
  impactTone,
  stanceTone,
  type Tone,
  toneColor,
  toneSoftBg,
} from './financial-tone'
import { TonePill, ToneDot, ToneTag } from './tone-pill'
import * as S from './company-detail.styles'

const STANCE_OPTIONS: InlineSelectOption[] = [
  { value: 'BULLISH', label: '강세' },
  { value: 'NEUTRAL', label: '중립' },
  { value: 'BEARISH', label: '약세' },
]
const STANCE_LABEL: Record<OutlookStance, string> = {
  BULLISH: '강세',
  NEUTRAL: '중립',
  BEARISH: '약세',
}

const IMPACT_OPTIONS: InlineSelectOption[] = [
  { value: 'POSITIVE', label: '호재' },
  { value: 'NEGATIVE', label: '악재' },
  { value: 'NEUTRAL', label: '중립' },
]
const IMPACT_LABEL: Record<DriverImpact, string> = {
  POSITIVE: '호재',
  NEGATIVE: '악재',
  NEUTRAL: '중립',
}

const IMPORTANCE_OPTIONS: InlineSelectOption[] = [
  { value: 'HIGH', label: '상' },
  { value: 'MEDIUM', label: '중' },
  { value: 'LOW', label: '하' },
]
const IMPORTANCE_LABEL: Record<DriverImportance, string> = {
  HIGH: '상',
  MEDIUM: '중',
  LOW: '하',
}

const CONFIDENCE_OPTIONS: InlineSelectOption[] = [
  { value: 'HIGH', label: '확신 높음' },
  { value: 'MEDIUM', label: '확신 보통' },
  { value: 'LOW', label: '확신 낮음' },
]
const CONFIDENCE_LABEL: Record<OutlookConfidence, string> = {
  HIGH: '확신 높음',
  MEDIUM: '확신 보통',
  LOW: '확신 낮음',
}

/** 중요도 → 가중치(미지정 1). 호재/악재 균형 바·net bias 계산용. */
const IMPORTANCE_WEIGHT: Record<DriverImportance, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}
const driverWeight = (importance: DriverImportance | ''): number =>
  importance ? IMPORTANCE_WEIGHT[importance] : 1

const SCENARIO_KINDS: ScenarioKind[] = ['BULL', 'BASE', 'BEAR']
const SCENARIO_LABEL: Record<ScenarioKind, string> = {
  BULL: '낙관',
  BASE: '기본',
  BEAR: '비관',
}
const scenarioTone = (kind: ScenarioKind): Tone =>
  kind === 'BULL' ? 'positive' : kind === 'BEAR' ? 'negative' : 'neutral'

const OUTCOME_OPTIONS: InlineSelectOption[] = [
  { value: 'HIT', label: '적중' },
  { value: 'MISS', label: '미스' },
  { value: 'PARTIAL', label: '부분' },
]
const OUTCOME_LABEL: Record<OutlookOutcome, string> = {
  HIT: '적중',
  MISS: '미스',
  PARTIAL: '부분',
}
const outcomeTone = (outcome: OutlookOutcome | ''): Tone =>
  outcome === 'HIT' ? 'positive' : outcome === 'MISS' ? 'negative' : 'neutral'

const ROLE_OPTIONS: InlineSelectOption[] = [
  { value: 'THESIS', label: '투자포인트' },
  { value: 'RISK', label: '리스크' },
]

const VALUATION_OPTIONS: InlineSelectOption[] = [
  { value: 'PER', label: 'PER' },
  { value: 'PBR', label: 'PBR' },
  { value: 'EV_EBITDA', label: 'EV/EBITDA' },
  { value: 'DCF', label: 'DCF' },
  { value: 'SOTP', label: 'SOTP' },
  { value: 'OTHER', label: '기타' },
]
const VALUATION_LABEL: Record<ValuationMethod, string> = {
  PER: 'PER',
  PBR: 'PBR',
  EV_EBITDA: 'EV/EBITDA',
  DCF: 'DCF',
  SOTP: 'SOTP',
  OTHER: '기타',
}

interface OutlookCalc {
  target: number | null
  low: number | null
  high: number | null
  mid: number | null
  /** 중앙값/목표가의 현재가 대비 % */
  upside: number | null
  /** 상단의 현재가 대비 %(상방 여력) */
  up: number | null
  /** 하단의 현재가 대비 %(하방 리스크) */
  down: number | null
  /** 리스크-리워드 비율(상방/|하방|), 둘 다 유효할 때만 */
  rr: number | null
  /** 하단>상단 입력(역전) */
  bandReversed: boolean
}

/** 전망 행의 파생 지표 — 현재가 대비 여력·R/R·중앙값. 데이터 변경 없이 표시·계산용.
 *  range는 모드에 따라 호출 측이 주입(범위 모드=예상하단/상단, 시나리오 모드=비관/낙관). */
function computeOutlook(
  targetPrice: string,
  range: { low: number | null; high: number | null },
  currentPrice: number | null,
): OutlookCalc {
  const target = strToNum(targetPrice)
  let low = range.low
  let high = range.high
  const bandReversed = low != null && high != null && low > high
  if (bandReversed) [low, high] = [high, low] // 계산은 정렬된 값으로 방어
  const mid =
    target ??
    (low != null && high != null ? (low + high) / 2 : (low ?? high ?? null))
  const ref = currentPrice
  const pct = (value: number): number | null =>
    ref && ref > 0 ? ((value - ref) / ref) * 100 : null
  const upside = mid != null ? pct(mid) : null
  const up = high != null ? pct(high) : null
  const down = low != null ? pct(low) : null
  const rr =
    up != null && down != null && up > 0 && down < 0
      ? up / Math.abs(down)
      : null
  return { target, low, high, mid, upside, up, down, rr, bandReversed }
}

interface DriverRow {
  key: string
  name: string
  role: DriverRole | ''
  impact: DriverImpact | ''
  importance: DriverImportance | ''
  eventDate: string | null
  note: string | null
}

/** 시나리오 — 종류(낙관/기본/비관)별 고정 3행, kind가 식별자. */
interface ScenarioRow {
  kind: ScenarioKind
  targetPrice: string
  probability: string
  summary: string | null
}

interface CatalystRow {
  key: string
  title: string
  expectedDate: string | null
  dateConfidence: CatalystDateConfidence | ''
  impact: DriverImpact | ''
  note: string | null
}

interface OutlookRow {
  key: string
  serverId?: string
  horizon: string
  asOf: string | null
  targetDate: string | null
  stance: OutlookStance | ''
  confidence: OutlookConfidence | ''
  targetPrice: string
  priorTargetPrice: string
  expectedLow: string
  expectedHigh: string
  currency: string
  rationale: string
  source: string
  valuationMethod: ValuationMethod | ''
  targetMultiple: string
  perShareBasis: string
  basisLabel: string
  actualPrice: string
  outcome: OutlookOutcome | ''
  resolvedAt: string | null
  drivers: DriverRow[]
  scenarios: ScenarioRow[]
  catalysts: CatalystRow[]
}

function makeDriver(
  input: CompanyOutlookItem['drivers'][number],
  key: string,
): DriverRow {
  return {
    key,
    name: input.name ?? '',
    role: input.role ?? '',
    impact: input.impact ?? '',
    importance: input.importance ?? '',
    eventDate: input.eventDate,
    note: input.note,
  }
}

function makeCatalyst(
  input: CompanyOutlookItem['catalysts'][number],
  key: string,
): CatalystRow {
  return {
    key,
    title: input.title ?? '',
    expectedDate: input.expectedDate,
    dateConfidence: input.dateConfidence ?? '',
    impact: input.impact ?? '',
    note: input.note,
  }
}

/** 시나리오 고정 3행(낙관/기본/비관) — 서버 데이터를 kind로 매칭, 없으면 빈 행. */
function buildScenarios(item: CompanyOutlookItem): ScenarioRow[] {
  return SCENARIO_KINDS.map((kind) => {
    const found = (item.scenarios ?? []).find((scn) => scn.kind === kind)
    return {
      kind,
      targetPrice: numToStr(found?.targetPrice ?? null),
      probability: numToStr(found?.probability ?? null),
      summary: found?.summary ?? null,
    }
  })
}

function makeRow(
  item: CompanyOutlookItem,
  key: string,
  driverKey: () => string,
  catalystKey: () => string,
): OutlookRow {
  return {
    key,
    serverId: item.id,
    horizon: item.horizon ?? '',
    asOf: item.asOf,
    targetDate: item.targetDate,
    stance: item.stance ?? '',
    confidence: item.confidence ?? '',
    targetPrice: numToStr(item.targetPrice),
    priorTargetPrice: numToStr(item.priorTargetPrice),
    expectedLow: numToStr(item.expectedLow),
    expectedHigh: numToStr(item.expectedHigh),
    currency: item.currency ?? '',
    rationale: item.rationale ?? '',
    source: item.source ?? '',
    valuationMethod: item.valuationMethod ?? '',
    targetMultiple: numToStr(item.targetMultiple),
    perShareBasis: numToStr(item.perShareBasis),
    basisLabel: item.basisLabel ?? '',
    actualPrice: numToStr(item.actualPrice),
    outcome: item.outcome ?? '',
    resolvedAt: item.resolvedAt,
    drivers: (item.drivers ?? []).map((driver) =>
      makeDriver(driver, driverKey()),
    ),
    scenarios: buildScenarios(item),
    catalysts: (item.catalysts ?? []).map((catalyst) =>
      makeCatalyst(catalyst, catalystKey()),
    ),
  }
}

/** 빈 시나리오 3행(낙관/기본/비관). */
const emptyScenarios = (): ScenarioRow[] =>
  SCENARIO_KINDS.map((kind) => ({
    kind,
    targetPrice: '',
    probability: '',
    summary: null,
  }))

interface CompanyOutlookModuleProps {
  outlooks: CompanyOutlookItem[]
  /** 현재가(최신 주가 시점) — 상승여력·게이지·R/R 계산용. */
  currentPrice: number | null
  onPatch: (patch: UpdateCompanyInput) => void
  onPersonClick?: (personId: string) => void
}

/**
 * 향후 전망 + 핵심 변수 — 미래 예측(과거 시계열과 별개). 기간·방향·예상범위·근거(리치텍스트)
 * + 핵심 변수(드라이버: 이름·호재/악재·중요도). 서버 delete-and-recreate(드라이버 중첩 create).
 */
export function CompanyOutlookModule({
  outlooks,
  currentPrice,
  onPatch,
  onPersonClick,
}: CompanyOutlookModuleProps) {
  const counterRef = useRef(0)
  const nextKey = useCallback(
    () => `outlook-${Date.now()}-${++counterRef.current}`,
    [],
  )
  const driverCounterRef = useRef(0)
  const nextDriverKey = useCallback(
    () => `driver-${Date.now()}-${++driverCounterRef.current}`,
    [],
  )
  const catalystCounterRef = useRef(0)
  const nextCatalystKey = useCallback(
    () => `catalyst-${Date.now()}-${++catalystCounterRef.current}`,
    [],
  )

  const serverRows = useMemo(() => (outlooks ?? []).slice(), [outlooks])

  const [rows, setRows] = useState<OutlookRow[]>(() =>
    serverRows.map((item) =>
      makeRow(item, nextKey(), nextDriverKey, nextCatalystKey),
    ),
  )

  /* 분산 표시 모드(범위 vs 시나리오) — UI 전용. 명시 선택 없으면 데이터로 추론. */
  const [dispModes, setDispModes] = useState<
    Record<string, 'range' | 'scenario'>
  >({})
  const dispMode = (row: OutlookRow): 'range' | 'scenario' => {
    const explicit = dispModes[row.key]
    if (explicit) return explicit
    const hasScenarioRange = row.scenarios.some(
      (scenario) =>
        scenario.kind !== 'BASE' &&
        (scenario.targetPrice.trim() || scenario.probability.trim()),
    )
    return hasScenarioRange ? 'scenario' : 'range'
  }
  const setDispMode = (key: string, mode: 'range' | 'scenario') =>
    setDispModes((prev) => ({ ...prev, [key]: mode }))

  useEffect(() => {
    setRows((prev) =>
      syncRows(prev, serverRows, nextKey, nextDriverKey, nextCatalystKey),
    )
  }, [serverRows, nextKey, nextDriverKey, nextCatalystKey])

  const commitRows = (next: OutlookRow[]) => {
    setRows(next)
    /* 빈 전망(기간·방향·근거·드라이버 모두 빔)은 PUT에서 제외, 로컬은 유지. */
    const cleaned: CompanyOutlookInput[] = next
      .filter(
        (row) =>
          row.horizon.trim() ||
          row.stance ||
          !isVisuallyEmptyRichText(row.rationale) ||
          row.drivers.some((driver) => driver.name.trim()),
      )
      .map((row, idx) => ({
        horizon: row.horizon.trim() || null,
        asOf: row.asOf ?? null,
        targetDate: row.targetDate ?? null,
        stance: row.stance || null,
        confidence: row.confidence || null,
        targetPrice: strToNum(row.targetPrice),
        priorTargetPrice: strToNum(row.priorTargetPrice),
        expectedLow: strToNum(row.expectedLow),
        expectedHigh: strToNum(row.expectedHigh),
        currency: row.currency.trim() || null,
        rationale: isVisuallyEmptyRichText(row.rationale) ? null : row.rationale,
        source: row.source.trim() || null,
        valuationMethod: row.valuationMethod || null,
        targetMultiple: strToNum(row.targetMultiple),
        perShareBasis: strToNum(row.perShareBasis),
        basisLabel: row.basisLabel.trim() || null,
        actualPrice: strToNum(row.actualPrice),
        outcome: row.outcome || null,
        resolvedAt: row.resolvedAt ?? null,
        order: idx,
        drivers: row.drivers
          .filter((driver) => driver.name.trim())
          .map((driver, dIdx) => ({
            name: driver.name.trim(),
            role: driver.role || null,
            impact: driver.impact || null,
            importance: driver.importance || null,
            eventDate: driver.eventDate ?? null,
            note: driver.note,
            order: dIdx,
          })) as CompanyOutlookDriverInput[],
        /* 값이 하나라도 있는 시나리오만 전송. BASE 목표가는 대표 목표가(단일 출처). */
        scenarios: row.scenarios
          .filter(
            (scenario) =>
              (scenario.kind !== 'BASE' && scenario.targetPrice.trim()) ||
              scenario.probability.trim() ||
              (scenario.summary ?? '').trim(),
          )
          .map((scenario, sIdx) => ({
            kind: scenario.kind,
            targetPrice:
              scenario.kind === 'BASE'
                ? strToNum(row.targetPrice)
                : strToNum(scenario.targetPrice),
            probability: strToNum(scenario.probability),
            summary: (scenario.summary ?? '').trim() || null,
            order: sIdx,
          })) as CompanyOutlookScenarioInput[],
        /* 제목 있는 촉매만 전송. */
        catalysts: row.catalysts
          .filter((catalyst) => catalyst.title.trim())
          .map((catalyst, cIdx) => ({
            title: catalyst.title.trim(),
            expectedDate: catalyst.expectedDate ?? null,
            dateConfidence: catalyst.dateConfidence || null,
            impact: catalyst.impact || null,
            note: catalyst.note,
            order: cIdx,
          })) as CompanyOutlookCatalystInput[],
      }))
    onPatch({ outlooks: cleaned })
  }

  const addRow = () => {
    setRows((arr) => [
      ...arr,
      {
        key: nextKey(),
        horizon: '',
        asOf: null,
        targetDate: null,
        stance: '',
        confidence: '',
        targetPrice: '',
        priorTargetPrice: '',
        expectedLow: '',
        expectedHigh: '',
        currency: '',
        rationale: '',
        source: '',
        valuationMethod: '',
        targetMultiple: '',
        perShareBasis: '',
        basisLabel: '',
        actualPrice: '',
        outcome: '',
        resolvedAt: null,
        drivers: [],
        scenarios: emptyScenarios(),
        catalysts: [],
      },
    ])
  }

  const updateRow = (idx: number, patch: Partial<OutlookRow>) => {
    commitRows(rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const removeRow = async (idx: number) => {
    const row = rows[idx]
    if (!row) return
    const hasContent =
      !!row.horizon.trim() ||
      !!row.stance ||
      !isVisuallyEmptyRichText(row.rationale) ||
      row.drivers.some((driver) => driver.name.trim())
    if (
      hasContent &&
      !(await confirm({
        title: '전망 삭제',
        message: '이 전망을 삭제할까요? 되돌릴 수 없습니다.',
        confirmLabel: '삭제',
        danger: true,
      }))
    ) {
      return
    }
    commitRows(rows.filter((entry) => entry.key !== row.key))
  }

  const addDriver = (outlookIdx: number) => {
    const row = rows[outlookIdx]
    updateRow(outlookIdx, {
      drivers: [
        ...row.drivers,
        {
          key: nextDriverKey(),
          name: '',
          role: '',
          impact: '',
          importance: '',
          eventDate: null,
          note: null,
        },
      ],
    })
  }

  const updateDriver = (
    outlookIdx: number,
    driverIdx: number,
    patch: Partial<DriverRow>,
  ) => {
    const row = rows[outlookIdx]
    updateRow(outlookIdx, {
      drivers: row.drivers.map((driver, i) =>
        i === driverIdx ? { ...driver, ...patch } : driver,
      ),
    })
  }

  const updateScenario = (
    outlookIdx: number,
    scenarioIdx: number,
    patch: Partial<ScenarioRow>,
  ) => {
    const row = rows[outlookIdx]
    updateRow(outlookIdx, {
      scenarios: row.scenarios.map((scenario, i) =>
        i === scenarioIdx ? { ...scenario, ...patch } : scenario,
      ),
    })
  }

  const removeDriver = (outlookIdx: number, driverIdx: number) => {
    const row = rows[outlookIdx]
    updateRow(outlookIdx, {
      drivers: row.drivers.filter((_, i) => i !== driverIdx),
    })
  }

  const resolvedRows = rows.filter((row) => row.outcome)
  const hitCount = resolvedRows.filter((row) => row.outcome === 'HIT').length

  return (
    <S.Section id="company-outlook">
      <S.SectionHeader>
        <S.SectionTitle>전망 · 핵심 변수</S.SectionTitle>
        {rows.length > 0 && (
          <S.SectionSubtitle>{rows.length}건</S.SectionSubtitle>
        )}
        {resolvedRows.length > 0 && (
          <TonePill
            $tone={
              hitCount * 2 >= resolvedRows.length ? 'positive' : 'negative'
            }
          >
            적중률 {hitCount}/{resolvedRows.length}
          </TonePill>
        )}
      </S.SectionHeader>

      {rows.length === 0 ? (
        <S.EmptyState>
          향후 전망(다음 주·분기 등)과 주가를 좌우할 <strong>핵심 변수</strong>를
          기록하세요. 예: "다음 주 강세 — AI 수요(호재·상)·환율(악재·중)·실적 발표 대기".
        </S.EmptyState>
      ) : (
        <S.RowStack>
          {rows.map((row, idx) => {
            const mode = dispMode(row)
            const bearTarget = strToNum(
              row.scenarios.find((scn) => scn.kind === 'BEAR')?.targetPrice ?? '',
            )
            const bullTarget = strToNum(
              row.scenarios.find((scn) => scn.kind === 'BULL')?.targetPrice ?? '',
            )
            const range =
              mode === 'scenario'
                ? { low: bearTarget, high: bullTarget }
                : {
                    low: strToNum(row.expectedLow),
                    high: strToNum(row.expectedHigh),
                  }
            const calc = computeOutlook(row.targetPrice, range, currentPrice)
            const hasRange = calc.low != null && calc.high != null
            // 시나리오 확률가중 기대값 + 확률 합.
            let evSum = 0
            let evWeight = 0
            let probSum = 0
            for (const scenario of row.scenarios) {
              // BASE 목표가는 대표 목표가(단일 출처)를 사용 — 별도 입력 없음.
              const tgt =
                scenario.kind === 'BASE'
                  ? strToNum(row.targetPrice)
                  : strToNum(scenario.targetPrice)
              const prob = strToNum(scenario.probability)
              if (prob != null) probSum += prob
              if (tgt != null && prob != null) {
                evSum += tgt * prob
                evWeight += prob
              }
            }
            const expectedValue = evWeight > 0 ? evSum / evWeight : null
            const hasScenario = row.scenarios.some(
              (scenario) =>
                (scenario.kind !== 'BASE' && scenario.targetPrice.trim()) ||
                scenario.probability.trim(),
            )
            // 만기(목표일) 경과 → 검증 안내.
            const targetPast =
              !!row.targetDate && new Date(row.targetDate) < new Date()
            // 직전 목표가 대비 상향/하향.
            const priorTarget = strToNum(row.priorTargetPrice)
            const curTarget = strToNum(row.targetPrice)
            const revision =
              curTarget != null && priorTarget != null && priorTarget !== 0
                ? curTarget - priorTarget
                : null
            // 밸류에이션 산출값(멀티플 × 기준값).
            const multiple = strToNum(row.targetMultiple)
            const basis = strToNum(row.perShareBasis)
            const impliedTarget =
              multiple != null && basis != null ? multiple * basis : null
            return (
            <S.Row key={row.key}>
              <S.RowHeader>
                <S.RowTitleHost>
                  <InlineText
                    value={row.horizon}
                    onSave={(next) => updateRow(idx, { horizon: next })}
                    placeholder="전망 기간 (예: 다음 주, 2026 Q3)"
                    label="전망 기간"
                  />
                </S.RowTitleHost>
                {row.stance && (
                  <TonePill $tone={stanceTone(row.stance)}>
                    {STANCE_LABEL[row.stance]}
                  </TonePill>
                )}
                {row.confidence && (
                  <ConfChip>{CONFIDENCE_LABEL[row.confidence]}</ConfChip>
                )}
                {row.outcome && (
                  <TonePill $tone={outcomeTone(row.outcome)}>
                    {OUTCOME_LABEL[row.outcome]}
                  </TonePill>
                )}
                <S.ManageActions>
                  <S.IconBtn
                    type="button"
                    onClick={() => void removeRow(idx)}
                    aria-label="전망 삭제"
                    $danger
                  >
                    <FiTrash2 />
                  </S.IconBtn>
                </S.ManageActions>
              </S.RowHeader>

              {(calc.target != null || hasRange || calc.upside != null) && (
                <SummaryBar>
                  {calc.target != null && (
                    <SumItem>
                      <SumLabel>목표가</SumLabel>
                      <SumVal>{formatGrouped(calc.target)}</SumVal>
                    </SumItem>
                  )}
                  {hasRange && (
                    <SumItem>
                      <SumLabel>범위</SumLabel>
                      <SumVal>
                        {formatGrouped(calc.low as number)}~
                        {formatGrouped(calc.high as number)}
                      </SumVal>
                    </SumItem>
                  )}
                  {calc.upside != null && (
                    <SumItem>
                      <SumLabel>현재가 대비</SumLabel>
                      <ToneTag $tone={changeTone(calc.upside)}>
                        {calc.upside >= 0 ? '▲' : '▼'}{' '}
                        {calc.upside >= 0 ? '+' : ''}
                        {calc.upside.toFixed(1)}%
                      </ToneTag>
                    </SumItem>
                  )}
                  {calc.rr != null && (
                    <SumItem>
                      <SumLabel>리스크-리워드</SumLabel>
                      <SumVal>{calc.rr.toFixed(1)}x</SumVal>
                    </SumItem>
                  )}
                  {revision != null && revision !== 0 && (
                    <SumItem>
                      <SumLabel>직전 대비</SumLabel>
                      <ToneTag
                        $tone={revision > 0 ? 'positive' : 'negative'}
                      >
                        {revision > 0 ? '▲ 상향' : '▼ 하향'}{' '}
                        {formatGrouped(Math.abs(revision))}
                      </ToneTag>
                    </SumItem>
                  )}
                </SummaryBar>
              )}

              {hasRange && (
                <RangeGauge
                  calc={calc}
                  currentPrice={currentPrice}
                  stance={row.stance}
                />
              )}

              <S.RowMetaLine>
                <span>
                  <S.RowFieldLabel>방향</S.RowFieldLabel>
                  <InlineSelect
                    value={row.stance}
                    options={STANCE_OPTIONS}
                    onSave={(next) =>
                      updateRow(idx, { stance: next as OutlookStance | '' })
                    }
                    placeholder="선택"
                    label="전망 방향"
                  />
                </span>
                <span>
                  <S.RowFieldLabel>확신도</S.RowFieldLabel>
                  <InlineSelect
                    value={row.confidence}
                    options={CONFIDENCE_OPTIONS}
                    onSave={(next) =>
                      updateRow(idx, {
                        confidence: next as OutlookConfidence | '',
                      })
                    }
                    placeholder="선택"
                    label="확신도"
                  />
                </span>
                <span>
                  <S.RowFieldLabel>대표 목표가</S.RowFieldLabel>
                  <InlineText
                    value={row.targetPrice}
                    onSave={(next) => updateRow(idx, { targetPrice: next })}
                    placeholder="예: 230000"
                    label="대표 목표가"
                    formatRead={readGrouped}
                    numeric
                  />
                </span>
                <span>
                  <S.RowFieldLabel>직전 목표가</S.RowFieldLabel>
                  <InlineText
                    value={row.priorTargetPrice}
                    onSave={(next) =>
                      updateRow(idx, { priorTargetPrice: next })
                    }
                    placeholder="(선택)"
                    label="직전 목표가"
                    formatRead={readGrouped}
                    numeric
                  />
                </span>
              </S.RowMetaLine>

              <S.RowMetaLine>
                <span>
                  <S.RowFieldLabel>작성일</S.RowFieldLabel>
                  <InlineDate
                    value={row.asOf}
                    onSave={(next) => updateRow(idx, { asOf: next })}
                    emptyLabel="작성일 선택"
                    pickerTitle="작성일 선택"
                    blockBc
                    label="작성일"
                  />
                </span>
                <span>
                  <S.RowFieldLabel>목표일</S.RowFieldLabel>
                  <InlineDate
                    value={row.targetDate}
                    onSave={(next) => updateRow(idx, { targetDate: next })}
                    emptyLabel="목표일 선택"
                    pickerTitle="목표일 선택"
                    blockBc
                    label="목표일"
                  />
                </span>
              </S.RowMetaLine>

              {/* 분산 — 범위 vs 시나리오 택1(토글). 같은 '예상 범위'를 두 방식으로
                  중복 입력하지 않게 한 곳에서 전환한다. */}
              <SubBlock>
                <SubHead>
                  예상 범위
                  <ModeToggle>
                    <ModeBtn
                      type="button"
                      $active={mode === 'range'}
                      onClick={() => setDispMode(row.key, 'range')}
                    >
                      범위
                    </ModeBtn>
                    <ModeBtn
                      type="button"
                      $active={mode === 'scenario'}
                      onClick={() => setDispMode(row.key, 'scenario')}
                    >
                      시나리오
                    </ModeBtn>
                  </ModeToggle>
                  {mode === 'scenario' && expectedValue != null && (
                    <SubMeta>
                      기대값 {formatGrouped(Math.round(expectedValue))}
                    </SubMeta>
                  )}
                  {mode === 'scenario' && hasScenario && probSum !== 100 && (
                    <Warn as="span">확률 합 {probSum}%</Warn>
                  )}
                  {calc.bandReversed && (
                    <Warn as="span">하단이 상단보다 큽니다</Warn>
                  )}
                </SubHead>

                {mode === 'range' ? (
                  <S.RowMetaLine>
                    <span>
                      <S.RowFieldLabel>하단</S.RowFieldLabel>
                      <InlineText
                        value={row.expectedLow}
                        onSave={(next) =>
                          updateRow(idx, { expectedLow: next })
                        }
                        placeholder="예: 200000"
                        label="예상 하단"
                        formatRead={readGrouped}
                        numeric
                      />
                    </span>
                    <span>
                      <S.RowFieldLabel>상단</S.RowFieldLabel>
                      <InlineText
                        value={row.expectedHigh}
                        onSave={(next) =>
                          updateRow(idx, { expectedHigh: next })
                        }
                        placeholder="예: 260000"
                        label="예상 상단"
                        formatRead={readGrouped}
                        numeric
                      />
                    </span>
                  </S.RowMetaLine>
                ) : (
                  <ScenarioGrid>
                    {row.scenarios.map((scenario, sIdx) => (
                      <ScenarioRowEl key={scenario.kind}>
                        <TonePill $tone={scenarioTone(scenario.kind)}>
                          {SCENARIO_LABEL[scenario.kind]}
                        </TonePill>
                        <ScenarioField>
                          <S.RowFieldLabel>목표가</S.RowFieldLabel>
                          {scenario.kind === 'BASE' ? (
                            <ScenarioBase>
                              {row.targetPrice.trim()
                                ? formatGrouped(strToNum(row.targetPrice) ?? 0)
                                : '대표 목표가'}
                            </ScenarioBase>
                          ) : (
                            <InlineText
                              value={scenario.targetPrice}
                              onSave={(next) =>
                                updateScenario(idx, sIdx, { targetPrice: next })
                              }
                              placeholder="—"
                              label={`${SCENARIO_LABEL[scenario.kind]} 목표가`}
                              formatRead={readGrouped}
                              numeric
                            />
                          )}
                        </ScenarioField>
                        <ScenarioField>
                          <S.RowFieldLabel>확률</S.RowFieldLabel>
                          <InlineText
                            value={scenario.probability}
                            onSave={(next) =>
                              updateScenario(idx, sIdx, { probability: next })
                            }
                            placeholder="%"
                            label={`${SCENARIO_LABEL[scenario.kind]} 확률`}
                            numeric
                          />
                          <ScenarioPct>%</ScenarioPct>
                        </ScenarioField>
                      </ScenarioRowEl>
                    ))}
                  </ScenarioGrid>
                )}
              </SubBlock>

              {/* 핵심 변수 목록 */}
              <DriverBlock>
                <DriverHead>핵심 변수</DriverHead>
                <DriverBalanceBar drivers={row.drivers} />
                {row.drivers.length > 0 && (
                  <DriverList>
                    {row.drivers.map((driver, dIdx) => (
                      <DriverItem key={driver.key}>
                        {driver.impact && (
                          <ToneDot $tone={impactTone(driver.impact)} />
                        )}
                        <DriverName>
                          <InlineText
                            value={driver.name}
                            onSave={(next) =>
                              updateDriver(idx, dIdx, { name: next })
                            }
                            placeholder="변수명 (예: AI 가속기 수요)"
                            label="핵심 변수명"
                          />
                        </DriverName>
                        <DriverMeta>
                          <S.RowFieldLabel>역할</S.RowFieldLabel>
                          <InlineSelect
                            value={driver.role}
                            options={ROLE_OPTIONS}
                            onSave={(next) =>
                              updateDriver(idx, dIdx, {
                                role: next as DriverRole | '',
                              })
                            }
                            placeholder="—"
                            label="역할"
                          />
                        </DriverMeta>
                        <DriverMeta>
                          <S.RowFieldLabel>영향</S.RowFieldLabel>
                          <InlineSelect
                            value={driver.impact}
                            options={IMPACT_OPTIONS}
                            onSave={(next) =>
                              updateDriver(idx, dIdx, {
                                impact: next as DriverImpact | '',
                              })
                            }
                            placeholder="—"
                            label="영향"
                          />
                        </DriverMeta>
                        <DriverMeta>
                          <S.RowFieldLabel>중요도</S.RowFieldLabel>
                          <InlineSelect
                            value={driver.importance}
                            options={IMPORTANCE_OPTIONS}
                            onSave={(next) =>
                              updateDriver(idx, dIdx, {
                                importance: next as DriverImportance | '',
                              })
                            }
                            placeholder="—"
                            label="중요도"
                          />
                        </DriverMeta>
                        <DriverMeta>
                          <S.RowFieldLabel>예정일</S.RowFieldLabel>
                          <InlineDate
                            value={driver.eventDate}
                            onSave={(next) =>
                              updateDriver(idx, dIdx, { eventDate: next })
                            }
                            emptyLabel="—"
                            pickerTitle="촉매 예정일"
                            blockBc
                            label="예정일(촉매)"
                          />
                          {driver.eventDate &&
                            (() => {
                              const days = Math.ceil(
                                (new Date(driver.eventDate).getTime() -
                                  Date.now()) /
                                  86400000,
                              )
                              if (days < 0) return null
                              return (
                                <DDay $soon={days <= 14}>
                                  {days === 0 ? 'D-day' : `D-${days}`}
                                </DDay>
                              )
                            })()}
                        </DriverMeta>
                        <S.IconBtn
                          type="button"
                          onClick={() => removeDriver(idx, dIdx)}
                          aria-label="변수 삭제"
                          $danger
                        >
                          <FiTrash2 />
                        </S.IconBtn>
                        <DriverNote>
                          <S.RowFieldLabel>내용</S.RowFieldLabel>
                          <InlineRichText
                            value={driver.note ?? ''}
                            onSave={(next) =>
                              updateDriver(idx, dIdx, {
                                note: isVisuallyEmptyRichText(next)
                                  ? null
                                  : next,
                              })
                            }
                            placeholder="이 변수의 근거·세부 — 실적·수급·뉴스 등"
                            onPersonClick={onPersonClick}
                            stickyEditButton={false}
                          />
                        </DriverNote>
                      </DriverItem>
                    ))}
                  </DriverList>
                )}
                <DriverAdd type="button" onClick={() => addDriver(idx)}>
                  <FiPlus /> 변수 추가
                </DriverAdd>
              </DriverBlock>

              {/* 밸류에이션 근거(목표가 산출) */}
              <SubBlock>
                <SubHead>
                  밸류에이션
                  {impliedTarget != null && (
                    <SubMeta>
                      {row.valuationMethod
                        ? `${VALUATION_LABEL[row.valuationMethod]} `
                        : ''}
                      {formatGrouped(multiple as number)} ×{' '}
                      {row.basisLabel ? `${row.basisLabel} ` : ''}
                      {formatGrouped(basis as number)} ={' '}
                      {formatGrouped(Math.round(impliedTarget))}
                    </SubMeta>
                  )}
                </SubHead>
                <S.RowMetaLine>
                  <span>
                    <S.RowFieldLabel>방법</S.RowFieldLabel>
                    <InlineSelect
                      value={row.valuationMethod}
                      options={VALUATION_OPTIONS}
                      onSave={(next) =>
                        updateRow(idx, {
                          valuationMethod: next as ValuationMethod | '',
                        })
                      }
                      placeholder="선택"
                      label="밸류에이션 방법"
                    />
                  </span>
                  <span>
                    <S.RowFieldLabel>목표 멀티플</S.RowFieldLabel>
                    <InlineText
                      value={row.targetMultiple}
                      onSave={(next) =>
                        updateRow(idx, { targetMultiple: next })
                      }
                      placeholder="예: 15.0"
                      label="목표 멀티플"
                      numeric
                    />
                  </span>
                  <span>
                    <S.RowFieldLabel>주당 기준값</S.RowFieldLabel>
                    <InlineText
                      value={row.perShareBasis}
                      onSave={(next) =>
                        updateRow(idx, { perShareBasis: next })
                      }
                      placeholder="EPS/BPS"
                      label="주당 기준값"
                      formatRead={readGrouped}
                      numeric
                    />
                  </span>
                  <span>
                    <S.RowFieldLabel>기준 라벨</S.RowFieldLabel>
                    <InlineText
                      value={row.basisLabel}
                      onSave={(next) => updateRow(idx, { basisLabel: next })}
                      placeholder="예: 2026E EPS"
                      label="기준 라벨"
                    />
                  </span>
                </S.RowMetaLine>
              </SubBlock>

              {/* 사후 검증(만기 경과 시) */}
              {targetPast && (
                <VerifyBlock>
                  <SubHead>
                    검증
                    {!row.outcome && <Warn as="span">목표일 경과 · 결과 입력</Warn>}
                  </SubHead>
                  <S.RowMetaLine>
                    <span>
                      <S.RowFieldLabel>실현가</S.RowFieldLabel>
                      <InlineText
                        value={row.actualPrice}
                        onSave={(next) =>
                          updateRow(idx, { actualPrice: next })
                        }
                        placeholder="실제 종가"
                        label="실현가"
                        formatRead={readGrouped}
                        numeric
                      />
                    </span>
                    <span>
                      <S.RowFieldLabel>결과</S.RowFieldLabel>
                      <InlineSelect
                        value={row.outcome}
                        options={OUTCOME_OPTIONS}
                        onSave={(next) =>
                          updateRow(idx, {
                            outcome: next as OutlookOutcome | '',
                          })
                        }
                        placeholder="선택"
                        label="검증 결과"
                      />
                    </span>
                    <span>
                      <S.RowFieldLabel>검증일</S.RowFieldLabel>
                      <InlineDate
                        value={row.resolvedAt}
                        onSave={(next) => updateRow(idx, { resolvedAt: next })}
                        emptyLabel="검증일 선택"
                        pickerTitle="검증일"
                        blockBc
                        label="검증일"
                      />
                    </span>
                  </S.RowMetaLine>
                </VerifyBlock>
              )}

              <S.RowNarrative>
                <S.RowFieldLabel>근거</S.RowFieldLabel>
                <InlineRichText
                  value={row.rationale}
                  onSave={(next) => updateRow(idx, { rationale: next })}
                  placeholder="전망 근거 — 실적·수급·매크로 등"
                  onPersonClick={onPersonClick}
                  stickyEditButton={false}
                />
              </S.RowNarrative>

              <S.RowMetaLine>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <S.RowFieldLabel>출처</S.RowFieldLabel>
                  <InlineText
                    value={row.source}
                    onSave={(next) => updateRow(idx, { source: next })}
                    placeholder="출처 (선택)"
                    label="출처"
                  />
                </span>
                <span>
                  <S.RowFieldLabel>통화</S.RowFieldLabel>
                  <InlineText
                    value={row.currency}
                    onSave={(next) => updateRow(idx, { currency: next })}
                    placeholder="KRW"
                    label="통화"
                  />
                </span>
              </S.RowMetaLine>
            </S.Row>
            )
          })}
        </S.RowStack>
      )}

      <S.AddButton type="button" onClick={addRow}>
        <FiPlus /> 전망 추가
      </S.AddButton>
    </S.Section>
  )
}

/** 예상범위 게이지 — 현재가가 밴드의 어디에 있는지(여력)를 가로 막대로 시각화. */
function RangeGauge({
  calc,
  currentPrice,
  stance,
}: {
  calc: OutlookCalc
  currentPrice: number | null
  stance: OutlookStance | ''
}) {
  const { low, high, mid } = calc
  if (low == null || high == null) return null
  const anchors = [low, high, mid, currentPrice].filter(
    (value): value is number => value != null,
  )
  const min = Math.min(...anchors)
  const max = Math.max(...anchors)
  const span = max - min || 1
  const pos = (value: number) => ((value - min) / span) * 100
  const tone = stanceTone(stance)
  return (
    <Gauge>
      <Band
        $tone={tone}
        style={{ left: `${pos(low)}%`, width: `${pos(high) - pos(low)}%` }}
      />
      {mid != null && <MidTick $tone={tone} style={{ left: `${pos(mid)}%` }} />}
      {currentPrice != null && (
        <RefMarker style={{ left: `${pos(currentPrice)}%` }} title="현재가">
          <RefLabel>현재가</RefLabel>
        </RefMarker>
      )}
    </Gauge>
  )
}

/** 핵심 변수 호재 vs 악재 가중 균형 바(중요도 가중). net bias를 한눈에. */
function DriverBalanceBar({ drivers }: { drivers: DriverRow[] }) {
  let positive = 0
  let negative = 0
  for (const driver of drivers) {
    if (!driver.name.trim()) continue
    const weight = driverWeight(driver.importance)
    if (driver.impact === 'POSITIVE') positive += weight
    else if (driver.impact === 'NEGATIVE') negative += weight
  }
  const total = positive + negative
  if (total === 0) return null
  const positivePct = (positive / total) * 100
  return (
    <Balance>
      <BalanceTrack>
        {positive > 0 && <BalancePos style={{ width: `${positivePct}%` }} />}
        {negative > 0 && (
          <BalanceNeg style={{ width: `${100 - positivePct}%` }} />
        )}
      </BalanceTrack>
      <BalanceLabel>
        호재 {positive} : 악재 {negative}
      </BalanceLabel>
    </Balance>
  )
}

const ConfChip = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SummaryBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 22px;
  margin: 2px 0 4px;
`

const SumItem = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
`

const SumLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SumVal = styled.span`
  font-size: 0.9375rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Warn = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => toneColor('warning', theme.mode === 'dark')};
`

const Gauge = styled.div`
  position: relative;
  height: 24px;
  margin: 2px 0 6px;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background.secondary};
`

const Band = styled.div<{ $tone: Tone }>`
  position: absolute;
  top: 4px;
  bottom: 4px;
  border-radius: 4px;
  background: ${({ theme, $tone }) => toneSoftBg($tone, theme.mode === 'dark')};
  border: 1px solid
    ${({ theme, $tone }) => toneColor($tone, theme.mode === 'dark')}66;
`

const MidTick = styled.div<{ $tone: Tone }>`
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: 0;
  border-left: 1px dashed
    ${({ theme, $tone }) => toneColor($tone, theme.mode === 'dark')};
`

const RefMarker = styled.div`
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  transform: translateX(-50%);
  background: ${({ theme }) => theme.colors.text.primary};
  border-radius: 2px;
`

const RefLabel = styled.span`
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 9px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Balance = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
`

const BalanceTrack = styled.div`
  flex: 1;
  display: flex;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.primary};
`

const BalancePos = styled.div`
  height: 100%;
  background: ${({ theme }) => toneColor('positive', theme.mode === 'dark')};
`

const BalanceNeg = styled.div`
  height: 100%;
  background: ${({ theme }) => toneColor('negative', theme.mode === 'dark')};
`

const BalanceLabel = styled.span`
  flex-shrink: 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SubBlock = styled.div`
  margin: 4px 0 2px;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const VerifyBlock = styled(SubBlock)``

const SubHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 8px;
`

const SubMeta = styled.span`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ScenarioGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ScenarioRowEl = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

const ScenarioField = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
`

const ScenarioPct = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** BASE 시나리오 목표가 — 대표 목표가의 읽기전용 미러(별도 입력 없음). */
const ScenarioBase = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ModeToggle = styled.span`
  display: inline-flex;
  gap: 1px;
  padding: 1px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ModeBtn = styled.button<{ $active: boolean }>`
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 10px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  color: ${({ theme, $active }) =>
    $active ? '#ffffff' : theme.colors.text.tertiary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : 'transparent'};
`

const DriverBlock = styled.div`
  margin: 4px 0 2px;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const DriverHead = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 6px;
`

const DriverList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 6px;
`

const DriverItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`


const DriverName = styled.span`
  flex: 1;
  min-width: 120px;
  font-weight: 600;
`

/** 촉매 임박 D-day 배지(예정일 있는 변수). */
const DDay = styled.span<{ $soon: boolean }>`
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  color: ${({ theme, $soon }) =>
    $soon
      ? toneColor('warning', theme.mode === 'dark')
      : theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.primary};
`

/** 변수 내용(근거) — flex-wrap 내에서 전폭 줄로 떨어져 변수 아래 노출. */
const DriverNote = styled.div`
  flex-basis: 100%;
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding-left: 18px;
`

const DriverMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const DriverAdd = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 0;
`

/** server↔로컬 키 보존 동기화(serverId 우선, 없으면 위치). */
function syncRows(
  prev: OutlookRow[],
  server: CompanyOutlookItem[],
  nextKey: () => string,
  driverKey: () => string,
  catalystKey: () => string,
): OutlookRow[] {
  if (prev.length === server.length) {
    return server.map((srv, i) => {
      const p = prev[i]
      const prevIsAhead = p.serverId === undefined && p.horizon.trim() !== ''
      if (prevIsAhead) return p
      return makeRow(srv, p.key, driverKey, catalystKey)
    })
  }
  const prevUsed = new Array<boolean>(prev.length).fill(false)
  const next: OutlookRow[] = []
  for (const srv of server) {
    const matchedIdx = prev.findIndex(
      (p, i) => !prevUsed[i] && p.serverId === srv.id,
    )
    if (matchedIdx >= 0) {
      prevUsed[matchedIdx] = true
      next.push(makeRow(srv, prev[matchedIdx].key, driverKey, catalystKey))
    } else {
      next.push(makeRow(srv, nextKey(), driverKey, catalystKey))
    }
  }
  for (let i = 0; i < prev.length; i++) {
    if (!prevUsed[i]) next.push(prev[i])
  }
  return next
}
