import { normalizeAchievement, normalizeTenure } from './normalize'

describe('normalizeTenure — 엔드포인트 응답 → 표준 Tenure', () => {
  it('국가 목록 모양(recordKind TENURE, 업적 없음)', () => {
    const result = normalizeTenure({
      id: 't1',
      recordKind: 'TENURE',
      positionType: 'HEAD_OF_STATE',
      appointmentMethod: 'DIRECT_ELECTION',
      title: '대통령',
      termNumber: 20,
      startDate: '2022-05-10',
      endDate: null,
      country: { id: 'kr', name: '대한민국' },
    })
    expect(result.kind).toBe('TENURE')
    expect(result.positionCategory).toBe('PRESIDENT')
    expect(result.ordinal).toBe(20)
    expect(result.country).toEqual({ id: 'kr', name: '대한민국' })
    expect(result.achievements).toEqual([])
  })

  it('재위 모양 + 레거시 왕명 notes', () => {
    const result = normalizeTenure({
      id: 'r1',
      recordKind: 'SOVEREIGN_REIGN',
      notes: '왕명: 세종\n비고 텍스트',
      regnalNumber: 4,
      startDate: '1418-09-09',
    })
    expect(result.kind).toBe('SOVEREIGN_REIGN')
    expect(result.positionCategory).toBe('MONARCH')
    expect(result.regnalName).toBe('세종')
    expect(result.ordinal).toBe(4)
  })

  it('전용 regnalName 필드가 notes보다 우선', () => {
    const result = normalizeTenure({
      id: 'r2',
      recordKind: 'SOVEREIGN_REIGN',
      regnalName: '정조',
      notes: '왕명: 세종',
      startDate: '1776-01-01',
    })
    expect(result.regnalName).toBe('정조')
  })

  it('인물 상세 tenure 모양(recordKind 없음 → fallback TENURE, cabinet·업적 임베드)', () => {
    const result = normalizeTenure(
      {
        id: 't2',
        positionType: 'HEAD_OF_GOVERNMENT',
        positionDefinition: { title: '국무총리' },
        title: '총리(override)',
        cabinet: { id: 'cab1' },
        achievements: [
          { id: 'a1', title: '업적1', orderNum: 0, startDate: '2020-01-01' },
        ],
      },
      'TENURE',
    )
    expect(result.kind).toBe('TENURE')
    expect(result.positionCategory).toBe('PM')
    // positionDefinition.title이 title보다 우선
    expect(result.positionTitle).toBe('국무총리')
    expect(result.cabinetId).toBe('cab1')
    expect(result.achievements).toHaveLength(1)
    expect(result.achievements[0]?.title).toBe('업적1')
  })

  it('인물 상세 재위 모양(recordKind 없음 → fallback SOVEREIGN_REIGN)', () => {
    const result = normalizeTenure(
      { id: 'r3', startDate: '0668-01-01', regnalName: '문무왕' },
      'SOVEREIGN_REIGN',
    )
    expect(result.kind).toBe('SOVEREIGN_REIGN')
    expect(result.positionCategory).toBe('MONARCH')
  })

  it('ordinal은 regnalNumber가 termNumber보다 우선', () => {
    const result = normalizeTenure({
      id: 't3',
      regnalNumber: 14,
      termNumber: 3,
      startDate: '1643-05-14',
    })
    expect(result.ordinal).toBe(14)
    expect(result.regnalNumber).toBe(14)
    expect(result.termNumber).toBe(3)
  })

  it('빈 응답도 graceful — id만 있고 나머지 null/빈 배열', () => {
    const result = normalizeTenure({ id: 'x' })
    expect(result.id).toBe('x')
    expect(result.kind).toBe('TENURE')
    expect(result.person).toBeNull()
    expect(result.country).toBeNull()
    expect(result.startDate).toBeNull()
    expect(result.achievements).toEqual([])
    expect(result.positionCategory).toBe('OTHER')
  })
})

describe('normalizeAchievement', () => {
  it('event 포함 매핑 + deletedAt 보존', () => {
    const result = normalizeAchievement({
      id: 'a1',
      title: '한글 창제',
      description: '<p>설명</p>',
      startDate: '1443-12-01',
      showOnEventsPage: false,
      eventId: 'e1',
      event: { id: 'e1', title: '훈민정음', deletedAt: '2024-01-01' },
    })
    expect(result.title).toBe('한글 창제')
    expect(result.showOnEventsPage).toBe(false)
    expect(result.event).toEqual({
      id: 'e1',
      title: '훈민정음',
      deletedAt: '2024-01-01',
    })
  })

  it('event 없으면 null, 누락 필드는 null', () => {
    const result = normalizeAchievement({ id: 'a2', title: '업적' })
    expect(result.event).toBeNull()
    expect(result.description).toBeNull()
    expect(result.showOnEventsPage).toBeNull()
    expect(result.orderNum).toBeNull()
  })
})
