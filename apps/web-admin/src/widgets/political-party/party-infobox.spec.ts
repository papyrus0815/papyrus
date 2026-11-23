import type { Observation } from '@/shared/api/evidence'

import { buildPartyInfobox, type PartyInfoboxInput } from './party-infobox'

jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))

const empty: PartyInfoboxInput = {
  party: { name: '국가 파시스트당', localName: 'Partito Nazionale Fascista', shortName: 'PNF', position: 'FAR_RIGHT', founded: '1921-11-09', dissolved: '1943-07-27' },
  aliases: [],
  legalStatuses: [],
  ideologies: [],
  positionPeriods: [],
  organizations: [],
  memberships: [],
  symbols: [],
  expressions: [],
  headquarters: [],
  links: [],
  lineage: null,
  observations: [],
}

const observation = (key: string, value: string, year: number, extra: Partial<Observation> = {}) =>
  ({
    id: `${key}-${year}`,
    metric: { key, name: key, valueKind: 'COUNT', unit: key === 'party.seats' ? 'seat' : 'person' },
    value,
    start: { era: 'AD', year, month: null, day: null, precision: 'year' },
    citations: [],
    ...extra,
  }) as unknown as Observation

describe('정당 인포박스 — 기록에서 만든다', () => {
  it('빈 항목은 줄을 만들지 않는다', () => {
    const box = buildPartyInfobox(empty)
    expect(box.rows.map((row) => row.key)).toEqual(['founded', 'dissolved', 'position'])
    expect(box.subtitles).toEqual(['Partito Nazionale Fascista (PNF)'])
  })

  it('청년 조직은 기(期)마다 시기 순으로, 당원은 대안이 아닌 최신값', () => {
    const youth = (name: string, startYear: number, endYear: number) => ({
      id: name,
      partyId: 'pnf',
      role: 'YOUTH_WING' as const,
      sortOrder: 0,
      startEra: 'AD' as const,
      startYear,
      endEra: 'AD' as const,
      endYear,
      organization: { id: name, name, type: 'MASS_ORGANIZATION' },
    })
    const box = buildPartyInfobox({
      ...empty,
      organizations: [youth('GIL', 1937, 1943), youth('AGF', 1921, 1926), youth('ONB', 1926, 1937)],
      observations: [
        observation('party.members', '6000000', 1939),
        observation('party.members', '9000000', 1943, { estimateRole: 'ALTERNATIVE' }),
        observation('party.members', '1000000', 1925),
      ],
    })
    expect(box.rows.find((row) => row.key === 'org-YOUTH_WING')?.items.map((item) => [item.text, item.when])).toEqual([
      ['AGF', '1921년 ~ 1926년'],
      ['ONB', '1926년 ~ 1937년'],
      ['GIL', '1937년 ~ 1943년'],
    ])
    expect(box.rows.find((row) => row.key === 'members')?.items[0]).toMatchObject({ when: '1939년' })
  })

  it('계보·당수는 이동할 대상을 가진다, 이념은 이어 쓰는 줄', () => {
    const box = buildPartyInfobox({
      ...empty,
      lineage: {
        predecessors: [
          { id: 't1', fromPartyId: 'fasci', toPartyId: 'pnf', kind: 'CONTINUITY', effectiveEra: 'AD', effectiveYear: 1921, effectiveMonth: 11, effectiveDay: 9, fromParty: { id: 'fasci', name: '이탈리아 전투 파쇼' } },
        ],
        successors: [{ id: 't2', fromPartyId: 'pnf', toPartyId: 'pfr', kind: 'SUCCESSION', effectiveEra: 'AD', effectiveYear: 1943, toParty: { id: 'pfr', name: '공화 파시스트당' } }],
      },
      memberships: [
        { id: 'm1', personId: 'mussolini', partyId: 'pnf', officeKind: 'LEADER', roleTitle: '두체 (Il Duce)', isFounder: true, startEra: 'AD', startYear: 1921, endEra: 'AD', endYear: 1943, person: { id: 'mussolini', name: '베니토', surname: '무솔리니', nameDisplayOrder: 'western' } },
      ],
      ideologies: [
        { id: 'i2', partyId: 'pnf', ideologyId: 'b', isPrimary: false, sortOrder: 1, ideology: { id: 'b', name: '조합주의', category: 'IDEOLOGY' } },
        { id: 'i1', partyId: 'pnf', ideologyId: 'a', isPrimary: true, sortOrder: 0, ideology: { id: 'a', name: '이탈리아 파시즘', category: 'IDEOLOGY' } },
      ],
    })
    expect(box.rows.find((row) => row.key === 'predecessors')?.items[0]).toMatchObject({ text: '이탈리아 전투 파쇼', partyId: 'fasci', when: '1921년 11월 9일' })
    expect(box.rows.find((row) => row.key === 'successors')?.items[0]).toMatchObject({ partyId: 'pfr', when: '1943년' })
    expect(box.rows.find((row) => row.key === 'founders')?.items[0]).toMatchObject({ personId: 'mussolini' })
    expect(box.rows.find((row) => row.key === 'office-LEADER')?.items[0]).toMatchObject({ sub: '두체 (Il Duce)', when: '1921년 ~ 1943년' })
    const ideology = box.rows.find((row) => row.key === 'ideologies')
    expect(ideology?.inline).toBe(true)
    expect(ideology?.items.map((item) => item.text)).toEqual(['이탈리아 파시즘', '조합주의'])
  })
})
