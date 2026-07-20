/**
 * Event Dashboard View — 분포·통계·데이터 품질 패널.
 *
 * 패널 구성:
 *   1) 카테고리 분포 (가로 막대) — 비율 + 절대 수
 *   2) 세기별 빈도 (가로 막대) — 시간 분포
 *   3) 중요도 분포 (작은 칩)
 *   4) 데이터 품질 — 좌표 누락 / 이미지 없음 / 소스 없음 / 분류 없음 카운트
 *      각 카운트는 클릭 가능 → 드릴다운(외부에서 처리. 현재 표시만)
 *
 * 모든 차트는 SVG 자체 구현 (라이브러리 의존성 X). 적은 데이터(< 100 카테고리)에서 충분.
 */
import React, { useMemo } from 'react'

import {
  FiAlertCircle,
  FiBarChart2,
  FiClock,
  FiGlobe,
  FiImage,
  FiLink,
  FiMapPin,
  FiPieChart,
  FiTag,
} from 'react-icons/fi'
import styled from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { CategoryDot } from '@/shared/ui/category-dot/category-dot'
import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'
import { getCenturyFromIso } from '@/shared/lib/iso-date'

import { BRAND, CATEGORY_BADGE_COLORS } from '../../../pages/events/styles/theme'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

/** useEventHierarchy 출력 계약 단일화 — 각 뷰의 중복 선언 제거 */
type FlatItem = import('@/features/event-hierarchy/model').FlattenedHierarchyItem

interface Props {
  flattenedHierarchy: FlatItem[]
  events: HistoricalEvent[]
  dbCategories: EventCategoryDto[]
  onSelectEvent: (id: string) => void
  /** 서버 권위 총개수 — 로드된 수보다 크면 통계가 부분 집계임을 경고 */
  serverTotal?: number
}

export const EventDashboardView: React.FC<Props> = ({
  flattenedHierarchy,
  events,
  dbCategories,
  onSelectEvent,
  serverTotal,
}) => {
  const stats = useMemo(() => {
    const eventById = new Map<string, HistoricalEvent>()
    for (const e of events) eventById.set(e.id, e)

    const byCategory = new Map<string, number>()
    const byCentury = new Map<number, number>()
    /** 국가별 사건 수 — modern + historical 통합. key는 displayName, value는 메타 + 카운트 */
    const byCountry = new Map<
      string,
      { name: string; flagEmoji?: string; historical: boolean; count: number }
    >()
    const tierCount = { critical: 0, major: 0, normal: 0 }

    let total = 0
    let missingCoords = 0
    let missingImage = 0
    let missingSources = 0
    let missingCategory = 0
    let missingCountry = 0

    const missingCoordsIds: string[] = []
    const missingImageIds: string[] = []
    const missingSourcesIds: string[] = []
    const missingCategoryIds: string[] = []
    const missingCountryIds: string[] = []

    for (const item of flattenedHierarchy) {
      if (item.depth !== 0) continue
      const evt = eventById.get(item.node.id)
      if (!evt) continue
      total += 1

      const cat = evt.category || 'other'
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1)

      const century = getCenturyFromIso(item.node.period.start)
      if (century !== null) {
        byCentury.set(century, (byCentury.get(century) ?? 0) + 1)
      }

      if (item.node.importance === 'critical') tierCount.critical += 1
      else if (item.node.importance === 'major') tierCount.major += 1
      else tierCount.normal += 1

      const hasCoords = (evt.map?.markers ?? []).some(
        (m) =>
          typeof m.coordinates?.lat === 'number' &&
          typeof m.coordinates?.lng === 'number',
      )
      if (!hasCoords) {
        missingCoords += 1
        missingCoordsIds.push(evt.id)
      }
      if (!evt.visuals?.heroImageUrl) {
        missingImage += 1
        missingImageIds.push(evt.id)
      }
      if (!evt.sources || evt.sources.length === 0) {
        missingSources += 1
        missingSourcesIds.push(evt.id)
      }
      if (!evt.category) {
        missingCategory += 1
        missingCategoryIds.push(evt.id)
      }

      // 국가 — modern + historical 합쳐 카운트. 둘 다 없으면 "missingCountry"
      const modern = evt.relatedCountries ?? []
      const historical = evt.relatedHistoricalCountries ?? []
      if (modern.length === 0 && historical.length === 0) {
        missingCountry += 1
        missingCountryIds.push(evt.id)
      }
      for (const c of modern) {
        const key = `m:${c.id}`
        const cur = byCountry.get(key)
        if (cur) cur.count += 1
        else
          byCountry.set(key, {
            name: c.name,
            flagEmoji: c.flagEmoji,
            historical: false,
            count: 1,
          })
      }
      for (const c of historical) {
        const key = `h:${c.id}`
        const cur = byCountry.get(key)
        if (cur) cur.count += 1
        else
          byCountry.set(key, {
            name: c.name,
            historical: true,
            count: 1,
          })
      }
    }

    const categoryRows = Array.from(byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => ({
        key: k,
        label: getCategoryName(k, dbCategories),
        count: n,
        ratio: total > 0 ? n / total : 0,
        color:
          CATEGORY_BADGE_COLORS[k as keyof typeof CATEGORY_BADGE_COLORS] ??
          '#94a3b8',
      }))

    const centuryRows = Array.from(byCentury.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([c, n]) => ({
        century: c,
        count: n,
        ratio: total > 0 ? n / total : 0,
      }))

    /** 상위 10개 국가 — count 내림차순. */
    const countryRows = Array.from(byCountry.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((c) => ({
        ...c,
        ratio: total > 0 ? c.count / total : 0,
      }))

    return {
      total,
      byCategory: categoryRows,
      byCentury: centuryRows,
      byCountry: countryRows,
      tier: tierCount,
      quality: {
        missingCoords,
        missingImage,
        missingSources,
        missingCategory,
        missingCountry,
        missingCoordsIds,
        missingImageIds,
        missingSourcesIds,
        missingCategoryIds,
        missingCountryIds,
      },
    }
  }, [flattenedHierarchy, events, dbCategories])

  if (stats.total === 0) {
    return (
      <EmptyStateSpotlight
        icon={<FiBarChart2 size={28} />}
        title="표시할 데이터가 없습니다"
        description="필터를 풀거나 사건을 등록해보세요."
      />
    )
  }

  // serverTotal은 *최상위(parentEventId=null)* 개수. events는 자식까지 포함한 평탄
  // 배열이라 events.length는 항상 serverTotal 이상이 되어 부분 경고가 억제됐다.
  // 로드된 최상위 수로 비교해야 "아직 다 안 불러옴"을 정확히 감지한다.
  const loadedRootCount = useMemo(
    () => events.filter((evt) => !evt.parentEventId).length,
    [events],
  )
  const isPartial =
    typeof serverTotal === 'number' && loadedRootCount < serverTotal

  return (
    <Host>
      {isPartial && (
        <PartialDataBanner role="status">
          현재 로드된 최상위 {loadedRootCount.toLocaleString()}건 기준 집계입니다
          (전체 {serverTotal!.toLocaleString()}건). 목록/타임라인에서 더 불러오면
          통계가 갱신됩니다.
        </PartialDataBanner>
      )}
      <Grid>
        {/* 중요도 분포 — 짧은 칩 행 */}
        <Card>
          <CardHeader>
            <FiAlertCircle size={14} aria-hidden="true" />
            <h3>중요도 분포</h3>
          </CardHeader>
          <TierRow>
            <TierChip $color={BRAND.primary}>
              <span>핵심</span>
              <strong>{stats.tier.critical.toLocaleString()}</strong>
            </TierChip>
            <TierChip $color="#f59e0b">
              <span>주요</span>
              <strong>{stats.tier.major.toLocaleString()}</strong>
            </TierChip>
            <TierChip $color="#94a3b8">
              <span>평범</span>
              <strong>{stats.tier.normal.toLocaleString()}</strong>
            </TierChip>
          </TierRow>
        </Card>

        {/* 카테고리 분포 */}
        <Card>
          <CardHeader>
            <FiPieChart size={14} aria-hidden="true" />
            <h3>카테고리 분포</h3>
            <Muted>{stats.byCategory.length}개</Muted>
          </CardHeader>
          <BarList>
            {stats.byCategory.slice(0, 8).map((row) => (
              <BarRow key={row.key}>
                <BarLabel>
                  <CategoryDot color={row.color} size={8} />
                  <span>{row.label}</span>
                </BarLabel>
                <BarTrack>
                  <BarFill
                    style={{
                      width: `${row.ratio * 100}%`,
                      background: row.color,
                    }}
                    aria-hidden="true"
                  />
                </BarTrack>
                <BarValue>
                  <strong>{row.count.toLocaleString()}</strong>
                  <Muted>· {(row.ratio * 100).toFixed(1)}%</Muted>
                </BarValue>
              </BarRow>
            ))}
          </BarList>
        </Card>

        {/* 세기별 빈도 — 가로 spark bar */}
        <Card>
          <CardHeader>
            <FiClock size={14} aria-hidden="true" />
            <h3>세기별 분포</h3>
            <Muted>{stats.byCentury.length}개 세기</Muted>
          </CardHeader>
          <CenturyChart>
            {stats.byCentury.map((row) => {
              const maxCount = Math.max(
                ...stats.byCentury.map((r) => r.count),
                1,
              )
              const h = (row.count / maxCount) * 100
              return (
                <CenturyBar key={row.century}>
                  <CenturyTrack>
                    <CenturyFill
                      style={{ height: `${h}%` }}
                      aria-hidden="true"
                    />
                  </CenturyTrack>
                  <CenturyLabel>
                    {row.century < 0 ? `기원전 ${Math.abs(row.century)}C` : `${row.century}C`}
                  </CenturyLabel>
                  <CenturyCount>{row.count}</CenturyCount>
                </CenturyBar>
              )
            })}
          </CenturyChart>
        </Card>

        {/* 국가별 분포 — modern + historical 통합 상위 10개 */}
        <Card>
          <CardHeader>
            <FiGlobe size={14} aria-hidden="true" />
            <h3>국가별 분포</h3>
            <Muted>상위 {stats.byCountry.length}개</Muted>
          </CardHeader>
          {stats.byCountry.length === 0 ? (
            <BarList>
              <Muted>관련 국가 데이터가 없습니다.</Muted>
            </BarList>
          ) : (
            <BarList>
              {stats.byCountry.map((row) => (
                <BarRow key={row.name}>
                  <BarLabel>
                    {row.flagEmoji && !row.historical ? (
                      <FlagEmoji>{row.flagEmoji}</FlagEmoji>
                    ) : (
                      <HistoricalDot aria-hidden="true" />
                    )}
                    <span>
                      {row.name}
                      {row.historical && <HistoricalSuffix>(역사)</HistoricalSuffix>}
                    </span>
                  </BarLabel>
                  <BarTrack>
                    <BarFill
                      style={{
                        width: `${row.ratio * 100}%`,
                        background: row.historical ? '#8b5cf6' : BRAND.primary,
                      }}
                      aria-hidden="true"
                    />
                  </BarTrack>
                  <BarValue>
                    <strong>{row.count.toLocaleString()}</strong>
                    <Muted>· {(row.ratio * 100).toFixed(1)}%</Muted>
                  </BarValue>
                </BarRow>
              ))}
            </BarList>
          )}
        </Card>

        {/* 데이터 품질 — admin 타깃 인사이트 */}
        <Card>
          <CardHeader>
            <FiAlertCircle size={14} aria-hidden="true" />
            <h3>데이터 품질</h3>
            <Muted>전체 {stats.total.toLocaleString()}건 중</Muted>
          </CardHeader>
          <QualityGrid>
            <QualityCell
              type="button"
              disabled={stats.quality.missingCoords === 0}
              onClick={() => {
                const id = stats.quality.missingCoordsIds[0]
                if (id) onSelectEvent(id)
              }}
            >
              <FiMapPin size={14} aria-hidden="true" />
              <QualityLabel>좌표 누락</QualityLabel>
              <QualityCount $warn={stats.quality.missingCoords > 0}>
                {stats.quality.missingCoords.toLocaleString()}
              </QualityCount>
            </QualityCell>
            <QualityCell
              type="button"
              disabled={stats.quality.missingImage === 0}
              onClick={() => {
                const id = stats.quality.missingImageIds[0]
                if (id) onSelectEvent(id)
              }}
            >
              <FiImage size={14} aria-hidden="true" />
              <QualityLabel>이미지 없음</QualityLabel>
              <QualityCount $warn={stats.quality.missingImage > 0}>
                {stats.quality.missingImage.toLocaleString()}
              </QualityCount>
            </QualityCell>
            <QualityCell
              type="button"
              disabled={stats.quality.missingSources === 0}
              onClick={() => {
                const id = stats.quality.missingSourcesIds[0]
                if (id) onSelectEvent(id)
              }}
            >
              <FiLink size={14} aria-hidden="true" />
              <QualityLabel>출처 없음</QualityLabel>
              <QualityCount $warn={stats.quality.missingSources > 0}>
                {stats.quality.missingSources.toLocaleString()}
              </QualityCount>
            </QualityCell>
            <QualityCell
              type="button"
              disabled={stats.quality.missingCategory === 0}
              onClick={() => {
                const id = stats.quality.missingCategoryIds[0]
                if (id) onSelectEvent(id)
              }}
            >
              <FiTag size={14} aria-hidden="true" />
              <QualityLabel>분류 없음</QualityLabel>
              <QualityCount $warn={stats.quality.missingCategory > 0}>
                {stats.quality.missingCategory.toLocaleString()}
              </QualityCount>
            </QualityCell>
            <QualityCell
              type="button"
              disabled={stats.quality.missingCountry === 0}
              onClick={() => {
                const id = stats.quality.missingCountryIds[0]
                if (id) onSelectEvent(id)
              }}
            >
              <FiGlobe size={14} aria-hidden="true" />
              <QualityLabel>국가 없음</QualityLabel>
              <QualityCount $warn={stats.quality.missingCountry > 0}>
                {stats.quality.missingCountry.toLocaleString()}
              </QualityCount>
            </QualityCell>
          </QualityGrid>
          <QualityHint>
            클릭 시 첫 번째 누락 사건으로 이동합니다.
          </QualityHint>
        </Card>
      </Grid>
    </Host>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const Host = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 4px 80px;
`

/** 부분 로드 통계 경고 — 전수 통계로 오인하지 않도록 */
const PartialDataBanner = styled.div`
  margin: 0 0 12px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  line-height: 1.5;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
`

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px 16px;
  border-radius: 12px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);`
      : `background: #fff; border: 1px solid rgba(15,23,42,0.06);`}
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  h3 {
    margin: 0;
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: -0.005em;
    color: ${({ theme }) => theme.colors.text.primary};
    text-transform: none;
  }

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const Muted = styled.span`
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const TierRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

const TierChip = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'};
  border-left: 3px solid ${({ $color }) => $color};
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`

const BarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const BarRow = styled.div`
  display: grid;
  grid-template-columns: minmax(80px, 90px) 1fr auto;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
`

const BarLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.secondary};

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const FlagEmoji = styled.span`
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji',
    sans-serif;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
`

const HistoricalDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #8b5cf6;
`

const HistoricalSuffix = styled.span`
  margin-left: 4px;
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BarTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'};
  overflow: hidden;
`

const BarFill = styled.div`
  height: 100%;
  border-radius: 999px;
`

const BarValue = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
    font-size: 12px;
  }
`

/* 가로 스크롤 가능 — 세기 N개가 카드 폭 넘으면 스크롤. min-width로 각 막대 보장. */
const CenturyChart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 100px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(15,23,42,0.12)'};
    border-radius: 999px;
  }
`

const CenturyBar = styled.div`
  flex: 0 0 auto;
  min-width: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  height: 100%;
`

const CenturyTrack = styled.div`
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  border-radius: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)'};
`

const CenturyFill = styled.div`
  width: 100%;
  background: linear-gradient(180deg, ${BRAND.primary}, ${BRAND.primaryHover});
  border-radius: 3px 3px 0 0;
  transition: height 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const CenturyLabel = styled.div`
  font-size: 9.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CenturyCount = styled.div`
  font-size: 9.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const QualityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`

const QualityCell = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.12s, border-color 0.12s;

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.03)'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'};
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`

const QualityLabel = styled.span`
  flex: 1;
  font-size: 12px;
  font-weight: 500;
`

const QualityCount = styled.span<{ $warn: boolean }>`
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ $warn }) => ($warn ? '#dc2626' : '#16a34a')};
`

const QualityHint = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: right;
`

