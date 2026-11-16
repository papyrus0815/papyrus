import {
  compareCabinetsNewestFirst,
  dateRangesOverlapIso,
  doesCabinetMatchPoliticalSystem,
  filterDepartmentsForCabinet,
  findDepartmentForMember,
  getTenureChronologyKey,
  isConstitutionalNonExecutiveOrgan,
  isNonCabinetStateOrgan,
  resolveCabinetEffectiveDates,
  resolveCabinetMinisterCount,
  shouldHideCabinetFromExecutiveTimeline,
} from './department-cabinet-matcher'
import {
  getDepartmentNameFrame,
  inferDepartmentCategoryName,
  inferDepartmentKind,
} from './department-name-frames'
import {
  UNCATEGORIZED_CATEGORY_ID,
  countDepartmentsByCategoryId,
  isDefenseRelatedCategory,
  isDepartmentActiveAtSignedYear,
  ministryFormFieldsFromDepartment,
  resolveDepartmentLifecycleStatus,
} from './ministry-department-utils'
import type { AdministrationDepartment } from '@/shared/api/administration-department'

function makeDept(
  partial: Partial<AdministrationDepartment> & { id: string; name: string },
): AdministrationDepartment {
  return {
    nameLocal: null,
    nameEn: null,
    abbreviation: null,
    kind: 'MINISTRY',
    countryId: null,
    country: null,
    historicalCountryId: null,
    historicalCountry: null,
    parentId: null,
    parent: null,
    children: [],
    categoryId: null,
    category: null,
    thumbnailUrl: null,
    description: null,
    primaryMission: null,
    headquarters: null,
    headquartersLatitude: null,
    headquartersLongitude: null,
    orgStructure: null,
    budgetNote: null,
    established: null,
    abolished: null,
    establishedDate: null,
    abolishedDate: null,
    predecessors: [],
    successors: [],
    militaryUnits: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

describe('department-cabinet-matcher', () => {
  describe('dateRangesOverlapIso (BC·고대·서기 지원)', () => {
    it('서기 ISO 구간 겹침을 판정한다', () => {
      expect(
        dateRangesOverlapIso(
          '1948-08-15',
          '1960-04-26',
          '1950-06-25',
          '1953-07-27',
        ),
      ).toBe(true)
      expect(
        dateRangesOverlapIso(
          '1948-08-15',
          '1960-04-26',
          '1961-05-16',
          '1963-12-16',
        ),
      ).toBe(false)
    })

    it('기원전(BC) 및 1000년 미만 고대 날짜 문자열 겹침을 판정한다', () => {
      expect(
        dateRangesOverlapIso('BC 206', 'BC 195', '-0202-01-01', '-0195-06-01'),
      ).toBe(true)
      expect(
        dateRangesOverlapIso('BC 221', 'BC 206', 'BC 202', 'AD 8'),
      ).toBe(false)
      expect(
        dateRangesOverlapIso('618-06-18', '907-06-01', '626', '649'),
      ).toBe(true)
    })
  })

  describe('filterDepartmentsForCabinet (역사적 국가 vs 현대 국가 격리)', () => {
    const modernUndatedDept = makeDept({
      id: 'dept-moef',
      name: '기획재정부',
      countryId: 'kr',
      historicalCountryId: null,
      established: null,
      establishedDate: null,
    })

    const joseonDept = makeDept({
      id: 'dept-ijo',
      name: '이조',
      countryId: 'kr',
      historicalCountryId: 'joseon',
      established: {
        era: 'AD',
        year: 1392,
        month: 7,
        day: 17,
        precision: 'DAY',
      },
      abolished: {
        era: 'AD',
        year: 1894,
        month: 7,
        day: 27,
        precision: 'DAY',
      },
    })

    const hanDept = makeDept({
      id: 'dept-chengxiang',
      name: '승상부',
      countryId: 'cn',
      historicalCountryId: 'western-han',
      established: {
        era: 'BC',
        year: 206,
        month: null,
        day: null,
        precision: 'YEAR',
      },
      abolished: {
        era: 'BC',
        year: 1,
        month: null,
        day: null,
        precision: 'YEAR',
      },
    })

    it('역사적 국가 행정부에는 설립일 미기재 현대 부처가 섞이지 않고 해당 역사적 국가 부처만 포함된다', () => {
      const result = filterDepartmentsForCabinet(
        [modernUndatedDept, joseonDept],
        {
          countryId: 'kr',
          historicalCountryId: 'joseon',
          startDate: '1400-01-01',
          endDate: '1418-08-01',
        },
      )
      expect(result.map((department) => department.id)).toEqual(['dept-ijo'])
    })

    it('기원전(BC) 구조화 날짜를 가진 역사적 국가 기관과 행정부도 정상 매칭한다', () => {
      const result = filterDepartmentsForCabinet([hanDept], {
        countryId: 'cn',
        historicalCountryId: 'western-han',
        startDate: 'BC 202',
        endDate: 'BC 195',
      })
      expect(result.map((department) => department.id)).toEqual(['dept-chengxiang'])
    })

    it('현대 국가 행정부에는 현대 부처가 포함되고 다른 역사적 국가 부처는 제외된다', () => {
      const result = filterDepartmentsForCabinet(
        [modernUndatedDept, joseonDept],
        {
          countryId: 'kr',
          historicalCountryId: null,
          startDate: '2022-05-10',
          endDate: null,
        },
      )
      expect(result.map((department) => department.id)).toEqual(['dept-moef'])
    })
  })

  describe('findDepartmentForMember', () => {
    it('명시적 administrationDepartmentId가 있으면 직함 문자열 추론보다 우선한다', () => {
      const depts = [
        makeDept({ id: 'dept-1', name: '외교부' }),
        makeDept({ id: 'dept-2', name: '국방부' }),
      ]
      expect(
        findDepartmentForMember(
          {
            title: '외교부 장관',
            administrationDepartmentId: 'dept-2',
          },
          depts,
        )?.id,
      ).toBe('dept-2')
    })

    it('직위 정의(positionDefinition.administrationDepartmentId)에 부처 FK가 있으면 그 부처로 매칭한다', () => {
      const depts = [
        makeDept({ id: 'dept-1', name: '이조' }),
        makeDept({ id: 'dept-2', name: '병조' }),
      ]
      expect(
        findDepartmentForMember(
          {
            title: '판서',
            positionDefinition: {
              id: 'def-1',
              title: '병조판서',
              administrationDepartmentId: 'dept-2',
            },
          },
          depts,
        )?.id,
      ).toBe('dept-2')
    })
  })

  describe('getTenureChronologyKey & compareCabinetsNewestFirst', () => {
    it('기원전(BC)과 서기 1000년 미만 고대 날짜가 역전되지 않고 최신 정권부터 정렬된다', () => {
      const hanGaozu = {
        id: 'cab-bc-202',
        headTenure: { startDate: '-0202-02-28', ordinal: 1 },
      }
      const hanWu = {
        id: 'cab-bc-141',
        headTenure: { startDate: '-0141-03-09', ordinal: 7 },
      }
      const goryeoTaejo = {
        id: 'cab-ad-918',
        headTenure: { startDate: '0918-06-15', ordinal: 1 },
      }
      const joseonTaejo = {
        id: 'cab-ad-1392',
        headTenure: { startDate: '1392-07-17', ordinal: 1 },
      }

      expect(getTenureChronologyKey(hanGaozu.headTenure)).toBe(-2019772)
      expect(getTenureChronologyKey(hanWu.headTenure)).toBe(-1409691)
      expect(getTenureChronologyKey(goryeoTaejo.headTenure)).toBe(9180615)

      const sorted = [hanGaozu, joseonTaejo, hanWu, goryeoTaejo].sort(
        compareCabinetsNewestFirst,
      )
      expect(sorted.map((cabinet) => cabinet.id)).toEqual([
        'cab-ad-1392',
        'cab-ad-918',
        'cab-bc-141',
        'cab-bc-202',
      ])
    })

    it('동일 수반 재임 아래 여러 개각 내각이 있을 때 cabinet.startDate를 우선하여 정렬한다', () => {
      const sharedHead = {
        startDate: '2012-12-26',
        endDate: '2020-09-16',
        ordinal: 96,
      }
      const firstCabinet = {
        id: 'abe-2nd-initial',
        startDate: '2012-12-26',
        endDate: '2014-09-03',
        headTenure: sharedHead,
      }
      const reshuffleCabinet = {
        id: 'abe-2nd-reshuffle',
        startDate: '2014-09-03',
        endDate: '2014-12-24',
        headTenure: sharedHead,
      }
      const fourthCabinet = {
        id: 'abe-4th-2nd-reshuffle',
        startDate: '2019-09-11',
        endDate: '2020-09-16',
        headTenure: sharedHead,
      }

      expect(resolveCabinetEffectiveDates(reshuffleCabinet)).toEqual({
        startDate: '2014-09-03',
        endDate: '2014-12-24',
      })
      expect(
        resolveCabinetEffectiveDates({
          startDate: null,
          endDate: null,
          headTenure: sharedHead,
        }),
      ).toEqual({
        startDate: '2012-12-26',
        endDate: '2020-09-16',
      })

      const sorted = [firstCabinet, fourthCabinet, reshuffleCabinet].sort(
        compareCabinetsNewestFirst,
      )
      expect(sorted.map((item) => item.id)).toEqual([
        'abe-4th-2nd-reshuffle',
        'abe-2nd-reshuffle',
        'abe-2nd-initial',
      ])
    })
  })

  describe('doesCabinetMatchPoliticalSystem (헌정 체제 ↔ 내각 교차 매칭)', () => {
    const fifthRepublic = {
      historicalCountryId: null,
      startEra: 'AD' as const,
      startYear: 1981,
      endEra: 'AD' as const,
      endYear: 1988,
      isCurrent: false,
    }
    const sixthRepublic = {
      historicalCountryId: null,
      startEra: 'AD' as const,
      startYear: 1988,
      endEra: null,
      endYear: null,
      isCurrent: true,
    }

    it('공화국 교체 경계 연도(1988년)에서 이전 체제 퇴임 수반과 새 체제 출범 수반이 중복 산입되지 않는다', () => {
      const chunCabinet = {
        historicalCountryId: null,
        headTenure: { startDate: '1980-09-01', endDate: '1988-02-24' },
      }
      const rohCabinet = {
        historicalCountryId: null,
        headTenure: { startDate: '1988-02-25', endDate: '1993-02-24' },
      }

      expect(doesCabinetMatchPoliticalSystem(chunCabinet, fifthRepublic)).toBe(
        true,
      )
      expect(doesCabinetMatchPoliticalSystem(chunCabinet, sixthRepublic)).toBe(
        false,
      )
      expect(doesCabinetMatchPoliticalSystem(rohCabinet, fifthRepublic)).toBe(
        false,
      )
      expect(doesCabinetMatchPoliticalSystem(rohCabinet, sixthRepublic)).toBe(
        true,
      )
    })

    it('소속 역사국가(historicalCountryId)가 다르면 연도가 겹쳐도 매칭하지 않는다', () => {
      const weimarSystem = {
        historicalCountryId: 'hc-weimar',
        startEra: 'AD' as const,
        startYear: 1919,
        endEra: 'AD' as const,
        endYear: 1933,
        isCurrent: false,
      }
      const prussiaCabinet = {
        historicalCountryId: 'hc-prussia',
        startDate: '1925-01-01',
        endDate: '1932-07-20',
      }
      expect(doesCabinetMatchPoliticalSystem(prussiaCabinet, weimarSystem)).toBe(
        false,
      )
    })

    it('현행 체제(isCurrent: true)는 historicalCountryId(예: 일본국, 프랑스 제5공화국)가 있어도 현대국가 직속 내각(historicalCountryId: null)과 매칭된다', () => {
      const postwarJapanSystem = {
        historicalCountryId: 'hc-state-of-japan',
        startEra: 'AD' as const,
        startYear: 1947,
        endEra: null,
        endYear: null,
        isCurrent: true,
      }
      const empireJapanSystem = {
        historicalCountryId: 'hc-empire-of-japan',
        startEra: 'AD' as const,
        startYear: 1889,
        endEra: 'AD' as const,
        endYear: 1947,
        isCurrent: false,
      }
      const yoshidaCabinet = {
        historicalCountryId: null,
        startDate: '1948-10-15',
        endDate: '1949-02-16',
      }
      expect(
        doesCabinetMatchPoliticalSystem(yoshidaCabinet, postwarJapanSystem),
      ).toBe(true)
      expect(
        doesCabinetMatchPoliticalSystem(yoshidaCabinet, empireJapanSystem),
      ).toBe(false)
    })
  })

  describe('ministry-department-utils & department-name-frames', () => {
    it('ministryFormFieldsFromDepartment: 기원전(BC) 부호 포함 ISO 날짜(-0221-01-01)를 구조화 연대(BC 221)로 파싱하고 historicalCountryId를 보존한다', () => {
      const dept = makeDept({
        id: 'dept-qin',
        name: '승상부',
        historicalCountryId: 'hc-qin',
        establishedDate: '-0221-01-01T00:00:00.000Z',
        abolishedDate: '-0206-10-01',
      })
      const fields = ministryFormFieldsFromDepartment(dept)
      expect(fields.establishedEra).toBe('BC')
      expect(fields.establishedYear).toBe(221)
      expect(fields.establishedMonth).toBe(1)
      expect(fields.establishedDay).toBe(1)
      expect(fields.abolishedEra).toBe('BC')
      expect(fields.abolishedYear).toBe(206)
      expect(fields.abolishedMonth).toBe(10)
      expect(fields.historicalCountryId).toBe('hc-qin')
    })

    it('countDepartmentsByCategoryId: categoryId가 null인 부처를 UNCATEGORIZED_CATEGORY_ID로 집계한다', () => {
      const counts = countDepartmentsByCategoryId([
        makeDept({ id: 'd1', name: '외교부', categoryId: 'cat-foreign' }),
        makeDept({ id: 'd2', name: '승상부', categoryId: null }),
        makeDept({ id: 'd3', name: '어사대', categoryId: null }),
      ])
      expect(counts.get('cat-foreign')).toBe(1)
      expect(counts.get(UNCATEGORIZED_CATEGORY_ID)).toBe(2)
    })

    it('isDefenseRelatedCategory: 카테고리가 없거나 일반 카테고리여도 kind가 MILITARY_COMMAND이면 true를 반환한다', () => {
      const etcCat = { id: 'cat-etc', name: '기타', nameEn: null }
      expect(isDefenseRelatedCategory(null, 'MILITARY_COMMAND')).toBe(true)
      expect(isDefenseRelatedCategory(etcCat, 'MILITARY_COMMAND')).toBe(true)
      expect(isDefenseRelatedCategory(etcCat, 'MINISTRY')).toBe(false)
    })

    it('inferDepartmentCategoryName & inferDepartmentKind: 부처 이름으로 카테고리와 기관 성격을 추론한다', () => {
      const jpImperial = getDepartmentNameFrame('jp-imperial')
      expect(inferDepartmentCategoryName('외무성', jpImperial)).toBe('외교')
      expect(inferDepartmentCategoryName('참모본부')).toBe('국방')
      expect(inferDepartmentKind('궁내성', jpImperial)).toBe('ROYAL_HOUSEHOLD')
      expect(inferDepartmentKind('종친부')).toBe('ROYAL_HOUSEHOLD')
    })

    it('resolveCabinetMinisterCount & shouldHideCabinetFromExecutiveTimeline: 이중 기록 중복 합산 방지 및 유럽 군주 유령 내각 숨김·친정 유지', () => {
      expect(resolveCabinetMinisterCount({ members: 4, memberTenures: 4 })).toBe(4)
      expect(resolveCabinetMinisterCount({ members: 6, memberTenures: 2 })).toBe(6)
      expect(
        shouldHideCabinetFromExecutiveTimeline(
          { positionType: 'HEAD_OF_STATE', title: '영국 국왕' },
          { name: null, description: null, _count: { members: 0, memberTenures: 0 } },
        ),
      ).toBe(true)
      expect(
        shouldHideCabinetFromExecutiveTimeline(
          { positionType: 'HEAD_OF_STATE', title: '국왕 친정' },
          { name: null, description: null, _count: { members: 0, memberTenures: 0 } },
        ),
      ).toBe(false)
    })

    it('computeCabinetReshuffleMetaMap: 동일 수반 재임 아래 개각 내각을 제1·2·3차로 정렬하고 인접 연속 플래그를 계산한다', async () => {
      const { computeCabinetReshuffleMetaMap } = await import(
        '@/pages/government/government-helpers'
      )
      const listNewestFirst = [
        {
          id: 'cab-3rd',
          startDate: '1935-03-04',
          headTenure: { id: 'tenure-gombos', startDate: '1932-10-01' },
        },
        {
          id: 'cab-2nd',
          startDate: '1934-01-01',
          headTenure: { id: 'tenure-gombos', startDate: '1932-10-01' },
        },
        {
          id: 'cab-1st',
          startDate: '1932-10-01',
          headTenure: { id: 'tenure-gombos', startDate: '1932-10-01' },
        },
        {
          id: 'cab-other',
          startDate: '1931-08-24',
          headTenure: { id: 'tenure-karolyi', startDate: '1931-08-24' },
        },
      ] as never[]

      const metaMap = computeCabinetReshuffleMetaMap(listNewestFirst)
      expect(metaMap.has('cab-other')).toBe(false)
      expect(metaMap.get('cab-1st')).toEqual({
        order: 1,
        total: 3,
        isContinuationFromPrev: true,
        isContinuedInNext: false,
      })
      expect(metaMap.get('cab-2nd')).toEqual({
        order: 2,
        total: 3,
        isContinuationFromPrev: true,
        isContinuedInNext: true,
      })
      expect(metaMap.get('cab-3rd')).toEqual({
        order: 3,
        total: 3,
        isContinuationFromPrev: false,
        isContinuedInNext: true,
      })
    })
  })

  describe('기관 생애주기 상태(resolveDepartmentLifecycleStatus) 및 시점 필터(isDepartmentActiveAtSignedYear)', () => {
    it('역사 정치체(historicalCountryId) 소속 기관은 폐지일 미기재여도 ACTIVE(현존)가 아닌 HISTORICAL_ENDED로 판정한다', () => {
      const empireMinistry = makeDept({
        id: 'dept-kuk-war',
        name: '제국전쟁성',
        countryId: 'at',
        historicalCountryId: 'austria-hungary',
      })
      expect(resolveDepartmentLifecycleStatus(empireMinistry)).toBe(
        'HISTORICAL_ENDED',
      )

      const modernMinistry = makeDept({
        id: 'dept-kr-mofa',
        name: '외교부',
        countryId: 'kr',
        historicalCountryId: null,
      })
      expect(resolveDepartmentLifecycleStatus(modernMinistry)).toBe('ACTIVE')
    })

    it('후신 기관(successors) 또는 군사조직 개편 이력(militaryUnitSuccessors)이 있으면 SUPERSEDED로 판정한다', () => {
      const reorganizedMinistry = makeDept({
        id: 'dept-reichswehr',
        name: '제국전쟁성',
        countryId: 'de',
        historicalCountryId: 'nazi-germany',
        militaryUnitSuccessors: [
          {
            transitionId: 'tr-1',
            kind: 'REORGANIZE',
            era: 'AD',
            year: 1938,
            month: 2,
            note: null,
            militaryUnit: {
              id: 'unit-okw',
              name: '국방군 최고사령부',
              abbreviation: 'OKW',
              unitType: 'SUPREME_COMMAND',
            },
          },
        ],
      })
      expect(resolveDepartmentLifecycleStatus(reorganizedMinistry)).toBe(
        'SUPERSEDED',
      )

      const abolishedMinistry = makeDept({
        id: 'dept-abolished',
        name: '동력자원부',
        countryId: 'kr',
        abolished: {
          era: 'AD',
          year: 1993,
          month: 3,
          day: 6,
          precision: 'DAY',
        },
      })
      expect(resolveDepartmentLifecycleStatus(abolishedMinistry)).toBe(
        'ABOLISHED',
      )
    })

    it('설립·폐지일 미기재 역사 기관도 소속 역사 정치체 존속 구간(politySpan)으로 시점 필터를 판정한다', () => {
      const austriaHungarySpan = {
        startEra: 'AD',
        startYear: 1867,
        endEra: 'AD',
        endYear: 1918,
      }
      const empireForeignMin = makeDept({
        id: 'dept-kuk-foreign',
        name: '제국외무성',
        countryId: 'at',
        historicalCountryId: 'austria-hungary',
      })

      expect(
        isDepartmentActiveAtSignedYear(
          empireForeignMin,
          1914,
          austriaHungarySpan,
        ),
      ).toBe(true)
      expect(
        isDepartmentActiveAtSignedYear(
          empireForeignMin,
          2025,
          austriaHungarySpan,
        ),
      ).toBe(false)
    })
  })

  describe('헌법·비내각 국가기구 분리 (isConstitutionalNonExecutiveOrgan / isNonCabinetStateOrgan)', () => {
    it('대법원·헌법재판소·국회·선관위 등 헌법·비내각 기관은 행정부 내각 포트폴리오 후보에서 제외한다', () => {
      const supremeCourt = makeDept({
        id: 'dept-sc',
        name: '대법원',
        kind: 'OTHER',
        countryId: 'kr',
      })
      const constCourt = makeDept({
        id: 'dept-cc',
        name: '헌법재판소',
        kind: 'MINISTRY',
        countryId: 'kr',
      })
      const ministryOfJustice = makeDept({
        id: 'dept-moj',
        name: '법무부',
        kind: 'MINISTRY',
        countryId: 'kr',
      })

      expect(isConstitutionalNonExecutiveOrgan(supremeCourt)).toBe(true)
      expect(isConstitutionalNonExecutiveOrgan(constCourt)).toBe(true)
      expect(isNonCabinetStateOrgan(supremeCourt)).toBe(true)
      expect(isNonCabinetStateOrgan(ministryOfJustice)).toBe(false)

      const filtered = filterDepartmentsForCabinet(
        [supremeCourt, constCourt, ministryOfJustice],
        {
          countryId: 'kr',
          historicalCountryId: null,
          startDate: '2022-05-10',
          endDate: null,
        },
      )
      expect(filtered.map((dept) => dept.id)).toEqual(['dept-moj'])
    })
  })
})
