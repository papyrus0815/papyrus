import { BadRequestException } from '@nestjs/common'
import { CitationTargetType, type Prisma } from '@prisma/client'

import { CitationService } from './citation.service'

/**
 * 인용 저장의 약속: **살아남은 인용은 id·근거 구절이 그대로다.**
 * 본문 참조 노드(D4)가 인용 id를 가리키게 되면 재생성은 곧 링크 단절이다.
 */
describe('CitationService.sync', () => {
  type Row = {
    id: string
    sourceId: string
    targetType: CitationTargetType
    targetId: string
    locator: string | null
    quote: string | null
    note: string | null
    sortOrder: number
  }

  function buildTx(rows: Row[], sources: Array<{ id: string; identifier?: string; url?: string }>) {
    const state = [...rows]
    const sourceState = [...sources]
    const tx = {
      citation: {
        findMany: jest.fn(() => Promise.resolve(state)),
        deleteMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) => {
          for (const id of where.id.in) {
            const index = state.findIndex((row) => row.id === id)
            if (index >= 0) state.splice(index, 1)
          }
          return Promise.resolve({ count: where.id.in.length })
        }),
        create: jest.fn(({ data }: { data: Omit<Row, 'id'> }) => {
          state.push({ id: `new-${state.length}`, ...data })
          return Promise.resolve(data)
        }),
        update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
          Object.assign(state.find((row) => row.id === where.id)!, data)
          return Promise.resolve()
        }),
      },
      source: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(sourceState.find((source) => source.id === where.id) ?? null),
        ),
        findFirst: jest.fn(({ where }: { where: { identifier?: string; url?: string } }) =>
          Promise.resolve(
            sourceState.find(
              (source) =>
                (where.identifier && source.identifier === where.identifier) ||
                (where.url && source.url === where.url),
            ) ?? null,
          ),
        ),
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          const created = { id: `src-${sourceState.length}`, ...data }
          sourceState.push(created)
          return Promise.resolve({ id: created.id })
        }),
      },
    }
    return { tx, txClient: tx as unknown as Prisma.TransactionClient, state, sourceState }
  }

  const base = (overrides: Partial<Row>): Row => ({
    id: 'c1',
    sourceId: 's1',
    targetType: CitationTargetType.OBSERVATION,
    targetId: 'o1',
    locator: 'p. 12',
    quote: '근거 구절',
    note: null,
    sortOrder: 0,
    ...overrides,
  })

  it('같은 (출처, 위치)는 손대지 않고, 빠진 것만 지우고, 새 것만 만든다', async () => {
    const { tx, txClient, state } = buildTx(
      [base({}), base({ id: 'c2', locator: 'p. 40', sortOrder: 1 })],
      [{ id: 's1' }, { id: 's2' }],
    )
    await new CitationService().sync(
      txClient,
      CitationTargetType.OBSERVATION,
      'o1',
      [{ sourceId: 's1', locator: 'p. 12' }, { sourceId: 's2', locator: '표 3' }],
      'actor',
    )
    expect(tx.citation.update).not.toHaveBeenCalled()
    expect(state.find((row) => row.id === 'c1')?.quote).toBe('근거 구절')
    expect(state.map((row) => row.id)).toEqual(['c1', 'new-1'])
  })

  it('식별자가 같은 새 출처는 기존 출처를 재사용한다', async () => {
    const { tx, txClient, sourceState } = buildTx([], [{ id: 's1', identifier: '978-0-19' }])
    await new CitationService().sync(
      txClient,
      CitationTargetType.OBSERVATION,
      'o1',
      [{ source: { kind: 'BOOK', title: '다른 표기의 같은 책', identifier: '978-0-19' } }],
      'actor',
    )
    expect(sourceState).toHaveLength(1)
    expect(tx.citation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sourceId: 's1' }) }),
    )
  })

  it('같은 출처의 같은 위치를 두 번 주면 400', async () => {
    const { txClient } = buildTx([], [{ id: 's1' }])
    await expect(
      new CitationService().sync(
        txClient,
        CitationTargetType.OBSERVATION,
        'o1',
        [{ sourceId: 's1', locator: 'p. 1' }, { sourceId: 's1', locator: ' p. 1 ' }],
        'actor',
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('출처가 없는 인용은 400', async () => {
    const { txClient } = buildTx([], [])
    await expect(
      new CitationService().sync(txClient, CitationTargetType.OBSERVATION, 'o1', [{}], 'actor'),
    ).rejects.toThrow(BadRequestException)
  })
})
