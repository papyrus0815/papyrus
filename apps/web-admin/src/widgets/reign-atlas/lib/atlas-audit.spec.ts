import { auditAtlasData, coverageByCentury } from './atlas-audit'
import {
  type AtlasCountryInput,
  type AtlasEventInput,
  normalizeCountries,
  normalizeRulers,
} from './atlas-model'

const countryInputs: AtlasCountryInput[] = [
  {
    id: 'prussia',
    name: '프로이센 왕국',
    latitude: 52.5,
    longitude: 13.4,
    startEra: 'AD',
    startYear: 1701,
    endEra: 'AD',
    endYear: 1918,
    parentModernCountryIds: ['de'],
  },
  {
    id: 'france',
    name: '프랑스 제2제국',
    latitude: 48.8,
    longitude: 2.3,
    startEra: 'AD',
    startYear: 1852,
    endEra: 'AD',
    endYear: 1870,
  },
  {
    id: 'nowhere',
    name: '좌표 없는 공국',
    latitude: null,
    longitude: null,
    startEra: 'AD',
    startYear: 1600,
  },
]
const countries = normalizeCountries(countryInputs)

const war = (overrides: Partial<AtlasEventInput>): AtlasEventInput => ({
  id: 'w',
  title: '보불전쟁',
  startDate: '1870-07-19T00:00:00.000Z',
  endDate: '1871-05-10T00:00:00.000Z',
  category: { name: '군사' },
  type: 'WAR',
  ...overrides,
})

function audit(extra: Partial<Parameters<typeof auditAtlasData>[0]> = {}) {
  return auditAtlasData({
    countryInputs,
    countries,
    rulers: [],
    events: [],
    treaties: [],
    ...extra,
  })
}

describe('auditAtlasData', () => {
  it('진영·역할 없는 전쟁 = 선을 못 긋는 전쟁, 진영이 있으면 통과', () => {
    const noSides = war({
      id: 'a',
      relatedHistoricalCountries: [
        { id: 'prussia', role: 'PARTICIPANT' },
        { id: 'france', role: 'PARTICIPANT' },
      ],
    })
    const withSides = war({
      id: 'b',
      title: '다른 전쟁',
      relatedHistoricalCountries: [
        { id: 'prussia', sideId: 's1' },
        { id: 'france', sideId: 's2' },
      ],
    })
    const result = audit({ events: [noSides, withSides] })
    expect(
      result.issues.warWithoutFront.map((issue) => issue.target.id),
    ).toEqual(['a'])
    expect(result.issues.warWithoutFront[0]!.detail).toContain('진영')
  })

  it('상위 전쟁이 전선을 그리면 하위 전투는 빼고, 상위가 못 그리면 보고', () => {
    const sided = war({
      id: 'top',
      relatedHistoricalCountries: [
        { id: 'prussia', sideId: 's1' },
        { id: 'france', sideId: 's2' },
      ],
    })
    const bare = war({ id: 'bare', title: '다른 전쟁' })
    const result = audit({
      events: [
        sided,
        bare,
        war({ id: 'covered', title: '스당 전투', parentEventId: 'top' }),
        war({ id: 'orphan', title: '메스 공방전', parentEventId: 'bare' }),
      ],
    })
    expect(
      result.issues.warWithoutFront.map((issue) => issue.target.id),
    ).toEqual(['bare', 'orphan'])
  })

  it('충돌이 아닌 군사 분야 사건(함대법·연설)은 점검하지 않는다 — 판정은 분야가 아니라 유형', () => {
    const result = audit({
      events: [
        war({ id: 'law', title: '제1차 함대법', type: 'LAW_POLICY' }),
        war({
          id: 'speech',
          title: '처칠 해군 예산 연설',
          type: 'DIPLOMATIC_ACT',
          relatedHistoricalCountries: [{ id: 'prussia' }, { id: 'france' }],
        }),
      ],
    })
    expect(result.issues.warWithoutFront).toHaveLength(0)
  })

  it('수장이 지도에 못 올라가는 이유 — 좌표 없음·존속 기간 밖·현대국가 미대응·미연결', () => {
    const rulers = normalizeRulers(
      [
        {
          id: 'r1',
          personId: 'p1',
          historicalCountryId: 'nowhere',
          startEra: 'AD',
          startYear: 1700,
          endEra: 'AD',
          endYear: 1720,
        },
        {
          id: 'r2',
          personId: 'p2',
          historicalCountryId: 'prussia',
          startEra: 'AD',
          startYear: 1650,
          endEra: 'AD',
          endYear: 1680,
        },
        {
          id: 'r3',
          personId: 'p3',
          countryId: 'de',
          startEra: 'AD',
          startYear: 1500,
          endEra: 'AD',
          endYear: 1520,
        },
        { id: 'r4', personId: 'p4', startEra: 'AD', startYear: 1800 },
        {
          id: 'ok',
          personId: 'p5',
          historicalCountryId: 'prussia',
          startEra: 'AD',
          startYear: 1740,
          endEra: 'AD',
          endYear: 1786,
        },
      ],
      true,
    )
    const details = audit({ rulers }).issues.rulerOffMap.map(
      (issue) => issue.detail,
    )
    expect(details).toHaveLength(4)
    expect(details[0]).toContain('현대국가')
    expect(details[1]).toContain('존속 기간')
    expect(details[2]).toContain('좌표')
    expect(details[3]).toContain('연결되지')
  })

  it('좌표 없는 나라는 수장 기록이 걸린 순서로', () => {
    const rulers = normalizeRulers(
      [
        {
          id: 'r1',
          personId: 'p1',
          historicalCountryId: 'nowhere',
          startEra: 'AD',
          startYear: 1700,
        },
      ],
      true,
    )
    const [issue] = audit({ rulers }).issues.countryWithoutCoords
    expect(issue).toMatchObject({
      title: '좌표 없는 공국',
      target: { kind: 'country', id: 'nowhere' },
    })
    expect(issue!.detail).toContain('1건')
  })

  it('만료·파기일 없는 동맹 조약', () => {
    const result = audit({
      treaties: [
        {
          id: 't1',
          name: '삼국 동맹',
          type: 'ALLIANCE',
          signDate: '1882-05-20T00:00:00.000Z',
          signatories: [],
        },
        {
          id: 't2',
          name: '영일 동맹',
          type: 'ALLIANCE',
          signDate: '1902-01-30T00:00:00.000Z',
          expiryDate: '1923-08-17T00:00:00.000Z',
          signatories: [],
        },
        {
          id: 't3',
          name: '평화조약',
          type: 'PEACE',
          signDate: '1871-05-10T00:00:00.000Z',
          signatories: [],
        },
      ],
    })
    expect(result.issues.openAlliance.map((issue) => issue.target.id)).toEqual([
      't1',
    ])
  })

  it('같은 해·겹치는 제목 = 중복 의심, 상하위 쌍과 다른 해는 제외', () => {
    const result = audit({
      events: [
        war({ id: 'short', title: '보불전쟁' }),
        war({ id: 'long', title: '프로이센-프랑스 전쟁 (보불 전쟁)' }),
        war({
          id: 'child',
          title: '보불전쟁 스당 전투',
          parentEventId: 'short',
        }),
        war({
          id: 'later',
          title: '보불전쟁 배상',
          startDate: '1890-01-01T00:00:00.000Z',
        }),
      ],
    })
    expect(result.issues.duplicateEvent.map((issue) => issue.key)).toEqual([
      'dup:short:long',
    ])
  })
})

describe('coverageByCentury', () => {
  it('세기별 수장 기록 수와 전선 연도 수', () => {
    const rulers = normalizeRulers(
      [
        {
          id: 'a',
          personId: 'a',
          startEra: 'AD',
          startYear: 1740,
          endEra: 'AD',
          endYear: 1786,
        },
        { id: 'b', personId: 'b', startEra: 'AD', startYear: 1861 },
      ],
      true,
    )
    const events = [
      war({
        relatedHistoricalCountries: [
          { id: 'prussia', sideId: 's1' },
          { id: 'france', sideId: 's2' },
        ],
      }),
    ]
    const rows = coverageByCentury({
      rulers,
      events,
      treaties: [],
      countries,
      minYear: 1701,
      maxYear: 1900,
    })
    expect(rows).toEqual([
      { century: 18, rulerCount: 1, frontYears: 0 },
      // 프랑스 제2제국이 1870년까지라 1870년 한 해만 전선
      { century: 19, rulerCount: 1, frontYears: 1 },
    ])
  })
})
