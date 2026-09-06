import { useMemo, useState } from 'react'

import { useCountries } from '@/entities/country/api'
import { useHistoricalCountries } from '@/entities/historical-country/api'
import {
  useDeleteTradeRecord,
  useTradeCommodities,
  useTradeCommodityCategories,
  useTradeRecords,
  useUpsertTradeRecord,
  type TradeRecord,
  type UpsertTradeFlowInput,
} from '@/entities/trade/api'
import {
  AGGREGATION_OPTIONS,
  CONFIDENCE_OPTIONS,
  formatTradeYear,
  PRICE_BASIS_OPTIONS,
  VALUE_SCALE_OPTIONS,
} from '@/entities/trade/vocab'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import * as S from './styles'
import * as T from './trade-panel.styles'
import { TradeFlowRow, type FlowDraft } from './trade-flow-row'

interface Props {
  /** 현대 국가 상세에서 열렸으면 이 값 */
  countryId?: string
  /** 역사 국가 상세에서 열렸으면 이 값 */
  historicalCountryId?: string
}

function newKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyFlow(direction: 'EXPORT' | 'IMPORT'): FlowDraft {
  return {
    key: newKey(),
    direction,
    grain: '',
    commodityId: '',
    name: '',
    categoryId: '',
    hsCode: '',
    partnerKind: '',
    partnerCountryId: '',
    partnerHistoricalCountryId: '',
    partnerOrganizationId: '',
    partnerLabel: '',
    value: '',
    sharePct: '',
    quantity: '',
    quantityUnit: '',
    unitPrice: '',
    priceBasis: '',
    rankInDirection: '',
    yoyPct: '',
    channel: '',
    restriction: '',
    tariffRatePct: '',
    isReExport: false,
    transportMode: '',
    routeName: '',
    portName: '',
    isEstimate: false,
    sourceNote: '',
    notes: '',
  }
}

function parseNum(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

function text(raw: string): string | null {
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * 교역 편집 패널 — 연도 헤더(총액·통화·출처) + 그 해의 흐름(무엇을·누구와).
 *
 * 현대 국가와 역사 국가를 함께 다룬다. 예전에는 현대 국가 전용이라 조선·청의 교역을
 * 담을 자리가 아예 없었다.
 */
export function TradePanel({ countryId, historicalCountryId }: Props) {
  const scope = useMemo(
    () => ({
      ...(countryId ? { countryId } : {}),
      ...(historicalCountryId ? { historicalCountryId } : {}),
    }),
    [countryId, historicalCountryId],
  )

  const { data: rows = [], isLoading } = useTradeRecords(scope)
  const { data: countries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountries()
  const { data: commodities = [] } = useTradeCommodities()
  const { data: categories = [] } = useTradeCommodityCategories()
  const upsertMut = useUpsertTradeRecord()
  const deleteMut = useDeleteTradeRecord()

  // ── 헤더 폼 상태 ──────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [era, setEra] = useState<'AD' | 'BC'>('AD')
  const [yearInput, setYearInput] = useState('')
  const [periodEndYear, setPeriodEndYear] = useState('')
  const [aggregation, setAggregation] = useState('ANNUAL')
  const [exportValue, setExportValue] = useState('')
  const [importValue, setImportValue] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [valueScale, setValueScale] = useState('ONE')
  const [priceBasis, setPriceBasis] = useState('')
  const [priceNote, setPriceNote] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [isEstimate, setIsEstimate] = useState(false)
  const [confidence, setConfidence] = useState('')
  const [note, setNote] = useState('')
  const [sourceOpen, setSourceOpen] = useState(false)

  // ── 흐름 상태 ────────────────────────────────────────────
  const [flows, setFlows] = useState<FlowDraft[]>([])
  const [openKeys, setOpenKeys] = useState<string[]>([])
  /*
   * 흐름을 손대지 않은 저장은 items를 **보내지 않는다**(서버가 undefined면 건드리지 않음).
   * 매번 보내면 내용이 같아도 delete-and-recreate라 행 id가 계속 갈린다.
   */
  const [flowsDirty, setFlowsDirty] = useState(false)

  const reset = () => {
    setEditingId(null)
    setEra('AD')
    setYearInput('')
    setPeriodEndYear('')
    setAggregation('ANNUAL')
    setExportValue('')
    setImportValue('')
    setCurrencyCode('')
    setValueScale('ONE')
    setPriceBasis('')
    setPriceNote('')
    setSourceName('')
    setSourceUrl('')
    setIsEstimate(false)
    setConfidence('')
    setNote('')
    setFlows([])
    setOpenKeys([])
    setFlowsDirty(false)
  }

  const startEdit = (row: TradeRecord) => {
    setEditingId(row.id)
    setEra(row.era)
    setYearInput(String(row.year))
    setPeriodEndYear(row.periodEndYear == null ? '' : String(row.periodEndYear))
    setAggregation(row.aggregation)
    setExportValue(row.exportValue == null ? '' : String(row.exportValue))
    setImportValue(row.importValue == null ? '' : String(row.importValue))
    setCurrencyCode(row.currencyCode ?? '')
    setValueScale(row.valueScale)
    setPriceBasis(row.priceBasis ?? '')
    setPriceNote(row.priceNote ?? '')
    setSourceName(row.sourceName ?? '')
    setSourceUrl(row.sourceUrl ?? '')
    setIsEstimate(row.isEstimate)
    setConfidence(row.confidence ?? '')
    setNote(row.note ?? '')
    setFlows(
      (row.items ?? []).map((item, index) => ({
        key: `${item.id}-${index}`,
        direction: item.direction,
        grain: item.grain,
        commodityId: item.commodityId ?? '',
        name: item.name,
        categoryId: item.categoryId ?? '',
        hsCode: item.hsCode ?? '',
        partnerKind: item.partnerKind === 'NONE' ? '' : item.partnerKind,
        partnerCountryId: item.partnerCountryId ?? '',
        partnerHistoricalCountryId: item.partnerHistoricalCountryId ?? '',
        partnerOrganizationId: item.partnerOrganizationId ?? '',
        partnerLabel: item.partnerLabel ?? '',
        value: item.value == null ? '' : String(item.value),
        sharePct: item.sharePct == null ? '' : String(item.sharePct),
        quantity: item.quantity == null ? '' : String(item.quantity),
        quantityUnit: item.quantityUnit ?? '',
        unitPrice: item.unitPrice == null ? '' : String(item.unitPrice),
        priceBasis: item.priceBasis ?? '',
        rankInDirection:
          item.rankInDirection == null ? '' : String(item.rankInDirection),
        yoyPct: item.yoyPct == null ? '' : String(item.yoyPct),
        channel: item.channel ?? '',
        restriction: item.restriction ?? '',
        tariffRatePct:
          item.tariffRatePct == null ? '' : String(item.tariffRatePct),
        isReExport: item.isReExport,
        transportMode: item.transportMode ?? '',
        routeName: item.routeName ?? '',
        portName: item.portName ?? '',
        isEstimate: item.isEstimate,
        sourceNote: item.sourceNote ?? '',
        notes: item.notes ?? '',
      })),
    )
    setOpenKeys([])
    setFlowsDirty(false)
  }

  const patchFlow = (key: string, patch: Partial<FlowDraft>) => {
    setFlows((prev) =>
      prev.map((flow) => (flow.key === key ? { ...flow, ...patch } : flow)),
    )
    setFlowsDirty(true)
  }

  const addFlow = (direction: 'EXPORT' | 'IMPORT') => {
    const draft = emptyFlow(direction)
    setFlows((prev) => [...prev, draft])
    setFlowsDirty(true)
  }

  const removeFlow = (key: string) => {
    setFlows((prev) => prev.filter((flow) => flow.key !== key))
    setOpenKeys((prev) => prev.filter((openKey) => openKey !== key))
    setFlowsDirty(true)
  }

  /**
   * 비중 합 점검 — 자료를 옮겨 적다 보면 100%를 넘기거나 한참 못 미치기 쉽다.
   * 막지는 않는다(자료 자체가 "주요 품목만" 싣는 일이 흔하다). 다만 눈에 띄게 알린다.
   */
  const shareCheck = useMemo(() => {
    const sum = (direction: 'EXPORT' | 'IMPORT') =>
      flows
        .filter((flow) => flow.direction === direction)
        .reduce((acc, flow) => acc + (parseNum(flow.sharePct) ?? 0), 0)
    return { EXPORT: sum('EXPORT'), IMPORT: sum('IMPORT') }
  }, [flows])

  const handleSave = async () => {
    const year = parseInt(yearInput, 10)
    if (!Number.isInteger(year) || year <= 0) {
      notify.error('연도를 정확히 입력하세요 (기원전은 왼쪽에서 BC를 고르세요)')
      return
    }
    // 이름 없는 흐름은 저장할 것이 없다 — 빈 줄로 남기지 말고 조용히 버린다
    const named = flows.filter(
      (flow) => flow.name.trim() !== '' || flow.commodityId !== '',
    )
    if (flowsDirty && named.length !== flows.length) {
      notify.info('품목명이 빈 줄은 저장하지 않았습니다')
    }
    const payloadItems: UpsertTradeFlowInput[] = named.map((flow, index) => ({
      direction: flow.direction,
      grain: flow.grain === '' ? null : flow.grain,
      commodityId: flow.commodityId || null,
      name: text(flow.name),
      categoryId: flow.categoryId || null,
      hsCode: text(flow.hsCode),
      partnerCountryId:
        flow.partnerKind === 'COUNTRY' ? flow.partnerCountryId || null : null,
      partnerHistoricalCountryId:
        flow.partnerKind === 'HISTORICAL_COUNTRY'
          ? flow.partnerHistoricalCountryId || null
          : null,
      partnerOrganizationId:
        flow.partnerKind === 'ORGANIZATION'
          ? flow.partnerOrganizationId || null
          : null,
      partnerLabel: flow.partnerKind === 'LABEL' ? text(flow.partnerLabel) : null,
      value: parseNum(flow.value),
      sharePct: parseNum(flow.sharePct),
      quantity: parseNum(flow.quantity),
      quantityUnit: text(flow.quantityUnit),
      unitPrice: parseNum(flow.unitPrice),
      priceBasis: (flow.priceBasis || null) as UpsertTradeFlowInput['priceBasis'],
      rankInDirection: parseNum(flow.rankInDirection),
      yoyPct: parseNum(flow.yoyPct),
      channel: (flow.channel || null) as UpsertTradeFlowInput['channel'],
      restriction: (flow.restriction ||
        null) as UpsertTradeFlowInput['restriction'],
      tariffRatePct: parseNum(flow.tariffRatePct),
      isReExport: flow.isReExport,
      transportMode: (flow.transportMode ||
        null) as UpsertTradeFlowInput['transportMode'],
      routeName: text(flow.routeName),
      portName: text(flow.portName),
      isEstimate: flow.isEstimate,
      sourceNote: text(flow.sourceNote),
      notes: text(flow.notes),
      sortOrder: index,
    }))

    try {
      await upsertMut.mutateAsync({
        ...scope,
        era,
        year,
        periodEndYear: parseNum(periodEndYear),
        aggregation: aggregation as 'ANNUAL' | 'AVERAGE' | 'TOTAL',
        exportValue: parseNum(exportValue),
        importValue: parseNum(importValue),
        currencyCode: text(currencyCode),
        valueScale: valueScale as 'ONE' | 'THOUSAND' | 'MILLION',
        priceBasis: (priceBasis || null) as 'FOB' | 'CIF' | null,
        priceNote: text(priceNote),
        sourceName: text(sourceName),
        sourceUrl: text(sourceUrl),
        isEstimate,
        confidence: (confidence || null) as 'HIGH' | 'MEDIUM' | 'LOW' | null,
        note: text(note),
        ...(flowsDirty ? { items: payloadItems } : {}),
      })
      notify.success(`${formatTradeYear(era, year)} 교역 저장됨`)
      reset()
    } catch (error) {
      notify.error(
        error instanceof Error && error.message
          ? error.message
          : '저장 실패',
      )
    }
  }

  const handleDelete = async (row: TradeRecord) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `${formatTradeYear(row.era, row.year, row.periodEndYear)} 교역 데이터를 삭제할까요? 그 해 품목도 함께 지워집니다.`,
        danger: true,
      }))
    )
      return
    try {
      await deleteMut.mutateAsync(row.id)
      notify.success('삭제됨')
      if (editingId === row.id) reset()
    } catch {
      notify.error('삭제 실패')
    }
  }

  /* 목록은 최근 연도가 위 — 부호 연도로 세워야 기원전이 뒤집히지 않는다 */
  const sorted = useMemo(
    () => rows.slice().sort((left, right) => right.signedYear - left.signedYear),
    [rows],
  )
  const fmt = (value: number | null) =>
    value == null ? '—' : value.toLocaleString()

  const shareWarn =
    shareCheck.EXPORT > 100.5 || shareCheck.IMPORT > 100.5

  return (
    <div>
      <S.TableScroll>
        <S.Table>
          <thead>
            <tr>
              <th>연도</th>
              <th>수출액</th>
              <th>수입액</th>
              <th>무역수지</th>
              <th>통화</th>
              <th>품목</th>
              <th>출처</th>
              <th aria-label="작업" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8}>
                  <S.EmptyHint>불러오는 중…</S.EmptyHint>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <S.EmptyHint>등록된 교역 데이터가 없습니다.</S.EmptyHint>
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.id}>
                  <td>
                    <T.YearBadge $estimate={row.isEstimate}>
                      {formatTradeYear(row.era, row.year, row.periodEndYear)}
                      {row.isEstimate && <T.MutedTag>추정</T.MutedTag>}
                    </T.YearBadge>
                  </td>
                  <td>{fmt(row.exportValue)}</td>
                  <td>{fmt(row.importValue)}</td>
                  <td>
                    {row.exportValue != null && row.importValue != null
                      ? (row.exportValue - row.importValue).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    {row.currencyCode ?? '—'}
                    {row.valueScale !== 'ONE' && (
                      <T.MutedTag>
                        {
                          VALUE_SCALE_OPTIONS.find(
                            (option) => option.value === row.valueScale,
                          )?.label
                        }
                      </T.MutedTag>
                    )}
                  </td>
                  <td>
                    {(row.items ?? []).length > 0
                      ? `${row.items.length}개`
                      : '—'}
                  </td>
                  <td title={row.sourceName ?? ''}>
                    {row.sourceName
                      ? row.sourceName.length > 12
                        ? `${row.sourceName.slice(0, 12)}…`
                        : row.sourceName
                      : '—'}
                  </td>
                  <td>
                    <S.RowActions>
                      <S.IconBtn type="button" onClick={() => startEdit(row)}>
                        수정
                      </S.IconBtn>
                      <S.IconBtn
                        type="button"
                        $danger
                        onClick={() => handleDelete(row)}
                      >
                        삭제
                      </S.IconBtn>
                    </S.RowActions>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </S.Table>
      </S.TableScroll>

      {/* 연도 헤더 — 금액에는 반드시 단위가 붙는다 */}
      <T.SectionCard>
        <T.SectionHead>
          연도·총액
          <T.SectionHint>
            금액은 통화와 자릿수를 함께 적어야 다른 해·다른 나라와 비교된다
          </T.SectionHint>
        </T.SectionHead>
        <S.FormGrid>
          <S.Field>
            기원
            <S.ItemSelect
              value={era}
              disabled={editingId != null}
              onChange={(event) => setEra(event.target.value as 'AD' | 'BC')}
            >
              <option value="AD">기원후</option>
              <option value="BC">기원전</option>
            </S.ItemSelect>
          </S.Field>
          <S.Field>
            연도 *
            <S.Input
              type="number"
              value={yearInput}
              onChange={(event) => setYearInput(event.target.value)}
              placeholder="1913"
              disabled={editingId != null}
            />
          </S.Field>
          <S.Field>
            기간 끝 연도
            <S.Input
              type="number"
              value={periodEndYear}
              placeholder="1869"
              onChange={(event) => setPeriodEndYear(event.target.value)}
            />
          </S.Field>
          <S.Field>
            집계
            <S.ItemSelect
              value={aggregation}
              onChange={(event) => setAggregation(event.target.value)}
            >
              {AGGREGATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </S.ItemSelect>
          </S.Field>
          <S.Field>
            수출액
            <S.Input
              type="number"
              value={exportValue}
              onChange={(event) => setExportValue(event.target.value)}
            />
          </S.Field>
          <S.Field>
            수입액
            <S.Input
              type="number"
              value={importValue}
              onChange={(event) => setImportValue(event.target.value)}
            />
          </S.Field>
          <S.Field>
            통화
            <S.Input
              value={currencyCode}
              placeholder="USD · GBP · 냥"
              onChange={(event) => setCurrencyCode(event.target.value)}
            />
          </S.Field>
          <S.Field>
            자릿수 단위
            <S.ItemSelect
              value={valueScale}
              onChange={(event) => setValueScale(event.target.value)}
            >
              {VALUE_SCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </S.ItemSelect>
          </S.Field>
          <S.Field>
            가격 기준
            <S.ItemSelect
              value={priceBasis}
              onChange={(event) => setPriceBasis(event.target.value)}
            >
              <option value="">지정 안 함</option>
              {PRICE_BASIS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </S.ItemSelect>
          </S.Field>
        </S.FormGrid>

        <T.Toolbar>
          <S.GhostButton
            type="button"
            aria-expanded={sourceOpen}
            onClick={() => setSourceOpen((prev) => !prev)}
          >
            {sourceOpen ? '출처·신뢰도 접기' : '출처·신뢰도 …'}
          </S.GhostButton>
          <T.SectionHint>
            근대 이전 교역 통계는 추계마다 크게 갈린다 — 어디서 왔는지 적어 두면
            나중에 다른 숫자와 부딪혔을 때 판단할 수 있다
          </T.SectionHint>
        </T.Toolbar>

        {sourceOpen && (
          <S.FormGrid>
            <S.Field style={{ gridColumn: 'span 2' }}>
              출처
              <S.Input
                value={sourceName}
                placeholder="조선총독부 통계연보 · Maddison Project"
                onChange={(event) => setSourceName(event.target.value)}
              />
            </S.Field>
            <S.Field style={{ gridColumn: 'span 2' }}>
              출처 URL
              <S.Input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
              />
            </S.Field>
            <S.Field>
              신뢰도
              <S.ItemSelect
                value={confidence}
                onChange={(event) => setConfidence(event.target.value)}
              >
                <option value="">지정 안 함</option>
                {CONFIDENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </S.ItemSelect>
            </S.Field>
            <S.Field>
              가격 표기
              <S.Input
                value={priceNote}
                placeholder="1913년 불변가격"
                onChange={(event) => setPriceNote(event.target.value)}
              />
            </S.Field>
            <T.InlineCheck>
              <input
                type="checkbox"
                checked={isEstimate}
                onChange={(event) => setIsEstimate(event.target.checked)}
              />
              추정치
            </T.InlineCheck>
            <S.Field style={{ gridColumn: '1 / -1' }}>
              메모
              <S.Input
                value={note}
                placeholder="식민지 포함 여부 · 회계연도 기준 등"
                onChange={(event) => setNote(event.target.value)}
              />
            </S.Field>
          </S.FormGrid>
        )}
      </T.SectionCard>

      {/* 흐름 — 총액만으로는 "얼마나"에만 답한다 */}
      <T.SectionCard>
        <T.SectionHead>
          품목·상대
          <T.SectionHint>
            무엇을 · 누구와 주고받았는지 · 금액과 비중은 아는 것만 넣어도 된다
          </T.SectionHint>
        </T.SectionHead>

        {flows.length > 0 && (
          <T.CheckBar $warn={shareWarn}>
            <span>
              수출 비중 합{' '}
              {shareCheck.EXPORT > 100.5 ? (
                <T.CheckWarn>{shareCheck.EXPORT.toFixed(1)}%</T.CheckWarn>
              ) : (
                `${shareCheck.EXPORT.toFixed(1)}%`
              )}
            </span>
            <span>
              수입 비중 합{' '}
              {shareCheck.IMPORT > 100.5 ? (
                <T.CheckWarn>{shareCheck.IMPORT.toFixed(1)}%</T.CheckWarn>
              ) : (
                `${shareCheck.IMPORT.toFixed(1)}%`
              )}
            </span>
            {shareWarn && (
              <span>
                합이 100%를 넘습니다 — 상대국별과 품목별을 섞어 넣지 않았는지 보세요
                (단면이 다른 행은 따로 셉니다).
              </span>
            )}
          </T.CheckBar>
        )}

        {flows.length > 0 && (
          <>
            <T.FlowHeadRow>
              <span>방향</span>
              <span>품목</span>
              <span>상대</span>
              <span>금액</span>
              <span>비중 %</span>
              <span />
              <span />
            </T.FlowHeadRow>
            <T.FlowList>
              {flows.map((flow) => (
                <TradeFlowRow
                  key={flow.key}
                  flow={flow}
                  open={openKeys.includes(flow.key)}
                  commodities={commodities}
                  categories={categories}
                  countries={countries}
                  historicalCountries={historicalCountries}
                  organizations={[]}
                  onPatch={(patch) => patchFlow(flow.key, patch)}
                  onToggleDetail={() =>
                    setOpenKeys((prev) =>
                      prev.includes(flow.key)
                        ? prev.filter((key) => key !== flow.key)
                        : [...prev, flow.key],
                    )
                  }
                  onRemove={() => removeFlow(flow.key)}
                />
              ))}
            </T.FlowList>
          </>
        )}

        <T.Toolbar>
          <S.GhostButton type="button" onClick={() => addFlow('EXPORT')}>
            + 수출
          </S.GhostButton>
          <S.GhostButton type="button" onClick={() => addFlow('IMPORT')}>
            + 수입
          </S.GhostButton>
          <T.ToolbarSpacer />
          {flows.length > 0 && (
            <S.GhostButton
              type="button"
              onClick={() =>
                setOpenKeys((prev) =>
                  prev.length === flows.length
                    ? []
                    : flows.map((flow) => flow.key),
                )
              }
            >
              {openKeys.length === flows.length ? '상세 모두 접기' : '상세 모두 펼치기'}
            </S.GhostButton>
          )}
        </T.Toolbar>
      </T.SectionCard>

      {/* 카탈로그 품목 제안 — 자유 입력도 허용하되 표기가 갈리지 않게 붙잡아 준다 */}
      <datalist id="trade-commodity-options">
        {commodities.map((commodity) => (
          <option key={commodity.id} value={commodity.name}>
            {commodity.categoryPath}
          </option>
        ))}
      </datalist>

      <S.FormBar>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {editingId != null
            ? `수정 중${flowsDirty ? ' · 품목 변경됨' : ''}`
            : '같은 연도를 다시 저장하면 갱신됩니다'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {editingId != null && (
            <S.GhostButton type="button" onClick={reset}>
              취소
            </S.GhostButton>
          )}
          <S.PrimaryButton
            type="button"
            onClick={handleSave}
            disabled={upsertMut.isPending}
          >
            {editingId != null ? '수정 저장' : '추가'}
          </S.PrimaryButton>
        </div>
      </S.FormBar>
    </div>
  )
}
