import { categorizePosition } from './categorize'

describe('categorizePosition — 직책 분류 단일 출처', () => {
  it('교황 title은 kind/positionType보다 먼저 POPE로 분류', () => {
    expect(categorizePosition({ positionTitle: '교황' })).toBe('POPE')
    expect(categorizePosition({ positionTitle: 'Pope Francis' })).toBe('POPE')
    // 교황 체크는 SOVEREIGN_REIGN보다 우선
    expect(
      categorizePosition({ kind: 'SOVEREIGN_REIGN', positionTitle: '교황' }),
    ).toBe('POPE')
  })

  it('SOVEREIGN_REIGN(재위) kind는 MONARCH', () => {
    expect(
      categorizePosition({ kind: 'SOVEREIGN_REIGN', positionTitle: '국왕' }),
    ).toBe('MONARCH')
  })

  it('ROYAL_NOBLE_TITLE → MONARCH, HEAD_OF_GOVERNMENT → PM', () => {
    expect(categorizePosition({ positionType: 'ROYAL_NOBLE_TITLE' })).toBe(
      'MONARCH',
    )
    expect(categorizePosition({ positionType: 'HEAD_OF_GOVERNMENT' })).toBe('PM')
  })

  describe('HEAD_OF_STATE 분기', () => {
    it('세습/추대/쿠데타 임명방식 → MONARCH', () => {
      for (const method of ['HEREDITARY', 'SUCCESSION', 'COUP']) {
        expect(
          categorizePosition({
            positionType: 'HEAD_OF_STATE',
            appointmentMethod: method,
          }),
        ).toBe('MONARCH')
      }
    })

    it('군주 전용 즉위 경위(정복·복위·선거군주제 선출) → MONARCH — 선거군주제는 선출이지만 군주', () => {
      for (const method of ['CONQUEST', 'RESTORATION', 'ELECTIVE_MONARCHY']) {
        expect(
          categorizePosition({
            positionType: 'HEAD_OF_STATE',
            appointmentMethod: method,
          }),
        ).toBe('MONARCH')
      }
    })

    it('선거 임명방식 → PRESIDENT', () => {
      for (const method of [
        'DIRECT_ELECTION',
        'INDIRECT_ELECTION',
        'PARLIAMENTARY_ELECTION',
      ]) {
        expect(
          categorizePosition({
            positionType: 'HEAD_OF_STATE',
            appointmentMethod: method,
          }),
        ).toBe('PRESIDENT')
      }
    })

    it('임명방식 없을 때 title로 분기 (대통령류 → PRESIDENT)', () => {
      expect(
        categorizePosition({
          positionType: 'HEAD_OF_STATE',
          positionTitle: '대한민국 대통령',
        }),
      ).toBe('PRESIDENT')
      expect(
        categorizePosition({
          positionType: 'HEAD_OF_STATE',
          positionTitle: '국가주석',
        }),
      ).toBe('PRESIDENT')
    })

    it('임명방식 없을 때 title로 분기 (군주류 → MONARCH)', () => {
      expect(
        categorizePosition({
          positionType: 'HEAD_OF_STATE',
          positionTitle: '국왕',
        }),
      ).toBe('MONARCH')
      expect(
        categorizePosition({
          positionType: 'HEAD_OF_STATE',
          positionTitle: 'Emperor',
        }),
      ).toBe('MONARCH')
    })

    it('임명방식이 title보다 우선 (세습인데 title이 대통령이면 MONARCH)', () => {
      expect(
        categorizePosition({
          positionType: 'HEAD_OF_STATE',
          appointmentMethod: 'HEREDITARY',
          positionTitle: '종신 대통령',
        }),
      ).toBe('MONARCH')
    })

    it('방식·title 둘 다 모호하면 OTHER', () => {
      expect(
        categorizePosition({
          positionType: 'HEAD_OF_STATE',
          positionTitle: '집정관',
        }),
      ).toBe('OTHER')
    })
  })

  it('알 수 없는 positionType은 OTHER', () => {
    expect(categorizePosition({ positionType: 'CABINET_MINISTER' })).toBe(
      'OTHER',
    )
    expect(categorizePosition({})).toBe('OTHER')
  })
})
