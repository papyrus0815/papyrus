import {
  EVENT_DOMAIN_OPTIONS,
  EVENT_DOMAIN_ORDER,
  EVENT_DOMAINS,
  domainAccent,
  domainLabel,
  eventDomainDef,
} from './event-domain'

describe('분야 레지스트리', () => {
  it('서버 enum 9종과 같은 수, 순서에 전부 정확히 한 번', () => {
    expect(EVENT_DOMAIN_ORDER).toHaveLength(9)
    expect(new Set(EVENT_DOMAIN_ORDER).size).toBe(9)
    expect([...EVENT_DOMAIN_ORDER].sort()).toEqual(Object.keys(EVENT_DOMAINS).sort())
  })

  it('정의의 key가 표와 맞고 라벨이 겹치지 않는다', () => {
    for (const [key, def] of Object.entries(EVENT_DOMAINS)) expect(def.key).toBe(key)
    const labels = Object.values(EVENT_DOMAINS).map((def) => def.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('모르는 값·미지정·옛 한국어 이름은 기타로 떨어진다(이름을 키로 쓰지 않는다)', () => {
    expect(eventDomainDef(undefined).key).toBe('OTHER')
    expect(eventDomainDef('군사').key).toBe('OTHER')
    expect(domainLabel('MILITARY')).toBe('군사')
  })

  it('모드별 액센트 — 다크는 밝은 쌍', () => {
    expect(domainAccent('MILITARY', 'light')).toBe(EVENT_DOMAINS.MILITARY.color)
    expect(domainAccent('MILITARY', 'dark')).toBe(EVENT_DOMAINS.MILITARY.dark)
  })

  it('필터 선택지는 id가 곧 분야 키(URL에 그대로 실린다)', () => {
    expect(EVENT_DOMAIN_OPTIONS[0]).toEqual({ id: 'POLITICS', name: '정치' })
  })
})
