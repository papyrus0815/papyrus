import { titleWithoutOwnDate } from './title-date'

describe('titleWithoutOwnDate', () => {
  it('행이 이미 보여주는 날짜 꼬리는 통째로 덜어낸다', () => {
    expect(
      titleWithoutOwnDate('IAEA 이란 비협조 결의 (2025-06-12)', '2025-06-12T00:00:00.000Z'),
    ).toBe('IAEA 이란 비협조 결의')
    expect(
      titleWithoutOwnDate(
        '하산 나스랄라 사살 — 이스라엘 신질서 작전 (2024-09-27)',
        '2024-09-27T00:00:00.000Z',
      ),
    ).toBe('하산 나스랄라 사살 — 이스라엘 신질서 작전')
  })

  it('기간 꼬리(~ 끝일)도 한 덩어리로 본다', () => {
    expect(
      titleWithoutOwnDate(
        '헤즈볼라 호출기·무전기 폭발 작전 (2024-09-17 ~ 18)',
        '2024-09-17T00:00:00.000Z',
      ),
    ).toBe('헤즈볼라 호출기·무전기 폭발 작전')
  })

  it('괄호 안에 날짜 말고 다른 내용이 있으면 그 내용은 남긴다', () => {
    expect(
      titleWithoutOwnDate(
        '미-이란 핵 협상 (오만·로마, 2025-04-12 ~ 05-31)',
        '2025-04-12T00:00:00.000Z',
      ),
    ).toBe('미-이란 핵 협상 (오만·로마)')
  })

  it('⚠️ 시작일과 **다른** 날짜는 제목만의 정보라 지우지 않는다', () => {
    // 실데이터: 붕괴일(12-08)과 시작일(11-27)이 다르다
    expect(
      titleWithoutOwnDate('시리아 아사드 정권 붕괴 (2024-12-08)', '2024-11-27T00:00:00.000Z'),
    ).toBe('시리아 아사드 정권 붕괴 (2024-12-08)')
  })

  it('연 정밀도면 행이 날짜를 안 쓰므로 제목을 건드리지 않는다', () => {
    expect(
      titleWithoutOwnDate('어떤 사건 (2024-09-27)', '2024-09-27T00:00:00.000Z', 'year'),
    ).toBe('어떤 사건 (2024-09-27)')
  })

  it('날짜가 아닌 괄호(연도 범위·설명)는 그대로 둔다', () => {
    expect(
      titleWithoutOwnDate('체코공화국 NATO 가입 (1989~1999)', '1999-03-12T00:00:00.000Z'),
    ).toBe('체코공화국 NATO 가입 (1989~1999)')
    expect(
      titleWithoutOwnDate('창신메모리(CXMT) 상장', '2026-07-27T00:00:00.000Z'),
    ).toBe('창신메모리(CXMT) 상장')
  })

  describe('rowShowsYear — 연도 하나뿐인 꼬리', () => {
    const year = { rowShowsYear: true }

    it('행이 연도를 보여주면 같은 연도 꼬리를 덜어낸다', () => {
      expect(
        titleWithoutOwnDate('포츠담 회담 (1945)', '1945-07-17T00:00:00.000Z', null, year),
      ).toBe('포츠담 회담')
      expect(
        titleWithoutOwnDate(
          '독일의 대러시아 최후통첩 — 총동원 중지 요구 (1914)',
          '1914-07-31T00:00:00.000Z',
          null,
          year,
        ),
      ).toBe('독일의 대러시아 최후통첩 — 총동원 중지 요구')
      // '년'이 붙은 표기도 같은 꼬리다
      expect(
        titleWithoutOwnDate('런던 조약 (1604년)', '1604-08-28T00:00:00.000Z', null, year),
      ).toBe('런던 조약')
    })

    it('opt-in이 아니면 건드리지 않는다 — 연도를 안 적는 지면이 있다', () => {
      expect(titleWithoutOwnDate('포츠담 회담 (1945)', '1945-07-17T00:00:00.000Z')).toBe(
        '포츠담 회담 (1945)',
      )
    })

    it('⚠️ 시작 연도와 **다른** 연도는 제목만의 정보다 (준공 연도 등)', () => {
      // 실데이터: 착공 1918, 제목의 1934는 개통 연도
      expect(
        titleWithoutOwnDate(
          '일본 탄나 터널 개통 — 16년 8개월의 난공사 (1934)',
          '1918-04-01T00:00:00.000Z',
          null,
          year,
        ),
      ).toBe('일본 탄나 터널 개통 — 16년 8개월의 난공사 (1934)')
    })

    it('⚠️ 범위는 끝 연도가 행 어디에도 없으므로 남긴다', () => {
      expect(
        titleWithoutOwnDate(
          '세 하인리히 전쟁 (974~978)',
          '0974-01-01T00:00:00.000Z',
          null,
          year,
        ),
      ).toBe('세 하인리히 전쟁 (974~978)')
      expect(
        titleWithoutOwnDate(
          '체코공화국 NATO 가입 (1989~1999)',
          '1999-03-12T00:00:00.000Z',
          null,
          year,
        ),
      ).toBe('체코공화국 NATO 가입 (1989~1999)')
    })

    it('연도가 아닌 괄호는 그대로', () => {
      expect(
        titleWithoutOwnDate(
          '일본 주권 회복 (강화조약 발효)',
          '1952-04-28T00:00:00.000Z',
          null,
          year,
        ),
      ).toBe('일본 주권 회복 (강화조약 발효)')
      expect(
        titleWithoutOwnDate('대슬라브 반란 (루티치 봉기)', '0983-06-29T00:00:00.000Z', null, year),
      ).toBe('대슬라브 반란 (루티치 봉기)')
    })
  })

  it('날짜가 없거나 꼬리가 없으면 원본 그대로', () => {
    expect(titleWithoutOwnDate('HBM 탄생', null)).toBe('HBM 탄생')
    expect(titleWithoutOwnDate('HBM 탄생', '2013-10-01T00:00:00.000Z')).toBe('HBM 탄생')
    expect(titleWithoutOwnDate('', '2013-10-01T00:00:00.000Z')).toBe('')
  })
})
