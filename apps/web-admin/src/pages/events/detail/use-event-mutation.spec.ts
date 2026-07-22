/**
 * buildOptimisticEvent 단위 테스트 — 계층(childEventIds·parentEventId) 낙관 재구성.
 * P2-1(하위 다중선택 무성유실)·P3-8(상위 지정/해제 지연)의 핵심 로직: 캐시(childEvents/
 * parentEvent)가 즉시 전진해야 childIds/selectedValues가 stale해지지 않는다.
 */
import { QueryClient } from '@tanstack/react-query'

// @/shared/api/events는 api.service(import.meta.env, Vite 전용)를 끌어와 jest에서 로드 불가 —
// 런타임 export만 목킹해 모듈 그래프를 끊는다(테스트는 순수 함수 buildOptimisticEvent만 검증).
jest.mock('@/shared/api/events', () => ({
  updateEvent: jest.fn(),
  getEventById: jest.fn(),
}))

import { buildOptimisticEvent } from './use-event-mutation'
import { type EventDetail } from './use-event-detail'

type Patch = Parameters<typeof buildOptimisticEvent>[1]
/** 상위 해제는 런타임에 parentEventId:null을 보낸다(DTO 타입은 string이라 실코드도 캐스트). */
const detachParentPatch = { parentEventId: null } as unknown as Patch

function makeEvent(overrides: Partial<EventDetail> = {}): EventDetail {
  return {
    id: 'E',
    title: '루트 사건',
    childEvents: [],
    ...overrides,
  } as EventDetail
}

function qcWithCandidates(
  candidates: Array<Record<string, unknown>>,
  term = 'x',
): QueryClient {
  const client = new QueryClient()
  client.setQueryData(['events', 'link-candidates', term], candidates)
  return client
}

describe('buildOptimisticEvent — 하위 사건(childEventIds) 낙관 재구성', () => {
  it('유지되는 자식은 prev 객체 재사용, 신규 자식은 후보 캐시로 stub 생성', () => {
    const prev = makeEvent({
      childEvents: [
        { id: 'A', title: '자식 A', category: { id: 'c1', name: '정치' } },
      ] as EventDetail[],
    })
    const qc = qcWithCandidates([
      { id: 'B', title: '베타 사건', startDate: '0100-03-15', startDatePrecision: 'day' },
    ])

    const next = buildOptimisticEvent(prev, { childEventIds: ['A', 'B'] }, qc)

    expect(next).not.toBeNull()
    const ids = (next!.childEvents ?? []).map((child) => child.id)
    expect(ids).toEqual(['A', 'B'])
    // A는 prev의 완전한 객체(카테고리 포함) 재사용
    expect(next!.childEvents![0].category?.name).toBe('정치')
    // B는 후보에서 제목·날짜 보강한 stub
    expect(next!.childEvents![1].title).toBe('베타 사건')
    expect(next!.childEvents![1].startDate).toBe('0100-03-15')
  })

  it('연속 다중선택 누적 — [A] 다음 [A,B]가 정확히 반영(무성 유실 없음)', () => {
    const qc = qcWithCandidates([
      { id: 'A', title: '알파' },
      { id: 'B', title: '베타' },
    ])
    const step1 = buildOptimisticEvent(makeEvent(), { childEventIds: ['A'] }, qc)
    expect((step1!.childEvents ?? []).map((child) => child.id)).toEqual(['A'])
    // step1 캐시를 prev로 삼아 B 추가 → [A,B] (A가 누락되지 않음)
    const step2 = buildOptimisticEvent(step1!, { childEventIds: ['A', 'B'] }, qc)
    expect((step2!.childEvents ?? []).map((child) => child.id)).toEqual(['A', 'B'])
  })

  it('제거 — childEventIds에서 빠진 자식은 사라진다', () => {
    const prev = makeEvent({
      childEvents: [
        { id: 'A', title: 'A' },
        { id: 'B', title: 'B' },
      ] as EventDetail[],
    })
    const next = buildOptimisticEvent(prev, { childEventIds: ['A'] }, new QueryClient())
    expect((next!.childEvents ?? []).map((child) => child.id)).toEqual(['A'])
  })

  it('BC 후보는 startEra/startYear로 음수연도 ISO를 합성', () => {
    const qc = qcWithCandidates([
      { id: 'B', title: '카이사르 암살', startDate: null, startEra: 'BC', startYear: 44 },
    ])
    const next = buildOptimisticEvent(makeEvent(), { childEventIds: ['B'] }, qc)
    expect(next!.childEvents![0].startDate).toBe('-0044-01-01')
  })
})

describe('buildOptimisticEvent — 상위 사건(parentEventId) 낙관 재구성', () => {
  it('지정 시 parentEventId + parentEvent stub을 즉시 반영', () => {
    const qc = qcWithCandidates([{ id: 'P', title: '상위 사건' }])
    const next = buildOptimisticEvent(makeEvent(), { parentEventId: 'P' }, qc)
    expect(next!.parentEventId).toBe('P')
    expect(next!.parentEvent?.id).toBe('P')
    expect(next!.parentEvent?.title).toBe('상위 사건')
  })

  it('해제(null) 시 parentEvent를 즉시 비운다', () => {
    const prev = makeEvent({
      parentEventId: 'P',
      parentEvent: { id: 'P', title: '상위' } as EventDetail,
    })
    const next = buildOptimisticEvent(prev, detachParentPatch, new QueryClient())
    expect(next!.parentEventId).toBeNull()
    expect(next!.parentEvent).toBeUndefined()
  })
})
