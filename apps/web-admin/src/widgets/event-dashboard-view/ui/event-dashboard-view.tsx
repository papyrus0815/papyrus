/**
 * Event Dashboard View — 분포·통계·데이터 품질 패널.
 *
 * 패널 구성:
 *   1) 카테고리 분포 (가로 막대) — 비율 + 절대 수
 *   2) 세기별 빈도 (가로 막대) — 시간 분포
 *   3) 데이터 품질 — 이미지 없음 / 분류 없음 / 국가 없음 카운트
 *      각 카운트는 클릭 가능 → 드릴다운(외부에서 처리. 현재 표시만)
 *
 * '좌표 누락'·'출처 없음' 지표는 **제거됐다**(2026-07-28 검토 DATA-8) — 두 필드 모두
 * 실데이터가 아니라 transformer의 자리표시자를 검사하고 있어(map.markers는 항상 [],
 * sources는 아예 매핑되지 않음) 언제나 '100% 누락'이라는 거짓을 보고했다.
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
  FiPieChart,
  FiTag,
} from 'react-icons/fi'
import styled from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import { CatalogViewEmpty } from '@/features/event-list/ui/catalog-view-empty'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { CategoryDot } from '@/shared/ui/category-dot/category-dot'
import { getCenturyFromIso } from '@/shared/lib/iso-date'

import { BRAND, CATEGORY_BADGE_COLORS } from '../../../pages/events/styles/theme'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

/** useEventHierarchy 출력 계약 단일화 — 각 뷰의 중복 선언 제거 */
type FlatItem = import('@/features/event-hierarchy/model').FlattenedHierarchyItem

interface Props {
  /**
   * ⚠️ **필터를 만족한 행만** 담긴 배열이어야 한다(검토 GAP-1).
   * 예전엔 평탄화 결과를 통째로 받아 '매칭된 자손 때문에 문맥으로 남은 부모'까지
   * 집계했다 — '전쟁'으로 좁힌 통계에 정치 막대가 그려지던 원인이다.
   */
  flattenedHierarchy: FlatItem[]
  events: HistoricalEvent[]
  dbCategories: EventCategoryDto[]
  onSelectEvent: (id: string) => void
  /** 서버 권위 총개수 — 로드된 수보다 크면 통계가 부분 집계임을 경고 */
  serverTotal?: number
  /** 빈 상태 3분기(로딩·필터0건·데이터0건) 판정용 — 검토 GAP-3 */
  isLoading?: boolean
  hasMoreData?: boolean
  /** 내용을 좁히는 필터가 걸려 있는가 — 배너가 '무엇으로 좁힌 집계인지' 말한다(검토 GAP-7) */
  hasActiveFilters?: boolean
  /** 활성 필터 칩 라벨 — 배너 조건 요약에 그대로 노출 */
  filterLabels?: string[]
  onResetFilters?: () => void
}

export const EventDashboardView: React.FC<Props> = ({
  flattenedHierarchy,
  events,
  dbCategories,
  onSelectEvent,
  serverTotal,
  isLoading = false,
  hasMoreData = false,
  hasActiveFilters = false,
  filterLabels = [],
  onResetFilters,
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

    let total = 0
    let missingImage = 0
    let missingCategory = 0
    let missingCountry = 0

    const missingImageIds: string[] = []
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

      if (!evt.visuals?.heroImageUrl) {
        missingImage += 1
        missingImageIds.push(evt.id)
      }
      // 라벨(category)이 아니라 **id**로 판정한다 — 라벨은 미지정 사건에도
      // '미분류'가 파생되어 항상 truthy라 이 지표가 영원히 0이었다.
      // transformer가 가짜 id를 채우지 않게 된 지금은 빈 id가 곧 미분류다(DATA-8/13).
      if (!evt.categoryId) {
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
      quality: {
        missingImage,
        missingCategory,
        missingCountry,
        missingImageIds,
        missingCategoryIds,
        missingCountryIds,
      },
    }
  }, [flattenedHierarchy, events, dbCategories])

  // serverTotal은 *최상위(parentEventId=null)* 개수. events는 자식까지 포함한 평탄
  // 배열이라 events.length는 항상 serverTotal 이상이 되어 부분 경고가 억제됐다.
  // 로드된 최상위 수로 비교해야 "아직 다 안 불러옴"을 정확히 감지한다.
  //
  // ⚠️ 훅은 반드시 이른 반환보다 *위*에 있어야 한다. 아래 빈 상태 반환 뒤에 두면
  // 렌더마다 훅 개수가 달라져(0건 1개 → 데이터 2개) 0건↔N건 전이에서 React가
  // "Rendered more hooks than during the previous render"를 던지고, 상위 에러
  // 바운더리가 페이지 전체를 에러 화면으로 교체한다(2026-07-28 검토 P1-2).
  const loadedRootCount = useMemo(
    () => events.filter((evt) => !evt.parentEventId).length,
    [events],
  )
  const isPartial =
    typeof serverTotal === 'number' && loadedRootCount < serverTotal

  if (stats.total === 0) {
    return (
      <CatalogViewEmpty
        icon={<FiBarChart2 size={28} />}
        title="표시할 데이터가 없습니다"
        description="사건을 등록하면 분포·품질 통계가 표시됩니다."
        isLoading={isLoading}
        hasMoreData={hasMoreData}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onResetFilters}
      />
    )
  }

  return (
    <Host>
      {/**
       * 조건 요약 배너 — 필터 중에는 **항상** 뜬다(검토 GAP-7).
       *
       * 이 뷰는 사건 목록이 아니라 집계라, 화면 어디에도 "지금 보는 숫자가 무엇의
       * 집계인지"가 없었다. 필터를 걸어 놓고 통계로 넘어오면 부분 집계를
       * 전수 통계로 읽게 된다. 모수는 이 카드들이 실제로 센 수(`stats.total`)다.
       */}
      {hasActiveFilters && (
        <FilteredStatsBanner role="status">
          현재 조건을 만족하는 최상위 {stats.total.toLocaleString()}건 기준
          집계입니다
          {filterLabels.length > 0 && ` — ${filterLabels.join(' · ')}`}.
        </FilteredStatsBanner>
      )}
      {isPartial && (
        <PartialDataBanner role="status">
          {/* 모수는 '로드된 수'가 아니라 이 화면이 실제로 집계한 수다 — 필터가 걸리면
              둘이 크게 갈려 배너가 거짓 모수를 주장했다(검토 GAP-7). */}
          현재 집계 대상은 {stats.total.toLocaleString()}건이며, 아직 전체를 다
          받지 못했습니다 (등록 전체 {serverTotal!.toLocaleString()}건 중
          {' '}
          {loadedRootCount.toLocaleString()}건 로드). 목록/타임라인에서 더
          불러오면 통계가 갱신됩니다.
        </PartialDataBanner>
      )}
      <Grid>
        {/* 중요도 분포 카드 제거 — importance는 스키마·DTO에 없는 값이라
            transformer가 전부 'notable'로 채웠고, 이 카드는 영구히
            '핵심 0 · 주요 0 · 평범 N'이라는 거짓 사실을 보고했다(검토 M9). */}

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

/** 필터 조건 요약 — 필터 중 상시 노출(검토 GAP-7) */
const FilteredStatsBanner = styled.div`
  margin: 0 0 12px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.06)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  line-height: 1.5;
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

