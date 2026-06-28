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

import type {
  AnalystRating,
  CompanyDetail,
  CompanyOutlookItem,
  OutlookStance,
} from '@/shared/api/company'
import { formatCompactKo, formatGrouped } from '@/shared/lib/number-format'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'

import { ratingTone, stanceTone, toneColor } from './financial-tone'
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
  const hasRatings = RATING_ORDER.some((key) => ratingDist[key] > 0)

  // 최신 전망(방향) — asOf 가장 나중의, stance 있는 전망.
  const latestOutlook = (company.outlooks ?? [])
    .filter((outlook) => outlook.stance)
    .reduce<CompanyOutlookItem | null>((best, outlook) => {
      if (!best) return outlook
      return (outlook.asOf ?? '') > (best.asOf ?? '') ? outlook : best
    }, null)

  // 데이터 현황 — 항상 표시. 완성도 N/6 + 다음 권장 액션.
  const checklist = [
    {
      filled: !isVisuallyEmptyRichText(company.description ?? ''),
      hint: '회사 개요를 작성해 보세요.',
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
      {finance.length > 0 && (
        <Section>
          <CardTitle>재무 스냅샷</CardTitle>
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
        </Section>
      )}

      {hasRatings && (
        <Section>
          <CardTitle>투자의견 분포</CardTitle>
          <Pills>
            {RATING_ORDER.filter((key) => ratingDist[key] > 0).map((key) => (
              <TonePill key={key} $tone={ratingTone(key)}>
                {RATING_LABEL[key]} {ratingDist[key]}
              </TonePill>
            ))}
          </Pills>
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
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.secondary};
  padding: 20px 22px;
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  /* 섹션 사이 구분선 — 어느 섹션이 빠져도(조건부 렌더) 인접 섹션 간에만 표시. */
  & + & {
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
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
  background: ${({ theme }) => theme.colors.text.tertiary};
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
