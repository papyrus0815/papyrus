import {
  doesIntervalOverlapConstituentWindows,
  doesRecordOverlapSignedYear,
  extractRecordPeriodKeys,
  parseIncludeConstituentsFlag,
  resolveConstituentPolityWindows,
} from './historical-constituent-rollup'

describe('historical-constituent-rollup', () => {
  it('parseIncludeConstituentsFlag: true/1 문자열과 불리언만 true로 해석한다', () => {
    expect(parseIncludeConstituentsFlag(true)).toBe(true)
    expect(parseIncludeConstituentsFlag('true')).toBe(true)
    expect(parseIncludeConstituentsFlag('1')).toBe(true)
    expect(parseIncludeConstituentsFlag(false)).toBe(false)
    expect(parseIncludeConstituentsFlag('false')).toBe(false)
    expect(parseIncludeConstituentsFlag(undefined)).toBe(false)
  })

  it('오스트리아-헝가리 제국(1867~1918.11) 조회 시 헝가리 왕국(1000~1918)의 유효 창을 1867~1918.11로 좁히고 티서 내각만 통과시킨다', async () => {
    const fakePrisma = {
      historicalCountry: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ah-empire',
          name: '오스트리아-헝가리 제국',
          startEra: 'AD',
          startYear: 1867,
          startMonth: null,
          startDay: null,
          endEra: 'AD',
          endYear: 1918,
          endMonth: 11,
          endDay: null,
          membershipsParent: [
            {
              memberCountryId: 'kingdom-hungary',
              role: 'UNION',
              isLeadingMember: false,
              membershipStartDate: null,
              membershipEndDate: null,
              startEra: null,
              startYear: null,
              startMonth: null,
              startDay: null,
              endEra: null,
              endYear: null,
              endMonth: null,
              endDay: null,
              memberCountry: {
                id: 'kingdom-hungary',
                name: '헝가리 왕국',
                enName: 'Kingdom of Hungary',
                startEra: 'AD',
                startYear: 1000,
                startMonth: null,
                startDay: null,
                endEra: 'AD',
                endYear: 1918,
                endMonth: null,
                endDay: null,
              },
            },
          ],
        }),
      },
      historicalCountryTransition: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    }

    const windows = await resolveConstituentPolityWindows(fakePrisma, 'ah-empire')
    expect(windows).toHaveLength(1)
    expect(windows[0].memberCountryId).toBe('kingdom-hungary')
    expect(windows[0].windowStartKey).toBe(18670101)
    expect(windows[0].windowEndKey).toBe(19181131)

    // 티서 이슈트반 제2차 내각 (1913-06-10 ~ 1917-06-15) → 포함
    const tiszaSecond = extractRecordPeriodKeys({
      startEra: 'AD',
      startYear: 1913,
      startMonth: 6,
      startDay: 10,
      endEra: 'AD',
      endYear: 1917,
      endMonth: 6,
      endDay: 15,
    })
    expect(
      doesIntervalOverlapConstituentWindows(
        tiszaSecond.startKey,
        tiszaSecond.endKey,
        windows,
        'person_or_cabinet',
      ),
    ).toBe(true)

    // 1848년 버처니 러요시 내각 (오스트리아 제국 시기) → 오스트리아-헝가리 제국에서는 제외
    const batthyany1848 = extractRecordPeriodKeys({
      startEra: 'AD',
      startYear: 1848,
      startMonth: 3,
      startDay: 17,
      endEra: 'AD',
      endYear: 1848,
      endMonth: 10,
      endDay: 2,
    })
    expect(
      doesIntervalOverlapConstituentWindows(
        batthyany1848.startKey,
        batthyany1848.endKey,
        windows,
        'person_or_cabinet',
      ),
    ).toBe(false)

    // 중세 군주 마차시 1세(1458 즉위, 종료일 누락 케이스) → 1867~1918로 새어 나오지 않음
    const medievalMissingEnd = extractRecordPeriodKeys({
      startEra: 'AD',
      startYear: 1458,
    })
    expect(
      doesIntervalOverlapConstituentWindows(
        medievalMissingEnd.startKey,
        medievalMissingEnd.endKey,
        windows,
        'person_or_cabinet',
      ),
    ).toBe(false)
  })

  it('합방 소멸 전신 국가(잉글랜드 왕국 ~1707 → 그레이트브리튼 왕국 1707~)는 구성국 롤업에서 제외한다', async () => {
    const fakePrisma = {
      historicalCountry: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'gb-1707',
          name: '그레이트브리튼 왕국',
          startEra: 'AD',
          startYear: 1707,
          startMonth: null,
          startDay: null,
          endEra: 'AD',
          endYear: 1801,
          endMonth: null,
          endDay: null,
          membershipsParent: [
            {
              memberCountryId: 'england',
              role: 'CONFEDERATION_MEMBER',
              isLeadingMember: true,
              membershipStartDate: null,
              membershipEndDate: null,
              startEra: null,
              startYear: null,
              startMonth: null,
              startDay: null,
              endEra: null,
              endYear: null,
              endMonth: null,
              endDay: null,
              memberCountry: {
                id: 'england',
                name: '잉글랜드 왕국',
                enName: 'Kingdom of England',
                startEra: 'AD',
                startYear: 927,
                startMonth: null,
                startDay: null,
                endEra: 'AD',
                endYear: 1707,
                endMonth: null,
                endDay: null,
              },
            },
          ],
        }),
      },
      historicalCountryTransition: {
        findMany: jest.fn().mockResolvedValue([{ predecessorId: 'england' }]),
      },
    }

    const windows = await resolveConstituentPolityWindows(fakePrisma, 'gb-1707')
    expect(windows).toEqual([])
  })

  it('doesRecordOverlapSignedYear: 기원후·기원전 특정 연도 재임/존속 필터링이 정확히 동작한다', () => {
    const tiszaBounds = extractRecordPeriodKeys({
      startEra: 'AD',
      startYear: 1913,
      startMonth: 6,
      startDay: 10,
      endEra: 'AD',
      endYear: 1917,
      endMonth: 6,
      endDay: 15,
    })
    expect(
      doesRecordOverlapSignedYear({
        ...tiszaBounds,
        activeAtYear: 1914,
        kind: 'person_or_cabinet',
        isHistoricalPolity: true,
      }),
    ).toBe(true)
    expect(
      doesRecordOverlapSignedYear({
        ...tiszaBounds,
        activeAtYear: 1918,
        kind: 'person_or_cabinet',
        isHistoricalPolity: true,
      }),
    ).toBe(false)

    // 기원전(BC 202~BC 195 한 고조 시기)
    const hanBounds = extractRecordPeriodKeys({
      startEra: 'BC',
      startYear: 202,
      startMonth: 2,
      startDay: 28,
      endEra: 'BC',
      endYear: 195,
      endMonth: 6,
      endDay: 1,
    })
    expect(
      doesRecordOverlapSignedYear({
        ...hanBounds,
        activeAtYear: -200,
        kind: 'person_or_cabinet',
        isHistoricalPolity: true,
      }),
    ).toBe(true)
    expect(
      doesRecordOverlapSignedYear({
        ...hanBounds,
        activeAtYear: -210,
        kind: 'person_or_cabinet',
        isHistoricalPolity: true,
      }),
    ).toBe(false)
  })
})
