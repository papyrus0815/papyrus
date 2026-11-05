import { layoutMindmap, splitSides, type MindTreeNode } from './mindmap-layout'

const leaf = (id: string, side?: 'left' | 'right'): MindTreeNode => ({ id, width: 100, height: 20, children: [], side })
const branch = (id: string, children: MindTreeNode[], side?: 'left' | 'right'): MindTreeNode => ({
  id,
  width: 120,
  height: 24,
  children,
  side,
})

describe('splitSides', () => {
  it('정해진 쪽은 그대로, 나머지는 잎이 적은 쪽으로', () => {
    const big = branch('big', [leaf('a'), leaf('b'), leaf('c')])
    const small1 = branch('s1', [leaf('d')])
    const small2 = branch('s2', [leaf('e')])
    const fixed = leaf('cause', 'left')
    const { left, right } = splitSides([fixed, big, small1, small2])
    expect(right.map((node) => node.id)).toEqual(['big'])
    expect(left.map((node) => node.id)).toEqual(['cause', 's1', 's2'])
  })
})

describe('layoutMindmap', () => {
  it('뿌리는 가운데, 오른쪽 가지는 x>0, 왼쪽은 x<0, 부모는 자식들의 가운데', () => {
    const tree = branch('root', [branch('r', [leaf('r1'), leaf('r2')], 'right'), branch('l', [leaf('l1')], 'left')])
    const positions = layoutMindmap(tree)
    expect(positions.get('root')).toMatchObject({ side: 'center', depth: 0 })
    expect(positions.get('r')!.x).toBeGreaterThan(0)
    expect(positions.get('l')!.x + 120).toBeLessThan(0)
    const r1 = positions.get('r1')!
    const r2 = positions.get('r2')!
    const rightBranch = positions.get('r')!
    expect(rightBranch.y + 12).toBeCloseTo((r1.y + 10 + r2.y + 10) / 2)
    expect(r2.y).toBeGreaterThan(r1.y)
    /* 한쪽 숲은 세로 가운데 정렬 */
    expect(r1.y + r2.y + 20).toBeCloseTo(0, 0)
  })
})
