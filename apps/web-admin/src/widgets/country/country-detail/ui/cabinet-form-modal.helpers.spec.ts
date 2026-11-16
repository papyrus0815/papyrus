import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import type { PoliticalSystem } from '@/shared/api/political-system'

import {
  buildPreviousCabinetBriefing,
  buildReappointmentSuggestion,
  buildSortedPolityOptions,
  canAutoClosePreviousOngoingCabinet,
  checkPersonTenureLifespanWarning,
  checkReshuffleTenureRangeWarning,
  formatPartyOptionLabel,
  formatPeriodDurationSummary,
  formatQuickPersonPreview,
  inferDefaultQuickPersonNameOrder,
  isMonarchicalExecutiveOption,
  organizePartiesForCabinetScope,
  resolveContemporaryRepublicNotice,
  resolveMatchingPartyFromMemberships,
  resolvePolityYearGuidance,
  resolveSmartDefaultExecutiveRole,
} from './cabinet-form-modal.helpers'

const HUNGARY_MOCK_COUNTRY: UnifiedCountry = {
  id: 'modern-hu',
  name: '헝가리',
  type: 'modern',
  isoCode: 'HU',
  defaultNameDisplayOrder: 'western',
  historicalCountries: [
    {
      id: 'hu-3rd-rep',
      name: '헝가리 제3공화국',
      startYear: 1989,
      endYear: null,
      startEra: 'AD',
      endEra: null,
      stateType: 'REPUBLIC',
    },
    {
      id: 'hu-soviet',
      name: '헝가리 소비에트 공화국',
      startYear: 1919,
      endYear: 1919,
      startEra: 'AD',
      endEra: 'AD',
      stateType: 'REPUBLIC',
    },
    {
      id: 'hu-kingdom',
      name: '헝가리 왕국',
      startYear: 1000,
      endYear: 1918,
      startEra: 'AD',
      endEra: 'AD',
      stateType: 'KINGDOM',
    },
    {
      id: 'hu-regency',
      name: '헝가리 왕국 (섭정기)',
      startYear: 1920,
      endYear: 1946,
      startEra: 'AD',
      endEra: 'AD',
      stateType: 'KINGDOM',
    },
    {
      id: 'hu-unity',
      name: '헝가리 국민통합정부',
      startYear: 1944,
      endYear: 1945,
      startEra: 'AD',
      endEra: 'AD',
      stateType: 'OTHER',
    },
  ] as UnifiedCountry['historicalCountries'],
}

describe('cabinet-form-modal.helpers (Hungary & multi-era UX)', () => {
  it('sorts Hungary historical polities chronologically and attaches cabinet counts', () => {
    const counts = new Map<string, number>([
      ['hu-kingdom', 4],
      ['hu-3rd-rep', 9],
    ])
    const options = buildSortedPolityOptions({
      country: HUNGARY_MOCK_COUNTRY,
      cabinetCountByPolityId: counts,
    })

    expect(options.map((optionItem) => optionItem.id)).toEqual([
      'modern-hu',
      'hu-kingdom',
      'hu-soviet',
      'hu-regency',
      'hu-unity',
      'hu-3rd-rep',
    ])
    expect(options[1].eraLabel).toBe('1000~1918')
    expect(options[1].cabinetCount).toBe(4)
    expect(options[5].eraLabel).toBe('1989~현재')
    expect(options[5].cabinetCount).toBe(9)
  })

  it('guides 1913 and overlapping 1944 start years to matching Hungarian historical polities', () => {
    const options = buildSortedPolityOptions({
      country: HUNGARY_MOCK_COUNTRY,
    })

    const guide1913FromModern = resolvePolityYearGuidance({
      polityOptions: options,
      selectedPolityId: 'modern-hu',
      signedStartYear: 1913,
    })
    expect(guide1913FromModern?.suggestedPolities.map((item) => item.id)).toEqual([
      'hu-kingdom',
    ])

    const guide1913From3rdRep = resolvePolityYearGuidance({
      polityOptions: options,
      selectedPolityId: 'hu-3rd-rep',
      signedStartYear: 1913,
    })
    expect(guide1913From3rdRep?.severity).toBe('warning')
    expect(guide1913From3rdRep?.suggestedPolities.map((item) => item.id)).toEqual([
      'hu-kingdom',
    ])

    const guide1944FromModern = resolvePolityYearGuidance({
      polityOptions: options,
      selectedPolityId: 'modern-hu',
      signedStartYear: 1944,
    })
    expect(guide1944FromModern?.suggestedPolities.map((item) => item.id)).toEqual([
      'hu-regency',
      'hu-unity',
    ])
  })

  it('highlights where post-1989 contemporary cabinets live between modern country and 3rd Republic', () => {
    const options = buildSortedPolityOptions({
      country: HUNGARY_MOCK_COUNTRY,
      cabinetCountByPolityId: new Map([['hu-3rd-rep', 7]]),
    })
    const notice = resolveContemporaryRepublicNotice(options, 'modern-hu')
    expect(notice?.recommendedPolity?.id).toBe('hu-3rd-rep')
  })

  it('excludes monarchical titles (국왕) from default executive role and selects 총리 on Hungary', () => {
    expect(
      isMonarchicalExecutiveOption({ title: '국왕', isMonarchical: true }),
    ).toBe(true)
    expect(
      isMonarchicalExecutiveOption({ title: '국왕(친정)', isMonarchical: false }),
    ).toBe(true)
    expect(
      isMonarchicalExecutiveOption({ title: '총리', isMonarchical: false }),
    ).toBe(false)

    const resolved = resolveSmartDefaultExecutiveRole({
      headPositionOptions: [
        {
          id: 'def-king',
          title: '국왕',
          positionType: 'HEAD_OF_STATE',
          isMonarchical: true,
        },
      ],
      existingHeadTenures: [],
      polityDisplayName: '헝가리 왕국',
      polityStateType: 'KINGDOM',
      countryIsoCode: 'HU',
      isHistoricalPolity: true,
    })

    expect(resolved.title).toBe('총리')
    expect(resolved.positionType).toBe('HEAD_OF_GOVERNMENT')
    expect(resolved.positionDefId).toBeNull()
  })

  it('builds previous cabinet briefing and István Tisza re-appointment (제15대 2기) suggestion', () => {
    const tiszaFirstTerm = {
      id: 'tenure-tisza-1',
      title: '총리',
      positionType: 'HEAD_OF_GOVERNMENT',
      ordinal: 15,
      subTermNumber: 1,
      startYear: 1903,
      startMonth: 11,
      endYear: 1905,
      endMonth: 6,
      person: {
        id: 'person-tisza',
        name: '이슈트반',
        surname: '티사',
        nameDisplayOrder: 'korean',
      },
    }

    const briefing = buildPreviousCabinetBriefing({
      cabinets: [
        {
          id: 'cab-tisza-1',
          name: '제15대 1기 티사 이슈트반 내각',
          startYear: 1903,
          startMonth: 11,
          endYear: 1905,
          endMonth: 6,
          headTenure: tiszaFirstTerm,
        },
      ],
      existingHeadTenures: [tiszaFirstTerm],
      roleTitle: '총리',
      positionType: 'HEAD_OF_GOVERNMENT',
    })

    expect(briefing?.cabinetTitle).toBe('제15대 1기 티사 이슈트반 내각')
    expect(briefing?.suggestedNextOrdinal).toBe(16)
    expect(briefing?.continuationStartParts).toEqual({
      era: 'AD',
      year: '1905',
      month: '6',
      day: '',
    })

    const reappointment = buildReappointmentSuggestion([tiszaFirstTerm])
    expect(reappointment).toEqual({
      lastOrdinal: 15,
      nextSubTermNumber: 2,
      summaryLabel: '제15대 2기',
    })
  })

  it('defaults Hungarian quick-create name order to surname-first (korean) and warns on father/son lifespan mismatch', () => {
    const order = inferDefaultQuickPersonNameOrder({
      country: HUNGARY_MOCK_COUNTRY,
      polityDisplayName: '헝가리 왕국',
    })
    expect(order).toBe('korean')
    expect(
      formatQuickPersonPreview({
        surname: '티사',
        givenName: '이슈트반',
        nameDisplayOrder: order,
      }),
    ).toBe('티사 이슈트반')

    // Father Kálmán Tisza (1830-1902) accidentally picked for 1913 cabinet
    const warning = checkPersonTenureLifespanWarning(
      {
        id: 'person-kalman',
        name: '칼만',
        surname: '티사',
        nameDisplayOrder: 'korean',
        birthEra: 'AD',
        birthYear: 1830,
        deathEra: 'AD',
        deathYear: 1902,
      },
      1913,
    )
    expect(warning).toContain('1902년')
    expect(warning).toContain('1913년')

    expect(
      formatPeriodDurationSummary(
        { era: 'AD', year: '1913', month: '6', day: '10' },
        { era: 'AD', year: '1917', month: '6', day: '15' },
      ),
    ).toBe('약 4년')
  })

  it('honors PoliticalSystem canonical executive role (각료평의회 의장) while ignoring monarchical titles', () => {
    const socialistRegime = {
      id: 'ps-hu-pr',
      name: '인민공화국 체제',
      governmentForm: 'ONE_PARTY',
      headOfStateTitle: '간부회 의장',
      headOfStateHasPower: false,
      headOfGovernmentPositionId: 'pos-council-chair',
      headOfGovernmentPosition: {
        id: 'pos-council-chair',
        title: '각료평의회 의장',
        titleLocal: 'Minisztertanács elnöke',
        positionType: 'HEAD_OF_GOVERNMENT',
      },
      headOfGovernmentTitle: '각료평의회 의장',
      headOfGovernmentHasPower: true,
    } as unknown as PoliticalSystem

    const resolved = resolveSmartDefaultExecutiveRole({
      headPositionOptions: [],
      existingHeadTenures: [],
      activePoliticalSystem: socialistRegime,
      polityDisplayName: '헝가리 인민공화국',
      isHistoricalPolity: true,
    })

    expect(resolved.title).toBe('각료평의회 의장')
    expect(resolved.positionType).toBe('HEAD_OF_GOVERNMENT')
    expect(resolved.positionDefId).toBe('pos-council-chair')
  })

  it('promotes parent-country contemporary parties (Fidesz) for 3rd Republic cabinets and matches person memberships', () => {
    const mergedParties = [
      {
        id: 'party-liberal',
        name: '자유당',
        foundedDate: '1875-03-01',
        dissolvedDate: '1906-04-11',
        historicalCountryId: 'hu-kingdom',
      },
      {
        id: 'party-fidesz',
        name: '피데스',
        shortName: 'Fidesz',
        foundedDate: '1988-03-30',
        dissolvedDate: null,
        countryId: 'modern-hu',
      },
    ]

    const groupedFor2010 = organizePartiesForCabinetScope({
      parties: mergedParties,
      countryId: 'modern-hu',
      historicalCountryId: 'hu-3rd-rep',
      signedStartYear: 2010,
    })

    expect(groupedFor2010.recommendedParties.map((row) => row.id)).toEqual([
      'party-fidesz',
    ])
    expect(groupedFor2010.otherParties.map((row) => row.id)).toEqual([
      'party-liberal',
    ])
    expect(formatPartyOptionLabel(mergedParties[1])).toBe(
      '피데스 (Fidesz) · 1988~',
    )

    const matchedMembership = resolveMatchingPartyFromMemberships(
      [
        {
          id: 'mem-1',
          personId: 'person-orban',
          partyId: 'party-fidesz',
          startDate: '1988-03-30',
          endDate: null,
          party: { id: 'party-fidesz', name: '피데스' },
        },
      ],
      2010,
    )
    expect(matchedMembership).toEqual({
      partyId: 'party-fidesz',
      partyName: '피데스',
    })
  })

  it('detects auto-closable ongoing predecessor cabinet and warns on out-of-bounds reshuffle dates', () => {
    const ongoingBriefing = buildPreviousCabinetBriefing({
      cabinets: [
        {
          id: 'cab-bajnai',
          name: '버이너이 고르돈 내각',
          startYear: 2009,
          startMonth: 4,
          endYear: null,
          headTenure: {
            id: 'tenure-bajnai',
            title: '총리',
            positionType: 'HEAD_OF_GOVERNMENT',
            ordinal: 7,
            startYear: 2009,
            startMonth: 4,
          },
        },
      ],
      existingHeadTenures: [],
      roleTitle: '총리',
      positionType: 'HEAD_OF_GOVERNMENT',
    })

    expect(ongoingBriefing?.isLatestOngoing).toBe(true)
    expect(
      canAutoClosePreviousOngoingCabinet(ongoingBriefing, {
        era: 'AD',
        year: '2010',
        month: '5',
        day: '29',
      }),
    ).toBe(true)
    expect(
      canAutoClosePreviousOngoingCabinet(ongoingBriefing, {
        era: 'AD',
        year: '2008',
        month: '1',
        day: '',
      }),
    ).toBe(false)

    const reshuffleWarn = checkReshuffleTenureRangeWarning({
      tenure: {
        id: 'tenure-tisza-2',
        startYear: 1913,
        startMonth: 6,
        endYear: 1917,
        endMonth: 6,
      },
      cabinetStart: { era: 'AD', year: '1918', month: '1', day: '' },
      cabinetEnd: { era: 'AD', year: '', month: '', day: '' },
    })
    expect(reshuffleWarn).toContain('1917.06')
  })
})
