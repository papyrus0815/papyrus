import { computeTransitionSuccessorDiff } from './transition-diff.util'

describe('computeTransitionSuccessorDiff (F11 계승 diff)', () => {
  it('변경 없음: desired == existing이면 삭제·추가 모두 없음(기존 행 보존)', () => {
    const existing = [
      { id: 't1', successorId: 'A' },
      { id: 't2', successorId: 'B' },
    ]
    expect(computeTransitionSuccessorDiff(existing, ['A', 'B'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: [],
    })
  })

  it('순서만 다르고 집합이 같으면 no-op (평탄화·id 재발급 방지)', () => {
    const existing = [
      { id: 't1', successorId: 'A' },
      { id: 't2', successorId: 'B' },
    ]
    expect(computeTransitionSuccessorDiff(existing, ['B', 'A'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: [],
    })
  })

  it('추가만: 새 후임만 successorIdsToAdd에, 기존은 삭제되지 않음', () => {
    const existing = [{ id: 't1', successorId: 'A' }]
    expect(computeTransitionSuccessorDiff(existing, ['A', 'B', 'C'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: ['B', 'C'],
    })
  })

  it('삭제만: 빠진 후임의 transition id만 삭제 대상', () => {
    const existing = [
      { id: 't1', successorId: 'A' },
      { id: 't2', successorId: 'B' },
      { id: 't3', successorId: 'C' },
    ]
    expect(computeTransitionSuccessorDiff(existing, ['B'])).toEqual({
      transitionIdsToDelete: ['t1', 't3'],
      successorIdsToAdd: [],
    })
  })

  it('혼합: 일부 삭제 + 일부 추가, 남는 행은 건드리지 않음', () => {
    const existing = [
      { id: 't1', successorId: 'A' },
      { id: 't2', successorId: 'B' },
    ]
    // A 유지, B 삭제, C 추가
    expect(computeTransitionSuccessorDiff(existing, ['A', 'C'])).toEqual({
      transitionIdsToDelete: ['t2'],
      successorIdsToAdd: ['C'],
    })
  })

  it('전체 해제: desired가 빈 배열이면 모두 삭제', () => {
    const existing = [
      { id: 't1', successorId: 'A' },
      { id: 't2', successorId: 'B' },
    ]
    expect(computeTransitionSuccessorDiff(existing, [])).toEqual({
      transitionIdsToDelete: ['t1', 't2'],
      successorIdsToAdd: [],
    })
  })

  it('최초 저작: existing이 비었으면 desired 전부 추가', () => {
    expect(computeTransitionSuccessorDiff([], ['A', 'B'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: ['A', 'B'],
    })
  })

  it('desired 중복은 제거하고 추가는 한 번만(브리지 unique 부재 방어)', () => {
    expect(computeTransitionSuccessorDiff([], ['A', 'A', 'B'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: ['A', 'B'],
    })
  })

  it('이미 존재하는 후임이 desired에 중복으로 와도 추가하지 않음', () => {
    const existing = [{ id: 't1', successorId: 'A' }]
    expect(computeTransitionSuccessorDiff(existing, ['A', 'A'])).toEqual({
      transitionIdsToDelete: [],
      successorIdsToAdd: [],
    })
  })
})

import { BadRequestException, ConflictException } from '@nestjs/common'
import { HistoricalCountryTransitionPrismaRepository } from '../infrastructure/historical-country-transition.prisma.repository'
import { HistoricalCountryController } from '../presentation/historical-country.controller'
import { CountryPrismaRepository } from '../../country/infrastructure/country.prisma.repository'
import { CabinetPoliticalPartyController } from '../../election/presentation/cabinet-political-party.controller'

describe('Round 7 데이터 정합성 및 가드 검증', () => {
  it('HistoricalCountryTransitionPrismaRepository.create: 동일한 (predecessorId, successorId) 중복 생성 시 ConflictException을 던진다', async () => {
    const mockPrisma = {
      historicalCountryTransition: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 'existing-t1' }),
        create: jest.fn(),
      },
    }
    const repo = new HistoricalCountryTransitionPrismaRepository(mockPrisma as any)

    await expect(
      repo.create({
        predecessorId: 'hc-1',
        successorId: 'hc-2',
        eventType: 'SUCCESSION' as any,
      }),
    ).rejects.toThrow(ConflictException)
  })

  it('HistoricalCountryController.getFoundingSummary: 같은 해(startYear)에 즉위한 여러 수반을 월·일·대수 순으로 정렬해 초대와 마지막 수반을 정확히 산출한다', async () => {
    const mockPrisma = {
      historicalCountry: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'hc-rome-69',
          foundingNote: null,
          dissolutionNote: null,
          startEra: 'AD',
          startYear: 69,
          endEra: 'AD',
          endYear: 69,
        }),
      },
      governmentPositionTenure: {
        findMany: jest
          .fn()
          // 1차 호출: reignRows (군주)
          .mockResolvedValueOnce([
            {
              id: 'reign-otho',
              regnalName: '오토',
              title: '황제',
              ordinal: 7,
              startEra: 'AD',
              startYear: 69,
              startMonth: 1,
              startDay: 15,
              startDate: null,
              endEra: 'AD',
              endYear: 69,
              endMonth: 4,
              endDay: 16,
              endDate: null,
              positionDefinition: { title: '황제' },
              person: { id: 'p-otho', name: '오토', surname: null, middleName: null, nameDisplayOrder: null, profileImageUrl: null },
            },
            {
              id: 'reign-galba',
              regnalName: '갈바',
              title: '황제',
              ordinal: 6,
              startEra: 'AD',
              startYear: 69,
              startMonth: 1,
              startDay: 1,
              startDate: null,
              endEra: 'AD',
              endYear: 69,
              endMonth: 1,
              endDay: 15,
              endDate: null,
              positionDefinition: { title: '황제' },
              person: { id: 'p-galba', name: '갈바', surname: null, middleName: null, nameDisplayOrder: null, profileImageUrl: null },
            },
            {
              id: 'reign-vespasian',
              regnalName: '베스파시아누스',
              title: '황제',
              ordinal: 9,
              startEra: 'AD',
              startYear: 69,
              startMonth: 7,
              startDay: 1,
              startDate: null,
              endEra: 'AD',
              endYear: 79,
              endMonth: 6,
              endDay: 23,
              endDate: null,
              positionDefinition: { title: '황제' },
              person: { id: 'p-vesp', name: '베스파시아누스', surname: null, middleName: null, nameDisplayOrder: null, profileImageUrl: null },
            },
          ])
          // 2차 호출: 비군주 수반
          .mockResolvedValueOnce([]),
      },
      historicalCountryTransition: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      historicalCountryStatehoodAgent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    }
    const mockService = {
      getHistoricalCountryById: jest.fn().mockResolvedValue({ id: 'hc-rome-69' }),
    }
    const controller = new HistoricalCountryController(
      mockService as any,
      mockPrisma as any,
    )

    const summary = await controller.getFoundingSummary('hc-rome-69', {
      user: { id: 'acc-1' },
    })

    expect(mockService.getHistoricalCountryById).toHaveBeenCalledWith(
      'hc-rome-69',
      'acc-1',
    )
    expect(summary.firstRulers[0]?.recordId).toBe('reign-galba')
    expect(summary.lastRulers[0]?.recordId).toBe('reign-vespasian')
  })

  it('CountryPrismaRepository: findHistoricalCountriesByModernCountryId에서 linkKind를 부착하고 0 좌표를 보존한다', async () => {
    const mockPrisma = {
      historicalCountryModernCountry: {
        findMany: jest.fn().mockResolvedValue([
          {
            historicalCountry: {
              id: 'hc-1',
              name: '고려',
              enName: 'Goryeo',
              thumbnailUrl: null,
              stateType: 'KINGDOM',
              startEra: 'AD',
              startYear: 918,
              startMonth: null,
              startDay: null,
              endEra: 'AD',
              endYear: 1392,
              endMonth: null,
              endDay: null,
              latitude: 0,
              longitude: 0,
            },
          },
        ]),
      },
      historicalCountryTransition: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      historicalCountryMembership: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    }
    const repo = new CountryPrismaRepository(mockPrisma as any)

    const list = await repo.findHistoricalCountriesByModernCountryId('modern-kr')

    expect(list).toHaveLength(1)
    expect(list[0].latitude).toBe(0)
    expect(list[0].longitude).toBe(0)
    expect(list[0].linkKind).toBe('HERITAGE')
  })

  it('CabinetPoliticalPartyController.create: 동일 정당 중복 연결 시 ConflictException, 서로 다른 역사국가 선거 연결 시 BadRequestException을 던진다', async () => {
    const mockPrisma = {
      cabinet: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cab-1',
          accountId: 'acc-1',
          headTenure: {
            countryId: 'kr',
            historicalCountryId: 'hist-joseon',
          },
        }),
      },
      politicalParty: {
        findUnique: jest.fn().mockResolvedValue({ id: 'party-1' }),
      },
      cabinetPoliticalParty: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'existing-link' }),
      },
      electionPartyResult: {
        findUnique: jest.fn(),
      },
      historicalCountryModernCountry: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    }
    const controller = new CabinetPoliticalPartyController(mockPrisma as any)
    const req = { user: { id: 'acc-1' } } as any

    // 1. 이미 같은 정당이 연결된 경우 409
    await expect(
      controller.create('cab-1', req, {
        partyId: 'party-1',
        role: 'RULING',
      }),
    ).rejects.toThrow(ConflictException)

    // 2. 같은 현대국(countryId: 'kr')으로 dual-fill되어 있어도 historicalCountryId가 다르면(고려 vs 조선) 400 차단
    mockPrisma.cabinetPoliticalParty.findFirst.mockResolvedValue(null)
    mockPrisma.electionPartyResult.findUnique.mockResolvedValue({
      id: 'epr-1',
      partyId: 'party-1',
      election: {
        id: 'elec-1',
        countryId: 'kr',
        historicalCountryId: 'hist-goryeo',
      },
    })

    await expect(
      controller.create('cab-1', req, {
        partyId: 'party-1',
        role: 'RULING',
        electionPartyResultId: 'epr-1',
      }),
    ).rejects.toThrow(BadRequestException)
  })
})

import { DynastyService } from '../../dynasty/application/dynasty.service'
import { HistoricalCountryMembershipPrismaRepository } from '../infrastructure/historical-country-membership.prisma.repository'
import { HistoricalCountryRelationPrismaRepository } from '../infrastructure/historical-country-relation.prisma.repository'
import { PersonPrismaRepository } from '../../person/infrastructure/person.prisma.repository'

describe('Round 8 데이터 정합성 및 가드 검증', () => {
  it('DynastyService: 기간 역전 시 BadRequestException, 통치기록 중복 시 ConflictException, 상세 조회 시 기원전(BC) 통치기록을 시간순 정렬한다', async () => {
    const mockDynastyRepo = {
      findById: jest.fn().mockResolvedValue({
        id: 'dyn-1',
        name: '유씨(한)',
        startEra: 'BC',
        startYear: 202,
      }),
    }
    const mockPrisma = {
      historicalCountry: {
        findUnique: jest.fn().mockResolvedValue({ id: 'hc-han' }),
      },
      dynastyRule: {
        findFirst: jest.fn().mockResolvedValue({ id: 'rule-dup' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r-later',
            historicalCountryId: 'hc-later',
            historicalCountry: { id: 'hc-later', name: '후한' },
            startEra: 'AD',
            startYear: 25,
            startMonth: null,
            startDay: null,
            endEra: 'AD',
            endYear: 220,
            endMonth: null,
            endDay: null,
            startReason: null,
            endReason: null,
            notes: null,
          },
          {
            id: 'r-bc-57',
            historicalCountryId: 'hc-silla',
            historicalCountry: { id: 'hc-silla', name: '신라' },
            startEra: 'BC',
            startYear: 57,
            startMonth: null,
            startDay: null,
            endEra: 'AD',
            endYear: 935,
            endMonth: null,
            endDay: null,
            startReason: null,
            endReason: null,
            notes: null,
          },
          {
            id: 'r-bc-202',
            historicalCountryId: 'hc-han',
            historicalCountry: { id: 'hc-han', name: '전한' },
            startEra: 'BC',
            startYear: 202,
            startMonth: null,
            startDay: null,
            endEra: 'AD',
            endYear: 8,
            endMonth: null,
            endDay: null,
            startReason: null,
            endReason: null,
            notes: null,
          },
        ]),
        create: jest.fn(),
      },
      dynastyModernRule: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      person: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    }
    const service = new DynastyService(
      mockDynastyRepo as any,
      mockPrisma as any,
      {} as any,
    )

    // 1. 기간 역전 차단 (AD 1392 ~ AD 1200)
    await expect(
      service.create({
        name: '역전 가문',
        startEra: 'AD' as any,
        startYear: 1392,
        endEra: 'AD' as any,
        endYear: 1200,
      }),
    ).rejects.toThrow(BadRequestException)

    // 2. 중복 역사국가 통치기록 등록 차단
    await expect(
      service.createHistoricalRule('dyn-1', {
        historicalCountryId: 'hc-han',
        startEra: 'BC' as any,
        startYear: 202,
      }),
    ).rejects.toThrow(ConflictException)

    // 3. findDetail에서 BC 202 -> BC 57 -> AD 25 순으로 정렬 확인
    const detail = await service.findDetail('dyn-1')
    expect(detail.historicalRules.map((r) => r.id)).toEqual([
      'r-bc-202',
      'r-bc-57',
      'r-later',
    ])
  })

  it('HistoricalCountryMembership / Relation: 중복 생성 시 ConflictException, 관계 기간 역전 시 BadRequestException을 던진다', async () => {
    const mockPrisma = {
      historicalCountryMembership: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 'mem-1' }),
      },
      historicalCountryRelation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'rel-1' }),
      },
    }
    const memRepo = new HistoricalCountryMembershipPrismaRepository(mockPrisma as any)
    const relRepo = new HistoricalCountryRelationPrismaRepository(mockPrisma as any)

    await expect(
      memRepo.create({
        historicalCountryId: 'hc-parent',
        memberCountryId: 'hc-child',
        role: 'VASSAL' as any,
      }),
    ).rejects.toThrow(ConflictException)

    await expect(
      relRepo.create({
        subjectCountryId: 'hc-1',
        objectCountryId: 'hc-2',
        relationType: 'ALLIANCE' as any,
        startDate: new Date('1950-06-25T00:00:00.000Z'),
        endDate: new Date('1945-08-15T00:00:00.000Z'),
      }),
    ).rejects.toThrow(BadRequestException)

    await expect(
      relRepo.create({
        subjectCountryId: 'hc-1',
        objectCountryId: 'hc-2',
        relationType: 'ALLIANCE' as any,
      }),
    ).rejects.toThrow(ConflictException)
  })

  it('PersonPrismaRepository: 연호(RegnalEra) 중복·재임 기간 이탈 차단 및 소프트 삭제된 사건의 업적 노출을 방어한다', async () => {
    const mockPrisma = {
      governmentPositionTenure: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ten-1',
          startEra: 'AD',
          startYear: 1867,
          endEra: 'AD',
          endYear: 1912,
        }),
      },
      regnalEra: {
        findFirst: jest.fn().mockResolvedValueOnce({ id: 'era-dup' }).mockResolvedValue(null),
      },
      tenureAchievement: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ach-1',
            title: '업적1',
            eventId: 'ev-deleted',
            event: {
              id: 'ev-deleted',
              title: '삭제된 사건',
              deletedAt: new Date(),
            },
            tenure: null,
          },
        ]),
      },
    }
    const repo = new PersonPrismaRepository(mockPrisma as any)

    // 1. 동일 재임 내 동일 연호명 중복 차단
    await expect(
      repo.createRegnalEra(
        { tenureId: 'ten-1' },
        { eraName: '메이지', startYear: 1868 } as any,
      ),
    ).rejects.toThrow(ConflictException)

    // 2. 재임 시작 연도(1867)보다 앞선 연호 시작 연도(1850) 차단
    await expect(
      repo.createRegnalEra(
        { tenureId: 'ten-1' },
        { eraName: '겐지', startYear: 1850 } as any,
      ),
    ).rejects.toThrow(BadRequestException)

    // 3. 소프트 삭제된 사건은 event: null로 정제
    const achievements = await repo.findAchievementsForEventsPage()
    expect(achievements[0].event).toBeNull()
    expect(achievements[0].eventId).toBeNull()
  })
})
