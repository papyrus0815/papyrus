import { keywordSuggestions } from './related-suggestions.lib'

const rail = { id: 'rail', title: '일본 최초 철도', keywords: ['에드먼드 모렐', '이노우에 마사루', '1872', '메이지'] }
const tokaido = { id: 'tokaido', title: '도카이도 본선', keywords: ['에드먼드 모렐', '이노우에 마사루', '메이지'] }
const meiji = { id: 'meiji', title: '메이지 유신', keywords: ['메이지', '1872'] }
const tunnel = { id: 'tunnel', title: '탄나 터널', keywords: ['이노우에 마사루'] }
const busy = (index: number) => ({ id: `b${index}`, title: `메이지 사건 ${index}`, keywords: ['메이지', `x${index}`] })

describe('keywordSuggestions', () => {
  it('두 개 이상 겹친 사건만, 드문 키워드가 많이 겹칠수록 위로', () => {
    const others = [rail, tokaido, meiji, tunnel, busy(1), busy(2), busy(3)]
    const result = keywordSuggestions(rail, others)
    expect(result.map((item) => item.id)).toEqual(['tokaido', 'meiji'])
    expect(result[0].shared[0]).toBe('에드먼드 모렐')
  })
  it('이미 이어진 사건·자기 자신은 빼고, 대소문자·공백은 같은 키워드로', () => {
    const upper = { id: 'up', title: '대문자', keywords: [' 에드먼드 모렐 ', '이노우에 마사루'] }
    expect(keywordSuggestions(rail, [rail, tokaido, upper], new Set(['tokaido'])).map((item) => item.id)).toEqual(['up'])
  })
  it('키워드가 둘 미만이면 후보가 없다', () => {
    expect(keywordSuggestions({ id: 'one', title: '한 개', keywords: ['메이지'] }, [meiji])).toEqual([])
  })
})
