import { splitIdeologyText } from './party-ideology.util'

describe('정당 이념 문자열 쪼개기(이관·구 입력)', () => {
  const known = new Set(['기업·상공인 대변', '파시즘 (이탈리아 파시즘)'])
  const isKnown = (piece: string) => known.has(piece)

  it('쉼표로 나눈다', () => {
    expect(splitIdeologyText('보수주의, 반공주의, 자유주의', isKnown)).toEqual(['보수주의', '반공주의', '자유주의'])
  })

  it('가운뎃점으로 뭉친 조각은 다시 나눈다', () => {
    expect(splitIdeologyText('입헌주의·의회개혁·자유무역·반(反)절대왕권', isKnown)).toEqual([
      '입헌주의',
      '의회개혁',
      '자유무역',
      '반(反)절대왕권',
    ])
    expect(splitIdeologyText('민주사회주의 · 좌익 사회민주주의 · 반전주의', isKnown)).toEqual([
      '민주사회주의',
      '좌익 사회민주주의',
      '반전주의',
    ])
  })

  it('카탈로그에 통째로 있는 표기는 가운뎃점이 있어도 나누지 않는다', () => {
    expect(splitIdeologyText('경제적 자유주의, 기업·상공인 대변', isKnown)).toEqual(['경제적 자유주의', '기업·상공인 대변'])
    expect(splitIdeologyText('파시즘 (이탈리아 파시즘), 반공주의', isKnown)).toEqual(['파시즘 (이탈리아 파시즘)', '반공주의'])
  })

  it('빈 값·중복', () => {
    expect(splitIdeologyText(null, isKnown)).toEqual([])
    expect(splitIdeologyText('자유주의, , 자유주의', isKnown)).toEqual(['자유주의'])
  })
})
