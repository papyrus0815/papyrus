/**
 * 묶음 사건 '전개' 보기의 규칙 — 컴포넌트(collection-development.tsx)에서 떼어 낸 순수 함수.
 *
 * 장 머리 구간 · 빈 국면 · 읽는 차례 · 미리보기 경로 · 펼칠 자리 · 즉위 표지 자리 · 첫 보기.
 * 화면 상태(접기·시간순)는 인자로만 받는다 — 같은 입력이면 같은 답이라 테스트로 고정할 수 있다.
 */
import { spanOfChildren } from './collection-development.lib'
import { eventWindow } from './contemporary-heads.lib'
import type { TreeNode } from './development-tree.lib'
import type { EventPhase, PhaseReach } from './event-phase.lib'

/** 직계·손자 행 — 상세 응답 하위(추가 상위 연결 표지 포함) */
export type TreeRow = TreeNode & { viaExtraLink?: boolean; children: TreeRow[] }

/** 전개 펼침 단계 — 전부 · 국면만(국면 목차만) · 묶음만(직계만) */
export type FoldLevel = 'events' | 'chapters' | 'collections'

/** 주소의 보기 — '?dev=chapters'. 전부(all)·국면만·묶음만·시간순 */
export const VIEW_PARAM = 'dev'
export type ViewParam = 'all' | 'chapters' | 'collections' | 'chrono'
export const VIEW_OF_LEVEL: Record<FoldLevel, ViewParam> = {
  events: 'all',
  chapters: 'chapters',
  collections: 'collections',
}

/**
 * 첫 방문 기본 접기 — 하위 전체가 이만큼 넘으면 '국면만'(국면이 없으면 '묶음만')으로 연다.
 * 프랑스 혁명(108건)은 다 펼치면 6,572px(7화면), '국면만'이면 899px에 대분류 4 › 국면 13이 한 화면에 든다.
 */
export const AUTO_FOLD_MIN = 40

/* ───────────────────────── 장 머리 구간 ───────────────────────── */

export interface ChapterRun {
  reach: PhaseReach
  count: number
  /** 구간 열쇠 — 접기 상태를 기억하는 데 쓴다('p3' = 3국면, 'o:before' = 국면 전) */
  key: string
}

/**
 * 장 머리 자리 — 화면 차례에서 국면 자리가 바뀌는 첫 행마다 하나, 건수는 그 구간만.
 * 직계(이 사건의 국면)와 펼친 하위 묶음(그 묶음의 국면)이 같은 규칙을 쓴다.
 */
export function chapterRuns(
  chapterList: ReadonlyArray<EventPhase>,
  rows: ReadonlyArray<{ id: string }>,
  reachById: ReadonlyMap<string, PhaseReach>,
): { heads: Map<string, ChapterRun>; runOf: Map<string, string> } {
  const heads = new Map<string, ChapterRun>()
  const runOf = new Map<string, string>()
  if (chapterList.length === 0) return { heads, runOf }
  let currentHead: ChapterRun | null = null
  for (const row of rows) {
    const reach = reachById.get(row.id)
    if (!reach) continue
    const key = reach.from != null ? `p${reach.from}` : `o:${reach.outside}`
    if (!currentHead || key !== currentHead.key) {
      currentHead = { reach, count: 0, key }
      heads.set(row.id, currentHead)
    }
    currentHead.count += 1
    runOf.set(row.id, key)
  }
  return { heads, runOf }
}

/**
 * 사건이 하나도 들지 않은 국면 — 장 머리는 '그 국면에 든 행'이 있을 때만 서서, 국면을 먼저 나누고 채우는 순서면
 * 빈 국면은 머리도 '+ 이 국면에 사건'도 없었다(국면 편집 창에서만 보였다). 걸친 행(2–4국면)이 덮으면 빈 국면이 아니다.
 */
export function emptyChaptersOf(
  chapterList: ReadonlyArray<EventPhase>,
  rows: ReadonlyArray<{ id: string }>,
  reach: ReadonlyMap<string, PhaseReach>,
): Array<{ chapter: EventPhase; number: number }> {
  return chapterList
    .map((chapter, position) => ({ chapter, number: position + 1 }))
    .filter(
      ({ number }) =>
        !rows.some((row) => {
          const rowReach = reach.get(row.id)
          return rowReach?.from != null && rowReach.from <= number && number <= (rowReach.to ?? rowReach.from)
        }),
    )
}

/** 장 머리의 차례 — 빈 국면을 그 앞에 끼울 자리. 국면 사이는 정할 수 없어 null(끼우지 않는다) */
export function rankOfRun(run: ChapterRun): number | null {
  if (run.reach.from != null) return run.reach.from
  if (run.reach.outside === 'before') return 0
  if (run.reach.outside === 'after') return Number.POSITIVE_INFINITY
  return null
}

/** 빈 국면의 장 머리 구간 */
export function emptyRun(number: number): ChapterRun {
  return { reach: { from: number, to: number, outside: null, manual: false }, count: 0, key: `p${number}` }
}

/* ───────────────────────── 읽는 차례·미리보기 경로 ───────────────────────── */

/** 묶음마다 국면별로 모은 하위 차례와 장 머리 구간 — 컴포넌트의 nestedRuns와 같은 모양 */
export interface NestedRuns {
  chapters: ReadonlyArray<EventPhase>
  rows: TreeRow[]
  runOf: ReadonlyMap<string, string>
}

/**
 * 읽는 차례 전체 — 화면 차례대로 하위의 하위까지(접힌 것도 포함). 미리보기의 '앞 사건 · 다음 사건'이 따른다.
 * 시간순 보기면 그 보기의 차례(잎 사건을 날짜순)로.
 */
export function readingOrder(input: {
  chronological: boolean
  tree: ReadonlyArray<TreeRow>
  rootRows: ReadonlyArray<TreeRow>
  nested: ReadonlyMap<string, NestedRuns>
  compareStart: (left: string | null | undefined, right: string | null | undefined) => number
}): TreeRow[] {
  if (input.chronological) {
    const leaves: TreeRow[] = []
    const walk = (row: TreeRow) => (row.children.length === 0 ? leaves.push(row) : row.children.forEach(walk))
    input.tree.forEach(walk)
    return leaves.sort((first, second) => input.compareStart(first.startDate, second.startDate))
  }
  const order: TreeRow[] = []
  const visit = (rows: ReadonlyArray<TreeRow>) => {
    for (const row of rows) {
      order.push(row)
      if (row.children.length > 0) visit(input.nested.get(row.id)?.rows ?? row.children)
    }
  }
  visit(input.rootRows)
  return order
}

/** 구간 열쇠 → '2국면 이름' · '국면 전' · '국면 후' · '국면 사이' */
function chapterLabel(runKey: string, chapters: ReadonlyArray<EventPhase>): string {
  const chapterNumber = runKey.startsWith('p') ? Number(runKey.slice(1)) : null
  const chapter = chapterNumber != null ? chapters[chapterNumber - 1] : null
  if (chapter) return `${chapterNumber}국면 ${chapter.title}`
  return runKey === 'o:before' ? '국면 전' : runKey === 'o:after' ? '국면 후' : '국면 사이'
}

/**
 * 미리보기의 '어디쯤' — 이 사건까지의 묶음 경로 + 그 묶음 안의 국면('제헌국민의회기 › 2국면 파리 봉기와…').
 * 시간순 보기는 국면 없이 묶음 경로만. 직계(국면도 없음)면 null.
 */
export function sequenceTrail(input: {
  row: TreeRow
  rootId: string
  index: ReadonlyMap<string, TreeRow>
  root: { chapters: ReadonlyArray<EventPhase>; runOf: ReadonlyMap<string, string> }
  nested: ReadonlyMap<string, NestedRuns>
  chronological: boolean
}): string | null {
  const trail: string[] = []
  let current: TreeRow | undefined = input.row
  let first = true
  while (current) {
    const parentId: string = current.parentEventId ?? input.rootId
    const runs = parentId === input.rootId ? input.root : input.nested.get(parentId)
    const runKey = runs?.runOf.get(current.id)
    if (!input.chronological && first && runs && runKey) trail.unshift(chapterLabel(runKey, runs.chapters))
    first = false
    if (parentId === input.rootId) break
    const parent = input.index.get(parentId)
    if (parent) trail.unshift(parent.title)
    current = parent
  }
  return trail.length > 0 ? trail.join(' › ') : null
}

/* ───────────────────────── 펼칠 자리 ───────────────────────── */

/**
 * 한 하위 행이 보이려면 펼칠 것 — 그 행을 덮은 묶음(조상)과 각 단계의 국면 구간 열쇠('소유 묶음 id|구간').
 * 목차·해시·미리보기에서 돌아오기가 쓴다. 다른 국면은 건드리지 않는다.
 */
export function revealTargets(input: {
  rowId: string
  rootId: string
  index: ReadonlyMap<string, TreeRow>
  rootRunOf: ReadonlyMap<string, string>
  nested: ReadonlyMap<string, { runOf: ReadonlyMap<string, string> }>
}): { openIds: string[]; openChapters: string[] } | null {
  const target = input.index.get(input.rowId)
  if (!target) return null
  const openIds: string[] = []
  const openChapters: string[] = []
  let current: TreeRow | undefined = target
  while (current) {
    const parentId: string = current.parentEventId ?? input.rootId
    const runKey =
      parentId === input.rootId ? input.rootRunOf.get(current.id) : input.nested.get(parentId)?.runOf.get(current.id)
    if (runKey) openChapters.push(`${parentId}|${runKey}`)
    if (parentId === input.rootId) break
    openIds.push(parentId)
    current = input.index.get(parentId)
  }
  return { openIds, openChapters }
}

/* ───────────────────────── 즉위 표지 자리 ───────────────────────── */

/**
 * 즉위 표지의 자리 — 펼친 묶음 가운데 그 날짜를 덮는 **가장 깊은** 묶음 안. 예전엔 직계 차례에만 끼워져
 * 2차대전의 1940년 페탱·안토네스쿠 취임이 1939–41 묶음이 다 끝난 뒤(1941년 행들 다음)에 섰다.
 * 덮는 펼친 묶음이 없으면 직계 차례(구획별)에.
 */
export function placeAccessions<Marker extends { sortKey: number }>(input: {
  markers: ReadonlyArray<Marker>
  rootRows: ReadonlyArray<TreeRow>
  collapsedIds: ReadonlySet<string>
  nested: ReadonlyMap<string, { rows: TreeRow[] }>
}): { byCollection: Map<string, Marker[]>; root: Marker[] } {
  const byCollection = new Map<string, Marker[]>()
  const root: Marker[] = []
  const covers = (row: TreeRow, key: number) => {
    if (!row.isCollection || row.children.length === 0 || input.collapsedIds.has(row.id)) return false
    const window = eventWindow({
      startDate: row.startDate,
      startDatePrecision: row.startDatePrecision,
      endDate: row.endDate ?? spanOfChildren(row.children)?.endDate ?? null,
    })
    return Boolean(window && window.startKey <= key && key <= window.endKey)
  }
  for (const marker of input.markers) {
    let rows: ReadonlyArray<TreeRow> = input.rootRows
    let owner: TreeRow | null = null
    for (;;) {
      const next = rows.find((row) => covers(row, marker.sortKey))
      if (!next) break
      owner = next
      rows = input.nested.get(next.id)?.rows ?? next.children
    }
    if (owner) byCollection.set(owner.id, [...(byCollection.get(owner.id) ?? []), marker])
    else root.push(marker)
  }
  return { byCollection, root }
}

/* ───────────────────────── 첫 보기 ───────────────────────── */

/**
 * 처음 열 때의 보기 — 주소(?dev=)가 먼저, 다음은 기억한 접기(있으면 손대지 않음), 그다음 큰 트리 기본 접기.
 * 펼칠 것이 없는 단계(국면도 하위 묶음도 없음)면 그대로 둔다.
 */
export function initialView(input: {
  urlView: string | null
  stored: boolean
  totalCount: number
  hasChapterKeys: boolean
  hasFoldable: boolean
}): { kind: 'chrono' } | { kind: 'level'; level: FoldLevel } | null {
  if (input.urlView === 'chrono') return { kind: 'chrono' }
  const urlLevel = (Object.keys(VIEW_OF_LEVEL) as FoldLevel[]).find((level) => VIEW_OF_LEVEL[level] === input.urlView)
  if (urlLevel) return { kind: 'level', level: urlLevel }
  if (input.stored || input.totalCount < AUTO_FOLD_MIN) return null
  if (input.hasChapterKeys) return { kind: 'level', level: 'chapters' }
  if (input.hasFoldable) return { kind: 'level', level: 'collections' }
  return null
}
