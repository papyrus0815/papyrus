import {
  DEFAULT_DEPARTMENT_FRAME_ID,
  getDepartmentNameFrame,
  inferDepartmentFrameId,
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
})
