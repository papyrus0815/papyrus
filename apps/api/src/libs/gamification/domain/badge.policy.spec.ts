import { AggregateType } from '@prisma/client'

import {
  BadgeStats,
  badgeDef,
  badgeProgress,
  earnedBadgeCodes,
  isBadgeEarned,
} from './badge.policy'

const stats = (over: Partial<BadgeStats> = {}): BadgeStats => ({
  contributionCount: 0,
  totalPoints: 0,
  countByType: {},
  streakDays: 0,
  ...over,
})

describe('badge.policy', () => {
  describe('earnedBadgeCodes', () => {
    it('아무 기여 없으면 획득 뱃지 없음', () => {
      expect(earnedBadgeCodes(stats())).toEqual([])
    })

    it('첫 등록 → FIRST_STEP', () => {
      expect(earnedBadgeCodes(stats({ contributionCount: 1 }))).toContain('FIRST_STEP')
    })

    it('기여 수 누적 뱃지(10/50/100)', () => {
      const at10 = earnedBadgeCodes(stats({ contributionCount: 10 }))
      expect(at10).toEqual(expect.arrayContaining(['FIRST_STEP', 'CONTRIBUTOR_10']))
      expect(at10).not.toContain('CONTRIBUTOR_50')

      expect(earnedBadgeCodes(stats({ contributionCount: 50 }))).toContain('CONTRIBUTOR_50')
      expect(earnedBadgeCodes(stats({ contributionCount: 100 }))).toContain('CONTRIBUTOR_100')
    })

    it('점수 뱃지(500/1500)', () => {
      expect(earnedBadgeCodes(stats({ totalPoints: 500 }))).toContain('POINT_500')
      expect(earnedBadgeCodes(stats({ totalPoints: 499 }))).not.toContain('POINT_500')
      expect(earnedBadgeCodes(stats({ totalPoints: 1500 }))).toContain('POINT_1500')
    })

    it('타입별 뱃지(인물/사건)', () => {
      expect(
        earnedBadgeCodes(stats({ countByType: { [AggregateType.PERSON]: 10 } })),
      ).toContain('PERSON_10')
      expect(
        earnedBadgeCodes(stats({ countByType: { [AggregateType.EVENT]: 10 } })),
      ).toContain('EVENT_10')
    })

    it('연속 등록 스트릭 뱃지(3일/7일)', () => {
      expect(earnedBadgeCodes(stats({ streakDays: 3 }))).toContain('STREAK_3')
      expect(earnedBadgeCodes(stats({ streakDays: 2 }))).not.toContain('STREAK_3')
      expect(earnedBadgeCodes(stats({ streakDays: 7 }))).toEqual(
        expect.arrayContaining(['STREAK_3', 'STREAK_7']),
      )
    })

    it('COUNTRY_5는 현대+역사적 국가 합산', () => {
      const combined = stats({
        countByType: {
          [AggregateType.COUNTRY]: 3,
          [AggregateType.HISTORICAL_COUNTRY]: 2,
        },
      })
      expect(earnedBadgeCodes(combined)).toContain('COUNTRY_5')

      const notYet = stats({ countByType: { [AggregateType.COUNTRY]: 4 } })
      expect(earnedBadgeCodes(notYet)).not.toContain('COUNTRY_5')
    })
  })

  describe('isBadgeEarned / badgeProgress', () => {
    it('진행값은 타깃 상한으로 캡', () => {
      const def = badgeDef('CONTRIBUTOR_10')!
      expect(badgeProgress(def, stats({ contributionCount: 4 }))).toEqual({
        current: 4,
        target: 10,
      })
      // 초과해도 current는 target까지만
      expect(badgeProgress(def, stats({ contributionCount: 25 }))).toEqual({
        current: 10,
        target: 10,
      })
    })

    it('isBadgeEarned는 metric>=target', () => {
      const def = badgeDef('POINT_500')!
      expect(isBadgeEarned(def, stats({ totalPoints: 500 }))).toBe(true)
      expect(isBadgeEarned(def, stats({ totalPoints: 499 }))).toBe(false)
    })
  })
})
