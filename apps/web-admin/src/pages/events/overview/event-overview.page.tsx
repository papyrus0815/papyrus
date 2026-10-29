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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiX } from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { eventTypeDef } from '@/entities/event/model/event-type-registry'
import { EventPanelLoading } from '@/entities/event/ui/panel-loading'
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
  collectionGroups,
  inGroupFilter,
  SINGLES_GROUP_KEY,
  subtypeKeyOf,
  typeBreakdown,
  type GanttFit,
  coverageGaps,
  coverageRatio,
  missingRootCountries,
  rootCountriesPayload,
  metricRows,
  orderedDescendants,
  outlineNumbers,
  overlapsPeriod,
  parsePeriodParam,
  periodParam,
  timeHistogram,
  type PeriodFilter,
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

/**
 * 조망 탭 — 데이터를 성격별로 묶는다. 예전엔 패널 여섯 개를 한 지면에 이어 붙여 화면 몇 장을 내려야 했고,
 * 시기 분포(시간)와 세부 분야(구성)가 '분포' 한 패널에 섞여 있었다.
 * - 전개: 언제 — 간트 + 시기 분포
 * - 참여: 누가 — 참여국 × 하위 + 인물
 * - 구성: 무엇 — 세부 분야 + 진영·수치
 * - 기록: 얼마나 채웠나 — 기록 점검
 */
const SURVEY_VIEWS = [
  { id: 'timeline', label: '전개', hint: '언제' },
  { id: 'participants', label: '참여', hint: '누가' },
  { id: 'composition', label: '구성', hint: '무엇' },
  { id: 'records', label: '기록 점검', hint: '얼마나' },
] as const
type SurveyView = (typeof SURVEY_VIEWS)[number]['id']
const isSurveyView = (value: string | null): value is SurveyView =>
  SURVEY_VIEWS.some((view) => view.id === value)

interface EventOverviewPanelProps {
  eventId: string
  /** 하위 사건이 없을 때 '기존 사건 모으기'로 갈 길 — 상세가 연관 탭을 연다 */
  onGatherExisting?: () => void
  /** 인물 이름 → 상세의 인물 모달(?person=) — 참여 탭과 같은 길 */
  onPersonClick?: (personId: string) => void
}

export function EventOverviewPanel({
  eventId,
  onGatherExisting,
  onPersonClick,
}: EventOverviewPanelProps) {

  const { data, isLoading, isError } = useQuery({
    queryKey: eventKeys.overview(eventId),
    queryFn: () => getEventOverview(eventId),
    // 하위 사건을 고치면 그 하위의 키만 무효화된다 — 조망은 들어올 때마다 다시 받는다
    staleTime: 0,
  })

  /**
   * 보기 상태는 URL이 정본 — 열린 사건(`?event=`)만 공유되고 거르기·축·정렬은 새로고침에 사라졌다.
   * `?country=` 나라 키 · `?type=` 세부 분야 · `?fit=parent` 축 · `?order=gaps` 점검표 순서.
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
  /** 거르기 — 하위 사건 세부 분야(?type=BATTLE, 세부 없음은 NONE). 분포 막대를 누르면 건다 */
  const selectedType = searchParams.get('type')
  const setSelectedType = (key: string | null) => setParam('type', key)
  /** 거르기 — 시기(?when=<from>_<to>, 축 값). 시기 막대를 누르면 건다 */
  const selectedPeriod = parsePeriodParam(searchParams.get('when'))
  const setSelectedPeriod = (period: PeriodFilter | null) =>
    setParam('when', period ? periodParam(period) : null)
  /** 거르기 — 묶음(?group=<묶음 id> · 개별은 singles). 묶음 줄의 칩을 누르면 건다 */
  const selectedGroup = searchParams.get('group')
  const setSelectedGroup = (key: string | null) => setParam('group', key)
  const ganttFit: GanttFit = searchParams.get('fit') === 'parent' ? 'parent' : 'children'
  const setGanttFit = (fit: GanttFit) => setParam('fit', fit === 'parent' ? 'parent' : null)
  const checklistOrder = searchParams.get('order') === 'gaps' ? 'gaps' : 'number'
  const setChecklistOrder = (order: 'number' | 'gaps') =>
    setParam('order', order === 'gaps' ? 'gaps' : null)
  const theme = useTheme()
  /** 거르기 전부 풀기 — 나라·세부·시기·묶음 */
  const clearFilters = () =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const key of ['country', 'type', 'when', 'group']) next.delete(key)
        return next
      },
      { replace: true },
    )
  /** 간트에서 접은 묶음 — 탭을 오가도 남게 지면이 든다 */
  const [foldedGroups, setFoldedGroups] = useState<Set<string>>(() => new Set())
  const toggleGroup = (groupId: string) =>
    setFoldedGroups((previous) => {
      const next = new Set(previous)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  const [hotId, setHotId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const [attaching, setAttaching] = useState(false)
  /** 조망 안 탭 — URL `?sv=`(기본 전개). 상세의 `?tab=survey`와 겹치지 않는 이름 */
  const viewParam = searchParams.get('sv')
  const activeView: SurveyView = isSurveyView(viewParam) ? viewParam : 'timeline'
  const setActiveView = (view: SurveyView) => setParam('sv', view === 'timeline' ? null : view)
  /**
   * 탭 줄 높이 — 간트 축이 그 아래에 붙는다(--survey-tabs-height). 탭을 바꿀 때 돌아갈 자리(contentTopRef)도
   * 이 높이만큼 비켜 선다.
   */
  const tabBarRef = useRef<HTMLDivElement>(null)
  const contentTopRef = useRef<HTMLDivElement>(null)
  const [tabBarHeight, setTabBarHeight] = useState(62)
  const hasData = Boolean(data)
  useEffect(() => {
    const element = tabBarRef.current
    if (!element || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => setTabBarHeight(Math.round(element.getBoundingClientRect().height)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasData])
  /**
   * 탭 바꾸기 — 탭 줄이 위에 붙어 있을 만큼 내려와 있었으면 새 탭의 맨 위로 올린다.
   * 예전엔 스크롤 자리가 그대로라 긴 탭(기록 점검)은 중간부터 보였다.
   */
  const switchView = (view: SurveyView) => {
    const bar = tabBarRef.current
    const stuck = bar
      ? bar.getBoundingClientRect().top <= parseFloat(getComputedStyle(bar).top || '0') + 1
      : false
    setActiveView(view)
    if (stuck) requestAnimationFrame(() => contentTopRef.current?.scrollIntoView({ block: 'start' }))
  }
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
    const numberById = outlineNumbers(ordered, root.id)
    const matrix = buildCountryMatrix(root, descendants)
    return {
      grouping: collectionGroups(ordered, gantt),
      gantt,
      ordered,
      numberById,
      matrix,
      types: typeBreakdown(descendants),
      persons: aggregatePersons([root, ...descendants]),
      metrics: metricRows([root, ...descendants]),
      coverage: coverageRatio(descendants),
      gaps: coverageGaps(root, descendants),
      missingCountries: missingRootCountries(root, descendants),
      directCount: descendants.filter((node) => node.depth === 1).length,
      sideCount: [root, ...descendants].reduce((sum, node) => sum + node.sides.length, 0),
    }
  }, [data, ganttFit])

  /** 거르기 — 나라·세부·시기가 여럿 걸리면 교집합. 없으면 null(아무것도 흐리지 않음) */
  const periodKey = searchParams.get('when')
  const visibleIds = useMemo(() => {
    const period = parsePeriodParam(periodKey)
    const groupKey =
      selectedGroup &&
      (selectedGroup === SINGLES_GROUP_KEY ||
        derived?.grouping.groups.some((group) => group.id === selectedGroup))
        ? selectedGroup
        : null
    if (!data || !derived || (!selectedCountryKey && !selectedType && !period && !groupKey)) return null
    const rowById = new Map(derived.gantt.rows.map((row) => [row.node.id, row]))
    return new Set(
      data.descendants
        .filter((node) => {
          const row = rowById.get(node.id)
          return (
            (!selectedCountryKey ||
              node.countries.some((country) => country.key === selectedCountryKey)) &&
            (!selectedType || subtypeKeyOf(node) === selectedType) &&
            (!groupKey || inGroupFilter(derived.grouping, node.id, groupKey)) &&
            // 날짜 없는 사건은 어느 시기에도 걸리지 않는다
            (!period || (row !== undefined && overlapsPeriod(row, period)))
          )
        })
        .map((node) => node.id),
    )
  }, [data, derived, selectedCountryKey, selectedType, periodKey, selectedGroup])

  /**
   * 거르기를 따르는 숫자 — 숫자 줄(KPI)·세부 분야. 예전엔 묶음을 골라 12/20건만 남겨도 숫자 줄과
   * 세부 막대는 20건 전체를 말했다. 거르기가 없으면 null(전체 값을 그대로 쓴다).
   */
  const filteredStats = useMemo(() => {
    if (!data || !visibleIds) return null
    const nodes = data.descendants.filter((node) => visibleIds.has(node.id))
    const matchedTypes = new Map<string, number>()
    for (const node of nodes) matchedTypes.set(subtypeKeyOf(node), (matchedTypes.get(subtypeKeyOf(node)) ?? 0) + 1)
    return {
      count: nodes.length,
      countries: new Set(nodes.flatMap((node) => node.countries.map((country) => country.key))).size,
      persons: aggregatePersons(nodes).length,
      sides: nodes.reduce((sum, node) => sum + node.sides.length, 0),
      metrics: metricRows(nodes).length,
      coverage: coverageRatio(nodes),
      matchedTypes,
    }
  }, [data, visibleIds])

  /** 시기 분포 — 거르기를 따른다(걸린 사건만 채우고 전체는 윤곽으로) */
  const histogram = useMemo(
    () => (derived ? timeHistogram(derived.gantt, visibleIds) : []),
    [derived, visibleIds],
  )

  if (isLoading) {
    return (
      <S.Page>
        <EventPanelLoading label="하위 사건을 모으는 중…" />
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
  /**
   * 하위가 없으면 패널 다섯 개가 각자 '없습니다'를 말하는 대신 탭 하나가 한 번 말한다 —
   * 조망은 하위 전부를 모으는 탭이라 하위가 없으면 볼 것이 없다.
   */
  if (descendants.length === 0) {
    return (
      <S.Page>
        <S.EmptyStrip>
          <strong>아직 하위 사건이 없습니다</strong> — 조망은 하위 사건 전부를 한 화면에 모아
          전개·참여국·분포·기록 상태를 봅니다.{' '}
          {onGatherExisting && (
            <S.TextButton type="button" onClick={onGatherExisting}>
              기존 사건을 하위로 모으기
            </S.TextButton>
          )}
        </S.EmptyStrip>
      </S.Page>
    )
  }
  const selectedCountry = derived.matrix.find((country) => country.key === selectedCountryKey)
  const { groups, singleIds } = derived.grouping
  const selectedGroupLabel =
    selectedGroup === SINGLES_GROUP_KEY
      ? '개별 사건'
      : (groups.find((group) => group.id === selectedGroup)?.title ?? null)

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
      // 모달 안 인라인 편집이라 저장됐는지 알 길이 없었다(실패만 알렸다)
      notify.success('개요를 저장했습니다')
    } catch {
      notify.error('개요를 저장하지 못했습니다')
    }
  }

  /** 숫자 칸 → 그 숫자를 펼친 탭. 칸 전체가 단추(Enter·Space) */
  const statLink = (view: SurveyView, label: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    $link: true,
    title: `'${label}' 탭에서 보기`,
    onClick: () => switchView(view),
    onKeyDown: (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
      if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') return
      keyEvent.preventDefault()
      switchView(view)
    },
  })
  const openEventById = (id: string) => setOpenEvent(id, openEventId ? 'replace' : 'push')
  const hasPersons = derived.persons.length > 0
  const hasSidesOrMetrics = derived.sideCount > 0 || derived.metrics.length > 0
  /** 구성 탭에서 비어 있는 기록 — 인물은 참여 탭이 따로 말한다 */
  const emptyComposition = [
    derived.sideCount === 0 && '진영',
    derived.metrics.length === 0 && '사상자·병력 같은 수치',
  ].filter((label): label is string => Boolean(label))

  return (
    <S.Page style={{ '--survey-tabs-height': `${tabBarHeight}px` } as React.CSSProperties}>
      {/* 거르기가 걸리면 숫자 줄도 걸린 사건 기준 — 하위 사건은 '12 / 20'으로 전체를 함께 */}
      <S.StatRow data-filtered={filteredStats ? '' : undefined}>
        <S.Stat {...statLink('timeline', '전개')}>
          <S.StatLabel>하위 사건</S.StatLabel>
          <S.StatValue>
            {filteredStats ? filteredStats.count : descendants.length}
            {filteredStats && <S.StatOf> / {descendants.length}</S.StatOf>}
          </S.StatValue>
          <S.StatNote>
            {filteredStats ? (
              '거른 사건 기준'
            ) : (
              <>
                {/* 상세 탭 '조망 9'는 직계 수 — 여기 20(전체)과 같은 화면에서 맞춰 읽히게 직계를 늘 먼저 */}
                직계 {derived.directCount}
                {groups.length > 0 && ` · 묶음 ${groups.length} · 개별 ${singleIds.length}`}
                {groups.length === 0 &&
                  descendants.length > derived.directCount &&
                  ` · 그 아래 ${descendants.length - derived.directCount}`}
              </>
            )}
          </S.StatNote>
        </S.Stat>
        <S.Stat {...statLink('participants', '참여')}>
          {/* 상세 '참여' 탭 숫자는 상위 사건 자신의 참여자라 다르다 — 하위까지 셌다고 밝힌다 */}
          <S.StatLabel>참여국 · 하위 포함</S.StatLabel>
          <S.StatValue>{filteredStats ? filteredStats.countries : derived.matrix.length}</S.StatValue>
          <S.StatNote>
            {filteredStats
              ? '거른 사건에 나오는 나라'
              : derived.matrix[0]
                ? `최다 ${derived.matrix[0].name} ${derived.matrix[0].eventCount}건`
                : '—'}
          </S.StatNote>
        </S.Stat>
        <S.Stat
          $muted={(filteredStats ? filteredStats.persons : derived.persons.length) === 0}
          {...statLink('participants', '참여')}
        >
          <S.StatLabel>인물</S.StatLabel>
          <S.StatValue>{filteredStats ? filteredStats.persons : derived.persons.length}</S.StatValue>
          <S.StatNote>{filteredStats ? '거른 사건 기준' : '하위·상위 합산'}</S.StatNote>
        </S.Stat>
        <S.Stat
          $muted={
            filteredStats
              ? filteredStats.sides === 0 && filteredStats.metrics === 0
              : derived.sideCount === 0 && derived.metrics.length === 0
          }
          {...statLink('composition', '구성')}
        >
          <S.StatLabel>진영 · 수치</S.StatLabel>
          {/* '6 · 0'만으론 어느 숫자가 진영인지 몰랐다 — 숫자마다 이름표 */}
          <S.StatValue $pair>
            <S.StatUnit>진영</S.StatUnit>
            {filteredStats ? filteredStats.sides : derived.sideCount}
            <S.StatUnit $gap>수치</S.StatUnit>
            {filteredStats ? filteredStats.metrics : derived.metrics.length}
          </S.StatValue>
          <S.StatNote>진영 수 · 측정값 수</S.StatNote>
        </S.Stat>
        <S.Stat {...statLink('records', '기록 점검')}>
          <S.StatLabel>기록 충실도</S.StatLabel>
          <S.StatValue>{Math.round((filteredStats ? filteredStats.coverage : derived.coverage) * 100)}%</S.StatValue>
          <S.StatNote>{filteredStats ? '거른 사건의 점검표 칸' : '점검표 칸 중 채운 비율'}</S.StatNote>
          <S.Meter aria-hidden="true">
            <S.MeterFill $pct={Math.round((filteredStats ? filteredStats.coverage : derived.coverage) * 100)} />
          </S.Meter>
        </S.Stat>
      </S.StatRow>

      {/* 성격별 탭 — 머리 아래 따라온다. 거르기(묶음·나라·세부·시기)는 탭을 건너도 그대로 */}
      <S.SectionNav ref={tabBarRef}>
        <S.SectionTabs role="tablist" aria-label="조망 보기">
        {SURVEY_VIEWS.map((view) => {
          const selected = activeView === view.id
          const count =
            view.id === 'timeline'
              ? String(derived.gantt.rows.length)
              : view.id === 'participants'
                ? String(derived.matrix.length)
                : view.id === 'composition'
                  ? null // 세부 분야 '종류 수'는 읽을 값이 아니었다 — 숫자를 달지 않는다
                  : `${Math.round(derived.coverage * 100)}%`
          return (
            <S.SectionNavLink
              key={view.id}
              type="button"
              role="tab"
              id={`survey-tab-${view.id}`}
              aria-selected={selected}
              aria-controls={`survey-view-${view.id}`}
              $active={selected}
              onClick={() => switchView(view.id)}
              onKeyDown={(keyEvent: React.KeyboardEvent<HTMLButtonElement>) => {
                if (keyEvent.key !== 'ArrowRight' && keyEvent.key !== 'ArrowLeft') return
                const index = SURVEY_VIEWS.findIndex((item) => item.id === view.id)
                const step = keyEvent.key === 'ArrowRight' ? 1 : -1
                const next = SURVEY_VIEWS[(index + step + SURVEY_VIEWS.length) % SURVEY_VIEWS.length]
                switchView(next.id)
                document.getElementById(`survey-tab-${next.id}`)?.focus()
              }}
              tabIndex={selected ? 0 : -1}
            >
              <S.SectionNavHint>{view.hint}</S.SectionNavHint>
              {view.label} {count !== null && <S.SectionNavCount>{count}</S.SectionNavCount>}
            </S.SectionNavLink>
          )
        })}
        </S.SectionTabs>
        {/* 내려가 있어도 거르기가 걸린 줄 알게 — 탭 줄(따라옴) 오른쪽 끝에 요약 + 한 번에 풀기.
            탭 목록(tablist) 밖에 둔다 — 탭 목록 안에는 탭만 */}
        {visibleIds && (
          <S.SectionNavFilter>
            <span>
              {visibleIds.size}/{descendants.length}건만
            </span>
            <button type="button" onClick={clearFilters}>
              거르기 풀기
              <FiX size={12} aria-hidden="true" />
            </button>
          </S.SectionNavFilter>
        )}
      </S.SectionNav>
      <div
        ref={contentTopRef}
        aria-hidden="true"
        // 빈 표지라 지면 틈(gap 28px)을 하나 더 만들지 않게 되돌린다
        style={{ marginTop: -28, scrollMarginTop: `calc(var(--event-tabs-height, 45px) + ${tabBarHeight}px)` }}
      />

      {/*
        묶음 거르기 — 탭 아래, 내용 위. 거르기라서 탭(무엇을 볼까) 다음에 둔다: 위에 두면 숫자 줄과 탭 사이를
        갈라 탭이 화면 아래로 밀렸고, 묶음 칩이 탭보다 먼저 눈에 걸려 '이것도 메뉴인가'로 읽혔다.
        누르면 그 묶음만 남고 네 탭이 함께 그 묶음만 그린다(다시 누르면 전체).
      */}
      {groups.length > 0 && (
        <S.GroupStrip
          role="radiogroup"
          aria-label="묶음으로 거르기"
          onKeyDown={(keyEvent) => {
            // 라디오 묶음 규약 — ←/→로 옮기면 바로 고른다
            if (keyEvent.key !== 'ArrowRight' && keyEvent.key !== 'ArrowLeft') return
            const radios = [...keyEvent.currentTarget.querySelectorAll<HTMLButtonElement>('[role=radio]')]
            const index = radios.indexOf(document.activeElement as HTMLButtonElement)
            if (index < 0) return
            keyEvent.preventDefault()
            const next = radios[(index + (keyEvent.key === 'ArrowRight' ? 1 : -1) + radios.length) % radios.length]
            next.focus()
            next.click()
          }}
        >
          <S.GroupStripLabel>묶음</S.GroupStripLabel>
          <S.GroupCard
            type="button"
            role="radio"
            aria-checked={!selectedGroupLabel}
            tabIndex={!selectedGroupLabel ? 0 : -1}
            $active={!selectedGroupLabel}
            onClick={() => setSelectedGroup(null)}
          >
            <S.GroupCardTitle>전체</S.GroupCardTitle>
            <S.GroupCardCount>{descendants.length}</S.GroupCardCount>
          </S.GroupCard>
          {groups.map((group) => {
            const active = selectedGroup === group.id
            return (
              <S.GroupCard
                key={group.id}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                $active={active}
                // 라디오라 다시 눌러도 그대로(풀기는 '전체') — ←/→ 이동이 눌림으로 고르기 때문
                onClick={() => setSelectedGroup(group.id)}
                title={`${group.title} — ${group.spanLabel ?? '날짜 없음'} · 눌러서 이 묶음만 보기`}
              >
                <S.GroupDot $color={S.groupColor(group.index, theme.mode)} aria-hidden="true" />
                <S.GroupCardTitle>{group.title}</S.GroupCardTitle>
                <S.GroupCardCount>{group.memberIds.length}</S.GroupCardCount>
                {group.spanLabel && <S.GroupCardMeta>{group.spanLabel}</S.GroupCardMeta>}
              </S.GroupCard>
            )
          })}
          {singleIds.length > 0 && (
            <S.GroupCard
              type="button"
              role="radio"
              aria-checked={selectedGroup === SINGLES_GROUP_KEY}
              tabIndex={selectedGroup === SINGLES_GROUP_KEY ? 0 : -1}
              $active={selectedGroup === SINGLES_GROUP_KEY}
              onClick={() => setSelectedGroup(SINGLES_GROUP_KEY)}
              title="묶음에 들지 않은 직계 사건만 보기"
            >
              <S.GroupCardTitle>개별 사건</S.GroupCardTitle>
              <S.GroupCardCount>{singleIds.length}</S.GroupCardCount>
            </S.GroupCard>
          )}
        </S.GroupStrip>
      )}

      {(selectedCountry || selectedType || selectedPeriod || selectedGroupLabel) && (
        <S.FilterBar role="status">
          {/* 'N/M건만'은 탭 줄 오른쪽 끝이 늘 말한다 — 여기선 무엇으로 걸렀는지만 */}
          <span>거르는 중</span>
          {selectedGroupLabel && (
            <S.FilterChip type="button" onClick={() => setSelectedGroup(null)}>
              묶음: {selectedGroupLabel}
              <FiX size={12} aria-label="거르기 풀기" />
            </S.FilterChip>
          )}
          {selectedCountry && (
            <S.FilterChip type="button" onClick={() => setSelectedCountryKey(null)}>
              나라: {selectedCountry.name}
              <FiX size={12} aria-label="거르기 풀기" />
            </S.FilterChip>
          )}
          {selectedType && (
            <S.FilterChip type="button" onClick={() => setSelectedType(null)}>
              세부: {eventTypeDef(selectedType)?.label ?? '세부 없음'}
              <FiX size={12} aria-label="거르기 풀기" />
            </S.FilterChip>
          )}
          {selectedPeriod && (
            <S.FilterChip type="button" onClick={() => setSelectedPeriod(null)}>
              시기:{' '}
              {histogram.find((bin) => Math.abs(bin.from - selectedPeriod.from) < 1e-3)?.label ??
                '고른 시기'}
              <FiX size={12} aria-label="거르기 풀기" />
            </S.FilterChip>
          )}
        </S.FilterBar>
      )}

      {data.truncated && (
        <S.Empty role="alert">하위 사건이 너무 많아 일부만 모았습니다.</S.Empty>
      )}

      <S.Grid
        role="tabpanel"
        id={`survey-view-${activeView}`}
        aria-labelledby={`survey-tab-${activeView}`}
      >
        {activeView === 'timeline' && (
          <>
            <GanttPanel
              root={{ id: root.id, domain: root.domain }}
              hideFiltered={selectedGroup !== null}
              grouping={derived.grouping}
              foldedGroups={foldedGroups}
              onToggleGroup={toggleGroup}
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
            <DistributionPanel
              part="period"
              axis={derived.gantt}
              types={derived.types}
              bins={histogram}
              filtered={visibleIds !== null}
              selectedPeriod={selectedPeriod}
              onSelectPeriod={setSelectedPeriod}
              selectedType={selectedType}
              onSelectType={setSelectedType}
            />
          </>
        )}
        {activeView === 'participants' && (
          <>
            <CountryMatrixPanel
              hideFiltered={selectedGroup !== null}
              grouping={derived.grouping}
              missing={derived.missingCountries}
              attaching={attaching}
              onAttachMissing={() => void attachMissingCountries()}
              matrix={derived.matrix}
              events={derived.ordered}
              numberById={derived.numberById}
              selectedCountryKey={selectedCountryKey}
              onSelectCountry={setSelectedCountryKey}
              visibleIds={visibleIds}
              hotId={highlightId}
              onHover={setHotId}
              onOpen={openEventById}
            />
            {hasPersons ? (
              <PersonsPanel
                persons={derived.persons}
                numberById={derived.numberById}
                onOpen={openEventById}
                onPersonClick={onPersonClick}
                wide
              />
            ) : (
              <S.EmptyStrip>
                <strong>참여 인물이 아직 없습니다</strong> — 하위 사건 문서의 참여 탭에서 인물을 걸면
                여기에 모입니다.
              </S.EmptyStrip>
            )}
          </>
        )}
        {activeView === 'composition' && (
          <>
            <DistributionPanel
              part="types"
              matchedTypes={filteredStats?.matchedTypes ?? null}
              types={derived.types}
              bins={histogram}
              filtered={visibleIds !== null}
              selectedType={selectedType}
              onSelectType={setSelectedType}
            />
            {hasSidesOrMetrics && (
              <SidesMetricsPanel
                root={root}
                descendants={descendants}
                metrics={derived.metrics}
                numberById={derived.numberById}
                wide
                hotId={highlightId}
                onHover={setHotId}
                onOpen={openEventById}
              />
            )}
            {/* 진영이 있으면 패널이 서서 '수치 없음'을 직접 말한다 — 두 번 말하지 않게 */}
            {!hasSidesOrMetrics && emptyComposition.length > 0 && (
              <S.EmptyStrip>
                <strong>아직 비어 있는 기록</strong> — {emptyComposition.join(' · ')}. 하위 사건 문서에서
                채우면 여기에 모입니다.
              </S.EmptyStrip>
            )}
          </>
        )}
        {activeView === 'records' && (
          <ChecklistPanel
            selectedGroup={selectedGroupLabel ? selectedGroup : null}
            onSelectGroup={setSelectedGroup}
            grouping={derived.grouping}
            order={checklistOrder}
            onOrderChange={setChecklistOrder}
            events={derived.ordered}
            numberById={derived.numberById}
            visibleIds={visibleIds}
            hotId={highlightId}
            onHover={setHotId}
            onOpen={openEventById}
          />
        )}
      </S.Grid>

      <OverviewEventModal
        event={openEvent}
        number={openEvent ? (derived.numberById.get(openEvent.id) ?? String(openIndex + 1)) : ''}
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
