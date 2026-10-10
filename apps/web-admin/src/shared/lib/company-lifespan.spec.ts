import { companyLifespanLabel } from './company-lifespan'

describe('companyLifespanLabel', () => {
  it('활동 중이면 올해까지 N년째', () => {
    expect(
      companyLifespanLabel(
        { foundedAt: '1983-02-01', dissolvedAt: null, status: 'ACTIVE' },
        2026,
      ),
    ).toBe('43년째')
  })

  it('해산일이 있으면 N년 존속', () => {
    expect(
      companyLifespanLabel(
        { foundedAt: '1600-12-31', dissolvedAt: '1874-06-01', status: 'DISSOLVED' },
        2026,
      ),
    ).toBe('274년 존속')
  })

  it('해산 상태인데 해산일 미상이면 null', () => {
    expect(
      companyLifespanLabel(
        { foundedAt: '1900-01-01', dissolvedAt: null, status: 'MERGED' },
        2026,
      ),
    ).toBeNull()
  })

  it('설립일 미상이면 null', () => {
    expect(
      companyLifespanLabel({ foundedAt: null, dissolvedAt: null, status: 'ACTIVE' }, 2026),
    ).toBeNull()
  })
})
