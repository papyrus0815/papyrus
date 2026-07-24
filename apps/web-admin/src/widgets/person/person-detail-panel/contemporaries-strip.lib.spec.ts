/**
 * 동시대 수장 스트립 어댑터 특성화 — categorizePosition kind 계약(SOVEREIGN_REIGN
 * 정확 일치), BC-safe 부호 연도 표기, 국가 그룹핑(역사국가 우선)을 못 박는다.
 */
import {
  categoryOfRecord,
  chipLabelOf,
  groupRulersByCountry,
  primaryRecordOf,
  spanTextOf,
  windowCaptionOf,
} from '@/widgets/person/person-detail-panel/contemporaries-strip.lib'
import type {
  ContemporaryRecord,
  ContemporaryRuler,
} from '@/shared/api/person-contemporaries'

function record(overrides: Partial<ContemporaryRecord> = {}): ContemporaryRecord {
  return {
    recordId: overrides.recordId ?? 'rec-1',
    recordKind: 'SOVEREIGN_REIGN',
    positionType: 'HEAD_OF_STATE',
    title: '국왕',
    appointmentMethod: null,
    regnalName: null,
    regnalNumber: null,
    termNumber: null,
    startYear: 1418,
    endYear: 1450,
    startDate: '1418-08-01T00:00:00.000Z',
    endDate: '1450-02-01T00:00:00.000Z',
    country: null,
    historicalCountry: { id: 'joseon', name: '조선' },
    ...overrides,
  }
}

function ruler(
  personOverrides: Partial<ContemporaryRuler['person']> = {},
  records: ContemporaryRecord[] = [record()],
): ContemporaryRuler {
  return {
    person: {
      id: personOverrides.id ?? 'p-1',
      name: '이도',
      surname: null,
      middleName: null,
      nameDisplayOrder: null,
      country: null,
      profileImageUrl: null,
      templeName: null,
      regnalName: null,
      isAlive: false,
      deathYear: 1450,
      isOwned: true,
      ...personOverrides,
    },
    records,
    overlapYears: 10,
  }
}

const WINDOW = { fromYear: 1400, toYear: 1461 }

describe('categoryOfRecord — categorizePosition kind 계약', () => {
  it('SOVEREIGN_REIGN은 무조건 군주 (kind 정확 일치 — lowercase kind 함정 방지)', () => {
    expect(categoryOfRecord(record())).toBe('MONARCH')
  })

  it('HEAD_OF_GOVERNMENT 재임은 총리', () => {
    expect(
      categoryOfRecord(
        record({ recordKind: 'TENURE', positionType: 'HEAD_OF_GOVERNMENT', title: '총리' }),
      ),
    ).toBe('PM')
  })

  it('HEAD_OF_STATE 재임은 임명방식으로 분기 — 직선제는 대통령, 세습은 군주', () => {
    expect(
      categoryOfRecord(
        record({
          recordKind: 'TENURE',
          positionType: 'HEAD_OF_STATE',
          title: '대통령',
          appointmentMethod: 'DIRECT_ELECTION',
        }),
      ),
    ).toBe('PRESIDENT')
    expect(
      categoryOfRecord(
        record({
          recordKind: 'TENURE',
          positionType: 'HEAD_OF_STATE',
          title: '국왕',
          appointmentMethod: 'HEREDITARY',
        }),
      ),
    ).toBe('MONARCH')
  })
})

describe('chipLabelOf — 묘호·왕호 우선', () => {
  it('묘호(templeName)가 있으면 최우선', () => {
    expect(chipLabelOf(ruler({ templeName: '세종' }), record())).toBe('세종')
  })

  it('묘호가 없으면 기록의 왕호(regnalName)', () => {
    expect(chipLabelOf(ruler(), record({ regnalName: '루이 14세' }))).toBe('루이 14세')
  })

  it('둘 다 없으면 표시명 규칙으로 폴백', () => {
    expect(chipLabelOf(ruler({ name: '이도' }), record())).toBe('이도')
  })

  it('개인 오버라이드가 없으면 주 국적의 서양식 기본이 적용된다 (성이 뒤로)', () => {
    const westerner = ruler({
      name: 'Franklin',
      surname: 'Roosevelt',
      country: { defaultNameDisplayOrder: 'western' },
    })
    expect(chipLabelOf(westerner, record())).toBe('Franklin Roosevelt')
  })
})

describe('spanTextOf — 종료일 미기록의 재위 중/미상 구분', () => {
  it('양쪽 있으면 "1418–1450"', () => {
    expect(spanTextOf(ruler(), record())).toBe('1418–1450')
  })

  it('종료 미기록 + 생존이면 재위 중 표기 "2022–"', () => {
    expect(
      spanTextOf(
        ruler({ isAlive: true, deathYear: null }),
        record({ startYear: 2022, endYear: null }),
      ),
    ).toBe('2022–')
  })

  it('종료 미기록 + 사망이면 미상 표기 "1418–?"', () => {
    expect(spanTextOf(ruler(), record({ endYear: null }))).toBe('1418–?')
  })

  it('생존자라도 표시 record가 최신 재위가 아니면 종료 미기록은 "미상(–?)"', () => {
    // 생존 인물의 옛 재위(1990–, 종료 공란)가 primary로 걸려도 진행 중처럼 오표기하지 않는다
    const oldReign = record({ recordId: 'old', startYear: 1990, endYear: null })
    const newerReign = record({ recordId: 'new', startYear: 2010, endYear: 2015 })
    const alive = ruler({ isAlive: true, deathYear: null }, [oldReign, newerReign])
    expect(spanTextOf(alive, oldReign)).toBe('1990–?')
  })

  it('BC 음수 연도는 "BC N"으로 (부호 연도 계약)', () => {
    expect(
      spanTextOf(ruler(), record({ startYear: -247, endYear: -210 })),
    ).toBe('BC 247–BC 210')
  })
})

describe('primaryRecordOf — 창과 가장 길게 겹치는 기록', () => {
  it('겹침이 긴 기록을 고른다', () => {
    const short = record({ recordId: 'short', startYear: 1440, endYear: 1445 })
    const long = record({ recordId: 'long', startYear: 1410, endYear: 1450 })
    expect(primaryRecordOf(ruler({}, [short, long]), WINDOW).recordId).toBe('long')
  })

  it('종료 미기록은 창 끝까지 겹치는 것으로 간주', () => {
    const closed = record({ recordId: 'closed', startYear: 1400, endYear: 1410 })
    const open = record({ recordId: 'open', startYear: 1430, endYear: null })
    expect(primaryRecordOf(ruler({}, [closed, open]), WINDOW).recordId).toBe('open')
  })
})

describe('groupRulersByCountry', () => {
  it('역사국가 우선으로 묶고, 서버 정렬의 첫 등장 순서를 보존한다', () => {
    const joseonKing = ruler({ id: 'sejong', templeName: '세종' })
    const mingEmperor = ruler({ id: 'yongle', templeName: '영락제' }, [
      record({ historicalCountry: { id: 'ming', name: '명' } }),
    ])
    const joseonKing2 = ruler({ id: 'munjong', templeName: '문종' })
    const groups = groupRulersByCountry([joseonKing, mingEmperor, joseonKing2], WINDOW)
    expect(groups.map((group) => group.label)).toEqual(['조선', '명'])
    expect(groups[0]!.chips.map((chip) => chip.label)).toEqual(['세종', '문종'])
  })

  it('국가 정보가 없는 기록(교황 등)은 기타 그룹, 현대국가는 국기 이모지 유지', () => {
    const pope = ruler({ id: 'pope' }, [
      record({ historicalCountry: null, country: null, title: '교황' }),
    ])
    const president = ruler({ id: 'kr-president' }, [
      record({
        recordKind: 'TENURE',
        positionType: 'HEAD_OF_STATE',
        appointmentMethod: 'DIRECT_ELECTION',
        historicalCountry: null,
        country: { id: 'kr', name: '대한민국', flagEmoji: '🇰🇷' },
      }),
    ])
    const groups = groupRulersByCountry([pope, president], WINDOW)
    expect(groups.map((group) => group.label)).toEqual(['기타', '대한민국'])
    expect(groups[1]!.flagEmoji).toBe('🇰🇷')
    expect(groups[0]!.chips[0]!.category).toBe('POPE')
  })

  it('역사국가 그룹은 dual-fill로 현대국가가 붙어도 현대 국기를 표시하지 않는다', () => {
    // '🇰🇷 조선'처럼 어긋나는 표기 방지 — 역사국가(H:) 그룹은 라벨만
    const joseonWithModern = ruler({ id: 'sejong', templeName: '세종' }, [
      record({
        historicalCountry: { id: 'joseon', name: '조선' },
        country: { id: 'kr', name: '대한민국', flagEmoji: '🇰🇷' },
      }),
    ])
    const groups = groupRulersByCountry([joseonWithModern], WINDOW)
    expect(groups[0]!.label).toBe('조선')
    expect(groups[0]!.flagEmoji).toBeNull()
  })

  it('isOwned가 칩까지 전달된다 (타계정 칩 비활성 근거)', () => {
    const foreign = ruler({ id: 'others', isOwned: false })
    const groups = groupRulersByCountry([foreign], WINDOW)
    expect(groups[0]!.chips[0]!.isOwned).toBe(false)
  })
})

describe('windowCaptionOf — toYear 배타 보정', () => {
  it('구간은 "1418–1450" (toYear-1)', () => {
    expect(windowCaptionOf({ fromYear: 1418, toYear: 1451 })).toBe('1418–1450')
  })

  it('단년 창은 연도 하나만', () => {
    expect(windowCaptionOf({ fromYear: 1418, toYear: 1419 })).toBe('1418')
  })

  it('BC 창도 부호 표기', () => {
    expect(windowCaptionOf({ fromYear: -247, toYear: -209 })).toBe('BC 247–BC 210')
  })
})
