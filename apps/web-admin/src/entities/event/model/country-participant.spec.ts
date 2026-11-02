import {
  eventCountryRoleHint,
  eventCountryRoleLabel,
  moveParticipant,
  participantKey,
  readRecentParticipants,
  recordRecentParticipants,
  roleDescriptionPlaceholderForType,
  toParticipants,
} from './country-participant'

describe('country-participant 유틸', () => {
  it('moveParticipant — 위(up)/아래(down)로 순서를 바꾸고 경계 밖이면 원본을 유지한다', () => {
    const list = [
      { countryId: 'kr', role: 'INITIATOR' as const },
      { countryId: 'us', role: 'PARTICIPANT' as const },
      { historicalCountryId: 'qing', role: 'TARGET' as const },
    ]

    expect(moveParticipant(list, 0, 'up')).toEqual(list)
    expect(moveParticipant(list, 2, 'down')).toEqual(list)

    const movedDown = moveParticipant(list, 0, 'down')
    expect(movedDown.map(participantKey)).toEqual(['m:us', 'm:kr', 'h:qing'])

    const movedUp = moveParticipant(list, 2, 'up')
    expect(movedUp.map(participantKey)).toEqual(['m:kr', 'h:qing', 'm:us'])
  })

  it('recordRecentParticipants / readRecentParticipants — 중복 없이 최근 최대 5곳을 유지한다', () => {
    window.localStorage.clear()
    expect(readRecentParticipants()).toEqual([])

    recordRecentParticipants([
      { countryId: 'fr' },
      { historicalCountryId: 'prussia' },
    ])
    expect(readRecentParticipants()).toEqual([
      { countryId: 'fr' },
      { historicalCountryId: 'prussia' },
    ])

    // 중복은 앞으로 당기고 최대 5개로 자른다
    recordRecentParticipants([
      { historicalCountryId: 'prussia' },
      { countryId: 'gb' },
      { countryId: 'ru' },
      { historicalCountryId: 'austria' },
      { historicalCountryId: 'qing' },
    ])
    const recent = readRecentParticipants()
    expect(recent).toHaveLength(5)
    expect(recent[0]).toEqual({ historicalCountryId: 'prussia' })
    expect(recent.map(participantKey)).toEqual([
      'h:prussia',
      'm:gb',
      'm:ru',
      'h:austria',
      'h:qing',
    ])
  })

  it('roleDescriptionPlaceholderForType · eventCountryRoleHint — 세부 분야와 역할에 맞는 안내를 돌려준다', () => {
    expect(roleDescriptionPlaceholderForType('TREATY')).toContain('조약')
    expect(roleDescriptionPlaceholderForType('BATTLE')).toContain('참전')
    expect(roleDescriptionPlaceholderForType('STATEHOOD')).toContain('독립')
    expect(roleDescriptionPlaceholderForType(null)).toBe(
      '이 나라가 한 일 (선택)',
    )

    expect(eventCountryRoleLabel('INITIATOR')).toBe('주도국')
    expect(eventCountryRoleHint('INITIATOR')).toBe(
      '사건을 일으키거나 이끈 쪽',
    )
    expect(eventCountryRoleHint(null)).toBeNull()
  })

  it('toParticipants — 현대·역사 국가를 sortOrder 순으로 한 배열에 합친다', () => {
    const merged = toParticipants(
      [{ id: 'fr', role: 'PARTICIPANT', sortOrder: 1 }],
      [{ id: 'prussia', role: 'INITIATOR', sortOrder: 0 }],
    )
    expect(merged.map(participantKey)).toEqual(['h:prussia', 'm:fr'])
  })
})
