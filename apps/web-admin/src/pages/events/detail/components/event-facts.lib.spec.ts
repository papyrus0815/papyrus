import { durationLabel, groupCountriesByRole } from './event-facts.lib'
import { filledSections, paragraphOutline } from './section-outline.lib'

describe('durationLabel', () => {
  it('한국전쟁 — 1950-06-25 ~ 1953-07-27 = 3년 1개월 2일', () => {
    expect(durationLabel('1950-06-25', '1953-07-27', 'day', 'day')).toBe(
      '3년 1개월 2일',
    )
  })

  it('일이 모자라면 앞 달 길이만큼 빌린다', () => {
    expect(durationLabel('2024-01-31', '2024-03-01', 'day', 'day')).toBe(
      '1개월 1일',
    )
  })

  it('하루짜리·역순은 null', () => {
    expect(durationLabel('2025-02-04', '2025-02-04', 'day', 'day')).toBeNull()
    expect(durationLabel('2025-02-05', '2025-02-04', 'day', 'day')).toBeNull()
  })

  it('한쪽이라도 연·월 정밀도면 세지 않는다', () => {
    expect(durationLabel('1950-06-25', '1953-07-01', 'day', 'month')).toBeNull()
  })

  it('정밀도 NULL인 1월 1일은 연도 자리 표시라 세지 않는다', () => {
    expect(durationLabel('1002-01-01', '1018-12-31', null, null)).toBeNull()
  })

  it('기원전→기원후는 0년을 건너뛴다', () => {
    expect(durationLabel('-0001-06-01', '0001-06-01', 'day', 'day')).toBe('1년')
  })
})

describe('groupCountriesByRole', () => {
  it('역할 선택지 순서로 묶고, 역할 없는 나라는 관련국으로 맨 뒤', () => {
    const groups = groupCountriesByRole([
      { id: 'cn', name: '중국', role: 'ADVERSARY', historical: false },
      { id: 'us', name: '미국', role: 'PARTICIPANT', historical: false },
      { id: 'x', name: '어딘가', role: null, historical: false },
      { id: 'su', name: '소련', role: 'ADVERSARY', historical: true },
    ])
    expect(groups.map((group) => group.label)).toEqual([
      '참여국',
      '적대국',
      '관련국',
    ])
    expect(groups[1].countries.map((country) => country.name)).toEqual([
      '중국',
      '소련',
    ])
  })
})

describe('filledSections', () => {
  it('빈 사건은 전부 비어 있다', () => {
    const filled = filledSections({}, 0)
    expect(Object.values(filled).every((value) => !value)).toBe(true)
  })

  it('빈 태그만 있는 서술은 내용이 아니다', () => {
    expect(filledSections({ aftermath: '<p> </p>' }, 0).aftermath).toBe(false)
  })

  it('배경은 요약 또는 배경 단락, 전개는 그 밖의 단락', () => {
    const filled = filledSections(
      { eventSections: [{ sectionType: 'background' }] },
      0,
    )
    expect(filled.background).toBe(true)
    expect(filled.narrative).toBe(false)
  })

  it('연관은 키워드나 관련 사건만 있어도 채워진 것', () => {
    expect(filledSections({ keywords: ['a'] }, 0).network).toBe(true)
    expect(filledSections({}, 2).network).toBe(true)
  })
})

describe('paragraphOutline', () => {
  it('order 순으로 앵커를 매기고, 빈 제목은 N단락', () => {
    const outline = paragraphOutline(
      {
        eventSections: [
          { sectionType: 'narrative', title: '둘', order: 2 },
          { sectionType: 'background', title: '배경', order: 0 },
          { sectionType: 'narrative', title: '', order: 1 },
        ],
      },
      'narrative',
    )
    expect(outline).toEqual([
      { id: 'narrative-1', label: '1단락' },
      { id: 'narrative-2', label: '둘' },
    ])
  })
})
