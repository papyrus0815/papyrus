/**
 * 최상위 사건 조망 — 상위가 없고 하위를 거느린 사건의 **전용 지면**.
 *
 * 일반 사건 상세는 한 사건을 읽고 고치는 문서다. 최상위 사건(1차세계대전처럼 하위 18건)은
 * 그 문서로는 하위 사건을 '전부' 볼 수 없었다 — 하위 목록은 제목·날짜뿐이었고, 누가 어디에
 * 끼었는지·무엇이 비었는지는 하위 사건을 하나씩 열어야 알았다. 이 지면은 하위 전부를
 * 한 화면에 펼친다: 전개 간트 · 참여국 매트릭스 · 갈래/시기 분포 · 인물·진영·수치 · 기록 점검.
 *
 * 문서(서술·편집)는 [문서] 전환으로 그대로 간다(`?view=doc`). 판정·전환은 event-page-switch.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiMaximize2, FiMinimize2, FiX } from 'react-icons/fi'

import { durationLabel } from '@/pages/events/detail/components/event-facts.lib'
import { getEventOverview } from '@/shared/api/event-overview'
import { eventKeys } from '@/shared/api/event-query-keys'
import { eventDateLabel } from '@/shared/lib/event-date-label'

import {
  aggregatePersons,
  buildCountryMatrix,
  buildGantt,
  categoryBreakdown,
  type GanttFit,
  coverageRatio,
  metricRows,
  orderedDescendants,
  timeHistogram,
} from './event-overview.lib'
import {
  CategoryPanel,
  ChecklistPanel,
  CountryMatrixPanel,
  GanttPanel,
  HistogramPanel,
  PersonsPanel,
  SidesMetricsPanel,
} from './overview-sections'
import * as S from './overview.styles'

interface EventOverviewPageProps {
  eventId: string
  /** [문서]로 전환 — 기존 사건 상세(서술·편집) */
  onShowDocument: () => void
}

/** 브라우저 전체 화면 — 지원하지 않거나 거부되면 조용히 무시(지면은 이미 콘텐츠 폭 전체다) */
function useFullscreen(target: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === target.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [target])
  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)
    } else {
      void target.current?.requestFullscreen?.().catch(() => undefined)
    }
  }, [target])
  return { isFullscreen, toggle, supported: typeof document !== 'undefined' && document.fullscreenEnabled }
}

export function EventOverviewPage({ eventId, onShowDocument }: EventOverviewPageProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const fullscreen = useFullscreen(pageRef)

  const { data, isLoading, isError } = useQuery({
    queryKey: eventKeys.overview(eventId),
    queryFn: () => getEventOverview(eventId),
    // 하위 사건을 고치면 그 하위의 키만 무효화된다 — 조망은 들어올 때마다 다시 받는다
    staleTime: 0,
  })

  const [selectedCountryKey, setSelectedCountryKey] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [hotId, setHotId] = useState<string | null>(null)
  const [ganttFit, setGanttFit] = useState<GanttFit>('children')

  const derived = useMemo(() => {
    if (!data) return null
    const { root, descendants } = data
    const gantt = buildGantt(root, descendants, ganttFit)
    const ordered = orderedDescendants(gantt)
    const numberById = new Map(ordered.map((node, index) => [node.id, index + 1]))
    const matrix = buildCountryMatrix(root, descendants)
    return {
      gantt,
      ordered,
      numberById,
      matrix,
      categories: categoryBreakdown(descendants),
      histogram: timeHistogram(gantt),
      persons: aggregatePersons([root, ...descendants]),
      metrics: metricRows([root, ...descendants]),
      coverage: coverageRatio(descendants),
      directCount: descendants.filter((node) => node.depth === 1).length,
      sideCount: [root, ...descendants].reduce((sum, node) => sum + node.sides.length, 0),
    }
  }, [data, ganttFit])

  /** 거르기 — 나라·갈래 둘 다 걸리면 교집합. 없으면 null(아무것도 흐리지 않음) */
  const visibleIds = useMemo(() => {
    if (!data || (!selectedCountryKey && !selectedCategory)) return null
    return new Set(
      data.descendants
        .filter(
          (node) =>
            (!selectedCountryKey ||
              node.countries.some((country) => country.key === selectedCountryKey)) &&
            (!selectedCategory || (node.category?.name ?? '미분류') === selectedCategory),
        )
        .map((node) => node.id),
    )
  }, [data, selectedCountryKey, selectedCategory])

  if (isLoading) {
    return (
      <S.Page ref={pageRef}>
        <S.Empty>하위 사건을 모으는 중…</S.Empty>
      </S.Page>
    )
  }
  if (isError || !data || !derived) {
    return (
      <S.Page ref={pageRef}>
        <S.Empty>조망을 불러오지 못했습니다.</S.Empty>
        <S.ActionButton type="button" onClick={onShowDocument}>
          문서로 보기
        </S.ActionButton>
      </S.Page>
    )
  }

  const { root, descendants } = data
  const dateRange = eventDateLabel(root)
  const duration = durationLabel(
    root.startDate,
    root.endDate,
    root.startDatePrecision,
    root.endDatePrecision,
  )
  const selectedCountry = derived.matrix.find((country) => country.key === selectedCountryKey)

  return (
    <S.Page ref={pageRef}>
      <S.Header>
        <S.HeaderText>
          <S.Kicker>최상위 사건 · 하위 {descendants.length}건 조망</S.Kicker>
          <S.Title>{root.title}</S.Title>
          <S.HeaderMeta>
            {dateRange && <span>{dateRange}</span>}
            {duration && <span>{duration}</span>}
            {root.category && <span>{root.category.name}</span>}
            {root.location && <span>{root.location}</span>}
          </S.HeaderMeta>
        </S.HeaderText>
        <S.HeaderActions>
          <S.ViewSwitch role="group" aria-label="보기">
            <S.ViewSwitchItem type="button" $active aria-pressed="true">
              조망
            </S.ViewSwitchItem>
            <S.ViewSwitchItem type="button" $active={false} aria-pressed="false" onClick={onShowDocument}>
              문서
            </S.ViewSwitchItem>
          </S.ViewSwitch>
          {fullscreen.supported && (
            <S.ActionButton type="button" onClick={fullscreen.toggle}>
              {fullscreen.isFullscreen ? (
                <FiMinimize2 size={14} aria-hidden="true" />
              ) : (
                <FiMaximize2 size={14} aria-hidden="true" />
              )}
              {fullscreen.isFullscreen ? '전체 화면 끝내기' : '전체 화면'}
            </S.ActionButton>
          )}
        </S.HeaderActions>
      </S.Header>

      <S.StatRow>
        <S.Stat>
          <S.StatLabel>하위 사건</S.StatLabel>
          <S.StatValue>{descendants.length}</S.StatValue>
          <S.StatNote>
            직계 {derived.directCount}
            {descendants.length > derived.directCount &&
              ` · 그 아래 ${descendants.length - derived.directCount}`}
          </S.StatNote>
        </S.Stat>
        <S.Stat>
          <S.StatLabel>참여국</S.StatLabel>
          <S.StatValue>{derived.matrix.length}</S.StatValue>
          <S.StatNote>
            {derived.matrix[0] ? `최다 ${derived.matrix[0].name} ${derived.matrix[0].eventCount}건` : '—'}
          </S.StatNote>
        </S.Stat>
        <S.Stat>
          <S.StatLabel>인물</S.StatLabel>
          <S.StatValue>{derived.persons.length}</S.StatValue>
          <S.StatNote>하위·상위 합산</S.StatNote>
        </S.Stat>
        <S.Stat>
          <S.StatLabel>진영 · 수치</S.StatLabel>
          <S.StatValue>
            {derived.sideCount} · {derived.metrics.length}
          </S.StatValue>
          <S.StatNote>진영 수 · 측정값 수</S.StatNote>
        </S.Stat>
        <S.Stat>
          <S.StatLabel>기록 충실도</S.StatLabel>
          <S.StatValue>{Math.round(derived.coverage * 100)}%</S.StatValue>
          <S.StatNote>점검표 칸 중 채운 비율</S.StatNote>
        </S.Stat>
      </S.StatRow>

      {(selectedCountry || selectedCategory) && (
        <S.FilterBar role="status">
          <span>
            {visibleIds?.size ?? 0}/{descendants.length}건만 보는 중
          </span>
          {selectedCountry && (
            <S.FilterChip type="button" onClick={() => setSelectedCountryKey(null)}>
              나라: {selectedCountry.name}
              <FiX size={12} aria-label="거르기 풀기" />
            </S.FilterChip>
          )}
          {selectedCategory && (
            <S.FilterChip type="button" onClick={() => setSelectedCategory(null)}>
              갈래: {selectedCategory}
              <FiX size={12} aria-label="거르기 풀기" />
            </S.FilterChip>
          )}
        </S.FilterBar>
      )}

      {data.truncated && (
        <S.Empty role="alert">하위 사건이 너무 많아 일부만 모았습니다.</S.Empty>
      )}

      <S.Grid>
        <GanttPanel
          gantt={derived.gantt}
          fit={ganttFit}
          onFitChange={setGanttFit}
          numberById={derived.numberById}
          visibleIds={visibleIds}
          hotId={hotId}
          onHover={setHotId}
        />
        <CountryMatrixPanel
          matrix={derived.matrix}
          events={derived.ordered}
          numberById={derived.numberById}
          selectedCountryKey={selectedCountryKey}
          onSelectCountry={setSelectedCountryKey}
          hotId={hotId}
          onHover={setHotId}
        />
        <CategoryPanel
          bars={derived.categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <HistogramPanel bins={derived.histogram} />
        <PersonsPanel persons={derived.persons} numberById={derived.numberById} />
        <SidesMetricsPanel nodes={[root, ...descendants]} metrics={derived.metrics} />
        <ChecklistPanel
          events={derived.ordered}
          numberById={derived.numberById}
          visibleIds={visibleIds}
          hotId={hotId}
          onHover={setHotId}
        />
      </S.Grid>
    </S.Page>
  )
}
