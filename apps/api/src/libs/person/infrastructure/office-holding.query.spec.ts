import { BadRequestException, ConflictException } from '@nestjs/common'
import { asOfficeHolding, sortRegnalErasChronologically } from './office-holding.query'
import { PersonPrismaRepository } from './person.prisma.repository'

describe('office-holding.query', () => {
  it('sortRegnalErasChronologically: 기원전(BC) 연호를 연대 오름차순(140 BC -> 134 BC -> 128 BC)으로 정렬한다', () => {
    const eras = [
      { id: '3', eraName: '원삭', startEra: 'BC', startYear: 128, startMonth: 1, startDay: 1 },
      { id: '1', eraName: '건원', startEra: 'BC', startYear: 140, startMonth: 1, startDay: 1 },
      { id: '2', eraName: '원광', startEra: 'BC', startYear: 134, startMonth: 1, startDay: 1 },
    ]
    const sorted = sortRegnalErasChronologically(eras)
    expect(sorted?.map((e) => e.eraName)).toEqual(['건원', '원광', '원삭'])
  })

  it('sortRegnalErasChronologically: 같은 연도 내 개원(월·일 차이)도 오름차순으로 정렬한다', () => {
    const eras = [
      { id: '2', eraName: '레이와', startEra: 'AD', startYear: 2019, startMonth: 5, startDay: 1 },
      { id: '1', eraName: '헤이세이', startEra: 'AD', startYear: 2019, startMonth: 1, startDay: 1 },
    ]
    const sorted = sortRegnalErasChronologically(eras)
    expect(sorted?.map((e) => e.eraName)).toEqual(['헤이세이', '레이와'])
  })

  it('asOfficeHolding: 기원전 재임의 startDate/endDate 부호 날짜 복원 및 regnalEras 정렬을 수행한다', () => {
    const holding = asOfficeHolding({
      id: 't-bc',
      startDate: null,
      startEra: 'BC',
      startYear: 141,
      startMonth: 3,
      startDay: 9,
      endDate: null,
      endEra: 'BC',
      endYear: 87,
      endMonth: 3,
      endDay: null,
      positionDefinition: { isMonarchical: true },
      regnalEras: [
        { id: '2', eraName: '원광', startEra: 'BC', startYear: 134 },
        { id: '1', eraName: '건원', startEra: 'BC', startYear: 140 },
      ],
    })
    expect(holding.isMonarchical).toBe(true)
    expect(holding.startDate).toBe('-0141-03-09')
    expect(holding.endDate).toBe('-0087-03-01')
    expect(holding.endDatePrecision).toBe('month')
    expect(holding.regnalEras?.map((e: any) => e.eraName)).toEqual(['건원', '원광'])
  })

  describe('PersonPrismaRepository Round 6 integrity guards', () => {
    it('deletePositionDefinition: blocks deleting generic definitions or definitions referenced by tenures/political systems', async () => {
      const prisma: any = {
        governmentPositionDefinition: {
          findUnique: jest.fn(),
          delete: jest.fn(),
        },
        governmentPositionTenure: { count: jest.fn().mockResolvedValue(0) },
        politicalSystem: { count: jest.fn().mockResolvedValue(0) },
        treatySignatory: { count: jest.fn().mockResolvedValue(0) },
      }
      const repo = new PersonPrismaRepository(prisma)

      prisma.governmentPositionDefinition.findUnique.mockResolvedValueOnce({
        id: 'def-generic',
        title: '기타 국가원수',
        isGeneric: true,
      })
      await expect(repo.deletePositionDefinition('def-generic')).rejects.toThrow(
        BadRequestException,
      )

      prisma.governmentPositionDefinition.findUnique.mockResolvedValueOnce({
        id: 'def-used',
        title: '영의정',
        isGeneric: false,
      })
      prisma.governmentPositionTenure.count.mockResolvedValueOnce(3)
      await expect(repo.deletePositionDefinition('def-used')).rejects.toThrow(
        ConflictException,
      )
      expect(prisma.governmentPositionDefinition.delete).not.toHaveBeenCalled()
    })

    it('addPositionDefinitionScope: blocks narrowing a global definition used in Country A to incompatible Country B', async () => {
      const prisma: any = {
        country: { findUnique: jest.fn().mockResolvedValue({ id: 'country-fr' }) },
        historicalCountry: { findUnique: jest.fn() },
        historicalCountryModernCountry: { findFirst: jest.fn().mockResolvedValue(null) },
        governmentPositionDefinitionScope: {
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn(),
        },
        governmentPositionTenure: {
          findMany: jest.fn().mockResolvedValue([
            { countryId: 'country-kr', historicalCountryId: 'hc-joseon' },
          ]),
        },
      }
      const repo = new PersonPrismaRepository(prisma)

      await expect(
        repo.addPositionDefinitionScope({
          definitionId: 'def-1',
          countryId: 'country-fr',
        }),
      ).rejects.toThrow(BadRequestException)
      expect(prisma.governmentPositionDefinitionScope.create).not.toHaveBeenCalled()
    })

    it('deleteGovernmentPositionTenure: cleans up head cabinet, detaches members, and deletes empty linkageGroup', async () => {
      const prisma: any = {
        cabinet: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'cab-1',
            linkageGroupId: 'grp-1',
          }),
          delete: jest.fn().mockResolvedValue({ id: 'cab-1' }),
          count: jest.fn().mockResolvedValue(0),
        },
        cabinetLinkageGroup: {
          delete: jest.fn().mockResolvedValue({ id: 'grp-1' }),
        },
        governmentPositionTenure: {
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          delete: jest.fn().mockResolvedValue({ id: 'tenure-head' }),
        },
      }
      prisma.$transaction = jest.fn((cb: any) => cb(prisma))
      const repo = new PersonPrismaRepository(prisma)

      await repo.deleteGovernmentPositionTenure('tenure-head')

      expect(prisma.governmentPositionTenure.updateMany).toHaveBeenCalledWith({
        where: { cabinetId: 'cab-1' },
        data: { cabinetId: null },
      })
      expect(prisma.cabinet.delete).toHaveBeenCalledWith({
        where: { id: 'cab-1' },
      })
      expect(prisma.cabinetLinkageGroup.delete).toHaveBeenCalledWith({
        where: { id: 'grp-1' },
      })
      expect(prisma.governmentPositionTenure.delete).toHaveBeenCalledWith({
        where: { id: 'tenure-head' },
      })
    })
  })
})
