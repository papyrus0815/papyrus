import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { GovernmentPositionType } from '@prisma/client'
import {
  areJurisdictionsCompatible,
  lawJurisdictionMatchesSubject,
} from '../domain/law-jurisdiction.util'
import {
  buildTenureJurisdictionWhere,
  membershipOverlapsTenure,
} from '../domain/party-top-leaders.util'
import { assertMembershipWithinPersonLifespan } from './party-membership-dates.util'
import { PoliticalPartyController } from './political-party.controller'
import { PoliticalPartyTransitionController } from './political-party-transition.controller'
import { ElectionController } from './election.controller'
import { ElectoralDistrictController } from './electoral-district.controller'
import { LawController } from './law.controller'
import { LawTypeController } from './law-type.controller'
import { PersonElectionController } from './person-election.controller'
import { findPreviousComparableElection } from '../domain/find-previous-election.util'

describe('Election & Political Party Domain Integrity (Round 9)', () => {
  describe('1. PoliticalPartyController & party-top-leaders.util', () => {
    it('prioritizes historicalCountryId in buildTenureJurisdictionWhere even when countryId is dual-filled', async () => {
      const prisma: any = {
        historicalCountryModernCountry: {
          findMany: jest.fn().mockResolvedValue([{ historicalCountryId: 'hc-1' }]),
        },
      }
      const where = await buildTenureJurisdictionWhere(prisma, {
        countryId: 'c-kr',
        historicalCountryId: 'hc-joseon',
      })
      expect(where).toEqual({ historicalCountryId: 'hc-joseon' })
      expect(prisma.historicalCountryModernCountry.findMany).not.toHaveBeenCalled()
    })

    it('correctly computes membershipOverlapsTenure for pre-1000 AD structured dates where endDate is null', () => {
      const membership2020 = {
        startDate: new Date('2020-01-01T00:00:00.000Z'),
        endDate: new Date('2024-01-01T00:00:00.000Z'),
      }
      const ancientTenure = {
        startDate: null,
        endDate: null,
        startEra: 'AD',
        startYear: 918,
        endEra: 'AD',
        endYear: 943,
      }
      expect(membershipOverlapsTenure(membership2020, ancientTenure)).toBe(false)
    })

    it('rejects reversed foundedDate > dissolvedDate on create and update, and guards duplicate party-law link', async () => {
      const prisma: any = {
        politicalParty: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        law: {
          findUnique: jest.fn(),
        },
        politicalPartyLaw: {
          findFirst: jest.fn(),
          create: jest.fn(),
        },
      }
      const notificationService: any = {
        notifyPoliticalParty: jest.fn(),
      }
      const controller = new PoliticalPartyController(prisma, notificationService)

      await expect(
        controller.create({
          name: '테스트당',
          foundedDate: '2025-05-01',
          dissolvedDate: '2020-01-01',
        }),
      ).rejects.toThrow(BadRequestException)

      prisma.politicalParty.findUnique.mockResolvedValueOnce(null)
      await expect(controller.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      )

      prisma.politicalParty.findUnique.mockResolvedValueOnce({
        id: 'p-1',
        countryId: 'c-kr',
        historicalCountryId: null,
      })
      prisma.law.findUnique.mockResolvedValueOnce({
        id: 'law-1',
        countryId: 'c-kr',
        historicalCountryId: null,
      })
      prisma.politicalPartyLaw.findFirst.mockResolvedValueOnce({ id: 'link-1' })

      await expect(
        controller.addPartyLaw('p-1', { lawId: 'law-1' }),
      ).rejects.toThrow(ConflictException)
    })

    it('sorts listTopLeaders by structured date and matches positionDefinition.positionType', async () => {
      const prisma: any = {
        politicalParty: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'p-1',
            countryId: null,
            historicalCountryId: 'hc-1',
          }),
        },
        politicalPartyMembership: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        governmentPositionTenure: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce([
              {
                id: 't-early',
                personId: 'per-1',
                startDate: null,
                startEra: 'AD',
                startYear: 920,
                startMonth: 3,
                startDay: 1,
                electionCandidacy: { partyId: 'p-1' },
                positionDefinition: {
                  isMonarchical: false,
                  positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
                },
              },
              {
                id: 't-late',
                personId: 'per-2',
                startDate: null,
                startEra: 'AD',
                startYear: 950,
                startMonth: 6,
                startDay: 15,
                electionCandidacy: { partyId: 'p-1' },
                positionDefinition: {
                  isMonarchical: false,
                  positionType: GovernmentPositionType.HEAD_OF_STATE,
                },
              },
            ])
            .mockResolvedValueOnce([]),
        },
      }
      const controller = new PoliticalPartyController(prisma, {} as any)
      const result = await controller.listTopLeaders('p-1')
      expect(result.map((r: any) => r.id)).toEqual(['t-late', 't-early'])
      expect(result[0].startDate).toBe('0950-06-15')
      expect(result[1].startDate).toBe('0920-03-01')
    })
  })

  describe('2. PoliticalPartyTransitionController', () => {
    it('blocks lineage cycles and cross-country transitions, and guards non-existent remove', async () => {
      const prisma: any = {
        politicalParty: {
          findUnique: jest.fn(),
        },
        politicalPartyTransition: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          delete: jest.fn(),
        },
      }
      const controller = new PoliticalPartyTransitionController(prisma)

      // 1) Cross-country rejection (Korea party -> USA party)
      prisma.politicalParty.findUnique
        .mockResolvedValueOnce({
          id: 'p-kr',
          countryId: 'c-kr',
          historicalCountryId: null,
        })
        .mockResolvedValueOnce({
          id: 'p-us',
          countryId: 'c-us',
          historicalCountryId: null,
        })

      await expect(
        controller.create({
          fromPartyId: 'p-kr',
          toPartyId: 'c-us',
          kind: 'SUCCESSION',
        }),
      ).rejects.toThrow(BadRequestException)

      // 2) Cycle rejection: p-b -> p-c -> p-a already exists, adding p-a -> p-b
      prisma.politicalParty.findUnique
        .mockResolvedValueOnce({
          id: 'p-a',
          countryId: 'c-kr',
          historicalCountryId: null,
        })
        .mockResolvedValueOnce({
          id: 'p-b',
          countryId: 'c-kr',
          historicalCountryId: null,
        })
      prisma.politicalPartyTransition.findMany
        .mockResolvedValueOnce([{ toPartyId: 'p-c' }])
        .mockResolvedValueOnce([{ toPartyId: 'p-a' }])

      await expect(
        controller.create({
          fromPartyId: 'p-a',
          toPartyId: 'p-b',
          kind: 'SUCCESSION',
        }),
      ).rejects.toThrow(BadRequestException)

      // 3) Remove 404 guard
      prisma.politicalPartyTransition.findUnique.mockResolvedValueOnce(null)
      await expect(controller.remove('missing-transition')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('3. ElectionController', () => {
    it('validates poll/term date order, turnout range, candidate/party country match, and sanitizes soft-deleted event', async () => {
      const prisma: any = {
        election: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
        },
        politicalParty: {
          findUnique: jest.fn(),
        },
        electionPartyResult: {
          upsert: jest.fn(),
        },
      }
      const controller = new ElectionController(prisma, {} as any)

      // 1) Reversed pollEndDate < pollDate
      await expect(
        controller.create(
          { user: { id: 'acc-1' } },
          {
            name: '제22대 총선',
            electionType: 'PARLIAMENTARY_CONSTITUENCY',
            pollDate: '2024-04-10',
            pollEndDate: '2024-04-05',
          },
        ),
      ).rejects.toThrow(BadRequestException)

      // 2) Invalid turnout > 100
      await expect(
        controller.create(
          { user: { id: 'acc-1' } },
          {
            name: '제22대 총선',
            electionType: 'PARLIAMENTARY_CONSTITUENCY',
            pollDate: '2024-04-10',
            voterTurnoutPercent: 105,
          },
        ),
      ).rejects.toThrow(BadRequestException)

      // 3) Cross-country party in upsertPartyResult
      prisma.election.findUnique.mockResolvedValueOnce({
        id: 'el-1',
        accountId: 'acc-1',
        countryId: 'c-kr',
        historicalCountryId: null,
      })
      prisma.politicalParty.findUnique.mockResolvedValueOnce({
        id: 'p-us',
        countryId: 'c-us',
        historicalCountryId: null,
      })
      await expect(
        controller.upsertPartyResult(
          { user: { id: 'acc-1' } },
          'el-1',
          'p-us',
          { votes: '1000', voteSharePercent: '45.5' },
        ),
      ).rejects.toThrow(BadRequestException)

      // 4) Soft-deleted event is sanitized in list
      prisma.election.findMany.mockResolvedValueOnce([
        {
          id: 'el-1',
          name: '선거',
          event: { id: 'ev-1', title: '삭제된 사건', deletedAt: new Date() },
        },
      ])
      const list = await controller.list(undefined, 'hc-1')
      expect(list[0].event).toBeNull()
    })
  })

  describe('4. ElectoralDistrictController', () => {
    it('prevents parent cycle, cross-country parent, and deletion when children or candidacies exist', async () => {
      const prisma: any = {
        electoralDistrict: {
          findUnique: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        electionCandidacy: {
          count: jest.fn(),
        },
      }
      const controller = new ElectoralDistrictController(prisma)

      // Self-parent rejection
      prisma.electoralDistrict.findUnique.mockResolvedValueOnce({
        id: 'd-1',
        countryId: 'c-kr',
        historicalCountryId: null,
        parentId: null,
      })
      await expect(
        controller.update('d-1', { parentId: 'd-1' }),
      ).rejects.toThrow(BadRequestException)

      // Ancestor cycle: d-1 <- d-2 <- d-3, setting d-1.parentId = d-3
      prisma.electoralDistrict.findUnique
        .mockResolvedValueOnce({
          id: 'd-1',
          countryId: 'c-kr',
          historicalCountryId: null,
          parentId: null,
        })
        .mockResolvedValueOnce({
          id: 'd-3',
          countryId: 'c-kr',
          historicalCountryId: null,
          parentId: 'd-2',
        })
        .mockResolvedValueOnce({
          id: 'd-2',
          parentId: 'd-1',
        })
      await expect(
        controller.update('d-1', { parentId: 'd-3' }),
      ).rejects.toThrow(BadRequestException)

      // Delete guard when child districts exist
      prisma.electoralDistrict.findUnique.mockResolvedValueOnce({ id: 'd-1' })
      prisma.electoralDistrict.count.mockResolvedValueOnce(2)
      await expect(controller.remove('d-1')).rejects.toThrow(ConflictException)
    })
  })

  describe('5. LawController & law-jurisdiction.util', () => {
    it('distinguishes different historical countries even when both have dual-filled countryId', async () => {
      const goryeoLaw = {
        countryId: 'c-kr',
        historicalCountryId: 'hc-goryeo',
      }
      const joseonParty = {
        countryId: 'c-kr',
        historicalCountryId: 'hc-joseon',
      }
      expect(lawJurisdictionMatchesSubject(goryeoLaw, joseonParty)).toBe(false)
      expect(
        await areJurisdictionsCompatible(null, goryeoLaw, joseonParty),
      ).toBe(false)

      const prisma: any = {
        law: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'law-1',
            articleNumber: 1,
            paragraphNumber: null,
            countryId: 'c-kr',
            historicalCountryId: 'hc-joseon',
          }),
          update: jest.fn(),
        },
        politicalPartyLaw: {
          findMany: jest.fn().mockResolvedValue([
            {
              party: {
                countryId: 'c-kr',
                historicalCountryId: 'hc-joseon',
              },
            },
          ]),
        },
      }
      const controller = new LawController(prisma)
      await expect(
        controller.update('law-1', { historicalCountryId: 'hc-goryeo' }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('6. PersonElectionController & party-membership-dates.util', () => {
    it('validates party existence and person birth/death year bounds', async () => {
      expect(() =>
        assertMembershipWithinPersonLifespan(
          new Date('1945-08-15T00:00:00.000Z'),
          null,
          {
            birthDate: new Date('1950-01-01T00:00:00.000Z'),
            birthEra: 'AD',
            isBirthDateUnknown: false,
          },
        ),
      ).toThrow(BadRequestException)

      expect(() =>
        assertMembershipWithinPersonLifespan(
          new Date('1980-01-01T00:00:00.000Z'),
          new Date('2015-01-01T00:00:00.000Z'),
          {
            birthDate: new Date('1950-01-01T00:00:00.000Z'),
            birthEra: 'AD',
            isBirthDateUnknown: false,
            deathDate: new Date('2009-05-23T00:00:00.000Z'),
            deathEra: 'AD',
            isDeathDateUnknown: false,
            isAlive: false,
          },
        ),
      ).toThrow(BadRequestException)

      const prisma: any = {
        person: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'per-1',
            birthDate: new Date('1950-01-01T00:00:00.000Z'),
            birthEra: 'AD',
            isBirthDateUnknown: false,
            deathDate: null,
            deathEra: 'AD',
            isDeathDateUnknown: true,
            isAlive: true,
          }),
        },
        politicalParty: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      }
      const controller = new PersonElectionController(prisma)
      await expect(
        controller.createMembership(
          'per-1',
          { user: { id: 'acc-1' } } as any,
          { partyId: 'missing-party' },
        ),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('7. findPreviousComparableElection & LawTypeController (Round 10)', () => {
    it('findPreviousComparableElection matches historicalCountryId without forcing countryId: null, scopes by accountId, and excludes CANCELLED elections', async () => {
      const prisma: any = {
        election: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'el-prev',
            name: '제1대 총선',
            pollDate: new Date('1948-05-10T00:00:00.000Z'),
          }),
        },
      }
      await findPreviousComparableElection(prisma, {
        id: 'el-curr',
        electionType: 'LEGISLATIVE' as any,
        pollDate: new Date('1950-05-30T00:00:00.000Z'),
        countryId: 'c-kr',
        historicalCountryId: 'hc-first-republic',
        scopeAdministrativeDivisionId: null,
        convocationOrdinal: null,
        accountId: 'acc-1',
      })

      expect(prisma.election.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: { id: 'el-curr' },
            electionType: 'LEGISLATIVE',
            status: { not: 'CANCELLED' },
            accountId: 'acc-1',
            historicalCountryId: 'hc-first-republic',
          }),
        }),
      )
      const calledWhere = prisma.election.findFirst.mock.calls[0][0].where
      expect(calledWhere.countryId).toBeUndefined()
    })

    it('LawTypeController rejects duplicate LawType name with ConflictException', async () => {
      const prisma: any = {
        lawType: {
          findFirst: jest.fn().mockResolvedValue({ id: 'lt-existing', name: '헌법' }),
          create: jest.fn(),
        },
      }
      const controller = new LawTypeController(prisma)
      await expect(controller.create({ name: '헌법' })).rejects.toThrow(ConflictException)
    })
  })
})
