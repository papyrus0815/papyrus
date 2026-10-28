jest.mock('@/shared/ui/toast', () => ({ notify: { error: jest.fn() } }))

import { checkBasicInfo } from './validators'

describe('checkBasicInfo — 날짜 칸 직접 입력 오류', () => {
  it('종료 칸이 무효면 빈 종료(진행 중)로 저장되지 않고 막힌다', () => {
    const result = checkBasicInfo({
      title: '한국 전쟁',
      startDate: '1950-06-25',
      endDate: '',
      endDateInputError: '2월은 28일까지입니다.',
    })
    expect(result.ok).toBe(false)
    expect(result.fields.endDate).toBe('종료일: 2월은 28일까지입니다.')
  })

  it("시작 칸이 무효면 '선택해주세요' 대신 그 이유를 말한다", () => {
    const result = checkBasicInfo({ title: '사건', startDate: '', startDateInputError: '월은 1부터 12까지입니다.' })
    expect(result.fields.startDate).toBe('시작일: 월은 1부터 12까지입니다.')
  })

  it('오류가 없으면 기존 검사 그대로', () => {
    expect(checkBasicInfo({ title: '사건', startDate: '1950-01-01', startDateInputError: null }).ok).toBe(true)
  })
})
