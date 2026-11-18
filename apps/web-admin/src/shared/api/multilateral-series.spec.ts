jest.mock('./client', () => ({
  apiConnection: { host: 'http://localhost:3000' },
  getApiConnection: jest.fn(() => ({ host: 'http://localhost:3000' })),
}))

import {
  buildCreateNextEditionUrl,
  buildSeriesModalLaunchPayload,
  type EventSeriesForecast,
} from './event-series'
import {
  getOrganizations,
  isOrganizationMembershipActiveAtYear,
  NON_COMPANY_ORG_TYPES,
  resolveOrganizationMembershipRoleAtYear,
} from './organizations'

describe('multilateral organizations & event-series helpers', () => {
  describe('resolveOrganizationMembershipRoleAtYear', () => {
    it('resolves multi-phase statusHistory (observer -> member -> suspended)', () => {
      const membership = {
        role: 'MEMBER' as const,
        startEra: 'AD' as const,
        startYear: 1992,
        endEra: null,
        endYear: null,
        statusHistory: [
          {
            role: 'OBSERVER' as const,
            startEra: 'AD' as const,
            startYear: 1992,
            endEra: 'AD' as const,
            endYear: 1994,
          },
          {
            role: 'MEMBER' as const,
            startEra: 'AD' as const,
            startYear: 1995,
            endEra: 'AD' as const,
            endYear: 2020,
          },
          {
            role: 'SUSPENDED' as const,
            startEra: 'AD' as const,
            startYear: 2021,
            endEra: 'AD' as const,
            endYear: 2023,
          },
          {
            role: 'MEMBER' as const,
            startEra: 'AD' as const,
            startYear: 2024,
            endEra: null,
            endYear: null,
          },
        ],
      }

      expect(resolveOrganizationMembershipRoleAtYear(membership, 1990)).toBeNull()
      expect(resolveOrganizationMembershipRoleAtYear(membership, 1993)).toBe(
        'OBSERVER',
      )
      expect(resolveOrganizationMembershipRoleAtYear(membership, 1998)).toBe(
        'MEMBER',
      )
      expect(resolveOrganizationMembershipRoleAtYear(membership, 2022)).toBeNull()
      expect(isOrganizationMembershipActiveAtYear(membership, 2022)).toBe(false)
      expect(resolveOrganizationMembershipRoleAtYear(membership, 2025)).toBe(
        'MEMBER',
      )
    })

    it('falls back to top-level startYear/endYear/role when statusHistory is absent', () => {
      const ukEu = {
        role: 'MEMBER' as const,
        startEra: 'AD' as const,
        startYear: 1973,
        endEra: 'AD' as const,
        endYear: 2020,
        statusHistory: null,
      }

      expect(resolveOrganizationMembershipRoleAtYear(ukEu, 1972)).toBeNull()
      expect(resolveOrganizationMembershipRoleAtYear(ukEu, 2016)).toBe('MEMBER')
      expect(resolveOrganizationMembershipRoleAtYear(ukEu, 2021)).toBeNull()
    })
  })

  describe('buildSeriesModalLaunchPayload & buildCreateNextEditionUrl', () => {
    const sampleForecast: EventSeriesForecast = {
      kind: 'ESTIMATED',
      cadenceLabel: '2년마다',
      headline: '2027년 10월경 제16차 개최 예상 · 의장국 싱가포르',
      expectedYear: 2027,
      expectedMonth: 10,
      expectedDay: null,
      expectedEdition: 16,
      scheduledEventId: null,
      scheduledEventTitle: null,
      hostCountry: { id: 'country-sg', name: '싱가포르', flagEmoji: '🇸🇬' },
      hostCountryIsEstimated: true,
      location: '싱가포르',
      note: null,
      monthsUntil: 11,
      prefill: {
        suggestedTitle: '제16차 ASEM 정상회의',
        suggestedEdition: 16,
        suggestedYear: 2027,
        suggestedMonth: 10,
        suggestedLocation: '싱가포르',
        suggestedHostCountryId: 'country-sg',
      },
    }

    it('builds next-edition modal launch payload from backend forecast.prefill', () => {
      const payload = buildSeriesModalLaunchPayload({
        id: 'series-asem',
        title: 'ASEM 정상회의',
        organizationId: 'org-asem',
        defaultDomain: 'DIPLOMACY',
        defaultEventType: 'SUMMIT',
        forecast: sampleForecast,
      })

      expect(payload).toEqual({
        initialDomain: 'DIPLOMACY',
        initialEventType: 'SUMMIT',
        initialCountries: [{ countryId: 'country-sg', role: 'INITIATOR' }],
        initialSeriesPrefill: {
          seriesId: 'series-asem',
          seriesEdition: 16,
          title: '제16차 ASEM 정상회의',
          startDate: '2027-10-01',
          startDatePrecision: 'month',
          location: '싱가포르',
          organizationId: 'org-asem',
        },
      })

      const url = buildCreateNextEditionUrl({
        id: 'series-asem',
        title: 'ASEM 정상회의',
        organizationId: 'org-asem',
        defaultDomain: 'DIPLOMACY',
        defaultEventType: 'SUMMIT',
        forecast: sampleForecast,
      })
      expect(url).toContain('seriesId=series-asem')
      expect(url).toContain('seriesEdition=16')
      expect(url).toContain('hostCountryId=country-sg')
    })

    it('builds missing-edition override payload without copying future date or host country', () => {
      const payload = buildSeriesModalLaunchPayload(
        {
          id: 'series-asem',
          title: 'ASEM 정상회의',
          organizationId: 'org-asem',
          defaultDomain: 'DIPLOMACY',
          defaultEventType: 'SUMMIT',
          forecast: sampleForecast,
        },
        { overrideEdition: 5 },
      )

      expect(payload).toEqual({
        initialDomain: 'DIPLOMACY',
        initialEventType: 'SUMMIT',
        initialCountries: [],
        initialSeriesPrefill: {
          seriesId: 'series-asem',
          seriesEdition: 5,
          title: '제5차 ASEM 정상회의',
          startDate: null,
          startDatePrecision: null,
          location: null,
          organizationId: 'org-asem',
        },
      })
    })
  })

  describe('company, political-party & government-agency domain separation', () => {
    it('excludes COMPANY, POLITICAL_PARTY, and GOVERNMENT_AGENCY from NON_COMPANY_ORG_TYPES and getOrganizations({ excludeCompanies: true })', async () => {
      expect(NON_COMPANY_ORG_TYPES).not.toContain('COMPANY')
      expect(NON_COMPANY_ORG_TYPES).not.toContain('POLITICAL_PARTY')
      expect(NON_COMPANY_ORG_TYPES).not.toContain('GOVERNMENT_AGENCY')
      expect(NON_COMPANY_ORG_TYPES).toEqual(
        expect.arrayContaining([
          'INTERGOVERNMENTAL_ORG',
          'MULTILATERAL_FORUM',
          'MILITARY_ALLIANCE',
          'NGO',
          'TRADE_UNION',
        ]),
      )

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 'org-asean', name: '아세안', type: 'INTERGOVERNMENTAL_ORG' },
          { id: 'org-quad', name: '쿼드', type: 'MULTILATERAL_FORUM' },
          { id: 'org-samsung', name: '삼성전자', type: 'COMPANY' },
          { id: 'org-kpd', name: '독일공산당', type: 'POLITICAL_PARTY' },
          { id: 'org-ministry', name: '외무성', type: 'GOVERNMENT_AGENCY' },
        ],
      })
      const originalFetch = global.fetch
      global.fetch = fetchSpy as unknown as typeof fetch
      try {
        const result = await getOrganizations(
          { host: 'http://localhost:3000' },
          { excludeCompanies: true },
        )
        expect(fetchSpy.mock.calls[0][0]).toContain('excludeCompanies=true')
        expect(fetchSpy.mock.calls[0][0]).toContain('excludePoliticalParties=true')
        expect(fetchSpy.mock.calls[0][0]).toContain('excludeGovernmentAgencies=true')
        expect(result.map((o) => o.id)).toEqual(['org-asean', 'org-quad'])
      } finally {
        global.fetch = originalFetch
      }
    })
  })
})
