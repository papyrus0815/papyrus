import { buildEventTree, indexTree } from './development-tree.lib'
import {
  type ChapterRun,
  type TreeRow,
  chapterRuns,
  emptyChaptersOf,
  emptyRun,
  initialView,
  placeAccessions,
  rankOfRun,
  readingOrder,
  revealTargets,
  sequenceTrail,
} from './development-view.lib'
import type { EventPhase, PhaseReach } from './event-phase.lib'

const ROOT = 'root'
const node = (id: string, parentEventId: string, startDate: string, endDate: string | null = null) => ({
  id,
  title: id,
  parentEventId,
  startDate,
  startDatePrecision: 'day',
  endDate,
  endDatePrecision: endDate ? 'day' : null,
})
/** root ─ war(1939–1941) ─ w1 · w2 / root ─ treaty */
const sampleTree = () =>
  buildEventTree(ROOT, [
    { id: ROOT, title: ROOT, parentEventId: null, startDate: null },
    node('war', ROOT, '1939-09-01', '1941-06-01'),
    node('w1', 'war', '1939-09-01'),
    node('w2', 'war', '1940-05-10'),
    node('treaty', ROOT, '1941-07-01'),
  ]) as TreeRow[]
const phase = (id: string, order: number): EventPhase => ({ id, title: `국면${order + 1}`, order }) as EventPhase
const reach = (from: number | null, to = from, outside: PhaseReach['outside'] = null): PhaseReach => ({
  from,
  to,
  outside,
  manual: false,
})
const byOrder = (left?: string | null, right?: string | null) => (left ?? '').localeCompare(right ?? '')

describe('chapterRuns · 빈 국면', () => {
  const chapters = [phase('p1', 0), phase('p2', 1), phase('p3', 2), phase('p4', 3)]
  it('국면 자리가 바뀌는 첫 행마다 머리, 건수는 그 구간만', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const { heads, runOf } = chapterRuns(chapters, rows, new Map([['a', reach(1)], ['b', reach(1)], ['c', reach(3)]]))
    expect([...heads.keys()]).toEqual(['a', 'c'])
    expect(heads.get('a')?.count).toBe(2)
    expect(runOf.get('c')).toBe('p3')
  })
  it('사건이 없는 국면 — 걸친 행(1–2국면)이 덮은 국면은 빼고', () => {
    const rows = [{ id: 'a' }, { id: 'c' }]
    const empty = emptyChaptersOf(chapters, rows, new Map([['a', reach(1, 2)], ['c', reach(3)]]))
    expect(empty.map((entry) => entry.number)).toEqual([4])
  })
  it('장 머리 차례 — 국면 전 0, 국면 후 끝, 국면 사이는 정할 수 없음', () => {
    const run = (value: PhaseReach): ChapterRun => ({ reach: value, count: 1, key: 'k' })
    expect(rankOfRun(run(reach(2)))).toBe(2)
    expect(rankOfRun(run(reach(null, null, 'before')))).toBe(0)
    expect(rankOfRun(run(reach(null, null, 'after')))).toBe(Number.POSITIVE_INFINITY)
    expect(rankOfRun(run(reach(null, null, 'between')))).toBeNull()
    expect(emptyRun(3)).toEqual({ reach: reach(3), count: 0, key: 'p3' })
  })
})

describe('readingOrder · sequenceTrail', () => {
  it('계층 보기 — 묶음 다음에 그 하위, 접힌 것도 포함', () => {
    const tree = sampleTree()
    const order = readingOrder({ chronological: false, tree, rootRows: tree, nested: new Map(), compareStart: byOrder })
    expect(order.map((row) => row.id)).toEqual(['war', 'w1', 'w2', 'treaty'])
  })
  it('시간순 보기 — 잎 사건만 날짜순', () => {
    const tree = sampleTree()
    const order = readingOrder({ chronological: true, tree, rootRows: tree, nested: new Map(), compareStart: byOrder })
    expect(order.map((row) => row.id)).toEqual(['w1', 'w2', 'treaty'])
  })
  it('미리보기 경로 — 묶음 이름 › 그 묶음 안의 국면', () => {
    const tree = sampleTree()
    const index = indexTree(tree) as ReadonlyMap<string, TreeRow>
    const warChapters = [phase('wp1', 0), phase('wp2', 1)]
    const nested = new Map([['war', { chapters: warChapters, rows: index.get('war')!.children, runOf: new Map([['w2', 'p2']]) }]])
    const trail = (id: string, chronological = false) =>
      sequenceTrail({ row: index.get(id)!, rootId: ROOT, index, root: { chapters: [], runOf: new Map() }, nested, chronological })
    expect(trail('w2')).toBe('war › 2국면 국면2')
    expect(trail('w2', true)).toBe('war')
    expect(trail('treaty')).toBeNull()
  })
})

describe('revealTargets', () => {
  it('조상 묶음과 각 단계의 국면 열쇠', () => {
    const index = indexTree(sampleTree()) as ReadonlyMap<string, TreeRow>
    const targets = revealTargets({
      rowId: 'w2',
      rootId: ROOT,
      index,
      rootRunOf: new Map([['war', 'p1']]),
      nested: new Map([['war', { runOf: new Map([['w2', 'p2']]) }]]),
    })
    expect(targets).toEqual({ openIds: ['war'], openChapters: ['war|p2', 'root|p1'] })
    expect(revealTargets({ rowId: 'nope', rootId: ROOT, index, rootRunOf: new Map(), nested: new Map() })).toBeNull()
  })
})

describe('placeAccessions', () => {
  const tree = sampleTree()
  const key = (year: number, month: number, day: number) => (year * 100 + month) * 100 + day
  it('펼친 묶음이 덮는 날짜면 그 묶음 안, 아니면 직계', () => {
    const markers = [{ sortKey: key(1940, 7, 11) }, { sortKey: key(1941, 6, 30) }]
    const placed = placeAccessions({ markers, rootRows: tree, collapsedIds: new Set(), nested: new Map() })
    expect(placed.byCollection.get('war')).toEqual([markers[0]])
    expect(placed.root).toEqual([markers[1]])
  })
  it('접힌 묶음은 덮지 않는다', () => {
    const markers = [{ sortKey: key(1940, 7, 11) }]
    const placed = placeAccessions({ markers, rootRows: tree, collapsedIds: new Set(['war']), nested: new Map() })
    expect(placed.root).toEqual(markers)
  })
})

describe('initialView', () => {
  const base = { urlView: null, stored: false, totalCount: 108, hasChapterKeys: true, hasFoldable: true }
  it('주소가 먼저 — 기억·기본 접기보다', () => {
    expect(initialView({ ...base, urlView: 'chrono', stored: true })).toEqual({ kind: 'chrono' })
    expect(initialView({ ...base, urlView: 'all' })).toEqual({ kind: 'level', level: 'events' })
  })
  it('기억한 접기가 있으면 손대지 않고, 25건 미만도 그대로', () => {
    expect(initialView({ ...base, stored: true })).toBeNull()
    expect(initialView({ ...base, totalCount: 24 })).toBeNull()
  })
  it('25건부터 접는다 — 대불동맹(39)·제헌(31)·동부전선(29)이 한 건 차이로 다 펼쳐지던 경계', () => {
    expect(initialView({ ...base, totalCount: 25 })).toEqual({ kind: 'level', level: 'chapters' })
    expect(initialView({ ...base, totalCount: 39 })).toEqual({ kind: 'level', level: 'chapters' })
  })
  it('큰 트리 첫 방문 — 국면이 있으면 국면만, 없으면 묶음만', () => {
    expect(initialView(base)).toEqual({ kind: 'level', level: 'chapters' })
    expect(initialView({ ...base, hasChapterKeys: false })).toEqual({ kind: 'level', level: 'collections' })
    expect(initialView({ ...base, hasChapterKeys: false, hasFoldable: false })).toBeNull()
  })
})
