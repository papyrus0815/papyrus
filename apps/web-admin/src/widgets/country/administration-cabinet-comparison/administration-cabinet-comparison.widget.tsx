/**
 * 대시보드「행정부」— 연도 범위 × 국가 매트릭스 (좌측 열: 연도, 우측: 국가별 행정부)
 */
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQueries } from '@tanstack/react-query'

import {
  FiCalendar,
  FiExternalLink,
  FiGlobe,
  FiMoreHorizontal,
  FiMoreVertical,
  FiPlus,
  FiTrash2,
  FiUser,
} from 'react-icons/fi'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import type { CabinetListItemDto } from '@/shared/api/person-career'
import { personCareerApi } from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  EmptyStateFill,
  EmptyStateSpotlight,
} from '@/shared/ui/empty-state/empty-state'
import { SectionTabHeader } from '@/shared/ui/section-page-layout'

import * as S from './administration-cabinet-comparison.styles'

function tenureEndMs(c: CabinetListItemDto): number {
  return c.headTenure.endDate
    ? new Date(c.headTenure.endDate).getTime()
    : Date.now()
}

function cabinetTouchesCalendarYear(
  c: CabinetListItemDto,
  year: number,
): boolean {
  const t0 = new Date(c.headTenure.startDate).getTime()
  const t1 = tenureEndMs(c)
  const y0 = new Date(year, 0, 1).getTime()
  const y1 = new Date(year, 11, 31, 23, 59, 59, 999).getTime()
  return t0 <= y1 && t1 >= y0
}

function cabinetsInYear(
  list: CabinetListItemDto[],
  year: number,
): CabinetListItemDto[] {
  return list
    .filter((c) => cabinetTouchesCalendarYear(c, year))
    .sort(
      (a, b) =>
        new Date(a.headTenure.startDate).getTime() -
        new Date(b.headTenure.startDate).getTime(),
    )
}

function yearBoundsFromCabinets(lists: CabinetListItemDto[][]) {
  let minY = Infinity
  let maxY = -Infinity
  for (const list of lists) {
    for (const c of list) {
      const sy = new Date(c.headTenure.startDate).getFullYear()
      const ey = c.headTenure.endDate
        ? new Date(c.headTenure.endDate).getFullYear()
        : new Date().getFullYear()
      minY = Math.min(minY, sy)
      maxY = Math.max(maxY, ey)
    }
  }
  const y = new Date().getFullYear()
  if (!Number.isFinite(minY)) {
    return { min: y, max: y }
  }
  return { min: minY, max: maxY }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

type ColumnRun =
  | { kind: 'empty'; start: number; end: number }
  | {
      kind: 'multi'
      start: number
      end: number
      cabinets: CabinetListItemDto[]
    }
  | {
      kind: 'single'
      start: number
      end: number
      cabinet: CabinetListItemDto
    }

/** 같은 내각이 연속된 연도면 한 덩어리로 병합 — 2차원 cellMatrix 없이 열만 계산(메모리 절약) */
function computeColumnRunsForList(
  years: number[],
  list: CabinetListItemDto[],
): ColumnRun[] {
  const n = years.length
  const runs: ColumnRun[] = []
  let i = 0
  while (i < n) {
    const cabs = cabinetsInYear(list, years[i]!)
    if (cabs.length === 0) {
      runs.push({ kind: 'empty', start: i, end: i })
      i++
      continue
    }
    if (cabs.length > 1) {
      runs.push({ kind: 'multi', start: i, end: i, cabinets: cabs })
      i++
      continue
    }
    const cab = cabs[0]!
    let end = i
    while (end + 1 < n) {
      const next = cabinetsInYear(list, years[end + 1]!)
      if (next.length === 1 && next[0]!.id === cab.id) {
        end++
      } else {
        break
      }
    }
    runs.push({ kind: 'single', start: i, end, cabinet: cab })
    i = end + 1
  }
  return runs
}

/** 카드 메타: 재임 구간 (연·월, 같은 해는 월만 생략 가능) */
function formatTenureYearRange(head: {
  startDate?: string | null
  endDate?: string | null
}): string {
  if (!head?.startDate) return '—'
  const s = new Date(head.startDate)
  const e = head.endDate ? new Date(head.endDate) : new Date()
  const sy = s.getFullYear()
  const sm = s.getMonth() + 1
  const ey = e.getFullYear()
  const em = e.getMonth() + 1
  if (sy === ey) {
    if (sm === em) return `${sy}년 ${sm}월`
    return `${sy}년 ${sm}월 — ${em}월`
  }
  return `${sy}년 ${sm}월 — ${ey}년 ${em}월`
}

function headProfileThumbSrc(
  head: CabinetListItemDto['headTenure'],
): string | undefined {
  const u = getUploadImageUrl(head?.person?.profileImageUrl)
  return u || undefined
}

const CabinetMiniBlock = memo(function CabinetMiniBlock({
  cab,
  nameOpts,
  stretch,
}: {
  cab: CabinetListItemDto
  nameOpts: Parameters<typeof getPersonDisplayName>[1] | undefined
  stretch: boolean
}) {
  const [thumbFailed, setThumbFailed] = useState(false)
  const head = cab.headTenure
  const thumbSrc = headProfileThumbSrc(head)

  useEffect(() => {
    setThumbFailed(false)
  }, [cab.id, thumbSrc])
  const personName = head?.person
    ? getPersonDisplayName(
        head.person as Parameters<typeof getPersonDisplayName>[0],
        nameOpts,
      )
    : '—'
  const cabName = cab.name?.trim() || head?.title?.trim() || '이름 없는 행정부'
  const tenureYears = head ? formatTenureYearRange(head) : '—'
  const tenureNote = head?.endDate ? '' : ' (재임 중)'
  const profileAlt = head?.person
    ? `${personName} 프로필 사진`
    : '수반 프로필 사진'

  const thumbNode =
    thumbSrc && !thumbFailed ? (
      <S.MiniCabinetThumbImg
        src={thumbSrc}
        alt={profileAlt}
        loading="lazy"
        onError={() => setThumbFailed(true)}
      />
    ) : (
      <S.MiniCabinetThumbFallback aria-hidden>
        <FiUser size={stretch ? 24 : 18} strokeWidth={2} />
      </S.MiniCabinetThumbFallback>
    )

  return (
    <S.MiniCabinet $stretch={stretch}>
      <S.MiniCabinetContent $centered={stretch}>
        {stretch ? (
          <>
            <S.MiniCabinetThumb $large>{thumbNode}</S.MiniCabinetThumb>
            <S.MiniCabinetTitle>{cabName}</S.MiniCabinetTitle>
            <S.MiniCabinetMeta>
              수반 {personName}
              <br />
              재임 {tenureYears}
              {tenureNote}
            </S.MiniCabinetMeta>
          </>
        ) : (
          <S.MiniCabinetMediaRow>
            <S.MiniCabinetThumb>{thumbNode}</S.MiniCabinetThumb>
            <S.MiniCabinetTextCol>
              <S.MiniCabinetTitle>{cabName}</S.MiniCabinetTitle>
              <S.MiniCabinetMeta>
                수반 {personName}
                <br />
                재임 {tenureYears}
                {tenureNote}
              </S.MiniCabinetMeta>
            </S.MiniCabinetTextCol>
          </S.MiniCabinetMediaRow>
        )}
      </S.MiniCabinetContent>
    </S.MiniCabinet>
  )
})

export interface AdministrationCabinetComparisonProps {
  territories: UnifiedCountry[]
  onOpenCountryPicker: () => void
  onNavigateGovernment: (territoryId: string) => void
  onRemoveTerritory: (t: UnifiedCountry) => void
  /** 국가 열 순서 변경 (드래그 앤 드롭) */
  onReorderTerritories?: (fromIndex: number, toIndex: number) => void
}

export function AdministrationCabinetComparison({
  territories,
  onOpenCountryPicker,
  onNavigateGovernment,
  onRemoveTerritory,
  onReorderTerritories,
}: AdministrationCabinetComparisonProps) {
  const queries = useQueries({
    queries: territories.map((t) => ({
      queryKey: [
        'dashboard-cabinets',
        t.type === 'modern' ? t.id : null,
        t.type === 'historical' ? t.id : null,
      ],
      queryFn: () =>
        personCareerApi.getCabinets({
          countryId: t.type === 'modern' ? t.id : undefined,
          historicalCountryId: t.type === 'historical' ? t.id : undefined,
        }),
      enabled: territories.length > 0,
    })),
  })

  const cabinetLists = useMemo(
    () =>
      territories.map((_, i) => {
        const raw = queries[i]?.data
        return Array.isArray(raw) ? raw : []
      }),
    [territories, queries],
  )

  const yearBounds = useMemo(
    () => yearBoundsFromCabinets(cabinetLists),
    [cabinetLists],
  )

  const yNow = new Date().getFullYear()
  const [yearFromInput, setYearFromInput] = useState(yNow - 10)
  const [yearToInput, setYearToInput] = useState(yNow)

  const territoryKey = useMemo(
    () => territories.map((t) => `${t.type}:${t.id}`).join('|'),
    [territories],
  )
  const prevTerritoryKeyRef = useRef('')

  /** 비교 국가 구성이 바뀌면 표시 연도를 데이터 전 구간으로 맞춤 */
  useEffect(() => {
    if (territories.length === 0) {
      prevTerritoryKeyRef.current = ''
      return
    }
    if (prevTerritoryKeyRef.current !== territoryKey) {
      prevTerritoryKeyRef.current = territoryKey
      setYearFromInput(yearBounds.min)
      setYearToInput(yearBounds.max)
    }
  }, [territoryKey, territories.length, yearBounds.min, yearBounds.max])

  /** 데이터 범위가 바뀌면 입력이 범위 밖이면 min/max로 보정 (과거만 있는 국가에서 연도 행이 쭉 나오도록) */
  useEffect(() => {
    if (territories.length === 0) return
    setYearFromInput((prev) =>
      prev < yearBounds.min || prev > yearBounds.max ? yearBounds.min : prev,
    )
    setYearToInput((prev) =>
      prev < yearBounds.min || prev > yearBounds.max ? yearBounds.max : prev,
    )
  }, [yearBounds.min, yearBounds.max, territories.length])

  const effFrom = useMemo(() => {
    const a = clamp(yearFromInput, yearBounds.min, yearBounds.max)
    const b = clamp(yearToInput, yearBounds.min, yearBounds.max)
    return Math.min(a, b)
  }, [yearFromInput, yearToInput, yearBounds.min, yearBounds.max])

  const effTo = useMemo(() => {
    const a = clamp(yearFromInput, yearBounds.min, yearBounds.max)
    const b = clamp(yearToInput, yearBounds.min, yearBounds.max)
    return Math.max(a, b)
  }, [yearFromInput, yearToInput, yearBounds.min, yearBounds.max])

  const displayYears = useMemo(() => {
    const years: number[] = []
    for (let y = effFrom; y <= effTo; y++) years.push(y)
    return years
  }, [effFrom, effTo])

  const yearInputsInverted =
    clamp(yearFromInput, yearBounds.min, yearBounds.max) >
    clamp(yearToInput, yearBounds.min, yearBounds.max)

  const normalizeYearInputsOnBlur = useCallback(() => {
    const a = clamp(yearFromInput, yearBounds.min, yearBounds.max)
    const b = clamp(yearToInput, yearBounds.min, yearBounds.max)
    if (a > b) {
      setYearFromInput(b)
      setYearToInput(a)
    }
  }, [yearFromInput, yearToInput, yearBounds.min, yearBounds.max])

  const columnRuns = useMemo(
    () =>
      territories.map((_, colIdx) =>
        computeColumnRunsForList(
          displayYears,
          cabinetLists[colIdx] ?? [],
        ),
      ),
    [displayYears, cabinetLists, territories],
  )

  const [dragOverCol, setDragOverCol] = useState<number | null>(null)
  /** dragOver는 dragStart 직후에도 호출되므로 ref로 동기 판별 */
  const columnDragActiveRef = useRef(false)
  const [headMenuColIdx, setHeadMenuColIdx] = useState<number | null>(null)

  const DND_KEY = 'application/x-papyrus-admin-col'

  useEffect(() => {
    if (headMenuColIdx === null) return
    const onDocMouseDown = (e: MouseEvent) => {
      const root = document.getElementById(`admin-head-menu-${headMenuColIdx}`)
      if (root && !root.contains(e.target as Node)) {
        setHeadMenuColIdx(null)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [headMenuColIdx])

  const nameOptsByIndex = useMemo(
    () =>
      territories.map((t) =>
        t.type === 'modern'
          ? { countryDefaultNameDisplayOrder: t.defaultNameDisplayOrder }
          : undefined,
      ),
    [territories],
  )

  const anyLoading = queries.some((q) => q.isLoading)

  const sectionDescription =
    '연도별로 한 행씩 비교하고, 같은 내각이 이어지면 셀이 세로로 붙습니다. 국가 열 머리글을 드래그해 순서를 바꿀 수 있습니다.'

  return (
    <S.WideShell>
      <S.PageHeaderBlock>
        <SectionTabHeader
          variant="plain"
          title="행정부 비교"
          description={sectionDescription}
          leftSlot={
            <S.SectionHeaderIconWrap aria-hidden>
              <FiGlobe size={22} strokeWidth={2} />
            </S.SectionHeaderIconWrap>
          }
          rightSlot={
            <S.PrimaryBtn type="button" onClick={onOpenCountryPicker}>
              <FiPlus size={18} strokeWidth={2.5} aria-hidden />
              {territories.length ? '국가 추가 · 편집' : '국가 선택하기'}
            </S.PrimaryBtn>
          }
        />
      </S.PageHeaderBlock>
      {territories.length > 0 ? (
        <S.PageMetaStrip>
          <S.MetaChip>비교 국가 {territories.length}개</S.MetaChip>
          <S.MetaChip>표시 연도 {displayYears.length}행</S.MetaChip>
          <S.MetaChip>
            데이터 {yearBounds.min}–{yearBounds.max}
          </S.MetaChip>
        </S.PageMetaStrip>
      ) : null}

      {territories.length === 0 ? (
        <EmptyStateFill>
          <EmptyStateSpotlight
            flat
            fill={false}
            icon={<FiGlobe size={30} strokeWidth={1.75} aria-hidden />}
            title="비교할 국가를 선택하세요"
            description="모달에서 현대·역사 국가를 복수 선택할 수 있습니다. 선택 후 연도 범위를 조정해 같은 시기의 정부를 나란히 비교하세요."
            primaryAction={{
              label: '국가 선택 열기',
              onClick: onOpenCountryPicker,
              icon: <FiPlus size={18} strokeWidth={2.5} aria-hidden />,
            }}
          />
        </EmptyStateFill>
      ) : (
        <>
          <S.RangeFilterCard>
            <S.RangeFilterHead>
              <S.RangeFilterTitle>
                <FiCalendar size={16} strokeWidth={2.25} aria-hidden />
                연도 범위
              </S.RangeFilterTitle>
              <S.GhostBtn
                type="button"
                onClick={() => {
                  setYearFromInput(yearBounds.min)
                  setYearToInput(yearBounds.max)
                }}
              >
                데이터 전 구간
              </S.GhostBtn>
            </S.RangeFilterHead>
            <S.RangeFilterRow>
              <S.RangeField>
                <S.RangeLabel>시작</S.RangeLabel>
                <S.RangeInput
                  type="number"
                  min={yearBounds.min}
                  max={yearBounds.max}
                  value={yearFromInput}
                  onChange={(e) =>
                    setYearFromInput(Number(e.target.value) || yearBounds.min)
                  }
                  onBlur={normalizeYearInputsOnBlur}
                />
              </S.RangeField>
              <S.RangeConnector aria-hidden>~</S.RangeConnector>
              <S.RangeField>
                <S.RangeLabel>끝</S.RangeLabel>
                <S.RangeInput
                  type="number"
                  min={yearBounds.min}
                  max={yearBounds.max}
                  value={yearToInput}
                  onChange={(e) =>
                    setYearToInput(Number(e.target.value) || yearBounds.max)
                  }
                  onBlur={normalizeYearInputsOnBlur}
                />
              </S.RangeField>
            </S.RangeFilterRow>
            {yearInputsInverted ? (
              <S.RangeOrderNote role="status">
                시작·끝 연도가 뒤바뀌었습니다. 표시는 {effFrom}년부터 {effTo}
                년까지이며, 필드를 벗어나면 자동으로 맞춰집니다.
              </S.RangeOrderNote>
            ) : null}
            <S.RangeHint>
              재임 데이터가 있는 해는 {yearBounds.min}년 — {yearBounds.max}
              년입니다. 현재 표시는 {effFrom}년 — {effTo}년, 위 구간 안에서 매
              연도가 한 행씩 이어집니다.
            </S.RangeHint>
          </S.RangeFilterCard>

          {anyLoading ? (
            <S.LoadingBar role="status" aria-live="polite">
              국가별 행정부를 불러오는 중…
            </S.LoadingBar>
          ) : null}

          <S.MatrixScroll>
            <S.MatrixGrid
              $nCountries={territories.length}
              $nDataRows={displayYears.length}
              role="grid"
              aria-label="연도별 국가 행정부 비교"
              onDragOver={(e) => {
                if (onReorderTerritories && columnDragActiveRef.current) {
                  e.preventDefault()
                }
              }}
            >
              <S.CellCorner>연도</S.CellCorner>
              {territories.map((t, colIdx) => {
                const canDrag = Boolean(onReorderTerritories)
                return (
                  <S.CellCountryHead
                    key={`h-${t.type}-${t.id}`}
                    $gridColumn={colIdx + 2}
                    $canReorder={canDrag}
                    $dragOver={canDrag && dragOverCol === colIdx}
                    draggable={canDrag}
                    onDragStart={
                      canDrag
                        ? (e) => {
                            const target = e.target as HTMLElement | null
                            if (target?.closest('[data-admin-col-stop-dnd]')) {
                              e.preventDefault()
                              return
                            }
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', String(colIdx))
                            e.dataTransfer.setData(DND_KEY, String(colIdx))
                            columnDragActiveRef.current = true
                          }
                        : undefined
                    }
                    onDragEnd={
                      canDrag
                        ? () => {
                            columnDragActiveRef.current = false
                            setDragOverCol(null)
                          }
                        : undefined
                    }
                    onDragOver={
                      canDrag
                        ? (e) => {
                            if (!columnDragActiveRef.current) return
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            setDragOverCol(colIdx)
                          }
                        : undefined
                    }
                    onDragLeave={
                      canDrag
                        ? (e) => {
                            if (
                              e.currentTarget.contains(
                                e.relatedTarget as Node | null,
                              )
                            ) {
                              return
                            }
                            setDragOverCol(null)
                          }
                        : undefined
                    }
                    onDrop={
                      canDrag
                        ? (e) => {
                            e.preventDefault()
                            setDragOverCol(null)
                            columnDragActiveRef.current = false
                            const raw =
                              e.dataTransfer.getData(DND_KEY) ||
                              e.dataTransfer.getData('text/plain')
                            const from = Number(raw)
                            if (
                              !Number.isNaN(from) &&
                              from >= 0 &&
                              from < territories.length
                            ) {
                              onReorderTerritories?.(from, colIdx)
                            }
                          }
                        : undefined
                    }
                  >
                    <S.HeadHeaderRow>
                      <S.HeadTopRow>
                        {canDrag ? (
                          <S.HeadGripVisual aria-hidden>
                            <FiMoreVertical size={15} strokeWidth={2.2} />
                          </S.HeadGripVisual>
                        ) : null}
                        <S.HeadTitleBlock>
                          <S.HeadFlag>
                            {t.type === 'modern' && t.flagEmoji
                              ? t.flagEmoji
                              : '🌐'}
                          </S.HeadFlag>
                          <S.HeadName>{t.name}</S.HeadName>
                        </S.HeadTitleBlock>
                      </S.HeadTopRow>
                      <S.HeadMenuAnchor
                        id={`admin-head-menu-${colIdx}`}
                        data-admin-col-stop-dnd
                      >
                        <S.HeadMoreTrigger
                          type="button"
                          draggable={false}
                          aria-expanded={headMenuColIdx === colIdx}
                          aria-haspopup="menu"
                          aria-label={`${t.name} 열 메뉴`}
                          onClick={() =>
                            setHeadMenuColIdx((v) =>
                              v === colIdx ? null : colIdx,
                            )
                          }
                        >
                          <FiMoreHorizontal size={18} strokeWidth={2} />
                        </S.HeadMoreTrigger>
                        {headMenuColIdx === colIdx ? (
                          <S.HeadMenuPanel role="menu">
                            <S.HeadMenuItem
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setHeadMenuColIdx(null)
                                onNavigateGovernment(t.id)
                              }}
                            >
                              <FiExternalLink size={16} strokeWidth={2.2} />
                              정부 페이지
                            </S.HeadMenuItem>
                            <S.HeadMenuItem
                              type="button"
                              role="menuitem"
                              $danger
                              onClick={() => {
                                setHeadMenuColIdx(null)
                                onRemoveTerritory(t)
                              }}
                            >
                              <FiTrash2 size={16} strokeWidth={2.2} />
                              비교에서 제거
                            </S.HeadMenuItem>
                          </S.HeadMenuPanel>
                        ) : null}
                      </S.HeadMenuAnchor>
                    </S.HeadHeaderRow>
                  </S.CellCountryHead>
                )
              })}

              {displayYears.map((year, rowIdx) => (
                <S.CellYear key={year} $gridRow={rowIdx + 2}>
                  {year}
                </S.CellYear>
              ))}

              {territories.flatMap((t, colIdx) => {
                const nameOpts = nameOptsByIndex[colIdx]
                const colLoading = queries[colIdx]?.isLoading ?? false
                const runs = columnRuns[colIdx] ?? []
                const gridCol = colIdx + 2

                return runs.map((run) => {
                  const rowStart = 2 + run.start
                  const rowEnd = 3 + run.end
                  const runKey = `${t.type}-${t.id}-r${run.start}-${run.end}-${run.kind}`

                  if (run.kind === 'empty') {
                    return (
                      <S.CellData
                        key={runKey}
                        $gridColumn={gridCol}
                        $gridRowStart={rowStart}
                        $gridRowEnd={rowEnd}
                        $centerContent
                      >
                        {colLoading ? (
                          <S.CellStateText>불러오는 중…</S.CellStateText>
                        ) : (
                          <S.CellStateText $muted>해당 없음</S.CellStateText>
                        )}
                      </S.CellData>
                    )
                  }

                  if (run.kind === 'multi') {
                    return (
                      <S.CellData
                        key={runKey}
                        $gridColumn={gridCol}
                        $gridRowStart={rowStart}
                        $gridRowEnd={rowEnd}
                        $centerContent={colLoading}
                      >
                        {colLoading ? (
                          <S.CellStateText>불러오는 중…</S.CellStateText>
                        ) : (
                          <S.CellDataInner>
                            {run.cabinets.map((cab) => (
                              <CabinetMiniBlock
                                key={cab.id}
                                cab={cab}
                                nameOpts={nameOpts}
                                stretch={false}
                              />
                            ))}
                          </S.CellDataInner>
                        )}
                      </S.CellData>
                    )
                  }

                  const cab = run.cabinet
                  const spanRows = run.end - run.start + 1
                  const stretch = spanRows > 1

                  return (
                    <S.CellData
                      key={runKey}
                      $gridColumn={gridCol}
                      $gridRowStart={rowStart}
                      $gridRowEnd={rowEnd}
                      $centerContent={colLoading}
                    >
                      {colLoading ? (
                        <S.CellStateText>불러오는 중…</S.CellStateText>
                      ) : (
                        <S.CellDataInner>
                          <CabinetMiniBlock
                            cab={cab}
                            nameOpts={nameOpts}
                            stretch={stretch}
                          />
                        </S.CellDataInner>
                      )}
                    </S.CellData>
                  )
                })
              })}
            </S.MatrixGrid>
          </S.MatrixScroll>
        </>
      )}
    </S.WideShell>
  )
}
