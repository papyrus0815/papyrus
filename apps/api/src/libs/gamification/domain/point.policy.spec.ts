import { AggregateType } from '@prisma/client'

import {
  COMPLETENESS_SIGNAL_POINTS,
  completenessBonus,
  createPointsFor,
  gradeForPoints,
  gradeProgressFor,
} from './point.policy'

describe('point.policy', () => {
  describe('gradeForPoints', () => {
    it.each([
      [0, 'BRONZE'],
      [99, 'BRONZE'],
      [100, 'SILVER'],
      [299, 'SILVER'],
      [300, 'GOLD'],
      [699, 'GOLD'],
      [700, 'PLATINUM'],
      [1499, 'PLATINUM'],
      [1500, 'DIAMOND'],
      [99999, 'DIAMOND'],
    ])('%i점 → %s', (points, expected) => {
      expect(gradeForPoints(points)).toBe(expected)
    })

    it('음수·비정상 값은 BRONZE로 처리', () => {
      expect(gradeForPoints(-50)).toBe('BRONZE')
      expect(gradeForPoints(NaN)).toBe('BRONZE')
    })
  })

  describe('gradeProgressFor', () => {
    it('구간 시작점은 진행률 0, 다음 등급/남은 점수 정확', () => {
      const p = gradeProgressFor(0)
      expect(p.gradeCode).toBe('BRONZE')
      expect(p.nextGradeCode).toBe('SILVER')
      expect(p.currentGradeMin).toBe(0)
      expect(p.nextGradeMin).toBe(100)
      expect(p.pointsToNext).toBe(100)
      expect(p.progressRatio).toBe(0)
    })

    it('구간 중간 진행률 계산', () => {
      const p = gradeProgressFor(50) // BRONZE 0~100 사이 절반
      expect(p.gradeCode).toBe('BRONZE')
      expect(p.pointsToNext).toBe(50)
      expect(p.progressRatio).toBeCloseTo(0.5)
    })

    it('등급 경계값은 상위 등급으로', () => {
      const p = gradeProgressFor(100)
      expect(p.gradeCode).toBe('SILVER')
      expect(p.currentGradeMin).toBe(100)
      expect(p.nextGradeMin).toBe(300)
      expect(p.pointsToNext).toBe(200)
      expect(p.progressRatio).toBe(0)
    })

    it('최고 등급은 다음 등급 없음·진행률 1', () => {
      const p = gradeProgressFor(2000)
      expect(p.gradeCode).toBe('DIAMOND')
      expect(p.nextGradeCode).toBeNull()
      expect(p.nextGradeMin).toBeNull()
      expect(p.pointsToNext).toBe(0)
      expect(p.progressRatio).toBe(1)
    })
  })

  describe('createPointsFor', () => {
    it('적립 대상 타입별 점수', () => {
      expect(createPointsFor(AggregateType.PERSON)).toBe(30)
      expect(createPointsFor(AggregateType.COUNTRY)).toBe(30)
      expect(createPointsFor(AggregateType.HISTORICAL_COUNTRY)).toBe(30)
      expect(createPointsFor(AggregateType.EVENT)).toBe(20)
    })

    it('미적립 타입은 0', () => {
      expect(createPointsFor(AggregateType.CITY)).toBe(0)
      expect(createPointsFor(AggregateType.ORGANIZATION)).toBe(0)
    })
  })

  describe('completenessBonus', () => {
    it('신호당 고정 점수', () => {
      expect(completenessBonus(0)).toBe(0)
      expect(completenessBonus(1)).toBe(COMPLETENESS_SIGNAL_POINTS)
      expect(completenessBonus(3)).toBe(3 * COMPLETENESS_SIGNAL_POINTS)
    })

    it('음수 신호는 0', () => {
      expect(completenessBonus(-2)).toBe(0)
    })
  })
})
