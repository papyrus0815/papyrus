import type { ConnectionEdge } from '../domain/entity-graph.types'
import { dropRedundant, mergeEdges } from './entity-graph.service'
import { periodFromStructured, periodLabel } from './targets'

const target = (id: string, kind: ConnectionEdge['target']['kind'] = 'historicalCountry') => ({
  kind,
  id,
  label: id,
  subtitle: null,
  imageUrl: null,
  accessible: true,
})

const edge = (overrides: Partial<ConnectionEdge>): ConnectionEdge => ({
  relation: 'person.tenure',
  relationLabel: '재임',
  group: 'office',
  direction: 'out',
  target: target('fr3'),
  role: null,
  period: null,
  ...overrides,
})

describe('mergeEdges', () => {
  it('같은 관계·같은 대상의 기록은 한 줄로 — 건수·역할·기간을 합친다', () => {
    const merged = mergeEdges([
      edge({ role: '공병 책임 장교', period: { from: 1885, to: 1888 } }),
      edge({ role: '종대 지휘관', period: { from: 1892, to: 1895 } }),
      edge({ role: '총사령관', period: { from: 1911, to: 1916 } }),
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].count).toBe(3)
    expect(merged[0].role).toBe('공병 책임 장교 · 종대 지휘관 외 1')
    expect(merged[0].period).toEqual({ from: 1885, to: 1916 })
  })

  it('대상·방향·관계 이름이 다르면 합치지 않는다', () => {
    const merged = mergeEdges([
      edge({}),
      edge({ target: target('jp') }),
      edge({ direction: 'in', relationLabel: '재임자' }),
    ])
    expect(merged).toHaveLength(3)
    expect(merged.every((item) => item.count === 1)).toBe(true)
  })

  it('같은 역할은 한 번만 적는다', () => {
    const merged = mergeEdges([edge({ role: '대사' }), edge({ role: '대사' })])
    expect(merged[0].role).toBe('대사')
  })
})

describe('dropRedundant', () => {
  it('국적과 같은 나라의 시민권 소속은 뺀다', () => {
    const kept = dropRedundant([
      edge({ relation: 'person.nationality', relationLabel: '국적', group: 'polity' }),
      edge({ relation: 'person.affiliation', relationLabel: '시민권', group: 'polity' }),
      edge({ relation: 'person.affiliation', relationLabel: '시민권', group: 'polity', target: target('other') }),
      edge({ relation: 'person.affiliation', relationLabel: '복무', group: 'polity' }),
    ])
    expect(kept.map((item) => `${item.relationLabel}:${item.target.id}`)).toEqual([
      '국적:fr3',
      '시민권:other',
      '복무:fr3',
    ])
  })
})

describe('period 정규화', () => {
  it('구조화 축(era+year)이 DATETIME보다 우선 — 기원전도 부호 연도로', () => {
    expect(
      periodFromStructured({ startEra: 'BC', startYear: 59, startDate: null, endEra: 'BC', endYear: 44 }),
    ).toEqual({ from: -59, to: -44 })
  })

  it('라벨 — 같은 해면 한 번, 기원전은 접두', () => {
    expect(periodLabel({ from: 1906, to: 1906 })).toBe('1906')
    expect(periodLabel({ from: -59, to: -44 })).toBe('기원전 59–기원전 44')
    expect(periodLabel(null)).toBeNull()
  })
})
