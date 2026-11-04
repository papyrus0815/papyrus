import {
  extractPlaceFromEventTitle,
  extractPlaceSearchCandidates,
  formatPlaceDetailNote,
  placeQueryFromText,
  readRecentLocations,
  recordRecentLocation,
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

describe('extractPlaceFromEventTitle', () => {
  it('연도·차수와 사건 유형 접미사를 떼어내고 지명 후보를 추출한다', () => {
    expect(extractPlaceFromEventTitle('1919년 베르사유 조약')).toBe('베르사유')
    expect(extractPlaceFromEventTitle('워털루 전투')).toBe('워털루')
    expect(extractPlaceFromEventTitle('제2차 엘 알라메인 전투')).toBe('엘 알라메인')
    expect(extractPlaceFromEventTitle('노르망디 상륙 작전')).toBe('노르망디')
    expect(extractPlaceFromEventTitle('빈 회의')).toBe('빈')
    expect(extractPlaceFromEventTitle('사라예보 사건')).toBe('사라예보')
  })

  it('국가명이나 양자 약칭은 지명 후보에서 제외한다', () => {
    expect(extractPlaceFromEventTitle('1904년 영프 협상')).toBeNull()
    expect(extractPlaceFromEventTitle('프랑스 혁명')).toBeNull()
    expect(
      extractPlaceFromEventTitle('오스만 조약', new Set(['오스만'])),
    ).toBeNull()
  })
})

describe('formatPlaceDetailNote & recentLocations', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('검색 결과 displayName에서 shortName과 우편번호를 뺀 상위 행정구역·국가 주소를 만든다', () => {
    expect(
      formatPlaceDetailNote('발미', '발미, 51800, 마른, 그랑테스트, 프랑스'),
    ).toBe('마른, 그랑테스트, 프랑스')
  })

  it('최근 사용한 위치를 중복 없이 최대 5개까지 저장·조회한다', () => {
    recordRecentLocation({
      location: '베르사유 궁전',
      latitude: 48.8049,
      longitude: 2.1204,
      note: '거울의 방',
    })
    recordRecentLocation({
      location: '워털루',
      latitude: 50.7147,
      longitude: 4.3991,
    })
    recordRecentLocation({
      location: '베르사유 궁전',
      latitude: 48.8049,
      longitude: 2.1204,
      note: '프랑스 일드프랑스',
    })

    const list = readRecentLocations()
    expect(list).toHaveLength(2)
    expect(list[0]).toEqual({
      location: '베르사유 궁전',
      latitude: 48.8049,
      longitude: 2.1204,
      note: '프랑스 일드프랑스',
    })
    expect(list[1]?.location).toBe('워털루')
  })
})
