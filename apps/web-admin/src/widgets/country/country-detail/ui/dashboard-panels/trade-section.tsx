import { useMemo, useState } from 'react'

import styled, { useTheme } from 'styled-components'

import {
  useExportImports,
  type ExportImportItem,
} from '@/entities/country/api.trade'
import { useTradeRecords } from '@/entities/trade/api'
import {
  CHANNEL_LABEL,
  directionColor,
  formatTradeValue,
  formatTradeYear,
  VALUE_SCALE_LABEL,
} from '@/entities/trade/vocab'

import { ChartEmpty } from './chart-empty'
import { ChartSkeleton } from './chart-skeleton'
import { SectionHelpPopover } from './section-help-popover'
import { TradeCompositionTreemap } from './trade-composition-treemap'
import { TradeYearBars } from './trade-year-bars'
import {
  buildComposition,
  shareOf,
  type CompositionSlice,
} from './trade-composition'

import { CountryDataManagerModal } from '../country-data-manager/country-data-manager-modal'
import { IconTrade } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { CommodityFlowsModal } from './commodity-flows-modal'

interface TradeSectionProps {
  countryId?: string
  historicalCountryId?: string
  countryName: string
  /** 대시보드에서 '상세·원장 보기' 클릭 시 교역 탭으로 이동 */
  onOpenDetailTab?: () => void
  /** 교역 전용 탭 내부에 임베드될 때 — 아래에 편집 원장이 함께 있으므로 모달 버튼을 숨긴다 */
  embeddedInTab?: boolean
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
  historicalCountryId,
  countryName,
  onOpenDetailTab,
  embeddedInTab = false,
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
  const [viewMode, setViewMode] = useState<'chart' | 'ledger'>('chart')
  const modernQuery = useExportImports(countryId)
  const historicalQuery = useTradeRecords(
    historicalCountryId ? { historicalCountryId } : {},
  )
  const isLoading = countryId
    ? modernQuery.isLoading
    : historicalQuery.isLoading
  const rawRecords = countryId ? modernQuery.data : historicalQuery.data

  const years = useMemo(() => {
    return (rawRecords ?? [])
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
  }, [rawRecords])

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
  /* 로딩 중을 '자료 없음'으로 말하지 않는다 — 예전엔 불러오는 동안 등록 안내가 떴다 */
  if (isLoading) {
    return (
      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon>
            <IconTrade />
          </S.SectionTitleIcon>
          <S.SectionTitleText>교역</S.SectionTitleText>
        </S.SectionTitleRow>
        <ChartSkeleton variant="bars" rows={4} />
      </S.Section>
    )
  }

  if (years.length === 0 || !current) {
    if (embeddedInTab) {
      return null
    }
    return (
      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon>
            <IconTrade />
          </S.SectionTitleIcon>
          <S.SectionTitleText>교역</S.SectionTitleText>
          <SectionHelpPopover sectionKey="trade" />
          {onOpenDetailTab && (
            <S.SectionLink type="button" onClick={onOpenDetailTab}>
              교역 탭 열기
            </S.SectionLink>
          )}
        </S.SectionTitleRow>
        <ChartEmpty
          text="연도별 수출·수입액을 넣으면 여기에 규모와 무역수지가 그려집니다."
          hint="수출·수입 총액 또는 품목·상대국 명세를 입력하면 무역수지와 품목 트리맵이 생성됩니다"
          actionLabel="교역 자료 등록"
          onAction={() => {
            if (countryId) setManagerOpen(true)
            else onOpenDetailTab?.()
          }}
        />
        {countryId && (
          <CountryDataManagerModal
            countryId={countryId}
            countryName={countryName}
            open={managerOpen}
            onClose={() => setManagerOpen(false)}
            initialTab="trade"
          />
        )}
      </S.Section>
    )
  }

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

  const unitSuffix = [
    current.currencyCode,
    current.valueScale && current.valueScale !== 'ONE'
      ? VALUE_SCALE_LABEL[current.valueScale as keyof typeof VALUE_SCALE_LABEL]
      : null,
  ]
    .filter(Boolean)
    .join(' ')

  const tradeBalance =
    current.exportValue != null && current.importValue != null
      ? current.exportValue - current.importValue
      : null
  const tradeVolume =
    current.exportValue != null && current.importValue != null
      ? current.exportValue + current.importValue
      : null

  const currentIndex = years.findIndex((row) => row.id === current.id)
  const prevYearRow =
    currentIndex > 0 &&
    years[currentIndex - 1].currencyCode === current.currencyCode &&
    years[currentIndex - 1].valueScale === current.valueScale
      ? years[currentIndex - 1]
      : null
  const prevYearLabel = prevYearRow
    ? formatTradeYear(
        prevYearRow.era,
        prevYearRow.year,
        prevYearRow.periodEndYear,
      )
    : null
  const exportDeltaPct =
    prevYearRow?.exportValue != null &&
    prevYearRow.exportValue > 0 &&
    current.exportValue != null
      ? ((current.exportValue - prevYearRow.exportValue) /
          prevYearRow.exportValue) *
        100
      : null
  const importDeltaPct =
    prevYearRow?.importValue != null &&
    prevYearRow.importValue > 0 &&
    current.importValue != null
      ? ((current.importValue - prevYearRow.importValue) /
          prevYearRow.importValue) *
        100
      : null

  const topExportItem =
    views.EXPORT.commodities[0]?.name ??
    views.EXPORT.partners[0]?.partnerName ??
    null
  const topImportItem =
    views.IMPORT.commodities[0]?.name ??
    views.IMPORT.partners[0]?.partnerName ??
    null

  return (
    <S.Section $wide>
      <S.SectionTitleRow>
        <S.SectionTitleIcon>
          <IconTrade />
        </S.SectionTitleIcon>
        <S.SectionTitleText>
          {embeddedInTab ? '연도별 교역 추이 · 품목 구성' : '교역'}
        </S.SectionTitleText>
        <SectionHelpPopover sectionKey="trade" />
        <S.SectionCountChip>
          {years.length}개 연도 · {yearLabel} 기준
        </S.SectionCountChip>
        <S.SectionHeaderActions>
          <TradeViewToggleGroup role="group" aria-label="교역 표시 방식">
            <TradeViewToggleBtn
              type="button"
              $active={viewMode === 'chart'}
              onClick={() => setViewMode('chart')}
            >
              차트 · 구성
            </TradeViewToggleBtn>
            <TradeViewToggleBtn
              type="button"
              $active={viewMode === 'ledger'}
              onClick={() => setViewMode('ledger')}
            >
              연도별 원장
            </TradeViewToggleBtn>
          </TradeViewToggleGroup>
          {!embeddedInTab && countryId && (
            <S.SectionAction
              type="button"
              onClick={() => setManagerOpen(true)}
            >
              데이터 관리
            </S.SectionAction>
          )}
          {!embeddedInTab && onOpenDetailTab && (
            <S.SectionLink type="button" onClick={onOpenDetailTab}>
              상세·원장 보기
            </S.SectionLink>
          )}
        </S.SectionHeaderActions>
      </S.SectionTitleRow>

      <TradeHeadlineStrip aria-label={`${yearLabel} 교역 요약`}>
        <TradeHeadlineCell>
          <TradeHeadlineLabel>수출 ({yearLabel})</TradeHeadlineLabel>
          <TradeHeadlineVal>
            {current.exportValue != null ? (
              <>
                {formatTradeValue(current.exportValue)}
                {unitSuffix && (
                  <TradeHeadlineUnit>{unitSuffix}</TradeHeadlineUnit>
                )}
              </>
            ) : (
              '총액 미기재'
            )}
          </TradeHeadlineVal>
          <TradeHeadlineSub>
            {exportDeltaPct != null && prevYearLabel && (
              <TradeDeltaSpan $up={exportDeltaPct >= 0}>
                {prevYearLabel} 대비 {exportDeltaPct >= 0 ? '+' : ''}
                {exportDeltaPct.toFixed(1)}%
              </TradeDeltaSpan>
            )}
            {exportDeltaPct != null && topExportItem && ' · '}
            {topExportItem
              ? `주력: ${topExportItem}`
              : `등록 품목 ${views.EXPORT.commodities.length}건 · 상대 ${views.EXPORT.partners.length}건`}
          </TradeHeadlineSub>
        </TradeHeadlineCell>

        <TradeHeadlineCell>
          <TradeHeadlineLabel>수입 ({yearLabel})</TradeHeadlineLabel>
          <TradeHeadlineVal>
            {current.importValue != null ? (
              <>
                {formatTradeValue(current.importValue)}
                {unitSuffix && (
                  <TradeHeadlineUnit>{unitSuffix}</TradeHeadlineUnit>
                )}
              </>
            ) : (
              '총액 미기재'
            )}
          </TradeHeadlineVal>
          <TradeHeadlineSub>
            {importDeltaPct != null && prevYearLabel && (
              <TradeDeltaSpan $up={importDeltaPct >= 0}>
                {prevYearLabel} 대비 {importDeltaPct >= 0 ? '+' : ''}
                {importDeltaPct.toFixed(1)}%
              </TradeDeltaSpan>
            )}
            {importDeltaPct != null && topImportItem && ' · '}
            {topImportItem
              ? `주력: ${topImportItem}`
              : `등록 품목 ${views.IMPORT.commodities.length}건 · 상대 ${views.IMPORT.partners.length}건`}
          </TradeHeadlineSub>
        </TradeHeadlineCell>

        <TradeHeadlineCell>
          <TradeHeadlineLabel>무역수지</TradeHeadlineLabel>
          {tradeBalance != null ? (
            <>
              <TradeHeadlineVal>
                {tradeBalance > 0 ? '+' : ''}
                {formatTradeValue(tradeBalance)}
                <TradeBalanceTag $surplus={tradeBalance >= 0}>
                  {tradeBalance >= 0 ? '흑자' : '적자'}
                </TradeBalanceTag>
              </TradeHeadlineVal>
              <TradeHeadlineSub>
                {tradeVolume != null && tradeVolume > 0
                  ? `교역 총액 대비 ${((Math.abs(tradeBalance) / tradeVolume) * 100).toFixed(1)}%`
                  : '수출 − 수입 차액'}
              </TradeHeadlineSub>
            </>
          ) : (
            <>
              <TradeHeadlineVal>산출 불가</TradeHeadlineVal>
              <TradeHeadlineSub>
                수출·수입 총액 모두 입력 시 자동 계산
              </TradeHeadlineSub>
            </>
          )}
        </TradeHeadlineCell>

        <TradeHeadlineCell>
          <TradeHeadlineLabel>교역 총액 (수출+수입)</TradeHeadlineLabel>
          {tradeVolume != null ? (
            <>
              <TradeHeadlineVal>
                {formatTradeValue(tradeVolume)}
                {unitSuffix && (
                  <TradeHeadlineUnit>{unitSuffix}</TradeHeadlineUnit>
                )}
              </TradeHeadlineVal>
              <TradeHeadlineSub>
                {current.exportValue != null && tradeVolume > 0
                  ? `수출 비중 ${((current.exportValue / tradeVolume) * 100).toFixed(1)}% · 수입 ${(((current.importValue ?? 0) / tradeVolume) * 100).toFixed(1)}%`
                  : `상세 명세 ${current.items.length}건`}
              </TradeHeadlineSub>
            </>
          ) : (
            <>
              <TradeHeadlineVal>{current.items.length}건 명세</TradeHeadlineVal>
              <TradeHeadlineSub>
                수출 명세{' '}
                {views.EXPORT.commodities.length +
                  views.EXPORT.partners.length +
                  views.EXPORT.partnerCommodities.length}
                건 · 수입 명세{' '}
                {views.IMPORT.commodities.length +
                  views.IMPORT.partners.length +
                  views.IMPORT.partnerCommodities.length}
                건
              </TradeHeadlineSub>
            </>
          )}
        </TradeHeadlineCell>
      </TradeHeadlineStrip>

      {viewMode === 'chart' ? (
        <>
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
                    unitSuffix={unitSuffix}
                    tradeVolume={tradeVolume}
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
        </>
      ) : (
        <TradeLedgerWrap>
          <TradeLedgerGrid>
            {[...years].reverse().map((row) => {
              const rowLabel = formatTradeYear(
                row.era,
                row.year,
                row.periodEndYear,
              )
              const rowUnit = [
                row.currencyCode,
                row.valueScale && row.valueScale !== 'ONE'
                  ? VALUE_SCALE_LABEL[
                      row.valueScale as keyof typeof VALUE_SCALE_LABEL
                    ]
                  : null,
              ]
                .filter(Boolean)
                .join(' ')
              const rowBalance =
                row.exportValue != null && row.importValue != null
                  ? row.exportValue - row.importValue
                  : null
              const rowVolume =
                row.exportValue != null && row.importValue != null
                  ? row.exportValue + row.importValue
                  : null
              const expItems = row.items.filter(
                (item) => item.direction === 'EXPORT',
              )
              const impItems = row.items.filter(
                (item) => item.direction === 'IMPORT',
              )
              const rowTopExp =
                expItems[0]?.name ?? expItems[0]?.partnerName ?? null
              const rowTopImp =
                impItems[0]?.name ?? impItems[0]?.partnerName ?? null

              return (
                <TradeLedgerItem key={row.id}>
                  <TradeLedgerRowBtn
                    type="button"
                    $selected={row.id === current.id}
                    onClick={() => {
                      setPickedYearId(row.id)
                      setViewMode('chart')
                    }}
                  >
                    <TradeLedgerTopLine>
                      <TradeLedgerYearGroup>
                        <TradeLedgerYear>{rowLabel}</TradeLedgerYear>
                        {row.isEstimate && (
                          <TradeLedgerEstimateTag>추정</TradeLedgerEstimateTag>
                        )}
                        {rowBalance != null && (
                          <TradeBalanceTag $surplus={rowBalance >= 0}>
                            {rowBalance >= 0 ? '흑자' : '적자'}{' '}
                            {rowBalance > 0 ? '+' : ''}
                            {formatTradeValue(rowBalance)}
                          </TradeBalanceTag>
                        )}
                      </TradeLedgerYearGroup>
                      <TradeLedgerVolume>
                        {rowVolume != null
                          ? `총액 ${formatTradeValue(rowVolume)}${rowUnit ? ` ${rowUnit}` : ''}`
                          : `명세 ${row.items.length}건`}
                      </TradeLedgerVolume>
                    </TradeLedgerTopLine>
                    <TradeLedgerSubLine>
                      <TradeLedgerSubText>
                        수출{' '}
                        {row.exportValue != null
                          ? formatTradeValue(row.exportValue)
                          : '—'}
                        {rowTopExp ? ` (${rowTopExp})` : ''} · 수입{' '}
                        {row.importValue != null
                          ? formatTradeValue(row.importValue)
                          : '—'}
                        {rowTopImp ? ` (${rowTopImp})` : ''}
                      </TradeLedgerSubText>
                      <TradeLedgerActionHint>
                        상세 구성 ›
                      </TradeLedgerActionHint>
                    </TradeLedgerSubLine>
                  </TradeLedgerRowBtn>
                </TradeLedgerItem>
              )
            })}
          </TradeLedgerGrid>
        </TradeLedgerWrap>
      )}

      <CommodityFlowsModal
        commodityId={pickedCommodity?.id ?? null}
        commodityName={pickedCommodity?.name ?? ''}
        onClose={() => setPickedCommodity(null)}
      />

      {countryId && !embeddedInTab && (
        <CountryDataManagerModal
          countryId={countryId}
          countryName={countryName}
          open={managerOpen}
          onClose={() => setManagerOpen(false)}
          initialTab="trade"
        />
      )}
    </S.Section>
  )
}

interface TradeDirectionViewProps {
  direction: Direction
  view: DirectionView
  unitSuffix: string
  tradeVolume: number | null
  isDark: boolean
  onPickCommodity: (picked: { id: string; name: string }) => void
}

/** 한 방향의 구성 — 분류 막대(무엇 위주냐) 아래에 품목·상대 칩(구체적으로 무엇). */
function TradeDirectionView({
  direction,
  view,
  unitSuffix,
  tradeVolume,
  isDark,
  onPickCommodity,
}: TradeDirectionViewProps) {
  const label = direction === 'EXPORT' ? '수출' : '수입'
  const color = directionColor(direction, isDark)
  const itemCount =
    view.commodities.length +
    view.partners.length +
    view.partnerCommodities.length
  if (itemCount === 0) {
    return null
  }

  const known = view.slices.reduce((sum, slice) => sum + slice.pct, 0)
  const relative = view.coverage == null
  const volumeSharePct =
    view.total != null && tradeVolume != null && tradeVolume > 0
      ? ((view.total / tradeVolume) * 100).toFixed(1)
      : null

  return (
    <S.TradeDirectionBlock>
      <S.TradeDirectionHeader>
        <S.TradeDirectionTitleGroup>
          <S.TradeDirectionName $color={color}>{label}</S.TradeDirectionName>
          {view.slices.length > 0 && (
            <S.TradeCoverageNote>
              {relative
                ? '등록 품목 간 비율'
                : `등록 품목이 ${label}의 ${known.toFixed(1)}% 포괄`}
              {view.unknownCount > 0 && ` · 미상 ${view.unknownCount}건`}
            </S.TradeCoverageNote>
          )}
        </S.TradeDirectionTitleGroup>
        <S.TradeDirectionMeta>
          {view.total != null && (
            <strong>
              {formatTradeValue(view.total)}
              {unitSuffix ? ` ${unitSuffix}` : ''}
              {volumeSharePct ? ` (${volumeSharePct}%)` : ''}
            </strong>
          )}
          <span>
            품목 {view.commodities.length} · 상대 {view.partners.length}
            {view.partnerCommodities.length > 0
              ? ` · 상대별 품목 ${view.partnerCommodities.length}`
              : ''}
          </span>
        </S.TradeDirectionMeta>
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
                {slice.name} {slice.pct.toFixed(1)}%
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

const TradeHeadlineStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const TradeHeadlineCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  &:first-child {
    padding-left: 2px;
  }

  &:last-child {
    border-right: none;
    padding-right: 2px;
  }

  @media (max-width: 960px) {
    &:nth-child(2n) {
      border-right: none;
    }

    &:nth-child(-n + 2) {
      border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }

  @media (max-width: 560px) {
    padding: 9px 4px;
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

    &:last-child {
      border-bottom: none;
    }
  }
`

const TradeHeadlineLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TradeHeadlineVal = styled.strong`
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TradeHeadlineUnit = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TradeHeadlineSub = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TradeDeltaSpan = styled.span<{ $up: boolean }>`
  font-weight: 700;
  color: ${({ theme, $up }) =>
    $up
      ? theme.mode === 'dark'
        ? '#34d399'
        : '#047857'
      : theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'};
`

const TradeBalanceTag = styled.span<{ $surplus: boolean }>`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $surplus }) =>
    $surplus
      ? theme.mode === 'dark'
        ? '#34d399'
        : '#047857'
      : theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'};
  background: ${({ theme, $surplus }) =>
    $surplus
      ? theme.mode === 'dark'
        ? 'rgba(16,185,129,0.16)'
        : 'rgba(16,185,129,0.10)'
      : theme.mode === 'dark'
        ? 'rgba(248,113,113,0.16)'
        : 'rgba(220,38,38,0.10)'};
`

const TradeViewToggleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const TradeViewToggleBtn = styled.button<{ $active: boolean }>`
  padding: 3px 9px;
  border: none;
  border-radius: 6px;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.tertiary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  box-shadow: ${({ $active }) =>
    $active ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none'};
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.text.primary};
  }
`

const TradeLedgerWrap = styled.div`
  container-type: inline-size;
  width: 100%;
`

const TradeLedgerGrid = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  @container (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const TradeLedgerItem = styled.li`
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @container (min-width: 720px) {
    &:nth-child(odd) {
      border-right: 1px solid ${({ theme }) => theme.colors.border.light};
      padding-right: 14px;
    }
    &:nth-child(even) {
      padding-left: 14px;
    }
    &:last-child:nth-child(odd) {
      grid-column: 1 / -1;
      border-right: none;
      padding-right: 0;
    }
  }
`

const TradeLedgerRowBtn = styled.button<{ $selected: boolean }>`
  appearance: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 11px 6px;
  border: none;
  border-radius: 6px;
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.activeLight : 'transparent'};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition: background 0.14s ease;

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected ? theme.colors.activeLight : theme.colors.hover};
  }
`

const TradeLedgerTopLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`

const TradeLedgerYearGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const TradeLedgerYear = styled.span`
  font-size: 13.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TradeLedgerEstimateTag = styled.span`
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
`

const TradeLedgerVolume = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`

const TradeLedgerSubLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
`

const TradeLedgerSubText = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TradeLedgerActionHint = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`
