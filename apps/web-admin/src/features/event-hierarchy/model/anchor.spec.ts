/**
 * 앵커 판정 스펙 — 파생 규약이 흔들리면 목록 배지·칩 모수·정렬이 동시에 틀어진다.
 */
import {
  ANCHOR_MIN_DESCENDANTS,
  getAnchorBadgeLabel,
  getDescendantCount,
  getEventDescendantCount,
  isAnchorEvent,
  isEmptyAnchorEvent,
  isSoloRootEvent,
  type AnchorEventLike,
  type AnchorHierarchyNodeLike,
} from './anchor'

const node = (
  id: string,
  children: AnchorHierarchyNodeLike[] = [],
): AnchorHierarchyNodeLike => ({ id, children })

const event = (
  id: string,
  hierarchy: AnchorHierarchyNodeLike,
  parentEventId?: string,
): AnchorEventLike => ({ id, parentEventId, hierarchy })

describe('getDescendantCount', () => {
  it('자식이 없으면 0', () => {
    expect(getDescendantCount(node('solo'))).toBe(0)
  })

  it('children 자체가 없어도(undefined) 0', () => {
    expect(getDescendantCount({ id: 'no-children-key' })).toBe(0)
  })

  it('노드가 없으면 0', () => {
    expect(getDescendantCount(undefined)).toBe(0)
  })

  it('직계만 있으면 직계 수', () => {
    expect(
      getDescendantCount(node('ww1', [node('sarajevo'), node('mobilization')])),
    ).toBe(2)
  })

  it('손자까지 재귀로 센다 — 직계만 세던 기존 카운트와 갈리는 지점', () => {
    // 러불 동맹(자손 15·최대 2단)의 축소 모형
    const tree = node('alliance', [
      node('loan', [node('loan-1888'), node('loan-1891')]),
      node('treaty'),
    ])
    expect(getDescendantCount(tree)).toBe(4)
  })

  it('순환이 있어도 유한하게 끝나고, 자기 자신을 자손으로 세지 않는다', () => {
    const parent: AnchorHierarchyNodeLike = { id: 'parent', children: [] }
    const child: AnchorHierarchyNodeLike = { id: 'child', children: [parent] }
    parent.children = [child]
    expect(getDescendantCount(parent)).toBe(1)
  })

  it('같은 사건이 두 갈래로 실려 와도 한 번만 센다', () => {
    const shared = node('shared')
    expect(
      getDescendantCount(
        node('root', [node('left', [shared]), node('right', [shared])]),
      ),
    ).toBe(3)
  })
})

describe('isAnchorEvent', () => {
  it('임계는 자손 1 — 자식 1건짜리도 앵커다', () => {
    expect(ANCHOR_MIN_DESCENDANTS).toBe(1)
    // 보오전쟁(자식 1)이 탈락하던 임계 3안을 쓰지 않는다는 회귀 방어
    expect(isAnchorEvent(event('austro-prussian', node('austro-prussian', [node('koniggratz')])))).toBe(true)
  })

  it('자손 0이면 앵커가 아니다', () => {
    expect(isAnchorEvent(event('kiel-canal', node('kiel-canal')))).toBe(false)
  })

  it('상위가 있어도 자손이 있으면 앵커다(비루트 앵커 허용)', () => {
    const loan = event(
      'loan',
      node('loan', [node('loan-1888'), node('loan-1891')]),
      'alliance',
    )
    expect(isAnchorEvent(loan)).toBe(true)
  })
})

describe('명시 오버라이드 — 파생을 양방향으로 덮어쓴다', () => {
  it("ANCHOR: 자손 0이어도 앵커 — '아직 하위가 없는 전쟁'을 미리 선언", () => {
    const declared: AnchorEventLike = {
      id: 'ww2',
      hierarchy: node('ww2'),
      anchorOverride: 'ANCHOR',
    }
    expect(isAnchorEvent(declared)).toBe(true)
    expect(isEmptyAnchorEvent(declared)).toBe(true)
    expect(getAnchorBadgeLabel(declared)).toBe('최상위 사건')
  })

  it('PLAIN: 자손이 있어도 앵커에서 제외 — 자손 1짜리 잡음 탈출구', () => {
    const noisy: AnchorEventLike = {
      id: 'hopper',
      hierarchy: node('hopper', [node('blackwell')]),
      anchorOverride: 'PLAIN',
    }
    expect(isAnchorEvent(noisy)).toBe(false)
    expect(getAnchorBadgeLabel(noisy)).toBeNull()
    // 앵커가 아니게 됐으므로 '단독'으로 물러난다 — 목록에서 사라지는 게 아니다.
    expect(isSoloRootEvent(noisy)).toBe(true)
  })

  it('null(미지정)은 파생 그대로 — 백필이 없다는 사실의 회귀 방어', () => {
    const auto: AnchorEventLike = {
      id: 'ww1',
      hierarchy: node('ww1', [node('sarajevo')]),
      anchorOverride: null,
    }
    expect(isAnchorEvent(auto)).toBe(true)
    expect(isEmptyAnchorEvent(auto)).toBe(false)
  })

  it('자손이 있는 ANCHOR는 빈 앵커가 아니다 — 위생 UI가 오작동하지 않게', () => {
    expect(
      isEmptyAnchorEvent({
        id: 'ww1',
        hierarchy: node('ww1', [node('sarajevo')]),
        anchorOverride: 'ANCHOR',
      }),
    ).toBe(false)
  })

  it("자손 0인 비루트 ANCHOR는 '하위 0건'이 아니라 '하위 예정'", () => {
    expect(
      getAnchorBadgeLabel({
        id: 'planned',
        parentEventId: 'ww1',
        hierarchy: node('planned'),
        anchorOverride: 'ANCHOR',
      }),
    ).toBe('하위 예정')
  })
})

describe('isSoloRootEvent', () => {
  it('자손 0인 루트만 단독이다', () => {
    expect(isSoloRootEvent(event('kiel-canal', node('kiel-canal')))).toBe(true)
  })

  it('자식 사건은 단독이 아니다 — 앵커의 단순 부정으로 쓰면 안 된다', () => {
    const child = event('sarajevo', node('sarajevo'), 'ww1')
    expect(isAnchorEvent(child)).toBe(false)
    expect(isSoloRootEvent(child)).toBe(false)
  })
})

describe('getAnchorBadgeLabel — 루트만 "최상위 사건"', () => {
  it('루트 앵커는 최상위 사건', () => {
    const ww1 = event('ww1', node('ww1', [node('sarajevo')]))
    expect(getAnchorBadgeLabel(ww1)).toBe('최상위 사건')
  })

  it('비루트 앵커는 자손 수로 표기 — "상위가 있는 최상위 사건" 자기모순 방지', () => {
    const loan = event(
      'loan',
      node('loan', [node('loan-1888'), node('loan-1891')]),
      'alliance',
    )
    expect(getAnchorBadgeLabel(loan)).toBe('하위 2건')
  })

  it('앵커가 아니면 배지 없음', () => {
    expect(getAnchorBadgeLabel(event('kiel-canal', node('kiel-canal')))).toBeNull()
  })
})

describe('getEventDescendantCount', () => {
  it('hierarchy가 없어도 터지지 않는다', () => {
    expect(getEventDescendantCount({ id: 'bare' })).toBe(0)
  })
})
