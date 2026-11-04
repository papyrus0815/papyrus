import {
  eventCountryRoleHint,
  eventCountryRoleLabel,
  extractYearSuggestionFromTitle,
  findReplacementForMismatchedCountry,
  moveParticipant,
  participantKey,
  quickRoleDescriptionPresets,
  readRecentParticipants,
  recordRecentParticipants,
  resolveBatchCountryQuery,
  roleDescriptionPlaceholderForType,
  sortParticipantsByRolePriority,
  suggestCountriesForEra,
  suggestCountriesFromTitle,
  swapTwoParticipants,
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

  it('suggestCountriesFromTitle — 양자 약칭(청일·독소 등)과 국가명을 사건명·연도에 맞춰 추천하고 이미 추가된 나라는 제외한다', () => {
    const modern = [
      { id: 'jp-m', name: '일본', isoCode: 'JP', flagEmoji: '🇯🇵' },
      { id: 'de-m', name: '독일', isoCode: 'DE', flagEmoji: '🇩🇪' },
      { id: 'fr-m', name: '프랑스', isoCode: 'FR', flagEmoji: '🇫🇷' },
    ]
    const historical = [
      { id: 'qing-h', name: '청나라', startYear: 1636, endYear: 1912 },
      { id: 'jp-h', name: '일본 제국', startYear: 1868, endYear: 1947 },
      { id: 'ussr-h', name: '소련', startYear: 1922, endYear: 1991 },
    ]

    const sinoJapanese = suggestCountriesFromTitle(
      '청일 전쟁',
      modern,
      historical,
      { startYear: 1894, endYear: 1895 },
    )
    expect(sinoJapanese.map((item) => item.key)).toEqual(['h:qing-h', 'h:jp-h'])

    // 이미 청나라가 추가되어 있으면 일본 제국만 남는다
    const remaining = suggestCountriesFromTitle(
      '청일 전쟁',
      modern,
      historical,
      { startYear: 1894, endYear: 1895 },
      new Set(['h:qing-h']),
    )
    expect(remaining.map((item) => item.key)).toEqual(['h:jp-h'])

    // 직접 국가명이 등장하는 사건명
    const directMatch = suggestCountriesFromTitle(
      '프랑스 혁명',
      modern,
      historical,
    )
    expect(directMatch.map((item) => item.key)).toEqual(['m:fr-m'])
  })

  it('findReplacementForMismatchedCountry — 존속기간이 어긋난 역사 국가에 대해 사건 연도에 맞는 후속·동시대 국가를 찾는다', () => {
    const modern = [
      { id: 'cn-m', name: '중국', isoCode: 'CN', flagEmoji: '🇨🇳' },
    ]
    const historical = [
      { id: 'ming-h', name: '명나라', startYear: 1368, endYear: 1644 },
      { id: 'qing-h', name: '청나라', startYear: 1636, endYear: 1912 },
    ]

    const replacement = findReplacementForMismatchedCountry(
      historical[0],
      1840,
      modern,
      historical,
    )
    expect(replacement?.key).toBe('h:qing-h')
    expect(replacement?.name).toBe('청나라')
  })

  it('resolveBatchCountryQuery — 쉼표(,)·슬래시(/)·가운뎃점(·)으로 구분된 여러 나라 질의와 양자 약칭(청일·영프 등)을 한 번에 해석한다', () => {
    const modern = [
      { id: 'fr', name: '프랑스', isoCode: 'FR' },
      { id: 'gb', name: '영국', isoCode: 'GB' },
      { id: 'ru', name: '러시아', isoCode: 'RU' },
    ]
    const historical = [
      { id: 'qing', name: '청나라', startYear: 1636, endYear: 1912 },
      { id: 'jp-h', name: '일본 제국', startYear: 1868, endYear: 1947 },
    ]
    const matches = resolveBatchCountryQuery(
      '프랑스, 영국, 러시아',
      modern,
      [],
    )
    expect(matches.map((item) => item.key)).toEqual(['m:fr', 'm:gb', 'm:ru'])

    // 양자 약칭('영프', '청일')을 검색창에 바로 쳐도 2개국 묶음 후보로 풀어준다
    expect(
      resolveBatchCountryQuery('영프', modern, []).map((item) => item.key),
    ).toEqual(['m:gb', 'm:fr'])
    expect(
      resolveBatchCountryQuery('청일', modern, historical, {
        startYear: 1894,
        endYear: 1895,
      }).map((item) => item.key),
    ).toEqual(['h:qing', 'h:jp-h'])

    // 구분자·약칭이 아닌 단일 국가명이면 빈 배열을 돌려 단일 검색 흐름을 유지한다
    expect(resolveBatchCountryQuery('프랑스', modern, [])).toEqual([])
  })

  it('swapTwoParticipants — 2개국 양자 사건에서 순서와 역할을 한 번에 맞바꾼다', () => {
    const swappedRoles = swapTwoParticipants([
      { countryId: 'fr', role: 'INITIATOR', roleDescription: '선전포고' },
      { countryId: 'gb', role: 'TARGET', roleDescription: '방어' },
    ])
    expect(swappedRoles).toEqual([
      { countryId: 'gb', role: 'INITIATOR', roleDescription: '방어' },
      { countryId: 'fr', role: 'TARGET', roleDescription: '선전포고' },
    ])

    // 둘 다 기본값(PARTICIPANT)이면 맞바꾸면서 1순위를 INITIATOR, 2순위를 TARGET으로 지정한다
    const fromDefault = swapTwoParticipants([
      { countryId: 'fr', role: 'PARTICIPANT' },
      { countryId: 'gb', role: 'PARTICIPANT' },
    ])
    expect(fromDefault).toEqual([
      { countryId: 'gb', role: 'INITIATOR' },
      { countryId: 'fr', role: 'TARGET' },
    ])
  })

  it('suggestCountriesForEra · sortParticipantsByRolePriority · quickRoleDescriptionPresets — 시대 추천·역할 정렬·서술 프리셋을 제공한다', () => {
    const modern = [
      { id: 'fr', name: '프랑스', flagEmoji: '🇫🇷' },
      { id: 'kr', name: '대한민국', flagEmoji: '🇰🇷' },
    ]
    const historical = [
      { id: 'joseon', name: '조선', startYear: 1392, endYear: 1897 },
      { id: 'goryeo', name: '고려', startYear: 918, endYear: 1392 },
    ]

    const eraPicks = suggestCountriesForEra(
      modern,
      historical,
      { startYear: 1592, endYear: 1598 },
    )
    expect(eraPicks[0]?.key).toBe('h:joseon')

    const sorted = sortParticipantsByRolePriority([
      { countryId: 'fr', role: 'PARTICIPANT' as const },
      { historicalCountryId: 'joseon', role: 'TARGET' as const },
      { countryId: 'kr', role: 'INITIATOR' as const },
    ])
    expect(sorted.map(participantKey)).toEqual(['m:kr', 'h:joseon', 'm:fr'])

    expect(
      quickRoleDescriptionPresets('INITIATOR', '참전 방식·지휘·병력 등 (선택)'),
    ).toContain('선제 공격')
  })

  it('extractYearSuggestionFromTitle — 사건명에 적힌 연도·연월·전체 날짜·연도 구간·기원전 연도를 감지해 ISO 날짜와 정밀도를 추천한다', () => {
    expect(extractYearSuggestionFromTitle('1894년 청일 전쟁')).toEqual({
      startIso: '1894-01-01',
      endIso: '1894-01-01',
      label: '1894년',
    })
    expect(extractYearSuggestionFromTitle('1919년 3월 1일 3·1 운동')).toEqual({
      startIso: '1919-03-01',
      endIso: '1919-03-01',
      label: '1919년 3월 1일',
      precision: 'day',
    })
    expect(extractYearSuggestionFromTitle('1950. 6. 25. 한국 전쟁')).toEqual({
      startIso: '1950-06-25',
      endIso: '1950-06-25',
      label: '1950년 6월 25일',
      precision: 'day',
    })
    expect(extractYearSuggestionFromTitle('1830년 7월 혁명')).toEqual({
      startIso: '1830-07-01',
      endIso: '1830-07-01',
      label: '1830년 7월',
      precision: 'month',
    })
    expect(extractYearSuggestionFromTitle('임진왜란 (1592~1598)')).toEqual({
      startIso: '1592-01-01',
      endIso: '1598-01-01',
      label: '1592년 ~ 1598년',
    })
    expect(extractYearSuggestionFromTitle('기원전 202년 해하 전투')).toEqual({
      startIso: '-0202-01-01',
      endIso: '-0202-01-01',
      label: '기원전 202년',
    })
    expect(extractYearSuggestionFromTitle('연도 없는 사건')).toBeNull()
  })
})
