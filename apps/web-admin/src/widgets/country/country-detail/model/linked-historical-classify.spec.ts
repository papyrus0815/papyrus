/**
 * linked-historical-classify 테스트 — 전신/구성국/유산 3버킷 판정 경계.
 * 트렁크는 "가장 최근 국가(앵커)로 이어지는 계보"다. 계보 신호가 없으면 빈 트렁크(flat 폴백).
 */
import {
  classifyLinkedHistorical,
  lineageToAnchor,
  type ClassifyNode,
} from './linked-historical-classify'

// 전신 계보(연도 부호): 게르마니아 → 프랑크 → 동프랑크 → 신성로마 → 독일제국 → 서독(앵커)
const NODES: Record<string, ClassifyNode> = {
  germania: { id: 'germania', startYear: -100, endYear: 500 },
  frank: { id: 'frank', startYear: 481, endYear: 843 },
  eastFrank: { id: 'east-frank', startYear: 843, endYear: 962 },
  hre: { id: 'hre', startYear: 962, endYear: 1806 },
  germanEmpire: { id: 'german-empire', startYear: 1871, endYear: 1918 },
  westGermany: { id: 'west-germany', startYear: 1949, endYear: 1990 },
  // 구성 제후국(신성로마 내 병존)
  bavariaDuchy: { id: 'bavaria-duchy', startYear: 555, endYear: 1623 },
  bavariaKingdom: { id: 'bavaria-kingdom', startYear: 1806, endYear: 1918 },
  prussia: { id: 'prussia', startYear: 1701, endYear: 1918 },
  // 무연결 고대 조상
  romeRepublic: { id: 'rome-republic', startYear: -509, endYear: -27 },
  romeEmpire: { id: 'rome-empire', startYear: -27, endYear: 395 },
}

const TRUNK_TRANSITIONS = [
  { predecessorId: 'germania', successorId: 'frank' },
  { predecessorId: 'frank', successorId: 'east-frank' },
  { predecessorId: 'east-frank', successorId: 'hre' },
  { predecessorId: 'hre', successorId: 'german-empire' },
  { predecessorId: 'german-empire', successorId: 'west-germany' },
]
// 구성국 등급 승격 사슬(SUCCESSION이지만 앵커 계보와 무관한 곁가지)
const CONSTITUENT_TRANSITIONS = [
  { predecessorId: 'bavaria-duchy', successorId: 'bavaria-kingdom' },
]
// 무연결 로마 컴포넌트
const ROME_TRANSITIONS = [
  { predecessorId: 'rome-republic', successorId: 'rome-empire' },
]

describe('lineageToAnchor', () => {
  it('가장 최근 국가(앵커)로 이어지는 계보를 시간순으로 돌려준다', () => {
    const lineage = lineageToAnchor(
      [NODES.germania, NODES.frank, NODES.eastFrank, NODES.hre, NODES.germanEmpire, NODES.westGermany, NODES.bavariaDuchy, NODES.bavariaKingdom],
      [...TRUNK_TRANSITIONS, ...CONSTITUENT_TRANSITIONS],
    )
    expect(lineage).toEqual(['germania', 'frank', 'east-frank', 'hre', 'german-empire', 'west-germany'])
  })

  it('진행 중(종료 미상) 현행국을 앵커로 우선 — 종료연도만 늦은 곁가지(대영제국)에 안 밀린다', () => {
    // 영국형: 현행국(1922~진행 중)이 앵커여야 하고, 1997에 끝난 대영제국이 앵커를 뺏으면 안 됨.
    const englandKingdom: ClassifyNode = { id: 'england', startYear: 927, endYear: 1707 }
    const greatBritain: ClassifyNode = { id: 'gb', startYear: 1707, endYear: 1801 }
    const ukGBI: ClassifyNode = { id: 'uk-gbi', startYear: 1801, endYear: 1922 }
    const currentUk: ClassifyNode = { id: 'uk', startYear: 1922, endYear: null }
    const britishEmpire: ClassifyNode = { id: 'empire', startYear: 1583, endYear: 1997 }
    const lineage = lineageToAnchor(
      [englandKingdom, greatBritain, ukGBI, currentUk, britishEmpire],
      [
        { predecessorId: 'england', successorId: 'gb' },
        { predecessorId: 'gb', successorId: 'uk-gbi' },
        { predecessorId: 'uk-gbi', successorId: 'uk' },
      ],
    )
    expect(lineage).toEqual(['england', 'gb', 'uk-gbi', 'uk'])
  })

  it('희소 transition — 앵커에 전임이 없으면 빈 계보(flat 폴백 신호). 우연히 사슬 이룬 조상에 하이재킹되지 않음', () => {
    // 프랑스형: 앵커(제5공화국)는 전임 transition이 없고, 로마 사슬만 존재.
    const republic5: ClassifyNode = { id: 'republic5', startYear: 1958, endYear: null }
    const lineage = lineageToAnchor(
      [republic5, NODES.romeRepublic, NODES.romeEmpire],
      [...ROME_TRANSITIONS],
    )
    expect(lineage).toEqual([])
  })

  it('연도 신호가 전무하면 앵커를 못 잡아 빈 계보', () => {
    const lineage = lineageToAnchor(
      [{ id: 'a', startYear: null, endYear: null }, { id: 'b', startYear: null, endYear: null }],
      [{ predecessorId: 'a', successorId: 'b' }],
    )
    expect(lineage).toEqual([])
  })

  it('사이클 데이터에서도 스택 오버플로 없이 종료하고 경로에 중복이 없다', () => {
    const cyclic = [
      { predecessorId: 'a', successorId: 'b' },
      { predecessorId: 'b', successorId: 'c' },
      { predecessorId: 'c', successorId: 'a' },
    ]
    const nodes: ClassifyNode[] = [
      { id: 'a', startYear: 100, endYear: 200 },
      { id: 'b', startYear: 200, endYear: 300 },
      { id: 'c', startYear: 300, endYear: 400 },
    ]
    expect(() => lineageToAnchor(nodes, cyclic)).not.toThrow()
    const lineage = lineageToAnchor(nodes, cyclic)
    expect(new Set(lineage).size).toBe(lineage.length)
  })
})

describe('classifyLinkedHistorical', () => {
  const nodes = Object.values(NODES)
  const memberships = [
    { historicalCountryId: 'hre', memberCountryId: 'bavaria-duchy', isLeadingMember: false },
    { historicalCountryId: 'hre', memberCountryId: 'bavaria-kingdom', isLeadingMember: false },
    // 프로이센은 구성원이지만 주도국 → 구성국이 아님
    { historicalCountryId: 'hre', memberCountryId: 'prussia', isLeadingMember: true },
  ]
  const { kindById, trunk } = classifyLinkedHistorical({
    nodes,
    transitions: [...TRUNK_TRANSITIONS, ...CONSTITUENT_TRANSITIONS, ...ROME_TRANSITIONS],
    memberships,
  })

  it('앵커 계보 노드는 PREDECESSOR', () => {
    expect(trunk).toEqual(['germania', 'frank', 'east-frank', 'hre', 'german-empire', 'west-germany'])
    for (const id of trunk) expect(kindById.get(id)).toBe('PREDECESSOR')
  })

  it('구성원(비주도) 제후국은 CONSTITUENT', () => {
    expect(kindById.get('bavaria-duchy')).toBe('CONSTITUENT')
    expect(kindById.get('bavaria-kingdom')).toBe('CONSTITUENT')
  })

  it('주도국(isLeadingMember)은 구성국이 아님', () => {
    expect(kindById.get('prussia')).not.toBe('CONSTITUENT')
  })

  it('계보와 무연결한 고대 조상은 HERITAGE', () => {
    expect(kindById.get('rome-republic')).toBe('HERITAGE')
    expect(kindById.get('rome-empire')).toBe('HERITAGE')
  })

  it('모든 노드는 정확히 한 버킷에 배정된다(누락·삭제 없음 — 표시 전용 불변식)', () => {
    expect(kindById.size).toBe(nodes.length)
    for (const node of nodes) expect(kindById.has(node.id)).toBe(true)
  })
})
