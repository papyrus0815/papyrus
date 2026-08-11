import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'

import { EventService } from './event.service'

/**
 * 사건 다중 상위(EventParentLink) 가드 매트릭스 특성화 —
 * docs/event-multi-parent-review.md §4.2(W1~W5)·§4.4(오버레이 BFS)·§4.5·§4.6의
 * 확정 규칙을 못 박는다:
 *  - INV-1 주 상위 중복 금지 · INV-2 주 상위 필수 · INV-3 자기참조 금지
 *  - W2 스칼라 경유 승격 collapse · 해제 409 · 전체 해제 원자 patch(clearAll)
 *  - W3 detach 409(몰래 승격 금지) · attach collapse
 *  - W4 create 배선(extras 영속화·주 상위 부재 409·생성 즉시 순환)
 *  - W5 하드삭제 최소 엣지 승격
 *  - 순환: 엣지 경유 간접 순환 검출 · fail-closed 캡 409
 */

interface FakeEventRow {
  id: string
  title: string
  parentEventId: string | null
  createdById: string
  deletedAt: Date | null
}

interface FakeEdgeRow {
  id: string
  childEventId: string
  parentEventId: string
  createdAt: Date
}

interface FakeReasonRow {
  childEventId: string
  parentEventId: string
  reason: string
}

function matchScalarOrOps(value: string | null, cond: unknown): boolean {
  if (cond === undefined) return true
  if (cond === null || typeof cond === 'string') return value === cond
  const ops = cond as { in?: string[]; notIn?: string[]; not?: string }
  if (ops.in) return value !== null && ops.in.includes(value)
  if (ops.notIn) return value === null || !ops.notIn.includes(value)
  if (ops.not !== undefined) return value !== ops.not
  return true
}

/**
 * 스펙 전용 최소 fake — 서비스가 실제로 쓰는 where 형태만 해석한다.
 * $transaction(interactive)은 자기 자신을 tx로 넘겨 쓰기 호출을 그대로 기록한다.
 */
function buildFakePrisma(
  events: FakeEventRow[],
  edges: FakeEdgeRow[],
  reasons: FakeReasonRow[] = [],
) {
  const eventById = new Map(events.map((row) => [row.id, row]))

  const filterEvents = (where: Record<string, unknown>) =>
    events.filter(
      (row) =>
        matchScalarOrOps(row.id, where.id) &&
        matchScalarOrOps(row.parentEventId, where.parentEventId) &&
        (where.deletedAt === undefined || row.deletedAt === where.deletedAt),
    )

  const filterEdges = (where: Record<string, unknown>) =>
    edges.filter((edge) => {
      if (!matchScalarOrOps(edge.childEventId, where.childEventId)) return false
      if (!matchScalarOrOps(edge.parentEventId, where.parentEventId)) return false
      const parentGate = where.parentEvent as
        | { deletedAt: Date | null }
        | undefined
      if (parentGate !== undefined) {
        const parentRow = eventById.get(edge.parentEventId)
        if ((parentRow?.deletedAt ?? null) !== parentGate.deletedAt) return false
      }
      return true
    })

  const withParentRelation = (edge: FakeEdgeRow) => ({
    ...edge,
    parentEvent: { deletedAt: eventById.get(edge.parentEventId)?.deletedAt ?? null },
  })

  const fake = {
    event: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(eventById.get(where.id) ?? null),
      ),
      findMany: jest.fn(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(filterEvents(where)),
      ),
      updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
      update: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(eventById.get(where.id)),
      ),
    },
    eventParentLink: {
      findMany: jest.fn(
        ({
          where,
          orderBy,
        }: {
          where: Record<string, unknown>
          orderBy?: unknown
        }) => {
          let rows = filterEdges(where)
          if (orderBy) {
            rows = [...rows].sort(
              (left, right) =>
                left.createdAt.getTime() - right.createdAt.getTime() ||
                left.id.localeCompare(right.id),
            )
          }
          return Promise.resolve(rows.map(withParentRelation))
        },
      ),
      findFirst: jest.fn(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(filterEdges(where)[0] ?? null),
      ),
      deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
      createMany: jest.fn(() => Promise.resolve({ count: 0 })),
      delete: jest.fn(() => Promise.resolve()),
    },
    eventHierarchyReason: {
      findMany: jest.fn(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(
          reasons.filter(
            (row) =>
              matchScalarOrOps(row.childEventId, where.childEventId) &&
              matchScalarOrOps(row.parentEventId, where.parentEventId),
          ),
        ),
      ),
      deleteMany: jest.fn(
        ({ where }: { where: { childEventId: string; parentEventId: string } }) => {
          let count = 0
          for (let idx = reasons.length - 1; idx >= 0; idx -= 1) {
            if (
              reasons[idx].childEventId === where.childEventId &&
              reasons[idx].parentEventId === where.parentEventId
            ) {
              reasons.splice(idx, 1)
              count += 1
            }
          }
          return Promise.resolve({ count })
        },
      ),
      create: jest.fn(
        ({ data }: { data: FakeReasonRow }) => {
          reasons.push({
            childEventId: data.childEventId,
            parentEventId: data.parentEventId,
            reason: data.reason,
          })
          return Promise.resolve(data)
        },
      ),
    },
    $transaction: jest.fn(),
  }
  // 자기참조(tx=자기 자신) 배선은 객체 생성 후에 — TS7022(순환 추론) 회피
  fake.$transaction.mockImplementation((...args: unknown[]) => {
    const arg = args[0] as
      | Array<Promise<unknown>>
      | ((tx: unknown) => Promise<unknown>)
    return typeof arg === 'function' ? arg(fake) : Promise.all(arg)
  })
  return fake
}

function buildService(
  events: FakeEventRow[],
  edges: FakeEdgeRow[],
  options: { createdId?: string; reasons?: FakeReasonRow[] } = {},
) {
  const reasons = options.reasons ?? []
  const fakePrisma = buildFakePrisma(events, edges, reasons)
  const eventById = new Map(events.map((row) => [row.id, row]))
  const fakeRepo = {
    findById: jest.fn((id: string) => Promise.resolve(eventById.get(id) ?? null)),
    findByTitle: jest.fn(() => Promise.resolve(null)),
    create: jest.fn((data: Record<string, unknown>) =>
      Promise.resolve({
        id: options.createdId ?? 'E-new',
        title: data.title,
        startEra: null,
        startYear: null,
        ...data,
      }),
    ),
    update: jest.fn((id: string, data: Record<string, unknown>) =>
      Promise.resolve({ ...(eventById.get(id) ?? {}), ...data, id }),
    ),
    delete: jest.fn(() => Promise.resolve()),
    findAll: jest.fn(),
    findByParentEventId: jest.fn(),
  }
  const fakePoint = {
    awardForCreate: jest.fn(() => Promise.resolve()),
    revokeForRecord: jest.fn(() => Promise.resolve()),
    restoreForRecord: jest.fn(() => Promise.resolve()),
  }
  const fakeNotification = { notifyEvent: jest.fn(() => Promise.resolve()) }
  const service = new EventService(
    fakeRepo as never,
    fakePrisma as never,
    fakePoint as never,
    fakeNotification as never,
  )
  return { service, fakePrisma, fakeRepo, reasons }
}

/** updateEvent 포지셔널 인자 헬퍼 — 계층 관련 인자만 노출 */
function updateHierarchy(
  service: EventService,
  id: string,
  patch: {
    parentEventId?: string | null
    childEventIds?: string[]
    extraParentEventIds?: string[]
  },
) {
  return service.updateEvent(
    id,
    patch.parentEventId === undefined ? {} : { parentEventId: patch.parentEventId },
    undefined,
    undefined,
    undefined,
    undefined,
    patch.childEventIds,
    undefined,
    undefined,
    undefined,
    patch.extraParentEventIds,
  )
}

const OWNER = 'account-1'

function liveEvent(id: string, parentEventId: string | null = null): FakeEventRow {
  return { id, title: `사건 ${id}`, parentEventId, createdById: OWNER, deletedAt: null }
}

function deletedEvent(id: string, parentEventId: string | null = null): FakeEventRow {
  return {
    id,
    title: `사건 ${id}`,
    parentEventId,
    createdById: OWNER,
    deletedAt: new Date('2026-01-01T00:00:00Z'),
  }
}

function edge(
  childEventId: string,
  parentEventId: string,
  createdAtIso = '2026-01-01T00:00:00Z',
): FakeEdgeRow {
  return {
    id: `link-${childEventId}-${parentEventId}`,
    childEventId,
    parentEventId,
    createdAt: new Date(createdAtIso),
  }
}

describe('EventService 다중 상위 가드 (W1~W5·BFS)', () => {
  test('W1 (b-추가): 주 상위 없는 사건에 추가 상위 → 409 INV-2', async () => {
    const { service } = buildService([liveEvent('E'), liveEvent('P2')], [])
    await expect(
      updateHierarchy(service, 'E', { extraParentEventIds: ['P2'] }),
    ).rejects.toThrow(/주 상위가 없는 사건에는/)
  })

  test('W1 (a-1): 추가 상위가 주 상위와 중복 → 409 INV-1', async () => {
    const { service } = buildService([liveEvent('E', 'P1'), liveEvent('P1')], [])
    await expect(
      updateHierarchy(service, 'E', { extraParentEventIds: ['P1'] }),
    ).rejects.toThrow(/이미 대표 상위 사건입니다/)
  })

  test('W1 (INV-3): 자기 자신을 추가 상위로 → 409', async () => {
    const { service } = buildService([liveEvent('E', 'P1'), liveEvent('P1')], [])
    await expect(
      updateHierarchy(service, 'E', { extraParentEventIds: ['E'] }),
    ).rejects.toThrow(/자기 자신을 추가 상위로/)
  })

  test('W1 유령: 주 상위 소프트삭제 상태에서 신규 추가 상위 → 409', async () => {
    const { service } = buildService(
      [liveEvent('E', 'P-ghost'), deletedEvent('P-ghost'), liveEvent('X')],
      [],
    )
    await expect(
      updateHierarchy(service, 'E', { extraParentEventIds: ['X'] }),
    ).rejects.toThrow(/현재 상위 사건이 삭제 상태입니다/)
  })

  test('W1 유령: 기존 엣지 재전송은 통과 — diff가 skipDuplicates로 유지', async () => {
    const { service, fakePrisma } = buildService(
      [liveEvent('E', 'P-ghost'), deletedEvent('P-ghost'), liveEvent('X')],
      [edge('E', 'X')],
    )
    await updateHierarchy(service, 'E', { extraParentEventIds: ['X'] })
    expect(fakePrisma.eventParentLink.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    )
  })

  test('W1 소프트삭제 부모 엣지 보존: diff 삭제는 살아있는 부모 게이트를 단다', async () => {
    const { service, fakePrisma } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1'), liveEvent('X'), deletedEvent('G')],
      [edge('E', 'G')], // 유령 엣지 — 응답에서 걸러져 재전송 목록에 없다
    )
    await updateHierarchy(service, 'E', { extraParentEventIds: ['X'] })
    expect(fakePrisma.eventParentLink.deleteMany).toHaveBeenCalledWith({
      where: {
        childEventId: 'E',
        parentEventId: { notIn: ['X'] },
        parentEvent: { deletedAt: null },
      },
    })
  })

  test('W2 (b-해제): 살아있는 추가 상위가 있는 주 상위 해제 → 409', async () => {
    const { service } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1'), liveEvent('P2')],
      [edge('E', 'P2')],
    )
    await expect(
      updateHierarchy(service, 'E', { parentEventId: null }),
    ).rejects.toThrow(/추가 상위 1개가 연결되어 있어/)
  })

  test('W2 전체 해제 원자 patch(parent null + extras []) → clearAll(유령 엣지 포함)', async () => {
    const { service, fakePrisma, fakeRepo } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1'), deletedEvent('G')],
      [edge('E', 'G')],
    )
    await updateHierarchy(service, 'E', {
      parentEventId: null,
      extraParentEventIds: [],
    })
    expect(fakePrisma.eventParentLink.deleteMany).toHaveBeenCalledWith({
      where: { childEventId: 'E' },
    })
    // 본체 update가 같은 tx로 들어간다(원자화)
    expect(fakeRepo.update).toHaveBeenCalledWith(
      'E',
      expect.objectContaining({ parentEventId: null }),
      fakePrisma,
    )
  })

  test('W2 (a-2): 스칼라 경유 승격 — 새 주 상위와 겹친 엣지 자동 collapse', async () => {
    const { service, fakePrisma, fakeRepo } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1'), liveEvent('P2'), liveEvent('P3')],
      [edge('E', 'P2'), edge('E', 'P3')],
    )
    await updateHierarchy(service, 'E', { parentEventId: 'P2' })
    // P2 엣지는 collapse(=finalExtras에서 제외), P3 엣지는 유지
    expect(fakePrisma.eventParentLink.deleteMany).toHaveBeenCalledWith({
      where: {
        childEventId: 'E',
        parentEventId: { notIn: ['P3'] },
        parentEvent: { deletedAt: null },
      },
    })
    expect(fakeRepo.update).toHaveBeenCalledWith(
      'E',
      expect.objectContaining({ parentEventId: 'P2' }),
      fakePrisma,
    )
  })

  test('W3 detach 409: 분리 예정 자식이 엣지 보유 → 409(제목 동봉)', async () => {
    const { service } = buildService(
      [liveEvent('E'), liveEvent('C1', 'E'), liveEvent('X', null)],
      [edge('C1', 'X')],
    )
    await expect(
      updateHierarchy(service, 'E', { childEventIds: [] }),
    ).rejects.toThrow(/'사건 C1'에 추가 상위가 연결되어 있어/)
  })

  test('W6: 유령 엣지만 가진 자식은 detach 통과 — 루트 승격 + 잔존 유령 엣지 정리', async () => {
    const { service, fakePrisma } = buildService(
      [liveEvent('E'), liveEvent('C1', 'E'), deletedEvent('G')],
      [edge('C1', 'G')], // 사용자에게 보이지 않는 유령 엣지 — 차단 사유가 아니다
    )
    await updateHierarchy(service, 'E', { childEventIds: [] })
    expect(fakePrisma.event.updateMany).toHaveBeenCalledWith({
      where: { parentEventId: 'E', deletedAt: null },
      data: { parentEventId: null },
    })
    // INV-2: 루트 승격된 분리 자식의 잔존 유령 엣지는 같은 tx에서 삭제(자식측 clearAll 거울)
    expect(fakePrisma.eventParentLink.deleteMany).toHaveBeenCalledWith({
      where: { childEventId: { in: ['C1'] } },
    })
  })

  test('W3 attach collapse: 새로 붙는 자식의 기존(이 사건→) 엣지 자동 제거', async () => {
    const { service, fakePrisma } = buildService(
      [liveEvent('E'), liveEvent('C2', null)],
      [edge('C2', 'E')], // C2는 E를 '추가 상위'로 갖고 있었다
    )
    await updateHierarchy(service, 'E', { childEventIds: ['C2'] })
    expect(fakePrisma.eventParentLink.deleteMany).toHaveBeenCalledWith({
      where: { childEventId: { in: ['C2'] }, parentEventId: 'E' },
    })
  })

  test('순환(엣지 경유): 자식을 추가 상위로 연결 → 409 경로 제목 동봉', async () => {
    const { service } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1'), liveEvent('D', 'E')],
      [],
    )
    await expect(
      updateHierarchy(service, 'E', { extraParentEventIds: ['D'] }),
    ).rejects.toThrow(/순환 계층은 만들 수 없습니다: '사건 D'/)
  })

  test('순환 fail-closed: 깊이 캡 초과 → 409 검사 미완(통과 금지)', async () => {
    const chain: FakeEventRow[] = [liveEvent('E')]
    for (let index = 0; index <= 60; index += 1) {
      chain.push(liveEvent(`N${index}`, index === 60 ? null : `N${index + 1}`))
    }
    const { service } = buildService(chain, [])
    await expect(
      updateHierarchy(service, 'E', { parentEventId: 'N0' }),
    ).rejects.toThrow(/계층이 너무 깊어 순환 검사를 완료할 수 없습니다/)
  })

  test('유령 승격 금지: 소프트삭제 사건을 새 주 상위로 → 404(엣지 보유해도)', async () => {
    const { service } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1'), deletedEvent('G')],
      [edge('E', 'G')],
    )
    await expect(
      updateHierarchy(service, 'E', { parentEventId: 'G' }),
    ).rejects.toThrow(NotFoundException)
  })

  test('W4 create: 주 상위 없이 extras → 409, 주 상위와 함께면 엣지 영속화', async () => {
    const events = [liveEvent('P1'), liveEvent('X')]
    {
      const { service } = buildService(events, [])
      await expect(
        service.createEvent(
          { title: '새 사건', createdById: OWNER } as never,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          ['X'],
        ),
      ).rejects.toThrow(/주 상위가 없는 사건에는/)
    }
    {
      const { service, fakePrisma } = buildService(events, [])
      await service.createEvent(
        { title: '새 사건', createdById: OWNER, parentEventId: 'P1' } as never,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['X'],
      )
      expect(fakePrisma.eventParentLink.createMany).toHaveBeenCalledWith({
        data: [{ childEventId: 'E-new', parentEventId: 'X' }],
        skipDuplicates: true,
      })
    }
  })

  test('W4 create 순환: 새 부모가 이번에 붙는 자식의 자손 → 409(기존 잠복 구멍 봉합)', async () => {
    const { service } = buildService(
      [liveEvent('C'), liveEvent('P', 'C')], // P는 C의 자식(=자손)
      [],
    )
    await expect(
      service.createEvent(
        { title: '새 사건', createdById: OWNER, parentEventId: 'P' } as never,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['C'],
        undefined,
        undefined,
        undefined,
      ),
    ).rejects.toThrow(ConflictException)
  })

  test('W5 하드삭제: 엣지 보유 자식은 최소 엣지(createdAt asc) 승격 후 본체 삭제', async () => {
    const { service, fakePrisma, fakeRepo } = buildService(
      [
        deletedEvent('E'),
        liveEvent('C', 'E'),
        liveEvent('X'),
        liveEvent('Y'),
      ],
      [
        edge('C', 'Y', '2026-02-01T00:00:00Z'),
        edge('C', 'X', '2026-01-01T00:00:00Z'), // 더 오래된 엣지 — 승격 대상
      ],
    )
    await service.permanentlyDeleteEvent('E', OWNER)
    expect(fakePrisma.event.update).toHaveBeenCalledWith({
      where: { id: 'C' },
      data: { parentEventId: 'X' },
    })
    expect(fakePrisma.eventParentLink.delete).toHaveBeenCalledWith({
      where: { id: 'link-C-X' },
    })
    expect(fakeRepo.delete).toHaveBeenCalledWith('E', fakePrisma)
  })

  test('무관 편집 무간섭: 계층 키 없는 patch는 가드·tx를 타지 않는다', async () => {
    const { service, fakePrisma, fakeRepo } = buildService(
      [liveEvent('E', null)],
      [edge('E', 'orphan-parent')], // 고아 엣지가 있어도(INV-2 위반 데이터) 잠그지 않는다
    )
    await service.updateEvent('E', { location: '빈' } as never)
    expect(fakePrisma.$transaction).not.toHaveBeenCalled()
    expect(fakeRepo.update).toHaveBeenCalledWith(
      'E',
      expect.objectContaining({ location: '빈' }),
    )
  })
})

describe('EventService 삭제 경로 자식 승격 (HIER-W2)', () => {
  test('소프트삭제: 유령(소프트삭제 부모) 엣지는 승격 제외 — 루트 승격 + 잔존 엣지 정리', async () => {
    // C의 주 상위 A(삭제 대상), 유령 엣지 B(소프트삭제). B로 승격하면 C가 전 뷰 소실(P1-6).
    const { service, fakePrisma } = buildService(
      [liveEvent('A'), liveEvent('C', 'A'), deletedEvent('B')],
      [edge('C', 'B')],
    )
    await service.deleteEvent('A', OWNER)
    // 유령 엣지 승격(event.update) 없이 루트로
    expect(fakePrisma.event.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['C'] } },
      data: { parentEventId: null },
    })
    // INV-2: 루트 승격된 자식의 잔존 유령 엣지 삭제(clearAll/V1-7 거울)
    expect(fakePrisma.eventParentLink.deleteMany).toHaveBeenCalledWith({
      where: { childEventId: { in: ['C'] } },
    })
    expect(fakePrisma.eventParentLink.delete).not.toHaveBeenCalled()
  })

  test('하드삭제: 유령 엣지 승격 제외 — 잔존 엣지 정리 후 본체 삭제', async () => {
    const { service, fakePrisma, fakeRepo } = buildService(
      [deletedEvent('E'), liveEvent('C', 'E'), deletedEvent('G')],
      [edge('C', 'G')],
    )
    await service.permanentlyDeleteEvent('E', OWNER)
    // 승격(event.update) 없음 — C는 본체 delete의 SetNull로 루트가 된다
    expect(fakePrisma.event.update).not.toHaveBeenCalled()
    expect(fakePrisma.eventParentLink.deleteMany).toHaveBeenCalledWith({
      where: { childEventId: { in: ['C'] } },
    })
    expect(fakeRepo.delete).toHaveBeenCalledWith('E', fakePrisma)
  })
})

/** updateEvent 포지셔널 인자 헬퍼 — 연결 사유(+선택적 계층) 인자 노출 */
function updateReasons(
  service: EventService,
  id: string,
  patch: {
    parentEventId?: string | null
    childEventIds?: string[]
    extraParentEventIds?: string[]
    parentLinkReasons?: Array<{ parentEventId: string; reason: string | null }>
    childLinkReasons?: Array<{ childEventId: string; reason: string | null }>
  },
) {
  return service.updateEvent(
    id,
    patch.parentEventId === undefined ? {} : { parentEventId: patch.parentEventId },
    undefined,
    undefined,
    undefined,
    undefined,
    patch.childEventIds,
    undefined,
    undefined,
    undefined,
    patch.extraParentEventIds,
    patch.parentLinkReasons,
    patch.childLinkReasons,
  )
}

describe('EventService 연결 사유(EventHierarchyReason)', () => {
  test('reason-only: 주 상위 쌍에 업서트 → 행 생성, 계층 쓰기 미실행', async () => {
    const reasons: FakeReasonRow[] = []
    const { service, fakePrisma } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1')],
      [],
      { reasons },
    )
    await updateReasons(service, 'E', {
      parentLinkReasons: [{ parentEventId: 'P1', reason: '  병합의 직접적 계기  ' }],
    })
    // trim 후 저장(공백 정규화)
    expect(reasons).toEqual([
      { childEventId: 'E', parentEventId: 'P1', reason: '병합의 직접적 계기' },
    ])
    // reason-only는 hierarchyTouched 게이트를 태우지 않는다 — 자식 재부모화(event.updateMany)·
    // 엣지 쓰기(eventParentLink.createMany/deleteMany)가 전무. (사유 검증용 findUnique·
    // findMany 로드는 정상.)
    expect(fakePrisma.event.updateMany).not.toHaveBeenCalled()
    expect(fakePrisma.eventParentLink.createMany).not.toHaveBeenCalled()
    expect(fakePrisma.eventParentLink.deleteMany).not.toHaveBeenCalled()
  })

  test('reason 업서트: 연결 안 된 상위 → 400', async () => {
    const { service } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1'), liveEvent('P2')],
      [],
    )
    await expect(
      updateReasons(service, 'E', {
        parentLinkReasons: [{ parentEventId: 'P2', reason: '무관 상위' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  test('빈 사유는 행 삭제(비우기) — 링크 상태 무관 허용', async () => {
    const reasons: FakeReasonRow[] = [
      { childEventId: 'E', parentEventId: 'P1', reason: '옛 사유' },
    ]
    const { service } = buildService([liveEvent('E', 'P1'), liveEvent('P1')], [], {
      reasons,
    })
    await updateReasons(service, 'E', {
      parentLinkReasons: [{ parentEventId: 'P1', reason: '   ' }],
    })
    expect(reasons).toHaveLength(0)
  })

  test('같은 상위 중복 제출 → 400', async () => {
    const { service } = buildService([liveEvent('E', 'P1'), liveEvent('P1')], [])
    await expect(
      updateReasons(service, 'E', {
        parentLinkReasons: [
          { parentEventId: 'P1', reason: '첫째' },
          { parentEventId: 'P1', reason: '둘째' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  test('HIER-W1: 사유+승격 동시 patch — 새 주 상위 쌍 사유가 effective 기준으로 통과', async () => {
    // 본체 update(주 상위 FK)는 사유 적용 뒤에 실행되므로, DB 재조회면 구 상위만 유효해
    // 400 롤백이던 결함 — effective 값(제출값) 기준으로 통과해야 한다.
    const reasons: FakeReasonRow[] = []
    const { service } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1'), liveEvent('P2')],
      [],
      { reasons },
    )
    await updateReasons(service, 'E', {
      parentEventId: 'P2',
      parentLinkReasons: [{ parentEventId: 'P2', reason: '새 상위 사유' }],
    })
    expect(reasons).toEqual([
      { childEventId: 'E', parentEventId: 'P2', reason: '새 상위 사유' },
    ])
  })

  test('HIER-W1: 떨어져 나가는 구 주 상위(엣지 잔존 없음) 쌍 사유는 400', async () => {
    const { service } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1'), liveEvent('P2')],
      [],
    )
    await expect(
      updateReasons(service, 'E', {
        parentEventId: 'P2',
        parentLinkReasons: [{ parentEventId: 'P1', reason: '구 상위 사유' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  test('추가 상위(유령 부모 포함) 쌍에 사유 허용 — R-1 부활', async () => {
    // E의 주 상위 P1(생존) + 추가 상위 엣지 G(소프트삭제 부모). 유령 쌍에도 사유 기록 허용.
    const reasons: FakeReasonRow[] = []
    const { service } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1'), deletedEvent('G')],
      [edge('E', 'G')],
      { reasons },
    )
    await updateReasons(service, 'E', {
      parentLinkReasons: [{ parentEventId: 'G', reason: '유령 상위 사유' }],
    })
    expect(reasons).toEqual([
      { childEventId: 'E', parentEventId: 'G', reason: '유령 상위 사유' },
    ])
  })

  test('childLinkReasons: 살아있는 자식 쌍에 업서트 → (child, this) 키로 저장', async () => {
    const reasons: FakeReasonRow[] = []
    const { service } = buildService(
      [liveEvent('P', null), liveEvent('C', 'P')],
      [],
      { reasons },
    )
    await updateReasons(service, 'P', {
      childLinkReasons: [{ childEventId: 'C', reason: '자식 사유' }],
    })
    expect(reasons).toEqual([
      { childEventId: 'C', parentEventId: 'P', reason: '자식 사유' },
    ])
  })

  test('childLinkReasons: 자식이 아닌 사건 → 400', async () => {
    const { service } = buildService(
      [liveEvent('P', null), liveEvent('X', null)],
      [],
    )
    await expect(
      updateReasons(service, 'P', {
        childLinkReasons: [{ childEventId: 'X', reason: '무관' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  test('승격 등 계층-only patch는 사유 행을 건드리지 않는다(쌍 자연키 무손실)', async () => {
    // E: 주 상위 P1, 추가 상위 P2(엣지). (E,P2) 쌍에 사유. P2를 대표로 승격.
    const reasons: FakeReasonRow[] = [
      { childEventId: 'E', parentEventId: 'P2', reason: '승격돼도 남는 사유' },
    ]
    const { service } = buildService(
      [liveEvent('E', 'P1'), liveEvent('P1'), liveEvent('P2')],
      [edge('E', 'P2')],
      { reasons },
    )
    await updateReasons(service, 'E', {
      parentEventId: 'P2',
      extraParentEventIds: ['P1'],
    })
    // 사유 patch가 없으므로 eventHierarchyReason 테이블은 무변경 — (E,P2) 쌍 사유 그대로.
    expect(reasons).toEqual([
      { childEventId: 'E', parentEventId: 'P2', reason: '승격돼도 남는 사유' },
    ])
  })
})
