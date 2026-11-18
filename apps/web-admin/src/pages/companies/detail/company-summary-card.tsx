/**
 * 개요 탭 우측 요약 카드 — 전체화면 전환 후 개요 탭의 빈 공간을 메운다.
 *
 * Hero가 이미 *정체성*(로고·회사명·약칭·상태·설립/해산·국가·본사·창립자·웹사이트)을
 * 보여주므로 이 카드는 **정체성 필드를 절대 재노출하지 않는다**(중복 금지 경계). 대신
 * 다른 탭에 흩어진 *신호와 진척*을 한 곳에 모은다:
 *   1) 재무 스냅샷(최신 주가·시총·평균 목표가·현재가 대비)
 *   2) 투자의견 분포(증권사 컨센서스) — 재무 탭에만 있던 신호를 끌어올림
 *   3) 최신 전망(방향) — 재무 탭에만 있던 신호를 끌어올림
 *   4) 데이터 현황(완성도·구성·다음 권장) — **데이터가 없어도 항상 표시**해 빈 기업의
 *      "이중 공백"(좌측 description 미입력 + 우측 카드 공백)을 근본적으로 없앤다.
 * 읽기 전용. 스키마 변경 없음(모두 기존 CompanyDetail 응답 필드만 사용).
 */
import styled, { useTheme } from 'styled-components'

import {
  MiniSvgSparkline,
  type SegmentSlice,
  type SparkPoint,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import type {
  AnalystRating,
  CompanyDetail,
  CompanyOutlookItem,
  OutlookStance,
} from '@/shared/api/company'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { formatCompactKo, formatGrouped } from '@/shared/lib/number-format'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'

import { stanceTone, toneColor } from './financial-tone'
import { TonePill } from './tone-pill'

interface Props {
  company: CompanyDetail
}

const RATING_ORDER: AnalystRating[] = [
  'STRONG_BUY',
  'BUY',
  'HOLD',
  'SELL',
  'STRONG_SELL',
]
const RATING_LABEL: Record<AnalystRating, string> = {
  STRONG_BUY: '강력매수',
  BUY: '매수',
  HOLD: '중립',
  SELL: '매도',
  STRONG_SELL: '강력매도',
}
const STANCE_LABEL: Record<OutlookStance, string> = {
  BULLISH: '강세',
  NEUTRAL: '중립',
  BEARISH: '약세',
}

const RATING_SLICE_COLORS: Record<
  AnalystRating,
  { light: string; dark: string }
> = {
  STRONG_BUY: { light: '#059669', dark: '#34d399' },
  BUY: { light: '#0d9488', dark: '#2dd4bf' },
  HOLD: { light: '#64748b', dark: '#94a3b8' },
  SELL: { light: '#ef4444', dark: '#fca5a5' },
  STRONG_SELL: { light: '#b91c1c', dark: '#f87171' },
}

function buildCompanySparkSeries(company: CompanyDetail): {
  label: string
  points: SparkPoint[]
  formatValue: (val: number) => string
} | null {
  const rawList = company.stockPoints ?? []
  if (rawList.length === 0) return null

  const extractByMetric = (
    pick: (pt: (typeof rawList)[number]) => number | null,
  ) => {
    const dated: Array<{
      year: number
      month: number
      day: number
      sortKey: number
      value: number
      currency: string | null
    }> = []
    for (const pt of rawList) {
      const val = pick(pt)
      if (val == null || !Number.isFinite(val)) continue
      const parts = parseIsoDateParts(pt.date)
      if (!parts) continue
      dated.push({
        year: parts.year,
        month: parts.month,
        day: parts.day,
        sortKey: parts.year * 10_000 + parts.month * 100 + parts.day,
        value: val,
        currency: pt.currency ?? null,
      })
    }
    dated.sort((a, b) => a.sortKey - b.sortKey)
    return dated
  }

  const pricePts = extractByMetric((pt) => pt.price)
  const capPts = pricePts.length === 0 ? extractByMetric((pt) => pt.marketCap) : []
  const revPts =
    pricePts.length === 0 && capPts.length === 0
      ? extractByMetric((pt) => pt.revenue)
      : []

  const chosen =
    pricePts.length > 0 ? pricePts : capPts.length > 0 ? capPts : revPts
  if (chosen.length === 0) return null

  const distinctYears = new Set(chosen.map((c) => c.year))
  let points: SparkPoint[]
  if (distinctYears.size >= 2 || chosen.length === 1) {
    const byYear = new Map<number, number>()
    for (const item of chosen) {
      byYear.set(item.year, item.value)
    }
    points = [...byYear.entries()].map(([year, value]) => ({ year, value }))
  } else {
    points = chosen.map((item, idx) => ({
      year: Number(
        (
          item.year +
          (item.month - 1) / 12 +
          (item.day - 1) / 365 +
          idx * 0.001
        ).toFixed(2),
      ),
      value: item.value,
    }))
  }

  const lastCurrency = chosen[chosen.length - 1]?.currency ?? null
  if (pricePts.length > 0) {
    return {
      label: `주가 추이${lastCurrency ? ` (${lastCurrency})` : ''}`,
      points,
      formatValue: (val) =>
        `${formatGrouped(val)}${lastCurrency ? ` ${lastCurrency}` : ''}`,
    }
  }
  if (capPts.length > 0) {
    return {
      label: '시가총액 추이',
      points,
      formatValue: (val) => formatCompactKo(val),
    }
  }
  return {
    label: '매출 추이',
    points,
    formatValue: (val) => formatCompactKo(val),
  }
}

export function CompanySummaryCard({ company }: Props) {
  const dark = useTheme().mode === 'dark'

  // 최신 주가 시점(가격 있는 것 중 가장 나중).
  const latest = [...(company.stockPoints ?? [])]
    .reverse()
    .find((point) => point.price != null)
  const currentPrice = latest?.price ?? null

  const targets = (company.analystRatings ?? [])
    .map((rating) => rating.targetPrice)
    .filter((value): value is number => value != null)
  const avgTarget =
    targets.length > 0
      ? targets.reduce((sum, value) => sum + value, 0) / targets.length
      : null
  const upside =
    avgTarget != null && currentPrice && currentPrice > 0
      ? ((avgTarget - currentPrice) / currentPrice) * 100
      : null

  const finance: { label: string; value: string }[] = []
  if (currentPrice != null)
    finance.push({
      label: '최신 주가',
      value: `${formatGrouped(currentPrice)}${latest?.currency ? ` ${latest.currency}` : ''}`,
    })
  if (latest?.marketCap != null)
    finance.push({ label: '시가총액', value: formatCompactKo(latest.marketCap) })
  if (avgTarget != null)
    finance.push({ label: '평균 목표가', value: formatGrouped(avgTarget) })

  // 투자의견 분포(컨센서스) — 재무 탭 analystRatings에서 끌어옴.
  const ratingDist: Record<AnalystRating, number> = {
    STRONG_BUY: 0,
    BUY: 0,
    HOLD: 0,
    SELL: 0,
    STRONG_SELL: 0,
  }
  for (const rating of company.analystRatings ?? [])
    if (rating.rating) ratingDist[rating.rating] += 1
  const totalRatings = RATING_ORDER.reduce((sum, key) => sum + ratingDist[key], 0)
  const hasRatings = totalRatings > 0
  const ratingSlices: SegmentSlice[] = RATING_ORDER.map((key) => ({
    key,
    label: RATING_LABEL[key],
    value: ratingDist[key],
    color: dark ? RATING_SLICE_COLORS[key].dark : RATING_SLICE_COLORS[key].light,
  }))
  const sparkSeries = buildCompanySparkSeries(company)

  // 최신 전망(방향) — asOf 가장 나중의, stance 있는 전망.
  const latestOutlook = (company.outlooks ?? [])
    .filter((outlook) => outlook.stance)
    .reduce<CompanyOutlookItem | null>((best, outlook) => {
      if (!best) return outlook
      return (outlook.asOf ?? '') > (best.asOf ?? '') ? outlook : best
    }, null)

  // 데이터 현황 — 항상 표시. 완성도 N/7 + 다음 권장 액션.
  const checklist = [
    {
      filled: !isVisuallyEmptyRichText(company.description ?? ''),
      hint: '회사 개요를 작성해 보세요.',
    },
    {
      filled: !isVisuallyEmptyRichText(company.foundingBackground ?? ''),
      hint: '설립 배경을 적어 보세요 — 누가·왜 세웠는지.',
    },
    {
      filled: (company.stockPoints?.length ?? 0) > 0,
      hint: '주가를 입력하면 추이·시가총액이 표시됩니다.',
    },
    {
      filled: (company.analystRatings?.length ?? 0) > 0,
      hint: '증권사 목표주가를 모으면 컨센서스가 집계됩니다.',
    },
    {
      filled: (company.histories?.length ?? 0) > 0,
      hint: '연혁을 추가해 타임라인을 만들어 보세요.',
    },
    {
      filled: (company.products?.length ?? 0) > 0,
      hint: '대표 제품을 등록해 보세요.',
    },
    {
      filled: (company.facilities?.length ?? 0) > 0,
      hint: '본사·공장 등 시설을 추가해 보세요.',
    },
  ]
  const filledCount = checklist.filter((entry) => entry.filled).length
  const nextHint = checklist.find((entry) => !entry.filled)?.hint ?? null

  const counts: { label: string; count: number }[] = [
    { label: '연혁', count: company.histories?.length ?? 0 },
    { label: '제품', count: company.products?.length ?? 0 },
    { label: '주가 시점', count: company.stockPoints?.length ?? 0 },
    { label: '목표주가', count: company.analystRatings?.length ?? 0 },
    { label: '전망', count: company.outlooks?.length ?? 0 },
    { label: '시설', count: company.facilities?.length ?? 0 },
  ].filter((entry) => entry.count > 0)

  return (
    <Card>
      {(finance.length > 0 || sparkSeries != null) && (
        <Section>
          <CardTitle>재무 스냅샷</CardTitle>
          {sparkSeries && (
            <SparkBox>
              <SparkLabelRow>
                <span>{sparkSeries.label}</span>
                <span>{sparkSeries.points.length}개 시점</span>
              </SparkLabelRow>
              <MiniSvgSparkline
                points={sparkSeries.points}
                height={56}
                formatValue={sparkSeries.formatValue}
              />
            </SparkBox>
          )}
          {finance.length > 0 && (
            <Dl>
              {finance.map((row) => (
                <Row key={row.label}>
                  <Dt>{row.label}</Dt>
                  <Dd $numeric>{row.value}</Dd>
                </Row>
              ))}
              {upside != null && (
                <Row>
                  <Dt>현재가 대비</Dt>
                  <Dd
                    $numeric
                    style={{
                      color: toneColor(upside >= 0 ? 'positive' : 'negative', dark),
                      fontWeight: 700,
                    }}
                  >
                    {upside >= 0 ? '+' : ''}
                    {upside.toFixed(1)}%
                  </Dd>
                </Row>
              )}
            </Dl>
          )}
        </Section>
      )}

      {hasRatings && (
        <Section>
          <SectionTitleRow>
            <CardTitle>투자의견 분포</CardTitle>
            <CountBadge>{totalRatings}건</CountBadge>
          </SectionTitleRow>
          <StackedSegmentBar slices={ratingSlices} height={9} />
        </Section>
      )}

      {latestOutlook?.stance && (
        <Section>
          <CardTitle>최신 전망</CardTitle>
          <Pills>
            <TonePill $tone={stanceTone(latestOutlook.stance)}>
              {STANCE_LABEL[latestOutlook.stance]}
            </TonePill>
          </Pills>
        </Section>
      )}

      <Section>
        <CardTitle>데이터 현황</CardTitle>
        <StatRow>
          <StatLabel>완성도</StatLabel>
          <StatValue>
            {filledCount}/{checklist.length}
          </StatValue>
        </StatRow>
        <Progress
          role="progressbar"
          aria-valuenow={filledCount}
          aria-valuemin={0}
          aria-valuemax={checklist.length}
          aria-label="기업 데이터 완성도"
        >
          <ProgressFill
            style={{ width: `${(filledCount / checklist.length) * 100}%` }}
          />
        </Progress>
        {counts.length > 0 && (
          <Chips>
            {counts.map((entry) => (
              <Chip key={entry.label}>
                {entry.label}
                <ChipN>{entry.count}</ChipN>
              </Chip>
            ))}
          </Chips>
        )}
        {nextHint && <Hint>다음 권장 — {nextHint}</Hint>}
      </Section>
    </Card>
  )
}

const Card = styled.aside`
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: none;
  padding: 18px 20px;
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  /*
   * 섹션 사이 구분선 — 어느 섹션이 빠져도(조건부 렌더) 인접 섹션 간에만 표시.
   * ⚠️ '& + &'로 쓰지 말 것: styled-components가 테마별 클래스로 펼친 형제 선택자를 남겨,
   * 다크 → 라이트로 돌아와도 나중에 주입된 다크 규칙이 이겨 구분선이 다크 색(#212121)으로 남았다
   * (검토 F15, 실측). 카드의 자식은 이 섹션뿐이라 :not(:first-child)로 같은 뜻이 된다.
   */
  &:not(:first-child) {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const CountBadge = styled.span`
  ${DIGIT_DISPLAY}
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const SparkBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 11px 8px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const SparkLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Dl = styled.dl`
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 11px;
`

const Row = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
`

const Dt = styled.dt`
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Dd = styled.dd<{ $numeric?: boolean }>`
  margin: 0;
  text-align: right;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  ${({ $numeric }) => $numeric && 'font-variant-numeric: tabular-nums;'}
`

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const StatRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
`

const StatLabel = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StatValue = styled.span`
  font-size: 0.9375rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Progress = styled.div`
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.border.light};
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  transition: width 0.2s ease;
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 999px;
  padding: 3px 6px 3px 11px;
`

const ChipN = styled.span`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 999px;
  min-width: 20px;
  text-align: center;
  padding: 1px 6px;
`

const Hint = styled.div`
  font-size: 0.8125rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
