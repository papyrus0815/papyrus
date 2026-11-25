import { BadRequestException } from '@nestjs/common'
import { MilitaryUnitRepository } from './military-unit.repository'

type RepoPrisma = ConstructorParameters<typeof MilitaryUnitRepository>[0]

describe('MilitaryUnitRepository — 공간 좌표·관할 도형·정량 병력(Observation) 검증', () => {
  function makeMockPrisma() {
    const createdPayloads: Record<string, unknown>[] = []
    const prisma = {
      country: {
        findUnique: jest.fn(async () => ({ id: 'country-kr' })),
      },
      historicalCountry: {
        findUnique: jest.fn(async () => null),
      },
      historicalCountryModernCountry: {
        findMany: jest.fn(async () => []),
      },
      militaryUnit: {
        create: jest.fn(
          async ({ data }: { data: Record<string, unknown> }) => {
            createdPayloads.push(data)
            return { id: 'unit-1', ...data }
          },
        ),
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => ({
          id: where.id,
          name: '제7기동군단',
          countryId: 'country-kr',
          historicalCountryId: null,
          garrison: '경기도 이천시',
          garrisonLatitude: 37.2792,
          garrisonLongitude: 127.4425,
          strength: '예하 2개 기계화보병사단 · 1개 기갑여단\n완편 기계화 전력',
          jurisdiction: '한반도 중서부 전략 기동 축선',
          jurisdictionGeometry: {
            type: 'POLYGON',
            coordinates: [
              [37.5, 127.0],
              [37.6, 127.6],
              [37.1, 127.4],
            ],
          },
          predecessorTransitions: [],
          successorTransitions: [],
          tenures: [],
          commanders: [],
          eventRelations: [],
          assignedNavalVessels: [],
          sideDeployedUnits: [],
          subUnits: [],
        })),
        delete: jest.fn(async () => ({})),
      },
      observation: {
        findMany: jest.fn(
          async ({ where }: { where: { subjectType?: string } }) => {
            if (where.subjectType === 'MILITARY_UNIT') {
              return [
                {
                  id: 'obs-wartime',
                  metric: {
                    key: 'military.unit.authorized_wartime',
                    name: '전시 완편 정원',
                    unit: 'person',
                    sortOrder: 46,
                  },
                  value: '32000.000000',
                  low: null,
                  high: null,
                  approx: false,
                  atLeast: false,
                  qualifier: null,
                  note: '기동군단 개편 기준',
                  estimateRole: 'PREFERRED',
                  method: 'OFFICIAL_CLAIM',
                  startEra: 'AD',
                  startYear: 1989,
                  startMonth: 10,
                  startDay: null,
                  startPrecision: 'month',
                  endEra: null,
                  endYear: null,
                  endMonth: null,
                  endDay: null,
                  endPrecision: null,
                },
              ]
            }
            return []
          },
        ),
        deleteMany: jest.fn(async () => ({ count: 1 })),
      },
      citation: {
        deleteMany: jest.fn(async () => ({ count: 0 })),
      },
      $transaction: jest.fn(),
    }
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    )
    return {
      prisma: prisma as unknown as RepoPrisma,
      mockClient: prisma,
      createdPayloads,
    }
  }

  it('주둔지 위·경도와 관할 다각형, 장문 병력 서술을 저장하고 상세 조회 시 unitObservations와 함께 반환한다', async () => {
    const { prisma, createdPayloads } = makeMockPrisma()
    const repo = new MilitaryUnitRepository(prisma)

    const result = await repo.create({
      name: '제7기동군단',
      countryId: 'country-kr',
      garrison: '경기도 이천시',
      garrisonLatitude: 37.2792,
      garrisonLongitude: 127.4425,
      strength: '예하 2개 기계화보병사단 · 1개 기갑여단\n완편 기계화 전력',
      jurisdiction: '한반도 중서부 전략 기동 축선',
      jurisdictionGeometry: {
        type: 'POLYGON',
        coordinates: [
          [37.5, 127.0],
          [37.6, 127.6],
          [37.1, 127.4],
        ],
      },
    })

    expect(createdPayloads).toHaveLength(1)
    expect(createdPayloads[0]).toMatchObject({
      garrisonLatitude: 37.2792,
      garrisonLongitude: 127.4425,
      jurisdictionGeometry: {
        type: 'POLYGON',
        coordinates: [
          [37.5, 127.0],
          [37.6, 127.6],
          [37.1, 127.4],
        ],
      },
    })
    expect(result.garrisonLatitude).toBe(37.2792)
    expect(result.garrisonLongitude).toBe(127.4425)
    expect(result.unitObservations).toHaveLength(1)
    expect(result.unitObservations?.[0]).toMatchObject({
      metricKey: 'military.unit.authorized_wartime',
      value: '32000.000000',
      note: '기동군단 개편 기준',
      start: { era: 'AD', year: 1989, month: 10, day: null, precision: 'month' },
    })
  })

  it('위도만 있고 경도가 비어 있으면 400 BadRequestException을 던진다', async () => {
    const { prisma } = makeMockPrisma()
    const repo = new MilitaryUnitRepository(prisma)

    await expect(
      repo.create({
        name: '좌표 불일치 부대',
        countryId: 'country-kr',
        garrisonLatitude: 37.5,
        garrisonLongitude: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('다각형(POLYGON) 관할 구역의 꼭짓점이 3개 미만이면 400 BadRequestException을 던진다', async () => {
    const { prisma } = makeMockPrisma()
    const repo = new MilitaryUnitRepository(prisma)

    await expect(
      repo.create({
        name: '도형 부족 부대',
        countryId: 'country-kr',
        jurisdictionGeometry: {
          type: 'POLYGON',
          coordinates: [
            [37.5, 127.0],
            [37.6, 127.6],
          ],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('부대 삭제 시 다형 측정값(Observation)과 인용(Citation)을 같은 트랜잭션에서 정리한다', async () => {
    const { prisma, mockClient } = makeMockPrisma()
    ;(mockClient.militaryUnit.findUnique as jest.Mock).mockResolvedValue({
      id: 'unit-1',
      name: '삭제 대상 부대',
      _count: {
        subUnits: 0,
        tenures: 0,
        sideDeployedUnits: 0,
        eventRelations: 0,
      },
    })
    const repo = new MilitaryUnitRepository(prisma)

    await repo.delete('unit-1')
    expect(mockClient.observation.deleteMany).toHaveBeenCalledTimes(1)
    expect(mockClient.citation.deleteMany).toHaveBeenCalledTimes(2)
    expect(mockClient.militaryUnit.delete).toHaveBeenCalledWith({
      where: { id: 'unit-1' },
    })
  })
})
