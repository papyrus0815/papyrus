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

describe('buildOptimisticEvent — 추가 상위(extraParentEventIds) 낙관 재구성', () => {
  it('연속 추가 누적 — [P2] 다음 [P2,P3]가 정확히 반영(무성 유실 없음)', () => {
    const qc = qcWithCandidates([
      { id: 'P2', title: '냉전의 서막' },
      { id: 'P3', title: '전후 질서' },
    ])
    const base = makeEvent({
      parentEventId: 'P1',
      parentEvent: { id: 'P1', title: '제2차 세계대전' } as EventDetail,
    })
    const step1 = buildOptimisticEvent(
      base,
      { extraParentEventIds: ['P2'] } as unknown as Patch,
      qc,
    )
    expect((step1!.extraParents ?? []).map((extra) => extra.id)).toEqual(['P2'])
    expect(step1!.extraParents![0].title).toBe('냉전의 서막')
    // step1 캐시를 prev로 삼아 P3 추가 → [P2,P3] (P2가 누락되지 않음 + prev 재사용)
    const step2 = buildOptimisticEvent(
      step1!,
      { extraParentEventIds: ['P2', 'P3'] } as unknown as Patch,
      qc,
    )
    expect((step2!.extraParents ?? []).map((extra) => extra.id)).toEqual([
      'P2',
      'P3',
    ])
  })

  it('승격 swap cold-cache — 새 parentEvent는 extras에서, 옛 주 상위 제목은 extras로 보존', () => {
    // 승격은 모달 없는 칩 액션 — 후보 캐시가 비어 있는(cold) 것이 기본 상태.
    const qc = new QueryClient()
    const prev = makeEvent({
      parentEventId: 'P1',
      parentEvent: { id: 'P1', title: '제2차 세계대전' } as EventDetail,
      extraParents: [{ id: 'P2', title: '냉전의 서막' }],
    })
    const next = buildOptimisticEvent(
      prev,
      {
        parentEventId: 'P2',
        extraParentEventIds: ['P1'],
      } as unknown as Patch,
      qc,
    )
    // 새 주 상위: prev.extraParents에서 제목 승계(id 불일치 prevParent 폴백 금지)
    expect(next!.parentEvent?.id).toBe('P2')
    expect(next!.parentEvent?.title).toBe('냉전의 서막')
    // 강등된 옛 주 상위: 생존 객체(prev.parentEvent)에서 제목 승계
    expect(next!.extraParents).toEqual([
      { id: 'P1', title: '제2차 세계대전' },
    ])
  })

  it('스칼라 경유 승격(a-2 거울) — parent만 기존 엣지로 이동해도 그 엣지는 낙관 제거', () => {
    const prev = makeEvent({
      parentEventId: 'P1',
      parentEvent: { id: 'P1', title: '주' } as EventDetail,
      extraParents: [
        { id: 'P2', title: '엣지2' },
        { id: 'P3', title: '엣지3' },
      ],
    })
    const next = buildOptimisticEvent(
      prev,
      { parentEventId: 'P2' } as unknown as Patch,
      new QueryClient(),
    )
    expect(next!.parentEvent?.title).toBe('엣지2')
    expect((next!.extraParents ?? []).map((extra) => extra.id)).toEqual(['P3'])
  })

  it('extras-only patch도 낙관 분기가 존재한다(next ≠ null) — 전부 해제 포함', () => {
    const prev = makeEvent({
      parentEventId: 'P1',
      parentEvent: { id: 'P1', title: '주' } as EventDetail,
      extraParents: [{ id: 'P2', title: '엣지' }],
    })
    const next = buildOptimisticEvent(
      prev,
      { extraParentEventIds: [] } as unknown as Patch,
      new QueryClient(),
    )
    expect(next).not.toBeNull()
    expect(next!.extraParents).toEqual([])
  })
})

describe('buildOptimisticEvent — 연결 사유(parentLinkReasons·childLinkReasons) 낙관 반영', () => {
  it('parentLinkReasons: 주 상위 쌍이면 parentLinkReason, 추가 상위면 그 칩 reason 갱신', () => {
    const prev = makeEvent({
      parentEventId: 'P1',
      parentEvent: { id: 'P1', title: '주' } as EventDetail,
      extraParents: [{ id: 'P2', title: '추가' }],
    })
    const nextPrimary = buildOptimisticEvent(
      prev,
      { parentLinkReasons: [{ parentEventId: 'P1', reason: '대표 사유' }] } as unknown as Patch,
      new QueryClient(),
    )
    expect(nextPrimary!.parentLinkReason).toBe('대표 사유')

    const nextExtra = buildOptimisticEvent(
      prev,
      { parentLinkReasons: [{ parentEventId: 'P2', reason: '추가 사유' }] } as unknown as Patch,
      new QueryClient(),
    )
    expect(nextExtra!.extraParents).toEqual([
      { id: 'P2', title: '추가', reason: '추가 사유' },
    ])
  })

  it('빈 문자열 사유는 낙관적으로 null(삭제) 반영', () => {
    const prev = makeEvent({
      parentEventId: 'P1',
      parentEvent: { id: 'P1', title: '주' } as EventDetail,
      parentLinkReason: '옛 사유',
    })
    const next = buildOptimisticEvent(
      prev,
      { parentLinkReasons: [{ parentEventId: 'P1', reason: '   ' }] } as unknown as Patch,
      new QueryClient(),
    )
    expect(next!.parentLinkReason).toBeNull()
  })

  it('childLinkReasons: 해당 하위 카드의 reason만 갱신', () => {
    const prev = makeEvent({
      childEvents: [
        { id: 'C1', title: '자식1' },
        { id: 'C2', title: '자식2' },
      ] as EventDetail[],
    })
    const next = buildOptimisticEvent(
      prev,
      { childLinkReasons: [{ childEventId: 'C2', reason: '자식2 사유' }] } as unknown as Patch,
      new QueryClient(),
    )
    expect(next!.childEvents!.find((child) => child.id === 'C1')?.reason).toBeUndefined()
    expect(next!.childEvents!.find((child) => child.id === 'C2')?.reason).toBe('자식2 사유')
  })
})
