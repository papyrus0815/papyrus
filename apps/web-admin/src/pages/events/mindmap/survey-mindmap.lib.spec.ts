import { type EventOverviewNode, type EventOverviewRelation } from '@/shared/api/event-overview'

import { buildSurveyMindmap, defaultCollapsed } from './survey-mindmap.lib'

const node = (id: string, parentEventId: string | null, extra: Partial<EventOverviewNode> = {}): EventOverviewNode =>
  ({
    id,
    title: id.toUpperCase(),
    description: null,
    parentEventId,
    depth: parentEventId ? 1 : 0,
    startDate: '1790-01-01',
    startDatePrecision: null,
    endDate: null,
    endDatePrecision: null,
    location: null,
    locationLatitude: null,
    locationLongitude: null,
    locationNote: null,
    domain: 'POLITICS',
    type: null,
    kind: 'SINGLE',
    phaseId: null,
    phases: [],
    countries: [],
    persons: [],
    sides: [],
    metrics: [],
    sectionCount: 0,
    imageCount: 0,
    hasBackground: false,
    hasAftermath: false,
    ...extra,
  }) as EventOverviewNode

const relation = (id: string, fromId: string, toId: string, extra: Partial<EventOverviewRelation> = {}): EventOverviewRelation => ({
  id,
  fromId,
  toId,
  type: 'LED_TO',
  description: null,
  external: null,
  ...extra,
})

const root = node('root', null, { kind: 'COLLECTION' })
const groupA = node('a', 'root', { kind: 'COLLECTION' })
const groupB = node('b', 'root', { kind: 'COLLECTION' })
const a1 = node('a1', 'a')
const a2 = node('a2', 'a')
const b1 = node('b1', 'b')
const ordered = [groupA, a1, a2, groupB, b1]
const base = {
  root,
  ordered,
  numberById: new Map([
    ['a', '1'],
    ['a1', '1-1'],
    ['a2', '1-2'],
    ['b', '2'],
    ['b1', '2-1'],
  ]),
  colorOf: () => '#0d9488',
  collapsed: new Set<string>(),
  hiddenTypes: new Set<EventOverviewRelation['type']>(),
}

describe('buildSurveyMindmap', () => {
  it("'연결만'은 관계 끝과 조상만 남긴다", () => {
    const data = buildSurveyMindmap({ ...base, relations: [relation('r1', 'a1', 'b1')], mode: 'links' })
    expect([...data.specs.keys()].sort()).toEqual(['a', 'a1', 'b', 'b1', 'root'])
    expect(data.relations).toHaveLength(1)
    expect(data.specs.get('a')?.kind).toBe('branch')
  })

  it('접힌 가지로 가는 관계는 그 가지 마디로 모이고 같은 쌍은 ×N', () => {
    const data = buildSurveyMindmap({
      ...base,
      relations: [relation('r1', 'a1', 'b1'), relation('r2', 'a2', 'b1')],
      mode: 'all',
      collapsed: new Set(['a']),
    })
    expect(data.specs.has('a1')).toBe(false)
    expect(data.specs.get('a')?.collapse).toEqual({ collapsed: true, hidden: 2 })
    expect(data.relations).toEqual([expect.objectContaining({ from: 'a', to: 'b1', count: 2 })])
  })

  it('트리 밖 관계는 "이 묶음 밖" 가지로, 거른 종류는 빠진다', () => {
    const data = buildSurveyMindmap({
      ...base,
      relations: [
        relation('r1', 'a1', 'x', { external: { id: 'x', title: 'X', startDate: '1800-01-01', side: 'to' } }),
        relation('r2', 'a1', 'b1', { type: 'RELATED' }),
      ],
      mode: 'links',
      hiddenTypes: new Set(['RELATED']),
    })
    expect(data.specs.get('ext:x')?.kind).toBe('external')
    expect(data.tree.children.map((child) => child.id)).toContain('outside')
    expect(data.relations).toEqual([expect.objectContaining({ from: 'a1', to: 'ext:x' })])
    expect(data.specs.has('b1')).toBe(false)
  })
})

describe('defaultCollapsed', () => {
  it('국면 마디와 3단 이하 묶음만 접는다(첫 단 묶음은 펼친 채)', () => {
    const top = node('top', 'root', { kind: 'COLLECTION', phases: [{ id: 'p1', title: 'P1', order: 1 }] as EventOverviewNode['phases'] })
    const deep = node('deep', 'top', { kind: 'COLLECTION' })
    const ids = defaultCollapsed(root, [top, deep])
    expect([...ids].sort()).toEqual(['deep', 'phase:p1'])
  })
})
