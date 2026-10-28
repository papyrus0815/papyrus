import { buildEventTree, dropActionFor, indexTree, subtreeIds } from './development-tree.lib'

const ROOT = 'root'
const node = (id: string, parentEventId: string | null, startDate: string | null = null, kind?: 'SINGLE' | 'COLLECTION') => ({
  id,
  title: id,
  parentEventId,
  startDate,
  ...(kind ? { kind } : {}),
})

const sample = () =>
  buildEventTree(ROOT, [
    node(ROOT, null),
    node('b', ROOT, '1914-08-01'),
    node('a', ROOT, '1914-07-01'),
    node('a1', 'a', '1914-07-02'),
    node('a1x', 'a1', '1914-07-03'),
    node('empty', ROOT, '1914-09-01', 'COLLECTION'),
    node('orphan', 'gone', '1914-10-01'),
  ])

describe('buildEventTree', () => {
  it('부모 → 자식으로 엮고 형제는 시작 순, 깊이를 단다', () => {
    const tree = sample()
    expect(tree.map((item) => item.id)).toEqual(['a', 'b', 'empty', 'orphan'])
    const index = indexTree(tree)
    expect(index.get('a1x')?.depth).toBe(3)
  })

  it('종류는 응답 값이 정본, 없으면 하위 유무 — 빈 묶음도 묶음', () => {
    const index = indexTree(sample())
    expect(index.get('a')?.isCollection).toBe(true)
    expect(index.get('a1x')?.isCollection).toBe(false)
    expect(index.get('empty')?.isCollection).toBe(true)
  })

  it('조망에 종류가 없으면 kindById로 보충', () => {
    const tree = buildEventTree(ROOT, [node('x', ROOT)], new Map([['x', 'COLLECTION' as const]]))
    expect(tree[0].isCollection).toBe(true)
  })

  it('부모를 못 찾으면 직계로 올린다(버리지 않는다)', () => {
    expect(sample().some((item) => item.id === 'orphan')).toBe(true)
  })
})

describe('dropActionFor', () => {
  const index = indexTree(sample())
  const get = (id: string) => index.get(id)!

  it('묶음 위 = 그 밑으로, 이미 그 밑이면 null', () => {
    expect(dropActionFor(get('b'), get('a'), ROOT)).toEqual({ type: 'move', parentId: 'a' })
    expect(dropActionFor(get('a1'), get('a'), ROOT)).toBeNull()
  })

  it('개별 위 = 둘을 새 묶음으로, 새 묶음은 놓인 사건의 상위 밑', () => {
    expect(dropActionFor(get('b'), get('a1x'), ROOT)).toEqual({ type: 'group', withId: 'a1x', parentId: 'a1' })
  })

  it('자기 자신·자기 하위 위로는 못 놓는다', () => {
    expect(dropActionFor(get('a'), get('a'), ROOT)).toBeNull()
    expect(dropActionFor(get('a'), get('a1x'), ROOT)).toBeNull()
    expect(subtreeIds(get('a'))).toEqual(new Set(['a', 'a1', 'a1x']))
  })

  it('루트 띠 = 이 사건 바로 밑으로, 이미 직계면 null', () => {
    expect(dropActionFor(get('a1x'), 'root', ROOT)).toEqual({ type: 'move', parentId: ROOT })
    expect(dropActionFor(get('b'), 'root', ROOT)).toBeNull()
  })
})
