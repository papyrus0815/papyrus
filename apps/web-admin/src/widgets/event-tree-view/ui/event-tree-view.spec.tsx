/**
 * EventTreeView — 트리 승격(W3) 회귀 방지.
 *
 *  1. 행 '+ 하위 사건' 액션이 onCreateChild({id, title})를 쏜다 (루트·자식 노드 모두)
 *  2. 데이터 경계 노드(로드된 자식 0)의 '하위 불러오기'가 GET /events/parent/:id 로
 *     lazy 서브트리를 그린다 — 빈 결과는 '하위 사건 없음', 실패는 재시도로 복구
 *  3. 불러온 자식의 재귀 확장은 childEvents **3상 판별**을 따른다 — 실서버 계약은
 *     childEvents가 항상 undefined(byParent 경로가 관계를 include하지 않음)이므로
 *     undefined 케이스가 정본이고, 배열 케이스(잎 확정/확장 토글)는 미래 include 대비
 *  4. 필터 활성 중 lazy 하위엔 '필터 미적용' 뉘앙스가 붙는다
 *  5. lazy 응답은 onLazyEventsLoaded로 페이지에 올라간다 (미발견 판정·드로어 폴백)
 *  6. lazy 행 연도는 구조화 필드(startEra/startYear) 우선 + 부호 ISO 폴백으로
 *     BC를 '기원전 N'으로 표기하고, 목록은 부호 연도 asc(미상은 끝)로 정렬된다
 */
import type { ComponentProps } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'
import type { FlattenedHierarchyItem } from '@/features/event-hierarchy/model'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '@/pages/events/create/events.types'

// 실제 모듈은 api.service(import.meta.env)를 끌어와 ts-jest가 못 읽는다 — 전체 목킹.
jest.mock('@/shared/api/events', () => ({
  getEventsByParentId: jest.fn(),
}))

import { EventTreeView } from './event-tree-view'
import { getEventsByParentId } from '@/shared/api/events'

const mockGetByParent = getEventsByParentId as jest.MockedFunction<
  typeof getEventsByParentId
>

// ── 픽스처 ──────────────────────────────────────────────────────────────────

const makeNode = (
  id: string,
  title: string,
  start: string,
  children: EventHierarchyNode[] = [],
): EventHierarchyNode => ({
  id,
  title,
  summary: '',
  period: { start },
  importance: 'notable',
  children,
})

const makeRootEvent = (hierarchy: EventHierarchyNode): HistoricalEvent =>
  ({
    id: hierarchy.id,
    title: hierarchy.title,
    category: '전쟁',
    categoryId: 'cat-war',
    description: '',
    startDate: hierarchy.period.start,
    relatedCountries: [],
    relatedHistoricalCountries: [],
    parentEventId: undefined,
    hierarchy,
    visuals: { heroImageUrl: '', thumbnailUrl: '', gallery: [] },
  }) as unknown as HistoricalEvent

const flatten = (
  node: EventHierarchyNode,
  depth: number,
  parentNodeId: string | null,
  parentEvent: HistoricalEvent | null,
  out: FlattenedHierarchyItem[],
) => {
  out.push({
    node,
    depth,
    parentEvent,
    parentNodeId,
    isMatch: true,
    hiddenChildCount: 0,
    visibleChildCount: node.children?.length ?? 0,
    canExpand: (node.children?.length ?? 0) > 0,
    isCollapsedAway: false,
  })
  for (const child of node.children ?? []) {
    flatten(child, depth + 1, node.id, parentEvent, out)
  }
}

/** root(제1차 세계 대전) → child(서부 전선, 로드된 자식 없음 = lazy 경계) */
const buildFixture = () => {
  const child = makeNode('c1', '서부 전선', '1914-08-04')
  const root = makeNode('r1', '제1차 세계 대전', '1914-07-28', [child])
  const rootEvent = makeRootEvent(root)
  const flattened: FlattenedHierarchyItem[] = []
  flatten(root, 0, null, rootEvent, flattened)
  return { rootEvent, flattened }
}

/**
 * GET /events/parent/:id 응답 흉내 — 소비 필드만 채운다.
 *
 * ⚠️ childEvents 기본값은 **undefined**(실서버 계약 — byParent 경로는 관계를
 * include하지 않는다). 배열을 실으려면 명시적으로 넘긴다(미래 include 대비 케이스).
 */
const lazyChildDto = (overrides: {
  id: string
  title: string
  startDate?: string | null
  description?: string
  childEvents?: Array<{ id: string }>
  startEra?: string | null
  startYear?: number | null
}) =>
  ({
    id: overrides.id,
    title: overrides.title,
    startDate:
      overrides.startDate === undefined ? '1916-07-01' : overrides.startDate,
    description: overrides.description ?? '',
    ...(overrides.childEvents !== undefined
      ? { childEvents: overrides.childEvents }
      : {}),
    ...(overrides.startEra !== undefined
      ? { startEra: overrides.startEra }
      : {}),
    ...(overrides.startYear !== undefined
      ? { startYear: overrides.startYear }
      : {}),
  }) as unknown as Awaited<ReturnType<typeof getEventsByParentId>>[number]

const renderTree = (
  overrides: Partial<ComponentProps<typeof EventTreeView>> = {},
) => {
  const { rootEvent, flattened } = buildFixture()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const props: ComponentProps<typeof EventTreeView> = {
    flattenedHierarchy: flattened,
    events: [rootEvent],
    selectedEventId: null,
    dbCategories: [],
    onSelectEvent: jest.fn(),
    ...overrides,
  }
  renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <EventTreeView {...props} />
    </QueryClientProvider>,
  )
  return props
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('EventTreeView — + 하위 사건 액션', () => {
  it('루트 헤더의 + 액션이 onCreateChild({id, title})를 호출한다', () => {
    const onCreateChild = jest.fn()
    renderTree({ onCreateChild })

    fireEvent.click(
      screen.getByLabelText("'제1차 세계 대전'의 하위 사건 등록"),
    )
    expect(onCreateChild).toHaveBeenCalledWith({
      id: 'r1',
      title: '제1차 세계 대전',
    })
  })

  it('자식 노드의 + 액션도 그 노드를 부모로 넘기며, 행 선택을 오발화하지 않는다', () => {
    const onCreateChild = jest.fn()
    const props = renderTree({ onCreateChild })

    fireEvent.click(screen.getByLabelText("'서부 전선'의 하위 사건 등록"))
    expect(onCreateChild).toHaveBeenCalledWith({ id: 'c1', title: '서부 전선' })
    // stopPropagation — + 클릭이 행 onSelect까지 버블되면 드로어가 같이 열린다.
    expect(props.onSelectEvent).not.toHaveBeenCalled()
  })

  it('onCreateChild 미전달이면 + 액션 자체가 없다 (읽기전용 소비처 보호)', () => {
    renderTree()
    expect(
      screen.queryByLabelText("'제1차 세계 대전'의 하위 사건 등록"),
    ).not.toBeInTheDocument()
  })
})

describe('EventTreeView — 깊이 무제한 lazy 확장', () => {
  it('경계 노드 펼침 → 결과 렌더, childEvents=undefined(실서버)여도 재귀 확장 토글이 열린다', async () => {
    mockGetByParent.mockImplementation(async (parentId: string) => {
      // 실서버 계약: 응답에 childEvents가 실리지 않는다(undefined).
      if (parentId === 'c1') {
        return [lazyChildDto({ id: 'g1', title: '솜 전투' })]
      }
      if (parentId === 'g1') {
        return [lazyChildDto({ id: 'gg1', title: '솜 전투 첫날' })]
      }
      return []
    })
    const props = renderTree()

    fireEvent.click(screen.getByLabelText("'서부 전선' 하위 사건 불러오기"))
    expect(await screen.findByText('솜 전투')).toBeInTheDocument()
    expect(mockGetByParent).toHaveBeenCalledWith('c1')

    // lazy 자식 행 선택 → 페이지 드로어 계약(onSelectEvent) 그대로
    fireEvent.click(screen.getByRole('button', { name: '솜 전투' }))
    expect(props.onSelectEvent).toHaveBeenCalledWith('g1')

    // childEvents=undefined는 '모름' — 자기교정 '하위 불러오기' 토글로 증손 이하 도달
    fireEvent.click(screen.getByLabelText("'솜 전투' 하위 사건 불러오기"))
    expect(await screen.findByText('솜 전투 첫날')).toBeInTheDocument()
    expect(mockGetByParent).toHaveBeenCalledWith('g1')
  })

  it('미래 include 대비 — childEvents 배열 신호(3상 판별)를 그대로 존중한다', async () => {
    mockGetByParent.mockResolvedValue([
      lazyChildDto({
        id: 'g1',
        title: '솜 전투',
        childEvents: [{ id: 'gg1' }],
      }),
      lazyChildDto({
        id: 'g2',
        title: '베르됭 전투',
        startDate: '1916-02-21',
        childEvents: [],
      }),
    ])
    renderTree()

    fireEvent.click(screen.getByLabelText("'서부 전선' 하위 사건 불러오기"))
    await screen.findByText('솜 전투')

    // 길이 > 0 → 일반 확장 토글
    expect(screen.getByLabelText('펼치기')).toBeInTheDocument()
    // 길이 0 → 잎 확정: '불러오기' 토글도 확장 토글도 렌더하지 않는다
    expect(
      screen.queryByLabelText("'베르됭 전투' 하위 사건 불러오기"),
    ).not.toBeInTheDocument()
  })

  it('하위가 없으면 "하위 사건 없음"으로 확정한다', async () => {
    mockGetByParent.mockResolvedValue([])
    renderTree()

    fireEvent.click(screen.getByLabelText("'서부 전선' 하위 사건 불러오기"))
    expect(await screen.findByText('하위 사건 없음')).toBeInTheDocument()
  })

  it('실패 시 행 안 재시도로 복구한다', async () => {
    mockGetByParent.mockRejectedValueOnce(new Error('network'))
    renderTree()

    fireEvent.click(screen.getByLabelText("'서부 전선' 하위 사건 불러오기"))
    expect(
      await screen.findByText('하위 사건을 불러오지 못했습니다'),
    ).toBeInTheDocument()

    mockGetByParent.mockResolvedValue([
      lazyChildDto({ id: 'g1', title: '솜 전투' }),
    ])
    fireEvent.click(screen.getByRole('button', { name: '재시도' }))
    expect(await screen.findByText('솜 전투')).toBeInTheDocument()
  })

  it('필터 활성 중 lazy 하위엔 "필터 미적용" 뉘앙스가 붙는다', async () => {
    mockGetByParent.mockResolvedValue([
      lazyChildDto({ id: 'g1', title: '솜 전투' }),
    ])
    renderTree({ hasActiveFilters: true })

    fireEvent.click(screen.getByLabelText("'서부 전선' 하위 사건 불러오기"))
    await waitFor(() =>
      expect(
        screen.getByText('서버에서 불러온 하위 — 현재 필터 미적용'),
      ).toBeInTheDocument(),
    )
  })

  it('byParent 응답이 onLazyEventsLoaded로 페이지에 올라간다', async () => {
    const response = [lazyChildDto({ id: 'g1', title: '솜 전투' })]
    mockGetByParent.mockResolvedValue(response)
    const onLazyEventsLoaded = jest.fn()
    renderTree({ onLazyEventsLoaded })

    fireEvent.click(screen.getByLabelText("'서부 전선' 하위 사건 불러오기"))
    await waitFor(() =>
      expect(onLazyEventsLoaded).toHaveBeenCalledWith(response),
    )
  })
})

describe('EventTreeView — lazy 행 BC 연도 표기·정렬', () => {
  it('BC 사건은 부호 ISO(startDate)로도 "기원전 N"으로 표기된다', async () => {
    mockGetByParent.mockResolvedValue([
      lazyChildDto({
        id: 'g1',
        title: '루비콘 도하',
        startDate: '-0049-01-10',
      }),
    ])
    renderTree()

    fireEvent.click(screen.getByLabelText("'서부 전선' 하위 사건 불러오기"))
    await screen.findByText('루비콘 도하')
    expect(screen.getByText('기원전 49')).toBeInTheDocument()
  })

  it('구조화 필드(startEra/startYear)가 startDate보다 우선한다', async () => {
    mockGetByParent.mockResolvedValue([
      lazyChildDto({
        id: 'g1',
        title: '살라미스 해전',
        startDate: null,
        startEra: 'BC',
        startYear: 480,
      }),
    ])
    renderTree()

    fireEvent.click(screen.getByLabelText("'서부 전선' 하위 사건 불러오기"))
    await screen.findByText('살라미스 해전')
    expect(screen.getByText('기원전 480')).toBeInTheDocument()
  })

  it('부호 연도 asc로 정렬하고 연도 미상은 끝으로 보낸다', async () => {
    mockGetByParent.mockResolvedValue([
      lazyChildDto({ id: 'g2', title: '후대 사건', startDate: '1918-01-01' }),
      lazyChildDto({ id: 'g3', title: '미상 사건', startDate: null }),
      lazyChildDto({
        id: 'g1',
        title: '기원전 사건',
        startDate: '-0044-03-15',
      }),
    ])
    renderTree()

    fireEvent.click(screen.getByLabelText("'서부 전선' 하위 사건 불러오기"))
    await screen.findByText('기원전 사건')

    const titles = screen
      .getAllByText(/(기원전|후대|미상) 사건/)
      .map((element) => element.textContent)
    expect(titles).toEqual(['기원전 사건', '후대 사건', '미상 사건'])
    // 연도 미상 행의 연도 셀은 '—'
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
