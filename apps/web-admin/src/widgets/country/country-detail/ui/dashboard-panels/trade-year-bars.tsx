import { useMemo } from 'react'

import styled, { useTheme } from 'styled-components'

import {
  directionColor,
  formatTradeValue,
  VALUE_SCALE_LABEL,
  VALUE_SCALE_MULTIPLIER,
} from '@/entities/trade/vocab'
import { axisTicks, niceAxis } from '@/shared/lib/nice-axis'

type ValueScale = keyof typeof VALUE_SCALE_MULTIPLIER

export interface TradeYearRow {
  id: string
  label: string
  exportValue: number | null
  importValue: number | null
  currencyCode: string | null
  valueScale: ValueScale
}

interface Props {
  /** 오래된 → 최신 순으로 들어온다 */
  years: TradeYearRow[]
  selectedId: string
  onSelect: (id: string) => void
}

/**
 * 한 열에 세로로 쌓이는 숫자는 소수 자릿수를 맞춘다 — 3,296.6 옆에 3,277이 오면
 * 정밀도가 다른 값처럼 보인다. 자릿수가 커져 formatTradeValue가 '억·조'로 접는
 * 구간에서는 그쪽에 맡긴다(그때는 이미 자릿수가 통일돼 있다).
 */
function amountFormatter(values: number[]) {
  const finite = values.filter((value) => Number.isFinite(value))
  const compact = finite.some((value) => Math.abs(value) >= 10_000)
  const decimals = finite.some((value) => !Number.isInteger(value)) ? 1 : 0
  return (value: number) =>
    compact
      ? formatTradeValue(value)
      : value.toLocaleString('ko-KR', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
}

/** 'USD 십억' — 배율이 없으면 통화만 */
function unitOf(row: TradeYearRow): string {
  return [
    row.currencyCode,
    row.valueScale !== 'ONE' ? VALUE_SCALE_LABEL[row.valueScale] : null,
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * 연도별 교역 규모.
 *
 * 예전엔 두 그림이 따로 있었다 — 최신 연도만 보여주는 '규모 막대'와 전 연도를 훑는
 * '추이선'. 둘이 같은 이야기를 두 번 하면서 각자 반쪽만 했다: 규모 막대는 그 해의
 * 축(둘 중 큰 값)을 100%로 삼아 **해마다 축이 달라져** 연도 비교가 불가능했고,
 * 추이선은 3개 연도의 거의 평평한 두 선이라 수출·수입의 격차가 눈에 안 들어왔다.
 *
 * 해마다 두 막대를 **공통 축**에 눕히면 셋이 한 번에 읽힌다 — 그 해의 규모, 해마다의
 * 증감, 그리고 두 막대 사이 간격인 무역수지. 연도 선택도 여기서 한다(옛 연도 탭이
 * 하던 일). 그림 하나가 세 자리의 몫을 한다.
 */
export function TradeYearBars({ years, selectedId, onSelect }: Props) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const exportColor = directionColor('EXPORT', isDark)
  const importColor = directionColor('IMPORT', isDark)

  const chart = useMemo(() => {
    /* 최신이 위 — 대시보드는 지금 상태부터 읽는다 */
    const rows = [...years].reverse()
    const baseline = rows[0]
    const baseUnit = baseline ? unitOf(baseline) : ''
    /*
     * 통화가 다르면 한 축에 못 눕힌다(환율을 모른다). 배율만 다른 건 곱해서 맞춘다.
     * 못 맞추는 해는 막대 없이 숫자와 단위만 적는다 — 길이로 거짓말하지 않는다.
     */
    const axisOf = (row: TradeYearRow, value: number | null) => {
      if (value == null) return null
      if (row.currencyCode !== baseline?.currencyCode) return null
      return value * VALUE_SCALE_MULTIPLIER[row.valueScale]
    }
    const amounts = rows.flatMap((row) =>
      [row.exportValue, row.importValue, 
        row.exportValue != null && row.importValue != null
          ? row.exportValue - row.importValue
          : null,
      ].filter((value): value is number => value != null),
    )
    const format = amountFormatter(amounts)
    let peak = 0
    for (const row of rows) {
      for (const value of [
        axisOf(row, row.exportValue),
        axisOf(row, row.importValue),
      ]) {
        if (value != null) peak = Math.max(peak, value)
      }
    }
    /*
     * 축 끝을 그냥 최대값에 맞추면 가장 긴 막대가 늘 트랙을 꽉 채우고, 눈금은
     * 3,296.6 같은 데이터 값이 되어 읽히지 않는다. 딱 떨어지는 값까지 올려 두면
     * 눈금이 0·1,000·2,000…이 되고 막대가 축의 어디쯤인지도 함께 읽힌다.
     */
    const axis = niceAxis(peak)
    const max = axis.max
    return {
      rows: rows.map((row) => {
        const unit = unitOf(row)
        const balance =
          row.exportValue != null && row.importValue != null
            ? row.exportValue - row.importValue
            : null
        const ratio =
          row.exportValue != null &&
          row.importValue != null &&
          row.exportValue > 0 &&
          row.importValue > 0
            ? Math.max(row.exportValue, row.importValue) /
              Math.min(row.exportValue, row.importValue)
            : null
        const pair =
          row.exportValue != null && row.importValue != null
            ? row.exportValue >= row.importValue
              ? { lower: 'IMPORT' as const, upper: 'EXPORT' as const }
              : { lower: 'EXPORT' as const, upper: 'IMPORT' as const }
            : null
        const valueOf = (side: 'EXPORT' | 'IMPORT') =>
          side === 'EXPORT' ? row.exportValue : row.importValue
        const soloSide: 'EXPORT' | 'IMPORT' | null =
          row.exportValue != null && row.importValue == null
            ? 'EXPORT'
            : row.importValue != null && row.exportValue == null
              ? 'IMPORT'
              : null
        return {
          ...row,
          balance,
          ratio,
          /* 한 막대 안: [0~작은 쪽]은 작은 쪽 색, [작은 쪽~큰 쪽]이 곧 무역수지 */
          lowerSide: pair?.lower ?? soloSide,
          upperSide: pair?.upper ?? null,
          lowerPct:
            pair && max > 0
              ? ((axisOf(row, valueOf(pair.lower)) ?? 0) / max) * 100
              : soloSide && max > 0
                ? ((axisOf(row, valueOf(soloSide)) ?? 0) / max) * 100
                : 0,
          upperPct:
            pair && max > 0
              ? ((axisOf(row, valueOf(pair.upper)) ?? 0) / max) * 100
              : 0,
          /* 단위가 기준과 다른 해만 꼬리표를 단다 — 같으면 위에 한 번 적힌 걸로 족하다 */
          unitTag: unit && unit !== baseUnit ? unit : null,
          exportRatio:
            max > 0 ? ((axisOf(row, row.exportValue) ?? 0) / max) * 100 : 0,
          importRatio:
            max > 0 ? ((axisOf(row, row.importValue) ?? 0) / max) * 100 : 0,
        }
      }),
      baseUnit,
      format,
      /* 눈금은 배율을 되돌려 그 해 단위의 숫자로 적는다 */
      ticks: axisTicks(axis).map((tick, index, all) => {
        const inUnit = tick / VALUE_SCALE_MULTIPLIER[baseline?.valueScale ?? 'ONE']
        return {
          value: tick,
          /*
           * 축은 딱 떨어지는 값이라 소수를 붙이지 않는다 (값 열과 규칙이 다르다).
           * 단, 자릿수가 크면 값 열처럼 '억·조'로 접는다 — 배율 없이(USD 그대로) 들어온
           * 해는 눈금이 '200,000,000,000'으로 찍혀, 옆 값 열의 '6,830억'과 같은 축으로
           * 읽히지 않았다.
           */
          label:
            Number.isInteger(inUnit) && Math.abs(inUnit) < 10_000
              ? inUnit.toLocaleString('ko-KR')
              : format(inUnit),
          at: all.length > 1 ? (index / (all.length - 1)) * 100 : 0,
        }
      }),
    }
  }, [years])

  if (chart.rows.length === 0) return null

  return (
    <Wrap>
      <Head>
        <Caption>연도별 교역 규모</Caption>
        {chart.baseUnit && <Unit>단위 {chart.baseUnit}</Unit>}
        <Legend>
          <LegendItem $color={exportColor}>수출</LegendItem>
          <LegendItem $color={importColor}>수입</LegendItem>
        </Legend>
        <Hint>
          색이 갈리는 지점이 적은 쪽 · 그 사이가 무역수지
          {chart.rows.length > 1 && ' · 연도를 눌러 그 해 보기'}
        </Hint>
      </Head>

      <Rows
        role="group"
        aria-label="연도별 교역 규모"
        $scroll={chart.rows.length > 8}
      >
        {chart.rows.map((row) => {
          const active = row.id === selectedId
          return (
            <YearRow
              key={row.id}
              type="button"
              $active={active}
              aria-pressed={active}
              aria-label={[
                row.label,
                row.exportValue != null
                  ? `수출 ${chart.format(row.exportValue)}`
                  : null,
                row.importValue != null
                  ? `수입 ${chart.format(row.importValue)}`
                  : null,
                row.balance != null
                  ? `무역수지 ${chart.format(row.balance)} ${row.balance >= 0 ? '흑자' : '적자'}`
                  : null,
              ]
                .filter(Boolean)
                .join(', ')}
              onClick={() => onSelect(row.id)}
            >
              <YearLabel $active={active}>{row.label}</YearLabel>

              {/*
                한 막대가 세 값을 진다 — 막대 끝이 큰 쪽, 색이 갈리는 지점이 작은 쪽,
                그 사이 구간이 무역수지다. 두 막대를 위아래로 두던 때는 수지가 두 끝의
                '층계'로 암시될 뿐이라 숫자를 봐야 알 수 있었다.
              */}
              <Track $ticks={chart.ticks.length - 1}>
                {row.upperSide && (
                  <Segment
                    $color={directionColor(row.upperSide, isDark)}
                    style={{ width: `${row.upperPct}%` }}
                  />
                )}
                {row.lowerSide && (
                  <Segment
                    $color={directionColor(row.lowerSide, isDark)}
                    style={{ width: `${row.lowerPct}%` }}
                  />
                )}
                {/* 라벨은 트랙 기준으로 앉힌다 — 구간(Segment) 안에 넣으면 %가 구간
                    폭 기준이 되어 색 경계 왼쪽으로 새고, 절반이 초록 위 흰 글씨가 된다 */}
                {row.balance != null && (
                  <GapLabel
                    style={{
                      left: `${row.lowerPct}%`,
                      width: `${row.upperPct - row.lowerPct}%`,
                    }}
                    $width={row.upperPct - row.lowerPct}
                  >
                    {chart.format(Math.abs(row.balance))}
                    {row.upperPct - row.lowerPct >= 13 &&
                      ` ${row.balance >= 0 ? '흑자' : '적자'}`}
                  </GapLabel>
                )}
              </Track>

              <Amounts>
                <Amount>
                  <Dot $color={exportColor} />
                  {row.exportValue != null ? chart.format(row.exportValue) : '—'}
                  {row.unitTag && row.exportValue != null && (
                    <UnitTag> {row.unitTag}</UnitTag>
                  )}
                </Amount>
                <Amount>
                  <Dot $color={importColor} />
                  {row.importValue != null ? chart.format(row.importValue) : '—'}
                  {row.unitTag && row.importValue != null && (
                    <UnitTag> {row.unitTag}</UnitTag>
                  )}
                </Amount>
              </Amounts>
            </YearRow>
          )
        })}
      </Rows>

      {/* 눈금이 없으면 막대 길이가 무엇 대비인지 알 수 없다 — 값 열이 있어도
          '축의 어디쯤'은 눈금만이 답한다 */}
      <AxisRow aria-hidden="true">
        <span />
        <AxisTicks>
          {chart.ticks.map((tick, index) => (
            <AxisTick
              key={tick.value}
              style={{ left: `${tick.at}%` }}
              $align={
                index === 0
                  ? 'start'
                  : index === chart.ticks.length - 1
                    ? 'end'
                    : 'center'
              }
            >
              {tick.label}
            </AxisTick>
          ))}
        </AxisTicks>
        <span />
      </AxisRow>
    </Wrap>
  )
}

const Wrap = styled.div`
  margin-bottom: 18px;
`

const Head = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
`

const Caption = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Unit = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Legend = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 12px;
`

const LegendItem = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  &::before {
    content: '';
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: ${({ $color }) => $color};
  }
`

const Hint = styled.span`
  margin-left: auto;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Rows = styled.div<{ $scroll: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  ${({ $scroll }) =>
    $scroll &&
    `max-height: 336px;
     overflow-y: auto;
     scrollbar-width: thin;`}
`

/**
 * 한 해 = 두 줄(수출·수입). 연도와 무역수지는 두 줄에 걸쳐 한 번만 적는다 —
 * 같은 말을 두 번 적으면 목록이 아니라 표로 읽힌다.
 */
const COLUMNS = '62px minmax(0, 1fr) 128px'

const YearRow = styled.button<{ $active: boolean }>`
  display: grid;
  grid-template-columns: ${COLUMNS};
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 10px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(15,23,42,0.05)'
      : 'transparent'};
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(15,23,42,0.05)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.035)'
          : 'rgba(15,23,42,0.025)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }

`

const YearLabel = styled.span<{ $active: boolean }>`
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  font-variant-numeric: tabular-nums;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
`

const Amounts = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`

const Track = styled.span<{ $ticks: number }>`
  position: relative;
  height: 20px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'};

  /* 눈금선은 빈 트랙에만 비친다 — 막대가 덮으면 데이터가 앞이고 격자는 뒤다 */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      to right,
      transparent 0,
      transparent calc(100% / ${({ $ticks }) => $ticks} - 1px),
      ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(255,255,255,0.16)'
            : 'rgba(15,23,42,0.12)'}
        calc(100% / ${({ $ticks }) => $ticks} - 1px),
      ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(255,255,255,0.16)'
            : 'rgba(15,23,42,0.12)'}
        calc(100% / ${({ $ticks }) => $ticks})
    );
  }
`

/**
 * 두 구간을 **겹쳐** 그린다 — 큰 쪽을 먼저 깔고 작은 쪽이 왼쪽부터 덮는다.
 * 그래서 남는 꼬리가 정확히 무역수지 폭이 된다. 누적(수출+수입)이 아니라는 건
 * 헤더 한 줄과 구간 안 숫자가 말한다.
 */
const Segment = styled.span<{ $color: string }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: ${({ $color }) => $color};
`

/** 수지 폭은 구간 안에 직접 적는다 — 들어갈 때만 (안 들어가면 오른쪽 숫자가 받는다) */
const GapLabel = styled.span<{ $width: number }>`
  position: absolute;
  top: 0;
  bottom: 0;
  display: ${({ $width }) => ($width >= 7 ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  /* 흰 글씨는 방향색 위에서 3.2:1까지만 나온다 — 작은 글씨엔 모자라 먹으로 쓴다
     (같은 색에서 먹은 5.4~5.8:1) */
  color: #101418;
  white-space: nowrap;
  pointer-events: none;
`

const Dot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const Amount = styled.span`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.primary};
`

const UnitTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const AxisRow = styled.div`
  display: grid;
  grid-template-columns: ${COLUMNS};
  gap: 12px;
  padding: 0 10px;
  margin-top: 6px;
`

const AxisTicks = styled.div`
  position: relative;
  height: 16px;
`

/**
 * 눈금 숫자는 눈금선 **바로 그 위치**에 놓는다 — space-between으로 흩뿌리면 선과
 * 글자가 어긋나고(라벨 넷이 뭉쳐 '1,000.02,000.0'으로 붙었다), 양 끝은 트랙 밖으로
 * 삐져나간다. 그래서 left %로 앉히고 양 끝만 안쪽으로 정렬한다.
 */
const AxisTick = styled.span<{ $align: 'start' | 'center' | 'end' }>`
  position: absolute;
  top: 0;
  white-space: nowrap;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  transform: translateX(
    ${({ $align }) =>
      $align === 'start' ? '0' : $align === 'end' ? '-100%' : '-50%'}
  );
`


