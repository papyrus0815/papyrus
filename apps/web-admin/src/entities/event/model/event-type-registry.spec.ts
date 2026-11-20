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
  it('서버 enum 34종과 같은 수, 정의의 key가 표와 맞고 핵심·선택 기록은 겹치지 않는다', () => {
    expect(EVENT_TYPE_ORDER).toHaveLength(34)
    for (const [key, def] of Object.entries(EVENT_TYPES)) {
      expect(def.key).toBe(key)
      expect(def.core.filter((facet) => def.optional.includes(facet))).toEqual([])
    }
  })

  it('세부 이름에 분야를 넣지 않는다 — 분야와 겹쳐 보이던 옛 이름(외교 조치·군사 조치·정치 사건)의 재발 방지', () => {
    const domains = ['정치', '외교', '군사', '경제', '사회', '문화', '종교', '과학기술']
    for (const def of Object.values(EVENT_TYPES)) {
      // '준군사조직'의 '군사'는 분야 이름이 아니라 낱말의 일부(정규군 밖의 무장 조직)라 빼고 본다
      for (const domain of domains) expect(def.label.replace(/준군사/g, '')).not.toContain(domain)
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

  it('의미군 묶음(EVENT_TYPE_GROUPS)은 34종을 빠짐없이 레지스트리 순서대로 분할한다', () => {
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
    expect(facetWeight('WAR_DECLARATION', 'warDeclaration')).toBe('core')
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
  it('교전·봉기·조약·재해는 세부가 정한다(분야와 무관)', () => {
    expect(metricsFor('BATTLE', 'POLITICS').subject).toBe('side')
    expect(metricsFor('UPRISING', 'POLITICS').subject).toBe('side')
    expect(metricsFor('UPRISING', 'POLITICS').presets).toEqual(
      expect.arrayContaining(['society.participants', 'human.deaths_total', 'human.executed', 'society.arrested']),
    )
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

  it('건국·멸망 / 선전포고 / 즉위·취임 / 기관 설립은 각자의 빈 섹션을 세운다', () => {
    expect(eventTypeFeatures('WAR_DECLARATION').expectWarDeclaration).toBe(true)
    expect(eventTypeFeatures('STATEHOOD').expectStatehood).toBe(true)
    expect(eventTypeFeatures('POWER_CHANGE').expectPower).toBe(true)
    expect(eventTypeFeatures('ELECTION').expectPower).toBe(true)
    expect(eventTypeFeatures('INSTITUTION').expectOrganizations).toBe(true)
    expect(eventTypeFeatures('SUMMIT').expectOrganizations).toBe(true)
    expect(DOMAIN_SUBTYPES.ECONOMY).toContain('SUMMIT')
    expect(eventTypeFeatures('BATTLE').expectStatehood).toBe(false)
    expect(eventTypeFeatures('DECLARATION').expectWarDeclaration).toBe(false)
  })

  it('관련 정당 칸 — 정당·집회·선전 또는 내분·권력투쟁(핵심 유형)일 때만 비어 있어도 세우고 일반 정치 법령은 접는다', () => {
    expect(eventTypeFeatures('PARTY_RALLY', 'SOCIETY').expectPoliticalParties).toBe(true)
    expect(eventTypeFeatures('LAW_POLICY', 'POLITICS').expectPoliticalParties).toBe(false)
    expect(eventTypeFeatures('DISASTER', 'SOCIETY').expectPoliticalParties).toBe(false)
    // 군부 파벌 다툼·교단 분열처럼 분야가 정치가 아니어도 내분이면 당이 무대일 수 있다
    expect(eventTypeFeatures('POWER_STRUGGLE', 'MILITARY').expectPoliticalParties).toBe(true)
    // 건국·멸망에서 영토·권력은 선택(optional)이라 비어 있으면 기본 펼치지 않는다
    expect(eventTypeFeatures('STATEHOOD').expectTerritory).toBe(false)
    expect(eventTypeFeatures('STATEHOOD').expectPower).toBe(false)
    expect(eventTypeFeatures('TERRITORY').expectTerritory).toBe(true)
  })

  it('내분·권력투쟁 — 파벌이 주인공이라 진영·인물이 핵심, 다툼 끝에 바뀐 자리는 취임·즉위 칸을 세운다', () => {
    expect(facetWeight('POWER_STRUGGLE', 'sides')).toBe('core')
    expect(facetWeight('POWER_STRUGGLE', 'persons')).toBe('core')
    expect(facetWeight('POWER_STRUGGLE', 'power')).toBe('optional')
    expect(eventTypeFeatures('POWER_STRUGGLE').expectPower).toBe(true)
    expect(eventTypeFeatures('POWER_STRUGGLE').suggestedModules).toContain('sides')
    expect(metricsFor('POWER_STRUGGLE').presets).toContain('human.executed')
    // 교전선(수장 지도)에 그리지 않는다 — 체제 안의 다툼이지 무력 충돌이 아니다
    expect(isArmedConflictType('POWER_STRUGGLE')).toBe(false)
    expect(DOMAIN_SUBTYPES.POLITICS).toContain('POWER_STRUGGLE')
    expect(defaultDomainForType('POWER_STRUGGLE')).toBe('POLITICS')
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
    expect(suggestClassificationFromTitle('제43차 아세안 정상회의')).toEqual({
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
    expect(suggestClassificationFromTitle('오스트리아-헝가리의 대세르비아 선전포고 (1914)')).toEqual({
      domain: 'DIPLOMACY',
      type: 'WAR_DECLARATION',
    })
  })

  it('정당·집회·선전 — 창당·강령·당대회·집회는 여기로, 선전포고·회의는 제자리', () => {
    const party = { domain: 'POLITICS', type: 'PARTY_RALLY' }
    expect(suggestClassificationFromTitle('독일 노동자당(DAP) 창당')).toEqual(party)
    expect(suggestClassificationFromTitle('국가사회주의 독일 노동당(나치당) 25개조 강령 발표')).toEqual(party)
    expect(suggestClassificationFromTitle('뉘른베르크 전당대회')).toEqual(party)
    expect(suggestClassificationFromTitle('중국공산당 제20차 당대회')).toEqual(party)
    expect(suggestClassificationFromTitle('뮌헨 호프브로이하우스 군중집회')).toEqual(party)
    expect(suggestClassificationFromTitle('반공 선전 활동')).toEqual(party)
    // '선전'이 들어가도 선전포고는 선전포고, '회의'는 회담
    expect(suggestClassificationFromTitle('이탈리아 왕국의 대소련 선전 포고')).toMatchObject({ type: 'WAR_DECLARATION' })
    expect(suggestClassificationFromTitle('베를린 회의')).toMatchObject({ type: 'SUMMIT' })
  })

  it('내분·권력투쟁 — 분당·숙청·사화·환국·계승 분쟁은 여기로, 무력 정변·한 사람의 실각은 제자리', () => {
    const struggle = { domain: 'POLITICS', type: 'POWER_STRUGGLE' }
    expect(suggestClassificationFromTitle('러시아 사회민주노동당 분당')).toEqual(struggle)
    expect(suggestClassificationFromTitle('자코뱅 클럽 분열')).toEqual(struggle)
    expect(suggestClassificationFromTitle('당통파 숙청')).toEqual(struggle)
    expect(suggestClassificationFromTitle('무오사화')).toEqual(struggle)
    expect(suggestClassificationFromTitle('경신환국 (1680)')).toEqual(struggle)
    expect(suggestClassificationFromTitle('스페인 왕위 계승 분쟁')).toEqual(struggle)
    expect(suggestClassificationFromTitle('소련 공산당 지도부 권력 투쟁')).toEqual(struggle)
    expect(suggestClassificationFromTitle('지롱드파 축출 정변')).toMatchObject({ type: 'UPRISING' })
    expect(suggestClassificationFromTitle('비스마르크 실각')).toMatchObject({ type: 'POWER_CHANGE' })
    expect(suggestClassificationFromTitle('국민당 창당')).toMatchObject({ type: 'PARTY_RALLY' })
  })

  it('군 창설·편제·준군사조직 — 부대·사령부 창설·편성·군제 개편·무장 조직 결성은 여기로, 군을 늘리는 법·일반 결성은 제자리', () => {
    const formation = { domain: 'MILITARY', type: 'MILITARY_FORMATION' }
    expect(suggestClassificationFromTitle('참모본부 공식 창설')).toEqual(formation)
    expect(suggestClassificationFromTitle('오스트리아-헝가리 제국군 제 15군단 창설')).toEqual(formation)
    expect(suggestClassificationFromTitle('소련 총사령부(스타브카·Stavka) 창설')).toEqual(formation)
    expect(suggestClassificationFromTitle('독일 국가방위군(10만 간부군) 공식 창설')).toEqual(formation)
    expect(suggestClassificationFromTitle('메이지 정부 어친병 편성')).toEqual(formation)
    expect(suggestClassificationFromTitle('나치당 돌격대(SA) 결성')).toEqual(formation)
    expect(suggestClassificationFromTitle('메이지 정부 군제 개편')).toEqual(formation)
    expect(suggestClassificationFromTitle('대한제국 군대 해산')).toEqual(formation)
    expect(suggestClassificationFromTitle('대한제국 군대 해체')).toEqual(formation)
    // 군을 늘리는 법은 법령, 일반 단체 결성은 설립, 행정구역(郡) 신설은 군 창설이 아니다
    expect(suggestClassificationFromTitle('1913년 독일 육군법')).toMatchObject({ type: 'LAW_POLICY', domain: 'MILITARY' })
    expect(suggestClassificationFromTitle('시민 연대 결성')).toMatchObject({ type: 'INSTITUTION' })
    expect(suggestClassificationFromTitle('옹진군 신설')).toBeNull()
    expect(suggestClassificationFromTitle('일본군 점령')).toMatchObject({ type: 'BATTLE' })
  })

  it('폭력·테러·시위·집회 — 시위·항의 집회·소요·테러는 여기로, 당 집회·쿠데타식 폭동·암살·파업은 제자리', () => {
    const street = { domain: 'SOCIETY', type: 'PROTEST_VIOLENCE' }
    expect(suggestClassificationFromTitle('마흐사 아미니 시위 (2022년 이란 히잡 시위)')).toEqual(street)
    expect(suggestClassificationFromTitle('제1차 튈리르 궁전 습격 시위')).toEqual(street)
    expect(suggestClassificationFromTitle('광화문 촛불 집회')).toEqual(street)
    expect(suggestClassificationFromTitle('베를린 가두 충돌')).toEqual(street)
    expect(suggestClassificationFromTitle('9·11 테러')).toEqual(street)
    expect(suggestClassificationFromTitle('도쿄 지하철 사린 테러 사건')).toEqual(street)
    expect(suggestClassificationFromTitle('노르드스트림 가스관 사보타주')).toEqual(street)
    // 정당이 연 집회(주최 모르는 맨 '집회'·군중집회)는 정당, '○○ 폭동'이라 부르는 쿠데타는 봉기
    expect(suggestClassificationFromTitle('나치당 치르쿠스 크로네 대중 집회')).toMatchObject({ type: 'PARTY_RALLY' })
    expect(suggestClassificationFromTitle('뮌헨 맥주홀 폭동')).toMatchObject({ type: 'UPRISING' })
    // 특정인을 노린 살해는 암살, 파업은 운동
    expect(suggestClassificationFromTitle('사라예보 암살 사건')).toMatchObject({ type: 'ATTACK' })
    expect(suggestClassificationFromTitle('황태자 암살 테러')).toMatchObject({ type: 'ATTACK' })
    expect(suggestClassificationFromTitle('루르 탄광 총파업')).toMatchObject({ type: 'MOVEMENT' })
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

  it('searchClassifications — 세부 이름·예시·동의어로 34종 전체에서 검색하고 현재 분야를 우선한다', () => {
    const landing = searchClassifications('상륙작전', null)
    expect(landing[0]).toMatchObject({ type: 'BATTLE', domain: 'MILITARY' })

    const impeach = searchClassifications('탄핵', null)
    expect(impeach[0]).toMatchObject({ type: 'POWER_CHANGE', domain: 'POLITICS' })

    // 법령은 여러 분야의 앞줄에 있으므로 현재 고른 분야(MILITARY)를 유지해 돌려준다
    const lawInMilitary = searchClassifications('함대법', 'MILITARY')
    expect(lawInMilitary[0]).toMatchObject({ type: 'LAW_POLICY', domain: 'MILITARY' })

    expect(searchClassifications('   ', null)).toEqual([])

    expect(searchClassifications('전당대회', null)[0]).toMatchObject({ type: 'PARTY_RALLY', domain: 'POLITICS' })
    expect(searchClassifications('프로파간다', null)[0]).toMatchObject({ type: 'PARTY_RALLY' })
    expect(searchClassifications('테러', null)[0]).toMatchObject({ type: 'PROTEST_VIOLENCE', domain: 'SOCIETY' })
    expect(searchClassifications('촛불집회', null)[0]).toMatchObject({ type: 'PROTEST_VIOLENCE' })
    expect(searchClassifications('암살', null)[0]).toMatchObject({ type: 'ATTACK' })
    expect(facetWeight('PROTEST_VIOLENCE', 'sides')).toBe('optional')
    expect(metricsFor('PROTEST_VIOLENCE').presets).toContain('society.arrested')
    expect(isArmedConflictType('PROTEST_VIOLENCE')).toBe(false)
    expect(searchClassifications('준군사', null)[0]).toMatchObject({ type: 'MILITARY_FORMATION', domain: 'MILITARY' })
    expect(searchClassifications('친위대', null)[0]).toMatchObject({ type: 'MILITARY_FORMATION' })
    expect(eventTypeFeatures('MILITARY_FORMATION').expectDepartments).toBe(true)
    expect(eventTypeFeatures('BATTLE').expectDepartments).toBe(false)
    expect(isArmedConflictType('MILITARY_FORMATION')).toBe(false)
    expect(searchClassifications('권력투쟁', null)[0]).toMatchObject({ type: 'POWER_STRUGGLE', domain: 'POLITICS' })
    expect(searchClassifications('환국', null)[0]).toMatchObject({ type: 'POWER_STRUGGLE' })
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


