import { shortenCountryName } from './country-short-name'

describe('shortenCountryName', () => {
  it('통용 약칭이 있는 정식 명칭을 그 이름으로 바꾼다', () => {
    expect(shortenCountryName('그레이트브리튼 및 아일랜드 연합왕국')).toBe('영국')
    expect(shortenCountryName('소비에트 사회주의 공화국 연방')).toBe('소련')
    expect(shortenCountryName('오스트리아-헝가리 제국')).toBe('오스트리아-헝가리')
  })

  it('괄호 주석이 붙은 이름도 표가 먼저 이긴다 — 괄호만 떼면 정식명이 남는다', () => {
    expect(shortenCountryName('독일 민주 공화국 (동독)')).toBe('동독')
    expect(shortenCountryName('독일 연방 공화국 (서독)')).toBe('서독')
  })

  it('소련 구성 공화국은 SSR로 접는다', () => {
    expect(shortenCountryName('우크라이나 소비에트 사회주의 공화국')).toBe(
      '우크라이나 SSR',
    )
    expect(shortenCountryName('카자흐 소비에트 사회주의 공화국')).toBe('카자흐 SSR')
  })

  it('편집용 괄호 주석은 뗀다', () => {
    expect(shortenCountryName('세르비아 왕국 (근대)')).toBe('세르비아 왕국')
    expect(shortenCountryName('알바니아 왕국 (이탈리아 보호령)')).toBe('알바니아 왕국')
  })

  it('정체 접미사를 기계적으로 떼지 않는다 — 시대가 다른 국가가 합쳐진다', () => {
    expect(shortenCountryName('독일 제국')).toBe('독일 제국')
    expect(shortenCountryName('러시아 제국')).toBe('러시아 제국')
    expect(shortenCountryName('프랑스 제3공화국')).toBe('프랑스 제3공화국')
  })

  it('빈 문자열·괄호뿐인 입력에서 이름을 지우지 않는다', () => {
    expect(shortenCountryName('')).toBe('')
    expect(shortenCountryName('(미상)')).toBe('(미상)')
  })
})
