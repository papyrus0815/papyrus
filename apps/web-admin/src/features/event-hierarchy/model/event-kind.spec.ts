/**
 * 사건 종류 스펙 — 종류가 흔들리면 목록 배지·칩 모수·상세 화면 분기가 동시에 틀어진다.
 */
import {
  getCollectionBadgeLabel,
  getDescendantCount,
  getEventDescendantCount,
  isCollectionEvent,
  isEmptyCollectionEvent,
  isSoloRootEvent,
  type KindEventLike,
  type KindHierarchyNodeLike,
} from './event-kind'

const node = (id: string, children: KindHierarchyNodeLike[] = []): KindHierarchyNodeLike => ({
  id,
  children,
})

const event = (
  id: string,
  kind: KindEventLike['kind'],
  hierarchy: KindHierarchyNodeLike = node(id),
  parentEventId?: string,
): KindEventLike => ({ id, kind, parentEventId, hierarchy })

describe('getDescendantCount', () => {
  it('자식이 없거나 노드가 없으면 0', () => {
    expect(getDescendantCount(node('solo'))).toBe(0)
    expect(getDescendantCount({ id: 'no-children-key' })).toBe(0)
    expect(getDescendantCount(undefined)).toBe(0)
  })

  it('손자까지 재귀로 센다', () => {
    const tree = node('alliance', [node('loan', [node('loan-1888'), node('loan-1891')]), node('treaty')])
    expect(getDescendantCount(tree)).toBe(4)
  })

  it('순환이 있어도 유한하게 끝나고, 자기 자신을 자손으로 세지 않는다', () => {
    const parent: KindHierarchyNodeLike = { id: 'parent', children: [] }
    const child: KindHierarchyNodeLike = { id: 'child', children: [parent] }
    parent.children = [child]
    expect(getDescendantCount(parent)).toBe(1)
  })

  it('같은 사건이 두 갈래로 실려 와도 한 번만 센다', () => {
    const shared = node('shared')
    expect(getDescendantCount(node('root', [node('a', [shared]), node('b', [shared])]))).toBe(3)
  })
})

describe('isCollectionEvent — 저장된 종류가 정본(자손 수로 파생하지 않는다)', () => {
  it('묶음은 하위가 없어도 묶음이다', () => {
    expect(isCollectionEvent(event('war', 'COLLECTION'))).toBe(true)
  })

  it('단일은 (전환 전 잔여 데이터로) 하위가 실려 와도 묶음이 아니다', () => {
    expect(isCollectionEvent(event('battle', 'SINGLE', node('battle', [node('x')])))).toBe(false)
  })

  it('종류가 없으면(구 응답) 단일로 본다', () => {
    expect(isCollectionEvent(event('old', undefined))).toBe(false)
  })
})

describe('isEmptyCollectionEvent', () => {
  it('하위 0인 묶음만 빈 묶음', () => {
    expect(isEmptyCollectionEvent(event('war', 'COLLECTION'))).toBe(true)
    expect(isEmptyCollectionEvent(event('war', 'COLLECTION', node('war', [node('b')])))).toBe(false)
    expect(isEmptyCollectionEvent(event('battle', 'SINGLE'))).toBe(false)
  })
})

describe('isSoloRootEvent', () => {
  it('최상위 단일만 단독이다 — 하위 사건은 단독이 아니다', () => {
    expect(isSoloRootEvent(event('battle', 'SINGLE'))).toBe(true)
    expect(isSoloRootEvent(event('battle', 'SINGLE', node('battle'), 'war'))).toBe(false)
    expect(isSoloRootEvent(event('war', 'COLLECTION'))).toBe(false)
  })
})

describe('getCollectionBadgeLabel', () => {
  it('최상위 묶음은 "최상위 사건"', () => {
    expect(getCollectionBadgeLabel(event('ww1', 'COLLECTION'))).toBe('최상위 사건')
  })

  it('상위가 있는 묶음은 하위 수 — "상위가 있는 최상위 사건" 자기모순 방지', () => {
    expect(
      getCollectionBadgeLabel(event('front', 'COLLECTION', node('front', [node('a'), node('b')]), 'ww1')),
    ).toBe('하위 2건')
    expect(getCollectionBadgeLabel(event('front', 'COLLECTION', node('front'), 'ww1'))).toBe('묶음 사건')
  })

  it('단일은 배지 없음', () => {
    expect(getCollectionBadgeLabel(event('battle', 'SINGLE'))).toBeNull()
  })

  it('hierarchy가 없어도 터지지 않는다', () => {
    expect(getEventDescendantCount({ id: 'x' })).toBe(0)
  })
})
