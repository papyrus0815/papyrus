import {
  buildPositionDefinitionOptions,
  findDefinitionByTitle,
  isAppointableDefinition,
  type PositionDefinitionLike,
} from './position-definition-options'

const COUNCIL = 'dept-council'
const FOREIGN_OFFICE = 'dept-foreign'

const CHAIR: PositionDefinitionLike = {
  id: 'def-chair',
  title: '공동각료회의 의장',
  positionType: 'CABINET_MINISTER',
  administrationDepartmentId: COUNCIL,
  rank: 1,
}
const FOREIGN_MINISTER: PositionDefinitionLike = {
  id: 'def-foreign',
  title: '외무장관',
  positionType: 'CABINET_MINISTER',
  usedCount: 2,
  usedInThisCountry: true,
}
const FINANCE_MINISTER: PositionDefinitionLike = {
  id: 'def-finance',
  title: '재무장관',
  positionType: 'CABINET_MINISTER',
}
const GENERIC_MINISTER: PositionDefinitionLike = {
  id: 'def-generic',
  title: '각료',
  positionType: 'CABINET_MINISTER',
  isGeneric: true,
}
const KING: PositionDefinitionLike = { id: 'def-king', title: '국왕', positionType: 'HEAD_OF_STATE', isMonarchical: true }
const COUNT: PositionDefinitionLike = { id: 'def-count', title: '백작', positionType: 'ROYAL_NOBLE_TITLE' }
const OTHER_DEPT_POST: PositionDefinitionLike = {
  id: 'def-other-dept',
  title: '외무성 정무국장',
  positionType: 'SPECIAL_POSITION',
  administrationDepartmentId: FOREIGN_OFFICE,
}
const COMMANDER: PositionDefinitionLike = { id: 'def-cmd', title: '참모총장', positionType: 'MILITARY_COMMANDER' }

const ALL = [CHAIR, FOREIGN_MINISTER, FINANCE_MINISTER, GENERIC_MINISTER, KING, COUNT, OTHER_DEPT_POST, COMMANDER]
const PICKER = [FOREIGN_MINISTER, FINANCE_MINISTER, GENERIC_MINISTER, KING, COUNT, COMMANDER]

describe('buildPositionDefinitionOptions — 직책은 DB 정의만', () => {
  it('이 기관 직책 → 이 나라에서 쓰인 직책 → 관직 카탈로그 순으로 묶는다', () => {
    const { options, ownDefinitions } = buildPositionDefinitionOptions({
      all: ALL,
      picker: PICKER,
      contextType: 'DEPARTMENT',
      departmentId: COUNCIL,
    })
    expect(ownDefinitions.map((definition) => definition.id)).toEqual(['def-chair'])
    expect(options.map((option) => [option.group, option.label])).toEqual([
      ['이 기관의 직책', '공동각료회의 의장'],
      ['이 나라에서 쓰인 직책', '외무장관'],
      ['관직 카탈로그', '재무장관'],
    ])
    expect(options[1].meta).toBe('장관·각료 · 2회')
  })

  it('일반 정의·군주·작위·다른 기관 전용 직책·군 지휘는 기관 맥락에서 빠진다', () => {
    const { options } = buildPositionDefinitionOptions({
      all: ALL,
      picker: PICKER,
      contextType: 'DEPARTMENT',
      departmentId: COUNCIL,
    })
    const labels = options.map((option) => option.label)
    expect(labels).not.toContain('각료')
    expect(labels).not.toContain('국왕')
    expect(labels).not.toContain('백작')
    expect(labels).not.toContain('외무성 정무국장')
    expect(labels).not.toContain('참모총장')
  })

  it('군 부대 맥락은 군 지휘 정의만', () => {
    const { options } = buildPositionDefinitionOptions({
      all: ALL,
      picker: PICKER,
      contextType: 'MILITARY_UNIT',
      militaryUnitId: 'unit-1',
    })
    expect(options.map((option) => option.label)).toEqual(['참모총장'])
  })

  it('지금 고른 정의가 어느 묶음에도 없으면 "현재 직책"으로 맨 앞에 — 일반 정의는 예외', () => {
    const withOtherDept = buildPositionDefinitionOptions({
      all: ALL,
      picker: PICKER,
      contextType: 'DEPARTMENT',
      departmentId: COUNCIL,
      selectedId: 'def-other-dept',
    })
    expect(withOtherDept.options[0]).toMatchObject({ group: '현재 직책', label: '외무성 정무국장' })

    const withGeneric = buildPositionDefinitionOptions({
      all: ALL,
      picker: PICKER,
      contextType: 'DEPARTMENT',
      departmentId: COUNCIL,
      selectedId: 'def-generic',
    })
    expect(withGeneric.options.some((option) => option.group === '현재 직책')).toBe(false)
  })

  it('부처의 표준 기능 분류(departmentCategoryId)가 일치하는 직책은 "이 분야 표준 직책" 묶음과 categoryDefinitions로 상단에 배치한다', () => {
    const finWithCat: PositionDefinitionLike = {
      ...FINANCE_MINISTER,
      categoryId: 'cat-finance',
    }
    const { options, categoryDefinitions } = buildPositionDefinitionOptions({
      all: [CHAIR, FOREIGN_MINISTER, finWithCat],
      picker: [FOREIGN_MINISTER, finWithCat],
      contextType: 'DEPARTMENT',
      departmentId: 'dept-new-treasury',
      departmentCategoryId: 'cat-finance',
    })
    expect(categoryDefinitions.map((d) => d.id)).toEqual(['def-finance'])
    expect(options[0]).toMatchObject({
      group: '이 분야 표준 직책',
      label: '재무장관',
    })
  })
})

describe('isAppointableDefinition · findDefinitionByTitle', () => {
  it('기관에 묶인 정의는 카탈로그 묶음에 서지 않는다(그 기관의 직책 묶음이 맡는다)', () => {
    expect(isAppointableDefinition(CHAIR, 'DEPARTMENT')).toBe(false)
    expect(isAppointableDefinition(FINANCE_MINISTER, 'CABINET')).toBe(true)
  })

  it('공백을 무시하고 같은 이름을 찾되 일반 정의는 고르지 않는다', () => {
    expect(findDefinitionByTitle([CHAIR, FOREIGN_MINISTER], '공동 각료회의 의장')?.id).toBe('def-chair')
    expect(findDefinitionByTitle([GENERIC_MINISTER], '각료')).toBeNull()
    expect(findDefinitionByTitle([CHAIR], '  ')).toBeNull()
  })
})
