import {
  filterPositionDefinitions,
  MINISTER_POSITION_TYPES,
} from './filter-position-definitions'

describe('filterPositionDefinitions', () => {
  const king = { id: 'k', positionType: 'HEAD_OF_STATE', isMonarchical: true }
  const president = {
    id: 'p',
    positionType: 'HEAD_OF_STATE',
    isMonarchical: false,
  }
  const daimyo = { id: 'd', positionType: 'HEAD_OF_STATE', isMonarchical: true }
  const foreignMinister = {
    id: 'fm',
    positionType: 'CABINET_MINISTER',
    isMonarchical: false,
  }
  const primeMinister = {
    id: 'pm',
    positionType: 'HEAD_OF_GOVERNMENT',
    isMonarchical: false,
  }
  const duke = { id: 'du', positionType: 'ROYAL_NOBLE_TITLE', isMonarchical: false }
  const all = [king, president, daimyo, foreignMinister, primeMinister, duke]

  describe('일반 관직 재임 플로우 (isMinisterFlow=false)', () => {
    const result = filterPositionDefinitions(all, { isMinisterFlow: false })
    const ids = result.map((def) => def.id)

    it('군주·주권 칭호(isMonarchical=true)는 제외한다 — 국왕·번주', () => {
      expect(ids).not.toContain('k')
      expect(ids).not.toContain('d')
    })

    it('공화정 원수(isMonarchical=false HEAD_OF_STATE)는 유지한다 — 대통령', () => {
      expect(ids).toContain('p')
    })

    it('각료·총리·귀족은 유지한다 — 외무장관·총리·공작', () => {
      expect(ids).toEqual(expect.arrayContaining(['fm', 'pm', 'du']))
    })
  })

  describe('각료 추가 플로우 (isMinisterFlow=true)', () => {
    const result = filterPositionDefinitions(all, { isMinisterFlow: true })
    const ids = result.map((def) => def.id)

    it('MINISTER_POSITION_TYPES만 남긴다 — 외무장관(각료)만', () => {
      expect(ids).toEqual(['fm'])
    })

    it('군주 여부와 무관하게 positionType으로만 거른다', () => {
      // 총리(HEAD_OF_GOVERNMENT)는 isMonarchical=false여도 각료 타입이 아니라 제외됨
      expect(ids).not.toContain('pm')
      expect(MINISTER_POSITION_TYPES.has('HEAD_OF_GOVERNMENT')).toBe(false)
    })
  })

  it('isMonarchical 필드가 없는 정의는 유지한다(하위호환)', () => {
    const legacy = [{ id: 'x', positionType: 'CABINET_MINISTER' }]
    const result = filterPositionDefinitions(legacy, { isMinisterFlow: false })
    expect(result.map((def) => def.id)).toEqual(['x'])
  })
})
