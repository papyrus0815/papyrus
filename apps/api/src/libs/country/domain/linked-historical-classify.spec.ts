/**
 * linked-historical-classify (서버 정본) 테스트 — 웹 헬퍼와 동일 알고리즘.
 * 트렁크 = "가장 최근(진행 중 우선) 국가로 이어지는 계보". 계보 신호 없으면 빈 트렁크.
 */
import {
  classifyLinkedHistorical,
  lineageToAnchor,
  type ClassifyNode,
} from './linked-historical-classify'

const NODES: Record<string, ClassifyNode> = {
  germania: { id: 'germania', startYear: -100, endYear: 500 },
  frank: { id: 'frank', startYear: 481, endYear: 843 },
  hre: { id: 'hre', startYear: 962, endYear: 1806 },
  germanEmpire: { id: 'german-empire', startYear: 1871, endYear: 1918 },
  westGermany: { id: 'west-germany', startYear: 1949, endYear: 1990 },
  bavaria: { id: 'bavaria', startYear: 1806, endYear: 1918 },
  romeRepublic: { id: 'rome-republic', startYear: -509, endYear: -27 },
  romeEmpire: { id: 'rome-empire', startYear: -27, endYear: 395 },
}

const TRUNK = [
  { predecessorId: 'germania', successorId: 'frank' },
  { predecessorId: 'frank', successorId: 'hre' },
  { predecessorId: 'hre', successorId: 'german-empire' },
  { predecessorId: 'german-empire', successorId: 'west-germany' },
]
const ROME = [{ predecessorId: 'rome-republic', successorId: 'rome-empire' }]

describe('lineageToAnchor (server)', () => {
  it('가장 최근 국가로 이어지는 계보를 시간순으로 반환', () => {
    expect(
      lineageToAnchor(
        [NODES.germania, NODES.frank, NODES.hre, NODES.germanEmpire, NODES.westGermany],
        TRUNK,
      ),
    ).toEqual(['germania', 'frank', 'hre', 'german-empire', 'west-germany'])
  })

  it('진행 중(종료 미상) 현행국을 앵커로 우선 — 종료연도만 늦은 곁가지에 안 밀림', () => {
    const currentUk: ClassifyNode = { id: 'uk', startYear: 1922, endYear: null }
    const empire: ClassifyNode = { id: 'empire', startYear: 1583, endYear: 1997 }
    const gb: ClassifyNode = { id: 'gb', startYear: 1707, endYear: 1922 }
    expect(
      lineageToAnchor([gb, currentUk, empire], [{ predecessorId: 'gb', successorId: 'uk' }]),
    ).toEqual(['gb', 'uk'])
  })

  it('앵커에 전임 transition이 없으면 빈 계보(flat 폴백) — 우연히 사슬 이룬 조상에 하이재킹 안 됨', () => {
    const republic5: ClassifyNode = { id: 'republic5', startYear: 1958, endYear: null }
    expect(lineageToAnchor([republic5, NODES.romeRepublic, NODES.romeEmpire], ROME)).toEqual([])
  })

  it('사이클에서도 종료하고 경로 중복 없음', () => {
    const nodes: ClassifyNode[] = [
      { id: 'a', startYear: 100, endYear: 200 },
      { id: 'b', startYear: 200, endYear: 300 },
      { id: 'c', startYear: 300, endYear: 400 },
    ]
    const cyclic = [
      { predecessorId: 'a', successorId: 'b' },
      { predecessorId: 'b', successorId: 'c' },
      { predecessorId: 'c', successorId: 'a' },
    ]
    expect(() => lineageToAnchor(nodes, cyclic)).not.toThrow()
    const lineage = lineageToAnchor(nodes, cyclic)
    expect(new Set(lineage).size).toBe(lineage.length)
  })
})

describe('classifyLinkedHistorical (server)', () => {
  const nodes = Object.values(NODES)
  const memberships = [
    { historicalCountryId: 'hre', memberCountryId: 'bavaria', isLeadingMember: false },
  ]
  const { kindById, trunk } = classifyLinkedHistorical({
    nodes,
    transitions: [...TRUNK, ...ROME],
    memberships,
  })

  it('계보 노드는 PREDECESSOR', () => {
    expect(trunk).toContain('west-germany')
    for (const id of trunk) expect(kindById.get(id)).toBe('PREDECESSOR')
  })

  it('비주도 구성원은 CONSTITUENT', () => {
    expect(kindById.get('bavaria')).toBe('CONSTITUENT')
  })

  it('무연결 고대 조상은 HERITAGE', () => {
    expect(kindById.get('rome-republic')).toBe('HERITAGE')
    expect(kindById.get('rome-empire')).toBe('HERITAGE')
  })

  it('모든 노드가 정확히 한 버킷에 배정(누락·삭제 없음)', () => {
    expect(kindById.size).toBe(nodes.length)
  })
})
