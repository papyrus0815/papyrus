import { getRecordFamily } from './record-family'

describe('getRecordFamily', () => {
  it('isMonarchical=true는 군주 칭호(SOVEREIGN)', () => {
    expect(getRecordFamily({ positionType: 'HEAD_OF_STATE', isMonarchical: true })).toBe(
      'SOVEREIGN',
    )
    // 번주(다이묘)는 HEAD_OF_STATE + isMonarchical
    expect(getRecordFamily({ positionType: 'HEAD_OF_STATE', isMonarchical: true })).toBe(
      'SOVEREIGN',
    )
  })

  it('작위는 isMonarchical=false여도 NOBLE_TITLE — 실측 17건 전부 이 경로', () => {
    expect(
      getRecordFamily({ positionType: 'ROYAL_NOBLE_TITLE', isMonarchical: false }),
    ).toBe('NOBLE_TITLE')
    expect(getRecordFamily({ positionType: 'ROYAL_NOBLE_TITLE' })).toBe('NOBLE_TITLE')
  })

  it('공화정 원수·정부수반·각료는 OFFICE', () => {
    expect(getRecordFamily({ positionType: 'HEAD_OF_STATE', isMonarchical: false })).toBe(
      'OFFICE',
    )
    expect(getRecordFamily({ positionType: 'HEAD_OF_GOVERNMENT' })).toBe('OFFICE')
    expect(getRecordFamily({ positionType: 'CABINET_MINISTER' })).toBe('OFFICE')
  })

  it('군주 판정이 작위 판정보다 우선 — 작위 타입인데 주권 칭호로 표시된 경우', () => {
    expect(
      getRecordFamily({ positionType: 'ROYAL_NOBLE_TITLE', isMonarchical: true }),
    ).toBe('SOVEREIGN')
  })

  it('null·undefined는 OFFICE로 폴백 — 정의 없는 자유입력 재임이 사라지지 않게', () => {
    expect(getRecordFamily(null)).toBe('OFFICE')
    expect(getRecordFamily(undefined)).toBe('OFFICE')
    expect(getRecordFamily({})).toBe('OFFICE')
  })
})
