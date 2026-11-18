import {
  computeEventSeriesForecast,
  detectMissingSeriesEditions,
  formatSeriesCadenceLabel,
  formatSeriesEditionBadge,
  maxEditionNumberOf,
} from './event-series-forecast'

describe('event-series-forecast — 정기 회의·행사 차기 개최 추산', () => {
  const refDate = { year: 2026, month: 11, day: 18 }

  it('2년 주기(격년) 회의 — 마지막 회차 기준 2년 뒤 예상 시기와 차기 회차 번호를 계산한다', () => {
    const forecast = computeEventSeriesForecast(
      {
        title: 'WTO 각료회의',
        status: 'ACTIVE',
        cadenceKind: 'PERIODIC',
        intervalMonths: 24,
        typicalMonth: 3,
      },
      [
        {
          id: 'mc13',
          title: '제13차 WTO 각료회의',
          seriesEdition: 13,
          startEra: 'AD',
          startYear: 2024,
          startMonth: 2,
          startDay: 26,
          startDatePrecision: 'day',
        },
        {
          id: 'mc14',
          title: '제14차 WTO 각료회의',
          seriesEdition: 14,
          startEra: 'AD',
          startYear: 2026,
          startMonth: 3,
          startDay: 26,
          startDatePrecision: 'day',
        },
      ],
      refDate,
    )

    expect(forecast.kind).toBe('ESTIMATED')
    expect(forecast.cadenceLabel).toBe('2년마다 (통상 3월)')
    expect(forecast.expectedYear).toBe(2028)
    expect(forecast.expectedMonth).toBe(3)
    expect(forecast.expectedEdition).toBe(15)
    expect(forecast.headline).toContain('다음 제15차: 2028년 3월경 예상')
    expect(forecast.prefill.suggestedTitle).toBe('제15차 WTO 각료회의')
  })

  it('연 2회(6개월 주기 · 상·하반기) 아세안 정상회의 및 합동 회차(제44·45차) 처리', () => {
    const forecast = computeEventSeriesForecast(
      {
        title: '아세안 정상회의',
        status: 'ACTIVE',
        cadenceKind: 'PERIODIC',
        intervalMonths: 6,
        typicalMonth: 5,
        typicalMonthSecondary: 10,
      },
      [
        {
          id: 'asean-44-45',
          title: '제44·45차 아세안 정상회의',
          seriesEdition: 44,
          seriesEditionLabel: '제44·45차',
          startEra: 'AD',
          startYear: 2026,
          startMonth: 5,
          startDay: 10,
          startDatePrecision: 'day',
        },
        {
          id: 'asean-special',
          title: '아세안 미얀마 특별 정상회의',
          seriesEdition: null,
          seriesEditionLabel: '특별 정상회의',
          startEra: 'AD',
          startYear: 2026,
          startMonth: 8,
          startDay: 1,
          startDatePrecision: 'day',
        },
      ],
      { year: 2026, month: 9, day: 1 },
    )

    expect(maxEditionNumberOf({ seriesEdition: 44, seriesEditionLabel: '제44·45차' })).toBe(45)
    expect(formatSeriesEditionBadge({ seriesEdition: 44, seriesEditionLabel: '제44·45차' })).toBe('제44·45차')
    expect(forecast.kind).toBe('ESTIMATED')
    // 상반기(5월) 정규 회차 다음이므로 같은 해 하반기(10월) 제46차를 안내해야 한다
    expect(forecast.expectedYear).toBe(2026)
    expect(forecast.expectedMonth).toBe(10)
    expect(forecast.expectedEdition).toBe(46)
    expect(forecast.prefill.suggestedTitle).toBe('제46차 아세안 정상회의')
  })

  it('이미 미래 예정 사건(Event)이 등록되어 있으면 추산 대신 해당 예정 사건을 최우선 가리킨다', () => {
    const forecast = computeEventSeriesForecast(
      {
        title: 'APEC 정상회의',
        status: 'ACTIVE',
        cadenceKind: 'PERIODIC',
        intervalMonths: 12,
        typicalMonth: 11,
      },
      [
        {
          id: 'apec-2025',
          title: '2025년 경주 APEC 정상회의',
          startEra: 'AD',
          startYear: 2025,
          startMonth: 10,
          startDay: 31,
          startDatePrecision: 'day',
        },
        {
          id: 'apec-2027',
          title: '2027년 베트남 APEC 정상회의',
          startEra: 'AD',
          startYear: 2027,
          startMonth: 11,
          startDatePrecision: 'month',
          location: '푸꾸옥',
          hostCountry: { id: 'vn', name: '베트남', flagEmoji: '🇻🇳' },
        },
      ],
      refDate,
    )

    expect(forecast.kind).toBe('SCHEDULED_EVENT')
    expect(forecast.scheduledEventId).toBe('apec-2027')
    expect(forecast.expectedYear).toBe(2027)
    expect(forecast.expectedMonth).toBe(11)
    expect(forecast.headline).toContain('2027년 11월 예정')
    expect(forecast.headline).toContain('베트남 · 푸꾸옥')
  })

  it('예상 개최 시점이 기준일보다 이미 지났고 새 회차가 없으면 OVERDUE(미등록 점검)를 돌려준다', () => {
    const forecast = computeEventSeriesForecast(
      {
        title: 'ASEM 정상회의',
        status: 'ACTIVE',
        cadenceKind: 'PERIODIC',
        intervalMonths: 24,
        typicalMonth: 11,
      },
      [
        {
          id: 'asem-13',
          title: '제13차 ASEM 정상회의',
          seriesEdition: 13,
          startEra: 'AD',
          startYear: 2021,
          startMonth: 11,
          startDay: 25,
          startDatePrecision: 'day',
        },
      ],
      refDate,
    )

    expect(forecast.kind).toBe('OVERDUE')
    expect(forecast.expectedYear).toBe(2023)
    expect(forecast.expectedEdition).toBe(14)
    expect(forecast.headline).toContain('2023년 11월경 제14차 회차 미등록')
  })

  it('연기(POSTPONED) 및 종료(ENDED)·해산 조직은 상태를 정확히 반영한다', () => {
    const postponed = computeEventSeriesForecast(
      {
        title: 'ASEM 정상회의',
        status: 'ACTIVE',
        cadenceKind: 'PERIODIC',
        intervalMonths: 24,
        nextScheduleState: 'POSTPONED',
        nextYear: 2023,
        nextNote: '우크라이나 전쟁 여파로 무기한 연기',
      },
      [],
      refDate,
    )
    expect(postponed.kind).toBe('POSTPONED')
    expect(postponed.headline).toContain('차기 회의 연기됨')

    const dissolved = computeEventSeriesForecast(
      {
        title: '동남아시아조약기구 각료이사회',
        status: 'ACTIVE',
        cadenceKind: 'PERIODIC',
        intervalMonths: 12,
        organizationDissolved: true,
        endedYear: 1977,
      },
      [],
      refDate,
    )
    expect(dissolved.kind).toBe('ENDED')
    expect(formatSeriesCadenceLabel({ cadenceKind: 'IRREGULAR' })).toBe('부정기')
  })

  it('순환 의장국 큐(hostRotationEnabled) — 마지막 개최국 다음 순번을 추론하고 연 2회 같은 해 의장국은 유지한다', () => {
    const quadQueue = [
      { id: 'us', name: '미국', flagEmoji: '🇺🇸' },
      { id: 'in', name: '인도', flagEmoji: '🇮🇳' },
      { id: 'jp', name: '일본', flagEmoji: '🇯🇵' },
      { id: 'au', name: '호주', flagEmoji: '🇦🇺' },
    ]
    const quadForecast = computeEventSeriesForecast(
      {
        title: '쿼드 정상회의',
        status: 'ACTIVE',
        cadenceKind: 'PERIODIC',
        intervalMonths: 12,
        typicalMonth: 9,
        hostRotationEnabled: true,
        rotationCandidates: quadQueue,
      },
      [
        {
          id: 'quad-4',
          title: '제4차 쿼드 정상회의',
          seriesEdition: 4,
          startEra: 'AD',
          startYear: 2026,
          startMonth: 9,
          startDay: 21,
          startDatePrecision: 'day',
          hostCountry: { id: 'au', name: '호주', flagEmoji: '🇦🇺' },
        },
      ],
      refDate,
    )

    expect(quadForecast.kind).toBe('ESTIMATED')
    expect(quadForecast.hostCountry?.id).toBe('us')
    expect(quadForecast.hostCountryIsEstimated).toBe(true)
    expect(quadForecast.prefill.suggestedHostCountryId).toBe('us')
    expect(quadForecast.headline).toContain('순번 의장국 미국')

    // 연 2회(아세안 상·하반기): 상반기(5월) 말레이시아 개최 후 하반기(10월) 같은 해는 말레이시아 유지, 이듬해는 필리핀 순번
    const aseanQueue = [
      { id: 'la', name: '라오스', flagEmoji: '🇱🇦' },
      { id: 'my', name: '말레이시아', flagEmoji: '🇲🇾' },
      { id: 'ph', name: '필리핀', flagEmoji: '🇵🇭' },
    ]
    const sameYearSecondHalf = computeEventSeriesForecast(
      {
        title: '아세안 정상회의',
        status: 'ACTIVE',
        cadenceKind: 'PERIODIC',
        intervalMonths: 6,
        typicalMonth: 5,
        typicalMonthSecondary: 10,
        hostRotationEnabled: true,
        rotationCandidates: aseanQueue,
      },
      [
        {
          id: 'asean-46',
          title: '제46차 아세안 정상회의',
          seriesEdition: 46,
          startEra: 'AD',
          startYear: 2026,
          startMonth: 5,
          startDay: 26,
          startDatePrecision: 'day',
          hostCountry: { id: 'my', name: '말레이시아', flagEmoji: '🇲🇾' },
        },
      ],
      { year: 2026, month: 7, day: 1 },
    )
    expect(sameYearSecondHalf.expectedYear).toBe(2026)
    expect(sameYearSecondHalf.hostCountry?.id).toBe('my')

    const nextYearFirstHalf = computeEventSeriesForecast(
      {
        title: '아세안 정상회의',
        status: 'ACTIVE',
        cadenceKind: 'PERIODIC',
        intervalMonths: 6,
        typicalMonth: 5,
        typicalMonthSecondary: 10,
        hostRotationEnabled: true,
        rotationCandidates: aseanQueue,
      },
      [
        {
          id: 'asean-47',
          title: '제47차 아세안 정상회의',
          seriesEdition: 47,
          startEra: 'AD',
          startYear: 2026,
          startMonth: 10,
          startDay: 26,
          startDatePrecision: 'day',
          hostCountry: { id: 'my', name: '말레이시아', flagEmoji: '🇲🇾' },
        },
      ],
      { year: 2026, month: 11, day: 1 },
    )
    expect(nextYearFirstHalf.expectedYear).toBe(2027)
    expect(nextYearFirstHalf.hostCountry?.id).toBe('ph')
  })

  it('결번(미등록 회차 구간) 탐지 — 합동 회차는 결번으로 잡지 않고 초기 구간과 중간 결번을 구분한다', () => {
    const gaps = detectMissingSeriesEditions([
      { seriesEdition: 41 },
      { seriesEdition: 43 },
      { seriesEdition: 44, seriesEditionLabel: '제44·45차' },
      { seriesEdition: 46 },
    ])

    expect(gaps).toEqual([
      { fromEdition: 1, toEdition: 40, count: 40, isLeadingGap: true },
      { fromEdition: 42, toEdition: 42, count: 1, isLeadingGap: false },
    ])
  })
})
