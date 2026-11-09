import { BadRequestException, ConflictException } from '@nestjs/common'
import { PoliticalSystemController } from './political-system.controller'
import { HistoricalCountryPrismaRepository } from '../../historical-country/infrastructure/historical-country.prisma.repository'
import { CountryPrismaRepository } from '../../country/infrastructure/country.prisma.repository'

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
  })
})
