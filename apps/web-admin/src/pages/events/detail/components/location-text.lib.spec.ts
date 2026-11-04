import {
  extractPlaceSearchCandidates,
  placeQueryFromText,
  splitLocationLabelAndNote,
} from './location-text.lib'

describe('placeQueryFromText', () => {
  it('실데이터 위치 글에서 첫 장소를 뽑는다', () => {
    expect(placeQueryFromText('발미 풍차 언덕 *현 프랑스 그랑테스트 마른주 발미)')).toBe('발미 풍차 언덕')
    expect(placeQueryFromText('잉글랜드 런던 — 서머셋 하우스(Somerset House)')).toBe('잉글랜드 런던')
    expect(placeQueryFromText('광둥성·푸젠성·저장성·장쑤성 일대 (광저우·후먼·천비)')).toBe('광둥성')
    expect(placeQueryFromText('야마나시현 오쓰키시(大月市) ~ 고슈시(甲州市)')).toBe('야마나시현 오쓰키시')
    expect(placeQueryFromText('시리아 — 알레포·하마·홈스·다마스쿠스 (북서에서 남서로)')).toBe('시리아')
    expect(placeQueryFromText('도쿄 / 일본 전역')).toBe('도쿄')
    expect(placeQueryFromText('미국 워싱턴 D.C. — 백악관 오벌오피스')).toBe('미국 워싱턴 D.C')
  })
  it('설명문이면 앞 세 낱말, 비면 빈 문자열', () => {
    expect(placeQueryFromText('옛 푀양 수도원의 정원이 정비되면서 지금의 테라스 형태의 길이 되었음.')).toBe('옛 푀양 수도원의')
    expect(placeQueryFromText('')).toBe('')
    expect(placeQueryFromText(null)).toBe('')
  })
})

describe('extractPlaceSearchCandidates', () => {
  it('현대 지명 주석(현 ...)과 세부 구간·맥락 힌트를 중복 없이 후보 배열로 뽑는다', () => {
    const candidates = extractPlaceSearchCandidates(
      '발미 풍차 언덕 *현 프랑스 그랑테스트 마른주 발미)',
      ['발미 전투', '프랑스'],
    )
    expect(candidates).toContain('프랑스 그랑테스트 마른주 발미')
    expect(candidates).toContain('발미 풍차 언덕')
    expect(candidates).toContain('프랑스')
  })

  it('대시(—)와 가운뎃점(·)으로 이어진 복합 지명에서 세부 검색어를 추출한다', () => {
    const candidates = extractPlaceSearchCandidates(
      '잉글랜드 런던 — 서머셋 하우스(Somerset House)',
    )
    expect(candidates).toEqual(
      expect.arrayContaining(['잉글랜드 런던', '서머셋 하우스']),
    )
  })
})

describe('splitLocationLabelAndNote', () => {
  it('장소 이름과 대시(—) 또는 현 지명 주석을 이름과 메모로 분리한다', () => {
    expect(
      splitLocationLabelAndNote('잉글랜드 런던 — 서머셋 하우스(Somerset House)'),
    ).toEqual({
      label: '잉글랜드 런던',
      note: '서머셋 하우스(Somerset House)',
    })
    expect(
      splitLocationLabelAndNote('발미 풍차 언덕 *현 프랑스 그랑테스트 마른주 발미)'),
    ).toEqual({
      label: '발미 풍차 언덕',
      note: '현 프랑스 그랑테스트 마른주 발미',
    })
    expect(
      splitLocationLabelAndNote('콘스탄티노폴리스 (현 튀르키예 이스탄불)'),
    ).toEqual({
      label: '콘스탄티노폴리스',
      note: '현 튀르키예 이스탄불',
    })
    expect(splitLocationLabelAndNote('베르사유 궁전')).toBeNull()
  })
})
