import { useMemo, useState } from 'react'

import {
  useExportImports,
  type ExportImportItem,
} from '@/entities/country/api.trade'
import {
  categoryColor,
  CHANNEL_LABEL,
  formatTradeValue,
  formatTradeYear,
  VALUE_SCALE_LABEL,
} from '@/entities/trade/vocab'

import { CountryDataManagerModal } from '../country-data-manager/country-data-manager-modal'
import { IconChart } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'

interface TradeSectionProps {
  countryId: string
  countryName: string
}

/** decimal은 SDK에서 문자열로 오기도 한다 — 숫자로 못 읽으면 null */
function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

/**
 * 교역 — 연도별 총액·무역수지, 그리고 **무엇을 · 누구와** 주고받았는지.
 *
 * 세 층으로 읽힌다:
 *  1) 총액 — 얼마나 (통화·단위를 함께 적어야 비교가 된다)
 *  2) 분류 구성 막대 — 무엇 위주의 나라인가 (원유·석탄이 따로 놓이면 '에너지 60%'가 사라진다)
 *  3) 품목·상대 칩 — 구체적으로 무엇을, 누구와
 *
 * 자료가 없으면 **아무것도 그리지 않는다**. 빈 섹션을 세우면 지면이 "없습니다"로
 * 끝나던 옛 문제(검토서 A5)를 되풀이한다 — 등록 진입은 대시보드의 한 줄 안내가 맡는다.
 */
export function TradeSection({ countryId, countryName }: TradeSectionProps) {
  const [managerOpen, setManagerOpen] = useState(false)
  const query = useExportImports(countryId)

  const years = useMemo(() => {
    return (query.data ?? [])
      .map((row) => ({
        id: row.id,
        era: row.era,
        year: Number(row.year),
        signedYear: Number(row.signedYear),
        periodEndYear: row.periodEndYear,
        exportValue: toNumber(row.exportValue),
        importValue: toNumber(row.importValue),
        currencyCode: row.currencyCode,
        valueScale: row.valueScale,
        isEstimate: row.isEstimate,
        sourceName: row.sourceName,
        items: (row.items ?? []) as ExportImportItem[],
      }))
      .filter(
        (row) =>
          Number.isFinite(row.year) &&
          (row.exportValue != null ||
            row.importValue != null ||
            row.items.length > 0),
      )
      .sort((left, right) => left.signedYear - right.signedYear)
  }, [query.data])

  if (years.length === 0) return null

  const latest = years[years.length - 1]
  const balance =
    latest.exportValue != null && latest.importValue != null
      ? latest.exportValue - latest.importValue
      : null

  /*
   * 단면(grain)이 다른 행을 한 목록에 섞으면 같은 무역을 두 번 세게 된다.
   * 품목 줄과 상대 줄을 갈라 놓는다 — PARTNER_COMMODITY는 품목 쪽에서 상대까지 보여준다.
   */
  const byDirection = (direction: 'EXPORT' | 'IMPORT') => {
    const rows = latest.items.filter((item) => item.direction === direction)
    return {
      commodities: rows.filter((item) => item.grain !== 'PARTNER'),
      partners: rows.filter((item) => item.grain === 'PARTNER'),
    }
  }
  const exports = byDirection('EXPORT')
  const imports = byDirection('IMPORT')
  const hasFlows =
    exports.commodities.length +
      exports.partners.length +
      imports.commodities.length +
      imports.partners.length >
    0

  const unitLabel = [
    latest.currencyCode,
    latest.valueScale !== 'ONE' ? VALUE_SCALE_LABEL[latest.valueScale] : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <S.Section>
      <S.SectionTitleRow>
        <S.SectionTitleIcon $accent="emerald">
          <IconChart />
        </S.SectionTitleIcon>
        <S.SectionTitleText>교역</S.SectionTitleText>
        <S.SectionCountChip>
          {formatTradeYear(latest.era, latest.year, latest.periodEndYear)} 기준
        </S.SectionCountChip>
        <S.SectionLink type="button" onClick={() => setManagerOpen(true)}>
          데이터 관리
        </S.SectionLink>
      </S.SectionTitleRow>

      <S.FactBar aria-label="교역 규모">
        {latest.exportValue != null && (
          <S.Fact>
            <S.FactLabel>수출</S.FactLabel>
            <S.FactValue>
              {formatTradeValue(latest.exportValue)}
              {unitLabel && <S.FactUnit>{unitLabel}</S.FactUnit>}
            </S.FactValue>
          </S.Fact>
        )}
        {latest.importValue != null && (
          <S.Fact>
            <S.FactLabel>수입</S.FactLabel>
            <S.FactValue>
              {formatTradeValue(latest.importValue)}
              {unitLabel && <S.FactUnit>{unitLabel}</S.FactUnit>}
            </S.FactValue>
          </S.Fact>
        )}
        {balance != null && (
          <S.Fact>
            <S.FactLabel>무역수지</S.FactLabel>
            <S.FactValue>
              {balance >= 0 ? '+' : ''}
              {formatTradeValue(balance)}
              <S.FactUnit>{balance >= 0 ? '흑자' : '적자'}</S.FactUnit>
            </S.FactValue>
          </S.Fact>
        )}
        {years.length > 1 && (
          <S.Fact>
            <S.FactLabel>등록 연도</S.FactLabel>
            <S.FactValue>
              {formatTradeYear(years[0].era, years[0].year)}–
              {formatTradeYear(latest.era, latest.year)}
              <S.FactUnit>{years.length}개</S.FactUnit>
            </S.FactValue>
          </S.Fact>
        )}
      </S.FactBar>

      {hasFlows && (
        <S.TradeItemGroups>
          {exports.commodities.length > 0 && (
            <TradeDirectionView label="수출" items={exports.commodities} />
          )}
          {exports.partners.length > 0 && (
            <TradeItemLine label="수출 상대" items={exports.partners} showPartnerAsName />
          )}
          {imports.commodities.length > 0 && (
            <TradeDirectionView label="수입" items={imports.commodities} />
          )}
          {imports.partners.length > 0 && (
            <TradeItemLine label="수입 상대" items={imports.partners} showPartnerAsName />
          )}
        </S.TradeItemGroups>
      )}

      {(latest.sourceName || latest.isEstimate) && (
        <S.TradeSourceLine>
          {latest.isEstimate && '추정치'}
          {latest.isEstimate && latest.sourceName && ' · '}
          {latest.sourceName && `출처: ${latest.sourceName}`}
        </S.TradeSourceLine>
      )}

      <CountryDataManagerModal
        countryId={countryId}
        countryName={countryName}
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        initialTab="trade"
      />
    </S.Section>
  )
}

interface TradeDirectionViewProps {
  label: string
  items: ExportImportItem[]
}

/** 한 방향의 구성 — 분류 막대(무엇 위주냐) 위에 품목 칩(구체적으로 무엇). */
function TradeDirectionView({ label, items }: TradeDirectionViewProps) {
  /*
   * 막대의 몫은 비중을 먼저 쓰고, 없으면 금액으로 대신한다. 둘 다 없는 행은
   * 크기를 알 수 없으므로 막대에서 빼되 칩에는 그대로 남긴다 — 이름만 아는 것도 정보다.
   */
  const slices = useMemo(() => {
    const weights = new Map<
      string,
      { name: string; color: string; weight: number }
    >()
    for (const item of items) {
      const weight = item.sharePct ?? item.value ?? 0
      if (weight <= 0) continue
      const key = item.categoryId ?? item.categoryName ?? '기타'
      const current = weights.get(key)
      if (current) {
        current.weight += weight
      } else {
        weights.set(key, {
          name: item.categoryName ?? '분류 없음',
          color: categoryColor(item.categoryColorKey),
          weight,
        })
      }
    }
    const rows = [...weights.values()].sort(
      (left, right) => right.weight - left.weight,
    )
    const total = rows.reduce((sum, row) => sum + row.weight, 0)
    return total > 0
      ? rows.map((row) => ({ ...row, pct: (row.weight / total) * 100 }))
      : []
  }, [items])

  return (
    <S.TradeDirectionBlock>
      {slices.length > 1 && (
        <>
          <S.TradeCompositionBar
            role="img"
            aria-label={`${label} 분류 구성: ${slices
              .map((slice) => `${slice.name} ${slice.pct.toFixed(0)}%`)
              .join(', ')}`}
          >
            {slices.map((slice) => (
              <S.TradeCompositionSlice
                key={slice.name}
                $color={slice.color}
                style={{ width: `${slice.pct}%` }}
              />
            ))}
          </S.TradeCompositionBar>
          <S.TradeCompositionLegend>
            {slices.map((slice) => (
              <S.TradeCompositionLegendItem key={slice.name}>
                <S.TradeCompositionDot $color={slice.color} />
                {slice.name} {slice.pct.toFixed(0)}%
              </S.TradeCompositionLegendItem>
            ))}
          </S.TradeCompositionLegend>
        </>
      )}
      <TradeItemLine label={`${label} 품목`} items={items} />
    </S.TradeDirectionBlock>
  )
}

interface TradeItemLineProps {
  label: string
  items: ExportImportItem[]
  /** 상대국별 행은 상대 이름이 곧 제목이다 */
  showPartnerAsName?: boolean
}

/** 칩 한 줄 — 이름 + (비중 또는 금액 또는 수량) + 상대 + 제도. 비중이 있으면 그쪽이 더 읽힌다. */
function TradeItemLine({ label, items, showPartnerAsName }: TradeItemLineProps) {
  return (
    <S.TradeItemGroup>
      <S.TradeItemLabel>{label}</S.TradeItemLabel>
      <S.TradeItemChips>
        {items.map((item) => {
          const share = item.sharePct != null ? `${item.sharePct}%` : null
          const amount =
            share == null && item.value != null
              ? formatTradeValue(item.value)
              : null
          const quantity =
            share == null && amount == null && item.quantity != null
              ? `${item.quantity.toLocaleString('ko-KR')}${item.quantityUnit ?? ''}`
              : null
          const title = showPartnerAsName
            ? (item.partnerName ?? item.name)
            : item.name
          return (
            <S.TradeItemChip key={item.id}>
              <S.TradeItemName>
                {item.categoryEmoji && !showPartnerAsName
                  ? `${item.categoryEmoji} `
                  : ''}
                {title}
              </S.TradeItemName>
              {(share ?? amount ?? quantity) && (
                <S.TradeItemValue>
                  {share ?? amount ?? quantity}
                </S.TradeItemValue>
              )}
              {!showPartnerAsName && item.partnerName && (
                <S.TradeItemPartner>→ {item.partnerName}</S.TradeItemPartner>
              )}
              {item.channel && item.channel !== 'OFFICIAL' && (
                <S.TradeItemPartner>
                  {CHANNEL_LABEL[item.channel]}
                </S.TradeItemPartner>
              )}
              {item.isReExport && <S.TradeItemPartner>재수출</S.TradeItemPartner>}
            </S.TradeItemChip>
          )
        })}
      </S.TradeItemChips>
    </S.TradeItemGroup>
  )
}
