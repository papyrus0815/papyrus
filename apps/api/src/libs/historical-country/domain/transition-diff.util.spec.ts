import { computeTransitionSuccessorDiff } from './transition-diff.util'

describe('computeTransitionSuccessorDiff (F11 계승 diff)', () => {
  it('변경 없음: desired == existing이면 삭제·추가 모두 없음(기존 행 보존)', () => {
    const existing = [
      { id: 't1', successorId: 'A' },
      { id: 't2', successorId: 'B' },
    ]
    expect(computeTransitionSuccessorDiff(existing, ['A', 'B'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: [],
    })
  })

  it('순서만 다르고 집합이 같으면 no-op (평탄화·id 재발급 방지)', () => {
    const existing = [
      { id: 't1', successorId: 'A' },
      { id: 't2', successorId: 'B' },
    ]
    expect(computeTransitionSuccessorDiff(existing, ['B', 'A'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: [],
    })
  })

  it('추가만: 새 후임만 successorIdsToAdd에, 기존은 삭제되지 않음', () => {
    const existing = [{ id: 't1', successorId: 'A' }]
    expect(computeTransitionSuccessorDiff(existing, ['A', 'B', 'C'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: ['B', 'C'],
    })
  })

  it('삭제만: 빠진 후임의 transition id만 삭제 대상', () => {
    const existing = [
      { id: 't1', successorId: 'A' },
      { id: 't2', successorId: 'B' },
      { id: 't3', successorId: 'C' },
    ]
    expect(computeTransitionSuccessorDiff(existing, ['B'])).toEqual({
      transitionIdsToDelete: ['t1', 't3'],
      successorIdsToAdd: [],
    })
  })

  it('혼합: 일부 삭제 + 일부 추가, 남는 행은 건드리지 않음', () => {
    const existing = [
      { id: 't1', successorId: 'A' },
      { id: 't2', successorId: 'B' },
    ]
    // A 유지, B 삭제, C 추가
    expect(computeTransitionSuccessorDiff(existing, ['A', 'C'])).toEqual({
      transitionIdsToDelete: ['t2'],
      successorIdsToAdd: ['C'],
    })
  })

  it('전체 해제: desired가 빈 배열이면 모두 삭제', () => {
    const existing = [
      { id: 't1', successorId: 'A' },
      { id: 't2', successorId: 'B' },
    ]
    expect(computeTransitionSuccessorDiff(existing, [])).toEqual({
      transitionIdsToDelete: ['t1', 't2'],
      successorIdsToAdd: [],
    })
  })

  it('최초 저작: existing이 비었으면 desired 전부 추가', () => {
    expect(computeTransitionSuccessorDiff([], ['A', 'B'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: ['A', 'B'],
    })
  })

  it('desired 중복은 제거하고 추가는 한 번만(브리지 unique 부재 방어)', () => {
    expect(computeTransitionSuccessorDiff([], ['A', 'A', 'B'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: ['A', 'B'],
    })
  })

  it('이미 존재하는 후임이 desired에 중복으로 와도 추가하지 않음', () => {
    const existing = [{ id: 't1', successorId: 'A' }]
    expect(computeTransitionSuccessorDiff(existing, ['A', 'A'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: [],
    })
  })
})
