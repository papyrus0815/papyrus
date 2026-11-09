import { buildEventSubmitData } from './event-data-builder'

type Params = Parameters<typeof buildEventSubmitData>[0]

const base = {
  title: '훈령 제1호',
  description: '',
  startDate: '1941-06-22',
  startTime: '',
  startDatePrecision: 'day',
  endDate: '1941-06-22',
  endTime: '',
  endDatePrecision: 'day',
  domain: 'MILITARY',
  location: '',
  thumbnail: '',
  parentEventId: '',
  tags: [],
  keywords: [],
  relatedCountries: [],
  relatedPersons: [],
  mentionedPersons: [],
  childEventIds: [],
  eventImages: [],
  sections: [],
  belligerentsGraph: { countries: [], relations: [] },
  militaryEvent: {},
} as unknown as Params

describe('buildEventSubmitData — 시각', () => {
  it('시작·종료 시각을 ISO 시각으로 싣는다', () => {
    const data = buildEventSubmitData({ ...base, startDate: '1941-06-21', startTime: '23:00', endTime: '00:30' })
    expect(data.startDate).toBe('1941-06-21T23:00:00.000Z')
    expect(data.endDate).toBe('1941-06-22T00:30:00.000Z')
  })

  it('같은 날 종료인데 종료 시각만 비면 시작 시각을 따른다 — 끝이 시작보다 앞서지 않게', () => {
    const data = buildEventSubmitData({ ...base, startTime: '03:15' })
    expect(data.startDate).toBe('1941-06-22T03:15:00.000Z')
    expect(data.endDate).toBe('1941-06-22T03:15:00.000Z')
  })

  it('종료 날짜가 다르면 빈 종료 시각은 그대로 자정', () => {
    const data = buildEventSubmitData({ ...base, startTime: '03:15', endDate: '1941-06-23' })
    expect(data.endDate).toBe('1941-06-23T00:00:00.000Z')
  })
})
