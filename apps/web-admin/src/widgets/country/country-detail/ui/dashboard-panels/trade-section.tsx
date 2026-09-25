import { useMemo, useState } from 'react'

import styled, { useTheme } from 'styled-components'

import {
  useExportImports,
  type ExportImportItem,
} from '@/entities/country/api.trade'
import {
  CHANNEL_LABEL,
  directionColor,
  formatTradeValue,
  formatTradeYear,
  VALUE_SCALE_LABEL,
} from '@/entities/trade/vocab'

import { ChartEmpty } from './chart-empty'
import { TradeCompositionTreemap } from './trade-composition-treemap'
import { TradeYearBars } from './trade-year-bars'
import {
  buildComposition,
  shareOf,
  type CompositionSlice,
} from './trade-composition'

import { CountryDataManagerModal } from '../country-data-manager/country-data-manager-modal'
import { IconChart } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { CommodityFlowsModal } from './commodity-flows-modal'

interface TradeSectionProps {
  countryId: string
  countryName: string
}

type Direction = 'EXPORT' | 'IMPORT'

/** decimal은 SDK에서 문자열로 오기도 한다 — 숫자로 못 읽으면 null */
function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

interface DirectionView {
  /** 품목 단면 — 구성 막대의 모수가 되는 유일한 단면 */
  commodities: ExportImportItem[]
  /** 상대국 단면 */
  partners: ExportImportItem[]
  /** 상대×품목 단면 — 품목과 겹치므로 막대에는 넣지 않는다 */
  partnerCommodities: ExportImportItem[]
  slices: CompositionSlice[]
  /** 등록된 품목이 그 방향의 몇 %를 덮는가. 모수를 모르면 null */
  coverage: number | null
  /** 막대에 못 올린 행 수 — 비중도 금액도 없어 크기를 모르는 행 */
  unknownCount: number
  total: number | null
}

/**
 * 교역 — 얼마나 · 무엇을 · 누구와.
 *
 * 세 층으로 읽힌다:
 *  1) 규모 — 수출·수입을 같은 축의 두 막대로. 무역수지가 이 섹션의 본론이라
 *     숫자만 나란히 적지 않고 길이로 보여준다.
 *  2) 분류 구성 막대 — 무엇 위주의 나라인가 (원유·석탄이 따로 놓이면 '에너지 60%'가 사라진다)
 *  3) 품목·상대 칩 — 구체적으로 무엇을, 누구와
 *
 * 자료가 없어도 **섹션은 선다**. 감췄더니 거의 모든 국가에서 교역이 아예 없는 기능처럼
 * 보였다 — 대신 빈 자리가 무엇을 넣으면 무엇이 보이는지 말하고 등록 버튼을 함께 낸다.
 */
export function TradeSection({
  countryId,
  countryName,
}: TradeSectionProps) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const [managerOpen, setManagerOpen] = useState(false)
  /* 칩을 눌러 "이 품목을 누가 주고받았나"로 건너뛴다 — 카탈로그 품목만 열린다 */
  const [pickedCommodity, setPickedCommodity] = useState<{
    id: string
    name: string
  } | null>(null)
  /*
   * 선택은 id로 들고 있다가 없으면 최신으로 떨어뜨린다. 국가를 바꿔 목록이 갈리면
   * 옛 id가 자연히 안 맞아 최신으로 돌아온다 — 초기화 effect가 따로 필요 없다.
   */
  const [pickedYearId, setPickedYearId] = useState<string | null>(null)
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

  const current =
    years.find((row) => row.id === pickedYearId) ?? years[years.length - 1]

  const views = useMemo(() => {
    const build = (direction: Direction): DirectionView => {
      if (!current) {
        return {
          commodities: [],
          partners: [],
          partnerCommodities: [],
          slices: [],
          coverage: null,
          unknownCount: 0,
          total: null,
        }
      }
      const rows = current.items.filter((item) => item.direction === direction)
      const total =
        direction === 'EXPORT' ? current.exportValue : current.importValue
      const commodities = rows.filter((item) => item.grain === 'COMMODITY')
      const partnerCommodities = rows.filter(
        (item) => item.grain === 'PARTNER_COMMODITY',
      )
      const partners = rows.filter((item) => item.grain === 'PARTNER')

      const composition = buildComposition(rows, total, isDark)
      return {
        commodities,
        partners,
        partnerCommodities,
        slices: composition.slices,
        coverage: composition.coverage,
        unknownCount: composition.unknownCount,
        total,
      }
    }
    return { EXPORT: build('EXPORT'), IMPORT: build('IMPORT') }
  }, [current, isDark])

  /*
   * 자료가 없어도 **연도 막대 골격**은 그대로 둔다. 연도·금액은 지어낼 수 없으니
   * 빈 트랙과 눈금선만 남긴다 — 값이 들어오면 같은 자리에 막대가 찬다.
   */
  if (years.length === 0 || !current) {
    return (
      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon>
            <IconChart />
          </S.SectionTitleIcon>
          <S.SectionTitleText>교역</S.SectionTitleText>
        </S.SectionTitleRow>
        <ChartEmpty
          text="연도별 수출·수입액을 넣으면 여기에 규모와 무역수지가 그려집니다."
          actionLabel="교역 자료 등록"
          onAction={() => setManagerOpen(true)}
        >
          <EmptyBars>
            {[0, 1, 2].map((row) => (
              <EmptyBarRow key={row}>
                {/* 격자 자식이 하나뿐이면 첫 칸(연도 자리)에 들어가 62px로 짜부라진다 */}
                <span />
                <EmptyTrack />
                <span />
              </EmptyBarRow>
            ))}
          </EmptyBars>
        </ChartEmpty>
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

  const balance =
    current.exportValue != null && current.importValue != null
      ? current.exportValue - current.importValue
      : null
  const scaleMax = Math.max(current.exportValue ?? 0, current.importValue ?? 0)

  const unitLabel = [
    current.currencyCode,
    current.valueScale !== 'ONE' ? VALUE_SCALE_LABEL[current.valueScale] : null,
  ]
    .filter(Boolean)
    .join(' ')

  const yearLabel = formatTradeYear(
    current.era,
    current.year,
    current.periodEndYear,
  )

  const hasFlows = (['EXPORT', 'IMPORT'] as const).some(
    (direction) =>
      views[direction].commodities.length +
        views[direction].partners.length +
        views[direction].partnerCommodities.length >
      0,
  )

  return (
    <S.Section>
      <S.SectionTitleRow>
        <S.SectionTitleIcon>
          <IconChart />
        </S.SectionTitleIcon>
        <S.SectionTitleText>교역</S.SectionTitleText>
        <S.SectionCountChip>{yearLabel} 기준</S.SectionCountChip>
        <S.SectionAction type="button" onClick={() => setManagerOpen(true)}>
          데이터 관리
        </S.SectionAction>
      </S.SectionTitleRow>

      {/* 규모·추이·연도 선택을 한 그림이 맡는다 — 자세한 이유는 TradeYearBars 주석 */}
      <TradeYearBars
        years={years.map((row) => ({
          id: row.id,
          label: formatTradeYear(row.era, row.year, row.periodEndYear),
          exportValue: row.exportValue,
          importValue: row.importValue,
          currencyCode: row.currencyCode,
          valueScale: row.valueScale,
        }))}
        selectedId={current.id}
        onSelect={setPickedYearId}
      />

      {hasFlows && (
        <S.TradeGroupsContainer>
          <S.TradeItemGroups>
            {(['EXPORT', 'IMPORT'] as const).map((direction) => (
              <TradeDirectionView
                key={direction}
                direction={direction}
                view={views[direction]}
                isDark={isDark}
                onPickCommodity={setPickedCommodity}
              />
            ))}
          </S.TradeItemGroups>
        </S.TradeGroupsContainer>
      )}

      {(current.sourceName || current.isEstimate) && (
        <S.TradeSourceLine>
          {current.isEstimate && '추정치'}
          {current.isEstimate && current.sourceName && ' · '}
          {current.sourceName && `출처: ${current.sourceName}`}
        </S.TradeSourceLine>
      )}

      <CommodityFlowsModal
        commodityId={pickedCommodity?.id ?? null}
        commodityName={pickedCommodity?.name ?? ''}
        onClose={() => setPickedCommodity(null)}
      />

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

/** "수입이 수출의 1.6배" — 배수는 두 막대의 길이 차를 말로 한 번 더 못박는다 */
function balanceRatioText(
  exportValue: number | null,
  importValue: number | null,
): string {
  if (exportValue == null || importValue == null) return ''
  if (exportValue <= 0 || importValue <= 0) return ''
  const bigger = exportValue >= importValue ? '수출' : '수입'
  const smaller = exportValue >= importValue ? '수입' : '수출'
  const ratio =
    Math.max(exportValue, importValue) / Math.min(exportValue, importValue)
  if (ratio < 1.05) return ' · 두 쪽이 거의 같다'
  return ` · ${bigger}이 ${smaller}의 ${ratio.toFixed(2)}배`
}

interface TradeDirectionViewProps {
  direction: Direction
  view: DirectionView
  isDark: boolean
  onPickCommodity: (picked: { id: string; name: string }) => void
}

/** 한 방향의 구성 — 분류 막대(무엇 위주냐) 아래에 품목·상대 칩(구체적으로 무엇). */
function TradeDirectionView({
  direction,
  view,
  isDark,
  onPickCommodity,
}: TradeDirectionViewProps) {
  const label = direction === 'EXPORT' ? '수출' : '수입'
  const color = directionColor(direction, isDark)
  if (
    view.commodities.length +
      view.partners.length +
      view.partnerCommodities.length ===
    0
  ) {
    return null
  }

  const known = view.slices.reduce((sum, slice) => sum + slice.pct, 0)
  /*
   * 막대는 언제나 그 방향 전체(100%)를 트랙으로 깐다. 등록된 품목이 29%뿐이면 29%만
   * 칠하고 나머지는 빈칸으로 둔다 — 옛 막대는 등록분을 100%로 늘여 그려서 '에너지·광물
   * 44%'처럼 보였지만 실제 수출 대비로는 13%였다. 모수가 다른 두 수를 나란히 두면
   * 읽는 사람은 큰 쪽으로 읽는다.
   */
  const relative = view.coverage == null

  return (
    <S.TradeDirectionBlock>
      <S.TradeDirectionHeader>
        <S.TradeDirectionName $color={color}>{label}</S.TradeDirectionName>
        {view.slices.length > 0 && (
          <S.TradeCoverageNote>
            {relative
              ? '등록된 품목끼리의 비율 (전체 대비는 알 수 없음)'
              : `등록 품목이 ${label}의 ${known.toFixed(1)}%를 덮는다`}
            {view.unknownCount > 0 &&
              ` · 비중 미상 ${view.unknownCount}건은 막대에 없음`}
          </S.TradeCoverageNote>
        )}
      </S.TradeDirectionHeader>

      {view.slices.length > 0 && (
        <>
          <TradeCompositionTreemap
            slices={view.slices}
            coverage={view.coverage}
            label={label}
          />
          <S.TradeCompositionLegend>
            {view.slices.map((slice) => (
              <S.TradeCompositionLegendItem key={slice.key}>
                <S.TradeCompositionDot $color={slice.color} />
                {slice.name}
              </S.TradeCompositionLegendItem>
            ))}
          </S.TradeCompositionLegend>
        </>
      )}

      <TradeItemLine
        label="품목"
        items={view.commodities}
        total={view.total}
        gaugeColor={color}
        onPickCommodity={onPickCommodity}
      />
      <TradeItemLine
        label="상대"
        items={view.partners}
        total={view.total}
        gaugeColor={color}
        showPartnerAsName
      />
      <TradeItemLine
        label="상대별 품목"
        items={view.partnerCommodities}
        total={view.total}
        gaugeColor={color}
        onPickCommodity={onPickCommodity}
      />
    </S.TradeDirectionBlock>
  )
}

interface TradeItemLineProps {
  label: string
  items: ExportImportItem[]
  /** 게이지·비중의 모수 */
  total: number | null
  gaugeColor: string
  /** 상대국별 행은 상대 이름이 곧 제목이다 */
  showPartnerAsName?: boolean
  /** 카탈로그 품목을 문 칩만 누를 수 있다 — 자유 입력 행은 갈 곳이 없다 */
  onPickCommodity?: (picked: { id: string; name: string }) => void
}

/** 한 줄 목록 — 이름 + 같은 길이의 트랙 안 막대 + 값. 비중이 있으면 그쪽이 더 읽힌다. */
function TradeItemLine({
  label,
  items,
  total,
  gaugeColor,
  showPartnerAsName,
  onPickCommodity,
}: TradeItemLineProps) {
  if (items.length === 0) return null
  /*
   * 막대는 그 줄 안에서 가장 큰 값을 꽉 찬 칸으로 잡는다 — 이 줄의 목적은 순위와
   * 격차를 보이는 것이고, "전체의 5.7%"는 옆의 숫자가 말한다. 비중을 모르는 행은
   * 막대 없이 값만 적는다(모르는 걸 0 길이로 그리지 않는다).
   */
  const shares = items.map((item) => shareOf(item, total))
  const maxShare = Math.max(
    0,
    ...shares.filter((value): value is number => value != null),
  )

  return (
    <S.TradeItemGroup>
      <S.TradeItemLabel>{label}</S.TradeItemLabel>
      <S.TradeItemRows>
        {items.map((item, index) => {
          const share = shares[index]
          const shareText = share != null ? `${share.toFixed(1)}%` : null
          const amount =
            shareText == null && item.value != null
              ? formatTradeValue(item.value)
              : null
          const quantity =
            shareText == null && amount == null && item.quantity != null
              ? `${item.quantity.toLocaleString('ko-KR')}${item.quantityUnit ?? ''}`
              : null
          const title = showPartnerAsName
            ? (item.partnerName ?? item.name)
            : item.name
          const linkable =
            onPickCommodity != null &&
            item.commodityId != null &&
            !showPartnerAsName
          /*
           * 왜 그 교역이 있었는지 — 하나만 붙인다. 셋을 다 늘어놓으면 이름 칸이
           * 문장이 되어 목록으로 안 읽힌다. 자세한 건 편집 패널에서 본다.
           */
          const note =
            item.relatedEventTitle ??
            item.relatedTreatyName ??
            item.relatedCompanyName ??
            null
          return (
            <S.TradeItemRow
              key={item.id}
              as={linkable ? 'button' : 'span'}
              type={linkable ? 'button' : undefined}
              $clickable={linkable}
              title={linkable ? `${item.name} 교역 기록 보기` : undefined}
              onClick={
                linkable
                  ? () =>
                      onPickCommodity({ id: item.commodityId!, name: item.name })
                  : undefined
              }
            >
              <S.TradeItemHead>
                <S.TradeItemName>
                  {title}
                  {!showPartnerAsName && item.partnerName && (
                    <S.TradeItemPartner> → {item.partnerName}</S.TradeItemPartner>
                  )}
                  {item.channel && item.channel !== 'OFFICIAL' && (
                    <S.TradeItemPartner>
                      {' '}
                      {CHANNEL_LABEL[item.channel]}
                    </S.TradeItemPartner>
                  )}
                  {item.isReExport && (
                    <S.TradeItemPartner> 재수출</S.TradeItemPartner>
                  )}
                  {note && <S.TradeItemPartner> · {note}</S.TradeItemPartner>}
                </S.TradeItemName>
                <S.TradeItemValue>
                  {shareText ?? amount ?? quantity ?? ''}
                </S.TradeItemValue>
              </S.TradeItemHead>
              {share != null && maxShare > 0 && (
                <S.TradeItemTrack>
                  <S.TradeItemFill
                    $color={gaugeColor}
                    style={{ width: `${(share / maxShare) * 100}%` }}
                  />
                </S.TradeItemTrack>
              )}
            </S.TradeItemRow>
          )
        })}
      </S.TradeItemRows>
    </S.TradeItemGroup>
  )
}

/* 교역 빈 상태의 막대 골격 — 연도·금액은 없고 트랙만 */
const EmptyBars = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 14px;
  padding: 10px 0 26px;
`

const EmptyBarRow = styled.div`
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr) 128px;
  gap: 12px;
  align-items: center;
  /* 폭을 안 주면 격자 자식이 내용 폭으로 줄어 트랙이 왼쪽에 짜부라진다 */
  width: 100%;
`

const EmptyTrack = styled.span`
  height: 20px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'};
`
