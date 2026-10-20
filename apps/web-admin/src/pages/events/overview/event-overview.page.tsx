/**
 * 묶음 사건 조망 — 묶음 사건 상세의 '조망' 탭.
 *
 * 일반 사건 상세는 한 사건을 읽고 고치는 문서다. 최상위 사건(1차세계대전처럼 하위 18건)은
 * 그 문서로는 하위 사건을 '전부' 볼 수 없었다 — 하위 목록은 제목·날짜뿐이었고, 누가 어디에
 * 끼었는지·무엇이 비었는지는 하위 사건을 하나씩 열어야 알았다. 이 지면은 하위 전부를
 * 한 화면에 펼친다: 전개 간트 · 참여국 매트릭스 · 갈래/시기 분포 · 인물·진영·수치 · 기록 점검.
 *
 * 예전엔 별도 지면(`/events/:id`가 판정해 조망/문서로 갈라 보냄)이었다. 묶음 사건이 명시 종류가
 * 되면서 상세 한 지면으로 합쳤다 — 개요 탭은 배경·전개(=하위 사건)·여파, 이 탭은 하위 전부의 집계.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiX } from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'

import { eventTypeDef } from '@/entities/event/model/event-type-registry'
import { getEventOverview } from '@/shared/api/event-overview'
import { updateEvent } from '@/shared/api/events'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { eventKeys } from '@/shared/api/event-query-keys'

import {
  aggregatePersons,
  buildCountryMatrix,
  buildGantt,
  typeBreakdown,
  type GanttFit,
  coverageGaps,
  coverageRatio,
  missingRootCountries,
  rootCountriesPayload,
  metricRows,
  orderedDescendants,
  timeHistogram,
} from './event-overview.lib'
import {
  ChecklistPanel,
  CountryMatrixPanel,
  DistributionPanel,
  GanttPanel,
  PersonsPanel,
  SidesMetricsPanel,
} from './overview-sections'
import { OverviewEventModal } from './overview-event-modal'
import * as S from './overview.styles'

/** 섹션 내비가 가리키는 패널 id — overview-sections의 Panel id와 같다 */
const SECTION_IDS = [
  'overview-gantt',
  'overview-matrix',
  'overview-distribution',
  'overview-people',
  'overview-checklist',
]

interface EventOverviewPanelProps {
  eventId: string
}

export function EventOverviewPanel({ eventId }: EventOverviewPanelProps) {

  const { data, isLoading, isError } = useQuery({
    queryKey: eventKeys.overview(eventId),
    queryFn: () => getEventOverview(eventId),
    // 하위 사건을 고치면 그 하위의 키만 무효화된다 — 조망은 들어올 때마다 다시 받는다
    staleTime: 0,
  })

  /**
   * 보기 상태는 URL이 정본 — 열린 사건(`?event=`)만 공유되고 거르기·축·정렬은 새로고침에 사라졌다.
   * `?country=` 나라 키 · `?type=` 유형 · `?fit=parent` 축 · `?order=gaps` 점검표 순서.
   * 값을 바꿀 땐 기록을 쌓지 않는다(뒤로 가기는 모달 닫기·지면 이동에 남겨 둔다).
   */
  const [searchParams, setSearchParams] = useSearchParams()
  const setParam = useCallback(
    (key: string, value: string | null) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      ),
    [setSearchParams],
  )
  const selectedCountryKey = searchParams.get('country')
  const setSelectedCountryKey = (key: string | null) => setParam('country', key)
  /** 거르기 — 하위 사건 유형(?type=BATTLE). 분포 막대를 누르면 건다 */
  const selectedType = searchParams.get('type')
  const setSelectedType = (key: string | null) => setParam('type', key)
  const ganttFit: GanttFit = searchParams.get('fit') === 'parent' ? 'parent' : 'children'
  const setGanttFit = (fit: GanttFit) => setParam('fit', fit === 'parent' ? 'parent' : null)
  const checklistOrder = searchParams.get('order') === 'gaps' ? 'gaps' : 'number'
  const setChecklistOrder = (order: 'number' | 'gaps') =>
    setParam('order', order === 'gaps' ? 'gaps' : null)
  const [hotId, setHotId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const [attaching, setAttaching] = useState(false)
  /** 섹션 내비의 현재 위치 — 화면 위쪽 띠에 걸린 패널 */
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const hasData = Boolean(data)
  useEffect(() => {
    if (!hasData || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length > 0) setActiveSection(visible[0].target.id)
      },
      // 내비 아래(약 80px)부터 화면 위쪽 35%까지를 '지금 읽는 곳'으로 본다
      { rootMargin: '-80px 0px -65% 0px' },
    )
    for (const id of SECTION_IDS) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [hasData])

  /**
   * 열린 사건 — URL(`?event=`)이 정본. 링크로 공유되고, 뒤로 가기가 모달을 닫는다.
   * 처음 열 때만 기록을 쌓고, 이전·다음으로 넘길 때는 바꿔치기한다(뒤로 가기 한 번에 닫히게).
   */
  const openEventId = searchParams.get('event')
  const setOpenEvent = useCallback(
    (id: string | null, mode: 'push' | 'replace' = 'push') =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (id) next.set('event', id)
          else next.delete('event')
          return next
        },
        { replace: mode === 'replace' },
      ),
    [setSearchParams],
  )

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
      types: typeBreakdown(descendants),
      histogram: timeHistogram(gantt),
      persons: aggregatePersons([root, ...descendants]),
      metrics: metricRows([root, ...descendants]),
      coverage: coverageRatio(descendants),
      gaps: coverageGaps(root, descendants),
      missingCountries: missingRootCountries(root, descendants),
      directCount: descendants.filter((node) => node.depth === 1).length,
      sideCount: [root, ...descendants].reduce((sum, node) => sum + node.sides.length, 0),
    }
  }, [data, ganttFit])

  /** 거르기 — 나라·갈래 둘 다 걸리면 교집합. 없으면 null(아무것도 흐리지 않음) */
  const visibleIds = useMemo(() => {
    if (!data || (!selectedCountryKey && !selectedType)) return null
    return new Set(
      data.descendants
        .filter(
          (node) =>
            (!selectedCountryKey ||
              node.countries.some((country) => country.key === selectedCountryKey)) &&
            (!selectedType || eventTypeDef(node.type).key === selectedType),
        )
        .map((node) => node.id),
    )
  }, [data, selectedCountryKey, selectedType])

  if (isLoading) {
    return (
      <S.Page>
        <S.Empty>하위 사건을 모으는 중…</S.Empty>
      </S.Page>
    )
  }
  if (isError || !data || !derived) {
    return (
      <S.Page>
        <S.Empty>조망을 불러오지 못했습니다.</S.Empty>
      </S.Page>
    )
  }

  const { root, descendants } = data
  const selectedCountry = derived.matrix.find((country) => country.key === selectedCountryKey)

  // 모달 순서 — 거르기가 걸려 있으면 걸린 사건들 안에서 넘긴다(열린 사건이 그 밖이면 전체 순서)
  const visibleOrder = visibleIds
    ? derived.ordered.filter((node) => visibleIds.has(node.id))
    : derived.ordered
  const navOrder = visibleOrder.some((node) => node.id === openEventId)
    ? visibleOrder
    : derived.ordered
  const openIndex = navOrder.findIndex((node) => node.id === openEventId)
  const openEvent = openIndex >= 0 ? navOrder[openIndex] : null
  const titleById = new Map([root, ...descendants].map((node) => [node.id, node.title]))
  const openChildren = openEvent
    ? derived.ordered.filter((node) => node.parentEventId === openEvent.id)
    : []
  /** 패널 강조 — 마우스가 없으면 열린 사건을 칠해 둔다(모달을 닫아도 어디 있었는지 남게) */
  const highlightId = hotId ?? openEventId
  /**
   * 하위에만 나오는 나라를 상위에도 건다 — 서버는 자연키 병합이라 기존 줄은 키만 보내 손대지 않는다
   * (rootCountriesPayload). 한 번에 여러 나라가 바뀌니 확인을 받는다.
   */
  const attachMissingCountries = async () => {
    const adding = derived.missingCountries
    if (adding.length === 0) return
    const ok = await confirm({
      title: '상위 사건에 참여국 걸기',
      message: `'${root.title}'에 ${adding.map((country) => country.name).join(', ')}을(를) '참여국'으로 겁니다. 기존 참여국의 배역·설명은 그대로 둡니다.`,
      confirmLabel: `${adding.length}개국 걸기`,
    })
    if (!ok) return
    setAttaching(true)
    try {
      await updateEvent(root.id, { relatedCountries: rootCountriesPayload(root, adding) })
      invalidateEventQueries(queryClient, { eventId: root.id })
      notify.success(`상위 사건에 ${adding.length}개국을 걸었습니다`)
    } catch {
      notify.error('참여국을 걸지 못했습니다')
    } finally {
      setAttaching(false)
    }
  }

  /** 모달의 개요 저장 — 하위 사건 상세·목록·조망이 함께 갱신된다 */
  const saveDescription = async (id: string, next: string) => {
    try {
      await updateEvent(id, { description: next })
      invalidateEventQueries(queryClient, { eventId: id })
    } catch {
      notify.error('개요를 저장하지 못했습니다')
    }
  }

  /** 섹션 내비 — 해시를 주소에 남기지 않고(?event= 등과 섞이지 않게) 부드럽게 스크롤 */
  const jumpTo = (clickEvent: React.MouseEvent<HTMLAnchorElement>) => {
    const targetId = clickEvent.currentTarget.getAttribute('href')?.slice(1)
    const target = targetId ? document.getElementById(targetId) : null
    if (!target) return
    clickEvent.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const openEventById = (id: string) => setOpenEvent(id, openEventId ? 'replace' : 'push')
  const hasPersons = derived.persons.length > 0
  const hasSidesOrMetrics = derived.sideCount > 0 || derived.metrics.length > 0
  const emptyRecords = [
    derived.persons.length === 0 && '참여 인물',
    derived.sideCount === 0 && '진영',
    derived.metrics.length === 0 && '사상자·병력 같은 수치',
  ].filter((label): label is string => Boolean(label))

  return (
    <S.Page>
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
        <S.Stat $muted={derived.persons.length === 0}>
          <S.StatLabel>인물</S.StatLabel>
          <S.StatValue>{derived.persons.length}</S.StatValue>
          <S.StatNote>하위·상위 합산</S.StatNote>
        </S.Stat>
        <S.Stat $muted={derived.sideCount === 0 && derived.metrics.length === 0}>
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
          <S.Meter aria-hidden="true">
            <S.MeterFill $pct={Math.round(derived.coverage * 100)} />
          </S.Meter>
        </S.Stat>
      </S.StatRow>

      {/* 머리 아래 따라오는 목차 — 지면이 화면 몇 장이라 섹션으로 바로 뛴다 */}
      <S.SectionNav aria-label="조망 섹션">
        <S.SectionNavLink
          href="#overview-gantt"
          onClick={jumpTo}
          $active={activeSection === 'overview-gantt'}
          aria-current={activeSection === 'overview-gantt' ? 'location' : undefined}
        >
          전개 <S.SectionNavCount>{derived.gantt.rows.length}</S.SectionNavCount>
        </S.SectionNavLink>
        <S.SectionNavLink
          href="#overview-matrix"
          onClick={jumpTo}
          $active={activeSection === 'overview-matrix'}
          aria-current={activeSection === 'overview-matrix' ? 'location' : undefined}
        >
          참여국 <S.SectionNavCount>{derived.matrix.length}</S.SectionNavCount>
        </S.SectionNavLink>
        <S.SectionNavLink
          href="#overview-distribution"
          onClick={jumpTo}
          $active={activeSection === 'overview-distribution'}
          aria-current={activeSection === 'overview-distribution' ? 'location' : undefined}
        >분포</S.SectionNavLink>
        {hasPersons && (
          <S.SectionNavLink
          href="#overview-people"
          onClick={jumpTo}
          $active={activeSection === 'overview-people'}
          aria-current={activeSection === 'overview-people' ? 'location' : undefined}
        >
            인물 <S.SectionNavCount>{derived.persons.length}</S.SectionNavCount>
          </S.SectionNavLink>
        )}
        <S.SectionNavLink
          href="#overview-checklist"
          onClick={jumpTo}
          $active={activeSection === 'overview-checklist'}
          aria-current={activeSection === 'overview-checklist' ? 'location' : undefined}
        >
          기록 점검 <S.SectionNavCount>{Math.round(derived.coverage * 100)}%</S.SectionNavCount>
        </S.SectionNavLink>
      </S.SectionNav>

      {(selectedCountry || selectedType) && (
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
          {selectedType && (
            <S.FilterChip type="button" onClick={() => setSelectedType(null)}>
              유형: {eventTypeDef(selectedType).label}
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
          gaps={derived.gaps}
          fit={ganttFit}
          onFitChange={setGanttFit}
          numberById={derived.numberById}
          visibleIds={visibleIds}
          hotId={highlightId}
          onHover={setHotId}
          onOpen={openEventById}
        />
        <CountryMatrixPanel
          missing={derived.missingCountries}
          attaching={attaching}
          onAttachMissing={() => void attachMissingCountries()}
          matrix={derived.matrix}
          events={derived.ordered}
          numberById={derived.numberById}
          selectedCountryKey={selectedCountryKey}
          onSelectCountry={setSelectedCountryKey}
          hotId={highlightId}
          onHover={setHotId}
          onOpen={openEventById}
        />
        <DistributionPanel
          types={derived.types}
          bins={derived.histogram}
          selectedType={selectedType}
          onSelectType={setSelectedType}
        />
        {/* 비어 있는 기록은 큰 패널 대신 한 줄로 — 데이터가 생기면 그때 패널이 선다 */}
        {hasPersons && (
          <PersonsPanel
            persons={derived.persons}
            numberById={derived.numberById}
            onOpen={openEventById}
            wide={!hasSidesOrMetrics}
          />
        )}
        {hasSidesOrMetrics && (
          <SidesMetricsPanel
            nodes={[root, ...descendants]}
            metrics={derived.metrics}
            wide={!hasPersons}
          />
        )}
        {emptyRecords.length > 0 && (
          <S.EmptyStrip>
            <strong>아직 비어 있는 기록</strong> — {emptyRecords.join(' · ')}. 하위 사건 문서에서
            채우면 여기에 모입니다.
          </S.EmptyStrip>
        )}
        <ChecklistPanel
          order={checklistOrder}
          onOrderChange={setChecklistOrder}
          events={derived.ordered}
          numberById={derived.numberById}
          visibleIds={visibleIds}
          hotId={highlightId}
          onHover={setHotId}
          onOpen={openEventById}
        />
      </S.Grid>

      <OverviewEventModal
        event={openEvent}
        number={openEvent ? (derived.numberById.get(openEvent.id) ?? openIndex + 1) : 0}
        position={openIndex + 1}
        total={navOrder.length}
        filtered={navOrder.length !== derived.ordered.length}
        rootTitle={root.title}
        parentTitle={
          openEvent && openEvent.depth >= 2 && openEvent.parentEventId
            ? (titleById.get(openEvent.parentEventId) ?? null)
            : null
        }
        children={openChildren}
        numberById={derived.numberById}
        onClose={() => setOpenEvent(null, 'replace')}
        onPrev={openIndex > 0 ? () => setOpenEvent(navOrder[openIndex - 1].id, 'replace') : null}
        onNext={
          openIndex >= 0 && openIndex < navOrder.length - 1
            ? () => setOpenEvent(navOrder[openIndex + 1].id, 'replace')
            : null
        }
        onOpenEvent={openEventById}
        onSaveDescription={(id, next) => void saveDescription(id, next)}
      />
    </S.Page>
  )
}
