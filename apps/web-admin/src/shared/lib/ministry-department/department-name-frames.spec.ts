import {
  DEFAULT_DEPARTMENT_FRAME_ID,
  getDepartmentNameFrame,
  inferDepartmentCategoryName,
  inferDepartmentFrameId,
  inferDepartmentFrameIdFromCountry,
  inferDepartmentKind,
  inferExplicitDepartmentCategoryName,
  matchDepartmentCategoryByName,
  resolveCategoryByCanonicalName,
  suggestFrameItems,
} from './department-name-frames'

describe('부처 이름 틀', () => {
  describe('inferDepartmentFrameId', () => {
    it('부처가 하나도 없으면 기본 틀', () => {
      expect(inferDepartmentFrameId([])).toBe(DEFAULT_DEPARTMENT_FRAME_ID)
    })

    it('외무성·내무성이 있으면 일본 제국 틀로 짐작한다', () => {
      expect(inferDepartmentFrameId(['외무성', '내무성', '대장성'])).toBe(
        'jp-imperial',
      )
    })

    it('이조·호조가 있으면 조선 6조 틀', () => {
      expect(inferDepartmentFrameId(['이조', '호조', '병조'])).toBe('joseon')
    })

    it('어느 틀에도 안 걸리면 기본 틀 — 틀린 추측보다 낫다', () => {
      expect(inferDepartmentFrameId(['원로원', '집정관부'])).toBe(
        DEFAULT_DEPARTMENT_FRAME_ID,
      )
    })

    it('나라 이름이 앞에 붙어도(미국 국무부) 알아본다', () => {
      expect(inferDepartmentFrameId(['미국 국방부', '미국 교육부'])).toBe('bu')
    })
  })

  describe('suggestFrameItems', () => {
    it('이미 만든 자리는 다른 틀 이름으로 걸려도 다시 권하지 않는다', () => {
      const frame = getDepartmentNameFrame('jp-imperial')
      const names = suggestFrameItems(frame, ['외무부']).map((item) => item.name)
      expect(names).not.toContain('외무성')
      expect(names).toContain('내무성')
    })

    it('틀을 바꾸면 그 틀의 이름으로 권한다', () => {
      const names = suggestFrameItems(
        getDepartmentNameFrame('joseon'),
        [],
      ).map((item) => item.name)
      expect(names).toEqual(['이조', '호조', '예조', '병조', '형조', '공조'])
    })

    it('모든 틀 항목의 카테고리는 이름이 비어 있지 않다', () => {
      const frame = getDepartmentNameFrame('cn')
      expect(
        frame.items.every((item) => item.categoryName.trim().length > 0),
      ).toBe(true)
    })
  })

  describe('타국 비교용 공통 직능 분류 자동 매칭', () => {
    const sampleCategories = [
      { id: 'cat-foreign', name: '외교' },
      { id: 'cat-defense', name: '국방' },
      { id: 'cat-finance', name: '재정·경제' },
      { id: 'cat-intel', name: '정보·정보기관' },
      { id: 'cat-comm', name: '정보·통신' },
      { id: 'cat-plan', name: '기획·조정' },
      { id: 'cat-etc', name: '기타' },
    ]

    it('외무부·외무성·국무부·예조 모두 「외교」 직능으로 매칭한다', () => {
      expect(
        matchDepartmentCategoryByName('외무부', sampleCategories)?.id,
      ).toBe('cat-foreign')
      expect(
        matchDepartmentCategoryByName('외무성', sampleCategories)?.id,
      ).toBe('cat-foreign')
      expect(
        matchDepartmentCategoryByName('미국 국무부', sampleCategories)?.id,
      ).toBe('cat-foreign')
      expect(
        matchDepartmentCategoryByName('예조', sampleCategories)?.id,
      ).toBe('cat-foreign')
    })

    it('중앙정보국·국가정보원은 「정보·통신」이 아니라 「정보·정보기관」으로 매칭한다', () => {
      expect(
        matchDepartmentCategoryByName('중앙정보국', sampleCategories)?.id,
      ).toBe('cat-intel')
      expect(
        matchDepartmentCategoryByName('국가정보원', sampleCategories)?.id,
      ).toBe('cat-intel')
      expect(
        matchDepartmentCategoryByName('체신성', sampleCategories)?.id,
      ).toBe('cat-comm')
    })

    it('명시적 규칙에 걸리지 않는 임의 문자열은 타이핑 중 기타로 강제하지 않고 null을 반환한다', () => {
      expect(inferExplicitDepartmentCategoryName('외')).toBeNull()
      expect(inferExplicitDepartmentCategoryName('특별자문기구')).toBeNull()
      expect(
        matchDepartmentCategoryByName('특별자문기구', sampleCategories),
      ).toBeNull()
      expect(inferDepartmentCategoryName('특별자문기구')).toBe('기타')
    })

    it('유의어(외무 ↔ 외교) 카테고리 이름도 상호 연결한다', () => {
      expect(
        resolveCategoryByCanonicalName('외무', sampleCategories)?.id,
      ).toBe('cat-foreign')
      expect(
        resolveCategoryByCanonicalName('외교', [{ id: 'c1', name: '외무' }])?.id,
      ).toBe('c1')
    })

    it('대법원·헌법재판소·중앙선거관리위원회는 법무가 아닌 헌법·독립·기타 분류 및 OTHER 종류로 추론한다', () => {
      const catsWithJustice = [
        ...sampleCategories,
        { id: 'cat-justice', name: '법무' },
      ]
      expect(matchDepartmentCategoryByName('대법원', catsWithJustice)?.id).toBe(
        'cat-etc',
      )
      expect(
        matchDepartmentCategoryByName('헌법재판소', catsWithJustice)?.id,
      ).toBe('cat-etc')
      expect(
        matchDepartmentCategoryByName('중앙선거관리위원회', catsWithJustice)?.id,
      ).toBe('cat-etc')
      expect(matchDepartmentCategoryByName('법무부', catsWithJustice)?.id).toBe(
        'cat-justice',
      )

      expect(inferDepartmentKind('대법원')).toBe('OTHER')
      expect(inferDepartmentKind('헌법재판소')).toBe('OTHER')
      expect(inferDepartmentKind('중앙선거관리위원회')).toBe('OTHER')
      expect(inferDepartmentKind('대통령비서실')).toBe('ROYAL_HOUSEHOLD')
      expect(inferDepartmentKind('조선총독부')).toBe('COLONIAL_GOVERNMENT')
    })

    it('오스트리아-헝가리·소련(인민위원부)·사회주의권·유럽 국가의 부처 이름 틀을 정확히 추론한다', () => {
      expect(
        inferDepartmentFrameIdFromCountry({
          name: '오스트리아-헝가리 제국',
          isHistorical: true,
        }),
      ).toBe('austria-hungary')
      expect(
        inferDepartmentFrameIdFromCountry({
          name: '소비에트 사회주의 공화국 연방',
          isHistorical: true,
        }),
      ).toBe('socialist-commissariat')
      expect(
        inferDepartmentFrameId(['내무인민위원부', '외무인민위원부']),
      ).toBe('socialist-commissariat')
      expect(
        inferDepartmentFrameIdFromCountry({
          name: '헝가리 인민공화국',
          isHistorical: true,
        }),
      ).toBe('socialist-ministry')
      expect(
        inferDepartmentFrameIdFromCountry({
          isoCode: 'HU',
          name: '헝가리',
        }),
      ).toBe('eu-continental')
    })
  })
})
