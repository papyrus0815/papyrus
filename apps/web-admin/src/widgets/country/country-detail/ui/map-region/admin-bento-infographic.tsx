/**
 * 행정구역 3열 Event-Ledger 벤토 인포그래픽 (계층·단위 분포 / 광역 구역 편제 Top 5 / 존속·좌표 매핑률).
 */
import type { SegmentSlice } from '@/entities/event/ui/bento-primitives'
import {
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoGrid3Col,
  MiniDonutRing,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'

import {
  BentoLegendChip,
  BentoLegendWrap,
  CoverageRight,
  CoverageSplit,
  CoverageSubFoot,
  LegendDot,
  MetricSwitchBtn,
  MetricSwitchGroup,
  RankFill,
  RankIndex,
  RankMeta,
  RankName,
  RankRowBtn,
  RankRowList,
  RankTrack,
} from './region-bento-primitives'

export type StatusFilter = 'all' | 'active' | 'abolished'
export type TopRankMetric = 'descendants' | 'cities'

export interface AdminInfographicData {
  maxDepth: number
  tierSlices: SegmentSlice[]
  pinnedCount: number
  activeCount: number
  abolishedCount: number
  lineageCount: number
  coordPct: number
  coordDonutSlices: SegmentSlice[]
  statusSlices: SegmentSlice[]
  hasCitiesMetric: boolean
  effectiveMetric: TopRankMetric
  topFive: Array<{
    id: string
    name: string
    unitLabel: string
    descendants: number
    cities: number
    hasCoords: boolean
    period: string | null
  }>
  maxMetricVal: number
}

interface AdminBentoInfographicProps {
  totalCount: number
  scopeCount: number
  schemeCount: number
  currentParentName: string | null
  isDarkMode: boolean
  infographic: AdminInfographicData
  activeLevelFilterKey: string | null
  statusFilter: StatusFilter
  selectedId: string | null
  onChangeUnitFilter: (key: string | null) => void
  onChangeStatusFilter: (updater: (prev: StatusFilter) => StatusFilter) => void
  onChangeRankMetric: (metric: TopRankMetric) => void
  onSelectRankNode: (id: string) => void
}

export function AdminBentoInfographic({
  totalCount,
  scopeCount,
  schemeCount,
  currentParentName,
  isDarkMode,
  infographic,
  activeLevelFilterKey,
  statusFilter,
  selectedId,
  onChangeUnitFilter,
  onChangeStatusFilter,
  onChangeRankMetric,
  onSelectRankNode,
}: AdminBentoInfographicProps) {
  return (
    <BentoGrid3Col aria-label="행정구역 인포그래픽 요약">
      {/* Card 1: 계층·단위 편제 분포 */}
      <BentoCard>
        <BentoCardHeader>
          <BentoCardTitleGroup>
            <BentoCardTitle>계층 · 단위 편제 구성</BentoCardTitle>
            <BentoCardBadge>
              총 {totalCount.toLocaleString('ko-KR')}곳 · 최대{' '}
              {infographic.maxDepth}차
            </BentoCardBadge>
          </BentoCardTitleGroup>
          {activeLevelFilterKey && (
            <BentoLegendChip
              type="button"
              $active
              onClick={() => onChangeUnitFilter(null)}
            >
              필터 해제 ×
            </BentoLegendChip>
          )}
        </BentoCardHeader>
        <BentoCardBody>
          <StackedSegmentBar
            slices={infographic.tierSlices}
            height={10}
            showPercent
          />
          <BentoLegendWrap>
            {infographic.tierSlices.map((slice) => {
              const isActive = activeLevelFilterKey === slice.key
              return (
                <BentoLegendChip
                  key={slice.key}
                  type="button"
                  $active={isActive}
                  title={`${slice.label} 단위만 필터링`}
                  onClick={() =>
                    onChangeUnitFilter(isActive ? null : slice.key)
                  }
                >
                  <LegendDot $color={slice.color} />
                  <span>{slice.label}</span>
                  <strong>{slice.value.toLocaleString('ko-KR')}</strong>
                </BentoLegendChip>
              )
            })}
          </BentoLegendWrap>
        </BentoCardBody>
      </BentoCard>

      {/* Card 2: 주요 광역 구역 편제 규모 Top 5 */}
      <BentoCard>
        <BentoCardHeader>
          <BentoCardTitleGroup>
            <BentoCardTitle>
              {currentParentName
                ? `${currentParentName} 하위 편제 Top 5`
                : '광역 행정구역 편제 Top 5'}
            </BentoCardTitle>
            <BentoCardBadge>
              {scopeCount.toLocaleString('ko-KR')}곳
            </BentoCardBadge>
          </BentoCardTitleGroup>
          {infographic.hasCitiesMetric && (
            <MetricSwitchGroup role="tablist" aria-label="순위 기준">
              <MetricSwitchBtn
                type="button"
                $active={infographic.effectiveMetric === 'descendants'}
                onClick={() => onChangeRankMetric('descendants')}
              >
                하위구역
              </MetricSwitchBtn>
              <MetricSwitchBtn
                type="button"
                $active={infographic.effectiveMetric === 'cities'}
                onClick={() => onChangeRankMetric('cities')}
              >
                소속도시
              </MetricSwitchBtn>
            </MetricSwitchGroup>
          )}
        </BentoCardHeader>
        <BentoCardBody>
          <RankRowList>
            {infographic.topFive.map((item, idx) => {
              const val =
                infographic.effectiveMetric === 'cities'
                  ? item.cities
                  : item.descendants
              const hasNumericScale = infographic.maxMetricVal > 0
              const pct = hasNumericScale
                ? Math.max(8, (val / infographic.maxMetricVal) * 100)
                : item.hasCoords
                  ? 100
                  : 32
              const isSelected = selectedId === item.id
              return (
                <RankRowBtn
                  key={item.id}
                  type="button"
                  $active={isSelected}
                  onClick={() => onSelectRankNode(item.id)}
                  title={`${item.name} 상세 및 하위 구역 포커스`}
                >
                  <RankIndex>#{idx + 1}</RankIndex>
                  <RankName title={item.name}>{item.name}</RankName>
                  <RankTrack>
                    <RankFill
                      style={{
                        width: `${pct}%`,
                        opacity: hasNumericScale ? 1 : 0.45,
                      }}
                    />
                  </RankTrack>
                  <RankMeta>
                    {hasNumericScale
                      ? infographic.effectiveMetric === 'cities'
                        ? `도시 ${val}곳`
                        : `하위 ${val}곳`
                      : (item.period ??
                        (item.unitLabel ||
                          (item.hasCoords ? '좌표됨' : '1차')))}
                  </RankMeta>
                </RankRowBtn>
              )
            })}
          </RankRowList>
        </BentoCardBody>
      </BentoCard>

      {/* Card 3: 존속 현황 · 좌표 매핑률 */}
      <BentoCard>
        <BentoCardHeader>
          <BentoCardTitleGroup>
            <BentoCardTitle>존속 현황 · 좌표 매핑</BentoCardTitle>
            <BentoCardBadge>
              좌표 {infographic.pinnedCount.toLocaleString('ko-KR')}/
              {totalCount.toLocaleString('ko-KR')}
            </BentoCardBadge>
          </BentoCardTitleGroup>
        </BentoCardHeader>
        <BentoCardBody>
          <CoverageSplit>
            <MiniDonutRing
              slices={infographic.coordDonutSlices}
              size={72}
              strokeWidth={8.5}
              centerValue={`${infographic.coordPct}%`}
              centerLabel="좌표 매핑"
            />
            <CoverageRight>
              <StackedSegmentBar slices={infographic.statusSlices} height={8} />
              <BentoLegendWrap>
                <BentoLegendChip
                  type="button"
                  $active={statusFilter === 'active'}
                  onClick={() =>
                    onChangeStatusFilter((prev) =>
                      prev === 'active' ? 'all' : 'active',
                    )
                  }
                >
                  <LegendDot $color={isDarkMode ? '#34d399' : '#059669'} />
                  <span>현존</span>
                  <strong>
                    {infographic.activeCount.toLocaleString('ko-KR')}
                  </strong>
                </BentoLegendChip>
                <BentoLegendChip
                  type="button"
                  $active={statusFilter === 'abolished'}
                  onClick={() =>
                    onChangeStatusFilter((prev) =>
                      prev === 'abolished' ? 'all' : 'abolished',
                    )
                  }
                >
                  <LegendDot $color={isDarkMode ? '#f87171' : '#dc2626'} />
                  <span>폐지</span>
                  <strong>
                    {infographic.abolishedCount.toLocaleString('ko-KR')}
                  </strong>
                </BentoLegendChip>
              </BentoLegendWrap>
              <CoverageSubFoot>
                <span>편제 체계 {schemeCount}개</span>
                {infographic.lineageCount > 0 && (
                  <span>개편 계보 {infographic.lineageCount}곳</span>
                )}
              </CoverageSubFoot>
            </CoverageRight>
          </CoverageSplit>
        </BentoCardBody>
      </BentoCard>
    </BentoGrid3Col>
  )
}
