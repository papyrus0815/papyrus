import {
  EVENT_TYPE_FAMILIES,
  EVENT_TYPES,
  eventTypeDef,
  eventTypeFeatures,
  facetWeight,
  isArmedConflictType,
} from './event-type-registry'

describe('사건 유형 레지스트리', () => {
  it('모든 유형은 정확히 한 계열에 속한다(서버 enum 26종과 같은 수)', () => {
    const inFamilies = EVENT_TYPE_FAMILIES.flatMap((family) => family.types)
    expect(new Set(inFamilies).size).toBe(inFamilies.length)
    expect(inFamilies.sort()).toEqual(Object.keys(EVENT_TYPES).sort())
    expect(inFamilies).toHaveLength(26)
  })

  it('정의의 key와 family가 표와 맞는다', () => {
    for (const family of EVENT_TYPE_FAMILIES) {
      for (const type of family.types) {
        expect(EVENT_TYPES[type].key).toBe(type)
        expect(EVENT_TYPES[type].family).toBe(family.key)
      }
    }
  })

  it('핵심과 선택 기록은 겹치지 않는다', () => {
    for (const def of Object.values(EVENT_TYPES)) {
      expect(def.core.filter((facet) => def.optional.includes(facet))).toEqual([])
    }
  })

  it('모르는 값·미지정은 기타', () => {
    expect(eventTypeDef(undefined).key).toBe('OTHER')
    expect(eventTypeDef('전쟁/군사').key).toBe('OTHER')
  })

  it('형식이 데이터를 정한다 — 함대법(법·정책)에는 진영을 묻지 않는다', () => {
    expect(facetWeight('BATTLE', 'sides')).toBe('core')
    expect(facetWeight('LAW_POLICY', 'sides')).toBeNull()
    expect(facetWeight('TREATY', 'treaty')).toBe('core')
    expect(facetWeight('STATEHOOD', 'statehood')).toBe('core')
    expect(facetWeight('POWER_CHANGE', 'power')).toBe('core')
  })

  it('교전선 판정은 유형으로 — 군사 분야의 법·인사·훈련은 무력 충돌이 아니다', () => {
    expect(isArmedConflictType('WAR')).toBe(true)
    expect(isArmedConflictType('BATTLE')).toBe(true)
    expect(isArmedConflictType('UPRISING')).toBe(true)
    expect(isArmedConflictType('MILITARY_MEASURE')).toBe(false)
    expect(isArmedConflictType('LAW_POLICY')).toBe(false)
  })
})

describe('eventTypeFeatures — 상세 지면이 읽는 기능', () => {
  it('전쟁: 진영 → 수치 → 작전 정보, 수치는 진영별', () => {
    const features = eventTypeFeatures('WAR')
    expect(features.suggestedModules).toEqual(['sides', 'metrics', 'military-details'])
    expect(features.metricSubject).toBe('side')
    expect(features.promoteTreaties).toBe(false)
  })

  it('조약: 조약 섹션을 올리고 배상금 지표를 권한다', () => {
    const features = eventTypeFeatures('TREATY')
    expect(features.promoteTreaties).toBe(true)
    expect(features.metricPresets).toContain('economy.indemnity')
  })

  it('건국·멸망 / 즉위·취임 / 기업은 각자의 빈 섹션을 세운다', () => {
    expect(eventTypeFeatures('STATEHOOD').expectStatehood).toBe(true)
    expect(eventTypeFeatures('POWER_CHANGE').expectPower).toBe(true)
    expect(eventTypeFeatures('ELECTION').expectPower).toBe(true)
    expect(eventTypeFeatures('COMPANY').expectOrganizations).toBe(true)
    expect(eventTypeFeatures('BATTLE').expectStatehood).toBe(false)
  })
})
