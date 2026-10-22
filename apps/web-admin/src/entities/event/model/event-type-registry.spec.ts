import {
  DOMAIN_SUBTYPES,
  EVENT_TYPE_ORDER,
  EVENT_TYPES,
  eventTypeDef,
  eventTypeFeatures,
  facetWeight,
  formatDomainPath,
  isArmedConflictType,
  metricsFor,
  subtypesForDomain,
  typeFacets,
} from './event-type-registry'

describe('세부 분야 레지스트리', () => {
  it('서버 enum 28종과 같은 수, 정의의 key가 표와 맞고 핵심·선택 기록은 겹치지 않는다', () => {
    expect(EVENT_TYPE_ORDER).toHaveLength(28)
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

  it('분야 앞줄의 세부는 실제 세부이고 중복이 없다', () => {
    for (const types of Object.values(DOMAIN_SUBTYPES)) {
      expect(new Set(types).size).toBe(types.length)
      for (const type of types) expect(EVENT_TYPES[type]).toBeDefined()
    }
  })

  it('저장은 독립 축 — 앞줄에 없는 세부도 그 분야의 "더 보기"에 있다', () => {
    const { primary, rest } = subtypesForDomain('경제')
    expect(primary).toContain('COMPANY')
    expect(rest).toContain('BATTLE')
    expect([...primary, ...rest].sort()).toEqual([...EVENT_TYPE_ORDER].sort())
    // 앞줄이 없는 분야(기타)·미선택은 전부 앞줄
    expect(subtypesForDomain('기타').rest).toEqual([])
    expect(subtypesForDomain(null).primary).toEqual(EVENT_TYPE_ORDER)
  })

  it('세부는 선택 — 모르는 값·미지정·옛 값은 세부 없음(null)', () => {
    expect(eventTypeDef(undefined)).toBeNull()
    expect(eventTypeDef('DIPLOMATIC_ACT')).toBeNull()
    expect(eventTypeDef('전쟁/군사')).toBeNull()
  })

  it("한 줄 표기 '분야 › 세부'", () => {
    expect(formatDomainPath('군사', 'LAW_POLICY')).toBe('군사 › 법령·정책·개혁')
    expect(formatDomainPath('군사', null)).toBe('군사')
    expect(formatDomainPath(null, null)).toBe('미분류')
  })
})

describe('기록 — 세부가 정하고 분야가 얹는다', () => {
  it('같은 군사 분야라도 전투엔 교전 양측, 함대법(법령)엔 묻지 않는다', () => {
    expect(facetWeight('BATTLE', 'sides', '군사')).toBe('core')
    expect(facetWeight('LAW_POLICY', 'sides', '군사')).toBeNull()
    expect(facetWeight('TREATY', 'treaty', '경제')).toBe('core')
    expect(facetWeight('STATEHOOD', 'statehood')).toBe('core')
    expect(facetWeight('POWER_CHANGE', 'power', '군사')).toBe('core')
    expect(facetWeight('INSTITUTION', 'organizations')).toBe('core')
  })

  it('분야는 선택 기록을 얹는다 — 군사 분야의 법령엔 작전 정보·수치, 경제엔 기업·수치', () => {
    expect(typeFacets('LAW_POLICY', '군사').optional).toEqual(expect.arrayContaining(['military', 'metrics']))
    expect(typeFacets('CONSTRUCTION', '경제').optional).toEqual(expect.arrayContaining(['organizations', 'metrics']))
    // 핵심에 있는 기록은 선택으로 다시 얹지 않는다
    expect(typeFacets('COMPANY', '경제').optional).not.toContain('organizations')
  })

  it('세부가 없으면 참여국이 핵심, 인물은 선택', () => {
    expect(typeFacets(null, '문화')).toEqual({ core: ['participants'], optional: ['persons'] })
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
    expect(metricsFor('BATTLE', '정치').subject).toBe('side')
    expect(metricsFor('TREATY', '경제').presets).toContain('economy.indemnity')
    expect(metricsFor('DISASTER', null).presets).toContain('human.deaths_total')
  })

  it('법령·건설은 분야를 따른다 — 함대법은 병력·예산, 경제 법령은 경제 지표', () => {
    expect(metricsFor('LAW_POLICY', '군사').presets).toContain('military.personnel')
    expect(metricsFor('LAW_POLICY', '경제').presets).toContain('economy.index_close')
    expect(metricsFor('CREATION', '문화').presets).toEqual([])
  })
})

describe('eventTypeFeatures — 상세 지면이 읽는 기능', () => {
  it('전쟁: 진영 → 수치 → 작전 정보, 수치는 진영별', () => {
    const features = eventTypeFeatures('WAR', '군사')
    expect(features.suggestedModules).toEqual(['sides', 'metrics', 'military-details'])
    expect(features.metricSubject).toBe('side')
    expect(features.promoteTreaties).toBe(false)
  })

  it('조약: 조약 섹션을 올리고 배상금 지표를 권한다', () => {
    const features = eventTypeFeatures('TREATY', '외교')
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
