/**
 * deriveTenurePeriodLabel 특성화 — 개요 카드(tenure-reign-list)와 연보 타임라인이
 * 공유하는 재임·재위 기간 라벨 파생의 단일 출처를 못 박는다.
 * 핵심: BC-safe(‘기원전 N년’), 정밀도(연/월), 재직중사망·미상/현재 폴백.
 */
import { deriveTenurePeriodLabel } from './helpers'

describe('deriveTenurePeriodLabel', () => {
  it('전체 정밀도 시작·종료 → "시작 – 종료"', () => {
    const result = deriveTenurePeriodLabel({
      startDate: '1643-05-14',
      endDate: '1715-09-01',
    })
    expect(result.startStr).toBe('1643년 5월 14일')
    expect(result.endLabel).toBe('1715년 9월 1일')
    expect(result.rangeLabel).toBe('1643년 5월 14일 – 1715년 9월 1일')
    expect(result.startYearOnly).toBe(false)
    expect(result.hasEndDate).toBe(true)
  })

  it('연 정밀도 시작 → "N년" + startYearOnly=true(‘경’ 배지 게이트)', () => {
    const result = deriveTenurePeriodLabel({
      startDate: '1643-01-01',
      startDatePrecision: 'year',
    })
    expect(result.startStr).toBe('1643년')
    expect(result.startYearOnly).toBe(true)
    expect(result.rangeLabel).toBe('1643년 – 현재')
  })

  it('월 정밀도 시작 → "N년 M월", startYearOnly=false(근사 아님)', () => {
    const result = deriveTenurePeriodLabel({
      startDate: '1643-05-01',
      startDatePrecision: 'month',
    })
    expect(result.startStr).toBe('1643년 5월')
    expect(result.startYearOnly).toBe(false)
  })

  it('BC 연 정밀도 → "기원전 N년" (구 Number(slice(0,4)) 버그 회귀 가드)', () => {
    const result = deriveTenurePeriodLabel({
      startDate: '-0221-01-01',
      startDatePrecision: 'year',
    })
    expect(result.startStr).toBe('기원전 221년')
  })

  it('BC 전체 정밀도 종료 → "기원전 N년 M월 D일"', () => {
    const result = deriveTenurePeriodLabel({
      startDate: '-0100-07-13',
      endDate: '-0044-03-15',
    })
    expect(result.startStr).toBe('기원전 100년 7월 13일')
    expect(result.endLabel).toBe('기원전 44년 3월 15일')
  })

  it('종료일 없음 + 생존 → "현재"', () => {
    const result = deriveTenurePeriodLabel({ startDate: '2000-01-01' })
    expect(result.endLabel).toBe('현재')
  })

  it('종료일 없음 + 고인 → "미상"(‘현재’ 둔갑 방지)', () => {
    const result = deriveTenurePeriodLabel({
      startDate: '1000-01-01',
      isDeceased: true,
    })
    expect(result.endLabel).toBe('미상')
  })

  it('종료 사유만 있고 종료일 미상 → "미상"', () => {
    const result = deriveTenurePeriodLabel({
      startDate: '1000-01-01',
      endReason: 'REMOVAL',
    })
    expect(result.endLabel).toBe('미상')
  })

  it('재직 중 사망(DEATH_IN_OFFICE) → 종료일 폴백 = 포맷된 사망일', () => {
    const result = deriveTenurePeriodLabel({
      startDate: '1000-01-01',
      endReason: 'DEATH_IN_OFFICE',
      isDeceased: true,
      deathDateStr: '1035년 2월 3일',
    })
    expect(result.endLabel).toBe('1035년 2월 3일')
    expect(result.rangeLabel).toBe('1000년 1월 1일 – 1035년 2월 3일')
  })

  it('DEATH_IN_OFFICE 이나 사망일 문자열 미제공 → "미상"', () => {
    const result = deriveTenurePeriodLabel({
      startDate: '1000-01-01',
      endReason: 'DEATH_IN_OFFICE',
      isDeceased: true,
    })
    expect(result.endLabel).toBe('미상')
  })

  it('시작 미상 + 종료만 있음 → "? – 종료"', () => {
    const result = deriveTenurePeriodLabel({ endDate: '1715-09-01' })
    expect(result.rangeLabel).toBe('? – 1715년 9월 1일')
  })

  it('시작·종료 모두 미상 + 진행 중 → rangeLabel 빈 문자열(칩 숨김)', () => {
    const result = deriveTenurePeriodLabel({})
    expect(result.rangeLabel).toBe('')
    expect(result.hasEndDate).toBe(false)
  })
})
