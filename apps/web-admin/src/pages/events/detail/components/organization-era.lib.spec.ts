import { organizationActiveDuring } from './organization-era.lib'

describe('organizationActiveDuring', () => {
  const ww1 = { startDate: '1914-07-28', endDate: '1918-11-11' }

  it('사건 뒤에 생긴 조직은 뺀다 — 1차세계대전에 스페이스X(2002)', () => {
    expect(organizationActiveDuring({ foundedDate: '2002-03-14T00:00:00.000Z' }, ww1)).toBe(false)
  })

  it('사건 전에 사라진 조직은 뺀다', () => {
    expect(
      organizationActiveDuring({ foundedDate: '1602-03-20', dissolvedDate: '1799-12-31' }, ww1),
    ).toBe(false)
  })

  it('사건 기간과 겹치면 남긴다 — 사건 중에 생겼거나 사건 중에 사라진 조직', () => {
    expect(organizationActiveDuring({ foundedDate: '1917-01-01' }, ww1)).toBe(true)
    expect(organizationActiveDuring({ foundedDate: '1871-01-18', dissolvedDate: '1918-11-09' }, ww1)).toBe(true)
  })

  it('설립·해산을 모르면 열린 구간으로 본다', () => {
    expect(organizationActiveDuring({}, ww1)).toBe(true)
    expect(organizationActiveDuring({ dissolvedDate: '1920-01-01' }, ww1)).toBe(true)
  })

  it('사건 날짜를 모르면 거르지 않는다', () => {
    expect(organizationActiveDuring({ foundedDate: '2002-03-14' }, {})).toBe(true)
  })

  it('끝이 없는 사건은 시작 해로 본다', () => {
    expect(organizationActiveDuring({ foundedDate: '1971-02-08' }, { startDate: '1971-02-08' })).toBe(true)
    expect(organizationActiveDuring({ foundedDate: '1972-01-01' }, { startDate: '1971-02-08' })).toBe(false)
  })

  it('기원전 사건 — 음수 해', () => {
    expect(organizationActiveDuring({ foundedDate: '1975-04-04' }, { startDate: '-0490-09-12' })).toBe(false)
  })
})
