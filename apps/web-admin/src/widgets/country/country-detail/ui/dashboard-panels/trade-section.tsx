import { useMemo, useState } from 'react'

import {
  useExportImports,
  type ExportImportItem,
} from '@/entities/country/api.trade'

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
 * 교역액은 자릿수가 커서 원시 숫자를 그대로 쓰면 읽히지 않는다.
 * 단위 안에서 세 자리가 넘어가면 소수점은 잡음이라 뗀다(5160.0억 → 5,160억).
 */
function formatTradeValue(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  const scaled = (divisor: number, unit: string) => {
    const quotient = abs / divisor
    const text =
      quotient >= 100
        ? Math.round(quotient).toLocaleString('ko-KR')
        : quotient.toFixed(1)
    return `${sign}${text}${unit}`
  }
  if (abs >= 1_0000_0000_0000) return scaled(1_0000_0000_0000, '조')
  if (abs >= 1_0000_0000) return scaled(1_0000_0000, '억')
  if (abs >= 1_0000) return scaled(1_0000, '만')
  return `${sign}${abs.toLocaleString('ko-KR')}`
}

/**
 * 교역 — 연도별 수출·수입 총액과 무역수지, 그리고 **무엇을** 주고받았는지.
 *
 * 처음엔 총액(`export_import`)만 있어 "얼마나"에만 답했다. 품목 테이블
 * (`export_import_item`)이 붙으면서 "무엇을"까지 답한다 — 품목은 수출·수입 두 줄로
 * 나눠 보여주고, 상대국이 적힌 품목은 이름 뒤에 붙인다.
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
        year: Number((row as { year: number }).year),
        exportValue: toNumber((row as { exportValue?: unknown }).exportValue),
        importValue: toNumber((row as { importValue?: unknown }).importValue),
        items: (row.items ?? []) as ExportImportItem[],
      }))
      .filter(
        (row) =>
          Number.isFinite(row.year) &&
          (row.exportValue != null ||
            row.importValue != null ||
            row.items.length > 0),
      )
      .sort((left, right) => left.year - right.year)
  }, [query.data])

  if (years.length === 0) return null

  const latest = years[years.length - 1]
  const balance =
    latest.exportValue != null && latest.importValue != null
      ? latest.exportValue - latest.importValue
      : null
  /* 서버가 direction → sortOrder 순으로 내려주므로 여기서는 가르기만 한다 */
  const exportItems = latest.items.filter((item) => item.direction === 'EXPORT')
  const importItems = latest.items.filter((item) => item.direction === 'IMPORT')

  return (
    <S.Section>
      <S.SectionTitleRow>
        <S.SectionTitleIcon $accent="emerald">
          <IconChart />
        </S.SectionTitleIcon>
        <S.SectionTitleText>교역</S.SectionTitleText>
        <S.SectionCountChip>{latest.year}년 기준</S.SectionCountChip>
        <S.SectionLink type="button" onClick={() => setManagerOpen(true)}>
          데이터 관리
        </S.SectionLink>
      </S.SectionTitleRow>

      <S.FactBar aria-label="교역 규모">
        {latest.exportValue != null && (
          <S.Fact>
            <S.FactLabel>수출</S.FactLabel>
            <S.FactValue>{formatTradeValue(latest.exportValue)}</S.FactValue>
          </S.Fact>
        )}
        {latest.importValue != null && (
          <S.Fact>
            <S.FactLabel>수입</S.FactLabel>
            <S.FactValue>{formatTradeValue(latest.importValue)}</S.FactValue>
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
              {years[0].year}–{latest.year}
              <S.FactUnit>{years.length}개</S.FactUnit>
            </S.FactValue>
          </S.Fact>
        )}
      </S.FactBar>

      {(exportItems.length > 0 || importItems.length > 0) && (
        <S.TradeItemGroups>
          {exportItems.length > 0 && (
            <TradeItemLine label="수출 품목" items={exportItems} />
          )}
          {importItems.length > 0 && (
            <TradeItemLine label="수입 품목" items={importItems} />
          )}
        </S.TradeItemGroups>
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

interface TradeItemLineProps {
  label: string
  items: ExportImportItem[]
}

/** 품목 한 줄 — 이름 + (비중 또는 금액) + 상대국. 비중이 있으면 그쪽이 더 읽힌다. */
function TradeItemLine({ label, items }: TradeItemLineProps) {
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
          return (
            <S.TradeItemChip key={item.id}>
              <S.TradeItemName>{item.name}</S.TradeItemName>
              {(share ?? amount) && (
                <S.TradeItemValue>{share ?? amount}</S.TradeItemValue>
              )}
              {item.partnerCountryName && (
                <S.TradeItemPartner>
                  → {item.partnerCountryName}
                </S.TradeItemPartner>
              )}
            </S.TradeItemChip>
          )
        })}
      </S.TradeItemChips>
    </S.TradeItemGroup>
  )
}
