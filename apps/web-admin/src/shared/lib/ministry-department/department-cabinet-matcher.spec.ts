import {
  compareCabinetsNewestFirst,
  dateRangesOverlapIso,
  filterDepartmentsForCabinet,
  findDepartmentForMember,
  getTenureChronologyKey,
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
  ministryFormFieldsFromDepartment,
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
  })

  describe('ministry-department-utils & department-name-frames', () => {
    it('ministryFormFieldsFromDepartment: 기원전(BC) 부호 포함 ISO 날짜(-0221-01-01)가 잘리지 않고 historicalCountryId가 보존된다', () => {
      const dept = makeDept({
        id: 'dept-qin',
        name: '승상부',
        historicalCountryId: 'hc-qin',
        establishedDate: '-0221-01-01T00:00:00.000Z',
        abolishedDate: '-0206-10-01',
      })
      const fields = ministryFormFieldsFromDepartment(dept)
      expect(fields.establishedDate).toBe('-0221-01-01')
      expect(fields.abolishedDate).toBe('-0206-10-01')
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
  })
})
