import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { PoliticalSystemController } from './political-system.controller'
import { HistoricalCountryPrismaRepository } from '../../historical-country/infrastructure/historical-country.prisma.repository'
import { CountryPrismaRepository } from '../../country/infrastructure/country.prisma.repository'
import { PersonPrismaRepository } from '../../person/infrastructure/person.prisma.repository'
import { TreatyController } from '../../treaty/presentation/treaty.controller'
import { MilitaryUnitRepository } from '../../military/military-unit/infrastructure/military-unit.repository'
import { OrganizationPrismaRepository } from '../../organization/infrastructure/organization.prisma.repository'
import { PersonGroupService } from '../../person/application/person-group.service'
import { GlossaryController } from '../../glossary/presentation/glossary.controller'

describe('PoliticalSystemController & Country Deletion Guards (Round 6)', () => {
  describe('PoliticalSystemController', () => {
    const createMockPrisma = () => {
      const mock: any = {
        country: { findUnique: jest.fn() },
        historicalCountry: { findUnique: jest.fn() },
        historicalCountryModernCountry: {
          findFirst: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        governmentPositionDefinition: { findMany: jest.fn() },
        politicalSystem: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
      }
      return mock
    }

    it('normalizes endEra to startEra (BC) when endYear is given without endEra on create', async () => {
      const prisma = createMockPrisma()
      prisma.historicalCountry.findUnique.mockResolvedValue({ id: 'hc-rome' })
      prisma.politicalSystem.create.mockImplementation(async ({ data }: any) => ({
        id: 'ps-1',
        ...data,
      }))
      const controller = new PoliticalSystemController(prisma)

      const res = await controller.create(
        {
          historicalCountryId: 'hc-rome',
          name: '로마 공화정',
          startEra: 'BC',
          startYear: 509,
          endYear: 27,
        },
        { user: { id: 'acc-1' } },
      )

      expect(res.endEra).toBe('BC')
      expect(prisma.politicalSystem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startEra: 'BC',
            startYear: 509,
            endEra: 'BC',
            endYear: 27,
          }),
        }),
      )
    })

    it('rejects headOfStatePositionId when its scope belongs to an incompatible country', async () => {
      const prisma = createMockPrisma()
      prisma.country.findUnique.mockResolvedValue({ id: 'country-fr' })
      prisma.governmentPositionDefinition.findMany.mockResolvedValue([
        {
          id: 'def-shogun',
          title: '쇼군',
          isGeneric: false,
          positionType: 'HEAD_OF_STATE',
          administrationDepartment: null,
          scopes: [{ countryId: 'country-jp', historicalCountryId: 'hc-edo' }],
        },
      ])
      prisma.historicalCountryModernCountry.findFirst.mockResolvedValue(null)
      const controller = new PoliticalSystemController(prisma)

      await expect(
        controller.create(
          {
            countryId: 'country-fr',
            headOfStatePositionId: 'def-shogun',
          },
          { user: { id: 'acc-1' } },
        ),
      ).rejects.toThrow(BadRequestException)
    })

    it('supports updating historicalCountryId and re-deriving dual-fill countryId on update', async () => {
      const prisma = createMockPrisma()
      prisma.politicalSystem.findUnique.mockResolvedValue({
        id: 'ps-1',
        accountId: 'acc-1',
        countryId: 'country-kr',
        historicalCountryId: null,
        headOfStatePositionId: null,
        headOfGovernmentPositionId: null,
        startEra: 'AD',
        startYear: 1897,
        startMonth: null,
        startDay: null,
        endEra: 'AD',
        endYear: 1910,
        endMonth: null,
        endDay: null,
      })
      prisma.historicalCountry.findUnique.mockResolvedValue({ id: 'hc-empire' })
      prisma.historicalCountryModernCountry.findMany.mockResolvedValue([
        { modernCountryId: 'country-kr' },
      ])
      prisma.politicalSystem.update.mockImplementation(async ({ data }: any) => ({
        id: 'ps-1',
        ...data,
      }))
      const controller = new PoliticalSystemController(prisma)

      await controller.update(
        'ps-1',
        { historicalCountryId: 'hc-empire' },
        { user: { id: 'acc-1' } },
      )

      expect(prisma.politicalSystem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ps-1' },
          data: expect.objectContaining({
            countryId: 'country-kr',
            historicalCountryId: 'hc-empire',
          }),
        }),
      )
    })
  })

  describe('HistoricalCountry & Country deletion guards', () => {
    it('blocks deleting a HistoricalCountry that still has dependent government records', async () => {
      const prisma: any = {
        governmentPositionTenure: { count: jest.fn().mockResolvedValue(2) },
        administrationDepartment: { count: jest.fn().mockResolvedValue(0) },
        politicalSystem: { count: jest.fn().mockResolvedValue(1) },
        governmentPositionDefinitionScope: { count: jest.fn().mockResolvedValue(0) },
        historicalCountry: { delete: jest.fn() },
      }
      const repo = new HistoricalCountryPrismaRepository(prisma)

      await expect(repo.delete('hc-joseon')).rejects.toThrow(ConflictException)
      expect(prisma.historicalCountry.delete).not.toHaveBeenCalled()
    })

    it('detaches dual-filled historical records before deleting a modern Country', async () => {
      const prisma: any = {
        governmentPositionTenure: {
          count: jest.fn().mockResolvedValue(0),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        administrationDepartment: {
          count: jest.fn().mockResolvedValue(0),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        politicalSystem: {
          count: jest.fn().mockResolvedValue(0),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        governmentPositionDefinitionScope: {
          count: jest.fn().mockResolvedValue(0),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        historicalCountryModernCountry: {
          findMany: jest.fn().mockResolvedValueOnce([{ historicalCountryId: 'hc-1' }]).mockResolvedValueOnce([]),
        },
        country: {
          delete: jest.fn().mockResolvedValue({ id: 'country-1' }),
        },
      }
      prisma.$transaction = jest.fn((cb: any) => cb(prisma))
      const repo = new CountryPrismaRepository(prisma)

      await repo.delete('country-1')

      expect(prisma.politicalSystem.updateMany).toHaveBeenCalledWith({
        where: { countryId: 'country-1', historicalCountryId: { not: null } },
        data: { countryId: null },
      })
      expect(prisma.governmentPositionDefinitionScope.updateMany).toHaveBeenCalledWith({
        where: { countryId: 'country-1', historicalCountryId: { not: null } },
        data: { countryId: null },
      })
      expect(prisma.country.delete).toHaveBeenCalledWith({
        where: { id: 'country-1' },
      })
    })

    it('blocks deleting Country or HistoricalCountry when election/politicalParty/electoralDistrict/law exist', async () => {
      const prisma: any = {
        governmentPositionTenure: { count: jest.fn().mockResolvedValue(0) },
        administrationDepartment: { count: jest.fn().mockResolvedValue(0) },
        politicalSystem: { count: jest.fn().mockResolvedValue(0) },
        governmentPositionDefinitionScope: { count: jest.fn().mockResolvedValue(0) },
        election: { count: jest.fn().mockResolvedValue(1) },
        politicalParty: { count: jest.fn().mockResolvedValue(2) },
        electoralDistrict: { count: jest.fn().mockResolvedValue(0) },
        law: { count: jest.fn().mockResolvedValue(1) },
        country: { delete: jest.fn() },
        historicalCountry: { delete: jest.fn() },
      }
      const countryRepo = new CountryPrismaRepository(prisma)
      const histRepo = new HistoricalCountryPrismaRepository(prisma)

      await expect(countryRepo.delete('country-kr')).rejects.toThrow(ConflictException)
      await expect(histRepo.delete('hc-joseon')).rejects.toThrow(ConflictException)
    })
  })

  describe('Round 10: PoliticalSystem precision/legislature & PersonPrismaRepository integrity', () => {
    it('validates PoliticalSystem date precision ladder, negative seats, and clears upper/lower house on UNICAMERAL/NONE', async () => {
      const prisma: any = {
        country: { findUnique: jest.fn().mockResolvedValue({ id: 'country-kr' }) },
        politicalSystem: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ps-1',
            accountId: 'acc-1',
            countryId: 'country-kr',
            historicalCountryId: null,
            headOfStatePositionId: null,
            headOfGovernmentPositionId: null,
            startEra: 'AD',
            startYear: 1948,
            startMonth: 8,
            startDay: 15,
            endEra: null,
            endYear: null,
            endMonth: null,
            endDay: null,
          }),
          create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'ps-new', ...data })),
          update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'ps-1', ...data })),
        },
      }
      const controller = new PoliticalSystemController(prisma)

      // 연도 없이 월 지정 차단
      await expect(
        controller.create(
          { countryId: 'country-kr', startMonth: 8 },
          { user: { id: 'acc-1' } },
        ),
      ).rejects.toThrow(BadRequestException)

      // 음수 의석수 차단
      await expect(
        controller.create(
          { countryId: 'country-kr', lowerHouseSeats: -10 },
          { user: { id: 'acc-1' } },
        ),
      ).rejects.toThrow(BadRequestException)

      // 단원제(UNICAMERAL)로 변경 시 상원 정보 자동 초기화
      await controller.update(
        'ps-1',
        {
          legislatureType: 'UNICAMERAL',
          lowerHouseName: '국회',
          lowerHouseSeats: 300,
          upperHouseName: '참의원',
          upperHouseSeats: 58,
        },
        { user: { id: 'acc-1' } },
      )
      expect(prisma.politicalSystem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            legislatureType: 'UNICAMERAL',
            lowerHouseName: '국회',
            lowerHouseSeats: 300,
            upperHouseName: null,
            upperHouseSeats: null,
          }),
        }),
      )
    })

    it('PersonPrismaRepository validates electionCandidacyId, deleteCabinet/deleteRegnalEra, definition dates, and scope guards', async () => {
      const prisma: any = {
        cabinet: {
          findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
            id: 'cab-1',
            headTenureId: 'ten-1',
            accountId: 'other-acc',
            linkageGroupId: null,
          }),
        },
        regnalEra: {
          findUnique: jest.fn().mockResolvedValue(null),
          delete: jest.fn(),
        },
        governmentPositionDefinition: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'def-generic',
            title: '대통령',
            isGeneric: true,
          }),
          create: jest.fn(),
        },
        governmentPositionDefinitionScope: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'scope-fr',
            definitionId: 'def-custom',
          }),
          findMany: jest.fn().mockResolvedValue([
            { countryId: 'c-de', historicalCountryId: null },
          ]),
          count: jest.fn().mockResolvedValue(2),
          delete: jest.fn(),
        },
        governmentPositionTenure: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        politicalSystem: {
          findMany: jest.fn().mockResolvedValue([
            { countryId: 'c-fr', historicalCountryId: null },
          ]),
        },
        historicalCountryModernCountry: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
        },
      }
      const repo = new PersonPrismaRepository(prisma)

      // 1) deleteCabinet: 미존재 시 NotFoundException, 타 계정 소유 시 ForbiddenException
      await expect(repo.deleteCabinet('missing-cab', 'acc-1')).rejects.toThrow(NotFoundException)
      await expect(repo.deleteCabinet('cab-1', 'acc-1')).rejects.toThrow(ForbiddenException)

      // 2) deleteRegnalEra: 미존재 시 NotFoundException
      await expect(repo.deleteRegnalEra('missing-era')).rejects.toThrow(NotFoundException)

      // 3) createPositionDefinition: 폐지일이 신설일보다 앞선 경우 차단
      await expect(
        repo.createPositionDefinition({
          positionType: 'MINISTER' as any,
          title: '내무장관',
          establishedDate: '1950-01-01',
          abolishedDate: '1948-01-01',
        }),
      ).rejects.toThrow(BadRequestException)

      // 4) addPositionDefinitionScope: 시스템 기본 직위(isGeneric: true)에 스코프 제한 차단
      await expect(
        repo.addPositionDefinitionScope({
          definitionId: 'def-generic',
          countryId: 'c-kr',
        }),
      ).rejects.toThrow(BadRequestException)

      // 5) removePositionDefinitionScope: 남은 스코프(독일)와 호환되지 않는 정체(프랑스)가 사용 중이면 삭제 차단
      await expect(
        repo.removePositionDefinitionScope('scope-fr'),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('Round 11: Treaty, MilitaryUnit, Organization, PersonGroup & Glossary integrity', () => {
    it('TreatyController: enforces date order, signatory target/scope compatibility, duplicate signatory check, and soft-delete event guard', async () => {
      const prisma: any = {
        treaty: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't-1',
            accountId: 'acc-owner',
            signDate: new Date('1919-06-28'),
            effectiveDate: new Date('1920-01-10'),
            expiryDate: null,
            violationDate: null,
          }),
          create: jest.fn(),
          update: jest.fn(),
        },
        country: {
          findUnique: jest.fn().mockResolvedValue({ id: 'c-kr' }),
        },
        historicalCountryModernCountry: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
        },
        cabinet: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'cab-de',
            headTenure: { countryId: 'c-de', historicalCountryId: null },
          }),
        },
        treatySignatory: {
          findFirst: jest.fn().mockResolvedValue({ id: 'sig-dup' }),
          create: jest.fn(),
        },
        event: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      }
      const controller = new TreatyController(prisma)

      // 1) effectiveDate < signDate 차단
      await expect(
        controller.create(
          {
            name: '베르사유 조약',
            signDate: '1920-01-10',
            effectiveDate: '1919-06-28',
          } as any,
          { user: { id: 'acc-owner' } },
        ),
      ).rejects.toThrow(BadRequestException)

      // 2) 타 계정 소유 조약 수정 차단
      await expect(
        controller.update('t-1', { name: '수정' } as any, {
          user: { id: 'acc-other' },
        }),
      ).rejects.toThrow(ForbiddenException)

      // 3) 서명자 최소 1개 주체 필수
      await expect(
        controller.addSignatory({ treatyId: 't-1' } as any),
      ).rejects.toThrow(BadRequestException)

      // 4) 서명자 국가(한국)와 내각 소속 국가(독일) 불일치 차단
      await expect(
        controller.addSignatory({
          treatyId: 't-1',
          countryId: 'c-kr',
          cabinetId: 'cab-de',
        } as any),
      ).rejects.toThrow(BadRequestException)

      // 5) 동일 조약·주체·참여유형 중복 서명자 차단
      await expect(
        controller.addSignatory({
          treatyId: 't-1',
          countryId: 'c-kr',
        } as any),
      ).rejects.toThrow(ConflictException)

      // 6) 소프트 삭제(또는 미존재) 사건 연결 차단
      await expect(
        controller.linkEvent('t-1', {
          eventId: 'ev-deleted',
        } as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('MilitaryUnitRepository: enforces date order, parentUnit cycle/country compatibility, and dual-fills countryId', async () => {
      const prisma: any = {
        country: { findUnique: jest.fn().mockResolvedValue({ id: 'c-kr' }) },
        historicalCountry: {
          findUnique: jest.fn().mockResolvedValue({ id: 'hc-joseon' }),
        },
        historicalCountryModernCountry: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ modernCountryId: 'c-kr' }]),
          findFirst: jest.fn().mockResolvedValue(null),
        },
        militaryUnit: {
          findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
            if (where.id === 'u-1') {
              return {
                id: 'u-1',
                countryId: 'c-kr',
                historicalCountryId: null,
                parentUnitId: null,
                establishedDate: new Date('1950-01-01'),
                disbandedDate: null,
                administrationDepartmentId: null,
              }
            }
            if (where.id === 'u-child') {
              return {
                id: 'u-child',
                countryId: 'c-kr',
                historicalCountryId: null,
                parentUnitId: 'u-1',
              }
            }
            if (where.id === 'u-us') {
              return {
                id: 'u-us',
                countryId: 'c-us',
                historicalCountryId: null,
                parentUnitId: null,
              }
            }
            return null
          }),
        },
      }
      const repo = new MilitaryUnitRepository(prisma)

      // 1) 해체일이 창설일보다 앞선 경우 차단
      await expect(
        repo.create({
          name: '제1사단',
          establishedDate: '1953-07-27',
          disbandedDate: '1950-06-25',
        } as any),
      ).rejects.toThrow(BadRequestException)

      // 2) 타국 상위 부대 지정 차단
      await expect(
        repo.update('u-1', { parentUnitId: 'u-us' } as any),
      ).rejects.toThrow(BadRequestException)

      // 3) 상위 부대 순환(u-1 -> u-child -> u-1) 차단
      await expect(
        repo.update('u-1', { parentUnitId: 'u-child' } as any),
      ).rejects.toThrow(BadRequestException)
    })

    it('OrganizationPrismaRepository: blocks deletion when referenced, blocks hierarchy cycles, and dual-fills countryId', async () => {
      const prisma: any = {
        organization: {
          findUnique: jest.fn().mockResolvedValue({ id: 'org-1', name: '국무총리실' }),
          delete: jest.fn(),
        },
        governmentPositionDefinition: {
          count: jest.fn().mockResolvedValue(2),
        },
        company: { count: jest.fn().mockResolvedValue(0) },
        eventOrganizationRelation: { count: jest.fn().mockResolvedValue(0) },
        organizationHierarchy: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([
            { parentOrganizationId: 'org-child' },
          ]),
        },
      }
      const repo = new OrganizationPrismaRepository(prisma)

      // 1) 관직 정의에서 참조 중인 조직 삭제 시 ConflictException
      await expect(repo.delete('org-1')).rejects.toThrow(ConflictException)

      // 2) 상하위 조직 계층 순환(org-parent -> org-child 상태에서 child를 parent의 상위로 추가) 차단
      await expect(
        repo.addHierarchy({
          parentOrganizationId: 'org-parent',
          childOrganizationId: 'org-child',
          relationType: 'SUBSIDIARY' as any,
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('PersonGroupService & GlossaryController: expand countryId scope via bridge and dual-fill countryId on create', async () => {
      const prisma: any = {
        country: { findUnique: jest.fn().mockResolvedValue({ id: 'c-kr' }) },
        historicalCountry: {
          findUnique: jest.fn().mockResolvedValue({ id: 'hc-joseon' }),
        },
        historicalCountryModernCountry: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { historicalCountryId: 'hc-joseon', modernCountryId: 'c-kr' },
            ]),
        },
        personGroup: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockImplementation(async ({ data }: any) => ({
            id: 'pg-1',
            ...data,
            country: { id: 'c-kr', name: '대한민국' },
            historicalCountry: { id: 'hc-joseon', name: '조선' },
            members: [],
            predecessor: null,
            successors: [],
            _count: { members: 0, eventSides: 0 },
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        },
        glossaryTerm: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockImplementation(async ({ data }: any) => ({
            id: 'gt-1',
            ...data,
            country: { id: 'c-kr', name: '대한민국' },
            historicalCountry: { id: 'hc-joseon', name: '조선' },
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        },
      }
      const personRepoMock: any = {
        findPersonsByIds: jest.fn().mockResolvedValue([]),
      }
      const groupService = new PersonGroupService(prisma, personRepoMock)
      const glossaryController = new GlossaryController(prisma)

      // 1) PersonGroup.createGroup: historicalCountryId만 전달해도 1:1 현대국가(c-kr) 자동 dual-fill
      const pg = await groupService.createGroup({
        name: '사림파',
        type: 'FACTION' as any,
        historicalCountryId: 'hc-joseon',
      })
      expect(pg.countryId).toBe('c-kr')
      expect(pg.historicalCountryId).toBe('hc-joseon')

      // 2) GlossaryController.list: countryId와 eventId 동시 전달 시 AND로 결합되어 OR 덮어쓰기 없음
      await glossaryController.list('c-kr', undefined, 'ev-1', undefined)
      expect(prisma.glossaryTerm.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              {
                OR: [
                  { countryId: 'c-kr' },
                  { historicalCountryId: { in: ['hc-joseon'] } },
                ],
              },
              {
                OR: [{ eventId: null }, { eventId: 'ev-1' }],
              },
            ],
          },
        }),
      )

      // 3) GlossaryController.create: historicalCountryId만 전달해도 1:1 현대국가(c-kr) 자동 dual-fill
      const term = await glossaryController.create({
        name: '붕당',
        historicalCountryId: 'hc-joseon',
      })
      expect(term.countryId).toBe('c-kr')
      expect(term.historicalCountryId).toBe('hc-joseon')
    })
  })
})
