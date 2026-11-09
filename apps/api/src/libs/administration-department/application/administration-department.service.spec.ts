import { BadRequestException, ConflictException } from '@nestjs/common'
import { AdministrationDepartmentService } from './administration-department.service'

describe('AdministrationDepartmentService', () => {
  const createMockPrisma = () => ({
    administrationDepartment: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    governmentPositionTenure: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    administrationDepartmentTransition: {
      create: jest.fn(),
    },
    historicalCountryModernCountry: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    governmentPositionDefinition: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    governmentPositionDefinitionScope: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    country: {
      findUnique: jest.fn(),
    },
    historicalCountry: {
      findUnique: jest.fn(),
    },
  })

  const createMockNotification = () => ({
    notifyDataCreated: jest.fn(),
    notifyAdministrationDepartment: jest.fn(),
  })

  it('list: countryId와 historicalCountryId가 동시에 전달되면 historicalCountryId를 우선 필터링한다', async () => {
    const prisma = createMockPrisma()
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await service.list({
      countryId: 'modern-kr',
      historicalCountryId: 'hist-joseon',
    })

    expect(prisma.administrationDepartment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { historicalCountryId: 'hist-joseon' },
      }),
    )
  })

  it('listTenures: 기원전(BC) 및 고대 연대 재임의 startDate/endDate를 부호 문자열로 복원하고 startKey 순으로 조회한다', async () => {
    const prisma = createMockPrisma()
    prisma.governmentPositionTenure.findMany.mockResolvedValue([
      {
        id: 't-1',
        startDate: new Date('0202-01-01T00:00:00.000Z'),
        startEra: 'BC',
        startYear: 202,
        startMonth: 1,
        startDay: 1,
        endDate: new Date('0195-06-01T00:00:00.000Z'),
        endEra: 'BC',
        endYear: 195,
        endMonth: 6,
        endDay: 1,
      },
    ])
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    const result = await service.listTenures('dept-1')

    expect(prisma.governmentPositionTenure.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ startKey: 'desc' }, { startDate: 'desc' }],
      }),
    )
    expect(result[0].startDate).toBe('-0202-01-01')
    expect(result[0].endDate).toBe('-0195-06-01')
  })

  it('create: 서로 다른 국가의 상위 부처(parentId)를 지정하면 BadRequestException을 던진다', async () => {
    const prisma = createMockPrisma()
    prisma.country.findUnique.mockResolvedValue({ id: 'kr' })
    prisma.administrationDepartment.findUnique.mockResolvedValue({
      id: 'parent-us',
      name: '미국 국무부',
      countryId: 'us',
      historicalCountryId: null,
    })
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await expect(
      service.create({
        name: '외교부',
        countryId: 'kr',
        parentId: 'parent-us',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('addTransition: 국가 계보가 무관한 두 부처 간 전신·후신 연결 시 BadRequestException을 던진다', async () => {
    const prisma = createMockPrisma()
    prisma.administrationDepartment.findUnique
      .mockResolvedValueOnce({
        id: 'dept-kr',
        name: '외무부',
        countryId: 'kr',
        historicalCountryId: null,
        historicalCountry: null,
      })
      .mockResolvedValueOnce({
        id: 'dept-jp',
        name: '외무성',
        countryId: 'jp',
        historicalCountryId: null,
        historicalCountry: null,
      })
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await expect(
      service.addTransition('dept-kr', {
        successorId: 'dept-jp',
        kind: 'RENAME',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('update: 소속 국가를 변경할 때 이미 연결된 하위 기관이나 재임과 국가 축이 충돌하면 BadRequestException을 던진다', async () => {
    const prisma = createMockPrisma()
    prisma.administrationDepartment.findUnique.mockResolvedValue({
      id: 'dept-kr',
      name: '이조',
      countryId: 'kr',
      historicalCountryId: 'joseon',
      parentId: null,
    })
    prisma.administrationDepartment.findMany.mockResolvedValue([
      {
        id: 'child-dept',
        name: '문선사',
        countryId: 'kr',
        historicalCountryId: 'joseon',
      },
    ])
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await expect(
      service.update('dept-kr', {
        countryId: 'us',
        historicalCountryId: null,
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('delete: 직위 정의(positionDefinitions)가 연결된 기관 삭제 시 ConflictException을 던진다', async () => {
    const prisma = createMockPrisma()
    prisma.administrationDepartment.findUnique.mockResolvedValue({
      id: 'dept-1',
      name: '이조',
      category: null,
      _count: {
        children: 0,
        tenures: 0,
        positionDefinitions: 2,
        militaryUnits: 0,
        eventRelations: 0,
      },
    })
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await expect(service.delete('dept-1')).rejects.toThrow(ConflictException)
  })

  it('list: countryId만 전달되면 연결된 역사적 국가(linkedHistoricalIds)를 OR 조건으로 확장하여 조회한다', async () => {
    const prisma = createMockPrisma()
    prisma.historicalCountryModernCountry.findMany.mockResolvedValue([
      { historicalCountryId: 'hist-joseon' },
      { historicalCountryId: 'hist-goryeo' },
    ])
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await service.list({ countryId: 'modern-kr' })

    expect(prisma.administrationDepartment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { countryId: 'modern-kr' },
            { historicalCountryId: { in: ['hist-joseon', 'hist-goryeo'] } },
          ],
        },
      }),
    )
  })

  it('create: 복수 현대국에 걸친 역사국가(historicalCountryId)만 전달되면 countryId를 임의 단수로 채우지 않고 null로 둔다', async () => {
    const prisma = createMockPrisma()
    prisma.historicalCountryModernCountry.findMany.mockResolvedValue([
      { modernCountryId: 'it' },
      { modernCountryId: 'fr' },
    ])
    prisma.administrationDepartment.create.mockResolvedValue({
      id: 'dept-senate',
      name: '원로원',
      nameHanja: null,
      nameOriginal: 'Senatus',
      countryId: null,
      historicalCountryId: 'hist-rome',
      parentId: null,
      categoryId: null,
      category: null,
      description: null,
      establishedEra: 'BC',
      establishedYear: 509,
      establishedMonth: null,
      establishedDay: null,
      abolishedEra: null,
      abolishedYear: null,
      abolishedMonth: null,
      abolishedDay: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await service.create({
      name: '원로원',
      historicalCountryId: 'hist-rome',
    })

    expect(prisma.administrationDepartment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          countryId: null,
          historicalCountryId: 'hist-rome',
        }),
      }),
    )
  })

  it('create: 브리지로 연결되지 않은 countryId와 historicalCountryId를 동시에 전달하면 BadRequestException을 던진다', async () => {
    const prisma = createMockPrisma()
    prisma.historicalCountryModernCountry.findMany.mockResolvedValue([
      { modernCountryId: 'kr' },
    ])
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await expect(
      service.create({
        name: '이조',
        countryId: 'us',
        historicalCountryId: 'hist-joseon',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('update: 부처의 국가 축 또는 분류가 변경되면 연결된 직위 정의(GovernmentPositionDefinition)의 스코프와 분류를 동기화한다', async () => {
    const prisma = createMockPrisma()
    prisma.administrationDepartment.findUnique.mockResolvedValue({
      id: 'dept-1',
      name: '이조',
      countryId: null,
      historicalCountryId: 'hist-goryeo',
      parentId: null,
      categoryId: 'cat-old',
      establishedEra: 'AD',
      establishedYear: 918,
      establishedMonth: null,
      establishedDay: null,
      abolishedEra: null,
      abolishedYear: null,
      abolishedMonth: null,
      abolishedDay: null,
    })
    prisma.historicalCountryModernCountry.findMany.mockResolvedValue([
      { modernCountryId: 'kr' },
    ])
    prisma.administrationDepartment.findMany.mockResolvedValue([])
    prisma.governmentPositionTenure.findMany.mockResolvedValue([])
    prisma.administrationDepartment.update.mockResolvedValue({
      id: 'dept-1',
      name: '이조',
      nameHanja: null,
      nameOriginal: null,
      countryId: 'kr',
      historicalCountryId: 'hist-joseon',
      parentId: null,
      categoryId: 'cat-new',
      category: { id: 'cat-new', code: 'MINISTRY', label: '중앙부처' },
      description: null,
      establishedEra: 'AD',
      establishedYear: 1392,
      establishedMonth: null,
      establishedDay: null,
      abolishedEra: null,
      abolishedYear: null,
      abolishedMonth: null,
      abolishedDay: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    prisma.governmentPositionDefinition.findMany.mockResolvedValue([
      { id: 'def-1', categoryId: 'cat-old' },
    ])

    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await service.update('dept-1', {
      historicalCountryId: 'hist-joseon',
      categoryId: 'cat-new',
    })

    expect(
      prisma.governmentPositionDefinitionScope.deleteMany,
    ).toHaveBeenCalledWith({
      where: { definitionId: { in: ['def-1'] } },
    })
    expect(
      prisma.governmentPositionDefinitionScope.createMany,
    ).toHaveBeenCalledWith({
      data: [
        {
          definitionId: 'def-1',
          countryId: 'kr',
          historicalCountryId: 'hist-joseon',
        },
      ],
    })
    expect(
      prisma.governmentPositionDefinition.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: { in: ['def-1'] } },
      data: { categoryId: 'cat-new' },
    })
  })
})
