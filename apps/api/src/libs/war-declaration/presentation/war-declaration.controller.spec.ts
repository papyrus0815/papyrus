import { BadRequestException } from '@nestjs/common'

import { PoliticalSystemController } from '../../political-system/presentation/political-system.controller'
import { WarDeclarationController } from './war-declaration.controller'

describe('WarDeclarationController & PoliticalSystem War-Power Integration', () => {
  it('rejects missing party, dual-FK party, self-declaration, and inverted dates', async () => {
    const prisma: any = {
      country: {
        findUnique: jest.fn(({ where }: any) =>
          Promise.resolve({ id: where.id, name: `Country-${where.id}` }),
        ),
      },
      historicalCountry: {
        findUnique: jest.fn(({ where }: any) =>
          Promise.resolve({ id: where.id, name: `Hist-${where.id}` }),
        ),
      },
    }
    const controller = new WarDeclarationController(prisma)

    await expect(
      controller.create(
        {
          declaringCountryId: 'c1',
          declaringHistoricalCountryId: 'h1',
          targetCountryId: 'c2',
        },
        { user: { id: 'u1' } },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)

    await expect(
      controller.create(
        {
          declaringHistoricalCountryId: 'h1',
          targetHistoricalCountryId: 'h1',
        },
        { user: { id: 'u1' } },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)

    await expect(
      controller.create(
        {
          declaringHistoricalCountryId: 'h1',
          targetHistoricalCountryId: 'h2',
          declaredYear: 1918,
          endedYear: 1914,
        },
        { user: { id: 'u1' } },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('creates canonical WarDeclaration, creates inline narrative event, syncs INITIATOR/TARGET, and backfills parent war join date', async () => {
    const createdRelations: any[] = []
    let updatedWarParticipant: any = null

    const prisma: any = {
      country: { findUnique: jest.fn() },
      historicalCountry: {
        findUnique: jest.fn(({ where }: any) =>
          Promise.resolve(
            where.id === 'hc-sardinia'
              ? { id: 'hc-sardinia', name: '사르데냐 왕국' }
              : { id: 'hc-russia', name: '러시아 제국' },
          ),
        ),
      },
      governmentPositionTenure: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ten-cavour',
          personId: 'p-cavour',
          cabinetId: 'cab-cavour',
        }),
      },
      cabinet: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cab-cavour' }),
      },
      chamber: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ch-subalpine' }),
      },
      event: {
        findUnique: jest.fn(({ where }: any) => {
          if (where.id === 'war-crimea') {
            return Promise.resolve({
              id: 'war-crimea',
              kind: 'COLLECTION',
              deletedAt: null,
              startEra: 'AD',
              startYear: 1853,
              startMonth: 10,
              startDay: 16,
            })
          }
          return Promise.resolve(null)
        }),
        create: jest.fn().mockResolvedValue({ id: 'ev-narr-new' }),
      },
      warDeclaration: {
        create: jest.fn(({ data }: any) =>
          Promise.resolve({
            id: 'wd-1',
            ...data,
            declaringCountry: null,
            declaringHistoricalCountry: {
              id: 'hc-sardinia',
              name: '사르데냐 왕국',
              thumbnailUrl: null,
            },
            targetCountry: null,
            targetHistoricalCountry: {
              id: 'hc-russia',
              name: '러시아 제국',
              thumbnailUrl: null,
            },
            cabinet: { id: 'cab-cavour', name: '카보우르 내각' },
            decidedByPerson: {
              id: 'p-cavour',
              name: '카밀로',
              surname: '카보우르',
              middleName: null,
              nameDisplayOrder: 'WESTERN',
              profileImageUrl: null,
              country: null,
            },
            decidedByTenure: {
              id: 'ten-cavour',
              title: '총리',
              rankTitle: null,
              positionType: 'HEAD_OF_GOVERNMENT',
              positionDefinition: null,
            },
            approvedChamber: {
              id: 'ch-subalpine',
              name: '사르데냐 하원',
              shortName: null,
              localName: null,
              role: 'LOWER',
            },
            warEvent: {
              id: 'war-crimea',
              title: '크림 전쟁',
              domain: 'MILITARY',
              type: 'WAR',
              startDate: new Date('1853-10-16T00:00:00.000Z'),
              startEra: 'AD',
              startYear: 1853,
              startMonth: 10,
              startDay: 16,
              endDate: null,
              endEra: null,
              endYear: null,
              endMonth: null,
              endDay: null,
              deletedAt: null,
            },
            narrativeEvent: {
              id: 'ev-narr-new',
              title: '사르데냐 왕국의 대(對)러시아 제국 참전 선언',
              description: '동맹 협약에 따른 파병 결정',
              domain: 'DIPLOMACY',
              type: 'WAR_DECLARATION',
              startDate: new Date('1855-01-26T00:00:00.000Z'),
              startEra: 'AD',
              startYear: 1855,
              startMonth: 1,
              startDay: 26,
              endDate: null,
              endEra: null,
              endYear: null,
              endMonth: null,
              endDay: null,
              deletedAt: null,
            },
            peaceTreaty: null,
            createdAt: new Date('2026-11-28T00:00:00.000Z'),
            updatedAt: new Date('2026-11-28T00:00:00.000Z'),
          }),
        ),
      },
      eventCountryRelation: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(({ data }: any) => {
          createdRelations.push(data)
          return Promise.resolve({ id: `rel-${createdRelations.length}`, ...data })
        }),
        findFirst: jest.fn().mockResolvedValue({
          id: 'war-rel-sardinia',
          joinYear: null,
          joinReason: null,
        }),
        update: jest.fn(({ data }: any) => {
          updatedWarParticipant = data
          return Promise.resolve({ id: 'war-rel-sardinia', ...data })
        }),
      },
    }

    const controller = new WarDeclarationController(prisma)
    const res = await controller.create(
      {
        declaringHistoricalCountryId: 'hc-sardinia',
        targetHistoricalCountryId: 'hc-russia',
        kind: 'ALLIANCE_ENTRY',
        casusBelli: '영·프 동맹 협약 체결 및 파병',
        declaredYear: 1855,
        declaredMonth: 1,
        declaredDay: 26,
        decidedByTenureId: 'ten-cavour',
        approvedChamberId: 'ch-subalpine',
        yeas: 95,
        nays: 64,
        warEventId: 'war-crimea',
        createNarrativeEvent: {
          description: '동맹 협약에 따른 파병 결정',
          domain: 'DIPLOMACY',
        },
      },
      { user: { id: 'user-1' } },
    )

    expect(res.displayTitle).toBe('사르데냐 왕국의 대(對)러시아 제국 참전 선언')
    expect(res.cabinet?.id).toBe('cab-cavour')
    expect(res.narrativeEventId).toBe('ev-narr-new')
    expect(createdRelations).toEqual([
      expect.objectContaining({
        eventId: 'ev-narr-new',
        historicalCountryId: 'hc-sardinia',
        role: 'INITIATOR',
      }),
      expect.objectContaining({
        eventId: 'ev-narr-new',
        historicalCountryId: 'hc-russia',
        role: 'TARGET',
      }),
    ])
    expect(updatedWarParticipant).toMatchObject({
      joinEra: 'AD',
      joinYear: 1855,
      joinMonth: 1,
      joinDay: 26,
      joinReason: '영·프 동맹 협약 체결 및 파병',
    })
  })

  it('lists declarations scoped to modern country + bridged historical countries in ISSUED/RECEIVED directions', async () => {
    const findManyMock = jest.fn().mockResolvedValue([])
    const prisma: any = {
      historicalCountryModernCountry: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ historicalCountryId: 'hc-german-empire' }]),
      },
      warDeclaration: {
        findMany: findManyMock,
      },
    }
    const controller = new WarDeclarationController(prisma)
    await controller.list('mod-germany', undefined, undefined, 'RECEIVED')

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { targetCountryId: 'mod-germany' },
                { targetHistoricalCountryId: { in: ['hc-german-empire'] } },
              ],
            },
          ],
        },
      }),
    )
  })

  it('PoliticalSystemController persists warPowerAuthority, commanderInChiefPositionId, warConsentChamberId and clears consent chamber on NONE legislature', async () => {
    let savedData: any = null
    const prisma: any = {
      country: { findUnique: jest.fn().mockResolvedValue({ id: 'c-jp' }) },
      governmentPositionDefinition: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'pos-emperor',
            title: '천황',
            isGeneric: false,
            positionType: 'HEAD_OF_STATE',
            administrationDepartment: null,
            scopes: [],
          },
        ]),
      },
      chamber: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ch-peers',
          name: '귀족원',
          localName: null,
        }),
      },
      politicalSystem: {
        create: jest.fn(({ data }: any) => {
          savedData = data
          return Promise.resolve({
            id: 'ps-meiji',
            ...data,
            country: { id: 'c-jp', name: '일본' },
            historicalCountry: null,
            headOfStatePosition: null,
            headOfGovernmentPosition: null,
            commanderInChiefPosition: {
              id: 'pos-emperor',
              title: '천황',
              titleLocal: null,
              positionType: 'HEAD_OF_STATE',
            },
            lowerChamber: null,
            upperChamber: null,
            warConsentChamber: null,
            constitutionLaw: null,
            foundingEvent: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }),
      },
    }

    const controller = new PoliticalSystemController(prisma)
    await controller.create(
      {
        countryId: 'c-jp',
        name: '대일본제국 헌법 체제',
        legislatureType: 'NONE',
        warPowerAuthority: 'MONARCH_PREROGATIVE',
        warConsentChamberId: 'ch-peers',
        commanderInChiefPositionId: 'pos-emperor',
        warPowerNotes: '헌법 제11조 통수대권 및 제13조 선전·강화 대권',
      },
      { user: { id: 'u1' } },
    )

    expect(savedData).toMatchObject({
      warPowerAuthority: 'MONARCH_PREROGATIVE',
      warConsentChamberId: null,
      commanderInChiefPositionId: 'pos-emperor',
      warPowerNotes: '헌법 제11조 통수대권 및 제13조 선전·강화 대권',
    })
  })

  it('creates atomic batch declarations for multi-target simultaneous war declarations and syncs early withdrawal to parent war', async () => {
    const createdPayloads: any[] = []
    const updatedParticipants: any[] = []
    const prisma: any = {
      country: { findUnique: jest.fn() },
      historicalCountry: {
        findUnique: jest.fn(({ where: { id } }: any) => {
          const names: Record<string, string> = {
            'hc-fr-1r': '프랑스 제1공화국',
            'hc-gb': '그레이트브리튼 왕국',
            'hc-nl': '네덜란드 공화국',
          }
          return Promise.resolve(names[id] ? { id, name: names[id] } : null)
        }),
      },
      event: {
        findUnique: jest.fn(({ where: { id } }: any) => {
          if (id === 'war-1c') {
            return Promise.resolve({
              id: 'war-1c',
              kind: 'COLLECTION',
              deletedAt: null,
              startEra: 'AD',
              startYear: 1792,
              startMonth: 4,
              startDay: 20,
              endEra: 'AD',
              endYear: 1797,
              endMonth: 10,
              endDay: 17,
            })
          }
          if (id === 'ult-1') {
            return Promise.resolve({ id: 'ult-1', deletedAt: null })
          }
          if (id === 'ev-shared-narr') {
            return Promise.resolve({ id: 'ev-shared-narr', deletedAt: null })
          }
          return Promise.resolve(null)
        }),
        create: jest.fn().mockResolvedValue({ id: 'ev-shared-narr' }),
      },
      eventCountryRelation: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue({
          id: 'ecr-1',
          joinYear: null,
          joinReason: null,
          withdrawYear: null,
          withdrawReason: null,
        }),
        update: jest.fn(({ data }: any) => {
          updatedParticipants.push(data)
          return Promise.resolve({})
        }),
      },
      warDeclaration: {
        create: jest.fn(({ data }: any) => {
          createdPayloads.push(data)
          return Promise.resolve({
            id: `wd-${createdPayloads.length}`,
            ...data,
            declaringCountry: null,
            declaringHistoricalCountry: { id: 'hc-fr-1r', name: '프랑스 제1공화국' },
            targetCountry: null,
            targetHistoricalCountry: {
              id: data.targetHistoricalCountryId,
              name:
                data.targetHistoricalCountryId === 'hc-gb'
                  ? '그레이트브리튼 왕국'
                  : '네덜란드 공화국',
            },
            cabinet: null,
            decidedByPerson: null,
            decidedByTenure: null,
            approvedChamber: null,
            warEvent: {
              id: 'war-1c',
              title: '제1차 대불동맹 전쟁',
              startDate: null,
              startEra: 'AD',
              startYear: 1792,
              startMonth: 4,
              startDay: 20,
              deletedAt: null,
            },
            ultimatumEvent: {
              id: 'ult-1',
              title: '외교 통첩',
              startDate: null,
              startEra: 'AD',
              startYear: 1793,
              startMonth: 1,
              startDay: 24,
              deletedAt: null,
            },
            narrativeEvent: {
              id: 'ev-shared-narr',
              title: '프랑스의 대영·네덜란드 선전포고',
              startDate: null,
              startEra: 'AD',
              startYear: 1793,
              startMonth: 2,
              startDay: 1,
              deletedAt: null,
            },
            peaceTreaty: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'wd-1',
          declaringCountryId: null,
          declaringHistoricalCountryId: 'hc-fr-1r',
          targetCountryId: null,
          targetHistoricalCountryId: 'hc-nl',
          kind: 'FORMAL_DECLARATION',
          declaredEra: 'AD',
          declaredYear: 1793,
          declaredMonth: 2,
          declaredDay: 1,
          declaredPrecision: 'day',
          warEventId: 'war-1c',
          ultimatumEventId: 'ult-1',
          narrativeEventId: 'ev-shared-narr',
          accountId: 'u1',
        }),
        update: jest.fn(({ data }: any) =>
          Promise.resolve({
            id: 'wd-1',
            ...data,
            declaringCountry: null,
            declaringHistoricalCountry: { id: 'hc-fr-1r', name: '프랑스 제1공화국' },
            targetCountry: null,
            targetHistoricalCountry: { id: 'hc-nl', name: '네덜란드 공화국' },
            cabinet: null,
            decidedByPerson: null,
            decidedByTenure: null,
            approvedChamber: null,
            warEvent: null,
            ultimatumEvent: null,
            narrativeEvent: null,
            peaceTreaty: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
      },
    }

    const controller = new WarDeclarationController(prisma)
    const batchRes = await controller.createBatch(
      {
        declaringParties: [{ historicalCountryId: 'hc-fr-1r' }],
        targetParties: [
          { historicalCountryId: 'hc-gb' },
          { historicalCountryId: 'hc-nl' },
        ],
        kind: 'FORMAL_DECLARATION',
        declaredEra: 'AD',
        declaredYear: 1793,
        declaredMonth: 2,
        declaredDay: 1,
        warEventId: 'war-1c',
        ultimatumEventId: 'ult-1',
        createNarrativeEvent: {
          title: '프랑스의 대영·네덜란드 선전포고',
          domain: 'DIPLOMACY',
        },
      },
      { user: { id: 'u1' } },
    )

    expect(batchRes).toHaveLength(2)
    expect(createdPayloads).toHaveLength(2)
    expect(createdPayloads[0].narrativeEventId).toBe('ev-shared-narr')
    expect(createdPayloads[1].narrativeEventId).toBe('ev-shared-narr')
    expect(createdPayloads[0].ultimatumEventId).toBe('ult-1')

    await controller.update(
      'wd-1',
      {
        terminationKind: 'PEACE_TREATY',
        endedEra: 'AD',
        endedYear: 1795,
        endedMonth: 5,
        endedDay: 16,
        terminationNote: '헤이그 조약 체결',
      },
      { user: { id: 'u1' } },
    )

    expect(updatedParticipants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          withdrawEra: 'AD',
          withdrawYear: 1795,
          withdrawMonth: 5,
          withdrawDay: 16,
          withdrawReason: '헤이그 조약 체결',
        }),
      ]),
    )
  })
})
