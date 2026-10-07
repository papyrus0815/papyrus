import { BadRequestException } from '@nestjs/common'

import { EventSectionService } from './event-section.service'

/**
 * 단락 저장의 약속: **id가 있는 단락은 그 행을 고친다** — 단락 id가 유지돼야
 * 단락→하위 사건 연결(D2)과 본문 인용(D4)이 저장 뒤에도 살아남는다.
 */
describe('EventSectionService.sync', () => {
  type Row = {
    id: string
    title: string
    content: string
    order: number
    sectionType: string | null
    subjectEventId: string | null
  }

  function buildTx(rows: Row[], children: { primary?: string[]; extra?: string[] } = {}) {
    const state = [...rows]
    const tx = {
      eventSection: {
        findMany: jest.fn(() => Promise.resolve(state)),
        deleteMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) => {
          for (const id of where.id.in) state.splice(state.findIndex((row) => row.id === id), 1)
          return Promise.resolve({ count: where.id.in.length })
        }),
        create: jest.fn(({ data }: { data: Omit<Row, 'id'> }) => {
          state.push({ id: `new-${state.length}`, ...data })
          return Promise.resolve()
        }),
        update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
          Object.assign(state.find((row) => row.id === where.id)!, data)
          return Promise.resolve()
        }),
      },
      event: {
        findMany: jest.fn(() => Promise.resolve((children.primary ?? []).map((id) => ({ id })))),
      },
      eventParentLink: {
        findMany: jest.fn(() => Promise.resolve((children.extra ?? []).map((childEventId) => ({ childEventId })))),
      },
    }
    return { tx, state }
  }

  const row = (overrides: Partial<Row>): Row => ({
    id: 's1',
    title: '개전',
    content: '<p>본문</p>',
    order: 0,
    sectionType: 'content',
    subjectEventId: null,
    ...overrides,
  })

  const service = new EventSectionService()

  it('id가 같은 단락은 그대로 두고, 빠진 단락만 지우고, id 없는 단락만 새로 만든다', async () => {
    const { tx, state } = buildTx([row({}), row({ id: 's2', title: '휴전', order: 1 })])
    await service.sync(tx as never, 'E1', [
      { id: 's1', title: '개전', content: '<p>본문</p>', order: 0, sectionType: 'content' },
      { title: '후속', content: '<p>새 단락</p>', order: 1 },
    ])
    expect(tx.eventSection.update).not.toHaveBeenCalled()
    expect(state.map((section) => section.id)).toEqual(['s1', 'new-1'])
  })

  it('하위 사건 연결은 생략하면 유지된다(3상)', async () => {
    const { tx, state } = buildTx([row({ subjectEventId: 'child-1' })])
    await service.sync(tx as never, 'E1', [{ id: 's1', title: '개전(수정)', content: '<p>본문</p>' }])
    expect(state[0]).toMatchObject({ title: '개전(수정)', subjectEventId: 'child-1' })
  })

  it('하위 사건이 아닌 사건은 가리킬 수 없다 — 추가 상위로 이어진 하위는 허용', async () => {
    const ok = buildTx([row({})], { extra: ['child-x'] })
    await service.sync(ok.tx as never, 'E1', [{ id: 's1', title: '개전', content: '', subjectEventId: 'child-x' }])
    expect(ok.state[0].subjectEventId).toBe('child-x')

    const bad = buildTx([row({})], { primary: [] })
    await expect(
      service.sync(bad.tx as never, 'E1', [{ id: 's1', title: '개전', content: '', subjectEventId: 'stranger' }]),
    ).rejects.toThrow(BadRequestException)
  })

  it('다른 사건의 단락 id는 400', async () => {
    const { tx } = buildTx([row({})])
    await expect(service.sync(tx as never, 'E1', [{ id: 'foreign', title: 'x', content: '' }])).rejects.toThrow(
      BadRequestException,
    )
  })
})
