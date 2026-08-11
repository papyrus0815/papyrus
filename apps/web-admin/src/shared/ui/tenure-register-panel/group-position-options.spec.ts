import {
  buildPositionOptions,
  buildReignPositionOptions,
  groupHeadsPositionOptions,
  parseRecentTitleValue,
  recentTitleValue,
  DEFAULT_COLLAPSED_POSITION_GROUPS,
  REIGN_OTHER_GROUP_LABEL,
} from './group-position-options'

const 대통령 = { id: 'p', title: '대통령', positionType: 'HEAD_OF_STATE', isMonarchical: false }
const 국왕 = { id: 'k', title: '국왕', positionType: 'HEAD_OF_STATE', isMonarchical: true }
const 쇼군 = { id: 's', title: '쇼군', positionType: 'HEAD_OF_GOVERNMENT', isMonarchical: false }
const 자작 = { id: 'v', title: '자작', positionType: 'ROYAL_NOBLE_TITLE', isMonarchical: false }
const 외무장관 = { id: 'm', title: '외무장관', positionType: 'CABINET_MINISTER', isMonarchical: false }

const ALL = [대통령, 국왕, 쇼군, 자작, 외무장관]

describe('buildPositionOptions — 관직 재임 피커', () => {
  it('군주 칭호는 빼고, 작위는 접히는 별도 그룹으로 강등한다', () => {
    const options = buildPositionOptions({ definitions: ALL, isMinisterFlow: false })
    expect(options.map((option) => option.value)).not.toContain('k')
    expect(options.find((option) => option.value === 'v')?.group).toBe('작위·칭호')
    expect(options.find((option) => option.value === 'p')?.group).toBe('관직')
    expect(DEFAULT_COLLAPSED_POSITION_GROUPS).toContain('작위·칭호')
  })

  it('관직이 작위보다 먼저 나온다 — 그룹 경계가 뒤섞이면 머리글이 중복된다', () => {
    const options = buildPositionOptions({ definitions: [자작, 대통령], isMinisterFlow: false })
    expect(options.map((option) => option.group)).toEqual(['관직', '작위·칭호'])
  })

  it("'기타 (직접 입력)'는 언제나 마지막이고 그룹이 없다", () => {
    const options = buildPositionOptions({
      definitions: ALL,
      isMinisterFlow: false,
      otherValue: 'OTHER',
    })
    const last = options[options.length - 1]
    expect(last.value).toBe('OTHER')
    expect(last.group).toBeUndefined()
  })

  it('그룹이 하나뿐이면 머리글을 붙이지 않는다', () => {
    const options = buildPositionOptions({
      definitions: [대통령, 외무장관],
      isMinisterFlow: false,
      otherValue: 'OTHER',
    })
    expect(options.every((option) => option.group === undefined)).toBe(true)
  })

  it('각료 플로우는 각료·차관·부통령·기타만 남긴다', () => {
    const options = buildPositionOptions({ definitions: ALL, isMinisterFlow: true })
    expect(options.map((option) => option.value)).toEqual(['m'])
  })

  it('수정 중인 정의는 각료 플로우 하드 필터도 관통한다 — 선택 유실 방지', () => {
    const options = buildPositionOptions({
      definitions: ALL,
      isMinisterFlow: true,
      pinnedDefinition: 대통령,
    })
    expect(options.map((option) => option.value)).toContain('p')
  })

  it('수정 중인 정의가 군주 칭호여도 되살린다(재위 행을 재임 패널로 편집하는 경로)', () => {
    const options = buildPositionOptions({
      definitions: ALL,
      isMinisterFlow: false,
      pinnedDefinition: 국왕,
    })
    expect(options.find((option) => option.value === 'k')?.group).toBe('군주 칭호')
  })

  it('수정 중인 정의가 이미 목록에 있으면 중복 노출하지 않는다', () => {
    const options = buildPositionOptions({
      definitions: ALL,
      isMinisterFlow: false,
      pinnedDefinition: 대통령,
    })
    expect(options.filter((option) => option.value === 'p')).toHaveLength(1)
  })

  it('내장 직책은 관직 그룹에 붙되, 같은 유형의 정의가 있으면 중복 노출하지 않는다', () => {
    const builtins = [
      { value: '__VP__', label: '부통령', positionType: 'DEPUTY_HEAD_OF_STATE' },
    ] as const
    const withoutDef = buildPositionOptions({
      definitions: [대통령, 자작],
      isMinisterFlow: false,
      builtins,
    })
    expect(withoutDef.find((option) => option.value === '__VP__')?.group).toBe('관직')

    const withDef = buildPositionOptions({
      definitions: [
        대통령,
        { id: 'vp', title: '부통령', positionType: 'DEPUTY_HEAD_OF_STATE' },
      ],
      isMinisterFlow: false,
      builtins,
    })
    expect(withDef.map((option) => option.value)).not.toContain('__VP__')
  })
})

describe('buildPositionOptions — 사용 실적 그룹', () => {
  it('이 국가에서 쓰인 관직을 최상단 그룹으로 올린다', () => {
    const options = buildPositionOptions({
      definitions: [
        대통령,
        { ...외무장관, usedInThisCountry: true, usedCount: 3 },
      ],
      isMinisterFlow: false,
    })
    expect(options[0]).toMatchObject({ value: 'm', group: '이 국가에서 쓰인 직책' })
    expect(options[1]).toMatchObject({ value: 'p', group: '관직' })
  })

  it('사용 실적이 많은 순 → rank 순으로 정렬한다', () => {
    const options = buildPositionOptions({
      definitions: [
        { ...대통령, usedInThisCountry: true, usedCount: 1, rank: 1 },
        { ...외무장관, usedInThisCountry: true, usedCount: 9, rank: 5 },
      ],
      isMinisterFlow: false,
    })
    expect(options.map((option) => option.value)).toEqual(['m', 'p'])
  })

  it('군주·작위는 재위 사용 이력이 있어도 사용 실적 그룹에 넣지 않는다', () => {
    // 사용 실적은 재임+재위 합산이라 게이트가 없으면 재위 이력이 관직 피커 최상단으로 샌다
    const options = buildPositionOptions({
      definitions: [
        { ...자작, usedInThisCountry: true, usedCount: 12 },
        { ...대통령, usedInThisCountry: true, usedCount: 1 },
      ],
      isMinisterFlow: false,
    })
    expect(options.find((option) => option.value === 'v')?.group).toBe('작위·칭호')
    expect(options.find((option) => option.value === 'p')?.group).toBe(
      '이 국가에서 쓰인 직책',
    )
    // 같은 정의가 두 그룹에 중복 등장하면 SelectModal의 key가 겹친다
    expect(options.filter((option) => option.value === 'v')).toHaveLength(1)
  })

  it('자유입력 직책명을 선택지로 되살리되, 같은 표기의 정의가 있으면 중복 노출하지 않는다', () => {
    const options = buildPositionOptions({
      definitions: [대통령, 외무장관],
      isMinisterFlow: false,
      recentTitles: [
        { title: '외국봉행', positionType: 'CABINET_MINISTER', count: 1 },
        { title: '외무장관', positionType: 'CABINET_MINISTER', count: 3 },
      ],
    })
    const values = options.map((option) => option.value)
    expect(values).toContain('__RECENT__:CABINET_MINISTER:외국봉행')
    expect(values).not.toContain('__RECENT__:CABINET_MINISTER:외무장관')
    expect(
      options.find((option) => option.value === '__RECENT__:CABINET_MINISTER:외국봉행')
        ?.group,
    ).toBe('이 국가에서 쓰인 직책')
  })

  it('자유입력 값은 접두어로 정의 id와 네임스페이스가 분리된다', () => {
    expect(parseRecentTitleValue(recentTitleValue('영사', 'DIPLOMATIC_POST'))).toEqual({
      title: '영사',
      positionType: 'DIPLOMATIC_POST',
    })
    expect(parseRecentTitleValue('some-uuid')).toBeNull()
  })

  it('같은 표기·다른 유형이면 값이 갈려 옵션 key가 겹치지 않는다', () => {
    const options = buildPositionOptions({
      definitions: [대통령],
      isMinisterFlow: false,
      recentTitles: [
        { title: '참모총장', positionType: 'MILITARY_COMMANDER', count: 1 },
        { title: '참모총장', positionType: 'OTHER', count: 1 },
      ],
    })
    const recentValues = options
      .map((option) => option.value)
      .filter((value) => value.startsWith('__RECENT__:'))
    expect(new Set(recentValues).size).toBe(2)
    expect(parseRecentTitleValue(recentValues[1])?.positionType).toBe('OTHER')
  })
})

describe('groupHeadsPositionOptions — 수반 등록 피커', () => {
  it('작위만 접히는 그룹으로 내리고 입력 정렬은 보존한다', () => {
    const options = groupHeadsPositionOptions([국왕, 자작, 대통령])
    expect(options.map((option) => option.value)).toEqual(['k', 'p', 'v'])
    expect(options.map((option) => option.group)).toEqual([
      '수반 직책',
      '수반 직책',
      '작위·칭호',
    ])
  })

  it('작위가 없으면 머리글을 붙이지 않는다', () => {
    const options = groupHeadsPositionOptions([국왕, 대통령])
    expect(options.every((option) => option.group === undefined)).toBe(true)
  })
})

describe('buildReignPositionOptions — 군주 재위 피커', () => {
  it('군주 칭호 → 작위 → 그 밖의 직위 순으로 묶는다', () => {
    const options = buildReignPositionOptions({ definitions: ALL })
    expect(options.map((option) => option.group)).toEqual([
      '군주 칭호',
      '작위·칭호',
      // 대통령·쇼군·외무장관 — 관직 유형은 전부 접히는 그룹으로
      '그 밖의 직위',
      '그 밖의 직위',
      '그 밖의 직위',
    ])
  })

  it('쇼군처럼 관직 유형으로 등록된 재위도 사라지지 않는다(실측 15행)', () => {
    const options = buildReignPositionOptions({ definitions: ALL })
    const 쇼군옵션 = options.find((option) => option.value === 's')
    expect(쇼군옵션).toBeDefined()
    expect(쇼군옵션?.group).toBe(REIGN_OTHER_GROUP_LABEL)
  })

  it('수정 중인 정의가 서버 목록에 없어도 되살린다', () => {
    const options = buildReignPositionOptions({
      definitions: [국왕],
      pinnedDefinition: 쇼군,
    })
    expect(options.map((option) => option.value)).toContain('s')
  })
})
