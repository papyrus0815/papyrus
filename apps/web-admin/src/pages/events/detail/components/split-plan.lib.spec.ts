import {
  buildSplitPayload,
  draftFromSectionTitle,
  initialSplitRows,
  parseDateText,
  rowError,
  summarizeRows,
} from './split-plan.lib'

describe('parseDateText', () => {
  it('연·월·일 정밀도를 가른다', () => {
    expect(parseDateText('1854')).toEqual({ iso: '1854-01-01', precision: 'year' })
    expect(parseDateText('1854-11')).toEqual({ iso: '1854-11-01', precision: 'month' })
    expect(parseDateText('1854-11-05')).toEqual({ iso: '1854-11-05', precision: 'day' })
    expect(parseDateText('1876년 8월')).toEqual({ iso: '1876-08-01', precision: 'month' })
  })

  it('기원전은 음수 연도 ISO', () => {
    expect(parseDateText('BC 480')).toEqual({ iso: '-480-01-01', precision: 'year' })
    expect(parseDateText('기원전 44')).toEqual({ iso: '-44-01-01', precision: 'year' })
  })

  it('빈 칸은 null, 못 읽으면 undefined', () => {
    expect(parseDateText('  ')).toBeNull()
    expect(parseDateText('봄')).toBeUndefined()
    expect(parseDateText('1854-13')).toBeUndefined()
  })
})

describe('draftFromSectionTitle', () => {
  it('제목 끝 괄호의 시기를 날짜 두 칸으로', () => {
    expect(draftFromSectionTitle('제1기(1700–1706)')).toEqual({ title: '제1기', start: '1700', end: '1706' })
    expect(draftFromSectionTitle('모라바 계곡 방어전 (1876년 8월)')).toEqual({
      title: '모라바 계곡 방어전',
      start: '1876-08',
      end: '',
    })
  })

  it('이름이 앞선 괄호는 제목의 일부로 남긴다', () => {
    expect(draftFromSectionTitle('제1차 디미트리아드(First Dymitriad, 1604~1606년)')).toEqual({
      title: '제1차 디미트리아드(First Dymitriad, 1604~1606년)',
      start: '',
      end: '',
    })
  })
})

describe('행 검증·전송 형태', () => {
  const rows = initialSplitRows([
    { id: 's1', title: '제1기(1700–1706)' },
    { id: 's2', title: '열강의 반응', subjectEventId: 'child-1' },
    { id: 's3', title: '' },
  ])

  it('새 하위는 제목이 있어야 하고, 기존 하위로 옮기는 행은 검사하지 않는다', () => {
    expect(rowError(rows[0])).toBeNull()
    expect(rowError(rows[1])).toBeNull()
    expect(rowError(rows[2])).toMatch(/제목/)
    expect(rowError({ ...rows[2], to: 'BACKGROUND' })).toBeNull()
  })

  it('하위 행은 제목·날짜를, 그 밖은 행선지만 보낸다', () => {
    const payload = buildSplitPayload([rows[0], rows[1], { ...rows[2], to: 'DROP' }])
    expect(payload).toEqual([
      {
        sectionId: 's1',
        to: 'CHILD',
        title: '제1기',
        startDate: '1700-01-01',
        startDatePrecision: 'year',
        endDate: '1706-01-01',
        endDatePrecision: 'year',
      },
      { sectionId: 's2', to: 'CHILD' },
      { sectionId: 's3', to: 'DROP' },
    ])
  })

  it('요약', () => {
    expect(summarizeRows([rows[0], { ...rows[1], to: 'BACKGROUND' }, { ...rows[2], to: 'DROP' }])).toBe(
      '하위 사건 1 · 배경 1 · 버리기 1',
    )
  })
})
