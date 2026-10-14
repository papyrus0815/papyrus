import { draftSidesFromRoles } from './side-draft.lib'

describe('draftSidesFromRoles', () => {
  it('주도·동맹 vs 대상·적대·피해로 가르고, 이름은 각 편의 주도국·대상국', () => {
    const draft = draftSidesFromRoles(
      [
        { id: 'us', name: '미국', role: 'ALLY' },
        { id: 'qa', name: '카타르', role: 'MEDIATOR' },
      ],
      [
        { id: 'il', name: '이스라엘', role: 'INITIATOR' },
        { id: 'ir', name: '이란', role: 'TARGET' },
        { id: 'lb', name: '레바논', role: 'VICTIM' },
      ],
    )
    expect(draft).not.toBeNull()
    expect(draft!.sides[0].name).toBe('이스라엘 측')
    expect(draft!.sides[0].memberNames).toEqual(['미국', '이스라엘'])
    expect(draft!.sides[0].memberKeys).toEqual(['m:us', 'h:il'])
    expect(draft!.sides[1].name).toBe('이란 측')
    expect(draft!.sides[1].memberNames).toEqual(['이란', '레바논'])
    expect(draft!.unassigned).toEqual(['카타르'])
  })

  it('한쪽만 있으면 초안을 내지 않는다', () => {
    expect(
      draftSidesFromRoles([
        { id: 'a', name: 'A', role: 'INITIATOR' },
        { id: 'b', name: 'B', role: 'PARTICIPANT' },
      ]),
    ).toBeNull()
    expect(draftSidesFromRoles([], [])).toBeNull()
  })

  it('이미 진영에 든 나라는 초안에서 뺀다', () => {
    const draft = draftSidesFromRoles([
      { id: 'a', name: 'A', role: 'INITIATOR' },
      { id: 'b', name: 'B', role: 'TARGET', sideId: 'existing' },
      { id: 'c', name: 'C', role: 'ADVERSARY' },
    ])
    expect(draft!.sides[1].memberNames).toEqual(['C'])
    expect(draft!.sides[1].name).toBe('C 측')
  })
})
