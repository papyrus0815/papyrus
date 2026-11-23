import { PoliticalPartyLinkKind } from '@prisma/client'

import { linkPerspective, orientLink } from './party-link.util'

describe('정당 관계 방향', () => {
  it('대칭 종류는 누가 걸어도 같은 행(작은 id → 큰 id)', () => {
    const fromA = orientLink(PoliticalPartyLinkKind.SISTER_PARTY, 'b-csu', 'a-cdu', 'subordinate')
    const fromB = orientLink(PoliticalPartyLinkKind.SISTER_PARTY, 'a-cdu', 'b-csu', 'superior')
    expect(fromA).toEqual({ fromPartyId: 'a-cdu', toPartyId: 'b-csu' })
    expect(fromB).toEqual(fromA)
    expect(linkPerspective({ ...fromA, kind: PoliticalPartyLinkKind.SISTER_PARTY }, 'b-csu')).toEqual({
      otherPartyId: 'a-cdu',
      role: 'peer',
    })
  })

  it('위성: from이 딸린 쪽 — 양쪽 화면에서 자리가 뒤집혀 읽힌다', () => {
    const row = { ...orientLink(PoliticalPartyLinkKind.SATELLITE_OF, 'host', 'satellite', 'superior'), kind: PoliticalPartyLinkKind.SATELLITE_OF }
    expect(row.fromPartyId).toBe('satellite')
    expect(linkPerspective(row, 'satellite')).toEqual({ otherPartyId: 'host', role: 'subordinate' })
    expect(linkPerspective(row, 'host')).toEqual({ otherPartyId: 'satellite', role: 'superior' })
  })
})
