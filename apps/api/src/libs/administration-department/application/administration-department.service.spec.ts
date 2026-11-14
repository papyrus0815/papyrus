import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
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
    administrationDepartmentCategory: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({ id: 'mock-cat', name: '기본분류' }),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    governmentPositionTenure: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    administrationDepartmentTransition: {
      findMany: jest.fn().mockResolvedValue([]),
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
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    politicalSystem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    country: {
      findUnique: jest.fn().mockResolvedValue({ id: 'mock-country' }),
    },
    historicalCountry: {
      findUnique: jest.fn().mockResolvedValue({ id: 'mock-hist-country' }),
    },
    historicalCountryTransition: {
      findMany: jest.fn().mockResolvedValue([]),
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

  it('list: includeConstituents=true일 때 구성국(UNION 등)의 존속 기간 내 부처만 병합 조회한다', async () => {
    const prisma = createMockPrisma()
    prisma.historicalCountry.findUnique.mockResolvedValue({
      id: 'hist-ah',
      startYear: 1867,
      startEra: 'AD',
      startMonth: 3,
      startDay: 30,
      endYear: 1918,
      endEra: 'AD',
      endMonth: 11,
      endDay: 11,
      membershipsParent: [
        {
          memberCountryId: 'hist-hungary',
          role: 'UNION',
          isLeadingMember: false,
          membershipStartDate: null,
          membershipEndDate: null,
          startYear: null,
          startEra: null,
          startMonth: null,
          startDay: null,
          endYear: null,
          endEra: null,
          endMonth: null,
          endDay: null,
          memberCountry: {
            id: 'hist-hungary',
            name: '헝가리 왕국',
            enName: 'Kingdom of Hungary',
            startYear: 1000,
            startEra: 'AD',
            startMonth: null,
            startDay: null,
            endYear: 1918,
            endEra: 'AD',
            endMonth: 11,
            endDay: 16,
          },
        },
      ],
    })
    const mockTimestamp = new Date('2026-01-01T00:00:00.000Z')
    prisma.administrationDepartment.findMany.mockResolvedValue([
      {
        id: 'dept-kuk-war',
        name: '제국·왕국 공동전쟁성',
        historicalCountryId: 'hist-ah',
        establishedDate: new Date('1867-12-21T00:00:00.000Z'),
        establishedEra: 'AD',
        establishedYear: 1867,
        establishedMonth: 12,
        establishedDay: 21,
        abolishedDate: new Date('1918-11-11T00:00:00.000Z'),
        abolishedEra: 'AD',
        abolishedYear: 1918,
        abolishedMonth: 11,
        abolishedDay: 11,
        transitionsFrom: [],
        transitionsTo: [],
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      },
      {
        id: 'dept-hu-honved',
        name: '헝가리 왕립 국방성',
        historicalCountryId: 'hist-hungary',
        establishedDate: new Date('1867-02-20T00:00:00.000Z'),
        establishedEra: 'AD',
        establishedYear: 1867,
        establishedMonth: 2,
        establishedDay: 20,
        abolishedDate: new Date('1918-11-16T00:00:00.000Z'),
        abolishedEra: 'AD',
        abolishedYear: 1918,
        abolishedMonth: 11,
        abolishedDay: 16,
        transitionsFrom: [],
        transitionsTo: [],
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      },
      {
        id: 'dept-hu-1848',
        name: '1848 혁명 국방위원회',
        historicalCountryId: 'hist-hungary',
        establishedDate: new Date('1848-09-16T00:00:00.000Z'),
        establishedEra: 'AD',
        establishedYear: 1848,
        establishedMonth: 9,
        establishedDay: 16,
        abolishedDate: new Date('1849-08-13T00:00:00.000Z'),
        abolishedEra: 'AD',
        abolishedYear: 1849,
        abolishedMonth: 8,
        abolishedDay: 13,
        transitionsFrom: [],
        transitionsTo: [],
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      },
    ])

    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    const result = await service.list({
      historicalCountryId: 'hist-ah',
      includeConstituents: true,
    })

    expect(prisma.administrationDepartment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          historicalCountryId: { in: ['hist-ah', 'hist-hungary'] },
        },
      }),
    )
    expect(result.map((dept) => dept.id)).toEqual([
      'dept-kuk-war',
      'dept-hu-honved',
    ])
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
      { id: 'def-2', categoryId: 'cat-old' },
    ])
    prisma.governmentPositionDefinitionScope.findMany.mockResolvedValue([
      {
        id: 'scope-1',
        definitionId: 'def-1',
        countryId: null,
        historicalCountryId: 'hist-goryeo',
      },
    ])

    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await service.update('dept-1', {
      historicalCountryId: 'hist-joseon',
      categoryId: 'cat-new',
    })

    // 기존 스코프(scope-1)는 localTitle·note 등 메타데이터 보존을 위해 updateMany로 갱신
    expect(
      prisma.governmentPositionDefinitionScope.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: { in: ['scope-1'] } },
      data: {
        countryId: 'kr',
        historicalCountryId: 'hist-joseon',
      },
    })
    // 스코프가 없던 def-2는 새로 createMany
    expect(
      prisma.governmentPositionDefinitionScope.createMany,
    ).toHaveBeenCalledWith({
      data: [
        {
          definitionId: 'def-2',
          countryId: 'kr',
          historicalCountryId: 'hist-joseon',
        },
      ],
    })
    expect(
      prisma.governmentPositionDefinition.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: { in: ['def-1', 'def-2'] } },
      data: { categoryId: 'cat-new' },
    })
  })

  it('update: 계보(Transition)로 연결된 타 기관과 국가가 호환되지 않으면 국가 변경을 차단한다', async () => {
    const prisma = createMockPrisma()
    prisma.administrationDepartment.findUnique.mockResolvedValue({
      id: 'dept-kr',
      name: '외무부',
      countryId: 'kr',
      historicalCountryId: null,
      parentId: null,
    })
    prisma.administrationDepartmentTransition.findMany.mockResolvedValue([
      {
        predecessorId: 'dept-kr',
        successorId: 'dept-kr-2',
        predecessor: {
          id: 'dept-kr',
          name: '외무부',
          countryId: 'kr',
          historicalCountryId: null,
        },
        successor: {
          id: 'dept-kr-2',
          name: '외교통상부',
          countryId: 'kr',
          historicalCountryId: null,
        },
      },
    ])
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await expect(
      service.update('dept-kr', {
        countryId: 'us',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('create / updateCategory: 존재하지 않는 국가 참조 시 NotFoundException, 분류 이름 중복 시 ConflictException을 던진다', async () => {
    const prisma = createMockPrisma()
    prisma.country.findUnique.mockResolvedValue(null)
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await expect(
      service.create({
        name: '외교부',
        countryId: 'non-existent-country',
      }),
    ).rejects.toThrow(NotFoundException)

    prisma.administrationDepartmentCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      name: '기존분류',
    })
    prisma.administrationDepartmentCategory.findFirst.mockResolvedValue({
      id: 'cat-2',
      name: '중복분류',
    })

    await expect(
      service.updateCategory('cat-1', { name: '중복분류' }),
    ).rejects.toThrow(ConflictException)
  })

  it('deleteCategory: 소속 기관이나 직위 정의가 연결된 분류 삭제 시 ConflictException을 던진다', async () => {
    const prisma = createMockPrisma()
    ;(prisma.administrationDepartment as any).count = jest
      .fn()
      .mockResolvedValue(3)
    ;(prisma.governmentPositionDefinition as any).count = jest
      .fn()
      .mockResolvedValue(1)
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await expect(service.deleteCategory('cat-1')).rejects.toThrow(
      ConflictException,
    )
    expect(prisma.administrationDepartmentCategory.delete).not.toHaveBeenCalled()
  })

  it('create: dual-fill된 countryId가 같더라도 역사국가 소속 상위 기관 아래에 현대국가 직속 기관을 두면 BadRequestException을 던진다', async () => {
    const prisma = createMockPrisma()
    prisma.administrationDepartment.findUnique.mockResolvedValue({
      id: 'dept-joseon-ijo',
      name: '이조',
      countryId: 'kr',
      historicalCountryId: 'hist-joseon',
    })
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await expect(
      service.create({
        name: '인사혁신처',
        countryId: 'kr',
        historicalCountryId: null,
        parentId: 'dept-joseon-ijo',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('create: 동일 국가·시대·상위 기관 내에 존속기간이 겹치는 동명 기관이 있으면 ConflictException을 던진다', async () => {
    const prisma = createMockPrisma()
    prisma.administrationDepartment.findMany.mockResolvedValue([
      {
        id: 'existing-dept',
        name: '외교부',
        establishedEra: 'AD',
        establishedYear: 2013,
        establishedMonth: 3,
        establishedDay: 23,
        abolishedEra: null,
        abolishedYear: null,
        abolishedMonth: null,
        abolishedDay: null,
      },
    ])
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await expect(
      service.create({
        name: '외교부',
        countryId: 'kr',
      }),
    ).rejects.toThrow(ConflictException)
  })

  it('update: 같은 국가 계보 내에서 상위 기관의 역사국가를 변경하면 다단계(자식·손자) 하위 기관도 함께 이동시킨다(데드락 방지)', async () => {
    const prisma = createMockPrisma()
    ;(prisma.administrationDepartment as any).updateMany = jest
      .fn()
      .mockResolvedValue({ count: 2 })
    prisma.administrationDepartment.findUnique.mockResolvedValue({
      id: 'parent-dept',
      name: '궁내부',
      countryId: 'kr',
      historicalCountryId: null,
      parentId: null,
      categoryId: 'cat-1',
    })
    prisma.historicalCountryModernCountry.findMany.mockResolvedValue([
      { modernCountryId: 'kr' },
    ])
    prisma.administrationDepartment.findMany
      .mockResolvedValueOnce([
        {
          id: 'child-dept',
          name: '내장원',
          countryId: 'kr',
          historicalCountryId: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'grandchild-dept',
          name: '삼정과',
          countryId: 'kr',
          historicalCountryId: null,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    prisma.administrationDepartment.update.mockResolvedValue({
      id: 'parent-dept',
      name: '궁내부',
      countryId: 'kr',
      historicalCountryId: 'hist-joseon',
      parentId: null,
      categoryId: 'cat-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await service.update('parent-dept', {
      historicalCountryId: 'hist-joseon',
    })

    expect(
      (prisma.administrationDepartment as any).updateMany,
    ).toHaveBeenCalledWith({
      where: {
        id: { in: ['child-dept', 'grandchild-dept'] },
        countryId: 'kr',
        historicalCountryId: null,
      },
      data: {
        countryId: 'kr',
        historicalCountryId: 'hist-joseon',
      },
    })
  })

  it('update: 함께 이동할 하위 기관(cascadeDescendant)에 기존 시대의 재임 기록이 남아있으면 국가/시대 변경을 차단한다', async () => {
    const prisma = createMockPrisma()
    prisma.administrationDepartment.findUnique.mockResolvedValue({
      id: 'parent-dept',
      name: '궁내부',
      countryId: 'kr',
      historicalCountryId: null,
      parentId: null,
      categoryId: 'cat-1',
    })
    prisma.historicalCountryModernCountry.findMany.mockResolvedValue([
      { modernCountryId: 'kr' },
    ])
    prisma.administrationDepartment.findMany
      .mockResolvedValueOnce([
        {
          id: 'child-dept',
          name: '내장원',
          countryId: 'kr',
          historicalCountryId: null,
        },
      ])
      .mockResolvedValueOnce([])
    prisma.governmentPositionTenure.findMany
      .mockResolvedValueOnce([]) // parent-dept tenures
      .mockResolvedValueOnce([
        {
          id: 'child-tenure-1',
          countryId: 'kr',
          historicalCountryId: null,
        },
      ]) // child-dept tenures

    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    await expect(
      service.update('parent-dept', {
        historicalCountryId: 'hist-joseon',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('addTransition validates transition date rules and rejects transition year before predecessor establishment', async () => {
    const prisma = createMockPrisma()
    const service = new AdministrationDepartmentService(
      prisma as any,
      createMockNotification() as any,
    )

    // 월만 단독 지정 시 차단
    await expect(
      service.addTransition('dept-pred', {
        successorId: 'dept-succ',
        kind: 'REORGANIZE',
        month: 5,
      }),
    ).rejects.toThrow(BadRequestException)

    // 전신 부처 설립 연도(1994)보다 이른 개편 시점(1990) 차단
    prisma.administrationDepartment.findUnique
      .mockResolvedValueOnce({
        id: 'dept-pred',
        name: '재정경제원',
        countryId: 'country-kr',
        historicalCountryId: null,
        establishedEra: 'AD',
        establishedYear: 1994,
        establishedMonth: 12,
        establishedDay: 23,
        abolishedEra: 'AD',
        abolishedYear: 1998,
        abolishedMonth: 2,
        abolishedDay: 28,
      })
      .mockResolvedValueOnce({
        id: 'dept-succ',
        name: '재정경제부',
        countryId: 'country-kr',
        historicalCountryId: null,
        establishedEra: 'AD',
        establishedYear: 1998,
        establishedMonth: 2,
        establishedDay: 28,
        abolishedEra: null,
        abolishedYear: null,
        abolishedMonth: null,
        abolishedDay: null,
      })

    await expect(
      service.addTransition('dept-pred', {
        successorId: 'dept-succ',
        kind: 'REORGANIZE',
        era: 'AD',
        year: 1990,
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('create & update persist structured institutional metadata columns (primaryMission, headquarters, orgStructure, budgetNote)', async () => {
    const prisma = createMockPrisma()
    const now = new Date('2026-11-11T00:00:00.000Z')
    prisma.administrationDepartment.create.mockResolvedValue({
      id: 'dept-meta-1',
      name: '외무성',
      nameLocal: 'Auswärtiges Amt',
      nameEn: 'Foreign Office',
      abbreviation: 'AA',
      kind: 'MINISTRY',
      countryId: 'mock-country',
      historicalCountryId: null,
      parentId: null,
      categoryId: 'mock-cat',
      thumbnailUrl: null,
      description: '외교 총괄 부처',
      primaryMission: '대외 외교 교섭 및 재외공관 지휘',
      headquarters: '베를린 빌헬름가 74-76번지',
      orgStructure: '정무국·통상국·법무국',
      budgetNote: '정원 약 2,500명',
      establishedEra: 'AD',
      establishedYear: 1870,
      establishedMonth: 1,
      establishedDay: 4,
      establishedPrecision: 'day',
      establishedDate: new Date('1870-01-04T00:00:00.000Z'),
      abolishedEra: null,
      abolishedYear: null,
      abolishedMonth: null,
      abolishedDay: null,
      abolishedPrecision: null,
      abolishedDate: null,
      country: { id: 'mock-country', name: '독일' },
      historicalCountry: null,
      category: { id: 'mock-cat', name: '외교', nameEn: 'Foreign Affairs' },
      parent: null,
      children: [],
      predecessorTransitions: [],
      successorTransitions: [],
      militaryUnitSuccessors: [],
      militaryUnits: [],
      createdAt: now,
      updatedAt: now,
    })

    const service = new AdministrationDepartmentService(
      prisma as never,
      createMockNotification() as never,
    )

    const created = await service.create({
      name: '외무성',
      countryId: 'mock-country',
      categoryId: 'mock-cat',
      description: '외교 총괄 부처',
      primaryMission: '  대외 외교 교섭 및 재외공관 지휘  ',
      headquarters: '  베를린 빌헬름가 74-76번지  ',
      orgStructure: '  정무국·통상국·법무국  ',
      budgetNote: '  정원 약 2,500명  ',
    })

    expect(prisma.administrationDepartment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          primaryMission: '대외 외교 교섭 및 재외공관 지휘',
          headquarters: '베를린 빌헬름가 74-76번지',
          orgStructure: '정무국·통상국·법무국',
          budgetNote: '정원 약 2,500명',
        }),
      }),
    )
    expect(created.primaryMission).toBe('대외 외교 교섭 및 재외공관 지휘')
    expect(created.headquarters).toBe('베를린 빌헬름가 74-76번지')
    expect(created.orgStructure).toBe('정무국·통상국·법무국')
    expect(created.budgetNote).toBe('정원 약 2,500명')
  })

  it('list: 전 국가 기관 허브에서 categoryId와 activeAtYear(부호 연도)로 동시대 존속 기관만 필터링한다', async () => {
    const prisma = createMockPrisma()
    const mockTimestamp = new Date('2026-01-01T00:00:00.000Z')
    prisma.administrationDepartment.findMany.mockResolvedValue([
      {
        id: 'dept-1914-active',
        name: '제국외무성',
        categoryId: 'cat-foreign',
        historicalCountryId: 'hist-de',
        historicalCountry: {
          id: 'hist-de',
          name: '독일 제국',
          startEra: 'AD',
          startYear: 1871,
          endEra: 'AD',
          endYear: 1918,
        },
        establishedDate: new Date('1870-01-04T00:00:00.000Z'),
        establishedEra: 'AD',
        establishedYear: 1870,
        abolishedDate: new Date('1919-02-11T00:00:00.000Z'),
        abolishedEra: 'AD',
        abolishedYear: 1919,
        transitionsFrom: [],
        transitionsTo: [],
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      },
      {
        id: 'dept-1949-later',
        name: '연방외무청',
        categoryId: 'cat-foreign',
        countryId: 'modern-de',
        country: { id: 'modern-de', name: '독일', flagEmoji: '🇩🇪' },
        establishedDate: new Date('1951-03-15T00:00:00.000Z'),
        establishedEra: 'AD',
        establishedYear: 1951,
        abolishedDate: null,
        abolishedEra: null,
        abolishedYear: null,
        transitionsFrom: [],
        transitionsTo: [],
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      },
    ])

    const service = new AdministrationDepartmentService(
      prisma as never,
      createMockNotification() as never,
    )

    const result = await service.list({
      categoryId: 'cat-foreign',
      activeAtYear: 1914,
      take: 300,
    })

    expect(prisma.administrationDepartment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: 'cat-foreign',
        }),
      }),
    )
    expect(result.map((dept) => dept.id)).toEqual(['dept-1914-active'])
  })

  it('listTenures: 직접 cabinet 및 cabinetMemberships의 소속 내각을 중복 없이 병합하고 수반명 기반 폴백 내각명을 반환한다', async () => {
    const prisma = createMockPrisma()
    prisma.governmentPositionTenure.findMany.mockResolvedValue([
      {
        id: 'tenure-minister-1',
        startDate: new Date('1913-06-10T00:00:00.000Z'),
        startEra: 'AD',
        startYear: 1913,
        startMonth: 6,
        startDay: 10,
        endDate: new Date('1917-06-15T00:00:00.000Z'),
        endEra: 'AD',
        endYear: 1917,
        endMonth: 6,
        endDay: 15,
        cabinet: {
          id: 'cab-1',
          name: null,
          headTenure: {
            ordinal: 2,
            person: {
              name: '이슈트반',
              surname: '티서',
              nameDisplayOrder: 'SURNAME_FIRST',
              country: null,
            },
          },
        },
        cabinetMemberships: [
          {
            cabinet: {
              id: 'cab-1',
              name: null,
              headTenure: {
                ordinal: 2,
                person: {
                  name: '이슈트반',
                  surname: '티서',
                  nameDisplayOrder: 'SURNAME_FIRST',
                  country: null,
                },
              },
            },
          },
          {
            cabinet: {
              id: 'cab-2',
              name: '전시 비상 연립내각',
              headTenure: null,
            },
          },
        ],
      },
    ])

    const service = new AdministrationDepartmentService(
      prisma as never,
      createMockNotification() as never,
    )

    const result = await service.listTenures('dept-hu-honved')

    expect(prisma.governmentPositionTenure.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { administrationDepartmentId: 'dept-hu-honved' },
            {
              administrationDepartmentId: null,
              positionDefinition: {
                is: { administrationDepartmentId: 'dept-hu-honved' },
              },
            },
            {
              cabinetMemberships: {
                some: { administrationDepartmentId: 'dept-hu-honved' },
              },
            },
          ],
        },
      }),
    )
    expect(result[0].cabinets).toEqual([
      { id: 'cab-1', name: '제2대 티서 이슈트반 내각' },
      { id: 'cab-2', name: '전시 비상 연립내각' },
    ])
  })
})
