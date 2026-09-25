/**
 * 인물 통계 패널 — '통계' 토글로 여닫는다. 현재 필터 결과(people)만 집계한다.
 *
 *   ┌ 인물 ─────┬ 평균 수명 ─┬ 생존 ─────┬ 군주·국가원수 ┐   ← 스탯 타일 4
 *   │ 시대 분포                                  최대 12명 │
 *   │ ▁▂▃▅▇▆▃▂▁ … (연대별 막대, 단색)                     │   ← 막대 = 인물 수(크기)
 *   │ 200BC  0  200  400 …                              │
 *   │ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │   ← 시대 구간 리본(연도 비례)
 *   │ [■고대 4][■중세 4][■근세 9][■근대 19c 4][■현대 20c 9] │   ← 시대 칩(글자 라벨·필터)
 *   ├ 지역 ────────────┬ 분야 ────────────┬ 상위 국가 ────┤   ← 가로 막대 목록 3
 *
 * 색의 역할(데이터 시각화 원칙):
 *  - 막대는 '몇 명인가(크기)'라 **단색 indigo**. 항목 식별은 막대 옆 글자가 한다.
 *  - 시대·분야처럼 앱 전역에서 쓰는 식별색은 막대가 아니라 **작은 견본 점**으로만 곁들인다
 *    (현대 20c·당대 두 시대색은 색각 이상에서 구분되지 않아 색 단독 식별 금지 — 글자 라벨 필수).
 *  - 글자·수치는 항상 텍스트 토큰 색(식별색으로 글자를 칠하지 않는다).
 * 모든 항목·막대·시대 띠는 클릭하면 해당 scope 필터를 토글한다(필터 패널과 양방향).
 */
import { useMemo, useState, type ReactNode } from 'react'

import styled, { css } from 'styled-components'

import { yearOfEra } from '../model/adapt'
import { formatYear } from '../model/century'
import {
  colorForField,
  ERAS,
  FIELDS,
  INFOGRAPHIC_DEFAULTS,
  REGION_COLORS,
  REGIONS,
} from '../model/constants'
import { usePersonInfographicFilterStore } from '../model/filter.store'
import { pickTickStep } from '../model/tick-step'
import type { AdaptedPerson } from '../model/types'

import { BRAND, hairline, metaText, MOTION_FAST, surface } from './_shared/catalog.styles'

/** 축 상한 — 당대 인물까지 담는다 */
const MAX_Y = 2030
/** 축 하한의 바닥 — 데이터가 더 오래돼도 이 이전은 한 칸으로 몰린다 */
const FLOOR_Y = -3000
/** 막대 폭 후보(년) — 막대 수가 BINS 목표를 넘지 않는 가장 촘촘한 값을 고른다 */
const BIN_WIDTHS = [10, 20, 25, 50, 100, 200, 250, 500]
const BINS = INFOGRAPHIC_DEFAULTS.ERA_DENSITY_BINS

/**
 * 시대 분포 축 — 고정 -200~2030 이 아니라 실제 인물 범위에 맞춘다.
 * (중세 이후 인물만 있으면 왼쪽 40%가 빈 막대로 남던 문제)
 * 막대 경계가 25·50·100년처럼 떨어져야 툴팁 구간이 읽힌다.
 */
function buildDomain(people: AdaptedPerson[]) {
  let earliest = MAX_Y
  for (const person of people) {
    if (person.activityYear < earliest) earliest = person.activityYear
  }
  earliest = Math.max(FLOOR_Y, earliest)
  const span = Math.max(100, MAX_Y - earliest)
  const binWidth =
    BIN_WIDTHS.find((width) => span / width <= BINS) ??
    BIN_WIDTHS[BIN_WIDTHS.length - 1]
  const minYear = Math.floor(earliest / binWidth) * binWidth
  const binCount = Math.ceil((MAX_Y - minYear) / binWidth)
  const maxYear = minYear + binCount * binWidth
  const range = maxYear - minYear
  const tickStep = pickTickStep(range / 7)
  const ticks: number[] = []
  for (let year = Math.ceil(minYear / tickStep) * tickStep; year <= maxYear; year += tickStep)
    ticks.push(year)
  return {
    minYear,
    binWidth,
    binCount,
    ticks,
    pct: (year: number) => ((year - minYear) / range) * 100,
  }
}

/** '기타'는 분류 잔여라 순위에 끼지 않는다 — 항상 목록 맨 뒤, 회색 막대 */
const RESIDUAL = '기타'
const residualLast = (left: readonly [string, number], right: readonly [string, number]) =>
  Number(left[0] === RESIDUAL) - Number(right[0] === RESIDUAL) || right[1] - left[1]

const colorForRegion = (region: string): string =>
  REGION_COLORS[Math.max(0, REGIONS.indexOf(region)) % REGION_COLORS.length]

interface HoverBin {
  index: number
  count: number
  from: number
  to: number
  eraLbl: string
  eraColor: string
  x: number
  y: number
}

export function HeaderStats({ people }: { people: AdaptedPerson[] }) {
  const scopes = usePersonInfographicFilterStore((state) => state.scopes)
  const toggleScope = usePersonInfographicFilterStore((state) => state.toggleScope)
  const [hoverBin, setHoverBin] = useState<HoverBin | null>(null)
  const [countriesExpanded, setCountriesExpanded] = useState(false)

  const domain = useMemo(() => buildDomain(people), [people])
  const { pct } = domain

  const stats = useMemo(() => {
    const bins = new Array<number>(domain.binCount).fill(0)
    const eraCount: Record<string, number> = {}
    const regionCount: Record<string, number> = {}
    const fieldCount: Record<string, number> = {}
    const countryCount: Record<string, number> = {}
    let ageSum = 0
    let ageN = 0
    let alive = 0
    let rulers = 0
    for (const person of people) {
      const binIndex = Math.min(
        domain.binCount - 1,
        Math.max(0, Math.floor((person.activityYear - domain.minYear) / domain.binWidth)),
      )
      bins[binIndex]++
      eraCount[person.era.key] = (eraCount[person.era.key] || 0) + 1
      regionCount[person.region] = (regionCount[person.region] || 0) + 1
      fieldCount[person.field] = (fieldCount[person.field] || 0) + 1
      if (person.country && person.country !== '미상')
        countryCount[person.country] = (countryCount[person.country] || 0) + 1
      if (person.age != null && !person.isAlive) {
        ageSum += person.age
        ageN++
      }
      if (person.isAlive) alive++
      if (person.isMonarch || person.isHeadOfState) rulers++
    }
    const maxBin = Math.max(1, ...bins)
    const regions = REGIONS.filter((region) => regionCount[region])
      .map((region) => [region, regionCount[region]] as const)
      .sort(residualLast)
    const fields = FIELDS.filter((field) => fieldCount[field])
      .map((field) => [field, fieldCount[field]] as const)
      .sort(residualLast)
    const countries = Object.entries(countryCount).sort(
      (left, right) => right[1] - left[1],
    )
    return {
      bins,
      maxBin,
      eraCount,
      regions,
      fields,
      countries,
      avgAge: ageN ? Math.round(ageSum / ageN) : null,
      alive,
      rulers,
    }
  }, [people, domain])

  const total = people.length
  const countryList = stats.countries.slice(
    0,
    countriesExpanded
      ? INFOGRAPHIC_DEFAULTS.TOP_COUNTRY_EXPANDED
      : INFOGRAPHIC_DEFAULTS.TOP_COUNTRY_DEFAULT,
  )
  const hiddenCountries =
    Math.min(stats.countries.length, INFOGRAPHIC_DEFAULTS.TOP_COUNTRY_EXPANDED) -
    INFOGRAPHIC_DEFAULTS.TOP_COUNTRY_DEFAULT

  const eraFiltered = scopes.era.length > 0
  const yearTicks = domain.ticks

  const share = (value: number) => (total ? Math.round((value / total) * 100) : 0)

  return (
    <Panel aria-label="인물 통계">
      <Tiles>
        <Tile>
          <TileLabel>인물</TileLabel>
          <TileValue>
            {total.toLocaleString()}
            <TileUnit>명</TileUnit>
          </TileValue>
          <TileNote>현재 필터 기준</TileNote>
        </Tile>
        <Tile>
          <TileLabel>평균 수명</TileLabel>
          <TileValue>
            {stats.avgAge ?? '—'}
            {stats.avgAge != null && <TileUnit>년</TileUnit>}
          </TileValue>
          <TileNote>생몰이 모두 확인된 인물</TileNote>
        </Tile>
        <Tile>
          <TileLabel>생존</TileLabel>
          <TileValue>
            {stats.alive.toLocaleString()}
            <TileUnit>명</TileUnit>
          </TileValue>
          <TileNote>전체의 {share(stats.alive)}%</TileNote>
        </Tile>
        <Tile>
          <TileLabel>군주·국가원수</TileLabel>
          <TileValue>
            {stats.rulers.toLocaleString()}
            <TileUnit>명</TileUnit>
          </TileValue>
          <TileNote>전체의 {share(stats.rulers)}%</TileNote>
        </Tile>
      </Tiles>

      <Section>
        <SectionHead>
          <SectionTitle>시대 분포</SectionTitle>
          <SectionHint>활동 연도 기준 · 막대를 누르면 그 시대로 거릅니다</SectionHint>
          <SectionMeta>최대 {stats.maxBin.toLocaleString()}명</SectionMeta>
        </SectionHead>

        <Chart>
          <Plot onMouseLeave={() => setHoverBin(null)}>
            <GridLine style={{ bottom: '100%' }} aria-hidden />
            <GridLine style={{ bottom: '50%' }} aria-hidden />
            {stats.bins.map((count, index) => {
              const from = domain.minYear + domain.binWidth * index
              const to = from + domain.binWidth
              const era = yearOfEra(from + domain.binWidth / 2)
              const inFilter = !eraFiltered || scopes.era.includes(era.key)
              const label = `${era.lbl} ${formatYear(from)}–${formatYear(to)}, ${count}명`
              const show = (x: number, y: number) =>
                setHoverBin({
                  index,
                  count,
                  from,
                  to,
                  eraLbl: era.lbl,
                  eraColor: era.color,
                  x,
                  y,
                })
              return (
                <Column
                  key={index}
                  type="button"
                  aria-label={`${label}, 시대 필터 토글`}
                  $hovered={hoverBin?.index === index}
                  onMouseMove={(event) => show(event.clientX, event.clientY)}
                  onFocus={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect()
                    show(rect.left + rect.width / 2, rect.top)
                  }}
                  onBlur={() => setHoverBin(null)}
                  onClick={() => toggleScope('era', era.key)}
                >
                  <ColumnBar
                    $dim={!inFilter}
                    style={{
                      height: count ? `${Math.max(3, (count / stats.maxBin) * 100)}%` : 0,
                    }}
                  />
                </Column>
              )
            })}
          </Plot>

          <Axis aria-hidden>
            {yearTicks.map((year) => (
              <Tick key={year} style={{ left: `${pct(year)}%` }}>
                {year === 0 ? '0' : formatYear(year)}
              </Tick>
            ))}
          </Axis>

          {/* 시대 구간 리본 — 연도 비례 위치만 보여주는 얇은 띠(라벨은 아래 칩 줄이 담당) */}
          <EraRibbon aria-hidden>
            {ERAS.map((era) => {
              const left = Math.max(0, pct(era.from))
              const right = Math.min(100, pct(era.to))
              if (right <= left) return null
              return (
                <EraRibbonPart
                  key={era.key}
                  $dim={eraFiltered && !scopes.era.includes(era.key)}
                  style={{ left: `${left}%`, width: `${right - left}%`, background: era.color }}
                />
              )
            })}
          </EraRibbon>

          {/* 시대 칩 — 연도 비례가 아니라 같은 폭 규칙으로 나열해, 좁은 근·현대 구간도
              이름과 인원이 항상 글자로 읽힌다(색만으로 시대를 식별하지 않는다). */}
          <EraChips>
            {ERAS.map((era) => {
              const count = stats.eraCount[era.key] ?? 0
              const active = scopes.era.includes(era.key)
              // 0명 시대는 칩을 내지 않는다(누를 것이 없는 칩) — 필터로 켜져 있으면 끌 수 있게 남김
              if (count === 0 && !active) return null
              return (
                <EraChip
                  key={era.key}
                  type="button"
                  $active={active}
                  $dim={eraFiltered && !active}
                  aria-label={`${era.lbl} ${count}명, 시대 필터 토글`}
                  aria-pressed={active}
                  onClick={() => toggleScope('era', era.key)}
                >
                  <EraSwatch style={{ background: era.color }} aria-hidden />
                  <EraName>{era.lbl}</EraName>
                  <EraCount>{count.toLocaleString()}</EraCount>
                </EraChip>
              )
            })}
          </EraChips>
        </Chart>
      </Section>

      <Lists>
        <BarSection
          title="지역"
          rows={stats.regions.map(([region, count]) => ({
            key: region,
            label: region,
            count,
            swatch: colorForRegion(region),
            active: scopes.region.includes(region),
            onToggle: () => toggleScope('region', region),
          }))}
          total={total}
          anyActive={scopes.region.length > 0}
        />
        <BarSection
          title="분야"
          rows={stats.fields.map(([field, count]) => ({
            key: field,
            label: field,
            count,
            swatch: colorForField(field),
            active: scopes.field.includes(field),
            onToggle: () => toggleScope('field', field),
          }))}
          total={total}
          anyActive={scopes.field.length > 0}
        />
        <BarSection
          title="상위 국가"
          ranked
          rows={countryList.map(([country, count]) => ({
            key: country,
            label: country,
            count,
            active: scopes.country.includes(country),
            onToggle: () => toggleScope('country', country),
          }))}
          total={total}
          anyActive={scopes.country.length > 0}
          footer={
            hiddenCountries > 0 && (
              <MoreToggle
                type="button"
                onClick={() => setCountriesExpanded((prev) => !prev)}
              >
                {countriesExpanded ? '접기' : `+ ${hiddenCountries}개국 더 보기`}
              </MoreToggle>
            )
          }
        />
      </Lists>

      {hoverBin && (
        <Tooltip
          role="tooltip"
          style={{ top: hoverBin.y - 12, left: hoverBin.x }}
        >
          <TooltipValue>{hoverBin.count.toLocaleString()}명</TooltipValue>
          <TooltipRow>
            <TooltipKey style={{ background: hoverBin.eraColor }} aria-hidden />
            {hoverBin.eraLbl}
          </TooltipRow>
          <TooltipRange>
            {formatYear(hoverBin.from)} – {formatYear(hoverBin.to)}
          </TooltipRange>
        </Tooltip>
      )}
    </Panel>
  )
}

/* ─── 가로 막대 목록 ─────────────────────────────────────────────────── */

interface BarRowData {
  key: string
  label: string
  count: number
  swatch?: string
  active: boolean
  onToggle: () => void
}

function BarSection({
  title,
  rows,
  total,
  anyActive,
  ranked,
  footer,
}: {
  title: string
  rows: BarRowData[]
  total: number
  anyActive: boolean
  ranked?: boolean
  footer?: ReactNode
}) {
  const max = Math.max(1, ...rows.map((row) => row.count))
  return (
    <ListSection>
      <SectionHead>
        <SectionTitle>{title}</SectionTitle>
        <SectionMeta>{rows.length}개</SectionMeta>
      </SectionHead>
      {rows.length === 0 ? (
        <Empty>데이터 없음</Empty>
      ) : (
        <BarList>
          {rows.map((row, index) => (
            <BarRow
              key={row.key}
              type="button"
              $active={row.active}
              $dim={anyActive && !row.active}
              aria-pressed={row.active}
              aria-label={`${ranked ? `${index + 1}위 ` : ''}${row.label} ${row.count}명, 필터 토글`}
              onClick={row.onToggle}
            >
              <BarLabel>
                {ranked ? (
                  <Rank>{index + 1}</Rank>
                ) : (
                  <Swatch style={{ background: row.swatch }} aria-hidden />
                )}
                <BarName title={row.label}>{row.label}</BarName>
              </BarLabel>
              <BarTrack aria-hidden>
                <BarFill
                  $residual={row.label === RESIDUAL}
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </BarTrack>
              <BarValue>
                {row.count.toLocaleString()}
                <BarShare>{total ? Math.round((row.count / total) * 100) : 0}%</BarShare>
              </BarValue>
            </BarRow>
          ))}
        </BarList>
      )}
      {footer}
    </ListSection>
  )
}

/* ─── 스타일 ─────────────────────────────────────────────────────────── */

const Panel = styled.section`
  margin-top: 16px;
  border-radius: 14px;
  border: 1px solid ${hairline};
  background: ${surface};
  overflow: hidden;
`

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-bottom: 1px solid ${hairline};

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const Tile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  min-width: 0;

  & + & {
    border-left: 1px solid ${hairline};
  }
  @media (max-width: 900px) {
    &:nth-child(3) {
      border-left: none;
    }
    &:nth-child(n + 3) {
      border-top: 1px solid ${hairline};
    }
  }
`

const TileLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
`

const TileValue = styled.span`
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TileUnit = styled.span`
  margin-left: 2px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TileNote = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Section = styled.div`
  padding: 16px 20px 18px;
  border-bottom: 1px solid ${hairline};
`

const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
  min-width: 0;
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SectionHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 640px) {
    display: none;
  }
`

const SectionMeta = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Chart = styled.div`
  position: relative;
`

const Plot = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 2px;
  height: 120px;
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)')};
`

const GridLine = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: ${hairline};
  pointer-events: none;
`

/** 열 전체가 히트 영역 — 막대가 작아도 겨누기 쉽다 */
const Column = styled.button<{ $hovered: boolean }>`
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  padding: 0;
  border: none;
  border-radius: 4px 4px 0 0;
  background: ${({ $hovered, theme }) =>
    $hovered ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)') : 'transparent'};
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const ColumnBar = styled.span<{ $dim: boolean }>`
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: ${({ $dim, theme }) =>
    $dim ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : '#d5dbe4') : BRAND.primary};
  transition: height 0.25s ease, background ${MOTION_FAST};

  ${Column}:hover & {
    background: ${({ $dim }) => ($dim ? undefined : BRAND.primaryHover)};
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Axis = styled.div`
  position: relative;
  height: 20px;
`

const Tick = styled.span`
  /* 좁은 화면 — 눈금 글자가 겹치지 않게 격번만 */
  @media (max-width: 640px) {
    &:nth-child(even) {
      display: none;
    }
  }
  position: absolute;
  top: 5px;
  transform: translateX(-50%);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const EraRibbon = styled.div`
  position: relative;
  height: 4px;
  margin-top: 2px;
`

const EraRibbonPart = styled.span<{ $dim: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 2px;
  /* 이웃 구간과 2px 표면 간격 */
  box-shadow: 0 0 0 1px ${surface};
  opacity: ${({ $dim }) => ($dim ? 0.25 : 0.9)};
  transition: opacity ${MOTION_FAST};
`

const EraChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
`

const EraChip = styled.button<{ $active: boolean; $dim: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${hairline};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff')};
  cursor: pointer;
  opacity: ${({ $dim }) => ($dim ? 0.55 : 1)};
  transition: background ${MOTION_FAST}, border-color ${MOTION_FAST}, opacity ${MOTION_FAST};

  &:hover {
    opacity: 1;
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f4f6f9')};
  }
  ${({ $active, theme }) =>
    $active &&
    css`
      border-color: ${BRAND.primaryBorderHover};
      background: ${theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
      &:hover {
        background: ${theme.mode === 'dark' ? BRAND.primaryFillDark : BRAND.primarySoftHover};
      }
    `}
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const EraSwatch = styled.span`
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 2px;
`

const EraName = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EraCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Lists = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const ListSection = styled.div`
  padding: 16px 16px 14px 20px;
  min-width: 0;

  & + & {
    border-left: 1px solid ${hairline};
  }
  @media (max-width: 1100px) {
    &:nth-child(3) {
      grid-column: 1 / -1;
      border-left: none;
      border-top: 1px solid ${hairline};
    }
  }
  @media (max-width: 640px) {
    & + & {
      border-left: none;
      border-top: 1px solid ${hairline};
    }
  }
`

const BarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const BarRow = styled.button<{ $active: boolean; $dim: boolean }>`
  display: grid;
  grid-template-columns: minmax(64px, 104px) minmax(0, 1fr) 64px;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  margin: 0 -8px;
  width: calc(100% + 16px);
  border: none;
  border-radius: 8px;
  background: ${({ $active, theme }) =>
    $active ? (theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft) : 'transparent'};
  text-align: left;
  cursor: pointer;
  opacity: ${({ $dim }) => ($dim ? 0.55 : 1)};
  transition: background ${MOTION_FAST}, opacity ${MOTION_FAST};

  &:hover {
    opacity: 1;
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? BRAND.primaryFillDark
          : BRAND.primarySoftHover
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(15,23,42,0.035)'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const BarLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
`

const Swatch = styled.span`
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 2px;
`

const Rank = styled.span`
  width: 14px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BarName = styled.span`
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const BarTrack = styled.span`
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
`

const BarFill = styled.span<{ $residual?: boolean }>`
  display: block;
  height: 100%;
  border-radius: 0 4px 4px 0;
  background: ${({ $residual, theme }) =>
    $residual ? (theme.mode === 'dark' ? '#52525b' : '#a1a1aa') : BRAND.primary};
  transition: width 0.25s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const BarValue = styled.span`
  display: inline-flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const BarShare = styled.span`
  min-width: 28px;
  text-align: right;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Empty = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MoreToggle = styled.button`
  margin-top: 8px;
  padding: 5px 12px;
  border: 1px solid ${hairline};
  border-radius: 999px;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${BRAND.primary};
    border-color: ${BRAND.primaryBorder};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const Tooltip = styled.div`
  position: fixed;
  z-index: 50;
  transform: translate(-50%, -100%);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 11px;
  border-radius: 10px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: #1c1c20;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.1);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
        `}
`

const TooltipValue = styled.strong`
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TooltipRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 선 키(line key) — 툴팁 밀도에서는 상자 대신 짧은 선 */
const TooltipKey = styled.span`
  width: 10px;
  height: 3px;
  border-radius: 2px;
`

const TooltipRange = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
