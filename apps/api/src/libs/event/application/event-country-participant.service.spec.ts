import { BadRequestException } from '@nestjs/common'

import { EventCountryParticipantService } from './event-country-participant.service'

/**
 * 이 서비스가 지켜야 하는 단 하나의 약속: **살아남은 국가의 큐레이션은 손대지 않는다.**
 * 예전 delete-and-recreate 저장이 사건 상세에서 국가 칩 하나만 추가해도 그 사건의
 * 역할 10종과 role_description을 통째로 날렸다(실측 66/270 사건이 사정권).
 */
describe('EventCountryParticipantService', () => {
  type Row = {
    id: string
    countryId: string | null
    historicalCountryId: string | null
    role: string
    roleDescription: string | null
    note: string | null
    sortOrder: number
  }

  function buildTx(rows: Row[]) {
    const state = [...rows]
    const tx = {
      eventCountryRelation: {
        findMany: jest.fn(() => Promise.resolve(state)),
        deleteMany: jest.fn(({ where }: any) => {
          for (const id of where.id.in) {
            const index = state.findIndex((row) => row.id === id)
            if (index >= 0) state.splice(index, 1)
          }
          return Promise.resolve({ count: where.id.in.length })
        }),
        create: jest.fn(({ data }: any) => {
          state.push({ id: `new-${state.length}`, ...data })
          return Promise.resolve(data)
        }),
        createMany: jest.fn(({ data }: any) => {
          data.forEach((row: any, index: number) =>
            state.push({ id: `new-${index}`, ...row }),
          )
          return Promise.resolve({ count: data.length })
        }),
        update: jest.fn(({ where, data }: any) => {
          const row = state.find((candidate) => candidate.id === where.id)
          Object.assign(row!, data)
          return Promise.resolve(row)
        }),
      },
    }
    return { tx, state }
  }

  const service = new EventCountryParticipantService({} as never)

  const curated: Row[] = [
    {
      id: 'r1',
      countryId: null,
      historicalCountryId: 'h-france',
      role: 'INITIATOR',
      roleDescription: '전권대표를 파견해 조약을 주도',
      note: null,
      sortOrder: 0,
    },
    {
      id: 'r2',
      countryId: null,
      historicalCountryId: 'h-spain',
      role: 'ADVERSARY',
      roleDescription: '영토 할양을 감수',
      note: '비밀 조항 포함',
      sortOrder: 1,
    },
  ]

  test('국가를 추가해도 기존 국가의 역할·서술·비고는 UPDATE조차 되지 않는다', async () => {
    const { tx, state } = buildTx(curated)

    await service.sync(tx as never, 'E1', [
      { historicalCountryId: 'h-france' },
      { historicalCountryId: 'h-spain' },
      { historicalCountryId: 'h-england' },
    ])

    expect(tx.eventCountryRelation.deleteMany).not.toHaveBeenCalled()
    // 순서가 그대로면 UPDATE 자체가 없어야 한다(무손실의 증거)
    expect(tx.eventCountryRelation.update).not.toHaveBeenCalled()
    expect(state.find((row) => row.id === 'r1')).toMatchObject({
      role: 'INITIATOR',
      roleDescription: '전권대표를 파견해 조약을 주도',
    })
    expect(state.find((row) => row.id === 'r2')).toMatchObject({
      role: 'ADVERSARY',
      note: '비밀 조항 포함',
    })
    // 새 줄은 가장 약한 해석인 '참여국'으로
    expect(tx.eventCountryRelation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        historicalCountryId: 'h-england',
        role: 'PARTICIPANT',
        sortOrder: 2,
      }),
    })
  })

  test('요청에서 빠진 국가만 제거된다', async () => {
    const { tx, state } = buildTx(curated)

    await service.sync(tx as never, 'E1', [{ historicalCountryId: 'h-france' }])

    expect(tx.eventCountryRelation.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['r2'] } },
    })
    expect(state.map((row) => row.id)).toEqual(['r1'])
  })

  test('3상 — 값은 설정, null은 비움, 생략은 유지', async () => {
    const { tx, state } = buildTx(curated)

    await service.sync(tx as never, 'E1', [
      { historicalCountryId: 'h-france', role: 'MEDIATOR' as never },
      { historicalCountryId: 'h-spain', roleDescription: null },
    ])

    const france = state.find((row) => row.id === 'r1')!
    const spain = state.find((row) => row.id === 'r2')!
    expect(france.role).toBe('MEDIATOR')
    // 역할만 바꿨으니 서술은 그대로
    expect(france.roleDescription).toBe('전권대표를 파견해 조약을 주도')
    expect(spain.roleDescription).toBeNull()
    // 비고는 건드리지 않았다
    expect(spain.note).toBe('비밀 조항 포함')
    // 역할도 그대로
    expect(spain.role).toBe('ADVERSARY')
  })

  test('배열 순서가 sortOrder가 된다 — 순서 이동이 실제로 저장된다', async () => {
    const { tx, state } = buildTx(curated)

    await service.sync(tx as never, 'E1', [
      { historicalCountryId: 'h-spain' },
      { historicalCountryId: 'h-france' },
    ])

    expect(state.find((row) => row.id === 'r2')!.sortOrder).toBe(0)
    expect(state.find((row) => row.id === 'r1')!.sortOrder).toBe(1)
  })

  test('빈 배열은 전부 제거', async () => {
    const { tx, state } = buildTx(curated)
    await service.sync(tx as never, 'E1', [])
    expect(state).toHaveLength(0)
  })

  test('한 줄에 현대·역사 국가를 동시에 지정하면 400', async () => {
    const { tx } = buildTx([])
    await expect(
      service.sync(tx as never, 'E1', [
        { countryId: 'c-kr', historicalCountryId: 'h-joseon' },
      ]),
    ).rejects.toThrow(BadRequestException)
  })

  test('국가가 없는 줄은 400', async () => {
    const { tx } = buildTx([])
    await expect(
      service.sync(tx as never, 'E1', [{ role: 'ALLY' as never }]),
    ).rejects.toThrow(BadRequestException)
  })

  test('같은 국가가 두 줄이면 400 — MySQL 유니크가 못 막는 자리를 여기서 막는다', async () => {
    const { tx } = buildTx([])
    await expect(
      service.sync(tx as never, 'E1', [
        { countryId: 'c-kr' },
        { countryId: 'c-kr', role: 'VICTIM' as never },
      ]),
    ).rejects.toThrow(BadRequestException)
  })

  test('현대와 역사 국가는 서로 다른 키다', async () => {
    const { tx } = buildTx([])
    await service.createAll(tx as never, 'E1', [
      { countryId: 'same-uuid' },
      { historicalCountryId: 'same-uuid' },
    ])
    expect(tx.eventCountryRelation.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ countryId: 'same-uuid', sortOrder: 0 }),
        expect.objectContaining({ historicalCountryId: 'same-uuid', sortOrder: 1 }),
      ],
    })
  })
})
