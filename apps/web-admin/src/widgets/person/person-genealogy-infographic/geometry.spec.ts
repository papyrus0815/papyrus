/**
 * 가계도 커넥터 기하 회귀 테스트.
 *
 * 배경: fork 바·::before 스텁·center-shift가 카드를 NODE_W(192) 고정폭으로 가정했지만,
 * 실제 DOM은 손자녀 서브트리를 자녀 컬럼 안에 중첩시켜 폭이 팽창한다. 두 레이어가
 * 각각 중앙정렬되며 (실폭−가정폭)/2 만큼 선이 어긋났다(발루아 장 가계도 스크린샷).
 *
 * 이 테스트는 그 스크린샷과 동일한 트리 형태를 픽스처로 고정해, 기하 계산이 실제
 * 렌더 폭과 일치함을 못박는다. 숫자가 바뀌면 커넥터 정렬이 다시 깨졌다는 신호.
 *
 * 트리(발루아 장 = ego):
 *   ├ 샤를5세 (배우자 부르봉 잔)
 *   │   ├ 영아 샤를 (자식 없음)
 *   │   └ 오를레앙 루이
 *   │       ├ 오를레앙 샤를
 *   │       └ 앙굴렘 존
 *   └ 부르고뉴 필리프 (배우자 없음)
 *       └ 부르고뉴 장
 *           └ 부르고뉴 필리프(손)
 */
import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'
import {
  NODE_W,
  SPOUSE_JOIN_SPAN,
  CHILD_GAP,
  DESCENDANT_GAP,
  DESCENDANT_MAX_DEPTH,
  ANC_PARENTS_GAP,
  FT_MAX_DEPTH,
} from './constants'
import type { ChildPerson } from './types'
import {
  computeChildLayouts,
  childrenCenterShift,
  descendantsRowWidth,
  descendantSlotWidths,
  ancestorColumnWidth,
} from './geometry'

function ft(id: string, gender: 'MALE' | 'FEMALE' = 'MALE'): FamilyTreePerson {
  return { id, isOwned: true, name: id, gender }
}

function child(id: string, spouseId?: string): ChildPerson {
  return {
    id,
    name: id,
    gender: 'MALE',
    spouse: spouseId ? { id: spouseId, name: spouseId, gender: 'FEMALE' } : null,
  }
}

/** 성별을 명시하는 자녀 픽스처 — childOffset 좌/우 브랜치를 모두 커버하기 위함 */
function childG(
  id: string,
  gender: 'MALE' | 'FEMALE',
  spouse?: { id: string; gender: 'MALE' | 'FEMALE' },
): ChildPerson {
  return {
    id,
    name: id,
    gender,
    spouse: spouse ? { id: spouse.id, name: spouse.id, gender: spouse.gender } : null,
  }
}

/** 스크린샷과 동일한 부모→자식 맵 */
function buildTree() {
  const descendantsByParentId = new Map<string, FamilyTreePerson[]>([
    ['c-charles5', [ft('g-infant'), ft('g-louis')]],
    ['g-louis', [ft('gg-orleans'), ft('gg-angouleme')]],
    ['c-philip', [ft('g-john')]],
    ['g-john', [ft('gg-philip')]],
  ])
  const childList: ChildPerson[] = [
    child('c-charles5', 'sp-jeanne'),
    child('c-philip'),
  ]
  return { descendantsByParentId, childList }
}

describe('가계도 커넥터 기하 (발루아 장 트리)', () => {
  const { descendantsByParentId, childList } = buildTree()

  it('descendantsRowWidth: 루이의 두 증손자 행은 192+192+12 = 396', () => {
    const width = descendantsRowWidth(
      descendantsByParentId.get('g-louis') ?? [],
      descendantsByParentId,
      1,
      DESCENDANT_MAX_DEPTH,
      new Set(['ego', 'c-charles5', 'g-louis']),
    )
    expect(width).toBe(2 * NODE_W + DESCENDANT_GAP) // 396
  })

  it('descendantsRowWidth: 샤를5세 손자 행은 영아(192) + gap + 루이페어(396) = 600', () => {
    const width = descendantsRowWidth(
      descendantsByParentId.get('c-charles5') ?? [],
      descendantsByParentId,
      0,
      DESCENDANT_MAX_DEPTH,
      new Set(['ego', 'c-charles5']),
    )
    // 192(영아) + 12(gap) + 396(루이: max(192, 396)) = 600
    expect(width).toBe(NODE_W + DESCENDANT_GAP + (2 * NODE_W + DESCENDANT_GAP))
    expect(width).toBe(600)
  })

  it('computeChildLayouts: 샤를5세 페어는 서브트리로 팽창(600) → 폭 848·자녀중심 300', () => {
    const layouts = computeChildLayouts(childList, descendantsByParentId, 'ego')
    // 자녀 컬럼 colW=600, 배우자 동반 → 600 + 56(join) + 192 = 848
    expect(layouts[0].pairWidth).toBe(600 + SPOUSE_JOIN_SPAN + NODE_W)
    expect(layouts[0].pairWidth).toBe(848)
    // 자녀(좌측)라 중심은 colW/2 = 300 (NODE_W/2=96 이었다면 선이 204px 어긋남)
    expect(layouts[0].childOffset).toBe(300)
  })

  it('computeChildLayouts: 필리프 페어는 손자 1렬(192)이라 팽창 없음 → 폭 192·중심 96', () => {
    const layouts = computeChildLayouts(childList, descendantsByParentId, 'ego')
    expect(layouts[1].pairWidth).toBe(NODE_W) // 192
    expect(layouts[1].childOffset).toBe(NODE_W / 2) // 96
  })

  it('childrenCenterShift: ego 드롭이 첫·끝 자녀 중심의 평균에 오도록 102px', () => {
    const layouts = computeChildLayouts(childList, descendantsByParentId, 'ego')
    // totalW = 848 + 40(CHILD_GAP) + 192 = 1080
    // xStart = 300, xEnd = (848+40) + 96 = 984, childMean = 642
    // shift = 642 - 1080/2 = 102  → 이 값으로 fork stem이 정확히 ego 아래에 정렬
    expect(childrenCenterShift(layouts)).toBe(102)
    const totalW = 848 + CHILD_GAP + 192
    expect(totalW).toBe(1080)
  })

  it('회귀 가드: 서브트리 없는 단순 두 자녀는 shift 0(자연 대칭)', () => {
    const flatChildren: ChildPerson[] = [child('a'), child('b')]
    const layouts = computeChildLayouts(flatChildren, new Map(), 'ego')
    expect(layouts.every((layout) => layout.pairWidth === NODE_W)).toBe(true)
    expect(childrenCenterShift(layouts)).toBe(0)
  })
})

describe('가계도 커넥터 기하 — 우측 브랜치·조상 폭 (회귀 가드 확장)', () => {
  // 딸(FEMALE) + 사위(MALE) → isChildOnLeftInPair=false(자녀 우측). 손자 2명으로 colW 팽창.
  const rightBranchTree = () => {
    const descendantsByParentId = new Map<string, FamilyTreePerson[]>([
      ['d-anne', [ft('gc-1'), ft('gc-2')]],
    ])
    const childList: ChildPerson[] = [
      childG('d-anne', 'FEMALE', { id: 'sp-henry', gender: 'MALE' }),
      childG('d-simple', 'MALE'),
    ]
    return { descendantsByParentId, childList }
  }

  it('computeChildLayouts: 우측 브랜치 childOffset = NODE_W + JOIN + colW/2 (콜W 팽창 결합)', () => {
    const { descendantsByParentId, childList } = rightBranchTree()
    const layouts = computeChildLayouts(childList, descendantsByParentId, 'ego')
    const colW = 2 * NODE_W + DESCENDANT_GAP // 396
    expect(layouts[0].pairWidth).toBe(colW + SPOUSE_JOIN_SPAN + NODE_W) // 644
    // NODE_W/2(96)로 계산됐다면 fork 끝점이 350px 어긋남 — 이 브랜치가 오차 최대 지점
    expect(layouts[0].childOffset).toBe(NODE_W + SPOUSE_JOIN_SPAN + colW / 2) // 446
    expect(layouts[1].pairWidth).toBe(NODE_W)
    expect(layouts[1].childOffset).toBe(NODE_W / 2)
  })

  it('childrenCenterShift: 우측 브랜치 자녀가 섞인 트리의 shift = 175', () => {
    const { descendantsByParentId, childList } = rightBranchTree()
    const layouts = computeChildLayouts(childList, descendantsByParentId, 'ego')
    // totalW=644+40+192=876; xStart=446, xEnd=(644+40)+96=780; mean=613; shift=613-438=175
    expect(childrenCenterShift(layouts)).toBe(175)
  })

  it('descendantSlotWidths: 슬롯 배열 = [영아192, 루이396]이고 합+gap = descendantsRowWidth', () => {
    const map = new Map<string, FamilyTreePerson[]>([
      ['c-charles5', [ft('g-infant'), ft('g-louis')]],
      ['g-louis', [ft('gg-orleans'), ft('gg-angouleme')]],
    ])
    const visited = new Set(['ego', 'c-charles5'])
    const slots = descendantSlotWidths(map.get('c-charles5') ?? [], map, 0, DESCENDANT_MAX_DEPTH, visited)
    expect(slots).toEqual([NODE_W, 2 * NODE_W + DESCENDANT_GAP]) // [192, 396]
    const row = descendantsRowWidth(map.get('c-charles5') ?? [], map, 0, DESCENDANT_MAX_DEPTH, visited)
    expect(row).toBe(slots[0] + slots[1] + DESCENDANT_GAP) // 600
  })

  it('ancestorColumnWidth: 부모 2명 조상 = 192+gap+192, 리프 조상 = 192 (상향 대칭)', () => {
    const nodeMap = new Map<string, FamilyTreePerson>([
      ['f', ft('f', 'MALE')],
      ['pgf', ft('pgf', 'MALE')],
      ['pgm', ft('pgm', 'FEMALE')],
      ['m', ft('m', 'FEMALE')],
    ])
    const parentsOf = new Map<string, string[]>([['f', ['pgf', 'pgm']]])
    expect(ancestorColumnWidth('f', parentsOf, nodeMap, 1, FT_MAX_DEPTH, new Set())).toBe(
      2 * NODE_W + ANC_PARENTS_GAP, // 396
    )
    expect(ancestorColumnWidth('m', parentsOf, nodeMap, 1, FT_MAX_DEPTH, new Set())).toBe(NODE_W)
  })

  it('ancestorColumnWidth: 비대칭 조상(넓은 부계 vs 리프 모계)은 서로 다른 실측 폭', () => {
    // 균등분할(1 1 0)이면 두 폭이 같아져 드리프트 — 실측은 달라야 한다.
    const nodeMap = new Map<string, FamilyTreePerson>([
      ['f', ft('f', 'MALE')],
      ['pgf', ft('pgf', 'MALE')],
      ['pgm', ft('pgm', 'FEMALE')],
      ['m', ft('m', 'FEMALE')],
    ])
    const parentsOf = new Map<string, string[]>([['f', ['pgf', 'pgm']]])
    const fatherW = ancestorColumnWidth('f', parentsOf, nodeMap, 1, FT_MAX_DEPTH, new Set())
    const motherW = ancestorColumnWidth('m', parentsOf, nodeMap, 1, FT_MAX_DEPTH, new Set())
    expect(fatherW).not.toBe(motherW)
    expect(fatherW).toBe(2 * NODE_W + ANC_PARENTS_GAP)
    expect(motherW).toBe(NODE_W)
  })
})
