import { groupHeroCountries } from './hero-countries.lib'

const country = (id: string, sideId?: string | null) => ({ id, name: id, sideId })

describe('groupHeroCountries', () => {
  it('진영이 없으면 현대·역사를 한 줄로 — 현대가 앞, 역사국가 표시는 historical 플래그', () => {
    const groups = groupHeroCountries([country('미국')], [country('독일 제국')], [], 8)
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBeNull()
    expect(groups[0].countries.map((item) => [item.id, item.historical])).toEqual([
      ['미국', false],
      ['독일 제국', true],
    ])
  })

  it('한 줄 상한을 넘으면 overflow로 센다', () => {
    const modern = Array.from({ length: 5 }, (_, index) => country(`m${index}`))
    const historical = Array.from({ length: 5 }, (_, index) => country(`h${index}`))
    const [group] = groupHeroCountries(modern, historical, [], 8)
    expect(group.countries).toHaveLength(8)
    expect(group.overflow).toBe(2)
  })

  it('진영 둘에 나라가 들어 있으면 진영별 줄 — 진영 sortOrder 순, 소속 없는 나라는 그 밖', () => {
    const sides = [
      { id: 'b', name: '동맹국', sortOrder: 1 },
      { id: 'a', name: '협상국', sortOrder: 0 },
    ]
    const groups = groupHeroCountries(
      [country('미국', 'a'), country('스위스', null)],
      [country('독일 제국', 'b'), country('프랑스 제3공화국', 'a')],
      sides,
      8,
    )
    expect(groups.map((group) => group.label)).toEqual(['협상국', '동맹국', '그 밖'])
    expect(groups[0].countries.map((item) => item.id)).toEqual(['미국', '프랑스 제3공화국'])
    expect(groups[1].countries.map((item) => item.id)).toEqual(['독일 제국'])
  })

  it('하위 진영 소속은 맨 위 진영으로 접는다', () => {
    const sides = [
      { id: 'a', name: '연합국', sortOrder: 0 },
      { id: 'a1', name: '서부전선 연합군', parentSideId: 'a', sortOrder: 2 },
      { id: 'b', name: '추축국', sortOrder: 1 },
    ]
    const groups = groupHeroCountries([country('영국', 'a1')], [country('독일', 'b')], sides, 8)
    expect(groups.map((group) => [group.label, group.countries.length])).toEqual([
      ['연합국', 1],
      ['추축국', 1],
    ])
  })

  it('진영이 있어도 나라가 한 진영에만 들면 묶지 않는다(편이 하나면 대립이 아니다)', () => {
    const groups = groupHeroCountries(
      [country('미국', 'a'), country('영국')],
      [],
      [{ id: 'a', name: '연합국' }, { id: 'b', name: '추축국' }],
      8,
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBeNull()
  })

  it('진영 줄마다 같은 몫 — 큰 진영이 작은 진영을 밀어내지 않는다', () => {
    const big = Array.from({ length: 11 }, (_, index) => country(`a${index}`, 'a'))
    const small = Array.from({ length: 4 }, (_, index) => country(`b${index}`, 'b'))
    const groups = groupHeroCountries(big, small, [{ id: 'a', name: '협상국' }, { id: 'b', name: '동맹국' }], 8)
    expect(groups[0].countries).toHaveLength(4)
    expect(groups[0].overflow).toBe(7)
    expect(groups[1].countries).toHaveLength(4)
    expect(groups[1].overflow).toBe(0)
  })
})
