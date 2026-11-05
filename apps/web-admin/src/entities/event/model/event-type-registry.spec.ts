import {
  DOMAIN_SUBTYPES,
  EVENT_TYPE_GROUPS,
  EVENT_TYPE_ORDER,
  EVENT_TYPES,
  FREQUENT_EVENT_TYPES,
  defaultDomainForType,
  eventTypeDef,
  eventTypeFeatures,
  facetWeight,
  formatDomainPath,
  groupSubtypes,
  isArmedConflictType,
  metricsFor,
  readRecentClassifications,
  recordRecentClassification,
  searchClassifications,
  subtypesForDomain,
  suggestClassificationFromTitle,
  typeFacets,
} from './event-type-registry'

describe('세부 분야 레지스트리', () => {
  it('서버 enum 29종과 같은 수, 정의의 key가 표와 맞고 핵심·선택 기록은 겹치지 않는다', () => {
    expect(EVENT_TYPE_ORDER).toHaveLength(29)
    for (const [key, def] of Object.entries(EVENT_TYPES)) {
      expect(def.key).toBe(key)
      expect(def.core.filter((facet) => def.optional.includes(facet))).toEqual([])
    }
  })

  it('세부 이름에 분야를 넣지 않는다 — 분야와 겹쳐 보이던 옛 이름(외교 조치·군사 조치·정치 사건)의 재발 방지', () => {
    const domains = ['정치', '외교', '군사', '경제', '사회', '문화', '종교', '과학기술']
    for (const def of Object.values(EVENT_TYPES)) {
      for (const domain of domains) expect(def.label).not.toContain(domain)
    }
  })

  it('두 글자 이름은 세부마다 다르고 정확히 두 글자다 — 목록 분류 칸 폭의 계약', () => {
    const shorts = Object.values(EVENT_TYPES).map((def) => def.short)
    expect(new Set(shorts).size).toBe(shorts.length)
    for (const short of shorts) expect([...short]).toHaveLength(2)
  })

  it('분야 앞줄의 세부는 실제 세부이고 중복이 없다', () => {
    for (const types of Object.values(DOMAIN_SUBTYPES)) {
      expect(new Set(types).size).toBe(types.length)
      for (const type of types) expect(EVENT_TYPES[type]).toBeDefined()
    }
  })

  it('저장은 독립 축 — 앞줄에 없는 세부도 그 분야의 "더 보기"에 있다', () => {
    const { primary, rest } = subtypesForDomain('ECONOMY')
    expect(primary).toContain('COMPANY')
    expect(rest).toContain('BATTLE')
    expect([...primary, ...rest].sort()).toEqual([...EVENT_TYPE_ORDER].sort())
    // 앞줄이 없는 분야(기타)·미선택은 전부 앞줄
    expect(subtypesForDomain('OTHER').rest).toEqual([])
    expect(subtypesForDomain(null).primary).toEqual(EVENT_TYPE_ORDER)
  })

  it('세부는 선택 — 모르는 값·미지정·옛 값은 세부 없음(null)', () => {
    expect(eventTypeDef(undefined)).toBeNull()
    expect(eventTypeDef('DIPLOMATIC_ACT')).toBeNull()
    expect(eventTypeDef('전쟁/군사')).toBeNull()
  })

  it("한 줄 표기 '분야 › 세부'", () => {
    expect(formatDomainPath('MILITARY', 'LAW_POLICY')).toBe('군사 › 법령·정책·개혁')
    expect(formatDomainPath('MILITARY', null)).toBe('군사')
    expect(formatDomainPath(null, null)).toBe('기타')
  })

  it('의미군 묶음(EVENT_TYPE_GROUPS)은 29종을 빠짐없이 레지스트리 순서대로 분할한다', () => {
    const flattened = EVENT_TYPE_GROUPS.flatMap((group) => group.types)
    expect(flattened).toEqual(EVENT_TYPE_ORDER)
    expect(groupSubtypes(['BATTLE', 'TREATY'])).toEqual([
      { label: '충돌', types: ['BATTLE'] },
      { label: '국가 간', types: ['TREATY'] },
    ])
  })

  it('세부의 기본 분야(defaultDomain)는 그 세부를 앞줄(primary)에 가진 분야다', () => {
    for (const def of Object.values(EVENT_TYPES)) {
      const domain = defaultDomainForType(def.key)
      expect(domain).toBe(def.defaultDomain)
      expect(DOMAIN_SUBTYPES[def.defaultDomain]).toContain(def.key)
    }
    expect(defaultDomainForType(null)).toBeNull()
    for (const type of FREQUENT_EVENT_TYPES) {
      expect(EVENT_TYPES[type]).toBeDefined()
    }
  })
})

describe('기록 — 세부가 정하고 분야가 얹는다', () => {
  it('같은 군사 분야라도 전투엔 교전 양측, 함대법(법령)엔 묻지 않는다', () => {
    expect(facetWeight('BATTLE', 'sides', 'MILITARY')).toBe('core')
    expect(facetWeight('LAW_POLICY', 'sides', 'MILITARY')).toBeNull()
    expect(facetWeight('TREATY', 'treaty', 'ECONOMY')).toBe('core')
    expect(facetWeight('STATEHOOD', 'statehood')).toBe('core')
    expect(facetWeight('POWER_CHANGE', 'power', 'MILITARY')).toBe('core')
    expect(facetWeight('INSTITUTION', 'organizations')).toBe('core')
  })

  it('분야는 선택 기록을 얹는다 — 군사 분야의 법령엔 작전 정보·수치, 경제엔 기업·수치', () => {
    expect(typeFacets('LAW_POLICY', 'MILITARY').optional).toEqual(expect.arrayContaining(['military', 'metrics']))
    expect(typeFacets('CONSTRUCTION', 'ECONOMY').optional).toEqual(expect.arrayContaining(['organizations', 'metrics']))
    // 핵심에 있는 기록은 선택으로 다시 얹지 않는다
    expect(typeFacets('COMPANY', 'ECONOMY').optional).not.toContain('organizations')
  })

  it('세부가 없으면 참여국이 핵심, 인물은 선택', () => {
    expect(typeFacets(null, 'CULTURE')).toEqual({ core: ['participants'], optional: ['persons'] })
  })

  it('교전선 판정은 세부로 — 군사 분야의 법령·인사·동원은 무력 충돌이 아니다', () => {
    expect(isArmedConflictType('WAR')).toBe(true)
    expect(isArmedConflictType('BATTLE')).toBe(true)
    expect(isArmedConflictType('UPRISING')).toBe(true)
    expect(isArmedConflictType('MOBILIZATION')).toBe(false)
    expect(isArmedConflictType('LAW_POLICY')).toBe(false)
    expect(isArmedConflictType(null)).toBe(false)
  })
})

describe('수치 성격 — 세부가 정하면 세부, 아니면 분야', () => {
  it('교전·조약·재해는 세부가 정한다(분야와 무관)', () => {
    expect(metricsFor('BATTLE', 'POLITICS').subject).toBe('side')
    expect(metricsFor('TREATY', 'ECONOMY').presets).toContain('economy.indemnity')
    expect(metricsFor('DISASTER', null).presets).toContain('human.deaths_total')
  })

  it('법령·건설은 분야를 따른다 — 함대법은 병력·예산, 경제 법령은 경제 지표', () => {
    expect(metricsFor('LAW_POLICY', 'MILITARY').presets).toContain('military.personnel')
    expect(metricsFor('LAW_POLICY', 'ECONOMY').presets).toContain('economy.index_close')
    expect(metricsFor('CREATION', 'CULTURE').presets).toEqual([])
  })
})

describe('eventTypeFeatures — 상세 지면이 읽는 기능', () => {
  it('전쟁: 진영 → 수치 → 작전 정보, 수치는 진영별', () => {
    const features = eventTypeFeatures('WAR', 'MILITARY')
    expect(features.suggestedModules).toEqual(['sides', 'metrics', 'military-details'])
    expect(features.metricSubject).toBe('side')
    expect(features.promoteTreaties).toBe(false)
  })

  it('조약: 조약 섹션을 올리고 배상금 지표를 권한다', () => {
    const features = eventTypeFeatures('TREATY', 'DIPLOMACY')
    expect(features.promoteTreaties).toBe(true)
    expect(features.metricPresets).toContain('economy.indemnity')
  })

  it('건국·멸망 / 즉위·취임 / 기관 설립은 각자의 빈 섹션을 세운다', () => {
    expect(eventTypeFeatures('STATEHOOD').expectStatehood).toBe(true)
    expect(eventTypeFeatures('POWER_CHANGE').expectPower).toBe(true)
    expect(eventTypeFeatures('ELECTION').expectPower).toBe(true)
    expect(eventTypeFeatures('INSTITUTION').expectOrganizations).toBe(true)
    expect(eventTypeFeatures('BATTLE').expectStatehood).toBe(false)
  })
})

describe('suggestClassificationFromTitle — 사건명 기반 분야·세부 추론', () => {
  it('끝말·핵심어로 분야와 세부를 추론한다', () => {
    expect(suggestClassificationFromTitle('스당 전투')).toEqual({
      domain: 'MILITARY',
      type: 'BATTLE',
    })
    expect(suggestClassificationFromTitle('제2차 빈 포위전 (1683)')).toEqual({
      domain: 'MILITARY',
      type: 'BATTLE',
    })
    expect(suggestClassificationFromTitle('제1차 세계 대전')).toEqual({
      domain: 'MILITARY',
      type: 'WAR',
    })
    expect(suggestClassificationFromTitle('난징 조약 체결')).toEqual({
      domain: 'DIPLOMACY',
      type: 'TREATY',
    })
    expect(suggestClassificationFromTitle('베를린 회의')).toEqual({
      domain: 'DIPLOMACY',
      type: 'SUMMIT',
    })
    expect(suggestClassificationFromTitle('니케아 공의회')).toEqual({
      domain: 'RELIGION',
      type: 'SUMMIT',
    })
    expect(suggestClassificationFromTitle('우창봉기')).toEqual({
      domain: 'POLITICS',
      type: 'UPRISING',
    })
    expect(suggestClassificationFromTitle('안녹산의 난')).toEqual({
      domain: 'POLITICS',
      type: 'UPRISING',
    })
    expect(suggestClassificationFromTitle('청나라 건국')).toEqual({
      domain: 'POLITICS',
      type: 'STATEHOOD',
    })
    expect(suggestClassificationFromTitle('독일 제2함대법 공포')).toEqual({
      domain: 'MILITARY',
      type: 'LAW_POLICY',
    })
    expect(suggestClassificationFromTitle('바이마르 헌법 제정')).toEqual({
      domain: 'POLITICS',
      type: 'LAW_POLICY',
    })
    expect(suggestClassificationFromTitle('관동 대지진')).toEqual({
      domain: 'SOCIETY',
      type: 'DISASTER',
    })
  })

  it('단서가 없거나 빈 문자열이면 null을 돌려준다', () => {
    expect(suggestClassificationFromTitle('')).toBeNull()
    expect(suggestClassificationFromTitle('알 수 없는 일')).toBeNull()
  })
})

describe('subtypesForDomain hasParent 정렬 · searchClassifications · 최근 분류 기록', () => {
  it('상위 사건이 있을 때(hasParent: true) 단일 하위 사건용 세부를 묶음(전쟁·위기)보다 앞에 둔다', () => {
    const normal = subtypesForDomain('MILITARY')
    expect(normal.primary[0]).toBe('WAR')

    const withParent = subtypesForDomain('MILITARY', { hasParent: true })
    expect(withParent.primary[0]).toBe('BATTLE')
    expect(withParent.primary[withParent.primary.length - 1]).toBe('WAR')
  })

  it('searchClassifications — 세부 이름·예시·동의어로 29종 전체에서 검색하고 현재 분야를 우선한다', () => {
    const landing = searchClassifications('상륙작전', null)
    expect(landing[0]).toMatchObject({ type: 'BATTLE', domain: 'MILITARY' })

    const impeach = searchClassifications('탄핵', null)
    expect(impeach[0]).toMatchObject({ type: 'POWER_CHANGE', domain: 'POLITICS' })

    // 법령은 여러 분야의 앞줄에 있으므로 현재 고른 분야(MILITARY)를 유지해 돌려준다
    const lawInMilitary = searchClassifications('함대법', 'MILITARY')
    expect(lawInMilitary[0]).toMatchObject({ type: 'LAW_POLICY', domain: 'MILITARY' })

    expect(searchClassifications('   ', null)).toEqual([])
  })

  it('recordRecentClassification / readRecentClassifications — 중복을 제거하고 최근 순 최대 4개를 유지한다', () => {
    window.localStorage.clear()
    expect(readRecentClassifications()).toEqual([])

    recordRecentClassification({ domain: 'MILITARY', type: 'BATTLE' })
    recordRecentClassification({ domain: 'DIPLOMACY', type: 'TREATY' })
    recordRecentClassification({ domain: 'MILITARY', type: 'BATTLE' }) // 중복 → 맨 앞으로
    expect(readRecentClassifications()).toEqual([
      { domain: 'MILITARY', type: 'BATTLE' },
      { domain: 'DIPLOMACY', type: 'TREATY' },
    ])

    recordRecentClassification({ domain: 'POLITICS', type: 'LAW_POLICY' })
    recordRecentClassification({ domain: 'ECONOMY', type: 'CRISIS' })
    recordRecentClassification({ domain: 'SCIENCE', type: 'DISCOVERY' })
    expect(readRecentClassifications()).toHaveLength(4)
    expect(readRecentClassifications()[0]).toEqual({ domain: 'SCIENCE', type: 'DISCOVERY' })
  })
})


