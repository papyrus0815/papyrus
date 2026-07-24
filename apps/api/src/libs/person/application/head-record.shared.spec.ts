import {
  deathInfoOf,
  effectiveEndYear,
  signedYearFromEraDate,
  signedYearFromStructuredOrDate,
  utcYearStart,
  yearOf,
} from './head-record.shared'

/**
 * 수장 기록 공용 원시 특성화 — 두 소비자(person-contemporaries·person-reign-adjacency)
 * 스펙이 프로덕션 유틸을 직접 부르지 않고 로컬 utc()로 재구현하며 픽스처 연도가 전부 ≥1400
 * 이라, 가장 함정적인 분기(y<100 DATETIME 트랩·BC 부호·isDeathDateUnknown)가 무검증이었다.
 * 이 스펙은 그 분기들을 프로덕션 함수로 직접 못 박아 조용한 회귀(예: utcYearStart를
 * new Date(Date.UTC(year,0,1))로 단순화 시 AD1~99가 1901~1999로 오염)를 잡는다.
 */

/** 부호 연도 → 그 연도 1월 1일 UTC (트랩 회피용, utcYearStart 검증 기준값) */
function utcYearStartControl(year: number): Date {
  const date = new Date(Date.UTC(2000, 0, 1))
  date.setUTCFullYear(year)
  return date
}

describe('yearOf', () => {
  it('null/undefined는 null', () => {
    expect(yearOf(null)).toBeNull()
    expect(yearOf(undefined)).toBeNull()
  })

  it('Date의 UTC 연도를 반환', () => {
    expect(yearOf(utcYearStartControl(1418))).toBe(1418)
  })
})

describe('utcYearStart — new Date(Date.UTC(y,...))의 y<100→19xx 트랩 회피', () => {
  it.each([1, 50, 99, 100, 768, 1999])('연도 %i를 정확히 그 연도로 만든다', (year) => {
    expect(utcYearStart(year).getUTCFullYear()).toBe(year)
  })

  it('AD 1~99가 19xx로 오염되지 않는다 (트랩의 핵심)', () => {
    expect(utcYearStart(50).getUTCFullYear()).toBe(50)
    expect(utcYearStart(50).getUTCFullYear()).not.toBe(1950)
  })

  it('1월 1일 자정 UTC로 정규화된다', () => {
    const date = utcYearStart(1418)
    expect(date.getUTCMonth()).toBe(0)
    expect(date.getUTCDate()).toBe(1)
    expect(date.getUTCHours()).toBe(0)
  })
})

describe('signedYearFromEraDate — era 플래그로 부호 결정', () => {
  it('BC는 음수', () => {
    expect(signedYearFromEraDate('BC', utcYearStartControl(247))).toBe(-247)
  })

  it('AD/null은 양수', () => {
    expect(signedYearFromEraDate('AD', utcYearStartControl(1418))).toBe(1418)
    expect(signedYearFromEraDate(null, utcYearStartControl(1418))).toBe(1418)
  })

  it('날짜가 없으면 era와 무관하게 null', () => {
    expect(signedYearFromEraDate('BC', null)).toBeNull()
  })
})

describe('signedYearFromStructuredOrDate — 구조화 축 우선, DATETIME 폴백', () => {
  it('구조화 연도가 있으면 DATETIME보다 우선한다', () => {
    // startDate가 없어도(구조화 재위: AD<1000·BC는 startDate=NULL) 구조화 축으로 파생
    expect(signedYearFromStructuredOrDate('AD', 768, null)).toBe(768)
  })

  it('구조화 BC는 음수', () => {
    expect(signedYearFromStructuredOrDate('BC', 44, null)).toBe(-44)
  })

  it('구조화 연도가 없으면 DATETIME 폴백 (레거시 재위·tenure)', () => {
    expect(signedYearFromStructuredOrDate(null, null, utcYearStartControl(1643))).toBe(1643)
  })

  it('구조화 연도가 있으면 DATETIME 값이 달라도 구조화가 이긴다', () => {
    // 병행 채운 AD1000+ 재위: 구조화(1643)와 DATETIME(1643) 일치가 정상이지만,
    // 우선순위 계약을 못 박기 위해 서로 다른 값을 주고 구조화 채택을 확인
    expect(
      signedYearFromStructuredOrDate('AD', 1643, utcYearStartControl(1642)),
    ).toBe(1643)
  })

  it('둘 다 없으면 null', () => {
    expect(signedYearFromStructuredOrDate(null, null, null)).toBeNull()
  })
})

describe('effectiveEndYear — 종료일 미입력의 사망 캡·미래시작 클램프', () => {
  const nowYear = 2026

  it('종료 연도가 있으면 그대로 (시작 미만이면 시작으로 클램프)', () => {
    expect(
      effectiveEndYear({
        startYear: 1418,
        endYear: 1450,
        death: { deathSignedYear: null, deceasedWithUnknownDeathYear: false },
        nowYear,
      }),
    ).toBe(1450)
  })

  it('종료 미입력 + 사망 연도 있음 → min(사망, 올해)로 캡', () => {
    expect(
      effectiveEndYear({
        startYear: 1418,
        endYear: null,
        death: { deathSignedYear: 1450, deceasedWithUnknownDeathYear: false },
        nowYear,
      }),
    ).toBe(1450)
  })

  it('종료·사망 미상 + deceasedWithUnknownDeathYear → 시작 연도로 클램프', () => {
    expect(
      effectiveEndYear({
        startYear: 1418,
        endYear: null,
        death: { deathSignedYear: null, deceasedWithUnknownDeathYear: true },
        nowYear,
      }),
    ).toBe(1418)
  })

  it('종료·사망 정보 전무(생존 현직) → 올해까지', () => {
    expect(
      effectiveEndYear({
        startYear: 2020,
        endYear: null,
        death: { deathSignedYear: null, deceasedWithUnknownDeathYear: false },
        nowYear,
      }),
    ).toBe(nowYear)
  })

  it('미래 시작일 오타(2062)여도 startYear 미만으로 내려가지 않는다 (음수 겹침 방지)', () => {
    expect(
      effectiveEndYear({
        startYear: 2062,
        endYear: null,
        death: { deathSignedYear: null, deceasedWithUnknownDeathYear: false },
        nowYear,
      }),
    ).toBe(2062)
  })
})

describe('deathInfoOf', () => {
  it('deathEra/deathDate에서 부호 사망 연도를 파생 (BC 음수)', () => {
    const info = deathInfoOf({ deathEra: 'BC', deathDate: utcYearStartControl(44) })
    expect(info.deathSignedYear).toBe(-44)
    expect(info.deceasedWithUnknownDeathYear).toBe(false)
  })

  it('사망 연도 미상 + isAlive===false → deceasedWithUnknownDeathYear', () => {
    const info = deathInfoOf({ deathDate: null, isAlive: false })
    expect(info.deathSignedYear).toBeNull()
    expect(info.deceasedWithUnknownDeathYear).toBe(true)
  })

  it('사망 연도 미상 + isDeathDateUnknown===true → deceasedWithUnknownDeathYear', () => {
    // 두 소비자 스펙이 검증하지 않던 분기 (isAlive 경로만 커버돼 있었음)
    const info = deathInfoOf({ deathDate: null, isDeathDateUnknown: true })
    expect(info.deceasedWithUnknownDeathYear).toBe(true)
  })

  it('생존자(isAlive===true, 사망일 없음)는 deceased 플래그 false', () => {
    const info = deathInfoOf({ deathDate: null, isAlive: true })
    expect(info.deathSignedYear).toBeNull()
    expect(info.deceasedWithUnknownDeathYear).toBe(false)
  })
})
