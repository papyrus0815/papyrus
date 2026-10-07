/**
 * 최상위 사건 조망의 패널들. 상태(거르기·강조)는 페이지가 갖고, 여기는 그리기만 한다.
 *
 * 패널끼리 **같은 번호**를 쓴다 — 간트의 줄 번호 = 매트릭스의 열 번호 = 점검표의 줄 번호.
 * 한 패널에서 사건에 마우스를 올리면(`hotId`) 세 패널 모두 그 사건을 칠한다.
 */
import { Link } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { categoryAccent, resolveCategory } from '@/entities/event/ui/ledger-tokens'
import type { EventOverviewNode } from '@/shared/api/event-overview'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'

import {
  CHECK_COLUMNS,
  type CountBar,
  type GanttFit,
  type GanttLayout,
  type MatrixCountry,
  type MetricRow,
  type PersonAggregate,
  checkNode,
  emptyCountByColumn,
  roleLabel,
  roleTone,
} from './event-overview.lib'
import * as S from './overview.styles'

/** 사건 하나가 지금 걸러진 집합 밖인가 — 집합이 없으면 아무것도 흐리지 않는다 */
const isDimmed = (visibleIds: Set<string> | null, id: string) =>
  visibleIds !== null && !visibleIds.has(id)

interface HoverProps {
  hotId: string | null
  onHover: (id: string | null) => void
}

// ─── 전개 간트 ─────────────────────────────────────────────────────────────

export function GanttPanel({
  gantt,
  fit,
  onFitChange,
  numberById,
  visibleIds,
  hotId,
  onHover,
}: HoverProps & {
  gantt: GanttLayout
  fit: GanttFit
  onFitChange: (fit: GanttFit) => void
  numberById: Map<string, number>
  visibleIds: Set<string> | null
}) {
  const theme = useTheme()
  return (
    <S.Panel $wide aria-labelledby="overview-gantt-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-gantt-title">전개</S.PanelTitle>
        <S.ViewSwitch role="group" aria-label="시간축 범위">
          <S.ViewSwitchItem
            type="button"
            $active={fit === 'children'}
            aria-pressed={fit === 'children'}
            onClick={() => onFitChange('children')}
          >
            하위 사건에 맞춤
          </S.ViewSwitchItem>
          <S.ViewSwitchItem
            type="button"
            $active={fit === 'parent'}
            aria-pressed={fit === 'parent'}
            onClick={() => onFitChange('parent')}
          >
            상위 기간 전체
          </S.ViewSwitchItem>
        </S.ViewSwitch>
        <S.PanelNote style={{ flexBasis: '100%' }}>
          회색 띠 = 상위 사건의 기간 · 점선 = 연·월만 아는 날짜(그 기간 어딘가)
          {gantt.undated.length > 0 && ` · 날짜 없음 ${gantt.undated.length}건은 아래 점검표에`}
        </S.PanelNote>
      </S.PanelHead>
      {gantt.rows.length === 0 ? (
        <S.Empty>날짜가 있는 하위 사건이 없습니다.</S.Empty>
      ) : (
        <S.Scroll>
          <S.GanttGrid role="list" aria-label="하위 사건 시간축">
            <div aria-hidden="true" />
            <S.GanttAxis aria-hidden="true">
              {gantt.ticks.map((tick) => (
                <S.GanttTick key={`${tick.pct}-${tick.label}`} style={{ left: `${tick.pct}%` }}>
                  {tick.label}
                </S.GanttTick>
              ))}
            </S.GanttAxis>
            {gantt.rows.map((row) => {
              const dim = isDimmed(visibleIds, row.node.id)
              const hot = hotId === row.node.id
              const color = categoryAccent(resolveCategory(row.node.category?.name), theme.mode)
              // 라벨이 막대 오른쪽에 붙되, 오른쪽 끝에 가까우면 막대 왼쪽 안쪽으로 들인다
              const labelLeft = row.leftPct + row.widthPct
              const labelOnLeft = labelLeft > 78
              return (
                <div
                  key={row.node.id}
                  role="listitem"
                  style={{ display: 'contents' }}
                  onMouseEnter={() => onHover(row.node.id)}
                  onMouseLeave={() => onHover(null)}
                >
                  <S.GanttLabel $depth={row.node.depth} $dim={dim} $hot={hot}>
                    <S.GanttNumber>{numberById.get(row.node.id)}</S.GanttNumber>
                    <S.CategoryDot $color={color} title={row.node.category?.name ?? '미분류'} />
                    <S.RowTitleLink
                      as={Link}
                      to={pathKeys.events.detail(row.node.id)}
                      title={
                        row.parentTitle ? `${row.node.title} — ${row.parentTitle}의 하위` : row.node.title
                      }
                      onFocus={() => onHover(row.node.id)}
                      onBlur={() => onHover(null)}
                    >
                      {row.parentTitle && <S.Muted>↳ </S.Muted>}
                      {row.node.title}
                    </S.RowTitleLink>
                  </S.GanttLabel>
                  <S.GanttTrack $dim={dim} $hot={hot} aria-hidden="true">
                    {gantt.parentBand && (
                      <S.ParentBand
                        style={{
                          left: `${gantt.parentBand.leftPct}%`,
                          width: `${gantt.parentBand.widthPct}%`,
                        }}
                      />
                    )}
                    {gantt.ticks.map((tick) => (
                      <S.GridLine key={`${tick.pct}-${tick.label}`} style={{ left: `${tick.pct}%` }} />
                    ))}
                    <S.Bar
                      $color={color}
                      $uncertain={row.uncertain}
                      $point={row.isPoint}
                      style={{ left: `${row.leftPct}%`, width: row.isPoint ? undefined : `${row.widthPct}%` }}
                    />
                    <S.BarLabel
                      style={
                        labelOnLeft
                          ? { right: `${100 - row.leftPct}%`, paddingLeft: 0, paddingRight: 8 }
                          : { left: `${labelLeft}%` }
                      }
                    >
                      {row.dateLabel}
                    </S.BarLabel>
                  </S.GanttTrack>
                </div>
              )
            })}
          </S.GanttGrid>
        </S.Scroll>
      )}
    </S.Panel>
  )
}

// ─── 참여국 매트릭스 ───────────────────────────────────────────────────────

export function CountryMatrixPanel({
  matrix,
  events,
  numberById,
  selectedCountryKey,
  onSelectCountry,
  hotId,
  onHover,
}: HoverProps & {
  matrix: MatrixCountry[]
  events: EventOverviewNode[]
  numberById: Map<string, number>
  selectedCountryKey: string | null
  onSelectCountry: (key: string | null) => void
}) {
  const theme = useTheme()
  const tones = ['lead', 'target', 'statehood', 'neutral'] as const
  return (
    <S.Panel $wide aria-labelledby="overview-matrix-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-matrix-title">참여국 × 하위 사건</S.PanelTitle>
        <S.PanelNote>
          열 번호 = 전개의 줄 번호 · 나라를 누르면 그 나라가 낀 사건만 남는다
        </S.PanelNote>
      </S.PanelHead>
      {matrix.length === 0 ? (
        <S.Empty>참여국이 기록된 하위 사건이 없습니다.</S.Empty>
      ) : (
        <>
          <S.Legend>
            {tones.map((tone) => (
              <span key={tone}>
                <S.RoleMark $color={S.toneColor(tone, theme.mode)} aria-hidden="true" />
                {S.ROLE_TONE_COLOR[tone].label}
              </span>
            ))}
          </S.Legend>
          <S.Scroll>
            <S.MatrixTable>
              <thead>
                <tr>
                  <S.MatrixCountryCell scope="col">
                    <S.Muted style={{ fontSize: 11, padding: '0 4px' }}>나라 (하위 N건)</S.Muted>
                  </S.MatrixCountryCell>
                  <S.MatrixHeadCell scope="col" title="상위 사건 자신에서의 배역">
                    상위
                  </S.MatrixHeadCell>
                  {events.map((event) => (
                    <S.MatrixHeadCell
                      key={event.id}
                      scope="col"
                      title={event.title}
                      $hot={hotId === event.id}
                      onMouseEnter={() => onHover(event.id)}
                      onMouseLeave={() => onHover(null)}
                    >
                      {numberById.get(event.id)}
                    </S.MatrixHeadCell>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((country) => {
                  const active = selectedCountryKey === country.key
                  return (
                    <tr key={country.key}>
                      <S.MatrixCountryCell scope="row">
                        <S.CountryButton
                          type="button"
                          $active={active}
                          aria-pressed={active}
                          onClick={() => onSelectCountry(active ? null : country.key)}
                          title={`${country.name}${country.kind === 'historical' ? ' (역사 국가)' : ''} — 눌러서 이 나라가 낀 사건만 보기`}
                        >
                          <span>
                            {country.flagEmoji ? `${country.flagEmoji} ` : ''}
                            {country.name}
                          </span>
                          <S.CountBadge>{country.eventCount}</S.CountBadge>
                        </S.CountryButton>
                      </S.MatrixCountryCell>
                      <S.MatrixCell $hot={false}>
                        {country.inRoot ? (
                          <S.RoleMark
                            $color={S.toneColor(roleTone(country.rootRole), theme.mode)}
                            title={`상위 사건 — ${roleLabel(country.rootRole)}`}
                          />
                        ) : null}
                      </S.MatrixCell>
                      {events.map((event) => {
                        const has = country.roleByEvent.has(event.id)
                        const role = country.roleByEvent.get(event.id) ?? null
                        return (
                          <S.MatrixCell
                            key={event.id}
                            $hot={hotId === event.id}
                            onMouseEnter={() => onHover(event.id)}
                            onMouseLeave={() => onHover(null)}
                          >
                            {has && (
                              <S.RoleMark
                                $color={S.toneColor(roleTone(role), theme.mode)}
                                title={`${event.title} — ${roleLabel(role)}`}
                                role="img"
                                aria-label={`${numberById.get(event.id)}번 ${event.title}: ${roleLabel(role)}`}
                              />
                            )}
                          </S.MatrixCell>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </S.MatrixTable>
          </S.Scroll>
        </>
      )}
    </S.Panel>
  )
}

// ─── 분포 ──────────────────────────────────────────────────────────────────

export function CategoryPanel({
  bars,
  selectedCategory,
  onSelectCategory,
}: {
  bars: CountBar[]
  selectedCategory: string | null
  onSelectCategory: (name: string | null) => void
}) {
  const theme = useTheme()
  const max = Math.max(1, ...bars.map((bar) => bar.count))
  return (
    <S.Panel aria-labelledby="overview-category-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-category-title">갈래</S.PanelTitle>
        <S.PanelNote>누르면 그 갈래만 남는다</S.PanelNote>
      </S.PanelHead>
      <S.BarList>
        {bars.map((bar) => {
          const active = selectedCategory === bar.label
          return (
            <S.BarItem key={bar.label}>
              <S.BarRow
                type="button"
                $active={active}
                aria-pressed={active}
                onClick={() => onSelectCategory(active ? null : bar.label)}
              >
                <S.BarName $active={active}>{bar.label}</S.BarName>
                <S.BarTrack aria-hidden="true">
                  <S.BarFill
                    $color={categoryAccent(resolveCategory(bar.label), theme.mode)}
                    $pct={(bar.count / max) * 100}
                  />
                </S.BarTrack>
                <S.BarCount>{bar.count}</S.BarCount>
              </S.BarRow>
            </S.BarItem>
          )
        })}
      </S.BarList>
    </S.Panel>
  )
}

export function HistogramPanel({ bins }: { bins: CountBar[] }) {
  const max = Math.max(1, ...bins.map((bin) => bin.count))
  return (
    <S.Panel aria-labelledby="overview-histogram-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-histogram-title">시기별 밀도</S.PanelTitle>
        <S.PanelNote>하위 사건이 시작한 시점</S.PanelNote>
      </S.PanelHead>
      {bins.length === 0 ? (
        <S.Empty>날짜가 있는 하위 사건이 없습니다.</S.Empty>
      ) : (
        <>
          <S.Histogram role="list" aria-label="시기별 하위 사건 수">
            {bins.map((bin) => (
              <S.HistogramColumn key={bin.label} role="listitem" title={`${bin.label}: ${bin.count}건`}>
                <S.HistogramBar $pct={(bin.count / max) * 100} aria-label={`${bin.label} ${bin.count}건`} />
              </S.HistogramColumn>
            ))}
          </S.Histogram>
          <S.HistogramAxis aria-hidden="true">
            <span>{bins[0].label}</span>
            {bins.length > 2 && <span>{bins[Math.floor(bins.length / 2)].label}</span>}
            {bins.length > 1 && <span>{bins[bins.length - 1].label}</span>}
          </S.HistogramAxis>
        </>
      )}
    </S.Panel>
  )
}

// ─── 인물·진영·수치 ────────────────────────────────────────────────────────

export function PersonsPanel({
  persons,
  numberById,
}: {
  persons: PersonAggregate[]
  numberById: Map<string, number>
}) {
  return (
    <S.Panel aria-labelledby="overview-persons-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-persons-title">인물</S.PanelTitle>
        <S.PanelNote>{persons.length > 0 ? `${persons.length}명 · 많이 나오는 순` : ''}</S.PanelNote>
      </S.PanelHead>
      {persons.length === 0 ? (
        <S.Empty>하위 사건에 참여 인물이 아직 없습니다.</S.Empty>
      ) : (
        <S.Scroll>
          <S.Table>
            <thead>
              <tr>
                <th scope="col">인물</th>
                <th scope="col">나오는 사건</th>
              </tr>
            </thead>
            <tbody>
              {persons.map(({ person, events }) => (
                <tr key={person.personId}>
                  <td>
                    {getPersonDisplayName({
                      name: person.name ?? '',
                      surname: person.surname,
                      middleName: person.middleName,
                      nameDisplayOrder: person.nameDisplayOrder,
                      country: { defaultNameDisplayOrder: person.defaultNameDisplayOrder },
                    })}
                  </td>
                  <td>
                    {events.map((event, index) => (
                      <span key={event.id}>
                        {index > 0 && ', '}
                        {numberById.has(event.id) ? `${numberById.get(event.id)}. ` : ''}
                        {event.title}
                        {event.role && <S.Muted> ({event.role})</S.Muted>}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </S.Table>
        </S.Scroll>
      )}
    </S.Panel>
  )
}

export function SidesMetricsPanel({
  nodes,
  metrics,
}: {
  nodes: EventOverviewNode[]
  metrics: MetricRow[]
}) {
  const withSides = nodes.filter((node) => node.sides.length > 0)
  return (
    <S.Panel aria-labelledby="overview-sides-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-sides-title">진영 · 수치</S.PanelTitle>
      </S.PanelHead>
      {withSides.length === 0 ? (
        <S.Empty>진영이 나뉜 사건이 아직 없습니다.</S.Empty>
      ) : (
        <S.Table>
          <tbody>
            {withSides.map((node) => (
              <tr key={node.id}>
                <td>{node.title}</td>
                <td>{node.sides.map((side) => side.name).join(' ↔ ')}</td>
              </tr>
            ))}
          </tbody>
        </S.Table>
      )}
      {metrics.length === 0 ? (
        <S.Empty>사상자·병력 같은 수치가 기록된 사건이 아직 없습니다.</S.Empty>
      ) : (
        <S.Table>
          <thead>
            <tr>
              <th scope="col">사건</th>
              <th scope="col">항목</th>
              <th scope="col">값</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row, index) => (
              <tr key={`${row.eventId}-${row.metricName}-${index}`}>
                <td>{row.eventTitle}</td>
                <td>{row.metricName}</td>
                <td>
                  {row.display}
                  {row.unit && ` ${row.unit}`}
                </td>
              </tr>
            ))}
          </tbody>
        </S.Table>
      )}
    </S.Panel>
  )
}

// ─── 기록 점검표 ───────────────────────────────────────────────────────────

const CHECK_MARK = { full: '●', partial: '◐', empty: '·' } as const
const CHECK_TEXT = { full: '채움', partial: '일부', empty: '비어 있음' } as const

export function ChecklistPanel({
  events,
  numberById,
  visibleIds,
  hotId,
  onHover,
}: HoverProps & {
  events: EventOverviewNode[]
  numberById: Map<string, number>
  visibleIds: Set<string> | null
}) {
  const shown = visibleIds ? events.filter((event) => visibleIds.has(event.id)) : events
  const emptyCounts = emptyCountByColumn(shown)
  return (
    <S.Panel $wide aria-labelledby="overview-checklist-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-checklist-title">기록 점검</S.PanelTitle>
        <S.PanelNote>● 채움 · ◐ 일부(연·월만 아는 날짜) · · 비어 있음 — 머리글 아래 숫자는 빈 칸 수</S.PanelNote>
      </S.PanelHead>
      <S.Scroll>
        <S.Table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">하위 사건</th>
              {CHECK_COLUMNS.map((column) => (
                <S.CheckHead key={column.key} scope="col" title={column.hint}>
                  {column.label}
                  <S.EmptyCount>{emptyCounts[column.key] > 0 ? emptyCounts[column.key] : ''}</S.EmptyCount>
                </S.CheckHead>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((event) => {
              const checks = checkNode(event)
              return (
                <S.ChecklistRow
                  key={event.id}
                  $hot={hotId === event.id}
                  onMouseEnter={() => onHover(event.id)}
                  onMouseLeave={() => onHover(null)}
                >
                  <td>
                    <S.Muted>{numberById.get(event.id) ?? '—'}</S.Muted>
                  </td>
                  <td>
                    <S.RowTitleLink as={Link} to={pathKeys.events.detail(event.id)}>
                      {event.depth >= 2 && <S.Muted>↳ </S.Muted>}
                      {event.title}
                    </S.RowTitleLink>
                  </td>
                  {CHECK_COLUMNS.map((column) => {
                    const state = checks[column.key]
                    return (
                      <S.CheckCell key={column.key} $state={state} title={`${column.label}: ${CHECK_TEXT[state]}`}>
                        <span aria-hidden="true">{CHECK_MARK[state]}</span>
                        <S.VisuallyHidden>{CHECK_TEXT[state]}</S.VisuallyHidden>
                      </S.CheckCell>
                    )
                  })}
                </S.ChecklistRow>
              )
            })}
          </tbody>
        </S.Table>
      </S.Scroll>
    </S.Panel>
  )
}
