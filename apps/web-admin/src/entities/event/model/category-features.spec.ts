import { LEDGER_CATEGORY } from '../ui/ledger-tokens'

import { categoryFeatures } from './category-features'

describe('categoryFeatures', () => {
  it('미분류·미등록 카테고리는 범용 표 — 추천 없음, 사건 전체 대상', () => {
    for (const name of [null, undefined, '', '없는 분류', '기타']) {
      const features = categoryFeatures(name)
      expect(features.suggestedModules).toEqual([])
      expect(features.metricPresets).toEqual([])
      expect(features.metricSubject).toBe('event')
      expect(features.metricsMenuLabel).toBe('수치')
    }
  })

  it('전쟁은 진영을 먼저 권하고, 수치 대상도 진영부터', () => {
    const features = categoryFeatures('전쟁/군사')
    expect(features.suggestedModules[0]).toBe('sides')
    expect(features.metricSubject).toBe('side')
    expect(features.metricPresets).toContain('military.personnel')
  })

  it('경제·조약은 전쟁 지표를 권하지 않는다', () => {
    for (const name of ['경제', '회담/조약']) {
      const features = categoryFeatures(name)
      expect(features.metricsMenuLabel).not.toContain('병력')
      expect(features.metricPresets.some((key) => key.startsWith('military.'))).toBe(false)
      expect(features.metricSubject).toBe('event')
    }
  })

  it('조약 섹션을 앞으로 올리는 것은 회담/조약뿐', () => {
    const promoted = Object.keys(LEDGER_CATEGORY).filter((name) => categoryFeatures(name).promoteTreaties)
    expect(promoted).toEqual(['회담/조약'])
  })

  it('성립·소멸 지정 안내는 건국/멸망 사건에만', () => {
    const expecting = Object.keys(LEDGER_CATEGORY).filter((name) => categoryFeatures(name).expectStatehood)
    expect(expecting).toEqual(['건국/멸망'])
  })

  it('권력 교체·선거 연결 안내는 정치 사건에만', () => {
    const expecting = Object.keys(LEDGER_CATEGORY).filter((name) => categoryFeatures(name).expectPower)
    expect(expecting).toEqual(['정치'])
  })

  it('관련 기업·조직 연결 안내는 경제 사건에만', () => {
    const expecting = Object.keys(LEDGER_CATEGORY).filter((name) => categoryFeatures(name).expectOrganizations)
    expect(expecting).toEqual(['경제'])
  })

  it('모든 카테고리 — 추천 모듈·지표에 중복이 없다', () => {
    for (const name of Object.keys(LEDGER_CATEGORY)) {
      const features = categoryFeatures(name)
      expect(new Set(features.suggestedModules).size).toBe(features.suggestedModules.length)
      expect(new Set(features.metricPresets).size).toBe(features.metricPresets.length)
    }
  })
})
