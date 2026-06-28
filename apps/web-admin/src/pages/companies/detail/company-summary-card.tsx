/**
 * 개요 탭 우측 요약 카드 — 전체화면 전환 후 개요 탭의 빈 공간을 메운다. Hero가 이미
 * 정체성(상태·설립·국가·본사·웹사이트)을 보여주므로, 여기서는 *중복을 피해* 다른 탭에
 * 흩어진 핵심을 한 곳에 모은다: 재무 스냅샷(최신 주가·시총·평균 목표가·현재가 대비)과
 * 구성 현황(섹션별 건수). 읽기 전용.
 */
import styled from 'styled-components'

import type { CompanyDetail } from '@/shared/api/company'
import { formatCompactKo, formatGrouped } from '@/shared/lib/number-format'

import { toneColor } from './financial-tone'

interface Props {
  company: CompanyDetail
}

export function CompanySummaryCard({ company }: Props) {
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

  const finance: { label: string; value: string; tone?: string }[] = []
  if (currentPrice != null)
    finance.push({
      label: '최신 주가',
      value: `${formatGrouped(currentPrice)}${latest?.currency ? ` ${latest.currency}` : ''}`,
    })
  if (latest?.marketCap != null)
    finance.push({ label: '시가총액', value: formatCompactKo(latest.marketCap) })
  if (avgTarget != null)
    finance.push({ label: '평균 목표가', value: formatGrouped(avgTarget) })

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
                    color: toneColor(upside >= 0 ? 'positive' : 'negative', false),
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

      {counts.length > 0 && (
        <Section>
          <CardTitle>구성</CardTitle>
          <Chips>
            {counts.map((entry) => (
              <Chip key={entry.label}>
                {entry.label}
                <ChipN>{entry.count}</ChipN>
              </Chip>
            ))}
          </Chips>
        </Section>
      )}

      {finance.length === 0 && counts.length === 0 && (
        <Empty>
          주가·목표주가·연혁 등을 입력하면 이곳에 요약이 표시됩니다.
        </Empty>
      )}
    </Card>
  )
}

const Card = styled.aside`
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.secondary};
  padding: 20px 22px;
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
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

const Empty = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
